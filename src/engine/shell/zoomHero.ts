import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Engine } from '../engine/Engine';
import type { TimeController } from '../time/TimeController';
import { springStep } from '../viewer/pinch';
import { isTypingTarget } from './keyboard';

gsap.registerPlugin(ScrollTrigger);

/**
 * Phases of the gesture hero (D1):
 * - `loop`: zoom segment; time runs in a loop on its own clock and scrolling pulls the camera away;
 * - `final`: final segment; zoom at the maximum and scrolling carries time to the last frame;
 * - `rest`: pause; zoom at the maximum and the last frame, both still;
 * - `after`: the page is already past the hero (final state forced).
 */
export type HeroPhaseId = 'loop' | 'final' | 'rest' | 'after';

/** Segment boundaries, as fractions of the hero's scroll travel. */
export interface HeroPhases {
  /** End of the zoom segment (pZ). */
  zoomEnd: number;
  /** End of the final segment (pF); from there to 1, the pause. */
  landEnd: number;
}

export const DEFAULT_PHASES: HeroPhases = { zoomEnd: 0.55, landEnd: 0.9 };

/**
 * Breathing room at the start of the final segment (fraction of the travel): time starts a little after
 * the zoom reaches the maximum, so no scroll step under ~35 px changes both things.
 */
export const FINAL_BREATH = 0.02;

/** Time constant (s) of the clock's target in the final segment: Lenis already smooths the scroll. */
const FINAL_DAMPING = 0.03;
/**
 * Frames left before the landing reaches the last frame, below which it closes with HOLD:
 * the target's exponential tail is invisible and would delay the final state.
 */
const LAND_SNAP = 0.35;
/** The same when the next section is already peeking in (a fast gesture crossed the pause): the end arrives first. */
const LAND_SNAP_AFTER = 3;
/** Half-life (s) of the pinch spring, on z. */
const PINCH_HALFLIFE = 0.1;
/** Step of the buttons and the +/− keys, in ln(distance) (like `viewer.zoomBy`). */
const ZOOM_STEP = 0.25;

export interface HeroPhaseState {
  /** Resting zoom at the very top (0 = closest, 1 = full plate). */
  z0: number;
  phases?: HeroPhases;
  /** Frame at which the final segment starts. */
  from: number;
  /** Last frame. */
  last: number;
}

export interface HeroPhase {
  phase: HeroPhaseId;
  /** Published zoom, in [0, 1]. */
  z: number;
  /** Zoom requested by the scroll alone. */
  zScroll: number;
  /** Progress through the final segment, in [0, 1]. */
  q: number;
  /** Target frame (integer) in the final segment, the pause and after; null in the loop. */
  timeTarget: number | null;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Zoom easing: soft in and out, but with a slope (the first notch already pulls away). */
export function easeZoom(t: number): number {
  const x = clamp01(t);
  return 0.5 * x + 0.5 * x * x * (3 - 2 * x);
}

/** Pinch range in z units: at the very top, z0 + pinch ∈ [0, 1]. */
export function clampPinch(pinch: number, z0: number): number {
  return Math.min(1 - z0, Math.max(-z0, pinch));
}

/** First frame of the final window: the last `seconds` seconds of the clip. */
export function finalWindowStart(frameCount: number, fps: number, seconds: number): number {
  const last = Math.max(0, frameCount - 1);
  return Math.max(0, last - Math.round(Math.max(0, seconds) * fps));
}

/**
 * Where the final segment starts when entered from the loop: the current frame if it is already in the
 * window (rounded forward, so as not to rewind a fraction), or the start of the window with a jump
 * that has to be covered. `lead` (frames) stretches the window backward: a frame less than `lead`
 * short of it also starts from where it is, because a short jump is not covered and would look
 * like a jerk of the subject.
 */
export function finalStart(exactFrame: number, windowStart: number, last: number, lead = 0): { from: number; jump: boolean } {
  if (exactFrame >= windowStart - Math.max(0, lead)) return { from: Math.min(last, Math.ceil(exactFrame - 1e-6)), jump: false };
  return { from: windowStart, jump: true };
}

/**
 * Hero state for a progress `p` (fraction of the travel, unclamped: > 1 is "after") and a
 * pinch offset `pinch` (in z units). Disjoint segments ("One gesture, one effect"):
 * - zoom `p < pZ`: z = z0 + (1 − z0)·ease(p/pZ), plus the pinch; no time target;
 * - final `pZ ≤ p < pF`: z = 1; target = from + (last − from)·q, an integer;
 * - pause `pF ≤ p ≤ 1` and after: z = 1; target = last.
 * The pinch is weighted by the zoom the scroll has left: fully at the top and not at all at the maximum,
 * so z is monotonic in p and the full plate is always the same.
 */
export function heroPhase(p: number, pinch: number, state: HeroPhaseState): HeroPhase {
  const { zoomEnd, landEnd } = state.phases ?? DEFAULT_PHASES;
  const z0 = clamp01(state.z0);
  const phase: HeroPhaseId = p > 1 ? 'after' : p >= landEnd ? 'rest' : p >= zoomEnd ? 'final' : 'loop';
  const zScroll = p >= zoomEnd ? 1 : z0 + (1 - z0) * easeZoom(Math.max(0, p) / zoomEnd);
  const headroom = z0 < 1 ? (1 - zScroll) / (1 - z0) : 0;
  const z = clamp01(zScroll + clampPinch(pinch, z0) * headroom);
  if (phase === 'loop') return { phase, z, zScroll, q: 0, timeTarget: null };
  if (phase !== 'final') return { phase, z, zScroll, q: 1, timeTarget: state.last };
  const breath = Math.min(FINAL_BREATH, (landEnd - zoomEnd) / 4);
  const q = clamp01((p - zoomEnd - breath) / (landEnd - zoomEnd - breath));
  return { phase, z, zScroll, q, timeTarget: Math.round(state.from + (state.last - state.from) * q) };
}

/** What the hero needs from the view: receiving the pinch (TimeViewer provides it). */
export interface PinchSurface {
  setPinchHandler(handler: ((dLogDistance: number) => void) | null): void;
}

export interface ZoomHeroOptions {
  /** The hero's tall track (the ScrollTrigger trigger); it contains the 100svh sticky stage. */
  hero: HTMLElement;
  /**
   * The sticky stage (by default, the first child of `hero`). If it is taller than the window (a
   * `min-height` on a short screen), the travel ends where it unpins, not at the bottom of the track.
   */
  stage?: HTMLElement;
  /** View that receives the pinch. */
  surface: PinchSurface;
  time: TimeController;
  engine: Engine;
  /** Resting zoom at the very top (0 = closest, 1 = full plate). Defaults to 0.4. */
  z0?: number;
  phases?: HeroPhases;
  /** Final seconds covered by the final segment (defaults to 4). */
  finalWindow?: number;
  /**
   * The camera's ln(dFar/dNear) (typically `() => chase.logSpan`): converts the pinch, which arrives
   * in ln(distance), into z units. Defaults to 2.
   */
  zoomSpan?: number | (() => number);
  /** Normalized zoom; called every time it changes. */
  onZoom: (z: number) => void;
  /**
   * Covers a cut: the loop seam and the jump to the final window. The host covers the view and calls
   * `run` at the instant it is covered (in B, in the same tick). Without it, the cut is direct.
   */
  onDissolve?: (run: () => void) => void;
  onPhase?: (phase: HeroPhaseId) => void;
  /** Where to look for the `[data-zoom="in|out"]` buttons (by default, `hero`). */
  controls?: ParentNode;
  /** The + and − keys (on by default). */
  keys?: boolean;
  /** By default, follows `prefers-reduced-motion`. */
  reducedMotion?: boolean;
}

export interface ZoomHero {
  readonly phase: HeroPhaseId;
  readonly z: number;
  /** Unclamped progress through the hero's scroll travel. */
  readonly progress: number;
  /** Changes the resting zoom (for example, when crossing the narrow-screen breakpoint). */
  setZ0(z: number): void;
  /** Adds a change of ln(distance) to the pinch: negative moves closer. */
  zoomBy(dLogDistance: number): void;
  dispose(): void;
}

/**
 * Gesture hero (spec `hero-gesture`, D1–D3). A tall section with a sticky stage; scrolling
 * is native (Lenis smooths it when present) and a ScrollTrigger supplies the progress. It captures no events.
 * - Zoom segment: the clock in `play(1)` (loop); scrolling and pinching only change z.
 * - Final segment: a fixed window (`finalWindow`); if the frame is more than 1 s before it,
 *   `onDissolve` covers the jump to the start of the window (if it is closer, it starts from where it is).
 *   `setTarget` with a low `time.damping` only while the segment lasts.
 * - Pause and after: last frame in HOLD. With the stage in view, if less than 1 s is left the clock
 *   lands with the target and stays in HOLD on arrival; if more is left, `onDissolve` covers the jump. A
 *   direct jump (a link, End) with the hero off screen simply forces that state.
 * - On going back from the final segment to the zoom segment: the target is released and `play(1)`
 *   continues from the current frame (unless the visitor had paused the loop). Going back from the
 *   last frame (Home, the scrollbar) wraps the loop around right away, covered.
 * - The loop seam (the frame goes back to the start) calls `onDissolve`.
 * - While the gesture is driving time, `<html data-hold-origin="gesture">`: a HOLD the visitor did not
 *   request (effects such as B's inversion check it; subscribe them after this bind).
 * - `hero.dataset.heroPhase` publishes the phase for the CSS.
 * - Reduced motion: no `play`, no dissolve and no smoothing (neither of the pinch nor of the clock).
 *   On returning to the zoom segment, time stays where the final segment began.
 * - Pinch (via `surface.setPinchHandler`), `[data-zoom]` buttons and the +/− keys: they add to z through a
 *   critically damped spring, only in the zoom segment, and fade out at the maximum.
 * - Render on demand: outside a gesture it requests no frames.
 */
export function bindZoomHero(options: ZoomHeroOptions): ZoomHero {
  const { hero, surface, time, engine } = options;
  const reduced = options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  const last = Math.max(0, time.frameCount - 1);
  const windowStart = finalWindowStart(time.frameCount, time.fps, options.finalWindow ?? 4);
  const restDamping = time.damping;
  const state: HeroPhaseState = { z0: clamp01(options.z0 ?? 0.4), phases: options.phases ?? DEFAULT_PHASES, from: windowStart, last };
  const span = () => {
    const value = typeof options.zoomSpan === 'function' ? options.zoomSpan() : (options.zoomSpan ?? 2);
    return value > 0 ? value : 1;
  };

  let trigger: ScrollTrigger | null = null;
  let phase: HeroPhaseId | null = null;
  let progress = 0;
  let z = NaN;
  /** The visitor paused the loop: on returning to the zoom segment it does not resume on its own. */
  let loopPaused = reduced;
  /** Our own calls to the clock in progress: their notifications are not visitor actions. */
  let driving = 0;
  /** A jump is waiting for `onDissolve` to cover the view. */
  let pending = false;
  /** The clock is heading to the last frame with the target; on arrival it stays in HOLD (the gesture's). */
  let landing = false;
  let token = 0;
  const stage = options.stage ?? (hero.firstElementChild instanceof HTMLElement ? hero.firstElementChild : null);
  /** The stage is still on screen (always during the pause; after it, until the track leaves at the top). */
  const stageVisible = () => hero.getBoundingClientRect().bottom > 0;
  const pinch = { x: 0, v: 0, goal: 0 };

  const drive = (fn: () => void) => {
    driving++;
    try {
      fn();
    } finally {
      driving--;
    }
    // `setTarget` does not notify until the next update: wake the engine loop.
    engine.requestFrame();
  };
  const markGesture = (on: boolean) => {
    if (on) html.dataset.holdOrigin = 'gesture';
    else delete html.dataset.holdOrigin;
  };
  const current = () => heroPhase(progress, pinch.x, state);

  // --- buttons and +/− keys -------------------------------------------------------------------
  const zoomButtons = Array.from((options.controls ?? hero).querySelectorAll<HTMLElement>('[data-zoom]'));
  const syncButtons = () => {
    for (const button of zoomButtons) {
      const zoomIn = button.dataset.zoom === 'in';
      const off = String(phase !== 'loop' || (zoomIn ? z <= 1e-3 : z >= 1 - 1e-3));
      if (button.getAttribute('aria-disabled') !== off) button.setAttribute('aria-disabled', off);
    }
  };
  const publishZoom = () => {
    const next = current().z;
    if (next !== z) {
      z = next;
      options.onZoom(z);
    }
    syncButtons();
  };

  // --- time -----------------------------------------------------------------------------------
  const holdLast = () =>
    drive(() => {
      time.seek(last);
      time.hold();
    });

  const applyFinal = () => {
    if (pending || phase !== 'final') return;
    const target = current().timeTarget;
    if (target === null) return;
    markGesture(true);
    drive(() => time.setTarget(target));
  };

  /** Takes the clock to `frame`, covering the cut with `onDissolve` (without it, or with reduced motion, directly). */
  const jump = (frame: number, then: () => void) => {
    if (reduced || !options.onDissolve) {
      drive(() => time.seek(frame));
      then();
      return;
    }
    const mine = token;
    pending = true;
    options.onDissolve(() => {
      if (mine !== token) return;
      pending = false;
      drive(() => time.seek(frame));
      then();
    });
  };

  const landSnap = () => (phase === 'after' ? LAND_SNAP_AFTER : LAND_SNAP);
  /**
   * Last frame in HOLD on entering the pause or after. With the hero off screen (or reduced motion),
   * directly. In the pause, the clock lands with the target (a `seek` of a few frames would look like
   * a jerk) if less than 1 s is left or if it was already coming from the final segment (the target
   * keeps going); otherwise the jump is covered. After the pause, with the stage still in view, the next
   * section is already peeking in: the final state comes first, so the jump is covered (except for a
   * few frames, which are not visible).
   */
  const land = (previous: HeroPhaseId | null) => {
    if (reduced || !stageVisible() || last - time.exactFrame < landSnap()) {
      holdLast();
      return;
    }
    if (phase === 'rest' && (previous === 'final' || last - time.exactFrame <= time.fps)) {
      landing = true;
      drive(() => {
        time.damping = FINAL_DAMPING;
        time.setTarget(last);
      });
      return;
    }
    jump(last, holdLast);
  };

  const enter = (next: HeroPhaseId, previous: HeroPhaseId | null) => {
    phase = next;
    token++;
    pending = false;
    landing = false;
    hero.dataset.heroPhase = next;
    if (next === 'loop') {
      // Coming back from the last frame (Home, the scrollbar): the loop wraps around right away, covered,
      // instead of showing a close-up instant of the ending before the seam.
      const wrapNow = !reduced && !loopPaused && previous !== null && time.exactFrame > last - 1;
      // `play` releases the target and notifies only once (with no HOLD in between). The gesture mark is
      // removed afterward: the change from rewind to HOLD when the target is released also belongs to the gesture.
      drive(() => {
        time.damping = restDamping;
        if (!reduced && !loopPaused) time.play(1);
        else if (reduced && previous !== null) time.seek(state.from);
        else time.releaseTarget();
      });
      markGesture(false);
      if (wrapNow) jump(0, () => {});
    } else if (next === 'final') {
      markGesture(true);
      drive(() => (time.damping = reduced ? 1e-4 : FINAL_DAMPING));
      if (previous === 'loop' || previous === null) {
        const start = finalStart(time.exactFrame, windowStart, last, time.fps);
        state.from = start.from;
        if (start.jump) jump(windowStart, applyFinal);
      }
      // From below, `from` stays where the segment began (or at the window's start): it rewinds to there.
      applyFinal();
    } else {
      markGesture(true);
      drive(() => (time.damping = restDamping));
      const settled = !time.active && time.exactFrame === last;
      if (!settled) land(previous);
    }
    options.onPhase?.(next);
  };

  const update = () => {
    if (!trigger) return;
    const range = trigger.end - trigger.start;
    progress = range > 0 ? (trigger.scroll() - trigger.start) / range : 0;
    const next = current().phase;
    if (next !== phase) enter(next, phase);
    else if (phase === 'final') applyFinal();
    publishZoom();
  };

  const offTime = time.subscribe((now, before) => {
    // Notifications from our own calls are not the visitor's (and our own `seek` is not the seam).
    if (driving) return;
    // Loop seam: the frame wraps around in the direction of playback.
    if (!reduced && options.onDissolve && time.playing) {
      const delta = now.frame - before.frame;
      const half = time.frameCount / 2;
      if ((now.direction > 0 && delta < -half) || (now.direction < 0 && delta > half)) options.onDissolve(() => {});
    }
    if (landing) {
      if (!time.playing && time.active) {
        // Still landing; on reaching the last frame, the gesture's HOLD (without the effect of a requested HOLD).
        if (now.direction === 0 && time.exactFrame === last) {
          landing = false;
          holdLast();
          drive(() => (time.damping = restDamping));
        }
        return;
      }
      // The visitor took over the clock midway through the landing.
      landing = false;
    }
    if (phase === 'loop') {
      loopPaused = !time.playing;
      return;
    }
    // The visitor took over the clock (HOLD, J/K/L, the sheet): that HOLD no longer belongs to the gesture.
    const owned =
      phase === 'final' ? time.active && !time.playing : phase === 'rest' || phase === 'after' ? !time.active && time.frame === last : false;
    markGesture(owned);
  });

  // --- pinch ----------------------------------------------------------------------------------
  const zoomBy = (dLog: number) => {
    if (phase !== 'loop' || !Number.isFinite(dLog)) return;
    pinch.goal = clampPinch(pinch.goal + dLog / span(), state.z0);
    if (reduced) {
      pinch.x = pinch.goal;
      pinch.v = 0;
      publishZoom();
      return;
    }
    engine.requestFrame();
  };
  surface.setPinchHandler(zoomBy);
  const offTick = engine.addTicker((dt) => {
    if (landing && time.active && !time.playing && last - time.exactFrame < landSnap()) {
      landing = false;
      holdLast();
      drive(() => (time.damping = restDamping));
    }
    if (pinch.x === pinch.goal && pinch.v === 0) return false;
    springStep(pinch, pinch.goal, PINCH_HALFLIFE, dt);
    if (Math.abs(pinch.x - pinch.goal) < 1e-5 && Math.abs(pinch.v) < 1e-4) {
      pinch.x = pinch.goal;
      pinch.v = 0;
    }
    publishZoom();
    return pinch.x !== pinch.goal || pinch.v !== 0;
  });

  const offs: Array<() => void> = [];
  for (const button of zoomButtons) {
    const onClick = () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      zoomBy(button.dataset.zoom === 'in' ? -ZOOM_STEP : ZOOM_STEP);
    };
    button.addEventListener('click', onClick);
    offs.push(() => button.removeEventListener('click', onClick));
  }
  if (options.keys ?? true) {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || phase !== 'loop') return;
      const sign = event.key === '+' || event.key === '=' ? -1 : event.key === '-' || event.key === '_' ? 1 : 0;
      if (!sign || isTypingTarget(document.activeElement, event.key)) return;
      event.preventDefault();
      zoomBy(sign * ZOOM_STEP);
    };
    window.addEventListener('keydown', onKey);
    offs.push(() => window.removeEventListener('keydown', onKey));
  }

  // --- scroll ---------------------------------------------------------------------------------
  trigger = ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    // With a stage taller than the window, the travel ends where the sticky element unpins: that way the
    // first screen does not move before the final state.
    end: () => (stage && stage.offsetHeight > window.innerHeight + 1 ? `+=${Math.max(1, hero.offsetHeight - stage.offsetHeight)}` : 'bottom bottom'),
    onUpdate: () => update(),
    onToggle: () => update(),
    onRefresh: () => update(),
  });
  // ScrollTrigger stops notifying once progress is clamped at 1: if one step lands exactly on the end,
  // the next one calls no one and the pause would never become "after". The native scroll event covers it.
  const onScroll = () => update();
  window.addEventListener('scroll', onScroll, { passive: true });
  offs.push(() => window.removeEventListener('scroll', onScroll));
  update();

  const handle: ZoomHero = {
    get phase() {
      return phase ?? 'loop';
    },
    get z() {
      return z;
    },
    get progress() {
      return progress;
    },
    setZ0(value: number) {
      state.z0 = clamp01(value);
      pinch.goal = clampPinch(pinch.goal, state.z0);
      pinch.x = clampPinch(pinch.x, state.z0);
      publishZoom();
    },
    zoomBy,
    dispose() {
      trigger?.kill();
      trigger = null;
      offTime();
      offTick();
      offs.splice(0).forEach((off) => off());
      surface.setPinchHandler(null);
      markGesture(false);
      delete hero.dataset.heroPhase;
      time.damping = restDamping;
      time.releaseTarget();
    },
  };
  // Development only: checking the gesture from Playwright.
  if (import.meta.env.DEV) Object.assign(window, { __zoomHero: { hero: handle, trigger, time } });
  return handle;
}
