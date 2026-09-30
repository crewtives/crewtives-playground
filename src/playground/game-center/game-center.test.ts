import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILD_STAMP, CAT_CREDIT, LAB_SLOTS, LAUNCHER, NOT_IN_COLLECTION_LINE, WORLDS, checkBackLink, checkIndexHtml } from '../shared/worlds';
import { SIGN_GLOSS } from './rainrun/canyon';
import { closeLift, FLOORS, LIFT_CLOSED, liftExpanded, parseFloorHash, pressLift, type LiftState } from './floors';

const repo = resolve(import.meta.dirname, '../../..');
const html = readFileSync(resolve(repo, 'sites/playground/landings/game-center/index.html'), 'utf8');
const tokens = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8');
const style = readFileSync(resolve(import.meta.dirname, 'style.css'), 'utf8');

/** HTML of a section by id (up to the next floor <section>). */
function section(id: string): string {
  const start = html.indexOf(`<section id="${id}"`);
  expect(start, `floor ${id}`).toBeGreaterThan(-1);
  const next = html.indexOf('<section id="', start + 10);
  return html.slice(start, next === -1 ? undefined : next);
}

function text(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&shy;/g, '')
    .replace(/\s+/g, ' ');
}

function token(name: string): string {
  const match = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  expect(match, name).not.toBeNull();
  return match![1].toLowerCase();
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('Game Center Yonjigen: static building', () => {
  it('title, language and description', () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Game Center Yonjigen · crewtives playground</title>');
    expect(html).toMatch(/<meta\s+name="description"/);
  });

  it('six floors in building order, each with a heading, and no Game of Life', () => {
    const ids = [...html.matchAll(/<section id="([^"]+)" class="floor/g)].map((m) => m[1]);
    expect(ids).toEqual([...FLOORS]);
    for (const id of FLOORS) {
      const part = section(id);
      const labelled = part.match(/aria-labelledby="([^"]+)"/)![1];
      expect(part).toMatch(new RegExp(`<h[12][^>]*id="${labelled}"`));
    }
    expect(html.toLowerCase()).not.toContain('game of life');
  });

  it('the demo index is the second section and the first screen links to it', () => {
    const ids = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids[1]).toBe('2f');
    expect(html).toContain('class="deck__worlds" href="#2f"');
    expect(html).toContain('class="cell cell--index" href="#2f"');
  });

  it('2F: the five worlds and the launcher as real links, with image, line, label and credit', () => {
    const floor = section('2f');
    expect(floor).toContain(`href="${LAUNCHER.route}"`);
    expect(text(floor)).toContain('Open the launcher');
    const slots = floor.split('<li class="aisle__slot">').slice(1);
    expect(slots).toHaveLength(WORLDS.length);
    WORLDS.forEach((world, i) => {
      const slot = slots[i];
      expect(slot).toContain(`href="${world.route}"`);
      expect(slot).toContain(`src="${world.still}"`);
      expect(slot).toContain(`alt="${world.alt}"`);
      expect(slot).toContain('loading="lazy"');
      expect(text(slot)).toContain(world.line);
      expect(text(slot).toLowerCase()).toContain('synthetic scene');
      const credit = text(slot).includes(CAT_CREDIT.text.replace(', CC-BY 3.0', ''));
      expect(credit, `cat credit in ${world.id}`).toBe(world.credit !== null);
      if (world.credit) expect(slot).toContain(`href="${world.credit.license}"`);
    });
  });

  it('2F: the board has six rows, each with a link, and no rankings or scores', () => {
    const board = section('2f').split('<table')[1].split('</table>')[0];
    const rows = board.split('<tbody>')[1].match(/<tr>/g) ?? [];
    expect(rows).toHaveLength(6);
    const routes = [...board.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
    expect(routes).toEqual([...WORLDS.map((w) => w.route), LAUNCHER.route]);
    expect(text(board)).not.toMatch(/\b(1st|2nd|3rd|rank #|pts)\b/i);
  });

  it('3F: the prize list has the six links even without the crane', () => {
    const list = section('3f').split('class="prizes__list"')[1];
    const routes = [...list.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
    expect(routes).toEqual([...WORLDS.map((w) => w.route), LAUNCHER.route]);
    expect(text(section('3f'))).toContain('The claw grips 80% of the time. The only prizes are links, and all of them are listed below.');
  });

  it('5F: exactly three lab slots, with no link, name or date', () => {
    const lab = section('5f');
    const cards = [...lab.matchAll(/<p class="lab__card[^"]*">([^<]+)<\/p>/g)].map((m) => m[1]);
    expect(cards).toHaveLength(LAB_SLOTS.length);
    LAB_SLOTS.forEach((slot, i) => expect(cards[i]).toContain(`Lab slot ${slot.slot}: ${slot.kind}.`));
    expect(lab.split('class="lab"')[1]).not.toContain('<a ');
    expect(text(lab)).not.toMatch(/\b20\d\d\b/);
    expect(text(lab)).toContain('Machines get a marquee when they work. Nothing here has a name yet.');
  });

  it('footer: demo stamp, not-in-the-collection line, credits and glossary', () => {
    const rf = text(section('rf'));
    expect(rf).toContain(BUILD_STAMP);
    expect(rf).toContain(NOT_IN_COLLECTION_LINE);
    expect(rf).toContain('Scenes are synthetic and computed from equations.');
    expect(rf).toContain('SIL Open Font License');
    expect(rf).toContain('three.js');
    expect(rf).toContain('GSAP');
    expect(rf).toContain('Lenis');
    expect(rf).toContain('"Cat" by J-Toastie');
    expect(section('rf')).toContain('https://crewtives.com');
    expect(section('rf')).toContain('href="/4d-os/e/"');
    for (const [jp, en] of [
      ['ゲームセンター', 'game center'],
      ['四次元', 'fourth dimension'],
      ['調整中', 'under adjustment'],
      ['無料', 'free'],
    ]) {
      expect(rf).toContain(`${jp} ${en}`);
    }
  });

  it('back to the museum: "Playground" links to / after a vector arrow (Landing outside the collection, Arrow without a missing glyph)', () => {
    expect(checkBackLink(section('rf'), { href: '/', text: 'Playground', arrow: 'icon' })).toEqual([]);
    expect(html).toContain('<symbol id="i-back"');
    const visible = text(html.split('<body')[1]);
    expect(visible).not.toContain('←');
    expect(visible).not.toMatch(/candidat/i);
    expect(html).not.toMatch(/href="\/landings\/"/);
  });

  it('honesty: no prices, coins, accounts or bets', () => {
    const visible = text(html.split('<body')[1]);
    expect(visible).not.toMatch(/\$\d|€|¥|\bcoins? (cost|required)\b|\bsign up\b|\blog ?in\b|\bbet (now|here)\b/i);
    expect(visible).toContain('FREE PLAY');
    expect(visible).toContain('Everything here is a demo; nothing costs anything.');
    expect(visible).toContain('Free balls. No bets, no prizes, nothing saved.');
  });

  it('the direction contract does not ship in the page', () => {
    for (const marker of ['9365b33c', 'THESIS', 'OWN-WORLD', 'FIRST VIEWPORT', 'unreviewed and undocumented']) {
      expect(html).not.toContain(marker);
      expect(style).not.toContain(marker);
    }
  });
});

describe('Game Center Yonjigen: color and type', () => {
  const fields: Record<string, [string, string]> = {
    '1f': ['--enamel', '--ink'],
    '2f': ['--sodium', '--ink'],
    '3f': ['--candy', '--ink'],
    '4f': ['--mint', '--ink'],
    '5f': ['--carpet', '--acrylic'],
    rf: ['--night', '--acrylic'],
  };

  it('each floor has its enamel and none is cobalt', () => {
    const cobalt = token('--cobalt');
    for (const [floor, [field]] of Object.entries(fields)) {
      const rule = style.match(new RegExp(`\\.floor--${floor} \\{[^}]*--field: var\\((--[a-z0-9-]+)\\)`));
      expect(rule, floor).not.toBeNull();
      expect(rule![1]).toBe(field);
      expect(token(field)).not.toBe(cobalt);
    }
  });

  it('body text reaches 4.5:1 on each field (ink and secondary ink)', () => {
    for (const [field, on] of Object.values(fields)) {
      expect(contrast(token(field), token(on)), `${on} on ${field}`).toBeGreaterThanOrEqual(4.5);
      const secondary = `${field}-2`;
      expect(contrast(token(field), token(secondary)), `${secondary} on ${field}`).toBeGreaterThanOrEqual(4.5);
    }
    // Paper cards and HUD.
    expect(contrast(token('--paper'), token('--paper-ink'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--crt'), token('--sodium'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--crt'), token('--night-2'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--ink'), token('--acrylic'))).toBeGreaterThanOrEqual(4.5);
  });

  it('the marquee and the numerals are capped at 96 px', () => {
    expect(style).toMatch(/\.marquee__word \{[^}]*font-size: min\(96px/);
    expect(tokens).toMatch(/--t-numeral: clamp\([^)]*96px\)/);
    expect(tokens).toMatch(/--t-marquee: clamp\([^)]*96px\)/);
  });

  it('sixteen screen colors and a sodium 1-bit', () => {
    for (let i = 0; i < 16; i++) token(`--pal-16-${i}`);
    expect(token('--pal-1bit-1')).toBe(token('--sodium'));
  });

  it('its own fonts, with the license alongside, and none from another landing or from 4D.OS', () => {
    const faces = [...tokens.matchAll(/font-family: '([^']+)'/g)].map((m) => m[1]);
    expect(new Set(faces)).toEqual(new Set(['Bungee Shade', 'Bungee', 'DotGothic16', 'M PLUS Rounded 1c']));
    for (const url of tokens.matchAll(/url\('\.\/fonts\/([^']+)'\)/g)) {
      expect(() => readFileSync(resolve(import.meta.dirname, 'fonts', url[1]))).not.toThrow();
    }
    for (const license of ['bungee', 'bungee-shade', 'dotgothic16', 'm-plus-rounded-1c']) {
      expect(readFileSync(resolve(import.meta.dirname, 'fonts', `OFL-${license}.txt`), 'utf8')).toContain('SIL Open Font License');
    }
    expect(tokens).not.toMatch(/https?:\/\//);
  });
});

describe('Game Center Yonjigen: checker and glossary', () => {
  it('shared index checker', () => expect(checkIndexHtml(html)).toEqual([]));

  it('every Japanese word on the signs, plus 景品 and 階, is glossed in the credits', () => {
    const line = html.match(/<dt>Glossary<\/dt>\s*<dd lang="ja">(.*?)<\/dd>/s);
    expect(line, 'glossary line').not.toBeNull();
    const pairs = new Map([...line![1].matchAll(/<span>([^<]+)<\/span> <span lang="en">([^<]+)<\/span>/g)].map((m) => [m[1], m[2]]));
    const glossed = { ...SIGN_GLOSS, 景品: 'prizes', 階: 'floor' } as Record<string, string>;
    for (const [word, english] of Object.entries(glossed)) expect(pairs.get(word), word).toBe(english);
  });
});

describe('Game Center Yonjigen: floor addresses', () => {
  it('recognizes #1f…#rf and leaves unknown ones on 1F', () => {
    for (const floor of FLOORS) expect(parseFloorHash(`#${floor}`)).toBe(floor);
    expect(parseFloorHash('#2F')).toBe('2f');
    expect(parseFloorHash('#6f')).toBeNull();
    expect(parseFloorHash('')).toBeNull();
    expect(parseFloorHash('#worlds')).toBeNull();
    expect(parseFloorHash('#4f?sym=8&rails=twin&seed=12&shutter=all')).toBe('4f');
  });
});

describe('Game Center Yonjigen: elevator panel with several buttons', () => {
  const deck = 'deck lift';
  const call4f = '4F call';
  const call2f = '2F call';

  it('the button that opens the panel is the only one expanded', () => {
    const open = pressLift<string>(LIFT_CLOSED, call4f);
    expect(open).toEqual({ open: true, invoker: call4f });
    expect([deck, call4f, call2f].map((b) => liftExpanded(open, b))).toEqual([false, true, false]);
    expect([deck, call4f, call2f].map((b) => liftExpanded(LIFT_CLOSED, b))).toEqual([false, false, false]);
  });

  it('pressing the invoker again closes the panel; another button takes it over', () => {
    const open = pressLift<string>(LIFT_CLOSED, call4f);
    expect(pressLift(open, call4f)).toEqual({ open: false, invoker: null });
    const moved = pressLift(open, deck);
    expect(moved).toEqual({ open: true, invoker: deck });
    expect(liftExpanded(moved, call4f)).toBe(false);
    expect(liftExpanded(moved, deck)).toBe(true);
  });

  it('Escape gives focus back to the invoker; choosing a floor or tapping outside does not', () => {
    const open: LiftState<string> = pressLift<string>(LIFT_CLOSED, call2f);
    expect(closeLift(open, true)).toEqual({ state: { open: false, invoker: null }, focus: call2f });
    expect(closeLift(open, false)).toEqual({ state: { open: false, invoker: null }, focus: null });
    expect(closeLift<string>(LIFT_CLOSED, true).focus).toBeNull();
  });
});
