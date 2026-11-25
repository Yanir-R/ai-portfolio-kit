import React from 'react';
import { useParams } from 'react-router';
import { WRITING } from '@/copy/writing';
import PostArticle from '@/components/writing/PostArticle';
import { LoadFailed, LoadingNote, NotFoundHero } from '@/components/site/PageStates';
import { ERRORS } from '@/copy/errors';
import { useLoad } from '@/hooks/useLoad';
import { useWritingIndex } from '@/hooks/useWritingIndex';
import { useLang } from '@/i18n/useLang';
import { writingService } from '@/services/writingService';

/*
 * A piece's own page. The piece is fetched by its address; the index, shared
 * with the rest of the site, supplies its series and neighbours.
 */
const WritingDetail: React.FC = () => {
    const { slug = '' } = useParams<{ slug: string }>();
    const { t, to } = useLang();
    const copy = t(WRITING);
    const index = useWritingIndex();
    const [load, retry] = useLoad(slug, () => writingService.getBySlug(slug));

    if (load.state === 'loading') return <LoadingNote text={copy.blog.loading} />;
    // Only a 404 means the page is not there. Anything else - the server
    // asleep, a network drop, a 5xx - is a page that exists and did not load.
    if (load.state === 'failed' && load.notFound)
        return (
            <NotFoundHero
                copy={copy.post.notFound}
                link={{ to: to('/blog'), label: copy.post.allBlog }}
            />
        );
    if (load.state === 'failed') return <LoadFailed copy={t(ERRORS).loadFailed} onRetry={retry} />;
    return <PostArticle key={load.value.slug} entry={load.value} index={index} />;
};

export default WritingDetail;
