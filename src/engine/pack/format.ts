/**
 * Format of the 4D pack (D2). It is the contract between the synthetic bake and a future real pipeline.
 *
 * pack/
 *   scene.json   metadata (SceneMeta)
 *   static.bin   "4DST" | u32 N | pos u16[3N] | rgb u8[3N]
 *   dynamic.bin  "4DDY" | u32 M | u32 frameCount | offsets u32[frameCount+1]
 *                | pos u16[3M] | rgb u8[3M] | frame u16[M]
 *   source/      PNG atlas pages (≤4096²) with one source frame per cell
 *
 * Everything is little-endian. Blocks are split by attribute (SoA), with no interleaving or padding.
 * Positions are u16 normalized to the scene bbox: p = min + (q / 65535) · (max − min).
 * Dynamic points are sorted by frame: those of frame f occupy [offsets[f], offsets[f+1]).
 *
 * Correspondence (optional, same version): if scene.json declares `"correspondence": true`, every
 * frame has the same number N of points and point i of each frame (offsets[f] + i) is the same
 * place on the subject's surface. The viewer uses it to interpolate the present.
 */

export const PACK_VERSION = 1;
export const SUPPORTED_VERSIONS: readonly number[] = [1];

export const STATIC_MAGIC = '4DST';
export const DYNAMIC_MAGIC = '4DDY';

export const STATIC_FILE = 'static.bin';
export const DYNAMIC_FILE = 'dynamic.bin';
export const SCENE_FILE = 'scene.json';

/** Maximum value of a quantized position. */
export const QUANT_MAX = 65535;
/** Maximum side of an atlas page. */
export const MAX_ATLAS_SIZE = 4096;

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

/** Source camera of a frame, in scene coordinates. */
export interface PackCamera {
  pos: Vec3;
  /** Orientation (x, y, z, w); the camera looks down local −Z, as in three.js. */
  quat: Quat;
  /** Vertical field of view in degrees. */
  fov: number;
  aspect: number;
}

/** Source frames laid out on atlas pages: frame f goes in cell f of the sequence. */
export interface SourceInfo {
  /** Size of one frame in pixels. */
  width: number;
  height: number;
  /** Cells per row and per column on each page. */
  columns: number;
  rows: number;
  /** Paths relative to the pack, in order. */
  pages: string[];
}

export interface SceneMeta {
  version: number;
  name: string;
  synthetic: boolean;
  fps: number;
  frameCount: number;
  /** Quantization bounds of the positions. */
  bbox: { min: Vec3; max: Vec3 };
  /** Exactly one camera per frame. */
  cameras: PackCamera[];
  counts: { static: number; dynamic: number };
  /** Point correspondence between frames (optional): same count per frame and same place per index. */
  correspondence?: boolean;
  source: SourceInfo;
  /** Size in bytes of each pack file (excluding scene.json), for the loading progress. */
  files: Record<string, number>;
  /** Suggested point size in meters per layer (optional; the viewer has defaults). */
  pointSize?: { static: number; dynamic: number };
  /** Parameters it was generated with (informational only). */
  generator?: { name: string; params: Record<string, unknown> };
}

/** Decoded static layer: ready to upload as a normalized BufferAttribute. */
export interface StaticLayer {
  count: number;
  positions: Uint16Array;
  colors: Uint8Array;
}

/** Decoded dynamic layer. */
export interface DynamicLayer {
  count: number;
  frameCount: number;
  offsets: Uint32Array;
  positions: Uint16Array;
  colors: Uint8Array;
  frames: Uint16Array;
}

export const STATIC_HEADER_BYTES = 8;

export function staticByteLength(count: number): number {
  return STATIC_HEADER_BYTES + count * 6 + count * 3;
}

export function dynamicHeaderBytes(frameCount: number): number {
  return 12 + (frameCount + 1) * 4;
}

export function dynamicByteLength(count: number, frameCount: number): number {
  return dynamicHeaderBytes(frameCount) + count * 6 + count * 3 + count * 2;
}

/** Frames that fit on one atlas page. */
export function framesPerPage(source: Pick<SourceInfo, 'columns' | 'rows'>): number {
  return source.columns * source.rows;
}

/** Page and cell (in pixels, origin at the top left) of frame f. */
export function sourceCell(source: SourceInfo, frame: number): { page: number; x: number; y: number } {
  const perPage = framesPerPage(source);
  const index = frame % perPage;
  return {
    page: Math.floor(frame / perPage),
    x: (index % source.columns) * source.width,
    y: Math.floor(index / source.columns) * source.height,
  };
}

/** Cell layout per page for w×h frames on pages of up to MAX_ATLAS_SIZE. */
export function atlasLayout(width: number, height: number, frameCount: number) {
  const columns = Math.max(1, Math.floor(MAX_ATLAS_SIZE / width));
  const maxRows = Math.max(1, Math.floor(MAX_ATLAS_SIZE / height));
  const rows = Math.min(maxRows, Math.ceil(frameCount / columns));
  const pages = Math.ceil(frameCount / (columns * rows));
  return { columns, rows, pages };
}
