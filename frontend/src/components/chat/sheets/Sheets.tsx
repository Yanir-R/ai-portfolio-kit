import React, { useState } from 'react';
import { SheetKey, SHEETS, sourceTitle } from '@/content/sheets';
import { FEATURES, LINKS } from '@/constants/links';
import { AnswerRecord, Letter as LetterState } from '@/chat/useHomeChat';
import { TraceSource } from '@/types/chat';
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
const ReadSheet: React.FC<{ record?: AnswerRecord }> = ({ record }) => {
    const { t } = useLang();
    const sheets = t(SHEETS);
    const copy = sheets.read;
    if (!record) return <TalkButton label={sheets.cta} />;

    const trace = record.trace;
    const read = record.sources;
    const library = Math.max(record.available, read.length);
    const id = (s: TraceSource) => `${s.kind}-${s.slug}`;
    // The model names only projects and posts it drew on; Yanir's notes go with
    // every question and are never named, so they are not called unused.
    const notes = read.filter((s) => s.kind === 'profile');
    const docs = read.filter((s) => s.kind !== 'profile');
    const usedIds = record.used && !record.declined ? new Set(record.used.map(id)) : null;
    const used = usedIds ? docs.filter((s) => usedIds.has(id(s))) : [];
    const unused = usedIds ? docs.filter((s) => !usedIds.has(id(s))) : [];

    let headline: string;
    let listed: TraceSource[];
    let tagged = false;
    let rest: TraceSource[] = [];
    let always: TraceSource[] = [];
    if (usedIds && used.length) {
        headline = copy.leans(used.length);
        listed = used;
        tagged = true;
        rest = unused;
        always = notes;
    } else if (usedIds && notes.length) {
        // An empty list is the model's word that it rested on his notes alone.
        headline = copy.leans(notes.length);
        listed = notes;
        tagged = true;
        rest = unused;
    } else if (record.declined || usedIds) {
        headline = copy.leansNone;
        listed = read;
    } else {
        headline = copy.readN(read.length);
        listed = read;
    }
    const count = read.length ? copy.ofRead(read.length, library) : copy.ofLibrary(library);

    const events = [record.declined && copy.declined, record.handoff && copy.handoff].filter(
        (e): e is [string, string] => !!e
    );

    const format = (x: number) => x.toLocaleString('en-US');
    const prompt = trace?.prompt_tokens ?? 0;
    const cached = Math.min(trace?.cached_tokens ?? 0, prompt);
    const parts = [prompt - cached, cached, trace?.thinking_tokens ?? 0, trace?.output_tokens ?? 0];
    const total = trace?.total_tokens ?? parts.reduce((x, y) => x + y, 0);
    const shown = parts.map((x, i) => ({ x, i })).filter((p) => p.x > 0);
    const latency = trace?.latency_ms != null ? (trace.latency_ms / 1000).toFixed(1) : null;
    const finish = trace?.finish_reason;

    const facts: [string, string][] = [];
    if (latency) facts.push([copy.latency, `${latency} ${copy.secondsShort}`]);
    if (trace?.language) facts.push([copy.language, copy.languages[trace.language]]);
    facts.push([copy.convo, record.turn > 1 ? copy.nth(record.turn, record.prior) : copy.first]);
    if (finish) facts.push([copy.finish, copy.finishWords[finish] ?? copy.finishOther]);

    return (
        <>
            <div className="rx">
                <div className="rx-hd">
                    <b>{headline}</b>
                    <span>{count}</span>
                </div>
                {listed.length > 0 && (
                    <ul className="v-src">
                        {listed.map((s, i) => (
                            <li
                                key={id(s)}
                                className={tagged ? 'used' : undefined}
                                style={{
                                    animationDelay: `${SOURCE_STAGGER.start + i * SOURCE_STAGGER.step}ms`,
                                }}
                            >
                                <small>{copy.kinds[s.kind] ?? s.kind}</small>
                                <b>{sourceTitle(s, copy)}</b>
                                {tagged && <em>{copy.usedTag}</em>}
                            </li>
                        ))}
                    </ul>
                )}
                {rest.length > 0 && (
                    <p className="rx-rest">
                        {copy.readNotUsed} {rest.map((s) => sourceTitle(s, copy)).join(', ')}
                    </p>
                )}
                {always.length > 0 && (
                    <p className="rx-rest">
                        {copy.alwaysSent} {always.map((s) => sourceTitle(s, copy)).join(', ')}
                    </p>
                )}
            </div>
            {events.length > 0 && (
                <div className="rx">
                    <h4>{copy.more}</h4>
                    <ul className="rx-ev">
                        {events.map(([title, text]) => (
                            <li key={title}>
                                <b>{title}</b>
                                <span>{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="rx">
                <h4>{copy.measures}</h4>
                <dl className="v-kv">
                    {facts.map(([dt, dd]) => (
                        <div key={dt}>
                            <dt>{dt}</dt>
                            <dd>{dd}</dd>
                        </div>
                    ))}
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
                            {shown.map(({ x, i }) => (
                                <i
                                    key={i}
                                    className={`t${i}`}
                                    style={{ flex: Math.max(x, total * MIN_TOKEN_SHARE) }}
                                />
                            ))}
                        </div>
                        <ul>
                            {shown.map(({ x, i }) => (
                                <li key={i} className={`t${i}`}>
                                    <b>{format(x)}</b>
                                    {copy.tokenParts[i]}
                                </li>
                            ))}
                        </ul>
                        {cached > 0 && (
                            <p className="rx-cache">
                                {cached * 2 > prompt ? copy.cachedMost : copy.cachedSome}
                            </p>
                        )}
                    </div>
                )}
            </div>
            {trace?.model && (
                <p className="rx-model">
                    {copy.model}: <span dir="ltr">{trace.model}</span>
                </p>
            )}
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
    onMailChat: () => void;
}

/** The body of one sheet. The map is drawn separately, in its own frame. */
export const SheetBody: React.FC<SheetProps> = ({ sheet, record, letter, onMailChat }) => {
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
            return <ReadSheet record={record} />;
        case 'ask':
            return <AskSheet letter={letter} />;
        case 'mail':
            return <MailSheet letter={letter} />;
        case 'contact':
            return <ContactSheet onMailChat={onMailChat} />;
    }
};
