import React from 'react';
import { Link } from 'react-router';
import { HOME } from '@/copy/home';
import { LINKS } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import SectionHead from '@/components/home/SectionHead';
import { SpineNode } from '@/components/home/Spine';
import { Arrow } from '@/components/site/Arrow';
import { useSiteDialogs } from '@/components/site/SiteDialogs';

/**
 * Three promises, each with where it happens today, and three more systems.
 * On a phone the promises are numbered and compact, a band offers the call
 * after them, and the systems become one list of rows.
 */
const ProofSection: React.FC = () => {
    const { t, to } = useLang();
    const home = t(HOME);
    const copy = home.proof;
    const { openContact } = useSiteDialogs();

    return (
        <section id="proof">
            <SpineNode n="03" />
            <SectionHead tagline={copy.tagline} title={copy.title} em={copy.em}>
                {copy.text}
            </SectionHead>
            <div className="prom">
                {copy.promises.map((p, i) => (
                    <div key={p.title} className="pr">
                        <div className="top">
                            <h3>
                                <i className="pn" aria-hidden="true">
                                    {i + 1}
                                </i>
                                {p.title}
                            </h3>
                            <p>{p.text}</p>
                        </div>
                        <div className="ev">
                            <small>{copy.evidenceLabel}</small>
                            {p.evidence}
                            {p.story && (
                                <Link className="story" to={to(p.story.href)}>
                                    <Arrow>{p.story.label}</Arrow>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="pband">
                <p>{copy.band}</p>
                <button type="button" className="btn" onClick={() => openContact({ kind: 'call' })}>
                    {home.hero.cta}
                </button>
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
                                <i className="ch" aria-hidden="true" />
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
