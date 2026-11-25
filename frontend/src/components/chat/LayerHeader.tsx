import React from 'react';
import { CHAT } from '@/copy/chat';
import { useLang } from '@/i18n/useLang';

/**
 * The chat's header: who answers, and (in a full-screen phone layer) the X
 * that closes it. Shared by the home chat and the chat on a blog post, so
 * both layers open the same way. `children` sits between the two.
 */
const LayerHeader: React.FC<{ onClose?: () => void; children?: React.ReactNode }> = ({
    onClose,
    children,
}) => {
    const { t } = useLang();
    const copy = t(CHAT);
    return (
        <div className="ph">
            <span className="who2">
                <i className="dot" />
                {copy.who} <small>{copy.whoNote}</small>
            </span>
            {children}
            {onClose && (
                <button type="button" className="x" aria-label={copy.phone.close} onClick={onClose}>
                    ✕
                </button>
            )}
        </div>
    );
};

export default LayerHeader;
