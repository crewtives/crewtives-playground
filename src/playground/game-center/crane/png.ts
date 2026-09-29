// PNG with provenance: inserts tEXt chunks (key, Latin-1 text) before IEND. Pure, no DOM:
// the crane sticker carries its seed, its procedural origin and the playground's demo mark.
import { textChunk } from '../../shared/png';

function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** Returns a copy of the PNG with one tEXt chunk per entry, right before IEND. */
export function withTextChunks(png: Uint8Array, entries: Record<string, string>): Uint8Array {
  const iend = png.length - 12;
  const chunks = Object.entries(entries).map(([k, v]) => textChunk(latin1(k), latin1(v)));
  const size = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(png.length + size);
  out.set(png.subarray(0, iend), 0);
  let at = iend;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  out.set(png.subarray(iend), at);
  return out;
}

/** Reads the tEXt chunks of a PNG (for the tests and to verify the download). */
export function pngTextChunks(png: Uint8Array): Record<string, string> {
  const out: Record<string, string> = {};
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  while (at + 12 <= png.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    if (type === 'tEXt') {
      const data = png.subarray(at + 8, at + 8 + len);
      const zero = data.indexOf(0);
      out[String.fromCharCode(...data.subarray(0, zero))] = String.fromCharCode(...data.subarray(zero + 1));
    }
    at += 12 + len;
  }
  return out;
}
