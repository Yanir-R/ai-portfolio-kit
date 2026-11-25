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
                <p id="ytxt" aria-live="polite">
                    <b>
                        {year.year} · {year.label}.
                    </b>{' '}
                    {year.text}
                </p>
            </div>
        </section>
    );
};

export default PathSection;
