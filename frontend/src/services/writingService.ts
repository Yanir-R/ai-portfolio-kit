import axios from 'axios';
import { apiClient, NotFoundError, toRequestError } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { WritingEntry, WritingIndex, WritingOverview } from '@/types/writing';
import { stripMetadataSections } from '@/utils/markdown';

/** Sections the backend parses out of each document into `WritingEntry` fields. */
const METADATA_HEADINGS = ['Kind', 'Source', 'URL', 'Date', 'Media', 'Summary', 'Related'];

/*
 * The whole index, fetched once per page load and shared: the blog page, a
 * reading page and every card in the chat read the same list, so a card always
 * shows what the page shows. A failed fetch is forgotten so the next caller
 * can try again.
 */
let indexRequest: Promise<WritingIndex> | null = null;

export const stripWritingMetadata = (markdown: string): string =>
    stripMetadataSections(markdown, METADATA_HEADINGS)
        // The title is rendered as the page heading, so drop the leading H1 to
        // avoid showing it twice.
        .replace(/^#\s+.*\n?/, '')
        .trim();

/** The overview's counts, taken again over the pieces the blog lists. */
const listedOverview = (overview: WritingOverview, entries: WritingEntry[]): WritingOverview => {
    const count = (pick: (entry: WritingEntry) => string[]) => {
        const counts: Record<string, number> = {};
        for (const entry of entries)
            for (const key of pick(entry)) counts[key] = (counts[key] ?? 0) + 1;
        return counts;
    };
    const topics = count((entry) => entry.topics ?? []);
    return {
        ...overview,
        total: entries.length,
        sources: count((entry) => [entry.source]),
        topics: overview.topics
            .map((topic) => ({ ...topic, count: topics[topic.id] ?? 0 }))
            .filter((topic) => topic.count > 0)
            .sort((a, b) => b.count - a.count),
    };
};

export const writingService = {
    async getAll(): Promise<WritingEntry[]> {
        try {
            const response = await apiClient.get<{ writing: WritingEntry[] }>(
                API_ENDPOINTS.WRITING
            );
            return response.data.writing || [];
        } catch (error) {
            throw toRequestError(error, 'Error fetching writing');
        }
    },

    getIndex(): Promise<WritingIndex> {
        if (!indexRequest) {
            indexRequest = apiClient
                .get<{ writing: WritingEntry[]; overview: WritingOverview }>(API_ENDPOINTS.WRITING)
                .then((response) => {
                    const all = response.data.writing || [];
                    const bySlug = Object.fromEntries(all.map((entry) => [entry.slug, entry]));
                    // A post that is the short version of an article is read from the
                    // article, not listed beside it; its own page and the chat keep it.
                    const folded = (entry: WritingEntry) =>
                        entry.kind === 'post' &&
                        (entry.related ?? []).some((slug) => bySlug[slug]?.kind === 'article');
                    const entries = all.filter((entry) => !folded(entry));
                    const overview = response.data.overview ?? {
                        total: 0,
                        sources: {},
                        topics: [],
                        series: [],
                    };
                    return { entries, bySlug, overview: listedOverview(overview, entries) };
                })
                .catch((error) => {
                    indexRequest = null;
                    throw toRequestError(error, 'Error fetching writing');
                });
        }
        return indexRequest;
    },

    async getBySlug(slug: string): Promise<WritingEntry> {
        try {
            const response = await apiClient.get<{ entry: WritingEntry }>(
                API_ENDPOINTS.WRITING_ENTRY(slug)
            );
            return response.data.entry;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new NotFoundError(`Nothing published at "${slug}"`, { cause: error });
            }
            throw toRequestError(error, `Error fetching writing ${slug}`);
        }
    },
};
