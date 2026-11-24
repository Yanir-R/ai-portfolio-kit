import { Localized } from '@/i18n/lang';

/*
 * The home page's fixed copy, section by section, in both languages.
 * First person singular, in Yanir's voice. The chat and the drawing beside
 * it have their own copy in copy/chat.ts; the fleet in content/fleet.ts.
 */

interface SectionHead {
    tagline: string;
    /** The heading; `em` is the highlighted second half, when there is one. */
    title: string;
    em?: string;
    text: string;
}

export interface HomeCopy {
    hero: {
        tagline: string;
        title: string;
        em: string;
        /** The middle sentence is hidden on a phone. */
        lead: [string, string, string];
        cta: string;
        whatsapp: string;
    };
    build: SectionHead & {
        cards: { title: string; text: string; points: string[]; more: string }[];
    };
    proof: SectionHead & {
        evidenceLabel: string;
        promises: { title: string; text: string; evidence: string }[];
        alsoTitle: string;
        also: { tag: string; title: string; text: string; href?: string; open?: boolean }[];
    };
    fleet: SectionHead & {
        logTitle: string;
        logNote: string;
        log: { tag: string; date: string; title: string; text: string }[];
    };
    path: {
        title: string;
        label: string;
        years: { year: string; label: string; text: string }[];
    };
    how: SectionHead & { steps: { title: string; text: string }[] };
    brief: {
        tagline: string;
        title: string;
        text: string;
        what: { label: string; options: string[] };
        pain: { label: string; placeholder: string };
        how: {
            label: string;
            options: { id: 'call' | 'mail' | 'whatsapp'; label: string; send: string }[];
        };
        note: string;
    };
    faq: { tagline: string; title: string; items: { q: string; a: string }[] };
    posts: {
        tagline: string;
        title: string;
        text: string;
        all: string;
        kind: Record<string, string>;
    };
}

export const HOME: Localized<HomeCopy> = {
    he: {
        hero: {
            tagline: 'סוכני AI ומערכות לארגונים, לעסקים קטנים ולרשויות',
            title: 'אני בונה סוכני AI לעסקים.',
            em: 'ומתחיל מהבעיה, לא מהטכנולוגיה.',
            lead: [
                'צ׳אטבוט עונה על שאלות. סוכן AI עושה עבודה: קורא את המידע של העסק, פועל בכלים שלכם, ועוצר לאישור לפני צעד שאי אפשר לבטל.',
                'אצלי סוכנים כאלה חוקרים שוק עם מקורות, בודקים קוד ומנטרים מערכות בלילה.',
                'אני יניר, מפתח AI, והצ׳אט כאן הוא סוכן שבניתי.',
            ],
            cta: 'קבעו שיחת אבחון, 20 דקות',
            whatsapp: 'וואטסאפ',
        },
        build: {
            tagline: 'מה אני בונה',
            title: 'סוכנים, ומערכות שסוכנים עובדים בתוכן.',
            text: 'לא כל בעיה צריכה סוכן. לפעמים חסרה קודם מערכת שמחזיקה את המידע, ואז אני בונה אותה כך שסוכן יוכל לעבוד איתה.',
            cards: [
                {
                    title: 'סוכני AI',
                    text: 'סוכן שעושה חלק מוגדר מהעבודה, מתוך המידע שלכם, ויודע מתי לעצור ולהעביר לאדם.',
                    points: [
                        'עונה רק ממה שכתוב אצלכם, ואומר ״לא יודע״ כשאין תשובה',
                        'כל פעולה מתועדת: מה הוא ראה, מה הוא עשה וכמה זה עלה',
                        'אדם מאשר את מה שחשוב',
                    ],
                    more: 'בואו נבדוק איפה סוכן מתאים אצלכם',
                },
                {
                    title: 'CRM בהתאמה אישית',
                    text: 'קודם מערכת שנבנית סביב הדרך שבה אתם עובדים. כשהיא יציבה והמידע מסודר, אני מחבר אליה סוכן.',
                    points: [
                        'נבנית לפי הדרישות שלכם, לא תבנית מדף',
                        'בנויה מראש כך שחיבור AI יהיה מהיר',
                        'קודם המידע, אחר כך תוכנית, ורק אז סוכנים',
                    ],
                    more: 'לספר על הצורך',
                },
                {
                    title: 'מערכות מידע',
                    text: 'פיתוח מלא של המערכת שחסרה, מהמסך ועד השרת: מסמכים, תיקים, תורים, הרשאות.',
                    points: [
                        'ענן, גיבוי והרשאות מהיום הראשון',
                        'עברית ונייד',
                        'מוכנה לחיבור סוכן בהמשך',
                    ],
                    more: 'לספר על הצורך',
                },
            ],
        },
        proof: {
            tagline: 'איך אני עובד',
            title: 'שלוש הבטחות.',
            em: 'והוכחה לכל אחת.',
            text: 'מה אני מבטיח לפני שמכניסים סוכן לעסק, ואיפה זה כבר קרה. שמות הלקוחות נשארים אצלי.',
            evidenceLabel: 'איפה זה קרה',
            promises: [
                {
                    title: 'קודם מבינים, אחר כך בונים',
                    text: 'מתחילים מהתהליך ומהנתונים שלכם. AI נכנס רק כשהבסיס יציב ואמין.',
                    evidence:
                        'את TrinityLegal בניתי ללקוח, משרד עורכי דין, מתוך ישיבות אפיון איתם. 56,607 קבצים כבר בענן, והשלב הבא יצא לדרך: שילוב AI בעבודה השוטפת של המשרד.',
                },
                {
                    title: 'הסוכן שואל לפני שהוא פועל',
                    text: 'פעולה שאי אפשר לבטל לא יוצאת בלי אישור של בן אדם.',
                    evidence:
                        'אצלי, כל הודעה שסוכן רוצה לשלוח מחכה לאישור שלי. האישור תקף רק לנמען הזה ולנוסח הזה.',
                },
                {
                    title: 'רואים מה הסוכן קרא',
                    text: 'לא קופסה שחורה. לכל תשובה יש פירוט: מה הסוכן קיבל לקרוא, וכמה זמן זה לקח.',
                    evidence: 'באתר הזה, מתחת לכל תשובה של הסוכן. נסו אותו בראש העמוד.',
                },
            ],
            alsoTitle: 'ועוד ארבע מערכות שבניתי',
            also: [
                {
                    tag: 'רץ אצלי כל יום',
                    title: 'מערכת הסוכנים Trinity',
                    text: 'סוכנים בוואטסאפ ובטלגרם, עם כללי בטיחות, זיכרון ומשמרת לילה.',
                    href: '/#fleet',
                },
                {
                    tag: 'קוד פתוח · חינם',
                    title: 'PersonaKit ↗',
                    text: 'זיכרון לסוכני AI שאפשר לקרוא, לבדוק ולתקן. מורידים ומשתמשים: personakit.me',
                    open: true,
                },
                {
                    tag: 'פול־סטאק',
                    title: 'TrinityCRM',
                    text: 'CRM שנבנה סביב עסק אחד: תורים, לקוחות ותזכורות. מוכן לחיבור סוכן.',
                    href: '/projects/trinity-crm',
                },
                {
                    tag: 'סוכן בודק סוכן',
                    title: 'מנוע הביקורת',
                    text: 'סוכן אחד כותב, סוכן אחר בודק, ורק אז זה מגיע לאדם.',
                    href: '/projects/review-engine',
                },
            ],
        },
        fleet: {
            tagline: 'מערך הסוכנים שלי',
            title: 'יותר מ־40 סוכנים.',
            em: 'ראש אחד.',
            text: 'לפני שאני בונה סוכנים לכם, אני מריץ אותם אצלי כל יום. כל נקודה היא סוכן אחד. עברו עליה עם העכבר, או הקישו עליה, כדי לראות למה הוא קיים.',
            logTitle: 'מהיומן של המערך',
            logNote: 'שלושה מקרים אמיתיים מנובמבר 2026',
            log: [
                {
                    tag: 'תפס סתירה',
                    date: '12.11',
                    title: 'מספר בלי מקור לא נכנס לדוח',
                    text: 'כלל במערך: כל נתון חייב מקור. במחקר שוק סוכן אחד הביא נתון על עלייה של 60%. מול המקורות שנאספו התברר שהם מראים בערך 35%. המספר המנופח נעצר לפני שנכנס לדוח, ולפני שהתקבלה החלטה על סמך נתון שגוי.',
                },
                {
                    tag: 'עבד מאחורי הקלעים',
                    date: '12.11',
                    title: 'ארבעה סוכנים, יום אחד, אפס הודעות שיצאו',
                    text: 'רציתי לדעת אם יש ביקוש למוצר לפני שמשקיעים בו חודשים. ארבעה סוכנים עבדו במקביל: אחד אסף נתוני שוק עם מקורות, אחד איתר 28 אנשי מקצוע, אחד כתב 22 טיוטות פנייה אישיות ואחד סיכם הכול לדוח. שום הודעה לא יצאה. שליחה מחכה לאישור שלי על הנמען ועל הנוסח.',
                },
                {
                    tag: 'נתפס בזכות התיעוד',
                    date: '24.11',
                    title: 'סוכן שתק שבוע, וידעתי מאיפה להמשיך',
                    text: 'בדיקת הבריאות סימנה באדום סוכן שלא רץ יותר משבוע, בלי שום שגיאה. כל סוכן משאיר סימן על הנקודה האחרונה שעיבד, ולכן היה ברור מתי הוא התעדכן לאחרונה. משם הוא משלים את כל מה שקרה בינתיים, ולא נשאר באפלה.',
                },
            ],
        },
        path: {
            title: 'הדרך לכאן',
            label: 'ציר הזמן',
            years: [
                {
                    year: '2021',
                    label: 'בדיקות אוטומטיות',
                    text: 'התחלתי מלבדוק מערכות מקצה לקצה, ולמצוא איפה הן נשברות.',
                },
                {
                    year: '2022',
                    label: 'פיתוח פול־סטאק',
                    text: 'מערכת תיוג תמונות מבוססת AI לסטארט־אפ, ותהליך הזמנה חדש לאתר טיסות.',
                },
                {
                    year: '2023',
                    label: '500 אלף+ משתמשים ביום',
                    text: 'הובלתי את ארכיטקטורת הפרונטאנד של פלטפורמה עם יותר מ־500 אלף משתמשים ביום, ומערכת פיננסית לארגונים.',
                },
                {
                    year: '2025',
                    label: 'צוות מייסד בסטארט־אפ',
                    text: '13 חודשים על מערכת מרובת סוכנים שחוקרת תקלות פרודקשן ומציגה ראיות לכל מסקנה.',
                },
                {
                    year: '2026',
                    label: 'Trinity',
                    text: 'סוכנים ומערכות לעסקים: TrinityLegal בפיילוט עם לקוחות, יותר מ־40 סוכנים שרצים אצלי כל יום, ו־PersonaKit בקוד פתוח.',
                },
            ],
        },
        how: {
            tagline: 'איך עובדים איתי',
            title: 'ארבעה שלבים. בסוף זה שלכם.',
            text: 'מתחילים מהבנת הבעיה ולא מהטכנולוגיה. לפעמים המסקנה היא שלא צריך סוכן בכלל, וגם את זה אני אומר.',
            steps: [
                { title: 'ממפים', text: 'מי עושה מה, באיזה כלי, ואיפה המידע נמצא. בתרשים אחד.' },
                { title: 'מוצאים את הפער', text: 'איפה הולך הזמן, ואיפה סוכן באמת יעזור.' },
                { title: 'בונים', text: 'על המידע האמיתי שלכם, עם בדיקות, ובשלבים קצרים ומהירים.' },
                { title: 'מוסרים', text: 'תיעוד והדרכה, כדי שהמערכת לא תהיה תלויה בי.' },
            ],
        },
        brief: {
            tagline: 'הצעד הבא',
            title: 'ספרו לי מה אתם צריכים.',
            text: 'שלוש לחיצות ומשפט אחד. אני חוזר אליכם עם שאלות, ואחרי שהבנתי את הדרישות אתם מקבלים הצעה כתובה.',
            what: {
                label: 'מה מעניין אתכם?',
                options: ['סוכן AI', 'CRM עם סוכנים', 'מערכת אחרת', 'עוד לא יודעים'],
            },
            pain: {
                label: 'במשפט אחד, מה הייתם רוצים שיעבוד אחרת?',
                placeholder: 'למשל: שלושה אנשים עונים כל יום על אותן שאלות של לקוחות',
            },
            how: {
                label: 'איך לחזור אליכם?',
                options: [
                    { id: 'call', label: 'שיחת וידאו', send: 'קבעו שיחת וידאו' },
                    { id: 'mail', label: 'מייל', send: 'שלחו במייל' },
                    { id: 'whatsapp', label: 'וואטסאפ', send: 'שלחו בוואטסאפ' },
                ],
            },
            note: 'בלי מחירון ובלי התחייבות. קודם מבינים מה צריך.',
        },
        faq: {
            tagline: 'שאלות ששואלים אותי תמיד',
            title: 'תכלס.',
            items: [
                {
                    q: 'כמה זה עולה?',
                    a: 'אין לי מחירון, כי שני פרויקטים של ״סוכן״ יכולים להיות שונים פי עשרה. מספרים לי מה צריך, אני שואל כמה שאלות, ואתם מקבלים הצעה כתובה לפני שמתחילים.',
                },
                {
                    q: 'איך יודעים שהסוכן לא ימציא דברים?',
                    a: 'הוא עונה רק מתוך המידע שלכם, אומר כשאין לו תשובה, וכל תשובה מתועדת עם המקור שלה. ככה בנוי גם הסוכן באתר הזה, ואפשר לנסות להכשיל אותו.',
                },
                {
                    q: 'אנחנו לא חברת הייטק. זה מתאים לנו?',
                    a: 'כן. המיפוי נעשה בשפה של העסק, ורוב העבודה היא להבין את התהליך ולא לדבר על מודלים.',
                },
                {
                    q: 'מה קורה אחרי שסיימת?',
                    a: 'הקוד, המערכת והתיעוד נשארים אצלכם. אפשר להמשיך איתי בליווי, ואפשר שלא.',
                },
            ],
        },
        posts: {
            tagline: 'מהבלוג · שלושת האחרונים',
            title: 'מה שאני לומד מהעבודה עם סוכני AI.',
            text: 'על סוכנים בעבודה אמיתית: מה עובד, מה נשבר, ומה למדתי בדרך.',
            all: 'לכל הבלוג',
            kind: { post: 'פוסט', article: 'מאמר' },
        },
    },
    en: {
        hero: {
            tagline:
                'AI agents and systems for organizations, small businesses and local authorities',
            title: 'I build AI agents for businesses.',
            em: 'And I start from the problem, not the technology.',
            lead: [
                "A chatbot answers questions. An AI agent does work: it reads your business data, acts in the tools you already use, and stops for approval before any step that can't be undone.",
                'Mine research markets with sources, review code and watch systems overnight.',
                "I'm Yanir, an AI developer, and the chat here is an agent I built.",
            ],
            cta: 'Book a 20-minute call',
            whatsapp: 'WhatsApp',
        },
        build: {
            tagline: 'What I build',
            title: 'Agents, and the systems agents work inside.',
            text: "Not every problem needs an agent. Sometimes what's missing first is a system that holds the data, and then I build it so an agent can work with it.",
            cards: [
                {
                    title: 'AI agents',
                    text: 'An agent that does a defined part of the work, from your own data, and knows when to stop and hand over to a person.',
                    points: [
                        'Answers only from what you have written, and says "I don\'t know" when there is no answer',
                        'Every action is logged: what it saw, what it did and what it cost',
                        'A person approves what matters',
                    ],
                    more: "Let's see where an agent fits for you",
                },
                {
                    title: 'Custom CRM',
                    text: 'First, a system built around the way you work. Once it is stable and the data is in order, I connect an agent to it.',
                    points: [
                        'Built to your requirements, not an off-the-shelf template',
                        'Structured from day one so adding AI is fast',
                        'Data first, then a plan, and only then agents',
                    ],
                    more: 'Tell me what you need',
                },
                {
                    title: 'Information systems',
                    text: "Full development of the system you're missing, from screen to server: documents, case files, appointments, permissions.",
                    points: [
                        'Cloud, backup and permissions from day one',
                        'Hebrew and mobile',
                        'Ready for an agent later',
                    ],
                    more: 'Tell me what you need',
                },
            ],
        },
        proof: {
            tagline: 'How I work',
            title: 'Three promises.',
            em: 'And proof for each.',
            text: 'What I promise before an agent goes into a business, and where it has already happened. Client names stay with me.',
            evidenceLabel: 'Where it happened',
            promises: [
                {
                    title: 'Understand first, build second',
                    text: 'We start from your process and your data. AI comes in only when the foundation is stable and reliable.',
                    evidence:
                        "I built TrinityLegal for a client, a law office, out of working sessions with the lawyers. 56,607 files are already in the cloud, and the next stage is under way: bringing AI into the office's daily work.",
                },
                {
                    title: 'The agent asks before it acts',
                    text: "An action that can't be undone does not go out without a person's approval.",
                    evidence:
                        'In my own setup, every message an agent wants to send waits for my approval. The approval holds only for that recipient and that wording.',
                },
                {
                    title: 'You see what the agent read',
                    text: 'Not a black box. Every answer comes with a breakdown: what the agent was given to read, and how long it took.',
                    evidence:
                        'On this site, under every answer the agent gives. Try it at the top of the page.',
                },
            ],
            alsoTitle: 'And four more systems I built',
            also: [
                {
                    tag: 'Runs for me every day',
                    title: 'The Trinity agent system',
                    text: 'Agents on WhatsApp and Telegram, with safety rules, memory and a night shift.',
                    href: '/#fleet',
                },
                {
                    tag: 'Open source · Free',
                    title: 'PersonaKit ↗',
                    text: 'Memory for AI agents that you can read, check and correct. Download and use: personakit.me',
                    open: true,
                },
                {
                    tag: 'Full-stack',
                    title: 'TrinityCRM',
                    text: 'A CRM built around one business: appointments, customers and reminders. Ready for an agent.',
                    href: '/projects/trinity-crm',
                },
                {
                    tag: 'Agent reviews agent',
                    title: 'The review engine',
                    text: 'One agent writes, another agent reviews, and only then it reaches a person.',
                    href: '/projects/review-engine',
                },
            ],
        },
        fleet: {
            tagline: 'My agent fleet',
            title: 'More than 40 agents.',
            em: 'One head.',
            text: 'Before I build agents for you, I run them myself every day. Each dot is one agent. Hover over it, or tap it, to see why it exists.',
            logTitle: "From the fleet's log",
            logNote: 'Three real cases from November 2026',
            log: [
                {
                    tag: 'Caught a contradiction',
                    date: '12.11',
                    title: 'A number without a source stays out of the report',
                    text: 'A rule in the fleet: every figure needs a source. In a market study one agent brought a figure of 60% growth. Against the sources collected, they showed about 35%. The inflated number was stopped before it reached the report, and before a decision was made on a wrong figure.',
                },
                {
                    tag: 'Worked behind the scenes',
                    date: '12.11',
                    title: 'Four agents, one day, zero messages sent',
                    text: 'I wanted to know whether there was demand for a product before putting months into it. Four agents worked in parallel: one collected market data with sources, one found 28 professionals, one wrote 22 personal outreach drafts and one summarized everything into a report. No message went out. Sending waits for my approval of the recipient and the wording.',
                },
                {
                    tag: 'Caught thanks to the logs',
                    date: '24.11',
                    title: 'An agent went quiet for a week, and I knew where to resume',
                    text: 'The health check flagged in red an agent that had not run for over a week, with no error at all. Every agent leaves a mark at the last point it processed, so it was clear when it was last up to date. From there it catches up on everything that happened since, and is not left in the dark.',
                },
            ],
        },
        path: {
            title: 'The road here',
            label: 'Timeline',
            years: [
                {
                    year: '2021',
                    label: 'Test automation',
                    text: 'I started out testing systems end to end, and finding where they break.',
                },
                {
                    year: '2022',
                    label: 'Full-stack development',
                    text: 'An AI-based image tagging system for a startup, and a new booking flow for a flights site.',
                },
                {
                    year: '2023',
                    label: '500K+ daily users',
                    text: 'I led the frontend architecture of a platform with more than 500,000 daily users, and a financial system for organizations.',
                },
                {
                    year: '2025',
                    label: 'Founding team at a startup',
                    text: '13 months on a multi-agent system that investigates production incidents and shows evidence for every conclusion.',
                },
                {
                    year: '2026',
                    label: 'Trinity',
                    text: 'Agents and systems for businesses: TrinityLegal in a pilot with clients, more than 40 agents that run for me every day, and PersonaKit as open source.',
                },
            ],
        },
        how: {
            tagline: 'Working with me',
            title: "Four steps. In the end it's yours.",
            text: "I start from understanding the problem, not from the technology. Sometimes the conclusion is that you don't need an agent at all, and I say that too.",
            steps: [
                {
                    title: 'Map',
                    text: 'Who does what, in which tool, and where the data lives. In one diagram.',
                },
                {
                    title: 'Find the gap',
                    text: 'Where the time goes, and where an agent would really help.',
                },
                { title: 'Build', text: 'On your real data, with tests, in short fast stages.' },
                {
                    title: 'Hand over',
                    text: 'Documentation and training, so the system does not depend on me.',
                },
            ],
        },
        brief: {
            tagline: 'Next step',
            title: 'Tell me what you need.',
            text: 'Three taps and one sentence. I come back to you with questions, and once I understand the requirements you get a written proposal.',
            what: {
                label: 'What are you interested in?',
                options: ['An AI agent', 'CRM with agents', 'Another system', 'Not sure yet'],
            },
            pain: {
                label: 'In one sentence, what would you like to work differently?',
                placeholder:
                    'For example: three people answer the same customer questions every day',
            },
            how: {
                label: 'How should I get back to you?',
                options: [
                    { id: 'call', label: 'Video call', send: 'Book a video call' },
                    { id: 'mail', label: 'Email', send: 'Send by email' },
                    { id: 'whatsapp', label: 'WhatsApp', send: 'Send on WhatsApp' },
                ],
            },
            note: "No price list and no commitment. First we work out what's needed.",
        },
        faq: {
            tagline: "Questions I'm always asked",
            title: 'Straight answers.',
            items: [
                {
                    q: 'How much does it cost?',
                    a: 'I don\'t have a price list, because two "agent" projects can differ tenfold. You tell me what you need, I ask a few questions, and you get a written proposal before we start.',
                },
                {
                    q: "How do I know the agent won't make things up?",
                    a: "It answers only from your data, says so when it has no answer, and every answer is logged with its source. The agent on this site is built the same way, and you're welcome to try to trip it up.",
                },
                {
                    q: "We're not a tech company. Is this for us?",
                    a: 'Yes. The mapping is done in the language of your business, and most of the work is understanding the process, not talking about models.',
                },
                {
                    q: 'What happens after you finish?',
                    a: 'The code, the system and the documentation stay with you. You can keep working with me for support, or not.',
                },
            ],
        },
        posts: {
            tagline: 'From the blog · latest three',
            title: "What I'm learning from working with AI agents.",
            text: 'On agents in real work: what works, what breaks, and what I learned along the way.',
            all: 'All posts',
            kind: { post: 'Post', article: 'Article' },
        },
    },
};
