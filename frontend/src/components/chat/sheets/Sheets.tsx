import React, { useState } from 'react';
import { SheetKey, SHEETS } from '@/content/sheets';
import { FEATURES, LINKS } from '@/constants/links';
import { AnswerRecord, Letter as LetterState } from '@/chat/useHomeChat';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { Arrow } from '@/components/site/Arrow';
import { CountUp, Letter, PersonaKitLinks, TalkButton } from '@/components/chat/sheets/parts';
import { useLang } from '@/i18n/useLang';

/*
 * The drawings the chat opens beside an answer, one per kind of question. All
 * motion is CSS and starts when the sheet mounts; figures on the receipt
 * sheet are the ones the backend measured for that answer.
 */

// The migration scene runs on one clock: document i leaves at start + i * gap,
// travels for `travel`, and its cell fills as it lands. The counter and the bar
// run from the first landing to the last.
const MIGRATION = { docs: 15, start: 400, gap: 260, travel: 900, landEarly: 80 } as const;
// Each source on the receipt slides in after the one before it.
const SOURCE_STAGGER = { start: 500, step: 140 } as const;
// A token part narrower than this share of the total would vanish from the bar.
const MIN_TOKEN_SHARE = 0.06;

const Points: React.FC<{ points: { n: string; title: string; text: string }[] }> = ({ points }) => (
    <ol className="v-why">
        {points.map((p) => (
            <li key={p.n}>
                <i>{p.n}</i>
                <b>{p.title}</b>
                <span>{p.text}</span>
            </li>
        ))}
    </ol>
);

const PkSheet: React.FC = () => {
    const { t } = useLang();
    const copy = t(SHEETS).pk;
    return (
        <>
            <Points points={copy.points} />
            <div className="v-btns">
                <a className="btn sm" href={LINKS.personakit} target="_blank" rel="noopener">
                    {copy.site}
                </a>
                <a
                    className="btn sm line"
                    href={LINKS.personakitDocs}
                    target="_blank"
                    rel="noopener"
                >
                    {copy.docs}
                </a>
            </div>
        </>
    );
};

const WhySheet: React.FC = () => {
    const { t } = useLang();
    const copy = t(SHEETS);
    return (
        <>
            <Points points={copy.why.points} />
            <TalkButton label={copy.cta} />
        </>
    );
};

const LegalSheet: React.FC = () => {
    const { t } = useLang();
    const copy = t(SHEETS).legal;
    const docs = Array.from(
        { length: MIGRATION.docs },
        (_, i) => MIGRATION.start + i * MIGRATION.gap
    );
    const counting = {
        delay: MIGRATION.start + MIGRATION.travel,
        duration: (MIGRATION.docs - 1) * MIGRATION.gap,
    };
    return (
        <>
            <div className="v-mig">
                <div className="v-old">
                    <span className="pile">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                    </span>
                    <b>{copy.oldArchive}</b>
                    <small>{copy.size}</small>
                </div>
                <div className="v-wire">
                    {docs.map((leave) => (
                        <i key={leave} style={{ animationDelay: `${leave}ms` }} />
                    ))}
                </div>
                <div className="v-new">
                    <span className="cells">
                        {docs.map((leave) => (
                            <i
                                key={leave}
                                style={{
                                    animationDelay: `${leave + MIGRATION.travel - MIGRATION.landEarly}ms`,
                                }}
                            />
                        ))}
                    </span>
                    <b>{copy.newSystem}</b>
                    <small>{copy.newNote}</small>
                </div>
            </div>
            <div className="v-prog">
                <CountUp to={copy.files} delay={counting.delay} duration={counting.duration} />
                <span>{copy.progress}</span>
                <div className="pbar">
                    <i
                        style={{
                            animationDelay: `${counting.delay}ms`,
                            animationDuration: `${counting.duration}ms`,
                        }}
                    />
                </div>
            </div>
            <ul className="v-facts two">
                {copy.facts.map((f) => (
                    <li key={f.title}>
                        <b>{f.title}</b>
                        {f.text}
                    </li>
                ))}
            </ul>
            <TalkButton label={copy.cta} topic={copy.topic} />
        </>
    );
};

const PriceSheet: React.FC = () => {
    const { t } = useLang();
    const copy = t(SHEETS).price;
    const [pref, setPref] = useState('');
    const last = copy.steps.length - 1;
    return (
        <>
            <ol className="v-steps">
                {copy.steps.map((step, i) => (
                    <li key={step.title} className={i === last ? 'last' : undefined}>
                        <i>{i + 1}</i>
                        <div>
                            <b>{step.title}</b>
                            <span>{step.text}</span>
                        </div>
                        <em>{step.when}</em>
                        {step.leave && (
                            <p>
                                <small>{copy.leaveWith}</small>
                                {step.leave}
                            </p>
                        )}
                        {i === last && (
                            <div className="v-two" role="group" aria-label={copy.prefLabel}>
                                {copy.prefs.map((p) => (
                                    <button
                                        key={p.title}
                                        type="button"
                                        aria-pressed={pref === p.title}
                                        onClick={() => setPref(pref === p.title ? '' : p.title)}
                                    >
                                        <b>{p.title}</b>
                                        {p.text}
                                    </button>
                                ))}
                                <small className="v-pick" aria-live="polite">
                                    {pref ? copy.prefPicked.replace('{p}', pref) : copy.prefHint}
                                </small>
                            </div>
                        )}
                    </li>
                ))}
            </ol>
            <TalkButton
                label={pref ? copy.ctaWithPref.replace('{p}', pref) : t(SHEETS).cta}
                topic={copy.topic}
                pref={pref || undefined}
            />
        </>
    );
};

const BuiltSheet: React.FC = () => {
    const { t } = useLang();
    const copy = t(SHEETS).built;
    return (
        <>
            <div className="v-sys">
                {copy.systems.map((s, i) => (
                    <React.Fragment key={s.title}>
                        {i > 0 && (
                            <div className="w">
                                <em>{copy.wires[i - 1]}</em>
                            </div>
                        )}
                        <div className="c">
                            <i>{i + 1}</i>
                            <b>{s.title}</b>
                            <span>{s.text}</span>
                            {s.links && <PersonaKitLinks />}
                        </div>
                    </React.Fragment>
                ))}
            </div>
            <TalkButton label={copy.cta} topic={copy.topic} />
        </>
    );
};

/** The receipt of one answer: every figure on it is one the backend returned with that answer. */
const ReadSheet: React.FC<{
    record?: AnswerRecord;
    onView: (view: 'tech' | 'plain') => void;
    view: 'tech' | 'plain';
}> = ({ record, onView, view }) => {
    const { t } = useLang();
    const sheets = t(SHEETS);
    const copy = sheets.read;
    if (!record) return <TalkButton label={sheets.cta} />;

    const trace = record.trace;
    const n = record.sources.length;
    const of = Math.max(record.available, n);
    const format = (x: number) => x.toLocaleString('en-US');
    const tokens = [trace?.prompt_tokens, trace?.thinking_tokens, trace?.output_tokens].map(
        (x) => x ?? 0
    );
    const total = trace?.total_tokens ?? tokens.reduce((a, b) => a + b, 0);
    const outcome = trace?.context_outcome ?? '';
    const sources = (
        <ul className="v-src">
            {record.sources.map((s, i) => (
                <li
                    key={`${s.kind}-${s.slug}`}
                    style={{
                        animationDelay: `${SOURCE_STAGGER.start + i * SOURCE_STAGGER.step}ms`,
                    }}
                >
                    <small>{copy.kinds[s.kind] ?? s.kind}</small>
                    <b>{s.title}</b>
                </li>
            ))}
        </ul>
    );
    const latency = trace?.latency_ms != null ? (trace.latency_ms / 1000).toFixed(1) : null;

    return (
        <>
            <div className="v-tg" role="group" aria-label={copy.viewLabel}>
                {(['tech', 'plain'] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        aria-pressed={view === v}
                        onClick={() => onView(v)}
                    >
                        {copy[v]}
                    </button>
                ))}
            </div>
            <div className="v-tech">
                <dl className="v-kv">
                    {trace?.model && (
                        <div>
                            <dt>{copy.model}</dt>
                            <dd dir="ltr">{trace.model}</dd>
                        </div>
                    )}
                    {latency && (
                        <div>
                            <dt>{copy.latency}</dt>
                            <dd>
                                {latency} {copy.secondsShort}
                            </dd>
                        </div>
                    )}
                    {trace?.language && (
                        <div>
                            <dt>{copy.language}</dt>
                            <dd>{copy.languages[trace.language]}</dd>
                        </div>
                    )}
                    {trace?.finish_reason && (
                        <div>
                            <dt>{copy.finish}</dt>
                            <dd>
                                {trace.finish_reason === 'STOP' && `${copy.finishOk} `}
                                <span dir="ltr">{trace.finish_reason}</span>
                            </dd>
                        </div>
                    )}
                </dl>
                {total > 0 && (
                    <div className="v-tok">
                        <div className="hd">
                            <b>
                                {format(total)} {copy.tokens}
                            </b>
                            <span>{copy.tokensNote}</span>
                        </div>
                        <div className="tb">
                            {tokens.map((x, i) => (
                                <i
                                    key={i}
                                    className={`t${i}`}
                                    style={{ flex: Math.max(x, total * MIN_TOKEN_SHARE) }}
                                />
                            ))}
                        </div>
                        <ul>
                            {tokens.map((x, i) => (
                                <li key={i} className={`t${i}`}>
                                    <b>{format(x)}</b>
                                    {copy.tokenParts[i]}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="v-ctx">
                    <div className="hd">
                        <b>{copy.docsOf(n, of)}</b>
                        {copy.chosen[outcome] && <span>{copy.chosen[outcome]}</span>}
                    </div>
                    {sources}
                </div>
                <p className="v-fine">{copy.before}</p>
            </div>
            <div className="v-plain">
                <div className="v-num sm">
                    <b>{copy.plainDocs(n, of)}</b>
                    <span>{copy.plainDocsNote}</span>
                </div>
                {sources}
                <ul className="v-facts two">
                    <li>
                        <b>
                            {record.seconds} {copy.seconds}
                        </b>
                        {copy.plainTime}
                    </li>
                    <li>
                        <b>{copy.plainOnce}</b>
                        {copy.plainOnceNote}
                    </li>
                </ul>
            </div>
            <TalkButton label={sheets.cta} />
        </>
    );
};

const AskSheet: React.FC<{ letter?: LetterState }> = ({ letter }) => {
    const { t } = useLang();
    const copy = t(SHEETS);
    return (
        <>
            {!letter?.sent && (
                <p className="v-why1">
                    <b>{copy.ask.what}</b> {copy.ask.whatText}
                </p>
            )}
            <Letter
                label={copy.letter.question}
                message={letter?.question}
                from={letter?.from}
                note={letter?.note}
                sent={!!letter?.sent}
            />
            <div className="v-btns">
                <TalkButton label={copy.ask.orCall} topic={copy.ask.topic} line />
            </div>
        </>
    );
};

const MailSheet: React.FC<{ letter?: LetterState }> = ({ letter }) => {
    const { t } = useLang();
    const copy = t(SHEETS).letter;
    const message = letter?.message || (letter?.sent ? copy.noMessage : undefined);
    return (
        <Letter label={copy.message} message={message} from={letter?.from} sent={!!letter?.sent} />
    );
};

const ContactSheet: React.FC<{ onMailChat: () => void }> = ({ onMailChat }) => {
    const { t } = useLang();
    const copy = t(SHEETS).contact;
    const { openContact } = useSiteDialogs();
    return (
        <div className="v-routes">
            {copy.routes.map((route) => {
                const off = route.kind === 'whatsapp' && !FEATURES.whatsapp;
                const go = () =>
                    route.kind === 'mail' ? onMailChat() : openContact({ kind: route.kind });
                return (
                    <button
                        key={route.kind}
                        type="button"
                        disabled={off}
                        onClick={off ? undefined : go}
                    >
                        <small>{route.note}</small>
                        <b>{route.title}</b>
                        <span>{route.text}</span>
                        <em>{off ? copy.soon : <Arrow>{route.go}</Arrow>}</em>
                    </button>
                );
            })}
        </div>
    );
};

export interface SheetProps {
    sheet: Exclude<SheetKey, 'map'>;
    record?: AnswerRecord;
    letter?: LetterState;
    view: 'tech' | 'plain';
    onView: (view: 'tech' | 'plain') => void;
    onMailChat: () => void;
}

/** The body of one sheet. The map is drawn separately, in its own frame. */
export const SheetBody: React.FC<SheetProps> = ({
    sheet,
    record,
    letter,
    view,
    onView,
    onMailChat,
}) => {
    switch (sheet) {
        case 'pk':
            return <PkSheet />;
        case 'why':
            return <WhySheet />;
        case 'legal':
            return <LegalSheet />;
        case 'price':
            return <PriceSheet />;
        case 'built':
            return <BuiltSheet />;
        case 'read':
            return <ReadSheet record={record} view={view} onView={onView} />;
        case 'ask':
            return <AskSheet letter={letter} />;
        case 'mail':
            return <MailSheet letter={letter} />;
        case 'contact':
            return <ContactSheet onMailChat={onMailChat} />;
    }
};
