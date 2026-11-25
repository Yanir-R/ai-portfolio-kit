import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { HOME_TITLE, pageTitle, Section, SECTION_TITLE } from '@/copy/routes';
import { langFromPath, stripLangPrefix } from '@/i18n/lang';

/*
 * Keeps the tab title in step with client-side navigation.
 *
 * A first load already has the right title: every route is served its own
 * prerendered HTML (seo/prerender.mts). Navigating inside the app does not
 * reload the document, so without this the tab would keep the title of the
 * page the visitor landed on. Detail pages get their section's title.
 */
const titleFor = (pathname: string) => {
    const lang = langFromPath(pathname);
    const section = stripLangPrefix(pathname).split('/')[1] as Section;
    const name = SECTION_TITLE[lang][section];
    return name ? pageTitle(name, lang) : HOME_TITLE[lang];
};

const RouteMeta: React.FC = () => {
    const { pathname } = useLocation();
    const landed = useRef(true);
    useEffect(() => {
        // Leave the landing page's server-rendered title alone; it is more
        // specific than anything this component knows.
        if (landed.current) {
            landed.current = false;
            return;
        }
        document.title = titleFor(pathname);
    }, [pathname]);
    return null;
};

export default RouteMeta;
