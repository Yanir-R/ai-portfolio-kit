import { useEffect, useRef } from 'react';
import { createTurnstileController, TurnstileController } from '@/services/turnstile';

/*
 * The bot check in front of every request that costs something (a model call
 * or an outgoing email). The widget renders into `containerRef`, usually
 * unseen: a challenge appears there only when Cloudflare wants a click.
 *
 * Each mount gets its own controller and destroys it on the way out, so
 * StrictMode's double mount leaves one widget rather than two.
 */
export const useTurnstile = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<TurnstileController | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const controller = createTurnstileController(container);
        controllerRef.current = controller;
        return () => {
            controller.destroy();
            if (controllerRef.current === controller) controllerRef.current = null;
        };
    }, []);

    return {
        containerRef,
        /** Asked for at the last moment: a token is short-lived and single-use. */
        getToken: () => controllerRef.current?.getToken() ?? Promise.resolve(null),
        /** A token is spent by every send, whatever its outcome. */
        reset: () => controllerRef.current?.reset(),
    };
};
