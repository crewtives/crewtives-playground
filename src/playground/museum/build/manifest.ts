// Manifest of the collection (D2): what the build reads from each work. Curation from `collection.ts`
// (with the creation date), pack figures (`scene.json`), trails (pack centroids or the Sow seeds the
// loop recorded) and the provenance of each loop, with the stale-loop warning (D6), which compares
// the hash of the work's sources with the one the provenance recorded. It does not use git. Runs in
// Node: the playground plugin and the tests use it.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatBytes, formatDuration, packBytes } from '../../../engine/shell/packStats';
import { gardenFromHash } from '../../bloomscope/garden';
import { FIXED_GARDEN_HASH, SHEETS, type SheetView, type WorkSheet } from '../collection';
import { LOOP_FILES, loopUrl, validateProvenance, type LoopId, type LoopProvenance } from '../loops/provenance';
import { seedTrail } from './seeds';
import { sourcesHash } from './sources';
import { packTrail, readPack, type Moment } from './trail';

export interface PackFacts {
  name: string;
  frameCount: number;
  fps: number;
  /** `formatDuration`: "15.0 s". */
  duration: string;
  counts: { static: number; dynamic: number };
  synthetic: boolean;
  bytes: number;
  /** `formatBytes(packBytes)`: the same label 4D.OS shows. */
  weight: string;
  /** "15.0 s · 450 frames at 30 fps". */
  dims: string;
}

export interface LoopEntry {
  id: LoopId;
  view: SheetView;
  /** Color of the passe-partout, `#rrggbb`. */
  mat: string;
  provenance: LoopProvenance | null;
  /** Published URL of the provenance. */
  provenanceUrl: string;
  /**
   * The recorded sources hash (null if the provenance has none) differs from the hash of the work's
   * current sources.
   */
  stale: { recordedHash: string | null; currentHash: string } | null;
}

export interface Trail {
  kind: 'path' | 'seeds';
  /** Every moment of the work, in time order. */
  moments: Moment[];
  /** Loop segment (moment indices, inclusive), or null if there is no loop yet. */
  span: [number, number] | null;
  /** Moment the NOW marks at each position of the loop. */
  nows: number[];
}

export interface SheetManifest {
  sheet: WorkSheet;
  created: string;
  pack: PackFacts | null;
  trail: Trail | null;
  loops: LoopEntry[];
}

export interface Manifest {
  sheets: SheetManifest[];
  /** Warnings the build writes without failing (stale or unrecorded loops). */
  warnings: string[];
}

export interface ManifestOptions {
  /** Repo root: source and token paths are relative to it. */
  root: string;
  /** Folder of the packs (by default `<root>/sites/4d-os/public/packs`). */
  packsDir?: string;
  /** Folder of the loops (by default `<root>/sites/playground/public/loops`). */
  loopsDir?: string;
  sheets?: readonly WorkSheet[];
}

export function packFacts(meta: { name: string; frameCount: number; fps: number; counts: { static: number; dynamic: number }; synthetic: boolean; files: Record<string, number> }): PackFacts {
  const bytes = packBytes(meta);
  const duration = formatDuration(meta.frameCount, meta.fps);
  return {
    name: meta.name,
    frameCount: meta.frameCount,
    fps: meta.fps,
    duration,
    counts: { static: meta.counts.static, dynamic: meta.counts.dynamic },
    synthetic: meta.synthetic,
    bytes,
    weight: formatBytes(bytes),
    dims: `${duration} · ${meta.frameCount} frames at ${meta.fps} fps`,
  };
}

/** Reads a `--name: #hex` color from a tokens file. */
export function readToken(root: string, file: string, name: string): string {
  const css = readFileSync(join(root, file), 'utf8');
  const match = new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:\\s*(#[0-9a-fA-F]{6})\\b`).exec(css);
  if (!match) throw new Error(`museum: token ${name} not found in ${file}`);
  return match[1].toLowerCase();
}

function readProvenance(loopsDir: string, id: LoopId, packLastFrame: Record<string, number>): LoopProvenance | null {
  const file = join(loopsDir, id, LOOP_FILES.provenance);
  if (!existsSync(file)) return null;
  const json = JSON.parse(readFileSync(file, 'utf8')) as unknown;
  const problems = validateProvenance(json, { packLastFrame });
  if (problems.length) throw new Error(`museum: the provenance of loop ${id} is not valid:\n- ${problems.join('\n- ')}`);
  return json as LoopProvenance;
}

/** Source frames of the FORWARD pass of a loop with a pack. */
function sourceFrames(p: LoopProvenance): number[] {
  const forward = p.passes.find((pass) => pass.direction === 'forward')!;
  if (forward.source.kind !== 'pack') throw new Error(`museum: loop ${p.loop} records no pack frames`);
  return forward.source.frames;
}

/** Sow angle of the fixed garden: the α of the 004 épure (D2, "Angle"). */
export function fixedGardenAlpha(): number {
  const garden = gardenFromHash(FIXED_GARDEN_HASH);
  if (!garden) throw new Error('museum: the fixed garden link cannot be read (did the #g= format change?)');
  return garden.sow;
}

export function buildManifest(options: ManifestOptions): Manifest {
  const { root } = options;
  const packsDir = options.packsDir ?? join(root, 'sites/4d-os/public/packs');
  const loopsDir = options.loopsDir ?? join(root, 'sites/playground/public/loops');
  const warnings: string[] = [];

  const sheets = (options.sheets ?? SHEETS).map((sheet): SheetManifest => {
    const current = sourcesHash(root, sheet.sources);

    let pack: PackFacts | null = null;
    let moments: Moment[] | null = null;
    const packLastFrame: Record<string, number> = {};
    if (sheet.pack) {
      const { meta, dynamic } = readPack(join(packsDir, sheet.pack));
      pack = packFacts(meta);
      moments = packTrail(meta, dynamic);
      packLastFrame[sheet.pack] = meta.frameCount - 1;
    }

    const loops = sheet.views.map((view): LoopEntry => {
      const provenance = readProvenance(loopsDir, view.loop, packLastFrame);
      let mat = readToken(root, view.mat.file, view.mat.name);
      let stale: LoopEntry['stale'] = null;
      if (provenance) {
        // Sow is recorded with the background set to its view's color: the passe-partout takes that same color.
        const background = provenance.config.prep.find((step) => step.kind === 'background');
        if (background && background.kind === 'background') mat = background.color.toLowerCase();
        const recordedHash = provenance.sources?.hash ?? null;
        if (recordedHash !== current) {
          stale = { recordedHash, currentHash: current };
          warnings.push(
            `sheet ${sheet.number} · ${sheet.title}, loop ${view.loop}: recorded on ${provenance.recorded} with sources ${recordedHash ? recordedHash.slice(0, 12) : '(no hash)'}; the work has changed since (now ${current.slice(0, 12)}). Re-record it.`,
          );
        }
      } else {
        warnings.push(`sheet ${sheet.number}, loop ${view.loop}: no loop has been recorded yet.`);
      }
      return { id: view.loop, view, mat, provenance, provenanceUrl: loopUrl(view.loop, LOOP_FILES.provenance), stale };
    });

    let trail: Trail | null = null;
    const recorded = loops.filter((l) => l.provenance).map((l) => l.provenance!);
    if (moments) {
      // Works with a pack: the NOW is the source frame of each position. A, B and C share the range.
      let nows: number[] = [];
      if (recorded.length) {
        nows = sourceFrames(recorded[0]);
        for (const other of recorded.slice(1)) {
          if (sourceFrames(other).join() !== nows.join()) {
            throw new Error(`museum: the loops of sheet ${sheet.number} do not share their source frames (${recorded[0].loop} and ${other.loop})`);
          }
        }
      }
      trail = { kind: 'path', moments, span: nows.length ? [nows[0], nows[nows.length - 1]] : null, nows };
    } else if (recorded.length) {
      // 004: the seeds the provenance records, with the α of the fixed garden.
      const p = recorded[0];
      const alpha = fixedGardenAlpha();
      const angle = p.config.sow?.angle;
      if (angle !== alpha.toFixed(3)) {
        throw new Error(
          `museum: loop ${p.loop} was recorded with Sow at "divergence ${angle}°" and the fixed garden gives ${alpha.toFixed(3)}°: the provenance's angle does not match the fixed garden.`,
        );
      }
      const forward = p.passes.find((pass) => pass.direction === 'forward')!;
      if (!forward.seeds) throw new Error(`museum: loop ${p.loop} records no seeds per frame`);
      const seeds = seedTrail(alpha, forward.seeds);
      trail = { kind: 'seeds', moments: seeds.moments, span: seeds.span, nows: seeds.nows };
    }

    return { sheet, created: sheet.created, pack, trail, loops };
  });

  return { sheets, warnings };
}
