import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CHAT } from '@/copy/chat';
import { SHEET_HEADS, SHEETS, SheetKey } from '@/content/sheets';
import { Entry, GREETING_ID, HomeChat } from '@/chat/useHomeChat';
import Markdown from '@/components/Markdown';
import WritingBlocks from '@/components/writing/WritingBlocks';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { Arrow } from '@/components/site/Arrow';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useLang } from '@/i18n/useLang';

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

const ArtCard: React.FC<{ sheet: SheetKey; onOpen: (sheet: SheetKey) => void }> = ({
    sheet,
    onOpen,
}) => {
    const { t } = useLang();
    const art = t(CHAT).art;
    return (
        <button type="button" className="art" onClick={() => onOpen(sheet)}>
            <span className="th">
                <SheetThumb map={sheet === 'map'} />
            </span>
            <span>
                <b>{t(SHEET_HEADS)[sheet].title}</b>
                <span className="s">
                    {art.diagram}
                    <span className="vd"> · {art.opensSide}</span>
                    <span className="vm"> · {art.opensBelow}</span>
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
    onSheet: (sheet: SheetKey) => void;
    engage?: () => void;
}> = ({ entry, chat, onSheet, engage }) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const { openContact } = useSiteDialogs();

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
                    {entry.sheet && <ArtCard sheet={entry.sheet} onOpen={onSheet} />}
                </div>
            );
        case 'answer': {
            const record = entry.record;
            return (
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
                    {entry.sheet && <ArtCard sheet={entry.sheet} onOpen={onSheet} />}
                    {record && (
                        <div className="rc">
                            <u>{copy.sources}</u>
                            {record.sources.length ? (
                                record.sources.map((s) => (
                                    <span key={`${s.kind}-${s.slug}`}>{s.title}</span>
                                ))
                            ) : (
                                <span>{copy.noSource}</span>
                            )}
                        </div>
                    )}
                </div>
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
            return <div className="m y">{entry.text}</div>;
    }
};

/**
 * How the chat behaves on a phone, where it opens as a full-screen layer.
 * Absent on wider screens, where it stays a panel beside the drawing.
 */
export interface PhoneLayer {
    /** The chat is open as the full-screen layer. */
    full: boolean;
    /** A starter, the input or a send: the visitor is starting to talk. */
    engage: () => void;
    close: () => void;
    /** A diagram card under an answer was tapped. */
    showSheet: (sheet: SheetKey) => void;
}

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
    children?: React.ReactNode;
}> = ({ chat, turnstileRef, phone, rootRef, resumeRef, children }) => {
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
        const toEnd = () => (log.scrollTop = log.scrollHeight);
        toEnd();
        const frame = requestAnimationFrame(toEnd);
        return () => cancelAnimationFrame(frame);
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
    const [short, setShort] = useState(false);
    useEffect(() => {
        const vv = window.visualViewport;
        const log = logRef.current;
        if (!full || !vv || !log) return;
        const onResize = () => {
            setShort(vv.height < SHORT_VIEW_PX);
            // A frame later, once the layer has taken the new height.
            requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
        };
        onResize();
        vv.addEventListener('resize', onResize);
        return () => {
            vv.removeEventListener('resize', onResize);
            setShort(false);
        };
    }, [full]);
    // Above the keyboard on a short screen, or once typing has started, the
    // suggestions give their room to the conversation.
    const hideChips = full && (short || text.trim() !== '');

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
            <div className="ph">
                <span className="who2">
                    <i className="dot" />
                    {copy.who} <small>{copy.whoNote}</small>
                </span>
                <span className="kk">{copy.step1}</span>
                {full && (
                    <button
                        type="button"
                        className="x"
                        aria-label={copy.phone.close}
                        onClick={phone?.close}
                    >
                        ✕
                    </button>
                )}
            </div>
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
                    />
                ))}
            </div>
            {phone && !live && (
                <div className="tz">
                    <span className="td" aria-hidden="true">
                        <i />
                        <i className="a" />
                        <i className="a" />
                        <i className="a" />
                        <i />
                    </span>
                    <span>{copy.phone.teaser}</span>
                </div>
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
            {phone && !full ? (
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
