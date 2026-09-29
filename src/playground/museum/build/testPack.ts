// Consistent test packs (tests only): `writePack` with one dynamic point per given position, so the
// centroid of each frame is known in advance.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { atlasLayout, DYNAMIC_FILE, SCENE_FILE, STATIC_FILE } from '../../../engine/pack/format';
import { writePack, type PackOutput } from '../../../engine/pack/writer';

/** `frames[f]` holds the xyz positions of the points of frame f. */
export function testPack(name: string, frames: [number, number, number][][], fps = 30): PackOutput {
  const layout = atlasLayout(64, 36, frames.length);
  const pages = Array.from({ length: layout.pages }, (_, i) => `source/page-${i}.png`);
  return writePack({
    name,
    synthetic: true,
    fps,
    cameras: frames.map(() => ({ pos: [0, 1.5, 4], quat: [0, 0, 0, 1], fov: 50, aspect: 16 / 9 })),
    static: { positions: new Float32Array([-10, -10, -10, 10, 10, 10]), colors: new Uint8Array(6) },
    frames: frames.map((points) => ({ positions: new Float32Array(points.flat()), colors: new Uint8Array(points.length * 3) })),
    source: { width: 64, height: 36, columns: layout.columns, rows: layout.rows, pages },
    sourcePageBytes: pages.map(() => 100),
  });
}

/** Writes the pack to `dir/<name>/` the way the bake publishes it. */
export function writeTestPack(dir: string, pack: PackOutput): string {
  const out = join(dir, pack.meta.name);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, SCENE_FILE), pack.sceneJson);
  writeFileSync(join(out, STATIC_FILE), new Uint8Array(pack.staticBin));
  writeFileSync(join(out, DYNAMIC_FILE), new Uint8Array(pack.dynamicBin));
  return out;
}
