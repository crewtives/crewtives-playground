// One pixel per block (spec work-loops, "Native resolution, one pixel per block" and "Exactness
// verification"). The display paints blocks of B × B device pixels aligned from the bottom-left corner
// of its view (the GL convention of `display.frag.glsl`): the partial row, if any, stays at the top and
// the partial column on the right. Pure module, no dependencies.

import type { PassDirection, Rect } from './provenance.ts';

/** RGBA image, 8 bits per channel, stored row by row from top to bottom. */
export interface Rgba {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

/** Which frame of which pass of which work: every recording error names it. */
export interface FrameRef {
  loop: string;
  pass: PassDirection;
  frame: number;
}

export class CaptureError extends Error {
  override name = 'CaptureError';
}

const where = (ref: FrameRef) => `${ref.loop}, ${ref.pass} pass, frame ${ref.frame}`;

/**
 * Rectangle of the view as `Engine.measure` measures it (device pixels, rounded).
 * `left`/`top` in coordinates of the visible page.
 */
export interface ViewRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type AlignMode =
  | { mode: 'inside'; crop?: { top?: number; right?: number; bottom?: number; left?: number } }
  | { mode: 'cover' };

/**
 * Recording rectangle aligned to the view's block grid.
 * - `inside`: whole blocks only; `crop` removes whole blocks from each edge.
 * - `cover`: the smallest rectangle of blocks that contains the whole view (it sticks out at the top
 *   and on the right if the view is not a whole number of blocks).
 */
export function alignedRect(view: ViewRect, block: number, align: AlignMode): Rect {
  const bottom = view.top + view.height;
  if (align.mode === 'cover') {
    const cols = Math.ceil(view.width / block);
    const rows = Math.ceil(view.height / block);
    return { x: view.left, y: bottom - rows * block, width: cols * block, height: rows * block };
  }
  const { top = 0, right = 0, bottom: cropBottom = 0, left = 0 } = align.crop ?? {};
  const cols = Math.floor(view.width / block) - left - right;
  const rows = Math.floor(view.height / block) - top - cropBottom;
  if (cols <= 0 || rows <= 0) throw new CaptureError(`the crop leaves the view with no blocks (${cols} × ${rows})`);
  const y = bottom - cropBottom * block - rows * block;
  return { x: view.left + left * block, y, width: cols * block, height: rows * block };
}

/** Native size: the rectangle divided by the block; fails if it is not a whole number of blocks. */
export function nativeSize(rect: { width: number; height: number }, block: number): { width: number; height: number } {
  if (!Number.isInteger(block) || block < 1) throw new CaptureError(`invalid block: ${block}`);
  if (rect.width % block || rect.height % block) {
    throw new CaptureError(`the rectangle ${rect.width} × ${rect.height} is not a whole number of blocks of ${block}`);
  }
  return { width: rect.width / block, height: rect.height / block };
}

/** Keeps one pixel per block: the bottom-left pixel of each block. */
export function sampleBlocks(capture: Rgba, block: number): Rgba {
  const { width, height } = nativeSize(capture, block);
  const out = new Uint8Array(width * height * 4);
  const src = capture.data;
  for (let y = 0; y < height; y++) {
    const sy = (y + 1) * block - 1;
    for (let x = 0; x < width; x++) {
      const s = (sy * capture.width + x * block) * 4;
      const d = (y * width + x) * 4;
      out[d] = src[s];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s + 2];
      out[d + 3] = src[s + 3];
    }
  }
  return { width, height, data: out };
}

/** Upscales without smoothing: each native pixel becomes a B × B square. */
export function upscale(native: Rgba, block: number): Rgba {
  const width = native.width * block;
  const height = native.height * block;
  const out = new Uint8Array(width * height * 4);
  const src32 = new Uint32Array(native.data.buffer, native.data.byteOffset, native.width * native.height);
  const out32 = new Uint32Array(out.buffer);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / block) * native.width;
    for (let x = 0; x < width; x++) out32[y * width + x] = src32[row + Math.floor(x / block)];
  }
  return { width, height, data: out };
}

/** Differing pixels between two images of the same size. */
export function countMismatches(a: Rgba, b: Rgba): number {
  if (a.width !== b.width || a.height !== b.height) throw new CaptureError(`different sizes: ${a.width} × ${a.height} and ${b.width} × ${b.height}`);
  const n = a.width * a.height;
  const a32 = new Uint32Array(a.data.buffer, a.data.byteOffset, n);
  const b32 = new Uint32Array(b.data.buffer, b.data.byteOffset, n);
  let diff = 0;
  for (let i = 0; i < n; i++) if (a32[i] !== b32[i]) diff++;
  return diff;
}

/**
 * Recovers the native frame and checks that upscaling it reproduces the capture pixel for pixel.
 * Otherwise it throws a `CaptureError` with the work, the pass, the frame and the differing pixels.
 */
export function verifyFrame(capture: Rgba, block: number, ref: FrameRef): Rgba {
  let native: Rgba;
  try {
    native = sampleBlocks(capture, block);
  } catch (error) {
    throw new CaptureError(`${where(ref)}: ${(error as Error).message}`);
  }
  const mismatched = countMismatches(upscale(native, block), capture);
  if (mismatched > 0) throw new CaptureError(`${where(ref)}: ${mismatched} differing pixels between the capture and the upscaled native frame`);
  return native;
}

export function hexColor(r: number, g: number, b: number): string {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Every pixel opaque and in the work's palette (16 colors at most). Throws with the work, the pass,
 * the frame and how many pixels fail.
 */
export function checkPalette(native: Rgba, palette: readonly string[], ref: FrameRef): void {
  if (palette.length < 1 || palette.length > 16) throw new CaptureError(`${where(ref)}: the work's palette has ${palette.length} colors (1 to 16)`);
  const allowed = new Set(palette);
  const d = native.data;
  let transparent = 0;
  let outside = 0;
  let example = '';
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] !== 255) {
      transparent++;
      continue;
    }
    const hex = hexColor(d[i], d[i + 1], d[i + 2]);
    if (!allowed.has(hex)) {
      outside++;
      example ||= hex;
    }
  }
  if (transparent) throw new CaptureError(`${where(ref)}: ${transparent} non-opaque pixels`);
  if (outside) throw new CaptureError(`${where(ref)}: ${outside} pixels outside the work's palette (for example ${example})`);
}

/** Palette without repeats, in the work's order. */
export function uniquePalette(colors: readonly string[]): string[] {
  return [...new Set(colors.map((c) => c.toLowerCase()))];
}
