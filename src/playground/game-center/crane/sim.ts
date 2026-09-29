// Win a World crane (3F): pure rules and physics, no three and no DOM. A single layer of capsules as
// discs on the machine's floor (x–z plane, with the shared circle solver); the descent, the closing,
// the ascent and the return follow a fixed path at fixed speeds. Fixed step of 1/60 s.
//
// Floor: x ∈ [−5, 5], z ∈ [−5, 5] (positive z toward the glass). The prize chute is at the front
// left (x < −3, z > 3), behind a low lip. The carriage starts above the chute.
import { collideDiscs, type Disc } from '../circles';
import { mulberry32, type Rng } from '../rng';

export const STEP = 1 / 60;
export const CAPSULE_R = 0.9;
export const HALF = 5;
/** Edge of the prize chute (x < CHUTE_X and z > CHUTE_Z). */
export const CHUTE_X = -3;
export const CHUTE_Z = 3;
export const HOME = { x: -4, z: 4 } as const;
export const CARRIAGE_SPEED = 2.2;
export const DROP_SPEED = 4;
export const LIFT_SPEED = 3;
export const CLOSE_SECONDS = 0.22;
export const TOP_Y = 7;
/** Grip probability with the claw centered: the one the card prints. */
export const GRIP_P = 0.8;
/** Horizontal distance to the axis for attempting a grip, and reach of the prongs for pushing. */
export const GRIP_REACH = 0.5;
export const NUDGE_REACH = 1.2;
/** Carriage limits (the center of the claw). */
export const LIMIT = { x0: HOME.x, x1: 4.1, z0: -4.1, z1: HOME.z } as const;
const FLOOR_Y = CAPSULE_R;
const FRICTION = 3.2;
const RESTITUTION = 0.3;
const GRAVITY = 20;
/** Minimum speed for a push to carry the capsule over the lip. */
const LIP_SPEED = 0.9;

export type Prize = 'a' | 'b' | 'c' | 'd' | 'e' | 'launcher';
export type Content = { kind: 'world'; id: Prize } | { kind: 'sticker'; seed: number };

export interface Capsule extends Disc {
  id: number;
  content: Content;
  /** floor: on the floor; held: in the claw; falling: falling (slipped); chute: falling through the chute. */
  state: 'floor' | 'held' | 'falling' | 'chute' | 'gone';
  /** Height of the center. */
  h: number;
  vh: number;
  /** Color of the cap (index into `TOP_COLORS` in the view). */
  tint: number;
}

export type Phase = 'ready' | 'x' | 'waitz' | 'z' | 'drop' | 'close' | 'lift' | 'return' | 'release' | 'settle';

export type CraneEvent =
  | { type: 'over'; capsule: Capsule | null }
  | { type: 'drop' }
  | { type: 'grabbed'; capsule: Capsule }
  | { type: 'slipped'; capsule: Capsule }
  | { type: 'nudged'; capsule: Capsule }
  | { type: 'empty' }
  | { type: 'prize'; capsule: Capsule }
  | { type: 'miss' }
  | { type: 'bounce' }
  | { type: 'refill'; capsule: Capsule };

/** Contents of the capsules: A–E and the launcher always; the rest are studio stickers. */
export function capsuleContents(count: number, seed: number): Content[] {
  const worlds: Prize[] = ['a', 'b', 'c', 'd', 'e', 'launcher'];
  const out: Content[] = worlds.map((id) => ({ kind: 'world', id }));
  const rng = mulberry32(seed ^ 0x5ee7);
  while (out.length < count) out.push({ kind: 'sticker', seed: Math.floor(rng() * 1e6) });
  return out;
}

/** true if the center (x, z) is inside the prize chute. */
export function inChute(x: number, z: number): boolean {
  return x < CHUTE_X && z > CHUTE_Z;
}

export interface CraneOptions {
  count?: number;
  seed?: number;
}

export class CraneSim {
  readonly capsules: Capsule[] = [];
  readonly events: CraneEvent[] = [];
  /** Path of the claw in the current attempt (x, y, z), at 10 Hz: the dotted trail. */
  readonly trail: number[] = [];
  phase: Phase = 'ready';
  /** Carriage (center of the claw) and height of the claw's hub. */
  x: number = HOME.x;
  z: number = HOME.z;
  y: number = TOP_Y;
  /** Opening of the prongs: 1 = open (42°), 0 = closed (10°). */
  open = 1;
  /** Sway of the cable (radians) and its velocity, in x and in z. */
  swayX = 0;
  swayZ = 0;
  private swayVX = 0;
  private swayVZ = 0;
  /** Buttons spent in this attempt. */
  used1 = false;
  used2 = false;
  held: Capsule | null = null;
  /** Attempts, grips and prizes since the page loaded. */
  tries = 0;
  time = 0;
  readonly seed: number;
  private readonly rng: Rng;
  private phaseT = 0;
  private slipAt = Infinity;
  private dropTarget = 1.7;
  private lastVX = 0;
  private lastVZ = 0;
  private stepCount = 0;
  private settleT = 0;
  private refills: { at: number; content: Content; tint: number }[] = [];
  private nextId = 0;
  private prizeThisTry = false;

  constructor(options: CraneOptions = {}) {
    const count = options.count ?? 12;
    this.seed = options.seed ?? 3303;
    this.rng = mulberry32(this.seed);
    const contents = capsuleContents(count, this.seed);
    for (let i = 0; i < contents.length; i++) {
      const [x, z] = this.freeSpot();
      this.capsules.push(this.makeCapsule(x, z, contents[i], i % 5));
    }
    // Initial settling: if some drawn spot ended up too tight, the capsules separate before starting.
    for (let i = 0; i < 40; i++) this.stepCapsules(STEP);
    for (const c of this.capsules) c.vx = c.vy = 0;
  }

  private makeCapsule(x: number, z: number, content: Content, tint: number): Capsule {
    return { id: this.nextId++, x, y: z, vx: 0, vy: 0, r: CAPSULE_R, content, state: 'floor', h: FLOOR_Y, vh: 0, tint };
  }

  /** A free spot on the floor, away from the chute and from the other capsules (drawn with the seed). */
  private freeSpot(back = false): [number, number] {
    const lim = HALF - CAPSULE_R;
    for (let attempt = 0; attempt < 400; attempt++) {
      const x = (this.rng() * 2 - 1) * lim;
      const z = back ? -lim + this.rng() * 3 : (this.rng() * 2 - 1) * lim;
      if (x < CHUTE_X + CAPSULE_R + 0.3 && z > CHUTE_Z - CAPSULE_R - 0.3) continue;
      const clear = this.capsules.every((c) => c.state !== 'floor' || Math.hypot(c.x - x, c.y - z) >= 2 * CAPSULE_R + 0.05);
      if (clear) return [x, z];
    }
    // Very full machine: the clearest spot on a fixed grid.
    let best: [number, number] = [0, 0];
    let bestD = -1;
    for (let gx = -lim; gx <= lim; gx += 0.5) {
      for (let gz = back ? -lim : -lim; gz <= lim; gz += 0.5) {
        if (gx < CHUTE_X + CAPSULE_R + 0.3 && gz > CHUTE_Z - CAPSULE_R - 0.3) continue;
        let d = Infinity;
        for (const c of this.capsules) if (c.state === 'floor') d = Math.min(d, Math.hypot(c.x - gx, c.y - gz));
        if (d > bestD) {
          bestD = d;
          best = [gx, gz];
        }
      }
    }
    return best;
  }

  /** Capsule on the floor nearest to the claw's axis, and its horizontal distance. */
  nearest(x = this.x, z = this.z): { capsule: Capsule | null; d: number } {
    let best: Capsule | null = null;
    let d = Infinity;
    for (const c of this.capsules) {
      if (c.state !== 'floor') continue;
      const dist = Math.hypot(c.x - x, c.y - z);
      if (dist < d) {
        d = dist;
        best = c;
      }
    }
    return { capsule: best, d };
  }

  /** Button ① (1) or ② (2) pressed. Returns false if that button no longer moves the claw. */
  press(button: 1 | 2): boolean {
    if (button === 1) {
      if (this.phase !== 'ready' || this.used1) return false;
      this.used1 = true;
      this.tries++;
      this.trail.length = 0;
      this.prizeThisTry = false;
      this.phase = 'x';
      return true;
    }
    if (this.phase !== 'waitz' || this.used2) return false;
    this.used2 = true;
    this.phase = 'z';
    return true;
  }

  /** Button released: ① leaves the claw at x; ② leaves it at z and the claw descends. */
  release(button: 1 | 2): void {
    if (button === 1 && this.phase === 'x') {
      this.phase = 'waitz';
      this.events.push({ type: 'over', capsule: this.overCapsule() });
    } else if (button === 2 && this.phase === 'z') {
      this.beginDrop();
    }
  }

  private overCapsule(): Capsule | null {
    const { capsule, d } = this.nearest();
    return d < NUDGE_REACH ? capsule : null;
  }

  private beginDrop(): void {
    this.phase = 'drop';
    this.phaseT = 0;
    this.events.push({ type: 'over', capsule: this.overCapsule() });
    this.events.push({ type: 'drop' });
    const { d } = this.nearest();
    // With a capsule below, the prongs stop at the height of its equator; otherwise, at the floor.
    this.dropTarget = d < NUDGE_REACH ? CAPSULE_R + 1.0 : 1.7;
  }

  /** Only for tests and for reduced motion: places the carriage and drops the claw there. */
  dropAt(x: number, z: number): void {
    this.x = Math.max(LIMIT.x0, Math.min(LIMIT.x1, x));
    this.z = Math.max(LIMIT.z0, Math.min(LIMIT.z1, z));
    this.used1 = this.used2 = true;
    this.tries++;
    this.trail.length = 0;
    this.prizeThisTry = false;
    this.beginDrop();
  }

  /** true while the machine is in the middle of an attempt (or settling). */
  get busy(): boolean {
    const moving = this.phase !== 'ready' && this.phase !== 'waitz';
    return moving || this.capsules.some((c) => c.state === 'falling' || c.state === 'chute' || (c.state === 'floor' && (c.vx !== 0 || c.vy !== 0)));
  }

  /** One fixed simulation step. */
  step(): void {
    const dt = STEP;
    this.time += dt;
    this.stepCount++;
    this.phaseT += dt;
    const px = this.x;
    const pz = this.z;

    switch (this.phase) {
      case 'x':
        this.x = Math.min(LIMIT.x1, this.x + CARRIAGE_SPEED * dt);
        break;
      case 'z':
        this.z = Math.max(LIMIT.z0, this.z - CARRIAGE_SPEED * dt);
        break;
      case 'drop':
        this.y = Math.max(this.dropTarget, this.y - DROP_SPEED * dt);
        if (this.y <= this.dropTarget) this.enter('close');
        break;
      case 'close':
        this.open = Math.max(0, 1 - this.phaseT / CLOSE_SECONDS);
        if (this.phaseT >= CLOSE_SECONDS) {
          this.grip();
          this.enter('lift');
        }
        break;
      case 'lift':
        this.y = Math.min(TOP_Y, this.y + LIFT_SPEED * dt);
        if (this.held && this.y - 1.2 >= this.slipAt) this.slip();
        if (this.y >= TOP_Y) this.enter('return');
        break;
      case 'return': {
        const dx = HOME.x - this.x;
        const dz = HOME.z - this.z;
        const d = Math.hypot(dx, dz);
        const s = CARRIAGE_SPEED * dt;
        if (d <= s) {
          this.x = HOME.x;
          this.z = HOME.z;
          this.enter('release');
        } else {
          this.x += (dx / d) * s;
          this.z += (dz / d) * s;
        }
        break;
      }
      case 'release':
        this.open = Math.min(1, this.phaseT / CLOSE_SECONDS);
        if (this.held && this.phaseT >= CLOSE_SECONDS * 0.5) {
          const c = this.held;
          this.held = null;
          c.state = 'chute';
          c.vh = 0;
        }
        if (this.phaseT >= CLOSE_SECONDS) this.enter('settle');
        break;
      case 'settle':
        this.settleT += dt;
        if (this.settleT > 0.4 && this.quiet()) {
          this.phase = 'ready';
          this.used1 = this.used2 = false;
          if (!this.prizeThisTry) this.events.push({ type: 'miss' });
        }
        break;
      default:
        break;
    }

    // Cable sway: a damped spring driven by the carriage's acceleration.
    const vx = (this.x - px) / dt;
    const vz = (this.z - pz) / dt;
    const ax = (vx - this.lastVX) / dt;
    const az = (vz - this.lastVZ) / dt;
    this.lastVX = vx;
    this.lastVZ = vz;
    const k = GRAVITY / 3;
    this.swayVX = (this.swayVX + (-k * this.swayX - ax / 3) * dt) * 0.92;
    this.swayVZ = (this.swayVZ + (-k * this.swayZ - az / 3) * dt) * 0.92;
    this.swayX += this.swayVX * dt * 12;
    this.swayZ += this.swayVZ * dt * 12;

    if (this.held) {
      this.held.x = this.x;
      this.held.y = this.z;
      this.held.h = this.y - 1.2;
    }

    this.stepCapsules(dt);

    if (this.phase !== 'ready' && this.phase !== 'settle' && this.stepCount % 6 === 0) this.trail.push(this.x, this.y, this.z);

    // Restocking: the attendant returns each prize won to the back of the machine.
    for (let i = this.refills.length - 1; i >= 0; i--) {
      const r = this.refills[i];
      if (this.time < r.at || this.phase !== 'ready') continue;
      this.refills.splice(i, 1);
      const [x, z] = this.freeSpot(true);
      const c = this.makeCapsule(x, z, r.content, r.tint);
      c.state = 'falling';
      c.h = TOP_Y - 1;
      this.capsules.push(c);
      this.events.push({ type: 'refill', capsule: c });
    }
  }

  private enter(phase: Phase): void {
    this.phase = phase;
    this.phaseT = 0;
    this.settleT = 0;
  }

  /** Closing of the prongs: a drawn grip, a push, or nothing. */
  private grip(): void {
    const { capsule, d } = this.nearest();
    if (!capsule || d >= NUDGE_REACH) {
      this.events.push({ type: 'empty' });
      return;
    }
    if (d < GRIP_REACH) {
      capsule.state = 'held';
      capsule.vx = capsule.vy = 0;
      this.held = capsule;
      if (this.rng() < GRIP_P) {
        this.slipAt = Infinity;
        this.events.push({ type: 'grabbed', capsule });
      } else {
        // Failed grip: the capsule rises a little and slips at a drawn height between 2 and 6.
        this.slipAt = Math.min(TOP_Y - 1.4, 2 + 4 * this.rng());
        // The grip draw happens now; the notice arrives when it slips.
      }
      return;
    }
    // Push: the prongs move the capsule away from the axis; harder the closer it is.
    const dx = capsule.x - this.x;
    const dz = capsule.y - this.z;
    const len = Math.hypot(dx, dz) || 1;
    const speed = 0.8 + (3.2 * (NUDGE_REACH - d)) / (NUDGE_REACH - GRIP_REACH);
    capsule.vx += (dx / len) * speed;
    capsule.vy += (dz / len) * speed;
    this.events.push({ type: 'nudged', capsule });
  }

  private slip(): void {
    const c = this.held;
    if (!c) return;
    this.held = null;
    c.state = 'falling';
    c.vh = 0;
    this.slipAt = Infinity;
    this.events.push({ type: 'slipped', capsule: c });
  }

  private quiet(): boolean {
    return this.capsules.every((c) => (c.state === 'floor' ? Math.hypot(c.vx, c.vy) < 0.05 : c.state === 'gone'));
  }

  private stepCapsules(dt: number): void {
    const lim = HALF - CAPSULE_R;
    for (const c of this.capsules) {
      if (c.state === 'falling') {
        c.vh -= GRAVITY * dt;
        c.h += c.vh * dt;
        if (c.h <= FLOOR_Y) {
          c.h = FLOOR_Y;
          c.vh = 0;
          c.state = 'floor';
          // If it fell onto the chute (it slipped right above it), it is also a prize.
          if (inChute(c.x, c.y)) {
            c.state = 'chute';
          } else {
            this.events.push({ type: 'bounce' });
          }
        }
      } else if (c.state === 'chute') {
        c.vh -= GRAVITY * dt;
        c.h += c.vh * dt;
        if (c.h < -2.4) {
          c.state = 'gone';
          this.prizeThisTry = true;
          this.events.push({ type: 'prize', capsule: c });
          this.refills.push({ at: this.time + 1.2, content: c.content, tint: c.tint });
        }
      } else if (c.state === 'floor') {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        const v = Math.hypot(c.vx, c.vy);
        if (v > 0) {
          const nv = Math.max(0, v - FRICTION * dt);
          c.vx *= nv / v;
          c.vy *= nv / v;
        }
        // Walls of the machine.
        if (c.x < -lim) {
          c.x = -lim;
          c.vx = Math.abs(c.vx) * RESTITUTION;
        } else if (c.x > lim) {
          c.x = lim;
          c.vx = -Math.abs(c.vx) * RESTITUTION;
        }
        if (c.y < -lim) {
          c.y = -lim;
          c.vy = Math.abs(c.vy) * RESTITUTION;
        } else if (c.y > lim) {
          c.y = lim;
          c.vy = -Math.abs(c.vy) * RESTITUTION;
        }
        this.lip(c);
      }
    }
    // Contacts: a single layer, so two capsules on the floor never overlap.
    const floor = this.capsules.filter((c) => c.state === 'floor');
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < floor.length; i++) {
        for (let j = i + 1; j < floor.length; j++) collideDiscs(floor[i], floor[j], RESTITUTION);
      }
    }
    // A capsule that the contact left inside the chute either goes over the lip or returns to the floor.
    for (const c of floor) this.lip(c);
  }

  /** The chute's lip: a capsule thrown hard falls inside (prize); otherwise, it bounces back. */
  private lip(c: Capsule): void {
    if (c.state !== 'floor') return;
    const ex = CHUTE_X + CAPSULE_R;
    const ez = CHUTE_Z - CAPSULE_R;
    if (!(c.x < ex && c.y > ez)) return;
    if (inChute(c.x, c.y)) {
      c.state = 'chute';
      c.vh = 0;
      return;
    }
    // With enough momentum it goes over the lip; otherwise, the lip sends it back.
    if (Math.hypot(c.vx, c.vy) > LIP_SPEED) return;
    // Pushes it out through the nearest side.
    const px = ex - c.x;
    const pz = c.y - ez;
    if (px < pz) {
      c.x = ex;
      c.vx = Math.abs(c.vx) * RESTITUTION;
    } else {
      c.y = ez;
      c.vy = -Math.abs(c.vy) * RESTITUTION;
    }
  }

  /** Runs the attempt until the machine is ready again (reduced motion and tests). */
  resolve(maxSeconds = 30): void {
    const steps = Math.round(maxSeconds / STEP);
    for (let i = 0; i < steps && (this.busy || this.phase === 'settle'); i++) this.step();
  }
}
