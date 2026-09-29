import { describe, expect, test } from 'vitest';
import { nextPositions } from './packGpu';

describe('aNext (interpolated present)', () => {
  test('each point gets its position in the next frame; the last frame repeats', () => {
    // 3 frames of 2 points: the value encodes frame·100 + point·10 + axis.
    const positions = new Uint16Array(3 * 2 * 3);
    for (let f = 0; f < 3; f++) for (let i = 0; i < 2; i++) for (let a = 0; a < 3; a++) positions[(f * 2 + i) * 3 + a] = f * 100 + i * 10 + a;
    const next = nextPositions(positions, 2);
    for (let f = 0; f < 3; f++) {
      for (let i = 0; i < 2; i++) {
        for (let a = 0; a < 3; a++) expect(next[(f * 2 + i) * 3 + a]).toBe(Math.min(f + 1, 2) * 100 + i * 10 + a);
      }
    }
  });

  test('a single frame repeats in full', () => {
    const positions = Uint16Array.from([1, 2, 3, 4, 5, 6]);
    expect(Array.from(nextPositions(positions, 2))).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
