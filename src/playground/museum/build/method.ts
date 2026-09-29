// Sheet 000, the house method (D11), as épures and with pure geometry:
// - Gaudí's double-twist column: a star polygon that rises turning right and a copy turning left; the
//   section is their intersection. At the end of each segment the two copies sit half a point apart
//   and the intersection has twice as many points: that polygon is the base of the next segment;
// - the tesseract: from 4D to 3D with `project4`, and from 3D to plan (x, z) and elevation (x, y).

import { project4, tesseractEdges, tesseractVertices, type Rotation4 } from '../../../engine/views/tesseract';
import { EPURE } from './epure';

const TAU = Math.PI * 2;
const SAMPLES = 1440;

/** Radius, in direction φ, of a star polygon with `tips` points (radius R) and valleys (radius ρ). */
export function starRadius(tips: number, R: number, rho: number, phi: number): number {
  const step = Math.PI / tips; // from point to valley
  const a = ((phi % (2 * step)) + 2 * step) % (2 * step);
  // Line segment between the point (angle 0, radius R) and the valley (angle step, radius ρ), or its mirror.
  const u = a <= step ? a : 2 * step - a;
  const p = [R, 0];
  const q = [rho * Math.cos(step), rho * Math.sin(step)];
  // Intersection of the ray (cos u, sin u) with the line p→q.
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const c = Math.cos(u);
  const s = Math.sin(u);
  return (p[0] * dy - p[1] * dx) / (c * dy - s * dx);
}

export interface Star {
  tips: number;
  R: number;
  rho: number;
}

/** Section of the column: sampled radii of the intersection of two copies turned ±twist. */
export function section(base: Star, twist: number): number[] {
  return Array.from({ length: SAMPLES }, (_, i) => {
    const phi = (i / SAMPLES) * TAU;
    return Math.min(starRadius(base.tips, base.R, base.rho, phi - twist), starRadius(base.tips, base.R, base.rho, phi + twist));
  });
}

/** Points of a section: strict local maxima of the radius, around the closed loop. */
export function countTips(radii: number[]): number {
  const n = radii.length;
  let tips = 0;
  for (let i = 0; i < n; i++) {
    const prev = radii[(i - 1 + n) % n];
    const next = radii[(i + 1) % n];
    if (radii[i] > prev + 1e-9 && radii[i] >= next) tips++;
  }
  return tips;
}

export interface Segment {
  base: Star;
  /** Twist of each copy at the end of the segment: half a point between the two. */
  twist: number;
  top: Star;
}

/** Segments of the column: each one doubles the points of its base. */
export function doubleTwistColumn(base: Star, segments: number): Segment[] {
  const out: Segment[] = [];
  let current = base;
  for (let k = 0; k < segments; k++) {
    const twist = Math.PI / (2 * current.tips);
    const radii = section(current, twist);
    const top: Star = { tips: countTips(radii), R: Math.max(...radii), rho: Math.min(...radii) };
    out.push({ base: current, twist, top });
    current = top;
  }
  return out;
}

export const COLUMN_BASE: Star = { tips: 6, R: 1, rho: 0.62 };
export const COLUMN_SEGMENTS = 3;
export const TESSERACT_ROTATION: Rotation4 = { xw: 0.62, yw: 0.34, zw: 0.18 };

const f = (v: number) => (Math.round(v * 10) / 10).toString();

/** Tesseract projection: 16 vertices and 32 edges in plan and in elevation. */
export function tesseractViews(): { vertices: [number, number, number][]; edges: [number, number][] } {
  return { vertices: tesseractVertices().map((v) => project4(v, TESSERACT_ROTATION)), edges: tesseractEdges() };
}

function frame(parts: string[], id: string, title: string, desc: string): string {
  const { width, height, ground, pad, tick, elevTop, planBottom } = EPURE;
  return (
    `<svg class="epure epure--method" id="${id}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title" aria-describedby="${id}-desc">` +
    `<title id="${id}-title">${title}</title><desc id="${id}-desc">${desc}</desc>` +
    `<text class="ep-label" x="${pad}" y="${elevTop - 14}">elevation</text>` +
    `<text class="ep-label" x="${pad}" y="${planBottom + 26}">plan</text>` +
    `<line class="ep-ground" x1="0" y1="${ground}" x2="${width}" y2="${ground}"/>` +
    `<path class="ep-ground-ticks" d="M${pad} ${ground + 3}h${tick}M${pad} ${ground + 7}h${tick}M${width - pad - tick} ${ground + 3}h${tick}M${width - pad - tick} ${ground + 7}h${tick}"/>` +
    parts.join('') +
    `<rect class="ep-hinge" x="0" y="${ground - 12}" width="${width}" height="24"/>` +
    `</svg>`
  );
}

/** Tesseract geometry in épure units: vertices projected to 3D, edges and scale. */
export function tesseractGeometry() {
  const { width, elevTop, elevBottom, planTop, planBottom } = EPURE;
  const { vertices, edges } = tesseractViews();
  const extent = Math.max(...vertices.flat().map(Math.abs));
  const s = ((elevBottom - elevTop) / 2 - 8) / extent;
  return { vertices, edges, s, cx: width / 2, ey: (elevTop + elevBottom) / 2, py: (planTop + planBottom) / 2 };
}

/** Épure of the tesseract: the 32 edges in elevation (x, y) and in plan (x, z). */
export function tesseractSvg(): string {
  const { vertices, edges, s, cx, ey, py } = tesseractGeometry();
  const elev = edges.map(([a, b]) => `M${f(cx + vertices[a][0] * s)} ${f(ey - vertices[a][1] * s)}L${f(cx + vertices[b][0] * s)} ${f(ey - vertices[b][1] * s)}`).join('');
  const plan = edges.map(([a, b]) => `M${f(cx + vertices[a][0] * s)} ${f(py + vertices[a][2] * s)}L${f(cx + vertices[b][0] * s)} ${f(py + vertices[b][2] * s)}`).join('');
  const dotsE = vertices.map((v) => `<circle cx="${f(cx + v[0] * s)}" cy="${f(ey - v[1] * s)}" r="2"/>`).join('');
  const dotsP = vertices.map((v) => `<circle cx="${f(cx + v[0] * s)}" cy="${f(py + v[2] * s)}" r="2"/>`).join('');
  return frame(
    [
      `<path class="ep-edges" data-view="elevation" d="${elev}"/>`,
      `<path class="ep-edges" data-view="plan" d="${plan}"/>`,
      `<g class="ep-vertices" data-view="elevation">${dotsE}</g>`,
      `<g class="ep-vertices" data-view="plan">${dotsP}</g>`,
    ],
    'method-tesseract',
    'Tesseract, as an épure',
    'A four-dimensional cube turned in four dimensions and projected to three, then drawn in elevation and in plan: sixteen vertices and thirty-two edges in each view.',
  );
}

function starPath(radii: number[], cx: number, cy: number, s: number): string {
  return (
    radii
      .map((r, i) => {
        const phi = (i / radii.length) * TAU;
        return `${i ? 'L' : 'M'}${f(cx + r * Math.cos(phi) * s)} ${f(cy + r * Math.sin(phi) * s)}`;
      })
      .join('') + 'Z'
  );
}

/** Épure of the column: the outline in elevation with the joints between segments, and the sections in plan. */
/** Column geometry in épure units: sections (plan) with their height, and the outline. */
export function columnGeometry() {
  const { width, elevTop, elevBottom, planTop, planBottom } = EPURE;
  const segments = doubleTwistColumn(COLUMN_BASE, COLUMN_SEGMENTS);
  const cx = width / 2;
  const py = (planTop + planBottom) / 2;
  // A single horizontal scale for plan and elevation: on the épure, the x axis is shared.
  const s = ((planBottom - planTop) / 2 - 10) / COLUMN_BASE.R;
  // Elevation: each segment is half as tall as the previous one (booklet 9: half the height and half the turn).
  const height = elevBottom - elevTop;
  const unit = height / (2 - 2 ** (1 - segments.length));
  const segmentTop = (k: number) => unit * (2 - 2 ** (1 - k)); // cumulative height where segment k starts
  const sections = [
    { radii: section(segments[0].base, 0), y: elevBottom },
    ...segments.map((t, k) => ({ radii: section(t.base, t.twist), y: elevBottom - segmentTop(k + 1) })),
  ];
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  segments.forEach((t, k) => {
    for (let j = 0; j <= 24; j++) {
      const u = j / 24;
      const radii = section(t.base, t.twist * u);
      let half = 0;
      radii.forEach((r, i) => {
        half = Math.max(half, r * Math.abs(Math.cos((i / radii.length) * TAU)));
      });
      const y = elevBottom - (segmentTop(k) + u * unit * 2 ** -k);
      left.push([cx - half * s, y]);
      right.push([cx + half * s, y]);
    }
  });
  return { cx, py, s, sections, left, right };
}

/** Plan of the column: the sections, one inside the next. */
function planSections({ cx, py, s, sections }: ReturnType<typeof columnGeometry>): string {
  return sections
    .map(({ radii, y }, i) => `<path class="ep-section" data-tips="${countTips(radii)}" data-y="${f(y)}" style="--i:${i}" d="${starPath(radii, cx, py, s)}"/>`)
    .join('');
}

/** The plan alone, cropped to the sections: the thumbnail of the index's 000 row. */
export function columnPlanSvg(cls: string): string {
  const geometry = columnGeometry();
  const r = Math.max(...geometry.sections.flatMap(({ radii }) => radii)) * geometry.s + 4;
  const box = [geometry.cx - r, geometry.py - r, 2 * r, 2 * r].map(f).join(' ');
  return `<svg class="${cls}" viewBox="${box}" width="100%" height="100%" aria-hidden="true" focusable="false">${planSections(geometry)}</svg>`;
}

export function columnSvg(): string {
  const geometry = columnGeometry();
  const { left, right, sections } = geometry;
  const plan = planSections(geometry);
  const joints = sections
    .slice(1, -1)
    .map(({ y }) => {
      const at = left.find(([, ly]) => Math.abs(ly - y) < 1e-6) ?? left[0];
      const other = right[left.indexOf(at)];
      return `<line class="ep-joint" x1="${f(at[0])}" y1="${f(y)}" x2="${f(other[0])}" y2="${f(y)}"/>`;
    })
    .join('');
  const pts = (list: [number, number][]) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  return frame(
    [
      `<polyline class="ep-outline" data-view="elevation" points="${pts(left)}"/>`,
      `<polyline class="ep-outline" data-view="elevation" points="${pts(right)}"/>`,
      joints,
      `<g class="ep-sections" data-view="plan">${plan}</g>`,
    ],
    'method-column',
    'Double-twist column, as an épure',
    'A star polygon rises turning right while a copy turns left; the column is their intersection. At the top of each section the copies sit half a point apart and the intersection doubles its points. Elevation shows the outline and the section joints; plan shows the sections, one inside the next.',
  );
}
