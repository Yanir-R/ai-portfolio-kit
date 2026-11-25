import React from 'react';
import ReactMarkdown from 'react-markdown';

// react-markdown hands each component its syntax-tree `node`; spreading that
// onto a DOM element would print node="[object Object]" into the page.
type Props<T extends keyof React.JSX.IntrinsicElements> = React.ComponentProps<T> & {
    node?: unknown;
};

/*
 * Renders the markdown the backend serves: write-ups, posts and the CV.
 *
 * react-markdown rather than a regex pass because it never goes through
 * `dangerouslySetInnerHTML`: it builds React elements directly, so raw HTML in a
 * document cannot become live markup. That matters more than usual here, since
 * these documents are also fed to a model.
 *
 * Elements are left plain: the container they are rendered into (.w-body on a
 * reading page, for instance) styles them, so one stylesheet owns
 * the type. Only behaviour is set here: links open in a new tab, paragraphs
 * take their direction from their own text (list items keep the list's, so
 * the bullets stay on one side), images load lazily.
 */
const COMPONENTS = {
    a: ({ node: _node, ...props }: Props<'a'>) => (
        <a target="_blank" rel="noopener noreferrer" {...props} />
    ),
    p: ({ node: _node, ...props }: Props<'p'>) => <p dir="auto" {...props} />,
    img: ({ node: _node, ...props }: Props<'img'>) => <img loading="lazy" {...props} />,
    table: ({ node: _node, ...props }: Props<'table'>) => (
        <div className="md-table">
            <table {...props} />
        </div>
    ),
};

// Notes for maintainers inside a document, which react-markdown would show as text.
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

/*
 * A Hebrew prefix joined by a hyphen to a Latin word or a number ("ל-commit",
 * "ב-Obsidian", "ומ-2024") must not end a line apart from its word. A word
 * joiner (U+2060, invisible) after the hyphen removes that break, and the
 * font's own hyphen stays.
 */
const HEBREW_PREFIX = /(^|[\s(["'״׳])([ובכלמשה]{1,3})-(?=[A-Za-z0-9])/g;
const keepPrefixes = (text: string) => text.replace(HEBREW_PREFIX, '$1$2-\u2060');

const Markdown: React.FC<{ children: string }> = ({ children }) => (
    <ReactMarkdown components={COMPONENTS}>
        {keepPrefixes(children.replace(HTML_COMMENT, ''))}
    </ReactMarkdown>
);

export default Markdown;
