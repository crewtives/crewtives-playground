// Without WebGL2: everything in flat 2D with Canvas2D, with the same physics and the same pure
// modules. The Scope is a kaleidoscope that folds the object cell pixel by pixel (the same math as
// the shader), Sow draws its seeds, the lathe is seen from above (without "Stretch time") and the
// honeycomb draws its frame with the last 6 generations as offset outlines.

import type { Toy, ToyRenderer } from './bench/common';
import type { HiveController, HiveRenderer } from './hive/controller';
import { cellAt, cellCenter, frameSize } from './hive/hexLife';
import type { LatheController, LathePick, LatheRenderer } from './lathe/controller';
import { leafFrames } from './lathe/rosette';
import type { Chamber } from './scope/chamber';
import type { ScopeController, ScopeRenderer } from './scope/controller';
import { fold, type MirrorMode } from './scope/fold';
import type { SowController } from './sow/controller';
import { beadMesh, rosetteMesh, shadeFlat, specimenMesh, type MeshData, type V3 } from './specimens/mesh';
import { BEAD_STYLES_COUNT } from './specimens/beads';
import type { Specimen } from './specimens/spec';

const TAU = Math.PI * 2;
const SHEET = [253, 253, 246];
const LIGHT: V3 = (() => {
  const v: V3 = [-0.45, 0.45, 0.77];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

/** A canvas that fills its element, at the resolution of a display with `block` px blocks. */
function fitCanvas(host: HTMLElement, block: number, round = true): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'flat-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  if (round) canvas.style.borderRadius = '50%';
  host.append(canvas);
  const measure = () => {
    const w = Math.max(1, Math.round(host.clientWidth / block));
    const h = Math.max(1, Math.round(host.clientHeight / block));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.dispatchEvent(new Event('resized'));
    }
  };
  new ResizeObserver(measure).observe(host);
  measure();
  return canvas;
}

/** Paints a mesh from above in a 2D context (painter's order by height, flat shading). */
function drawMesh(ctx: CanvasRenderingContext2D, mesh: MeshData, map: (x: number, y: number) => [number, number], filter?: (tri: number) => boolean): void {
  const p = mesh.positions;
  const c = mesh.colors;
  const order: number[] = [];
  for (let t = 0; t < p.length / 9; t++) if (!filter || filter(t)) order.push(t);
  order.sort((a, b) => p[a * 9 + 2] + p[a * 9 + 5] + p[a * 9 + 8] - (p[b * 9 + 2] + p[b * 9 + 5] + p[b * 9 + 8]));
  for (const t of order) {
    const o = t * 9;
    const a: V3 = [p[o], p[o + 1], p[o + 2]];
    const b: V3 = [p[o + 3], p[o + 4], p[o + 5]];
    const d: V3 = [p[o + 6], p[o + 7], p[o + 8]];
    const [r, g, bl] = shadeFlat(a, b, d, [c[o], c[o + 1], c[o + 2]], LIGHT);
    ctx.fillStyle = `rgb(${r},${g},${bl})`;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(...map(a[0], a[1]));
    ctx.lineTo(...map(b[0], b[1]));
    ctx.lineTo(...map(d[0], d[1]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** A rAF loop that runs while any clock asks for it, and paints what changed. */
class FlatLoop {
  private raf = 0;
  private last = 0;
  private readonly tickers: ((dt: number) => boolean)[] = [];
  private readonly painters = new Set<() => void>();
  private readonly dirty = new Set<() => void>();

  add(ticker: (dt: number) => boolean): void {
    this.tickers.push(ticker);
  }

  paint(painter: () => void): void {
    this.painters.add(painter);
    this.dirty.add(painter);
    this.wake();
  }

  wake = (): void => {
    if (this.raf) return;
    this.raf = requestAnimationFrame((now) => this.frame(now));
  };

  private frame(now: number): void {
    this.raf = 0;
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    let alive = false;
    for (const tick of this.tickers) alive = tick(dt) || alive;
    for (const painter of this.dirty) painter();
    this.dirty.clear();
    if (alive) this.wake();
    else this.last = 0;
  }
}

// ------------------------------------------------------------------------------------------ Scope

class FlatScope implements ScopeRenderer {
  private readonly cell = document.createElement('canvas');
  private readonly cellCtx: CanvasRenderingContext2D;
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private readonly outputs: { canvas: HTMLCanvasElement; raw: boolean; lut: Float32Array | null; mode: MirrorMode | null }[] = [];
  private chamber: Chamber | null = null;
  private mode: MirrorMode = 'd5';
  private beta = 0;
  private exposures = true;

  constructor(
    private readonly loop: FlatLoop,
    hosts: { eyepiece: HTMLElement; inset: HTMLElement; peepholes: HTMLElement[] },
  ) {
    this.cell.width = this.cell.height = 256;
    this.cellCtx = this.cell.getContext('2d', { willReadFrequently: true })!;
    this.addOutput(hosts.eyepiece, 2, false);
    this.addOutput(hosts.inset, 2, true);
    for (const peephole of hosts.peepholes) this.addOutput(peephole, 3, false);
    for (let s = 0; s < BEAD_STYLES_COUNT; s++) this.sprites.set(`b${s}`, this.sprite(beadMesh(s), 40));
  }

  private addOutput(host: HTMLElement, block: number, raw: boolean): void {
    const canvas = fitCanvas(host, block);
    const out = { canvas, raw, lut: null as Float32Array | null, mode: null as MirrorMode | null };
    canvas.addEventListener('resized', () => {
      out.lut = null;
      this.paint();
    });
    this.outputs.push(out);
  }

  private sprite(mesh: MeshData, size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const h = size / 2;
    drawMesh(ctx, mesh, (x, y) => [h + x * h, h - y * h]);
    return canvas;
  }

  setSpecimens(specimens: Specimen[]): void {
    for (const s of specimens) if (!this.sprites.has(`s${s.uid}`)) this.sprites.set(`s${s.uid}`, this.sprite(specimenMesh(s.spec), 128));
  }

  sync(chamber: Chamber, mode: MirrorMode, beta: number, exposures: boolean): void {
    this.chamber = chamber;
    this.mode = mode;
    this.beta = beta;
    this.exposures = exposures;
    this.loop.paint(this.paint);
  }

  wake(): void {
    this.loop.wake();
  }

  private paint = (): void => {
    const chamber = this.chamber;
    if (!chamber) return;
    const ctx = this.cellCtx;
    const S = this.cell.width;
    ctx.fillStyle = '#fdfdf6';
    ctx.fillRect(0, 0, S, S);
    const toPx = (x: number, y: number): [number, number] => [((x + 1) / 2) * S, ((1 - y) / 2) * S];
    const draw = (sprite: HTMLCanvasElement, x: number, y: number, a: number, r: number, alpha: number) => {
      const [px, py] = toPx(x, y);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.rotate(-a);
      const size = r * S;
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    };
    for (const body of chamber.bodies) {
      const sprite = this.sprites.get(body.kind === 'bead' ? `b${body.key % BEAD_STYLES_COUNT}` : `s${body.key}`);
      if (!sprite) continue;
      if (this.exposures) {
        const n = body.trail.length;
        body.trail.forEach((e, i) => draw(sprite, e.x, e.y, e.a, body.r, 0.08 + 0.5 * (i / Math.max(1, n))));
      }
    }
    for (const body of chamber.bodies) {
      const sprite = this.sprites.get(body.kind === 'bead' ? `b${body.key % BEAD_STYLES_COUNT}` : `s${body.key}`);
      if (sprite) draw(sprite, body.x, body.y, body.a, body.r, 1);
    }
    const source = ctx.getImageData(0, 0, S, S).data;
    for (const out of this.outputs) this.fold(out, source, S);
  };

  /** Pixel-by-pixel folding: the table stores each pixel's folded point; the barrel rotates it. */
  private fold(out: (typeof this.outputs)[number], source: Uint8ClampedArray, S: number): void {
    const { canvas } = out;
    const N = canvas.width;
    const M = canvas.height;
    const mode = out.raw ? null : this.mode;
    if (!out.lut || out.mode !== mode) {
      out.mode = mode;
      const lut = new Float32Array(N * M * 2).fill(NaN);
      for (let j = 0; j < M; j++) {
        for (let i = 0; i < N; i++) {
          const x = ((i + 0.5) / N) * 2 - 1;
          const y = 1 - ((j + 0.5) / M) * 2;
          if (x * x + y * y > 1) continue;
          const [fx, fy] = mode ? fold(x, y, mode) : [x, y];
          lut[(j * N + i) * 2] = fx;
          lut[(j * N + i) * 2 + 1] = fy;
        }
      }
      out.lut = lut;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(N, M);
    const d = image.data;
    const lut = out.lut;
    const b = (this.beta * Math.PI) / 180;
    const cb = Math.cos(b);
    const sb = Math.sin(b);
    for (let p = 0; p < N * M; p++) {
      const fx = lut[p * 2];
      if (Number.isNaN(fx)) continue;
      const fy = lut[p * 2 + 1];
      const cx = fx * cb - fy * sb;
      const cy = fx * sb + fy * cb;
      const o = p * 4;
      if (cx * cx + cy * cy > 1) {
        d[o] = SHEET[0];
        d[o + 1] = SHEET[1];
        d[o + 2] = SHEET[2];
      } else {
        const si = (Math.min(S - 1, Math.floor(((1 - cy) / 2) * S)) * S + Math.min(S - 1, Math.floor(((cx + 1) / 2) * S))) * 4;
        d[o] = source[si];
        d[o + 1] = source[si + 1];
        d[o + 2] = source[si + 2];
      }
      d[o + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }
}

// ------------------------------------------------------------------------------------------ Sow

function flatSow(loop: FlatLoop, sow: SowController, host: HTMLElement): ToyRenderer {
  const canvas = fitCanvas(host, 1 / Math.min(2, window.devicePixelRatio || 1));
  const paint = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const S = canvas.width;
    const h = S / 2;
    ctx.fillStyle = '#fdfdf6';
    ctx.fillRect(0, 0, S, S);
    const count = sow.count;
    const c = sow.scale;
    const lit = Math.min(count, sow.bloomFront, Number.isFinite(sow.scrubAt) ? sow.scrubAt + 1 : count);
    const map = (x: number, y: number): [number, number] => [h + x * h, h - y * h];
    if (lit > 0) {
      ctx.fillStyle = '#8a3a12';
      ctx.beginPath();
      ctx.arc(h, h, (c * Math.sqrt(lit + 0.5) + 0.7 * c) * h * sow.grow(0), 0, TAU);
      ctx.fill();
    }
    const alpha = (sow.alpha * Math.PI) / 180;
    for (let n = 0; n < count; n++) {
      const dim = sow.dimmed(n);
      if (dim && n % 2) continue;
      const newest = n === count - 1 && !Number.isFinite(sow.scrubAt);
      const size = (dim ? 0.42 : newest ? 1.25 : 0.74) * c * h * (dim ? 1 : sow.grow(n));
      if (size <= 0.05) continue;
      const [x, y] = map(...sow.position(n));
      const [r, g, b] = newest ? [0.91, 0.09, 0.36] : dim ? [0.106, 0.059, 0.18] : sow.color(n);
      ctx.fillStyle = `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = -(n * alpha + (k / 6) * TAU);
        ctx.lineTo(x + size * Math.cos(a), y + size * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
      if (newest || n === sow.hover) {
        ctx.strokeStyle = '#1b0f2e';
        ctx.lineWidth = Math.max(2, size * 0.35);
        ctx.stroke();
      }
    }
  };
  canvas.addEventListener('resized', () => loop.paint(paint));
  loop.add((dt) => sow.tick(dt));
  return { sync: () => loop.paint(paint), wake: loop.wake };
}

// ------------------------------------------------------------------------------------------ lathe

function flatLathe(loop: FlatLoop, lathe: LatheController, host: HTMLElement): LatheRenderer {
  const canvas = fitCanvas(host, 1 / Math.min(2, window.devicePixelRatio || 1), false);
  canvas.style.borderRadius = '28px';
  // Without 3D there is no staircase: the "Stretch time" tab is not shown.
  const stretch = stretchBlock(host);
  if (stretch) stretch.hidden = true;
  let leafOfTri: number[] = [];
  let mesh: MeshData | null = null;
  let built = -1;
  const scale = () => canvas.width / 2 / 1.25;
  const paint = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const S = canvas.width;
    const h = S / 2;
    ctx.fillStyle = '#fdfdf6';
    ctx.fillRect(0, 0, S, S);
    if (built !== lathe.version) {
      built = lathe.version;
      leafOfTri = [];
      mesh = rosetteMesh({ ...lathe.params, stretch: 0 }, { raw: true, nowKeyline: true, grow: lathe.blooming ? (k) => lathe.grow(k) : undefined, leafOfTri });
    }
    const k = scale();
    const yaw = (lathe.yaw * Math.PI) / 180;
    const map = (x: number, y: number): [number, number] => {
      const rx = x * Math.cos(yaw) - y * Math.sin(yaw);
      const ry = x * Math.sin(yaw) + y * Math.cos(yaw);
      return [h + rx * k, h - ry * k];
    };
    // Soil of the pot.
    ctx.fillStyle = '#c15a1b';
    ctx.beginPath();
    ctx.arc(h, h, 0.71 * k, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8a3a12';
    ctx.beginPath();
    ctx.arc(h, h, 0.64 * k, 0, TAU);
    ctx.fill();
    if (mesh) drawMesh(ctx, mesh, map);
    const drop = lathe.drop;
    if (drop) {
      const i = Math.min(drop.path.points.length - 1, Math.floor(drop.t * 120));
      const shown = Math.floor((i / Math.max(1, drop.path.points.length - 1)) * 15);
      for (let s = 0; s <= shown && s < 15; s++) {
        const [x, y] = map(drop.shots[s][0], drop.shots[s][1]);
        ctx.fillStyle = `rgba(95,180,255,${0.18 + 0.5 * (s / 15)})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.04 * k, 0, TAU);
        ctx.fill();
      }
      const [x, y] = map(drop.path.points[i][0], drop.path.points[i][1]);
      ctx.fillStyle = '#5fb4ff';
      ctx.strokeStyle = '#1b0f2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 0.055 * k, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  };
  canvas.addEventListener('resized', () => loop.paint(paint));
  loop.add((dt) => lathe.tick(dt));
  return {
    sync: () => loop.paint(paint),
    wake: loop.wake,
    pick(clientX: number, clientY: number): LathePick | null {
      if (!mesh) return null;
      const box = host.getBoundingClientRect();
      const k = (box.width / 2 / 1.25);
      const sx = (clientX - box.left - box.width / 2) / k;
      const sy = -(clientY - box.top - box.height / 2) / k;
      const yaw = (-lathe.yaw * Math.PI) / 180;
      const x = sx * Math.cos(yaw) - sy * Math.sin(yaw);
      const y = sx * Math.sin(yaw) + sy * Math.cos(yaw);
      const p = mesh.positions;
      let best = -1;
      let bestZ = -Infinity;
      for (let t = 0; t < p.length / 9; t++) {
        const o = t * 9;
        if (!inTriangle(x, y, p[o], p[o + 1], p[o + 3], p[o + 4], p[o + 6], p[o + 7])) continue;
        const z = p[o + 2] + p[o + 5] + p[o + 8];
        if (z > bestZ) {
          bestZ = z;
          best = t;
        }
      }
      if (best < 0) return null;
      const leaf = leafOfTri[best];
      const frame = leafFrames(lathe.params)[leaf];
      return { leaf, s: Math.hypot(x, y) / Math.max(1e-6, frame.length * Math.sin(frame.tilt)) };
    },
  };
}

function stretchBlock(host: HTMLElement): HTMLElement | null {
  return host.closest('section')?.querySelector<HTMLElement>('.stretch') ?? null;
}

function inTriangle(x: number, y: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  const d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by);
  const d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy);
  const d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// ------------------------------------------------------------------------------------------ honeycomb

function flatHive(loop: FlatLoop, ctl: HiveController, host: HTMLElement): HiveRenderer {
  const canvas = fitCanvas(host, 1 / Math.min(2, window.devicePixelRatio || 1), false);
  const { w, h } = ctl.hive;
  const f = frameSize(w, h);
  const fit = () => {
    const W = canvas.width;
    const H = canvas.height;
    const k = Math.min(W / (f.width + 2.4), H / (f.height + 3.4));
    return { k, ox: W / 2, oy: H / 2 - 0.6 * k };
  };
  const hexPath = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      ctx.lineTo(x + r * Math.cos(a), y - r * Math.sin(a));
    }
    ctx.closePath();
  };
  const ramp = ['#f39a1a', '#d8801a', '#bd6a17', '#a45514', '#944613', '#8a3a12'];
  const paint = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fdfdf6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const { k, ox, oy } = fit();
    const at = (i: number): [number, number] => {
      const [cx, cy] = cellCenter(i % w, Math.floor(i / w));
      return [ox + (cx + f.x0) * k, oy - (cy + f.y0) * k];
    };
    // The last 6 generations, from oldest to newest, as offset outlines.
    const layers = ctl.hive.layers(6);
    for (let age = layers.length - 1; age >= 1; age--) {
      const cells = layers[age];
      ctx.strokeStyle = ramp[age];
      ctx.lineWidth = Math.max(1, k * 0.12);
      for (let i = 0; i < cells.length; i++) {
        if (!cells[i]) continue;
        const [x, y] = at(i);
        hexPath(ctx, x + age * k * 0.16, y + age * k * 0.22, k * 0.82);
        ctx.stroke();
      }
    }
    // Walls of the frame and the current generation.
    const cells = ctl.hive.cells;
    for (let i = 0; i < cells.length; i++) {
      const [x, y] = at(i);
      const g = ctl.grow(i);
      hexPath(ctx, x, y, k * 0.96);
      ctx.strokeStyle = '#f8c77a';
      ctx.lineWidth = Math.max(1, k * 0.1);
      ctx.stroke();
      if (!cells[i] || g <= 0.01) continue;
      const now = i === ctl.nowCell;
      const newborn = ctl.hive.newborn(i);
      hexPath(ctx, x, y, k * 0.84 * g);
      ctx.fillStyle = now ? '#e8175d' : newborn ? '#ffd21f' : '#f39a1a';
      ctx.fill();
      if (now || newborn) {
        ctx.strokeStyle = '#1b0f2e';
        ctx.lineWidth = Math.max(2, k * 0.16);
        ctx.stroke();
      }
      if (ctl.hive.capped(i)) {
        hexPath(ctx, x, y, k * 0.5 * g);
        ctx.fillStyle = '#fdfdf6';
        ctx.fill();
      }
    }
    if (ctl.focused) {
      const [x, y] = at(ctl.cursor);
      hexPath(ctx, x, y, k * 1.02);
      ctx.strokeStyle = '#1b0f2e';
      ctx.lineWidth = Math.max(3, k * 0.28);
      ctx.stroke();
    }
  };
  canvas.addEventListener('resized', () => loop.paint(paint));
  loop.add((dt) => ctl.tick(dt));
  return {
    sync: () => loop.paint(paint),
    wake: loop.wake,
    cellAt(clientX: number, clientY: number): number {
      const box = host.getBoundingClientRect();
      const ratio = canvas.width / box.width;
      const { k, ox, oy } = fit();
      const x = ((clientX - box.left) * ratio - ox) / k;
      const y = -((clientY - box.top) * ratio - oy) / k;
      return cellAt(x, y, w, h);
    },
  };
}

// ------------------------------------------------------------------------------------------ mounting

export function mountFlat(
  scope: ScopeController,
  hosts: { eyepiece: HTMLElement; inset: HTMLElement; peepholes: HTMLElement[] },
  toys: Record<'sow' | 'lathe' | 'hive', Toy>,
  views: { sow: HTMLElement; lathe: HTMLElement; hive: HTMLElement },
): void {
  const loop = new FlatLoop();
  loop.add((dt) => scope.tick(dt));
  scope.attach(new FlatScope(loop, hosts));
  toys.sow.attach(flatSow(loop, toys.sow as SowController, views.sow));
  toys.lathe.attach(flatLathe(loop, toys.lathe as LatheController, views.lathe));
  toys.hive.attach(flatHive(loop, toys.hive as HiveController, views.hive));
  document.documentElement.dataset.flat = 'true';
  // Development only: the tests read the state just as with WebGL.
  if (import.meta.env.DEV) Object.assign(window, { __bloomscope: { engine: null, controller: scope, toys } });
}
