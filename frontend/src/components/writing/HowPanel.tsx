import React, { useState } from 'react';
import { HOW, HOW_FILES } from '@/copy/how';
import { LINKS } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import SidePanel from '@/components/writing/SidePanel';
import { ARROW } from '@/components/site/Arrow';

type Level = 's' | 't';

// Step 2's picture: a row of squares, a few of them lit, as the pieces chosen.
const SQUARES = 21;
const LIT = new Set([3, 9, 16]);

/** A link to the file that does a step, in this site's public repository. */
const FileLink: React.FC<{ file: string }> = ({ file }) => (
    <a
        className="gh lv-t"
        dir="ltr"
        href={`${LINKS.siteRepo}/blob/main/${file}`}
        target="_blank"
        rel="noopener"
    >
        {file.split('/').pop()} ↗
    </a>
);

/** The pictures beside each step, in order. */
const StepVisual: React.FC<{ step: number }> = ({ step }) => {
    const { lang, t } = useLang();
    const copy = t(HOW);
    if (step === 0)
        return (
            <div className="v">
                <span className="bq">{copy.question}</span>
                <span className="tk lv-t">
                    {copy.terms.map((term) => (
                        <i key={term}>{term}</i>
                    ))}
                    <small>{copy.termsNote}</small>
                </span>
            </div>
        );
    if (step === 1)
        return (
            <div className="v">
                <span className="sq" aria-hidden="true">
                    {Array.from({ length: SQUARES }, (_, i) => (
                        <i key={i} className={LIT.has(i) ? 'on' : undefined} />
                    ))}
                </span>
                <small>{copy.picked(LIT.size, SQUARES)}</small>
                <span className="fm lv-t">
                    <code dir="ltr">w(t) = log(N / df)</code>
                </span>
            </div>
        );
    if (step === 2)
        return (
            <div className="v fl">
                {Array.from(LIT, (i) => (
                    <span key={i} className="dc">
                        {copy.piece}
                    </span>
                ))}
                <b aria-hidden="true">{ARROW[lang]}</b>
                <span className="md">{copy.model}</span>
            </div>
        );
    return (
        <div className="v an">
            <span>{copy.shortAnswer}</span>
            <span className="cd">
                <em>{copy.source}</em>
                <b dir="auto">{copy.sourceTitle}</b>
            </span>
        </div>
    );
};

/*
 * "How the agent answers from what I wrote", at two levels: plain, and for
 * developers with the file behind each step. The level switch only toggles
 * which half of each line is shown.
 */
const HowPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useLang();
    const copy = t(HOW);
    const [level, setLevel] = useState<Level>('s');

    const levels = (
        <div className="sw" role="group" aria-label={copy.levelLabel}>
            {(['s', 't'] as const).map((lv) => (
                <button
                    key={lv}
                    type="button"
                    aria-pressed={level === lv}
                    onClick={() => setLevel(lv)}
                >
                    {lv === 's' ? copy.plain : copy.dev}
                </button>
            ))}
        </div>
    );

    return (
        <SidePanel
            className="w-how"
            labelledBy="howt"
            closeLabel={copy.close}
            onClose={onClose}
            header={levels}
            data={{ lv: level }}
        >
            <span className="tagline">{copy.tagline}</span>
            <h2 id="howt">{copy.title}</h2>
            <p className="ld lv-s">{copy.leadPlain}</p>
            <p className="ld lv-t">{copy.leadDev}</p>
            <ol className="steps">
                {copy.steps.map((step, i) => (
                    <li key={step.dev.title}>
                        <i className="n">{i + 1}</i>
                        <div>
                            <h3>
                                <span className="lv-s">{step.plain.title}</span>
                                <span className="lv-t">{step.dev.title}</span>
                                <FileLink file={step.dev.file} />
                            </h3>
                            <p className="lv-s">{step.plain.text}</p>
                            {step.dev.texts.map((text) => (
                                <p key={text} className="lv-t">
                                    {text}
                                </p>
                            ))}
                            <StepVisual step={i} />
                        </div>
                    </li>
                ))}
            </ol>
            <h3 className="oh">
                <span className="lv-s">{copy.outcomes.titlePlain}</span>
                <span className="lv-t">{copy.outcomes.titleDev}</span>
            </h3>
            <div className="oc">
                {copy.outcomes.items.map((o) => (
                    <p key={o.code}>
                        <b className={o.tone}>{o.label}</b>
                        <span className="lv-s">{o.plain}</span>
                        <span className="lv-t">
                            <code dir="ltr">{o.code}</code> {o.dev}
                        </span>
                    </p>
                ))}
            </div>
            <div className="lv-t ts">
                <h3 className="oh">
                    {copy.tests.title}
                    <FileLink file={HOW_FILES.tests} />
                </h3>
                <div className="kv">
                    {copy.tests.figures.map((f) => (
                        <p key={f.n}>
                            <b>{f.n}</b>
                            <span>{f.text}</span>
                        </p>
                    ))}
                </div>
                <p className="fn">{copy.tests.note}</p>
            </div>
            <p className="fn lv-s">{copy.toDev}</p>
        </SidePanel>
    );
};

export default HowPanel;
