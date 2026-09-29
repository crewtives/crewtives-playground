// Address of the 4F machine: COPY THIS MACHINE copies `#4f?sym=…&rails=…&seed=…&shutter=…`.
// Each value is validated on its own: an invalid one falls back to its default without touching the others.
import type { Symmetry } from './layout';
import type { Rails, Shutter } from './sim';

export interface MachineState {
  symmetry: Symmetry;
  rails: Rails;
  seed: number;
  shutter: Shutter;
}

export const DEFAULT_MACHINE: MachineState = { symmetry: 'mirror', rails: 'twin', seed: 4077, shutter: '5' };

const SYM_CODE: Record<Symmetry, string> = { mirror: 'mirror', six: '6', eight: '8', free: 'free' };

export function encodeMachine(state: MachineState): string {
  return `#4f?sym=${SYM_CODE[state.symmetry]}&rails=${state.rails}&seed=${state.seed}&shutter=${state.shutter}`;
}

/** Machine state from a `#4f?…` address, or null if the address is not a 4F address with state. */
export function decodeMachine(hash: string): MachineState | null {
  const m = /^#?4f\?(.*)$/i.exec(hash);
  if (!m) return null;
  const params = new URLSearchParams(m[1]);
  const out = { ...DEFAULT_MACHINE };
  const sym = Object.entries(SYM_CODE).find(([, code]) => code === params.get('sym'));
  if (sym) out.symmetry = sym[0] as Symmetry;
  const rails = params.get('rails');
  if (rails === 'twin' || rails === 'left') out.rails = rails;
  const seed = params.get('seed');
  if (seed && /^\d{1,9}$/.test(seed)) out.seed = Number(seed);
  const shutter = params.get('shutter');
  if (shutter === 'now' || shutter === '1' || shutter === '5' || shutter === 'all') out.shutter = shutter;
  return out;
}
