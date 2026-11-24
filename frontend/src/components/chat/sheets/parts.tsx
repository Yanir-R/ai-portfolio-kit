import React, { useEffect, useRef } from 'react';
import { ContactKind } from '@/copy/site';
import { PERSONAKIT_LINKS, SHEETS } from '@/content/sheets';
import { LINKS } from '@/constants/links';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { REDUCED_MOTION_QUERY } from '@/hooks/useMediaQuery';
import { useLang } from '@/i18n/useLang';

/** personakit.me and its docs, the pair every mention of PersonaKit carries. */
export const PersonaKitLinks: React.FC = () => {
    const { t } = useLang();
    const label = t(PERSONAKIT_LINKS);
    return (
        <span className="lk">
            <a href={LINKS.personakit} target="_blank" rel="noopener">
                {label.site}
            </a>
            <a href={LINKS.personakitDocs} target="_blank" rel="noopener">
                {label.docs}
            </a>
        </span>
    );
};

/** A button on a sheet that opens the contact window in place, with the subject carried along. */
export const TalkButton: React.FC<{
    label: string;
    kind?: ContactKind;
    topic?: string;
    pref?: string;
    line?: boolean;
}> = ({ label, kind = 'call', topic, pref, line }) => {
    const { openContact } = useSiteDialogs();
    return (
        <button
            type="button"
            className={line ? 'btn sm line' : 'btn sm'}
            onClick={() => openContact({ kind, topic, pref })}
        >
            {label}
        </button>
    );
};

const Waiting: React.FC<{ text: string }> = ({ text }) => (
    <span className="wt">
        {text}
        <i />
        <i />
        <i />
    </span>
);

/** The message as it reaches Yanir: a draft while the chat waits for an address, stamped once sent. */
export const Letter: React.FC<{
    label: string;
    message?: string;
    from?: string;
    note?: string;
    sent: boolean;
}> = ({ label, message, from, note, sent }) => {
    const { t } = useLang();
    const copy = t(SHEETS).letter;
    const waiting = <Waiting text={copy.waiting} />;
    return (
        <>
            <div className={sent ? 'v-let sent' : 'v-let'}>
                <div className="st">{sent ? copy.sent : copy.draft}</div>
                <dl>
                    <div>
                        <dt>{copy.to}</dt>
                        <dd>{copy.toName}</dd>
                    </div>
                    <div>
                        <dt>{copy.from}</dt>
                        <dd dir={from ? 'ltr' : undefined}>{from || waiting}</dd>
                    </div>
                    <div>
                        <dt>{label}</dt>
                        <dd>{message || waiting}</dd>
                    </div>
                    {note && (
                        <div>
                            <dt>{copy.added}</dt>
                            <dd>{note}</dd>
                        </div>
                    )}
                </dl>
            </div>
            {sent ? (
                <p className="v-fine">{copy.sentNote}</p>
            ) : (
                <p className="v-how">
                    <b>{copy.howTitle}</b> {message ? copy.howHasMessage : copy.howNeedsMessage}
                </p>
            )}
        </>
    );
};

const DEFAULT_COUNT_MS = 1700;

/**
 * Counts a number up from zero once, after `delay` ms. Linear when a duration
 * is given (to stay in step with a progress bar beside it), eased otherwise.
 * With reduced motion it shows the final number at once.
 */
export const CountUp: React.FC<{ to: number; delay?: number; duration?: number }> = ({
    to,
    delay = 0,
    duration,
}) => {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const format = (n: number) => Math.round(n).toLocaleString('en-US');
        if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
            el.textContent = format(to);
            return;
        }
        const length = duration ?? DEFAULT_COUNT_MS;
        const start = performance.now() + delay;
        let frame = 0;
        const step = (now: number) => {
            const q = Math.max(0, Math.min(1, (now - start) / length));
            el.textContent = format(to * (duration ? q : 1 - Math.pow(1 - q, 3)));
            if (q < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [to, delay, duration]);
    return <b ref={ref}>0</b>;
};
