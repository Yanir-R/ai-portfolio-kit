import React, { useEffect } from 'react';

/** Under this visible height a phone's keyboard is taken to be open. */
const KEYBOARD_VIEW_PX = 520;
/** Or when this much of the layout height is hidden (iOS keeps innerHeight). */
const KEYBOARD_COVER_PX = 120;
/** Wait for the keyboard's slide before centring the field. */
const SETTLE_MS = 320;

/**
 * Keeps a full-screen phone window usable while the keyboard is open.
 *
 * The window's top and height follow the visible viewport (`--vv-top`,
 * `--vv-h`), so nothing hides behind the keyboard. `data-kb` is set while the
 * keyboard is up, for the stylesheet to fold away what is not needed while
 * typing. And the field being typed in, with its label, is brought to the
 * middle of its scroll box on focus and again once the keyboard has settled.
 */
export const useKeyboardFit = (ref: React.RefObject<HTMLElement | null>, enabled: boolean) => {
    useEffect(() => {
        const box = ref.current;
        const vv = window.visualViewport;
        if (!enabled || !box || !vv) return;

        let timer = 0;
        const centre = () => {
            const field = document.activeElement;
            if (!(field instanceof HTMLElement) || !box.contains(field)) return;
            if (!field.matches('input, textarea, select')) return;
            (field.closest('label') ?? field).scrollIntoView({ block: 'center' });
        };
        const fit = () => {
            box.style.setProperty('--vv-h', `${vv.height}px`);
            box.style.setProperty('--vv-top', `${vv.offsetTop}px`);
            const open =
                vv.height < KEYBOARD_VIEW_PX || window.innerHeight - vv.height > KEYBOARD_COVER_PX;
            box.toggleAttribute('data-kb', open);
            window.clearTimeout(timer);
            timer = window.setTimeout(centre, SETTLE_MS);
        };
        const onFocus = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(centre, SETTLE_MS);
        };

        fit();
        vv.addEventListener('resize', fit);
        vv.addEventListener('scroll', fit);
        box.addEventListener('focusin', onFocus);
        return () => {
            window.clearTimeout(timer);
            vv.removeEventListener('resize', fit);
            vv.removeEventListener('scroll', fit);
            box.removeEventListener('focusin', onFocus);
            box.removeAttribute('data-kb');
            box.style.removeProperty('--vv-h');
            box.style.removeProperty('--vv-top');
        };
    }, [ref, enabled]);
};

/**
 * Enter in a one-line field moves on to the form's next field, as a phone
 * keyboard's "next" key suggests, and submits only from the last one.
 */
export const nextOnEnter = (event: React.KeyboardEvent<HTMLFormElement>) => {
    const field = event.target;
    if (event.key !== 'Enter' || !(field instanceof HTMLInputElement)) return;
    const fields = [...event.currentTarget.querySelectorAll<HTMLElement>('input, textarea')].filter(
        (f) => !(f as HTMLInputElement).disabled
    );
    const next = fields[fields.indexOf(field) + 1];
    if (!next) return;
    event.preventDefault();
    next.focus();
};
