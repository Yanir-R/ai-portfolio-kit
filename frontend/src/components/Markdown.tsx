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

const Markdown: React.FC<{ children: string }> = ({ children }) => (
    <ReactMarkdown components={COMPONENTS}>{children.replace(HTML_COMMENT, '')}</ReactMarkdown>
);

export default Markdown;
