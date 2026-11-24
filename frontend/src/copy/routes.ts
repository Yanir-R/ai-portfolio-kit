import type { Localized } from '../i18n/lang';

/*
 * Page titles, shared by the app (the tab title as a visitor navigates) and by
 * seo/prerender.mts (each route's first load). Imported relatively, without the
 * @ alias, so the build config can read it too.
 *
 * The home titles repeat HOME_SHARE in seo/facts.mts, which the preview-copy
 * check reads as plain text; `npm run check:preview-copy` asserts they agree.
 */
export type Section = 'about' | 'projects' | 'blog';

export const SITE_NAME: Localized<string> = { he: 'יניר רוט', en: 'Yanir Rot' };

export const HOME_TITLE: Localized<string> = {
    he: 'יניר רוט | סוכני AI לעסקים',
    en: 'Yanir Rot | AI agents for businesses',
};

export const SECTION_TITLE: Localized<Record<Section, string>> = {
    he: { about: 'אודות', projects: 'פרויקטים', blog: 'בלוג' },
    en: { about: 'About', projects: 'Projects', blog: 'Blog' },
};

/** "Title | Site name", in one script per language. */
export const pageTitle = (title: string, lang: keyof typeof SITE_NAME): string =>
    `${title} | ${SITE_NAME[lang]}`;
