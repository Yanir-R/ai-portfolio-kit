/*
 * Offering English to visitors from outside Israel.
 *
 * The site sits behind Cloudflare, which answers /cdn-cgi/trace on every
 * proxied domain with plain `key=value` lines, `loc` among them: the
 * visitor's country, read at the edge. No code of ours runs there and it
 * costs nothing. In development the path does not exist, so no offer shows.
 */
export const GEO_TRACE_PATH = '/cdn-cgi/trace';

/** Visitors from here get the Hebrew site with no offer. */
export const HOME_COUNTRY = 'IL';

/** Set once the visitor has answered the offer or opened the English site. */
export const LANG_OFFER_KEY = 'lang-offer-answered';
