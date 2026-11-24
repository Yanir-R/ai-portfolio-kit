import { useEffect, useRef, useState } from 'react';

export type Load<T> = { state: 'loading' } | { state: 'ready'; value: T } | { state: 'failed' };

/**
 * One fetch, keyed: a new key (another slug or language) starts over, and
 * `retry` runs the same fetch again. A result that arrives after the key has
 * changed is dropped.
 */
export const useLoad = <T>(key: string, fetch: () => Promise<T>): [Load<T>, () => void] => {
    const fetchRef = useRef(fetch);
    const [attempt, setAttempt] = useState(0);
    const full = `${key}#${attempt}`;
    const [load, setLoad] = useState<{ key: string; value: Load<T> }>({
        key: '',
        value: { state: 'loading' },
    });

    // Declared first, so the fetch below always runs the latest closure.
    useEffect(() => {
        fetchRef.current = fetch;
    });

    useEffect(() => {
        let cancelled = false;
        fetchRef.current().then(
            (value) => !cancelled && setLoad({ key: full, value: { state: 'ready', value } }),
            () => !cancelled && setLoad({ key: full, value: { state: 'failed' } })
        );
        return () => {
            cancelled = true;
        };
    }, [full]);

    return [load.key === full ? load.value : { state: 'loading' }, () => setAttempt((n) => n + 1)];
};
