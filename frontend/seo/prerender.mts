/**
 * Per-route HTML, sitemap and llms.txt, built from the markdown the backend
 * serves.
 *
 * Why this exists: the site is a client-rendered SPA, so every URL used to ship
 * the same index.html - one title, one description, one preview card, and an
 * empty <div id="root">. A shared blog post previewed on WhatsApp or LinkedIn
 * as the home page, and the assistant crawlers (which mostly do not run
 * JavaScript) saw nothing at all on any page.
 *
 * At build time this reads backend/docs/{writing,projects,profile} straight
 * from the repository - the same files the API serves, so there is no network
 * call and no way for a backend outage to truncate a deploy - and writes one
 * HTML file per route next to index.html:
 *
 *   about.html, projects.html, blog.html
 *   projects/<slug>.html, blog/<slug>.html
 *
 * Cloudflare Pages serves /blog/<slug> from blog/<slug>.html before the SPA
 * fallback in _redirects (real files win, the same reason robots.txt works).
 * Each file is the built index.html with the head block between the
 * `seo:head` markers replaced, and a plain-HTML copy of the page's text put
 * inside #root. React's createRoot replaces that copy on boot, so a visitor
 * sees the app and a crawler that runs no JavaScript sees the same words.
 *
 * Adding a post or a project needs nothing here: a new markdown file becomes a
 * page, a sitemap entry and an llms.txt line on the next frontend build. The
 * deploy workflow watches backend/docs/** for that reason.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import { PERSON, PERSONAKIT } from './facts.mjs';

// Section headings that are metadata rather than prose, per docs_helper.py.
// PROJECT_METADATA_SECTIONS and WRITING_SECTIONS there; keep in step.
const PROJECT_META = new Set([
    'project_type',
    'status',
    'demo_url',
    'repository',
    'media',
    'featured',
    'category',
    'license',
]);
const WRITING_META = new Set(['kind', 'source', 'url', 'date', 'media', 'summary', 'related']);

const IMAGE = /\.(png|jpe?g|gif|webp)$/i;
const HEBREW = /[א-ת]/g;
const LATIN = /[a-z]/gi;

export type Page = {
    path: string; // route, e.g. /blog/agent-advisor
    file: string; // output file, e.g. blog/agent-advisor.html
    title: string;
    description: string;
    lang: 'he' | 'en';
    image?: string; // absolute or site-relative
    ogType: 'website' | 'article' | 'profile';
    published?: string; // ISO date
    jsonLd: object;
    body: string; // HTML for inside #root
    llms?: string; // one line for llms.txt
    section?: 'writing' | 'projects';
};

type Doc = { slug: string; title: string; sections: Record<string, string>; body: string };

const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// JSON inside <script> must not be able to close the element.
const jsonScript = (o: object) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

const languageOf = (text: string): 'he' | 'en' =>
    (text.match(HEBREW) || []).length > (text.match(LATIN) || []).length ? 'he' : 'en';

/** Strip markdown to one plain line, cut at a word near `max` characters. */
const plain = (md: string, max = 160) => {
    const text = md
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`>#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1);
    return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-–]$/, '') + '…';
};

const renderMarkdown = (md: string) => renderToStaticMarkup(createElement(Markdown, null, md));

/** Split a doc into its H1, its metadata sections and the remaining prose. */
const parseDoc = (file: string, meta: Set<string>): Doc => {
    const raw = readFileSync(file, 'utf8');
    const lines = raw.split('\n');
    const sections: Record<string, string[]> = {};
    const body: string[] = [];
    let title = '';
    let current: string | null = null;
    for (const line of lines) {
        if (!title && line.startsWith('# ')) {
            title = line.slice(2).trim();
            continue;
        }
        if (line.startsWith('## ')) {
            const key = line.slice(3).trim().toLowerCase().replace(/ /g, '_');
            current = meta.has(key) ? key : null;
            if (current) {
                sections[current] = [];
                continue;
            }
        }
        if (current) sections[current].push(line);
        else body.push(line);
    }
    const joined = Object.fromEntries(
        Object.entries(sections).map(([k, v]) => [k, v.join('\n').trim()])
    );
    return {
        slug: path.basename(file, '.md'),
        title,
        sections: joined,
        body: body.join('\n').trim(),
    };
};

const readDir = (dir: string, meta: Set<string>) =>
    existsSync(dir)
        ? readdirSync(dir)
              .filter((f) => f.endsWith('.md'))
              .sort()
              .map((f) => parseDoc(path.join(dir, f), meta))
        : [];

const firstImage = (media?: string) =>
    (media || '')
        .split('\n')
        .map((l) => l.trim())
        .find((l) => IMAGE.test(l));

const absolute = (siteUrl: string, src?: string) =>
    !src ? undefined : /^https?:\/\//.test(src) ? src : `${siteUrl}${src}`;

/** The links every prerendered page carries, so a crawler can walk the site. */
const nav = () =>
    `<nav><a href="/">${PERSON.name}</a> · <a href="/about">About</a> · ` +
    `<a href="/projects">Projects</a> · <a href="/blog">Blog</a></nav>`;

const shell = (lang: 'he' | 'en', inner: string) =>
    `<div lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}" ` +
    `style="max-width:46rem;margin:0 auto;padding:2rem 1rem;line-height:1.6">` +
    `${nav()}<main>${inner}</main></div>`;

const breadcrumbs = (siteUrl: string, trail: [string, string][]) => ({
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, p], i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name,
        item: `${siteUrl}${p}`,
    })),
});

export const buildPages = (docsRoot: string, siteUrl: string): Page[] => {
    // Named inline as well as by @id: the full Person node lives on the home
    // page only, and Google reads an article's author from the page itself.
    const person = {
        '@type': 'Person',
        '@id': `${siteUrl}/#person`,
        name: PERSON.name,
        url: `${siteUrl}/`,
    };
    const website = { '@id': `${siteUrl}/#website` };

    const writing = readDir(path.join(docsRoot, 'writing'), WRITING_META).sort((a, b) =>
        (b.sections.date || '').localeCompare(a.sections.date || '')
    );
    const projects = readDir(path.join(docsRoot, 'projects'), PROJECT_META);

    const pages: Page[] = [];

    // ---- writing ---------------------------------------------------------
    for (const w of writing) {
        const lang = languageOf(w.body);
        const description = plain(w.sections.summary || w.body);
        const image = firstImage(w.sections.media);
        const source = w.sections.source || '';
        const original = w.sections.url;
        const isArticle = (w.sections.kind || '').toLowerCase() === 'article';
        const route = `/blog/${w.slug}`;
        const footer = original
            ? `<p>Originally published on ${escapeHtml(source)}: <a href="${escapeHtml(original)}">${escapeHtml(original)}</a></p>`
            : source
              ? `<p>Originally written for the ${escapeHtml(source.toLowerCase())}.</p>`
              : '';
        pages.push({
            path: route,
            file: `blog/${w.slug}.html`,
            title: w.title,
            description,
            lang,
            image,
            ogType: 'article',
            published: w.sections.date,
            section: 'writing',
            llms: `- [${w.title}](${siteUrl}${route}) (${w.sections.date || 'undated'}): ${description}`,
            jsonLd: {
                '@context': 'https://schema.org',
                '@graph': [
                    {
                        '@type': isArticle ? 'Article' : 'BlogPosting',
                        '@id': `${siteUrl}${route}#post`,
                        headline: w.title.slice(0, 110),
                        description,
                        url: `${siteUrl}${route}`,
                        mainEntityOfPage: `${siteUrl}${route}`,
                        inLanguage: lang,
                        ...(w.sections.date ? { datePublished: w.sections.date } : {}),
                        ...(image ? { image: absolute(siteUrl, image) } : {}),
                        author: person,
                        publisher: person,
                        isPartOf: { '@id': `${siteUrl}/blog#blog` },
                        // The original post, so the copy here and the one on
                        // LinkedIn or Medium read as the same work.
                        ...(original ? { sameAs: original } : {}),
                    },
                    breadcrumbs(siteUrl, [
                        ['Home', '/'],
                        ['Blog', '/blog'],
                        [w.title, route],
                    ]),
                ],
            },
            body: shell(
                lang,
                `<article><h1>${escapeHtml(w.title)}</h1>` +
                    (w.sections.date
                        ? `<p><time datetime="${w.sections.date}">${w.sections.date}</time></p>`
                        : '') +
                    renderMarkdown(w.body) +
                    footer +
                    `</article>`
            ),
        });
    }

    pages.push({
        path: '/blog',
        file: 'blog.html',
        title: 'Blog',
        description: plain(
            `Posts and articles by ${PERSON.name} on building AI agents, agent memory, ` +
                'code review with AI, token cost and reliability, including the Building ' +
                'PersonaKit series.'
        ),
        lang: 'en',
        ogType: 'website',
        jsonLd: {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'Blog',
                    '@id': `${siteUrl}/blog#blog`,
                    url: `${siteUrl}/blog`,
                    name: `${PERSON.name} - Blog`,
                    author: person,
                    isPartOf: website,
                    blogPost: writing.map((w) => ({ '@id': `${siteUrl}/blog/${w.slug}#post` })),
                },
                breadcrumbs(siteUrl, [
                    ['Home', '/'],
                    ['Blog', '/blog'],
                ]),
            ],
        },
        body: shell(
            'en',
            `<h1>Blog</h1><ul>` +
                writing
                    .map(
                        (w) =>
                            `<li><a href="/blog/${w.slug}">${escapeHtml(w.title)}</a>` +
                            (w.sections.date
                                ? ` <time datetime="${w.sections.date}">${w.sections.date}</time>`
                                : '') +
                            (w.sections.summary
                                ? `<p>${escapeHtml(plain(w.sections.summary, 300))}</p>`
                                : '') +
                            `</li>`
                    )
                    .join('') +
                `</ul>`
        ),
    });

    // ---- projects --------------------------------------------------------
    for (const p of projects) {
        const overview = (p.body.match(/## Overview\s*\n([\s\S]*?)(?=\n## |$)/) || [])[1] || p.body;
        const description = plain(overview);
        const image = firstImage(p.sections.media);
        const repo = p.sections.repository;
        const route = `/projects/${p.slug}`;
        const isPersonaKit = p.slug === 'personakit';
        const extraLinks = isPersonaKit
            ? `<p><a href="${PERSONAKIT.url}">personakit.me</a> · <a href="${PERSONAKIT.docs}">Documentation</a></p>`
            : '';
        pages.push({
            path: route,
            file: `projects/${p.slug}.html`,
            title: p.title,
            description,
            lang: languageOf(p.body),
            image,
            ogType: 'article',
            section: 'projects',
            llms: `- [${p.title}](${siteUrl}${route}): ${description}`,
            jsonLd: {
                '@context': 'https://schema.org',
                '@graph': [
                    {
                        '@type': 'CreativeWork',
                        '@id': `${siteUrl}${route}#project`,
                        name: p.title,
                        description,
                        url: `${siteUrl}${route}`,
                        ...(image ? { image: absolute(siteUrl, image) } : {}),
                        creator: person,
                        isPartOf: website,
                        ...(p.sections.category ? { genre: p.sections.category } : {}),
                        // Only public repositories. review-engine says
                        // "Private Repository" here and is never linked.
                        ...(repo && /^https:\/\/github\.com\//.test(repo)
                            ? { codeRepository: repo }
                            : {}),
                        ...(isPersonaKit ? { sameAs: [PERSONAKIT.url, PERSONAKIT.docs] } : {}),
                    },
                    breadcrumbs(siteUrl, [
                        ['Home', '/'],
                        ['Projects', '/projects'],
                        [p.title, route],
                    ]),
                ],
            },
            body: shell(
                languageOf(p.body),
                `<article><h1>${escapeHtml(p.title)}</h1>${renderMarkdown(p.body)}${extraLinks}</article>`
            ),
        });
    }

    pages.push({
        path: '/projects',
        file: 'projects.html',
        title: 'Projects',
        description: plain(
            `What ${PERSON.name} has built: AI agents running every day, PersonaKit open-source ` +
                'AI memory, an AI code review engine, custom CRM and systems for small offices.'
        ),
        lang: 'en',
        ogType: 'website',
        jsonLd: {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'CollectionPage',
                    '@id': `${siteUrl}/projects#page`,
                    url: `${siteUrl}/projects`,
                    name: `Projects - ${PERSON.name}`,
                    isPartOf: website,
                    about: person,
                    mainEntity: {
                        '@type': 'ItemList',
                        itemListElement: projects.map((p, i) => ({
                            '@type': 'ListItem',
                            position: i + 1,
                            url: `${siteUrl}/projects/${p.slug}`,
                            name: p.title,
                        })),
                    },
                },
                breadcrumbs(siteUrl, [
                    ['Home', '/'],
                    ['Projects', '/projects'],
                ]),
            ],
        },
        body: shell(
            'en',
            `<h1>Projects</h1><ul>` +
                pages
                    .filter((pg) => pg.section === 'projects')
                    .map(
                        (pg) =>
                            `<li><a href="${pg.path}">${escapeHtml(pg.title)}</a><p>${escapeHtml(pg.description)}</p></li>`
                    )
                    .join('') +
                `</ul>`
        ),
    });

    // ---- about -----------------------------------------------------------
    const aboutFile = path.join(docsRoot, 'profile', 'about-me.md');
    if (existsSync(aboutFile)) {
        const about = readFileSync(aboutFile, 'utf8').trim();
        pages.push({
            path: '/about',
            file: 'about.html',
            title: 'About',
            description: plain(about),
            lang: 'en',
            ogType: 'profile',
            jsonLd: {
                '@context': 'https://schema.org',
                '@graph': [
                    {
                        '@type': 'AboutPage',
                        '@id': `${siteUrl}/about#page`,
                        url: `${siteUrl}/about`,
                        name: `About ${PERSON.name}`,
                        isPartOf: website,
                        about: person,
                        mainEntity: person,
                    },
                    breadcrumbs(siteUrl, [
                        ['Home', '/'],
                        ['About', '/about'],
                    ]),
                ],
            },
            body: shell('en', `<h1>About ${PERSON.name}</h1>${renderMarkdown(about)}`),
        });
    }

    return pages;
};

/** The <head> block that replaces the one between the seo:head markers. */
export const headFor = (page: Page, siteUrl: string, defaultImage: string) => {
    const url = `${siteUrl}${page.path}`;
    // A Hebrew page carries the Hebrew name, so the title reads in one script.
    const title = `${page.title} | ${page.lang === 'he' ? PERSON.nameHe : PERSON.siteName}`;
    const image = absolute(siteUrl, page.image) || defaultImage;
    const isDefault = image === defaultImage;
    const e = escapeHtml;
    return [
        `<title>${e(title)}</title>`,
        `<meta name="title" content="${e(title)}" />`,
        `<meta name="description" content="${e(page.description)}" />`,
        `<meta name="author" content="${PERSON.name}" />`,
        `<link rel="canonical" href="${url}" />`,
        `<meta property="og:type" content="${page.ogType}" />`,
        `<meta property="og:site_name" content="${PERSON.siteName}" />`,
        `<meta property="og:locale" content="${page.lang === 'he' ? 'he_IL' : 'en_US'}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${e(page.title)}" />`,
        `<meta property="og:description" content="${e(page.description)}" />`,
        `<meta property="og:image" content="${e(image)}" />`,
        ...(isDefault
            ? [
                  '<meta property="og:image:type" content="image/png" />',
                  '<meta property="og:image:width" content="1200" />',
                  '<meta property="og:image:height" content="630" />',
              ]
            : []),
        `<meta property="og:image:alt" content="${e(page.title)}" />`,
        ...(page.published
            ? [
                  `<meta property="article:published_time" content="${page.published}" />`,
                  `<meta property="article:author" content="${PERSON.name}" />`,
              ]
            : []),
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta name="twitter:url" content="${url}" />`,
        `<meta name="twitter:title" content="${e(page.title)}" />`,
        `<meta name="twitter:description" content="${e(page.description)}" />`,
        `<meta name="twitter:image" content="${e(image)}" />`,
        `<script type="application/ld+json">\n${jsonScript(page.jsonLd)}\n</script>`,
    ].join('\n        ');
};

const HEAD_BLOCK = /<!-- seo:head:start -->[\s\S]*?<!-- seo:head:end -->/;
const ROOT = '<div id="root"></div>';

/** The built index.html, rewritten for one route. */
export const renderPage = (indexHtml: string, page: Page, siteUrl: string) => {
    if (!HEAD_BLOCK.test(indexHtml) || !indexHtml.includes(ROOT)) {
        throw new Error('index.html is missing the seo:head markers or the empty #root');
    }
    return indexHtml
        .replace(/<html lang="[^"]*">/, `<html lang="${page.lang}">`)
        .replace(
            HEAD_BLOCK,
            () =>
                `<!-- seo:head:start -->\n        ${headFor(page, siteUrl, `${siteUrl}/og-image.png`)}\n        <!-- seo:head:end -->`
        )
        .replace(ROOT, () => `<div id="root">${page.body}</div>`);
};

export const sitemap = (siteUrl: string, pages: Page[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const entries = [
        { loc: `${siteUrl}/`, priority: '1.0', lastmod: today },
        ...pages.map((p) => ({
            loc: `${siteUrl}${p.path}`,
            priority: p.section ? '0.6' : '0.8',
            lastmod: p.published || today,
        })),
    ];
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries.map(
            (e) =>
                `    <url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod>` +
                `<priority>${e.priority}</priority></url>`
        ),
        '</urlset>',
        '',
    ].join('\n');
};

/**
 * llms.txt: plain prose at a predictable path for an assistant that fetched
 * the site and found an empty <div id="root">. It says what the pages say and
 * links every page, so an assistant can cite the right one.
 */
export const llmsTxt = (siteUrl: string, pages: Page[]) =>
    [
        `# ${PERSON.name} - ${PERSON.tagline}`,
        '',
        `> ${PERSON.name} (${PERSON.nameHe}) is an AI agent developer in Israel. He builds AI`,
        '> agents and systems for organizations, small businesses and public authorities,',
        '> starting by understanding the problem. The site has his projects, his writing,',
        '> and an assistant that answers from his own notes and declines when they do not',
        '> cover the question.',
        '',
        '## What he offers',
        '',
        '- AI agents that do real work inside your processes, with evidence for what they did and a person in control. He runs more than 40 agents of his own every day.',
        '- Custom CRM systems, built around the client and ready for AI. AI goes in only after the system is stable.',
        '- Tailored systems for small professional offices: law offices, accountants and similar practices.',
        '- Making an existing LLM system reliable: grounding, hallucination prevention, token cost, AI code review.',
        '- Full-stack product development, from React to cloud operations.',
        '',
        'An engagement starts with a 20 to 30 minute call, then a proposal and a price (fixed or hourly). No published rate.',
        `Book a call: ${PERSON.bookingUrl}. Also open to a full-time role or a contract. Works in Hebrew and English.`,
        '',
        '## Background',
        '',
        `- Creator and lead developer of PersonaKit, open-source memory for AI assistants: ${PERSONAKIT.url} (docs: ${PERSONAKIT.docs}).`,
        '- Aug 2025 to Sep 2026: Founding Engineer, and first employee, at Stealth: a multi-agent system that investigated production incidents from Kubernetes, AWS and observability telemetry.',
        '- 2018 to 2025: frontend and full-stack work, including a sports betting platform at 500K daily users and finance applications for Israeli enterprises.',
        '',
        '## Pages',
        '',
        `- [Home](${siteUrl}/)`,
        `- [About](${siteUrl}/about)`,
        `- [Projects](${siteUrl}/projects)`,
        `- [Blog](${siteUrl}/blog)`,
        '',
        '## Projects',
        '',
        ...pages.filter((p) => p.section === 'projects').map((p) => p.llms!),
        '',
        '## Writing',
        '',
        ...pages.filter((p) => p.section === 'writing').map((p) => p.llms!),
        '',
        '## Elsewhere',
        '',
        ...PERSON.sameAs.map((u) => `- ${u}`),
        '',
        'To make contact, use the assistant or the Email button on the site, or book a call.',
        '',
    ].join('\n');
