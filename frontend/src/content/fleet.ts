import { Localized } from '@/i18n/lang';

/*
 * The agent fleet drawn as a sun: the head agent in the centre, one ray per
 * group, every dot one agent. The structure and counts follow the fleet's own
 * system map; what is published is deliberately abstract. Each dot carries one
 * line on why that agent exists, never what it is called or how it works.
 */
type Line = Localized<string>;

export interface FleetGroup {
    name: Line;
    /** Why the group exists, shown when the ray is picked. */
    why: Line;
    /** The group lead's line. */
    lead: Line;
    /** One line per agent in the group. */
    agents: Line[];
}

export const FLEET_HEAD: { name: Line; line: Line } = {
    name: {
        he: 'הסוכן הראשי',
        en: 'The head agent',
    },
    line: {
        he: 'אי אפשר לדבר עם עשרות סוכנים. מדברים עם אחד.',
        en: "You can't talk to dozens of agents. You talk to one.",
    },
};

export const FLEET_GROUPS: FleetGroup[] = [
    {
        name: {
            he: 'ענן ותשתית',
            en: 'Cloud and infrastructure',
        },
        why: {
            he: 'כי חשבון ענן שלא מסתכלים עליו מפתיע בסוף החודש.',
            en: 'Because a cloud account nobody watches surprises you at the end of the month.',
        },
        lead: {
            he: 'רואה הכול ולא משנה כלום. שינויים עוברים רק דרכי.',
            en: 'Sees everything and changes nothing. Changes go only through me.',
        },
        agents: [
            {
                he: 'תקרת הוצאה שאף אחד לא בודק היא לא תקרה.',
                en: 'A spending cap nobody checks is not a cap.',
            },
            {
                he: 'התראה שאף אחד לא קורא היא רק רעש.',
                en: 'An alert nobody reads is just noise.',
            },
            {
                he: 'הרשאה שנשכחה פתוחה היא הדלת שדרכה נכנסים.',
                en: 'A permission left open is the door people come in through.',
            },
        ],
    },
    {
        name: {
            he: 'אמינות המערך',
            en: 'Fleet reliability',
        },
        why: {
            he: 'כי עשרות סוכנים בלי השגחה הם עשרות מקומות שמשהו יכול להישבר בהם.',
            en: 'Because dozens of agents without supervision are dozens of places where something can break.',
        },
        lead: {
            he: 'מדבר רק כשיש בעיה. שקט אומר שהכול תקין.',
            en: "Speaks only when there's a problem. Silence means all is well.",
        },
        agents: [
            {
                he: 'סוכן שנתקע בשקט גרוע מסוכן שנכשל בקול.',
                en: 'An agent stuck in silence is worse than one that fails loudly.',
            },
            {
                he: 'לדעת שמשהו נשבר זה חצי. צריך לדעת למה.',
                en: 'Knowing something broke is half. You need to know why.',
            },
            {
                he: 'מערך שאי אפשר לצייר, אי אפשר לנהל.',
                en: "A fleet you can't draw is a fleet you can't manage.",
            },
        ],
    },
    {
        name: {
            he: 'עסק עצמאי',
            en: 'Solo business',
        },
        why: {
            he: 'כי בעסק של אדם אחד, אני גם מחפש העבודה, גם המפתח וגם המעצב.',
            en: "Because in a one-person business, I'm the job hunter, the developer and the designer.",
        },
        lead: {
            he: 'שהעבודה על העסק לא תידחה בגלל העבודה בעסק.',
            en: "So that work on the business isn't pushed aside by work in the business.",
        },
        agents: [
            {
                he: 'מחפש בשבילי. פונה רק אחרי שאישרתי.',
                en: 'Searches for me. Reaches out only after I approve.',
            },
            {
                he: 'הזדמנות טובה נעלמת תוך יום. מישהו צריך לראות אותה.',
                en: 'A good opportunity is gone within a day. Someone has to see it.',
            },
            {
                he: 'קוד שלא נבדק לא עולה לאוויר.',
                en: "Code that wasn't reviewed doesn't go live.",
            },
            {
                he: 'שקף ראשון לוקח שעה. טיוטה מוכנה לוקחת דקה.',
                en: 'A first slide takes an hour. A ready draft takes a minute.',
            },
            {
                he: 'מי שכתב לא רואה את הטעויות של עצמו.',
                en: "Whoever wrote it doesn't see their own mistakes.",
            },
        ],
    },
    {
        name: {
            he: 'לינקדאין',
            en: 'LinkedIn',
        },
        why: {
            he: 'כי נוכחות מקצועית דורשת עקביות, ואין לי שעה ביום בשבילה.',
            en: "Because a professional presence takes consistency, and I don't have an hour a day for it.",
        },
        lead: {
            he: 'אוסף ומנתח בלבד. לפרסם אני מפרסם בעצמי.',
            en: 'Collects and analyzes only. Publishing I do myself.',
        },
        agents: [
            {
                he: 'מה שסימנתי היום נשכח עד מחר.',
                en: 'What I marked today is forgotten by tomorrow.',
            },
            {
                he: 'שמרתי כדי לקרוא. לא קראתי.',
                en: 'Saved to read. Never read.',
            },
            {
                he: 'התובנה הטובה מסתתרת בתגובה החמישית.',
                en: 'The good insight hides in the fifth comment.',
            },
        ],
    },
    {
        name: {
            he: 'X',
            en: 'X',
        },
        why: {
            he: 'כי הדברים המעניינים נבלעים בפיד תוך שעה.',
            en: 'Because the interesting things get buried in the feed within an hour.',
        },
        lead: {
            he: 'מתוך מאה דברים, שלושה שווים את הזמן שלי.',
            en: 'Out of a hundred things, three are worth my time.',
        },
        agents: [
            {
                he: 'אוסף בזמן שאני עובד על משהו אחר.',
                en: 'Collects while I work on something else.',
            },
            {
                he: 'בלי תיוג, שמירה היא רק ערימה.',
                en: 'Without tags, saving is just a pile.',
            },
            {
                he: 'רוב התגובות רעש. צריך למצוא את האחת.',
                en: 'Most replies are noise. You need to find the one.',
            },
        ],
    },
    {
        name: {
            he: 'Trinity Legal',
            en: 'Trinity Legal',
        },
        why: {
            he: 'כי קל להתאהב ברעיון, וקשה לבדוק אותו ביושר.',
            en: "Because it's easy to fall for an idea, and hard to test it honestly.",
        },
        lead: {
            he: 'שאלה אחת: האם משרד קטן באמת צריך את זה?',
            en: 'One question: does a small office really need this?',
        },
        agents: [
            {
                he: 'מספר בלי מקור לא נכנס לדוח.',
                en: 'A number without a source stays out of the report.',
            },
            {
                he: 'רק ממקורות ציבוריים. בלי קיצורי דרך.',
                en: 'Public sources only. No shortcuts.',
            },
            {
                he: 'כותב, לא שולח. ההחלטה לשלוח היא שלי.',
                en: "Writes, doesn't send. The decision to send is mine.",
            },
            {
                he: 'החלטה שלא נרשמה תתקבל שוב בעוד חודש.',
                en: "A decision that wasn't written down gets made again a month later.",
            },
        ],
    },
    {
        name: {
            he: 'סטודיו וידאו',
            en: 'Video studio',
        },
        why: {
            he: 'כי סרטון אחד דורש שישה בעלי מקצוע, ולי יש ערב אחד.',
            en: 'Because one video takes six professionals, and I have one evening.',
        },
        lead: {
            he: 'בלי תוכנית אחת, כל סוכן עושה סרטון אחר.',
            en: 'Without one plan, each agent makes a different video.',
        },
        agents: [
            {
                he: 'דמות שנראית אחרת בכל סצנה הורסת את הסרטון.',
                en: 'A character that looks different in every scene ruins the video.',
            },
            {
                he: 'החלק שאוכל הכי הרבה שעות.',
                en: 'The part that eats the most hours.',
            },
            {
                he: 'אין לי אולפן, ואין לי סבלנות לעשרים טייקים.',
                en: "I don't have a studio, or the patience for twenty takes.",
            },
            {
                he: 'בלי סאונד טוב, גם תמונה יפה מרגישה זולה.',
                en: 'Without good sound, even a beautiful picture feels cheap.',
            },
            {
                he: 'מישהו צריך להגיד ״זה עוד לא מספיק טוב״.',
                en: 'Someone has to say "this isn\'t good enough yet".',
            },
            {
                he: 'סרטון עם עובדה שגויה מזיק יותר מסרטון שלא יצא.',
                en: 'A video with a wrong fact does more harm than a video that never shipped.',
            },
        ],
    },
];

/** The agents that report to the head directly, drawn between the rays. */
export const FLEET_DIRECT: { name: Line; why: Line; agents: Line[] } = {
    name: {
        he: 'מדווחים ישירות',
        en: 'Direct reports',
    },
    why: {
        he: 'כי יש דברים שהסוכן הראשי צריך יד ישירה עליהם.',
        en: 'Because there are things the head agent needs a direct hand on.',
    },
    agents: [
        {
            he: 'כותב רק על עבודה שבאמת נעשתה. לא מפרסם לבד.',
            en: "Writes only about work that was actually done. Doesn't publish on its own.",
        },
        {
            he: 'פוסט בלי תמונה נגלל הלאה.',
            en: 'A post without an image gets scrolled past.',
        },
        {
            he: 'גם מי שבודק אחרים צריך שיבדקו אותו.',
            en: 'Whoever checks others needs checking too.',
        },
        {
            he: 'משימה שלא נרשמה היא משימה שלא תיעשה.',
            en: "A task that wasn't written down is a task that won't get done.",
        },
        {
            he: 'סוכן ששוכח מה סוכם אתמול מתחיל כל יום מאפס.',
            en: 'An agent that forgets what was agreed yesterday starts every day from zero.',
        },
        {
            he: 'יש מידע שרק סוכן אחד רואה.',
            en: 'Some information only one agent can see.',
        },
        {
            he: 'הניירת של העסק מוכנה מראש. שום רישום לא נסגר בלי אישור שלי.',
            en: 'The business paperwork is ready ahead of time. No entry is closed without my approval.',
        },
    ],
};

export type FleetLayer = 'head' | 'lead' | 'sub' | 'dir';

/*
 * One card per number tile: the idea of that layer, kept abstract.
 * The counts are what a visitor sees on the tiles; "25+" rather than the exact
 * number, because the published claim is "more than 40 agents".
 */
export const FLEET_LAYERS: {
    id: FleetLayer;
    count: string;
    label: Line;
    title: Line;
    why: Line;
    helps: Line;
    solved: Line;
}[] = [
    {
        id: 'head',
        count: '1',
        label: { he: 'סוכן ראשי', en: 'Head agent' },
        title: { he: 'הסוכן הראשי', en: 'The head agent' },
        why: {
            he: 'אי אפשר לדבר עם עשרות סוכנים. צריך כתובת אחת.',
            en: "You can't talk to dozens of agents. You need one address.",
        },
        helps: {
            he: 'אני מבקש פעם אחת, והוא יודע למי להעביר ומה להחזיר לי.',
            en: 'I ask once, and it knows who to pass it to and what to bring back.',
        },
        solved: {
            he: 'הפסקתי לזכור איזה סוכן עושה מה, ולרדוף אחרי כל אחד בנפרד.',
            en: 'I stopped remembering which agent does what, and chasing each one separately.',
        },
    },
    {
        id: 'lead',
        count: '7',
        label: { he: 'ראשי קבוצות', en: 'Group leads' },
        title: { he: 'ראשי הקבוצות', en: 'The group leads' },
        why: {
            he: 'סוכן אחד שמנהל עשרות אחרים הופך לצוואר בקבוק.',
            en: 'One agent managing dozens of others becomes a bottleneck.',
        },
        helps: {
            he: 'כל תחום מנוהל על ידי מי שמכיר אותו, ותקלה בתחום אחד לא עוצרת את השאר.',
            en: "Each area is run by whoever knows it, and a failure in one area doesn't stop the rest.",
        },
        solved: {
            he: 'המרכז כבר לא צריך להבין כל פרט בכל תחום.',
            en: 'The centre no longer needs to understand every detail in every area.',
        },
    },
    {
        id: 'sub',
        count: '25+',
        label: { he: 'תתי־סוכנים', en: 'Sub-agents' },
        title: { he: 'תתי־הסוכנים', en: 'The sub-agents' },
        why: {
            he: 'סוכן שעושה דבר אחד עושה אותו טוב.',
            en: 'An agent that does one thing does it well.',
        },
        helps: {
            he: 'קל לבדוק אותו, קל לתקן אותו, וקל להחליף אותו בלי לגעת באחרים.',
            en: 'Easy to check, easy to fix, and easy to replace without touching the others.',
        },
        solved: {
            he: 'סוכן ״כל־יכול״ שטועה, ואי אפשר לדעת איפה.',
            en: 'A do-everything agent that gets it wrong, with no way to tell where.',
        },
    },
    {
        id: 'dir',
        count: '7',
        label: { he: 'מדווחים ישירות', en: 'Direct reports' },
        title: { he: 'מדווחים ישירות', en: 'Direct reports' },
        why: {
            he: 'יש דברים רגישים שצריכים יד ישירה של המרכז.',
            en: "Some sensitive things need the centre's direct hand.",
        },
        helps: {
            he: 'פחות ידיים בדרך, והרשאה מצומצמת לכל אחד.',
            en: 'Fewer hands on the way, and a narrow permission for each.',
        },
        solved: {
            he: 'מידע רגיש שעובר דרך יותר מדי סוכנים.',
            en: 'Sensitive data passing through too many agents.',
        },
    },
];

export const FLEET_UI: Localized<{
    chartLabel: string;
    groupsLabel: string;
    filterLabel: string;
    keyLabel: string;
    coreTitle: string;
    coreSub: string;
    shown: string;
    group: string;
    aroundCentre: string;
    hint: string;
    whyDone: string;
    howHelps: string;
    whatSolved: string;
    position: (n: number, of: number) => string;
    prevGroup: string;
    nextGroup: string;
    /** Roles beside each line in the phone's group card. */
    /** Above a group's list on a phone: its lead and N sub-agents. */
    rolesHead: (subs: number) => string;
    /** Above the direct reports' list on a phone. */
    directHead: (n: number) => string;
    /** Reveals the rest of a long list. */
    moreAgents: (n: number) => string;
}> = {
    he: {
        chartLabel: 'מערך הסוכנים: סוכן ראשי במרכז, שבע קבוצות סביבו',
        groupsLabel: 'קבוצות הסוכנים',
        filterLabel: 'סינון השרטוט',
        keyLabel: 'מקרא השרטוט',
        coreTitle: 'הסוכן הראשי',
        coreSub: 'מחלק עבודה',
        shown: 'מוצג בשרטוט',
        group: 'קבוצה',
        aroundCentre: 'סביב המרכז',
        hint: 'עברו על נקודה כדי לראות למה הסוכן הזה קיים.',
        whyDone: 'למה זה נעשה',
        howHelps: 'איך זה מועיל',
        whatSolved: 'מה זה פתר',
        position: (n, of) => `קבוצה ${n} מתוך ${of}`,
        prevGroup: 'הקבוצה הקודמת',
        nextGroup: 'הקבוצה הבאה',
        rolesHead: (n) => `ראש קבוצה ו־${n} תתי־סוכנים, ולמה כל אחד קיים`,
        directHead: (n) => `${n} סוכנים, ולמה כל אחד מהם קיים`,
        moreAgents: (n) => (n === 1 ? 'עוד סוכן אחד' : `עוד ${n} סוכנים`),
    },
    en: {
        chartLabel: 'The agent fleet: a head agent in the centre, seven groups around it',
        groupsLabel: 'Agent groups',
        filterLabel: 'Filter the chart',
        keyLabel: 'Chart key',
        coreTitle: 'The head agent',
        coreSub: 'Hands out work',
        shown: 'Shown in the chart',
        group: 'Group',
        aroundCentre: 'Around the centre',
        hint: 'Hover over a dot to see why this agent exists.',
        whyDone: 'Why it was done',
        howHelps: 'How it helps',
        whatSolved: 'What it solved',
        position: (n, of) => `Group ${n} of ${of}`,
        prevGroup: 'Previous group',
        nextGroup: 'Next group',
        rolesHead: (n) => `A group lead and ${n} sub-agents, and why each one exists`,
        directHead: (n) => `${n} agents, and why each of them exists`,
        moreAgents: (n) => (n === 1 ? 'One more agent' : `${n} more agents`),
    },
};
