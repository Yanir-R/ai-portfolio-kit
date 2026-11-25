import { LINKS } from '@/constants/links';

/*
 * The CV as shown in the CV window, laid out like the CV document Yanir wrote
 * (one page, experience beside a narrow column of skills and projects). It is
 * English only, like that document.
 *
 * backend/docs/profile/resume.md holds the longer version the chat answers
 * from. Keep the two in step: a change of title, date or fact goes in both.
 * As there, nothing here names the Stealth employer or describes its internal
 * systems.
 *
 * In bullet text, **bold** marks a highlight.
 */

export interface CvLink {
    label: string;
    href: string;
}

export interface CvRole {
    title: string;
    org: string;
    orgHref?: string;
    orgNote?: string;
    dates: string;
    lede?: string;
    bullets: string[];
}

export interface CvGroup {
    name: string;
    items: string;
}

export interface CvProject {
    name: string;
    href?: string;
    text: string;
}

export const CV_DOC = {
    name: 'Yanir Rot',
    role: 'Full-Stack AI Developer',
    email: 'rotyanir@gmail.com',
    links: [
        { label: 'GitHub', href: LINKS.github },
        { label: 'LinkedIn', href: LINKS.linkedin },
        { label: 'Portfolio - live AI assistant', href: '/' },
    ] satisfies CvLink[],
    summary:
        'Full-stack developer specializing in production LLM and multi-agent systems. As a founding engineer I went from building the chat frontend to owning correctness of the agent pipeline end to end - evidence provenance, hallucination prevention, token economics - a range that runs from a React component to a Helm chart. Since Sep 2026 I build PersonaKit and take on freelance AI development.',
    experience: [
        {
            title: 'Creator & Lead Developer',
            org: 'PersonaKit',
            orgHref: LINKS.personakit,
            orgNote: 'open source · Self-employed',
            dates: 'Since Sep 2026',
            bullets: [
                'Building PersonaKit, open-source personal AI memory you can inspect, correct and take anywhere: it proposes short memories from local Claude Code and Codex sessions, each with the quote behind it.',
                'Built review-engine, a review gate for coding-agent pull requests: a deterministic evidence pack, focused AI review lenses, then a verdict - **about 90 PRs in two days** across PersonaKit and personal projects.',
                'Run a **40+ agent system** for research, content, cloud monitoring and business operations, with a written contract per agent, approval tiers for risky actions and one append-only audit log.',
                'Freelance AI development: agents and LLM features end to end, reliability for existing agents, and GCP setup, monitoring and cost control.',
            ],
        },
        {
            title: 'Founding Engineer',
            org: 'Stealth',
            orgNote: 'employee #1',
            dates: 'Aug 2025 – Sep 2026',
            lede: 'Early-stage AI startup - production multi-agent LLM systems over Kubernetes, AWS and observability telemetry.',
            bullets: [
                'Designed an evidence-provenance architecture so citations are bound to retrieved evidence instead of chosen by the model, **eliminating hallucinated evidence** at the source.',
                'Reduced multi-agent token cost and latency through agent decomposition, context compaction and circuit-breaker enforcement.',
                'Built a tool-failure guard with error-classified retry and self-healing query repair.',
                'Shipped a linter validating LLM-generated queries before execution, and vector-backed semantic retrieval for agent skill hints.',
                'Built Go and Python backend services across the event pipeline and session storage.',
                'Built the product frontend in Next.js and React: chat and session architecture, direct SSE token streaming, evidence renderers, platform-wide light mode.',
            ],
        },
        {
            title: 'Full-Stack Developer',
            org: 'Moonsite',
            dates: '2023 – 2025',
            bullets: [
                'Led frontend architecture for a sports-betting platform serving **500K+ daily active users and ~3M ILS daily cash flow**.',
                'Managed development of a finance application used by major Israeli enterprises, from planning through deployment (React, TypeScript, SCSS).',
            ],
        },
        {
            title: 'Full-Stack Developer',
            org: 'Devforce',
            dates: '2022 – 2023',
            bullets: [
                'Built an AI-powered image tagging system for a SaaS platform, improving tagging efficiency and data quality; revamped the order flow for a leading flight-booking platform (React, TypeScript, MobX, Next.js).',
            ],
        },
    ] satisfies CvRole[],
    earlier:
        'Automation Developer, Bond Sports (2021–2022) · Co-founder & Operations Manager, Tauora Products (2018–2019)',
    skills: [
        {
            name: 'AI & LLM',
            items: 'Multi-agent orchestration · RAG & embeddings · prompt engineering · Qdrant · Langfuse · Claude · Gemini / Vertex AI',
        },
        { name: 'Languages', items: 'Python · TypeScript · Go · JavaScript' },
        { name: 'Frontend', items: 'React · Next.js · TailwindCSS · React Native' },
        { name: 'Backend & data', items: 'Node.js · Kafka · Redis · MongoDB · Memgraph / Cypher' },
        { name: 'Infra & cloud', items: 'Kubernetes · Helm · ArgoCD · GCP · AWS' },
    ] satisfies CvGroup[],
    projects: [
        {
            name: 'PersonaKit',
            href: LINKS.personakit,
            text: 'Open-source personal AI memory you can inspect, correct and take anywhere.',
        },
        {
            name: 'Video analysis service',
            text: 'Token-based access control and inference-cost optimization.',
        },
        {
            name: 'Hermes agent',
            text: 'Self-hosted 24/7 agent: custom persona, Obsidian-vault memory, Telegram interface.',
        },
        {
            name: 'Live AI assistant',
            text: 'Doc-aware assistant on Vertex AI Gemini, hardened against prompt injection.',
        },
    ] satisfies CvProject[],
    education: { title: 'Practical Software Engineer', place: 'Technion, Tel Aviv · 2019-2020' },
    spoken: 'English - fluent · Hebrew - native',
    headings: {
        experience: 'Experience',
        earlier: 'Earlier:',
        skills: 'Skills',
        projects: 'Projects',
        education: 'Education',
        spoken: 'Spoken',
    },
};
