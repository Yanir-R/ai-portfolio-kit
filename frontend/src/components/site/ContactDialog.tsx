import React, { useEffect, useRef, useState } from 'react';
import { CONTACT, ContactKind } from '@/copy/site';
import { FEATURES, LINKS } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import { useTurnstile } from '@/hooks/useTurnstile';
import { contactService } from '@/services/contactService';
import { ContactRequest } from '@/components/site/SiteDialogs';

/*
 * "Talk to Yanir": one window with the ways to reach him as tabs. The subject
 * the visitor was reading or asking about rides along, so nobody starts the
 * conversation from zero.
 *
 * A native <dialog>, opened modal: the browser traps focus, draws the
 * backdrop and closes on Escape.
 */
const KINDS: ContactKind[] = FEATURES.whatsapp ? ['call', 'mail', 'whatsapp'] : ['call', 'mail'];

/** The booking page, embedded, with the subject prefilled as the invite's note. */
export const bookingUrl = (note?: string): string => {
    const url = new URL(LINKS.booking);
    url.searchParams.set('embed', 'true');
    if (note) url.searchParams.set('notes', note);
    return url.toString();
};

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

    useEffect(() => {
        const dialog = ref.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    return (
        <dialog
            ref={ref}
            className="talk"
            aria-labelledby="talk-title"
            onClose={onClose}
            // A click on the backdrop lands on the dialog element itself.
            onClick={(event) => event.target === ref.current && ref.current?.close()}
        >
            <div className="th">
                <b id="talk-title">{copy.title}</b>
                <button type="button" aria-label={copy.close} onClick={() => ref.current?.close()}>
                    ✕
                </button>
            </div>
            {request.topic && (
                <div className="tp">
                    {copy.topic} <b>{request.topic}</b>
                    {request.pref && (
                        <>
                            {' · '}
                            {copy.pref} <b>{request.pref}</b>
                        </>
                    )}
                </div>
            )}
            <div className="tt" role="tablist">
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
            <div className="tb" role="tabpanel">
                {kind === 'call' && (
                    <>
                        <p>{copy.call.text}</p>
                        <iframe
                            className="talk-cal"
                            src={bookingUrl(note)}
                            title={copy.call.frameTitle}
                            loading="lazy"
                        />
                        <a className="fine" href={LINKS.booking} target="_blank" rel="noopener">
                            {copy.call.open}
                        </a>
                    </>
                )}
                {kind === 'mail' && <MailForm initial={request.message ?? request.topic ?? ''} />}
                {kind === 'whatsapp' && (
                    <>
                        <p>{copy.whatsapp.text}</p>
                        <p className="fine">{copy.whatsapp.fine}</p>
                    </>
                )}
            </div>
        </dialog>
    );
};

type SendState = 'idle' | 'sending' | 'sent' | 'failed';

const MailForm: React.FC<{ initial: string }> = ({ initial }) => {
    const { t } = useLang();
    const copy = t(CONTACT).mail;
    const { containerRef: turnstileRef, getToken, reset: resetToken } = useTurnstile();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(initial);
    const [state, setState] = useState<SendState>('idle');

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (state === 'sending' || state === 'sent') return;
        setState('sending');
        const ok = await contactService.send(email.trim(), message.trim(), await getToken());
        resetToken();
        setState(ok ? 'sent' : 'failed');
    };

    const note = { idle: '', sending: copy.sending, sent: copy.sent, failed: copy.failed }[state];

    return (
        <>
            <form className="v-form" onSubmit={submit}>
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
                        disabled={state === 'sent'}
                    />
                </label>
                <label>
                    {copy.message}
                    <textarea
                        rows={4}
                        required
                        maxLength={2000}
                        placeholder={copy.messagePlaceholder}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={state === 'sent'}
                    />
                </label>
                <div ref={turnstileRef} />
                <div className="v-btns">
                    <button
                        className="btn sm"
                        type="submit"
                        disabled={state === 'sending' || state === 'sent'}
                    >
                        {copy.send}
                    </button>
                    <span className="note" aria-live="polite">
                        {note}
                    </span>
                </div>
            </form>
            <p className="fine">{copy.fine}</p>
        </>
    );
};

export default ContactDialog;
