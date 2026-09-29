// Minimal woff2 reader for auditing fonts (D9, task 8.4): it decompresses the stream with Node's
// brotli and reads the `cmap` table (never transformed) and the family name from `name`. It exists
// because fontTools cannot read woff2 without the `brotli` module.

import { brotliDecompressSync } from 'node:zlib';

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp',
  'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx',
  'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];

function readBase128(bytes: Uint8Array, pos: { i: number }): number {
  let value = 0;
  for (let k = 0; k < 5; k++) {
    const b = bytes[pos.i++];
    value = value * 128 + (b & 0x7f);
    if (!(b & 0x80)) return value;
  }
  throw new Error('woff2: invalid UIntBase128');
}

/** Decompressed woff2 tables, by tag (transformed tables stay in their transformed form). */
export function woff2Tables(file: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint32(0) !== 0x774f4632) throw new Error('woff2: invalid signature');
  const numTables = view.getUint16(12);
  const totalCompressed = view.getUint32(20);
  const pos = { i: 48 };
  const entries: { tag: string; length: number }[] = [];
  for (let t = 0; t < numTables; t++) {
    const flags = file[pos.i++];
    const tagIndex = flags & 0x3f;
    let tag: string;
    if (tagIndex === 63) {
      tag = String.fromCharCode(...file.subarray(pos.i, pos.i + 4));
      pos.i += 4;
    } else tag = KNOWN_TAGS[tagIndex];
    const transformVersion = (flags >> 6) & 3;
    const origLength = readBase128(file, pos);
    const transformed = (tag === 'glyf' || tag === 'loca') ? transformVersion === 0 : transformVersion !== 0;
    const length = transformed ? readBase128(file, pos) : origLength;
    entries.push({ tag, length });
  }
  const stream = brotliDecompressSync(file.subarray(pos.i, pos.i + totalCompressed));
  const tables = new Map<string, Uint8Array>();
  let offset = 0;
  for (const { tag, length } of entries) {
    tables.set(tag, stream.subarray(offset, offset + length));
    offset += length;
  }
  return tables;
}

/** Code points the font maps (format 4 and 12 subtables). */
export function woff2Codepoints(file: Uint8Array): Set<number> {
  const cmap = woff2Tables(file).get('cmap');
  if (!cmap) throw new Error('woff2: no cmap');
  const v = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength);
  const out = new Set<number>();
  const n = v.getUint16(2);
  for (let k = 0; k < n; k++) {
    const offset = v.getUint32(4 + k * 8 + 4);
    const format = v.getUint16(offset);
    if (format === 4) {
      const segX2 = v.getUint16(offset + 6);
      const ends = offset + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = v.getUint16(ends + s * 2);
        const start = v.getUint16(starts + s * 2);
        const delta = v.getInt16(deltas + s * 2);
        const rangeOffset = v.getUint16(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph: number;
          if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
          else {
            const at = ranges + s * 2 + rangeOffset + (c - start) * 2;
            glyph = v.getUint16(at);
            if (glyph) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph) out.add(c);
        }
      }
    } else if (format === 12) {
      const groups = v.getUint32(offset + 12);
      for (let g = 0; g < groups; g++) {
        const start = v.getUint32(offset + 16 + g * 12);
        const end = v.getUint32(offset + 20 + g * 12);
        for (let c = start; c <= end; c++) out.add(c);
      }
    }
  }
  return out;
}

/** Family name (nameID 16 if present, otherwise 1), read from the `name` table. */
export function woff2Family(file: Uint8Array): string {
  const name = woff2Tables(file).get('name')!;
  const v = new DataView(name.buffer, name.byteOffset, name.byteLength);
  const count = v.getUint16(2);
  const storage = v.getUint16(4);
  const found: Record<number, string> = {};
  for (let k = 0; k < count; k++) {
    const r = 6 + k * 12;
    const platform = v.getUint16(r);
    const id = v.getUint16(r + 6);
    const length = v.getUint16(r + 8);
    const offset = v.getUint16(r + 10);
    if ((id === 1 || id === 16) && platform === 3) {
      let text = '';
      for (let i = 0; i < length; i += 2) text += String.fromCharCode(v.getUint16(storage + offset + i));
      found[id] = text;
    }
  }
  return found[16] ?? found[1] ?? '';
}
