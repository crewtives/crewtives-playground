import { PHI, TIMES } from '../../../pipeline/scenes/falconPhi';
import type { SubjectTrack } from '../../../engine/shell/chaseCam';

export interface SpiralMeasure {
  /** Pairs of frames a quarter turn apart, measured on the points. */
  pairs: number;
  min: number;
  max: number;
  /** Worst deviation from φ, as a fraction. */
  worst: number;
  /** Turns of the measured segment. */
  turns: number;
}

/**
 * The golden ratio measured on the loaded 4D pack, without using the equations: the subject's center in
 * each frame (the mean of its points), its distance to the tower's axis (x = z = 0) and its unwrapped
 * angle around that axis. For each frame of the spiral segment, it finds the (interpolated) instant when
 * the measured angle was a quarter turn smaller, and divides the radius at that instant by the current one.
 */
export function measureSpiral(track: SubjectTrack, fps: number): SpiralMeasure | null {
  const count = Math.min(track.centers.length / 3, Math.floor(TIMES.spiralEnd * fps) + 1);
  if (count < 4) return null;
  const radius = new Float64Array(count);
  const angle = new Float64Array(count);
  let previous = 0;
  for (let f = 0; f < count; f++) {
    const x = track.centers[f * 3];
    const z = track.centers[f * 3 + 2];
    radius[f] = Math.hypot(x, z);
    // The spiral turns in the direction in which the world's polar angle decreases: θ = unwrapped −atan2.
    const polar = -Math.atan2(z, x);
    let value = polar;
    if (f > 0) {
      while (value - previous > Math.PI) value -= 2 * Math.PI;
      while (value - previous < -Math.PI) value += 2 * Math.PI;
    }
    angle[f] = value;
    previous = value;
  }
  const start = angle[0];
  let pairs = 0;
  let min = Infinity;
  let max = -Infinity;
  let worst = 0;
  let j = 0;
  for (let f = 1; f < count; f++) {
    const target = angle[f] - Math.PI / 2;
    if (target < start) continue;
    while (j + 1 < f && angle[j + 1] < target) j++;
    if (angle[j] > target || angle[j + 1] < target) continue;
    const u = (target - angle[j]) / (angle[j + 1] - angle[j]);
    const earlier = radius[j] + (radius[j + 1] - radius[j]) * u;
    const ratio = earlier / radius[f];
    pairs++;
    min = Math.min(min, ratio);
    max = Math.max(max, ratio);
    worst = Math.max(worst, Math.abs(ratio / PHI - 1));
  }
  if (pairs === 0) return null;
  return { pairs, min, max, worst, turns: (angle[count - 1] - start) / (2 * Math.PI) };
}
