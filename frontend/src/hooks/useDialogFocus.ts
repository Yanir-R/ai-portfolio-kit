import { useEffect, useRef } from 'react';

/*
 * What every overlay on the site does the same way: the page behind stops
 * scrolling, Escape closes, focus moves into the overlay on open and returns
 * to whatever opened it on close.
 *
 * `onClose` is read through a ref, so a caller passing a new function on each
 * render does not re-run the open/close cycle and steal focus mid-typing.
 */
export const useDialogFocus = <T extends HTMLElement>(onClose: () => void) => {
    const firstRef = useRef<T>(null);
    const closeRef = useRef(onClose);

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        firstRef.current?.focus();

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            opener?.focus?.();
        };
    }, []);

    return firstRef;
};
