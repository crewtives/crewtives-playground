import { goldenRectangles, TOWER } from '../../../pipeline/scenes/falconPhi';

// The scene's golden diagram (the nested rectangles above the rooftop) comes out of the bake in cyan, the
// color that in D means "the present moving forward". The landing recolors it, in memory and without
// touching the 4D pack, with the plotter's grid stroke: cyan is kept for the "NOW" alone and gold for
// the spiral.

/** Height of the diagram plane: 0.4 m above the tower's rooftop (`DIAGRAM_Y` in the recipe). */
export const DIAGRAM_Y = TOWER.height + 0.4;
/** Height tolerance (m): the 4D pack quantizes position to 16 bits over ~77 m (≈1.2 mm). */
const Y_TOLERANCE = 0.02;

export interface StaticPoints {
  /** u16 positions normalized to the 4D pack's bounding box (x, y, z). */
  positions: Uint16Array;
  /** 8-bit sRGB colors (r, g, b). */
  colors: Uint8Array;
}

export interface Box3Like {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

/** Is the color (8-bit sRGB) cyan? High green and blue, low red: the hologram's cyan neon. */
export const isCyan = (r: number, g: number, b: number) => b > 90 && g > 90 && r * 2.2 < Math.min(g, b);

/**
 * Recolors with `rgb` the cyan points on the diagram plane inside the largest golden rectangle. Returns
 * how many it changed (to check that the recipe has not moved: with no matches, the diagram is gone).
 */
export function recolorDiagram(points: StaticPoints, bbox: Box3Like, rgb: readonly [number, number, number]): number {
  const outer = goldenRectangles(1)[0].rect;
  const xs = outer.map((p) => p[0]);
  const zs = outer.map((p) => p[1]);
  const minX = Math.min(...xs) - 0.2;
  const maxX = Math.max(...xs) + 0.2;
  const minZ = Math.min(...zs) - 0.2;
  const maxZ = Math.max(...zs) + 0.2;
  const [x0, y0, z0] = bbox.min;
  const sx = (bbox.max[0] - x0) / 65535;
  const sy = (bbox.max[1] - y0) / 65535;
  const sz = (bbox.max[2] - z0) / 65535;
  const { positions, colors } = points;
  let changed = 0;
  for (let i = 0, n = positions.length / 3; i < n; i++) {
    const y = y0 + positions[i * 3 + 1] * sy;
    if (Math.abs(y - DIAGRAM_Y) > Y_TOLERANCE) continue;
    const x = x0 + positions[i * 3] * sx;
    const z = z0 + positions[i * 3 + 2] * sz;
    if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
    if (!isCyan(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2])) continue;
    colors[i * 3] = rgb[0];
    colors[i * 3 + 1] = rgb[1];
    colors[i * 3 + 2] = rgb[2];
    changed++;
  }
  return changed;
}
