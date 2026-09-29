import { Fog, Group, Matrix4, Quaternion, Vector3, type BufferAttribute, type Object3D } from 'three';
import type { PackCamera } from '../../../engine/pack/format';
import type { PointSet } from '../../../engine/pack/writer';
import { FALCON_DURATION, FALCON_SEED, droneCamera, falconPose, vec3, type FalconPose, type Vec3 } from '../../scenes/falconPhi';
import type { BakeParams, Rgb, SkinPart } from '../common';
import { FalconBody, type FalconPart } from './falconPhiBody';
import { CYAN, HAZE, MAGENTA, buildCity, cityPoints, irradiance, poseRain, type City } from './falconPhiCity';
import type { Recipe, SourceLook } from './recipe';

// The "falcon-phi" recipe (D7, D8): a peregrine falcon computed from equations descends in a golden
// spiral around the mast of a tower, in a cyberpunk city at night; it dives with its wings tucked,
// climbs out, banks and lands on the bar of a neon antenna. The path, the script and the camera come
// from src/pipeline/scenes/falconPhi.ts (the same ones that page D reads). No third-party model.

export const FALCON_DEFAULTS: BakeParams = {
  name: 'falcon-phi',
  fps: 30,
  duration: FALCON_DURATION,
  pointsPerFrame: 4000,
  envDensity: 26,
  sourceWidth: 320,
  seed: FALCON_SEED,
  depthNoise: 0.25,
  subjectDepthNoise: 0.06,
};

/** A cold rim light on the outline as seen from the camera: it separates the falcon from the dark background. */
const RIM: Rgb = [0.14, 0.2, 0.34];
/** A faint fill from the camera and the sky: neutral and barely warm, so the belly reads as cream. */
const FILL: Rgb = [0.24, 0.225, 0.2];
const CELL = 0.012;

interface VertexIndex {
  frame: number;
  cells: Map<number, number[]>;
}

export class FalconPhi implements Recipe {
  readonly id = 'falcon-phi';
  readonly title = 'Peregrine falcon on a golden spiral over a cyberpunk city at night (computed, own work)';
  readonly defaults = FALCON_DEFAULTS;
  readonly generatorName = '4d-os /bake · falcon-phi';
  readonly subject = new Group();
  readonly world = new Group();
  readonly lights: Object3D[] = [];
  readonly pointSize = { static: 0.08, dynamic: 0.012 };
  readonly stableSubject = true;
  parts: SkinPart[] = [];

  private params: BakeParams = { ...FALCON_DEFAULTS };
  private falcon!: FalconBody;
  private city: City | null = null;
  private citySeed = -1;
  private posedFrame = -1;
  private currentPose: FalconPose | null = null;
  private eyePosition: Vec3 = [0, 0, 0];
  private readonly partOf = new Map<SkinPart, FalconPart>();
  private readonly indexes = new Map<FalconPart, VertexIndex>();
  private readonly cameraCache = new Map<number, PackCamera>();

  async load(): Promise<void> {
    this.falcon = new FalconBody();
    for (const part of this.falcon.parts) {
      this.subject.add(part.mesh);
      const skin: SkinPart = { mesh: part.mesh, albedo: part.meanAlbedo, indices: part.indices, vertexCount: part.vertexCount };
      this.parts.push(skin);
      this.partOf.set(skin, part);
    }
    this.falcon.orient(falconPose(0, FALCON_SEED));
    this.subject.updateMatrixWorld(true);
  }

  setup(params: BakeParams): void {
    this.params = { ...params };
    if (!this.city || this.citySeed !== params.seed) {
      this.world.clear();
      this.city = buildCity(params.seed);
      this.citySeed = params.seed;
      this.world.add(this.city.meshes);
    }
    this.posedFrame = -1;
    this.cameraCache.clear();
  }

  /** Script time at frame f (a different duration stretches the script). */
  private time(frame: number): number {
    return (frame / this.params.fps) * (FALCON_DURATION / this.params.duration);
  }

  pose(frame: number): void {
    if (this.posedFrame === frame) return;
    this.posedFrame = frame;
    this.indexes.clear();
    const pose = falconPose(this.time(frame), this.params.seed);
    this.currentPose = pose;
    this.falcon.pose(pose);
    const camera = this.cameraAt(frame, 16 / 9);
    this.eyePosition = camera.pos;
    // Per-vertex colors of the source frame, with the same light as the points.
    for (const part of this.falcon.parts) {
      const colors = part.mesh.geometry.attributes.color as BufferAttribute;
      for (let i = 0; i < part.vertexCount; i++) {
        const c = this.shade(part, i, [part.positions[i * 3], part.positions[i * 3 + 1], part.positions[i * 3 + 2]], [part.normals[i * 3], part.normals[i * 3 + 1], part.normals[i * 3 + 2]]);
        colors.setXYZ(i, c[0], c[1], c[2]);
      }
      colors.needsUpdate = true;
    }
    if (this.city) poseRain(this.city.rain, this.params.seed, frame, camera.pos);
    this.subject.updateMatrixWorld(true);
    this.world.updateMatrixWorld(true);
  }

  focus(): Vector3 {
    const p = this.currentPose?.position ?? [0, 0, 0];
    return new Vector3(p[0], p[1], p[2]);
  }

  cameraAt(frame: number, aspect: number): PackCamera {
    const cached = this.cameraCache.get(frame);
    if (cached && cached.aspect === aspect) return cached;
    const drone = droneCamera(this.time(frame), this.params.seed);
    const position = new Vector3(...drone.position);
    const target = new Vector3(...drone.target);
    const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, target, new Vector3(0, 1, 0)));
    quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), drone.roll));
    const camera: PackCamera = {
      pos: [position.x, position.y, position.z],
      quat: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      fov: drone.fov,
      aspect,
    };
    this.cameraCache.set(frame, camera);
    return camera;
  }

  shadeSubject(_albedo: Rgb, point: Vector3, _normal: Vector3, frame: number, skin: SkinPart): Rgb {
    this.pose(frame);
    const part = this.partOf.get(skin)!;
    const p: Vec3 = [point.x, point.y, point.z];
    // The albedo and the (oriented) normal of the nearest vertex: the top and bottom of the feathers
    // share their position in the plane, so the distance picks the right side.
    const vertex = this.nearestVertex(part, p);
    return this.shade(part, vertex, p, [part.normals[vertex * 3], part.normals[vertex * 3 + 1], part.normals[vertex * 3 + 2]]);
  }

  /**
   * Lit color of a falcon point: the vertex albedo (the feather pattern is painted per vertex), the
   * city light, a cold rim toward the camera and a glint in the eyes.
   */
  private shade(part: FalconPart, vertex: number, p: Vec3, n: Vec3): Rgb {
    const a = part.albedo;
    const e = irradiance(this.city!.lighting, p, n);
    // The city's neon lights add an even magenta wash over the whole falcon: the cream belly turned
    // pink and read as a pigeon. Their light is kept and more than half of their color is removed;
    // the neon accent comes from the drone's cyan and magenta side lights.
    const luma = 0.2126 * e[0] + 0.7152 * e[1] + 0.0722 * e[2];
    for (let k = 0; k < 3; k++) e[k] = luma + (e[k] - luma) * 0.3;
    const view = vec3.normalize(vec3.sub(this.eyePosition, p));
    const facing = vec3.dot(n, view);
    // The drone's cinema lighting: cyan neon from one side, magenta from the other and a soft fill
    // from the camera; the cold rim cuts out the outline.
    const side = vec3.normalize(vec3.cross(view, [0, 1, 0]));
    const cyan = Math.max(0, vec3.dot(n, vec3.normalize(vec3.add(vec3.scale(side, 0.9), [0, 0.55, 0]))));
    const magenta = Math.max(0, vec3.dot(n, vec3.normalize(vec3.add(vec3.scale(side, -0.9), [0, -0.2, 0]))));
    const fill = Math.max(0, facing) * 0.5 + 0.5 * Math.max(0, n[1]) + 0.35 * Math.max(0, -n[1]);
    const rim = Math.pow(1 - Math.abs(facing), 4);
    const out: Rgb = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const light = e[k] + CYAN[k] * 0.3 * cyan + MAGENTA[k] * 0.12 * magenta + FILL[k] * fill;
      out[k] = a[vertex * 3 + k] * light + RIM[k] * rim;
    }
    if (part.name === 'eyes') {
      // Specular glint of the wet eye.
      const highlight = Math.pow(Math.max(0, facing), 40) * 0.6;
      for (let k = 0; k < 3; k++) out[k] += highlight;
    }
    return out;
  }

  /** Nearest vertex of the part (a spatial grid per frame). */
  private nearestVertex(part: FalconPart, p: Vec3): number {
    let index = this.indexes.get(part);
    if (!index || index.frame !== this.posedFrame) {
      const cells = new Map<number, number[]>();
      for (let i = 0; i < part.vertexCount; i++) {
        const key = cellKey(Math.floor(part.positions[i * 3] / CELL), Math.floor(part.positions[i * 3 + 1] / CELL), Math.floor(part.positions[i * 3 + 2] / CELL));
        let list = cells.get(key);
        if (!list) cells.set(key, (list = []));
        list.push(i);
      }
      index = { frame: this.posedFrame, cells };
      this.indexes.set(part, index);
    }
    const cx = Math.floor(p[0] / CELL);
    const cy = Math.floor(p[1] / CELL);
    const cz = Math.floor(p[2] / CELL);
    let best = 0;
    let bestScore = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = index.cells.get(cellKey(cx + dx, cy + dy, cz + dz));
          if (!list) continue;
          for (const i of list) {
            const d = (part.positions[i * 3] - p[0]) ** 2 + (part.positions[i * 3 + 1] - p[1]) ** 2 + (part.positions[i * 3 + 2] - p[2]) ** 2;
            if (d < bestScore) {
              bestScore = d;
              best = i;
            }
          }
        }
      }
    }
    return best;
  }

  environment(cameras: PackCamera[]): PointSet {
    return cityPoints(this.city!, this.params.seed, this.params.envDensity, this.params.depthNoise, cameras);
  }

  sourceLook(): SourceLook {
    return { background: HAZE, fog: new Fog(HAZE, 14, 95), shadows: false };
  }
}

function cellKey(x: number, y: number, z: number): number {
  return ((x + 4096) * 8192 + (y + 4096)) * 8192 + (z + 4096);
}
