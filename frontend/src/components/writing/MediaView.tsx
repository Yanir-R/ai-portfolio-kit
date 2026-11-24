import React, { useEffect, useRef, useState } from 'react';
import { MediaItem } from '@/types/writing';

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
 * A short silent loop, the way LinkedIn shows an animated image: it plays,
 * muted and looped, only while on screen, and never starts under reduced
 * motion, where the poster stands in for it. No play button, because there is
 * nothing to listen to and nothing to wait for.
 */
const Clip: React.FC<{ item: MediaItem; className: string }> = ({ item, className }) => {
    const ref = useRef<HTMLVideoElement>(null);
    const [still] = useState(prefersReducedMotion);

    useEffect(() => {
        const video = ref.current;
        if (!video || still || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) video.play().catch(() => undefined);
                else video.pause();
            },
            { threshold: 0.25 }
        );
        observer.observe(video);
        return () => observer.disconnect();
    }, [still]);

    if (still && item.poster) {
        return <img src={item.poster} alt="" loading="lazy" className={className} />;
    }
    return (
        <video
            ref={ref}
            src={item.src}
            poster={item.poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className={className}
        />
    );
};

/** One media file of a piece, drawn by its kind. */
const MediaView: React.FC<{ item: MediaItem; className?: string; title?: string }> = ({
    item,
    className = 'w-full h-auto rounded border border-border',
    title,
}) => {
    if (item.kind === 'clip') return <Clip item={item} className={className} />;
    if (item.kind === 'video') {
        return (
            <video
                src={item.src}
                poster={item.poster}
                controls
                playsInline
                preload="none"
                title={title}
                className={className}
            />
        );
    }
    return <img src={item.src} alt="" loading="lazy" className={className} />;
};

export default MediaView;
