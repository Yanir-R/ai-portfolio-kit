import React from 'react';
import { CHAT } from '@/copy/chat';
import { FEATURES } from '@/constants/links';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { WhatsAppIcon } from '@/components/home/HeroSection';
import { useLang } from '@/i18n/useLang';
import { ChatHandoff } from '@/types/chat';

interface Props {
    handoff: ChatHandoff;
    /**
     * "I'll keep asking the agent": the card folds away and the conversation
     * goes on from the same point. Absent when there is nothing left to ask
     * today, since the next question would be refused.
     */
    onKeep?: () => void;
}

/*
 * The offer to continue with Yanir directly, drawn under an answer when the
 * server judged it the moment (see handoff_card in backend/replies.py). The summary is
 * the visitor's own need in their words; it goes into the booking notes and
 * the email, editable there, so the conversation reaches Yanir with its
 * context. WhatsApp opens without it: a prefilled chat message reads as sent
 * by the visitor, and they did not write it.
 *
 * Announced politely and never takes focus: the visitor is reading the answer
 * above it.
 */
const HandoffCard: React.FC<Props> = ({ handoff, onKeep }) => {
    const { t } = useLang();
    const chat = t(CHAT);
    const copy = chat.handoff;
    const { openContact } = useSiteDialogs();
    const summary = handoff.summary.trim();
    const message = summary || undefined;
    // The model's own line on what fits this need when it gave one, otherwise
    // the fixed line for why the card was offered; then what the call is for.
    const reason = handoff.reason;
    const opening =
        reason === 'last_answer'
            ? copy.lastText
            : `${handoff.fit?.trim() || copy.leads[reason]} ${copy.callLine}`;

    return (
        <div className="m y lim hand" role="status">
            <b className="lim-t">{copy.title}</b>
            <p>{opening}</p>
            {summary && (
                <div className="hand-sum">
                    <span>{copy.label}</span>
                    <p>{summary}</p>
                </div>
            )}
            <div className="lim-acts">
                <button
                    type="button"
                    className="btn"
                    onClick={() => openContact({ kind: 'call', message })}
                >
                    {chat.errors.call}
                </button>
                <div className="lim-routes">
                    <button
                        type="button"
                        className="btn line"
                        onClick={() => openContact({ kind: 'mail', message })}
                    >
                        {summary ? copy.mail : chat.errors.mail}
                    </button>
                    {FEATURES.whatsapp && (
                        <button
                            type="button"
                            className="btn line wa icon"
                            aria-label={chat.errors.whatsapp}
                            onClick={() => openContact({ kind: 'whatsapp' })}
                        >
                            <WhatsAppIcon />
                            <span>{chat.errors.whatsapp}</span>
                        </button>
                    )}
                </div>
            </div>
            {onKeep && (
                <button type="button" className="hand-keep" onClick={onKeep}>
                    {copy.keep}
                </button>
            )}
        </div>
    );
};

export default HandoffCard;
