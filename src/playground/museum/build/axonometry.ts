// Axonometry of the dihedron (D7, tasks 9.2 and 13.3): what the fold shows at 90° when the browser
// has no WebGL2. The same geometry as the épure (Geom3): the figure in space, its projections on the
// two planes and a few projection lines. It is generated at build time and published as one SVG per
// épure, which the fold requests only when needed.

import { EPURE, projectTrail } from './epure';
import { esc } from './esc';
import { edgesGeom, sectionsGeom, toSpace, trailGeom, type Geom3, type P3 } from './geom3';
import type { Trail } from './manifest';
import { columnGeometry, tesseractGeometry } from './method';

/** Axonometric projection: x to the right, depth down and to the left, height up. */
const AXO = { dx: -0.42, dy: 0.26, pad: 20 } as const;

const r1 = (v: number) => Math.round(v * 10) / 10;

export function trailGeom3(trail: Trail): Geom3 {
  const { plan, elev } = projectTrail(trail);
  return trailGeom(elev, plan, trail.span, trail.kind === 'seeds');
}

export function tesseractGeom3(): Geom3 {
  const { vertices, edges, cx, ey, py, s } = tesseractGeometry();
  const at = (v: [number, number, number]) => toSpace(cx + v[0] * s, ey - v[1] * s, py + v[2] * s);
  return edgesGeom(edges.map(([a, b]) => [at(vertices[a]), at(vertices[b])]));
}

export function columnGeom3(): Geom3 {
  const { cx, py, s, sections, left, right } = columnGeometry();
  const rings = sections.map(({ radii, y }) =>
    radii
      .filter((_, i) => i % 4 === 0)
      .map((r, j, list) => {
        const phi = (j / list.length) * Math.PI * 2;
        return toSpace(cx + r * Math.cos(phi) * s, y, py + r * Math.sin(phi) * s);
      }),
  );
  return sectionsGeom(rings, [left, right]);
}

/**
 * NOW of the axonometry at one clock position, in units of its viewBox: the point in space (the
 * center of `circle.ep-now`), its foot on the horizontal plane and its foot on the vertical one. The
 * `path.axo-ref` line for that frame is `M x,y L px,py M x,y L ex,ey`.
 */
export type AxoNowPoint = [x: number, y: number, px: number, py: number, ex: number, ey: number];

/**
 * `nows`: the NOW at each clock position (empty on sheet 000). The SVG draws it at the first one (the
 * poster's frame) and publishes all of them in `data-nows` (JSON of `AxoNowPoint[]`, with the same
 * index as `RuntimeSheet.nows`), so the fold without WebGL2 moves the NOW with the clock.
 */
export function axonometrySvg(geom: Geom3, id: string, title: string, nows: P3[] = []): string {
  const { ground, width, planBottom, elevTop } = EPURE;
  const depth = planBottom - ground;
  const height = ground - elevTop;
  const project = (x: number, h: number, d: number): [number, number] => [x + d * AXO.dx, -h + d * AXO.dy];
  const corners = [project(0, 0, 0), project(width, 0, 0), project(0, height, 0), project(width, height, 0), project(0, 0, depth), project(width, 0, depth)];
  const minX = Math.min(...corners.map((c) => c[0])) - AXO.pad;
  const minY = Math.min(...corners.map((c) => c[1])) - AXO.pad;
  const maxX = Math.max(...corners.map((c) => c[0])) + AXO.pad;
  const maxY = Math.max(...corners.map((c) => c[1])) + AXO.pad;
  const xy = (p: P3): [number, number] => {
    const [px, py] = project(p.x, p.h, p.d);
    return [r1(px - minX), r1(py - minY)];
  };
  const pts = (list: P3[]) => list.map((p) => xy(p).join(',')).join(' ');
  const lines = (list: P3[][], cls: string) =>
    geom.dots
      ? `<g class="${cls} ${cls}--dots">${list
          .flat()
          .map((p) => `<circle cx="${xy(p)[0]}" cy="${xy(p)[1]}" r="${cls === 'axo-trail' ? 1.1 : 0.7}"/>`)
          .join('')}</g>`
      : list.map((l) => `<polyline class="${cls}" points="${pts(l)}"/>`).join('');

  const parts: string[] = [];
  parts.push(`<title id="${id}-title">${esc(title)}</title>`);
  parts.push(
    `<desc id="${id}-desc">${esc('The sheet folded along its ground line into a right dihedral: the figure stands in space above the horizontal plane, with its projections on both planes.')}</desc>`,
  );
  const quad = (list: P3[], cls: string) => `<polygon class="${cls}" points="${pts(list)}"/>`;
  parts.push(quad([{ x: 0, h: 0, d: 0 }, { x: width, h: 0, d: 0 }, { x: width, h: height, d: 0 }, { x: 0, h: height, d: 0 }], 'axo-plane axo-plane--v'));
  parts.push(quad([{ x: 0, h: 0, d: 0 }, { x: width, h: 0, d: 0 }, { x: width, h: 0, d: depth }, { x: 0, h: 0, d: depth }], 'axo-plane axo-plane--h'));
  parts.push(`<polyline class="axo-ground" points="${pts([{ x: 0, h: 0, d: 0 }, { x: width, h: 0, d: 0 }])}"/>`);
  const rays = geom.rays.map((p) => `M${xy(p).join(',')}L${xy({ ...p, h: 0 }).join(',')}M${xy(p).join(',')}L${xy({ ...p, d: 0 }).join(',')}`).join('');
  parts.push(`<path class="axo-rays" d="${rays}"/>`);
  parts.push(lines(geom.elev, 'axo-proj'), lines(geom.plan, 'axo-proj'), lines(geom.space, 'axo-trail'));
  const points = nows.map((p): AxoNowPoint => [...xy(p), ...xy({ ...p, h: 0 }), ...xy({ ...p, d: 0 })]);
  const now = points[0];
  if (now) {
    const [x, y, px, py, ex, ey] = now;
    parts.push(`<path class="axo-ref" d="M${x},${y}L${px},${py}M${x},${y}L${ex},${ey}"/>`);
    parts.push(`<circle class="ep-now" cx="${x}" cy="${y}" r="5"/>`);
  }
  // Numbers only: the JSON has no quotes and goes into the attribute as is.
  const data = points.length ? ` data-nows="${JSON.stringify(points)}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="axonometry" id="${id}" viewBox="0 0 ${r1(maxX - minX)} ${r1(maxY - minY)}" role="img" aria-labelledby="${id}-title" aria-describedby="${id}-desc"${data}>` +
    parts.join('') +
    `</svg>`
  );
}
