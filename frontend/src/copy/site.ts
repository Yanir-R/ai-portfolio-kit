import { Localized } from '@/i18n/lang';

/*
 * Copy for the parts every page shares: the top bar, the hiring band, the
 * footer and the two dialogs. First person singular, in Yanir's voice.
 */

export interface NavCopy {
    name: string;
    role: string;
    /** Section anchors on the home page, then the blog. */
    links: { label: string; href: string }[];
    cv: string;
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
        ],
        cv: 'קורות חיים',
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
        ],
        cv: 'CV',
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

export const FOOTER: Localized<{ name: string; blog: string; linkedin: string }> = {
    he: { name: 'יניר רוט', blog: 'בלוג', linkedin: 'לינקדאין' },
    en: { name: 'Yanir Rot', blog: 'Blog', linkedin: 'LinkedIn' },
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
    loading: string;
    failed: string;
    viewLabel: string;
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
        loading: 'טוען את קורות החיים…',
        failed: 'קורות החיים לא נטענו. נסו לרענן את הדף.',
        viewLabel: 'קורות החיים',
    },
    en: {
        title: 'CV · Yanir Rot',
        close: 'Close',
        download: 'Download PDF',
        byEmail: 'Send by email',
        byWhatsapp: 'Send on WhatsApp',
        shareSubject: 'Yanir Rot, CV',
        shareText: "Yanir Rot's CV:",
        loading: 'Loading the CV…',
        failed: 'The CV did not load. Try reloading the page.',
        viewLabel: 'The CV',
    },
};

export type ContactKind = 'call' | 'mail' | 'whatsapp';

export interface ContactCopy {
    title: string;
    close: string;
    topic: string;
    pref: string;
    tabs: Record<ContactKind, string>;
    call: { text: string; open: string; frameTitle: string };
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
            frameTitle: 'היומן לקביעת שיחת אבחון',
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
            frameTitle: 'Calendar for booking a discovery call',
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
