// Provenance embedded in the proof's PNG: a tEXt chunk (keyword + Latin-1 text)
// inserted after IHDR, with its CRC-32. Pure module: bytes in, bytes out.
import { crc32, textChunk } from '../shared/png';

function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[i] = code < 256 ? code : 63; // '?'
  }
  return out;
}

/** Returns the PNG with a tEXt chunk `keyword`/`text` right after IHDR. */
export function withTextChunk(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const chunk = textChunk(latin1(keyword), latin1(text));
  // Signature (8) + IHDR (4 length + 4 type + 13 data + 4 CRC) = 33 bytes.
  const at = 33;
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, at));
  out.set(chunk, at);
  out.set(png.subarray(at), at + chunk.length);
  return out;
}

/** Reads the tEXt chunks of a PNG (to verify the provenance). */
export function readTextChunks(png: Uint8Array): Record<string, string> {
  const out: Record<string, string> = {};
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  while (at + 8 <= png.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    if (type === 'tEXt') {
      const data = png.subarray(at + 8, at + 8 + length);
      const zero = data.indexOf(0);
      out[String.fromCharCode(...data.subarray(0, zero))] = String.fromCharCode(...data.subarray(zero + 1));
    }
    if (type === 'IEND') break;
    at += 12 + length;
  }
  return out;
}

/** Checks the CRC of every chunk (true if they all match). */
export function chunksValid(png: Uint8Array): boolean {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  while (at + 12 <= png.length) {
    const length = view.getUint32(at);
    const crc = view.getUint32(at + 8 + length);
    if (crc32(png.subarray(at + 4, at + 8 + length)) !== crc) return false;
    if (String.fromCharCode(...png.subarray(at + 4, at + 8)) === 'IEND') return true;
    at += 12 + length;
  }
  return false;
}
