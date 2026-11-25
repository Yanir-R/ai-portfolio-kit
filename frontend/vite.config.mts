import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import { siteConfig } from './site.config';
import {
    buildPages,
    homeBody,
    renderNotFound,
    renderPage,
    sitemap,
    llmsTxt,
} from './seo/prerender.mjs';
import { siteGraph } from './seo/facts.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where the public build values come from, in order: an environment variable,
// then site.config.ts, then a development-only fallback.
//
// site.config.ts is the source of truth for production and CI passes nothing,
// so what is committed is what ships. The environment override is for local
// work and preview builds, where pointing at a different backend for an
// afternoon should not be a commit.
//
// The production fallbacks are empty so that a missing value fails the guard
// below rather than silently shipping whichever host was hardcoded here.
// site.config.ts satisfies the guard by stating a value, which is a different
// thing from a default quietly standing in for one.
const DEFAULT_BACKEND_URL = {
    production: '',
    development: 'http://localhost:8000',
} as const;

const DEFAULT_SITE_URL = {
    production: '',
    development: 'http://localhost:3000',
} as const;

// The markdown the backend serves. Read at build time to emit one HTML file
// per route, the sitemap and llms.txt - see seo/prerender.mts.
const DOCS_ROOT = path.resolve(__dirname, '../backend/docs');

// The AI crawlers split in two, because being read and being trained on are
// different things and this site wants one without the other.
//
// ANSWER_TIME_CRAWLERS fetch a page in order to answer a question somebody is
// asking right now, and cite it back. They are the entire reason the JSON-LD
// and llms.txt exist: when a person asks an assistant who Yanir is, these are
// what go and look.
//
// TRAINING_CRAWLERS collect pages into corpora that models are trained on.
// Nothing about that helps a reader find him, and ingestion is irreversible.
//
// These lists are not a preference stated in a vacuum - they mirror what
// Cloudflare actually enforces on the zone, where the AI Crawler category is
// blocked at the network layer and the AI Search and AI Assistant categories
// are not. A robots.txt that disagreed with that enforcement would be
// published policy the site does not honour, which is worse than either
// choice made honestly.
//
// Two entries are directives rather than fetchers: Google-Extended and
// Applebot-Extended have no crawler of their own, they only govern whether
// Gemini and Apple Intelligence may use the content. Google-Extended is
// allowed: it also gates Gemini's grounding, so declining it made Gemini less
// likely to cite the site, and for a site whose job is to be found by people
// asking an assistant about AI agents, being cited by Gemini matters more than
// staying out of its training set. Cloudflare's AI
// Crawler block does not cover it - it is a robots token, not a fetcher - so
// robots.txt is where this decision lives. Applebot-Extended stays declined.
const ANSWER_TIME_CRAWLERS = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Perplexity-User',
    'DuckAssistBot',
    'MistralAI-User',
    'Applebot',
    'Googlebot',
    'Bingbot',
    'Google-Extended',
] as const;

const TRAINING_CRAWLERS = [
    'GPTBot',
    'ClaudeBot',
    'anthropic-ai',
    'Claude-Web',
    'CCBot',
    'Bytespider',
    'Amazonbot',
    'Meta-ExternalAgent',
    'Google-CloudVertexBot',
    'Applebot-Extended',
] as const;

/**
 * The response headers Cloudflare Pages applies to every route, emitted rather
 * than committed as a static `_headers` file: the Content-Security-Policy has
 * to name the backend's origin in `connect-src`, and that origin is resolved at
 * build time. A CSP that disagrees with the deployed backend URL breaks every
 * request the chat makes, so the two are derived from one value.
 *
 * Notes on the specific choices, since a CSP is easy to copy and hard to read:
 *
 *   script-src          'self' plus static.cloudflareinsights.com, with
 *                       cloudflareinsights.com in connect-src to match.
 *                       Cloudflare injects its Web Analytics beacon into HTML
 *                       responses at the edge, so it is not in the built bundle
 *                       and nothing in this repository references it - analytics
 *                       the platform adds still has to be declared by the policy
 *                       the platform serves, or the browser blocks it.
 *
 *                       No 'unsafe-inline'. The JSON-LD block in index.html is a
 *                       data block rather than executable script - the HTML
 *                       parser never prepares it for execution, so CSP does not
 *                       gate it and the structured data survives this policy.
 *
 *                       challenges.cloudflare.com is Turnstile, the bot check in
 *                       front of the chat. Its api.js is fetched at runtime by
 *                       services/turnstile.ts rather than bundled, so the host
 *                       has to be named here or the check never loads.
 *   frame-src           challenges.cloudflare.com and cal.com. Turnstile renders
 *                       its challenge in an iframe from the same host as its
 *                       script, and the contact window embeds the booking page.
 *                       Without this directive both frames would fall back to
 *                       default-src 'self' and be refused.
 *   style-src           'unsafe-inline' is required because components set a
 *                       `style` attribute (custom properties such as `--w` on
 *                       the blog's topic bars), and a style attribute counts as an inline style as far
 *                       as CSP is concerned.
 *   img-src             'self' data: https:. Broader than the rest of this
 *                       policy, and deliberately. Project and writing images
 *                       live in author-written markdown served from the backend
 *                       at runtime, currently on i.ibb.co. An allowlist of image
 *                       hosts would be tighter and would break silently the next
 *                       time an image is pasted from somewhere new: the page
 *                       renders with a hole in it and the only symptom is a
 *                       console error in a visitor's browser, not the author's.
 *                       An image cannot execute, the site holds no session to
 *                       steal, and upgrade-insecure-requests keeps this to
 *                       https, so the cost of the wider directive is a tracking
 *                       pixel someone would have to add on purpose.
 *   frame-ancestors     'none' stops the site being framed - clickjacking cover
 *                       that X-Frame-Options duplicates for older agents.
 *
 * No Cross-Origin-Resource-Policy: it would restrict who may load og-image.png,
 * and a link-preview card is precisely a cross-origin consumer of that file.
 *
 * HSTS carries includeSubDomains but deliberately not `preload`. Preloading is
 * baked into browser binaries and takes months to reverse, so it belongs to a
 * decision made once the domain's subdomain plans are settled, not to a default
 * inherited from a config file.
 */
// Cloudflare's Web Analytics beacon. The script is injected into HTML at the
// edge rather than bundled, and it reports to a second host, so both have to be
// named or the browser blocks the script and then the request it makes.
const CF_ANALYTICS_SCRIPT = 'https://static.cloudflareinsights.com';
const CF_ANALYTICS_REPORTING = 'https://cloudflareinsights.com';

// Cloudflare Turnstile. One origin serves both halves of the check: api.js is
// loaded from it as a script, and the challenge itself renders in an iframe
// from it, so it is named in script-src and in frame-src.
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

// The booking page, embedded in the contact window.
const BOOKING_ORIGIN = 'https://cal.com';

const CAL_API_ORIGIN = 'https://api.cal.com';

const emitSecurityHeaders = (backendUrl: string, avatarUrl: string) => {
    const originOf = (u: string) => {
        try {
            return new URL(u).origin;
        } catch {
            return '';
        }
    };
    // cal.com's public slots endpoint, read by the booking screens.
    const connectSrc = ["'self'", originOf(backendUrl), CF_ANALYTICS_REPORTING, CAL_API_ORIGIN]
        .filter(Boolean)
        .join(' ');
    // https: covers the author-written image hosts; the configured avatar origin
    // is named too so it survives if that directive is ever tightened.
    const imgSrc = ["'self'", 'data:', 'https:', originOf(avatarUrl)].filter(Boolean).join(' ');

    const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        `script-src 'self' ${CF_ANALYTICS_SCRIPT} ${TURNSTILE_ORIGIN}`,
        `frame-src ${TURNSTILE_ORIGIN} ${BOOKING_ORIGIN}`,
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        `img-src ${imgSrc}`,
        `connect-src ${connectSrc}`,
        'upgrade-insecure-requests',
    ].join('; ');

    return [
        '/*',
        `  Content-Security-Policy: ${csp}`,
        '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
        '  X-Content-Type-Options: nosniff',
        '  X-Frame-Options: DENY',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '  Cross-Origin-Opener-Policy: same-origin',
        '  Permissions-Policy: accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
        '',
        // No year-long `immutable` here, although the names carry a content hash.
        // Pages answers a path it does not have yet with the SPA shell (see
        // _redirects), and during a deploy a browser can ask for the new bundle
        // before every edge has it. With `immutable` that HTML was cached as the
        // script for a year, at the edge and in browsers, and the site stayed
        // blank. Revalidating costs a 304 per file and lets a bad copy heal on
        // the next load.
        '/assets/*',
        '  Cache-Control: public, max-age=0, must-revalidate',
        '',
    ].join('\n');
};

/**
 * What this deployment was built with, published at /build-info.json.
 *
 * Vite inlines these values into the bundle, so the only other way to tell
 * which ones a live deployment is using is to grep minified JavaScript. This
 * answers the question directly, which matters when a config change and a
 * deploy cross over and the site is still talking to the previous backend.
 *
 * Nothing here is a secret. The site URL is in every OpenGraph tag, the backend
 * URL is in the bundle and the CSP, and the commit is public in a public
 * repository - this only collects what is already visible into one place.
 */
const emitBuildInfo = (siteUrl: string, backendUrl: string, avatarUrl: string) =>
    JSON.stringify(
        {
            siteUrl,
            backendUrl,
            // Present in GitHub Actions; empty for a local build, which is
            // itself worth knowing when reading this off a deployment.
            commit: process.env.GITHUB_SHA || '',
            builtAt: new Date().toISOString(),
            avatarConfigured: Boolean(avatarUrl),
        },
        null,
        2
    ) + '\n';

/**
 * robots.txt, sitemap.xml and llms.txt, emitted rather than committed, plus one
 * prerendered HTML file per route (written after the bundle, see writeBundle).
 *
 * All three have to state absolute URLs - the sitemap protocol requires them,
 * and a robots `Sitemap:` line is ignored without one - so none can be a static
 * file in public/ without hardcoding a host, which is the thing this config
 * exists to prevent. They are generated from the same resolved site URL that
 * fills in the canonical and OpenGraph tags, so there is one host to change.
 *
 * robots.txt has to exist as a real file because `_redirects` maps `/*` to
 * index.html: without it, /robots.txt answers with the SPA shell. Most crawlers
 * read an unparseable robots.txt as "allow everything", but LinkedIn and
 * Facebook fetch it before reading the link-preview tags.
 */
const emitDiscoveryFiles = (siteUrl: string, backendUrl: string, avatarUrl: string) => ({
    name: 'emit-discovery-files',
    generateBundle() {
        const robots = [
            '# Every page here is public, and the crawlers that answer questions on a',
            "# reader's behalf are welcome. The ones that collect pages into training",
            '# corpora are not, and Cloudflare enforces that on the zone as well - this',
            '# file states the same policy rather than a more generous one.',
            '',
            'User-agent: *',
            'Allow: /',
            '',
            '# Fetch a page to answer a question someone is asking now.',
            ...ANSWER_TIME_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
            '# Collect pages for model training.',
            ...TRAINING_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, 'Disallow: /', '']),
            `Sitemap: ${siteUrl}/sitemap.xml`,
            '',
        ].join('\n');

        const pages = buildPages(DOCS_ROOT, siteUrl);

        for (const [fileName, source] of [
            ['robots.txt', robots],
            ['sitemap.xml', sitemap(siteUrl, pages)],
            ['llms.txt', llmsTxt(siteUrl, pages)],
            ['_headers', emitSecurityHeaders(backendUrl, avatarUrl)],
            ['build-info.json', emitBuildInfo(siteUrl, backendUrl, avatarUrl)],
        ] as const) {
            this.emitFile({ type: 'asset', fileName, source });
        }
    },
    // After index.html is written with its hashed asset links, copy it once per
    // route with that route's head and text. See seo/prerender.mts.
    writeBundle(options: { dir?: string }) {
        const dir = options.dir || path.resolve(__dirname, 'dist');
        const indexHtml = readFileSync(path.join(dir, 'index.html'), 'utf8');
        const pages = buildPages(DOCS_ROOT, siteUrl);
        for (const page of pages) {
            const out = path.join(dir, page.file);
            mkdirSync(path.dirname(out), { recursive: true });
            writeFileSync(out, renderPage(indexHtml, page, siteUrl));
        }
        // The list of link-preview cards to draw. scripts/share-cards.mjs reads
        // it after this build, draws each card into dist/share and deletes it.
        mkdirSync(path.join(dir, 'share'), { recursive: true });
        writeFileSync(
            path.join(dir, 'share', 'cards.json'),
            JSON.stringify(pages.flatMap((p) => (p.share ? [p.share] : [])))
        );
        // One 404 page per language. Pages serves the nearest 404.html with a
        // 404 status, so /en/anything gets the English one. See renderNotFound.
        writeFileSync(path.join(dir, '404.html'), renderNotFound(indexHtml, 'he'));
        mkdirSync(path.join(dir, 'en'), { recursive: true });
        writeFileSync(path.join(dir, 'en', '404.html'), renderNotFound(indexHtml, 'en'));
        // Last, because every file above starts from the empty #root: the Hebrew
        // home is index.html itself, and a crawler that runs no JavaScript
        // should find the page's text there too.
        writeFileSync(
            path.join(dir, 'index.html'),
            indexHtml.replace(
                '<div id="root"></div>',
                () => `<div id="root">${homeBody('he', pages)}</div>`
            )
        );
    },
});

export default defineConfig(({ mode, command }) => {
    // loadEnv reads .env files and also picks up prefixed process env vars,
    // which is how CI injects these.
    const env = loadEnv(mode, __dirname, 'VITE_');
    const isProd = mode === 'production';
    // Only a production build falls back to the committed API. `npm run dev`
    // talks to the local backend unless VITE_BACKEND_URL says otherwise, so a
    // fork's dev server never spends the owner's chat budget by accident.
    const backendUrl =
        env.VITE_BACKEND_URL ||
        (isProd
            ? siteConfig.backendUrl || DEFAULT_BACKEND_URL.production
            : DEFAULT_BACKEND_URL.development);
    const siteUrl = (
        env.VITE_SITE_URL ||
        siteConfig.url ||
        (isProd ? DEFAULT_SITE_URL.production : DEFAULT_SITE_URL.development)
    ).replace(/\/$/, '');
    const avatarUrl = env.VITE_AVATAR_URL || siteConfig.avatarUrl || '';
    const avatarHiResUrl = env.VITE_AVATAR_HIRES_URL || siteConfig.avatarHiResUrl || '';

    // Fail the build rather than emit a bundle wired to nothing. `command`
    // narrows this to builds, so a dev server still starts on the development
    // fallbacks.
    if (command === 'build' && isProd) {
        const missing = [!backendUrl && 'backendUrl', !siteUrl && 'url'].filter(Boolean);
        if (missing.length && process.env.VITE_ALLOW_UNCONFIGURED_BUILD !== 'true') {
            throw new Error(
                `Production build is missing ${missing.join(' and ')}. ` +
                    'Set them in site.config.ts, or set VITE_ALLOW_UNCONFIGURED_BUILD=true ' +
                    'for a config-less build such as CI verification.'
            );
        }
    }

    // An empty siteUrl would render the canonical tag as href="/", which Vite
    // resolves as an asset and fails on with EISDIR. Substitute the localhost
    // values so a deliberately unconfigured build still produces valid output;
    // the guard above is what stops those placeholders reaching a deployment.
    const resolvedBackendUrl = backendUrl || DEFAULT_BACKEND_URL.development;
    const resolvedSiteUrl = siteUrl || DEFAULT_SITE_URL.development;

    return {
        plugins: [
            react(),
            {
                // Substitutes %VITE_SITE_URL% in index.html. Done here rather than
                // relying on Vite's built-in HTML env replacement so an unset
                // variable resolves to the default above instead of leaving the
                // literal placeholder in the shipped markup.
                name: 'inject-site-url',
                transformIndexHtml: {
                    order: 'pre' as const,
                    handler: (html: string) =>
                        html
                            .replace(
                                '<!-- seo:jsonld -->',
                                () =>
                                    `<script type="application/ld+json">\n${JSON.stringify(
                                        siteGraph(resolvedSiteUrl),
                                        null,
                                        2
                                    ).replace(/</g, '\\u003c')}\n</script>`
                            )
                            .replaceAll('%VITE_SITE_URL%', resolvedSiteUrl),
                },
            },
            emitDiscoveryFiles(resolvedSiteUrl, resolvedBackendUrl, avatarUrl),
        ],
        server: {
            port: 3000,
            host: true,
        },
        build: {
            target: 'esnext',
            sourcemap: false,
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        // PostCSS plugins come from postcss.config.js.
        optimizeDeps: {
            include: ['react', 'react-dom', 'axios'],
        },
        envPrefix: 'VITE_',
        // Defined explicitly rather than left to Vite's automatic VITE_
        // exposure, which only ever sees environment variables. These values
        // usually come from site.config.ts, so without this the bundle would
        // read them as undefined on any build that sets no env var.
        define: {
            'import.meta.env.VITE_BACKEND_URL': JSON.stringify(resolvedBackendUrl),
            // The site's own address, for the links the share line hands out.
            'import.meta.env.VITE_SITE_URL': JSON.stringify(resolvedSiteUrl),
            'import.meta.env.VITE_AVATAR_URL': JSON.stringify(avatarUrl),
            'import.meta.env.VITE_AVATAR_HIRES_URL': JSON.stringify(avatarHiResUrl),
            // The one build value kept out of the repository: see constants/links.ts.
            'import.meta.env.VITE_WHATSAPP_NUMBER': JSON.stringify(env.VITE_WHATSAPP_NUMBER || ''),
        },
    };
});
