import { LINKS } from '@/constants/links';
import { Localized } from '@/i18n/lang';

/*
 * The CV as shown in the CV window, laid out like the CV document Yanir wrote
 * (one page, experience beside a narrow column of skills and projects), in
 * English and in Hebrew.
 *
 * backend/docs/profile/resume.md holds the longer version the chat answers
 * from. Keep the three in step: a change of title, date or fact goes in each.
 * As there, nothing here names the Stealth employer or describes its internal
 * systems. Yanir is a developer, never an "engineer" (מהנדס), except in the
 * Founding Engineer title he actually held.
 *
 * In bullet text, **bold** marks a highlight.
 */

export interface CvLink {
    label: string;
    href: string;
}

export interface CvRole {
    title: string;
    org: string;
    orgHref?: string;
    orgNote?: string;
    dates: string;
    lede?: string;
    bullets: string[];
}

export interface CvEntry {
    name: string;
    href?: string;
    text: string;
}

export interface CvDoc {
    name: string;
    role: string;
    email: string;
    links: CvLink[];
    summary: string;
    experience: CvRole[];
    earlier: string;
    skills: CvEntry[];
    projects: CvEntry[];
    education: CvEntry;
    spoken: string;
    headings: Record<
        'experience' | 'earlier' | 'skills' | 'projects' | 'education' | 'spoken',
        string
    >;
}

const EMAIL = 'rotyanir@gmail.com';

export const CV_DOC: Localized<CvDoc> = {
    en: {
        name: 'Yanir Rot',
        role: 'Full-Stack AI Developer',
        email: EMAIL,
        links: [
            { label: 'GitHub', href: LINKS.github },
            { label: 'LinkedIn', href: LINKS.linkedin },
            { label: 'Portfolio - live AI assistant', href: '/en' },
        ],
        summary:
            'Full-stack developer specializing in production LLM and multi-agent systems. As a founding engineer I went from building the chat frontend to owning correctness of the agent pipeline end to end - evidence provenance, hallucination prevention, token economics - a range that runs from a React component to a Helm chart. Since Sep 2026 I build PersonaKit and take on freelance AI development.',
        experience: [
            {
                title: 'Creator & Lead Developer',
                org: 'PersonaKit',
                orgHref: LINKS.personakit,
                orgNote: 'open source · Self-employed',
                dates: 'Since Sep 2026',
                bullets: [
                    'Building PersonaKit, open-source personal AI memory you can inspect, correct and take anywhere: it proposes short memories from local Claude Code and Codex sessions, each with the quote behind it.',
                    'Built review-engine, a review gate for coding-agent pull requests: a deterministic evidence pack, focused AI review lenses, then a verdict - **about 90 PRs in two days** across PersonaKit and personal projects.',
                    'Run a **40+ agent system** for research, content, cloud monitoring and business operations, with a written contract per agent, approval tiers for risky actions and one append-only audit log.',
                    'Freelance AI development: agents and LLM features end to end, reliability for existing agents, and GCP setup, monitoring and cost control.',
                ],
            },
            {
                title: 'Founding Engineer',
                org: 'Stealth',
                orgNote: 'employee #1',
                dates: 'Aug 2025 – Sep 2026',
                lede: 'Early-stage AI startup - production multi-agent LLM systems over Kubernetes, AWS and observability telemetry.',
                bullets: [
                    'Designed an evidence-provenance architecture so citations are bound to retrieved evidence instead of chosen by the model, **eliminating hallucinated evidence** at the source.',
                    'Reduced multi-agent token cost and latency through agent decomposition, context compaction and circuit-breaker enforcement.',
                    'Built a tool-failure guard with error-classified retry and self-healing query repair.',
                    'Shipped a linter validating LLM-generated queries before execution, and vector-backed semantic retrieval for agent skill hints.',
                    'Built Go and Python backend services across the event pipeline and session storage.',
                    'Built the product frontend in Next.js and React: chat and session architecture, direct SSE token streaming, evidence renderers, platform-wide light mode.',
                ],
            },
            {
                title: 'Full-Stack Developer',
                org: 'Moonsite',
                dates: '2023 – 2025',
                bullets: [
                    'Led frontend architecture for a sports-betting platform serving **500K+ daily active users and ~3M ILS daily cash flow**.',
                    'Managed development of a finance application used by major Israeli enterprises, from planning through deployment (React, TypeScript, SCSS).',
                ],
            },
            {
                title: 'Full-Stack Developer',
                org: 'Devforce',
                dates: '2022 – 2023',
                bullets: [
                    'Built an AI-powered image tagging system for a SaaS platform, improving tagging efficiency and data quality; revamped the order flow for a leading flight-booking platform (React, TypeScript, MobX, Next.js).',
                ],
            },
        ],
        earlier:
            'Automation Developer, Bond Sports (2021–2022) · Co-founder & Operations Manager, Tauora Products (2018–2019)',
        skills: [
            {
                name: 'AI & LLM',
                text: 'Multi-agent orchestration · RAG & embeddings · prompt engineering · Qdrant · Langfuse · Claude · Gemini / Vertex AI',
            },
            { name: 'Languages', text: 'Python · TypeScript · Go · JavaScript' },
            { name: 'Frontend', text: 'React · Next.js · TailwindCSS · React Native' },
            {
                name: 'Backend & data',
                text: 'Node.js · Kafka · Redis · MongoDB · Memgraph / Cypher',
            },
            { name: 'Infra & cloud', text: 'Kubernetes · Helm · ArgoCD · GCP · AWS' },
        ],
        projects: [
            {
                name: 'PersonaKit',
                href: LINKS.personakit,
                text: 'Open-source personal AI memory you can inspect, correct and take anywhere.',
            },
            {
                name: 'Video analysis service',
                text: 'Token-based access control and inference-cost optimization.',
            },
            {
                name: 'Hermes agent',
                text: 'Self-hosted 24/7 agent: custom persona, Obsidian-vault memory, Telegram interface.',
            },
            {
                name: 'Live AI assistant',
                text: 'Doc-aware assistant on Vertex AI Gemini, hardened against prompt injection.',
            },
        ],
        education: { name: 'Practical Software Engineer', text: 'Technion, Tel Aviv · 2019-2020' },
        spoken: 'English - fluent · Hebrew - native',
        headings: {
            experience: 'Experience',
            earlier: 'Earlier:',
            skills: 'Skills',
            projects: 'Projects',
            education: 'Education',
            spoken: 'Spoken',
        },
    },
    he: {
        name: 'יניר רוט',
        role: 'מפתח Full-Stack בתחום ה-AI',
        email: EMAIL,
        links: [
            { label: 'GitHub', href: LINKS.github },
            { label: 'LinkedIn', href: LINKS.linkedin },
            { label: 'האתר, עם עוזר AI חי', href: '/' },
        ],
        summary:
            'מפתח Full-Stack שמתמחה במערכות LLM ובמערכות מרובות סוכנים בפרודקשן. כ-Founding Engineer התחלתי בבניית ממשק הצ׳אט והגעתי לאחריות על נכונות צינור הסוכנים מקצה לקצה: מאיפה מגיעה כל ראיה, איך מונעים הזיות, וכמה עולה כל שאלה בטוקנים. הטווח שלי מתחיל בקומפוננטת React ונגמר ב-Helm chart. מאז ספטמבר 2026 אני בונה את PersonaKit ומפתח פתרונות AI כפרילנסר.',
        experience: [
            {
                title: 'יוצר ומפתח ראשי',
                org: 'PersonaKit',
                orgHref: LINKS.personakit,
                orgNote: 'קוד פתוח · עצמאי',
                dates: 'מספטמבר 2026',
                bullets: [
                    'בונה את PersonaKit, זיכרון AI אישי בקוד פתוח שאפשר לבדוק, לתקן ולקחת לכל מקום. הכלי מציע זיכרונות קצרים מתוך סשנים מקומיים של Claude Code ו-Codex, וכל זיכרון מגיע עם הציטוט שעליו הוא מבוסס.',
                    'בניתי את review-engine, שער בדיקה ל-pull requests של סוכני קוד: חבילת ראיות דטרמיניסטית, כמה זוויות בדיקה ממוקדות של AI, ואז הכרעה. **כ-90 PRs ביומיים** ב-PersonaKit ובפרויקטים אישיים.',
                    'מפעיל **מערכת של יותר מ-40 סוכנים** למחקר, תוכן, ניטור ענן ותפעול עסקי, עם חוזה כתוב לכל סוכן, רמות אישור לפעולות רגישות, ויומן ביקורת אחד שאי אפשר למחוק ממנו.',
                    'פיתוח AI כפרילנסר: סוכנים ופיצ׳רים מבוססי LLM מקצה לקצה, שיפור האמינות של סוכנים קיימים, והקמה, ניטור ובקרת עלויות ב-GCP.',
                ],
            },
            {
                title: 'Founding Engineer',
                org: 'Stealth',
                orgNote: 'העובד הראשון',
                dates: 'אוגוסט 2025 – ספטמבר 2026',
                lede: 'סטארטאפ AI בשלב מוקדם: מערכות LLM מרובות סוכנים בפרודקשן, על גבי Kubernetes, AWS ונתוני ניטור.',
                bullets: [
                    'תכננתי ארכיטקטורה שבה כל ציטוט קשור לראיה שנשלפה בפועל ולא נבחר על ידי המודל, וכך **ראיות מומצאות נעלמו מהשורש**.',
                    'הורדתי את עלות הטוקנים ואת זמני התגובה של מערכת מרובת סוכנים, בעזרת פירוק סוכנים, דחיסת הקשר ו-circuit breaker.',
                    'בניתי מנגנון שמגן מכשלים בכלים, עם ניסיון חוזר לפי סוג השגיאה ותיקון עצמי של שאילתות.',
                    'הוספתי linter שבודק שאילתות שה-LLM כותב לפני שהן רצות, ושליפה סמנטית מבוססת וקטורים שמציעה לסוכנים את הכלים המתאימים.',
                    'בניתי שירותי backend ב-Go וב-Python לאורך צינור האירועים ושמירת הסשנים.',
                    'בניתי את ה-frontend של המוצר ב-Next.js וב-React: ארכיטקטורת צ׳אט וסשנים, הזרמת טוקנים ישירה ב-SSE, תצוגת ראיות, ומצב בהיר לכל הפלטפורמה.',
                ],
            },
            {
                title: 'מפתח Full-Stack',
                org: 'Moonsite',
                dates: '2023 – 2025',
                bullets: [
                    'הובלתי את ארכיטקטורת ה-frontend של פלטפורמת הימורי ספורט עם **יותר מ-500 אלף משתמשים פעילים ביום ותזרים יומי של כ-3 מיליון ש״ח**.',
                    'ניהלתי את הפיתוח של אפליקציה פיננסית שמשמשת ארגונים גדולים בישראל, מהתכנון ועד העלייה לאוויר, עם React, TypeScript ו-SCSS.',
                ],
            },
            {
                title: 'מפתח Full-Stack',
                org: 'Devforce',
                dates: '2022 – 2023',
                bullets: [
                    'בניתי מערכת לתיוג תמונות מבוססת AI לפלטפורמת SaaS, ששיפרה את יעילות התיוג ואת איכות הנתונים. בניתי מחדש את תהליך ההזמנה של פלטפורמה מובילה להזמנת טיסות. עבדתי עם React, TypeScript, MobX ו-Next.js.',
                ],
            },
        ],
        earlier:
            'מפתח אוטומציה, Bond Sports (2021–2022) · שותף מייסד ומנהל תפעול, Tauora Products (2018–2019)',
        skills: [
            {
                name: 'AI ו-LLM',
                text: 'תזמור מערכות מרובות סוכנים · RAG ו-embeddings · כתיבת פרומפטים · Qdrant · Langfuse · Claude · Gemini / Vertex AI',
            },
            { name: 'שפות תכנות', text: 'Python · TypeScript · Go · JavaScript' },
            { name: 'Frontend', text: 'React · Next.js · TailwindCSS · React Native' },
            {
                name: 'Backend ונתונים',
                text: 'Node.js · Kafka · Redis · MongoDB · Memgraph / Cypher',
            },
            { name: 'תשתיות וענן', text: 'Kubernetes · Helm · ArgoCD · GCP · AWS' },
        ],
        projects: [
            {
                name: 'PersonaKit',
                href: LINKS.personakit,
                text: 'זיכרון AI אישי בקוד פתוח שאפשר לבדוק, לתקן ולקחת לכל מקום.',
            },
            {
                name: 'שירות לניתוח וידאו',
                text: 'בקרת גישה מבוססת טוקנים וחיסכון בעלויות הרצת המודלים.',
            },
            {
                name: 'הסוכן Hermes',
                text: 'סוכן שרץ אצלי 24/7: פרסונה משלו, זיכרון בכספת Obsidian, וממשק בטלגרם.',
            },
            {
                name: 'עוזר AI חי באתר',
                text: 'עוזר שעונה מתוך המסמכים שלי, על Vertex AI Gemini, ומוגן מפני prompt injection.',
            },
        ],
        education: { name: 'הנדסאי תוכנה', text: 'הטכניון, תל אביב · 2019–2020' },
        spoken: 'עברית: שפת אם · אנגלית: שוטפת',
        headings: {
            experience: 'ניסיון',
            earlier: 'קודם לכן:',
            skills: 'כישורים',
            projects: 'פרויקטים',
            education: 'השכלה',
            spoken: 'שפות',
        },
    },
};
