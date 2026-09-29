import { describe, expect, test } from 'vitest';
import { PinchRecognizer, springStep, type PointerLike } from './pinch';

const touch = (pointerId: number, clientX: number, clientY = 0): PointerLike => ({ pointerId, pointerType: 'touch', clientX, clientY });

describe('critically damped spring', () => {
  test('independent of fps', () => {
    const run = (steps: number) => {
      const state = { x: 1, v: 0 };
      for (let i = 0; i < steps; i++) springStep(state, 0, 0.1, 0.5 / steps);
      return state.x;
    };
    expect(run(30)).toBeCloseTo(run(1), 12);
    expect(run(144)).toBeCloseTo(run(1), 12);
  });

  test('from rest it arrives without bouncing', () => {
    const state = { x: 1, v: 0 };
    let previous = state.x;
    for (let i = 0; i < 120; i++) {
      springStep(state, 0, 0.1, 1 / 60);
      expect(state.x).toBeLessThanOrEqual(previous);
      expect(state.x).toBeGreaterThanOrEqual(0);
      previous = state.x;
    }
    expect(state.x).toBeLessThan(1e-4);
  });
});

describe('pinch', () => {
  test('two fingers spreading to double the distance ask for ln(1/2)', () => {
    const pinch = new PinchRecognizer();
    pinch.pointerDown(touch(1, 100));
    pinch.pointerDown(touch(2, 200));
    expect(pinch.pointerPinch).toBe(true);
    let total = 0;
    for (let x = 210; x <= 300; x += 10) total += pinch.pointerMove(touch(2, x)) ?? 0;
    expect(total).toBeCloseTo(-Math.log(2), 10);
    // Bringing them back together returns to the start.
    total += pinch.pointerMove(touch(2, 200)) ?? 0;
    expect(total).toBeCloseTo(0, 10);
  });

  test('one finger, the mouse and a third finger do not pinch', () => {
    const pinch = new PinchRecognizer();
    pinch.pointerDown(touch(1, 100));
    expect(pinch.pointerMove(touch(1, 150))).toBeNull();
    pinch.pointerDown({ pointerId: 9, pointerType: 'mouse', clientX: 0, clientY: 0 });
    expect(pinch.pointerPinch).toBe(false);
    pinch.pointerDown(touch(2, 300));
    pinch.pointerDown(touch(3, 500));
    expect(pinch.pointerMove(touch(3, 900))).toBeNull();
    pinch.pointerUp({ pointerId: 1 });
    expect(pinch.pointerPinch).toBe(false);
    expect(pinch.pointerMove(touch(2, 400))).toBeNull();
  });

  test('only Ctrl+wheel counts, with the trackpad sign and saturated for the mouse', () => {
    const pinch = new PinchRecognizer();
    expect(pinch.wheel({ ctrlKey: false, deltaY: 100, deltaMode: 0 })).toBeNull();
    expect(pinch.wheel({ ctrlKey: true, deltaY: -10, deltaMode: 0 })!).toBeCloseTo(-0.1, 2);
    expect(pinch.wheel({ ctrlKey: true, deltaY: 4, deltaMode: 0 })!).toBeCloseTo(0.04, 3);
    const notch = pinch.wheel({ ctrlKey: true, deltaY: 100, deltaMode: 0 })!;
    expect(notch).toBeGreaterThan(0.25);
    expect(notch).toBeLessThanOrEqual(0.3);
    expect(pinch.wheel({ ctrlKey: true, deltaY: 3, deltaMode: 1 })!).toBeCloseTo(0.3 * Math.tanh(0.5 / 0.3), 6);
  });

  test('Safari: the gesture wins over its Ctrl+wheel and its scale is absolute', () => {
    const pinch = new PinchRecognizer();
    pinch.gestureStart();
    expect(pinch.wheel({ ctrlKey: true, deltaY: -10, deltaMode: 0 })).toBeNull();
    expect(pinch.gestureChange(2)!).toBeCloseTo(-Math.log(2), 10);
    expect(pinch.gestureChange(1)!).toBeCloseTo(Math.log(2), 10);
    pinch.gestureEnd();
    expect(pinch.wheel({ ctrlKey: true, deltaY: -10, deltaMode: 0 })).not.toBeNull();
  });

  test('iOS: with two fingers, the GestureEvent is not added', () => {
    const pinch = new PinchRecognizer();
    pinch.pointerDown(touch(1, 100));
    pinch.pointerDown(touch(2, 200));
    pinch.gestureStart();
    expect(pinch.gestureChange(1.5)).toBeNull();
    expect(pinch.pointerMove(touch(2, 300))!).toBeCloseTo(-Math.log(2), 10);
    expect(pinch.wheel({ ctrlKey: true, deltaY: -10, deltaMode: 0 })).toBeNull();
  });
});
