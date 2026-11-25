import type { Localized } from '../i18n/lang';

/*
 * What a visitor reads when a page is not there or something failed. Shared
 * by the app and by seo/prerender.mts (the 404.html files Cloudflare Pages
 * serves with a real 404 status), so it is imported relatively, without the
 * @ alias, like copy/routes.ts.
 *
 * Three different situations, three different messages:
 *  - notFound: the address has nothing behind it (HTTP 404).
 *  - loadFailed: the page exists, but the server did not answer this time.
 *  - broke: the page itself failed in the browser.
 */
export interface ErrorsCopy {
    notFound: {
        docTitle: string;
        tagline: string;
        title: string;
        text: string;
        home: string;
        blog: string;
        projects: string;
        talk: string;
    };
    loadFailed: { title: string; text: string; retry: string };
    broke: {
        docTitle: string;
        tagline: string;
        title: string;
        text: string;
        reload: string;
        home: string;
    };
}

export const ERRORS: Localized<ErrorsCopy> = {
    he: {
        notFound: {
            docTitle: 'הדף לא נמצא | יניר רוט',
            tagline: '404 · לא נמצא',
            title: 'אין כאן דף.',
            text: 'הכתובת לא קיימת, או שהדף עבר מקום. אפשר להמשיך מכאן:',
            home: 'לעמוד הבית',
            blog: 'לבלוג',
            projects: 'לפרויקטים',
            talk: 'לדבר עם יניר',
        },
        loadFailed: {
            title: 'הדף לא נטען.',
            text: 'השרת לא ענה הפעם. הדף קיים, נסו שוב בעוד רגע.',
            retry: 'נסו שוב',
        },
        broke: {
            docTitle: 'משהו נשבר | יניר רוט',
            tagline: 'תקלה',
            title: 'משהו נשבר בדף הזה.',
            text: 'זו תקלה אצלנו, לא אצלכם. רענון בדרך כלל פותר את זה.',
            reload: 'רענון הדף',
            home: 'לעמוד הבית',
        },
    },
    en: {
        notFound: {
            docTitle: 'Page not found | Yanir Rot',
            tagline: '404 · Not found',
            title: 'Nothing is here.',
            text: 'This address does not exist, or the page has moved. You can go on from here:',
            home: 'Home',
            blog: 'Blog',
            projects: 'Projects',
            talk: 'Talk to Yanir',
        },
        loadFailed: {
            title: 'The page did not load.',
            text: 'The server did not answer this time. The page exists, so try again in a moment.',
            retry: 'Try again',
        },
        broke: {
            docTitle: 'Something broke | Yanir Rot',
            tagline: 'Error',
            title: 'Something broke on this page.',
            text: 'The fault is on our side, not yours. Reloading usually fixes it.',
            reload: 'Reload the page',
            home: 'Home',
        },
    },
};
