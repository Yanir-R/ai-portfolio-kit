import axios from 'axios';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { TURNSTILE_HEADER } from '@/constants/turnstile';
import { AnswerTrace, ChatBlock, ChatContext, ChatHandoff, ChatMessage } from '@/types/chat';

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
    sig?: string | null;
    handoff?: ChatHandoff | null;
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

/*
 * Why a send failed, as a code rather than a sentence: the panel words it in
 * the page's language. `retryAfter` is the backend's own Retry-After, so a
 * visitor is told the real wait rather than "a moment".
 */
export type ChatFailure =
    { code: 'too_long' } | { code: 'rate_limited'; retryAfter?: number } | { code: 'failed' };

const toChatFailure = (error: unknown): ChatFailure => {
    console.error('Chat request failed:', error);
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 422) return { code: 'too_long' };
        if (error.response?.status === 429) {
            const retryAfter = Number(error.response.headers?.['retry-after']);
            return {
                code: 'rate_limited',
                retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
            };
        }
    }
    return { code: 'failed' };
};

export type ChatResult = Awaited<ReturnType<typeof chatService.sendMessage>>;

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
        context?: ChatContext | null,
        /** The offer to talk directly was already made in this conversation. */
        handoffOffered = false
    ) => {
        try {
            const body = {
                ...(context ? { context: { type: context.type, ref: context.ref } } : {}),
                shown: shownSlugs(conversationHistory),
                ...(handoffOffered ? { handoff_offered: true } : {}),
                message,
                conversation_history: conversationHistory.slice(-MAX_HISTORY_SENT).map((msg) => ({
                    type: msg.type,
                    content: msg.content,
                    is_email_collection: msg.is_email_collection,
                    email_collected: msg.email_collected,
                    ...(msg.sig ? { sig: msg.sig } : {}),
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
                success: true as const,
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
                sig: response.data.sig ?? null,
                handoff: response.data.handoff ?? null,
            };
        } catch (error) {
            return { success: false as const, error: toChatFailure(error) };
        }
    },
};
