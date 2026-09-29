import { WHALE_FALL, fallStateAtFrame } from '../../../pipeline/scenes/whaleFall';

// The whale's path for the trail and the framings of landing E: everything comes from the scene's
// module (spec `procedural-subject`), not from the 4D pack's points.

/**
 * Path length between two copies of the trail (m): a little more than the whale's length. Near the horizon
 * it barely moves forward, so the copies spread out in time (around 15 frames apart at the start and more
 * than 100 at the end) and each one reads whole, as in a chronophotograph, instead of piling up in a ring.
 */
export const ECHO_GAP = WHALE_FALL.whaleLength * 1.15;

/** Trail stride (frames) at each frame: as many as it takes to cover `gap` m at that speed. */
export function pathStride(fps: number, gap: number): (frame: number) => number {
  const cache = new Map<number, number>();
  return (frame) => {
    let stride = cache.get(frame);
    if (stride === undefined) {
      const a = fallStateAtFrame(Math.max(0, frame - 1), fps).position;
      const b = fallStateAtFrame(Math.max(1, frame), fps).position;
      stride = Math.ceil(gap / Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])));
      cache.set(frame, stride);
    }
    return stride;
  };
}

/**
 * Azimuth (degrees, like atan2(z, x)) from which the whale at frame `frame` is seen in profile, from the
 * outside of its orbit: with the final roll it shows its belly and pectoral fins, and the shadow stays behind.
 */
export function profileAzimuth(fps: number, frame: number): number {
  const { heading, position } = fallStateAtFrame(frame, fps);
  const side = heading + Math.PI / 2;
  const outward = Math.cos(side) * position[0] + Math.sin(side) * position[2] > 0;
  return ((outward ? side : side + Math.PI) * 180) / Math.PI;
}

/** chaseCam's `sideFar` (degrees from "right behind" the overall heading) that puts the camera at `profileAzimuth`. */
export function profileSide(fps: number, frame: number): number {
  const start = fallStateAtFrame(0, fps).position;
  const end = fallStateAtFrame(frame, fps).position;
  const global = (Math.atan2(end[2] - start[2], end[0] - start[0]) * 180) / Math.PI;
  const side = profileAzimuth(fps, frame) - global - 180;
  return ((((side + 180) % 360) + 360) % 360) - 180;
}
