import { CatmullRomCurve3, Vector3 } from 'three';
import { hash2 } from '../common';
import { headingOf, type Leg, type MotionState, type Pose } from './catMotion';
import { FootTrack, LEGS, clearanceFor, isFront, stepPath, isLeft, jitter, phaseCrossings, type FootSample, type Foothold, type RollShape, type Step, type Vec3 } from './catGait';
import { SampledCurve, integrateCurve, lowerEnvelope, minJerk, sampleCurve, smoothCurve, softMin, springChain, springCurve } from './catSprings';

/**
 * The "cat-stairs" route (D6): the cat walks in with a lateral-sequence gait, slows down at the foot of
 * the stairs and looks up, walks up (each leg on every other tread, the hind leg on its front leg's
 * tread), makes a micro-pause to look at the door, reaches the landing, turns toward the camera by
 * stepping around, sits on its haunches and paws with the tail wrapped around, and stays alive at rest.
 *
 * Everything is a pure function of time: when the plan is built (once per seed), the gait, footfalls,
 * body heights and springs are precomputed in fixed steps of 1/240 s. `at(t)` only reads tables.
 *
 * The body follows from the legs (Johansen): the hip and shoulder heights are the desired ones, softly
 * clamped by the reach of the planted legs, and the tilt follows from those two heights. The legs are
 * solved with IK in the recipe (`catStairs.ts`), on the already posed skeleton, from this plan's
 * feet.
 */

/** Stone stairs against the right wall: 10 risers up to the landing. */
export const STAIRS = {
  x: [0.75, 1.95] as [number, number],
  /** z of the first riser. */
  z0: 1.2,
  rise: 0.17,
  run: 0.28,
  steps: 10,
  /** The landing starts at the tenth riser and reaches the back of the alley. */
  landing: { z: [3.72, 6.0] as [number, number], y: 1.7 },
};

export const STAIRS_MOTION_DURATION = 14;

/** Height of the stairs (m) at z, within their width. */
export function stairHeight(z: number): number {
  if (z < STAIRS.z0) return 0;
  const k = Math.floor((z - STAIRS.z0) / STAIRS.run) + 1;
  return Math.min(STAIRS.steps, k) * STAIRS.rise;
}

/** Surface the cat walks on: the asphalt, the steps and the landing. */
export function surfaceHeight(x: number, z: number): number {
  if (x < STAIRS.x[0] || x > STAIRS.x[1]) return 0;
  return stairHeight(z);
}

const CX = (STAIRS.x[0] + STAIRS.x[1]) / 2;

// --- rig ------------------------------------------------------------------------------------------

/**
 * Rig measurements in subject space (m, at bake scale, standing at rest): joints in the sagittal plane
 * (x forward, y up) and the lateral spacing of each pair of legs. The recipe checks them against the
 * model on load.
 */
export const RIG = {
  /** Root, and the pivot of chest and pelvis. */
  pivot: [-0.0144, 0.3372] as [number, number],
  hip: [-0.0953, 0.2887] as [number, number],
  shoulder: [0.1714, 0.2901] as [number, number],
  neck: [0.1829, 0.427] as [number, number],
  tail: [-0.1706, 0.3623] as [number, number],
  lateral: { hind: 0.0384, fore: 0.0477 },
  hind: {
    upper: 0.1878,
    lower: 0.0953,
    /** Ankle (base of the paw), toe joint and center of the paw (its lowest point). */
    ankle: [-0.1515, 0.0275] as [number, number],
    toe: [-0.1442, 0.0065] as [number, number],
    contact: [-0.1372, -0.0042] as [number, number],
    halfLength: 0.029,
  },
  fore: {
    upper: 0.1513,
    lower: 0.1093,
    ankle: [0.1674, 0.0314] as [number, number],
    toe: [0.1738, 0.0101] as [number, number],
    contact: [0.1805, -0.0023] as [number, number],
    halfLength: 0.027,
  },
};

const HALF_BODY = Math.hypot(RIG.shoulder[0] - RIG.hip[0], RIG.shoulder[1] - RIG.hip[1]) / 2;
/** Usable reach (hip → ankle, shoulder → wrist): below the IK's soft knee. */
const REACH = { hind: 0.965 * (RIG.hind.upper + RIG.hind.lower), fore: 0.965 * (RIG.fore.upper + RIG.fore.lower) };
/** Minimum hip → ankle distance when standing: folded any further, the hock turns too fast. */
const FOLD_MIN = 0.19;
const FOLD_FORE = 0.23;
/** Minimum height of the shoulder above the planted wrist (the elbow stays above the step). */
const ELBOW_CLEAR = 0.15;
/**
 * Fraction of the trunk tilt's deviation from the terrain's tilt that is kept when the body rears up
 * (the hip absorbs the rest by rising).
 */
const PITCH_KEEP = 0.35;
/** Shoulder blade: the shoulder slides along the body toward the foot, up to ±3.5 cm. */
const SCAPULA = { max: 0.035, gain: 0.3, up: 0.045 };

const legRig = (leg: Leg) => (isFront(leg) ? RIG.fore : RIG.hind);
const legLateral = (leg: Leg) => (isLeft(leg) ? 1 : -1) * (isFront(leg) ? RIG.lateral.fore : RIG.lateral.hind);
/** Where the paw sits relative to its girdle joint, along the body, when standing. */
const stanceOffset = (leg: Leg) => legRig(leg).contact[0] - (isFront(leg) ? RIG.shoulder[0] : RIG.hip[0]);

// --- state ----------------------------------------------------------------------------------------

export interface FootState extends FootSample {
  /** Toe joint (world): the paw's pivot while rolling. */
  toe: Vec3;
  /** Ankle or wrist (world): target of the two-bone IK. */
  ankle: Vec3;
  /** 0: middle joint pointing back (standing); 1: pointing forward (seated). */
  fold: number;
}

export interface StairsState extends MotionState {
  t: number;
  feet: Record<Leg, FootState>;
  /** Spine: rotations (rad) of chest and pelvis about the shared pivot. */
  spine: { chest: [number, number, number]; pelvis: [number, number, number] };
  /** Slide of each shoulder blade along the body and its rise over the ribcage (m). */
  scapula: { LF: number; RF: number };
  scapulaUp: { LF: number; RF: number };
  /** Gaze: world orientation of the head (yaw, pitch, roll). */
  look: { yaw: number; pitch: number; roll: number; neckShare: number };
  /** Tail curled around the paws (0–1), side (+1 left) and flick of the tip (rad). */
  tailWrap: number;
  tailSide: number;
  tailFlick: number;
  /** Center of the body (halfway between hip and shoulders) in the world. */
  center: Vec3;
}

// --- script ---------------------------------------------------------------------------------------

/** Key times (s). */
export const SCRIPT = {
  /** Starts slowing down on reaching the stairs and stands still at `stop`. */
  walkEase: 2.45,
  stop: 3.25,
  /** Starts the climb and reaches cruising speed. */
  go: 4.15,
  cruise: 4.65,
  /** Micro-pause halfway up the stairs: slows down, stands still and sets off again. */
  pause: 7.1,
  pauseRamp: 0.2,
  pauseHold: 0.6,
  /** Braking on reaching the landing (its start is computed to stop at `FINAL_Z`). */
  arriveEase: 0.75,
  /** Stepping turn toward the camera (after settling) and sitting down. */
  turnDelay: 0.12,
  turn: 1.2,
  sitDelay: 0.05,
  sit: 0.95,
};

/** Horizontal speed and stride (m) of the entrance and of the climb. */
const WALK = { speed: 0.58, stride: 0.41, variation: 0.06 };
const CLIMB = { speed: (2 * STAIRS.run) / 0.84, stride: 2 * STAIRS.run, variation: 0.1 };
/** Body center when stopping at the foot and at the end on the landing. */
const STOP_Z = 0.97;
const FINAL_Z = 4.22;
/** Where it turns to sit: the final source camera, below and to the left. */
export const TO_CAMERA = headingOf(new Vector3(-1.55, 0, -2.45));
/**
 * Seated on the landing: hip and shoulder heights (joints, m above the floor), spine flexion (the pelvis
 * curls under) and the placement of the hind legs: ahead of the hip and slightly spread, with the
 * middle joint pointing forward, like the knee of a seated cat.
 */
const SIT = { hip: 0.059, shoulder: 0.272, flex: 0.22, hindAhead: 0.13, hindWide: 1.45, hipDelay: 0.4, stand: { hip: 0.264, shoulder: 0.262 } };

/** Gait cycles the turn takes. */
const TURN_CYCLES = 1.9;

/**
 * Gait on flat ground: lateral sequence (left hind, left front, right hind, right front). On the stairs
 * the order is not fixed: it follows from the treads (see `planFeet`), and the result is the diagonal
 * sequence, which continues on the landing and through the turn.
 */
const OFFSETS = {
  walk: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 } as Record<Leg, number>,
  climb: { LF: 0, LH: 0.25, RF: 0.5, RH: 0.75 } as Record<Leg, number>,
};

/** Flight duration of each leg (s): longer on the stairs, where the leg rises higher. */
const FLIGHT = { walk: { fore: 0.28, hind: 0.26 }, climb: { fore: 0.47, hind: 0.41 }, turn: { fore: 0.23, hind: 0.21 } };
const ROLL: Record<'fore' | 'hind', RollShape> = {
  fore: { peel: 0.14, max: 1.05, peakAt: 0.4, flatAt: 0.88 },
  hind: { peel: 0.12, max: 0.55, peakAt: 0.35, flatAt: 0.88 },
};

/** Tables from a little before t = 0 (the gait was already under way) to a little after the end. */
const T0 = -1.6;
const T1 = STAIRS_MOTION_DURATION + 0.4;

// --- utilities ------------------------------------------------------------------------------------

const forwardOf = (heading: number): Vec3 => [Math.cos(heading), 0, -Math.sin(heading)];
const sideOf = (heading: number): Vec3 => [Math.sin(heading), 0, Math.cos(heading)];

/** Deterministic smooth noise in [−1, 1], with knots every `period` s. */
function smoothNoise(seed: number, purpose: number, t: number, period: number): number {
  const x = t / period;
  const i = Math.floor(x);
  const u = x - i;
  const h = (k: number) => 2 * hash2(seed * 5.31 + purpose * 11.7, k * 1.37 + purpose * 0.71) - 1;
  const p0 = h(i - 1);
  const p1 = h(i);
  const p2 = h(i + 1);
  const p3 = h(i + 2);
  return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
}

/**
 * Terrain slope fraction at z (0 on flat ground, 1 on the stairs). On the slope the foothold shifts
 * forward: the point on the foothold line that lies "under" a joint, along the perpendicular to the
 * slope, is ~10 cm ahead of it in plan.
 */
function slopeAt(z: number): number {
  const h = 0.01;
  return Math.min(1, Math.max(0, (terrainLine(z + h) - terrainLine(z - h)) / (2 * h) / (STAIRS.rise / STAIRS.run)));
}
const SLOPE_SHIFT = 0.1;

/**
 * Placement of the paws on each tread (m from the nosing): the front paw ahead and the hind paw 3.5 cm
 * behind, where the front one stepped. The front paw goes close to the nosing: with the shoulder still
 * low and the leg deeply folded, the elbow stays behind the riser instead of going through the step.
 */
const SPOT = { fore: 0.1, hind: 0.065 };

/** Terrain line through the centers of the treads, with rounded corners (for planning). */
function terrainLine(z: number): number {
  const slope = STAIRS.rise / STAIRS.run;
  const start = STAIRS.z0 + 0.135 - STAIRS.run;
  const end = start + STAIRS.landing.y / slope;
  const w = 0.06;
  const soft = (x: number) => w * Math.log1p(Math.exp(x / w));
  return slope * (soft(z - start) - soft(z - end));
}

function unwrapTo(angle: number, reference: number): number {
  let a = angle;
  while (a - reference > Math.PI) a -= 2 * Math.PI;
  while (a - reference < -Math.PI) a += 2 * Math.PI;
  return a;
}

// --- plan -----------------------------------------------------------------------------------------

export class StairsMotion {
  readonly seed: number;
  /** Horizontal distance traveled by the body center (m) and its speed. */
  readonly distance: SampledCurve;
  /** Cumulative gait phase (cycles). */
  readonly phase: SampledCurve;
  readonly tracks: Record<Leg, FootTrack>;
  /** Start of the final braking and of the turn (s). */
  readonly arriveStart: number;
  readonly turnStart: number;
  readonly sitStart: number;

  private readonly route: CatmullRomCurve3;
  private readonly routeLength: number;
  private readonly routeStart: number;
  private readonly turnPivot: Vec3;
  /** Gait phase offset on the landing, to keep the order of the climb. */
  private landingPhase = 0;
  private readonly turnFrom: number;
  private readonly turnDelta: number;
  private readonly hipHeight: SampledCurve;
  private readonly shoulderHeight: SampledCurve;
  private readonly foldCurves: Record<Leg, SampledCurve>;
  private readonly lookYaw: SampledCurve;
  private readonly lookPitch: SampledCurve;
  private readonly tail: { z: SampledCurve[]; x: SampledCurve[] };
  private readonly sway: { pelvisYaw: SampledCurve; pelvisRoll: SampledCurve; chestYaw: SampledCurve; chestRoll: SampledCurve; lateral: SampledCurve };
  private readonly scapula: { LF: SampledCurve; RF: SampledCurve };
  private readonly scapulaUp: { LF: SampledCurve; RF: SampledCurve };
  private readonly flexWave: SampledCurve;
  private readonly lookRoll: SampledCurve;

  constructor(seed = 1) {
    this.seed = seed;
    this.route = new CatmullRomCurve3([
      new Vector3(-0.55, 0, -2.6),
      new Vector3(0.05, 0, -1.45),
      new Vector3(0.55, 0, -0.55),
      new Vector3(1.02, 0, 0.08),
      new Vector3(CX, 0, 0.5),
      new Vector3(CX, 0, STOP_Z),
    ]);
    this.routeLength = this.route.getLength();

    // Route: speed with smooth variation; the final braking is tuned to stop at FINAL_Z.
    const walkDistance = integrateCurve((t) => this.speed(t, Infinity), T0, SCRIPT.stop).values;
    this.routeStart = this.routeLength - walkDistance[walkDistance.length - 1];
    const climbTarget = FINAL_Z - STOP_Z;
    let lo = SCRIPT.cruise;
    let hi = T1 - SCRIPT.arriveEase - 0.1;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const d = integrateCurve((t) => this.speed(t, mid), SCRIPT.go, mid + SCRIPT.arriveEase).values;
      if (d[d.length - 1] > climbTarget) hi = mid;
      else lo = mid;
    }
    this.arriveStart = (lo + hi) / 2;
    const arrive = this.arriveStart;
    this.distance = integrateCurve((t) => this.speed(t, arrive), T0, T1, this.routeStart);
    this.turnStart = this.arriveStart + SCRIPT.arriveEase + SCRIPT.turnDelay;
    this.sitStart = this.turnStart + SCRIPT.turn + SCRIPT.sitDelay;
    this.turnFrom = headingOf(new Vector3(0, 0, 1));
    this.turnDelta = unwrapTo(TO_CAMERA, this.turnFrom) - this.turnFrom;
    const endOfClimb = this.routePoint(this.distance.at(this.turnStart));
    // The turn pivots near the haunches: the front legs walk around, the hind legs almost in place.
    this.turnPivot = [endOfClimb[0], 0, endOfClimb[2] - 0.07];

    // Gait phase: it advances with the distance traveled (fixed stride) and with the turn.
    this.phase = integrateCurve((t) => this.cadence(t), T0, T1, 0);

    this.tracks = this.planFeet();
    this.foldCurves = this.planFold();
    const heights = this.planHeights();
    this.hipHeight = heights.hip;
    this.shoulderHeight = heights.shoulder;
    this.sway = this.planSway();
    this.scapula = { LF: this.planScapula('LF'), RF: this.planScapula('RF') };
    this.scapulaUp = { LF: this.planScapulaLift('LF'), RF: this.planScapulaLift('RF') };
    // Spine at a walk: a slight flexion twice per stride (it extends as the legs stretch).
    this.flexWave = smoothCurve(sampleCurve((t) => 0.035 * Math.sin(4 * Math.PI * this.phase.at(t)) * Math.min(1, this.cadence(t) / 1.1) * (1 - this.sitAmount(t)), T0, T1), 0.03);
    // Tilts the head curiously a while after sitting down.
    const tilt = this.sitStart + SCRIPT.sit + 0.55;
    this.lookRoll = springCurve((t) => 0.32 * (t > tilt && t < tilt + 1.1 ? 1 : 0), 0.14, T0, T1);
    const look = this.planLook();
    this.lookYaw = look.yaw;
    this.lookPitch = look.pitch;
    this.tail = this.planTail();
  }

  // --- route --------------------------------------------------------------------------------------

  /** Horizontal speed of the center (m/s); `arrive` is the start of the final braking. */
  private speed(t: number, arrive: number): number {
    const s = SCRIPT;
    if (t < s.stop) {
      const base = WALK.speed * (1 + WALK.variation * smoothNoise(this.seed, 1, t, 0.75));
      return base * (1 - minJerk((t - s.walkEase) / (s.stop - s.walkEase)));
    }
    if (t < s.go) return 0;
    const base = CLIMB.speed * (1 + CLIMB.variation * smoothNoise(this.seed, 2, t, 0.45));
    let k = minJerk((t - s.go) / (s.cruise - s.go));
    const p1 = s.pause + s.pauseRamp;
    const p2 = p1 + s.pauseHold;
    // Micro-pause: it stops, with a front leg in the air, and looks up.
    if (t > s.pause && t < p2 + s.pauseRamp) k *= t < p1 ? 1 - minJerk((t - s.pause) / s.pauseRamp) : t < p2 ? 0 : minJerk((t - p2) / s.pauseRamp);
    return base * k * (1 - minJerk((t - arrive) / s.arriveEase));
  }

  private cadence(t: number): number {
    const v = this.speed(t, this.arriveStart);
    const gait = t < SCRIPT.go ? WALK : CLIMB;
    // When braking, the steps get shorter (instead of stopping abruptly): the stride drops with the speed.
    const stride = gait.stride * (0.45 + 0.55 * Math.min(1, v / gait.speed));
    // The turn steps at an even pace: smooth ramps at the start and at the end.
    const u = (t - this.turnStart) / SCRIPT.turn;
    const ramp = 0.22;
    const turn = u <= 0 || u >= 1 ? 0 : minJerk(u / ramp) * (1 - minJerk((u - (1 - ramp)) / ramp));
    return v / stride + (TURN_CYCLES / ((1 - ramp) * SCRIPT.turn)) * turn;
  }

  /** Route point at distance s (horizontal): the ground curve and then the straight line along +z. */
  private routePoint(s: number): Vec3 {
    if (s <= this.routeLength) {
      const p = this.route.getPointAt(Math.max(0, s) / this.routeLength);
      if (s >= 0) return [p.x, 0, p.z];
      const tangent = this.route.getTangentAt(0);
      return [p.x + tangent.x * s, 0, p.z + tangent.z * s];
    }
    return [CX, 0, STOP_Z + (s - this.routeLength)];
  }

  private routeHeading(s: number): number {
    if (s >= this.routeLength) return this.turnFrom;
    const tangent = this.route.getTangentAt(Math.min(1, Math.max(0, s / this.routeLength)));
    return headingOf(tangent);
  }

  /** Body heading at t. */
  heading(t: number): number {
    const u = (t - this.turnStart) / SCRIPT.turn;
    return this.routeHeading(this.distance.at(t)) + this.turnDelta * minJerk(u);
  }

  /** Body center in plan (no height), with the turn about the pivot. */
  groundCenter(t: number): Vec3 {
    const p = this.routePoint(this.distance.at(t));
    const turn = this.turnDelta * minJerk((t - this.turnStart) / SCRIPT.turn);
    let out = p;
    if (turn !== 0) {
      const dx = p[0] - this.turnPivot[0];
      const dz = p[2] - this.turnPivot[2];
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      out = [this.turnPivot[0] + dx * c + dz * s, 0, this.turnPivot[2] - dx * s + dz * c];
    }
    const sit = this.sitAmount(t);
    if (sit > 0) {
      // When sitting, the shoulders end up over the front legs and the hip lowers backward.
      const f = forwardOf(this.heading(t));
      const back = HALF_BODY * (1 - Math.cos(this.sitPitch(t)));
      out = [out[0] - f[0] * back, 0, out[2] - f[2] * back];
    }
    return out;
  }

  /** Progress of sitting down (0–1). */
  sitAmount(t: number): number {
    return minJerk((t - this.sitStart) / SCRIPT.sit);
  }

  /**
   * The hip lowers a little later: first the hind legs fold (with the hip still high, so the leg can
   * switch sides without touching the floor) and then the rump comes down.
   */
  hipSitAmount(t: number): number {
    return minJerk((t - this.sitStart - SIT.hipDelay) / (SCRIPT.sit - SIT.hipDelay + 0.15));
  }

  /** Tilt of the half-seated body (from the plan, without the spine). */
  private sitPitch(t: number): number {
    const hip = SIT.stand.hip + (SIT.hip - SIT.stand.hip) * this.hipSitAmount(t);
    const shoulder = SIT.stand.shoulder + (SIT.shoulder - SIT.stand.shoulder) * this.sitAmount(t);
    return Math.asin((shoulder - hip) / (2 * HALF_BODY));
  }

  /** Tilt of the terrain under the body (for planning the footfalls). */
  private terrainPitch(t: number): number {
    const c = this.groundCenter(t);
    const f = forwardOf(this.heading(t));
    let pitch = 0;
    for (let i = 0; i < 3; i++) {
      const h = HALF_BODY * Math.cos(pitch);
      pitch = Math.atan2(terrainLine(c[2] + f[2] * h) - terrainLine(c[2] - f[2] * h), 2 * h);
    }
    return pitch;
  }

  // --- footfalls ----------------------------------------------------------------------------------

  /**
   * Footfalls in three regimes. On the entrance, the gait phase (lateral sequence) decides when each leg
   * lands, and the spot is where its girdle will be halfway through the stance. On the stairs the spots
   * are fixed (the tread assigned to each leg) and the leg lands when its girdle reaches `lead` behind
   * the tread: the order of the legs follows from the geometry. In the turn, the phase takes over again.
   */
  private planFeet(): Record<Leg, FootTrack> {
    const phaseStop = this.phase.at(SCRIPT.stop);
    // Landing phase: it keeps the rhythm of the climb. It is aligned with the arrival of the left front
    // girdle 1 cm from the edge of step 8, its last tread; the next step falls one cycle later.
    const lastLeftEdge = STAIRS.z0 + STAIRS.run * 7 + 0.01;
    const lastLeftLand = this.girdleArrival('LF', lastLeftEdge - SLOPE_SHIFT * slopeAt(lastLeftEdge), SCRIPT.go);
    this.landingPhase = this.phase.at(lastLeftLand) - OFFSETS.climb.LF;
    const out = {} as Record<Leg, FootTrack>;
    for (const leg of LEGS) {
      const kind = isFront(leg) ? 'fore' : 'hind';
      const flight = (segment: keyof typeof FLIGHT, i: number) => FLIGHT[segment][kind] * (1 + 0.07 * jitter(this.seed, leg, i, 1));
      const plan: { land: number; flight: number; hold: Foothold; hover?: number }[] = [];

      // 1. Walking entrance.
      // Each landing comes a little early or late (±5 % of the cycle): similar steps, not identical ones.
      const walk = phaseCrossings(this.phase, OFFSETS.walk[leg], this.phase.at(T0), phaseStop).map((t, i) => {
        const cycle = 1 / Math.max(0.5, this.cadence(t));
        return t + 0.05 * cycle * jitter(this.seed, leg, i, 8);
      });
      walk.forEach((land, i) => {
        const nextLand = walk[i + 1];
        const nextLift = nextLand !== undefined ? nextLand - flight('walk', i + 1) : land + 0.9;
        const natural = this.naturalFoothold(leg, land + Math.min(0.45, Math.max(0.05, (nextLift - land) / 2)), plan.length, land);
        const z = natural.z + 0.012 * jitter(this.seed, leg, plan.length, 6);
        plan.push({ land, flight: flight('walk', plan.length), hold: { point: [natural.x, surfaceHeight(natural.x, z), z], heading: natural.heading } });
      });

      // On stopping at the foot, the leg left behind takes a short step until it is under its girdle.
      const standing = STOP_Z + (isFront(leg) ? 1 : -1) * HALF_BODY + stanceOffset(leg);
      const last = plan[plan.length - 1];
      if (standing - last.hold.point[2] > 0.1) {
        const order = { LH: 0, LF: 1, RH: 2, RF: 3 }[leg];
        const land = Math.max(last.land + 0.35, SCRIPT.stop + 0.05 + 0.17 * order);
        const x = CX + legLateral(leg) * sideOf(this.turnFrom)[0];
        const z = standing - 0.02 + 0.01 * jitter(this.seed, leg, plan.length, 6);
        plan.push({ land, flight: flight('walk', plan.length), hold: { point: [x, 0, z], heading: this.turnFrom } });
      }

      // 2. Climb and arrival at the landing: fixed treads, landing when the girdle arrives.
      for (const slot of this.climbSlots(leg, plan[plan.length - 1].hold.point[2])) {
        const index = plan.length;
        // How far before the tread it lands: this centers the foothold under the joint.
        const shift = SLOPE_SHIFT * slopeAt(slot.z);
        const lead = (isFront(leg) ? 0.14 : 0.2) * (1 + 0.15 * jitter(this.seed, leg, index, 7)) + shift;
        const previous = plan[plan.length - 1];
        // The short preparatory step is taken standing still, before setting off: the hind leg nears the stairs.
        const nominal = slot.early ? SCRIPT.go - 0.12 : this.girdleArrival(leg, slot.z - lead, Math.max(previous.land + 0.2, SCRIPT.go - 0.6));
        if (!Number.isFinite(nominal)) break;
        const kindFlight = flight(slot.early ? 'walk' : 'climb', index);
        let land = nominal;
        let hover = 0;
        if (!slot.early) {
          // If the body brakes (the micro-pause), the leg left behind does not overstretch: it lifts on reaching
          // the reach limit and waits in the air, above the tread, until the body catches up with it.
          // The front leg that spans the micro-pause lifts earlier: stretched backward, with the shoulders
          // rising as the body brakes, it would end up out of reach.
          const braking = isFront(leg) && nominal > SCRIPT.pause && previous.land < SCRIPT.pause;
          const behind = (braking ? 0.13 : 0.2) - 0.09 * slopeAt(previous.hold.point[2]);
          const stretched = this.girdleArrival(leg, previous.hold.point[2] + behind + stanceOffset(leg), previous.land + 0.12);
          const lift = Math.min(nominal - kindFlight, stretched);
          if (lift < nominal - kindFlight - 0.01) {
            const reachable = this.girdleArrival(leg, slot.z - 0.2 - shift + stanceOffset(leg), previous.land + 0.12);
            const early = Math.max(lift + kindFlight, reachable);
            if (early - lift - kindFlight < 1.2) {
              land = early;
              hover = land - lift - kindFlight;
            }
          }
        }
        const x = CX + legLateral(leg) * sideOf(this.turnFrom)[0] + 0.008 * jitter(this.seed, leg, index, 5);
        const onTread = slot.z > STAIRS.z0 && slot.z < STAIRS.landing.z[0];
        const z = slot.z + (onTread ? 0.011 : 0.006) * jitter(this.seed, leg, index, 6);
        plan.push({ land, flight: kindFlight + hover, hover, hold: { point: [x, surfaceHeight(x, z), z], heading: this.turnFrom + 0.03 * jitter(this.seed, leg, index, 4) } });
      }

      // 3. Landing and stepping turn: the phase returns (with the order carried over from the climb) and so
      //    do the natural spots on the landing.
      const climbEnd = plan[plan.length - 1].land;
      const offset = (((this.landingPhase + OFFSETS.climb[leg]) % 1) + 1) % 1;
      const arrived = this.arriveStart + SCRIPT.arriveEase;
      const crossings = phaseCrossings(this.phase, offset, this.phase.at(climbEnd), this.phase.at(T1));
      // Arrival: the phase-driven steps until the body stops.
      const arrival = crossings.filter((t) => t - FLIGHT.turn[kind] > climbEnd + 0.15 && t < arrived - 0.05);
      arrival.forEach((land, i) => {
        const index = plan.length;
        const nextLand = arrival[i + 1];
        const nextLift = nextLand !== undefined ? nextLand - flight('climb', index + 1) : land + 0.9;
        const natural = this.naturalFoothold(leg, land + Math.min(0.35, Math.max(0.05, (nextLift - land) / 2)), index, land);
        const z = Math.max(natural.z, STAIRS.landing.z[0] + legRig(leg).halfLength + 0.03);
        plan.push({ land, flight: flight('climb', index), hold: { point: [natural.x, surfaceHeight(natural.x, z), z], heading: natural.heading } });
      });
      // When braking, the leg left behind steps before it overstretches, and on stopping, the one left far
      // from its standing spot takes a short step to it.
      const stand = FINAL_Z + (isFront(leg) ? 1 : -1) * HALF_BODY + stanceOffset(leg);
      const order = { LH: 0, LF: 1, RH: 2, RF: 3 }[leg];
      for (let guard = 0; guard < 4; guard++) {
        const before = plan[plan.length - 1];
        const hold = before.hold.point[2];
        if (Math.abs(stand - hold) <= 0.07) break;
        const settleFlight = flight('walk', plan.length);
        const stretched = this.girdleArrival(leg, hold + 0.13 + stanceOffset(leg), before.land + 0.15);
        const lift = Math.max(before.land + 0.15, Math.min(stretched, arrived - 0.4 + 0.13 * order));
        const land = lift + settleFlight;
        // No further forward than its reach when it lands.
        const c = this.groundCenter(land);
        const reach = c[2] + (isFront(leg) ? 1 : -1) * HALF_BODY + 0.15;
        const z = Math.min(stand, reach);
        const x = CX + legLateral(leg) * sideOf(this.turnFrom)[0];
        plan.push({ land, flight: settleFlight, hold: { point: [x, STAIRS.landing.y, z], heading: this.turnFrom } });
      }
      // Stepping turn.
      const settled = plan[plan.length - 1].land;
      const landing = crossings.filter((t) => t > this.turnStart && t - FLIGHT.turn[kind] > settled + 0.12);
      landing.forEach((land, i) => {
        const index = plan.length;
        const nextLand = landing[i + 1];
        const nextLift = nextLand !== undefined ? nextLand - flight('turn', index + 1) : land + 0.9;
        const natural = this.naturalFoothold(leg, land + Math.min(0.35, Math.max(0.05, (nextLift - land) / 2)), index, land);
        const z = Math.max(natural.z, STAIRS.landing.z[0] + legRig(leg).halfLength + 0.03);
        plan.push({ land, flight: flight('turn', index), hold: { point: [natural.x, surfaceHeight(natural.x, z), z], heading: natural.heading } });
      });

      // 4. It sits down: each leg takes a last short step to its spot (the hind legs, folding).
      const sitSpot = this.sitFoothold(leg);
      const lastHold = plan[plan.length - 1].hold.point;
      if (!isFront(leg) || Math.hypot(sitSpot.point[0] - lastHold[0], sitSpot.point[2] - lastHold[2]) > 0.015) {
        // First the hind legs (with the hip high), then the front legs settle.
        const when = { LH: 0.0, RH: 0.2, LF: 0.5, RF: 0.72 }[leg] * SCRIPT.sit;
        const land = Math.max(plan[plan.length - 1].land + (isFront(leg) ? 0.3 : 0.44), this.sitStart + when + (isFront(leg) ? 0.26 : 0.4));
        plan.push({ land, flight: isFront(leg) ? 0.26 : 0.4, hold: sitSpot });
      }

      const steps: Step[] = [];
      for (let i = 1; i < plan.length; i++) {
        // A minimum stance between steps: if there is not enough time, the flight gets shorter.
        const lift = Math.max(plan[i].land - plan[i].flight, plan[i - 1].land + 0.1);
        const hover = Math.max(0, (plan[i].hover ?? 0) - (lift - (plan[i].land - plan[i].flight)));
        const step: Step = { leg, index: i, lift, land: plan[i].land, from: plan[i - 1].hold, to: plan[i].hold, clearance: 0, hover };
        const minimum = (isFront(leg) ? 0.045 : 0.035) * (1 + 0.15 * jitter(this.seed, leg, i, 3));
        if (!isFront(leg) && plan[i].land > this.sitStart && i === plan.length - 1) {
          // The step in which the hind leg folds to sit goes high: the leg switches sides in the air.
          step.clearance = 0.08;
        } else if (Math.abs(step.to.point[1] - step.from.point[1]) > 0.01) {
          // Stair steps: the paw follows the stairs' profile with its margin, without rising more than needed.
          step.path = stepPath(step, surfaceHeight, legRig(leg).halfLength + 0.008, isFront(leg) ? 0.02 : 0.014, minimum * 0.5);
        } else {
          step.clearance = clearanceFor(step, surfaceHeight, minimum, legRig(leg).halfLength + 0.006, 0.016);
        }
        steps.push(step);
      }
      out[leg] = new FootTrack(leg, plan[0].hold, steps, ROLL[kind]);
    }
    enforceSupport(out);
    return out;
  }

  /**
   * Climb treads for a leg standing at `from` (z): those of its parity (left legs on the even steps, right
   * legs on the odd ones: each leg on every other tread), the front paw forward on the tread and the hind
   * paw 3.5 cm behind, where the front one stepped. If the first step is far away, a short step on the
   * ground comes first. At the top, steps on the landing until it is under its final girdle position.
   */
  private climbSlots(leg: Leg, from: number): { z: number; early: boolean }[] {
    const { z0, run } = STAIRS;
    const spot = isFront(leg) ? SPOT.fore : SPOT.hind;
    const parity = isLeft(leg) ? 0 : 1;
    const out: { z: number; early: boolean }[] = [];
    const first = z0 + run * (parity === 0 ? 1 : 0) + spot;
    // If the first step is far away, a preparatory step to a little ahead of its girdle.
    if (first - from > 0.6) out.push({ z: STOP_Z + (isFront(leg) ? 1 : -1) * HALF_BODY + 0.15, early: true });
    for (let k = 2 - parity; k <= 9; k += 2) out.push({ z: z0 + run * (k - 1) + spot, early: false });
    return out;
  }

  /** First time ≥ `from` at which the point under the girdle of `leg` (its standing paw) reaches z. */
  private girdleArrival(leg: Leg, z: number, from: number): number {
    const step = 1 / 240;
    for (let t = from; t < this.turnStart; t += step) {
      const c = this.groundCenter(t);
      const along = (isFront(leg) ? 1 : -1) * HALF_BODY * Math.cos(this.terrainPitch(t)) + stanceOffset(leg);
      if (c[2] + along >= z) return t;
    }
    return Infinity;
  }

  /** Natural foothold of `leg` centered on `mid`: under its girdle, with the step's variation. */
  private naturalFoothold(leg: Leg, mid: number, index: number, land: number): { x: number; z: number; heading: number } {
    const c = this.groundCenter(mid);
    const heading = this.heading(mid);
    const f = forwardOf(heading);
    const side = sideOf(heading);
    const pitch = this.terrainPitch(mid);
    // At a walk the foothold is centered under the joint (the hind one, 3.5 cm ahead of its standing spot).
    const along = (isFront(leg) ? 1 : -1) * HALF_BODY * Math.cos(pitch) + stanceOffset(leg) + (isFront(leg) ? 0 : 0.035);
    let x = c[0] + f[0] * along + side[0] * legLateral(leg) + 0.008 * jitter(this.seed, leg, index, 5);
    let z = c[2] + f[2] * along + side[2] * legLateral(leg);
    // Never further forward than the leg's reach when landing (when braking, the stance center moves away).
    const c0 = this.groundCenter(land);
    const f0 = forwardOf(this.heading(land));
    const joint = (isFront(leg) ? 1 : -1) * HALF_BODY * Math.cos(this.terrainPitch(land));
    const ahead = (x - c0[0]) * f0[0] + (z - c0[2]) * f0[2] - joint;
    if (ahead > 0.16) {
      x -= f0[0] * (ahead - 0.16);
      z -= f0[2] * (ahead - 0.16);
    }
    x = Math.min(STAIRS.x[1] - 0.05, x);
    return { x, z, heading: heading + 0.03 * jitter(this.seed, leg, index, 4) };
  }

  /** Seated paw placement: front legs under the shoulders, hind legs ahead of the hip and spread. */
  private sitFoothold(leg: Leg): Foothold {
    const t = this.sitStart + SCRIPT.sit;
    const heading = this.heading(t);
    const f = forwardOf(heading);
    const side = sideOf(heading);
    const c = this.groundCenter(t);
    const pitch = this.sitPitch(t);
    const along = isFront(leg) ? HALF_BODY * Math.cos(pitch) + stanceOffset(leg) : -HALF_BODY * Math.cos(pitch) + SIT.hindAhead;
    const lateral = legLateral(leg) * (isFront(leg) ? 1 : SIT.hindWide);
    const x = c[0] + f[0] * along + side[0] * lateral;
    const z = c[2] + f[2] * along + side[2] * lateral;
    return { point: [x, surfaceHeight(x, z), z], heading: heading + (isFront(leg) ? 0 : 0.18 * (isLeft(leg) ? 1 : -1)) };
  }

  /** Fold of the hind legs when sitting: the middle joint moves forward during the last flight. */
  private planFold(): Record<Leg, SampledCurve> {
    const out = {} as Record<Leg, SampledCurve>;
    for (const leg of LEGS) {
      const last = this.tracks[leg].steps[this.tracks[leg].steps.length - 1];
      const folds = !isFront(leg) && last && last.lift >= this.sitStart;
      // The fold switches at the start of the flight, with the hip still high and the leg almost straight:
      // the middle joint crosses sides without passing through the hip → ankle line.
      out[leg] = sampleCurve((t) => (folds ? minJerk(((t - last.lift) / (last.land - last.lift) - 0.05) / 0.85) : 0), T0, T1, 120);
    }
    return out;
  }

  // --- body from the legs -------------------------------------------------------------------------

  foot(leg: Leg, t: number): FootState {
    const sample = this.tracks[leg].at(t);
    const rig = legRig(leg);
    const c = Math.cos(sample.heading);
    const s = Math.sin(sample.heading);
    // Paw → toes: the fixed rest offset, rotated with the leg's heading (1 mm of air).
    const dx = rig.toe[0] - rig.contact[0];
    const dy = rig.toe[1] - rig.contact[1] + 0.001;
    const toe: Vec3 = [sample.point[0] + dx * c, sample.point[1] + dy, sample.point[2] - dx * s];
    // Toes → ankle, rotated with the heel up (a −roll rotation about the lateral axis).
    const ax = rig.ankle[0] - rig.toe[0];
    const ay = rig.ankle[1] - rig.toe[1];
    const cr = Math.cos(sample.roll);
    const sr = Math.sin(sample.roll);
    const lx = ax * cr + ay * sr;
    const ly = -ax * sr + ay * cr;
    const ankle: Vec3 = [toe[0] + lx * c, toe[1] + ly, toe[2] - lx * s];
    return { ...sample, toe, ankle, fold: this.foldCurves[leg].at(t) };
  }

  /** Hip and shoulder heights: the desired ones, clamped by the legs' reach (two passes). */
  private planHeights(): { hip: SampledCurve; shoulder: SampledCurve } {
    const n = Math.round((T1 - T0) * 240) + 1;
    const times = Array.from({ length: n }, (_, i) => T0 + i / 240);
    const feet = times.map((t) => Object.fromEntries(LEGS.map((leg) => [leg, this.foot(leg, t)])) as Record<Leg, FootState>);
    // Reference: the terrain line under each girdle (through the centers of the treads). The actual paws
    // correct it through the reach; a leg in the air does not lift the body.
    const base = (sign: number, t: number) => {
      const c = this.groundCenter(t);
      const f = forwardOf(this.heading(t));
      const along = sign * HALF_BODY * Math.cos(this.terrainPitch(t));
      return terrainLine(c[2] + f[2] * along);
    };
    const hindBase = sampleCurve((t) => base(-1, t), T0, T1);
    const foreBase = sampleCurve((t) => base(1, t), T0, T1);
    // Ride height above the paws: lower on the slope, where the stance is longer.
    const ride = (base: number, t: number) => base - 0.03 * Math.min(1, Math.max(0, this.terrainPitch(t) / 0.54));

    let pitch = Float64Array.from(times, (t) => this.terrainPitch(t));
    let hip = new SampledCurve(new Float64Array(n), T0);
    let shoulder = new SampledCurve(new Float64Array(n), T0);
    for (let pass = 0; pass < 2; pass++) {
      const hipReach = new Float64Array(n);
      const hipFloors = new Float64Array(n);
      const shoulderFloors = new Float64Array(n);
      const shoulderReach = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = times[i];
        const c = this.groundCenter(t);
        const heading = this.heading(t);
        const f = forwardOf(heading);
        const side = sideOf(heading);
        const reach = (legs: [Leg, Leg], sign: number) => {
          let limit = Infinity;
          for (const leg of legs) {
            const a = feet[i][leg].ankle;
            const along = sign * HALF_BODY * Math.cos(pitch[i]);
            let jx = c[0] + f[0] * along + side[0] * legLateral(leg);
            let jz = c[2] + f[2] * along + side[2] * legLateral(leg);
            let lift = 0;
            if (isFront(leg)) {
              const slide = this.scapulaSlide((a[0] - jx) * f[0] + (a[2] - jz) * f[2]);
              jx += f[0] * slide * Math.cos(pitch[i]);
              jz += f[2] * slide * Math.cos(pitch[i]);
              lift = slide * Math.sin(pitch[i]);
            }
            const d = Math.hypot(a[0] - jx, a[2] - jz);
            const r = isFront(leg) ? REACH.fore : REACH.hind;
            // Smoothed square root: no infinite slope when the foot sits right at the limit of the reach.
            const e = 0.03;
            let h = a[1] + Math.sqrt(Math.max(0, r * r - d * d) + e * e) - e - lift;
            // Only planted legs limit it, with a weight that ramps in and out over 0.1 s around the stance.
            h += 0.15 * (1 - this.stanceWeight(leg, t));
            limit = limit === Infinity ? h : softMin(limit, h, 0.008);
          }
          return limit;
        };
        hipReach[i] = reach(['LH', 'RH'], -1);
        shoulderReach[i] = reach(['LF', 'RF'], 1);
        // And a floor: the hind leg passing underneath while climbing a step cannot fold completely
        // (the hip rises with it, as in a cat lifting its leg).
        let hipFloor = -Infinity;
        for (const leg of ['LH', 'RH'] as const) {
          const a = feet[i][leg].ankle;
          const jx = c[0] - f[0] * HALF_BODY * Math.cos(pitch[i]) + side[0] * legLateral(leg);
          const jz = c[2] - f[2] * HALF_BODY * Math.cos(pitch[i]) + side[2] * legLateral(leg);
          const d = Math.hypot(a[0] - jx, a[2] - jz);
          const e = 0.03;
          hipFloor = Math.max(hipFloor, a[1] + Math.sqrt(Math.max(0, FOLD_MIN * FOLD_MIN - d * d) + e * e) - e);
        }
        hipFloors[i] = hipFloor;
        // The same in front: the wrist rising in front does not pass right against the shoulder.
        let shoulderFloor = -Infinity;
        for (const leg of ['LF', 'RF'] as const) {
          const a = feet[i][leg].ankle;
          const jx = c[0] + f[0] * HALF_BODY * Math.cos(pitch[i]) + side[0] * legLateral(leg);
          const jz = c[2] + f[2] * HALF_BODY * Math.cos(pitch[i]) + side[2] * legLateral(leg);
          const d = Math.hypot(a[0] - jx, a[2] - jz);
          const e = 0.03;
          shoulderFloor = Math.max(shoulderFloor, a[1] + Math.sqrt(Math.max(0, FOLD_FORE * FOLD_FORE - d * d) + e * e) - e);
          // The elbow does not drop below the wrist: with the paw planted higher up, the shoulder blade rises
          // first (up to SCAPULA.up) and the body makes up the rest.
          const w = this.stanceWeight(leg, t);
          shoulderFloor = Math.max(shoulderFloor, a[1] + (ELBOW_CLEAR - SCAPULA.up) * w - 0.3 * (1 - w));
        }
        shoulderFloors[i] = shoulderFloor;
      }
      // The desired height clamped by the reach and with its floors, smoothed with no lag. At the back the
      // floor rules (the hind leg passing underneath does not fold completely); at the front the reach rules,
      // as a smooth lower envelope (the planted foot never slides and the shoulder does not jerk).
      const curve = (values: Float64Array) => new SampledCurve(values, T0);
      const hipRaw = new Float64Array(n);
      const shoulderRaw = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = times[i];
        const slope = this.terrainPitch(t);
        const rise = (angle: number) => 2 * HALF_BODY * Math.sin(Math.max(-1.2, Math.min(1.2, angle)));
        let h = softMin(hindBase.at(t) + ride(0.264, t), hipReach[i], 0.01);
        let sh = softMin(foreBase.at(t) + ride(0.262, t), shoulderReach[i], 0.01);
        // The body is a rigid segment: if one girdle drops, the other cannot stay higher than the terrain
        // slope allows (±4°).
        sh = softMin(sh, h + rise(slope + 0.07), 0.008);
        h = softMin(h, sh - rise(slope - 0.07), 0.008);
        hipRaw[i] = -softMin(-h, -hipFloors[i], 0.008);
        shoulderRaw[i] = softMin(-softMin(-sh, -shoulderFloors[i], 0.008), shoulderReach[i], 0.006);
      }
      const hs = smoothCurve(curve(hipRaw), 0.055).values;
      const ss = smoothCurve(curve(shoulderRaw), 0.055).values;
      const hipFloor = smoothCurve(curve(hipFloors), 0.045).values;
      const shoulderFloor = smoothCurve(curve(shoulderFloors), 0.08).values;
      const shoulderLimit = lowerEnvelope(curve(shoulderReach), 0.07, 0.022).values;
      const hipLimit = lowerEnvelope(curve(hipReach), 0.07, 0.022).values;
      const floor = STAIRS.landing.y;
      const hipValues = new Float64Array(n);
      const shoulderValues = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = times[i];
        const sh = softMin(-softMin(-ss[i], -shoulderFloor[i], 0.01), shoulderLimit[i] + 0.002, 0.008);
        // Trunk without seesawing: if it rears up, the shoulders stay (the rising front leg needs room) and
        // the hip rises until only `PITCH_KEEP` of the deviation from the terrain slope remains. The
        // transition is smooth (no kink in velocity) and the hip respects its reach and its floor.
        const slope = this.terrainPitch(t);
        const tilt = Math.asin(Math.max(-0.95, Math.min(0.95, (sh - hs[i]) / (2 * HALF_BODY))));
        const x = tilt - slope;
        const k = 0.03;
        const calm = slope + x - (1 - PITCH_KEEP) * k * Math.log1p(Math.exp(x / k));
        const h = -softMin(-softMin(sh - 2 * HALF_BODY * Math.sin(calm), hipLimit[i] + 0.003, 0.008), -hipFloor[i], 0.01);
        // Seated: heights from the script (the folded hind legs set no reach limit).
        const kh = this.hipSitAmount(t);
        const ks = this.sitAmount(t);
        hipValues[i] = h * (1 - kh) + (floor + SIT.hip) * kh;
        shoulderValues[i] = sh * (1 - ks) + (floor + SIT.shoulder) * ks;
      }
      hip = curve(hipValues);
      shoulder = curve(shoulderValues);
      pitch = Float64Array.from(times, (_, i) => Math.asin(Math.max(-0.95, Math.min(0.95, (shoulder.values[i] - hip.values[i]) / (2 * HALF_BODY)))));
    }
    return { hip, shoulder };
  }

  /** How much the shoulder blade rises so the elbow stays above the planted wrist. */
  private scapulaLift(ankleY: number, shoulderY: number, weight: number): number {
    const need = ankleY + ELBOW_CLEAR - shoulderY;
    return SCAPULA.up * Math.tanh(Math.max(0, need) / SCAPULA.up) * weight;
  }

  /** Rise of the shoulder blade of front leg `leg` (critical spring). */
  private planScapulaLift(leg: 'LF' | 'RF'): SampledCurve {
    return springCurve((t) => this.scapulaLift(this.foot(leg, t).ankle[1], this.shoulderHeight.at(t), this.stanceWeight(leg, t)), 0.035, T0, T1);
  }

  /** Shoulder blade of front leg `leg`: a critical spring on the slide toward its foot. */
  private planScapula(leg: 'LF' | 'RF'): SampledCurve {
    return springCurve((t) => {
      const c = this.groundCenter(t);
      const f = forwardOf(this.heading(t));
      const pitch = Math.asin(Math.max(-1, Math.min(1, (this.shoulderHeight.at(t) - this.hipHeight.at(t)) / (2 * HALF_BODY))));
      const a = this.foot(leg, t).ankle;
      const jx = c[0] + f[0] * HALF_BODY * Math.cos(pitch);
      const jz = c[2] + f[2] * HALF_BODY * Math.cos(pitch);
      return this.scapulaSlide((a[0] - jx) * f[0] + (a[2] - jz) * f[2]);
    }, 0.035, T0, T1);
  }

  /** Flicks of the tail tip at rest: two short bursts. */
  private tailFlick(t: number): number {
    const start = this.sitStart + SCRIPT.sit;
    const burst = (a: number, b: number) => minJerk((t - a) / 0.25) * (1 - minJerk((t - b) / 0.3));
    const envelope = Math.max(burst(start + 0.2, start + 0.9), burst(start + 1.35, start + 1.9));
    return 0.38 * Math.sin(2 * Math.PI * 1.35 * (t - start)) * envelope;
  }

  /**
   * Weight with which a leg limits the body height: 1 while planted and at the ends of the flight, 0 in
   * the middle of the flight. It fades out over the first 0.08 s of the flight and back in over the last
   * 0.16 s, so the foot is reachable throughout the stance and the body does not jump at lift-off.
   */
  private stanceWeight(leg: Leg, t: number): number {
    for (const step of this.tracks[leg].steps) {
      if (t >= step.lift && t < step.land) return Math.max(1 - minJerk((t - step.lift) / 0.08), minJerk((t - (step.land - 0.16)) / 0.16));
    }
    return 1;
  }

  /** Slide of the shoulder blade toward the foot (softly saturated). */
  private scapulaSlide(along: number): number {
    return SCAPULA.max * Math.tanh((SCAPULA.gain * along) / SCAPULA.max);
  }

  /** Lateral sway of pelvis and shoulders with the gait. */
  private planSway() {
    const walking = (t: number) => Math.min(1, this.cadence(t) / 1.1);
    const stance = (leg: Leg) => (t: number) => (this.tracks[leg].at(t).planted ? 1 : 0);
    const lh = stance('LH');
    const rh = stance('RH');
    const lf = stance('LF');
    const rf = stance('RF');
    const smooth = (signal: (t: number) => number) => smoothCurve(sampleCurve(signal, T0, T1), 0.07);
    return {
      // The pelvis drops toward the swinging hind leg's side; the chest, toward the swinging front leg's side.
      pelvisRoll: smooth((t) => 0.05 * (lh(t) - rh(t)) * walking(t)),
      chestRoll: smooth((t) => 0.03 * (lf(t) - rf(t)) * walking(t)),
      pelvisYaw: smooth((t) => 0.045 * (rh(t) - lh(t)) * walking(t)),
      chestYaw: smooth((t) => -0.035 * (rf(t) - lf(t)) * walking(t)),
      // The body shifts toward the supporting side.
      lateral: smooth((t) => 0.006 * (lh(t) + lf(t) - rh(t) - rf(t)) * 0.5 * walking(t)),
    };
  }

  // --- gaze and tail ------------------------------------------------------------------------------

  /** Point the cat looks at in each moment of the script. */
  private lookTarget(t: number): Vec3 {
    const s = SCRIPT;
    const c = this.groundCenter(t);
    const f = forwardOf(this.heading(t));
    const ahead = (d: number, y: number): Vec3 => [c[0] + f[0] * d, terrainLine(c[2] + f[2] * d) + y, c[2] + f[2] * d];
    const landing: Vec3 = [CX, STAIRS.landing.y + 0.25, STAIRS.landing.z[0] + 0.55];
    const door: Vec3 = [CX - 0.1, STAIRS.landing.y + 0.75, 5.95];
    const camera: Vec3 = [-0.25, 1.62, 1.85];
    const mix = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    // While walking it looks at the ground a meter ahead; when braking it raises its gaze to the landing.
    let target = ahead(0.95, 0.02);
    target = mix(target, landing, minJerk((t - (s.stop - 0.45)) / 0.6) * (1 - minJerk((t - (s.go - 0.1)) / 0.45)));
    // While climbing it looks one or two steps ahead.
    if (t > s.go - 0.1) target = mix(target, ahead(0.62, 0.05), 0.6);
    // Micro-pause: it looks up at the door and the light.
    const pause = minJerk((t - (s.pause + 0.05)) / 0.35) * (1 - minJerk((t - (s.pause + s.pauseRamp * 2 + s.pauseHold - 0.2)) / 0.4));
    target = mix(target, door, pause);
    // On arrival it looks at the landing and, before turning, at the camera: the head leads the turn.
    target = mix(target, camera, minJerk((t - (this.turnStart - 0.35)) / 0.7));
    return target;
  }

  private planLook(): { yaw: SampledCurve; pitch: SampledCurve } {
    const yawRaw = (t: number) => {
      const c = this.groundCenter(t);
      const target = this.lookTarget(t);
      const heading = this.heading(t);
      const f = forwardOf(heading);
      const head: Vec3 = [c[0] + f[0] * 0.26, 0, c[2] + f[2] * 0.26];
      const yaw = headingOf(new Vector3(target[0] - head[0], 0, target[2] - head[2]));
      return Math.max(-1.1, Math.min(1.1, unwrapTo(yaw, heading) - heading));
    };
    const pitchRaw = (t: number) => {
      const c = this.groundCenter(t);
      const f = forwardOf(this.heading(t));
      const target = this.lookTarget(t);
      const headY = (this.hipHeight.at(t) + this.shoulderHeight.at(t)) / 2 + 0.2;
      const head: Vec3 = [c[0] + f[0] * 0.26, headY, c[2] + f[2] * 0.26];
      const pitch = Math.atan2(target[1] - head[1], Math.hypot(target[0] - head[0], target[2] - head[2]));
      return Math.max(-0.75, Math.min(0.85, pitch));
    };
    return { yaw: springCurve(yawRaw, 0.13, T0, T1), pitch: springCurve(pitchRaw, 0.11, T0, T1) };
  }

  /** Tail: base shape per segment, plus the delayed reaction to the pelvis's lateral acceleration. */
  private planTail(): { z: SampledCurve[]; x: SampledCurve[] } {
    const s = SCRIPT;
    const climbing = (t: number) => minJerk((t - s.go) / 0.6) * (1 - minJerk((t - this.arriveStart) / 0.8));
    // Lateral acceleration of the body (m/s²), from the center in plan.
    const lateral = sampleCurve((t) => {
      const h = 1 / 60;
      const a = this.groundCenter(t - h);
      const b = this.groundCenter(t);
      const c = this.groundCenter(t + h);
      const side = sideOf(this.heading(t));
      const ax = (a[0] - 2 * b[0] + c[0]) / (h * h);
      const az = (a[2] - 2 * b[2] + c[2]) / (h * h);
      return ax * side[0] + az * side[2] + this.sway.lateral.slope(t) * 0;
    }, T0, T1, 60);
    const yawRate = sampleCurve((t) => (this.heading(t + 0.01) - this.heading(t - 0.01)) / 0.02, T0, T1, 60);
    const zGoals = [0, 1, 2, 3, 4].map((k) => (t: number) => {
      const walk = [-0.32, 0.12, 0.2, 0.18, 0.1][k];
      const climb = [0.05, -0.12, -0.08, 0.05, 0.08][k];
      return walk + (climb - walk) * climbing(t);
    });
    const xGoals = [0, 1, 2, 3, 4].map((k) => (t: number) => {
      const swish = 0.1 * (0.5 + 0.2 * k) * Math.sin(2 * Math.PI * 0.42 * t - k * 0.8);
      return swish - (0.03 + 0.012 * k) * lateral.at(t) - 0.05 * (1 + 0.4 * k) * yawRate.at(t);
    });
    const lives = [0.07, 0.09, 0.11, 0.13, 0.15];
    return { z: springChain(zGoals, lives, T0, T1, 0.2), x: springChain(xGoals, lives, T0, T1, 0.35) };
  }

  // --- state --------------------------------------------------------------------------------------

  at(t: number): StairsState {
    const heading = this.heading(t);
    const c = this.groundCenter(t);
    const f = forwardOf(heading);
    const side = sideOf(heading);
    const lateral = this.sway.lateral.at(t);
    const hipY = this.hipHeight.at(t);
    const shoulderY = this.shoulderHeight.at(t);
    const pitch = Math.asin(Math.max(-1, Math.min(1, (shoulderY - hipY) / (2 * HALF_BODY))));
    const sit = this.sitAmount(t);
    // At rest: the chest breathes and the body settles.
    const rest = minJerk((t - (this.sitStart + SCRIPT.sit + 0.05)) / 0.5);
    const breath = Math.sin(2 * Math.PI * 0.42 * (t - this.sitStart)) * rest;
    const flex = SIT.flex * sit + this.flexWave.at(t);
    const hipWorld: Vec3 = [
      c[0] - f[0] * HALF_BODY * Math.cos(pitch) + side[0] * lateral,
      hipY,
      c[2] - f[2] * HALF_BODY * Math.cos(pitch) + side[2] * lateral,
    ];
    // Subject pose that places the hip (midpoint) at `hipWorld` with the spine flexed by `flex`.
    const hipLocal = rotateAbout(RIG.hip, RIG.pivot, flex / 2);
    const shoulderLocal = rotateAbout(RIG.shoulder, RIG.pivot, -flex / 2);
    const bodyAngle = Math.atan2(shoulderLocal[1] - hipLocal[1], shoulderLocal[0] - hipLocal[0]);
    const subjectPitch = pitch - bodyAngle;
    const cp = Math.cos(subjectPitch);
    const sp = Math.sin(subjectPitch);
    const lx = hipLocal[0] * cp - hipLocal[1] * sp;
    const ly = hipLocal[0] * sp + hipLocal[1] * cp;
    const anchor = new Vector3(hipWorld[0] - f[0] * lx, hipWorld[1] - ly, hipWorld[2] - f[2] * lx);

    const feet = Object.fromEntries(LEGS.map((leg) => [leg, this.foot(leg, t)])) as Record<Leg, FootState>;

    const pose: Pose = {};
    const tailJoints = ['Tail01', 'Tail02', 'Tail03', 'Tail04', 'Tail05'] as const;
    tailJoints.forEach((joint, k) => (pose[joint] = { z: this.tail.z[k].at(t), x: this.tail.x[k].at(t) }));

    return {
      t,
      anchor,
      heading,
      pitch: subjectPitch,
      pose,
      support: null,
      feet,
      spine: {
        chest: [-flex / 2 + 0.02 * breath, this.sway.chestYaw.at(t), this.sway.chestRoll.at(t)],
        pelvis: [flex / 2 - 0.006 * breath, this.sway.pelvisYaw.at(t), this.sway.pelvisRoll.at(t)],
      },
      scapula: { LF: this.scapula.LF.at(t), RF: this.scapula.RF.at(t) },
      scapulaUp: { LF: this.scapulaUp.LF.at(t), RF: this.scapulaUp.RF.at(t) },
      look: { yaw: heading + this.lookYaw.at(t), pitch: this.lookPitch.at(t) - 0.12, roll: this.lookRoll.at(t), neckShare: 0.55 },
      tailWrap: minJerk((t - this.sitStart - 0.15) / 1.9),
      tailSide: 1,
      tailFlick: this.tailFlick(t),
      center: [c[0], (hipY + shoulderY) / 2, c[2]],
    };
  }

  /** Point of interest for the source camera: the cat's body. */
  focus(t: number): Vector3 {
    const c = this.groundCenter(t);
    const y = (this.hipHeight.at(t) + this.shoulderHeight.at(t)) / 2;
    return new Vector3(c[0], y - 0.06, c[2]);
  }
}

/**
 * At a walk there are always at least two legs planted: if lifting a leg would leave only one planted,
 * the lift-off waits until the next one lands (the flight gets shorter, never below 0.16 s).
 */
function enforceSupport(tracks: Record<Leg, FootTrack>): void {
  const all = LEGS.flatMap((leg) => tracks[leg].steps);
  const inAir = (leg: Leg, t: number) => tracks[leg].steps.some((s) => t >= s.lift && t < s.land);
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const step of all.slice().sort((a, b) => a.lift - b.lift)) {
      const t = step.lift + 1e-4;
      const others = LEGS.filter((leg) => leg !== step.leg && !inAir(leg, t));
      if (others.length >= 2) continue;
      const landing = all.filter((s) => s.leg !== step.leg && s.land > step.lift && s.lift < step.lift).sort((a, b) => a.land - b.land)[0];
      if (!landing) continue;
      // The difference is shared: the other leg lands a little earlier (its flight shortens by up to 12 %) and
      // this one lifts a little later; that way no flight gets compressed too much.
      const needed = landing.land + 0.012 - step.lift;
      const other = landing.land - landing.lift - (landing.hover ?? 0);
      const earlier = Math.min(needed / 2, 0.12 * other, Math.max(0, landing.land - landing.lift - 0.2));
      const lift = step.lift + needed - earlier;
      if (lift > step.land - 0.16) continue;
      landing.land -= earlier;
      step.hover = Math.max(0, (step.hover ?? 0) - (lift - step.lift));
      step.lift = lift;
      changed = true;
    }
    if (!changed) break;
  }
}

/** Rotates point p (2D) about o. */
function rotateAbout(p: [number, number], o: [number, number], angle: number): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = p[0] - o[0];
  const dy = p[1] - o[1];
  return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c];
}
