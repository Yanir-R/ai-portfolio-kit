/*
 * What a message is, decided before anything is sent: an email address being
 * left, a request to email or to talk, or a question for the agent. These are
 * answered at once from fixed copy, so contacting Yanir never waits on a model
 * or spends its quota. Both languages are matched in one pass, because a
 * Hebrew sentence often names things in English.
 *
 * Deliberately narrow: a question *about* email or WhatsApp in the work
 * ("did you build a WhatsApp agent?") must still reach the agent.
 */
export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const MAIL_INTENT =
    /(לשלוח|אשלח|לכתוב|אכתוב)\s+(לך\s+|ליניר\s+)?(מייל|אימייל)|(מייל|אימייל)\s+(שלך|ליניר)|\b(send|write)\s+(you|yanir)\s+an?\s+e-?mail|\be-?mail\s+(you|yanir)\b|\byour\s+e-?mail\b/i;

const CONTACT_INTENT =
    /ליצור\s+(איתך\s+|איתו\s+)?קשר|יוצרים\s+(איתך\s+|איתו\s+)?קשר|קשר\s+(איתך|עם\s+יניר)|לדבר\s+(איתך|עם\s+יניר)|לקבוע\s+(שיחה|פגישה)|מספר\s+(טלפון|הטלפון)|\b(contact|reach)\s+(you|yanir)\b|\bget\s+in\s+touch\b|\bbook\s+a\s+(call|meeting)\b|\btalk\s+to\s+(you|yanir)\b/i;

export type Intent =
    | { kind: 'address'; email: string }
    | { kind: 'mail' }
    | { kind: 'contact' }
    | { kind: 'question' };

/**
 * `awaitingEmail` is true while the chat has asked for an address: then an
 * address anywhere in the message is the visitor leaving it. Otherwise only a
 * message that is nothing but an address counts.
 */
export const classify = (text: string, awaitingEmail: boolean): Intent => {
    const email = text.match(EMAIL_RE)?.[0];
    if (email && (awaitingEmail || email === text.trim())) return { kind: 'address', email };
    if (MAIL_INTENT.test(text)) return { kind: 'mail' };
    if (CONTACT_INTENT.test(text)) return { kind: 'contact' };
    return { kind: 'question' };
};
