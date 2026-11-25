import React, { useEffect, useRef } from 'react';
import { CHAT } from '@/copy/chat';
import { SHEET_HEADS } from '@/content/sheets';
import { HomeChat } from '@/chat/useHomeChat';
import ProcessFlow from '@/components/chat/ProcessFlow';
import AnswerTrace, { TraceStation } from '@/components/chat/AnswerTrace';
import SystemsMap from '@/components/chat/SystemsMap';
import { SheetBody } from '@/components/chat/sheets/Sheets';
import { Arrow } from '@/components/site/Arrow';
import { REDUCED_MOTION_QUERY, STACKED_QUERY } from '@/hooks/useMediaQuery';
import { useLang } from '@/i18n/useLang';

// The station that calls the model; the ones before it complete as the request goes.
const MODEL_STATION = 3;
const STATIONS = 6;
// A step shorter than this shows no time: it was not something to wait for.
const SHOWN_FROM_MS = 1000;

/** "9 seconds from question to answer, from 3 documents.", the figures in bold. */
const AfterLine: React.FC<{ parts: [string, string, string] }> = ({ parts }) => (
    <>
        <b>{parts[0]}</b>
        {parts[1]}
        <b>{parts[2]}</b>
    </>
);

/*
 * The drawing beside the chat. Everything on it follows from `chat.plan`:
 * the six stations of the site's own chat (lit as a request runs, then with
 * the figures the backend measured), or a sheet made for the answer, or the
 * visitor's process today and with an agent. A sheet opened earlier is
 * reopened from the card under the answer that made it.
 *
 * On a phone it is drawn twice: the static explainer under the chat on the
 * page, and the live drawing inside the sheet that rises over the open chat
 * (`onClose` set), with its own close button and a way back to the chat.
 */
const AnswerPlan: React.FC<{
    chat: HomeChat;
    onClose?: () => void;
    /** The second copy on the page: no element ids, which the live one owns. */
    idless?: boolean;
}> = ({ chat, onClose, idless }) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const heads = t(SHEET_HEADS);
    const plan = chat.plan;
    const ref = useRef<HTMLDivElement>(null);
    // On a stacked layout a newly opened drawing is scrolled to, since it opens below the chat.
    useEffect(() => {
        if (onClose) return;
        const opened =
            plan.kind === 'sheet' || plan.kind === 'cmp' || (plan.kind === 'lit' && plan.back);
        if (!opened || !window.matchMedia(STACKED_QUERY).matches) return;
        const smooth = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
        ref.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }, [plan, onClose]);

    const id = (name: string) => (idless ? undefined : name);
    const trace = copy.trace;
    const seconds = (n: number) => `${n} ${copy.secondsShort}`;
    const waiting = (): TraceStation[] =>
        Array.from({ length: STATIONS }, () => ({ state: 'wait' as const }));

    // Each station as the current plan has it; the footer says the same in words.
    const stations = waiting();
    let foot: React.ReactNode = trace.foot.before;
    if (plan.kind === 'running') {
        stations[0] = { state: 'done' };
        if (plan.stage >= 1) stations[1] = { state: 'done' };
        if (plan.stage >= 2) stations[2] = { state: 'done' };
        if (plan.stage >= MODEL_STATION)
            stations[MODEL_STATION] = {
                state: 'now',
                tag: trace.now,
                time: seconds(plan.elapsed),
                bar: true,
            };
        foot = trace.foot.waiting;
    } else if (plan.kind === 'lit') {
        const record = plan.record;
        const ms = record.trace?.latency_ms ?? record.seconds * 1000;
        for (let i = 0; i < 5; i++) stations[i] = { state: 'done' };
        if (ms >= SHOWN_FROM_MS) stations[MODEL_STATION].time = seconds(record.seconds);
        if (record.handoff || chat.handoffOffered) stations[5] = { state: 'done' };
        foot = record.declined ? (
            trace.foot.declined
        ) : (
            <AfterLine parts={trace.foot.after(record.seconds, record.sources.length)} />
        );
    } else if (plan.kind === 'ready') {
        stations[0] = { state: 'done' };
        for (let i = 1; i < 5; i++) stations[i] = { state: 'skip', note: copy.plan.ready.skipNote };
        foot = trace.foot.ready;
    } else {
        // Before any question: the first station is where to start.
        stations[0] = { state: 'now', tag: trace.start };
    }

    // Header, caption and summary for the current view.
    let kicker = copy.plan.step2;
    let title = copy.plan.base.title;
    let cap = copy.plan.base.cap;
    // The phone's sheet, opened before any question, says why the stations are shown.
    const sum: [string, React.ReactNode] =
        plan.kind === 'base' && onClose ? [copy.plan.base.sumH, copy.plan.base.sumT] : ['', foot];
    let mode = '';
    const current = plan.kind === 'sheet' ? chat.sheets.find((s) => s.key === plan.key) : undefined;

    if (plan.kind === 'running') {
        title = copy.plan.running.title;
        cap = copy.plan.running.cap;
    } else if (plan.kind === 'lit') {
        if (plan.back) {
            kicker = copy.plan.lit.kicker;
            title = copy.plan.lit.title;
            cap = copy.plan.lit.cap;
        } else {
            title = copy.plan.running.title;
            cap = copy.plan.running.cap;
        }
    } else if (plan.kind === 'ready') {
        title = copy.plan.ready.title;
        cap = copy.plan.ready.cap;
    } else if (plan.kind === 'sheet') {
        kicker = copy.plan.fromAnswer;
        title = heads[plan.key].title;
        cap = heads[plan.key].cap;
        // The receipt names the question it is about.
        if (plan.key === 'read' && current?.record) cap = copy.plan.about(current.record.question);
        mode = plan.key === 'map' ? 'showmap' : 'showvis';
    } else if (plan.kind === 'cmp') {
        kicker = copy.plan.fromChat;
        title = copy.processes[plan.process].name + copy.plan.cmpTitle;
        cap = copy.plan.cmpCap;
        mode = 'showcmp';
    }

    const record = current?.record;

    return (
        <div className={mode ? `plan ${mode}` : 'plan'} id={id('plan')} ref={ref}>
            <div className="ph">
                <div className="pt">
                    <small id={id('pt-k')}>{kicker}</small>
                    <b id={id('pt-h')}>{title}</b>
                </div>
                {onClose && (
                    <button
                        type="button"
                        className="x"
                        aria-label={copy.phone.closeSheet}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className="cap" id={id('cap')}>
                {cap}
            </div>
            {plan.kind === 'sheet' && record && (
                <button type="button" className="trail" onClick={() => chat.showPath(plan.key)}>
                    <span className="td">
                        {/* Five stations always run; the sixth only when Yanir was offered. */}
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <i key={i} className={i < 5 || record.handoff ? 'a' : undefined} />
                        ))}
                    </span>
                    <span>
                        {record.sources.length
                            ? copy.plan.trail(record.sources.length, record.seconds)
                            : copy.plan.trailNone(record.seconds)}
                    </span>
                    <b>
                        <Arrow>{copy.plan.trailOpen}</Arrow>
                    </b>
                </button>
            )}
            <AnswerTrace stations={stations} id={id('flow')} />
            <div className="cmp" id={id('cmp')} aria-live="polite">
                {plan.kind === 'cmp' && (
                    <>
                        <div className="cc">
                            <h4>
                                <span>{copy.plan.today}</span>
                            </h4>
                            <ProcessFlow process={copy.processes[plan.process]} mode="today" />
                            <p>{copy.processes[plan.process].today}</p>
                        </div>
                        <div className="cc on">
                            <h4>
                                <span>{copy.plan.withAgent}</span>
                            </h4>
                            <ProcessFlow process={copy.processes[plan.process]} mode="agent" />
                            <p>{copy.processes[plan.process].withAgent}</p>
                        </div>
                    </>
                )}
            </div>
            <div className="map" id={id('map')}>
                {plan.kind === 'sheet' && plan.key === 'map' && <SystemsMap />}
            </div>
            <div className="vis" id={id('vis')} aria-live="polite">
                {plan.kind === 'sheet' && plan.key !== 'map' && (
                    <SheetBody
                        key={plan.key}
                        sheet={plan.key}
                        record={record}
                        letter={current?.letter}
                        onMailChat={chat.mailFromChat}
                    />
                )}
            </div>
            <div className="sum">
                {sum[0] && <b id={id('sum-h')}>{sum[0]}</b>}
                <span id={id('sum-t')}>{sum[1]}</span>
            </div>
            {plan.kind === 'lit' && plan.back && (
                <button type="button" className="bk" onClick={() => chat.showSheet(plan.back!)}>
                    <Arrow>{copy.plan.back}</Arrow>
                </button>
            )}
            {onClose && (
                <div className="sf">
                    <button type="button" className="btn" onClick={onClose}>
                        {copy.phone.backToChat}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AnswerPlan;
