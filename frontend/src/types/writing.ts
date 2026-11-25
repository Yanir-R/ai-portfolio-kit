/**
 * A published piece: a long-form article or a short post, written elsewhere and
 * republished here with a link back to the original.
 *
 * `kind` separates the two because they are read differently - an article is
 * sat down with, a post is scanned - and because the list needs to say which is
 * which before you click.
 */
export interface WritingEntry {
    slug: string;
    title: string;
    content: string;
    kind: 'article' | 'post';
    /** Where it was first published, shown as the attribution. */
    source: string;
    /** Canonical link to the original. */
    url?: string;
    /** ISO date, so it sorts as text. */
    date: string;
    /** Root-relative paths under public/writing, in the order they appear. */
    media?: string[];
    summary?: string;
    /** Slugs of related pieces, e.g. a post that summarises an article. */
    related?: string[];
    /** Topic ids from the closed list in the writing index. */
    topics?: string[];
    /** One Hebrew line, from the writing index rather than generated. */
    summary_he?: string;
    /** A sentence that occurs word for word in the piece. */
    quote?: string;
    /** A dated note on a piece whose facts have changed since. */
    note?: WritingNote;
    /** Every media file with its kind, in order. */
    media_items?: MediaItem[];
    series?: SeriesPlace;
}

/**
 * `clip` is a short silent loop (an animated image on LinkedIn): played muted
 * and looped while in view, poster only under reduced motion. `video` has
 * sound and controls.
 */
export interface MediaItem {
    kind: 'image' | 'video' | 'clip';
    src: string;
    poster?: string;
    duration_s?: number;
}

export interface WritingNote {
    date: string;
    en: string;
    he: string;
}

/** Where one piece sits in its series. */
export interface SeriesPlace {
    id: string;
    label: string;
    label_he: string;
    position: number;
    count: number;
}

export interface WritingTopic {
    id: string;
    en: string;
    he: string;
    count: number;
}

export interface WritingSeries {
    id: string;
    title: string;
    title_he: string;
    summary: string;
    summary_he: string;
    video?: MediaItem & { poster: string };
    links?: string[];
    parts: { slug: string; label: string; label_he: string }[];
    count: number;
}

export interface WritingOverview {
    total: number;
    sources: Record<string, number>;
    topics: WritingTopic[];
    series: WritingSeries[];
}

export interface WritingIndex {
    entries: WritingEntry[];
    bySlug: Record<string, WritingEntry>;
    overview: WritingOverview;
}

/** How a source is named to a reader, in each language. */
export const sourceLabel = (source: string, lang: 'en' | 'he'): string => {
    if (/blog/i.test(source)) return lang === 'he' ? 'בלוג חברה' : 'Company blog';
    if (/linkedin/i.test(source)) return lang === 'he' ? 'לינקדאין' : 'LinkedIn';
    return source;
};

export const WRITING_KIND_LABEL: Record<string, string> = {
    article: 'Article',
    post: 'Post',
};

/**
 * Long-form gets the emphasis colour, short posts stay neutral. The list is
 * mostly posts, so this reads as "these two are the substantial ones" rather
 * than as decoration.
 */
export const WRITING_KIND_STYLE: Record<string, string> = {
    article: 'text-signal border-signal/40',
    post: 'text-muted border-border',
};
