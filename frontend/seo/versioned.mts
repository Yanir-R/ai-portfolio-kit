/**
 * Share images with their content in the address.
 *
 * LinkedIn, Facebook and WhatsApp keep an image they fetched under its URL
 * for days, and a page they re-read does not make them fetch the image again.
 * When the home card was redrawn under the same /og-image.png, LinkedIn went
 * on showing the old drawing next to the new title. So every share image is
 * linked as `/file.png?v=<hash of what it shows>`: a changed image is a new
 * address, and an unchanged one keeps its address and its cache.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(FRONTEND, 'public');

const hash = (...parts: (string | Buffer)[]) => {
    const h = createHash('sha256');
    for (const p of parts) h.update(p);
    return h.digest('hex').slice(0, 10);
};

/** A file in public/, by its site path, with a version from its bytes. */
export const versionedPublic = (sitePath: string) => {
    const file = path.join(PUBLIC, sitePath);
    return existsSync(file) ? `${sitePath}?v=${hash(readFileSync(file))}` : sitePath;
};

/**
 * A share card that is drawn after the build (scripts/share-cards.mjs), so
 * its bytes do not exist yet: the version comes from everything that decides
 * them - what the card says, the picture on it and the script that draws it.
 */
export const versionedCard = (sitePath: string, card: object, image?: string) => {
    const script = readFileSync(path.join(FRONTEND, 'scripts', 'share-cards.mjs'));
    const picture =
        image && existsSync(path.join(PUBLIC, image)) ? readFileSync(path.join(PUBLIC, image)) : '';
    return `${sitePath}?v=${hash(JSON.stringify(card), picture, script)}`;
};
