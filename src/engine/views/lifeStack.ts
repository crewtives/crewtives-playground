import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineLoop,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import type { RetroDisplay } from '../display/RetroDisplay';
import { readColor, type Rgb8 } from '../display/palette';
import type { EngineView, ViewRect } from '../engine/Engine';
import { cssColor, cssNumber, prefersReducedMotion } from '../display/cssColor';

export type Grid = Uint8Array;

/** One step of Conway's Game of Life on a `size`×`size` torus. */
export function lifeStep(grid: Grid, size: number): Grid {
  const next = new Uint8Array(grid.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          n += grid[((y + dy + size) % size) * size + ((x + dx + size) % size)];
        }
      }
      const alive = grid[y * size + x] === 1;
      next[y * size + x] = n === 3 || (alive && n === 2) ? 1 : 0;
    }
  }
  return next;
}

/** Seeds a pattern (a list of [x, y]) offset to (ox, oy). */
export function seed(size: number, cells: Array<[number, number]>, ox = 0, oy = 0, grid: Grid = new Uint8Array(size * size)): Grid {
  for (const [x, y] of cells) grid[((y + oy) % size) * size + ((x + ox) % size)] = 1;
  return grid;
}

export const GLIDER: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];

/** All generations up to `count`, starting with `initial`. */
export function generations(initial: Grid, size: number, count: number): Grid[] {
  const out = [initial];
  for (let i = 1; i < count; i++) out.push(lifeStep(out[i - 1], size));
  return out;
}

export interface LifeStackOptions {
  size?: number;
  count?: number;
  /** Milliseconds per generation in the animation. */
  stepMs?: number;
  backgroundToken?: string;
  oldToken?: string;
  newToken?: string;
  presentToken?: string;
  /** The page's shared display: if present, the view follows the 1-bit / 16 / Millions selector. */
  display?: RetroDisplay;
}

/**
 * "2D + time = 3D": a glider whose generations stack in depth. The most recent generation sits
 * at the front, flat like the 2D widget, and the earlier ones recede into a staircase. It is
 * drawn at low resolution and upscaled without smoothing, like the rest of the desktop.
 */
export class LifeStackView implements EngineView {
  readonly element: HTMLElement;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(32, 1, 0.1, 400);
  private readonly mesh: InstancedMesh;
  /** Instances sorted by generation: those of generation g occupy [offsets[g], offsets[g+1]). */
  private readonly offsets: number[];
  private readonly count: number;
  private readonly stepMs: number;
  private readonly still = prefersReducedMotion();
  private readonly tokens: Required<Pick<LifeStackOptions, 'backgroundToken' | 'oldToken' | 'newToken' | 'presentToken'>>;
  private readonly cellGens: number[] = [];
  /** Outline of the 2D grid at the current generation: the "plane" that moves forward in time. */
  private readonly frame: LineLoop;
  private readonly depth = 1.25;
  private current: number;
  private clock = 0;
  private pause = 0;
  private colored = false;
  private background = new Color();
  private backgroundRgb: Rgb8 = [0, 0, 0];
  private readonly display?: RetroDisplay;

  private target: WebGLRenderTarget | null = null;
  private readonly blitScene = new Scene();
  private readonly blitCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly blitMaterial = new MeshBasicMaterial();

  constructor(element: HTMLElement, options: LifeStackOptions = {}) {
    this.element = element;
    this.display = options.display;
    const size = options.size ?? 16;
    this.count = options.count ?? 36;
    this.stepMs = options.stepMs ?? 140;
    this.tokens = {
      backgroundToken: options.backgroundToken ?? '--ink',
      oldToken: options.oldToken ?? '--muted',
      newToken: options.newToken ?? '--paper',
      presentToken: options.presentToken ?? '--accent-forward',
    };

    const initial = seed(size, GLIDER, 1, 1);
    seed(size, GLIDER, 9, 3, initial);
    const gens = generations(initial, size, this.count);

    this.offsets = [0];
    const matrices: Matrix4[] = [];
    const depth = this.depth;
    gens.forEach((grid, g) => {
      for (let i = 0; i < grid.length; i++) {
        if (!grid[i]) continue;
        const x = (i % size) - size / 2 + 0.5;
        const y = size / 2 - Math.floor(i / size) - 0.5;
        // The most recent at the front (z = 0); the earlier ones further back.
        matrices.push(new Matrix4().makeTranslation(x, y, -(this.count - 1 - g) * depth));
        this.cellGens.push(g);
      }
      this.offsets.push(matrices.length);
    });

    this.mesh = new InstancedMesh(new BoxGeometry(0.86, 0.86, 0.86), new MeshBasicMaterial(), matrices.length);
    matrices.forEach((m, i) => this.mesh.setMatrixAt(i, m));
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    // The time axis (Z) crosses the frame horizontally; the grid plane is seen foreshortened.
    const half = size / 2;
    const center = new Vector3(0, 0, -((this.count - 1) * depth) / 2);
    const direction = new Vector3(0.82, 0.5, 0.3).normalize();
    this.camera.position.copy(center).addScaledVector(direction, ((this.count - 1) * depth) * 1.12);
    this.camera.lookAt(center);

    const outline = new BufferGeometry();
    outline.setAttribute(
      'position',
      new Float32BufferAttribute([-half, -half, 0, half, -half, 0, half, half, 0, -half, half, 0], 3),
    );
    this.frame = new LineLoop(outline, new LineBasicMaterial());
    this.frame.frustumCulled = false;
    this.scene.add(this.frame);

    this.blitScene.add(new Mesh(new PlaneGeometry(2, 2), this.blitMaterial));

    this.current = this.still ? this.count - 1 : 0;
    this.showUpTo(this.current);
  }

  tick(dt: number): boolean {
    if (this.still) return false;
    if (this.pause > 0) {
      this.pause -= dt * 1000;
      return true;
    }
    this.clock += dt * 1000;
    let changed = false;
    while (this.clock >= this.stepMs) {
      this.clock -= this.stepMs;
      if (this.current >= this.count - 1) {
        this.current = 0;
        this.pause = 1400;
        this.clock = 0;
      } else {
        this.current++;
      }
      changed = true;
      if (this.pause > 0) break;
    }
    if (changed) {
      this.showUpTo(this.current);
      this.recolor();
    }
    return true;
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    if (!this.colored) {
      this.background = cssColor(this.element, this.tokens.backgroundToken, '#000000');
      this.backgroundRgb = readColor(this.element, [this.tokens.backgroundToken], [0, 0, 0]);
      this.recolor();
      this.colored = true;
    }
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    if (this.display) {
      this.display.render(renderer, rect, this.scene, this.camera, { background: this.backgroundRgb });
      return;
    }
    // Fallback without a shared display: its own pixelation at --render-scale, with no palette.
    const scale = Math.max(1, Math.round(cssNumber(this.element, '--render-scale', 3) * rect.dpr * 0.5));
    const w = Math.max(1, Math.round(rect.width / scale));
    const h = Math.max(1, Math.round(rect.height / scale));
    if (!this.target || this.target.width !== w || this.target.height !== h) {
      this.target?.dispose();
      this.target = new WebGLRenderTarget(w, h, { minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true });
      this.blitMaterial.map = this.target.texture;
      this.blitMaterial.needsUpdate = true;
    }

    renderer.setRenderTarget(this.target);
    renderer.setClearColor(this.background, 1);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
    renderer.render(this.blitScene, this.blitCamera);
  }

  dispose(): void {
    this.target?.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
    this.blitMaterial.dispose();
  }

  private showUpTo(generation: number): void {
    this.mesh.count = this.offsets[generation + 1];
    this.frame.position.z = -(this.count - 1 - generation) * this.depth;
  }

  private recolor(): void {
    const oldColor = cssColor(this.element, this.tokens.oldToken, '#555555');
    const newColor = cssColor(this.element, this.tokens.newToken, '#dddddd');
    const present = cssColor(this.element, this.tokens.presentToken, '#3fd4e0');
    (this.frame.material as LineBasicMaterial).color.copy(present);
    const color = new Color();
    for (let i = 0; i < this.cellGens.length; i++) {
      const g = this.cellGens[i];
      if (g === this.current) color.copy(present);
      else color.copy(oldColor).lerp(newColor, this.current > 0 ? g / this.current : 1);
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
