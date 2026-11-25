import React from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';

/*
 * A panel that slides over the page from the side: a post read without
 * leaving the blog, or the "how the agent answers" explainer. Clicking the
 * backdrop, the close button or Escape closes it.
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
    children: React.ReactNode;
}> = ({ label, labelledBy, closeLabel, onClose, className, header, data, bodyRef, children }) => {
    const closeRef = useDialogFocus<HTMLButtonElement>(onClose);
    const dataAttrs = Object.fromEntries(
        Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v])
    );
    return (
        <div
            className={className ? `w-side ${className}` : 'w-side'}
            onClick={(e) => e.target === e.currentTarget && onClose()}
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
                    <button ref={closeRef} type="button" onClick={onClose}>
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
