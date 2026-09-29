import {
  AnimationClip,
  AnimationMixer,
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  SkinnedMesh,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import deerUrl from '../../models/deer/Deer.glb?url';
import type { PackCamera } from '../../../engine/pack/format';
import type { PointSet } from '../../../engine/pack/writer';
import {
  environmentWriter,
  handheld,
  hash2,
  mix3,
  srgb,
  toSrgb8,
  valueNoise,
  type BakeParams,
  type Rgb,
  type SkinPart,
} from '../common';
import { smoothstep } from '../../scenes/math';
import { stream } from '../../scenes/random';
import type { Recipe, SourceLook } from './recipe';

// The original recipe: a deer gallops in an S across a meadow with tree trunks, followed by a handheld camera.

const MEADOW = { halfX: 40, halfZ: 28 };
const DEER_SCALE = 0.48;
/** Slow-motion gallop: one stride every ~1.6 s, like a clip filmed at high speed. */
const GALLOP_TIME_SCALE = 0.4;
const TRUNK_COUNT = 44;
/** Extra trunks in the edge band: they hide the end of the world. */
const TREELINE_COUNT = 40;
const TREELINE_BAND = 7;
/** Fraction of light (birch) trunks: they supply the highlights the dither needs. */
const BIRCH_FRACTION = 0.6;
const TRUNK_DENSITY_FACTOR = 2.5;

const UP = new Vector3(0, 1, 0);
const SUN = new Vector3(0.45, 0.8, 0.35).normalize();
const AMBIENT = 0.42;
const SUN_INTENSITY = 0.62;

const MOSS = srgb(0.23, 0.31, 0.15);
const MEADOW_GREEN = srgb(0.42, 0.5, 0.24);
const MEADOW_LIGHT = srgb(0.63, 0.63, 0.36);
const DRY_EARTH = srgb(0.56, 0.47, 0.32);
/** Trampled grass: darker and duller than the meadow, but green, so it is not confused with the deer. */
const WORN_PATH = srgb(0.33, 0.37, 0.24);
const BARK = srgb(0.3, 0.26, 0.22);
const BIRCH = srgb(0.84, 0.83, 0.78);
const BIRCH_NOTCH = srgb(0.17, 0.16, 0.15);
const SKY = new Color().setRGB(0.78, 0.82, 0.84, SRGBColorSpace);

interface Trunk {
  x: number;
  z: number;
  y: number;
  radius: number;
  height: number;
  birch: boolean;
  /** Seed of the bark notches. */
  seed: number;
}

export const DEER_DEFAULTS: BakeParams = {
  name: 'deer-synthetic',
  fps: 15,
  duration: 20,
  pointsPerFrame: 5000,
  envDensity: 80,
  sourceWidth: 320,
  seed: 1,
  depthNoise: 0.5,
};

export class DeerMeadow implements Recipe {
  readonly id = 'deer-meadow';
  readonly title = 'Deer, crossing a meadow (CC0)';
  readonly defaults = DEER_DEFAULTS;
  readonly generatorName = '4d-os /bake';
  readonly subject = new Group();
  readonly world = new Group();
  readonly lights: Object3D[];
  parts: SkinPart[] = [];

  private params: BakeParams = { ...DEER_DEFAULTS };
  private path!: CatmullRomCurve3;
  private cameraTrack!: CatmullRomCurve3;
  private trunks: Trunk[] = [];
  private pathField!: DistanceField;
  private mixer!: AnimationMixer;
  private readonly sun = new DirectionalLight(0xffffff, 2.2);

  constructor() {
    const hemi = new HemisphereLight(0xdfe8ef, 0x5a5a3a, 1.6);
    this.sun.position.copy(SUN).multiplyScalar(30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const shadowCam = this.sun.shadow.camera;
    shadowCam.left = shadowCam.bottom = -5;
    shadowCam.right = shadowCam.top = 5;
    shadowCam.near = 1;
    shadowCam.far = 80;
    this.lights = [hemi, this.sun, this.sun.target];
  }

  async load(): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(deerUrl);
    const model = gltf.scene;
    model.scale.setScalar(DEER_SCALE);
    this.subject.add(model);
    model.traverse((object) => {
      if (!(object as SkinnedMesh).isSkinnedMesh) return;
      const mesh = object as SkinnedMesh;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      const material = mesh.material as Material & { color: Color };
      const vertexCount = mesh.geometry.attributes.position.count;
      const indices = mesh.geometry.index?.array ?? Array.from({ length: vertexCount }, (_, i) => i);
      this.parts.push({ mesh, albedo: [material.color.r, material.color.g, material.color.b], indices, vertexCount });
    });
    if (this.parts.length === 0) throw new Error('The model has no skinned meshes');
    const clip = AnimationClip.findByName(gltf.animations, 'Gallop');
    if (!clip) throw new Error('The model has no "Gallop" animation');
    this.mixer = new AnimationMixer(model);
    this.mixer.clipAction(clip).play();
  }

  setup(params: BakeParams): void {
    this.params = { ...params };
    this.world.clear();

    // An S-shaped path inside the meadow, with a margin; the camera follows a smoother parallel track.
    const controls: [number, number][] = [
      [-12, 3.5],
      [-7.5, -1.5],
      [-2.5, 2.5],
      [2.5, -2.5],
      [7.5, 1.5],
      [12, -2],
    ];
    this.path = new CatmullRomCurve3(controls.map(([x, z]) => new Vector3(x, groundHeight(x, z), z)));
    this.cameraTrack = new CatmullRomCurve3(controls.map(([x, z]) => new Vector3(x * 0.95 - 1, 2.2, z * 0.8 - 7.5)));
    this.pathField = distanceField(this.path.getSpacedPoints(400));

    // Trunks: scattered away from the path and the camera track, plus a line along the edge.
    const random = stream(params.seed, 'trunks');
    const pathSamples = this.path.getSpacedPoints(200);
    const trackSamples = this.cameraTrack.getSpacedPoints(200);
    const clear = (x: number, z: number, samples: Vector3[], distance: number) =>
      samples.every((p) => Math.hypot(p.x - x, p.z - z) > distance);
    const place = (x: number, z: number, minGap: number): boolean => {
      if (!clear(x, z, pathSamples, 3.5) || !clear(x, z, trackSamples, 2.5)) return false;
      if (this.trunks.some((t) => Math.hypot(t.x - x, t.z - z) < minGap)) return false;
      const radius = 0.16 + random() * 0.24;
      const height = 6 + random() * 5;
      this.trunks.push({ x, z, y: groundHeight(x, z) - 0.2, radius, height, birch: random() < BIRCH_FRACTION, seed: Math.floor(random() * 1e9) });
      return true;
    };
    this.trunks = [];
    for (let attempt = 0, placed = 0; placed < TRUNK_COUNT && attempt < 8000; attempt++) {
      if (place((random() * 2 - 1) * (MEADOW.halfX - TREELINE_BAND), (random() * 2 - 1) * (MEADOW.halfZ - TREELINE_BAND), 2.2)) placed++;
    }
    for (let attempt = 0, placed = 0; placed < TREELINE_COUNT && attempt < 8000; attempt++) {
      const x = (random() * 2 - 1) * (MEADOW.halfX - 0.8);
      const z = (random() * 2 - 1) * (MEADOW.halfZ - 0.8);
      const inBand = Math.abs(x) > MEADOW.halfX - TREELINE_BAND || Math.abs(z) > MEADOW.halfZ - TREELINE_BAND;
      if (inBand && place(x, z, 1.6)) placed++;
    }

    // World meshes for the source frame, with the same albedos as the points.
    const ground = new PlaneGeometry(MEADOW.halfX * 2, MEADOW.halfZ * 2, MEADOW.halfX * 4, MEADOW.halfZ * 4);
    ground.rotateX(-Math.PI / 2);
    const position = ground.attributes.position;
    const colors = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, groundHeight(x, z));
      colors.set(this.groundAlbedo(x, z), i * 3);
    }
    ground.setAttribute('color', new BufferAttribute(colors, 3));
    ground.computeVertexNormals();
    const groundMesh = new Mesh(ground, new MeshLambertMaterial({ vertexColors: true }));
    groundMesh.receiveShadow = true;
    this.world.add(groundMesh);

    const barkMaterial = new MeshLambertMaterial({ vertexColors: true });
    for (const trunk of this.trunks) {
      const radial = 16;
      const rows = Math.ceil(trunk.height / 0.1);
      const geometry = new CylinderGeometry(trunk.radius * 0.85, trunk.radius, trunk.height, radial, rows);
      const vertices = geometry.attributes.position;
      const trunkColors = new Float32Array(vertices.count * 3);
      for (let i = 0; i < vertices.count; i++) {
        const angle = Math.atan2(vertices.getZ(i), vertices.getX(i));
        trunkColors.set(barkAlbedo(trunk, vertices.getY(i) + trunk.height / 2, angle), i * 3);
      }
      geometry.setAttribute('color', new BufferAttribute(trunkColors, 3));
      const mesh = new Mesh(geometry, barkMaterial);
      mesh.position.set(trunk.x, trunk.y + trunk.height / 2, trunk.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.world.add(mesh);
    }
  }

  /** A four-tone meadow (moss, meadow, light meadow, dry earth) and a worn path where the deer treads. */
  private groundAlbedo(x: number, z: number): Rgb {
    const large = valueNoise(x * 0.07 + 3.1, z * 0.07 - 1.7);
    const medium = valueNoise(x * 0.23 + 5.3, z * 0.23 - 7.9);
    const fine = valueNoise(x * 0.9 - 2.2, z * 0.9 + 4.4);
    let color = mix3(MOSS, MEADOW_GREEN, smoothstep(0.28, 0.5, large + (fine - 0.5) * 0.15));
    color = mix3(color, MEADOW_LIGHT, smoothstep(0.62, 0.82, large + (fine - 0.5) * 0.1));
    color = mix3(color, DRY_EARTH, smoothstep(0.7, 0.86, medium) * 0.85);
    const worn = 1 - smoothstep(0.35, 1.5, this.pathField.at(x, z) + (fine - 0.5) * 0.5);
    return mix3(color, WORN_PATH, worn * 0.75);
  }

  pose(frame: number): void {
    const t = frame / this.params.fps;
    const u = Math.min(1, t / this.params.duration);
    const point = this.path.getPointAt(u);
    const tangent = this.path.getTangentAt(u);
    this.subject.position.set(point.x, groundHeight(point.x, point.z), point.z);
    this.subject.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
    this.mixer.setTime(t * GALLOP_TIME_SCALE);
    this.subject.updateMatrixWorld(true);

    this.sun.target.position.copy(this.subject.position);
    this.sun.position.copy(this.subject.position).addScaledVector(SUN, 30);
    this.sun.target.updateMatrixWorld();
  }

  focus(): Vector3 {
    return this.subject.position.clone().add(new Vector3(0, 0.8, 0));
  }

  cameraAt(frame: number, aspect: number): PackCamera {
    const t = frame / this.params.fps;
    const u = Math.min(1, t / this.params.duration);
    const shake = handheld(this.params.seed, t);
    const position = this.cameraTrack.getPointAt(u).add(new Vector3(shake[0], shake[1], shake[2]));
    const point = this.path.getPointAt(u);
    const tangent = this.path.getTangentAt(u);
    const target = new Vector3(point.x, groundHeight(point.x, point.z) + 0.8, point.z).addScaledVector(tangent, 1.2);
    const matrix = new Matrix4().lookAt(position, target, UP);
    const quaternion = new Quaternion().setFromRotationMatrix(matrix);
    quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), shake[3]));
    return {
      pos: [position.x, position.y, position.z],
      quat: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      fov: 42,
      aspect,
    };
  }

  shadeSubject(albedo: Rgb, _point: Vector3, normal: Vector3): Rgb {
    const shade = AMBIENT + SUN_INTENSITY * Math.max(0, normal.dot(SUN));
    return [albedo[0] * shade, albedo[1] * shade, albedo[2] * shade];
  }

  environment(cameras: PackCamera[]): PointSet {
    const random = stream(this.params.seed, 'environment');
    const density = this.params.envDensity;
    const noise = this.params.depthNoise;
    const writer = environmentWriter(random, noise, cameras);
    const P = writer.P;
    const lit = (albedo: Rgb, shade: number): Rgb => [albedo[0] * shade, albedo[1] * shade, albedo[2] * shade];

    const groundCount = Math.round(density * MEADOW.halfX * 2 * MEADOW.halfZ * 2);
    for (let i = 0; i < groundCount; i++) {
      const x = (random() * 2 - 1) * MEADOW.halfX;
      const z = (random() * 2 - 1) * MEADOW.halfZ;
      P.set(x, groundHeight(x, z), z);
      writer.push(lit(this.groundAlbedo(x, z), AMBIENT + SUN_INTENSITY * groundNormal(x, z).dot(SUN)));
    }

    for (const trunk of this.trunks) {
      const area = 2 * Math.PI * trunk.radius * trunk.height;
      const count = Math.round(density * TRUNK_DENSITY_FACTOR * area);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const h = random();
        const radius = trunk.radius * (1 - 0.15 * h);
        P.set(trunk.x + Math.cos(angle) * radius, trunk.y + h * trunk.height, trunk.z + Math.sin(angle) * radius);
        const facing = Math.cos(angle) * SUN.x + Math.sin(angle) * SUN.z;
        writer.push(lit(barkAlbedo(trunk, h * trunk.height, angle), AMBIENT + SUN_INTENSITY * Math.max(0, facing)));
      }
    }

    // Stray points in the air (floaters), with the original expression so the bytes do not change.
    const floaters = Math.round((writer.positions.length / 3) * 0.004 * noise);
    for (let i = 0; i < floaters; i++) {
      P.set((random() * 2 - 1) * MEADOW.halfX, 0.3 + random() * 6, (random() * 2 - 1) * MEADOW.halfZ);
      const grey = 0.25 + random() * 0.35;
      writer.positions.push(P.x, P.y, P.z);
      for (let k = 0; k < 3; k++) writer.colors.push(toSrgb8(grey));
    }
    return writer.result();
  }

  sourceLook(): SourceLook {
    return { background: SKY, fog: new Fog(SKY, 24, 75), shadows: true };
  }
}

// ---------------------------------------------------------------------------------------------

/** Gentle relief of the meadow. */
export function groundHeight(x: number, z: number): number {
  return 0.22 * Math.sin(0.19 * x + 0.4) * Math.cos(0.15 * z) + 0.12 * Math.sin(0.41 * z + 0.23 * x);
}

function groundNormal(x: number, z: number): Vector3 {
  const e = 0.05;
  const dx = (groundHeight(x + e, z) - groundHeight(x - e, z)) / (2 * e);
  const dz = (groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e);
  return new Vector3(-dx, 1, -dz).normalize();
}

/**
 * Bark: light birch with dark horizontal notches (a ~0.5 m band now and then, over part of the
 * circumference) or dark bark; darker near the ground. `h` in meters from the base.
 */
function barkAlbedo(trunk: Trunk, h: number, angle: number): Rgb {
  const base = trunk.birch ? BIRCH : BARK;
  let color: Rgb = [base[0], base[1], base[2]];
  if (trunk.birch) {
    const band = Math.floor(h / 0.5);
    if (hash2(trunk.seed, band) < 0.55) {
      const offset = 0.08 + hash2(trunk.seed + 1, band) * 0.3;
      const height = 0.05 + hash2(trunk.seed + 2, band) * 0.08;
      const center = hash2(trunk.seed + 3, band) * Math.PI * 2;
      const within = h - band * 0.5 - offset;
      const delta = Math.abs(((angle - center + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (within >= 0 && within < height && delta < 0.9) color = [...BIRCH_NOTCH];
    }
  }
  const ground = 0.55 + 0.45 * smoothstep(0, 0.9, h);
  return [color[0] * ground, color[1] * ground, color[2] * ground];
}

interface DistanceField {
  at(x: number, z: number): number;
}

/** Distance (m) to a polyline in the XZ plane, precomputed on a 0.5 m grid over the meadow. */
function distanceField(samples: Vector3[]): DistanceField {
  const cell = 0.5;
  const columns = Math.ceil((MEADOW.halfX * 2) / cell) + 1;
  const rows = Math.ceil((MEADOW.halfZ * 2) / cell) + 1;
  const grid = new Float32Array(columns * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const x = -MEADOW.halfX + i * cell;
      const z = -MEADOW.halfZ + j * cell;
      let best = Infinity;
      for (const p of samples) best = Math.min(best, (p.x - x) ** 2 + (p.z - z) ** 2);
      grid[j * columns + i] = Math.sqrt(best);
    }
  }
  return {
    at(x, z) {
      const fx = Math.min(columns - 1.001, Math.max(0, (x + MEADOW.halfX) / cell));
      const fz = Math.min(rows - 1.001, Math.max(0, (z + MEADOW.halfZ) / cell));
      const i = Math.floor(fx);
      const j = Math.floor(fz);
      const tx = fx - i;
      const tz = fz - j;
      const a = grid[j * columns + i] + (grid[j * columns + i + 1] - grid[j * columns + i]) * tx;
      const b = grid[(j + 1) * columns + i] + (grid[(j + 1) * columns + i + 1] - grid[(j + 1) * columns + i]) * tx;
      return a + (b - a) * tz;
    },
  };
}
