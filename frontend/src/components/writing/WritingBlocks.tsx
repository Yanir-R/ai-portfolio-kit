import React from 'react';
import { Link } from 'react-router';
import { WRITING } from '@/copy/writing';
import { useWritingIndex } from '@/hooks/useWritingIndex';
import { useLang } from '@/i18n/useLang';
import { Arrow } from '@/components/site/Arrow';
import { Cover, EntryTitle, PlayMark, Tag, useVideoLabel } from '@/components/writing/parts';
import { ChatBlock } from '@/types/chat';
import { sourceLabel, WritingEntry, WritingIndex, WritingSeries } from '@/types/writing';
import { formatDate } from '@/utils/date';
import { summaryOf } from '@/utils/writing';

/*
 * The cards under an answer that drew on the writing.
 *
 * Everything drawn here comes from the writing index, never from the model:
 * the server names slugs it found in the corpus, and the title, summary,
 * quote, note and media are read from the same index the blog shows. A slug
 * the index does not know draws nothing.
 */

/** One piece: what it is, a line on it, an exact quote when there is one, and a way in. */
const WritingCard: React.FC<{ entry: WritingEntry }> = ({ entry }) => {
    const { lang, t, to } = useLang();
    const copy = t(WRITING);
    return (
        <div className="w-card">
            <Cover entry={entry} />
            <div className="mt">
                <Tag tone={entry.kind === 'article' ? 'a' : 'n'}>{copy.tags[entry.kind]}</Tag>
                <Tag tone="n">{sourceLabel(entry.source, lang)}</Tag>
                <time dateTime={entry.date}>{formatDate(entry.date, lang)}</time>
            </div>
            <EntryTitle entry={entry} />
            {!entry.note && summaryOf(entry, lang) && <p>{summaryOf(entry, lang)}</p>}
            {entry.quote && (
                <div className="w-q" dir="auto">
                    {entry.quote}
                </div>
            )}
            {entry.note && (
                <div className="w-old">
                    <Tag tone="a">{copy.tags.updated}</Tag>
                    <span>{entry.note[lang]}</span>
                </div>
            )}
            <Link className="w-out" to={to(`/blog/${entry.slug}`)}>
                <Arrow>{copy.read}</Arrow>
            </Link>
        </div>
    );
};

const listTitle = (block: ChatBlock, index: WritingIndex, lang: 'he' | 'en'): string => {
    const cards = WRITING[lang].cards;
    if (block.ref === 'recent') return cards.recent;
    if (block.ref === 'all') return cards.all;
    return index.overview.topics.find((topic) => topic.id === block.ref)?.[lang] ?? cards.topic;
};

/** Several pieces, best first, with a way to the rest. */
const WritingList: React.FC<{ block: ChatBlock; index: WritingIndex }> = ({ block, index }) => {
    const { lang, t, to } = useLang();
    const copy = t(WRITING);
    const entries = (block.items ?? []).map((slug) => index.bySlug[slug]).filter(Boolean);
    if (entries.length === 0) return null;
    const topic = index.overview.topics.find((tp) => tp.id === block.ref);
    return (
        <div className="w-lc">
            <div className="hd">
                <span>{listTitle(block, index, lang)}</span>
                <Tag tone="i">{copy.pieces(block.total ?? entries.length)}</Tag>
            </div>
            {entries.map((entry) => (
                <Link key={entry.slug} className="it" to={to(`/blog/${entry.slug}`)}>
                    <EntryTitle entry={entry} />
                    <time dateTime={entry.date}>{formatDate(entry.date, lang)}</time>
                    <span className="s">
                        {sourceLabel(entry.source, lang)} · {copy.tags[entry.kind]}
                    </span>
                </Link>
            ))}
            <div className="ft">
                <Link className="w-out" to={to(topic ? `/blog?topic=${topic.id}` : '/blog')}>
                    <Arrow>{topic ? copy.cards.allTopic : copy.cards.allBlog}</Arrow>
                </Link>
            </div>
        </div>
    );
};

/** A series as one card, with its video's cover when it has one. */
const SeriesCard: React.FC<{ series: WritingSeries }> = ({ series }) => {
    const { lang, t, to } = useLang();
    const copy = t(WRITING);
    const videoLabel = useVideoLabel();
    const video = series.video;
    return (
        <div className="w-card">
            {video && (
                <span className="w-imgw">
                    <img className="w-img" src={video.poster} alt="" loading="lazy" />
                    <PlayMark label={videoLabel(video)} />
                </span>
            )}
            <div className="mt">
                <Tag tone="a">{copy.tags.series}</Tag>
                <Tag tone="n">{copy.posts(series.count)}</Tag>
            </div>
            <b>{lang === 'he' ? series.title_he : series.title}</b>
            <p>{lang === 'he' ? series.summary_he : series.summary}</p>
            <Link className="w-out" to={to(`/blog?series=${series.id}`)}>
                <Arrow>{copy.cards.toSeries}</Arrow>
            </Link>
        </div>
    );
};

/** The subjects written about, each opening its list on the blog. */
const TopicChips: React.FC<{ index: WritingIndex; ids?: string[] }> = ({ index, ids }) => {
    const { lang, t, to } = useLang();
    const topics = ids
        ? ids.flatMap((id) => index.overview.topics.filter((topic) => topic.id === id))
        : index.overview.topics;
    return (
        <>
            {t(WRITING).cards.topics}:
            <div className="w-tp">
                {topics.map((topic) => (
                    <Link key={topic.id} className="w-chip" to={to(`/blog?topic=${topic.id}`)}>
                        {topic[lang]}
                        <small>{topic.count}</small>
                    </Link>
                ))}
            </div>
        </>
    );
};

const WritingBlocks: React.FC<{ blocks?: ChatBlock[] }> = ({ blocks }) => {
    const index = useWritingIndex();
    if (!blocks?.length || !index) return null;
    return (
        <>
            {blocks.map((block, i) => {
                const key = `${block.type}-${block.ref}-${i}`;
                if (block.type === 'writing') {
                    const entry = index.bySlug[block.ref];
                    return entry ? <WritingCard key={key} entry={entry} /> : null;
                }
                if (block.type === 'writing_list')
                    return <WritingList key={key} block={block} index={index} />;
                if (block.type === 'writing_series') {
                    const series = index.overview.series.find((s) => s.id === block.ref);
                    return series ? <SeriesCard key={key} series={series} /> : null;
                }
                if (block.type === 'writing_topics')
                    return <TopicChips key={key} index={index} ids={block.items ?? undefined} />;
                return null;
            })}
        </>
    );
};

export default WritingBlocks;
