import axios from 'axios';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { TURNSTILE_HEADER } from '@/constants/turnstile';
import { AnswerTrace, ChatBlock, ChatContext, ChatMessage } from '@/types/chat';

/**
 * Kept well below the backend's MAX_HISTORY_MESSAGES (40), which rejects a
 * longer history with a 422. That cap is a server-side guard against a
 * hand-crafted request; a visitor simply having a long conversation must not
 * trip it. The server only replays the last few turns to the model anyway, so
 * sending more costs bandwidth and buys nothing.
 */
const MAX_HISTORY_SENT = 20;

interface ChatResponse {
    response: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
    trace?: AnswerTrace | null;
    blocks?: ChatBlock[];
    answered_by?: 'model' | 'index' | null;
    language?: 'en' | 'he' | null;
}

/**
 * The pieces already shown as cards, oldest first, so a follow-up ("what else
 * did you write about that?") is not shown them again.
 */
export const shownSlugs = (history: ChatMessage[]): string[] => {
    const slugs: string[] = [];
    for (const msg of history) {
        for (const block of msg.blocks ?? []) {
            if (block.type === 'writing') slugs.push(block.ref);
            else if (block.type !== 'writing_topics') slugs.push(...(block.items ?? []));
        }
    }
    return [...new Set(slugs)].slice(-40);
};

export const chatService = {
    /** Whether the backend has content to ground its answers in. */
    checkKnowledge: async () => {
        const response = await apiClient.get<{ knowledge_ready: boolean }>(
            API_ENDPOINTS.CHAT_STATUS
        );

        return { ready: response.data?.knowledge_ready === true };
    },
    sendMessage: async (
        message: string,
        conversationHistory: ChatMessage[],
        turnstileToken?: string | null,
        context?: ChatContext | null
    ) => {
        try {
            const body = {
                ...(context ? { context: { type: context.type, ref: context.ref } } : {}),
                shown: shownSlugs(conversationHistory),
                message,
                conversation_history: conversationHistory.slice(-MAX_HISTORY_SENT).map((msg) => ({
                    type: msg.type,
                    content: msg.content,
                    is_email_collection: msg.is_email_collection,
                    email_collected: msg.email_collected,
                })),
            };

            // The Turnstile token rides in a header on this request alone, not
            // on the client's defaults: it is single-use, and the status check
            // is not a protected endpoint. With no token the header is left off
            // rather than sent empty, and the Worker's reply explains the rest.
            const config = turnstileToken
                ? { headers: { [TURNSTILE_HEADER]: turnstileToken } }
                : undefined;

            const response = await apiClient.post<ChatResponse>(API_ENDPOINTS.CHAT, body, config);

            if (!response.data) {
                throw new Error('No response received from server');
            }

            return {
                success: true,
                response: response.data.response,
                is_email_collection: response.data.is_email_collection || false,
                email_collected: response.data.email_collected || false,
                // Left null rather than defaulted: an older backend that does
                // not send this, or a reply produced without a model call, must
                // render no rail rather than an empty one.
                trace: response.data.trace ?? null,
                blocks: response.data.blocks ?? [],
                answered_by: response.data.answered_by ?? null,
                language: response.data.language ?? null,
            };
        } catch (error) {
            let errorMessage = 'Failed to get response from server';

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    errorMessage =
                        "I couldn't find any content in the available files to answer your question.";
                } else if (error.response?.status === 422) {
                    errorMessage = 'That message was too long to send. Try a shorter one.';
                } else if (error.response?.status === 429) {
                    // The backend already computed exactly how long the window has
                    // left and returned it as Retry-After. Telling the visitor "a
                    // moment" while holding the real number helps nobody.
                    const retryAfter = Number(error.response.headers?.['retry-after']);
                    errorMessage =
                        Number.isFinite(retryAfter) && retryAfter > 0
                            ? `Too many messages just now. Try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.`
                            : 'Too many messages just now. Give it a moment and try again.';
                } else if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                }
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    },
};
