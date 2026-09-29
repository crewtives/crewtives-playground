// The strip's spark wheel: a knurled tin friction wheel behind a pink celluloid window, drawn on a
// 2D canvas. It is rubbed by moving the pointer back and forth (each change of direction after
// 12 px = 0.5 SPARK, capped at 6 per second); each stroke throws up to 24 sparks out of the window
// and the wheel turns with inertia (friction 0.92 per frame). The "Rub the spark wheel" button
// counts as one stroke. With reduced motion there are no particles: the window glows lemon for
// 200 ms.
import { RubCounter } from '../rub';
import { crackle } from '../voices';

const W = 64;
const H = 36;
const MAX_SPARKS = 120;
const PER_STROKE = 24;
const INK = {
  ink: '#15131c',
  tin: '#c7ccd4',
  tinHi: '#eef0f3',
  tinShade: '#6f7686',
  pink: '#ff6fae',
  lemon: '#fff27a',
  orange: '#ff7a1a',
  chrome: '#ffc81a',
};

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface SparkWheelOptions {
  button: HTMLButtonElement;
  spray: HTMLCanvasElement;
  reduced: () => boolean;
  /** SPARK earned (0.5 per stroke). */
  earn: (spark: number) => void;
}

export class SparkWheel {
  private readonly rub = new RubCounter();
  private readonly wheel: CanvasRenderingContext2D;
  private readonly sprayCtx: CanvasRenderingContext2D;
  private readonly sparks: Spark[] = [];
  private phase = 0;
  private velocity = 0;
  private raf = 0;
  private last = 0;
  private lastStrokeAt = -1e9;
  private glowTimer = 0;
  private lastX: number | null = null;
  /** Strokes paid out (for the tests). */
  strokes = 0;

  constructor(private readonly o: SparkWheelOptions) {
    const canvas = o.button.querySelector('canvas')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    this.wheel = canvas.getContext('2d')!;
    this.wheel.scale(dpr, dpr);
    this.sprayCtx = o.spray.getContext('2d')!;

    const b = o.button;
    b.addEventListener('pointermove', (event) => {
      const box = b.getBoundingClientRect();
      const x = event.clientX - box.left;
      if (this.lastX !== null) this.push(x - this.lastX);
      this.lastX = x;
      this.gain(this.rub.move(event.clientX, event.timeStamp));
    });
    b.addEventListener('pointerleave', () => {
      this.rub.lift();
      this.lastX = null;
    });
    b.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') b.setPointerCapture(event.pointerId);
    });
    b.addEventListener('click', () => {
      // A press (keyboard, or a tap without rubbing) is one stroke.
      if (performance.now() - this.lastStrokeAt < 300) return;
      this.push(18);
      this.gain(this.rub.stroke(performance.now()));
    });
    this.draw();
  }

  private gain(spark: number): void {
    if (!spark) return;
    this.lastStrokeAt = performance.now();
    this.strokes++;
    this.o.earn(spark);
    crackle();
    if (this.o.reduced()) {
      // A lemon glow that lasts while rubbing continues: rubbing fast keeps it lit instead of blinking
      // (an on-off cycle lasts at least 340 ms, fewer than 3 flashes per second).
      this.o.button.classList.add('is-glowing');
      window.clearTimeout(this.glowTimer);
      this.glowTimer = window.setTimeout(() => this.o.button.classList.remove('is-glowing'), 340);
      return;
    }
    this.burst();
  }

  /** The wheel follows the finger: horizontal dragging gives it speed. */
  private push(dx: number): void {
    if (this.o.reduced()) {
      this.phase += dx * 0.12;
      this.draw();
      return;
    }
    this.velocity += dx * 0.05;
    this.loop();
  }

  private burst(): void {
    const box = this.o.button.getBoundingClientRect();
    // The spray is a separate fixed canvas (the strip clips its children with its pressed edge).
    if (!this.sparks.length) {
      this.o.spray.style.left = `${box.left + box.width / 2 - 110}px`;
      this.o.spray.style.top = `${box.top - 10}px`;
    }
    const spray = this.o.spray.getBoundingClientRect();
    // They leave through the bottom edge of the window, in a fan.
    const ox = box.left + box.width / 2 - spray.left;
    const oy = box.top + box.height - 6 - spray.top;
    const n = 12 + Math.floor(Math.random() * (PER_STROKE - 11));
    for (let i = 0; i < n; i++) {
      if (this.sparks.length >= MAX_SPARKS) this.sparks.shift();
      const a = Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 90 + Math.random() * 160;
      this.sparks.push({ x: ox + (Math.random() - 0.5) * 30, y: oy, vx: Math.cos(a) * v + this.velocity * 40, vy: Math.sin(a) * v, life: 1 });
    }
    this.loop();
  }

  private loop(): void {
    if (this.raf) return;
    this.last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.phase += this.velocity;
      this.velocity *= Math.pow(0.92, dt * 60);
      for (const s of this.sparks) {
        s.life -= dt / 0.45;
        s.vy += 520 * dt;
        s.vx *= Math.exp(-2.5 * dt);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) if (this.sparks[i].life <= 0) this.sparks.splice(i, 1);
      this.draw();
      this.drawSpray();
      if (Math.abs(this.velocity) > 0.01 || this.sparks.length) this.raf = requestAnimationFrame(frame);
      else {
        this.raf = 0;
        this.drawSpray();
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** The knurled wheel seen edge-on: teeth that run with the spin, behind the pink celluloid. */
  private draw(): void {
    const c = this.wheel;
    c.clearRect(0, 0, W, H);
    c.fillStyle = INK.ink;
    c.fillRect(0, 0, W, H);
    const pitch = 5;
    const offset = ((this.phase % pitch) + pitch) % pitch;
    const top = 4;
    const bottom = H - 4;
    for (let x = -pitch + offset; x < W + pitch; x += pitch) {
      const px = Math.round(x);
      // Tooth: light crest, flank and dark valley.
      c.fillStyle = INK.tinHi;
      c.fillRect(px, top, 2, bottom - top);
      c.fillStyle = INK.tin;
      c.fillRect(px + 2, top, 1, bottom - top);
      c.fillStyle = INK.tinShade;
      c.fillRect(px + 3, top, 2, bottom - top);
    }
    // Cylinder: the top and bottom edges stay in shadow.
    c.fillStyle = 'rgba(21, 19, 28, 0.55)';
    c.fillRect(0, top, W, 4);
    c.fillRect(0, bottom - 5, W, 5);
    // Pink celluloid on top, with its glint.
    c.fillStyle = 'rgba(255, 111, 174, 0.42)';
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255, 255, 255, 0.55)';
    c.fillRect(0, 10, W, 2);
    c.beginPath();
    c.moveTo(38, 0);
    c.lineTo(46, 0);
    c.lineTo(30, H);
    c.lineTo(22, H);
    c.closePath();
    c.fillStyle = 'rgba(255, 255, 255, 0.18)';
    c.fill();
  }

  private drawSpray(): void {
    const canvas = this.o.spray;
    const box = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(box.width) || canvas.height !== Math.round(box.height)) {
      canvas.width = Math.round(box.width);
      canvas.height = Math.round(box.height);
    }
    const c = this.sprayCtx;
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of this.sparks) {
      c.fillStyle = s.life > 0.55 ? INK.lemon : s.life > 0.25 ? INK.chrome : INK.orange;
      const size = s.life > 0.5 ? 4 : 3;
      c.fillRect(Math.round(s.x), Math.round(s.y), size, size);
    }
  }
}
