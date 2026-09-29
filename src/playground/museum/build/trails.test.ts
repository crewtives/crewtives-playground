import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { QUANT_MAX } from '../../../engine/pack/format';
import { parseDynamic } from '../../../engine/pack/loader';
import { seedPosition, seedScale } from '../../bloomscope/sow/sow';
import { seedTrail } from './seeds';
import { testPack } from './testPack';
import { packTrail, readPack } from './trail';

const repo = resolve(import.meta.dirname, '../../../..');

describe('pack trail (2.3)', () => {
  test('falcon-phi gives 450 vertices and each one is the centroid of its frame ("Elevation of a pack")', () => {
    const { meta, dynamic } = readPack(resolve(repo, 'sites/4d-os/public/packs/falcon-phi'));
    const trail = packTrail(meta, dynamic);
    expect(trail).toHaveLength(450);
    // Centroid of frame 200 computed separately, point by point.
    const layer = parseDynamic(dynamic, meta);
    const f = 200;
    let x = 0;
    let z = 0;
    const n = layer.offsets[f + 1] - layer.offsets[f];
    for (let i = layer.offsets[f]; i < layer.offsets[f + 1]; i++) {
      x += meta.bbox.min[0] + (layer.positions[i * 3] / QUANT_MAX) * (meta.bbox.max[0] - meta.bbox.min[0]);
      z += meta.bbox.min[2] + (layer.positions[i * 3 + 2] / QUANT_MAX) * (meta.bbox.max[2] - meta.bbox.min[2]);
    }
    expect(trail[f].x).toBeCloseTo(x / n, 6);
    expect(trail[f].depth).toBeCloseTo(z / n, 6);
    expect(trail[f].t).toBe(f);
  });

  test('a test dynamic.bin gives the expected centroids and heights', () => {
    const pack = testPack('tiny', [
      [[0, 0, 0], [2, 5, 4]],
      [[1, 1, 1], [3, 3, 3], [5, 5, 5]],
      [[-4, 0, 2]],
    ]);
    const trail = packTrail(pack.meta, pack.dynamicBin);
    const tol = 20 / QUANT_MAX; // one quantization step of the test bbox
    expect(trail.map((m) => m.t)).toEqual([0, 1, 2]);
    expect(Math.abs(trail[0].x - 1)).toBeLessThan(tol);
    expect(Math.abs(trail[0].depth - 2)).toBeLessThan(tol);
    expect(Math.abs(trail[1].x - 3)).toBeLessThan(tol);
    expect(Math.abs(trail[1].depth - 3)).toBeLessThan(tol);
    expect(Math.abs(trail[2].x + 4)).toBeLessThan(tol);
    expect(Math.abs(trail[2].depth - 2)).toBeLessThan(tol);
  });

  test('the pack trail does not use the rules of the works ("Pack trail without the rule")', () => {
    const source = readFileSync(resolve(import.meta.dirname, 'trail.ts'), 'utf8');
    expect(source).not.toMatch(/SPIRAL|fallRadius|falconPhi|whaleFall/);
  });
});

describe('Sow seed trail (2.2)', () => {
  const alpha = 137.5078;
  const perFrame = Array.from({ length: 45 }, (_, f) => 610 + 2 * f);
  const trail = seedTrail(alpha, perFrame);

  test('45 NOWs: seed 610 + 2f − 1 ("NOW of 004")', () => {
    expect(trail.nows).toHaveLength(45);
    trail.nows.forEach((now, f) => expect(now).toBe(610 + 2 * f - 1));
    expect(trail.nows[0]).toBe(609);
    expect(trail.nows[44]).toBe(697);
  });

  test('698 points with increasing heights and the segment from 609 to 697 ("Trail of 004")', () => {
    expect(trail.moments).toHaveLength(698);
    trail.moments.forEach((m, n) => expect(m.t).toBe(n));
    expect(trail.span).toEqual([609, 697]);
  });

  test('the plan is seedPosition(n, α, seedScale(698)) ("Plan and elevation of 004")', () => {
    const c = seedScale(698);
    expect(trail.c).toBe(c);
    for (const n of [0, 1, 300, 609, 697]) {
      const [x, y] = seedPosition(n, alpha, c);
      expect(trail.moments[n].x).toBe(x);
      // The drawing's depth grows downward: it is −y (the flower head as the work shows it).
      expect(trail.moments[n].depth).toBe(-y);
    }
  });

  test('no seed goes past the newest one at the last frame', () => {
    expect(Math.max(...trail.moments.map((m) => m.t))).toBe(697);
  });

  test('other counts give another trail', () => {
    const other = seedTrail(alpha, Array.from({ length: 45 }, (_, f) => 610 + f));
    expect(other.moments).toHaveLength(654);
    expect(other.span).toEqual([609, 653]);
  });
});
