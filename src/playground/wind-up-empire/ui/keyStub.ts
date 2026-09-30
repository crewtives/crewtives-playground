// The key's tag as a stub of the build queue (design adapt-for-phones D8). Where the key is a tile and
// the ticket sits below the fold (≤ 900 px, and phones in landscape), the tag that hangs from the key
// mirrors the queue: what to do next, the turns wound over the turns the job needs, and whether the
// spring runs or holds. Pure: the build desk (buildDesk.ts) writes the text and the coil.
import { SECONDS_PER_TURN, type Economy, type SpringMode } from '../economy';

export interface StubState {
  mode: SpringMode;
  /** Jobs in the queue. */
  queued: number;
  /** Whole turns stored in the spring. */
  wound: number;
  /** Whole turns the active job still needs, counted from its progress (0 without a job). */
  needed: number;
}

/** The stub's words: WIND ME, WINDING wound/needed, RUNNING, HOLD or QUEUE EMPTY. */
export function stubText(state: StubState): string {
  // With nothing queued the wind stays stored, whatever the key does: the stub says why.
  if (state.queued === 0) return 'QUEUE EMPTY';
  if (state.mode === 'winding') return `WINDING ${state.wound}/${state.needed}`;
  if (state.mode === 'running') return 'RUNNING';
  if (state.mode === 'hold') return 'HOLD';
  return 'WIND ME';
}

/** The stub's state, read from the economy. */
export function stubState(economy: Economy): StubState {
  const s = economy.state;
  const job = s.queue[0];
  return {
    mode: s.mode,
    queued: s.queue.length,
    wound: economy.turns,
    needed: job ? Math.max(0, Math.ceil((job.time - job.progress) / SECONDS_PER_TURN - 1e-9)) : 0,
  };
}

/** Progress of the active job, from 0 to 1 (0 without a job): the width of the coil. */
export function coilProgress(economy: Economy): number {
  const job = economy.state.queue[0];
  return job ? Math.min(1, Math.max(0, job.progress / job.time)) : 0;
}
