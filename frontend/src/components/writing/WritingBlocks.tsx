import React, { useState } from 'react';
import { Link } from 'react-router';
import MediaView from '@/components/writing/MediaView';
import { formatDuration } from '@/utils/date';
import { useWritingIndex } from '@/hooks/useWritingIndex';
import { ChatBlock } from '@/types/chat';
import { WritingEntry, WritingIndex, WritingSeries, sourceLabel } from '@/types/writing';

/*
 * The cards beside an answer that drew on the writing.
 *
 * Everything drawn here comes from the writing index, never from the model: the
 * server names slugs it found in the corpus, and the title, summary, quote, note
 * and media are read from the same index the blog page shows. A slug the index
 * does not know draws nothing.
 *
 * The cards follow the answer's language. A Hebrew answer gets Hebrew labels,
 * the Hebrew one-line summary and a right-to-left card; titles keep their own
 * direction, since half the posts are in English.
 */

type Lang = 'en' | 'he';

const L = {
    en: {
        read: 'Read',
        post: 'Post',
        article: 'Article',
        pieces: (n: number) => `${n} ${n === 1 ? 'piece' : 'pieces'}`,
        posts: (n: number) => `${n} posts`,
        recent: 'Latest',
        all: 'The blog',
        topic: 'On this subject',
        allTopic: 'All on this subject',
        allBlog: 'The whole blog',
        series: 'Series',
        toSeries: 'The series',
        video: 'Video',
        updated: 'Updated since',
        topics: 'What I write about',
    },
    he: {
        read: 'לקריאה',
        post: 'פוסט',
        article: 'מאמר',
        pieces: (n: number) => (n === 1 ? 'קטע אחד' : `${n} קטעים`),
        posts: (n: number) => `${n} פוסטים`,
        recent: 'אחרונים',
        all: 'הבלוג',
        topic: 'על הנושא',
        allTopic: 'לכל הקטעים בנושא',
        allBlog: 'לכל הבלוג',
        series: 'סדרה',
        toSeries: 'לסדרה',
        video: 'סרטון',
        updated: 'עודכן מאז',
        topics: 'על מה אני כותב',
    },
} as const;

const shortDate = (iso: string): string => {
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${Number(d)}.${Number(m)}.${y.slice(2)}` : iso;
};

const cardClass = 'mt-3 rounded border border-border bg-ink-800 p-3.5 min-w-0 break-words';
const metaClass = 'font-mono text-[0.68rem] leading-relaxed text-muted';
const linkClass =
    'rounded font-mono text-xs text-signal transition-colors hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-caution';

const Meta: React.FC<{ entry: WritingEntry; lang: Lang }> = ({ entry, lang }) => (
    <p className={metaClass}>
        {sourceLabel(entry.source, lang)} ·{' '}
        {entry.kind === 'article' ? L[lang].article : L[lang].post} ·{' '}
        <time dateTime={entry.date}>{shortDate(entry.date)}</time>
    </p>
);

const summaryOf = (entry: WritingEntry, lang: Lang): string | undefined =>
    lang === 'he' ? (entry.summary_he ?? entry.summary) : entry.summary;

const firstImage = (entry: WritingEntry): string | undefined => {
    const item = entry.media_items?.[0];
    if (!item) return undefined;
    return item.kind === 'image' ? item.src : item.poster;
};

/** One piece: what it is, a line on it, and a way in. */
const WritingCard: React.FC<{ entry: WritingEntry; lang: Lang }> = ({ entry, lang }) => {
    const image = firstImage(entry);
    const video = entry.media_items?.find((item) => item.kind === 'video');
    return (
        <div className={cardClass}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div className="min-w-0">
                    <Meta entry={entry} lang={lang} />
                    <Link
                        to={`/blog/${entry.slug}`}
                        dir="auto"
                        className="block mt-1 font-semibold leading-snug text-content transition-colors hover:text-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-caution rounded"
                    >
                        {entry.title}
                    </Link>
                </div>
                {image && (
                    <span className="relative self-start">
                        <img
                            src={image}
                            alt=""
                            loading="lazy"
                            className="object-cover w-14 h-14 rounded border border-border"
                        />
                        {video && (
                            <span className="absolute bottom-0.5 start-0.5 rounded bg-ink-900/90 px-1 font-mono text-[0.58rem] text-content">
                                ▶ {formatDuration(video.duration_s)}
                            </span>
                        )}
                    </span>
                )}
            </div>
            {summaryOf(entry, lang) && (
                <p className="mt-2 text-sm leading-relaxed text-muted">{summaryOf(entry, lang)}</p>
            )}
            {entry.quote && (
                <blockquote
                    dir="auto"
                    className="mt-2.5 border-s-2 border-signal/60 ps-3 text-sm italic leading-relaxed text-content"
                >
                    {entry.quote}
                </blockquote>
            )}
            {entry.note && (
                <p className="mt-2.5 rounded border border-caution/40 px-2.5 py-2 text-sm leading-relaxed text-content">
                    <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-caution">
                        {L[lang].updated}
                    </span>
                    {entry.note[lang]}
                </p>
            )}
            <p className="mt-2.5">
                <Link to={`/blog/${entry.slug}`} className={linkClass}>
                    {L[lang].read} {lang === 'he' ? '←' : '→'}
                </Link>
            </p>
        </div>
    );
};

const listTitle = (block: ChatBlock, index: WritingIndex, lang: Lang): string => {
    if (block.ref === 'recent') return L[lang].recent;
    if (block.ref === 'all') return L[lang].all;
    const topic = index.overview.topics.find((t) => t.id === block.ref);
    if (topic) return topic[lang];
    return L[lang].topic;
};

/** Several pieces, best first, with a way to the rest. */
const WritingList: React.FC<{ block: ChatBlock; index: WritingIndex; lang: Lang }> = ({
    block,
    index,
    lang,
}) => {
    const entries = (block.items ?? []).map((slug) => index.bySlug[slug]).filter(Boolean);
    if (entries.length === 0) return null;
    const total = block.total ?? entries.length;
    const topic = index.overview.topics.find((t) => t.id === block.ref);
    const more = topic ? `/blog?topic=${topic.id}` : '/blog';
    return (
        <div className={cardClass}>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-between items-baseline">
                <p className="font-mono text-xs uppercase tracking-wider text-content">
                    {listTitle(block, index, lang)}
                </p>
                <p className={metaClass}>{L[lang].pieces(total)}</p>
            </div>
            <ul className="mt-2 divide-y divide-border">
                {entries.map((entry) => (
                    <li key={entry.slug} className="py-2.5">
                        <Link
                            to={`/blog/${entry.slug}`}
                            dir="auto"
                            className="block font-semibold leading-snug text-content transition-colors hover:text-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-caution rounded"
                        >
                            {entry.title}
                        </Link>
                        <Meta entry={entry} lang={lang} />
                    </li>
                ))}
            </ul>
            <p className="mt-1">
                <Link to={more} className={linkClass}>
                    {topic ? L[lang].allTopic : L[lang].allBlog} {lang === 'he' ? '←' : '→'}
                </Link>
            </p>
        </div>
    );
};

/** A series as one card, with its video when it has one. */
export const SeriesCard: React.FC<{ series: WritingSeries; lang: Lang; className?: string }> = ({
    series,
    lang,
    className = cardClass,
}) => {
    const [playing, setPlaying] = useState(false);
    const video = series.video;
    return (
        <div className={className}>
            {video && (
                <div className="mb-3">
                    {playing ? (
                        <MediaView
                            item={{ ...video, kind: 'video' }}
                            title={series.title}
                            className="w-full h-auto rounded border border-border"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setPlaying(true)}
                            className="relative block w-full rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-caution"
                            aria-label={`${L[lang].video} · ${series.title}`}
                        >
                            <img
                                src={video.poster}
                                alt=""
                                loading="lazy"
                                className="w-full h-auto rounded border border-border"
                            />
                            <span className="absolute bottom-2 start-2 rounded border border-border bg-ink-900/90 px-2 py-1 font-mono text-xs text-content">
                                ▶ {L[lang].video} · {formatDuration(video.duration_s)}
                            </span>
                        </button>
                    )}
                </div>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-between items-baseline">
                <p className="font-mono text-xs uppercase tracking-wider text-muted">
                    {L[lang].series}
                </p>
                <p className={metaClass}>{L[lang].posts(series.count)}</p>
            </div>
            <Link
                to={`/blog?series=${series.id}`}
                className="block mt-1 font-semibold leading-snug text-content transition-colors hover:text-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-caution rounded"
            >
                {lang === 'he' ? series.title_he : series.title}
            </Link>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {lang === 'he' ? series.summary_he : series.summary}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                <Link to={`/blog?series=${series.id}`} className={linkClass}>
                    {L[lang].toSeries} {lang === 'he' ? '←' : '→'}
                </Link>
                {(series.links ?? []).map((href) => (
                    <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                    >
                        {href.replace(/^https:\/\//, '')} ↗
                    </a>
                ))}
            </p>
        </div>
    );
};

/** The subjects written about, each opening its list on the blog. */
export const TopicChips: React.FC<{ index: WritingIndex; lang: Lang; ids?: string[] }> = ({
    index,
    lang,
    ids,
}) => {
    const topics = ids
        ? ids.map((id) => index.overview.topics.find((t) => t.id === id)).filter(Boolean)
        : index.overview.topics;
    return (
        <ul className="flex flex-wrap gap-2">
            {topics.map((topic) =>
                topic ? (
                    <li key={topic.id}>
                        <Link
                            to={`/blog?topic=${topic.id}`}
                            className="inline-flex gap-1.5 items-center px-2.5 py-1 text-sm rounded border transition-colors border-border bg-ink-700 text-content hover:border-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-caution"
                        >
                            {topic[lang]}
                            <span className="font-mono text-xs text-muted">{topic.count}</span>
                        </Link>
                    </li>
                ) : null
            )}
        </ul>
    );
};

const WritingBlocks: React.FC<{ blocks?: ChatBlock[]; lang?: 'en' | 'he' | null }> = ({
    blocks,
    lang,
}) => {
    const index = useWritingIndex();
    if (!blocks?.length || !index) return null;
    const language: Lang = lang === 'he' ? 'he' : 'en';

    return (
        <div dir={language === 'he' ? 'rtl' : 'ltr'} lang={language}>
            {blocks.map((block, i) => {
                const key = `${block.type}-${block.ref}-${i}`;
                if (block.type === 'writing') {
                    const entry = index.bySlug[block.ref];
                    return entry ? <WritingCard key={key} entry={entry} lang={language} /> : null;
                }
                if (block.type === 'writing_list') {
                    return <WritingList key={key} block={block} index={index} lang={language} />;
                }
                if (block.type === 'writing_series') {
                    const series = index.overview.series.find((s) => s.id === block.ref);
                    return series ? <SeriesCard key={key} series={series} lang={language} /> : null;
                }
                if (block.type === 'writing_topics') {
                    return (
                        <div key={key} className={cardClass}>
                            <p className="mb-2.5 font-mono text-xs uppercase tracking-wider text-content">
                                {L[language].topics}
                            </p>
                            <TopicChips
                                index={index}
                                lang={language}
                                ids={block.items ?? undefined}
                            />
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
};

export default WritingBlocks;
