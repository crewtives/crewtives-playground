import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { crc32 } from '../../playground/shared/png';
import { decodePng, encodePng, type FilterType, pngSize, type Rgba } from './png';

const repo = resolve(import.meta.dirname, '../../..');

/** Deterministic pixels: smooth ramps (so every filter has something to predict) plus noise. */
function sample(width: number, height: number, alpha: boolean): Rgba {
  const data = new Uint8Array(width * height * 4);
  let seed = 7;
  const noise = () => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 24) & 0x0f;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      data[o] = (x * 9 + noise()) & 255;
      data[o + 1] = (y * 13 + noise()) & 255;
      data[o + 2] = (x * y + noise()) & 255;
      data[o + 3] = alpha ? (x + y * 3) & 255 : 255;
    }
  }
  return { width, height, data };
}

/** Byte offset of a chunk's type, and its data. */
function findChunk(png: Uint8Array, type: string): { at: number; data: Uint8Array } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  for (let p = 8; p < png.length; ) {
    const length = view.getUint32(p);
    if (String.fromCharCode(...png.subarray(p + 4, p + 8)) === type) return { at: p + 4, data: png.subarray(p + 8, p + 8 + length) };
    p += 12 + length;
  }
  throw new Error(`no ${type} chunk`);
}

describe('PNG codec of the share images', () => {
  test.each([0, 1, 2, 3, 4] as FilterType[])('filter type %i decodes back to the same pixels, RGB and RGBA', (filter) => {
    for (const alpha of [false, true]) {
      const image = sample(37, 23, alpha);
      const back = decodePng(encodePng(image, { filter }));
      expect(back.width).toBe(37);
      expect(back.height).toBe(23);
      expect(Buffer.from(back.data).equals(Buffer.from(image.data))).toBe(true);
    }
  });

  test('the adaptive heuristic round-trips and uses more than one filter type on varied rows', () => {
    const image = sample(64, 48, false);
    const png = encodePng(image);
    expect(Buffer.from(decodePng(png).data).equals(Buffer.from(image.data))).toBe(true);
    const ihdr = findChunk(png, 'IHDR').data;
    const raw = new Uint8Array(inflateSync(findChunk(png, 'IDAT').data));
    const stride = 64 * 3 + 1;
    const used = new Set(Array.from({ length: 48 }, (_, y) => raw[y * stride]));
    expect(ihdr[9]).toBe(2);
    expect(used.size).toBeGreaterThan(1);
  });

  test('IHDR: the size, 8 bits, RGB when opaque and RGBA otherwise, no interlacing', () => {
    const opaque = encodePng(sample(5, 3, false));
    const translucent = encodePng(sample(5, 3, true));
    expect(pngSize(opaque)).toEqual({ width: 5, height: 3 });
    expect([...findChunk(opaque, 'IHDR').data.subarray(8)]).toEqual([8, 2, 0, 0, 0]);
    expect([...findChunk(translucent, 'IHDR').data.subarray(8)]).toEqual([8, 6, 0, 0, 0]);
  });

  test('only IHDR, IDAT and IEND are written, so the same pixels give the same bytes', () => {
    const png = encodePng(sample(20, 20, false));
    const types: string[] = [];
    const view = new DataView(png.buffer);
    for (let p = 8; p < png.length; p += 12 + view.getUint32(p)) types.push(String.fromCharCode(...png.subarray(p + 4, p + 8)));
    expect(types).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(Buffer.from(encodePng(sample(20, 20, false))).equals(Buffer.from(png))).toBe(true);
  });

  test('every chunk carries the CRC-32 of the shared module', () => {
    const png = encodePng(sample(4, 4, false));
    const { at, data } = findChunk(png, 'IDAT');
    expect(new DataView(png.buffer).getUint32(at + 4 + data.length)).toBe(crc32(png.subarray(at, at + 4 + data.length)));
  });

  test('decodes a Chromium capture from the repository and encodes it back to the same pixels', () => {
    const still = decodePng(readFileSync(resolve(repo, 'src/pipeline/captures/a-vitrine.png')));
    expect([still.width, still.height]).toEqual([1200, 900]);
    expect(Buffer.from(decodePng(encodePng(still)).data).equals(Buffer.from(still.data))).toBe(true);
  });

  test('a damaged chunk, a palette image or a 16-bit image fails and says why', () => {
    const png = encodePng(sample(4, 4, false));
    const damaged = png.slice();
    damaged[findChunk(damaged, 'IDAT').at + 6] ^= 0xff;
    expect(() => decodePng(damaged)).toThrow(/CRC/);

    const withIhdr = (depth: number, color: number) => {
      const ihdr = new Uint8Array(13);
      new DataView(ihdr.buffer).setUint32(0, 1);
      new DataView(ihdr.buffer).setUint32(4, 1);
      ihdr.set([depth, color, 0, 0, 0], 8);
      const body = (type: string, data: Uint8Array) => {
        const out = new Uint8Array(12 + data.length);
        new DataView(out.buffer).setUint32(0, data.length);
        out.set([...type].map((c) => c.charCodeAt(0)), 4);
        out.set(data, 8);
        new DataView(out.buffer).setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
        return out;
      };
      return new Uint8Array([...png.subarray(0, 8), ...body('IHDR', ihdr), ...body('IDAT', new Uint8Array(deflateSync(new Uint8Array(2)))), ...body('IEND', new Uint8Array(0))]);
    };
    expect(() => decodePng(withIhdr(8, 3))).toThrow(/color type 3/);
    expect(() => decodePng(withIhdr(16, 2))).toThrow(/depth 16/);
    expect(() => pngSize(new Uint8Array(40))).toThrow(/not a PNG/);
  });
});
