/**
 * The API's front door.
 *
 * The backend is Cloud Run, and a Cloud Run service that a browser can call is
 * a service anybody can call: its run.app URL is public, and CORS does not
 * change that - CORS is enforced by browsers, on browsers, so curl and a
 * for-loop ignore it entirely. What that costs is not stolen data, since
 * everything the API returns is already public. It is Gemini quota per chat
 * request, and a small daily chat budget (see backend/rate_limit.py) that is
 * shared with real visitors, so anyone who wants to can leave the site
 * answering 429s.
 *
 * This Worker is what closes that. It sits on api.yanirrot.com, so every
 * request reaching the backend has already passed Cloudflare's DDoS
 * protection, bot handling and rate limiting, and it adds a shared secret the
 * backend checks. The run.app URL stays technically reachable - Cloud Run
 * offers no way to hide it short of a load balancer that costs more per month
 * than this site does per year - but without the secret it answers 403.
 *
 * The secret's strength is the whole mechanism. Any client can send any header
 * it likes, so the header name protects nothing; only the fact that the value
 * cannot be guessed does. It is a Worker secret, never committed.
 *
 * The secret proves a request came through this Worker; it says nothing about
 * who sent it to the Worker. The POST routes that cost something are therefore
 * also checked with Cloudflare Turnstile: a per-request proof that a browser
 * running the site sent this message, verified here before anything is
 * forwarded. The Cloudflare rate limiting rule is separate - it is configured
 * in the dashboard and needs no code.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// The frontend sends the token under this name (frontend/src/constants/
// turnstile.ts), so the two have to change together.
const TURNSTILE_HEADER = 'X-Turnstile-Token';

// Response headers from Cloud Run that describe its internals, not the reply.
const INTERNAL_RESPONSE_HEADERS = ['x-cloud-trace-context', 'traceparent'];

// Turnstile's documented maximum. Anything longer is not a token, so it is
// refused here rather than posted to siteverify.
const TURNSTILE_MAX_TOKEN_LENGTH = 2048;
const TURNSTILE_TIMEOUT_MS = 5000;

// The routes that spend something per call: model quota for the chat, an
// outgoing email for the contact form, and a real slot on Yanir's calendar
// for the booking.
const PROTECTED_PATHS = new Set(['/chat-with-files', '/api/contact', '/api/booking']);

// The frontend shows `detail` verbatim to the visitor, so these are written
// for a person, not for a log.
const UNVERIFIED_DETAIL =
    "Couldn't confirm this message came from a browser. Reload the page and send it again.";
const UNAVAILABLE_DETAIL =
    "The chat can't take messages right this moment. Give it a minute and send it again.";

// The only paths the backend serves. Anything else - /.env, /.git/config,
// /wp-login.php and the rest of what scanners try on every public host - is
// answered here with a 404 instead of being forwarded, so it never wakes the
// backend from zero instances or counts against its free allowance.
function isBackendPath(pathname) {
    return (
        pathname === '/' ||
        pathname === '/health' ||
        pathname === '/chat-with-files' ||
        pathname.startsWith('/api/')
    );
}

function isProtected(request, pathname) {
    // Only POST. A CORS preflight is an OPTIONS request the browser sends on
    // its own, without the token, and it has to keep reaching the backend.
    return request.method === 'POST' && PROTECTED_PATHS.has(pathname);
}

/**
 * A JSON reply produced by this Worker itself, for every case where the
 * request never reaches the backend or the backend never answers.
 */
function edgeReply(request, status, detail) {
    const headers = new Headers({
        'content-type': 'application/json',
        // The reply differs by Origin, so a cache must not hand one origin's
        // copy to another.
        Vary: 'Origin',
    });
    // These replies never reach the backend, so its CORS headers are not on
    // them, and without one the browser hides the body and the visitor gets a
    // generic failure instead of the sentence above. Echoing whatever Origin
    // asked is acceptable here because the reply carries no data - only that
    // visitor-facing sentence, which is public anyway.
    const origin = request.headers.get('Origin');
    if (origin) {
        headers.set('Access-Control-Allow-Origin', origin);
    }
    return new Response(JSON.stringify({ detail }), { status, headers });
}

/**
 * Checks the request's Turnstile token. Resolves to null when the request may
 * be forwarded, or to the Response to answer with instead.
 */
async function verifyTurnstile(request, env) {
    if (!env.TURNSTILE_SECRET_KEY) {
        // Same reasoning as the EDGE_SECRET check: a missing secret must not
        // silently turn the check off. Forwarding here would look like
        // everything works while the protection is simply gone.
        console.error('TURNSTILE_SECRET_KEY is not set; refusing protected request');
        return edgeReply(request, 503, UNAVAILABLE_DETAIL);
    }

    const token = request.headers.get(TURNSTILE_HEADER);
    if (!token || token.length > TURNSTILE_MAX_TOKEN_LENGTH) {
        // Nothing siteverify could say yes to, so it is not asked.
        return edgeReply(request, 403, UNVERIFIED_DETAIL);
    }

    const payload = { secret: env.TURNSTILE_SECRET_KEY, response: token };
    const remoteip = request.headers.get('CF-Connecting-IP');
    if (remoteip) {
        payload.remoteip = remoteip;
    }

    let outcome;
    try {
        const verification = await fetch(TURNSTILE_VERIFY_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            // Without a limit a stalled siteverify would hold the visitor's
            // message open until the Worker itself is cut off.
            signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
        });
        if (!verification.ok) {
            throw new Error(`siteverify answered ${verification.status}`);
        }
        outcome = await verification.json();
    } catch (err) {
        // Unreachable, timed out, non-2xx or not JSON. Failing closed: "could
        // not check" must not be treated as "checked", or taking siteverify
        // out of the picture would be a way around it.
        console.error('turnstile siteverify failed', err);
        return edgeReply(request, 503, UNAVAILABLE_DETAIL);
    }

    if (outcome?.success === true) {
        return null;
    }
    if (outcome?.success === false) {
        // The error codes name what was wrong with the token (expired, already
        // used, ...). They contain no secret, so they are safe to log.
        console.warn('turnstile token rejected', outcome['error-codes']);
        return edgeReply(request, 403, UNVERIFIED_DETAIL);
    }
    // Valid JSON, but not a siteverify answer. Same as unparseable.
    console.error('turnstile siteverify returned an unexpected body');
    return edgeReply(request, 503, UNAVAILABLE_DETAIL);
}

export default {
    async fetch(request, env) {
        if (!env.ORIGIN_URL || !env.EDGE_SECRET) {
            // Failing loudly beats forwarding unauthenticated: a missing
            // secret would otherwise silently become an open proxy to the
            // origin, which is the exact thing this Worker exists to prevent.
            return edgeReply(request, 500, 'Edge proxy is not configured');
        }

        const incoming = new URL(request.url);
        if (!isBackendPath(incoming.pathname)) {
            return edgeReply(request, 404, 'Not found');
        }
        const needsTurnstile = isProtected(request, incoming.pathname);
        if (needsTurnstile) {
            const refusal = await verifyTurnstile(request, env);
            if (refusal) {
                return refusal;
            }
        }

        const target = new URL(env.ORIGIN_URL);
        // Path and query pass through untouched; only the host changes. Cloud
        // Run routes on Host for its run.app domain, and constructing the URL
        // from the origin is what sets it correctly.
        target.pathname = incoming.pathname;
        target.search = incoming.search;

        const headers = new Headers(request.headers);
        // Drop any value the client sent under this name before setting ours.
        // set() would overwrite anyway; deleting first states the intent - a
        // caller must never be able to influence what the origin reads here.
        headers.delete('x-edge-auth');
        headers.set('X-Edge-Auth', env.EDGE_SECRET);
        if (needsTurnstile) {
            // Already verified and single-use; the backend has no use for it.
            headers.delete(TURNSTILE_HEADER);
        }

        try {
            // Returned as-is. The backend already emits the CORS headers the
            // browser needs, including the exposed Retry-After the frontend
            // reads to tell a visitor how long a rate limit lasts; rewriting
            // any of that here would only create a second place for it to
            // drift.
            const upstream = await fetch(
                new Request(target, {
                    method: request.method,
                    headers,
                    body: request.body,
                    redirect: 'manual',
                })
            );
            // Google's front end adds its request-trace id to every Cloud Run
            // reply. It is internal plumbing with no use to a browser, so it
            // stops here; everything else, the CORS headers included, passes.
            const response = new Response(upstream.body, upstream);
            for (const name of INTERNAL_RESPONSE_HEADERS) {
                response.headers.delete(name);
            }
            return response;
        } catch (err) {
            // The origin is unreachable, or took too long. Without this the
            // rejection escapes and Cloudflare answers with its own 1101 error
            // page - an HTML block the frontend cannot parse, arriving with no
            // CORS headers, so the browser reports it as a CORS failure and the
            // chat's "could not reach my notes" path never runs. A 502 sent
            // through edgeReply carries the CORS header, so the browser lets
            // the frontend read the status and act on it.
            console.error('origin fetch failed', err);
            return edgeReply(request, 502, 'Bad gateway');
        }
    },
};
