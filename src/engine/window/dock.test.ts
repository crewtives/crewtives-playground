import { describe, expect, it } from 'vitest';
import { dockLabel, nextOpen } from './dock';

describe('nextOpen', () => {
  it('opens the pressed window when none is open', () => {
    expect(nextOpen(null, 'layers')).toBe('layers');
  });

  it('switches to the pressed window when another one is open', () => {
    expect(nextOpen('layers', 'clock')).toBe('clock');
  });

  it('closes the open window when its own button is pressed', () => {
    expect(nextOpen('layers', 'layers')).toBeNull();
  });

  it('opens again after a close', () => {
    expect(nextOpen(nextOpen('layers', 'layers'), 'layers')).toBe('layers');
  });
});

describe('dockLabel', () => {
  it("takes the window title's text", () => {
    expect(dockLabel('Camera 1', 'source')).toBe('Camera 1');
  });

  it('collapses white space from the markup', () => {
    expect(dockLabel('\n   Layers\n  ', 'layers')).toBe('Layers');
    expect(dockLabel('Camera\n      1', 'source')).toBe('Camera 1');
  });

  it("falls back to the window's name without a title", () => {
    expect(dockLabel(null, 'plan')).toBe('plan');
    expect(dockLabel(undefined, 'plan')).toBe('plan');
    expect(dockLabel('   ', 'plan')).toBe('plan');
  });
});
