import type React from 'react';

/*
 * The drawn parts of a main project's page: numbers, a before/today table, a
 * drawing of how it is built, who may do what, three mechanisms and what it
 * means for the reader. Copy is written per language in content/projectPages.
 *
 * Fields typed as React.ReactNode may hold a link or bold words; everything
 * else is plain text.
 */

/** A section's heading row, as on the home page: tagline, title, lede. */
export interface PageHead {
    tagline: string;
    title: string;
    intro?: string;
}

export interface PageFact {
    value: string;
    label: string;
}

export interface ProblemRow {
    before: string;
    /** The bold start of the answer. */
    lead: string;
    rest?: string;
}

export interface ProblemSection extends PageHead {
    columns: [string, string];
    rows: ProblemRow[];
}

export interface FlowNode {
    title: string;
    text: string;
    /** What the part is built with, for developers. */
    tech?: string;
    /** The one place every request passes through. */
    gate?: boolean;
}

export interface FlowColumn {
    label: string;
    /** People or sources, drawn as pills. */
    people?: string[];
    nodes?: FlowNode[];
}

export interface FlowSection extends PageHead {
    columns: FlowColumn[];
    /** A second row under the flow, such as memory. */
    lane?: { label: string; nodes: FlowNode[] };
    /** Work that runs on its own in the background. */
    jobs?: { label: string; items: string[]; tech?: string };
    legend: string;
    techLegend: string;
}

/** A matrix cell: allowed, not available, or a short condition. */
export type Cell = 'y' | 'x' | { tag: string; dashed?: boolean };

export interface MatrixRow {
    label: string;
    note?: string;
    cells: Cell[];
}

/** One role as a card, for phones, when the matrix is too wide. */
export interface RoleCard {
    name: string;
    yes: string[];
    maybe?: string[];
    no?: string;
    me?: boolean;
}

export interface Matrix {
    corner: string;
    columns: string[];
    /** The column to highlight, counted from 0. */
    me?: number;
    rows: MatrixRow[];
    /** When given, phones show these cards instead of the table. */
    cards?: RoleCard[];
    keys?: { yes: string; no: string };
    footnote?: string;
}

export interface Level {
    tone: 'self' | 'ask' | 'no';
    title: string;
    pill: string;
    text: string;
    items?: { text: string; note?: string }[];
}

export interface RulesSection extends PageHead {
    matrix?: Matrix;
    levelsTitle?: string;
    levels?: Level[];
    note?: React.ReactNode;
}

export interface Step {
    text: string;
    note?: string;
    /** The outcome step, marked in amber. */
    ok?: boolean;
    fork?: [string, string];
}

export interface Mechanism {
    title: string;
    text: string;
    steps: Step[];
}

export interface MechanismSection extends PageHead {
    items: Mechanism[];
}

export interface FitSection extends PageHead {
    card: { title: string; text: string; bullets: string[]; extra?: React.ReactNode };
    road: { title: string; steps: { title: string; text: string }[] };
}

export interface ProjectPage {
    /** Shown instead of the document's title, where the site names it otherwise. */
    title?: string;
    lede: React.ReactNode;
    facts: PageFact[];
    problem: ProblemSection;
    flow: FlowSection;
    rules: RulesSection;
    mechanisms: MechanismSection;
    fit: FitSection;
    dev: { summary: string; tags: string[]; note: React.ReactNode };
    cta: string;
}
