import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { DIR } from '@/i18n/lang';
import { useLang } from '@/i18n/useLang';
import SiteNav from '@/components/site/SiteNav';
import LangOffer from '@/components/site/LangOffer';
import SiteFooter, { HireBand } from '@/components/site/SiteFooter';
import { CALL_HASH, SiteDialogsProvider, useSiteDialogs } from '@/components/site/SiteDialogs';
import { CV_HASH } from '@/components/site/CvDialog';

/*
 * The frame of every page: top bar, the page, the hiring band and the footer.
 * It also keeps the document's language and direction in step with the
 * address, and does what a single-page app otherwise forgets on navigation:
 * scroll to the #section named in a link, or to the top of a new page.
 */
const DocumentLang: React.FC = () => {
    const { lang } = useLang();
    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = DIR[lang];
        // Hebrew pages are not offered for translation (see seo/prerender.mts).
        document.documentElement.setAttribute('translate', lang === 'he' ? 'no' : 'yes');
    }, [lang]);
    return null;
};

/** Whether this page load is the visitor pressing reload. */
const isReload = () =>
    (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
        ?.type === 'reload';

const ScrollOnNavigate: React.FC = () => {
    const { pathname, search, hash } = useLocation();
    const navigate = useNavigate();
    const { openCv, openContact } = useSiteDialogs();
    // A reload starts at the top of the page. A section anchor left in the
    // address by an earlier click (the hero's "book a call" leads to #brief)
    // would otherwise send the page to that section on every refresh.
    const reloaded = useRef(isReload());

    useEffect(() => {
        if (reloaded.current) {
            reloaded.current = false;
            if (hash && hash !== CV_HASH && hash !== CALL_HASH) {
                navigate({ pathname, search }, { replace: true });
                window.scrollTo(0, 0);
                return;
            }
        }
        if (hash === CV_HASH) {
            openCv();
            return;
        }
        if (hash === CALL_HASH) {
            openContact({ kind: 'call' });
            return;
        }
        if (hash) {
            document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
            return;
        }
        window.scrollTo(0, 0);
    }, [pathname, search, hash, navigate, openCv, openContact]);

    return null;
};

const SiteLayout: React.FC = () => (
    <SiteDialogsProvider>
        <DocumentLang />
        <ScrollOnNavigate />
        <LangOffer />
        <div className="wrap">
            <SiteNav />
            <Outlet />
            <HireBand />
            <SiteFooter />
        </div>
    </SiteDialogsProvider>
);

export default SiteLayout;
