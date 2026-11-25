import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { DIR } from '@/i18n/lang';
import { useLang } from '@/i18n/useLang';
import SiteNav from '@/components/site/SiteNav';
import LangOffer from '@/components/site/LangOffer';
import SiteFooter, { HireBand } from '@/components/site/SiteFooter';
import { SiteDialogsProvider, useSiteDialogs } from '@/components/site/SiteDialogs';
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
    }, [lang]);
    return null;
};

const ScrollOnNavigate: React.FC = () => {
    const { pathname, hash } = useLocation();
    const { openCv } = useSiteDialogs();

    useEffect(() => {
        if (hash === CV_HASH) {
            openCv();
            return;
        }
        if (hash) {
            document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
            return;
        }
        window.scrollTo(0, 0);
    }, [pathname, hash, openCv]);

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
