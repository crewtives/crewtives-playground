import { CatmullRomCurve3, Vector3 } from 'three';
import { smoothstep } from '../../scenes/math';

/**
 * Procedural animation of the cat (the model ships without clips). Everything is a pure function of
 * time: the bake is deterministic and any frame can be evaluated on its own.
 *
 * Rig conventions (measured on the model): the cat faces the model's +X; the leg, neck and tail bones
 * rotate about their local Z, which is the sagittal plane. On the legs, +Z moves the foot forward; on
 * the neck and head, +Z raises the nose; on Root, +Z tilts the body nose-up; on Tail01, −Z raises
 * the tail and X swings it sideways. "Second" are the front legs.
 */

export type Joint =
  | 'Root'
  | 'Neck'
  | 'Head'
  | 'Tail01'
  | 'Tail02'
  | 'Tail03'
  | 'Tail04'
  | 'Tail05'
  | 'UpperLeftLeg'
  | 'LowerLeftLeg'
  | 'LeftAnkle'
  | 'LeftFoot'
  | 'UpperRightLeg'
  | 'LowerRightLeg'
  | 'RightAnkle'
  | 'RightFoot'
  | 'UpperLeftSecondLeg'
  | 'LowerLeftSecondLeg'
  | 'LeftSecondAnkle'
  | 'LeftSecondFoot'
  | 'UpperRightSecondLeg'
  | 'LowerRightSecondLeg'
  | 'RightSecondAnkle'
  | 'RightSecondFoot';

/** Rotations relative to the rest pose (rad), about the local Z (sagittal) and X (lateral) axes. */
export type Pose = Partial<Record<Joint, { z?: number; x?: number }>>;

export type Leg = 'LF' | 'RF' | 'LH' | 'RH';
const LEG_BONES: Record<Leg, [Joint, Joint, Joint, Joint]> = {
  LF: ['UpperLeftSecondLeg', 'LowerLeftSecondLeg', 'LeftSecondAnkle', 'LeftSecondFoot'],
  RF: ['UpperRightSecondLeg', 'LowerRightSecondLeg', 'RightSecondAnkle', 'RightSecondFoot'],
  LH: ['UpperLeftLeg', 'LowerLeftLeg', 'LeftAnkle', 'LeftFoot'],
  RH: ['UpperRightLeg', 'LowerRightLeg', 'RightAnkle', 'RightFoot'],
};
export const FRONT: Leg[] = ['LF', 'RF'];
export const HIND: Leg[] = ['LH', 'RH'];

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  const joints = new Set([...Object.keys(a), ...Object.keys(b)] as Joint[]);
  for (const joint of joints) {
    const pa = a[joint] ?? {};
    const pb = b[joint] ?? {};
    out[joint] = { z: (pa.z ?? 0) + ((pb.z ?? 0) - (pa.z ?? 0)) * t, x: (pa.x ?? 0) + ((pb.x ?? 0) - (pa.x ?? 0)) * t };
  }
  return out;
}

export function addPose(a: Pose, b: Pose): Pose {
  const out: Pose = { ...a };
  for (const [joint, value] of Object.entries(b) as [Joint, { z?: number; x?: number }][]) {
    const base = out[joint] ?? {};
    out[joint] = { z: (base.z ?? 0) + (value.z ?? 0), x: (base.x ?? 0) + (value.x ?? 0) };
  }
  return out;
}

/** Pose of a leg: [shoulder/hip, elbow/knee, wrist/hock, foot]. */
export function leg(pose: Pose, which: Leg[], angles: [number, number, number, number]) {
  for (const l of which) LEG_BONES[l].forEach((joint, i) => (pose[joint] = { z: angles[i] }));
}

// --- key poses -----------------------------------------------------------------------------------

export function crouch(): Pose {
  const p: Pose = { Root: { z: 0.1 }, Neck: { z: -0.35 }, Head: { z: 0.3 }, Tail01: { z: 0.35 } };
  leg(p, FRONT, [0.25, -0.75, 0.35, 0.2]);
  leg(p, HIND, [0.75, 1.1, -0.95, 0.35]);
  return p;
}

export function push(): Pose {
  const p: Pose = { Root: { z: 0.45 }, Neck: { z: -0.15 }, Head: { z: 0.15 }, Tail01: { z: -0.1 } };
  leg(p, FRONT, [1.05, -0.9, 0.2, 0.3]);
  leg(p, HIND, [-0.75, -0.2, 0.25, 0.1]);
  return p;
}

export function flight(): Pose {
  const p: Pose = { Root: { z: 0.0 }, Neck: { z: -0.1 }, Head: { z: 0.1 }, Tail01: { z: -0.35 }, Tail02: { z: 0.25 } };
  leg(p, FRONT, [1.1, -0.35, 0.1, 0.1]);
  leg(p, HIND, [-0.9, -0.1, 0.35, 0.15]);
  return p;
}

export function land(): Pose {
  const p: Pose = { Root: { z: -0.3 }, Neck: { z: 0.2 }, Head: { z: -0.05 }, Tail01: { z: -0.25 } };
  leg(p, FRONT, [0.35, -0.15, 0.05, 0.1]);
  leg(p, HIND, [0.2, 0.45, -0.35, 0.2]);
  return p;
}

export function sit(): Pose {
  // Upright on its haunches: the body tilts ~55°, the front legs end up vertical and the head
  // comes back level; the tail wraps around the paws.
  const p: Pose = { Root: { z: 0.95 }, Neck: { z: -0.72 }, Head: { z: -0.22 }, Tail01: { z: 1.0, x: 0.35 }, Tail02: { z: 0.5, x: 0.45 }, Tail03: { z: 0.35, x: 0.4 } };
  leg(p, FRONT, [-0.88, 0.02, 0.08, 0.3]);
  leg(p, HIND, [1.45, 1.75, -1.6, 0.7]);
  return p;
}

/** Gait: walk (lateral sequence) or trot (diagonal pairs), blended by `trot` (0–1). */
export function gait(phase: number, trot: number): Pose {
  const walkOffsets: Record<Leg, number> = { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 };
  const trotOffsets: Record<Leg, number> = { LF: 0, RH: 0, RF: 0.5, LH: 0.5 };
  const p: Pose = {};
  for (const l of ['LF', 'RF', 'LH', 'RH'] as Leg[]) {
    const offset = walkOffsets[l] + (trotOffsets[l] - walkOffsets[l]) * trot;
    const a = 2 * Math.PI * (phase + offset);
    const s = Math.sin(a);
    const lift = Math.pow(Math.max(0, Math.cos(a)), 1.5);
    const front = l === 'LF' || l === 'RF';
    const amplitude = (front ? 0.32 : 0.36) + (front ? 0.2 : 0.24) * trot;
    const liftGain = 1 + 0.5 * trot;
    const angles: [number, number, number, number] = front
      ? [amplitude * s, -0.6 * lift * liftGain, 0.35 * lift * liftGain, 0.3 * lift]
      : [amplitude * s, 0.55 * lift * liftGain, -0.45 * lift * liftGain, 0.3 * lift];
    leg(p, [l], angles);
  }
  const bob = Math.sin(4 * Math.PI * phase);
  p.Root = { z: 0.02 * bob * (1 + trot), x: 0.03 * Math.sin(2 * Math.PI * phase) * (1 - trot) };
  p.Neck = { z: -0.12 + 0.05 * bob };
  p.Head = { z: 0.06 - 0.03 * bob };
  return p;
}

/** Tail: a high curve with a slow lateral wave that travels down the vertebrae. */
export function tail(t: number, energy: number): Pose {
  const p: Pose = {};
  const joints: Joint[] = ['Tail01', 'Tail02', 'Tail03', 'Tail04', 'Tail05'];
  joints.forEach((joint, i) => {
    const wave = Math.sin(2 * Math.PI * 0.45 * t - i * 0.7);
    p[joint] = { z: (i === 0 ? -0.1 : 0.12) * (1 + 0.3 * energy), x: (0.12 + 0.05 * i) * wave * (0.6 + 0.4 * energy) };
  });
  return p;
}

// --- route ----------------------------------------------------------------------------------------

/** Support surfaces of the alley (m). */
export const SURFACES = {
  ground: 0,
  lid: 1.05,
  wall: 1.8,
};

/** Geometry the route needs to know; the recipe builds the alley with the same numbers. */
export const LAYOUT = {
  lid: { x: [0.75, 1.95] as [number, number], z: [2.4, 4.4] as [number, number] },
  wall: { z: [5.6, 5.95] as [number, number] },
};

export interface MotionState {
  /** Support point between the legs, in scene coordinates. */
  anchor: Vector3;
  /** Heading: angle about Y that turns the model's +X toward the direction of travel. */
  heading: number;
  pose: Pose;
  /** Height of the surface it stands on; null in the air. */
  support: number | null;
  /** Tilt of the whole cat, nose-up (rad), about the model's Z; 0 by default. */
  pitch?: number;
  /**
   * Height under the front legs when it differs from `support` (stairs): if the front half ends up
   * below it, the body tilts just enough not to go through it.
   */
  frontSupport?: number;
}

const groundPath = new CatmullRomCurve3([
  new Vector3(-0.4, 0, -6.0),
  new Vector3(-0.35, 0, -3.6),
  new Vector3(0.15, 0, -1.2),
  new Vector3(0.95, 0, 0.6),
  new Vector3(1.3, 0, 1.45),
]);
const GROUND_LENGTH = groundPath.getLength();

// Key times (s).
const T = {
  walkEnd: 4.0,
  trotFull: 4.4,
  arrive: 8.2,
  jumpA: 8.7, // end of the crouch
  flyA: 8.82,
  landA: 9.32,
  lidWalk: 9.8,
  lidEnd: 12.2,
  jumpB: 12.7,
  flyB: 12.82,
  landB: 13.38,
  turnEnd: 14.2,
  wallEnd: 17.0,
  faceEnd: 18.0,
  sitEnd: 19.0,
};

const WALK_SPEED = 0.5;
const BRAKE = { distance: 0.35, time: 0.5 };
const TROT_SPEED = (GROUND_LENGTH - (WALK_SPEED * T.walkEnd + ((WALK_SPEED + 1.35) / 2) * (T.trotFull - T.walkEnd)) - BRAKE.distance) /
  (T.arrive - BRAKE.time - T.trotFull);

/** Distance traveled along the ground path at time t. */
function groundDistance(t: number): number {
  const d0 = WALK_SPEED * T.walkEnd;
  if (t <= T.walkEnd) return WALK_SPEED * t;
  const accel = T.trotFull - T.walkEnd;
  const d1 = d0 + ((WALK_SPEED + TROT_SPEED) / 2) * accel;
  if (t <= T.trotFull) {
    const u = (t - T.walkEnd) / accel;
    return d0 + accel * (WALK_SPEED * u + ((TROT_SPEED - WALK_SPEED) * u * u) / 2);
  }
  const brakeStart = T.arrive - BRAKE.time;
  if (t <= brakeStart) return d1 + TROT_SPEED * (t - T.trotFull);
  const d2 = d1 + TROT_SPEED * (brakeStart - T.trotFull);
  const u = Math.min(1, (t - brakeStart) / BRAKE.time);
  return d2 + (GROUND_LENGTH - d2) * (1 - (1 - u) * (1 - u));
}

/** Gait phase integrated in fixed steps (deterministic): the cadence changes with speed. */
export function integratePhase(t: number, cadence: (t: number) => number): number {
  const step = 1 / 240;
  let phase = 0;
  for (let s = 0; s < t; s += step) {
    const dt = Math.min(step, t - s);
    phase += cadence(s) * dt;
  }
  return phase;
}

function gaitPhase(t: number): number {
  return integratePhase(t, cadence);
}

function cadence(t: number): number {
  if (t < T.walkEnd) return 1.25;
  if (t < T.arrive) return 1.25 + (2.3 - 1.25) * smoothstep(T.walkEnd, T.trotFull, t) * (1 - smoothstep(T.arrive - 0.5, T.arrive, t) * 0.6);
  if (t >= T.lidWalk && t < T.lidEnd) return 1.15;
  if (t >= T.landB && t < T.faceEnd) return 1.1;
  return 0.6;
}

export function headingOf(direction: Vector3): number {
  return Math.atan2(-direction.z, direction.x);
}

export function ballistic(from: Vector3, to: Vector3, u: number, apex: number): Vector3 {
  const p = from.clone().lerp(to, u);
  // Parabola through both ends with its vertex `apex` above the higher one.
  const top = Math.max(from.y, to.y) + apex;
  const a = from.y;
  const b = to.y;
  // y(u) = a(1−u)² + 2c·u(1−u) + b·u² (quadratic Bézier); c chosen so the maximum touches `top`.
  const c = 2 * top - (a + b) / 2;
  p.y = a * (1 - u) * (1 - u) + 2 * c * u * (1 - u) + b * u * u;
  return p;
}

export function motionAt(t: number): MotionState {
  const phase = gaitPhase(t);
  const idleTail = tail(t, 0.5);
  const forward = headingOf(new Vector3(0, 0, 1));

  // 1–2. It walks in from the shadow and trots to the dumpster.
  if (t < T.arrive) {
    const d = groundDistance(t);
    const u = Math.min(1, d / GROUND_LENGTH);
    const anchor = groundPath.getPointAt(u);
    const heading = headingOf(groundPath.getTangentAt(u));
    const trot = smoothstep(T.walkEnd, T.trotFull, t) * (1 - smoothstep(T.arrive - 0.45, T.arrive, t));
    return { anchor, heading, pose: addPose(gait(phase, trot), tail(t, trot)), support: SURFACES.ground };
  }

  const takeoffA = groundPath.getPointAt(1);
  const landingA = new Vector3(1.3, SURFACES.lid, 2.9);
  // 3. It crouches, pushes off and flies onto the dumpster.
  if (t < T.flyA) {
    const pose = t < T.jumpA
      ? mixPose(addPose(gait(phase, 0), idleTail), crouch(), smoothstep(T.arrive, T.arrive + 0.2, t))
      : mixPose(crouch(), push(), smoothstep(T.jumpA, T.flyA, t));
    // While crouching it finishes lining up with the dumpster.
    const arriving = headingOf(groundPath.getTangentAt(1));
    const heading = arriving + (forward - arriving) * smoothstep(T.arrive, T.arrive + 0.35, t);
    return { anchor: takeoffA.clone(), heading, pose, support: SURFACES.ground };
  }
  if (t < T.landA) {
    const u = (t - T.flyA) / (T.landA - T.flyA);
    const anchor = ballistic(takeoffA, landingA, u, 0.32);
    const pose = u < 0.45 ? mixPose(push(), flight(), smoothstep(0, 0.45, u)) : mixPose(flight(), land(), smoothstep(0.45, 1, u));
    return { anchor, heading: forward, pose, support: null };
  }

  // 4. It lands and walks on the lid.
  const lidEnd = new Vector3(1.3, SURFACES.lid, 4.0);
  if (t < T.lidWalk) {
    const pose = mixPose(land(), addPose(gait(phase, 0), idleTail), smoothstep(T.landA, T.lidWalk, t));
    return { anchor: landingA.clone(), heading: forward, pose, support: SURFACES.lid };
  }
  if (t < T.lidEnd) {
    const u = smoothstep(T.lidWalk, T.lidEnd, t) * 0.9 + ((t - T.lidWalk) / (T.lidEnd - T.lidWalk)) * 0.1;
    return { anchor: landingA.clone().lerp(lidEnd, u), heading: forward, pose: addPose(gait(phase, 0), idleTail), support: SURFACES.lid };
  }

  // 5. Second jump: from the lid to the back wall.
  const wallZ = (LAYOUT.wall.z[0] + LAYOUT.wall.z[1]) / 2;
  const landingB = new Vector3(1.3, SURFACES.wall, wallZ);
  if (t < T.flyB) {
    const pose = t < T.jumpB
      ? mixPose(addPose(gait(phase, 0), idleTail), crouch(), smoothstep(T.lidEnd, T.lidEnd + 0.2, t))
      : mixPose(crouch(), push(), smoothstep(T.jumpB, T.flyB, t));
    return { anchor: lidEnd.clone(), heading: forward, pose, support: SURFACES.lid };
  }
  if (t < T.landB) {
    const u = (t - T.flyB) / (T.landB - T.flyB);
    const anchor = ballistic(lidEnd, landingB, u, 0.28);
    const pose = u < 0.45 ? mixPose(push(), flight(), smoothstep(0, 0.45, u)) : mixPose(flight(), land(), smoothstep(0.45, 1, u));
    return { anchor, heading: forward, pose, support: null };
  }

  // 6. It turns on the wall, walks to the left, turns toward the camera and sits down.
  const left = headingOf(new Vector3(-1, 0, 0));
  const toCamera = headingOf(new Vector3(0, 0, -1));
  const wallEnd = new Vector3(-0.1, SURFACES.wall, wallZ);
  if (t < T.turnEnd) {
    const k = smoothstep(T.landB, T.turnEnd, t);
    const pose = mixPose(land(), addPose(gait(phase, 0), idleTail), smoothstep(T.landB, T.landB + 0.4, t));
    return { anchor: landingB.clone(), heading: forward + (left - forward) * k, pose, support: SURFACES.wall };
  }
  if (t < T.wallEnd) {
    const u = (t - T.turnEnd) / (T.wallEnd - T.turnEnd);
    return { anchor: landingB.clone().lerp(wallEnd, smoothstep(0, 1, u) * 0.85 + u * 0.15), heading: left, pose: addPose(gait(phase, 0), idleTail), support: SURFACES.wall };
  }
  if (t < T.faceEnd) {
    const k = smoothstep(T.wallEnd, T.faceEnd, t);
    const turn = left + (toCamera - left) * k;
    return { anchor: wallEnd.clone(), heading: turn, pose: addPose(gait(phase, 0), idleTail), support: SURFACES.wall };
  }
  const k = smoothstep(T.faceEnd, T.sitEnd, t);
  const seated = mixPose(addPose(gait(phase, 0), idleTail), sit(), k);
  // Once seated: the head seeks the camera and the tip of the tail flicks.
  const settle = smoothstep(T.sitEnd, T.sitEnd + 0.4, t);
  const flick = Math.sin(2 * Math.PI * 1.6 * t) * 0.25 * settle;
  const pose = addPose(seated, { Neck: { z: 0.12 * settle }, Head: { z: 0.1 * settle }, Tail04: { x: flick }, Tail05: { x: flick * 1.4 } });
  return { anchor: wallEnd.clone(), heading: toCamera, pose, support: SURFACES.wall };
}

/** Point of interest for the source camera: the cat, a little above its support. */
export function motionFocus(t: number): Vector3 {
  const state = motionAt(t);
  return state.anchor.clone().add(new Vector3(0, 0.22, 0));
}
