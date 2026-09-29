// Rain Run's machine on top of the simulation: a fixed-step time accumulator, TIME VIEW
// (paused with C in PLAY, on its own in GAME OVER), back to ATTRACT after 20 s without input, and a local record
// (HI + best flight as poses). Pure: no three and no DOM, only an injectable store.
import { RainRunSim, STEP, type Pose, type SimEvent } from './sim';

export const IDLE_TO_ATTRACT = 20;
const BEST_KEY = 'game-center:rain-run:best';

export type MachineState = 'attract' | 'play' | 'timeview' | 'gameover';

export interface BestRun {
  score: number;
  poses: Pose[];
}

/** Minimal store (localStorage or a test double). Any method may throw. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadBest(store: Store | null): BestRun | null {
  try {
    const raw = store?.getItem(BEST_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { score?: unknown; poses?: unknown };
    if (typeof data.score !== 'number' || !Array.isArray(data.poses)) return null;
    const poses = (data.poses as number[][]).map(([t, x, y, z, bank, pitch]) => ({ t, x, y, z, bank, pitch }));
    return { score: data.score, poses };
  } catch {
    return null;
  }
}

/** Saves the best flight as poses (rounded to 4 decimals). false if the store does not allow it. */
export function saveBest(store: Store | null, best: BestRun): boolean {
  if (!store) return false;
  const r = (v: number) => Math.round(v * 10000) / 10000;
  try {
    store.setItem(
      BEST_KEY,
      JSON.stringify({ score: best.score, poses: best.poses.map((p) => [r(p.t), r(p.x), r(p.y), r(p.z), r(p.bank), r(p.pitch)]) }),
    );
    return true;
  } catch {
    return false;
  }
}

export class RainRunGame {
  readonly sim: RainRunSim;
  state: MachineState = 'attract';
  best: BestRun | null;
  ghostOn = true;
  /** Seconds since the last interaction in GAME OVER. */
  idle = 0;
  /** true if the last game beat the HI. */
  newRecord = false;
  /** Ghost frozen at the start of each game (the best flight before this one). */
  ghost: Pose[] | null = null;
  private acc = 0;
  private readonly store: Store | null;

  constructor(store: Store | null, seed?: number) {
    this.store = store;
    this.sim = new RainRunSim(seed);
    this.best = loadBest(store);
  }

  get hi(): number | null {
    return this.best?.score ?? null;
  }

  /** START: from ATTRACT or GAME OVER, a new game begins. */
  start(): boolean {
    if (this.state === 'play' || this.state === 'timeview') return false;
    this.sim.start();
    this.ghost = this.best?.poses ?? null;
    this.state = 'play';
    this.idle = 0;
    this.acc = 0;
    this.newRecord = false;
    return true;
  }

  /** C: in PLAY opens TIME VIEW with the game paused; pressed again, resumes it without spending the clock. */
  toggleTimeView(): MachineState {
    if (this.state === 'play') this.state = 'timeview';
    else if (this.state === 'timeview') {
      this.state = 'play';
      this.acc = 0;
    }
    this.idle = 0;
    return this.state;
  }

  toggleGhost(): boolean {
    this.ghostOn = !this.ghostOn;
    return this.ghostOn;
  }

  /** Any gesture from the visitor restarts the GAME OVER wait. */
  touch(): void {
    this.idle = 0;
  }

  /** Returns to the automatic demo. */
  toAttract(): void {
    this.sim.reset('attract');
    this.state = 'attract';
    this.acc = 0;
    this.idle = 0;
  }

  /**
   * Advances `dt` seconds of real time with a fixed step. Returns the simulation's events.
   * `autoplay` = false freezes ATTRACT (reduced motion or SW7 off).
   */
  advance(dt: number, autoplay = true): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.state === 'gameover') {
      this.idle += dt;
      if (this.idle >= IDLE_TO_ATTRACT) this.toAttract();
      return events;
    }
    if (this.state === 'timeview' || (this.state === 'attract' && !autoplay)) return events;

    this.acc += Math.min(dt, 0.25);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.sim.step();
      events.push(...this.sim.events.splice(0));
      if (this.sim.phase === 'gameover') {
        this.finish();
        break;
      }
      // ATTRACT flies in a loop: after 90 s it returns to the start.
      if (this.state === 'attract' && this.sim.time >= 90) this.sim.reset('attract');
    }
    return events;
  }

  /** Fast-forwards ATTRACT by `seconds` without showing it (pre-exposed image). */
  fastForward(seconds: number): void {
    this.toAttract();
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i++) this.sim.step();
    this.sim.events.length = 0;
  }

  private finish(): void {
    this.state = 'gameover';
    this.idle = 0;
    this.acc = 0;
    const score = this.sim.score;
    if (this.best === null || score > this.best.score) {
      this.best = { score, poses: this.sim.poses.slice() };
      this.newRecord = true;
      saveBest(this.store, this.best);
    }
  }
}
