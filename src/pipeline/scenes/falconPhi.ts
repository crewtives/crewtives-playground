import { gaussian, stream } from './random';

// Math of the "falcon-phi" scene (D7, D8): path, script and kinematics of a peregrine falcon computed
// from equations. Both the bake recipe and page D use it, so every readout of the "NOW" comes from
// here. Pure TypeScript: no DOM and no three.js. Everything is a function of the time t (s).
//
// The path is a conical golden logarithmic spiral around the mast of a tower: in plan,
// r(θ) = r0·φ^(−2θ/π), which tightens by a factor φ per quarter turn; in height, a funnel
// y(r) = yApex + D·(r/r0)^k. Tucker (2000, J. Exp. Biol. 203:3745) showed that falcons attack along
// logarithmic spirals; here the curve was fixed to the golden one, which is one of them.

export type Vec3 = [number, number, number];

export const PHI = (1 + Math.sqrt(5)) / 2;
/** Golden angle: 2π/φ² rad ≈ 137.507°. */
export const GOLDEN_ANGLE = (2 * Math.PI) / (PHI * PHI);
export const GOLDEN_ANGLE_DEG = 360 / (PHI * PHI);

export const FALCON_FPS = 30;
export const FALCON_DURATION = 15;
export const FALCON_SEED = 1;

/** Spiral growth: r = r0·e^(−bθ), with e^(b·π/2) = φ. */
export const SPIRAL_B = Math.log(PHI) / (Math.PI / 2);

const G = 9.81;
const DEG = Math.PI / 180;

// --- script -------------------------------------------------------------------------------------

/** Instants of the script (s). The spiral segment runs from 0 to `spiralEnd`. */
export const TIMES = {
  flapEnd: 3.0,
  glideEnd: 5.2,
  tuckEnd: 5.7,
  spiralEnd: 7.6,
  pullEnd: 9.0,
  touch: 11.2,
  settleEnd: 12.4,
  lookAtCamera: 13.2,
  duration: FALCON_DURATION,
} as const;

export type FalconPhase = 'flap' | 'glide' | 'stoop' | 'pull-out' | 'landing' | 'perched';

/** Phase names for the interface. */
export const PHASE_LABELS: Record<FalconPhase, string> = {
  flap: 'Flapping',
  glide: 'Banked glide',
  stoop: 'Stoop',
  'pull-out': 'Pull-out',
  landing: 'Landing',
  perched: 'Perched',
};

export function phaseAt(t: number): FalconPhase {
  if (t < TIMES.flapEnd) return 'flap';
  if (t < TIMES.glideEnd) return 'glide';
  if (t < TIMES.spiralEnd) return 'stoop';
  if (t < TIMES.pullEnd) return 'pull-out';
  if (t < TIMES.touch) return 'landing';
  return 'perched';
}

// --- fixed set -----------------------------------------------------------------------------------

/** Central tower (octagonal): the spiral's axis goes through its center, at x = z = 0. */
export const TOWER = { radius: 2.6, height: 12 } as const;
/** Antenna mast on top of the tower. */
export const MAST = { radius: 0.12, bottom: TOWER.height, top: 24.5 } as const;

/** Spiral and funnel: radius and height on entry, and an inner point that fixes the funnel's shape. */
export const SPIRAL = {
  r0: 18.5,
  y0: 30,
  rRef: 2.1,
  yRef: 15.6,
  k: 0.3,
  /** Rotation of the golden diagram in plan (rad). */
  rotation: -0.35,
} as const;

const FUNNEL_D = (SPIRAL.y0 - SPIRAL.yRef) / (1 - Math.pow(SPIRAL.rRef / SPIRAL.r0, SPIRAL.k));
const FUNNEL_APEX = SPIRAL.y0 - FUNNEL_D;

/** Height of the spiral's funnel at a distance r from the axis. */
export function funnelY(r: number): number {
  return FUNNEL_APEX + FUNNEL_D * Math.pow(Math.max(r, 1e-6) / SPIRAL.r0, SPIRAL.k);
}

// --- golden diagram (in plan) ----------------------------------------------------------------------
//
// Unit golden rectangle [0, φ] × [0, 1]. Removing its left square leaves another golden rectangle
// rotated 90°: the similarity M(p) = E + R(−90°)(p − E)/φ maps each rectangle to the next, and its
// fixed point E ("the eye") is the pole of the spiral. The spiral passes through A = (0, 0) and
// through the opposite corners of each square: A, M(A), M²(A)…

const EYE_Y = 1 / (PHI * PHI + 1);
const EYE_X = 1 + EYE_Y / PHI;
const RHO_A = Math.hypot(EYE_X, EYE_Y);
const ALPHA_A = Math.atan2(-EYE_Y, -EYE_X);
/** Meters per diagram unit. */
export const DIAGRAM_SCALE = SPIRAL.r0 / RHO_A;

/** Diagram (units) → world plan (x, z), with the eye on the axis. */
function diagramToWorld(x: number, y: number): [number, number] {
  const dx = (x - EYE_X) * DIAGRAM_SCALE;
  const dy = (y - EYE_Y) * DIAGRAM_SCALE;
  const c = Math.cos(SPIRAL.rotation);
  const s = Math.sin(SPIRAL.rotation);
  return [c * dx - s * dy, s * dx + c * dy];
}

/** Spiral radius for an accumulated angle θ (rad). */
export function spiralRadiusAt(theta: number): number {
  return SPIRAL.r0 * Math.exp(-SPIRAL_B * theta);
}

/** Point of the spiral in plan (x, z) for an accumulated angle θ. */
export function spiralXZ(theta: number): [number, number] {
  const rho = RHO_A * Math.exp(-SPIRAL_B * theta);
  const a = ALPHA_A - theta;
  return diagramToWorld(EYE_X + rho * Math.cos(a), EYE_Y + rho * Math.sin(a));
}

/** 3D point of the conical spiral. */
export function spiralPoint(theta: number): Vec3 {
  const [x, z] = spiralXZ(theta);
  return [x, funnelY(spiralRadiusAt(theta)), z];
}

export interface GoldenSquare {
  /** Corners of golden rectangle k, in plan (x, z). */
  rect: [number, number][];
  /** Segment that separates square k from rectangle k + 1. */
  cut: [[number, number], [number, number]];
}

/** Nested golden rectangles (world plan), from largest to smallest. */
export function goldenRectangles(levels: number): GoldenSquare[] {
  const mapPoint = (p: [number, number]): [number, number] => {
    // M(p) = E + R(−90°)(p − E)/φ
    const dx = p[0] - EYE_X;
    const dy = p[1] - EYE_Y;
    return [EYE_X + dy / PHI, EYE_Y - dx / PHI];
  };
  let rect: [number, number][] = [
    [0, 0],
    [PHI, 0],
    [PHI, 1],
    [0, 1],
  ];
  let cut: [[number, number], [number, number]] = [
    [1, 0],
    [1, 1],
  ];
  const out: GoldenSquare[] = [];
  for (let k = 0; k < levels; k++) {
    out.push({ rect: rect.map((p) => diagramToWorld(p[0], p[1])), cut: [diagramToWorld(...cut[0]), diagramToWorld(...cut[1])] });
    rect = rect.map(mapPoint);
    cut = [mapPoint(cut[0]), mapPoint(cut[1])];
  }
  return out;
}

/** Seed k of Vogel's phyllotaxis disk: r = c·√k, angle k·137.507°. */
export function phyllotaxis(k: number, c: number): [number, number] {
  const r = c * Math.sqrt(k);
  const a = k * GOLDEN_ANGLE;
  return [r * Math.cos(a), r * Math.sin(a)];
}

// --- numeric utilities ---------------------------------------------------------------------------

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return l > 1e-12 ? scale(a, 1 / l) : [0, 0, 0];
};
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const UP: Vec3 = [0, 1, 0];

export const vec3 = { add, sub, scale, dot, cross, length, normalize, lerp: lerp3 };

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Rotation of v around the unit axis `axis` (Rodrigues). */
function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
}

/** Monotone cubic interpolation (Fritsch–Carlson) with optional slopes at the ends. */
function monotoneCubic(xs: number[], ys: number[], slope0?: number, slopeN?: number): (x: number) => number {
  const n = xs.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = new Array(n).fill(0);
  m[0] = slope0 ?? d[0];
  m[n - 1] = slopeN ?? d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/**
 * Keys [t, v0, v1, …] interpolated with cubic Hermite and Catmull-Rom slopes (C1). Repeated keys or
 * keys with zero slope give still segments.
 */
function keyed(keys: number[][], t: number): number[] {
  const n = keys.length;
  const width = keys[0].length - 1;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const [t0, t1] = [keys[i][0], keys[i + 1][0]];
  const h = t1 - t0;
  const u = (t - t0) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  const out: number[] = [];
  for (let c = 1; c <= width; c++) {
    const slope = (j: number) => {
      if (j <= 0 || j >= n - 1) return 0;
      const s = (keys[j + 1][c] - keys[j - 1][c]) / (keys[j + 1][0] - keys[j - 1][0]);
      // No overshoot: zero slope at local extrema.
      const a = keys[j][c] - keys[j - 1][c];
      const b = keys[j + 1][c] - keys[j][c];
      return a * b <= 0 ? 0 : s;
    };
    const m0 = slope(i) * h;
    const m1 = slope(i + 1) * h;
    out.push((2 * u3 - 3 * u2 + 1) * keys[i][c] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * keys[i + 1][c] + (u3 - u2) * m1);
  }
  return out;
}

/** Uniform table y(x) with inverse lookup (x increasing, y monotonically increasing). */
interface Table {
  x0: number;
  dx: number;
  y: Float64Array;
}

function tableAt(table: Table, x: number): number {
  const f = clamp((x - table.x0) / table.dx, 0, table.y.length - 1);
  const i = Math.min(table.y.length - 2, Math.floor(f));
  return table.y[i] + (table.y[i + 1] - table.y[i]) * (f - i);
}

function tableInverse(table: Table, y: number): number {
  const ys = table.y;
  if (y <= ys[0]) return table.x0;
  if (y >= ys[ys.length - 1]) return table.x0 + table.dx * (ys.length - 1);
  let lo = 0;
  let hi = ys.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ys[mid] < y) lo = mid;
    else hi = mid;
  }
  return table.x0 + table.dx * (lo + (y - ys[lo]) / (ys[hi] - ys[lo]));
}

// --- spiral segment --------------------------------------------------------------------------------

/** Speed along the spiral (m/s): flapping, gliding and a stoop that accelerates; zero slope at the end. */
const SPIRAL_SPEED = monotoneCubic([0, 3.0, 5.2, 6.4, TIMES.spiralEnd], [6.2, 6.6, 7.0, 9.8, 12.2], 0.12, 0);

let spiralTables: { arc: Table; travel: Table } | null = null;

function spiralTablesGet(): { arc: Table; travel: Table } {
  if (spiralTables) return spiralTables;
  // Arc length s(θ) of the conical spiral, from a fine polyline.
  const dTheta = 0.0005;
  const count = Math.ceil((5 * Math.PI) / dTheta) + 1;
  const arc = new Float64Array(count);
  let previous = spiralPoint(0);
  for (let i = 1; i < count; i++) {
    const p = spiralPoint(i * dTheta);
    arc[i] = arc[i - 1] + length(sub(p, previous));
    previous = p;
  }
  // Distance traveled s(t) = ∫ v dt (trapezoids at 1/2400 s).
  const dt = 1 / 2400;
  const steps = Math.ceil(TIMES.spiralEnd / dt) + 1;
  const travel = new Float64Array(steps);
  for (let i = 1; i < steps; i++) travel[i] = travel[i - 1] + 0.5 * (SPIRAL_SPEED((i - 1) * dt) + SPIRAL_SPEED(i * dt)) * dt;
  spiralTables = { arc: { x0: 0, dx: dTheta, y: arc }, travel: { x0: 0, dx: dt, y: travel } };
  return spiralTables;
}

/** Accumulated spiral angle θ at instant t of the spiral segment. */
function spiralThetaAt(t: number): number {
  const tables = spiralTablesGet();
  return tableInverse(tables.arc, tableAt(tables.travel, clamp(t, 0, TIMES.spiralEnd)));
}

// --- pull-out from the stoop and perching -------------------------------------------------------------

/**
 * Speed during the pull-out (m/s): it continues the stoop's speed, the climb ("throw-up") spends it
 * until the wingover at the top, it drops toward the bar, and braking cancels it on perching.
 */
const PULL_SPEED = monotoneCubic(
  [TIMES.spiralEnd, 8.15, 8.7, 9.25, 9.85, 10.5, 10.95, TIMES.touch],
  [12.2, 9.4, 4.6, 5.6, 6.2, 4.3, 2.1, 0],
  0,
  -4,
);

export interface Perch {
  /** Center of the bar at the perching point. */
  bar: Vec3;
  /** Direction of the bar (horizontal, radial from the mast). */
  barDirection: Vec3;
  /** Heading of the perched falcon (horizontal, perpendicular to the bar). */
  heading: Vec3;
  /** Bar radius (m). */
  barRadius: number;
  /** Bar length from the mast's axis (m). */
  barLength: number;
  /** Body center of the perched falcon, without the settling. */
  body: Vec3;
}

interface LandingCurve {
  points: Vec3[];
  tangents: Vec3[];
  arc: Table;
  travel: Table;
  length: number;
}

let landing: { curve: LandingCurve; perch: Perch; frame: { out: Vec3; around: Vec3 } } | null = null;

/** Height of the perching point on the bar and distance from the perching point to the mast's axis. */
const PERCH_Y = 14.6;
const PERCH_R = 0.85;
/** Center of the perched body relative to the perching point: above and a little behind. */
const PERCH_BODY_UP = 0.118;
const PERCH_BODY_BACK = 0.012;

function hermite(p0: Vec3, m0: Vec3, p1: Vec3, m1: Vec3, u: number): Vec3 {
  const u2 = u * u;
  const u3 = u2 * u;
  return add(add(scale(p0, 2 * u3 - 3 * u2 + 1), scale(m0, u3 - 2 * u2 + u)), add(scale(p1, -2 * u3 + 3 * u2), scale(m1, u3 - u2)));
}

function curvePoint(curve: Pick<LandingCurve, 'points' | 'tangents'>, u: number): Vec3 {
  const n = curve.points.length - 1;
  const i = Math.min(n - 1, Math.max(0, Math.floor(u)));
  return hermite(curve.points[i], curve.tangents[i], curve.points[i + 1], curve.tangents[i + 1], u - i);
}

/**
 * Pull-out curve for a horizontal size λ: it leaves the stoop along the tangent, climbs beside the
 * mast, does a wingover at the top (a half turn at low speed), drops below the bar and climbs up to it
 * to brake. The bar is radial and the falcon perches crosswise on it.
 */
function buildLanding(lambda: number): { curve: LandingCurve; perch: Perch; frame: { out: Vec3; around: Vec3 } } {
  const t1 = TIMES.spiralEnd;
  const theta1 = spiralThetaAt(t1);
  const p1 = spiralPoint(theta1);
  const tangent = normalize(sub(spiralPoint(theta1 + 1e-4), p1));
  const out = normalize([p1[0], 0, p1[2]]);
  // Tangent of the circle in the spiral's direction of rotation.
  let around = normalize(cross(UP, out));
  if (dot(around, tangent) < 0) around = scale(around, -1);
  // The bar sticks out of the mast on the side opposite the end of the spiral: the loop is a "U" that
  // encloses the mast and the falcon comes straight back along the other branch.
  const heading = scale(around, -1);
  const barDirection = scale(out, -1);
  const bar: Vec3 = [barDirection[0] * PERCH_R, PERCH_Y, barDirection[2] * PERCH_R];
  const body = add(add(bar, [0, PERCH_BODY_UP, 0]), scale(heading, -PERCH_BODY_BACK));
  const at = (a: number, o: number, y: number): Vec3 => add(p1, add(add(scale(around, a * lambda), scale(out, o * lambda)), [0, y, 0]));
  const radius = Math.hypot(p1[0], p1[2]);
  // Outbound branch: leaves the stoop along the tangent and climbs; wingover at the top, turning inward.
  const w1 = at(2.2, -0.05, -1.25);
  const w2 = at(3.9, 0.1, 1.3);
  const w3 = add(at(4.6, 0, 4.0), scale(out, -(radius + PERCH_R) * 0.45));
  // Return branch: straight toward the bar, dropping below it so it climbs up to perch.
  const approach = add(body, add(scale(heading, -1.9), [0, -0.5, 0]));
  const w4 = add(approach, add(scale(heading, -2.6 * lambda), [0, 1.9, 0]));
  const points = [p1, w1, w2, w3, w4, approach, body];
  const tangents: Vec3[] = points.map((_, i) => {
    if (i === 0) return scale(tangent, length(sub(w1, p1)) * 1.1);
    if (i === points.length - 1) return scale(normalize(add(heading, [0, 0.2, 0])), length(sub(body, approach)) * 1.0);
    return scale(sub(points[i + 1], points[i - 1]), 0.5);
  });
  const samples = 4000;
  const arc = new Float64Array(samples + 1);
  let previous = points[0];
  const n = points.length - 1;
  for (let i = 1; i <= samples; i++) {
    const p = curvePoint({ points, tangents }, (i / samples) * n);
    arc[i] = arc[i - 1] + length(sub(p, previous));
    previous = p;
  }
  const dt = 1 / 2400;
  const steps = Math.ceil((TIMES.touch - t1) / dt) + 1;
  const travel = new Float64Array(steps);
  for (let i = 1; i < steps; i++) travel[i] = travel[i - 1] + 0.5 * (PULL_SPEED(t1 + (i - 1) * dt) + PULL_SPEED(t1 + i * dt)) * dt;
  const curve: LandingCurve = {
    points,
    tangents,
    arc: { x0: 0, dx: n / samples, y: arc },
    travel: { x0: t1, dx: dt, y: travel },
    length: arc[samples],
  };
  return { curve, perch: { bar, barDirection, heading, barRadius: 0.018, barLength: 1.35, body }, frame: { out, around } };
}

function landingGet(): { curve: LandingCurve; perch: Perch; frame: { out: Vec3; around: Vec3 } } {
  if (landing) return landing;
  // Loop size such that the curve's length matches ∫ v dt: bisection on λ.
  let lo = 0.2;
  let hi = 3;
  let built = buildLanding(1);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    built = buildLanding(mid);
    const need = built.curve.travel.y[built.curve.travel.y.length - 1];
    if (built.curve.length < need) lo = mid;
    else hi = mid;
  }
  landing = built;
  return landing;
}

/** The antenna bar where the falcon perches. */
export function perch(): Perch {
  return landingGet().perch;
}

// --- path of the center ------------------------------------------------------------------------------

/**
 * Center of the falcon's body at instant t, without the perching settle or the flapping oscillation:
 * the spiral until `spiralEnd`, the pull-out curve until `touch`, and the bar afterward.
 */
export function falconCenter(t: number): Vec3 {
  if (t < 0) {
    // Before the clip: follow the entry tangent (the attitude averages look a few ms back in time).
    const p0 = spiralPoint(0);
    const direction = normalize(sub(spiralPoint(1e-4), p0));
    return add(p0, scale(direction, SPIRAL_SPEED(0) * t));
  }
  if (t <= TIMES.spiralEnd) return spiralPoint(spiralThetaAt(t));
  const { curve, perch: p } = landingGet();
  if (t >= TIMES.touch) return p.body;
  const s = tableAt(curve.travel, t);
  const u = tableInverse(curve.arc, Math.min(s, curve.length));
  return curvePoint(curve, u);
}

/** Velocity of the center (m/s), from central differences. */
export function falconVelocity(t: number): Vec3 {
  const h = 1 / 480;
  return scale(sub(falconCenter(t + h), falconCenter(t - h)), 1 / (2 * h));
}

function falconAcceleration(t: number): Vec3 {
  const h = 1 / 120;
  return scale(add(sub(falconCenter(t + h), scale(falconCenter(t), 2)), falconCenter(t - h)), 1 / (h * h));
}

const FORCE_DT = 1 / 240;
/** Standard deviation of the Gaussian that smooths the flight force (s). */
const FORCE_SIGMA = 0.09;
let forceTable: [Float64Array, Float64Array, Float64Array] | null = null;

/**
 * Specific flight force a + g, smoothed with a centered Gaussian (σ = 0.09 s) and stored in a table.
 * The path's curvature jumps where the segments join (end of the spiral: 12 m/s on a 2.3 m radius) and
 * the second derivative by finite differences carries the noise of the arc tables; without smoothing,
 * the bank derived from this force flipped by 90° in 1/120 s.
 */
function smoothForce(t: number): Vec3 {
  if (!forceTable) {
    const pad = 4 * FORCE_SIGMA;
    const count = Math.ceil((FALCON_DURATION + 2 * pad) / FORCE_DT) + 1;
    const raw = [new Float64Array(count), new Float64Array(count), new Float64Array(count)];
    for (let i = 0; i < count; i++) {
      const a = falconAcceleration(-pad + i * FORCE_DT);
      for (let c = 0; c < 3; c++) raw[c][i] = a[c] + (c === 1 ? G : 0);
    }
    const radius = Math.ceil((3 * FORCE_SIGMA) / FORCE_DT);
    const weights = Array.from({ length: 2 * radius + 1 }, (_, k) => Math.exp(-0.5 * (((k - radius) * FORCE_DT) / FORCE_SIGMA) ** 2));
    const smooth = [new Float64Array(count), new Float64Array(count), new Float64Array(count)] as [Float64Array, Float64Array, Float64Array];
    for (let i = 0; i < count; i++) {
      let total = 0;
      const sum = [0, 0, 0];
      for (let k = -radius; k <= radius; k++) {
        const j = Math.min(count - 1, Math.max(0, i + k));
        const w = weights[k + radius];
        total += w;
        for (let c = 0; c < 3; c++) sum[c] += raw[c][j] * w;
      }
      for (let c = 0; c < 3; c++) smooth[c][i] = sum[c] / total;
    }
    forceTable = smooth;
  }
  const pad = 4 * FORCE_SIGMA;
  const table = forceTable;
  return [0, 1, 2].map((c) => tableAt({ x0: -pad, dx: FORCE_DT, y: table[c] }, t)) as Vec3;
}

/** Geometric tangent of the path (defined even when the speed tends to 0). */
function pathTangent(t: number): Vec3 {
  if (t >= TIMES.touch - 0.02) {
    const { curve } = landingGet();
    const n = curve.points.length - 1;
    return normalize(sub(curvePoint(curve, n), curvePoint(curve, n - 0.02)));
  }
  const v = falconVelocity(t);
  if (length(v) > 0.4) return normalize(v);
  const { curve } = landingGet();
  const s = tableAt(curve.travel, t);
  const u = tableInverse(curve.arc, Math.min(s, curve.length));
  return normalize(sub(curvePoint(curve, u + 0.01), curvePoint(curve, u - 0.01)));
}

// --- readouts for the page -------------------------------------------------------------------------------

const ANGLE_DT = 1 / 240;
let angleTable: Float64Array | null = null;

/** θ accumulated over the whole clip: the spiral's and, afterward, the unwrapped polar angle of the center. */
function angleTableGet(): Float64Array {
  if (angleTable) return angleTable;
  const count = Math.ceil(FALCON_DURATION / ANGLE_DT) + 1;
  const table = new Float64Array(count);
  let previousPolar = 0;
  for (let i = 0; i < count; i++) {
    const t = i * ANGLE_DT;
    const c = falconCenter(t);
    const polar = Math.atan2(c[2], c[0]);
    if (t <= TIMES.spiralEnd) {
      table[i] = spiralThetaAt(t);
    } else {
      // The world polar angle decreases as θ increases (the spiral turns in that direction).
      let delta = previousPolar - polar;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      table[i] = table[i - 1] + delta;
    }
    previousPolar = polar;
  }
  angleTable = table;
  return table;
}

/** Accumulated angle around the tower's axis since t = 0 (rad). */
export function spiralAngle(t: number): number {
  return tableAt({ x0: 0, dx: ANGLE_DT, y: angleTableGet() }, clamp(t, 0, FALCON_DURATION));
}

/** Horizontal distance from the falcon's center to the tower's axis (m). */
export function spiralRadius(t: number): number {
  const c = falconCenter(clamp(t, 0, FALCON_DURATION));
  return Math.hypot(c[0], c[2]);
}

/** Instant before t at which the accumulated angle was θ(t) − π/2, or null if there was none. */
function quarterEarlier(t: number): number | null {
  const table = angleTableGet();
  const target = spiralAngle(t) - Math.PI / 2;
  const last = Math.min(table.length - 1, Math.floor(clamp(t, 0, FALCON_DURATION) / ANGLE_DT));
  for (let i = last; i > 0; i--) {
    const a = table[i - 1];
    const b = table[i];
    if ((a - target) * (b - target) <= 0 && a !== b) return (i - 1 + (target - a) / (b - a)) * ANGLE_DT;
  }
  return null;
}

/**
 * Ratio between the radius a quarter turn earlier and the current radius. In the spiral segment it is
 * φ; before the first quarter turn is complete there is nothing to compare with (null).
 */
export function quarterTurnRatio(t: number): number | null {
  const earlier = quarterEarlier(t);
  if (earlier === null) return null;
  return spiralRadius(earlier) / spiralRadius(t);
}

/** Height of the falcon's center above the square (m). */
export function altitude(t: number): number {
  return falconCenter(clamp(t, 0, FALCON_DURATION))[1];
}

/** Speed of the falcon's center (m/s). */
export function speed(t: number): number {
  const tt = clamp(t, 0, FALCON_DURATION);
  if (tt >= TIMES.touch) return 0;
  return tt <= TIMES.spiralEnd ? SPIRAL_SPEED(tt) : PULL_SPEED(tt);
}

// --- flapping -------------------------------------------------------------------------------------------------

/** Fraction of the cycle taken by the downstroke: the downstroke is faster than the upstroke (40/60). */
export const DOWNSTROKE_FRACTION = 0.4;
/** Mean period of the cruising wingbeat (s): 4.5 Hz. */
const FLIGHT_PERIOD = 1 / 4.5;
/** Mean period of the braking wingbeat (s): slower and wider. */
const BRAKE_PERIOD = 1 / 4.0;
const BRAKE_START = 9.55;
const BRAKE_END = 11.08;

export interface Beat {
  start: number;
  duration: number;
  /** Relative amplitude. */
  amplitude: number;
  burst: 'flight' | 'brake';
}

const beatCache = new Map<number, Beat[]>();

/**
 * Wingbeats of the clip for a seed: duration with Gaussian variation (±5.5 %, clipped) and amplitude
 * ±5 %. The first one starts before t = 0 so that frame 0 shows the wings mid-downstroke.
 */
export function beats(seed = FALCON_SEED): Beat[] {
  const cached = beatCache.get(seed);
  if (cached) return cached;
  const random = stream(seed, 'falcon:beats');
  const out: Beat[] = [];
  const vary = () => 1 + clamp(0.055 * gaussian(random), -0.12, 0.12);
  let start = -0.2 * FLIGHT_PERIOD;
  while (start < TIMES.flapEnd - 0.35 * FLIGHT_PERIOD) {
    const duration = FLIGHT_PERIOD * vary();
    out.push({ start, duration, amplitude: 1 + 0.05 * (random() * 2 - 1), burst: 'flight' });
    start += duration;
  }
  start = BRAKE_START;
  while (start < BRAKE_END - 0.5 * BRAKE_PERIOD) {
    const duration = BRAKE_PERIOD * vary();
    out.push({ start, duration, amplitude: 1 + 0.05 * (random() * 2 - 1), burst: 'brake' });
    start += duration;
  }
  beatCache.set(seed, out);
  return out;
}

function beatAt(t: number, seed: number): { beat: Beat; index: number; phase: number; envelope: number } | null {
  const list = beats(seed);
  for (let i = 0; i < list.length; i++) {
    const beat = list[i];
    if (t >= beat.start && t < beat.start + beat.duration) {
      const burst = list.filter((b) => b.burst === beat.burst);
      const k = burst.indexOf(beat);
      const phase = (t - beat.start) / beat.duration;
      // Envelope: the last wingbeat of each burst fades into the base pose; the first braking one
      // starts from it.
      let envelope = 1;
      if (k === burst.length - 1) envelope = 1 - smoothstep(0.35, 1, phase);
      if (beat.burst === 'brake' && k === 0) envelope *= smoothstep(0, 0.5, phase);
      return { beat, index: i, phase, envelope };
    }
  }
  return null;
}

/** Wingbeat phase in [0, 1) (0 = wings up, the downstroke begins), or null when not flapping. */
export function wingbeatPhase(t: number, seed = FALCON_SEED): number | null {
  const hit = beatAt(t, seed);
  return hit && hit.envelope > 0.05 ? hit.phase : null;
}

/** Warped phase ψ ∈ [0, 2π): downstroke in [0, π) over 40 % of the cycle; continuous derivative. */
export function strokeAngle(phase: number): number {
  const d = DOWNSTROKE_FRACTION;
  const m = 6.3; // slope at the reversal points (rad per cycle)
  const segment = (p: number, p0: number, p1: number, y0: number, y1: number) => {
    const h = p1 - p0;
    const u = (p - p0) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * m + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * m;
  };
  const p = phase - Math.floor(phase);
  return p < d ? segment(p, 0, d, 0, Math.PI) : segment(p, d, 1, Math.PI, 2 * Math.PI);
}

// --- pose ----------------------------------------------------------------------------------------------------

export interface WingParams {
  /** Shoulder elevation (rad, + up). */
  elev: number;
  /** Arm sweep (rad, + backward). */
  sweep: number;
  /** Elbow and wrist fold: 0 extended, 1 folded against the body. */
  fold: number;
  /** Hand twist (rad, + leading edge up). */
  twist: number;
  /** Spread of the primaries: 0 closed, 1 open into fingers. */
  spread: number;
  /** Feather bending under load (0–1, curls the tips upward). */
  bend: number;
}

export interface Frame3 {
  /** Forward (local x). */
  forward: Vec3;
  /** Up (local y). */
  up: Vec3;
  /** Right (local z) = forward × up. */
  right: Vec3;
}

export interface FalconPose {
  t: number;
  phase: FalconPhase;
  /** Body center (with the flapping and the settling). */
  position: Vec3;
  body: Frame3;
  head: { position: Vec3; frame: Frame3 };
  wings: { left: WingParams; right: WingParams };
  tail: { spread: number; pitch: number; roll: number };
  /** Legs: 0 tucked, 1 forward; `grip` closes the toes; `feet` in the world when perched. */
  legs: { extend: number; grip: number; feet: [Vec3, Vec3] | null };
  /** Plumage of the trunk: scale of the cross-sections (breathing and the fluffing up while settling). */
  plumage: number;
}

/** Keys of the wings' base pose: [t, elev°, sweep°, fold, twist°, spread, bend]. */
const WING_KEYS = [
  [0, 8, 4, 0, 2, 0.05, 0],
  [2.9, 8, 4, 0, 2, 0.05, 0],
  [3.4, 5, 9, 0.1, 3, 0.1, 0.3],
  [5.05, 4, 10, 0.12, 3, 0.1, 0.3],
  [5.35, -2, 16, 0.45, 0, 0.04, 0.1],
  [5.7, -6, 22, 0.74, -1, 0, 0],
  [7.45, -6, 23, 0.76, -1, 0, 0],
  [7.95, 13, -2, 0.08, 4, 0.35, 0.6],
  [8.6, 10, 2, 0.08, 4, 0.3, 0.5],
  [9.35, 12, 0, 0.05, 5, 0.3, 0.4],
  [9.85, 20, -14, 0, 10, 0.7, 0.3],
  [10.95, 22, -16, 0, 12, 0.85, 0.3],
  [11.2, 40, -8, 0.05, 8, 0.9, 0],
  [11.45, 48, -4, 0.1, 5, 0.9, 0],
  [11.9, -38, 0, 0.74, 0, 0.3, 0],
  // Perched: fold 0.88, with the hand pointing back and slightly toward the body: the tips of the
  // primaries rest on the tail (fully folded, they stuck up 5 cm above the back).
  [12.3, -72, 2, 0.88, 0, 0, 0],
  [15, -72, 2, 0.88, 0, 0, 0],
];

/** Tail keys: [t, spread°, pitch°]. */
const TAIL_KEYS = [
  [0, 22, 0],
  [2.9, 22, 0],
  [3.4, 36, -2],
  [5.05, 36, -2],
  [5.6, 10, 3],
  [7.45, 10, 3],
  [7.9, 95, -12],
  [8.6, 60, -6],
  [9.6, 70, -10],
  [10.4, 115, -32],
  [11.2, 120, -38],
  [11.6, 70, -20],
  [12.2, 16, -8],
  [15, 14, -8],
];

/** Body's angle of attack over the path tangent: [t, degrees]. */
const PITCH_KEYS = [
  [0, 5],
  [2.9, 5],
  [3.4, 7],
  [5.05, 7],
  [5.6, 0],
  [7.45, 0],
  [7.9, 14],
  [8.6, 10],
  [9.4, 12],
  [9.9, 34],
  [10.6, 60],
  [11.0, 68],
  [11.2, 64],
];

/** Tilt of the perched body above the horizontal. */
const PERCH_PITCH = 67 * DEG;

/** Smooth deterministic noise: a sum of sines with phases from the seed (value in [−1, 1]). */
function wobble(seed: number, name: string, t: number, rate = 1): number {
  const random = stream(seed, `falcon:wobble:${name}`);
  const a = random() * Math.PI * 2;
  const b = random() * Math.PI * 2;
  const c = random() * Math.PI * 2;
  return 0.5 * Math.sin(t * 1.3 * rate + a) + 0.3 * Math.sin(t * 2.9 * rate + b) + 0.2 * Math.sin(t * 5.3 * rate + c);
}

/** Orthonormal frame from a forward vector and an approximate up. */
function frameFrom(forward: Vec3, upHint: Vec3): Frame3 {
  const f = normalize(forward);
  let r = cross(f, upHint);
  if (length(r) < 1e-6) r = cross(f, [1, 0, 0]);
  r = normalize(r);
  const u = normalize(cross(r, f));
  return { forward: f, up: u, right: r };
}

/** Flight attitude without oscillations: path tangent, lift toward (a − g), and angle of attack. */
function flightFrame(t: number): Frame3 {
  const tangent = pathTangent(t);
  const force = smoothForce(t);
  const lateral = sub(force, scale(tangent, dot(force, tangent)));
  const level = sub(UP, scale(tangent, dot(UP, tangent)));
  const k = smoothstep(0.8, 3.5, length(lateral));
  const upHint = normalize(lerp3(normalize(level), normalize(lateral), k));
  const base = frameFrom(tangent, upHint);
  const pitch = keyed(PITCH_KEYS, t)[0] * DEG;
  const forward = rotate(base.forward, base.right, pitch);
  return frameFrom(forward, rotate(base.up, base.right, pitch));
}

/** Gaussian average of the flight attitude (σ = 0.05 s): removes the curvature kinks. */
function smoothFlightFrame(t: number): Frame3 {
  let f: Vec3 = [0, 0, 0];
  let u: Vec3 = [0, 0, 0];
  for (let i = -3; i <= 3; i++) {
    const w = Math.exp(-0.5 * (i / 1.5) ** 2);
    const frame = flightFrame(t + i * 0.025);
    f = add(f, scale(frame.forward, w));
    u = add(u, scale(frame.up, w));
  }
  return frameFrom(f, u);
}

function slerpFrame(a: Frame3, b: Frame3, w: number): Frame3 {
  return frameFrom(lerp3(a.forward, b.forward, w), lerp3(a.up, b.up, w));
}

/** Frame of the perched body, with the rocking of the settling. */
function perchedFrame(t: number): Frame3 {
  const p = perch();
  const base = frameFrom(rotate(p.heading, normalize(cross(p.heading, UP)), PERCH_PITCH), UP);
  const tau = Math.max(0, t - TIMES.touch);
  const rock = 13 * DEG * Math.exp(-tau / 0.32) * Math.sin((2 * Math.PI * tau) / 0.55);
  return frameFrom(rotate(base.forward, base.right, -rock), rotate(base.up, base.right, -rock));
}

/** Body attitude without the flapping oscillation (the one the head uses to stay steady). */
function stableBodyFrame(t: number): Frame3 {
  if (t <= 10.1) return smoothFlightFrame(t);
  const flight = smoothFlightFrame(Math.min(t, TIMES.touch - 0.03));
  const w = smoothstep(10.1, TIMES.touch + 0.15, t);
  return slerpFrame(flight, perchedFrame(t), w);
}

function wingParams(values: number[]): WingParams {
  return { elev: values[0] * DEG, sweep: values[1] * DEG, fold: values[2], twist: values[3] * DEG, spread: values[4], bend: values[5] };
}

// --- wing skeleton --------------------------------------------------------------------------------------------

/** Falcon measurements (m): a female peregrine, ~1 m wingspan and ~0.44 m long. */
export const FALCON_DIMS = {
  shoulder: [0.045, 0.02, 0.034] as Vec3,
  humerus: 0.08,
  forearm: 0.1,
  hand: 0.088,
  /**
   * Outer primaries (P6–P10): base along the hand, length and angle behind the hand. Nearly parallel,
   * with P9 the longest: a falcon's wingtip is pointed, not open into "fingers".
   */
  primaries: [
    { base: 0.3, length: 0.175, angle: 13 },
    { base: 0.48, length: 0.2, angle: 9.5 },
    { base: 0.65, length: 0.222, angle: 6 },
    { base: 0.83, length: 0.24, angle: 3.2 },
    { base: 1.0, length: 0.226, angle: 1.2 },
  ],
  headOffset: [0.14, 0.035, 0] as Vec3,
  tailBase: [-0.112, 0.006, 0] as Vec3,
  tailLength: 0.18,
};

export interface WingSkeleton {
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  hand: Vec3;
  /** Axes of the wing plane: toward the tip, backward, and the dorsal normal (in body coordinates). */
  spanAxis: Vec3;
  backAxis: Vec3;
  normal: Vec3;
  /** Directions (in the wing plane) of the humerus, forearm and hand. */
  bones: { humerus: Vec3; forearm: Vec3; hand: Vec3 };
  /** Outer primaries: base, direction and length. */
  primaries: { base: Vec3; direction: Vec3; length: number; tip: Vec3 }[];
  /** Direction in the wing plane for an angle ψ measured from the span axis backward. */
  direction(psi: number): Vec3;
  /** ψ angles of the bones. */
  angles: { humerus: number; forearm: number; hand: number };
}

/**
 * Skeleton of the right wing (side = 1) or left wing (side = −1) in body coordinates (x forward,
 * y up, z right). Folding takes the humerus backward, the forearm forward and the hand backward (the
 * "Z" of the folded wing); the primaries close over the hand.
 */
export function wingSkeleton(w: WingParams, side: 1 | -1): WingSkeleton {
  const d = FALCON_DIMS;
  const shoulder: Vec3 = [d.shoulder[0], d.shoulder[1], d.shoulder[2] * side];
  // Wing plane: span +z (or −z), back −x, normal +y; sweep about y, elevation about x.
  let span: Vec3 = [0, 0, side];
  let back: Vec3 = [-1, 0, 0];
  let normal: Vec3 = [0, 1, 0];
  const yaw = (v: Vec3) => rotate(v, [0, side, 0], -w.sweep);
  span = yaw(span);
  back = yaw(back);
  const roll = (v: Vec3) => rotate(v, [1, 0, 0], -w.elev * side);
  span = roll(span);
  back = roll(back);
  normal = roll(normal);
  const direction = (psi: number): Vec3 => add(scale(span, Math.cos(psi)), scale(back, Math.sin(psi)));
  const fold = clamp(w.fold, 0, 1);
  const angles = {
    humerus: (25 + 55 * fold) * DEG,
    forearm: (-10 - 92 * fold) * DEG,
    hand: (15 + 82 * fold) * DEG,
  };
  const humerus = direction(angles.humerus);
  const forearm = direction(angles.forearm);
  const handDir = direction(angles.hand);
  const elbow = add(shoulder, scale(humerus, d.humerus));
  const wrist = add(elbow, scale(forearm, d.forearm));
  const hand = add(wrist, scale(handDir, d.hand));
  const close = 1 - 0.9 * fold;
  const primaries = d.primaries.map((p, i) => {
    const spreadExtra = w.spread * (i === 4 ? 0.5 : 1.5 + 2.6 * (4 - i));
    const psi = angles.hand + (p.angle * close + spreadExtra * (1 - fold)) * DEG;
    const base = add(wrist, scale(handDir, d.hand * p.base));
    let direction = directionIn(span, back, psi);
    // Bending under load: the tip rises.
    direction = normalize(add(direction, scale(normal, 0.12 * w.bend * (0.4 + 0.15 * i))));
    return { base, direction, length: p.length, tip: add(base, scale(direction, p.length)) };
  });
  return { shoulder, elbow, wrist, hand, spanAxis: span, backAxis: back, normal, bones: { humerus, forearm, hand: handDir }, primaries, direction, angles };
}

function directionIn(span: Vec3, back: Vec3, psi: number): Vec3 {
  return add(scale(span, Math.cos(psi)), scale(back, Math.sin(psi)));
}

/** Skeleton points that define the wing's width (elbow, wrist, hand and primary tips). */
function wingExtremes(skeleton: WingSkeleton): Vec3[] {
  return [skeleton.elbow, skeleton.wrist, skeleton.hand, ...skeleton.primaries.map((p) => p.tip)];
}

/** Wingspan: the largest distance between symmetric points of the two wings (m). */
export function wingspanOf(wings: { left: WingParams; right: WingParams }): number {
  const left = wingExtremes(wingSkeleton(wings.left, -1));
  const right = wingExtremes(wingSkeleton(wings.right, 1));
  let best = 0;
  for (let i = 0; i < left.length; i++) best = Math.max(best, length(sub(left[i], right[i])));
  return best;
}

// --- full pose -------------------------------------------------------------------------------------------

const poseCache = new Map<string, FalconPose>();

/** Falcon pose at instant t: body, head, wings, tail and legs. */
export function falconPose(t: number, seed = FALCON_SEED): FalconPose {
  const key = `${seed}:${t}`;
  const cached = poseCache.get(key);
  if (cached) return cached;
  const pose = computePose(t, seed);
  if (poseCache.size > 64) poseCache.clear();
  poseCache.set(key, pose);
  return pose;
}

function computePose(t: number, seed: number): FalconPose {
  const phase = phaseAt(t);
  const stable = stableBodyFrame(t);
  const center = falconCenter(t);

  // Wings: the script's base pose plus the flapping, with smooth noise while gliding.
  const base = keyed(WING_KEYS, t);
  const glideLife = smoothstep(3.2, 3.6, t) * (1 - smoothstep(5.0, 5.3, t)) + smoothstep(8.0, 8.3, t) * (1 - smoothstep(9.3, 9.6, t));
  // In the stoop the wings do not freeze: fine adjustments of the fold (half those of the glide).
  const stoopLife = 0.5 * smoothstep(TIMES.tuckEnd - 0.2, TIMES.tuckEnd + 0.2, t) * (1 - smoothstep(TIMES.spiralEnd - 0.3, TIMES.spiralEnd, t));
  const hit = beatAt(t, seed);
  const flap = { elev: 0, sweep: 0, fold: 0, twist: 0, spread: 0, bend: 0, heave: 0, pitch: 0, tail: 0 };
  if (hit) {
    const psi = strokeAngle(hit.phase);
    const brake = hit.beat.burst === 'brake';
    const a = hit.envelope * hit.beat.amplitude;
    const up = Math.max(0, -Math.sin(psi));
    flap.elev = a * (brake ? 52 : 40) * Math.cos(psi);
    flap.sweep = a * (brake ? 14 : 11) * Math.sin(2 * psi);
    flap.fold = a * (brake ? 0.25 : 0.42) * Math.pow(up, 1.5);
    flap.twist = -a * (brake ? 18 : 14) * Math.sin(psi);
    flap.spread = a * (brake ? 0.3 : 0.25) * up;
    flap.bend = a * Math.max(0, Math.sin(psi)) * (brake ? 1.2 : 1);
    flap.heave = -a * (brake ? 0.02 : 0.012) * Math.cos(psi);
    flap.pitch = a * (brake ? 4 : 2.5) * Math.sin(psi);
    flap.tail = -a * 3 * Math.sin(psi);
  }
  const side = (s: 1 | -1): WingParams => {
    const n = (name: string) => wobble(seed, `${name}${s}`, t, 1.7) * (glideLife + stoopLife);
    return wingParams([
      base[0] + flap.elev + 2.2 * n('elev'),
      base[1] + flap.sweep + 1.5 * n('sweep'),
      base[2] + flap.fold,
      base[3] + flap.twist + 1.5 * n('twist'),
      clamp(base[4] + flap.spread, 0, 1),
      base[5] + flap.bend,
    ]);
  };
  const wings = { left: side(-1), right: side(1) };

  // Body: the stable attitude plus the flapping pitch; the center rises and falls with each wingbeat.
  const body = frameFrom(rotate(stable.forward, stable.right, flap.pitch * DEG), rotate(stable.up, stable.right, flap.pitch * DEG));
  let position = add(center, scale(stable.up, flap.heave));
  const tau = t - TIMES.touch;
  if (tau > 0) {
    // Settling: the legs flex on touching the bar.
    position = add(position, [0, -0.022 * Math.exp(-tau / 0.18) * Math.sin(Math.min(Math.PI, (tau / 0.3) * Math.PI)), 0]);
  }

  // Head: neck position in the stable frame (without the flapping) and gaze according to the phase.
  const headPosition = add(center, add(scale(stable.forward, FALCON_DIMS.headOffset[0]), scale(stable.up, FALCON_DIMS.headOffset[1])));
  const head = { position: headPosition, frame: headFrame(t, seed, stable, headPosition) };

  const tailValues = keyed(TAIL_KEYS, t);
  // The tail steers: a slight roll while gliding and stooping.
  const steer = 4 * DEG * wobble(seed, 'tail-roll', t, 1.3) * Math.min(1, glideLife + 2 * stoopLife);
  const tail = { spread: tailValues[0] * DEG, pitch: (tailValues[1] + flap.tail) * DEG, roll: steer };

  const legValues = keyed(
    [
      [0, 0, 0],
      [10.0, 0, 0],
      [10.7, 1, 0],
      [11.05, 1, 0.1],
      [11.3, 1, 1],
      [15, 1, 1],
    ],
    t,
  );
  let feet: [Vec3, Vec3] | null = null;
  if (t >= TIMES.touch - 0.2) {
    const p = perch();
    const top = add(p.bar, [0, p.barRadius, 0]);
    feet = [add(top, scale(p.barDirection, -0.028)), add(top, scale(p.barDirection, 0.028))];
  }
  // Perched: it breathes (≈ 1.1 Hz) and, while settling, fluffs up its feathers and smooths them down again.
  const perched = smoothstep(TIMES.touch, TIMES.touch + 0.5, t);
  const breath = 0.014 * Math.sin((2 * Math.PI * (t - TIMES.touch)) / 0.9) * perched;
  const rouse = 0.11 * smoothstep(12.25, 12.5, t) * (1 - smoothstep(12.55, 12.95, t));
  return { t, phase, position, body, head, wings, tail, legs: { extend: legValues[0], grip: legValues[1], feet }, plumage: 1 + breath + rouse };
}

/** Gaze fixations while perched: [t, yaw°, pitch°] relative to the heading, with quick saccades. */
const LOOK_KEYS = [
  [11.2, 0, -12],
  [11.75, 0, -12],
  [11.87, 18, -34],
  [12.3, 18, -34],
  [12.42, -52, -4],
  [12.85, -52, -4],
  [12.97, 38, 6],
  [13.1, 38, 6],
];

/** Direction of a perched gaze: yaw and pitch (degrees) relative to the heading on the bar. */
function perchFixation(yaw: number, pitch: number): Vec3 {
  const p = perch();
  const left = normalize(cross(UP, p.heading));
  const flat = add(scale(p.heading, Math.cos(yaw * DEG)), scale(left, Math.sin(yaw * DEG)));
  return normalize(add(scale(flat, Math.cos(pitch * DEG)), [0, Math.sin(pitch * DEG), 0]));
}

function headFrame(t: number, seed: number, stable: Frame3, headPosition: Vec3): Frame3 {
  let look: Vec3;
  let levelWeight = 0.85;
  if (t < TIMES.glideEnd) {
    look = sub(falconCenter(t + 0.45), falconCenter(t));
  } else if (t < TIMES.spiralEnd) {
    // Stoop: the head aligned with the body, which follows the trajectory.
    const w = smoothstep(TIMES.glideEnd, TIMES.tuckEnd, t);
    look = lerp3(normalize(sub(falconCenter(t + 0.45), falconCenter(t))), stable.forward, w);
    levelWeight = 0.85 * (1 - w);
  } else if (t < TIMES.pullEnd) {
    const w = smoothstep(TIMES.spiralEnd, TIMES.spiralEnd + 0.4, t);
    look = lerp3(stable.forward, normalize(sub(falconCenter(t + 0.35), falconCenter(t))), w);
    levelWeight = 0.85 * w;
  } else if (t < TIMES.touch) {
    // Approach: fixate on the perching point, a little ahead of the feet on the bar (the head never
    // passes over the fixated point: looking straight down flips the head's frame). In the last
    // segment it levels out toward the first perched gaze, so touching down causes no jump.
    const p = perch();
    const target = add(p.bar, scale(p.heading, 0.3));
    const travel = normalize(sub(falconCenter(t + 0.35), falconCenter(t)));
    const w = smoothstep(TIMES.pullEnd, TIMES.pullEnd + 0.5, t);
    const settle = smoothstep(TIMES.touch - 0.45, TIMES.touch, t);
    look = normalize(lerp3(normalize(lerp3(travel, normalize(sub(target, headPosition)), w)), perchFixation(LOOK_KEYS[0][1], LOOK_KEYS[0][2]), settle));
  } else {
    const around = keyed(LOOK_KEYS, t);
    const aroundLook = perchFixation(around[0], around[1]);
    const camera = droneCamera(t, seed).position;
    const toCamera = normalize(sub(camera, headPosition));
    const w = smoothstep(TIMES.lookAtCamera, TIMES.lookAtCamera + 0.16, t);
    look = normalize(lerp3(aroundLook, toCamera, w));
    // Micro-movements of the head while it looks.
    const jitter = 1.2 * DEG * smoothstep(TIMES.touch, TIMES.touch + 0.3, t);
    look = rotate(look, UP, jitter * wobble(seed, 'head-yaw', t, 3));
  }
  const upHint = normalize(lerp3(stable.up, UP, levelWeight));
  let frame = frameFrom(look, upHint);
  if (t > TIMES.lookAtCamera + 0.6) {
    // The curious head tilt when looking at the camera.
    const tilt = 9 * DEG * smoothstep(TIMES.lookAtCamera + 0.6, TIMES.lookAtCamera + 1.0, t) * (1 - smoothstep(14.4, 14.8, t));
    frame = frameFrom(frame.forward, rotate(frame.up, frame.forward, tilt));
  }
  return frame;
}

/** Wingspan at instant t (m). */
export function wingspan(t: number, seed = FALCON_SEED): number {
  return wingspanOf(falconPose(clamp(t, 0, FALCON_DURATION), seed).wings);
}

// --- drone camera ------------------------------------------------------------------------------------------

/**
 * Camera offset from the falcon, in the horizontal frame of the path:
 * [t, back(−)/forward(+), away from(+)/toward(−) the axis, up]. It follows the falcon until the end of
 * the stoop; during the climb it holds still to one side of the loop and turns to follow it; then it
 * goes to wait in front of the bar.
 */
const CAMERA_KEYS = [
  // Flapping: behind, outside and just below, at ~1.5 m: the falcon fills almost half the frame and
  // stands out against the sky and the tower tops, not against the facades.
  [0, -1.25, 0.95, -0.25],
  [2.6, -1.2, 1.0, -0.3],
  // Glide: from below and outside (the barred belly shows against the sky).
  [3.5, -0.75, 1.45, -0.5],
  [4.9, -0.7, 1.45, -0.55],
  // Stoop: above, behind and outside, looking at the square and the seed disk.
  [5.6, -0.65, 0.65, 0.75],
  [7.3, -0.6, 0.6, 0.7],
];

/**
 * Camera segments: it follows until the stoop; moves to the outer side of the climb; during the
 * wingover it orbits around the end of the "U"; it tracks the return and the perching in profile from
 * outside (the mast stays behind the falcon) and, once perched, turns toward a three-quarter front view.
 */
const CAMERA_SIDE = { in: [6.6, 7.3], orbit: [8.35, 9.45] } as const;
const SIDE_DISTANCE = 1.85;
/** Final distance of the perched portrait (m). */
const PORTRAIT_DISTANCE = 1.4;
/** Final angle of the portrait from profile toward the front (rad): a three-quarter view, not head-on. */
const PORTRAIT_TURN = 0.6;

export interface DroneCamera {
  position: Vec3;
  target: Vec3;
  /** Vertical field of view (degrees). */
  fov: number;
  /** Roll (rad). */
  roll: number;
}

/** Horizontal frame of the path: horizontal tangent and "outward" (away from the axis). */
function pathFrame(t: number): { along: Vec3; out: Vec3 } {
  const c = falconCenter(t);
  const v = sub(falconCenter(t + 0.05), falconCenter(t - 0.05));
  let along = normalize([v[0], 0, v[2]]);
  if (length(along) < 0.5) along = perch().heading;
  const radial = normalize([c[0], 0, c[2]]);
  const side = cross(UP, along); // left of the path
  const out = dot(side, radial) >= 0 ? side : scale(side, -1);
  return { along, out };
}

function perchCamera(t: number): { position: Vec3; target: Vec3 } {
  const p = perch();
  // From profile (along the bar) to a three-quarter view, moving closer and lower: head-on, in
  // silhouette, the falcon read as an owl; in three-quarter view the hooked beak, the hood and the
  // wingtips over the tail are visible.
  const turn = smoothstep(TIMES.touch + 0.25, TIMES.lookAtCamera + 0.3, t);
  const push = smoothstep(TIMES.touch, FALCON_DURATION - 0.4, t);
  const beta = turn * PORTRAIT_TURN;
  const direction = add(scale(p.barDirection, Math.cos(beta)), scale(p.heading, Math.sin(beta)));
  const distance = SIDE_DISTANCE - (SIDE_DISTANCE - PORTRAIT_DISTANCE) * push;
  const position = add(p.body, add(scale(direction, distance), [0, 0.45 - 0.57 * push, 0]));
  return { position, target: add(p.body, [0, 0.04 - 0.02 * push, 0]) };
}

function rawCamera(t: number): { position: Vec3; target: Vec3 } {
  if (t >= TIMES.touch) return perchCamera(t);
  const c = falconCenter(t);
  // Aim a little ahead of the falcon (leading room where it flies), without losing it from a close frame.
  const lead = add(c, scale(falconVelocity(Math.min(t, TIMES.touch - 0.01)), 0.03));
  // Tracking in the frame of the path (until the stoop).
  const followT = Math.min(t, CAMERA_SIDE.in[1]);
  const frame = pathFrame(followT);
  const k = keyed(CAMERA_KEYS, followT);
  const follow = add(falconCenter(followT), add(add(scale(frame.along, k[0]), scale(frame.out, k[1])), [0, k[2], 0]));
  // Side: outside the outbound branch, an orbit around the end of the "U", and outside the return branch.
  // Before the pull-out, "outside" is the falcon's radial direction; from the pull-out on, that of the end
  // of the spiral (they coincide at that instant).
  const { out: exitOut, around } = landingGet().frame;
  const out = t < TIMES.spiralEnd ? normalize([c[0], 0, c[2]]) : exitOut;
  const phi = Math.PI * smoothstep(CAMERA_SIDE.orbit[0], CAMERA_SIDE.orbit[1], t);
  const sideDirection = add(scale(out, Math.cos(phi)), scale(around, Math.sin(phi)));
  const side = add(c, add(scale(sideDirection, SIDE_DISTANCE), [0, 0.45, 0]));
  const toSide = smoothstep(CAMERA_SIDE.in[0], CAMERA_SIDE.in[1], t);
  const position = lerp3(follow, side, toSide);
  const settle = smoothstep(TIMES.touch - 0.4, TIMES.touch, t);
  return { position, target: lerp3(lead, perchCamera(TIMES.touch).target, settle) };
}

/** Source camera: a drone that follows the falcon, with a smoothed path (Gaussian σ = 0.16 s) and slight drift. */
export function droneCamera(t: number, seed = FALCON_SEED): DroneCamera {
  let position: Vec3 = [0, 0, 0];
  let target: Vec3 = [0, 0, 0];
  let total = 0;
  let targetTotal = 0;
  for (let i = -6; i <= 6; i++) {
    const w = Math.exp(-0.5 * (i / 3) ** 2);
    const sample = rawCamera(clamp(t + i * 0.03, 0, FALCON_DURATION));
    position = add(position, scale(sample.position, w));
    total += w;
    // The aim is smoothed less (σ ≈ 0.06 s): the falcon does not escape the frame in the turns.
    if (Math.abs(i) <= 4) {
      const wt = Math.exp(-0.5 * (i / 2) ** 2);
      target = add(target, scale(sample.target, wt));
      targetTotal += wt;
    }
  }
  position = scale(position, 1 / total);
  target = scale(target, 1 / targetTotal);
  // Drone drift: centimeters and tenths of a degree.
  const drift = 1 - 0.7 * smoothstep(TIMES.touch, TIMES.touch + 1, t);
  position = add(position, scale([wobble(seed, 'cam-x', t, 0.6), wobble(seed, 'cam-y', t, 0.5), wobble(seed, 'cam-z', t, 0.7)], 0.05 * drift));
  const fov = keyed(
    [
      [0, 44],
      [8.8, 44],
      [10.4, 38],
      [11.4, 33],
      [15, 30],
    ],
    t,
  )[0];
  return { position, target, fov, roll: 0.012 * wobble(seed, 'cam-roll', t, 0.8) * drift };
}

/** Every readout of the "NOW" that the page shows, computed with this module. */
export interface FalconReadout {
  t: number;
  phase: FalconPhase;
  angle: number;
  radius: number;
  quarterRatio: number | null;
  wingbeatPhase: number | null;
  wingspan: number;
  altitude: number;
  speed: number;
}

export function falconReadout(t: number, seed = FALCON_SEED): FalconReadout {
  return {
    t,
    phase: phaseAt(t),
    angle: spiralAngle(t),
    radius: spiralRadius(t),
    quarterRatio: quarterTurnRatio(t),
    wingbeatPhase: wingbeatPhase(t, seed),
    wingspan: wingspan(t, seed),
    altitude: altitude(t),
    speed: speed(t),
  };
}
