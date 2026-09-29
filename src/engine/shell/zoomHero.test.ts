import { describe, expect, it } from 'vitest';
import { distanceZoom, gaussianSmooth, zoomDistance } from './chaseCam';
import {
  DEFAULT_PHASES,
  FINAL_BREATH,
  clampPinch,
  easeZoom,
  finalStart,
  finalWindowStart,
  heroPhase,
  type HeroPhaseState,
} from './zoomHero';

const LAST = 419;
const state = (z0 = 0.4, from = 300): HeroPhaseState => ({ z0, from, last: LAST, phases: DEFAULT_PHASES });
const { zoomEnd: pZ, landEnd: pF } = DEFAULT_PHASES;
/** Progress values from −0.1 to 1.2 in ~2 px steps of a hero with 1800 px of scroll travel. */
const grid = Array.from({ length: 651 }, (_, i) => -0.1 + i * 0.002);
const pinches = (z0: number) => [-z0, -z0 / 2, 0, (1 - z0) / 3, (1 - z0) * 0.9, 1 - z0];

describe('heroPhase: segments', () => {
  it('splits the travel into zoom, final, pause and after, without overlap', () => {
    const s = state();
    expect(heroPhase(-0.2, 0, s).phase).toBe('loop');
    expect(heroPhase(0, 0, s).phase).toBe('loop');
    expect(heroPhase(pZ - 1e-6, 0, s).phase).toBe('loop');
    expect(heroPhase(pZ, 0, s).phase).toBe('final');
    expect(heroPhase(pF - 1e-6, 0, s).phase).toBe('final');
    expect(heroPhase(pF, 0, s).phase).toBe('rest');
    expect(heroPhase(1, 0, s).phase).toBe('rest');
    expect(heroPhase(1.0001, 0, s).phase).toBe('after');
  });

  it('in the zoom segment there is no time target; outside it the zoom is at the maximum', () => {
    for (const p of grid) {
      const r = heroPhase(p, 0.2, state());
      if (r.phase === 'loop') expect(r.timeTarget).toBeNull();
      else {
        expect(r.z).toBe(1);
        expect(r.timeTarget).not.toBeNull();
      }
    }
  });

  it('in the pause and after, the target is the last frame', () => {
    for (const p of [pF, (pF + 1) / 2, 1, 1.5]) expect(heroPhase(p, 0, state()).timeTarget).toBe(LAST);
  });
});

describe('heroPhase: limits', () => {
  it('at the very top the zoom is z0 plus the pinch, and the pinch stays within [0, 1]', () => {
    for (const z0 of [0, 0.25, 0.4, 0.8]) {
      for (const pinch of pinches(z0)) expect(heroPhase(0, pinch, state(z0)).z).toBeCloseTo(z0 + pinch, 12);
      expect(heroPhase(0, -5, state(z0)).z).toBe(0);
      expect(heroPhase(0, 5, state(z0)).z).toBe(1);
    }
  });

  it('z is always in [0, 1] and the zoom reaches the maximum exactly at the end of its segment', () => {
    for (const z0 of [0, 0.4, 1]) {
      for (const pinch of [-2, ...pinches(z0), 2]) {
        for (const p of grid) {
          const { z } = heroPhase(p, pinch, state(z0));
          expect(z).toBeGreaterThanOrEqual(0);
          expect(z).toBeLessThanOrEqual(1);
        }
        expect(heroPhase(pZ, pinch, state(z0)).z).toBe(1);
      }
    }
  });

  it('the final segment goes from the entry frame to the last one, in integers', () => {
    for (const from of [299, 300, 351, LAST]) {
      const s = state(0.4, from);
      expect(heroPhase(pZ, 0, s).timeTarget).toBe(from);
      expect(heroPhase(pZ + FINAL_BREATH, 0, s).timeTarget).toBe(from);
      expect(heroPhase(pF - 1e-9, 0, s).timeTarget).toBe(LAST);
      for (const p of grid) {
        const target = heroPhase(p, 0, s).timeTarget;
        if (target !== null) expect(Number.isInteger(target)).toBe(true);
      }
    }
  });
});

describe('heroPhase: monotonicity', () => {
  it('scrolling down never brings the camera closer, with any pinch', () => {
    for (const z0 of [0, 0.3, 0.4, 0.7]) {
      for (const pinch of pinches(z0)) {
        let previous = -Infinity;
        for (const p of grid) {
          const { z } = heroPhase(p, pinch, state(z0));
          expect(z).toBeGreaterThanOrEqual(previous - 1e-12);
          previous = z;
        }
      }
    }
  });

  it('in the final segment scrolling down never rewinds', () => {
    let previous = -Infinity;
    for (const p of grid) {
      const { timeTarget } = heroPhase(p, 0, state(0.4, 312));
      if (timeTarget === null) continue;
      expect(timeTarget).toBeGreaterThanOrEqual(previous);
      previous = timeTarget;
    }
  });

  it('the zoom easing is monotonic and already pulls away with the first notch', () => {
    expect(easeZoom(0)).toBe(0);
    expect(easeZoom(1)).toBe(1);
    expect(easeZoom(-1)).toBe(0);
    expect(easeZoom(2)).toBe(1);
    expect(easeZoom(0.01)).toBeGreaterThan(0.004);
    for (let t = 0; t < 1; t += 0.01) expect(easeZoom(t + 0.01)).toBeGreaterThan(easeZoom(t));
  });
});

describe('heroPhase: One gesture, one effect', () => {
  it('no scroll step smaller than the breathing room changes both the zoom and the time', () => {
    const step = FINAL_BREATH * 0.9;
    for (const z0 of [0, 0.4, 0.8]) {
      for (const pinch of pinches(z0)) {
        for (let p = -0.1; p < 1.2; p += 0.0005) {
          const a = heroPhase(p, pinch, state(z0));
          for (const d of [step / 4, step / 2, step]) {
            const b = heroPhase(p + d, pinch, state(z0));
            const zoomChanged = Math.abs(b.z - a.z) > 1e-12;
            // Time driven by the scroll: progress through the final segment (on entry, the target is the current frame).
            const timeChanged = a.q !== b.q || (a.timeTarget !== null && b.timeTarget !== null && a.timeTarget !== b.timeTarget);
            expect(zoomChanged && timeChanged, `p=${p.toFixed(4)} +${d.toFixed(4)} z0=${z0} pinch=${pinch}`).toBe(false);
          }
        }
      }
    }
  });

  it('the pinch only changes the zoom, never the time, and at the maximum it changes nothing', () => {
    for (const p of grid) {
      const a = heroPhase(p, -0.3, state());
      const b = heroPhase(p, 0.4, state());
      expect(b.timeTarget).toBe(a.timeTarget);
      expect(b.phase).toBe(a.phase);
      if (p >= pZ) expect(b.z).toBe(a.z);
    }
  });
});

describe('final window', () => {
  it('covers the last seconds of the clip', () => {
    expect(finalWindowStart(420, 30, 4)).toBe(299);
    expect(finalWindowStart(420, 30, 0)).toBe(419);
    expect(finalWindowStart(60, 30, 4)).toBe(0);
    expect(finalWindowStart(1, 30, 4)).toBe(0);
  });

  it('starts from the current frame if it is in the window (rounded forward), and jumps otherwise', () => {
    expect(finalStart(350, 299, LAST)).toEqual({ from: 350, jump: false });
    expect(finalStart(350.3, 299, LAST)).toEqual({ from: 351, jump: false });
    expect(finalStart(418.7, 299, LAST)).toEqual({ from: LAST, jump: false });
    expect(finalStart(299, 299, LAST)).toEqual({ from: 299, jump: false });
    expect(finalStart(298.9, 299, LAST)).toEqual({ from: 299, jump: true });
    expect(finalStart(12, 299, LAST)).toEqual({ from: 299, jump: true });
  });

  it('with a lead, a frame shortly before the window starts from where it is (no jerk)', () => {
    expect(finalStart(274.5, 299, LAST, 30)).toEqual({ from: 275, jump: false });
    expect(finalStart(269, 299, LAST, 30)).toEqual({ from: 269, jump: false });
    expect(finalStart(268.9, 299, LAST, 30)).toEqual({ from: 299, jump: true });
    expect(finalStart(350, 299, LAST, 30)).toEqual({ from: 350, jump: false });
  });

  it('the pinch stays within what z0 allows', () => {
    expect(clampPinch(-1, 0.4)).toBe(-0.4);
    expect(clampPinch(1, 0.4)).toBeCloseTo(0.6);
    expect(clampPinch(0.1, 0.4)).toBe(0.1);
  });
});

describe('chaseCam: zoom and path', () => {
  it('the distance is linear on a logarithmic scale and inverts', () => {
    expect(zoomDistance(0, 1.5, 12)).toBeCloseTo(1.5);
    expect(zoomDistance(1, 1.5, 12)).toBeCloseTo(12);
    expect(zoomDistance(0.5, 1.5, 12)).toBeCloseTo(Math.sqrt(1.5 * 12));
    expect(zoomDistance(-1, 1.5, 12)).toBeCloseTo(1.5);
    for (const z of [0, 0.2, 0.39, 0.8, 1]) expect(distanceZoom(zoomDistance(z, 1.5, 12), 1.5, 12)).toBeCloseTo(z, 10);
    // Equal steps of z multiply the distance by the same factor.
    const ratio = zoomDistance(0.3, 1.5, 12) / zoomDistance(0.2, 1.5, 12);
    expect(zoomDistance(0.8, 1.5, 12) / zoomDistance(0.7, 1.5, 12)).toBeCloseTo(ratio, 10);
  });

  it('the Gaussian preserves a straight line, smooths a step and adds no lag', () => {
    const line = Float32Array.from({ length: 60 }, (_, i) => i * 0.5);
    const smoothLine = gaussianSmooth(line, 1, 6);
    for (let i = 20; i < 40; i++) expect(smoothLine[i]).toBeCloseTo(line[i], 4);
    const stepSignal = Float32Array.from({ length: 60 }, (_, i) => (i < 30 ? 0 : 1));
    const smoothStep = gaussianSmooth(stepSignal, 1, 6);
    // Centered: the step's midpoint stays in the same place, with no shift.
    expect((smoothStep[29] + smoothStep[30]) / 2).toBeCloseTo(0.5, 4);
    let maxJump = 0;
    for (let i = 1; i < 60; i++) maxJump = Math.max(maxJump, smoothStep[i] - smoothStep[i - 1]);
    expect(maxJump).toBeLessThan(0.08);
  });

  it('the Gaussian filters each component separately', () => {
    const xyz = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) xyz.set([i, 5, -i], i * 3);
    const out = gaussianSmooth(xyz, 3, 3);
    for (let i = 10; i < 20; i++) {
      expect(out[i * 3]).toBeCloseTo(i, 4);
      expect(out[i * 3 + 1]).toBeCloseTo(5, 5);
      expect(out[i * 3 + 2]).toBeCloseTo(-i, 4);
    }
  });
});
