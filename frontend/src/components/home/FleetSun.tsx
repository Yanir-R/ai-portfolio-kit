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
// A finger has to travel this far sideways for a swipe to change the group.
const SWIPE_PX = 40;

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
// The order the phone's group card steps through: the seven groups, then the
// agents around the centre.
const ORDER = [...FLEET_GROUPS.keys(), DIRECT_RAY];

type Pick = { kind: 'ray'; index: number } | { kind: 'layer'; id: FleetLayer } | null;

const FleetSun: React.FC = () => {
    const { lang, t } = useLang();
    const ui = t(FLEET_UI);
    const phone = useMediaQuery(PHONE_QUERY);
    const touchRef = useRef(false);
    const timerRef = useRef<number>(0);
    const [pick, setPick] = useState<Pick>(null);
    // On a phone one group is always shown, in the card under the drawing.
    const [pos, setPos] = useState(0);
    const swipeRef = useRef<{ x: number; y: number } | null>(null);
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

    const pickRay = (index: number) => {
        setPick({ kind: 'ray', index });
        if (phone) setPos(ORDER.indexOf(index));
    };
    // Steps the phone's group card, looping at both ends.
    const step = (by: 1 | -1) => pickRay(ORDER[(pos + by + ORDER.length) % ORDER.length]);
    const rtl = lang === 'he';
    // The group lead first, then each agent; the direct reports have no lead.
    const roles = (index: number) =>
        index === DIRECT_RAY
            ? FLEET_DIRECT.agents.map((line) => ({ cls: 'dir', label: ui.directRole, line }))
            : [
                  { cls: 'lead', label: ui.leadRole, line: FLEET_GROUPS[index].lead },
                  ...FLEET_GROUPS[index].agents.map((line) => ({
                      cls: 'sub',
                      label: ui.subRole,
                      line,
                  })),
              ];
    const pickLayer = (id: FleetLayer) =>
        setPick((p) => (p?.kind === 'layer' && p.id === id ? null : { kind: 'layer', id }));

    const layer = pick?.kind === 'layer' ? pick.id : undefined;
    const ray = pick?.kind === 'ray' ? pick.index : phone && !layer ? ORDER[pos] : undefined;
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
                                    {...(phone ? {} : dotHandlers(d.line))}
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
                        {...(phone ? {} : dotHandlers(FLEET_HEAD.line))}
                    />
                    <text className="core-t" x={C} y={C - 1} pointerEvents="none">
                        {ui.coreTitle}
                    </text>
                    <text className="core-s" x={C} y={C + 15} pointerEvents="none">
                        {ui.coreSub}
                    </text>
                </svg>
                {phone && (
                    // On a phone the number tiles become this key: what each marker is, and how many.
                    <ul className="fkey" aria-label={ui.keyLabel}>
                        {FLEET_LAYERS.map((l) => (
                            <li key={l.id}>
                                <i className={`k-${l.id}`} aria-hidden="true" />
                                <b>{l.count}</b>
                                <span>{l.label[lang]}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {phone && (
                    <div
                        className="fpick"
                        role="group"
                        aria-label={ui.groupsLabel}
                        aria-live="polite"
                        onTouchStart={(e) => {
                            const t0 = e.touches[0];
                            swipeRef.current = { x: t0.clientX, y: t0.clientY };
                        }}
                        onTouchEnd={(e) => {
                            const from = swipeRef.current;
                            swipeRef.current = null;
                            if (!from) return;
                            const dx = e.changedTouches[0].clientX - from.x;
                            const dy = e.changedTouches[0].clientY - from.y;
                            if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
                            // Reading right to left, the next group comes in from the left.
                            step(dx < 0 !== rtl ? 1 : -1);
                        }}
                    >
                        <div className="fp-row">
                            <button
                                type="button"
                                className="fp-ar"
                                aria-label={ui.prevGroup}
                                onClick={() => step(-1)}
                            >
                                <Chevron />
                            </button>
                            {/*
                             * Every group is laid in the same cell and only the
                             * one shown is visible, so the card keeps the height
                             * of its longest group and nothing below it moves.
                             */}
                            <div className="fp-name">
                                {ORDER.map((index, i) => (
                                    <div
                                        key={index}
                                        className={i === pos ? undefined : 'off'}
                                        aria-hidden={i !== pos}
                                    >
                                        <small>{ui.position(i + 1, ORDER.length)}</small>
                                        <b>{groupOf(index).name[lang]}</b>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="fp-ar next"
                                aria-label={ui.nextGroup}
                                onClick={() => step(1)}
                            >
                                <Chevron />
                            </button>
                        </div>
                        <div className="fp-why">
                            {ORDER.map((index, i) => (
                                <p
                                    key={index}
                                    className={i === pos ? undefined : 'off'}
                                    aria-hidden={i !== pos}
                                >
                                    {groupOf(index).why[lang]}
                                </p>
                            ))}
                        </div>
                        {/* Who does what in the group shown: the same lines the drawing
                            shows on hover on a computer, which a phone has no way to reach. */}
                        <ul className="fp-roles">
                            {roles(ORDER[pos]).map((role, i) => (
                                <li key={i} className={role.cls}>
                                    <i aria-hidden="true" />
                                    <small>{role.label}</small>
                                    <span>{role.line[lang]}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="fp-dots" aria-hidden="true">
                            {ORDER.map((index, i) => (
                                <i key={index} className={i === pos ? 'on' : undefined} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {!phone && (
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
            )}
        </div>
    );
};

/* Points to the inline end ("next"); the stylesheet turns it for "previous" and for right to left. */
const Chevron: React.FC = () => (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
        <path
            d="M6 3l5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default FleetSun;
