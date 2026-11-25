import { useEffect, useState } from 'react';
import { GEO_TRACE_PATH, HOME_COUNTRY, LANG_OFFER_KEY } from '@/constants/geo';
import { Lang } from '@/i18n/lang';

const answered = (): boolean => {
    try {
        return localStorage.getItem(LANG_OFFER_KEY) !== null;
    } catch {
        return false;
    }
};

const remember = () => {
    try {
        localStorage.setItem(LANG_OFFER_KEY, '1');
    } catch {
        // Private mode: the offer may show again next visit, nothing worse.
    }
};

/** The country Cloudflare saw the request come from, or null when it cannot say. */
const countryOf = async (): Promise<string | null> => {
    try {
        const res = await fetch(GEO_TRACE_PATH, { cache: 'no-store' });
        if (!res.ok) return null;
        return (await res.text()).match(/^loc=([A-Z]{2})$/m)?.[1] ?? null;
    } catch {
        return null;
    }
};

/** Whether the browser lists Hebrew among its languages ("iw" is Hebrew's old code). */
const readsHebrew = (): boolean =>
    (navigator.languages?.length ? navigator.languages : [navigator.language]).some((l) =>
        /^(he|iw)\b/i.test(l)
    );

/**
 * Whether to offer English on a Hebrew page: only to a visitor from outside
 * Israel, whose browser does not list Hebrew, and who has not answered
 * before (closing the bar or opening the English site both count). Never a
 * redirect, so search engines and shared links always get the page they
 * asked for.
 */
export const useLangOffer = (lang: Lang): { show: boolean; dismiss: () => void } => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (lang === 'en') {
            remember();
            return;
        }
        if (answered() || readsHebrew()) return;
        let cancelled = false;
        countryOf().then((country) => {
            if (!cancelled && country && country !== HOME_COUNTRY) setShow(true);
        });
        return () => {
            cancelled = true;
        };
    }, [lang]);

    return {
        show: show && lang === 'he',
        dismiss: () => {
            remember();
            setShow(false);
        },
    };
};
