// Hash of a frame (spec work-loops, "Published provenance per loop"): SHA-256 over the pixels of the
// native frame in 8-bit RGBA, row by row from top to bottom and left to right, in lowercase
// hexadecimal. WebCrypto works the same in Node and in the browser, so the museum and the recording
// compute the same hash with the same code.

export async function frameHash(rgba: Uint8Array | Uint8ClampedArray): Promise<string> {
  const view = rgba.buffer instanceof ArrayBuffer ? new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength) : new Uint8Array(rgba);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', view));
  let hex = '';
  for (const byte of digest) hex += byte.toString(16).padStart(2, '0');
  return hex;
}
