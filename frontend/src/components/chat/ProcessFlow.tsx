import React from 'react';
import { CHAT, Process } from '@/copy/chat';
import { useLang } from '@/i18n/useLang';

/** How one station is drawn right now. Anything left out keeps the process's own text. */
export interface StationState {
    state?: 'done' | 'act' | 'skip' | 'ready';
    /** The line into this station is lit. */
    go?: boolean;
    who?: string;
    title?: string;
    note?: React.ReactNode;
    time?: string;
}

interface Props {
    process: Process;
    /** 'agent' draws the process with an agent; 'today' as a person does it. */
    mode: 'agent' | 'today';
    /** Stations as they run; when given, the flow is drawn live. */
    stations?: StationState[];
    id?: string;
}

/*
 * Five stations down one line: the notation every process on the page is
 * drawn in, from the site's own chat to the visitor's "today and with an agent".
 */
const ProcessFlow: React.FC<Props> = ({ process, mode, stations, id }) => {
    const { t } = useLang();
    const labels = t(CHAT).plan;
    const withAgent = mode === 'agent';

    return (
        <ol
            className={stations ? 'vflow live' : 'vflow'}
            id={id}
            aria-live={id ? 'polite' : undefined}
        >
            {process.steps.map((step, i) => {
                const byAgent = withAgent && step.byAgent;
                const [title, note] = withAgent ? step.agent : step.person;
                const live = stations?.[i] ?? {};
                const cls = [
                    'step',
                    byAgent && 'agent',
                    !withAgent && step.byAgent && 'pain',
                    live.state,
                    live.state === 'ready' && 'done',
                ]
                    .filter(Boolean)
                    .join(' ');
                return (
                    <li key={i} className={live.go ? 'go' : undefined}>
                        <div className={cls}>
                            <span className="who">
                                {live.who ?? (byAgent ? labels.agent : labels.person)}
                            </span>
                            <div className="tx">
                                <b>{live.title ?? title}</b>
                                <span className="n">{live.note ?? note}</span>
                            </div>
                            <span className="tm">{live.time}</span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

export default ProcessFlow;
