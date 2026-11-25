import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { DIR, Lang, langFromPath, localePath, Localized } from '@/i18n/lang';

export interface LangContext {
    lang: Lang;
    dir: 'rtl' | 'ltr';
    /** A language-neutral site path, addressed in the current language. */
    to: (path: string) => string;
    /** Picks the current language's side of a pair. */
    t: <T>(copy: Localized<T>) => T;
}

/** The language of the page being shown, read from its address. */
export const useLang = (): LangContext => {
    const { pathname } = useLocation();
    const lang = langFromPath(pathname);
    return useMemo(
        () => ({
            lang,
            dir: DIR[lang],
            to: (path: string) => localePath(lang, path),
            t: <T>(copy: Localized<T>) => copy[lang],
        }),
        [lang]
    );
};
