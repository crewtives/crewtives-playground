// Geometry of the dihedron (D7): what the épure draws in plan and elevation, placed in space. Units
// of the épure's viewBox: shared x, h = height above the ground line (the elevation), d = distance in
// front of the vertical plane (the plan). Both the build's axonometry and the 3D fold use it, so the
// two show the same thing. Pure module.

import { EPURE } from './epure';

export interface P3 {
  x: number;
  h: number;
  d: number;
}

export interface Geom3 {
  /** Polylines in space (or point clouds if `dots`). */
  space: P3[][];
  dots: boolean;
  /** Their projections onto the horizontal plane (h = 0) and the vertical one (d = 0). */
  plan: P3[][];
  elev: P3[][];
  /** Loop segment, in space. */
  span: P3[][];
  /** Moments the NOW can mark (empty if the sheet has no clock). */
  track: P3[];
  /** Points that projection lines start from. */
  rays: P3[];
}

/** From a point of the elevation (x, yE) and one of the plan (x, yP) to space. */
export const toSpace = (x: number, yElev: number, yPlan: number): P3 => ({ x, h: EPURE.ground - yElev, d: yPlan - EPURE.ground });

const every = <T>(list: T[], n: number) => list.filter((_, i) => i % Math.max(1, Math.floor(list.length / n)) === 0);

/** Trail of a work sheet: elevation and plan of the épure, moment by moment. */
export function trailGeom(elev: [number, number][], plan: [number, number][], span: [number, number] | null, dots: boolean): Geom3 {
  const pts = plan.map(([x, yP], i) => toSpace(x, elev[i][1], yP));
  return {
    space: [pts],
    dots,
    plan: [pts.map((p) => ({ ...p, h: 0 }))],
    elev: [pts.map((p) => ({ ...p, d: 0 }))],
    span: span ? [pts.slice(span[0], span[1] + 1)] : [],
    track: pts,
    rays: every(pts, 16),
  };
}

/** Edges (pairs of points in space): the tesseract of sheet 000. */
export function edgesGeom(edges: [P3, P3][]): Geom3 {
  const vertices = new Map<string, P3>();
  for (const [a, b] of edges) for (const p of [a, b]) vertices.set(`${p.x},${p.h},${p.d}`, p);
  return {
    space: edges.map(([a, b]) => [a, b]),
    dots: false,
    plan: edges.map(([a, b]) => [{ ...a, h: 0 }, { ...b, h: 0 }]),
    elev: edges.map(([a, b]) => [{ ...a, d: 0 }, { ...b, d: 0 }]),
    span: [],
    track: [],
    rays: [...vertices.values()],
  };
}

/** Sections at their height and the outline of the elevation: the column of sheet 000. */
export function sectionsGeom(rings: P3[][], outline: [number, number][][]): Geom3 {
  return {
    space: rings.map((ring) => [...ring, ring[0]]),
    dots: false,
    plan: rings.map((ring) => [...ring, ring[0]].map((p) => ({ ...p, h: 0 }))),
    elev: outline.map((line) => line.map(([x, y]) => ({ x, h: EPURE.ground - y, d: 0 }))),
    span: [],
    track: [],
    rays: rings.flatMap((ring) => every(ring, 6)),
  };
}
