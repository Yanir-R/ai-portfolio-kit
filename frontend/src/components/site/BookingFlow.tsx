import React, { useMemo, useRef, useState } from 'react';
import { useLoad } from '@/hooks/useLoad';
import { CONTACT } from '@/copy/site';
import { BOOKING_TIME_ZONE } from '@/constants/booking';
import { LINKS } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import { useTurnstile } from '@/hooks/useTurnstile';
import { Booked, bookingService, Slot, SlotsByDay } from '@/services/bookingService';

/*
 * Booking the discovery call in three steps, drawn by the site: a day and a
 * time from cal.com's free slots, then name, email and subject, then our own
 * confirmation. cal.com sends the invite with the call link. The plain
 * cal.com page stays one click away in case anything here fails.
 */

type Step = 'time' | 'details' | 'done';
type Month = { y: number; m: number };

/** Today's date in Israel, YYYY-MM-DD. */
const todayInIsrael = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: BOOKING_TIME_ZONE }).format(new Date());

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
/** A day key at noon UTC: the same calendar day in every time zone near Israel. */
const noon = (key: string) => new Date(`${key}T12:00:00Z`);
const israelClock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: BOOKING_TIME_ZONE,
});
/**
 * "09:30" in Israel time. Slots come with Israel's offset but cal.com's booking
 * answer is in UTC, so the time is converted rather than read off the string.
 */
const clock = (iso: string) => israelClock.format(new Date(iso));
/** Google Calendar's compact UTC form, 20261126T073000Z. */
const gcal = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
/** Text escaped for an iCalendar property value. */
const icsText = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

/*
 * One calendar file for Apple Calendar, Outlook and anything else that opens
 * .ics: on an iPhone it opens the "add event" sheet, on a desktop the default
 * calendar app. Google Calendar (Android's default) gets its own link.
 */
const icsFile = (uid: string, start: string, end: string, title: string, details: string) =>
    [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//yanirrot.com//booking//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}@yanirrot.com`,
        `DTSTAMP:${gcal(new Date().toISOString())}`,
        `DTSTART:${gcal(start)}`,
        `DTEND:${gcal(end)}`,
        `SUMMARY:${icsText(title)}`,
        ...(details ? [`DESCRIPTION:${icsText(details)}`] : []),
        'END:VEVENT',
        'END:VCALENDAR',
        '',
    ].join('\r\n');

interface Props {
    topic?: string;
    /** Told once the call is booked, so the dialog can drop its route tabs. */
    onBooked: () => void;
}

const Stepper: React.FC<{ at: number; names: string[]; label: string }> = ({
    at,
    names,
    label,
}) => (
    <ol className="stp" aria-label={label}>
        {names.map((name, i) => (
            <li
                key={name}
                className={i < at ? 'dn' : i === at ? 'cu' : undefined}
                aria-current={i === at ? 'step' : undefined}
            >
                <span>{i < at ? '✓' : i + 1}</span>
                {name}
            </li>
        ))}
    </ol>
);

interface StepsProps extends Props {
    getToken: () => Promise<string | null>;
    resetToken: () => void;
}

/** A month arrow. It points the way reading goes, so it flips under dir="rtl". */
const Chevron: React.FC<{ back?: boolean }> = ({ back }) => (
    <svg
        className={back ? 'chev back' : 'chev'}
        viewBox="0 0 16 16"
        width="16"
        height="16"
        aria-hidden="true"
    >
        <path
            d="M6 3l5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const BookingSteps: React.FC<StepsProps> = ({ topic, onBooked, getToken, resetToken }) => {
    const { t, lang } = useLang();
    const copy = t(CONTACT).booking;
    const locale = lang === 'he' ? 'he-IL' : 'en-GB';
    const today = useMemo(() => todayInIsrael(), []);
    const [month, setMonth] = useState<Month>(() => {
        const [y, m] = today.split('-').map(Number);
        return { y, m: m - 1 };
    });
    const [day, setDay] = useState<string | null>(null);
    const timesRef = useRef<HTMLDivElement>(null);
    const [slot, setSlot] = useState<Slot | null>(null);
    const [step, setStep] = useState<Step>('time');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [notes, setNotes] = useState(topic ?? '');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [booked, setBooked] = useState<Booked | null>(null);

    // The free slots of the month on show, from today on.
    const monthFirst = dayKey(month.y, month.m, 1);
    const [load, reloadSlots] = useLoad(monthFirst, () =>
        bookingService.slots(
            monthFirst < today ? today : monthFirst,
            dayKey(month.y, month.m, daysIn(month.y, month.m))
        )
    );

    const fmt = useMemo(
        () => ({
            month: new Intl.DateTimeFormat(locale, {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
            }),
            day: new Intl.DateTimeFormat(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'UTC',
            }),
        }),
        [locale]
    );

    const days: SlotsByDay = load.state === 'ready' ? load.value : {};
    const times = day ? (days[day] ?? []) : [];
    const [ty, tm] = today.split('-').map(Number);
    const atFirstMonth = month.y === ty && month.m === tm - 1;
    const shiftMonth = (by: number) => {
        setDay(null);
        setMonth(({ y, m }) => ({
            y: y + Math.floor((m + by) / 12),
            m: (((m + by) % 12) + 12) % 12,
        }));
    };

    const pickTime = (s: Slot) => {
        setSlot(s);
        setError(null);
        setStep('details');
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!slot || sending) return;
        setSending(true);
        setError(null);
        const outcome = await bookingService.book(
            {
                start: slot.start,
                name: name.trim(),
                email: email.trim(),
                notes: notes.trim(),
                lang,
            },
            await getToken()
        );
        resetToken();
        setSending(false);
        if (outcome.ok) {
            setBooked(outcome.booking);
            setStep('done');
            onBooked();
            return;
        }
        if (outcome.reason === 'taken') {
            // The list on screen is stale: read it again and send them back to it.
            setSlot(null);
            setStep('time');
            reloadSlots();
            setError(copy.taken);
            return;
        }
        // Each refusal says what to do next; see BookFailure.
        const message = {
            unverified: copy.unverified,
            busy: copy.busy(outcome.retryAfter),
            invalid: copy.invalid,
            failed: copy.bookFailed,
        }[outcome.reason];
        setError(message);
    };

    const when = slot && day ? `${fmt.day.format(noon(day))} · ${clock(slot.start)}` : '';
    const fallback = (
        <a className="fine ext" href={LINKS.booking} target="_blank" rel="noopener">
            {t(CONTACT).call.open}
        </a>
    );

    if (step === 'done' && slot && day) {
        const start = booked?.start ?? slot.start;
        const end = booked?.end ?? slot.end;
        const calendarUrl =
            'https://calendar.google.com/calendar/render?' +
            new URLSearchParams({
                action: 'TEMPLATE',
                text: copy.eventTitle,
                dates: `${gcal(start)}/${gcal(end)}`,
                details: notes,
            }).toString();
        const calendarFile =
            'data:text/calendar;charset=utf-8,' +
            encodeURIComponent(
                icsFile(booked?.uid ?? start, start, end, copy.eventTitle, notes.trim())
            );
        return (
            <>
                {/* No step line here: the large check already says it is done. */}
                <div className="bk-done">
                    <div className="bk-ok" role="status">
                        <span className="ck" aria-hidden="true">
                            ✓
                        </span>
                        <div>
                            <h3>{copy.doneTitle}</h3>
                            <p>{copy.doneText}</p>
                        </div>
                    </div>
                    <div className="bk-card">
                        <dl className="bk-sum">
                            {/* Day and time on their own rows: one line each at any width. */}
                            <dt>{copy.when}</dt>
                            <dd>{fmt.day.format(noon(day))}</dd>
                            <dt>{copy.time}</dt>
                            <dd>
                                {clock(start)} {copy.until} {clock(end)}
                            </dd>
                            <dt>{copy.where}</dt>
                            <dd>{copy.whereValue}</dd>
                            <dt>{copy.withWhom}</dt>
                            <dd>{copy.withValue}</dd>
                            {notes.trim() && (
                                <>
                                    <dt>{copy.subject}</dt>
                                    <dd>{notes.trim()}</dd>
                                </>
                            )}
                        </dl>
                        <div className="bk-add">
                            <span>{copy.addToCalendar}</span>
                            <div className="bk-cals">
                                <a href={calendarUrl} target="_blank" rel="noopener">
                                    {copy.calGoogle}
                                </a>
                                <a href={calendarFile} download="call-with-yanir.ics">
                                    {copy.calFile}
                                </a>
                            </div>
                        </div>
                    </div>
                    {/* No Close button: the window has its ✕ and closes on a click outside. */}
                    <small className="fine">{copy.doneFine}</small>
                </div>
            </>
        );
    }

    if (step === 'details' && slot) {
        return (
            <>
                <Stepper at={1} names={copy.steps} label={copy.stepsLabel} />
                <div className="bk-pick">
                    <span>{when}</span>
                    <button type="button" onClick={() => setStep('time')}>
                        {copy.change}
                    </button>
                </div>
                <form className="bk-form" onSubmit={submit}>
                    <label>
                        {copy.name}
                        <input
                            type="text"
                            required
                            maxLength={120}
                            autoComplete="name"
                            placeholder={copy.namePlaceholder}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <label>
                        {copy.email}
                        <input
                            type="email"
                            dir="ltr"
                            required
                            autoComplete="email"
                            placeholder={copy.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </label>
                    <label>
                        {copy.about}
                        <textarea
                            rows={2}
                            maxLength={1000}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </label>
                    {/* Pinned to the window's foot, so an error never pushes the buttons out of view. */}
                    <div className="bk-foot">
                        {error && (
                            <p className="bk-err" role="alert">
                                {error}
                            </p>
                        )}
                        <div className="bk-row">
                            <button type="submit" className="btn" disabled={sending}>
                                {sending ? copy.sending : copy.submit}
                            </button>
                            <button
                                type="button"
                                className="btn sec"
                                onClick={() => setStep('time')}
                            >
                                {copy.back}
                            </button>
                        </div>
                    </div>
                    <small className="fine">{copy.fine}</small>
                </form>
                {error === copy.bookFailed && fallback}
            </>
        );
    }

    // Step 1: the month, and the free times of the day picked.
    const first = new Date(Date.UTC(month.y, month.m, 1)).getUTCDay();
    const cells: (string | null)[] = [
        ...Array.from({ length: first }, () => null),
        ...Array.from({ length: daysIn(month.y, month.m) }, (_, i) =>
            dayKey(month.y, month.m, i + 1)
        ),
    ];
    const anyFree = Object.values(days).some((list) => list.length > 0);

    return (
        <>
            <Stepper at={0} names={copy.steps} label={copy.stepsLabel} />
            {error && (
                <p className="bk-err" role="alert">
                    {error}
                </p>
            )}
            <div className={day ? 'bk-two has-day' : 'bk-two'}>
                <div className="bk-cal">
                    <div className="ch">
                        <div className="cm">
                            <strong>{fmt.month.format(noon(dayKey(month.y, month.m, 15)))}</strong>
                            <span>{copy.meta}</span>
                        </div>
                        <div className="mvs">
                            <button
                                type="button"
                                className="mv"
                                aria-label={copy.prevMonth}
                                disabled={atFirstMonth}
                                onClick={() => shiftMonth(-1)}
                            >
                                <Chevron back />
                            </button>
                            <button
                                type="button"
                                className="mv"
                                aria-label={copy.nextMonth}
                                onClick={() => shiftMonth(1)}
                            >
                                <Chevron />
                            </button>
                        </div>
                    </div>
                    <div className="cg">
                        {copy.weekdays.map((w) => (
                            <i key={w}>{w}</i>
                        ))}
                        {cells.map((key, i) =>
                            key ? (
                                <button
                                    key={key}
                                    type="button"
                                    className={days[key]?.length ? 'f' : undefined}
                                    disabled={!days[key]?.length}
                                    aria-pressed={key === day}
                                    aria-label={fmt.day.format(noon(key))}
                                    onClick={() => {
                                        setDay(key);
                                        setError(null);
                                        // On a phone the times open under the calendar.
                                        requestAnimationFrame(() =>
                                            timesRef.current?.scrollIntoView({
                                                block: 'nearest',
                                                behavior: 'smooth',
                                            })
                                        );
                                    }}
                                >
                                    {Number(key.slice(8))}
                                </button>
                            ) : (
                                <span key={`pad-${i}`} />
                            )
                        )}
                    </div>
                    {load.state === 'loading' && <p className="fine">{copy.loading}</p>}
                    {load.state === 'failed' && <p className="bk-err">{copy.failed}</p>}
                    {load.state === 'ready' && !anyFree && <p className="fine">{copy.none}</p>}
                </div>
                {day && (
                    <div className="bk-pick only-phone">
                        <span>{fmt.day.format(noon(day))}</span>
                        <button type="button" onClick={() => setDay(null)}>
                            {copy.otherDay}
                        </button>
                    </div>
                )}
                <div className="bk-sl" ref={timesRef}>
                    {day ? (
                        <strong className="only-wide">{fmt.day.format(noon(day))}</strong>
                    ) : null}
                    <span>{day ? copy.timesNote : copy.pickDay}</span>
                    {day && (
                        <div className="tg">
                            {times.map((s) => (
                                <button
                                    key={s.start}
                                    type="button"
                                    dir="ltr"
                                    aria-pressed={slot?.start === s.start}
                                    onClick={() => pickTime(s)}
                                >
                                    {clock(s.start)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {fallback}
        </>
    );
};

/*
 * The bot check sits outside the steps, in one element that stays mounted
 * from the first step on. It used to live inside the details form, which does
 * not exist when the hook mounts on the first step, so no widget was ever
 * rendered and every booking went out without a token.
 */
const BookingFlow: React.FC<Props> = (props) => {
    const { containerRef, getToken, reset } = useTurnstile();
    return (
        <>
            <BookingSteps {...props} getToken={getToken} resetToken={reset} />
            <div ref={containerRef} />
        </>
    );
};

export default BookingFlow;
