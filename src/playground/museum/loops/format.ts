// 4DLP (D5): palette indices at 4 bits per pixel, whole frames, rows interleaved across frames in
// [y][frame][x] order, and the low nibble for the even x. It is published gzip-compressed; this module
// only builds and reads the uncompressed body, so it works the same in Node (recording) and in the
// browser (player, with `DecompressionStream('gzip')`).
//
// Header, little-endian, zero-padded up to HEADER_BYTES:
//   0  magic "4DLP"      4  version (u8)      5  bpp (u8, 4)       6  frames (u16)
//   8  width (u16)      10  height (u16)     12  fps (u8)         13  colors (u8, 1–16)
//  14  bytes per row (u32)                   18  palette: 16 × RGB (48 bytes; unused = 0)

import { CaptureError, hexColor, type Rgba } from './blocks.ts';

export const FORMAT_MAGIC = '4DLP';
export const FORMAT_VERSION = 1;
export const FORMAT_BPP = 4;
export const HEADER_BYTES = 80;
export const FORMAT_LAYOUT = '4 bpp palette indices, whole frames, rows interleaved across frames as [y][frame][x], low nibble = even x';

export interface LoopData {
  width: number;
  height: number;
  fps: number;
  /** `#rrggbb`, 1 to 16 of them. */
  palette: readonly string[];
  /** One palette index per pixel and per frame, stored row by row. */
  frames: readonly Uint8Array[];
}

/** Palette indices of a native frame; fails if a pixel is not opaque or not in the palette. */
export function toIndices(native: Rgba, palette: readonly string[]): Uint8Array {
  const index = new Map(palette.map((hex, i) => [hex, i]));
  const out = new Uint8Array(native.width * native.height);
  const d = native.data;
  for (let p = 0, i = 0; p < out.length; p++, i += 4) {
    const k = d[i + 3] === 255 ? index.get(hexColor(d[i], d[i + 1], d[i + 2])) : undefined;
    if (k === undefined) throw new CaptureError(`pixel ${p % native.width},${Math.floor(p / native.width)} outside the palette`);
    out[p] = k;
  }
  return out;
}

export function rowBytes(width: number): number {
  return Math.ceil((width * FORMAT_BPP) / 8);
}

/** Uncompressed 4DLP body. */
export function encode4dlp(loop: LoopData): Uint8Array {
  const { width, height, fps, palette, frames } = loop;
  if (palette.length < 1 || palette.length > 16) throw new CaptureError(`4DLP: ${palette.length} colors (1 to 16)`);
  if (frames.length < 1 || frames.length > 0xffff) throw new CaptureError(`4DLP: ${frames.length} frames`);
  if (width < 1 || height < 1 || width > 0xffff || height > 0xffff) throw new CaptureError(`4DLP: size ${width} × ${height}`);
  if (!Number.isInteger(fps) || fps < 1 || fps > 255) throw new CaptureError(`4DLP: ${fps} fps`);
  const stride = rowBytes(width);
  const out = new Uint8Array(HEADER_BYTES + stride * height * frames.length);
  const view = new DataView(out.buffer);
  for (let i = 0; i < 4; i++) out[i] = FORMAT_MAGIC.charCodeAt(i);
  out[4] = FORMAT_VERSION;
  out[5] = FORMAT_BPP;
  view.setUint16(6, frames.length, true);
  view.setUint16(8, width, true);
  view.setUint16(10, height, true);
  out[12] = fps;
  out[13] = palette.length;
  view.setUint32(14, stride, true);
  palette.forEach((hex, i) => {
    const rgb = parseInt(hex.slice(1), 16);
    out.set([(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255], 18 + i * 3);
  });
  let o = HEADER_BYTES;
  for (let y = 0; y < height; y++) {
    for (const frame of frames) {
      if (frame.length !== width * height) throw new CaptureError(`4DLP: a frame has ${frame.length} indices, not ${width * height}`);
      const row = y * width;
      for (let x = 0; x < width; x += 2) {
        const lo = frame[row + x];
        const hi = x + 1 < width ? frame[row + x + 1] : 0;
        if (lo >= palette.length || hi >= palette.length) throw new CaptureError(`4DLP: index outside the palette in row ${y}`);
        out[o++] = lo | (hi << 4);
      }
    }
  }
  return out;
}

export interface Decoded4dlp {
  version: number;
  width: number;
  height: number;
  frames: number;
  fps: number;
  palette: string[];
  /** Paints frame f into `out` (8-bit RGBA, width × height × 4 bytes). */
  expand(frame: number, out: Uint8Array | Uint8ClampedArray): void;
}

/** Reads an uncompressed 4DLP body; fails with a message if it is not valid 4DLP. */
export function decode4dlp(bytes: Uint8Array): Decoded4dlp {
  if (bytes.length < HEADER_BYTES) throw new Error('4DLP: file shorter than the header');
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== FORMAT_MAGIC) throw new Error(`4DLP: magic "${magic}"`);
  const version = bytes[4];
  if (version !== FORMAT_VERSION) throw new Error(`4DLP: version ${version} (this reader reads ${FORMAT_VERSION})`);
  if (bytes[5] !== FORMAT_BPP) throw new Error(`4DLP: ${bytes[5]} bits per pixel`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frames = view.getUint16(6, true);
  const width = view.getUint16(8, true);
  const height = view.getUint16(10, true);
  const fps = bytes[12];
  const colors = bytes[13];
  const stride = view.getUint32(14, true);
  if (colors < 1 || colors > 16 || stride !== rowBytes(width) || frames < 1) throw new Error('4DLP: inconsistent header');
  const body = bytes.subarray(HEADER_BYTES);
  if (body.length !== stride * height * frames) throw new Error(`4DLP: body of ${body.length} bytes, not ${stride * height * frames}`);
  const palette: string[] = [];
  // Colors in little-endian RGBA: a pixel is written with a single 32-bit assignment.
  const lut = new Uint32Array(16);
  for (let i = 0; i < colors; i++) {
    const [r, g, b] = [bytes[18 + i * 3], bytes[19 + i * 3], bytes[20 + i * 3]];
    palette.push(hexColor(r, g, b));
    lut[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  }
  return {
    version,
    width,
    height,
    frames,
    fps,
    palette,
    expand(frame, out) {
      if (!(frame >= 0 && frame < frames) || !Number.isInteger(frame)) throw new RangeError(`4DLP: frame ${frame} of ${frames}`);
      if (out.byteLength < width * height * 4 || out.byteOffset % 4) throw new RangeError('4DLP: RGBA target too small or misaligned');
      const px = new Uint32Array(out.buffer, out.byteOffset, width * height);
      let o = 0;
      for (let y = 0; y < height; y++) {
        let i = (y * frames + frame) * stride;
        for (let x = 0; x < width; x += 2) {
          const b = body[i++];
          px[o++] = lut[b & 15];
          if (x + 1 < width) px[o++] = lut[b >> 4];
        }
      }
    },
  };
}
