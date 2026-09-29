// Flight of the friction rocket: fixed-step velocity Verlet with the Whirl's gravity as the only
// force. The planets are only survey targets (no gravity of their own), so the outcome depends
// only on the pull, the aim and the moment of launch. Pure module.
import {
  ESCAPE_RADIUS,
  HOME,
  HOME_POSITION,
  HORIZON,
  MU,
  SOFTENING,
  WORLD_BODIES,
  circularSpeed,
  worldPosition,
  type Vec2,
  type WorldId,
} from './orbits';

/** Fixed integration step: 240 Hz (4 substeps per frame at 60 fps). */
export const DT = 1 / 240;
/** One exposure stamped every 1/12 s of flight. */
export const EXPOSURE_EVERY = 1 / 12;
/** Integration steps between exposures. */
export const STEPS_PER_EXPOSURE = Math.round(EXPOSURE_EVERY / DT);
/** Detents of the pull. */
export const DETENTS = 12;
/** Maximum aim to each side (rad). */
export const MAX_AIM = (60 * Math.PI) / 180;
/** Kick at full pull (u/s). */
export const MAX_KICK = 1.2;
/** A flight with no other ending returns home after 20 s. */
export const TIMEOUT = 20;
/** Extra distance past the edge of a top that still counts as a survey. */
export const SURVEY_MARGIN = 0.06;

export type Outcome = 'swallowed' | 'escaped' | 'timeout';

export interface LaunchParams {
  /** Detents of the pull, 1..12. */
  detents: number;
  /** Aim in rad from "toward the Whirl"; positive = prograde (+x). */
  aim: number;
  /** Planet time at the instant of launch. */
  planetTime: number;
  /** false under reduced motion: the planets stay still in their pose. */
  planetsMove?: boolean;
}

export interface Exposure {
  x: number;
  y: number;
  /** Heading of the rocket (rad, atan2 of the velocity). */
  heading: number;
  /** Flight time of the exposure (s). */
  t: number;
}

export interface Survey {
  world: WorldId;
  /** Flight time of the survey. */
  t: number;
}

export interface FlightState {
  params: LaunchParams;
  p: Vec2;
  v: Vec2;
  a: Vec2;
  /** Flight time (s). */
  t: number;
  steps: number;
  exposures: Exposure[];
  surveys: Survey[];
  outcome: Outcome | null;
  /** Minimum radius reached (observed periapsis). */
  minRadius: number;
}

export function clampDetents(detents: number): number {
  return Math.max(0, Math.min(DETENTS, Math.round(detents)));
}

export function clampAim(aim: number): number {
  return Math.max(-MAX_AIM, Math.min(MAX_AIM, aim));
}

/** Launch velocity: the home circular orbit plus the kick of the pull, rotated by the aim. */
export function launchVelocity(detents: number, aim: number): Vec2 {
  const kick = (MAX_KICK * clampDetents(detents)) / DETENTS;
  const a = clampAim(aim);
  // Inward from home (0, −r) is +y; the aim rotates it toward +x.
  return [circularSpeed(HOME.radius) + kick * Math.sin(a), kick * Math.cos(a)];
}

function gravity(p: Vec2, out: Vec2): Vec2 {
  const r2 = p[0] * p[0] + p[1] * p[1] + SOFTENING * SOFTENING;
  const k = -MU / (r2 * Math.sqrt(r2));
  out[0] = k * p[0];
  out[1] = k * p[1];
  return out;
}

export function launch(params: LaunchParams): FlightState {
  const p: Vec2 = [HOME_POSITION[0], HOME_POSITION[1]];
  const v = launchVelocity(params.detents, params.aim);
  const state: FlightState = {
    params: { ...params, planetsMove: params.planetsMove ?? true },
    p,
    v,
    a: gravity(p, [0, 0]),
    t: 0,
    steps: 0,
    exposures: [],
    surveys: [],
    outcome: null,
    minRadius: Math.hypot(p[0], p[1]),
  };
  stamp(state);
  return state;
}

function stamp(state: FlightState): void {
  state.exposures.push({ x: state.p[0], y: state.p[1], heading: Math.atan2(state.v[1], state.v[0]), t: state.t });
}

function planetTimeAt(state: FlightState): number {
  return state.params.planetsMove ? state.params.planetTime + state.t : state.params.planetTime;
}

function checkSurveys(state: FlightState): void {
  const pt = planetTimeAt(state);
  for (const world of WORLD_BODIES) {
    if (state.surveys.some((s) => s.world === world.id)) continue;
    const [wx, wy] = worldPosition(world, pt);
    if (Math.hypot(state.p[0] - wx, state.p[1] - wy) < world.topRadius + SURVEY_MARGIN) {
      state.surveys.push({ world: world.id, t: state.t });
    }
  }
}

/** One velocity Verlet step. Returns true if the flight ended on this step. */
export function step(state: FlightState): boolean {
  if (state.outcome) return true;
  const { p, v, a } = state;
  const h = DT;
  v[0] += 0.5 * h * a[0];
  v[1] += 0.5 * h * a[1];
  p[0] += h * v[0];
  p[1] += h * v[1];
  gravity(p, a);
  v[0] += 0.5 * h * a[0];
  v[1] += 0.5 * h * a[1];
  state.steps++;
  state.t = state.steps * DT;

  const r = Math.hypot(p[0], p[1]);
  state.minRadius = Math.min(state.minRadius, r);
  checkSurveys(state);
  if (state.steps % STEPS_PER_EXPOSURE === 0) stamp(state);

  if (r < HORIZON) state.outcome = 'swallowed';
  else if (r > ESCAPE_RADIUS) state.outcome = 'escaped';
  else if (state.t >= TIMEOUT - 1e-9) state.outcome = 'timeout';
  return state.outcome !== null;
}

/** Advances the flight up to flight time `t` (or until it ends). */
export function advanceTo(state: FlightState, t: number): void {
  const target = Math.min(Math.round(t / DT), Math.round(TIMEOUT / DT));
  while (state.steps < target && !step(state)) {
    // keep integrating
  }
}

/** The whole flight at once (reduced motion, tests, 2D drawing). */
export function simulate(params: LaunchParams): FlightState {
  const state = launch(params);
  while (!step(state)) {
    // until the end
  }
  return state;
}

/** Ghost path: positions over the next `seconds` seconds, one per exposure. */
export function ghostPath(params: LaunchParams, seconds = 3): Vec2[] {
  const state = launch(params);
  const points: Vec2[] = [[state.p[0], state.p[1]]];
  const total = Math.round(seconds / DT);
  for (let i = 0; i < total; i++) {
    if (step(state)) {
      points.push([state.p[0], state.p[1]]);
      break;
    }
    if (state.steps % STEPS_PER_EXPOSURE === 0) points.push([state.p[0], state.p[1]]);
  }
  return points;
}

export function speed(state: FlightState): number {
  return Math.hypot(state.v[0], state.v[1]);
}

export function radius(state: FlightState): number {
  return Math.hypot(state.p[0], state.p[1]);
}
