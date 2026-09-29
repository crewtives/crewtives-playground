import { normalize } from '../../scenes/math';
import type { FallState, Rgb, Vec3 } from '../../scenes/whaleFall';

// Equation-generated humpback whale (D7, D9): body, pectoral fins, fluke and dorsal fin as parametric
// surfaces with a fixed topology. Each frame changes only the kinematics: the dorsoventral stroke
// with a traveling wave, the sweep of the pectoral fins and the bank in the orbit, all in proper time.
// No three and no DOM (the tests use it); the recipe wraps these arrays in meshes.
//
// Body frame: x forward (the head), y up (the back), z to the whale's right.
// Longitudinal coordinate s ∈ [0, 1] from the snout (0) to the fluke notch (1); section angle φ from
// the back (0) through the right flank (π/2) to the belly (π).

export const WHALE = {
  /** Length from the snout to the fluke notch (m). */
  length: 1.2,
  /** Center of the frame (approximate center of mass), in s. */
  center: 0.42,
  /** Stroke wave: wavelength (in body lengths) and amplitude at the tail (in lengths). */
  wavelength: 1.05,
  tailAmplitude: 0.07,
  /** Pectoral fins: where they attach (s, φ) and their length (~1/3 of the body). */
  pectoral: { s: 0.3, phi: Math.PI / 2 + 0.62, length: 0.33 },
  /** Fluke: where it attaches (s), total span (in lengths). */
  fluke: { s: 0.93, span: 0.34 },
  /** A small dorsal fin on the hump. */
  dorsal: { s: 0.655 },
} as const;

const L = WHALE.length;

export type WhalePartName = 'body' | 'pectoralRight' | 'pectoralLeft' | 'fluke' | 'dorsal';

export interface WhalePart {
  name: WhalePartName;
  vertexCount: number;
  indices: Uint32Array;
  /**
   * Intrinsic coordinates of each vertex (3 per vertex): body (s, φ, 0); pectoral (u along the fin,
   * chord fraction, side +1 top / −1 bottom); fluke (η from tip to tip, chord, side); dorsal
   * (height, chord, side).
   */
  params: Float32Array;
}

// --- profiles --------------------------------------------------------------------------------------

/** Monotone interpolation (PCHIP) through control points [x, y], constant beyond the ends. */
function curve(points: [number, number][]): (x: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) {
    // Fritsch–Butland: weighted harmonic mean of the neighboring slopes (0 at local extrema).
    const h0 = xs[i] - xs[i - 1];
    const h1 = xs[i + 1] - xs[i];
    m.push(d[i - 1] * d[i] <= 0 ? 0 : (3 * (h0 + h1)) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]));
  }
  m.push(d[n - 2]);
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/** Half width, dorsal half height and ventral half height of the section, in body lengths. */
const halfWidth = curve([
  [0, 0], [0.012, 0.038], [0.04, 0.066], [0.1, 0.086], [0.18, 0.1], [0.26, 0.109], [0.34, 0.114], [0.42, 0.113],
  [0.5, 0.106], [0.58, 0.094], [0.66, 0.076], [0.74, 0.055], [0.82, 0.035], [0.88, 0.022], [0.93, 0.015], [0.97, 0.011], [1, 0.009],
]);
const halfTop = curve([
  [0, 0], [0.012, 0.014], [0.04, 0.026], [0.1, 0.038], [0.18, 0.054], [0.26, 0.071], [0.34, 0.085], [0.42, 0.092],
  [0.5, 0.092], [0.58, 0.086], [0.66, 0.077], [0.74, 0.062], [0.82, 0.049], [0.88, 0.037], [0.93, 0.026], [0.97, 0.017], [1, 0.011],
]);
const halfBottom = curve([
  [0, 0], [0.012, 0.02], [0.04, 0.04], [0.1, 0.064], [0.18, 0.086], [0.26, 0.1], [0.34, 0.106], [0.42, 0.103],
  [0.5, 0.094], [0.58, 0.08], [0.66, 0.064], [0.74, 0.05], [0.82, 0.037], [0.88, 0.027], [0.93, 0.019], [0.97, 0.013], [1, 0.009],
]);
/** Midline of the section: the jaw drops a little at the front. */
const midline = curve([[0, -0.012], [0.08, -0.006], [0.25, 0], [1, 0]]);
/** Superellipse exponents: a flat-topped head, a peduncle keeled above and below. */
const topExponent = curve([[0, 0.55], [0.16, 0.62], [0.3, 0.9], [0.7, 0.92], [0.84, 1.25], [1, 1.35]]);
const bottomExponent = curve([[0, 0.8], [0.3, 0.88], [0.7, 0.92], [0.84, 1.2], [1, 1.3]]);

/** Hump in front of the dorsal fin (in lengths). */
function hump(s: number): number {
  return 0.012 * Math.exp(-(((s - 0.63) / 0.04) ** 2));
}

/** Tubercles: knobs on top of the rostrum and along the edges of the jaw, at (s, φ). */
const KNOBS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let s = 0.022; s < 0.17; s += 0.016) {
    out.push([s, 0]);
    // Lateral rows on the rostrum, spreading apart toward the back.
    const spread = 0.28 + 1.4 * s;
    if (s > 0.03) out.push([s + 0.006, spread], [s + 0.006, -spread]);
    if (s > 0.06) out.push([s + 0.003, spread * 1.85], [s + 0.003, -spread * 1.85]);
  }
  // Jaw: a row along the edge and a cluster on the chin.
  for (let s = 0.025; s < 0.15; s += 0.019) out.push([s, Math.PI / 2 + 0.34], [s, -(Math.PI / 2 + 0.34)]);
  for (const [s, phi] of [[0.02, Math.PI], [0.03, Math.PI - 0.25], [0.03, Math.PI + 0.25], [0.042, Math.PI]] as [number, number][]) out.push([s, phi]);
  return out;
})();
const KNOB_RADIUS = 0.0068;
const KNOB_HEIGHT = 0.0065;

/** Height (in lengths) of the tubercles at (s, φ), and closeness to the center of the nearest one (0–1). */
function knobAt(s: number, phi: number): number {
  if (s > 0.19) return 0;
  const r = sectionRadius(s);
  let best = 0;
  for (const [ks, kphi] of KNOBS) {
    const dphi = Math.abs(((((phi - kphi + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const d2 = ((s - ks) ** 2 + (dphi * r) ** 2) / KNOB_RADIUS ** 2;
    if (d2 < 4) best = Math.max(best, Math.exp(-d2 * 1.4));
  }
  return best;
}

/** Mean radius of the section (in lengths), for measuring distances on the surface. */
function sectionRadius(s: number): number {
  return (halfWidth(s) + 0.5 * (halfTop(s) + halfBottom(s))) / 2;
}

/** Point of the section (y, z) in lengths, without the wave: a superellipse with a different back and belly. */
function section(s: number, phi: number, out: [number, number]): [number, number] {
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  const top = c >= 0;
  const h = top ? halfTop(s) + hump(s) : halfBottom(s);
  const e = top ? topExponent(s) : bottomExponent(s);
  const bump = knobAt(s, phi) * KNOB_HEIGHT;
  out[0] = Math.sign(c) * Math.pow(Math.abs(c), e) * (h + bump * Math.abs(c)) + midline(s);
  out[1] = Math.sign(sn) * Math.pow(Math.abs(sn), 0.85) * (halfWidth(s) + bump * Math.abs(sn));
  return out;
}

// --- kinematics --------------------------------------------------------------------------------------

export interface PectoralAngles {
  /** Backward sweep, droop below the body's horizon, and pitch (rad). */
  sweep: number;
  droop: number;
  pitch: number;
}

export interface WhaleKinematics {
  /** Body frame in the world: center and unit axes (forward, up, right). */
  origin: Vec3;
  forward: Vec3;
  up: Vec3;
  right: Vec3;
  /** Stroke phase (rad), in proper time. */
  beat: number;
  /** Right [0] and left [1] pectoral fins. */
  pectorals: [PectoralAngles, PectoralAngles];
  /** Extra pitch of the fluke relative to the tail (rad). */
  flukePitch: number;
}

/** Whale kinematics from the fall state (position, heading, bank, stroke phase). */
export function whaleKinematics(state: FallState): WhaleKinematics {
  const f = state.forward;
  // Frame without bank: right = forward × world up.
  let rx = -f[2];
  let rz = f[0];
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  const right0: Vec3 = [rx, 0, rz];
  const up0: Vec3 = cross(right0, f);
  // Bank toward the center of the turn (to the left: the orbit is counterclockwise seen from above).
  const cb = Math.cos(state.bank);
  const sb = Math.sin(state.bank);
  const up1: Vec3 = [up0[0] * cb - right0[0] * sb, up0[1] * cb - right0[1] * sb, up0[2] * cb - right0[2] * sb];
  const right: Vec3 = [right0[0] * cb + up0[0] * sb, right0[1] * cb + up0[1] * sb, right0[2] * cb + up0[2] * sb];

  // Recoil: the whole body pitches and heaves a little in antiphase with the fluke (the reaction to
  // the tail stroke). Without it the whale looks like a hinge: head pinned and tail moving on its own.
  const stroke = Math.sin(state.beat - waveLag(WHALE.fluke.s));
  const pitch = -RECOIL.pitch * stroke;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const forward: Vec3 = [f[0] * cp + up1[0] * sp, f[1] * cp + up1[1] * sp, f[2] * cp + up1[2] * sp];
  const up: Vec3 = [up1[0] * cp - f[0] * sp, up1[1] * cp - f[1] * sp, up1[2] * cp - f[2] * sp];
  const heave = -RECOIL.heave * L * stroke;
  const origin: Vec3 = [state.position[0] + up[0] * heave, state.position[1] + up[1] * heave, state.position[2] + up[2] * heave];

  // Pectoral fins: they sweep slowly (half the stroke rate) and are used for banking: the one inside
  // the turn (the left one) drops more. In the final roll they open, like an embrace.
  const slow = 0.5 * state.beat + 0.7;
  const open = Math.min(1, Math.max(0, state.roll / 1.1));
  const pectorals = [1, -1].map((side) => {
    const sweep = 0.6 + 0.17 * Math.sin(slow);
    const droop = 0.4 + 0.07 * Math.sin(slow + 1.2) - side * 0.55 * state.turn;
    const pitch = 0.14 * Math.sin(slow - 0.4);
    return {
      sweep: sweep + (0.2 - sweep) * open,
      droop: droop + (0.02 - droop) * open,
      pitch: pitch * (1 - 0.5 * open),
    };
  }) as [PectoralAngles, PectoralAngles];

  // The fluke pitches a quarter cycle ahead of its vertical displacement.
  const flukePitch = 0.36 * Math.sin(state.beat - waveLag(WHALE.fluke.s) + Math.PI / 2);
  return { origin, forward, up, right, beat: state.beat, pectorals, flukePitch };
}

/** Body recoil from the stroke: pitch (rad) and heave of the center (in lengths). */
const RECOIL = { pitch: 0.028, heave: 0.006 };

/** Phase lag of the traveling wave at s (rad). */
function waveLag(s: number): number {
  return (2 * Math.PI * (s - 0.3)) / WHALE.wavelength;
}

/** Stroke amplitude at s (in lengths): the head almost still, growing toward the tail. */
function waveAmplitude(s: number): number {
  const u = Math.max(0, (s - 0.32) / 0.68);
  return 0.003 + WHALE.tailAmplitude * u * u;
}

/** Vertical displacement of the spine at s (in lengths) and its slope with respect to x. */
function spine(s: number, beat: number): { y: number; slope: number } {
  const phase = beat - waveLag(s);
  const y = waveAmplitude(s) * Math.sin(phase);
  // dy/ds, and x = (center − s): dy/dx = −dy/ds.
  const u = Math.max(0, (s - 0.32) / 0.68);
  const dA = s > 0.32 ? (2 * WHALE.tailAmplitude * u) / 0.68 : 0;
  const dyds = dA * Math.sin(phase) - waveAmplitude(s) * Math.cos(phase) * ((2 * Math.PI) / WHALE.wavelength);
  return { y, slope: -dyds };
}

// --- topology -----------------------------------------------------------------------------------------

const BODY_RINGS = 150;
const BODY_AROUND = 176;
const PEC_SPAN = 160;
const PEC_AROUND = 28;
const FLUKE_SPAN = 64;
const FLUKE_AROUND = 20;
const DORSAL_UP = 10;
const DORSAL_AROUND = 14;

/** Distribution of the body rings: denser at the snout (tubercles) and at the tail. */
function ringS(i: number): number {
  const u = (i + 1) / (BODY_RINGS + 1);
  return 0.55 * u + 0.45 * (1 - Math.cos(Math.PI * u)) * 0.5;
}

/** Closed tube mesh: `rings` rings of `around` vertices and two poles (first and last). */
function tubeIndices(rings: number, around: number, flip: boolean): Uint32Array {
  const out: number[] = [];
  const v = (i: number, j: number) => 1 + i * around + (j % around);
  const tail = 1 + rings * around;
  const tri = (a: number, b: number, c: number) => (flip ? out.push(a, c, b) : out.push(a, b, c));
  for (let j = 0; j < around; j++) tri(0, v(0, j), v(0, j + 1));
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < around; j++) {
      tri(v(i, j), v(i + 1, j), v(i, j + 1));
      tri(v(i + 1, j), v(i + 1, j + 1), v(i, j + 1));
    }
  }
  for (let j = 0; j < around; j++) tri(v(rings - 1, j), tail, v(rings - 1, j + 1));
  return new Uint32Array(out);
}

/** Builds the five parts with their fixed topology and their intrinsic per-vertex coordinates. */
export function buildWhale(): WhalePart[] {
  const parts: WhalePart[] = [];

  // Body: a pole at the snout, rings, a pole at the tail.
  {
    const count = BODY_RINGS * BODY_AROUND + 2;
    const params = new Float32Array(count * 3);
    params.set([0, 0, 0], 0);
    for (let i = 0; i < BODY_RINGS; i++) {
      for (let j = 0; j < BODY_AROUND; j++) {
        const k = 1 + i * BODY_AROUND + j;
        params[k * 3] = ringS(i);
        params[k * 3 + 1] = (2 * Math.PI * j) / BODY_AROUND;
      }
    }
    params.set([1, 0, 0], (count - 1) * 3);
    parts.push({ name: 'body', vertexCount: count, indices: tubeIndices(BODY_RINGS, BODY_AROUND, false), params });
  }

  // Pectoral fins: rings along the fin (from root to tip), with an airfoil profile around them.
  // The face winding depends on the orientation of each frame (the left one is a mirror image): it is
  // chosen so the winding normals point outward (the tests check this).
  for (const name of ['pectoralRight', 'pectoralLeft'] as const) {
    parts.push(foilPart(name, PEC_SPAN, PEC_AROUND, (i) => (i + 1) / (PEC_SPAN + 1), name === 'pectoralRight'));
  }

  // Fluke: from tip to tip (η from −1 to 1), with the notch at the center.
  parts.push(foilPart('fluke', FLUKE_SPAN, FLUKE_AROUND, (i) => -1 + (2 * (i + 1)) / (FLUKE_SPAN + 1), true));
  // Dorsal fin: from the base to the tip.
  parts.push(foilPart('dorsal', DORSAL_UP, DORSAL_AROUND, (i) => (i + 1) / (DORSAL_UP + 1), false));
  return parts;
}

/** A wing-shaped part: pole, rings with an airfoil profile (chord × thickness), pole. */
function foilPart(name: WhalePartName, rings: number, around: number, station: (i: number) => number, flip: boolean): WhalePart {
  const count = rings * around + 2;
  const params = new Float32Array(count * 3);
  params.set([station(-1), 0, 0], 0);
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < around; j++) {
      const k = 1 + i * around + j;
      // Profile angle: 0 = leading edge, π = trailing edge; the first half is the top face.
      const psi = (2 * Math.PI * j) / around;
      params[k * 3] = station(i);
      params[k * 3 + 1] = (1 - Math.cos(psi)) / 2;
      params[k * 3 + 2] = Math.sin(psi) >= 0 ? 1 : -1;
    }
  }
  params.set([station(rings), 0, 0], (count - 1) * 3);
  return { name, vertexCount: count, indices: tubeIndices(rings, around, flip), params };
}

// --- fin profiles --------------------------------------------------------------------------------------

/** Thickness of a NACA 00xx airfoil (half thickness per unit of relative thickness) at fraction c. */
function naca(c: number): number {
  const x = Math.min(1, Math.max(0, c));
  return 5 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
}

const pecChord = curve([[0, 0.05], [0.12, 0.06], [0.3, 0.059], [0.55, 0.05], [0.75, 0.04], [0.9, 0.028], [0.97, 0.016], [1, 0.003]]);
const pecThickness = curve([[0, 0.26], [0.3, 0.19], [1, 0.12]]);

/**
 * Centers and sizes of the nine leading-edge tubercles: the spacing widens toward the tip and each
 * one has its own size (fixed, not random), as on a real fin and not like a comb.
 */
const PEC_KNOBS: { u: number; size: number }[] = (() => {
  const out: { u: number; size: number }[] = [];
  const sizes = [0.8, 1, 0.9, 1.1, 1, 0.85, 0.95, 0.75, 0.6];
  for (let i = 0; i < 9; i++) {
    const v = (i + 0.5) / 9;
    out.push({ u: 0.28 + 0.66 * (0.72 * v + 0.28 * v * v), size: sizes[i] });
  }
  return out;
})();

/**
 * Tubercles on the pectoral fin's leading edge: nine rounded bumps (in lengths). The edge is a
 * continuous wave (no flat troughs and no spikes) whose wavelength follows the spacing of the centers;
 * the height, ~8 % of the chord, is within the range measured on humpbacks (2.5–12 %).
 */
function pecTubercles(u: number): number {
  const first = PEC_KNOBS[0].u;
  const last = PEC_KNOBS[PEC_KNOBS.length - 1].u;
  const spacing = (last - first) / (PEC_KNOBS.length - 1);
  const start = first - 0.5 * spacing;
  const end = last + 0.5 * spacing;
  if (u <= start || u >= end) return 0;
  // Continuous tubercle coordinate: k + 0.5 at the center of the k-th one.
  let k: number;
  if (u < first) k = 0.5 * ((u - start) / (first - start));
  else if (u >= last) k = PEC_KNOBS.length - 0.5 + 0.5 * ((u - last) / (end - last));
  else {
    let i = 0;
    while (PEC_KNOBS[i + 1].u <= u) i++;
    k = i + 0.5 + (u - PEC_KNOBS[i].u) / (PEC_KNOBS[i + 1].u - PEC_KNOBS[i].u);
  }
  const i = Math.min(PEC_KNOBS.length - 1, Math.max(0, Math.floor(k)));
  const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * k);
  return 0.08 * pecChord(u) * PEC_KNOBS[i].size * wave;
}

/**
 * Pectoral fin in its own frame (in lengths): along the fin (+a), toward the trailing edge (+b) and
 * the thickness (+c, the top face).
 */
function pectoralLocal(u: number, c: number, side: number, out: Vec3): Vec3 {
  const tub = pecTubercles(u);
  const chord = pecChord(u) + tub;
  // The leading edge curves backward along the fin.
  const le = 0.03 * u ** 1.6 - tub;
  out[0] = u * WHALE.pectoral.length;
  out[1] = le + c * chord;
  out[2] = side * naca(c) * pecThickness(u) * chord * 0.5;
  return out;
}

const flukeLeading = curve([[0, 0], [0.15, 0.006], [0.3, 0.02], [0.5, 0.043], [0.7, 0.066], [0.85, 0.084], [0.95, 0.098], [1, 0.106]]);
const flukeTrailing = curve([[0, 0.07], [0.06, 0.086], [0.15, 0.1], [0.3, 0.113], [0.5, 0.121], [0.7, 0.123], [0.85, 0.119], [0.95, 0.112], [1, 0.106]]);

/** Fluke in its frame (in lengths): back (−x), up (+y, thickness), right (+z). */
function flukeLocal(eta: number, c: number, side: number, out: Vec3): Vec3 {
  const a = Math.abs(eta);
  const serration = a > 0.15 && a < 0.95 ? 0.0032 * Math.abs(Math.sin(Math.PI * 12 * a)) : 0;
  const le = flukeLeading(a);
  const te = flukeTrailing(a) + serration;
  const chord = Math.max(0, te - le);
  const thickness = 0.16 - 0.08 * a;
  out[0] = -(le + c * chord);
  out[1] = side * naca(c) * thickness * chord * 0.5;
  out[2] = (eta * WHALE.fluke.span) / 2;
  return out;
}

/** Dorsal fin in its frame (in lengths): forward (+x), up (+y), right (+z). */
function dorsalLocal(h: number, c: number, side: number, out: Vec3): Vec3 {
  const le = 0.034 * (1 - h) ** 1.2 - 0.056 * h ** 1.3;
  const te = -0.036 + 0.006 * h;
  const chord = Math.max(0, le - te);
  out[0] = le - c * chord;
  out[1] = h * 0.046 - 0.006;
  out[2] = side * naca(c) * 0.13 * chord * 0.5;
  return out;
}

// --- writing positions ---------------------------------------------------------------------------------

/** Basis of a pectoral fin in the body frame: axes (along, chord, thickness) and root (in lengths). */
function pectoralFrame(k: WhaleKinematics, side: 1 | -1): { axes: [Vec3, Vec3, Vec3]; root: Vec3 } {
  const angles = k.pectorals[side === 1 ? 0 : 1];
  const { sweep, droop, pitch } = angles;
  const span: Vec3 = [-Math.sin(sweep) * Math.cos(droop), -Math.sin(droop), side * Math.cos(sweep) * Math.cos(droop)];
  // Chord: backward, perpendicular to the fin, rotated by the pitch about the fin.
  let chord: Vec3 = [-1, 0, 0];
  const d = dot(chord, span);
  chord = normalize([chord[0] - d * span[0], chord[1] - d * span[1], chord[2] - d * span[2]]);
  chord = rotateAround(chord, span, side * pitch);
  // Thickness: the top face of the fin.
  let thick = cross(chord, span);
  if (thick[1] < 0) thick = [-thick[0], -thick[1], -thick[2]];
  const { s, phi } = WHALE.pectoral;
  const root = bodyPoint(s, side * phi, k.beat, [0, 0, 0], 0.8);
  return { axes: [span, chord, thick], root };
}

/** Point on the body surface (in lengths, body frame) at (s, φ); `inset` sinks it toward the spine. */
function bodyPoint(s: number, phi: number, beat: number, out: Vec3, inset = 1): Vec3 {
  const cs: [number, number] = [0, 0];
  section(s, phi, cs);
  const { y, slope } = spine(s, beat);
  const a = Math.atan(slope);
  const x = WHALE.center - s;
  out[0] = x - cs[0] * inset * Math.sin(a);
  out[1] = y + cs[0] * inset * Math.cos(a);
  out[2] = cs[1] * inset;
  return out;
}

/** Fluke frame: origin on the spine and axes rotated by the tail slope and the pitch. */
function flukeFrame(k: WhaleKinematics): { origin: Vec3; angle: number } {
  const s = WHALE.fluke.s;
  const { y, slope } = spine(s, k.beat);
  return { origin: [WHALE.center - s, y + midline(s), 0], angle: Math.atan(slope) + k.flukePitch };
}

/** Dorsal fin frame: on the back at its s, with the slope of the spine. */
function dorsalFrame(k: WhaleKinematics): { origin: Vec3; angle: number } {
  const s = WHALE.dorsal.s;
  const { y, slope } = spine(s, k.beat);
  const top = halfTop(s) + hump(s) + midline(s);
  const a = Math.atan(slope);
  return { origin: [WHALE.center - s - top * Math.sin(a), y + top * Math.cos(a), 0], angle: a };
}

/**
 * Writes the world positions of a part into `out` (3 per vertex) for these kinematics. The body-frame
 * coordinates are in lengths; here they become meters and move to the world.
 */
export function writePart(part: WhalePart, k: WhaleKinematics, out: Float32Array): void {
  const P: Vec3 = [0, 0, 0];
  const Q: Vec3 = [0, 0, 0];
  const p = part.params;
  const put = (i: number, b: Vec3) => {
    for (let axis = 0; axis < 3; axis++) {
      out[i * 3 + axis] = k.origin[axis] + L * (k.forward[axis] * b[0] + k.up[axis] * b[1] + k.right[axis] * b[2]);
    }
  };
  if (part.name === 'body') {
    for (let i = 0; i < part.vertexCount; i++) {
      const s = p[i * 3];
      if (i === 0 || i === part.vertexCount - 1) {
        const { y } = spine(s, k.beat);
        P[0] = WHALE.center - s;
        P[1] = y + midline(s);
        P[2] = 0;
      } else bodyPoint(s, p[i * 3 + 1], k.beat, P);
      put(i, P);
    }
    return;
  }
  if (part.name === 'pectoralRight' || part.name === 'pectoralLeft') {
    const side = part.name === 'pectoralRight' ? 1 : -1;
    const { axes, root } = pectoralFrame(k, side);
    for (let i = 0; i < part.vertexCount; i++) {
      pectoralLocal(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], Q);
      for (let axis = 0; axis < 3; axis++) P[axis] = root[axis] + axes[0][axis] * Q[0] + axes[1][axis] * Q[1] + axes[2][axis] * Q[2];
      put(i, P);
    }
    return;
  }
  const frame = part.name === 'fluke' ? flukeFrame(k) : dorsalFrame(k);
  const ca = Math.cos(frame.angle);
  const sa = Math.sin(frame.angle);
  for (let i = 0; i < part.vertexCount; i++) {
    if (part.name === 'fluke') flukeLocal(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], Q);
    else dorsalLocal(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], Q);
    // Rotation in the sagittal plane (x, y) by the tail slope.
    P[0] = frame.origin[0] + Q[0] * ca - Q[1] * sa;
    P[1] = frame.origin[1] + Q[0] * sa + Q[1] * ca;
    P[2] = frame.origin[2] + Q[2];
    put(i, P);
  }
}

// --- intrinsic coordinates of a point (for painting the sampled points) ---------------------------------------

/** World point → body frame (in lengths). */
function toBody(k: WhaleKinematics, point: ArrayLike<number>): Vec3 {
  const d: Vec3 = [point[0] - k.origin[0], point[1] - k.origin[1], point[2] - k.origin[2]];
  return [dot(d, k.forward) / L, dot(d, k.up) / L, dot(d, k.right) / L];
}

/**
 * Intrinsic coordinates (the same as `WhalePart.params`) of a world point on a part, for these
 * kinematics: inverts the spine (body) or the rigid frame of each fin.
 */
export function partParamsAt(part: WhalePartName, k: WhaleKinematics, point: ArrayLike<number>): Vec3 {
  const b = toBody(k, point);
  if (part === 'body') {
    // Two passes: s approximated from x, the spine slope, and s again correcting for the rotation.
    let s = WHALE.center - b[0];
    let ycs = 0;
    for (let pass = 0; pass < 3; pass++) {
      const { y, slope } = spine(Math.min(1, Math.max(0, s)), k.beat);
      const a = Math.atan(slope);
      ycs = (b[1] - y) * Math.cos(a) - (b[0] - (WHALE.center - s)) * Math.sin(a);
      s = WHALE.center - (b[0] + ycs * Math.sin(a));
    }
    s = Math.min(1, Math.max(0, s));
    const yn = ycs - midline(s);
    const top = yn >= 0;
    const h = top ? halfTop(s) + hump(s) : halfBottom(s);
    const e = top ? topExponent(s) : bottomExponent(s);
    const cy = Math.sign(yn) * Math.pow(Math.min(1, Math.abs(yn) / Math.max(h, 1e-6)), 1 / e);
    const cz = Math.sign(b[2]) * Math.pow(Math.min(1, Math.abs(b[2]) / Math.max(halfWidth(s), 1e-6)), 1 / 0.85);
    return [s, Math.atan2(cz, cy), 0];
  }
  if (part === 'pectoralRight' || part === 'pectoralLeft') {
    const side = part === 'pectoralRight' ? 1 : -1;
    const { axes, root } = pectoralFrame(k, side);
    const d: Vec3 = [b[0] - root[0], b[1] - root[1], b[2] - root[2]];
    const u = Math.min(1, Math.max(0, dot(d, axes[0]) / WHALE.pectoral.length));
    const tub = pecTubercles(u);
    const le = 0.03 * u ** 1.6 - tub;
    const c = (dot(d, axes[1]) - le) / (pecChord(u) + tub);
    return [u, Math.min(1, Math.max(0, c)), dot(d, axes[2]) >= 0 ? 1 : -1];
  }
  const frame = part === 'fluke' ? flukeFrame(k) : dorsalFrame(k);
  const ca = Math.cos(frame.angle);
  const sa = Math.sin(frame.angle);
  const dx = b[0] - frame.origin[0];
  const dy = b[1] - frame.origin[1];
  const lx = dx * ca + dy * sa;
  const ly = -dx * sa + dy * ca;
  if (part === 'fluke') {
    const eta = Math.min(1, Math.max(-1, (2 * b[2]) / WHALE.fluke.span));
    const a = Math.abs(eta);
    const le = flukeLeading(a);
    const te = flukeTrailing(a);
    return [eta, Math.min(1, Math.max(0, (-lx - le) / Math.max(te - le, 1e-6))), ly >= 0 ? 1 : -1];
  }
  return [Math.min(1, Math.max(0, (ly + 0.006) / 0.046)), 0.5, b[2] >= 0 ? 1 : -1];
}

// --- coloring: the humpback's colors (linear albedo) ----------------------------------------------------------

// Slate back (not pure black): with the cold sky fill it reads against the void.
const DARK: Rgb = [0.032, 0.035, 0.042];
const JAW: Rgb = [0.05, 0.052, 0.058];
const WHITE: Rgb = [0.6, 0.6, 0.58];
const PEC_WHITE: Rgb = [0.68, 0.68, 0.66];

/** Angular width (from the belly) of the white area at s. */
const bellyWidth = curve([[0, 0.8], [0.06, 1.3], [0.2, 1.45], [0.38, 1.35], [0.5, 1.1], [0.6, 0.85], [0.72, 0.55], [0.85, 0.32], [1, 0.18]]);

function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const h = (i: number, j: number) => {
    const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * ux;
  const c = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * ux;
  return a + (c - a) * uy;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Body albedo at (s, φ): black back, white grooved belly, tubercles and mouth. */
function bodyAlbedo(s: number, phi: number): Rgb {
  // Angular distance to the belly (φ = π) and side.
  let d = Math.abs(((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
  const sideSign = Math.sin(phi) >= 0 ? 1 : -1;
  // Mottled border between the back and the belly.
  const edge = bellyWidth(s) + 0.2 * (noise2(s * 11 + (sideSign > 0 ? 0 : 40), d * 1.6) - 0.5) + 0.06 * (noise2(s * 43 + 7, d * 5) - 0.5);
  // Mottled back (not plastic): soft patches lighter and darker than the base slate.
  const mottle = 0.72 + 0.56 * (0.6 * noise2(s * 17 + 3, d * 3.3 + (sideSign > 0 ? 0 : 9)) + 0.4 * noise2(s * 53, d * 9.5 + 21));
  const back: Rgb = [DARK[0] * mottle, DARK[1] * mottle, DARK[2] * mottle];
  let color = mixRgb(back, WHITE, smoothstep(edge + 0.05, edge - 0.05, d));
  // Sides of the jaw slightly lighter than the rostrum, separated by the line of the mouth.
  if (s < 0.24) {
    const mouth = Math.PI / 2 + 0.08 + 0.34 * (s / 0.22) ** 1.6;
    const fromTop = Math.PI - d;
    if (fromTop > mouth && d > edge - 0.05) color = mixRgb(color, JAW, 0.8);
    const line = Math.abs(fromTop - mouth) * sectionRadius(s);
    if (line < 0.0035 && s < 0.225) color = mixRgb(color, [0.004, 0.004, 0.005], 1 - line / 0.0035);
    // Eye, just above the corner of the mouth.
    const eye = Math.hypot(s - 0.222, (fromTop - (mouth - 0.12)) * sectionRadius(s));
    if (eye < 0.009) color = eye < 0.005 ? [0.003, 0.003, 0.004] : mixRgb(color, [0.08, 0.08, 0.085], 0.6);
  }
  // Scattered black spots on the white: noise on rotated axes (no grid artifacts) and soft edges.
  if (d < edge) {
    const u = s * 26 + d * 3.1;
    const v = d * 5.2 - s * 9 + (sideSign > 0 ? 3 : 11);
    const spot = 0.65 * noise2(u, v) + 0.35 * noise2(u * 2.3 + 5, v * 2.3);
    color = mixRgb(color, DARK, smoothstep(0.7, 0.8, spot) * 0.8);
  }
  // Ventral grooves: dark lines from the chin to the navel that converge at the ends.
  if (s > 0.025 && s < 0.54) {
    const reach = (bellyWidth(s) - 0.12) * Math.sin((Math.PI * (s - 0.025)) / 0.515) ** 0.35;
    if (d < reach) {
      const u = d / reach;
      const groove = Math.abs(Math.sin(Math.PI * 9 * u));
      const k = 1 - smoothstep(0.12, 0.42, groove);
      color = mixRgb(color, [0.05, 0.05, 0.055], 0.85 * k * (1 - smoothstep(0.85, 1, u)));
    }
  }
  // Tubercles: lighter knobs on the dark rostrum (and the chin).
  const knob = knobAt(s, phi);
  if (knob > 0.25) color = mixRgb(color, [0.14, 0.14, 0.135], smoothstep(0.25, 0.7, knob));
  return color;
}

function pectoralAlbedo(u: number, c: number, side: number): Rgb {
  // White, with a dark root on the top face and a grey mottling that fades out.
  let color = PEC_WHITE;
  if (side > 0) {
    const edge = 0.22 + 0.12 * (noise2(u * 18, c * 6) - 0.5);
    color = mixRgb(DARK, PEC_WHITE, smoothstep(edge - 0.04, edge + 0.04, u));
  }
  const mottle = noise2(u * 40 + side * 7, c * 9);
  if (mottle > 0.78) color = mixRgb(color, [0.2, 0.2, 0.2], 0.5);
  // Leading edges (tubercles) with barnacles: even lighter little dots.
  return color;
}

function flukeAlbedo(eta: number, c: number, side: number): Rgb {
  if (side > 0) return mixRgb(DARK, [0.03, 0.032, 0.036], noise2(eta * 12, c * 4));
  // Underside: white with a black trailing edge and a pattern of its own (the "ID card" of each humpback).
  const a = Math.abs(eta);
  const pattern = noise2(eta * 4.2 + 2, c * 2.4) + 0.35 * noise2(eta * 11, c * 7);
  let dark = smoothstep(0.8, 0.9, c) + smoothstep(0.86, 0.96, a) + smoothstep(0.95, 1.08, pattern);
  // Dark patch at the root.
  dark += smoothstep(0.22, 0.1, a) * smoothstep(0.55, 0.2, c);
  return mixRgb(WHITE, DARK, Math.min(1, dark));
}

/** Albedo of a vertex or point of a part, from its intrinsic coordinates. */
export function whaleAlbedo(part: WhalePartName, params: ArrayLike<number>): Rgb {
  switch (part) {
    case 'body':
      return bodyAlbedo(params[0], params[1]);
    case 'pectoralRight':
    case 'pectoralLeft':
      return pectoralAlbedo(params[0], params[1], params[2]);
    case 'fluke':
      return flukeAlbedo(params[0], params[1], params[2]);
    case 'dorsal':
      return DARK;
  }
}

// --- vectors ----------------------------------------------------------------------------------------------

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: ArrayLike<number>, b: ArrayLike<number>): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Rodrigues: `v` rotated by `angle` about the unit axis `axis`. */
function rotateAround(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = cross(axis, v);
  const d = dot(axis, v) * (1 - c);
  return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d];
}
