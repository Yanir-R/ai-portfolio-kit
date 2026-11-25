import { RefObject, useLayoutEffect } from 'react';

/** Gaps between blocks: the base, and the most spare height may widen one to. */
const GAP = 24;
const GAP_MAX = 48;
/** The migration drawing's graphics: their height at 1x, and how far they may grow. */
const ART_HEIGHT = 104;
const ART_MAX = 1.6;
/** Its two columns at 1x, and the least room the wire between them keeps. */
const ART_COLUMNS = 300;
const ART_WIRE_MIN = 60;

/** The height a column's visible children take, from the first one's top to the last one's bottom. */
const contentHeight = (box: HTMLElement) => {
    const kids = [...box.children].filter(
        (k): k is HTMLElement => k instanceof HTMLElement && k.offsetHeight > 0
    );
    if (!kids.length) return { kids, height: 0 };
    const last = kids[kids.length - 1];
    return {
        kids,
        height:
            last.offsetTop +
            last.offsetHeight +
            parseFloat(getComputedStyle(last).marginBottom) -
            kids[0].offsetTop,
    };
};

const padY = (box: HTMLElement) => {
    const s = getComputedStyle(box);
    return parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
};

/**
 * Where the panel beside the chat has grown to the screen, spare height goes
 * to the content instead of one empty band: first a drawing's graphics grow
 * (their words keep their size), then the gaps between blocks widen evenly,
 * each up to GAP_MAX. Whatever is still left stays under the last block. The
 * stations list spreads its rows the same way. Where there is no spare height
 * nothing changes, so a short screen keeps its plain layout and inner scroll.
 */
export const usePanelFill = (ref: RefObject<HTMLElement | null>, key: unknown) => {
    useLayoutEffect(() => {
        const plan = ref.current;
        if (!plan) return;
        const set = (name: string, value: string | null) =>
            value === null ? plan.style.removeProperty(name) : plan.style.setProperty(name, value);

        const fit = () => {
            set('--fz', null);
            set('--fg', null);
            set('--ag', null);
            if (!plan.closest('#top.grown')) return;

            const vis = plan.querySelector<HTMLElement>('.vis');
            if (vis && vis.offsetHeight > 0) {
                const { kids, height } = contentHeight(vis);
                let spare = vis.clientHeight - padY(vis) - height;
                if (spare <= 0 || kids.length < 2) return;
                if (vis.querySelector('.v-mig')) {
                    const s = getComputedStyle(vis);
                    const inner =
                        vis.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
                    const zoom = Math.max(
                        1,
                        Math.min(
                            ART_MAX,
                            (inner - ART_WIRE_MIN) / ART_COLUMNS,
                            1 + spare / ART_HEIGHT
                        )
                    );
                    set('--fz', zoom.toFixed(3));
                    spare -= ART_HEIGHT * (zoom - 1);
                }
                // Widen from the gap the drawing has now, so it never outgrows the panel.
                const base = parseFloat(getComputedStyle(vis).rowGap) || GAP;
                const gap = Math.min(GAP_MAX, base + Math.max(0, spare) / (kids.length - 1));
                if (gap > base) set('--fg', `${Math.floor(gap)}px`);
                return;
            }

            const rows = plan.querySelectorAll('.atr > li').length;
            if (rows < 2) return;
            const spare = plan.clientHeight - contentHeight(plan).height;
            if (spare > 0) set('--ag', `${Math.floor(Math.min(GAP_MAX, spare / (rows - 1)))}px`);
        };

        fit();
        const observer = new ResizeObserver(() => fit());
        observer.observe(plan);
        return () => observer.disconnect();
    }, [ref, key]);
};
