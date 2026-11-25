import React, { useState } from 'react';
import { Link } from 'react-router';
import { WRITING } from '@/copy/writing';
import Markdown from '@/components/Markdown';
import MediaView from '@/components/writing/MediaView';
import AskDock from '@/components/writing/AskDock';
import PostChatLayer from '@/components/writing/PostChatLayer';
import { PHONE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useHistoryLayer } from '@/hooks/usePhoneLayer';
import { EntryTitle, Tag } from '@/components/writing/parts';
import { ARROW } from '@/components/site/Arrow';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { useLang } from '@/i18n/useLang';
import { stripWritingMetadata } from '@/services/writingService';
import { sourceLabel, WritingEntry, WritingIndex } from '@/types/writing';
import { formatDate } from '@/utils/date';
import { mediaOf, readMinutes, seriesOf } from '@/utils/writing';

// The workplace blog is credited in words only; its site is not linked.
const UNLINKED_SOURCE = /blog/i;
const LINKEDIN_URL = /^https:\/\/(www\.)?linkedin\.com\//;

/** LinkedIn's "in" mark, drawn inline so no third-party image is loaded. */
const LinkedInMark: React.FC = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <rect width="24" height="24" rx="3" fill="#0A66C2" />
        <path
            fill="#fff"
            d="M5.3 9.2h2.9v9.4H5.3zM6.8 4.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM10.1 9.2h2.8v1.3c.4-.7 1.3-1.5 2.8-1.5 3 0 3.5 2 3.5 4.5v5.1h-2.9v-4.5c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4v4.6h-2.9z"
        />
    </svg>
);

interface Neighbour {
    to: string;
    small: string;
    title: string;
}

/** The piece before and after this one: in its series when it has one, else in the blog's order. */
const useNeighbours = (
    entry: WritingEntry,
    index: WritingIndex | null
): [Neighbour, Neighbour] | null => {
    const { lang, t, to } = useLang();
    const copy = t(WRITING).post;
    if (!index) return null;
    const series = seriesOf(entry, index);
    if (series && entry.series) {
        const at = entry.series.position - 1;
        const prev = series.parts[at - 1];
        const next = series.parts[at + 1];
        const title = lang === 'he' ? series.title_he : series.title;
        const label = (slug: string) => index.bySlug[slug]?.title ?? slug;
        return [
            prev
                ? {
                      to: to(`/blog/${prev.slug}`),
                      small: copy.previousInSeries,
                      title: label(prev.slug),
                  }
                : { to: to('/blog'), small: copy.firstPiece, title: copy.allBlog },
            next
                ? {
                      to: to(`/blog/${next.slug}`),
                      small: copy.nextInSeries,
                      title: label(next.slug),
                  }
                : {
                      to: to(`/blog?series=${series.id}`),
                      small: copy.endOfSeries,
                      title: copy.allSeries(title),
                  },
        ];
    }
    // The blog lists newest first: the previous piece is the next one down.
    const i = index.entries.findIndex((e) => e.slug === entry.slug);
    const older = index.entries[i + 1];
    const newer = i > 0 ? index.entries[i - 1] : undefined;
    return [
        older
            ? { to: to(`/blog/${older.slug}`), small: copy.previous, title: older.title }
            : { to: to('/blog'), small: copy.firstPiece, title: copy.allBlog },
        newer
            ? { to: to(`/blog/${newer.slug}`), small: copy.next, title: newer.title }
            : { to: to('/blog'), small: copy.lastPiece, title: copy.allBlog },
    ];
};

/*
 * One piece, read in full: its tags, title, byline, media, the text, where
 * it was first published, the pieces around it, and a way to ask about it.
 * Used by a piece's own page and by the reading panel on the blog.
 */
interface Props {
    entry: WritingEntry;
    index: WritingIndex | null;
    /** The piece's own page (not the blog's reading panel): on a phone its chat is a layer. */
    page?: boolean;
}

const PostArticle: React.FC<Props> = ({ entry, index, page = false }) => {
    const { lang, t, to } = useLang();
    const copy = t(WRITING);
    const { openContact } = useSiteDialogs();
    const [asking, setAsking] = useState(false);
    // On a phone, on the piece's own page, the chat opens as a full-screen
    // layer (a history entry, so Back and the X return to this spot).
    const phone = useMediaQuery(PHONE_QUERY);
    const layer = useHistoryLayer('postChat', phone && page);
    const [started, setStarted] = useState(false);
    const openLayer = () => {
        setStarted(true);
        layer.show();
    };
    const inLayer = phone && page;
    const neighbours = useNeighbours(entry, index);
    const series = seriesOf(entry, index);
    const media = mediaOf(entry);
    const [lead, ...rest] = media;
    const date = formatDate(entry.date, lang);
    const topics = (entry.topics ?? []).flatMap(
        (id) => index?.overview.topics.filter((tp) => tp.id === id) ?? []
    );

    return (
        <article className="w-post">
            <Link className="w-back" to={to('/blog')}>
                {ARROW[lang === 'he' ? 'en' : 'he']} {copy.post.back}
            </Link>
            <div className="mt">
                <Tag tone={entry.kind === 'article' ? 'a' : 'n'}>{copy.tags[entry.kind]}</Tag>
                {series && entry.series && (
                    <Tag tone="a">
                        {copy.post.seriesTag(
                            lang === 'he' ? series.title_he : series.title,
                            lang === 'he' ? entry.series.label_he : entry.series.label
                        )}
                    </Tag>
                )}
                {topics.map((topic) => (
                    <Tag key={topic.id} tone="i">
                        {topic[lang]}
                    </Tag>
                ))}
            </div>
            <EntryTitle entry={entry} as="h1" />
            <div className="by">
                {copy.post.byName} · {date} · {copy.readMinutes(readMinutes(entry))}
            </div>
            {lead &&
                (lead.kind === 'image' ? (
                    <span className="w-imgw">
                        <img className="w-img" src={lead.src} alt="" />
                    </span>
                ) : (
                    <MediaView item={lead} title={entry.title} />
                ))}
            <div className="w-body" dir="auto">
                <Markdown>{stripWritingMetadata(entry.content)}</Markdown>
                {rest.map((item) => (
                    <MediaView key={item.src} item={item} title={entry.title} />
                ))}
                {entry.url && LINKEDIN_URL.test(entry.url) ? (
                    // One way back to the post: a tile carrying LinkedIn's mark.
                    <div className="w-orig" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span>{copy.post.publishedOn(date)}</span>
                        <a className="w-src" href={entry.url} target="_blank" rel="noopener">
                            <LinkedInMark />
                            {copy.post.originalLinkedIn}
                        </a>
                    </div>
                ) : (
                    <div className="w-orig" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span>{copy.post.published(sourceLabel(entry.source, lang), date)}</span>
                        {entry.url && !UNLINKED_SOURCE.test(entry.source) && (
                            <a href={entry.url} target="_blank" rel="noopener">
                                {copy.post.original}
                            </a>
                        )}
                    </div>
                )}
            </div>
            {neighbours && (
                <div className="w-pn">
                    {neighbours.map((n) => (
                        <Link key={n.small} to={n.to}>
                            <small>{n.small}</small>
                            <b dir="auto">{n.title}</b>
                        </Link>
                    ))}
                </div>
            )}
            <div className="w-end">
                <b>{copy.ask.title}</b>
                <span className="ac">
                    <button
                        type="button"
                        className="w-chip"
                        aria-expanded={inLayer ? undefined : asking}
                        onClick={inLayer ? openLayer : () => setAsking((open) => !open)}
                    >
                        {copy.ask.open}
                    </button>
                    <button
                        type="button"
                        className="btn sm"
                        onClick={() => openContact({ kind: 'call', topic: entry.title })}
                    >
                        {copy.ask.book}
                    </button>
                </span>
                {asking && !inLayer && <AskDock entry={entry} />}
            </div>
            {inLayer && (
                <PostChatLayer
                    entry={entry}
                    open={layer.open}
                    started={started}
                    onOpen={openLayer}
                    onClose={layer.close}
                />
            )}
        </article>
    );
};

export default PostArticle;
