// Shading of the lid edges with the same 8×8 Bayer dither as the display: PNG tiles made
// at startup (2 px blocks, like pixelScale 2). The density falls from the edge inward and
// grows with the wind: threshold 0.18 + 0.22 · wind.

/** 8×8 Bayer threshold in [0, 1), the same index as display.frag.glsl. */
export function bayer8(x: number, y: number): number {
  const px = x & 7;
  const py = y & 7;
  const xy = px ^ py;
  const v = ((xy & 1) << 5) | ((py & 1) << 4) | ((xy & 2) << 2) | ((py & 2) << 1) | ((xy & 4) >> 1) | ((py & 4) >> 2);
  return (v + 0.5) / 64;
}

/** Shading depth in blocks (a 48 px edge = 24 blocks of 2 px). */
const DEPTH = 24;
const BLOCK = 2;

function tile(horizontal: boolean, fromStart: boolean, color: string, strength: number): string {
  const along = 8;
  const w = (horizontal ? along : DEPTH) * BLOCK;
  const h = (horizontal ? DEPTH : along) * BLOCK;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  for (let i = 0; i < along; i++) {
    for (let d = 0; d < DEPTH; d++) {
      const depth = fromStart ? d : DEPTH - 1 - d;
      // Density: full at the edge, zero at 48 px, on a smooth curve.
      const k = 1 - depth / DEPTH;
      const density = strength * k * k;
      const bx = horizontal ? i : d;
      const by = horizontal ? d : i;
      if (bayer8(bx, by) < density) ctx.fillRect(bx * BLOCK, by * BLOCK, BLOCK, BLOCK);
    }
  }
  return `url(${canvas.toDataURL('image/png')})`;
}

let lastKey = '';

/** Writes the four edge tiles onto `target` for the current wind (0–1), in 6 steps. */
export function applyEdgeShade(target: HTMLElement, color: string, wind: number): void {
  const step = Math.round(Math.min(1, Math.max(0, wind)) * 5);
  const key = `${color}:${step}`;
  if (key === lastKey) return;
  lastKey = key;
  const strength = Math.min(1, 0.18 + 0.22 * (step / 5) + 0.42);
  target.style.setProperty('--shade-top', tile(true, true, color, strength));
  target.style.setProperty('--shade-bottom', tile(true, false, color, strength));
  target.style.setProperty('--shade-left', tile(false, true, color, strength));
  target.style.setProperty('--shade-right', tile(false, false, color, strength));
}
