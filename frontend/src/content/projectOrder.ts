/**
 * The projects that lead the projects list, in this order: the ones with a full
 * drawn page, with the agent fleet right after PersonaKit. The rest follow in
 * the order the API returns them.
 */
export const RICH_PROJECTS = [
    'trinity-legal',
    'trinity-agent',
    'personakit',
    'agent-fleet',
    'review-engine',
    'catchup',
    'ai-chat-portfolio',
] as const;

const rank = (slug: string) => {
    const i = (RICH_PROJECTS as readonly string[]).indexOf(slug);
    return i === -1 ? RICH_PROJECTS.length : i;
};

/** A stable sort: drawn pages first, everything else keeps its place. */
export const orderProjects = <T extends { slug: string }>(projects: T[]): T[] =>
    projects
        .map((project, i) => ({ project, i }))
        .sort((a, b) => rank(a.project.slug) - rank(b.project.slug) || a.i - b.i)
        .map(({ project }) => project);
