import {
  DYNAMIC_FILE,
  DYNAMIC_MAGIC,
  SCENE_FILE,
  STATIC_FILE,
  STATIC_HEADER_BYTES,
  STATIC_MAGIC,
  SUPPORTED_VERSIONS,
  dynamicByteLength,
  dynamicHeaderBytes,
  framesPerPage,
  staticByteLength,
  type DynamicLayer,
  type SceneMeta,
  type SourceInfo,
  type StaticLayer,
} from './format';

export type PackLayer = 'scene' | 'static' | 'dynamic' | 'source';

const LAYER_FILE: Record<PackLayer, string> = {
  scene: SCENE_FILE,
  static: STATIC_FILE,
  dynamic: DYNAMIC_FILE,
  source: 'source pages',
};

/** Loading error that names the layer and the reason; the texts are shown in the interface. */
export class PackError extends Error {
  readonly layer: PackLayer;
  readonly reason: string;

  constructor(layer: PackLayer, reason: string) {
    super(`${layer} layer (${LAYER_FILE[layer]}): ${reason}`);
    this.name = 'PackError';
    this.layer = layer;
    this.reason = reason;
  }
}

/** Source frames ready for a DataArrayTexture: RGBA, one layer per frame, rows bottom to top. */
export interface SourceFrames {
  width: number;
  height: number;
  frameCount: number;
  data: Uint8Array;
}

export interface Pack {
  url: string;
  meta: SceneMeta;
  static: StaticLayer;
  dynamic: DynamicLayer;
  source: SourceFrames;
  /**
   * Point correspondence between frames (validated): N points per frame, and point i of every
   * frame is the same place on the subject. `null` if the pack does not declare it.
   */
  correspondence: { pointsPerFrame: number } | null;
  /** Total bytes received (scene.json included). */
  bytes: number;
}

// ---------------------------------------------------------------------------------------------
// scene.json validation

export function parseScene(input: unknown): SceneMeta {
  const fail = (reason: string): never => {
    throw new PackError('scene', reason);
  };
  if (!isObject(input)) fail('not a JSON object');
  const json = input as Record<string, unknown>;

  if (typeof json.version !== 'number' || !SUPPORTED_VERSIONS.includes(json.version)) {
    fail(`unsupported format version ${String(json.version)} (supported: ${SUPPORTED_VERSIONS.join(', ')})`);
  }
  if (typeof json.name !== 'string') fail('missing "name"');
  if (typeof json.synthetic !== 'boolean') fail('missing boolean "synthetic"');
  if (!isPositive(json.fps)) fail(`invalid fps ${String(json.fps)}`);
  const frameCount = json.frameCount;
  if (!isCount(frameCount) || frameCount < 1 || frameCount > 65536) {
    fail(`invalid frameCount ${String(frameCount)}`);
  }
  const frames = frameCount as number;

  const bbox = json.bbox as SceneMeta['bbox'] | undefined;
  if (!isObject(bbox) || !isVec(bbox.min, 3) || !isVec(bbox.max, 3)) fail('invalid bbox');
  if (bbox!.min.some((value, axis) => value > bbox!.max[axis])) fail('bbox min is greater than max');

  if (!Array.isArray(json.cameras)) fail('missing "cameras"');
  const cameras = json.cameras as unknown[];
  if (cameras.length !== frames) {
    fail(`camera count mismatch (scene.json declares ${frames} frames, has ${cameras.length} cameras)`);
  }
  cameras.forEach((camera, frame) => {
    const c = camera as Record<string, unknown>;
    const valid =
      isObject(c) && isVec(c.pos, 3) && isVec(c.quat, 4) && isPositive(c.fov) && (c.fov as number) < 180 && isPositive(c.aspect);
    if (!valid) fail(`invalid camera for frame ${frame}`);
  });

  const counts = json.counts as SceneMeta['counts'] | undefined;
  if (!isObject(counts) || !isCount(counts.static) || !isCount(counts.dynamic)) fail('invalid "counts"');
  // Equal counts are checked against the offset table (parseDynamic), which names the frame.
  if (json.correspondence !== undefined && typeof json.correspondence !== 'boolean') fail('invalid "correspondence"');

  const source = json.source as SourceInfo | undefined;
  const validSource =
    isObject(source) &&
    isCount(source.width) && source.width > 0 &&
    isCount(source.height) && source.height > 0 &&
    isCount(source.columns) && source.columns > 0 &&
    isCount(source.rows) && source.rows > 0 &&
    Array.isArray(source.pages) && source.pages.every((page) => typeof page === 'string');
  if (!validSource) fail('invalid "source"');
  const expectedPages = Math.ceil(frames / framesPerPage(source!));
  if (source!.pages.length !== expectedPages) {
    fail(`source page count mismatch (${frames} frames need ${expectedPages} pages, scene.json lists ${source!.pages.length})`);
  }

  const files = json.files as Record<string, unknown> | undefined;
  if (!isObject(files)) fail('missing "files"');
  for (const name of [STATIC_FILE, DYNAMIC_FILE, ...source!.pages]) {
    if (!isCount(files![name])) fail(`missing byte size for "${name}"`);
  }

  const pointSize = json.pointSize as SceneMeta['pointSize'];
  if (pointSize !== undefined && (!isObject(pointSize) || !isPositive(pointSize.static) || !isPositive(pointSize.dynamic))) {
    fail('invalid "pointSize"');
  }

  return json as unknown as SceneMeta;
}

// ---------------------------------------------------------------------------------------------
// Binary layers

export function parseStatic(buffer: ArrayBuffer, meta: SceneMeta): StaticLayer {
  const fail = (reason: string): never => {
    throw new PackError('static', reason);
  };
  if (buffer.byteLength < STATIC_HEADER_BYTES) fail(`file too short (${buffer.byteLength} bytes)`);
  const view = new DataView(buffer);
  const magic = readMagic(view);
  if (magic !== STATIC_MAGIC) fail(`bad format identifier (expected "${STATIC_MAGIC}", got "${magic}")`);
  const count = view.getUint32(4, true);
  if (count !== meta.counts.static) {
    fail(`point count mismatch (scene.json declares ${meta.counts.static}, static.bin has ${count})`);
  }
  const expected = staticByteLength(count);
  if (buffer.byteLength !== expected) fail(`unexpected size (expected ${expected} bytes, got ${buffer.byteLength})`);

  const positions = new Uint16Array(buffer, STATIC_HEADER_BYTES, count * 3);
  const colors = new Uint8Array(buffer, STATIC_HEADER_BYTES + count * 6, count * 3);
  return { count, positions, colors };
}

export function parseDynamic(buffer: ArrayBuffer, meta: SceneMeta): DynamicLayer {
  const fail = (reason: string): never => {
    throw new PackError('dynamic', reason);
  };
  if (buffer.byteLength < 12) fail(`file too short (${buffer.byteLength} bytes)`);
  const view = new DataView(buffer);
  const magic = readMagic(view);
  if (magic !== DYNAMIC_MAGIC) fail(`bad format identifier (expected "${DYNAMIC_MAGIC}", got "${magic}")`);
  const count = view.getUint32(4, true);
  const frameCount = view.getUint32(8, true);
  if (count !== meta.counts.dynamic) {
    fail(`point count mismatch (scene.json declares ${meta.counts.dynamic}, dynamic.bin has ${count})`);
  }
  if (frameCount !== meta.frameCount) {
    fail(`frame count mismatch (scene.json declares ${meta.frameCount}, dynamic.bin has ${frameCount})`);
  }
  const expected = dynamicByteLength(count, frameCount);
  if (buffer.byteLength !== expected) fail(`unexpected size (expected ${expected} bytes, got ${buffer.byteLength})`);

  const offsets = new Uint32Array(buffer, 12, frameCount + 1);
  if (offsets[0] !== 0) fail(`offset table must start at 0 (got ${offsets[0]})`);
  if (offsets[frameCount] !== count) {
    fail(`offset table must end at the point count (expected ${count}, got ${offsets[frameCount]})`);
  }
  for (let f = 0; f < frameCount; f++) {
    if (offsets[f + 1] < offsets[f]) fail(`offset table decreases at frame ${f}`);
  }
  if (meta.correspondence === true) {
    const expected = offsets[1] - offsets[0];
    for (let f = 1; f < frameCount; f++) {
      const points = offsets[f + 1] - offsets[f];
      if (points !== expected) {
        fail(`correspondence declared but frame ${f} has ${points} points and frame 0 has ${expected}`);
      }
    }
  }

  let offset = dynamicHeaderBytes(frameCount);
  const positions = new Uint16Array(buffer, offset, count * 3);
  offset += count * 6;
  const colors = new Uint8Array(buffer, offset, count * 3);
  offset += count * 3;
  // The u16 frames block is misaligned when M is odd: in that case it is copied.
  const frames =
    offset % 2 === 0 ? new Uint16Array(buffer, offset, count) : new Uint16Array(buffer.slice(offset, offset + count * 2));

  for (let f = 0; f < frameCount; f++) {
    for (let i = offsets[f]; i < offsets[f + 1]; i++) {
      if (frames[i] !== f) fail(`point ${i} declares frame ${frames[i]} but lies in the range of frame ${f}`);
    }
  }
  return { count, frameCount, offsets, positions, colors, frames };
}

// ---------------------------------------------------------------------------------------------
// Loading with byte-based progress

export interface LoadOptions {
  /** Progress 0–1 from the bytes received over the total of the files requested (declared in scene.json). */
  onProgress?: (progress: number, received: number, total: number) => void;
  fetch?: typeof fetch;
  decodeSource?: (pages: Blob[], meta: SceneMeta) => Promise<SourceFrames>;
  /**
   * Whether to load the source frames (default true). A page none of whose views can show the frustum's
   * image plane or use the source-camera light passes false: no `source/page-*` file is requested, the
   * progress counts the static and dynamic layers only, and `pack.source` is a 1×1 placeholder per frame,
   * so the GPU texture is still valid. The metadata (weight, frame count) is read from scene.json either way.
   */
  source?: boolean;
}

/** Source frames that are never drawn: one black 1×1 texel per frame (spec 4d-pack, "Layers a page never draws"). */
export function placeholderSource(meta: SceneMeta): SourceFrames {
  return { width: 1, height: 1, frameCount: meta.frameCount, data: new Uint8Array(4 * meta.frameCount) };
}

export async function loadPack(baseUrl: string, options: LoadOptions = {}): Promise<Pack> {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const decodeSource = options.decodeSource ?? decodeSourcePages;
  const withSource = options.source ?? true;
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const sceneBytes = await fetchBytes(fetchImpl, base + SCENE_FILE, 'scene');
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(sceneBytes));
  } catch {
    throw new PackError('scene', 'not valid JSON');
  }
  const meta = parseScene(json);

  const pages = withSource ? meta.source.pages : [];
  const total = [STATIC_FILE, DYNAMIC_FILE, ...pages].reduce((sum, name) => sum + meta.files[name], 0);
  let received = 0;
  const report = () => options.onProgress?.(Math.min(1, total ? received / total : 1), received, total);
  const onChunk = (bytes: number) => {
    received += bytes;
    report();
  };
  report();

  const [staticBytes, dynamicBytes, ...pageBytes] = await Promise.all([
    fetchBytes(fetchImpl, base + STATIC_FILE, 'static', onChunk),
    fetchBytes(fetchImpl, base + DYNAMIC_FILE, 'dynamic', onChunk),
    ...pages.map((page) => fetchBytes(fetchImpl, base + page, 'source', onChunk)),
  ]);

  const staticLayer = parseStatic(staticBytes.buffer as ArrayBuffer, meta);
  const dynamicLayer = parseDynamic(dynamicBytes.buffer as ArrayBuffer, meta);
  const source = withSource
    ? await decodeSource(
        pageBytes.map((bytes) => new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/png' })),
        meta,
      )
    : placeholderSource(meta);

  return {
    url: base,
    meta,
    static: staticLayer,
    dynamic: dynamicLayer,
    source,
    correspondence: correspondenceOf(meta, dynamicLayer),
    bytes: sceneBytes.byteLength + received,
  };
}

async function fetchBytes(
  fetchImpl: typeof fetch,
  url: string,
  layer: PackLayer,
  onChunk?: (bytes: number) => void,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new PackError(layer, `network error (${error instanceof Error ? error.message : String(error)})`);
  }
  if (!response.ok) throw new PackError(layer, `HTTP ${response.status} for ${url}`);
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onChunk?.(bytes.byteLength);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
    onChunk?.(value.byteLength);
  }
  // A buffer of its own and of exact size: the layers' typed views are created on it without copying.
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Decodes the atlas pages and puts each cell into its layer (browser). */
export async function decodeSourcePages(pages: Blob[], meta: SceneMeta): Promise<SourceFrames> {
  const { width, height, columns } = meta.source;
  const perPage = framesPerPage(meta.source);
  const layerBytes = width * height * 4;
  const data = new Uint8Array(layerBytes * meta.frameCount);

  for (let p = 0; p < pages.length; p++) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(pages[p]);
    } catch {
      throw new PackError('source', `page ${p} is not a decodable image`);
    }
    const framesHere = Math.min(perPage, meta.frameCount - p * perPage);
    const neededRows = Math.ceil(framesHere / columns);
    if (bitmap.width < columns * width || bitmap.height < neededRows * height) {
      throw new PackError('source', `page ${p} is ${bitmap.width}×${bitmap.height}, too small for its frames`);
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height, { colorSpace: 'srgb' }).data;
    const stride = canvas.width * 4;

    for (let local = 0; local < framesHere; local++) {
      const frame = p * perPage + local;
      const cellX = (local % columns) * width;
      const cellY = Math.floor(local / columns) * height;
      const layer = frame * layerBytes;
      // Rows bottom to top: texture coordinate v = 0 lands on the bottom edge of the frame.
      for (let row = 0; row < height; row++) {
        const src = (cellY + height - 1 - row) * stride + cellX * 4;
        data.set(pixels.subarray(src, src + width * 4), layer + row * width * 4);
      }
    }
  }
  return { width, height, frameCount: meta.frameCount, data };
}

/** Points per frame of a pack with correspondence (already validated by `parseDynamic`), or null. */
export function correspondenceOf(meta: SceneMeta, dynamic: DynamicLayer): Pack['correspondence'] {
  return meta.correspondence === true ? { pointsPerFrame: dynamic.offsets[1] - dynamic.offsets[0] } : null;
}

// ---------------------------------------------------------------------------------------------

function readMagic(view: DataView): string {
  return String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isVec(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((v) => typeof v === 'number' && Number.isFinite(v));
}

if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) {
  throw new Error('4d-pack: a little-endian platform is required');
}
