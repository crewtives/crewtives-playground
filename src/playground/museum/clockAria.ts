// What the page clock's scrubber exposes to assistive technologies (design adapt-for-phones D5), as a
// pure decision. A screen reader announces every value change of a focused slider, so the position is
// written at once only when the visitor asks for it (focus, a change of state), at most once a second
// while the clock runs unfocused, and never while it runs with focus. Pure: no DOM, no clock of its own.

import type { ClockState } from './clock';

/** The least time between two writes while the clock runs without focus (ms). */
export const CLOCK_ARIA_INTERVAL = 1000;

export interface ClockAriaInput {
  state: ClockState;
  /** The drawn position, 0-based: in HOLD the requested one while the knob still chases it. */
  frame: number;
  frames: number;
  /** The scrubber has focus. */
  focused: boolean;
  /** When this is decided (ms, the same clock as `ClockAriaWrite.at`). */
  now: number;
}

export interface ClockAriaWrite {
  /** `aria-valuenow`, 1-based. */
  value: number;
  /** `aria-valuetext`. */
  text: string;
  state: ClockState;
  at: number;
}

const WORD: Record<ClockState, string> = { forward: 'playing forward', rewind: 'rewinding', hold: 'held' };

/**
 * The write to make now, or null to leave the exposed position as it is. `last` is the previous write
 * (null before the first); `focusing` is true on the scrubber's focus event, which always writes.
 */
export function clockAria(input: ClockAriaInput, last: ClockAriaWrite | null, focusing = false): ClockAriaWrite | null {
  const running = input.state !== 'hold';
  const due =
    focusing ||
    last === null ||
    last.state !== input.state ||
    !running ||
    (!input.focused && input.now - last.at >= CLOCK_ARIA_INTERVAL);
  if (!due) return null;
  const value = Math.max(0, Math.min(input.frames - 1, Math.round(input.frame))) + 1;
  return { value, text: `frame ${value} of ${input.frames}, ${WORD[input.state]}`, state: input.state, at: input.now };
}
