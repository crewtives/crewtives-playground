/** sRGB color 0–255, as written to the canvas. */
export type Rgb8 = [number, number, number];

export interface Palettes {
  oneBit: Rgb8[];
  sixteen: Rgb8[];
}

export const MAX_PALETTE = 16;

// Neutral development palette: used only when the world does not define its tokens.
const DEV_ONE_BIT = ['#141414', '#ececec'];
const DEV_SIXTEEN = [
  '#141414', '#ececec', '#8a8a8a', '#4a4a4a', '#c9c9c9',
  '#2fd0e0', '#f0a030', '#6b7a3a', '#a3a85a', '#3e5a2a',
  '#5a3a28', '#8c6446', '#c7b58e', '#b8c4c8', '#2a2f3a', '#e8e0cc',
];

let probe: CanvasRenderingContext2D | null = null;

/** Converts any CSS color (hex, rgb, oklch…) to 8-bit sRGB by painting it into one pixel. */
export function cssToRgb8(value: string): Rgb8 | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  probe ??= (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.getContext('2d', { willReadFrequently: true })!;
  })();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000000';
  probe.fillStyle = trimmed;
  // An invalid value leaves the previous fillStyle in place: a second control color checks for it.
  const first = probe.fillStyle;
  probe.fillStyle = '#ffffff';
  probe.fillStyle = trimmed;
  if (probe.fillStyle !== first) return null;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Reads a token; `null` if it does not exist or is not a color. */
export function readToken(root: Element, name: string): Rgb8 | null {
  return cssToRgb8(getComputedStyle(root).getPropertyValue(name));
}

function readSeries(root: Element, prefix: string, max: number): Rgb8[] {
  const out: Rgb8[] = [];
  for (let i = 0; i < max; i++) {
    const color = readToken(root, `${prefix}${i}`);
    if (!color) break;
    out.push(color);
  }
  return out;
}

let warned = false;

/** Palettes of the quantized modes, from the tokens --pal-1bit-0..1 and --pal-16-0..15. */
export function readPalettes(root: Element): Palettes {
  let oneBit = readSeries(root, '--pal-1bit-', 2);
  let sixteen = readSeries(root, '--pal-16-', MAX_PALETTE);
  if (oneBit.length < 2 || sixteen.length < 2) {
    if (!warned) {
      console.warn('[display] the --pal-1bit-* / --pal-16-* tokens are missing: using the development palette');
      warned = true;
    }
    if (oneBit.length < 2) oneBit = DEV_ONE_BIT.map((hex) => cssToRgb8(hex)!);
    if (sixteen.length < 2) sixteen = DEV_SIXTEEN.map((hex) => cssToRgb8(hex)!);
  }
  return { oneBit, sixteen };
}

/** Numeric token (unitless); `fallback` if it is missing or not a number. */
export function readNumber(root: Element, name: string, fallback: number): number {
  const value = parseFloat(getComputedStyle(root).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/** Color token with alternatives tried in order; the last resort is `fallback`. */
export function readColor(root: Element, names: string[], fallback: Rgb8): Rgb8 {
  for (const name of names) {
    const color = readToken(root, name);
    if (color) return color;
  }
  return fallback;
}

// --- OKLab ------------------------------------------------------------------------------------

export function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** 8-bit sRGB → OKLab (Björn Ottosson). */
export function rgb8ToOklab([r8, g8, b8]: Rgb8): [number, number, number] {
  const r = srgbToLinear(r8 / 255);
  const g = srgbToLinear(g8 / 255);
  const b = srgbToLinear(b8 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function rgb8ToLinear([r, g, b]: Rgb8): [number, number, number] {
  return [srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)];
}

/** Thresholds of the 4×4 Bayer ordered dither, in (0, 1), row by row. */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
