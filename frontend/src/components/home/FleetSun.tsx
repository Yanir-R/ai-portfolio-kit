import React, { useRef, useState } from 'react';
import {
    FLEET_DIRECT,
    FLEET_GROUPS,
    FLEET_HEAD,
    FLEET_LAYERS,
    FLEET_UI,
    FleetLayer,
} from '@/content/fleet';
import { useLang } from '@/i18n/useLang';
import { PHONE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { Localized } from '@/i18n/lang';

/*
 * The fleet as a sun. Geometry is computed once from the data: the head in
 * the centre, seven rays of groups, and the direct reports on short spokes
 * between the rays. Picking a ray shows that group; picking a number tile
 * fades everything but that layer. Each dot's hover line is the reason the
 * agent exists, and nothing else.
 */
const C = 260; // centre of the drawing
const R = { core: 46, direct: 88, lead: 140, sub: 192, label: 228 };
const DIRECT_RAY = FLEET_GROUPS.length; // the ray index the direct reports answer to
const VIEWBOX = { wide: '-100 -14 720 548', phone: '40 40 440 440' };
const TIP_EDGE = 120;
const TOUCH_TIP_MS = 2600;

const polar = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
const f = (n: number) => n.toFixed(1);

interface Dot {
    cls: 'sub' | 'lead' | 'dir';
    x: number;
    y: number;
    r: number;
    line: Localized<string>;
}

interface Ray {
    index: number;
    name: Localized<string>;
    lines: { x1: number; y1: number; x2: number; y2: number; cls: string }[];
    dots: Dot[];
    label?: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
}

const RAYS: Ray[] = (() => {
    const step = (2 * Math.PI) / FLEET_GROUPS.length;
    const rays: Ray[] = FLEET_GROUPS.map((group, i) => {
        const a = -Math.PI / 2 + i * step;
        const [x0, y0] = polar(R.core, a);
        const [lx, ly] = polar(R.lead, a);
        const n = group.agents.length;
        const lines: Ray['lines'] = [{ x1: x0, y1: y0, x2: lx, y2: ly, cls: 'ln sp' }];
        const dots: Dot[] = group.agents.map((line, k) => {
            const b = a + (k - (n - 1) / 2) * 0.19;
            const [x, y] = polar(R.sub, b);
            lines.push({ x1: lx, y1: ly, x2: x, y2: y, cls: 'ln br' });
            return { cls: 'sub', x, y, r: 8, line };
        });
        dots.push({ cls: 'lead', x: lx, y: ly, r: 12, line: group.lead });
        const [tx, ty] = polar(R.label, a);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
        const dy = sin < -0.5 ? -10 : sin > 0.5 ? 16 : 4;
        return { index: i, name: group.name, lines, dots, label: { x: tx, y: ty + dy, anchor } };
    });
    const direct: Ray = { index: DIRECT_RAY, name: FLEET_DIRECT.name, lines: [], dots: [] };
    FLEET_DIRECT.agents.forEach((line, i) => {
        const a = -Math.PI / 2 + Math.PI / 7 + i * step;
        const [x0, y0] = polar(R.core, a);
        const [x, y] = polar(R.direct, a);
        direct.lines.push({ x1: x0, y1: y0, x2: x, y2: y, cls: 'ln' });
        direct.dots.push({ cls: 'dir', x, y, r: 8, line });
    });
    return [direct, ...rays];
})();

const groupOf = (index: number) => (index === DIRECT_RAY ? FLEET_DIRECT : FLEET_GROUPS[index]);

type Pick = { kind: 'ray'; index: number } | { kind: 'layer'; id: FleetLayer } | null;

const FleetSun: React.FC = () => {
    const { lang, t } = useLang();
    const ui = t(FLEET_UI);
    const phone = useMediaQuery(PHONE_QUERY);
    const touchRef = useRef(false);
    const timerRef = useRef<number>(0);
    const [pick, setPick] = useState<Pick>(null);
    const [tip, setTip] = useState<{ text: string; x: number; y: number; above: boolean } | null>(
        null
    );

    const showTip = (el: Element, line: Localized<string>) => {
        // Placed relative to the drawing's frame, found from the dot itself.
        const wrap = el.closest('.sunw');
        if (!wrap) return;
        const r = el.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        const above = r.top - w.top > 130;
        setTip({
            text: line[lang],
            x: Math.min(Math.max(r.left + r.width / 2 - w.left, TIP_EDGE), w.width - TIP_EDGE),
            y: above ? r.top - w.top - 10 : r.bottom - w.top + 10,
            above,
        });
    };

    // A click picks the group and closes the hover line so it never covers the
    // drawing. Touch has no hover, so a tap shows the line briefly instead.
    const dotHandlers = (line: Localized<string>) => ({
        onPointerDown: (e: React.PointerEvent) => {
            touchRef.current = e.pointerType !== 'mouse';
        },
        onPointerEnter: (e: React.PointerEvent) =>
            e.pointerType === 'mouse' && showTip(e.currentTarget, line),
        onMouseLeave: () => setTip(null),
        onClick: (e: React.MouseEvent) => {
            window.clearTimeout(timerRef.current);
            if (touchRef.current) {
                showTip(e.currentTarget, line);
                timerRef.current = window.setTimeout(() => setTip(null), TOUCH_TIP_MS);
            } else setTip(null);
        },
    });

    const pickRay = (index: number) => setPick({ kind: 'ray', index });
    const pickLayer = (id: FleetLayer) =>
        setPick((p) => (p?.kind === 'layer' && p.id === id ? null : { kind: 'layer', id }));

    const layer = pick?.kind === 'layer' ? pick.id : undefined;
    const ray = pick?.kind === 'ray' ? pick.index : undefined;
    const card =
        pick?.kind === 'ray' ? null : FLEET_LAYERS.find((l) => l.id === (layer ?? 'head'))!;

    return (
        <div className="fleet">
            <div className="sunw">
                {tip && (
                    <div
                        className="ftip"
                        data-pos={tip.above ? 'a' : 'b'}
                        style={{ left: tip.x, top: tip.y }}
                    >
                        <em>{tip.text}</em>
                    </div>
                )}
                <svg
                    id="sun"
                    viewBox={phone ? VIEWBOX.phone : VIEWBOX.wide}
                    role="img"
                    aria-label={ui.chartLabel}
                    data-f={layer}
                >
                    {RAYS.map((r) => (
                        <g
                            key={r.index}
                            className={`ray${ray === r.index ? ' on' : ''}`}
                            data-i={r.index}
                            tabIndex={0}
                            role="button"
                            aria-label={r.name[lang]}
                            style={
                                r.index === DIRECT_RAY
                                    ? undefined
                                    : { animationDelay: `${r.index * 60}ms` }
                            }
                            onClick={() => pickRay(r.index)}
                            onKeyDown={(e) =>
                                (e.key === 'Enter' || e.key === ' ') &&
                                (e.preventDefault(), pickRay(r.index))
                            }
                        >
                            {r.lines.map((l, i) => (
                                <line
                                    key={i}
                                    className={l.cls}
                                    x1={f(l.x1)}
                                    y1={f(l.y1)}
                                    x2={f(l.x2)}
                                    y2={f(l.y2)}
                                />
                            ))}
                            {r.dots.map((d, i) => (
                                <circle
                                    key={i}
                                    className={`ag ${d.cls}`}
                                    cx={f(d.x)}
                                    cy={f(d.y)}
                                    r={d.r}
                                    {...dotHandlers(d.line)}
                                />
                            ))}
                            {r.label && (
                                <text x={f(r.label.x)} y={f(r.label.y)} textAnchor={r.label.anchor}>
                                    {r.name[lang]}
                                </text>
                            )}
                        </g>
                    ))}
                    <circle
                        className="core ag"
                        cx={C}
                        cy={C}
                        r={R.core}
                        {...dotHandlers(FLEET_HEAD.line)}
                    />
                    <text className="core-t" x={C} y={C - 1} pointerEvents="none">
                        {ui.coreTitle}
                    </text>
                    <text className="core-s" x={C} y={C + 15} pointerEvents="none">
                        {ui.coreSub}
                    </text>
                </svg>
                {phone && (
                    <div className="fgr" role="group" aria-label={ui.groupsLabel}>
                        {RAYS.map((r) => (
                            <button
                                key={r.index}
                                type="button"
                                aria-pressed={ray === r.index}
                                onClick={() => pickRay(r.index)}
                            >
                                {r.name[lang]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="fside">
                <div className="fnums" role="group" aria-label={ui.filterLabel}>
                    {FLEET_LAYERS.map((l) => (
                        <button
                            key={l.id}
                            type="button"
                            data-f={l.id}
                            aria-pressed={layer === l.id}
                            onClick={() => pickLayer(l.id)}
                        >
                            <b>{l.count}</b>
                            <span>{l.label[lang]}</span>
                        </button>
                    ))}
                </div>
                <div className="fcard" aria-live="polite">
                    {card ? (
                        <>
                            <span className="k">{ui.shown}</span>
                            <b>{card.title[lang]}</b>
                            <dl className="wh">
                                <dt>{ui.whyDone}</dt>
                                <dd>{card.why[lang]}</dd>
                                <dt>{ui.howHelps}</dt>
                                <dd>{card.helps[lang]}</dd>
                                <dt>{ui.whatSolved}</dt>
                                <dd>{card.solved[lang]}</dd>
                            </dl>
                        </>
                    ) : (
                        <>
                            <span className="k">
                                {ray === DIRECT_RAY ? ui.aroundCentre : ui.group}
                            </span>
                            <b>{groupOf(ray!).name[lang]}</b>
                            <p className="why">{groupOf(ray!).why[lang]}</p>
                            <p className="hint">{ui.hint}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FleetSun;
