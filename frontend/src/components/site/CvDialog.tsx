import React, { useEffect, useState } from 'react';
import Markdown from '@/components/Markdown';
import { CV } from '@/copy/site';
import { FEATURES } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { PROFILE_DOCS, profileService } from '@/services/profileService';

/*
 * The CV, opened over the page. It is read on the site itself, from the same
 * document the chat answers from, and can be passed on by email or WhatsApp
 * as a link that opens this window again (#cv).
 *
 * The PDF download is behind FEATURES.cvPdf, off until a public PDF is
 * published.
 */
export const CV_HASH = '#cv';
const CV_PDF_PATH = '/cv.pdf';

type Load = { state: 'loading' } | { state: 'ready'; text: string } | { state: 'failed' };

const CvDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t, to } = useLang();
    const copy = t(CV);
    const closeRef = useDialogFocus<HTMLButtonElement>(onClose);
    const [doc, setDoc] = useState<Load>({ state: 'loading' });

    useEffect(() => {
        let cancelled = false;
        profileService
            .get(PROFILE_DOCS.resume)
            .then((text) => !cancelled && setDoc({ state: 'ready', text }))
            .catch(() => !cancelled && setDoc({ state: 'failed' }));
        return () => {
            cancelled = true;
        };
    }, []);

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
                    {doc.state === 'loading' && <p className="cv-note">{copy.loading}</p>}
                    {doc.state === 'failed' && <p className="cv-note">{copy.failed}</p>}
                    {doc.state === 'ready' && (
                        <article className="cv-doc w-body" dir="ltr" lang="en">
                            <Markdown>{doc.text}</Markdown>
                        </article>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CvDialog;
