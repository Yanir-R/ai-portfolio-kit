import React from 'react';
import { CHAT } from '@/copy/chat';
import { FEATURES } from '@/constants/links';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { WhatsAppIcon } from '@/components/home/HeroSection';
import { FailureCase } from '@/chat/failure';
import { useLang } from '@/i18n/useLang';

/** Which action leads. There is always exactly one primary button. */
type Lead = 'retry' | 'call' | 'mail';

interface ActionsProps {
    lead: Lead;
    /** The question that did not get an answer, carried into the contact window. */
    question: string;
    onRetry?: () => void;
}

/*
 * The ways to reach Yanir, as one row of the site's own buttons: the lead in
 * amber, the rest white, WhatsApp as its icon tile when the build has a number.
 * The contact window opens on the matching tab with the visitor's question in
 * it, so nothing they typed is lost.
 */
export const ContactActions: React.FC<ActionsProps> = ({ lead, question, onRetry }) => {
    const { t } = useLang();
    const errors = t(CHAT).errors;
    const { openContact } = useSiteDialogs();
    const cls = (own: Lead) => (lead === own ? 'btn' : 'btn line');

    // A failed send is transient: "try again" leads on its own line, and the
    // ways to reach Yanir sit together in one quieter row under it.
    const routes = lead === 'retry' && onRetry;

    const callButton = (
        <button
            type="button"
            className={cls('call')}
            onClick={() => openContact({ kind: 'call', topic: question || undefined })}
        >
            {routes ? errors.callShort : errors.call}
        </button>
    );
    const mailButton = (
        <button
            type="button"
            className={cls('mail')}
            onClick={() =>
                openContact({
                    kind: 'mail',
                    topic: question || undefined,
                    message: question || undefined,
                })
            }
        >
            {routes ? errors.mailShort : errors.mail}
        </button>
    );
    const whatsappButton = FEATURES.whatsapp && (
        <button
            type="button"
            className={`btn line wa${routes ? ' icon' : ''}`}
            aria-label={errors.whatsapp}
            onClick={() => openContact({ kind: 'whatsapp', topic: question || undefined })}
        >
            <WhatsAppIcon />
            <span>{errors.whatsapp}</span>
        </button>
    );

    if (routes) {
        return (
            <div className="lim-acts">
                <button type="button" className="btn lim-retry" onClick={onRetry}>
                    {errors.retry}
                </button>
                <div className="lim-routes">
                    {callButton}
                    {mailButton}
                    {whatsappButton}
                </div>
            </div>
        );
    }
    return (
        <div className="lim-acts">
            {callButton}
            {mailButton}
            {whatsappButton}
        </div>
    );
};

interface CardProps {
    failure: FailureCase;
    text: string;
    question: string;
    onRetry?: () => void;
}

/*
 * A send that did not get an answer, shown as the agent's next message rather
 * than as an error. Trying again leads where it can work (a failed send, a
 * short wait), email leads where the message reads like a brief. When the
 * day's answers are spent the message carries no buttons of its own: the input
 * row below has become the routes to Yanir, and one set is enough.
 *
 * Announced politely and never takes focus, so a screen reader hears it
 * without losing its place.
 */
const FailureCard: React.FC<CardProps> = ({ failure, text, question, onRetry }) => {
    const { t } = useLang();
    const errors = t(CHAT).errors;

    if (failure === 'daily') {
        return (
            <div className="m y lim" role="status">
                <b className="lim-t">{errors.dailyTitle}</b>
                <p>{text}</p>
            </div>
        );
    }
    const lead: Lead = failure === 'too_long' ? 'mail' : onRetry ? 'retry' : 'call';
    return (
        <div className="m y lim" role="status">
            <p>{text}</p>
            <ContactActions lead={lead} question={question} onRetry={onRetry} />
        </div>
    );
};

export default FailureCard;
