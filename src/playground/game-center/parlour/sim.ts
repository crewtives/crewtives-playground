// Parlour Glass (4F): pure physics with a fixed step of 1/240 s and a seed. Balls of radius 5.5 among the
// rosette's nails, a central pocket (heso) that counts, two tulips that open in FEVER, two
// windmills that only turn when a ball hits them and two rubber stops where each rail ends. There is no
// well: the only force is gravity (plus air drag). It saves the state at 60 Hz for rewinding
// and the paths at 30 Hz.
import { collideDiscs, SpatialHash } from '../circles';
import { hash01 } from '../rng';
import {
  BALL_R,
  buildNails,
  GLASS_R,
  HESO,
  NAIL_R,
  NailGrid,
  STOP_R,
  STOPS,
  TULIPS,
  WINDMILL_BLADE,
  WINDMILL_HUB,
  WINDMILLS,
  type Nail,
  type Symmetry,
} from './layout';

export const STEP = 1 / 240;
export const GRAVITY = 980;
export const DRAG = 0.02;
export const E_NAIL = 0.55;
export const FRICTION = 0.92;
export const E_BALL = 0.4;
export const E_WALL = 0.3;
/** Rubber stop: damped bounce and grip (the rubber eats almost all of the tangential velocity). */
export const E_STOP = 0.25;
export const STOP_GRIP = 0.5;
export const JITTER = (1.5 * Math.PI) / 180;
export const MAX_SPEED = 1160;
/** Center of the ball against the glass wall. */
export const WALL_R = GLASS_R - BALL_R;
/** Half aperture of the drain at the foot of the glass (measured from the bottom). */
export const DRAIN_HALF = (30 * Math.PI) / 180;
/** Launchers: on the wall, at 200° (left, counting from +u upward) and its mirror. */
const LAUNCH_ANGLE = (200 * Math.PI) / 180;
export const LAUNCH_U = WALL_R * Math.cos(LAUNCH_ANGLE);
export const LAUNCH_V = -WALL_R * Math.sin(LAUNCH_ANGLE);
/** Exit direction: tangent to the wall, upward. */
const LAUNCH_DU = Math.sin(LAUNCH_ANGLE);
const LAUNCH_DV = Math.cos(LAUNCH_ANGLE);
export const LAUNCH_EVERY = 0.25;
export const POUR_BALLS = 50;
export const POUR_SECONDS = 5;
export const FEVER_EVERY = 7;
export const FEVER_SECONDS = 6;
export const WINDMILL_I = 900;
const WINDMILL_DECAY = 0.6;
/** Path samples per second, and states saved per second for rewinding. */
export const DOT_HZ = 30;
export const HISTORY_HZ = 60;

export type Rails = 'twin' | 'left';

/**
 * Handle power when the page opens. At 30, the ball leaves the hoop at the glass's shoulder and falls among the
 * nails toward the pocket; with more power it climbs hugging the hoop up to the rubber stop on its side and falls
 * from there; below ~15 it barely enters the rosette and falls on the launcher's side.
 */
export const DEFAULT_POWER = 30;

/**
 * Exit speed for a handle power (0–100): 650–950, 3 u/s per point. The whole range
 * from ~20 sends the ball into the nails (the rubber stop slows the strong ones), and a step of 5 changes the
 * pour without jumping from one zone to another.
 */
export function launchSpeed(power: number): number {
  const p = Math.max(0, Math.min(100, power)) / 100;
  return Math.min(MAX_SPEED, 650 + 300 * p);
}

export type ParlourEvent =
  | { type: 'launch'; count: number }
  | { type: 'nail'; ring: number; side: number }
  | { type: 'pocket'; total: number }
  | { type: 'fever'; count: number }
  | { type: 'tulip' }
  | { type: 'drain' };

export interface ParlourOptions {
  seed?: number;
  symmetry?: Symmetry;
  maxBalls?: number;
  /** Seconds of history for rewinding (0 = no rewind). */
  history?: number;
  /** Capacity of the path log (points). */
  dots?: number;
}

/** Path log: a ring of points (u, v, t, ball serial), in time order. */
export class DotLog {
  readonly capacity: number;
  readonly data: Float32Array;
  /** Ball serial of each point (to check that none gets lost). */
  readonly serial: Int32Array;
  /** Points written in total (the real index is count % capacity). */
  count = 0;
  /** First point still stored. */
  start = 0;
  /** Counter of destructive changes (truncation or clearing): the view uploads everything again. */
  epoch = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity * 3);
    this.serial = new Int32Array(capacity);
  }

  push(u: number, v: number, t: number, serial: number): void {
    const i = this.count % this.capacity;
    this.data[i * 3] = u;
    this.data[i * 3 + 1] = v;
    this.data[i * 3 + 2] = t;
    this.serial[i] = serial;
    this.count++;
    if (this.count - this.start > this.capacity) this.start = this.count - this.capacity;
  }

  time(k: number): number {
    return this.data[(k % this.capacity) * 3 + 2];
  }

  /** Deletes the points after `t` (a new branch after rewinding). */
  truncateAfter(t: number): void {
    const before = this.count;
    while (this.count > this.start && this.time(this.count - 1) > t + 1e-6) {
      // The deleted point stays outside every shutter until it is rewritten.
      this.count--;
      this.data[(this.count % this.capacity) * 3 + 2] = -1e30;
    }
    if (this.count !== before) this.epoch++;
  }

  clear(): void {
    this.start = this.count;
    this.epoch++;
  }
}

/** Visibility of a point according to the shutter (used by the shader and the 2D view). */
export type Shutter = 'now' | '1' | '5' | 'all';
export function shutterSpan(shutter: Shutter): number {
  return shutter === 'now' ? 0 : shutter === '1' ? 1 : shutter === '5' ? 5 : Infinity;
}
export function dotVisible(t: number, now: number, shutter: Shutter, openedAt: number): boolean {
  if (t > now + 1e-6) return false;
  if (shutter === 'all') return t >= openedAt - 1e-6;
  return now - t <= shutterSpan(shutter);
}

interface Snapshot {
  time: number;
  steps: number;
  balls: Float32Array;
  meta: Int32Array;
  alive: Uint8Array;
  scalars: Float64Array;
}

const SCALARS = 14;

export class ParlourSim {
  readonly maxBalls: number;
  readonly seed: number;
  symmetry: Symmetry;
  nails: Nail[];
  private grid: NailGrid;
  /** Ball state: u, v, vu, vv per slot. */
  readonly u: Float64Array;
  readonly v: Float64Array;
  readonly vu: Float64Array;
  readonly vv: Float64Array;
  readonly alive: Uint8Array;
  /** Serial (launch order), twin pair and side (−1 left, +1 right). */
  readonly serial: Int32Array;
  readonly pair: Int32Array;
  readonly side: Int8Array;
  private readonly contacts: Int32Array;
  /** Windmills: angle and angular velocity (the right one is the mirror of the left one). */
  readonly windAngle = new Float64Array(2);
  readonly windOmega = new Float64Array(2);
  time = 0;
  steps = 0;
  launched = 0;
  pocketed = 0;
  tulipCatches = 0;
  drained = 0;
  /** Seconds of FEVER remaining (tulips open). */
  fever = 0;
  feverCount = 0;
  rails: Rails = 'twin';
  power = DEFAULT_POWER;
  launching = false;
  pourLeft = 0;
  private nextLaunch = 0;
  private nextPair = 0;
  readonly events: ParlourEvent[] = [];
  readonly dots: DotLog;
  /** Moment when the EVERY MOMENT shutter opened (or the glass was cleared). */
  openedAt = 0;
  private readonly history: Snapshot[] = [];
  private historyHead = 0;
  private historyLen = 0;
  private readonly historyCap: number;
  private readonly pairs = new SpatialHash(12, 64);
  private readonly near: number[] = [];
  private readonly discs: { x: number; y: number; vx: number; vy: number; r: number }[];

  constructor(options: ParlourOptions = {}) {
    this.seed = options.seed ?? 4077;
    this.symmetry = options.symmetry ?? 'mirror';
    this.maxBalls = options.maxBalls ?? 320;
    this.nails = buildNails(this.symmetry);
    this.grid = new NailGrid(this.nails);
    const n = this.maxBalls;
    this.u = new Float64Array(n);
    this.v = new Float64Array(n);
    this.vu = new Float64Array(n);
    this.vv = new Float64Array(n);
    this.alive = new Uint8Array(n);
    this.serial = new Int32Array(n);
    this.pair = new Int32Array(n);
    this.side = new Int8Array(n);
    this.contacts = new Int32Array(n);
    this.discs = Array.from({ length: n }, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: BALL_R }));
    this.dots = new DotLog(options.dots ?? 600_000);
    this.historyCap = Math.round((options.history ?? 12) * HISTORY_HZ);
    for (let i = 0; i < this.historyCap; i++) {
      this.history.push({
        time: 0,
        steps: 0,
        balls: new Float32Array(n * 4),
        meta: new Int32Array(n * 2),
        alive: new Uint8Array(n),
        scalars: new Float64Array(SCALARS),
      });
    }
  }

  get inPlay(): number {
    let c = 0;
    for (let i = 0; i < this.maxBalls; i++) c += this.alive[i];
    return c;
  }

  get canRewind(): boolean {
    return this.historyCap > 0;
  }

  setSymmetry(symmetry: Symmetry): void {
    if (symmetry === this.symmetry) return;
    this.symmetry = symmetry;
    this.nails = buildNails(symmetry);
    this.grid = new NailGrid(this.nails);
  }

  /** Frees slots and counters: an empty glass with the same seed (REPLAY SEED uses it). */
  reset(): void {
    this.alive.fill(0);
    this.windAngle.fill(0);
    this.windOmega.fill(0);
    this.time = 0;
    this.steps = 0;
    this.launched = this.pocketed = this.tulipCatches = this.drained = 0;
    this.fever = 0;
    this.feverCount = 0;
    this.launching = false;
    this.pourLeft = 0;
    this.nextLaunch = 0;
    this.nextPair = 0;
    this.dots.clear();
    this.dots.count = this.dots.start = 0;
    this.openedAt = 0;
    this.historyLen = 0;
  }

  /** CLEAR GLASS: deletes the paths; the balls in play remain. */
  clearGlass(): void {
    this.dots.clear();
    this.openedAt = this.time;
  }

  /** Hold LAUNCH: 4 launches per second (in TWIN, each one is a pair of twins). */
  setLaunching(on: boolean): void {
    if (on && !this.launching && this.nextLaunch < this.time) this.nextLaunch = this.time;
    this.launching = on;
  }

  /** POUR 50: 50 balls in 5 s. */
  pour(): void {
    this.pourLeft = POUR_BALLS;
    if (this.nextLaunch < this.time) this.nextLaunch = this.time;
  }

  private freeSlot(): number {
    for (let i = 0; i < this.maxBalls; i++) if (!this.alive[i]) return i;
    return -1;
  }

  /** Launches a ball (or a mirrored pair in TWIN). Returns how many came out. */
  launch(): number {
    const pair = this.nextPair++;
    // Power variation of ±1.5 % per pair, drawn with the seed (the same for both twins).
    const speed = launchSpeed(this.power) * (1 + (hash01(this.seed, pair, 7) * 2 - 1) * 0.015);
    const sides = this.rails === 'twin' ? [-1, 1] : [-1];
    let count = 0;
    for (const side of sides) {
      const i = this.freeSlot();
      if (i < 0) break;
      this.alive[i] = 1;
      // The right launcher is the exact mirror of the left one (only the sign of u changes).
      this.u[i] = side < 0 ? LAUNCH_U : -LAUNCH_U;
      this.v[i] = LAUNCH_V;
      this.vu[i] = side < 0 ? LAUNCH_DU * speed : -(LAUNCH_DU * speed);
      this.vv[i] = LAUNCH_DV * speed;
      this.serial[i] = this.launched++;
      this.pair[i] = pair;
      this.side[i] = side;
      this.contacts[i] = 0;
      count++;
    }
    if (count) this.events.push({ type: 'launch', count });
    return count;
  }

  /** One fixed step. */
  step(): void {
    const dt = STEP;
    this.time += dt;
    this.steps++;

    // Launch cadence: hold (4/s) or pour (10/s; 5 pairs/s in TWIN).
    if (this.launching || this.pourLeft > 0) {
      while (this.nextLaunch <= this.time + 1e-9) {
        if (this.pourLeft > 0) {
          const n = this.launch();
          this.pourLeft = Math.max(0, this.pourLeft - Math.max(1, n));
          this.nextLaunch += POUR_SECONDS / POUR_BALLS * (this.rails === 'twin' ? 2 : 1);
        } else if (this.launching) {
          this.launch();
          this.nextLaunch += LAUNCH_EVERY;
        } else break;
      }
    } else {
      this.nextLaunch = Math.max(this.nextLaunch, this.time);
    }

    if (this.fever > 0) this.fever = Math.max(0, this.fever - dt);
    for (let w = 0; w < 2; w++) {
      this.windOmega[w] *= Math.exp(-WINDMILL_DECAY * dt);
      this.windAngle[w] += this.windOmega[w] * dt;
    }

    for (let i = 0; i < this.maxBalls; i++) {
      if (!this.alive[i]) continue;
      this.integrate(i, dt);
    }
    this.ballContacts();

    if (this.steps % (240 / DOT_HZ) === 0) {
      for (let i = 0; i < this.maxBalls; i++) if (this.alive[i]) this.dots.push(this.u[i], this.v[i], this.time, this.serial[i]);
    }
    if (this.historyCap > 0 && this.steps % (240 / HISTORY_HZ) === 0) this.record();
  }

  private integrate(i: number, dt: number): void {
    let vu = this.vu[i];
    let vv = this.vv[i] + GRAVITY * dt;
    vu -= DRAG * vu * dt;
    vv -= DRAG * vv * dt;
    const speed = Math.sqrt(vu * vu + vv * vv);
    if (speed > MAX_SPEED) {
      vu *= MAX_SPEED / speed;
      vv *= MAX_SPEED / speed;
    }
    this.u[i] += vu * dt;
    this.v[i] += vv * dt;
    this.vu[i] = vu;
    this.vv[i] = vv;

    if (this.captures(i)) return;
    this.nailContacts(i);
    this.fixtures(i);
    this.wall(i);
  }

  /** Central pocket and tulips: a ball that comes down through the mouth is caught. */
  private captures(i: number): boolean {
    const u = this.u[i];
    const v = this.v[i];
    if (this.vv[i] > 0 && Math.abs(u - HESO.u) < HESO.mouth && v > HESO.v - 4 && v < HESO.v + 6) {
      this.alive[i] = 0;
      this.pocketed++;
      this.events.push({ type: 'pocket', total: this.pocketed });
      if (this.pocketed % FEVER_EVERY === 0) {
        this.fever = FEVER_SECONDS;
        this.feverCount++;
        this.events.push({ type: 'fever', count: this.feverCount });
      }
      return true;
    }
    // A closed tulip still swallows the ball that settles on its mouth; open, it swallows wider.
    const mouth = this.fever > 0 ? 13 : 5.5;
    for (const t of TULIPS) {
      if (this.vv[i] >= 0 && Math.abs(u - t.u) < mouth && v > t.v - 16 && v < t.v + 5) {
        this.alive[i] = 0;
        this.tulipCatches++;
        this.events.push({ type: 'tulip' });
        return true;
      }
    }
    return false;
  }

  /** Contact with a fixed circle (nail, post, body): restitution, friction and a drawn rotation. */
  private bounceCircle(i: number, cu: number, cv: number, radius: number, e: number, jitter: boolean, grip = FRICTION): boolean {
    const du = this.u[i] - cu;
    const dv = this.v[i] - cv;
    const min = radius + BALL_R;
    const d2 = du * du + dv * dv;
    if (d2 >= min * min) return false;
    const d = Math.sqrt(d2) || 1e-9;
    let nu = du / d;
    let nv = dv / d;
    if (jitter) {
      // Rotation of the normal by ±1.5°, drawn per pair and contact: the twins rotate in mirror.
      const side = this.side[i];
      const a = side * (hash01(this.seed, this.pair[i], this.contacts[i]++) * 2 - 1) * JITTER;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const ru = nu * c - nv * s;
      const rv = nu * s + nv * c;
      nu = ru;
      nv = rv;
    }
    this.u[i] = cu + nu * min;
    this.v[i] = cv + nv * min;
    const vn = this.vu[i] * nu + this.vv[i] * nv;
    if (vn < 0) {
      // Tangential friction applies only on an impact; a ball rolling over a nail slides.
      const f = vn < -30 ? grip : 1;
      const tu = this.vu[i] - vn * nu;
      const tv = this.vv[i] - vn * nv;
      this.vu[i] = tu * f - e * vn * nu;
      this.vv[i] = tv * f - e * vn * nv;
    }
    return true;
  }

  private nailContacts(i: number): void {
    const near = this.grid.near(this.u[i], this.v[i], this.near);
    if (near.length === 0) return;
    // Canonical order (by v and by u with the side's sign): the twins resolve in mirror.
    const side = this.side[i];
    const nails = this.nails;
    const min2 = (NAIL_R + BALL_R) ** 2;
    const hits: number[] = [];
    for (const k of near) {
      const du = this.u[i] - nails[k].u;
      const dv = this.v[i] - nails[k].v;
      if (du * du + dv * dv < min2) hits.push(k);
    }
    if (hits.length > 1) hits.sort((a, b) => nails[a].v - nails[b].v || side * (nails[a].u - nails[b].u));
    for (const k of hits) {
      if (this.bounceCircle(i, nails[k].u, nails[k].v, NAIL_R, E_NAIL, true)) {
        this.events.push({ type: 'nail', ring: nails[k].ring, side });
      }
    }
  }

  /** Posts and body of the pocket, tulip petals, rubber stops and windmills. */
  private fixtures(i: number): void {
    const u = this.u[i];
    const v = this.v[i];
    if (Math.abs(u) < 30 && v > -20 && v < 30) {
      // Posts in side order: the one on the ball's left first.
      const s = this.side[i];
      this.bounceCircle(i, -s * HESO.post, HESO.v, HESO.postR, E_NAIL, false);
      this.bounceCircle(i, s * HESO.post, HESO.v, HESO.postR, E_NAIL, false);
      this.bounceCircle(i, HESO.u, HESO.bodyV, HESO.bodyR, E_WALL, false);
    }
    for (const t of TULIPS) {
      if (Math.abs(u - t.u) > 30 || Math.abs(v - t.v) > 30) continue;
      const open = this.fever > 0;
      const s = this.side[i];
      for (const dir of [-s, s]) this.petal(i, t.u, t.v, dir, open);
      this.bounceCircle(i, t.u, t.v + 11, 6, E_WALL, false);
    }
    // Rubber stops in side order (the same pattern as the posts: the twins resolve in mirror).
    for (const dir of [-this.side[i], this.side[i]]) {
      const stop = STOPS[dir < 0 ? 0 : 1];
      if (Math.abs(u - stop.u) < STOP_R + BALL_R + 2 && Math.abs(v - stop.v) < STOP_R + BALL_R + 2) {
        this.bounceCircle(i, stop.u, stop.v, STOP_R, E_STOP, false, STOP_GRIP);
      }
    }
    for (let w = 0; w < 2; w++) {
      const mill = WINDMILLS[w];
      if (Math.abs(u - mill.u) > WINDMILL_BLADE + 10 || Math.abs(v - mill.v) > WINDMILL_BLADE + 10) continue;
      this.windmill(i, w);
    }
  }

  /** Tulip petal: a segment from the base upward, opened ±28° in FEVER. */
  private petal(i: number, tu: number, tv: number, dir: number, open: boolean): void {
    const baseU = tu + dir * 5;
    const baseV = tv + 6;
    const angle = (open ? 28 : 4) * (Math.PI / 180);
    const len = 15;
    const tipU = baseU + dir * Math.sin(angle) * len;
    const tipV = baseV - Math.cos(angle) * len;
    this.segment(i, baseU, baseV, tipU, tipV, 1.5, 0, 0, E_WALL);
  }

  /** Ball–segment contact (capsule of radius `r`), with the segment's own velocity at the point. */
  private segment(i: number, au: number, av: number, bu: number, bv: number, r: number, pu: number, pv: number, e: number): [number, number, number] | null {
    const su = bu - au;
    const sv = bv - av;
    const len2 = su * su + sv * sv;
    let t = ((this.u[i] - au) * su + (this.v[i] - av) * sv) / len2;
    t = Math.max(0, Math.min(1, t));
    const cu = au + su * t;
    const cv = av + sv * t;
    const du = this.u[i] - cu;
    const dv = this.v[i] - cv;
    const min = r + BALL_R;
    const d2 = du * du + dv * dv;
    if (d2 >= min * min) return null;
    const d = Math.sqrt(d2) || 1e-9;
    const nu = du / d;
    const nv = dv / d;
    this.u[i] = cu + nu * min;
    this.v[i] = cv + nv * min;
    const ru = this.vu[i] - pu;
    const rv = this.vv[i] - pv;
    const vn = ru * nu + rv * nv;
    if (vn >= 0) return [cu, cv, 0];
    this.vu[i] -= (1 + e) * vn * nu;
    this.vv[i] -= (1 + e) * vn * nv;
    return [cu, cv, vn];
  }

  /** Directions of the 4 blades of windmill `w` (the right one, exact mirror of the left one). */
  bladeDirs(w: number): [number, number][] {
    const s = WINDMILLS[w].side;
    const a = s < 0 ? this.windAngle[w] : -this.windAngle[w];
    const out: [number, number][] = [];
    for (let k = 0; k < 4; k++) {
      const c = Math.cos(a + (k * Math.PI) / 2);
      const sn = Math.sin(a + (k * Math.PI) / 2);
      out.push([s < 0 ? c : -c, sn]);
    }
    return out;
  }

  private windmill(i: number, w: number): void {
    const mill = WINDMILLS[w];
    const omega = this.windOmega[w];
    // The ball's left blade first (mirrored order for the twins).
    const dirs = this.bladeDirs(w);
    const order = this.side[i] * mill.side > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
    for (const k of order) {
      const [du, dv] = dirs[k];
      const tipU = mill.u + du * WINDMILL_BLADE;
      const tipV = mill.v + dv * WINDMILL_BLADE;
      // Blade velocity at the nearest point: ω × r (positive turns from +u toward +v).
      const t = Math.max(0, Math.min(1, ((this.u[i] - mill.u) * du + (this.v[i] - mill.v) * dv) / WINDMILL_BLADE));
      const ru = du * WINDMILL_BLADE * t;
      const rv = dv * WINDMILL_BLADE * t;
      const hit = this.segment(i, mill.u, mill.v, tipU, tipV, 1.6, -omega * rv, omega * ru, 0.4);
      if (!hit || hit[2] === 0) continue;
      // Impulse on the windmill: Δω = (r × J) / I, with J = −(1 + e)·vn·n on the ball.
      const [cu, cv, vn] = hit;
      const nu = (this.u[i] - cu) / (BALL_R + 1.6);
      const nv = (this.v[i] - cv) / (BALL_R + 1.6);
      const ju = -(1 + 0.4) * vn * nu;
      const jv = -(1 + 0.4) * vn * nv;
      // The windmill receives the opposite impulse.
      this.windOmega[w] += (ru * -jv - rv * -ju) / WINDMILL_I;
    }
    this.bounceCircle(i, mill.u, mill.v, WINDMILL_HUB, E_WALL, false);
  }

  private wall(i: number): void {
    const u = this.u[i];
    const v = this.v[i];
    const r = Math.sqrt(u * u + v * v);
    if (r <= WALL_R) return;
    // Drain at the foot of the glass.
    if (v > 0 && Math.atan2(Math.abs(u), v) < DRAIN_HALF) {
      if (r > WALL_R + 4) {
        this.alive[i] = 0;
        this.drained++;
        this.events.push({ type: 'drain' });
      }
      return;
    }
    const nu = u / r;
    const nv = v / r;
    this.u[i] = nu * WALL_R;
    this.v[i] = nv * WALL_R;
    const vn = this.vu[i] * nu + this.vv[i] * nv;
    if (vn > 0) {
      this.vu[i] -= (1 + E_WALL) * vn * nu;
      this.vv[i] -= (1 + E_WALL) * vn * nv;
    }
  }

  private ballContacts(): void {
    const discs = this.discs;
    for (let i = 0; i < this.maxBalls; i++) {
      if (!this.alive[i]) continue;
      const d = discs[i];
      d.x = this.u[i];
      d.y = this.v[i];
      d.vx = this.vu[i];
      d.vy = this.vv[i];
    }
    let touched = false;
    this.pairs.pairs(discs, (i) => this.alive[i] === 1, (i, j) => {
      if (!collideDiscs(discs[i], discs[j], E_BALL)) return;
      touched = true;
      // Contact between balls breaks the symmetry: a small drawn sideways nudge keeps two
      // twins from getting locked in an arch over the axis, which does not happen with real balls.
      const kick = (hash01(this.seed, this.serial[i], this.serial[j], this.steps >> 5) * 2 - 1) * 3;
      discs[i].vx += kick;
      discs[j].vx += kick;
    });
    if (!touched) return;
    for (let i = 0; i < this.maxBalls; i++) {
      if (!this.alive[i]) continue;
      const d = discs[i];
      this.u[i] = d.x;
      this.v[i] = d.y;
      this.vu[i] = d.vx;
      this.vv[i] = d.vy;
    }
  }

  // ───────────── History (rewind) ─────────────

  private record(): void {
    const snap = this.history[this.historyHead];
    this.write(snap);
    this.historyHead = (this.historyHead + 1) % this.historyCap;
    this.historyLen = Math.min(this.historyCap, this.historyLen + 1);
  }

  private write(snap: Snapshot): void {
    snap.time = this.time;
    snap.steps = this.steps;
    const n = this.maxBalls;
    for (let i = 0; i < n; i++) {
      snap.alive[i] = this.alive[i];
      if (!this.alive[i]) continue;
      snap.balls[i * 4] = this.u[i];
      snap.balls[i * 4 + 1] = this.v[i];
      snap.balls[i * 4 + 2] = this.vu[i];
      snap.balls[i * 4 + 3] = this.vv[i];
      snap.meta[i * 2] = this.serial[i];
      snap.meta[i * 2 + 1] = this.pair[i] * 2 + (this.side[i] > 0 ? 1 : 0);
    }
    const s = snap.scalars;
    s[0] = this.windAngle[0];
    s[1] = this.windAngle[1];
    s[2] = this.windOmega[0];
    s[3] = this.windOmega[1];
    s[4] = this.launched;
    s[5] = this.pocketed;
    s[6] = this.tulipCatches;
    s[7] = this.drained;
    s[8] = this.fever;
    s[9] = this.feverCount;
    s[10] = this.nextLaunch;
    s[11] = this.nextPair;
    s[12] = this.pourLeft;
    s[13] = this.launching ? 1 : 0;
  }

  private restore(snap: Snapshot): void {
    this.time = snap.time;
    this.steps = snap.steps;
    for (let i = 0; i < this.maxBalls; i++) {
      this.alive[i] = snap.alive[i];
      if (!snap.alive[i]) continue;
      this.u[i] = snap.balls[i * 4];
      this.v[i] = snap.balls[i * 4 + 1];
      this.vu[i] = snap.balls[i * 4 + 2];
      this.vv[i] = snap.balls[i * 4 + 3];
      this.serial[i] = snap.meta[i * 2];
      this.pair[i] = snap.meta[i * 2 + 1] >> 1;
      this.side[i] = snap.meta[i * 2 + 1] & 1 ? 1 : -1;
    }
    const s = snap.scalars;
    this.windAngle[0] = s[0];
    this.windAngle[1] = s[1];
    this.windOmega[0] = s[2];
    this.windOmega[1] = s[3];
    this.launched = s[4];
    this.pocketed = s[5];
    this.tulipCatches = s[6];
    this.drained = s[7];
    this.fever = s[8];
    this.feverCount = s[9];
    this.nextLaunch = s[10];
    this.nextPair = s[11];
    this.pourLeft = s[12];
  }

  /** Seconds of history available backward from the last saved state. */
  get historySeconds(): number {
    return this.historyLen > 0 ? (this.historyLen - 1) / HISTORY_HZ : 0;
  }

  /** Time of the last saved state (the present of the history). */
  get historyNow(): number {
    if (this.historyLen === 0) return this.time;
    return this.history[(this.historyHead - 1 + this.historyCap) % this.historyCap].time;
  }

  /**
   * Shows the state from `ago` seconds ago (0 = the most recent saved one), without deleting the history.
   * Returns the effective seconds.
   */
  seek(ago: number): number {
    if (this.historyLen === 0) return 0;
    const frames = Math.max(0, Math.min(this.historyLen - 1, Math.round(ago * HISTORY_HZ)));
    const idx = (this.historyHead - 1 - frames + this.historyCap * 2) % this.historyCap;
    this.restore(this.history[idx]);
    this.seekFrames = frames;
    return frames / HISTORY_HZ;
  }

  /** History frames ahead of the shown state (0 = at the present). */
  seekFrames = 0;

  /** New branch: the physics continues from the shown state and the saved future is discarded. */
  branch(): void {
    if (this.seekFrames > 0) {
      this.historyHead = (this.historyHead - this.seekFrames + this.historyCap) % this.historyCap;
      this.historyLen -= this.seekFrames;
      this.seekFrames = 0;
    }
    this.dots.truncateAfter(this.time);
    this.launching = false;
  }

  /** Runs `seconds` without showing (reduced motion and tests). */
  run(seconds: number): void {
    const steps = Math.round(seconds / STEP);
    for (let k = 0; k < steps; k++) this.step();
  }
}
