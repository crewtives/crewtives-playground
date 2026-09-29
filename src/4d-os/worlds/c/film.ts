/**
 * Film matter generated on the display's pixel grid: chemical stains and light leaks, drawn at
 * low resolution with Bayer dithering in palette colors and scaled up without smoothing.
 * Deterministic by seed: the same stain returns to the same frame.
 */

import { BAYER4 } from '../../../engine/display/palette';

/**
 * Seeded pseudo-random generator (mulberry32), the same as `src/pipeline/scenes/random.ts`. The copy is
 * deliberate: D and E share that module, and if C imported it the build would split it into a separate
 * chunk that this page would have to request.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rgb = [number, number, number];

function hexToRgb(value: string): Rgb {
  const hex = value.trim().replace('#', '');
  const n = Number.parseInt(hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function tokenRgb(name: string, fallback: string): Rgb {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return hexToRgb(value.startsWith('#') ? value : fallback);
}

/** Paints a 0..1 intensity field in color levels (threshold with Bayer dither). */
function paintField(
  width: number,
  height: number,
  field: (x: number, y: number) => number,
  levels: Array<{ at: number; color: Rgb; alpha: number }>,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = field(x, y) + (BAYER4[(y % 4) * 4 + (x % 4)] - 0.5) * 0.22;
      let chosen: (typeof levels)[number] | null = null;
      for (const level of levels) if (value >= level.at) chosen = level;
      const i = (y * width + x) * 4;
      if (!chosen) continue;
      image.data[i] = chosen.color[0];
      image.data[i + 1] = chosen.color[1];
      image.data[i + 2] = chosen.color[2];
      image.data[i + 3] = Math.round(chosen.alpha * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Chemical stain: several merged drops with an organic edge and a drip running downward.
 * Returns a 40×40 texel texture to be scaled up without smoothing.
 */
export function stainTexture(seed: number): string {
  const random = mulberry32(seed);
  const size = 40;
  const drops = Array.from({ length: 4 + Math.floor(random() * 3) }, () => ({
    x: 12 + random() * 16,
    y: 9 + random() * 14,
    r: 4 + random() * 7,
  }));
  const drips = Array.from({ length: 1 + Math.floor(random() * 2) }, () => ({
    x: 14 + random() * 12,
    from: 18 + random() * 6,
    to: 28 + random() * 11,
    w: 1 + random() * 1.6,
  }));
  const wobble = Array.from({ length: 16 }, () => random() * 2 - 1);
  const light = tokenRgb('--sepia', '#c8b089');
  const dark = tokenRgb('--pal-16-10', '#7c4a3e');
  return paintField(
    size,
    size,
    (x, y) => {
      let v = 0;
      for (const d of drops) {
        const angle = Math.atan2(y - d.y, x - d.x);
        const edge = d.r * (1 + 0.22 * wobble[Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 16) % 16]);
        v += Math.max(0, 1 - Math.hypot(x - d.x, y - d.y) / edge);
      }
      for (const drip of drips) {
        if (y > drip.from && y < drip.to && Math.abs(x - drip.x) < drip.w) v += 0.9 * (1 - (y - drip.from) / (drip.to - drip.from));
      }
      return v;
    },
    [
      { at: 0.32, color: light, alpha: 0.55 },
      { at: 0.75, color: light, alpha: 0.8 },
      // Darker drying edge in the middle ring: simulated with a second threshold.
      { at: 1.25, color: dark, alpha: 0.55 },
    ],
  );
}

/**
 * Light leak burning in from the right edge: hot white against the edge, orange, and an irregular
 * falloff along the height. `width`×`height` in display texels (CSS px / pixel scale).
 */
export function leakTexture(width: number, height: number, seed = 7): string {
  const random = mulberry32(seed);
  // Irregular vertical profile: the burn reaches further at some heights than at others.
  const knots = Array.from({ length: 9 }, () => 0.45 + random() * 0.75);
  const reach = (y: number) => {
    const t = (y / Math.max(1, height - 1)) * (knots.length - 1);
    const i = Math.min(knots.length - 2, Math.floor(t));
    const f = t - i;
    return knots[i] * (1 - f) + knots[i + 1] * f;
  };
  const hot = tokenRgb('--leak-hot', '#ffd39a');
  const leak = tokenRgb('--leak', '#ff8636');
  const white = tokenRgb('--paper', '#dcdfdf');
  return paintField(
    Math.max(8, Math.round(width)),
    Math.max(8, Math.round(height)),
    (x, y) => {
      const fromEdge = (width - 1 - x) / Math.max(1, width);
      return Math.exp(-fromEdge / (0.11 * reach(y)));
    },
    [
      { at: 0.16, color: leak, alpha: 0.45 },
      { at: 0.36, color: leak, alpha: 0.85 },
      { at: 0.62, color: hot, alpha: 0.95 },
      { at: 0.86, color: white, alpha: 1 },
    ],
  );
}
