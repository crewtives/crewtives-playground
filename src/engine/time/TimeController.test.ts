import { describe, expect, test } from 'vitest';
import { TimeController, playbackLabel, timecode, type TimeState } from './TimeController';

const make = () => new TimeController({ frameCount: 300, fps: 15 });

/** Advances `seconds` in 1/60 s steps, like the render loop. */
function run(time: TimeController, seconds: number) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) time.update(1 / 60);
}

describe('TimeController', () => {
  test('starts in HOLD, at frame 0 and in memory mode', () => {
    const time = make();
    expect(time.state).toEqual({ frame: 0, rate: 0, direction: 0, mode: 'memory' });
    expect(time.update(1)).toBe(false);
    expect(time.frame).toBe(0);
  });

  test('moves forward at the given rate', () => {
    const time = make();
    time.play(1);
    run(time, 2);
    expect(time.frame).toBe(30);
    expect(time.direction).toBe(1);
  });

  test('loop: past the last frame it continues from the first without stopping', () => {
    const time = make();
    time.seek(295);
    time.play(1);
    run(time, 1); // +15 frames
    expect(time.frame).toBe(10);
    expect(time.playing).toBe(true);
  });

  test('rewind: with a negative speed the frame decreases, and the loop works backward', () => {
    const time = make();
    time.seek(20);
    time.play(-1);
    run(time, 1);
    expect(time.frame).toBe(5);
    expect(time.direction).toBe(-1);
    run(time, 1);
    expect(time.frame).toBe(290);
  });

  test('HOLD stops time and resuming restores the last speed', () => {
    const time = make();
    time.play(2);
    run(time, 0.5);
    const at = time.frame;
    time.togglePlay();
    expect(time.state).toMatchObject({ rate: 0, direction: 0 });
    run(time, 1);
    expect(time.frame).toBe(at);
    time.togglePlay();
    expect(time.rate).toBe(2);
  });

  test('speed steps: L speeds up forward and J backward', () => {
    const time = make();
    time.forward();
    expect(time.rate).toBe(1);
    time.forward();
    expect(time.rate).toBe(2);
    time.forward();
    time.forward();
    expect(time.rate).toBe(8);
    time.forward();
    expect(time.rate).toBe(8); // cap
    time.rewind();
    expect(time.rate).toBe(-1); // changing direction resets the step
    time.rewind();
    expect(time.rate).toBe(-2);
  });

  test('arrow: in HOLD it moves exactly one frame', () => {
    const time = make();
    time.seek(41.7);
    time.step(1);
    expect(time.frame).toBe(42);
    expect(time.exactFrame).toBe(42);
    time.step(-1);
    time.step(-1);
    expect(time.frame).toBe(40);
    time.seek(299);
    time.step(1);
    expect(time.frame).toBe(0);
  });

  test('an arrow during playback switches to HOLD', () => {
    const time = make();
    time.play(1);
    time.step(1);
    expect(time.rate).toBe(0);
  });

  test('damped target: reached without looping, and the direction follows the movement', () => {
    const time = make();
    time.play(1);
    time.setTarget(100);
    time.update(1 / 60);
    expect(time.direction).toBe(1);
    expect(time.rate).toBeGreaterThan(0);
    run(time, 2);
    expect(time.frame).toBe(100);
    expect(time.direction).toBe(0);
    expect(playbackLabel(time.state)).toBe('HOLD 0.00×');

    time.setTarget(50);
    time.update(1 / 60);
    expect(time.direction).toBe(-1);
    run(time, 2);
    expect(time.frame).toBe(50);

    time.releaseTarget();
    expect(time.rate).toBe(1); // restores the playback it had
  });

  test('a target set in HOLD is chased even if the first update arrives with dt = 0', () => {
    const time = make();
    time.setTarget(120);
    expect(time.update(0)).toBe(true); // the engine just woke up: it must not go back to sleep
    run(time, 2);
    expect(time.frame).toBe(120);
    expect(time.update(1 / 60)).toBe(false); // reached: now it can sleep
  });

  test('the mode toggles and notifies', () => {
    const time = make();
    const seen: TimeState[] = [];
    time.subscribe((state) => seen.push(state));
    time.setMode('all');
    expect(time.mode).toBe('all');
    expect(seen.at(-1)?.mode).toBe('all');
  });

  test('notifications arrive only when the integer frame, the speed or the mode changes', () => {
    const time = make();
    let calls = 0;
    time.subscribe(() => calls++);
    time.play(1); // the speed changes
    expect(calls).toBe(1);
    run(time, 1); // 60 updates, 15 whole frames
    expect(calls).toBe(16);
  });
});

describe('formats', () => {
  test('timecode MM:SS:FF', () => {
    expect(timecode(0, 15)).toBe('00:00:00');
    expect(timecode(14, 15)).toBe('00:00:14');
    expect(timecode(15, 15)).toBe('00:01:00');
    expect(timecode(299, 15)).toBe('00:19:14');
    expect(timecode(15 * 61 + 3, 15)).toBe('01:01:03');
  });

  test('playback labels', () => {
    expect(playbackLabel({ rate: 1, direction: 1 })).toBe('FORWARD +1.00×');
    expect(playbackLabel({ rate: -1, direction: -1 })).toBe('REWIND −1.00×');
    expect(playbackLabel({ rate: 0, direction: 0 })).toBe('HOLD 0.00×');
  });
});
