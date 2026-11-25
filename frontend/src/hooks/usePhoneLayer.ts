import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useKeyboardFit } from '@/hooks/useKeyboardFit';

/*
 * A full-screen layer on a phone, shared by the home chat and the chat on a
 * blog post. Opening it adds a history entry for the same address, so the
 * phone's Back, the layer's X and Escape all close it and leave the visitor
 * where they were on the page; the page behind does not scroll; and the layer
 * follows the visible viewport, so its input sits right above the keyboard.
 */

// Marks history entries made by this page load. After a reload the entry
// still says "open", but what the layer showed is gone, so only an entry
// with this load's mark opens it.
const VISIT = Math.random();

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]';

/** Keeps Tab inside `box`, an open layer or sheet. */
export const trapTab = (event: KeyboardEvent, box: HTMLElement) => {
    const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (
        event.shiftKey &&
        (document.activeElement === first || !box.contains(document.activeElement))
    ) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
};

type LayerState = Record<string, unknown>;

/**
 * The layer's open state, kept in history under `name`. `show(extra)` opens
 * it (or, when open, adds an entry on top with `extra`, as the home chat's
 * drawing sheet does); `close()` goes back one entry.
 */
export const useHistoryLayer = (name: string, enabled: boolean) => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LayerState | null;
    const open = enabled && state?.[name] === VISIT;
    const here = location.pathname + location.search + location.hash;

    const show = useCallback(
        (extra?: LayerState) => {
            if (!enabled || (open && !extra)) return;
            navigate(here, { state: { [name]: VISIT, ...extra } });
        },
        [enabled, open, navigate, here, name]
    );
    const close = useCallback(() => navigate(-1), [navigate]);

    // A reloaded page, or one widened past a phone, starts with the layer closed.
    useEffect(() => {
        if (state?.[name] && !open) navigate(here, { replace: true, state: null });
    }, [state, name, open, navigate, here]);

    return { open, state, show, close };
};

interface ChromeOptions {
    /** Escape closes what is on top: by default the layer itself. */
    onEscape: () => void;
    /** The box Tab stays inside, when something sits over the layer. */
    trapRef?: React.RefObject<HTMLElement | null>;
    /** Where focus goes back to on close: the page's entry to the layer. */
    returnRef: React.RefObject<HTMLElement | null>;
}

/**
 * While `open`: the page behind is locked, the layer follows the visible
 * viewport (with `data-kb` while a keyboard is up), takes focus, keeps Tab
 * inside and closes on Escape. On close, focus goes back to the page.
 */
export const useLayerChrome = (
    boxRef: React.RefObject<HTMLElement | null>,
    open: boolean,
    { onEscape, trapRef, returnRef }: ChromeOptions
) => {
    useKeyboardFit(boxRef, open, { centre: false });
    useEffect(() => {
        const box = boxRef.current;
        if (!open || !box) return;
        const root = document.documentElement;
        root.classList.add('chat-open');
        if (!box.contains(document.activeElement)) box.focus({ preventScroll: true });
        return () => {
            root.classList.remove('chat-open');
            // Back on the page, at the entry that reopens the layer.
            requestAnimationFrame(() => returnRef.current?.focus({ preventScroll: true }));
        };
    }, [open, boxRef, returnRef]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onEscape();
            } else if (event.key === 'Tab') {
                const box = trapRef?.current ?? boxRef.current;
                if (box) trapTab(event, box);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onEscape, trapRef, boxRef]);
};

/**
 * A chat log inside a layer: keeps the newest message in view as the keyboard
 * opens or closes, and says when little room is left (`short`), so the
 * suggestions can give their room to the conversation.
 */
export const useLogFollowsViewport = (
    logRef: React.RefObject<HTMLElement | null>,
    enabled: boolean,
    shortPx: number
) => {
    const [short, setShort] = useState(false);
    useEffect(() => {
        const vv = window.visualViewport;
        const log = logRef.current;
        if (!enabled || !vv || !log) return;
        const onResize = () => {
            setShort(vv.height < shortPx);
            // A frame later, once the layer has taken the new height.
            requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
        };
        onResize();
        vv.addEventListener('resize', onResize);
        return () => {
            vv.removeEventListener('resize', onResize);
            setShort(false);
        };
    }, [enabled, logRef, shortPx]);
    return short;
};
