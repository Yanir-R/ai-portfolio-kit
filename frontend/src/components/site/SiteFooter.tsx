import React from 'react';
import Avatar from '@/components/site/Avatar';
import { Link } from 'react-router';
import { FOOTER, HIRE } from '@/copy/site';
import { LINKS, SITE_HOST } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import { useSiteDialogs } from '@/components/site/SiteDialogs';

/** The hiring band: for a recruiter who reached the bottom of any page. */
export const HireBand: React.FC = () => {
    const { t } = useLang();
    const copy = t(HIRE);
    const { openCv } = useSiteDialogs();

    return (
        <div className="rec" id="hire">
            <div className="rec-who">
                <Avatar size="sm" />
                <div>
                    <b>{copy.title}</b>
                    <span>{copy.text}</span>
                </div>
            </div>
            <div className="links">
                <button type="button" className="btn sm" aria-haspopup="dialog" onClick={openCv}>
                    {copy.cv}
                </button>
                <a className="btn sm line" href={LINKS.linkedin} target="_blank" rel="noopener">
                    {copy.linkedin} ↗
                </a>
                <a className="btn sm line" href={LINKS.github} target="_blank" rel="noopener">
                    GitHub ↗
                </a>
            </div>
        </div>
    );
};

const SiteFooter: React.FC = () => {
    const { t, to } = useLang();
    const copy = t(FOOTER);

    return (
        <footer>
            <span>
                {copy.name} · {SITE_HOST} · <Link to={to('/blog')}>{copy.blog}</Link> ·{' '}
                <a href={LINKS.linkedin} target="_blank" rel="noopener">
                    {copy.linkedin}
                </a>{' '}
                ·{' '}
                <a href={LINKS.github} target="_blank" rel="noopener">
                    GitHub
                </a>
            </span>
        </footer>
    );
};

export default SiteFooter;
