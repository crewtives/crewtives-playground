// Rosette lathe: leaf k (k = 0 is the newest, at the center) of an echeveria or a spiral aloe, the
// "Stretch time" staircase, and the drop that runs down the spine of the leaves. Pure module: used
// by the low-poly geometry (three), the 2D view and the tests.

import { GOLDEN_ANGLE, type RosetteSpecies } from '../specimens/spec';

export type V3 = [number, number, number];

export interface RosetteParams {
  species: RosetteSpecies;
  leaves: number;
  plump: number;
  blush: number;
  /** "Stretch time": 0 rosette, 1 staircase (each leaf rises according to its birth). */
  stretch: number;
}

export interface Leaf {
  /** 0 = the newest leaf (center); K − 1 = the oldest (rim). */
  k: number;
  /** Relative age: 0 the newest, 1 the oldest. */
  age: number;
  azimuth: number;
  /** Tilt from vertical (rad). */
  tilt: number;
  length: number;
  width: number;
  /** Height of the base (time as height). */
  lift: number;
  dir: V3;
  side: V3;
  up: V3;
}

export const MAX_LEAVES = { desktop: 89, phone: 55 } as const;
/** Total height of the staircase with "Stretch time" at 1 (plant units). */
export const STAIR_HEIGHT = 1.5;
export const STRETCH_STOPS = [
  { label: 'Rosette', value: 0 },
  { label: 'Half', value: 0.5 },
  { label: 'Staircase', value: 1 },
];

/** Profiles (relative width from base to tip): round spoon and triangular blade. */
export const SPOON = [0.34, 0.66, 0.88, 1, 1, 0.9, 0.62, 0];
export const BLADE = [1, 0.86, 0.72, 0.58, 0.44, 0.3, 0.16, 0];

const deg = (d: number) => (d * Math.PI) / 180;

/** Divergence between leaves: golden in the echeveria; near 144° in the aloe, with its chirality. */
export function divergence(species: RosetteSpecies): number {
  if (species === 'echeveria') return GOLDEN_ANGLE;
  return (species === 'aloe-ccw' ? -1 : 1) * (144 + 4.2);
}

export function isAloe(species: RosetteSpecies): boolean {
  return species !== 'echeveria';
}

export function leafFrames(p: RosetteParams): Leaf[] {
  const K = Math.max(1, Math.round(p.leaves));
  const aloe = isAloe(p.species);
  const div = divergence(p.species);
  const hand = p.species === 'aloe-ccw' ? -1 : 1;
  const leaves: Leaf[] = [];
  for (let k = 0; k < K; k++) {
    const age = K === 1 ? 1 : k / (K - 1);
    const azimuth = deg(k * div);
    const tilt = deg(12 + 72 * Math.pow(age, 0.7));
    const length = 0.95 * (0.35 + 0.65 * Math.sqrt(age));
    const width = (aloe ? 0.26 : 0.36) * (0.55 + 0.45 * Math.sqrt(age));
    // Time as height: the oldest at the bottom, the newest at the top.
    const lift = K === 1 ? 0 : p.stretch * STAIR_HEIGHT * ((K - 1 - k) / (K - 1));
    const dir: V3 = [Math.cos(azimuth) * Math.sin(tilt), Math.sin(azimuth) * Math.sin(tilt), Math.cos(tilt)];
    // The hand (chirality) flips the side and the normal: the counterclockwise aloe is the exact
    // mirror image of the clockwise one.
    const side: V3 = [-hand * Math.sin(azimuth), hand * Math.cos(azimuth), 0];
    const up: V3 = [
      hand * (side[1] * dir[2] - side[2] * dir[1]),
      hand * (side[2] * dir[0] - side[0] * dir[2]),
      hand * (side[0] * dir[1] - side[1] * dir[0]),
    ];
    leaves.push({ k, age, azimuth, tilt, length, width, lift, dir, side, up });
  }
  return leaves;
}

/** Point on the leaf: s along it (0 base, 1 tip), `off` to the side, `bulge` upward. */
export function leafPoint(leaf: Leaf, s: number, off: number, bulge: number): V3 {
  return [
    leaf.dir[0] * s * leaf.length + leaf.side[0] * off + leaf.up[0] * bulge,
    leaf.dir[1] * s * leaf.length + leaf.side[1] * off + leaf.up[1] * bulge,
    leaf.lift + leaf.dir[2] * s * leaf.length + leaf.side[2] * off + leaf.up[2] * bulge,
  ];
}

/** Relative width of the profile at s (interpolated between stations). */
export function profileAt(species: RosetteSpecies, s: number): number {
  const profile = isAloe(species) ? BLADE : SPOON;
  const x = Math.min(1, Math.max(0, s)) * (profile.length - 1);
  const i = Math.min(profile.length - 2, Math.floor(x));
  return profile[i] + (profile[i + 1] - profile[i]) * (x - i);
}

/** Point on the leaf's spine (midrib), on top of the bulge. */
export function spinePoint(leaf: Leaf, s: number, p: RosetteParams): V3 {
  const bulge = (0.1 + 0.2 * p.plump) * leaf.width * profileAt(p.species, s);
  return leafPoint(leaf, s, 0, bulge + 0.012);
}

// ------------------------------------------------------------------ the water drop

export interface DropPath {
  /** Samples every 1/120 s: position and leaf (−1 in the air or at the center). */
  points: V3[];
  leafAt: number[];
  /** Leaves visited, in order (decreasing k indices). */
  leaves: number[];
  /** Total duration (s). */
  duration: number;
}

const DROP_STEP = 1 / 120;
const DROP_G = 9.8;
const DROP_DRAG = 0.6;
/** Where the drop leaves the leaf: in its lower third, above the inner leaf. */
const LEAVE_AT = 0.28;
/** Hop: how long the fall to the next leaf lasts (s). */
const HOP_TIME = 0.14;
/** Number of inner leaves among which the next one is searched for. */
const HOP_REACH = 21;

function lerp3(a: V3, b: V3, t: number): V3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function angularDistance(a: number, b: number): number {
  const d = Math.abs((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  return d;
}

/**
 * Next lower leaf: among the inner leaves (lower index, at most 21 further in), the one that lies
 * beneath the drop, that is, the one with the closest azimuth. With the golden angle the jump lands
 * on Fibonacci numbers (13, 8, 5…): the drop runs down a parastichy. −1 if none is left.
 */
export function nextLeaf(leaves: Leaf[], k: number): number {
  let best = -1;
  let bestD = Infinity;
  for (let j = k - 1; j >= Math.max(0, k - HOP_REACH); j--) {
    const d = angularDistance(leaves[j].azimuth, leaves[k].azimuth);
    if (d < bestD - 1e-9) {
      bestD = d;
      best = j;
    }
  }
  return best;
}

/**
 * The drop lands on leaf `start` at `s0`, runs down its spine with a = g·sin(slope) − 0.6·v,
 * hops to the next lower leaf by index, and repeats down to the center, where it drips.
 */
export function dropPath(p: RosetteParams, start: number, s0 = 0.85): DropPath {
  const leaves = leafFrames(p);
  const points: V3[] = [];
  const leafAt: number[] = [];
  const visited: number[] = [];
  let k = Math.min(leaves.length - 1, Math.max(0, Math.round(start)));
  let s = s0;
  for (let guard = 0; guard < 200; guard++) {
    const leaf = leaves[k];
    visited.push(k);
    // Slope of the spine: 90° minus the tilt from vertical.
    const slope = Math.PI / 2 - leaf.tilt;
    const accel = DROP_G * Math.sin(slope);
    let v = 0;
    const next = k > 0 ? nextLeaf(leaves, k) : -1;
    const end = next >= 0 ? LEAVE_AT : 0;
    while (s > end) {
      points.push(spinePoint(leaf, s, p));
      leafAt.push(k);
      v += (accel - DROP_DRAG * v) * DROP_STEP;
      s -= (v * DROP_STEP) / leaf.length;
    }
    const from = spinePoint(leaf, Math.max(0, end), p);
    if (next < 0) {
      // Center: the drop comes to rest in the heart of the plant.
      const heart: V3 = [0, 0, leaves[0].lift];
      const steps = Math.round(0.12 / DROP_STEP);
      for (let i = 1; i <= steps; i++) {
        points.push(lerp3(from, heart, i / steps));
        leafAt.push(-1);
      }
      break;
    }
    // Hop: to the same distance from the axis, on the spine of the inner leaf.
    const target = leaves[next];
    const radius = Math.hypot(from[0], from[1]);
    const reach = target.length * Math.sin(target.tilt);
    const sNext = Math.min(0.95, Math.max(LEAVE_AT + 0.08, reach > 1e-6 ? radius / reach : 0.5));
    const to = spinePoint(target, sNext, p);
    const steps = Math.round(HOP_TIME / DROP_STEP);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const q = lerp3(from, to, t);
      // A short arc: the drop lifts off and falls.
      q[2] += 0.06 * Math.sin(Math.PI * t);
      points.push(q);
      leafAt.push(-1);
    }
    k = next;
    s = sNext;
  }
  return { points, leafAt, leaves: visited, duration: points.length * DROP_STEP };
}

/** `count` exposures spread in time along the path (the last one is the final drop). */
export function dropExposures(path: DropPath, count = 16): V3[] {
  const n = path.points.length;
  if (n === 0) return [];
  return Array.from({ length: count }, (_, i) => path.points[Math.round((i / (count - 1)) * (n - 1))]);
}

/** Position of the drop at `t` seconds. */
export function dropAt(path: DropPath, t: number): V3 {
  const i = Math.min(path.points.length - 1, Math.max(0, Math.floor(t / DROP_STEP)));
  return path.points[i];
}
