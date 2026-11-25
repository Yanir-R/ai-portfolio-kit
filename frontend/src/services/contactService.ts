import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { TURNSTILE_HEADER } from '@/constants/turnstile';

/*
 * The contact form's one request. The visitor-facing wording of the outcome
 * lives with the form, in both languages; this reports only whether it worked.
 */
export const contactService = {
    async send(
        details: { email: string; message: string; topic?: string; lang: 'he' | 'en' },
        turnstileToken: string | null
    ): Promise<boolean> {
        try {
            await apiClient.post(
                API_ENDPOINTS.CONTACT,
                details,
                turnstileToken ? { headers: { [TURNSTILE_HEADER]: turnstileToken } } : undefined
            );
            return true;
        } catch (error) {
            console.error('Contact request failed:', error);
            return false;
        }
    },
};
