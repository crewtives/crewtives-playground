// Tonal Vogel print on the hero field: 1,200 dots at θ = n·α, r = c·√n, centered on the
// eyepiece, so the eyepiece sits at the heart of a printed sunflower. It turns at one tenth of the
// barrel. A 2D canvas the size of the hero, repainted only when the angle or the size changes.

import { GOLDEN_ANGLE } from './specimens/spec';

const DOTS = 1200;
const C_DESKTOP = 19;
const EYE_DESKTOP = 720;

export class VogelPrint {
  private readonly ctx: CanvasRenderingContext2D | null;
  private angle = 0;
  private drawn = NaN;
  private raf = 0;
  private cx = 0;
  private cy = 0;
  private scale = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly host: HTMLElement,
    private readonly eye: HTMLElement,
    private readonly color: string,
  ) {
    this.ctx = canvas.getContext('2d');
    new ResizeObserver(() => this.measure()).observe(host);
    this.measure();
  }

  /** Barrel angle (°): the print turns at 0.1×. */
  setBarrel(beta: number): void {
    this.angle = beta * 0.1;
    if (Math.abs(this.angle - this.drawn) < 0.05) return;
    this.schedule();
  }

  private measure(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    const hostBox = this.host.getBoundingClientRect();
    const eyeBox = this.eye.getBoundingClientRect();
    this.cx = eyeBox.left + eyeBox.width / 2 - hostBox.left;
    this.cy = eyeBox.top + eyeBox.height / 2 - hostBox.top;
    this.scale = eyeBox.width / EYE_DESKTOP;
    this.drawn = NaN;
    this.draw();
  }

  private schedule(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = this.canvas.width / Math.max(1, this.host.clientWidth);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = this.color;
    const c = C_DESKTOP * this.scale;
    const alpha = (GOLDEN_ANGLE * Math.PI) / 180;
    const turn = (this.angle * Math.PI) / 180;
    // Dots that fall under the eyepiece and its ring are never seen, so they are skipped.
    const hidden = Math.pow((EYE_DESKTOP * 0.5 * this.scale) / c, 2);
    ctx.beginPath();
    for (let n = Math.floor(hidden); n < DOTS; n++) {
      const r = c * Math.sqrt(n);
      const t = n * alpha + turn;
      const d = (4 + (5 * n) / DOTS) * this.scale * 0.5 + 0.5;
      const x = this.cx + r * Math.cos(t);
      const y = this.cy + r * Math.sin(t);
      ctx.moveTo(x + d, y);
      ctx.arc(x, y, d, 0, Math.PI * 2);
    }
    ctx.fill();
    this.drawn = this.angle;
  }
}
