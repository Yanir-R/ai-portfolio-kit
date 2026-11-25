import { useEffect } from 'react';

/*
 * Marks the current view as one search engines should not index, and gives
 * the tab its own title, for as long as it is on screen: the 404 page, a
 * detail page whose slug has nothing behind it, and the crash screen.
 *
 * On the way out the tag goes, so the next page is indexable. That includes
 * the tag 404.html is served with: a visitor who lands on a 404 and clicks
 * through to the home page must not carry "noindex" along with them.
 */
export const useNoIndex = (active: boolean, title: string) => {
    useEffect(() => {
        if (!active) return;
        const previous = document.title;
        document.title = title;
        const meta =
            document.head.querySelector<HTMLMetaElement>('meta[name="robots"]') ??
            document.head.appendChild(
                Object.assign(document.createElement('meta'), { name: 'robots' })
            );
        meta.content = 'noindex';
        return () => {
            meta.remove();
            document.title = previous;
        };
    }, [active, title]);
};
