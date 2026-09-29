// PNG tEXt chunks shared by the Game Center sticker and the Wind-Up Empire proof: the CRC-32 and the
// chunk itself. Pure: bytes in, bytes out. Each caller encodes its own Latin-1 text and decides where
// the chunk goes in the file.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 'tEXt' in ASCII. */
const TEXT_TYPE = new Uint8Array([0x74, 0x45, 0x58, 0x74]);

/** A tEXt chunk (length, type, keyword, NUL, text, CRC-32) from a keyword and a text already encoded as Latin-1. */
export function textChunk(keyword: Uint8Array, text: Uint8Array): Uint8Array {
  const data = new Uint8Array([...keyword, 0, ...text]);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(TEXT_TYPE, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}
