import {
  BufferAttribute,
  CanvasTexture,
  Color,
  DoubleSide,
  Fog,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type Bone,
  type Material,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import catUrl from '../../models/cat/Cat.glb?url';
import type { PackCamera } from '../../../engine/pack/format';
import type { PointSet } from '../../../engine/pack/writer';
import { environmentWriter, hash2, mix3, skinVertices, toSrgb8, valueNoise, type BakeParams, type Rgb, type SkinPart } from '../common';
import { smoothstep } from '../../scenes/math';
import { stream } from '../../scenes/random';
import type { Joint, MotionState } from './catMotion';
import type { Recipe, SourceLook } from './recipe';

// Base of the black-cat-at-night recipes ("Cat" by J-Toastie, CC-BY 3.0, animated
// procedurally): the model and its fur, the light baked with a single function for both the "video"
// and the points, the procedural materials and the environment sampling. Each recipe provides the
// set, the route and the camera.

export const CAT_SCALE = 0.62;
/** Horizontal distance between the hind and front paws of the standing cat (measured on the rig). */
const PAW_SPAN = 0.3;

// --- light ----------------------------------------------------------------------------------------

export interface Lamp {
  position: Vector3;
  color: Rgb;
  power: number;
  radius: number;
  /** Strength of the reflection on the wet asphalt (0: not reflected). */
  sheen?: number;
}

export interface Lighting {
  lamps: Lamp[];
  moonDirection: Vector3;
  moon: Rgb;
  ambient: Rgb;
  /** Cold rim on the cat's outline as seen from the source camera. */
  rim: Rgb;
  sky: Color;
}

/** Irradiance (linear) at a point with normal n: ambient, street lamps and moon. */
export function irradiance(light: Lighting, p: Vector3, n: Vector3): Rgb {
  const out: Rgb = [light.ambient[0], light.ambient[1], light.ambient[2]];
  for (const lamp of light.lamps) {
    const toLamp = lamp.position.clone().sub(p);
    const d = toLamp.length();
    const k = (lamp.power * Math.max(0, n.dot(toLamp.divideScalar(d)))) / (1 + (d / lamp.radius) ** 2);
    for (let c = 0; c < 3; c++) out[c] += lamp.color[c] * k;
  }
  const moon = Math.max(0, n.dot(light.moonDirection));
  for (let c = 0; c < 3; c++) out[c] += light.moon[c] * moon;
  return out;
}

/** Wet sheen: the puddles return each street lamp as a pool of light. */
export function wetSheen(light: Lighting, p: Vector3): Rgb {
  const out: Rgb = [0, 0, 0];
  for (const lamp of light.lamps) {
    if (!lamp.sheen) continue;
    const dh = Math.hypot(p.x - lamp.position.x, p.z - lamp.position.z);
    const k = lamp.sheen / (1 + (dh / 1.7) ** 2);
    for (let c = 0; c < 3; c++) out[c] += lamp.color[c] * k;
  }
  return [out[0] + 0.006, out[1] + 0.009, out[2] + 0.016];
}

// --- procedural materials (linear albedo) -----------------------------------------------------------

const BRICK_COURSE = 0.0762;
const BRICK_LENGTH = 0.2286;
const MORTAR = 0.011;

/** Brick: staggered courses, per-brick variation, grime near the bottom and streaks of soot. */
export function brick(s: number, t: number, seed: number, tone = 1): Rgb {
  const course = Math.floor(t / BRICK_COURSE);
  const offset = course % 2 ? BRICK_LENGTH / 2 : 0;
  const index = Math.floor((s + offset) / BRICK_LENGTH);
  const inCourse = t - course * BRICK_COURSE;
  const inBrick = s + offset - index * BRICK_LENGTH;
  const grime = 0.55 + 0.45 * smoothstep(0, 1.4, t);
  const streak = 0.75 + 0.25 * valueNoise(s * 1.7 + seed, t * 0.25);
  if (inCourse < MORTAR || inBrick < MORTAR) {
    const m = 0.11 * grime * streak;
    return [m, m * 0.96, m * 0.92];
  }
  const h = hash2(index + seed * 7.1, course);
  const r = (0.12 + 0.09 * h) * tone;
  return [r * grime * streak, r * (0.36 + 0.08 * hash2(index, course + seed)) * grime * streak, r * 0.24 * grime * streak];
}

export interface WindowSpec {
  s: number;
  t: number;
  w: number;
  h: number;
  lit: boolean;
  warmth: number;
  /** Color of the light inside; by default, the usual warm one. */
  glow?: Rgb;
}

export function windowAt(windows: WindowSpec[], s: number, t: number): { window: WindowSpec; frame: boolean } | null {
  for (const window of windows) {
    const ds = s - window.s;
    const dt = t - window.t;
    if (ds >= -0.06 && ds <= window.w + 0.06 && dt >= -0.08 && dt <= window.h + 0.06) {
      const frame = ds < 0.03 || ds > window.w - 0.03 || dt < 0.03 || dt > window.h - 0.03 || Math.abs(ds - window.w / 2) < 0.02;
      return { window, frame: frame || ds < 0 || ds > window.w || dt < 0 || dt > window.h };
    }
  }
  return null;
}

export function stone(s: number, t: number): Rgb {
  const g = 0.2 + 0.08 * valueNoise(s * 3, t * 3) + 0.04 * hash2(Math.floor(s / 0.45), 1);
  return [g, g * 0.97, g * 0.92];
}

export function cardboard(s: number, t: number): Rgb {
  const n = 0.85 + 0.25 * valueNoise(s * 8, t * 8);
  const tape = Math.abs(t - 0.2) < 0.025 ? 0.7 : 1;
  return [0.28 * n * tape, 0.17 * n * tape, 0.08 * n * tape];
}

export function dumpster(face: string, s: number, t: number, paint: Rgb): Rgb {
  const rust = smoothstep(0.62, 0.8, valueNoise(s * 2.3 + (face === 'top' ? 5 : 0), t * 2.3));
  const ribs = face !== 'top' && Math.abs(((s + 0.1) % 0.4) - 0.2) < 0.02 ? 0.7 : 1;
  const lid = face === 'top' ? 0.8 : 1;
  const base = mix3(paint, [0.12, 0.05, 0.02], rust * 0.8);
  return [base[0] * ribs * lid, base[1] * ribs * lid, base[2] * ribs * lid];
}

// --- surfaces -------------------------------------------------------------------------------------

export interface Surface {
  origin: Vector3;
  u: Vector3;
  v: Vector3;
  width: number;
  height: number;
  normal: Vector3;
  albedo: (s: number, t: number) => Rgb;
  emissive?: (s: number, t: number) => Rgb | null;
  /** Point density multiplier. */
  density?: number;
  /** Own texture for the source frame (otherwise, a flat color). */
  texture?: number;
  wet?: (s: number, t: number) => number;
}

export interface BoxOptions {
  texture?: number;
  skipBottom?: boolean;
  emissive?: (face: string) => Rgb | null;
  /** Point density multiplier for every face. */
  density?: number;
}

/** Factor on the model's albedo (body 0.179 → 0.025): black fur. */
const BLACK_FUR = 0.14;

export abstract class CatRecipe implements Recipe {
  abstract readonly id: string;
  abstract readonly title: string;
  abstract readonly defaults: BakeParams;
  abstract readonly generatorName: string;
  readonly subject = new Group();
  readonly world = new Group();
  readonly lights: Object3D[] = [];
  parts: SkinPart[] = [];
  abstract readonly pointSize: { static: number; dynamic: number };

  /** Scene light, shared by the source frame and the points. */
  protected abstract readonly lighting: Lighting;
  /** Duration the animation is written for: other values of `duration` stretch it. */
  protected abstract readonly motionDuration: number;
  /** Box for the airborne dust. */
  protected abstract readonly floaterBox: { min: [number, number, number]; max: [number, number, number] };
  /** Airborne dust per background point and per unit of `depthNoise`. */
  protected readonly floaterRate: number = 0.002;

  protected params!: BakeParams;
  protected surfaces: Surface[] = [];
  private bones = new Map<string, Bone>();
  private rest = new Map<string, Quaternion>();
  private body!: SkinPart;
  private eyeParts = new Set<SkinPart>();
  private colorFrame = -1;
  private cameraCache = new Map<number, Vector3>();
  /** Sign that points the winding-derived normals outward (the rig comes with a reflection). */
  private normalSign = new Map<SkinPart, number>();

  /** State of the cat at time t (s) of the animation. */
  protected abstract motion(t: number): MotionState;
  /** Builds the set (surfaces) for `this.params`. */
  protected abstract build(): void;
  abstract cameraAt(frame: number, aspect: number): PackCamera;

  /**
   * Optional hook: prepares the freshly loaded model, before its bones are registered (for example,
   * to add a spine). Recipes that do not define it do not change at all.
   */
  protected prepareModel?(model: Group): void;
  /**
   * Optional hook: adjusts the pose after forward kinematics and before ground contact (for example,
   * leg IK, spine and gaze). It receives the state at that instant and the bones by name.
   */
  protected refinePose?(state: MotionState, bones: ReadonlyMap<string, Bone>): void;

  /** Animation time at frame f. */
  protected motionTime(frame: number): number {
    return (frame / this.params.fps) * (this.motionDuration / this.params.duration);
  }

  async load(): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(catUrl);
    const model = gltf.scene;
    model.scale.setScalar(CAT_SCALE);
    this.subject.add(model);
    this.prepareModel?.(model);
    model.traverse((object) => {
      if ((object as Bone).isBone) {
        this.bones.set(object.name, object as Bone);
        this.rest.set(object.name, object.quaternion.clone());
      }
      if (!(object as SkinnedMesh).isSkinnedMesh) return;
      const mesh = object as SkinnedMesh;
      mesh.frustumCulled = false;
      const material = mesh.material as Material & { color: Color; name: string };
      const vertexCount = mesh.geometry.attributes.position.count;
      const indices = mesh.geometry.index?.array ?? Array.from({ length: vertexCount }, (_, i) => i);
      const eye = material.name === 'eye_green';
      // The model comes as a mid-gray cat: the fur (and the nose and ears) is darkened to a black cat.
      const fur = eye ? 1 : BLACK_FUR;
      const part: SkinPart = { mesh, albedo: [material.color.r * fur, material.color.g * fur, material.color.b * fur], indices, vertexCount };
      if (eye) this.eyeParts.add(part);
      this.parts.push(part);
      // The source frame uses the same baked light as the points: per-vertex colors, no lights.
      mesh.geometry.setAttribute('color', new BufferAttribute(new Float32Array(vertexCount * 3), 3));
      mesh.material = new MeshBasicMaterial({ vertexColors: true });
    });
    if (this.parts.length === 0) throw new Error('The model has no skinned meshes');
    this.body = this.parts.reduce((a, b) => (b.vertexCount > a.vertexCount ? b : a));
    this.subject.updateMatrixWorld(true);
    for (const part of this.parts) this.normalSign.set(part, outwardSign(part));
    for (const joint of ['Root', 'Neck', 'Head', 'Tail01', 'UpperLeftLeg', 'UpperLeftSecondLeg']) {
      if (!this.bones.has(joint)) throw new Error(`The cat rig has no ${joint} bone`);
    }
  }

  setup(params: BakeParams): void {
    this.params = { ...params };
    this.world.clear();
    this.surfaces = [];
    this.colorFrame = -1;
    this.cameraCache.clear();
    this.build();
    this.buildMeshes();
  }

  /** A box as five or six rectangles with outward normals. */
  protected box(min: Vector3, max: Vector3, albedo: (face: string, s: number, t: number) => Rgb, options: BoxOptions = {}): void {
    const size = max.clone().sub(min);
    const faces: [string, Vector3, Vector3, Vector3, number, number, Vector3][] = [
      ['top', new Vector3(min.x, max.y, max.z), new Vector3(1, 0, 0), new Vector3(0, 0, -1), size.x, size.z, new Vector3(0, 1, 0)],
      ['front', new Vector3(min.x, min.y, min.z), new Vector3(1, 0, 0), new Vector3(0, 1, 0), size.x, size.y, new Vector3(0, 0, -1)],
      ['back', new Vector3(max.x, min.y, max.z), new Vector3(-1, 0, 0), new Vector3(0, 1, 0), size.x, size.y, new Vector3(0, 0, 1)],
      ['left', new Vector3(min.x, min.y, max.z), new Vector3(0, 0, -1), new Vector3(0, 1, 0), size.z, size.y, new Vector3(-1, 0, 0)],
      ['right', new Vector3(max.x, min.y, min.z), new Vector3(0, 0, 1), new Vector3(0, 1, 0), size.z, size.y, new Vector3(1, 0, 0)],
    ];
    if (!options.skipBottom) faces.push(['bottom', new Vector3(min.x, min.y, min.z), new Vector3(1, 0, 0), new Vector3(0, 0, 1), size.x, size.z, new Vector3(0, -1, 0)]);
    for (const [face, origin, u, v, width, height, normal] of faces) {
      const emission = options.emissive?.(face) ?? null;
      this.surfaces.push({
        origin,
        u,
        v,
        width,
        height,
        normal,
        albedo: (s, t) => albedo(face, s, t),
        emissive: emission ? () => emission : undefined,
        texture: options.texture && width * height > 0.2 ? options.texture : undefined,
        density: options.density,
      });
    }
  }

  /** Baked color of a point on a surface. */
  private litSurface(surface: Surface, s: number, t: number, p: Vector3): Rgb {
    const a = surface.albedo(s, t);
    const e = irradiance(this.lighting, p, surface.normal);
    const out: Rgb = [a[0] * e[0], a[1] * e[1], a[2] * e[2]];
    const wet = surface.wet?.(s, t) ?? 0;
    if (wet > 0) {
      const sheen = wetSheen(this.lighting, p);
      for (let k = 0; k < 3; k++) out[k] += sheen[k] * wet;
    }
    const glow = surface.emissive?.(s, t);
    if (glow) for (let k = 0; k < 3; k++) out[k] += glow[k];
    return out;
  }

  /** Source-frame meshes: each surface with its light baked into a texture (or a flat color). */
  private buildMeshes(): void {
    const P = new Vector3();
    for (const surface of this.surfaces) {
      const geometry = new PlaneGeometry(surface.width, surface.height);
      const basis = new Matrix4().makeBasis(surface.u, surface.v, surface.u.clone().cross(surface.v));
      const center = surface.origin.clone().addScaledVector(surface.u, surface.width / 2).addScaledVector(surface.v, surface.height / 2);
      geometry.applyMatrix4(basis.setPosition(center));
      let material: MeshBasicMaterial;
      if (surface.texture) {
        const w = Math.max(2, Math.round(surface.width * surface.texture));
        const h = Math.max(2, Math.round(surface.height * surface.texture));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const image = new ImageData(w, h);
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w; i++) {
            const s = ((i + 0.5) / w) * surface.width;
            const t = (1 - (j + 0.5) / h) * surface.height;
            P.copy(surface.origin).addScaledVector(surface.u, s).addScaledVector(surface.v, t);
            const c = this.litSurface(surface, s, t, P);
            const o = (j * w + i) * 4;
            image.data[o] = toSrgb8(c[0]);
            image.data[o + 1] = toSrgb8(c[1]);
            image.data[o + 2] = toSrgb8(c[2]);
            image.data[o + 3] = 255;
          }
        }
        canvas.getContext('2d')!.putImageData(image, 0, 0);
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        material = new MeshBasicMaterial({ map: texture, side: DoubleSide });
      } else {
        P.copy(surface.origin).addScaledVector(surface.u, surface.width / 2).addScaledVector(surface.v, surface.height / 2);
        const c = this.litSurface(surface, surface.width / 2, surface.height / 2, P);
        material = new MeshBasicMaterial({ color: new Color(c[0], c[1], c[2]), side: DoubleSide });
      }
      this.world.add(new Mesh(geometry, material));
    }
  }

  pose(frame: number): void {
    const state = this.motion(this.motionTime(frame));
    const zAxis = new Vector3(0, 0, 1);
    const xAxis = new Vector3(1, 0, 0);
    const q = new Quaternion();
    for (const [name, bone] of this.bones) {
      bone.quaternion.copy(this.rest.get(name)!);
      const delta = state.pose[name as Joint];
      if (delta?.z) bone.quaternion.multiply(q.setFromAxisAngle(zAxis, delta.z));
      if (delta?.x) bone.quaternion.multiply(q.setFromAxisAngle(xAxis, delta.x));
    }
    this.subject.position.copy(state.anchor);
    // Euler XYZ: first the tilt about the model's Z, then the heading.
    this.subject.rotation.set(0, state.heading, state.pitch ?? 0);
    this.subject.updateMatrixWorld(true);
    this.refinePose?.(state, this.bones);

    // Contact: the lowest part of the body rests exactly on the surface it stands on.
    if (state.support !== null) {
      this.restOn(state.support);
      if (state.frontSupport !== undefined) {
        // Two supports: if the front legs go through their stair step, the body is tilted (two passes).
        const forward = new Vector3(Math.cos(state.heading), 0, -Math.sin(state.heading));
        for (let pass = 0; pass < 2; pass++) {
          const below = state.frontSupport + 0.002 - this.lowest(forward);
          if (below <= 0) break;
          this.subject.rotation.z += Math.atan2(below, PAW_SPAN);
          this.subject.updateMatrixWorld(true);
          this.restOn(state.support);
        }
      }
    }
    this.paintVertices(frame);
  }

  /** Rests the lowest part of the body on the `support` height. */
  private restOn(support: number): void {
    const v = skinVertices(this.body);
    let minY = Infinity;
    for (let i = 1; i < v.length; i += 3) minY = Math.min(minY, v[i]);
    this.subject.position.y += support + 0.002 - minY;
    this.subject.updateMatrixWorld(true);
  }

  /** Height of the lowest vertex of the front half of the body (according to the heading). */
  private lowest(forward: Vector3): number {
    const v = skinVertices(this.body);
    const { x, z } = this.subject.position;
    let minY = Infinity;
    for (let i = 0; i < v.length; i += 3) {
      if ((v[i] - x) * forward.x + (v[i + 2] - z) * forward.z > 0.05) minY = Math.min(minY, v[i + 1]);
    }
    return minY;
  }

  /** Per-vertex colors of the frame with the same light as the points (for the source frame). */
  private paintVertices(frame: number): void {
    if (this.colorFrame === frame) return;
    this.colorFrame = frame;
    const normal = new Vector3();
    const P = new Vector3();
    for (const part of this.parts) {
      const v = skinVertices(part);
      const normals = new Float32Array(v.length);
      for (let i = 0; i < part.indices.length; i += 3) {
        const a = part.indices[i];
        const b = part.indices[i + 1];
        const c = part.indices[i + 2];
        const ab = new Vector3(v[b * 3] - v[a * 3], v[b * 3 + 1] - v[a * 3 + 1], v[b * 3 + 2] - v[a * 3 + 2]);
        const ac = new Vector3(v[c * 3] - v[a * 3], v[c * 3 + 1] - v[a * 3 + 1], v[c * 3 + 2] - v[a * 3 + 2]);
        const n = ab.cross(ac);
        for (const index of [a, b, c]) {
          normals[index * 3] += n.x;
          normals[index * 3 + 1] += n.y;
          normals[index * 3 + 2] += n.z;
        }
      }
      const colors = part.mesh.geometry.attributes.color as BufferAttribute;
      for (let i = 0; i < part.vertexCount; i++) {
        normal.fromArray(normals, i * 3).normalize();
        P.fromArray(v, i * 3);
        const c = this.shadeSubject(part.albedo, P, normal, frame, part);
        colors.setXYZ(i, c[0], c[1], c[2]);
      }
      colors.needsUpdate = true;
    }
  }

  /** Source camera position for a frame (cached: the rim light queries it per point). */
  private cameraPosition(frame: number): Vector3 {
    let cached = this.cameraCache.get(frame);
    if (!cached) {
      cached = new Vector3(...this.cameraAt(frame, 16 / 9).pos);
      this.cameraCache.set(frame, cached);
    }
    return cached;
  }

  focus(): Vector3 {
    return this.subject.position.clone().add(new Vector3(0, 0.2, 0));
  }

  shadeSubject(albedo: Rgb, point: Vector3, normal: Vector3, frame: number, part: SkinPart): Rgb {
    // The eyes reflect the light: they shine in the dark.
    if (this.eyeParts.has(part)) return [albedo[0] * 1.2, albedo[1] * 1.2, albedo[2] * 1.2];
    normal = normal.clone().multiplyScalar(this.normalSign.get(part) ?? 1);
    const e = irradiance(this.lighting, point, normal);
    const camera = this.cameraPosition(frame);
    const view = new Vector3(camera.x - point.x, camera.y - point.y, camera.z - point.z).normalize();
    // Thin cold rim on the outline as seen from the source camera: it separates the black cat from the
    // background without lightening it. Symmetric in |n·v| so the hidden side (which the 3D viewer does
    // show) stays dark.
    const rim = Math.pow(1 - Math.abs(normal.dot(view)), 6);
    const RIM = this.lighting.rim;
    return [albedo[0] * e[0] + RIM[0] * rim, albedo[1] * e[1] + RIM[1] * rim, albedo[2] * e[2] + RIM[2] * rim];
  }

  environment(cameras: PackCamera[]): PointSet {
    const random = stream(this.params.seed, 'environment');
    const writer = environmentWriter(random, this.params.depthNoise, cameras);
    const P = writer.P;
    for (const surface of this.surfaces) {
      const count = Math.round(this.params.envDensity * (surface.density ?? 1) * surface.width * surface.height);
      for (let i = 0; i < count; i++) {
        const s = random() * surface.width;
        const t = random() * surface.height;
        P.copy(surface.origin).addScaledVector(surface.u, s).addScaledVector(surface.v, t);
        writer.push(this.litSurface(surface, s, t, P.clone()));
      }
    }
    // Dust and moisture in the alley air.
    writer.floaters(Math.round((writer.positions.length / 3) * this.floaterRate * this.params.depthNoise), this.floaterBox);
    return writer.result();
  }

  sourceLook(): SourceLook {
    return { background: this.lighting.sky, fog: new Fog(this.lighting.sky, 12, 34), shadows: false };
  }
}

// ---------------------------------------------------------------------------------------------

/** +1 if the winding normals point away from the part's centroid, −1 otherwise. */
function outwardSign(part: SkinPart): number {
  const v = skinVertices(part);
  const center = new Vector3();
  for (let i = 0; i < v.length; i += 3) center.add(new Vector3(v[i], v[i + 1], v[i + 2]));
  center.divideScalar(v.length / 3);
  let sum = 0;
  for (let i = 0; i < part.indices.length; i += 3) {
    const [a, b, c] = [part.indices[i], part.indices[i + 1], part.indices[i + 2]].map((k) => new Vector3(v[k * 3], v[k * 3 + 1], v[k * 3 + 2]));
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    sum += n.dot(a.clone().add(b).add(c).divideScalar(3).sub(center));
  }
  return sum < 0 ? -1 : 1;
}

/** Catmull-Rom path through keys [t, x, y, z] (with the ends repeated). */
export function interpolateKeys(keys: [number, number, number, number][], t: number): Vector3 {
  if (t <= keys[0][0]) return new Vector3(keys[0][1], keys[0][2], keys[0][3]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, ...a] = keys[i];
    const [t1, ...b] = keys[i + 1];
    if (t <= t1) {
      // Catmull-Rom with the neighbors (or the ends) for a continuous path.
      const prev = keys[Math.max(0, i - 1)].slice(1);
      const next = keys[Math.min(keys.length - 1, i + 2)].slice(1);
      const u = (t - t0) / (t1 - t0);
      const u2 = u * u;
      const u3 = u2 * u;
      const out = [0, 1, 2].map((k) =>
        0.5 * (2 * a[k] + (-prev[k] + b[k]) * u + (2 * prev[k] - 5 * a[k] + 4 * b[k] - next[k]) * u2 + (-prev[k] + 3 * a[k] - 3 * b[k] + next[k]) * u3),
      );
      return new Vector3(out[0], out[1], out[2]);
    }
  }
  const last = keys[keys.length - 1];
  return new Vector3(last[1], last[2], last[3]);
}
