// Épure of a sheet (D3): elevation on top, the ground line with its two conventional ticks, plan
// below. Common invariant: the plan says where (uniform scale) and the height in the elevation says
// when; the horizontal axis is the same in both views. The full trail is dotted (on 004, fine dots),
// the loop segment is a solid stroke (ink dots) and the NOW joins plan and elevation with the
// reference line. It is generated at build time: the static HTML carries the whole épure.

import { esc } from './esc';
import type { Trail } from './manifest';
import type { Moment } from './trail';

/**
 * Drawing measurements in viewBox units (1 = 1 CSS px at the design width, 16M = 480). The épure is
 * 480×600 with the labels inside: the ground line splits the height into two halves of 300, the
 * elevation on top and the plan below, so on desktop the title block fits underneath on the first screen.
 */
export const EPURE = {
  width: 480,
  pad: 24,
  elevTop: 36,
  elevBottom: 282,
  ground: 300,
  planTop: 318,
  planBottom: 564,
  height: 600,
  tick: 12,
} as const;

/** Where the NOW sits at one position of the loop: elevation (ex, ey) and plan (px, py). */
export type NowPoint = [ex: number, ey: number, px: number, py: number];

export interface EpureOptions {
  id: string;
  title: string;
  desc: string;
  /** Trail label: "path of the subject's centre" or "seeds in order of birth". */
  trailLabel: string;
  /** Clock position at which the static HTML draws the NOW (the poster's frame). */
  frame?: number;
}

export interface Epure {
  svg: string;
  nows: NowPoint[];
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Orientation of the vertical plane (Monge chooses it parallel to the object's main face): if the
 * subject's path runs mostly in one direction on the floor, the vertical plane is set parallel to it,
 * so the elevation shows the progress over time. Returns the angle (rad) that takes that direction to
 * the horizontal axis, or 0 if the path has no dominant direction.
 */
export function frontalAngle(moments: readonly Moment[]): number {
  const n = moments.length;
  const mx = moments.reduce((s, m) => s + m.x, 0) / n;
  const md = moments.reduce((s, m) => s + m.depth, 0) / n;
  let sxx = 0;
  let sdd = 0;
  let sxd = 0;
  for (const m of moments) {
    sxx += (m.x - mx) ** 2;
    sdd += (m.depth - md) ** 2;
    sxd += (m.x - mx) * (m.depth - md);
  }
  const trace = sxx + sdd;
  const root = Math.sqrt(((sxx - sdd) / 2) ** 2 + sxd * sxd);
  const l1 = trace / 2 + root;
  const l2 = trace / 2 - root;
  if (l1 < 4 * Math.max(l2, 1e-12)) return 0;
  let angle = 0.5 * Math.atan2(2 * sxd, sxx - sdd);
  // Direction: the path advances from left to right.
  const first = moments[0];
  const last = moments[n - 1];
  if ((last.x - first.x) * Math.cos(angle) + (last.depth - first.depth) * Math.sin(angle) < 0) angle += Math.PI;
  return angle;
}

export function projectTrail(trail: Trail): { plan: [number, number][]; elev: [number, number][] } {
  const { width, pad, elevTop, elevBottom, planTop, planBottom } = EPURE;
  const angle = trail.kind === 'path' ? frontalAngle(trail.moments) : 0;
  const c = Math.cos(angle);
  const s0 = Math.sin(angle);
  // Floor coordinates in the frame of the chosen vertical plane (a rigid rotation: the shape does not change).
  const xs = trail.moments.map((m) => m.x * c + m.depth * s0);
  const ds = trail.moments.map((m) => -m.x * s0 + m.depth * c);
  const ts = trail.moments.map((m) => m.t);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [d0, d1] = [Math.min(...ds), Math.max(...ds)];
  const [t0, t1] = [Math.min(...ts), Math.max(...ts)];
  const planH = planBottom - planTop;
  // Uniform scale in the plan: the shape does not depend on the framing.
  const s = Math.min((width - 2 * pad) / Math.max(x1 - x0, 1e-9), planH / Math.max(d1 - d0, 1e-9));
  const cx = width / 2;
  const cy = (planTop + planBottom) / 2;
  const xm = (x0 + x1) / 2;
  const dm = (d0 + d1) / 2;
  const X = (x: number) => r1(cx + (x - xm) * s);
  const plan = trail.moments.map((_, i): [number, number] => [X(xs[i]), r1(cy + (ds[i] - dm) * s)]);
  const elev = trail.moments.map((m, i): [number, number] => [X(xs[i]), r1(elevBottom - ((m.t - t0) / Math.max(t1 - t0, 1e-9)) * (elevBottom - elevTop))]);
  return { plan, elev };
}

function polyline(points: [number, number][], cls: string): string {
  return `<polyline class="${cls}" points="${points.map(([x, y]) => `${x},${y}`).join(' ')}"/>`;
}

function dots(points: [number, number][], cls: string, r: number): string {
  return `<g class="${cls}">${points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
}

export function epureSvg(trail: Trail, o: EpureOptions): Epure {
  const { width, pad, ground, height, tick, elevTop, planBottom } = EPURE;
  const { plan, elev } = projectTrail(trail);
  const nows: NowPoint[] = (trail.nows.length ? trail.nows : [0]).map((i) => [elev[i][0], elev[i][1], plan[i][0], plan[i][1]]);
  const now = nows[Math.min(o.frame ?? 0, nows.length - 1)];
  const span = trail.span;
  const seeds = trail.kind === 'seeds';

  const parts: string[] = [];
  parts.push(`<title id="${o.id}-title">${esc(o.title)}</title>`, `<desc id="${o.id}-desc">${esc(o.desc)}</desc>`);
  // Labels of the views.
  parts.push(`<text class="ep-label" x="${pad}" y="${elevTop - 14}">elevation</text>`);
  parts.push(`<text class="ep-label" x="${pad}" y="${planBottom + 26}">plan</text>`);
  parts.push(`<text class="ep-label ep-label--trail" x="${width - pad}" y="${planBottom + 26}" text-anchor="end">${esc(o.trailLabel)}</text>`);
  // Hinge: dragging on the ground line folds the sheet (D7).
  parts.push(`<rect class="ep-hinge" x="0" y="${ground - 12}" width="${width}" height="24"/>`);
  // Ground line and its two short conventional ticks under the ends.
  parts.push(`<line class="ep-ground" x1="0" y1="${ground}" x2="${width}" y2="${ground}"/>`);
  parts.push(`<path class="ep-ground-ticks" d="M${pad} ${ground + 3}h${tick}M${pad} ${ground + 7}h${tick}M${width - pad - tick} ${ground + 3}h${tick}M${width - pad - tick} ${ground + 7}h${tick}"/>`);
  if (seeds) {
    parts.push(dots(elev, 'ep-full ep-full--dots', 0.9), dots(plan, 'ep-full ep-full--dots', 0.9));
    if (span) {
      parts.push(dots(elev.slice(span[0], span[1] + 1), 'ep-span ep-span--dots', 1.7));
      parts.push(dots(plan.slice(span[0], span[1] + 1), 'ep-span ep-span--dots', 1.7));
    }
  } else {
    parts.push(polyline(elev, 'ep-full'), polyline(plan, 'ep-full'));
    if (span) parts.push(polyline(elev.slice(span[0], span[1] + 1), 'ep-span'), polyline(plan.slice(span[0], span[1] + 1), 'ep-span'));
  }
  // NOW: the reference line, perpendicular to the ground line, joins the point in the elevation and the one in the plan.
  parts.push(`<line class="ep-ref" x1="${now[0]}" y1="${now[1]}" x2="${now[2]}" y2="${now[3]}"/>`);
  parts.push(`<circle class="ep-now" data-view="elevation" cx="${now[0]}" cy="${now[1]}" r="5"/>`);
  parts.push(`<circle class="ep-now" data-view="plan" cx="${now[2]}" cy="${now[3]}" r="5"/>`);

  const svg =
    `<svg class="epure" id="${o.id}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${o.id}-title" aria-describedby="${o.id}-desc">` +
    parts.join('') +
    `</svg>`;
  return { svg, nows };
}
