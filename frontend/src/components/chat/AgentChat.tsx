import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CHAT } from '@/copy/chat';
import { SHEET_HEADS, SHEETS, SheetKey, sourceTitle } from '@/content/sheets';
import { AnswerRecord, Entry, GREETING_ID, HomeChat } from '@/chat/useHomeChat';
import Markdown from '@/components/Markdown';
import WritingBlocks from '@/components/writing/WritingBlocks';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import FailureCard, { ContactActions } from '@/components/chat/FailureCard';
import HandoffCard from '@/components/chat/HandoffCard';
import LayerHeader from '@/components/chat/LayerHeader';
import { Arrow } from '@/components/site/Arrow';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useLang } from '@/i18n/useLang';
import { useLogFollowsViewport } from '@/hooks/usePhoneLayer';

// The input's placeholder cycles through example questions while it is idle.
const EXAMPLE_EVERY_MS = 2600;

/** A small picture of a sheet, under the answer that opened it. */
const SheetThumb: React.FC<{ map?: boolean }> = ({ map }) =>
    map ? (
        <svg viewBox="0 0 96 60" aria-hidden="true">
            <path
                d="M48 14 22 30M48 14 74 30M22 30 18 48M52 48 18 48"
                stroke="#0C1A44"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                fill="none"
            />
            <g fill="#fff" stroke="#0C1A44" strokeWidth="1.4">
                <rect x="36" y="8" width="24" height="11" rx="2" />
                <rect x="62" y="25" width="24" height="11" rx="2" />
                <rect x="6" y="43" width="24" height="11" rx="2" />
                <rect x="40" y="43" width="24" height="11" rx="2" />
                <rect x="70" y="43" width="20" height="11" rx="2" />
            </g>
            <rect x="10" y="25" width="24" height="11" rx="2" fill="#FFC83D" />
        </svg>
    ) : (
        <svg viewBox="0 0 96 60" aria-hidden="true">
            <path d="M14 44h68" stroke="#0C1A44" strokeWidth="1.4" fill="none" />
            <circle cx="20" cy="44" r="5" fill="#fff" stroke="#0C1A44" strokeWidth="1.4" />
            <circle cx="48" cy="44" r="5" fill="#FFC83D" />
            <circle cx="76" cy="44" r="5" fill="#fff" stroke="#0C1A44" strokeWidth="1.4" />
            <rect
                x="30"
                y="12"
                width="36"
                height="14"
                rx="3"
                fill="#fff"
                stroke="#0C1A44"
                strokeWidth="1.4"
            />
        </svg>
    );

type OnSheet = (sheet: SheetKey, record?: AnswerRecord | null) => void;

/** The drawing made for an answer; it reopens with that answer's own figures. */
/** A small receipt: the link to what happened behind one answer. */
const ReceiptIcon: React.FC = () => (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
            d="M3.5 1.5h9v13l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1z M5.5 5h5 M5.5 8h5 M5.5 11h3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
        />
    </svg>
);

/** Six small dots: the first `lit` done, and the last one when the handoff was offered. */
const Dots: React.FC<{ lit: number; last?: boolean }> = ({ lit, last }) => (
    <span className="td" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} className={i < lit || (i === 5 && last) ? 'a' : undefined} />
        ))}
    </span>
);

/** The phone's waiting bubble: stations one to five as they light, and how long it has been. */
const Working: React.FC<{ plan: { stage: number; elapsed: number } }> = ({ plan }) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const stations = copy.trace.stations.slice(0, 5);
    // Stations two and three complete as the request goes; four is the model.
    const current = Math.min(plan.stage + 1, 3);
    return (
        <div className="m y ai wait pwork">
            <span className="src ag">{copy.phone.working(Math.max(1, plan.elapsed))}</span>
            <ol>
                {stations.map(([title], i) => (
                    <li
                        key={title}
                        className={i < current ? 'done' : i === current ? 'now' : undefined}
                    >
                        <i aria-hidden="true" />
                        <b>{title}</b>
                        {i === current && <em>{copy.trace.now}</em>}
                    </li>
                ))}
            </ol>
            {/* Read out when the station changes, not every second. */}
            <p aria-live="polite">{stations[current][1]}</p>
        </div>
    );
};

/**
 * Beside the chat, the waiting bubble names only the station at work; the
 * full list lights up in the panel next to it.
 */
const WorkingLine: React.FC<{ plan: { stage: number; elapsed: number } }> = ({ plan }) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const [title, sub] = copy.trace.stations[Math.min(plan.stage + 1, 3)];
    return (
        <div className="m y ai wait dwork">
            <span className="src ag">{copy.phone.working(Math.max(1, plan.elapsed))}</span>
            {/* Read out when the station changes, not every second. */}
            <p aria-live="polite">
                <i aria-hidden="true" />
                <b>{title}</b>
                <span>{sub}</span>
            </p>
        </div>
    );
};

const ArtCard: React.FC<{
    sheet: SheetKey;
    record?: AnswerRecord | null;
    onOpen: OnSheet;
    /** Its drawing is the one shown beside the chat right now. */
    shown?: boolean;
}> = ({ sheet, record, onOpen, shown }) => {
    const { t } = useLang();
    const art = t(CHAT).art;
    return (
        <button
            type="button"
            className={shown ? 'art on' : 'art'}
            aria-current={shown || undefined}
            onClick={() => onOpen(sheet, record)}
        >
            <span className="th">
                <SheetThumb map={sheet === 'map'} />
            </span>
            <span>
                <b>{t(SHEET_HEADS)[sheet].title}</b>
                <span className="s">
                    {art.diagram}
                    <span className="vd"> · {shown ? art.shownSide : art.opensSide}</span>
                    <span className="vm"> · {shown ? art.shownBelow : art.opensBelow}</span>
                </span>
            </span>
            <span className="o">
                <span className="o-side">
                    <Arrow>{art.open}</Arrow>
                </span>
                {/* On a phone the diagram rises as a sheet, so its arrow points up. */}
                <span className="o-up">{art.open}&nbsp;↑</span>
            </span>
        </button>
    );
};

const EntryView: React.FC<{
    entry: Entry;
    chat: HomeChat;
    onSheet: OnSheet;
    engage?: () => void;
    /** The visitor chose to keep asking: the offer folds and the input takes focus. */
    onKeep: () => void;
}> = ({ entry, chat, onSheet, engage, onKeep }) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const { openContact } = useSiteDialogs();
    // Beside the chat, the card whose drawing is in the panel is marked.
    const isShown = (sheet: SheetKey, record?: AnswerRecord | null) =>
        !engage &&
        chat.plan.kind === 'sheet' &&
        chat.plan.key === sheet &&
        (chat.sheets.find((s) => s.key === sheet)?.record ?? null) === (record ?? null);

    switch (entry.kind) {
        case 'user':
            return <div className="m u">{entry.text}</div>;
        case 'starters':
            return (
                <div className="m st0">
                    <small>{copy.startHint}</small>
                    <div className="stg">
                        {copy.starters.map((s, i) => (
                            <button
                                key={s.q}
                                type="button"
                                onClick={() => {
                                    engage?.();
                                    chat.pickStarter(i);
                                }}
                            >
                                <b>{s.q}</b>
                                <span>{s.sub}</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 'working':
            // On a phone the stations live here, in the waiting bubble; beside
            // the chat, only the one at work.
            if (chat.plan.kind === 'running')
                return engage ? <Working plan={chat.plan} /> : <WorkingLine plan={chat.plan} />;
            return (
                <div className="m y ai wait">
                    <span className="src ag">{copy.working}</span>
                    {copy.workingNote}
                </div>
            );
        case 'agent':
            return (
                <div className={entry.tag === 'sent' ? 'm y ok' : 'm y'}>
                    {entry.tag === 'ready' && <span className="src">{copy.readyTag}</span>}
                    {entry.tag === 'sent' && <span className="src ok">{copy.sentTag}</span>}
                    {engage && entry.id === GREETING_ID ? copy.phone.greeting : entry.text}
                    {entry.sheet && (
                        <ArtCard
                            sheet={entry.sheet}
                            onOpen={onSheet}
                            shown={isShown(entry.sheet)}
                        />
                    )}
                </div>
            );
        case 'answer': {
            const record = entry.record;
            const answer = (
                <div className="m y ai">
                    {entry.fromIndex ? (
                        <span className="src">{copy.readyTag}</span>
                    ) : (
                        <span className="src ag">
                            {copy.answered}
                            {record && ` · ${record.seconds} ${copy.seconds}`}
                        </span>
                    )}
                    <Markdown>{entry.text}</Markdown>
                    <WritingBlocks blocks={entry.blocks} />
                    {entry.sheet === 'price' && (
                        <button
                            type="button"
                            className="cta"
                            onClick={() =>
                                openContact({ kind: 'call', topic: t(SHEETS).price.topic })
                            }
                        >
                            {copy.book}
                        </button>
                    )}
                    {entry.sheet && (
                        <ArtCard
                            sheet={entry.sheet}
                            record={record}
                            onOpen={onSheet}
                            shown={isShown(entry.sheet, record)}
                        />
                    )}
                    {record && (
                        <div className="rc">
                            <u>{copy.sources}</u>
                            {/* What the answer drew on when the model said so;
                                otherwise what it was sent. */}
                            {(record.used ?? record.sources).length ? (
                                (record.used ?? record.sources).map((s) => (
                                    <span key={`${s.kind}-${s.slug}`}>
                                        {sourceTitle(s, t(SHEETS).read)}
                                    </span>
                                ))
                            ) : (
                                <span>{record.used ? copy.fromNotes : copy.noSource}</span>
                            )}
                        </div>
                    )}
                    {/* Every answer the model wrote ends with its stations and the
                        way to its receipt; a ready answer has neither. */}
                    {record && !entry.fromIndex && (
                        <button
                            type="button"
                            className="ptrail"
                            onClick={() => onSheet('read', record)}
                        >
                            <Dots lit={5} last={record.handoff} />
                            <span>
                                {record.sources.length
                                    ? copy.plan.trail(record.sources.length, record.seconds)
                                    : copy.plan.trailNone(record.seconds)}
                            </span>
                            <u>
                                <ReceiptIcon />
                                {copy.behind}
                            </u>
                        </button>
                    )}
                </div>
            );
            if (!entry.handoff) return answer;
            return (
                <>
                    {answer}
                    <HandoffCard
                        handoff={entry.handoff}
                        onKeep={entry.handoff.reason === 'last_answer' ? undefined : onKeep}
                    />
                </>
            );
        }
        case 'summary': {
            const c = copy.compare;
            const name = copy.processes[entry.process].name;
            return (
                <div className="m card">
                    <b>{c.cardTitle}</b>
                    <div>
                        <span>{c.process}</span>
                        <span>{name}</span>
                    </div>
                    <div>
                        <span>{c.handledBy}</span>
                        <span>{entry.team}</span>
                    </div>
                    <div>
                        <span>{c.interested}</span>
                        <span>{c.interestedValue}</span>
                    </div>
                    <button
                        type="button"
                        className="cta"
                        onClick={() =>
                            openContact({
                                kind: 'call',
                                topic: name,
                                message: `${c.handledBy}: ${entry.team}`,
                            })
                        }
                    >
                        {c.book}
                    </button>
                </div>
            );
        }
        case 'error':
            return (
                <FailureCard
                    failure={entry.failure}
                    text={entry.text}
                    question={entry.question}
                    onRetry={
                        entry.failure === 'failed' || entry.failure === 'wait'
                            ? () => chat.retry(entry.question)
                            : undefined
                    }
                />
            );
    }
};

/**
 * How the chat behaves on a phone, where it opens as a full-screen layer.
 * Absent on wider screens, where it stays a panel beside the drawing.
 */
/** On a computer, once a question is asked: the chat at full height, and the way back. */
export interface ChatSize {
    grown: boolean;
    toggle: () => void;
}

export interface PhoneLayer {
    /** The chat is open as the full-screen layer. */
    full: boolean;
    /** A starter, the input or a send: the visitor is starting to talk. */
    engage: () => void;
    close: () => void;
    /** A diagram card under an answer was tapped. */
    showSheet: OnSheet;
    /** The teaser row was tapped: the six stations, in the sheet. */
    showHow: () => void;
}

/** The latest question that got no answer, carried into the contact window. */
const lastUnanswered = (entries: Entry[]): string => {
    for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        if (e.kind === 'error') return e.question;
        if (e.kind === 'user') return e.text;
    }
    return '';
};

// Visible height under which the open layer drops its suggestion chips.
const SHORT_VIEW_PX = 480;

/*
 * The chat side of the hero: the conversation, the suggestions under it and
 * the input. What happens on each action is decided in `useHomeChat`; this
 * only draws it. On a phone it is also the full-screen layer, and `children`
 * (the diagram sheet) opens over it.
 */
const AgentChat: React.FC<{
    chat: HomeChat;
    turnstileRef: React.RefObject<HTMLDivElement | null>;
    phone?: PhoneLayer;
    rootRef?: React.RefObject<HTMLDivElement | null>;
    /** The "continue" entry on the page, where focus goes back on close. */
    resumeRef?: React.RefObject<HTMLButtonElement | null>;
    /** Set on a computer once the chat can grow (see HeroSection). */
    size?: ChatSize;
    children?: React.ReactNode;
}> = ({ chat, turnstileRef, phone, rootRef, resumeRef, size, children }) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const logRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const keysRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState('');
    const [example, setExample] = useState(-1);
    const stillMotion = useMediaQuery(REDUCED_MOTION_QUERY);

    // New lines scroll the log, never the page.
    // Measured after layout, and again a frame later for content that settles late.
    useLayoutEffect(() => {
        const log = logRef.current;
        if (!log) return;
        const toEnd = () => {
            const end = log.scrollHeight - log.clientHeight;
            const hand = log.querySelector<HTMLElement>('.hand:last-child');
            // An offer that fits shows whole, so every route to Yanir is in view
            // and the end of the answer fills what room is left above it. One
            // taller than the pane starts at its title instead.
            // At full height a new answer is read from its first line, at the top of the log.
            const last = chat.entries[chat.entries.length - 1];
            const answers = log.querySelectorAll<HTMLElement>('.m.y.ai');
            if (size?.grown && last?.kind === 'answer' && answers.length) {
                const top =
                    answers[answers.length - 1].getBoundingClientRect().top -
                    log.getBoundingClientRect().top +
                    log.scrollTop -
                    8;
                return void (log.scrollTop = Math.min(end, Math.max(0, top)));
            }
            if (!hand || hand.offsetHeight <= log.clientHeight) return void (log.scrollTop = end);
            const above = hand.getBoundingClientRect().top - log.getBoundingClientRect().top;
            log.scrollTop = Math.min(end, log.scrollTop + above - 12);
        };
        toEnd();
        const frame = requestAnimationFrame(toEnd);
        return () => cancelAnimationFrame(frame);
        // Only a new entry moves the log; growing or shrinking leaves it where it is.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat.entries]);

    useEffect(() => {
        if (stillMotion) return;
        const timer = window.setInterval(() => {
            if (document.activeElement !== inputRef.current) setExample((i) => i + 1);
        }, EXAMPLE_EVERY_MS);
        return () => window.clearInterval(timer);
    }, [stillMotion]);

    // Asked for an address: the input says so and takes focus.
    useEffect(() => {
        if (chat.awaitingEmail) inputRef.current?.focus({ preventScroll: true });
    }, [chat.awaitingEmail]);

    const full = !!phone?.full;

    const keepAsking = () => {
        chat.keepAsking();
        inputRef.current?.focus({ preventScroll: true });
    };

    // On a phone the card's input is a button that opens the layer. Focusing a
    // real input on the page would make the browser scroll the page to it
    // above the keyboard, before the layer is even drawn. Instead the tap
    // focuses `keys`, a hidden input pinned to the top of the screen: the
    // keyboard opens without moving anything (and iOS opens it only inside
    // the tap). Once the layer is up, the focus moves on to the layer's input.
    const openToType = () => {
        keysRef.current?.focus({ preventScroll: true });
        phone?.engage();
    };
    useLayoutEffect(() => {
        if (full && document.activeElement === keysRef.current) {
            inputRef.current?.focus({ preventScroll: true });
        }
    }, [full]);

    // The keyboard opening or closing changes the visible height: keep the
    // newest message in view, and note when little room is left.
    const short = useLogFollowsViewport(logRef, full, SHORT_VIEW_PX);
    // Above the keyboard on a short screen, or once typing has started, the
    // suggestions give their room to the conversation.
    // On the phone layer a failure card already offers the next steps, and the
    // chips under it would push the input off a short screen.
    const failureShown = chat.entries[chat.entries.length - 1]?.kind === 'error';
    // Under an open offer to talk directly the next step is the visitor's
    // choice between the offer and the input; the chips return once they
    // choose to keep asking.
    const hideChips =
        chat.closed || chat.handoffOpen || (full && (short || text.trim() !== '' || failureShown));

    // When the question is already known, only the address is missing.
    const placeholder = chat.awaitingEmail
        ? chat.awaitingEmail === 'ask'
            ? copy.emailPlaceholderMore
            : copy.emailPlaceholder
        : example < 0
          ? copy.placeholder
          : copy.examplePrefix + copy.examples[example % copy.examples.length];

    // "live" once a question has been asked: on a phone the chat starts
    // compact and opens to its full height from then on.
    const live = chat.entries.some((e) => e.kind === 'user');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || chat.busy) return;
        phone?.engage();
        chat.submit(text);
        setText('');
    };

    const lastQuestion = [...chat.entries].reverse().find((e) => e.kind === 'user');
    const lastAnswer = [...chat.entries].reverse().find((e) => e.kind === 'answer');
    // The opening of the last answer, as plain text, on the "continue" entry.
    const answerPeek =
        lastAnswer?.kind === 'answer'
            ? lastAnswer.text.replace(/[*_#>`[\]]/g, '').slice(0, 220)
            : '';
    const classes = ['chat', live && 'live', phone && 'phone', full && 'full']
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={classes}
            ref={rootRef}
            aria-label={copy.panelLabel}
            role={full ? 'dialog' : undefined}
            tabIndex={full ? -1 : undefined}
            aria-modal={full ? true : undefined}
        >
            <LayerHeader onClose={full ? phone?.close : undefined}>
                {size && live ? (
                    <button type="button" className="btn sm line sz" onClick={size.toggle}>
                        {size.grown ? copy.smaller : copy.larger}
                    </button>
                ) : (
                    <span className="kk">{copy.step1}</span>
                )}
            </LayerHeader>
            {phone && !full && live && (
                <button type="button" className="resume" ref={resumeRef} onClick={phone.engage}>
                    {lastQuestion?.kind === 'user' && <small>{lastQuestion.text}</small>}
                    {answerPeek && <span>{answerPeek}</span>}
                    <b>
                        <Arrow>{copy.phone.resume}</Arrow>
                    </b>
                </button>
            )}
            <div className="log" id="log" aria-live="polite" ref={logRef}>
                {chat.offline && <div className="m y">{copy.offline}</div>}
                {chat.entries.map((entry) => (
                    <EntryView
                        key={entry.id}
                        entry={entry}
                        chat={chat}
                        onSheet={phone ? phone.showSheet : chat.openSheet}
                        engage={phone?.engage}
                        onKeep={keepAsking}
                    />
                ))}
            </div>
            {phone && !live && (
                <button type="button" className="tz" onClick={phone.showHow}>
                    <Dots lit={0} />
                    <span>
                        {copy.phone.teaser} <u>{copy.phone.howLink}</u>
                    </span>
                </button>
            )}
            <div
                className="qr one"
                hidden={hideChips}
                data-l={chat.quick.label}
                aria-label={copy.suggestionsLabel}
            >
                {chat.quick.items.map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        className={item.kind === 'ask' ? 'ai' : undefined}
                        disabled={chat.busy}
                        onClick={() => chat.pickQuick(item)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            {phone && (
                <input
                    ref={keysRef}
                    className="keys"
                    type="text"
                    tabIndex={-1}
                    aria-hidden="true"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
            )}
            {chat.closed || chat.offline ? (
                // Nothing typed can be answered now, so the input row becomes
                // the routes to Yanir. Only these two states: a single failed
                // send or a short wait keeps the input, because asking again
                // can still work.
                <div className="lim-strip">
                    <b>{chat.closed ? copy.errors.closed : copy.errors.direct}</b>
                    <ContactActions lead="call" question={lastUnanswered(chat.entries)} />
                </div>
            ) : phone && !full ? (
                <div className="inp">
                    <button
                        type="button"
                        className="inp-tap"
                        aria-label={copy.inputLabel}
                        onClick={openToType}
                    >
                        <span>{placeholder}</span>
                        <b className="btn sm" aria-hidden="true">
                            {copy.send}
                        </b>
                    </button>
                </div>
            ) : (
                <form className="inp" onSubmit={submit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={placeholder}
                        aria-label={copy.inputLabel}
                    />
                    <button className="btn sm" type="submit" disabled={chat.busy}>
                        {copy.send}
                    </button>
                </form>
            )}
            <div className="ts" ref={turnstileRef} />
            {children}
        </div>
    );
};

export default AgentChat;
