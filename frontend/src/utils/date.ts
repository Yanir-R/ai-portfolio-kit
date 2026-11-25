import { Lang } from '@/i18n/lang';

const parseIso = (iso: string): Date | null => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
};

/**
 * An ISO date as a reader's date. The index abbreviates the month to keep the
 * meta column narrow; a piece's own header spells it out.
 *
 * Parsed as UTC deliberately: `new Date('2025-11-25')` is midnight UTC, and
 * formatting that in a timezone behind UTC would show the 24th.
 */
export const formatIsoDate = (iso: string, month: 'short' | 'long'): string =>
    parseIso(iso)?.toLocaleDateString('en-GB', {
        day: 'numeric',
        month,
        year: 'numeric',
        timeZone: 'UTC',
    }) ?? iso;

/**
 * A date the way each language writes it on the site: "19.11.26" in Hebrew,
 * "19 Nov 2026" in English. `short` drops the year ("19.11" / "19 Nov").
 */
export const formatDate = (iso: string, lang: Lang, short = false): string => {
    const date = parseIso(iso);
    if (!date) return iso;
    if (lang === 'he') {
        const dd = date.getUTCDate();
        const mm = date.getUTCMonth() + 1;
        return short ? `${dd}.${mm}` : `${dd}.${mm}.${String(date.getUTCFullYear()).slice(2)}`;
    }
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(short ? {} : { year: 'numeric' }),
        timeZone: 'UTC',
    });
};

/** Seconds as m:ss, for a video's length. Empty when unknown. */
export const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const s = Math.round(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
