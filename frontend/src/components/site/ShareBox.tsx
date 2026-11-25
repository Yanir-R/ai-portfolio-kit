import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { SHARE, ShareKind } from '@/copy/share';
import { PHONE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useLang } from '@/i18n/useLang';

/*
 * "Share this post": the end of a post, an article or a project page.
 *
 * Every route shares the page's own address on this site, never the original
 * on LinkedIn, so the link previews with the page's own card (seo/share.mts).
 * The buttons are plain links to each network's public share address: no
 * script from those networks is loaded and nothing is tracked. On a phone with
 * a share sheet there are only two buttons, "Share…" and "Copy link": the
 * sheet already lists every app, so a row of networks would repeat it.
 *
 * It sits in the footer line of the piece ("published on…"), not in a box of
 * its own, so sharing stays one quiet line under the text.
 */

export const SHARE_ID = 'share';

const Icon: Record<'wa' | 'li' | 'fb' | 'mail' | 'link' | 'share' | 'ok', React.ReactNode> = {
    wa: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
            <path
                fill="#fff"
                d="M17.2 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.5.8 3.4.7.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"
            />
        </svg>
    ),
    li: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect width="24" height="24" rx="4" fill="#0A66C2" />
            <path
                fill="#fff"
                d="M7 9.5h2.6V18H7zM8.3 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.2 9.5h2.5v1.2c.4-.7 1.2-1.4 2.6-1.4 2.7 0 3.2 1.8 3.2 4.1V18h-2.6v-4c0-1 0-2.2-1.4-2.2s-1.6 1-1.6 2.1V18h-2.6z"
            />
        </svg>
    ),
    fb: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="11" fill="#1877F2" />
            <path
                fill="#fff"
                d="M13.4 21v-6.6h2.2l.4-2.6h-2.6v-1.6c0-.8.3-1.3 1.4-1.3H16V6.6a17 17 0 0 0-2-.1c-2 0-3.3 1.2-3.3 3.4v1.9H8.5v2.6h2.2V21z"
            />
        </svg>
    ),
    mail: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ln">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
        </svg>
    ),
    link: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ln">
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
            <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
    ),
    share: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ln">
            <path d="M12 3v12M7 8l5-5 5 5" />
            <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
    ),
    ok: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ln">
            <path d="m5 12 5 5 9-10" />
        </svg>
    ),
};

// The site's configured address (site.config.ts), so a link copied from a
// preview deployment still points at the real site.
const SITE_URL = (import.meta.env.VITE_SITE_URL as string) || window.location.origin;

/** This page's address on the site. */
const usePageUrl = () => {
    const { pathname } = useLocation();
    return `${SITE_URL}${pathname}`;
};

const copyText = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Older browsers, or a page without clipboard permission.
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
    }
};

/** The small "Share" link beside a post's byline; it jumps to the box below. */
export const ShareLink: React.FC = () => {
    const { t } = useLang();
    return (
        <a className="sh-top" href={`#${SHARE_ID}`}>
            {Icon.share}
            {t(SHARE).top}
        </a>
    );
};

/**
 * One quiet line of share buttons. On a phone with a share sheet it is two
 * buttons, the sheet and "copy link"; elsewhere one round button per network.
 */
const ShareBox: React.FC<{ kind: ShareKind; title: string; standalone?: boolean }> = ({
    kind,
    title,
    standalone = false,
}) => {
    const { t } = useLang();
    const copy = t(SHARE);
    const url = usePageUrl();
    const phone = useMediaQuery(PHONE_QUERY);
    const [copied, setCopied] = useState(false);
    const canShare = phone && typeof navigator !== 'undefined' && 'share' in navigator;

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 2500);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const text = `${title}\n${url}`;
    const enc = encodeURIComponent;
    const links = [
        { key: 'wa', label: copy.whatsapp, href: `https://wa.me/?text=${enc(text)}` },
        {
            key: 'li',
            label: copy.linkedin,
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
        },
        {
            key: 'fb',
            label: copy.facebook,
            href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
        },
        { key: 'mail', label: copy.email, href: `mailto:?subject=${enc(title)}&body=${enc(text)}` },
    ] as const;

    const share = () => {
        // A cancelled share sheet rejects; there is nothing to do about it.
        navigator.share({ title, url }).catch(() => undefined);
    };

    return (
        <div className={`sh${standalone ? ' solo' : ''}`} id={SHARE_ID}>
            <span className="sh-l">{copy.title[kind]}</span>
            <span className="sh-r">
                {canShare ? (
                    <button type="button" className="sh-b wide" onClick={share}>
                        {Icon.share}
                        {copy.native}
                    </button>
                ) : (
                    links.map((l) => (
                        <a
                            key={l.key}
                            className="sh-b"
                            href={l.href}
                            target={l.key === 'mail' ? undefined : '_blank'}
                            rel="noopener"
                            aria-label={l.label}
                            title={l.label}
                        >
                            {Icon[l.key]}
                        </a>
                    ))
                )}
                <button
                    type="button"
                    className={`sh-b${copied ? ' done wide' : ''}`}
                    onClick={() => copyText(url).then(setCopied)}
                    aria-label={copied ? copy.copied : copy.copy}
                    title={copy.copy}
                >
                    {copied ? Icon.ok : Icon.link}
                    {copied && <span aria-live="polite">{copy.copied}</span>}
                </button>
            </span>
        </div>
    );
};

export default ShareBox;
