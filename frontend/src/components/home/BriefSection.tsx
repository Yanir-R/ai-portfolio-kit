import React, { useState } from 'react';
import { HOME } from '@/copy/home';
import { FEATURES } from '@/constants/links';
import { useLang } from '@/i18n/useLang';
import { SpineNode } from '@/components/home/Spine';
import { useSiteDialogs } from '@/components/site/SiteDialogs';

/*
 * "Tell me what you need": three taps and one sentence. Sending opens the
 * contact window on the route picked, with the interest and the sentence
 * already in it, so the visitor never types the same thing twice.
 */
const BriefSection: React.FC = () => {
    const { t } = useLang();
    const copy = t(HOME).brief;
    const { openContact } = useSiteDialogs();
    const routes = copy.how.options.filter((o) => o.id !== 'whatsapp' || FEATURES.whatsapp);
    const [what, setWhat] = useState(0);
    const [route, setRoute] = useState(routes[0]);
    const [pain, setPain] = useState('');

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        openContact({
            kind: route.id,
            topic: copy.what.options[what],
            message: pain.trim() || undefined,
        });
    };

    return (
        <div className="brief" id="brief">
            <SpineNode n="06" variant="end" />
            <div>
                <span className="tagline">{copy.tagline}</span>
                <h2>{copy.title}</h2>
                <p>{copy.text}</p>
            </div>
            <form className="form" onSubmit={submit}>
                <div className="fq">
                    <b>{copy.what.label}</b>
                    <div className="pick">
                        {copy.what.options.map((label, i) => (
                            <button
                                key={label}
                                type="button"
                                aria-pressed={i === what}
                                onClick={() => setWhat(i)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="fq">
                    <b>{copy.pain.label}</b>
                    <textarea
                        value={pain}
                        maxLength={2000}
                        onChange={(e) => setPain(e.target.value)}
                        placeholder={copy.pain.placeholder}
                        aria-label={copy.pain.label}
                    />
                </div>
                <div className="fq">
                    <b>{copy.how.label}</b>
                    <div className="pick">
                        {routes.map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                aria-pressed={r.id === route.id}
                                onClick={() => setRoute(r)}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="send">
                    <button className="btn" type="submit">
                        {route.send}
                    </button>
                    <small>{copy.note}</small>
                </div>
            </form>
        </div>
    );
};

export default BriefSection;
