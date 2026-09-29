// The wind-up key: a one-way ratchet that stores energy. Pure module.
// - `Ratchet` turns circular dragging into detents (one every 45°, clockwise) and counterclockwise
//   dragging into ratchet clicks, without moving anything: the key never turns freely or by inertia.
// - `KeySpring` is the detent spring: θ'' = −420(θ − θd) − 18θ' (ζ ≈ 0.44, ~9.7° of overshoot),
//   plus the ±4° wobble that dies out in ~300 ms when the ratchet slips at the stop.

/** Degrees per detent: 8 detents per turn. */
export const DETENT_DEG = 45;
/** One ratchet click every 22.5° of counterclockwise drag. */
export const CLICK_DEG = 22.5;
const K = 420;
const C = 18;
/** How far the key gives between detents before it engages (the ratchet's "play"). */
const GIVE = 0.3;

export interface RatchetResult {
  /** New clockwise detents. */
  detents: number;
  /** Counterclockwise ratchet clicks (the key does not move). */
  clicks: number;
}

/** Wraps an angle in degrees into (−180, 180]. */
export function wrapDeg(a: number): number {
  let x = a % 360;
  if (x <= -180) x += 360;
  if (x > 180) x -= 360;
  return x;
}

export class Ratchet {
  /** Clockwise degrees accumulated since the last detent (0–45). */
  forward = 0;
  private backward = 0;

  /** Adds a pointer turn in degrees (positive = clockwise). */
  feed(deltaDeg: number): RatchetResult {
    if (deltaDeg >= 0) {
      this.backward = 0;
      this.forward += deltaDeg;
      const detents = Math.floor(this.forward / DETENT_DEG + 1e-9);
      this.forward -= detents * DETENT_DEG;
      return { detents, clicks: 0 };
    }
    // Counterclockwise: the ratchet clicks and the key stays where it is.
    this.backward -= deltaDeg;
    const clicks = Math.floor(this.backward / CLICK_DEG + 1e-9);
    this.backward -= clicks * CLICK_DEG;
    return { detents: 0, clicks };
  }

  /** How far the key yields toward the next detent while being dragged (degrees). */
  get give(): number {
    return Math.min(this.forward, DETENT_DEG - 1) * GIVE;
  }

  reset(): void {
    this.forward = 0;
    this.backward = 0;
  }
}

export class KeySpring {
  /** Displayed angle of the key (degrees, clockwise). */
  angle = 0;
  velocity = 0;
  /** Target: the stored wind as an angle (plus the play of the drag). */
  target = 0;
  private wobbleFor = -1;

  /** The ratchet slipped at the stop: a ±4° wobble that dies out in ~300 ms. */
  wobble(): void {
    this.wobbleFor = 0;
  }

  /** Jumps to the target without overshoot (reduced motion). */
  snap(): void {
    this.angle = this.target;
    this.velocity = 0;
    this.wobbleFor = -1;
  }

  /** Current wobble (degrees). */
  get wobbleOffset(): number {
    const t = this.wobbleFor;
    if (t < 0 || t > 0.3) return 0;
    return 4 * Math.exp(-t / 0.09) * Math.sin(2 * Math.PI * 11 * t);
  }

  /** The angle that gets drawn: the spring's angle plus the wobble. */
  get shown(): number {
    return this.angle + this.wobbleOffset;
  }

  get settled(): boolean {
    return Math.abs(this.angle - this.target) < 0.05 && Math.abs(this.velocity) < 0.5 && this.wobbleFor < 0;
  }

  /** Advances the spring (1/480 s substeps). Returns true while it moves. */
  step(dt: number): boolean {
    const h = Math.min(dt, 1 / 20);
    const n = Math.max(1, Math.ceil(h * 480));
    const sub = h / n;
    for (let i = 0; i < n; i++) {
      const acc = -K * (this.angle - this.target) - C * this.velocity;
      this.velocity += acc * sub;
      this.angle += this.velocity * sub;
    }
    if (this.wobbleFor >= 0) {
      this.wobbleFor += h;
      if (this.wobbleFor > 0.3) this.wobbleFor = -1;
    }
    if (this.settled) {
      this.angle = this.target;
      this.velocity = 0;
      return false;
    }
    return true;
  }
}

/** Angle of the pointer around a center, in degrees, growing clockwise on screen. */
export function pointerAngle(cx: number, cy: number, x: number, y: number): number {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
}
