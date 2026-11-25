import React, { useRef } from 'react';
import { WRITING } from '@/copy/writing';
import AskDock from '@/components/writing/AskDock';
import LayerHeader from '@/components/chat/LayerHeader';
import { useLayerChrome } from '@/hooks/usePhoneLayer';
import { useLang } from '@/i18n/useLang';
import { WritingEntry } from '@/types/writing';

/*
 * The chat about a piece, on a phone. The page shows one fixed bar that looks
 * like an input but is a button, so no keyboard opens inside the article; it
 * opens the same full-screen layer as the home chat (same header, same
 * viewport and keyboard handling, same limit and failure cards). The layer
 * stays mounted once opened, so its conversation is there when it reopens.
 */
interface Props {
    entry: WritingEntry;
    open: boolean;
    /** The layer has been opened on this page at least once. */
    started: boolean;
    onOpen: () => void;
    onClose: () => void;
}

const PostChatLayer: React.FC<Props> = ({ entry, open, started, onOpen, onClose }) => {
    const { t } = useLang();
    const copy = t(WRITING).ask;
    const boxRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLButtonElement>(null);
    useLayerChrome(boxRef, open, { onEscape: onClose, returnRef: barRef });

    return (
        <>
            <div className="w-bar">
                <button type="button" ref={barRef} onClick={onOpen}>
                    <i className="dot" aria-hidden="true" />
                    <span>{copy.bar(entry.kind)}</span>
                </button>
            </div>
            {started && (
                <div
                    className="chat-layer"
                    ref={boxRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={copy.log}
                    tabIndex={-1}
                    hidden={!open}
                >
                    <LayerHeader onClose={onClose} />
                    <AskDock entry={entry} layer active={open} />
                </div>
            )}
        </>
    );
};

export default PostChatLayer;
