import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { PHONE_QUERY, REDUCED_MOTION_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';

/** How long the panel takes to slide out; matches the `.w-side.out` animations. */
const CLOSE_MS = 260;

/*
 * A panel that slides over the page from the side: a post read without
 * leaving the blog, or the "how the agent answers" explainer. Clicking the
 * backdrop, the close button or Escape closes it: the panel slides out and
 * the dimming fades before it is removed (at once under reduced motion).
 *
 * With `pageScrolls`, the page behind keeps scrolling on a wide screen, so a
 * reader can open a post and still move through the list; on a phone the
 * panel covers the screen and the page stays put.
 */
const SidePanel: React.FC<{
    label?: string;
    labelledBy?: string;
    closeLabel: string;
    onClose: () => void;
    className?: string;
    /** Extra controls in the header, beside the close button. */
    header?: React.ReactNode;
    /** Set on the panel, e.g. the explainer's level. */
    data?: Record<string, string>;
    bodyRef?: React.Ref<HTMLDivElement>;
    pageScrolls?: boolean;
    children: React.ReactNode;
}> = ({
    label,
    labelledBy,
    closeLabel,
    onClose,
    className,
    header,
    data,
    bodyRef,
    pageScrolls = false,
    children,
}) => {
    const phone = useMediaQuery(PHONE_QUERY);
    const reduced = useMediaQuery(REDUCED_MOTION_QUERY);
    const [leaving, setLeaving] = useState(false);
    const timer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    const close = useCallback(() => {
        if (reduced) {
            onClose();
            return;
        }
        if (timer.current) return;
        setLeaving(true);
        timer.current = window.setTimeout(() => {
            timer.current = undefined;
            setLeaving(false);
            onClose();
        }, CLOSE_MS);
    }, [onClose, reduced]);
    const closeRef = useDialogFocus<HTMLButtonElement>(close, !(pageScrolls && !phone));
    const dataAttrs = Object.fromEntries(
        Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v])
    );
    return (
        <div
            className={['w-side', className, leaving && 'out'].filter(Boolean).join(' ')}
            onClick={(e) => e.target === e.currentTarget && close()}
            {...dataAttrs}
        >
            <div
                className="in"
                role="dialog"
                aria-modal="true"
                aria-label={label}
                aria-labelledby={labelledBy}
            >
                <div className="hd">
                    <button ref={closeRef} type="button" onClick={close}>
                        <span aria-hidden="true">✕</span> {closeLabel}
                    </button>
                    {header}
                </div>
                <div className="bd" ref={bodyRef}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default SidePanel;
