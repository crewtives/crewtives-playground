// Published provenance per loop (spec work-loops, "Published provenance per loop"). Pure module: no
// DOM and no dependencies, importable from the browser, the build, the tests and the recording script.

/** Cadence and length shared by the whole collection: a single page clock (D4). */
export const LOOP_FPS = 15;
export const LOOP_FRAMES = 45;
/** Cap per pass, as the site transfers it. */
export const PASS_BYTES_MAX = 1_000_000;

export const LOOP_IDS = ['a', 'b', 'c', 'd', 'e', 'bloomscope'] as const;
export type LoopId = (typeof LOOP_IDS)[number];
export type PassDirection = 'forward' | 'rewind';

/** The 4D.OS worlds can rewind; Bloomscope cannot. */
export function passesFor(loop: LoopId): PassDirection[] {
  return loop === 'bloomscope' ? ['forward'] : ['forward', 'rewind'];
}

/** Published folder of the loops (sites/playground/public/loops/<id>/ → /loops/<id>/) and their files. */
export const LOOPS_BASE = '/loops';
export const LOOP_FILES = {
  provenance: 'provenance.json',
  poster: 'poster.webp',
  /** The poster's provenance sidecar, written by the recording tool. */
  posterSidecar: 'poster.webp.json',
  pass: (direction: PassDirection) => `${direction}.4dlp.gz`,
} as const;

export function loopUrl(loop: LoopId, file: string): string {
  return `${LOOPS_BASE}/${loop}/${file}`;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** State the work was prepared with before frame 0, in the order it was applied. */
export type PrepStep =
  | { kind: 'scroll'; x: number; y: number }
  | { kind: 'keys'; keys: string[]; note: string }
  | { kind: 'focus'; selector: string; note: string }
  | { kind: 'pointer'; x: number; y: number; note: string }
  | { kind: 'background'; selector: string; color: string; note: string }
  | { kind: 'clock'; ms: number; note: string };

export interface SowRecord {
  section: 'sow';
  /** The work's "divergence …°" readout, with its 3 decimals (equal to α.toFixed(3) of the fixed garden). */
  angle: string;
  startSeeds: number;
  endSeeds: number;
  /** Controlled clock time between the start of the bloom and frame 0. */
  bloomWaitMs: number;
  /** How "Hold to sow" was held. */
  hold: string;
}

export type PassSource =
  | { kind: 'pack'; pack: string; frames: number[] }
  /** Instants of the controlled clock, in ms from frame 0. */
  | { kind: 'clock'; instantsMs: number[] };

export interface PassVerification {
  framesChecked: number;
  /** Differing pixels between the capture and the upscaled native frame, summed over the whole pass. */
  mismatchedPixels: number;
  transparentPixels: number;
  outOfPalettePixels: number;
}

export interface LoopPass {
  direction: PassDirection;
  fps: number;
  frames: number;
  source: PassSource;
  /** Bloomscope only: the "seeds N" readout at each position. */
  seeds?: number[];
  file: string;
  /** Weight as the site transfers it. */
  bytes: number;
  verification: PassVerification;
  /** SHA-256 of each frame (see `LoopProvenance.hash`). */
  hashes: string[];
}

export interface LoopFormat {
  name: '4DLP';
  version: number;
  bpp: 4;
  layout: string;
  compression: 'gzip';
  contentType: string;
}

export interface LoopProvenance {
  schema: 1;
  loop: LoopId;
  work: { sheet: string; title: string; synthetic: boolean };
  /** Recorded route, with its fragment or parameters. */
  route: string;
  config: {
    viewport: { width: number; height: number };
    dpr: number;
    hasTouch: boolean;
    isMobile: boolean;
    reducedMotion: boolean;
    display: '16';
    block: number;
    /** Recorded rectangle, in the page's device pixels. */
    rect: Rect;
    prep: PrepStep[];
    sow?: SowRecord;
  };
  native: { width: number; height: number };
  /** Palette colors as `#rrggbb`, 16 at most; the format's indices follow this order. */
  palette: string[];
  format: LoopFormat;
  /** Recording date, YYYY-MM-DD. */
  recorded: string;
  /**
   * Hash of the content of the work's sources at recording time (`build/sources.ts`). A provenance
   * recorded before this field existed does not have it, and its loop counts as stale.
   */
  sources?: { algorithm: 'sha256'; hash: string };
  /** Full hash of the commit it was recorded at: informative, to link to the code. */
  commit: string;
  method: {
    liveRender: true;
    controlledClock: true;
    onePixelPerBlock: true;
    verifiedExact: true;
    pageHidden: true;
    /** How the controlled clock advanced between frames of the loop. */
    stepping: string;
    tool: string;
    browser: string;
    browserVersion: string;
    renderer: string;
  };
  hash: { algorithm: 'sha256'; over: string };
  poster: { file: string; hash: string };
  passes: LoopPass[];
}

/** Provenance sidecar of the poster (`poster.webp.json`). */
export interface PosterSidecar {
  prompt: string;
  /** When it was written, ISO 8601. */
  createdAt: string;
}

/**
 * Poster sidecar of a recording: it says the poster is not generated, which frame and which loop it
 * is, the route, the commit, the recording date and the SHA-256 of the poster.
 */
export function posterSidecar(p: LoopProvenance, createdAt: string): PosterSidecar {
  return {
    prompt:
      `Origin: not generated. Frame 0 of the FORWARD pass of loop ${p.loop} (${p.work.sheet}), recorded from the live render of ${p.route} at commit ${p.commit} on ${p.recorded}, ` +
      `one pixel per display block (${p.native.width} x ${p.native.height}, ${p.palette.length}-color palette), saved as lossless WebP and verified identical to that frame ` +
      `(SHA-256 ${p.poster.hash} over RGBA). Full record: ${LOOP_FILES.provenance} in this folder.`,
    createdAt,
  };
}

/** How each frame hash is computed (published in `hash.over`). */
export const HASH_OVER = 'native frame, RGBA 8 bits per channel, rows top to bottom, left to right';

export interface ValidateOptions {
  /** Last frame (frameCount − 1) of each pack, to check the range of source frames. */
  packLastFrame?: Record<string, number>;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks that a provenance has every field and that they are consistent with each other. Returns the
 * list of problems (empty if it is valid); each one names the field.
 */
export function validateProvenance(json: unknown, options: ValidateOptions = {}): string[] {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(message);
  if (!isObject(json)) return ['the provenance is not an object'];
  const p = json as Partial<LoopProvenance> & Record<string, unknown>;

  if (p.schema !== 1) fail('schema: expected 1');
  const loop = p.loop;
  if (!LOOP_IDS.includes(loop as LoopId)) fail(`loop: "${String(loop)}" is not a loop of the collection`);
  if (!isObject(p.work) || typeof p.work.sheet !== 'string' || !p.work.sheet || typeof p.work.title !== 'string' || !p.work.title || typeof p.work.synthetic !== 'boolean') {
    fail('work: sheet, title or synthetic is missing');
  }
  if (typeof p.route !== 'string' || !p.route.startsWith('/')) fail('route: the recorded route is missing');

  const config = p.config;
  let block = 0;
  if (!isObject(config)) fail('config: missing');
  else {
    if (!isObject(config.viewport) || !isPositiveInt(config.viewport.width) || !isPositiveInt(config.viewport.height)) fail('config.viewport: integer width and height');
    if (!(typeof config.dpr === 'number' && config.dpr > 0)) fail('config.dpr: missing');
    for (const key of ['hasTouch', 'isMobile', 'reducedMotion'] as const) {
      if (typeof config[key] !== 'boolean') fail(`config.${key}: missing`);
    }
    if (config.display !== '16') fail('config.display: loops are recorded in 16 colors');
    if (!isPositiveInt(config.block)) fail('config.block: positive integer');
    else block = config.block;
    const rect = config.rect;
    if (!isObject(rect) || ![rect.x, rect.y].every(Number.isInteger) || !isPositiveInt(rect.width) || !isPositiveInt(rect.height)) {
      fail('config.rect: integer x, y, width and height');
    } else if (block && (rect.width % block || rect.height % block)) {
      fail(`config.rect: ${rect.width} × ${rect.height} is not a multiple of block ${block}`);
    } else if (block && isObject(p.native) && (p.native.width !== rect.width / block || p.native.height !== rect.height / block)) {
      fail(`native: ${p.native.width} × ${p.native.height} is not the rectangle divided by the block (${rect.width / block} × ${rect.height / block})`);
    }
    if (!Array.isArray(config.prep)) fail('config.prep: the list of preparation steps is missing');
    if (loop === 'bloomscope') {
      const sow = config.sow;
      if (!isObject(sow) || sow.section !== 'sow' || typeof sow.angle !== 'string' || !isPositiveInt(sow.startSeeds) || !isPositiveInt(sow.endSeeds) || !(sow.bloomWaitMs > 0) || typeof sow.hold !== 'string') {
        fail('config.sow: section, angle, seeds at the start and at the end, bloom wait, or how "Hold to sow" was held is missing');
      }
    } else if (config.sow !== undefined) fail('config.sow: only Bloomscope records Sow');
  }

  if (!isObject(p.native) || !isPositiveInt(p.native.width) || !isPositiveInt(p.native.height)) fail('native: integer width and height');
  if (!Array.isArray(p.palette) || p.palette.length < 1 || p.palette.length > 16) fail('palette: 1 to 16 colors');
  else {
    if (!p.palette.every((c) => typeof c === 'string' && HEX_COLOR.test(c))) fail('palette: each color as #rrggbb, in lowercase');
    if (new Set(p.palette).size !== p.palette.length) fail('palette: repeated colors');
  }
  const format = p.format;
  if (!isObject(format) || format.name !== '4DLP' || !isPositiveInt(format.version) || format.bpp !== 4 || typeof format.layout !== 'string' || format.compression !== 'gzip' || typeof format.contentType !== 'string') {
    fail('format: the published format is missing (4DLP, version, bpp, layout, compression and Content-Type)');
  }
  if (typeof p.recorded !== 'string' || !DATE.test(p.recorded)) fail('recorded: date YYYY-MM-DD');
  if (p.sources !== undefined && (!isObject(p.sources) || p.sources.algorithm !== 'sha256' || typeof p.sources.hash !== 'string' || !SHA256.test(p.sources.hash))) {
    fail('sources: algorithm sha256 and hash in lowercase hexadecimal');
  }
  if (typeof p.commit !== 'string' || !COMMIT.test(p.commit)) fail('commit: full 40-character hash');
  const method = p.method;
  if (!isObject(method) || method.liveRender !== true || method.controlledClock !== true || method.onePixelPerBlock !== true || method.verifiedExact !== true || method.pageHidden !== true) {
    fail('method: live render, controlled clock, one pixel per block, verified exact and page hidden');
  } else if (![method.stepping, method.tool, method.browser, method.browserVersion, method.renderer].every((v) => typeof v === 'string' && v.length > 0)) {
    fail('method: the clock stepping, the tool, the browser, its version or the renderer is missing');
  }
  if (!isObject(p.hash) || p.hash.algorithm !== 'sha256' || typeof p.hash.over !== 'string') fail('hash: algorithm sha256 and what it is computed over');

  const passes = p.passes;
  if (!Array.isArray(passes)) {
    fail('passes: missing');
    return errors;
  }
  const expected = LOOP_IDS.includes(loop as LoopId) ? passesFor(loop as LoopId) : [];
  const directions = passes.map((pass) => (isObject(pass) ? pass.direction : undefined));
  if (directions.join() !== expected.join()) fail(`passes: expected ${expected.join(' and ')}, found ${directions.join(', ') || 'none'}`);

  passes.forEach((pass, index) => {
    const name = `passes[${index}]${isObject(pass) && typeof pass.direction === 'string' ? ` (${pass.direction})` : ''}`;
    if (!isObject(pass)) return fail(`${name}: not an object`);
    if (pass.fps !== LOOP_FPS) fail(`${name}.fps: ${pass.fps}, the collection runs at ${LOOP_FPS}`);
    if (pass.frames !== LOOP_FRAMES) fail(`${name}.frames: ${pass.frames}, the collection uses ${LOOP_FRAMES}`);
    const n = pass.frames;
    if (!Array.isArray(pass.hashes) || pass.hashes.length !== n || !pass.hashes.every((h) => typeof h === 'string' && SHA256.test(h))) {
      fail(`${name}.hashes: ${n} SHA-256 hashes in lowercase hexadecimal`);
    }
    const source = pass.source;
    if (!isObject(source)) fail(`${name}.source: missing`);
    else if (source.kind === 'pack') {
      if (loop === 'bloomscope') fail(`${name}.source: Bloomscope has no pack`);
      if (typeof source.pack !== 'string' || !source.pack) fail(`${name}.source.pack: missing`);
      if (!Array.isArray(source.frames) || source.frames.length !== n || !source.frames.every((f) => Number.isInteger(f) && f >= 0)) {
        fail(`${name}.source.frames: ${n} integer frames of the pack`);
      } else {
        const last = options.packLastFrame?.[source.pack];
        if (last !== undefined && source.frames.some((f) => f > last)) fail(`${name}.source.frames: some frames come after the last frame of the pack (${last})`);
      }
    } else if (source.kind === 'clock') {
      if (loop !== 'bloomscope') fail(`${name}.source: the 4D.OS worlds record frames of their pack`);
      if (!Array.isArray(source.instantsMs) || source.instantsMs.length !== n || !source.instantsMs.every((t) => typeof t === 'number' && t >= 0)) {
        fail(`${name}.source.instantsMs: ${n} instants of the controlled clock`);
      }
    } else fail(`${name}.source.kind: "pack" or "clock"`);
    if (loop === 'bloomscope') {
      if (!Array.isArray(pass.seeds) || pass.seeds.length !== n || !pass.seeds.every(isPositiveInt)) fail(`${name}.seeds: ${n} seed counts`);
    } else if (pass.seeds !== undefined) fail(`${name}.seeds: only Bloomscope records seeds`);
    if (typeof pass.file !== 'string' || !pass.file) fail(`${name}.file: missing`);
    if (!isPositiveInt(pass.bytes)) fail(`${name}.bytes: the weight is missing`);
    else if (pass.bytes > PASS_BYTES_MAX) fail(`${name}.bytes: ${pass.bytes} B exceeds the cap of ${PASS_BYTES_MAX} B`);
    const v = pass.verification;
    if (!isObject(v) || v.framesChecked !== n || v.mismatchedPixels !== 0 || v.transparentPixels !== 0 || v.outOfPalettePixels !== 0) {
      fail(`${name}.verification: ${n} frames verified with 0 differing, 0 transparent and 0 out-of-palette pixels`);
    }
  });

  // Both passes show the same source frame at each position.
  const [forward, rewind] = passes as LoopPass[];
  if (isObject(forward) && isObject(rewind) && isObject(forward.source) && isObject(rewind.source) && forward.source.kind === 'pack' && rewind.source.kind === 'pack') {
    if (forward.source.pack !== rewind.source.pack || forward.source.frames?.join() !== rewind.source.frames?.join()) {
      fail('passes: FORWARD and REWIND do not show the same source frame at each position');
    }
  }
  if (loop === 'bloomscope' && isObject(forward) && Array.isArray(forward.seeds) && isObject(config?.sow)) {
    if (forward.seeds[0] !== config.sow.startSeeds || forward.seeds[forward.seeds.length - 1] !== config.sow.endSeeds) {
      fail('config.sow: the seeds at the start and at the end do not match those of the pass');
    }
  }
  if (!isObject(p.poster) || typeof p.poster.file !== 'string' || typeof p.poster.hash !== 'string' || !SHA256.test(p.poster.hash)) fail('poster: file and hash');
  else if (isObject(forward) && Array.isArray(forward.hashes) && p.poster.hash !== forward.hashes[0]) fail('poster.hash: does not match frame 0 of the FORWARD pass');

  return errors;
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}
