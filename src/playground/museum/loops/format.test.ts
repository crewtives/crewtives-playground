import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Rgba } from './blocks.ts';
import { decode4dlp, encode4dlp, FORMAT_VERSION, HEADER_BYTES, rowBytes, toIndices } from './format.ts';
import { frameHash } from './hash.ts';

const PALETTE = ['#16181d', '#f5f4ef', '#1bbfd3', '#efa23b', '#3b404c'];

function frames(width: number, height: number, count: number): Rgba[] {
  return Array.from({ length: count }, (_, f) => {
    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const rgb = parseInt(PALETTE[(i * 7 + f * 3 + (i >> 3)) % PALETTE.length].slice(1), 16);
      data.set([(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, 255], i * 4);
    }
    return { width, height, data };
  });
}

describe('4DLP', () => {
  it('lossless round trip, through gzip and with the same hashes (odd width included)', async () => {
    for (const [width, height] of [
      [7, 5],
      [390, 240],
    ]) {
      const natives = frames(width, height, 45);
      const body = encode4dlp({ width, height, fps: 15, palette: PALETTE, frames: natives.map((n) => toIndices(n, PALETTE)) });
      const decoded = decode4dlp(new Uint8Array(gunzipSync(gzipSync(body, { level: 9 }))));
      expect([decoded.width, decoded.height, decoded.frames, decoded.fps, decoded.version]).toEqual([width, height, 45, 15, FORMAT_VERSION]);
      expect(decoded.palette).toEqual(PALETTE);
      const out = new Uint8Array(width * height * 4);
      for (const f of [0, 17, 44, 3]) {
        decoded.expand(f, out);
        expect(Buffer.from(out).equals(Buffer.from(natives[f].data))).toBe(true);
        expect(await frameHash(out)).toBe(await frameHash(natives[f].data));
      }
    }
  });

  it('80-byte header, 4 bpp and [y][frame][x] interleaving with the low nibble for the even x', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 0, 1]);
    const body = encode4dlp({ width: 3, height: 1, fps: 15, palette: PALETTE, frames: [a, b] });
    expect(new TextDecoder().decode(body.subarray(0, 4))).toBe('4DLP');
    expect(body.length).toBe(HEADER_BYTES + rowBytes(3) * 1 * 2);
    expect([...body.subarray(HEADER_BYTES)]).toEqual([1 | (2 << 4), 3, 4 | (0 << 4), 1]);
  });

  it('the hash is SHA-256 in lowercase hexadecimal over the RGBA', async () => {
    expect(await frameHash(new Uint8Array(0))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('rejects a file that is not 4DLP or is truncated', () => {
    const body = encode4dlp({ width: 4, height: 2, fps: 15, palette: PALETTE, frames: [new Uint8Array(8)] });
    expect(() => decode4dlp(body.subarray(0, body.length - 1))).toThrow(/body of/);
    const wrong = body.slice();
    wrong[0] = 0x58;
    expect(() => decode4dlp(wrong)).toThrow(/magic/);
  });
});
