import { CatmullRomCurve3, Color, Matrix4, Quaternion, Vector3, type Bone, type Group, type SkinnedMesh } from 'three';
import type { PackCamera } from '../../../engine/pack/format';
import { handheld, hash2, valueNoise, type BakeParams, type Rgb } from '../common';
import { smoothstep } from '../../scenes/math';
import { stream } from '../../scenes/random';
import { CatRecipe, brick, cardboard, dumpster, interpolateKeys, windowAt, type Lighting, type Surface, type WindowSpec } from './catBase';
import { twoBoneIk, wrapAngle } from './catIk';
import type { Leg, MotionState } from './catMotion';
import { CHEST, PELVIS, addSpine } from './catSpine';
import { RIG, STAIRS, STAIRS_MOTION_DURATION, StairsMotion, type FootState, type StairsState } from './catStairsMotion';

// The "cat-stairs" recipe: the same alley at night, now with a stone stairway against the right wall
// that climbs to a landing with a door and a sodium lamp above it. The black cat walks in, climbs
// step by step and sits at the top facing the camera. The light is more chromatic than in
// "cat-alley": a cold lamp below, the warm sodium above and a magenta neon sign on the wall.

const ALLEY = { x: [-2, 2] as const, z: [-12, 6] as const, leftHeight: 6.0, rightHeight: 6.5, backHeight: 7.5 };

const SODIUM: Rgb = [1.0, 0.5, 0.16];
const COOL: Rgb = [0.42, 0.78, 1.0];
const NEON: Rgb = [1.0, 0.16, 0.6];
const WARM_GLOW: Rgb = [1.0, 0.6, 0.26];
const TEAL_GLOW: Rgb = [0.3, 0.85, 0.8];

/** Landing lamp: above the door, 0.38 m from the back wall. */
const TOP_LAMP = new Vector3((STAIRS.x[0] + STAIRS.x[1]) / 2, 4.25, 5.62);
/** Neon sign on the right wall, before the stairs. */
const NEON_SIGN = { z: [-1.5, -0.3] as [number, number], y: [2.3, 2.85] as [number, number] };

const LIGHTING: Lighting = {
  lamps: [
    { position: TOP_LAMP, color: SODIUM, power: 2.4, radius: 1.9, sheen: 0.2 },
    { position: new Vector3(-1.4, 4.1, -0.3), color: COOL, power: 1.25, radius: 2.1, sheen: 0.34 },
    { position: new Vector3(1.85, (NEON_SIGN.y[0] + NEON_SIGN.y[1]) / 2, (NEON_SIGN.z[0] + NEON_SIGN.z[1]) / 2), color: NEON, power: 0.55, radius: 1.1, sheen: 0.1 },
  ],
  moonDirection: new Vector3(0.35, 0.9, 0.25).normalize(),
  moon: [0.06, 0.085, 0.17],
  ambient: [0.016, 0.02, 0.04],
  rim: [0.1, 0.12, 0.17],
  sky: new Color().setRGB(0.012, 0.015, 0.035),
};

/** Relative density of the stairs: they have to read in points. */
const STAIR_DENSITY = { tread: 3, nosing: 12, riser: 2, side: 1.5 };
/** Nosing: a strip of light, worn stone at the front of each step. */
const NOSING = 0.04;

export const STAIRS_DEFAULTS: BakeParams = {
  name: 'cat-stairs',
  fps: 30,
  duration: 14,
  pointsPerFrame: 4000,
  // Twice that of "cat-alley": the chase camera looks at the background from 1–3 m.
  envDensity: 1400,
  sourceWidth: 320,
  seed: 1,
  depthNoise: 0.3,
  subjectDepthNoise: 0.12,
};

/** Bones of each leg: [girdle → middle, middle → ankle, paw, toes]. */
const LEG_BONES: Record<Leg, [string, string, string, string]> = {
  LF: ['UpperLeftSecondLeg', 'LowerLeftSecondLeg', 'LeftSecondAnkle', 'LeftSecondFoot'],
  RF: ['UpperRightSecondLeg', 'LowerRightSecondLeg', 'RightSecondAnkle', 'RightSecondFoot'],
  LH: ['UpperLeftLeg', 'LowerLeftLeg', 'LeftAnkle', 'LeftFoot'],
  RH: ['UpperRightLeg', 'LowerRightLeg', 'RightAnkle', 'RightFoot'],
};

/** Rest-rig data used by the IK, read from the model on load. */
interface RestRig {
  quaternion: Map<string, Quaternion>;
  position: Map<string, Vector3>;
  /** World orientation (subject at the origin) of the head, the paws and the toes. */
  world: Map<string, Quaternion>;
  /** Per leg: rest angle of the first bone in the parent's plane, of the second relative to the first, and middle-joint side. */
  legs: Record<Leg, { upper: number; lower: number; bend: 1 | -1; l1: number; l2: number }>;
  /** Meters per local bone unit (armature scale). */
  unit: number;
}

/** At mid-flight, the fraction of the leg length left unstretched (a leg in the air is folded). */
const SWING_SLACK = 0.1;

const Z_AXIS = new Vector3(0, 0, 1);
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const _q = new Quaternion();
const _q2 = new Quaternion();
const _v = new Vector3();
const _v2 = new Vector3();

export class CatStairs extends CatRecipe {
  readonly id = 'cat-stairs';
  readonly title = 'Black cat climbing stairs in an alley at night ("Cat" by J-Toastie, CC-BY 3.0)';
  readonly defaults = STAIRS_DEFAULTS;
  readonly generatorName = '4d-os /bake · cat-stairs';
  readonly pointSize = { static: 0.04, dynamic: 0.013 };
  /** Stable points (D5): the same spot on the body in every frame, and the viewer interpolates the present. */
  readonly stableSubject = true;
  protected readonly lighting = LIGHTING;
  protected readonly motionDuration = STAIRS_MOTION_DURATION;
  /** Less dust than in "cat-alley": up close, each mote is a large square. */
  protected readonly floaterRate = 0.0006;
  protected readonly floaterBox = {
    min: [ALLEY.x[0] + 0.2, 0.3, ALLEY.z[0]] as [number, number, number],
    max: [ALLEY.x[1] - 0.2, 4.5, ALLEY.z[1] - 0.3] as [number, number, number],
  };

  /** Route plan (footfalls, body and tabulated springs), one per seed. */
  private plan: StairsMotion | null = null;
  private restRig: RestRig | null = null;
  private rootBone: Bone | null = null;

  /** The plan for the current seed (built in `setup`). */
  get motionPlan(): StairsMotion {
    if (!this.plan || this.plan.seed !== this.params.seed) this.plan = new StairsMotion(this.params.seed);
    return this.plan;
  }

  protected motion(t: number): MotionState {
    return this.motionPlan.at(t);
  }

  setup(params: BakeParams): void {
    if (!this.plan || this.plan.seed !== params.seed) this.plan = new StairsMotion(params.seed);
    super.setup(params);
  }

  focus(): Vector3 {
    return this.rootBone ? this.rootBone.getWorldPosition(new Vector3()) : super.focus();
  }

  /** Spine built in code, and rest data for the IK (D6). */
  protected prepareModel(model: Group): void {
    addSpine(model);
    model.updateMatrixWorld(true);
    const bones = new Map<string, Bone>();
    model.traverse((object) => {
      if ((object as Bone).isBone) bones.set(object.name, object as Bone);
    });
    this.rootBone = bones.get('Root') ?? null;
    const quaternion = new Map<string, Quaternion>();
    const position = new Map<string, Vector3>();
    const world = new Map<string, Quaternion>();
    for (const [name, bone] of bones) {
      quaternion.set(name, bone.quaternion.clone());
      position.set(name, bone.position.clone());
      world.set(name, bone.getWorldQuaternion(new Quaternion()));
    }
    const legs = {} as RestRig['legs'];
    for (const leg of Object.keys(LEG_BONES) as Leg[]) {
      const [upperName, lowerName, ankleName] = LEG_BONES[leg];
      const upper = bones.get(upperName)!;
      const lower = bones.get(lowerName)!;
      const ankle = bones.get(ankleName)!;
      const upperDir = Y_AXIS.clone().applyQuaternion(upper.quaternion);
      const lowerDir = Y_AXIS.clone().applyQuaternion(lower.quaternion);
      // Side of the middle joint relative to the girdle → ankle line, in the parent's plane.
      const hip = upper.position;
      const knee = upper.position.clone().add(lower.position.clone().applyQuaternion(upper.quaternion));
      const end = knee.clone().add(ankle.position.clone().applyQuaternion(_q.copy(upper.quaternion).multiply(lower.quaternion)));
      const cross = (end.x - hip.x) * (knee.y - hip.y) - (end.y - hip.y) * (knee.x - hip.x);
      legs[leg] = {
        upper: Math.atan2(upperDir.y, upperDir.x),
        lower: Math.atan2(lowerDir.y, lowerDir.x) - Math.PI / 2,
        bend: cross > 0 ? 1 : -1,
        l1: lower.position.length(),
        l2: ankle.position.length(),
      };
    }
    const unit = bones.get(CHEST)!.getWorldScale(new Vector3()).x;
    this.restRig = { quaternion, position, world, legs, unit };
    this.checkRig(model, bones);
  }

  /** The measurements in `RIG` (used for planning) must match the model's. */
  private checkRig(model: Group, bones: Map<string, Bone>): void {
    const at = (name: string) => bones.get(name)!.getWorldPosition(new Vector3());
    const expect: [string, [number, number]][] = [
      ['Root', RIG.pivot],
      ['UpperLeftLeg', RIG.hip],
      ['UpperLeftSecondLeg', RIG.shoulder],
      ['Neck', RIG.neck],
      ['Tail01', RIG.tail],
      ['LeftAnkle', RIG.hind.ankle],
      ['LeftFoot', RIG.hind.toe],
      ['LeftSecondAnkle', RIG.fore.ankle],
      ['LeftSecondFoot', RIG.fore.toe],
    ];
    const errors: string[] = [];
    for (const [name, [x, y]] of expect) {
      const p = at(name);
      if (Math.hypot(p.x - x, p.y - y) > 0.0015) errors.push(`${name} (${p.x.toFixed(4)}, ${p.y.toFixed(4)})`);
    }
    // Lowest point of each paw (vertices dominated by its paw or its toes).
    const mesh = model.getObjectByProperty('isSkinnedMesh', true) as SkinnedMesh | undefined;
    if (mesh) {
      const names = mesh.skeleton.bones.map((b) => b.name);
      const index = mesh.geometry.attributes.skinIndex;
      const weight = mesh.geometry.attributes.skinWeight;
      const positionAttr = mesh.geometry.attributes.position;
      for (const [leg, rig] of [['LH', RIG.hind], ['LF', RIG.fore]] as const) {
        const paw = new Set(LEG_BONES[leg].slice(2));
        let minY = Infinity;
        let minX = Infinity;
        let maxX = -Infinity;
        for (let i = 0; i < index.count; i++) {
          let best = 0;
          for (let k = 1; k < 4; k++) if (weight.getComponent(i, k) > weight.getComponent(i, best)) best = k;
          if (!paw.has(names[index.getComponent(i, best)])) continue;
          _v.fromBufferAttribute(positionAttr, i);
          mesh.applyBoneTransform(i, _v);
          _v.applyMatrix4(mesh.matrixWorld);
          minY = Math.min(minY, _v.y);
          minX = Math.min(minX, _v.x);
          maxX = Math.max(maxX, _v.x);
        }
        const cx = (minX + maxX) / 2;
        if (Math.abs(minY - rig.contact[1]) > 0.0015 || Math.abs(cx - rig.contact[0]) > 0.003) errors.push(`${leg} contact (${cx.toFixed(4)}, ${minY.toFixed(4)})`);
      }
    }
    if (errors.length) throw new Error(`cat-stairs: the rig does not match RIG: ${errors.join(', ')}`);
  }

  /** Spine, shoulder blades, IK of the four legs with the paw planted, and gaze (D6). */
  protected refinePose(motionState: MotionState, bones: ReadonlyMap<string, Bone>): void {
    const state = motionState as StairsState;
    const rest = this.restRig;
    if (!rest || !state.feet) return;
    const chest = bones.get(CHEST)!;
    const pelvis = bones.get(PELVIS)!;
    spineRotation(chest.quaternion, state.spine.chest);
    spineRotation(pelvis.quaternion, state.spine.pelvis);
    for (const leg of ['LF', 'RF'] as const) {
      const upper = bones.get(LEG_BONES[leg][0])!;
      // Along the body (the chest's local Y) and upward (local −X).
      upper.position.copy(rest.position.get(upper.name)!).addScaledVector(Y_AXIS, state.scapula[leg] / rest.unit).addScaledVector(X_AXIS, -state.scapulaUp[leg] / rest.unit);
    }
    this.subject.updateMatrixWorld(true);
    for (const leg of Object.keys(LEG_BONES) as Leg[]) this.solveLeg(leg, state.feet[leg], bones, rest);
    this.aimHead(state, bones, rest);
    if (state.tailWrap > 0 || state.tailFlick !== 0) this.wrapTail(state, bones);
    this.subject.updateMatrixWorld(true);
  }

  /**
   * When seated, the tail drops to the floor and wraps around the paws: each vertebra points at the next
   * point of a curve on the landing, one bone length away, blended with the planned tail by `tailWrap`.
   * At rest the tip flicks (`tailFlick`) and lifts a little off the floor.
   */
  private wrapTail(state: StairsState, bones: ReadonlyMap<string, Bone>): void {
    const names = ['Tail01', 'Tail02', 'Tail03', 'Tail04', 'Tail05'];
    const chain = names.map((name) => bones.get(name)!);
    const end = chain[4].children.find((child) => !(child as Bone).isBone) ?? chain[4].children[0];
    this.subject.updateMatrixWorld(true);
    const joints = [...chain.map((bone) => bone.getWorldPosition(new Vector3())), end ? end.getWorldPosition(new Vector3()) : chain[4].getWorldPosition(new Vector3())];
    const lengths = joints.slice(1).map((p, k) => p.distanceTo(joints[k]));
    if (state.tailWrap > 0) {
      // Curve on the floor, in the cat's horizontal frame: behind the rump, along the flank and forward,
      // up to the paws.
      const heading = state.heading;
      const f = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
      const side = new Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(state.tailSide);
      const hip = bones.get('UpperLeftLeg')!.getWorldPosition(new Vector3()).add(bones.get('UpperRightLeg')!.getWorldPosition(new Vector3())).multiplyScalar(0.5);
      const floor = STAIRS.landing.y + 0.015;
      const at = (back: number, out: number) => new Vector3(hip.x, floor, hip.z).addScaledVector(f, back).addScaledVector(side, out);
      const curve = new CatmullRomCurve3([joints[0].clone(), at(-0.08, 0.04), at(-0.01, 0.1), at(0.09, 0.115), at(0.17, 0.075), at(0.22, 0.03)]);
      const samples = curve.getSpacedPoints(200);
      const cumulative = [0];
      for (let i = 1; i < samples.length; i++) cumulative.push(cumulative[i - 1] + samples[i].distanceTo(samples[i - 1]));
      const pointAt = (distance: number) => {
        let i = 1;
        while (i < samples.length - 1 && cumulative[i] < distance) i++;
        const w = Math.min(1, Math.max(0, (distance - cumulative[i - 1]) / Math.max(1e-9, cumulative[i] - cumulative[i - 1])));
        return samples[i - 1].clone().lerp(samples[i], w);
      };
      // The fully curled tail (each vertebra turned from its rest pose toward the next point of the curve)
      // and its blend with the planned tail in each vertebra's local space, staggered from the base to
      // the tip: first it drops to the floor and then it curls.
      const planned = chain.map((bone) => bone.quaternion.clone());
      let along = 0;
      for (let k = 0; k < 5; k++) {
        along += lengths[k];
        const origin = chain[k].getWorldPosition(new Vector3());
        this.aimFromRest(chain[k], pointAt(along).sub(origin));
      }
      const wrapped = chain.map((bone) => bone.quaternion.clone());
      chain.forEach((bone, k) => {
        const w = minJerkStep((state.tailWrap - 0.05 * k) / 0.8);
        bone.quaternion.copy(planned[k]).slerp(wrapped[k], w);
      });
      chain[0].updateMatrixWorld(true);
      // No vertebra goes through the landing: if its tip ends up below, it is raised to the floor.
      for (let k = 0; k < 5; k++) {
        const child = k < 4 ? chain[k + 1] : end;
        if (!child) break;
        const origin = chain[k].getWorldPosition(new Vector3());
        const tip = child.getWorldPosition(new Vector3());
        if (tip.y >= floor) continue;
        const dy = Math.min(lengths[k] * 0.95, floor - origin.y);
        const flat = new Vector3(tip.x - origin.x, 0, tip.z - origin.z).normalize().multiplyScalar(Math.sqrt(Math.max(0, lengths[k] ** 2 - dy * dy)));
        this.aimFromRest(chain[k], flat.setY(dy));
      }
    }
    if (state.tailFlick !== 0) {
      // The tip flicks sideways and lifts off the floor.
      const up = new Vector3(0, 1, 0);
      for (const [k, amount] of [[3, 0.6], [4, 1]] as const) {
        const bone = chain[k];
        const world = bone.getWorldQuaternion(new Quaternion());
        const turn = new Quaternion().setFromAxisAngle(up, state.tailFlick * amount);
        const parent = bone.parent!.getWorldQuaternion(new Quaternion());
        bone.quaternion.copy(parent.invert().multiply(turn.multiply(world)));
        bone.updateMatrixWorld(true);
      }
    }
  }

  /**
   * Orients `bone` so that it points (its Y axis) in the `world` direction, rotating from its rest
   * orientation relative to the parent: stable even if the planned pose points elsewhere.
   */
  private aimFromRest(bone: Bone, world: Vector3): void {
    const rest = this.restRig!.quaternion.get(bone.name)!;
    const parent = bone.parent!.getWorldQuaternion(new Quaternion());
    const local = world.clone().applyQuaternion(parent.invert()).normalize();
    const restDirection = Y_AXIS.clone().applyQuaternion(rest).normalize();
    bone.quaternion.copy(new Quaternion().setFromUnitVectors(restDirection, local).multiply(rest));
    bone.updateMatrixWorld(true);
  }

  private solveLeg(leg: Leg, foot: FootState, bones: ReadonlyMap<string, Bone>, rest: RestRig): void {
    const [upperName, lowerName, ankleName, toeName] = LEG_BONES[leg];
    const upper = bones.get(upperName)!;
    const lower = bones.get(lowerName)!;
    const ankle = bones.get(ankleName)!;
    const toe = bones.get(toeName)!;
    const parent = upper.parent!;
    const info = rest.legs[leg];
    const target = parent.worldToLocal(_v.set(foot.ankle[0], foot.ankle[1], foot.ankle[2]));
    const hip = upper.position;
    if (!foot.planted && foot.swing >= 0) {
      // In the air the leg is folded: the target moves toward the girdle until it is well within reach.
      // Near a straight leg, the middle angle changes in jumps ("pop") as the target moves.
      const w = minJerkStep(foot.swing / 0.25) * minJerkStep((1 - foot.swing) / 0.25);
      const length = info.l1 + info.l2;
      const d = target.distanceTo(hip);
      const cap = length * (1 - SWING_SLACK * w);
      const band = 0.06 * length;
      if (d > cap - band) target.sub(hip).multiplyScalar((cap - band + band * Math.tanh((d - cap + band) / band)) / d).add(hip);
    }
    const dx = target.x - hip.x;
    const dy = target.y - hip.y;
    const d3 = Math.hypot(dx, dy, target.z - hip.z);
    const inPlane = Math.max(1e-9, Math.hypot(dx, dy));
    const tx = hip.x + (dx / inPlane) * d3;
    const ty = hip.y + (dy / inPlane) * d3;
    const stand = twoBoneIk(hip.x, hip.y, tx, ty, info.l1, info.l2, info.bend);
    upper.quaternion.copy(rest.quaternion.get(upperName)!).multiply(_q.setFromAxisAngle(Z_AXIS, wrapAngle(stand.upper - info.upper)));
    lower.quaternion.copy(rest.quaternion.get(lowerName)!).multiply(_q.setFromAxisAngle(Z_AXIS, wrapAngle(stand.lower - stand.upper - info.lower)));
    // Abduction: the chain solved in the plane is rotated toward the out-of-plane target.
    const from = _v2.set(stand.end[0] - hip.x, stand.end[1] - hip.y, 0).normalize();
    const to = target.sub(hip).normalize();
    upper.quaternion.premultiply(_q.setFromUnitVectors(from, to));
    upper.updateMatrixWorld(true);
    if (foot.fold > 0) {
      // When seated, the middle joint flips to the other side: it turns outward about the girdle → ankle
      // line (distances do not change and the ankle stays in place) until it points forward.
      const hipWorld = upper.getWorldPosition(new Vector3());
      const goal = new Vector3(foot.ankle[0], foot.ankle[1], foot.ankle[2]);
      const knee = lower.getWorldPosition(new Vector3());
      const axis = goal.clone().sub(hipWorld).normalize();
      const outward = new Vector3(Math.sin(foot.heading), 0, Math.cos(foot.heading)).multiplyScalar(leg === 'LH' || leg === 'LF' ? 1 : -1);
      const radial = knee.clone().sub(hipWorld);
      radial.addScaledVector(axis, -radial.dot(axis));
      const sign = Math.sign(axis.clone().cross(radial).dot(outward)) || 1;
      // The hip–hock–ankle triangle turns as a whole: the second bone keeps its local angle.
      const turn = new Quaternion().setFromAxisAngle(axis, sign * Math.PI * foot.fold);
      const world = upper.getWorldQuaternion(new Quaternion());
      const parentWorld = parent.getWorldQuaternion(new Quaternion());
      upper.quaternion.copy(parentWorld.invert().multiply(turn.multiply(world)));
      upper.updateMatrixWorld(true);
    }

    // Paw: fixed world orientation (foothold heading and raised heel); toes flat while rolling.
    const pawWorld = headingPitch(_q2, foot.heading, -foot.roll).multiply(rest.world.get(ankleName)!);
    ankle.quaternion.copy(lower.getWorldQuaternion(_q).invert().multiply(pawWorld));
    ankle.updateMatrixWorld(true);
    const curl = foot.planted ? 0 : foot.roll * 0.55 * Math.min(1, foot.swing / 0.3);
    const toeWorld = headingPitch(_q2, foot.heading, -curl).multiply(rest.world.get(toeName)!);
    toe.quaternion.copy(ankle.getWorldQuaternion(_q).invert().multiply(toeWorld));
  }

  /** Head toward the planned gaze: the neck takes part of the turn and the head the rest. */
  private aimHead(state: StairsState, bones: ReadonlyMap<string, Bone>, rest: RestRig): void {
    const neck = bones.get('Neck')!;
    const head = bones.get('Head')!;
    const desired = headingPitch(new Quaternion(), state.look.yaw, state.look.pitch)
      .multiply(_q.setFromAxisAngle(X_AXIS, state.look.roll))
      .multiply(rest.world.get('Head')!);
    head.updateWorldMatrix(true, false);
    const current = head.getWorldQuaternion(new Quaternion());
    const delta = desired.clone().multiply(current.invert());
    const share = new Quaternion().slerp(delta, state.look.neckShare);
    const neckWorld = neck.getWorldQuaternion(new Quaternion());
    const parentWorld = neck.parent!.getWorldQuaternion(new Quaternion());
    neck.quaternion.copy(parentWorld.invert().multiply(share.multiply(neckWorld)));
    neck.updateMatrixWorld(true);
    head.quaternion.copy(neck.getWorldQuaternion(_q).invert().multiply(desired));
  }

  protected build(): void {
    const random = stream(this.params.seed, 'stairs');
    const S = this.surfaces;
    const rect = (surface: Surface) => S.push(surface);

    // Ground: wet asphalt with puddles.
    const puddle = (x: number, z: number) => smoothstep(0.66, 0.74, valueNoise(x * 0.9 + 3.3, z * 0.9 - 1.2) * 0.75 + valueNoise(x * 3.1, z * 3.1) * 0.25);
    rect({
      origin: new Vector3(ALLEY.x[0], 0, ALLEY.z[1]),
      u: new Vector3(1, 0, 0),
      v: new Vector3(0, 0, -1),
      width: ALLEY.x[1] - ALLEY.x[0],
      height: ALLEY.z[1] - ALLEY.z[0],
      normal: new Vector3(0, 1, 0),
      albedo: (s, t) => {
        const x = ALLEY.x[0] + s;
        const z = ALLEY.z[1] - t;
        const grain = 0.8 + 0.4 * valueNoise(x * 6.1, z * 6.1);
        const patch = 0.75 + 0.35 * valueNoise(x * 0.6 + 7, z * 0.6);
        const g = 0.07 * grain * patch * (1 - 0.45 * puddle(x, z));
        return [g, g, g * 1.08];
      },
      wet: (s, t) => puddle(ALLEY.x[0] + s, ALLEY.z[1] - t),
      texture: 40,
    });

    // Brick walls with windows: most of them warm, some with the cold light of a screen.
    const makeWindows = (length: number, floors: number[], skip: (s: number, t: number) => boolean = () => false) => {
      const out: WindowSpec[] = [];
      for (let s = 1.2; s < length - 1.6; s += 2.6 + random() * 0.8) {
        for (const t of floors) {
          if (random() < 0.18 || skip(s, t)) continue;
          const lit = random() < 0.4;
          out.push({ s, t, w: 0.95, h: 1.25, lit, warmth: 0.6 + random() * 0.5, glow: random() < 0.3 ? TEAL_GLOW : WARM_GLOW });
        }
      }
      return out;
    };
    const windowAlbedo = (windows: WindowSpec[], seed: number, tone = 1) => (s: number, t: number): Rgb => {
      const hit = windowAt(windows, s, t);
      if (!hit) return brick(s, t, seed, tone);
      if (hit.frame) return [0.03, 0.028, 0.026];
      return hit.window.lit ? [0.05, 0.035, 0.02] : [0.012, 0.016, 0.024];
    };
    const windowGlow = (windows: WindowSpec[]) => (s: number, t: number): Rgb | null => {
      const hit = windowAt(windows, s, t);
      if (!hit || hit.frame) return null;
      if (hit.window.lit) {
        const k = 0.75 * hit.window.warmth * (0.85 + 0.15 * valueNoise(s * 4, t * 4));
        const glow = hit.window.glow ?? WARM_GLOW;
        return [glow[0] * k, glow[1] * k, glow[2] * k];
      }
      // Dark glass with a cold glint of the moon.
      const glint = 0.03 * smoothstep(0.5, 1, valueNoise(s * 2, t * 2));
      return [glint * 0.6, glint * 0.8, glint];
    };
    const length = ALLEY.z[1] - ALLEY.z[0];
    // Left wall (faces +x).
    const leftWindows = makeWindows(length, [2.25, 4.35]);
    rect({
      origin: new Vector3(ALLEY.x[0], 0, ALLEY.z[1]),
      u: new Vector3(0, 0, -1),
      v: new Vector3(0, 1, 0),
      width: length,
      height: ALLEY.leftHeight,
      normal: new Vector3(1, 0, 0),
      albedo: windowAlbedo(leftWindows, 1),
      emissive: windowGlow(leftWindows),
      texture: 40,
    });
    // Right wall (faces −x), with the neon sign; the windows sit above the landing.
    const neonAt = (z: number, y: number): number => {
      const dz = z - NEON_SIGN.z[0];
      const dy = y - NEON_SIGN.y[0];
      const w = NEON_SIGN.z[1] - NEON_SIGN.z[0];
      const h = NEON_SIGN.y[1] - NEON_SIGN.y[0];
      if (dz < 0 || dz > w || dy < 0 || dy > h) return 0;
      const tube = 0.025;
      const frame = dz < tube || dz > w - tube || dy < tube || dy > h - tube;
      // Inside the frame, a wave: one continuous neon stroke.
      const wave = Math.abs(dy - h / 2 - 0.12 * Math.sin((dz / w) * Math.PI * 3)) < tube;
      return frame || wave ? 1 : 0;
    };
    const rightWindows = makeWindows(length, [3.4, 5.4]);
    rect({
      origin: new Vector3(ALLEY.x[1], 0, ALLEY.z[0]),
      u: new Vector3(0, 0, 1),
      v: new Vector3(0, 1, 0),
      width: length,
      height: ALLEY.rightHeight,
      normal: new Vector3(-1, 0, 0),
      albedo: (s, t) => (neonAt(ALLEY.z[0] + s, t) ? [0.05, 0.02, 0.04] : windowAlbedo(rightWindows, 2)(s, t)),
      emissive: (s, t) => {
        if (neonAt(ALLEY.z[0] + s, t)) return [NEON[0] * 1.4, NEON[1] * 1.4, NEON[2] * 1.4];
        return windowGlow(rightWindows)(s, t);
      },
      texture: 40,
    });

    // Back facade (faces −z): on the left it goes down to the ground; above the landing, with the door
    // and the lit transom.
    const door = { x: [0.97, 1.73] as [number, number], y: [STAIRS.landing.y, 3.75] as [number, number] };
    const transom = { y: [3.82, 4.05] as [number, number] };
    const backWindows = makeWindows(4, [4.9, 6.2], (s) => s < 0.6);
    const leftPart = STAIRS.x[0] - ALLEY.x[0];
    rect({
      origin: new Vector3(STAIRS.x[0], 0, ALLEY.z[1]),
      u: new Vector3(-1, 0, 0),
      v: new Vector3(0, 1, 0),
      width: leftPart,
      height: ALLEY.backHeight,
      normal: new Vector3(0, 0, -1),
      albedo: windowAlbedo(backWindows, 5),
      emissive: windowGlow(backWindows),
      texture: 40,
    });
    const inDoor = (x: number, y: number) => x >= door.x[0] && x <= door.x[1] && y >= door.y[0] && y <= door.y[1];
    const inTransom = (x: number, y: number) => x >= door.x[0] && x <= door.x[1] && y >= transom.y[0] && y <= transom.y[1];
    rect({
      origin: new Vector3(ALLEY.x[1], STAIRS.landing.y, ALLEY.z[1]),
      u: new Vector3(-1, 0, 0),
      v: new Vector3(0, 1, 0),
      width: ALLEY.x[1] - STAIRS.x[0],
      height: ALLEY.backHeight - STAIRS.landing.y,
      normal: new Vector3(0, 0, -1),
      albedo: (s, t) => {
        const x = ALLEY.x[1] - s;
        const y = STAIRS.landing.y + t;
        if (inDoor(x, y)) return doorPaint(x - door.x[0], y - door.y[0], door.x[1] - door.x[0], door.y[1] - door.y[0]);
        if (inTransom(x, y)) return [0.04, 0.03, 0.02];
        // Stone frame around the door and the transom.
        if (x > door.x[0] - 0.08 && x < door.x[1] + 0.08 && y < transom.y[1] + 0.08) return stoneLight(x * 3, y * 3, 0.26);
        return brick(s, y, 6);
      },
      emissive: (s, t) => {
        const x = ALLEY.x[1] - s;
        const y = STAIRS.landing.y + t;
        if (!inTransom(x, y)) return null;
        const bar = Math.abs(x - (door.x[0] + door.x[1]) / 2) < 0.012 ? 0.3 : 1;
        return [WARM_GLOW[0] * 0.9 * bar, WARM_GLOW[1] * 0.9 * bar, WARM_GLOW[2] * 0.9 * bar];
      },
      texture: 60,
    });

    this.buildStairs();

    // Flowerpot in the corner of the landing.
    const y0 = STAIRS.landing.y;
    this.box(new Vector3(0.82, y0, 5.62), new Vector3(1.06, y0 + 0.26, 5.9), () => [0.3, 0.1, 0.05], { skipBottom: true, density: 2 });
    this.box(new Vector3(0.78, y0 + 0.26, 5.58), new Vector3(1.1, y0 + 0.52, 5.94), (_f, s, t) => {
      const n = valueNoise(s * 14, t * 14);
      return [0.03 + 0.02 * n, 0.12 + 0.08 * n, 0.04 + 0.02 * n];
    }, { skipBottom: true, density: 2.5 });

    // Landing lamp: arm to the wall, and head with the lit bulb underneath.
    const iron = (): Rgb => [0.03, 0.03, 0.034];
    this.box(new Vector3(TOP_LAMP.x - 0.03, TOP_LAMP.y + 0.22, TOP_LAMP.z), new Vector3(TOP_LAMP.x + 0.03, TOP_LAMP.y + 0.28, ALLEY.z[1]), iron);
    this.box(new Vector3(TOP_LAMP.x - 0.15, TOP_LAMP.y + 0.05, TOP_LAMP.z - 0.12), new Vector3(TOP_LAMP.x + 0.15, TOP_LAMP.y + 0.2, TOP_LAMP.z + 0.12), iron, {
      emissive: (face) => (face === 'bottom' ? [SODIUM[0] * 3, SODIUM[1] * 3, SODIUM[2] * 3] : null),
    });
    // The alley's cold lamp.
    const cool = LIGHTING.lamps[1].position;
    this.box(new Vector3(ALLEY.x[0], cool.y + 0.18, cool.z - 0.03), new Vector3(cool.x, cool.y + 0.24, cool.z + 0.03), iron);
    this.box(new Vector3(cool.x - 0.18, cool.y + 0.05, cool.z - 0.12), new Vector3(cool.x + 0.18, cool.y + 0.2, cool.z + 0.12), iron, {
      emissive: (face) => (face === 'bottom' ? [COOL[0] * 2.5, COOL[1] * 2.5, COOL[2] * 2.5] : null),
    });

    // Blue dumpster and boxes on the left.
    this.box(new Vector3(-1.95, 0.12, -3.6), new Vector3(-0.95, 1.1, -1.8), (face, s, t) => dumpster(face, s, t, [0.04, 0.07, 0.13]), { texture: 40 });
    this.box(new Vector3(-1.9, 0, -3.55), new Vector3(-1.0, 0.12, -1.85), () => [0.015, 0.015, 0.017], { skipBottom: true });
    for (const [x, y, z, sx, sy, sz] of [
      [-1.9, 0, -1.6, 0.55, 0.45, 0.5],
      [-1.85, 0.45, -1.55, 0.45, 0.4, 0.42],
      [-1.35, 0, -1.5, 0.4, 0.35, 0.45],
    ]) {
      this.box(new Vector3(x, y, z), new Vector3(x + sx, y + sy, z + sz), (_f, s, t) => cardboard(s, t), { texture: 40, skipBottom: true });
    }

    // Fire escape on the left wall.
    for (const y of [3.2, 5.4]) {
      for (let z = -5; z <= -1; z += 0.12) this.box(new Vector3(-2, y - 0.02, z), new Vector3(-1.1, y, z + 0.03), iron);
      this.box(new Vector3(-1.13, y, -5), new Vector3(-1.1, y + 0.95, -1), iron);
      for (let z = -5; z <= -1; z += 0.35) this.box(new Vector3(-1.14, y, z), new Vector3(-1.1, y + 1.0, z + 0.03), iron);
      this.box(new Vector3(-1.16, y + 0.98, -5), new Vector3(-1.1, y + 1.02, -1), iron);
    }
    for (let i = 0; i < 14; i++) {
      const k = i / 13;
      this.box(new Vector3(-1.95, 3.2 + k * 2.2 - 0.02, -4.7 + k * 3.2), new Vector3(-1.2, 3.2 + k * 2.2 + 0.02, -4.7 + k * 3.2 + 0.08), iron);
    }
  }

  /** The stairway: treads, nosings, risers, the stepped side and the landing. */
  private buildStairs(): void {
    const { x, z0, rise, run, steps, landing } = STAIRS;
    const width = x[1] - x[0];
    const S = this.surfaces;
    for (let k = 1; k <= steps; k++) {
      const zk = z0 + run * (k - 1);
      const top = rise * k;
      const depth = k < steps ? run : landing.z[1] - zk;
      // Riser (faces −z): stone in shadow, with a light top edge.
      S.push({
        origin: new Vector3(x[1], rise * (k - 1), zk),
        u: new Vector3(-1, 0, 0),
        v: new Vector3(0, 1, 0),
        width,
        height: rise,
        normal: new Vector3(0, 0, -1),
        albedo: (s, t) => (t > rise - 0.025 ? stoneLight(s, k, 0.42) : stoneLight(s * 2, t * 2 + k, 0.17)),
        density: STAIR_DENSITY.riser,
        texture: 60,
      });
      // Nosing: a dense, light strip at the front of the step.
      S.push({
        origin: new Vector3(x[0], top, zk + NOSING),
        u: new Vector3(1, 0, 0),
        v: new Vector3(0, 0, -1),
        width,
        height: NOSING,
        normal: new Vector3(0, 1, 0),
        albedo: (s) => stoneLight(s * 5, k, 0.45),
        density: STAIR_DENSITY.nosing,
        texture: 60,
      });
      // Tread (or the landing, on the last one).
      S.push({
        origin: new Vector3(x[0], top, zk + depth),
        u: new Vector3(1, 0, 0),
        v: new Vector3(0, 0, -1),
        width,
        height: depth - NOSING,
        normal: new Vector3(0, 1, 0),
        albedo: (s, t) => stoneLight(s * 3 + k * 1.7, t * 3, 0.24),
        density: k < steps ? STAIR_DENSITY.tread : STAIR_DENSITY.tread * 0.6,
        texture: 60,
      });
      // Stepped side (faces −x): stucco over the solid mass of the stairs.
      S.push({
        origin: new Vector3(x[0], 0, zk + depth),
        u: new Vector3(0, 0, -1),
        v: new Vector3(0, 1, 0),
        width: depth,
        height: top,
        normal: new Vector3(-1, 0, 0),
        albedo: (s, t) => stucco(zk + depth - s, t),
        density: STAIR_DENSITY.side,
        texture: 40,
      });
    }
  }

  cameraAt(frame: number, aspect: number): PackCamera {
    const t = this.motionTime(frame);
    // Handheld operator at ~1.5 m who follows the cat from behind and to the left, and at the end watches
    // it from the foot of the stairs.
    const keys: [number, number, number, number][] = [
      [0, -0.45, 1.3, -2.35],
      [3.3, -0.12, 1.36, -0.95],
      [6.6, -0.22, 1.5, 0.35],
      [9.8, -0.35, 1.62, 1.3],
      [14, -0.25, 1.6, 1.9],
    ];
    const position = interpolateKeys(keys, t);
    const shake = handheld(this.params.seed, t, 0.5);
    position.add(new Vector3(shake[0], shake[1], shake[2]));
    const target = new Vector3();
    const samples = [-0.5, -0.35, -0.2, -0.1, 0];
    for (const dt of samples) target.add(this.motionPlan.focus(Math.max(0, t + dt)));
    target.divideScalar(samples.length);
    const matrix = new Matrix4().lookAt(position, target, new Vector3(0, 1, 0));
    const quaternion = new Quaternion().setFromRotationMatrix(matrix);
    quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), shake[3]));
    return {
      pos: [position.x, position.y, position.z],
      quat: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      fov: 40,
      aspect,
    };
  }
}

/** Stair stone: warm gray with per-block variation; `base` sets the tone. */
function stoneLight(s: number, t: number, base: number): Rgb {
  const g = base * (0.85 + 0.2 * valueNoise(s * 2.1, t * 2.1)) + 0.03 * hash2(Math.floor(s), Math.floor(t));
  return [g, g * 0.96, g * 0.9];
}

/** Stucco on the stairs' solid mass, with grime rising from the ground. */
function stucco(z: number, y: number): Rgb {
  const n = 0.85 + 0.2 * valueNoise(z * 4, y * 4);
  const grime = 0.6 + 0.4 * smoothstep(0, 0.9, y);
  const g = 0.2 * n * grime;
  return [g, g * 0.93, g * 0.84];
}

/** Door painted a deep blue-green, with panels and a bronze knob. */
function doorPaint(s: number, t: number, width: number, height: number): Rgb {
  const knob = Math.hypot(s - width * 0.85, t - height * 0.47) < 0.03;
  if (knob) return [0.4, 0.25, 0.08];
  const inPanel = (s0: number, s1: number, t0: number, t1: number) => s > s0 && s < s1 && t > t0 && t < t1;
  const groove = inPanel(0.08, width - 0.08, 0.1, height * 0.45) || inPanel(0.08, width - 0.08, height * 0.52, height - 0.1);
  const edge = groove && !(inPanel(0.1, width - 0.1, 0.12, height * 0.45 - 0.02) || inPanel(0.1, width - 0.1, height * 0.52 + 0.02, height - 0.12));
  const n = 0.9 + 0.15 * valueNoise(s * 9, t * 9);
  const k = edge ? 0.6 : 1;
  return [0.02 * n * k, 0.09 * n * k, 0.085 * n * k];
}

/** Chest or pelvis rotation: pitch (Z), yaw (about the model's vertical, local −X) and roll (Y). */
function spineRotation(out: Quaternion, [pitch, yaw, roll]: [number, number, number]): Quaternion {
  out.setFromAxisAngle(Z_AXIS, pitch);
  out.multiply(_q.setFromAxisAngle(X_AXIS, -yaw));
  return out.multiply(_q.setFromAxisAngle(Y_AXIS, roll));
}

/** Minimum-jerk profile (0 → 1). */
function minJerkStep(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x * x * x * (10 + x * (-15 + 6 * x));
}

/** Heading about the world's Y and pitch about the model's Z: the same convention as the subject. */
function headingPitch(out: Quaternion, heading: number, pitch: number): Quaternion {
  out.setFromAxisAngle(Y_AXIS, heading);
  return out.multiply(_q.setFromAxisAngle(Z_AXIS, pitch));
}
