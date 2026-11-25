import { Localized } from '@/i18n/lang';
import { SheetKey } from '@/content/sheets';

/*
 * Copy for the home chat and the drawing beside it. The chat is an agent that
 * answers on Yanir's behalf in his first person, as the model does; fixed
 * replies here are the ones that never call the model (greeting, contact, the
 * process drawing).
 */

/** One station of a process: [title, note] as a person does it, and as an agent does it. */
export interface ProcessStep {
    person: [string, string];
    agent: [string, string];
    /** Whether the agent takes this station over. */
    byAgent: boolean;
}

export interface Process {
    name: string;
    steps: ProcessStep[];
    today: string;
    withAgent: string;
}

export type ProcessId = 'support' | 'sales' | 'docs' | 'know';
export const PROCESS_IDS: ProcessId[] = ['support', 'sales', 'docs', 'know'];

export interface Starter {
    q: string;
    sub: string;
    /** 'compare' opens the process drawing; anything else is asked of the agent. */
    action: 'ask' | 'compare';
    /** The drawing this question is answered with, whatever documents were read. */
    sheet?: SheetKey;
}

export interface ChatCopy {
    panelLabel: string;
    who: string;
    whoNote: string;
    step1: string;
    greeting: string;
    startHint: string;
    starters: Starter[];
    alsoAsk: string;
    /** Offered after an answer, alongside the starters not yet asked. */
    followUps: { q: string; sheet: SheetKey }[];
    /** A question answered from fixed copy, to show that not every answer needs a model. */
    ready: { q: string; a: string };
    mailSent: string;
    mailSentWithQuestion: string;
    anythingElse: string;
    placeholder: string;
    examplePrefix: string;
    examples: string[];
    emailPlaceholder: string;
    emailPlaceholderMore: string;
    inputLabel: string;
    send: string;
    suggestionsLabel: string;
    working: string;
    workingNote: string;
    answered: string;
    seconds: string;
    secondsShort: string;
    sources: string;
    noSource: string;
    readyTag: string;
    sentTag: string;
    asking: string;
    /** Fixed replies, no model. */
    contactReply: string;
    mailReply: string;
    /** What the visitor 'says' when they pick the email route on the contact sheet. */
    mailAsk: string;
    invalidEmail: string;
    offline: string;
    errors: { tooLong: string; rateLimited: string; rateLimitedIn: string; failed: string };
    compare: {
        ask: string;
        pickProcess: string;
        drawn: string;
        team: string[];
        pickAnswer: string;
        pickProcessLabel: string;
        summary: string;
        cardTitle: string;
        process: string;
        handledBy: string;
        interested: string;
        interestedValue: string;
        book: string;
        another: string;
    };
    /** The sheet card under an answer. */
    art: { diagram: string; opensSide: string; opensBelow: string; open: string };
    /** The phone layout: the chat as a full-screen layer, the diagram as a sheet over it. */
    phone: {
        /** The greeting without "on the left": on a phone the drawing is a sheet. */
        greeting: string;
        teaser: string;
        resume: string;
        close: string;
        backToChat: string;
        closeSheet: string;
    };
    book: string;
    processes: Record<ProcessId, Process>;
    /** The site's own chat, drawn with the same stations. */
    site: Process;
    plan: {
        step2: string;
        base: { title: string; cap: string; sumH: string; sumT: string };
        running: { title: string; cap: string };
        lit: { kicker: string; title: string; cap: string };
        ready: {
            title: string;
            cap: string;
            skipped: string;
            skipNote: string;
            who: string;
            done: string;
            note: string;
            sum: string;
        };
        fromAnswer: string;
        fromChat: string;
        today: string;
        withAgent: string;
        cmpTitle: string;
        cmpCap: string;
        person: string;
        agent: string;
        checked: string;
        instant: string;
        docsOf: (n: number, of: number) => string;
        noDocs: string;
        modelNote: string;
        sumH: string;
        sumFrom: (n: number) => string;
        sumDeclined: string;
        trail: (n: number, sec: number) => string;
        trailNone: (sec: number) => string;
        trailOpen: string;
        back: string;
    };
}

const SITE_HE: Process = {
    name: 'הצ׳אט באתר',
    steps: [
        {
            person: ['שולחים לי שאלה', 'במייל או בוואטסאפ'],
            agent: ['שואלים כאן', 'בכל שעה, בעברית או באנגלית'],
            byAgent: false,
        },
        {
            person: ['אני רואה אותה', 'כשאני מתפנה, לפעמים רק למחרת'],
            agent: ['בודק את הפנייה', 'אדם ולא רובוט, ובתוך המכסה היומית'],
            byAgent: true,
        },
        {
            person: ['אני מחפש בחומרים שלי', 'פרויקטים, מאמרים, קורות חיים'],
            agent: ['בוחר מה לקרוא', 'רק מסמכים שקשורים לשאלה'],
            byAgent: true,
        },
        {
            person: ['אני כותב תשובה', 'מאפס, בכל פעם'],
            agent: ['קורא ומנסח', 'פנייה אחת למודל, כמה שניות'],
            byAgent: true,
        },
        {
            person: ['אתם מקבלים תשובה', 'אחרי יום, ואז עוד שאלה'],
            agent: ['אנחנו מדברים', 'על הפרויקט שלכם, לא על שאלות חוזרות'],
            byAgent: false,
        },
    ],
    today: 'כל שאלה מחכה לי, גם כזו שהתשובה עליה כבר כתובה.',
    withAgent: 'הסוכן עונה על מה שכבר כתוב. מה שהוא לא מצא, הוא אומר, ומפנה אליי.',
};

const SITE_EN: Process = {
    name: "The site's chat",
    steps: [
        {
            person: ['You send me a question', 'By email or WhatsApp'],
            agent: ['Ask here', 'Any hour, in Hebrew or English'],
            byAgent: false,
        },
        {
            person: ['I see it', "When I'm free, sometimes only the next day"],
            agent: ['Checks the request', 'A person, not a bot, and within the daily quota'],
            byAgent: true,
        },
        {
            person: ['I search my materials', 'Projects, articles, CV'],
            agent: ['Chooses what to read', 'Only documents related to the question'],
            byAgent: true,
        },
        {
            person: ['I write an answer', 'From scratch, every time'],
            agent: ['Reads and writes', 'One call to the model, a few seconds'],
            byAgent: true,
        },
        {
            person: ['You get an answer', 'A day later, and then another question'],
            agent: ['We talk', 'About your project, not about repeat questions'],
            byAgent: false,
        },
    ],
    today: 'Every question waits for me, even one whose answer is already written.',
    withAgent:
        "The agent answers what's already written. What it didn't find, it says, and points you to me.",
};

export const CHAT: Localized<ChatCopy> = {
    he: {
        panelLabel: 'הצ׳אט של האתר',
        who: 'הסוכן שלי',
        whoNote: 'עונה בשמי, רק מתוך מה שכתבתי',
        step1: '1 · שואלים כאן',
        greeting:
            'שלום, כאן הסוכן שבניתי. הוא עונה בשמי, רק מתוך מה שכתבתי. שאלו על העבודה שלי, או על מה שסוכן יכול לעשות אצלכם. משמאל תראו איך הגיעה כל תשובה.',
        startHint: 'אפשר להתחיל מכאן, או לכתוב שאלה משלכם',
        starters: [
            {
                q: 'מה בנית עם סוכנים?',
                sub: 'שלוש מערכות, בשרטוט אחד',
                action: 'ask',
                sheet: 'built',
            },
            { q: 'מה סוכן ישנה אצלנו?', sub: 'תהליך שתבחרו, היום ועם סוכן', action: 'compare' },
            { q: 'כמה זה עולה?', sub: 'איך מגיעים למחיר', action: 'ask', sheet: 'price' },
            {
                q: 'יש ניסיון עם ארכיון מסמכים?',
                sub: '56,607 קבצים שעברו לענן',
                action: 'ask',
                sheet: 'legal',
            },
        ],
        alsoAsk: 'אפשר לשאול גם',
        followUps: [
            { q: 'תראו לי מפה של המערכות', sheet: 'map' },
            { q: 'למה לדבר דווקא איתך?', sheet: 'why' },
        ],
        ready: {
            q: 'מה אתה בונה?',
            a: 'סוכני AI שעושים חלק מוגדר מהעבודה מתוך המידע שלכם, מערכות CRM בהתאמה אישית, ומערכות מידע שסוכן יכול להתחבר אליהן בהמשך.',
        },
        mailSent: 'קיבלתי. ההודעה אצלי בתיבה, ואענה למייל שכתבתם.',
        mailSentWithQuestion: 'קיבלתי. השאלה שלכם אצלי בתיבה, ואענה למייל שכתבתם.',
        anythingElse: 'יש עוד משהו שתרצו לשאול?',
        placeholder: 'כתבו שאלה',
        examplePrefix: 'למשל: ',
        examples: [
            'יש ניסיון עם ארכיון מסמכים?',
            'מה בנית עם סוכנים?',
            'כמה זה עולה?',
            'אפשר לחבר סוכן ל־CRM שלנו?',
            'איך יוצרים איתך קשר?',
            'אפשר לשלוח לך מייל?',
            'מה זה PersonaKit?',
        ],
        emailPlaceholder: 'המייל שלכם, ושורה על הנושא',
        emailPlaceholderMore: 'המייל שלכם',
        inputLabel: 'שאלה חופשית',
        send: 'שאלו',
        suggestionsLabel: 'הצעות להמשך',
        working: 'הסוכן עובד',
        workingNote: 'בודק, בוחר מסמכים ומנסח…',
        answered: 'הסוכן ענה',
        seconds: 'שניות',
        secondsShort: 'שנ׳',
        sources: 'מקורות',
        noSource: 'לא נמצא מסמך מתאים',
        readyTag: 'תשובה מוכנה · בלי AI',
        sentTag: 'נשלח ✓ · בלי AI',
        asking: 'שואלים על:',
        contactReply:
            'שלוש דרכים: שיחת אבחון של 20 עד 30 דקות, מייל ישר מהצ׳אט, או וואטסאפ. הן מחכות משמאל.',
        mailReply: 'בשמחה. כתבו כאן את המייל שלכם עם שורה על מה תרצו לדבר, ואחזור אליכם ישירות.',
        mailAsk: 'אפשר לשלוח לך מייל?',
        invalidEmail: 'הכתובת לא נראית תקינה. בדקו אותה ושלחו שוב.',
        offline:
            'הסוכן לא זמין כרגע: הוא לא מצליח להגיע לחומרים שלו, ולכן לא יענה בכלל במקום לנחש. אפשר עדיין לקבוע שיחה.',
        errors: {
            tooLong: 'ההודעה ארוכה מדי. נסו לקצר אותה.',
            rateLimited: 'יותר מדי הודעות ברגע אחד. חכו רגע ונסו שוב.',
            rateLimitedIn: 'יותר מדי הודעות ברגע אחד. נסו שוב בעוד {n} שניות.',
            failed: 'ההודעה לא נשלחה. נסו לשלוח אותה שוב.',
        },
        compare: {
            ask: 'מה סוכן ישנה אצלנו?',
            pickProcess: 'איזה תהליך הכי מציק אצלכם? אשרטט אותו פעמיים: כמו שהוא היום, ועם סוכן.',
            drawn: 'שרטטתי אותו משמאל פעמיים: כמו שהוא נראה היום ברוב העסקים, ולידו אותו תהליך עם סוכן. כמה אנשים מטפלים בזה אצלכם היום?',
            team: ['רק אני', '2 עד 5', 'יותר מ־5'],
            pickAnswer: 'בחרו תשובה',
            pickProcessLabel: 'בחרו תהליך',
            summary: 'זה הסיכום. הוא יגיע אליי לפני שיחת האבחון, כדי שלא נתחיל מאפס.',
            cardTitle: 'הסיכום שלכם',
            process: 'התהליך',
            handledBy: 'מטפלים היום',
            interested: 'מעניין אותנו',
            interestedValue: 'סוכן AI',
            book: 'קבעו שיחת אבחון',
            another: 'תהליך אחר',
        },
        art: {
            diagram: 'שרטוט לתשובה הזו',
            opensSide: 'נפתח משמאל',
            opensBelow: 'נפתח למטה',
            open: 'פתחו',
        },
        phone: {
            greeting:
                'שלום, כאן הסוכן שבניתי. הוא עונה בשמי, רק מתוך מה שכתבתי. שאלו על העבודה שלי, או על מה שסוכן יכול לעשות אצלכם.',
            teaser: 'לכל תשובה מצורף שרטוט, ורואים איך הסוכן הגיע אליה.',
            resume: 'המשך השיחה',
            close: 'סגירת השיחה',
            backToChat: 'חזרה לשיחה',
            closeSheet: 'סגירת השרטוט',
        },
        book: 'קבעו שיחת אבחון',
        processes: {
            support: {
                name: 'פניות לקוחות',
                steps: [
                    {
                        person: ['לקוח שולח הודעה', 'בוואטסאפ, במייל או בטופס'],
                        agent: ['לקוח שולח הודעה', 'בכל ערוץ'],
                        byAgent: false,
                    },
                    {
                        person: ['מישהו קורא וממיין', 'מחכה עד שמישהו מתפנה'],
                        agent: ['ממיין את הפנייה', 'מיד, בכל שעה'],
                        byAgent: true,
                    },
                    {
                        person: ['מחפשים את התשובה', 'בשלוש מערכות שונות'],
                        agent: ['מוצא את התשובה', 'מתוך המידע שלכם בלבד'],
                        byAgent: true,
                    },
                    {
                        person: ['כותבים תשובה', 'מאפס, בכל פעם'],
                        agent: ['מנסח טיוטה', 'עם המקור שעליו הסתמך'],
                        byAgent: true,
                    },
                    {
                        person: ['שולחים', 'ולפעמים שוכחים'],
                        agent: ['נציג מאשר ושולח', 'האדם נשאר בהחלטה'],
                        byAgent: false,
                    },
                ],
                today: 'רוב הזמן הולך על חיפוש וניסוח של תשובות שכבר נכתבו.',
                withAgent: 'הסוכן מכין, והנציג מאשר. מה שהסוכן לא יודע עובר לאדם.',
            },
            sales: {
                name: 'הצעות מחיר',
                steps: [
                    {
                        person: ['פנייה נכנסת', 'ליד חדש'],
                        agent: ['פנייה נכנסת', 'ליד חדש'],
                        byAgent: false,
                    },
                    {
                        person: ['אוספים פרטים', 'שלוש שיחות הלוך ושוב'],
                        agent: ['אוסף את הפרטים', 'שואל את הלקוח מה שחסר'],
                        byAgent: true,
                    },
                    {
                        person: ['בונים הצעה', 'העתק והדבק מהצעה קודמת'],
                        agent: ['מכין טיוטת הצעה', 'לפי התבנית והמחירון שלכם'],
                        byAgent: true,
                    },
                    {
                        person: ['מנהל מאשר', 'כשיש לו זמן'],
                        agent: ['מנהל מאשר', 'רואה מה השתנה מהתבנית'],
                        byAgent: false,
                    },
                    {
                        person: ['מעקב', 'תלוי בזיכרון של איש המכירות'],
                        agent: ['עוקב ומזכיר', 'ומעדכן את ה־CRM'],
                        byAgent: true,
                    },
                ],
                today: 'הצעות יוצאות מאוחר, והמעקב תלוי בזיכרון של אנשים.',
                withAgent: 'ההצעה מוכנה לאישור באותו יום, והמעקב קורה לבד.',
            },
            docs: {
                name: 'מסמכים וארכיון',
                steps: [
                    {
                        person: ['מסמך מגיע', 'במייל או בסריקה'],
                        agent: ['מסמך מגיע', 'במייל או בסריקה'],
                        byAgent: false,
                    },
                    {
                        person: ['מתייקים ידנית', 'כל אחד בשיטה שלו'],
                        agent: ['מזהה ומתייק', 'לפי לקוח, תיק וסוג'],
                        byAgent: true,
                    },
                    {
                        person: ['מחפשים אותו', '״איפה הגרסה האחרונה?״'],
                        agent: ['עונה איפה המסמך', 'ומה הגרסה העדכנית'],
                        byAgent: true,
                    },
                    {
                        person: ['מעדכנים גרסה', 'ולפעמים דורסים'],
                        agent: ['עורכים עם נעילה', 'כל גרסה נשמרת'],
                        byAgent: false,
                    },
                    {
                        person: ['משתפים', 'בקובץ מצורף'],
                        agent: ['משתפים מהמערכת', 'עם הרשאות'],
                        byAgent: false,
                    },
                ],
                today: 'אף אחד לא בטוח איזו גרסה נכונה ואיפה היא.',
                withAgent: 'קודם בונים מערכת שמחזיקה את המסמכים, ואז סוכן שמוצא ומתייק.',
            },
            know: {
                name: 'ידע בתוך הארגון',
                steps: [
                    {
                        person: ['עובד שואל שאלה', '״איך מטפלים במקרה כזה?״'],
                        agent: ['עובד שואל שאלה', 'בצ׳אט פנימי'],
                        byAgent: false,
                    },
                    {
                        person: ['מחפש את מי לשאול', 'רק שניים יודעים'],
                        agent: ['עונה מתוך הנהלים', 'עם קישור למקור'],
                        byAgent: true,
                    },
                    {
                        person: ['מחכים לתשובה', 'שעות, לפעמים ימים'],
                        agent: ['אומר ״לא יודע״', 'ומפנה לאדם הנכון'],
                        byAgent: true,
                    },
                    {
                        person: ['התשובה בוואטסאפ', 'ונעלמת שם'],
                        agent: ['שומר את התשובה', 'למאגר, אחרי אישור'],
                        byAgent: true,
                    },
                    {
                        person: ['שואלים שוב', 'בעוד חודש'],
                        agent: ['בפעם הבאה', 'התשובה כבר שם'],
                        byAgent: false,
                    },
                ],
                today: 'הידע יושב בראש של שניים־שלושה אנשים.',
                withAgent: 'הידע נשאר בארגון, והמומחים נשאלים רק מה שחדש.',
            },
        },
        site: SITE_HE,
        plan: {
            step2: '2 · רואים כאן איך הוא ענה',
            base: {
                title: 'איך הסוכן עונה',
                cap: 'כל שאלה עוברת את חמש התחנות האלה. שאלו משהו מימין, והן יידלקו אחת אחת.',
                sumH: 'למה זה כאן:',
                sumT: 'כך נראה סוכן שאפשר לבדוק. רואים מה הוא קרא, וכמה זמן זה לקח.',
            },
            running: { title: 'מאחורי התשובה הזו', cap: 'כל תחנה נדלקת כשהיא קורית.' },
            lit: {
                kicker: 'המסלול של התשובה',
                title: 'מאחורי התשובה הזו',
                cap: 'חמש התחנות שהתשובה עברה, עם מה שנקרא וכמה זמן זה לקח.',
            },
            ready: {
                title: 'תשובה מוכנה: המסלול הקצר',
                cap: 'כתבתי אותה מראש, והמודל לא הופעל.',
                skipped: 'דילוג',
                skipNote: 'לא נדרש לתשובה מוכנה',
                who: 'מוכן',
                done: 'תשובה מוכנה מראש',
                note: 'בלי AI, ובלי לגעת במכסה',
                sum: 'הגיעה מיד, מתוכן שכתבתי. לא כל שאלה צריכה AI.',
            },
            fromAnswer: 'נוצר מהתשובה הזו',
            fromChat: 'נוצר מהשיחה הזו',
            today: 'היום',
            withAgent: 'עם סוכן',
            cmpTitle: ': היום ועם סוכן',
            cmpCap: 'נקודה צהובה היא שלב שהסוכן לוקח. האדם נשאר לאשר.',
            person: 'אדם',
            agent: 'סוכן',
            checked: 'עבר. לא רובוט, ויש מכסה',
            instant: 'מיידי',
            docsOf: (n, of) => `${n} מסמכים מתוך ${of} הונחו מול המודל`,
            noDocs: 'שום מסמך לא עוסק בזה במיוחד',
            modelNote: 'פנייה אחת למודל, והתשובה נכתבה רק מהמסמכים האלה',
            sumH: 'התשובה הזו:',
            sumFrom: (n) => `נכתבה מתוך ${n} מסמכים שכתבתי. המודל לא ראה שום דבר אחר.`,
            sumDeclined: 'הסוכן אמר שהוא לא יודע, במקום להמציא.',
            trail: (n, sec) => `קרא ${n} מסמכים · ${sec} שניות`,
            trailNone: (sec) => `לא נמצא מסמך מתאים · ${sec} שניות`,
            trailOpen: 'איך הגעתי לתשובה',
            back: 'חזרה לשרטוט של התשובה',
        },
    },
    en: {
        panelLabel: "The site's chat",
        who: 'My agent',
        whoNote: 'Answers for me, only from what I wrote',
        step1: '1 · Ask here',
        greeting:
            "Hi, this is the agent I built. It answers for me, only from what I wrote. Ask about my work, or about what an agent could do for you. On the right you'll see how each answer was reached.",
        startHint: 'You can start here, or type your own question',
        starters: [
            {
                q: 'What have you built with agents?',
                sub: 'Three systems, in one diagram',
                action: 'ask',
                sheet: 'built',
            },
            {
                q: 'What would an agent change for us?',
                sub: 'A process you pick, today and with an agent',
                action: 'compare',
            },
            {
                q: 'How much does it cost?',
                sub: 'How the price is set',
                action: 'ask',
                sheet: 'price',
            },
            {
                q: 'Any experience with a document archive?',
                sub: '56,607 files that moved to the cloud',
                action: 'ask',
                sheet: 'legal',
            },
        ],
        alsoAsk: 'You can also ask',
        followUps: [
            { q: 'Show me a map of the systems', sheet: 'map' },
            { q: 'Why talk to you in particular?', sheet: 'why' },
        ],
        ready: {
            q: 'What do you build?',
            a: 'AI agents that do a defined part of the work from your data, custom CRM systems, and information systems an agent can connect to later.',
        },
        mailSent: "Got it. The message is in my inbox, and I'll reply to the email you wrote.",
        mailSentWithQuestion:
            "Got it. Your question is in my inbox, and I'll reply to the email you wrote.",
        anythingElse: 'Anything else you would like to ask?',
        placeholder: 'Type a question',
        examplePrefix: 'For example: ',
        examples: [
            'Any experience with a document archive?',
            'What have you built with agents?',
            'How much does it cost?',
            'Can an agent be connected to our CRM?',
            'How do I contact you?',
            'Can I send you an email?',
            'What is PersonaKit?',
        ],
        emailPlaceholder: 'Your email, and a line about the subject',
        emailPlaceholderMore: 'Your email',
        inputLabel: 'Free question',
        send: 'Ask',
        suggestionsLabel: 'Follow-up suggestions',
        working: 'The agent is working',
        workingNote: 'Checking, choosing documents and writing…',
        answered: 'The agent answered',
        seconds: 'seconds',
        secondsShort: 's',
        sources: 'Sources',
        noSource: 'No matching document found',
        readyTag: 'Ready answer · no AI',
        sentTag: 'Sent ✓ · no AI',
        asking: 'Asking about:',
        contactReply:
            "Three ways: a 20 to 30 minute discovery call, an email straight from the chat, or WhatsApp. They're waiting on the right.",
        mailReply:
            "Gladly. Type your email here with a line on what you'd like to talk about, and I'll get back to you directly.",
        mailAsk: 'Can I send you an email?',
        invalidEmail: "That address doesn't look valid. Check it and send again.",
        offline:
            "The agent is unavailable right now: it can't reach its material, so it won't answer at all rather than guess. You can still book a call.",
        errors: {
            tooLong: 'That message is too long. Try a shorter one.',
            rateLimited: 'Too many messages just now. Give it a moment and try again.',
            rateLimitedIn: 'Too many messages just now. Try again in {n} seconds.',
            failed: 'That message did not go through. Try sending it again.',
        },
        compare: {
            ask: 'What would an agent change for us?',
            pickProcess:
                "Which process bothers you most? I'll draw it twice: as it is today, and with an agent.",
            drawn: 'I drew it on the right twice: as it looks today in most businesses, and next to it the same process with an agent. How many people handle this for you today?',
            team: ['Just me', '2 to 5', 'More than 5'],
            pickAnswer: 'Pick an answer',
            pickProcessLabel: 'Pick a process',
            summary:
                "That's the summary. It reaches me before the discovery call, so we don't start from zero.",
            cardTitle: 'Your summary',
            process: 'The process',
            handledBy: 'Handled today by',
            interested: "We're interested in",
            interestedValue: 'An AI agent',
            book: 'Book a discovery call',
            another: 'Another process',
        },
        art: {
            diagram: 'A diagram for this answer',
            opensSide: 'opens on the right',
            opensBelow: 'opens below',
            open: 'Open',
        },
        phone: {
            greeting:
                'Hi, this is the agent I built. It answers for me, only from what I wrote. Ask about my work, or about what an agent could do for you.',
            teaser: 'Every answer comes with a diagram of how the agent got there.',
            resume: 'Continue the conversation',
            close: 'Close the chat',
            backToChat: 'Back to the chat',
            closeSheet: 'Close the diagram',
        },
        book: 'Book a discovery call',
        processes: {
            support: {
                name: 'Customer requests',
                steps: [
                    {
                        person: [
                            'A customer sends a message',
                            'On WhatsApp, by email or through a form',
                        ],
                        agent: ['A customer sends a message', 'On any channel'],
                        byAgent: false,
                    },
                    {
                        person: ['Someone reads and sorts it', 'Waits until someone is free'],
                        agent: ['Sorts the request', 'At once, at any hour'],
                        byAgent: true,
                    },
                    {
                        person: ['Looking for the answer', 'In three different systems'],
                        agent: ['Finds the answer', 'From your data only'],
                        byAgent: true,
                    },
                    {
                        person: ['Writing a reply', 'From scratch, every time'],
                        agent: ['Drafts a reply', 'With the source it relied on'],
                        byAgent: true,
                    },
                    {
                        person: ['Sending', 'And sometimes forgetting'],
                        agent: ['A person approves and sends', 'The person keeps the decision'],
                        byAgent: false,
                    },
                ],
                today: 'Most of the time goes on finding and wording answers that were already written.',
                withAgent:
                    "The agent prepares, and your team approves. What the agent doesn't know goes to a person.",
            },
            sales: {
                name: 'Quotes',
                steps: [
                    {
                        person: ['A request comes in', 'A new lead'],
                        agent: ['A request comes in', 'A new lead'],
                        byAgent: false,
                    },
                    {
                        person: ['Collecting details', 'Three calls back and forth'],
                        agent: ['Collects the details', "Asks the customer what's missing"],
                        byAgent: true,
                    },
                    {
                        person: ['Building a quote', 'Copy and paste from an old quote'],
                        agent: ['Prepares a draft quote', 'From your template and price list'],
                        byAgent: true,
                    },
                    {
                        person: ['A manager approves', 'When they have time'],
                        agent: ['A manager approves', 'Sees what changed from the template'],
                        byAgent: false,
                    },
                    {
                        person: ['Follow-up', "Depends on the salesperson's memory"],
                        agent: ['Follows up and reminds', 'And updates the CRM'],
                        byAgent: true,
                    },
                ],
                today: "Quotes go out late, and follow-up depends on people's memory.",
                withAgent:
                    'The quote is ready for approval the same day, and follow-up happens on its own.',
            },
            docs: {
                name: 'Documents and archive',
                steps: [
                    {
                        person: ['A document arrives', 'By email or scan'],
                        agent: ['A document arrives', 'By email or scan'],
                        byAgent: false,
                    },
                    {
                        person: ['Filed by hand', 'Each person their own way'],
                        agent: ['Identifies and files it', 'By client, case and type'],
                        byAgent: true,
                    },
                    {
                        person: ['Looking for it', '"Where\'s the latest version?"'],
                        agent: ['Answers where the document is', 'And which version is current'],
                        byAgent: true,
                    },
                    {
                        person: ['Updating a version', 'And sometimes overwriting'],
                        agent: ['Editing with a lock', 'Every version is kept'],
                        byAgent: false,
                    },
                    {
                        person: ['Sharing', 'As an attachment'],
                        agent: ['Sharing from the system', 'With permissions'],
                        byAgent: false,
                    },
                ],
                today: 'Nobody is sure which version is right or where it is.',
                withAgent:
                    'First build a system that holds the documents, then an agent that finds and files.',
            },
            know: {
                name: 'Knowledge inside the organization',
                steps: [
                    {
                        person: [
                            'An employee asks a question',
                            '"How do we handle a case like this?"',
                        ],
                        agent: ['An employee asks a question', 'In the internal chat'],
                        byAgent: false,
                    },
                    {
                        person: ['Looking for who to ask', 'Only two people know'],
                        agent: ['Answers from the procedures', 'With a link to the source'],
                        byAgent: true,
                    },
                    {
                        person: ['Waiting for an answer', 'Hours, sometimes days'],
                        agent: ['Says "I don\'t know"', 'And points to the right person'],
                        byAgent: true,
                    },
                    {
                        person: ['The answer is on WhatsApp', 'And gets lost there'],
                        agent: ['Saves the answer', 'To the knowledge base, after approval'],
                        byAgent: true,
                    },
                    {
                        person: ['Asking again', 'A month later'],
                        agent: ['Next time', 'The answer is already there'],
                        byAgent: false,
                    },
                ],
                today: 'The knowledge sits in the heads of two or three people.',
                withAgent:
                    "The knowledge stays in the organization, and the experts are asked only what's new.",
            },
        },
        site: SITE_EN,
        plan: {
            step2: '2 · See here how it answered',
            base: {
                title: 'How the agent answers',
                cap: 'Every question goes through these five stops. Ask something on the left, and they light up one by one.',
                sumH: 'Why this is here:',
                sumT: 'This is what an agent you can check looks like. You see what it read, and how long it took.',
            },
            running: { title: 'Behind this answer', cap: 'Each stop lights up as it happens.' },
            lit: {
                kicker: "The answer's path",
                title: 'Behind this answer',
                cap: 'The five stops the answer went through, with what was read and how long it took.',
            },
            ready: {
                title: 'Ready answer: the short path',
                cap: 'I wrote it ahead of time, and the model was not called.',
                skipped: 'Skipped',
                skipNote: 'Not needed for a ready answer',
                who: 'Ready',
                done: 'Answer prepared in advance',
                note: 'No AI, and no quota used',
                sum: 'It arrived at once, from content I wrote. Not every question needs AI.',
            },
            fromAnswer: 'Made from this answer',
            fromChat: 'Made from this chat',
            today: 'Today',
            withAgent: 'With an agent',
            cmpTitle: ': today and with an agent',
            cmpCap: 'A yellow dot is a step the agent takes. The person stays to approve.',
            person: 'Person',
            agent: 'Agent',
            checked: 'Passed. Not a bot, and within quota',
            instant: 'Instant',
            docsOf: (n, of) => `${n} documents out of ${of} were put in front of the model`,
            noDocs: 'No document deals with this specifically',
            modelNote:
                'One call to the model, and the answer was written only from these documents',
            sumH: 'This answer:',
            sumFrom: (n) => `was written from ${n} of my documents. The model saw nothing else.`,
            sumDeclined: "The agent said it doesn't know, instead of making something up.",
            trail: (n, sec) => `Read ${n} documents · ${sec} seconds`,
            trailNone: (sec) => `No matching document found · ${sec} seconds`,
            trailOpen: 'How I got to the answer',
            back: "Back to the answer's diagram",
        },
    },
};
