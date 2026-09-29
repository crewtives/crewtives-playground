// Display registry of a page: each landing has a single 1-bit / 16 / Millions control that switches
// all of its displays at once.
import type { DisplayMode, RetroDisplay } from '../../engine/display/RetroDisplay';

const displays = new Set<RetroDisplay>();
const listeners = new Set<(mode: DisplayMode) => void>();
let current: DisplayMode = '16';

export const displayRegistry = {
  get mode(): DisplayMode {
    return current;
  },

  /** Adds a display to the registry and applies the current mode to it. Returns the function that removes it. */
  register(display: RetroDisplay): () => void {
    displays.add(display);
    display.mode = current;
    return () => displays.delete(display);
  },

  setMode(mode: DisplayMode): void {
    current = mode;
    for (const display of displays) display.mode = mode;
    for (const listener of listeners) listener(mode);
  },

  onChange(listener: (mode: DisplayMode) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
