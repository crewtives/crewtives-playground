import { describe, expect, it } from 'vitest';
import { alignedRect, CaptureError, checkPalette, type FrameRef, nativeSize, type Rgba, sampleBlocks, upscale, verifyFrame } from './blocks.ts';

const ref: FrameRef = { loop: 'd', pass: 'forward', frame: 7 };
const PALETTE = ['#000000', '#ff0000', '#00ff00', '#0000ff'];

/** Deterministic native test frame with the palette's colors. */
function nativeFrame(width: number, height: number, seed = 1): Rgba {
  const data = new Uint8Array(width * height * 4);
  let s = seed;
  for (let i = 0; i < width * height; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    const rgb = parseInt(PALETTE[s % PALETTE.length].slice(1), 16);
    data.set([(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, 255], i * 4);
  }
  return { width, height, data };
}

/** Crop of an image (to simulate a shifted rectangle). */
function crop(image: Rgba, x: number, y: number, width: number, height: number): Rgba {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    data.set(image.data.subarray(((y + row) * image.width + x) * 4, ((y + row) * image.width + x + width) * 4), row * width * 4);
  }
  return { width, height, data };
}

describe('one pixel per block', () => {
  it('"Native dimensions": 1170 × 720 with block 3 gives 390 × 240', () => {
    expect(nativeSize({ width: 1170, height: 720 }, 3)).toEqual({ width: 390, height: 240 });
    const native = nativeFrame(390, 240);
    const capture = upscale(native, 3);
    expect([capture.width, capture.height]).toEqual([1170, 720]);
    const back = verifyFrame(capture, 3, ref);
    expect([back.width, back.height]).toEqual([390, 240]);
    expect(Buffer.from(back.data).equals(Buffer.from(native.data))).toBe(true);
  });

  it('a rectangle shifted by one pixel fails with work, pass, frame and differing pixels', () => {
    const big = upscale(nativeFrame(40, 30), 3);
    const shifted = crop(big, 1, 0, 116, 90);
    expect(() => verifyFrame(shifted, 3, ref)).toThrow(/d, forward pass, frame 7: the rectangle 116 × 90 is not a whole number of blocks of 3/);
    const misaligned = crop(big, 1, 0, 114, 90);
    expect(() => verifyFrame(misaligned, 3, ref)).toThrow(/^d, forward pass, frame 7: \d+ differing pixels/);
  });

  it('samples the bottom-left pixel of each block', () => {
    const capture: Rgba = { width: 2, height: 2, data: new Uint8Array([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255, 4, 4, 4, 255]) };
    expect([...sampleBlocks(capture, 2).data]).toEqual([3, 3, 3, 255]);
  });

  it('a transparent or out-of-palette pixel makes the recording fail', () => {
    const native = nativeFrame(8, 4);
    expect(() => checkPalette(native, PALETTE, ref)).not.toThrow();
    const clear = { ...native, data: native.data.slice() };
    clear.data[3] = 0;
    expect(() => checkPalette(clear, PALETTE, ref)).toThrow('d, forward pass, frame 7: 1 non-opaque pixels');
    const stray = { ...native, data: native.data.slice() };
    stray.data.set([10, 20, 30], 8);
    expect(() => checkPalette(stray, PALETTE, ref)).toThrow("d, forward pass, frame 7: 1 pixels outside the work's palette (for example #0a141e)");
    expect(() => checkPalette(native, [...PALETTE, ...Array.from({ length: 13 }, (_, i) => `#0000${(i + 16).toString(16)}`)], ref)).toThrow(CaptureError);
  });
});

describe("rectangle aligned to the view's grid", () => {
  // A 1172 × 722 view at (10, 20): the grid starts at the bottom left, at (10, 742).
  const view = { left: 10, top: 20, width: 1172, height: 722 };

  it('inside: whole blocks only; the partial row stays at the top and the partial column on the right', () => {
    expect(alignedRect(view, 3, { mode: 'inside' })).toEqual({ x: 10, y: 22, width: 1170, height: 720 });
  });

  it('inside with a crop in blocks from each edge', () => {
    expect(alignedRect(view, 3, { mode: 'inside', crop: { right: 100, bottom: 10 } })).toEqual({ x: 10, y: 22 - 30 + 30, width: 1170 - 300, height: 720 - 30 });
    expect(() => alignedRect(view, 3, { mode: 'inside', crop: { left: 400 } })).toThrow(CaptureError);
  });

  it('cover: the smallest rectangle of blocks that contains the view (Sow, block of 2)', () => {
    expect(alignedRect({ left: 553, top: 186, width: 461, height: 461 }, 2, { mode: 'cover' })).toEqual({ x: 553, y: 185, width: 462, height: 462 });
    expect(alignedRect({ left: 553, top: 186, width: 460, height: 460 }, 2, { mode: 'cover' })).toEqual({ x: 553, y: 186, width: 460, height: 460 });
  });
});
