import {
  DYNAMIC_FILE,
  DYNAMIC_MAGIC,
  PACK_VERSION,
  QUANT_MAX,
  STATIC_FILE,
  STATIC_MAGIC,
  dynamicByteLength,
  dynamicHeaderBytes,
  framesPerPage,
  staticByteLength,
  type PackCamera,
  type SceneMeta,
  type Vec3,
} from './format';

export interface PointSet {
  /** xyz in scene coordinates. */
  positions: Float32Array;
  /** rgb 0–255. */
  colors: Uint8Array;
}

export interface PackInput {
  name: string;
  synthetic: boolean;
  fps: number;
  cameras: PackCamera[];
  static: PointSet;
  /** One point set per frame, in order. */
  frames: PointSet[];
  source: { width: number; height: number; columns: number; rows: number; pages: string[] };
  /** Size in bytes of each atlas page, in the same order as `source.pages`. */
  sourcePageBytes: number[];
  bbox?: { min: Vec3; max: Vec3 };
  pointSize?: SceneMeta['pointSize'];
  generator?: SceneMeta['generator'];
  /** Declares correspondence between frames (stable points): requires the same point count in all of them. */
  correspondence?: boolean;
}

export interface PackOutput {
  meta: SceneMeta;
  sceneJson: string;
  staticBin: ArrayBuffer;
  dynamicBin: ArrayBuffer;
}

export function writePack(input: PackInput): PackOutput {
  const frameCount = input.frames.length;
  if (frameCount === 0) throw new Error('writePack: the pack needs at least one frame');
  if (frameCount > 65536) throw new Error('writePack: more than 65536 frames do not fit in u16');
  if (input.cameras.length !== frameCount) {
    throw new Error(`writePack: ${frameCount} frames but ${input.cameras.length} cameras`);
  }
  if (input.source.pages.length !== Math.ceil(frameCount / framesPerPage(input.source))) {
    throw new Error('writePack: the number of atlas pages does not cover the frames');
  }
  if (input.correspondence) {
    const expected = input.frames[0].positions.length / 3;
    input.frames.forEach((set, frame) => {
      const count = set.positions.length / 3;
      if (count !== expected) {
        throw new Error(`writePack: correspondence with different counts (frame ${frame} has ${count} points, frame 0 has ${expected})`);
      }
    });
  }

  const bbox = input.bbox ?? computeBounds([input.static, ...input.frames]);
  const staticCount = input.static.positions.length / 3;
  const dynamicCount = input.frames.reduce((sum, set) => sum + set.positions.length / 3, 0);

  // static.bin
  const staticBin = new ArrayBuffer(staticByteLength(staticCount));
  {
    const view = new DataView(staticBin);
    writeMagic(view, STATIC_MAGIC);
    view.setUint32(4, staticCount, true);
    let offset = 8;
    offset = writeQuantized(view, offset, input.static.positions, bbox);
    new Uint8Array(staticBin, offset, staticCount * 3).set(input.static.colors);
  }

  // dynamic.bin
  const dynamicBin = new ArrayBuffer(dynamicByteLength(dynamicCount, frameCount));
  {
    const view = new DataView(dynamicBin);
    writeMagic(view, DYNAMIC_MAGIC);
    view.setUint32(4, dynamicCount, true);
    view.setUint32(8, frameCount, true);
    let offset = 12;
    let running = 0;
    view.setUint32(offset, 0, true);
    for (const set of input.frames) {
      running += set.positions.length / 3;
      offset += 4;
      view.setUint32(offset, running, true);
    }
    offset = dynamicHeaderBytes(frameCount);
    for (const set of input.frames) offset = writeQuantized(view, offset, set.positions, bbox);
    const colors = new Uint8Array(dynamicBin, offset, dynamicCount * 3);
    let cursor = 0;
    for (const set of input.frames) {
      colors.set(set.colors, cursor);
      cursor += set.colors.length;
    }
    offset += dynamicCount * 3;
    input.frames.forEach((set, frame) => {
      for (let i = 0; i < set.positions.length / 3; i++) {
        view.setUint16(offset, frame, true);
        offset += 2;
      }
    });
  }

  const files: Record<string, number> = {
    [STATIC_FILE]: staticBin.byteLength,
    [DYNAMIC_FILE]: dynamicBin.byteLength,
  };
  input.source.pages.forEach((page, i) => (files[page] = input.sourcePageBytes[i]));

  const meta: SceneMeta = {
    version: PACK_VERSION,
    name: input.name,
    synthetic: input.synthetic,
    fps: input.fps,
    frameCount,
    bbox,
    cameras: input.cameras.map(roundCamera),
    counts: { static: staticCount, dynamic: dynamicCount },
    ...(input.correspondence ? { correspondence: true } : {}),
    source: { ...input.source },
    files,
    ...(input.pointSize ? { pointSize: { static: round(input.pointSize.static), dynamic: round(input.pointSize.dynamic) } } : {}),
    ...(input.generator ? { generator: input.generator } : {}),
  };

  return { meta, sceneJson: JSON.stringify(meta, null, 1), staticBin, dynamicBin };
}

/** Maximum quantization error per axis (half a u16 step). */
export function quantizationError(bbox: { min: Vec3; max: Vec3 }): Vec3 {
  return [0, 1, 2].map((axis) => extent(bbox, axis) / QUANT_MAX / 2) as Vec3;
}

function computeBounds(sets: PointSet[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const { positions } of sets) {
    for (let i = 0; i < positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        const value = positions[i + axis];
        if (value < min[axis]) min[axis] = value;
        if (value > max[axis]) max[axis] = value;
      }
    }
  }
  if (!Number.isFinite(min[0])) return { min: [0, 0, 0], max: [1, 1, 1] };
  return { min, max };
}

function extent(bbox: { min: Vec3; max: Vec3 }, axis: number): number {
  return bbox.max[axis] - bbox.min[axis] || 1;
}

function writeQuantized(view: DataView, offset: number, positions: Float32Array, bbox: { min: Vec3; max: Vec3 }) {
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    const t = (positions[i] - bbox.min[axis]) / extent(bbox, axis);
    view.setUint16(offset, Math.round(Math.min(1, Math.max(0, t)) * QUANT_MAX), true);
    offset += 2;
  }
  return offset;
}

function writeMagic(view: DataView, magic: string) {
  for (let i = 0; i < 4; i++) view.setUint8(i, magic.charCodeAt(i));
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;

function roundCamera(camera: PackCamera): PackCamera {
  return {
    pos: camera.pos.map(round) as Vec3,
    quat: camera.quat.map(round) as PackCamera['quat'],
    fov: round(camera.fov),
    aspect: round(camera.aspect),
  };
}
