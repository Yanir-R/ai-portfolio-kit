import { ChatCopy } from '@/copy/chat';
import { ChatFailure } from '@/services/chatService';

/*
 * The longest wait still worded as a countdown. The contact limit runs over a
 * minute, so its Retry-After stays under this; the chat's answer budget runs
 * over a day, and "try again in 85825 seconds" is not a sentence a visitor can
 * use. Past this the visitor is told the day's answers are spent and pointed
 * at the other ways to reach Yanir.
 */
export const COUNTDOWN_MAX_SECONDS = 120;

/** One wording of a failed send, shared by the home chat and the post chat. */
export const failureText = (errors: ChatCopy['errors'], failure: ChatFailure): string => {
    if (failure.code === 'too_long') return errors.tooLong;
    if (failure.code === 'rate_limited') {
        const wait = failure.retryAfter;
        if (wait === undefined) return errors.rateLimited;
        if (wait > COUNTDOWN_MAX_SECONDS) return errors.dailyLimit;
        return errors.rateLimitedIn.replace('{n}', String(wait));
    }
    return errors.failed;
};
