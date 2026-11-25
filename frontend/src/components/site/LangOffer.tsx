import React from 'react';
import { Link, useLocation } from 'react-router';
import { LANG_OFFER } from '@/copy/site';
import { localePath, stripLangPrefix } from '@/i18n/lang';
import { useLang } from '@/i18n/useLang';
import { useLangOffer } from '@/hooks/useLangOffer';

/** A thin bar above the page offering the same page in English. Written in English, for whom it is meant. */
const LangOffer: React.FC = () => {
    const { lang } = useLang();
    const { pathname } = useLocation();
    const { show, dismiss } = useLangOffer(lang);
    if (!show) return null;
    return (
        <div className="lang-offer" lang="en" dir="ltr" role="region" aria-label={LANG_OFFER.label}>
            <span>{LANG_OFFER.text}</span>
            <Link
                className="btn sm"
                to={localePath('en', stripLangPrefix(pathname))}
                onClick={dismiss}
            >
                {LANG_OFFER.go}
            </Link>
            <button type="button" className="x" aria-label={LANG_OFFER.dismiss} onClick={dismiss}>
                ✕
            </button>
        </div>
    );
};

export default LangOffer;
