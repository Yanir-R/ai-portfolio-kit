import React, { useState } from 'react';
import { MAP_EDGES, MAP_NODES, SHEET_HEADS } from '@/content/sheets';
import { PersonaKitLinks } from '@/components/chat/sheets/parts';
import { PHONE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useLang } from '@/i18n/useLang';

// Two layouts of the same map: wide beside the chat, narrow and taller on a phone.
const VIEW_BOX = { wide: '0 0 560 360', phone: '0 0 320 372' } as const;
const NODE_HEIGHT = 42;
const EDGE_LABEL = { width: 68, height: 19 } as const;
// Box width follows the label: per-character width and padding, with a floor.
const NODE_WIDTH = {
    wide: { min: 96, perChar: 9.2, pad: 26 },
    phone: { min: 84, perChar: 7.4, pad: 20 },
} as const;
// The entrance: nodes land one by one, then the links are drawn.
const STAGGER = { node: 90, edgeStart: 620, edge: 160 } as const;
const FIRST_PICK = 'agents';

/*
 * The systems map: what Yanir has built and what connects to what. Only links
 * that exist are drawn. Clicking a system describes it underneath. Remounted
 * on every open, so the entrance plays again.
 */
const SystemsMap: React.FC = () => {
    const { lang, t } = useLang();
    const phone = useMediaQuery(PHONE_QUERY);
    const layout = phone ? 'phone' : 'wide';
    const [picked, setPicked] = useState(FIRST_PICK);

    const at = (id: string) => MAP_NODES.find((n) => n.id === id)![layout];
    const node = MAP_NODES.find((n) => n.id === picked)!;
    const size = NODE_WIDTH[layout];

    return (
        <>
            <svg
                id="map-svg"
                viewBox={VIEW_BOX[layout]}
                role="img"
                aria-label={t(SHEET_HEADS).map.title}
            >
                {MAP_EDGES.map((edge, i) => {
                    const [ax, ay] = at(edge.from);
                    const [bx, by] = at(edge.to);
                    const mx = (ax + bx) / 2;
                    const my = (ay + by) / 2;
                    const style = {
                        '--d': `${STAGGER.edgeStart + i * STAGGER.edge}ms`,
                        '--len': Math.hypot(bx - ax, by - ay),
                    } as React.CSSProperties;
                    return (
                        <g key={`${edge.from}-${edge.to}`} className="eg" style={style}>
                            <line className="e" x1={ax} y1={ay} x2={bx} y2={by} />
                            <line className="e2" pathLength={1} x1={ax} y1={ay} x2={bx} y2={by} />
                            <rect
                                x={mx - EDGE_LABEL.width / 2}
                                y={my - 10}
                                width={EDGE_LABEL.width}
                                height={EDGE_LABEL.height}
                                rx={9}
                                fill="#fff"
                            />
                            <text className="el" x={mx} y={my + 4}>
                                {t(edge.label)}
                            </text>
                        </g>
                    );
                })}
                {MAP_NODES.map((n, i) => {
                    const [x, y] = n[layout];
                    const name = n.name[lang];
                    const w = Math.max(size.min, name.length * size.perChar + size.pad);
                    const pick = () => setPicked(n.id);
                    return (
                        <g
                            key={n.id}
                            className={n.id === picked ? 'n on' : 'n'}
                            tabIndex={0}
                            role="button"
                            aria-label={name}
                            aria-pressed={n.id === picked}
                            style={{ '--d': `${i * STAGGER.node}ms` } as React.CSSProperties}
                            onClick={pick}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    pick();
                                }
                            }}
                        >
                            <rect
                                x={x - w / 2}
                                y={y - NODE_HEIGHT / 2}
                                width={w}
                                height={NODE_HEIGHT}
                                rx={8}
                            />
                            <text x={x} y={y + 5}>
                                {name}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="mi" id="map-i" aria-live="polite">
                <b>{node.name[lang]}</b>
                <span>{node.text[lang]}</span> <em>{node.meta[lang]}</em>
                {node.personakitLinks && <PersonaKitLinks />}
            </div>
        </>
    );
};

export default SystemsMap;
