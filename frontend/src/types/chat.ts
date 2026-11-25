/**
 * A suggested question offered under the composer. Text only: the title and the
 * description carry the meaning, so a row of prompts reads as questions rather
 * than as a toolbar.
 */
export interface QuickMessageOption {
    title: string;
    description: string;
    message: string;
    nextQuestions?: QuickMessageOption[];
    isEmailRelated?: boolean;
}

/*
 * `confirm` is the success case - a contact address accepted - and renders in
 * the signal colour. `system` is the amber caution treatment, reserved for "that
 * address doesn't look right" and "the assistant is offline", so the one moment
 * a visitor needs to be sure something worked is never styled as a warning.
 */
export type MessageType = 'user' | 'system' | 'ai' | 'initial' | 'quick' | 'confirm';

/*
 * What one answer cost, as measured by the backend.
 *
 * Every field is optional and every one of them can legitimately be absent:
 * the API does not always report a thinking count, and a reply produced without
 * calling a model carries no trace at all. Absent means absent - the rail omits
 * a figure it does not have rather than printing a zero, because these are
 * displayed as evidence and a filled-in number would be a claim nothing backs.
 *
 * There is deliberately no confidence score and no claim about which document
 * an answer came from. Nothing attributes a sentence to a document, so
 * `context` and `sources` report what the model was given, not what it used.
 */

/** How many documents of one kind went into the request. */
export interface ContextCount {
    kind: string;
    count: number;
}

/** One document placed in front of the model. */
export interface TraceSource {
    kind: 'profile' | 'project' | 'writing';
    slug: string;
    title: string;
}

export interface AnswerTrace {
    model?: string | null;
    prompt_tokens?: number | null;
    thinking_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
    /** The part of `prompt_tokens` the model served from its cache. */
    cached_tokens?: number | null;
    finish_reason?: string | null;
    latency_ms?: number | null;
    context?: ContextCount[] | null;
    /*
     * How that set was arrived at. 'narrowed' means the question selected these
     * documents; 'closest' means they matched it only weakly and are the nearest
     * found; 'unmatched' means no document uses the question's words, so only
     * his notes went; 'conversational' means nothing was being asked, so only
     * his notes went; 'unfocused' means every document went. Rendering these as
     * one plain count would claim a selectivity most of them do not have.
     */
    context_outcome?:
        'narrowed' | 'closest' | 'unmatched' | 'conversational' | 'unfocused' | 'no_corpus' | null;
    /** The whole corpus, so a narrowed set can be reported as a share of it. */
    context_available?: number | null;
    /*
     * The documents `context` counts, by name: what the model was given for
     * this question. Not which of them the answer drew on.
     */
    sources?: TraceSource[] | null;
    /** The language the question was read as; decides which documents went. */
    language?: 'en' | 'he' | null;
}

/*
 * Something drawn beside an answer. Chosen by the server, never by the model,
 * so every slug here exists in the writing index.
 */
export interface ChatBlock {
    type: 'writing' | 'writing_list' | 'writing_series' | 'writing_topics';
    /** A slug, a series id, "all"/"recent"/"topic", or a topic id. */
    ref: string;
    items?: string[] | null;
    total?: number | null;
}

/**
 * The starter drawings whose projects the server always sends with the
 * question (backend selection.TOPIC_PROJECTS), so the answer covers what the
 * drawing beside it shows. Keep the two lists in step.
 */
export const CHAT_TOPICS = ['built', 'legal', 'pk'] as const;
export type ChatTopic = (typeof CHAT_TOPICS)[number];

export const isChatTopic = (value: string | undefined): value is ChatTopic =>
    (CHAT_TOPICS as readonly string[]).includes(value ?? '');

/** Asked from a piece's own page. */
export interface ChatContext {
    type: 'writing';
    ref: string;
    title: string;
    /** The piece's language, so the panel speaks it. */
    lang?: 'en' | 'he';
}

/**
 * The server's offer to continue with Yanir directly (see handoff_card in
 * backend/replies.py). `summary` is what the visitor said about their need, in their
 * words; empty when the offer is only because the day's answers run out.
 */
export interface ChatHandoff {
    reason: 'business_context' | 'pricing' | 'timeline' | 'how_to_start' | 'last_answer';
    summary: string;
    /** Yanir's line on the kind of work that fits, from the profile; empty for none. */
    fit?: string;
}

export interface ChatMessage {
    type: MessageType;
    content: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
    trace?: AnswerTrace | null;
    blocks?: ChatBlock[];
    /** "index" when answered straight from the writing index, with no model. */
    answered_by?: 'model' | 'index' | null;
    language?: 'en' | 'he' | null;
    /** The piece the question was asked about, shown above the question. */
    context?: ChatContext | null;
    /**
     * The server's signature on an assistant reply, sent back with it as
     * history. A replayed reply without one is not shown to the model.
     */
    sig?: string | null;
}
