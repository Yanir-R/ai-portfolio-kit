import React, { useLayoutEffect, useRef, useState } from 'react';
import { WRITING } from '@/copy/writing';
import { CHAT } from '@/copy/chat';
import Markdown from '@/components/Markdown';
import WritingBlocks from '@/components/writing/WritingBlocks';
import { Tag } from '@/components/writing/parts';
import { chatService, ChatFailure } from '@/services/chatService';
import { useTurnstile } from '@/hooks/useTurnstile';
import { FailureCase, failureCase, failureText as describeFailure } from '@/chat/failure';
import FailureCard, { ContactActions } from '@/components/chat/FailureCard';
import { useLang } from '@/i18n/useLang';
import { useLogFollowsViewport } from '@/hooks/usePhoneLayer';
import { ChatBlock, ChatContext, ChatMessage, TraceSource } from '@/types/chat';
import { WritingEntry } from '@/types/writing';

/*
 * "Ask about this piece": a small chat under a piece, with the piece sent as
 * context so the agent reads it first. The starter questions are fixed; one
 * of them ("what does this mean for my business?") first asks which kind of
 * business, from fixed copy and without a model call, and only then asks the
 * agent. Removing the context turns it into a general question.
 */

type Turn =
    | { id: number; kind: 'q'; text: string }
    | { id: number; kind: 'wait' }
    | { id: number; kind: 'pick' }
    /** A muted line in the log: the questions turned general, or back to the piece. */
    | { id: number; kind: 'note'; text: string }
    | {
          id: number;
          kind: 'answer';
          text: string;
          blocks: ChatBlock[];
          sources: TraceSource[];
          fromPiece: boolean;
          sig?: string | null;
      }
    | {
          id: number;
          kind: 'error';
          text: string;
          failure: FailureCase;
          /** What the visitor asked, and what a retry sends again. */
          question: string;
          shown: string;
      };

/** Turns before an id is given to them. */
type NewTurn = Turn extends infer T ? (T extends Turn ? Omit<T, 'id'> : never) : never;

// Keys for the log's turns, unique across every dock on the page.
let nextTurnId = 1;

type Chip = 'sum' | 'biz' | 'more';
const CHIPS: Chip[] = ['sum', 'biz', 'more'];

/** The latest question asked here, carried into the contact window. */
const lastShown = (turns: Turn[]): string => {
    for (let i = turns.length - 1; i >= 0; i--) {
        const turn = turns[i];
        if (turn.kind === 'error') return turn.shown;
        if (turn.kind === 'q') return turn.text;
    }
    return '';
};

interface Props {
    entry: WritingEntry;
    /**
     * Inside the phone's full-screen layer (see PostChatLayer): a greeting
     * opens the log, and while the keyboard leaves little room or the visitor
     * is typing, the suggestions give their room to the conversation.
     */
    layer?: boolean;
    /** The layer is open on screen. */
    active?: boolean;
}

// Under this visible height the layer's suggestions fold away (as in the home chat).
const SHORT_VIEW_PX = 480;

const AskDock: React.FC<Props> = ({ entry, layer = false, active = false }) => {
    const { lang, t } = useLang();
    const copy = t(WRITING).ask;
    const errors = t(CHAT).errors;
    const { containerRef: turnstileRef, getToken, reset: resetToken } = useTurnstile();
    const logRef = useRef<HTMLDivElement>(null);
    const [turns, setTurns] = useState<Turn[]>([]);
    const [chips, setChips] = useState<Chip[]>(CHIPS);
    const [withContext, setWithContext] = useState(true);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    // The day's answers are spent: the input row becomes the routes to Yanir.
    const [closed, setClosed] = useState(false);

    useLayoutEffect(() => {
        const log = logRef.current;
        if (log) log.scrollTop = log.scrollHeight;
    }, [turns]);
    // A limit or failure card on show: the context row folds to one line.
    const failing = closed || turns[turns.length - 1]?.kind === 'error';
    const short = useLogFollowsViewport(logRef, layer && active, SHORT_VIEW_PX);
    const showChips = !closed && chips.length > 0 && !(layer && (short || text.trim() !== ''));

    const context: ChatContext | null = withContext
        ? { type: 'writing', ref: entry.slug, title: entry.title, lang }
        : null;

    const add = (...items: NewTurn[]) =>
        setTurns((prev) => [
            ...prev.filter((turn) => turn.kind !== 'wait' && turn.kind !== 'pick'),
            ...items.map((item) => ({ ...item, id: nextTurnId++ }) as Turn),
        ]);

    const history = (): ChatMessage[] =>
        turns.flatMap((turn): ChatMessage[] => {
            if (turn.kind === 'q') return [{ type: 'user', content: turn.text }];
            if (turn.kind === 'answer')
                return [{ type: 'ai', content: turn.text, blocks: turn.blocks, sig: turn.sig }];
            return [];
        });

    const failed = (failure: ChatFailure, question: string, shown: string) => {
        const kind = failureCase(failure);
        if (kind === 'daily') setClosed(true);
        add({
            kind: 'error',
            text: describeFailure(errors, failure),
            failure: kind,
            question,
            shown,
        });
    };

    const ask = async (question: string, shown = question) => {
        if (busy || closed) return;
        setBusy(true);
        add({ kind: 'q', text: shown }, { kind: 'wait' });
        const result = await chatService.sendMessage(
            question,
            history(),
            await getToken(),
            context
        );
        resetToken();
        setBusy(false);
        if (!result.success) return failed(result.error, question, shown);
        add({
            kind: 'answer',
            text: result.response,
            blocks: result.blocks,
            sources: result.trace?.sources ?? [],
            fromPiece: !!context,
            sig: result.sig,
        });
    };

    const pickChip = (chip: Chip) => {
        if (busy) return;
        setChips((prev) => prev.filter((c) => c !== chip));
        if (chip === 'biz') return add({ kind: 'q', text: copy.chips.biz }, { kind: 'pick' });
        void ask(copy.chips[chip]);
    };

    // The piece's starters left when its context was dropped, for when it returns.
    const [keptChips, setKeptChips] = useState<Chip[]>([]);
    const removeContext = () => {
        setWithContext(false);
        setKeptChips(chips);
        setChips([]);
        add({ kind: 'note', text: copy.contextOff(entry.kind) });
    };
    // Reopening the layer from the piece asks about the piece again; the
    // conversation so far stays, and its history still goes with each question.
    const [wasActive, setWasActive] = useState(active);
    if (active !== wasActive) {
        setWasActive(active);
        if (active && layer && !withContext) {
            setWithContext(true);
            setChips(keptChips);
            add({ kind: 'note', text: copy.contextOn(entry.kind) });
        }
    }

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || busy) return;
        void ask(text.trim());
        setText('');
    };

    return (
        <div
            className={['w-dock', layer && 'in-layer', failing && 'failing']
                .filter(Boolean)
                .join(' ')}
        >
            {withContext && (
                <div className="w-ctx">
                    <Tag tone="a">{t(WRITING).tags.askingAbout}</Tag>
                    <b dir="auto">{entry.title}</b>
                    {layer ? (
                        // In the layer the X belongs to the layer itself: a word here.
                        <button
                            type="button"
                            className="rm"
                            aria-label={copy.removeContextLong(entry.kind)}
                            onClick={removeContext}
                        >
                            {copy.removeShort}
                        </button>
                    ) : (
                        <button
                            type="button"
                            aria-label={copy.removeContext}
                            onClick={removeContext}
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}
            <div
                className="w-qa"
                role="log"
                tabIndex={0}
                aria-label={copy.log}
                aria-live="polite"
                ref={logRef}
            >
                {layer && (
                    <div className="ans hi" dir="auto">
                        {copy.greeting(entry.kind)}
                    </div>
                )}
                {turns.map((turn) => {
                    if (turn.kind === 'q')
                        return (
                            <div key={turn.id} className="q" dir="auto">
                                {turn.text}
                            </div>
                        );
                    if (turn.kind === 'note')
                        return (
                            <p key={turn.id} className="note" dir="auto">
                                {turn.text}
                            </p>
                        );
                    if (turn.kind === 'wait')
                        return (
                            <div key={turn.id} className="ans wait">
                                <Tag tone="n">{copy.reading}</Tag>
                            </div>
                        );
                    if (turn.kind === 'pick')
                        return (
                            <div key={turn.id} className="ans">
                                <Tag tone="a">{copy.asksFirst}</Tag>
                                <span>{copy.bizQuestion}</span>
                                <div className="pick">
                                    {copy.bizOptions.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className="w-chip"
                                            onClick={() => void ask(copy.bizAsk(option), option)}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                                <small>{copy.bizNote}</small>
                            </div>
                        );
                    if (turn.kind === 'error')
                        return (
                            <FailureCard
                                key={turn.id}
                                failure={turn.failure}
                                text={turn.text}
                                question={turn.shown}
                                onRetry={
                                    turn.failure === 'failed' || turn.failure === 'wait'
                                        ? () => ask(turn.question, turn.shown)
                                        : undefined
                                }
                            />
                        );
                    return (
                        <div key={turn.id} className="ans">
                            <Tag tone="a">
                                {turn.fromPiece ? copy.answeredFromPiece : copy.answered}
                            </Tag>
                            <Markdown>{turn.text}</Markdown>
                            <WritingBlocks blocks={turn.blocks} />
                            {turn.sources.length > 0 && (
                                <div className="sr">
                                    <u>{copy.sources}</u>
                                    {turn.sources.map((s) => (
                                        <span key={`${s.kind}-${s.slug}`} dir="auto">
                                            {s.title}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {showChips && (
                <div className="qs">
                    {chips.map((chip) => (
                        <button
                            key={chip}
                            type="button"
                            className="w-chip"
                            disabled={busy}
                            onClick={() => pickChip(chip)}
                        >
                            {copy.chips[chip]}
                        </button>
                    ))}
                </div>
            )}
            {closed ? (
                <div className="lim-strip">
                    <b>{errors.closed}</b>
                    <ContactActions lead="call" question={lastShown(turns)} />
                </div>
            ) : (
                <form onSubmit={submit}>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={
                            withContext ? copy.placeholder(entry.kind) : copy.placeholderGeneral
                        }
                        aria-label={copy.inputLabel}
                    />
                    <button type="submit" className="snd" disabled={busy}>
                        {copy.send}
                    </button>
                </form>
            )}
            <div className="ts" ref={turnstileRef} />
        </div>
    );
};

export default AskDock;
