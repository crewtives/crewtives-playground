// What main.ts hands to the lid, whether the 3D scene (scene/boot.ts) or its 2D print (fallback2d.ts).
// It lives in its own module so that neither of them imports main.ts.
import type { Economy } from './economy';
import type { Fleet } from './fleet';
import type { Hangar } from './ui/hangar';
import type { Winder } from './ui/keyControl';
import type { SurveyLog } from './ui/log';
import type { Rosette } from './ui/rosette';

export interface SharedContext {
  fleet: Fleet;
  economy: Economy;
  log: SurveyLog;
  hangar: Hangar;
  /** Coarse pointer on a narrow screen. */
  phone: boolean;
  winder: Winder;
  rosette: Rosette;
  /** Symmetry fold currently set on the press. */
  fold: () => number;
  onEconomy: (fn: () => void) => void;
  onReset: (fn: () => void) => void;
  onMemory: (fn: (moments: number) => void) => void;
  onSymmetry: (fn: (fold: number) => void) => void;
  onReveal: (fn: (value: number) => void) => void;
  onLift: (fn: (progress: number) => void) => void;
}
