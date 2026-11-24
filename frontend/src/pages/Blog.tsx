import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { SeriesCard, TopicChips } from '@/components/writing/WritingBlocks';
import { stripWritingMetadata, writingService } from '@/services/writingService';
import { sourceLabel, WritingIndex, WRITING_KIND_LABEL, WRITING_KIND_STYLE } from '@/types/writing';
import { formatIsoDate } from '@/utils/date';

/*
 * The writing index.
 *
 * A dated list rather than a grid of cards. These pieces were published in two
 * places and two lengths, and the thing a reader needs first is when it was
 * written and how long it is - not a thumbnail. Date, kind, title, one line.
 *
 * Articles and posts share the list on purpose. Separating them into sections
 * would ask the reader to care about where something was published before they
 * know whether it interests them, and the `kind` chip already answers that for
 * anyone who does.
 */
const Blog: React.FC = () => {
    const [index, setIndex] = useState<WritingIndex | null>(null);
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [showAllTopics, setShowAllTopics] = useState(false);
    const topicId = params.get('topic');
    const seriesId = params.get('series');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchWriting = async () => {
            try {
                const data = await writingService.getIndex();
                if (!cancelled) setIndex(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'The request failed.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchWriting();

        return () => {
            cancelled = true;
        };
    }, []);

    const topic = index?.overview.topics.find((t) => t.id === topicId);
    const series = index?.overview.series.find((s) => s.id === seriesId);

    /*
     * Filtered by the topic or series in the address, so a chat card can link
     * to "everything on memory" and the link can be shared. The search reads
     * the full text, not just the titles, because a reader looking for "MCP"
     * means the posts that discuss it.
     */
    const entries = useMemo(() => {
        if (!index) return [];
        let list = index.entries;
        if (topic) list = list.filter((e) => e.topics?.includes(topic.id));
        if (series) {
            const order = series.parts.map((p) => p.slug);
            list = list
                .filter((e) => order.includes(e.slug))
                .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
        }
        const needle = query.trim().toLowerCase();
        if (needle) {
            list = list.filter((e) =>
                [e.title, e.summary ?? '', e.summary_he ?? '', stripWritingMetadata(e.content)]
                    .join('\n')
                    .toLowerCase()
                    .includes(needle)
            );
        }
        return list;
    }, [index, topic, series, query]);

    const clearFilter = () => setParams({});

    return (
        <div className="px-4 pt-8 pb-16 mx-auto max-w-3xl sm:pt-12">
            <header className="max-w-2xl">
                <p className="label">Blog</p>
                <h1 className="text-balance mt-3 text-2xl font-semibold tracking-tight sm:text-3xl text-content">
                    Things I worked out in public.
                </h1>
                <p className="mt-3 leading-relaxed text-muted">
                    Published on LinkedIn, Medium and my workplace's blog, reproduced here in full
                    with a link to each original. Every piece is also part of what the assistant on
                    the home page answers from, so you can read it here or ask about it there.
                </p>
            </header>

            {loading && (
                <p className="mt-10 font-mono text-sm text-muted" role="status">
                    Loading<span className="animate-blink">…</span>
                </p>
            )}

            {error && (
                <div className="mt-10 max-w-xl">
                    <h2 className="text-lg font-semibold tracking-tight text-content">
                        The writing list could not load.
                    </h2>
                    <p className="mt-2 leading-relaxed text-muted">
                        The backend did not respond. Reload, or ask the assistant on the home page
                        about any of it.
                    </p>
                    <p className="mt-2 font-mono text-xs break-words text-muted/70">{error}</p>
                </div>
            )}

            {index && (
                <div className="mt-8">
                    <label className="block">
                        <span className="sr-only">Search the blog</span>
                        <input
                            type="search"
                            dir="auto"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search the blog"
                            className="py-2 px-3 w-full text-base rounded border transition-colors bg-ink-700 text-content placeholder-muted border-border focus:outline-none focus:border-caution focus-visible:ring-2 focus-visible:ring-caution/60"
                        />
                    </label>
                    {/* Four first, so on a phone the chips do not push the
                        first post below the fold; the rest behind a toggle.
                        A topic picked from the address is always shown. */}
                    <div className="mt-4">
                        <TopicChips
                            index={index}
                            lang="en"
                            ids={
                                showAllTopics
                                    ? undefined
                                    : index.overview.topics
                                          .filter((t, i) => i < 4 || t.id === topicId)
                                          .map((t) => t.id)
                            }
                        />
                        {index.overview.topics.length > 4 && (
                            <button
                                type="button"
                                onClick={() => setShowAllTopics((open) => !open)}
                                aria-expanded={showAllTopics}
                                className="mt-2 font-mono text-xs underline rounded transition-colors text-muted underline-offset-4 decoration-border hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-caution"
                            >
                                {showAllTopics
                                    ? 'Fewer topics'
                                    : `${index.overview.topics.length - 4} more topics`}
                            </button>
                        )}
                    </div>
                    {(topic || series) && (
                        <p className="flex flex-wrap gap-x-3 gap-y-1 items-baseline mt-4 font-mono text-xs text-muted">
                            <span>
                                Showing:{' '}
                                <span className="text-content">
                                    {topic ? topic.en : series?.title}
                                </span>{' '}
                                ({entries.length})
                            </span>
                            <button
                                type="button"
                                onClick={clearFilter}
                                className="underline rounded transition-colors underline-offset-4 decoration-border hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-caution"
                            >
                                Show everything
                            </button>
                        </p>
                    )}
                    {series && (
                        <SeriesCard
                            series={series}
                            lang="en"
                            className="p-4 mt-5 rounded border border-border bg-ink-800"
                        />
                    )}
                    {!topic && !series && !query && index.overview.series[0] && (
                        <SeriesCard
                            series={index.overview.series[0]}
                            lang="en"
                            className="p-4 mt-6 rounded border border-border bg-ink-800"
                        />
                    )}
                </div>
            )}

            {!loading && !error && index && entries.length === 0 && (
                <div className="mt-10 leading-relaxed text-muted">
                    {query ? (
                        <p>
                            Nothing here mentions “{query}”.{' '}
                            <Link
                                to="/"
                                className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
                            >
                                Ask the assistant about it
                            </Link>
                            .
                        </p>
                    ) : (
                        <p>Nothing published yet.</p>
                    )}
                </div>
            )}

            {!loading && !error && entries.length > 0 && (
                <ul className="mt-10 border-t border-border">
                    {entries.map((entry) => (
                        <li key={entry.slug} className="border-b border-border">
                            <Link
                                to={`/blog/${entry.slug}`}
                                className="grid gap-1.5 py-5 transition-colors duration-200 group sm:grid-cols-[7.5rem_1fr] sm:gap-x-5"
                            >
                                {/* Date and kind both live in the meta column, so
                                    the badge starts at the same x on every row.
                                    Inline after the title its position would be
                                    decided by where the title happened to stop,
                                    and a chip that moves per row reads as an
                                    accident rather than a column.

                                    Stacked rather than side by side because the
                                    date and the chip together are wider than the
                                    7.5rem column; on mobile the grid collapses
                                    and they sit on one line, where there is room. */}
                                <div className="flex gap-2.5 items-center sm:flex-col sm:gap-1.5 sm:items-start">
                                    {/* A minimum width only while the two sit on
                                        one row: "6 Apr 2026" is narrower than
                                        "24 Jun 2026", which would nudge the
                                        badge a few pixels per card. Released
                                        from `sm`, where they stack and the
                                        date's width stops mattering. */}
                                    <time
                                        dateTime={entry.date}
                                        className="min-w-[5.5rem] font-mono text-xs whitespace-nowrap sm:min-w-0 text-muted"
                                    >
                                        {formatIsoDate(entry.date, 'short')}
                                    </time>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider ${
                                            WRITING_KIND_STYLE[entry.kind] ??
                                            'text-muted border-border'
                                        }`}
                                    >
                                        {WRITING_KIND_LABEL[entry.kind] ?? entry.kind}
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <h2
                                        dir="auto"
                                        className="text-lg font-semibold leading-snug transition-colors duration-200 text-content group-hover:text-signal"
                                    >
                                        {entry.title}
                                    </h2>

                                    {entry.summary && (
                                        <p
                                            dir="auto"
                                            className="mt-1.5 text-sm leading-relaxed text-muted"
                                        >
                                            {entry.summary}
                                        </p>
                                    )}

                                    <p className="mt-2 font-mono text-[0.68rem] text-muted/70">
                                        {sourceLabel(entry.source, 'en')}
                                        {entry.series && ` · ${entry.series.label}`}
                                        {entry.media_items?.some((m) => m.kind !== 'image') &&
                                            ' · video'}
                                    </p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Blog;
