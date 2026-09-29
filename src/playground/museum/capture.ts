// Recording configuration of each museum loop (D5, D6). `tools/capture-loops.ts` reads it and
// `collection.test.ts` imports it to check it against the collection. The dependency goes from here to
// `collection.ts`, never the other way round: sheet, title, pack and sources come from the collection.
import { WORLDS } from '../shared/worlds';
import { FIXED_GARDEN_LINK, SHEETS, SOW_EXPECTED, type WorkSheet } from './collection';
import { LOOP_FRAMES, type LoopId, type PassDirection, passesFor } from './loops/provenance';

/** Action before frame 0, which the recording applies and records in the provenance. */
export type CapturePrep =
  | { kind: 'keys'; keys: string[]; note: string }
  | { kind: 'clock'; ms: number; note: string };

/**
 * Framing, relative to the view's block grid (anchored at the bottom left).
 * - `inside`: whole blocks of the view only; `crop` removes blocks from each edge.
 * - `cover`: the smallest rectangle of blocks that contains the whole view (Sow: the circumscribed square).
 */
export type CaptureFrame =
  | { mode: 'inside'; crop?: { top?: number; right?: number; bottom?: number; left?: number } }
  | { mode: 'cover' };

export interface SowCapture {
  section: string;
  view: string;
  hold: string;
  seedsReadout: string;
  divergenceReadout: string;
  /** Hook-free sign that the bloom has started: the first pressed flower head. */
  bloomStarted: string;
  /** Visible only without WebGL2: the recording then fails. */
  noWebGL: string;
  /** "Scrub births": it must stay at all the seeds. */
  scrub: string;
  /** Palette token the view paints its background with (`SHEET`): it is set behind the canvas. */
  backdropToken: string;
  startSeeds: number;
  seedsPerFrame: number;
  /** Controlled clock time from the start of the bloom to frame 0 (≥ 610·4 + 650 + 16 ms). */
  bloomWaitMs: number;
}

export interface CaptureConfig {
  loop: LoopId;
  /** Public route of the work, with its fragment (Bloomscope: the fixed garden link). */
  route: string;
  viewport: { width: number; height: number };
  hasTouch: boolean;
  isMobile: boolean;
  /** Block size of the recorded view's display, in device pixels at DPR 1. */
  block: number;
  /** Element of the view: its rect (rounded like `Engine.measure`) anchors the block grid. */
  view: string;
  /** Element the view's display reads its palette's `--pal-16-*` tokens from. */
  paletteRoot: string;
  frame: CaptureFrame;
  passes: PassDirection[];
  /** Pack frames at each loop position (works with a pack; the pack is the sheet's) or the controlled clock (Bloomscope). */
  source: { kind: 'pack'; frames: number[] } | { kind: 'clock' };
  prep: CapturePrep[];
  sow?: SowCapture;
}

/**
 * Controlled clock time from the start of Sow's bloom to frame 0. The bloom alone needs
 * 610·4 + 650 + 16 ms, but the scroll that brings Sow into view shakes the Scope and its physics keeps
 * the engine awake: with 3.1 s or 6 s, the first dt after pressing "Hold to sow" is not 0 and frame 5
 * has one seed too many (621). At 12 s the engine is already at rest, and waiting longer (30 s) gives
 * the same loop.
 */
const SOW_SETTLE_MS = 12_000;
const SOW_BLOOM_MS = SOW_EXPECTED.startSeeds * 4 + 650 + 16;
if (SOW_SETTLE_MS < SOW_BLOOM_MS) throw new Error('capture: the Sow wait is shorter than its bloom');

/** Source frames of a segment that advances `step` pack frames per loop frame. */
function packFrames(start: number, step: number): number[] {
  return Array.from({ length: LOOP_FRAMES }, (_, i) => start + i * step);
}

/**
 * A, B and C are the same scene from the same commit: a single range of source frames. A 30 fps pack
 * seen at 15 fps advances 2 frames per loop frame, so the loop runs at real speed.
 */
const CAT_FRAMES = packFrames(120, 2);

const world = (loop: 'a' | 'b' | 'c' | 'd' | 'e', rest: Omit<CaptureConfig, 'loop' | 'route' | 'hasTouch' | 'isMobile' | 'block' | 'passes'>): CaptureConfig => ({
  loop,
  route: WORLDS.find((w) => w.id === loop)!.route,
  hasTouch: false,
  isMobile: false,
  block: 3,
  passes: passesFor(loop),
  ...rest,
});

/**
 * Framings measured on the build with these viewports (at DPR 1, block of 3):
 * - A: the showcase of its first screen, 921 × 516 → 307 × 172.
 * - B: the full plate, cropped to the clear glass where the work centers the subject (to the left of
 *   `.desk__rail` and above `.sheet`, like `plateFrame`): 1167 × 675 → 389 × 225.
 * - C: the gate window with a larger viewport (at 1440 it measures 1040 px): 1278 × 657 → 426 × 219.
 * - D: the scene to the left of the plotter (`aside.tube`, from x = 900): 900 × 900 → 300 × 300.
 * - E: the observatory, 1254 × 693 → 418 × 231.
 * - Bloomscope: the square that contains `.sow-view` (441 px), block of 2 → 221 × 221.
 */
export const CAPTURE: Record<LoopId, CaptureConfig> = {
  a: world('a', {
    viewport: { width: 1440, height: 900 },
    view: '[data-view="scene"]',
    paletteRoot: ':root',
    frame: { mode: 'inside' },
    source: { kind: 'pack', frames: CAT_FRAMES },
    prep: [],
  }),
  b: world('b', {
    viewport: { width: 1440, height: 900 },
    view: '[data-view="scene"]',
    paletteRoot: ':root',
    frame: { mode: 'inside', crop: { right: 91, bottom: 75 } },
    source: { kind: 'pack', frames: CAT_FRAMES },
    // Full plate (z = 1): with the page at the top, "−" adds to the pinch up to the limit and the loop keeps running.
    prep: [{ kind: 'keys', keys: Array(16).fill('-'), note: 'zoom out to the full plate (z = 1)' }],
  }),
  c: world('c', {
    viewport: { width: 1680, height: 1050 },
    view: '[data-view="scene"]',
    paletteRoot: ':root',
    frame: { mode: 'inside' },
    source: { kind: 'pack', frames: CAT_FRAMES },
    prep: [],
  }),
  d: world('d', {
    viewport: { width: 1440, height: 900 },
    view: '[data-view="scene"]',
    paletteRoot: ':root',
    frame: { mode: 'inside', crop: { right: 180 } },
    source: { kind: 'pack', frames: packFrames(120, 2) },
    prep: [],
  }),
  e: world('e', {
    viewport: { width: 1440, height: 900 },
    view: '[data-view="scene"]',
    paletteRoot: ':root',
    frame: { mode: 'inside' },
    source: { kind: 'pack', frames: packFrames(120, 2) },
    prep: [],
  }),
  bloomscope: {
    loop: 'bloomscope',
    route: FIXED_GARDEN_LINK,
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    isMobile: false,
    block: 2,
    view: '.sow-view',
    paletteRoot: '#sow',
    frame: { mode: 'cover' },
    passes: passesFor('bloomscope'),
    source: { kind: 'clock' },
    prep: [],
    sow: {
      section: '#sow',
      view: '.sow-view',
      hold: '.sow-hold',
      seedsReadout: '.sow-seeds',
      divergenceReadout: '.sow-divergence',
      bloomStarted: '.herbarium-strip canvas.herb-thumb',
      noWebGL: '.nogl',
      scrub: '#sow-scrub',
      backdropToken: '--pal-16-14',
      startSeeds: SOW_EXPECTED.startSeeds,
      seedsPerFrame: SOW_EXPECTED.perFrame,
      bloomWaitMs: SOW_SETTLE_MS,
    },
  },
};

/** Sheet of a loop in the collection. */
export function sheetOf(loop: LoopId): WorkSheet {
  const sheet = SHEETS.find((s) => s.views.some((v) => v.loop === loop));
  if (!sheet) throw new Error(`capture: loop "${loop}" is not on any sheet of the collection`);
  return sheet;
}

/** Work and sheet as the provenance records them ("001 · A · Vitrine", "004 · Bloomscope"). */
export function workOf(loop: LoopId): { sheet: string; title: string; synthetic: boolean } {
  const sheet = sheetOf(loop);
  const view = sheet.views.find((v) => v.loop === loop)!;
  const synthetic = sheet.pack !== null && WORLDS.find((w) => w.id === loop)?.synthetic === true;
  return { sheet: `${sheet.number} · ${view.label ?? sheet.title}`, title: sheet.title, synthetic };
}
