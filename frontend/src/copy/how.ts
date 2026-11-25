import { Localized } from '@/i18n/lang';

/*
 * "How the agent answers from what I wrote": the explainer opened from the
 * blog and from a piece's page. Two levels of the same four steps: plain, and
 * for developers, with a link to the file that does each step. The figures
 * are the ones in the repository (selection.py, tests/routing_questions.py).
 */

export interface HowStep {
    plain: { title: string; text: string };
    dev: { title: string; texts: string[]; file: string };
}

export interface HowCopy {
    close: string;
    levelLabel: string;
    plain: string;
    dev: string;
    tagline: string;
    title: string;
    leadPlain: string;
    leadDev: string;
    steps: [HowStep, HowStep, HowStep, HowStep];
    /** Step 1's picture: a question and the terms left after normalizing it. */
    question: string;
    terms: string[];
    termsNote: string;
    /** Step 2's picture. */
    picked: (n: number, of: number) => string;
    /** Step 3's picture. */
    piece: string;
    model: string;
    /** Step 4's picture. */
    shortAnswer: string;
    source: string;
    sourceTitle: string;
    outcomes: {
        titlePlain: string;
        titleDev: string;
        items: {
            label: string;
            tone: 'ok' | 'md2' | 'no';
            plain: string;
            code: string;
            dev: string;
        }[];
    };
    tests: {
        title: string;
        figures: { n: string; text: string }[];
        note: string;
    };
    toDev: string;
}

/** The backend file behind each step, in this public repository. */
export const HOW_FILES = {
    selection: 'backend/selection.py',
    context: 'backend/context.py',
    replies: 'backend/replies.py',
    tests: 'backend/tests/routing_questions.py',
} as const;

export const HOW: Localized<HowCopy> = {
    he: {
        close: 'סגירה',
        levelLabel: 'רמת ההסבר',
        plain: 'בפשטות',
        dev: 'למפתחים',
        tagline: 'שקיפות',
        title: 'איך הסוכן עונה מתוך מה שכתבתי',
        leadPlain:
            'הסוכן לא עונה מהידע הכללי שלו. לפני כל תשובה האתר שולף את הקטעים שכתבתי על הנושא, והסוכן עונה רק מהם ומראה לכם מאיפה.',
        leadDev:
            'שליפה דטרמיניסטית, ואחריה קריאה אחת למודל. אותה שאלה מחזירה תמיד את אותם מסמכים, כל החלטה בדרך ניתנת לבדיקה, והמודל משמש רק לניסוח.',
        steps: [
            {
                plain: {
                    title: 'שואלים שאלה',
                    text: 'בשפה רגילה, בעברית או באנגלית. אין צורך לדעת איך קוראים לפוסט.',
                },
                dev: {
                    title: 'נרמול השאלה',
                    file: HOW_FILES.selection,
                    texts: [
                        'טוקניזציה לעברית ולאנגלית באותו מעבר, כי גם טקסט בעברית מזכיר כלים בשמם האנגלי. מילות תפקוד מסוננות לפי רשימה סגורה של מחלקות דקדוקיות, ולא לפי רשימת מילות מפתח שמתיישנת.',
                        'אחר כך stemming קל: באנגלית סיומות רבים ופועל, בעברית תחיליות, סיומות רבים ואותיות סופיות. המטרה היא עקביות ולא בלשנות: ״הסוכנים״, ״לסוכנים״ ו״סוכן״ מגיעים לאותו מונח.',
                        'מילים כמו ״פוסט״ או ״כתבת״ מזוהות כ־intent ולא כנושא. הן מצמצמות את החיפוש לכתיבה בלבד, ויוצאות מהניקוד.',
                    ],
                },
            },
            {
                plain: {
                    title: 'האתר שולף את הקטעים המתאימים',
                    text: 'עוד לפני שהמודל רואה משהו, האתר מחפש בכל מה שכתבתי ומוציא רק את הקטעים שנוגעים לשאלה. הבחירה עקבית: אותה שאלה תביא תמיד את אותם קטעים.',
                },
                dev: {
                    title: 'ניקוד מול אינדקס',
                    file: HOW_FILES.selection,
                    texts: [
                        'התוכן והאינדקס נשמרים ב־cache בזיכרון, אחד לכל שפה, ונבנים מחדש רק כשקובץ תוכן משתנה. בקשה רגילה לא קוראת קבצים ולא בונה אינדקס. כל מונח מקבל משקל IDF: מונח שמופיע בכל המסמכים שווה אפס, ומונח שמופיע באחד מכריע. אין רשימת מילות מפתח ידנית. אוצר המילים המבחין נגזר מהתוכן, ומתעדכן לבד כשנוסף מסמך.',
                        'לכל מסמך מצורפים גם ניסוחים של מבקרים, בעברית ובאנגלית, כי מי ששואל על ״מספרה״ לא יכתוב ״סלון״. הם משמשים להתאמה בלבד, ואף פעם לא נשלחים למודל.',
                        'מסמך נבחר אם הוא מכסה לפחות רבע ממשקל השאלה, ועד שלושה מסמכים. הסף נמדד מול השאלה ולא מול המסמך המוביל, כדי שמסמך אחד חזק לא ידחוק תשובה נכונה אחרת.',
                    ],
                },
            },
            {
                plain: {
                    title: 'המודל קורא רק אותם',
                    text: 'המודל מקבל את הקטעים שנשלפו ומנסח מהם תשובה קצרה. על מה שלא כתבתי אין לו ממה לענות.',
                },
                dev: {
                    title: 'קריאה אחת למודל',
                    file: HOW_FILES.context,
                    texts: [
                        'המודל מקבל את הטקסט המלא של המסמכים שנבחרו, ושורה אחת על כל מסמך אחר. כך הוא יכול להפנות לקטע קיים בלי לקרוא אותו, והפרומפט נשאר קטן.',
                        'אין שלב LLM מקדים שמנתח את השאלה. זה היה מכפיל את מספר הקריאות לכל הודעה, והשליפה הדטרמיניסטית מספיקה כאן.',
                        'תשובות המודל עצמן לא נשמרות ב־cache. כל שאלה מקבלת תשובה חדשה, על אותם מסמכים.',
                    ],
                },
            },
            {
                plain: {
                    title: 'תשובה, ולידה המקור',
                    text: 'ליד התשובה מופיע הקטע שממנו היא באה, כדי שתוכלו לקרוא ולבדוק בעצמכם.',
                },
                dev: {
                    title: 'תשובה בסכמה קבועה, מקורות מהשרת',
                    file: HOW_FILES.replies,
                    texts: [
                        'כל תשובה חוזרת באותה סכמה מטיפוסית. כרטיסי המקור נגזרים בשרת מתוצאת השליפה ולא מפלט המודל, ולכן כרטיס לא יכול להפנות לקטע שלא קיים.',
                        'גם רשימות, כמו ״מה כתבת לאחרונה?״, מורכבות בשרת לפי תאריך. המודל מנסח את המשפט שמעליהן, ולא בוחר מה יופיע בהן.',
                    ],
                },
            },
        ],
        question: 'מה אתה חושב על עלויות של סוכנים?',
        terms: ['חושב', 'עלוי', 'סוכנ'],
        termsNote: 'המונחים שנשארים לניקוד',
        picked: (n, of) => `${n} קטעים נבחרו מתוך ${of}`,
        piece: 'קטע',
        model: 'המודל',
        shortAnswer: 'תשובה קצרה, בשתיים עד ארבע שורות.',
        source: 'מקור',
        sourceTitle: '22.7 MILLION tokens.',
        outcomes: {
            titlePlain: 'ומה אם לא כתבתי על זה?',
            titleDev: 'שלוש תוצאות, לא ״נמצא או לא נמצא״',
            items: [
                {
                    label: 'נמצא',
                    tone: 'ok',
                    plain: 'יש קטע שעונה על השאלה, והוא מוצג ליד התשובה.',
                    code: 'narrowed',
                    dev: 'המסמך המוביל מכסה לפחות 30% ממשקל השאלה כולה, כולל מילים שאף מסמך לא מכיר.',
                },
                {
                    label: 'הכי קרוב',
                    tone: 'md2',
                    plain: 'אין קטע מדויק. הסוכן מציג את הקרוב ביותר, ואומר שזה הקרוב ביותר.',
                    code: 'closest',
                    dev: 'היתה התאמה, אבל מתחת לסף. המסמכים הקרובים נשלחים, ומדווחים כקרובים ולא כתשובה.',
                },
                {
                    label: 'לא נמצא',
                    tone: 'no',
                    plain: 'הסוכן אומר שלא כתבתי על זה, ולא ממציא תשובה.',
                    code: 'unmatched',
                    dev: 'אף מונח בשאלה לא מופיע באינדקס. נשלח רק הפרופיל שלי, בלי מסמכים.',
                },
            ],
        },
        tests: {
            title: 'איך אני יודע שזה עובד',
            figures: [
                {
                    n: '81',
                    text: 'שאלות בדיקה בניסוח של מבקרים, 51 באנגלית ו־30 בעברית. לכל אחת מוגדר המסמך שאמור להיבחר.',
                },
                {
                    n: '0',
                    text: 'קריאות למודל בבדיקות השליפה. הן רצות בכל שינוי, לפני העלייה לאוויר, ולא עולות כסף.',
                },
            ],
            note: 'מסמך חדש בלי ניסוחי חיפוש, או בלי שאלת בדיקה שמגיעה אליו, מפיל את הבדיקות. כך האינדקס לא מתיישן בשקט. סקריפט מדידה נפרד מדווח, אחרי כל שינוי, כמה פעמים המסמך הנכון נשלח וכמה טוקנים נשלחו איתו.',
        },
        toDev: 'רוצים לראות איך זה בנוי? עברו ל״למפתחים״ למעלה.',
    },
    en: {
        close: 'Close',
        levelLabel: 'Level of detail',
        plain: 'Plain',
        dev: 'For developers',
        tagline: 'Transparency',
        title: 'How the agent answers from what I wrote',
        leadPlain:
            "The agent doesn't answer from its general knowledge. Before every answer the site pulls the pieces I wrote on the subject, and the agent answers only from them and shows you where from.",
        leadDev:
            'Deterministic retrieval, then a single model call. The same question always returns the same documents, every decision on the way can be checked, and the model is used only to write.',
        steps: [
            {
                plain: {
                    title: 'You ask a question',
                    text: "In plain words, in Hebrew or English. You don't need to know what the post is called.",
                },
                dev: {
                    title: 'Normalizing the question',
                    file: HOW_FILES.selection,
                    texts: [
                        'Hebrew and English are tokenized in the same pass, because Hebrew text also names tools by their English names. Function words are filtered by a closed list of grammatical classes, not by a keyword list that goes stale.',
                        'Then light stemming: plural and verb endings in English; prefixes, plural endings and final letters in Hebrew. The aim is consistency, not linguistics: "agents", "agent\'s" and "agent" reach the same term.',
                        'Words like "post" or "you wrote" are recognised as intent, not topic. They narrow the search to the writing only, and leave the scoring.',
                    ],
                },
            },
            {
                plain: {
                    title: 'The site pulls the matching pieces',
                    text: 'Before the model sees anything, the site searches everything I wrote and takes out only the pieces that touch the question. The choice is consistent: the same question always brings the same pieces.',
                },
                dev: {
                    title: 'Scoring against an index',
                    file: HOW_FILES.selection,
                    texts: [
                        'The content and the index are cached in memory, one per language, and rebuilt only when a content file changes. A normal request reads no files and builds no index. Every term gets an IDF weight: a term in every document is worth zero, a term in one document decides. There is no hand-written keyword list. The distinguishing vocabulary is derived from the content, and updates itself when a document is added.',
                        'Each document also carries visitors\' phrasings, in Hebrew and English, because someone asking about a "barbershop" won\'t write "salon". They are used for matching only, and are never sent to the model.',
                        "A document is chosen if it covers at least a quarter of the question's weight, up to three documents. The threshold is measured against the question, not against the top document, so one strong document can't push out another right answer.",
                    ],
                },
            },
            {
                plain: {
                    title: 'The model reads only those',
                    text: "The model gets the pieces that were pulled and writes a short answer from them. On what I didn't write, it has nothing to answer from.",
                },
                dev: {
                    title: 'One model call',
                    file: HOW_FILES.context,
                    texts: [
                        'The model gets the full text of the chosen documents, and one line on every other document. That way it can point to an existing piece without reading it, and the prompt stays small.',
                        'There is no preliminary LLM step that analyses the question. It would double the calls for every message, and deterministic retrieval is enough here.',
                        "The model's answers themselves aren't cached. Every question gets a fresh answer, from the same documents.",
                    ],
                },
            },
            {
                plain: {
                    title: 'An answer, with its source beside it',
                    text: 'Next to the answer is the piece it came from, so you can read it and check for yourself.',
                },
                dev: {
                    title: 'A fixed, typed schema; sources from the server',
                    file: HOW_FILES.replies,
                    texts: [
                        'Every answer returns in the same typed schema. The source cards are derived on the server from the retrieval result, not from the model output, so a card cannot point to a piece that does not exist.',
                        'Lists too, like "what did you write lately?", are assembled on the server by date. The model writes the sentence above them, and does not choose what appears in them.',
                    ],
                },
            },
        ],
        question: 'What do you think about agent costs?',
        terms: ['think', 'agent', 'cost'],
        termsNote: 'The terms left for scoring',
        picked: (n, of) => `${n} pieces chosen out of ${of}`,
        piece: 'Piece',
        model: 'The model',
        shortAnswer: 'A short answer, two to four lines.',
        source: 'Source',
        sourceTitle: '22.7 MILLION tokens.',
        outcomes: {
            titlePlain: "And what if I didn't write about it?",
            titleDev: 'Three outcomes, not "found or not found"',
            items: [
                {
                    label: 'Found',
                    tone: 'ok',
                    plain: 'A piece answers the question, and it is shown next to the answer.',
                    code: 'narrowed',
                    dev: "The top document covers at least 30% of the whole question's weight, including words no document knows.",
                },
                {
                    label: 'Closest',
                    tone: 'md2',
                    plain: "There's no exact piece. The agent shows the closest one, and says it is the closest.",
                    code: 'closest',
                    dev: 'There was a match, but under the threshold. The closest documents are sent, and reported as closest rather than as the answer.',
                },
                {
                    label: 'Not found',
                    tone: 'no',
                    plain: "The agent says I didn't write about it, and doesn't make up an answer.",
                    code: 'unmatched',
                    dev: 'No term in the question appears in the index. Only my profile is sent, without documents.',
                },
            ],
        },
        tests: {
            title: 'How I know it works',
            figures: [
                {
                    n: '81',
                    text: "Test questions in visitors' wording, 51 in English and 30 in Hebrew. Each one names the document that should be chosen.",
                },
                {
                    n: '0',
                    text: 'Model calls in the retrieval tests. They run on every change, before going live, and cost nothing.',
                },
            ],
            note: 'A new document without search phrasings, or without a test question that reaches it, fails the tests. That way the index never goes stale quietly. A separate measuring script reports, after every change, how often the right document was sent and how many tokens went with it.',
        },
        toDev: 'Want to see how it is built? Switch to "For developers" above.',
    },
};
