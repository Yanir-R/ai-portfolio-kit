/**
 * Link-preview cards for posts, articles and project pages.
 *
 * A shared link shows one image and two lines of text, and before this every
 * post without its own picture previewed as the home page. Each post, article
 * and project now gets a 1200x630 card of its own, drawn in the site's ink and
 * yellow: what kind of page it is, the page's title with its last clause
 * highlighted, a line on what it says, and a picture beside it - the post's own
 * image, the project's card image, or a short verbatim line from the post when
 * there is no image.
 *
 * This file only decides what goes on each card. The build writes the list to
 * dist/share/cards.json and scripts/share-cards.mjs draws them with Chromium,
 * after the bundle, so `vite build` itself never needs a browser.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type CardLang = 'he' | 'en';

export type ShareCard = {
    file: string; // output path inside dist, e.g. share/en/blog/agent-advisor.jpg
    lang: CardLang; // the card's chrome: kind label, meta line, address
    kind: string;
    meta: string;
    title: string;
    titleLang: CardLang;
    mark?: string; // the tail of the title to highlight
    sub: string;
    subLang: CardLang;
    image?: string; // site-relative path under public/
    quote?: string;
    quoteLang?: CardLang;
    address: string; // shown on the card, e.g. yanirrot.com/blog
};

type IndexEntry = { topics?: string[]; summary_he?: string; share_quote?: string };
type WritingIndex = {
    topics: { id: string; en: string; he: string }[];
    series: { id: string; title: string; title_he: string; parts: { slug: string }[] }[];
    pieces: Record<string, IndexEntry>;
};

const HEBREW = /[א-ת]/g;
const LATIN = /[a-z]/gi;
const langOf = (text: string): CardLang =>
    (text.match(HEBREW) || []).length > (text.match(LATIN) || []).length ? 'he' : 'en';

const LABEL = {
    he: { post: 'פוסט', article: 'מאמר', project: 'פרויקט', series: 'סדרה', min: 'דק׳ קריאה' },
    en: { post: 'Post', article: 'Article', project: 'Project', series: 'Series', min: 'min read' },
} as const;

// Where an article first appeared, as the card says it. Sources not listed
// here show the read time alone.
const SOURCE_LINE: Record<string, Record<CardLang, string>> = {
    'company engineering blog': { he: 'נכתב לבלוג של החברה', en: 'Written for my company’s blog' },
    medium: { he: 'פורסם ב-Medium', en: 'Published on Medium' },
};

// The project categories in backend/docs/projects, in Hebrew. A category
// missing here shows in English on the Hebrew card rather than failing.
const CATEGORY_HE: Record<string, string> = {
    'AI Agents & Automation': 'סוכני AI ואוטומציה',
    'AI Agents & Code Review': 'סוכני AI וסקירת קוד',
    'AI Memory & Open Source': 'זיכרון AI וקוד פתוח',
    'Developer Tools & Open Source': 'כלי פיתוח וקוד פתוח',
    'AI/ML & Gaming': 'AI וגיימינג',
    'Full-Stack Development': 'פיתוח Full-Stack',
    'Full-Stack Development & Client Work': 'מערכת בהתאמה אישית',
};

// The English categories, where the full one is too long for the card's top line.
const CATEGORY_EN: Record<string, string> = {
    'Full-Stack Development & Client Work': 'Custom-built system',
};

// A project whose page image does not work as a still: PersonaKit's is a
// terminal recording whose first frame is an empty screen.
const PROJECT_IMAGE: Record<string, string> = {
    personakit: '/writing/personakit-day-2.jpg',
};

// Images a card can show: local raster files. A GIF is drawn as its first
// frame; a remote image is skipped so the build never depends on another host.
const CARD_IMAGE = /^\/[^?#]+\.(png|jpe?g|gif|webp)$/i;

const strip = (md: string) =>
    md
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`>#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Whole sentences from the start of `text`, as many as fit in `max`
 * characters. A preview that stops mid-sentence reads as broken, so a first
 * sentence longer than `max` is kept whole, and only one longer than
 * LONGEST_SENTENCE is cut.
 */
const LONGEST_SENTENCE = 300;
const SENTENCE_END = /(?<=[.!?]["”’״)]*)\s+/;

export const wholeSentences = (text: string, max: number) => {
    const plainText = strip(text);
    // A sentence ends at . ! or ? followed by a space, so "0.2" and "22.7" stay whole.
    const sentences = plainText.split(SENTENCE_END).map((t) => `${t} `);
    let out = '';
    for (const s of sentences) {
        if ((out + s).trim().length > max) break;
        out += s;
    }
    out = out.trim();
    if (out) return out;
    // A long first sentence still reads better whole than cut.
    const first = sentences[0].trim();
    if (first.length <= LONGEST_SENTENCE) return first;
    const cut = plainText.slice(0, max - 1);
    return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-–]$/, '') + '…';
};

/** The part of a title to highlight: what follows its last comma, colon or full stop. */
export const markOf = (title: string) => {
    const m = title.match(/^(.*[,:.])\s+(\S[^,:.]*[.?!]?)$/);
    if (!m) return undefined;
    const tail = m[2];
    // Too short reads as a typo, and the whole title is not a highlight.
    return tail.split(/\s+/).length >= 2 && tail.length < title.length * 0.75 ? tail : undefined;
};

const minutes = (body: string) => Math.max(1, Math.round(strip(body).split(' ').length / 200));

const address = (siteUrl: string, lang: CardLang, section: 'blog' | 'projects') =>
    `${siteUrl.replace(/^https?:\/\//, '')}${lang === 'en' ? '/en' : ''}/${section}`;

export const loadWritingIndex = (docsRoot: string): WritingIndex | undefined => {
    const file = path.join(docsRoot, 'writing-index.json');
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
};

/** The card's file for a route: /en/blog/x -> share/en/blog/x.jpg */
const fileFor = (route: string) => `share${route}.jpg`;

export const writingCard = (o: {
    route: string;
    lang: CardLang;
    slug: string;
    title: string;
    body: string;
    sections: Record<string, string>;
    image?: string;
    index?: WritingIndex;
    siteUrl: string;
}): ShareCard => {
    const { lang, slug, title, body, sections, index } = o;
    const entry = index?.pieces[slug] || {};
    const isArticle = (sections.kind || '').toLowerCase() === 'article';
    const contentLang = langOf(body);
    const label = LABEL[lang];

    let meta: string;
    if (isArticle) {
        const source = SOURCE_LINE[(sections.source || '').trim().toLowerCase()];
        meta = [source?.[lang], `${minutes(body)} ${label.min}`].filter(Boolean).join(' · ');
    } else {
        const series = index?.series.find((s) => s.parts.some((p) => p.slug === slug));
        const topic = index?.topics.find((t) => t.id === entry.topics?.[0]);
        meta = series
            ? `${label.series} · ${lang === 'he' ? series.title_he : series.title}`
            : topic
              ? topic[lang]
              : '';
    }

    // The line under the title, in the card's language when the piece has one
    // in it: the Hebrew one-liner from the index, or the summary's opening.
    // An article's summary opens by saying where it was written, which the meta
    // line above already says.
    const summary = (sections.summary || body).replace(/^An article I wrote[^.]*\.\s*/i, '');
    const sub = lang === 'he' && entry.summary_he ? entry.summary_he : wholeSentences(summary, 150);

    const quote = o.image ? undefined : entry.share_quote;
    // A piece with no image draws a quote beside its title. Picking the line is
    // an editorial choice, so the build names what is missing instead of guessing.
    if (!o.image && !quote && lang === 'he') {
        console.warn(
            `share card: ${slug} has no image and no share_quote in writing-index.json; ` +
                'its card has nothing beside the title'
        );
    }
    if (quote && !body.includes(quote)) {
        throw new Error(
            `writing-index.json share_quote for ${slug} is not word for word in the piece`
        );
    }

    return {
        file: fileFor(o.route),
        lang,
        kind: isArticle ? label.article : label.post,
        meta,
        title,
        titleLang: langOf(title),
        mark: markOf(title),
        sub,
        subLang: langOf(sub),
        image: o.image && CARD_IMAGE.test(o.image) ? o.image : undefined,
        quote,
        quoteLang: quote ? contentLang : undefined,
        address: address(o.siteUrl, lang, 'blog'),
    };
};

export const projectCard = (o: {
    route: string;
    slug: string;
    lang: CardLang;
    title: string;
    overview: string;
    category?: string;
    image?: string;
    siteUrl: string;
}): ShareCard => {
    const category = (o.category || '').trim();
    const sub = wholeSentences(o.overview, 150);
    const image = PROJECT_IMAGE[o.slug] || o.image;
    return {
        file: fileFor(o.route),
        lang: o.lang,
        kind: LABEL[o.lang].project,
        meta: (o.lang === 'he' ? CATEGORY_HE : CATEGORY_EN)[category] || category,
        title: o.title,
        titleLang: langOf(o.title),
        mark: o.title, // a project's name is short; the whole of it is the highlight
        sub,
        subLang: langOf(sub),
        image: image && CARD_IMAGE.test(image) ? image : undefined,
        address: address(o.siteUrl, o.lang, 'projects'),
    };
};
