import React from 'react';
import { HOME } from '@/copy/home';
import { useLang } from '@/i18n/useLang';
import SectionHead from '@/components/home/SectionHead';
import { SpineNode } from '@/components/home/Spine';

/** Working with me, in four steps. */
const HowSection: React.FC = () => {
    const { t } = useLang();
    const copy = t(HOME).how;

    return (
        <section id="how">
            <SpineNode n="05" />
            <SectionHead tagline={copy.tagline} title={copy.title}>
                {copy.text}
            </SectionHead>
            <ol className="how">
                {copy.steps.map((step) => (
                    <li key={step.title}>
                        <b>{step.title}</b>
                        <p>{step.text}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
};

export default HowSection;
