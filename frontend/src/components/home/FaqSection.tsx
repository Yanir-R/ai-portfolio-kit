import React from 'react';
import { HOME } from '@/copy/home';
import { useLang } from '@/i18n/useLang';

/** The questions I'm always asked; the first one open. */
const FaqSection: React.FC = () => {
    const { t } = useLang();
    const copy = t(HOME).faq;

    return (
        <section>
            <div className="faq">
                <div>
                    <span className="tagline">{copy.tagline}</span>
                    <h2>{copy.title}</h2>
                </div>
                <div>
                    {copy.items.map((item, i) => (
                        <details key={item.q} open={i === 0}>
                            <summary>{item.q}</summary>
                            <p>{item.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FaqSection;
