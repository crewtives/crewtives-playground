import { describe, expect, it } from 'vitest';
import { FRAME_COUNT, WHALE_FALL, fallState, properTime } from '../../scenes/whaleFall';
import { buildWhale, whaleKinematics, writePart, type WhalePart } from './whaleFallBody';

const { rs, fps } = WHALE_FALL;
const lastT = (FRAME_COUNT - 1) / fps;

describe('whale-fall: the equation-generated whale', () => {
  const parts = buildWhale();
  const positions = parts.map((part) => new Float32Array(part.vertexCount * 3));
  const pose = (t: number) => {
    const k = whaleKinematics(fallState(t));
    parts.forEach((part, i) => writePart(part, k, positions[i]));
    return k;
  };
  /** Signed volume of a closed mesh: positive if the faces point outward. */
  const volume = (part: WhalePart, v: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < part.indices.length; i += 3) {
      const [a, b, c] = [part.indices[i] * 3, part.indices[i + 1] * 3, part.indices[i + 2] * 3];
      sum += v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c]);
    }
    return sum / 6;
  };

  it('fixed topology: the five parts, valid indices and finite positions over the whole clip', () => {
    expect(parts.map((p) => p.name)).toEqual(['body', 'pectoralRight', 'pectoralLeft', 'fluke', 'dorsal']);
    for (const part of parts) for (const index of part.indices) expect(index).toBeLessThan(part.vertexCount);
    for (const t of [0, 5, 10, lastT]) {
      pose(t);
      for (const v of positions) for (const x of v) expect(Number.isFinite(x)).toBe(true);
    }
  });

  it('the winding normals point outward (positive signed volume)', () => {
    for (const t of [0, lastT]) {
      pose(t);
      parts.forEach((part, i) => expect(volume(part, positions[i])).toBeGreaterThan(0));
    }
  });

  it('humpback proportions: pectoral fins ~1/3 of the body and a wide fluke', () => {
    pose(0);
    const extent = (i: number) => {
      const v = positions[i];
      let max = 0;
      for (let a = 0; a < v.length; a += 3) {
        for (let b = a + 3; b < v.length; b += 3 * 7) max = Math.max(max, Math.hypot(v[a] - v[b], v[a + 1] - v[b + 1], v[a + 2] - v[b + 2]));
      }
      return max;
    };
    const length = WHALE_FALL.whaleLength;
    expect(extent(1) / length).toBeGreaterThan(0.3);
    expect(extent(1) / length).toBeLessThan(0.4);
    expect(extent(3) / length).toBeGreaterThan(0.3);
  });

  it('the whole body (not just its center) stays outside the horizon in every frame', () => {
    let min = Infinity;
    for (let f = 0; f < FRAME_COUNT; f += f < FRAME_COUNT - 60 ? 5 : 1) {
      pose(f / fps);
      for (const v of positions) for (let i = 0; i < v.length; i += 3) min = Math.min(min, Math.hypot(v[i], v[i + 1], v[i + 2]));
    }
    expect(min).toBeGreaterThan(rs);
  }, 30000);

  it('the fluke beats in proper time: measured on the geometry, each cycle lasts 1/f of τ and the cycles lengthen', () => {
    // Mean height of the fluke in the body frame, at 120 Hz.
    const heave: number[] = [];
    const times: number[] = [];
    const fluke = parts[3];
    const v = positions[3];
    for (let t = 0; t <= lastT; t += 1 / 120) {
      const k = whaleKinematics(fallState(t));
      writePart(fluke, k, v);
      let y = 0;
      for (let i = 0; i < v.length; i += 3) y += (v[i] - k.origin[0]) * k.up[0] + (v[i + 1] - k.origin[1]) * k.up[1] + (v[i + 2] - k.origin[2]) * k.up[2];
      heave.push(y / (v.length / 3));
      times.push(t);
    }
    const mean = heave.reduce((a, b) => a + b, 0) / heave.length;
    // Upward crossings of the mean, interpolated.
    const crossings: number[] = [];
    for (let i = 1; i < heave.length; i++) {
      const a = heave[i - 1] - mean;
      const b = heave[i] - mean;
      if (a < 0 && b >= 0) crossings.push(times[i - 1] + (a / (a - b)) * (times[i] - times[i - 1]));
    }
    expect(crossings.length).toBeGreaterThanOrEqual(4);
    const period = 1 / WHALE_FALL.beatHz;
    for (let i = 1; i < crossings.length; i++) {
      // In proper time, each cycle lasts exactly one period.
      expect(Math.abs(properTime(crossings[i]) - properTime(crossings[i - 1]) - period) / period).toBeLessThan(0.01);
    }
    const first = crossings[1] - crossings[0];
    const last = crossings[crossings.length - 1] - crossings[crossings.length - 2];
    // On the distant clock, the last cycle lasts much longer than the first.
    expect(last / first).toBeGreaterThan(1.3);
  }, 30000);
});
