# edge — the API's front door

A Cloudflare Worker that sits in front of the Cloud Run backend on
`api.<your-domain>`, so the API is reached through Cloudflare rather than by
calling its `run.app` URL directly.

## Why it exists

A Cloud Run service a browser can call is a service anyone can call. CORS does
not change that: CORS is enforced by browsers, on browsers, so `curl` and a
for-loop ignore it completely.

The exposure is not stolen data — everything this API returns is already
public. It is **cost and availability**: the chat endpoint spends model quota
per call, and the backend's global rate limit is a budget shared with real
visitors. Anyone who wants to can exhaust it and leave the site answering 429s.

The Worker adds a shared secret to every request it forwards, and the backend
refuses requests that do not carry it. The `run.app` URL stays technically
reachable — Cloud Run offers no way to hide it short of a load balancer costing
more per month than a portfolio costs per year — but without the secret it
answers 403.

**The secret's unguessability is the entire mechanism.** Any client can send
any header, so the header *name* protects nothing. Use a long random value.

## Forking this

Three things are specific to one deployment. Change all three:

| Where | What | Notes |
| --- | --- | --- |
| `wrangler.jsonc` → `name` | Worker name | Any name unique to your account |
| `wrangler.jsonc` → `routes[0].pattern` | `api.<your-domain>` | The zone must already be on Cloudflare |
| `wrangler.jsonc` → `vars.ORIGIN_URL` | Your backend's URL | Not a secret; it is already inlined into the built frontend bundle |

Nothing secret is committed here, and nothing should be. `EDGE_SECRET` is set
with `wrangler secret put` and lives only in Cloudflare.

## Deploying

```sh
npx wrangler login          # interactive; needs a real terminal
npx wrangler secret put EDGE_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler deploy
```

`custom_domain: true` makes Cloudflare create and manage the DNS record for the
hostname, so the route and the record cannot drift apart the way they would if
the record were added by hand.

## Rolling it out without downtime

The backend treats an **unset** `ORIGIN_SHARED_SECRET` as "do not enforce".
That is deliberate, and it is what makes the order below safe — no step can
strand the site against an API that has already started rejecting it.

1. Deploy the Worker. Both paths work; the backend is not enforcing yet.
2. Point the frontend's backend URL at `https://api.<your-domain>` and deploy.
   The site now goes through the Worker; the backend still accepts everything.
3. Give the backend the same secret and deploy. Enforcement begins, and direct
   `run.app` calls start returning 403.

Rotating the secret runs the same way: add the new value to both sides before
removing the old one from either.

## Turnstile

The shared secret proves a request came through the Worker, not who sent it to
the Worker. For the routes that cost something per call, the Worker also checks
a [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) token: a
per-request proof that a browser running the site sent the message.

- **Routes:** `POST /chat-with-files`, `POST /api/contact` and `POST /api/booking`. Everything else
  (GETs, CORS preflights, other paths) is forwarded as before.
- **Header:** the frontend sends the token in `X-Turnstile-Token`. The Worker
  verifies it against Turnstile's `siteverify` with `TURNSTILE_SECRET_KEY`, and
  removes the header before forwarding to the backend.
- **Responses:** the backend's reply reaches the visitor as the backend sent
  it, CORS and `Retry-After` included, minus one header: Google Cloud's
  `x-cloud-trace-context`, an internal request id that names the platform
  behind the Worker and tells a visitor nothing.
- **Keys:** the public site key lives in `frontend/src/constants/turnstile.ts`.
  The secret key is a Worker secret, set with `wrangler secret put` and never
  committed.

The check fails closed. "Could not check" is never treated as "checked":

| Situation | Reply |
| --- | --- |
| Token missing, empty, over 2048 characters, or rejected by `siteverify` | 403, "Couldn't confirm this message came from a browser. Reload the page and send it again." |
| `TURNSTILE_SECRET_KEY` unset, or `siteverify` unreachable, timed out (5 s), non-2xx or unparseable | 503, "The chat can't take messages right this moment. Give it a minute and send it again." |

Both replies are JSON `{ "detail": "..." }`, which the frontend shows to the
visitor as-is, and carry `Access-Control-Allow-Origin` echoing the request's
`Origin` so the browser lets it read them. An unset secret is also logged by
name in the Worker's logs.

Rollout order that avoids downtime:

1. Deploy the frontend that sends the token. Harmless before the Worker checks
   it.
2. `npx wrangler secret put TURNSTILE_SECRET_KEY`.
3. Deploy the Worker. Enforcement begins.

Deploying the Worker before step 2 makes the protected routes answer 503 until
the secret is set.

The Cloudflare rate limiting rule is separate: it is configured in the
dashboard and needs no code.

## The same secret in two places

The value must be byte-identical in the Worker (`wrangler secret put
EDGE_SECRET`) and in the backend's environment. The backend strips surrounding
whitespace before comparing, which forgives a trailing newline from a file, and
compares with a constant-time function so the check cannot be probed a byte at
a time.
