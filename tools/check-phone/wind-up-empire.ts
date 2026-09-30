/**
 * Phone checks of Wind-Up Empire (`/landings/wind-up-empire/`), the page module of tools/check-phone.ts
 * (design adapt-for-phones D8 and D18; spec landing-wind-up-empire). Run it through the core:
 *
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/check-phone.ts phone wind-up-empire --base <url>
 *
 * The checks read the page as a visitor sees it, with no development hook, so they run the same on a
 * development server and on a production build. Every check that depends on the page's state (the
 * build queue, the press) reloads the page first: the generic checks before it may have changed it.
 */
import type { CheckContext, Page, PageCheck, Point } from '../check-phone.ts';

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The narrow and landscape gates of the page's phone rules (design D2 and D8). */
const TILE = '(max-width: 900px), (orientation: landscape) and (max-height: 500px)';
const QUERIES = [
  TILE,
  '(pointer: coarse) and (max-width: 900px), (pointer: coarse) and (orientation: landscape) and (max-height: 500px)',
  '(min-width: 561px) and (max-width: 900px)',
  '(orientation: landscape) and (max-height: 500px) and (max-width: 800px)',
  '(max-width: 359px)',
  '(max-width: 359px), (orientation: landscape) and (max-height: 500px) and (max-width: 700px)',
  '(max-width: 560px) and (max-height: 760px)',
  '(max-width: 900px) and (orientation: portrait)',
  '(max-width: 900px) and (orientation: portrait) and (min-height: 640px)',
];

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/** The viewport box of the first element matching `selector`, or null. */
function box(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
}

const center = (b: Box): Point => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
const inView = (b: Box | null, w: number, h: number, slack = 0.5) => !!b && b.top >= -slack && b.left >= -slack && b.bottom <= h + slack && b.right <= w + slack;
const round = (b: Box | null) => (b ? `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}` : 'none');

async function scrollTop(page: Page, y: number): Promise<void> {
  await page.evaluate((top: number) => window.scrollTo({ left: 0, top, behavior: 'instant' }), y);
  await sleep(200);
}

/**
 * Brings an element of the lid to the middle of the view and waits until it stops moving. The lid lifts
 * with the scroll (the page's one scroll-linked motion), so a single scroll leaves the element where
 * the lift moves it a frame later; the harness's contrast probe then finds it where it was measured.
 */
async function settleInView(page: Page, selector: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const moved: number = await page.evaluate((selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return 0;
      const before = el.getBoundingClientRect().top;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      return Math.abs(el.getBoundingClientRect().top - before);
    }, selector);
    await sleep(250);
    if (moved < 1 && i > 0) break;
  }
}

/** Clicks the first "Skip the grind" button (every press row researched, the first build done, the queue empty). */
async function skipGrind(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-skip-grind]')?.click());
  await sleep(300);
}

/** Text of the log (the survey log on the lid). */
const logText = (page: Page): Promise<string> => page.evaluate(() => document.querySelector('#log')?.textContent ?? '');

/** A hash of the proof bed's pixels and the number of distinct colors in them (null without a bed). */
function bedPixels(page: Page): Promise<{ hash: string; colors: number; width: number; height: number } | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.press-bed canvas');
    if (!canvas || canvas.width < 2) return null;
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<number>();
    let h = 0x811c9dc5;
    for (let i = 0; i < data.length; i += 4) {
      const c = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      colors.add(c);
      h = Math.imul(h ^ c, 0x01000193);
    }
    return { hash: (h >>> 0).toString(16), colors: colors.size, width: canvas.width, height: canvas.height };
  });
}

/** Counts the drawing calls on the proof bed's context from now on (read with `bedCalls`). */
function watchBed(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.press-bed canvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D & { __calls?: number };
    ctx.__calls = 0;
    for (const name of ['putImageData', 'fillRect', 'drawImage', 'fill', 'stroke'] as const) {
      const original = (ctx as unknown as Record<string, (...args: unknown[]) => unknown>)[name].bind(ctx);
      (ctx as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => {
        ctx.__calls = (ctx.__calls ?? 0) + 1;
        return original(...args);
      };
    }
    return true;
  });
}
const bedCalls = (page: Page): Promise<number> =>
  page.evaluate(() => (document.querySelector<HTMLCanvasElement>('.press-bed canvas')?.getContext('2d') as (CanvasRenderingContext2D & { __calls?: number }) | null)?.__calls ?? -1);

/** Taps the label of a press position (the radio itself is transparent over its label). */
async function tapPress(t: CheckContext, row: string, value: string): Promise<boolean> {
  const at: Point | null = await t.page.evaluate(
    ({ row, value }: { row: string; value: string }) => {
      const input = document.querySelector<HTMLInputElement>(`.press input[name="${row}"][value="${value}"]`);
      const label = input?.closest('label');
      if (!label) return null;
      label.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      const r = label.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    { row, value },
  );
  if (!at) return false;
  await sleep(200);
  await t.touch.tap(at.x, at.y);
  await sleep(700);
  return t.page.evaluate(({ row, value }: { row: string; value: string }) => !!document.querySelector<HTMLInputElement>(`.press input[name="${row}"][value="${value}"]`)?.checked, { row, value });
}

const check: PageCheck = {
  pages: ['wind-up-empire'],
  queries: QUERIES,
  setup: {
    'wind-up-empire': {
      // 780×360: a landscape Android phone (spec "First screen on phones and intermediate widths").
      viewports: [{ width: 780, height: 360 }],
      visuals: ['.lid-scene', '.press-bed'],
      // The pinned proof bed: focus is never under it. The docked route band is a panel only in
      // portrait, so its own check below covers it (and the generic focus check sees any cover).
      panels: ['.press-bed'],
      contrast: [
        { selector: '.key-stub', kind: 'text', prepare: (t) => settleInView(t.page, '.key-stub') },
        { selector: '.ticket-deck-link', kind: 'text', prepare: async (t) => (await skipGrind(t.page), settleInView(t.page, '.ticket-deck-link')) },
        { selector: '.ticket-deck-link', kind: 'focus', prepare: async (t) => (await skipGrind(t.page), settleInView(t.page, '.ticket-deck-link')) },
        { selector: '.press-bed-caption', kind: 'text' },
        { selector: '.key-coil', kind: 'glyph', prepare: (t) => settleInView(t.page, '.key-coil') },
      ],
      // Screen-typeface readouts (Sono coordinates on the orrery's nameplates), and the band's
      // "Demo model · Fake economy · Resets on reload": an honesty tag set as a label, whose floor is
      // 11 px (phone-ergonomics "Readable text"), not a sentence.
      smallText: ['.plate-coord', '.lip-text'],
      // Planet hits move with their tops; the nameplates module places them (nameplates.ts). The spark
      // wheel's zone is 56 × 46 but not centered on the wheel (the menu's row is above it): checked below.
      skipTargets: ['.planet-hit', '.spark-wheel'],
    },
  },
  checks: [
    {
      name: 'drum reels never clip a digit',
      viewports: ['390x844', '390x664'],
      webkit: true,
      async run(t) {
        const height = t.viewport.height;
        for (const width of [320, 360, 375, 390, 430]) {
          await t.resize({ width, height });
          await sleep(400);
          const found: { drums: { name: string; reels: number; narrowest: number; ch: number; overflow: boolean }[] } = await t.page.evaluate(() => ({
            drums: [...document.querySelectorAll<HTMLElement>('.drum')].map((drum) => {
              const reels = [...drum.querySelectorAll<HTMLElement>('.reel-window')].filter((w) => w.getBoundingClientRect().width > 0);
              const probe = document.createElement('span');
              probe.style.cssText = 'position:absolute;visibility:hidden;width:1ch;';
              reels[0]?.querySelector('.reel')?.append(probe);
              const ch = probe.getBoundingClientRect().width;
              probe.remove();
              const well = drum.querySelector<HTMLElement>('.drum-well')!;
              return {
                name: drum.dataset.resource ?? '?',
                reels: reels.length,
                narrowest: Math.min(...reels.map((w) => w.getBoundingClientRect().width)),
                ch,
                overflow: well.scrollWidth > well.clientWidth + 0.5,
              };
            }),
          }));
          for (const d of found.drums) {
            t.note(`${width} ${d.name}`, `${d.reels} reels, narrowest ${d.narrowest.toFixed(2)} px, 1ch ${d.ch.toFixed(2)} px`);
            t.expect(d.narrowest >= 0.98 * d.ch, `at ${width} px the ${d.name} drum's narrowest reel is ${d.narrowest.toFixed(1)} px, under 0.98 × 1ch (${d.ch.toFixed(1)} px)`);
            t.expect(!d.overflow, `at ${width} px the ${d.name} drum's well overflows`);
            if (d.name !== 'spring') t.expect(d.reels === 6, `at ${width} px the ${d.name} drum shows ${d.reels} reels, not 6`);
          }
          if (width === 360) await t.screenshot('strip-360');
        }
      },
    },
    {
      name: 'winding two turns on the key shows the stub and the coil',
      viewports: ['390x844'],
      async run(t) {
        await t.reload();
        const grip = (await box(t.page, '.key-grip')) ?? (await box(t.page, '#key'));
        if (!grip) return void t.expect(false, 'no key on the page');
        t.note('grip', round(grip));
        const c = center(grip);
        const r = Math.min(grip.width, grip.height) * 0.32;
        const points: Point[] = [];
        for (let deg = -90; deg <= -90 + 740; deg += 5) points.push({ x: c.x + r * Math.cos((deg * Math.PI) / 180), y: c.y + r * Math.sin((deg * Math.PI) / 180) });
        const samples: { t: number; text: string; top: number; bottom: number; coil: number }[] = [];
        let sampling = true;
        const sampler = (async () => {
          const start = Date.now();
          while (sampling) {
            const s = await t.page.evaluate(() => {
              const stub = document.querySelector('.key-stub');
              const r = stub?.getBoundingClientRect();
              const fill = document.querySelector<HTMLElement>('.key-coil-fill');
              const track = fill?.parentElement;
              return {
                text: (stub?.textContent ?? '').replace(/\s+/g, ' ').trim(),
                top: r?.top ?? -1,
                bottom: r?.bottom ?? -1,
                coil: fill && track ? fill.getBoundingClientRect().width / Math.max(1, track.getBoundingClientRect().width - 4) : -1,
              };
            });
            samples.push({ t: Date.now() - start, ...s });
            await sleep(80);
          }
        })();
        await t.touch.path(points, 16);
        const afterWind = Date.now();
        while (Date.now() - afterWind < 9000) {
          await sleep(250);
          if (samples.some((s) => /^LV 2$/.test(s.text)) && Date.now() - afterWind > 7000) break;
        }
        sampling = false;
        await sampler;
        const texts = [...new Set(samples.map((s) => s.text))];
        t.note('stub texts', texts);
        const winding = samples.findIndex((s) => s.text === 'WINDING 2/2');
        const running = samples.findIndex((s, i) => i > winding && s.text === 'RUNNING');
        const built = samples.findIndex((s, i) => i > running && s.text === 'LV 2');
        t.expect(winding >= 0, `the stub never read "WINDING 2/2" (it read ${texts.join(' | ')})`);
        t.expect(running > winding, 'the stub did not read "RUNNING" after winding');
        t.expect(built > running, 'the stub did not stamp "LV 2" after running');
        const height = t.viewport.height;
        t.expect(samples.every((s) => s.text === '' || (s.top >= 0 && s.bottom <= height)), 'the stub left the viewport while winding and running');
        const coils = samples.slice(running).map((s) => s.coil).filter((v) => v >= 0);
        const low = Math.min(...coils);
        const high = Math.max(...coils);
        t.note('coil', `${low.toFixed(2)} → ${high.toFixed(2)}`);
        t.expect(coils.length > 0 && low <= 0.1 && high >= 0.9, `the coil did not grow from 0 to 100 % while running (${low.toFixed(2)} → ${high.toFixed(2)})`);
        const scrolled: number = await t.page.evaluate(() => scrollY);
        t.expect(scrolled === 0, `winding scrolled the page to ${scrolled}`);
        await t.screenshot('after-build');
      },
    },
    {
      name: 'a swipe up that starts on the rocket scrolls natively and launches nothing',
      viewports: ['390x844', '390x664'],
      webkit: true,
      async run(t) {
        await t.reload();
        const grab = await box(t.page, '#rocket-grab');
        if (!grab) return void t.expect(false, 'no rocket grab');
        const c = center(grab);
        // No page script may scroll: the browser alone moves the page (design D8).
        await t.page.evaluate(() => {
          const w = window as unknown as { __scrolls: number };
          w.__scrolls = 0;
          for (const name of ['scrollTo', 'scrollBy', 'scroll'] as const) {
            const original = window[name].bind(window) as (...args: unknown[]) => void;
            (window as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => {
              w.__scrolls++;
              original(...args);
            };
          }
        });
        const before = await logText(t.page);
        let watch: { before: number; atLift: number; after: { t: number; y: number }[] };
        try {
          watch = await t.touch.swipeWatch(c.x, c.y, 0, -160, 250, 400);
        } catch (error) {
          if (t.touch.native) throw error;
          // This WebKit cannot construct touch events, and pointer events alone would reach the grab
          // without the touchmove that decides pull or scroll: nothing here would stand for a finger.
          // The decision is pure (touchPull, unit-tested) and the gesture is checked in Chromium.
          return void t.skip(`no synthetic touch events in this WebKit (${String((error as Error).message).slice(0, 40)}); touchPull is unit-tested and the swipe runs in Chromium`);
        }
        await sleep(400);
        const after = await logText(t.page);
        const scripted: number = await t.page.evaluate(() => (window as unknown as { __scrolls: number }).__scrolls);
        t.expect(!/Rocket 1 left home/.test(after) && !/Rocket 1 left home/.test(before), 'a swipe up from the rocket launched rocket 1');
        t.expect(scripted === 0, `page script scrolled the page ${scripted} times during the swipe`);
        if (!t.touch.native) {
          t.note('WebKit', 'untrusted touch events never scroll: only "nothing launched" and "no script scroll" are checked');
          return;
        }
        const end = watch.after[watch.after.length - 1]?.y ?? watch.atLift;
        t.note('scroll', { before: watch.before, atLift: watch.atLift, end });
        t.expect(end - watch.before > 100, `the page scrolled ${Math.round(end - watch.before)} px, not more than 100`);
      },
    },
    {
      name: 'a swipe up from the rocket keeps the momentum the page has',
      viewports: ['390x844'],
      async run(t) {
        if (!t.touch.native) return void t.skip('no native touch in WebKit');
        // Native momentum: after the lift, scrollY keeps growing for at least 100 ms, as it does for the
        // same swipe on a spot of the lid with no toy (the page's own scroll, the reference).
        const growth = (samples: { t: number; y: number }[]) => {
          const growing = samples.filter((s, i) => i > 0 && s.y > samples[i - 1].y);
          return growing.length ? growing[growing.length - 1].t : 0;
        };
        await t.reload();
        const [grab, frame] = await Promise.all([box(t.page, '#rocket-grab'), box(t.page, '.lid-frame')]);
        if (!grab || !frame) return void t.expect(false, 'no rocket grab');
        const c = center(grab);
        const reference = growth((await t.touch.swipeWatch(frame.left + 4, c.y, 0, -160, 160, 500)).after);
        await scrollTop(t.page, 0);
        await sleep(600);
        const rocket = growth((await t.touch.swipeWatch(c.x, c.y, 0, -160, 160, 500)).after);
        t.note('momentum', { beside: `${reference} ms`, rocket: `${rocket} ms` });
        if (reference < 100) return void t.skip(`this browser gave the page no momentum even beside the lid (${reference} ms), so there is nothing to compare the rocket with`);
        t.expect(rocket >= 100, `scrollY stopped growing ${rocket} ms after the lift from the rocket; beside the lid it grew for ${reference} ms`);
      },
    },
    {
      name: 'the phone pieces leave with their gate and come back',
      viewports: ['390x844'],
      async run(t) {
        await t.reload();
        await skipGrind(t.page);
        await t.page.evaluate(() => document.querySelector('.press')?.scrollIntoView({ behavior: 'instant' }));
        await sleep(500);
        const state = () =>
          t.page.evaluate(() => ({
            pieces: ['.key-stub', '.key-coil', '.key-grip', '.ticket-deck-link', '.press-bed'].map((s) => document.querySelectorAll(s).length).join(''),
            empty: document.querySelector('#ticket')!.hasAttribute('data-empty'),
            title: getComputedStyle(document.querySelector('.key-tag-title')!).display,
          }));
        const phone = await state();
        t.expect(phone.pieces === '11111' && phone.empty && phone.title === 'none', `on the phone: ${JSON.stringify(phone)}`);
        await t.resize({ width: 1440, height: 900 });
        await sleep(500);
        const wide = await state();
        t.note('at 1440×900', wide);
        t.expect(wide.pieces === '00000' && !wide.empty && wide.title !== 'none', `at 1440×900 something stays: ${JSON.stringify(wide)}`);
        await t.resize(t.viewport);
        await sleep(500);
        const again = await state();
        t.expect(again.pieces === '11111' && again.empty, `back on the phone: ${JSON.stringify(again)}`);
      },
    },
    {
      name: 'a pull back of 110 px launches',
      viewports: ['390x844'],
      async run(t) {
        await t.reload();
        // A reload restores the scroll position an earlier check left (a resize can leave 38 px).
        await t.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await sleep(200);
        const grab = await box(t.page, '#rocket-grab');
        if (!grab) return void t.expect(false, 'no rocket grab');
        const c = center(grab);
        await t.touch.drag(c.x, c.y, 0, 110, 500);
        await sleep(500);
        const log = await logText(t.page);
        const launched = /Rocket 1 left home: (\d+) detents/.exec(log);
        t.note('launch', launched?.[0] ?? 'none');
        t.expect(!!launched, 'a 110 px pull back did not launch rocket 1');
        const scrolled: number = await t.page.evaluate(() => scrollY);
        t.expect(scrolled === 0, `the pull back scrolled the page to ${scrolled}`);
      },
    },
    {
      name: 'a swipe from the key tile edge scrolls and winds nothing',
      viewports: ['390x844'],
      async run(t) {
        await t.reload();
        const tile = await box(t.page, '#key');
        if (!tile) return void t.expect(false, 'no key tile');
        const spring = () => t.page.evaluate(() => document.querySelector('[data-resource="spring"] .drum-well')?.getAttribute('data-value') ?? '?');
        const before = { spring: await spring(), log: await logText(t.page) };
        const moved = await t.touch.swipe(tile.left + 10, tile.top + tile.height / 2, 0, -200, 250);
        await sleep(300);
        const after = { spring: await spring(), log: await logText(t.page) };
        t.note('scroll', moved);
        t.expect(moved > 100, `a 200 px swipe from the tile's left edge scrolled ${moved} px`);
        t.expect(after.spring === before.spring, `the swipe changed Spring from ${before.spring} to ${after.spring}`);
        t.expect(!/Spring held/.test(after.log) || /Spring held/.test(before.log), 'the swipe wound the key ("Spring held" in the log)');
      },
    },
    {
      name: 'first screen at 390×844: the band in its place',
      viewports: ['390x844'],
      async run(t) {
        const [h1, anchor, key, gauge, lip, button, ticket] = await Promise.all(['#lid-title', '.orrery-anchor', '#key', '#gauge', '.lip', '.lip-button', '#ticket'].map((s) => box(t.page, s)));
        const { width, height } = t.viewport;
        for (const [name, b] of [['H1', h1], ['orrery', anchor], ['key', key], ['gauge', gauge], ['band button', button]] as const) t.expect(inView(b, width, height), `${name} is not wholly on the first screen (${round(b)})`);
        t.expect(!!lip && !!key && !!gauge && key.bottom <= lip.top + 0.5 && gauge.bottom <= lip.top + 0.5, `the band covers the key or the gauge (${round(lip)})`);
        t.expect(!!lip && !!ticket && lip.bottom <= ticket.top + 0.5, 'the band overlaps the ticket');
        const scroll: number = await t.page.evaluate(() => document.documentElement.scrollWidth);
        t.expect(scroll <= width, `the page is ${scroll} px wide`);
        await t.screenshot('first');
      },
    },
    {
      name: 'short first screen: the band docked, the rail clear',
      viewports: ['390x664', '360x780'],
      webkit: true,
      async run(t) {
        const [h1, anchor, controls, lip, button, launch] = await Promise.all(['#lid-title', '.orrery-anchor', '.rail-controls', '.lip', '.lip-button', '#launch-button'].map((s) => box(t.page, s)));
        const { width, height } = t.viewport;
        for (const [name, b] of [['H1', h1], ['orrery', anchor], ['rail controls', controls], ['band button', button]] as const) t.expect(inView(b, width, height), `${name} is not wholly on the first screen (${round(b)})`);
        t.expect(!!controls && !!lip && controls.bottom <= lip.top + 0.5, `the band (${round(lip)}) overlaps the rail (${round(controls)})`);
        const hit: boolean = launch
          ? await t.page.evaluate(({ x, y }: Point) => !!document.elementFromPoint(x, y)?.closest('#launch-button'), center(launch))
          : false;
        t.expect(hit, 'Launch does not hit-test to itself');
        // The smallest top keeps a radius of at least 14 px (nameplates publish each top's radius).
        const radius: number = await t.page.evaluate(() => Math.min(...[...document.querySelectorAll<HTMLElement>('.planet')].map((p) => parseFloat(p.style.getPropertyValue('--top-r')) || Infinity)));
        t.note('smallest top radius', Number.isFinite(radius) ? Math.round(radius * 10) / 10 : 'not published');
        if (Number.isFinite(radius)) t.expect(radius >= 14 - 0.05, `the smallest top's radius is ${radius.toFixed(1)} px, under 14`);
        await t.screenshot('first');
      },
    },
    {
      name: 'the docked band settles above the ticket',
      viewports: ['390x664', '360x780'],
      async run(t) {
        const end: number = await t.page.evaluate(() => {
          const ticket = document.querySelector('#ticket')!.getBoundingClientRect();
          return Math.max(0, Math.round(ticket.top + scrollY - innerHeight + 120));
        });
        const docked = await box(t.page, '.lip');
        t.expect(!!docked && Math.abs(docked.bottom - t.viewport.height) <= 1, `at scroll 0 the band is not docked to the bottom edge (${round(docked)})`);
        let worst = 0;
        for (let i = 0; i <= 19; i++) {
          const y = Math.round((end * i) / 19);
          await scrollTop(t.page, y);
          const [lip, ticket] = await Promise.all([box(t.page, '.lip'), box(t.page, '#ticket')]);
          if (!lip || !ticket) continue;
          worst = Math.max(worst, lip.bottom - ticket.top);
          t.expect(lip.bottom <= ticket.top + 0.5, `at scrollY ${y} the band (${round(lip)}) overlaps the ticket (${round(ticket)})`);
          t.expect(lip.bottom <= t.viewport.height + 0.5, `at scrollY ${y} the band leaves the bottom edge`);
        }
        t.note('closest approach to the ticket', Math.round(worst));
        await scrollTop(t.page, 0);
      },
    },
    {
      name: 'landscape: the rocket, Launch and the band on one screen',
      viewports: ['844x390', '932x430', '780x360'],
      async run(t) {
        const { width, height } = t.viewport;
        const [strip, grab, launch, button, h1] = await Promise.all(['#strip', '#rocket-grab', '#launch-button', '.lip-button', '#lid-title'].map((s) => box(t.page, s)));
        t.note('strip', round(strip));
        t.expect(!!strip && strip.height <= 56, `the strip is ${strip ? Math.round(strip.height) : '?'} px tall`);
        const centers: number[] = await t.page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.strip-brand, .strip-drums, .strip-nav')].map((e) => {
            const r = e.getBoundingClientRect();
            return r.top + r.height / 2;
          }),
        );
        t.expect(Math.max(...centers) - Math.min(...centers) <= 8, `the strip's brand, drums and links are not on one row (centers ${centers.map(Math.round).join(', ')})`);
        for (const [name, b] of [['rocket', grab], ['Launch', launch], ['band button', button], ['H1', h1]] as const) t.expect(inView(b, width, height), `${name} is not wholly on the first screen (${round(b)})`);
        // "WIND-UP EMPIRE" with its space: the gap between the two words, measured on the glyphs.
        const space: number = await t.page.evaluate(() => {
          const mark = document.querySelector('.wordmark')!;
          const word = mark.querySelector('.wordmark-word')!.getBoundingClientRect();
          const text = [...mark.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
          const range = document.createRange();
          const at = text.textContent!.indexOf('E');
          range.setStart(text, at);
          range.setEnd(text, at + 1);
          const e = range.getBoundingClientRect();
          return Math.abs(e.top - word.top) > 4 ? 99 : e.left - word.right;
        });
        t.note('wordmark space', Math.round(space * 10) / 10);
        t.expect(space >= 3, `the wordmark reads "WIND-UPEMPIRE" (${space.toFixed(1)} px between the words)`);
        // The menu holds Worlds and How to play.
        const menu = await box(t.page, '[data-strip-menu]');
        t.expect(!!menu, 'no menu button in the strip');
        if (menu) {
          await t.touch.tap(center(menu).x, center(menu).y);
          await sleep(300);
          const links: string[] = await t.page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#strip-links a')].filter((a) => a.getBoundingClientRect().height >= 44).map((a) => a.textContent!.trim()));
          t.expect(links.includes('Worlds') && links.includes('How to play'), `the open menu shows ${JSON.stringify(links)}`);
          await t.page.keyboard.press('Escape');
        }
        await t.screenshot('first');
      },
    },
    {
      name: 'landscape phone limits: density 1.5 and two rockets',
      viewports: ['844x390'],
      async run(t) {
        const { page } = await t.open({ deviceScaleFactor: 3 });
        const density: number = await page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-engine]');
          return canvas ? canvas.width / canvas.getBoundingClientRect().width : 0;
        });
        t.note('engine canvas density', Math.round(density * 100) / 100);
        t.expect(density > 0 && density <= 1.5 + 0.01, `the engine canvas backs ${density.toFixed(2)} pixels per CSS px at dpr 3`);
        await skipGrind(page);
        await sleep(300);
        const slots: number = await page.evaluate(() => document.querySelectorAll('#hangar-slots .hangar-slot:not(.is-locked)').length);
        t.note('gantry slots at level 3', slots);
        t.expect(slots === 2, `with the gantry at level 3 the hangar opens ${slots} slots on a landscape phone, not 2`);
      },
    },
    {
      name: 'the proof bed prints one ink and then stays still',
      viewports: ['390x844'],
      async run(t) {
        await t.reload();
        await skipGrind(t.page);
        await t.page.evaluate(() => document.querySelector('.press-row[data-row="inks"]')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await sleep(800);
        const first = await bedPixels(t.page);
        t.expect(!!first, 'no proof bed in the press');
        if (!first) return;
        const ok = await tapPress(t, 'inks', '1bit');
        t.expect(ok, 'the tap did not select "One-ink press"');
        await sleep(400);
        const inked = await bedPixels(t.page);
        const bed = await box(t.page, '.press-bed');
        t.note('bed', { colors: inked?.colors, size: `${inked?.width}×${inked?.height}`, box: round(bed) });
        t.expect(inked?.colors === 2, `after "One-ink press" the bed shows ${inked?.colors} colors, not 2`);
        t.expect(inView(bed, t.viewport.width, t.viewport.height), 'the bed is not wholly in view next to the switch');
        await watchBed(t.page);
        await sleep(2000);
        const calls = await bedCalls(t.page);
        const still = await bedPixels(t.page);
        t.expect(calls === 0 && still?.hash === inked?.hash, `the bed painted ${calls} times in the 2 s after the print`);
        await t.screenshot('one-ink');
      },
    },
    {
      name: 'the proof bed stays pinned while 8-fold changes it',
      viewports: ['390x664'],
      async run(t) {
        await t.reload();
        await skipGrind(t.page);
        // The symmetry row just under the pinned bed: the bed is then stuck under the strip.
        for (let i = 0; i < 3; i++) {
          await t.page.evaluate(() => {
            const row = document.querySelector('.press-row[data-row="symmetry"]')!.getBoundingClientRect();
            const bed = document.querySelector('.press-bed')!.getBoundingClientRect();
            const strip = document.querySelector('#strip')!.getBoundingClientRect();
            const target = strip.height + bed.height + 12;
            window.scrollTo({ top: scrollY + row.top - target, behavior: 'instant' });
          });
          await sleep(300);
        }
        await sleep(500);
        const before = await bedPixels(t.page);
        const ok = await tapPress(t, 'symmetry', '8');
        t.expect(ok, 'the tap did not select "8-fold"');
        const after = await bedPixels(t.page);
        const [bed, row, strip] = await Promise.all([box(t.page, '.press-bed'), box(t.page, '.press-row[data-row="symmetry"]'), box(t.page, '#strip')]);
        t.note('bed', round(bed));
        t.expect(!!bed && !!strip && Math.abs(bed.top - strip.height) <= 2, `the bed is not pinned under the strip (${round(bed)})`);
        t.expect(!!bed && !!row && row.top >= bed.bottom - 0.5 && row.bottom <= t.viewport.height + 0.5, `the symmetry row (${round(row)}) is not on screen below the bed`);
        t.expect(!!before && !!after && before.hash !== after.hash, 'the bed did not reprint on "8-fold"');
        await t.screenshot('eight-fold');
      },
    },
    {
      name: 'an empty queue offers the deck link',
      viewports: ['390x844'],
      async run(t) {
        await t.reload();
        await skipGrind(t.page);
        const stub: string = await t.page.evaluate(() => (document.querySelector('.key-stub')?.textContent ?? '').replace(/\s+/g, ' ').trim());
        t.expect(stub === 'QUEUE EMPTY', `with an empty queue the stub reads "${stub}"`);
        const link = await box(t.page, '.ticket-deck-link');
        t.note('link', round(link));
        t.expect(!!link && link.height >= 44, `the deck link is ${link ? Math.round(link.height) : 'missing'} px tall`);
        if (!link) return;
        await t.page.evaluate(() => document.querySelector('.ticket-deck-link')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await sleep(300);
        const at = await box(t.page, '.ticket-deck-link');
        await t.touch.tap(center(at!).x, center(at!).y);
        await sleep(2000);
        const deck = await box(t.page, '#deck');
        const strip = await box(t.page, '#strip');
        t.note('deck top after the tap', deck ? Math.round(deck.top) : null);
        t.expect(!!deck && !!strip && Math.abs(deck.top - strip.height) <= 60, `after the tap #deck is at ${deck ? Math.round(deck.top) : '?'} px`);
      },
    },
    {
      name: 'focus on the key lands above the docked band',
      viewports: ['390x664', '360x780'],
      async run(t) {
        await t.reload();
        await t.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        let found = false;
        for (let i = 0; i < 40 && !found; i++) {
          await t.page.keyboard.press('Tab');
          await sleep(60);
          found = await t.page.evaluate(() => document.activeElement?.id === 'key');
        }
        t.expect(found, 'Tab never reached the lid key');
        await sleep(400);
        const [key, lip] = await Promise.all([box(t.page, '#key'), box(t.page, '.lip')]);
        t.note('key / band', `${round(key)} / ${round(lip)}`);
        t.expect(inView(key, t.viewport.width, t.viewport.height), 'the focused key is not wholly in the viewport');
        t.expect(!!key && !!lip && key.bottom <= lip.top + 0.5, 'the focused key is under the band');
        // And every other control of the lid and the ticket: none lands under the docked band.
        const under: string[] = [];
        for (let i = 0; i < 20; i++) {
          await t.page.keyboard.press('Tab');
          await sleep(120);
          const found: { name: string; hidden: boolean; out: boolean } | null = await t.page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            if (!el || !el.closest('#lid')) return null;
            const r = el.getBoundingClientRect();
            const lip = document.querySelector('.lip')!.getBoundingClientRect();
            const inLip = el.closest('.lip') !== null;
            return { name: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 20)}"`, hidden: !inLip && r.bottom > lip.top + 0.5 && r.top < lip.bottom, out: r.bottom > innerHeight + 0.5 };
          });
          if (!found) break;
          if (found.hidden || found.out) under.push(found.name);
        }
        for (const name of under) t.expect(false, `${name} has focus under the band or below the fold`);
      },
    },
    {
      name: "the spark wheel's touch zone: 44 px and nobody else's",
      viewports: ['390x844', '360x780', '320x568', '844x390', '932x430'],
      async run(t) {
        const zone: { w: number; h: number; misses: string[] } = await t.page.evaluate(() => {
          const wheel = document.querySelector<HTMLElement>('.spark-wheel')!;
          const r = wheel.getBoundingClientRect();
          const cs = getComputedStyle(wheel, '::before');
          const px = (v: string) => parseFloat(v) || 0;
          // The pseudo element's insets count from the wheel's padding box, inside its border.
          const own = getComputedStyle(wheel);
          const pad = { l: r.left + px(own.borderLeftWidth), t: r.top + px(own.borderTopWidth), r: r.right - px(own.borderRightWidth), b: r.bottom - px(own.borderBottomWidth) };
          const z = cs.content === 'none'
            ? { l: r.left, t: r.top, r: r.right, b: r.bottom }
            : { l: Math.min(r.left, pad.l + px(cs.left)), t: Math.min(r.top, pad.t + px(cs.top)), r: Math.max(r.right, pad.r - px(cs.right)), b: Math.max(r.bottom, pad.b - px(cs.bottom)) };
          const misses: string[] = [];
          for (const [name, x, y] of [['top-left', z.l + 1, z.t + 1], ['top-right', z.r - 1, z.t + 1], ['bottom-left', z.l + 1, z.b - 1], ['bottom-right', z.r - 1, z.b - 1], ['center', (z.l + z.r) / 2, (z.t + z.b) / 2]] as const) {
            const hit = document.elementFromPoint(x, y);
            if (!hit || !wheel.contains(hit)) misses.push(`${name} lands on ${hit ? hit.tagName.toLowerCase() + [...hit.classList].map((c) => `.${c}`).join('') : 'nothing'}`);
          }
          return { w: z.r - z.l, h: z.b - z.t, misses };
        });
        t.note('zone', `${Math.round(zone.w)}×${Math.round(zone.h)}`);
        t.expect(zone.w >= 44 && zone.h >= 44, `the wheel's touch zone is ${Math.round(zone.w)}×${Math.round(zone.h)} px`);
        for (const m of zone.misses) t.expect(false, `the zone's ${m}`);
      },
    },
    {
      name: 'credit and footer links take a 44 px touch without moving the layout',
      viewports: ['390x844', '360x780'],
      async run(t) {
        const found: { misses: string[]; overlaps: string[]; moved: string[]; probed: number } = await t.page.evaluate(() => {
          const links = [...document.querySelectorAll<HTMLElement>('a.credit, .colophon a')];
          const misses: string[] = [];
          const overlaps: string[] = [];
          let probed = 0;
          const name = (a: Element) => `"${(a.textContent ?? '').trim().slice(0, 24)}"`;
          for (const a of links) {
            a.scrollIntoView({ block: 'center', behavior: 'instant' });
            for (const rect of a.getClientRects()) {
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const points: [string, number, number][] = [['up', cx, cy - 21], ['down', cx, cy + 21]];
              if (rect.width >= 44) points.push(['left', cx - 21, cy], ['right', cx + 21, cy]);
              for (const [dir, x, y] of points) {
                probed++;
                const hit = document.elementFromPoint(x, y);
                const owner = hit?.closest('a');
                if (owner !== a) (owner && links.includes(owner) ? overlaps : misses).push(`${name(a)} probe ${dir} lands on ${owner ? name(owner) : hit?.tagName.toLowerCase()}`);
              }
            }
          }
          // The hit areas must not move a line: the paragraphs keep their boxes without them.
          const blocks = [...document.querySelectorAll<HTMLElement>('.provenance, .colophon > p')];
          const boxes = blocks.map((b) => b.getBoundingClientRect());
          const style = document.createElement('style');
          style.textContent = 'a.credit, .colophon a { padding-block: 0 !important; margin-block: 0 !important; }';
          document.head.append(style);
          const moved = blocks.flatMap((b, i) => {
            const r = b.getBoundingClientRect();
            return Math.abs(r.top - boxes[i].top) > 0.5 || Math.abs(r.height - boxes[i].height) > 0.5 ? [`${b.className || 'p'} moves by ${Math.round(r.top - boxes[i].top)} px / ${Math.round(r.height - boxes[i].height)} px`] : [];
          });
          style.remove();
          window.scrollTo({ top: 0, behavior: 'instant' });
          return { misses, overlaps, moved, probed };
        });
        t.note('probes', found.probed);
        for (const m of found.misses) t.expect(false, m);
        for (const o of found.overlaps) t.expect(false, o);
        for (const m of found.moved) t.expect(false, m);
      },
    },
    {
      name: 'reduced motion: the bed prints at once and nothing runs at rest',
      viewports: ['390x844'],
      async run(t) {
        const { page, touch } = await t.open({ reducedMotion: 'reduce' });
        const demo = await logText(page);
        t.expect(!/demo flight left home/.test(demo), 'a demo flight left under reduced motion');
        await skipGrind(page);
        await page.evaluate(() => document.querySelector('.press-row[data-row="inks"]')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await sleep(800);
        const before = await bedPixels(page);
        const label: Point | null = await page.evaluate(() => {
          const r = document.querySelector('.press input[name="inks"][value="1bit"]')?.closest('label')?.getBoundingClientRect();
          return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
        });
        if (!label || !before) return void t.expect(false, 'no bed or no One-ink switch');
        await touch.tap(label.x, label.y);
        await sleep(150);
        const printed = await bedPixels(page);
        t.expect(printed?.colors === 2, `150 ms after "One-ink press" the bed shows ${printed?.colors} colors (it should print at once, with no dissolve)`);
        const running: number = await page.evaluate(() => document.querySelector('.press-bed')?.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length ?? 0);
        t.expect(running === 0, `${running} animations run on the bed`);
      },
    },
  ],
};

export default check;
