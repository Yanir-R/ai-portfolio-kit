import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { NAV } from '@/copy/site';
import { useLang } from '@/i18n/useLang';
import { stripLangPrefix } from '@/i18n/lang';
import LangSwitch from '@/components/site/LangSwitch';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { WhatsAppIcon } from '@/components/home/HeroSection';
import { FEATURES } from '@/constants/links';
import { STACKED_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useHistoryLayer, useLayerChrome } from '@/hooks/usePhoneLayer';

/** The row of the page the visitor is on: a page by its path; home sections are never marked. */
const isHere = (href: string, path: string) =>
    !href.includes('#') && (path === href || path.startsWith(`${href}/`));

/*
 * The top bar: one row on every screen. Where the screen is narrow the section
 * links fold behind the menu button, which opens a full-screen menu: the same
 * layer as the phone chat (Back, Escape and the X close it), one row per place
 * with a line on what is there, and the ways to talk pinned at its foot.
 */
const SiteNav: React.FC = () => {
    const { t, to } = useLang();
    const copy = t(NAV);
    const { openContact } = useSiteDialogs();
    const narrow = useMediaQuery(STACKED_QUERY);
    const { open, show, close } = useHistoryLayer('menu', narrow);
    const navigate = useNavigate();
    const path = stripLangPrefix(useLocation().pathname);
    const boxRef = useRef<HTMLDivElement>(null);
    const burgerRef = useRef<HTMLButtonElement>(null);
    // A dialog asked for from the menu opens once the menu has closed.
    const pending = useRef<(() => void) | null>(null);
    useEffect(() => {
        if (open || !pending.current) return;
        const run = pending.current;
        pending.current = null;
        run();
    }, [open]);

    useLayerChrome(boxRef, open, { onEscape: close, returnRef: burgerRef });

    // A row takes the menu's place in history: Back from there returns to the
    // page the menu was opened on, not to the menu.
    const go = (href: string) => navigate(to(href), { replace: true });
    const after = (action: () => void) => {
        pending.current = action;
        close();
    };

    return (
        <nav className="nav">
            <Link className="logo" to={to('/')}>
                {copy.name}
                <small>{copy.role}</small>
            </Link>
            {copy.links.map((link) => (
                <Link key={link.href} className="l" to={to(link.href)}>
                    {link.label}
                </Link>
            ))}
            <button
                ref={burgerRef}
                type="button"
                className="mb"
                aria-label={copy.menu}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => show()}
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
            {open && (
                <div
                    className="pmenu"
                    ref={boxRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={copy.menu}
                    tabIndex={-1}
                >
                    <div className="pm-hd">
                        <a
                            className="logo"
                            href={to('/')}
                            onClick={(event) => {
                                event.preventDefault();
                                go('/');
                            }}
                        >
                            {copy.name}
                        </a>
                        <LangSwitch />
                        <button
                            type="button"
                            className="pm-x"
                            aria-label={copy.closeMenu}
                            aria-expanded
                            onClick={close}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                                aria-hidden="true"
                            >
                                <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                        </button>
                    </div>
                    <ul className="pm-rows">
                        {copy.rows.map((row) => {
                            const here = isHere(row.href, path);
                            return (
                                <li key={row.href} className={here ? 'here' : undefined}>
                                    <a
                                        href={to(row.href)}
                                        aria-current={here ? 'page' : undefined}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            go(row.href);
                                        }}
                                    >
                                        <span className="pm-tx">
                                            <b>
                                                {row.label}
                                                {here && <em>{copy.here}</em>}
                                            </b>
                                            <small>{row.note}</small>
                                        </span>
                                        <i className="pm-ch" aria-hidden="true" />
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="pm-ft">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => after(() => openContact({ kind: 'call' }))}
                        >
                            {copy.cta}
                        </button>
                        {FEATURES.whatsapp && (
                            <button
                                type="button"
                                className="btn line wa"
                                aria-label={copy.whatsapp}
                                onClick={() => after(() => openContact({ kind: 'whatsapp' }))}
                            >
                                <WhatsAppIcon />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default SiteNav;
