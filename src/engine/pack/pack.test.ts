import { describe, expect, test } from 'vitest';
import { DYNAMIC_FILE, QUANT_MAX, SCENE_FILE, STATIC_FILE, atlasLayout, type SceneMeta } from './format';
import { PackError, correspondenceOf, loadPack, parseDynamic, parseScene, parseStatic, type SourceFrames } from './loader';
import { quantizationError, writePack, type PackInput, type PointSet } from './writer';

// Deterministic generator for the test data.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function points(count: number, random: () => number, scale = 10): PointSet {
  const positions = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (random() - 0.5) * scale;
    colors[i] = Math.floor(random() * 256);
  }
  return { positions, colors };
}

// Per-frame counts with an odd total (the u16 frames block ends up misaligned) and one empty frame.
const FRAME_COUNTS = [5, 0, 7, 3, 4];

function makeInput(): PackInput {
  const random = rng(42);
  const frameCount = FRAME_COUNTS.length;
  const layout = atlasLayout(64, 36, frameCount);
  const pages = Array.from({ length: layout.pages }, (_, i) => `source/page-${i}.png`);
  return {
    name: 'test-pack',
    synthetic: true,
    fps: 15,
    cameras: FRAME_COUNTS.map((_, f) => ({ pos: [f, 1.5, 4], quat: [0, 0, 0, 1], fov: 50, aspect: 16 / 9 })),
    static: points(11, random, 40),
    frames: FRAME_COUNTS.map((count) => points(count, random)),
    source: { width: 64, height: 36, columns: layout.columns, rows: layout.rows, pages },
    sourcePageBytes: pages.map(() => 100),
  };
}

function dequantize(q: number, axis: number, meta: SceneMeta) {
  const { min, max } = meta.bbox;
  return min[axis] + (q / QUANT_MAX) * (max[axis] - min[axis]);
}

function expectPackError(fn: () => unknown, layer: string, ...fragments: string[]) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PackError);
    const packError = error as PackError;
    expect(packError.layer).toBe(layer);
    expect(packError.message).toContain(layer);
    for (const fragment of fragments) expect(packError.reason).toContain(fragment);
    return;
  }
  throw new Error('expected a PackError');
}

describe('writer → reader (round trip)', () => {
  const input = makeInput();
  const out = writePack(input);
  const meta = parseScene(JSON.parse(out.sceneJson));
  const staticLayer = parseStatic(out.staticBin, meta);
  const dynamic = parseDynamic(out.dynamicBin, meta);
  const tolerance = quantizationError(meta.bbox).map((e) => e + 1e-5);

  test('metadata: counts, frames and one camera per frame', () => {
    expect(meta.frameCount).toBe(FRAME_COUNTS.length);
    expect(meta.cameras).toHaveLength(meta.frameCount);
    expect(meta.counts.static).toBe(11);
    expect(meta.counts.dynamic).toBe(FRAME_COUNTS.reduce((a, b) => a + b, 0));
    expect(meta.synthetic).toBe(true);
    expect(meta.files[STATIC_FILE]).toBe(out.staticBin.byteLength);
    expect(meta.files[DYNAMIC_FILE]).toBe(out.dynamicBin.byteLength);
  });

  test('static positions within the quantization error and exact colors', () => {
    for (let i = 0; i < staticLayer.count * 3; i++) {
      const axis = i % 3;
      expect(Math.abs(dequantize(staticLayer.positions[i], axis, meta) - input.static.positions[i])).toBeLessThanOrEqual(
        tolerance[axis],
      );
    }
    expect(Array.from(staticLayer.colors)).toEqual(Array.from(input.static.colors));
  });

  test('dynamic layer: offsets, frame per point, positions and colors', () => {
    expect(dynamic.offsets[0]).toBe(0);
    expect(dynamic.offsets[meta.frameCount]).toBe(dynamic.count);
    input.frames.forEach((set, f) => {
      const start = dynamic.offsets[f];
      expect(dynamic.offsets[f + 1] - start).toBe(FRAME_COUNTS[f]);
      for (let j = 0; j < FRAME_COUNTS[f]; j++) {
        const i = start + j;
        expect(dynamic.frames[i]).toBe(f);
        for (let axis = 0; axis < 3; axis++) {
          const original = set.positions[j * 3 + axis];
          expect(Math.abs(dequantize(dynamic.positions[i * 3 + axis], axis, meta) - original)).toBeLessThanOrEqual(
            tolerance[axis],
          );
          expect(dynamic.colors[i * 3 + axis]).toBe(set.colors[j * 3 + axis]);
        }
      }
    });
  });

  test('the offset table is non-decreasing', () => {
    for (let f = 0; f < meta.frameCount; f++) expect(dynamic.offsets[f + 1]).toBeGreaterThanOrEqual(dynamic.offsets[f]);
  });

  test('same input, same bytes', () => {
    const again = writePack(makeInput());
    expect(again.sceneJson).toBe(out.sceneJson);
    expect(new Uint8Array(again.staticBin)).toEqual(new Uint8Array(out.staticBin));
    expect(new Uint8Array(again.dynamicBin)).toEqual(new Uint8Array(out.dynamicBin));
  });
});

describe('corrupt packs', () => {
  const fresh = () => {
    const out = writePack(makeInput());
    return { ...out, meta: JSON.parse(out.sceneJson) as SceneMeta };
  };

  test('wrong identifier in the dynamic layer', () => {
    const { meta, dynamicBin } = fresh();
    new Uint8Array(dynamicBin).set([0x34, 0x44, 0x53, 0x54]); // "4DST"
    expectPackError(() => parseDynamic(dynamicBin, meta), 'dynamic', 'bad format identifier', '"4DDY"', '"4DST"');
  });

  test('wrong identifier in the static layer', () => {
    const { meta, staticBin } = fresh();
    new Uint8Array(staticBin)[0] = 0x58;
    expectPackError(() => parseStatic(staticBin, meta), 'static', 'bad format identifier', '"4DST"');
  });

  test('an inconsistent static count reports both values', () => {
    const { meta, staticBin } = fresh();
    meta.counts.static = 12;
    expectPackError(() => parseStatic(staticBin, meta), 'static', 'point count mismatch', '12', '11');
  });

  test('an inconsistent dynamic count reports both values', () => {
    const { meta, dynamicBin } = fresh();
    meta.counts.dynamic = 20;
    expectPackError(() => parseDynamic(dynamicBin, meta), 'dynamic', 'point count mismatch', '20', '19');
  });

  test('inconsistent frame count', () => {
    const { meta, dynamicBin } = fresh();
    new DataView(dynamicBin).setUint32(8, 6, true);
    expectPackError(() => parseDynamic(dynamicBin, meta), 'dynamic', 'frame count mismatch', '5', '6');
  });

  test('truncated file', () => {
    const { meta, dynamicBin } = fresh();
    expectPackError(() => parseDynamic(dynamicBin.slice(0, dynamicBin.byteLength - 1), meta), 'dynamic', 'unexpected size');
  });

  test('decreasing offset table', () => {
    const { meta, dynamicBin } = fresh();
    const offsets = new Uint32Array(dynamicBin, 12, meta.frameCount + 1);
    offsets[2] = 1; // should be 5
    expectPackError(() => parseDynamic(dynamicBin, meta), 'dynamic', 'offset table decreases');
  });

  test('a point declares a frame other than the one of its range', () => {
    const { meta, dynamicBin } = fresh();
    const count = meta.counts.dynamic;
    const framesOffset = 12 + (meta.frameCount + 1) * 4 + count * 9;
    new DataView(dynamicBin).setUint16(framesOffset, 3, true);
    expectPackError(() => parseDynamic(dynamicBin, meta), 'dynamic', 'point 0 declares frame 3');
  });

  test('unsupported version', () => {
    const { meta } = fresh();
    expectPackError(() => parseScene({ ...meta, version: 99 }), 'scene', 'unsupported format version 99');
  });

  test('one camera short', () => {
    const { meta } = fresh();
    expectPackError(() => parseScene({ ...meta, cameras: meta.cameras.slice(1) }), 'scene', 'camera count mismatch', '5', '4');
  });

  test('atlas pages that do not cover the frames', () => {
    const { meta } = fresh();
    expectPackError(() => parseScene({ ...meta, source: { ...meta.source, pages: [] } }), 'scene', 'source page count mismatch');
  });
});

// ---------------------------------------------------------------------------------------------
// Point correspondence between frames (stable points)

const STABLE_POINTS = 4;

function makeStableInput(): PackInput {
  const input = makeInput();
  const random = rng(7);
  return { ...input, frames: FRAME_COUNTS.map(() => points(STABLE_POINTS, random)), correspondence: true };
}

describe('correspondence between frames', () => {
  test('the writer declares it in scene.json without changing the version', () => {
    const out = writePack(makeStableInput());
    const json = JSON.parse(out.sceneJson);
    expect(json.correspondence).toBe(true);
    expect(json.version).toBe(1);
    const meta = parseScene(json);
    const dynamic = parseDynamic(out.dynamicBin, meta);
    expect(correspondenceOf(meta, dynamic)).toEqual({ pointsPerFrame: STABLE_POINTS });
  });

  test('without the option, scene.json does not mention it and the bytes do not change', () => {
    const out = writePack(makeInput());
    expect(out.sceneJson).not.toContain('correspondence');
    expect('correspondence' in JSON.parse(out.sceneJson)).toBe(false);
    const explicit = writePack({ ...makeInput(), correspondence: false });
    expect(explicit.sceneJson).toBe(out.sceneJson);
    expect(new Uint8Array(explicit.dynamicBin)).toEqual(new Uint8Array(out.dynamicBin));
    const meta = parseScene(JSON.parse(out.sceneJson));
    expect(correspondenceOf(meta, parseDynamic(out.dynamicBin, meta))).toBeNull();
  });

  test('the writer requires equal counts and names the frame and the two counts', () => {
    const input = makeStableInput();
    input.frames[3] = points(STABLE_POINTS + 2, rng(3));
    expect(() => writePack(input)).toThrow(/frame 3 has 6 points, frame 0 has 4/);
  });

  test('the loader rejects different counts with the frame and the two counts', () => {
    const out = writePack(makeStableInput());
    const meta = parseScene(JSON.parse(out.sceneJson));
    // One point moves from frame 2 to frame 1: the table still grows and still ends at the total.
    new Uint32Array(out.dynamicBin, 12, meta.frameCount + 1)[2] += 1;
    expectPackError(() => parseDynamic(out.dynamicBin, meta), 'dynamic', 'correspondence', 'frame 1', '5 points', 'frame 0 has 4');
  });

  test('declaring correspondence in a pack with unequal frames is an error', () => {
    const out = writePack(makeInput());
    const meta = parseScene({ ...JSON.parse(out.sceneJson), correspondence: true });
    expectPackError(() => parseDynamic(out.dynamicBin, meta), 'dynamic', 'frame 1 has 0 points and frame 0 has 5');
  });

  test('a non-boolean value is rejected', () => {
    const out = writePack(makeStableInput());
    expectPackError(() => parseScene({ ...JSON.parse(out.sceneJson), correspondence: 'yes' }), 'scene', 'invalid "correspondence"');
  });
});

// ---------------------------------------------------------------------------------------------
// Loading over a simulated network

const stubSource = async (_pages: Blob[], meta: SceneMeta): Promise<SourceFrames> => ({
  width: meta.source.width,
  height: meta.source.height,
  frameCount: meta.frameCount,
  data: new Uint8Array(0),
});

function packFiles() {
  const out = writePack(makeInput());
  const files = new Map<string, Uint8Array>([
    [SCENE_FILE, new TextEncoder().encode(out.sceneJson)],
    [STATIC_FILE, new Uint8Array(out.staticBin)],
    [DYNAMIC_FILE, new Uint8Array(out.dynamicBin)],
  ]);
  for (const page of out.meta.source.pages) files.set(page, new Uint8Array(100));
  return { out, files };
}

describe('loadPack', () => {
  test('full load with a simulated fetch', async () => {
    const { out, files } = packFiles();
    const fetchImpl = (async (url: string) => new Response(files.get(url.replace('/packs/t/', '')) as Uint8Array<ArrayBuffer>)) as typeof fetch;
    const pack = await loadPack('/packs/t', { fetch: fetchImpl, decodeSource: stubSource });
    expect(pack.meta.frameCount).toBe(out.meta.frameCount);
    expect(pack.dynamic.count).toBe(out.meta.counts.dynamic);
    expect(pack.static.count).toBe(out.meta.counts.static);
    expect(pack.correspondence).toBeNull();
  });

  test('a pack with correspondence exposes the points per frame', async () => {
    const out = writePack(makeStableInput());
    const files = new Map<string, Uint8Array>([
      [SCENE_FILE, new TextEncoder().encode(out.sceneJson)],
      [STATIC_FILE, new Uint8Array(out.staticBin)],
      [DYNAMIC_FILE, new Uint8Array(out.dynamicBin)],
    ]);
    for (const page of out.meta.source.pages) files.set(page, new Uint8Array(100));
    const fetchImpl = (async (url: string) => new Response(files.get(url.replace('/packs/t/', '')) as Uint8Array<ArrayBuffer>)) as typeof fetch;
    const pack = await loadPack('/packs/t', { fetch: fetchImpl, decodeSource: stubSource });
    expect(pack.correspondence).toEqual({ pointsPerFrame: STABLE_POINTS });
    expect(pack.dynamic.count).toBe(STABLE_POINTS * FRAME_COUNTS.length);
  });

  test('a corrupt pack rejects with an error that names the layer', async () => {
    const { files } = packFiles();
    files.get(DYNAMIC_FILE)!.set([0x00, 0x00, 0x00, 0x00]);
    const fetchImpl = (async (url: string) => new Response(files.get(url.replace('/packs/t/', '')) as Uint8Array<ArrayBuffer>)) as typeof fetch;
    await expect(loadPack('/packs/t', { fetch: fetchImpl, decodeSource: stubSource })).rejects.toMatchObject({
      layer: 'dynamic',
      name: 'PackError',
    });
  });

  test('a 404 is reported as an error of the layer', async () => {
    const fetchImpl = (async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    await expect(loadPack('/packs/missing', { fetch: fetchImpl })).rejects.toMatchObject({ layer: 'scene' });
  });

  test('at 50% of the bytes the progress is 50% ±5%', async () => {
    const { files } = packFiles();
    const controllers = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
    const fetchImpl = (async (url: string) => {
      const name = url.replace('/packs/t/', '');
      if (name === SCENE_FILE) return new Response(files.get(name) as Uint8Array<ArrayBuffer>);
      const stream = new ReadableStream<Uint8Array>({ start: (controller) => void controllers.set(name, controller) });
      return new Response(stream);
    }) as typeof fetch;

    const progress: number[] = [];
    const loading = loadPack('/packs/t', { fetch: fetchImpl, decodeSource: stubSource, onProgress: (p) => progress.push(p) });
    await waitFor(() => controllers.size === files.size - 1);

    // Deliver exactly half of the total bytes, split into chunks across the files.
    const pending = [...files].filter(([name]) => name !== SCENE_FILE);
    const total = pending.reduce((sum, [, bytes]) => sum + bytes.byteLength, 0);
    let budget = Math.floor(total / 2);
    const sent = new Map<string, number>();
    for (const [name, bytes] of pending) {
      const take = Math.min(budget, bytes.byteLength);
      for (let at = 0; at < take; at += 7) controllers.get(name)!.enqueue(bytes.slice(at, Math.min(take, at + 7)));
      sent.set(name, take);
      budget -= take;
    }
    await waitFor(() => progress.length > 0 && Math.abs(progress[progress.length - 1] - 0.5) < 0.05);
    expect(progress[progress.length - 1]).toBeGreaterThanOrEqual(0.45);
    expect(progress[progress.length - 1]).toBeLessThanOrEqual(0.55);

    // Deliver the rest.
    for (const [name, bytes] of pending) {
      const controller = controllers.get(name)!;
      if (sent.get(name)! < bytes.byteLength) controller.enqueue(bytes.slice(sent.get(name)));
      controller.close();
    }
    await loading;
    expect(progress[progress.length - 1]).toBe(1);
    for (let i = 1; i < progress.length; i++) expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1]);
  });
});

async function waitFor(condition: () => boolean, timeout = 2000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('timeout waiting for the condition');
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}
