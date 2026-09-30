/**
 * Phone checks of Game Center Yonjigen (`/landings/game-center/`): design adapt-for-phones D7 and the
 * spec landing-game-center ("Phone first screen", "Phone landscape", "Phone machines keep their screen
 * in view", "Floor directory and elevator"). A page module of tools/check-phone.ts: its default export
 * is the PageCheck the core runs after its generic checks, in phone contexts only.
 *
 * Every machine loads when its floor comes near, so the module's `ready` walks the page once after each
 * load. Heights that the core's matrix lacks (360×640, 360×560 and 320×568 for the 1F deck, 360×640 and
 * 360×560 for the 4F stage) are reached by resizing inside the 390×844 run, so the generic checks do
 * not run there too.
 */

import { decodePng } from '../../src/site/og/png.ts';
import type { Check, CheckContext, Page, PageCheck, Viewport } from '../check-phone.ts';

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

const PORTRAIT = ['390x844', '390x664', '360x780', '430x932'];
const LANDSCAPE = ['844x390', '932x430', '667x375'];
const vp = (width: number, height: number): Viewport => ({ width, height });
const name = (v: Viewport) => `${v.width}x${v.height}`;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** The 1F controls: the stick's four arrows, A, B, C, START and the phone utility row. */
const DECK = [
  '.stick__dir--up',
  '.stick__dir--down',
  '.stick__dir--left',
  '.stick__dir--right',
  '.arcade--a',
  '.arcade--b',
  '.arcade--c',
  '[data-start]',
  '.deck [data-lift]',
  '.deck__worlds',
  '.sound--deck',
];

/** The 4F controls the pinned glass must stay whole for. */
const PARLOUR_CONTROLS: [string, string][] = [
  ['LAUNCH', '[data-launch]'],
  ['the shutter', '[data-group="shutter"]'],
  ['the small row', '.panel__row--small'],
  ['the jog', '[data-jog]'],
  ['NOW', '[data-jog-now]'],
];

/** Viewport boxes of the first visible element of each selector (null when none is rendered). */
async function boxes(page: Page, selectors: readonly string[]): Promise<Record<string, Box | null>> {
  return page.evaluate((selectors: string[]) => {
    const out: Record<string, Box | null> = {};
    for (const s of selectors) {
      const el = [...document.querySelectorAll(s)].find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && e.checkVisibility({ checkVisibilityCSS: true });
      });
      if (!el) {
        out[s] = null;
        continue;
      }
      const r = el.getBoundingClientRect();
      out[s] = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
    return out;
  }, [...selectors]);
}

async function box(page: Page, selector: string): Promise<Box | null> {
  return (await boxes(page, [selector]))[selector];
}

/** Document box: the viewport box moved by the scroll offset (for elements that are not sticky). */
async function docBox(page: Page, selector: string): Promise<Box | null> {
  const b = await box(page, selector);
  if (!b) return null;
  const y: number = await page.evaluate(() => scrollY);
  return { ...b, top: b.top + y, bottom: b.bottom + y };
}

async function scrollTo(page: Page, y: number, wait = 350): Promise<number> {
  const landed: number = await page.evaluate((top: number) => {
    window.scrollTo({ left: 0, top: Math.max(0, top), behavior: 'instant' });
    return scrollY;
  }, y);
  await sleep(wait);
  return landed;
}

/** Waits until scrollY stops changing (a smooth ride to a floor), at most `ms`. */
async function settleScroll(page: Page, ms = 4000): Promise<number> {
  let last = -1;
  let still = 0;
  const start = Date.now();
  while (Date.now() - start < ms) {
    const y: number = await page.evaluate(() => Math.round(scrollY));
    still = y === last ? still + 1 : 0;
    if (still >= 4) return y;
    last = y;
    await sleep(80);
  }
  return last;
}

const inside = (b: Box, w: number, h: number, insets = { l: 0, r: 0, b: 0 }) =>
  b.left >= insets.l - 0.5 && b.top >= -0.5 && b.right <= w - insets.r + 0.5 && b.bottom <= h - insets.b + 0.5;

const overlap = (a: Box, b: Box) => {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0.5 && h > 0.5 ? [Math.round(w), Math.round(h)] : null;
};

const size = (b: Box) => `${Math.round(b.width)}×${Math.round(b.height)}`;

/**
 * The 1F deck at the current viewport: every rendered control at least 44 × 44, inside the viewport
 * (and its insets), no two intersecting; the CRT inside the viewport in 3:4 (portrait) or 4:3
 * (landscape); 1UP and HI apart.
 */
async function deckFindings(t: CheckContext, insets = { l: 0, r: 0, b: 0 }): Promise<{ messages: string[]; figures: Record<string, unknown> }> {
  await scrollTo(t.page, 0, 250);
  const where: { w: number; h: number } = await t.page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const found = await boxes(t.page, [...DECK, '#rain-run', '.hud__1up', '.hud__hi']);
  const messages: string[] = [];
  const figures: Record<string, unknown> = {};
  const rendered = DECK.filter((s) => found[s]);
  for (const s of rendered) {
    const b = found[s]!;
    figures[s] = `${size(b)} at ${Math.round(b.left)},${Math.round(b.top)}`;
    if (b.width < 43.5 || b.height < 43.5) messages.push(`${s} is ${size(b)}, under 44 × 44`);
    if (!inside(b, where.w, where.h, insets)) messages.push(`${s} (${Math.round(b.left)}–${Math.round(b.right)} × ${Math.round(b.top)}–${Math.round(b.bottom)}) is not inside the viewport${insets.l || insets.b ? ' and its safe areas' : ''}`);
  }
  for (let i = 0; i < rendered.length; i++) {
    for (let j = i + 1; j < rendered.length; j++) {
      const o = overlap(found[rendered[i]]!, found[rendered[j]]!);
      if (o) messages.push(`${rendered[i]} and ${rendered[j]} intersect by ${o[0]}×${o[1]} px`);
    }
  }
  const crt = found['#rain-run'];
  if (!crt) messages.push('#rain-run is not rendered');
  else {
    const ratio = crt.width / crt.height;
    const landscape = where.w > where.h;
    const want = landscape ? 4 / 3 : 3 / 4;
    figures.crt = `${size(crt)} (${ratio.toFixed(3)})`;
    if (Math.abs(ratio - want) > (landscape ? 0.015 : 0.01)) messages.push(`#rain-run is ${size(crt)}, a ratio of ${ratio.toFixed(3)} instead of ${want.toFixed(3)}`);
    if (!inside(crt, where.w, where.h, insets)) messages.push(`#rain-run (${Math.round(crt.left)}–${Math.round(crt.right)} × ${Math.round(crt.top)}–${Math.round(crt.bottom)}) is not inside the viewport${insets.l || insets.b ? ' and its safe areas' : ''}`);
  }
  const up = found['.hud__1up'];
  const hi = found['.hud__hi'];
  if (up && hi && up.right > hi.left - 1) messages.push(`the HUD's 1UP (ends at ${Math.round(up.right)}) runs into HI (starts at ${Math.round(hi.left)})`);
  return { messages, figures };
}

/** The Rain Run state (`attract`, `play`, `timeview`, `gameover`). */
const rrState = (page: Page): Promise<string | null> => page.evaluate(() => document.querySelector('#rain-run')?.getAttribute('data-state') ?? null);

async function waitFor(test: () => Promise<boolean>, ms: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await test()) return true;
    await sleep(100);
  }
  return test();
}

/** Taps 1P START on a fresh machine and waits for play; false when the machine does not run (no WebGL2). */
async function startGame(t: CheckContext): Promise<boolean> {
  if ((await rrState(t.page)) !== 'attract') await t.reload();
  await scrollTo(t.page, 0, 200);
  const start = await box(t.page, '[data-start]');
  if (!start) return false;
  await t.touch.tap(start.left + start.width / 2, start.top + start.height / 2);
  return waitFor(async () => (await rrState(t.page)) === 'play', 4000);
}

async function tapCenter(t: CheckContext, selector: string): Promise<boolean> {
  const b = await box(t.page, selector);
  if (!b) return false;
  await t.touch.tap(b.left + b.width / 2, b.top + b.height / 2);
  return true;
}

/** Scrolls so the bottom of `selector` sits `margin` px above the viewport's bottom edge. */
async function bringUp(page: Page, selector: string, margin = 16): Promise<void> {
  const b = await docBox(page, selector);
  if (!b) return;
  const h: number = await page.evaluate(() => innerHeight);
  await scrollTo(page, b.bottom + margin - h);
}

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const dist = (a: Rgb, b: Rgb) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/** The viewport as pixels, with a reader in CSS px. */
async function pixels(page: Page) {
  const dpr: number = await page.evaluate(() => devicePixelRatio);
  const image = decodePng(new Uint8Array(await page.screenshot({ animations: 'disabled', caret: 'hide' })));
  const at = (x: number, y: number): Rgb => {
    const px = Math.min(image.width - 1, Math.max(0, Math.round(x * dpr)));
    const py = Math.min(image.height - 1, Math.max(0, Math.round(y * dpr)));
    const i = (py * image.width + px) * 4;
    return [image.data[i], image.data[i + 1], image.data[i + 2]];
  };
  /** Colors of every device pixel inside a CSS box. */
  const region = (b: Box): Rgb[] => {
    const out: Rgb[] = [];
    for (let y = Math.ceil(b.top * dpr); y < Math.floor(b.bottom * dpr); y++) {
      for (let x = Math.ceil(b.left * dpr); x < Math.floor(b.right * dpr); x++) {
        if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
        const i = (y * image.width + x) * 4;
        out.push([image.data[i], image.data[i + 1], image.data[i + 2]]);
      }
    }
    return out;
  };
  return { at, region };
}

// ── The checks ─────────────────────────────────────────────────────────────────────────────────

const deck: Check = {
  name: '1F deck at phone heights',
  viewports: PORTRAIT,
  webkit: true,
  async run(t) {
    const sizes = t.browser === 'chromium' && name(t.viewport) === '390x844' ? [vp(390, 844), vp(390, 664), vp(360, 640), vp(360, 560), vp(320, 568)] : [t.viewport];
    for (const v of sizes) {
      if (name(v) !== name(t.viewport)) {
        await t.resize(v);
        await sleep(600);
      }
      const { messages, figures } = await deckFindings(t);
      t.note(name(v), figures);
      for (const m of messages) t.expect(false, `${name(v)}: ${m}`);
    }
  },
};

const holdTrio: Check = {
  name: 'held steer survives finger drift',
  viewports: ['390x844', '390x664'],
  async run(t) {
    const styles: Record<string, { touchAction: string; userSelect: string }> = await t.page.evaluate(() =>
      Object.fromEntries(
        ['.stick__dir--up', '.arcade--a', '[data-start]'].map((s) => {
          const cs = getComputedStyle(document.querySelector(s)!);
          return [s, { touchAction: cs.touchAction, userSelect: cs.userSelect || cs.webkitUserSelect }];
        }),
      ),
    );
    for (const [s, st] of Object.entries(styles)) {
      t.expect(st.touchAction === 'none', `${s} has touch-action ${st.touchAction}, not none`);
      t.expect(st.userSelect === 'none', `${s} has user-select ${st.userSelect}, not none`);
    }
    if (!t.touch.native) return t.skip('no native touch in WebKit');
    if (!(await startGame(t))) return t.skip('Rain Run did not start (no WebGL2?)');
    for (const drift of [18, 20]) {
      const up = await box(t.page, '.stick__dir--up');
      if (!up) return void t.expect(false, 'no Steer up button');
      const before: number = await t.page.evaluate(() => scrollY);
      const holding = t.touch.hold(up.left + up.width / 2, up.top + up.height / 2, 1400, { x: 3, y: drift });
      await sleep(1000);
      const mid: { held: boolean; y: number } = await t.page.evaluate(() => ({ held: document.querySelector('.stick__dir--up')!.classList.contains('is-down'), y: scrollY }));
      await holding;
      await sleep(150);
      const released: boolean = await t.page.evaluate(() => !document.querySelector('.stick__dir--up')!.classList.contains('is-down'));
      t.note(`drift ${drift}`, mid);
      t.expect(mid.held, `a hold on Steer up with ${drift} px of drift was released before the finger lifted`);
      t.expect(mid.y === before, `a hold on Steer up with ${drift} px of drift scrolled the page by ${Math.round(mid.y - before)} px`);
      t.expect(released, `Steer up stayed held after the finger lifted (${drift} px of drift)`);
    }
  },
};

const timeView: Check = {
  name: 'TIME VIEW scrub inside the CRT',
  viewports: [...PORTRAIT, '844x390', '667x375'],
  async run(t) {
    if (!t.touch.native) return t.skip('no native touch in WebKit');
    if (!(await startGame(t))) return t.skip('Rain Run did not start (no WebGL2?)');
    await sleep(1800);
    await tapCenter(t, '.arcade--c');
    const shown = await waitFor(
      () => t.page.evaluate(() => document.querySelector('#rain-run')?.getAttribute('data-state') === 'timeview' && !(document.querySelector('[data-timestrip]') as HTMLElement).hidden),
      5000,
    );
    if (!t.expect(shown, 'C did not open TIME VIEW')) return;
    await sleep(1500);
    const found = await boxes(t.page, ['#rr-scrub', '#rain-run']);
    const scrub = found['#rr-scrub'];
    const crt = found['#rain-run'];
    if (!t.expect(!!scrub && !!crt, 'the time strip or the CRT is not rendered') || !scrub || !crt) return;
    t.note('scrub', size(scrub));
    t.expect(scrub.height >= 43.5, `the time strip's touch box is ${Math.round(scrub.height)} px tall, under 44`);
    t.expect(scrub.top >= crt.top - 0.5 && scrub.bottom <= crt.bottom + 0.5 && scrub.left >= crt.left - 0.5 && scrub.right <= crt.right + 0.5, `the time strip's touch box (${Math.round(scrub.top)}–${Math.round(scrub.bottom)}) is not inside the CRT (${Math.round(crt.top)}–${Math.round(crt.bottom)})`);
    const before: { value: string; max: string; y: number } = await t.page.evaluate(() => {
      const input = document.querySelector('#rr-scrub') as HTMLInputElement;
      return { value: input.value, max: input.max, y: scrollY };
    });
    await t.touch.drag(scrub.left + scrub.width * 0.85, scrub.top + scrub.height / 2, -scrub.width * 0.6, 0, 600);
    await sleep(300);
    const after: { value: string; y: number } = await t.page.evaluate(() => ({ value: (document.querySelector('#rr-scrub') as HTMLInputElement).value, y: scrollY }));
    t.note('value', `${before.value} → ${after.value} of ${before.max}`);
    t.expect(after.value !== before.value, `a touch drag along the time strip left its value at ${after.value}`);
    t.expect(after.y === before.y, `a touch drag along the time strip scrolled the page by ${Math.round(after.y - before.y)} px`);
  },
};

const crane: Check = {
  name: '3F glass, buttons and ticket rack',
  viewports: ['390x844', '390x664', '360x780', ...LANDSCAPE],
  async run(t) {
    const glass = await docBox(t.page, '.crane__glass');
    const b1 = await docBox(t.page, '[data-crane-btn="1"]');
    const b2 = await docBox(t.page, '[data-crane-btn="2"]');
    if (!t.expect(!!glass && !!b1 && !!b2, 'the crane glass or its buttons are not rendered') || !glass || !b1 || !b2) return;
    const h: number = await t.page.evaluate(() => innerHeight);
    const top = Math.min(glass.top, b1.top, b2.top);
    const bottom = Math.max(glass.bottom, b1.bottom, b2.bottom);
    t.note('glass and buttons span', Math.round(bottom - top));
    await scrollTo(t.page, top - Math.max(0, (h - (bottom - top)) / 2));
    for (const [what, s] of [['the glass', '.crane__glass'], ['button 1', '[data-crane-btn="1"]'], ['button 2', '[data-crane-btn="2"]']] as const) {
      const f = await t.visibleFraction(s);
      t.expect(f > 0.999, `with the glass and both buttons centered, ${what} is ${Math.round(f * 100)}% on screen`);
    }
    if (t.viewport.width < t.viewport.height) {
      const rack = await docBox(t.page, '.rack');
      if (t.expect(!!rack, 'no ticket rack') && rack) {
        t.note('rack top − glass top', Math.round(rack.top - glass.top));
        t.expect(rack.top - glass.top <= 600, `the ticket rack starts ${Math.round(rack.top - glass.top)} px below the glass top (at most 600)`);
      }
    }
  },
};

/** The 4F stage at the current viewport, with each control brought up 16 px above the bottom edge. */
async function stageAt(t: CheckContext, label: string, shots: boolean): Promise<void> {
  const h: number = await t.page.evaluate(() => innerHeight);
  const figures: Record<string, unknown> = {};
  for (const [what, s] of PARLOUR_CONTROLS) {
    await bringUp(t.page, s);
    const found = await boxes(t.page, ['.parlour__glass', '.parlour', s]);
    const glass = found['.parlour__glass'];
    const cabinet = found['.parlour'];
    const control = found[s];
    if (!glass || !cabinet || !control) {
      t.expect(false, `${label}: the glass, the cabinet or ${what} is not rendered`);
      continue;
    }
    // Pinned: the cabinet has reached its sticky offset (its marquee above the top edge). Before that
    // it is still in the floor's flow, marquee and all.
    const pinned: boolean = await t.page.evaluate((top: number) => {
      const cs = getComputedStyle(document.querySelector('.parlour')!);
      return cs.position === 'sticky' && Math.abs(top - parseFloat(cs.top)) < 1;
    }, cabinet.top);
    const share = cabinet.bottom / h;
    figures[what] = { glass: Math.round(glass.width), share: Math.round(share * 1000) / 1000, pinned };
    t.expect(glass.top >= -0.5 && glass.bottom <= h + 0.5, `${label}: with ${what} in view, the glass (${Math.round(glass.top)}–${Math.round(glass.bottom)}) is not whole`);
    if (pinned) t.expect(share <= 0.5605, `${label}: with ${what} in view, the pinned cabinet ends at ${Math.round(share * 1000) / 10}% of the height (at most 56%)`);
    const o = overlap(control, cabinet);
    t.expect(!o, `${label}: ${what} lies under the pinned cabinet by ${o?.[0]}×${o?.[1]} px`);
    if (shots && what !== 'the small row' && what !== 'NOW') await t.screenshot(`stuck-${what.replace(/^the /, '')}`);
    if (what === 'LAUNCH' || what === 'the jog') {
      // The render stays in place: the glass's inner square is not an empty night field.
      const p = await pixels(t.page);
      const inset = glass.width * 0.2;
      const inner = p.region({ left: glass.left + inset, top: glass.top + inset, right: glass.right - inset, bottom: glass.bottom - inset, width: 0, height: 0 });
      const night = hex('#1b1140');
      const drawn = inner.filter((c) => dist(c, night) > 24).length / Math.max(1, inner.length);
      figures[`${what} drawn`] = Math.round(drawn * 1000) / 1000;
      t.expect(drawn > 0.02, `${label}: with ${what} in view, the pinned glass shows no render (${Math.round(drawn * 1000) / 10}% of its inner square drawn)`);
    }
    if (what === 'the jog') {
      const p = await pixels(t.page);
      // The lamp nearest to 45° (up and right of the center), and FEVER, are painted.
      const lamp: { x: number; y: number } | null = await t.page.evaluate(() => {
        const g = document.querySelector('.parlour__glass')!.getBoundingClientRect();
        const cx = g.left + g.width / 2;
        const cy = g.top + g.height / 2;
        let best: { x: number; y: number; d: number } | null = null;
        for (const c of document.querySelectorAll('.parlour__lamps circle')) {
          const r = c.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const a = Math.atan2(y - cy, x - cx);
          const d = Math.abs(a + Math.PI / 4);
          if (!best || d < best.d) best = { x, y, d };
        }
        return best && { x: best.x, y: best.y };
      });
      const lamps = ['#3a1c8c', '#ffcc17', '#ff4fa0'].map(hex);
      if (lamp) {
        const c = p.at(lamp.x, lamp.y);
        figures.lamp = c;
        t.expect(lamps.some((l) => dist(l, c) <= 60), `${label}: the lamp at 45° paints rgb(${c.join(', ')}), not a lamp color`);
      } else t.expect(false, `${label}: no lamp found`);
      const fever = await box(t.page, '.parlour__fever');
      if (fever) {
        const colors = p.region(fever);
        const ink = colors.filter((c) => dist(c, hex('#140a24')) <= 24).length / Math.max(1, colors.length);
        const letters = colors.filter((c) => dist(c, hex('#3a1c8c')) <= 40 || dist(c, hex('#1fd68a')) <= 40).length;
        figures.fever = { ink: Math.round(ink * 100) / 100, letters };
        t.expect(ink > 0.3 && letters >= 8, `${label}: FEVER is not painted (ink ${Math.round(ink * 100)}%, ${letters} letter pixels)`);
      }
      // The cabinet's lower corners stand on the floor's mint, not on a panel passing beneath.
      const mint = hex('#1fd68a');
      for (const [side, x] of [['left', cabinet.left + 4], ['right', cabinet.right - 4]] as const) {
        const c = p.at(x, cabinet.bottom - 4);
        t.expect(dist(c, mint) <= 40, `${label}: the cabinet's lower ${side} corner shows rgb(${c.join(', ')}), not mint`);
      }
      // A swipe over the pinned glass scrolls the page.
      if (t.touch.native) {
        const moved = await t.touch.swipe(glass.left + glass.width / 2, glass.top + glass.height * 0.8, 0, -Math.min(200, glass.height * 0.6));
        figures.swipe = moved;
        t.expect(moved > 60, `${label}: a swipe over the pinned glass moved the page ${Math.round(moved)} px`);
      }
    }
  }
  t.note(label, figures);
}

const stage: Check = {
  name: '4F pinned glass',
  viewports: PORTRAIT,
  webkit: true,
  async run(t) {
    const sizes = t.browser === 'chromium' && name(t.viewport) === '390x844' ? [vp(390, 844), vp(360, 640), vp(360, 560)] : [t.viewport];
    for (const v of sizes) {
      if (name(v) !== name(t.viewport)) {
        await t.resize(v);
        await sleep(600);
      }
      await stageAt(t, name(v), name(v) === name(t.viewport));
    }
  },
};

const rewind: Check = {
  name: '4F rewind by touch while watching',
  viewports: ['390x664', '390x844'],
  async run(t) {
    if (!t.touch.native) return t.skip('no native touch in WebKit');
    const running: boolean = await t.page.evaluate(() => !!document.querySelector('.parlour.is-running') && document.querySelector('[data-jog]')?.getAttribute('aria-disabled') !== 'true');
    if (!running) return t.skip('the glass runs without its rewind wheel (no WebGL2?)');
    await bringUp(t.page, '[data-launch]');
    const launch = await box(t.page, '[data-launch]');
    if (!launch) return void t.expect(false, 'no LAUNCH');
    await t.touch.hold(launch.left + launch.width / 2, launch.top + launch.height / 2, 2000);
    await sleep(1200);
    await bringUp(t.page, '[data-jog]');
    const jog = await box(t.page, '[data-jog]');
    if (!jog) return void t.expect(false, 'no jog wheel');
    const cx = jog.left + jog.width / 2;
    const cy = jog.top + jog.height / 2;
    const r = jog.width * 0.2;
    // The inner shuttle ring, turned back (anticlockwise) a quarter turn from the top, then held.
    const turn = Array.from({ length: 16 }, (_, i) => {
      const a = -Math.PI / 2 - (i / 15) * (Math.PI / 2);
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });
    const held = Array.from({ length: 24 }, () => turn[turn.length - 1]);
    const before: number = await t.page.evaluate(() => scrollY);
    const turning = t.touch.path([...turn, ...held], 30);
    await sleep(900);
    const mid: { text: string; y: number } = await t.page.evaluate(() => ({ text: document.querySelector('[data-jog]')?.getAttribute('aria-valuetext') ?? '', y: scrollY }));
    const glassWhole = await t.visibleFraction('.parlour__glass');
    await t.screenshot('rewinding');
    await turning;
    t.note('mid-turn', { ...mid, glassWhole });
    t.expect(mid.text.includes('rewinding'), `mid-turn the wheel reads "${mid.text}", not rewinding`);
    t.expect(glassWhole > 0.999, `mid-turn only ${Math.round(glassWhole * 100)}% of the glass is on screen`);
    t.expect(mid.y === before, `turning the wheel scrolled the page by ${Math.round(mid.y - before)} px`);
  },
};

const focusStage: Check = {
  name: '4F focus never under the pinned glass',
  viewports: ['390x844', '390x664'],
  async run(t) {
    await t.page.evaluate(() => {
      const links = document.querySelectorAll<HTMLElement>('.prizes__list a');
      links[links.length - 1]?.focus({ preventScroll: false });
    });
    await sleep(300);
    let inRow = 0;
    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      await t.page.keyboard.press('Tab');
      await sleep(200);
      const now: { row: boolean; inCabinet: boolean; what: string; el: Box; cabinet: Box; h: number } = await t.page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const r = el.getBoundingClientRect();
        const c = document.querySelector('.parlour')!.getBoundingClientRect();
        const b = (x: DOMRect) => ({ left: x.left, top: x.top, right: x.right, bottom: x.bottom, width: x.width, height: x.height });
        return {
          row: !!el.closest('.machine-row--parlour'),
          inCabinet: !!el.closest('.parlour'),
          what: `${el.tagName.toLowerCase()}${el.dataset.value ? `[${el.dataset.value}]` : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 20)}"`,
          el: b(r),
          cabinet: b(c),
          h: innerHeight,
        };
      });
      if (!now.row) {
        if (inRow) break;
        continue;
      }
      inRow++;
      seen.push(now.what);
      if (now.inCabinet) continue;
      const o = overlap(now.el, now.cabinet);
      t.expect(!o, `${now.what} took focus under the pinned glass (${o?.[0]}×${o?.[1]} px)`);
      t.expect(now.el.top >= -0.5 && now.el.bottom <= now.h + 0.5, `${now.what} took focus outside the viewport (${Math.round(now.el.top)}–${Math.round(now.el.bottom)})`);
    }
    t.note('focused', seen);
    t.expect(inRow >= 6, `Tab reached only ${inRow} controls of 4F`);
  },
};

const gasTubes: Check = {
  name: 'RF gas sign tubes',
  viewports: ['360x780', '390x844'],
  async run(t) {
    const top = await docBox(t.page, '.gas');
    if (!t.expect(!!top, 'no Gas Tuner') || !top) return;
    await scrollTo(t.page, top.top - 16);
    const found: { tubes: Box[]; w: number; sw: number } = await t.page.evaluate(() => ({
      tubes: [...document.querySelectorAll('.gas__sign .tube')].map((e) => {
        const r = e.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      }),
      w: innerWidth,
      sw: document.documentElement.scrollWidth,
    }));
    t.note('tubes', found.tubes.map(size));
    t.expect(found.tubes.length === 8, `${found.tubes.length} tubes, not 8`);
    t.expect(found.sw <= found.w, `the page is ${found.sw} px wide`);
    const [minW, minH] = found.w < 390 ? [40, 52] : [44, 44];
    found.tubes.forEach((b, i) => {
      t.expect(b.left >= -0.5 && b.right <= found.w + 0.5, `tube ${i + 1} (${Math.round(b.left)}–${Math.round(b.right)}) is not inside the viewport`);
      t.expect(b.width >= minW - 0.5 && b.height >= minH - 0.5, `tube ${i + 1} is ${size(b)}, under ${minW} × ${minH}`);
      if (i > 0) {
        const o = overlap(found.tubes[i - 1], b);
        t.expect(!o, `tubes ${i} and ${i + 1} overlap by ${o?.[0]}×${o?.[1]} px`);
      }
    });
  },
};

const gasTogether: Check = {
  name: 'RF sign, strip, dial and Strike all on one screen',
  viewports: ['390x664', '360x780', '390x844'],
  async run(t) {
    const parts = ['.gas__sign', '.gas__strip', '.gas__dial', '[data-gas-all]'];
    const docs = await Promise.all(parts.map((s) => docBox(t.page, s)));
    if (!t.expect(docs.every(Boolean), 'a part of the Gas Tuner is not rendered')) return;
    const h: number = await t.page.evaluate(() => innerHeight);
    const top = Math.min(...docs.map((b) => b!.top));
    const bottom = Math.max(...docs.map((b) => b!.bottom));
    t.note('span', Math.round(bottom - top));
    await scrollTo(t.page, top - Math.max(0, (h - (bottom - top)) / 2));
    for (const s of parts) {
      const f = await t.visibleFraction(s);
      t.expect(f > 0.999, `with the tuner centered, ${s} is ${Math.round(f * 100)}% on screen`);
    }
  },
};

/** The floor that holds the viewport's middle line. */
const floorAtMiddle = (page: Page): Promise<string | null> =>
  page.evaluate(() => {
    for (const s of document.querySelectorAll<HTMLElement>('[data-floor-section]')) {
      const r = s.getBoundingClientRect();
      if (r.top <= innerHeight / 2 && r.bottom >= innerHeight / 2) return s.id;
    }
    return null;
  });

async function ride4F(t: CheckContext): Promise<void> {
  const f4 = await docBox(t.page, '[id="4f"]');
  if (f4) await scrollTo(t.page, f4.top + 40, 900);
}

async function liftState(page: Page): Promise<{ open: boolean; active: string; expanded: string[]; nums: string[] }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return {
      open: !(document.querySelector('[data-lift-panel]') as HTMLElement).hidden,
      active: el ? `${el.closest('[data-floor-section]')?.id ?? ''}:${el.dataset.go ?? (el.matches('[data-lift]') ? 'lift' : el.tagName.toLowerCase())}` : '',
      expanded: [...document.querySelectorAll('[data-lift]')].map((b) => `${b.closest('[data-floor-section]')?.id}:${b.getAttribute('aria-expanded')}`),
      nums: [...document.querySelectorAll('[data-lift-now]')].map((n) => n.textContent ?? ''),
    };
  });
}

const elevator: Check = {
  name: 'elevator call buttons on every floor',
  viewports: ['390x844'],
  async run(t) {
    const count = (): Promise<number> => t.page.evaluate(() => document.querySelectorAll('.lift-call').length);
    t.expect((await count()) === 5, `${await count()} elevator call buttons, not 5 (2F, 3F, 4F, 5F and RF)`);
    const sizes: string[] = await t.page.evaluate(() => [...document.querySelectorAll('.lift-call')].map((b) => `${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)}`));
    t.note('call buttons', sizes);
    for (const s of sizes) t.expect(s.split('×').every((n) => Number(n) >= 43.5), `a call button is ${s}, under 44 × 44`);
    // Contrast of what the phone creates: the call button's numeral and focus ring, the panel's names.
    for (const [selector, kind, min] of [['.lift-call', 'text', 4.5], ['.lift-call', 'focus', 3]] as const) {
      const c = await t.contrast(selector, kind);
      t.note(`${selector} (${kind})`, c.ratio);
      t.expect(c.ratio !== null && c.ratio >= min, `${selector} (${kind}) at ${c.ratio ?? c.problem}, under ${min}:1`);
    }
    await scrollTo(t.page, 0);
    await t.page.evaluate(() => (document.querySelector('.deck [data-lift]') as HTMLElement).click());
    await sleep(300);
    const names = await t.contrast('.lift-panel__grid button', 'text');
    t.note('.lift-panel__grid button (text)', names.ratio);
    t.expect(names.ratio !== null && names.ratio >= 4.5, `the elevator panel's floor names at ${names.ratio ?? names.problem}, under 4.5:1`);
    await t.page.keyboard.press('Escape');
    await sleep(200);

    // From 4F, reached by scrolling: call, choose 2F, then Back.
    await ride4F(t);
    t.expect((await floorAtMiddle(t.page)) === '4f', 'the page did not reach 4F by scrolling');
    if (!t.expect(await tapCenter(t, '[id="4f"] .lift-call'), '4F has no call button')) return;
    await sleep(400);
    let s = await liftState(t.page);
    t.note('opened from 4F', s);
    t.expect(s.open, "4F's call button did not open the panel");
    t.expect(s.active.endsWith(':rf'), `focus went to ${s.active}, not the panel's RF button`);
    t.expect(s.expanded.filter((e) => e.endsWith(':true')).join() === '4f:true', `aria-expanded is true on ${s.expanded.filter((e) => e.endsWith(':true')).join(', ') || 'no button'}, not only on 4F's call button`);
    t.expect(s.nums.every((n) => n === '4F'), `the floor displays read ${s.nums.join(', ')}, not 4F`);
    await tapCenter(t, '[data-lift-panel] [data-go="2f"]');
    await sleep(300);
    await settleScroll(t.page);
    t.expect((await floorAtMiddle(t.page)) === '2f', 'choosing 2F did not reach 2F');
    await t.page.goBack();
    await sleep(300);
    await settleScroll(t.page);
    const back = await floorAtMiddle(t.page);
    t.note('after Back', back);
    t.expect(back === '4f', `Back went to ${back}, not 4F`);

    // Escape returns focus to the button that opened the panel.
    await ride4F(t);
    await tapCenter(t, '[id="4f"] .lift-call');
    await sleep(300);
    await t.page.keyboard.press('Escape');
    await sleep(200);
    s = await liftState(t.page);
    t.expect(!s.open, 'Escape did not close the panel');
    t.expect(s.active === '4f:lift', `after Escape focus is on ${s.active}, not 4F's call button`);
    t.expect(s.expanded.every((e) => e.endsWith(':false')), `after Escape aria-expanded reads ${s.expanded.join(', ')}`);

    // 390 → 1024 → 390: the buttons leave and come back, and still work.
    await t.resize(vp(1024, 844));
    await sleep(500);
    t.expect((await count()) === 0, `${await count()} call buttons at 1024 px`);
    await t.resize(vp(390, 844));
    await sleep(500);
    t.expect((await count()) === 5, `${await count()} call buttons back at 390 px, not 5`);
    await ride4F(t);
    await tapCenter(t, '[id="4f"] .lift-call');
    await sleep(400);
    s = await liftState(t.page);
    t.note('after the resize', s);
    t.expect(s.open, 'after the resize, 4F\'s call button did not open the panel');
    t.expect(s.nums.every((n) => n === '4F'), `after the resize the floor displays read ${s.nums.join(', ')}`);
    await t.page.keyboard.press('Escape');
    await sleep(200);
    s = await liftState(t.page);
    t.expect(!s.open && s.active === '4f:lift', `after the resize, Escape left focus on ${s.active}`);

    // A desktop context has no call button.
    const desk = await t.open({ viewport: vp(1440, 900), isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
    const onDesk: { calls: number; lifts: number } = await desk.page.evaluate(() => ({ calls: document.querySelectorAll('.lift-call').length, lifts: document.querySelectorAll('[data-lift]').length }));
    t.expect(onDesk.calls === 0 && onDesk.lifts === 1, `a desktop context has ${onDesk.calls} call buttons and ${onDesk.lifts} elevator buttons`);
  },
};

const handheld: Check = {
  name: '1F handheld in landscape',
  viewports: LANDSCAPE,
  async run(t) {
    const { messages, figures } = await deckFindings(t);
    t.note('deck', figures);
    for (const m of messages) t.expect(false, m);
    await t.screenshot('handheld');
    if (!t.touch.native) return t.skip('no native touch in WebKit');
    const y0: number = await t.page.evaluate(() => scrollY);
    const ys: number[] = [];
    const sample = async () => ys.push(await t.page.evaluate(() => scrollY));
    if (!(await startGame(t))) return t.skip('Rain Run did not start (no WebGL2?)');
    await sample();
    const up = await box(t.page, '.stick__dir--up');
    if (up) await t.touch.hold(up.left + up.width / 2, up.top + up.height / 2, 700, { x: 2, y: 12 });
    await sample();
    const gate = await box(t.page, '[data-stick-gate]');
    if (gate) await t.touch.drag(gate.left + gate.width / 2, gate.top + gate.height / 2, 30, -20, 400);
    await sample();
    await tapCenter(t, '.arcade--a');
    await sample();
    await tapCenter(t, '.arcade--b');
    await sample();
    await sleep(800);
    await tapCenter(t, '.arcade--c');
    const timeview = await waitFor(async () => (await rrState(t.page)) === 'timeview', 5000);
    await sample();
    t.note('scrollY while playing', ys);
    t.expect(timeview, 'C did not open TIME VIEW');
    t.expect(ys.every((y) => y === y0), `playing moved the page: scrollY ${ys.join(', ')}`);
    await t.screenshot('timeview');
  },
};

const insets: Check = {
  name: '1F handheld clear of the safe areas',
  viewports: ['844x390', '667x375'],
  async run(t) {
    const fake = { l: 47, r: 47, b: 21 };
    await t.setSafeArea({ left: fake.l, right: fake.r, bottom: fake.b });
    try {
      await sleep(500);
      const { messages, figures } = await deckFindings(t, fake);
      t.note('deck', figures);
      for (const m of messages) t.expect(false, m);
      const w: number = await t.page.evaluate(() => innerWidth);
      const h: number = await t.page.evaluate(() => innerHeight);
      const dir: { what: string; b: Box }[] = await t.page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.directory a, .directory button')]
          .filter((e) => e.checkVisibility({ checkVisibilityCSS: true }) && e.getBoundingClientRect().width > 0)
          .map((e) => {
            const r = e.getBoundingClientRect();
            return { what: (e.textContent ?? '').trim().slice(0, 12), b: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } };
          }),
      );
      for (const d of dir) {
        t.expect(inside(d.b, w, h, fake), `the directory's "${d.what}" (${Math.round(d.b.left)}–${Math.round(d.b.right)} × ${Math.round(d.b.top)}–${Math.round(d.b.bottom)}) reaches into the safe areas`);
        t.expect(d.b.height >= 43.5, `the directory's "${d.what}" is ${size(d.b)}, under 44 tall`);
      }
      await t.screenshot('insets');
    } finally {
      await t.page.evaluate(() => ['--safe-t', '--safe-r', '--safe-b', '--safe-l'].forEach((p) => document.documentElement.style.removeProperty(p)));
    }
  },
};

const parlourLandscape: Check = {
  name: '4F glass beside its panels in landscape',
  viewports: LANDSCAPE,
  async run(t) {
    const h: number = await t.page.evaluate(() => innerHeight);
    for (const [what, s] of [['LAUNCH', '[data-launch]'], ['the shutter', '[data-group="shutter"]'], ['the jog', '[data-jog]'], ['NOW', '[data-jog-now]']] as const) {
      // Some scroll shows both whole: the row's top at the glass's sticky offset, the control centered,
      // or the control brought up to the bottom edge.
      const row = await docBox(t.page, '.machine-row--parlour');
      const control = await docBox(t.page, s);
      if (!row || !control) {
        t.expect(false, `the parlour row or ${what} is not rendered`);
        continue;
      }
      const tries = [row.top - 8, control.top - (h - control.height) / 2, control.bottom + 16 - h];
      let best = { glass: 0, control: 0 };
      for (const y of tries) {
        await scrollTo(t.page, y);
        const now = { glass: await t.visibleFraction('.parlour__glass'), control: await t.visibleFraction(s) };
        if (now.glass + now.control > best.glass + best.control) best = now;
        if (now.glass > 0.999 && now.control > 0.999) break;
      }
      t.note(what, best);
      t.expect(best.glass > 0.999 && best.control > 0.999, `no scroll shows the glass and ${what} whole together (at best ${Math.round(best.glass * 100)}% and ${Math.round(best.control * 100)}%)`);
      if (what === 'LAUNCH') await t.screenshot('4f-launch');
    }
    // The jog hub's raised label, measured here, beside the stage rather than under it.
    const hub = await t.contrast('.jog__hub', 'text');
    t.note('.jog__hub (text)', hub.ratio);
    t.expect(hub.ratio !== null && hub.ratio >= 4.5, `the jog hub's label at ${hub.ratio ?? hub.problem}, under 4.5:1`);
  },
};

const labels: Check = {
  name: 'label sizes',
  viewports: ['390x844', '844x390'],
  async run(t) {
    const floors: [string, number][] = [
      ['.rocker__track button', 12],
      ['.key--small', 12],
      ['.screen-switch button', 12],
      ['.sound--deck .sound__text', 12],
      ['.gas__stops button', 12],
      ['.arcade__silk', 12],
      ['.lift-panel__grid button', 12],
      ['.jog__hub', 12],
      ['.tag', 11],
      ['.dip__name', 11],
      ['.marquee__sub', 11],
    ];
    const found: Record<string, number[]> = await t.page.evaluate(
      (selectors: string[]) => Object.fromEntries(selectors.map((s) => [s, [...document.querySelectorAll(s)].map((e) => parseFloat(getComputedStyle(e).fontSize))])),
      floors.map(([s]) => s),
    );
    for (const [s, min] of floors) {
      const sizes = found[s] ?? [];
      t.note(s, [...new Set(sizes)]);
      t.expect(sizes.length > 0, `nothing matches ${s}`);
      const small = sizes.filter((v) => v < min - 0.01);
      t.expect(!small.length, `${s} at ${[...new Set(small)].join(', ')} px, under ${min} px`);
    }
  },
};

const gameCenter: PageCheck = {
  pages: ['game-center'],
  setup: {
    'game-center': {
      panels: ['.floor--4f .parlour'],
      skipTargets: ['.jog'],
      letters: ['.gas__sign .tube'],
      smallText: ['.hud', '.timestrip__read', '.timecode', '.parlour__counter', '.crane__readout', '.handle__read', '.directory__now', '.lift__num', '.lift-call__num'],
      // Checked by `elevator` and `4F glass beside its panels in landscape` instead, where they are
      // on screen and not under the pinned glass: the call buttons, the elevator panel's floor names
      // and the jog hub.
      contrast: [
        { selector: '.dip__name', kind: 'text' },
        { selector: '.tag--screen', kind: 'text' },
        { selector: '.cab__tag', kind: 'text' },
        { selector: '.roof__tag', kind: 'text' },
        { selector: '.arcade__silk', kind: 'text', webkit: true },
        { selector: '.marquee__sub', kind: 'text', webkit: true },
        { selector: '.gas__stops button', kind: 'text' },
        { selector: '.sound--deck', kind: 'text', webkit: true },
      ],
      async ready(page: Page) {
        // Each machine boots when its floor is less than a screen away: ride the whole building once.
        await page.evaluate(async () => {
          const step = Math.round(innerHeight * 0.8);
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise((done) => setTimeout(done, 90));
          }
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
        await page.waitForFunction(() => !!document.querySelector('.parlour.is-running') && !!document.querySelector('.gas.is-running'), null, { timeout: 20_000 }).catch(() => {});
        await sleep(400);
      },
    },
  },
  checks: [deck, holdTrio, timeView, crane, stage, rewind, focusStage, gasTubes, gasTogether, elevator, handheld, insets, parlourLandscape, labels],
  queries: [
    '(max-width: 389px)',
    '(orientation: landscape) and (max-height: 500px) and (pointer: coarse) and (min-width: 768px)',
    '(orientation: landscape) and (max-height: 500px) and (pointer: coarse) and (max-width: 767px)',
    '(max-width: 767px), (orientation: landscape) and (max-height: 500px) and (pointer: coarse)',
  ],
};

export default gameCenter;
