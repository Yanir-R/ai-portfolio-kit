import React from 'react';

/** The heading row every home section opens with: tagline and title, and a lede beside them. */
const SectionHead: React.FC<{
    tagline: string;
    title: string;
    em?: string;
    children?: React.ReactNode;
}> = ({ tagline, title, em, children }) => (
    <div className="head">
        <div>
            <span className="tagline">{tagline}</span>
            <h2>
                {title}
                {em && (
                    <>
                        {' '}
                        <em>{em}</em>
                    </>
                )}
            </h2>
        </div>
        <p>{children}</p>
    </div>
);

export default SectionHead;
