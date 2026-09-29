// Mirror folding of the kaleidoscope: takes any point of the view into the fundamental domain
// (a wedge of two mirrors or a triangle of three). It is the TS version of fold.glsl, for the tests
// and for the 2D drawing. View coordinates: a disc of radius 1, with y pointing up.

export type MirrorMode = 'd3' | 'd5' | 'p333' | 'p632';

export interface MirrorInfo {
  id: MirrorMode;
  /** Name of the symmetry: the readout starts with it. */
  symbol: string;
  /** Name of the gem. */
  name: string;
  /** Adjective for the eyepiece's live description. */
  describe: string;
}

export const MIRRORS: Record<MirrorMode, MirrorInfo> = {
  d3: { id: 'd3', symbol: 'D3', name: 'Lily · threes', describe: 'Three-fold kaleidoscope' },
  d5: { id: 'd5', symbol: 'D5', name: 'Rose · fives', describe: 'Five-fold kaleidoscope' },
  p333: { id: 'p333', symbol: '*333', name: 'Comb', describe: 'Honeycomb kaleidoscope, three mirrors at 60°,' },
  p632: { id: 'p632', symbol: '*632', name: 'Comb and star', describe: 'Comb-and-star kaleidoscope, three mirrors at 30°, 60° and 90°,' },
};

export const MIRROR_ORDER: MirrorMode[] = ['d3', 'd5', 'p333', 'p632'];

export type Vec2 = [number, number];

/** Fundamental triangles in the lower part of the cell, where gravity gathers the contents (counterclockwise). */
export const TRIANGLES: Record<'p333' | 'p632', [Vec2, Vec2, Vec2]> = {
  // Equilateral, side 0.84, resting near the bottom edge: *333 (60°-60°-60°).
  p333: [
    [-0.42, -0.9],
    [0.42, -0.9],
    [0, -0.9 + 0.42 * Math.sqrt(3)],
  ],
  // 30°-60°-90°: right angle at bottom left, 30° at bottom right, 60° at the top: *632.
  p632: [
    [-0.4, -0.85],
    [0.5, -0.85],
    [-0.4, -0.85 + 0.9 * Math.tan(Math.PI / 6)],
  ],
};

export const MAX_REFLECTIONS = 24;

/** Order of the dihedral group for each two-mirror mode. */
export function dihedralOrder(mode: MirrorMode): number {
  return mode === 'd3' ? 3 : mode === 'd5' ? 5 : 0;
}

/** Wedge of two mirrors at π/n, centered on the screen's "down" direction. */
export function foldDihedral(x: number, y: number, n: number): Vec2 {
  const r = Math.hypot(x, y);
  if (r === 0) return [0, 0];
  const w = Math.PI / n;
  // Angle measured from "down" (0, −1), positive toward +x.
  const phi = Math.atan2(x, -y);
  let u = mod(phi + w / 2, 2 * w);
  if (u > w) u = 2 * w - u;
  const p = u - w / 2;
  return [r * Math.sin(p), -r * Math.cos(p)];
}

/** Triangle edges as half-planes: inward normal and a point on the edge. */
export function triangleEdges(tri: [Vec2, Vec2, Vec2]): { n: Vec2; p: Vec2 }[] {
  return tri.map((a, i) => {
    const b = tri[(i + 1) % 3];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    return { n: [-dy / len, dx / len] as Vec2, p: a };
  });
}

/** Reflects the point across the edges it violates until it lies inside the triangle. */
export function foldTriangle(x: number, y: number, tri: [Vec2, Vec2, Vec2], edges = triangleEdges(tri)): Vec2 {
  let px = x;
  let py = y;
  for (let i = 0; i < MAX_REFLECTIONS; i++) {
    let moved = false;
    for (const { n, p } of edges) {
      const d = n[0] * (px - p[0]) + n[1] * (py - p[1]);
      if (d < 0) {
        px -= 2 * d * n[0];
        py -= 2 * d * n[1];
        moved = true;
      }
    }
    if (!moved) break;
  }
  return [px, py];
}

/** Folding according to the mode. */
export function fold(x: number, y: number, mode: MirrorMode): Vec2 {
  if (mode === 'p333' || mode === 'p632') return foldTriangle(x, y, TRIANGLES[mode]);
  return foldDihedral(x, y, dihedralOrder(mode));
}

/** Is the point inside the mode's fundamental domain (with tolerance)? */
export function inFundamental(x: number, y: number, mode: MirrorMode, eps = 1e-6): boolean {
  if (mode === 'p333' || mode === 'p632') {
    return triangleEdges(TRIANGLES[mode]).every(({ n, p }) => n[0] * (x - p[0]) + n[1] * (y - p[1]) >= -eps);
  }
  const w = Math.PI / dihedralOrder(mode);
  if (Math.hypot(x, y) < eps) return true;
  const phi = Math.atan2(x, -y);
  return Math.abs(phi) <= w / 2 + eps;
}

/**
 * From the view to the cell: the barrel turns the contents β degrees clockwise, so a cell point c
 * is seen at R(−β)·c and the view point s shows the cell at R(β)·s.
 */
export function viewToCell(x: number, y: number, betaDeg: number): Vec2 {
  const b = (betaDeg * Math.PI) / 180;
  const c = Math.cos(b);
  const s = Math.sin(b);
  return [x * c - y * s, x * s + y * c];
}

/** Segments of the mirror lines in the view (to draw them fixed over the raw cell). */
export function mirrorLines(mode: MirrorMode): [Vec2, Vec2][] {
  if (mode === 'p333' || mode === 'p632') {
    const t = TRIANGLES[mode];
    return [
      [t[0], t[1]],
      [t[1], t[2]],
      [t[2], t[0]],
    ];
  }
  const w = Math.PI / dihedralOrder(mode);
  return [-w / 2, w / 2].map((p) => [[0, 0] as Vec2, [Math.sin(p), -Math.cos(p)] as Vec2]);
}

function mod(a: number, m: number): number {
  return a - m * Math.floor(a / m);
}
