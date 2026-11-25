import { Localized } from '@/i18n/lang';
import { LINKS } from '@/constants/links';

/*
 * The drawings the chat opens beside an answer. Each one is made for a kind
 * of question; which one opens is decided in code (chat/sheetFor.ts) from the
 * question the visitor picked or the documents the answer was given, never by
 * the model. Figures here are facts from the project write-ups.
 */
export type SheetKey =
    'built' | 'legal' | 'price' | 'pk' | 'why' | 'map' | 'read' | 'ask' | 'contact' | 'mail';

export interface SheetHead {
    /** The title on the sheet. */
    title: string;
    /** The short name on the sheet's tab. */
    tab: string;
    /** One line under the title. */
    cap: string;
}

export const SHEET_HEADS: Localized<Record<SheetKey, SheetHead>> = {
    he: {
        built: {
            title: 'שלוש מערכות של סוכנים',
            tab: 'מה נבנה עם סוכנים',
            cap: 'שלושתן רצות היום. הנקודה שזזה היא עבודה שעוברת מאחת לשנייה.',
        },
        legal: {
            title: '56,607 קבצים עברו לענן',
            tab: 'ארכיון המסמכים',
            cap: 'כך נראתה ההעברה ב־Trinity Legal. שם המשרד נשאר אצלי.',
        },
        price: {
            title: 'איך מגיעים למחיר',
            tab: 'איך מגיעים למחיר',
            cap: 'אין מחירון, כי שני פרויקטים של סוכן יכולים להיות שונים פי עשרה. לכן המחיר מגיע בסוף, לא בהתחלה.',
        },
        pk: {
            title: 'PersonaKit: קוד פתוח, חינם',
            tab: 'PersonaKit',
            cap: 'ערכת כלים שיצרתי ואני מפתח. מורידים ומשתמשים, בלי לדבר עם אף אחד.',
        },
        why: {
            title: 'למה לדבר איתי',
            tab: 'למה לדבר איתי',
            cap: 'שלוש סיבות, ואחריהן צעד אחד קטן.',
        },
        map: {
            title: 'מפת המערכות',
            tab: 'מפת המערכות',
            cap: 'לחצו על מערכת כדי לקרוא עליה. הקווים מראים מה מחובר למה.',
        },
        read: {
            title: 'מה קרה מאחורי התשובה',
            tab: 'מאחורי התשובה',
            cap: 'על מה התשובה נשענת, ומה נמדד בזמן שהיא נכתבה.',
        },
        ask: {
            title: 'את זה כדאי לשאול את יניר',
            tab: 'שאלה ליניר',
            cap: 'הסוכן לא מצא תשובה במה שיניר כתב, ולא ניחש.',
        },
        contact: {
            title: 'שלוש דרכים לדבר עם יניר',
            tab: 'יצירת קשר',
            cap: 'תשובה מיידית. לשאלה כזו לא צריך AI.',
        },
        mail: {
            title: 'מייל ליניר, ישר מהצ׳אט',
            tab: 'מייל',
            cap: 'בלי AI ובלי טופס: כותבים בצ׳אט את המייל שלכם ושורה על הנושא, וזה נשלח.',
        },
    },
    en: {
        built: {
            title: 'Three agent systems',
            tab: "What's been built with agents",
            cap: 'All three run today. The moving dot is work passing from one to the next.',
        },
        legal: {
            title: '56,607 files moved to the cloud',
            tab: 'The document archive',
            cap: "This is what the migration looked like at Trinity Legal. The office's name stays with me.",
        },
        price: {
            title: 'How the price is set',
            tab: 'How the price is set',
            cap: "There's no price list, because two agent projects can differ tenfold. So the price comes at the end, not the start.",
        },
        pk: {
            title: 'PersonaKit: open source, free',
            tab: 'PersonaKit',
            cap: 'A toolset I created and develop. Download and use it, without talking to anyone.',
        },
        why: {
            title: 'Why talk to me',
            tab: 'Why talk to me',
            cap: 'Three reasons, and then one small step.',
        },
        map: {
            title: 'Systems map',
            tab: 'Systems map',
            cap: 'Click a system to read about it. The lines show what connects to what.',
        },
        read: {
            title: 'What happened behind the answer',
            tab: 'Behind the answer',
            cap: 'What the answer rests on, and what was measured while it was written.',
        },
        ask: {
            title: 'This one is worth asking Yanir',
            tab: 'A question for Yanir',
            cap: 'The agent found no answer in what Yanir wrote, and did not guess.',
        },
        contact: {
            title: 'Three ways to talk to Yanir',
            tab: 'Contact',
            cap: "Instant answer. A question like this doesn't need AI.",
        },
        mail: {
            title: 'Email Yanir, straight from the chat',
            tab: 'Email',
            cap: "No AI and no form: type your email and a line about the subject in the chat, and it's sent.",
        },
    },
};

/** A numbered point: number, title, line. */
/** Where a claim already happens on the site: a line and the way to it. */
export type Proof = { text: string; label: string; href: string; out?: boolean };
type Point = { n: string; title: string; text: string; proof?: Proof };

export interface SheetCopy {
    cta: string;
    pk: { points: Point[]; site: string; docs: string };
    legal: {
        files: number;
        oldArchive: string;
        size: string;
        newSystem: string;
        newNote: string;
        progress: string;
        facts: { title: string; text: string }[];
        cta: string;
        topic: string;
    };
    price: {
        leaveWith: string;
        steps: { title: string; text: string; when: string; leave?: string }[];
        prefLabel: string;
        prefs: { title: string; text: string }[];
        prefHint: string;
        prefPicked: string;
        picked: string;
        ctaWithPref: string;
        topic: string;
    };
    built: {
        systems: { title: string; text: string; links?: boolean; href: string }[];
        wires: string[];
        /** The way from each card to its drawn project page. */
        how: string;
        cta: string;
        topic: string;
    };
    why: { points: Point[]; proofTag: string };
    read: {
        leans: (n: number) => string;
        leansNone: string;
        readN: (n: number) => string;
        ofRead: (read: number, library: number) => string;
        ofLibrary: (library: number) => string;
        usedTag: string;
        readNotUsed: string;
        alwaysSent: string;
        /** Yanir's notes by file, in words: the backend names them by file name. */
        profileTitles: Record<string, string>;
        profileOther: string;
        kinds: Record<string, string>;
        more: string;
        declined: [string, string];
        handoff: [string, string];
        measures: string;
        latency: string;
        language: string;
        languages: Record<'he' | 'en', string>;
        convo: string;
        first: string;
        nth: (n: number, before: number) => string;
        finish: string;
        finishWords: Record<string, string>;
        finishOther: string;
        tokens: string;
        tokensNote: string;
        tokenParts: [string, string, string, string];
        cachedMost: string;
        cachedSome: string;
        model: string;
        secondsShort: string;
    };
    ask: { what: string; whatText: string; orCall: string; topic: string };
    letter: {
        draft: string;
        sent: string;
        to: string;
        toName: string;
        from: string;
        question: string;
        message: string;
        added: string;
        waiting: string;
        sentNote: string;
        howTitle: string;
        howNeedsMessage: string;
        howHasMessage: string;
        noMessage: string;
    };
    contact: {
        routes: {
            kind: 'call' | 'mail' | 'whatsapp';
            note: string;
            title: string;
            text: string;
            go: string;
        }[];
        soon: string;
    };
}

export const SHEETS: Localized<SheetCopy> = {
    he: {
        cta: 'קבעו שיחת אבחון',
        pk: {
            points: [
                {
                    n: '01',
                    title: 'זיכרון שאפשר לקרוא',
                    text: 'מה שהסוכן זוכר כתוב בצורה שבן אדם יכול לפתוח ולהבין.',
                },
                {
                    n: '02',
                    title: 'לבדוק ולתקן',
                    text: 'אם הסוכן זוכר משהו לא נכון, מתקנים את זה במקום.',
                },
                {
                    n: '03',
                    title: 'קוד פתוח, חינם',
                    text: 'להורדה ולשימוש. האתר והתיעוד פתוחים לכולם.',
                },
            ],
            site: 'לאתר personakit.me ↗︎',
            docs: 'לתיעוד ↗︎',
        },
        legal: {
            files: 56607,
            oldArchive: 'הארכיון הישן',
            size: '33.8GB',
            newSystem: 'מערכת אחת בענן',
            newNote: 'גרסאות והרשאות',
            progress: 'קבצים עברו, ואף גרסה לא אבדה',
            facts: [
                { title: 'בהתאמה אישית', text: 'מתוך ישיבות אפיון עם עורכי הדין' },
                { title: 'בפיילוט', text: 'עם לקוחות פעילים' },
            ],
            cta: 'יש לכם ארכיון כזה? קבעו שיחת אבחון',
            topic: 'ארכיון מסמכים',
        },
        price: {
            leaveWith: 'יוצאים עם',
            steps: [
                {
                    title: 'שיחת אבחון',
                    text: 'מספרים לי מה מציק, ואני שואל שאלות.',
                    when: '20 עד 30 דקות',
                    leave: 'תמונה ברורה של הבעיה, ואם סוכן בכלל מתאים לה.',
                },
                {
                    title: 'הצעה כתובה',
                    text: 'מה נבנה, באילו שלבים, ומה לא כלול.',
                    when: 'אחרי השיחה',
                    leave: 'מסמך אחד שאפשר להחליט לפיו.',
                },
                {
                    title: 'בוחרים מסלול',
                    text: 'לפי מה שמתאים לכם ולפרויקט.',
                    when: 'לפני שמתחילים',
                },
            ],
            prefLabel: 'מסלול מועדף',
            prefs: [
                { title: 'מחיר קבוע', text: 'כשברור מראש מה בונים.' },
                { title: 'לפי שעות', text: 'כשהדרך מתבהרת תוך כדי עבודה.' },
            ],
            prefHint: 'נוטים לאחד מהם? סמנו אותו, והוא יצורף לשיחה. זה לא מחייב.',
            prefPicked: 'סימנתם: {p}. זה יצורף לשיחה, ואפשר לשנות.',
            picked: '✓ נבחר',
            ctaWithPref: 'קבעו שיחת אבחון · {p}',
            topic: 'מחיר',
        },
        built: {
            systems: [
                {
                    title: 'מנוע הביקורת',
                    text: 'סוכן אחד כותב, סוכן אחר בודק, ורק אז זה מגיע לאדם.',
                    href: '/projects/review-engine',
                },
                {
                    title: 'מערך הסוכנים',
                    text: 'יותר מ־40 סוכנים עם ראש אחד, וכל אחד עם ההרשאות שהתפקיד שלו צריך.',
                    href: '/projects/agent-fleet',
                },
                {
                    title: 'PersonaKit',
                    text: 'זיכרון לסוכנים שאפשר לקרוא, לבדוק ולתקן. קוד פתוח, חינם.',
                    links: true,
                    href: '/projects/personakit',
                },
            ],
            wires: ['בודק את', 'מזין זיכרון אל'],
            how: 'איך הוא בנוי',
            cta: 'רוצים סוכן כזה אצלכם? קבעו שיחת אבחון',
            topic: 'סוכנים',
        },
        why: {
            points: [
                {
                    n: '01',
                    title: 'מתחילים מהבעיה, לא מהטכנולוגיה',
                    text: 'לפעמים המסקנה היא שלא צריך סוכן בכלל, וגם את זה אני אומר.',
                    proof: {
                        text: 'Trinity Legal נבנה מתוך ישיבות אפיון עם עורכי הדין, לא מתוך רשימת כלים.',
                        label: 'לעמוד הפרויקט',
                        href: '/projects/trinity-legal',
                    },
                },
                {
                    n: '02',
                    title: 'אתם נשארים בשליטה',
                    text: 'הסוכן מכין, ואדם אצלכם מאשר. שום הודעה ללקוח לא יוצאת בלי שראיתם אותה, אז אפשר להתחיל בלי לחשוש מטעות מול לקוח.',
                    proof: {
                        text: 'כך עובד גם מערך הסוכנים שלי: אפס פעולות החוצה בלי אישור שלי.',
                        label: 'איך זה בנוי',
                        href: '/projects/agent-fleet',
                    },
                },
                {
                    n: '03',
                    title: 'בסוף זה שלכם',
                    text: 'תיעוד והדרכה, כדי שהמערכת לא תהיה תלויה בי.',
                    proof: {
                        text: 'PersonaKit פתוח לכולם, עם תיעוד שכל אחד יכול לקרוא.',
                        label: 'לתיעוד',
                        href: LINKS.personakitDocs,
                        out: true,
                    },
                },
            ],
            proofTag: 'ההוכחה',
        },
        read: {
            leans: (n) => (n === 1 ? 'התשובה נשענת על מסמך אחד' : `התשובה נשענת על ${n} מסמכים`),
            leansNone: 'התשובה לא נשענת על אף מסמך',
            readN: (n) => (n === 1 ? 'נקרא מסמך אחד' : `נקראו ${n} מסמכים`),
            ofRead: (read, library) =>
                `${read === 1 ? 'מתוך מסמך אחד שנקרא' : `מתוך ${read} שנקראו`}, מתוך ${library} בספרייה`,
            ofLibrary: (library) => `מתוך ${library} בספרייה`,
            usedTag: 'שימש בתשובה',
            readNotUsed: 'נקראו ולא שימשו:',
            alwaysSent: 'נשלח עם כל שאלה:',
            profileTitles: {
                'about-me': 'אודות יניר',
                resume: 'קורות החיים',
                'work-with-me': 'איך עובדים איתי',
            },
            profileOther: 'מה שיניר כתב על עצמו',
            kinds: { profile: 'פרופיל', project: 'פרויקט', writing: 'כתיבה' },
            more: 'מה עוד קרה',
            declined: ['הסוכן אמר שאין לו תשובה', 'הוא לא מצא את זה במה שיניר כתב, ולא ניחש.'],
            handoff: [
                'הוצע המשך אישי עם יניר',
                'אחרי כמה שאלות, הסוכן הציע להמשיך ישירות עם יניר.',
            ],
            measures: 'המדידות',
            latency: 'זמן תגובה',
            language: 'שפה שזוהתה',
            languages: { he: 'עברית', en: 'אנגלית' },
            convo: 'המשך שיחה',
            first: 'שאלה ראשונה',
            nth: (n, before) =>
                before === 1 ? `שאלה ${n}, עם הקודמת` : `שאלה ${n}, עם ${before} הקודמות`,
            finish: 'סיום',
            finishWords: { STOP: 'התשובה הושלמה', MAX_TOKENS: 'נעצרה באורך המרבי' },
            finishOther: 'נעצרה לפני הסוף',
            tokens: 'טוקנים',
            tokensNote: 'כמה טקסט המודל קרא וכתב בשביל התשובה הזו',
            tokenParts: [
                'קלט חדש: השאלה והמסמכים',
                'קלט שכבר נקרא קודם ונשמר',
                'חשיבה של המודל',
                'התשובה עצמה',
            ],
            cachedMost: 'רוב הקלט כבר נקרא קודם ונשמר, ולכן התשובה מהירה וזולה יותר.',
            cachedSome: 'חלק מהקלט כבר נקרא קודם ונשמר, ולכן התשובה מהירה וזולה יותר.',
            model: 'מודל',
            secondsShort: 'שנ׳',
        },
        ask: {
            what: 'מה קורה עכשיו?',
            whatText:
                'הסוכן עונה רק מתוך מה שיניר כתב, ועל השאלה הזו אין שם תשובה. במקום לנחש, הוא הכין אותה כהודעה ליניר. חסר רק המייל שלכם, כדי שיהיה לו לאן לענות.',
            orCall: 'או קבעו שיחת אבחון',
            topic: 'שאלה מהצ׳אט',
        },
        letter: {
            draft: 'טיוטה',
            sent: 'נשלח ✓',
            to: 'אל',
            toName: 'יניר רוט',
            from: 'מאת',
            question: 'השאלה',
            message: 'ההודעה',
            added: 'הוספתם',
            waiting: 'ממתין למה שתכתבו בצ׳אט',
            sentNote: 'ההודעה אצל יניר בתיבה, והוא עונה ממנה ישירות למייל שלכם.',
            howTitle: 'כתבו בצ׳אט',
            howNeedsMessage: 'את המייל שלכם ושורה על הנושא, וההודעה תישלח כמו שהיא.',
            howHasMessage: 'את המייל שלכם. אפשר להוסיף לידו עוד שורה, והכול יישלח יחד.',
            noMessage: '(נשלחה כתובת בלי הודעה)',
        },
        contact: {
            routes: [
                {
                    kind: 'call',
                    note: 'הכי מהיר להבין אם זה מתאים',
                    title: 'שיחת אבחון',
                    text: '20 עד 30 דקות בשיחת וידאו. בוחרים שעה ביומן.',
                    go: 'קבעו שיחה',
                },
                {
                    kind: 'mail',
                    note: 'אם נוח יותר לכתוב',
                    title: 'מייל מהצ׳אט',
                    text: 'כותבים בצ׳אט את המייל שלכם ושורה על הנושא, וזה מגיע ליניר.',
                    go: 'כתבו בצ׳אט',
                },
                {
                    kind: 'whatsapp',
                    note: 'קצר ולעניין',
                    title: 'וואטסאפ',
                    text: 'הודעה במילים שלכם, ויניר חוזר אליכם.',
                    go: 'כתבו בוואטסאפ',
                },
            ],
            soon: 'בקרוב',
        },
    },
    en: {
        cta: 'Book a discovery call',
        pk: {
            points: [
                {
                    n: '01',
                    title: 'Memory you can read',
                    text: 'What the agent remembers is written so a person can open it and understand it.',
                },
                {
                    n: '02',
                    title: 'Check and correct',
                    text: 'If the agent remembers something wrong, you fix it on the spot.',
                },
                {
                    n: '03',
                    title: 'Open source, free',
                    text: 'To download and use. The site and the docs are open to everyone.',
                },
            ],
            site: 'Go to personakit.me ↗︎',
            docs: 'The docs ↗︎',
        },
        legal: {
            files: 56607,
            oldArchive: 'The old archive',
            size: '33.8GB',
            newSystem: 'One system in the cloud',
            newNote: 'Versions and permissions',
            progress: 'files moved, and no version was lost',
            facts: [
                { title: 'Custom built', text: 'From working sessions with the lawyers' },
                { title: 'In pilot', text: 'With active clients' },
            ],
            cta: 'Have an archive like this? Book a diagnostic call',
            topic: 'Document archive',
        },
        price: {
            leaveWith: 'You leave with',
            steps: [
                {
                    title: 'Discovery call',
                    text: "You tell me what's bothering you, and I ask questions.",
                    when: '20 to 30 minutes',
                    leave: 'A clear picture of the problem, and whether an agent fits it at all.',
                },
                {
                    title: 'A written proposal',
                    text: "What will be built, in which stages, and what's not included.",
                    when: 'After the call',
                    leave: 'One document you can decide by.',
                },
                {
                    title: 'Choose a track',
                    text: 'Whatever fits you and the project.',
                    when: 'Before we start',
                },
            ],
            prefLabel: 'Preferred track',
            prefs: [
                { title: 'Fixed price', text: "When it's clear up front what we're building." },
                { title: 'Hourly', text: 'When the way becomes clear as the work goes on.' },
            ],
            prefHint:
                "Leaning toward one? Mark it, and it will be attached to the call. It's not binding.",
            prefPicked: 'You marked: {p}. It will be attached to the call, and you can change it.',
            picked: '✓ Picked',
            ctaWithPref: 'Book a discovery call · {p}',
            topic: 'Price',
        },
        built: {
            systems: [
                {
                    title: 'The review engine',
                    text: 'One agent writes, another agent reviews, and only then it reaches a person.',
                    href: '/projects/review-engine',
                },
                {
                    title: 'The agent fleet',
                    text: 'More than 40 agents with one head, each with the permissions its role needs.',
                    href: '/projects/agent-fleet',
                },
                {
                    title: 'PersonaKit',
                    text: 'Memory for agents that you can read, check and correct. Open source, free.',
                    links: true,
                    href: '/projects/personakit',
                },
            ],
            wires: ['reviews', 'feeds memory to'],
            how: "How it's built",
            cta: 'Want an agent like this? Book a diagnostic call',
            topic: 'Agents',
        },
        why: {
            points: [
                {
                    n: '01',
                    title: 'I start from the problem, not the technology',
                    text: "Sometimes the conclusion is that you don't need an agent at all, and I say that too.",
                    proof: {
                        text: 'Trinity Legal was built from working sessions with the lawyers, not from a list of tools.',
                        label: 'The project page',
                        href: '/projects/trinity-legal',
                    },
                },
                {
                    n: '02',
                    title: 'You stay in control',
                    text: 'The agent prepares, and a person on your side approves. No message goes to a customer without you seeing it, so you can start without fearing a mistake in front of a customer.',
                    proof: {
                        text: 'My agent fleet works the same way: zero outward actions without my approval.',
                        label: "How it's built",
                        href: '/projects/agent-fleet',
                    },
                },
                {
                    n: '03',
                    title: "In the end it's yours",
                    text: 'Documentation and training, so the system does not depend on me.',
                    proof: {
                        text: 'PersonaKit is open to everyone, with docs anyone can read.',
                        label: 'The docs',
                        href: LINKS.personakitDocs,
                        out: true,
                    },
                },
            ],
            proofTag: 'The proof',
        },
        read: {
            leans: (n) =>
                n === 1 ? 'The answer rests on one document' : `The answer rests on ${n} documents`,
            leansNone: 'The answer rests on no document',
            readN: (n) => (n === 1 ? 'One document was read' : `${n} documents were read`),
            ofRead: (read, library) =>
                `out of ${read === 1 ? 'the one' : read} read, out of ${library} in the library`,
            ofLibrary: (library) => `out of ${library} in the library`,
            usedTag: 'Used in the answer',
            readNotUsed: 'Read but not used:',
            alwaysSent: 'Sent with every question:',
            profileTitles: {
                'about-me': 'About Yanir',
                resume: 'The resume',
                'work-with-me': 'How to work with me',
            },
            profileOther: 'What Yanir wrote about himself',
            kinds: { profile: 'Profile', project: 'Project', writing: 'Writing' },
            more: 'What else happened',
            declined: [
                'The agent said it has no answer',
                'It did not find this in what Yanir wrote, and did not guess.',
            ],
            handoff: [
                'Continuing with Yanir was offered',
                'After a few questions, the agent offered to continue directly with Yanir.',
            ],
            measures: 'Measurements',
            latency: 'Response time',
            language: 'Detected language',
            languages: { he: 'Hebrew', en: 'English' },
            convo: 'Conversation',
            first: 'First question',
            nth: (n, before) =>
                before === 1
                    ? `Question ${n}, with the one before`
                    : `Question ${n}, with the ${before} before`,
            finish: 'Finish',
            finishWords: {
                STOP: 'The answer is complete',
                MAX_TOKENS: 'Stopped at the length limit',
            },
            finishOther: 'Stopped before the end',
            tokens: 'tokens',
            tokensNote: 'How much text the model read and wrote for this answer',
            tokenParts: [
                'New input: the question and the documents',
                'Input read before and kept',
                "The model's reasoning",
                'The answer itself',
            ],
            cachedMost:
                'Most of the input was read before and kept, so the answer is faster and cheaper.',
            cachedSome:
                'Part of the input was read before and kept, so the answer is faster and cheaper.',
            model: 'Model',
            secondsShort: 's',
        },
        ask: {
            what: 'What happens now?',
            whatText:
                "The agent answers only from what Yanir wrote, and there's no answer there for this question. Instead of guessing, it prepared it as a message to Yanir. Only your email is missing, so he has somewhere to reply.",
            orCall: 'Or book a discovery call',
            topic: 'A question from the chat',
        },
        letter: {
            draft: 'Draft',
            sent: 'Sent ✓',
            to: 'To',
            toName: 'Yanir Rot',
            from: 'From',
            question: 'The question',
            message: 'The message',
            added: 'You added',
            waiting: 'Waiting for what you type in the chat',
            sentNote:
                "The message is in Yanir's inbox, and he replies from there straight to your email.",
            howTitle: 'Type in the chat',
            howNeedsMessage:
                'your email and a line about the subject, and the message is sent as is.',
            howHasMessage:
                'your email. You can add another line next to it, and it will all be sent together.',
            noMessage: '(an address was sent with no message)',
        },
        contact: {
            routes: [
                {
                    kind: 'call',
                    note: "The fastest way to see if it's a fit",
                    title: 'Discovery call',
                    text: '20 to 30 minutes on a video call. Pick a time in the calendar.',
                    go: 'Book a call',
                },
                {
                    kind: 'mail',
                    note: "If you'd rather write",
                    title: 'Email from the chat',
                    text: 'Type your email and a line about the subject in the chat, and it reaches Yanir.',
                    go: 'Type in the chat',
                },
                {
                    kind: 'whatsapp',
                    note: 'Short and to the point',
                    title: 'WhatsApp',
                    text: 'A message in your own words, and Yanir gets back to you.',
                    go: 'Write on WhatsApp',
                },
            ],
            soon: 'Soon',
        },
    },
};

/*
 * The systems map: simplified from the project's system map, with only the
 * links that exist there. Positions are drawn for a wide sheet and for a phone.
 */
export interface MapNode {
    id: string;
    name: Localized<string>;
    text: Localized<string>;
    meta: Localized<string>;
    wide: [number, number];
    phone: [number, number];
    personakitLinks?: boolean;
    trinityLinks?: boolean;
}

export const MAP_NODES: MapNode[] = [
    {
        id: 'review',
        name: { he: 'מנוע הביקורת', en: 'The review engine' },
        text: {
            he: 'סוכן אחד כותב, סוכן אחר בודק, ורק אז זה מגיע לאדם.',
            en: 'One agent writes, another agent reviews, and only then it reaches a person.',
        },
        meta: { he: 'פרטי · רץ עם Claude Code', en: 'Private · runs with Claude Code' },
        wide: [280, 48],
        phone: [160, 34],
    },
    {
        id: 'agents',
        name: { he: 'Trinity Agent', en: 'Trinity Agent' },
        text: {
            he: 'העוזר האישי שלי בוואטסאפ ובטלגרם, על Hermes Agent ועם PersonaKit כזיכרון. שואל לפני כל פעולה.',
            en: 'My personal assistant on WhatsApp and Telegram, built on Hermes Agent with PersonaKit as its memory. It asks before it acts.',
        },
        meta: { he: 'רץ אצלי כל יום · פיילוט פרטי', en: 'Runs for me every day · Private pilot' },
        wide: [130, 160],
        phone: [92, 138],
        trinityLinks: true,
    },
    {
        id: 'legal',
        name: { he: 'Trinity Legal', en: 'Trinity Legal' },
        text: {
            he: 'ניהול מסמכים ותיקים למשרדי עורכי דין. 56,607 קבצים.',
            en: 'Document and case management for law offices. 56,607 files.',
        },
        meta: {
            he: 'לקוחות פעילים בפיילוט · Google Cloud',
            en: 'Active pilot clients · Google Cloud',
        },
        wide: [430, 160],
        phone: [250, 138],
    },
    {
        id: 'pk',
        name: { he: 'PersonaKit', en: 'PersonaKit' },
        text: {
            he: 'זיכרון לסוכני AI שאפשר לקרוא, לבדוק ולתקן.',
            en: 'Memory for AI agents that you can read, check and correct.',
        },
        meta: { he: 'קוד פתוח · חינם', en: 'Open source · Free' },
        wide: [100, 290],
        phone: [92, 246],
        personakitLinks: true,
    },
    {
        id: 'site',
        name: { he: 'האתר הזה', en: 'This site' },
        text: {
            he: 'האתר והסוכן שעונה לכם עכשיו.',
            en: 'The site and the agent answering you right now.',
        },
        meta: {
            he: 'Gemini · Cloudflare · Google Cloud',
            en: 'Gemini · Cloudflare · Google Cloud',
        },
        wide: [310, 290],
        phone: [250, 246],
    },
    {
        id: 'crm',
        name: { he: 'TrinityCRM', en: 'TrinityCRM' },
        text: {
            he: 'CRM בהתאמה אישית: תורים, לקוחות ותזכורות.',
            en: 'Custom CRM: appointments, customers and reminders.',
        },
        meta: { he: 'פול־סטאק · Cloudflare', en: 'Full-stack · Cloudflare' },
        wide: [475, 290],
        phone: [160, 338],
    },
];

export const MAP_EDGES: { from: string; to: string; label: Localized<string> }[] = [
    { from: 'review', to: 'agents', label: { he: 'בודק', en: 'reviews' } },
    { from: 'review', to: 'legal', label: { he: 'בודק', en: 'reviews' } },
    { from: 'agents', to: 'pk', label: { he: 'מזין זיכרון', en: 'feeds memory' } },
    { from: 'site', to: 'pk', label: { he: 'מציג', en: 'shows' } },
];

export const TRINITY_LINKS: Localized<{ site: string }> = {
    he: { site: 'personakit.me/trinity ↗︎' },
    en: { site: 'personakit.me/trinity ↗︎' },
};

export const PERSONAKIT_LINKS: Localized<{ site: string; docs: string }> = {
    he: { site: 'personakit.me ↗︎', docs: 'התיעוד ↗︎' },
    en: { site: 'personakit.me ↗︎', docs: 'The docs ↗︎' },
};

/** A source's title as a visitor reads it: Yanir's notes go by name, never by file. */
export const sourceTitle = (
    s: { kind: string; slug: string; title: string },
    read: { profileTitles: Record<string, string>; profileOther: string }
) => (s.kind === 'profile' ? (read.profileTitles[s.slug] ?? read.profileOther) : s.title);
