// Physics of the kaleidoscope chamber: discs (beads and specimens) inside the circular cell of
// radius 1, in cell coordinates. The cell turns with the barrel, so the "down on the screen" gravity
// turns by −β inside it and the contents tumble. Seeded fixed step at 120 Hz, global sleep and
// exposures (the latest positions of each body). Pure module, no DOM.

import { mulberry32 } from '../../../pipeline/scenes/random';
import { viewToCell } from './fold';

export const STEP = 1 / 120;
export const MAX_SUBSTEPS = 4;
export const GRAVITY = 3.2;
export const RESTITUTION = 0.35;
export const FRICTION = 0.3;
export const SLEEP_SPEED = 0.02;
export const SLEEP_AFTER = 1.5;
export const SHAKE_SPEED = 1.8;
/** Push: fraction of the pointer velocity (px/s) passed on to the bodies (R/s). */
export const PUSH_GAIN = 0.004;
const ITERATIONS = 8;
const SLOP = 0.002;
const BOUNCE_MIN = 0.12;
/** Rolling resistance (R/s² at the rim): a piece of glass does not keep spinning in place. */
const ROLLING = 1.2;

export interface Exposure {
  x: number;
  y: number;
  a: number;
}

export interface BodyInit {
  kind: 'bead' | 'specimen';
  /** Identity of the contents: a bead style index or the specimen's uid. */
  key: number;
  r: number;
  x?: number;
  y?: number;
  a?: number;
}

export interface Body {
  uid: number;
  kind: 'bead' | 'specimen';
  key: number;
  r: number;
  invM: number;
  invI: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  w: number;
  /** Exposures, from oldest to newest. */
  trail: Exposure[];
}

export interface StepResult {
  /** Something moved (a repaint is needed). */
  moved: boolean;
  /** Audible collisions in this frame: relative normal velocity (R/s), from highest to lowest. */
  impacts: number[];
}

export class Chamber {
  readonly bodies: Body[] = [];
  /** Barrel angle (°, clockwise). */
  barrel = 0;
  /** Every body is still: there is nothing to simulate or paint. */
  asleep = false;
  /** HOLD: the frozen plate after "Every turn at once"; nothing moves until the next touch. */
  hold = false;
  /** Exposures per body and spacing between samples (s). */
  capacity = 12;
  interval = 0.05;

  private rng: () => number;
  private nextUid = 1;
  private accumulator = 0;
  private calm = 0;
  private sampleClock = 0;
  private gx = 0;
  private gy = -GRAVITY;
  private pending: { at: number; init: BodyInit }[] = [];
  private clock = 0;
  private impacts: number[] = [];
  private snapshot: number[] = [];
  private windowClock = 0;

  /** Default seed: 1816, the year of Brewster's kaleidoscope. */
  constructor(seed = 1816) {
    this.rng = mulberry32(seed);
  }

  /** Number of bodies still waiting to fall (initial load). */
  get pendingCount(): number {
    return this.pending.length;
  }

  random(): number {
    return this.rng();
  }

  add(init: BodyInit): Body {
    const m = init.r * init.r;
    const body: Body = {
      uid: this.nextUid++,
      kind: init.kind,
      key: init.key,
      r: init.r,
      invM: 1 / m,
      invI: 1 / (0.5 * m * init.r * init.r),
      x: init.x ?? 0,
      y: init.y ?? 0,
      vx: 0,
      vy: 0,
      a: init.a ?? 0,
      w: 0,
      trail: [],
    };
    this.bodies.push(body);
    this.wake();
    return body;
  }

  /** Adds a body that falls from the top of the cell (in view coordinates) after `delay` s. */
  drop(init: BodyInit, delay = 0): void {
    this.pending.push({ at: this.clock + delay, init });
    this.wake();
  }

  /** Removes bodies (and bodies still waiting to fall) by kind and key. */
  remove(predicate: (body: { kind: Body['kind']; key: number }) => boolean): void {
    for (let i = this.bodies.length - 1; i >= 0; i--) if (predicate(this.bodies[i])) this.bodies.splice(i, 1);
    this.pending = this.pending.filter((p) => !predicate(p.init));
    this.wake();
  }

  wake(): void {
    this.asleep = false;
    this.calm = 0;
    this.snapshot = [];
  }

  /** Leaves HOLD (on the next touch on the Scope) and goes back to 12 exposures. */
  release(): void {
    if (!this.hold) return;
    this.hold = false;
    this.setExposures(12, 0.05);
    this.wake();
  }

  setExposures(capacity: number, interval: number): void {
    this.capacity = capacity;
    this.interval = interval;
    for (const body of this.bodies) if (body.trail.length > capacity) body.trail.splice(0, body.trail.length - capacity);
  }

  /** Sets the barrel angle; the screen's gravity is rotated inside the cell. */
  setBarrel(deg: number): void {
    if (deg === this.barrel) return;
    this.barrel = deg;
    const [gx, gy] = viewToCell(0, -GRAVITY, deg);
    this.gx = gx;
    this.gy = gy;
    if (!this.hold) this.wake();
  }

  /** Shake: every body gets 1.8 R/s in a seeded pseudorandom direction. */
  shake(): void {
    this.release();
    for (const body of this.bodies) {
      const t = this.rng() * Math.PI * 2;
      body.vx += Math.cos(t) * SHAKE_SPEED;
      body.vy += Math.sin(t) * SHAKE_SPEED;
      body.w += (this.rng() - 0.5) * 12;
    }
    this.wake();
  }

  /** Horizontal push from a drag inside the eyepiece (pointer velocity in px/s, view). */
  push(pointerVx: number): void {
    this.release();
    const [ix, iy] = viewToCell(pointerVx * PUSH_GAIN, 0, this.barrel);
    for (const body of this.bodies) {
      // Small bodies respond more: the push is a breath of air, not a hand.
      const k = 0.06 / Math.max(0.06, body.r);
      body.vx += ix * k;
      body.vy += iy * k;
    }
    this.wake();
  }

  /** Advances `dt` real seconds in fixed steps of 1/120 s (at most 4 per frame). */
  step(dt: number): StepResult {
    this.impacts = [];
    if (this.hold || (this.asleep && this.pending.length === 0)) {
      this.accumulator = 0;
      return { moved: false, impacts: this.impacts };
    }
    this.accumulator = Math.min(this.accumulator + dt, STEP * MAX_SUBSTEPS);
    let moved = false;
    while (this.accumulator >= STEP - 1e-9) {
      this.accumulator -= STEP;
      moved = this.substep() || moved;
      if (this.asleep) {
        this.accumulator = 0;
        break;
      }
    }
    this.impacts.sort((a, b) => b - a);
    return { moved, impacts: this.impacts };
  }

  /** Simulates `seconds` in one go (reduced motion, tests): no cap on substeps. */
  simulate(seconds: number, onStep?: (t: number) => void): void {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i++) {
      onStep?.(i * STEP);
      if (this.hold) break;
      this.substep();
    }
  }

  private spawnPending(): void {
    if (this.pending.length === 0) return;
    const due = this.pending.filter((p) => p.at <= this.clock);
    if (due.length === 0) return;
    this.pending = this.pending.filter((p) => p.at > this.clock);
    for (const { init } of due) {
      // It falls from the top of the view, with a little horizontal randomness; converted to the cell.
      const vx = (this.rng() - 0.5) * 0.6;
      const vy = 0.62 - init.r;
      const [cx, cy] = init.x !== undefined && init.y !== undefined ? [init.x, init.y] : viewToCell(vx, vy, this.barrel);
      this.add({ ...init, x: cx, y: cy, a: this.rng() * Math.PI * 2 });
    }
  }

  private substep(): boolean {
    const h = STEP;
    this.clock += h;
    this.spawnPending();
    const bodies = this.bodies;

    // 1. Gravity and air damping; at low speed, extra damping so things settle.
    for (const b of bodies) {
      b.vx += this.gx * h;
      b.vy += this.gy * h;
      const speed = Math.hypot(b.vx, b.vy);
      const damp = speed < 0.1 ? Math.exp(-5 * h) : Math.exp(-0.25 * h);
      b.vx *= damp;
      b.vy *= damp;
      b.w *= Math.exp(-(speed < 0.1 ? 6 : 1.2) * h);
      const brake = (ROLLING * h) / b.r;
      b.w = Math.abs(b.w) <= brake ? 0 : b.w - Math.sign(b.w) * brake;
    }

    // 2. Contact impulses (sequential).
    for (let it = 0; it < ITERATIONS; it++) {
      const record = it === 0;
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) this.solvePair(a, bodies[j], record);
        this.solveWall(a, record);
      }
    }

    // 3. Integration.
    for (const b of bodies) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.a += b.w * h;
    }

    // 4. Position correction (adds no energy): separates overlaps and pushes back to the wall.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const overlap = a.r + b.r - dist;
          if (overlap <= SLOP) continue;
          const nx = dist > 1e-9 ? dx / dist : 1;
          const ny = dist > 1e-9 ? dy / dist : 0;
          const k = ((overlap - SLOP) * 0.8) / (a.invM + b.invM);
          a.x -= nx * k * a.invM;
          a.y -= ny * k * a.invM;
          b.x += nx * k * b.invM;
          b.y += ny * k * b.invM;
        }
        const d = Math.hypot(a.x, a.y);
        const limit = 1 - a.r;
        if (d > limit) {
          a.x *= limit / d;
          a.y *= limit / d;
        }
      }
    }

    // 5. Exposures.
    this.sampleClock += h;
    if (this.sampleClock >= this.interval - 1e-9) {
      this.sampleClock = 0;
      this.sample();
    }

    // 6. Global sleep. The solver leaves a jitter of one gravity step in the stacks, so stillness
    // is measured by net displacement over 0.25 s windows, not by instantaneous velocity.
    this.windowClock += h;
    if (this.windowClock >= 0.25 - 1e-9) {
      let drift = Infinity;
      let spin = Infinity;
      if (this.snapshot.length === bodies.length * 3) {
        drift = 0;
        spin = 0;
        bodies.forEach((b, i) => {
          drift = Math.max(drift, Math.hypot(b.x - this.snapshot[i * 3], b.y - this.snapshot[i * 3 + 1]) / this.windowClock);
          spin = Math.max(spin, (Math.abs(b.a - this.snapshot[i * 3 + 2]) * b.r) / this.windowClock);
        });
      }
      // Spinning in place gets a wider threshold: a bead squeezed in the stack jitters by rotating.
      const quiet = this.pending.length === 0 && drift < SLEEP_SPEED && spin < 2 * SLEEP_SPEED;
      this.calm = quiet ? this.calm + this.windowClock : 0;
      this.snapshot = bodies.flatMap((b) => [b.x, b.y, b.a]);
      this.windowClock = 0;
    }
    if (this.calm >= SLEEP_AFTER - 1e-9) {
      this.asleep = true;
      for (const b of bodies) {
        b.vx = 0;
        b.vy = 0;
        b.w = 0;
      }
    }
    return true;
  }

  /** Stores one exposure per body if it moved since the last one (the plate does not fill up with still copies). */
  private sample(): void {
    for (const b of this.bodies) {
      const last = b.trail[b.trail.length - 1];
      if (last && Math.hypot(b.x - last.x, b.y - last.y) < 0.004 && Math.abs(b.a - last.a) < 0.05) continue;
      b.trail.push({ x: b.x, y: b.y, a: b.a });
      if (b.trail.length > this.capacity) b.trail.shift();
    }
  }

  private solvePair(a: Body, b: Body, record: boolean): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const reach = a.r + b.r;
    if (dist >= reach + 0.002) return;
    const nx = dist > 1e-9 ? dx / dist : 1;
    const ny = dist > 1e-9 ? dy / dist : 0;
    const tx = -ny;
    const ty = nx;
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    if (record && -vn > 0.3) this.impacts.push(-vn);
    const e = -vn > BOUNCE_MIN ? RESTITUTION : 0;
    const jn = (-(1 + e) * vn) / (a.invM + b.invM);
    a.vx -= jn * nx * a.invM;
    a.vy -= jn * ny * a.invM;
    b.vx += jn * nx * b.invM;
    b.vy += jn * ny * b.invM;
    // Tangential friction and the spin from its torque.
    const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - b.w * b.r - a.w * a.r;
    const kt = a.invM + b.invM + a.r * a.r * a.invI + b.r * b.r * b.invI;
    let jt = -vt / kt;
    const maxF = FRICTION * jn;
    jt = Math.max(-maxF, Math.min(maxF, jt));
    a.vx -= jt * tx * a.invM;
    a.vy -= jt * ty * a.invM;
    b.vx += jt * tx * b.invM;
    b.vy += jt * ty * b.invM;
    a.w -= a.r * jt * a.invI;
    b.w -= b.r * jt * b.invI;
  }

  private solveWall(b: Body, record: boolean): void {
    const d = Math.hypot(b.x, b.y);
    if (d + b.r < 1 - 0.002 || d < 1e-9) return;
    const nx = b.x / d;
    const ny = b.y / d;
    const vn = b.vx * nx + b.vy * ny;
    if (vn <= 0) return;
    if (record && vn > 0.3) this.impacts.push(vn);
    const e = vn > BOUNCE_MIN ? RESTITUTION : 0;
    const jn = ((1 + e) * vn) / b.invM;
    b.vx -= jn * nx * b.invM;
    b.vy -= jn * ny * b.invM;
    // The wall is fixed in the cell: friction against the contact point.
    const tx = -ny;
    const ty = nx;
    const vt = b.vx * tx + b.vy * ty + b.w * b.r;
    const kt = b.invM + b.r * b.r * b.invI;
    let jt = -vt / kt;
    const maxF = FRICTION * jn;
    jt = Math.max(-maxF, Math.min(maxF, jt));
    b.vx += jt * tx * b.invM;
    b.vy += jt * ty * b.invM;
    b.w += b.r * jt * b.invI;
  }
}
