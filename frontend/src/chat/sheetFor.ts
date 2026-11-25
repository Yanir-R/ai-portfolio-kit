import { SheetKey } from '@/content/sheets';
import { AnswerTrace } from '@/types/chat';

/*
 * Which drawing opens beside an answer. Decided in code from what the
 * visitor asked and which documents the answer was given; the model's text
 * never chooses. Order matters: the first rule that holds wins.
 *
 *   1. A question picked from the starters carries its own drawing.
 *   2. The model said it has no answer (`declined`): the "ask Yanir" sheet.
 *   3. A question about price or a map, by its words.
 *   4. A project the question names by name.
 *   5. The documents the answer drew on: the first in the model's own list
 *      that has a drawing (it lists the main one first), else the most
 *      specific of what it was sent.
 *   6. Otherwise the answer's own receipt: what was read and measured.
 */
const BY_WORDS: [RegExp, SheetKey][] = [
    [
        /מחיר|כמה\s+(זה\s+)?עולה|עלות|תמחור|תקציב|\bprice|\bpricing|\bcost|\brates?\b|\bbudget/i,
        'price',
    ],
    [/מפה|מפת|\bmap\b/i, 'map'],
];

// A project the question names by name, in either language.
const BY_NAME: [RegExp, SheetKey][] = [
    [/trinity\s*legal|טריניטי\s*ליגל/i, 'legal'],
    [/persona\s*kit|פרסונה\s*קיט/i, 'pk'],
    [
        /\bfleet\b|מערך\s*הסוכנים|צי\s*הסוכנים|review[\s-]*engine|מנוע\s*הביקורת|trinity\s*agent|hermes|הרמס/i,
        'built',
    ],
];

const BY_SOURCE: [string, SheetKey][] = [
    ['trinity-legal', 'legal'],
    ['personakit', 'pk'],
    ['agent-fleet', 'built'],
    ['review-engine', 'built'],
    ['trinity-agent', 'built'],
];

/** Answers that are only conversation get no drawing at all. */
const NO_SHEET_OUTCOMES = new Set(['conversational']);

export const sheetFor = (
    question: string,
    trace: AnswerTrace | null | undefined,
    picked?: SheetKey,
    used?: { slug: string }[] | null,
    declined = false
): SheetKey | undefined => {
    if (picked) return picked;
    if (!trace) return undefined;
    // The model said it has no answer: the drawing points to asking Yanir.
    // Decided by `declined` alone, as every other part of the site does, and
    // not by the search outcome: an unmatched search can still be answered
    // from his notes.
    if (declined) return 'ask';
    if (trace.context_outcome && NO_SHEET_OUTCOMES.has(trace.context_outcome)) return undefined;
    const byWords = BY_WORDS.find(([re]) => re.test(question));
    if (byWords) return byWords[1];
    const byName = BY_NAME.find(([re]) => re.test(question));
    if (byName) return byName[1];
    // The model lists what it drew on, the main one first: its drawing wins.
    const drawn = (slug: string) => BY_SOURCE.find(([s]) => s === slug)?.[1];
    if (used) {
        const main = used.map((s) => drawn(s.slug)).find(Boolean);
        if (main) return main;
    }
    const slugs = new Set((used ?? trace.sources ?? []).map((s) => s.slug));
    const bySource = BY_SOURCE.find(([slug]) => slugs.has(slug));
    if (bySource) return bySource[1];
    return 'read';
};
