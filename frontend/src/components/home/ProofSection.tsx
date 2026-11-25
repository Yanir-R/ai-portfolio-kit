import React from 'react';
import { Link } from 'react-router';
import { HOME } from '@/copy/home';
import { LINKS } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import SectionHead from '@/components/home/SectionHead';
import { SpineNode } from '@/components/home/Spine';
import { Arrow } from '@/components/site/Arrow';

/** Three promises, each with where it already happened, and four more systems. */
const ProofSection: React.FC = () => {
    const { t, to } = useLang();
    const copy = t(HOME).proof;

    return (
        <section id="proof">
            <SpineNode n="03" />
            <SectionHead tagline={copy.tagline} title={copy.title} em={copy.em}>
                {copy.text}
            </SectionHead>
            <div className="prom">
                {copy.promises.map((p) => (
                    <div key={p.title} className="pr">
                        <div className="top">
                            <h3>{p.title}</h3>
                            <p>{p.text}</p>
                        </div>
                        <div className="ev">
                            <small>{copy.evidenceLabel}</small>
                            {p.evidence}
                        </div>
                    </div>
                ))}
            </div>
            <div className="also2">
                <div className="ah">
                    <b>{copy.alsoTitle}</b>
                </div>
                <div className="mini">
                    {copy.also.map((item, i) => {
                        const body = (
                            <>
                                <span className={`k${item.open ? ' g' : ''}`}>{item.tag}</span>
                                <b>{item.title}</b>
                                <span>{item.text}</span>
                            </>
                        );
                        return item.open ? (
                            <a key={i} href={LINKS.personakit} target="_blank" rel="noopener">
                                {body}
                            </a>
                        ) : (
                            <Link key={i} to={to(item.href ?? '/')}>
                                {body}
                            </Link>
                        );
                    })}
                </div>
            </div>
            <Link className="all proj-all" to={to('/projects')}>
                <Arrow>{copy.allProjects}</Arrow>
            </Link>
        </section>
    );
};

export default ProofSection;
