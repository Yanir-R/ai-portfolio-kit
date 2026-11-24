import { useEffect, useState } from 'react';
import { writingService } from '@/services/writingService';
import { WritingIndex } from '@/types/writing';

/**
 * The writing index, fetched once and shared by every caller on the page,
 * with whether the fetch failed, for a page that has to say so.
 */
export const useWritingIndexState = (): { index: WritingIndex | null; failed: boolean } => {
    const [state, setState] = useState<{ index: WritingIndex | null; failed: boolean }>({
        index: null,
        failed: false,
    });

    useEffect(() => {
        let cancelled = false;
        writingService
            .getIndex()
            .then((index) => !cancelled && setState({ index, failed: false }))
            .catch(() => !cancelled && setState({ index: null, failed: true }));
        return () => {
            cancelled = true;
        };
    }, []);

    return state;
};

/**
 * The index alone, for cards that are an addition to something already on
 * screen: `null` while it loads or when it failed, and the card draws nothing.
 */
export const useWritingIndex = (): WritingIndex | null => useWritingIndexState().index;
