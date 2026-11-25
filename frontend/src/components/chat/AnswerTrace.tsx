import React from 'react';
import { CHAT } from '@/copy/chat';
import { useLang } from '@/i18n/useLang';

export type TraceState = 'wait' | 'now' | 'done' | 'skip';

/** How one station is drawn right now. */
export interface TraceStation {
    state: TraceState;
    /** A small amber tag on the side: "now", or "start here" before any question. */
    tag?: string;
    /** On the side: a running counter, or the time a step took. */
    time?: string;
    /** Replaces the station's own sub-line. */
    note?: React.ReactNode;
    /** A thin bar under the sub-line while the station is working. */
    bar?: boolean;
}

/*
 * The six stations of the site's chat, down one line. Waiting stations are
 * hollow on a dashed line; the one at work is amber with a ring; finished
 * ones are ink with a check, joined by a solid line.
 */
const AnswerTrace: React.FC<{ stations: TraceStation[]; id?: string }> = ({ stations, id }) => {
    const { t } = useLang();
    const copy = t(CHAT).trace;
    return (
        <ol className="atr" id={id} aria-live={id ? 'polite' : undefined}>
            {copy.stations.map(([title, sub], i) => {
                const s = stations[i] ?? { state: 'wait' };
                return (
                    <li key={title} className={s.state}>
                        <i className="pt" aria-hidden="true" />
                        <div className="tx">
                            <b>{title}</b>
                            <span>{s.note ?? sub}</span>
                            {s.bar && <u className="bar" aria-hidden="true" />}
                        </div>
                        {(s.tag || s.time) && (
                            <span className="side">
                                {s.tag && <em>{s.tag}</em>}
                                {/* A running counter is not read out every second. */}
                                {s.time && (
                                    <time aria-hidden={s.state === 'now' || undefined}>
                                        {s.time}
                                    </time>
                                )}
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
};

export default AnswerTrace;
