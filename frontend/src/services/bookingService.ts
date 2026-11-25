import axios from 'axios';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { BOOKING_TIME_ZONE, CAL } from '@/constants/booking';
import { TURNSTILE_HEADER } from '@/constants/turnstile';

/** One free slot, as ISO times with Israel's offset (e.g. 2026-11-26T09:00:00.000+02:00). */
export interface Slot {
    start: string;
    end: string;
}

/** Free slots by day (YYYY-MM-DD, in Israel time). */
export type SlotsByDay = Record<string, Slot[]>;

export interface Booked {
    uid: string;
    start: string;
    end: string;
}

/*
 * Why a booking did not go through, as a code: BookingFlow words it in the
 * page's language. Each one tells the visitor something different to do.
 *  - taken: the slot is gone (409), or it is already in the past (a 422 about
 *    `start`): pick another time.
 *  - unverified: the Worker's bot check refused it (403): send again.
 *  - busy: rate limited (429): wait, for `retryAfter` seconds when known.
 *  - invalid: the details were refused (any other 422): check name and email.
 *  - failed: the server or the network failed (5xx, no answer): try again,
 *    or book on cal.com directly.
 */
export type BookFailure = 'taken' | 'unverified' | 'busy' | 'invalid' | 'failed';

export type BookOutcome =
    { ok: true; booking: Booked } | { ok: false; reason: BookFailure; retryAfter?: number };

const toBookFailure = (error: unknown): { reason: BookFailure; retryAfter?: number } => {
    if (!axios.isAxiosError(error) || !error.response) return { reason: 'failed' };
    const { status, data, headers } = error.response;
    if (status === 409) return { reason: 'taken' };
    if (status === 403) return { reason: 'unverified' };
    if (status === 429) {
        const retryAfter = Number(headers?.['retry-after']);
        return {
            reason: 'busy',
            retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        };
    }
    if (status === 422) {
        // The backend's own 422s name the field; a stale start time is a slot
        // problem, not a typo. FastAPI's validation 422 has a list as `detail`.
        const detail = typeof data?.detail === 'string' ? data.detail : '';
        return { reason: detail.startsWith('start') ? 'taken' : 'invalid' };
    }
    return { reason: 'failed' };
};

export interface BookingDetails {
    start: string;
    name: string;
    email: string;
    notes: string;
    lang: 'he' | 'en';
}

export const bookingService = {
    /** The free slots between two days, inclusive. Throws when cal.com cannot be read. */
    async slots(from: string, to: string): Promise<SlotsByDay> {
        const url = new URL(CAL.api);
        url.search = new URLSearchParams({
            eventTypeSlug: CAL.eventSlug,
            username: CAL.username,
            start: from,
            end: to,
            timeZone: BOOKING_TIME_ZONE,
            format: 'range',
        }).toString();
        const response = await fetch(url, { headers: { 'cal-api-version': CAL.apiVersion } });
        if (!response.ok) throw new Error(`cal.com slots: ${response.status}`);
        const body = (await response.json()) as { data?: SlotsByDay };
        return body.data ?? {};
    },

    async book(details: BookingDetails, turnstileToken: string | null): Promise<BookOutcome> {
        try {
            const { data } = await apiClient.post<{ booking: Booked }>(
                API_ENDPOINTS.BOOKING,
                details,
                turnstileToken ? { headers: { [TURNSTILE_HEADER]: turnstileToken } } : undefined
            );
            return { ok: true, booking: data.booking };
        } catch (error) {
            console.error('Booking failed:', error);
            return { ok: false, ...toBookFailure(error) };
        }
    },
};
