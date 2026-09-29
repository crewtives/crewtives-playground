import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { woff2Codepoints, woff2Family } from './woff2';

const repo = resolve(import.meta.dirname, '../../../..');
const museumFonts = resolve(import.meta.dirname, '../fonts');

/** The 23 families of 4D.OS and the landings (inventory in LICENSES.md). */
const USED = [
  'Host Grotesk', 'Departure Mono', 'Bricolage Grotesque', 'Geist Pixel', 'Big Shoulders Stencil', 'Doto', 'Archivo', 'Permanent Marker',
  'Tektur', 'Jura', 'Science Gothic', 'Handjet', 'Atkinson Hyperlegible Next', 'Bungee', 'Bungee Shade', 'DotGothic16', 'M PLUS Rounded 1c',
  'Tilt Warp', 'Rampart One', 'Libre Franklin', 'Sono', 'Ultra', 'Recursive',
];

/** Root of the extended family: "Geist Pixel" → "geist", "Recursive Mono" → "recursive". */
const root = (family: string) => family.toLowerCase().split(/\s+/)[0];

const has = (cps: Set<number>, chars: string) => [...chars].every((c) => cps.has(c.codePointAt(0)!));

describe('museum font audit (8.4)', () => {
  const files = readdirSync(museumFonts).filter((f) => f.endsWith('.woff2'));
  const read = (f: string) => readFileSync(join(museumFonts, f));

  test('the inventory of families already in use is the 23 in LICENSES.md', () => {
    expect(USED).toHaveLength(23);
    const licenses = readFileSync(join(repo, 'LICENSES.md'), 'utf8');
    for (const family of USED) expect(licenses).toContain(family);
  });

  test('two families, neither used in 4D.OS or the landings nor a sibling of one', () => {
    const families = [...new Set(files.map((f) => woff2Family(read(f)).replace(/ (Thin|Regular|Roman|Medium|Bold).*$/, '')))];
    expect(families.sort()).toEqual(['Fira Mono', 'Geologica']);
    for (const family of families) {
      expect(USED).not.toContain(family);
      expect(USED.map(root)).not.toContain(root(family));
    }
  });

  test('φ, θ, α, π and τ in the Greek subset and the punctuation in the Latin one', () => {
    const cps = (prefix: string) => new Set(files.filter((f) => f.startsWith(prefix)).flatMap((f) => [...woff2Codepoints(read(f))]));
    for (const prefix of ['geologica', 'fira-mono']) {
      const set = cps(prefix);
      expect(has(set, 'φθαπτ'), prefix).toBe(true);
      expect(has(set, '·−½°×–—’“”é'), prefix).toBe(true);
      // Neither has arrows or the root sign: those are drawn in SVG (D9).
      expect(has(set, '←'), prefix).toBe(false);
      expect(has(set, '√'), prefix).toBe(false);
    }
  });

  test('each family has its OFL license next to it', () => {
    for (const license of ['OFL-geologica.txt', 'OFL-fira-mono.txt']) {
      expect(existsSync(join(museumFonts, license))).toBe(true);
      expect(readFileSync(join(museumFonts, license), 'utf8')).toContain('SIL Open Font License, Version 1.1');
    }
  });
});
