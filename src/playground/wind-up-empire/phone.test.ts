// Wind-Up Empire on phones (design adapt-for-phones D8): the key's stub for every queue state, the
// drums' two-reel Spring, and the stylesheet's phone section, whose every rule sits inside a phone
// gate so that the desktop box never changes. The DOM behavior is checked in a browser
// (tools/check-phone/wind-up-empire.ts).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Economy, MAX_DETENTS } from './economy';
import { DIGITS } from './ui/drums';
import { coilProgress, stubState, stubText } from './ui/keyStub';

const css = readFileSync(resolve(import.meta.dirname, 'wind-up-empire.css'), 'utf8');
const main = readFileSync(resolve(import.meta.dirname, 'main.ts'), 'utf8');

describe("the key's stub", () => {
  it('reads each queue state', () => {
    expect(stubText({ mode: 'idle', queued: 1, wound: 0, needed: 2 })).toBe('WIND ME');
    expect(stubText({ mode: 'winding', queued: 1, wound: 1, needed: 2 })).toBe('WINDING 1/2');
    expect(stubText({ mode: 'winding', queued: 2, wound: 2, needed: 2 })).toBe('WINDING 2/2');
    expect(stubText({ mode: 'running', queued: 1, wound: 1, needed: 2 })).toBe('RUNNING');
    expect(stubText({ mode: 'hold', queued: 1, wound: 1, needed: 2 })).toBe('HOLD');
    // Nothing queued: the wind stays stored whatever the key does.
    for (const mode of ['idle', 'winding', 'running', 'hold'] as const) expect(stubText({ mode, queued: 0, wound: 3, needed: 0 })).toBe('QUEUE EMPTY');
  });

  it('follows the economy: two turns for the first build, then running, then an empty queue', () => {
    const e = new Economy();
    expect(stubText(stubState(e))).toBe('WIND ME');
    e.addWind(8);
    expect(stubText(stubState(e))).toBe('WINDING 1/2');
    e.addWind(8);
    expect(stubText(stubState(e))).toBe('WINDING 2/2');
    e.letGo();
    expect(stubText(stubState(e))).toBe('RUNNING');
    e.tick(3);
    expect(coilProgress(e)).toBeCloseTo(0.5, 6);
    e.hold(true);
    expect(stubText(stubState(e))).toBe('HOLD');
    e.hold(false);
    e.tick(3.01);
    expect(e.state.levels.mine).toBe(2);
    expect(stubText(stubState(e))).toBe('QUEUE EMPTY');
    expect(coilProgress(e)).toBe(0);
  });

  it('counts the turns a half-run job still needs', () => {
    const e = new Economy();
    e.addWind(8);
    e.letGo();
    e.tick(3);
    // The wind ran out halfway: the job needs one more turn.
    expect(stubState(e)).toMatchObject({ mode: 'idle', needed: 1 });
    expect(stubText(stubState(e))).toBe('WIND ME');
  });
});

describe('the drums on a phone', () => {
  it('six reels per drum, and the Spring drum hides the first four under its phone gates', () => {
    expect(DIGITS).toBe(6);
    const rule = `.drum[data-resource='spring'] .reel-window:nth-child(-n + ${DIGITS - 2})`;
    expect(css.split(rule).length - 1).toBe(2);
  });

  it("Spring never passes 12, so two reels always show its value", () => {
    const e = new Economy();
    e.addWind(MAX_DETENTS * 3);
    expect(e.turns).toBe(12);
    expect(String(e.turns).length).toBeLessThanOrEqual(2);
  });
});

/** The stylesheet's phone section, split into its top-level blocks. */
function phoneBlocks(): { prelude: string; body: string }[] {
  const start = css.indexOf('Phones (adapt-for-phones D8)');
  expect(start).toBeGreaterThan(0);
  const text = css.slice(css.indexOf('*/', start) + 2).replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: { prelude: string; body: string }[] = [];
  let depth = 0;
  let prelude = '';
  let body = '';
  for (const ch of text) {
    if (depth === 0) {
      if (ch === '{') {
        depth = 1;
        body = '';
      } else prelude += ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      blocks.push({ prelude: prelude.trim(), body });
      prelude = '';
    } else body += ch;
  }
  return blocks;
}

describe('the phone section of the stylesheet', () => {
  const PHONE_CONDITION = /max-width: (900|800|700|560|400|359)px|pointer: coarse|orientation: landscape\) and \(max-height: 500px/;

  it('holds only @media blocks, each gated by a phone condition in every branch', () => {
    const blocks = phoneBlocks();
    expect(blocks.length).toBeGreaterThan(8);
    for (const { prelude } of blocks) {
      expect(prelude.startsWith('@media ')).toBe(true);
      for (const branch of prelude.slice(7).split(',')) expect(branch, prelude).toMatch(PHONE_CONDITION);
    }
  });

  it('no width gate above 900 px, no Media Queries 4 "or", no pan-down, no dvh', () => {
    const phone = css.slice(css.indexOf('Phones (adapt-for-phones D8)'));
    for (const m of phone.matchAll(/(min|max)-width: (\d+)px/g)) expect(Number(m[2])).toBeLessThanOrEqual(900);
    expect(css).not.toMatch(/\) or \(/);
    expect(css).not.toContain('pan-down');
    expect(css).not.toMatch(/\d+dvh/);
  });

  it('the script gates use the same strings as the stylesheet', () => {
    const gates = [...main.matchAll(/const (TILE|GRIP) = '([^']+)'/g)].map((m) => m[2]);
    expect(gates).toHaveLength(2);
    for (const gate of gates) expect(css).toContain(`@media ${gate} {`);
    expect(main).toContain("'(pointer: coarse) and (max-width: 800px), (pointer: coarse) and (max-height: 500px)'");
  });
});
