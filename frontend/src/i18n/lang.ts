/*
 * The two languages of the site and how each is addressed.
 *
 * Hebrew is the default and lives at the root; English is a full twin under
 * /en. Nothing redirects between them: the visitor's choice is the address,
 * and the switch on every page links to the same page in the other language.
 */
export type Lang = 'he' | 'en';

export const LANGS: readonly Lang[] = ['he', 'en'];
export const DEFAULT_LANG: Lang = 'he';

export const DIR: Record<Lang, 'rtl' | 'ltr'> = { he: 'rtl', en: 'ltr' };

/** The path prefix of each language; the default language has none. */
export const LANG_PREFIX: Record<Lang, string> = { he: '', en: '/en' };

/** One string, or one object of copy, in both languages. */
export type Localized<T> = Record<Lang, T>;

export const langFromPath = (pathname: string): Lang =>
    pathname === LANG_PREFIX.en || pathname.startsWith(`${LANG_PREFIX.en}/`) ? 'en' : 'he';

/** The language-neutral part of a path: "/en/blog/x" and "/blog/x" both give "/blog/x". */
export const stripLangPrefix = (pathname: string): string => {
    if (langFromPath(pathname) !== 'en') return pathname || '/';
    return pathname.slice(LANG_PREFIX.en.length) || '/';
};

/** A site path in one language. `path` is language-neutral and may carry a hash. */
export const localePath = (lang: Lang, path: string): string => {
    const prefix = LANG_PREFIX[lang];
    if (!prefix) return path;
    if (path === '/') return prefix;
    if (path.startsWith('/#')) return `${prefix}${path.slice(1)}`;
    return `${prefix}${path}`;
};
