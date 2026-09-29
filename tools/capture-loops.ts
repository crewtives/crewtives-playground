/**
 * Records the loops of the playground museum (spec work-loops; design D5 and D6). Development-only
 * tool: it lives outside what the build publishes, adds no dependencies to package.json and only
 * writes to the museum's loops folder (sites/playground/public/loops/<id>/): the passes, the poster,
 * its provenance sidecar (poster.webp.json) and provenance.json, with the hash of the work's sources
 * and the commit it was recorded at.
 *
 * Usage, from the repo root:
 *
 *   rm -rf dist && npm run build && cp deploy/_redirects deploy/.assetsignore dist/
 *   npx wrangler dev -c deploy/wrangler.jsonc --port 8790 --ip 127.0.0.1   # in another terminal
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-loops.ts <a|b|c|d|e|bloomscope|all> [options]
 *
 * The first time on a machine, Playwright needs its Chromium: `npx -y playwright@1.63.0 install chromium`.
 *
 * Options:
 *   --base <url>          build server (default http://127.0.0.1:8790)
 *   --out <folder>        loops folder (default sites/playground/public/loops)
 *   --dry-run             records and verifies, but writes nothing
 *   --json <file>         dumps hashes, seeds, weights, sources hash and sidecar (to compare recordings)
 *   --cpu <n>             slows the CPU down n times (CDP Emulation.setCPUThrottlingRate)
 *   --budget <bytes>      cap per pass (default 1 000 000; to test the failure)
 *   --shift <px>          shifts the rectangle in x (to test the misalignment failure)
 *   --show <selector>     keeps an element of the page visible (to test the text-over-canvas failure)
 *   --garden <#g=…>       opens Bloomscope with another garden (to test the different-angle failure)
 *   --bloom-wait <ms>     controlled clock between the start of the bloom and Sow's frame 0
 *   --browser-arg <arg>   extra argument for Chromium (for example --disable-webgl2, to test the failure)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync, inflateSync } from 'node:zlib';
import { decodeGarden } from '../src/playground/bloomscope/garden.ts';
import { sourceFiles, sourcesHash } from '../src/playground/museum/build/sources.ts';
import { CAPTURE, type CaptureConfig, sheetOf, workOf } from '../src/playground/museum/capture.ts';
import { FIXED_GARDEN_HASH } from '../src/playground/museum/collection.ts';
import { alignedRect, CaptureError, checkPalette, type FrameRef, type Rgba, uniquePalette, verifyFrame } from '../src/playground/museum/loops/blocks.ts';
import { decode4dlp, encode4dlp, FORMAT_LAYOUT, FORMAT_VERSION, toIndices } from '../src/playground/museum/loops/format.ts';
import { frameHash } from '../src/playground/museum/loops/hash.ts';
import {
  HASH_OVER,
  LOOP_FILES,
  LOOP_FPS,
  LOOP_FRAMES,
  LOOP_IDS,
  type LoopId,
  type LoopPass,
  type LoopProvenance,
  PASS_BYTES_MAX,
  type PassDirection,
  type PassSource,
  posterSidecar,
  type PrepStep,
  type Rect,
  type SowRecord,
  validateProvenance,
} from '../src/playground/museum/loops/provenance.ts';

const PLAYWRIGHT_VERSION = '1.63.0';
const TSX_VERSION = '4.23.15';
const TOOL = `tools/capture-loops.ts with playwright@${PLAYWRIGHT_VERSION} and tsx@${TSX_VERSION} via npx`;
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Fixed date of the controlled clock: the page never sees the real time. */
const CLOCK_ORIGIN = Date.UTC(2026, 0, 1);
/** page.clock fires one animation frame every 16 ms of controlled clock. */
const TICK_MS = 16;
/** Real-time wait, with the clock stopped, so the asynchronous part of the load can finish. */
const SETTLE_REAL_MS = 1500;
/** Controlled clock before looking for the first source frame: display reveal and preparation. */
const WORLD_WARMUP_MS = 4000;
/** Extra frames before pressing REWIND, so the work is already rewinding when it reaches the loop's last frame. */
const REWIND_LEAD = 4;
const BROWSER_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

const STEPPING = {
  world:
    'the controlled clock advances one 16 ms animation frame at a time until the page timecode shows the source frame of the next loop position; the page time between loop frames is 64 or 80 ms',
  sow: 'the controlled clock advances Math.round(f·1000/15) − Math.round((f−1)·1000/15) ms before loop frame f',
};

interface Options {
  targets: LoopId[];
  base: string;
  out: string;
  dryRun: boolean;
  json: string | null;
  cpu: number;
  budget: number;
  shift: number;
  show: string | null;
  garden: string | null;
  bloomWait: number | null;
  browserArgs: string[];
}

interface RecordedPass {
  direction: PassDirection;
  natives: Rgba[];
  source: PassSource;
  seeds?: number[];
}

interface Recorded {
  route: string;
  rect: Rect;
  palette: string[];
  prep: PrepStep[];
  passes: RecordedPass[];
  sow?: SowRecord;
  renderer: string;
}

interface LoopResult {
  provenance: LoopProvenance;
  files: Map<string, Uint8Array>;
}

// ── Input ─────────────────────────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): Options {
  const options: Options = {
    targets: [],
    base: 'http://127.0.0.1:8790',
    out: join(REPO, 'sites/playground/public/loops'),
    dryRun: false,
    json: null,
    cpu: 1,
    budget: PASS_BYTES_MAX,
    shift: 0,
    show: null,
    garden: null,
    bloomWait: null,
    browserArgs: [],
  };
  const value = (i: number) => {
    if (argv[i + 1] === undefined) throw new Error(`missing the value of ${argv[i]}`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base') options.base = value(i++).replace(/\/$/, '');
    else if (arg === '--out') options.out = resolve(value(i++));
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = resolve(value(i++));
    else if (arg === '--cpu') options.cpu = Number(value(i++));
    else if (arg === '--budget') options.budget = Number(value(i++));
    else if (arg === '--shift') options.shift = Number(value(i++));
    else if (arg === '--show') options.show = value(i++);
    else if (arg === '--garden') options.garden = value(i++);
    else if (arg === '--bloom-wait') options.bloomWait = Number(value(i++));
    else if (arg === '--browser-arg') options.browserArgs.push(value(i++));
    else if (arg === 'all') options.targets.push(...LOOP_IDS);
    else if ((LOOP_IDS as readonly string[]).includes(arg)) options.targets.push(arg as LoopId);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.targets.length) throw new Error(`missing the work: ${LOOP_IDS.join(', ')} or all`);
  return options;
}

/** `npx -p playwright@X` only adds the binaries to PATH: the package is resolved from that cache. */
function loadPlaywright(): any {
  const dirs = [
    ...(process.env.PATH ?? '').split(':').filter((p) => p.includes(`${sep}_npx${sep}`) && p.endsWith(`node_modules${sep}.bin`)).map((bin) => join(bin, '..', '..')),
    ...(process.env.NODE_PATH ?? '').split(':').filter(Boolean).map((p) => join(p, '..')),
  ];
  for (const dir of dirs) {
    try {
      const playwright = createRequire(join(dir, 'package.json'))('playwright');
      const version = createRequire(join(dir, 'package.json'))('playwright/package.json').version;
      if (version !== PLAYWRIGHT_VERSION) continue;
      return playwright;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(`cannot find playwright@${PLAYWRIGHT_VERSION}: run the script with npx -y -p playwright@${PLAYWRIGHT_VERSION} -p tsx@${TSX_VERSION} tsx tools/capture-loops.ts …`);
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });
}

function packMeta(pack: string): { fps: number; lastFrame: number } {
  const scene = JSON.parse(readFileSync(join(REPO, 'sites/4d-os/public/packs', pack, 'scene.json'), 'utf8'));
  return { fps: scene.fps, lastFrame: scene.frameCount - 1 };
}

// ── PNG of the captures (Chromium: 8 bits, RGB or RGBA, no interlacing) ───────────────────────────

function decodePng(png: Uint8Array): Rgba {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Uint8Array[] = [];
  for (let p = 8; p < png.length; ) {
    const length = view.getUint32(p);
    const type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    const data = png.subarray(p + 8, p + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(p + 8);
      height = view.getUint32(p + 12);
      const [depth, color, , , interlace] = data.subarray(8, 13);
      if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6)) throw new Error(`unsupported PNG (depth ${depth}, color ${color})`);
      channels = color === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    p += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = cur[x * channels];
      out[o + 1] = cur[x * channels + 1];
      out[o + 2] = cur[x * channels + 2];
      out[o + 3] = channels === 4 ? cur[x * channels + 3] : 255;
    }
    prev = cur;
  }
  return { width, height, data: out };
}

// ── Page ──────────────────────────────────────────────────────────────────────────────────────────

async function shoot(page: any, rect: Rect): Promise<Rgba> {
  const png = await page.screenshot({ clip: rect, type: 'png', caret: 'hide', animations: 'allow', scale: 'device' });
  const image = decodePng(png);
  if (image.width !== rect.width || image.height !== rect.height) throw new CaptureError(`the capture measures ${image.width} × ${image.height} and not ${rect.width} × ${rect.height}`);
  return image;
}

/**
 * Hides everything that is not the engine's canvas, without touching layout or focus: opacity 0 on
 * every sibling along the canvas's ancestor chain, and the chain itself without backgrounds or
 * borders. `display: none` or `visibility: hidden` would take the focus away from "Hold to sow" (its
 * blur stops the sowing).
 */
async function hidePage(page: any, show: string | null, backdrop: string | null): Promise<void> {
  const hidden = await page.evaluate(
    ({ show, backdrop }: { show: string | null; backdrop: string | null }) => {
      const canvases = [...document.querySelectorAll('canvas')].filter(
        (c) => getComputedStyle(c).position === 'fixed' && c.width === Math.round(innerWidth * devicePixelRatio) && c.height === Math.round(innerHeight * devicePixelRatio),
      );
      if (!canvases.length) throw new Error("cannot find the engine's canvas");
      // No named functions in here: tsx wraps them with a `__name` helper that the page does not have.
      const chain = new Set<Element>();
      const shown = show ? [...document.querySelectorAll(show)] : [];
      for (const start of [...canvases, ...shown]) for (let e: Element | null = start; e; e = e.parentElement) chain.add(e);
      for (const el of chain) {
        if (el !== document.documentElement && el !== document.body && !(canvases as Element[]).includes(el) && !shown.includes(el)) el.setAttribute('data-capture-chain', '');
        if (shown.includes(el)) continue;
        for (const child of el.children) if (!chain.has(child)) child.setAttribute('data-capture-hide', '');
      }
      const style = document.createElement('style');
      style.textContent = [
        '[data-capture-hide] { opacity: 0 !important; }',
        '[data-capture-chain] { background: transparent !important; border-color: transparent !important; box-shadow: none !important; outline: none !important; }',
        '[data-capture-chain]::before, [data-capture-chain]::after { opacity: 0 !important; }',
        backdrop ? `html, body { background: ${backdrop} !important; }` : '',
      ].join('\n');
      document.head.append(style);
      return document.querySelectorAll('[data-capture-hide]').length;
    },
    { show, backdrop },
  );
  if (!hidden) throw new CaptureError('no page element was left to hide');
}

/** The view's rect as `Engine.measure` measures it, aligned to its block grid. */
async function captureRect(page: any, config: CaptureConfig, shift: number): Promise<Rect> {
  const view = await page.evaluate((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`cannot find the view ${selector}`);
    const box = el.getBoundingClientRect();
    const dpr = devicePixelRatio;
    return { left: Math.round(box.left * dpr), top: Math.round(box.top * dpr), width: Math.round(box.width * dpr), height: Math.round(box.height * dpr) };
  }, config.view);
  const rect = alignedRect(view, config.block, config.frame);
  return { ...rect, x: rect.x + shift };
}

/**
 * 16-color palette of the view's display, read from its `--pal-16-*` tokens (or from the requested
 * tokens), in 8-bit sRGB as the browser paints it.
 */
async function readPalette(page: any, root: string, tokens?: string[]): Promise<string[]> {
  const names = tokens ?? Array.from({ length: 16 }, (_, i) => `--pal-16-${i}`);
  const colors: string[] = await page.evaluate(({ selector, names }: { selector: string; names: string[] }) => {
    const el = document.querySelector(selector)!;
    const styles = getComputedStyle(el);
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const out: string[] = [];
    for (const name of names) {
      const value = styles.getPropertyValue(name).trim();
      if (!value) break;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      out.push(`#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`);
    }
    return out;
  }, { selector: root, names });
  if (colors.length < (tokens ? tokens.length : 2)) throw new CaptureError(`${root} does not have the tokens ${tokens?.join(', ') ?? '--pal-16-*'}`);
  return uniquePalette(colors);
}

async function rendererName(page: any): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown (no WebGL2)';
  });
}

// ── 4D.OS worlds ──────────────────────────────────────────────────────────────────────────────────

/** The work's own MM:SS:FF timecode (`[data-now]`) and its state ("FORWARD +1.00×"). */
async function readout(page: any, fps: number): Promise<{ frame: number; state: string }> {
  const { now, state } = await page.evaluate(() => {
    const stateEl = [...document.querySelectorAll('output, span, p')].find((el) => /^(FORWARD|REWIND|HOLD) [+−-]/.test(el.textContent?.trim() ?? ''));
    const nowEl = [...document.querySelectorAll('[data-now]')].find((el) => /^\d+:\d\d:\d\d$/.test(el.textContent?.trim() ?? ''));
    return { now: nowEl?.textContent?.trim() ?? '', state: stateEl?.textContent?.trim() ?? '' };
  });
  const match = /^(\d+):(\d\d):(\d\d)$/.exec(now);
  if (!match) throw new CaptureError(`cannot read the work's timecode ("${now}")`);
  return { frame: (Number(match[1]) * 60 + Number(match[2])) * Math.round(fps) + Number(match[3]), state };
}

/** Advances the clock one tick at a time until the work shows `target`; it never skips it (0.48 frames per tick). */
async function stepUntil(page: any, target: number, direction: PassDirection, fps: number, loop: string): Promise<string> {
  const perTick = (fps * TICK_MS) / 1000;
  for (let guard = 0; guard < 100_000; guard++) {
    const { frame, state } = await readout(page, fps);
    if (frame === target) return state;
    const ahead = direction === 'forward' ? target - frame : frame - target;
    if (ahead < 0) throw new CaptureError(`${loop}: the work went past frame ${target} (it is at ${frame})`);
    const ticks = ahead > 4 ? Math.floor((ahead - 3) / perTick) : 1;
    await page.clock.runFor(ticks * TICK_MS);
  }
  throw new CaptureError(`${loop}: the work never reaches frame ${target}`);
}

async function recordWorld(page: any, config: CaptureConfig, options: Options, prep: PrepStep[], ref: { route: string }): Promise<Omit<Recorded, 'renderer'>> {
  if (config.source.kind !== 'pack') throw new Error('a world records frames of its 4D pack');
  const { fps } = packMeta(sheetOf(config.loop).pack!);
  await page.waitForFunction(() => document.querySelector('[data-boot-pct]')?.textContent === '100', null, { timeout: 180_000 });
  await page.waitForTimeout(SETTLE_REAL_MS);
  prep.push({ kind: 'scroll', x: 0, y: 0 });
  for (const step of config.prep) {
    if (step.kind === 'keys') for (const key of step.keys) await page.keyboard.press(key);
    else await page.clock.runFor(step.ms);
    prep.push(step);
  }
  await page.clock.runFor(WORLD_WARMUP_MS);
  prep.push({ kind: 'clock', ms: WORLD_WARMUP_MS, note: 'controlled clock before looking for the first source frame (display reveal)' });
  await hidePage(page, options.show, null);
  const rect = await captureRect(page, config, options.shift);
  const palette = await readPalette(page, config.paletteRoot);
  const frames = config.source.frames;
  const passes: RecordedPass[] = [];
  for (const direction of config.passes) {
    if (direction === 'rewind') {
      await stepUntil(page, frames[frames.length - 1] + REWIND_LEAD, 'forward', fps, config.loop);
      await page.keyboard.press('j');
    }
    const natives: Rgba[] = new Array(frames.length);
    const order = frames.map((_, i) => (direction === 'forward' ? i : frames.length - 1 - i));
    for (const i of order) {
      const state = await stepUntil(page, frames[i], direction, fps, config.loop);
      const expected = direction === 'forward' ? 'FORWARD +1.00×' : 'REWIND −1.00×';
      if (state !== expected) throw new CaptureError(`${config.loop}, ${direction} pass, frame ${i}: the work says "${state}" and not "${expected}"`);
      const frameRef: FrameRef = { loop: config.loop, pass: direction, frame: i };
      const native = verifyFrame(await shoot(page, rect), config.block, frameRef);
      checkPalette(native, palette, frameRef);
      natives[i] = native;
    }
    passes.push({ direction, natives, source: { kind: 'pack', pack: sheetOf(config.loop).pack!, frames } });
  }
  return { route: ref.route, rect, palette, prep, passes };
}

// ── Bloomscope: Sow sowing (D6, fixed order) ──────────────────────────────────────────────────────

async function sowReadings(page: any, sow: NonNullable<CaptureConfig['sow']>): Promise<{ seeds: number; angle: string }> {
  const { seeds, angle } = await page.evaluate(
    (s: { seeds: string; angle: string }) => ({ seeds: document.querySelector(s.seeds)?.textContent ?? '', angle: document.querySelector(s.angle)?.textContent ?? '' }),
    { seeds: sow.seedsReadout, angle: sow.divergenceReadout },
  );
  const n = /seeds (\d+)/.exec(seeds);
  const a = /divergence ([\d.]+)°/.exec(angle);
  if (!n || !a) throw new CaptureError(`bloomscope: cannot read Sow's readouts ("${seeds}", "${angle}")`);
  return { seeds: Number(n[1]), angle: a[1] };
}

async function recordSow(page: any, config: CaptureConfig, options: Options, prep: PrepStep[], ref: { route: string }): Promise<Omit<Recorded, 'renderer'>> {
  const sow = config.sow!;
  const expectedAngle = decodeGarden(FIXED_GARDEN_HASH.slice(3))!.sow.toFixed(3);
  await page.waitForTimeout(SETTLE_REAL_MS);
  if (await page.evaluate((s: string) => document.querySelector(s)?.hasAttribute('hidden') === false, sow.noWebGL)) {
    throw new CaptureError('bloomscope: the page says there is no WebGL2 (.nogl visible); Sow would be painted in 2D, without blocks');
  }
  await page.mouse.move(0, 0);
  prep.push({ kind: 'pointer', x: 0, y: 0, note: 'pointer parked at the top left corner, outside the Sow view' });
  await page.evaluate((s: string) => (document.querySelector(s) as HTMLElement).focus({ preventScroll: true }), sow.hold);
  prep.push({ kind: 'focus', selector: sow.hold, note: '"Hold to sow" focused with preventScroll before framing, so focus never moves the page' });
  const y = await page.evaluate(({ view, hold }: { view: string; hold: string }) => {
    const v = document.querySelector(view)!.getBoundingClientRect();
    const h = document.querySelector(hold)!.getBoundingClientRect();
    return Math.round((Math.min(v.top, h.top) + Math.max(v.bottom, h.bottom)) / 2 + scrollY - innerHeight / 2);
  }, { view: sow.view, hold: sow.hold });
  await page.evaluate((top: number) => window.scrollTo(0, top), y);
  prep.push({ kind: 'scroll', x: 0, y });
  // The section comes on screen: the bloom starts with the first pressed head (in real time).
  await page.waitForFunction((s: string) => !!document.querySelector(s), sow.bloomStarted, { timeout: 30_000 });
  const bloomWait = options.bloomWait ?? sow.bloomWaitMs;
  await page.clock.runFor(bloomWait);
  prep.push({ kind: 'clock', ms: bloomWait, note: 'controlled clock from the first pressed head (bloom start) to frame 0: appearance and initial bloom finished' });
  const scrub = await page.evaluate((s: string) => {
    const input = document.querySelector(s) as HTMLInputElement | null;
    return input ? { value: input.value, max: input.max } : null;
  }, sow.scrub);
  if (!scrub || scrub.value !== scrub.max) throw new CaptureError(`bloomscope: "Scrub births" is not showing every seed (${scrub?.value}/${scrub?.max})`);
  if (await page.evaluate(() => scrollY) !== y) throw new CaptureError('bloomscope: the page moved during the wait');

  const palette = await readPalette(page, config.paletteRoot);
  const backdrop = (await readPalette(page, config.paletteRoot, [sow.backdropToken]))[0];
  if (!palette.includes(backdrop)) throw new CaptureError(`bloomscope: the background ${backdrop} (${sow.backdropToken}) is not a color of Sow's palette`);
  await hidePage(page, options.show, backdrop);
  prep.push({ kind: 'background', selector: 'html, body', color: backdrop, note: `page background behind the canvas set to the palette colour the Sow view paints its background with (${sow.backdropToken})` });
  const rect = await captureRect(page, config, options.shift);
  if (await page.evaluate((s: string) => document.activeElement !== document.querySelector(s), sow.hold)) throw new CaptureError('bloomscope: "Hold to sow" lost focus');

  const natives: Rgba[] = [];
  const seeds: number[] = [];
  const instants: number[] = [];
  for (let f = 0; f < LOOP_FRAMES; f++) {
    if (f > 0) await page.clock.runFor(Math.round((f * 1000) / LOOP_FPS) - Math.round(((f - 1) * 1000) / LOOP_FPS));
    const reading = await sowReadings(page, sow);
    if (reading.angle !== expectedAngle) throw new CaptureError(`bloomscope: Sow says "divergence ${reading.angle}°" and the fixed garden is ${expectedAngle}°`);
    const expected = sow.startSeeds + sow.seedsPerFrame * f;
    if (reading.seeds !== expected) throw new CaptureError(`bloomscope, forward pass, frame ${f}: Sow has ${reading.seeds} seeds and ${expected} were expected`);
    const frameRef: FrameRef = { loop: 'bloomscope', pass: 'forward', frame: f };
    const native = verifyFrame(await shoot(page, rect), config.block, frameRef);
    checkPalette(native, palette, frameRef);
    natives.push(native);
    seeds.push(reading.seeds);
    instants.push(Math.round((f * 1000) / LOOP_FPS));
    // Fixed order: frame 0 is captured before pressing; "Hold to sow" is pressed at that same instant.
    if (f === 0) await page.keyboard.down('Space');
  }
  await page.keyboard.up('Space');
  return {
    route: ref.route,
    rect,
    palette,
    prep,
    passes: [{ direction: 'forward', natives, source: { kind: 'clock', instantsMs: instants }, seeds }],
    sow: {
      section: 'sow',
      angle: expectedAngle,
      startSeeds: seeds[0],
      endSeeds: seeds[seeds.length - 1],
      bloomWaitMs: bloomWait,
      hold: 'Space held down on the focused "Hold to sow" button (no key repeat) right after frame 0 and released after the last frame',
    },
  };
}

// ── Poster: lossless WebP of frame 0, encoded and verified in the browser ─────────────────────────

async function encodePoster(browser: any, native: Rgba): Promise<{ bytes: Uint8Array; decoded: Uint8Array }> {
  const page = await browser.newPage();
  try {
    const result = await page.evaluate(
      async ({ width, height, pixels }: { width: number; height: number; pixels: number[] }) => {
        const canvas = new OffscreenCanvas(width, height);
        canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 1 });
        if (blob.type !== 'image/webp') throw new Error(`the browser does not encode WebP (${blob.type})`);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
        const back = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true })!;
        back.drawImage(bitmap, 0, 0);
        return { bytes: [...bytes], decoded: [...back.getImageData(0, 0, width, height).data] };
      },
      { width: native.width, height: native.height, pixels: [...native.data] },
    );
    return { bytes: Uint8Array.from(result.bytes), decoded: Uint8Array.from(result.decoded) };
  } finally {
    await page.close();
  }
}

// ── One work ──────────────────────────────────────────────────────────────────────────────────────

function routeFor(config: CaptureConfig, options: Options): string {
  if (config.loop !== 'bloomscope') return config.route;
  let route = config.route;
  if (options.garden) route = route.replace(/#g=.*$/, options.garden);
  return route;
}

async function recordLoop(browser: any, config: CaptureConfig, options: Options): Promise<LoopResult> {
  const loop = config.loop;
  const sheet = sheetOf(loop);
  const dirty = git(['status', '--porcelain', '--', ...sheet.sources]).trim();
  if (dirty) throw new CaptureError(`${loop}: there are uncommitted changes in its sources, so the commit would not describe what was recorded:\n${dirty}`);
  // Ignored files do not show up in `git status`, but they would enter the hash: a clone would give a different one.
  const tracked = new Set(git(['ls-files', '--', ...sheet.sources]).split('\n'));
  const untracked = sourceFiles(REPO, sheet.sources).filter((file) => !tracked.has(file));
  if (untracked.length) throw new CaptureError(`${loop}: there are files outside git in its sources, so a clone would give a different sources hash:\n${untracked.join('\n')}`);
  const commit = git(['rev-parse', 'HEAD']).trim();
  const sources = sourcesHash(REPO, sheet.sources);
  const route = routeFor(config, options);

  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    hasTouch: config.hasTouch,
    isMobile: config.isMobile,
    reducedMotion: 'no-preference',
    timezoneId: 'UTC',
    locale: 'en-US',
  });
  const page = await context.newPage();
  let recorded: Recorded;
  try {
    if (options.cpu > 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.cpu });
    }
    await page.clock.install({ time: CLOCK_ORIGIN });
    await page.clock.pauseAt(CLOCK_ORIGIN + 1000);
    const response = await page.goto(options.base + route, { waitUntil: 'load', timeout: 180_000 });
    if (!response?.ok()) throw new CaptureError(`${loop}: ${options.base + route} responded ${response?.status()}`);
    const renderer = await rendererName(page);
    const prep: PrepStep[] = [];
    const body = loop === 'bloomscope' ? await recordSow(page, config, options, prep, { route }) : await recordWorld(page, config, options, prep, { route });
    recorded = { ...body, renderer };
  } finally {
    await context.close();
  }

  // Passes: 4DLP with gzip, verified by decoding, within the budget.
  const { width, height } = recorded.passes[0].natives[0];
  const files = new Map<string, Uint8Array>();
  const passes: LoopPass[] = [];
  for (const pass of recorded.passes) {
    const hashes = await Promise.all(pass.natives.map((n) => frameHash(n.data)));
    const body = encode4dlp({ width, height, fps: LOOP_FPS, palette: recorded.palette, frames: pass.natives.map((n) => toIndices(n, recorded.palette)) });
    const gz = new Uint8Array(gzipSync(body, { level: 9 }));
    if (gz.length > options.budget) throw new CaptureError(`${loop}, ${pass.direction} pass: weighs ${gz.length} B with gzip and the cap is ${options.budget} B`);
    const decoded = decode4dlp(new Uint8Array(gunzipSync(gz)));
    const out = new Uint8Array(width * height * 4);
    for (let f = 0; f < decoded.frames; f++) {
      decoded.expand(f, out);
      if ((await frameHash(out)) !== hashes[f]) throw new CaptureError(`${loop}, ${pass.direction} pass, frame ${f}: the 4DLP does not decode to the recorded frame`);
    }
    const file = LOOP_FILES.pass(pass.direction);
    files.set(file, gz);
    passes.push({
      direction: pass.direction,
      fps: LOOP_FPS,
      frames: pass.natives.length,
      source: pass.source,
      ...(pass.seeds ? { seeds: pass.seeds } : {}),
      file,
      bytes: gz.length,
      verification: { framesChecked: pass.natives.length, mismatchedPixels: 0, transparentPixels: 0, outOfPalettePixels: 0 },
      hashes,
    });
  }

  const poster = await encodePoster(browser, recorded.passes[0].natives[0]);
  const posterHash = await frameHash(poster.decoded);
  if (posterHash !== passes[0].hashes[0]) throw new CaptureError(`${loop}: the decoded WebP poster is not identical to frame 0`);
  files.set(LOOP_FILES.poster, poster.bytes);

  const provenance: LoopProvenance = {
    schema: 1,
    loop,
    work: workOf(loop),
    route: recorded.route,
    config: {
      viewport: config.viewport,
      dpr: 1,
      hasTouch: config.hasTouch,
      isMobile: config.isMobile,
      reducedMotion: false,
      display: '16',
      block: config.block,
      rect: recorded.rect,
      prep: recorded.prep,
      ...(recorded.sow ? { sow: recorded.sow } : {}),
    },
    native: { width, height },
    palette: recorded.palette,
    format: { name: '4DLP', version: FORMAT_VERSION, bpp: 4, layout: FORMAT_LAYOUT, compression: 'gzip', contentType: 'application/gzip' },
    recorded: new Date().toLocaleDateString('en-CA'),
    sources: { algorithm: 'sha256', hash: sources },
    commit,
    method: {
      liveRender: true,
      controlledClock: true,
      onePixelPerBlock: true,
      verifiedExact: true,
      pageHidden: true,
      stepping: loop === 'bloomscope' ? STEPPING.sow : STEPPING.world,
      tool: TOOL,
      browser: 'chromium',
      browserVersion: browser.version(),
      renderer: recorded.renderer,
    },
    hash: { algorithm: 'sha256', over: HASH_OVER },
    poster: { file: LOOP_FILES.poster, hash: posterHash },
    passes,
  };
  const pack = sheet.pack;
  const errors = validateProvenance(provenance, pack ? { packLastFrame: { [pack]: packMeta(pack).lastFrame } } : {});
  if (errors.length) throw new CaptureError(`${loop}: the provenance does not validate:\n  ${errors.join('\n  ')}`);
  files.set(LOOP_FILES.provenance, new TextEncoder().encode(`${JSON.stringify(provenance, null, 1)}\n`));
  files.set(LOOP_FILES.posterSidecar, new TextEncoder().encode(JSON.stringify(posterSidecar(provenance, new Date().toISOString()), null, 2)));
  return { provenance, files };
}

/** Writes a loop's files all at once: if anything fails before that, the previous loop stays intact. */
function writeLoop(out: string, loop: LoopId, files: Map<string, Uint8Array>): void {
  mkdirSync(out, { recursive: true });
  const target = join(out, loop);
  const staging = join(out, `.${loop}.new-${process.pid}`);
  const previous = join(out, `.${loop}.old-${process.pid}`);
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging);
  for (const [name, bytes] of files) writeFileSync(join(staging, name), bytes);
  if (existsSync(target)) renameSync(target, previous);
  renameSync(staging, target);
  rmSync(previous, { recursive: true, force: true });
}

// ── Main ──────────────────────────────────────────────────────────────────────────────────────────

const options = parseArgs(process.argv.slice(2));
const playwright = loadPlaywright();
const browser = await playwright.chromium.launch({ args: [...BROWSER_ARGS, ...options.browserArgs] });
const summary: Record<string, unknown> = {};
let failures = 0;
for (const loop of options.targets) {
  const started = Date.now();
  try {
    const { provenance, files } = await recordLoop(browser, CAPTURE[loop], options);
    if (!options.dryRun) writeLoop(options.out, loop, files);
    summary[loop] = {
      rect: provenance.config.rect,
      native: provenance.native,
      palette: provenance.palette,
      prep: provenance.config.prep,
      poster: { hash: provenance.poster.hash, bytes: files.get(LOOP_FILES.poster)!.length },
      passes: provenance.passes.map((p) => ({ direction: p.direction, bytes: p.bytes, source: p.source, seeds: p.seeds, hashes: p.hashes })),
      renderer: provenance.method.renderer,
      commit: provenance.commit,
      sources: provenance.sources,
      sidecar: JSON.parse(new TextDecoder().decode(files.get(LOOP_FILES.posterSidecar))),
    };
    const weights = provenance.passes.map((p) => `${p.direction} ${p.bytes} B`).join(', ');
    console.log(`✓ ${loop}: ${provenance.native.width} × ${provenance.native.height}, ${provenance.palette.length} colors, ${weights}, poster ${files.get(LOOP_FILES.poster)!.length} B${options.dryRun ? ' (not written)' : ''} · ${((Date.now() - started) / 1000).toFixed(1)} s`);
  } catch (error) {
    failures++;
    summary[loop] = { error: (error as Error).message };
    console.error(`✗ ${loop}: ${(error as Error).message}`);
  }
}
await browser.close();
if (options.json) writeFileSync(options.json, `${JSON.stringify(summary, null, 1)}\n`);
process.exit(failures ? 1 : 0);
