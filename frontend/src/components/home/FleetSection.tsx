import React from 'react';
import { HOME } from '@/copy/home';
import { useLang } from '@/i18n/useLang';
import SectionHead from '@/components/home/SectionHead';
import { SpineNode } from '@/components/home/Spine';
import FleetSun from '@/components/home/FleetSun';
import { PHONE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';

/** "More than 40 agents. One head.": the sun drawing and three cases from the fleet's log. */
const FleetSection: React.FC = () => {
    const { t } = useLang();
    const copy = t(HOME).fleet;
    const phone = useMediaQuery(PHONE_QUERY);

    return (
        <section id="fleet">
            <SpineNode n="04" />
            <SectionHead tagline={copy.tagline} title={copy.title} em={copy.em}>
                {phone ? copy.textPhone : copy.text}
            </SectionHead>
            <FleetSun />
            <div className="flh">
                <b>{copy.logTitle}</b>
                <span>{copy.logNote}</span>
            </div>
            <div className="flog">
                {copy.log.map((entry) => (
                    <div key={entry.title} className="le">
                        <span className="lt">{entry.tag}</span>
                        <span className="ld">{entry.date}</span>
                        <b>{entry.title}</b>
                        <p>{entry.text}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FleetSection;
