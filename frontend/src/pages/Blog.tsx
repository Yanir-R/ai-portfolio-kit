import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { WRITING } from '@/copy/writing';
import { Arrow } from '@/components/site/Arrow';
import HowPanel from '@/components/writing/HowPanel';
import PostArticle from '@/components/writing/PostArticle';
import SidePanel from '@/components/writing/SidePanel';
import { Cover, EntryTitle, PlayMark, Tag, useVideoLabel } from '@/components/writing/parts';
import { useWritingIndexState } from '@/hooks/useWritingIndex';
import { useLang } from '@/i18n/useLang';
import { sourceLabel, WritingEntry, WritingIndex, WritingSeries } from '@/types/writing';
import { formatDate } from '@/utils/date';
import {
    isEnglishTitle,
    longVersionOf,
    readMinutes,
    searchTextOf,
    summaryOf,
} from '@/utils/writing';

/*
 * The blog: a search and topic index beside three sections (articles, the
 * series, and posts by year). Filters live in the address, so a chat card can
 * link to "everything on memory" and the link can be shared. A post opens in
 * a panel over the list (Back closes it); an article opens its own page.
 */

type Kind = WritingEntry['kind'];
const PARAM = { topic: 'topic', kind: 'kind', series: 'series', read: 'read' } as const;

const byDate = (a: WritingEntry, b: WritingEntry) => b.date.localeCompare(a.date);

/** The index beside the list: search, topics ranked by how much was written, and a kind switch. */
const Filters: React.FC<{
    index: WritingIndex;
    query: string;
    onQuery: (q: string) => void;
    topic: string;
    kind: string;
    onToggle: (param: 'topic' | 'kind', value: string) => void;
    shown: number;
    onClear: () => void;
}> = ({ index, query, onQuery, topic, kind, onToggle, shown, onClear }) => {
    const { lang, t } = useLang();
    const copy = t(WRITING);
    const max = Math.max(1, ...index.overview.topics.map((tp) => tp.count));
    const counts = (k: Kind) => index.entries.filter((e) => e.kind === k).length;
    const filtered = !!(query || topic || kind);
    return (
        <aside className="w-idx" aria-label={copy.blog.searchLabel}>
            <div className="w-find">
                <form onSubmit={(e) => e.preventDefault()}>
                    <span className="fx">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#0C1A44"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            aria-hidden="true"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="M20 20l-3.6-3.6" />
                        </svg>
                        <input
                            id="q"
                            type="search"
                            autoComplete="off"
                            spellCheck={false}
                            value={query}
                            onChange={(e) => onQuery(e.target.value)}
                            aria-label={copy.blog.searchLabel}
                            placeholder={copy.blog.searchLabel}
                        />
                        {query && (
                            <button
                                type="button"
                                id="qx"
                                aria-label={copy.blog.clearSearch}
                                onClick={() => onQuery('')}
                            >
                                ✕
                            </button>
                        )}
                    </span>
                </form>
            </div>
            <h2>{copy.blog.topicsTitle}</h2>
            <div className="tl">
                {index.overview.topics.map((tp) => (
                    <button
                        key={tp.id}
                        type="button"
                        aria-pressed={topic === tp.id}
                        style={
                            {
                                '--w': `${Math.round((tp.count / max) * 100)}%`,
                            } as React.CSSProperties
                        }
                        onClick={() => onToggle('topic', tp.id)}
                    >
                        <span>{tp[lang]}</span>
                        <b>{tp.count}</b>
                        <i />
                    </button>
                ))}
            </div>
            <div className="kd">
                {(['article', 'post'] as const).map((k) => (
                    <button
                        key={k}
                        type="button"
                        aria-pressed={kind === k}
                        onClick={() => onToggle('kind', k)}
                    >
                        {copy.blog.kinds[k]} <b>{counts(k)}</b>
                    </button>
                ))}
            </div>
            <p className="st">
                <b aria-live="polite">
                    {filtered
                        ? copy.blog.showing(shown, index.entries.length)
                        : copy.blog.all(index.entries.length)}
                </b>
                {filtered && (
                    <button type="button" id="clr" onClick={onClear}>
                        {copy.blog.clear}
                    </button>
                )}
            </p>
        </aside>
    );
};

const ArticleCard: React.FC<{ entry: WritingEntry; index: WritingIndex }> = ({ entry, index }) => {
    const { lang, t, to } = useLang();
    const copy = t(WRITING);
    return (
        <article className="w-art">
            <Cover entry={entry} />
            <div className="mt">
                <Tag tone="a">{copy.tags.article}</Tag>
                <Tag tone="n">{sourceLabel(entry.source, lang)}</Tag>
                {isEnglishTitle(entry) && lang === 'he' && <Tag tone="n">{copy.tags.english}</Tag>}
                <time dateTime={entry.date}>{formatDate(entry.date, lang)}</time>
            </div>
            <EntryTitle entry={entry} as="h3" />
            {summaryOf(entry, lang) && <p>{summaryOf(entry, lang)}</p>}
            <TopicTags entry={entry} index={index} className="tp" />
            <div className="ft">
                <span className="rd">{copy.readMinutes(readMinutes(entry))}</span>
                <Link className="w-out" to={to(`/blog/${entry.slug}`)}>
                    <Arrow>{copy.read}</Arrow>
                </Link>
            </div>
        </article>
    );
};

const TopicTags: React.FC<{
    entry: WritingEntry;
    index: WritingIndex;
    className: string;
    children?: React.ReactNode;
}> = ({ entry, index, className, children }) => {
    const { lang } = useLang();
    return (
        <div className={className}>
            {children}
            {(entry.topics ?? []).flatMap((id) =>
                index.overview.topics
                    .filter((tp) => tp.id === id)
                    .map((tp) => (
                        <Tag key={tp.id} tone="i">
                            {tp[lang]}
                        </Tag>
                    ))
            )}
        </div>
    );
};

/** A series: its header and video, then each part as a small card. */
const SeriesBlock: React.FC<{
    series: WritingSeries;
    parts: WritingEntry[];
    onRead: (slug: string) => void;
}> = ({ series, parts, onRead }) => {
    const { lang, t } = useLang();
    const copy = t(WRITING);
    const videoLabel = useVideoLabel();
    const [playing, setPlaying] = useState(false);
    const video = series.video;
    const label = (slug: string) => {
        const part = series.parts.find((p) => p.slug === slug);
        return part ? (lang === 'he' ? part.label_he : part.label) : '';
    };
    return (
        <div className="w-ser">
            <div className="sh">
                <div className="hd">
                    <Tag tone="a">{copy.tags.series}</Tag>
                    <Tag tone="n">{copy.posts(series.count)}</Tag>
                    {parts[0] && <Tag tone="n">{sourceLabel(parts[0].source, lang)}</Tag>}
                    <b>{lang === 'he' ? series.title_he : series.title}</b>
                    <p>
                        {lang === 'he' ? series.summary_he : series.summary}{' '}
                        {(series.links ?? []).map((href) => (
                            <React.Fragment key={href}>
                                {' '}
                                <a className="w-out" href={href} target="_blank" rel="noopener">
                                    {href.replace(/^https:\/\//, '')} ↗︎
                                </a>
                            </React.Fragment>
                        ))}
                    </p>
                </div>
                {video &&
                    (playing ? (
                        <video
                            className="w-v"
                            src={video.src}
                            poster={video.poster}
                            controls
                            autoPlay
                            playsInline
                        />
                    ) : (
                        <button
                            type="button"
                            className="w-vid"
                            aria-label={`${copy.blog.series.playLabel}: ${lang === 'he' ? series.title_he : series.title}`}
                            onClick={() => setPlaying(true)}
                        >
                            <img src={video.poster} alt="" loading="lazy" />
                            <PlayMark
                                label={`${copy.blog.series.watch} · ${videoLabel(video).split(' · ')[1] ?? ''}`}
                            />
                        </button>
                    ))}
            </div>
            <div className="g">
                {parts.map((entry) => (
                    <a
                        key={entry.slug}
                        className="w-ep"
                        href={`?${PARAM.read}=${entry.slug}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onRead(entry.slug);
                        }}
                    >
                        <Cover entry={entry} />
                        <span className="k">
                            <Tag tone="a">{label(entry.slug)}</Tag>
                            <time dateTime={entry.date}>{formatDate(entry.date, lang)}</time>
                        </span>
                        <EntryTitle entry={entry} />
                        {summaryOf(entry, lang) && <p>{summaryOf(entry, lang)}</p>}
                    </a>
                ))}
            </div>
        </div>
    );
};

const PostRow: React.FC<{
    entry: WritingEntry;
    index: WritingIndex;
    onRead: (slug: string) => void;
}> = ({ entry, index, onRead }) => {
    const { lang, t, to } = useLang();
    const copy = t(WRITING);
    const long = longVersionOf(entry, index);
    const hasCover = !!(entry.media_items?.length || entry.media?.length);
    const read = (e: React.MouseEvent) => {
        e.preventDefault();
        onRead(entry.slug);
    };
    const href = `?${PARAM.read}=${entry.slug}`;
    return (
        <div className={hasCover ? 'w-row hi' : 'w-row'}>
            <time dateTime={entry.date}>{formatDate(entry.date, lang)}</time>
            <div>
                <a className="w-lnk" href={href} onClick={read}>
                    <EntryTitle entry={entry} />
                </a>
                {summaryOf(entry, lang) && <p>{summaryOf(entry, lang)}</p>}
                <TopicTags entry={entry} index={index} className="tg2">
                    <Tag tone="n">{sourceLabel(entry.source, lang)}</Tag>
                    {long && (
                        <span className="rel">
                            {copy.blog.shortOf}{' '}
                            <Link to={to(`/blog/${long.slug}`)}>{long.title}</Link>
                        </span>
                    )}
                </TopicTags>
            </div>
            {hasCover && <Cover entry={entry} />}
            <a className="w-out" href={href} onClick={read}>
                <Arrow>{copy.read}</Arrow>
            </a>
        </div>
    );
};

const Blog: React.FC = () => {
    const { t, to } = useLang();
    const copy = t(WRITING);
    const navigate = useNavigate();
    const { index, failed } = useWritingIndexState();
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [howOpen, setHowOpen] = useState(false);
    const topic = params.get(PARAM.topic) ?? '';
    const kind = params.get(PARAM.kind) ?? '';
    const seriesId = params.get(PARAM.series) ?? '';
    const reading = params.get(PARAM.read) ?? '';

    const setParam = (name: string, value: string, push = false) => {
        const next = new URLSearchParams(params);
        if (value) next.set(name, value);
        else next.delete(name);
        setParams(next, { replace: !push, preventScrollReset: true });
    };
    const toggle = (name: 'topic' | 'kind', value: string) =>
        setParam(name, params.get(name) === value ? '' : value);
    const clear = () => {
        setQuery('');
        setParams({}, { replace: true, preventScrollReset: true });
    };

    const shown = useMemo(() => {
        if (!index) return [];
        const needle = query.trim().toLowerCase();
        const series = index.overview.series.find((s) => s.id === seriesId);
        return [...index.entries]
            .sort(byDate)
            .filter(
                (e) =>
                    (!kind || e.kind === kind) &&
                    (!topic || e.topics?.includes(topic)) &&
                    (!series || series.parts.some((p) => p.slug === e.slug)) &&
                    (!needle || searchTextOf(e).includes(needle))
            );
    }, [index, query, kind, topic, seriesId]);

    if (!index)
        return failed ? (
            <div className="w-hero">
                <div>
                    <span className="tagline">{copy.blog.tagline}</span>
                    <h1>{copy.blog.failed.title}</h1>
                </div>
                <p>{copy.blog.failed.text}</p>
            </div>
        ) : (
            <p className="state-note" role="status">
                {copy.blog.loading}
            </p>
        );

    const inSeries = new Set(index.overview.series.flatMap((s) => s.parts.map((p) => p.slug)));
    const articles = shown.filter((e) => e.kind === 'article');
    const seriesShown = index.overview.series
        .map((s) => ({
            series: s,
            parts: shown.filter((e) => s.parts.some((p) => p.slug === e.slug)),
        }))
        .filter((s) => s.parts.length > 0);
    const posts = shown.filter((e) => e.kind === 'post' && !inSeries.has(e.slug));
    const years = [...new Set(posts.map((e) => e.date.slice(0, 4)))];
    const openPost = (slug: string) => setParam(PARAM.read, slug, true);
    const reader = reading ? index.bySlug[reading] : undefined;
    const q = query.trim();

    return (
        <>
            <div className="w-hero">
                <div>
                    <span className="tagline">{copy.blog.tagline}</span>
                    <h1>
                        {copy.blog.title} <em>{copy.blog.em}</em>
                    </h1>
                </div>
                <p>
                    {copy.blog.lead}{' '}
                    <button type="button" className="hw" onClick={() => setHowOpen(true)}>
                        {copy.blog.how}
                    </button>
                </p>
            </div>
            <div className="w-lay">
                <Filters
                    index={index}
                    query={query}
                    onQuery={setQuery}
                    topic={topic}
                    kind={kind}
                    onToggle={toggle}
                    shown={shown.length}
                    onClear={clear}
                />
                <div className="w-main">
                    {articles.length > 0 && (
                        <div id="sec-a">
                            <div className="w-sec">
                                <h2>{copy.blog.articles.title}</h2>
                                <span>{copy.blog.articles.note}</span>
                            </div>
                            <div className="w-arts">
                                {articles.map((entry) => (
                                    <ArticleCard key={entry.slug} entry={entry} index={index} />
                                ))}
                            </div>
                        </div>
                    )}
                    {seriesShown.length > 0 && (
                        <div id="sec-s">
                            <div className="w-sec">
                                <h2>{copy.blog.series.title}</h2>
                                <span>{copy.blog.series.note}</span>
                            </div>
                            {seriesShown.map(({ series, parts }) => (
                                <SeriesBlock
                                    key={series.id}
                                    series={series}
                                    parts={parts}
                                    onRead={openPost}
                                />
                            ))}
                        </div>
                    )}
                    {posts.length > 0 && (
                        <div id="sec-p">
                            <div className="w-sec">
                                <h2>{copy.blog.postsSection.title}</h2>
                                <span>{copy.blog.postsSection.note}</span>
                            </div>
                            <div className="w-list">
                                {years.map((year) => (
                                    <React.Fragment key={year}>
                                        <div className="w-yr">{year}</div>
                                        {posts
                                            .filter((e) => e.date.startsWith(year))
                                            .map((entry) => (
                                                <PostRow
                                                    key={entry.slug}
                                                    entry={entry}
                                                    index={index}
                                                    onRead={openPost}
                                                />
                                            ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                    {shown.length === 0 && (
                        <div className="w-none">
                            <h3>
                                {q ? copy.blog.none.searchTitle(q) : copy.blog.none.filterTitle}
                            </h3>
                            <p>{q ? copy.blog.none.searchText : copy.blog.none.filterText}</p>
                            <div className="r">
                                <button
                                    type="button"
                                    className="go"
                                    onClick={() =>
                                        navigate(to('/'), { state: { ask: q || undefined } })
                                    }
                                >
                                    {q ? copy.blog.none.askAbout(q) : copy.blog.none.ask}
                                </button>
                                <button type="button" className="lk" onClick={clear}>
                                    {copy.blog.none.clear}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {reader && (
                <SidePanel
                    label={copy.panel.label}
                    closeLabel={copy.panel.close}
                    onClose={() => setParam(PARAM.read, '')}
                    header={
                        <Link to={to(`/blog/${reader.slug}`)}>
                            <Arrow>{copy.panel.full}</Arrow>
                        </Link>
                    }
                >
                    <PostArticle key={reader.slug} entry={reader} index={index} />
                </SidePanel>
            )}
            {howOpen && <HowPanel onClose={() => setHowOpen(false)} />}
        </>
    );
};

export default Blog;
