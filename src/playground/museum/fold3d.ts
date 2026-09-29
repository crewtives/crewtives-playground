// 3D view of the fold (D7): the house's only 3D moment. The vertical plane turns about the ground line
// from 0° (the flat épure, as on the sheet) to 90° (the dihedron), and the figure rises into space
// with its projection lines onto both planes: the trail of a work (where on the horizontal plane, when
// as height) or, on sheet 000, the tesseract and the column. It is painted with the same Engine and
// RetroDisplay as the works, in 16 colors with the house palette, and the NOW follows the page clock.
// It is only downloaded with the first fold, and only if there is WebGL2.

import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import { DISPLAY_MODES, RetroDisplay } from '../../engine/display/RetroDisplay';
import { Engine, type EngineView, type ViewRect } from '../../engine/engine/Engine';
import { EPURE } from './build/epure';
import { edgesGeom, sectionsGeom, toSpace, trailGeom, type Geom3, type P3 } from './build/geom3';

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** CSS color `#rrggbb` to 8-bit sRGB (the display's background is in sRGB, not in three's linear space). */
const rgb8 = (value: string): [number, number, number] => {
  const n = parseInt(value.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

type XY = [number, number];
const polylinePoints = (el: Element | null): XY[] =>
  (el?.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.split(',').map(Number) as XY);
const circles = (el: Element | null): XY[] => Array.from(el?.querySelectorAll('circle') ?? []).map((c) => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]);
/** Points of a path made of M and L commands with absolute coordinates. */
const pathPoints = (d: string): { move: boolean; p: XY }[] =>
  [...d.matchAll(/([ML])\s*(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => ({ move: m[1] === 'M', p: [Number(m[2]), Number(m[3])] }));

/** What the épure draws, placed in space (the same Geom3 the build's axonometry uses). */
export function readGeometry(svg: SVGSVGElement): Geom3 | null {
  const full = svg.querySelectorAll('.ep-full');
  if (full.length) {
    const dots = full[0].tagName.toLowerCase() === 'g';
    const read = (el: Element | null) => (el && el.tagName.toLowerCase() === 'g' ? circles(el) : polylinePoints(el));
    const elev = read(full[0]);
    const plan = read(full[1]);
    const spanElev = read(svg.querySelector('.ep-span'));
    let span: [number, number] | null = null;
    if (spanElev.length) {
      // The segment starts where the first vertex of the solid stroke coincides with the trail.
      const start = elev.findIndex(([x, y]) => x === spanElev[0][0] && y === spanElev[0][1]);
      if (start >= 0) span = [start, start + spanElev.length - 1];
    }
    return trailGeom(elev, plan, span, dots);
  }
  const elevEdges = svg.querySelector('.ep-edges[data-view="elevation"]');
  const planEdges = svg.querySelector('.ep-edges[data-view="plan"]');
  if (elevEdges && planEdges) {
    const e = pathPoints(elevEdges.getAttribute('d') ?? '');
    const pl = pathPoints(planEdges.getAttribute('d') ?? '');
    const edges: [P3, P3][] = [];
    for (let i = 0; i + 1 < e.length; i += 2) {
      edges.push([toSpace(e[i].p[0], e[i].p[1], pl[i].p[1]), toSpace(e[i + 1].p[0], e[i + 1].p[1], pl[i + 1].p[1])]);
    }
    return edgesGeom(edges);
  }
  const sections = svg.querySelectorAll<SVGPathElement>('.ep-section');
  if (sections.length) {
    const rings = Array.from(sections).map((path) => {
      const y = Number(path.dataset.y);
      return pathPoints(path.getAttribute('d') ?? '')
        .filter((_, i) => i % 4 === 0)
        .map(({ p }) => toSpace(p[0], y, p[1]));
    });
    const outline = Array.from(svg.querySelectorAll('.ep-outline')).map((el) => polylinePoints(el));
    return sectionsGeom(rings, outline);
  }
  return null;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 4);

export class FoldView implements EngineView {
  readonly element: HTMLElement;
  readonly display = new RetroDisplay({ pixelScale: 3, mode: '16' });
  angle = 0;
  target = 0;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
  private readonly geometry: Geom3;
  private readonly vGroup = new Group();
  private readonly space: (Line | Points)[] = [];
  private readonly span: (Line | Points)[] = [];
  private readonly rays: LineSegments;
  private readonly now = new Group();
  private readonly refLines: LineSegments;
  private readonly nowMaterial: MeshBasicMaterial;
  private readonly background: [number, number, number];
  private readonly colors: { forward: string; rewind: string };
  nowIndex = 0;
  rewinding = false;
  private duration = 0.9;

  constructor(element: HTMLElement, geometry: Geom3) {
    this.element = element;
    this.geometry = geometry;
    const ink = token('--ink');
    const graphite = token('--graphite');
    this.background = rgb8(token('--sheet'));
    this.colors = { forward: token('--now-forward'), rewind: token('--now-rewind') };
    const { width, ground, planBottom, elevTop } = EPURE;
    const depth = planBottom - ground;
    const height = ground - elevTop;

    // Plane with the wash's light as a gradient: from the sheet at the ground line to the light at the
    // far edge. Flat areas are exact in the palette; the gradient is dithered.
    const quad = (w: number, h: number, near: string, far: string) => {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, w, 0, 0, w, h, 0, 0, 0, 0, w, h, 0, 0, h, 0], 3));
      // three's Color is already in linear space: the vertex colors go in as they are.
      const a = new Color(near);
      const b = new Color(far);
      const c = [a, a, b, a, b, b].flatMap((k) => [k.r, k.g, k.b]);
      g.setAttribute('color', new Float32BufferAttribute(c, 3));
      return new Mesh(g, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, depthWrite: false }));
    };
    // Horizontal plane: x ∈ [0, W], z ∈ [0, depth] (in front of the vertical plane).
    const hPlane = quad(width, depth, token('--sheet'), token('--west-1'));
    hPlane.rotation.x = Math.PI / 2;
    this.scene.add(hPlane);
    // Vertical plane, which turns about the ground line (the x axis).
    this.vGroup.add(quad(width, height, token('--sheet'), token('--east-1')));
    this.scene.add(this.vGroup);

    const lineMat = (color: string) => new LineBasicMaterial({ color, depthTest: false });
    const outline = (w: number, h: number) =>
      new Line(new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(w, 0, 0), new Vector3(w, h, 0), new Vector3(0, h, 0), new Vector3(0, 0, 0)]), lineMat(ink));
    this.vGroup.add(outline(width, height));
    const hOutline = outline(width, depth);
    hOutline.rotation.x = Math.PI / 2;
    this.scene.add(hOutline);

    const vec = (p: P3) => new Vector3(p.x, p.h, p.d);
    const make = (list: P3[], color: string, size: number): Line | Points => {
      const g = new BufferGeometry().setFromPoints(list.map(vec));
      const obj = geometry.dots ? new Points(g, new PointsMaterial({ color, size, sizeAttenuation: false, depthTest: false })) : new Line(g, lineMat(color));
      obj.renderOrder = 5;
      return obj;
    };
    const figureColor = geometry.span.length ? graphite : ink;
    // Projections: onto the horizontal plane (fixed) and onto the vertical one (turns with it).
    for (const line of geometry.plan) this.scene.add(make(line, graphite, 1));
    for (const line of geometry.elev) this.vGroup.add(make(line, graphite, 1));
    // The figure in space and the loop segment: they rise with the angle.
    for (const line of geometry.space) this.space.push(make(line, figureColor, 1));
    for (const line of geometry.span) this.span.push(make(line, ink, 2));
    for (const obj of [...this.space, ...this.span]) this.scene.add(obj);
    this.rays = new LineSegments(new BufferGeometry(), lineMat(graphite));
    this.refLines = new LineSegments(new BufferGeometry(), lineMat(ink));
    for (const obj of [this.rays, this.refLines] as Object3D[]) {
      obj.renderOrder = 5;
      this.scene.add(obj);
    }
    // NOW: an octahedron in the direction's color, with ink edges. Only if the sheet has a clock.
    this.nowMaterial = new MeshBasicMaterial({ color: this.colors.forward, depthTest: false });
    const oct = new OctahedronGeometry(13, 0);
    this.now.add(new Mesh(oct, this.nowMaterial));
    this.now.add(new LineSegments(new BufferGeometry().setFromPoints(edgePoints(oct)), lineMat(ink)));
    this.now.renderOrder = 10;
    this.now.visible = geometry.track.length > 0;
    this.refLines.visible = this.now.visible;
    this.scene.add(this.now);
    this.update();
  }

  /** Advances the fold animation; true while it moves. */
  tick(dt: number): boolean {
    if (this.angle === this.target) return false;
    const step = dt / this.duration;
    this.angle = this.target > this.angle ? Math.min(this.target, this.angle + step) : Math.max(this.target, this.angle - step);
    this.update();
    return true;
  }

  jump(): void {
    this.angle = this.target;
    this.update();
  }

  update(): void {
    const t = ease(this.angle);
    const theta = (t * Math.PI) / 2;
    // The vertical plane: lying back (z < 0) at 0° and standing at 90°.
    this.vGroup.rotation.x = -(Math.PI / 2 - theta);
    const lift = Math.sin(theta);
    const lifted = (list: P3[]) => list.flatMap((p) => [p.x, p.h * lift, p.d]);
    this.geometry.space.forEach((line, i) => setPositions(this.space[i], lifted(line)));
    this.geometry.span.forEach((line, i) => setPositions(this.span[i], lifted(line)));
    const onV = (p: P3) => new Vector3(p.x, p.h, 0).applyEuler(this.vGroup.rotation);
    const rays: Vector3[] = [];
    for (const p of this.geometry.rays) {
      const s = new Vector3(p.x, p.h * lift, p.d);
      rays.push(s, new Vector3(p.x, 0, p.d), s, onV(p));
    }
    this.rays.geometry.setFromPoints(rays);
    const track = this.geometry.track;
    if (track.length) {
      const p = track[Math.min(this.nowIndex, track.length - 1)];
      const s = new Vector3(p.x, p.h * lift, p.d);
      this.now.position.copy(s);
      this.refLines.geometry.setFromPoints([s, new Vector3(p.x, 0, p.d), s, onV(p)]);
      this.nowMaterial.color.set(this.rewinding ? this.colors.rewind : this.colors.forward);
    }
    this.placeCamera(t);
  }

  private placeCamera(t: number): void {
    const { width, ground, planBottom, elevTop } = EPURE;
    // From the top-down view of the sheet (the épure) to an oblique view of the dihedron.
    const pitch = (90 - 58 * t) * (Math.PI / 180);
    const yaw = -32 * t * (Math.PI / 180);
    const center = new Vector3(width / 2, ((ground - elevTop) / 2) * t, ((planBottom - ground) / 2) * (1 - t * 0.2) - ((ground - elevTop) / 2) * (1 - t));
    const dir = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    this.camera.position.copy(center).addScaledVector(dir, 1000);
    // At 0° the camera looks down with the vertical plane at the top (−z); at 90°, with y up.
    this.camera.up.set(0, 0, -1).lerp(new Vector3(0, 1, 0), t).normalize();
    this.camera.lookAt(center);
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const aspect = rect.width / rect.height;
    const { width, height, ground, planBottom, elevTop } = EPURE;
    const t = ease(this.angle);
    // At 0°, the épure's box (it matches the drawing). Folded, the box of the dihedron in the view.
    const flat = { left: -width / 2, right: width / 2, top: height / 2, bottom: -height / 2 };
    this.camera.updateMatrixWorld();
    const view = this.camera.matrixWorldInverse;
    const h = ground - elevTop;
    const d = planBottom - ground;
    const theta = (t * Math.PI) / 2;
    const corners = [
      [0, 0, 0], [width, 0, 0], [0, 0, d], [width, 0, d],
      [0, h * Math.sin(theta), -h * Math.cos(theta)], [width, h * Math.sin(theta), -h * Math.cos(theta)],
    ].map(([x, y, z]) => new Vector3(x, y, z).applyMatrix4(view));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const pad = 16;
    let fit = { left: Math.min(...xs) - pad, right: Math.max(...xs) + pad, top: Math.max(...ys) + pad, bottom: Math.min(...ys) - pad };
    // Same aspect ratio as the view, centered.
    const cx = (fit.left + fit.right) / 2;
    const cy = (fit.top + fit.bottom) / 2;
    let hw = (fit.right - fit.left) / 2;
    let hh = (fit.top - fit.bottom) / 2;
    if (hw / hh > aspect) hh = hw / aspect;
    else hw = hh * aspect;
    fit = { left: cx - hw, right: cx + hw, top: cy + hh, bottom: cy - hh };
    const mix = (a: number, b: number) => a + (b - a) * t;
    Object.assign(this.camera, {
      left: mix(flat.left, fit.left),
      right: mix(flat.right, fit.right),
      top: mix(flat.top, fit.top),
      bottom: mix(flat.bottom, fit.bottom),
    });
    this.camera.updateProjectionMatrix();
    this.display.render(renderer, rect, this.scene, this.camera, { background: this.background });
  }

  dispose(): void {
    this.display.dispose();
  }
}

function edgePoints(g: OctahedronGeometry): Vector3[] {
  const pos = g.getAttribute('position');
  const out: Vector3[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(pos, i);
    const b = new Vector3().fromBufferAttribute(pos, i + 1);
    const c = new Vector3().fromBufferAttribute(pos, i + 2);
    out.push(a, b, b, c, c, a);
  }
  return out;
}

function setPositions(obj: Line | Points, flat: number[]): void {
  obj.geometry.setAttribute('position', new Float32BufferAttribute(flat, 3));
  obj.geometry.computeBoundingSphere();
}


export { DISPLAY_MODES, Engine };
