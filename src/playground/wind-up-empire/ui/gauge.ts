// The FLEET gauge: a tin dial with a 0 to 5 unit scale, ticks at the radius of each orbit (E, D, A,
// B, C and the home top) and a needle with spring inertia that follows the latest rocket's distance
// from the center. The r, v and t readings come from the simulation.
import { HOME, WORLD_BODIES } from '../orbits';

const NS = 'http://www.w3.org/2000/svg';
const MAX_R = 5;
/** Arc of the scale: from −135° to +135° (0° = up). */
const SWEEP = 270;
const START = -135;
const K = 300;
const C = 24;

function angleFor(r: number): number {
  return START + (Math.min(MAX_R, Math.max(0, r)) / MAX_R) * SWEEP;
}

function polar(angleDeg: number, radius: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [100 + radius * Math.cos(a), 100 + radius * Math.sin(a)];
}

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

export class FleetGauge {
  private angle = angleFor(HOME.radius);
  private velocity = 0;
  private target = angleFor(HOME.radius);
  private readonly needle: SVGGElement;
  private readonly r: HTMLElement;
  private readonly v: HTMLElement;
  private readonly t: HTMLElement;

  constructor(root: HTMLElement) {
    const svg = root.querySelector('svg')!;
    const scale = svg.querySelector('.gauge-scale')!;
    const labels = svg.querySelector('.gauge-labels')!;
    this.needle = svg.querySelector('#gauge-needle')!;
    this.r = root.querySelector('#gauge-r')!;
    this.v = root.querySelector('#gauge-v')!;
    this.t = root.querySelector('#gauge-t')!;

    // Printed arc and minor ticks every 0.25 u.
    const [x0, y0] = polar(START, 72);
    const [x1, y1] = polar(START + SWEEP, 72);
    scale.append(el('path', { d: `M${x0} ${y0} A72 72 0 1 1 ${x1} ${y1}` }));
    for (let r = 0; r <= MAX_R + 1e-6; r += 0.25) {
      const a = angleFor(r);
      const major = Math.abs(r - Math.round(r)) < 1e-6;
      const [ax, ay] = polar(a, 72);
      const [bx, by] = polar(a, major ? 62 : 67);
      scale.append(el('line', { x1: ax, y1: ay, x2: bx, y2: by, class: major ? '' : 'minor' }));
    }
    // One tick per orbit, labeled with the world's letter; the home top gets its icon.
    WORLD_BODIES.forEach((w, i) => {
      const a = angleFor(w.radius);
      const [ax, ay] = polar(a, 76);
      const [bx, by] = polar(a, 84);
      scale.append(el('line', { x1: ax, y1: ay, x2: bx, y2: by }));
      // The inner orbits are very close together: the letters alternate between two radii.
      const [lx, ly] = polar(a, i % 2 ? 60 : 47);
      const text = el('text', { x: lx, y: ly + 5, 'text-anchor': 'middle' });
      text.textContent = w.letter;
      labels.append(text);
    });
    const ha = angleFor(HOME.radius);
    const [hx, hy] = polar(ha, 50);
    const house = el('path', {
      class: 'house',
      d: `M${hx - 7} ${hy + 1} L${hx} ${hy - 6} L${hx + 7} ${hy + 1} M${hx - 5} ${hy - 1} V${hy + 7} H${hx + 5} V${hy - 1}`,
    });
    labels.append(house);
    const [hax, hay] = polar(ha, 76);
    const [hbx, hby] = polar(ha, 84);
    scale.append(el('line', { x1: hax, y1: hay, x2: hbx, y2: hby }));

    this.applyAngle();
  }

  /** New target for the needle: the latest rocket's distance from the center (or the home top at rest). */
  setReadout(reading: { r: number; v: number; t: number } | null, idle: boolean): void {
    this.target = angleFor(idle || !reading ? HOME.radius : reading.r);
    if (reading) {
      this.r.textContent = `r ${reading.r.toFixed(2)}`;
      this.v.textContent = `v ${reading.v.toFixed(2)}`;
      const whole = Math.floor(reading.t);
      const tenth = Math.floor((reading.t - whole) * 10);
      this.t.textContent = `t ${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}.${tenth}`;
    }
  }

  /** Jumps to the target without the spring (reduced motion). */
  snap(): void {
    this.angle = this.target;
    this.velocity = 0;
    this.applyAngle();
  }

  /** Advances the spring; returns true while the needle moves. */
  tick(dt: number): boolean {
    const h = Math.min(dt, 1 / 30);
    const steps = Math.max(1, Math.ceil(h / (1 / 240)));
    const sub = h / steps;
    for (let i = 0; i < steps; i++) {
      const acc = -K * (this.angle - this.target) - C * this.velocity;
      this.velocity += acc * sub;
      this.angle += this.velocity * sub;
    }
    this.applyAngle();
    const moving = Math.abs(this.angle - this.target) > 0.1 || Math.abs(this.velocity) > 1;
    if (!moving) {
      this.angle = this.target;
      this.velocity = 0;
      this.applyAngle();
    }
    return moving;
  }

  private applyAngle(): void {
    this.needle.setAttribute('transform', `rotate(${this.angle.toFixed(2)} 100 100)`);
  }
}
