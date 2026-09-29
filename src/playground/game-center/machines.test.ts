import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capsuleName, prizeAnnouncement, RACK_MAX } from './crane/machine';
import { CraneSim } from './crane/sim';
import { GASES, LETTERS, stripSummary } from './gas/gases';
import { jogText } from './parlour/machine';
import { bitsFromScreen, DEFAULTS, parseSettings, screenFromBits } from './settings';

const html = readFileSync(resolve(__dirname, '../../../sites/playground/landings/game-center/index.html'), 'utf8');

describe('service panel', () => {
  it('SW2–SW3: every combination resolves to one of the three modes', () => {
    expect(screenFromBits(false, false)).toBe('16');
    expect(screenFromBits(false, true)).toBe('1bit');
    expect(screenFromBits(true, false)).toBe('millions');
    expect(screenFromBits(true, true)).toBe('16');
    for (const mode of ['16', '1bit', 'millions'] as const) expect(screenFromBits(...bitsFromScreen(mode))).toBe(mode);
  });

  it('saved settings are read with each value validated on its own', () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
    expect(parseSettings('no json')).toEqual(DEFAULTS);
    expect(parseSettings('{"screen":"1bit","rain":false,"flip":"yes"}')).toEqual({ ...DEFAULTS, screen: '1bit', rain: false });
  });

  it('the HTML has the 8 switches, SW8 fixed and disabled with "always free"', () => {
    for (let n = 1; n <= 8; n++) expect(html).toMatch(new RegExp(`role="switch" data-sw="${n}"`));
    expect(html).toMatch(/data-sw="8" checked disabled/);
    expect(html.toLowerCase()).toContain('always free');
  });
});

describe('gas tuner', () => {
  it('five gases with their discharge colors and eight letters YONJIGEN', () => {
    expect(GASES.map((g) => g.name)).toEqual(['Neon', 'Helium', 'Argon', 'Krypton', 'Xenon']);
    expect(GASES.find((g) => g.id === 'argon')?.look).toBe('pale lavender');
    expect(LETTERS.map((l) => l.char).join('')).toBe('YONJIGEN');
    // Each letter is a single continuous tube: one "M", with its two electrodes at the ends.
    for (const l of LETTERS) expect(l.d.match(/M/g), l.char).toHaveLength(1);
  });

  it('the strike strip is summarized in words', () => {
    expect(stripSummary([])).toBe('No strikes yet');
    expect(stripSummary(['argon'])).toBe('1 strike: 1 argon');
    expect(stripSummary(['neon', 'argon', 'argon'])).toBe('3 strikes: 1 neon, 2 argon');
  });

  it('the gas caption and the only black hole are in the HTML', () => {
    expect(html).toContain('Pick a gas. Pure argon glows lavender; the deep blue of most signs is argon with a drop of mercury.');
    // On the play floors, the black hole is only the roof's moon (2F describes world E).
    const play = html.slice(html.indexOf('id="3f"'));
    expect(play.match(/black hole/gi)?.length).toBe(2); // the moon's caption and the description of its screen
    expect(html).toContain("That's not the moon. It's the black hole from world E.");
  });
});

describe('crane: texts', () => {
  it('the prize announcement is the one in the spec', () => {
    const sim = new CraneSim({ seed: 1 });
    const e = sim.capsules.find((c) => c.content.kind === 'world' && c.content.id === 'e')!;
    expect(prizeAnnouncement(e)).toBe('Prize: world E, Whale fall. Ticket link added.');
    expect(capsuleName(e)).toBe('capsule E');
    expect(RACK_MAX).toBe(6);
  });

  it('the card prints the probability and that the prizes are links', () => {
    expect(html.replace(/\s+/g, ' ')).toContain('The claw grips 80% of the time. The only prizes are links, and all of them are listed below.');
  });
});

describe('glass: jog wheel in words', () => {
  it('reads the time as in the spec', () => {
    expect(jogText(7.4, 'rewind')).toBe('7.4 seconds ago, rewinding');
    expect(jogText(0, 'live')).toBe('Now, live');
    expect(jogText(3, 'hold')).toBe('3.0 seconds ago, holding');
  });

  it("the floor's honest line", () => {
    expect(html).toContain('Free balls. No bets, no prizes, nothing saved.');
  });
});
