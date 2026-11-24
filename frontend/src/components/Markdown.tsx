import React from 'react';
import ReactMarkdown from 'react-markdown';

/*
 * Renders the markdown the backend serves: write-ups, posts and the CV.
 *
 * react-markdown rather than a regex pass because it never goes through
 * `dangerouslySetInnerHTML`: it builds React elements directly, so raw HTML in a
 * document cannot become live markup. That matters more than usual here, since
 * these documents are also fed to a model.
 *
 * Elements are left plain: the container they are rendered into (.w-body on a
 * reading page, .cv-doc in the CV dialog) styles them, so one stylesheet owns
 * the type. Only behaviour is set here: links open in a new tab, paragraphs
 * take their direction from their own text (list items keep the list's, so
 * the bullets stay on one side), images load lazily.
 */
const COMPONENTS = {
    a: (props: React.ComponentProps<'a'>) => (
        <a target="_blank" rel="noopener noreferrer" {...props} />
    ),
    p: (props: React.ComponentProps<'p'>) => <p dir="auto" {...props} />,
    img: (props: React.ComponentProps<'img'>) => <img loading="lazy" {...props} />,
    table: (props: React.ComponentProps<'table'>) => (
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
