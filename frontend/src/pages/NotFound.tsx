import React from 'react';
import { Link } from 'react-router';
import { ERRORS } from '@/copy/errors';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useLang } from '@/i18n/useLang';

/*
 * Any address the router does not know. On a first load Cloudflare Pages has
 * already answered with 404.html and a 404 status (see seo/prerender.mts);
 * this is the same page drawn by the app, inside the site's frame, so the
 * visitor keeps the top bar and a way on.
 */
const NotFound: React.FC = () => {
    const { t, to } = useLang();
    const copy = t(ERRORS).notFound;
    const { openContact } = useSiteDialogs();
    useNoIndex(true, copy.docTitle);

    return (
        <div className="w-hero err-page">
            <div>
                <span className="tagline">{copy.tagline}</span>
                <h1>{copy.title}</h1>
            </div>
            <div>
                <p>{copy.text}</p>
                <nav className="err-links" aria-label={copy.tagline}>
                    <Link className="btn" to={to('/')}>
                        {copy.home}
                    </Link>
                    <Link to={to('/blog')}>{copy.blog}</Link>
                    <Link to={to('/projects')}>{copy.projects}</Link>
                    <button type="button" onClick={() => openContact({ kind: 'call' })}>
                        {copy.talk}
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default NotFound;
