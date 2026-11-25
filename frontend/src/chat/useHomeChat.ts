import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAT, ProcessId } from '@/copy/chat';
import { SheetKey } from '@/content/sheets';
import { useLang } from '@/i18n/useLang';
import { chatService, ChatFailure, MAX_HISTORY_SENT } from '@/services/chatService';
import { AnswerTrace, ChatBlock, ChatHandoff, ChatMessage, TraceSource } from '@/types/chat';
import { classify } from '@/chat/intents';
import { sheetFor } from '@/chat/sheetFor';
import { FailureCase, failureCase, failureText as describeFailure } from '@/chat/failure';

/*
 * The home chat as a small, deterministic state machine.
 *
 * Every visitor action goes one of a fixed set of ways, decided in code:
 * a starter or a typed question goes to the agent; a request to talk, to
 * email, or an address being left is answered from fixed copy without a
 * model; the process drawing is a scripted exchange. The drawing beside the
 * chat (`plan`) follows from the same events, so what is drawn is always what
 * happened: the stations light as the request runs, and the numbers on them
 * are the ones the backend measured.
 */

/** What one model answer was given and cost, as the trace reported it. */
export interface AnswerRecord {
    question: string;
    seconds: number;
    sources: TraceSource[];
    /**
     * The projects and posts the answer drew on, by the model's own word,
     * checked by the backend against what was sent. Null when it did not say.
     */
    used: TraceSource[] | null;
    /** The whole corpus, so "3 of 12" can be said. */
    available: number;
    declined: boolean;
    trace: AnswerTrace | null;
    /** Which question of the conversation this was, from 1. */
    turn: number;
    /** The earlier questions that went with it as history. */
    prior: number;
    /** The offer to continue with Yanir came with this answer. */
    handoff: boolean;
}

/** The message drafted to Yanir when the agent had no answer, or the visitor asked to email. */
export interface Letter {
    question?: string;
    from?: string;
    message?: string;
    note?: string;
    sent: boolean;
}

export type Entry =
    | { id: number; kind: 'user'; text: string }
    | {
          id: number;
          kind: 'agent';
          text: string;
          tag?: 'ready' | 'sent';
          sheet?: SheetKey;
          asksEmail?: boolean;
      }
    | { id: number; kind: 'starters' }
    | { id: number; kind: 'working' }
    | {
          id: number;
          kind: 'answer';
          text: string;
          record: AnswerRecord | null;
          blocks: ChatBlock[];
          fromIndex: boolean;
          sheet?: SheetKey;
          asksEmail?: boolean;
          /** The server's signature on this reply, sent back with it as history. */
          sig?: string | null;
          /**
           * The offer to continue with Yanir, drawn under this answer. Removed
           * when the visitor chooses to keep asking or a send fails after it;
           * the answer itself, and so the history, stays exactly as it was.
           */
          handoff?: ChatHandoff | null;
      }
    | { id: number; kind: 'summary'; process: ProcessId; team: string }
    /** The process question as a card of choices; folded once answered, by a pick or in words. */
    | { id: number; kind: 'pick'; open: boolean; picked?: ProcessId }
    | {
          id: number;
          kind: 'error';
          text: string;
          failure: FailureCase;
          /** The words that did not get an answer, for a retry or the contact window. */
          question: string;
      };

/** Entries before an id is given to them. */
type NewEntry = Entry extends infer E ? (E extends Entry ? Omit<E, 'id'> : never) : never;

export type PlanView =
    | { kind: 'base' }
    | { kind: 'running'; stage: number; elapsed: number }
    | { kind: 'lit'; record: AnswerRecord; back?: SheetKey }
    | { kind: 'ready' }
    | { kind: 'sheet'; key: SheetKey }
    | { kind: 'cmp'; process: ProcessId };

/** A drawing opened from the conversation, kept as a tab. */
export interface OpenSheet {
    key: SheetKey | 'cmp';
    record?: AnswerRecord;
    letter?: Letter;
    process?: ProcessId;
}

export type QuickReply =
    | { kind: 'ask'; label: string; sheet?: SheetKey }
    | { kind: 'compare'; label: string }
    | { kind: 'ready'; label: string }
    | { kind: 'process'; label: string; process: ProcessId }
    | { kind: 'team'; label: string };

/** How long each instant station takes to light, and the pause before the drawing turns into the answer's sheet. */
export const TIMING = {
    station: 140,
    sheetAfterAnswer: 900,
    contactSheet: 700,
    mailSheet: 500,
} as const;
const RUNNING_STAGES = 3; // stations 0..2 light at once; station 3 is the model call
const MAX_QUICK = 3;

interface Options {
    getToken: () => Promise<string | null>;
    resetToken: () => void;
}

/** The greeting's id: its text follows the page's language. */
export const GREETING_ID = 0;

export const useHomeChat = ({ getToken, resetToken }: Options) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const nextId = useRef(1);
    const timers = useRef<number[]>([]);
    const [stored, setEntries] = useState<Entry[]>(() => [
        { id: GREETING_ID, kind: 'agent', text: copy.greeting },
        { id: -1, kind: 'starters' },
    ]);
    const [plan, setPlan] = useState<PlanView>({ kind: 'base' });
    const [sheets, setSheets] = useState<OpenSheet[]>([]);
    const [quick, setQuick] = useState<{ label: string; items: QuickReply[] }>({
        label: '',
        items: [],
    });
    const [busy, setBusy] = useState(false);
    const [mailWait, setMailWait] = useState<{ sheet: 'mail' | 'ask'; question?: string } | null>(
        null
    );
    const [asked, setAsked] = useState<Set<string>>(new Set());
    const [offline, setOffline] = useState(false);
    // The day's answers are spent. Nothing typed can be answered until the
    // budget renews, so the input gives way to the routes to Yanir.
    const [closed, setClosed] = useState(false);
    // The offer to talk directly is made at most once per conversation; the
    // server is told, so it does not offer it again.
    const [handoffOffered, setHandoffOffered] = useState(false);

    // The greeting is always in the page's current language.
    const entries = useMemo(
        () =>
            stored.map((e) =>
                e.id === GREETING_ID && e.kind === 'agent' ? { ...e, text: copy.greeting } : e
            ),
        [stored, copy.greeting]
    );

    const later = (ms: number, fn: () => void) => {
        timers.current.push(window.setTimeout(fn, ms));
    };
    useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

    useEffect(() => {
        let cancelled = false;
        chatService
            .checkKnowledge()
            .then(({ ready }) => !cancelled && !ready && setOffline(true))
            .catch(() => !cancelled && setOffline(true));
        return () => {
            cancelled = true;
        };
    }, []);

    const push = useCallback((...items: NewEntry[]) => {
        setEntries((prev) => [
            // The starter grid goes once the visitor says anything, and an
            // open offer to talk directly folds once the conversation moves
            // on: asking on is the same choice as "I'll keep asking the agent".
            // An open process card folds too: anything said answers it.
            ...prev
                .filter((e) => e.kind !== 'starters' && e.kind !== 'working')
                .map((e) => (e.kind === 'answer' && e.handoff ? { ...e, handoff: null } : e))
                .map((e) => (e.kind === 'pick' && e.open ? { ...e, open: false } : e)),
            ...items.map((item) => ({ ...item, id: nextId.current++ }) as Entry),
        ]);
    }, []);

    /** Opens a drawing and keeps it as a tab; a later open of the same one updates it. */
    const openSheet = useCallback((key: SheetKey, extra: Omit<OpenSheet, 'key'> = {}) => {
        setSheets((prev) => {
            const i = prev.findIndex((s) => s.key === key);
            if (i < 0) return [...prev, { key, ...extra }];
            const next = [...prev];
            next[i] = { ...next[i], ...extra };
            return next;
        });
        setPlan({ kind: 'sheet', key });
    }, []);

    const openCompare = useCallback((process: ProcessId) => {
        setSheets((prev) => {
            const rest = prev.filter((s) => s.key !== 'cmp');
            const i = prev.findIndex((s) => s.key === 'cmp');
            const sheet: OpenSheet = { key: 'cmp', process };
            if (i < 0) return [...prev, sheet];
            rest.splice(i, 0, sheet);
            return rest;
        });
        setPlan({ kind: 'cmp', process });
    }, []);

    /** The suggestions after an answer: questions not yet asked, and one of the scripted paths. */
    const offerNext = useCallback(
        (askedNow: Set<string>, extra: QuickReply[] = []) => {
            const questions: QuickReply[] = [
                ...copy.starters
                    .filter((s) => s.action === 'ask')
                    .map((s) => ({ kind: 'ask' as const, label: s.q, sheet: s.sheet })),
                ...copy.followUps.map((f) => ({
                    kind: 'ask' as const,
                    label: f.q,
                    sheet: f.sheet,
                })),
            ].filter((q) => !askedNow.has(q.label));
            const scripted: QuickReply[] = [
                ...(askedNow.has(copy.compare.ask)
                    ? []
                    : [{ kind: 'compare' as const, label: copy.compare.ask }]),
                ...(askedNow.has(copy.ready.q)
                    ? []
                    : [{ kind: 'ready' as const, label: copy.ready.q }]),
            ];
            const items = [
                ...extra,
                ...questions.slice(0, scripted.length ? 2 : MAX_QUICK),
                ...scripted.slice(0, 1),
            ];
            setQuick({ label: copy.alsoAsk, items: items.slice(0, MAX_QUICK + extra.length) });
        },
        [copy]
    );

    const markAsked = (label: string) => {
        const next = new Set(asked).add(label);
        setAsked(next);
        return next;
    };

    /** The conversation as the backend reads it: what was said, and which turns asked for an address. */
    const history = (): ChatMessage[] =>
        entries.flatMap((e): ChatMessage[] => {
            if (e.kind === 'user') return [{ type: 'user', content: e.text }];
            if (e.kind === 'agent')
                return [{ type: 'ai', content: e.text, is_email_collection: !!e.asksEmail }];
            if (e.kind === 'answer')
                return [
                    {
                        type: 'ai',
                        content: e.text,
                        blocks: e.blocks,
                        is_email_collection: !!e.asksEmail,
                        sig: e.sig,
                    },
                ];
            return [];
        });

    /** Folds away the offer to talk directly. Nothing else in the conversation changes. */
    const foldHandoff = useCallback(() => {
        setEntries((prev) =>
            prev.map((e) => (e.kind === 'answer' && e.handoff ? { ...e, handoff: null } : e))
        );
    }, []);

    /** A send that got no answer: said in the log, and the input closed if the day is spent. */
    const failed = (failure: ChatFailure, question: string) => {
        const kind = failureCase(failure);
        if (kind === 'daily') setClosed(true);
        push({
            kind: 'error',
            text: describeFailure(copy.errors, failure),
            failure: kind,
            question,
        });
    };

    /** A question for the agent: the stations light while it runs, then the answer's drawing opens. */
    const ask = async (text: string, picked?: SheetKey) => {
        if (busy) return;
        setBusy(true);
        setQuick({ label: '', items: [] });
        push({ kind: 'user', text }, { kind: 'working' });
        const askedNow = markAsked(text);

        const started = performance.now();
        setPlan({ kind: 'running', stage: 0, elapsed: 0 });
        for (let s = 1; s <= RUNNING_STAGES; s++) {
            later(TIMING.station * s, () =>
                setPlan((p) => (p.kind === 'running' ? { ...p, stage: s } : p))
            );
        }
        const clock = window.setInterval(
            () =>
                setPlan((p) =>
                    p.kind === 'running'
                        ? { ...p, elapsed: Math.round((performance.now() - started) / 1000) }
                        : p
                ),
            1000
        );

        const sent = history();
        const turn = entries.filter((e) => e.kind === 'user').length + 1;
        const prior = sent.slice(-MAX_HISTORY_SENT).filter((m) => m.type === 'user').length;
        const result = await chatService.sendMessage(
            text,
            sent,
            await getToken(),
            null,
            handoffOffered
        );
        window.clearInterval(clock);
        resetToken();
        setBusy(false);

        if (!result.success) {
            failed(result.error, text);
            setPlan({ kind: 'base' });
            offerNext(askedNow);
            return;
        }

        const trace = result.trace;
        const fromIndex = result.answered_by === 'index';
        const record: AnswerRecord | null = trace
            ? {
                  question: text,
                  seconds: Math.max(
                      1,
                      Math.round((trace.latency_ms ?? performance.now() - started) / 1000)
                  ),
                  sources: trace.sources ?? [],
                  used: result.used,
                  available: trace.context_available ?? trace.sources?.length ?? 0,
                  declined: result.declined ?? trace.context_outcome === 'unmatched',
                  trace,
                  turn,
                  prior,
                  handoff: !!result.handoff,
              }
            : null;
        const sheet = fromIndex ? undefined : sheetFor(text, trace, picked, result.used);
        const asksEmail = record?.declined ?? false;

        push({
            kind: 'answer',
            text: result.response,
            record,
            blocks: result.blocks,
            fromIndex,
            sheet,
            asksEmail,
            sig: result.sig,
            handoff: result.handoff,
        });
        if (result.handoff) setHandoffOffered(true);
        offerNext(askedNow);

        if (fromIndex || !record) {
            setPlan({ kind: 'ready' });
            return;
        }
        setPlan({ kind: 'lit', record });
        if (asksEmail) setMailWait({ sheet: 'ask', question: text });
        if (!sheet) return;
        later(TIMING.sheetAfterAnswer, () =>
            openSheet(sheet, {
                record,
                ...(sheet === 'ask' ? { letter: { question: text, sent: false } } : {}),
            })
        );
    };

    /** An address being left, after the chat asked for one or on its own. Sent as is, no model. */
    const sendMail = async (text: string, email: string) => {
        if (busy) return;
        const waiting = mailWait ?? { sheet: 'mail' as const };
        setBusy(true);
        push({ kind: 'user', text });
        const rest = text.replace(email, '').trim();
        const message = waiting.question
            ? [waiting.question, rest].filter(Boolean).join('\n\n')
            : text;
        const result = await chatService.sendMessage(
            message.includes(email) ? message : `${email} ${message}`,
            history(),
            await getToken()
        );
        resetToken();
        setBusy(false);

        if (!result.success) {
            failed(result.error, rest || text);
            return;
        }
        if (!result.email_collected) {
            push({ kind: 'agent', text: copy.invalidEmail, asksEmail: true });
            return;
        }
        setMailWait(null);
        push({
            kind: 'agent',
            tag: 'sent',
            text: `${waiting.question ? copy.mailSentWithQuestion : copy.mailSent} ${copy.anythingElse}`,
        });
        openSheet(waiting.sheet, {
            letter: {
                from: email,
                question: waiting.question,
                message: waiting.question ? undefined : rest || undefined,
                note: waiting.question ? rest || undefined : undefined,
                sent: true,
            },
        });
        offerNext(asked);
    };

    const contact = (text: string) => {
        push(
            { kind: 'user', text },
            { kind: 'agent', tag: 'ready', text: copy.contactReply, sheet: 'contact' }
        );
        later(TIMING.contactSheet, () => openSheet('contact'));
        offerNext(asked);
    };

    const mail = (text: string) => {
        push(
            { kind: 'user', text },
            { kind: 'agent', tag: 'ready', text: copy.mailReply, asksEmail: true }
        );
        setMailWait({ sheet: 'mail' });
        later(TIMING.mailSheet, () => openSheet('mail', { letter: { sent: false } }));
    };

    /** Whatever the visitor typed. */
    const submit = (raw: string) => {
        const text = raw.trim();
        if (!text || busy) return;
        const intent = classify(text, mailWait !== null);
        if (intent.kind === 'address') return void sendMail(text, intent.email);
        if (mailWait && text.includes('@')) {
            push(
                { kind: 'user', text },
                { kind: 'agent', text: copy.invalidEmail, asksEmail: true }
            );
            return;
        }
        setMailWait(null);
        if (intent.kind === 'mail') return mail(text);
        if (intent.kind === 'contact') return contact(text);
        void ask(text);
    };

    // The scripted "what would an agent change for us" exchange: pick a process, then a team size.
    const startCompare = () => {
        push({ kind: 'user', text: copy.compare.ask }, { kind: 'pick', open: true });
        markAsked(copy.compare.ask);
        // The choices are on the card itself; the row under the log stays empty.
        setQuick({ label: '', items: [] });
    };

    const [process, setProcess] = useState<ProcessId>('support');
    const pickProcess = (id: ProcessId) => {
        setProcess(id);
        setEntries((prev) =>
            prev.map((e) => (e.kind === 'pick' && e.open ? { ...e, open: false, picked: id } : e))
        );
        push(
            { kind: 'user', text: copy.processes[id].name },
            { kind: 'agent', text: copy.compare.drawn }
        );
        openCompare(id);
        setQuick({
            label: copy.compare.pickAnswer,
            items: copy.compare.team.map((label) => ({ kind: 'team', label })),
        });
    };
    const pickTeam = (team: string) => {
        push(
            { kind: 'user', text: team },
            { kind: 'agent', text: copy.compare.summary },
            { kind: 'summary', process, team }
        );
        offerNext(asked, [{ kind: 'compare', label: copy.compare.another }]);
    };

    const ready = () => {
        push(
            { kind: 'user', text: copy.ready.q },
            { kind: 'agent', tag: 'ready', text: copy.ready.a }
        );
        setPlan({ kind: 'ready' });
        offerNext(markAsked(copy.ready.q));
    };

    const pickQuick = (item: QuickReply) => {
        if (busy) return;
        if (item.kind === 'ask') return void ask(item.label, item.sheet);
        if (item.kind === 'compare') return startCompare();
        if (item.kind === 'ready') return ready();
        if (item.kind === 'process') return pickProcess(item.process);
        pickTeam(item.label);
    };

    const pickStarter = (i: number) => {
        const starter = copy.starters[i];
        if (busy || !starter) return;
        if (starter.action === 'compare') return startCompare();
        void ask(starter.q, starter.sheet);
    };

    /** The tabs above the drawing: the base drawing, then every sheet opened, in order. */
    const showSheet = (key: SheetKey | 'cmp' | '') => {
        if (busy) return;
        if (key === '') return setPlan({ kind: 'base' });
        if (key === 'cmp') {
            const sheet = sheets.find((s) => s.key === 'cmp');
            return setPlan({ kind: 'cmp', process: sheet?.process ?? process });
        }
        setPlan({ kind: 'sheet', key });
    };

    /** From a sheet back to the lit path of the answer that opened it, and back again. */
    const showPath = (key: SheetKey) => {
        const record = sheets.find((s) => s.key === key)?.record;
        if (record && !busy) setPlan({ kind: 'lit', record, back: key });
    };

    return {
        entries,
        plan,
        sheets,
        quick,
        busy,
        offline,
        closed,
        /**
         * "I'll keep asking the agent": the offer folds away and the input is
         * where it was. The next question goes to the agent like any other,
         * with the whole conversation behind it.
         */
        keepAsking: foldHandoff,
        /** The offer to talk directly is open under the last answer. */
        handoffOpen: entries.some((e) => e.kind === 'answer' && !!e.handoff),
        /** The offer to talk directly was made somewhere in this conversation. */
        handoffOffered,
        /** Sends a question again after a failed send. */
        retry: (text: string) => !busy && !closed && ask(text),
        /** Which sheet an address is being waited for, if any. */
        awaitingEmail: mailWait?.sheet ?? null,
        /** The process card is waiting for a choice. */
        picking: entries.some((e) => e.kind === 'pick' && e.open),
        submit,
        pickStarter,
        pickQuick,
        showSheet,
        showPath,
        /** Opens a drawing; with the record of the answer it was made for, that answer's figures. */
        openSheet: (key: SheetKey, record?: AnswerRecord | null) =>
            openSheet(key, record ? { record } : {}),
        /** The email route on the contact sheet: the same exchange as typing "can I email you". */
        mailFromChat: () => !busy && mail(copy.mailAsk),
    };
};

export type HomeChat = ReturnType<typeof useHomeChat>;
