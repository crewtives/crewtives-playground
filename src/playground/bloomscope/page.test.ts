// Contract of the static HTML and the tokens: the index matches worlds.ts, the sections follow the
// spec's order, the contrasts are high enough and the text uses no glyphs the fonts lack.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAT_CREDIT, LAB_SLOTS, LAUNCHER, WORLDS, checkBackLink, checkIndexHtml } from '../shared/worlds';
import { SHEETS } from '../museum/collection';
import { ChamberModel, MAX_SPECIMENS, readoutText } from './chamberModel';
import { decodeGarden, encodeGarden, gardenFromHash, type Garden } from './garden';
import { DEFAULT_GARDEN, GOLDEN_ANGLE } from './specimens/spec';

const html = readFileSync(resolve(import.meta.dirname, '../../../sites/playground/bloomscope/index.html'), 'utf8');
const tokens = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8');
const style = readFileSync(resolve(import.meta.dirname, 'style.css'), 'utf8');

/** Approximate visible text: no tags, no <svg>, no comments. */
function visibleText(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<\/?(a|span)\b[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function section(id: string): string {
  const start = html.indexOf(`<section id="${id}"`);
  expect(start).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf('</section>', start));
}

describe('page at its route, in order', () => {
  it('title, language and description', () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Bloomscope · crewtives playground</title>');
    expect(html).toMatch(/<meta\s+name="description"/);
  });

  it('Scope, index, Sow, lathe, honeycomb and footer, in that order (Full walkthrough)', () => {
    const order = ['id="scope"', 'id="worlds"', 'id="sow"', 'id="lathe"', 'id="hive"', '<footer'].map((m) => html.indexOf(m));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('the navigation links the sections in page order', () => {
    const nav = html.slice(html.indexOf('<nav class="sections-nav"'), html.indexOf('</nav>'));
    expect([...nav.matchAll(/href="#([a-z]+)"/g)].map((m) => m[1])).toEqual(['scope', 'worlds', 'sow', 'lathe', 'hive']);
  });

  it('the first screen has a visible link to the index and the sound button off', () => {
    const hero = section('scope');
    expect(hero).toContain('href="#worlds"');
    expect(hero).toContain('Or skip to the five 4D.OS worlds');
    expect(html).toMatch(/<button class="[^"]*sound-toggle[^"]*" type="button" aria-pressed="false">/);
    expect(visibleText(html)).toContain('Sound off');
  });

  it('each bench toy is built in its section: view, peephole, "Put in the Scope" and display selector', () => {
    const views = { sow: 'sow-view', lathe: 'lathe-view', hive: 'hive-view' } as const;
    for (const [id, view] of Object.entries(views)) {
      const part = section(id);
      expect(part).toContain('class="slab"');
      expect(part).toContain(`class="${view}"`);
      expect(part).toContain('class="peephole-view"');
      expect(part).toMatch(/put-in[^"]*"[^>]*>.*Put in the Scope/);
      expect(part).toContain('data-pixels');
      // No empty "still being made" cell is left (D16: only for unfinished toys).
      expect(part).not.toContain('still being made');
    }
  });

  it('the bench headlines and texts are the ones in the spec', () => {
    expect(visibleText(section('lathe'))).toContain('A rosette is a staircase, squashed.');
    expect(visibleText(section('hive'))).toContain('Honeycomb keeps every generation.');
    expect(visibleText(section('hive'))).toContain('a hexagonal cousin of Life (rule B2/S34)');
    expect(visibleText(section('sow'))).toContain("With sound on, each seed plays a note set by its angle. That mapping is ours, not the sunflower's.");
    for (const label of ['Echeveria', 'Aloe, clockwise', 'Aloe, counter-clockwise', '+1 leaf', '+8', '−1', 'Rosette', 'Half', 'Staircase', 'Drop water']) {
      expect(visibleText(section('lathe'))).toContain(label);
    }
    for (const label of ['Run', 'Step', 'Rewind', 'Clear', 'Random (seed', 'generation']) expect(visibleText(section('hive'))).toContain(label);
    for (const label of ['Hold to sow', 'Sow 100', 'Clear', 'Scrub births', 'Press this head', 'Golden 137.508°', 'Root 2 turn 149.117°']) {
      expect(visibleText(section('sow'))).toContain(label);
    }
  });

  it('Sow carries the literal golden-angle sentence', () => {
    expect(visibleText(section('sow'))).toContain('Mirrors only close into a pattern at 180°/n; the golden angle is not one of them.');
  });
});

describe('index "Load another wheel." (checker against worlds.ts)', () => {
  const index = section('worlds');
  const text = visibleText(index);

  it('is the second section, with its headline', () => {
    expect(html.indexOf('id="worlds"')).toBeGreaterThan(html.indexOf('id="scope"'));
    expect(html.indexOf('id="worlds"')).toBeLessThan(html.indexOf('id="sow"'));
    expect(text).toContain('Load another wheel.');
  });

  it('real links to the launcher and to the five worlds, in order (Real links)', () => {
    const hrefs = [...index.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([LAUNCHER.route, ...WORLDS.map((w) => w.route)]);
    expect(text).toContain('The desktop that holds all five worlds.');
    expect(text).toContain('Enter 4D.OS');
  });

  it('each world has its real still image, its line, its route and "synthetic scene"', () => {
    for (const world of WORLDS) {
      const start = index.indexOf(`href="${world.route}"`);
      const card = index.slice(start, index.indexOf('</li>', start));
      expect(card).toContain(`src="${world.still}"`);
      expect(card).toContain(`alt="${world.alt}"`);
      expect(card).toContain('loading="lazy"');
      expect(visibleText(card)).toContain(world.line);
      expect(visibleText(card)).toContain(world.route);
      expect(visibleText(card)).toContain('synthetic scene');
      expect(visibleText(card)).toContain(`${world.letter} · ${world.name}`);
      // Literal credit next to the image of A, B and C (Cat credit).
      if (world.credit) expect(visibleText(card)).toContain(CAT_CREDIT.text);
      else expect(card).not.toContain('J-Toastie');
    }
  });

  it('exactly three lab cells, with no links, no name and no focus (Lab slots)', () => {
    const lab = index.slice(index.indexOf('<ul class="lab"'), index.indexOf('</ul>', index.indexOf('<ul class="lab"')));
    expect((lab.match(/<li>/g) ?? []).length).toBe(LAB_SLOTS.length);
    expect(LAB_SLOTS).toHaveLength(3);
    expect(lab).not.toMatch(/<a |href=|tabindex/);
    expect((visibleText(lab).match(/Empty cell · a sketch in the lab, not public yet/g) ?? []).length).toBe(3);
    for (const slot of LAB_SLOTS) expect(visibleText(lab)).toContain(slot.kind);
  });

  it('shared index checker', () => {
    expect(checkIndexHtml(html)).toEqual([]);
  });

  it('closes with its line', () => {
    expect(text).toContain('Each world is a real scene you can scrub through time. The empty cells are experiments still growing.');
  });

  it('the still images are neither dithered again nor filtered', () => {
    expect(style).not.toMatch(/\.wheel img[^{]*\{[^}]*(filter|mix-blend|image-rendering)/);
  });
});

describe('footer and honesty', () => {
  const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  const text = visibleText(footer);

  it('stamp, credits and crewtives (Footer and title, Correct credits)', () => {
    expect(text).toContain('Bloomscope · demo build 0.1');
    expect(footer).toContain('href="https://crewtives.com"');
    expect(text).toContain('Made by crewtives');
    expect(text).toContain(CAT_CREDIT.text);
    expect(text).toMatch(/Ultra by Astigmatic[^;]*Recursive by Arrow Type/);
    for (const other of ['Bagel', 'Bungee', 'Tilt Warp', 'Libre Franklin', 'Zen Maru', 'M PLUS']) expect(text).not.toContain(other);
    expect(text).toContain('three.js');
    expect(text).toContain('GSAP');
    expect(text).toContain('Lenis');
  });

  it('goes back to its museum sheet, without JavaScript and with the vector arrow (Way back without JavaScript)', () => {
    const sheet = SHEETS.find((s) => s.views.some((v) => v.loop === 'bloomscope'))!;
    expect(sheet.number).toBe('004');
    expect(checkBackLink(footer, { href: `/#sheet-${sheet.number}`, text: `Playground · Sheet ${sheet.number}`, arrow: 'icon' })).toEqual([]);
    expect(html).toContain('<symbol id="i-left"');
    expect(visibleText(html)).not.toContain('←');
  });

  it('is no longer a candidate and does not link to the comparison (No candidate line)', () => {
    expect(visibleText(html)).not.toMatch(/candidat/i);
    expect(html).not.toMatch(/href="\/landings\/"/);
  });

  it('says exactly what it stores: only the sound setting', () => {
    expect(text).toContain('This page sends nothing. It only remembers your sound setting, in this browser.');
  });
});

describe('typography and glyphs', () => {
  it('no text uses glyphs the fonts lack', () => {
    for (const source of [visibleText(html), html.match(/content="[^"]*"/g)?.join(' ') ?? '']) {
      for (const glyph of ['≈', '→', '←', '↻', '↺', '√', 'φ']) expect(source).not.toContain(glyph);
    }
  });

  it('Ultra, Recursive casual and Recursive Mono, self-hosted; "block" only for Ultra', () => {
    const faces = tokens.match(/@font-face\s*{[^}]*}/g) ?? [];
    expect(faces).toHaveLength(3);
    expect(faces.filter((f) => f.includes('font-display: block'))).toHaveLength(1);
    expect(faces.find((f) => f.includes('font-display: block'))).toContain("'Ultra'");
    for (const face of faces) expect(face).toMatch(/url\('\.\/fonts\/[a-z0-9-]+\.woff2'\)/);
  });

  it('no headline goes past 96 px (Headline limit)', () => {
    const sizes = [...(tokens + style).matchAll(/--size-(?:hero|slab):\s*([\d.]+)rem/g)].map((m) => Number(m[1]) * 16);
    expect(sizes.length).toBeGreaterThan(0);
    for (const px of sizes) expect(px).toBeLessThanOrEqual(96);
  });
});

/** WCAG relative luminance of a hex color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens);
  if (!match) throw new Error(`missing --${name}`);
  return match[1];
}

describe('color', () => {
  it('plum ink on every light field ≥ 4.5:1 (Body contrast)', () => {
    for (const field of ['chartreuse', 'vogel', 'petal', 'lilac', 'glaucous', 'honey', 'sheet']) {
      expect(contrast(token('ink'), token(field))).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token('sheet'), token('ink'))).toBeGreaterThanOrEqual(4.5);
  });

  it('the ink rule of the ruby contrasts ≥ 3:1 with chartreuse, honey and paper ("NOW" contrast)', () => {
    for (const field of ['chartreuse', 'honey', 'sheet']) expect(contrast(token('ink'), token(field))).toBeGreaterThanOrEqual(3);
  });

  it('the fields are the ones in the spec and cobalt is the field of no section', () => {
    expect(token('chartreuse')).toBe('#c8f03c');
    expect(token('vogel')).toBe('#b2db2a');
    expect(token('lilac')).toBe('#b99cff');
    expect(token('sheet')).toBe('#fdfdf6');
    expect(style).not.toMatch(/background:\s*var\(--cobalt\)/);
    expect(tokens).toMatch(/--pal-16-2:\s*#2b3fe0/);
  });

  it('16 glasses in the display palette and one 1-bit pair per section', () => {
    for (let i = 0; i < 16; i++) expect(tokens).toMatch(new RegExp(`--pal-16-${i}:\\s*#[0-9a-f]{6}`));
    for (const field of ['#c8f03c', '#ff6fb5', '#b99cff', '#8fd6b8', '#f39a1a']) expect(style + tokens).toContain(`--pal-1bit-1: ${field}`);
  });

  it('the gems use neither blur nor backdrop-filter (Gems without frosted glass)', () => {
    expect(style + tokens).not.toMatch(/backdrop-filter|filter:\s*blur/);
  });
});

describe('shared chamber', () => {
  it('adds at the end, counts n/7 and fills up at 7 (Adding, Full chamber)', () => {
    const model = new ChamberModel(18);
    model.reset(DEFAULT_GARDEN);
    expect(model.count).toBe(3);
    const added = model.add({ kind: 'rosette', species: 'aloe-ccw', leaves: 13, plump: 0.5, blush: 0.5, stretch: 0 });
    expect(added).not.toBeNull();
    expect(model.count).toBe(4);
    expect(model.tray[model.tray.length - 1].uid).toBe(added!.uid);
    while (!model.full) model.add({ kind: 'comb', rings: 2, seed: 1 });
    expect(model.count).toBe(MAX_SPECIMENS);
    expect(model.add({ kind: 'comb', rings: 2, seed: 1 })).toBeNull();
  });

  it('removing leaves a scar in its place in the tray (Removing leaves a scar)', () => {
    const model = new ChamberModel(18);
    model.reset(DEFAULT_GARDEN);
    const echeveria = model.tray[1];
    expect(model.remove(echeveria.uid)).toBe(true);
    expect(model.count).toBe(2);
    expect(model.tray).toHaveLength(3);
    expect(model.tray[1].scar).toBe(true);
    expect(model.remove(echeveria.uid)).toBe(false);
  });

  it('the live description names the symmetry and the contents', () => {
    const model = new ChamberModel(18);
    model.reset(DEFAULT_GARDEN);
    expect(model.describe('Five-fold kaleidoscope')).toBe(
      'Five-fold kaleidoscope holding a sunflower, an echeveria, a clockwise aloe and 18 glass beads',
    );
    model.add({ kind: 'comb', rings: 3, seed: 7 });
    expect(model.describe('Three-fold kaleidoscope')).toContain('a honeycomb');
  });

  it('the readout starts with the symmetry and shows HOLD', () => {
    expect(readoutText('D5', 135, false, 3, 18)).toBe('D5 · 135° · 3 specimens · 18 beads');
    expect(readoutText('*333', 45, true, 1, 10)).toBe('*333 · HOLD · 1 specimen · 10 beads');
  });
});

describe('garden link', () => {
  const garden: Garden = {
    mode: 'p333',
    barrel: 135,
    display: '1bit',
    specimens: [
      { kind: 'rosette', species: 'echeveria', leaves: 21, plump: 0.5, blush: 0.6, stretch: 0.5 },
      { kind: 'head', angle: 144, seeds: 600 },
    ],
    sow: 144,
  };

  it('round trip (Round trip)', () => {
    const encoded = encodeGarden(garden);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeGarden(encoded)).toEqual(garden);
    expect(gardenFromHash(`#g=${encoded}`)).toEqual(garden);
  });

  it('a Hive honeycomb travels with its cells', () => {
    const cells = '0123'.repeat(9) + '1';
    const g: Garden = { mode: 'd3', barrel: 0, display: '16', specimens: [{ kind: 'comb', rings: 3, seed: 1, cells }], sow: 144 };
    expect(decodeGarden(encodeGarden(g))).toEqual(g);
  });

  it('a damaged fragment or one from another version is ignored (Damaged link)', () => {
    expect(gardenFromHash('#g=not-a-garden')).toBeNull();
    expect(gardenFromHash('#g=')).toBeNull();
    expect(gardenFromHash('#worlds')).toBeNull();
    const wrongVersion = Buffer.from(JSON.stringify([2, 0, 0, 1, GOLDEN_ANGLE, []])).toString('base64url');
    expect(decodeGarden(wrongVersion)).toBeNull();
    const tooMany = Buffer.from(JSON.stringify([1, 0, 0, 1, GOLDEN_ANGLE, Array(8).fill(['c', 2, 1])])).toString('base64url');
    expect(decodeGarden(tooMany)).toBeNull();
  });
});
