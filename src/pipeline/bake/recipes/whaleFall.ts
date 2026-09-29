import { BufferAttribute, BufferGeometry, Color, Group, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Vector3, type Object3D } from 'three';
import type { PackCamera } from '../../../engine/pack/format';
import type { PointSet } from '../../../engine/pack/writer';
import { WHALE_FALL, fallState, redshiftColor, type FallState, type Rgb, type Vec3 } from '../../scenes/whaleFall';
import { diskModulation, diskRadiance } from '../../scenes/whaleFallSky';
import { handheld, type BakeParams, type SkinPart } from '../common';
import type { Recipe, SourceLook } from './recipe';
import { buildWhale, partParamsAt, whaleAlbedo, whaleKinematics, writePart, type WhaleKinematics, type WhalePart } from './whaleFallBody';
import { environmentPoints, lensSky, skyTextures, type SkyTextures } from './whaleFallSky';

// The "whale-fall" recipe (D9): a humpback whale computed from our own equations spirals down into a
// black hole. Its fluke stroke advances with its proper time τ (it looks slower near the horizon) and
// its color shifts to red with √(1 − r_s/r). The accretion disk lights it from below and the cold sky
// from above; a distant probe follows it. The physics lives in src/pipeline/scenes/whaleFall.ts,
// shared with the page.

export const WHALE_DEFAULTS: BakeParams = {
  name: 'whale-fall',
  fps: WHALE_FALL.fps,
  duration: WHALE_FALL.duration,
  pointsPerFrame: 5000,
  // Points per m² of the disk; stars, nebulae and ring scale with it.
  envDensity: 1800,
  sourceWidth: 288,
  seed: 1,
  depthNoise: 0.12,
  subjectDepthNoise: 0.06,
};

/** Emitters through which the disk lights the whale: rings × sectors. */
const EMITTER_RINGS = 12;
const EMITTER_SECTORS = 36;
/** Exposure of the disk light on the whale. */
const DISK_LIGHT = 3.2;
/** Starlight (cold ambient) and a cold rim toward the probe. */
const STARLIGHT: Rgb = [0.006, 0.0075, 0.011];
const RIM: Rgb = [0.1, 0.13, 0.18];
/**
 * Cold fill from above (the sky away from the disk): much stronger than the real starlight, on
 * purpose. Without it the black back disappears against the void and the whale reads as a white
 * blotch; with it the shot keeps its two-color lighting: warm disk below, cold sky above.
 */
const SKY_FILL: Rgb = [0.4, 0.56, 1.05];

interface FrameLight {
  state: FallState;
  k: WhaleKinematics;
  /** Light from each disk emitter toward the whale (with its Doppler shift). */
  emitters: Rgb[];
  /** Probe position (for the cold rim). */
  camera: Vec3;
}

interface Emitter {
  position: Vec3;
  /** Area it represents (m²); it multiplies the radiance computed with the sector's mean modulation. */
  weight: number;
  modulation: number;
}

export class WhaleFall implements Recipe {
  readonly id = 'whale-fall';
  readonly title = 'Humpback whale falling into a black hole (own equations, synthetic)';
  readonly defaults = WHALE_DEFAULTS;
  readonly generatorName = '4d-os /bake · whale-fall';
  readonly subject = new Group();
  readonly world = new Group();
  readonly lights: Object3D[] = [];
  parts: SkinPart[] = [];
  readonly pointSize = { static: 0.05, dynamic: 0.016 };
  readonly stableSubject = true;

  private params: BakeParams = WHALE_DEFAULTS;
  private whale: WhalePart[] = [];
  private partNames = new Map<SkinPart, WhalePart>();
  /** Albedo of each vertex (it does not change between frames). */
  private albedos = new Map<WhalePart, Float32Array>();
  private posedFrame = -1;
  private kinematics = new Map<number, FrameLight>();
  private cameraCache = new Map<number, PackCamera>();
  private emitters: Emitter[] = [];
  private textures: { key: string; value: SkyTextures } | null = null;

  async load(): Promise<void> {
    this.whale = buildWhale();
    for (const part of this.whale) {
      const geometry = new BufferGeometry();
      geometry.setIndex(new BufferAttribute(part.indices, 1));
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(part.vertexCount * 3), 3));
      geometry.setAttribute('color', new BufferAttribute(new Float32Array(part.vertexCount * 3), 3));
      // The source frame uses the same baked light as the points: vertex colors, no lights.
      const mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true }));
      mesh.frustumCulled = false;
      mesh.name = part.name;
      this.subject.add(mesh);
      const skin: SkinPart = { mesh, albedo: [1, 1, 1], indices: part.indices, vertexCount: part.vertexCount };
      this.parts.push(skin);
      this.partNames.set(skin, part);
      const albedo = new Float32Array(part.vertexCount * 3);
      for (let i = 0; i < part.vertexCount; i++) albedo.set(whaleAlbedo(part.name, part.params.subarray(i * 3, i * 3 + 3)), i * 3);
      this.albedos.set(part, albedo);
    }
    this.emitters = diskEmitters();
    this.subject.updateMatrixWorld(true);
  }

  setup(params: BakeParams): void {
    this.params = { ...params };
    this.posedFrame = -1;
    this.kinematics.clear();
    this.cameraCache.clear();
    this.world.clear();
    const key = `${params.seed}:${params.envDensity}`;
    if (this.textures?.key !== key) this.textures = { key, value: skyTextures(params.seed, params.envDensity) };
    this.world.add(lensSky(this.textures.value));
  }

  /** Coordinate time of the frame. */
  private time(frame: number): number {
    return frame / this.params.fps;
  }

  /** State, kinematics and disk light on the whale at the frame (cached: it is a function of the frame). */
  private frameState(frame: number): FrameLight {
    let cached = this.kinematics.get(frame);
    if (!cached) {
      const state = fallState(this.time(frame));
      // Each emitter shines toward the whale with its Doppler shift (the approaching side of the disk is
      // bluer) and somewhat blueshifted by falling into the well (only halfway, so the final fade-out
      // shows); on the way out, `shade` redshifts and dims what it reflects.
      const center = state.position;
      const emitters = this.emitters.map((emitter) => {
        const d: Vec3 = [center[0] - emitter.position[0], center[1] - emitter.position[1], center[2] - emitter.position[2]];
        const l = Math.hypot(...d);
        const c = diskRadiance(emitter.position, [d[0] / l, d[1] / l, d[2] / l], emitter.modulation, Math.sqrt(state.dilation));
        return [c[0] * emitter.weight, c[1] * emitter.weight, c[2] * emitter.weight] as Rgb;
      });
      cached = { state, k: whaleKinematics(state), emitters, camera: this.cameraAt(frame, 16 / 9).pos };
      if (this.kinematics.size > 8) this.kinematics.clear();
      this.kinematics.set(frame, cached);
    }
    return cached;
  }

  pose(frame: number): void {
    if (this.posedFrame === frame) return;
    this.posedFrame = frame;
    const { k } = this.frameState(frame);
    for (const skin of this.parts) {
      const part = this.partNames.get(skin)!;
      const position = skin.mesh.geometry.attributes.position as BufferAttribute;
      writePart(part, k, position.array as Float32Array);
      position.needsUpdate = true;
    }
    this.paintVertices(frame);
    this.subject.updateMatrixWorld(true);
  }

  /** Vertex colors with the same light as the points (for the source frame). */
  private paintVertices(frame: number): void {
    const P = new Vector3();
    const N = new Vector3();
    const albedo: Rgb = [0, 0, 0];
    for (const skin of this.parts) {
      const part = this.partNames.get(skin)!;
      const albedos = this.albedos.get(part)!;
      const v = (skin.mesh.geometry.attributes.position as BufferAttribute).array as Float32Array;
      const normals = vertexNormals(v, part.indices, part.vertexCount);
      const colors = skin.mesh.geometry.attributes.color as BufferAttribute;
      for (let i = 0; i < part.vertexCount; i++) {
        P.fromArray(v, i * 3);
        N.fromArray(normals, i * 3);
        albedo[0] = albedos[i * 3];
        albedo[1] = albedos[i * 3 + 1];
        albedo[2] = albedos[i * 3 + 2];
        const c = this.shade(albedo, P, N, frame);
        colors.setXYZ(i, c[0], c[1], c[2]);
      }
      colors.needsUpdate = true;
    }
  }

  focus(): Vector3 {
    const { state } = this.frameState(Math.max(0, this.posedFrame));
    return new Vector3(...state.position);
  }

  shadeSubject(_albedo: Rgb, point: Vector3, normal: Vector3, frame: number, skin: SkinPart): Rgb {
    const part = this.partNames.get(skin)!;
    const { k } = this.frameState(frame);
    const albedo = whaleAlbedo(part.name, partParamsAt(part.name, k, [point.x, point.y, point.z]));
    return this.shade(albedo, point, normal, frame);
  }

  /** Baked light: the disk from below (with Doppler), the stars and a cold rim; then, the redshift. */
  private shade(albedo: Rgb, point: Vector3, normal: Vector3, frame: number): Rgb {
    const { state, emitters, camera } = this.frameState(frame);
    // Hemisphere: full toward +y, nothing toward the disk.
    const sky = Math.max(0, 0.5 + 0.5 * normal.y) ** 2;
    const e: Rgb = [STARLIGHT[0] + SKY_FILL[0] * sky, STARLIGHT[1] + SKY_FILL[1] * sky, STARLIGHT[2] + SKY_FILL[2] * sky];
    for (let i = 0; i < this.emitters.length; i++) {
      const p = this.emitters[i].position;
      const dx = p[0] - point.x;
      const dy = p[1] - point.y;
      const dz = p[2] - point.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const d = Math.sqrt(d2);
      const lambert = Math.max(0, (normal.x * dx + normal.y * dy + normal.z * dz) / d);
      if (lambert <= 0) continue;
      // The disk emits from both faces, like a Lambertian surface (|cos| with its normal).
      const k = (DISK_LIGHT * lambert * Math.abs(dy / d)) / (d2 + 0.35);
      const c = emitters[i];
      e[0] += c[0] * k;
      e[1] += c[1] * k;
      e[2] += c[2] * k;
    }
    const vx = camera[0] - point.x;
    const vy = camera[1] - point.y;
    const vz = camera[2] - point.z;
    const vl = Math.hypot(vx, vy, vz);
    const rim = Math.pow(1 - Math.abs((normal.x * vx + normal.y * vy + normal.z * vz) / vl), 5);
    const lit: Rgb = [albedo[0] * e[0] + RIM[0] * rim, albedo[1] * e[1] + RIM[1] * rim, albedo[2] * e[2] + RIM[2] * rim];
    return redshiftColor(lit, state.dilation);
  }

  cameraAt(frame: number, aspect: number): PackCamera {
    const cached = this.cameraCache.get(frame);
    if (cached) return { ...cached, aspect };
    const t = this.time(frame);
    // A short average of the probe's path: no jerks even when the framing changes act.
    const position = new Vector3();
    const target = new Vector3();
    let roll = 0;
    let fov = 0;
    const offsets = [-0.24, -0.12, 0, 0.12, 0.24];
    for (const dt of offsets) {
      const probe = probeAt(Math.max(0, t + dt));
      position.add(probe.position);
      target.add(probe.target);
      roll += probe.roll / offsets.length;
      fov += probe.fov / offsets.length;
    }
    position.divideScalar(offsets.length);
    target.divideScalar(offsets.length);
    // Probe drift (smoother than a handheld camera).
    const drift = handheld(this.params.seed, t * 0.6, 0.35);
    position.add(new Vector3(drift[0], drift[1], drift[2]));
    const matrix = new Matrix4().lookAt(position, target, new Vector3(0, 1, 0));
    const quaternion = new Quaternion().setFromRotationMatrix(matrix);
    quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), drift[3] + roll));
    const camera: PackCamera = {
      pos: [position.x, position.y, position.z],
      quat: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      fov,
      aspect,
    };
    this.cameraCache.set(frame, camera);
    return camera;
  }

  environment(cameras: PackCamera[]): PointSet {
    return environmentPoints(this.params.seed, this.params.envDensity, this.params.depthNoise, cameras);
  }

  sourceLook(): SourceLook {
    return { background: new Color(0, 0, 0), fog: null, shadows: false };
  }
}

// --- probe ---------------------------------------------------------------------------------------------

/**
 * Probe framings over time: [t, back, out, up, gaze toward the hole, lead, probe roll, field of view]
 * (m, rad and degrees). The probe is the distant observer (its clock is t, the visitor's): it stays
 * at 8–10 r_s while the whale falls, and frames it inside the shadow with the lensed disk around it.
 * Three acts: the whale's profile over the shadow and the disk; the spiral, with the full iris
 * (shadow, photon ring and the two arcs of the disk) and a slight roll; and the ending without roll,
 * with the whale red and still in the pupil, which rhymes with the first frame.
 */
const PROBE_KEYS: number[][] = [
  [0, 0.4, 3.4, 0.9, 0.15, 0, 0, 40],
  [3.5, 2.0, 4.2, 1.5, 0.05, 0.2, -0.12, 34],
  [7, 2.7, 4.7, 1.8, 0, 0.2, -0.16, 31],
  [11, 2.0, 5.7, 1.4, 0, 0.1, -0.08, 30],
  [15, 1.2, 6.3, 1.2, 0, 0.1, 0, 30],
];

/** Framing interpolated with Hermite and Catmull-Rom tangents: the probe does not stop at each key. */
function probeKeys(t: number): number[] {
  const keys = PROBE_KEYS;
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const [t0] = keys[i];
  const [t1] = keys[i + 1];
  const h = t1 - t0;
  const u = (t - t0) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  // Tangent at key j (per second); zero at the ends of the clip.
  const tangent = (j: number, k: number) => (j === 0 || j === n - 1 ? 0 : (keys[j + 1][k] - keys[j - 1][k]) / (keys[j + 1][0] - keys[j - 1][0]));
  const out: number[] = [];
  for (let k = 1; k < keys[0].length; k++) {
    const a = keys[i][k];
    const b = keys[i + 1][k];
    out.push((2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * h * tangent(i, k) + (-2 * u3 + 3 * u2) * b + (u3 - u2) * h * tangent(i + 1, k));
  }
  return out;
}

function probeAt(t: number): { position: Vector3; target: Vector3; roll: number; fov: number } {
  const state = fallState(t);
  const P = new Vector3(...state.position);
  const forward = new Vector3(state.forward[0], 0, state.forward[2]).normalize();
  const out = new Vector3(P.x, 0, P.z).normalize();
  const [back, outward, up, hole, lead, roll, fov] = probeKeys(t);
  const position = P.clone().addScaledVector(forward, -back).addScaledVector(out, outward).add(new Vector3(0, up, 0));
  const target = P.clone().addScaledVector(forward, lead).addScaledVector(P, -hole);
  return { position, target, roll, fov };
}

// --- disk light ----------------------------------------------------------------------------------------

/** Emitters spread over the disk by area, with the mean modulation of their sector. */
function diskEmitters(): Emitter[] {
  const { inner, outer } = WHALE_FALL.disk;
  const out: Emitter[] = [];
  for (let i = 0; i < EMITTER_RINGS; i++) {
    const r0 = Math.sqrt(inner ** 2 + (i / EMITTER_RINGS) * (outer ** 2 - inner ** 2));
    const r1 = Math.sqrt(inner ** 2 + ((i + 1) / EMITTER_RINGS) * (outer ** 2 - inner ** 2));
    const r = (r0 + r1) / 2;
    for (let j = 0; j < EMITTER_SECTORS; j++) {
      const a0 = (2 * Math.PI * j) / EMITTER_SECTORS;
      const a = a0 + Math.PI / EMITTER_SECTORS;
      let modulation = 0;
      for (let k = 0; k < 4; k++) modulation += diskModulation(r0 + ((k + 0.5) / 4) * (r1 - r0), a0 + ((k + 0.5) / 4) * ((2 * Math.PI) / EMITTER_SECTORS)) / 4;
      out.push({
        position: [r * Math.cos(a), 0, -r * Math.sin(a)],
        weight: (Math.PI * (r1 ** 2 - r0 ** 2)) / EMITTER_SECTORS,
        modulation,
      });
    }
  }
  return out;
}

/** Per-vertex normals (area-weighted average of the faces). */
function vertexNormals(v: Float32Array, indices: ArrayLike<number>, count: number): Float32Array {
  const n = new Float32Array(count * 3);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const abx = v[b] - v[a];
    const aby = v[b + 1] - v[a + 1];
    const abz = v[b + 2] - v[a + 2];
    const acx = v[c] - v[a];
    const acy = v[c + 1] - v[a + 1];
    const acz = v[c + 2] - v[a + 2];
    const x = aby * acz - abz * acy;
    const y = abz * acx - abx * acz;
    const z = abx * acy - aby * acx;
    for (const k of [a, b, c]) {
      n[k] += x;
      n[k + 1] += y;
      n[k + 2] += z;
    }
  }
  for (let i = 0; i < count; i++) {
    const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1;
    n[i * 3] /= l;
    n[i * 3 + 1] /= l;
    n[i * 3 + 2] /= l;
  }
  return n;
}
