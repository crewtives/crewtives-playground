// The index's wheel shelf: the 6-fold iris that opens from the center over the still image
// (without dithering it again), and the 1-bit Vogel stipple of the lab's empty cells.

import { motion } from '../shared/motion';
import { GOLDEN_ANGLE } from './specimens/spec';

const IRIS_MS = 420;
const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Square crop of the wheel (source pixels), the same one the CSS shows. */
function cropOf(img: HTMLImageElement): { x: number; y: number; s: number } {
  const host = img.closest<HTMLElement>('.wheel-crop');
  const read = (name: string, fallback: number) => {
    const value = parseFloat(host?.style.getPropertyValue(name) ?? '');
    return Number.isFinite(value) ? value : fallback;
  };
  const s = read('--s', Math.min(img.naturalWidth, img.naturalHeight));
  return { x: read('--x', (img.naturalWidth - s) / 2), y: read('--y', (img.naturalHeight - s) / 2), s };
}

/** Paints the 6-fold kaleidoscope (12 wedges) of the wheel's crop, clipped to the circle. */
function kaleidoscope(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const r = size / 2;
  // The 30° wedge comes from the center of the crop: the scene, never the page's lettering.
  const crop = cropOf(img);
  const scale = size / crop.s;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const ox = -(crop.x + crop.s / 2) * scale;
  const oy = -(crop.y + crop.s / 2) * scale;
  ctx.translate(r, r);
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.rotate(Math.floor(i / 2) * (Math.PI / 3));
    if (i % 2) ctx.scale(1, -1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 1.02, -0.001, Math.PI / 6 + 0.002);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, ox, oy, w, h);
    ctx.restore();
  }
  return canvas;
}

export function bindIris(links: HTMLAnchorElement[]): void {
  for (const link of links) {
    const wheel = link.querySelector<HTMLElement>('.wheel--world');
    const img = wheel?.querySelector('img');
    if (!wheel || !img) continue;
    let canvas: HTMLCanvasElement | null = null;
    let art: HTMLCanvasElement | null = null;
    let open = 0;
    let target = 0;
    let from = 0;
    let start = 0;
    let raf = 0;

    const draw = () => {
      if (!canvas || !art) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);
      if (open <= 0.001) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, (size / 2) * open, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(art, 0, 0);
      ctx.restore();
      // Thin ink rule on the iris edge.
      ctx.lineWidth = Math.max(2, size / 160);
      ctx.strokeStyle = '#1b0f2e';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, Math.max(0, (size / 2) * open - ctx.lineWidth / 2), 0, Math.PI * 2);
      ctx.stroke();
    };

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / IRIS_MS);
      open = from + (target - from) * expoOut(t);
      draw();
      raf = t < 1 ? requestAnimationFrame(frame) : 0;
    };

    const ensure = (): boolean => {
      if (!img.complete || img.naturalWidth === 0) return false;
      if (!canvas) {
        const size = Math.round((wheel.clientWidth - 20) * Math.min(2, window.devicePixelRatio || 1));
        canvas = document.createElement('canvas');
        canvas.className = 'iris';
        canvas.width = canvas.height = size;
        canvas.setAttribute('aria-hidden', 'true');
        art = kaleidoscope(img, size);
        wheel.append(canvas);
      }
      return true;
    };

    const go = (to: number) => {
      if (motion.reduced) return;
      if (!ensure()) {
        img.addEventListener('load', () => target === to && go(to), { once: true });
        return;
      }
      target = to;
      from = open;
      start = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    };

    link.addEventListener('pointerenter', () => go(1));
    link.addEventListener('pointerleave', () => document.activeElement !== link && go(0));
    link.addEventListener('focus', () => go(1));
    link.addEventListener('blur', () => go(0));
  }
}

/** 1-bit Vogel stipple in the empty cells: it changes slowly, and stays still under reduced motion. */
export function bindLabStipple(canvases: HTMLCanvasElement[], section: HTMLElement): void {
  const alpha = (GOLDEN_ANGLE * Math.PI) / 180;
  const draw = (phase: number) => {
    canvases.forEach((canvas, i) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#1b0f2e';
      const c = size / 2 / Math.sqrt(150);
      for (let n = 1; n < 150; n++) {
        const r = c * Math.sqrt(n);
        // Each cell has its own rhythm; the phase makes the stipple "breathe".
        const t = n * alpha + phase * (0.6 + 0.25 * i);
        const x = Math.round(size / 2 + r * Math.cos(t));
        const y = Math.round(size / 2 + r * Math.sin(t));
        if ((n + Math.floor(phase * 3 + i)) % 3 === 0) continue;
        ctx.fillRect(x, y, 2, 2);
      }
    });
  };
  draw(0);
  let visible = false;
  let timer = 0;
  let phase = 0;
  const loop = () => {
    timer = 0;
    if (!visible || motion.reduced || document.hidden) return;
    phase += 0.04;
    draw(phase);
    // 8 frames per second: a stipple that changes, not an animation.
    timer = window.setTimeout(loop, 125);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !timer) loop();
  }).observe(section);
  motion.onChange((reduced) => {
    if (!reduced && visible && !timer) loop();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible && !timer) loop();
  });
}
