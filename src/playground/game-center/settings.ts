// Service panel (RF) settings, saved per visitor in this browser (try/catch): screen, rain, ghosts,
// mirror and automatic demo. Sound is saved by the shared module.
import type { DisplayMode } from '../../engine/display/RetroDisplay';

export interface ServiceSettings {
  screen: DisplayMode;
  rain: boolean;
  ghosts: boolean;
  flip: boolean;
  attract: boolean;
}

export const SETTINGS_KEY = 'game-center:service';
export const DEFAULTS: ServiceSettings = { screen: '16', rain: true, ghosts: true, flip: false, attract: true };

/** Reads the saved settings; any missing or invalid value falls back to its default. */
export function parseSettings(raw: string | null): ServiceSettings {
  const out = { ...DEFAULTS };
  if (!raw) return out;
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof ServiceSettings, unknown>>;
    if (data.screen === '16' || data.screen === '1bit' || data.screen === 'millions') out.screen = data.screen;
    for (const key of ['rain', 'ghosts', 'flip', 'attract'] as const) {
      if (typeof data[key] === 'boolean') out[key] = data[key] as boolean;
    }
  } catch {
    // Unreadable settings: defaults.
  }
  return out;
}

/** SW2–SW3 → screen mode. Every combination resolves to one of the three modes (11 = 16). */
export function screenFromBits(sw2: boolean, sw3: boolean): DisplayMode {
  if (!sw2 && sw3) return '1bit';
  if (sw2 && !sw3) return 'millions';
  return '16';
}

/** Mode → canonical SW2–SW3 position (00 = 16, 01 = 1-BIT, 10 = MILLIONS). */
export function bitsFromScreen(mode: DisplayMode): [boolean, boolean] {
  if (mode === '1bit') return [false, true];
  if (mode === 'millions') return [true, false];
  return [false, false];
}

type Listener = (s: ServiceSettings) => void;

function read(): ServiceSettings {
  try {
    return parseSettings(window.localStorage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULTS };
  }
}

let current: ServiceSettings = typeof window === 'undefined' ? { ...DEFAULTS } : read();
const listeners = new Set<Listener>();

export const settings = {
  get value(): ServiceSettings {
    return current;
  },
  set(patch: Partial<ServiceSettings>): void {
    const next = { ...current, ...patch };
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    current = next;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch {
      // No storage: the settings last as long as the page.
    }
    for (const listener of listeners) listener(current);
  },
  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
