import React from 'react';
import { Link } from 'react-router';
import { ERRORS } from '@/copy/errors';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useLang } from '@/i18n/useLang';

/*
 * The states a fetched page passes through before it has something to show:
 * loading, an address with nothing behind it, and a server that did not answer.
 */

export const LoadingNote: React.FC<{ text: string }> = ({ text }) => (
    <p className="state-note" role="status">
        {text}
    </p>
);

export const NotFoundHero: React.FC<{
    copy: { tagline: string; title: string; text: string };
    link: { to: string; label: string };
}> = ({ copy, link }) => {
    // The server said 404: keep the address out of search results, and name
    // the tab for what it is rather than leaving the section's title.
    const { t } = useLang();
    useNoIndex(true, t(ERRORS).notFound.docTitle);
    return (
        <div className="w-hero">
            <div>
                <span className="tagline">{copy.tagline}</span>
                <h1>{copy.title}</h1>
            </div>
            <p>
                {copy.text} <Link to={link.to}>{link.label}</Link>
            </p>
        </div>
    );
};

export const LoadFailed: React.FC<{
    copy: { title: string; text: string; retry: string };
    onRetry: () => void;
}> = ({ copy, onRetry }) => (
    <div className="w-none">
        <h3>{copy.title}</h3>
        <p>{copy.text}</p>
        <div className="r">
            <button type="button" className="go" onClick={onRetry}>
                {copy.retry}
            </button>
        </div>
    </div>
);
