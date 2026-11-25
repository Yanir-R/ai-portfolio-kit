import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, ContactKind } from '@/copy/site';
import { FEATURES, whatsappUrl } from '@/constants/links';
import QrCode from '@/components/site/QrCode';
import BookingFlow from '@/components/site/BookingFlow';
import { useLang } from '@/i18n/useLang';
import { useTurnstile } from '@/hooks/useTurnstile';
import { nextOnEnter, pinned, useKeyboardFit } from '@/hooks/useKeyboardFit';
import { PHONE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { contactService } from '@/services/contactService';
import { ContactRequest } from '@/components/site/SiteDialogs';

/*
 * "Let's talk": one window with the ways to reach him as tabs. The subject
 * the visitor was reading or asking about rides along, so nobody starts the
 * conversation from zero.
 *
 * A native <dialog>, opened modal: the browser traps focus, draws the
 * backdrop and closes on Escape.
 */
const KINDS: ContactKind[] = FEATURES.whatsapp ? ['call', 'mail', 'whatsapp'] : ['call', 'mail'];

interface Props {
    request: ContactRequest;
    onChange: (request: ContactRequest) => void;
    onClose: () => void;
}

const ContactDialog: React.FC<Props> = ({ request, onChange, onClose }) => {
    const { t } = useLang();
    const copy = t(CONTACT);
    const ref = useRef<HTMLDialogElement>(null);
    const kind = KINDS.includes(request.kind) ? request.kind : 'call';
    const note = [request.topic, request.pref, request.message].filter(Boolean).join(' · ');
    // Once the call is booked there is nothing left to choose between.
    const [booked, setBooked] = useState(false);
    const waLink = whatsappUrl(copy.whatsapp.first(request.topic));
    // On a phone the window fills the screen and has to make room for the keyboard.
    useKeyboardFit(ref, useMediaQuery(PHONE_QUERY));

    useEffect(() => {
        const dialog = ref.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
            // Focus the window itself, not the close button: the browser would
            // otherwise ring the X as if the visitor had tabbed to it.
            dialog.focus();
        }
    }, []);

    return (
        <dialog
            ref={ref}
            className="talk"
            tabIndex={-1}
            aria-labelledby="talk-title"
            onClose={onClose}
            // A click on the backdrop lands on the dialog element itself.
            onClick={(event) => event.target === ref.current && ref.current?.close()}
        >
            <div className="th">
                <div>
                    <b id="talk-title">{copy.title}</b>
                    {request.topic && (
                        <span className="tp">
                            {copy.topic} <b>{request.topic}</b>
                            {request.pref && (
                                <>
                                    {' · '}
                                    {copy.pref} <b>{request.pref}</b>
                                </>
                            )}
                        </span>
                    )}
                </div>
                <button type="button" aria-label={copy.close} onClick={() => ref.current?.close()}>
                    ✕
                </button>
            </div>
            <div
                className="tt"
                role="tablist"
                hidden={booked}
                style={{ '--n': KINDS.length } as React.CSSProperties}
            >
                {KINDS.map((k) => (
                    <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={k === kind}
                        onClick={() => onChange({ ...request, kind: k })}
                    >
                        {copy.tabs[k]}
                    </button>
                ))}
            </div>
            {/*
             * All three panels stay mounted and only the chosen one shows.
             * Switching tabs then keeps what was typed and the booking step,
             * and the calendar does not fetch its free days again.
             */}
            <div className="tb" role="tabpanel" hidden={kind !== 'call'}>
                {!booked && <p>{copy.call.text}</p>}
                <BookingFlow topic={note || undefined} onBooked={() => setBooked(true)} />
            </div>
            <div className="tb mail" role="tabpanel" hidden={kind !== 'mail'}>
                <p>{copy.mail.text}</p>
                <MailForm initial={request.message ?? request.topic ?? ''} topic={request.topic} />
            </div>
            <div className="tb wa" role="tabpanel" hidden={kind !== 'whatsapp'}>
                <div className="wa-main">
                    <p>{copy.whatsapp.text}</p>
                    {/* On a phone one card holds the steps, the button and a note. */}
                    <div className="wa-card">
                        <ol className="wa-steps">
                            {copy.whatsapp.steps.map((step, i) => (
                                <li key={step}>
                                    <span aria-hidden="true">{i + 1}</span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                        <a className="btn" href={waLink} target="_blank" rel="noopener">
                            {copy.whatsapp.open}
                            <OutArrow />
                        </a>
                        <p className="nt">{copy.whatsapp.note}</p>
                    </div>
                </div>
                {/* On a computer the chat usually lives on the phone: scan to open it there. */}
                <figure className="wa-qr">
                    <QrCode value={waLink} label={copy.whatsapp.scan} />
                    <figcaption>{copy.whatsapp.scan}</figcaption>
                </figure>
            </div>
        </dialog>
    );
};

/* "Opens elsewhere", drawn: iOS shows the ↗ character as an emoji tile. */
const OutArrow: React.FC = () => (
    <svg className="out" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
        <path
            d="M5 11l6-6M6 5h5v5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

type SendState = 'idle' | 'sending' | 'sent' | 'failed';

const MailForm: React.FC<{ initial: string; topic?: string }> = ({ initial, topic }) => {
    const { t, lang } = useLang();
    const copy = t(CONTACT).mail;
    const { containerRef: turnstileRef, getToken, reset: resetToken } = useTurnstile();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(initial);
    const [state, setState] = useState<SendState>('idle');
    // The outcome is shown where it can be read, keyboard or not.
    const noteRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (state !== 'idle' && !pinned(noteRef.current))
            noteRef.current?.scrollIntoView({ block: 'nearest' });
    }, [state]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (state === 'sending' || state === 'sent') return;
        setState('sending');
        const ok = await contactService.send(
            { email: email.trim(), message: message.trim(), topic, lang },
            await getToken()
        );
        resetToken();
        setState(ok ? 'sent' : 'failed');
    };

    const note = { idle: '', sending: copy.sending, sent: copy.sent, failed: copy.failed }[state];

    return (
        <>
            <form className="v-form" onSubmit={submit} onKeyDown={nextOnEnter}>
                <label>
                    {copy.email}
                    <input
                        type="email"
                        dir="ltr"
                        required
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        placeholder={copy.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={state === 'sent'}
                    />
                </label>
                <label>
                    {copy.message}
                    <textarea
                        rows={4}
                        required
                        enterKeyHint="enter"
                        maxLength={2000}
                        placeholder={copy.messagePlaceholder}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={state === 'sent'}
                    />
                </label>
                <div className="ts" ref={turnstileRef} />
                <div className="v-btns">
                    <button
                        className="btn"
                        type="submit"
                        disabled={state === 'sending' || state === 'sent'}
                    >
                        {copy.send}
                    </button>
                    <span className="note" aria-live="polite" ref={noteRef}>
                        {note}
                    </span>
                </div>
            </form>
            <p className="fine">{copy.fine}</p>
        </>
    );
};

export default ContactDialog;
