// Parlour Glass (4F): the geometry of the glass, pure. Coordinates centered on the center of the glass:
// u horizontal (0 = axis of symmetry), v downward. The mirror is u → −u, exact in floating point
// (only the sign changes), and two twin balls being exact reflections depends on that.
//
// The nails come from golden-angle phyllotaxis (θn = n·137.5078°, rn = 11√n) and are symmetrized
// by mode: MIRROR (bilateral), 6-FOLD and 8-FOLD (dihedral D6 and D8) or FREE (not symmetrized).

export type Symmetry = 'mirror' | 'six' | 'eight' | 'free';

/** Inner radius of the glass and of the ball; radius of the nails. */
export const GLASS_R = 196;
export const BALL_R = 5.5;
export const NAIL_R = 2;
/** Minimum distance between nail centers: free gap 16 − 2·2 = 12 > 11 (the ball's diameter). */
export const NAIL_SPACING = 16;
export const NAIL_MIN_R = 58;
/** Radius cap for the nails: 18 u fit between the last nail and the wall, so a ball never
 * gets wedged between a nail and the wall (and the launch rail stays clear). */
export const NAIL_MAX_R = 176;
const GOLDEN = (137.5078 * Math.PI) / 180;

/** The payout pocket (heso) at the center: the mouth between two posts. */
export const HESO = { u: 0, v: 0, mouth: 7.5, post: 10.5, postR: 2.5, bodyV: 14, bodyR: 9 } as const;
/** Two tulips on the axis, below the pocket. */
export const TULIPS = [
  { u: 0, v: 82 },
  { u: 0, v: 150 },
] as const;
/** Two mirrored windmills. */
export const WINDMILLS = [
  { u: -118, v: 80, side: -1 },
  { u: 118, v: 80, side: 1 },
] as const;
export const WINDMILL_BLADE = 20;
export const WINDMILL_HUB = 3;
/**
 * Rubber stops where each launcher's rail ends, at the top of the glass: a mirrored pair mounted on the
 * hoop at ±STOP_ANGLE from the axis. A ball launched very hard climbs hugging the hoop, outside the rosette;
 * it hits the stop on its side, the rubber eats almost all of its speed and it falls among the nails, instead of
 * going all the way around without touching a nail and leaving through the drain. The inner edge sits at
 * STOP_DIST − STOP_R = 190 from the center: between it and the edge of the last nail (176 + 2) there are 12 u, more than
 * the ball's diameter, so no ball gets wedged against the stop.
 */
export const STOP_ANGLE = (10 * Math.PI) / 180;
export const STOP_DIST = 194;
export const STOP_R = 4;
const STOP_U = STOP_DIST * Math.sin(STOP_ANGLE);
const STOP_V = -STOP_DIST * Math.cos(STOP_ANGLE);
export const STOPS = [
  { u: -STOP_U, v: STOP_V, side: -1 },
  { u: STOP_U, v: STOP_V, side: 1 },
] as const;
/** Nail-free zones around windmills, tulips and pocket. */
export const CLEAR_WINDMILL = 26;
export const CLEAR_TULIP = 20;
export const CLEAR_HESO = 22;

export interface Nail {
  u: number;
  v: number;
  /** Tone ring (0–24): 5 notes × 5 octaves by radius; the mirror twins share a tone. */
  ring: number;
}

/** true if (u, v) falls in a nail-free zone. */
export function inClearZone(u: number, v: number): boolean {
  for (const w of WINDMILLS) if (Math.hypot(u - w.u, v - w.v) < CLEAR_WINDMILL) return true;
  for (const t of TULIPS) if (Math.hypot(u - t.u, v - t.v) < CLEAR_TULIP) return true;
  return Math.hypot(u - HESO.u, v - HESO.v) < CLEAR_HESO;
}

function ringOf(u: number, v: number): number {
  const r = Math.hypot(u, v);
  return Math.max(0, Math.min(24, Math.floor(((r - NAIL_MIN_R) / (NAIL_MAX_R - NAIL_MIN_R + 1e-6)) * 25)));
}

function phyllotaxis(): [number, number][] {
  const out: [number, number][] = [];
  for (let n = 1; n <= 900; n++) {
    const r = 11 * Math.sqrt(n);
    if (r < NAIL_MIN_R || r > NAIL_MAX_R) continue;
    const a = n * GOLDEN;
    out.push([r * Math.sin(a), -r * Math.cos(a)]);
  }
  return out;
}

class Accepted {
  readonly points: [number, number][] = [];
  clear(u: number, v: number): boolean {
    for (const [pu, pv] of this.points) {
      const du = pu - u;
      const dv = pv - v;
      if (du * du + dv * dv < NAIL_SPACING * NAIL_SPACING) return false;
    }
    return true;
  }
}

function withRings(points: [number, number][]): Nail[] {
  return points.map(([u, v]) => ({ u, v, ring: ringOf(u, v) }));
}

/** Nails for the requested mode. Deterministic: there is no randomness in the layout of the glass. */
export function buildNails(symmetry: Symmetry): Nail[] {
  const accepted = new Accepted();
  const raw = phyllotaxis();

  if (symmetry === 'free') {
    for (const [u, v] of raw) {
      if (inClearZone(u, v) || !accepted.clear(u, v)) continue;
      accepted.points.push([u, v]);
    }
    return withRings(accepted.points);
  }

  if (symmetry === 'mirror') {
    for (const [u, v] of raw) {
      // The left half is used and reflected; a nail very close to the axis would collide with its reflection.
      if (u >= 0 || -u < NAIL_SPACING / 2) continue;
      if (inClearZone(u, v)) continue;
      if (!accepted.clear(u, v) || !accepted.clear(-u, v)) continue;
      accepted.points.push([u, v], [-u, v]);
    }
    return withRings(accepted.points);
  }

  // Dihedral D6 / D8: the vertical axis is one of the reflection axes.
  const k = symmetry === 'six' ? 6 : 8;
  const sector = (Math.PI * 2) / k;
  for (const [u0, v0] of raw) {
    const r = Math.hypot(u0, v0);
    // Angle from "up", clockwise toward +u; folded into the fundamental wedge [0, π/k].
    let theta = Math.atan2(u0, -v0);
    theta = ((theta % sector) + sector) % sector;
    if (theta > sector / 2) theta = sector - theta;
    // Orbit: k rotations and their k reflections (the reflection of rotation m is the exact mirror of k − m).
    const rot: [number, number][] = [];
    for (let m = 0; m < k; m++) {
      const a = theta + m * sector;
      rot.push([r * Math.sin(a), -r * Math.cos(a)]);
    }
    const orbit: [number, number][] = [...rot];
    for (let m = 0; m < k; m++) {
      const [u, v] = rot[(k - m) % k];
      orbit.push([-u, v]);
    }
    // An orbit whose points touch each other (near a reflection axis) is not used.
    let selfClear = true;
    for (let i = 0; i < orbit.length && selfClear; i++) {
      for (let j = i + 1; j < orbit.length; j++) {
        if (Math.hypot(orbit[i][0] - orbit[j][0], orbit[i][1] - orbit[j][1]) < NAIL_SPACING) {
          selfClear = false;
          break;
        }
      }
    }
    if (!selfClear) continue;
    if (!orbit.every(([u, v]) => accepted.clear(u, v))) continue;
    // Images that fall in a free zone are skipped; the rest of the orbit stays.
    for (const [u, v] of orbit) if (!inClearZone(u, v)) accepted.points.push([u, v]);
  }
  return withRings(accepted.points);
}

/** Static nail grid for fast neighbor lookup (16 u cells). */
export class NailGrid {
  readonly cell = 16;
  private readonly cells = new Map<number, number[]>();
  readonly nails: Nail[];

  constructor(nails: Nail[]) {
    this.nails = nails;
    nails.forEach((n, i) => {
      const key = this.key(Math.floor(n.u / this.cell), Math.floor(n.v / this.cell));
      const list = this.cells.get(key);
      if (list) list.push(i);
      else this.cells.set(key, [i]);
    });
  }

  private key(cx: number, cy: number): number {
    return (cx + 64) * 256 + (cy + 64);
  }

  /** Nail indices in the 9 cells around (u, v). */
  near(u: number, v: number, out: number[]): number[] {
    out.length = 0;
    const cx = Math.floor(u / this.cell);
    const cy = Math.floor(v / this.cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const list = this.cells.get(this.key(cx + ox, cy + oy));
        if (list) for (const i of list) out.push(i);
      }
    }
    return out;
  }
}
