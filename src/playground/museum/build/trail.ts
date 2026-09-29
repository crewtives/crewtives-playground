// Trail of a work with a 4D pack (D2, D3): for each frame, the centroid of the dynamic points (the
// subject). The plan uses its position on the scene's floor (x, z) and the elevation uses the same x
// with the frame as height. The same method for all three packs; it never comes from the equation of
// the work's rule, it comes from the points.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DYNAMIC_FILE, QUANT_MAX, SCENE_FILE, type SceneMeta } from '../../../engine/pack/format';
import { parseDynamic, parseScene } from '../../../engine/pack/loader';

/** A moment of the trail: where (x, depth on the plane of the plan) and when (t). */
export interface Moment {
  x: number;
  depth: number;
  t: number;
}

/** Centroid (x, z) of the dynamic points of each frame, in scene coordinates. */
export function centroids(meta: SceneMeta, dynamic: ArrayBuffer): [number, number][] {
  const layer = parseDynamic(dynamic, meta);
  const { min, max } = meta.bbox;
  const sx = (max[0] - min[0]) / QUANT_MAX;
  const sz = (max[2] - min[2]) / QUANT_MAX;
  const out: [number, number][] = [];
  for (let f = 0; f < layer.frameCount; f++) {
    const from = layer.offsets[f];
    const to = layer.offsets[f + 1];
    if (to === from) throw new Error(`${meta.name}: frame ${f} has no dynamic points`);
    let qx = 0;
    let qz = 0;
    for (let i = from; i < to; i++) {
      qx += layer.positions[i * 3];
      qz += layer.positions[i * 3 + 2];
    }
    const n = to - from;
    out.push([min[0] + (qx / n) * sx, min[2] + (qz / n) * sz]);
  }
  return out;
}

/** Trail of a pack: one moment per frame, with the frame as time. */
export function packTrail(meta: SceneMeta, dynamic: ArrayBuffer): Moment[] {
  return centroids(meta, dynamic).map(([x, z], f) => ({ x, depth: z, t: f }));
}

/** Reads `scene.json` and `dynamic.bin` from a pack's folder. */
export function readPack(dir: string): { meta: SceneMeta; dynamic: ArrayBuffer } {
  const meta = parseScene(JSON.parse(readFileSync(join(dir, SCENE_FILE), 'utf8')));
  const bytes = readFileSync(join(dir, DYNAMIC_FILE));
  const dynamic = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return { meta, dynamic };
}
