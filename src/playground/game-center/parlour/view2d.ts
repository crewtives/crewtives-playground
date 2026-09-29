// Parlour Glass without WebGL2: the same physics drawn in Canvas 2D, with the palette's colors. The
// EVERY MOMENT exposure accumulates on a separate canvas; the short shutters are redrawn from the log.
import { BALL_R, GLASS_R, HESO, NAIL_R, STOP_R, STOPS, TULIPS, WINDMILL_BLADE, WINDMILLS } from './layout';
import { dotVisible, DRAIN_HALF, type ParlourSim, type Shutter } from './sim';

const RAMP = ['#ffcc17', '#ff4b26', '#9e1233', '#b04bff'];

function ageColor(age: number): string {
  const i = Math.min(3, Math.floor((Math.max(0, age) / 12) * 3.999));
  return RAMP[i];
}

export class ParlourView2D {
  readonly canvas: HTMLCanvasElement;
  shutter: Shutter = '5';
  flip = false;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly exposure: HTMLCanvasElement;
  private readonly ectx: CanvasRenderingContext2D;
  private readonly sim: ParlourSim;
  private drawn = 0;
  private epoch = -1;
  private scale = 1;

  constructor(host: HTMLElement, sim: ParlourSim) {
    this.sim = sim;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'parlour__canvas2d';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.append(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.exposure = document.createElement('canvas');
    this.ectx = this.exposure.getContext('2d')!;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(host);
  }

  private resize(): void {
    const box = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.max(64, Math.round(Math.min(box.width, box.height) * dpr));
    this.canvas.width = this.canvas.height = size;
    this.exposure.width = this.exposure.height = size;
    this.scale = size / ((GLASS_R + 6) * 2);
    this.epoch = -1;
  }

  private toPx(u: number, v: number): [number, number] {
    const c = this.canvas.width / 2;
    return [c + (this.flip ? -u : u) * this.scale, c + v * this.scale];
  }

  render(): void {
    const { ctx, sim } = this;
    const size = this.canvas.width;
    const s = this.scale;
    const log = sim.dots;

    // Accumulated exposure (EVERY MOMENT): only the new points are drawn.
    if (log.epoch !== this.epoch) {
      this.epoch = log.epoch;
      this.ectx.clearRect(0, 0, size, size);
      this.drawn = log.start;
    }
    if (this.shutter === 'all') {
      for (let k = Math.max(this.drawn, log.start); k < log.count; k++) {
        const i = (k % log.capacity) * 3;
        const t = log.data[i + 2];
        if (t < sim.openedAt) continue;
        const [x, y] = this.toPx(log.data[i], log.data[i + 1]);
        this.ectx.fillStyle = RAMP[3];
        this.ectx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      this.drawn = log.count;
    }

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (GLASS_R + 4) * s, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1140';
    ctx.fill();
    ctx.clip();
    if (this.shutter === 'all') ctx.drawImage(this.exposure, 0, 0);

    // Recent points (the last 12 s age from sodium to ultraviolet).
    const span = this.shutter === 'all' ? 12 : this.shutter === 'now' ? 0 : Number(this.shutter);
    if (span > 0) {
      for (let k = log.count - 1; k >= log.start; k--) {
        const i = (k % log.capacity) * 3;
        const t = log.data[i + 2];
        if (sim.time - t > span) break;
        if (!dotVisible(t, sim.time, this.shutter, sim.openedAt)) continue;
        const [x, y] = this.toPx(log.data[i], log.data[i + 1]);
        ctx.fillStyle = ageColor(sim.time - t);
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    }

    // Nails.
    ctx.fillStyle = '#d9deff';
    for (const n of sim.nails) {
      const [x, y] = this.toPx(n.u, n.v);
      ctx.fillRect(Math.round(x - NAIL_R * s), Math.round(y - NAIL_R * s), Math.max(2, Math.round(NAIL_R * 2 * s)), Math.max(2, Math.round(NAIL_R * 2 * s)));
    }
    // Pocket, tulips and windmills.
    ctx.fillStyle = '#ffcc17';
    for (const side of [-1, 1]) {
      const [x, y] = this.toPx(side * HESO.post, HESO.v);
      ctx.beginPath();
      ctx.arc(x, y, HESO.postR * s, 0, Math.PI * 2);
      ctx.fill();
    }
    {
      const [x, y] = this.toPx(0, HESO.bodyV);
      ctx.beginPath();
      ctx.arc(x, y, HESO.bodyR * s, 0, Math.PI * 2);
      ctx.fill();
    }
    const open = sim.fever > 0;
    ctx.strokeStyle = open ? '#1fd68a' : '#ff4fa0';
    ctx.lineWidth = Math.max(2, 3 * s);
    for (const t of TULIPS) {
      for (const dir of [-1, 1]) {
        const a = ((open ? 28 : 4) * Math.PI) / 180;
        const [x0, y0] = this.toPx(t.u + dir * 5, t.v + 6);
        const [x1, y1] = this.toPx(t.u + dir * 5 + dir * Math.sin(a) * 15, t.v + 6 - Math.cos(a) * 15);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }
    for (let w = 0; w < 2; w++) {
      const mill = WINDMILLS[w];
      const [cx, cy] = this.toPx(mill.u, mill.v);
      sim.bladeDirs(w).forEach(([du, dv], k) => {
        const [x1, y1] = this.toPx(mill.u + du * WINDMILL_BLADE, mill.v + dv * WINDMILL_BLADE);
        ctx.strokeStyle = k % 2 ? '#ffcc17' : '#ff4fa0';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      });
    }
    // Rubber stops: wine rubber on a chrome base, on the hoop.
    for (const stop of STOPS) {
      const [x, y] = this.toPx(stop.u, stop.v);
      ctx.fillStyle = '#9aa4b2';
      ctx.beginPath();
      ctx.arc(x, y, (STOP_R + 1.4) * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9e1233';
      ctx.beginPath();
      ctx.arc(x, y, STOP_R * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Balls: chrome with a highlight in sodium.
    for (let i = 0; i < sim.maxBalls; i++) {
      if (!sim.alive[i]) continue;
      const [x, y] = this.toPx(sim.u[i], sim.v[i]);
      ctx.fillStyle = '#9aa4b2';
      ctx.beginPath();
      ctx.arc(x, y, BALL_R * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2f4ff';
      ctx.fillRect(Math.round(x - BALL_R * s * 0.5), Math.round(y - BALL_R * s * 0.5), Math.max(2, Math.round(BALL_R * s * 0.5)), Math.max(2, Math.round(BALL_R * s * 0.5)));
    }
    ctx.restore();
    // Chrome wall with the drain open at the bottom.
    ctx.strokeStyle = '#9aa4b2';
    ctx.lineWidth = Math.max(3, 5 * s);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (GLASS_R + 2) * s, Math.PI / 2 + DRAIN_HALF, Math.PI / 2 - DRAIN_HALF + Math.PI * 2);
    ctx.stroke();
  }
}
