import { Vector3 } from 'three';
import type { Pack } from '../pack/loader';
import type { CameraPreset } from '../viewer/TimeViewer';

/**
 * Close-up of the subject in one frame: 70° off the source camera's axis and slightly raised. A frame
 * is a small subject in a large scene; framing the whole journey shrinks it to a few pixels.
 * `lead` moves the framing center that fraction toward the source camera, so its frustum fits.
 */
export function closeUp(pack: Pack, frame: number, distance: number, fov: number, lead = 0): CameraPreset {
  const { bbox, cameras } = pack.meta;
  const min = new Vector3(...bbox.min);
  const size = new Vector3(...bbox.max).sub(min);
  const { offsets, positions } = pack.dynamic;
  const target = new Vector3();
  let n = 0;
  for (let i = offsets[frame]; i < offsets[frame + 1]; i += 10, n++) {
    target.x += positions[i * 3];
    target.y += positions[i * 3 + 1];
    target.z += positions[i * 3 + 2];
  }
  target.divideScalar(Math.max(1, n) * 65535).multiply(size).add(min);
  target.lerp(new Vector3(...cameras[frame].pos), lead);
  const elevation = (20 * Math.PI) / 180;
  const direction = new Vector3(...cameras[frame].pos)
    .sub(target)
    .setY(0)
    .normalize()
    .applyAxisAngle(new Vector3(0, 1, 0), (70 * Math.PI) / 180)
    .multiplyScalar(Math.cos(elevation))
    .setY(Math.sin(elevation));
  const position = target.clone().addScaledVector(direction, distance);
  return { position: position.toArray() as CameraPreset['position'], target: target.toArray() as CameraPreset['target'], fov };
}
