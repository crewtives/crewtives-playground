import { describe, expect, it } from 'vitest';
import {
  DOWNSTROKE_FRACTION,
  FALCON_DURATION,
  GOLDEN_ANGLE_DEG,
  MAST,
  PHI,
  TIMES,
  TOWER,
  beats,
  droneCamera,
  falconCenter,
  falconPose,
  falconReadout,
  goldenRectangles,
  perch,
  phaseAt,
  quarterTurnRatio,
  speed,
  spiralAngle,
  spiralRadius,
  spiralRadiusAt,
  strokeAngle,
  vec3,
  wingSkeleton,
  wingbeatPhase,
  wingspan,
  type Vec3,
} from './falconPhi';

const { sub, length, dot, add, scale } = vec3;

/** Samples every `step` seconds in [t0, t1]. */
function times(t0: number, t1: number, step: number): number[] {
  const out: number[] = [];
  for (let t = t0; t <= t1 + 1e-9; t += step) out.push(t);
  return out;
}

describe('golden spiral', () => {
  it('φ and the golden angle', () => {
    expect(PHI).toBeCloseTo(1.6180339887, 9);
    expect(GOLDEN_ANGLE_DEG).toBeCloseTo(137.5077640500378, 9);
  });

  it('the spiral tightens by a factor φ per quarter turn', () => {
    for (const theta of [0, 0.7, 2, 4.5]) expect(spiralRadiusAt(theta) / spiralRadiusAt(theta + Math.PI / 2)).toBeCloseTo(PHI, 10);
  });

  it('in the spiral segment, the radius a quarter turn earlier is φ ± 3 % of the current one', () => {
    const checked: number[] = [];
    for (const t of times(0, TIMES.spiralEnd, 1 / 30)) {
      const ratio = quarterTurnRatio(t);
      if (ratio === null) continue;
      checked.push(ratio);
      expect(Math.abs(ratio / PHI - 1)).toBeLessThan(0.03);
    }
    // There are complete quarter turns during most of the segment.
    expect(checked.length).toBeGreaterThan(100);
  });

  it('the angle grows and the radius shrinks while the spiral lasts', () => {
    let angle = -1;
    let radius = Infinity;
    for (const t of times(0, TIMES.spiralEnd, 0.05)) {
      expect(spiralAngle(t)).toBeGreaterThan(angle);
      expect(spiralRadius(t)).toBeLessThan(radius);
      angle = spiralAngle(t);
      radius = spiralRadius(t);
    }
    // More than one full turn around the axis.
    expect(spiralAngle(TIMES.spiralEnd)).toBeGreaterThan(2 * Math.PI);
  });

  it('the falcon never touches the tower or the mast and always flies above the square', () => {
    for (const t of times(0, FALCON_DURATION, 1 / 60)) {
      const c = falconCenter(t);
      const r = Math.hypot(c[0], c[2]);
      expect(r).toBeGreaterThan(MAST.radius + 0.4);
      if (r < TOWER.radius + 0.6) expect(c[1]).toBeGreaterThan(TOWER.height + 0.5);
      expect(c[1]).toBeGreaterThan(TOWER.height);
    }
  });

  it('the nested golden rectangles shrink by φ per level around the same eye', () => {
    const rects = goldenRectangles(5);
    const side = (k: number) => Math.hypot(rects[k].rect[1][0] - rects[k].rect[0][0], rects[k].rect[1][1] - rects[k].rect[0][1]);
    for (let k = 0; k < 4; k++) expect(side(k) / side(k + 1)).toBeCloseTo(PHI, 6);
  });
});

describe('script and path', () => {
  it('the phases come in order', () => {
    const order = ['flap', 'glide', 'stoop', 'pull-out', 'landing', 'perched'];
    let last = 0;
    for (const t of times(0, FALCON_DURATION, 0.05)) {
      const index = order.indexOf(phaseAt(t));
      expect(index).toBeGreaterThanOrEqual(last);
      last = index;
    }
    expect(last).toBe(order.length - 1);
  });

  it('the path is continuous (no jumps at 120 samples per second) and stops at the bar', () => {
    let previous = falconCenter(0);
    for (const t of times(1 / 120, FALCON_DURATION, 1 / 120)) {
      const c = falconCenter(t);
      // Never faster than the stoop (≈ 12.6 m/s): 12.6/120 ≈ 0.105 m per sample.
      expect(length(sub(c, previous))).toBeLessThan(0.11);
      previous = c;
    }
    expect(speed(TIMES.touch + 0.1)).toBe(0);
    expect(length(sub(falconCenter(TIMES.touch), perch().body))).toBeLessThan(1e-6);
  });

  it('the stoop accelerates and the pull-out brakes until perching', () => {
    expect(speed(7.5)).toBeGreaterThan(speed(5.3) + 3);
    expect(speed(10.9)).toBeLessThan(3);
  });

  it('the body and the head turn without flips or jumps (at 120 samples per second)', () => {
    // Angle between two frames: the larger of the rotations of their forward and up axes.
    const turn = (a: { forward: Vec3; up: Vec3 }, b: { forward: Vec3; up: Vec3 }) =>
      Math.max(Math.acos(Math.min(1, dot(a.forward, b.forward))), Math.acos(Math.min(1, dot(a.up, b.up))));
    let previous = falconPose(0);
    let lastBody = 0;
    let lastHead = 0;
    for (const t of times(1 / 120, FALCON_DURATION, 1 / 120)) {
      const pose = falconPose(t);
      const body = turn(previous.body, pose.body);
      const head = turn(previous.head.frame, pose.head.frame);
      // The fastest turn (coming out of the 80° bank at the end of the stoop) is about 14 rad/s; the
      // head's saccades, 20 rad/s. A 90° flip in one sample (what happened where the segments joined)
      // is 1.57 rad.
      expect(body).toBeLessThan(0.14);
      expect(head).toBeLessThan(0.2);
      // No single-sample spikes: the angular velocity changes little between neighboring samples.
      expect(Math.abs(body - lastBody)).toBeLessThan(0.03);
      expect(Math.abs(head - lastHead)).toBeLessThan(0.06);
      lastBody = body;
      lastHead = head;
      previous = pose;
    }
  });

  it('the pose is a pure function of time', () => {
    const a = JSON.stringify(falconPose(4.321));
    falconPose(9.1);
    expect(JSON.stringify(falconPose(4.321))).toBe(a);
  });
});

describe('flapping', () => {
  const flight = beats().filter((b) => b.burst === 'flight');
  const brake = beats().filter((b) => b.burst === 'brake');
  const stats = (list: { duration: number }[]) => {
    const d = list.map((b) => b.duration);
    const mean = d.reduce((a, b) => a + b, 0) / d.length;
    const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / (d.length - 1));
    return { mean, cv: sd / mean };
  };

  it('flaps at 4–5 Hz and braking is slower', () => {
    const f = 1 / stats(flight).mean;
    expect(f).toBeGreaterThan(4);
    expect(f).toBeLessThan(5);
    expect(1 / stats(brake).mean).toBeLessThan(f);
  });

  it('the wingbeat duration varies with the seed (CV between 3 % and 15 %)', () => {
    for (const list of [flight, brake]) {
      const { cv } = stats(list);
      expect(cv).toBeGreaterThan(0.03);
      expect(cv).toBeLessThan(0.15);
    }
    expect(beats(2).map((b) => b.duration)).not.toEqual(beats(1).map((b) => b.duration));
  });

  it('the downstroke is faster than the upstroke (40/60) and the phase is continuous', () => {
    expect(DOWNSTROKE_FRACTION).toBeCloseTo(0.4, 6);
    expect(strokeAngle(0)).toBeCloseTo(0, 9);
    expect(strokeAngle(DOWNSTROKE_FRACTION)).toBeCloseTo(Math.PI, 9);
    // Measured on the wing: from maximum to minimum elevation in a steady burst.
    const beat = flight[5];
    let top = { elev: -Infinity, t: 0 };
    let bottom = { elev: Infinity, t: 0 };
    for (const t of times(beat.start, beat.start + beat.duration - 1e-4, beat.duration / 400)) {
      const elev = falconPose(t).wings.right.elev;
      if (elev > top.elev) top = { elev, t };
      if (elev < bottom.elev) bottom = { elev, t };
    }
    const down = (bottom.t - top.t) / beat.duration;
    expect(down).toBeGreaterThan(0.35);
    expect(down).toBeLessThan(0.45);
    // Monotonic: the phase never goes backward.
    let previous = -1;
    for (const p of times(0, 0.999, 0.001)) {
      expect(strokeAngle(p)).toBeGreaterThan(previous);
      previous = strokeAngle(p);
    }
  });

  it('the wingtip traces a figure 8 (side view, relative to the body)', () => {
    const beat = flight[6];
    const path: [number, number][] = [];
    for (const t of times(beat.start, beat.start + beat.duration, beat.duration / 240)) {
      const tip = wingSkeleton(falconPose(t).wings.right, 1).primaries[4].tip;
      path.push([tip[0], tip[1]]);
    }
    expect(selfIntersections(path)).toBeGreaterThanOrEqual(1);
  });

  it('on the upstroke the wing folds at the wrist', () => {
    const beat = flight[5];
    const fold = (p: number) => falconPose(beat.start + p * beat.duration).wings.right.fold;
    expect(fold(0.2)).toBeLessThan(0.05);
    expect(fold(0.75)).toBeGreaterThan(0.3);
  });

  it('the wingbeat phase exists only while flapping', () => {
    expect(wingbeatPhase(1.2)).not.toBeNull();
    expect(wingbeatPhase(4.2)).toBeNull();
    expect(wingbeatPhase(6.5)).toBeNull();
    expect(wingbeatPhase(10.2)).not.toBeNull();
    expect(wingbeatPhase(13)).toBeNull();
  });
});

describe('flight shape', () => {
  it('in the stoop the wingspan is under 45 % of the flight wingspan (teardrop wings)', () => {
    const flying = Math.max(...times(0, 1, 1 / 120).map((t) => wingspan(t)));
    const stoop = Math.max(...times(TIMES.tuckEnd, TIMES.spiralEnd - 0.2, 1 / 120).map((t) => wingspan(t)));
    expect(flying).toBeGreaterThan(0.9);
    expect(flying).toBeLessThan(1.15);
    expect(stoop / flying).toBeLessThan(0.45);
  });

  it('the head stays stabilized: the body rises and falls with each wingbeat and the head does not', () => {
    // High-frequency component: the deviation from the moving average over one cycle.
    const wobble = (sample: (t: number) => Vec3) => {
      let worst = 0;
      for (const t of times(0.6, 2.4, 1 / 240)) {
        let mean: Vec3 = [0, 0, 0];
        // Symmetric one-cycle window (0.222 s) centered on t.
        const n = 25;
        for (let i = 0; i < n; i++) mean = add(mean, scale(sample(t - 0.111 + (0.222 * i) / (n - 1)), 1 / n));
        worst = Math.max(worst, Math.abs(sample(t)[1] - mean[1]));
      }
      return worst;
    };
    const body = wobble((t) => falconPose(t).position);
    const head = wobble((t) => falconPose(t).head.position);
    expect(body).toBeGreaterThan(0.006);
    expect(head).toBeLessThan(body * 0.25);
  });

  it('while gliding it banks into the turn and the head stays more level than the body', () => {
    for (const t of [3.8, 4.2, 4.8]) {
      const pose = falconPose(t);
      const c = pose.position;
      const inward: Vec3 = [-c[0], 0, -c[2]];
      // The back points toward the axis (lift toward the center of the turn).
      expect(dot(pose.body.up, inward) / length(inward)).toBeGreaterThan(0.25);
      // Bank: how far the lateral axis tilts off the horizon.
      const bank = Math.asin(Math.abs(pose.body.right[1]));
      const headBank = Math.asin(Math.abs(pose.head.frame.right[1]));
      expect(bank).toBeGreaterThan(0.35);
      expect(headBank).toBeLessThan(bank * 0.35);
    }
  });

  it('perches with its feet on the bar and the tail free', () => {
    const pose = falconPose(13);
    const p = perch();
    expect(pose.legs.feet).not.toBeNull();
    for (const foot of pose.legs.feet!) {
      // The foothold is on top of the bar (one bar radius above its axis) and within its length.
      const fromMast = Math.hypot(foot[0], foot[2]);
      expect(fromMast).toBeLessThan(p.barLength);
      expect(foot[1] - p.bar[1]).toBeCloseTo(p.barRadius, 6);
    }
    expect(pose.legs.grip).toBeCloseTo(1, 6);
    // The body sits above the feet, not behind the bar.
    expect(pose.position[1]).toBeGreaterThan(p.bar[1] + 0.07);
  });
});

describe('drone camera', () => {
  it('the final portrait is a three-quarter view (head-on, in silhouette, the falcon reads as an owl)', () => {
    const p = perch();
    const camera = droneCamera(FALCON_DURATION);
    const toCamera = sub(camera.position, p.body);
    const flat = Math.hypot(toCamera[0], toCamera[2]);
    const fromHeading = Math.acos((toCamera[0] * p.heading[0] + toCamera[2] * p.heading[2]) / flat);
    expect(fromHeading).toBeGreaterThan((35 * Math.PI) / 180);
    expect(fromHeading).toBeLessThan((65 * Math.PI) / 180);
    // Close: the portrait fills the frame.
    expect(length(toCamera)).toBeLessThan(1.6);
  });
});

describe('readouts for the page', () => {
  it('gather the whole "NOW" with finite values', () => {
    for (const t of times(0, FALCON_DURATION, 0.5)) {
      const r = falconReadout(t);
      for (const value of [r.angle, r.radius, r.wingspan, r.altitude, r.speed]) expect(Number.isFinite(value)).toBe(true);
      if (r.quarterRatio !== null) expect(Number.isFinite(r.quarterRatio)).toBe(true);
    }
    expect(falconReadout(5).quarterRatio).toBeCloseTo(PHI, 6);
    expect(falconReadout(0).quarterRatio).toBeNull();
  });
});

/** Number of crossings between non-adjacent segments of a closed polyline. */
function selfIntersections(points: [number, number][]): number {
  let count = 0;
  const n = points.length - 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(points[i], points[i + 1], points[j], points[j + 1])) count++;
    }
  }
  return count;
}

function segmentsCross(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): boolean {
  const orient = (p: [number, number], q: [number, number], r: [number, number]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return orient(a, b, c) !== orient(a, b, d) && orient(c, d, a) !== orient(c, d, b);
}
