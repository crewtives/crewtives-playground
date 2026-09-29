import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplayMode, RetroDisplay } from '../../engine/display/RetroDisplay';

// Fake displays: the registry only uses the `mode` setter.
function fakeDisplay(mode: DisplayMode = '16'): RetroDisplay {
  return { mode } as unknown as RetroDisplay;
}

let registry: typeof import('./displays').displayRegistry;

beforeEach(async () => {
  vi.resetModules();
  ({ displayRegistry: registry } = await import('./displays'));
});

describe('page display registry', () => {
  it('starts at 16 colors and a registered view takes the current mode', () => {
    expect(registry.mode).toBe('16');
    const display = fakeDisplay('millions');
    registry.register(display);
    expect(display.mode).toBe('16');
  });

  it('setting the mode changes every registered view', () => {
    const views = [fakeDisplay(), fakeDisplay(), fakeDisplay()];
    for (const view of views) registry.register(view);
    registry.setMode('1bit');
    expect(views.map((v) => v.mode)).toEqual(['1bit', '1bit', '1bit']);
    expect(registry.mode).toBe('1bit');
  });

  it('a new view inherits the current mode', () => {
    registry.setMode('millions');
    const late = fakeDisplay('1bit');
    registry.register(late);
    expect(late.mode).toBe('millions');
  });

  it('synchronized controls receive every change', () => {
    const control = vi.fn();
    const other = vi.fn();
    const unsubscribe = registry.onChange(control);
    registry.onChange(other);
    registry.setMode('1bit');
    registry.setMode('millions');
    expect(control.mock.calls).toEqual([['1bit'], ['millions']]);
    expect(other.mock.calls).toEqual([['1bit'], ['millions']]);
    unsubscribe();
    registry.setMode('16');
    expect(control).toHaveBeenCalledTimes(2);
    expect(other).toHaveBeenCalledTimes(3);
  });

  it('a view removed from the registry no longer changes', () => {
    const kept = fakeDisplay();
    const removed = fakeDisplay();
    registry.register(kept);
    const unregister = registry.register(removed);
    unregister();
    registry.setMode('1bit');
    expect(kept.mode).toBe('1bit');
    expect(removed.mode).toBe('16');
  });
});
