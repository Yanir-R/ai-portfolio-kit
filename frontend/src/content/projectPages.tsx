import { LINKS } from '@/constants/links';
import { Localized } from '@/i18n/lang';
import type { ProjectPage } from '@/types/projectPage';

/*
 * The drawn pages of the main projects, in both languages. Every fact here
 * was checked against the project's own repository; the write-ups the chat
 * reads (backend/docs/projects) say the same things in words, so keep the two
 * in step.
 *
 * Privacy: the Trinity Legal client is never named, and no private
 * repository is linked.
 */

const ext = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener">
        {label}
    </a>
);

const PK_LINKS = (
    <>
        {ext(LINKS.personakit, 'personakit.me')} · {ext(LINKS.personakitDocs, 'personakit.me/docs')}
    </>
);

// The section taglines are the same on every page.
const TAG = {
    he: ['01 · הבעיה', '02 · המבנה', '03 · הרשאות', '04 · מאחורי הקלעים', '05 · בשבילכם'],
    en: [
        '01 · The problem',
        '02 · The build',
        '03 · Permissions',
        '04 · Under the hood',
        '05 · For you',
    ],
};
const TECH_LEGEND = {
    he: 'בכחול: הכלי שבו החלק בנוי, בשביל מי שמפתח',
    en: 'In blue: what each part is built with, for developers',
};
const DEV = { he: 'למפתחים: הטכנולוגיות', en: 'For developers: the stack' };

const trinityLegal: Localized<ProjectPage> = {
    he: {
        lede: (
            <>
                מערכת לניהול תיקים ומסמכים שבניתי בהתאמה אישית{' '}
                <b>למשרד עורכי דין קטן שמתמחה בנדל״ן ומקרקעין</b>. את האפיון עשיתי בישיבות עם עורכי
                הדין, והיא רצה היום בענן, בעברית, בפיילוט חי עם לקוחות פעילים.
            </>
        ),
        facts: [
            { value: '56,607', label: 'קבצים מהארכיון של המשרד יובאו, עם תיעוד מלא' },
            { value: '651', label: 'קבצים שהמערכת לא הכריעה עליהם לבד, והשאירה להחלטה של אדם' },
            { value: '6', label: 'תפקידים, ולכל אחד הרשאות משלו שנבדקות בכל פעולה' },
        ],
        problem: {
            tagline: TAG.he[0],
            title: 'מה היה כואב, ומה רץ היום',
            intro: 'כאבים שהרבה משרדים קטנים מכירים, ומה המערכת עושה עם כל אחד.',
            columns: ['לפני', 'היום, במערכת'],
            rows: [
                {
                    before: 'מסמכים מפוזרים בין מחשבים, תיקיות ומיילים',
                    lead: 'כל תיק במקום אחד:',
                    rest: 'הלקוח, הצדדים, המסמכים והמיילים שלו. קבצים מצורפים נגררים ישר מ־Gmail או מ־Outlook.',
                },
                {
                    before: 'לא ברור מהי הגרסה העדכנית',
                    lead: 'כל שמירה היא גרסה חדשה,',
                    rest: 'וגרסה שנשמרה לא נכתבת מחדש. תמיד אפשר לחזור אחורה.',
                },
                {
                    before: 'שניים עורכים אותו מסמך, ואחד דורס את השני',
                    lead: 'עריכה בהשאלה:',
                    rest: 'השמירה נבדקת מול הגרסה שממנה העריכה התחילה. אם מישהו שמר בינתיים, נשמרת גרסה נפרדת ושום דבר לא הולך לאיבוד.',
                },
                {
                    before: 'ארכיון של שנים בתיקיות על מחשב אחד',
                    lead: '56,607 קבצים יובאו',
                    rest: 'עם תיעוד מלא של כל קובץ. מה שהמערכת לא הייתה בטוחה לגביו חיכה לאישור של אדם.',
                },
                {
                    before: 'קובץ חשוד שמגיע במייל',
                    lead: 'כל קובץ נסרק לנוזקות',
                    rest: 'לפני שמישהו יכול לפתוח אותו.',
                },
                {
                    before: 'מועדים ומסמכים חסרים שזוכרים בעל פה',
                    lead: 'תאריכי עסקה ומועדים מחושבים,',
                    rest: 'ורשימת מסמכים נדרשים לכל סוג תיק.',
                },
            ],
        },
        flow: {
            tagline: TAG.he[1],
            title: 'איך זה בנוי',
            intro: 'המסלול של כל בקשה במערכת, מהאדם ועד המידע. בכל תיבה: מה היא עושה במילים פשוטות.',
            columns: [
                { label: 'מי עובד', people: ['עורכי דין', 'מזכירות', 'בעלי המשרד'] },
                {
                    label: 'איפה עובדים',
                    nodes: [
                        {
                            title: 'אפליקציה בדפדפן',
                            text: 'בעברית, מימין לשמאל, אפשר להתקין כאפליקציה במחשב',
                            tech: 'Next.js · React',
                        },
                        {
                            title: 'התוסף למחשב',
                            text: 'פותח ושומר מסמכים ב־Word וב־Excel',
                            tech: '.NET 10',
                        },
                        {
                            title: 'המייל של המשרד',
                            text: 'שליחה ללקוח ותיוק מיילים נכנסים',
                            tech: 'Gmail',
                        },
                    ],
                },
                {
                    label: 'שער אחד',
                    nodes: [
                        {
                            title: 'השרת',
                            text: 'בודק בכל בקשה מי אתם, לאיזה משרד אתם שייכים ומה מותר לכם. כל פעולה נרשמת ביומן.',
                            tech: 'Fastify · TypeScript',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'איפה המידע',
                    nodes: [
                        {
                            title: 'מסד הנתונים',
                            text: 'כל משרד רואה רק את שלו. ההפרדה נאכפת במסד עצמו, לא רק בקוד',
                            tech: 'PostgreSQL · RLS',
                        },
                        {
                            title: 'אחסון הקבצים',
                            text: 'הקבצים נשמרים בדיוק כמו שהועלו, כל גרסה בנפרד',
                            tech: 'Cloud Storage',
                        },
                        {
                            title: 'סורק נוזקות',
                            text: 'מתעורר על כל העלאה, והקובץ זמין רק אחרי שנסרק',
                            tech: 'ClamAV · Pub/Sub',
                        },
                    ],
                },
            ],
            jobs: {
                label: 'ברקע, 6 משימות מתוזמנות:',
                items: [
                    'גיבוי של המסד',
                    'בדיקה שהקבצים לא השתנו',
                    'סריקה חוזרת',
                    'ניקוי העלאות ונעילות שנתקעו',
                ],
                tech: 'Cloud Scheduler',
            },
            legend: 'הכול רץ על Google Cloud.',
            techLegend: TECH_LEGEND.he,
        },
        rules: {
            tagline: TAG.he[2],
            title: 'מי רשאי לעשות מה',
            intro: 'במשרד עורכי דין ההרשאות הן חלק מהעבודה, לא תוספת. כך הן נראות במערכת.',
            matrix: {
                corner: 'פעולה',
                columns: [
                    'צופה',
                    'מזכיר/ה',
                    'עורך/ת דין',
                    'מנהל/ת משרד',
                    'בעלי המשרד',
                    'אני, המפתח',
                ],
                me: 5,
                rows: [
                    {
                        label: 'לקרוא תיקים ומסמכים',
                        cells: ['y', 'y', 'y', 'y', 'y', { tag: 'בחלון תמיכה', dashed: true }],
                    },
                    {
                        label: 'לערוך, להעלות ולשלוח ללקוח',
                        cells: ['x', 'y', 'y', 'y', 'y', { tag: 'בחלון תמיכה', dashed: true }],
                    },
                    {
                        label: 'לראות תעודת זהות מלאה',
                        note: 'כל צפייה נרשמת ביומן',
                        cells: ['x', 'y', 'y', 'y', 'y', { tag: 'בחלון תמיכה', dashed: true }],
                    },
                    {
                        label: 'למחוק',
                        note: 'לסל המחזור, ואפשר לשחזר',
                        cells: ['x', { tag: 'מבקש/ת' }, 'y', 'y', 'y', 'x'],
                    },
                    {
                        label: 'יומן הפעילות',
                        cells: ['x', 'x', 'y', 'y', 'y', { tag: 'בלי שמות לקוחות' }],
                    },
                    { label: 'להזמין ולהסיר אנשים', cells: ['x', 'x', 'x', 'y', 'y', 'y'] },
                    { label: 'לפתוח למפתח חלון תמיכה', cells: ['x', 'x', 'x', 'x', 'y', 'x'] },
                ],
                cards: [
                    {
                        name: 'צופה',
                        yes: ['קורא תיקים ומסמכים'],
                        no: 'לא: עריכה, ת״ז מלאה, מחיקה, יומן, ניהול אנשים',
                    },
                    {
                        name: 'מזכיר/ה',
                        yes: ['קורא/ת ועורך/ת', 'שולח/ת ללקוח', 'ת״ז מלאה, נרשם ביומן'],
                        maybe: ['מבקש/ת מחיקה'],
                        no: 'לא: יומן, ניהול אנשים',
                    },
                    {
                        name: 'עורך/ת דין',
                        yes: ['קורא/ת ועורך/ת', 'מוחק/ת לסל', 'יומן פעילות'],
                        no: 'לא: ניהול אנשים, חלון תמיכה',
                    },
                    {
                        name: 'מנהל/ת משרד',
                        yes: ['כל מה שעורך/ת דין', 'מזמין/ה ומסיר/ה אנשים'],
                        no: 'לא: פתיחת חלון תמיכה',
                    },
                    { name: 'בעלי המשרד', yes: ['הכול', 'פותחים למפתח חלון תמיכה'] },
                    {
                        name: 'אני, המפתח',
                        yes: ['מגדיר אנשים'],
                        maybe: ['תוכן רק בחלון תמיכה'],
                        no: 'לא: מחיקה, ולא פתיחת חלון לעצמי',
                        me: true,
                    },
                ],
                keys: { yes: 'מותר', no: 'לא זמין' },
                footnote: 'ההרשאות נבדקות בשרת בכל בקשה, לא רק מוסתרות במסך.',
            },
            note: (
                <>
                    <b>גם אני, שבניתי את המערכת, לא יכול למחוק בה כלום.</b> המשרד יכול להגביל את
                    הגישה שלי לתיקים ולמסמכים לחלון תמיכה של 4, 24 או 72 שעות, שרק בעלי המשרד פותחים
                    וסוגרים, וכל פעולה שלי מסומנת ביומן. כך עובדים ספקי מערכות משפטיות גדולות, וזה
                    הסטנדרט שבניתי לפיו.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.he[3],
            title: 'שלושה מנגנונים ששומרים על העבודה',
            intro: 'מה קורה מאחורי הקלעים ברגעים שבהם דברים בדרך כלל משתבשים.',
            items: [
                {
                    title: 'אף אחד לא דורס אף אחד',
                    text: 'שניים פתחו את אותו חוזה ב־Word.',
                    steps: [
                        { text: 'המסמך נלקח בהשאלה', note: 'כולם רואים מי עורך עכשיו' },
                        { text: 'עורכים ב־Word, כרגיל' },
                        { text: 'בשמירה, המערכת בודקת מול הגרסה שממנה התחלתם' },
                        {
                            text: 'נשמרת גרסה חדשה',
                            ok: true,
                            fork: [
                                'אין שינוי בינתיים: גרסה רגילה',
                                'מישהו שמר: גרסה נפרדת, שום דבר לא נמחק',
                            ],
                        },
                    ],
                },
                {
                    title: 'שום קובץ לא נפתח לפני סריקה',
                    text: 'לקוח שלח קובץ, ומישהו מעלה אותו לתיק.',
                    steps: [
                        { text: 'הקובץ עולה ונשמר כמו שהוא' },
                        { text: 'הסורק מתעורר על ההעלאה' },
                        { text: 'עד שהסריקה נגמרת, אי אפשר לפתוח אותו' },
                        {
                            text: 'נקי: זמין לכולם בתיק',
                            note: 'ובלילה, סריקה חוזרת כרשת ביטחון',
                            ok: true,
                        },
                    ],
                },
                {
                    title: 'הארכיון עבר, ואדם החליט במקרים הקשים',
                    text: 'שנים של תיקיות מהמחשב של המשרד.',
                    steps: [
                        { text: 'כלי הייבוא ממפה כל קובץ לתיק שלו', note: '56,607 קבצים, 33.8GB' },
                        { text: 'התוכנית ננעלת, ואדם מאשר אותה' },
                        { text: 'רק הקבצים שאושרו עולים, וכל אחד נספר' },
                        {
                            text: '651 קבצים לא הוכרעו',
                            note: 'הם מחכים להחלטה של אדם, ולא נזרקו לתיק אקראי',
                            ok: true,
                        },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.he[4],
            title: 'מה זה אומר בשבילכם',
            intro: 'אם אתם משרד קטן שעובד עם הרבה מסמכים, ככה זה יכול להיראות אצלכם.',
            card: {
                title: 'משרד קטן עם הרבה מסמכים?',
                text: 'אני בונה מערכת מאותו סוג גם למשרדים אחרים: עורכי דין, רואי חשבון ומשרדים מקצועיים דומים. היא נבנית לפי איך שאתם עובדים, לא לפי תבנית כללית.',
                bullets: [
                    'הנתונים שלכם בענן, מסודרים ומופרדים',
                    'הרשאות לפי התפקידים במשרד שלכם',
                    'מעבר מסודר של הארכיון הקיים',
                ],
            },
            road: {
                title: 'ככה אני בונה',
                steps: [
                    {
                        title: 'קודם מערכת שעובדת',
                        text: 'מבינים את התהליך ובונים בסיס יציב ואמין.',
                    },
                    {
                        title: 'מוודאים שהיא עונה על הצורך',
                        text: 'בפיילוט אמיתי, עם האנשים שעובדים בה.',
                    },
                    {
                        title: 'ואז AI, על בסיס שהוכיח את עצמו',
                        text: 'כאן Trinity Legal נמצאת עכשיו: מתחיל שילוב AI בעבודה השוטפת של המשרד.',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.he,
            tags: [
                'Next.js 16',
                'React 19',
                'TypeScript',
                'Fastify 5',
                'PostgreSQL 16 + RLS',
                '.NET 10 (Word, Excel)',
                'Cloud Run',
                'Cloud SQL',
                'Cloud Storage',
                'Pub/Sub',
                'Cloud Scheduler',
                'ClamAV',
                'GitHub Actions',
            ],
            note: 'הקוד פרטי. כל בקשת מיזוג עוברת סריקת סודות ובדיקת קוד עם AI.',
        },
        cta: 'רוצים משהו כזה אצלכם?',
    },
    en: {
        lede: (
            <>
                A case and document system I built to order for{' '}
                <b>a small law firm that specialises in real estate and land</b>. I worked out the
                requirements in sessions with the lawyers. It runs in the cloud today, in Hebrew, in
                a live pilot with active clients.
            </>
        ),
        facts: [
            {
                value: '56,607',
                label: "files from the firm's archive imported, each one accounted for",
            },
            {
                value: '651',
                label: 'files the system would not decide on alone, left for a person to decide',
            },
            { value: '6', label: 'roles, each with its own permissions, checked on every action' },
        ],
        problem: {
            tagline: TAG.en[0],
            title: 'What hurt, and what runs today',
            intro: 'Pains many small firms know, and what the system does about each one.',
            columns: ['Before', 'Today, in the system'],
            rows: [
                {
                    before: 'Documents spread across computers, folders and email',
                    lead: 'Every matter in one place:',
                    rest: 'the client, the parties, its documents and its email. Attachments drag straight in from Gmail or Outlook.',
                },
                {
                    before: 'Nobody is sure which version is the latest',
                    lead: 'Every save is a new version,',
                    rest: 'and a saved version is never written over. You can always go back.',
                },
                {
                    before: 'Two people edit one document and one overwrites the other',
                    lead: 'Editing on loan:',
                    rest: 'a save is checked against the version the edit started from. If someone saved in the meantime, a separate version is kept and nothing is lost.',
                },
                {
                    before: 'Years of archive in folders on one computer',
                    lead: '56,607 files imported',
                    rest: 'with a full record of each one. Whatever the system was unsure of waited for a person to approve.',
                },
                {
                    before: 'A suspicious file arrives by email',
                    lead: 'Every file is scanned for malware',
                    rest: 'before anyone can open it.',
                },
                {
                    before: 'Deadlines and missing documents kept in people’s heads',
                    lead: 'Deal dates and computed deadlines,',
                    rest: 'and a list of required documents for each kind of matter.',
                },
            ],
        },
        flow: {
            tagline: TAG.en[1],
            title: 'How it is built',
            intro: 'The path of every request, from the person to the data. Each box says what it does in plain words.',
            columns: [
                { label: 'Who works', people: ['Lawyers', 'Secretaries', 'Firm owner'] },
                {
                    label: 'Where they work',
                    nodes: [
                        {
                            title: 'App in the browser',
                            text: 'Hebrew, right to left, installable as a desktop app',
                            tech: 'Next.js · React',
                        },
                        {
                            title: 'The desktop add-on',
                            text: 'Opens and saves documents in Word and Excel',
                            tech: '.NET 10',
                        },
                        {
                            title: "The firm's email",
                            text: 'Sending to clients and filing incoming mail',
                            tech: 'Gmail',
                        },
                    ],
                },
                {
                    label: 'One gate',
                    nodes: [
                        {
                            title: 'The server',
                            text: 'Checks on every request who you are, which firm you belong to and what you may do. Every action is logged.',
                            tech: 'Fastify · TypeScript',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'Where the data lives',
                    nodes: [
                        {
                            title: 'The database',
                            text: 'Each firm sees only its own. The separation is enforced in the database itself, not only in code',
                            tech: 'PostgreSQL · RLS',
                        },
                        {
                            title: 'File storage',
                            text: 'Files are kept exactly as uploaded, each version on its own',
                            tech: 'Cloud Storage',
                        },
                        {
                            title: 'Malware scanner',
                            text: 'Wakes on every upload; a file is available only once scanned',
                            tech: 'ClamAV · Pub/Sub',
                        },
                    ],
                },
            ],
            jobs: {
                label: 'In the background, 6 scheduled jobs:',
                items: [
                    'database backup',
                    'checking files have not changed',
                    'a second scan',
                    'clearing stuck uploads and locks',
                ],
                tech: 'Cloud Scheduler',
            },
            legend: 'All of it runs on Google Cloud.',
            techLegend: TECH_LEGEND.en,
        },
        rules: {
            tagline: TAG.en[2],
            title: 'Who may do what',
            intro: 'In a law firm, permissions are part of the work, not an add-on. This is how they look in the system.',
            matrix: {
                corner: 'Action',
                columns: [
                    'Viewer',
                    'Secretary',
                    'Lawyer',
                    'Office manager',
                    'Firm owner',
                    'Me, the developer',
                ],
                me: 5,
                rows: [
                    {
                        label: 'Read matters and documents',
                        cells: [
                            'y',
                            'y',
                            'y',
                            'y',
                            'y',
                            { tag: 'In a support window', dashed: true },
                        ],
                    },
                    {
                        label: 'Edit, upload and send to a client',
                        cells: [
                            'x',
                            'y',
                            'y',
                            'y',
                            'y',
                            { tag: 'In a support window', dashed: true },
                        ],
                    },
                    {
                        label: 'See a full ID number',
                        note: 'Every view is logged',
                        cells: [
                            'x',
                            'y',
                            'y',
                            'y',
                            'y',
                            { tag: 'In a support window', dashed: true },
                        ],
                    },
                    {
                        label: 'Delete',
                        note: 'To the trash, and restorable',
                        cells: ['x', { tag: 'Requests' }, 'y', 'y', 'y', 'x'],
                    },
                    {
                        label: 'Activity log',
                        cells: ['x', 'x', 'y', 'y', 'y', { tag: 'Without client names' }],
                    },
                    { label: 'Invite and remove people', cells: ['x', 'x', 'x', 'y', 'y', 'y'] },
                    {
                        label: 'Open a support window for the developer',
                        cells: ['x', 'x', 'x', 'x', 'y', 'x'],
                    },
                ],
                cards: [
                    {
                        name: 'Viewer',
                        yes: ['Reads matters and documents'],
                        no: 'Not: editing, full ID, deleting, the log, managing people',
                    },
                    {
                        name: 'Secretary',
                        yes: ['Reads and edits', 'Sends to clients', 'Full ID, logged'],
                        maybe: ['Requests deletion'],
                        no: 'Not: the log, managing people',
                    },
                    {
                        name: 'Lawyer',
                        yes: ['Reads and edits', 'Deletes to the trash', 'Activity log'],
                        no: 'Not: managing people, support window',
                    },
                    {
                        name: 'Office manager',
                        yes: ['Everything a lawyer can', 'Invites and removes people'],
                        no: 'Not: opening a support window',
                    },
                    {
                        name: 'Firm owner',
                        yes: ['Everything', 'Opens a support window for the developer'],
                    },
                    {
                        name: 'Me, the developer',
                        yes: ['Sets up people'],
                        maybe: ['Content only in a support window'],
                        no: 'Not: deleting, or opening a window for myself',
                        me: true,
                    },
                ],
                keys: { yes: 'Allowed', no: 'Not available' },
                footnote:
                    'Permissions are checked on the server for every request, not just hidden on screen.',
            },
            note: (
                <>
                    <b>Even I, who built the system, cannot delete anything in it.</b> The firm can
                    limit my access to matters and documents to a support window of 4, 24 or 72
                    hours that only the owner opens and closes, and everything I do is marked in the
                    log. This is how large legal software vendors work, and it is the standard I
                    built to.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.en[3],
            title: 'Three mechanisms that protect the work',
            intro: 'What happens behind the scenes at the moments things usually go wrong.',
            items: [
                {
                    title: 'Nobody overwrites anybody',
                    text: 'Two people opened the same contract in Word.',
                    steps: [
                        {
                            text: 'The document is taken on loan',
                            note: 'Everyone sees who is editing',
                        },
                        { text: 'They edit in Word, as usual' },
                        { text: 'On save, the system checks the version they started from' },
                        {
                            text: 'A new version is kept',
                            ok: true,
                            fork: [
                                'No change meanwhile: a normal version',
                                'Someone saved: a separate version, nothing deleted',
                            ],
                        },
                    ],
                },
                {
                    title: 'No file opens before a scan',
                    text: 'A client sent a file, and someone uploads it to the matter.',
                    steps: [
                        { text: 'The file is uploaded and kept as it is' },
                        { text: 'The scanner wakes on the upload' },
                        { text: 'Until the scan ends, nobody can open it' },
                        {
                            text: 'Clean: available to everyone on the matter',
                            note: 'And at night, a second scan as a safety net',
                            ok: true,
                        },
                    ],
                },
                {
                    title: 'The archive moved, and a person decided the hard cases',
                    text: "Years of folders from the firm's computer.",
                    steps: [
                        {
                            text: 'The import tool maps each file to its matter',
                            note: '56,607 files, 33.8 GB',
                        },
                        { text: 'The plan is sealed, and a person approves it' },
                        { text: 'Only approved files upload, and each one is counted' },
                        {
                            text: '651 files were not decided',
                            note: 'They wait for a person, rather than landing in a random matter',
                            ok: true,
                        },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.en[4],
            title: 'What this means for you',
            intro: 'If you are a small office that works with a lot of documents, this is what it could look like for you.',
            card: {
                title: 'A small office with a lot of documents?',
                text: 'I build systems like this for other offices too: law firms, accountants and similar professional offices. It is built around how you work, not around a generic template.',
                bullets: [
                    'Your data in the cloud, organised and kept apart',
                    "Permissions that follow your office's roles",
                    'An orderly move of your existing archive',
                ],
            },
            road: {
                title: 'How I build',
                steps: [
                    {
                        title: 'First, a system that works',
                        text: 'Understand the process and build a stable, reliable base.',
                    },
                    {
                        title: 'Make sure it meets the need',
                        text: 'In a real pilot, with the people who use it.',
                    },
                    {
                        title: 'Then AI, on a base that has proved itself',
                        text: 'This is where Trinity Legal is now: bringing AI into the firm’s daily work is starting.',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.en,
            tags: [
                'Next.js 16',
                'React 19',
                'TypeScript',
                'Fastify 5',
                'PostgreSQL 16 + RLS',
                '.NET 10 (Word, Excel)',
                'Cloud Run',
                'Cloud SQL',
                'Cloud Storage',
                'Pub/Sub',
                'Cloud Scheduler',
                'ClamAV',
                'GitHub Actions',
            ],
            note: 'The code is private. Every pull request gets a secret scan and an AI code review.',
        },
        cta: 'Want something like this?',
    },
};

const trinityAgent: Localized<ProjectPage> = {
    he: {
        lede: (
            <>
                העוזר האישי שלי, שרץ כל היום על המחשב שלי. אני כותב לו{' '}
                <b>בצ׳אט פרטי בוואטסאפ או בטלגרם</b>, כמו לבן אדם. הוא לומד איך אני עובד, מכין את
                העבודה לפני שאני מבקש, ובודק איתי רק במקומות שבאמת חשובים. יש לו אתר משלו,{' '}
                {ext(LINKS.trinity, 'personakit.me/trinity')}, והוא נמצא שם בפיילוט פרטי בהזמנה.
            </>
        ),
        facts: [
            { value: '3', label: 'רמות פעולה: עושה לבד, שואל קודם, או פשוט לא זמין לו' },
            { value: '2', label: 'שכבות זיכרון: היומן שלו, והזיכרון המשותף לכל הסוכנים שלי' },
            { value: '1', label: 'commit בלילה, שבו אדם יכול לבדוק כל מה שהזיכרון למד' },
        ],
        problem: {
            tagline: TAG.he[0],
            title: 'מה מפריע בעוזרי AI, ומה עשיתי עם זה',
            intro: 'הבעיות שגרמו לי לבנות אותו, ומה הוא עושה עם כל אחת.',
            columns: ['מה מפריע', 'ב־Trinity Agent'],
            rows: [
                {
                    before: 'כל שיחה מתחילה מאפס, והעוזר לא זוכר כלום',
                    lead: 'זיכרון בשתי שכבות',
                    rest: 'שמתעדכן לבד כל יום, ואפשר לקרוא ולתקן אותו.',
                },
                {
                    before: 'עוזר ששולח או משנה דברים בלי לשאול',
                    lead: 'כל מה ששולח, משנה או מוחק מחכה לאישור שלי.',
                    rest: 'מחיקה לצמיתות פשוט לא זמינה לו.',
                },
                {
                    before: 'לא ברור מה הסוכן עשה כשלא הסתכלתי',
                    lead: 'יומן משימות',
                    rest: 'עם סיכום קצר ומצונזר של כל עבודה שהושלמה.',
                },
                {
                    before: 'סוכן ש״משפר את עצמו״ בלי שאף אחד יודע',
                    lead: 'הוא רק מציע שיפורים, עם ראיות.',
                    rest: 'אף skill, hook או זיכרון לא נכנס בלי אישור של אדם.',
                },
                {
                    before: 'לא ברור איזו גרסה בדיוק רצה עכשיו',
                    lead: 'מה שרץ תמיד שווה ל־commit מתויג,',
                    rest: 'ושינויים נכנסים רק דרך בקשת מיזוג שנבדקה.',
                },
                {
                    before: 'עוד אפליקציה שצריך לפתוח',
                    lead: 'צ׳אט פרטי בוואטסאפ או בטלגרם,',
                    rest: 'איפה שאני כבר נמצא.',
                },
            ],
        },
        flow: {
            tagline: TAG.he[1],
            title: 'איך זה בנוי',
            intro: 'מהבקשה שלי בצ׳אט ועד הפעולה בחשבונות. בכל תיבה: מה היא עושה במילים פשוטות.',
            columns: [
                { label: 'מי מבקש', people: ['אני'] },
                {
                    label: 'איפה מדברים',
                    nodes: [
                        {
                            title: 'צ׳אט פרטי',
                            text: 'כותבים לו כמו לבן אדם, והוא עונה באותו צ׳אט',
                            tech: 'WhatsApp · Telegram',
                        },
                    ],
                },
                {
                    label: 'הסוכן',
                    nodes: [
                        {
                            title: 'Trinity Agent',
                            text: 'רץ כל הזמן על המחשב שלי. קורא, מחפש, מסכם ומכין טיוטות לבד',
                            tech: 'Hermes Agent · Python',
                        },
                        {
                            title: 'שואל קודם',
                            text: 'כל מה ששולח, משנה או מוחק נעצר כאן ומחכה ללחיצה שלי',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'איפה זה קורה',
                    nodes: [
                        {
                            title: 'המייל והיומן',
                            text: 'רק אם חיברתי חשבון. טקסט בתוך מייל הוא מידע, לא הוראה',
                            tech: 'Google Mail · Calendar',
                        },
                        { title: 'הקבצים שלי', text: 'מתייק, מכין סיכומים ותדריכים' },
                    ],
                },
            ],
            lane: {
                label: 'הזיכרון',
                nodes: [
                    {
                        title: 'היומן של הסוכן',
                        text: 'סיכומי עבודה, שיפורים שהוא מציע, מדידות וביצועים. מתעדכן לבד כל יום',
                        tech: 'Obsidian · git',
                    },
                    {
                        title: 'PersonaKit',
                        text: 'הזיכרון המשותף לכל הסוכנים שלי ולכלי הפיתוח, כך שכולם עובדים מאותה תמונה מאושרת',
                        tech: 'PersonaKit · MCP',
                    },
                ],
            },
            legend: 'רץ על המחשב שלי, לא בשרת של מישהו אחר.',
            techLegend: TECH_LEGEND.he,
        },
        rules: {
            tagline: TAG.he[2],
            title: 'מה הוא עושה לבד, ומה מחכה לי',
            intro: 'היכולת רחבה, וברירת המחדל זהירה. הגבולות מוגדרים לכל אדם בנפרד.',
            levels: [
                {
                    tone: 'self',
                    title: 'עושה לבד',
                    pill: 'בלי אישור',
                    text: 'קריאה והכנה, שום דבר לא יוצא מהידיים שלי.',
                    items: [
                        { text: 'מה עוד פתוח מול ספק?', note: 'קורא את המיילים ומסכם' },
                        { text: 'להכין אותי לפגישה של מחר', note: 'תדריך של עמוד אחד' },
                        { text: 'לשים לב שיש התנגשות ביומן' },
                        { text: 'לנסח תשובה בסגנון שלי' },
                    ],
                },
                {
                    tone: 'ask',
                    title: 'שואל קודם',
                    pill: 'מחכה ללחיצה',
                    text: 'כל מה ששולח, משנה או מוחק משהו.',
                    items: [
                        { text: 'לשלוח את התשובה שניסח' },
                        { text: 'להזיז או לבטל אירוע ביומן' },
                        { text: 'לקבוע שיחה בשבוע הבא' },
                        { text: 'להעביר מייל לארכיון' },
                    ],
                },
                {
                    tone: 'no',
                    title: 'לא זמין לו',
                    pill: 'חסום',
                    text: 'דברים שגם אישור לא פותח.',
                    items: [
                        { text: 'למחוק מייל לצמיתות' },
                        { text: 'לקדם לבד skill, hook או זיכרון', note: 'הוא מציע, אדם מאשר' },
                        { text: 'לגשת לחשבון של אדם אחר', note: 'כל אחד מחבר את החשבונות שלו' },
                    ],
                },
            ],
        },
        mechanisms: {
            tagline: TAG.he[3],
            title: 'שלושה מנגנונים ששומרים עליו אמין',
            intro: 'מה קורה בלי שאני רואה, ולמה אפשר לסמוך על זה.',
            items: [
                {
                    title: 'זיכרון שמוכיח את עצמו',
                    text: 'כל יום הוא לומד, ואני יכול לבדוק מה.',
                    steps: [
                        {
                            text: 'כל סשן שהסתיים נרשם',
                            note: 'בכ־10 אלפיות שנייה, בלי קריאה למודל',
                        },
                        { text: 'בלילה, ריצה אחת קוראת את הראיות של היום' },
                        {
                            text: 'היא חייבת להצהיר אילו מקורות כיסתה ואילו דפים שינתה',
                            note: 'והקוד בודק את ההצהרה',
                        },
                        { text: 'commit אחד שאדם יכול לבדוק', ok: true },
                    ],
                },
                {
                    title: 'שיפורים רק עם ראיות',
                    text: 'הוא שם לב למה שחוזר, אבל לא משנה את עצמו.',
                    steps: [
                        { text: 'יומן המשימות שומר סיכום של כל עבודה' },
                        {
                            text: 'דפוס נספר רק כשהוא חוזר',
                            note: 'בשני ימים שונים, או שלוש פעמים ביום אחד',
                        },
                        { text: 'הוא הופך להצעה, עם הראיות' },
                        { text: 'אדם מאשר, או שזה לא נכנס', ok: true },
                    ],
                },
                {
                    title: 'שום דבר לא יוצא בלי לחיצה',
                    text: 'ביקשתי ממנו לענות לספק.',
                    steps: [
                        { text: 'קורא את השרשור ואת הזיכרון שלי' },
                        { text: 'מנסח תשובה קצרה, כמו שאני כותב' },
                        { text: 'שולח לי אותה בצ׳אט, עם כפתור' },
                        { text: 'נשלח רק אחרי שלחצתי', ok: true, fork: ['שלח', 'לא עכשיו'] },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.he[4],
            title: 'מה זה אומר בשבילכם',
            intro: 'Trinity Agent עצמו עדיין לא מוצע ללקוחות. מה שלמדתי בבנייה שלו כן.',
            card: {
                title: 'רוצים סוכן שעובד בשבילכם, עם גבולות?',
                text: 'אני בונה סוכנים לעסקים: בוואטסאפ, במייל או במערכת שכבר יש לכם. מאותם עקרונות:',
                bullets: [
                    'מה מותר לו לבד ומה מחכה לאישור, מוגדר מראש',
                    'יומן של כל מה שהוא עשה',
                    'זיכרון שאפשר לקרוא ולתקן',
                ],
                extra: <>הזיכרון שלו, PersonaKit, הוא קוד פתוח וחינמי: {PK_LINKS}</>,
            },
            road: {
                title: 'ככה אני בונה',
                steps: [
                    { title: 'קודם מבינים מה הסוכן צריך לעשות', text: 'ואיפה הוא חוסך זמן באמת.' },
                    { title: 'מגדירים גבולות', text: 'מה לבד, מה באישור, ומה חסום לגמרי.' },
                    {
                        title: 'בונים בשלבים קצרים, עם יומן ובדיקות',
                        text: 'כדי שתמיד יהיה ברור מה הוא עשה.',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.he,
            tags: [
                'Hermes Agent (Nous Research), הפצה פרטית',
                'Python',
                'shell',
                'Obsidian vault + git',
                'PersonaKit (MCP)',
                'WhatsApp',
                'Telegram',
            ],
            note: <>המאגרים פרטיים. האתר: {ext(LINKS.trinity, 'personakit.me/trinity')}</>,
        },
        cta: 'רוצים סוכן כזה אצלכם?',
    },
    en: {
        lede: (
            <>
                My personal assistant, running all day on my computer. I write to it{' '}
                <b>in a private WhatsApp or Telegram chat</b>, as I would to a person. It learns how
                I work, does the groundwork before I ask, and checks with me only where it counts.
                It has its own site, {ext(LINKS.trinity, 'personakit.me/trinity')}, where it is in a
                private pilot by invitation.
            </>
        ),
        facts: [
            { value: '3', label: 'levels of action: does it alone, asks first, or simply cannot' },
            {
                value: '2',
                label: 'layers of memory: its own record, and the memory all my agents share',
            },
            {
                value: '1',
                label: 'commit a night, where a person can check everything the memory learned',
            },
        ],
        problem: {
            tagline: TAG.en[0],
            title: 'What gets in the way with AI assistants, and what I did about it',
            intro: 'The problems that made me build it, and what it does about each.',
            columns: ['What gets in the way', 'In Trinity Agent'],
            rows: [
                {
                    before: 'Every chat starts from zero and the assistant remembers nothing',
                    lead: 'Two layers of memory',
                    rest: 'that update themselves daily, and that you can read and correct.',
                },
                {
                    before: 'An assistant that sends or changes things without asking',
                    lead: 'Anything that sends, changes or removes waits for my OK.',
                    rest: 'Deleting for good is simply not available to it.',
                },
                {
                    before: 'No idea what the agent did while I was not looking',
                    lead: 'A task log',
                    rest: 'with a short, redacted summary of every finished job.',
                },
                {
                    before: 'An agent that "improves itself" without anyone knowing',
                    lead: 'It only proposes improvements, with evidence.',
                    rest: 'No skill, hook or memory goes in without a person approving.',
                },
                {
                    before: 'Unclear which version is running right now',
                    lead: 'What runs always equals a tagged commit,',
                    rest: 'and changes come in only through a reviewed pull request.',
                },
                {
                    before: 'Yet another app to open',
                    lead: 'A private chat on WhatsApp or Telegram,',
                    rest: 'where I already am.',
                },
            ],
        },
        flow: {
            tagline: TAG.en[1],
            title: 'How it is built',
            intro: 'From my request in the chat to the action in my accounts. Each box says what it does in plain words.',
            columns: [
                { label: 'Who asks', people: ['Me'] },
                {
                    label: 'Where we talk',
                    nodes: [
                        {
                            title: 'Private chat',
                            text: 'Write to it like a person; it answers in the same chat',
                            tech: 'WhatsApp · Telegram',
                        },
                    ],
                },
                {
                    label: 'The agent',
                    nodes: [
                        {
                            title: 'Trinity Agent',
                            text: 'Always running on my computer. Reads, searches, summarises and drafts on its own',
                            tech: 'Hermes Agent · Python',
                        },
                        {
                            title: 'Asks first',
                            text: 'Anything that sends, changes or removes stops here and waits for my tap',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'Where it acts',
                    nodes: [
                        {
                            title: 'Mail and calendar',
                            text: 'Only if I connected an account. Text inside an email is information, not instructions',
                            tech: 'Google Mail · Calendar',
                        },
                        { title: 'My files', text: 'Files things, prepares summaries and briefs' },
                    ],
                },
            ],
            lane: {
                label: 'Memory',
                nodes: [
                    {
                        title: "The agent's own record",
                        text: 'Work summaries, improvements it proposes, measurements and performance. Updates itself daily',
                        tech: 'Obsidian · git',
                    },
                    {
                        title: 'PersonaKit',
                        text: 'The memory shared by all my agents and my developer tools, so they all work from the same approved picture',
                        tech: 'PersonaKit · MCP',
                    },
                ],
            },
            legend: "Runs on my computer, not on someone else's server.",
            techLegend: TECH_LEGEND.en,
        },
        rules: {
            tagline: TAG.en[2],
            title: 'What it does alone, and what waits for me',
            intro: 'Capable by design, careful by default. The lines are set per person.',
            levels: [
                {
                    tone: 'self',
                    title: 'On its own',
                    pill: 'No approval',
                    text: 'Reading and preparing. Nothing leaves my hands.',
                    items: [
                        {
                            text: 'What is still open with a supplier?',
                            note: 'Reads the emails and sums up',
                        },
                        { text: "Get me ready for tomorrow's meeting", note: 'A one-page brief' },
                        { text: 'Spot a clash in the calendar' },
                        { text: 'Draft a reply in my style' },
                    ],
                },
                {
                    tone: 'ask',
                    title: 'Asks first',
                    pill: 'Waits for a tap',
                    text: 'Anything that sends, changes or removes something.',
                    items: [
                        { text: 'Send the reply it drafted' },
                        { text: 'Move or cancel a calendar event' },
                        { text: 'Book a call next week' },
                        { text: 'Archive an email' },
                    ],
                },
                {
                    tone: 'no',
                    title: 'Not available',
                    pill: 'Blocked',
                    text: 'Things no approval unlocks.',
                    items: [
                        { text: 'Delete an email for good' },
                        {
                            text: 'Promote a skill, hook or memory by itself',
                            note: 'It proposes; a person approves',
                        },
                        {
                            text: "Reach another person's account",
                            note: 'Each person connects their own',
                        },
                    ],
                },
            ],
        },
        mechanisms: {
            tagline: TAG.en[3],
            title: 'Three mechanisms that keep it trustworthy',
            intro: 'What happens while I am not looking, and why it can be trusted.',
            items: [
                {
                    title: 'Memory that proves itself',
                    text: 'It learns every day, and I can check what.',
                    steps: [
                        {
                            text: 'Every finished session is recorded',
                            note: 'In about 10 ms, with no model call',
                        },
                        { text: "At night, one run reads the day's evidence" },
                        {
                            text: 'It must declare which sources it covered and which pages it changed',
                            note: 'And code checks the declaration',
                        },
                        { text: 'One commit a person can review', ok: true },
                    ],
                },
                {
                    title: 'Improvements only with evidence',
                    text: 'It notices what repeats, but does not change itself.',
                    steps: [
                        { text: 'The task log keeps a summary of every job' },
                        {
                            text: 'A pattern counts only when it repeats',
                            note: 'On two different days, or three times in one day',
                        },
                        { text: 'It becomes a proposal, with the evidence' },
                        { text: 'A person approves, or it does not go in', ok: true },
                    ],
                },
                {
                    title: 'Nothing goes out without a tap',
                    text: 'I asked it to answer a supplier.',
                    steps: [
                        { text: 'Reads the thread and my memory' },
                        { text: 'Drafts a short reply, the way I write' },
                        { text: 'Sends it to me in the chat, with a button' },
                        { text: 'Sent only after I tap', ok: true, fork: ['Send', 'Not now'] },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.en[4],
            title: 'What this means for you',
            intro: 'Trinity Agent itself is not offered to clients yet. What I learned building it is.',
            card: {
                title: 'Want an agent that works for you, with limits?',
                text: 'I build agents for businesses: on WhatsApp, in email or inside a system you already have. On the same principles:',
                bullets: [
                    'What it may do alone and what waits for approval, set in advance',
                    'A log of everything it did',
                    'Memory you can read and correct',
                ],
                extra: <>Its memory, PersonaKit, is open source and free: {PK_LINKS}</>,
            },
            road: {
                title: 'How I build',
                steps: [
                    {
                        title: 'First, understand what the agent should do',
                        text: 'And where it really saves time.',
                    },
                    {
                        title: 'Set the limits',
                        text: 'What it does alone, what needs approval, what is blocked.',
                    },
                    {
                        title: 'Build in short steps, with a log and tests',
                        text: 'So it is always clear what it did.',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.en,
            tags: [
                'Hermes Agent (Nous Research), private build',
                'Python',
                'shell',
                'Obsidian vault + git',
                'PersonaKit (MCP)',
                'WhatsApp',
                'Telegram',
            ],
            note: (
                <>
                    The repositories are private. Its site:{' '}
                    {ext(LINKS.trinity, 'personakit.me/trinity')}
                </>
            ),
        },
        cta: 'Want an agent like this?',
    },
};

const personaKit: Localized<ProjectPage> = {
    he: {
        lede: (
            <>
                זיכרון לעוזרי AI <b>שאפשר לקרוא, לתקן ולקחת איתכם</b>. הוא קורא את השיחות שכבר יש
                לכם עם עוזרי הקוד, מציע זיכרונות קצרים, ושומר לכל אחד את הציטוט המדויק שממנו הגיע.
                אין שרת ואין חשבון: הכול נשאר במחשב שלכם. יצרתי אותו ואני המפתח הראשי שלו.{' '}
                {PK_LINKS}
            </>
        ),
        facts: [
            { value: '0', label: 'שרתים וחשבונות. קובץ אחד, במחשב שלכם' },
            { value: '4', label: 'מצבים לכל זיכרון, ורק אתם מעבירים ביניהם' },
            { value: '2', label: 'כלים לעוזרים: לקרוא ולהציע. לא להחליט' },
        ],
        problem: {
            tagline: TAG.he[0],
            title: 'מה לא בסדר בזיכרון של עוזרי AI',
            intro: 'מה שגרם לי לבנות אותו, ומה הוא עושה עם כל בעיה.',
            columns: ['הבעיה', 'ב־PersonaKit'],
            rows: [
                {
                    before: 'העוזר ״זוכר״ עליכם משהו, ואין דרך לדעת למה',
                    lead: 'לכל זיכרון יש קבלה:',
                    rest: 'הציטוט המדויק, במילים שלכם, שממנו הוא הגיע.',
                },
                {
                    before: 'העוזר כותב לעצמו זיכרונות בלי שתדעו',
                    lead: 'עוזרים יכולים רק לקרוא ולהציע.',
                    rest: 'לאשר, להגביל, להסתיר או לשכוח יכולים רק אתם.',
                },
                {
                    before: 'הזיכרון נעול אצל ספק אחד',
                    lead: 'קובץ SQLite אחד אצלכם,',
                    rest: 'שמוגש לכל עוזר שמדבר MCP.',
                },
                {
                    before: 'השיחות שלכם נשלחות לשרת של מישהו',
                    lead: 'אין שרת של PersonaKit.',
                    rest: 'רק מה שאתם כתבתם נשלח, למודל שאתם כבר משתמשים בו, והכלים שלו כבויים.',
                },
                {
                    before: 'זיכרונות כפולים ומיושנים מצטברים',
                    lead: 'סידור הפיך:',
                    rest: 'קודם מוצגת תוכנית, שום דבר לא משתנה בלי אישור, ואפשר לבטל כל צעד.',
                },
            ],
        },
        flow: {
            tagline: TAG.he[1],
            title: 'איך זה בנוי',
            intro: 'מהשיחה שכבר הייתה ועד העוזר שקורא את הזיכרון. כל שלב עושה דבר אחד, ומדבר עם הבא רק דרך המאגר.',
            columns: [
                { label: 'מאיפה', people: ['Claude Code', 'Codex'] },
                {
                    label: 'קריאה וחילוץ',
                    nodes: [
                        {
                            title: 'קליטה',
                            text: 'קורא את קבצי השיחה ושומר רק את מה שאתם כתבתם',
                            tech: 'ingest',
                        },
                        {
                            title: 'חילוץ',
                            text: 'המודל שלכם מציע זיכרונות קצרים, עם ציטוט. בלי ציטוט, לא נשמר',
                            tech: 'Claude / Codex CLI',
                        },
                    ],
                },
                {
                    label: 'אצלכם',
                    nodes: [
                        {
                            title: 'המאגר והסקירה שלכם',
                            text: 'קובץ אחד במחשב. כאן אתם מאשרים, מגבילים, מסתירים או שוכחים',
                            tech: 'SQLite · review',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'מי קורא',
                    nodes: [
                        {
                            title: 'שרת MCP',
                            text: 'שני כלים צרים: קריאה והצעה. מגיש רק זיכרונות רלוונטיים',
                            tech: 'MCP',
                        },
                        { title: 'העוזרים שלכם', text: 'Claude Code, Codex, Trinity Agent ועוד' },
                    ],
                },
            ],
            legend: 'רץ כולו במחשב שלכם. Python, בלי תלויות חובה.',
            techLegend: TECH_LEGEND.he,
        },
        rules: {
            tagline: TAG.he[2],
            title: 'מי מחליט על הזיכרון',
            intro: 'העוזר משתמש בזיכרון שלכם, אבל לא הבעלים שלו.',
            matrix: {
                corner: 'פעולה',
                columns: ['אתם', 'העוזר'],
                me: 0,
                rows: [
                    { label: 'לקרוא זיכרונות שרלוונטיים לשאלה', cells: ['y', 'y'] },
                    { label: 'להציע זיכרון חדש', cells: ['y', 'y'] },
                    {
                        label: 'לראות את הציטוט שממנו זיכרון הגיע',
                        cells: ['y', { tag: 'רק כשהוא מבקש' }],
                    },
                    { label: 'לאשר, להגביל, להסתיר או לשכוח', cells: ['y', 'x'] },
                    {
                        label: 'לסדר כפולים ומיושנים',
                        note: 'תוכנית קודם, ואפשר לבטל',
                        cells: ['y', 'x'],
                    },
                ],
                keys: { yes: 'מותר', no: 'לא זמין' },
            },
            levelsTitle: 'ארבעת המצבים של זיכרון',
            levels: [
                {
                    tone: 'ask',
                    title: 'לא מאושר',
                    pill: 'ברירת מחדל',
                    text: 'מוגש לעוזר עם תווית ״לא מאושר״, כדי שידע להתייחס בזהירות.',
                },
                {
                    tone: 'self',
                    title: 'מאושר',
                    pill: 'מוגש',
                    text: 'אישרתם. מוגש כשהוא רלוונטי לשאלה, וחילוץ חוזר לא נוגע בהחלטה שלכם.',
                },
                {
                    tone: 'no',
                    title: 'מוגבל',
                    pill: 'אף פעם',
                    text: 'נשאר אצלכם ולא מוגש לאף עוזר. למשל פרט פרטי.',
                },
                {
                    tone: 'no',
                    title: 'בארכיון',
                    pill: 'אף פעם',
                    text: 'לא מוגש. שום דבר לא נמחק לצמיתות בלי ״שכח״ מפורש שלכם.',
                },
            ],
        },
        mechanisms: {
            tagline: TAG.he[3],
            title: 'שלושה מנגנונים שאפשר לבדוק',
            intro: 'הקוד קטן מספיק כדי לקרוא אותו, וזה בכוונה.',
            items: [
                {
                    title: 'זיכרון עם קבלה',
                    text: 'איך שיחה הופכת לזיכרון.',
                    steps: [
                        { text: 'נקראת שיחה שכבר הייתה' },
                        { text: 'נשארות רק התורות שאתם כתבתם' },
                        { text: 'המודל מציע זיכרון קצר', note: 'עם הכלים שלו כבויים' },
                        {
                            text: 'נשמר רק עם הציטוט שממנו הגיע',
                            note: 'זיכרון בלי ראיה לא נשמר',
                            ok: true,
                        },
                    ],
                },
                {
                    title: 'סידור שאפשר לבטל',
                    text: 'עם הזמן מצטברים כפולים ודברים שכבר לא נכונים.',
                    steps: [
                        { text: 'מאתרים זיכרונות כמעט זהים, ומה שלא חזר 90 יום' },
                        { text: 'מוצגת תוכנית, ושום דבר לא משתנה' },
                        { text: 'מוחלת רק כשאתם מבקשים' },
                        { text: 'כל צעד ניתן לביטול מדויק', ok: true },
                    ],
                },
                {
                    title: 'העוזר מקבל רק מה שצריך',
                    text: 'עוזר שואל את הזיכרון שאלה.',
                    steps: [
                        { text: 'מוגבלים ובארכיון לא מוגשים לעולם' },
                        { text: 'רק זיכרונות רלוונטיים לשאלה', note: 'ואם אין, לא מוגש כלום' },
                        { text: 'כתובות מייל בציטוטים מוסתרות' },
                        { text: 'העוזר עונה מתמונה שאתם שולטים בה', ok: true },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.he[4],
            title: 'מה זה אומר בשבילכם',
            intro: 'PersonaKit פתוח וחינמי, ואפשר להוריד ולהשתמש בו כבר היום.',
            card: {
                title: 'סוכן שזוכר, בלי לאבד שליטה',
                text: 'כשאני בונה סוכן לעסק, הזיכרון שלו בנוי על אותם עקרונות:',
                bullets: [
                    'אפשר לראות מאיפה כל פרט הגיע',
                    'מה שרגיש לא יוצא החוצה',
                    'אתם מחליטים מה נשאר ומה נשכח',
                ],
                extra: <>להורדה ולתיעוד: {PK_LINKS}</>,
            },
            road: {
                title: 'לאן זה הולך',
                steps: [
                    {
                        title: 'היום: זיכרון',
                        text: 'משיחות Claude Code ו־Codex, עם קבלות ושליטה שלכם.',
                    },
                    {
                        title: 'במפת הדרכים: עוד מקורות',
                        text: 'ייבוא מ־ChatGPT, מ־claude.ai ומ־Gemini.',
                    },
                    { title: 'הכלי הראשון בסט', text: 'מערכות נוספות יצטרפו לצידו עם הזמן.' },
                ],
            },
        },
        dev: {
            summary: DEV.he,
            tags: [
                'Python 3.10+',
                'ללא תלויות חובה',
                'SQLite',
                'MCP server',
                'CLI',
                'Apache-2.0',
                'GitHub Actions, כיסוי 90%',
            ],
            note: (
                <>
                    הקוד פתוח: {ext('https://github.com/Yanir-R/personaKit', 'GitHub')} ·{' '}
                    {ext(LINKS.personakitDocs, 'התיעוד')}
                </>
            ),
        },
        cta: 'רוצים סוכן עם זיכרון כזה?',
    },
    en: {
        lede: (
            <>
                Memory for AI assistants <b>that you can read, correct and take with you</b>. It
                reads the conversations you already have with your coding assistants, proposes short
                memories, and keeps the exact quote each one came from. No server and no account:
                everything stays on your machine. I created it and I am its lead developer.{' '}
                {PK_LINKS}
            </>
        ),
        facts: [
            { value: '0', label: 'servers and accounts. One file, on your machine' },
            { value: '4', label: 'states for every memory, and only you move it between them' },
            { value: '2', label: 'tools for assistants: read and propose. Not decide' },
        ],
        problem: {
            tagline: TAG.en[0],
            title: "What is wrong with AI assistants' memory",
            intro: 'What made me build it, and what it does about each problem.',
            columns: ['The problem', 'In PersonaKit'],
            rows: [
                {
                    before: 'The assistant "remembers" something about you, and you cannot tell why',
                    lead: 'Every memory has a receipt:',
                    rest: 'the exact quote, in your own words, it came from.',
                },
                {
                    before: 'The assistant writes memories for itself without telling you',
                    lead: 'Assistants can only read and propose.',
                    rest: 'Only you can approve, restrict, hide or forget.',
                },
                {
                    before: 'Memory locked in with one vendor',
                    lead: 'One SQLite file on your machine,',
                    rest: 'served to any assistant that speaks MCP.',
                },
                {
                    before: "Your conversations go to someone's server",
                    lead: 'There is no PersonaKit server.',
                    rest: 'Only what you wrote is sent, to a model you already use, with its tools off.',
                },
                {
                    before: 'Duplicate and stale memories pile up',
                    lead: 'Reversible tidying:',
                    rest: 'a plan comes first, nothing changes without your OK, and every step can be undone.',
                },
            ],
        },
        flow: {
            tagline: TAG.en[1],
            title: 'How it is built',
            intro: 'From a conversation you already had to the assistant that reads the memory. Each stage does one job and talks to the next only through the store.',
            columns: [
                { label: 'From', people: ['Claude Code', 'Codex'] },
                {
                    label: 'Read and extract',
                    nodes: [
                        {
                            title: 'Ingest',
                            text: 'Reads session files and keeps only what you wrote',
                            tech: 'ingest',
                        },
                        {
                            title: 'Extract',
                            text: 'Your model proposes short memories, with a quote. No quote, not stored',
                            tech: 'Claude / Codex CLI',
                        },
                    ],
                },
                {
                    label: 'With you',
                    nodes: [
                        {
                            title: 'The store and your review',
                            text: 'One file on your machine. Here you approve, restrict, hide or forget',
                            tech: 'SQLite · review',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'Who reads',
                    nodes: [
                        {
                            title: 'MCP server',
                            text: 'Two narrow tools: read and propose. Serves only relevant memories',
                            tech: 'MCP',
                        },
                        {
                            title: 'Your assistants',
                            text: 'Claude Code, Codex, Trinity Agent and more',
                        },
                    ],
                },
            ],
            legend: 'Runs entirely on your machine. Python, no required dependencies.',
            techLegend: TECH_LEGEND.en,
        },
        rules: {
            tagline: TAG.en[2],
            title: 'Who decides about memory',
            intro: 'The assistant uses your memory. It does not own it.',
            matrix: {
                corner: 'Action',
                columns: ['You', 'The assistant'],
                me: 0,
                rows: [
                    { label: 'Read memories relevant to a question', cells: ['y', 'y'] },
                    { label: 'Propose a new memory', cells: ['y', 'y'] },
                    {
                        label: 'See the quote a memory came from',
                        cells: ['y', { tag: 'Only on request' }],
                    },
                    { label: 'Approve, restrict, hide or forget', cells: ['y', 'x'] },
                    {
                        label: 'Tidy duplicates and stale memories',
                        note: 'A plan first, and undoable',
                        cells: ['y', 'x'],
                    },
                ],
                keys: { yes: 'Allowed', no: 'Not available' },
            },
            levelsTitle: 'The four states of a memory',
            levels: [
                {
                    tone: 'ask',
                    title: 'Unconfirmed',
                    pill: 'Default',
                    text: 'Served with an "unconfirmed" label, so the assistant treats it with care.',
                },
                {
                    tone: 'self',
                    title: 'Approved',
                    pill: 'Served',
                    text: 'You approved it. Served when relevant, and re-extraction never touches your decision.',
                },
                {
                    tone: 'no',
                    title: 'Restricted',
                    pill: 'Never',
                    text: 'Stays with you and is never served to any assistant. A private detail, say.',
                },
                {
                    tone: 'no',
                    title: 'Archived',
                    pill: 'Never',
                    text: 'Not served. Nothing is deleted for good without your explicit "forget".',
                },
            ],
        },
        mechanisms: {
            tagline: TAG.en[3],
            title: 'Three mechanisms you can check',
            intro: 'The code is small enough to read, on purpose.',
            items: [
                {
                    title: 'Memory with a receipt',
                    text: 'How a conversation becomes a memory.',
                    steps: [
                        { text: 'A past conversation is read' },
                        { text: 'Only the turns you wrote are kept' },
                        {
                            text: 'The model proposes a short memory',
                            note: 'With its tools turned off',
                        },
                        {
                            text: 'Stored only with the quote it came from',
                            note: 'A memory with no evidence is not stored',
                            ok: true,
                        },
                    ],
                },
                {
                    title: 'Tidying you can undo',
                    text: 'Over time, duplicates and things no longer true pile up.',
                    steps: [
                        { text: 'Find near-identical memories, and ones not seen for 90 days' },
                        { text: 'Show a plan, and change nothing' },
                        { text: 'Apply it only when you ask' },
                        { text: 'Every step can be reversed exactly', ok: true },
                    ],
                },
                {
                    title: 'The assistant gets only what it needs',
                    text: 'An assistant asks the memory a question.',
                    steps: [
                        { text: 'Restricted and archived are never served' },
                        {
                            text: 'Only memories relevant to the question',
                            note: 'And if none are, nothing is served',
                        },
                        { text: 'Email addresses in quotes are masked' },
                        { text: 'The assistant answers from a picture you control', ok: true },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.en[4],
            title: 'What this means for you',
            intro: 'PersonaKit is open source and free, and you can download and use it today.',
            card: {
                title: 'An agent that remembers, without losing control',
                text: 'When I build an agent for a business, its memory follows the same principles:',
                bullets: [
                    'You can see where every detail came from',
                    'What is sensitive stays in',
                    'You decide what stays and what is forgotten',
                ],
                extra: <>Download and docs: {PK_LINKS}</>,
            },
            road: {
                title: 'Where it is going',
                steps: [
                    {
                        title: 'Today: memory',
                        text: 'From Claude Code and Codex sessions, with receipts and your control.',
                    },
                    {
                        title: 'On the roadmap: more sources',
                        text: 'Import from ChatGPT, claude.ai and Gemini.',
                    },
                    {
                        title: 'The first tool in a set',
                        text: 'More systems will join it over time.',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.en,
            tags: [
                'Python 3.10+',
                'No required dependencies',
                'SQLite',
                'MCP server',
                'CLI',
                'Apache-2.0',
                'GitHub Actions, 90% coverage',
            ],
            note: (
                <>
                    Open source: {ext('https://github.com/Yanir-R/personaKit', 'GitHub')} ·{' '}
                    {ext(LINKS.personakitDocs, 'the docs')}
                </>
            ),
        },
        cta: 'Want an agent with memory like this?',
    },
};

const reviewEngine: Localized<ProjectPage> = {
    he: {
        title: 'מנוע הביקורת',
        lede: (
            <>
                בודק קוד מבוסס AI <b>שעובר על כל שינוי לפני שהוא עולה לאוויר</b>. סוכן אחד כותב קוד,
                סוכן אחר בודק אותו, ורק אז זה מגיע לאדם שממזג. אני משתמש בו במוצרים שלי ובעבודה
                ללקוחות. הקוד פרטי, ולכן העמוד הזה מסביר איך זה עובד במקום לקשר אליו.
            </>
        ),
        facts: [
            { value: '1', label: 'מנוע לכל המאגרים, וכל מאגר שומר רק קובץ הגדרות קצר' },
            { value: '0', label: 'מפתחות גישה בידי הבודק. הוא רק כותב, מישהו אחר מפרסם' },
            { value: '3', label: 'כללים שהמנוע לא שובר, גם כשהוא עצמו משתנה' },
        ],
        problem: {
            tagline: TAG.he[0],
            title: 'למה לא מספיק ״לתת ל־AI לבדוק״',
            intro: 'מה מפחיד בבודק AI, ומה המנוע עושה עם כל חשש.',
            columns: ['החשש', 'במנוע'],
            rows: [
                {
                    before: 'בודק AI שאפשר לשכנע לעשות משהו שלא ביקשו ממנו',
                    lead: 'לבודק אין מפתחות.',
                    rest: 'הוא רק כותב את חוות הדעת שלו, וצעד נפרד מפרסם אותה.',
                },
                {
                    before: 'הבודק נתקע, ושום דבר לא אומר את זה',
                    lead: 'שתיקה היא אף פעם לא אישור.',
                    rest: '״לא הצלחתי להסתכל״ לעולם לא הופך ל״נקי״.',
                },
                {
                    before: 'אותו שינוי מקבל פעם כן ופעם לא',
                    lead: 'אותו קלט, אותה פסיקה.',
                    rest: 'פסיקה חוזרת רק כשבטוח ששום דבר לא השתנה.',
                },
                {
                    before: 'קוד שנבדק משנה את ההוראות של מי שבודק אותו',
                    lead: 'ההוראות של הבודק מגיעות מהמנוע,',
                    rest: 'ונבדקות לפני כל ריצה. השינוי שנבדק לא יכול לגעת בהן.',
                },
                {
                    before: 'כל מאגר עם הגדרות משלו, שמתפזרות עם הזמן',
                    lead: 'מנוע אחד,',
                    rest: 'וכל מאגר מתאר את עצמו בקובץ אחד.',
                },
                { before: 'לא ברור כמה זה עולה', lead: 'טוקנים ועלות נרשמים לכל סבב בדיקה.' },
            ],
        },
        flow: {
            tagline: TAG.he[1],
            title: 'איך זה בנוי',
            intro: 'מה קורה מהרגע שמישהו מבקש למזג שינוי, ועד שהוא מקבל תשובה.',
            columns: [
                { label: 'מי מבקש', people: ['מפתח', 'סוכן שכותב קוד'] },
                {
                    label: 'הבקשה',
                    nodes: [
                        {
                            title: 'בקשת מיזוג',
                            text: 'השינוי, וקובץ ההגדרות של המאגר: מה לחפש ומה רגיש אצלו',
                            tech: 'GitHub',
                        },
                        {
                            title: 'המנוע',
                            text: 'מכין את הבדיקה ומתקין לבודק את ההוראות שלו, מהמנוע ולא מהשינוי',
                            tech: 'GitHub Actions',
                        },
                    ],
                },
                {
                    label: 'הבודק',
                    nodes: [
                        {
                            title: 'בודק AI',
                            text: 'קורא את השינוי וכותב חוות דעת לתיבת דואר יוצא. בלי מפתחות, בלי גישה לגיטהאב',
                            tech: 'Claude Code',
                        },
                    ],
                },
                {
                    label: 'התשובה',
                    nodes: [
                        {
                            title: 'המפרסם',
                            text: 'צעד נפרד שמחזיק בהרשאות. מסרב לפרסם כל דבר שמכיל סוד',
                            gate: true,
                        },
                        {
                            title: 'פסיקה ברורה',
                            text: 'מאשר או מבקש שינויים, עם הגרסה המדויקת שנבדקה',
                        },
                        { title: 'אדם ממזג', text: 'רק אחרי שיש פסיקה לגרסה שהוא ממזג' },
                    ],
                },
            ],
            legend: 'רץ על שרתי בדיקה שלי.',
            techLegend: TECH_LEGEND.he,
        },
        rules: {
            tagline: TAG.he[2],
            title: 'מי רשאי לעשות מה',
            intro: 'הבודק הוא מודל שקורא טקסט שמישהו אחר כתב. לכן הוא לא מקבל שום דבר שאפשר לנצל.',
            matrix: {
                corner: 'פעולה',
                columns: ['בודק ה־AI', 'המפרסם', 'האדם שממזג'],
                me: 0,
                rows: [
                    { label: 'לקרוא את השינוי', cells: ['y', 'x', 'y'] },
                    { label: 'לכתוב חוות דעת', cells: [{ tag: 'לתיבת דואר יוצא' }, 'x', 'y'] },
                    { label: 'לפרסם בגיטהאב', cells: ['x', { tag: 'רק בלי סודות' }, 'y'] },
                    { label: 'להחזיק מפתחות גישה', cells: ['x', { tag: 'רק מה שצריך' }, 'y'] },
                    {
                        label: 'לשנות את ההוראות של הבודק',
                        note: 'השינוי שנבדק אף פעם לא',
                        cells: ['x', 'x', { tag: 'רק בשינוי למנוע עצמו', dashed: true }],
                    },
                    { label: 'למזג', cells: ['x', 'x', 'y'] },
                ],
                keys: { yes: 'מותר', no: 'לא זמין' },
            },
            note: (
                <>
                    <b>גם שינוי במנוע עצמו נבדק על ידי הגרסה הקודמת שלו,</b> ולא על ידי הקוד החדש.
                    גרסה חדשה יוצאת לכל המאגרים רק אחרי שכל הבדיקות שלה עברו.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.he[3],
            title: 'שלושה כללים שהמנוע לא שובר',
            intro: 'כל אחד מהם הוא הבטחה לכל מאגר שמשתמש בו.',
            items: [
                {
                    title: 'שתיקה היא לא אישור',
                    text: 'הבודק לא סיים, או קובץ ההגדרות לא נקרא.',
                    steps: [
                        { text: 'המנוע מזהה שמשהו לא הושלם' },
                        { text: 'התוצאה היא ״לא הצלחתי להסתכל״' },
                        { text: 'מבקש שינויים, ומפרט מה לא הסתיים' },
                        { text: 'אף פעם לא ״נקי״ במקרה', ok: true },
                    ],
                },
                {
                    title: 'אותו קלט, אותה פסיקה',
                    text: 'אותו שינוי נשלח שוב לבדיקה.',
                    steps: [
                        { text: 'בודקים אם משהו בקלט השתנה' },
                        { text: 'הבדיקה מאושרת פעמיים' },
                        {
                            text: 'הפסיקה הקודמת חוזרת',
                            ok: true,
                            fork: ['זהה: אותה פסיקה', 'יש ספק: הבודקים רצים שוב'],
                        },
                    ],
                },
                {
                    title: 'כלל חדש נמדד לפני שהוא מחליט',
                    text: 'למשל: לשאול בודק עצמאי לפני שממצא חוסם שינוי.',
                    steps: [
                        { text: 'ממצא חמור מספיק כדי לחסום' },
                        { text: 'בודק עצמאי נשאל עליו שלוש פעמים' },
                        { text: 'ההצבעה נרשמת בצד, בלי לשנות את הפסיקה' },
                        { text: 'הכלל מקבל סמכות רק אחרי שהחלטתי שכן', ok: true },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.he[4],
            title: 'מה זה אומר בשבילכם',
            intro: 'ככל שיותר קוד נכתב על ידי סוכנים, צריך מישהו שבודק אותו, ובודק שאפשר לסמוך עליו.',
            card: {
                title: 'צוות שכותב קוד עם AI?',
                text: 'אני יכול לבנות לכם תהליך בדיקה כזה, מותאם לקוד שלכם:',
                bullets: [
                    'מה חשוב לחפש אצלכם, בקובץ אחד',
                    'בודק שלא מחזיק מפתחות',
                    'פסיקה ברורה לכל שינוי, ועלות שנרשמת',
                ],
            },
            road: {
                title: 'ככה אני בונה',
                steps: [
                    {
                        title: 'קודם מבינים מה מסוכן אצלכם',
                        text: 'אילו טעויות יקרות, ואילו קבצים רגישים.',
                    },
                    { title: 'מגדירים גבולות לבודק', text: 'מה הוא רואה, מה הוא כותב, ומי מפרסם.' },
                    { title: 'מודדים לפני שנותנים לו להחליט', text: 'כל כלל חדש רץ קודם בצד.' },
                ],
            },
        },
        dev: {
            summary: DEV.he,
            tags: [
                'GitHub Actions, reusable workflow',
                'self-hosted runners',
                'Claude Code',
                'Codex כגיבוי כשהמכסה נגמרת',
                'Python',
                'Bash',
            ],
            note: 'הקוד פרטי.',
        },
        cta: 'רוצים בדיקה כזו אצלכם?',
    },
    en: {
        lede: (
            <>
                An AI code reviewer <b>that goes over every change before it goes live</b>. One
                agent writes code, another agent reviews it, and only then does it reach the person
                who merges. I use it on my own products and in client work. The code is private, so
                this page explains how it works instead of linking to it.
            </>
        ),
        facts: [
            {
                value: '1',
                label: 'engine for every repository; each keeps only a short settings file',
            },
            {
                value: '0',
                label: 'access keys held by the reviewer. It only writes; something else posts',
            },
            { value: '3', label: 'rules the engine does not break, even when it changes itself' },
        ],
        problem: {
            tagline: TAG.en[0],
            title: 'Why "let the AI review it" is not enough',
            intro: 'What is scary about an AI reviewer, and what the engine does about each worry.',
            columns: ['The worry', 'In the engine'],
            rows: [
                {
                    before: 'An AI reviewer that can be talked into doing something it was not asked to',
                    lead: 'The reviewer holds no keys.',
                    rest: 'It only writes its review, and a separate step posts it.',
                },
                {
                    before: 'The reviewer gets stuck, and nothing says so',
                    lead: 'Silence is never approval.',
                    rest: '"Could not look" never turns into "clean".',
                },
                {
                    before: 'The same change gets a yes one time and a no the next',
                    lead: 'Same inputs, same verdict.',
                    rest: 'A verdict is reused only when nothing has changed for certain.',
                },
                {
                    before: 'Code under review changes the instructions of whoever reviews it',
                    lead: "The reviewer's instructions come from the engine,",
                    rest: 'and are checked before every run. The change under review cannot touch them.',
                },
                {
                    before: 'Every repository has its own settings, and they drift',
                    lead: 'One engine,',
                    rest: 'and each repository describes itself in one file.',
                },
                {
                    before: 'No idea what it costs',
                    lead: 'Tokens and cost are logged for every review round.',
                },
            ],
        },
        flow: {
            tagline: TAG.en[1],
            title: 'How it is built',
            intro: 'What happens from the moment someone asks to merge a change until they get an answer.',
            columns: [
                { label: 'Who asks', people: ['Developer', 'Coding agent'] },
                {
                    label: 'The request',
                    nodes: [
                        {
                            title: 'Pull request',
                            text: "The change, plus the repository's settings file: what to look for and what is sensitive there",
                            tech: 'GitHub',
                        },
                        {
                            title: 'The engine',
                            text: "Prepares the review and installs the reviewer's instructions, from the engine and not from the change",
                            tech: 'GitHub Actions',
                        },
                    ],
                },
                {
                    label: 'The reviewer',
                    nodes: [
                        {
                            title: 'AI reviewer',
                            text: 'Reads the change and writes its review to an outbox. No keys, no GitHub access',
                            tech: 'Claude Code',
                        },
                    ],
                },
                {
                    label: 'The answer',
                    nodes: [
                        {
                            title: 'The publisher',
                            text: 'A separate step that holds the permissions. Refuses to post anything that contains a secret',
                            gate: true,
                        },
                        {
                            title: 'A clear verdict',
                            text: 'Approves or requests changes, naming the exact version reviewed',
                        },
                        {
                            title: 'A person merges',
                            text: 'Only once there is a verdict for the version being merged',
                        },
                    ],
                },
            ],
            legend: 'Runs on my own review runners.',
            techLegend: TECH_LEGEND.en,
        },
        rules: {
            tagline: TAG.en[2],
            title: 'Who may do what',
            intro: 'The reviewer is a model reading text someone else wrote. So it gets nothing that could be abused.',
            matrix: {
                corner: 'Action',
                columns: ['AI reviewer', 'Publisher', 'Person who merges'],
                me: 0,
                rows: [
                    { label: 'Read the change', cells: ['y', 'x', 'y'] },
                    { label: 'Write a review', cells: [{ tag: 'To an outbox' }, 'x', 'y'] },
                    { label: 'Post on GitHub', cells: ['x', { tag: 'Only without secrets' }, 'y'] },
                    { label: 'Hold access keys', cells: ['x', { tag: 'Only what it needs' }, 'y'] },
                    {
                        label: "Change the reviewer's instructions",
                        note: 'The change under review, never',
                        cells: ['x', 'x', { tag: 'Only by changing the engine', dashed: true }],
                    },
                    { label: 'Merge', cells: ['x', 'x', 'y'] },
                ],
                keys: { yes: 'Allowed', no: 'Not available' },
            },
            note: (
                <>
                    <b>Even a change to the engine itself is reviewed by its previous release,</b>{' '}
                    not by the new code. A new release reaches every repository only after all its
                    tests pass.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.en[3],
            title: 'Three rules the engine does not break',
            intro: 'Each one is a promise to every repository that uses it.',
            items: [
                {
                    title: 'Silence is not approval',
                    text: 'The reviewer did not finish, or the settings file could not be read.',
                    steps: [
                        { text: 'The engine notices something did not complete' },
                        { text: 'The result is "could not look"' },
                        { text: 'It requests changes and names what did not finish' },
                        { text: 'Never "clean" by accident', ok: true },
                    ],
                },
                {
                    title: 'Same inputs, same verdict',
                    text: 'The same change is sent for review again.',
                    steps: [
                        { text: 'Check whether anything in the inputs changed' },
                        { text: 'The check is confirmed twice' },
                        {
                            text: 'The earlier verdict is reused',
                            ok: true,
                            fork: ['Identical: same verdict', 'Any doubt: the reviewers run again'],
                        },
                    ],
                },
                {
                    title: 'A new rule is measured before it decides',
                    text: 'For example: asking an independent checker before a finding blocks a change.',
                    steps: [
                        { text: 'A finding serious enough to block' },
                        { text: 'An independent checker is asked about it three times' },
                        { text: 'The vote is recorded on the side, without changing the verdict' },
                        { text: 'The rule gets a say only after I decide it should', ok: true },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.en[4],
            title: 'What this means for you',
            intro: 'The more code agents write, the more you need someone to review it, and a reviewer you can trust.',
            card: {
                title: 'A team that writes code with AI?',
                text: 'I can build a review process like this for you, fitted to your code:',
                bullets: [
                    'What matters to look for, in one file',
                    'A reviewer that holds no keys',
                    'A clear verdict on every change, and a logged cost',
                ],
            },
            road: {
                title: 'How I build',
                steps: [
                    {
                        title: 'First, understand what is risky for you',
                        text: 'Which mistakes are costly, and which files are sensitive.',
                    },
                    {
                        title: 'Set limits for the reviewer',
                        text: 'What it sees, what it writes, and who posts.',
                    },
                    {
                        title: 'Measure before it gets to decide',
                        text: 'Every new rule runs on the side first.',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.en,
            tags: [
                'GitHub Actions, reusable workflow',
                'self-hosted runners',
                'Claude Code',
                'Codex fallback on quota',
                'Python',
                'Bash',
            ],
            note: 'The code is private.',
        },
        cta: 'Want reviews like this?',
    },
};

const catchup: Localized<ProjectPage> = {
    he: {
        lede: (
            <>
                תוסף ל־Claude Code <b>שמסכם את הודעות הסוכן שלא קראתם</b>. חזרתם לשרשור ארוך, או
                שסוכן עבד בזמן שלא הייתם. במקום לגלול, מבקשים סיכום: מה הסוכן צריך מכם, מה הוא עשה
                ועם איזו הוכחה, ומה נשאר לסשן הבא. הכלל שמאחוריו הוא כלל שאני עובד לפיו בכל מקום:
                המודל כותב שפה, הקוד עושה את השאר.
            </>
        ),
        facts: [
            { value: '1', label: 'מקור לכל פריט בסיכום: ההודעה שממנה הוא הגיע' },
            { value: '0', label: 'דברים שנשמרים. הכול חי בזיכרון ונעלם כשסוגרים' },
            { value: '25', label: 'מילים לכל היותר במשפט. ארוך יותר, והמודל כותב מחדש' },
        ],
        problem: {
            tagline: TAG.he[0],
            title: 'מה קורה כשחוזרים לסוכן שעבד לבד',
            intro: 'הבעיות שמכיר כל מי שעובד עם סוכנים, ומה catchup עושה איתן.',
            columns: ['הבעיה', 'ב־catchup'],
            rows: [
                {
                    before: 'מאות הודעות, וצריך לגלול כדי להבין איפה עומדים',
                    lead: 'סיכום אחד, באותו סדר תמיד:',
                    rest: 'מה מחכה לכם, מה נכשל, מה בוצע, מה עוד רץ ומה הלאה.',
                },
                {
                    before: 'שאלה של הסוכן נקברה באמצע השרשור',
                    lead: 'כל שאלה פתוחה מופיעה ראשונה,',
                    rest: 'גם אם המודל פספס אותה. הקוד מוצא אותה בעצמו.',
                },
                {
                    before: 'הסוכן אומר ״עשיתי״, ואין דרך לדעת אם זה נכון',
                    lead: '״בוצע״ בלי הוכחה עובר ל״לא נבדק״.',
                },
                {
                    before: 'סיכום שממציא שמות או החלטות',
                    lead: 'כל פריט מפנה להודעה שלו.',
                    rest: 'שם שלא מופיע בהודעות מסומן בסימן שאלה, והחלטה שלא אתם קיבלתם יורדת.',
                },
                {
                    before: 'חשש ששיחות עם סודות יוצאות החוצה',
                    lead: 'סודות וכתובות מייל מוסתרים',
                    rest: 'לפני שמשהו מגיע למודל, ושום דבר לא נשמר.',
                },
            ],
        },
        flow: {
            tagline: TAG.he[1],
            title: 'איך זה בנוי',
            intro: 'מההודעות שלא קראתם ועד הסיכום שנפתח בצד, בלי להוסיף תור לשיחה.',
            columns: [
                { label: 'מה מסכמים', people: ['הודעות הסוכן', 'סשנים אחרים'] },
                {
                    label: 'לפני המודל',
                    nodes: [
                        { title: 'ניקוי', text: 'סודות וכתובות מייל מוסתרים' },
                        { title: 'חלוקה', text: 'שרשור ארוך מסוכם בחלקים, ואז מתמזג' },
                    ],
                },
                {
                    label: 'המודל',
                    nodes: [
                        {
                            title: 'כותב את השפה',
                            text: 'מחזיר מבנה קבוע: כותרת, החלטות, כשלים, בוצע, רץ, הלאה',
                            tech: 'JSON · Claude',
                        },
                    ],
                },
                {
                    label: 'הקוד',
                    nodes: [
                        {
                            title: 'בודק כל פריט',
                            text: 'מקור, הוכחה, שמות, אורך משפט. לא תקין? ניסיון אחד נוסף',
                            tech: 'TypeScript',
                            gate: true,
                        },
                        { title: 'חלונית הסיכום', text: 'נפתחת בצד, תמיד באותו סדר ובאותן כותרות' },
                    ],
                },
            ],
            legend: 'רץ בתוך הסשן של Claude שכבר פתוח אצלכם.',
            techLegend: TECH_LEGEND.he,
        },
        rules: {
            tagline: '03 · חלוקת עבודה',
            title: 'מה המודל עושה, ומה הקוד',
            intro: 'המודל טוב בשפה. בכל השאר, הקוד מחליט, כי אותו קוד נותן אותה תשובה בכל פעם.',
            matrix: {
                corner: 'משימה',
                columns: ['המודל', 'הקוד'],
                me: 1,
                rows: [
                    { label: 'לנסח את הסיכום במשפטים קצרים', cells: ['y', { tag: 'בודק אורך' }] },
                    { label: 'למצוא שאלות שמחכות לכם', cells: ['y', { tag: 'משלים מה שפוספס' }] },
                    { label: 'לקבוע מה נכשל ומה עוד רץ', cells: ['x', 'y'] },
                    { label: 'להחליט אם ״בוצע״ באמת נבדק', cells: ['x', 'y'] },
                    { label: 'לבדוק שכל מקור ושם באמת קיימים', cells: ['x', 'y'] },
                    { label: 'לשמור משהו, או לשלוח לרשת', cells: ['x', 'x'] },
                ],
                keys: { yes: 'עושה', no: 'לא עושה' },
            },
            note: (
                <>
                    <b>בדיקת השחרור נכשלת אם מופיעה בקוד קריאה לאחסון, לרשת או להפעלת תהליך.</b>{' '}
                    ההבטחה ״שום דבר לא נשמר״ נבדקת בקוד, לא רק כתובה.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.he[3],
            title: 'שלושה מנגנונים נגד סיכום שמטעה',
            intro: 'סיכום שנשמע בטוח ולא נכון גרוע יותר מלגלול.',
            items: [
                {
                    title: '״בוצע״ צריך הוכחה',
                    text: 'הסוכן כתב שהבדיקות עברו.',
                    steps: [
                        { text: 'המודל מסמן את זה כבוצע' },
                        { text: 'הקוד מחפש הוכחה ומקור' },
                        { text: 'הוכחה מעורפלת? נשלח שוב פעם אחת' },
                        { text: 'אין הוכחה: עובר ל״לא נבדק״', ok: true },
                    ],
                },
                {
                    title: 'כל פריט עם כתובת',
                    text: 'איך יודעים שהסיכום לא המציא.',
                    steps: [
                        { text: 'כל פריט מפנה למספר ההודעה שלו', note: 'למשל #148' },
                        { text: 'מספר שהמודל לא ראה יורד' },
                        { text: 'שם שלא מופיע בהודעות מקבל סימן שאלה' },
                        { text: 'אפשר לקפוץ להודעה ולבדוק', ok: true },
                    ],
                },
                {
                    title: 'רק אתם מחליטים',
                    text: 'סוכן הציע כיוון. האם זו החלטה?',
                    steps: [
                        { text: 'המודל מסמן ״הוחלט״' },
                        { text: 'הקוד בודק שזה מפנה להודעה שלכם' },
                        {
                            text: 'רק מה שאתם כתבתם נשאר החלטה',
                            ok: true,
                            fork: ['כתבתם: הוחלט', 'הסוכן רק הציע: יורד'],
                        },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.he[4],
            title: 'מה זה אומר בשבילכם',
            intro: 'catchup פתוח וחינמי, ומותקן מה־plugin marketplace של Claude Code.',
            card: {
                title: 'הצוות שלכם עובד עם סוכנים?',
                text: 'החלק הקשה הוא לא לתת לסוכן לעבוד, אלא לדעת מה הוא עשה. אני בונה את שכבת הפיקוח הזו:',
                bullets: [
                    'סיכומים שאפשר לבדוק מול המקור',
                    'שאלות שמחכות לאדם, מוצגות ראשונות',
                    'בלי ששום דבר רגיש יוצא החוצה',
                ],
            },
            road: {
                title: 'הכלל שמאחורי זה',
                steps: [
                    { title: 'המודל כותב שפה', text: 'בזה הוא באמת טוב.' },
                    { title: 'הקוד בודק עובדות', text: 'מקורות, הוכחות, שמות והחלטות.' },
                    { title: 'ומה שלא עבר בדיקה, מסומן', text: 'לא מוסתר ולא מנוחש.' },
                ],
            },
        },
        dev: {
            summary: DEV.he,
            tags: ['TypeScript', 'Claude Code plugin (hooks)', 'JSON מובנה + אימות', 'MIT'],
            note: <>הקוד פתוח: {ext('https://github.com/Yanir-R/catchup', 'GitHub')}</>,
        },
        cta: 'רוצים פיקוח כזה על הסוכנים שלכם?',
    },
    en: {
        lede: (
            <>
                A Claude Code plugin <b>that sums up the agent messages you have not read</b>. You
                come back to a long thread, or an agent worked while you were away. Instead of
                scrolling, you ask for a summary: what the agent needs from you, what it did and
                with what proof, and what is left for the next session. The rule behind it is one I
                work by everywhere: the model writes language, code does the rest.
            </>
        ),
        facts: [
            { value: '1', label: 'source for every item in the summary: the message it came from' },
            {
                value: '0',
                label: 'things stored. It all lives in memory and is gone when you close',
            },
            {
                value: '25',
                label: 'words at most in a sentence. Any longer and the model rewrites',
            },
        ],
        problem: {
            tagline: TAG.en[0],
            title: 'What happens when you come back to an agent that worked alone',
            intro: 'Problems anyone who works with agents knows, and what catchup does about them.',
            columns: ['The problem', 'In catchup'],
            rows: [
                {
                    before: 'Hundreds of messages, and you scroll to work out where things stand',
                    lead: 'One summary, always in the same order:',
                    rest: 'what waits for you, what failed, what is done, what is still running and what is next.',
                },
                {
                    before: "The agent's question got buried mid-thread",
                    lead: 'Every open question comes first,',
                    rest: 'even if the model missed it. Code finds it on its own.',
                },
                {
                    before: 'The agent says "done", and you cannot tell if it is true',
                    lead: '"Done" without proof moves to "not checked".',
                },
                {
                    before: 'A summary that invents names or decisions',
                    lead: 'Every item points to its message.',
                    rest: 'A name not in the messages gets a question mark, and a decision you did not make is dropped.',
                },
                {
                    before: 'Worry that conversations with secrets leak out',
                    lead: 'Secrets and email addresses are masked',
                    rest: 'before anything reaches the model, and nothing is stored.',
                },
            ],
        },
        flow: {
            tagline: TAG.en[1],
            title: 'How it is built',
            intro: 'From the messages you have not read to the summary that opens on the side, without adding a turn to the chat.',
            columns: [
                { label: 'What is summed up', people: ['Agent messages', 'Other sessions'] },
                {
                    label: 'Before the model',
                    nodes: [
                        { title: 'Scrub', text: 'Secrets and email addresses are masked' },
                        {
                            title: 'Split',
                            text: 'A long thread is summed up in parts, then merged',
                        },
                    ],
                },
                {
                    label: 'The model',
                    nodes: [
                        {
                            title: 'Writes the language',
                            text: 'Returns a fixed shape: headline, decisions, failures, done, running, next',
                            tech: 'JSON · Claude',
                        },
                    ],
                },
                {
                    label: 'The code',
                    nodes: [
                        {
                            title: 'Checks every item',
                            text: 'Source, proof, names, sentence length. Not valid? One more try',
                            tech: 'TypeScript',
                            gate: true,
                        },
                        {
                            title: 'The summary pane',
                            text: 'Opens on the side, always in the same order with the same labels',
                        },
                    ],
                },
            ],
            legend: 'Runs inside the Claude session you already have open.',
            techLegend: TECH_LEGEND.en,
        },
        rules: {
            tagline: '03 · Division of work',
            title: 'What the model does, and what code does',
            intro: 'The model is good at language. Everything else, code decides, because the same code gives the same answer every time.',
            matrix: {
                corner: 'Task',
                columns: ['The model', 'The code'],
                me: 1,
                rows: [
                    {
                        label: 'Write the summary in short sentences',
                        cells: ['y', { tag: 'Checks length' }],
                    },
                    {
                        label: 'Find questions that wait for you',
                        cells: ['y', { tag: 'Adds what was missed' }],
                    },
                    { label: 'Decide what failed and what is still running', cells: ['x', 'y'] },
                    { label: 'Decide whether "done" was really checked', cells: ['x', 'y'] },
                    { label: 'Check every source and name really exists', cells: ['x', 'y'] },
                    { label: 'Store anything, or call the network', cells: ['x', 'x'] },
                ],
                keys: { yes: 'Does it', no: 'Does not' },
            },
            note: (
                <>
                    <b>
                        The release check fails if the code contains a call to storage, the network
                        or a process.
                    </b>{' '}
                    "Nothing is stored" is a promise checked in code, not only written down.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.en[3],
            title: 'Three mechanisms against a misleading summary',
            intro: 'A summary that sounds sure and is wrong is worse than scrolling.',
            items: [
                {
                    title: '"Done" needs proof',
                    text: 'The agent wrote that the tests passed.',
                    steps: [
                        { text: 'The model marks it as done' },
                        { text: 'Code looks for proof and a source' },
                        { text: 'Vague proof? Sent back once' },
                        { text: 'No proof: it moves to "not checked"', ok: true },
                    ],
                },
                {
                    title: 'Every item has an address',
                    text: 'How you know the summary did not make it up.',
                    steps: [
                        {
                            text: 'Every item points to its message number',
                            note: 'For example #148',
                        },
                        { text: 'A number the model was not shown is dropped' },
                        { text: 'A name not in the messages gets a question mark' },
                        { text: 'You can jump to the message and check', ok: true },
                    ],
                },
                {
                    title: 'Only you decide',
                    text: 'An agent proposed a direction. Is that a decision?',
                    steps: [
                        { text: 'The model marks it "decided"' },
                        { text: 'Code checks it points to a message of yours' },
                        {
                            text: 'Only what you wrote stays a decision',
                            ok: true,
                            fork: ['You wrote it: decided', 'Agent only proposed: dropped'],
                        },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.en[4],
            title: 'What this means for you',
            intro: "catchup is open source and free, installed from Claude Code's plugin marketplace.",
            card: {
                title: 'Your team works with agents?',
                text: 'The hard part is not letting the agent work, it is knowing what it did. I build that oversight layer:',
                bullets: [
                    'Summaries you can check against the source',
                    'Questions that wait for a person, shown first',
                    'Nothing sensitive leaving the building',
                ],
            },
            road: {
                title: 'The rule behind it',
                steps: [
                    {
                        title: 'The model writes language',
                        text: 'That is what it is truly good at.',
                    },
                    { title: 'Code checks facts', text: 'Sources, proof, names and decisions.' },
                    { title: 'What failed a check is marked', text: 'Not hidden and not guessed.' },
                ],
            },
        },
        dev: {
            summary: DEV.en,
            tags: [
                'TypeScript',
                'Claude Code plugin (hooks)',
                'Structured JSON + validation',
                'MIT',
            ],
            note: <>Open source: {ext('https://github.com/Yanir-R/catchup', 'GitHub')}</>,
        },
        cta: 'Want oversight like this for your agents?',
    },
};

/** The main projects that have a drawn page, by document slug. */
const aiChat: Localized<ProjectPage> = {
    he: {
        lede: (
            <>
                האתר הזה, והפרויקט שאני בונה עכשיו. <b>סוכן שעונה בשמי, רק ממה שכתבתי</b>:
                הפרויקטים, הפוסטים, קורות החיים ואיך אני עובד. הקוד בוחר את המסמכים שהשאלה צריכה,
                המודל מקבל רק אותם, וכשאין בהם תשובה הסוכן אומר את זה ומעביר את השאלה אליי. מתחת לכל
                תשובה אפשר לראות על מה היא נשענה.
            </>
        ),
        facts: [
            { value: '3', label: 'מסמכים לכל היותר לכל תשובה, מלבד הפרופיל שלי' },
            {
                value: '83',
                label: 'שאלות אמיתיות בעברית ובאנגלית שבודקות שכל שאלה מגיעה למסמך הנכון',
            },
            { value: '0', label: 'הוראות שהסוכן מקבל מטקסט של מבקר או מתוך מסמך' },
        ],
        problem: {
            tagline: TAG.he[0],
            title: 'למה צ׳אט על אתר הוא לא סתם צ׳אט',
            intro: 'מה שמשתבש בצ׳אטים של אתרים, ומה עשיתי כאן במקום.',
            columns: ['הבעיה', 'באתר הזה'],
            rows: [
                {
                    before: 'הצ׳אט ממציא תשובה כשאין לו מידע',
                    lead: 'עונה רק מהמסמכים שלי.',
                    rest: 'אין בהם תשובה? הוא אומר את זה ומציע להעביר את השאלה אליי.',
                },
                {
                    before: 'אין דרך לדעת על מה התשובה נשענת',
                    lead: '״מאחורי התשובה״ מתחת לכל תשובה:',
                    rest: 'אילו מסמכים המודל קיבל, וכמה זמן וטוקנים זה לקח.',
                },
                {
                    before: 'מישהו כותב ״תתעלם מההוראות שלך״',
                    lead: 'טקסט של מבקר הוא תוכן, לא הוראה.',
                    rest: 'אותו דבר לגבי טקסט בתוך המסמכים.',
                },
                {
                    before: 'בוט אחד יכול לשרוף את כל התקציב בלילה',
                    lead: 'מגבלות שהקוד אוכף:',
                    rest: '20 תשובות למבקר ביום, 300 לכל האתר, ותקרת הוצאה חודשית.',
                },
                {
                    before: 'השיחה נגמרת, והמבקר לא יודע מה עכשיו',
                    lead: 'מהשאלה השלישית מופיע כרטיס',
                    rest: 'שמציע להמשיך איתי אישית: שיחה, מייל או וואטסאפ, בלי לצאת מהאתר.',
                },
            ],
        },
        flow: {
            tagline: TAG.he[1],
            title: 'איך זה בנוי',
            intro: 'מהשאלה של המבקר ועד התשובה, דרך שער אחד ובלי מסד נתונים.',
            columns: [
                { label: 'מי שואל', people: ['מבקר באתר', 'עברית או אנגלית'] },
                {
                    label: 'בקצה',
                    nodes: [
                        {
                            title: 'האתר',
                            text: 'כל עמוד מוכן מראש למנועי חיפוש',
                            tech: 'React · Cloudflare Pages',
                        },
                        {
                            title: 'השער',
                            text: 'בודק שזה אדם ושהבקשה הגיעה מהאתר. אחרת היא לא עוברת',
                            tech: 'Worker · Turnstile',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'השרת',
                    nodes: [
                        { title: 'מגבלות', text: '20 למבקר, 300 ביום' },
                        {
                            title: 'בחירת מסמכים',
                            text: 'עד 3 מסמכים שעונים על השאלה',
                            tech: 'FastAPI · Cloud Run',
                        },
                        {
                            title: 'המודל',
                            text: 'כותב תשובה רק ממה שקיבל, עם מודלי גיבוי',
                            tech: 'Gemini',
                        },
                    ],
                },
                {
                    label: 'מה חוזר',
                    nodes: [
                        { title: 'תשובה', text: 'עם ״מאחורי התשובה״ ודיאגרמה כשהיא באמת עוזרת' },
                        { title: 'דרך אליי', text: 'שיחה, מייל או וואטסאפ, בתוך האתר' },
                    ],
                },
            ],
            lane: {
                label: 'הידע',
                nodes: [
                    {
                        title: 'מסמכים בעברית ובאנגלית',
                        text: 'פרויקטים, פוסטים, קורות חיים',
                        tech: 'Markdown',
                    },
                    {
                        title: 'ביטויים לכל מסמך',
                        text: 'ובנק שאלות שבודק אותם בכל שינוי',
                        tech: 'pytest',
                    },
                ],
            },
            legend: 'אין מסד נתונים ואין אימון: הסוכן יודע רק מה שכתוב בתיקייה.',
            techLegend: TECH_LEGEND.he,
        },
        rules: {
            tagline: TAG.he[2],
            title: 'מי מחליט מה',
            intro: 'המודל כותב. כל השאר נקבע בקוד, כי קוד נותן אותה תשובה בכל פעם.',
            matrix: {
                corner: 'פעולה',
                columns: ['המבקר', 'המודל', 'הקוד', 'אני'],
                me: 3,
                rows: [
                    { label: 'לשאול שאלה', cells: ['y', 'x', 'x', 'x'] },
                    { label: 'לבחור אילו מסמכים המודל רואה', cells: ['x', 'x', 'y', 'x'] },
                    { label: 'לנסח את התשובה', cells: ['x', 'y', 'x', 'x'] },
                    { label: 'לבחור דיאגרמה ליד תשובה', cells: ['x', 'x', 'y', 'x'] },
                    { label: 'להחליט מתי מופיע כרטיס ההמשך', cells: ['x', 'x', 'y', 'x'] },
                    {
                        label: 'לשנות את ההוראות של הסוכן',
                        cells: ['x', 'x', 'x', { tag: 'בקוד, דרך PR' }],
                    },
                    {
                        label: 'לשנות מה הסוכן יודע',
                        cells: ['x', 'x', 'x', { tag: 'מסמך + שאלת בדיקה' }],
                    },
                ],
                cards: [
                    {
                        name: 'המבקר',
                        yes: ['לשאול', 'לקבוע שיחה', 'לשלוח מייל'],
                        no: 'לא: לבחור מסמכים, לשנות הוראות או ידע',
                    },
                    {
                        name: 'המודל',
                        yes: ['לנסח תשובה'],
                        no: 'לא: לבחור מסמכים, דיאגרמות או מתי מופיע הכרטיס',
                    },
                    {
                        name: 'הקוד',
                        yes: ['לבחור מסמכים', 'לבחור דיאגרמה', 'להציג את הכרטיס', 'לאכוף מגבלות'],
                    },
                    {
                        name: 'אני',
                        yes: [],
                        maybe: ['הוראות: בקוד', 'ידע: מסמך + שאלת בדיקה'],
                        me: true,
                    },
                ],
                keys: { yes: 'יכול', no: 'לא יכול' },
            },
            note: (
                <>
                    <b>מסמך חדש בלי שאלת בדיקה מפיל את הבדיקות.</b> כך אי אפשר להוסיף ידע שהסוכן לא
                    יודע להגיע אליו.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.he[3],
            title: 'שלושה מנגנונים שמחזיקים את זה אמין',
            intro: 'סוכן שמדבר בשמי צריך להיות זהיר יותר ממני.',
            items: [
                {
                    title: 'תשובה רק ממה שכתוב',
                    text: 'מבקר שואל על משהו שלא כתבתי עליו.',
                    steps: [
                        { text: 'הקוד מחפש מסמכים שעונים על השאלה' },
                        { text: 'המודל מקבל רק אותם, עד שלושה' },
                        {
                            text: 'אין התאמה?',
                            ok: true,
                            fork: ['יש: תשובה ממקור', 'אין: ״לא כתבתי על זה, אעביר ליניר״'],
                        },
                    ],
                },
                {
                    title: 'תקציב שלא נשרף',
                    text: 'מישהו שולח מאות בקשות בלילה.',
                    steps: [
                        { text: 'השער בודק שזה אדם ושזה מהאתר' },
                        { text: '20 תשובות למבקר, 300 לכל האתר ביום' },
                        { text: 'ותקרת הוצאה חודשית אצל הספק' },
                        { text: 'כל הודעת מגבלה מובילה ליצירת קשר איתי', ok: true },
                    ],
                },
                {
                    title: '״מאחורי התשובה״',
                    text: 'מבקר רוצה לדעת על מה התשובה נשענת.',
                    steps: [
                        { text: 'כל תשובה שומרת את המסלול שלה' },
                        { text: 'אילו מסמכים נשלחו, כמה טוקנים וכמה זמן' },
                        { text: 'קישור שקט מתחת לתשובה פותח את הכול', ok: true },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.he[4],
            title: 'מה זה אומר בשבילכם',
            intro: 'אותו מבנה מתאים לכל ארגון שרוצה סוכן שעונה מהמסמכים שלו.',
            card: {
                title: 'רוצים סוכן שעונה ללקוחות מהמסמכים שלכם?',
                text: 'נהלים, מחירונים, שאלות נפוצות או מסמכי מוצר. אני בונה סוכן כזה עם אותם כללים:',
                bullets: [
                    'עונה רק ממה שכתוב, ואומר כשאין תשובה',
                    'מראה על מה כל תשובה נשענת',
                    'מגבלות תקציב ושער מבוטים מהיום הראשון',
                    'ומעביר אליכם את מי שצריך אדם',
                ],
                extra: (
                    <>
                        והקוד של האתר הזה פתוח:{' '}
                        {ext('https://github.com/Yanir-R/ai-portfolio-kit', 'GitHub')}
                    </>
                ),
            },
            road: {
                title: 'איך אני בונה את זה',
                steps: [
                    { title: 'קודם המסמכים', text: 'מה כתוב, מה חסר, ומה הלקוחות באמת שואלים.' },
                    {
                        title: 'בנק שאלות',
                        text: 'שאלות אמיתיות שבודקות שכל אחת מגיעה למסמך הנכון.',
                    },
                    { title: 'רק אז הסוכן', text: 'עם שער, מגבלות ו״מאחורי התשובה״.' },
                ],
            },
        },
        dev: {
            summary: DEV.he,
            tags: [
                'React 19 · TypeScript · Vite',
                'Cloudflare Pages + Worker',
                'FastAPI · Cloud Run',
                'Gemini עם מודלי גיבוי',
                'Secret Manager',
                'GitHub Actions + סקירת AI',
                'MIT',
            ],
            note: <>הקוד פתוח: {ext('https://github.com/Yanir-R/ai-portfolio-kit', 'GitHub')}</>,
        },
        cta: 'רוצים סוכן כזה על המסמכים שלכם?',
    },
    en: {
        lede: (
            <>
                This site, and the project I am building right now.{' '}
                <b>An agent that answers in my name, only from what I wrote</b>: my projects, posts,
                resume and how I work. Code picks the documents a question needs, the model gets
                only those, and when they do not cover it the agent says so and passes the question
                to me. Under every answer you can see what it relied on.
            </>
        ),
        facts: [
            { value: '3', label: 'documents at most per answer, besides my profile' },
            {
                value: '83',
                label: 'real questions in Hebrew and English that check each one reaches the right document',
            },
            {
                value: '0',
                label: 'instructions the agent takes from a visitor’s text or from inside a document',
            },
        ],
        problem: {
            tagline: TAG.en[0],
            title: 'Why a site chat is not just a chat',
            intro: 'What goes wrong with chat on websites, and what I did here instead.',
            columns: ['The problem', 'On this site'],
            rows: [
                {
                    before: 'The chat makes up an answer when it has no information',
                    lead: 'It answers only from my documents.',
                    rest: 'Nothing there? It says so and offers to pass the question to me.',
                },
                {
                    before: 'There is no way to tell what an answer rests on',
                    lead: '"Behind the answer" under every answer:',
                    rest: 'which documents the model got, and the time and tokens it took.',
                },
                {
                    before: 'Someone types "ignore your instructions"',
                    lead: 'A visitor’s text is content, not an instruction.',
                    rest: 'The same goes for text inside the documents.',
                },
                {
                    before: 'One bot can burn the whole budget overnight',
                    lead: 'Limits enforced in code:',
                    rest: '20 answers per visitor a day, 300 for the whole site, and a monthly spend cap.',
                },
                {
                    before: 'The chat ends and the visitor does not know what next',
                    lead: 'From the third question, a card',
                    rest: 'offers to continue with me personally: a call, email or WhatsApp, without leaving the site.',
                },
            ],
        },
        flow: {
            tagline: TAG.en[1],
            title: 'How it is built',
            intro: 'From the visitor’s question to the answer, through one gate and with no database.',
            columns: [
                { label: 'Who asks', people: ['A visitor', 'Hebrew or English'] },
                {
                    label: 'At the edge',
                    nodes: [
                        {
                            title: 'The site',
                            text: 'Every page prerendered for search engines',
                            tech: 'React · Cloudflare Pages',
                        },
                        {
                            title: 'The gate',
                            text: 'Checks it is a person and the request came from the site, or it does not pass',
                            tech: 'Worker · Turnstile',
                            gate: true,
                        },
                    ],
                },
                {
                    label: 'The server',
                    nodes: [
                        { title: 'Limits', text: '20 per visitor, 300 a day' },
                        {
                            title: 'Picking documents',
                            text: 'Up to 3 documents that answer the question',
                            tech: 'FastAPI · Cloud Run',
                        },
                        {
                            title: 'The model',
                            text: 'Writes only from what it was given, with fallback models',
                            tech: 'Gemini',
                        },
                    ],
                },
                {
                    label: 'What comes back',
                    nodes: [
                        {
                            title: 'An answer',
                            text: 'With "behind the answer", and a diagram when it really helps',
                        },
                        {
                            title: 'A way to me',
                            text: 'A call, email or WhatsApp, inside the site',
                        },
                    ],
                },
            ],
            lane: {
                label: 'The knowledge',
                nodes: [
                    {
                        title: 'Documents in Hebrew and English',
                        text: 'Projects, posts, resume',
                        tech: 'Markdown',
                    },
                    {
                        title: 'Phrases per document',
                        text: 'And a question bank that checks them on every change',
                        tech: 'pytest',
                    },
                ],
            },
            legend: 'No database and no training: the agent knows only what is written in the folder.',
            techLegend: TECH_LEGEND.en,
        },
        rules: {
            tagline: TAG.en[2],
            title: 'Who decides what',
            intro: 'The model writes. Everything else is decided in code, because code gives the same answer every time.',
            matrix: {
                corner: 'Action',
                columns: ['Visitor', 'Model', 'Code', 'Me'],
                me: 3,
                rows: [
                    { label: 'Ask a question', cells: ['y', 'x', 'x', 'x'] },
                    { label: 'Choose which documents the model sees', cells: ['x', 'x', 'y', 'x'] },
                    { label: 'Write the answer', cells: ['x', 'y', 'x', 'x'] },
                    { label: 'Choose a diagram next to an answer', cells: ['x', 'x', 'y', 'x'] },
                    {
                        label: 'Decide when the follow-up card appears',
                        cells: ['x', 'x', 'y', 'x'],
                    },
                    {
                        label: 'Change the agent’s instructions',
                        cells: ['x', 'x', 'x', { tag: 'in code, by PR' }],
                    },
                    {
                        label: 'Change what the agent knows',
                        cells: ['x', 'x', 'x', { tag: 'document + test question' }],
                    },
                ],
                cards: [
                    {
                        name: 'Visitor',
                        yes: ['Ask', 'Book a call', 'Send email'],
                        no: 'No: choose documents, change instructions or knowledge',
                    },
                    {
                        name: 'Model',
                        yes: ['Write the answer'],
                        no: 'No: choose documents, diagrams or when the card shows',
                    },
                    {
                        name: 'Code',
                        yes: [
                            'Choose documents',
                            'Choose a diagram',
                            'Show the card',
                            'Enforce limits',
                        ],
                    },
                    {
                        name: 'Me',
                        yes: [],
                        maybe: ['Instructions: in code', 'Knowledge: document + test question'],
                        me: true,
                    },
                ],
                keys: { yes: 'Can', no: 'Cannot' },
            },
            note: (
                <>
                    <b>A new document without a test question fails the tests.</b> So no knowledge
                    can be added that the agent cannot reach.
                </>
            ),
        },
        mechanisms: {
            tagline: TAG.en[3],
            title: 'Three mechanisms that keep it trustworthy',
            intro: 'An agent that speaks in my name has to be more careful than I am.',
            items: [
                {
                    title: 'Answers only from what is written',
                    text: 'A visitor asks about something I never wrote about.',
                    steps: [
                        { text: 'Code looks for documents that answer the question' },
                        { text: 'The model gets only those, up to three' },
                        {
                            text: 'No match?',
                            ok: true,
                            fork: [
                                'Match: an answer with a source',
                                'None: "I have not written about that, I will pass it to Yanir"',
                            ],
                        },
                    ],
                },
                {
                    title: 'A budget that does not burn',
                    text: 'Someone sends hundreds of requests overnight.',
                    steps: [
                        { text: 'The gate checks it is a person, from the site' },
                        { text: '20 answers per visitor, 300 for the site, a day' },
                        { text: 'And a monthly spend cap at the provider' },
                        { text: 'Every limit message leads to contacting me', ok: true },
                    ],
                },
                {
                    title: '"Behind the answer"',
                    text: 'A visitor wants to know what an answer rests on.',
                    steps: [
                        { text: 'Every answer keeps its own trace' },
                        { text: 'Which documents were sent, how many tokens and how long' },
                        { text: 'A quiet link under the answer opens it all', ok: true },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.en[4],
            title: 'What it means for you',
            intro: 'The same structure fits any organisation that wants an agent answering from its own documents.',
            card: {
                title: 'Want an agent that answers customers from your documents?',
                text: 'Procedures, price lists, FAQs or product documents. I build such an agent with the same rules:',
                bullets: [
                    'Answers only from what is written, and says when there is no answer',
                    'Shows what each answer rests on',
                    'Budget limits and a bot gate from day one',
                    'And hands over whoever needs a person',
                ],
                extra: (
                    <>
                        And this site’s code is open:{' '}
                        {ext('https://github.com/Yanir-R/ai-portfolio-kit', 'GitHub')}
                    </>
                ),
            },
            road: {
                title: 'How I build it',
                steps: [
                    {
                        title: 'Documents first',
                        text: 'What is written, what is missing, and what customers really ask.',
                    },
                    {
                        title: 'A question bank',
                        text: 'Real questions that check each one reaches the right document.',
                    },
                    {
                        title: 'Only then the agent',
                        text: 'With a gate, limits and "behind the answer".',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.en,
            tags: [
                'React 19 · TypeScript · Vite',
                'Cloudflare Pages + Worker',
                'FastAPI · Cloud Run',
                'Gemini with fallback models',
                'Secret Manager',
                'GitHub Actions + AI review',
                'MIT',
            ],
            note: (
                <>
                    The code is open: {ext('https://github.com/Yanir-R/ai-portfolio-kit', 'GitHub')}
                </>
            ),
        },
        cta: 'Want an agent like this on your documents?',
    },
};

const agentFleet: Localized<ProjectPage> = {
    he: {
        lede: (
            <>
                יותר מ־40 סוכני AI שעובדים בשבילי ב־Grok Bot. <b>אני מדבר עם סוכן אחד</b>, הוא מעביר
                את העבודה לקבוצה הנכונה, ואני מקבל בחזרה סיכום אחד. כל דבר שיוצא החוצה מחכה לאישור
                שלי. זה הניסיון המעשי שעומד מאחורי הסוכנים שאני בונה ללקוחות.
            </>
        ),
        facts: [
            { value: '40+', label: 'סוכנים פעילים: שבע קבוצות, ועוד שבעה שמדווחים ישירות למרכז' },
            { value: '1', label: 'כתובת: אני מבקש פעם אחת, ומקבל הודעה אחת במקום עשרות' },
            { value: '0', label: 'פעולות החוצה בלי אישור שלי: לא פוסט, לא פנייה ולא שינוי בענן' },
        ],
        problem: {
            tagline: TAG.he[0],
            title: 'למה לא סוכן אחד שעושה הכול',
            intro: 'מה קורה כשיש הרבה עבודה והרבה סוכנים, ואיך המערך מסדר את זה.',
            columns: ['מה מפריע', 'במערך'],
            rows: [
                {
                    before: 'סוכן ״כל־יכול״ שטועה, ואי אפשר לדעת איפה',
                    lead: 'כל סוכן עושה דבר אחד.',
                    rest: 'קל לבדוק אותו, לתקן אותו ולהחליף אותו בלי לגעת באחרים.',
                },
                {
                    before: 'לזכור איזה סוכן עושה מה, ולרדוף אחרי כל אחד',
                    lead: 'כתובת אחת.',
                    rest: 'אני מבקש מהסוכן הראשי, והוא יודע למי להעביר.',
                },
                {
                    before: 'סוכן אחד שמנהל עשרות אחרים הופך לצוואר בקבוק',
                    lead: 'ראש לכל קבוצה.',
                    rest: 'כל תחום מנוהל על ידי מי שמכיר אותו, ותקלה בתחום אחד לא עוצרת את השאר.',
                },
                {
                    before: 'עשרות הודעות ביום מעשרות סוכנים',
                    lead: 'דיווח במדרגות:',
                    rest: 'סוכן לראש הקבוצה, ראש הקבוצה למרכז, ואליי מגיע סיכום אחד.',
                },
                {
                    before: 'סוכן שפועל החוצה בלי לשאול',
                    lead: 'טיוטות, לא פעולות.',
                    rest: 'כל מה שנשלח, מתפרסם או משתנה מחכה ללחיצה שלי.',
                },
                {
                    before: 'סוכן שנתקע בשקט, ואף אחד לא שם לב',
                    lead: 'קבוצה ששומרת על המערך עצמו,',
                    rest: 'ומדברת רק כשיש בעיה.',
                },
            ],
        },
        flow: {
            tagline: TAG.he[1],
            title: 'איך זה בנוי',
            intro: 'מהבקשה שלי ועד הסיכום שחוזר אליי. השמות כאן הם של תחומים, לא של סוכנים.',
            columns: [
                { label: 'מי מבקש', people: ['אני'] },
                {
                    label: 'כתובת אחת',
                    nodes: [
                        {
                            title: 'הסוכן הראשי',
                            text: 'מקבל בקשות בצ׳אט ובשיחה קולית, ומחליט איזו קבוצה מטפלת בהן',
                            tech: 'Grok Bot',
                        },
                    ],
                },
                {
                    label: 'שבע קבוצות',
                    nodes: [
                        {
                            title: 'ראש קבוצה, ותחתיו סוכנים שכל אחד עושה דבר אחד',
                            text: '',
                            family: [
                                { name: 'ענן ותשתית', count: 3 },
                                { name: 'אמינות המערך', count: 3 },
                                { name: 'עסק עצמאי', count: 5 },
                                { name: 'לינקדאין', count: 3 },
                                { name: 'X', count: 3 },
                                { name: 'Trinity Legal: הצעד הבא', count: 4 },
                                { name: 'סטודיו וידאו', count: 6 },
                            ],
                        },
                    ],
                },
                {
                    label: 'מה חוזר',
                    nodes: [
                        {
                            title: 'סיכום אחד',
                            text: 'כל קבוצה מדווחת למרכז, והוא שולח לי הודעה אחת',
                        },
                        {
                            title: 'מחכה לאישור שלי',
                            text: 'כל מה שיוצא החוצה נעצר כאן: פוסט, פנייה, לייק או שינוי',
                            gate: true,
                        },
                    ],
                },
            ],
            lane: {
                label: 'ישירות למרכז',
                nodes: [
                    {
                        title: 'שבעה סוכנים בלי קבוצה',
                        text: 'טיוטות תוכן, משימות, ניירת של העסק, והזיכרון של המערך. דברים שהמרכז צריך עליהם יד ישירה',
                    },
                    {
                        title: 'זיכרון שרק אחד רואה',
                        text: 'הזיכרון האישי שלי פתוח לסוכן אחד בלבד, לקריאה, והוא עונה ממנו לאחרים',
                    },
                ],
            },
            legend: 'המספר ליד כל קבוצה: כמה סוכנים עובדים תחת ראש הקבוצה.',
            techLegend: TECH_LEGEND.he,
        },
        mechanismsFirst: true,
        mechanisms: {
            tagline: '03 · התהליך',
            title: 'איך עבודה עוברת במערך',
            intro: 'שלוש דוגמאות אמיתיות, מהבקשה ועד מה שחוזר אליי.',
            items: [
                {
                    title: 'בקשה אחת, סיכום אחד',
                    text: 'כל בקשה, מכל סוג.',
                    steps: [
                        { text: 'אני מבקש בצ׳אט או בשיחה קולית' },
                        { text: 'הסוכן הראשי מעביר לקבוצה המתאימה' },
                        { text: 'ראש הקבוצה מחלק את העבודה', note: 'כל סוכן מקבל חלק אחד' },
                        { text: 'כל סוכן מדווח למעלה, מדרגה אחרי מדרגה' },
                        { text: 'אני מקבל הודעה אחת', ok: true },
                    ],
                },
                {
                    title: 'סרטון מקצה לקצה',
                    text: 'שישה בעלי מקצוע, ערב אחד.',
                    steps: [
                        { text: 'ראש הסטודיו כותב תוכנית ותסריט' },
                        { text: 'תמונות, קריינות וסאונד, לפי אותה תוכנית' },
                        { text: 'בדיקת איכות באמצע', note: 'סצנה שלא עוברת חוזרת לתיקון' },
                        { text: 'בדיקה נוספת על הסרטון המלא' },
                        { text: 'יוצא רק אחרי שאישרתי', ok: true },
                    ],
                },
                {
                    title: 'מחקר שוק ל־Trinity Legal',
                    text: 'האם משרדים קטנים נוספים באמת צריכים אותו?',
                    steps: [
                        { text: 'חוקרים את השוק', note: 'רק ממקורות ציבוריים, ומקור לכל מספר' },
                        { text: 'מאתרים משרדים שמתאימים' },
                        { text: 'כותבים טיוטות פנייה, ולא שולחים' },
                        {
                            text: '28 משרדים, 22 טיוטות',
                            note: 'אף אחת לא נשלחה בלי אישור שלי',
                            ok: true,
                        },
                    ],
                },
            ],
            day: [
                { when: 'כל בוקר', what: 'סיכום בוקר אחד' },
                { when: 'במשך היום', what: 'בקשות לפי הצורך' },
                { when: 'כל ערב', what: 'איסוף הפעילות מלינקדאין' },
                { when: 'כל 12 שעות', what: 'בדיקה של שינויים ותקינות' },
            ],
        },
        rules: {
            tagline: '04 · הרשאות',
            title: 'מה הם עושים לבד, ומה מחכה לי',
            intro: 'כל סוכן מקבל רק את הגישה שהתפקיד שלו צריך. חלק מהקבוצות רק קוראות.',
            levels: [
                {
                    tone: 'self',
                    title: 'עושים לבד',
                    pill: 'בלי אישור',
                    text: 'קריאה, איסוף והכנה.',
                    items: [
                        { text: 'לאסוף ולנתח פעילות ברשתות' },
                        { text: 'לבדוק את הענן', note: 'עלויות, תקינות והרשאות, בקריאה בלבד' },
                        { text: 'לחקור ולסכם, עם מקורות' },
                        { text: 'לכתוב טיוטות' },
                    ],
                },
                {
                    tone: 'ask',
                    title: 'מחכה לאישור שלי',
                    pill: 'עוצר ושואל',
                    text: 'כל מה שיוצא החוצה או משנה משהו.',
                    items: [
                        {
                            text: 'לייק או תגובה בשמי',
                            note: 'לפני 23 לייקים בלינקדאין, הסוכן עצר ושאל',
                        },
                        { text: 'לשלוח פנייה' },
                        { text: 'שינוי בענן', note: 'הסוכן מכין, אני מריץ' },
                        { text: 'קוד שעולה לאוויר' },
                    ],
                },
                {
                    tone: 'no',
                    title: 'לא זמין להם',
                    pill: 'חסום',
                    text: 'דברים שהמערך לא עושה.',
                    items: [
                        { text: 'לפרסם בשמי', note: 'הם כותבים, אני מפרסם בעצמי' },
                        { text: 'לקרוא את הזיכרון האישי שלי', note: 'רק סוכן אחד, בקריאה בלבד' },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.he[4],
            title: 'מה זה אומר בשבילכם',
            intro: 'המערך עצמו פרטי. מה שלמדתי ממנו נכנס לכל סוכן שאני בונה.',
            card: {
                title: 'רוצים צוות סוכנים בעסק?',
                text: 'לא כל עסק צריך 40 סוכנים. אבל אותם עקרונות עובדים גם בשלושה:',
                bullets: [
                    'כתובת אחת לבקשות, וסיכום אחד בחזרה',
                    'כל סוכן עושה דבר אחד, וקל לבדוק אותו',
                    'כל פעולה החוצה מחכה לאישור של אדם',
                ],
            },
            road: {
                title: 'ככה אני בונה',
                steps: [
                    {
                        title: 'קודם מבינים איפה הולך הזמן',
                        text: 'ואיזו עבודה באמת אפשר להעביר לסוכן.',
                    },
                    { title: 'מתחילים בסוכן אחד, עם גבולות', text: 'מה לבד, מה באישור, ומה חסום.' },
                    { title: 'מוסיפים סוכנים רק כשיש סיבה', text: 'וכל אחד מדווח למקום אחד.' },
                ],
            },
        },
        dev: {
            summary: DEV.he,
            tags: ['Grok Bot', 'סוכן ראשי, ראשי קבוצות ותתי־סוכנים', 'יומן אירועים משותף'],
            note: 'המערכת פרטית.',
        },
        cta: 'רוצים סוכנים כאלה אצלכם?',
    },
    en: {
        lede: (
            <>
                More than 40 AI agents working for me on Grok Bot. <b>I talk to one agent</b>, it
                hands the work to the right group, and I get one summary back. Anything that goes
                out to the world waits for my approval. This is the hands-on experience behind the
                agents I build for clients.
            </>
        ),
        facts: [
            {
                value: '40+',
                label: 'active agents: seven groups, plus seven that report straight to the centre',
            },
            { value: '1', label: 'address: I ask once, and get one message instead of dozens' },
            {
                value: '0',
                label: 'outward actions without my approval: no post, no outreach and no cloud change',
            },
        ],
        problem: {
            tagline: TAG.en[0],
            title: 'Why not one agent that does everything',
            intro: 'What happens when there is a lot of work and a lot of agents, and how the fleet sorts it out.',
            columns: ['What gets in the way', 'In the fleet'],
            rows: [
                {
                    before: 'An "all-purpose" agent gets something wrong, and you cannot tell where',
                    lead: 'Each agent does one thing.',
                    rest: 'Easy to check, fix and replace without touching the others.',
                },
                {
                    before: 'Remembering which agent does what, and chasing each one',
                    lead: 'One address.',
                    rest: 'I ask the head agent, and it knows where to pass it.',
                },
                {
                    before: 'One agent managing dozens becomes a bottleneck',
                    lead: 'A lead for each group.',
                    rest: 'Each field is run by one that knows it, and a fault in one field does not stop the rest.',
                },
                {
                    before: 'Dozens of messages a day from dozens of agents',
                    lead: 'Reporting in steps:',
                    rest: 'agent to group lead, group lead to the centre, and one summary reaches me.',
                },
                {
                    before: 'An agent acting in the world without asking',
                    lead: 'Drafts, not actions.',
                    rest: 'Anything sent, published or changed waits for my tap.',
                },
                {
                    before: 'An agent that quietly gets stuck, and nobody notices',
                    lead: 'A group that looks after the fleet itself,',
                    rest: 'and speaks only when there is a problem.',
                },
            ],
        },
        flow: {
            tagline: TAG.en[1],
            title: 'How it is built',
            intro: 'From my request to the summary that comes back. The names here are fields, not agents.',
            columns: [
                { label: 'Who asks', people: ['Me'] },
                {
                    label: 'One address',
                    nodes: [
                        {
                            title: 'The head agent',
                            text: 'Takes requests by chat and by voice, and decides which group handles them',
                            tech: 'Grok Bot',
                        },
                    ],
                },
                {
                    label: 'Seven groups',
                    nodes: [
                        {
                            title: 'A group lead, with agents under it that each do one thing',
                            text: '',
                            family: [
                                { name: 'Cloud and infrastructure', count: 3 },
                                { name: 'Fleet reliability', count: 3 },
                                { name: 'Freelance business', count: 5 },
                                { name: 'LinkedIn', count: 3 },
                                { name: 'X', count: 3 },
                                { name: 'Trinity Legal: the next step', count: 4 },
                                { name: 'Video studio', count: 6 },
                            ],
                        },
                    ],
                },
                {
                    label: 'What comes back',
                    nodes: [
                        {
                            title: 'One summary',
                            text: 'Each group reports to the centre, which sends me one message',
                        },
                        {
                            title: 'Waiting for my approval',
                            text: 'Anything that goes out stops here: a post, outreach, a like or a change',
                            gate: true,
                        },
                    ],
                },
            ],
            lane: {
                label: 'Straight to the centre',
                nodes: [
                    {
                        title: 'Seven agents with no group',
                        text: 'Content drafts, tasks, the business’s paperwork, and the fleet’s memory. Things the centre needs a direct hand on',
                    },
                    {
                        title: 'Memory only one can see',
                        text: 'My personal memory is open to one agent only, read-only, and it answers the others from it',
                    },
                ],
            },
            legend: 'The number next to each group: how many agents work under its lead.',
            techLegend: TECH_LEGEND.en,
        },
        mechanismsFirst: true,
        mechanisms: {
            tagline: '03 · The process',
            title: 'How work moves through the fleet',
            intro: 'Three real examples, from the request to what comes back to me.',
            items: [
                {
                    title: 'One request, one summary',
                    text: 'Any request, of any kind.',
                    steps: [
                        { text: 'I ask by chat or by voice' },
                        { text: 'The head agent passes it to the right group' },
                        {
                            text: 'The group lead splits the work',
                            note: 'each agent gets one part',
                        },
                        { text: 'Each agent reports up, step by step' },
                        { text: 'I get one message', ok: true },
                    ],
                },
                {
                    title: 'A video, end to end',
                    text: 'Six specialists, one evening.',
                    steps: [
                        { text: 'The studio lead writes a plan and a script' },
                        { text: 'Images, narration and sound, to the same plan' },
                        {
                            text: 'A quality check midway',
                            note: 'a scene that fails goes back to be fixed',
                        },
                        { text: 'Another check on the full video' },
                        { text: 'It goes out only after I approve', ok: true },
                    ],
                },
                {
                    title: 'Market research for Trinity Legal',
                    text: 'Do more small law offices really need it?',
                    steps: [
                        {
                            text: 'Research the market',
                            note: 'public sources only, with a source for every number',
                        },
                        { text: 'Find offices that fit' },
                        { text: 'Write outreach drafts, and do not send' },
                        {
                            text: '28 offices, 22 drafts',
                            note: 'none sent without my approval',
                            ok: true,
                        },
                    ],
                },
            ],
            day: [
                { when: 'Every morning', what: 'One morning summary' },
                { when: 'During the day', what: 'Requests as needed' },
                { when: 'Every evening', what: 'Collecting LinkedIn activity' },
                { when: 'Every 12 hours', what: 'A check of changes and health' },
            ],
        },
        rules: {
            tagline: '04 · Permissions',
            title: 'What they do alone, and what waits for me',
            intro: 'Each agent gets only the access its job needs. Some groups can only read.',
            levels: [
                {
                    tone: 'self',
                    title: 'Do alone',
                    pill: 'No approval',
                    text: 'Reading, collecting and preparing.',
                    items: [
                        { text: 'Collect and analyse activity on networks' },
                        {
                            text: 'Check the cloud',
                            note: 'cost, health and permissions, read-only',
                        },
                        { text: 'Research and summarise, with sources' },
                        { text: 'Write drafts' },
                    ],
                },
                {
                    tone: 'ask',
                    title: 'Waits for my approval',
                    pill: 'Stops and asks',
                    text: 'Anything that goes out or changes something.',
                    items: [
                        {
                            text: 'A like or comment in my name',
                            note: 'before 23 LinkedIn likes, the agent stopped and asked',
                        },
                        { text: 'Sending outreach' },
                        { text: 'A cloud change', note: 'the agent prepares it, I run it' },
                        { text: 'Code that goes live' },
                    ],
                },
                {
                    tone: 'no',
                    title: 'Not available to them',
                    pill: 'Blocked',
                    text: 'Things the fleet does not do.',
                    items: [
                        { text: 'Publish in my name', note: 'they write, I publish myself' },
                        { text: 'Read my personal memory', note: 'only one agent, read-only' },
                    ],
                },
            ],
        },
        fit: {
            tagline: TAG.en[4],
            title: 'What it means for you',
            intro: 'The fleet itself is private. What I learned from it goes into every agent I build.',
            card: {
                title: 'Want a team of agents in your business?',
                text: 'Not every business needs 40 agents. But the same principles work with three:',
                bullets: [
                    'One address for requests, and one summary back',
                    'Each agent does one thing, and is easy to check',
                    'Every outward action waits for a person’s approval',
                ],
            },
            road: {
                title: 'How I build',
                steps: [
                    {
                        title: 'First, see where the time goes',
                        text: 'and which work can really move to an agent.',
                    },
                    {
                        title: 'Start with one agent, with limits',
                        text: 'what it does alone, what needs approval, and what is blocked.',
                    },
                    {
                        title: 'Add agents only when there is a reason',
                        text: 'and each one reports to one place.',
                    },
                ],
            },
        },
        dev: {
            summary: DEV.en,
            tags: ['Grok Bot', 'Head agent, group leads and sub-agents', 'Shared event log'],
            note: 'The system is private.',
        },
        cta: 'Want agents like these in your business?',
    },
};

export const PROJECT_PAGES: Record<string, Localized<ProjectPage>> = {
    'agent-fleet': agentFleet,
    'ai-chat-portfolio': aiChat,
    'trinity-legal': trinityLegal,
    'trinity-agent': trinityAgent,
    personakit: personaKit,
    'review-engine': reviewEngine,
    catchup,
};
