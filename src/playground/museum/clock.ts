// Page clock (D4): a single TimeController governs the time of the whole collection. Three states,
// FORWARD, REWIND and HOLD, with `play(1)`, `play(-1)` and `hold()`: the museum has no speeds, so
// pressing J or L again does not speed up. Its playback already wraps around, so the last frame goes to
// the first (and back) with the declared cut. Pure: it does not touch the DOM or request animation frames.

import { TimeController } from '../../engine/time/TimeController';
import { LOOP_FPS, LOOP_FRAMES } from './loops/provenance';

export type ClockState = 'forward' | 'rewind' | 'hold';

export type ClockListener = (frame: number, state: ClockState) => void;

export class PageClock {
  readonly frames = LOOP_FRAMES;
  readonly fps = LOOP_FPS;
  private readonly time = new TimeController({ frameCount: LOOP_FRAMES, fps: LOOP_FPS, mode: 'memory' });
  private _state: ClockState;
  private readonly listeners = new Set<ClockListener>();

  constructor(initial: ClockState = 'forward') {
    this._state = 'hold';
    this.set(initial);
  }

  get state(): ClockState {
    return this._state;
  }

  get frame(): number {
    return this.time.frame;
  }

  /** Animation frames must keep being requested: the clock is running. */
  get running(): boolean {
    return this._state !== 'hold';
  }

  set(state: ClockState): void {
    if (state === 'forward') this.time.play(1);
    else if (state === 'rewind') this.time.play(-1);
    else this.time.hold();
    const changed = state !== this._state;
    this._state = state;
    if (changed) this.emit();
  }

  /** Exact jump to a loop frame (scrubber, arrow keys). Does not change the state. */
  seek(frame: number): void {
    const before = this.time.frame;
    this.time.seek(((Math.round(frame) % this.frames) + this.frames) % this.frames);
    if (this.time.frame !== before) this.emit();
  }

  /** Advances dt seconds; notifies only if the frame changed. */
  tick(dt: number): void {
    if (!this.running) return;
    const before = this.time.frame;
    this.time.update(dt);
    if (this.time.frame !== before) this.emit();
  }

  subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.time.frame, this._state);
  }
}

/**
 * Scrubber with limited flashes (12.5, "Limited flashes" in playground-hub): the clock chases the
 * scrubber's target at most SCRUB_STEP frames per step (one step every 1/15 s) and does not change
 * direction until SCRUB_TURN_MS after it started moving in the current direction. That way neither a
 * violent drag nor alternating keys make the VISTAs go back and forth more than three times per second.
 *
 * The figures come from measuring the luminance of the published passes with this same chase (pixels
 * with more than 3 flashes in one second, maximum area in a 10° field, failing above 25 %), with the
 * largest possible VISTA (CSS px per native pixel: e = 2, bloomscope = 4): without the limited turn,
 * S = 2 already reached 38 %; with the turn, S = 2 stays at 21 % and S = 3 goes to 26 %. A full sweep,
 * from 1 to 45, takes 22 steps (1.5 s).
 */
export const SCRUB_STEP = 2;
export const SCRUB_TURN_MS = 1000 / 3;

export class ScrubChase {
  private dir = 0;
  /** When it started moving in the current direction. */
  private since = -Infinity;

  /** The frame of the next step towards `target` at instant `now` (ms); the same one if it cannot turn yet. */
  next(frame: number, target: number, now: number): number {
    const want = Math.sign(target - frame);
    if (want === 0) return frame;
    if (want !== this.dir) {
      if (now - this.since < SCRUB_TURN_MS) return frame;
      this.dir = want;
      this.since = now;
    }
    return frame + want * Math.min(Math.abs(target - frame), SCRUB_STEP);
  }
}

/** Clock key (J, K, L) → state, or null. */
export function clockKey(key: string): ClockState | null {
  switch (key.toLowerCase()) {
    case 'j':
      return 'rewind';
    case 'k':
      return 'hold';
    case 'l':
      return 'forward';
    default:
      return null;
  }
}

/** A text field keeps the keys for itself. */
export function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLInputElement) return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file'].includes(target.type);
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target as HTMLElement).isContentEditable;
}
