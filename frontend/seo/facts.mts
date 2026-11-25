/**
 * Who Yanir is, stated once for every machine reader of the site.
 *
 * The JSON-LD in index.html, the per-page structured data and llms.txt are all
 * built from this file, so a fact changes in one place. Everything here has to
 * be something the site itself says in backend/docs/profile/ - structured data
 * that claims more than the pages do is the kind of mismatch search engines
 * penalise and assistants repeat.
 *
 * House rules that bear on this file:
 *   - never "engineer" as his own title: he has no degree, so "developer";
 *     past job titles such as Stealth's "Founding Engineer" stay as they were
 *   - PersonaKit: "creator and lead developer", open source, linked to
 *     personakit.me and personakit.me/docs
 *   - the Trinity Legal client is never named; review-engine's code is private
 *   - the agent fleet is "more than 40 agents", nothing more specific
 *   - no email address here: see the comment in index.html
 */

export const PERSON = {
    name: 'Yanir Rot',
    nameHe: 'יניר רוט',
    jobTitle: 'AI agent developer',
    jobTitleHe: 'מפתח סוכני AI',
    // Shown as the site's <title> suffix and in og:site_name.
    siteName: 'Yanir Rot',
    tagline: 'AI agents and systems for businesses',
    taglineHe: 'סוכני AI ומערכות לעסקים',
    description:
        'I build AI agents and systems for organizations, small businesses and public ' +
        'authorities, and I start by helping you understand the problem. I run more than ' +
        '40 agents of my own every day. I also build custom CRM systems that are ready ' +
        'for AI, and tailored systems for small professional offices. Creator and lead ' +
        'developer of PersonaKit, open-source memory for AI assistants. Open to freelance ' +
        'projects, a full-time role or a contract.',
    // The same, in Hebrew, for the Hebrew home page's crawler copy.
    descriptionHe:
        'אני בונה סוכני AI ומערכות לארגונים, לעסקים קטנים ולרשויות, ומתחיל בלהבין איתכם את ' +
        'הבעיה. אני מריץ כל יום יותר מ-40 סוכנים משלי. אני בונה גם מערכות CRM בהתאמה ' +
        'אישית שמוכנות ל-AI, ומערכות מותאמות למשרדים מקצועיים קטנים. יוצר ומפתח ראשי של ' +
        'PersonaKit, זיכרון בקוד פתוח לעוזרי AI. פתוח לפרויקטים כפרילנסר, למשרה מלאה או לחוזה.',
    knowsAbout: [
        'AI agents',
        'Multi-agent AI systems',
        'Large language model applications',
        'Retrieval-augmented generation',
        'Grounding and citation correctness',
        'LLM token cost',
        'AI code review',
        'CRM systems',
        'Model Context Protocol',
        'React',
        'TypeScript',
        'Python',
        'FastAPI',
        'Kubernetes',
        'Google Cloud',
    ],
    knowsLanguage: ['he', 'en'],
    sameAs: [
        'https://github.com/Yanir-R',
        'https://www.linkedin.com/in/yanirrot/',
        'https://medium.com/@Yanir_Rot',
    ],
    bookingUrl: 'https://cal.com/yanirrot/zoom-call',
} as const;

/**
 * The home page's share card and search snippet, Hebrew at / and English at
 * /en. index.html repeats the Hebrew strings (it cannot import this file),
 * tools/og-card.html draws them onto og-image.png and og-image-en.png, and
 * src/copy/routes.ts repeats the titles; `npm run check:preview-copy` asserts
 * they all still agree.
 */
export const HOME_SHARE = {
    title: 'יניר רוט | פיתוח סוכני AI ומערכות CRM לעסקים',
    description:
        'סוכנים ומערכות לעסקים קטנים, למשרדים ולרשויות. הצעד הראשון הוא שיחת אבחון של 20 דקות.',
    headline: 'אני בונה סוכני AI לעסקים. ומתחיל מהבעיה, לא מהטכנולוגיה.',
    titleEn: 'Yanir Rot | AI agent and CRM development for businesses',
    descriptionEn:
        'Agents and systems for small businesses, offices and local authorities. It starts with a 20-minute discovery call.',
} as const;

export const PERSONAKIT = {
    name: 'PersonaKit',
    url: 'https://personakit.me',
    docs: 'https://personakit.me/docs',
    code: 'https://github.com/Yanir-R/personaKit',
} as const;

/** Trinity Agent, formerly shown as Hermes; its own page lives on personakit.me. */
export const TRINITY = {
    name: 'Trinity Agent',
    url: 'https://personakit.me/trinity',
} as const;

/** The site-wide graph: Person, WebSite, ProfilePage and the service offer. */
export const siteGraph = (siteUrl: string) => {
    const person = `${siteUrl}/#person`;
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Person',
                '@id': person,
                name: PERSON.name,
                alternateName: PERSON.nameHe,
                url: `${siteUrl}/`,
                image: `${siteUrl}/og-image.png`,
                jobTitle: PERSON.jobTitle,
                description: PERSON.description,
                knowsAbout: PERSON.knowsAbout,
                knowsLanguage: PERSON.knowsLanguage,
                address: { '@type': 'PostalAddress', addressCountry: 'IL' },
                sameAs: PERSON.sameAs,
            },
            {
                // The freelance offer as a service, so a search for "AI agent
                // developer Israel" can match it to a provider with an area.
                // No price: there is no published rate.
                '@type': 'ProfessionalService',
                '@id': `${siteUrl}/#service`,
                name: `${PERSON.name} - ${PERSON.tagline}`,
                alternateName: `${PERSON.nameHe} - ${PERSON.taglineHe}`,
                url: `${siteUrl}/`,
                image: `${siteUrl}/og-image.png`,
                founder: { '@id': person },
                areaServed: { '@type': 'Country', name: 'Israel' },
                availableLanguage: ['Hebrew', 'English'],
                knowsAbout: ['AI agents', 'CRM systems', 'LLM reliability'],
                description:
                    'AI agents that do real work inside your processes, custom CRM systems ' +
                    'ready for AI, tailored systems for small professional offices, and ' +
                    'making existing LLM systems reliable. It starts with a 20 to 30 minute ' +
                    'call to understand what you need, then a proposal and a price.',
                potentialAction: {
                    '@type': 'ReserveAction',
                    name: 'Book a short call',
                    target: PERSON.bookingUrl,
                },
            },
            {
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: `${siteUrl}/`,
                name: PERSON.siteName,
                alternateName: PERSON.nameHe,
                description:
                    'Yanir Rot builds AI agents and systems for businesses. The site has his ' +
                    'projects, his writing, and an assistant that answers from his own notes ' +
                    'and declines when they do not cover the question.',
                inLanguage: 'en',
                author: { '@id': person },
                publisher: { '@id': person },
            },
            {
                '@type': 'ProfilePage',
                '@id': `${siteUrl}/#profilepage`,
                url: `${siteUrl}/`,
                isPartOf: { '@id': `${siteUrl}/#website` },
                about: { '@id': person },
                mainEntity: { '@id': person },
                name: `${PERSON.name} - ${PERSON.tagline}`,
            },
        ],
    };
};
