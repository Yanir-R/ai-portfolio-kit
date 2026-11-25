import { Localized } from '@/i18n/lang';

/*
 * Copy for the blog, a piece's own page, the chat cards that point at
 * pieces, and the "how the agent answers" explainer. Titles and summaries of
 * the pieces themselves come from the writing index, never from here.
 */

export interface WritingCopy {
    tags: {
        article: string;
        post: string;
        series: string;
        english: string;
        video: string;
        updated: string;
        askingAbout: string;
    };
    readMinutes: (n: number) => string;
    read: string;
    pieces: (n: number) => string;
    posts: (n: number) => string;
    blog: {
        tagline: string;
        title: string;
        em: string;
        lead: string;
        how: string;
        searchLabel: string;
        clearSearch: string;
        topicsTitle: string;
        kinds: { article: string; post: string };
        showing: (n: number, of: number) => string;
        all: (n: number) => string;
        clear: string;
        articles: { title: string; note: string };
        series: { title: string; note: string; watch: string; playLabel: string };
        postsSection: { title: string; note: string };
        shortOf: string;
        allShown: string;
        loading: string;
        failed: { title: string; text: string };
        none: {
            searchTitle: (q: string) => string;
            filterTitle: string;
            searchText: string;
            filterText: string;
            askAbout: (q: string) => string;
            ask: string;
            clear: string;
        };
    };
    panel: { label: string; close: string; full: string };
    post: {
        back: string;
        byName: string;
        published: (source: string, date: string) => string;
        original: string;
        /** A LinkedIn post: the mark on the control names the source, so the line gives only the date. */
        publishedOn: (date: string) => string;
        originalLinkedIn: string;
        previous: string;
        next: string;
        previousInSeries: string;
        nextInSeries: string;
        lastPiece: string;
        firstPiece: string;
        endOfSeries: string;
        allSeries: (title: string) => string;
        allBlog: string;
        seriesTag: (title: string, part: string) => string;
        notFound: { tagline: string; title: string; text: string };
    };
    ask: {
        title: string;
        open: string;
        book: string;
        removeContext: string;
        log: string;
        reading: string;
        answered: string;
        answeredFromPiece: string;
        asksFirst: string;
        chips: { sum: string; biz: string; more: string };
        bizQuestion: string;
        bizOptions: string[];
        bizNote: string;
        bizAsk: (kind: string) => string;
        placeholder: string;
        placeholderGeneral: string;
        inputLabel: string;
        send: string;
        sources: string;
    };
    cards: {
        recent: string;
        all: string;
        topic: string;
        allTopic: string;
        allBlog: string;
        toSeries: string;
        topics: string;
    };
}

export const WRITING: Localized<WritingCopy> = {
    he: {
        tags: {
            article: 'מאמר',
            post: 'פוסט',
            series: 'סדרה',
            english: 'באנגלית',
            video: 'סרטון',
            updated: 'עודכן מאז',
            askingAbout: 'שואלים על',
        },
        readMinutes: (n) => `${n} דק׳ קריאה`,
        read: 'לקריאה',
        pieces: (n) => (n === 1 ? 'קטע אחד' : `${n} קטעים`),
        posts: (n) => `${n} פוסטים`,
        blog: {
            tagline: 'בלוג',
            title: 'מה שאני כותב,',
            em: 'במקום אחד.',
            lead: 'מחשבות ולקחים מהעבודה עם סוכני AI: מה עובד, מה נשבר, ומה למדתי בדרך. אפשר לקרוא כאן, ואפשר לשאול את הסוכן.',
            how: 'איך הסוכן עונה?',
            searchLabel: 'חיפוש בפוסטים ובמאמרים',
            clearSearch: 'ניקוי החיפוש',
            topicsTitle: 'על מה אני כותב',
            kinds: { article: 'מאמרים', post: 'פוסטים' },
            showing: (n, of) => `מוצגים ${n} מתוך ${of}`,
            all: (n) => `כל ${n} הקטעים`,
            clear: 'נקו ✕',
            articles: { title: 'מאמרים', note: 'קריאה ארוכה. נפתחים כאן באתר.' },
            series: {
                title: 'סדרה',
                note: 'פוסטים שנכתבו ברצף ונקראים טוב יותר יחד.',
                watch: 'צפו בסרטון',
                playLabel: 'הפעלת הסרטון',
            },
            postsSection: { title: 'פוסטים', note: 'קצרים, לסריקה מהירה. מהחדש לישן.' },
            shortOf: 'גרסה קצרה של המאמר:',
            allShown: 'כל הפוסטים מוצגים.',
            loading: 'טוען את הבלוג…',
            failed: {
                title: 'הבלוג לא נטען.',
                text: 'השרת לא ענה. נסו לרענן, או שאלו את הסוכן בעמוד הבית.',
            },
            none: {
                searchTitle: (q) => `לא מצאתי פוסט על ״${q}״`,
                filterTitle: 'אין קטעים בשילוב הזה',
                searchText:
                    'יכול להיות שעוד לא כתבתי על זה. הסוכן מכיר גם את הפרויקטים והניסיון שלי, ויכול לענות גם בלי פוסט.',
                filterText: 'נסו נושא אחר, או שאלו את הסוכן ישירות.',
                askAbout: (q) => `שאלו את הסוכן על ״${q}״`,
                ask: 'שאלו את הסוכן',
                clear: 'נקו את החיפוש',
            },
        },
        panel: { label: 'קריאת פוסט', close: 'סגירה', full: 'פתחו בדף מלא' },
        post: {
            back: 'לכל הבלוג',
            byName: 'יניר רוט',
            // A Latin name takes a maqaf after ב: ב־Medium.
            published: (source, date) =>
                `פורסם במקור ב${/^[A-Za-z]/.test(source) ? '־' : ''}${source}, ${date}`,
            original: 'לפוסט המקורי ↗',
            publishedOn: (date) => `פורסם במקור ב־${date}`,
            originalLinkedIn: 'לפוסט המקורי בלינקדאין ↗',
            previous: 'הקודם',
            next: 'הבא',
            previousInSeries: 'הקודם בסדרה',
            nextInSeries: 'הבא בסדרה',
            lastPiece: 'זה הקטע האחרון',
            firstPiece: 'זה הקטע הראשון',
            endOfSeries: 'סוף הסדרה',
            allSeries: (title) => `לכל הסדרה: ${title}`,
            allBlog: 'לכל הבלוג',
            seriesTag: (title, part) => `סדרה: ${title} · ${part}`,
            notFound: {
                tagline: 'לא נמצא',
                title: 'אין כאן קטע.',
                text: 'הקטע לא קיים, או שהכתובת שלו השתנתה.',
            },
        },
        ask: {
            title: 'רוצים לשאול על הקטע?',
            open: 'שאלו את הסוכן',
            book: 'קבעו שיחה',
            removeContext: 'הסרת ההקשר',
            log: 'השיחה על הקטע',
            reading: 'הסוכן קורא את הקטע…',
            answered: 'הסוכן ענה',
            answeredFromPiece: 'הסוכן ענה · מתוך הקטע הזה',
            asksFirst: 'הסוכן שואל לפני שהוא עונה',
            chips: {
                sum: 'סכם לי בשלוש נקודות',
                biz: 'מה זה אומר לעסק שלי?',
                more: 'מה עוד כתבת על זה?',
            },
            bizQuestion: 'כדי לענות לעניין ולא באוויר, מה הכי קרוב אליכם?',
            bizOptions: ['עסק קטן', 'משרד מקצועי', 'חברת תוכנה', 'רשות או ארגון'],
            bizNote: 'השאלה הזו קבועה ולא עולה קריאה למודל. המודל נקרא רק אחרי הבחירה.',
            bizAsk: (kind) =>
                `מה הקטע הזה אומר ל${kind}? איפה זה פוגש אותנו ביום־יום, ומה צעד ראשון?`,
            placeholder: 'שאלה על הקטע הזה',
            placeholderGeneral: 'שאלה כללית לסוכן',
            inputLabel: 'שאלה על הקטע',
            send: 'שאלו',
            sources: 'מקורות',
        },
        cards: {
            recent: 'אחרונים',
            all: 'הבלוג',
            topic: 'על הנושא',
            allTopic: 'לכל הקטעים בנושא',
            allBlog: 'לכל הבלוג',
            toSeries: 'לסדרה',
            topics: 'על מה אני כותב',
        },
    },
    en: {
        tags: {
            article: 'Article',
            post: 'Post',
            series: 'Series',
            english: 'In English',
            video: 'Video',
            updated: 'Updated since',
            askingAbout: 'Asking about',
        },
        readMinutes: (n) => `${n} min read`,
        read: 'Read',
        pieces: (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`,
        posts: (n) => `${n} posts`,
        blog: {
            tagline: 'Blog',
            title: 'What I write,',
            em: 'in one place.',
            lead: 'Thoughts and lessons from working with AI agents: what works, what breaks, and what I learned along the way. Read it here, or ask the agent.',
            how: 'How does the agent answer?',
            searchLabel: 'Search posts and articles',
            clearSearch: 'Clear the search',
            topicsTitle: 'What I write about',
            kinds: { article: 'Articles', post: 'Posts' },
            showing: (n, of) => `Showing ${n} of ${of}`,
            all: (n) => `All ${n} pieces`,
            clear: 'Clear ✕',
            articles: { title: 'Articles', note: 'Long reads. They open here on the site.' },
            series: {
                title: 'Series',
                note: 'Posts written in a row, which read better together.',
                watch: 'Watch the video',
                playLabel: 'Play the video',
            },
            postsSection: { title: 'Posts', note: 'Short, for a quick scan. Newest first.' },
            shortOf: 'Short version of the article:',
            allShown: 'All posts are shown.',
            loading: 'Loading the blog…',
            failed: {
                title: "The blog didn't load.",
                text: "The server didn't answer. Try reloading, or ask the agent on the home page.",
            },
            none: {
                searchTitle: (q) => `I found no post on "${q}"`,
                filterTitle: 'No pieces match this combination',
                searchText:
                    "Maybe I haven't written about it yet. The agent also knows my projects and experience, and can answer without a post.",
                filterText: 'Try another topic, or ask the agent directly.',
                askAbout: (q) => `Ask the agent about "${q}"`,
                ask: 'Ask the agent',
                clear: 'Clear the search',
            },
        },
        panel: { label: 'Reading a post', close: 'Close', full: 'Open as a full page' },
        post: {
            back: 'All of the blog',
            byName: 'Yanir Rot',
            published: (source, date) => `Originally published on ${source}, ${date}`,
            original: 'The original post ↗',
            publishedOn: (date) => `Originally published ${date}`,
            originalLinkedIn: 'The original post on LinkedIn ↗',
            previous: 'Previous',
            next: 'Next',
            previousInSeries: 'Previous in the series',
            nextInSeries: 'Next in the series',
            lastPiece: 'This is the latest piece',
            firstPiece: 'This is the first piece',
            endOfSeries: 'End of the series',
            allSeries: (title) => `The whole series: ${title}`,
            allBlog: 'All of the blog',
            seriesTag: (title, part) => `Series: ${title} · ${part}`,
            notFound: {
                tagline: 'Not found',
                title: 'Nothing is published here.',
                text: 'That piece does not exist, or its address has changed.',
            },
        },
        ask: {
            title: 'Want to ask about this piece?',
            open: 'Ask the agent',
            book: 'Book a call',
            removeContext: 'Remove the context',
            log: 'The conversation about this piece',
            reading: 'The agent is reading the piece…',
            answered: 'The agent answered',
            answeredFromPiece: 'The agent answered · from this piece',
            asksFirst: 'The agent asks before it answers',
            chips: {
                sum: 'Sum it up in three points',
                biz: 'What does this mean for my business?',
                more: 'What else did you write on this?',
            },
            bizQuestion: 'To answer to the point, which is closest to you?',
            bizOptions: [
                'A small business',
                'A professional office',
                'A software company',
                'A public body or organization',
            ],
            bizNote:
                'This question is fixed and costs no model call. The model is called only after you pick.',
            bizAsk: (kind) =>
                `What does this piece mean for ${kind.toLowerCase()}? Where does it meet us day to day, and what is a first step?`,
            placeholder: 'A question about this piece',
            placeholderGeneral: 'A general question for the agent',
            inputLabel: 'A question about this piece',
            send: 'Ask',
            sources: 'Sources',
        },
        cards: {
            recent: 'Latest',
            all: 'The blog',
            topic: 'On this subject',
            allTopic: 'All on this subject',
            allBlog: 'The whole blog',
            toSeries: 'The series',
            topics: 'What I write about',
        },
    },
};
