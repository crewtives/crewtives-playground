// The key's rosette: each detent stamps the outline of the butterfly key, at its current angle, in
// orange with the 8×8 Bayer dither, onto a plate that keeps everything printed. One turn (8 detents
// at 45°) prints an 8-petal rosette; every 4 turns a larger flower is overprinted around it with the
// same thin stroke, so the lines never muddy. It is a 2D canvas used by the 3D key view (as a
// texture), the flat key in the side panel and the proof print. "Reset universe" clears it.
import { bayer8 } from '../bayerTile';

/** Plate resolution (rosette px: the dither stays coarse, as on the lid). */
export const ROSETTE_SIZE = 64;
const ORANGE: [number, number, number] = [0xff, 0x7a, 0x1a];

/**
 * Silhouette of the butterfly key, with `a` as its scale: each wing is an oval centered at
 * (1.45a, 0), joined to the hub by a narrow neck (the waist), with a round hole like real toy keys.
 * `e` widens the outline (for the ink edge behind the key).
 */
export const WING = { cx: 1.45, rx: 0.85, ry: 0.76, neck: 0.17, hub: 0.38, hole: 0.3, holeX: 1.6 } as const;

/** Outline of the right wing (toward +x), starting at the hub; the other wing is its mirror. */
export function wingPoints(a: number, e = 0, segments = 24): [number, number][] {
  const cx = WING.cx * a;
  const rx = WING.rx * a + e;
  const ry = WING.ry * a + e;
  const nh = WING.neck * a + e;
  const phi0 = Math.asin(Math.min(1, nh / ry));
  const points: [number, number][] = [[0, nh]];
  // From the upper joint, over the top, around the tip and along the bottom, to the lower joint.
  for (let i = 0; i <= segments; i++) {
    const phi = Math.PI - phi0 - (i / segments) * (2 * Math.PI - 2 * phi0);
    points.push([cx + rx * Math.cos(phi), ry * Math.sin(phi)]);
  }
  points.push([0, -nh]);
  return points;
}

/** The right wing's hole: center and radius (the ink edge shrinks it by `e`). */
export function wingHole(a: number, e = 0): { x: number; r: number } {
  return { x: WING.holeX * a, r: Math.max(0, WING.hole * a - e) };
}

/** Traces the key's outline (both wings and the hub) in a context that is already translated and rotated. */
export function traceKey(ctx: CanvasRenderingContext2D | Path2D, a: number): void {
  for (const side of [1, -1]) {
    const pts = wingPoints(a, 0, 18);
    const h = WING.hub * a;
    // From the hub's rim: so the lines do not all converge at the center.
    ctx.moveTo(side * h, pts[0][1]);
    for (const [x, y] of pts.slice(1, -1)) ctx.lineTo(side * x, y);
    ctx.lineTo(side * h, pts[pts.length - 1][1]);
  }
  ctx.moveTo(a * WING.hub, 0);
  ctx.arc(0, 0, a * WING.hub, 0, Math.PI * 2);
}

/** The SVG path of the same silhouette (the flat key), centered at (0, 0), with the holes (evenodd). */
export function keySvgPath(a: number): string {
  const parts: string[] = [];
  for (const side of [1, -1]) {
    const pts = wingPoints(a).map(([x, y]) => `${(side * x).toFixed(2)} ${y.toFixed(2)}`);
    parts.push(`M${pts.join('L')}Z`);
    const hole = wingHole(a);
    const hx = side * hole.x;
    const r = hole.r.toFixed(2);
    parts.push(`M${(hx + hole.r).toFixed(2)} 0A${r} ${r} 0 1 0 ${(hx - hole.r).toFixed(2)} 0A${r} ${r} 0 1 0 ${(hx + hole.r).toFixed(2)} 0Z`);
  }
  const h = a * WING.hub;
  parts.push(`M${h.toFixed(2)} 0A${h.toFixed(2)} ${h.toFixed(2)} 0 1 1 ${(-h).toFixed(2)} 0A${h.toFixed(2)} ${h.toFixed(2)} 0 1 1 ${h.toFixed(2)} 0Z`);
  return parts.join('');
}

/** Scale of the key on the rosette plate (px): the 3D view uses the same proportion. */
export const ROSETTE_KEY = 9.2;
/** Every 4 turns the rosette adds a larger flower around the previous one. */
const TIER_SCALE = [1, 1.2, 1.4];
/** Fixed stroke and dither: overprinting the same outline does not thicken it (the lines stay apart). */
const STAMP_LINE = 1.25;
const STAMP_DENSITY = 0.82;

export class Rosette {
  readonly canvas: HTMLCanvasElement;
  /** Stamps since load (or the last reset). */
  stamps = 0;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly mask: CanvasRenderingContext2D;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = ROSETTE_SIZE;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    const mask = document.createElement('canvas');
    mask.width = mask.height = ROSETTE_SIZE;
    this.mask = mask.getContext('2d', { willReadFrequently: true })!;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Stamps the key at `angleDeg` (clockwise). `turn` (0–11) picks the flower's size. */
  stamp(angleDeg: number, turn: number): void {
    const n = ROSETTE_SIZE;
    const m = this.mask;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.clearRect(0, 0, n, n);
    m.translate(n / 2, n / 2);
    m.rotate((angleDeg * Math.PI) / 180);
    // The outline is stamped (not the fill): eight outlines at 45° cross into a rosette of lines.
    // Constant stroke and density; every 4 turns the new flower comes out larger, around the previous one.
    const level = Math.min(TIER_SCALE.length - 1, Math.floor(Math.max(0, turn) / 4));
    const tier = TIER_SCALE[level];
    m.save();
    if (level > 0) {
      // The new flower prints only outside the previous one: the center does not muddy.
      const inner = 0.8 * ROSETTE_KEY * (WING.cx + WING.rx) * TIER_SCALE[level - 1];
      m.beginPath();
      m.rect(-n, -n, 2 * n, 2 * n);
      m.arc(0, 0, inner, 0, Math.PI * 2, true);
      m.clip('evenodd');
    }
    m.beginPath();
    traceKey(m, ROSETTE_KEY * tier);
    m.strokeStyle = '#fff';
    m.lineWidth = STAMP_LINE;
    m.lineJoin = 'round';
    m.stroke();
    m.restore();
    const src = m.getImageData(0, 0, n, n).data;
    const out = this.ctx.getImageData(0, 0, n, n);
    const dst = out.data;
    const density = STAMP_DENSITY;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        if (src[i + 3] < 128 || bayer8(x, y) >= density) continue;
        dst[i] = ORANGE[0];
        dst[i + 1] = ORANGE[1];
        dst[i + 2] = ORANGE[2];
        dst[i + 3] = 255;
      }
    }
    this.ctx.putImageData(out, 0, 0);
    this.stamps++;
    for (const listener of this.listeners) listener();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, ROSETTE_SIZE, ROSETTE_SIZE);
    this.stamps = 0;
    for (const listener of this.listeners) listener();
  }

  /** Distinct stamped angles (for in-browser tests). */
  get painted(): number {
    const data = this.ctx.getImageData(0, 0, ROSETTE_SIZE, ROSETTE_SIZE).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
    return count;
  }
}
