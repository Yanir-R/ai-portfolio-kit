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

    return (
        <div className="lim-acts">
            {lead === 'retry' && onRetry && (
                <button type="button" className="btn" onClick={onRetry}>
                    {errors.retry}
                </button>
            )}
            <button
                type="button"
                className={cls('call')}
                onClick={() => openContact({ kind: 'call', topic: question || undefined })}
            >
                {errors.call}
            </button>
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
                {errors.mail}
            </button>
            {FEATURES.whatsapp && (
                <button
                    type="button"
                    className="btn line wa"
                    aria-label={errors.whatsapp}
                    onClick={() => openContact({ kind: 'whatsapp', topic: question || undefined })}
                >
                    <WhatsAppIcon />
                    <span>{errors.whatsapp}</span>
                </button>
            )}
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
