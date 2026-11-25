import React, { useState } from 'react';
import { HOME } from '@/copy/home';
import { useLang } from '@/i18n/useLang';
import { SpineNode } from '@/components/home/Spine';

/** The road here: five years on one line, one sentence for the year picked. */
const PathSection: React.FC = () => {
    const { t } = useLang();
    const copy = t(HOME).path;
    const [picked, setPicked] = useState(copy.years.length - 1);
    const year = copy.years[picked];

    return (
        <section id="path">
            <SpineNode variant="sm" />
            <div className="pathbar">
                <b className="pt">{copy.title}</b>
                <div className="yrs" role="tablist" aria-label={copy.label}>
                    {copy.years.map((y, i) => (
                        <button
                            key={y.year}
                            type="button"
                            role="tab"
                            aria-selected={i === picked}
                            onClick={() => setPicked(i)}
                            onMouseEnter={() => setPicked(i)}
                        >
                            <i>{y.year}</i>
                            <span>{y.label}</span>
                        </button>
                    ))}
                </div>
                {/* Every year's text is laid in the same cell, invisible, so the
                    box is always as tall as the longest one and hovering a year
                    never moves the page below it. The picked one is drawn over
                    them and is the only one read out. */}
                <div id="ytxt">
                    {copy.years.map((y) => (
                        <p key={y.year} className="off" aria-hidden="true">
                            <b>
                                {y.year} · {y.label}.
                            </b>{' '}
                            {y.text}
                        </p>
                    ))}
                    <p aria-live="polite">
                        <b>
                            {year.year} · {year.label}.
                        </b>{' '}
                        {year.text}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default PathSection;
