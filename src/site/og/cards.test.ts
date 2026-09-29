import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { woff2Codepoints } from '../../playground/museum/build/woff2';
import { CAT_CREDIT } from '../../playground/shared/worlds';
import { creditFor, isSynthetic, PAGES } from '../pages';
import {
  BAND,
  bandColors,
  bandRuns,
  bandText,
  CAPTURES_DIR,
  cardFor,
  CARDS,
  contrast,
  CONTRAST_MIN,
  FRAME,
  IMAGE,
  IMAGE_BYTES_MAX,
  pageFor,
  readToken,
} from './cards';
import { decodePng, pngSize } from './png';

const repo = resolve(import.meta.dirname, '../../..');
const codepoints = new Map<string, Set<number>>();
const cmap = (file: string) => {
  if (!codepoints.has(file)) codepoints.set(file, woff2Codepoints(readFileSync(resolve(repo, file))));
  return codepoints.get(file)!;
};

describe('share-image cards', () => {
  test('one card per registry page, in registry order', () => {
    expect(CARDS.map((c) => c.slug)).toEqual(PAGES.map((p) => p.slug));
  });

  test('every source capture, record, typeface and token file exists', () => {
    for (const card of CARDS) {
      const files = [card.source, card.record, card.display.file, card.text.file, card.background.file, card.ink.file, card.tag.background.file, card.tag.ink.file];
      for (const file of files) expect(existsSync(resolve(repo, file)), `${card.slug}: ${file}`).toBe(true);
    }
  });

  test('every character of every band string is in the typeface that draws it', () => {
    for (const card of CARDS) {
      for (const run of bandRuns(card)) {
        const missing = [...run.text].filter((ch) => !cmap(run.face.file).has(ch.codePointAt(0)!));
        expect(missing, `${card.slug}: "${run.text}" in ${run.face.file}`).toEqual([]);
      }
    }
  });

  test('band text: the site name, a trimmed title and only printable characters', () => {
    for (const card of CARDS) {
      const text = bandText(card);
      expect(text.site).toBe('crewtives playground');
      expect(text.title.trim()).toBe(text.title);
      expect(text.title.length).toBeGreaterThan(0);
      for (const run of bandRuns(card)) expect(run.text, `${card.slug}: control or unassigned character`).not.toMatch(/\p{C}/u);
    }
  });

  test('each card shows exactly the worlds the registry says its frame shows', () => {
    for (const card of CARDS) expect([...card.shows].sort(), card.slug).toEqual([...PAGES.find((p) => p.slug === card.slug)!.frameShows].sort());
  });

  test('ink on background, and the mark’s ink on its fill, are at least 4.5:1', () => {
    for (const card of CARDS) {
      const colors = bandColors(card, repo);
      expect(contrast(colors.ink, colors.background), `${card.slug}: ink on background`).toBeGreaterThanOrEqual(CONTRAST_MIN);
      expect(contrast(colors.tagInk, colors.tagBackground), `${card.slug}: mark`).toBeGreaterThanOrEqual(CONTRAST_MIN);
    }
  });

  test('the token reader takes any opaque --name: #hex declaration and refuses ambiguity', () => {
    expect(readToken({ file: 'src/playground/museum/tokens.css', name: '--sheet' }, repo)).toBe('#f5f4ef');
    expect(readToken({ file: 'src/4d-os/launcher/launcher.css', name: '--l-ink' }, repo)).toBe('#121110');
    expect(() => readToken({ file: 'src/playground/museum/tokens.css', name: '--no-such-token' }, repo)).toThrow(/no --no-such-token/);
    expect(() => readToken({ file: 'src/playground/museum/tokens.css', name: '--rule' }, repo)).toThrow(/translucent/);
    expect(() => readToken({ file: 'src/playground/bloomscope/tokens.css', name: '--g-hi' }, repo)).toThrow(/different values/);
  });

  test('WCAG contrast: black on white is 21:1 and a color on itself 1:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#5a1a1c', '#5a1a1c')).toBe(1);
  });
});

const OG = 'sites/playground/public/og';
const read = (path: string) => readFileSync(resolve(repo, path));
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const provenance = () => JSON.parse(read(`${OG}/provenance.json`).toString('utf8'));
const DERIVATIVE = "Derivative of a CC-BY 3.0 model: requires the cat's credit";
const OWN = 'Own work, MIT';

describe('share images (spec site-metadata, "Share images are real frames")', () => {
  test('10 PNGs of 1200×630, each at most 300 KB', () => {
    for (const card of CARDS) {
      const bytes = read(`${OG}/${card.slug}.png`);
      expect(pngSize(bytes), card.slug).toEqual(IMAGE);
      expect(bytes.length, card.slug).toBeLessThanOrEqual(IMAGE_BYTES_MAX);
    }
  });

  test('the frame is the recorded region of the source, copied pixel for pixel', () => {
    for (const card of CARDS) {
      const image = decodePng(read(`${OG}/${card.slug}.png`));
      const source = decodePng(read(card.source));
      const { x, y } = card.region;
      expect(x + FRAME.width <= source.width && y + FRAME.height <= source.height, `${card.slug}: region inside the source`).toBe(true);
      let differing = 0;
      for (let row = 0; row < FRAME.height; row++) {
        const a = image.data.subarray(row * image.width * 4, (row * image.width + FRAME.width) * 4);
        const b = source.data.subarray(((y + row) * source.width + x) * 4, ((y + row) * source.width + x + FRAME.width) * 4);
        if (!Buffer.from(a).equals(Buffer.from(b))) for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) differing++;
      }
      expect(differing, `${card.slug}: differing pixels in the frame`).toBe(0);
    }
  });

  test('the band sits beside the frame and starts with its hairline in the band’s ink', () => {
    for (const card of CARDS) {
      const image = decodePng(read(`${OG}/${card.slug}.png`));
      const ink = bandColors(card, repo).ink;
      const at = (px: number, py: number) => `#${[...image.data.subarray((py * image.width + px) * 4, (py * image.width + px) * 4 + 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      expect(BAND.x).toBe(FRAME.width);
      for (const py of [0, 315, 629]) expect(at(BAND.x, py), `${card.slug}: hairline at row ${py}`).toBe(ink);
    }
  });

  test('sidecars and provenance.json state each image’s actual SHA-256, and each source’s SHA-256 matches its file', () => {
    const record = provenance();
    expect(Object.keys(record.images)).toEqual(CARDS.map((c) => `${c.slug}.png`));
    for (const card of CARDS) {
      const hash = sha256(read(`${OG}/${card.slug}.png`));
      const entry = record.images[`${card.slug}.png`];
      const sidecar = JSON.parse(read(`${OG}/${card.slug}.png.json`).toString('utf8'));
      expect(Object.keys(sidecar).sort(), card.slug).toEqual(['createdAt', 'prompt']);
      expect(sidecar.prompt, card.slug).toMatch(/^Origin: not generated\./);
      expect(sidecar.prompt, card.slug).toContain(hash);
      expect(sidecar.prompt, card.slug).toContain(card.source);
      expect(entry.image.sha256, card.slug).toBe(hash);
      expect(entry.image.bytes, card.slug).toBe(read(`${OG}/${card.slug}.png`).length);
      expect(entry.source.path, card.slug).toBe(card.source);
      expect(entry.source.sha256, card.slug).toBe(sha256(read(card.source)));
      expect(entry.region, card.slug).toEqual({ ...card.region, ...FRAME });
      expect(entry.route, card.slug).toBe(pageFor(card.slug).route);
    }
  });

  test('the new captures match their record: route, viewport, dpr, reduced motion, clock, browser and renderer', () => {
    const record = JSON.parse(read(`${CAPTURES_DIR}/provenance.json`).toString('utf8'));
    const captured = CARDS.filter((c) => c.source.startsWith(`${CAPTURES_DIR}/`));
    expect(Object.keys(record.captures).sort()).toEqual(captured.map((c) => c.source.split('/').pop()).sort());
    for (const card of captured) {
      const entry = record.captures[card.source.split('/').pop()!];
      const bytes = read(card.source);
      expect(entry.file.sha256, card.slug).toBe(sha256(bytes));
      expect([entry.file.width, entry.file.height], card.slug).toEqual([entry.viewport.width, entry.viewport.height]);
      expect(pngSize(bytes), card.slug).toEqual({ width: entry.viewport.width, height: entry.viewport.height });
      expect(entry.route, card.slug).toBe(pageFor(card.slug).route);
      expect(entry.dpr, card.slug).toBe(1);
      expect(typeof entry.reducedMotion, card.slug).toBe('boolean');
      expect(entry.clock.origin, card.slug).toMatch(/^\d{4}-\d\d-\d\dT/);
      expect(entry.browserVersion, card.slug).toMatch(/^\d+\./);
      expect(entry.renderer, card.slug).toMatch(/SwiftShader/);
      expect(entry.commit, card.slug).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  test('the credit and "synthetic" are in the band exactly when the registry says so, and each image was composed with the current band', () => {
    const record = provenance();
    for (const card of CARDS) {
      const page = pageFor(card.slug);
      const text = bandText(card);
      expect(text.synthetic !== null, card.slug).toBe(isSynthetic(page));
      expect(text.credit, card.slug).toBe(creditFor(page)?.text ?? null);
      expect(text.series !== null, card.slug).toBe(page.site === '4d-os');
      if (card.shows.some((w) => w === 'a' || w === 'b' || w === 'c')) expect(text.credit, card.slug).toBe(CAT_CREDIT.text);
      expect(record.images[`${card.slug}.png`].band.text, `${card.slug}: recompose after a band change`).toEqual(text);
      expect(record.images[`${card.slug}.png`].credit, card.slug).toBe(text.credit);
      expect(record.images[`${card.slug}.png`].synthetic, card.slug).toBe(text.synthetic !== null);
    }
  });
});

describe('site icons (add-seo-and-sharing D4)', () => {
  test('favicon.ico holds PNG images of 16, 32 and 48 px of the same drawing', () => {
    const ico = read('sites/playground/public/favicon.ico');
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    expect([view.getUint16(0, true), view.getUint16(2, true), view.getUint16(4, true)]).toEqual([0, 1, 3]);
    const sizes = [];
    for (let i = 0; i < 3; i++) {
      const entry = 6 + 16 * i;
      const png = ico.subarray(view.getUint32(entry + 12, true), view.getUint32(entry + 12, true) + view.getUint32(entry + 8, true));
      const { width, height } = pngSize(png);
      expect([ico[entry], ico[entry + 1]]).toEqual([width, height]);
      expect(view.getUint16(entry + 6, true)).toBe(png[25] === 6 ? 32 : 24);
      sizes.push(width);
    }
    expect(sizes).toEqual([16, 32, 48]);
  });

  test('the apple-touch-icons are opaque 180×180 PNGs', () => {
    for (const path of ['sites/playground/public/apple-touch-icon.png', 'sites/4d-os/public/apple-touch-icon.png']) {
      const png = read(path);
      expect(pngSize(png), path).toEqual({ width: 180, height: 180 });
      expect(png[25], `${path}: RGB, so opaque`).toBe(2);
    }
  });

  test('the playground icon is the museum’s own inline mark, and the 4D.OS mark uses only the launcher’s ink and paper', () => {
    const museum = read('sites/playground/index.html').toString('utf8');
    const inline = /<link rel="icon" href="data:image\/svg\+xml,([^"]+)"/.exec(museum);
    expect(inline).not.toBeNull();
    expect(read('sites/playground/public/icon.svg').toString('utf8').trim()).toBe(decodeURIComponent(inline![1]));
    const mark = read('sites/4d-os/public/icon.svg').toString('utf8');
    const launcher = ['--l-ink', '--l-paper'].map((name) => readToken({ file: 'src/4d-os/launcher/launcher.css', name }, repo));
    expect([...new Set(mark.match(/#[0-9a-f]{6}/gi))].sort()).toEqual(launcher.sort());
    expect(mark).not.toMatch(/<text|<image|href=/);
  });
});

describe('LICENSES.md rows (public-repository, "Licenses and credits")', () => {
  const rows = read('LICENSES.md').toString('utf8').split('\n').filter((line) => line.startsWith('|'));
  const rowsIn = (folder: string) => rows.filter((row) => row.includes(`\`${folder}/\``));

  test('every share image has exactly one row, a derivative of the CC-BY model exactly when it shows the cat', () => {
    for (const card of CARDS) {
      const named = rowsIn(OG).filter((row) => row.includes(`\`${card.slug}.png\``));
      expect(named, card.slug).toHaveLength(1);
      expect(named[0], card.slug).toContain(creditFor(pageFor(card.slug)) ? DERIVATIVE : OWN);
      expect(named[0], card.slug).toContain('output of the fonts');
    }
  });

  test('every new source capture has exactly one row, with the same rule', () => {
    for (const card of CARDS.filter((c) => c.source.startsWith(`${CAPTURES_DIR}/`))) {
      const file = card.source.split('/').pop()!;
      const named = rowsIn(CAPTURES_DIR).filter((row) => row.includes(`\`${file}\``));
      expect(named, file).toHaveLength(1);
      expect(named[0], file).toContain(cardFor(card.slug).shows.some((w) => w === 'a' || w === 'b' || w === 'c') ? DERIVATIVE : OWN);
    }
  });

  test('the icons have a row', () => {
    const row = rows.find((r) => r.includes('`favicon.ico`'));
    expect(row).toBeDefined();
    for (const name of ['`icon.svg`', '`apple-touch-icon.png`', '`sites/playground/public/`', '`sites/4d-os/public/`']) expect(row).toContain(name);
  });
});

