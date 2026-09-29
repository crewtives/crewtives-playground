import { describe, expect, test } from 'vitest';
import { LEGS, coefficientOfVariation, isLeft, plantedCount, swingPoint } from './catGait';
import { SCRIPT, STAIRS, StairsMotion, surfaceHeight } from './catStairsMotion';

// The footfall plan of "cat-stairs" with the bake seed.
const plan = new StairsMotion(1);
const tracks = Object.values(plan.tracks);

/** Climb cycles (from step to step of the same leg), excluding those that cross the micro-pause. */
function climbCycles(motion: StairsMotion): number[] {
  const pauseEnd = SCRIPT.pause + 2 * SCRIPT.pauseRamp + SCRIPT.pauseHold;
  const out: number[] = [];
  for (const leg of LEGS) {
    const steps = motion.tracks[leg].steps;
    for (let i = 1; i < steps.length; i++) {
      const a = steps[i - 1];
      const b = steps[i];
      const onStairs = a.to.point[1] > 0.05 && b.to.point[1] < STAIRS.landing.y - 0.01;
      if (onStairs && a.land > SCRIPT.go && (b.land < SCRIPT.pause || a.land > pauseEnd)) out.push(b.land - a.land);
    }
  }
  return out;
}

describe('cat-stairs footfalls', () => {
  test('step durations vary between 3 % and 15 % (coefficient of variation)', () => {
    const cycles = climbCycles(plan);
    expect(cycles.length).toBeGreaterThanOrEqual(6);
    const cv = coefficientOfVariation(cycles);
    expect(cv).toBeGreaterThanOrEqual(0.03);
    expect(cv).toBeLessThanOrEqual(0.15);
    // Climb cycles of ~0.75–0.95 s.
    const mean = cycles.reduce((a, b) => a + b, 0) / cycles.length;
    expect(mean).toBeGreaterThan(0.75);
    expect(mean).toBeLessThan(0.95);
  });

  test('at a walk there are always at least two legs planted', () => {
    const end = plan.sitStart + SCRIPT.sit + 0.3;
    for (let t = 0; t <= end; t += 1 / 240) expect(plantedCount(tracks, t)).toBeGreaterThanOrEqual(2);
  });

  test('each leg steps on every other tread, and the hind leg steps on the tread of its front leg', () => {
    const treadOf = (z: number) => Math.floor((z - STAIRS.z0) / STAIRS.run) + 1;
    const treads = (leg: (typeof LEGS)[number]) =>
      plan.tracks[leg].steps.map((s) => s.to.point).filter((p) => p[2] > STAIRS.z0 && p[2] < STAIRS.landing.z[0]).map((p) => treadOf(p[2]));
    for (const leg of LEGS) {
      const list = treads(leg);
      expect(list.length).toBeGreaterThanOrEqual(4);
      // Left legs on even treads, right legs on odd ones.
      for (const k of list) expect(k % 2).toBe(isLeft(leg) ? 0 : 1);
      // Two treads at a time.
      for (let i = 1; i < list.length; i++) expect(list[i] - list[i - 1]).toBe(2);
    }
    for (const k of treads('LH')) expect(treads('LF')).toContain(k);
    for (const k of treads('RH')) expect(treads('RF')).toContain(k);
  });

  test('on the stairs the paw lifts upward and sets down from above, without grazing the tread', () => {
    for (const track of tracks) {
      for (const step of track.steps.filter((s) => s.path)) {
        const [a, b] = [step.from.point, step.to.point];
        const path = Array.from({ length: 401 }, (_, i) => swingPoint(step, i / 400).point);
        // While the paw is still within 3 mm of the departure tread, and once it drops within 3 mm of the
        // arrival tread, it stays within 1.5 cm of its spot: it does not sweep across the tread.
        const up = path.findIndex((p) => p[1] - a[1] >= 0.003);
        const down = path.length - 1 - [...path].reverse().findIndex((p) => p[1] - b[1] >= 0.003);
        for (const p of path.slice(0, up)) expect(Math.hypot(p[0] - a[0], p[2] - a[2])).toBeLessThan(0.015);
        for (const p of path.slice(down + 1)) expect(Math.hypot(p[0] - b[0], p[2] - b[2])).toBeLessThan(0.015);
      }
    }
  });

  test('footholds lie on the surface they step on', () => {
    for (const track of tracks) {
      for (const step of track.steps) {
        const [x, y, z] = step.to.point;
        expect(Math.abs(y - surfaceHeight(x, z))).toBeLessThan(1e-9);
      }
    }
  });

  test('deterministic: the same seed gives the same plan and another seed, another one', () => {
    const table = (motion: StairsMotion) => JSON.stringify(LEGS.map((leg) => motion.tracks[leg].steps.map((s) => [s.lift, s.land, s.to.point])));
    expect(table(new StairsMotion(1))).toBe(table(plan));
    expect(table(new StairsMotion(2))).not.toBe(table(plan));
  });
});
