import React, { useEffect, useRef } from 'react';

/*
 * The line down the side of the middle sections. Its fill follows the scroll
 * position and each section's node switches on as it passes; section heads
 * fade in once. One animation frame per scroll, two rect reads, no layout
 * writes besides one custom property.
 */
const FILL_LINE = 0.62; // how far down the viewport counts as "reached"

const Spine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const spine = ref.current;
        if (!spine) return;
        document.documentElement.classList.add('js');
        const thread = spine.querySelector<HTMLElement>('.thr');
        const nodes = [...spine.querySelectorAll<HTMLElement>('.nd')];
        let queued = false;

        const update = () => {
            queued = false;
            if (!thread) return;
            const rect = thread.getBoundingClientRect();
            const y = window.innerHeight * FILL_LINE;
            thread.style.setProperty(
                '--p',
                String(Math.max(0, Math.min(1, (y - rect.top) / rect.height)))
            );
            nodes.forEach((n) => n.classList.toggle('on', n.getBoundingClientRect().top < y));
        };
        const onScroll = () => {
            if (!queued) {
                queued = true;
                requestAnimationFrame(update);
            }
        };

        const reveal = new IntersectionObserver(
            (entries) =>
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in');
                        reveal.unobserve(entry.target);
                    }
                }),
            { threshold: 0.2 }
        );
        spine.querySelectorAll('.head').forEach((head) => reveal.observe(head));

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', update);
        update();
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', update);
            reveal.disconnect();
        };
    }, []);

    return (
        <div className="spine" ref={ref}>
            <div className="thr" aria-hidden="true">
                <i />
            </div>
            {children}
        </div>
    );
};

/** A section's numbered node on the spine. */
export const SpineNode: React.FC<{ n?: string; variant?: 'sm' | 'end' }> = ({ n, variant }) => (
    <span className={`nd${variant ? ` ${variant}` : ''}`} aria-hidden="true">
        {n}
    </span>
);

export default Spine;
