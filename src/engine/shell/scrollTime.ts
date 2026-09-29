import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { TimeController } from '../time/TimeController';

gsap.registerPlugin(ScrollTrigger);

/** Target frame for a scroll progress of 0..1. Monotonic and without looping. */
export function progressToFrame(progress: number, frameCount: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p * Math.max(0, frameCount - 1);
}

export interface ScrollTimeOptions {
  /** Start and end of the segment, in ScrollTrigger syntax. */
  start?: string;
  end?: string;
  onActive?: (active: boolean) => void;
  /**
   * Relative to the NOW: when entering from above, the segment runs from the current frame to the last
   * one (if the current frame is already past 70 %, it starts from 0). Useful for a hero that plays on
   * its own until the visitor starts scrolling down: scrolling continues the video instead of jumping to the start.
   */
  relative?: boolean;
  /**
   * Wakes the engine loop (typically `() => engine.requestFrame()`). `setTarget` emits no
   * changes until the first `update`, so in HOLD, with the engine asleep, nothing would chase the
   * target unless it is woken up.
   */
  wake?: () => void;
}

/**
 * The "scroll is time" chapter: inside the segment, the scroll progress sets the TimeController's
 * target (scrolling down advances, scrolling up rewinds; the controller itself works out the direction).
 * On leaving the segment the target is released and playback returns to its previous rate.
 * The pinning is done by CSS (a `position: sticky` stage inside a tall section).
 */
export function bindScrollTime(section: HTMLElement, time: TimeController, options: ScrollTimeOptions = {}): () => void {
  const last = Math.max(0, time.frameCount - 1);
  let from = 0;
  const follow = (progress: number) => {
    const p = Math.min(1, Math.max(0, progress));
    // In relative mode the last frame arrives a little before the end of the segment: the damped target
    // reaches the end of its climb before the desktop is released.
    const q = Math.min(1, p / 0.88);
    // Integer target: when it settles in HOLD, the interpolated present (packs with correspondence)
    // lands exactly on its frame and does not slip back by the missing fraction.
    time.setTarget(Math.round(options.relative ? from + q * (last - from) : progressToFrame(p, time.frameCount)));
    options.wake?.();
  };
  const release = () => {
    time.releaseTarget();
    options.onActive?.(false);
  };

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: options.start ?? 'top top',
    end: options.end ?? 'bottom bottom',
    onEnter: (self) => {
      if (options.relative) from = time.frame > last * 0.7 ? 0 : time.frame;
      options.onActive?.(true);
      follow(self.progress);
    },
    onEnterBack: (self) => {
      options.onActive?.(true);
      follow(self.progress);
    },
    onUpdate: (self) => {
      if (self.isActive) follow(self.progress);
    },
    onLeave: release,
    onLeaveBack: release,
  });

  if (import.meta.env.DEV) Object.assign(window, { __scrollTime: { trigger, time } });

  return () => {
    trigger.kill();
    time.releaseTarget();
  };
}
