import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SHEETS } from '../museum/collection';
import { woff2Codepoints } from '../museum/build/woff2';
import { CAT_CREDIT, LAB_SLOTS, LAUNCHER, WORLDS, checkBackLink, checkIndexHtml, type WorldId } from './worlds';

const repo = resolve(import.meta.dirname, '../../..');
const publicDir = resolve(repo, 'sites/playground/public');
/** Root of the 4D.OS site: `page` is relative to it. */
const site4dos = resolve(repo, 'sites/4d-os');

/** The cat's credit line as LICENSES.md sets it (the sentence "… carries the visible credit: *…*."). */
function licenseCatCredit(): string {
  const licenses = readFileSync(resolve(repo, 'LICENSES.md'), 'utf8');
  const match = licenses.match(/visible credit: \*(.+?)\*/);
  if (!match) throw new Error('LICENSES.md no longer has the cat credit line');
  return match[1];
}

describe('shared playground index', () => {
  it('lists the five 4D.OS worlds in order, with real routes', () => {
    expect(WORLDS.map((w) => w.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(WORLDS.map((w) => w.route)).toEqual(['/4d-os/a/', '/4d-os/b/', '/4d-os/c/', '/4d-os/d/', '/4d-os/e/']);
    expect(LAUNCHER.route).toBe('/4d-os/');
  });

  it('each world has a letter, name, sized still, alt text, line and synthetic mark', () => {
    for (const world of WORLDS) {
      expect(world.letter).toBe(world.id.toUpperCase());
      expect(world.name).not.toBe('');
      expect(world.still).toBe(`/landings/_shared/stills/${world.id}.webp`);
      expect([world.stillWidth, world.stillHeight]).toEqual([1200, 900]);
      expect(world.alt.length).toBeGreaterThan(20);
      expect(world.line.length).toBeGreaterThan(20);
      expect(world.synthetic).toBe(true);
    }
  });

  it('each still exists in the playground public folder', () => {
    for (const world of WORLDS) expect(existsSync(resolve(publicDir, world.still.slice(1)))).toBe(true);
  });

  it('A, B and C carry the cat credit identical to the one in LICENSES.md; D and E use no third-party material', () => {
    expect(CAT_CREDIT.text).toBe(licenseCatCredit());
    expect(WORLDS.filter((w) => w.credit === CAT_CREDIT).map((w) => w.id)).toEqual(['a', 'b', 'c']);
    expect(WORLDS.filter((w) => w.credit === null).map((w) => w.id)).toEqual(['d', 'e']);
  });

  it('there are exactly three lab slots, with no name, link or date', () => {
    expect(LAB_SLOTS).toHaveLength(3);
    for (const slot of LAB_SLOTS) expect(Object.keys(slot).sort()).toEqual(['kind', 'slot']);
  });
});

// Fixture: a passing index, built from the data (as a landing would write it by hand).
function worldCard(id: string, { credit = true } = {}): string {
  const w = WORLDS.find((world) => world.id === id)!;
  return `
      <li class="card">
        <img src="${w.still}" width="1200" height="900" loading="lazy" alt="${w.alt.replace(/"/g, '&quot;')}">
        <h3>${w.letter} · ${w.name}</h3>
        <p>${w.line.replace(/'/g, '&#39;')}</p>
        <span class="tag">Synthetic scene</span>
        ${w.credit && credit ? `<p class="credit">${w.credit.text.replace(/"/g, '&quot;')}</p>` : ''}
        <a href="${w.route}">Open world</a>
      </li>`;
}

function indexHtml({ worlds = ['a', 'b', 'c', 'd', 'e'], slots = 3, slotLink = false, launcher = true } = {}): string {
  const lab = Array.from({ length: slots }, (_, i) =>
    slotLink && i === 0
      ? `<li data-lab-slot><a href="/lab/">Empty socket · in the lab</a></li>`
      : `<li data-lab-slot>Empty socket · in the lab. The next experiment isn't cast yet.</li>`,
  ).join('');
  return `<!doctype html><html><head><title>x</title><script>const a = '<a href="/4d-os/a/">';</script></head><body>
    <section id="hero"><h1>Hero</h1><a href="#worlds">Worlds</a></section>
    <section id="worlds">
      <ul>${worlds.map((id) => worldCard(id)).join('')}</ul>
      ${launcher ? `<p><a href="${LAUNCHER.route}">${LAUNCHER.name}</a> ${LAUNCHER.line}</p>` : ''}
      <ul class="lab">${lab}</ul>
    </section>
    <footer><p>Not in the collection yet · <a href="/"><svg aria-hidden="true"><use href="#i-left" /></svg>Playground</a></p></footer>
  </body></html>`;
}

describe('index checker (checkIndexHtml)', () => {
  it('accepts a complete index', () => {
    expect(checkIndexHtml(indexHtml())).toEqual([]);
  });

  it('accepts markup variants: credit split into links, curly apostrophe, unclosed <li> and tables', () => {
    const html = indexHtml()
      .replace(/<p class="credit">&quot;Cat&quot; by J-Toastie, CC-BY 3.0<\/p>/g, '<p><a href="https://poly.pizza/m/8GJbfM8R1A">"Cat" by J-Toastie</a>, <a href="https://creativecommons.org/licenses/by/3.0/">CC-BY 3.0</a></p>')
      .replace("The cat&#39;s whole climb", 'The cat’s whole climb')
      .replace(/<\/li>/g, '')
      .replace('</body>', `<table><tr><th>A</th><td><a href="/4d-os/a/">/4d-os/a/</a></td></tr></table></body>`);
    expect(checkIndexHtml(html)).toEqual([]);
  });

  it('fails if a world link is missing', () => {
    const problems = checkIndexHtml(indexHtml({ worlds: ['a', 'b', 'd', 'e'] }));
    expect(problems).toEqual(['C · Leader: missing a link <a href="/4d-os/c/">']);
  });

  it('fails if the launcher link is missing', () => {
    expect(checkIndexHtml(indexHtml({ launcher: false }))).toEqual(['Launcher: missing a link <a href="/4d-os/">']);
  });

  it('fails if there is an extra lab slot', () => {
    expect(checkIndexHtml(indexHtml({ slots: 4 }))).toEqual([
      'Lab: there are 4 slots with data-lab-slot and there must be exactly 3',
    ]);
  });

  it('fails if a lab slot has a link, inside or around it', () => {
    expect(checkIndexHtml(indexHtml({ slotLink: true }))).toEqual([
      'Lab 1: a lab slot can neither be nor contain a link',
    ]);
    const wrapped = indexHtml().replace('<li data-lab-slot>', '<li><a href="/lab/"><span data-lab-slot>Soon</span></a></li><li hidden>');
    expect(checkIndexHtml(wrapped)).toContain('Lab 1: a lab slot can neither be nor contain a link');
  });

  it('fails if a lab slot shows a date', () => {
    const dated = indexHtml().replace("isn't cast yet.</li>", "isn't cast yet. Opens Oct 2026.</li>");
    expect(checkIndexHtml(dated)).toEqual(['Lab 1: a lab slot cannot show a date']);
  });

  it('fails if A, B or C lose the cat credit, or if the credit changes', () => {
    const noCredit = indexHtml().replace(worldCard('b'), worldCard('b', { credit: false }));
    expect(checkIndexHtml(noCredit)).toEqual(['B · Plate: missing the credit ""Cat" by J-Toastie, CC-BY 3.0" next to its image']);
    const changed = indexHtml().replace(/J-Toastie, CC-BY 3\.0/, 'J-Toastie (CC-BY 3.0)');
    expect(checkIndexHtml(changed)).toEqual(['A · Vitrine: missing the credit ""Cat" by J-Toastie, CC-BY 3.0" next to its image']);
  });

  it('fails if a world\'s line, label or still does not match', () => {
    const drifted = indexHtml().replace('stooping along a golden spiral', 'diving along a golden spiral');
    expect(checkIndexHtml(drifted)).toEqual([`D · The golden stoop: missing the line "${WORLDS[3].line}" next to its link`]);
    const unlabeled = indexHtml().replace('Synthetic scene', 'Live scene');
    expect(checkIndexHtml(unlabeled)).toEqual(['A · Vitrine: missing the "synthetic scene" label next to its link']);
    const otherStill = indexHtml().replace('/landings/_shared/stills/e.webp', '/landings/e/still.png');
    expect(checkIndexHtml(otherStill)).toEqual([
      'E · Whale fall: missing the still <img src="/landings/_shared/stills/e.webp"> with alt text next to its link',
    ]);
  });

  it('ignores what is inside a <script>', () => {
    // The fixture has '<a href="/4d-os/a/">' inside a script: without A's card, the link is missing.
    expect(checkIndexHtml(indexHtml({ worlds: ['b', 'c', 'd', 'e'] }))).toEqual(['A · Vitrine: missing a link <a href="/4d-os/a/">']);
  });
});

describe('way-back checker (checkBackLink)', () => {
  const ICON = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-left" /></svg>';
  const page = (link: string) => `<!doctype html><html><body><main><a href="/">crewtives playground</a></main><footer><p>${link}</p></footer></body></html>`;

  it('accepts the icon before the text, also inside a <span>', () => {
    expect(checkBackLink(page(`<a href="/#sheet-004">${ICON}Playground · Sheet 004</a>`), { href: '/#sheet-004', text: 'Playground · Sheet 004', arrow: 'icon' })).toEqual([]);
    expect(checkBackLink(page(`<a href="/"><span>${ICON}</span> Playground</a>`), { href: '/', text: 'Playground', arrow: 'icon' })).toEqual([]);
  });

  it('accepts the ← character before the text, whether or not it is hidden from assistive technology', () => {
    const hidden = page('<a href="/#sheet-002"><span aria-hidden="true">←</span> Playground · Sheet 002</a>');
    expect(checkBackLink(hidden, { href: '/#sheet-002', text: 'Playground · Sheet 002', arrow: 'char' })).toEqual([]);
    const plain = page('<a href="/">← Playground</a>');
    expect(checkBackLink(plain, { href: '/', text: 'Playground', arrow: 'char' })).toEqual([]);
  });

  it('fails if the link is missing, or if the target or the text does not match', () => {
    const ok = `<a href="/#sheet-001">${ICON}Playground · Sheet 001</a>`;
    expect(checkBackLink(page(ok), { href: '/#sheet-002', text: 'Playground · Sheet 002', arrow: 'icon' })).toEqual([
      'Way back "Playground · Sheet 002" to /#sheet-002: missing an <a href="/#sheet-002"> with the visible text "Playground · Sheet 002"',
    ]);
    expect(checkBackLink(page(ok.replace('Sheet 001', 'Sheet 01')), { href: '/#sheet-001', text: 'Playground · Sheet 001', arrow: 'icon' })).toHaveLength(1);
  });

  it('fails if the typeface has no ← and the text contains it, or if the icon comes after the text', () => {
    const glyph = page('<a href="/#sheet-004">← Playground · Sheet 004</a>');
    expect(checkBackLink(glyph, { href: '/#sheet-004', text: 'Playground · Sheet 004', arrow: 'icon' })).toEqual([
      'Way back "Playground · Sheet 004" to /#sheet-004: the link\'s typeface has no ←, so the visible text cannot contain it',
      'Way back "Playground · Sheet 004" to /#sheet-004: missing the arrow\'s <svg> icon before the text',
    ]);
    const after = page(`<a href="/">Playground ${ICON}</a>`);
    expect(checkBackLink(after, { href: '/', text: 'Playground', arrow: 'icon' })).toEqual([
      'Way back "Playground" to /: missing the arrow\'s <svg> icon before the text',
    ]);
  });

  it('fails if the typeface has ← and the arrow is an icon', () => {
    const icon = page(`<a href="/#sheet-003">${ICON}Playground · Sheet 003</a>`);
    expect(checkBackLink(icon, { href: '/#sheet-003', text: 'Playground · Sheet 003', arrow: 'char' })).toEqual([
      'Way back "Playground · Sheet 003" to /#sheet-003: missing the ← character before the text',
      'Way back "Playground · Sheet 003" to /#sheet-003: the link\'s typeface has ←, so the arrow is the character and not an icon',
    ]);
  });

  it('fails if the accessible name does not contain the visible text', () => {
    const labelled = page(`<a href="/" aria-label="Back to the museum">${ICON}Playground</a>`);
    expect(checkBackLink(labelled, { href: '/', text: 'Playground', arrow: 'icon' })).toEqual([
      'Way back "Playground" to /: the accessible name "Back to the museum" does not contain the visible text',
    ]);
    const hiddenText = page(`<a href="/">${ICON}<span aria-hidden="true">Playground</span></a>`);
    expect(checkBackLink(hiddenText, { href: '/', text: 'Playground', arrow: 'icon' })).toEqual([
      'Way back "Playground" to /: the accessible name "" does not contain the visible text',
    ]);
  });
});

// ── Way back from 4D.OS (playground-museum, "Way back from each work") ────────────────────────────
// Each index.html is read without running scripts. The sheet number comes from the collection, and
// the arrow's form from the cmap of the typeface the CSS gives the link: the ← character if the
// typeface includes it, a vector icon if not.

const LEFT_ARROW = 0x2190;

/** Declarations of the CSS's top-level `.playground-back { … }` rule. */
function backRule(css: string): string {
  const start = css.search(/^\.playground-back \{/m);
  if (start < 0) throw new Error('missing the .playground-back rule');
  return css.slice(start, css.indexOf('}', start));
}

/** First font family of the link's typeface, resolving `var(--…)` in the tokens. */
function backFamily(rule: string, tokens: string): string {
  const value = rule.match(/\bfont(?:-family)?:\s*([^;]+);/)?.[1] ?? '';
  // In the `font` shorthand, the family comes last: the last var(--…) is the family's.
  const variable = [...value.matchAll(/var\((--[\w-]+)\)/g)].at(-1)?.[1];
  const list = variable ? tokens.match(new RegExp(`${variable}:\\s*([^;]+);`))?.[1] ?? '' : value;
  const family = list.match(/'([^']+)'/)?.[1];
  if (!family) throw new Error(`could not read the font family from "${value}"`);
  return family;
}

/** woff2 files of the `family` faces that cover U+2190 (according to their unicode-range). */
function arrowFaces(family: string, tokenFiles: string[]): string[] {
  const covers = (range: string | undefined) =>
    !range ||
    range.split(',').some((part) => {
      const [lo, hi] = part.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16));
      return LEFT_ARROW >= lo && LEFT_ARROW <= (hi ?? lo);
    });
  return tokenFiles.flatMap((file) =>
    [...readFileSync(resolve(repo, file), 'utf8').matchAll(/@font-face\s*\{([^}]*)\}/g)]
      .map((m) => m[1])
      .filter((face) => face.match(/font-family:\s*'([^']+)'/)?.[1] === family && covers(face.match(/unicode-range:\s*([^;]+);/)?.[1]))
      .map((face) => resolve(dirname(resolve(repo, file)), face.match(/url\('([^']+)'\)/)![1])),
  );
}

describe('way back from 4D.OS, without JavaScript', () => {
  const PAGES: { page: string; world: WorldId | null; css: string; tokens: string[]; arrow: 'char' | 'icon' }[] = [
    { page: 'index.html', world: null, css: 'src/4d-os/launcher/launcher.css', tokens: ['src/4d-os/worlds/a/tokens.css', 'src/4d-os/worlds/b/tokens.css', 'src/4d-os/worlds/c/tokens.css'], arrow: 'char' },
    { page: 'a/index.html', world: 'a', css: 'src/4d-os/worlds/a/style.css', tokens: ['src/4d-os/worlds/a/tokens.css'], arrow: 'char' },
    { page: 'b/index.html', world: 'b', css: 'src/4d-os/worlds/b/style.css', tokens: ['src/4d-os/worlds/b/tokens.css'], arrow: 'icon' },
    { page: 'c/index.html', world: 'c', css: 'src/4d-os/worlds/c/style.css', tokens: ['src/4d-os/worlds/c/tokens.css'], arrow: 'icon' },
    { page: 'd/index.html', world: 'd', css: 'src/4d-os/worlds/d/style.css', tokens: ['src/4d-os/worlds/d/tokens.css'], arrow: 'char' },
    { page: 'e/index.html', world: 'e', css: 'src/4d-os/worlds/e/style.css', tokens: ['src/4d-os/worlds/e/tokens.css'], arrow: 'char' },
  ];

  it('each world goes back to the sheet the collection gives it: A, B and C to 001, D to 002, E to 003', () => {
    const sheetOf = (id: WorldId) => SHEETS.find((sheet) => sheet.views.some((view) => view.loop === id))!.number;
    expect(WORLDS.map((w) => sheetOf(w.id))).toEqual(['001', '001', '001', '002', '003']);
  });

  for (const { page, world, css, tokens, arrow } of PAGES) {
    it(`${page}: way-back link in the static HTML, with the arrow its typeface allows (Without JavaScript, Arrow without a missing glyph)`, () => {
      const html = readFileSync(resolve(site4dos, page), 'utf8');
      const sheet = world ? SHEETS.find((s) => s.views.some((v) => v.loop === world))!.number : null;
      const href = sheet ? `/#sheet-${sheet}` : '/';
      const text = sheet ? `Playground · Sheet ${sheet}` : 'Playground';

      const rule = backRule(readFileSync(resolve(repo, css), 'utf8'));
      const tokenCss = tokens.map((file) => readFileSync(resolve(repo, file), 'utf8')).join('\n');
      const faces = arrowFaces(backFamily(rule, tokenCss), tokens);
      expect(faces.length).toBeGreaterThan(0);
      const fontHasArrow = faces.every((file) => woff2Codepoints(new Uint8Array(readFileSync(file))).has(LEFT_ARROW));

      // The table of D13: the typeface decides, and it matches what was expected of each page.
      expect(fontHasArrow ? 'char' : 'icon').toBe(arrow);
      expect(checkBackLink(html, { href, text, arrow })).toEqual([]);
      // Out of the layout flow: it does not move or resize any window, view or canvas.
      expect(rule).toMatch(/position:\s*(absolute|fixed);/);
    });
  }

  it('/4d-os/d/ keeps its link to ../', () => {
    expect(readFileSync(resolve(site4dos, 'd/index.html'), 'utf8')).toContain('<a href="../">All worlds</a>');
  });
});
