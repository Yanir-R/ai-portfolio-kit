import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { DIR } from '@/i18n/lang';
import { useLang } from '@/i18n/useLang';
import SiteNav from '@/components/site/SiteNav';
import LangOffer from '@/components/site/LangOffer';
import SiteFooter, { HireBand } from '@/components/site/SiteFooter';
import { CALL_HASH, SiteDialogsProvider, useSiteDialogs } from '@/components/site/SiteDialogs';
import { CV_HASH } from '@/components/site/CvDialog';
import { ErrorBoundary } from '@/components/site/ErrorBoundary';

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
    }, [lang]);
    return null;
};

const ScrollOnNavigate: React.FC = () => {
    const { pathname, hash } = useLocation();
    const { openCv, openContact } = useSiteDialogs();

    useEffect(() => {
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
    }, [pathname, hash, openCv, openContact]);

    return null;
};

/** The page, guarded: a page that throws shows the crash screen inside the frame. */
const GuardedPage: React.FC = () => {
    const { pathname } = useLocation();
    return (
        <ErrorBoundary key={pathname}>
            <Outlet />
        </ErrorBoundary>
    );
};

const SiteLayout: React.FC = () => (
    <SiteDialogsProvider>
        <DocumentLang />
        <ScrollOnNavigate />
        <LangOffer />
        <div className="wrap">
            <SiteNav />
            <GuardedPage />
            <HireBand />
            <SiteFooter />
        </div>
    </SiteDialogsProvider>
);

export default SiteLayout;
