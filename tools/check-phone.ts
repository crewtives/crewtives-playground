/**
 * Phone check of the playground (spec phone-ergonomics; design adapt-for-phones D16 and D18).
 * Development-only tool: it lives outside what the build publishes, adds no dependency to
 * package.json and writes only into the folder given with `--out`. It drives Chromium (and WebKit,
 * once) through Playwright at a pinned version, through npx, like tools/capture-loops.ts.
 *
 * Usage, from the repository root, against development servers of the working tree:
 *
 *   npx vite -c sites/playground/vite.config.ts --port <p> --strictPort    # <dev>
 *   npx vite -c sites/4d-os/vite.config.ts --port <q> --strictPort         # <dev-4d>: 4D.OS at /
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/check-phone.ts <mode> …
 *
 * or against a production build served by `wrangler dev` (the recipe is in the header comment of
 * tools/capture-loops.ts), where 4D.OS lives under /4d-os/ and `--os` is left out. The first time on a
 * machine, Playwright needs its browsers: `npx -y playwright@1.63.0 install chromium webkit`.
 *
 * Modes:
 *
 *   phone <page…|all> --base <url> [--os <url>] [--browser chromium|webkit] [--out <dir>]
 *         [--viewport <W>x<H>[,…]] [--check <text>]
 *     For each page, one browser at a time, in phone contexts (`isMobile`, `hasTouch`, device pixel
 *     ratio 2) at 390×844, 390×664, 360×780, 430×932, 844×390 and 932×430, plus the page's own extra
 *     viewports (667×375 for the museum and Game Center, 320×568 for the museum and Wind-Up Empire, and
 *     any its module adds): the generic checks below, then the page's own checks. With
 *     `--browser webkit` it runs once, at 390×664 with the iPhone 13 descriptor, the generic checks
 *     that need no native touch and the checks each module marks for WebKit. `--viewport` and
 *     `--check` narrow the run while working on a page. It prints one line per check and exits with 1
 *     when any fails; `--out` also writes report.json and the screenshots the checks take.
 *
 *   desk --base <url> [--os <url>] --out <dir> [--pages <page,…>] [--gpu]
 *     Deep desktop screenshots (design D16): every page at 1440×900 and 1680×1050 (the museum also at
 *     1100×800 and 760×1000, Game Center also at 1024×768 and 844×390), with a mouse and no touch,
 *     reduced motion, a controlled clock and the 4D.OS worlds held with K after 4 s of that clock;
 *     shots at the top, 25, 50 and 75 % of the scroll range, the end and every section, each repeated
 *     until two consecutive shots are byte-identical. Next to them, per page and viewport, a dump of
 *     every body element's box and computed style (hashed), the boxes of design D15's copy lines, and
 *     the phone media queries evaluated at 1440×900 and 1680×1050, which must all be false. WebGL runs
 *     on SwiftShader, the renderer of the accepted baselines; `--gpu` uses the GPU instead.
 *
 *   desk-compare <before> <after> [--json <file>]
 *     Compares two desk folders shot by shot: byte-identical passes; otherwise every differing pixel
 *     must lie inside a D15 copy line's box (recorded by `desk`), or the shot must be one of the
 *     noise-prone shots named in NOISE_SHOTS with at most NOISE_PIXELS pixels off by at most
 *     NOISE_DELTA. The scroll positions, the document heights and the copy lines' positions and
 *     heights must be equal, and so must the element dumps, as multisets, apart from the addition
 *     (DUMP_ADDITIONS: world D's `timeline__frame-word` span) and the in-place changes (DUMP_CHANGES:
 *     A's window stacking, the launcher's bar note, the museum scrubber's `user-select`) design D15
 *     lists. A folder without dumps or boxes
 *     (an earlier capture tool's, with the same shot names) skips those parts.
 *
 *   queries --base <url> [--os <url>]
 *     Evaluates every phone media query (PHONE_QUERIES, plus the ones the page modules declare) in
 *     desktop contexts at 1440×900 and 1680×1050 with a mouse, and prints `false` or `true` per query;
 *     it exits with 1 when any is true.
 *
 * Generic checks (design D18), on every page in every phone viewport:
 * - horizontal scroll at five scroll stops, and no element past the right edge outside the allowed
 *   scrollers and clip regions (Game Center's `.aisle`, world C's `.strip__film`, Wind-Up Empire's
 *   `.tray-grid`, and any the module adds);
 * - targets: each visible box-shaped control, probed 21 px from its center in the four directions,
 *   lands on the control or its label (`min(21, half its size − 1)` px for the letters of design D1),
 *   at the first scroll stop where the control is whole in the viewport and no probe point falls
 *   outside it or on a fixed or sticky panel the control is not in (a pinned stage, a bar);
 *   links inside sentences and focus-only skip links are exempt, and annular or nested controls the
 *   module lists are left to it;
 * - no two box-shaped hit rectangles intersecting (the element's box grown by its `::before` and
 *   `::after` when they are positioned hit areas);
 * - text sizes: sentences at least 12 px, other text at least 11 px, apart from the module's exemptions;
 * - contrast of every selector the module declares (4.5:1 for text, 3:1 for glyphs, grips and focus
 *   indicators), measured on the rendered pixels behind it;
 * - keyboard focus (Tab through the page) never under another element nor under a panel the module
 *   declares, inside the viewport (or filling half of it, for an element taller than the viewport), and
 *   outlined by the element or its ::before or ::after; visually hidden proxies and the module's
 *   annular controls are not tested for cover, and a cover is looked at again after 350 ms;
 * - no running animation on those panels under reduced motion;
 * - a 250 px swipe over each visual scrolls the page;
 * - no page or console error.
 *
 * Page modules. The checks of each work live in their own module, `tools/check-phone/<name>.ts`
 * (museum, bloomscope, game-center, wind-up-empire, worlds-abc for A to C, worlds-de for D, E and the
 * launcher), written by that work's owner. Its default export is a `PageCheck` (below). A page whose
 * module does not exist yet runs the generic checks only. Functions passed to `page.evaluate` may name
 * inner functions: the harness gives every page the `__name` helper that tsx adds around them.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng } from '../src/site/og/png.ts';

const PLAYWRIGHT_VERSION = '1.63.0';
const TSX_VERSION = '4.23.15';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** The GPU renderer the loops were recorded with (tools/capture-loops.ts). */
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
/** SwiftShader, deterministic: the renderer of the desktop baselines and of the release fingerprint. */
const SWIFTSHADER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'];
/** Fixed date of the desk mode's controlled clock. */
const CLOCK_ORIGIN = Date.UTC(2026, 0, 1);
/** tsx wraps named functions with `__name`; the pages get a helper of that name, so evaluated code can use them. */
const NAME_SHIM = 'globalThis.__name = globalThis.__name || ((f) => f);';

// ── Pages ──────────────────────────────────────────────────────────────────────────────────────

export const PAGE_KEYS = ['museum', 'bloomscope', 'game-center', 'wind-up-empire', 'launcher', 'a', 'b', 'c', 'd', 'e'] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export interface Viewport {
  width: number;
  height: number;
}

const vp = (width: number, height: number): Viewport => ({ width, height });
const vpName = (v: Viewport) => `${v.width}x${v.height}`;

interface PageInfo {
  /** Public route. A 4D.OS page is served under `--os` at the route without `/4d-os`. */
  route: string;
  /** Its module under tools/check-phone/. */
  module: string;
  /** A 4D.OS page: it boots a pack before it is ready. */
  os: boolean;
  /** A 4D.OS world: the desk mode holds its time with K. */
  hold: boolean;
  /** Sections the desk mode shoots, each at the top of the viewport. */
  sections: string[];
  /** Extra desktop viewports of the desk mode. */
  desk: Viewport[];
  /** Extra phone viewports. */
  phone: Viewport[];
  /** Scrollers and clip regions allowed past the right edge. */
  clip: string[];
  /** Visuals the generic swipe starts on. */
  visuals: string[];
  /** Design D15's copy lines, whose box the desk comparison allows to differ. */
  copyLines: string[];
}

const PAGES: Record<PageKey, PageInfo> = {
  museum: {
    route: '/',
    module: 'museum',
    os: false,
    hold: false,
    sections: ['#sheet-004', '#index', '#sheet-001', '#sheet-002', '#sheet-003', '#sheet-000', '#colophon'],
    desk: [vp(1100, 800), vp(760, 1000)],
    phone: [vp(667, 375), vp(320, 568)],
    clip: [],
    visuals: ['.vista', '.sheet__epure'],
    copyLines: [],
  },
  bloomscope: {
    route: '/bloomscope/',
    module: 'bloomscope',
    os: false,
    hold: false,
    sections: ['#scope', '#worlds', '#sow', '.sow-put', '#lathe', '.lathe-put', '#hive', '.hive-put', 'footer.footer'],
    desk: [],
    phone: [],
    clip: [],
    visuals: ['.scope', '.sow-view', '.lathe-view', '.hive-view'],
    copyLines: [],
  },
  'game-center': {
    route: '/landings/game-center/',
    module: 'game-center',
    os: false,
    hold: false,
    sections: ['[id="1f"]', '#rr-howto', '[id="2f"]', '[id="3f"]', '#crane-howto', '[id="4f"]', '#parlour-howto', '[id="5f"]', '#rf', 'footer.credits'],
    desk: [vp(1024, 768), vp(844, 390)],
    phone: [vp(667, 375)],
    clip: ['.aisle'],
    visuals: ['.crt', '.crane__glass', '.parlour'],
    copyLines: [],
  },
  'wind-up-empire': {
    route: '/landings/wind-up-empire/',
    module: 'wind-up-empire',
    os: false,
    hold: false,
    sections: ['#lid', '#worlds', '#deck', '.tin-plate.construction', '.tin-plate.press', '.tin-plate.hangar', '#leaflet', '#proof', 'footer.colophon'],
    desk: [],
    phone: [vp(320, 568)],
    clip: ['.tray-grid'],
    visuals: ['.lid-scene'],
    copyLines: [],
  },
  launcher: {
    route: '/4d-os/',
    module: 'worlds-de',
    os: true,
    hold: false,
    sections: ['header.bar', 'main.stage', 'section.more'],
    desk: [],
    phone: [],
    clip: [],
    visuals: ['[data-view]'],
    copyLines: ['.bar__note'],
  },
  a: {
    route: '/4d-os/a/',
    module: 'worlds-abc',
    os: true,
    hold: true,
    sections: ['section.desk', 'section.room', 'footer.foot'],
    desk: [],
    phone: [],
    clip: [],
    visuals: ['[data-view]'],
    copyLines: ['.foot__text > p:nth-of-type(2)'],
  },
  b: {
    route: '/4d-os/b/',
    module: 'worlds-abc',
    os: true,
    hold: true,
    sections: ['section.desk', 'section.lede', 'section.plate', 'footer.colophon'],
    desk: [],
    phone: [],
    clip: [],
    visuals: ['[data-view]'],
    copyLines: ['.colophon__line'],
  },
  c: {
    route: '/4d-os/c/',
    module: 'worlds-abc',
    os: true,
    hold: true,
    sections: ['section.desk', 'section.strip', 'section.lede', 'section.reel', 'footer.tail'],
    desk: [],
    phone: [],
    clip: ['.strip__film'],
    visuals: ['[data-view]'],
    copyLines: ['.tail__edge'],
  },
  d: {
    route: '/4d-os/d/',
    module: 'worlds-de',
    os: true,
    hold: true,
    sections: ['section.stoop', 'section.page', 'footer.colophon'],
    desk: [],
    phone: [],
    clip: [],
    visuals: ['[data-view]'],
    copyLines: ['.colophon__line'],
  },
  e: {
    route: '/4d-os/e/',
    module: 'worlds-de',
    os: true,
    hold: true,
    sections: ['section.obs', 'section.lede', 'section.band', 'footer.colophon'],
    desk: [],
    phone: [],
    clip: [],
    visuals: ['[data-view]'],
    copyLines: ['.colophon__line'],
  },
};

/** Phone viewports of every page (design D18): four portrait, two landscape. */
const PHONE_VIEWPORTS: readonly Viewport[] = [vp(390, 844), vp(390, 664), vp(360, 780), vp(430, 932), vp(844, 390), vp(932, 430)];
/** The WebKit pass: the visible area of Safari on an iPhone 13 with its toolbars. */
const WEBKIT_VIEWPORT = vp(390, 664);
/** Desktop viewports of every page in the desk mode. */
const DESK_VIEWPORTS: readonly Viewport[] = [vp(1440, 900), vp(1680, 1050)];

/**
 * Every media query a phone rule sits under (design D2 and the works' decisions D4 to D11). At
 * 1440×900 and 1680×1050 with a mouse, each is false; the `queries` mode and the desk mode assert it.
 * A module adds the strings of its own work with `PageCheck.queries`.
 */
export const PHONE_QUERIES: readonly string[] = [
  // Each work's phone breakpoints (design, Context).
  '(max-width: 759px)',
  '(max-width: 759px) and (orientation: portrait)',
  '(max-width: 699px) and (min-height: 521px)',
  '(max-width: 1023px) and (max-height: 520px) and (orientation: landscape)',
  '(max-width: 767px)',
  '(max-width: 359px)',
  '(max-width: 900px)',
  '(max-width: 900px) and (orientation: portrait)',
  '(max-width: 560px)',
  '(max-width: 560px) and (max-height: 760px)',
  '(max-width: 400px)',
  '(max-width: 760px)',
  '(max-width: 760px), (orientation: landscape) and (max-height: 500px)',
  '(max-width: 820px), (orientation: landscape) and (max-height: 500px)',
  '(max-width: 370px)',
  // Landscape phones (D2).
  '(orientation: landscape) and (max-height: 500px)',
  '(orientation: landscape) and (max-height: 500px) and (pointer: coarse)',
  // Coarse pointers: targets, grips, the hold trio, touch-only hints (D2, D8).
  '(pointer: coarse)',
  '(hover: none) and (pointer: coarse)',
  '(pointer: coarse) and (max-width: 900px)',
  '(pointer: coarse) and (max-width: 800px), (pointer: coarse) and (max-height: 500px)',
];

// ── The interface of the page modules ──────────────────────────────────────────────────────────

/** A Playwright page, browser context or CDP session: Playwright is loaded at run time through npx, so it is untyped here. */
export type Page = any;

export interface Point {
  x: number;
  y: number;
}

export interface Insets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * Touch input on one page. In Chromium it goes through CDP `Input.dispatchTouchEvent`, so the browser
 * scrolls, flings and applies `touch-action` as it does for a finger (`native` is true). WebKit has no
 * such input: a tap is a real one, and the other gestures are dispatched as untrusted touch and
 * pointer events, which reach the page's listeners but never scroll it (`native` is false).
 */
export interface Touch {
  readonly native: boolean;
  tap(x: number, y: number): Promise<void>;
  /** Presses at (x, y) for `ms`, drifting by `drift` over the first half of the hold, then lifts. */
  hold(x: number, y: number, ms: number, drift?: Point): Promise<void>;
  /** Presses at the first point, moves through the others one step every `stepMs`, then lifts. */
  path(points: Point[], stepMs?: number): Promise<void>;
  /** A finger from (x, y) moved by (dx, dy) in `ms`; resolves with the page's scrollY change 300 ms after the lift. */
  swipe(x: number, y: number, dx: number, dy: number, ms?: number): Promise<number>;
  /** Like `swipe`, slower, with a 100 ms press before moving, for controls built to be dragged. */
  drag(x: number, y: number, dx: number, dy: number, ms?: number): Promise<void>;
  /** A swipe that also samples scrollY every animation frame for `watchMs` (300) after the lift, to see momentum. */
  swipeWatch(x: number, y: number, dx: number, dy: number, ms?: number, watchMs?: number): Promise<{ before: number; atLift: number; after: { t: number; y: number }[] }>;
  /** Two fingers around (x, y), `from` px apart horizontally, moved to `to` px apart in `ms`. */
  pinch(x: number, y: number, from: number, to: number, ms?: number): Promise<void>;
}

export type ContrastKind = 'text' | 'glyph' | 'focus';

export interface ContrastTarget {
  selector: string;
  /** `text` needs 4.5:1; `glyph` (glyphs, grips, drawn marks) and `focus` (its focus indicator) need 3:1. */
  kind: ContrastKind;
  /** Brings the page to the state where the element shows (it runs in the same viewport, after the generic checks). */
  prepare?: (t: CheckContext) => Promise<void>;
  /** Part of the WebKit subset. */
  webkit?: boolean;
}

export interface ContrastResult {
  /** The ratio, the 90th percentile over the element's ink pixels against the pixels behind each; null when nothing was measured. */
  ratio: number | null;
  /** Ink pixels measured (device pixels). */
  pixels: number;
  /** Why nothing was measured. */
  problem?: string;
}

/** What a module tells the generic checks about one page. */
export interface PageSetup {
  /** Viewports added to the page's phone matrix. */
  viewports?: readonly Viewport[];
  /** Visuals the generic swipe starts on, in place of the core's list. */
  visuals?: readonly string[];
  /** Pinned stages, stage decks, window docks and bottom bars: focus is never under one, and none animates under reduced motion. */
  panels?: readonly string[];
  /** Every element created or restyled under a phone gate (design D1, "Contrast"). */
  contrast?: readonly ContrastTarget[];
  /** Controls left out of the generic target probe and overlap check: annular or nested controls the module checks itself. */
  skipTargets?: readonly string[];
  /** Letters of one word laid edge to edge as separate controls, probed at min(21, half their size − 1) px (design D1). */
  letters?: readonly string[];
  /** Text exempt from the size check: retro readouts in a screen typeface, scale annotations, units inside large numerals. */
  smallText?: readonly string[];
  /** Scrollers and clip regions allowed past the right edge, beyond the core's. */
  clip?: readonly string[];
  /** Waited for after every load, after the core's readiness (fonts; a 4D.OS page's boot). */
  ready?: (page: Page) => Promise<void>;
}

/** One check of a page module. */
export interface Check {
  name: string;
  /** Pages it runs on (default: every page of the module). */
  pages?: readonly PageKey[];
  /** Viewports it runs in, as `WxH` names (default: every viewport of the page's matrix). */
  viewports?: readonly string[];
  /** Part of the WebKit subset (design D18). */
  webkit?: boolean;
  run(t: CheckContext): Promise<void>;
}

/** The default export of each module under tools/check-phone/. */
export interface PageCheck {
  pages: readonly PageKey[];
  setup?: Partial<Record<PageKey, PageSetup>>;
  checks: readonly Check[];
  /** Media queries of this work's phone rules that PHONE_QUERIES lacks. */
  queries?: readonly string[];
}

export interface OpenOptions {
  viewport?: Viewport;
  /** Default true (a phone). A desktop context: `{ isMobile: false, hasTouch: false, deviceScaleFactor: 1 }`. */
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
  reducedMotion?: 'reduce' | 'no-preference';
  /** Another route of the same site, in place of this page's (for example `/#sheet-002`). */
  path?: string;
}

/** What a check gets: the page, loaded, ready and scrolled to the top, and helpers bound to it. */
export interface CheckContext {
  readonly key: PageKey;
  readonly viewport: Viewport;
  readonly browser: 'chromium' | 'webkit';
  readonly page: Page;
  readonly touch: Touch;
  /** Absolute URL of this page, or of `path` on the same site. */
  url(path?: string): string;
  /** Reloads the page and waits until it is ready. */
  reload(): Promise<void>;
  /** A new page in its own context, loaded and ready; closed when the check ends. */
  open(options?: OpenOptions): Promise<{ page: Page; touch: Touch }>;
  /** Resizes the page's viewport (rotation, resize); the next check gets the matrix viewport back. */
  resize(viewport: Viewport): Promise<void>;
  /** Fake safe-area insets: sets `--safe-t`, `--safe-r`, `--safe-b` and `--safe-l` inline on `<html>`. */
  setSafeArea(insets: Insets, page?: Page): Promise<void>;
  /** Contrast of the first visible element matching `selector` against the pixels behind it (it scrolls the element into view). */
  contrast(selector: string, kind: ContrastKind, page?: Page): Promise<ContrastResult>;
  /** Fraction of the first matching element's box inside the viewport, from 0 to 1 (0 when nothing matches). */
  visibleFraction(selector: string, page?: Page): Promise<number>;
  /** Records a failure when `ok` is false; the check goes on. Returns `ok`. */
  expect(ok: boolean, message: string): boolean;
  /** Records a measured figure in the report. */
  note(name: string, value: unknown): void;
  /** Marks the check as skipped, with the reason (for example no native touch in WebKit). */
  skip(reason: string): void;
  /** Saves a screenshot into the report folder and returns its path (null without `--out`). */
  screenshot(name: string, page?: Page): Promise<string | null>;
}

// ── Small helpers ──────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

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
  throw new Error(`cannot find playwright@${PLAYWRIGHT_VERSION}: run the script with npx -y -p playwright@${PLAYWRIGHT_VERSION} -p tsx@${TSX_VERSION} tsx tools/check-phone.ts …`);
}

interface Origins {
  base: string;
  os: string | null;
}

/** Absolute URL of a route: 4D.OS routes go to `--os` without their `/4d-os` prefix when it is given. */
function urlOf(origins: Origins, key: PageKey, path?: string): string {
  const info = PAGES[key];
  const route = path ?? info.route;
  if (info.os && origins.os) return origins.os + (route.replace(/^\/4d-os(?=\/|$)/, '') || '/');
  return origins.base + route;
}

/** The page is loaded: fonts, and a 4D.OS page's boot at 100 %. */
async function waitReady(page: Page, key: PageKey, setup: PageSetup | undefined): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => true));
  if (PAGES[key].os) {
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-boot-pct]');
      return !el || el.textContent === '100';
    }, null, { timeout: 180_000 });
  }
  await sleep(1000);
  if (setup?.ready) await setup.ready(page);
}

/** Loads the page module of a page, or null when it does not exist yet. */
async function loadModule(key: PageKey): Promise<PageCheck | null> {
  const file = join(REPO, 'tools', 'check-phone', `${PAGES[key].module}.ts`);
  if (!existsSync(file)) return null;
  const mod = await import(pathToFileURL(file).href);
  const check = mod.default as PageCheck | undefined;
  if (!check || !Array.isArray(check.checks) || !Array.isArray(check.pages)) throw new Error(`${file}: the default export is not a PageCheck`);
  return check;
}

// ── Touch ──────────────────────────────────────────────────────────────────────────────────────

const line = (x: number, y: number, dx: number, dy: number, steps: number): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => ({ x: x + (dx * i) / steps, y: y + (dy * i) / steps }));

/** Touch input through CDP (Chromium): the browser's own input pipeline. */
function cdpTouch(page: Page, cdp: Page): Touch {
  const send = (type: string, points: Point[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i + 1, radiusX: 1, radiusY: 1, force: 1 })) });
  const readScroll = (): Promise<number> => page.evaluate(() => window.scrollY);
  const path = async (points: Point[], stepMs = 16) => {
    await send('touchStart', [points[0]]);
    for (const point of points.slice(1)) {
      await sleep(stepMs);
      await send('touchMove', [point]);
    }
    await send('touchEnd', []);
  };
  const touch: Touch = {
    native: true,
    async tap(x, y) {
      await send('touchStart', [{ x, y }]);
      await sleep(40);
      await send('touchEnd', []);
    },
    async hold(x, y, ms, drift = { x: 0, y: 0 }) {
      await send('touchStart', [{ x, y }]);
      const steps = Math.max(1, Math.round(ms / 2 / 50));
      for (let i = 1; i <= steps; i++) {
        await sleep(50);
        await send('touchMove', [{ x: x + (drift.x * i) / steps, y: y + (drift.y * i) / steps }]);
      }
      await sleep(Math.max(0, ms - steps * 50));
      await send('touchEnd', []);
    },
    path,
    async swipe(x, y, dx, dy, ms = 250) {
      const before = await readScroll();
      await path(line(x, y, dx, dy, Math.max(2, Math.round(ms / 16))));
      await sleep(300);
      return (await readScroll()) - before;
    },
    async drag(x, y, dx, dy, ms = 500) {
      await send('touchStart', [{ x, y }]);
      await sleep(100);
      const points = line(x, y, dx, dy, Math.max(2, Math.round(ms / 16))).slice(1);
      for (const point of points) {
        await send('touchMove', [point]);
        await sleep(16);
      }
      await send('touchEnd', []);
    },
    async swipeWatch(x, y, dx, dy, ms = 250, watchMs = 300) {
      const before = await readScroll();
      await path(line(x, y, dx, dy, Math.max(2, Math.round(ms / 16))));
      const samples: { t: number; y: number }[] = await page.evaluate(
        (duration: number) =>
          new Promise<{ t: number; y: number }[]>((done) => {
            const start = performance.now();
            const out = [{ t: 0, y: scrollY }];
            const tick = () => {
              const t = performance.now() - start;
              out.push({ t: Math.round(t), y: scrollY });
              if (t < duration) requestAnimationFrame(tick);
              else done(out);
            };
            requestAnimationFrame(tick);
          }),
        watchMs,
      );
      return { before, atLift: samples[0].y, after: samples };
    },
    async pinch(x, y, from, to, ms = 300) {
      const steps = Math.max(2, Math.round(ms / 16));
      const pair = (d: number): Point[] => [{ x: x - d / 2, y }, { x: x + d / 2, y }];
      await send('touchStart', pair(from));
      for (let i = 1; i <= steps; i++) {
        await sleep(16);
        await send('touchMove', pair(from + ((to - from) * i) / steps));
      }
      await send('touchEnd', []);
    },
  };
  return touch;
}

/** WebKit: a real tap; every other gesture as untrusted touch and pointer events (no native scrolling). */
function syntheticTouch(page: Page): Touch {
  const dispatch = (phase: 'start' | 'move' | 'end', points: Point[]) =>
    page.evaluate(
      ({ phase, points }: { phase: string; points: Point[] }) => {
        const w = window as unknown as { __cpTarget?: Element };
        if (phase === 'start') w.__cpTarget = document.elementFromPoint(points[0].x, points[0].y) ?? document.body;
        const target = w.__cpTarget ?? document.body;
        // Where WebKit cannot construct Touch ("Illegal constructor"), this throws: the modules skip
        // those gestures with the reason, since pointer events alone would not stand for a finger.
        const touches = points.map((p, i) => new Touch({ identifier: i + 1, target, clientX: p.x, clientY: p.y }));
        const type = { start: 'touchstart', move: 'touchmove', end: 'touchend' }[phase]!;
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: phase === 'end' ? [] : touches, targetTouches: phase === 'end' ? [] : touches, changedTouches: touches }));
        const pointer = { start: 'pointerdown', move: 'pointermove', end: 'pointerup' }[phase]!;
        points.forEach((p, i) => target.dispatchEvent(new PointerEvent(pointer, { bubbles: true, cancelable: true, pointerId: i + 2, pointerType: 'touch', isPrimary: i === 0, clientX: p.x, clientY: p.y, buttons: phase === 'end' ? 0 : 1 })));
      },
      { phase, points },
    );
  const path = async (points: Point[], stepMs = 16) => {
    await dispatch('start', [points[0]]);
    for (const point of points.slice(1)) {
      await sleep(stepMs);
      await dispatch('move', [point]);
    }
    await dispatch('end', [points[points.length - 1]]);
  };
  const readScroll = (): Promise<number> => page.evaluate(() => window.scrollY);
  return {
    native: false,
    tap: (x, y) => page.touchscreen.tap(x, y),
    async hold(x, y, ms, drift = { x: 0, y: 0 }) {
      const steps = Math.max(1, Math.round(ms / 2 / 50));
      await path(line(x, y, drift.x, drift.y, steps), 50);
      await sleep(Math.max(0, ms - steps * 50));
    },
    path,
    async swipe(x, y, dx, dy, ms = 250) {
      const before = await readScroll();
      await path(line(x, y, dx, dy, Math.max(2, Math.round(ms / 16))));
      await sleep(300);
      return (await readScroll()) - before;
    },
    async drag(x, y, dx, dy, ms = 500) {
      await path(line(x, y, dx, dy, Math.max(2, Math.round(ms / 16))));
    },
    async swipeWatch(x, y, dx, dy, ms = 250, watchMs = 300) {
      const before = await readScroll();
      await path(line(x, y, dx, dy, Math.max(2, Math.round(ms / 16))));
      const after: { t: number; y: number }[] = [];
      const start = Date.now();
      while (Date.now() - start < watchMs) {
        after.push({ t: Date.now() - start, y: await readScroll() });
        await sleep(16);
      }
      return { before, atLift: after[0]?.y ?? before, after };
    },
    async pinch(x, y, from, to, ms = 300) {
      const steps = Math.max(2, Math.round(ms / 16));
      const pair = (d: number): Point[] => [{ x: x - d / 2, y }, { x: x + d / 2, y }];
      await dispatch('start', pair(from));
      for (let i = 1; i <= steps; i++) {
        await sleep(16);
        await dispatch('move', pair(from + ((to - from) * i) / steps));
      }
      await dispatch('end', pair(to));
    },
  };
}

async function touchFor(page: Page, browser: 'chromium' | 'webkit'): Promise<Touch> {
  if (browser === 'webkit') return syntheticTouch(page);
  return cdpTouch(page, await page.context().newCDPSession(page));
}

/** Fake safe-area insets (no emulator reports real ones): the pages read them from `--safe-*`. */
export async function setSafeArea(page: Page, insets: Insets): Promise<void> {
  await page.evaluate((i: Insets) => {
    const style = document.documentElement.style;
    for (const [side, key] of [['top', 't'], ['right', 'r'], ['bottom', 'b'], ['left', 'l']] as const) {
      if (i[side] !== undefined) style.setProperty(`--safe-${key}`, `${i[side]}px`);
    }
  }, insets);
}

// ── Measurements on the page ───────────────────────────────────────────────────────────────────

/** Relative luminance of an sRGB color (WCAG 2). */
function luminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratioOf(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Contrast of an element against what is painted behind it: three screenshots of its box, with the
 * element as it is (A), with its ink hidden (B: transparent text for `text`, the element hidden for
 * `glyph`, the element unfocused for `focus`) and as it is again (A2). Pixels that differ between A
 * and B are its ink; pixels that change between A and A2 (an animation) are left out. The ratio is
 * the 90th percentile of the per-pixel ratios, so antialiased edges do not lower it.
 */
export async function measureContrast(page: Page, selector: string, kind: ContrastKind): Promise<ContrastResult> {
  const box: { x: number; y: number; width: number; height: number } | null = await page.evaluate(
    ({ selector, kind }: { selector: string; kind: ContrastKind }) => {
      const el = [...document.querySelectorAll<HTMLElement>(selector)].find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && e.checkVisibility({ checkVisibilityCSS: true });
      });
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      if (kind === 'focus') el.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
      el.setAttribute('data-check-phone', 'contrast');
      const r = el.getBoundingClientRect();
      const pad = kind === 'focus' ? 6 : 0;
      const x = Math.max(0, Math.floor(r.left - pad));
      const y = Math.max(0, Math.floor(r.top - pad));
      return { x, y, width: Math.min(innerWidth, Math.ceil(r.right + pad)) - x, height: Math.min(innerHeight, Math.ceil(r.bottom + pad)) - y };
    },
    { selector, kind },
  );
  if (!box || box.width < 1 || box.height < 1) return { ratio: null, pixels: 0, problem: `no visible ${selector}` };
  await sleep(150);
  const shot = async () => decodePng(new Uint8Array(await page.screenshot({ clip: box, animations: 'disabled', caret: 'hide' })));
  const a = await shot();
  await page.evaluate((kind: ContrastKind) => {
    const el = document.querySelector<HTMLElement>('[data-check-phone="contrast"]');
    if (!el) return;
    if (kind === 'focus') el.blur();
    else {
      const style = document.createElement('style');
      style.id = 'check-phone-contrast';
      style.textContent =
        kind === 'text'
          ? '[data-check-phone="contrast"], [data-check-phone="contrast"] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; }'
          : '[data-check-phone="contrast"] { visibility: hidden !important; }';
      document.head.append(style);
    }
  }, kind);
  await sleep(150);
  const b = await shot();
  await page.evaluate((kind: ContrastKind) => {
    document.getElementById('check-phone-contrast')?.remove();
    const el = document.querySelector<HTMLElement>('[data-check-phone="contrast"]');
    if (kind === 'focus') el?.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  }, kind);
  await sleep(150);
  const a2 = await shot();
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-check-phone="contrast"]');
    el?.removeAttribute('data-check-phone');
    el?.blur();
  });
  if (a.width !== b.width || a.height !== b.height || a.width !== a2.width || a.height !== a2.height) return { ratio: null, pixels: 0, problem: 'the element moved while it was measured' };
  const ratios: number[] = [];
  for (let i = 0; i < a.data.length; i += 4) {
    const moving = Math.max(Math.abs(a.data[i] - a2.data[i]), Math.abs(a.data[i + 1] - a2.data[i + 1]), Math.abs(a.data[i + 2] - a2.data[i + 2])) > 2;
    const ink = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])) > 8;
    if (moving || !ink) continue;
    ratios.push(ratioOf(luminance(a.data[i], a.data[i + 1], a.data[i + 2]), luminance(b.data[i], b.data[i + 1], b.data[i + 2])));
  }
  if (ratios.length < 12) return { ratio: null, pixels: ratios.length, problem: 'too few stable ink pixels to measure' };
  ratios.sort((x, y) => x - y);
  return { ratio: Math.round(ratios[Math.floor(ratios.length * 0.9)] * 100) / 100, pixels: ratios.length };
}

export async function visibleFraction(page: Page, selector: string): Promise<number> {
  return page.evaluate((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return 0;
    const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    return (w * h) / (r.width * r.height);
  }, selector);
}

// ── Generic checks ─────────────────────────────────────────────────────────────────────────────

type Status = 'pass' | 'fail' | 'skip' | 'error';

interface Result {
  page: PageKey;
  viewport: string;
  browser: 'chromium' | 'webkit';
  check: string;
  status: Status;
  messages: string[];
  figures: Record<string, unknown>;
}

/** The scroll stops of the generic checks: 0, 25, 50 and 75 % of the range, and its end. */
async function scrollStops(page: Page): Promise<number[]> {
  const max: number = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  return [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
}

async function scrollTo(page: Page, y: number): Promise<void> {
  await page.evaluate((top: number) => window.scrollTo({ left: 0, top, behavior: 'instant' }), y);
  await sleep(120);
}

/** Horizontal scroll at the five stops, and elements past the right edge outside the allowed regions. */
async function checkEdges(page: Page, clip: readonly string[]): Promise<{ messages: string[]; figures: Record<string, unknown> }> {
  const messages: string[] = [];
  const widths: number[] = [];
  for (const y of await scrollStops(page)) {
    await scrollTo(page, y);
    const found: { scrollWidth: number; innerWidth: number; over: string[] } = await page.evaluate((clip: string[]) => {
      const allowed = clip.join(', ');
      const describe = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].slice(0, 3).map((c) => `.${c}`).join('')}`;
      const over: Element[] = [];
      for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.right <= innerWidth + 0.5) continue;
        if (allowed && el.closest(allowed)) continue;
        if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
        if (over.some((o) => o.contains(el))) continue;
        over.push(el);
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
        over: over.slice(0, 8).map((el) => `${describe(el)} reaches ${Math.round(el.getBoundingClientRect().right)} px`),
      };
    }, [...clip]);
    widths.push(found.scrollWidth);
    if (found.scrollWidth > found.innerWidth) messages.push(`at scrollY ${y} the page is ${found.scrollWidth} px wide in a ${found.innerWidth} px viewport`);
    for (const over of found.over) if (!messages.includes(`past the right edge: ${over}`)) messages.push(`past the right edge: ${over}`);
  }
  await scrollTo(page, 0);
  return { messages, figures: { scrollWidth: Math.max(...widths) } };
}

interface TargetFindings {
  probed: number;
  misses: string[];
  unreached: string[];
  overlaps: string[];
}

/**
 * Target probes and hit-rectangle overlaps, at scroll stops 0.6 of a viewport apart. Each control is
 * probed at the first stop where its whole box lies in the viewport and its center hits it (not
 * covered by a bar); a control never probed that way is reported as unreached.
 */
async function checkTargets(page: Page, setup: PageSetup | undefined): Promise<TargetFindings> {
  const skip = [...(setup?.skipTargets ?? [])];
  const letters = [...(setup?.letters ?? [])];
  await page.evaluate(() => {
    (window as unknown as { __cpTargets: unknown }).__cpTargets = { ids: new WeakMap(), els: {}, next: 0, probed: {}, pairs: {}, seen: {} };
  });
  const max: number = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const step: number = await page.evaluate(() => Math.round(innerHeight * 0.6));
  const innerHeightOf: number = await page.evaluate(() => innerHeight);
  const probeStop = ({ skip, letters }: { skip: string[]; letters: string[] }) => {
    const state = (window as unknown as { __cpTargets: { ids: WeakMap<Element, number>; els: Record<number, Element>; next: number; probed: Record<number, string>; pairs: Record<string, string>; seen: Record<number, string> } }).__cpTargets;
    const SELECTOR =
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="slider"], [role="radio"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [tabindex="0"]';
    const describe = (el: Element) => {
      const own = el.getAttribute('aria-label') ?? (el.textContent?.trim() || [...((el as HTMLInputElement).labels ?? [])].map((l) => l.textContent).join(' ') || (el as HTMLInputElement).value || '');
      const text = own.trim().replace(/\s+/g, ' ').slice(0, 28);
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].slice(0, 2).map((c) => `.${c}`).join('')}${text ? ` "${text}"` : ''}`;
    };
    const idOf = (el: Element) => {
      if (!state.ids.has(el)) state.ids.set(el, state.next++);
      return state.ids.get(el)!;
    };
    /** A link inside running text (WCAG 2.5.8 inline exception). */
    const inSentence = (el: Element) => {
      if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline' || !el.parentElement) return false;
      return (el.parentElement.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 2;
    };
    // The element that is touched: a visually hidden input is touched through its label.
    const targets = new Map<Element, Element>();
    for (const el of document.querySelectorAll(SELECTOR)) {
      if (skip.length && el.closest(skip.join(', '))) continue;
      if (el.closest('[inert]') || inSentence(el)) continue;
      let target: Element = el;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) {
        const label = (el as HTMLInputElement).labels?.[0];
        if (!label) continue;
        target = label;
      }
      const t = target.getBoundingClientRect();
      if (t.width < 4 || t.height < 4 || !target.checkVisibility({ checkVisibilityCSS: true })) continue;
      if (!targets.has(target)) targets.set(target, el);
    }
    const owns = (target: Element, control: Element, hit: Element | null) =>
      !!hit && (target.contains(hit) || control.contains(hit) || [...((control as HTMLInputElement).labels ?? [])].some((l) => l.contains(hit)));
    /** The element's box grown by its positioned ::before and ::after, in viewport coordinates. */
    const hitRect = (el: Element) => {
      const r = el.getBoundingClientRect();
      const box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      for (const pseudo of ['::before', '::after']) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.content === 'none' || cs.content === 'normal' || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
        if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
        const px = (v: string) => parseFloat(v) || 0;
        let w = px(cs.width);
        let h = px(cs.height);
        if (cs.boxSizing !== 'border-box') {
          w += px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth);
          h += px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth);
        }
        if (w <= 0 || h <= 0) continue;
        let cb = { left: 0, top: 0, width: innerWidth, height: innerHeight };
        if (cs.position === 'absolute') {
          let a: Element | null = el;
          while (a && a !== document.documentElement) {
            const s = getComputedStyle(a);
            if (s.position !== 'static' || s.transform !== 'none' || s.filter !== 'none' || s.contain.includes('paint') || s.contain.includes('layout')) break;
            a = a.parentElement;
          }
          const container = a ?? document.documentElement;
          const ar = container.getBoundingClientRect();
          const as = getComputedStyle(container);
          cb = { left: ar.left + px(as.borderLeftWidth), top: ar.top + px(as.borderTopWidth), width: container.clientWidth, height: container.clientHeight };
        }
        const left = cs.left !== 'auto' ? px(cs.left) : cs.right !== 'auto' ? cb.width - px(cs.right) - w : 0;
        const top = cs.top !== 'auto' ? px(cs.top) : cs.bottom !== 'auto' ? cb.height - px(cs.bottom) - h : 0;
        let corners = [
          [cb.left + left, cb.top + top],
          [cb.left + left + w, cb.top + top],
          [cb.left + left, cb.top + top + h],
          [cb.left + left + w, cb.top + top + h],
        ];
        const origin = cs.transformOrigin.split(' ').map(px);
        const [ox, oy] = [cb.left + left + (origin[0] ?? 0), cb.top + top + (origin[1] ?? 0)];
        if (cs.translate && cs.translate !== 'none') {
          const [tx = '0', ty = '0'] = cs.translate.split(' ');
          const resolve = (v: string, size: number) => (v.endsWith('%') ? (parseFloat(v) / 100) * size : px(v));
          corners = corners.map(([x, y]) => [x + resolve(tx, w), y + resolve(ty, h)]);
        }
        const matrix = /^matrix\(([^)]+)\)$/.exec(cs.transform);
        if (matrix) {
          const [a, b, c, d, e, f] = matrix[1].split(',').map(Number);
          corners = corners.map(([x, y]) => [ox + a * (x - ox) + c * (y - oy) + e, oy + b * (x - ox) + d * (y - oy) + f]);
        }
        box.l = Math.min(box.l, ...corners.map((p) => p[0]));
        box.r = Math.max(box.r, ...corners.map((p) => p[0]));
        box.t = Math.min(box.t, ...corners.map((p) => p[1]));
        box.b = Math.max(box.b, ...corners.map((p) => p[1]));
      }
      return box;
    };
    /** Controls in a fixed or sticky container pass over the page's flow: only controls in the same layer are neighbors. */
    const layerOf = (el: Element) => {
      for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
        const position = getComputedStyle(a).position;
        if (position === 'fixed' || position === 'sticky') return a;
      }
      return null;
    };
    const inView: { target: Element; control: Element; box: ReturnType<typeof hitRect>; layer: Element | null }[] = [];
    for (const [target, control] of targets) {
      const id = idOf(target);
      state.seen[id] = describe(control);
      state.els[id] = target;
      const r = target.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      inView.push({ target, control, box: hitRect(target), layer: layerOf(target) });
      if (id in state.probed) continue;
      if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (!owns(target, control, document.elementFromPoint(cx, cy))) continue;
      const letter = letters.length > 0 && !!control.closest(letters.join(', '));
      const dx = letter ? Math.min(21, r.width / 2 - 1) : 21;
      const dy = letter ? Math.min(21, r.height / 2 - 1) : 21;
      const probes = [['left', cx - dx, cy], ['right', cx + dx, cy], ['up', cx, cy - dy], ['down', cx, cy + dy]] as const;
      // A probe point outside the viewport, or on a fixed or sticky panel the control is not in (a
      // pinned stage, a bar), says nothing about the control's size: try it at a later stop.
      const ownLayer = layerOf(target);
      const blocked = probes.some(([, x, y]) => {
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return true;
        const hit = document.elementFromPoint(x, y);
        if (!hit || owns(target, control, hit)) return false;
        const layer = layerOf(hit);
        return layer !== null && layer !== ownLayer && !layer.contains(target);
      });
      if (blocked) continue;
      const missed: string[] = [];
      for (const [name, x, y] of probes) {
        if (!owns(target, control, document.elementFromPoint(x, y))) missed.push(name);
      }
      state.probed[id] = missed.length ? `${describe(control)} (${Math.round(r.width)}×${Math.round(r.height)}) misses ${missed.join(', ')}` : '';
    }
    // Overlaps between hit rectangles of unrelated controls in view.
    const related = (a: Element, b: Element, ca: Element, cb: Element) =>
      a.contains(b) || b.contains(a) || ca.contains(cb) || cb.contains(ca) || [...((ca as HTMLInputElement).labels ?? [])].some((l) => l.contains(cb)) || [...((cb as HTMLInputElement).labels ?? [])].some((l) => l.contains(ca));
    for (let i = 0; i < inView.length; i++) {
      for (let j = i + 1; j < inView.length; j++) {
        const p = inView[i];
        const q = inView[j];
        const w = Math.min(p.box.r, q.box.r) - Math.max(p.box.l, q.box.l);
        const h = Math.min(p.box.b, q.box.b) - Math.max(p.box.t, q.box.t);
        if (w <= 0.5 || h <= 0.5 || p.layer !== q.layer || related(p.target, q.target, p.control, q.control)) continue;
        const key = [idOf(p.target), idOf(q.target)].sort((x, y) => x - y).join('-');
        state.pairs[key] ??= `${describe(p.control)} and ${describe(q.control)} overlap by ${Math.round(w)}×${Math.round(h)} px`;
      }
    }
  };
  for (let y = 0; ; y = Math.min(max, y + step)) {
    await scrollTo(page, y);
    await page.evaluate(probeStop, { skip, letters });
    if (y >= max) break;
  }
  // A control never probed at those stops (a pinned stage or a bar always over one of its probe
  // points) gets its own stops: its center at 75, 50 and 25 % of the viewport height.
  const pending: number[] = await page.evaluate(() => {
    const s = (window as unknown as { __cpTargets: { els: Record<number, Element>; probed: Record<number, string> } }).__cpTargets;
    return Object.entries(s.els).filter(([id]) => !(id in s.probed)).map(([, el]) => { const r = el.getBoundingClientRect(); return Math.round(r.top + scrollY + r.height / 2); });
  });
  for (const center of [...new Set(pending)]) {
    for (const f of [0.75, 0.5, 0.25]) {
      const y = Math.max(0, Math.min(max, Math.round(center - innerHeightOf * f)));
      await scrollTo(page, y);
      await page.evaluate(probeStop, { skip, letters });
    }
  }
  const state: { probed: Record<number, string>; pairs: Record<string, string>; seen: Record<number, string> } = await page.evaluate(() => {
    const s = (window as unknown as { __cpTargets: { probed: Record<number, string>; pairs: Record<string, string>; seen: Record<number, string> } }).__cpTargets;
    return { probed: s.probed, pairs: s.pairs, seen: s.seen };
  });
  await scrollTo(page, 0);
  const probedIds = Object.keys(state.probed);
  return {
    probed: probedIds.length,
    misses: Object.values(state.probed).filter(Boolean),
    unreached: Object.entries(state.seen).filter(([id]) => !(id in state.probed)).map(([, what]) => what),
    overlaps: Object.values(state.pairs),
  };
}

/** Visible text under its size floor: sentences under 12 px, anything else under 11 px. SVG drawings are left out. */
async function checkText(page: Page, exempt: readonly string[]): Promise<string[]> {
  return page.evaluate((exempt: string[]) => {
    const found = new Map<string, string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim();
      const el = node.parentElement;
      if (!text || !el || el.closest('svg, script, style, noscript, template')) continue;
      if (exempt.length && el.closest(exempt.join(', '))) continue;
      if (!el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      // A sentence: a run of at least four words in a text block of at least six, outside any control.
      // Anything shorter (a label, a tag, a readout) has the 11 px floor.
      const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
      const control = el.closest('a, button, label, summary, legend, select, option, input, output, [role]');
      const block = el.closest('p, li, dd, blockquote, figcaption, td');
      const sentence = !control && !!block && words(text) >= 4 && words(block.textContent ?? '') >= 6;
      const floor = sentence ? 12 : 11;
      if (size >= floor) continue;
      const key = `${el.tagName.toLowerCase()}${[...el.classList].slice(0, 2).map((c) => `.${c}`).join('')}`;
      if (!found.has(key)) found.set(key, `${key} at ${size} px ("${text.replace(/\s+/g, ' ').slice(0, 24)}"), under ${floor} px`);
    }
    return [...found.values()];
  }, [...exempt]);
}

/**
 * Tab through the page: the focused element inside the viewport, not covered, outside every panel it
 * is not in, and outlined. WebKit's Tab reaches only form controls, as in Safari by default, so there
 * it presses Alt+Tab, Safari's key for every item. It stops when focus comes back to the first
 * element, after 150 presses, or when focus stays off the page for five presses in a row.
 */
async function checkFocus(page: Page, panels: readonly string[], key: string, skip: readonly string[] = []): Promise<{ messages: string[]; steps: number; reached: number }> {
  const messages: string[] = [];
  await scrollTo(page, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let first: string | null = null;
  let steps = 0;
  let away = 0;
  const reached = new Set<string>();
  for (; steps < 150; steps++) {
    await page.keyboard.press(key);
    await sleep(60);
    const inspect = ({ panels, skip }: { panels: string[]; skip: string[] }): { id: string; problem: string | null } | null => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const w = window as unknown as { __cpFocus?: WeakMap<Element, number>; __cpFocusNext?: number };
      w.__cpFocus ??= new WeakMap();
      if (!w.__cpFocus.has(el)) w.__cpFocus.set(el, (w.__cpFocusNext = (w.__cpFocusNext ?? 0) + 1));
      const describe = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].slice(0, 2).map((c) => `.${c}`).join('')} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
      const r = el.getBoundingClientRect();
      const problems: string[] = [];
      if (r.width > 0 && r.height > 0) {
        // An element taller than the viewport cannot be wholly inside it: filling half of it or more is
        // enough (WCAG 2.4.11 asks that focus is not entirely hidden).
        const spans = r.height > innerHeight && Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= innerHeight / 2 && r.left >= -1 && r.right <= innerWidth + 1;
        if (!spans && (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1)) problems.push('is not wholly inside the viewport');
        // A visually hidden proxy (a clipped 1 px input) is shown through its drawing, and an annular or
        // nested control (skipped by the target probe) is centered on another control: neither is
        // tested for cover. A link that wraps is tested at the center of its first line box.
        const cs0 = getComputedStyle(el);
        const hiddenProxy = r.width <= 2 || r.height <= 2 || (cs0.clip !== 'auto' && cs0.clip !== '') || cs0.clipPath.startsWith('inset(50%');
        const annular = skip.length > 0 && !!el.closest(skip.join(', '));
        const line = el.getClientRects()[0] ?? r;
        const cx = Math.min(innerWidth - 1, Math.max(0, line.left + line.width / 2));
        const cy = Math.min(innerHeight - 1, Math.max(0, line.top + line.height / 2));
        const hit = document.elementFromPoint(cx, cy);
        const label = [...((el as HTMLInputElement).labels ?? [])];
        if (!hiddenProxy && !annular && hit && !el.contains(hit) && !hit.contains(el) && !label.some((l) => l.contains(hit))) problems.push(`is covered by ${hit.tagName.toLowerCase()}${[...hit.classList].slice(0, 2).map((c) => `.${c}`).join('')}`);
        for (const selector of panels) {
          for (const panel of document.querySelectorAll(selector)) {
            if (panel.contains(el)) continue;
            const p = panel.getBoundingClientRect();
            if (Math.min(r.right, p.right) - Math.max(r.left, p.left) > 0.5 && Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top) > 0.5) problems.push(`is under ${selector}`);
          }
        }
        // The ring may be drawn by the element or by its ::before or ::after (a hit zone off its drawing).
        const ringed = (cs: CSSStyleDeclaration) => (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1) || cs.boxShadow !== 'none';
        const outlined = ringed(getComputedStyle(el)) || ['::before', '::after'].some((p) => {
          const cs = getComputedStyle(el, p);
          return cs.content !== 'none' && cs.content !== 'normal' && ringed(cs);
        });
        if (!outlined) problems.push('has no outline or box-shadow');
      }
      return { id: String(w.__cpFocus.get(el)), problem: problems.length ? `${describe} ${problems.join(', ')}` : null };
    };
    let seen = await page.evaluate(inspect, { panels: [...panels], skip: [...skip] });
    // A transient popover (a nameplate that closes 120 ms after focus leaves it) is not a cover: look again.
    if (seen?.problem?.includes('is covered by')) {
      await sleep(350);
      seen = await page.evaluate(inspect, { panels: [...panels], skip: [...skip] });
    }
    if (!seen) {
      if (first !== null && ++away >= 5) break;
      continue;
    }
    away = 0;
    reached.add(seen.id);
    if (first === null) first = seen.id;
    else if (seen.id === first) break;
    if (seen.problem && !messages.includes(seen.problem)) messages.push(seen.problem);
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await scrollTo(page, 0);
  return { messages, steps, reached: reached.size };
}

/** Running animations inside the panels (the page is loaded with reduced motion). */
async function runningAnimations(page: Page, panels: readonly string[]): Promise<string[]> {
  return page.evaluate((panels: string[]) => {
    const found: string[] = [];
    for (const selector of panels) {
      for (const panel of document.querySelectorAll(selector)) {
        for (const animation of panel.getAnimations({ subtree: true })) {
          if (animation.playState !== 'running') continue;
          const target = (animation.effect as KeyframeEffect | null)?.target;
          found.push(`${selector}: ${animation.constructor.name} on ${target ? target.tagName.toLowerCase() + [...target.classList].slice(0, 2).map((c) => `.${c}`).join('') : '?'}`);
        }
      }
    }
    return found;
  }, [...panels]);
}

/** A 250 px swipe starting on each visual moves the page: at least 60 % of the finger's travel, or all the room left. */
async function checkSwipes(page: Page, touch: Touch, visuals: readonly string[]): Promise<{ messages: string[]; figures: Record<string, number> }> {
  const messages: string[] = [];
  const figures: Record<string, number> = {};
  const count: number[] = await page.evaluate((visuals: string[]) => visuals.map((s) => document.querySelectorAll(s).length), [...visuals]);
  for (const [v, selector] of visuals.entries()) {
    for (let i = 0; i < Math.min(count[v], 6); i++) {
      await scrollTo(page, 0);
      const start: { x: number; top: number; bottom: number; room: number; up: number; name: string } | null = await page.evaluate(
        ({ selector, i }: { selector: string; i: number }) => {
          const el = document.querySelectorAll(selector)[i] as HTMLElement | undefined;
          if (!el || !el.checkVisibility({ checkVisibilityCSS: true })) return null;
          const whole = el.getBoundingClientRect();
          if (whole.width < 20 || whole.height < 20) return null;
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = el.getBoundingClientRect();
          const top = Math.max(r.top, 4);
          const bottom = Math.min(r.bottom, innerHeight - 4);
          if (bottom - top < 10) return null;
          const x = Math.min(Math.max(r.left + r.width / 2, 4), innerWidth - 4);
          return {
            x,
            top: top + 4,
            bottom: bottom - 4,
            room: document.documentElement.scrollHeight - innerHeight - scrollY,
            up: scrollY,
            name: `${selector}[${i}]`,
          };
        },
        { selector, i },
      );
      if (!start) continue;
      await sleep(150);
      // The finger moves up from the visual's lowest visible point (the page scrolls down), or, with no
      // room left below, down from its highest visible point.
      const downward = start.room >= 60 || start.room >= start.up;
      const height: number = await page.evaluate(() => innerHeight);
      const y = downward ? start.bottom : start.top;
      const travel = downward ? Math.min(250, y - 4) : Math.min(250, height - 4 - y);
      if (travel < 60) {
        messages.push(`${start.name}: no room for a swipe on it`);
        continue;
      }
      const moved = await touch.swipe(start.x, y, 0, downward ? -travel : travel);
      const expected = Math.min(0.6 * travel, downward ? start.room : start.up);
      figures[start.name] = moved;
      if (Math.abs(moved) + 1 < expected) messages.push(`${start.name}: a ${Math.round(travel)} px swipe on it moved the page ${Math.round(moved)} px (expected at least ${Math.round(expected)})`);
    }
  }
  await scrollTo(page, 0);
  return { messages, figures };
}

// ── The phone mode ─────────────────────────────────────────────────────────────────────────────

interface PhoneOptions {
  pages: PageKey[];
  origins: Origins;
  browser: 'chromium' | 'webkit';
  out: string | null;
  viewports: string[] | null;
  check: string | null;
}

async function phone(playwright: any, options: PhoneOptions): Promise<Result[]> {
  const results: Result[] = [];
  const report = (result: Result) => {
    results.push(result);
    const head = `${result.status.toUpperCase().padEnd(5)} ${result.page.padEnd(14)} ${result.viewport.padEnd(8)} ${result.check}`;
    console.log(result.messages.length ? `${head}\n${result.messages.map((m) => `        ${m}`).join('\n')}` : head);
  };
  const webkit = options.browser === 'webkit';
  const launcher = webkit ? playwright.webkit : playwright.chromium;
  if (options.out) mkdirSync(options.out, { recursive: true });

  for (const key of options.pages) {
    const info = PAGES[key];
    const module = await loadModule(key);
    const setup = module?.setup?.[key];
    if (!module) console.log(`note  ${key}: no module tools/check-phone/${info.module}.ts yet, generic checks only`);
    const matrix = webkit ? [WEBKIT_VIEWPORT] : [...PHONE_VIEWPORTS, ...info.phone, ...(setup?.viewports ?? [])];
    const viewports = [...new Map(matrix.map((v) => [vpName(v), v])).values()].filter((v) => !options.viewports || options.viewports.includes(vpName(v)));
    const wanted = (name: string) => !options.check || name.includes(options.check);
    const browser = await launcher.launch(webkit ? {} : { args: GPU_ARGS });
    try {
      for (const viewport of viewports) {
        const base = { page: key, viewport: vpName(viewport), browser: options.browser };
        const contextOptions = (o: OpenOptions = {}) => ({
          ...(webkit ? playwright.devices['iPhone 13'] : {}),
          viewport: o.viewport ?? viewport,
          deviceScaleFactor: o.deviceScaleFactor ?? (webkit ? 3 : 2),
          isMobile: o.isMobile ?? true,
          hasTouch: o.hasTouch ?? true,
          reducedMotion: o.reducedMotion ?? 'no-preference',
          locale: 'en-US',
        });
        const errors: string[] = [];
        const context = await browser.newContext(contextOptions());
        await context.addInitScript({ content: NAME_SHIM });
        const page = await context.newPage();
        page.on('pageerror', (e: Error) => errors.push(`page error: ${e.message}`));
        page.on('console', (m: any) => {
          if (m.type() === 'error') errors.push(`console: ${m.text()}`);
        });
        const load = async (p: Page, path?: string) => {
          const response = await p.goto(urlOf(options.origins, key, path), { waitUntil: 'load', timeout: 180_000 });
          if (!response || !response.ok()) throw new Error(`${urlOf(options.origins, key, path)} answered ${response?.status()}`);
          await waitReady(p, key, setup);
        };
        try {
          await load(page);
        } catch (error) {
          report({ ...base, check: 'load', status: 'error', messages: [String((error as Error).message ?? error)], figures: {} });
          await context.close();
          continue;
        }
        const touch = await touchFor(page, options.browser);
        // The context the page module's checks (and the contrast targets' `prepare`) get.
        const opened: any[] = [];
        let check = '';
        let messages: string[] = [];
        let figures: Record<string, unknown> = {};
        let skipped: string | null = null;
        let shots = 0;
        const screenshot = async (name: string, p: Page = page): Promise<string | null> => {
          if (!options.out) return null;
          const dir = join(options.out, key, vpName(viewport));
          mkdirSync(dir, { recursive: true });
          const file = join(dir, `${String(++shots).padStart(2, '0')}-${check.replace(/[^a-z0-9]+/gi, '-')}-${name.replace(/[^a-z0-9]+/gi, '-')}.png`.toLowerCase());
          await p.screenshot({ path: file });
          return file;
        };
        const t: CheckContext = {
          key,
          viewport,
          browser: options.browser,
          page,
          touch,
          url: (path?: string) => urlOf(options.origins, key, path),
          reload: async () => {
            await page.reload({ waitUntil: 'load', timeout: 180_000 });
            await waitReady(page, key, setup);
          },
          open: async (o: OpenOptions = {}) => {
            const context2 = await browser.newContext(contextOptions(o));
            await context2.addInitScript({ content: NAME_SHIM });
            opened.push(context2);
            const p = await context2.newPage();
            p.on('pageerror', (e: Error) => errors.push(`page error (opened page): ${e.message}`));
            await load(p, o.path);
            return { page: p, touch: await touchFor(p, o.hasTouch === false ? 'webkit' : options.browser) };
          },
          resize: (v: Viewport) => page.setViewportSize(v),
          setSafeArea: (insets: Insets, p: Page = page) => setSafeArea(p, insets),
          contrast: (selector: string, kind: ContrastKind, p: Page = page) => measureContrast(p, selector, kind),
          visibleFraction: (selector: string, p: Page = page) => visibleFraction(p, selector),
          expect: (ok: boolean, message: string) => {
            if (!ok) messages.push(message);
            return ok;
          },
          note: (name: string, value: unknown) => {
            figures[name] = value;
          },
          skip: (reason: string) => {
            skipped = reason;
          },
          screenshot,
        };
        const generic = async (name: string, run: () => Promise<{ messages: string[]; figures?: Record<string, unknown>; skip?: string }>) => {
          if (!wanted(`generic: ${name}`)) return;
          try {
            const r = await run();
            report({ ...base, check: `generic: ${name}`, status: r.skip ? 'skip' : r.messages.length ? 'fail' : 'pass', messages: r.skip ? [r.skip] : r.messages, figures: r.figures ?? {} });
          } catch (error) {
            report({ ...base, check: `generic: ${name}`, status: 'error', messages: [String((error as Error).stack ?? error)], figures: {} });
          }
        };

        await generic('horizontal scroll and right edge', () => checkEdges(page, [...info.clip, ...(setup?.clip ?? [])]));
        let targets: TargetFindings | null = null;
        await generic('targets', async () => {
          targets = await checkTargets(page, setup);
          return { messages: targets.misses, figures: { probed: targets.probed, unreached: targets.unreached } };
        });
        await generic('hit-area overlap', async () => {
          targets ??= await checkTargets(page, setup);
          return { messages: targets.overlaps };
        });
        await generic('text sizes', async () => (webkit ? { messages: [], skip: 'Chromium only' } : { messages: await checkText(page, setup?.smallText ?? []) }));
        await generic('contrast', async () => {
          const messages: string[] = [];
          const figures: Record<string, unknown> = {};
          for (const target of setup?.contrast ?? []) {
            if (webkit && !target.webkit) continue;
            await scrollTo(page, 0);
            if (target.prepare) await target.prepare(t);
            const result = await measureContrast(page, target.selector, target.kind);
            for (const c2 of opened.splice(0)) await c2.close().catch(() => {});
            const need = target.kind === 'text' ? 4.5 : 3;
            figures[`${target.selector} (${target.kind})`] = result.ratio;
            if (result.ratio === null) messages.push(`${target.selector}: ${result.problem}`);
            else if (result.ratio < need) messages.push(`${target.selector} (${target.kind}) at ${result.ratio}:1, under ${need}:1`);
          }
          await scrollTo(page, 0);
          return { messages, figures, skip: setup?.contrast?.length ? undefined : 'the module declares no phone-gated selector' };
        });
        await generic('focus', async () => {
          const found = await checkFocus(page, setup?.panels ?? [], webkit ? 'Alt+Tab' : 'Tab', setup?.skipTargets ?? []);
          if (found.reached === 0) return { messages: [], skip: `no element took focus in ${found.steps} presses` };
          return { messages: found.messages, figures: { presses: found.steps, reached: found.reached } };
        });
        await generic('swipe over visuals', async () => {
          if (!touch.native) return { messages: [], skip: 'no native touch in WebKit' };
          return checkSwipes(page, touch, setup?.visuals ?? info.visuals);
        });
        await generic('reduced motion on panels', async () => {
          if (!setup?.panels?.length) return { messages: [], skip: 'the module declares no panel' };
          const quiet = await browser.newContext(contextOptions({ reducedMotion: 'reduce' }));
          await quiet.addInitScript({ content: NAME_SHIM });
          try {
            const p = await quiet.newPage();
            await load(p);
            await sleep(500);
            return { messages: await runningAnimations(p, setup.panels) };
          } finally {
            await quiet.close();
          }
        });

        // The page's own checks.
        for (const c of module?.checks ?? []) {
          if (c.pages && !c.pages.includes(key)) continue;
          if (c.viewports && !c.viewports.includes(vpName(viewport))) continue;
          if (webkit && !c.webkit) continue;
          if (!wanted(c.name)) continue;
          check = c.name;
          messages = [];
          figures = {};
          skipped = null;
          try {
            await page.setViewportSize(viewport);
            await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            await scrollTo(page, 0);
            await c.run(t);
            report({ ...base, check: c.name, status: skipped ? 'skip' : messages.length ? 'fail' : 'pass', messages: skipped ? [skipped] : messages, figures });
          } catch (error) {
            report({ ...base, check: c.name, status: 'error', messages: [...messages, String((error as Error).stack ?? error)], figures });
          } finally {
            for (const c2 of opened.splice(0)) await c2.close().catch(() => {});
          }
        }

        await generic('page and console errors', async () => ({ messages: errors }));
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  if (options.out) writeFileSync(join(options.out, 'report.json'), JSON.stringify(results, null, 1));
  const count = (s: Status) => results.filter((r) => r.status === s).length;
  console.log(`\n${results.length} results: ${count('pass')} pass, ${count('fail')} fail, ${count('error')} error, ${count('skip')} skipped`);
  return results;
}

// ── The desk mode (design D16, first layer) ────────────────────────────────────────────────────

interface Shot {
  route: string;
  viewport: string;
  label: string;
  selector: string | null;
  requested: number;
  scrollY: number;
  scrollHeight: number;
  tries: number;
  sha1: string;
  /** Viewport boxes of the page's D15 copy lines at the time of the shot. */
  regions: { x: number; y: number; width: number; height: number }[];
}

interface DeskManifest {
  clock: string;
  renderer: string;
  routes: PageKey[];
  errors: string[];
  shots: Record<string, Shot | { errors: string[] }>;
  queries: Record<string, Record<string, boolean>>;
}

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

/** Page time only moves in fixed steps; real time first, so the scroll's observers run before any page time passes. */
async function settle(page: Page, ms: number, warnings: string[], where: string): Promise<void> {
  await sleep(300);
  await page.clock.runFor(ms);
  const ready = page.evaluate(async () => {
    await document.fonts.ready;
    const near = (img: HTMLImageElement) => {
      const r = img.getBoundingClientRect();
      return r.bottom > -innerHeight && r.top < 2 * innerHeight;
    };
    await Promise.all([...document.images].filter((img) => img.src && !img.complete && near(img)).map((img) => img.decode().catch(() => {})));
    return true;
  });
  const ok = await Promise.race([ready, sleep(15_000).then(() => false)]);
  if (!ok) warnings.push(`${where}: fonts or images not ready after 15 s`);
  await sleep(250);
  await page.clock.runFor(100);
  await sleep(150);
}

/**
 * Every body element's box (document coordinates) and a hash of its computed style and of its
 * ::before and ::after (custom properties aside), keyed by tag, classes and id rather than by
 * position, so that moved blocks compare equal.
 */
async function dumpElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hash = (text: string) => {
      let h = 0x811c9dc5;
      for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
      return (h >>> 0).toString(16).padStart(8, '0');
    };
    // Custom properties are left out: scripts write some of them on <html> every frame (time, scroll),
    // and they would reach every element by inheritance. What they change shows in real properties.
    // Computed url() values are absolute: the origin, and the random part of blob URLs, are dropped so
    // that two servers of the same pages compare equal.
    const styleText = (cs: CSSStyleDeclaration) => {
      let out = '';
      for (let i = 0; i < cs.length; i++) if (!cs[i].startsWith('--')) out += `${cs[i]}:${cs.getPropertyValue(cs[i])};`;
      return out.split(location.origin).join('').replace(/blob:[^"')\s]+/g, 'blob:');
    };
    const rows: string[] = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      const box = [r.left + scrollX, r.top + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100).join(',');
      const style = hash(styleText(getComputedStyle(el)) + styleText(getComputedStyle(el, '::before')) + styleText(getComputedStyle(el, '::after')));
      rows.push(`${el.tagName}${[...el.classList].map((c) => `.${c}`).join('')}${el.id ? `#${el.id}` : ''} ${box} ${style}`);
    }
    return rows.sort();
  });
}

async function desk(playwright: any, origins: Origins, keys: PageKey[], out: string, gpu: boolean): Promise<boolean> {
  mkdirSync(out, { recursive: true });
  const browser = await playwright.chromium.launch({ args: gpu ? GPU_ARGS : SWIFTSHADER_ARGS });
  const extraQueries = await moduleQueries(keys);
  const manifest: DeskManifest = { clock: new Date(CLOCK_ORIGIN).toISOString(), renderer: gpu ? 'gpu' : 'swiftshader', routes: keys, errors: [], shots: {}, queries: {} };
  // Capturing some pages into a folder that holds others keeps the others' entries.
  const previous = join(out, 'manifest.json');
  if (existsSync(previous)) {
    const old = JSON.parse(readFileSync(previous, 'utf8')) as DeskManifest;
    if (old.renderer !== manifest.renderer) throw new Error(`${out} was captured with ${old.renderer}; capture into another folder`);
    const mine = (name: string) => keys.some((key) => name.startsWith(`${key}/`) || name.startsWith(`${key} `));
    manifest.routes = [...new Set([...old.routes, ...keys])];
    manifest.errors = old.errors.filter((e) => !mine(e));
    manifest.shots = Object.fromEntries(Object.entries(old.shots).filter(([name]) => !mine(name)));
    manifest.queries = Object.fromEntries(Object.entries(old.queries ?? {}).filter(([name]) => !mine(name)));
  }
  const errors: string[] = [];
  const started = Date.now();
  for (const key of keys) {
    const info = PAGES[key];
    mkdirSync(join(out, key), { recursive: true });
    for (const viewport of [...DESK_VIEWPORTS, ...info.desk]) {
      const name = vpName(viewport);
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: false, isMobile: false, reducedMotion: 'reduce', timezoneId: 'UTC', locale: 'en-US' });
      await context.addInitScript({ content: NAME_SHIM });
      const t0 = Date.now();
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on('pageerror', (e: Error) => consoleErrors.push(String(e)));
      page.on('console', (m: any) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      try {
        await page.clock.install({ time: CLOCK_ORIGIN });
        await page.clock.pauseAt(CLOCK_ORIGIN + 1000);
        const response = await page.goto(urlOf(origins, key), { waitUntil: 'load', timeout: 180_000 });
        if (!response || !response.ok()) throw new Error(`${info.route} answered ${response?.status()}`);
        await page.mouse.move(0, 0);
        if (info.os) {
          await page.waitForFunction(() => {
            const el = document.querySelector('[data-boot-pct]');
            return !el || el.textContent === '100';
          }, null, { timeout: 180_000 });
          await sleep(1500);
          await page.clock.runFor(4000);
          if (info.hold) await page.keyboard.press('k');
        } else {
          await sleep(1500);
        }
        await settle(page, 1000, errors, `${key} ${name} load`);
        if (DESK_VIEWPORTS.some((v) => vpName(v) === name)) {
          const matches: Record<string, boolean> = await page.evaluate((qs: string[]) => Object.fromEntries(qs.map((q) => [q, matchMedia(q).matches])), [...PHONE_QUERIES, ...extraQueries]);
          manifest.queries[`${key}/${name}`] = matches;
          for (const [q, m] of Object.entries(matches)) if (m) errors.push(`${key} ${name}: ${q} matches on the desktop`);
        }
        writeFileSync(join(out, key, `${name}-dump.json`), JSON.stringify(await dumpElements(page)));

        const max: number = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        const targets: [string, string | null, number][] = [
          ['top', null, 0],
          ['p25', null, Math.round(max * 0.25)],
          ['p50', null, Math.round(max * 0.5)],
          ['p75', null, Math.round(max * 0.75)],
          ['bottom', null, max],
        ];
        for (const selector of info.sections) {
          const tops: number[] = await page.evaluate((s: string) => [...document.querySelectorAll(s)].map((el) => Math.round(el.getBoundingClientRect().top + scrollY)), selector);
          if (!tops.length) {
            errors.push(`${key} ${name}: section selector ${selector} matches nothing`);
            continue;
          }
          tops.forEach((top, i) => targets.push([`${slug(selector)}${tops.length > 1 ? `-${i}` : ''}`, selector + (tops.length > 1 ? `[${i}]` : ''), Math.max(0, Math.min(max, top))]));
        }
        let n = 0;
        for (const [label, selector, y] of targets) {
          await page.evaluate((top: number) => window.scrollTo({ left: 0, top, behavior: 'instant' }), y);
          await settle(page, 2500, errors, `${key} ${name} ${label}`);
          const at: { scrollY: number; scrollHeight: number; regions: Shot['regions'] } = await page.evaluate((lines: string[]) => ({
            scrollY: Math.round(scrollY),
            scrollHeight: document.documentElement.scrollHeight,
            regions: lines.flatMap((s) =>
              [...document.querySelectorAll(s)].map((el) => {
                const r = el.getBoundingClientRect();
                return { x: Math.round(r.left * 100) / 100, y: Math.round(r.top * 100) / 100, width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 };
              }),
            ),
          }), info.copyLines);
          if (Math.abs(at.scrollY - y) > 1) errors.push(`${key} ${name} ${label}: asked scrollY ${y}, landed at ${at.scrollY}`);
          const file = `${name}-${String(n++).padStart(2, '0')}-${label}.png`;
          // The page clock is paused, so anything still changing is real-time work (decoding, uploads):
          // shoot until two consecutive shots are byte-identical.
          let buffer: Buffer = await page.screenshot({ animations: 'disabled', caret: 'hide' });
          let tries = 1;
          for (;;) {
            await sleep(400);
            const next: Buffer = await page.screenshot({ animations: 'disabled', caret: 'hide' });
            if (next.equals(buffer)) break;
            buffer = next;
            if (++tries >= 8) {
              errors.push(`${key} ${name} ${label}: no two consecutive identical shots in ${tries} tries`);
              break;
            }
          }
          writeFileSync(join(out, key, file), buffer);
          manifest.shots[`${key}/${file}`] = { route: info.route, viewport: name, label, selector, requested: y, scrollY: at.scrollY, scrollHeight: at.scrollHeight, tries, sha1: createHash('sha1').update(buffer).digest('hex'), regions: at.regions };
        }
        if (consoleErrors.length) manifest.shots[`${key}/${name}-console`] = { errors: consoleErrors };
        console.log(`${key} ${name}: ${n} shots (${Math.round((Date.now() - t0) / 1000)} s)`);
      } catch (error) {
        errors.push(`${key} ${name}: ${(error as Error).message}`);
      } finally {
        await context.close();
      }
    }
  }
  await browser.close();
  manifest.errors.push(...errors);
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const shots = Object.values(manifest.shots).filter((s) => 'sha1' in s).length;
  console.log(`${shots} shots in ${Math.round((Date.now() - started) / 1000)} s into ${out}`);
  if (errors.length) console.error(errors.join('\n'));
  return errors.length === 0;
}

async function moduleQueries(keys: readonly PageKey[]): Promise<string[]> {
  const extra = new Set<string>();
  for (const key of keys) for (const q of (await loadModule(key))?.queries ?? []) if (!PHONE_QUERIES.includes(q)) extra.add(q);
  return [...extra];
}

// ── desk-compare ───────────────────────────────────────────────────────────────────────────────

/**
 * Shots that paint a few pixels one or two levels apart between two captures of the same build, on
 * SwiftShader and on the GPU alike (the page, not the rasterizer: most likely the order in which
 * asynchronously decoded pack pages are blended). Measured over repeated runs; a difference on any
 * other shot is a regression only if it survives two more captures of that page.
 */
const NOISE_SHOTS = [
  'b/1440x900-00-top.png',
  'b/1680x1050-00-top.png',
  'b/1680x1050-01-p25.png',
  'game-center/1024x768-00-top.png',
  'game-center/1440x900-00-top.png',
  'game-center/1680x1050-00-top.png',
  'wind-up-empire/1440x900-01-p25.png',
];
const NOISE_DELTA = 2;
const NOISE_PIXELS = 2000;
/** Element-dump additions design D15 allows: the span around the word "frame" in world D's timeline. */
const DUMP_ADDITIONS: Partial<Record<PageKey, string[]>> = { d: ['SPAN.timeline__frame-word'] };
/**
 * Element-dump rows design D15 allows to change, per page: their computed style may differ while their
 * position and height stay; `width` also lets the width change (a copy line that grew in place).
 */
const DUMP_CHANGES: Partial<Record<PageKey, { row: string; width?: true; why: string }[]>> = {
  a: ['layers', 'display', 'label'].map((name) => ({
    row: `SECTION.win.${name}`,
    why: "the Label window moved after the drawers, and bindWindows stacks the windows' z-index in document order",
  })),
  launcher: [
    { row: 'P.bar__note', width: true, why: 'the bar note reads "Playground experiment"' },
    { row: 'P.bar__clock', why: 'its automatic margin follows the wider bar note' },
  ],
  museum: ['DIV.clock__scrub', 'SPAN.clock__rail', 'SPAN.clock__head', 'SPAN.clock__target'].map((row) => ({
    row,
    why: 'the scrubber selects no text (user-select: none, inherited by its parts); design D5',
  })),
};

function deskCompare(before: string, after: string, json: string | null): boolean {
  const read = (dir: string) => JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { shots: Record<string, Partial<Shot>> };
  const a = read(before).shots;
  const b = read(after).shots;
  const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((n) => n.endsWith('.png')).sort();
  const report = {
    identical: 0,
    copyLines: [] as unknown[],
    noise: [] as unknown[],
    differing: [] as unknown[],
    missing: [] as string[],
    layout: [] as unknown[],
    dumps: [] as unknown[],
    dumpsSkipped: [] as string[],
  };
  for (const name of names) {
    const fa = join(before, name);
    const fb = join(after, name);
    if (!existsSync(fa) || !existsSync(fb)) {
      report.missing.push(`${name} (${existsSync(fa) ? 'after' : 'before'})`);
      continue;
    }
    const sa = a[name] ?? {};
    const sb = b[name] ?? {};
    if (sa.scrollY !== sb.scrollY || sa.scrollHeight !== sb.scrollHeight) report.layout.push({ name, before: { scrollY: sa.scrollY, scrollHeight: sa.scrollHeight }, after: { scrollY: sb.scrollY, scrollHeight: sb.scrollHeight } });
    // A copy line keeps its place and height; only its own box may differ.
    if (sa.regions && sb.regions) {
      const moved = sa.regions.length !== sb.regions.length || sa.regions.some((r, i) => r.y !== sb.regions![i].y || r.height !== sb.regions![i].height);
      if (moved) report.layout.push({ name, before: { regions: sa.regions }, after: { regions: sb.regions } });
    }
    const ba = readFileSync(fa);
    const bb = readFileSync(fb);
    if (ba.equals(bb)) {
      report.identical++;
      continue;
    }
    const ia = decodePng(new Uint8Array(ba));
    const ib = decodePng(new Uint8Array(bb));
    if (ia.width !== ib.width || ia.height !== ib.height) {
      report.differing.push({ name, size: [`${ia.width}x${ia.height}`, `${ib.width}x${ib.height}`] });
      continue;
    }
    const regions = [...(sa.regions ?? []), ...(sb.regions ?? [])];
    const inRegion = (x: number, y: number) => regions.some((r) => x >= Math.floor(r.x) && x < Math.ceil(r.x + r.width) && y >= Math.floor(r.y) && y < Math.ceil(r.y + r.height));
    let inside = 0;
    let outside = 0;
    let maxDelta = 0;
    let box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
    for (let i = 0; i < ia.data.length; i += 4) {
      const d = Math.max(Math.abs(ia.data[i] - ib.data[i]), Math.abs(ia.data[i + 1] - ib.data[i + 1]), Math.abs(ia.data[i + 2] - ib.data[i + 2]), Math.abs(ia.data[i + 3] - ib.data[i + 3]));
      if (!d) continue;
      const p = i / 4;
      const x = p % ia.width;
      const y = (p - x) / ia.width;
      if (inRegion(x, y)) {
        inside++;
        continue;
      }
      outside++;
      maxDelta = Math.max(maxDelta, d);
      box = { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) };
    }
    const bbox = outside ? { x: box.x0, y: box.y0, width: box.x1 - box.x0 + 1, height: box.y1 - box.y0 + 1 } : null;
    if (!outside) report.copyLines.push({ name, pixels: inside, regions });
    else if (NOISE_SHOTS.includes(name) && maxDelta <= NOISE_DELTA && outside <= NOISE_PIXELS) report.noise.push({ name, pixels: outside, maxDelta, bbox });
    else report.differing.push({ name, pixels: outside, maxDelta, bbox, inCopyLines: inside });
  }
  // Element dumps, as multisets.
  const dumpFiles = (dir: string) => readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => readdirSync(join(dir, d.name)).filter((f) => f.endsWith('-dump.json')).map((f) => `${d.name}/${f}`));
  const beforeDumps = existsSync(before) ? dumpFiles(before) : [];
  const afterDumps = existsSync(after) ? dumpFiles(after) : [];
  for (const file of [...new Set([...beforeDumps, ...afterDumps])].sort()) {
    if (!beforeDumps.includes(file) || !afterDumps.includes(file)) {
      report.dumpsSkipped.push(`${file} (only in ${beforeDumps.includes(file) ? 'before' : 'after'})`);
      continue;
    }
    const key = file.split('/')[0] as PageKey;
    const rowsA = JSON.parse(readFileSync(join(before, file), 'utf8')) as string[];
    const rowsB = JSON.parse(readFileSync(join(after, file), 'utf8')) as string[];
    const count = new Map<string, number>();
    for (const row of rowsA) count.set(row, (count.get(row) ?? 0) + 1);
    for (const row of rowsB) count.set(row, (count.get(row) ?? 0) - 1);
    let removed = [...count].filter(([, n]) => n > 0).map(([row]) => row);
    let added = [...count].filter(([, n]) => n < 0).map(([row]) => row);
    // A row design D15 lets change pairs with its counterpart: same element, same position and height.
    const parts = (row: string) => {
      const [name, box] = row.split(' ');
      const [x, y, w, h] = box.split(',');
      return { name, x, y, w, h };
    };
    for (const change of DUMP_CHANGES[key] ?? []) {
      for (const row of removed.filter((r) => parts(r).name === change.row)) {
        const a = parts(row);
        const twin = added.find((r) => {
          const b = parts(r);
          return b.name === a.name && b.x === a.x && b.y === a.y && b.h === a.h && (change.width || b.w === a.w);
        });
        if (!twin) continue;
        removed = removed.filter((r) => r !== row);
        added = added.filter((r) => r !== twin);
      }
    }
    const allowed = DUMP_ADDITIONS[key] ?? [];
    const unexpected = added.filter((row) => !allowed.some((prefix) => row.startsWith(`${prefix} `)));
    if (removed.length || unexpected.length) report.dumps.push({ file, removed: removed.slice(0, 12), added: unexpected.slice(0, 12), removedCount: removed.length, addedCount: unexpected.length });
  }
  const ok = !report.differing.length && !report.missing.length && !report.layout.length && !report.dumps.length;
  if (json) writeFileSync(json, JSON.stringify(report, null, 1));
  console.log(
    `${names.length} shots: ${report.identical} byte-identical, ${report.copyLines.length} different only inside D15 copy lines, ${report.noise.length} noise-only, ${report.differing.length} differing, ${report.missing.length} missing, ${report.layout.length} layout differences; ${report.dumps.length} element dumps differ${report.dumpsSkipped.length ? `, ${report.dumpsSkipped.length} dumps not compared` : ''}`,
  );
  for (const d of report.copyLines as { name: string; pixels: number }[]) console.log(`  copy line ${d.name}: ${d.pixels} px inside the line's box`);
  for (const d of report.noise as { name: string; pixels: number; maxDelta: number }[]) console.log(`  noise ${d.name}: ${d.pixels} px, max delta ${d.maxDelta}`);
  for (const d of report.differing) console.log(`  DIFF ${JSON.stringify(d)}`);
  for (const m of report.missing) console.log(`  MISSING ${m}`);
  for (const l of report.layout) console.log(`  LAYOUT ${JSON.stringify(l)}`);
  for (const d of report.dumps) console.log(`  DUMP ${JSON.stringify(d)}`);
  for (const s of report.dumpsSkipped) console.log(`  dump not compared: ${s}`);
  return ok;
}

// ── queries ────────────────────────────────────────────────────────────────────────────────────

async function queries(playwright: any, origins: Origins): Promise<boolean> {
  const all = [...PHONE_QUERIES, ...(await moduleQueries(PAGE_KEYS))];
  const browser = await playwright.chromium.launch({ args: SWIFTSHADER_ARGS });
  let ok = true;
  try {
    for (const viewport of DESK_VIEWPORTS) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: false, isMobile: false });
      const page = await context.newPage();
      await page.goto(urlOf(origins, 'museum'), { waitUntil: 'domcontentloaded', timeout: 120_000 });
      const matches: boolean[] = await page.evaluate((qs: string[]) => qs.map((q) => matchMedia(q).matches), all);
      all.forEach((q, i) => {
        console.log(`${vpName(viewport)} ${String(matches[i]).padEnd(5)} ${q}`);
        if (matches[i]) ok = false;
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return ok;
}

// ── Command line ───────────────────────────────────────────────────────────────────────────────

function parse(argv: string[]) {
  const [mode, ...rest] = argv;
  const flags = new Map<string, string>();
  const positional: string[] = [];
  const valued = new Set(['--base', '--os', '--browser', '--out', '--viewport', '--check', '--pages', '--json']);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (valued.has(arg)) {
      if (i + 1 >= rest.length) throw new Error(`${arg} needs a value`);
      flags.set(arg, rest[++i]);
    } else if (arg === '--gpu') flags.set(arg, 'true');
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else positional.push(arg);
  }
  return { mode, flags, positional };
}

function pageKeys(list: string[]): PageKey[] {
  if (list.length === 0 || list.includes('all')) return [...PAGE_KEYS];
  for (const key of list) if (!(PAGE_KEYS as readonly string[]).includes(key)) throw new Error(`unknown page ${key}: one of ${PAGE_KEYS.join(', ')} or all`);
  return list as PageKey[];
}

function origins(flags: Map<string, string>): Origins {
  const base = flags.get('--base');
  if (!base) throw new Error('--base <url> is required');
  return { base: base.replace(/\/$/, ''), os: flags.get('--os')?.replace(/\/$/, '') ?? null };
}

async function main(): Promise<number> {
  const { mode, flags, positional } = parse(process.argv.slice(2));
  if (mode === 'desk-compare') {
    if (positional.length !== 2) throw new Error('usage: check-phone.ts desk-compare <before> <after> [--json <file>]');
    return deskCompare(resolve(positional[0]), resolve(positional[1]), flags.get('--json') ?? null) ? 0 : 1;
  }
  const playwright = loadPlaywright();
  if (mode === 'phone') {
    const browser = flags.get('--browser') ?? 'chromium';
    if (browser !== 'chromium' && browser !== 'webkit') throw new Error('--browser is chromium or webkit');
    const results = await phone(playwright, {
      pages: pageKeys(positional),
      origins: origins(flags),
      browser,
      out: flags.has('--out') ? resolve(flags.get('--out')!) : null,
      viewports: flags.get('--viewport')?.split(',') ?? null,
      check: flags.get('--check') ?? null,
    });
    return results.some((r) => r.status === 'fail' || r.status === 'error') ? 1 : 0;
  }
  if (mode === 'desk') {
    const out = flags.get('--out');
    if (!out) throw new Error('desk needs --out <dir>');
    return (await desk(playwright, origins(flags), pageKeys(flags.get('--pages')?.split(',') ?? []), resolve(out), flags.has('--gpu'))) ? 0 : 1;
  }
  if (mode === 'queries') return (await queries(playwright, origins(flags))) ? 0 : 1;
  throw new Error('usage: check-phone.ts <phone|desk|desk-compare|queries> … (see the header comment)');
}

// Page modules import this file for its types and helpers; the command runs once.
const RUN = Symbol.for('crewtives.check-phone.main');
const shared = globalThis as unknown as Record<symbol, boolean>;
if (!shared[RUN] && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  shared[RUN] = true;
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(2);
    },
  );
}
