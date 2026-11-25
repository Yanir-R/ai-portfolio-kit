/*
 * The discovery call on cal.com. The free times are read straight from
 * cal.com's public slots endpoint; the booking itself goes through our
 * backend (/api/booking), which names the same event on its side.
 */
export const CAL = {
    api: 'https://api.cal.com/v2/slots',
    /** cal.com versions each endpoint by header; this is the slots endpoint's. */
    apiVersion: '2024-09-04',
    username: 'yanirrot',
    eventSlug: 'zoom-call',
    minutes: 30,
} as const;

/** Times are shown and booked in Israel time, on a 24-hour clock. */
export const BOOKING_TIME_ZONE = 'Asia/Jerusalem';
