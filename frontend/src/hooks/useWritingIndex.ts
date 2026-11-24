import { useEffect, useState } from 'react';
import { writingService } from '@/services/writingService';
import { WritingIndex } from '@/types/writing';

/**
 * The writing index, shared by every caller on the page. `null` while it
 * loads or when it could not be fetched: a card without its index draws
 * nothing rather than a guess.
 */
export const useWritingIndex = (): WritingIndex | null => {
    const [index, setIndex] = useState<WritingIndex | null>(null);

    useEffect(() => {
        let cancelled = false;
        writingService
            .getIndex()
            .then((loaded) => {
                if (!cancelled) setIndex(loaded);
            })
            .catch(() => {
                // The cards are an addition to the answer, which is already on
                // screen; a failed index leaves the answer as it is.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return index;
};
