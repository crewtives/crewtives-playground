// Equations of the "whale-fall" scene (D7, D9): a whale spiraling down toward a Schwarzschild black
// hole. Everything is a function of the coordinate time t (the clock of a distant observer, the one of
// the 4D pack): the radius, the orbit angle, the whale's proper time τ, the dilation and the redshift.
// Pure TypeScript, no DOM and no three: both the bake recipe and the page use it, so every readout of
// the "NOW" comes from here.

export type Vec3 = [number, number, number];
export type Rgb = [number, number, number];

export const WHALE_FALL = {
  /** Schwarzschild radius r_s (scene meters): everything is measured in r_s. */
  rs: 1,
  /** Fall r(t) = r_s·(1 + A·e^(−t/T)): starts at 7 r_s and tends to r_s without crossing it. */
  A: 6,
  /** Time constant of the fall (s). */
  T: 4,
  /**
   * Far-away tangential speed (r_s/s). Seen from afar, the whale circles the axis with
   * ω = Ω·(r_s/r)·(1 − r_s/r): the factor (1 − r_s/r) slows it down as it nears the horizon, and the
   * trail gets compressed.
   */
  omega: 3,
  /**
   * Funnel height: y = k·2√(r_s·(r − r_s)), the shape of Flamm's paraboloid, scaled. It is a framing
   * choice (the spiral goes down like a vortex toward the disk), not part of the physics.
   */
  funnel: 0.4,
  /** Orbit angle at t = 0 (rad). */
  angle0: 0,
  fps: 30,
  /** Clip duration (s). */
  duration: 15,
  /** Whale length, from the snout to the notch of the tail fluke (m). */
  whaleLength: 1.2,
  /** Fluke beat frequency, in proper time (Hz). */
  beatHz: 0.5,
  /**
   * Accretion disk (m): from the inner edge (the innermost stable orbit, 3 r_s) to the outer one, with
   * its temperature at the inner edge (K) and how the temperature falls off with r (T ∝ r^−falloff).
   */
  disk: { inner: 3, outer: 8, kelvin: 13000, falloff: 1.9 },
  /** Photon sphere (1.5 r_s) and apparent radius of the shadow (3√3/2 r_s). */
  photonSphere: 1.5,
  shadowRadius: (3 * Math.sqrt(3)) / 2,
  /** Fixed integration step (s). */
  step: 1 / 240,
} as const;

export const FRAME_COUNT = Math.round(WHALE_FALL.fps * WHALE_FALL.duration);

const { rs, A, T, omega: OMEGA, funnel: FUNNEL, step: STEP } = WHALE_FALL;

/** x(t) = r/r_s − 1: the distance to the horizon in Schwarzschild radii. */
export function horizonGap(t: number): number {
  return A * Math.exp(-Math.max(0, t) / T);
}

/** r(t): distance from the whale's center to the center of the black hole. */
export function fallRadius(t: number): number {
  return rs * (1 + horizonGap(t));
}

/** Factor √(1 − r_s/r): rate of proper time (dτ/dt) and of the light's redshift. */
export function dilationAt(r: number): number {
  return Math.sqrt(Math.max(0, 1 - rs / r));
}

/** Angular velocity seen from afar (rad/s) at distance r. */
export function angularVelocityAt(r: number): number {
  return OMEGA * (rs / r) * (1 - rs / r);
}

// --- fixed-step integration ----------------------------------------------------------------------

/** Table of τ and of the angle at nodes t = i·STEP (Simpson per step), up to one second after the clip. */
const TABLE_END = WHALE_FALL.duration + 1;
const NODES = Math.ceil(TABLE_END / STEP) + 1;
const tauTable = new Float64Array(NODES);
const angleTable = new Float64Array(NODES);
{
  const dTau = (t: number) => dilationAt(fallRadius(t));
  const dAngle = (t: number) => angularVelocityAt(fallRadius(t));
  angleTable[0] = WHALE_FALL.angle0;
  for (let i = 1; i < NODES; i++) {
    const t0 = (i - 1) * STEP;
    const t1 = i * STEP;
    const tm = (t0 + t1) / 2;
    tauTable[i] = tauTable[i - 1] + (STEP / 6) * (dTau(t0) + 4 * dTau(tm) + dTau(t1));
    angleTable[i] = angleTable[i - 1] + (STEP / 6) * (dAngle(t0) + 4 * dAngle(tm) + dAngle(t1));
  }
}

/** Hermite interpolation between table nodes, with the exact derivative at each node. */
function integrated(table: Float64Array, derivative: (t: number) => number, t: number): number {
  const u = Math.min(Math.max(t, 0), TABLE_END) / STEP;
  const i = Math.min(NODES - 2, Math.floor(u));
  const s = u - i;
  const t0 = i * STEP;
  const m0 = derivative(t0) * STEP;
  const m1 = derivative(t0 + STEP) * STEP;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * table[i] + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * table[i + 1] + (s3 - s2) * m1;
}

/** Whale's proper time at instant t: τ = ∫ √(1 − r_s/r) dt, integrated in fixed steps. */
export function properTime(t: number): number {
  return integrated(tauTable, (x) => dilationAt(fallRadius(x)), t);
}

/**
 * The same integral in closed form, for verification: with x = A·e^(−t/T),
 * τ(t) = 2T·(asinh √A − asinh √x).
 */
export function properTimeExact(t: number): number {
  return 2 * T * (Math.asinh(Math.sqrt(A)) - Math.asinh(Math.sqrt(horizonGap(t))));
}

/** Orbit angle (rad) at instant t, integrated in fixed steps. */
export function orbitAngle(t: number): number {
  return integrated(angleTable, (x) => angularVelocityAt(fallRadius(x)), t);
}

/** Phase of the fluke beat (rad): it advances with proper time, not with clock time. */
export function beatPhase(t: number): number {
  return 2 * Math.PI * WHALE_FALL.beatHz * properTime(t);
}

// --- full state ------------------------------------------------------------------------------------

export interface FallState {
  /** Coordinate time (s): the distant clock, the one of the 4D pack. */
  t: number;
  /** Whale's proper time (s). */
  tau: number;
  /** Distance to the center of the black hole (m) and in Schwarzschild radii. */
  r: number;
  rOverRs: number;
  /** Rate of the whale's clock seen from afar: dτ/dt = √(1 − r_s/r). */
  dilation: number;
  /** Gravitational redshift z = 1/√(1 − r_s/r) − 1. */
  redshift: number;
  /** Orbit angle (rad) and angular velocity seen from afar (rad/s). */
  angle: number;
  angularVelocity: number;
  /** Whale's center (m) and its velocity (m/s). */
  position: Vec3;
  velocity: Vec3;
  /** Direction of travel (unit) and heading in the XZ plane, atan2(z, x). */
  forward: Vec3;
  heading: number;
  /**
   * Bank (rad) toward the center of the turn: `turn`, the tilt from the orbit, plus `roll`, the final
   * roll (in proper time) with which the whale shows its belly and pectoral fins to the viewer.
   */
  bank: number;
  turn: number;
  roll: number;
  /** Beat phase (rad), in proper time. */
  beat: number;
}

/** Maximum bank from the turn (rad) and scale of the centripetal acceleration (m/s²). */
const TURN_BANK = 0.55;
const TURN_ACCEL = 1.1;
/** Final roll in proper time: the whale rolls over and shows its belly and pectoral fins to the viewer. */
const ROLL = { angle: 1.25, from: 6.9, to: 9.1 };

export function fallState(t: number): FallState {
  t = Math.max(0, t);
  const x = horizonGap(t);
  const r = rs * (1 + x);
  const dilation = dilationAt(r);
  const angle = orbitAngle(t);
  const w = angularVelocityAt(r);
  const tau = properTime(t);

  // Position on the funnel: height y, cylindrical radius ρ, angle θ (counterclockwise seen from +y).
  const y = FUNNEL * 2 * Math.sqrt(rs * (r - rs));
  const rho = Math.sqrt(Math.max(0, r * r - y * y));
  const dr = -(r - rs) / T;
  const dy = r > rs ? FUNNEL * Math.sqrt(rs / (r - rs)) * dr : 0;
  const drho = rho > 0 ? (r * dr - y * dy) / rho : 0;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const position: Vec3 = [rho * c, y, -rho * s];
  const velocity: Vec3 = [drho * c - rho * s * w, dy, -drho * s - rho * c * w];
  const speed = Math.hypot(...velocity);
  const forward: Vec3 = [velocity[0] / speed, velocity[1] / speed, velocity[2] / speed];

  // It leans toward the center of the turn according to the centripetal acceleration (v·ω).
  const turn = TURN_BANK * Math.tanh((speed * w) / TURN_ACCEL);
  const roll = ROLL.angle * smooth((tau - ROLL.from) / (ROLL.to - ROLL.from));
  return {
    t,
    tau,
    r,
    rOverRs: r / rs,
    dilation,
    redshift: 1 / dilation - 1,
    angle,
    angularVelocity: w,
    position,
    velocity,
    forward,
    heading: Math.atan2(forward[2], forward[0]),
    bank: turn + roll,
    turn,
    roll,
    beat: 2 * Math.PI * WHALE_FALL.beatHz * tau,
  };
}

/** State at frame f of the 4D pack (t = f / fps). */
export function fallStateAtFrame(frame: number, fps: number = WHALE_FALL.fps): FallState {
  return fallState(frame / fps);
}

function smooth(u: number): number {
  const v = Math.min(1, Math.max(0, u));
  return v * v * v * (v * (6 * v - 15) + 10);
}

// --- light -------------------------------------------------------------------------------------------

/**
 * Color (linear, brightest channel 1) of a black body at `kelvin`: Planck's law integrated against the
 * CIE 1931 color-matching functions (analytic fit by Wyman, Sloan and Shirley, 2013) and converted to
 * linear sRGB. Table on a logarithmic scale from 1000 K to 40 000 K.
 */
export function blackbody(kelvin: number): Rgb {
  const table = blackbodyTable();
  const u = ((Math.log(Math.min(Math.max(kelvin, BB_MIN), BB_MAX)) - Math.log(BB_MIN)) / (Math.log(BB_MAX) - Math.log(BB_MIN))) * (BB_STEPS - 1);
  const i = Math.min(BB_STEPS - 2, Math.floor(u));
  const f = u - i;
  return [0, 1, 2].map((k) => table[i * 3 + k] * (1 - f) + table[(i + 1) * 3 + k] * f) as Rgb;
}

const BB_MIN = 1000;
const BB_MAX = 40000;
const BB_STEPS = 256;
let bbTable: Float64Array | null = null;

function blackbodyTable(): Float64Array {
  if (bbTable) return bbTable;
  const lobe = (l: number, mu: number, s1: number, s2: number) => Math.exp(-0.5 * ((l - mu) / (l < mu ? s1 : s2)) ** 2);
  bbTable = new Float64Array(BB_STEPS * 3);
  for (let i = 0; i < BB_STEPS; i++) {
    const kelvin = Math.exp(Math.log(BB_MIN) + (i / (BB_STEPS - 1)) * (Math.log(BB_MAX) - Math.log(BB_MIN)));
    let X = 0;
    let Y = 0;
    let Z = 0;
    for (let l = 380; l <= 780; l += 5) {
      const planck = 1 / (l ** 5 * (Math.exp(1.4388e7 / (l * kelvin)) - 1));
      X += planck * (1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2));
      Y += planck * (0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1));
      Z += planck * (1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8));
    }
    const rgb = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z].map((v) => Math.max(0, v));
    const peak = Math.max(...rgb);
    for (let k = 0; k < 3; k++) bbTable[i * 3 + k] = rgb[k] / peak;
  }
  return bbTable;
}

/**
 * Redshift of a linear color with the factor g = √(1 − r_s/r): the hue shifts toward red (passing
 * through orange) as g drops, and the brightness dims with g. It is a color approximation, not a
 * spectral one: with g ≈ 1 the color does not change.
 */
export function redshiftColor(rgb: ArrayLike<number>, g: number): Rgb {
  const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const shift = smooth((1 - g - 0.03) / 0.6);
  const orange: Rgb = [luma * 1.75, luma * 0.86, luma * 0.36];
  const red: Rgb = [luma * 3.3, luma * 0.2, luma * 0.1];
  const a = Math.min(1, shift * 2);
  const b = Math.max(0, shift * 2 - 1);
  const dim = g;
  return [0, 1, 2].map((k) => (rgb[k] + (orange[k] - rgb[k]) * a + (red[k] - orange[k]) * b) * dim) as Rgb;
}

/**
 * Temperature of the accretion disk (K) at distance r: bluish white at the inner edge, orange and red
 * farther out. The profile is steeper than that of a thin disk (r^−3/4) so the gradient reads in a
 * few colors.
 */
export function diskTemperature(r: number): number {
  const { inner, kelvin, falloff } = WHALE_FALL.disk;
  return kelvin * Math.pow(inner / Math.max(r, inner), falloff);
}

/** Orbital speed of the disk gas at distance r, as a fraction of c: √(r_s / (2(r − r_s))). */
export function diskSpeed(r: number): number {
  return Math.min(0.6, Math.sqrt(rs / (2 * Math.max(r - rs, 1e-3))));
}

/**
 * Total shift factor of the disk light that reaches an observer: the relativistic Doppler shift of the
 * gas in counterclockwise orbit times the gravitational one. `toObserver` is the (unit) direction from
 * the disk point toward the viewer; `point` is the point (m).
 */
export function diskShift(point: ArrayLike<number>, toObserver: ArrayLike<number>): number {
  const r = Math.hypot(point[0], point[1], point[2]);
  const rho = Math.hypot(point[0], point[2]) || 1;
  const beta = diskSpeed(r);
  // Counterclockwise tangent seen from +y: (−sin θ, 0, −cos θ) with x = ρ cos θ, z = −ρ sin θ.
  const cosAngle = (point[2] / rho) * toObserver[0] - (point[0] / rho) * toObserver[2];
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  return dilationAt(r) / (gamma * (1 - beta * cosAngle));
}

/** Phase of the disk's vortex arms at (r, θ): logarithmic arms that trail outward. */
export function diskArmPhase(r: number, angle: number, arms = 3, pitch = 0.28): number {
  return arms * (angle + Math.log(r / WHALE_FALL.disk.inner) / Math.tan(pitch));
}
