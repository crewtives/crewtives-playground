// The orrery printed in 2D (Canvas2D), with the same geometry and the same flight model as the 3D
// lid: the Whirl with its golden spiral, the orbits with their state stroke, the flat tops on the
// rest spiral, the stars, the exposures of each flight (sparser the older they are, through
// dither density) and the halftone dither along the edges. Used by the print proof and by the lid
// without WebGL2. Everything is painted with the page's inks; in 1-bit, a final pass turns it into
// cobalt and paper with the same 8×8 Bayer dither.
import { bayer8 } from './bayerTile';
import type { StampedExposure } from './fleet';
import { HOME, LAB, WORLD_BODIES, WHIRL_RADIUS, type Vec2, type WorldBody, type WorldId } from './orbits';
import { worldPrint } from './worldInks';

export const PAGE_INKS = {
  ink: '#15131c',
  spaceDeep: '#0a0f4a',
  space: '#1b2cc4',
  spaceBright: '#4f7dff',
  sky: '#a9c8ff',
  vermilion: '#cc2216',
  oxblood: '#8e1a12',
  orange: '#ff7a1a',
  chrome: '#ffc81a',
  lemon: '#fff27a',
  turquoise: '#17b7a0',
  tealDeep: '#0b5f58',
  pink: '#ff6fae',
  tin: '#c7ccd4',
  tinShade: '#6f7686',
  paper: '#fbfaf6',
} as const;

/** Elevation of the lid camera: the ecliptic looks squashed by sin(44.4°). */
const SQUASH = Math.sin((44.4 * Math.PI) / 180);
const B = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2);

export interface OrreryPrint {
  /** Center of the Whirl on the canvas (px). */
  cx: number;
  cy: number;
  /** Pixels per unit. */
  scale: number;
  /** Current angle of each world (E..C). */
  angles: number[];
  charted: ReadonlySet<WorldId>;
  exposures: readonly StampedExposure[];
  /** Arms of the Whirl and bands of the tops (3, 5 or 8). */
  fold: number;
  mode: '1bit' | '16' | 'millions';
  /** Ghost path (dashed), while the rocket is being pulled back. */
  ghost?: Vec2[];
  /** Stars: how many, and with which seed. */
  stars?: number;
  /** Rectangle to paint as the background (the whole canvas by default). */
  field?: { x: number; y: number; w: number; h: number };
  /** The rocket in the home top's cradle: pull (0–1) and aim (rad). */
  cradle?: { pull: number; aim: number };
}

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** Projection from the ecliptic (x to the right, y away from the visitor) onto the canvas. */
export function project(p: OrreryPrint, x: number, y: number): Vec2 {
  return [p.cx + x * p.scale, p.cy - y * p.scale * SQUASH];
}

export function drawOrrery(ctx: CanvasRenderingContext2D, p: OrreryPrint): void {
  const f = p.field ?? { x: 0, y: 0, w: ctx.canvas.width, h: ctx.canvas.height };
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.x, f.y, f.w, f.h);
  ctx.clip();
  ctx.fillStyle = PAGE_INKS.space;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  drawStars(ctx, p, f);
  drawRings(ctx, p);
  drawWhirl(ctx, p);
  drawPlanets(ctx, p, 'back');
  drawExposures(ctx, p);
  if (p.ghost?.length) drawGhost(ctx, p, p.ghost);
  drawPlanets(ctx, p, 'front');
  if (p.cradle) {
    // Points toward the Whirl (rotated by the aim) and backs off with the pull.
    const heading = Math.PI / 2 - p.cradle.aim;
    const back = 0.35 * p.cradle.pull;
    const [sx, sy] = project(p, -Math.cos(heading) * back, -HOME.radius - Math.sin(heading) * back);
    rocket(ctx, sx, sy - HOME.topRadius * p.scale * 1.1, heading, 0.5 * p.scale, PAGE_INKS.vermilion, PAGE_INKS.chrome);
  }
  if (p.mode !== 'millions') drawEdgeShade(ctx, f);
  ctx.restore();
  if (p.mode === '1bit') oneInk(ctx, f);
}

function drawStars(ctx: CanvasRenderingContext2D, p: OrreryPrint, f: { x: number; y: number; w: number; h: number }): void {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const n = p.stars ?? 140;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    // Fibonacci spiral over the field: a nearly uniform sky, with no clumps.
    const r = Math.sqrt((i + 0.5) / n);
    const a = i * golden;
    const x = f.x + f.w * (0.5 + 0.52 * r * Math.cos(a));
    const y = f.y + f.h * (0.5 + 0.52 * r * Math.sin(a));
    const size = 1.5 + 4 * rand() * rand();
    const hue = rand();
    ctx.fillStyle = hue < 0.62 ? PAGE_INKS.chrome : hue < 0.85 ? PAGE_INKS.sky : PAGE_INKS.spaceBright;
    star(ctx, x, y, size * (p.scale / 100));
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, R: number): void {
  const inner = R / 2.618;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : R;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function ellipse(ctx: CanvasRenderingContext2D, p: OrreryPrint, r: number): void {
  ctx.beginPath();
  ctx.ellipse(p.cx, p.cy, r * p.scale, r * p.scale * SQUASH, 0, 0, Math.PI * 2);
}

function drawRings(ctx: CanvasRenderingContext2D, p: OrreryPrint): void {
  const w = Math.max(1.5, p.scale / 50);
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  for (const world of WORLD_BODIES) {
    ctx.strokeStyle = PAGE_INKS.chrome;
    ctx.setLineDash(p.charted.has(world.id) ? [] : [0.16 * p.scale, 0.11 * p.scale]);
    ellipse(ctx, p, world.radius);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ellipse(ctx, p, HOME.radius);
  ctx.stroke();
  ctx.strokeStyle = PAGE_INKS.tinShade;
  ctx.setLineDash([0.03 * p.scale, 0.09 * p.scale]);
  ellipse(ctx, p, LAB.radius);
  ctx.stroke();
  ctx.setLineDash([]);
  // Scale: one tick every 0.25 u along +x.
  ctx.strokeStyle = PAGE_INKS.sky;
  ctx.lineWidth = Math.max(1, w * 0.7);
  for (let x = 0.25; x <= LAB.radius + 0.26; x += 0.25) {
    const major = Math.abs(x - Math.round(x)) < 1e-6;
    const h = (major ? 0.09 : 0.045) * p.scale * SQUASH;
    const [sx, sy] = project(p, x, 0);
    ctx.beginPath();
    ctx.moveTo(sx, sy - h);
    ctx.lineTo(sx, sy + h);
    ctx.stroke();
  }
}

/** The Whirl, pixel by pixel: a golden logarithmic spiral with `fold` arms, horizon and accretion. */
function drawWhirl(ctx: CanvasRenderingContext2D, p: OrreryPrint): void {
  const outer = 0.98;
  const rx = Math.ceil(outer * p.scale);
  const ry = Math.ceil(outer * p.scale * SQUASH);
  const x0 = Math.floor(p.cx - rx);
  const y0 = Math.floor(p.cy - ry);
  const w = rx * 2;
  const h = ry * 2;
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const A = 0.45;
  const colors = {
    a: hex(PAGE_INKS.vermilion),
    b: hex(PAGE_INKS.chrome),
    rim: hex(PAGE_INKS.oxblood),
    ink: hex(PAGE_INKS.ink),
    near: hex(PAGE_INKS.orange),
    far: hex(PAGE_INKS.lemon),
  };
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = (x0 + i + 0.5 - p.cx) / p.scale;
      const y = -(y0 + j + 0.5 - p.cy) / (p.scale * SQUASH);
      const r = Math.hypot(x, y);
      let c: [number, number, number] | null = null;
      if (r < A) c = colors.ink;
      else if (r < WHIRL_RADIUS - 0.04) {
        const th = Math.atan2(y, x);
        const band = Math.floor((p.fold * (th - Math.log(r / A) / B)) / (Math.PI * 2));
        c = ((band % 2) + 2) % 2 ? colors.b : colors.a;
      } else if (r < WHIRL_RADIUS) c = colors.rim;
      else if (r > 0.86 && r < 0.97) c = y < -0.1 ? colors.near : colors.far;
      if (!c) continue;
      const k = (j * w + i) * 4;
      d[k] = c[0];
      d[k + 1] = c[1];
      d[k + 2] = c[2];
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}

function drawTop(ctx: CanvasRenderingContext2D, p: OrreryPrint, x: number, y: number, radius: number, print: { base: string; band: string; dot: string } | null): void {
  const [sx, sy] = project(p, x, y);
  const R = radius * p.scale * 1.3;
  // Shadow of the tip on the ecliptic, and the body: a squashed disc with its shoulder.
  ctx.fillStyle = PAGE_INKS.spaceDeep;
  ctx.beginPath();
  ctx.ellipse(sx, sy, R * 0.55, R * 0.55 * SQUASH * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const cy = sy - R * 0.62;
  ctx.fillStyle = print ? print.base : PAGE_INKS.tin;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx - R * 0.9, cy);
  ctx.ellipse(sx, cy, R, R * SQUASH * 0.7, 0, Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sx, cy, R, R * SQUASH * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (print) {
    // n-fold bands and dots in phyllotaxis, flat.
    ctx.fillStyle = print.band;
    for (let k = 0; k < p.fold; k++) {
      const a = (k / p.fold) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(sx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78 * SQUASH * 0.7, R * 0.14, R * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = print.dot;
    for (let k = 1; k <= 13; k++) {
      const a = k * 2.39996323;
      const rr = 0.17 * Math.sqrt(k) * R;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(a) * rr, cy + Math.sin(a) * rr * SQUASH * 0.7, Math.max(1, R * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Tin spindle.
  ctx.fillStyle = PAGE_INKS.tin;
  ctx.fillRect(sx - Math.max(1, R * 0.07), cy - R * 0.55, Math.max(2, R * 0.14), R * 0.5);
}

function planetList(p: OrreryPrint): { body: WorldBody; x: number; y: number }[] {
  return WORLD_BODIES.map((body, i) => ({ body, x: body.radius * Math.cos(p.angles[i]), y: body.radius * Math.sin(p.angles[i]) }));
}

/** The tops behind the Whirl (y > 0) are painted first; the ones in front, afterward. */
function drawPlanets(ctx: CanvasRenderingContext2D, p: OrreryPrint, layer: 'back' | 'front'): void {
  const bodies = [
    ...planetList(p).map(({ body, x, y }) => {
      const w = worldPrint(body.id);
      return { x, y, r: body.topRadius, print: { base: toCss(w.base), band: toCss(w.band), dot: toCss(w.dot) } };
    }),
    { x: 0, y: -HOME.radius, r: HOME.topRadius, print: { base: PAGE_INKS.tin, band: PAGE_INKS.vermilion, dot: PAGE_INKS.chrome } },
    ...LAB.angles.map((a) => ({ x: LAB.radius * Math.cos(a), y: LAB.radius * Math.sin(a), r: LAB.topRadius, print: null })),
  ]
    .filter((b) => (layer === 'back' ? b.y >= 0 : b.y < 0))
    .sort((a, b) => b.y - a.y);
  for (const b of bodies) drawTop(ctx, p, b.x, b.y, b.r, b.print);
}

function rocket(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, size: number, body: string, fins: string): void {
  // Heading on the ecliptic, carried to the screen with the same squash.
  const dx = Math.cos(heading);
  const dy = -Math.sin(heading) * SQUASH;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const L = size;
  const W = size * 0.22;
  ctx.fillStyle = fins;
  ctx.beginPath();
  ctx.moveTo(x - ux * L * 0.45 + nx * W * 1.6, y - uy * L * 0.45 + ny * W * 1.6);
  ctx.lineTo(x - ux * L * 0.15, y - uy * L * 0.15);
  ctx.lineTo(x - ux * L * 0.45 - nx * W * 1.6, y - uy * L * 0.45 - ny * W * 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x + ux * L * 0.55, y + uy * L * 0.55);
  ctx.lineTo(x + ux * L * 0.1 + nx * W, y + uy * L * 0.1 + ny * W);
  ctx.lineTo(x - ux * L * 0.45 + nx * W, y - uy * L * 0.45 + ny * W);
  ctx.lineTo(x - ux * L * 0.45 - nx * W, y - uy * L * 0.45 - ny * W);
  ctx.lineTo(x + ux * L * 0.1 - nx * W, y + uy * L * 0.1 - ny * W);
  ctx.closePath();
  ctx.fill();
}

/**
 * Exposures: all at once, in four layers by age. Each layer goes through the Bayer dither
 * at its own density (the newest full, the oldest sparse): age reads as print density,
 * not as transparency. The newest of all is drawn in pink.
 */
function drawExposures(ctx: CanvasRenderingContext2D, p: OrreryPrint): void {
  const list = p.exposures;
  if (!list.length) return;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lc = layer.getContext('2d', { willReadFrequently: true })!;
  const size = 0.26 * p.scale;
  const densities = [0.28, 0.5, 0.74, 1];
  const n = list.length;
  for (let bucket = 0; bucket < densities.length; bucket++) {
    lc.clearRect(0, 0, W, H);
    const from = Math.floor((bucket / densities.length) * n);
    const to = Math.floor(((bucket + 1) / densities.length) * n);
    let any = false;
    for (let i = from; i < to; i++) {
      const e = list[i];
      const [x, y] = project(p, e.x, e.y);
      if (x < -size || y < -size || x > W + size || y > H + size) continue;
      rocket(lc, x, y, e.heading, size, PAGE_INKS.vermilion, PAGE_INKS.chrome);
      any = true;
    }
    if (!any) continue;
    const density = densities[bucket];
    if (density < 1) {
      const img = lc.getImageData(0, 0, W, H);
      const d = img.data;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const k = (y * W + x) * 4 + 3;
          if (d[k] && bayer8(x >> 1, y >> 1) >= density) d[k] = 0;
        }
      }
      lc.putImageData(img, 0, 0);
    }
    ctx.drawImage(layer, 0, 0);
  }
  const last = list[n - 1];
  const [x, y] = project(p, last.x, last.y);
  rocket(ctx, x, y, last.heading, size, PAGE_INKS.pink, PAGE_INKS.pink);
}

function drawGhost(ctx: CanvasRenderingContext2D, p: OrreryPrint, path: Vec2[]): void {
  ctx.strokeStyle = PAGE_INKS.paper;
  ctx.lineWidth = Math.max(1.5, p.scale / 55);
  ctx.setLineDash([0.09 * p.scale, 0.07 * p.scale]);
  ctx.beginPath();
  path.forEach(([x, y], i) => {
    const [sx, sy] = project(p, x, y);
    if (i) ctx.lineTo(sx, sy);
    else ctx.moveTo(sx, sy);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Halftone shading along the edges of the field, with the same dither as the rest of the page. */
function drawEdgeShade(ctx: CanvasRenderingContext2D, f: { x: number; y: number; w: number; h: number }): void {
  const depth = Math.round(Math.min(f.w, f.h) * 0.07);
  ctx.fillStyle = PAGE_INKS.spaceDeep;
  const block = 2;
  for (let y = f.y; y < f.y + f.h; y += block) {
    for (let x = f.x; x < f.x + f.w; x += block) {
      const edge = Math.min(x - f.x, y - f.y, f.x + f.w - x, f.y + f.h - y);
      if (edge > depth) {
        x = Math.max(x, f.x + f.w - depth - block);
        continue;
      }
      const k = 1 - edge / depth;
      if (bayer8(x / block, y / block) < 0.8 * k * k) ctx.fillRect(x, y, block, block);
    }
  }
}

/** One-ink press: cobalt on paper, with the 8×8 Bayer dither applied to the luminance. */
function oneInk(ctx: CanvasRenderingContext2D, f: { x: number; y: number; w: number; h: number }): void {
  const img = ctx.getImageData(f.x, f.y, f.w, f.h);
  const d = img.data;
  const [ir, ig, ib] = hex(PAGE_INKS.space);
  const [pr, pg, pb] = hex(PAGE_INKS.paper);
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const k = (y * f.w + x) * 4;
      const l = (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]) / 255;
      const v = Math.min(1, Math.max(0, (l - 0.12) / (0.7 - 0.12)));
      const on = v > bayer8(x >> 1, y >> 1);
      d[k] = on ? pr : ir;
      d[k + 1] = on ? pg : ig;
      d[k + 2] = on ? pb : ib;
    }
  }
  ctx.putImageData(img, f.x, f.y);
}
