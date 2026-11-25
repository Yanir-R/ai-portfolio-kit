import { Localized } from '@/i18n/lang';

/*
 * Copy for the parts every page shares: the top bar, the hiring band, the
 * footer and the two dialogs. First person singular, in Yanir's voice.
 */

export interface NavCopy {
    name: string;
    role: string;
    /** Section anchors on the home page, then the blog and the about page. */
    links: { label: string; href: string }[];
    menu: string;
    /** The phone's full-screen menu: one row per place, with a line on what is there. */
    rows: { label: string; note: string; href: string }[];
    closeMenu: string;
    /** On the row of the page the visitor is on. */
    here: string;
    whatsapp: string;
    language: string;
    cta: string;
}

export const NAV: Localized<NavCopy> = {
    he: {
        name: 'יניר רוט',
        role: 'סוכני AI לעסקים',
        links: [
            { label: 'מה אני בונה', href: '/#build' },
            { label: 'מה כבר רץ', href: '/#proof' },
            { label: 'איך עובדים', href: '/#how' },
            { label: 'בלוג', href: '/blog' },
            { label: 'אודות', href: '/about' },
        ],
        menu: 'תפריט',
        rows: [
            { label: 'מה אני בונה', note: 'סוכני AI ומערכות CRM שמותאמות לעסק', href: '/#build' },
            { label: 'מה כבר רץ', note: 'מערכות שעובדות היום אצל לקוחות ואצלי', href: '/#proof' },
            { label: 'פרויקטים', note: 'כל הפרויקטים, אחד אחד', href: '/projects' },
            { label: 'איך עובדים', note: 'משיחת אבחון ועד מערכת שרצה', href: '/#how' },
            { label: 'בלוג', note: 'פוסטים ומאמרים שכתבתי', href: '/blog' },
            { label: 'אודות', note: 'מי אני, וקורות החיים שלי', href: '/about' },
        ],
        closeMenu: 'סגירת התפריט',
        here: 'אתם כאן',
        whatsapp: 'וואטסאפ',
        language: 'שפה',
        cta: 'קבעו שיחת אבחון',
    },
    en: {
        name: 'Yanir Rot',
        role: 'AI agents for business',
        links: [
            { label: 'What I build', href: '/#build' },
            { label: "What's running", href: '/#proof' },
            { label: 'How I work', href: '/#how' },
            { label: 'Blog', href: '/blog' },
            { label: 'About', href: '/about' },
        ],
        menu: 'Menu',
        rows: [
            {
                label: 'What I build',
                note: 'AI agents and CRM systems fitted to the business',
                href: '/#build',
            },
            {
                label: "What's running",
                note: 'Systems working today, for clients and for me',
                href: '/#proof',
            },
            { label: 'Projects', note: 'Every project, one by one', href: '/projects' },
            {
                label: 'How I work',
                note: 'From a diagnostic call to a running system',
                href: '/#how',
            },
            { label: 'Blog', note: 'Posts and articles I wrote', href: '/blog' },
            { label: 'About', note: 'Who I am, and my resume', href: '/about' },
        ],
        closeMenu: 'Close the menu',
        here: 'You are here',
        whatsapp: 'WhatsApp',
        language: 'Language',
        cta: 'Book a call',
    },
};

/** How each language names itself on the switch. */
export const LANG_LABEL: Localized<string> = { he: 'עב', en: 'EN' };
export const LANG_NAME: Localized<string> = { he: 'עברית', en: 'English' };

/** Shown on Hebrew pages to visitors from outside Israel, so it is English only. */
export const LANG_OFFER = {
    label: 'Language',
    text: 'This site is also in English.',
    go: 'View in English',
    dismiss: 'Stay in Hebrew',
} as const;

export const HIRE: Localized<{ title: string; text: string; cv: string; linkedin: string }> = {
    he: {
        title: 'מחפשים מפתח לצוות?',
        text: 'אני פתוח גם למשרה מלאה או לחוזה. קורות החיים, הקוד והרקע המקצועי נמצאים כאן.',
        cv: 'קורות חיים',
        linkedin: 'לינקדאין',
    },
    en: {
        title: 'Looking for a developer for your team?',
        text: "I'm also open to a full-time role or a contract. My CV, code and professional background are here.",
        cv: 'CV',
        linkedin: 'LinkedIn',
    },
};

export const FOOTER: Localized<{ name: string; projects: string; blog: string; about: string }> = {
    he: { name: 'יניר רוט', projects: 'פרויקטים', blog: 'בלוג', about: 'אודות' },
    en: { name: 'Yanir Rot', projects: 'Projects', blog: 'Blog', about: 'About' },
};

export interface CvCopy {
    title: string;
    close: string;
    download: string;
    byEmail: string;
    byWhatsapp: string;
    /** Subject and body of the share message; the link is appended. */
    shareSubject: string;
    shareText: string;
    viewLabel: string;
    /** The switch between the CV's English and Hebrew versions. */
    docLang: string;
}

export const CV: Localized<CvCopy> = {
    he: {
        title: 'קורות חיים · יניר רוט',
        close: 'סגירה',
        download: 'הורדת PDF',
        byEmail: 'שליחה במייל',
        byWhatsapp: 'שליחה בוואטסאפ',
        shareSubject: 'יניר רוט, קורות חיים',
        shareText: 'קורות החיים של יניר רוט:',
        viewLabel: 'קורות החיים',
        docLang: 'שפת קורות החיים',
    },
    en: {
        title: 'CV · Yanir Rot',
        close: 'Close',
        download: 'Download PDF',
        byEmail: 'Send by email',
        byWhatsapp: 'Send on WhatsApp',
        shareSubject: 'Yanir Rot, CV',
        shareText: "Yanir Rot's CV:",
        viewLabel: 'The CV',
        docLang: 'CV language',
    },
};

export type ContactKind = 'call' | 'mail' | 'whatsapp';

export interface ContactCopy {
    title: string;
    close: string;
    topic: string;
    pref: string;
    tabs: Record<ContactKind, string>;
    call: { text: string; open: string };
    booking: BookingCopy;
    mail: {
        text: string;
        email: string;
        emailPlaceholder: string;
        message: string;
        messagePlaceholder: string;
        send: string;
        sending: string;
        sent: string;
        failed: string;
        fine: string;
    };
    whatsapp: {
        text: string;
        steps: [string, string, string];
        scan: string;
        open: string;
        /** Under the button on a phone: what tapping it does. */
        note: string;
        first: (topic?: string) => string;
    };
}

/** The booking steps inside the "discovery call" tab. */
export interface BookingCopy {
    steps: [string, string, string];
    stepsLabel: string;
    meta: string;
    loading: string;
    failed: string;
    none: string;
    prevMonth: string;
    nextMonth: string;
    pickDay: string;
    timesNote: string;
    otherDay: string;
    change: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    about: string;
    submit: string;
    sending: string;
    back: string;
    fine: string;
    taken: string;
    /** The bot check refused the booking: a fresh check usually passes. */
    unverified: string;
    /** Rate limited; `seconds` is the server's Retry-After when it sent one. */
    busy: (seconds?: number) => string;
    /** The details were refused: almost always the email address. */
    invalid: string;
    bookFailed: string;
    doneTitle: string;
    doneText: string;
    when: string;
    time: string;
    where: string;
    whereValue: string;
    withWhom: string;
    withValue: string;
    subject: string;
    addToCalendar: string;
    calGoogle: string;
    calFile: string;
    /** Between two times; a dash reads in the wrong order inside Hebrew. */
    until: string;
    doneFine: string;
    eventTitle: string;
    weekdays: [string, string, string, string, string, string, string];
}

export const CONTACT: Localized<ContactCopy> = {
    he: {
        title: 'בואו נדבר',
        close: 'סגירה',
        topic: 'הנושא:',
        pref: 'מסלול מועדף:',
        tabs: { call: 'שיחת אבחון', mail: 'מייל', whatsapp: 'וואטסאפ' },
        call: {
            text: '20 עד 30 דקות בשיחת וידאו. בוחרים שעה, והנושא מצורף להזמנה כדי שלא תתחילו מאפס.',
            open: 'פתיחת היומן בחלון חדש ↗︎',
        },
        booking: {
            steps: ['יום ושעה', 'פרטים', 'אישור'],
            stepsLabel: 'שלבי קביעת השיחה',
            meta: '30 דק׳ · וידאו · שעון ישראל',
            loading: 'טוען את השעות הפנויות…',
            failed: 'היומן לא נטען כרגע. אפשר לקבוע דרך הקישור למטה.',
            none: 'אין זמנים פנויים בשבועות האלה.',
            prevMonth: 'השבועות הקודמים',
            nextMonth: 'השבועות הבאים',
            pickDay: 'בחרו יום ביומן, והשעות הפנויות יופיעו כאן.',
            timesNote: 'שעון ישראל. לחיצה על שעה ממשיכה לפרטים.',
            otherDay: 'יום אחר',
            change: 'שינוי',
            name: 'שם מלא',
            namePlaceholder: 'השם שלכם',
            email: 'מייל',
            emailPlaceholder: 'name@company.co.il',
            about: 'על מה נדבר?',
            submit: 'קביעת השיחה',
            sending: 'קובע…',
            back: 'חזרה',
            fine: 'האישור והקישור לשיחה נשלחים למייל שכתבתם.',
            taken: 'השעה הזאת נתפסה הרגע. בחרו שעה אחרת.',
            unverified: 'לא הצלחנו לאשר שהבקשה הגיעה מדפדפן. לחצו שוב על קביעת השיחה.',
            busy: (seconds) =>
                seconds && seconds < 3600
                    ? `יותר מדי ניסיונות ברצף. נסו שוב בעוד ${Math.ceil(seconds / 60) === 1 ? 'דקה' : `${Math.ceil(seconds / 60)} דקות`}.`
                    : 'יותר מדי ניסיונות ברצף. נסו שוב מאוחר יותר, או קבעו דרך הקישור למטה.',
            invalid: 'משהו בפרטים לא עבר. בדקו את השם ואת כתובת המייל.',
            bookFailed: 'השיחה לא נקבעה. נסו שוב, או קבעו דרך הקישור למטה.',
            doneTitle: 'השיחה נקבעה',
            doneText: 'אישור עם הקישור לשיחה נשלח למייל שלכם.',
            when: 'יום',
            time: 'שעה',
            where: 'איפה',
            whereValue: 'שיחת וידאו, הקישור במייל',
            withWhom: 'עם מי',
            withValue: 'יניר רוט',
            subject: 'נושא',
            addToCalendar: 'הוספה ליומן',
            calGoogle: 'Google Calendar',
            calFile: 'Apple / Outlook',
            until: 'עד',
            doneFine: 'צריך לשנות? במייל האישור יש קישור לשינוי מועד ולביטול.',
            eventTitle: 'שיחת אבחון עם יניר רוט',
            weekdays: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
        },
        mail: {
            text: 'כמה מילים על מה שאתם צריכים מספיקות כדי להתחיל.',
            email: 'המייל שלכם',
            emailPlaceholder: 'name@company.co.il',
            message: 'ההודעה',
            messagePlaceholder: 'במשפט או שניים: מה אתם צריכים',
            send: 'שלחו לי',
            sending: 'שולח…',
            sent: 'נשלח ✓ ההודעה אצלי, ואני עונה ממנה למייל שלכם.',
            failed: 'ההודעה לא נשלחה. בדקו את המייל ונסו שוב.',
            fine: 'ההודעה מגיעה ישר אליי, ואני עונה ממנה למייל שלכם. אפשר גם פשוט לכתוב את המייל בצ׳אט.',
        },
        whatsapp: {
            text: 'הודעה במילים שלכם, ואני חוזר אליכם.',
            steps: [
                'כותבים לי במילים שלכם.',
                'מיד מגיעה הודעה אוטומטית עם קישור לשיחה.',
                'אני חוזר אליכם בוואטסאפ.',
            ],
            scan: 'סריקה פותחת את השיחה בטלפון',
            open: 'פתיחת וואטסאפ',
            note: 'נפתח באפליקציית וואטסאפ, עם הודעה אליי.',
            first: (topic) => (topic ? `היי יניר, לגבי ${topic}: ` : 'היי יניר, '),
        },
    },
    en: {
        title: "Let's talk",
        close: 'Close',
        topic: 'Subject:',
        pref: 'Preferred route:',
        tabs: { call: 'Discovery call', mail: 'Email', whatsapp: 'WhatsApp' },
        call: {
            text: '20 to 30 minutes on a video call. Pick a time, and the subject goes with the invite so you do not start from scratch.',
            open: 'Open the calendar in a new tab ↗︎',
        },
        booking: {
            steps: ['Day and time', 'Details', 'Confirmed'],
            stepsLabel: 'Booking steps',
            meta: '30 min · video · Israel time',
            loading: 'Loading the free times…',
            failed: 'The calendar did not load just now. You can book through the link below.',
            none: 'No free times in these weeks.',
            prevMonth: 'Earlier weeks',
            nextMonth: 'Later weeks',
            pickDay: 'Pick a day on the calendar and the free times show here.',
            timesNote: 'Israel time. Pick a time to continue.',
            otherDay: 'Another day',
            change: 'Change',
            name: 'Full name',
            namePlaceholder: 'Your name',
            email: 'Email',
            emailPlaceholder: 'name@company.com',
            about: 'What should we talk about?',
            submit: 'Book the call',
            sending: 'Booking…',
            back: 'Back',
            fine: 'The confirmation and the call link go to the email you entered.',
            taken: 'That time was just taken. Pick another one.',
            unverified: "Couldn't confirm this came from a browser. Press Book the call again.",
            busy: (seconds) =>
                seconds && seconds < 3600
                    ? `Too many tries in a row. Try again in ${Math.ceil(seconds / 60) === 1 ? 'a minute' : `${Math.ceil(seconds / 60)} minutes`}.`
                    : 'Too many tries in a row. Try again later, or book through the link below.',
            invalid: 'Something in the details was not accepted. Check your name and email.',
            bookFailed: 'The call was not booked. Try again, or book through the link below.',
            doneTitle: 'The call is booked',
            doneText: 'A confirmation with the call link is on its way to your email.',
            when: 'Day',
            time: 'Time',
            where: 'Where',
            whereValue: 'Video call, link in the email',
            withWhom: 'With',
            withValue: 'Yanir Rot',
            subject: 'Subject',
            addToCalendar: 'Add to calendar',
            calGoogle: 'Google Calendar',
            calFile: 'Apple / Outlook',
            until: 'to',
            doneFine:
                'Need to change it? The confirmation email has links to reschedule or cancel.',
            eventTitle: 'Discovery call with Yanir Rot',
            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        },
        mail: {
            text: 'A few words on what you need are enough to start.',
            email: 'Your email',
            emailPlaceholder: 'name@company.com',
            message: 'The message',
            messagePlaceholder: 'In a sentence or two: what you need',
            send: 'Send it to me',
            sending: 'Sending…',
            sent: 'Sent ✓ I have your message, and I reply from it to your email.',
            failed: 'The message did not go out. Check the address and try again.',
            fine: 'The message comes straight to me, and I reply from it to your email. You can also just type your email in the chat.',
        },
        whatsapp: {
            text: 'A message in your own words, and I get back to you.',
            steps: [
                'Write to me in your own words.',
                'An automatic note arrives at once, with a booking link.',
                'I get back to you on WhatsApp.',
            ],
            scan: 'Scan to open the chat on your phone',
            open: 'Open WhatsApp',
            note: 'Opens in the WhatsApp app, with a message to me.',
            first: (topic) => (topic ? `Hi Yanir, about ${topic}: ` : 'Hi Yanir, '),
        },
    },
};
