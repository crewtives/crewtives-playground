import { InstancedInterleavedBuffer, InterleavedBufferAttribute, PerspectiveCamera, Scene, type WebGLRenderer } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { EngineView, ViewRect } from '../engine/Engine';
import { cssColor, prefersReducedMotion } from '../display/cssColor';

/** The tesseract's 16 vertices: every combination of ±1 on 4 axes. */
export function tesseractVertices(): number[][] {
  const vertices: number[][] = [];
  for (let i = 0; i < 16; i++) {
    vertices.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
  }
  return vertices;
}

/** The 32 edges: pairs of vertices that differ on exactly one axis. */
export function tesseractEdges(): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  for (let a = 0; a < 16; a++) {
    for (let bit = 0; bit < 4; bit++) {
      const b = a ^ (1 << bit);
      if (a < b) edges.push([a, b]);
    }
  }
  return edges;
}

export interface Rotation4 {
  xw: number;
  yw: number;
  zw: number;
}

/** Rotates a 4D point in the XW, YW and ZW planes and projects it to 3D with perspective along W. */
export function project4(v: number[], r: Rotation4, distance = 3): [number, number, number] {
  let [x, y, z, w] = v;
  let c = Math.cos(r.xw);
  let s = Math.sin(r.xw);
  [x, w] = [x * c - w * s, x * s + w * c];
  c = Math.cos(r.yw);
  s = Math.sin(r.yw);
  [y, w] = [y * c - w * s, y * s + w * c];
  c = Math.cos(r.zw);
  s = Math.sin(r.zw);
  [z, w] = [z * c - w * s, z * s + w * c];
  const k = distance / (distance - w);
  return [x * k, y * k, z * k];
}

export interface TesseractOptions {
  /** CSS token for the line color. */
  colorToken?: string;
  /** Width in CSS px. */
  linewidth?: number;
  dashSize?: number;
  gapSize?: number;
  /** Speed of the 4D rotation (rad/s) and of the dashes (units/s). */
  spin?: number;
  march?: number;
  /** Fraction of the view's shorter side the tesseract fills (0..1). It always fits whole. */
  size?: number;
  /** Compatibility: camera distance from the previous version (11 = default size). Use `size`. */
  distance?: number;
}

/**
 * Footer mark: a tesseract drawn with dashed edges, with the 4D rotation running, turning in 3D
 * toward the cursor and with the dashes marching. With reduced motion it stays still.
 */
export class TesseractView implements EngineView {
  readonly element: HTMLElement;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(28, 1, 0.1, 100);
  private readonly material: LineMaterial;
  private readonly lines: LineSegments2;
  private readonly positions: InstancedInterleavedBuffer;
  private readonly distances: InstancedInterleavedBuffer;
  private readonly vertices = tesseractVertices();
  private readonly edges = tesseractEdges();
  private readonly options: Required<TesseractOptions>;
  private readonly still = prefersReducedMotion();
  private readonly rotation: Rotation4 = { xw: 0.62, yw: 0.34, zw: 0.18 };
  private yaw = -0.5;
  private pitch = 0.32;
  private targetYaw = -0.5;
  private targetPitch = 0.32;
  private colored = false;
  private readonly onPointer = (event: PointerEvent) => {
    const box = this.element.getBoundingClientRect();
    const nx = ((event.clientX - box.left) / box.width) * 2 - 1;
    const ny = ((event.clientY - box.top) / box.height) * 2 - 1;
    this.targetYaw = Math.max(-1, Math.min(1, nx)) * 0.9;
    this.targetPitch = Math.max(-1, Math.min(1, ny)) * 0.6;
  };

  constructor(element: HTMLElement, options: TesseractOptions = {}) {
    this.element = element;
    this.options = {
      colorToken: options.colorToken ?? '--paper',
      linewidth: options.linewidth ?? 1.25,
      dashSize: options.dashSize ?? 0.09,
      gapSize: options.gapSize ?? 0.07,
      spin: options.spin ?? 0.22,
      march: options.march ?? 0.18,
      size: options.size ?? (options.distance ? (0.78 * 11) / options.distance : 0.78),
      distance: options.distance ?? 11,
    };

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(new Float32Array(this.edges.length * 6));
    this.positions = (geometry.attributes.instanceStart as InterleavedBufferAttribute).data as InstancedInterleavedBuffer;
    // Per-edge distances (each dash starts at its vertex), rewritten in place every frame.
    this.distances = new InstancedInterleavedBuffer(new Float32Array(this.edges.length * 2), 2, 1);
    geometry.setAttribute('instanceDistanceStart', new InterleavedBufferAttribute(this.distances, 1, 0));
    geometry.setAttribute('instanceDistanceEnd', new InterleavedBufferAttribute(this.distances, 1, 1));

    this.material = new LineMaterial({
      color: 0xffffff,
      linewidth: this.options.linewidth,
      dashed: true,
      dashSize: this.options.dashSize,
      gapSize: this.options.gapSize,
      dashScale: 1,
      worldUnits: false,
    });
    this.lines = new LineSegments2(geometry, this.material);
    this.lines.frustumCulled = false;
    this.scene.add(this.lines);
    this.camera.position.set(0, 0, 11);
    this.updateGeometry();

    if (!this.still) window.addEventListener('pointermove', this.onPointer, { passive: true });
  }

  tick(dt: number): boolean {
    if (this.still) return false;
    this.rotation.xw += dt * this.options.spin;
    this.rotation.zw += dt * this.options.spin * 0.61;
    const k = 1 - Math.exp(-dt / 0.35);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;
    this.material.dashOffset -= dt * this.options.march;
    this.updateGeometry();
    return true;
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    if (!this.colored) {
      this.material.color.copy(cssColor(this.element, this.options.colorToken));
      this.colored = true;
    }
    this.material.resolution.set(rect.width, rect.height);
    this.material.linewidth = this.options.linewidth * rect.dpr;
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    // Radius of the projection (with room for the rotation) fitted to the view's shorter side.
    const radius = 2.7;
    const tanHalf = Math.tan((this.camera.fov * Math.PI) / 360) * Math.min(1, this.camera.aspect);
    this.camera.position.z = radius / tanHalf / this.options.size;
    this.lines.rotation.set(this.pitch, this.yaw, 0);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this.onPointer);
    this.lines.geometry.dispose();
    this.material.dispose();
  }

  private updateGeometry(): void {
    const projected = this.vertices.map((v) => project4(v, this.rotation));
    const pos = this.positions.array as Float32Array;
    const dist = this.distances.array as Float32Array;
    this.edges.forEach(([a, b], i) => {
      const p = projected[a];
      const q = projected[b];
      pos.set(p, i * 6);
      pos.set(q, i * 6 + 3);
      dist[i * 2] = 0;
      dist[i * 2 + 1] = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    });
    this.positions.needsUpdate = true;
    this.distances.needsUpdate = true;
  }
}
