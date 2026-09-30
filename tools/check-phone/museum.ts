/**
 * Phone checks of the museum at `/` (design adapt-for-phones D4 and D5; specs playground-museum and
 * phone-ergonomics). A page module of tools/check-phone.ts: run it through that tool, for example
 *
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/check-phone.ts phone museum --base <dev>
 *
 * The chrome while reading (the shedding bar and the clock bar), the scrubber's width, drag and exposed
 * position (with a mouse on a desktop too: the scrubber fix is not gated), the ground line that scrolls
 * and the grip that folds, jumps under the sticky row, the fold kept in view, the landscape range and the
 * re-flowed index.
 */

import type { Check, CheckContext, Page, PageCheck, Touch } from '../check-phone.ts';

const PORTRAIT = ['390x844', '390x664', '360x780', '430x932', '320x568'];
const LANDSCAPE = ['844x390', '932x430', '667x375'];
/** The fold's 3D code, requested only with the first fold (playground-museum "The fold"). */
const FOLD_CODE = /fold|three|Engine/;
const FRAMES = 45;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const fmt = (b: Box | null) => (b ? `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}` : 'none');

/** The box of the `index`-th element matching `selector`, or null. */
function boxOf(page: Page, selector: string, index = 0): Promise<Box | null> {
  return page.evaluate(
    ({ selector, index }: { selector: string; index: number }) => {
      const el = document.querySelectorAll(selector)[index];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    },
    { selector, index },
  );
}

/** Scrolls the element to the middle of the viewport (between the bars) and returns its box. */
function center(page: Page, selector: string, index = 0): Promise<Box | null> {
  return page.evaluate(
    ({ selector, index }: { selector: string; index: number }) => {
      const el = document.querySelectorAll(selector)[index];
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    },
    { selector, index },
  );
}

const scrollY = (page: Page): Promise<number> => page.evaluate(() => window.scrollY);
const pressed = (page: Page, sheet: string): Promise<string | null> =>
  page.evaluate((sheet: string) => document.querySelector(`#sheet-${sheet} [data-action="fold"]`)?.getAttribute('aria-pressed') ?? null, sheet);
/** How many resources the page has requested so far, and those after `from` that are the fold's 3D code. */
const resources = (page: Page, from = 0): Promise<{ count: number; fold: string[] }> =>
  page.evaluate(
    ({ from, source }: { from: number; source: string }) => {
      const names = performance.getEntriesByType('resource').map((e) => e.name);
      return { count: names.length, fold: names.slice(from).filter((n) => new RegExp(source).test(n)) };
    },
    { from, source: FOLD_CODE.source },
  );

/** Waits until `test` holds on the page, or `ms` pass; returns whether it held. */
async function until(page: Page, test: () => boolean, ms: number): Promise<boolean> {
  try {
    await page.waitForFunction(test, null, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
}

/** The fold view of a sheet (3D, or the axonometry without WebGL2) exists and the page has stopped scrolling. */
async function foldShown(page: Page, sheet: string): Promise<boolean> {
  const shown = await until(page, () => !!document.querySelector('.sheet .fold-view, .sheet .fold-axo'), 15_000);
  if (!shown) return false;
  // A smooth scroll after the fold: wait until scrollY holds for half a second.
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await scrollY(page);
    if (y === last) break;
    last = y;
    await sleep(500);
  }
  return (await pressed(page, sheet)) === 'true';
}

// ── Scrubber (task 2.2): no drag autoscroll, no selection, and a truthful exposed position ──────────

interface Scrub {
  box: Box;
  knob: number;
  value: number;
  text: string;
  chasing: boolean;
  focused: boolean;
}

const readScrub = (page: Page): Promise<Scrub> =>
  page.evaluate(() => {
    const scrub = document.querySelector<HTMLElement>('.clock__scrub')!;
    const r = scrub.getBoundingClientRect();
    return {
      box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
      knob: Math.round(parseFloat(scrub.style.getPropertyValue('--pos') || '0') * 44) + 1,
      value: Number(scrub.getAttribute('aria-valuenow')),
      text: scrub.getAttribute('aria-valuetext') ?? '',
      chasing: 'chasing' in scrub.dataset,
      focused: document.activeElement === scrub,
    };
  });

const selected = (page: Page): Promise<string> => page.evaluate(() => getSelection()?.toString() ?? '');

/**
 * A drag as untrusted pointer events of a finger, for WebKit, where the core's synthetic touch cannot be
 * built: the grip and the fold listen to pointer events only.
 */
async function pointerDrag(page: Page, x: number, y: number, dx: number, dy: number, steps = 24): Promise<void> {
  const fire = (type: string, px: number, py: number) =>
    page.evaluate(
      ({ type, px, py, x, y }: { type: string; px: number; py: number; x: number; y: number }) => {
        const w = window as unknown as { __cpDrag?: Element };
        if (type === 'pointerdown') w.__cpDrag = document.elementFromPoint(x, y) ?? document.body;
        const init = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: px, clientY: py, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1 };
        w.__cpDrag!.dispatchEvent(new PointerEvent(type, init));
      },
      { type, px, py, x, y },
    );
  await fire('pointerdown', x, y);
  for (let i = 1; i <= steps; i++) {
    await sleep(16);
    await fire('pointermove', x + (dx * i) / steps, y + (dy * i) / steps);
  }
  await fire('pointerup', x + dx, y + dy);
}

/**
 * A drag along the scrubber: with the mouse, or with a finger (CDP in Chromium). The mouse drifts 6 px
 * down and holds before it lets go, as a hand does: that is what started the browser's drag autoscroll
 * before the fix (a press on the knob, or a drag that leaves the rail, ran the page to the top).
 */
async function dragScrub(page: Page, touch: Touch | null, from: number, to: number, y: number): Promise<void> {
  if (touch?.native) {
    await touch.drag(from, y, to - from, 0, 400);
    return;
  }
  await page.mouse.move(from, y);
  await page.mouse.down();
  const steps = Math.max(12, Math.round(Math.abs(to - from) / 6));
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from + ((to - from) * i) / steps, y + (6 * i) / steps);
    await sleep(40);
  }
  await sleep(600);
  await page.mouse.up();
}

/** A 12 px drag and a full-width drag with the page halfway down, then the right arrow key. */
async function scrubberDrag(t: CheckContext, page: Page, touch: Touch | null, where: string): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) / 2, behavior: 'instant' }));
  await sleep(400);
  const y0 = await scrollY(page);
  let s = await readScrub(page);
  const y = s.box.top + s.box.height / 2;
  // From the knob.
  const knob = s.box.left + ((s.knob - 1) / 44) * (s.box.width - 3) + 1;
  await dragScrub(page, touch, knob, knob + 12, y);
  await sleep(400);
  const y1 = await scrollY(page);
  t.expect(Math.abs(y1 - y0) < 1, `${where}: a 12 px drag on the scrubber scrolled the page by ${Math.round(y1 - y0)} px`);
  t.expect((await selected(page)) === '', `${where}: a 12 px drag on the scrubber selected "${(await selected(page)).slice(0, 30)}"`);
  // The whole width, right to left: it ends at frame 1, so the arrow key has room to move.
  await dragScrub(page, touch, s.box.right - 1, s.box.left + 1, y);
  await until(page, () => !('chasing' in document.querySelector<HTMLElement>('.clock__scrub')!.dataset), 5000);
  const y2 = await scrollY(page);
  s = await readScrub(page);
  t.expect(Math.abs(y2 - y0) < 1, `${where}: a full-width drag on the scrubber scrolled the page by ${Math.round(y2 - y0)} px`);
  t.expect((await selected(page)) === '', `${where}: a full-width drag on the scrubber selected text`);
  t.expect(s.knob === 1, `${where}: after a full-width drag to the left the knob is at frame ${s.knob}, not 1`);
  t.expect(s.focused, `${where}: the scrubber has no focus after the drag`);
  t.expect(s.value === s.knob && /held$/.test(s.text), `${where}: after the drag the exposed position is ${s.value} ("${s.text}") and the knob ${s.knob}`);
  await page.keyboard.press('ArrowRight');
  await until(page, () => !('chasing' in document.querySelector<HTMLElement>('.clock__scrub')!.dataset), 3000);
  const after = await readScrub(page);
  t.expect(after.knob === s.knob + 1, `${where}: the right arrow key after the drag moved the knob from ${s.knob} to ${after.knob}`);
  t.expect(after.value === after.knob, `${where}: after the arrow key the exposed position is ${after.value} and the knob ${after.knob}`);
  t.note(`${where} scroll moved`, [Math.round(y1 - y0), Math.round(y2 - y0)]);
}

/** Circular distance between two loop frames (1-based). */
const apart = (a: number, b: number) => {
  const d = Math.abs(a - b) % FRAMES;
  return Math.min(d, FRAMES - d);
};

/** The exposed position while the clock runs: sampled every 100 ms for 6 s unfocused, then 5 s focused, then K. */
async function scrubberAria(t: CheckContext, page: Page, where: string): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelector<HTMLButtonElement>('.clock__state--forward')!.click();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await sleep(1200);
  const samples: { t: number; value: number; text: string; knob: number }[] = await page.evaluate(
    () =>
      new Promise((done) => {
        const scrub = document.querySelector<HTMLElement>('.clock__scrub')!;
        const out: { t: number; value: number; text: string; knob: number }[] = [];
        const start = performance.now();
        const timer = setInterval(() => {
          out.push({
            t: performance.now() - start,
            value: Number(scrub.getAttribute('aria-valuenow')),
            text: scrub.getAttribute('aria-valuetext') ?? '',
            knob: Math.round(parseFloat(scrub.style.getPropertyValue('--pos') || '0') * 44) + 1,
          });
          if (performance.now() - start >= 6000) {
            clearInterval(timer);
            done(out);
          }
        }, 100);
      }),
  );
  const worst = Math.max(...samples.map((s) => apart(s.value, s.knob)));
  const changes = samples.filter((s, i) => i > 0 && s.value !== samples[i - 1].value).map((s) => s.t);
  const gaps = changes.slice(1).map((c, i) => c - changes[i]);
  const bad = samples.find((s) => s.text !== `frame ${s.value} of ${FRAMES}, playing forward`);
  t.note(`${where} unfocused`, { worst, changes: changes.length, shortestGap: gaps.length ? Math.round(Math.min(...gaps)) : null });
  t.expect(worst <= 16, `${where}: unfocused, the exposed position trailed the knob by up to ${worst} frames (at most 16)`);
  t.expect(changes.length >= 4, `${where}: unfocused, the exposed position changed only ${changes.length} times in 6 s`);
  t.expect(gaps.every((g) => g >= 900), `${where}: unfocused, the exposed position changed twice within ${Math.round(Math.min(...gaps))} ms`);
  t.expect(!bad, `${where}: unfocused, the exposed text read "${bad?.text}" for position ${bad?.value}`);

  const onFocus: { value: number; knob: number } = await page.evaluate(() => {
    const scrub = document.querySelector<HTMLElement>('.clock__scrub')!;
    scrub.focus({ preventScroll: true });
    return { value: Number(scrub.getAttribute('aria-valuenow')), knob: Math.round(parseFloat(scrub.style.getPropertyValue('--pos') || '0') * 44) + 1 };
  });
  t.expect(onFocus.value === onFocus.knob, `${where}: on focus the exposed position is ${onFocus.value} and the knob ${onFocus.knob}`);
  const held: number[] = [];
  for (let i = 0; i < 25; i++) {
    await sleep(200);
    held.push((await readScrub(page)).value);
  }
  const moving = (await readScrub(page)).knob;
  t.expect(new Set(held).size === 1 && held[0] === onFocus.value, `${where}: with focus while running the exposed position changed (${[...new Set(held)].join(', ')})`);
  t.expect(moving !== onFocus.knob, `${where}: the clock did not run during the focused wait`);
  await page.keyboard.press('k');
  await sleep(200);
  const after = await readScrub(page);
  t.expect(after.value === after.knob && after.text === `frame ${after.knob} of ${FRAMES}, held`, `${where}: after K the exposed position is ${after.value} ("${after.text}") and the knob ${after.knob}`);
}

// ── The checks ────────────────────────────────────────────────────────────────────────────────────

const checks: Check[] = [
  {
    name: 'chrome while reading',
    viewports: PORTRAIT,
    async run(t) {
      const { page } = t;
      const atTop = await page.evaluate(() => {
        const bar = document.querySelector('.bar')!.getBoundingClientRect();
        const title = document.querySelector('h1')!.getBoundingClientRect();
        return { bar: bar.height, title: title.top >= 0 && title.bottom <= bar.bottom };
      });
      t.expect(atTop.bar <= 76, `at the top the bar is ${Math.round(atTop.bar)} px tall (at most 76)`);
      t.expect(atTop.title, 'at the top the collection title is not visible in the bar');
      await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
      await sleep(400);
      const read = await page.evaluate(() => {
        const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        const seen = (s: string) => {
          const el = document.querySelector(s)!;
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return r.top >= 0 && r.bottom <= innerHeight && !!hit && el.contains(hit);
        };
        return {
          barBottom: box('.bar').bottom,
          clock: box('.clock').height,
          visible: ['.bar__link[href="#index"]', '.bar__sound', '.clock__state--rewind', '.clock__state--hold', '.clock__state--forward'].filter((s) => !seen(s)),
        };
      });
      t.note('stuck bar and clock', [Math.round(read.barBottom), Math.round(read.clock)]);
      t.expect(read.barBottom <= 46, `once past the title the sticky bar reaches ${Math.round(read.barBottom)} px (at most 46)`);
      t.expect(read.clock <= 80, `the clock bar is ${Math.round(read.clock)} px tall (at most 80)`);
      if (t.viewport.width === 390 && t.viewport.height === 844) t.expect(read.barBottom + read.clock <= 127, `bar and clock take ${Math.round(read.barBottom + read.clock)} px (at most 127, 15% of 844)`);
      t.expect(read.visible.length === 0, `not visible while reading: ${read.visible.join(', ')}`);
    },
  },
  {
    name: 'scrubber width',
    viewports: PORTRAIT,
    async run(t) {
      const box = await boxOf(t.page, '.clock__scrub');
      const need = t.viewport.width >= 360 ? 120 : 80;
      t.note('scrubber', Math.round(box?.width ?? 0));
      t.expect(!!box && box.width >= need, `the scrubber is ${Math.round(box?.width ?? 0)} px wide (at least ${need})`);
    },
  },
  {
    name: 'ground line scrolls',
    async run(t) {
      const { page, touch } = t;
      if (!touch.native) return t.skip('no native touch');
      const before = await resources(page);
      const sheets: string[] = await page.evaluate(() => [...document.querySelectorAll('.sheet [data-action="fold"]')].map((b) => b.closest<HTMLElement>('.sheet')!.dataset.sheet!).filter((n) => n !== '000'));
      // From 80 % along the ground line (the brief's probe) where that is away from the grip, and 60 px
      // left of the épure's right edge. The grip's hit area covers the line's last 44 px.
      for (const [label, at] of [['80 %', (b: Box) => b.left + 0.8 * b.width], ['60 px from the right edge', (b: Box) => b.right - 60]] as const) {
        for (const sheet of ['004', '001']) {
          if (!sheets.includes(sheet)) continue;
          const hinge = await center(page, `#sheet-${sheet} .ep-hinge`);
          if (!t.expect(!!hinge, `sheet ${sheet} has no ground line`) || !hinge) continue;
          if (hinge.right - at(hinge) < 60) continue;
          await sleep(200);
          const y = hinge.top + hinge.height / 2;
          const travel = Math.min(250, y - 8);
          const moved = await touch.swipe(at(hinge), y, 0, -travel);
          t.note(`sheet ${sheet}, ${label}`, Math.round(moved));
          t.expect(moved >= Math.min(200, travel * 0.8), `a ${Math.round(travel)} px swipe up from the ground line of sheet ${sheet} (${label}) scrolled ${Math.round(moved)} px`);
          t.expect((await pressed(page, sheet)) === 'false', `a swipe on the ground line of sheet ${sheet} folded it`);
        }
      }
      const after = await resources(page, before.count);
      t.expect(after.fold.length === 0, `a swipe on the ground line requested the fold's code: ${after.fold.slice(0, 3).join(', ')}`);
    },
  },
  {
    name: 'swipe over the épures between the bars',
    async run(t) {
      const { page, touch } = t;
      if (!touch.native) return t.skip('no native touch');
      const count: number = await page.evaluate(() => document.querySelectorAll('.sheet__epure').length);
      const moves: number[] = [];
      for (let i = 0; i < count; i++) {
        // The épure's top just under the sticky row; the finger starts on its lowest point above the clock
        // bar, away from the grip, and moves up.
        const start: { x: number; y: number; room: number } = await page.evaluate((i: number) => {
          const figure = document.querySelectorAll('.sheet__epure')[i];
          figure.scrollIntoView({ block: 'start', behavior: 'instant' });
          const r = figure.getBoundingClientRect();
          const floor = document.querySelector('.clock')!.getBoundingClientRect().top;
          return { x: r.left + 0.3 * r.width, y: Math.min(r.bottom, floor) - 8, room: document.documentElement.scrollHeight - innerHeight - window.scrollY };
        }, i);
        await sleep(200);
        const travel = Math.min(250, start.y - 8);
        const moved = await touch.swipe(start.x, start.y, 0, -travel);
        moves.push(Math.round(moved));
        const need = Math.min(0.6 * travel, start.room);
        t.expect(moved + 1 >= need, `épure ${i}: a ${Math.round(travel)} px swipe up from its lowest visible point moved the page ${Math.round(moved)} px (at least ${Math.round(need)})`);
      }
      t.note('moved', moves);
      const folded: number = await page.evaluate(() => document.querySelectorAll('.sheet [data-action="fold"][aria-pressed="true"]').length);
      t.expect(folded === 0, `a swipe over an épure folded ${folded} sheet(s)`);
    },
  },
  {
    name: 'targets between the bars',
    webkit: true,
    async run(t) {
      // Every control of the page, brought between the sticky row and the clock bar (the controls in the
      // bars stay where they are), is hit 21 px from its center in the four directions.
      const misses: string[] = [];
      // A fling left by an earlier swipe must not move the page while it is probed.
      await sleep(1000);
      await t.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const count: number = await t.page.evaluate(() => document.querySelectorAll('.bar a, .bar button, .clock button, .clock [role="slider"], main a[href], main button, main summary, footer a[href], footer button').length);
      for (let i = 0; i < count; i++) {
        const miss: string | null = await t.page.evaluate((i: number) => {
          const el = document.querySelectorAll<HTMLElement>('.bar a, .bar button, .clock button, .clock [role="slider"], main a[href], main button, main summary, footer a[href], footer button')[i];
          if (!el.checkVisibility({ checkVisibilityCSS: true })) return null;
          const own = el.getBoundingClientRect();
          if (own.width < 4 || own.height < 4) return null;
          // A link inside running text is exempt (WCAG 2.5.8).
          if (getComputedStyle(el).display === 'inline' && (el.parentElement?.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 2) return null;
          const bar = el.closest('.bar, .clock');
          const pinned = !!bar && ['fixed', 'sticky'].includes(getComputedStyle(bar).position);
          if (!pinned) el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const missed = [
            ['left', cx - 21, cy],
            ['right', cx + 21, cy],
            ['up', cx, cy - 21],
            ['down', cx, cy + 21],
          ].filter(([, x, y]) => {
            const hit = document.elementFromPoint(x as number, y as number);
            return !hit || !el.contains(hit);
          }).map(([name]) => name);
          const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28);
          return missed.length ? `${el.tagName.toLowerCase()}.${el.classList[0] ?? ''} "${name}" (${Math.round(r.width)}×${Math.round(r.height)}) misses ${missed.join(', ')}` : null;
        }, i);
        if (miss && !misses.includes(miss)) misses.push(miss);
      }
      t.note('controls', count);
      t.expect(misses.length === 0, misses.join('; '));
    },
  },
  {
    name: 'grips on the ground line',
    async run(t) {
      const { page } = t;
      const grips: { sheet: string; grip: Box; hinge: Box; epure: Box; mark: Box; inW: number }[] = await page.evaluate(() => {
        const out = [];
        for (const grip of document.querySelectorAll<HTMLElement>('.ep-grip')) {
          grip.scrollIntoView({ block: 'center', behavior: 'instant' });
          const figure = grip.closest('.sheet__epure')!;
          const box = (r: DOMRect) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
          const g = grip.getBoundingClientRect();
          const mark = getComputedStyle(grip, '::before');
          const size = parseFloat(mark.width);
          out.push({
            sheet: grip.closest<HTMLElement>('.sheet')!.dataset.sheet!,
            grip: box(g),
            hinge: box(figure.querySelector('.ep-hinge')!.getBoundingClientRect()),
            epure: box(figure.querySelector('svg.epure')!.getBoundingClientRect()),
            mark: { left: g.right - size, top: g.top + parseFloat(mark.top), right: g.right, bottom: g.top + parseFloat(mark.top) + size, width: size, height: size },
            inW: innerWidth,
          });
        }
        return out;
      });
      const figures: number = await page.evaluate(() => [...document.querySelectorAll('.sheet__epure')].filter((f) => f.querySelector('.ep-hinge')).length);
      t.expect(grips.length === figures && figures > 0, `${grips.length} grips for ${figures} épures with a ground line`);
      for (const g of grips) {
        const line = g.hinge.top + g.hinge.height / 2;
        t.expect(g.grip.width >= 44 && g.grip.height >= 44, `sheet ${g.sheet}: the grip's hit area is ${fmt(g.grip)}`);
        t.expect(g.grip.left >= 0 && g.grip.right <= g.inW + 0.5, `sheet ${g.sheet}: the grip's hit area ${fmt(g.grip)} leaves the ${g.inW} px viewport`);
        t.expect(Math.abs(g.mark.right - g.epure.right) <= 1, `sheet ${g.sheet}: the grip mark ends at ${Math.round(g.mark.right)}, the épure at ${Math.round(g.epure.right)}`);
        t.expect(Math.abs((g.mark.top + g.mark.bottom) / 2 - line) <= 1.5, `sheet ${g.sheet}: the grip mark is centered at ${Math.round((g.mark.top + g.mark.bottom) / 2)}, the ground line at ${Math.round(line)}`);
      }
      t.note('grips', grips.map((g) => `${g.sheet} ${fmt(g.grip)}`));
    },
  },
  {
    name: 'grip drag and tap fold',
    viewports: ['390x844', '360x780', '844x390', '390x664'],
    webkit: true,
    async run(t) {
      for (const gesture of ['drag', 'tap'] as const) {
        const { page, touch } = await t.open();
        const grip = await center(page, '#sheet-003 .ep-grip');
        if (!t.expect(!!grip, 'sheet 003 has no grip') || !grip) return;
        await sleep(300);
        const x = grip.right - 12;
        const y = grip.top + grip.height / 2;
        if (gesture === 'tap') await touch.tap(x, y);
        else if (touch.native) await touch.drag(x, y, 0, -120, 500);
        else await pointerDrag(page, x, y, 0, -120);
        const folded = await foldShown(page, '003');
        t.expect(folded, `a ${gesture} on the grip of sheet 003 did not fold it`);
        if (gesture === 'drag' && folded) await t.screenshot('grip-drag-folded', page);
      }
    },
  },
  {
    name: 'jumps land under the sticky row',
    viewports: PORTRAIT,
    async run(t) {
      const { page, touch } = t;
      const index = await boxOf(page, '.bar__link[href="#index"]');
      if (!index) return void t.expect(false, 'no index link');
      await touch.tap(index.left + index.width / 2, index.top + index.height / 2);
      await sleep(1200);
      const heading = await boxOf(page, '.index__heading');
      t.expect(!!heading && heading.top >= 45 && heading.top <= 70, `after Index the index heading's top is at ${Math.round(heading?.top ?? -1)} (45–70)`);
      const row = await center(page, '.index__row[data-sheet="003"] .index__link');
      if (!row) return void t.expect(false, 'no index row 003');
      await sleep(300);
      // On the row's poster: once the loops are cached, a press there used to swap it for the preview's
      // canvas between the press and the click, and the link was not followed.
      const thumb = await boxOf(page, '.index__row[data-sheet="003"] .index__thumb');
      await touch.tap(thumb ? thumb.left + thumb.width / 2 : row.left + 40, thumb ? thumb.top + thumb.height / 2 : row.top + row.height / 2);
      await sleep(1200);
      const sheet = await boxOf(page, '#sheet-003');
      const focus: string | null = await page.evaluate(() => document.activeElement?.id ?? null);
      t.expect(!!sheet && sheet.top >= 45 && sheet.top <= 70, `after the row of 003 the sheet's top is at ${Math.round(sheet?.top ?? -1)} (45–70)`);
      t.expect(focus === 'sheet-003', `after the row of 003 the focus is on ${focus}`);
      const deep = await t.open({ path: '/#sheet-003' });
      await sleep(6000);
      const landed = await boxOf(deep.page, '#sheet-003');
      t.expect(!!landed && landed.top >= 45 && landed.top <= 70, `/#sheet-003 puts the sheet's top at ${Math.round(landed?.top ?? -1)} (45–70)`);
      t.note('tops', [heading?.top, sheet?.top, landed?.top].map((v) => Math.round(v ?? -1)));
    },
  },
  {
    name: 'fold kept in view',
    viewports: ['390x844'],
    async run(t) {
      for (const reducedMotion of ['no-preference', 'reduce'] as const) {
        const { page, touch } = await t.open({ reducedMotion });
        const button = await boxOf(page, '.sheet--featured [data-action="fold"]');
        if (!button) return void t.expect(false, 'no Fold button on the featured sheet');
        await touch.tap(button.left + button.width / 2, button.top + button.height / 2);
        const folded = await foldShown(page, '004');
        const view = await boxOf(page, '.sheet--featured .fold-view, .sheet--featured .fold-axo');
        const clock = await boxOf(page, '.clock');
        t.note(`${reducedMotion}: fold view and clock top`, [fmt(view), Math.round(clock?.top ?? -1)]);
        t.expect(folded, `${reducedMotion}: "Fold" did not fold the featured sheet`);
        t.expect(!!view && !!clock && view.bottom <= clock.top + 0.5 && view.top >= 45, `${reducedMotion}: the fold view ${fmt(view)} is not whole between the bar and the clock (top ${Math.round(clock?.top ?? -1)})`);
        if (reducedMotion === 'no-preference') await t.screenshot('folded', page);
      }
      // A touch while the fold's code arrives: the page does not scroll by itself.
      const { page, touch } = await t.open();
      await page.route(/fold3d|fold\.ts|\/fold-/, async (route: any) => {
        await sleep(1200);
        await route.continue();
      });
      const button = await boxOf(page, '.sheet--featured [data-action="fold"]');
      const vista = await boxOf(page, '.sheet--featured .vista');
      if (!button || !vista) return void t.expect(false, 'no Fold button or VISTA on the featured sheet');
      const y0 = await scrollY(page);
      await touch.tap(button.left + button.width / 2, button.top + button.height / 2);
      await sleep(200);
      await touch.tap(vista.left + 20, vista.top + 20);
      const folded = await foldShown(page, '004');
      const y1 = await scrollY(page);
      t.expect(folded, 'with a touch during the fold, "Fold" did not fold the featured sheet');
      t.expect(Math.abs(y1 - y0) < 1, `a touch during the fold did not keep the page still: it scrolled ${Math.round(y1 - y0)} px`);
    },
  },
  {
    name: 'house pixels beside the fold',
    viewports: ['390x844', '390x664', '360x780', '844x390'],
    async run(t) {
      const { page, touch } = await t.open();
      const button = await center(page, '.sheet--featured [data-action="fold"]');
      if (!button) return void t.expect(false, 'no Fold button on the featured sheet');
      await sleep(300);
      await touch.tap(button.left + button.width / 2, button.top + button.height / 2);
      if (!t.expect(await foldShown(page, '004'), '"Fold" did not fold the featured sheet')) return;
      if (!(await page.evaluate(() => !!document.querySelector('.sheet--featured .house-pixels')))) return t.skip('no WebGL2: the axonometry has no "House pixels"');
      // The options brought just above the clock bar: the view they change stays on screen with them.
      const band: { view: number; fieldset: Box } = await page.evaluate(() => {
        const box = document.querySelector('.sheet--featured .house-pixels')!;
        const floor = document.querySelector('.clock')!.getBoundingClientRect().top;
        window.scrollBy({ top: box.getBoundingClientRect().bottom - (floor - 8), behavior: 'instant' });
        const ceiling = document.querySelector('.bar')!.getBoundingClientRect().bottom;
        const v = document.querySelector('.sheet--featured .fold-view')!.getBoundingClientRect();
        const r = box.getBoundingClientRect();
        const seen = Math.max(0, Math.min(v.bottom, floor) - Math.max(v.top, Math.max(0, ceiling)));
        return { view: seen / v.height, fieldset: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } };
      });
      // In portrait the whole option row and at least 85 % of the fold view share the screen. In landscape
      // the fold view (the épure's 17M box) is taller than the band between the bars: the options change
      // every view of the fold, so part of it on screen shows their effect (phone-ergonomics, global effect).
      const need = t.viewport.width > t.viewport.height ? 0.3 : 0.85;
      t.note('fold view visible with the options', Math.round(band.view * 100) / 100);
      t.expect(band.view >= need, `with "House pixels" above the clock only ${Math.round(band.view * 100)}% of the fold view is on screen (at least ${need * 100}%)`);
      const probes: { misses: string[]; overlaps: number } = await page.evaluate(() => {
        const misses: string[] = [];
        const labels = [...document.querySelectorAll<HTMLLabelElement>('.sheet--featured .house-pixels label')];
        for (const label of labels) {
          const radio = label.querySelector('input')!.getBoundingClientRect();
          const cx = radio.left + radio.width / 2;
          const cy = radio.top + radio.height / 2;
          for (const [name, x, y] of [['left', cx - 21, cy], ['right', cx + 21, cy], ['up', cx, cy - 21], ['down', cx, cy + 21]] as const) {
            const hit = document.elementFromPoint(x, y);
            if (!hit || !label.contains(hit)) misses.push(`${label.textContent} ${name}`);
          }
        }
        let overlaps = 0;
        const boxes = labels.map((l) => l.getBoundingClientRect());
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left) > 0.5 && Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top) > 0.5) overlaps++;
        return { misses, overlaps };
      });
      t.expect(probes.misses.length === 0, `"House pixels" probes 21 px from each radio miss its label: ${probes.misses.join(', ')}`);
      t.expect(probes.overlaps === 0, `${probes.overlaps} "House pixels" labels overlap`);
      const options: number = await page.evaluate(() => document.querySelectorAll('.sheet--featured .house-pixels label').length);
      for (let i = 0; i < options; i++) {
        const label = await boxOf(page, '.sheet--featured .house-pixels label', i);
        if (!label) continue;
        await touch.tap(label.left + label.width / 2, label.top + label.height / 2);
        await sleep(400);
        const state: { checked: boolean; view: number } = await page.evaluate((i: number) => {
          const input = document.querySelectorAll<HTMLInputElement>('.sheet--featured .house-pixels input')[i];
          const v = document.querySelector('.sheet--featured .fold-view')!.getBoundingClientRect();
          const floor = document.querySelector('.clock')!.getBoundingClientRect().top;
          const ceiling = Math.max(0, document.querySelector('.bar')!.getBoundingClientRect().bottom);
          return { checked: input.checked, view: Math.max(0, Math.min(v.bottom, floor) - Math.max(v.top, ceiling)) / v.height };
        }, i);
        t.expect(state.checked, `a tap on "House pixels" option ${i + 1} did not select it`);
        t.expect(state.view >= need, `after option ${i + 1} only ${Math.round(state.view * 100)}% of the fold view is on screen`);
        if (i === 0) await t.screenshot('house-pixels', page);
      }
    },
  },
  {
    name: 'index preview on intent (desktop)',
    viewports: ['390x844'],
    async run(t) {
      // A press no longer starts the preview (it took the click away from the poster); focus from the
      // keyboard and a pointer resting 300 ms still do (playground-museum "Preview in the index rows").
      const { page } = await t.open({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      let reached = false;
      for (let i = 0; i < 80 && !reached; i++) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(() => document.activeElement?.closest('.index__row')?.getAttribute('data-sheet') === '002');
      }
      if (!t.expect(reached, 'Tab never reached index row 002')) return;
      const byKeyboard = await until(page, () => !!document.querySelector('.index__row[data-sheet="002"] .index__thumb canvas'), 8000);
      t.expect(byKeyboard, 'keyboard focus on row 002 did not show its loop');
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const row = await center(page, '.index__row[data-sheet="003"] .index__link');
      if (!row) return void t.expect(false, 'no index row 003');
      await page.mouse.move(row.left + 30, row.top + row.height / 2);
      const byRest = await until(page, () => !!document.querySelector('.index__row[data-sheet="003"] .index__thumb canvas'), 8000);
      t.expect(byRest, 'a pointer resting on row 003 did not show its loop');
    },
  },
  {
    name: 'landscape',
    viewports: LANDSCAPE,
    async run(t) {
      const { page } = t;
      const read = await page.evaluate(() => {
        const box = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        const featured = document.querySelector('.sheet--featured')!;
        return {
          position: getComputedStyle(document.querySelector('.bar')!).position,
          clock: box(document.querySelector('.clock')),
          loop: box(featured.querySelector('.vista canvas') ?? featured.querySelector('.vista__poster')),
          now: box(featured.querySelector('.ep-now')),
          scrub: box(document.querySelector('.clock__scrub')),
        };
      });
      const clockTop = read.clock?.top ?? 0;
      t.note('clock, loop, NOW, scrubber', [fmt(read.clock), fmt(read.loop), fmt(read.now), fmt(read.scrub)]);
      t.expect(read.position === 'static', `the bar is ${read.position}, not static`);
      t.expect(!!read.clock && read.clock.height <= 48, `the clock bar is ${Math.round(read.clock?.height ?? 0)} px tall (at most 48)`);
      t.expect(!!read.loop && read.loop.width >= 221 && read.loop.top >= 0 && read.loop.bottom <= clockTop + 0.5, `the featured loop ${fmt(read.loop)} is not whole and at least 221 px above the clock (top ${Math.round(clockTop)})`);
      t.expect(!!read.now && read.now.top >= 0 && read.now.bottom <= clockTop, `the NOW in the elevation ${fmt(read.now)} is not visible above the clock`);
      t.expect(!!read.scrub && read.scrub.width >= 180 && read.scrub.left >= 0 && read.scrub.right <= t.viewport.width, `the scrubber ${fmt(read.scrub)} is not visible and at least 180 px wide`);
      const three = await page.evaluate(() => {
        document.getElementById('sheet-001')!.scrollIntoView({ block: 'start', behavior: 'instant' });
        return { clock: document.querySelector('.clock')!.getBoundingClientRect().top, vistas: [...document.querySelectorAll('#sheet-001 .vista')].map((v) => v.getBoundingClientRect().toJSON()) };
      });
      const v = three.vistas as Box[];
      const row = v.length === 3 && v.every((b) => Math.abs(b.top - v[0].top) <= 1) && v[0].right <= v[1].left && v[1].right <= v[2].left;
      t.note('001 VISTAS', v.map(fmt));
      t.expect(row, `sheet 001's VISTAS are not side by side: ${v.map(fmt).join(' / ')}`);
      t.expect(v.every((b) => b.top >= 0 && b.bottom <= three.clock + 0.5), `sheet 001's VISTAS are not whole above the clock (top ${Math.round(three.clock)}): ${v.map(fmt).join(' / ')}`);
      await t.screenshot('sheet-001', page);
    },
  },
  {
    name: 'index re-flow',
    viewports: ['390x844', '320x568'],
    async run(t) {
      const read: { list: number; dims: number[] } = await t.page.evaluate(() => ({
        list: document.querySelector('.index__list')!.getBoundingClientRect().height,
        dims: [...document.querySelectorAll<HTMLElement>('.index__link .index__dims')].filter((d) => d.textContent?.trim()).map((d) => {
          const range = document.createRange();
          range.selectNodeContents(d);
          return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        }),
      }));
      const most = t.viewport.width === 390 ? 960 : 1080;
      t.note('index height', Math.round(read.list));
      t.expect(read.list <= most, `the index list is ${Math.round(read.list)} px tall (at most ${most})`);
      if (t.viewport.width === 390) t.expect(read.dims.every((lines) => lines === 1), `index dimensions on more than one line: ${read.dims.join(', ')}`);
    },
  },
  {
    name: 'scrubber drag',
    viewports: ['390x844', '390x664'],
    webkit: true,
    async run(t) {
      // The fix is not gated: a mouse on a desktop, in both engines.
      if (t.browser === 'webkit' || t.viewport.height === 844) {
        const desk = await t.open({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
        await scrubberDrag(t, desk.page, null, `${t.browser} mouse 1440×900`);
      }
      // A finger on the phone. Playwright's WebKit has no trusted touch drag, and in its iPhone emulation
      // a mouse drag pans the page even over touch-action: none (the base commit pans the same 531 px), so
      // the phone drag is proven in Chromium and left to the real-iPhone pass in WebKit.
      if (t.browser === 'webkit') return t.note('phone drag', 'not measurable in WebKit emulation');
      const phone = await t.open();
      await scrubberDrag(t, phone.page, phone.touch, `touch ${t.viewport.width}×${t.viewport.height}`);
    },
  },
  {
    name: 'scrubber exposed position',
    viewports: ['390x844'],
    async run(t) {
      const phone = await t.open();
      await scrubberAria(t, phone.page, 'phone');
      const desk = await t.open({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      await scrubberAria(t, desk.page, 'desktop');
    },
  },
];

const museum: PageCheck = {
  pages: ['museum'],
  setup: {
    museum: {
      // The épures are swiped by 'swipe over the épures between the bars': in landscape an épure is taller
      // than the band between the bars, and the core's swipe, which starts on a visual's lowest visible
      // point, would start on the fixed clock bar (its scrubber) instead of the drawing.
      visuals: ['.vista'],
      // Focus is never under the sticky bar or the clock bar, and neither animates under reduced motion.
      panels: ['.bar', '.clock'],
      contrast: [
        { selector: '.sheet--featured .ep-grip', kind: 'glyph', webkit: true },
        { selector: '.clock__line', kind: 'text' },
        { selector: '.clock__state--hold', kind: 'text' },
        { selector: '.clock__state--forward', kind: 'text' },
        { selector: '.clock__scrub', kind: 'glyph' },
        { selector: '.clock__scrub', kind: 'focus' },
      ],
    },
  },
  checks,
};

export default museum;
