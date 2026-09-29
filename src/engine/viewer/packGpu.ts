import {
  BufferAttribute,
  BufferGeometry,
  DataArrayTexture,
  Float32BufferAttribute,
  LinearFilter,
  Matrix4,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { PackCamera } from '../pack/format';
import type { Pack } from '../pack/loader';

/** Reach (m) of the frustum light: the source camera's view-projection uses this far plane. */
export const LIGHT_FAR = 40;
/** Cap on the distance from the image plane to the source camera (m). */
export const MAX_FRUSTUM_DEPTH = 4;

/**
 * GPU resources of a pack, shared by every view that shows it: three uploads each BufferAttribute
 * and each texture only once even if they appear in several scenes. What changes per view
 * (uniforms, drawRange, camera) lives in each TimeViewer.
 */
export interface PackGpu {
  staticGeometry: BufferGeometry;
  dynamicGeometry: BufferGeometry;
  frustumGeometry: BufferGeometry;
  planeGeometry: PlaneGeometry;
  trajectoryGeometry: BufferGeometry;
  sourceTexture: DataArrayTexture;
  /** View-projection of each frame's source camera. */
  sourceViewProj: Matrix4[];
  /** Transform from the normalized positions to the scene bbox. */
  bboxMin: Vector3;
  bboxSize: Vector3;
  /** Box of the dynamic layer in scene coordinates. */
  subjectBounds: { min: Vector3; max: Vector3 };
  /**
   * Distance from the drawn image plane to the source camera: a bit more than half the typical
   * camera–subject distance, capped. In a small scene the plane does not cover the subject.
   */
  frustumDepth: number;
}

const cache = new WeakMap<Pack, PackGpu>();

export function packGpu(pack: Pack): PackGpu {
  const cached = cache.get(pack);
  if (cached) return cached;
  const { meta } = pack;
  const bboxMin = new Vector3(...meta.bbox.min);
  const bboxSize = new Vector3(...meta.bbox.max).sub(bboxMin);

  const staticGeometry = new BufferGeometry();
  staticGeometry.setAttribute('position', new BufferAttribute(pack.static.positions, 3, true));
  staticGeometry.setAttribute('color', new BufferAttribute(pack.static.colors, 3, true));

  const dynamicGeometry = new BufferGeometry();
  const dynamicPositions = new BufferAttribute(pack.dynamic.positions, 3, true);
  dynamicGeometry.setAttribute('position', dynamicPositions);
  dynamicGeometry.setAttribute('color', new BufferAttribute(pack.dynamic.colors, 3, true));
  dynamicGeometry.setAttribute('aFrame', new BufferAttribute(pack.dynamic.frames, 1, false));
  // Interpolated present (D5): with correspondence, each point knows its position in the next
  // frame. Without it, aNext is the same attribute as position: the shader does not change and
  // there is no extra memory (three uploads a single buffer).
  dynamicGeometry.setAttribute(
    'aNext',
    pack.correspondence ? new BufferAttribute(nextPositions(pack.dynamic.positions, pack.correspondence.pointsPerFrame), 3, true) : dynamicPositions,
  );

  // Frustum in camera space with the image plane at z = −1; each view scales it per frame.
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const lines: number[] = [];
  for (const [x, y] of corners) lines.push(0, 0, 0, x, y, -1);
  corners.forEach(([x, y], i) => {
    const [nx, ny] = corners[(i + 1) % 4];
    lines.push(x, y, -1, nx, ny, -1);
  });
  const frustumGeometry = new BufferGeometry();
  frustumGeometry.setAttribute('position', new Float32BufferAttribute(lines, 3));

  const planeGeometry = new PlaneGeometry(2, 2);
  planeGeometry.translate(0, 0, -1);

  const trajectoryGeometry = new BufferGeometry();
  trajectoryGeometry.setAttribute('position', new Float32BufferAttribute(meta.cameras.flatMap((c) => c.pos), 3));

  const sourceTexture = new DataArrayTexture(pack.source.data, pack.source.width, pack.source.height, pack.source.frameCount);
  sourceTexture.colorSpace = SRGBColorSpace;
  sourceTexture.minFilter = LinearFilter;
  sourceTexture.magFilter = LinearFilter;
  sourceTexture.generateMipmaps = false;
  sourceTexture.needsUpdate = true;

  const gpu: PackGpu = {
    staticGeometry,
    dynamicGeometry,
    frustumGeometry,
    planeGeometry,
    trajectoryGeometry,
    sourceTexture,
    sourceViewProj: meta.cameras.map((camera) => sourceViewProjection(camera, LIGHT_FAR)),
    bboxMin,
    bboxSize,
    subjectBounds: dynamicBounds(pack, bboxMin, bboxSize),
    frustumDepth: Math.min(MAX_FRUSTUM_DEPTH, 0.55 * medianSubjectDistance(pack, bboxMin, bboxSize)),
  };
  cache.set(pack, gpu);
  return gpu;
}

/**
 * Positions of the same point one frame later (correspondence): point i of frame f gets the
 * position of point i of frame f + 1; the last frame repeats itself.
 */
export function nextPositions(positions: Uint16Array, pointsPerFrame: number): Uint16Array {
  const next = new Uint16Array(positions.length);
  const stride = pointsPerFrame * 3;
  next.set(positions.subarray(stride));
  next.set(positions.subarray(Math.max(0, positions.length - stride)), Math.max(0, positions.length - stride));
  return next;
}

/** View-projection of a frame's source camera; `far` limits the reach of the frustum light. */
function sourceViewProjection(camera: PackCamera, far: number): Matrix4 {
  const perspective = new PerspectiveCamera(camera.fov, camera.aspect, 0.1, far);
  perspective.position.set(...camera.pos);
  perspective.quaternion.set(...camera.quat);
  perspective.updateMatrixWorld(true);
  return perspective.projectionMatrix.clone().multiply(perspective.matrixWorldInverse);
}

/** Median, over the frames, of the distance from the source camera to the subject's center. */
function medianSubjectDistance(pack: Pack, bboxMin: Vector3, bboxSize: Vector3): number {
  const { offsets, positions, frameCount } = pack.dynamic;
  const distances: number[] = [];
  const center = new Vector3();
  for (let f = 0; f < frameCount; f++) {
    const start = offsets[f];
    const end = offsets[f + 1];
    if (end === start) continue;
    center.set(0, 0, 0);
    let n = 0;
    for (let i = start; i < end; i += 20) {
      center.x += positions[i * 3];
      center.y += positions[i * 3 + 1];
      center.z += positions[i * 3 + 2];
      n++;
    }
    center.divideScalar(n * 65535).multiply(bboxSize).add(bboxMin);
    distances.push(center.distanceTo(new Vector3(...pack.meta.cameras[f].pos)));
  }
  distances.sort((a, b) => a - b);
  return distances[Math.floor(distances.length / 2)] ?? MAX_FRUSTUM_DEPTH * 2;
}

function dynamicBounds(pack: Pack, bboxMin: Vector3, bboxSize: Vector3): { min: Vector3; max: Vector3 } {
  const positions = pack.dynamic.positions;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  // A subsample is enough for framing.
  const step = Math.max(1, Math.floor(pack.dynamic.count / 50000)) * 3;
  for (let i = 0; i < positions.length; i += step) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  const toScene = (q: number[]) => new Vector3(q[0] / 65535, q[1] / 65535, q[2] / 65535).multiply(bboxSize).add(bboxMin);
  return { min: toScene(min), max: toScene(max) };
}
