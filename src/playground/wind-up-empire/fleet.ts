// The fleet: planet clock, flights in progress, stamped exposures and surveys. It touches neither the
// DOM nor three: the 3D view, the gauge, the hangar and the 2D drawing read it. It is advanced from
// outside with `update(dt)` (an engine ticker, or its own rAF without WebGL2).
import {
  DETENTS,
  TIMEOUT,
  advanceTo,
  launch,
  radius,
  simulate,
  speed,
  type FlightState,
  type Outcome,
} from './flight';
import { WORLD_BODIES, worldAngle, type WorldBody, type WorldId } from './orbits';

export interface StampedExposure {
  x: number;
  y: number;
  heading: number;
  /** Time of the stamp on the fleet clock (s). */
  birth: number;
  flight: number;
}

export interface Flight {
  id: number;
  demo: boolean;
  state: FlightState;
  /** Fleet clock at launch. */
  launchedAt: number;
  /** Exposures of this flight already stamped. */
  stamped: number;
  /** Surveys already announced. */
  announced: number;
  /** Fleet clock when the flight ended (for the exit animations). */
  endedAt: number | null;
  /** Indices into `exposures` of the flight's latest exposures. */
  recent: number[];
}

export interface FleetEvents {
  launch?(flight: Flight): void;
  survey?(flight: Flight, world: WorldId, first: boolean): void;
  end?(flight: Flight, outcome: Outcome, newlyCharted: WorldId[], surveyed: WorldId[]): void;
  stamp?(exposure: StampedExposure, index: number): void;
  /** One click of the return to rest (1, 2, 3). */
  ratchet?(click: number): void;
}

/** How long a finished flight stays visible (stretch, fade). */
export const END_LINGER = 0.6;
/** Cap on the exposures kept for the print proof. */
export const PROOF_LIMIT = 5000;
/** "Reset universe": the planets return to the golden spiral in three 400 ms ratchet clicks. */
export const RATCHET_CLICKS = 3;
export const RATCHET_CLICK_S = 0.4;

/** Wraps an angle into (−π, π]. */
function wrapPi(a: number): number {
  const t = Math.PI * 2;
  let x = a % t;
  if (x <= -Math.PI) x += t;
  if (x > Math.PI) x -= t;
  return x;
}

export class Fleet {
  /** Fleet clock (s); it only advances with `update`. */
  now = 0;
  /** Planet time: frozen under reduced motion. */
  planetTime = 0;
  planetsMove = true;
  /** Rockets in flight at once (the platform level; 2 at most on a phone). */
  capacity = 1;
  /** Exposure memory in moments (12, 48 or 200). */
  memory = 48;
  readonly flights: Flight[] = [];
  /** Every exposure since page load (up to PROOF_LIMIT), for the proof. */
  readonly exposures: StampedExposure[] = [];
  readonly charted = new Set<WorldId>();
  /** Surveys per world (the first one gives +25, later ones +5). */
  readonly surveyCount = new Map<WorldId, number>();
  flightsFlown = 0;
  /** Return to rest in progress: starting angles and the fleet clock when it began. */
  ratchet: { from: number[]; start: number; clicks: number } | null = null;
  private nextId = 1;
  private readonly listeners: FleetEvents[] = [];

  on(events: FleetEvents): () => void {
    this.listeners.push(events);
    return () => this.listeners.splice(this.listeners.indexOf(events), 1);
  }

  /** Flights that have not ended yet. */
  get active(): Flight[] {
    return this.flights.filter((f) => f.state.outcome === null);
  }

  /** Flights that take up a slot on the platform (the demo flight does not count). */
  get occupied(): number {
    return this.flights.filter((f) => f.state.outcome === null && !f.demo).length;
  }

  get canLaunch(): boolean {
    return this.occupied < this.capacity && !this.ratchet;
  }

  /** Angle of a world on its orbit right now (including the reset's return to rest, if any). */
  planetAngle(world: WorldBody): number {
    if (!this.ratchet) return worldAngle(world, this.planetTime);
    const i = WORLD_BODIES.indexOf(world);
    const offset = wrapPi(this.ratchet.from[i] - world.rest);
    return world.rest + offset * (1 - this.ratchetProgress);
  }

  /** Progress of the return to rest (0–1): three clicks, each with an exponential ease-out. */
  get ratchetProgress(): number {
    if (!this.ratchet) return 1;
    const t = (this.now - this.ratchet.start) / RATCHET_CLICK_S;
    if (t >= RATCHET_CLICKS) return 1;
    const k = Math.floor(t);
    const u = t - k;
    return (k + (1 - Math.pow(1 - u, 3))) / RATCHET_CLICKS;
  }

  /** Last rocket launched (the one the gauge follows). */
  get latest(): Flight | null {
    return this.flights.length ? this.flights[this.flights.length - 1] : null;
  }

  /** true while anything in the fleet is moving (flights or exits). */
  get busy(): boolean {
    return !!this.ratchet || this.flights.some((f) => f.state.outcome === null || (f.endedAt !== null && this.now - f.endedAt < END_LINGER));
  }

  /**
   * Launches a rocket. With `instant` (reduced motion) it computes the whole flight and stamps all of its
   * exposures at once, like a chronophotograph.
   */
  launch(detents: number, aim: number, options: { demo?: boolean; instant?: boolean } = {}): Flight | null {
    if (detents < 1) return null;
    if (!options.demo && !this.canLaunch) return null;
    const params = { detents: Math.min(DETENTS, detents), aim, planetTime: this.planetTime, planetsMove: this.planetsMove };
    const flight: Flight = {
      id: options.demo ? 0 : this.nextId++,
      demo: options.demo ?? false,
      state: options.instant ? simulate(params) : launch(params),
      launchedAt: this.now,
      stamped: 0,
      announced: 0,
      endedAt: null,
      recent: [],
    };
    this.flights.push(flight);
    this.flightsFlown++;
    for (const l of this.listeners) l.launch?.(flight);
    if (options.instant) {
      // Every exposure, with ages spread across the memory: the whole path, standing still.
      const n = flight.state.exposures.length;
      const span = this.memory / 12;
      this.collect(flight, (i) => this.now - span * (1 - (i + 1) / n));
      this.finish(flight);
      // No exit animation: the flight is already printed in full.
      this.retire(flight);
    } else {
      this.collect(flight, () => this.now);
    }
    return flight;
  }

  /**
   * Reduced motion turned on mid-flight: the flights in progress end right away and whatever they
   * had left is stamped at once, like the chronophotograph of `launch({ instant })`.
   */
  settle(): void {
    for (const flight of this.flights) {
      if (flight.state.outcome !== null) {
        // Exits still waiting to animate end too: with the clock stopped they would never advance.
        if (flight.endedAt !== null && this.now - flight.endedAt <= END_LINGER) this.retire(flight);
        continue;
      }
      advanceTo(flight.state, TIMEOUT);
      const n = flight.state.exposures.length;
      const span = this.memory / 12;
      this.collect(flight, (i) => this.now - span * (1 - (i + 1) / n));
      this.finish(flight);
      this.retire(flight);
    }
  }

  /**
   * Marks a flight's exit as finished. One millisecond past END_LINGER: with a large `now`,
   * `now - (now - END_LINGER)` rounds down and `busy` used to stay true forever.
   */
  private retire(flight: Flight): void {
    flight.endedAt = this.now - END_LINGER - 1e-3;
  }

  update(dt: number): void {
    this.now += dt;
    if (this.ratchet) {
      const clicks = Math.min(RATCHET_CLICKS, Math.floor((this.now - this.ratchet.start) / RATCHET_CLICK_S) + 1);
      while (this.ratchet.clicks < clicks) {
        this.ratchet.clicks++;
        for (const l of this.listeners) l.ratchet?.(this.ratchet.clicks);
      }
      if (this.now - this.ratchet.start >= RATCHET_CLICKS * RATCHET_CLICK_S) this.ratchet = null;
    } else if (this.planetsMove) this.planetTime += dt;
    for (const flight of this.flights) {
      if (flight.state.outcome !== null) continue;
      advanceTo(flight.state, this.now - flight.launchedAt);
      this.collect(flight, (i) => flight.launchedAt + flight.state.exposures[i].t);
      this.announce(flight);
      if (flight.state.outcome !== null) this.finish(flight);
    }
    // Flights that ended a while ago are no longer needed (their exposures remain).
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      if (f.endedAt !== null && this.now - f.endedAt > END_LINGER + 1 && f !== this.latest) this.flights.splice(i, 1);
    }
  }

  /**
   * Returns to the state of a fresh page load (Reset universe). With `animate`, the planets return to the
   * golden spiral in three ratchet clicks; without it (reduced motion), all at once.
   */
  reset(animate = false): void {
    const from = WORLD_BODIES.map((w) => worldAngle(w, this.planetTime));
    this.ratchet = animate ? { from, start: this.now, clicks: 0 } : null;
    this.flights.length = 0;
    this.exposures.length = 0;
    this.charted.clear();
    this.surveyCount.clear();
    this.planetTime = 0;
    this.flightsFlown = 0;
    this.nextId = 1;
  }

  /** Readout of the last rocket: r, v and t from the simulation. */
  readout(): { r: number; v: number; t: number } | null {
    const f = this.latest;
    if (!f) return null;
    return { r: radius(f.state), v: speed(f.state), t: f.state.t };
  }

  private collect(flight: Flight, birthOf: (i: number) => number): void {
    const list = flight.state.exposures;
    for (let i = flight.stamped; i < list.length; i++) {
      const e = list[i];
      const stamped: StampedExposure = { x: e.x, y: e.y, heading: e.heading, birth: birthOf(i), flight: flight.id };
      if (this.exposures.length >= PROOF_LIMIT) this.exposures.shift();
      this.exposures.push(stamped);
      flight.recent.push(this.exposures.length - 1);
      if (flight.recent.length > 6) flight.recent.shift();
      for (const l of this.listeners) l.stamp?.(stamped, this.exposures.length - 1);
    }
    flight.stamped = list.length;
  }

  private announce(flight: Flight): void {
    const surveys = flight.state.surveys;
    for (let i = flight.announced; i < surveys.length; i++) {
      const world = surveys[i].world;
      const count = this.surveyCount.get(world) ?? 0;
      this.surveyCount.set(world, count + 1);
      const first = !this.charted.has(world);
      this.charted.add(world);
      for (const l of this.listeners) l.survey?.(flight, world, first);
    }
    flight.announced = surveys.length;
  }

  private finish(flight: Flight): void {
    this.announce(flight);
    flight.endedAt = this.now;
    const surveyed = flight.state.surveys.map((s) => s.world);
    const newly = surveyed.filter((w) => (this.surveyCount.get(w) ?? 0) === 1);
    for (const l of this.listeners) l.end?.(flight, flight.state.outcome!, newly, surveyed);
  }
}

/** Name and coordinate of a world for the log: "Plate [1:1:4]". */
export function worldLabel(id: WorldId): string {
  const w = WORLD_BODIES.find((b) => b.id === id)!;
  return `${w.name} ${w.coord}`;
}

/** Spark per survey: +25 for the first of each planet, +5 for later ones. */
export function surveyReward(first: boolean): number {
  return first ? 25 : 5;
}

/** Deterministic log lines for a flight. */
export function flightLines(flight: Flight, outcome: Outcome, surveyed: WorldId[], firsts: WorldId[]): string[] {
  const lines: string[] = [];
  const name = flight.demo ? 'Rocket 0' : `Rocket ${flight.id}`;
  if (surveyed.length) {
    const spark = surveyed.reduce((sum, w) => sum + surveyReward(firsts.includes(w)), 0);
    const names = surveyed.map(worldLabel);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    lines.push(`${name} surveyed ${list}${surveyed.length > 1 ? ' in one flight' : ''}. +${spark} spark.`);
  }
  if (outcome === 'swallowed') lines.push('Lost to the Whirl. Rocket refunded: this is a demo.');
  else if (outcome === 'escaped') lines.push('Left the system. Rocket refunded.');
  else lines.push(`${name} came home after 20 s.${surveyed.length ? '' : ' It never found a planet.'}`);
  return lines;
}
