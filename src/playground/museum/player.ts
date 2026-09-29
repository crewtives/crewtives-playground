// Loop player (D5): one 2D canvas per VISTA that draws the frame the page clock assigns to it, at an
// integer scale in device pixels (k = floor(dpr·slot/native)) and without smoothing. Only if not even
// k = 1 fits is the loop shown whole, scaled down with smoothing. In HOLD it does not repaint. Without
// the decoder (`DecompressionStream`), it stays on the poster, with no errors.

import type { RuntimeView } from './build/render';
import { decode4dlp, type Decoded4dlp } from './loops/format.ts';
import type { PassDirection } from './loops/provenance';

const passes = new Map<string, Promise<Decoded4dlp>>();

export const canDecode = typeof DecompressionStream === 'function' && typeof Response !== 'undefined';

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  // If the server already decompressed it (Content-Encoding), the 4DLP arrives as is.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Downloads and decodes a pass; the promise is shared between VISTAs and index rows. */
export function loadPass(url: string): Promise<Decoded4dlp> {
  let pending = passes.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`loop ${url}: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => gunzip(new Uint8Array(buffer)))
      .then(decode4dlp);
    passes.set(url, pending);
  }
  return pending;
}

/** Integer scale in device pixels, or 0 if not even k = 1 fits. */
export function integerScale(slotCss: number, native: number, dpr: number): number {
  return Math.floor((slotCss * dpr + 1e-6) / native);
}

export interface PlayerOptions {
  /** Index row: the canvas fills the thumbnail, cropped (object-fit), at native size. */
  thumb?: boolean;
}

export class LoopPlayer {
  readonly view: RuntimeView;
  private readonly slot: HTMLElement;
  private readonly poster: HTMLImageElement | null;
  private readonly thumb: boolean;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly native: HTMLCanvasElement;
  private nativeCtx: CanvasRenderingContext2D | null = null;
  private image: ImageData | null = null;
  private readonly decoded: Partial<Record<PassDirection, Decoded4dlp>> = {};
  private k = 1;
  /** Frame at the on-screen size: inside it, poster and canvas are the size of their buffer and are scaled by 1/dpr. */
  private frame: HTMLElement | null = null;
  private painted: { frame: number; pass: PassDirection } | null = null;
  /** Signals that a pass has arrived (to paint the clock's frame). */
  onReady: (() => void) | null = null;

  constructor(slot: HTMLElement, view: RuntimeView, options: PlayerOptions = {}) {
    this.slot = slot;
    this.view = view;
    this.thumb = options.thumb ?? false;
    this.poster = slot.querySelector('img');
    this.native = document.createElement('canvas');
    if (view.native) [this.native.width, this.native.height] = view.native;
    if (!this.thumb && view.native) {
      this.frame = document.createElement('div');
      this.frame.className = 'vista__frame';
      if (this.poster) this.frame.append(this.poster);
      this.slot.append(this.frame);
      this.fit();
      // With JavaScript, the poster is painted into the VISTA's canvas with the same rule as the loop:
      // that way the switch from poster to loop does not change a single pixel (a scaled <img> is not
      // exact in every browser).
      const poster = this.poster;
      if (poster) void poster.decode().then(() => this.drawPoster(), () => undefined);
    }
  }

  private drawPoster(): void {
    if (this.painted || !this.poster || !this.ensureCanvas()) return;
    this.align();
    const ctx = this.ctx!;
    ctx.imageSmoothingEnabled = this.k < 1;
    ctx.drawImage(this.poster, 0, 0, this.canvas!.width, this.canvas!.height);
    this.show();
  }

  private show(): void {
    const parent = this.frame ?? this.slot;
    if (this.canvas!.parentElement !== parent) {
      if (this.poster?.parentElement === parent) this.poster.replaceWith(this.canvas!);
      else parent.append(this.canvas!);
    }
  }

  get ready(): boolean {
    return !!this.decoded.forward;
  }

  has(direction: PassDirection): boolean {
    return !!this.decoded[direction];
  }

  /** Requests a pass if it exists and the browser can decode it. */
  request(direction: PassDirection): void {
    const url = this.view.passes[direction];
    if (!url || !canDecode || this.decoded[direction]) return;
    loadPass(url)
      .then((pass) => {
        this.decoded[direction] = pass;
        this.onReady?.();
      })
      .catch(() => {
        // Without the pass, the VISTA stays on the poster (or on the FORWARD pass): no console errors.
        passes.delete(url);
      });
  }

  /**
   * Recomputes k and the on-screen size (poster and canvas are the same size). Each loop pixel takes
   * k × k device pixels: the element is the size of its buffer in CSS px, is scaled by 1/dpr, and its
   * corner falls on a whole device pixel (otherwise the browser resamples even if the size is exact).
   */
  fit(): void {
    if (this.thumb || !this.view.native || !this.frame) return;
    const [nw, nh] = this.view.native;
    const dpr = window.devicePixelRatio || 1;
    const k = integerScale(this.slot.clientWidth, nw, dpr);
    this.k = k;
    const frame = this.frame;
    const items = [this.poster, this.canvas].filter((el): el is HTMLImageElement | HTMLCanvasElement => !!el);
    if (k < 1) {
      // Not even k = 1 fits: the whole loop, scaled down with smoothing (the only exception).
      Object.assign(frame.style, { width: '100%', height: 'auto', position: 'relative' });
      for (const el of items) Object.assign(el.style, { position: 'static', width: '100%', height: 'auto', transform: 'none', imageRendering: 'auto' });
    } else {
      Object.assign(frame.style, { width: `${(nw * k) / dpr}px`, height: `${(nh * k) / dpr}px`, position: 'relative' });
      for (const el of items) {
        Object.assign(el.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          width: `${nw * k}px`,
          height: `${nh * k}px`,
          maxWidth: 'none',
          transformOrigin: '0 0',
          imageRendering: 'pixelated',
        });
      }
      this.aligned = '';
      this.align();
    }
    if (this.canvas) {
      const bw = k >= 1 ? nw * k : nw;
      const bh = k >= 1 ? nh * k : nh;
      if (this.canvas.width !== bw || this.canvas.height !== bh) {
        this.canvas.width = bw;
        this.canvas.height = bh;
        this.painted = null;
      }
    }
  }

  private aligned = '';

  /**
   * Aligns the corner to a device pixel of the screen. It is repeated on every draw and at the end of
   * every scroll: layout and scrolling shift the page by fractions of a device pixel (fonts arriving,
   * text above, non-integer dpr). With an integer dpr the compositor already snaps the layer to a device
   * pixel, and shifting it by another fraction makes it resample: measured in Chromium, without the
   * correction the six VISTAs come out exact at dpr 1, 2 and 3; with it, not at dpr 2 and 3.
   */
  align(): void {
    if (!this.frame || this.k < 1) return;
    const dpr = window.devicePixelRatio || 1;
    let dx = 0;
    let dy = 0;
    if (!Number.isInteger(dpr)) {
      const box = this.frame.getBoundingClientRect();
      const fx = box.left * dpr;
      const fy = box.top * dpr;
      dx = (Math.round(fx) - fx) / dpr;
      dy = (Math.round(fy) - fy) / dpr;
    }
    const transform = `translate(${dx}px, ${dy}px) scale(${1 / dpr})`;
    if (transform === this.aligned) return;
    this.aligned = transform;
    for (const el of [this.poster, this.canvas]) if (el) el.style.transform = transform;
  }

  private ensureCanvas(): boolean {
    if (this.canvas) return true;
    if (!this.view.native) return false;
    const canvas = document.createElement('canvas');
    canvas.className = this.thumb ? 'index__canvas' : 'vista__canvas';
    if (!this.thumb) {
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', this.slot.dataset.name ?? '');
      if (this.slot.dataset.desc) canvas.setAttribute('aria-describedby', this.slot.dataset.desc);
    } else {
      canvas.setAttribute('aria-hidden', 'true');
      [canvas.width, canvas.height] = this.view.native;
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.nativeCtx = this.native.getContext('2d', { alpha: false });
    if (!this.ctx || !this.nativeCtx) return false;
    this.image = this.nativeCtx.createImageData(this.native.width, this.native.height);
    this.fit();
    return true;
  }

  /**
   * Draws the clock's frame. In REWIND it uses the REWIND pass if it has arrived; otherwise the FORWARD
   * one (whose frames are then shown in reverse order, because the clock counts down). It does not
   * repaint the same frame.
   */
  draw(frame: number, rewinding: boolean): void {
    const pass: PassDirection = rewinding && this.decoded.rewind ? 'rewind' : 'forward';
    const data = this.decoded[pass];
    if (!data || !this.ensureCanvas()) return;
    if (this.painted && this.painted.frame === frame && this.painted.pass === pass) return;
    data.expand(Math.min(frame, data.frames - 1), this.image!.data);
    this.nativeCtx!.putImageData(this.image!, 0, 0);
    this.align();
    const ctx = this.ctx!;
    ctx.imageSmoothingEnabled = this.thumb || this.k < 1 ? true : false;
    ctx.drawImage(this.native, 0, 0, this.canvas!.width, this.canvas!.height);
    this.painted = { frame, pass };
    // From poster to loop without a jump: same size, same place.
    this.show();
  }

  /** Goes back to the poster (an index row that loses the intent). */
  reset(): void {
    if (this.canvas && this.poster && this.canvas.parentElement === this.slot) this.canvas.replaceWith(this.poster);
    this.painted = null;
  }
}
