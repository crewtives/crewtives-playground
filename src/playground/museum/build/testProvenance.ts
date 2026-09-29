// Valid test provenances (only for the manifest and render tests).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HASH_OVER, LOOP_FILES, LOOP_FRAMES, LOOP_FPS, passesFor, type LoopId, type LoopProvenance } from '../loops/provenance';

const hex = (n: number) => n.toString(16).padStart(64, '0');

export interface TestProvenanceOptions {
  commit: string;
  /** Recorded sources hash (`sourcesHash`); without it, the provenance does not include one. */
  sources?: string;
  recorded?: string;
  /** Source frames per position (works with a pack). */
  frames?: number[];
  pack?: string;
  /** Seeds per position (Bloomscope). */
  seeds?: number[];
  angle?: string;
  native?: { width: number; height: number };
  background?: string;
}

export function testProvenance(loop: LoopId, o: TestProvenanceOptions): LoopProvenance {
  const native = o.native ?? { width: 160, height: 100 };
  const block = loop === 'bloomscope' ? 2 : 3;
  const bloom = loop === 'bloomscope';
  const seeds = o.seeds ?? Array.from({ length: LOOP_FRAMES }, (_, f) => 610 + 2 * f);
  const frames = o.frames ?? Array.from({ length: LOOP_FRAMES }, (_, i) => 120 + 2 * i);
  const hashes = Array.from({ length: LOOP_FRAMES }, (_, i) => hex(i + 1));
  return {
    schema: 1,
    loop,
    work: { sheet: '000', title: 'test', synthetic: !bloom },
    route: bloom ? '/bloomscope/#g=test' : `/4d-os/${loop}/`,
    config: {
      viewport: { width: 1440, height: 900 },
      dpr: 1,
      hasTouch: false,
      isMobile: false,
      reducedMotion: false,
      display: '16',
      block,
      rect: { x: 0, y: 0, width: native.width * block, height: native.height * block },
      prep: o.background ? [{ kind: 'background', selector: 'body', color: o.background, note: 'test' }] : [],
      ...(bloom
        ? { sow: { section: 'sow', angle: o.angle ?? '137.508', startSeeds: seeds[0], endSeeds: seeds[seeds.length - 1], bloomWaitMs: 3106, hold: 'Space held on "Hold to sow"' } }
        : {}),
    },
    native,
    palette: ['#000000', '#ffffff'],
    format: { name: '4DLP', version: 1, bpp: 4, layout: '[y][frame][x]', compression: 'gzip', contentType: 'application/octet-stream' },
    recorded: o.recorded ?? '2026-09-25',
    ...(o.sources ? { sources: { algorithm: 'sha256', hash: o.sources } } : {}),
    commit: o.commit,
    method: {
      liveRender: true,
      controlledClock: true,
      onePixelPerBlock: true,
      verifiedExact: true,
      pageHidden: true,
      stepping: 'test',
      tool: 'test',
      browser: 'chromium',
      browserVersion: '0',
      renderer: 'test',
    },
    hash: { algorithm: 'sha256', over: HASH_OVER },
    poster: { file: LOOP_FILES.poster, hash: hashes[0] },
    passes: passesFor(loop).map((direction) => ({
      direction,
      fps: LOOP_FPS,
      frames: LOOP_FRAMES,
      source: bloom ? { kind: 'clock', instantsMs: Array.from({ length: LOOP_FRAMES }, (_, i) => Math.round((i * 1000) / 15)) } : { kind: 'pack', pack: o.pack ?? 'test-pack', frames },
      ...(bloom ? { seeds } : {}),
      file: LOOP_FILES.pass(direction),
      bytes: 1000,
      verification: { framesChecked: LOOP_FRAMES, mismatchedPixels: 0, transparentPixels: 0, outOfPalettePixels: 0 },
      hashes,
    })),
  };
}

export function writeTestProvenance(loopsDir: string, p: LoopProvenance): void {
  mkdirSync(join(loopsDir, p.loop), { recursive: true });
  writeFileSync(join(loopsDir, p.loop, LOOP_FILES.provenance), JSON.stringify(p));
}
