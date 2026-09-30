import { describe, expect, test } from 'vitest';
import type { ClockState } from './clock';
import { CLOCK_ARIA_INTERVAL, clockAria, type ClockAriaWrite } from './clockAria';

const FRAMES = 45;
const at = (now: number, frame: number, state: ClockState = 'forward', focused = false) => ({ state, frame, frames: FRAMES, focused, now });

describe('scrubber position for assistive technologies (adapt-for-phones D5)', () => {
  test('the first write happens at once, with the drawn position, 1-based', () => {
    const write = clockAria(at(0, 11), null);
    expect(write).toEqual({ value: 12, text: 'frame 12 of 45, playing forward', state: 'forward', at: 0 });
  });

  test('while the clock runs without focus, a write inside the second is held back', () => {
    const first = clockAria(at(0, 11), null)!;
    expect(clockAria(at(500, 18), first)).toBeNull();
    expect(clockAria(at(CLOCK_ARIA_INTERVAL - 1, 26), first)).toBeNull();
  });

  test('the first painted frame after the second writes the drawn position', () => {
    const first = clockAria(at(0, 11), null)!;
    const next = clockAria(at(CLOCK_ARIA_INTERVAL + 16, 26), first);
    expect(next).toEqual({ value: 27, text: 'frame 27 of 45, playing forward', state: 'forward', at: CLOCK_ARIA_INTERVAL + 16 });
  });

  test('a change of state writes at once and says the new state', () => {
    const first = clockAria(at(0, 11), null)!;
    expect(clockAria(at(200, 14, 'rewind'), first)).toEqual({ value: 15, text: 'frame 15 of 45, rewinding', state: 'rewind', at: 200 });
    expect(clockAria(at(300, 13, 'hold', true), first)?.text).toBe('frame 14 of 45, held');
  });

  test('in HOLD every call writes the drawn position (a drag, an arrow key), focused or not', () => {
    const held = clockAria(at(0, 20, 'hold'), null)!;
    expect(clockAria(at(10, 21, 'hold', true), held)?.value).toBe(22);
    expect(clockAria(at(20, 21, 'hold'), held)?.value).toBe(22);
  });

  test('focusing the scrubber writes at once, even inside the second', () => {
    const first = clockAria(at(0, 11), null)!;
    expect(clockAria(at(300, 16, 'forward', true), first, true)).toEqual({ value: 17, text: 'frame 17 of 45, playing forward', state: 'forward', at: 300 });
  });

  test('nothing is written while the clock runs with focus, however long it runs', () => {
    const onFocus = clockAria(at(300, 16, 'forward', true), null, true)!;
    for (const now of [400, 1300, 2500, 5300]) expect(clockAria(at(now, 20, 'forward', true), onFocus)).toBeNull();
  });

  test('after blur the throttled writes resume', () => {
    const onFocus = clockAria(at(300, 16, 'forward', true), null, true)!;
    expect(clockAria(at(5300, 30, 'forward', true), onFocus)).toBeNull();
    const resumed = clockAria(at(5316, 31), onFocus);
    expect(resumed?.value).toBe(32);
    expect(clockAria(at(5316 + 500, 38), resumed)).toBeNull();
    expect(clockAria(at(5316 + CLOCK_ARIA_INTERVAL, 1), resumed)?.value).toBe(2);
  });

  test('the value stays inside the loop', () => {
    expect(clockAria(at(0, -1, 'hold'), null)?.value).toBe(1);
    expect(clockAria(at(0, 60, 'hold'), null)?.value).toBe(FRAMES);
  });
});

// The exposed value never trails the knob by more than a second of loop time plus one frame: at 15 fps
// and one write per second, it is at most 16 frames behind, counting across the wrap.
test('a running clock sampled every painted frame for 6 s stays within 16 frames of the knob', () => {
  const fps = 15;
  let last: ClockAriaWrite | null = null;
  let exposed = 0;
  let worst = 0;
  const changes: number[] = [];
  for (let now = 0; now <= 6000; now += 1000 / 60) {
    const frame = Math.floor((now / 1000) * fps) % FRAMES;
    const write = clockAria(at(now, frame), last);
    if (write) {
      if (last && write.value !== last.value) changes.push(now);
      last = write;
      exposed = write.value - 1;
    }
    const lag = (frame - exposed + FRAMES) % FRAMES;
    worst = Math.max(worst, lag);
  }
  expect(worst).toBeLessThanOrEqual(16);
  for (let i = 1; i < changes.length; i++) expect(changes[i] - changes[i - 1]).toBeGreaterThanOrEqual(CLOCK_ARIA_INTERVAL);
});
