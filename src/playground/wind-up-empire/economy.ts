// Demo economy, openly declared fake: TIN, SPRING (stored wind, 0–12 turns = 0–96
// detents) and SPARK. A pure state machine that advances at 10 Hz on its own clock, independent of
// the views. Nothing persists: a reload returns to the initial state.

export type BuildingId = 'mine' | 'gantry' | 'observatory';
export type ResearchRow = 'inks' | 'memory' | 'symmetry';
export type SpringMode = 'idle' | 'winding' | 'running' | 'hold';

export const DETENTS_PER_TURN = 8;
export const MAX_DETENTS = 96;
/** One turn of the key is worth 3 spring-seconds. */
export const SECONDS_PER_TURN = 3;
export const QUEUE_SIZE = 3;
/** Cap on the catch-up when returning from a hidden tab: 5 minutes of production. */
export const MAX_CATCH_UP = 300;
export const TICK = 0.1;
/** Maximum wind, in spring-seconds. */
export const MAX_SPRING = (MAX_DETENTS * SECONDS_PER_TURN) / DETENTS_PER_TURN;

export const BUILDING_NAMES: Record<BuildingId, string> = {
  mine: 'Tin mine',
  gantry: 'Launch gantry',
  observatory: 'Observatory',
};

export const ROWS: readonly ResearchRow[] = ['inks', 'memory', 'symmetry'];
export const ROW_NAMES: Record<ResearchRow, string> = { inks: 'Inks', memory: 'Exposure memory', symmetry: 'Symmetry' };
const RESEARCH_COST: Record<ResearchRow, number> = { inks: 20, memory: 40, symmetry: 60 };
const RESEARCH_TIME: Record<ResearchRow, number> = { inks: 10, memory: 15, symmetry: 20 };

const GANTRY_COST = [40, 64, 102];
const GANTRY_TIME = [8, 11, 15];
const OBSERVATORY_COST = [50, 80, 128];
const OBSERVATORY_TIME = [10, 14, 20];

export interface Job {
  building: BuildingId;
  level: number;
  cost: number;
  /** Spring-seconds it needs. */
  time: number;
  /** Spring-seconds already applied. */
  progress: number;
}

export interface ResearchState {
  status: 'locked' | 'available' | 'researching' | 'done';
  /** Seconds left while researching. */
  remaining: number;
}

export interface EconomyState {
  tin: number;
  spark: number;
  /** Stored wind in spring-seconds (0–36: 12 turns of 3 s). Unwinding is continuous. */
  spring: number;
  mode: SpringMode;
  levels: Record<BuildingId, number>;
  queue: Job[];
  research: Record<ResearchRow, ResearchState>;
  built: number;
}

export type EconomyEvent =
  | { type: 'built'; job: Job; line: string }
  | { type: 'log'; line: string }
  | { type: 'research-done'; row: ResearchRow; line: string }
  | { type: 'spring-full'; line: string };

/** Mine output at level L: 1.2 · 1.35^(L−1) TIN/s. */
export function mineRate(level: number): number {
  return 1.2 * Math.pow(1.35, level - 1);
}

/** Cost and wind time of level `level` of a building (null if there is no such level). */
export function levelCost(building: BuildingId, level: number): { cost: number; time: number } | null {
  if (building === 'mine') {
    if (level < 2) return null;
    return { cost: Math.round(30 * Math.pow(1.6, level - 2)), time: Math.min(45, round1(6 * Math.pow(1.4, level - 2))) };
  }
  const costs = building === 'gantry' ? GANTRY_COST : OBSERVATORY_COST;
  const times = building === 'gantry' ? GANTRY_TIME : OBSERVATORY_TIME;
  const index = building === 'gantry' ? level - 2 : level - 1;
  if (index < 0 || index >= costs.length) return null;
  return { cost: costs[index], time: times[index] };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** "+1.2/s" with one decimal place. */
export function formatRate(rate: number): string {
  return `+${(Math.floor(rate * 10 + 1e-6) / 10).toFixed(1)}/s`;
}

export function initialState(): EconomyState {
  return {
    tin: 60,
    spark: 0,
    spring: 0,
    mode: 'idle',
    levels: { mine: 1, gantry: 1, observatory: 0 },
    // The first wind builds something visible: the mine upgrade is already queued.
    queue: [{ building: 'mine', level: 2, cost: 30, time: 6, progress: 0 }],
    research: {
      inks: { status: 'locked', remaining: 0 },
      memory: { status: 'locked', remaining: 0 },
      symmetry: { status: 'locked', remaining: 0 },
    },
    built: 0,
  };
}

export class Economy {
  state: EconomyState = initialState();
  private readonly listeners = new Set<(event: EconomyEvent) => void>();

  on(listener: (event: EconomyEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EconomyEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  get rate(): number {
    return mineRate(this.state.levels.mine);
  }

  /** Stored detents (0–96), rounded up while unwinding. */
  get detents(): number {
    return Math.max(0, Math.min(MAX_DETENTS, Math.ceil((this.state.spring * DETENTS_PER_TURN) / SECONDS_PER_TURN - 1e-6)));
  }

  /** Whole turns stored (the SPRING resource, 0–12). */
  get turns(): number {
    return Math.floor(this.detents / DETENTS_PER_TURN);
  }

  /** Stored spring-seconds. */
  get storedSeconds(): number {
    return this.state.spring;
  }

  /** Relative wind (0–1): drives the title, the Whirl, the shading, the drums and the hum. */
  get wind(): number {
    return Math.min(1, this.state.spring / MAX_SPRING);
  }

  /** Next level of a building that can be ordered, counting what is already queued. */
  nextLevel(building: BuildingId): number {
    const queued = this.state.queue.filter((j) => j.building === building).length;
    return this.state.levels[building] + queued + 1;
  }

  /** Why the next level cannot be ordered, or null if it can. */
  whyNot(building: BuildingId): string | null {
    const level = this.nextLevel(building);
    const price = levelCost(building, level);
    if (!price) return 'Top level reached';
    if (this.state.queue.length >= QUEUE_SIZE) return 'Queue full (3 of 3)';
    const missing = Math.ceil(price.cost - this.state.tin - 1e-9);
    if (missing > 0) return `Needs ${missing} more tin`;
    return null;
  }

  queueBuild(building: BuildingId): boolean {
    if (this.whyNot(building)) return false;
    const level = this.nextLevel(building);
    const price = levelCost(building, level)!;
    this.state.tin -= price.cost;
    this.state.queue.push({ building, level, cost: price.cost, time: price.time, progress: 0 });
    this.emit({ type: 'log', line: `Queued ${BUILDING_NAMES[building]} to level ${level}. ${price.cost} tin paid.` });
    return true;
  }

  /** Adds wind detents (the key, "+1 turn"). Returns how many fit. */
  addWind(detents: number): number {
    const s = this.state;
    // The reserve is rounded to whole detents: the key always sits in a detent.
    const current = this.detents;
    const added = Math.max(0, Math.min(MAX_DETENTS - current, detents));
    s.mode = 'winding';
    s.spring = ((current + added) * SECONDS_PER_TURN) / DETENTS_PER_TURN;
    if (added < detents) this.emit({ type: 'spring-full', line: "The spring's full. Twelve turns is all a tin toy takes." });
    return added;
  }

  /** Letting go of the key: if there is work queued, the wind runs it. */
  letGo(): void {
    const s = this.state;
    if (this.storedSeconds <= 0) {
      s.mode = 'idle';
      return;
    }
    if (!s.queue.length) {
      s.mode = 'idle';
      this.emit({ type: 'log', line: 'Spring held. Queue a build to use it.' });
      return;
    }
    s.mode = 'running';
  }

  /** Pressing the key while it runs: the queue pauses (HOLD). */
  hold(on: boolean): void {
    const s = this.state;
    if (on && s.mode === 'running') s.mode = 'hold';
    else if (!on && s.mode === 'hold') s.mode = 'running';
  }

  /** Completes at once everything the stored wind can cover (reduced motion). */
  runInstantly(): void {
    this.letGo();
    if (this.state.mode === 'running') this.advanceSpring(this.storedSeconds + 1e-6);
  }

  addSpark(amount: number): void {
    this.state.spark += amount;
  }

  research(row: ResearchRow): boolean {
    const r = this.state.research[row];
    if (r.status !== 'available') return false;
    const cost = RESEARCH_COST[row];
    if (this.state.spark < cost) return false;
    this.state.spark -= cost;
    r.status = 'researching';
    r.remaining = RESEARCH_TIME[row];
    this.emit({ type: 'log', line: `Researching ${ROW_NAMES[row]}. ${cost} spark spent, ${RESEARCH_TIME[row]} s to go.` });
    return true;
  }

  researchCost(row: ResearchRow): number {
    return RESEARCH_COST[row];
  }

  researchTime(row: ResearchRow): number {
    return RESEARCH_TIME[row];
  }

  /** Advances the economy clock. `dt` is clamped to 5 minutes (hidden tab). */
  tick(dt: number): void {
    const step = Math.min(MAX_CATCH_UP, Math.max(0, dt));
    const s = this.state;
    s.tin += this.rate * step;
    for (const row of ROWS) {
      const r = s.research[row];
      if (r.status !== 'researching') continue;
      r.remaining -= step;
      if (r.remaining <= 1e-9) {
        r.remaining = 0;
        r.status = 'done';
        this.emit({ type: 'research-done', row, line: `Research done. ${ROW_NAMES[row]} is ready on the press.` });
      }
    }
    if (s.mode === 'running') this.advanceSpring(step);
  }

  private advanceSpring(seconds: number): void {
    const s = this.state;
    let left = seconds;
    while (left > 1e-9 && s.queue.length && this.storedSeconds > 1e-9) {
      const job = s.queue[0];
      const use = Math.min(left, job.time - job.progress, this.storedSeconds);
      job.progress += use;
      s.spring -= use;
      left -= use;
      if (job.progress >= job.time - 1e-9) this.complete(job);
    }
    if (s.spring <= 1e-9) {
      s.spring = 0;
      s.mode = 'idle';
    } else if (!s.queue.length) {
      s.mode = 'idle';
    }
  }

  private complete(job: Job): void {
    const s = this.state;
    s.queue.shift();
    s.levels[job.building] = job.level;
    s.built++;
    this.refreshResearch();
    this.emit({ type: 'built', job, line: builtLine(job, this) });
  }

  private refreshResearch(): void {
    const level = this.state.levels.observatory;
    ROWS.forEach((row, i) => {
      const r = this.state.research[row];
      if (r.status === 'locked' && level >= i + 1) r.status = 'available';
    });
  }

  /** "Skip the grind": every building below level 3 goes up to 3 and all three rows are researched. */
  skipGrind(): void {
    const s = this.state;
    for (const b of ['mine', 'gantry', 'observatory'] as BuildingId[]) s.levels[b] = Math.max(3, s.levels[b]);
    s.queue = s.queue.filter((job) => job.level > s.levels[job.building]);
    for (const row of ROWS) s.research[row] = { status: 'done', remaining: 0 };
    this.emit({ type: 'log', line: 'Grind skipped. Every building is level 3 and the press is fully researched.' });
  }

  reset(): void {
    this.state = initialState();
    this.emit({ type: 'log', line: 'Universe reset. Back to 60 tin.' });
  }
}

function builtLine(job: Job, economy: Economy): string {
  const name = BUILDING_NAMES[job.building];
  if (job.building === 'mine') return `Built. ${name} is level ${job.level}. Tin now ${formatRate(economy.rate)}.`;
  if (job.building === 'gantry') return `Built. ${name} is level ${job.level}. ${job.level} rockets can fly at once.`;
  const row = ROW_NAMES[ROWS[Math.min(job.level, 3) - 1]];
  return `Built. ${name} is level ${job.level}. The press can research ${row}.`;
}

/** "3 turns and 5 eighths wound". */
export function windText(detents: number): string {
  const turns = Math.floor(detents / DETENTS_PER_TURN);
  const eighths = detents % DETENTS_PER_TURN;
  const t = `${turns} turn${turns === 1 ? '' : 's'}`;
  if (!eighths) return `${t} wound`;
  return `${t} and ${eighths} eighth${eighths === 1 ? '' : 's'} wound`;
}

/** Turns still needed to finish the active job. */
export function turnsNeeded(economy: Economy): number {
  const job = economy.state.queue[0];
  if (!job) return 0;
  const seconds = Math.max(0, job.time - job.progress - economy.storedSeconds);
  return Math.max(0, Math.ceil(seconds / SECONDS_PER_TURN - 1e-9));
}
