import { TURNSTILE_SCRIPT_URL, TURNSTILE_SITE_KEY } from '@/constants/turnstile';

/*
 * Local types for the part of `window.turnstile` this module calls. Cloudflare
 * publishes no types with api.js, and a types package would be a dependency
 * added to describe five functions.
 */
interface TurnstileRenderOptions {
    sitekey: string;
    execution?: 'render' | 'execute';
    appearance?: 'always' | 'execute' | 'interaction-only';
    'refresh-expired'?: 'auto' | 'manual' | 'never';
    callback?: (token: string) => void;
    'error-callback'?: (errorCode?: string) => boolean | void;
    'expired-callback'?: () => void;
    'timeout-callback'?: () => void;
}

export interface TurnstileApi {
    render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
    execute: (widgetId: string) => void;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
    getResponse: (widgetId: string) => string | undefined;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

export interface TurnstileController {
    getToken: () => Promise<string | null>;
    reset: () => void;
    destroy: () => void;
}

// How long a send waits for a token before going without one. It covers the
// script load as well as the challenge, so a visitor on a network that drops
// challenges.cloudflare.com waits this long once per message and no longer.
const TOKEN_TIMEOUT_MS = 15_000;

// Module-level so the script tag is injected once however many times the chat
// mounts - StrictMode alone mounts it twice.
let turnstilePromise: Promise<TurnstileApi> | null = null;

/**
 * Loads Turnstile's api.js and resolves with `window.turnstile`.
 *
 * Readiness is taken from the script element's load event rather than the
 * `onload=` query parameter, which needs a global callback name and would put
 * a function on `window` for the sake of one call.
 */
export const loadTurnstile = (): Promise<TurnstileApi> => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Turnstile needs a browser'));
    }
    if (window.turnstile) {
        return Promise.resolve(window.turnstile);
    }

    if (!turnstilePromise) {
        turnstilePromise = new Promise<TurnstileApi>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = TURNSTILE_SCRIPT_URL;
            script.async = true;
            script.defer = true;
            script.addEventListener('load', () => {
                if (window.turnstile) {
                    resolve(window.turnstile);
                } else {
                    reject(new Error('Turnstile loaded without defining its API'));
                }
            });
            script.addEventListener('error', () => {
                reject(new Error('Turnstile script failed to load'));
            });
            document.head.appendChild(script);
        });
    }

    return turnstilePromise;
};

/**
 * Renders one Turnstile widget into `container` and hands out tokens from it.
 *
 * The widget is rendered idle (`execution: 'execute'`) and only runs when a
 * message is about to be sent, so a visitor who never uses the chat is never
 * challenged. `appearance: 'interaction-only'` keeps it invisible unless
 * Cloudflare decides it needs a click.
 *
 * Nothing here throws. Every way of not getting a token - the script blocked,
 * the challenge failing, the visitor ignoring it - comes back as null, and the
 * message is sent without one. The Worker answers a missing token with a reply
 * written for the visitor, which is a better outcome than a send that silently
 * never happens.
 */
export const createTurnstileController = (container: HTMLElement): TurnstileController => {
    let widget: { api: TurnstileApi; id: string } | null = null;
    let destroyed = false;
    let pending: { resolve: (token: string | null) => void; timer: number } | null = null;

    const settle = (token: string | null) => {
        if (!pending) return;
        const { resolve, timer } = pending;
        pending = null;
        window.clearTimeout(timer);
        resolve(token);
    };

    const reset = () => {
        if (!widget) return;
        try {
            widget.api.reset(widget.id);
        } catch {
            // The widget is already gone; there is nothing left to reset.
        }
    };

    const ready: Promise<boolean> = loadTurnstile().then(
        (api) => {
            // Destroyed while the script was still loading, which is what
            // StrictMode's mount-unmount-mount does to the first controller.
            // Rendering now would leave a widget nobody will ever remove.
            if (destroyed) return false;

            try {
                const id = api.render(container, {
                    sitekey: TURNSTILE_SITE_KEY,
                    execution: 'execute',
                    appearance: 'interaction-only',
                    // An expired token is reset below and a fresh one is asked
                    // for at the next send, rather than Turnstile re-running
                    // the challenge on its own for a message nobody is sending.
                    'refresh-expired': 'manual',
                    callback: (token) => settle(token),
                    'error-callback': () => {
                        settle(null);
                        // Tells Turnstile the failure was handled here.
                        return true;
                    },
                    'expired-callback': () => reset(),
                    'timeout-callback': () => {
                        settle(null);
                        reset();
                    },
                });
                widget = { api, id };
                return true;
            } catch {
                return false;
            }
        },
        () => false
    );

    const getToken = (): Promise<string | null> => {
        if (typeof window === 'undefined') return Promise.resolve(null);

        return new Promise<string | null>((resolve) => {
            // One widget runs one challenge at a time, so a request still
            // waiting gives way to the new one.
            settle(null);

            const request = {
                resolve,
                timer: window.setTimeout(() => settle(null), TOKEN_TIMEOUT_MS),
            };
            pending = request;

            void ready.then((rendered) => {
                // Timed out or superseded while the script was loading.
                if (pending !== request) return;

                if (!rendered || !widget) {
                    settle(null);
                    return;
                }

                try {
                    widget.api.execute(widget.id);
                } catch {
                    settle(null);
                }
            });
        });
    };

    const destroy = () => {
        destroyed = true;
        settle(null);
        if (!widget) return;
        try {
            widget.api.remove(widget.id);
        } catch {
            // Already removed.
        }
        widget = null;
    };

    return {
        getToken,
        // Tokens are single-use: the Worker spends one verifying it, whether or
        // not the message then succeeds. So this runs after every send, and the
        // next send starts a fresh challenge.
        reset,
        destroy,
    };
};
