import React, { useEffect, useRef, useState } from 'react';
import { CHAT } from '@/copy/chat';
import { SHEET_HEADS } from '@/content/sheets';
import { AnswerRecord, HomeChat } from '@/chat/useHomeChat';
import ProcessFlow, { StationState } from '@/components/chat/ProcessFlow';
import SystemsMap from '@/components/chat/SystemsMap';
import { SheetBody } from '@/components/chat/sheets/Sheets';
import { Arrow } from '@/components/site/Arrow';
import { REDUCED_MOTION_QUERY, STACKED_QUERY } from '@/hooks/useMediaQuery';
import { useLang } from '@/i18n/useLang';

// The station that calls the model; the ones before it are instant.
const MODEL_STATION = 3;
const LAST_STATION = 4;

/*
 * The drawing beside the chat. Everything on it follows from `chat.plan`:
 * the five stations of the site's own chat (lit as a request runs, then with
 * the figures the backend measured), or a sheet made for the answer, or the
 * visitor's process today and with an agent. A sheet opened earlier is
 * reopened from the card under the answer that made it.
 */
const AnswerPlan: React.FC<{ chat: HomeChat }> = ({ chat }) => {
    const { t } = useLang();
    const copy = t(CHAT);
    const heads = t(SHEET_HEADS);
    const plan = chat.plan;
    const ref = useRef<HTMLDivElement>(null);
    // The view belongs to the sheet it was chosen on; a new sheet starts in the technical one.
    const [chosen, setChosen] = useState<{ plan: typeof plan; view: 'tech' | 'plain' } | null>(
        null
    );
    const view = chosen?.plan === plan ? chosen.view : 'tech';
    const setView = (next: 'tech' | 'plain') => setChosen({ plan, view: next });

    // On a stacked layout a newly opened drawing is scrolled to, since it opens below the chat.
    useEffect(() => {
        const opened =
            plan.kind === 'sheet' || plan.kind === 'cmp' || (plan.kind === 'lit' && plan.back);
        if (!opened || !window.matchMedia(STACKED_QUERY).matches) return;
        const smooth = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
        ref.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }, [plan]);

    const docsNote = (record: AnswerRecord) =>
        record.sources.length ? (
            <>
                {copy.plan.docsOf(
                    record.sources.length,
                    Math.max(record.available, record.sources.length)
                )}
                <span className="docs">
                    {record.sources.map((s) => (
                        <i key={`${s.kind}-${s.slug}`}>{s.title}</i>
                    ))}
                </span>
            </>
        ) : (
            copy.plan.noDocs
        );

    const seconds = (n: number) => `${n} ${copy.secondsShort}`;
    const instant = { state: 'done' as const, go: true, time: copy.plan.instant };

    let stations: StationState[] | undefined;
    if (plan.kind === 'running') {
        stations = [{ state: 'done' }];
        if (plan.stage >= 1) stations[1] = { ...instant, note: copy.plan.checked };
        if (plan.stage >= 2) stations[2] = { ...instant };
        if (plan.stage >= MODEL_STATION)
            stations[MODEL_STATION] = {
                state: 'act',
                go: true,
                time: seconds(Math.max(1, plan.elapsed)),
            };
    } else if (plan.kind === 'lit') {
        stations = [
            { state: 'done' },
            { ...instant, note: copy.plan.checked },
            { ...instant, note: docsNote(plan.record) },
            {
                state: 'done',
                go: true,
                time: seconds(plan.record.seconds),
                note: copy.plan.modelNote,
            },
            { state: 'done', go: true },
        ];
    } else if (plan.kind === 'ready') {
        const skip = {
            state: 'skip' as const,
            who: copy.plan.ready.skipped,
            note: copy.plan.ready.skipNote,
        };
        stations = [{ state: 'done' }, skip, skip, skip];
        stations[LAST_STATION] = {
            state: 'ready',
            go: true,
            who: copy.plan.ready.who,
            title: copy.plan.ready.done,
            note: copy.plan.ready.note,
            time: copy.plan.instant,
        };
    }

    // Header, caption and summary for the current view.
    let kicker = copy.plan.step2;
    let title = copy.plan.base.title;
    let cap = copy.plan.base.cap;
    let sum: [string, string] = [copy.plan.base.sumH, copy.plan.base.sumT];
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
        const n = plan.record.sources.length;
        sum = [copy.plan.sumH, plan.record.declined ? copy.plan.sumDeclined : copy.plan.sumFrom(n)];
    } else if (plan.kind === 'ready') {
        title = copy.plan.ready.title;
        cap = copy.plan.ready.cap;
        sum = [copy.plan.sumH, copy.plan.ready.sum];
    } else if (plan.kind === 'sheet') {
        kicker = copy.plan.fromAnswer;
        title = heads[plan.key].title;
        cap = heads[plan.key].cap;
        mode = plan.key === 'map' ? 'showmap' : 'showvis';
    } else if (plan.kind === 'cmp') {
        kicker = copy.plan.fromChat;
        title = copy.processes[plan.process].name + copy.plan.cmpTitle;
        cap = copy.plan.cmpCap;
        mode = 'showcmp';
    }

    const record = current?.record;

    return (
        <div className={mode ? `plan ${mode}` : 'plan'} id="plan" ref={ref}>
            <div className="ph">
                <div className="pt">
                    <small id="pt-k">{kicker}</small>
                    <b id="pt-h">{title}</b>
                </div>
            </div>
            <div className="cap" id="cap">
                {cap}
            </div>
            {plan.kind === 'sheet' && record && (
                <button type="button" className="trail" onClick={() => chat.showPath(plan.key)}>
                    <span className="td">
                        <i />
                        <i className="a" />
                        <i className="a" />
                        <i className="a" />
                        <i />
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
            <ProcessFlow process={copy.site} mode="agent" stations={stations} id="flow" />
            <div className="cmp" id="cmp" aria-live="polite">
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
            <div className="map" id="map">
                {plan.kind === 'sheet' && plan.key === 'map' && <SystemsMap />}
            </div>
            <div
                className="vis"
                id="vis"
                aria-live="polite"
                data-view={view === 'plain' ? 'plain' : undefined}
            >
                {plan.kind === 'sheet' && plan.key !== 'map' && (
                    <SheetBody
                        key={plan.key}
                        sheet={plan.key}
                        record={record}
                        letter={current?.letter}
                        view={view}
                        onView={setView}
                        onMailChat={chat.mailFromChat}
                    />
                )}
            </div>
            <div className="sum">
                <b id="sum-h">{sum[0]}</b>
                <span id="sum-t">{sum[1]}</span>
            </div>
            {plan.kind === 'lit' && plan.back && (
                <button type="button" className="bk" onClick={() => chat.showSheet(plan.back!)}>
                    <Arrow>{copy.plan.back}</Arrow>
                </button>
            )}
        </div>
    );
};

export default AnswerPlan;
