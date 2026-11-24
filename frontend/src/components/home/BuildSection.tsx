import React from 'react';
import { HOME } from '@/copy/home';
import { useLang } from '@/i18n/useLang';
import SectionHead from '@/components/home/SectionHead';
import { SpineNode } from '@/components/home/Spine';
import { Arrow } from '@/components/site/Arrow';

/** What I build: agents first, then the systems agents work inside. */
const BuildSection: React.FC = () => {
    const { t } = useLang();
    const copy = t(HOME).build;

    return (
        <section id="build">
            <SpineNode n="02" />
            <SectionHead tagline={copy.tagline} title={copy.title}>
                {copy.text}
            </SectionHead>
            <div className="build">
                {copy.cards.map((card, i) => (
                    <div key={card.title} className={`b${i === 0 ? ' main' : ''}`}>
                        <h3>{card.title}</h3>
                        <p>{card.text}</p>
                        <ul>
                            {card.points.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                        <a className="more" href="#brief">
                            <Arrow>{card.more}</Arrow>
                        </a>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default BuildSection;
