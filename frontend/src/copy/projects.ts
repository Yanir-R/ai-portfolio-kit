import { Localized } from '@/i18n/lang';
import { Project } from '@/types/project';

/*
 * Copy for the projects list, a project's page and the about page. The
 * write-ups themselves come from the backend, in Hebrew where they have a
 * Hebrew twin.
 */
export interface ProjectsCopy {
    tagline: string;
    title: string;
    em: string;
    lead: string;
    status: Record<Project['status'], string>;
    /** A project's category in this language; the documents name it in English. */
    category: Record<string, string>;
    read: string;
    back: string;
    loading: string;
    failed: { title: string; text: string; retry: string };
    missing: { tagline: string; title: string; text: string };
    stack: string;
    live: string;
    source: string;
    privateCode: string;
    cta: { title: string; button: string; ask: string; prompt: (title: string) => string };
    about: {
        tagline: string;
        title: string;
        em: string;
        cv: string;
        talk: string;
        failed: { title: string; text: string; retry: string };
    };
}

export const PROJECTS: Localized<ProjectsCopy> = {
    he: {
        tagline: 'פרויקטים',
        title: 'מה בניתי,',
        em: 'ואיפה זה עובד.',
        lead: 'כל תיאור כאן הוא גם חלק ממה שהסוכן בעמוד הבית עונה ממנו, אז אפשר לקרוא כאן או לשאול שם.',
        status: {
            production: 'רץ בייצור',
            completed: 'הושלם',
            'in-development': 'בפיתוח',
            planning: 'בתכנון',
            paused: 'מושהה',
        },
        category: {
            'AI Agents & Automation': 'סוכני AI ואוטומציה',
            'Full-Stack Development': 'פיתוח פול סטאק',
            'Full-Stack Development & Client Work': 'פיתוח פול סטאק ללקוח',
            'Developer Tools & Open Source': 'כלי פיתוח וקוד פתוח',
            'AI Memory & Open Source': 'זיכרון AI וקוד פתוח',
            'AI/ML & Gaming': 'AI וגיימינג',
            'AI Agents & Code Review': 'סוכני AI וסקירת קוד',
        },
        read: 'לקריאה',
        back: 'לכל הפרויקטים',
        loading: 'טוען…',
        failed: {
            title: 'הרשימה לא נטענה.',
            text: 'השרת לא ענה. נסו שוב, או שאלו את הסוכן בעמוד הבית: הוא עונה מאותם תיאורים.',
            retry: 'נסו שוב',
        },
        missing: {
            tagline: 'לא נמצא',
            title: 'אין כאן פרויקט.',
            text: 'הפרויקט לא קיים, או שהכתובת שלו השתנתה.',
        },
        stack: 'טכנולוגיות',
        live: 'לאתר ↗',
        source: 'לקוד ↗',
        privateCode: 'הקוד פרטי',
        cta: {
            title: 'רוצים משהו כזה אצלכם?',
            button: 'קבעו שיחת אבחון, 20 דקות',
            ask: 'שאלו את הסוכן',
            prompt: (title) => `ספר לי על ${title}: מה בנית ומה היה קשה?`,
        },
        about: {
            tagline: 'אודות',
            title: 'יניר רוט.',
            em: 'מפתח AI.',
            cv: 'קורות חיים',
            talk: 'בואו נדבר',
            failed: {
                title: 'העמוד לא נטען.',
                text: 'השרת לא ענה. נסו שוב, או שאלו את הסוכן בעמוד הבית: הוא עונה מאותו מסמך.',
                retry: 'נסו שוב',
            },
        },
    },
    en: {
        tagline: 'Projects',
        title: 'What I built,',
        em: 'and where it works.',
        lead: 'Every write-up here is also part of what the agent on the home page answers from, so you can read it here or ask about it there.',
        status: {
            production: 'In production',
            completed: 'Completed',
            'in-development': 'In development',
            planning: 'Planning',
            paused: 'Paused',
        },
        category: {},
        read: 'Read',
        back: 'All projects',
        loading: 'Loading…',
        failed: {
            title: "The list didn't load.",
            text: "The server didn't answer. Try again, or ask the agent on the home page: it answers from the same write-ups.",
            retry: 'Try again',
        },
        missing: {
            tagline: 'Not found',
            title: 'No project here.',
            text: 'That project does not exist, or its address has changed.',
        },
        stack: 'Stack',
        live: 'Live site ↗',
        source: 'Source ↗',
        privateCode: 'Private code',
        cta: {
            title: 'Want something like this?',
            button: 'Book a discovery call, 20 minutes',
            ask: 'Ask the agent',
            prompt: (title) => `Tell me about ${title}: what did you build and what was hard?`,
        },
        about: {
            tagline: 'About',
            title: 'Yanir Rot.',
            em: 'AI developer.',
            cv: 'CV',
            talk: "Let's talk",
            failed: {
                title: "This page didn't load.",
                text: "The server didn't answer. Try again, or ask the agent on the home page: it answers from the same document.",
                retry: 'Try again',
            },
        },
    },
};
