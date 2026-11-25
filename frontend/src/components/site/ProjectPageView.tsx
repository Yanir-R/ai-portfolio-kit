import React from 'react';
import type {
    Cell,
    FlowNode,
    Matrix,
    PageHead,
    ProjectPage,
    RulesSection,
} from '@/types/projectPage';

/** The heading row every section opens with, the same one the home page uses. */
const Head: React.FC<PageHead> = ({ tagline, title, intro }) => (
    <div className="head">
        <div>
            <span className="tagline">{tagline}</span>
            <h2>{title}</h2>
        </div>
        <p>{intro}</p>
    </div>
);

const Node: React.FC<{ node: FlowNode }> = ({ node }) => (
    <div
        className={['pj-node', node.gate && 'gate', node.family && 'fam'].filter(Boolean).join(' ')}
    >
        <b>{node.title}</b>
        {node.text && <span>{node.text}</span>}
        {node.family && (
            <ul className="fl">
                {node.family.map((group) => (
                    <li key={group.name}>
                        {group.name}
                        <i>{group.count}</i>
                    </li>
                ))}
            </ul>
        )}
        {node.tech && <span className="tg">{node.tech}</span>}
    </div>
);

const CellMark: React.FC<{ cell: Cell; yes: string; no: string }> = ({ cell, yes, no }) => {
    if (cell === 'y')
        return (
            <i className="y" role="img" aria-label={yes}>
                ✓
            </i>
        );
    if (cell === 'x')
        return (
            <i className="x" role="img" aria-label={no}>
                –
            </i>
        );
    return <span className={cell.dashed ? 't dashed' : 't'}>{cell.tag}</span>;
};

const MatrixTable: React.FC<{ matrix: Matrix }> = ({ matrix }) => {
    const yes = matrix.keys?.yes ?? '✓';
    const no = matrix.keys?.no ?? '–';
    const me = (i: number) => (i === matrix.me ? 'me' : undefined);
    return (
        <>
            <div className={matrix.cards ? 'pj-perm-wrap cards' : 'pj-perm-wrap'}>
                <table className="pj-perm">
                    <thead>
                        <tr>
                            <th scope="col" className="corner">
                                {matrix.corner}
                            </th>
                            {matrix.columns.map((column, i) => (
                                <th scope="col" key={column} className={me(i)}>
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.rows.map((row) => (
                            <tr key={row.label}>
                                <th scope="row">
                                    {row.label}
                                    {row.note && <small>{row.note}</small>}
                                </th>
                                {row.cells.map((cell, i) => (
                                    <td key={i} className={me(i)}>
                                        <CellMark cell={cell} yes={yes} no={no} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {matrix.cards && (
                <div className="pj-roles">
                    {matrix.cards.map((card) => (
                        <div key={card.name} className={card.me ? 'pj-role me' : 'pj-role'}>
                            <b>{card.name}</b>
                            <div className="c">
                                {card.yes.map((item) => (
                                    <span key={item}>{item}</span>
                                ))}
                                {card.maybe?.map((item) => (
                                    <span key={item} className="mid">
                                        {item}
                                    </span>
                                ))}
                            </div>
                            {card.no && <small className="no">{card.no}</small>}
                        </div>
                    ))}
                </div>
            )}
            {(matrix.keys || matrix.footnote) && (
                <div className="pj-keys">
                    {matrix.keys && (
                        <>
                            <span className="k">
                                <i className="y" aria-hidden="true">
                                    ✓
                                </i>
                                {matrix.keys.yes}
                            </span>
                            <span className="k">
                                <i className="x" aria-hidden="true">
                                    –
                                </i>
                                {matrix.keys.no}
                            </span>
                        </>
                    )}
                    {matrix.footnote && <span>{matrix.footnote}</span>}
                </div>
            )}
        </>
    );
};

const Rules: React.FC<{ rules: RulesSection }> = ({ rules }) => (
    <section className="pj-sec">
        <Head {...rules} />
        {rules.matrix && <MatrixTable matrix={rules.matrix} />}
        {rules.levelsTitle && <h3 className="pj-sub">{rules.levelsTitle}</h3>}
        {rules.levels && (
            <div className={rules.levels.length > 3 ? 'pj-lv four' : 'pj-lv'}>
                {rules.levels.map((level) => (
                    <div key={level.title} className={`col ${level.tone}`}>
                        <h3>
                            {level.title} <span className="lvp">{level.pill}</span>
                        </h3>
                        <p>{level.text}</p>
                        {level.items && (
                            <ul>
                                {level.items.map((item) => (
                                    <li key={item.text}>
                                        {item.text}
                                        {item.note && <small>{item.note}</small>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        )}
        {rules.note && (
            <div className="pj-note">
                <span className="k" aria-hidden="true">
                    !
                </span>
                <p>{rules.note}</p>
            </div>
        )}
    </section>
);

/**
 * The drawn part of a main project's page, between its title and its call to
 * action. Each section is the home page's heading row over one visual.
 */
const ProjectPageView: React.FC<{ page: ProjectPage; media?: React.ReactNode }> = ({
    page,
    media,
}) => {
    const { problem, flow, rules, mechanisms, fit, dev } = page;
    const mechanismsView = (
        <section className="pj-sec">
            <Head {...mechanisms} />
            <div className="pj-mech">
                {mechanisms.items.map((item, i) => (
                    <div className="pj-m" key={item.title}>
                        <h3>
                            <i aria-hidden="true">{i + 1}</i>
                            {item.title}
                        </h3>
                        <p>{item.text}</p>
                        <ol className="pj-steps">
                            {item.steps.map((step) => (
                                <li key={step.text} className={step.ok ? 'ok' : undefined}>
                                    {step.text}
                                    {step.note && <small>{step.note}</small>}
                                    {step.fork && (
                                        <span className="fork">
                                            <span className="g">{step.fork[0]}</span>
                                            <span>{step.fork[1]}</span>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>
                ))}
            </div>
            {mechanisms.day && (
                <div className="pj-day">
                    {mechanisms.day.map((slot) => (
                        <div key={slot.when}>
                            <small>{slot.when}</small>
                            <b>{slot.what}</b>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
    return (
        <>
            <div className="pj-facts">
                {page.facts.map((fact) => (
                    <div key={fact.label}>
                        <b>
                            <bdi dir="ltr">{fact.value}</bdi>
                        </b>
                        <span>{fact.label}</span>
                    </div>
                ))}
            </div>
            {media}

            <section className="pj-sec">
                <Head {...problem} />
                <table className="pj-bt">
                    <thead>
                        <tr>
                            <th scope="col">{problem.columns[0]}</th>
                            <th scope="col" className="now">
                                {problem.columns[1]}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {problem.rows.map((row) => (
                            <tr key={row.before}>
                                <td data-label={problem.columns[0]}>{row.before}</td>
                                <td data-label={problem.columns[1]}>
                                    <b>{row.lead}</b>
                                    {row.rest && ` ${row.rest}`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="pj-sec">
                <Head {...flow} />
                <div className="pj-bp">
                    <div className="pj-cols">
                        {flow.columns.map((column) => (
                            <div className="pj-col" key={column.label}>
                                <small>{column.label}</small>
                                {column.people && (
                                    <div className="pj-ppl">
                                        {column.people.map((person) => (
                                            <span key={person}>{person}</span>
                                        ))}
                                    </div>
                                )}
                                {column.nodes?.map((node) => (
                                    <Node key={node.title} node={node} />
                                ))}
                            </div>
                        ))}
                    </div>
                    {flow.lane && (
                        <div className="pj-lane">
                            <small>{flow.lane.label}</small>
                            {flow.lane.nodes.map((node) => (
                                <Node key={node.title} node={node} />
                            ))}
                        </div>
                    )}
                    {flow.jobs && (
                        <div className="pj-jobs">
                            <b>{flow.jobs.label}</b>
                            {flow.jobs.items.map((item) => (
                                <i key={item}>{item}</i>
                            ))}
                            {flow.jobs.tech && <span className="tg">{flow.jobs.tech}</span>}
                        </div>
                    )}
                </div>
                <div className="pj-legend">
                    <span>{flow.legend}</span>
                    <span>{flow.techLegend}</span>
                </div>
            </section>

            {page.mechanismsFirst && mechanismsView}
            <Rules rules={rules} />
            {!page.mechanismsFirst && mechanismsView}

            <section className="pj-sec">
                <Head {...fit} />
                <div className="pj-fit">
                    <div className="card">
                        <h3>{fit.card.title}</h3>
                        <p>{fit.card.text}</p>
                        <ul>
                            {fit.card.bullets.map((bullet) => (
                                <li key={bullet}>{bullet}</li>
                            ))}
                        </ul>
                        {fit.card.extra && <p className="extra">{fit.card.extra}</p>}
                    </div>
                    <div className="card">
                        <h3>{fit.road.title}</h3>
                        <ol className="pj-road">
                            {fit.road.steps.map((step, i) => (
                                <li key={step.title}>
                                    <b className="s" aria-hidden="true">
                                        {i + 1}
                                    </b>
                                    <p>
                                        <b>{step.title}</b>
                                        <span>{step.text}</span>
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            <details className="pj-dev">
                <summary>{dev.summary}</summary>
                <div className="in">
                    <div className="mt">
                        {dev.tags.map((tag) => (
                            <span key={tag} className="w-tag i">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="orig">{dev.note}</div>
                </div>
            </details>
        </>
    );
};

export default ProjectPageView;
