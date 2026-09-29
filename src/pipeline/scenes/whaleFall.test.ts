import { describe, expect, it } from 'vitest';
import {
  FRAME_COUNT,
  WHALE_FALL,
  beatPhase,
  blackbody,
  dilationAt,
  fallRadius,
  fallState,
  fallStateAtFrame,
  orbitAngle,
  properTime,
  properTimeExact,
  redshiftColor,
} from './whaleFall';

const { rs, fps, duration } = WHALE_FALL;
const lastT = (FRAME_COUNT - 1) / fps;

describe('whale-fall: fall', () => {
  it('never crosses the horizon: r > r_s in every frame (and over the whole clip at 240 Hz)', () => {
    let min = Infinity;
    for (let f = 0; f < FRAME_COUNT; f++) {
      const state = fallStateAtFrame(f);
      const [x, y, z] = state.position;
      // The distance of the whale's center, measured from its position, not only through r(t).
      const d = Math.hypot(x, y, z);
      expect(Math.abs(d - state.r)).toBeLessThan(1e-9);
      min = Math.min(min, d);
    }
    for (let t = 0; t <= duration; t += 1 / 240) min = Math.min(min, fallRadius(t));
    expect(min).toBeGreaterThan(rs);
    // And it really gets close: it ends less than 0.16 r_s from the horizon.
    expect(fallRadius(lastT) / rs - 1).toBeLessThan(0.16);
  });

  it('the radius always decreases and the integrated proper time matches the closed form', () => {
    let previous = Infinity;
    for (let f = 0; f < FRAME_COUNT; f++) {
      const r = fallRadius(f / fps);
      expect(r).toBeLessThan(previous);
      previous = r;
      expect(Math.abs(properTime(f / fps) - properTimeExact(f / fps))).toBeLessThan(1e-9);
    }
  });

  it('t − τ increases monotonically: the clock of the whale falls further and further behind', () => {
    let previous = -Infinity;
    for (let t = 0; t <= duration; t += 1 / 240) {
      const lag = t - properTime(t);
      expect(lag).toBeGreaterThan(previous);
      previous = lag;
    }
    // Over the clip, the distant clock reads 15 s and the whale's clock quite a bit less.
    expect(lastT - properTime(lastT)).toBeGreaterThan(3);
  });

  it('the angular velocity seen from afar slows near the horizon and the trail gets compressed', () => {
    const arc = (t0: number, t1: number) => {
      let length = 0;
      for (let t = t0; t < t1; t += 1 / 120) {
        const a = fallState(t).position;
        const b = fallState(t + 1 / 120).position;
        length += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      }
      return length;
    };
    const first = arc(0, 3);
    const last = arc(lastT - 3, lastT);
    // The last 3 s cover less than a fifth of the distance of the first 3 s.
    expect(last / first).toBeLessThan(0.2);
    expect(fallState(lastT).angularVelocity).toBeLessThan(0.5 * fallState(8).angularVelocity);
    // The orbit makes a bit more than one turn: a spiral that reads on the plate.
    const turns = (orbitAngle(lastT) - orbitAngle(0)) / (2 * Math.PI);
    expect(turns).toBeGreaterThan(1);
    expect(turns).toBeLessThan(2);
  });
});

describe('whale-fall: time dilation (spec procedural-subject)', () => {
  it('the beat rate of the last second over that of the first matches the ratio of the factors ±5 %', () => {
    // Beat rate: phase turns per second of clock time, measured with the phase sampled at 120 Hz.
    const rhythm = (t0: number, t1: number) => {
      let turns = 0;
      for (let t = t0; t < t1 - 1e-9; t += 1 / 120) turns += (beatPhase(t + 1 / 120) - beatPhase(t)) / (2 * Math.PI);
      return turns / (t1 - t0);
    };
    const first = rhythm(0, 1);
    const last = rhythm(lastT - 1, lastT);
    expect(last).toBeLessThan(first);
    const measured = last / first;
    const expected = dilationAt(fallRadius(lastT - 0.5)) / dilationAt(fallRadius(0.5));
    expect(Math.abs(measured / expected - 1)).toBeLessThan(0.05);
    // It is visible: at the end the tail beats at less than half the rate of the beginning.
    expect(measured).toBeLessThan(0.5);
  });

  it('the state exposes a consistent factor, redshift and τ', () => {
    for (const t of [0, 3.3, 7.1, lastT]) {
      const s = fallState(t);
      expect(s.dilation).toBeCloseTo(Math.sqrt(1 - rs / s.r), 12);
      expect(s.redshift).toBeCloseTo(1 / s.dilation - 1, 12);
      expect(s.tau).toBeCloseTo(properTime(t), 12);
      expect(s.rOverRs).toBeCloseTo(s.r / rs, 12);
      expect(Math.hypot(...s.forward)).toBeCloseTo(1, 12);
      expect(s.heading).toBeCloseTo(Math.atan2(s.forward[2], s.forward[0]), 12);
    }
  });
});

describe('whale-fall: color', () => {
  it('the redshift dims and reddens; without a shift the color does not change', () => {
    const white: [number, number, number] = [0.6, 0.6, 0.6];
    const same = redshiftColor(white, 1);
    for (let k = 0; k < 3; k++) expect(same[k]).toBeCloseTo(0.6, 6);
    const end = redshiftColor(white, fallState(lastT).dilation);
    expect(end[0]).toBeGreaterThan(3 * end[1]);
    expect(end[0] + end[1] + end[2]).toBeLessThan(0.75 * 1.8);
  });

  it('the black body goes from red to bluish white', () => {
    const cool = blackbody(2500);
    const hot = blackbody(15000);
    expect(cool[0]).toBeGreaterThan(cool[2] * 3);
    expect(hot[2]).toBeGreaterThan(hot[0]);
  });
});
