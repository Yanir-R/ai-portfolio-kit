import React from 'react';
import { ERRORS } from '@/copy/errors';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LANG_PREFIX, langFromPath } from '@/i18n/lang';

/*
 * The crash screen ErrorBoundary shows. The language comes from the address,
 * as everywhere else on the site; it is read directly because a crash may have
 * taken the router's context with it. `bare` is the whole-app fallback, with
 * no site frame around it.
 */
const CrashScreen: React.FC<{ bare?: boolean }> = ({ bare }) => {
    const lang = langFromPath(window.location.pathname);
    const copy = ERRORS[lang].broke;
    useNoIndex(true, copy.docTitle);
    return (
        <div
            className={bare ? 'err-page err-bare' : 'w-hero err-page'}
            role="alert"
            lang={lang}
            dir={lang === 'en' ? 'ltr' : 'rtl'}
        >
            <div>
                <span className="tagline">{copy.tagline}</span>
                <h1>{copy.title}</h1>
            </div>
            <div>
                <p>{copy.text}</p>
                <div className="err-links">
                    <button type="button" className="btn" onClick={() => window.location.reload()}>
                        {copy.reload}
                    </button>
                    {/* A plain link, not the router's: the frame may be what broke. */}
                    <a href={LANG_PREFIX[lang] || '/'}>{copy.home}</a>
                </div>
            </div>
        </div>
    );
};

export default CrashScreen;
