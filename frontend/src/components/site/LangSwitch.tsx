import React from 'react';
import { Link, useLocation } from 'react-router';
import { LANG_LABEL, LANG_NAME, NAV } from '@/copy/site';
import { LANGS, localePath, stripLangPrefix } from '@/i18n/lang';
import { useLang } from '@/i18n/useLang';

/** עב / EN: the same page in the other language. Never a redirect, always a link. */
const LangSwitch: React.FC = () => {
    const { lang, t } = useLang();
    const { pathname } = useLocation();
    const neutral = stripLangPrefix(pathname);

    return (
        <span className="lang" role="group" aria-label={t(NAV).language}>
            {LANGS.map((other) =>
                other === lang ? (
                    <b key={other} aria-current="true">
                        {LANG_LABEL[other]}
                    </b>
                ) : (
                    <Link
                        key={other}
                        to={localePath(other, neutral)}
                        lang={other}
                        hrefLang={other}
                        aria-label={LANG_NAME[other]}
                    >
                        {LANG_LABEL[other]}
                    </Link>
                )
            )}
        </span>
    );
};

export default LangSwitch;
