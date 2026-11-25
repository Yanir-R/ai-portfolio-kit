import { Localized } from '@/i18n/lang';

/* Copy for the share box at the end of a post, an article or a project page. */

export type ShareKind = 'post' | 'article' | 'project';

export interface ShareCopy {
    title: Record<ShareKind, string>;
    lead: Record<ShareKind, string>;
    top: string; // the small link beside a post's byline
    native: string;
    whatsapp: string;
    linkedin: string;
    facebook: string;
    email: string;
    copy: string;
    copied: string;
}

export const SHARE: Localized<ShareCopy> = {
    he: {
        title: { post: 'שתפו את הפוסט', article: 'שתפו את המאמר', project: 'שתפו את הפרויקט' },
        lead: {
            post: 'הקישור נפתח עם הכרטיס של הפוסט',
            article: 'הקישור נפתח עם הכרטיס של המאמר',
            project: 'הקישור נפתח עם הכרטיס של הפרויקט',
        },
        top: 'שיתוף',
        native: 'שיתוף…',
        whatsapp: 'וואטסאפ',
        linkedin: 'לינקדאין',
        facebook: 'פייסבוק',
        email: 'מייל',
        copy: 'העתקת קישור',
        copied: 'הקישור הועתק',
    },
    en: {
        title: {
            post: 'Share this post',
            article: 'Share this article',
            project: 'Share this project',
        },
        lead: {
            post: 'The link opens with the post’s own card',
            article: 'The link opens with the article’s own card',
            project: 'The link opens with the project’s own card',
        },
        top: 'Share',
        native: 'Share…',
        whatsapp: 'WhatsApp',
        linkedin: 'LinkedIn',
        facebook: 'Facebook',
        email: 'Email',
        copy: 'Copy link',
        copied: 'Link copied',
    },
};
