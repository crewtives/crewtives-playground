/**
 * Phone checks of 4D.OS worlds A "Vitrine", B "Plate" and C "Leader" (design adapt-for-phones D9; specs
 * desktop-shell "Narrow viewport", story-page "Footer with dotted wireframe" and phone-ergonomics). A
 * page module of tools/check-phone.ts: run it through that tool, for example
 *
 *   npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/check-phone.ts phone a b c --base <dev> --os <dev-4d>
 *
 * The window dock: every tool window opened from its button while the view it acts on is on screen (A
 * and C in the flow under the transport, B inside the pinned hero with the plate framed above the open
 * card), windows painted when first opened, a layer turned off while watching, swipes that scroll from
 * the dock, a window and the view, B's button rows, the keyboard (order, Enter, Escape), landscape
 * layouts, and the footer tails of B and C.
 */

import type { Check, CheckContext, Page, PageCheck } from '../check-phone.ts';

const PORTRAIT = ['390x844', '390x664', '360x780', '430x932'];
const LANDSCAPE = ['844x390', '932x430'];
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The dock's windows of each world, in button order. */
const WINDOWS: Record<'a' | 'b' | 'c', string[]> = {
  a: ['layers', 'display', 'source', 'plan', 'clock'],
  b: ['sequence', 'exposures', 'layers', 'display', 'source', 'clock'],
  c: ['layers', 'display', 'source', 'clock'],
};
/** What each world's windows act on: A's display case, B's plate, C's gate. */
const VIEW: Record<'a' | 'b' | 'c', string> = { a: '[data-view="scene"]', b: '[data-view="scene"]', c: '.gate' };

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const boxOf = (page: Page, selector: string): Promise<Box | null> =>
  page.evaluate((selector: string) => {
    const el = document.querySelector(selector);
    if (!el || !el.checkVisibility({ checkVisibilityCSS: true })) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }, selector);

const whole = (b: Box | null, w: number, h: number) => !!b && b.top >= -0.5 && b.left >= -0.5 && b.bottom <= h + 0.5 && b.right <= w + 0.5;
const meet = (a: Box, b: Box) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
const fmt = (b: Box | null) => (b ? `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}` : 'none');
const worldOf = (t: CheckContext) => t.key as 'a' | 'b' | 'c';

async function scrollInstant(page: Page, y: number): Promise<number> {
  await page.evaluate((top: number) => window.scrollTo({ left: 0, top, behavior: 'instant' }), y);
  await sleep(200);
  return page.evaluate(() => scrollY);
}

/** Taps a dock button by touch until its window is in the wanted state (open or closed). */
async function setWindow(t: CheckContext, name: string, open: boolean): Promise<boolean> {
  const selector = `.dock__button[data-dock-window="${name}"]`;
  const state = () => t.page.evaluate((s: string) => document.querySelector(s)?.getAttribute('aria-expanded'), selector);
  if ((await state()) === String(open)) return true;
  const b = await boxOf(t.page, selector);
  if (!b || b.top < 0 || b.bottom > t.viewport.height) {
    // Off screen: pressed without touch (the dock's own logic is the same).
    await t.page.evaluate((s: string) => document.querySelector<HTMLButtonElement>(s)?.click(), selector);
  } else await t.touch.tap(b.left + b.width / 2, b.top + b.height / 2);
  await sleep(350);
  return (await state()) === String(open);
}

/** Opens `name` and closes every other docked window (the default of A and C is Layers open). */
const openOnly = (t: CheckContext, name: string) => setWindow(t, name, true);

async function closeAll(t: CheckContext): Promise<void> {
  for (const name of WINDOWS[worldOf(t)]) await setWindow(t, name, false);
}

/** The largest fraction of the view on screen while the window is whole, over the page's scroll range. */
async function bestTogether(page: Page, win: string, view: string): Promise<{ fraction: number; y: number }> {
  return page.evaluate(
    async ({ win, view }: { win: string; view: string }) => {
      const w = document.querySelector(win)!;
      const v = document.querySelector(view)!;
      const start = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      let best = { fraction: 0, y: -1 };
      for (let y = 0; y <= max; y += 4) {
        window.scrollTo({ left: 0, top: y, behavior: 'instant' });
        const a = w.getBoundingClientRect();
        if (a.top < -0.5 || a.bottom > innerHeight + 0.5) {
          if (a.top > innerHeight) break;
          continue;
        }
        const b = v.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)) / b.height;
        if (fraction > best.fraction) best = { fraction, y };
      }
      window.scrollTo({ left: 0, top: start, behavior: 'instant' });
      return best;
    },
    { win, view },
  );
}

/** B: where the camera puts the subject and, at the full plate, the whole climb, as fractions of the plate's height. */
async function plateProjection(page: Page): Promise<{ target: number; box: [number, number] } | null> {
  return page.evaluate(() => {
    const b = (window as unknown as { __b?: { plate: { camera: any; controls: { target: any }; gpu: { subjectBounds: { min: any; max: any } } } } }).__b;
    if (!b) return null;
    const { camera, controls, gpu } = b.plate;
    camera.updateMatrixWorld();
    const y = (v: any) => (1 - v.clone().project(camera).y) / 2;
    const { min, max } = gpu.subjectBounds;
    const ys: number[] = [];
    for (let i = 0; i < 8; i++) ys.push(y(new min.constructor(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z)));
    return { target: y(controls.target), box: [Math.min(...ys), Math.max(...ys)] as [number, number] };
  });
}

/** B's hero travel: the scroll range over which the stage stays pinned. */
const heroTravel = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const track = document.querySelector('[data-hero]')!.getBoundingClientRect();
    return Math.max(0, track.height - innerHeight);
  });

const checks: Check[] = [
  {
    name: 'dock: each window beside the view it acts on',
    viewports: PORTRAIT,
    webkit: true,
    async run(t) {
      const key = worldOf(t);
      const { width: w, height: h } = t.viewport;
      const page = t.page;
      const figures: Record<string, string> = {};
      const samples = key === 'b' ? [0, 0.35, 0.92] : [0];
      const travel = key === 'b' ? await heroTravel(page) : 0;
      for (const fraction of samples) {
        for (const name of WINDOWS[key]) {
          const at = await scrollInstant(page, Math.round(travel * fraction));
          if (!t.expect(await openOnly(t, name), `${name}: the dock did not open it`)) continue;
          const win = `[data-window="${name}"]`;
          const after = await page.evaluate(() => scrollY);
          t.expect(Math.abs(after - at) < 1, `${name}: opening it scrolled the page from ${at} to ${after}`);
          const wb = await boxOf(page, win);
          const vb = await boxOf(page, VIEW[key]);
          if (!t.expect(!!wb && !!vb, `${name}: the window or the view is not visible`)) continue;
          if (key === 'a' && t.viewport.height >= 780) {
            t.expect(whole(wb, w, h) && whole(vb, w, h), `${name}: at scroll 0 the case (${fmt(vb)}) and the window (${fmt(wb)}) are not both whole`);
            figures[name] = `window ${fmt(wb)}, case ${fmt(vb)}`;
          } else if (key === 'a' || key === 'c') {
            const best = await bestTogether(page, win, VIEW[key]);
            figures[name] = `${Math.round(best.fraction * 100)}% of the view at scrollY ${best.y}`;
            t.expect(best.fraction >= 0.85, `${name}: at best ${Math.round(best.fraction * 100)}% of the view is on screen while the window is whole`);
          } else {
            // B: the card whole above the dock, nothing scrolling inside it, and the plate framed above it.
            const dock = (await boxOf(page, '.dock'))!;
            const inner: { own: [number, number]; body: [number, number]; band: string | null; plate: Box; caption: Box } = await page.evaluate((s: string) => {
              const el = document.querySelector<HTMLElement>(s)!;
              const body = el.querySelector<HTMLElement>('.win__body')!;
              const plate = document.querySelector<HTMLElement>('[data-view="scene"]')!;
              const box = (e: Element) => {
                const r = e.getBoundingClientRect();
                return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
              };
              return { own: [el.scrollHeight, el.clientHeight], body: [body.scrollHeight, body.clientHeight], band: plate.dataset.band ?? null, plate: box(plate), caption: box(document.querySelector('.caption')!) };
            }, win);
            t.expect(whole(wb, w, h) && wb!.bottom <= dock.top + 0.5, `${name}: the card ${fmt(wb)} is not whole above the dock (${fmt(dock)})`);
            t.expect(inner.own[0] <= inner.own[1] + 1 && inner.body[0] <= inner.body[1] + 1, `${name}: the card scrolls inside (${inner.own.join('/')}, body ${inner.body.join('/')})`);
            if (!t.expect(!!inner.band, `${name}: the plate is not framed above the card`)) continue;
            const [top, bottom] = inner.band!.split(' ').map(Number);
            const bandTop = inner.plate.top + top * inner.plate.height;
            const bandBottom = inner.plate.top + bottom * inner.plate.height;
            t.expect(bandTop >= inner.caption.bottom - 0.5 && bandBottom <= wb!.top + 0.5, `${name}: the band ${Math.round(bandTop)}–${Math.round(bandBottom)} is not between the caption (${Math.round(inner.caption.bottom)}) and the card (${Math.round(wb!.top)})`);
            await sleep(400);
            const projection = await plateProjection(page);
            if (projection) {
              const target = inner.plate.top + projection.target * inner.plate.height;
              t.expect(target >= bandTop - 1 && target <= bandBottom + 1, `${name} at ${fraction}: the subject is drawn at y ${Math.round(target)}, outside the band ${Math.round(bandTop)}–${Math.round(bandBottom)}`);
              if (fraction > 0.9) {
                const [a, b] = projection.box.map((v) => inner.plate.top + v * inner.plate.height);
                t.expect(a >= bandTop - 2 && b <= bandBottom + 2, `${name}: the full plate is drawn at ${Math.round(a)}–${Math.round(b)}, outside the band ${Math.round(bandTop)}–${Math.round(bandBottom)}`);
              }
            }
            figures[`${name}@${fraction}`] = `card ${fmt(wb)}, band ${Math.round(bandTop)}–${Math.round(bandBottom)} (${Math.round(bandBottom - bandTop)} px)`;
          }
        }
        if (key === 'b') await closeAll(t);
      }
      t.note('windows', figures);
      if (key !== 'b') await openOnly(t, 'layers');
      await scrollInstant(page, 0);
      await t.screenshot('dock');
    },
  },
  {
    name: 'dock: windows paint when first opened',
    viewports: ['390x844'],
    async run(t) {
      const key = worldOf(t);
      const page = t.page;
      await t.reload();
      const painted: Record<string, string> = {};
      for (const name of WINDOWS[key]) {
        await openOnly(t, name);
        await sleep(600);
        const found: string = await page.evaluate(
          ({ name, key }: { name: string; key: string }) => {
            const win = document.querySelector(`[data-window="${name}"]`)!;
            const bg = (el: Element | null) => {
              if (!el) return 'missing';
              const cs = getComputedStyle(el);
              return cs.backgroundImage.startsWith('url(') && parseFloat(cs.backgroundSize) > 0 && (el as HTMLElement).clientWidth > 0 ? 'ok' : `bg ${cs.backgroundImage.slice(0, 20)} ${cs.backgroundSize}`;
            };
            if (name === 'source') return bg(win.querySelector('[data-source-frame]'));
            if (name === 'sequence') {
              const buttons = [...win.querySelectorAll('.sheet__frames button')];
              return buttons.length === 12 && buttons.every((b) => bg(b) === 'ok') ? 'ok' : `${buttons.length} prints, ${buttons.filter((b) => bg(b) !== 'ok').length} unpainted`;
            }
            if (name === 'plan' && key === 'a') {
              const canvas = win.querySelector<HTMLCanvasElement>('canvas')!;
              const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
              let inked = 0;
              for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked++;
              return inked > 0 && canvas.clientWidth > 0 ? 'ok' : `${inked} painted pixels`;
            }
            if (name === 'clock') return /\d\d:\d\d:\d\d/.test(win.textContent ?? '') ? 'ok' : `no timecode: ${(win.textContent ?? '').trim().slice(0, 30)}`;
            return (win as HTMLElement).offsetHeight > 0 ? 'ok' : 'not laid out';
          },
          { name, key },
        );
        painted[name] = found;
        t.expect(found === 'ok', `${name}: ${found}`);
      }
      t.note('painted', painted);
      await closeAll(t);
      if (key !== 'b') await openOnly(t, 'layers');
    },
  },
  {
    name: 'dock: turning Trail off while watching',
    pages: ['a'],
    viewports: PORTRAIT,
    async run(t) {
      const page = t.page;
      await openOnly(t, 'layers');
      const label = await page.evaluate(() => {
        const el = document.querySelector('input[data-layer="trail"]')!.closest('label')!;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, bottom: r.bottom };
      });
      if (!t.expect(label.bottom <= t.viewport.height, `the Trail option is below the first screen (${Math.round(label.bottom)})`)) return;
      const before: number = await page.evaluate(() => (window as any).__4d?.engine.stats.frames ?? -1);
      await t.touch.tap(label.x, label.y);
      await sleep(700);
      const after: { checked: boolean; frames: number; y: number } = await page.evaluate(() => ({
        checked: (document.querySelector('input[data-layer="trail"]') as HTMLInputElement).checked,
        frames: (window as any).__4d?.engine.stats.frames ?? -1,
        y: scrollY,
      }));
      const glass = await boxOf(page, '[data-view="scene"]');
      t.note('trail', { ...after, framesBefore: before, case: fmt(glass) });
      t.expect(!after.checked, 'Trail is still on after the tap');
      t.expect(after.frames > before, `the engine painted no frame after the tap (${before} → ${after.frames})`);
      t.expect(after.y === 0 && whole(glass, t.viewport.width, t.viewport.height), `the case is not whole on screen (${fmt(glass)}, scrollY ${after.y})`);
      await t.screenshot('trail-off');
      await t.touch.tap(label.x, label.y);
      await sleep(300);
    },
  },
  {
    name: 'dock: swipes from the dock, a window and the view scroll',
    viewports: ['390x844', '360x780'],
    async run(t) {
      if (!t.touch.native) return t.skip('no native touch in WebKit');
      const key = worldOf(t);
      const page = t.page;
      const name = key === 'b' ? 'exposures' : 'layers';
      const starts: [string, string][] = [
        ['dock', `.dock__button[data-dock-window="${name}"]`],
        ['window', `[data-window="${name}"] .win__body`],
        ['view', VIEW[key] === '.gate' ? '[data-view="scene"]' : VIEW[key]],
      ];
      const moved: Record<string, number> = {};
      for (const [what, selector] of starts) {
        await scrollInstant(page, 0);
        await openOnly(t, name);
        if (key !== 'b') await page.evaluate((s: string) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' }), selector);
        await sleep(300);
        const b = await boxOf(page, selector);
        if (!t.expect(!!b, `${what}: ${selector} is not visible`)) continue;
        const y = Math.min(b!.bottom - 6, t.viewport.height - 8);
        const x = b!.left + Math.min(b!.width / 2, 40);
        moved[what] = await t.touch.swipe(x, y, 0, -220);
        t.expect(moved[what] >= 100, `a swipe up from the ${what} moved the page ${Math.round(moved[what])} px`);
      }
      t.note('moved', moved);
      if (key === 'b') {
        // The hero's phases advance as before: repeated swipes over the dock run it to its end.
        await scrollInstant(page, 0);
        const hints: string[] = [];
        for (let i = 0; i < 10; i++) {
          const dock = (await boxOf(page, '.dock'))!;
          if (dock.bottom < 0) break;
          await t.touch.swipe(t.viewport.width / 2, dock.top + 20, 0, -260);
          await sleep(500);
          hints.push(await page.evaluate(() => document.querySelector('[data-hero-hint]')?.textContent ?? ''));
        }
        const travel = await heroTravel(page);
        const y: number = await page.evaluate(() => scrollY);
        t.note('hints', [...new Set(hints)]);
        t.expect(hints.includes('Scroll to the last exposure') || hints.includes('Scroll on to the plates'), `the hero's phases did not advance: ${[...new Set(hints)].join(' | ')}`);
        t.expect(y >= travel, `the swipes over the dock stopped inside the hero (scrollY ${y}, travel ${travel})`);
      }
      await scrollInstant(page, 0);
      if (key === 'b') await closeAll(t);
      else await openOnly(t, 'layers');
    },
  },
  {
    name: 'dock: B shows its six buttons in one row, two rows below 390 px',
    pages: ['b'],
    viewports: [...PORTRAIT, ...LANDSCAPE],
    async run(t) {
      const found: { tops: number[]; right: number; heights: number[] } = await t.page.evaluate(() => {
        const buttons = [...document.querySelectorAll('.dock__button')].map((b) => b.getBoundingClientRect());
        return { tops: buttons.map((r) => Math.round(r.top)), right: Math.max(...buttons.map((r) => r.right)), heights: buttons.map((r) => Math.round(r.height)) };
      });
      const rows = new Set(found.tops).size;
      const expected = t.viewport.width < 390 || t.viewport.height < 500 ? 2 : 1;
      t.note('rows', { rows, tops: found.tops });
      t.expect(found.tops.length === 6, `${found.tops.length} dock buttons`);
      t.expect(rows === expected, `${rows} rows of buttons, expected ${expected}`);
      t.expect(found.right <= t.viewport.width + 0.5, `a dock button reaches ${Math.round(found.right)} px`);
      t.expect(found.heights.every((v) => v >= 44), `button heights ${found.heights.join(', ')}`);
    },
  },
  {
    name: 'dock: keyboard order, Enter and Escape',
    viewports: ['390x844'],
    async run(t) {
      const key = worldOf(t);
      const page = t.page;
      const first = WINDOWS[key][0];
      if (key === 'b') await openOnly(t, 'layers');
      await scrollInstant(page, 0);
      // Tab from the skip link, the first stop of the page (a tap moved the starting point).
      await page.focus('.skip');
      const order: string[] = [];
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        const what: string = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return 'none';
          if (el.matches('.dock__button')) return `dock:${el.dataset.dockWindow}`;
          if (el.closest('.loupe')) return 'loupe';
          if (el.closest('.strip')) return 'strip';
          if (el.closest('.rail')) return 'rail';
          const win = el.closest<HTMLElement>('[data-docked]');
          if (win) return `window:${win.dataset.window}`;
          return el.tagName.toLowerCase();
        });
        order.push(what);
        if (order.filter((o) => o.startsWith('window:')).length >= 2) break;
      }
      t.note('order', order);
      const at = (p: (o: string) => boolean) => order.findIndex(p);
      const firstDock = at((o) => o.startsWith('dock:'));
      const firstWindow = at((o) => o.startsWith('window:'));
      const transport = key === 'a' ? 'rail' : key === 'b' ? 'loupe' : 'strip';
      t.expect(firstDock > 0 && at((o) => o === transport) >= 0 && at((o) => o === transport) < firstDock, `the ${transport} does not come before the dock: ${order.join(' ')}`);
      t.expect(firstWindow > firstDock && order.slice(firstDock, firstDock + WINDOWS[key].length).every((o) => o.startsWith('dock:')), `the dock's buttons and then the open window do not follow each other: ${order.join(' ')}`);
      // Escape from inside the open window.
      const y0 = await scrollInstant(page, key === 'b' ? 0 : 60);
      const open: string = await page.evaluate(() => (document.querySelector('[data-docked]:not([hidden])') as HTMLElement | null)?.dataset.window ?? '');
      await page.evaluate(() => document.querySelector<HTMLElement>('[data-docked]:not([hidden]) input')?.focus({ preventScroll: true }));
      await page.keyboard.press('Escape');
      await sleep(250);
      const esc: { hidden: boolean; focus: string; expanded: string | null; y: number } = await page.evaluate((name: string) => ({
        hidden: (document.querySelector(`[data-window="${name}"]`) as HTMLElement).hidden,
        focus: (document.activeElement as HTMLElement | null)?.dataset.dockWindow ?? document.activeElement?.tagName ?? '',
        expanded: document.querySelector(`.dock__button[data-dock-window="${name}"]`)?.getAttribute('aria-expanded') ?? null,
        y: scrollY,
      }), open);
      t.note('escape', { open, ...esc, before: y0 });
      t.expect(!!open && esc.hidden && esc.expanded === 'false', `Escape did not close ${open}`);
      t.expect(esc.focus === open, `focus went to ${esc.focus}, not the ${open} button`);
      t.expect(esc.y === y0, `Escape scrolled the page from ${y0} to ${esc.y}`);
      // Enter and Space on a focused button.
      await page.focus(`.dock__button[data-dock-window="${first}"]`);
      await page.keyboard.press('Enter');
      await sleep(150);
      const entered = await page.evaluate((s: string) => document.querySelector(s)?.getAttribute('aria-expanded'), `.dock__button[data-dock-window="${first}"]`);
      await page.keyboard.press(' ');
      await sleep(150);
      const spaced = await page.evaluate((s: string) => document.querySelector(s)?.getAttribute('aria-expanded'), `.dock__button[data-dock-window="${first}"]`);
      t.expect(entered === 'true' && spaced === 'false', `Enter then Space gave aria-expanded ${entered} then ${spaced}`);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await scrollInstant(page, 0);
      if (key !== 'b') await openOnly(t, 'layers');
    },
  },
  {
    name: 'dock: phone in landscape',
    viewports: LANDSCAPE,
    async run(t) {
      const key = worldOf(t);
      const page = t.page;
      const { width: w, height: h } = t.viewport;
      await scrollInstant(page, 0);
      const figures: Record<string, string> = {};
      const view = key === 'a' ? '[data-view="scene"]' : key === 'b' ? '[data-view="scene"]' : '.gate';
      if (key === 'a') {
        const glass = await boxOf(page, view);
        const rail = await boxOf(page, '.rail');
        figures.first = `case ${fmt(glass)}, rail ${fmt(rail)}`;
        t.expect(whole(glass, w, h) && whole(rail, w, h), `the case (${fmt(glass)}) and the rail (${fmt(rail)}) are not whole at scroll 0`);
      }
      if (key === 'c') {
        const gate = await boxOf(page, '.gate');
        const strip = await boxOf(page, '.strip');
        figures.first = `gate ${fmt(gate)}, strip ${fmt(strip)}`;
        t.expect(whole(gate, w, h) && whole(strip, w, h), `the gate (${fmt(gate)}) and the strip (${fmt(strip)}) are not whole at scroll 0`);
      }
      for (const name of WINDOWS[key]) {
        await openOnly(t, name);
        const wb = await boxOf(page, `[data-window="${name}"]`);
        const vb = await boxOf(page, view);
        if (!t.expect(!!wb && !!vb, `${name}: not visible`)) continue;
        figures[name] = fmt(wb);
        t.expect(!meet(wb!, vb!), `${name} (${fmt(wb)}) covers the view (${fmt(vb)})`);
        t.expect(whole(wb, w, h), `${name} (${fmt(wb)}) is not whole on screen`);
      }
      if (key === 'b') await closeAll(t);
      else await openOnly(t, 'layers');
      if (key === 'a') {
        const room = await page.evaluate(() => {
          const el = document.querySelector('.case--wide')!;
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height };
        });
        figures.room7 = `${Math.round(room.width)}×${Math.round(room.height)}`;
        t.expect(room.width >= 450 && room.height >= 250, `Room 7's case is ${figures.room7}`);
        await scrollInstant(page, 0);
      }
      t.note('landscape', figures);
      await t.screenshot('landscape');
    },
  },
  {
    name: 'footer: the tail after the last question',
    viewports: ['390x844'],
    async run(t) {
      const tail: number = await t.page.evaluate(() => {
        const summaries = document.querySelectorAll('details summary');
        const last = summaries[summaries.length - 1].getBoundingClientRect();
        return document.documentElement.scrollHeight - (last.bottom + scrollY);
      });
      t.note('tail', Math.round(tail));
      t.expect(tail <= 520, `${Math.round(tail)} px from the last question to the end of the page`);
    },
  },
];

/** The dock's buttons, closed and open, and the link back's tab, restyled for touch. */
const dockTargets = [
  { selector: '.dock__button[aria-expanded="false"]', kind: 'text' as const, webkit: true },
  { selector: '.dock__button[aria-expanded="true"]', kind: 'text' as const, prepare: (t: CheckContext) => openOnly(t, 'layers').then(() => {}) },
  { selector: '.dock__button', kind: 'focus' as const },
  { selector: '.playground-back', kind: 'text' as const },
];

const worldsAbc: PageCheck = {
  pages: ['a', 'b', 'c'],
  setup: {
    a: {
      panels: ['.dock'],
      contrast: [...dockTargets, { selector: '[data-docked] .field label', kind: 'text' }],
    },
    b: {
      panels: ['.dock'],
      contrast: [
        ...dockTargets,
        // Spec phone-ergonomics "A docked window's legends": the legends and the title bar's aside.
        { selector: '[data-docked] legend', kind: 'text', webkit: true, prepare: (t) => openOnly(t, 'layers').then(() => {}) },
        { selector: '[data-docked] .win__aside', kind: 'text', webkit: true, prepare: (t) => openOnly(t, 'sequence').then(() => {}) },
      ],
    },
    c: {
      panels: ['.dock'],
      contrast: [...dockTargets, { selector: '[data-docked] .win__code', kind: 'text' }, { selector: '[data-docked] label', kind: 'text' }],
      // The latent edge codes printed on the film frames, in the strip's dot-matrix face (design D1, "Text").
      smallText: ['.strip__frame i'],
    },
  },
  checks,
  // B's dock wraps into two rows below 390 px.
  queries: ['(max-width: 389px)'],
};

export default worldsAbc;
