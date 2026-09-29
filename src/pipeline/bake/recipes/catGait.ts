import { hash2 } from '../common';
import type { Leg } from './catMotion';
import { firstTimeAt, minJerk, type SampledCurve } from './catSprings';

/**
 * The cat's footfall planner (D6). It produces a deterministic table of steps per leg: when it lifts,
 * when it lands and where. While planted, the foot stays fixed in the world; in the air it follows a
 * minimum-jerk path that passes above the nosing of the stair step.
 *
 * Landing is driven by distance and flight by time, as in an animal: a leg lands when the gait phase
 * (which advances with the distance the body travels) reaches its turn, and lifts one flight time
 * earlier. If the body stops, the phase stops and the legs stay planted; flights already under way
 * finish. The variation (flight duration, exact landing spot, arc height) comes from `hash2` with the
 * seed: no `Math.random`.
 */

export type Vec3 = [number, number, number];

export const LEGS: Leg[] = ['LH', 'LF', 'RH', 'RF'];
export const isFront = (leg: Leg): boolean => leg === 'LF' || leg === 'RF';
export const isLeft = (leg: Leg): boolean => leg === 'LF' || leg === 'LH';

export interface Foothold {
  /** Contact point on the surface (center of the paw pad). */
  point: Vec3;
  /** Heading of the planted leg (same convention as the subject's). */
  heading: number;
}

export interface Step {
  leg: Leg;
  /** Index of the step within the leg (0 = first in the plan). */
  index: number;
  lift: number;
  land: number;
  from: Foothold;
  to: Foothold;
  /** Extra arc height (m) above the base path. */
  clearance: number;
  /**
   * Seconds the leg stays still in the air, above the foothold, before coming down (for example, when
   * the body stops mid-step). 0: a flight in a single stroke.
   */
  hover?: number;
  /**
   * Flight path over stair steps (see `stepPath`): progress and height sampled along the arc, with its
   * normalized cumulative length. When present, it replaces the flat-ground path.
   */
  path?: { along: number[]; height: number[]; arc: number[] };
}

/** Surface the cat walks on: height at (x, z). */
export type Terrain = (x: number, z: number) => number;

/** State of a foot at time t. */
export interface FootSample {
  /** Contact point (paw pad) in the world; in the air, the equivalent point on the path. */
  point: Vec3;
  heading: number;
  /** Paw roll with the heel up (rad): 0 flat; it grows at lift-off and during flight. */
  roll: number;
  /** Flight fraction (0–1), or −1 when planted. */
  swing: number;
  planted: boolean;
}

/** Shape of the paw roll: it peels off rolling, folds during flight and lands flat. */
export interface RollShape {
  /** Seconds before lift-off at which the heel starts to rise. */
  peel: number;
  /** Maximum roll in flight (rad) and the flight fraction at which it is reached. */
  max: number;
  peakAt: number;
  /** Flight fraction at which the paw is flat again. */
  flatAt: number;
}

/** A leg's steps, in order, with its initial foothold. */
export class FootTrack {
  readonly leg: Leg;
  readonly start: Foothold;
  readonly steps: Step[];
  readonly roll: RollShape;

  constructor(leg: Leg, start: Foothold, steps: Step[], roll: RollShape) {
    this.leg = leg;
    this.start = start;
    this.steps = steps;
    this.roll = roll;
  }

  /** Planted at t? */
  planted(t: number): boolean {
    return this.at(t).planted;
  }

  /** Heel peel time before the step: never before the leg has landed. */
  private peelTime(step: Step): number {
    const i = this.steps.indexOf(step);
    const landed = i > 0 ? this.steps[i - 1].land : -Infinity;
    return Math.max(0.02, Math.min(this.roll.peel, 0.7 * (step.lift - landed)));
  }

  at(t: number): FootSample {
    const steps = this.steps;
    // The step in progress, or the last one that already finished.
    let current: Step | null = null;
    for (const step of steps) {
      if (step.lift - this.peelTime(step) > t) break;
      current = step;
    }
    const next = current ? steps[steps.indexOf(current) + 1] : steps[0];
    if (!current) {
      // Before the first step: planted at the start, perhaps peeling the heel for the first one.
      return { point: [...this.start.point], heading: this.start.heading, roll: next ? this.peel(next, t) : 0, swing: -1, planted: true };
    }
    if (t < current.lift) {
      return { point: [...current.from.point], heading: current.from.heading, roll: this.peel(current, t), swing: -1, planted: true };
    }
    if (t < current.land) {
      const u = flightFraction(current, t);
      return { ...swingPoint(current, u), roll: this.flightRoll(current, u), swing: u, planted: false };
    }
    return { point: [...current.to.point], heading: current.to.heading, roll: next ? this.peel(next, t) : 0, swing: -1, planted: true };
  }

  /** Heel rising before the lift-off of `step`, continuous with the flight roll. */
  private peel(step: Step, t: number): number {
    const start = step.lift - this.peelTime(step);
    if (t <= start) return 0;
    return this.rollCurve(step, t - start);
  }

  private flightRoll(step: Step, u: number): number {
    return this.rollCurve(step, this.peelTime(step) + u * (step.land - step.lift - (step.hover ?? 0)));
  }

  /**
   * A single arc from when the paw starts to roll until it is flat again: no segments with zero
   * velocity between lift-off and flight.
   */
  private rollCurve(step: Step, tau: number): number {
    const flight = step.land - step.lift - (step.hover ?? 0);
    const peel = this.peelTime(step);
    const total = peel + this.roll.flatAt * flight;
    const x = Math.min(1, tau / total);
    const peak = (peel + this.roll.peakAt * flight) / total;
    // Bell x^p (1−x)^q with its maximum at `peak`, normalized to 1: zero derivative at both ends.
    const p = 3;
    const q = (p * (1 - peak)) / peak;
    const norm = Math.pow(peak, p) * Math.pow(1 - peak, q);
    return this.roll.max * (Math.pow(x, p) * Math.pow(1 - x, q)) / norm;
  }
}

/** Point in the air where the leg pauses if the flight has a hover. */
export const HOVER_AT = 0.52;

/**
 * Flight fraction (0–1) at t. With a hover, the flight is two rest-to-rest segments: up to `HOVER_AT`
 * (the leg raised, halfway up), the still hover, and the rest of the flight.
 */
export function flightFraction(step: Step, t: number): number {
  const hover = step.hover ?? 0;
  const total = step.land - step.lift;
  if (hover <= 0) return Math.min(1, Math.max(0, (t - step.lift) / total));
  const flight = total - hover;
  const tau = t - step.lift;
  // The leg rises almost at its own pace (if it lags, the body moves away and leaves it out of reach),
  // waits in the air and comes down more slowly: it repositions itself carefully.
  const up = HOVER_AT * flight + 0.12 * hover;
  const down = (1 - HOVER_AT) * flight + 0.35 * hover;
  const hold = total - up - down;
  if (tau < up) return HOVER_AT * minJerk(tau / up);
  if (tau < up + hold) return HOVER_AT;
  return HOVER_AT + (1 - HOVER_AT) * minJerk((tau - up - hold) / down);
}

/** Flight path: minimum-jerk progress, the height rises first, plus an arc on top. */
export function swingPoint(step: Step, u: number): { point: Vec3; heading: number } {
  const a = step.from.point;
  const b = step.to.point;
  if (step.path) {
    // Stair steps: a single arc above the nosings, traveled at minimum-jerk speed with a plateau along
    // the arc (not along the progress): the paw does not suddenly speed up on the steep segments.
    const { along: h, height, arc } = step.path;
    const s = cruiseProfile(u);
    let k = 0;
    while (k < arc.length - 2 && arc[k + 1] < s) k++;
    const w = arc[k + 1] > arc[k] ? (s - arc[k]) / (arc[k + 1] - arc[k]) : 0;
    const along = h[k] + (h[k + 1] - h[k]) * w;
    const y = height[k] + (height[k + 1] - height[k]) * w;
    return { point: [a[0] + (b[0] - a[0]) * along, y, a[2] + (b[2] - a[2]) * along], heading: swingHeading(step, along) };
  }
  const up = Math.min(1, Math.max(0, (b[1] - a[1]) / 0.3));
  const delay = 0.12 * up;
  const along = minJerk((u - delay) / (1 - delay));
  const rise = minJerk(u / (0.72 - 0.22 * up));
  const arc = 16 * u * u * (1 - u) * (1 - u);
  const point: Vec3 = [
    a[0] + (b[0] - a[0]) * along,
    a[1] + (b[1] - a[1]) * rise + step.clearance * arc,
    a[2] + (b[2] - a[2]) * along,
  ];
  return { point, heading: swingHeading(step, along) };
}

function swingHeading(step: Step, along: number): number {
  let dh = step.to.heading - step.from.heading;
  while (dh > Math.PI) dh -= 2 * Math.PI;
  while (dh < -Math.PI) dh += 2 * Math.PI;
  return step.from.heading + dh * along;
}

/**
 * Extra arc height of a flat-ground step so that the paw (±`half` along the heading) passes `margin`
 * above whatever it crosses.
 */
export function clearanceFor(step: Step, terrain: Terrain, minimum: number, half: number, margin: number): number {
  let needed = minimum;
  const probe: Step = { ...step, clearance: 0 };
  for (let i = 1; i < 64; i++) {
    const u = i / 64;
    const arc = 16 * u * u * (1 - u) * (1 - u);
    if (arc < 0.02) continue;
    const { point, heading } = swingPoint(probe, u);
    const fx = Math.cos(heading);
    const fz = -Math.sin(heading);
    let top = -Infinity;
    for (let s = -half; s <= half + 1e-9; s += half / 4) top = Math.max(top, terrain(point[0] + fx * s, point[2] + fz * s));
    // The margin shrinks near lift-off and landing, where the paw is over its own foothold.
    needed = Math.max(needed, (top + margin * Math.min(1, arc / 0.5) - point[1]) / arc);
  }
  return needed;
}

/**
 * Progress profile with a velocity plateau: it accelerates and brakes with minimum jerk (30 % of the time
 * each) and moves at constant speed in between. The peak is 1.43 times the mean, versus 1.875 for pure
 * minimum jerk.
 */
export function cruiseProfile(u: number): number {
  const ramp = 0.3;
  const x = Math.min(1, Math.max(0, u));
  // Integral of the velocity (minimum-jerk ramps: their integral over [0, r] equals r/2).
  const rise = (v: number) => ramp * (v * v * v * v * (2.5 + v * (-3 + v))); // ∫ minJerk
  let area: number;
  if (x < ramp) area = rise(x / ramp);
  else if (x <= 1 - ramp) area = ramp / 2 + (x - ramp);
  else area = 1 - ramp - rise((1 - x) / ramp);
  return area / (1 - ramp);
}

/** Fraction of the progress over which the paw rises to its margin (at the start) and sets down (at the end). */
const PLACE = { lift: 0.12, land: 0.07 };

/**
 * Flight path for climbing stairs: the straight line from foothold to foothold (parallel to the slope)
 * with a minimum arc, raised wherever needed so that the paw (±`half` along the heading) passes `margin`
 * above everything it crosses. It is returned sampled, with the cumulative arc length.
 */
export function stepPath(step: Step, terrain: Terrain, half: number, margin: number, minimum: number, samples = 64): NonNullable<Step['path']> {
  const a = step.from.point;
  const b = step.to.point;
  const heading = step.to.heading;
  const fx = Math.cos(heading);
  const fz = -Math.sin(heading);
  const along: number[] = [];
  const base: number[] = [];
  const floor: number[] = [];
  const bump: number[] = [];
  for (let k = 0; k <= samples; k++) {
    const x = k / samples;
    const px = a[0] + (b[0] - a[0]) * x;
    const pz = a[2] + (b[2] - a[2]) * x;
    let top = -Infinity;
    for (let s = -half; s <= half + 1e-9; s += half / 4) top = Math.max(top, terrain(px + fx * s, pz + fz * s));
    // Plateau: rises over the first 22 % of the progress, holds, and falls over the last 22 %.
    const shape = minJerk(x / 0.22) * minJerk((1 - x) / 0.22);
    bump.push(shape);
    // The margin above what it crosses, on the other hand, holds until very close to the ends: the paw
    // lifts upward and sets down from above, without grazing the tread on arrival or departure.
    floor.push(top + margin * minJerk(x / PLACE.lift) * minJerk((1 - x) / PLACE.land));
    along.push(x);
    base.push(a[1] + (b[1] - a[1]) * x);
  }
  // Floor widened with a bounded slope and smoothed: the paw passes close to the steps (at `margin`),
  // without rising more than needed between nosings, and far from the hip or the shoulder.
  const run = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const step_ = run / samples;
  const cone = floor.map((_, k) => Math.max(...floor.map((y, j) => y - 1.2 * Math.abs(k - j) * step_)));
  let smooth = cone;
  for (let pass = 0; pass < 4; pass++) smooth = smooth.map((y, k) => 0.25 * smooth[Math.max(0, k - 1)] + 0.5 * y + 0.25 * smooth[Math.min(samples, k + 1)]);
  const height = base.map((y, k) => (k === 0 || k === samples ? y : Math.max(y + minimum * bump[k], smooth[k], floor[k])));
  const arc = [0];
  for (let k = 1; k <= samples; k++) arc.push(arc[k - 1] + Math.hypot(run / samples, height[k] - height[k - 1]));
  const total = arc[samples];
  return { along, height, arc: arc.map((s) => s / total) };
}

/** Deterministic variation in [−1, 1] per leg, step and purpose. */
export function jitter(seed: number, leg: Leg, index: number, purpose: number): number {
  const legCode = LEGS.indexOf(leg) + 1;
  return 2 * hash2(seed * 17.13 + legCode * 3.71 + purpose * 0.917, index * 1.618 + purpose * 7.3 + legCode) - 1;
}

/**
 * Times at which the gait phase crosses `offset` + n (n an integer), between t0 and t1: a leg's
 * landings. `phase` is the cumulative phase (cycles), non-decreasing.
 */
export function phaseCrossings(phase: SampledCurve, offset: number, fromPhase: number, toPhase: number): number[] {
  const out: number[] = [];
  let n = Math.ceil(fromPhase - offset);
  while (n + offset <= toPhase) {
    const target = n + offset;
    if (target > fromPhase) {
      const t = firstTimeAt(phase, target);
      if (Number.isFinite(t)) out.push(t);
    }
    n++;
  }
  return out;
}

/** How many legs are planted at t. */
export function plantedCount(tracks: Iterable<FootTrack>, t: number): number {
  let n = 0;
  for (const track of tracks) if (track.at(t).planted) n++;
  return n;
}

/** Coefficient of variation (standard deviation / mean). */
export function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}
