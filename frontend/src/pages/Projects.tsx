import React from 'react';
import { Link } from 'react-router';
import { PROJECTS } from '@/copy/projects';
import { Arrow } from '@/components/site/Arrow';
import { Tag } from '@/components/writing/parts';
import { LoadFailed, LoadingNote } from '@/components/site/PageStates';
import { useLoad } from '@/hooks/useLoad';
import { useLang } from '@/i18n/useLang';
import { projectService } from '@/services/projectService';

/** The write-ups, featured first, as cards in the blog's article style. */
const Projects: React.FC = () => {
    const { lang, t, to } = useLang();
    const copy = t(PROJECTS);
    const [value, retry] = useLoad(lang, () => projectService.getAllProjects(lang));

    return (
        <>
            <div className="w-hero">
                <div>
                    <span className="tagline">{copy.tagline}</span>
                    <h1>
                        {copy.title} <em>{copy.em}</em>
                    </h1>
                </div>
                <p>{copy.lead}</p>
            </div>
            {value.state === 'loading' && <LoadingNote text={copy.loading} />}
            {value.state === 'failed' && <LoadFailed copy={copy.failed} onRetry={retry} />}
            {value.state === 'ready' && (
                <div className="w-arts proj">
                    {value.value.map((project) => (
                        <article key={project.slug} className="w-art">
                            {project.media_url &&
                                !projectService.isVideoFile(project.media_url) && (
                                    <span className="w-imgw">
                                        <img
                                            className="w-img"
                                            src={project.media_url}
                                            alt=""
                                            loading="lazy"
                                        />
                                    </span>
                                )}
                            <div className="mt">
                                <Tag tone="a">{copy.status[project.status] ?? project.status}</Tag>
                                {project.category && (
                                    <Tag tone="n">
                                        {copy.category[project.category] ?? project.category}
                                    </Tag>
                                )}
                            </div>
                            <h3 dir="auto">{project.title}</h3>
                            {project.overview && <p>{project.overview}</p>}
                            <div className="ft">
                                <span className="rd" />
                                <Link className="w-out" to={to(`/projects/${project.slug}`)}>
                                    <Arrow>{copy.read}</Arrow>
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
};

export default Projects;
