import React from 'react';
import { Link } from 'react-router';
import { HOME } from '@/copy/home';
import { useLang } from '@/i18n/useLang';
import { useWritingIndexState } from '@/hooks/useWritingIndex';
import { PostsSkeleton } from '@/components/site/Skeleton';
import { formatDate } from '@/utils/date';
import { Arrow } from '@/components/site/Arrow';

const LATEST = 3;

/**
 * The three newest pieces from the blog, read from the same index the blog page
 * uses. While it loads, three placeholder cards hold their place.
 */
const PostsSection: React.FC = () => {
    const { lang, t, to } = useLang();
    const copy = t(HOME).posts;
    const { index, failed } = useWritingIndexState();
    const latest = [...(index?.entries ?? [])]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, LATEST);

    return (
        <section id="posts">
            <div className="head">
                <div>
                    <span className="tagline">{copy.tagline}</span>
                    <h2>{copy.title}</h2>
                </div>
                <p>
                    {copy.text}{' '}
                    <Link className="all" to={to('/blog')}>
                        <Arrow>{copy.all}</Arrow>
                    </Link>
                </p>
            </div>
            {!index && !failed && <PostsSkeleton label={copy.loading} count={LATEST} />}
            {/* Failed: the link to the blog above still leads there. */}
            <div className="posts" hidden={!index}>
                {latest.map((entry) => (
                    <Link key={entry.slug} className="post" to={to(`/blog/${entry.slug}`)}>
                        <span>
                            {copy.kind[entry.kind]} · {formatDate(entry.date, lang)}
                        </span>
                        <h3 dir="auto">{entry.title}</h3>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default PostsSection;
