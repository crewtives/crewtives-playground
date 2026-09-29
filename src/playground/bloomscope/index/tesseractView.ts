// WebGL view of the launcher: the Petrie tesseract as thick glass struts with an ink rule, on the
// ink disc, passed through a retro display (1/3 resolution, ellipse mask) like the peepholes. It is
// a still figure: it is only repainted if the size or the display changes.

import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, OrthographicCamera, Scene, type WebGLRenderer } from 'three';
import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Engine, EngineView, ViewRect } from '../../../engine/engine/Engine';
import { displayRegistry } from '../../shared/displays';
import { GLASS, type Rgb } from '../specimens/mesh';
import { petrieTesseract, type TesseractRing } from './tesseract';

const INK_RGB8: [number, number, number] = [27, 15, 46];
// One glass color per edge family: the order-8 symmetry reads ring by ring.
const RING_COLOR: Record<TesseractRing, Rgb> = { inner: GLASS.petal, spoke: GLASS.sky, outer: GLASS.chartreuse };
// Paint order: the octagram at the bottom, then the spokes, the octagon above and the vertices on top.
const RING_ORDER: TesseractRing[] = ['inner', 'spoke', 'outer'];

class Painter {
  readonly positions: number[] = [];
  readonly colors: number[] = [];

  private push(x: number, y: number, c: Rgb): void {
    this.positions.push(x, y, 0);
    this.colors.push(c[0], c[1], c[2]);
  }

  tri(a: [number, number], b: [number, number], d: [number, number], c: Rgb): void {
    this.push(a[0], a[1], c);
    this.push(b[0], b[1], c);
    this.push(d[0], d[1], c);
  }

  /** Strut from a to b with half-width `hw`, extended by `hw` at each end (square cap). */
  strut(a: [number, number], b: [number, number], hw: number, c: Rgb): void {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * hw;
    const ny = ux * hw;
    const a0: [number, number] = [a[0] - ux * hw, a[1] - uy * hw];
    const b0: [number, number] = [b[0] + ux * hw, b[1] + uy * hw];
    const p1: [number, number] = [a0[0] + nx, a0[1] + ny];
    const p2: [number, number] = [b0[0] + nx, b0[1] + ny];
    const p3: [number, number] = [b0[0] - nx, b0[1] - ny];
    const p4: [number, number] = [a0[0] - nx, a0[1] - ny];
    this.tri(p1, p2, p3, c);
    this.tri(p1, p3, p4, c);
  }

  disc(center: [number, number], r: number, c: Rgb, sides = 12): void {
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2;
      const a1 = ((k + 1) / sides) * Math.PI * 2;
      this.tri(center, [center[0] + r * Math.cos(a0), center[1] + r * Math.sin(a0)], [center[0] + r * Math.cos(a1), center[1] + r * Math.sin(a1)], c);
    }
  }
}

export class TesseractView implements EngineView {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private readonly mesh: Mesh;
  private built = '';

  constructor(
    readonly element: HTMLElement,
    private readonly display: RetroDisplay,
  ) {
    // No depth test: within a single draw call the triangles are painted in order.
    this.mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, depthTest: false, depthWrite: false }));
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Geometry in render pixels (1/3 of CSS): whole widths, so the dither does not smear the struts. */
  private build(width: number, height: number): void {
    const key = `${width}x${height}`;
    if (key === this.built) return;
    this.built = key;
    Object.assign(this.camera, { left: -width / 2, right: width / 2, top: height / 2, bottom: -height / 2 });
    this.camera.updateProjectionMatrix();
    const size = Math.min(width, height);
    // Same radius as the fallback SVG (150 of 400).
    const radius = size * 0.375;
    const core = Math.max(1, Math.round(size / 60)) / 2;
    const key1 = core + Math.max(1, Math.round(size / 110));
    const t = petrieTesseract();
    const at = (i: number): [number, number] => [t.points[i][0] * radius, t.points[i][1] * radius];
    const p = new Painter();
    for (const ring of RING_ORDER) {
      const edges = t.edges.filter((e) => e.ring === ring);
      for (const e of edges) p.strut(at(e.a), at(e.b), key1, GLASS.ink);
      for (const e of edges) p.strut(at(e.a), at(e.b), core, RING_COLOR[ring]);
    }
    const node = core * 2.3;
    for (let i = 0; i < t.points.length; i++) {
      p.disc(at(i), node + (key1 - core), GLASS.ink);
      p.disc(at(i), node, GLASS.pollen);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(p.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(p.colors, 3));
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    this.display.render(renderer, rect, this.scene, this.camera, {
      background: INK_RGB8,
      mask: { shape: 'ellipse' },
      onResolution: (w, h) => this.build(w, h),
    });
  }
}

/** Mounts the launcher's tesseract on the page's engine. */
export function mountLauncherGl(engine: Engine, element: HTMLElement, tokenRoot: Element): TesseractView {
  const display = new RetroDisplay({ tokenRoot, pixelScale: 3 });
  displayRegistry.register(display);
  const view = new TesseractView(element, display);
  display.onChange(() => engine.invalidate(view));
  engine.add(view);
  return view;
}
