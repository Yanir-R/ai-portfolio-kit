import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import Markdown from '@/components/Markdown';
import ReturnHome from '@/components/ReturnHome';
import Chat from '@/components/Chat';
import MediaView from '@/components/writing/MediaView';
import { useWritingIndex } from '@/hooks/useWritingIndex';
import { writingService, stripWritingMetadata } from '@/services/writingService';
import { MediaItem, WritingEntry, WRITING_KIND_LABEL, WRITING_KIND_STYLE } from '@/types/writing';
import { formatIsoDate } from '@/utils/date';

/*
 * One piece, read as a document.
 *
 * Images sit between the prose and the source link rather than inline, because
 * the markdown these were written in has no idea where its images belong - a
 * LinkedIn post is text plus attachments, not an illustrated article. Grouping
 * them keeps the reading uninterrupted and still shows what was published
 * alongside it.
 *
 * The attribution at the end is the point of republishing rather than
 * summarising: the full text is here so it can be read and cited, and the
 * canonical link says where it actually lives.
 */
const WritingDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [entry, setEntry] = useState<WritingEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const index = useWritingIndex();

    // The state resets live inside the async function rather than the effect
    // body, which is what keeps `react-hooks/set-state-in-effect` satisfied:
    // a synchronous setState during the effect is an extra render pass for a
    // value the fetch is about to overwrite anyway.
    useEffect(() => {
        if (!slug) return;
        let cancelled = false;

        const fetchEntry = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await writingService.getBySlug(slug);
                if (!cancelled) setEntry(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'The request failed.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchEntry();

        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="px-4 pt-8 pb-16 mx-auto max-w-2xl sm:pt-12">
                <p className="font-mono text-sm text-muted" role="status">
                    Loading<span className="animate-blink">…</span>
                </p>
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="px-4 pt-8 pb-16 mx-auto max-w-2xl sm:pt-12">
                <p className="label">Not found</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-content">
                    Nothing published at this address.
                </h1>
                <p className="mt-3 leading-relaxed text-muted">
                    {error ?? 'That piece does not exist, or its slug has changed.'}
                </p>
                <Link
                    to="/blog"
                    className="inline-block px-3 py-1.5 mt-5 font-mono text-xs tracking-wider uppercase rounded border transition-colors duration-200 text-content border-border hover:border-border-hover"
                >
                    All writing
                </Link>
            </div>
        );
    }

    const body = stripWritingMetadata(entry.content);
    // Typed media from the index; plain paths as images for an older backend.
    const allMedia: MediaItem[] =
        entry.media_items ?? (entry.media ?? []).map((src) => ({ kind: 'image' as const, src }));

    // The neighbours in its series, so a reader can go on to the next day.
    const series = entry.series
        ? index?.overview.series.find((s) => s.id === entry.series?.id)
        : undefined;
    const position = entry.series ? entry.series.position - 1 : -1;
    const previous = series && position > 0 ? series.parts[position - 1] : undefined;
    const next = series && position >= 0 ? series.parts[position + 1] : undefined;

    /*
     * An article's first image is its hero and belongs above the text, the way
     * it does on the site it came from. A post's images are attachments: they
     * restate the argument rather than opening it, and they were published
     * below the words, so that is where they stay.
     *
     * The same field drives both. The difference is the form, not the data.
     */
    const isArticle = entry.kind === 'article';
    const hero = isArticle ? allMedia[0] : undefined;
    const trailingMedia = isArticle ? allMedia.slice(1) : allMedia;

    return (
        <article className="px-4 pt-8 pb-16 mx-auto max-w-2xl sm:pt-12">
            <Link
                to="/blog"
                className="font-mono text-xs tracking-wider uppercase transition-colors duration-200 text-muted hover:text-content"
            >
                <span aria-hidden="true">←</span> All writing
            </Link>

            <header className="mt-6">
                <h1
                    dir="auto"
                    className="text-3xl font-semibold tracking-tight leading-tight text-content sm:text-4xl"
                >
                    {entry.title}
                </h1>

                <div className="flex flex-wrap gap-3 items-center mt-4 font-mono text-xs">
                    <span
                        className={`rounded border px-2 py-0.5 uppercase tracking-wider text-[0.62rem] ${
                            WRITING_KIND_STYLE[entry.kind] ?? 'text-muted border-border'
                        }`}
                    >
                        {WRITING_KIND_LABEL[entry.kind] ?? entry.kind}
                    </span>
                    <time dateTime={entry.date} className="text-muted">
                        {formatIsoDate(entry.date, 'long')}
                    </time>
                    <span className="text-muted">{entry.source}</span>
                    {entry.series && series && (
                        <Link
                            to={`/blog?series=${entry.series.id}`}
                            className="text-muted underline underline-offset-4 decoration-border transition-colors hover:text-content"
                        >
                            {series.title} · {entry.series.label}
                        </Link>
                    )}
                </div>
            </header>

            {/* Written once in the index, dated, and never by a model: what has
                changed since this was published. Above the text, so it is read
                before the part that is out of date. */}
            {entry.note && (
                <aside className="px-4 py-3 mt-6 rounded border border-caution/40">
                    <p className="font-mono text-[0.65rem] tracking-wider uppercase text-caution">
                        Updated since
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-content">{entry.note.en}</p>
                </aside>
            )}

            {hero && (
                <div className="mt-7">
                    <MediaView item={hero} title={entry.title} />
                </div>
            )}

            <div className="mt-8" dir="auto">
                <Markdown>{body}</Markdown>
            </div>

            {trailingMedia.length > 0 && (
                <section className="flex flex-col gap-4 mt-10">
                    {/* Decorative in the accessibility sense: each one restates
                        the argument the prose above already makes, so
                        describing them would repeat it. */}
                    {trailingMedia.map((item) => (
                        <MediaView key={item.src} item={item} title={entry.title} />
                    ))}
                </section>
            )}

            <footer className="pt-6 mt-12 border-t border-border">
                <p className="text-sm leading-relaxed text-muted">
                    {/* "LinkedIn" and "Medium" are proper nouns and read
                        correctly straight after "on". A descriptive label like
                        "Engineering blog" needs an article in front of it to
                        scan as English. */}
                    Originally published on{' '}
                    {/blog/i.test(entry.source)
                        ? `the ${entry.source.toLowerCase()}`
                        : entry.source}
                    .
                    {entry.url && (
                        <>
                            {' '}
                            <a
                                href={entry.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
                            >
                                Read it there
                            </a>{' '}
                            <span aria-hidden="true">↗</span>
                        </>
                    )}
                </p>

                {entry.related && entry.related.length > 0 && (
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                        Related:{' '}
                        {entry.related.map((related, index) => (
                            <React.Fragment key={related}>
                                {index > 0 && ', '}
                                <Link
                                    to={`/blog/${related}`}
                                    className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
                                >
                                    {related.replace(/-/g, ' ')}
                                </Link>
                            </React.Fragment>
                        ))}
                    </p>
                )}
            </footer>

            {series && (previous || next) && (
                <nav aria-label={series.title} className="grid gap-3 mt-8 sm:grid-cols-2">
                    {previous ? (
                        <Link
                            to={`/blog/${previous.slug}`}
                            className="block p-3 rounded border transition-colors border-border hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-caution"
                        >
                            <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                                ← Previous
                            </span>
                            <span className="text-content">{previous.label}</span>
                        </Link>
                    ) : (
                        <span className="hidden sm:block" />
                    )}
                    {next && (
                        <Link
                            to={`/blog/${next.slug}`}
                            className="block p-3 text-end rounded border transition-colors border-border hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-caution"
                        >
                            <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                                Next →
                            </span>
                            <span className="text-content">{next.label}</span>
                        </Link>
                    )}
                </nav>
            )}

            {/* Asking from here sends the piece with the question, so "what
                does it actually do?" needs no subject. Keyed on the slug so
                moving to the next piece starts a fresh conversation about it. */}
            <section className="mt-12" aria-label="Ask about this piece">
                <p className="mb-3 label">Ask about this piece</p>
                <Chat
                    key={entry.slug}
                    compact
                    hideQuickMessages
                    context={{ type: 'writing', ref: entry.slug, title: entry.title }}
                    initialMessage="Ask anything about this piece, in English or Hebrew. The answer comes from what I wrote here and in my other notes."
                />
            </section>

            <ReturnHome />
        </article>
    );
};

export default WritingDetail;
