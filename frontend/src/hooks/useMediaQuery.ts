import { useEffect, useState } from 'react';

/** Phone layout, the one breakpoint the components themselves branch on. */
export const PHONE_QUERY = '(max-width: 640px)';
/** Stacked layout: the drawing beside the chat moves below it. */
export const STACKED_QUERY = '(max-width: 900px)';
/** Chat and drawing side by side, with room for the chat to grow to the screen's height. */
export const GROW_QUERY = '(min-width: 901px) and (min-height: 620px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const list = window.matchMedia(query);
        const onChange = () => setMatches(list.matches);
        onChange();
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);
    return matches;
};
