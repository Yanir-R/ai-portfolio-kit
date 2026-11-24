#!/usr/bin/env node
/*
 * Asserts that the home page's link-preview copy agrees everywhere it appears.
 *
 * HOME_SHARE in seo/facts.mts is the source. index.html repeats the title and
 * description in its meta tags, and tools/og-card.html draws the description
 * onto the card image. Neither can import a constant, so each is written by
 * hand and can drift on its own.
 *
 * Drift is invisible from inside the app: the page renders and every other
 * check passes, while the preview advertises a sentence the site no longer
 * says. The only symptom appears in someone else's chat client, which is why
 * this is a CI step rather than a note in a README.
 *
 * This compares text only. It cannot tell whether public/og-image.png was
 * regenerated from tools/og-card.html afterwards; see that file's header.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const SOURCE = 'seo/facts.mts';
// Only the HOME_SHARE block: PERSON above it has its own `description`.
const source = read(SOURCE).split('export const HOME_SHARE')[1] || '';
const field = (name) => {
    const m = source.match(new RegExp(`\\b${name}:\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1`));
    if (!m) {
        console.error(`Could not find HOME_SHARE.${name} in ${SOURCE}.`);
        process.exit(2);
    }
    return m[2].replace(/\\(['"\\])/g, '$1');
};
const title = field('title');
const description = field('description');

const checks = [
    { file: 'index.html', text: title, expected: 4, what: 'title / meta title / og:title / twitter:title' },
    {
        file: 'index.html',
        text: description,
        expected: 3,
        what: 'description / og:description / twitter:description',
    },
    { file: 'tools/og-card.html', text: description, expected: 1, what: 'the Hebrew card subtitle' },
];

let failed = false;
for (const { file, text, expected, what } of checks) {
    const found = read(file).split(text).length - 1;
    if (found === expected) {
        console.log(`  ok    ${file} - ${expected}x (${what})`);
    } else {
        failed = true;
        console.error(`  FAIL  ${file} - found ${found}x, expected ${expected}x (${what})`);
    }
}

if (failed) {
    console.error(
        `\nThe link preview no longer matches HOME_SHARE in ${SOURCE}.\n` +
            `Copy the strings from there into the places listed above, then regenerate\n` +
            `public/og-image.png - see the header of tools/og-card.html.`
    );
    process.exit(1);
}

console.log('\nPreview copy matches.');
