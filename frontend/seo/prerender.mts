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
 * HTML file per route next to index.html, in Hebrew at the root and in English
 * under /en, each naming the other as its hreflang twin:
 *
 *   about.html, projects.html, blog.html
 *   projects/<slug>.html, blog/<slug>.html
 *   en.html, en/about.html, en/projects.html, en/blog.html, en/...
 *
 * A project or the about page reads its Hebrew twin from backend/docs/he when
 * there is one. A post is written in one language and shows as written at
 * both addresses; its structured data names that language.
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
import { HOME_SHARE, PERSON, PERSONAKIT, TRINITY, siteGraph } from './facts.mjs';
import { pageTitle, SECTION_TITLE, SITE_NAME } from '../src/copy/routes';
import { ERRORS } from '../src/copy/errors';

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

export type Lang = 'he' | 'en';
const LANGS: readonly Lang[] = ['he', 'en'];

export type Page = {
    path: string; // route, e.g. /en/blog/agent-advisor
    file: string; // output file, e.g. en/blog/agent-advisor.html
    title: string; // og:title, and the <title> before the site name
    docTitle?: string; // a whole <title>, for the home page
    description: string;
    lang: Lang; // the page's language: its address, its chrome and its locale
    alternates: Record<Lang, string>; // the same page in each language
    // The address search engines should index for this content, when it is not
    // this page's own: a post shows as written at both addresses, so the one in
    // its own language is canonical, and a short post folded into its article
    // points at the article. Such a page is left out of the sitemap and has no
    // hreflang, since its twin is not a translation.
    canonical?: string;
    single?: boolean; // the content exists in one language only; see isSingleLanguage
    image?: string; // absolute or site-relative
    card?: boolean; // the image is a 1200x630 share card
    ogType: 'website' | 'article' | 'profile';
    published?: string; // ISO date
    jsonLd: object;
    body: string; // HTML for inside #root
    llms?: string; // one line for llms.txt
    section?: 'writing' | 'projects';
};

type Doc = { slug: string; title: string; sections: Record<string, string>; body: string };

/** Hebrew lives at the root, English under /en; see src/i18n/lang.ts. */
const localPath = (lang: Lang, route: string) =>
    lang === 'he' ? route : route === '/' ? '/en' : `/en${route}`;

/** Cloudflare Pages serves /x from x.html, so /en is en.html beside the en/ folder. */
const fileOf = (route: string) => `${route.slice(1)}.html`;

/** Both twins of one language-neutral route. */
const twins = (route: string): Record<Lang, string> => ({
    he: localPath('he', route),
    en: localPath('en', route),
});

const DIR: Record<Lang, 'rtl' | 'ltr'> = { he: 'rtl', en: 'ltr' };

const SHARE_CARD: Record<Lang, string> = { he: '/og-image.png', en: '/og-image-en.png' };

// Copy the prerendered pages need beyond the documents themselves.
const COPY = {
    he: {
        home: 'בית',
        blogDescription:
            `פוסטים ומאמרים של ${PERSON.nameHe} על בניית סוכני AI, זיכרון לסוכנים, סקירת קוד ` +
            'עם AI, עלות טוקנים ואמינות, כולל הסדרה על בניית PersonaKit.',
        projectsDescription:
            `מה ${PERSON.nameHe} בנה: סוכני AI שרצים כל יום, PersonaKit, זיכרון AI בקוד פתוח, ` +
            'מנוע לסקירת קוד עם AI, CRM בהתאמה אישית ומערכות למשרדים קטנים.',
        about: `אודות ${PERSON.nameHe}`,
        docs: 'התיעוד',
        publishedOn: (source: string) => `פורסם במקור ב-${source}:`,
        writtenFor: (source: string) => `נכתב במקור עבור ${source}.`,
    },
    en: {
        home: 'Home',
        blogDescription:
            `Posts and articles by ${PERSON.name} on building AI agents, agent memory, ` +
            'code review with AI, token cost and reliability, including the Building ' +
            'PersonaKit series.',
        projectsDescription:
            `What ${PERSON.name} has built: AI agents running every day, PersonaKit open-source ` +
            'AI memory, an AI code review engine, custom CRM and systems for small offices.',
        about: `About ${PERSON.name}`,
        docs: 'Documentation',
        publishedOn: (source: string) => `Originally published on ${source}:`,
        writtenFor: (source: string) => `Originally written for the ${source.toLowerCase()}.`,
    },
} as const;

const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// JSON inside <script> must not be able to close the element.
const jsonScript = (o: object) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

const languageOf = (text: string): Lang =>
    (text.match(HEBREW) || []).length > (text.match(LATIN) || []).length ? 'he' : 'en';

/** Strip markdown to one plain line, cut at a word near `max` characters. */
const plain = (md: string, max = 160) => {
    const text = md
        .replace(/^#{1,6} .*$/gm, '')
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

/** A document's Hebrew twin under docs/he when it has one, else the document itself. */
const inLanguage = <T,>(lang: Lang, english: T, hebrew: T | undefined): T =>
    lang === 'he' && hebrew ? hebrew : english;

const firstImage = (media?: string) =>
    (media || '')
        .split('\n')
        .map((l) => l.trim())
        .find((l) => IMAGE.test(l));

const absolute = (siteUrl: string, src?: string) =>
    !src ? undefined : /^https?:\/\//.test(src) ? src : `${siteUrl}${src}`;

/** The links every prerendered page carries, so a crawler can walk the site. */
const nav = (lang: Lang) => {
    const t = SECTION_TITLE[lang];
    const a = (route: string, label: string) => `<a href="${localPath(lang, route)}">${label}</a>`;
    return (
        `<nav>${a('/', SITE_NAME[lang])} · ${a('/about', t.about)} · ` +
        `${a('/projects', t.projects)} · ${a('/blog', t.blog)}</nav>`
    );
};

/** The page in its own language, with the document inside in the document's. */
const shell = (lang: Lang, inner: string, contentLang: Lang = lang) =>
    `<div lang="${lang}" dir="${DIR[lang]}" ` +
    `style="max-width:46rem;margin:0 auto;padding:2rem 1rem;line-height:1.6">` +
    `${nav(lang)}<main lang="${contentLang}" dir="${DIR[contentLang]}">${inner}</main></div>`;

const breadcrumbs = (siteUrl: string, lang: Lang, trail: [string, string][]) => ({
    '@type': 'BreadcrumbList',
    itemListElement: [[COPY[lang].home, '/'] as [string, string], ...trail].map(([name, p], i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name,
        item: `${siteUrl}${localPath(lang, p)}`,
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

    const allWriting = readDir(path.join(docsRoot, 'writing'), WRITING_META).sort((a, b) =>
        (b.sections.date || '').localeCompare(a.sections.date || '')
    );
    const bySlug = Object.fromEntries(allWriting.map((w) => [w.slug, w]));
    // A post that is the short version of an article is read from the article
    // and not listed beside it (src/services/writingService.ts, same rule). It
    // keeps its page, which names the article as canonical.
    const foldedInto = (w: Doc) =>
        (w.sections.kind || '').toLowerCase() === 'post'
            ? (w.sections.related || '')
                  .split('\n')
                  .map((l) => l.replace(/^[-*]\s*/, '').trim())
                  .find((slug) => (bySlug[slug]?.sections.kind || '').toLowerCase() === 'article')
            : undefined;
    const writing = allWriting.filter((w) => !foldedInto(w));
    const projects = readDir(path.join(docsRoot, 'projects'), PROJECT_META);
    const projectsHe = Object.fromEntries(
        readDir(path.join(docsRoot, 'he', 'projects'), PROJECT_META).map((d) => [d.slug, d])
    );

    const pages: Page[] = [];

    for (const lang of LANGS) {
        const copy = COPY[lang];
        const sections = SECTION_TITLE[lang];
        const url = (route: string) => `${siteUrl}${localPath(lang, route)}`;
        const page = (
            route: string,
            fields: Omit<Page, 'path' | 'file' | 'lang' | 'alternates'>
        ): Page => ({
            path: localPath(lang, route),
            file: fileOf(localPath(lang, route)),
            lang,
            alternates: twins(route),
            ...fields,
        });

        // ---- home (English; the Hebrew home is index.html itself) ----------
        if (lang === 'en') {
            pages.push(
                page('/', {
                    title: HOME_SHARE.titleEn,
                    docTitle: HOME_SHARE.titleEn,
                    description: HOME_SHARE.descriptionEn,
                    image: SHARE_CARD.en,
                    card: true,
                    ogType: 'website',
                    jsonLd: siteGraph(siteUrl),
                    body: '', // filled in once the project pages exist; see homeBody
                })
            );
        }

        // ---- writing -----------------------------------------------------
        // A piece is written in one language; both addresses show it as is.
        for (const w of allWriting) {
            const contentLang = languageOf(w.body);
            const description = plain(w.sections.summary || w.body);
            const image = firstImage(w.sections.media);
            const source = w.sections.source || '';
            const original = w.sections.url;
            const isArticle = (w.sections.kind || '').toLowerCase() === 'article';
            const route = `/blog/${w.slug}`;
            const article = foldedInto(w);
            const canonical = article
                ? localPath(languageOf(bySlug[article].body), `/blog/${article}`)
                : localPath(contentLang, route);
            const ownUrl = `${siteUrl}${localPath(contentLang, route)}`;
            const footer = original
                ? `<p>${escapeHtml(copy.publishedOn(source))} <a href="${escapeHtml(original)}">${escapeHtml(original)}</a></p>`
                : source
                  ? `<p>${escapeHtml(copy.writtenFor(source))}</p>`
                  : '';
            pages.push(
                page(route, {
                    title: w.title,
                    description,
                    image,
                    ogType: 'article',
                    published: w.sections.date,
                    section: 'writing',
                    canonical,
                    single: true,
                    llms: article
                        ? undefined
                        : `- [${w.title}](${ownUrl}) (${w.sections.date || 'undated'}): ${description}`,
                    jsonLd: {
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': isArticle ? 'Article' : 'BlogPosting',
                                '@id': `${ownUrl}#post`,
                                headline: w.title.slice(0, 110),
                                description,
                                url: ownUrl,
                                mainEntityOfPage: `${siteUrl}${canonical}`,
                                inLanguage: contentLang,
                                ...(w.sections.date ? { datePublished: w.sections.date } : {}),
                                ...(image ? { image: absolute(siteUrl, image) } : {}),
                                author: person,
                                publisher: person,
                                isPartOf: { '@id': `${url('/blog')}#blog` },
                                // The original post, so the copy here and the one on
                                // LinkedIn or Medium read as the same work.
                                ...(original ? { sameAs: original } : {}),
                            },
                            breadcrumbs(siteUrl, lang, [
                                [sections.blog, '/blog'],
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
                            `</article>`,
                        contentLang
                    ),
                })
            );
        }

        pages.push(
            page('/blog', {
                title: sections.blog,
                description: plain(copy.blogDescription),
                ogType: 'website',
                jsonLd: {
                    '@context': 'https://schema.org',
                    '@graph': [
                        {
                            '@type': 'Blog',
                            '@id': `${url('/blog')}#blog`,
                            url: url('/blog'),
                            name: `${SITE_NAME[lang]} - ${sections.blog}`,
                            inLanguage: lang,
                            author: person,
                            isPartOf: website,
                            blogPost: writing.map((w) => ({
                                '@id': `${siteUrl}${localPath(languageOf(w.body), `/blog/${w.slug}`)}#post`,
                            })),
                        },
                        breadcrumbs(siteUrl, lang, [[sections.blog, '/blog']]),
                    ],
                },
                body: shell(
                    lang,
                    `<h1>${sections.blog}</h1><ul>` +
                        writing
                            .map(
                                (w) =>
                                    `<li><a href="${localPath(lang, `/blog/${w.slug}`)}">${escapeHtml(w.title)}</a>` +
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
            })
        );

        // ---- projects ----------------------------------------------------
        const projectPages: Page[] = [];
        for (const english of projects) {
            const p = inLanguage(lang, english, projectsHe[english.slug]);
            const contentLang = languageOf(p.body);
            const overview =
                (p.body.match(/## Overview\s*\n([\s\S]*?)(?=\n## |$)/) || [])[1] || p.body;
            const description = plain(overview);
            // Facts come from the English document; a twin translates prose only.
            const image = firstImage(english.sections.media);
            const repo = english.sections.repository;
            const route = `/projects/${p.slug}`;
            // A project with no Hebrew twin shows its English text at the Hebrew
            // address too; the English address is the one to index.
            const canonical = localPath(contentLang, route);
            const ownUrl = `${siteUrl}${canonical}`;
            const isPersonaKit = p.slug === 'personakit';
            const isTrinity = p.slug === 'trinity-agent';
            const extraLinks = isPersonaKit
                ? `<p><a href="${PERSONAKIT.url}">personakit.me</a> · <a href="${PERSONAKIT.docs}">${copy.docs}</a></p>`
                : isTrinity
                  ? `<p><a href="${TRINITY.url}">${TRINITY.url.replace('https://', '')}</a></p>`
                  : '';
            projectPages.push(
                page(route, {
                    title: p.title,
                    description,
                    image,
                    ogType: 'article',
                    section: 'projects',
                    canonical,
                    single: !projectsHe[english.slug],
                    llms: `- [${p.title}](${ownUrl}): ${description}`,
                    jsonLd: {
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': 'CreativeWork',
                                '@id': `${ownUrl}#project`,
                                name: p.title,
                                description,
                                url: ownUrl,
                                inLanguage: contentLang,
                                ...(image ? { image: absolute(siteUrl, image) } : {}),
                                creator: person,
                                isPartOf: website,
                                ...(english.sections.category
                                    ? { genre: english.sections.category }
                                    : {}),
                                // Only public repositories. review-engine says
                                // "Private Repository" here and is never linked.
                                ...(repo &&
                                /^https:\/\/github\.com\//.test(repo) &&
                                !/review-engine/i.test(repo)
                                    ? { codeRepository: repo }
                                    : {}),
                                ...(isPersonaKit
                                    ? { sameAs: [PERSONAKIT.url, PERSONAKIT.docs] }
                                    : isTrinity
                                      ? { sameAs: TRINITY.url }
                                      : {}),
                            },
                            breadcrumbs(siteUrl, lang, [
                                [sections.projects, '/projects'],
                                [p.title, route],
                            ]),
                        ],
                    },
                    body: shell(
                        lang,
                        `<article><h1>${escapeHtml(p.title)}</h1>${renderMarkdown(p.body)}${extraLinks}</article>`,
                        contentLang
                    ),
                })
            );
        }
        pages.push(...projectPages);

        pages.push(
            page('/projects', {
                title: sections.projects,
                description: plain(copy.projectsDescription),
                ogType: 'website',
                jsonLd: {
                    '@context': 'https://schema.org',
                    '@graph': [
                        {
                            '@type': 'CollectionPage',
                            '@id': `${url('/projects')}#page`,
                            url: url('/projects'),
                            name: `${sections.projects} - ${SITE_NAME[lang]}`,
                            inLanguage: lang,
                            isPartOf: website,
                            about: person,
                            mainEntity: {
                                '@type': 'ItemList',
                                itemListElement: projectPages.map((pg, i) => ({
                                    '@type': 'ListItem',
                                    position: i + 1,
                                    url: `${siteUrl}${pg.canonical ?? pg.path}`,
                                    name: pg.title,
                                })),
                            },
                        },
                        breadcrumbs(siteUrl, lang, [[sections.projects, '/projects']]),
                    ],
                },
                body: shell(
                    lang,
                    `<h1>${sections.projects}</h1><ul>` +
                        projectPages
                            .map(
                                (pg) =>
                                    `<li><a href="${pg.path}">${escapeHtml(pg.title)}</a><p>${escapeHtml(pg.description)}</p></li>`
                            )
                            .join('') +
                        `</ul>`
                ),
            })
        );

        // ---- about -------------------------------------------------------
        const aboutFile = inLanguage(
            lang,
            path.join(docsRoot, 'profile', 'about-me.md'),
            [path.join(docsRoot, 'he', 'profile', 'about-me.md')].find((f) => existsSync(f))
        );
        if (existsSync(aboutFile)) {
            const about = readFileSync(aboutFile, 'utf8').trim();
            const contentLang = languageOf(about);
            pages.push(
                page('/about', {
                    title: sections.about,
                    description: plain(about),
                    ogType: 'profile',
                    jsonLd: {
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': 'AboutPage',
                                '@id': `${url('/about')}#page`,
                                url: url('/about'),
                                name: copy.about,
                                inLanguage: contentLang,
                                isPartOf: website,
                                about: person,
                                mainEntity: person,
                            },
                            breadcrumbs(siteUrl, lang, [[sections.about, '/about']]),
                        ],
                    },
                    body: shell(
                        lang,
                        `<h1>${escapeHtml(copy.about)}</h1>${renderMarkdown(about)}`,
                        contentLang
                    ),
                })
            );
        }
    }

    const enHome = pages.find((p) => p.path === '/en');
    if (enHome) enHome.body = homeBody('en', pages);
    return pages;
};

/**
 * The home page's text for crawlers: what I do, how to start, and a link to
 * every project, about and the blog. The Hebrew one goes into index.html itself
 * (vite.config.mts), which is the page served at /.
 */
export const homeBody = (lang: Lang, pages: Page[]) => {
    const e = escapeHtml;
    const he = lang === 'he';
    const projects = pages.filter((p) => p.lang === lang && p.section === 'projects');
    const sections = SECTION_TITLE[lang];
    return shell(
        lang,
        `<h1>${e(he ? HOME_SHARE.headline : HOME_SHARE.titleEn)}</h1>` +
            `<p>${e(he ? HOME_SHARE.description : HOME_SHARE.descriptionEn)}</p>` +
            `<p>${e(he ? PERSON.descriptionHe : PERSON.description)}</p>` +
            `<p><a href="${PERSON.bookingUrl}">${he ? 'קביעת שיחת היכרות' : 'Book a call'}</a></p>` +
            `<h2>${e(sections.projects)}</h2><ul>` +
            projects
                .map(
                    (p) =>
                        `<li><a href="${p.canonical ?? p.path}">${e(p.title)}</a> - ${e(p.description)}</li>`
                )
                .join('') +
            `</ul>`
    );
};

/** hreflang for both twins, with Hebrew, the site's default, as x-default. */
const hreflang = (siteUrl: string, alternates: Record<Lang, string>) => [
    ...LANGS.map(
        (l) => `<link rel="alternate" hreflang="${l}" href="${siteUrl}${alternates[l]}" />`
    ),
    `<link rel="alternate" hreflang="x-default" href="${siteUrl}${alternates.he}" />`,
];

const LOCALE: Record<Lang, string> = { he: 'he_IL', en: 'en_US' };

/** The <head> block that replaces the one between the seo:head markers. */
export const headFor = (page: Page, siteUrl: string) => {
    const url = `${siteUrl}${page.path}`;
    const canonical = `${siteUrl}${page.canonical ?? page.path}`;
    // hreflang only between real translations, and only on the indexed address.
    const translated = !page.canonical || page.canonical === page.path;
    // The site name follows the page's language, so the title reads in one script.
    const title = page.docTitle ?? pageTitle(page.title, page.lang);
    const image = absolute(siteUrl, page.image) || `${siteUrl}${SHARE_CARD[page.lang]}`;
    const isCard = page.card || !page.image;
    const other = LANGS.find((l) => l !== page.lang)!;
    const e = escapeHtml;
    return [
        `<title>${e(title)}</title>`,
        `<meta name="title" content="${e(title)}" />`,
        `<meta name="description" content="${e(page.description)}" />`,
        `<meta name="author" content="${PERSON.name}" />`,
        `<link rel="canonical" href="${canonical}" />`,
        ...(translated && !isSingleLanguage(page) ? hreflang(siteUrl, page.alternates) : []),
        `<meta property="og:type" content="${page.ogType}" />`,
        `<meta property="og:site_name" content="${SITE_NAME[page.lang]}" />`,
        `<meta property="og:locale" content="${LOCALE[page.lang]}" />`,
        `<meta property="og:locale:alternate" content="${LOCALE[other]}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${e(page.title)}" />`,
        `<meta property="og:description" content="${e(page.description)}" />`,
        `<meta property="og:image" content="${e(image)}" />`,
        ...(isCard
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
const HTML_TAG = /<html lang="[^"]*"(?: dir="[^"]*")?(?: translate="[^"]*")?>/;

/*
 * Hebrew pages ask the browser not to offer translation. Chrome on a phone
 * set to English offered "Translate Hebrew to Hebrew" on them; the site has
 * its own English version, linked from every page, for whoever needs it.
 */
export const htmlTag = (lang: Lang) =>
    `<html lang="${lang}" dir="${DIR[lang]}"${lang === 'he' ? ' translate="no"' : ''}>`;
const ROOT = '<div id="root"></div>';

/** The built index.html, rewritten for one route. */
export const renderPage = (indexHtml: string, page: Page, siteUrl: string) => {
    if (!HEAD_BLOCK.test(indexHtml) || !HTML_TAG.test(indexHtml) || !indexHtml.includes(ROOT)) {
        throw new Error(
            'index.html is missing the seo:head markers, the <html lang> tag or the empty #root'
        );
    }
    return indexHtml
        .replace(HTML_TAG, htmlTag(page.lang))
        .replace(
            HEAD_BLOCK,
            () =>
                `<!-- seo:head:start -->\n        ${headFor(page, siteUrl)}\n        <!-- seo:head:end -->`
        )
        .replace(ROOT, () => `<div id="root">${page.body}</div>`);
};

/**
 * The 404 page of one language, written to 404.html (Hebrew) and en/404.html.
 *
 * Its existence is what turns Cloudflare Pages from single-page-app mode,
 * where every unknown address is answered 200 with the home page, to answering
 * an unknown address with the nearest 404.html and a real 404 status. Every
 * real route already has its own prerendered file (buildPages), so nothing
 * needs the old catch-all; a missing /assets/ file now gets a 404 that cannot
 * be cached as a script, and a crawler is told the truth.
 *
 * No canonical and no hreflang: it is not a page, and it is never in the
 * sitemap. The app boots on it as on any page and draws the same 404 inside
 * the site's frame.
 */
export const renderNotFound = (indexHtml: string, lang: Lang) => {
    if (!HEAD_BLOCK.test(indexHtml) || !HTML_TAG.test(indexHtml) || !indexHtml.includes(ROOT)) {
        throw new Error(
            'index.html is missing the seo:head markers, the <html lang> tag or the empty #root'
        );
    }
    const copy = ERRORS[lang].notFound;
    const e = escapeHtml;
    const head = [
        `<title>${e(copy.docTitle)}</title>`,
        '<meta name="robots" content="noindex" />',
    ].join('\n        ');
    const home = localPath(lang, '/');
    const body = shell(
        lang,
        `<h1>${e(copy.title)}</h1><p>${e(copy.text)} <a href="${home}">${e(copy.home)}</a></p>`
    );
    return indexHtml
        .replace(HTML_TAG, `<html lang="${lang}" dir="${DIR[lang]}">`)
        .replace(
            HEAD_BLOCK,
            () => `<!-- seo:head:start -->\n        ${head}\n        <!-- seo:head:end -->`
        )
        .replace(ROOT, () => `<div id="root">${body}</div>`);
};

/**
 * A page whose content exists in one language only: a post, or a project with
 * no Hebrew twin. Its other address shows the same text in the other chrome,
 * which is not a translation, so it carries no hreflang.
 */
const isSingleLanguage = (page: Pick<Page, 'single'>) => Boolean(page.single);

/**
 * Every indexed address (Google's sitemap hreflang form). Translated pages list
 * their twin; a single-language page is listed once, at its canonical address.
 */
export const sitemap = (siteUrl: string, pages: Page[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const home: Pick<
        Page,
        'path' | 'alternates' | 'published' | 'section' | 'canonical' | 'single'
    > = {
        path: '/',
        alternates: twins('/'),
    };
    const entries = [home, ...pages]
        .filter((p) => !p.canonical || p.canonical === p.path)
        .map((p) => ({
            loc: `${siteUrl}${p.path}`,
            priority: p.path === '/' || p.path === '/en' ? '1.0' : p.section ? '0.6' : '0.8',
            lastmod: p.published || today,
            links: isSingleLanguage(p)
                ? []
                : [
                      ...LANGS.map((l) => [l, p.alternates[l]] as const),
                      ['x-default', p.alternates.he] as const,
                  ],
        }));
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...entries.map(
            (e) =>
                `    <url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod>` +
                `<priority>${e.priority}</priority>` +
                e.links
                    .map(
                        ([l, href]) =>
                            `<xhtml:link rel="alternate" hreflang="${l}" href="${siteUrl}${href}"/>`
                    )
                    .join('') +
                `</url>`
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
        '## בעברית',
        '',
        `${PERSON.nameHe}, ${PERSON.jobTitleHe}. ${PERSON.descriptionHe}`,
        'עבודה מתחילה בשיחת אבחון קצרה של 20 עד 30 דקות, ואחריה הצעה ומחיר.',
        '',
        '## Background',
        '',
        `- ${TRINITY.name}: his own always-on AI assistant, built on the open-source Hermes Agent with PersonaKit as its memory; a private pilot by invitation: ${TRINITY.url}.`,
        `- Creator and lead developer of PersonaKit, open-source memory for AI assistants: ${PERSONAKIT.url} (docs: ${PERSONAKIT.docs}).`,
        '- Aug 2025 to Sep 2026: Founding Engineer, and first employee, at Stealth: a multi-agent system that investigated production incidents from Kubernetes, AWS and observability telemetry.',
        '- 2018 to 2025: frontend and full-stack work, including a sports betting platform at 500K daily users and finance applications for Israeli enterprises.',
        '',
        '## Pages',
        '',
        'Every page is in Hebrew at its address and in English under /en.',
        '',
        `- [Home](${siteUrl}/en) ([Hebrew](${siteUrl}/))`,
        `- [About](${siteUrl}/en/about)`,
        `- [Projects](${siteUrl}/en/projects)`,
        `- [Blog](${siteUrl}/en/blog)`,
        '',
        '## Projects',
        '',
        ...pages.filter((p) => p.lang === 'en' && p.section === 'projects').map((p) => p.llms!),
        '',
        '## Writing',
        '',
        ...pages
            .filter((p) => p.lang === 'en' && p.section === 'writing' && p.llms)
            .map((p) => p.llms!),
        '',
        '## Elsewhere',
        '',
        ...PERSON.sameAs.map((u) => `- ${u}`),
        '',
        'To make contact, use the assistant or the Email button on the site, or book a call.',
        '',
    ].join('\n');
