import React from 'react';
import { Link, useParams } from 'react-router';
import { PROJECTS } from '@/copy/projects';
import Markdown from '@/components/Markdown';
import { ARROW } from '@/components/site/Arrow';
import { LoadFailed, NotFoundHero } from '@/components/site/PageStates';
import { ArticleSkeleton } from '@/components/site/Skeleton';
import { ERRORS } from '@/copy/errors';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { PersonaKitLinks } from '@/components/chat/sheets/parts';
import ProjectPageView from '@/components/site/ProjectPageView';
import ShareBox from '@/components/site/ShareBox';
import { PROJECT_PAGES } from '@/content/projectPages';
import { Tag } from '@/components/writing/parts';
import { useLoad } from '@/hooks/useLoad';
import { useLang } from '@/i18n/useLang';
import { projectService } from '@/services/projectService';
import { stripMetadataSections } from '@/utils/markdown';

/*
 * Sections the backend parses into fields. The page shows them in its own
 * layout (tags, lede, links, media, stack), so the body leaves them out.
 */
const METADATA_HEADINGS = [
    'Overview',
    'Technical Details',
    'Project Type',
    'Status',
    'Demo URL',
    'Repository',
    'Media',
    'Featured',
    'Category',
    'License',
];

/** Only a real public address is linked; a private repository is said in words. */
const publicRepository = (repository?: string): string | null =>
    repository?.startsWith('https://') && !/review-engine/i.test(repository) ? repository : null;

/** The write-up without its fields and without the title the page already shows. */
const bodyOf = (content?: string): string =>
    content
        ? stripMetadataSections(content, METADATA_HEADINGS)
              .replace(/^# .*\n/, '')
              .trim()
        : '';

/** One project's write-up, in the post page's layout, in the page's language where it has a twin. */
const ProjectDetail: React.FC = () => {
    const { slug = '' } = useParams<{ slug: string }>();
    const { lang, t, to } = useLang();
    const copy = t(PROJECTS);
    const { openContact } = useSiteDialogs();
    const [load, retry] = useLoad(`${slug}-${lang}`, () =>
        projectService.getProjectBySlug(slug, lang)
    );

    if (load.state === 'loading') return <ArticleSkeleton label={copy.loading} />;
    // Only a 404 means the page is not there. Anything else - the server
    // asleep, a network drop, a 5xx - is a page that exists and did not load.
    if (load.state === 'failed' && load.notFound)
        return (
            <NotFoundHero copy={copy.missing} link={{ to: to('/projects'), label: copy.back }} />
        );
    if (load.state === 'failed') return <LoadFailed copy={t(ERRORS).loadFailed} onRetry={retry} />;

    const project = load.value;
    const media = projectService.getProjectMediaUrl(project);
    const stack = projectService.getProjectTechStack(project);
    const repository = publicRepository(project.repository);
    const body = bodyOf(project.content);

    const page = PROJECT_PAGES[project.slug]?.[lang];
    const mediaView =
        media &&
        (projectService.isVideoFile(media) ? (
            <video className="w-v" src={media} controls preload="metadata" />
        ) : (
            <span className="w-imgw">
                <img className="w-img" src={media} alt="" />
            </span>
        ));
    const end = (
        <div className="w-end">
            <b>{page?.cta ?? copy.cta.title}</b>
            <span className="ac">
                <Link
                    className="w-chip"
                    to={to('/')}
                    state={{ ask: copy.cta.prompt(project.title) }}
                >
                    {copy.cta.ask}
                </Link>
                <button
                    type="button"
                    className="btn sm"
                    onClick={() => openContact({ kind: 'call', topic: project.title })}
                >
                    {copy.cta.button}
                </button>
            </span>
        </div>
    );
    const tags = (
        <div className="mt">
            <Tag tone="a">{copy.status[project.status] ?? project.status}</Tag>
            {project.category && (
                <Tag tone="n">{copy.category[project.category] ?? project.category}</Tag>
            )}
        </div>
    );

    // A main project has a drawn page: numbers, tables and a drawing of how it
    // is built. Its write-up still feeds the chat; the page says the same in pictures.
    if (page)
        return (
            <article className="w-post pj">
                <Link className="w-back" to={to('/projects')}>
                    {ARROW[lang === 'he' ? 'en' : 'he']} {copy.back}
                </Link>
                <div className="pj-head">
                    {tags}
                    <h1 className="pj-t" dir="auto">
                        {page.title ?? project.title}
                    </h1>
                    <p className="pj-lede">{page.lede}</p>
                </div>
                <ProjectPageView
                    page={page}
                    media={mediaView && <div className="pj-media">{mediaView}</div>}
                />
                <ShareBox kind="project" title={page.title ?? project.title} standalone />
                {end}
            </article>
        );

    return (
        <article className="w-post">
            <Link className="w-back" to={to('/projects')}>
                {ARROW[lang === 'he' ? 'en' : 'he']} {copy.back}
            </Link>
            {tags}
            <h1 dir="auto">{project.title}</h1>
            {project.overview && <p className="by">{project.overview}</p>}
            {mediaView}
            <div className="w-body" dir="auto">
                {body && <Markdown>{body}</Markdown>}
                {project.slug === 'personakit' && <PersonaKitLinks />}
                {stack.length > 0 && (
                    <div className="w-stack">
                        <b>{copy.stack}</b>
                        <div className="mt">
                            {stack.map((tech) => (
                                <Tag key={tech} tone="i">
                                    {tech}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}
                <div className="w-orig">
                    {project.demo_url && (
                        <a href={project.demo_url} target="_blank" rel="noopener">
                            {copy.live}
                        </a>
                    )}
                    {repository ? (
                        <a href={repository} target="_blank" rel="noopener">
                            {copy.source}
                        </a>
                    ) : (
                        <span>{copy.privateCode}</span>
                    )}
                    <ShareBox kind="project" title={project.title} />
                </div>
            </div>
            {end}
        </article>
    );
};

export default ProjectDetail;
