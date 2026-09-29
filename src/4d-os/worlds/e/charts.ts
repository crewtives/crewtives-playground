import { BAYER4, readToken, type Rgb8 } from '../../../engine/display/palette';
import type { TimeController } from '../../../engine/time/TimeController';
import { WHALE_FALL, dilationAt, fallRadius, properTime } from '../../../pipeline/scenes/whaleFall';

// Charts of landing E: measured strokes at 1/3 resolution, without antialiasing, with Bayer dithering and
// only palette colors, like the scene's display. Each one is redrawn whole when its clock's frame changes
// (they are small canvases) and when its size changes; at rest there is no work.

/** CSS pixels per chart pixel: the same grid as the display (--render-scale). */
const SCALE = 3;

const HEAT = ['--void', '--garnet', '--ember', '--flame', '--orange', '--gold', '--cream'];
const COLD = ['--void', '--night', '--deep', '--slate', '--periwinkle', '--ice'];
/** Color of the "NOW" by the direction of the chart's clock: rewinding, still, moving forward. */
const ACCENT: Record<number, string> = { [-1]: '--accent-rewind', 0: '--accent-hold', 1: '--accent-forward' };

type Palette = Record<string, Rgb8>;

function readPalette(names: string[]): Palette {
  const root = document.documentElement;
  const out: Palette = {};
  for (const name of names) out[name] = readToken(root, name) ?? [255, 0, 255];
  return out;
}

/** A pixel canvas that writes directly into ImageData. */
export class Pixels {
  readonly width: number;
  readonly height: number;
  private readonly image: ImageData;
  private readonly data: Uint8ClampedArray;
  readonly palette: Palette;

  constructor(width: number, height: number, palette: Palette) {
    this.width = width;
    this.height = height;
    this.image = new ImageData(Math.max(1, width), Math.max(1, height));
    this.data = this.image.data;
    this.palette = palette;
  }

  set(x: number, y: number, token: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const c = this.palette[token];
    const o = (y * this.width + x) * 4;
    this.data[o] = c[0];
    this.data[o + 1] = c[1];
    this.data[o + 2] = c[2];
    this.data[o + 3] = 255;
  }

  fill(token: string): void {
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) this.set(x, y, token);
  }

  /** A 0–1 level on a ramp, with ordered dithering: the value falls between two neighboring colors. */
  level(x: number, y: number, value: number, ramp: string[]): void {
    const v = Math.min(1, Math.max(0, value)) * (ramp.length - 1);
    const i = Math.floor(v);
    const step = v - i > BAYER4[(y & 3) * 4 + (x & 3)] ? i + 1 : i;
    this.set(x, y, ramp[Math.min(ramp.length - 1, step)]);
  }

  /** Whether pixel (x, y) is still in color `token` (for example, the void: the grid can go there). */
  is(x: number, y: number, token: string): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const c = this.palette[token];
    const o = (y * this.width + x) * 4;
    return this.data[o] === c[0] && this.data[o + 1] === c[1] && this.data[o + 2] === c[2];
  }

  /** Dither threshold at (x, y): to decide whether a "density" pixel turns on. */
  static threshold(x: number, y: number): number {
    return BAYER4[(y & 3) * 4 + (x & 3)];
  }

  line(x0: number, y0: number, x1: number, y1: number, token: string, dotted = false): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let n = 0;
    for (;;) {
      if (!dotted || n % 2 === 0) this.set(x0, y0, token);
      n++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  put(ctx: CanvasRenderingContext2D): void {
    ctx.putImageData(this.image, 0, 0);
  }
}

export type ChartDraw = (px: Pixels, frame: number, allAtOnce: boolean) => void;

/**
 * Binds a pixel chart to a clock: the canvas is a whole multiple of 3 CSS px (so each chart pixel is one
 * block of the display) and is redrawn when the frame, the mode or the direction changes. The "NOW"
 * (`--accent-current`) takes the color of its own clock's direction, not the hero's: cyan while the
 * chart moves forward.
 */
export function bindChart(canvas: HTMLCanvasElement, time: TimeController, draw: ChartDraw, extraTokens: string[] = []): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const host = canvas.parentElement ?? canvas;
  const tokens = [...new Set([...HEAT, ...COLD, '--grid', '--bone', ...Object.values(ACCENT), ...extraTokens])];
  const palette = readPalette(tokens);
  let key = '';

  const render = (force = false) => {
    const width = Math.max(1, Math.floor(host.clientWidth / SCALE));
    const height = Math.max(1, Math.floor(host.clientHeight / SCALE));
    const state = `${width}x${height}:${time.frame}:${time.mode}:${time.direction}`;
    if (!force && state === key) return;
    key = state;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width * SCALE}px`;
      canvas.style.height = `${height * SCALE}px`;
    }
    palette['--accent-current'] = palette[ACCENT[time.direction]];
    const px = new Pixels(width, height, palette);
    draw(px, time.frame, time.mode === 'all');
    px.put(ctx);
  };
  const offTime = time.subscribe(() => render());
  const observer = new ResizeObserver(() => render(true));
  observer.observe(host);
  render(true);
  return () => {
    offTime();
    observer.disconnect();
  };
}

const lastFrame = (count: number) => Math.max(1, count - 1);
const gauss = (d: number, sigma: number) => Math.exp(-((d / sigma) ** 2));

// --- CH 3: the tail beat, heard from far away ------------------------------------------------------------

/** Maximum frequency of the beat axis (Hz). */
export const TRACE_MAX_HZ = 0.5;

/**
 * Beat waterfall: time runs down (one row per instant), frequency runs across. The whale beats at 0.5 Hz
 * of its own time; heard from far away, at 0.5·√(1 − r_s/r) Hz, with its harmonics, and ever weaker. What
 * has already happened goes on the heat ramp; in "all at once", what is still to come, on the cold one.
 */
export function traceChart(frameCount: number, fps: number): ChartDraw {
  const last = lastFrame(frameCount);
  return (px, frame, allAtOnce) => {
    const { width: W, height: H } = px;
    const sigma = Math.max(1.2, W / 18);
    for (let y = 0; y < H; y++) {
      const f = Math.round((y / Math.max(1, H - 1)) * last);
      const past = f <= frame;
      if (!past && !allAtOnce) {
        for (let x = 0; x < W; x++) px.set(x, y, '--void');
        continue;
      }
      const g = dilationAt(fallRadius(f / fps));
      const f0 = WHALE_FALL.beatHz * g;
      for (let x = 0; x < W; x++) {
        const hz = (x / Math.max(1, W - 1)) * TRACE_MAX_HZ;
        let intensity = 0;
        for (let k = 1; k <= 3; k++) intensity += (k === 1 ? 1 : k === 2 ? 0.42 : 0.2) * gauss(((hz - k * f0) / TRACE_MAX_HZ) * (W - 1), sigma);
        intensity *= 0.45 + 0.55 * g;
        if (past) px.level(x, y, intensity * 1.1, HEAT);
        else px.level(x, y, intensity * 0.62, COLD);
      }
    }
    // Grid: every 0.1 Hz and every 5 s, dotted, only where there is no signal.
    for (let hz = 0.1; hz < TRACE_MAX_HZ - 1e-6; hz += 0.1) {
      const x = Math.round((hz / TRACE_MAX_HZ) * (W - 1));
      for (let y = 0; y < H; y += 2) if (isVoid(px, x, y)) px.set(x, y, '--deep');
    }
    for (let s = 5; s * fps < last; s += 5) {
      const y = Math.round(((s * fps) / last) * (H - 1));
      for (let x = 0; x < W; x += 2) if (isVoid(px, x, y)) px.set(x, y, '--deep');
    }
    const now = Math.round((frame / last) * (H - 1));
    for (let x = 0; x < W; x++) px.set(x, now, '--accent-current');
  };
}

const isVoid = (px: Pixels, x: number, y: number) => px.is(x, y, '--void');

// --- CH 1 and CH 2: two-pen recorder -----------------------------------------------------------------------

/** Instant t (s) at which the whale's clock reads `tau` (bisection on τ(t), which is monotonic). */
export function timeAtProperTime(tau: number, horizon = 1000): number {
  let lo = 0;
  let hi = horizon;
  if (properTime(hi) < tau) return Infinity;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (properTime(mid) < tau) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Two pens on the same paper: on top, one tick per second of your clock; below, one per second of its
 * clock. Each pair of ticks with the same number is joined by a stroke that leans more and more.
 */
export function pensChart(frameCount: number, fps: number): ChartDraw {
  const last = lastFrame(frameCount);
  const duration = last / fps;
  const ticksIts: number[] = [];
  for (let k = 0; ; k++) {
    const t = timeAtProperTime(k);
    if (!(t <= duration + 1e-9)) break;
    ticksIts.push(t);
  }
  return (px, frame, allAtOnce) => {
    const { width: W, height: H } = px;
    px.fill('--void');
    const x = (t: number) => Math.round(1 + (t / duration) * (W - 3));
    const y1 = Math.round(H * 0.26);
    const y2 = Math.round(H * 0.76);
    const tick = Math.max(3, Math.round(H * 0.1));
    const now = frame / fps;
    const future = allAtOnce ? '--slate' : '--deep';
    // Strokes between tick k of your clock and tick k of its clock: they lean more and more.
    ticksIts.forEach((t, k) => {
      const done = t <= now;
      px.line(x(k), y1 + 2, x(t), y2 - 2, done ? '--periwinkle' : future, !done);
    });
    // Baselines: what each pen has already written and what is still to come.
    for (let xx = x(0); xx <= x(duration); xx++) {
      const t = ((xx - 1) / (W - 3)) * duration;
      px.set(xx, y1, t <= now ? '--bone' : future);
      px.set(xx, y2, t <= now ? '--bone' : future);
    }
    for (let k = 0; k <= Math.floor(duration + 1e-9); k++) {
      const done = k <= now;
      px.line(x(k), y1, x(k), y1 - tick, done ? '--bone' : future);
    }
    ticksIts.forEach((t, k) => {
      const done = t <= now;
      const g = dilationAt(fallRadius(t));
      const heat = done ? heatForDilation(g) : future;
      px.line(x(t), y2, x(t), y2 + tick, heat);
      if (k % 5 === 0 && done) px.set(x(t), y2 + tick + 2, heat);
    });
    const xn = x(now);
    px.line(xn, Math.max(0, y1 - tick - 3), xn, Math.min(H - 1, y2 + tick + 3), '--accent-current');
  };
}

/** Color of one of its ticks by its dτ/dt: ice far from the hole, flame at the end. */
function heatForDilation(g: number): string {
  const first = dilationAt(fallRadius(0));
  const final = dilationAt(fallRadius(WHALE_FALL.duration));
  const k = Math.min(1, Math.max(0, (first - g) / (first - final)));
  return ['--ice', '--cream', '--gold', '--orange', '--flame'][Math.min(4, Math.floor(k * 5))];
}

// --- Redshift: spectral waterfall ---------------------------------------------------------------------------

/** Wavelength axis of the spectrum (nm). */
export const SPECTRUM_RANGE: [number, number] = [300, 2300];
/** Visible band that the whale reflects (nm). */
export const VISIBLE: [number, number] = [380, 780];

/** Palette color that stands for an observed wavelength; above 780 nm, the infrared. */
function spectralToken(nm: number): string {
  if (nm < 440) return '--periwinkle';
  if (nm < 490) return '--ice';
  if (nm < 560) return '--cream';
  if (nm < 590) return '--gold';
  if (nm < 630) return '--orange';
  if (nm < 700) return '--flame';
  if (nm < 780) return '--ember';
  return '--garnet';
}

/**
 * Spectral waterfall: one row per frame (time runs down), wavelength across. The light the whale reflects
 * between 380 and 780 nm arrives stretched by 1 + z = 1/√(1 − r_s/r): the band shifts to the right,
 * widens and fades, until it leaves the visible range entirely.
 */
export function spectrumChart(frameCount: number, fps: number): ChartDraw {
  const last = lastFrame(frameCount);
  const [lo, hi] = SPECTRUM_RANGE;
  return (px, frame, allAtOnce) => {
    const { width: W, height: H } = px;
    px.fill('--void');
    const xOf = (nm: number) => ((nm - lo) / (hi - lo)) * (W - 1);
    for (let y = 0; y < H; y++) {
      const f = Math.round((y / Math.max(1, H - 1)) * last);
      const past = f <= frame;
      if (!past && !allAtOnce) continue;
      const g = dilationAt(fallRadius(f / fps));
      const stretch = 1 / g;
      const x0 = Math.ceil(xOf(VISIBLE[0] * stretch));
      const x1 = Math.floor(xOf(VISIBLE[1] * stretch));
      // The light arrives weaker (g from the photon rate): the dithering leaves fewer pixels on.
      const density = past ? 0.3 + 0.7 * g : 0.22 * g;
      for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        if (Pixels.threshold(x, y) > density) continue;
        const nm = lo + (x / (W - 1)) * (hi - lo);
        px.set(x, y, past ? spectralToken(nm) : '--slate');
      }
    }
    // Visible window (380–780 nm) and ticks every 400 nm.
    for (const nm of VISIBLE) {
      const x = Math.round(xOf(nm));
      for (let y = 0; y < H; y += 2) px.set(x, y, '--ice');
    }
    for (let nm = 400; nm < hi; nm += 400) {
      const x = Math.round(xOf(nm));
      for (let y = 1; y < H; y += 4) if (isVoid(px, x, y)) px.set(x, y, '--deep');
    }
    const now = Math.round((frame / last) * (H - 1));
    for (let x = 0; x < W; x++) if (x % 2 === 0 || !isVoid(px, x, now)) px.set(x, now, '--accent-current');
  };
}

// --- Horizon: r(t) up to twice the clip --------------------------------------------------------------------------

/**
 * Distance to the horizon against your time, up to twice the clip: the curve drops and flattens above
 * r = r_s without touching it. The clip's duration is drawn solid; what follows, dotted: frames that never arrive.
 */
export function approachChart(frameCount: number, fps: number): ChartDraw {
  const last = lastFrame(frameCount);
  const clip = last / fps;
  const span = clip * 2;
  const top = 1 + WHALE_FALL.A;
  return (px, frame) => {
    const { width: W, height: H } = px;
    px.fill('--void');
    const x = (t: number) => Math.round(1 + (t / span) * (W - 3));
    const y = (r: number) => Math.round(2 + ((top - r) / (top - 1)) * (H - 5));
    // Horizon and end of the clip.
    for (let xx = 0; xx < W; xx += 2) px.set(xx, y(1), '--flame');
    for (let yy = 0; yy < H; yy += 2) px.set(x(clip), yy, '--grid');
    for (let s = 5; s < span; s += 5) for (let yy = 1; yy < H; yy += 4) if (isVoid(px, x(s), yy)) px.set(x(s), yy, '--deep');
    let prev: [number, number] | null = null;
    const steps = W * 2;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * span;
      const point: [number, number] = [x(t), y(fallRadius(t))];
      const inside = t <= clip;
      if (prev) px.line(prev[0], prev[1], point[0], point[1], inside ? '--bone' : '--periwinkle', !inside);
      prev = point;
    }
    const tNow = frame / fps;
    const cx = x(tNow);
    const cy = y(fallRadius(tNow));
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) px.set(cx + dx, cy + dy, '--accent-current');
  };
}
