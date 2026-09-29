/**
 * Makes the share images and the icon rasters of playground.crewtives.com (spec site-metadata;
 * add-seo-and-sharing D4 and D5). Development-only tool: it lives outside what the build publishes,
 * adds no dependencies to package.json and writes only:
 * - `capture`: the new source captures, `src/site/og/captures/<slug>.png`, and their record,
 *   `src/site/og/captures/provenance.json`;
 * - `compose`: the share images, `sites/playground/public/og/<slug>.png`, their sidecars
 *   (`<slug>.png.json`) and `sites/playground/public/og/provenance.json`;
 * - `icons`: `sites/playground/public/favicon.ico`, `sites/playground/public/apple-touch-icon.png` and
 *   `sites/4d-os/public/apple-touch-icon.png`, rendered from the two hand-drawn `icon.svg`.
 *
 * Usage, from the repo root:
 *
 *   rm -rf dist && npm run build && cp deploy/_redirects deploy/.assetsignore dist/
 *   npx wrangler dev -c deploy/wrangler.jsonc --port <port> --ip <address>   # in another terminal
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-og.ts capture <slug…|all> --base <url> [--commit <sha>]
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-og.ts compose [slug…]
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-og.ts icons
 *
 * The first time on a machine, Playwright needs its Chromium: `npx -y playwright@1.63.0 install chromium`.
 *
 * `capture` needs a server with the built site: `--base <url>` has no default, so that no address is
 * written here. The capture records the route and the commit the served build was made from
 * (`--commit`, by default the checked-out HEAD), never the server's address. `compose` and `icons` need
 * no server: Chromium only draws the band and the icons, and Node copies the frame region pixel for
 * pixel and encodes every PNG with src/site/og/png.ts.
 *
 * Options:
 *   --base <url>     capture: the server of the built site (required)
 *   --commit <sha>   capture: the commit the served build was made from (default: HEAD)
 *   --out <folder>   compose: the share-image folder (default sites/playground/public/og)
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { woff2Codepoints } from '../src/playground/museum/build/woff2.ts';
import { SITE_ORIGIN, type Slug } from '../src/site/pages.ts';
import {
  BAND,
  BAND_MARGIN,
  bandColors,
  bandRuns,
  bandText,
  CAPTURES_DIR,
  type Card,
  cardFor,
  CARDS,
  CREDIT_LINES,
  CREDIT_SIZE,
  type Face,
  FRAME,
  IMAGE,
  IMAGE_BYTES_MAX,
  pageFor,
  TITLE_LINES,
  TITLE_SIZE,
} from '../src/site/og/cards.ts';
import { decodePng, encodePng, type Rgba } from '../src/site/og/png.ts';

const PLAYWRIGHT_VERSION = '1.63.0';
const TSX_VERSION = '4.23.15';
const TOOL = `tools/capture-og.ts with playwright@${PLAYWRIGHT_VERSION} and tsx@${TSX_VERSION} via npx`;
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Software WebGL, so a capture does not depend on the machine's GPU. */
const BROWSER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'];
/** Fixed date of the controlled clock: the page never sees the real time. */
const CLOCK_ORIGIN = Date.UTC(2026, 0, 1);
const CLOCK_PAUSE_MS = 1000;
/** The controlled clock advances in steps of this size, so the renderer is never handed a backlog of frames. */
const CLOCK_STEP_MS = 160;
/** Real-time waits, with the clock stopped, for the asynchronous part of the load. */
const SETTLE_REAL_MS = 1500;
const SHOT_REAL_MS = 500;

// ── The new source captures (D5) ──────────────────────────────────────────────────────────────────

type CaptureSlug = 'museum' | 'bloomscope' | 'game-center' | 'wind-up-empire' | '4d-os';

interface CaptureConfig {
  route: string;
  viewport: { width: number; height: number };
  /** The four playground pages are captured with reduced motion: their first screen is then a still exposure of the live render. */
  reducedMotion: boolean;
  /** Wait for the 4D pack to finish loading (`[data-boot-pct]` at 100). */
  boot: boolean;
  /** Controlled clock run after the load, before the screenshot. */
  clockMs: number;
  /** Why this viewport, for the record. */
  why: string;
}

const CAPTURES: Record<CaptureSlug, CaptureConfig> = {
  museum: {
    route: '/',
    viewport: { width: 840, height: 630 },
    reducedMotion: true,
    boot: false,
    clockMs: 4000,
    why: 'the frame is the whole first screen at 840×630: the bar with the page clock above the featured sheet',
  },
  bloomscope: {
    route: '/bloomscope/',
    viewport: { width: 840, height: 630 },
    reducedMotion: true,
    boot: false,
    clockMs: 4000,
    why: 'the frame is the whole first screen at 840×630, where the kaleidoscope fills the page',
  },
  'game-center': {
    route: '/landings/game-center/',
    viewport: { width: 900, height: 640 },
    reducedMotion: true,
    boot: false,
    clockMs: 4000,
    why: 'at 900×640 the cabinet, its marquee and the floor directory fit in one 840×630 region',
  },
  'wind-up-empire': {
    route: '/landings/wind-up-empire/',
    viewport: { width: 840, height: 760 },
    reducedMotion: true,
    boot: false,
    clockMs: 4000,
    why: 'at 840×760 the title sits above the whole orrery, which one 840×630 region holds between the header and the launch panel',
  },
  '4d-os': {
    route: '/4d-os/',
    viewport: { width: 901, height: 1040 },
    reducedMotion: false,
    boot: true,
    clockMs: 2000,
    why: '901 is the narrowest width that keeps the three world windows in a row (the grid drops to one column at 900 and below); at 1040 tall one 840×630 region holds the three windows and, below them, the whole heading of worlds D and E, "Two more plates.", inside the viewport',
  },
};
const CAPTURE_SLUGS = Object.keys(CAPTURES) as CaptureSlug[];

interface CaptureRecord {
  route: string;
  served: string;
  commit: string;
  captured: string;
  viewport: { width: number; height: number };
  dpr: 1;
  reducedMotion: boolean;
  clock: { origin: string; pausedAtMs: number; advancedMs: number; stepMs: number };
  boot: string | null;
  why: string;
  browser: 'chromium';
  browserVersion: string;
  browserArgs: string[];
  renderer: string;
  tool: string;
  file: { width: number; height: number; bytes: number; sha256: string };
}

const CAPTURES_RECORD = join(REPO, CAPTURES_DIR, 'provenance.json');

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const today = () => new Date().toLocaleDateString('en-CA');

/** `npx -p playwright@X` only adds the binaries to PATH: the package is resolved from that cache. */
function loadPlaywright(): any {
  const dirs = [
    ...(process.env.PATH ?? '').split(':').filter((p) => p.includes(`${sep}_npx${sep}`) && p.endsWith(`node_modules${sep}.bin`)).map((bin) => join(bin, '..', '..')),
    ...(process.env.NODE_PATH ?? '').split(':').filter(Boolean).map((p) => join(p, '..')),
  ];
  for (const dir of dirs) {
    try {
      const require = createRequire(join(dir, 'package.json'));
      if (require('playwright/package.json').version !== PLAYWRIGHT_VERSION) continue;
      return require('playwright');
    } catch {
      // try the next candidate
    }
  }
  throw new Error(`cannot find playwright@${PLAYWRIGHT_VERSION}: run the script with npx -y -p playwright@${PLAYWRIGHT_VERSION} -p tsx@${TSX_VERSION} tsx tools/capture-og.ts …`);
}

async function rendererName(page: any): Promise<string> {
  return page.evaluate(`(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown (no WebGL2)';
  })()`);
}

async function capture(browser: any, slug: CaptureSlug, base: string, commit: string): Promise<void> {
  const config = CAPTURES[slug];
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    reducedMotion: config.reducedMotion ? 'reduce' : 'no-preference',
    timezoneId: 'UTC',
    locale: 'en-US',
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  let png: Uint8Array;
  let renderer: string;
  try {
    await page.clock.install({ time: CLOCK_ORIGIN });
    await page.clock.pauseAt(CLOCK_ORIGIN + CLOCK_PAUSE_MS);
    const response = await page.goto(base + config.route, { waitUntil: 'load', timeout: 180_000 });
    if (!response?.ok()) throw new Error(`${slug}: ${config.route} responded ${response?.status()}`);
    if (config.boot) await page.waitForFunction(`document.querySelector('[data-boot-pct]')?.textContent === '100'`, null, { timeout: 180_000 });
    await page.evaluate('document.fonts.ready.then(() => true)');
    // Images inside the viewport have arrived (lazy ones below it never start).
    await page.waitForFunction(
      `[...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).every((i) => i.complete)`,
      null,
      { timeout: 60_000 },
    );
    await page.waitForTimeout(SETTLE_REAL_MS);
    for (let t = 0; t < config.clockMs; t += CLOCK_STEP_MS) await page.clock.runFor(CLOCK_STEP_MS);
    await page.waitForTimeout(SHOT_REAL_MS);
    if (await page.evaluate('scrollX !== 0 || scrollY !== 0')) throw new Error(`${slug}: the page is not at its top`);
    renderer = await rendererName(page);
    png = await page.screenshot({ type: 'png', caret: 'hide', animations: 'allow', scale: 'device', timeout: 300_000 });
  } finally {
    await context.close();
  }
  if (errors.length) throw new Error(`${slug}: the page threw: ${errors.join(' | ')}`);

  // Lossless and at the capture's full viewport, re-encoded by the repository's own codec.
  const image = decodePng(png);
  if (image.width !== config.viewport.width || image.height !== config.viewport.height) {
    throw new Error(`${slug}: the capture measures ${image.width} × ${image.height}, not the viewport`);
  }
  const bytes = encodePng(image);
  const file = join(REPO, CAPTURES_DIR, `${slug}.png`);
  const record = readJson<{ about: string; captures: Record<string, CaptureRecord> }>(CAPTURES_RECORD, {
    about:
      'New source captures of the share images (add-seo-and-sharing D5): screenshots of the live render of each page in Chromium with software WebGL, at the full viewport, lossless and never retouched. The share images copy an 840×630 region of each one pixel for pixel.',
    captures: {},
  });
  const name = `${slug}.png`;
  const hash = sha256(bytes);
  if (existsSync(file) && sha256(readFileSync(file)) === hash && record.captures[name]) {
    console.log(`= ${slug}: identical to the capture already there (${hash.slice(0, 12)}…), kept with its record`);
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  record.captures[name] = {
    route: config.route,
    served: base === SITE_ORIGIN ? `the published site, ${SITE_ORIGIN}` : 'a local build of the commit below, served by wrangler dev',
    commit,
    captured: today(),
    viewport: config.viewport,
    dpr: 1,
    reducedMotion: config.reducedMotion,
    clock: { origin: new Date(CLOCK_ORIGIN).toISOString(), pausedAtMs: CLOCK_PAUSE_MS, advancedMs: config.clockMs, stepMs: CLOCK_STEP_MS },
    boot: config.boot ? 'waited for the 4D pack to load ([data-boot-pct] at 100) before running the clock' : null,
    why: config.why,
    browser: 'chromium',
    browserVersion: browser.version(),
    browserArgs: BROWSER_ARGS,
    renderer,
    tool: TOOL,
    file: { width: image.width, height: image.height, bytes: bytes.length, sha256: hash },
  };
  record.captures = Object.fromEntries(CAPTURE_SLUGS.map((s) => `${s}.png`).filter((n) => record.captures[n]).map((n) => [n, record.captures[n]]));
  writeJson(CAPTURES_RECORD, record);
  console.log(`✓ ${slug}: ${image.width} × ${image.height}, ${bytes.length} B, ${hash.slice(0, 12)}…`);
}

// ── Composition (D5) ──────────────────────────────────────────────────────────────────────────────

const fontUrl = (face: Face) => `data:font/woff2;base64,${readFileSync(join(REPO, face.file)).toString('base64')}`;
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const faceCss = (face: Face) =>
  `font-weight: ${face.weight}; font-variation-settings: ${face.variation ?? 'normal'}; letter-spacing: ${face.tracking ?? 0}em;`;

/**
 * The band as a page of its own: 360×630, the work's typefaces from their repository files, its
 * colors from its tokens. The inline script fits the title from 56 down to 32 px over at most three
 * lines and reports every overflow; the tool reads the report and screenshots `.band`.
 */
function bandHtml(card: Card): string {
  const text = bandText(card);
  const colors = bandColors(card, REPO);
  const line = (cls: string, value: string | null) => (value ? `<p class="${cls}">${escapeHtml(value)}</p>` : '');
  const credit = text.credit
    ? `<p class="credit">${text.credit.split(/(?<=,) /).map((part) => `<span class="keep">${escapeHtml(part)}</span>`).join(' ')}</p>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
@font-face { font-family: og-display; src: url(${fontUrl(card.display)}) format('woff2'); font-weight: 1 1000; }
@font-face { font-family: og-text; src: url(${fontUrl(card.text)}) format('woff2'); font-weight: 1 1000; }
* { margin: 0; box-sizing: border-box; }
html, body { background: ${colors.background}; }
.band {
  position: relative; display: flex; flex-direction: column;
  width: ${BAND.width}px; height: ${BAND.height}px; padding: ${BAND_MARGIN}px;
  background: ${colors.background}; color: ${colors.ink};
  font-synthesis: none; font-kerning: normal; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;
  overflow: hidden;
}
/* The band's own left edge: a hairline in its ink, so the end of the real capture always shows. */
.band::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: ${colors.ink}; }
.band > * { overflow-wrap: normal; word-break: normal; hyphens: none; }
.head p, .foot p { font-family: og-text; ${faceCss(card.text)} }
.series, .site { font-size: 20px; line-height: 26px; }
.title { font-family: og-display; ${faceCss(card.display)} margin-top: 28px; line-height: 0.96; text-wrap: balance; }
.foot { margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
.mark { font-size: 18px; line-height: 22px; padding: 3px 9px 4px; background: ${colors.tagBackground}; color: ${colors.tagInk}; box-shadow: inset 0 0 0 1.5px ${colors.tagInk}; }
.credit { font-size: ${CREDIT_SIZE}px; line-height: 26px; }
/* The credit breaks only between its parts, never inside "J-Toastie" or "CC-BY 3.0". */
.keep { white-space: nowrap; }
</style></head><body>
<div class="band">
  <div class="head">${line('series', text.series)}${line('site', text.site)}</div>
  <h1 class="title">${escapeHtml(text.title)}</h1>
  <div class="foot">${line('mark', text.synthetic)}${credit}</div>
</div>
<script>
document.fonts.ready.then(async () => {
  await Promise.all([document.fonts.load('56px og-display'), document.fonts.load('20px og-text')]);
  const band = document.querySelector('.band');
  const title = document.querySelector('.title');
  const foot = document.querySelector('.foot');
  const credit = document.querySelector('.credit');
  const problems = [];
  const lines = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  let size = ${TITLE_SIZE.max};
  for (; size >= ${TITLE_SIZE.min}; size--) {
    title.style.fontSize = size + 'px';
    if (title.scrollWidth <= title.clientWidth && lines(title) <= ${TITLE_LINES}) break;
  }
  if (size < ${TITLE_SIZE.min}) problems.push('the title does not fit in ${TITLE_LINES} lines at ${TITLE_SIZE.min} px');
  if (credit && lines(credit) > ${CREDIT_LINES}) problems.push('the credit takes more than ${CREDIT_LINES} lines');
  const box = band.getBoundingClientRect();
  for (const el of band.querySelectorAll('p, h1')) {
    const r = el.getBoundingClientRect();
    if (el.scrollWidth > el.clientWidth + 0.5 || [...el.querySelectorAll('.keep')].some((k) => k.getBoundingClientRect().right > r.right + 0.5)) {
      problems.push(el.className + ' overflows its line');
    }
    if (r.left < box.left + ${BAND_MARGIN} - 0.5 || r.right > box.right - ${BAND_MARGIN} + 0.5 || r.top < box.top + ${BAND_MARGIN} - 0.5 || r.bottom > box.bottom - ${BAND_MARGIN} + 0.5) {
      problems.push(el.className + ' comes closer than ${BAND_MARGIN} px to an edge');
    }
  }
  if (title.getBoundingClientRect().bottom + 24 > foot.getBoundingClientRect().top) problems.push('the title runs into the mark or the credit');
  for (const family of ['og-display', 'og-text']) {
    if (![...document.fonts].some((f) => f.family === family && f.status === 'loaded')) problems.push(family + ' did not load');
  }
  document.body.dataset.report = JSON.stringify({ titleSize: size, problems });
});
</script>
</body></html>`;
}

interface BandShot {
  pixels: Rgba;
  titleSize: number;
}

async function drawBand(browser: any, card: Card): Promise<BandShot> {
  for (const run of bandRuns(card)) {
    const cps = woff2Codepoints(readFileSync(join(REPO, run.face.file)));
    const missing = [...run.text].filter((ch) => !cps.has(ch.codePointAt(0)!));
    if (missing.length) throw new Error(`${card.slug}: ${run.face.file} has no glyph for ${missing.map((c) => JSON.stringify(c)).join(', ')}`);
  }
  const context = await browser.newContext({ viewport: { width: BAND.width, height: BAND.height }, deviceScaleFactor: 1, locale: 'en-US' });
  const page = await context.newPage();
  try {
    await page.setContent(bandHtml(card), { waitUntil: 'load' });
    await page.waitForFunction(`!!document.body.dataset.report`, null, { timeout: 30_000 });
    const report = JSON.parse(await page.evaluate('document.body.dataset.report')) as { titleSize: number; problems: string[] };
    if (report.problems.length) throw new Error(`${card.slug}: ${report.problems.join('; ')}`);
    const png = await page.locator('.band').screenshot({ type: 'png', caret: 'hide', animations: 'disabled', scale: 'device' });
    const pixels = decodePng(png);
    if (pixels.width !== BAND.width || pixels.height !== BAND.height) throw new Error(`${card.slug}: the band measures ${pixels.width} × ${pixels.height}`);
    return { pixels, titleSize: report.titleSize };
  } finally {
    await context.close();
  }
}

/** The frame region copied row by row, byte for byte, and the band beside it. */
function composite(source: Rgba, card: Card, band: Rgba): Rgba {
  const { x, y } = card.region;
  if (x < 0 || y < 0 || x + FRAME.width > source.width || y + FRAME.height > source.height) {
    throw new Error(`${card.slug}: the region ${x},${y} ${FRAME.width}×${FRAME.height} does not fit in ${card.source} (${source.width} × ${source.height})`);
  }
  const out = new Uint8Array(IMAGE.width * IMAGE.height * 4);
  for (let row = 0; row < IMAGE.height; row++) {
    const from = ((y + row) * source.width + x) * 4;
    out.set(source.data.subarray(from, from + FRAME.width * 4), row * IMAGE.width * 4);
    out.set(band.data.subarray(row * BAND.width * 4, (row + 1) * BAND.width * 4), (row * IMAGE.width + BAND.x) * 4);
  }
  for (let i = 3; i < out.length; i += 4) if (out[i] !== 255) throw new Error(`${card.slug}: the composed image has a translucent pixel`);
  return { width: IMAGE.width, height: IMAGE.height, data: out };
}

interface ImageRecord {
  route: string;
  source: { path: string; sha256: string; width: number; height: number; capture: unknown };
  region: { x: number; y: number; width: number; height: number };
  frame: { copied: string; depicts: string; shows: string[] };
  band: {
    text: ReturnType<typeof bandText>;
    titleSize: number;
    display: Face;
    textFace: Face;
    colors: ReturnType<typeof bandColors>;
    tokens: { background: string; ink: string; tagBackground: string; tagInk: string };
  };
  synthetic: boolean;
  credit: string | null;
  tool: string;
  browser: 'chromium';
  browserVersion: string;
  platform: string;
  image: { width: number; height: number; bytes: number; sha256: string };
}

/** How the source capture was made: the stills' record, or the new captures' record. */
function captureRecordOf(card: Card): unknown {
  const record = JSON.parse(readFileSync(join(REPO, card.record), 'utf8'));
  if (record.stills) {
    const [name, still] = Object.entries<any>(record.stills).find(([, s]) => s.source === card.source) ?? [];
    if (!still) throw new Error(`${card.slug}: ${card.record} has no still made from ${card.source}`);
    return { record: card.record, entry: name, capture: still.capture, captured: still.captured };
  }
  const name = card.source.split('/').pop()!;
  const entry = record.captures?.[name];
  if (!entry) throw new Error(`${card.slug}: ${card.record} has no entry for ${name}; run capture first`);
  if (entry.file.sha256 !== sha256(readFileSync(join(REPO, card.source)))) throw new Error(`${card.slug}: ${card.source} is not the file its record describes`);
  return { record: card.record, entry: name, ...entry };
}

function sidecar(card: Card, record: ImageRecord, createdAt: string): { prompt: string; createdAt: string } {
  const text = record.band.text;
  const band = [text.series, text.site, text.title, text.synthetic, text.credit].filter(Boolean).join(' / ');
  return {
    prompt:
      `Origin: not generated. Share image of ${record.route} (${IMAGE.width}×${IMAGE.height}). Frame: the ${FRAME.width}×${FRAME.height} region at x ${card.region.x}, y ${card.region.y} of ${card.source}, ` +
      `a real capture of the live render (record: ${card.record}), copied pixel for pixel with no scaling, re-dithering, filter or retouching. ` +
      `Band, beside the frame: ${band}, set in the page's own typefaces. Image SHA-256 ${record.image.sha256}. Full record: provenance.json in this folder.`,
    createdAt,
  };
}

async function compose(browser: any, slugs: Slug[], out: string): Promise<void> {
  const provenancePath = join(out, 'provenance.json');
  const provenance = readJson<{ about: string; images: Record<string, ImageRecord> }>(provenancePath, {
    about:
      'Share images of playground.crewtives.com (add-seo-and-sharing D5). Each is 1200×630: at the left, an 840×630 region of a real capture of the page\'s live render, copied pixel for pixel; at the right, a band set in the page\'s own typefaces and colors. None is generated.',
    images: {},
  });
  mkdirSync(out, { recursive: true });
  for (const slug of slugs) {
    const card = cardFor(slug);
    const page = pageFor(slug);
    const sourceBytes = readFileSync(join(REPO, card.source));
    const source = decodePng(sourceBytes);
    const band = await drawBand(browser, card);
    const bytes = encodePng(composite(source, card, band.pixels));
    if (bytes.length > IMAGE_BYTES_MAX) throw new Error(`${slug}: ${bytes.length} B is over the ${IMAGE_BYTES_MAX} B budget; pick another region, never a lossy format or a scaled copy`);
    const name = `${slug}.png`;
    const hash = sha256(bytes);
    const file = join(out, name);
    const sidecarFile = join(out, `${name}.json`);
    if (existsSync(file) && sha256(readFileSync(file)) === hash && existsSync(sidecarFile) && provenance.images[name]) {
      console.log(`= ${slug}: identical bytes (${hash.slice(0, 12)}…), sidecar and record kept`);
      continue;
    }
    const text = bandText(card);
    const record: ImageRecord = {
      route: page.route,
      source: { path: card.source, sha256: sha256(sourceBytes), width: source.width, height: source.height, capture: captureRecordOf(card) },
      region: { ...card.region, ...FRAME },
      frame: { copied: 'pixel for pixel: no scaling, re-dithering, overlaid pattern, filter or retouching', depicts: card.depicts, shows: [...card.shows] },
      band: {
        text,
        titleSize: band.titleSize,
        display: card.display,
        textFace: card.text,
        colors: bandColors(card, REPO),
        tokens: {
          background: `${card.background.file} ${card.background.name}`,
          ink: `${card.ink.file} ${card.ink.name}`,
          tagBackground: `${card.tag.background.file} ${card.tag.background.name}`,
          tagInk: `${card.tag.ink.file} ${card.tag.ink.name}`,
        },
      },
      synthetic: text.synthetic !== null,
      credit: text.credit,
      tool: TOOL,
      browser: 'chromium',
      browserVersion: browser.version(),
      platform: `${process.platform}-${process.arch}`,
      image: { width: IMAGE.width, height: IMAGE.height, bytes: bytes.length, sha256: hash },
    };
    writeFileSync(file, bytes);
    writeJson(sidecarFile, sidecar(card, record, new Date().toISOString()));
    provenance.images[name] = record;
    console.log(`✓ ${slug}: ${bytes.length} B, title at ${band.titleSize} px, ${hash.slice(0, 12)}…`);
  }
  provenance.images = Object.fromEntries(CARDS.map((c) => `${c.slug}.png`).filter((n) => provenance.images[n]).map((n) => [n, provenance.images[n]]));
  writeJson(provenancePath, provenance);
}

// ── Icons (D4) ────────────────────────────────────────────────────────────────────────────────────

/** An SVG drawn at `size` × `size` on `ground` (transparent when null), as RGBA. */
async function renderSvg(browser: any, svg: string, size: number, inset: number, ground: string | null): Promise<Rgba> {
  const context = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    const inner = size - 2 * inset;
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${ground ?? 'transparent'}"><img src="${src}" width="${inner}" height="${inner}" style="display:block;position:absolute;left:${inset}px;top:${inset}px"></body></html>`,
      { waitUntil: 'load' },
    );
    const png = await page.screenshot({ type: 'png', omitBackground: ground === null, scale: 'device' });
    return decodePng(png);
  } finally {
    await context.close();
  }
}

/** An ICO whose images are PNGs (one entry per size), the form every current browser reads. */
function ico(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const header = 6 + 16 * images.length;
  const out = new Uint8Array(header + images.reduce((n, i) => n + i.png.length, 0));
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = header;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    out[entry] = size >= 256 ? 0 : size;
    out[entry + 1] = size >= 256 ? 0 : size;
    view.setUint16(entry + 4, 1, true);
    // Bits per pixel of the PNG inside: color type 6 is RGBA (32), type 2 is RGB (24).
    view.setUint16(entry + 6, png[25] === 6 ? 32 : 24, true);
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}

async function icons(browser: any): Promise<void> {
  const playground = readFileSync(join(REPO, 'sites/playground/public/icon.svg'), 'utf8');
  const fourDos = readFileSync(join(REPO, 'sites/4d-os/public/icon.svg'), 'utf8');
  const favicon = [];
  for (const size of [16, 32, 48]) favicon.push({ size, png: encodePng(await renderSvg(browser, playground, size, 0, null)) });
  const outputs: [string, Uint8Array][] = [
    ['sites/playground/public/favicon.ico', ico(favicon)],
    // 180×180 on an opaque ground in the mark's own paper, with room for the platforms' rounded corners.
    ['sites/playground/public/apple-touch-icon.png', encodePng(await renderSvg(browser, playground, 180, 22, '#f5f4ef'))],
    ['sites/4d-os/public/apple-touch-icon.png', encodePng(await renderSvg(browser, fourDos, 180, 22, '#f3f4f2'))],
  ];
  for (const [path, bytes] of outputs) {
    const file = join(REPO, path);
    if (existsSync(file) && sha256(readFileSync(file)) === sha256(bytes)) {
      console.log(`= ${path}: identical bytes, kept`);
      continue;
    }
    writeFileSync(file, bytes);
    console.log(`✓ ${path}: ${bytes.length} B`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────────────────────────

type Mode = 'capture' | 'compose' | 'icons';

function parseArgs(argv: string[]): { mode: Mode; slugs: string[]; base: string | null; commit: string | null; out: string } {
  const [mode, ...rest] = argv;
  if (mode !== 'capture' && mode !== 'compose' && mode !== 'icons') throw new Error('usage: capture-og.ts <capture|compose|icons> …');
  const options = { mode: mode as Mode, slugs: [] as string[], base: null as string | null, commit: null as string | null, out: join(REPO, 'sites/playground/public/og') };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const value = () => {
      if (rest[i + 1] === undefined) throw new Error(`missing the value of ${arg}`);
      return rest[++i];
    };
    if (arg === '--base') options.base = value().replace(/\/$/, '');
    else if (arg === '--commit') options.commit = value();
    else if (arg === '--out') options.out = resolve(value());
    else if (arg.startsWith('--')) throw new Error(`unknown option: ${arg}`);
    else options.slugs.push(arg);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const playwright = loadPlaywright();
const browser = await playwright.chromium.launch({ args: BROWSER_ARGS });
try {
  if (options.mode === 'capture') {
    if (!options.base) throw new Error('capture needs --base <url>: the server of the built site');
    const slugs = options.slugs.includes('all') ? CAPTURE_SLUGS : options.slugs;
    if (!slugs.length) throw new Error(`capture needs a slug: ${CAPTURE_SLUGS.join(', ')} or all`);
    for (const slug of slugs) if (!(slug in CAPTURES)) throw new Error(`${slug} has no new capture (${CAPTURE_SLUGS.join(', ')}); the worlds use their stills`);
    const commit = options.commit ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim();
    for (const slug of slugs as CaptureSlug[]) await capture(browser, slug, options.base, commit);
  } else if (options.mode === 'compose') {
    const all = CARDS.map((c) => c.slug);
    const slugs = options.slugs.length ? options.slugs : all;
    for (const slug of slugs) if (!all.includes(slug as Slug)) throw new Error(`unknown slug: ${slug} (${all.join(', ')})`);
    await compose(browser, slugs as Slug[], options.out);
  } else {
    await icons(browser);
  }
} finally {
  await browser.close();
}
