/**
 * Phone checks of Bloomscope (`/bloomscope/`): the pinned stage of Sow and the lathe, the peepholes
 * beside the toys, the chip that lands in the peephole, the dial's finger ring, "Hold to sow" and the
 * honeycomb's peephole (landing-bloomscope "Pinned stage on phones", "Continuous simulation and
 * peepholes", "Bringing results to the chamber" and "Sow, the golden-angle seeder"; design
 * adapt-for-phones D6). Run through tools/check-phone.ts: `phone bloomscope --base <url>`.
 */

import type { Check, CheckContext, Page, PageCheck } from '../check-phone.ts';

const PORTRAIT = ['390x844', '390x664', '360x780', '430x932'];
const LANDSCAPE = ['844x390', '932x430', '667x375'];
const ALL = [...PORTRAIT, ...LANDSCAPE];
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Each toy's view and the controls that change it, in page order (task 3.1). */
const TOYS = {
  sow: { view: '.sow-view', controls: ['#sow .readouts', '.named', '.sow-hold', '.scrub-input', '.sow-press', '.sow-put', '#sow .pixels'] },
  lathe: {
    view: '.lathe-view',
    controls: ['.species', '.leaves-input', '.leaf-plus8', '.plump-input', '.blush-input', '.stretch-input', '.stretch-stops', '.lathe-drop', '.lathe-put', '#lathe .pixels'],
  },
} as const;

const portrait = (t: CheckContext) => t.viewport.height > t.viewport.width;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function box(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }, selector);
}

/** Scrolls so the element's center sits at `y` px from the top of the viewport (clamped to the scroll range). */
async function centerAt(page: Page, selector: string, y: number): Promise<void> {
  await page.evaluate(
    ({ selector, y }: { selector: string; y: number }) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      window.scrollTo({ left: 0, top: r.top + scrollY + r.height / 2 - y, behavior: 'instant' });
    },
    { selector, y },
  );
  await sleep(350);
}

/** Scrolls so the element's top sits at `y` px from the top of the viewport. */
async function topAt(page: Page, selector: string, y: number): Promise<void> {
  await page.evaluate(
    ({ selector, y }: { selector: string; y: number }) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      window.scrollTo({ left: 0, top: r.top + scrollY - y, behavior: 'instant' });
    },
    { selector, y },
  );
  await sleep(350);
}

/** Visible fractions (0 to 1) of several elements, measured at once. */
function fractions(page: Page, selectors: string[]): Promise<number[]> {
  return page.evaluate(
    (selectors: string[]) =>
      selectors.map((s) => {
        const el = document.querySelector(s);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return 0;
        const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
        const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
        return Math.round(((w * h) / (r.width * r.height)) * 1000) / 1000;
      }),
    selectors,
  );
}

interface Samples {
  /** Lowest visible fraction of each watched selector over the samples. */
  min: Record<string, number>;
  /** Largest |scrollY − scrollY at the start|. */
  scrolled: number;
  /** Last rectangle of the flying chip before it left the page. */
  chip: Box | null;
  /** Samples in which the chamber gem was shown and not tucked. */
  gemShown: number;
  /** Every text `.time-chip` showed. */
  chipTexts: string[];
  frames: number;
}

/** Samples the page every animation frame while `run` acts on it. */
async function sampling(page: Page, watch: string[], run: () => Promise<void>): Promise<Samples> {
  await page.evaluate((watch: string[]) => {
    const state: Samples & { on: boolean; y0: number } = { min: {}, scrolled: 0, chip: null, gemShown: 0, chipTexts: [], frames: 0, on: true, y0: scrollY };
    (window as unknown as { __bsSamples: typeof state }).__bsSamples = state;
    const tick = () => {
      if (!state.on) return;
      state.frames++;
      for (const s of watch) {
        const el = document.querySelector(s);
        let f = 0;
        if (el) {
          const r = el.getBoundingClientRect();
          const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
          const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
          f = r.width > 0 && r.height > 0 ? (w * h) / (r.width * r.height) : 0;
        }
        state.min[s] = Math.min(state.min[s] ?? 1, Math.round(f * 1000) / 1000);
      }
      state.scrolled = Math.max(state.scrolled, Math.abs(scrollY - state.y0));
      const chip = document.querySelector('.flying-chip');
      if (chip) {
        const r = chip.getBoundingClientRect();
        state.chip = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      }
      const gem = document.querySelector<HTMLElement>('.chamber-gem');
      if (gem && !gem.hidden && !gem.classList.contains('is-tucked')) state.gemShown++;
      const text = document.querySelector('.time-chip')?.textContent ?? '';
      if (!state.chipTexts.includes(text)) state.chipTexts.push(text);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, watch);
  await run();
  await sleep(80);
  return page.evaluate(() => {
    const state = (window as unknown as { __bsSamples: Samples & { on: boolean } }).__bsSamples;
    state.on = false;
    return { min: state.min, scrolled: state.scrolled, chip: state.chip, gemShown: state.gemShown, chipTexts: state.chipTexts, frames: state.frames };
  });
}

const text = (page: Page, selector: string): Promise<string> => page.evaluate((s: string) => document.querySelector(s)?.textContent?.trim() ?? '', selector);

/** The Sow dial in viewport pixels: center, scale (px per viewBox unit) and the outer grip ring. */
function dial(page: Page): Promise<{ cx: number; cy: number; scale: number; size: number; r: number; stroke: number }> {
  return page.evaluate(() => {
    const d = document.querySelector('.sow-dial')!.getBoundingClientRect();
    const grip = document.querySelector<SVGCircleElement>('.dial-grip--outer')!;
    const scale = d.width / 640;
    return { cx: d.left + d.width / 2, cy: d.top + d.height / 2, scale, size: d.width, r: Number(grip.getAttribute('r')), stroke: parseFloat(getComputedStyle(grip).strokeWidth) };
  });
}

/** The divergence as the readout shows it (the dial's input keeps its value while it has focus). */
const divergence = (page: Page): Promise<string> => text(page, '.sow-divergence');

/** Waits until the page has stopped scrolling (a fling from an earlier swipe). */
async function settle(page: Page): Promise<void> {
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const y: number = await page.evaluate(() => scrollY);
    if (y === last) return;
    last = y;
    await sleep(100);
  }
}

/** A point at `radius` px from the dial's center, `angle` degrees clockwise from 12 o'clock. */
const onDial = (d: { cx: number; cy: number }, radius: number, angle: number) => ({
  x: d.cx + radius * Math.sin((angle * Math.PI) / 180),
  y: d.cy - radius * Math.cos((angle * Math.PI) / 180),
});

/** Brings the Sow stage to its pinned state, with "Named angles" under it at mid-screen. */
async function pinSow(t: CheckContext): Promise<void> {
  await settle(t.page);
  await centerAt(t.page, '.named', t.viewport.height * 0.62);
}

const checks: Check[] = [
  {
    name: 'control and effect together',
    viewports: ALL,
    webkit: true,
    async run(t) {
      const land = !portrait(t);
      const bad: string[] = [];
      for (const [key, toy] of Object.entries(TOYS)) {
        const figures: Record<string, string> = Object.fromEntries(toy.controls.map((selector) => [selector, '']));
        for (const [i, selector] of toy.controls.entries()) {
          const edge = i === 0 || i === toy.controls.length - 1;
          const floor = land && edge ? 0.8 : 0.999;
          for (const [where, y] of [['centered', t.viewport.height / 2], ['60 px from the bottom', t.viewport.height - 60]] as const) {
            await centerAt(t.page, selector, y);
            const [view, peep] = await fractions(t.page, [toy.view, `#${key} .peephole-view`]);
            const reachable: boolean = await t.page.evaluate((s: string) => {
              const el = document.querySelector(s)!;
              const r = el.getBoundingClientRect();
              const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 1, r.top + r.height / 2));
              return !!hit && (el.contains(hit) || hit.contains(el));
            }, selector);
            figures[selector] += `${where}: view ${view}, peephole ${peep}${reachable ? '' : ', control covered'}; `;
            if (view < floor || peep < floor || !reachable) bad.push(`${key} ${selector} ${where}: view ${view}, peephole ${peep}${reachable ? '' : ', control covered'} (needs ${floor >= 0.999 ? 1 : floor})`);
          }
        }
        t.note(key, figures);
      }
      t.expect(bad.length === 0, bad.join('; '));
      await centerAt(t.page, '.stretch-input', t.viewport.height / 2);
      await t.screenshot('lathe-stretch');
    },
  },
  {
    name: 'the stage releases at the end of its section',
    viewports: ALL,
    webkit: true,
    async run(t) {
      for (const key of Object.keys(TOYS)) {
        await centerAt(t.page, `#${key} .bench-body > :last-child`, t.viewport.height * 0.2);
        const [toy, body] = await Promise.all([box(t.page, `#${key} .toy`), box(t.page, `#${key} .bench-body`)]);
        t.note(key, { toyBottom: toy && Math.round(toy.bottom), bodyBottom: body && Math.round(body.bottom) });
        t.expect(!!toy && !!body && toy.bottom <= body.bottom + 1, `${key}: the stage runs past its section (toy bottom ${toy?.bottom}, body bottom ${body?.bottom})`);
        // Pinned before that: with a middle control at mid-screen the stage sits at the top.
        const middle = TOYS[key as keyof typeof TOYS].controls[3];
        await centerAt(t.page, middle, t.viewport.height / 2);
        const pinned = await box(t.page, `#${key} .toy`);
        t.expect(!!pinned && Math.abs(pinned.top) <= 1, `${key}: the stage is not pinned at the top (top ${pinned?.top})`);
      }
    },
  },
  {
    name: 'peepholes never overlap their toys',
    viewports: ALL,
    async run(t) {
      for (const [key, view] of [['sow', '.sow-view'], ['lathe', '.lathe-view'], ['hive', '.hive-view']] as const) {
        const [a, b] = await Promise.all([box(t.page, `#${key} .peephole-view`), box(t.page, view)]);
        const overlap = !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        t.expect(!!a && !!b && !overlap, `${key}: the peephole overlaps the toy's view`);
      }
      const peepholes: string[] = await t.page.evaluate(() => [...document.querySelectorAll('.peephole')].map((p) => p.parentElement?.className ?? ''));
      t.note('peephole parents', peepholes);
      t.expect(peepholes[0].includes('toy') && peepholes[1].includes('toy') && peepholes[2].includes('bench-actions'), `peepholes are not beside their toys: ${peepholes.join(' | ')}`);
    },
  },
  {
    name: 'the stage paints over the controls that scroll under it',
    viewports: PORTRAIT,
    async run(t) {
      const bad: string[] = [];
      for (const [key, toy] of Object.entries(TOYS)) {
        for (const selector of toy.controls) {
          await centerAt(t.page, selector, t.viewport.height / 2);
          const stage = await box(t.page, `#${key} .toy`);
          if (!stage) continue;
          await centerAt(t.page, selector, stage.height / 2);
          const hits: string[] = await t.page.evaluate(
            ({ selector, key }: { selector: string; key: string }) => {
              const toy = document.querySelector(`#${key} .toy`)!;
              const s = toy.getBoundingClientRect();
              const r = document.querySelector(selector)!.getBoundingClientRect();
              const out: string[] = [];
              for (let fx = 0.1; fx < 1; fx += 0.2) {
                for (const y of [r.top + 2, r.top + r.height / 2, r.bottom - 2]) {
                  const x = r.left + r.width * fx;
                  if (y < s.top || y > s.bottom) continue;
                  const hit = document.elementFromPoint(x, y);
                  if (!hit || !toy.contains(hit)) out.push(`${Math.round(x)},${Math.round(y)} → ${hit ? hit.tagName.toLowerCase() + '.' + [...hit.classList].join('.') : 'nothing'}`);
                }
              }
              return out;
            },
            { selector, key },
          );
          if (hits.length) bad.push(`${selector} shows through the stage at ${hits.slice(0, 3).join(', ')}`);
        }
      }
      t.expect(bad.length === 0, bad.join('; '));
    },
  },
  {
    name: 'swipes over the pinned plant',
    viewports: ALL,
    async run(t) {
      if (!t.touch.native) return t.skip('no native touch in WebKit');
      await centerAt(t.page, '.plump-input', t.viewport.height * 0.7);
      const v = (await box(t.page, '.lathe-view'))!;
      const cx = v.left + v.width / 2;
      const cy = v.top + v.height / 2;
      const moved = await t.touch.swipe(cx, cy + v.height * 0.25, 0, -Math.min(120, v.height * 0.5));
      const after = await box(t.page, '#lathe .toy');
      t.note('vertical swipe', Math.round(moved));
      t.expect(moved > 40, `a vertical swipe over the pinned plant moved the page ${Math.round(moved)} px (needs > 40)`);
      if (portrait(t)) t.expect(!!after && Math.abs(after.top) <= 1, `the stage did not stay pinned after the swipe (top ${after?.top})`);
      await centerAt(t.page, '.plump-input', t.viewport.height * 0.7);
      const v2 = (await box(t.page, '.lathe-view'))!;
      const side = await t.touch.swipe(v2.left + v2.width * 0.2, v2.top + v2.height / 2, v2.width * 0.6, 0);
      t.note('sideways swipe', Math.round(side));
      t.expect(Math.abs(side) <= 2, `a sideways swipe over the plant scrolled the page ${Math.round(side)} px`);
    },
  },
  {
    name: 'stretching time with the plant in view',
    viewports: ALL,
    async run(t) {
      if (!t.touch.native) return t.skip('no native touch in WebKit');
      await centerAt(t.page, '.stretch-input', t.viewport.height - 90);
      const s = (await box(t.page, '.stretch-input'))!;
      const y = s.top + s.height / 2;
      const result = await sampling(t.page, ['.lathe-view'], async () => {
        const points = Array.from({ length: 25 }, (_, i) => ({ x: s.left + 14 + ((s.width - 28) * i) / 24, y }));
        await t.touch.path(points, 30);
      });
      const valueText = await t.page.evaluate(() => document.querySelector('.stretch-input')!.getAttribute('aria-valuetext'));
      t.note('plant visible during the drag (min)', result.min['.lathe-view']);
      t.note('stretch', valueText);
      const floor = portrait(t) ? 0.999 : 0.8;
      t.expect(result.min['.lathe-view'] >= floor, `the plant was ${result.min['.lathe-view']} visible during the drag (needs ${floor >= 0.999 ? 1 : floor})`);
      t.expect(valueText === 'Staircase', `the drag ended at "${valueText}", not Staircase`);
      t.expect(result.scrolled <= 2, `the drag scrolled the page ${result.scrolled} px`);
    },
  },
  {
    name: 'hold to sow with a drifting finger',
    viewports: ALL,
    async run(t) {
      if (!t.touch.native) return t.skip('no native touch in WebKit');
      await centerAt(t.page, '.sow-hold', t.viewport.height - 80);
      const b = (await box(t.page, '.sow-hold'))!;
      const seeds = async () => Number((await text(t.page, '.sow-seeds')).replace(/\D/g, ''));
      const before = await seeds();
      const result = await sampling(t.page, ['.sow-view'], () => t.touch.hold(b.left + b.width / 2, b.top + b.height / 2, 1500, { x: 0, y: 20 }));
      const after = await seeds();
      const selected: string = await t.page.evaluate(() => getSelection()?.toString() ?? '');
      t.note('seeds', { before, after });
      t.note('plate visible (min)', result.min['.sow-view']);
      t.expect(after - before > 30, `holding for 1.5 s with 20 px of drift sowed ${after - before} seeds (needs > 30)`);
      t.expect(result.scrolled <= 2, `the hold scrolled the page ${result.scrolled} px`);
      t.expect(selected === '', `the hold selected text: "${selected}"`);
      const floor = portrait(t) ? 0.999 : 0.8;
      t.expect(result.min['.sow-view'] >= floor, `the plate was ${result.min['.sow-view']} visible while sowing`);
    },
  },
  {
    name: 'scrubbing births shows REWIND with the plate in view',
    viewports: ALL,
    async run(t) {
      if (!t.touch.native) return t.skip('no native touch in WebKit');
      await centerAt(t.page, '.scrub-input', t.viewport.height - 80);
      const s = (await box(t.page, '.scrub-input'))!;
      const y = s.top + s.height / 2;
      const result = await sampling(t.page, ['.sow-view'], async () => {
        const points = Array.from({ length: 16 }, (_, i) => ({ x: s.right - 12 - s.width * 0.04 * i, y }));
        await t.touch.path(points, 30);
      });
      t.note('chip', result.chipTexts);
      t.note('plate visible (min)', result.min['.sow-view']);
      t.expect(result.chipTexts.includes('REWIND'), `the time chip never showed REWIND (${result.chipTexts.join(', ')})`);
      const floor = portrait(t) ? 0.999 : 0.8;
      t.expect(result.min['.sow-view'] >= floor, `the plate was ${result.min['.sow-view']} visible while scrubbing`);
    },
  },
  {
    name: "the dial's finger ring",
    viewports: ALL,
    webkit: true,
    async run(t) {
      await pinSow(t);
      const d = await dial(t.page);
      const thick = d.stroke * d.scale;
      const outer = (d.r + d.stroke / 2) * d.scale;
      const inner = (d.r - d.stroke / 2) * d.scale;
      t.note('ring (px from the center)', { inner: Math.round(inner), outer: Math.round(outer), thick: Math.round(thick), box: Math.round(d.size / 2) });
      t.expect(thick >= 44 - 0.5, `the outer ring is ${thick.toFixed(1)} px thick (needs 44)`);
      t.expect(outer <= d.size / 2 + 0.5, `the outer ring reaches ${outer.toFixed(1)} px from the center, past the dial's box (${d.size / 2} px)`);
      // Probes across the band at four angles land on a grip of the dial.
      const misses: string[] = await t.page.evaluate(
        ({ d, inner, outer }: { d: { cx: number; cy: number }; inner: number; outer: number }) => {
          const out: string[] = [];
          for (const angle of [0, 90, 180, 270]) {
            for (let r = inner + 1; r <= outer - 1; r += 4) {
              const x = d.cx + r * Math.sin((angle * Math.PI) / 180);
              const y = d.cy - r * Math.cos((angle * Math.PI) / 180);
              const hit = document.elementFromPoint(x, y);
              if (!hit?.classList.contains('dial-grip')) out.push(`${angle}° at ${Math.round(r)} px → ${hit ? hit.tagName.toLowerCase() + '.' + [...hit.classList].join('.') : 'nothing'}`);
            }
          }
          return out;
        },
        { d, inner, outer },
      );
      t.expect(misses.length === 0, `probes across the ring missed it: ${misses.slice(0, 4).join('; ')}`);
      if (!t.touch.native) return;
      // A tap on the band (the scenario's "30 px outside the inner edge of the band" lies outside a
      // stage dial's box, so the probe taps 8 px inside the box's edge, on the band).
      const before = await divergence(t.page);
      const tap = onDial(d, d.size / 2 - 8, 90);
      await t.touch.tap(tap.x, tap.y);
      await sleep(250);
      const afterTap = await divergence(t.page);
      t.note('tap on the band', { before, after: afterTap });
      t.expect(afterTap !== before, `a tap on the band at 3 o'clock did not turn the dial (${before})`);
      // A 90° drag around the ring turns it and does not scroll.
      await pinSow(t);
      const d2 = await dial(t.page);
      const y0: number = await t.page.evaluate(() => scrollY);
      const points = Array.from({ length: 19 }, (_, i) => onDial(d2, d2.size / 2 - 8, -45 + i * 5));
      await t.touch.path(points, 24);
      await sleep(300);
      const afterDrag = await divergence(t.page);
      const y1: number = await t.page.evaluate(() => scrollY);
      t.note('drag of 90°', { from: afterTap, to: afterDrag, scrolled: y1 - y0 });
      t.expect(afterDrag !== afterTap, 'a 90° drag around the ring did not turn the dial');
      t.expect(Math.abs(y1 - y0) <= 1, `a 90° drag around the ring scrolled the page ${y1 - y0} px`);
      // A vertical swipe that starts on the plate inside the ring scrolls.
      await pinSow(t);
      const d3 = await dial(t.page);
      const moved = await t.touch.swipe(d3.cx, d3.cy + 30, 0, -70);
      t.note('swipe from the plate', Math.round(moved));
      t.expect(moved > 40, `a vertical swipe from the plate moved the page ${Math.round(moved)} px (needs > 40)`);
    },
  },
  {
    name: 'a tap just below the stage reaches the control beneath',
    viewports: PORTRAIT,
    async run(t) {
      if (!t.touch.native) return t.skip('no native touch in WebKit');
      await pinSow(t);
      const stage = (await box(t.page, '#sow .toy'))!;
      const d = await dial(t.page);
      for (const gap of [2, 10]) {
        await topAt(t.page, '.sow-press', stage.bottom - 4);
        await settle(t.page);
        const press = (await box(t.page, '.sow-press'))!;
        const stageNow = (await box(t.page, '#sow .toy'))!;
        const x = Math.min(Math.max(press.left + press.width / 2, d.cx - d.size / 2 + 12), d.cx + d.size / 2 - 12);
        const y = stageNow.bottom + gap;
        const herbs = async (): Promise<number> => t.page.evaluate(() => document.querySelectorAll('.herbarium-strip li:not(.herb-empty)').length);
        const before = { herbs: await herbs(), angle: await divergence(t.page) };
        const onPress: boolean = await t.page.evaluate(({ x, y }: { x: number; y: number }) => !!document.elementFromPoint(x, y)?.closest('.sow-press'), { x, y });
        await t.touch.tap(x, y);
        await sleep(300);
        const after = { herbs: await herbs(), angle: await divergence(t.page) };
        t.note(`${gap} px below`, { x: Math.round(x), y: Math.round(y), onPress, before, after });
        t.expect(onPress && after.herbs === before.herbs + 1, `a tap ${gap} px below the stage did not press "Press this head" (herbarium ${before.herbs} → ${after.herbs})`);
        t.expect(after.angle === before.angle, `a tap ${gap} px below the stage turned the dial (${before.angle} → ${after.angle})`);
      }
    },
  },
  {
    name: 'put in the scope lands in the peephole',
    viewports: ALL,
    webkit: true,
    async run(t) {
      await t.reload();
      await centerAt(t.page, '.lathe-put', t.viewport.height - 70);
      const before = await text(t.page, '.chamber-count');
      const put = (await box(t.page, '.lathe-put'))!;
      const result = await sampling(t.page, [], async () => {
        await t.touch.tap(put.left + put.width / 2, put.top + put.height / 2);
        await t.page.waitForFunction(() => document.querySelector('.chamber-count')?.textContent === '4/7', null, { timeout: 1900 }).catch(() => {});
      });
      const peep = await box(t.page, '#lathe .peephole-view');
      const counts = { gem: await text(t.page, '.chamber-count'), peephole: await text(t.page, '#lathe .peephole-count'), live: await text(t.page, '.lathe-live') };
      t.note('counts', { before, ...counts });
      t.note('chip', result.chip && { x: Math.round(result.chip.left), y: Math.round(result.chip.top), size: Math.round(result.chip.width) });
      await t.screenshot('after-put');
      t.expect(before === '3/7' && counts.gem === '4/7', `the count went from ${before} to ${counts.gem} (expected 3/7 → 4/7 within 1.9 s)`);
      t.expect(counts.peephole === '4/7', `the peephole's frame reads "${counts.peephole}", not 4/7`);
      t.expect(counts.live === 'In the chamber: 4 of 7', `the lathe's live region says "${counts.live}"`);
      const inside = !!result.chip && !!peep && result.chip.left >= peep.left - 1 && result.chip.right <= peep.right + 1 && result.chip.top >= peep.top - 1 && result.chip.bottom <= peep.bottom + 1;
      t.expect(inside, `the chip did not end inside the lathe's peephole (chip ${JSON.stringify(result.chip)}, peephole ${JSON.stringify(peep)})`);
      t.expect(result.gemShown === 0, `the chamber gem showed over the section in ${result.gemShown} frames`);
    },
  },
  {
    name: 'on a desktop the chip still flies to the gem',
    viewports: ['390x844'],
    async run(t) {
      const { page } = await t.open({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      await centerAt(page, '.lathe-put', 600);
      await sleep(500);
      const result = await sampling(page, [], async () => {
        await page.click('.lathe-put');
        await page.waitForFunction(() => document.querySelector('.chamber-count')?.textContent === '4/7', null, { timeout: 1900 }).catch(() => {});
      });
      const gem = await box(page, '.chamber-gem');
      const state = await page.evaluate(() => ({ counts: document.querySelectorAll('.peephole-count').length, live: document.querySelector('.lathe-live')?.textContent ?? '', rails: [...document.querySelectorAll('.peephole')].every((p) => p.parentElement?.classList.contains('peephole-rail')) }));
      t.note('desktop', { chip: result.chip, gem, ...state });
      const inside = !!result.chip && !!gem && result.chip.left >= gem.left - 2 && result.chip.right <= gem.right + 2 && result.chip.top >= gem.top - 2 && result.chip.bottom <= gem.bottom + 2;
      t.expect(inside, 'on a desktop the chip did not end on the chamber gem');
      t.expect(state.counts === 0 && state.rails && !state.live.startsWith('In the chamber'), 'the desktop got a phone element or announcement');
    },
  },
  {
    name: 'GOLDEN stays off the plate',
    viewports: ALL,
    webkit: true,
    async run(t) {
      await centerAt(t.page, '.named', t.viewport.height * 0.62);
      const tapOn = async (n: number) => {
        const b = (await box(t.page, `.named-state:nth-child(${n})`))!;
        await t.touch.tap(b.left + b.width / 2, b.top + b.height / 2);
      };
      await tapOn(4);
      await sleep(900);
      await tapOn(1);
      await sleep(250);
      const [stamp, view, on] = await Promise.all([box(t.page, '.golden-stamp'), box(t.page, '.sow-view'), t.page.evaluate(() => document.querySelector('.golden-stamp')!.classList.contains('is-on'))]);
      await t.screenshot('golden');
      t.expect(on, 'GOLDEN was not stamped after Fifths then Golden');
      const apart = !!stamp && !!view && (stamp.bottom <= view.top || stamp.top >= view.bottom || stamp.right <= view.left || stamp.left >= view.right);
      t.expect(apart, `GOLDEN overlaps the plate (stamp ${JSON.stringify(stamp)}, plate ${JSON.stringify(view)})`);
      t.expect(!!stamp && stamp.top >= 0 && stamp.bottom <= t.viewport.height, 'GOLDEN is off screen');
    },
  },
  {
    name: 'focus never stays under the stage',
    viewports: PORTRAIT,
    webkit: true,
    async run(t) {
      const stageAt = async () => (await box(t.page, '#lathe .toy'))!;
      await centerAt(t.page, '.plump-input', t.viewport.height / 2);
      const s = await stageAt();
      await centerAt(t.page, '.plump-input', s.height / 2);
      await t.page.evaluate(() => (document.querySelector('.plump-input') as HTMLElement).focus());
      await sleep(400);
      const [plump, stage] = await Promise.all([box(t.page, '.plump-input'), stageAt()]);
      t.note('focus()', { plumpTop: plump && Math.round(plump.top), stageBottom: Math.round(stage.bottom) });
      t.expect(!!plump && plump.top >= stage.bottom, `after focus() "Plump" is at ${plump?.top}, under the stage (bottom ${stage.bottom})`);
      if (t.browser !== 'chromium') return;
      await t.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await centerAt(t.page, '.plump-input', s.height / 2);
      await t.page.evaluate(() => (document.querySelector('.leaf-minus1') as HTMLElement).focus({ preventScroll: true }));
      await t.page.keyboard.press('Tab');
      await sleep(400);
      const [active, plump2, stage2] = await Promise.all([t.page.evaluate(() => document.activeElement?.className ?? ''), box(t.page, '.plump-input'), stageAt()]);
      t.note('Tab', { active, plumpTop: plump2 && Math.round(plump2.top), stageBottom: Math.round(stage2.bottom) });
      t.expect(active.includes('plump-input') && !!plump2 && plump2.top >= stage2.bottom, `after Tab "Plump" is at ${plump2?.top}, under the stage (bottom ${stage2.bottom})`);
    },
  },
  {
    name: 'the honeycomb, its Put and its peephole together',
    viewports: ALL,
    webkit: true,
    async run(t) {
      const parts = ['.hive-frame', '.hive-put', '#hive .peephole'];
      const boxes = await Promise.all(parts.map((p) => box(t.page, p)));
      const top = Math.min(...boxes.map((b) => b!.top));
      const bottom = Math.max(...boxes.map((b) => b!.bottom));
      t.note('span (px)', Math.round(bottom - top));
      await t.page.evaluate((y: number) => window.scrollTo({ left: 0, top: y, behavior: 'instant' }), (await t.page.evaluate(() => scrollY)) + top - Math.max(0, (t.viewport.height - (bottom - top)) / 2));
      await sleep(350);
      const f = await fractions(t.page, parts);
      t.note('visible', Object.fromEntries(parts.map((p, i) => [p, f[i]])));
      // The spec's scenario is in portrait; in landscape the frame and its primary controls must share
      // the screen, and the peephole's share is recorded.
      const needed = portrait(t) ? f : f.slice(0, 2);
      t.expect(needed.every((x) => x >= 0.999), `the frame, Put${portrait(t) ? ' and peephole' : ''} are not on screen together (${f.join(', ')}; span ${Math.round(bottom - top)} px)`);
      await t.screenshot('hive');
    },
  },
  {
    name: 'stage edge contrast',
    viewports: PORTRAIT,
    async run(t) {
      const ratios: Record<string, number> = await t.page.evaluate(() => {
        const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const lum = ([r, g, b]: number[]) => {
          const f = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const out: Record<string, number> = {};
        for (const key of ['sow', 'lathe']) {
          const toy = document.querySelector(`#${key} .toy`)!;
          const cs = getComputedStyle(toy);
          const edge = rgb(cs.boxShadow);
          const field = rgb(cs.backgroundColor);
          const [a, b] = [lum(edge), lum(field)];
          out[key] = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
        }
        return out;
      });
      t.note('edge against field', ratios);
      t.expect(Object.values(ratios).every((r) => r >= 3), `the stage edge falls under 3:1: ${JSON.stringify(ratios)}`);
    },
  },
  {
    name: 'rotation returns everything home',
    viewports: ['390x844'],
    async run(t) {
      const skeleton = (page: Page): Promise<string> =>
        page.evaluate(() =>
          ['#sow', '#lathe', '#hive']
            .map((s) => [...document.querySelector(s)!.querySelectorAll('*')].filter((e) => !e.closest('.herbarium-strip, .dial-scale, .vernier-ticks, .hive-view, .sow-view, .lathe-view')).map((e) => `${e.tagName}.${[...e.classList].filter((c) => !c.startsWith('is-')).sort().join('.')}`).join(' '))
            .join('\n'),
        );
      await t.reload();
      const staged = await skeleton(t.page);
      for (const v of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
        await t.resize(v);
        await sleep(400);
      }
      const home = await t.page.evaluate(() => ({
        peepholes: [...document.querySelectorAll('.peephole')].every((p) => p.parentElement?.classList.contains('peephole-rail')),
        hints: [...document.querySelectorAll('.toy-hint')].every((h) => h.parentElement?.classList.contains('toy') && h === h.parentElement.lastElementChild),
        putRow: document.querySelectorAll('.hive-put-row').length,
        counts: document.querySelectorAll('.peephole-count').length,
      }));
      const back = await skeleton(t.page);
      const { page: desk } = await t.open({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      const fresh = await skeleton(desk);
      t.note('home', home);
      t.expect(home.peepholes && home.hints && home.putRow === 0 && home.counts === 0, `not everything came home: ${JSON.stringify(home)}`);
      t.expect(back === fresh, 'after the rotation the bench markup differs from a fresh desktop load');
      t.expect(staged !== fresh, 'the phone page never moved anything');
    },
  },
  {
    name: 'reduced motion: the stage is still',
    viewports: ['390x844', '844x390'],
    async run(t) {
      const { page } = await t.open({ reducedMotion: 'reduce' });
      // The engine's frame counter in a development build; otherwise the canvas's pixels (the engine
      // keeps its drawing buffer), which stay the same while nothing is painted.
      const still = (): Promise<number | string | null> =>
        page.evaluate(() => {
          const frames = (window as unknown as { __bloomscope?: { engine?: { stats: { frames: number } } } }).__bloomscope?.engine?.stats.frames;
          if (typeof frames === 'number') return frames;
          const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-engine]');
          return canvas ? canvas.toDataURL() : null;
        });
      await sleep(2500);
      await centerAt(page, '.stretch-input', t.viewport.height / 2);
      await sleep(1500);
      const animations: string[] = await page.evaluate(() => document.querySelector('#lathe .toy')!.getAnimations({ subtree: true }).map((a) => a.constructor.name));
      const a = await still();
      await sleep(2000);
      const b = await still();
      t.expect(animations.length === 0, `animations on the pinned stage: ${animations.join(', ')}`);
      if (a === null || b === null) return t.skip('neither the engine counter nor the engine canvas is available');
      t.note('at rest for 2 s', typeof a === 'number' ? { frames: [a, b] } : { canvasUnchanged: a === b });
      t.expect(a === b, typeof a === 'number' ? `the engine painted ${Number(b) - a} frames in 2 s at rest` : 'the engine canvas changed in 2 s at rest');
    },
  },
];

const bloomscope: PageCheck = {
  pages: ['bloomscope'],
  setup: {
    bloomscope: {
      // 667×375 (a small phone in landscape) is not in the core's matrix for this page.
      viewports: [{ width: 667, height: 375 }],
      // The swipe starts on the eyepiece, not on the brass ring (a control built to be dragged), and
      // not on Sow's plate: its outer rim is part of the dial's finger ring (D6); the module swipes
      // from the plate's center instead.
      visuals: ['.eyepiece', '.lathe-view', '.hive-view'],
      panels: ['#sow .bench-body > .toy', '#lathe .bench-body > .toy'],
      contrast: [
        { selector: '#lathe .peephole-count', kind: 'text', webkit: true },
        { selector: '#lathe .toy .peephole-caption', kind: 'text' },
        { selector: '#lathe .toy .peephole', kind: 'focus' },
        { selector: '.footer-back a', kind: 'text' },
        { selector: '.wordmark', kind: 'text' },
      ],
      // The dial and its rings are annular: the module probes them itself. The Scope's brass ring
      // (`.ring-hit`) is annular too, around the eyepiece, and no phone rule changes it.
      skipTargets: ['.sow-dial', '.ring-hit'],
      // The Scope's readout pill is a retro readout in the screen face (brief F9).
      smallText: ['.readout-text'],
      // The index stills overflow only their round crops; the knurl ring's box is its rotated
      // bounding box, larger than the circle it paints.
      clip: ['.wheel-crop', '.knurl'],
      async ready(page: Page) {
        await page.waitForFunction(() => !!document.querySelector('canvas[data-engine]') || !document.querySelector<HTMLElement>('.nogl')?.hidden, null, { timeout: 20_000 }).catch(() => {});
        await sleep(500);
      },
    },
  },
  checks,
  // The comma lists of stage.ts and ui.ts (each part is already in the core's list).
  queries: [
    '(max-width: 699px) and (min-height: 521px), (max-width: 1023px) and (max-height: 520px) and (orientation: landscape)',
    '(max-width: 699px), (max-width: 1023px) and (max-height: 520px) and (orientation: landscape)',
  ],
};

export default bloomscope;
