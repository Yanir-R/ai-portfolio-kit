import React from 'react';
import { PROJECTS } from '@/copy/projects';
import Markdown from '@/components/Markdown';
import { LoadFailed, LoadingNote } from '@/components/site/PageStates';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { useLoad } from '@/hooks/useLoad';
import { useLang } from '@/i18n/useLang';
import { PROFILE_DOCS, profileService } from '@/services/profileService';

/*
 * The bio. The name and role live here rather than in the document, which is
 * also part of the chat's context, where a heading is noise.
 */
const About: React.FC = () => {
    const { lang, t } = useLang();
    const copy = t(PROJECTS).about;
    const { openContact, openCv } = useSiteDialogs();
    const [load, retry] = useLoad(lang, () => profileService.get(PROFILE_DOCS.about, lang));

    return (
        <>
            <div className="w-hero">
                <div>
                    <span className="tagline">{copy.tagline}</span>
                    <h1>
                        {copy.title} <em>{copy.em}</em>
                    </h1>
                </div>
                <p className="ac">
                    <button
                        type="button"
                        className="btn sm"
                        onClick={() => openContact({ kind: 'call' })}
                    >
                        {copy.talk}
                    </button>
                    <button type="button" className="btn sm line" onClick={openCv}>
                        {copy.cv}
                    </button>
                </p>
            </div>
            {load.state === 'loading' && <LoadingNote text={t(PROJECTS).loading} />}
            {load.state === 'failed' && <LoadFailed copy={copy.failed} onRetry={retry} />}
            {load.state === 'ready' && (
                <article className="w-post">
                    <div className="w-body" dir="auto">
                        <Markdown>{load.value}</Markdown>
                    </div>
                </article>
            )}
        </>
    );
};

export default About;
