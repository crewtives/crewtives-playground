import { describe, expect, test } from 'vitest';
import { SampledCurve, criticalStep, lowerEnvelope, minJerk, smoothCurve, springCurve } from './catSprings';
import { StairsMotion } from './catStairsMotion';

describe('tabulated springs', () => {
  test('the critical step does not depend on the step size', () => {
    const run = (steps: number) => {
      const state = { x: 1, v: 0 };
      for (let i = 0; i < steps; i++) criticalStep(state, 0, 0.1, 0.4 / steps);
      return state.x;
    };
    expect(run(96)).toBeCloseTo(run(1), 12);
  });

  test('evaluating the table in any order gives the same result', () => {
    const curve = springCurve((t) => (t > 0.5 ? 1 : 0) + 0.2 * Math.sin(7 * t), 0.08, 0, 2);
    const times = Array.from({ length: 400 }, (_, i) => (i * 37) % 400 / 200);
    const shuffled = times.map((t) => curve.at(t));
    const ordered = times.slice().sort((a, b) => a - b).map((t) => curve.at(t));
    expect(times.slice().sort((a, b) => a - b).map((t) => shuffled[times.indexOf(t)])).toEqual(ordered);
  });

  test('smoothing has no lag and the envelope never exceeds the curve', () => {
    const values = Float64Array.from({ length: 481 }, (_, i) => minJerk((i - 210) / 60));
    const smooth = smoothCurve(new SampledCurve(values, 0), 0.05);
    // Symmetric around the center: no lag.
    expect(smooth.values[240]).toBeCloseTo(0.5, 6);
    const dips = Float64Array.from({ length: 481 }, (_, i) => (i % 97 === 0 ? -1 : 0) + Math.sin(i / 40));
    const envelope = lowerEnvelope(new SampledCurve(dips, 0), 0.07, 0.022);
    envelope.values.forEach((v, i) => expect(v).toBeLessThanOrEqual(dips[i] + 1e-12));
  });

  test('the cat pose is a pure function of time: loose, in order or in another instance, the same', () => {
    const a = new StairsMotion(1);
    const b = new StairsMotion(1);
    const times = [7.3, 0.5, 13.9, 4.2, 10.75, 2.05, 12.4];
    const loose = times.map((t) => JSON.stringify(a.at(t)));
    const ordered = times.slice().sort((x, y) => x - y).map((t) => JSON.stringify(b.at(t)));
    expect(times.slice().sort((x, y) => x - y).map((t) => loose[times.indexOf(t)])).toEqual(ordered);
  });
});
