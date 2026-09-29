import { Color, SRGBColorSpace, Vector3, type Mesh, type SkinnedMesh } from 'three';
import type { PackCamera } from '../../engine/pack/format';
import type { PointSet } from '../../engine/pack/writer';
import { gaussian, stream, type Random } from '../scenes/random';

// Utilities shared by the bake recipes.

export interface BakeParams {
  name: string;
  fps: number;
  /** Clip duration in seconds. */
  duration: number;
  pointsPerFrame: number;
  /** Points per m² on the environment surfaces. */
  envDensity: number;
  /** Width of a source frame in pixels; the height is 9/16 of it. */
  sourceWidth: number;
  seed: number;
  /** 0–1: rays and stray points that imitate the depth error of a monocular reconstruction. */
  depthNoise: number;
  /** Depth error of the subject, if it differs from the background (up close, a lot of noise turns it into dust). */
  subjectDepthNoise?: number;
}

export type Rgb = [number, number, number];

/**
 * Subject mesh, with its linear albedo and its triangles. It may be skinned (a model with bones)
 * or not (a subject built from equations that rewrites `geometry.attributes.position` in `pose`).
 */
export interface SkinPart {
  mesh: Mesh;
  albedo: Rgb;
  indices: ArrayLike<number>;
  vertexCount: number;
}

export function srgb(r: number, g: number, b: number): Rgb {
  const c = new Color().setRGB(r, g, b, SRGBColorSpace);
  return [c.r, c.g, c.b];
}

export function toSrgb8(linear: number): number {
  const v = Math.min(1, Math.max(0, linear));
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

export function mix3(a: ArrayLike<number>, b: ArrayLike<number>, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function hash2(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Deterministic value noise. */
export function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const h = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = h(xi, zi) + (h(xi + 1, zi) - h(xi, zi)) * ux;
  const b = h(xi, zi + 1) + (h(xi + 1, zi + 1) - h(xi, zi + 1)) * ux;
  return a + (b - a) * uz;
}

/** Handheld motion: a sum of sines with phases from the seed (position in m, roll in rad). */
export function handheld(seed: number, t: number, scale = 1): [number, number, number, number] {
  const random = stream(seed, 'handheld');
  const phases = Array.from({ length: 8 }, () => random() * Math.PI * 2);
  const wave = (i: number, f1: number, f2: number) => Math.sin(t * f1 + phases[i]) * 0.6 + Math.sin(t * f2 + phases[i + 1]) * 0.4;
  return [0.09 * scale * wave(0, 1.3, 3.1), 0.06 * scale * wave(2, 1.7, 4.3), 0.09 * scale * wave(4, 1.1, 2.9), 0.012 * wave(6, 0.9, 2.3)];
}

const _skinVector = new Vector3();

/** World positions of every vertex of a mesh, with its current skinning if it has any. */
export function skinVertices(part: SkinPart): Float32Array {
  const out = new Float32Array(part.vertexCount * 3);
  const mesh = part.mesh;
  const position = mesh.geometry.attributes.position;
  const skinned = (mesh as SkinnedMesh).isSkinnedMesh === true ? (mesh as SkinnedMesh) : null;
  for (let i = 0; i < part.vertexCount; i++) {
    _skinVector.fromBufferAttribute(position, i);
    skinned?.applyBoneTransform(i, _skinVector);
    _skinVector.applyMatrix4(mesh.matrixWorld);
    _skinVector.toArray(out, i * 3);
  }
  return out;
}

export function triangleArea(v: Float32Array, a: number, b: number, c: number): number {
  const abx = v[b * 3] - v[a * 3];
  const aby = v[b * 3 + 1] - v[a * 3 + 1];
  const abz = v[b * 3 + 2] - v[a * 3 + 2];
  const acx = v[c * 3] - v[a * 3];
  const acy = v[c * 3 + 1] - v[a * 3 + 1];
  const acz = v[c * 3 + 2] - v[a * 3 + 2];
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  return 0.5 * Math.hypot(cx, cy, cz);
}

export function searchCumulative(cumulative: number[], value: number): number {
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Writer for the static layer, with the depth error of a monocular reconstruction: a fraction of
 * the points slides along the line of sight of some source camera ("rays").
 * `push` takes the already lit (linear) color and applies a per-point variation to it.
 */
export function environmentWriter(random: Random, noise: number, cameras: PackCamera[]) {
  const positions: number[] = [];
  const colors: number[] = [];
  const P = new Vector3();
  return {
    P,
    positions,
    colors,
    push(lit: ArrayLike<number>) {
      if (random() < 0.06 * noise) {
        const eye = cameras[Math.floor(random() * cameras.length)].pos;
        const scale = Math.exp(0.18 * noise * gaussian(random));
        P.set(eye[0] + (P.x - eye[0]) * scale, eye[1] + (P.y - eye[1]) * scale, eye[2] + (P.z - eye[2]) * scale);
      }
      positions.push(P.x, P.y, P.z);
      const variation = 0.88 + 0.24 * random();
      for (let k = 0; k < 3; k++) colors.push(toSrgb8(lit[k] * variation));
    },
    /** Stray points floating in the air inside a box, in grey. */
    floaters(count: number, box: { min: [number, number, number]; max: [number, number, number] }) {
      for (let i = 0; i < count; i++) {
        P.set(
          box.min[0] + random() * (box.max[0] - box.min[0]),
          box.min[1] + random() * (box.max[1] - box.min[1]),
          box.min[2] + random() * (box.max[2] - box.min[2]),
        );
        const grey = 0.25 + random() * 0.35;
        positions.push(P.x, P.y, P.z);
        for (let k = 0; k < 3; k++) colors.push(toSrgb8(grey));
      }
    },
    result(): PointSet {
      return { positions: new Float32Array(positions), colors: new Uint8Array(colors) };
    },
  };
}
