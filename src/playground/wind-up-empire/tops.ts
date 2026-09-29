// Physics of the planet tops: the spin decays, the top leans and precesses more and more, and
// below ω = 6 rad/s it topples with two bounces. Pure module (used by the orrery and the tray).

/** Spin on load: the five world tops start fast and topple after ~14.6 s. */
export const LOAD_SPIN = 36;
export const TOPPLE_BELOW = 6;
/** Tilt of a toppled top (degrees). */
export const TOPPLED_TILT = 78;
/** Maximum tilt before toppling (degrees). */
const MAX_WOBBLE = 34;

export interface TopState {
  /** Spin speed (rad/s). */
  omega: number;
  /** Spin phase (rad). */
  spin: number;
  /** Axis tilt (degrees). */
  tilt: number;
  /** Precession phase (rad). */
  precession: number;
  /** Seconds since it started toppling, or null while it stands. */
  toppledFor: number | null;
}

export function createTop(omega = LOAD_SPIN): TopState {
  return { omega, spin: 0, tilt: 2, precession: 0, toppledFor: omega < TOPPLE_BELOW ? 1 : null };
}

/** Adds spin (flick, tap, survey). A toppled top rights itself. */
export function spinUp(top: TopState, delta: number): void {
  top.omega = Math.min(80, (top.toppledFor !== null ? 0 : top.omega) + delta);
  if (top.toppledFor !== null && top.omega >= TOPPLE_BELOW) {
    top.toppledFor = null;
    top.tilt = 3;
  }
}

/** Flick: the top now spins at `omega` if that is more than its current spin (and rights itself). */
export function spinTo(top: TopState, omega: number): void {
  const current = top.toppledFor !== null ? 0 : top.omega;
  spinUp(top, Math.max(0, omega - current));
}

/** Speed of a flick: ω₀ = clamp(|v|·0.08, 12, 80) with v in px/s. */
export function flickOmega(speedPxPerSecond: number): number {
  return Math.max(12, Math.min(80, speedPxPerSecond * 0.08));
}

/** true while the top is standing and spinning. */
export function isSpinning(top: TopState): boolean {
  return top.toppledFor === null && top.omega >= TOPPLE_BELOW;
}

/** Angle of a topple in progress: 78° − 18°·e^(−5t)·|cos 11t| (two visible bounces). */
export function toppleTilt(t: number): number {
  return TOPPLED_TILT - 18 * Math.exp(-5 * t) * Math.abs(Math.cos(11 * t));
}

/** Advances the physics. Returns 'topple' at the instant the top starts toppling. */
export function stepTop(top: TopState, dt: number): 'topple' | null {
  if (top.toppledFor !== null) {
    top.toppledFor += dt;
    top.tilt = toppleTilt(top.toppledFor);
    // Once on the floor, the leftover spin dies out quickly.
    top.omega = Math.max(0, top.omega - 12 * dt);
    top.spin += top.omega * dt * 0.2;
    return null;
  }
  // dω/dt = −0.08ω − 0.6: solving each step exactly keeps the time step from changing the topple.
  const decay = Math.exp(-0.08 * dt);
  top.omega = (top.omega + 7.5) * decay - 7.5;
  top.spin += top.omega * dt;
  top.tilt = Math.min(MAX_WOBBLE, top.tilt + (52 / Math.max(top.omega, 1)) * dt);
  top.precession += (9 / Math.max(top.omega, 1)) * dt;
  if (top.omega < TOPPLE_BELOW) {
    top.toppledFor = 0;
    return 'topple';
  }
  return null;
}

/** Time to topple from a spin ω₀, left untouched (s). */
export function timeToTopple(omega0: number): number {
  return Math.log((omega0 + 7.5) / (TOPPLE_BELOW + 7.5)) / 0.08;
}
