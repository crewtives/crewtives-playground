/**
 * Analytic two-bone IK in a plane (D6): law of cosines, with the middle joint always on the same side.
 * On the cat, the plane is each leg's sagittal plane (the local Z of its bones): hip → hock → ankle on
 * the hind leg and shoulder → elbow → wrist on the front leg, with the middle joint pointing backward.
 *
 * The distance to the target is softly clamped to the reach: near a straight leg the middle angle
 * changes infinitely fast with distance (the derivative of arccosine diverges), and a target that
 * grazes the reach would make the knee "pop". With the exponential knee the leg never fully straightens
 * and the angle changes at a bounded speed.
 */

export interface TwoBoneSolution {
  /** Absolute angle (rad, in the plane) of the first bone, from the root to the middle joint. */
  upper: number;
  /** Absolute angle of the second bone, from the middle joint to the tip. */
  lower: number;
  /** Middle joint. */
  mid: [number, number];
  /** Tip reached: the target, or the closest point within reach. */
  end: [number, number];
  /** Requested root → target distance, and the one used after clamping. */
  requested: number;
  distance: number;
}

/**
 * Distance clamped to the reach [|l1 − l2|, l1 + l2]: equal to `d` away from the edges and, inside the
 * `soft` band (a fraction of the total length), an exponential knee that approaches the maximum without
 * reaching it.
 */
export function clampReach(d: number, l1: number, l2: number, soft = 0.02): number {
  const max = l1 + l2;
  const min = Math.abs(l1 - l2) + 1e-6;
  const band = soft * max;
  const knee = max - band;
  let out = d;
  if (d > knee) out = knee + band * (1 - Math.exp(-(d - knee) / band));
  // Fully folded, the same thing happens on the other side: a wider knee, because the leg turns fast there.
  const fold = 3 * band;
  const floor = min + fold;
  if (d < floor) out = floor - fold * (1 - Math.exp(-(floor - d) / fold));
  return Math.min(max * (1 - 1e-9), Math.max(min, out));
}

/**
 * Solves the root → middle → tip chain so the tip reaches (tx, ty). `bend` picks the side of the middle
 * joint relative to the root → target line: +1 to the left (counterclockwise), −1 to the right.
 */
export function twoBoneIk(rx: number, ry: number, tx: number, ty: number, l1: number, l2: number, bend: 1 | -1, soft = 0.02): TwoBoneSolution {
  const dx = tx - rx;
  const dy = ty - ry;
  const requested = Math.hypot(dx, dy);
  const distance = clampReach(requested, l1, l2, soft);
  const base = requested > 1e-12 ? Math.atan2(dy, dx) : -Math.PI / 2;
  const cosA = (l1 * l1 + distance * distance - l2 * l2) / (2 * l1 * distance);
  const upper = base + bend * Math.acos(Math.min(1, Math.max(-1, cosA)));
  const mid: [number, number] = [rx + l1 * Math.cos(upper), ry + l1 * Math.sin(upper)];
  const end: [number, number] = [rx + distance * Math.cos(base), ry + distance * Math.sin(base)];
  const lower = Math.atan2(end[1] - mid[1], end[0] - mid[0]);
  return { upper, lower, mid, end, requested, distance };
}

/** Angle difference in (−π, π]. */
export function wrapAngle(a: number): number {
  let x = a % (2 * Math.PI);
  if (x <= -Math.PI) x += 2 * Math.PI;
  if (x > Math.PI) x -= 2 * Math.PI;
  return x;
}
