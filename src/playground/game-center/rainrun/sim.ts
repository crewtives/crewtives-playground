// Rain Run's rules as a pure machine, with a fixed step of 1/60 s and a seed: no three and no DOM.
// ATTRACT (autopilot, does not score) → PLAY (90 s, 3 lives) → GAME OVER → ATTRACT.
import { buildTile, gateAhead, gateAt, overlaps, signsNear, STREET_HALF, type Box, type CanyonTile, type Gate } from './canyon';

export const STEP = 1 / 60;
export const RUN_SECONDS = 90;
export const LIVES = 3;
export const MAX_COMBO = 8;
/** Poses per second and cap on poses (90 s × 12). */
export const POSE_HZ = 12;
export const MAX_POSES = RUN_SECONDS * POSE_HZ;
/** Poses of the live trail (6 s). */
export const TRAIL_POSES = 72;
const STEPS_PER_POSE = 60 / POSE_HZ;

export const BOOST_FACTOR = 1.5;
export const BOOST_SECONDS = 1.2;
export const BOOST_COOLDOWN = 3;
export const INVULNERABLE_SECONDS = 1;

/** Half extents of the hull for crashes (x, y, z): generous, as in arcades. */
export const HULL = { x: 1.2, y: 0.45, z: 1.6 } as const;
/** Reach of the stick: the target is stick × (5.2; 3.9) + (0; 5.1). */
const REACH_X = 5.2;
const REACH_Y = 3.9;
const MID_Y = 5.1;
const SPRING_K = 18;

/** Course seed: every game flies the same canyon, like an arcade level. */
export const COURSE_SEED = 9365;

export type Phase = 'attract' | 'play' | 'gameover';

export interface Pose {
  /** Seconds into the game when it was recorded. */
  t: number;
  x: number;
  y: number;
  z: number;
  bank: number;
  pitch: number;
}

export type SimEvent =
  | { type: 'gate'; k: number; combo: number; points: number }
  | { type: 'miss'; k: number }
  | { type: 'crash'; lives: number; what: 'sign' | 'gate' }
  | { type: 'over'; reason: 'lives' | 'time' };

export type GateResult = 'pass' | 'miss' | 'crash';

export class RainRunSim {
  readonly seed: number;
  readonly tile: CanyonTile;
  phase: Phase = 'attract';
  /** Seconds of flight in this run. */
  time = 0;
  /** PLAY clock (counts down). */
  clock = RUN_SECONDS;
  lives = LIVES;
  score = 0;
  combo = 1;
  gatesPassed = 0;
  nextGate = 0;
  x = 0;
  y = MID_Y;
  vx = 0;
  vy = 0;
  z = 0;
  bank = 0;
  pitch = 0;
  boostLeft = 0;
  boostCooldown = 0;
  invulnerable = 0;
  stickX = 0;
  stickY = 0;
  poses: Pose[] = [];
  readonly gateResults = new Map<number, GateResult>();
  readonly events: SimEvent[] = [];
  private steps = 0;
  private boostWanted = false;

  constructor(seed = COURSE_SEED) {
    this.seed = seed;
    this.tile = buildTile(seed);
  }

  /** Returns to the start in the requested phase (ATTRACT or PLAY). */
  reset(phase: Exclude<Phase, 'gameover'>): void {
    this.phase = phase;
    this.time = 0;
    this.clock = RUN_SECONDS;
    this.lives = LIVES;
    this.score = 0;
    this.combo = 1;
    this.gatesPassed = 0;
    this.nextGate = 0;
    this.x = 0;
    this.y = MID_Y;
    this.vx = 0;
    this.vy = 0;
    this.z = 0;
    this.bank = 0;
    this.pitch = 0;
    this.boostLeft = 0;
    this.boostCooldown = 0;
    this.invulnerable = 0;
    this.stickX = 0;
    this.stickY = 0;
    this.poses = [];
    this.gateResults.clear();
    this.events.length = 0;
    this.steps = 0;
    this.boostWanted = false;
  }

  /** START: a new game with 90 s, 3 lives, combo ×1 and score 0. */
  start(): void {
    this.reset('play');
  }

  /** Stick in [−1, 1]² (positive y = up). In ATTRACT the autopilot overrides it. */
  setStick(x: number, y: number): void {
    this.stickX = clamp(x, -1, 1);
    this.stickY = clamp(y, -1, 1);
  }

  /** Requests BOOST: applied on the next step if it is charged. */
  boost(): void {
    this.boostWanted = true;
  }

  /** BOOST charge for the HUD: 1 = ready. */
  get boostCharge(): number {
    if (this.boostLeft > 0) return this.boostLeft / BOOST_SECONDS;
    if (this.boostCooldown > 0) return 1 - this.boostCooldown / BOOST_COOLDOWN;
    return 1;
  }

  get speed(): number {
    const base = Math.min(40, 24 + 0.4 * this.gatesPassed);
    return this.boostLeft > 0 ? base * BOOST_FACTOR : base;
  }

  gate(k: number): Gate {
    return gateAt(k, this.seed);
  }

  hullBox(): Box {
    return {
      x0: this.x - HULL.x,
      x1: this.x + HULL.x,
      y0: this.y - HULL.y,
      y1: this.y + HULL.y,
      z0: this.z - HULL.z,
      z1: this.z + HULL.z,
    };
  }

  /** One fixed simulation step. In GAME OVER it does not advance. */
  step(): void {
    if (this.phase === 'gameover') return;
    const dt = STEP;
    const scoring = this.phase === 'play';

    if (this.phase === 'attract') this.autopilot();

    // BOOST
    if (this.boostWanted && this.boostLeft <= 0 && this.boostCooldown <= 0) {
      this.boostLeft = BOOST_SECONDS;
    }
    this.boostWanted = false;
    if (this.boostLeft > 0) {
      this.boostLeft = Math.max(0, this.boostLeft - dt);
      if (this.boostLeft === 0) this.boostCooldown = BOOST_COOLDOWN;
    } else if (this.boostCooldown > 0) {
      this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    }

    // Critically damped spring toward the stick's target.
    const tx = this.stickX * REACH_X;
    const ty = this.stickY * REACH_Y + MID_Y;
    const damping = 2 * Math.sqrt(SPRING_K);
    this.vx += (SPRING_K * (tx - this.x) - damping * this.vx) * dt;
    this.vy += (SPRING_K * (ty - this.y) - damping * this.vy) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, -STREET_HALF + 0.9, STREET_HALF - 0.9);
    this.y = clamp(this.y, 0.9, 9.6);
    this.bank = clamp(-0.6 * this.vx * 0.12, -0.7, 0.7);
    this.pitch = clamp(0.3 * this.vy * 0.12, -0.5, 0.5);

    const zBefore = this.z;
    this.z -= this.speed * dt;
    this.time += dt;
    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);

    // Signs: touching one is a crash (unless invulnerable).
    if (this.invulnerable <= 0) {
      const hull = this.hullBox();
      for (const sign of signsNear(this.tile, this.z)) {
        if (overlaps(hull, sign)) {
          this.crash('sign');
          // The hit pushes the taxi toward the center of the street.
          this.vx = -Math.sign(this.x || 1) * 9;
          break;
        }
      }
    }

    // Gates crossed in this step.
    while (!this.isOver()) {
      const gate = this.gate(this.nextGate);
      if (!(zBefore > gate.z && this.z <= gate.z)) break;
      this.crossGate(gate, scoring);
      this.nextGate++;
    }

    if (this.phase === 'play') {
      this.clock = Math.max(0, this.clock - dt);
      if (this.clock <= 0 && !this.isOver()) this.over('time');
    }

    this.steps++;
    if (this.steps % STEPS_PER_POSE === 0 && this.poses.length < MAX_POSES) {
      this.poses.push({ t: this.time, x: this.x, y: this.y, z: this.z, bank: this.bank, pitch: this.pitch });
    }
  }

  /** true in GAME OVER (a method: the phase changes inside the steps). */
  isOver(): boolean {
    return this.phase === 'gameover';
  }

  /** Last `n` poses (the live trail). */
  trail(n = TRAIL_POSES): Pose[] {
    return this.poses.slice(Math.max(0, this.poses.length - n));
  }

  private autopilot(): void {
    const k = Math.max(this.nextGate, gateAhead(this.z));
    const gate = this.gate(k);
    this.stickX = clamp(gate.x / REACH_X, -1, 1);
    this.stickY = clamp((gate.y - MID_Y) / REACH_Y, -1, 1);
  }

  private crossGate(gate: Gate, scoring: boolean): void {
    const hull = this.hullBox();
    // In the gate's plane, the hull is measured against the frame with the gate's z.
    const atGate: Box = { ...hull, z0: gate.z - 0.1, z1: gate.z + 0.1 };
    const hitsFrame = gate.bars.some((bar) => overlaps(atGate, bar));
    const inside = Math.abs(this.x - gate.x) <= 3 && Math.abs(this.y - gate.y) <= 2;
    if (hitsFrame && this.invulnerable <= 0) {
      this.gateResults.set(gate.k, 'crash');
      this.combo = 1;
      this.crash('gate');
      return;
    }
    if (inside && !hitsFrame) {
      const points = 100 * this.combo;
      if (scoring) this.score += points;
      this.gateResults.set(gate.k, 'pass');
      this.events.push({ type: 'gate', k: gate.k, combo: this.combo, points: scoring ? points : 0 });
      this.gatesPassed++;
      this.combo = Math.min(MAX_COMBO, this.combo + 1);
      return;
    }
    this.gateResults.set(gate.k, 'miss');
    this.combo = 1;
    this.events.push({ type: 'miss', k: gate.k });
  }

  private crash(what: 'sign' | 'gate'): void {
    this.combo = 1;
    this.invulnerable = INVULNERABLE_SECONDS;
    if (this.phase !== 'play') {
      this.events.push({ type: 'crash', lives: this.lives, what });
      return;
    }
    this.lives = Math.max(0, this.lives - 1);
    this.events.push({ type: 'crash', lives: this.lives, what });
    if (this.lives === 0) this.over('lives');
  }

  private over(reason: 'lives' | 'time'): void {
    this.phase = 'gameover';
    this.events.push({ type: 'over', reason });
  }
}

/** Indices of the poses TIME VIEW draws: one out of every `every`. */
export function ribbonIndices(count: number, every: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i += every) out.push(i);
  return out;
}

/** Pose interpolated at second `t` of a recorded run (for the ghost). */
export function poseAt(poses: readonly Pose[], t: number): Pose | null {
  if (poses.length === 0) return null;
  const f = t * POSE_HZ - 1;
  if (f <= 0) return poses[0];
  const i = Math.floor(f);
  if (i >= poses.length - 1) return poses[poses.length - 1];
  const a = poses[i];
  const b = poses[i + 1];
  const u = f - i;
  return {
    t,
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
    bank: a.bank + (b.bank - a.bank) * u,
    pitch: a.pitch + (b.pitch - a.pitch) * u,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
