import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/*
 * Keeps the tab title in step with client-side navigation.
 *
 * A first load already has the right title: every route is served its own
 * prerendered HTML (seo/prerender.mts). Navigating inside the app does not
 * reload the document, though, so without this the tab would keep the title
 * of whichever page the visitor landed on.
 *
 * Detail pages get their section's title here. A page that knows its own
 * title once its data arrives may set document.title itself; this runs on
 * route change only, so it does not overwrite that.
 */
const HOME_TITLE = 'יניר רוט | סוכני AI לעסקים';

const titleFor = (pathname: string) => {
    const section = pathname.split('/')[1];
    const name = { about: 'About', projects: 'Projects', blog: 'Blog' }[section];
    return name ? `${name} | Yanir Rot` : HOME_TITLE;
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
