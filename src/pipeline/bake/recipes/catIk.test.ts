import { describe, expect, test } from 'vitest';
import { clampReach, twoBoneIk } from './catIk';

// Lengths of the cat's front and hind legs (m, at bake scale).
const CHAINS = [
  { l1: 0.1513, l2: 0.1093 },
  { l1: 0.1878, l2: 0.0953 },
];

describe('two-bone IK', () => {
  test('within reach, the tip reaches the target and the bones keep their length', () => {
    for (const { l1, l2 } of CHAINS) {
      for (let k = 0; k < 64; k++) {
        const angle = (k / 64) * 2 * Math.PI;
        // Distances away from the soft bands at both ends.
        const d = Math.abs(l1 - l2) + 0.08 + ((l1 + l2) * 0.9 - Math.abs(l1 - l2) - 0.08) * ((k * 7) % 64) / 63;
        const tx = 0.3 + d * Math.cos(angle);
        const ty = -0.1 + d * Math.sin(angle);
        for (const bend of [1, -1] as const) {
          const s = twoBoneIk(0.3, -0.1, tx, ty, l1, l2, bend);
          expect(Math.hypot(s.end[0] - tx, s.end[1] - ty)).toBeLessThan(1e-9);
          expect(Math.hypot(s.mid[0] - 0.3, s.mid[1] + 0.1)).toBeCloseTo(l1, 9);
          expect(Math.hypot(s.end[0] - s.mid[0], s.end[1] - s.mid[1])).toBeCloseTo(l2, 9);
          // The middle joint ends up on the requested side.
          const cross = (tx - 0.3) * (s.mid[1] + 0.1) - (ty + 0.1) * (s.mid[0] - 0.3);
          expect(Math.sign(cross)).toBe(bend);
        }
      }
    }
  });

  test('out of reach, it points at the target without fully straightening', () => {
    const { l1, l2 } = CHAINS[1];
    for (const d of [0.29, 0.35, 1, 10]) {
      const s = twoBoneIk(0, 0, d * 0.6, -d * 0.8, l1, l2, -1);
      expect(s.distance).toBeLessThan(l1 + l2);
      expect(s.distance).toBeGreaterThan((l1 + l2) * 0.98);
      // The tip lies on the line toward the target.
      expect(Math.atan2(s.end[1], s.end[0])).toBeCloseTo(Math.atan2(-0.8, 0.6), 9);
    }
  });

  test('no "pop" near the straight leg or the folded one', () => {
    for (const { l1, l2 } of CHAINS) {
      const max = l1 + l2;
      const min = Math.abs(l1 - l2);
      const sweep = (from: number, to: number) => {
        const step = 1e-4;
        let previous = twoBoneIk(0, 0, 0, -from, l1, l2, -1);
        let worst = 0;
        for (let d = from + step; d <= to; d += step) {
          const s = twoBoneIk(0, 0, 0, -d, l1, l2, -1);
          worst = Math.max(worst, Math.abs(s.upper - previous.upper) / step, Math.abs(s.lower - previous.lower) / step);
          previous = s;
        }
        return worst;
      };
      // Rad per meter of target displacement: bounded (without the clamp, it diverges at the ends).
      expect(sweep(max * 0.9, max * 1.1)).toBeLessThan(60);
      expect(sweep(min * 0.5, min + 0.05)).toBeLessThan(60);
    }
    // Reference: without the soft clamp, the derivative of arccosine near full extension is huge.
    const { l1, l2 } = CHAINS[0];
    const naive = (d: number) => Math.acos(Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const max = l1 + l2;
    expect(Math.abs(naive(max - 1e-7) - naive(max - 1e-4)) / (1e-4 - 1e-7)).toBeGreaterThan(60);
  });

  test('the clamp is continuous and monotonic', () => {
    const { l1, l2 } = CHAINS[1];
    let previous = clampReach(0, l1, l2);
    for (let d = 1e-4; d < 0.6; d += 1e-4) {
      const c = clampReach(d, l1, l2);
      expect(c).toBeGreaterThanOrEqual(previous - 1e-12);
      expect(c - previous).toBeLessThan(1.01e-4);
      expect(c).toBeLessThan(l1 + l2);
      expect(c).toBeGreaterThan(Math.abs(l1 - l2));
      previous = c;
    }
  });
});
