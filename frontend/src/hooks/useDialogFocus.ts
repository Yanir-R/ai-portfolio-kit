import { useEffect, useRef } from 'react';

/*
 * What every overlay on the site does the same way: the page behind stops
 * scrolling (unless `lockScroll` is false), Escape closes, focus moves into
 * the overlay on open and returns to whatever opened it on close.
 *
 * `onClose` is read through a ref, so a caller passing a new function on each
 * render does not re-run the open/close cycle and steal focus mid-typing.
 */
export const useDialogFocus = <T extends HTMLElement>(onClose: () => void, lockScroll = true) => {
    const firstRef = useRef<T>(null);
    const closeRef = useRef(onClose);

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        if (lockScroll) document.body.style.overflow = 'hidden';
        // The page may scroll behind it: focusing must not move the page.
        firstRef.current?.focus({ preventScroll: true });

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            if (lockScroll) document.body.style.overflow = overflow;
            opener?.focus?.({ preventScroll: true });
        };
    }, [lockScroll]);

    return firstRef;
};
