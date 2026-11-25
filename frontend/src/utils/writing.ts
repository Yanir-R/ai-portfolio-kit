import { Lang } from '@/i18n/lang';
import { stripWritingMetadata } from '@/services/writingService';
import { MediaItem, WritingEntry, WritingIndex, WritingSeries } from '@/types/writing';

/*
 * Small derivations from a writing entry, shared by the blog, a piece's page
 * and the chat cards, so the three always say the same thing.
 */

const WORDS_PER_MINUTE = 200;
const HEBREW = /[֐-׿]/;

/** The one-line summary in the reader's language, falling back to the English one. */
export const summaryOf = (entry: WritingEntry, lang: Lang): string | undefined =>
    lang === 'he' ? (entry.summary_he ?? entry.summary) : entry.summary;

/** A title written in English, marked so it reads left to right inside a Hebrew page. */
export const isEnglishTitle = (entry: WritingEntry): boolean => !HEBREW.test(entry.title);

/** Every media file of a piece, typed; plain paths count as images. */
export const mediaOf = (entry: WritingEntry): MediaItem[] =>
    entry.media_items ?? (entry.media ?? []).map((src) => ({ kind: 'image' as const, src }));

/** The picture that stands for a piece in a list: its first image, or a video's poster. */
export const coverOf = (entry: WritingEntry): { src: string; video?: MediaItem } | undefined => {
    const item = mediaOf(entry)[0];
    if (!item) return undefined;
    const src = item.kind === 'image' ? item.src : item.poster;
    return src ? { src, video: item.kind === 'image' ? undefined : item } : undefined;
};

export const readMinutes = (entry: WritingEntry): number =>
    Math.max(
        1,
        Math.ceil(stripWritingMetadata(entry.content).split(/\s+/).length / WORDS_PER_MINUTE)
    );

export const seriesOf = (
    entry: WritingEntry,
    index: WritingIndex | null
): WritingSeries | undefined =>
    entry.series ? index?.overview.series.find((s) => s.id === entry.series?.id) : undefined;

/** An article this post is the short version of, when the index relates them. */
export const longVersionOf = (
    entry: WritingEntry,
    index: WritingIndex
): WritingEntry | undefined =>
    entry.kind === 'post'
        ? (entry.related ?? []).map((slug) => index.bySlug[slug]).find((e) => e?.kind === 'article')
        : undefined;

/** Text a search matches against: the card and the whole piece. */
export const searchTextOf = (entry: WritingEntry): string =>
    [entry.title, entry.summary ?? '', entry.summary_he ?? '', stripWritingMetadata(entry.content)]
        .join('\n')
        .toLowerCase();
