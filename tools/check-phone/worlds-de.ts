/**
 * Phone checks of 4D.OS world D "The golden stoop", world E "Whale fall" and the launcher (design
 * adapt-for-phones D10 and D11; specs cosmic-landings, 4d-pack and phone-ergonomics). A page module of
 * tools/check-phone.ts: run it through that tool, for example
 *
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/check-phone.ts phone d e launcher --base <dev> --os <dev-4d>
 *
 * The stage deck (D, E): every first-screen tool inside the pinned first screen, a free scene between the
 * title block and the deck, a tap on "1-bit" while the loop plays, drags that never scroll, and E's NOW
 * mirrors written by the page itself across resizes. The launcher: stills and a "Run the scene live"
 * button on phones, no pack request before it, and the live scene in the same boxes after it.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatBytes, packBytes } from '../../src/engine/shell/packStats.ts';
import type { Check, Page, PageCheck } from '../check-phone.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sceneJson = (pack: string) => JSON.parse(readFileSync(resolve(REPO, 'sites/4d-os/public/packs', pack, 'scene.json'), 'utf8'));

/** The launcher's pack weight, as the build inlines it (sites/4d-os/vite.config.ts). */
const LAUNCHER_WEIGHT = formatBytes(packBytes(sceneJson('cat-stairs')));
/** What E requests: the static and dynamic layers of whale-fall, without its source pages. */
const E_META = sceneJson('whale-fall');
const E_REQUESTED = formatBytes(E_META.files['static.bin'] + E_META.files['dynamic.bin']);
const E_WEIGHT_ON_DISK = formatBytes(packBytes(E_META));

const PORTRAIT = ['390x844', '390x664', '360x780', '430x932'];
const LANDSCAPE = ['844x390', '932x430'];
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** The box of the first visible element matching `selector` (an input hidden inside its label is measured by its label). */
function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((selector: string) => {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      let target: Element = el;
      const own = el.getBoundingClientRect();
      if ((own.width < 4 || own.height < 4 || getComputedStyle(el).opacity === '0') && (el as HTMLInputElement).labels?.[0]) target = (el as HTMLInputElement).labels![0];
      if (!target.checkVisibility({ checkVisibilityCSS: true })) continue;
      const r = target.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
    return null;
  }, selector);
}

const inside = (b: Box, w: number, h: number) => b.left >= -0.5 && b.top >= -0.5 && b.right <= w + 0.5 && b.bottom <= h + 0.5;
const fmt = (b: Box | null) => (b ? `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}` : 'none');

async function scrollInstant(page: Page, y: number): Promise<void> {
  await page.evaluate((top: number) => window.scrollTo({ left: 0, top, behavior: 'instant' }), y);
  await sleep(250);
}

const readText = (page: Page, selector: string): Promise<string> =>
  page.evaluate((selector: string) => document.querySelector(selector)?.textContent?.trim() ?? '', selector);

/** The free scene of the stage deck: between the title block and the deck (landscape: above the deck, beside the title). */
async function freeScene(page: Page, key: 'd' | 'e'): Promise<{ free: number; parts: Record<string, number> }> {
  return page.evaluate((key: string) => {
    const r = (s: string) => document.querySelector(s)?.getBoundingClientRect() ?? null;
    const landscape = matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    if (key === 'd') {
      const mast = r('.mast')!;
      const deck = r('.deck')!;
      return landscape ? { free: deck.top - 16, parts: { deckTop: deck.top } } : { free: deck.top - mast.bottom, parts: { mastBottom: mast.bottom, deckTop: deck.top } };
    }
    const slate = r('.slate')!;
    const dock = r('.stage-dock');
    const band = r('.recorder')!;
    if (!dock) return { free: 0, parts: { slateBottom: slate.bottom, noDock: 1 } };
    // Landscape, like D: the deck sits on the band at the right and the title takes the top left.
    return landscape
      ? { free: dock.top - 16, parts: { dockTop: dock.top, bandTop: band.top } }
      : { free: dock.top - slate.bottom, parts: { slateBottom: slate.bottom, dockTop: dock.top } };
  }, key);
}

/** The groups the first-screen contract names (cosmic-landings "Live first screen on the same engine"). */
const FIRST_SCREEN: Record<string, string[]> = {
  timecode: ['[data-now="timecode"], [data-deck-now="timecode"]'],
  state: ['[data-now="state"], [data-deck-now="state"]'],
  depth: ['input[name="depth"][value="1bit"]', 'input[name="depth"][value="16"]', 'input[name="depth"][value="millions"]'],
  mode: ['input[name="mode"][value="all"]', 'input[name="mode"][value="memory"]'],
};

/** Keyboard stops, by group, in the order design D10 sets. */
function focusGroup(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    if (el.matches('.skip')) return 'skip';
    if (el.matches('.playground-back')) return 'back';
    if (el.closest('.transport')) return 'transport';
    if (el.matches('.scrub')) return 'theta';
    if (el.matches('input[name="mode"]')) return 'time';
    if (el.matches('input[name="depth"]')) return 'colors';
    if (el.matches('input[data-layer]')) return 'layers';
    if (el.matches('[data-track]')) return 'timeline';
    if (el.matches('.key')) return 'keys';
    return `other ${el.tagName.toLowerCase()}${[...el.classList].slice(0, 2).map((c) => `.${c}`).join('')}`;
  });
}

/** Scroll position at `fraction` of the hero's gesture track. */
function trackAt(page: Page, fraction: number): Promise<number> {
  return page.evaluate((fraction: number) => {
    const track = document.querySelector<HTMLElement>('[data-hero]')!;
    const top = track.getBoundingClientRect().top + scrollY;
    return Math.round(top + fraction * Math.max(0, track.offsetHeight - innerHeight));
  }, fraction);
}

const checks: Check[] = [
  // ── D and E: the stage deck ────────────────────────────────────────────────────────────────
  {
    name: 'first-screen tools inside the viewport',
    pages: ['d', 'e'],
    webkit: true,
    async run(t) {
      const { width, height } = t.viewport;
      for (const [group, selectors] of Object.entries(FIRST_SCREEN)) {
        for (const selector of selectors) {
          const box = await boxOf(t.page, selector);
          t.note(`${group} ${selector}`, fmt(box));
          t.expect(!!box && inside(box, width, height), `${group}: ${selector} is not wholly inside the ${width}×${height} viewport at scroll 0 (${fmt(box)})`);
        }
      }
      await t.screenshot('first-screen');
    },
  },
  {
    name: 'free scene between the title and the deck',
    pages: ['d', 'e'],
    async run(t) {
      const { free, parts } = await freeScene(t.page, t.key as 'd' | 'e');
      t.note('free', Math.round(free));
      t.note('parts', parts);
      const name = `${t.viewport.width}x${t.viewport.height}`;
      const floor = LANDSCAPE.includes(name) ? 150 : name === '360x780' ? 220 : name === '390x664' ? 0 : 280;
      t.expect(free >= floor, `free scene ${Math.round(free)} px, under ${floor} px`);
    },
  },
  {
    name: 'tap 1-bit while the loop plays',
    pages: ['d', 'e'],
    async run(t) {
      if (!t.touch.native) return t.skip('needs native touch');
      const page = t.page;
      await scrollInstant(page, await trackAt(page, 0.3));
      await sleep(600);
      const before: { y: number; tc: string; state: string } = await page.evaluate(() => ({
        y: scrollY,
        tc: document.querySelector('[data-now="timecode"]')?.textContent ?? '',
        state: document.querySelector('[data-now="state"]')?.textContent ?? '',
      }));
      const target = await boxOf(page, 'input[name="depth"][value="1bit"]');
      if (!t.expect(!!target && inside(target, t.viewport.width, t.viewport.height), `1-bit is not on screen at 0.3 of the track (${fmt(target)})`)) return;
      await t.touch.tap(target!.left + target!.width / 2, target!.top + target!.height / 2);
      await sleep(700);
      const after: { y: number; tc: string; state: string; depth: string | undefined } = await page.evaluate(() => ({
        y: scrollY,
        tc: document.querySelector('[data-now="timecode"]')?.textContent ?? '',
        state: document.querySelector('[data-now="state"]')?.textContent ?? '',
        depth: document.documentElement.dataset.depth,
      }));
      t.note('before', before);
      t.note('after', after);
      await t.screenshot('1bit');
      t.expect(after.depth === '1bit', `data-depth is ${after.depth} after the tap on 1-bit`);
      t.expect(Math.abs(after.y - before.y) <= 1, `the page scrolled ${after.y - before.y} px on the tap`);
      t.expect(after.tc !== before.tc && /^FORWARD/.test(after.state), `the loop stopped (${before.tc} → ${after.tc}, ${after.state})`);
      // Back to 16 colors for the next checks.
      const sixteen = await boxOf(page, 'input[name="depth"][value="16"]');
      if (sixteen) await t.touch.tap(sixteen.left + sixteen.width / 2, sixteen.top + sixteen.height / 2);
      await sleep(300);
    },
  },
  {
    name: 'swipe over the scene scrolls',
    pages: ['d', 'e'],
    async run(t) {
      if (!t.touch.native) return t.skip('needs native touch');
      const { parts } = await freeScene(t.page, t.key as 'd' | 'e');
      const bottom = parts.deckTop ?? parts.dockTop ?? parts.bandTop ?? t.viewport.height - 160;
      const y = Math.min(t.viewport.height - 20, bottom - 12);
      const travel = Math.min(300, y - 16);
      const moved = await t.touch.swipe(t.viewport.width / 2, y, 0, -travel, 250);
      t.note('travel', travel);
      t.note('moved', moved);
      t.expect(moved >= Math.min(250, 0.8 * travel), `a ${travel} px swipe over the scene scrolled ${moved} px`);
    },
  },
  {
    name: 'drags change their value without scrolling',
    pages: ['d', 'e'],
    viewports: [...PORTRAIT, '844x390'],
    async run(t) {
      if (!t.touch.native) return t.skip('needs native touch');
      const page = t.page;
      const drags: { name: string; selector: string; read: string; dx: number; scroll: boolean }[] =
        t.key === 'd'
          ? [
              { name: 'timeline', selector: '.deck [data-track]', read: '[data-now="timecode"]', dx: 0.5, scroll: false },
              { name: 'θ scrub', selector: '.scrub', read: '.scrub [data-read="theta"]', dx: -60, scroll: true },
            ]
          : [{ name: 'transport', selector: '.transport [data-track]', read: '[data-now="timecode"]', dx: 0.5, scroll: true }];
      for (const drag of drags) {
        if (drag.scroll) {
          await page.evaluate((s: string) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' }), drag.selector);
          await sleep(600);
        } else await scrollInstant(page, 0);
        // Hold the time first, so the value changes only through the drag.
        await page.evaluate(() => {
          const play = document.querySelector<HTMLButtonElement>('[data-play][aria-pressed="true"]');
          play?.click();
        });
        await sleep(200);
        const box = await boxOf(page, drag.selector);
        if (!t.expect(!!box && inside(box, t.viewport.width, t.viewport.height), `${drag.name}: not on screen (${fmt(box)})`)) continue;
        const y0: number = await page.evaluate(() => scrollY);
        const v0 = await readText(page, drag.read);
        const x = drag.dx > 1 || drag.dx < 0 ? box!.left + box!.width / 2 : box!.left + box!.width * 0.2;
        const dx = drag.dx > 1 || drag.dx < 0 ? drag.dx : box!.width * drag.dx;
        await t.touch.drag(x, box!.top + box!.height / 2, dx, 0, 400);
        await sleep(300);
        const y1: number = await page.evaluate(() => scrollY);
        const v1 = await readText(page, drag.read);
        t.note(drag.name, `${v0} → ${v1}, scrollY ${y0} → ${y1}`);
        t.expect(v1 !== v0, `${drag.name}: the drag did not change the value (${v0})`);
        t.expect(Math.abs(y1 - y0) <= 1, `${drag.name}: the drag scrolled the page ${y1 - y0} px`);
      }
      await t.reload();
    },
  },
  {
    name: 'pinch keeps the page at scale 1',
    pages: ['d', 'e'],
    viewports: ['390x844'],
    async run(t) {
      if (!t.touch.native) return t.skip('needs native touch');
      const { parts } = await freeScene(t.page, t.key as 'd' | 'e');
      const y = ((parts.mastBottom ?? parts.slateBottom ?? 150) + (parts.deckTop ?? parts.dockTop ?? 500)) / 2;
      await t.touch.pinch(t.viewport.width / 2, y, 80, 220, 300);
      await sleep(300);
      const scale: number = await t.page.evaluate(() => visualViewport?.scale ?? 1);
      t.note('scale', scale);
      t.expect(Math.abs(scale - 1) < 0.01, `the pinch zoomed the page to ${scale}`);
    },
  },
  {
    name: 'keyboard order',
    pages: ['d', 'e'],
    viewports: ['390x844', '844x390'],
    async run(t) {
      const expected = t.key === 'd' ? ['skip', 'back', 'keys', 'timeline', 'time', 'colors', 'theta'] : ['skip', 'back', 'keys', 'time', 'colors', 'layers', 'transport'];
      await t.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const seen: string[] = [];
      for (let i = 0; i < 24 && seen.length < expected.length; i++) {
        await t.page.keyboard.press('Tab');
        await sleep(40);
        const group = await focusGroup(t.page);
        if (group && seen.at(-1) !== group) seen.push(group);
      }
      t.note('order', seen.join(' → '));
      t.expect(seen.slice(0, expected.length).join() === expected.join(), `focus order ${seen.join(' → ')}, expected ${expected.join(' → ')}`);
      await t.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await scrollInstant(t.page, 0);
    },
  },
  {
    name: 'reduced motion: no autoplay, the deck in place',
    pages: ['d', 'e'],
    viewports: ['390x844', '844x390'],
    async run(t) {
      const { page } = await t.open({ reducedMotion: 'reduce' });
      const deck = t.key === 'd' ? '.deck .monitor' : '.stage-dock fieldset';
      const tc0 = await readText(page, '[data-now="timecode"]');
      await sleep(2000);
      const tc1 = await readText(page, '[data-now="timecode"]');
      const present: number = await page.evaluate((s: string) => document.querySelectorAll(s).length, deck);
      t.note('timecode', `${tc0} → ${tc1}`);
      t.expect(tc0 === tc1, `the loop plays under reduced motion (${tc0} → ${tc1})`);
      t.expect(present > 0, `no ${deck} under reduced motion`);
    },
  },
  {
    name: 'WebKit layout of the deck rows',
    pages: ['d', 'e'],
    viewports: ['390x664', '390x844'],
    webkit: true,
    async run(t) {
      const rows: { name: string; height: number }[] = await t.page.evaluate((key: string) => {
        const out: { name: string; height: number }[] = [];
        const add = (name: string, el: Element | null) => el && out.push({ name, height: Math.round(el.getBoundingClientRect().height * 10) / 10 });
        if (key === 'd') {
          add('.deck .monitor', document.querySelector('.deck .monitor'));
          document.querySelectorAll('.deck .seg').forEach((el, i) => add(`.deck .seg[${i}]`, el));
          add('.deck', document.querySelector('.deck'));
        } else {
          add('.stage-dock .stage-keys', document.querySelector('.stage-dock .stage-keys'));
          document.querySelectorAll('.stage-dock .seg').forEach((el, i) => add(`.stage-dock .seg[${i}]`, el));
          add('.stage-dock', document.querySelector('.stage-dock'));
        }
        return out;
      }, t.key);
      for (const row of rows) t.note(row.name, row.height);
      const segs = rows.filter((r) => /\.seg\[/.test(r.name));
      t.expect(segs.length === 2, `${segs.length} Time and Colors rows in the ${t.key === 'd' ? 'deck' : 'stage dock'}, expected 2`);
      if (t.key === 'd') {
        const monitor = rows.find((r) => r.name === '.deck .monitor');
        t.expect(!!monitor && monitor.height <= 96, `D's .deck .monitor is ${monitor?.height} px tall, over 96`);
      }
      for (const row of rows.filter((r) => /\.seg\[/.test(r.name) || r.name.endsWith('.stage-keys'))) {
        t.expect(row.height >= 43.5 && row.height <= 46, `${row.name} is ${row.height} px tall, not a 44 px row`);
      }
      await t.screenshot('deck');
    },
  },

  // ── E only ─────────────────────────────────────────────────────────────────────────────────
  {
    name: "E's NOW mirrors across resizes",
    pages: ['e'],
    viewports: ['390x844'],
    async run(t) {
      const { page } = await t.open({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      const state = () =>
        page.evaluate(() => ({
          dock: document.querySelectorAll('.stage-dock').length,
          mirrors: [...document.querySelectorAll<HTMLElement>('[data-deck-now]')].map((m) => m.textContent ?? ''),
          weight: document.querySelectorAll('.boot__weight').length,
          real: document.querySelector('[data-now="timecode"]')?.textContent ?? '',
          realState: document.querySelector('[data-now="state"]')?.textContent ?? '',
          keysHome: document.querySelector('.stage-keys')?.parentElement?.classList.contains('obs__stage') ?? false,
          fieldsHome: [...document.querySelectorAll('fieldset.seg')].every((f) => f.parentElement?.classList.contains('monitor')),
        }));
      /** The mirrors write what the real outputs show, and move with them. */
      const advancing = async (label: string) => {
        const a = await state();
        await sleep(700);
        const b = await state();
        t.note(label, { a: a.mirrors, b: b.mirrors, real: b.real });
        t.expect(a.dock === 1 && b.mirrors.length === 2, `${label}: ${b.dock} decks and ${b.mirrors.length} mirrors`);
        t.expect(b.mirrors[0] !== a.mirrors[0], `${label}: the mirror's timecode does not advance (${a.mirrors[0]})`);
        const real = await page.evaluate(() => [
          document.querySelector('[data-now="timecode"]')?.textContent,
          document.querySelector('[data-deck-now="timecode"]')?.textContent,
          document.querySelector('[data-now="state"]')?.textContent,
          document.querySelector('[data-deck-now="state"]')?.textContent,
        ]);
        t.expect(real[0] === real[1] && real[2] === real[3], `${label}: mirrors ${real[1]} / ${real[3]} against outputs ${real[0]} / ${real[2]}`);
      };
      const desk = await state();
      t.expect(desk.dock === 0 && desk.mirrors.length === 0 && desk.weight === 0, `at 1440×900: ${desk.dock} decks, ${desk.mirrors.length} mirrors, ${desk.weight} boot weights`);
      await page.setViewportSize({ width: 390, height: 844 });
      await sleep(500);
      await advancing('390×844 after 1440×900');
      await page.setViewportSize({ width: 1440, height: 900 });
      await sleep(500);
      const back = await state();
      t.expect(back.dock === 0 && back.mirrors.length === 0 && back.keysHome && back.fieldsHome, `back at 1440×900: ${back.dock} decks, ${back.mirrors.length} mirrors, keys home ${back.keysHome}, fieldsets home ${back.fieldsHome}`);
      await page.setViewportSize({ width: 390, height: 844 });
      await sleep(500);
      await advancing('390×844 again');
    },
  },
  {
    name: "E's title does not navigate; its back tab is 44 px",
    pages: ['e'],
    viewports: [...PORTRAIT, ...LANDSCAPE],
    async run(t) {
      const title = await boxOf(t.page, '.slate__title');
      const back = await boxOf(t.page, '.playground-back');
      t.note('back', fmt(back));
      t.expect(!!back && back.height >= 44, `the back tab is ${back?.height} px tall`);
      t.expect(!!title && !!back && back.bottom <= title.top + 0.5, `the back tab (${fmt(back)}) reaches over the title (${fmt(title)})`);
      if (!title || !t.touch.native) return;
      const url = t.page.url();
      await t.touch.tap(title.left + Math.min(40, title.width / 4), title.top + title.height / 2);
      await sleep(800);
      t.expect(t.page.url() === url, `a tap on "Whale fall." went to ${t.page.url()}`);
      if (t.page.url() !== url) await t.page.goBack();
    },
  },
  {
    name: 'E requests no source frames; the phone boot shows the weight',
    pages: ['e'],
    viewports: ['390x844'],
    async run(t) {
      const page = t.page;
      const requested: string[] = [];
      const listen = (request: { url(): string }) => requested.push(request.url());
      page.on('request', listen);
      // The dynamic layer waits, so the boot can be read part way.
      const hold = async (route: { continue(): Promise<void> }) => {
        await sleep(2500);
        await route.continue();
      };
      await page.route('**/whale-fall/dynamic.bin', hold);
      const seen = new Set<string>();
      try {
        await page.goto(t.url(), { waitUntil: 'commit' });
        const start = Date.now();
        while (Date.now() - start < 120_000) {
          const text: string = await page.evaluate(() => document.querySelector('.boot__weight')?.textContent?.trim() ?? '');
          if (text) seen.add(text);
          const done: boolean = await page.evaluate(() => document.querySelector('[data-boot-pct]')?.textContent === '100');
          if (done) break;
          await sleep(100);
        }
      } finally {
        await page.unroute('**/whale-fall/dynamic.bin', hold);
        page.off('request', listen);
      }
      await sleep(1500);
      const sources = requested.filter((u) => /\/source\/page-/.test(u));
      const packs = requested.filter((u) => /\/packs\/whale-fall\//.test(u)).map((u) => u.replace(/^.*\/packs\//, ''));
      t.note('pack requests', packs);
      t.note('boot weight', [...seen]);
      t.expect(sources.length === 0, `E requested ${sources.length} source pages`);
      const expected = new RegExp(`^\\d+(\\.\\d)? (B|KiB|MiB) / ${E_REQUESTED.replace('.', '\\.')}$`);
      const shown = [...seen];
      t.expect(shown.length > 0 && shown.every((s) => expected.test(s)), `the boot weight read ${JSON.stringify(shown)}, expected "n / ${E_REQUESTED}"`);
      t.expect(shown.some((s) => !s.startsWith(E_REQUESTED)), 'the boot weight was never seen part way');
      const disk: string = await page.evaluate(() => `${document.querySelector('[data-pack="bytes"]')?.textContent ?? ''} ${document.querySelector('[data-pack-unit="bytes"]')?.textContent ?? ''}`.trim());
      t.note('weight on disk', disk);
      t.expect(disk === E_WEIGHT_ON_DISK, `"Weight on disk" reads ${disk}, expected ${E_WEIGHT_ON_DISK}`);
      await t.reload();
    },
  },

  // ── The launcher ───────────────────────────────────────────────────────────────────────────
  {
    name: 'launcher: stills and the button, no pack before it',
    pages: ['launcher'],
    webkit: true,
    async run(t) {
      const page = t.page;
      const requested: string[] = [];
      const listen = (request: { url(): string }) => requested.push(request.url());
      page.on('request', listen);
      try {
        await page.goto(t.url(), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready.then(() => true));
        await sleep(2500);
      } finally {
        page.off('request', listen);
      }
      const packs = requested.filter((u) => /\/packs\//.test(u));
      t.expect(packs.length === 0, `requests under /packs/ before the button: ${packs.slice(0, 3).join(', ')}`);
      const found: {
        stills: { alt: string | null; src: string; loaded: boolean; box: Box; view: Box | null; label: string | null }[];
        tags: string[];
        credit: boolean;
        button: { text: string; box: Box } | null;
        statusLine: number;
      } = await page.evaluate(() => {
        const box = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        const stills = [...document.querySelectorAll<HTMLImageElement>('.worlds:not(.worlds--more) .world__still')].map((img) => ({
          alt: img.getAttribute('alt'),
          src: img.currentSrc || img.src,
          loaded: img.complete && img.naturalWidth > 0,
          box: box(img)!,
          view: box(img.closest('.world__view')),
          label: img.closest('.world__view')?.getAttribute('aria-label') ?? null,
        }));
        const button = document.querySelector('.stage__run');
        const credit = document.querySelector<HTMLElement>('.status__credit a[href*="poly.pizza"]');
        return {
          stills,
          tags: [...document.querySelectorAll('.worlds:not(.worlds--more) .world__title .world__tag')].map((tag) => tag.textContent ?? ''),
          credit: !!credit && credit.checkVisibility({ checkVisibilityCSS: true }),
          button: button ? { text: (button.textContent ?? '').replace(/\s+/g, ' ').trim(), box: box(button)! } : null,
          statusLine: document.querySelectorAll('.status__line').length,
        };
      });
      t.note('stills', found.stills.map((s) => `${s.src.replace(/^.*\//, '')} alt=${JSON.stringify(s.alt)} loaded=${s.loaded}`));
      t.note('button', found.button && `${found.button.text} ${fmt(found.button.box)}`);
      t.expect(found.stills.length === 3, `${found.stills.length} stills in windows A, B and C`);
      for (const still of found.stills) {
        t.expect(still.alt === '', `the still ${still.src} has alt ${JSON.stringify(still.alt)}`);
        t.expect(still.loaded, `the still ${still.src} did not load`);
        t.expect(!!still.label && /preview/.test(still.label), `the still ${still.src} is not inside a described view (${still.label})`);
      }
      t.expect(found.tags.length === 3 && found.tags.every((tag) => tag.trim() === 'still'), `the "still" tags read ${JSON.stringify(found.tags)}`);
      t.expect(found.credit, 'the Cat model credit is not visible');
      t.expect(found.statusLine === 0, 'the "Loading scene" line is on the page before anything loads');
      const expectedText = `Run the scene live · ${LAUNCHER_WEIGHT}`;
      t.expect(found.button?.text === expectedText, `the button reads ${JSON.stringify(found.button?.text)}, expected ${JSON.stringify(expectedText)}`);
      t.expect(!!found.button && found.button.box.height >= 44, `the button is ${found.button?.box.height} px tall`);
      const name = `${t.viewport.width}x${t.viewport.height}`;
      if (['390x844', '390x664'].includes(name)) {
        const a = found.stills[0];
        t.expect(!!found.button && inside(found.button.box, t.viewport.width, t.viewport.height), `the button is not on the first screen (${fmt(found.button?.box ?? null)})`);
        t.expect(!!a && inside(a.box, t.viewport.width, t.viewport.height), `window A's still is not wholly on the first screen (${fmt(a?.box ?? null)})`);
      }
      await t.screenshot('stills');
    },
  },
  {
    name: 'launcher: the button loads the scene in place',
    pages: ['launcher'],
    viewports: ['390x844', '390x664', '844x390'],
    webkit: true,
    async run(t) {
      const page = t.page;
      const byKeyboard = t.viewport.width === 390 && t.viewport.height === 844;
      const views = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.worlds:not(.worlds--more) .world__view')].map((el) => {
            const r = el.getBoundingClientRect();
            return `${Math.round(r.left + scrollX)},${Math.round(r.top + scrollY)} ${Math.round(r.width)}×${Math.round(r.height)}`;
          }),
        );
      const before = await views();
      const button = await boxOf(page, '.stage__run');
      if (!t.expect(!!button, 'no button')) return;
      const requested: string[] = [];
      const listen = (request: { url(): string }) => requested.push(request.url());
      page.on('request', listen);
      const labels = new Set<string>();
      try {
        if (byKeyboard) {
          await page.focus('.stage__run');
          await page.keyboard.press('Enter');
        } else {
          await page.evaluate(() => document.querySelector('.stage__run')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await sleep(300);
          const b = await boxOf(page, '.stage__run');
          await t.touch.tap(b!.left + b!.width / 2, b!.top + b!.height / 2);
        }
        const start = Date.now();
        while (Date.now() - start < 120_000) {
          const now: { label: string; live: string; focused: boolean } = await page.evaluate(() => ({
            label: (document.querySelector('.stage__run')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
            live: document.querySelector('.stage__status')?.textContent ?? '',
            focused: document.activeElement === document.querySelector('.stage__run'),
          }));
          labels.add(now.label);
          if (byKeyboard && !now.focused) t.expect(false, `focus left the button while "${now.label}"`);
          if (/Scene live/.test(now.live)) break;
          await sleep(100);
        }
      } finally {
        page.off('request', listen);
      }
      await sleep(1500);
      const after = await views();
      const state: { tags: number; stills: number; live: string; role: string | null; inStatus: boolean; disabled: string | null; focused: boolean } = await page.evaluate(() => {
        const status = document.querySelector('.stage__status');
        return {
          tags: document.querySelectorAll('.worlds:not(.worlds--more) .world__tag').length,
          stills: document.querySelectorAll('.worlds:not(.worlds--more) .world__still').length,
          live: status?.textContent ?? '',
          role: status?.getAttribute('role') ?? null,
          inStatus: !!status?.closest('.status'),
          disabled: document.querySelector('.stage__run')?.getAttribute('aria-disabled') ?? null,
          focused: document.activeElement === document.querySelector('.stage__run'),
        };
      });
      t.note('labels', [...labels].slice(0, 6));
      t.note('views', { before, after });
      t.expect(requested.some((u) => /\/packs\/cat-stairs\/dynamic\.bin/.test(u)), 'the pack was not requested after the button');
      t.expect([...labels].some((l) => /^Loading \d+% · /.test(l)), `the button never showed the progress (${[...labels].join(' | ')})`);
      t.expect(state.live === 'Scene live' && state.role === 'status' && !state.inStatus, `the live message: "${state.live}", role ${state.role}, inside .status ${state.inStatus}`);
      t.expect(state.tags === 0 && state.stills === 0, `${state.tags} still tags and ${state.stills} stills remain after going live`);
      t.expect(before.join() === after.join(), `the views moved: ${before.join(' | ')} → ${after.join(' | ')}`);
      t.expect(state.disabled === 'true', `the button's aria-disabled is ${state.disabled} once live`);
      if (byKeyboard) t.expect(state.focused, 'focus is not on the button once live');
      await t.screenshot('live');
      await t.reload();
    },
  },
  {
    name: 'launcher: leaving the narrow layout before asking loads as the desktop does',
    pages: ['launcher'],
    viewports: ['390x844'],
    async run(t) {
      const page = t.page;
      const requested: string[] = [];
      const listen = (request: { url(): string }) => requested.push(request.url());
      page.on('request', listen);
      const phoneNodes = () =>
        page.evaluate(() => ({
          button: document.querySelectorAll('.stage__run').length,
          status: document.querySelectorAll('.stage__status').length,
          tags: document.querySelectorAll('.world__tag').length,
          stills: document.querySelectorAll('.worlds:not(.worlds--more) .world__still').length,
          line: !!document.querySelector('.status > .status__line'),
        }));
      try {
        await page.goto(t.url(), { waitUntil: 'load' });
        await sleep(1500);
        const asking = await phoneNodes();
        t.expect(asking.button === 1 && asking.stills === 3 && !asking.line, `before the resize: ${JSON.stringify(asking)}`);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForFunction(() => document.querySelector('[data-boot-pct]')?.textContent === '100', null, { timeout: 120_000 });
        await sleep(500);
        const desk = await phoneNodes();
        t.note('after 1440×900', desk);
        t.expect(desk.button + desk.status + desk.tags + desk.stills === 0 && desk.line, `at 1440×900 the phone nodes remain or the progress line is missing: ${JSON.stringify(desk)}`);
        t.expect(requested.some((u) => /\/packs\/cat-stairs\/dynamic\.bin/.test(u)), 'leaving the narrow layout did not load the pack');
        // Back to the phone after the load: the visitor never asked, so no button comes back.
        await page.setViewportSize({ width: 390, height: 844 });
        await sleep(500);
        const again = await phoneNodes();
        t.note('back at 390×844', again);
        t.expect(again.button + again.tags + again.stills === 0, `back at 390×844 after the load: ${JSON.stringify(again)}`);
      } finally {
        page.off('request', listen);
      }
      await t.reload();
    },
  },
  {
    name: 'launcher on a desktop loads as before',
    pages: ['launcher'],
    viewports: ['390x844'],
    async run(t) {
      const browser = t.page.context().browser();
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        const requested: string[] = [];
        page.on('request', (request: { url(): string }) => requested.push(request.url()));
        await page.goto(t.url(), { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('[data-boot-pct]')?.textContent === '100', null, { timeout: 120_000 });
        const found: { button: number; tags: number; stills: number; status: number } = await page.evaluate(() => ({
          button: document.querySelectorAll('.stage__run').length,
          tags: document.querySelectorAll('.world__tag').length,
          stills: document.querySelectorAll('.worlds:not(.worlds--more) .world__still').length,
          status: document.querySelectorAll('.stage__status').length,
        }));
        const stills = requested.filter((u) => /\/launcher\/(a-vitrine|b-plate|c-leader)\.webp/.test(u));
        t.note('desktop', found);
        t.expect(stills.length === 0, `the desktop requested the phone stills: ${stills.join(', ')}`);
        t.expect(requested.some((u) => /\/packs\/cat-stairs\/dynamic\.bin/.test(u)), 'the desktop did not load the pack');
        t.expect(found.button + found.tags + found.stills + found.status === 0, `phone nodes on the desktop: ${JSON.stringify(found)}`);
      } finally {
        await context.close();
      }
    },
  },
];

const worldsDe: PageCheck = {
  pages: ['launcher', 'd', 'e'],
  setup: {
    d: {
      panels: ['.deck'],
      contrast: [
        { selector: '.deck .seg legend', kind: 'text', webkit: true },
        { selector: '.deck .seg label', kind: 'text' },
        { selector: '.deck__hint', kind: 'text' },
        { selector: '.glance__read dt', kind: 'text' },
        { selector: '.deck .key', kind: 'glyph' },
      ],
      // Scale annotations and the exponents of the equations (design D1, "Text").
      smallText: ['.timeline__ruler', '.eq sub', '.eq sup', '.law sub', '.law sup', '.station__figure--eq sub', '.station__figure--eq sup', '.gun'],
    },
    e: {
      panels: ['.stage-dock'],
      contrast: [
        { selector: '.stage-dock .seg legend', kind: 'text', webkit: true },
        { selector: '.stage-dock .seg label span', kind: 'text' },
        { selector: '.stage-dock .seg label:has(input:checked) span', kind: 'text' },
        { selector: '[data-deck-now="timecode"]', kind: 'text' },
        { selector: '[data-deck-now="state"]', kind: 'text' },
        { selector: '.stage-dock .hint', kind: 'text' },
        { selector: '.playground-back', kind: 'text' },
      ],
      // Units inside the large clock numerals and the subscript of r/rₛ (design D1, "Text").
      smallText: ['.clock__unit', '.readouts dt sub'],
    },
    launcher: {
      contrast: [
        { selector: '.stage__run', kind: 'text', webkit: true },
        { selector: '.world__tag', kind: 'text' },
      ],
    },
  },
  checks,
  // World D's touch targets: the narrow query joined to a coarse pointer (design D10).
  queries: ['(max-width: 760px) and (pointer: coarse), (orientation: landscape) and (max-height: 500px) and (pointer: coarse)'],
};

export default worldsDe;
