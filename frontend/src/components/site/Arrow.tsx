import React from 'react';
import { useLang } from '@/i18n/useLang';

/*
 * A link's arrow, pointing the way the reader goes (left in Hebrew, right in
 * English) and glued to the last word with a no-break space, so a line never
 * breaks before it and leaves the arrow alone on the next line.
 */
export const ARROW = { he: '←', en: '→' } as const;
const NBSP = ' ';

export const Arrow: React.FC<{ children: React.ReactNode; out?: boolean }> = ({
    children,
    out,
}) => {
    const { lang } = useLang();
    return (
        <>
            {children}
            {NBSP}
            {out ? '↗' : ARROW[lang]}
        </>
    );
};
