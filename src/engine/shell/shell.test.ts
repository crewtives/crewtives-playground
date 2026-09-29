import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SceneMeta } from '../pack/format';
import { keyAction } from './keyboard';
import { formatBytes, formatDuration, packStats } from './packStats';
import { progressToFrame } from './scrollTime';
import { frameAtRatio, playheadRatio, rulerTicks } from './timeline';
import { wallClockText } from './wallClock';

describe('keyAction', () => {
  it('maps space, J/K/L and arrows', () => {
    expect(keyAction({ key: ' ' })).toBe('toggle');
    expect(keyAction({ key: 'j' })).toBe('rewind');
    expect(keyAction({ key: 'K' })).toBe('hold');
    expect(keyAction({ key: 'l' })).toBe('forward');
    expect(keyAction({ key: 'ArrowLeft' })).toBe('stepBack');
    expect(keyAction({ key: 'ArrowRight' })).toBe('stepForward');
  });

  it('ignores keys with modifiers and keys without an action', () => {
    expect(keyAction({ key: 'l', metaKey: true })).toBeNull();
    expect(keyAction({ key: 'j', ctrlKey: true })).toBeNull();
    expect(keyAction({ key: 'x' })).toBeNull();
  });
});

describe('timeline', () => {
  it('converts a position into a frame, with limits', () => {
    expect(frameAtRatio(0, 300)).toBe(0);
    expect(frameAtRatio(1, 300)).toBe(299);
    expect(frameAtRatio(0.5, 301)).toBe(150);
    expect(frameAtRatio(-2, 300)).toBe(0);
    expect(frameAtRatio(7, 300)).toBe(299);
  });

  it('the playhead goes from 0 to 1', () => {
    expect(playheadRatio(0, 300)).toBe(0);
    expect(playheadRatio(299, 300)).toBe(1);
    expect(playheadRatio(0, 1)).toBe(0);
  });

  it('marks one tick per second and labels every 5 s', () => {
    const ticks = rulerTicks(300, 15);
    expect(ticks).toHaveLength(20);
    expect(ticks.filter((t) => t.major).map((t) => t.label)).toEqual(['0:00', '0:05', '0:10', '0:15']);
    expect(ticks.at(-1)!.at).toBeLessThanOrEqual(1);
  });
});

describe('progressToFrame', () => {
  it('is monotonic, without looping and clamped', () => {
    expect(progressToFrame(0, 300)).toBe(0);
    expect(progressToFrame(1, 300)).toBe(299);
    expect(progressToFrame(0.5, 300)).toBeCloseTo(149.5);
    expect(progressToFrame(1.4, 300)).toBe(299);
    expect(progressToFrame(-1, 300)).toBe(0);
    const samples = [0, 0.1, 0.4, 0.41, 0.9, 1].map((p) => progressToFrame(p, 300));
    expect([...samples].sort((a, b) => a - b)).toEqual(samples);
  });
});

describe('packStats', () => {
  const meta = {
    frameCount: 300,
    fps: 15,
    counts: { static: 420000, dynamic: 1500000 },
    files: { 'static.bin': 3_780_008, 'dynamic.bin': 16_501_216, 'source/page-0.png': 2_400_000 },
  } as unknown as SceneMeta;

  it('reads every figure from the pack', () => {
    expect(packStats(meta)).toEqual({
      frames: '300',
      duration: '20.0 s',
      fps: '15 fps',
      dynamic: '1,500,000',
      static: '420,000',
      bytes: '21.6 MiB',
    });
  });

  it('formats sizes and durations', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1000)).toBe('1000 B');
    expect(formatBytes(2048)).toBe('2.0 KiB');
    expect(formatBytes(250 * 1024 * 1024)).toBe('250 MiB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0 GiB');
    expect(formatDuration(960, 15)).toBe('1 min 04 s');
  });
});

describe('size in binary units (D14)', () => {
  it('labels KiB, MiB and GiB without changing the value or the rounding', () => {
    // Real sizes of the packs (packBytes: the sum of files, without scene.json).
    expect(formatBytes(52_884_622)).toBe('50.4 MiB'); // cat-stairs, A, B and C
    expect(formatBytes(56_268_409)).toBe('53.7 MiB'); // falcon-phi, D
    expect(formatBytes(55_367_475)).toBe('52.8 MiB'); // whale-fall, E
    expect(formatBytes(2048)).toBe('2.0 KiB');
    expect(formatBytes(1000)).toBe('1000 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KiB');
    expect(formatBytes(99.94 * 1024)).toBe('99.9 KiB');
    expect(formatBytes(100 * 1024)).toBe('100 KiB');
  });

  it('never labels MB, KB or GB', () => {
    for (const bytes of [2048, 52_884_622, 5 * 1024 ** 3]) expect(formatBytes(bytes)).not.toMatch(/\b[KMG]B\b/);
  });
});

describe('wallClockText', () => {
  it('uses the desktop clock format', () => {
    expect(wallClockText(new Date(2026, 8, 23, 19, 33, 10))).toBe('Wednesday, Sep 23, 2026 19:33:10');
  });
});

describe('setupSmoothScroll', () => {
  // Test doubles for Lenis, gsap and ScrollTrigger, and for window/history: the module is imported again in each test.
  function setup({ reduced = false } = {}) {
    vi.resetModules();
    const lenisOptions: unknown[] = [];
    const destroy = vi.fn();
    vi.doMock('lenis', () => ({
      default: class {
        constructor(options: unknown) {
          lenisOptions.push(options);
        }
        on() {}
        raf() {}
        destroy = destroy;
      },
    }));
    const ticker = { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() };
    vi.doMock('gsap', () => ({ gsap: { registerPlugin: vi.fn(), ticker } }));
    const clearScrollMemory = vi.fn();
    vi.doMock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { update: vi.fn(), clearScrollMemory } }));
    const history = { scrollRestoration: 'auto' };
    const scrollTo = vi.fn();
    vi.stubGlobal('history', history);
    vi.stubGlobal('window', { scrollTo, matchMedia: () => ({ matches: reduced }) });
    return { lenisOptions, destroy, ticker, clearScrollMemory, history, scrollTo, load: () => import('./smoothScroll') };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('lenis');
    vi.doUnmock('gsap');
    vi.doUnmock('gsap/ScrollTrigger');
    vi.resetModules();
  });

  it('without arguments (4D.OS) it turns off restoration, goes back to the top and creates Lenis as before', async () => {
    const env = setup();
    (await env.load()).setupSmoothScroll();
    expect(env.history.scrollRestoration).toBe('manual');
    // ScrollTrigger restores the mode it remembers on every refresh: it has to remember 'manual'.
    expect(env.clearScrollMemory).toHaveBeenCalledWith('manual');
    expect(env.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(env.lenisOptions).toEqual([{ lerp: 0.12 }]);
  });

  it('with resetToTop: true it does the same as without arguments', async () => {
    const env = setup();
    (await env.load()).setupSmoothScroll({ resetToTop: true });
    expect(env.history.scrollRestoration).toBe('manual');
    expect(env.clearScrollMemory).toHaveBeenCalledWith('manual');
    expect(env.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(env.lenisOptions).toEqual([{ lerp: 0.12 }]);
  });

  it('with resetToTop: false it leaves the position alone and anchors go through Lenis', async () => {
    const env = setup();
    (await env.load()).setupSmoothScroll({ resetToTop: false });
    expect(env.history.scrollRestoration).toBe('auto');
    expect(env.clearScrollMemory).not.toHaveBeenCalled();
    expect(env.scrollTo).not.toHaveBeenCalled();
    expect(env.lenisOptions).toEqual([{ lerp: 0.12, anchors: true }]);
  });

  it('with reduced motion there is no Lenis, for any value of resetToTop', async () => {
    const top = setup({ reduced: true });
    (await top.load()).setupSmoothScroll();
    expect(top.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(top.lenisOptions).toEqual([]);
    expect(top.ticker.add).not.toHaveBeenCalled();

    const anchored = setup({ reduced: true });
    (await anchored.load()).setupSmoothScroll({ resetToTop: false });
    expect(anchored.scrollTo).not.toHaveBeenCalled();
    expect(anchored.history.scrollRestoration).toBe('auto');
    expect(anchored.lenisOptions).toEqual([]);
  });

  it('the returned function removes the ticker and destroys Lenis', async () => {
    const env = setup();
    const teardown = (await env.load()).setupSmoothScroll({ resetToTop: false });
    const tick = env.ticker.add.mock.calls[0][0];
    teardown();
    expect(env.ticker.remove).toHaveBeenCalledWith(tick);
    expect(env.destroy).toHaveBeenCalledTimes(1);
  });
});
