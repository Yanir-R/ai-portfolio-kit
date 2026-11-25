import React, { useState } from 'react';
import { Link } from 'react-router';
import { NAV } from '@/copy/site';
import { useLang } from '@/i18n/useLang';
import LangSwitch from '@/components/site/LangSwitch';
import { useSiteDialogs } from '@/components/site/SiteDialogs';

/*
 * The top bar: one row on every screen. On a phone the section links fold
 * behind the menu button, and the language switch and the call button stay.
 */
const SiteNav: React.FC = () => {
    const { t, to } = useLang();
    const copy = t(NAV);
    const { openCv, openContact } = useSiteDialogs();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <nav className={`nav${open ? ' open' : ''}`}>
            <Link className="logo" to={to('/')} onClick={close}>
                {copy.name}
                <small>{copy.role}</small>
            </Link>
            {copy.links.map((link) => (
                <Link key={link.href} className="l" to={to(link.href)} onClick={close}>
                    {link.label}
                </Link>
            ))}
            <a
                className="l"
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                onClick={() => {
                    close();
                    openCv();
                }}
                onKeyDown={(e) =>
                    (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openCv())
                }
            >
                {copy.cv}
            </a>
            <button
                type="button"
                className="mb"
                aria-label={copy.menu}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    aria-hidden="true"
                >
                    <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
            </button>
            <LangSwitch />
            <button type="button" className="btn sm" onClick={() => openContact({ kind: 'call' })}>
                {copy.cta}
            </button>
        </nav>
    );
};

export default SiteNav;
