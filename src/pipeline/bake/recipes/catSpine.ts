import { Bone, Skeleton, Vector3, type Object3D, type SkinnedMesh } from 'three';
import { smoothstep } from '../../scenes/math';

/**
 * A spine built in code for "cat-stairs" (D6). The cat rig has a single trunk bone (Root): the body
 * moves as one rigid block. On load, two bones are added under Root, at the same place: `Chest`, which
 * parents the neck and the front legs, and `Pelvis`, which parents the hind legs and the tail. Root's
 * influence on the trunk vertices is split between the two according to the position along the body,
 * with a smooth transition around the center. That way the trunk can flex, extend and undulate
 * sideways without touching the model or the "cat-alley" 4D pack.
 *
 * The new bones start with an identity transform relative to Root: the rest pose and the bind do not
 * change (the rest vertices stay exactly where they were).
 */

export const CHEST = 'Chest';
export const PELVIS = 'Pelvis';

/** Transition of Root's weight between pelvis and chest: model x (m, at bake scale). */
export const SPINE_BLEND = { from: -0.07, to: 0.07 };

/**
 * In the model, the top of the haunches and shoulders is weighted to the upper leg bones: when the leg
 * swung, the back deformed with it (a "fin" on the rump). That part moves to the pelvis and the chest,
 * with a transition by height (model y, m) above the joint.
 */
const BACK_TRANSFER = [
  // Rump: what lies above the hip and, lower down, what lies behind it (the buttock).
  { bones: ['UpperLeftLeg', 'UpperRightLeg'], to: 'Pelvis', from: 0.265, full: 0.325, amount: 0.85, behind: { x: [-0.12, -0.165] as [number, number], y: [0.17, 0.23] as [number, number] } },
  { bones: ['UpperLeftSecondLeg', 'UpperRightSecondLeg'], to: 'Chest', from: 0.28, full: 0.335, amount: 0.7, behind: null },
];

const FRONT_CHILDREN = ['Neck', 'UpperLeftSecondLeg', 'UpperRightSecondLeg'];
const HIND_CHILDREN = ['UpperLeftLeg', 'UpperRightLeg', 'Tail01'];

export interface SpineReport {
  chest: Bone;
  pelvis: Bone;
  /** Vertices that received weight from the spine. */
  reweighted: number;
  /** Vertices where the smallest influence had to be dropped to make room. */
  dropped: number;
}

export function addSpine(model: Object3D): SpineReport {
  model.updateMatrixWorld(true);
  const bones = new Map<string, Bone>();
  const meshes: SkinnedMesh[] = [];
  model.traverse((object) => {
    if ((object as Bone).isBone) bones.set(object.name, object as Bone);
    if ((object as SkinnedMesh).isSkinnedMesh) meshes.push(object as SkinnedMesh);
  });
  const root = bones.get('Root');
  if (!root) throw new Error('catSpine: the rig has no Root');
  for (const name of [...FRONT_CHILDREN, ...HIND_CHILDREN]) if (!bones.has(name)) throw new Error(`catSpine: missing ${name}`);

  // Rest position (subject space) of each vertex, before touching weights or hierarchy.
  const rest = meshes.map((mesh) => {
    const position = mesh.geometry.attributes.position;
    const out = new Float32Array(position.count * 2);
    const v = new Vector3();
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      out[i * 2] = v.x;
      out[i * 2 + 1] = v.y;
    }
    return out;
  });

  const chest = new Bone();
  chest.name = CHEST;
  const pelvis = new Bone();
  pelvis.name = PELVIS;
  root.add(chest, pelvis);
  // Identity local transform: the children keep their world placement when they change parent.
  for (const name of FRONT_CHILDREN) chest.add(bones.get(name)!);
  for (const name of HIND_CHILDREN) pelvis.add(bones.get(name)!);
  model.updateMatrixWorld(true);

  let reweighted = 0;
  let dropped = 0;
  const rebound = new Map<Skeleton, Skeleton>();
  meshes.forEach((mesh, m) => {
    const old = mesh.skeleton;
    let skeleton = rebound.get(old);
    if (!skeleton) {
      const rootIndex = old.bones.indexOf(root);
      // Same rest world transform as Root: the same inverse bind matrix.
      const inverses = [...old.boneInverses.map((b) => b.clone()), old.boneInverses[rootIndex].clone(), old.boneInverses[rootIndex].clone()];
      skeleton = new Skeleton([...old.bones, chest, pelvis], inverses);
      rebound.set(old, skeleton);
    }
    const rootIndex = skeleton.bones.indexOf(root);
    const chestIndex = skeleton.bones.indexOf(chest);
    const pelvisIndex = skeleton.bones.indexOf(pelvis);
    const index = mesh.geometry.attributes.skinIndex;
    const weight = mesh.geometry.attributes.skinWeight;
    const transfers = BACK_TRANSFER.map((rule) => ({
      ...rule,
      source: rule.bones.map((name) => skeleton!.bones.findIndex((b) => b.name === name)),
      target: rule.to === CHEST ? chestIndex : pelvisIndex,
    }));
    for (let i = 0; i < index.count; i++) {
      const slots = [0, 1, 2, 3].map((k) => ({ bone: index.getComponent(i, k), w: weight.getComponent(i, k) }));
      const x = rest[m][i * 2];
      const y = rest[m][i * 2 + 1];
      let changed = false;
      // Moves a fraction of the influence from `from` to `to`, adding to it if `to` is already there.
      const move = (fromBone: number, toBone: number, fraction: number) => {
        const a = slots.findIndex((s) => s.bone === fromBone && s.w > 0);
        if (a < 0 || fraction <= 0) return;
        const amount = slots[a].w * fraction;
        slots[a] = { bone: fraction >= 1 ? toBone : fromBone, w: fraction >= 1 ? amount : slots[a].w - amount };
        if (fraction >= 1) {
          changed = true;
          return;
        }
        let b = slots.findIndex((s) => s.bone === toBone && s.w > 0);
        if (b < 0) b = slots.findIndex((s, k) => k !== a && s.w === 0);
        if (b < 0) {
          // No free slot: the smallest influence is dropped (and renormalized below).
          b = slots.reduce((best, s, k) => (k !== a && (best < 0 || s.w < slots[best].w) ? k : best), -1);
          slots[b] = { bone: toBone, w: 0 };
          dropped++;
        }
        slots[b] = { bone: toBone, w: (slots[b].bone === toBone ? slots[b].w : 0) + amount };
        changed = true;
      };
      // Root → chest and pelvis, according to the position along the body.
      const front = smoothstep(SPINE_BLEND.from, SPINE_BLEND.to, x);
      if (slots.some((s) => s.bone === rootIndex && s.w > 0)) {
        reweighted++;
        move(rootIndex, pelvisIndex, 1 - front);
        move(rootIndex, chestIndex, 1);
      }
      // Back over haunches and shoulders → pelvis and chest.
      for (const rule of transfers) {
        const high = smoothstep(rule.from, rule.full, y);
        const behind = rule.behind ? smoothstep(rule.behind.x[0], rule.behind.x[1], x) * smoothstep(rule.behind.y[0], rule.behind.y[1], y) : 0;
        const k = rule.amount * Math.max(high, behind);
        for (const bone of rule.source) move(bone, rule.target, k);
      }
      if (!changed) continue;
      const total = slots.reduce((sum, s) => sum + s.w, 0);
      slots.forEach((s, k) => {
        index.setComponent(i, k, s.w > 0 ? s.bone : 0);
        weight.setComponent(i, k, s.w / total);
      });
    }
    index.needsUpdate = true;
    weight.needsUpdate = true;
    mesh.bind(skeleton, mesh.bindMatrix);
  });
  return { chest, pelvis, reweighted, dropped };
}
