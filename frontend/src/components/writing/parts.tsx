import React from 'react';
import { WRITING } from '@/copy/writing';
import { useLang } from '@/i18n/useLang';
import { MediaItem, WritingEntry } from '@/types/writing';
import { coverOf, isEnglishTitle } from '@/utils/writing';
import { formatDuration } from '@/utils/date';

/** A small label: `a` accent (kind, series), `n` neutral (source, date), `i` topic. */
export const Tag: React.FC<{ tone: 'a' | 'n' | 'i' | 'ok'; children: React.ReactNode }> = ({
    tone,
    children,
}) => <span className={`w-tag ${tone}`}>{children}</span>;

/** The play triangle on a video cover. */
export const PlayMark: React.FC<{ label: string }> = ({ label }) => (
    <span className="w-pl">
        <svg viewBox="0 0 10 12" width="10" height="12" aria-hidden="true">
            <path d="M0 0l10 6-10 6z" fill="currentColor" />
        </svg>
        {label}
    </span>
);

/** "Video · 0:48" for a cover, when the length is known. */
export const useVideoLabel = () => {
    const { t } = useLang();
    const tags = t(WRITING).tags;
    return (video: MediaItem) => {
        const length = formatDuration(video.duration_s);
        return length ? `${tags.video} · ${length}` : tags.video;
    };
};

/** A piece's cover image, with the video mark when the cover is a video's poster. */
export const Cover: React.FC<{ entry: WritingEntry }> = ({ entry }) => {
    const videoLabel = useVideoLabel();
    const cover = coverOf(entry);
    if (!cover) return null;
    return (
        <span className="w-imgw">
            <img className="w-img" src={cover.src} alt="" loading="lazy" />
            {cover.video?.kind === 'video' && <PlayMark label={videoLabel(cover.video)} />}
        </span>
    );
};

/** A piece's title in its own language and direction, whatever the page's language. */
export const EntryTitle: React.FC<{ entry: WritingEntry; as?: 'b' | 'h1' | 'h3' | 'h4' }> = ({
    entry,
    as: Tagname = 'b',
}) => {
    const { lang } = useLang();
    if (isEnglishTitle(entry))
        return (
            <Tagname className="w-en" lang="en">
                {entry.title}
            </Tagname>
        );
    return lang === 'he' ? (
        <Tagname>{entry.title}</Tagname>
    ) : (
        <Tagname lang="he" dir="rtl">
            {entry.title}
        </Tagname>
    );
};
