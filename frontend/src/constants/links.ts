/*
 * Every outside address the site links to, in one place. Nothing here is a
 * secret: each one is printed on the public page.
 */
export const LINKS = {
    /** Booking for the 20-30 minute discovery call. */
    booking: 'https://cal.com/yanirrot/zoom-call',
    linkedin: 'https://www.linkedin.com/in/yanirrot/',
    github: 'https://github.com/Yanir-R',
    personakit: 'https://personakit.me',
    personakitDocs: 'https://personakit.me/docs',
    /** The repository of this site, which is public. */
    siteRepo: 'https://github.com/Yanir-R/ai-portfolio-kit',
} as const;

/** The public host, as written in copy ("yanirrot.com"). */
export const SITE_HOST = 'yanirrot.com';

/*
 * Parts of the design that are not live yet. Off means the part is not
 * rendered at all, so nothing half-working reaches a visitor.
 *
 *   whatsapp  - the WhatsApp routes. The number is never in this repository.
 *   cvPdf     - a CV file to download. While off, the CV dialog shows the
 *               on-site view only.
 */
export const FEATURES = {
    whatsapp: false,
    cvPdf: false,
} as const;
