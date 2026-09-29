import {
  beats,
  falconCenter,
  falconPose,
  FALCON_DIMS,
  goldenRectangles,
  GOLDEN_ANGLE,
  phaseAt,
  PHASE_LABELS,
  phyllotaxis,
  PHI,
  spiralAngle,
  spiralXZ,
  SPIRAL,
  strokeAngle,
  TIMES,
  wingbeatPhase,
  wingSkeleton,
  wingspan,
  type FalconPhase,
  type Vec3,
} from '../../../pipeline/scenes/falconPhi';

// The tube's plots (D, "Golden stoop"): every chart is a 1 px vector stroke on black glass, computed
// with `src/pipeline/scenes/falconPhi.ts`, the same module the bake uses. What is "stored" (what the beam has
// already written) goes in phosphor; the "NOW", in the color of the direction; φ, in gold.

export interface Ink {
  glass: string;
  dim: string;
  beam: string;
  hot: string;
  phi: string;
  forward: string;
  rewind: string;
  hold: string;
}

export function readInk(root: Element): Ink {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    glass: read('--glass', '#07060b'),
    dim: read('--beam-dim', '#14633f'),
    beam: read('--beam', '#3ad67c'),
    hot: read('--beam-hot', '#baffd2'),
    phi: read('--phi', '#ffc45a'),
    forward: read('--accent-forward', '#3fe0ff'),
    rewind: read('--accent-rewind', '#ff3fb0'),
    hold: read('--accent-hold', '#baffd2'),
  };
}

export const nowInk = (ink: Ink, direction: number) => (direction > 0 ? ink.forward : direction < 0 ? ink.rewind : ink.hold);

const LABEL = (size = 10) => `500 ${size}px Tektur, 'Arial Narrow', sans-serif`;

/**
 * A crisp 2D canvas at the screen's density: it draws in CSS pixels and repaints only when its size
 * changes or when asked to. It does not animate on its own.
 */
export class Plot {
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  dpr = 1;
  private readonly observer: ResizeObserver;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly paint: (plot: Plot) => void,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(() => {
      if (this.fit()) this.redraw();
    });
    this.observer.observe(canvas);
  }

  /** Fits the canvas to its box; returns whether it changed. */
  fit(): boolean {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(box.width));
    const height = Math.max(1, Math.round(box.height));
    if (width === this.width && height === this.height && dpr === this.dpr) return false;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    return true;
  }

  redraw(): void {
    if (this.width === 0) this.fit();
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.paint(this);
  }

  /** A coordinate aligned to the device pixel grid for a 1 px stroke. */
  crisp(value: number): number {
    return (Math.round(value * this.dpr - 0.5) + 0.5) / this.dpr;
  }

  dispose(): void {
    this.observer.disconnect();
  }
}

// --- stroke utilities --------------------------------------------------------------------------------

function polyline(ctx: CanvasRenderingContext2D, points: ArrayLike<number>, from = 0, to = points.length / 2): void {
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const x = points[i * 2];
    const y = points[i * 2 + 1];
    if (i === from) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left', size = 10): void {
  ctx.font = LABEL(size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** Uniform fit of a world box (x, z) into the canvas rectangle, with a margin. */
function fitBox(box: { minX: number; maxX: number; minY: number; maxY: number }, width: number, height: number, margin: number) {
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const scale = Math.min((width - margin * 2) / w, (height - margin * 2) / h);
  const ox = (width - w * scale) / 2 - box.minX * scale;
  const oy = (height - h * scale) / 2 - box.minY * scale;
  return { scale, x: (x: number) => ox + x * scale, y: (y: number) => oy + y * scale };
}

function boxOf(points: ArrayLike<number>) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  return { minX, maxX, minY, maxY };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// --- flight table ------------------------------------------------------------------------------------

/** Flight samples at 120 Hz: plan (x, z) and accumulated angle. They are computed once. */
export interface FlightTable {
  rate: number;
  duration: number;
  plan: Float32Array;
  theta: Float32Array;
  /** The (first) instant at which the accumulated angle equals θ, by binary search. */
  timeAtTheta(theta: number): number;
  /** The instant before t at which the angle was θ(t) − π/2, or null. */
  quarterEarlier(t: number): number | null;
}

let flight: FlightTable | null = null;

export function flightTable(duration = TIMES.duration): FlightTable {
  if (flight) return flight;
  const rate = 120;
  const count = Math.round(duration * rate) + 1;
  const plan = new Float32Array(count * 2);
  const theta = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const c = falconCenter(t);
    plan[i * 2] = c[0];
    plan[i * 2 + 1] = c[2];
    theta[i] = Math.max(i > 0 ? theta[i - 1] : 0, spiralAngle(t));
  }
  const timeAtTheta = (value: number) => {
    let lo = 0;
    let hi = count - 1;
    if (value <= theta[0]) return 0;
    if (value >= theta[hi]) {
      // The first sample that reaches the maximum.
      while (hi > 0 && theta[hi - 1] >= theta[count - 1]) hi--;
      return hi / rate;
    }
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (theta[mid] >= value) hi = mid;
      else lo = mid;
    }
    const a = theta[lo];
    const b = theta[hi];
    return (lo + (b > a ? (value - a) / (b - a) : 1)) / rate;
  };
  flight = {
    rate,
    duration,
    plan,
    theta,
    timeAtTheta,
    quarterEarlier(t: number) {
      const i = Math.round(clamp(t, 0, duration) * rate);
      const target = theta[i] - Math.PI / 2;
      if (target < 0) return null;
      return timeAtTheta(target);
    },
  };
  return flight;
}

// --- plan: the spiral being drawn ------------------------------------------------------------------

/** Labels of the quarter turns on the curve. */
const QUARTERS = ['0', 'π/2', 'π', '3π/2', '2π', '5π/2'];

export class PlanPlot {
  private readonly plot: Plot;
  private t = 0;
  private direction = 0;
  private readonly ideal: Float32Array;
  private readonly rects = goldenRectangles(8);
  private readonly box: { minX: number; maxX: number; minY: number; maxY: number };

  /**
   * `compact`: the phone's pocket plotter (~130 px). No ticked frame, no quarter labels and no scale
   * bar: what remains is the grid, the spiral, what is stored, the two radii and the cursor.
   */
  constructor(
    canvas: HTMLCanvasElement,
    private ink: Ink,
    private readonly compact = false,
  ) {
    const table = flightTable();
    // Ideal spiral: from θ = 0 to a quarter turn past the end of the stoop.
    const end = spiralAngle(TIMES.spiralEnd) + Math.PI;
    const steps = 360;
    this.ideal = new Float32Array((steps + 1) * 2);
    for (let i = 0; i <= steps; i++) {
      const [x, z] = spiralXZ((end * i) / steps);
      this.ideal[i * 2] = x;
      this.ideal[i * 2 + 1] = z;
    }
    const corners: number[] = [];
    for (const r of this.rects.slice(0, 1)) for (const p of r.rect) corners.push(p[0], p[1]);
    const all = new Float32Array([...table.plan, ...this.ideal, ...corners]);
    this.box = boxOf(all);
    this.plot = new Plot(canvas, () => this.paint());
  }

  setInk(ink: Ink): void {
    this.ink = ink;
    this.plot.redraw();
  }

  /** Instant and direction of the "NOW" (the whole frame, like the readouts). */
  set(t: number, direction: number): void {
    this.t = t;
    this.direction = direction;
    this.plot.redraw();
  }

  redraw(): void {
    this.plot.redraw();
  }

  private paint(): void {
    const { ctx, width, height } = this.plot;
    const ink = this.ink;
    const table = flightTable();
    const compact = this.compact;
    const map = fitBox(this.box, width, height, compact ? 8 : 22);
    const X = (x: number) => map.x(x);
    const Y = (z: number) => map.y(z);

    // Frame with ticks every 5 m, like a plotter (the CSS draws the pocket plotter's frame).
    ctx.strokeStyle = ink.dim;
    ctx.lineWidth = 1;
    if (!compact) this.paintFrame(X, Y);


    // Nested golden rectangles.
    ctx.strokeStyle = ink.dim;
    for (const square of this.rects) {
      ctx.beginPath();
      square.rect.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p[0]), Y(p[1])) : ctx.lineTo(X(p[0]), Y(p[1]))));
      ctx.closePath();
      ctx.moveTo(X(square.cut[0][0]), Y(square.cut[0][1]));
      ctx.lineTo(X(square.cut[1][0]), Y(square.cut[1][1]));
      ctx.stroke();
    }

    // The ideal curve, dotted; the quarter turns, labeled on it (the pole is left unmarked).
    const ideal = new Float32Array(this.ideal.length);
    for (let i = 0; i < ideal.length; i += 2) {
      ideal[i] = X(this.ideal[i]);
      ideal[i + 1] = Y(this.ideal[i + 1]);
    }
    ctx.setLineDash([1, 3]);
    ctx.strokeStyle = ink.beam;
    polyline(ctx, ideal);
    ctx.setLineDash([]);
    const px = X(0);
    const pz = Y(0);
    if (!compact) {
      QUARTERS.forEach((text, k) => {
        const [x, z] = spiralXZ((k * Math.PI) / 2);
        const sx = X(x);
        const sy = Y(z);
        const dx = sx - px;
        const dy = sy - pz;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 18) return;
        label(ctx, text, sx + (dx / d) * 11, sy + (dy / d) * 11, ink.beam, 'center', 10);
      });
    }

    // What is stored: the flight up to the "NOW".
    const now = Math.min(table.plan.length / 2 - 1, Math.floor(this.t * table.rate));
    const stored = new Float32Array((now + 1) * 2);
    for (let i = 0; i <= now; i++) {
      stored[i * 2] = X(table.plan[i * 2]);
      stored[i * 2 + 1] = Y(table.plan[i * 2 + 1]);
    }
    ctx.strokeStyle = ink.hot;
    ctx.lineWidth = 1.25;
    polyline(ctx, stored);
    ctx.lineWidth = 1;

    const accent = nowInk(ink, this.direction);
    const c = falconCenter(this.t);
    const cx = X(c[0]);
    const cy = Y(c[2]);
    // The two radii that give φ: a quarter turn earlier (gold) and now (the color of the present).
    if (this.t <= TIMES.spiralEnd) {
      const earlier = table.quarterEarlier(this.t);
      if (earlier !== null) {
        const e = falconCenter(earlier);
        ctx.strokeStyle = ink.phi;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.lineTo(X(e[0]), Y(e[2]));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ink.phi;
        ctx.fillRect(X(e[0]) - 1.5, Y(e[2]) - 1.5, 3, 3);
      }
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    // Cursor of the "NOW": a ring with the heading.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.stroke();
    const n = Math.min(table.plan.length / 2 - 1, now + 12);
    const hx = X(table.plan[n * 2]) - cx;
    const hy = Y(table.plan[n * 2 + 1]) - cy;
    const hd = Math.hypot(hx, hy);
    if (hd > 0.5) {
      ctx.beginPath();
      ctx.moveTo(cx + (hx / hd) * 4, cy + (hy / hd) * 4);
      ctx.lineTo(cx + (hx / hd) * 11, cy + (hy / hd) * 11);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    if (compact) return;

    // Scale bar: 5 m.
    const bar = 5 * map.scale;
    const bx = this.plot.crisp(16);
    const by = this.plot.crisp(height - 18);
    ctx.strokeStyle = ink.beam;
    ctx.beginPath();
    ctx.moveTo(bx, by - 3);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bar, by);
    ctx.lineTo(bx + bar, by - 3);
    ctx.stroke();
    label(ctx, '5 m', bx + bar + 6, by - 1, ink.beam);
  }

  /** The plotter frame with ticks every 5 m (every 10 m, longer). */
  private paintFrame(X: (x: number) => number, Y: (z: number) => number): void {
    const { ctx, width, height } = this.plot;
    const left = this.plot.crisp(6);
    const right = this.plot.crisp(width - 6);
    const top = this.plot.crisp(6);
    const bottom = this.plot.crisp(height - 6);
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.beginPath();
    for (let m = Math.ceil(this.box.minX / 5) * 5 - 20; m <= this.box.maxX + 20; m += 5) {
      const x = this.plot.crisp(X(m));
      if (x <= left + 2 || x >= right - 2) continue;
      const long = m % 10 === 0 ? 5 : 3;
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + long);
      ctx.moveTo(x, bottom);
      ctx.lineTo(x, bottom - long);
    }
    for (let m = Math.ceil(this.box.minY / 5) * 5 - 20; m <= this.box.maxY + 20; m += 5) {
      const y = this.plot.crisp(Y(m));
      if (y <= top + 2 || y >= bottom - 2) continue;
      const long = m % 10 === 0 ? 5 : 3;
      ctx.moveTo(left, y);
      ctx.lineTo(left + long, y);
      ctx.moveTo(right, y);
      ctx.lineTo(right - long, y);
    }
    ctx.stroke();
  }
}

// --- wingbeat oscilloscope ----------------------------------------------------------------------------

const PHASE_SHORT: Record<FalconPhase, string> = {
  flap: 'FLAP',
  glide: 'GLIDE',
  stoop: 'STOOP',
  'pull-out': 'PULL',
  landing: 'LAND',
  perched: 'PERCH',
};

export class ScopePlot {
  private readonly plot: Plot;
  private t = 0;
  private direction = 0;
  private readonly stroke: Float32Array;
  private readonly span: Float32Array;
  private readonly rate = 40;
  private readonly spanMax: number;

  constructor(
    canvas: HTMLCanvasElement,
    private ink: Ink,
  ) {
    const count = Math.round(TIMES.duration * this.rate) + 1;
    this.stroke = new Float32Array(count);
    this.span = new Float32Array(count);
    let max = 0;
    for (let i = 0; i < count; i++) {
      const t = i / this.rate;
      const phase = wingbeatPhase(t);
      // Wing position in the cycle: +1 up, −1 down (ψ = 0 up, π down); without flapping, level.
      this.stroke[i] = phase === null ? 0 : Math.cos(strokeAngle(phase));
      this.span[i] = wingspan(t);
      max = Math.max(max, this.span[i]);
    }
    this.spanMax = max;
    this.plot = new Plot(canvas, () => this.paint());
  }

  setInk(ink: Ink): void {
    this.ink = ink;
    this.plot.redraw();
  }

  set(t: number, direction: number): void {
    this.t = t;
    this.direction = direction;
    this.plot.redraw();
  }

  private paint(): void {
    const { ctx, width, height } = this.plot;
    const ink = this.ink;
    const labelW = 40;
    const x0 = labelW;
    const x1 = width - 4;
    const X = (t: number) => x0 + (t / TIMES.duration) * (x1 - x0);
    const strokeTop = 4;
    const strokeBottom = height * 0.46;
    const spanTop = height * 0.54;
    const spanBottom = height - 16;
    const now = Math.min(this.stroke.length - 1, Math.floor(this.t * this.rate));

    label(ctx, 'stroke', 0, (strokeTop + strokeBottom) / 2, ink.beam);
    label(ctx, 'span', 0, (spanTop + spanBottom) / 2, ink.beam);

    // Time axis: one tick per second and the phase changes labeled.
    ctx.strokeStyle = ink.dim;
    ctx.beginPath();
    const axis = this.plot.crisp(spanBottom + 2);
    ctx.moveTo(x0, axis);
    ctx.lineTo(x1, axis);
    for (let s = 0; s <= TIMES.duration; s++) {
      const x = this.plot.crisp(X(s));
      ctx.moveTo(x, axis);
      ctx.lineTo(x, axis + (s % 5 === 0 ? 4 : 2));
    }
    ctx.stroke();
    let previous: FalconPhase | null = null;
    for (let i = 0; i < this.stroke.length; i += 2) {
      const phase = phaseAt(i / this.rate);
      if (phase !== previous) {
        const x = X(i / this.rate);
        ctx.strokeStyle = ink.dim;
        ctx.beginPath();
        ctx.moveTo(this.plot.crisp(x), strokeTop);
        ctx.lineTo(this.plot.crisp(x), axis);
        ctx.stroke();
        label(ctx, PHASE_SHORT[phase], x + 3, height - 6, ink.beam, 'left', 9);
        previous = phase;
      }
    }

    // What is stored up to the "NOW".
    const strokeY = (v: number) => strokeTop + ((1 - v) / 2) * (strokeBottom - strokeTop);
    const spanY = (v: number) => spanBottom - (v / this.spanMax) * (spanBottom - spanTop);
    const a = new Float32Array((now + 1) * 2);
    const b = new Float32Array((now + 1) * 2);
    for (let i = 0; i <= now; i++) {
      const x = X(i / this.rate);
      a[i * 2] = x;
      a[i * 2 + 1] = strokeY(this.stroke[i]);
      b[i * 2] = x;
      b[i * 2 + 1] = spanY(this.span[i]);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = ink.beam;
    polyline(ctx, a);
    ctx.strokeStyle = ink.hot;
    polyline(ctx, b);

    const x = this.plot.crisp(X(this.t));
    ctx.strokeStyle = nowInk(ink, this.direction);
    ctx.beginPath();
    ctx.moveTo(x, strokeTop);
    ctx.lineTo(x, axis);
    ctx.stroke();
  }
}

// --- progressive drawing -----------------------------------------------------------------------------

/**
 * The beam writes a figure once, when it comes on screen: `progress` goes from 0 to 1 in `seconds`, in
 * steps (each frame of the beam), and then stays stored. With reduced motion it is drawn whole.
 */
export function writeOn(element: Element, seconds: number, draw: (progress: number) => void, reduced: boolean): () => void {
  draw(reduced ? 1 : 0);
  if (reduced) return () => {};
  let raf = 0;
  let done = false;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting || done) return;
      done = true;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / (seconds * 1000));
        draw(p);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
    { threshold: 0.35 },
  );
  observer.observe(element);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(raf);
  };
}

// --- §1 golden rectangles and spiral --------------------------------------------------------------

/** Nested golden rectangles, upright (the plan's rotation is undone), and the spiral through their corners. */
export function paintRectangles(plot: Plot, ink: Ink, progress: number): void {
  const { ctx, width, height } = plot;
  const levels = 9;
  const rects = goldenRectangles(levels);
  const c = Math.cos(-SPIRAL.rotation);
  const s = Math.sin(-SPIRAL.rotation);
  const upright = (p: [number, number]): [number, number] => [c * p[0] - s * p[1], s * p[0] + c * p[1]];
  const outer = rects[0].rect.map(upright);
  const flat: number[] = [];
  for (const p of outer) flat.push(p[0], p[1]);
  const map = fitBox(boxOf(flat), width, height, 18);
  const X = (p: [number, number]) => map.x(p[0]);
  const Y = (p: [number, number]) => map.y(p[1]);

  // First the rectangles, one after another; then the spiral.
  const rectShare = 0.55;
  const shown = Math.floor(clamp(progress / rectShare, 0, 1) * levels);
  ctx.lineWidth = 1;
  for (let k = 0; k < Math.max(1, shown); k++) {
    const square = rects[k];
    ctx.strokeStyle = k === 0 ? ink.beam : ink.dim;
    ctx.beginPath();
    square.rect.map(upright).forEach((p, i) => (i === 0 ? ctx.moveTo(X(p), Y(p)) : ctx.lineTo(X(p), Y(p))));
    ctx.closePath();
    const a = upright(square.cut[0]);
    const b = upright(square.cut[1]);
    ctx.moveTo(X(a), Y(a));
    ctx.lineTo(X(b), Y(b));
    ctx.stroke();
    if (k < 4) {
      // The side of square k, in powers of φ: 1, 1/φ, 1/φ², …
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const center = square.rect.map(upright).reduce<[number, number]>((acc, p) => [acc[0] + p[0] / 4, acc[1] + p[1] / 4], [0, 0]);
      const sx = X(mid) + (X(mid) - X(center)) * -0.35;
      const sy = Y(mid) + (Y(mid) - Y(center)) * -0.35;
      label(ctx, ['1', '1/φ', '1/φ²', '1/φ³'][k], sx, sy, ink.beam, 'center', 11);
    }
  }
  const spiralProgress = clamp((progress - rectShare) / (1 - rectShare), 0, 1);
  if (spiralProgress > 0) {
    const end = Math.PI * 2 * 2.5;
    const steps = Math.round(420 * spiralProgress);
    ctx.strokeStyle = ink.phi;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const p = upright(spiralXZ((end * i) / 420));
      if (i === 0) ctx.moveTo(X(p), Y(p));
      else ctx.lineTo(X(p), Y(p));
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// --- §1 phyllotaxis --------------------------------------------------------------------------------

export const SEED_COUNT = 900;

/** Vogel's disk: each seed turns by the golden angle from the previous one. One family of 21 spirals, brighter. */
export function paintSeeds(plot: Plot, ink: Ink, progress: number): void {
  const { ctx, width, height } = plot;
  const radius = Math.min(width, height) / 2 - 12;
  const c = radius / Math.sqrt(SEED_COUNT);
  const cx = width / 2;
  const cy = height / 2;
  const shown = Math.round(SEED_COUNT * progress);
  for (let k = 1; k <= shown; k++) {
    const [x, y] = phyllotaxis(k, c);
    const family = k % 21 === 0;
    ctx.fillStyle = family || k > shown - 24 ? ink.hot : ink.beam;
    const size = family ? 3.5 : 2.25;
    ctx.fillRect(cx + x - size / 2, cy + y - size / 2, size, size);
  }
  if (progress > 0 && shown > 1) {
    // The last step: two radii separated by the golden angle.
    const a = (shown - 1) * GOLDEN_ANGLE;
    const b = shown * GOLDEN_ANGLE;
    ctx.strokeStyle = ink.phi;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * radius * 0.28, cy + Math.sin(a) * radius * 0.28);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + Math.cos(b) * radius * 0.28, cy + Math.sin(b) * radius * 0.28);
    ctx.stroke();
  }
}

// --- §3 wingbeat ---------------------------------------------------------------------------------

export interface BeatStats {
  hz: number;
  cv: number;
  down: number;
}

/** Cruising wingbeat figures computed with `beats()`: mean frequency and variation of the duration. */
export function beatStats(): BeatStats {
  const flightBeats = beats().filter((b) => b.burst === 'flight');
  const durations = flightBeats.map((b) => b.duration);
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const sd = Math.sqrt(durations.reduce((a, d) => a + (d - mean) ** 2, 0) / durations.length);
  return { hz: 1 / mean, cv: sd / mean, down: 0.4 };
}

/** The wingbeat of the first seconds: bright downstroke, dim upstroke, each beat with its duration. */
export function paintStroke(plot: Plot, ink: Ink, progress: number, downFraction: number): void {
  const { ctx, width, height } = plot;
  const t0 = 0;
  const t1 = TIMES.flapEnd;
  const x0 = 8;
  const x1 = width - 8;
  const top = 26;
  const bottom = height - 22;
  const X = (t: number) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0);
  const Y = (v: number) => top + ((1 - v) / 2) * (bottom - top);
  const until = t0 + (t1 - t0) * progress;

  ctx.strokeStyle = ink.dim;
  ctx.beginPath();
  ctx.moveTo(x0, plot.crisp(Y(0)));
  ctx.lineTo(x1, plot.crisp(Y(0)));
  for (let s = 0; s <= t1; s += 0.5) {
    const x = plot.crisp(X(s));
    ctx.moveTo(x, bottom + 4);
    ctx.lineTo(x, bottom + (s % 1 === 0 ? 10 : 7));
  }
  ctx.stroke();
  // The last seconds label goes inward: to the left of its tick, not off the canvas.
  for (let s = 0; s <= t1; s += 1) {
    const last = s + 1 > t1;
    label(ctx, `${s} s`, X(s) + (last ? -3 : 3), bottom + 14, ink.beam, last ? 'right' : 'left', 9);
  }

  const list = beats().filter((b) => b.burst === 'flight' && b.start + b.duration > t0 && b.start < t1);
  // Unit of the durations row, at its head: "ms / beat" if it fits before the first figure; otherwise, "ms".
  const first = list.find((b) => b.start >= t0 && b.start + b.duration <= t1);
  ctx.font = LABEL(9);
  const firstLeft = first ? X(first.start + first.duration / 2) - ctx.measureText(String(Math.round(first.duration * 1000))).width / 2 : Infinity;
  const unit = x0 + ctx.measureText('ms / beat').width + 6 <= firstLeft ? 'ms / beat' : 'ms';
  label(ctx, unit, x0, top - 12, ink.beam, 'left', 9);
  for (const beat of list) {
    const start = Math.max(t0, beat.start);
    const end = Math.min(t1, beat.start + beat.duration, until);
    if (end <= start) continue;
    const steps = Math.max(2, Math.round((end - start) * 240));
    for (const part of ['down', 'up'] as const) {
      // The downstroke, fast, in the writing stroke; the upstroke, slow, in low phosphor.
      ctx.strokeStyle = part === 'down' ? ink.hot : ink.dim;
      ctx.lineWidth = part === 'down' ? 2 : 1;
      ctx.beginPath();
      let drawing = false;
      for (let i = 0; i <= steps; i++) {
        const t = start + ((end - start) * i) / steps;
        const phase = (t - beat.start) / beat.duration;
        const isDown = phase < downFraction;
        if ((part === 'down') !== isDown) {
          drawing = false;
          continue;
        }
        const y = Y(Math.cos(strokeAngle(phase)));
        if (!drawing) ctx.moveTo(X(t), y);
        else ctx.lineTo(X(t), y);
        drawing = true;
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    // Duration of each beat, in ms, above its start.
    if (beat.start >= t0 && beat.start + beat.duration <= until) {
      const x = plot.crisp(X(beat.start));
      ctx.strokeStyle = ink.dim;
      ctx.beginPath();
      ctx.moveTo(x, top - 4);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      label(ctx, String(Math.round(beat.duration * 1000)), X(beat.start + beat.duration / 2), top - 12, ink.beam, 'center', 9);
    }
  }
}

// --- §4 skeleton -------------------------------------------------------------------------------------

/** Three-quarter orthographic projection (body coordinates: x forward, y up, z right). */
function projector(yaw: number, pitch: number) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return (v: Vec3): [number, number] => {
    const x = v[0] * cy - v[2] * sy;
    const z = v[0] * sy + v[2] * cy;
    const y = v[1] * cp - z * sp;
    return [x, -y];
  };
}

/** The falcon's skeleton at instant t: body axis, three-bone wings, primaries and tail. */
export function paintSkeleton(plot: Plot, ink: Ink, t: number): void {
  const { ctx, width, height } = plot;
  const pose = falconPose(t);
  const project = projector(-0.62, 0.42);
  const scale = Math.min(width / 0.82, height / 0.5);
  const cx = width / 2;
  const cy = height * 0.52;
  const P = (v: Vec3): [number, number] => {
    const [x, y] = project(v);
    return [cx + x * scale, cy + y * scale];
  };
  const seg = (a: Vec3, b: Vec3, color: string, w = 1) => {
    const pa = P(a);
    const pb = P(b);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
  };
  const d = FALCON_DIMS;
  const head: Vec3 = d.headOffset;
  const tail: Vec3 = d.tailBase;
  seg(tail, head, ink.hot, 1.5);
  for (const side of [1, -1] as const) {
    const w = wingSkeleton(side === 1 ? pose.wings.right : pose.wings.left, side);
    seg(w.shoulder, w.elbow, ink.hot, 1.5);
    seg(w.elbow, w.wrist, ink.hot, 1.5);
    seg(w.wrist, w.hand, ink.hot, 1.5);
    for (const p of w.primaries) seg(p.base, p.tip, ink.beam);
    for (const joint of [w.shoulder, w.elbow, w.wrist]) {
      const [x, y] = P(joint);
      ctx.fillStyle = ink.hot;
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }
  // Fanned tail: five tail feathers spread according to the pose's spread.
  for (let i = -2; i <= 2; i++) {
    const a = (i / 2) * (pose.tail.spread / 2);
    const dir: Vec3 = [-Math.cos(a), -Math.sin(pose.tail.pitch) * 0.3, Math.sin(a)];
    seg(tail, [tail[0] + dir[0] * d.tailLength, tail[1] + dir[1] * d.tailLength, tail[2] + dir[2] * d.tailLength], ink.beam);
  }
  label(ctx, `t = ${t.toFixed(2)} s`, 6, height - 8, ink.beam, 'left', 9);
}

/** Phase label for the interface, in the tube's capitals. */
export const phaseName = (phase: FalconPhase) => PHASE_LABELS[phase].toUpperCase();

export { PHI };
