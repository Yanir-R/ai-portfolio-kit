import { ChatCopy } from '@/copy/chat';
import { sourceTitle } from '@/content/sheets';
import { TraceSource } from '@/types/chat';

/*
 * The labels of an answer's sources row, in every chat on the site. Yanir's
 * notes go with every question, so an answer the model wrote names them
 * first, then the projects and posts the model says it used. When the model
 * did not say (failure copy, an older reply), what it was sent stands in. A
 * declined answer drew on nothing.
 */
export const answerSources = (
    answer: { declined: boolean; used: TraceSource[] | null; sent: TraceSource[] },
    copy: Pick<ChatCopy, 'noSource' | 'fromNotes'>,
    read: Parameters<typeof sourceTitle>[1]
): string[] => {
    if (answer.declined) return [copy.noSource];
    if (!answer.used) {
        const sent = answer.sent.map((s) => sourceTitle(s, read));
        return sent.length ? [...new Set(sent)] : [copy.noSource];
    }
    return [...new Set([copy.fromNotes, ...answer.used.map((s) => sourceTitle(s, read))])];
};
