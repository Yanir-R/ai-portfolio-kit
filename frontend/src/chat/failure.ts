import { ChatCopy } from '@/copy/chat';
import { ChatFailure } from '@/services/chatService';

/*
 * The longest wait still treated as a pause. The contact limit runs over a
 * minute, so its Retry-After stays under this; the chat's answer budget runs
 * over a day, so a wait past this means the day's answers are spent.
 */
export const SHORT_WAIT_MAX_SECONDS = 120;

/**
 * What a failed send means for the visitor, which decides what the chat offers
 * next. Only `daily` closes the input; every other case keeps it, because the
 * visitor can still ask again.
 */
export type FailureCase = 'daily' | 'wait' | 'too_long' | 'failed';

export const failureCase = (failure: ChatFailure): FailureCase => {
    if (failure.code === 'too_long') return 'too_long';
    if (failure.code === 'rate_limited') {
        const wait = failure.retryAfter;
        return wait !== undefined && wait > SHORT_WAIT_MAX_SECONDS ? 'daily' : 'wait';
    }
    return 'failed';
};

/** The wait in words: a visitor reads "half a minute", not "27 seconds". */
const waitInWords = (errors: ChatCopy['errors'], seconds?: number): string => {
    if (seconds !== undefined && seconds <= 30) return errors.waitWords.half;
    if (seconds !== undefined && seconds <= 60) return errors.waitWords.one;
    return errors.waitWords.two;
};

/** The sentence for a failed send, shared by the home chat and the post chat. */
export const failureText = (errors: ChatCopy['errors'], failure: ChatFailure): string => {
    switch (failureCase(failure)) {
        case 'daily':
            return errors.daily;
        case 'too_long':
            return errors.tooLong;
        case 'wait':
            return errors.wait.replace(
                '{t}',
                waitInWords(
                    errors,
                    failure.code === 'rate_limited' ? failure.retryAfter : undefined
                )
            );
        default:
            return errors.failed;
    }
};
