// A small PNG codec for the share images (add-seo-and-sharing D5): 8-bit truecolor, RGB or RGBA,
// without interlacing. That is what Chromium writes for a screenshot and what the stills are, so the
// share-image tool can decode a capture, copy a region of it byte for byte and encode the result
// itself: a test can then prove that the frame was not resampled. The CRC-32 is the playground's
// (src/playground/shared/png.ts), imported rather than written a second time.

import { deflateSync, inflateSync } from 'node:zlib';
import { crc32 } from '../../playground/shared/png';

/** Decoded pixels, always as RGBA, row after row. */
export interface Rgba {
  width: number;
  height: number;
  data: Uint8Array;
}

/** The five PNG filter types: None, Sub, Up, Average, Paeth. */
export type FilterType = 0 | 1 | 2 | 3 | 4;

const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function checkSignature(png: Uint8Array): void {
  if (png.length < 33 || SIGNATURE.some((byte, i) => png[i] !== byte)) throw new Error('png: not a PNG file');
}

/** Width and height from the IHDR chunk, without decoding the image. */
export function pngSize(png: Uint8Array): { width: number; height: number } {
  checkSignature(png);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (String.fromCharCode(...png.subarray(12, 16)) !== 'IHDR') throw new Error('png: the first chunk is not IHDR');
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function paeth(a: number, b: number, c: number): number {
  const pa = Math.abs(b - c);
  const pb = Math.abs(a - c);
  const pc = Math.abs(a + b - 2 * c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decodes an 8-bit RGB or RGBA PNG without interlacing into RGBA. Any other form fails and says why. */
export function decodePng(png: Uint8Array): Rgba {
  checkSignature(png);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Uint8Array[] = [];
  for (let p = 8; p + 12 <= png.length; ) {
    const length = view.getUint32(p);
    const type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    const data = png.subarray(p + 8, p + 8 + length);
    if (crc32(png.subarray(p + 4, p + 8 + length)) !== view.getUint32(p + 8 + length)) throw new Error(`png: bad CRC in the ${type} chunk`);
    if (type === 'IHDR') {
      width = view.getUint32(p + 8);
      height = view.getUint32(p + 12);
      const [depth, color, , , interlace] = data.subarray(8, 13);
      if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6)) {
        throw new Error(`png: only 8-bit RGB or RGBA without interlacing is supported (depth ${depth}, color type ${color}, interlace ${interlace})`);
      }
      channels = color === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + length;
  }
  if (!channels) throw new Error('png: no IHDR chunk');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length !== height * (stride + 1)) throw new Error(`png: the image data holds ${raw.length} bytes and ${height * (stride + 1)} were expected`);
  const out = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error(`png: row ${y} has the unknown filter type ${filter}`);
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : paeth(a, b, c);
      cur[x] = (line[x] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = cur[x * channels];
      out[o + 1] = cur[x * channels + 1];
      out[o + 2] = cur[x * channels + 2];
      out[o + 3] = channels === 4 ? cur[x * channels + 3] : 255;
    }
    prev = cur;
  }
  return { width, height, data: out };
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** One row filtered with `filter`, into `target` (the filter byte first). */
function filterRow(filter: FilterType, cur: Uint8Array, prev: Uint8Array, channels: number, target: Uint8Array): void {
  target[0] = filter;
  for (let x = 0; x < cur.length; x++) {
    const a = x >= channels ? cur[x - channels] : 0;
    const b = prev[x];
    const c = x >= channels ? prev[x - channels] : 0;
    const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : paeth(a, b, c);
    target[x + 1] = (cur[x] - predictor) & 255;
  }
}

/** Sum of the filtered bytes read as signed values: the usual heuristic for picking a row's filter. */
function cost(row: Uint8Array): number {
  let sum = 0;
  for (let i = 1; i < row.length; i++) sum += row[i] < 128 ? row[i] : 256 - row[i];
  return sum;
}

/**
 * Encodes RGBA pixels as an 8-bit truecolor PNG: RGB when every pixel is opaque, RGBA otherwise. Each
 * row takes the filter with the lowest sum of absolute filtered values (or `filter`, when given), and
 * the data is compressed with zlib at level 9. No other chunk is written, so the same pixels always
 * give the same bytes with the same zlib.
 */
export function encodePng(image: Rgba, options: { filter?: FilterType } = {}): Uint8Array {
  const { width, height, data } = image;
  if (data.length !== width * height * 4) throw new Error(`png: ${data.length} bytes of RGBA for ${width} × ${height}`);
  let opaque = true;
  for (let i = 3; i < data.length && opaque; i += 4) opaque = data[i] === 255;
  const channels = opaque ? 3 : 4;
  const stride = width * channels;
  const raw = new Uint8Array(height * (stride + 1));
  const candidates = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride + 1));
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const cur = new Uint8Array(stride);
    for (let x = 0; x < width; x++) for (let k = 0; k < channels; k++) cur[x * channels + k] = data[(y * width + x) * 4 + k];
    let best = candidates[0];
    if (options.filter !== undefined) filterRow(options.filter, cur, prev, channels, (best = candidates[options.filter]));
    else {
      let bestCost = Infinity;
      for (const filter of [0, 1, 2, 3, 4] as const) {
        filterRow(filter, cur, prev, channels, candidates[filter]);
        const c = cost(candidates[filter]);
        if (c < bestCost) [best, bestCost] = [candidates[filter], c];
      }
    }
    raw.set(best, y * (stride + 1));
    prev = cur;
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr.set([8, opaque ? 2 : 6, 0, 0, 0], 8);
  const parts = [SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
