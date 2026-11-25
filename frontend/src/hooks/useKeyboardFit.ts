import React, { useEffect } from 'react';

/** Under this visible height a phone's keyboard is taken to be open. */
const KEYBOARD_VIEW_PX = 520;
/** Or when this much of the layout height is hidden (iOS keeps innerHeight). */
const KEYBOARD_COVER_PX = 120;
/** Wait for the keyboard's slide before centring the field. */
const SETTLE_MS = 320;
/** A growing field (`data-grow`) stops at this many lines and scrolls inside. */
const GROW_LINES = 3;

/**
 * Keeps a full-screen phone window usable while the keyboard is open.
 *
 * The window's top and height follow the visible viewport (`--vv-top`,
 * `--vv-h`), so nothing hides behind the keyboard. `data-kb` is set while the
 * keyboard is up, for the stylesheet to fold away what is not needed while
 * typing. And the field being typed in, with its label, is brought to the
 * middle of its scroll box on focus and again once the keyboard has settled.
 * While the keyboard is up a textarea marked `data-grow` starts one line high
 * and grows with its text up to three lines, through `--grow-h`.
 *
 * `centre: false` leaves scrolling alone, for a window whose input row is
 * fixed at its foot (the chat layers) rather than inside a scrolling form.
 */
export const useKeyboardFit = (
    ref: React.RefObject<HTMLElement | null>,
    enabled: boolean,
    { centre: centring = true }: { centre?: boolean } = {}
) => {
    useEffect(() => {
        const box = ref.current;
        const vv = window.visualViewport;
        if (!enabled || !box || !vv) return;

        let timer = 0;
        const grow = (field: HTMLTextAreaElement) => {
            if (!box.hasAttribute('data-kb')) return;
            const css = getComputedStyle(field);
            const line = parseFloat(css.lineHeight) || 22;
            const frame =
                parseFloat(css.paddingTop) +
                parseFloat(css.paddingBottom) +
                parseFloat(css.borderTopWidth) +
                parseFloat(css.borderBottomWidth);
            // Collapse to one line first, so scrollHeight measures the text alone.
            field.style.setProperty('--grow-h', '0px');
            const text =
                field.scrollHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
            const lines = Math.min(GROW_LINES, Math.max(1, Math.round(text / line)));
            field.style.setProperty('--grow-h', `${lines * line + frame}px`);
        };
        const growAll = () =>
            box.querySelectorAll<HTMLTextAreaElement>('textarea[data-grow]').forEach(grow);
        const onInput = (event: Event) => {
            const field = event.target;
            if (!(field instanceof HTMLTextAreaElement) || !field.hasAttribute('data-grow')) return;
            grow(field);
            // A field that grew may now run under the pinned button.
            if (box.hasAttribute('data-kb')) settle(field.closest('label') ?? field);
        };
        const centre = () => {
            const field = document.activeElement;
            if (!(field instanceof HTMLElement) || !box.contains(field)) return;
            if (!field.matches('input, textarea, select')) return;
            const target = field.closest('label') ?? field;
            target.scrollIntoView({ block: 'center' });
            settle(target);
        };
        /*
         * After centring, no row may sit half under the title or half under a
         * pinned (sticky) button. Of the scroll positions that line a row's
         * edge up with the title or the button, take the nearest one that
         * keeps the focused field whole and cuts no row; failing that, the
         * nearest that keeps the focused field whole. A form that fits whole
         * is simply shown from its top.
         */
        const settle = (target: Element) => {
            const scroller = target.closest<HTMLElement>('.tb');
            if (!scroller) return;
            const box = scroller.getBoundingClientRect();
            const pins = [...scroller.querySelectorAll<HTMLElement>('form > *')].filter(
                (el) => getComputedStyle(el).position === 'sticky'
            );
            const top = box.top;
            const bottom = Math.min(box.bottom, ...pins.map((p) => p.getBoundingClientRect().top));
            const rows = [...scroller.querySelectorAll<HTMLElement>('form > label, .bk-pick')].map(
                (row) => row.getBoundingClientRect()
            );
            const t = target.getBoundingClientRect();
            // When every row fits from the top, the form stays put at the top.
            const fromTop = -scroller.scrollTop;
            if (rows.every((r) => r.top - fromTop >= top - 1 && r.bottom - fromTop <= bottom + 1)) {
                scroller.scrollTop = 0;
                return;
            }
            const max = scroller.scrollHeight - scroller.clientHeight;
            const reachable = (by: number) =>
                scroller.scrollTop + by >= -0.5 && scroller.scrollTop + by <= max + 0.5;
            const whole = (by: number) => t.top - by >= top - 1 && t.bottom - by <= bottom + 1;
            const cuts = (by: number) =>
                rows.some((r) =>
                    [top, bottom].some((edge) => r.top - by < edge - 1 && r.bottom - by > edge + 1)
                );
            const moves = [
                0,
                ...rows.flatMap((r) => [
                    r.top - top,
                    r.bottom - top,
                    r.top - bottom,
                    r.bottom - bottom,
                ]),
            ]
                .filter((by) => reachable(by) && whole(by))
                .sort((a, b) => Math.abs(a) - Math.abs(b));
            const by = moves.find((m) => !cuts(m)) ?? moves[0];
            if (by) scroller.scrollTop += by;
        };
        const fit = () => {
            box.style.setProperty('--vv-h', `${vv.height}px`);
            box.style.setProperty('--vv-top', `${vv.offsetTop}px`);
            // iOS can pan the visible viewport sideways as the keyboard opens:
            // the window follows it, so nothing ends up off the screen's edge.
            box.style.setProperty('--vv-left', `${vv.offsetLeft}px`);
            box.style.setProperty('--vv-w', `${vv.width}px`);
            const open =
                vv.height < KEYBOARD_VIEW_PX || window.innerHeight - vv.height > KEYBOARD_COVER_PX;
            box.toggleAttribute('data-kb', open);
            growAll();
            window.clearTimeout(timer);
            if (centring) timer = window.setTimeout(centre, SETTLE_MS);
        };
        // A form that changes height (an error or a result above the pinned
        // button, a field that grew) settles again around the focused field.
        const resized = new ResizeObserver((entries) => {
            if (!box.hasAttribute('data-kb')) return;
            const field = document.activeElement;
            for (const { target: form } of entries) {
                if (!(form instanceof HTMLElement) || !form.offsetParent) continue;
                // The focused field, or (once a tap on the button moved focus
                // away) the form's last field, stays in view.
                const target =
                    field instanceof HTMLElement &&
                    form.contains(field) &&
                    field.matches('input, textarea, select')
                        ? (field.closest('label') ?? field)
                        : form.querySelector('label:last-of-type');
                if (target) settle(target);
            }
        });
        const watchForms = () => box.querySelectorAll('form').forEach((f) => resized.observe(f));
        const onFocus = () => {
            watchForms();
            growAll();
            window.clearTimeout(timer);
            if (centring) timer = window.setTimeout(centre, SETTLE_MS);
        };

        fit();
        vv.addEventListener('resize', fit);
        vv.addEventListener('scroll', fit);
        box.addEventListener('focusin', onFocus);
        box.addEventListener('input', onInput);
        watchForms();
        return () => {
            window.clearTimeout(timer);
            vv.removeEventListener('resize', fit);
            vv.removeEventListener('scroll', fit);
            box.removeEventListener('focusin', onFocus);
            box.removeEventListener('input', onInput);
            resized.disconnect();
            box.removeAttribute('data-kb');
            box.style.removeProperty('--vv-h');
            box.style.removeProperty('--vv-top');
            box.style.removeProperty('--vv-left');
            box.style.removeProperty('--vv-w');
        };
    }, [ref, enabled, centring]);
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

/** Whether an element sits in a pinned (sticky) strip, so it is always in view. */
export const pinned = (el: Element | null) => {
    for (let at = el; at; at = at.parentElement)
        if (getComputedStyle(at).position === 'sticky') return true;
    return false;
};
