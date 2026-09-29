import type { Vec3 } from '../pack/format';

export interface Bounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

/**
 * Marey's fixed side camera: looks perpendicular to the subject's axis of travel (the horizontal
 * axis with the largest extent), from the side where the source camera was, almost at subject height
 * and with a low fov so the millipede reads as a plate rather than as a scene in perspective.
 */
export function sidePreset(
  bounds: Bounds,
  cameras: Array<{ pos: Vec3 }>,
  aspect: number,
  fov = 18,
  fill = 0.74,
): { position: Vec3; target: Vec3; fov: number } {
  const center: Vec3 = [
    (bounds.min.x + bounds.max.x) / 2,
    (bounds.min.y + bounds.max.y) / 2,
    (bounds.min.z + bounds.max.z) / 2,
  ];
  const spanX = bounds.max.x - bounds.min.x;
  const spanZ = bounds.max.z - bounds.min.z;
  const alongX = spanX >= spanZ;
  const travel = Math.max(spanX, spanZ);

  // Side of the source camera along the axis perpendicular to the travel.
  const axis = alongX ? 2 : 0;
  const mean = cameras.reduce((sum, c) => sum + c.pos[axis], 0) / Math.max(1, cameras.length);
  const side = mean - center[axis] >= 0 ? 1 : -1;

  const halfHorizontal = Math.atan(Math.tan((fov * Math.PI) / 360) * aspect);
  const distance = travel / 2 / fill / Math.tan(halfHorizontal);
  const lift = Math.tan((5 * Math.PI) / 180) * distance;

  const position: Vec3 = [...center];
  position[axis] += side * distance;
  position[1] += lift;
  return { position, target: center, fov };
}
