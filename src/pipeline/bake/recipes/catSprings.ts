/**
 * Tabulated signals for the cat animation (D6): critically damped springs, zero-lag smoothing and
 * sampled curves. Everything is integrated once, in fixed steps of 1/240 s from the start of the table,
 * and stored: evaluating at any t, loose or in order, gives the same result. That is what a bake needs
 * when it requests frames out of order and several times each.
 */

/** Samples per second for every table. */
export const TABLE_RATE = 240;

export type Signal = (t: number) => number;

/** Curve sampled in fixed steps, with Catmull-Rom interpolation (continuous in velocity). */
export class SampledCurve {
  readonly values: Float64Array;
  readonly t0: number;
  readonly rate: number;

  constructor(values: Float64Array, t0: number, rate = TABLE_RATE) {
    this.values = values;
    this.t0 = t0;
    this.rate = rate;
  }

  get t1(): number {
    return this.t0 + (this.values.length - 1) / this.rate;
  }

  at(t: number): number {
    const v = this.values;
    const n = v.length;
    const x = Math.min(n - 1, Math.max(0, (t - this.t0) * this.rate));
    const i = Math.min(n - 2, Math.floor(x));
    const u = x - i;
    const p0 = v[Math.max(0, i - 1)];
    const p1 = v[i];
    const p2 = v[i + 1];
    const p3 = v[Math.min(n - 1, i + 2)];
    const u2 = u * u;
    return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (3 * p1 - p0 - 3 * p2 + p3) * u2 * u);
  }

  /** Derivative by central differences (1/s). */
  slope(t: number): number {
    const h = 1 / this.rate;
    return (this.at(t + h) - this.at(t - h)) / (2 * h);
  }
}

export function sampleCurve(signal: Signal, t0: number, t1: number, rate = TABLE_RATE): SampledCurve {
  const n = Math.max(2, Math.round((t1 - t0) * rate) + 1);
  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) values[i] = signal(t0 + i / rate);
  return new SampledCurve(values, t0, rate);
}

/** Half-life → damping of a critical spring (Holden, "Spring-It-On"). */
export function halflifeToDamping(halflife: number): number {
  return (4 * Math.LN2) / halflife;
}

/** One exact step of the critical spring toward `goal`, which is assumed to stay still during `dt`. */
export function criticalStep(state: { x: number; v: number }, goal: number, halflife: number, dt: number): void {
  const y = halflifeToDamping(halflife) / 2;
  const j0 = state.x - goal;
  const j1 = state.v + j0 * y;
  const e = Math.exp(-y * dt);
  state.x = e * (j0 + j1 * dt) + goal;
  state.v = e * (state.v - j1 * y * dt);
}

/**
 * Critical spring that follows a signal: it starts at rest on the signal at t0 and is integrated in
 * fixed steps. `halflife` may vary over time (for example, softer when setting down).
 */
export function springCurve(goal: Signal | SampledCurve, halflife: number | Signal, t0: number, t1: number, rate = TABLE_RATE): SampledCurve {
  const target = typeof goal === 'function' ? goal : (t: number) => goal.at(t);
  const life = typeof halflife === 'function' ? halflife : () => halflife;
  const n = Math.max(2, Math.round((t1 - t0) * rate) + 1);
  const values = new Float64Array(n);
  const state = { x: target(t0), v: 0 };
  values[0] = state.x;
  const dt = 1 / rate;
  for (let i = 1; i < n; i++) {
    // The goal is taken at the middle of the step: no half-step bias.
    const t = t0 + (i - 0.5) / rate;
    criticalStep(state, target(t), life(t), dt);
    values[i] = state.x;
  }
  return new SampledCurve(values, t0, rate);
}

/**
 * Spring chain: each link chases the previous one (the first chases the signal) with its own
 * half-life. With increasing half-lives, the motion travels down the chain with a delay, like a tail.
 */
export function springChain(goals: (Signal | SampledCurve)[], halflives: number[], t0: number, t1: number, coupling = 0.6): SampledCurve[] {
  const out: SampledCurve[] = [];
  goals.forEach((goal, k) => {
    const own = typeof goal === 'function' ? goal : (t: number) => goal.at(t);
    const previous = out[k - 1];
    // Each link blends its own goal with what the previous one does: the drag of the chain.
    const target = previous ? (t: number) => own(t) + coupling * (previous.at(t) - own(t)) : own;
    out.push(springCurve(target, halflives[k], t0, t1));
  });
  return out;
}

/** Centered Gaussian smoothing, with no lag (the signal is already baked, so the future is known). */
export function smoothCurve(curve: SampledCurve, sigma: number): SampledCurve {
  const v = curve.values;
  const n = v.length;
  const radius = Math.max(1, Math.ceil(3 * sigma * curve.rate));
  const weights = new Float64Array(radius * 2 + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k++) {
    const w = Math.exp(-0.5 * (k / (sigma * curve.rate)) ** 2);
    weights[k + radius] = w;
    sum += w;
  }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = -radius; k <= radius; k++) {
      // Reflected edges: no pull toward an unrelated value at the ends.
      let j = i + k;
      if (j < 0) j = -j;
      if (j >= n) j = 2 * (n - 1) - j;
      acc += v[Math.min(n - 1, Math.max(0, j))] * weights[k + radius];
    }
    out[i] = acc / sum;
  }
  return new SampledCurve(out, curve.t0, curve.rate);
}

/** Cumulative integral of a signal (trapezoidal rule in fixed steps). */
export function integrateCurve(rateOf: Signal, t0: number, t1: number, initial = 0, rate = TABLE_RATE): SampledCurve {
  const n = Math.max(2, Math.round((t1 - t0) * rate) + 1);
  const values = new Float64Array(n);
  values[0] = initial;
  let previous = rateOf(t0);
  for (let i = 1; i < n; i++) {
    const current = rateOf(t0 + i / rate);
    values[i] = values[i - 1] + ((previous + current) / 2) / rate;
    previous = current;
  }
  return new SampledCurve(values, t0, rate);
}

/** First t at which a non-decreasing curve reaches `value` (binary search + linear interpolation). */
export function firstTimeAt(curve: SampledCurve, value: number): number {
  const v = curve.values;
  if (value <= v[0]) return curve.t0;
  if (value > v[v.length - 1]) return Infinity;
  let lo = 0;
  let hi = v.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (v[mid] >= value) hi = mid;
    else lo = mid;
  }
  const span = v[hi] - v[lo];
  const u = span > 0 ? (value - v[lo]) / span : 0;
  return curve.t0 + (lo + u) / curve.rate;
}

/** Minimum-jerk profile (quintic): 0 → 1 with zero velocity and acceleration at the ends. */
export function minJerk(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x * x * x * (10 + x * (-15 + 6 * x));
}

/** Soft minimum: never greater than the minimum and continuous in its derivative (k: transition width). */
export function softMin(a: number, b: number, k: number): number {
  const m = Math.min(a, b);
  return m - k * Math.log(Math.exp((m - a) / k) + Math.exp((m - b) / k));
}

/**
 * Smooth lower envelope: the minimum over a window of ±`window` s, smoothed with a Gaussian of smaller
 * radius than the window. It never rises above the original curve and has no jumps: it suits a limit
 * that cannot be exceeded (a leg's reach).
 */
export function lowerEnvelope(curve: SampledCurve, window: number, sigma: number): SampledCurve {
  const v = curve.values;
  const r = Math.max(1, Math.round(window * curve.rate));
  const eroded = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) {
    let m = Infinity;
    for (let k = Math.max(0, i - r); k <= Math.min(v.length - 1, i + r); k++) m = Math.min(m, v[k]);
    eroded[i] = m;
  }
  const out = smoothCurve(new SampledCurve(eroded, curve.t0, curve.rate), sigma);
  for (let i = 0; i < v.length; i++) out.values[i] = Math.min(out.values[i], v[i]);
  return out;
}
