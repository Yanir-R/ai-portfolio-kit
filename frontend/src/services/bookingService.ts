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

export type BookOutcome = { ok: true; booking: Booked } | { ok: false; reason: 'taken' | 'failed' };

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
            const taken = axios.isAxiosError(error) && error.response?.status === 409;
            return { ok: false, reason: taken ? 'taken' : 'failed' };
        }
    },
};
