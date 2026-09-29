// Review fixes: nameplates without collisions, Sono only for figures, a key silhouette with a
// waist, numbered lab sockets, matching CTAs and the index checked against the shared verifier.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkIndexHtml } from '../shared/worlds';
import { HIT_CORE, HIT_R, layoutPlates, placeTag, plateSlots, spreadHits, type Cover, type PlateGeom, type Rect } from './ui/nameplates';
import { numHtml, numRuns } from './ui/num';
import { WING, wingPoints } from './ui/rosette';

const html = readFileSync(resolve(import.meta.dirname, '../../../sites/playground/landings/wind-up-empire/index.html'), 'utf8');

const overlap = (a: Rect, b: Rect) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

function plate(x: number, y: number, out: [number, number]): PlateGeom {
  return { x, y, r: 14, out, w: 150, folded: 30, h: 24, slot: 0 };
}

describe('2D layout of the nameplates', () => {
  const bounds: Rect = { l: 0, t: 0, r: 1440, b: 900 };

  it('two tops close together: the nameplates do not overlap', () => {
    const plates = [plate(500, 400, [-1, 0]), plate(505, 410, [-1, 0.1]), plate(510, 395, [-1, -0.1])];
    const out = layoutPlates(plates, [], bounds);
    for (let i = 0; i < out.length; i++) for (let j = 0; j < i; j++) expect(overlap(out[i].rect, out[j].rect)).toBe(false);
    expect(out.every((o) => !o.folded)).toBe(true);
  });

  it('a nameplate never covers a fixed zone (H1, rail, instruments, home) if there is another spot', () => {
    const keep: Rect = { l: 300, t: 380, r: 520, b: 420 };
    const [o] = layoutPlates([plate(540, 400, [-1, 0])], [keep], bounds);
    expect(overlap(o.rect, keep)).toBe(false);
  });

  it('with no free spot, the nameplate folds down to its letter', () => {
    const p = plate(700, 450, [1, 0]);
    // Every full-width spot collides; not every folded one does.
    const keeps = plateSlots(p, p.w).map((r) => ({ l: r.l + 40, t: r.t, r: r.r, b: r.b }));
    const [o] = layoutPlates([p], keeps, bounds);
    expect(o.folded).toBe(true);
    expect(o.rect.r - o.rect.l).toBe(30);
    expect(keeps.some((k) => overlap(o.rect, k))).toBe(false);
  });

  it("keeps the previous frame's spot while it stays free (no jumps)", () => {
    const p = { ...plate(600, 420, [0, -1]), slot: 2 };
    const first = plateSlots(p, p.w)[0];
    // Only the first spot is covered: 1 and 2 are free, and 2 wins because it was the previous one.
    const [o] = layoutPlates([p], [first], bounds);
    expect(o.slot).toBe(2);
    // Once the first one frees up, it goes back to it.
    expect(layoutPlates([p], [], bounds)[0].slot).toBe(0);
  });
});

describe('touch zones of the tops (≥ 44 px even when they cross)', () => {
  // Distance from a point to the 44×44 core centered on `c`.
  const toCore = (c: { x: number; y: number }, x: number, y: number) =>
    Math.hypot(Math.max(Math.abs(x - c.x) - HIT_CORE, 0), Math.max(Math.abs(y - c.y) - HIT_CORE, 0));
  const coreRect = (c: { x: number; y: number }): Rect => ({ l: c.x - HIT_CORE, t: c.y - HIT_CORE, r: c.x + HIT_CORE, b: c.y + HIT_CORE });
  // Every core stays clear: of the 64 px circle of any other world, of whatever covers, and of the edge.
  const problems = (zones: { x: number; y: number }[], covers: Cover[], bounds: Rect) => {
    const out: string[] = [];
    zones.forEach((z, i) => {
      zones.forEach((o, j) => {
        if (i !== j && toCore(z, o.x, o.y) < HIT_R) out.push(`${j} covers ${i}`);
      });
      for (const c of covers) {
        if ('l' in c ? overlap(coreRect(z), c) : toCore(z, c.x, c.y) < c.r) out.push(`something covers ${i}`);
      }
      const k = coreRect(z);
      if (k.l < bounds.l || k.r > bounds.r || k.t < bounds.t || k.b > bounds.b) out.push(`${i} out of bounds`);
    });
    return out;
  };
  const bounds: Rect = { l: 6, t: 6, r: 384, b: 1000 };

  it('far from everything, each zone stays over its top', () => {
    const anchors = [{ x: 60, y: 300 }, { x: 160, y: 300 }, { x: 260, y: 300 }];
    expect(spreadHits(anchors, [], bounds)).toEqual(anchors);
  });

  it('two tops 10 px apart: the zones separate and each top stays inside its circle', () => {
    const anchors = [{ x: 200, y: 300 }, { x: 208, y: 306 }];
    const zones = spreadHits(anchors, [], bounds);
    expect(problems(zones, [], bounds)).toEqual([]);
    zones.forEach((z, i) => expect(Math.hypot(z.x - anchors[i].x, z.y - anchors[i].y)).toBeLessThanOrEqual(HIT_R));
  });

  it('under the rocket grab or the home button, the zone moves out', () => {
    const covers: Cover[] = [{ x: 195, y: 377, r: 60 }, { l: 229, t: 341, r: 333, b: 405 }];
    const zones = spreadHits([{ x: 190, y: 360 }, { x: 250, y: 370 }], covers, bounds);
    expect(problems(zones, covers, bounds)).toEqual([]);
  });

  it('all five stacked over the rocket, next to the edge: none is covered, the same every time', () => {
    const covers: Cover[] = [{ x: 195, y: 377, r: 60 }, { l: 229, t: 341, r: 333, b: 405 }, { l: 20, t: 467, r: 370, b: 540 }];
    const anchors = Array.from({ length: 5 }, () => ({ x: 30, y: 377 }));
    const zones = spreadHits(anchors, covers, bounds);
    expect(problems(zones, covers, bounds)).toEqual([]);
    expect(spreadHits(anchors, covers, bounds)).toEqual(zones);
  });
});

describe('placement of the tin tag', () => {
  const bounds: Rect = { l: 12, t: 12, r: 378, b: 760 };
  const tagAt = (s: { x: number; y: number }): Rect => ({ l: s.x, t: s.y, r: s.x + 190, b: s.y + 150 });
  const clearOf = (r: Rect, c: Cover) => ('l' in c ? !overlap(r, c) : Math.hypot(Math.max(r.l - c.x, 0, c.x - r.r), Math.max(r.t - c.y, 0, c.y - r.b)) >= c.r);

  it('next to the top if nothing is in the way there', () => {
    expect(placeTag(100, 200, 190, 150, [[]], bounds)).toEqual({ x: 100, y: 200 });
  });

  it('does not end up under the rocket grab, the rail or the button that opened it', () => {
    const blocks: Cover[] = [{ x: 195, y: 377, r: 60 }, { l: 20, t: 467, r: 370, b: 541 }, { l: 150, t: 280, r: 214, b: 344 }];
    const tag = tagAt(placeTag(208, 342, 190, 150, [blocks], bounds));
    for (const b of blocks) expect(clearOf(tag, b)).toBe(true);
    expect(tag.l >= bounds.l && tag.r <= bounds.r && tag.t >= bounds.t && tag.b <= bounds.b).toBe(true);
  });

  it('with no spot clear of everything, it first gives up what is only seen (the title), never the button that opened it', () => {
    const mine: Rect = { l: 150, t: 280, r: 214, b: 344 };
    const title: Rect = { l: 12, t: 12, r: 378, b: 300 };
    const controls: Cover[] = [mine, { x: 195, y: 377, r: 60 }, { l: 12, t: 440, r: 378, b: 760 }];
    const tag = tagAt(placeTag(176, 310, 190, 150, [[...controls, title], controls, [mine]], bounds));
    for (const c of controls) expect(clearOf(tag, c)).toBe(true);
    expect(overlap(tag, title)).toBe(true);
  });
});

describe('Sono only for figures', () => {
  it('wraps runs of digits and leaves the words out', () => {
    expect(numHtml('0 of 12 turns')).toBe('<span class="num">0</span> of <span class="num">12</span> turns');
    expect(numHtml('+1.2/s')).toBe('<span class="num">+1.2</span>/s');
    expect(numHtml('Rocket 3 · r 1.25 · t 4.0 s.')).toBe('Rocket <span class="num">3</span> · r <span class="num">1.25</span> · t <span class="num">4.0</span> s.');
  });

  it('runs for the proof canvas', () => {
    const runs = numRuns('proof of a visit · 1 flight · 2026-09-25 04:10');
    expect(runs.filter((r) => r.num).map((r) => r.text)).toEqual(['1', '2026-09-25', '04:10']);
    expect(runs.map((r) => r.text).join('')).toBe('proof of a visit · 1 flight · 2026-09-25 04:10');
  });

  it("the page's static figures already sit in their span", () => {
    expect(html).toContain('<span class="drum-rate"><span class="num">+1.2</span>/s</span>');
    expect(html).toContain('<span class="num">0</span> of <span class="num">12</span> turns');
  });
});

describe('the butterfly key', () => {
  it('has a waist: the neck is much narrower than the wing, and the wing starts outside the hub', () => {
    const a = 10;
    const pts = wingPoints(a);
    const maxY = Math.max(...pts.map(([, y]) => y));
    expect(WING.neck * a).toBeLessThan(maxY * 0.3);
    // Where the neck meets the oval: beyond the edge of the hub, so the waist shows.
    const junction = pts[1][0];
    expect(junction).toBeGreaterThan(WING.hub * a * 1.3);
  });
});

describe('index copy', () => {
  it('passes the shared verifier (routes, lines, credit, three sockets without a link)', () => {
    expect(checkIndexHtml(html)).toEqual([]);
  });

  it('lab sockets numbered [1:1:7], [1:1:8], [1:1:9]', () => {
    const coords = [...html.matchAll(/<span class="lab-coord">([^<]+)<\/span>/g)].map((m) => m[1]);
    expect(coords).toEqual(['[1:1:7]', '[1:1:8]', '[1:1:9]']);
  });

  it('all five worlds say "Open world" the same way', () => {
    const ctas = [...html.matchAll(/<a class="open-world" href="\/4d-os\/[a-e]\/">([^<]+)</g)].map((m) => m[1].trim());
    expect(ctas).toEqual(['Open world', 'Open world', 'Open world', 'Open world', 'Open world']);
  });

  it('on touch screens the rail hint talks about dragging, not the space bar', () => {
    expect(html).toContain('<span class="rail-hint rail-hint-touch">Drag the rocket back, let go to fly</span>');
  });
});
