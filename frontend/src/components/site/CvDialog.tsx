import React from 'react';
import { CV } from '@/copy/site';
import { CV_DOC } from '@/copy/cv';
import { FEATURES } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import { useDialogFocus } from '@/hooks/useDialogFocus';

/*
 * The CV, opened over the page, as a sheet laid out like Yanir's CV document.
 * It can be passed on by email or WhatsApp as a link that opens this window
 * again (#cv).
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

const Ext: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) =>
    href.startsWith('/') ? (
        <a href={href}>{children}</a>
    ) : (
        <a href={href} target="_blank" rel="noopener">
            {children}
        </a>
    );

const CvSheet: React.FC = () => {
    const h = CV_DOC.headings;
    return (
        <article className="cvs" dir="ltr" lang="en">
            <header className="cvs-top">
                <div>
                    <h1>{CV_DOC.name}</h1>
                    <p className="cvs-role">{CV_DOC.role}</p>
                </div>
                <div className="cvs-contact">
                    <a href={`mailto:${CV_DOC.email}`}>{CV_DOC.email}</a>
                    <span>
                        {CV_DOC.links.map((l) => (
                            <Ext key={l.label} href={l.href}>
                                {l.label}
                            </Ext>
                        ))}
                    </span>
                </div>
            </header>
            <p className="cvs-sum">{CV_DOC.summary}</p>
            <div className="cvs-cols">
                <section className="cvs-main">
                    <h2>{h.experience}</h2>
                    {CV_DOC.experience.map((r) => (
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
                        <strong>{h.earlier}</strong> {CV_DOC.earlier}
                    </p>
                </section>
                <aside className="cvs-side">
                    <h2>{h.skills}</h2>
                    {CV_DOC.skills.map((g) => (
                        <div key={g.name}>
                            <h4>{g.name}</h4>
                            <p>{g.items}</p>
                        </div>
                    ))}
                    <h2>{h.projects}</h2>
                    {CV_DOC.projects.map((p) => (
                        <div key={p.name}>
                            <h4>{p.href ? <Ext href={p.href}>{p.name}</Ext> : p.name}</h4>
                            <p>{p.text}</p>
                        </div>
                    ))}
                    <h2>{h.education}</h2>
                    <div>
                        <h4>{CV_DOC.education.title}</h4>
                        <p>{CV_DOC.education.place}</p>
                    </div>
                    <h2>{h.spoken}</h2>
                    <p>{CV_DOC.spoken}</p>
                </aside>
            </div>
        </article>
    );
};

const CvDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t, to } = useLang();
    const copy = t(CV);
    const closeRef = useDialogFocus<HTMLButtonElement>(onClose);

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
                </div>
                <div className="bd" tabIndex={0} aria-label={copy.viewLabel}>
                    <CvSheet />
                </div>
            </div>
        </div>
    );
};

export default CvDialog;
