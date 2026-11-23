/*
 * Cloudflare Turnstile, the bot check in front of the chat.
 *
 * The site key is public by design: it ships in the page, and anyone can read
 * it out of the bundle. It only identifies the widget. What makes a token worth
 * anything is the secret it is verified against, and that lives only in the
 * edge Worker, as TURNSTILE_SECRET_KEY - never in this repository.
 */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAGOjWkrUmbqVFHaa';

// `render=explicit` stops api.js scanning the page for widgets to render on its
// own. The chat renders exactly one, into a container it owns, when it mounts.
export const TURNSTILE_SCRIPT_URL =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// The request header the token travels in. The Worker reads the same name, so
// the two have to change together.
export const TURNSTILE_HEADER = 'X-Turnstile-Token';
