// Physics of the brass ring: a flywheel with inertia that spins freely and only catches a detent
// (multiples of 15°) below 40°/s, after it is released. Keyboard steps skip the detent. Pure
// module: no DOM and no three, with fixtures in ring.test.ts.

/** Angles in degrees; the barrel turns clockwise as β grows (like a dial). */
export const DETENT = 15;
export const MAX_RELEASE = 720;
export const DECAY = 2.2;
export const DETENT_SPEED = 40;
const DETENT_K = 60;
const DETENT_C = 2 * Math.sqrt(DETENT_K);
/** Window for measuring the release velocity (ms). */
const RELEASE_WINDOW = 80;

type Phase = 'idle' | 'drag' | 'free' | 'detent' | 'drive';

export interface RingEvents {
  /** Crossing of a detent (a multiple of 15°) while the barrel turns. */
  onDetent?: (angle: number) => void;
}

/** Normalizes to [0, 360). */
export function wrap360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Shortest angular difference, in (−180, 180]. */
export function shortestDelta(from: number, to: number): number {
  let d = wrap360(to - from);
  if (d > 180) d -= 360;
  return d;
}

export class Ring {
  /** Accumulated barrel angle (not normalized: it keeps the turns). */
  angle = 0;
  /** Angular velocity (°/s). */
  omega = 0;
  phase: Phase = 'idle';
  /** Without inertia (reduced motion): a release settles instantly. */
  inertia = true;

  private samples: { t: number; angle: number }[] = [];
  private grabOffset = 0;
  private detentTarget = 0;
  private driveLeft = 0;
  private driveEnd = 0;
  private readonly events: RingEvents;

  constructor(events: RingEvents = {}) {
    this.events = events;
  }

  /** Visible angle in [0, 360). */
  get value(): number {
    return wrap360(this.angle);
  }

  /** Is it still moving on its own? */
  get moving(): boolean {
    return this.phase === 'free' || this.phase === 'detent' || this.phase === 'drive';
  }

  /** Starts a drag: `pointerAngle` is the pointer's angle around the center (°, clockwise from 12 o'clock). */
  grab(pointerAngle: number, t: number): void {
    this.phase = 'drag';
    this.omega = 0;
    this.grabOffset = this.angle - pointerAngle;
    this.samples = [{ t, angle: this.angle }];
  }

  /** Moves the drag: the barrel follows the pointer, unwrapping the ±180° jump. */
  drag(pointerAngle: number, t: number): void {
    if (this.phase !== 'drag') return;
    const target = pointerAngle + this.grabOffset;
    const next = this.angle + shortestDelta(this.angle, target);
    this.crossDetents(this.angle, next);
    this.angle = next;
    this.samples.push({ t, angle: next });
    while (this.samples.length > 2 && t - this.samples[0].t > RELEASE_WINDOW) this.samples.shift();
  }

  /** Release: average velocity over the last 80 ms, capped at ±720°/s. */
  release(t: number): void {
    if (this.phase !== 'drag') return;
    // If the finger stayed still before letting go, the still time counts and the velocity drops by itself.
    const recent = this.samples.filter((s) => t - s.t <= RELEASE_WINDOW);
    let omega = 0;
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const span = (t - first.t) / 1000;
      if (span > 0.004) omega = (last.angle - first.angle) / span;
    }
    this.fling(omega);
  }

  /** Releases with a given velocity (°/s). */
  fling(omega: number): void {
    this.omega = Math.max(-MAX_RELEASE, Math.min(MAX_RELEASE, omega));
    if (!this.inertia) {
      this.omega = 0;
      const target = Math.round(this.angle / DETENT) * DETENT;
      this.crossDetents(this.angle, target);
      this.angle = target;
      this.phase = 'idle';
      return;
    }
    this.phase = Math.abs(this.omega) >= DETENT_SPEED ? 'free' : 'detent';
    if (this.phase === 'detent') this.detentTarget = Math.round(this.angle / DETENT) * DETENT;
  }

  /** Keyboard step: the barrel stays exactly where the step leaves it, with no detent. */
  step(delta: number): void {
    const next = this.angle + delta;
    this.crossDetents(this.angle, next);
    this.angle = next;
    this.omega = 0;
    this.phase = 'idle';
  }

  /** Places the barrel without events (restoring a garden). */
  set(angle: number): void {
    this.angle = angle;
    this.omega = 0;
    this.phase = 'idle';
  }

  /** Motorized turn: `degrees` at `speed` °/s ("Every turn at once"). */
  drive(degrees: number, speed: number): void {
    this.phase = 'drive';
    this.omega = Math.sign(degrees) * Math.abs(speed);
    this.driveLeft = Math.abs(degrees);
    this.driveEnd = this.angle + degrees;
  }

  /** Stops all motion at the current angle. */
  stop(): void {
    this.omega = 0;
    this.phase = 'idle';
  }

  /** Advances the physics by `dt` seconds. Returns true if the angle changed. */
  update(dt: number): boolean {
    if (dt <= 0) return false;
    const before = this.angle;
    switch (this.phase) {
      case 'free': {
        // Flywheel: ω ← ω·e^(−2.2·dt), integrated exactly within the step.
        const decay = Math.exp(-DECAY * dt);
        this.angle += (this.omega * (1 - decay)) / DECAY;
        this.omega *= decay;
        if (Math.abs(this.omega) < DETENT_SPEED) {
          this.phase = 'detent';
          // The nearest detent in the direction of the spin: it never goes back against the inertia.
          const dir = Math.sign(this.omega) || 1;
          const ahead = dir > 0 ? Math.ceil(this.angle / DETENT) : Math.floor(this.angle / DETENT);
          this.detentTarget = ahead * DETENT;
        }
        break;
      }
      case 'detent': {
        // Critically damped spring toward the detent, in substeps for stability.
        const n = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h = dt / n;
        for (let i = 0; i < n; i++) {
          const x = this.angle - this.detentTarget;
          const a = -DETENT_K * x - DETENT_C * this.omega;
          this.omega += a * h;
          this.angle += this.omega * h;
        }
        if (Math.abs(this.angle - this.detentTarget) < 0.02 && Math.abs(this.omega) < 0.5) {
          this.angle = this.detentTarget;
          this.omega = 0;
          this.phase = 'idle';
        }
        break;
      }
      case 'drive': {
        const move = Math.min(this.driveLeft, Math.abs(this.omega) * dt);
        this.driveLeft -= move;
        this.angle += Math.sign(this.omega) * move;
        if (this.driveLeft <= 1e-9) {
          this.angle = this.driveEnd;
          this.omega = 0;
          this.phase = 'idle';
        }
        break;
      }
      default:
        return false;
    }
    this.crossDetents(before, this.angle);
    return this.angle !== before;
  }

  private crossDetents(from: number, to: number): void {
    if (!this.events.onDetent || from === to) return;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const first = Math.floor(lo / DETENT) + 1;
    const last = Math.floor(hi / DETENT);
    // One tick per detent crossed; in a large jump one is enough (the sound limits the rate).
    if (last >= first) this.events.onDetent(wrap360(last * DETENT));
    else if (hi % DETENT === 0 && lo !== hi) this.events.onDetent(wrap360(hi));
  }
}

/** Pointer angle around a center: degrees clockwise from 12 o'clock. */
export function pointerAngle(px: number, py: number, cx: number, cy: number): number {
  return wrap360((Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI);
}
