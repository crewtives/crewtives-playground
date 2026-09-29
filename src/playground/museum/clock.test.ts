import { describe, expect, test } from 'vitest';
import { clockKey, PageClock, SCRUB_STEP, SCRUB_TURN_MS, ScrubChase } from './clock';

describe('page clock (5.1)', () => {
  test('Clock keys: J, K and L give REWIND, HOLD and FORWARD', () => {
    const clock = new PageClock();
    const seen: string[] = [];
    clock.subscribe((_, state) => seen.push(state));
    for (const key of ['j', 'K', 'l']) clock.set(clockKey(key)!);
    expect(seen).toEqual(['rewind', 'hold', 'forward']);
    expect(clockKey('x')).toBeNull();
  });

  test('starts in FORWARD, or in HOLD if asked (reduced motion)', () => {
    expect(new PageClock().state).toBe('forward');
    expect(new PageClock('hold').state).toBe('hold');
  });

  test('No acceleration: L three times still advances 15 frames per second', () => {
    const clock = new PageClock();
    clock.set('forward');
    clock.set('forward');
    clock.set('forward');
    clock.tick(1);
    expect(clock.frame).toBe(15);
  });

  test('Loop wrap: frame 0 comes after the last frame, and 44 when rewinding', () => {
    const clock = new PageClock();
    clock.seek(44);
    clock.tick(1 / 15 + 1e-6);
    expect(clock.frame).toBe(0);
    clock.set('rewind');
    clock.tick(1 / 15 + 1e-6);
    expect(clock.frame).toBe(44);
  });

  test('HOLD neither changes the frame nor notifies', () => {
    const clock = new PageClock();
    clock.seek(17);
    clock.set('hold');
    let calls = 0;
    clock.subscribe(() => calls++);
    clock.tick(5);
    expect(clock.frame).toBe(17);
    expect(calls).toBe(0);
    expect(clock.running).toBe(false);
  });

  test('seek wraps around and does not change the state', () => {
    const clock = new PageClock('hold');
    clock.seek(-1);
    expect(clock.frame).toBe(44);
    clock.seek(45);
    expect(clock.frame).toBe(0);
    expect(clock.state).toBe('hold');
  });
});

describe('scrubber with limited flashes (12.5)', () => {
  const STEP_MS = 1000 / 15;

  test('reaches the target at most SCRUB_STEP frames per step', () => {
    const chase = new ScrubChase();
    let frame = 0;
    const seen: number[] = [];
    for (let i = 0; frame !== 44 && i < 100; i++) {
      const next = chase.next(frame, 44, i * STEP_MS);
      expect(Math.abs(next - frame)).toBeLessThanOrEqual(SCRUB_STEP);
      frame = next;
      seen.push(frame);
    }
    expect(frame).toBe(44);
    expect(seen.length).toBe(Math.ceil(44 / SCRUB_STEP));
  });

  test('does not change direction before SCRUB_TURN_MS: with the target jumping from end to end, at most 3 turns per second', () => {
    const chase = new ScrubChase();
    let frame = 22;
    let dir = 0;
    const turns: number[] = [];
    for (let i = 0; i < 15 * 4; i++) {
      const now = i * STEP_MS;
      const next = chase.next(frame, i % 2 ? 0 : 44, now);
      const d = Math.sign(next - frame);
      if (d !== 0 && dir !== 0 && d !== dir) turns.push(now);
      if (d !== 0) dir = d;
      frame = next;
    }
    expect(turns.length).toBeGreaterThan(0);
    for (let i = 1; i < turns.length; i++) expect(turns[i] - turns[i - 1]).toBeGreaterThanOrEqual(SCRUB_TURN_MS);
    for (const t of turns) expect(turns.filter((u) => u >= t && u < t + 1000).length).toBeLessThanOrEqual(3);
  });

  test('the first step does not wait; going back does, until the turn time has passed', () => {
    const chase = new ScrubChase();
    const first = chase.next(10, 30, 0);
    expect(first).toBe(10 + SCRUB_STEP);
    expect(chase.next(first, 0, 1)).toBe(first);
    expect(chase.next(first, 0, SCRUB_TURN_MS)).toBe(first - SCRUB_STEP);
  });
});
