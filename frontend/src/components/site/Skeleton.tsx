import React from 'react';

/*
 * Loading placeholders. Each one stands in for exactly the part of the page
 * that is waiting, in that part's own layout, so the page keeps its shape and
 * nothing jumps when the real content arrives. The words a screen reader
 * hears are the `label`; the shapes themselves are hidden from it.
 */

/** One grey line or block. `w` is its inline size, for lines of uneven length. */
const Bar: React.FC<{ w?: string; className?: string }> = ({ w, className = '' }) => (
    <span className={`sk-bar ${className}`} style={w ? { inlineSize: w } : undefined} />
);

/** The region that is loading: busy for assistive tech, the label read out once. */
const Busy: React.FC<{
    label: string;
    className?: string;
    as?: 'div' | 'article' | 'section';
    children: React.ReactNode;
}> = ({ label, className = '', as: Tag = 'div', children }) => (
    <Tag className={`sk ${className}`} aria-busy="true">
        <span className="sr-only" role="status">
            {label}
        </span>
        <div className="sk-in" aria-hidden="true">
            {children}
        </div>
    </Tag>
);

/** Paragraph lines, the last one short, as text ends. */
const Lines: React.FC<{ n: number; last?: string }> = ({ n, last = '62%' }) => (
    <>
        {Array.from({ length: n }, (_, i) => (
            <Bar key={i} w={i === n - 1 ? last : undefined} />
        ))}
    </>
);

/** One card of the projects or blog grid: cover, tags, title, two lines. */
const Card: React.FC = () => (
    <div className="w-art sk-card">
        <Bar className="sk-img" />
        <span className="sk-tags">
            <Bar className="sk-tag hl" />
            <Bar className="sk-tag" />
        </span>
        <Bar className="sk-h" w="78%" />
        <Lines n={2} />
        <span className="sk-ft">
            <Bar w="5em" />
        </span>
    </div>
);

/** A grid of cards: the projects page, the blog's articles. */
export const CardsSkeleton: React.FC<{ label: string; count?: number; className?: string }> = ({
    label,
    count = 2,
    className = 'w-arts proj',
}) => (
    <Busy label={label}>
        <div className={className}>
            {Array.from({ length: count }, (_, i) => (
                <Card key={i} />
            ))}
        </div>
    </Busy>
);

/** A full write-up in the post page's column: a post, a project. */
export const ArticleSkeleton: React.FC<{ label: string; image?: boolean }> = ({
    label,
    image = true,
}) => (
    <Busy label={label} as="article" className="w-post">
        <Bar className="sk-back" w="7em" />
        <span className="sk-tags">
            <Bar className="sk-tag hl" />
            <Bar className="sk-tag" />
        </span>
        <Bar className="sk-h1" w="88%" />
        <Bar className="sk-h1" w="55%" />
        <Bar className="sk-by" w="11em" />
        {image && <Bar className="sk-img" />}
        <div className="w-body sk-body">
            <Lines n={4} />
            <Bar className="sk-gap" w="0" />
            <Lines n={3} last="44%" />
        </div>
    </Busy>
);

/** Only the text box of a page whose heading is already on screen (about). */
export const BodySkeleton: React.FC<{ label: string; className?: string }> = ({
    label,
    className = 'w-post about',
}) => (
    <Busy label={label} as="article" className={className}>
        <div className="w-body sk-body">
            <Bar className="sk-h" w="30%" />
            <Lines n={4} />
            <Bar className="sk-gap" w="0" />
            <Bar className="sk-h" w="24%" />
            <Lines n={3} last="48%" />
        </div>
    </Busy>
);

/** The home page's row of newest posts: date line and a two-line title each. */
export const PostsSkeleton: React.FC<{ label: string; count?: number }> = ({
    label,
    count = 3,
}) => (
    <Busy label={label}>
        <div className="posts">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="post sk-card">
                    <Bar className="sk-small" w="8em" />
                    <Bar className="sk-h" />
                    <Bar className="sk-h" w="60%" />
                </div>
            ))}
        </div>
    </Busy>
);

/** The blog under its heading: the index column beside the articles. */
export const BlogSkeleton: React.FC<{ label: string }> = ({ label }) => (
    <Busy label={label}>
        <div className="w-lay">
            <div className="w-idx sk-idx">
                <Bar className="sk-field" />
                <Bar className="sk-small" w="40%" />
                {['72%', '64%', '58%', '50%', '44%'].map((w) => (
                    <span key={w} className="sk-row">
                        <Bar w={w} />
                        <Bar w="1.2em" />
                    </span>
                ))}
            </div>
            <div className="w-main">
                <div className="w-sec sk-sec">
                    <Bar className="sk-h2" w="5em" />
                    <Bar className="sk-small" w="12em" />
                </div>
                <div className="w-arts">
                    <Card />
                    <Card />
                </div>
            </div>
        </div>
    </Busy>
);
