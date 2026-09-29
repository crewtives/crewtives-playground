// Trail of 004 (D2): the Sow seeds the loop shows. Each seed is a moment: the plan is where it was
// born, `seedPosition(n, α, c)` with a single c (the one of the flower head at the last frame), and
// the elevation is the same x with its birth order n as height. The counts come from the loop's
// provenance (the seeds of each frame), never from a formula written here.

import { seedPosition, seedScale } from '../../bloomscope/sow/sow';
import type { Moment } from './trail';

export interface SeedTrail {
  /** One moment per seed, from seed 0 to the newest one at the last frame, in birth order. */
  moments: Moment[];
  /** Loop segment: from the newest seed at frame 0 to the newest seed at the last frame. */
  span: [number, number];
  /** The NOW of each loop frame: its newest seed. */
  nows: number[];
  /** The single c of the whole trail. */
  c: number;
}

/**
 * @param alpha Sow angle in degrees: `decodeGarden(fixed link).sow`.
 * @param seedsPerFrame Seeds Sow shows at each frame of the loop, according to the provenance.
 */
export function seedTrail(alpha: number, seedsPerFrame: readonly number[]): SeedTrail {
  if (seedsPerFrame.length === 0) throw new Error('seedTrail: the provenance records no seeds');
  for (let i = 1; i < seedsPerFrame.length; i++) {
    if (seedsPerFrame[i] < seedsPerFrame[i - 1]) throw new Error(`seedTrail: the seed count drops at frame ${i}`);
  }
  const last = seedsPerFrame[seedsPerFrame.length - 1];
  const c = seedScale(last);
  const moments: Moment[] = [];
  for (let n = 0; n < last; n++) {
    const [x, y] = seedPosition(n, alpha, c);
    // The flower head has y pointing up and the drawing has it pointing down: the plan shows it as the work does.
    moments.push({ x, depth: -y, t: n });
  }
  const nows = seedsPerFrame.map((count) => count - 1);
  return { moments, span: [nows[0], nows[nows.length - 1]], nows, c };
}
