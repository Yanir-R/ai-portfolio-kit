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

export const FOOTER: Localized<{ name: string; blog: string; about: string }> = {
    he: { name: 'יניר רוט', blog: 'בלוג', about: 'אודות' },
    en: { name: 'Yanir Rot', blog: 'Blog', about: 'About' },
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
    whatsapp: { text: string; fine: string; open: string; first: (topic?: string) => string };
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
        title: 'לדבר עם יניר',
        close: 'סגירה',
        topic: 'הנושא:',
        pref: 'מסלול מועדף:',
        tabs: { call: 'שיחת אבחון', mail: 'מייל', whatsapp: 'וואטסאפ' },
        call: {
            text: '20 עד 30 דקות בשיחת וידאו. בוחרים שעה, והנושא מצורף להזמנה כדי שלא תתחילו מאפס.',
            open: 'פתיחת היומן בחלון חדש ↗',
        },
        booking: {
            steps: ['יום ושעה', 'פרטים', 'אישור'],
            stepsLabel: 'שלבי קביעת השיחה',
            meta: '30 דק׳ · וידאו · שעון ישראל',
            loading: 'טוען את השעות הפנויות…',
            failed: 'היומן לא נטען כרגע. אפשר לקבוע דרך הקישור למטה.',
            none: 'אין שעות פנויות בחודש הזה. נסו את החודש הבא.',
            prevMonth: 'החודש הקודם',
            nextMonth: 'החודש הבא',
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
            email: 'המייל שלכם',
            emailPlaceholder: 'name@company.co.il',
            message: 'ההודעה',
            messagePlaceholder: 'במשפט או שניים: מה אתם צריכים',
            send: 'שלחו ליניר',
            sending: 'שולח…',
            sent: 'נשלח ✓ ההודעה אצל יניר, והוא עונה ממנה למייל שלכם.',
            failed: 'ההודעה לא נשלחה. בדקו את המייל ונסו שוב.',
            fine: 'ההודעה מגיעה לתיבה של יניר, והוא עונה ממנה למייל שלכם. אפשר גם פשוט לכתוב את המייל בצ׳אט.',
        },
        whatsapp: {
            text: 'הודעה במילים שלכם, ויניר חוזר אליכם אישית.',
            fine: 'המענה הראשון הוא הודעה אוטומטית עם קישור לקביעת שיחה.',
            open: 'פתיחת וואטסאפ ↗',
            first: (topic) => (topic ? `היי יניר, לגבי ${topic}: ` : 'היי יניר, '),
        },
    },
    en: {
        title: 'Talk to Yanir',
        close: 'Close',
        topic: 'Subject:',
        pref: 'Preferred route:',
        tabs: { call: 'Discovery call', mail: 'Email', whatsapp: 'WhatsApp' },
        call: {
            text: '20 to 30 minutes on a video call. Pick a time, and the subject goes with the invite so you do not start from scratch.',
            open: 'Open the calendar in a new tab ↗',
        },
        booking: {
            steps: ['Day and time', 'Details', 'Confirmed'],
            stepsLabel: 'Booking steps',
            meta: '30 min · video · Israel time',
            loading: 'Loading the free times…',
            failed: 'The calendar did not load just now. You can book through the link below.',
            none: 'No free times this month. Try the next one.',
            prevMonth: 'Previous month',
            nextMonth: 'Next month',
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
            email: 'Your email',
            emailPlaceholder: 'name@company.com',
            message: 'The message',
            messagePlaceholder: 'In a sentence or two: what you need',
            send: 'Send to Yanir',
            sending: 'Sending…',
            sent: 'Sent ✓ The message is in Yanir’s inbox, and he replies from it to your email.',
            failed: 'The message did not go out. Check the address and try again.',
            fine: 'The message reaches Yanir’s inbox, and he replies from it to your email. You can also just type your email in the chat.',
        },
        whatsapp: {
            text: 'A message in your own words, and Yanir gets back to you personally.',
            fine: 'The first reply is an automatic note with a link to book a call.',
            open: 'Open WhatsApp ↗',
            first: (topic) => (topic ? `Hi Yanir, about ${topic}: ` : 'Hi Yanir, '),
        },
    },
};
