#!/usr/bin/env node
/*
 * Draws the link-preview card of every post, article and project page.
 *
 * `vite build` writes dist/share/cards.json: what each card says and which
 * picture it shows (seo/share.mts decides that). This script renders each one
 * as a 1200x630 JPEG at the path the page's og:image already names, with the
 * site's own fonts from node_modules and the images already in dist, so it
 * needs no network and no paid service. Then it deletes cards.json.
 *
 * It needs Chromium for Playwright: `npx playwright install chromium` once.
 * CI does that in the frontend workflow. A card whose title does not fit even
 * at the smallest size fails the build rather than shipping a clipped card.
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const listFile = join(dist, 'share', 'cards.json');

if (!existsSync(listFile)) {
    console.error('share-cards: dist/share/cards.json is missing. Run `vite build` first.');
    process.exit(1);
}
const cards = JSON.parse(readFileSync(listFile, 'utf8'));

const nm = join(root, 'node_modules');
const font = (p) => `url(data:font/woff2;base64,${readFileSync(join(nm, p)).toString('base64')})`;
const HEB = 'unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F';
const FONTS = `
@font-face{font-family:K;font-weight:700;src:${font('@fontsource/karantina/files/karantina-hebrew-700-normal.woff2')};${HEB}}
@font-face{font-family:K;font-weight:700;src:${font('@fontsource/karantina/files/karantina-latin-700-normal.woff2')}}
@font-face{font-family:A;font-weight:200 800;src:${font('@fontsource-variable/assistant/files/assistant-hebrew-wght-normal.woff2')};${HEB}}
@font-face{font-family:A;font-weight:200 800;src:${font('@fontsource-variable/assistant/files/assistant-latin-wght-normal.woff2')}}
@font-face{font-family:IT;font-weight:800;src:${font('@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff2')}}
@font-face{font-family:IT;font-weight:600;src:${font('@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff2')}}`;

// The same frame as the home card (public/og-image.png, tools/og-card.html):
// grid paper, ink border, yellow offset shadow.
const CSS = `${FONTS}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden}
.c{width:1200px;height:630px;padding:34px;font-family:A,sans-serif;color:#0C1A44;background:#E9EFFB}
.in{height:100%;border:4px solid #0C1A44;border-radius:18px;box-shadow:10px 10px 0 #FFC83D;display:flex;gap:40px;padding:44px 48px;background:#fff;background-image:linear-gradient(#DCE5F7 1px,transparent 1px),linear-gradient(90deg,#DCE5F7 1px,transparent 1px);background-size:30px 30px}
.txt{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.txt>*{flex-shrink:0}
.top{display:flex;align-items:center;gap:14px;font-size:24px;font-weight:700;color:#3A4A78;white-space:nowrap}
.kind{background:#0C1A44;color:#fff;border-radius:999px;padding:4px 18px;font-weight:800}
.kind.y{background:#FFC83D;color:#0C1A44;border:3px solid #0C1A44;padding:1px 15px}
.meta{overflow:hidden;text-overflow:ellipsis}
h1{margin:26px 0 0;text-wrap:balance}
h1[lang=he]{font:700 var(--he,72px)/1.0 K,sans-serif;letter-spacing:.005em}
h1[lang=en]{font:800 var(--en,52px)/1.08 IT,sans-serif;letter-spacing:-.01em}
mark{color:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}
h1[lang=he] mark{background:linear-gradient(transparent 40%,#FFC83D 40%,#FFC83D 92%,transparent 92%);padding:0 6px;margin:0 -6px}
h1[lang=en] mark{background:linear-gradient(transparent 24%,#FFC83D 24%,#FFC83D 98%,transparent 98%);padding:0 5px;margin:0 1px}
.sub{font-size:27px;line-height:1.35;font-weight:600;color:#26335C;margin-top:20px;text-wrap:pretty}
.foot{margin-top:auto;padding-top:16px;display:flex;align-items:center;gap:14px;font-size:24px;font-weight:800}
.foot svg{width:46px;height:46px;display:block}
.url{direction:ltr;background:#0C1A44;color:#fff;padding:5px 16px;border-radius:999px;font-size:23px;font-weight:800;margin-inline-start:auto;white-space:nowrap}
.vis{width:400px;flex:none;align-self:stretch;border:4px solid #0C1A44;border-radius:14px;overflow:hidden;background:#fff}
.vis.wide{width:500px;align-self:center;aspect-ratio:1200/630}
.vis img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.vis.wide img{object-position:center}
.quote{width:380px;flex:none;align-self:center;background:#0C1A44;color:#fff;border-radius:14px;padding:34px 32px 30px;position:relative}
.quote[lang=he]{font:700 44px/1.08 K,sans-serif}
.quote[lang=en]{font:700 30px/1.25 IT,sans-serif}
.quote:before{position:absolute;top:-38px;inset-inline-start:22px;font:700 120px/1 K,sans-serif;color:#FFC83D}
.quote[lang=he]:before{content:"״"}
.quote[lang=en]:before{content:"“"}`;

const SIZES = [
    { he: 72, en: 52 },
    { he: 62, en: 46 },
    { he: 54, en: 40 },
    { he: 48, en: 36 },
];

const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dir = (lang) => (lang === 'he' ? 'rtl' : 'ltr');

const favicon = readFileSync(join(root, 'public', 'favicon.svg'), 'utf8');
const NAME = { he: 'יניר רוט', en: 'Yanir Rot' };

const images = new Map();
const dataUri = (src) => {
    if (!images.has(src)) {
        const file = join(dist, src);
        if (!existsSync(file)) throw new Error(`share-cards: image ${src} is not in dist`);
        const ext = src.split('.').pop().toLowerCase();
        const type = ext === 'jpg' ? 'jpeg' : ext;
        images.set(src, `data:image/${type};base64,${readFileSync(file).toString('base64')}`);
    }
    return images.get(src);
};

const titleHtml = (c) => {
    const at = c.mark ? c.title.lastIndexOf(c.mark) : -1;
    return at < 0
        ? esc(c.title)
        : esc(c.title.slice(0, at)) + `<mark>${esc(c.mark)}</mark>` + esc(c.title.slice(at + c.mark.length));
};

const html = (c) => {
    // A project's card image is wide and has no text, so it shows whole; a
    // post's picture fills a tall frame from the top.
    const isProject = c.address.endsWith('/projects');
    const visual = c.image
        ? `<div class="vis${isProject ? ' wide' : ''}"><img src="${dataUri(c.image)}" alt=""></div>`
        : c.quote
          ? `<div class="quote" lang="${c.quoteLang}" dir="${dir(c.quoteLang)}">${esc(c.quote)}</div>`
          : '';
    const isArticle = /^(מאמר|Article)$/.test(c.kind);
    return `<!doctype html><html lang="${c.lang}" dir="${dir(c.lang)}"><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="c"><div class="in"><div class="txt">
<div class="top"><span class="kind${isArticle ? ' y' : ''}">${esc(c.kind)}</span><span class="meta">${esc(c.meta)}</span></div>
<h1 lang="${c.titleLang}" dir="${dir(c.titleLang)}">${titleHtml(c)}</h1>
<p class="sub" lang="${c.subLang}" dir="${dir(c.subLang)}">${esc(c.sub)}</p>
<div class="foot">${favicon}<span>${NAME[c.lang]}</span><span class="url">${esc(c.address)}</span></div>
</div>${visual}</div></div></body></html>`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const failed = [];
for (const card of cards) {
    await page.setContent(html(card), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // Largest title first. At each size, drop the line under the title one
    // whole sentence at a time before trying a smaller title, so the card never
    // ends mid-sentence.
    let fits = false;
    for (const size of SIZES) {
        fits = await page.evaluate((s) => {
            const h1 = document.querySelector('h1');
            h1.style.setProperty('--he', `${s.he}px`);
            h1.style.setProperty('--en', `${s.en}px`);
            const txt = document.querySelector('.txt');
            const sub = document.querySelector('.sub');
            const full = sub.dataset.full || (sub.dataset.full = sub.textContent);
            const sentences = full.split(/(?<=[.!?]["”’״)]*)\s+/).map((t) => `${t} `);
            for (let n = sentences.length; n >= 1; n--) {
                sub.textContent = sentences.slice(0, n).join('').trim();
                if (txt.scrollHeight <= txt.clientHeight + 1) return true;
            }
            sub.textContent = full;
            return false;
        }, size);
        if (fits) break;
    }
    if (!fits) {
        failed.push(card.file);
        continue;
    }
    const out = join(dist, card.file);
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
}
await browser.close();

if (failed.length) {
    console.error(`share-cards: the title does not fit on ${failed.length} card(s):\n  ${failed.join('\n  ')}`);
    process.exit(1);
}
rmSync(listFile);
console.log(`share-cards: drew ${cards.length} link-preview cards into dist/share`);
