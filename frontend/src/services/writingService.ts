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
                    const entries = response.data.writing || [];
                    return {
                        entries,
                        bySlug: Object.fromEntries(entries.map((entry) => [entry.slug, entry])),
                        overview: response.data.overview ?? {
                            total: entries.length,
                            sources: {},
                            topics: [],
                            series: [],
                        },
                    };
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
