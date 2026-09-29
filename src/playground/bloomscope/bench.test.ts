// Pure modules of the bench: Sow (golden angle, spokes, spirals, notes), the lathe (leaves,
// staircase, chirality, drop) and the honeycomb (B2/S34, rewind, caps and the printed seed).
import { describe, expect, it } from 'vitest';
import {
  CAP_AFTER,
  combPatch,
  findSeed,
  Hive,
  HIVE_SEED,
  HIVE_SIZE,
  moveCursor,
  neighbours,
  population,
  randomCells,
  stepCells,
  cellAt,
  cellCenter,
  frameSize,
} from './hive/hexLife';
import { dropExposures, dropPath, leafFrames, nextLeaf, type RosetteParams } from './lathe/rosette';
import {
  clampAngle,
  convergentDenominators,
  dialAngle,
  dialValueText,
  NAMED_STATES,
  nearestSeed,
  pattern,
  patternText,
  seedNote,
  seedPosition,
  seedScale,
  snapGolden,
  stepNamed,
  valueFromDial,
} from './sow/sow';
import { combMesh, rosetteMesh } from './specimens/mesh';
import { GOLDEN_ANGLE } from './specimens/spec';

describe('Sow', () => {
  it('seed n sits at n·α, at a radius proportional to √n', () => {
    const c = 0.1;
    const [x, y] = seedPosition(9, GOLDEN_ANGLE, c);
    expect(Math.hypot(x, y)).toBeCloseTo(c * Math.sqrt(9.5), 10);
    expect(Math.atan2(y, x)).toBeCloseTo(((((9 * GOLDEN_ANGLE) % 360) + 540) % 360 - 180) * (Math.PI / 180), 10);
    const [x4] = seedPosition(4, 0, c);
    expect(x4 / c).toBeCloseTo(Math.sqrt(4.5), 10);
  });

  it('golden detent: 137.49° snaps to 137.508° (Golden detent)', () => {
    const r = snapGolden(137.49);
    expect(r.snapped).toBe(true);
    expect(r.angle.toFixed(3)).toBe('137.508');
    expect(snapGolden(137.477).snapped).toBe(false);
    expect(snapGolden(137.54).snapped).toBe(false);
    expect(snapGolden(137.5377).snapped).toBe(true);
  });

  it('convergents of the continued fraction', () => {
    expect(convergentDenominators(GOLDEN_ANGLE / 360, 100)).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
    expect(convergentDenominators(0.4)).toEqual([1, 2, 5]);
    expect(convergentDenominators(1 / 3)).toEqual([1, 3]);
  });

  it('golden with 1,204 seeds: about 34 · 55 (Spiral estimate)', () => {
    expect(patternText(pattern(GOLDEN_ANGLE, 1204))).toBe('visible spirals about 34 · 55 (estimated)');
    expect(dialValueText(GOLDEN_ANGLE, 1204)).toBe('137.508 degrees, golden, about 34 and 55 spirals');
  });

  it('golden never gives spokes, with few or many seeds', () => {
    for (const n of [50, 100, 300, 610, 1204, 2400]) expect(pattern(GOLDEN_ANGLE, n).kind).toBe('spirals');
  });

  it('Fifths 144° with at least 100 seeds: spokes 5 (Spokes); Thirds: 3', () => {
    for (const n of [100, 610, 2400]) expect(patternText(pattern(144, n))).toBe('spokes 5');
    expect(patternText(pattern(120, 400))).toBe('spokes 3');
  });

  it('named states, in order, with Page Down and Page Up (Named states)', () => {
    expect(NAMED_STATES.map((s) => s.label)).toEqual([
      'Golden 137.508°',
      'Spokes 137.3°',
      'Near 137.6°',
      'Fifths 144°',
      'Thirds 120°',
      'Root 2 turn 149.117°',
    ]);
    expect(stepNamed(GOLDEN_ANGLE, 1).label).toBe('Spokes 137.3°');
    expect(stepNamed(137.3, -1).label).toBe('Golden 137.508°');
    expect(stepNamed(149.117, 1).label).toBe('Golden 137.508°');
    expect(NAMED_STATES[5].angle.toFixed(3)).toBe('149.117');
    // From an unnamed angle, the next one in that direction.
    expect(stepNamed(140, 1).label).toBe('Fifths 144°');
  });

  it('the dial sweeps 300° of arc for 120°–160°, with the gap at the bottom', () => {
    expect(dialAngle(120)).toBe(-150);
    expect(dialAngle(160)).toBe(150);
    expect(valueFromDial(0)).toBeCloseTo(140, 10);
    expect(valueFromDial(180)).toBeNull();
    expect(valueFromDial(dialAngle(GOLDEN_ANGLE))!).toBeCloseTo(GOLDEN_ANGLE, 9);
    expect(clampAngle(170)).toBe(160);
  });

  it('at 144° the note repeats every 5 seeds; at the golden angle it does not (The melody of fives)', () => {
    const notes = Array.from({ length: 30 }, (_, n) => seedNote(n, 144));
    for (let n = 5; n < 30; n++) expect(notes[n]).toBe(notes[n - 5]);
    expect(new Set(notes.slice(0, 5)).size).toBe(5);
    const golden = Array.from({ length: 30 }, (_, n) => seedNote(n, GOLDEN_ANGLE));
    expect(golden.some((note, n) => n >= 5 && note !== golden[n - 5])).toBe(true);
  });

  it('finds the seed under the pointer', () => {
    const count = 610;
    const c = seedScale(count);
    const [x, y] = seedPosition(412, GOLDEN_ANGLE, c);
    expect(nearestSeed(x + c * 0.1, y, GOLDEN_ANGLE, count, c)).toBe(412);
    expect(nearestSeed(5, 5, GOLDEN_ANGLE, count, c)).toBe(-1);
  });
});

describe('rosette lathe', () => {
  const echeveria: RosetteParams = { species: 'echeveria', leaves: 13, plump: 0.5, blush: 0.5, stretch: 0 };

  it('echeveria: leaves at the golden angle; +8 from 13 gives 21 leaves (Adding leaves)', () => {
    const leaves = leafFrames({ ...echeveria, leaves: 13 + 8 });
    expect(leaves).toHaveLength(21);
    const step = ((leaves[1].azimuth - leaves[0].azimuth) * 180) / Math.PI;
    expect(step).toBeCloseTo(GOLDEN_ANGLE, 9);
    // The newest one, at the center: the shortest and the most upright.
    expect(leaves[0].length).toBeLessThan(leaves[20].length);
    expect(leaves[0].tilt).toBeLessThan(leaves[20].tilt);
  });

  it('Stretch time: the height of each leaf grows with its birth order (Stretching time)', () => {
    const flat = leafFrames({ ...echeveria, leaves: 21, stretch: 0 });
    expect(flat.every((l) => l.lift === 0)).toBe(true);
    const stair = leafFrames({ ...echeveria, leaves: 21, stretch: 1 });
    // Birth order: leaf K−1 is the first, leaf 0 the last. The first one stays at the bottom.
    for (let k = 1; k < stair.length; k++) expect(stair[k - 1].lift).toBeGreaterThan(stair[k].lift);
    expect(stair[20].lift).toBe(0);
  });

  it('aloe: spiral near 144°; switching the gem gives the mirror image (Chirality)', () => {
    const cw = leafFrames({ ...echeveria, species: 'aloe-cw', leaves: 20 });
    const ccw = leafFrames({ ...echeveria, species: 'aloe-ccw', leaves: 20 });
    expect(((cw[1].azimuth - cw[0].azimuth) * 180) / Math.PI).toBeCloseTo(148.2, 9);
    const a = rosetteMesh({ ...echeveria, species: 'aloe-cw', leaves: 20 }, { raw: true }).positions;
    const b = rosetteMesh({ ...echeveria, species: 'aloe-ccw', leaves: 20 }, { raw: true }).positions;
    expect(a.length).toBe(b.length);
    // Mirror across the xz plane: (x, y, z) ↦ (x, −y, z), vertex by vertex.
    for (let i = 0; i < a.length; i += 3) {
      expect(b[i]).toBeCloseTo(a[i], 9);
      expect(b[i + 1]).toBeCloseTo(-a[i + 1], 9);
      expect(b[i + 2]).toBeCloseTo(a[i + 2], 9);
    }
    expect(cw.length).toBe(ccw.length);
  });

  it('the drop runs down leaves ever further in, ends at the center and leaves 16 exposures (Down to the center)', () => {
    const params = { ...echeveria, leaves: 21 };
    const path = dropPath(params, 20);
    expect(path.leaves[0]).toBe(20);
    for (let i = 1; i < path.leaves.length; i++) expect(path.leaves[i]).toBeLessThan(path.leaves[i - 1]);
    expect(path.leaves.length).toBeGreaterThanOrEqual(3);
    const end = path.points[path.points.length - 1];
    expect(Math.hypot(end[0], end[1])).toBeLessThan(1e-9);
    const shots = dropExposures(path, 16);
    expect(shots).toHaveLength(16);
    expect(shots[15]).toEqual(end);
    // On each leaf the drop only goes down.
    for (let i = 1; i < path.points.length; i++) {
      if (path.leafAt[i] >= 0 && path.leafAt[i] === path.leafAt[i - 1]) expect(path.points[i][2]).toBeLessThanOrEqual(path.points[i - 1][2] + 1e-9);
    }
    expect(path.duration).toBeGreaterThan(0.5);
    expect(path.duration).toBeLessThan(8);
  });

  it('with the golden angle, the jump is a Fibonacci number', () => {
    const leaves = leafFrames({ ...echeveria, leaves: 34 });
    const jump = 33 - nextLeaf(leaves, 33);
    expect([5, 8, 13, 21]).toContain(jump);
  });

  it('the ruby rule goes on the newest leaf', () => {
    const plain = rosetteMesh({ ...echeveria, leaves: 8 }).positions.length;
    const keyed = rosetteMesh({ ...echeveria, leaves: 8 }, { nowKeyline: true }).positions.length;
    expect(keyed).toBeGreaterThan(plain);
  });
});

describe('B2/S34 honeycomb', () => {
  const W = HIVE_SIZE.desktop.w;
  const H = HIVE_SIZE.desktop.h;

  it('each cell has 6 distinct neighbors, counting across the edges', () => {
    for (const [q, r] of [
      [0, 0],
      [W - 1, H - 1],
      [5, 7],
      [0, 1],
    ]) {
      const n = neighbours(q, r, W, H);
      expect(new Set(n).size).toBe(6);
      expect(n).not.toContain(r * W + q);
      // The neighborhood is symmetric.
      for (const i of n) expect(neighbours(i % W, Math.floor(i / W), W, H)).toContain(r * W + q);
    }
  });

  it('born with exactly 2 neighbors, survives with 3 or 4 (Rule B2/S34)', () => {
    const cells = randomCells(99, W, H, 0.35);
    const next = stepCells(cells, W, H);
    for (let i = 0; i < cells.length; i++) {
      const n = neighbours(i % W, Math.floor(i / W), W, H).reduce((s, j) => s + cells[j], 0);
      const expected = cells[i] ? (n === 3 || n === 4 ? 1 : 0) : n === 2 ? 1 : 0;
      expect(next[i]).toBe(expected);
    }
  });

  it('an isolated cell leaves the frame empty (Isolated cell)', () => {
    const cells = new Uint8Array(W * H);
    cells[5 * W + 7] = 1;
    expect(population(stepCells(cells, W, H))).toBe(0);
  });

  it('the printed seed is the first one that qualifies, and gives the same frame twice (Printed seed)', () => {
    expect(findSeed(W, H)).toBe(HIVE_SEED.desktop);
    expect(findSeed(HIVE_SIZE.phone.w, HIVE_SIZE.phone.h)).toBe(HIVE_SEED.phone);
    expect(randomCells(HIVE_SEED.desktop, W, H)).toEqual(randomCells(HIVE_SEED.desktop, W, H));
  });

  it('5 steps and Rewind show exactly generation 4 (Rewinding)', () => {
    const hive = new Hive(W, H);
    hive.random(HIVE_SEED.desktop);
    const frames = [hive.cells.slice()];
    for (let i = 0; i < 5; i++) {
      hive.step();
      frames.push(hive.cells.slice());
    }
    expect(hive.generation).toBe(5);
    expect(hive.rewind()).toBe(true);
    expect(hive.generation).toBe(4);
    expect(hive.cells).toEqual(frames[4]);
  });

  it('a cell alive for 6 generations in a row gets a cap (Cap)', () => {
    // A block of 3 mutually neighboring cells plus a fourth: all with 3 live neighbors… we look for
    // a stable cell in a real run and check the counter.
    const hive = new Hive(W, H);
    hive.random(HIVE_SEED.desktop);
    let found = -1;
    for (let g = 0; g < 40 && found < 0; g++) {
      hive.step();
      for (let i = 0; i < W * H; i++) if (hive.capped(i)) found = i;
    }
    expect(found).toBeGreaterThanOrEqual(0);
    // Direct check of the counter: alive in the last 6 generations.
    const layers = hive.layers(CAP_AFTER);
    expect(layers.every((layer) => layer[found] === 1)).toBe(true);
  });

  it('the cursor travels along the honeycomb axes and wraps around the edges', () => {
    expect(moveCursor(0, 'left', false, W, H)).toBe(W - 1);
    const start = 4 * W + 10;
    // Up and then down along the same axis returns to the same place.
    expect(moveCursor(moveCursor(start, 'up', false, W, H), 'down', false, W, H)).toBe(start);
    expect(moveCursor(moveCursor(start, 'up', true, W, H), 'down', true, W, H)).toBe(start);
    // Every move lands on a neighbor.
    for (const key of ['up', 'down'] as const)
      for (const shift of [false, true]) expect(neighbours(10, 4, W, H)).toContain(moveCursor(start, key, shift, W, H));
  });

  it('the cell under a point of the frame', () => {
    const f = frameSize(W, H);
    const [cx, cy] = cellCenter(7, 3);
    expect(cellAt(cx + f.x0 + 0.3, cy + f.y0 - 0.2, W, H)).toBe(3 * W + 7);
    expect(cellAt(1000, 0, W, H)).toBe(-1);
  });

  it('a 37-cell patch goes into the chamber as a honeycomb', () => {
    const hive = new Hive(W, H);
    hive.random(HIVE_SEED.desktop);
    const patch = combPatch(hive, 8 * W + 12);
    expect(patch).toMatch(/^[0-3]{37}$/);
    // The central cell is the cursor's.
    expect(patch[18] !== '0').toBe(hive.cells[8 * W + 12] === 1);
    expect(combMesh(3, 1, patch).positions.length).toBeGreaterThan(0);
  });
});
