import { Lang } from '@/i18n/lang';
import { apiClient, toRequestError } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

/** The profile documents the backend publishes, by file name. */
export const PROFILE_DOCS = {
    about: 'about-me.md',
    resume: 'resume.md',
    workWithMe: 'work-with-me.md',
} as const;

export const profileService = {
    /** In Hebrew where the document has a Hebrew twin, otherwise in English. */
    async get(
        file: (typeof PROFILE_DOCS)[keyof typeof PROFILE_DOCS],
        lang: Lang = 'en'
    ): Promise<string> {
        try {
            const response = await apiClient.get<{ content: string }>(
                API_ENDPOINTS.GET_MARKDOWN_CONTENT(file),
                { params: { lang } }
            );
            return response.data.content ?? '';
        } catch (error) {
            throw toRequestError(error, `Error fetching ${file}`);
        }
    },
};
