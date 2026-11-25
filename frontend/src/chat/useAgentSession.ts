import { useCallback, useState } from 'react';
import { CHAT } from '@/copy/chat';
import { useLang } from '@/i18n/useLang';
import { chatService, ChatFailure } from '@/services/chatService';
import { ChatContext, ChatMessage, ChatTopic } from '@/types/chat';
import { FailureCase, failureCase, failureText } from '@/chat/failure';

/*
 * What every chat on the site shares about talking to the agent, whatever it
 * draws around the answer: the home chat (useHomeChat) and the chat under a
 * post (AskDock) both send through here.
 *
 * One request at a time (`busy`). A request carries a fresh Turnstile token
 * and whether the offer to talk directly was already made, so the server
 * offers it at most once per conversation. When the day's answers are spent
 * the session is `closed`, and nothing more is sent until the page reloads.
 */

type Reply = Extract<Awaited<ReturnType<typeof chatService.sendMessage>>, { success: true }>;

export type AgentOutcome =
    | { ok: true; reply: Reply }
    | { ok: false; failure: FailureCase; text: string; error: ChatFailure };

interface Options {
    getToken: () => Promise<string | null>;
    resetToken: () => void;
}

interface Request {
    /** The piece the question is about, when it is asked from a post. */
    context?: ChatContext | null;
    /** A starter question with a drawing: the server sends the drawing's projects. */
    topic?: ChatTopic | null;
}

export const useAgentSession = ({ getToken, resetToken }: Options) => {
    const { t } = useLang();
    const errors = t(CHAT).errors;
    const [busy, setBusy] = useState(false);
    const [closed, setClosed] = useState(false);
    const [handoffOffered, setHandoffOffered] = useState(false);

    const send = useCallback(
        async (
            message: string,
            history: ChatMessage[],
            { context = null, topic = null }: Request = {}
        ): Promise<AgentOutcome> => {
            setBusy(true);
            const result = await chatService.sendMessage(
                message,
                history,
                await getToken(),
                context,
                handoffOffered,
                topic
            );
            resetToken();
            setBusy(false);
            if (!result.success) {
                const failure = failureCase(result.error);
                if (failure === 'daily') setClosed(true);
                return {
                    ok: false,
                    failure,
                    text: failureText(errors, result.error),
                    error: result.error,
                };
            }
            if (result.handoff) setHandoffOffered(true);
            return { ok: true, reply: result };
        },
        [errors, getToken, resetToken, handoffOffered]
    );

    return { busy, closed, handoffOffered, send };
};

/**
 * A log with the offer to talk directly folded away. Asking on is the same
 * choice as "I'll keep asking the agent", so every new turn folds it; the
 * answer itself, and so the history, stays exactly as it was.
 */
export const foldHandoffs = <T extends { kind: string }>(items: T[]): T[] =>
    items.map((item) =>
        item.kind === 'answer' && 'handoff' in item && item.handoff
            ? { ...item, handoff: null }
            : item
    );
