// The golden-angle seeder (Sow): position of each seed, golden detent, named states, spokes and
// spiral estimate by continued fraction, and the note of each seed. Pure module.

import { GOLDEN_ANGLE } from '../specimens/spec';

export const DIAL_MIN = 120;
export const DIAL_MAX = 160;
/** Detent: within ±0.03° of the golden angle, the value snaps to it. */
export const GOLDEN_SNAP = 0.03;
/** The dial sweeps 300° of arc for 40° of divergence. */
export const DIAL_SWEEP = 300;
export const DIAL_PER_DEGREE = DIAL_SWEEP / (DIAL_MAX - DIAL_MIN);
/** Vernier: one degree of drag moves 0.0033°. */
export const VERNIER = 0.0033;
/** Sustained sowing. */
export const SOW_RATE = 30;
export const MAX_SEEDS = { desktop: 2400, phone: 800 } as const;
/** Seeds the section opens with (Fibonacci: the seed head already shows 34 · 55). */
export const START_SEEDS = 610;

export const ROOT2_TURN = 360 * (Math.SQRT2 - 1); // 149.1168…°

export interface NamedState {
  label: string;
  angle: number;
}

export const NAMED_STATES: NamedState[] = [
  { label: 'Golden 137.508°', angle: GOLDEN_ANGLE },
  { label: 'Spokes 137.3°', angle: 137.3 },
  { label: 'Near 137.6°', angle: 137.6 },
  { label: 'Fifths 144°', angle: 144 },
  { label: 'Thirds 120°', angle: 120 },
  { label: 'Root 2 turn 149.117°', angle: ROOT2_TURN },
];

export function clampAngle(angle: number): number {
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, angle));
}

/** Applies the golden detent. */
export function snapGolden(angle: number): { angle: number; snapped: boolean } {
  if (Math.abs(angle - GOLDEN_ANGLE) <= GOLDEN_SNAP) return { angle: GOLDEN_ANGLE, snapped: true };
  return { angle, snapped: false };
}

export function isGoldenAngle(angle: number): boolean {
  return Math.abs(angle - GOLDEN_ANGLE) < 1e-6;
}

/** Index of the matching named state (±0.0005°), or −1. */
export function namedIndex(angle: number): number {
  return NAMED_STATES.findIndex((s) => Math.abs(s.angle - angle) < 0.0005);
}

/** Next (or previous) named state from any angle; wraps around at the ends. */
export function stepNamed(angle: number, direction: 1 | -1): NamedState {
  const n = NAMED_STATES.length;
  let i = namedIndex(angle);
  if (i < 0) {
    // From an unnamed angle: the nearest one counts as the starting point.
    let best = Infinity;
    NAMED_STATES.forEach((s, j) => {
      const d = Math.abs(s.angle - angle);
      if (d < best) {
        best = d;
        i = j;
      }
    });
    if ((NAMED_STATES[i].angle - angle) * direction > 0) return NAMED_STATES[i];
  }
  return NAMED_STATES[(i + direction + n) % n];
}

/** Dial angle (degrees from 12 o'clock, clockwise) for a divergence: 120° at 7 o'clock, 160° at 5 o'clock. */
export function dialAngle(value: number): number {
  return -DIAL_SWEEP / 2 + (clampAngle(value) - DIAL_MIN) * DIAL_PER_DEGREE;
}

/** Divergence for a dial angle (degrees from 12 o'clock, clockwise), or null in the gap at the bottom. */
export function valueFromDial(dial: number): number | null {
  let a = ((dial % 360) + 540) % 360 - 180; // (−180, 180]
  if (Math.abs(a) > DIAL_SWEEP / 2 + 15) return null;
  a = Math.max(-DIAL_SWEEP / 2, Math.min(DIAL_SWEEP / 2, a));
  return DIAL_MIN + (a + DIAL_SWEEP / 2) / DIAL_PER_DEGREE;
}

/**
 * Position of seed n (from 0) in a disc of radius 1: θ = n·α, r = c·√(n + ½), with c such that
 * the seed head fills 80 % of the disc (the rest is for the ray petals), never scaled for fewer than
 * 144 seeds (a small seed head does not look huge).
 */
export function seedScale(count: number): number {
  return 0.8 / Math.sqrt(Math.max(count, 144) + 0.5);
}

export function seedPosition(n: number, alphaDeg: number, c: number): [number, number] {
  const theta = (n * alphaDeg * Math.PI) / 180;
  const r = c * Math.sqrt(n + 0.5);
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

/** Denominators of the convergents of the continued fraction of x ∈ (0, 1). */
export function convergentDenominators(x: number, limit = 1e6): number[] {
  // q₋₂ = 1, q₋₁ = 0, qₙ = aₙ·qₙ₋₁ + qₙ₋₂.
  const qs: number[] = [];
  let q2 = 1;
  let q1 = 0;
  let rest = x;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(rest + 1e-12);
    const q = a * q1 + q2;
    if (q > limit) break;
    qs.push(q);
    q2 = q1;
    q1 = q;
    const frac = rest - a;
    if (frac < 1e-9) break;
    rest = 1 / frac;
  }
  return qs;
}

export type Pattern = { kind: 'spokes'; count: number } | { kind: 'spirals'; a: number; b: number };

/**
 * What the seed head shows. If every q seeds come back almost to the same angle (along a spoke of
 * N/q seeds the accumulated drift stays under half the spacing between spokes, 180°/q), q straight
 * spokes are seen. Otherwise, the visible spirals are estimated from the two highest consecutive
 * denominators of the convergents of α/360° that do not exceed 2.3·√N.
 */
export function pattern(alphaDeg: number, seeds: number): Pattern {
  const x = alphaDeg / 360;
  const qs = convergentDenominators(x, 1e6);
  for (const q of qs) {
    if (q > 34) break;
    // Degrees a spoke drifts every q seeds.
    const drift = Math.abs(q * x - Math.round(q * x)) * 360;
    if (q > 1 && seeds * drift <= 180) return { kind: 'spokes', count: q };
  }
  const cap = 2.3 * Math.sqrt(Math.max(1, seeds));
  const under = qs.filter((q) => q <= cap);
  if (under.length >= 2) return { kind: 'spirals', a: under[under.length - 2], b: under[under.length - 1] };
  return { kind: 'spirals', a: 1, b: under[0] ?? 1 };
}

/** Readout: `spokes 5` or `visible spirals about 34 · 55 (estimated)`. */
export function patternText(p: Pattern): string {
  return p.kind === 'spokes' ? `spokes ${p.count}` : `visible spirals about ${p.a} · ${p.b} (estimated)`;
}

/** Text of the range control: "137.508 degrees, golden, about 34 and 55 spirals". */
export function dialValueText(alphaDeg: number, seeds: number): string {
  const p = pattern(alphaDeg, seeds);
  const parts = [`${alphaDeg.toFixed(3)} degrees`];
  if (isGoldenAngle(alphaDeg)) parts.push('golden');
  parts.push(p.kind === 'spokes' ? `${p.count} straight spokes` : `about ${p.a} and ${p.b} spirals`);
  return parts.join(', ');
}

/** `1,204` */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** C major pentatonic over two octaves (Hz): C D E G A. */
export const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

/** Note of seed n: the seed's angle (n·α mod 360) picks one of the 10 notes. */
export function seedNote(n: number, alphaDeg: number): number {
  const turn = (((n * alphaDeg) % 360) + 360) % 360;
  return Math.min(PENTATONIC.length - 1, Math.floor(turn / 36));
}

/** Color by birth order: chartreuse → pollen → honey → propolis (sRGB, 0–1). */
const BIRTH_STOPS: [number, number, number][] = [
  [0xc8 / 255, 0xf0 / 255, 0x3c / 255],
  [0xff / 255, 0xd2 / 255, 0x1f / 255],
  [0xf3 / 255, 0x9a / 255, 0x1a / 255],
  [0x8a / 255, 0x3a / 255, 0x12 / 255],
];

export function birthColor(u: number): [number, number, number] {
  const x = Math.min(0.9999, Math.max(0, u)) * (BIRTH_STOPS.length - 1);
  const i = Math.floor(x);
  const t = x - i;
  const a = BIRTH_STOPS[i];
  const b = BIRTH_STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** The seed nearest to a point of the disc, within `reach`; −1 if there is none. */
export function nearestSeed(x: number, y: number, alphaDeg: number, count: number, reach: number): number {
  const c = seedScale(count);
  // The radius bounds the range of n: r = c·√(n+½) → n ≈ (r/c)² − ½.
  const r = Math.hypot(x, y);
  const lo = Math.max(0, Math.floor(((r - reach) / c) ** 2 - 1));
  const hi = Math.min(count - 1, Math.ceil(((r + reach) / c) ** 2));
  let best = -1;
  let bestD = reach * reach;
  for (let n = lo; n <= hi; n++) {
    const [sx, sy] = seedPosition(n, alphaDeg, c);
    const d = (sx - x) ** 2 + (sy - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}
