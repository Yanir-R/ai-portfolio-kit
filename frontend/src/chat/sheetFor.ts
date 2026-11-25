import { SheetKey } from '@/content/sheets';
import { AnswerTrace } from '@/types/chat';

/*
 * Which drawing opens beside an answer. Decided in code from what the
 * visitor asked and which documents the answer was given; the model's text
 * never chooses. Order matters: the first rule that holds wins.
 *
 *   1. A question picked from the starters carries its own drawing.
 *   2. Nothing in Yanir's material matched: the "ask Yanir" sheet.
 *   3. A question about price or a map, by its words.
 *   4. The documents the answer drew on, by the most specific one: the
 *      model's own list when it gave one, else what it was sent.
 *   5. Otherwise the answer's own receipt: what was read and measured.
 */
const BY_WORDS: [RegExp, SheetKey][] = [
    [
        /מחיר|כמה\s+(זה\s+)?עולה|עלות|תמחור|תקציב|\bprice|\bpricing|\bcost|\brates?\b|\bbudget/i,
        'price',
    ],
    [/מפה|מפת|\bmap\b/i, 'map'],
];

const BY_SOURCE: [string, SheetKey][] = [
    ['trinity-legal', 'legal'],
    ['personakit', 'pk'],
    ['agent-fleet', 'built'],
    ['review-engine', 'built'],
    ['hermes', 'built'],
];

/** Answers that are only conversation get no drawing at all. */
const NO_SHEET_OUTCOMES = new Set(['conversational']);

export const sheetFor = (
    question: string,
    trace: AnswerTrace | null | undefined,
    picked?: SheetKey,
    used?: { slug: string }[] | null
): SheetKey | undefined => {
    if (picked) return picked;
    if (!trace) return undefined;
    if (trace.context_outcome === 'unmatched') return 'ask';
    if (trace.context_outcome && NO_SHEET_OUTCOMES.has(trace.context_outcome)) return undefined;
    const byWords = BY_WORDS.find(([re]) => re.test(question));
    if (byWords) return byWords[1];
    const slugs = new Set((used ?? trace.sources ?? []).map((s) => s.slug));
    const bySource = BY_SOURCE.find(([slug]) => slugs.has(slug));
    if (bySource) return bySource[1];
    return 'read';
};
