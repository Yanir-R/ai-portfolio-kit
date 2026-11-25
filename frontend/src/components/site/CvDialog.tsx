import React, { useState } from 'react';
import { CV } from '@/copy/site';
import { CV_DOC, CvDoc } from '@/copy/cv';
import { FEATURES } from '@/constants/links';
import { Lang } from '@/i18n/lang';
import { useLang } from '@/i18n/useLang';
import { useDialogFocus } from '@/hooks/useDialogFocus';

/*
 * The CV, opened over the page, as a sheet laid out like Yanir's CV document.
 * It opens in English, as the document is written, and switches to Hebrew for
 * whoever prefers it. It can be passed on by email or WhatsApp as a link that
 * opens this window again (#cv).
 *
 * The PDF download is behind FEATURES.cvPdf, off until a public PDF is
 * published.
 */
export const CV_HASH = '#cv';
const CV_PDF_PATH = '/cv.pdf';

/** Bullet text with **bold** highlights. */
const Rich: React.FC<{ text: string }> = ({ text }) => (
    <>{text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}</>
);

/**
 * A " · " list, each item isolated so English names inside a Hebrew line keep
 * their order and the separators stay between them.
 */
const DotList: React.FC<{ text: string }> = ({ text }) => (
    <>
        {text.split(' · ').map((item, i) => (
            <React.Fragment key={item}>
                {i > 0 && ' · '}
                <bdi>{item}</bdi>
            </React.Fragment>
        ))}
    </>
);

const Ext: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) =>
    href.startsWith('/') ? (
        <a href={href}>{children}</a>
    ) : (
        <a href={href} target="_blank" rel="noopener">
            {children}
        </a>
    );

/** The sheet's own language switch, labelled by each language's own name. */
const DOC_LANGS: { lang: Lang; label: string }[] = [
    { lang: 'en', label: 'English' },
    { lang: 'he', label: 'עברית' },
];

const CvSheet: React.FC<{ doc: CvDoc; lang: Lang }> = ({ doc, lang }) => {
    const h = doc.headings;
    return (
        <article className="cvs" dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang}>
            <header className="cvs-top">
                <div>
                    <h1>{doc.name}</h1>
                    <p className="cvs-role">{doc.role}</p>
                </div>
                <div className="cvs-contact">
                    <a href={`mailto:${doc.email}`}>{doc.email}</a>
                    <span>
                        {doc.links.map((l) => (
                            <Ext key={l.label} href={l.href}>
                                {l.label}
                            </Ext>
                        ))}
                    </span>
                </div>
            </header>
            <p className="cvs-sum">{doc.summary}</p>
            <div className="cvs-cols">
                <section className="cvs-main">
                    <h2>{h.experience}</h2>
                    {doc.experience.map((r) => (
                        <div className="cvs-role-block" key={r.title + r.org}>
                            <h3>{r.title}</h3>
                            <div className="cvs-org">
                                <span>
                                    {r.orgHref ? <Ext href={r.orgHref}>{r.org}</Ext> : r.org}
                                    {r.orgNote && ` · ${r.orgNote}`}
                                </span>
                                <span>{r.dates}</span>
                            </div>
                            {r.lede && <p className="cvs-lede">{r.lede}</p>}
                            <ul>
                                {r.bullets.map((b) => (
                                    <li key={b}>
                                        <Rich text={b} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <p className="cvs-earlier">
                        <strong>{h.earlier}</strong> {doc.earlier}
                    </p>
                </section>
                <aside className="cvs-side">
                    <h2>{h.skills}</h2>
                    {doc.skills.map((g) => (
                        <div key={g.name}>
                            <h4>{g.name}</h4>
                            <p>
                                <DotList text={g.text} />
                            </p>
                        </div>
                    ))}
                    <h2>{h.projects}</h2>
                    {doc.projects.map((p) => (
                        <div key={p.name}>
                            <h4>{p.href ? <Ext href={p.href}>{p.name}</Ext> : p.name}</h4>
                            <p>{p.text}</p>
                        </div>
                    ))}
                    <h2>{h.education}</h2>
                    <div>
                        <h4>{doc.education.name}</h4>
                        <p>{doc.education.text}</p>
                    </div>
                    <h2>{h.spoken}</h2>
                    <p>{doc.spoken}</p>
                </aside>
            </div>
        </article>
    );
};

const CvDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t, to } = useLang();
    const copy = t(CV);
    const closeRef = useDialogFocus<HTMLButtonElement>(onClose);
    const [docLang, setDocLang] = useState<Lang>('en');

    // The page's own origin, so a preview build shares a link to itself.
    const link = `${window.location.origin}${to('/')}${CV_HASH}`;
    const share = `${copy.shareText} ${link}`;

    return (
        <div className="cvm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="in" role="dialog" aria-modal="true" aria-labelledby="cvt">
                <div className="hd">
                    <b id="cvt">{copy.title}</b>
                    <button ref={closeRef} type="button" onClick={onClose}>
                        <span aria-hidden="true">✕</span> {copy.close}
                    </button>
                </div>
                <div className="tb">
                    {FEATURES.cvPdf && (
                        <a className="btn sm" download="Yanir-Rot-CV.pdf" href={CV_PDF_PATH}>
                            {copy.download}
                        </a>
                    )}
                    <a
                        className="btn sm line"
                        href={`mailto:?subject=${encodeURIComponent(copy.shareSubject)}&body=${encodeURIComponent(share)}`}
                    >
                        {copy.byEmail}
                    </a>
                    <a
                        className="btn sm line"
                        target="_blank"
                        rel="noopener"
                        href={`https://wa.me/?text=${encodeURIComponent(share)}`}
                    >
                        {copy.byWhatsapp}
                    </a>
                    <div className="cv-lang" role="group" aria-label={copy.docLang}>
                        {DOC_LANGS.map((o) => (
                            <button
                                key={o.lang}
                                type="button"
                                className="btn sm line"
                                lang={o.lang}
                                aria-pressed={docLang === o.lang}
                                onClick={() => setDocLang(o.lang)}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bd" tabIndex={0} aria-label={copy.viewLabel}>
                    <CvSheet doc={CV_DOC[docLang]} lang={docLang} />
                </div>
            </div>
        </div>
    );
};

export default CvDialog;
