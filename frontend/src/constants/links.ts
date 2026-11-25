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
    /** Trinity Agent, my always-on assistant, has its own page on the PersonaKit site. */
    trinity: 'https://personakit.me/trinity',
    /** The repository of this site, which is public. */
    siteRepo: 'https://github.com/Yanir-R/ai-portfolio-kit',
} as const;

/** The public host, as written in copy ("yanirrot.com"). */
export const SITE_HOST = 'yanirrot.com';

/*
 * The business WhatsApp number, digits only with the country code. It is
 * shown on the page, but it is not kept in this repository: the build reads
 * it from VITE_WHATSAPP_NUMBER (a repository variable in CI). Empty means the
 * WhatsApp routes are not rendered.
 */
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

/** A chat with the business number, the visitor's first line prefilled. */
export const whatsappUrl = (text?: string): string =>
    `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/*
 * Parts of the design that can be off. Off means the part is not rendered at
 * all, so nothing half-working reaches a visitor.
 *
 *   whatsapp  - the WhatsApp routes, on when the build has a number.
 *   cvPdf     - a CV file to download. While off, the CV dialog shows the
 *               on-site view only.
 */
export const FEATURES = {
    whatsapp: WHATSAPP_NUMBER.length > 0,
    cvPdf: false,
} as const;
