import {
  Color,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { atlasLayout, sourceCell, type PackCamera } from '../../engine/pack/format';
import { writePack, type PackOutput, type PointSet } from '../../engine/pack/writer';
import { searchCumulative, skinVertices, toSrgb8, triangleArea, type BakeParams } from './common';
import { gaussian, stream } from '../scenes/random';
import type { Recipe } from './recipes/recipe';

export type { BakeParams } from './common';

/** three.js layers: the "real" world that the source camera sees, the subject, and the preview helpers. */
export const LAYER_WORLD = 0;
export const LAYER_SUBJECT = 1;
export const LAYER_PREVIEW = 2;

const SUPERSAMPLE = 2;
const MASK_MATERIAL = new MeshBasicMaterial({ color: 0xffffff });

export interface SourceFrame {
  width: number;
  height: number;
  /** RGBA, rows from top to bottom (like a PNG). */
  pixels: Uint8ClampedArray;
}

export interface SilhouetteCheck {
  /** Fraction of the frame's points that project inside the silhouette (±1 px). */
  inside: number;
  /** Fraction of silhouette pixels with some point within ±1 px. */
  covered: number;
  mask: Uint8Array;
  projected: Float32Array;
}

export interface BakeResult {
  output: PackOutput;
  pages: { name: string; blob: Blob }[];
  frames: PointSet[];
}

/**
 * Stable subject points (D5), chosen once on the pose of frame 0: per point, the part, the three
 * vertices of the triangle, the barycentric weights, the depth error and the color variation.
 */
interface StableSamples {
  /** Parameters they were chosen with: a different `setup` invalidates them. */
  key: string;
  part: Uint16Array;
  vertices: Uint32Array;
  weights: Float64Array;
  depth: Float64Array;
  variation: Float64Array;
}

/**
 * The /bake pipeline (D3), shared by every recipe: samples the subject on its mesh (with skinning
 * applied, or rewritten by the recipe for a subject built from equations), asks the recipe for the
 * environment, renders one source frame per frame from the recipe's camera and writes the pack.
 */
export class SyntheticScene {
  readonly scene = new Scene();
  readonly sourceCamera = new PerspectiveCamera(45, 16 / 9, 0.1, 400);
  readonly recipe: Recipe;
  params: BakeParams;

  private readonly renderer: WebGLRenderer;
  private readonly targets = new Map<string, WebGLRenderTarget>();
  private stable: StableSamples | null = null;

  constructor(renderer: WebGLRenderer, recipe: Recipe) {
    this.renderer = renderer;
    this.recipe = recipe;
    this.params = { ...recipe.defaults };
    this.sourceCamera.layers.set(LAYER_WORLD);
    this.sourceCamera.layers.enable(LAYER_SUBJECT);
    this.scene.add(recipe.world, recipe.subject);
    for (const light of recipe.lights) {
      light.layers.enableAll();
      this.scene.add(light);
    }
  }

  get frameCount(): number {
    return Math.round(this.params.fps * this.params.duration);
  }

  get sourceSize(): { width: number; height: number } {
    const width = Math.round(this.params.sourceWidth);
    return { width, height: Math.round((width * 9) / 16) };
  }

  async load(): Promise<void> {
    await this.recipe.load();
    this.recipe.subject.traverse((object) => object.layers.set(LAYER_SUBJECT));
  }

  setup(params: BakeParams): void {
    this.params = { ...params };
    // The stable points depend on the seed, the count, the noise and the pose of frame 0, which may
    // depend on any parameter: with different parameters they are chosen again.
    if (this.stable && this.stable.key !== JSON.stringify(this.params)) this.stable = null;
    this.recipe.setup(this.params);
    this.recipe.world.traverse((object) => object.layers.set(LAYER_WORLD));
  }

  pose(frame: number): void {
    this.recipe.pose(frame);
  }

  cameraAt(frame: number): PackCamera {
    const { width, height } = this.sourceSize;
    return this.recipe.cameraAt(frame, width / height);
  }

  applyCamera(camera: PerspectiveCamera, pack: PackCamera): void {
    camera.position.set(...pack.pos);
    camera.quaternion.set(...pack.quat);
    camera.fov = pack.fov;
    camera.aspect = pack.aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  /**
   * Subject points in frame f, sampled on its already deformed mesh. Without `stableSubject` they
   * are chosen anew in every frame; with the flag, they are the same places on the body in all of them.
   */
  sampleSubject(frame: number, cameras: PackCamera[]): PointSet {
    if (this.recipe.stableSubject) return this.sampleStableSubject(frame, cameras);
    this.pose(frame);
    const parts = this.recipe.parts;
    const random = stream(this.params.seed, `subject:${frame}`);
    const count = this.params.pointsPerFrame;
    const noise = this.params.subjectDepthNoise ?? this.params.depthNoise;
    const eye = new Vector3(...cameras[frame].pos);

    // CPU skinning of every vertex, and areas of the already deformed triangles.
    const skinned = parts.map((part) => skinVertices(part));
    const triangles: { part: number; a: number; b: number; c: number }[] = [];
    const cumulative: number[] = [];
    let total = 0;
    parts.forEach((part, p) => {
      const v = skinned[p];
      for (let i = 0; i < part.indices.length; i += 3) {
        const a = part.indices[i];
        const b = part.indices[i + 1];
        const c = part.indices[i + 2];
        total += triangleArea(v, a, b, c);
        triangles.push({ part: p, a, b, c });
        cumulative.push(total);
      }
    });

    const positions = new Float32Array(count * 3);
    const colors = new Uint8Array(count * 3);
    const A = new Vector3();
    const B = new Vector3();
    const C = new Vector3();
    const P = new Vector3();
    const normal = new Vector3();
    for (let i = 0; i < count; i++) {
      const tri = triangles[searchCumulative(cumulative, random() * total)];
      const v = skinned[tri.part];
      A.fromArray(v, tri.a * 3);
      B.fromArray(v, tri.b * 3);
      C.fromArray(v, tri.c * 3);
      const r1 = Math.sqrt(random());
      const r2 = random();
      P.set(0, 0, 0)
        .addScaledVector(A, 1 - r1)
        .addScaledVector(B, r1 * (1 - r2))
        .addScaledVector(C, r1 * r2);
      normal.subVectors(B, A).cross(C.clone().sub(A)).normalize();
      const lit = this.recipe.shadeSubject(parts[tri.part].albedo, P, normal, frame, parts[tri.part]);
      const variation = 0.9 + 0.2 * random();

      // Depth error along the source camera's ray: it does not change the projection.
      const spread = 0.012 * noise * (random() < 0.04 * noise ? 7 : 1);
      P.sub(eye).multiplyScalar(1 + spread * gaussian(random)).add(eye);

      P.toArray(positions, i * 3);
      for (let k = 0; k < 3; k++) colors[i * 3 + k] = toSrgb8(lit[k] * variation);
    }
    return { positions, colors };
  }

  /**
   * Stable points (D5): the same places on the body in every frame. The position comes from the
   * frame's already deformed vertices and the normal from the deformed triangle; the depth error
   * (fixed per point) is applied along the ray of this frame's source camera.
   */
  private sampleStableSubject(frame: number, cameras: PackCamera[]): PointSet {
    const samples = this.stableSamples();
    this.pose(frame);
    const parts = this.recipe.parts;
    const count = samples.part.length;
    const eye = new Vector3(...cameras[frame].pos);
    const deformed = parts.map((part) => skinVertices(part));

    const positions = new Float32Array(count * 3);
    const colors = new Uint8Array(count * 3);
    const A = new Vector3();
    const B = new Vector3();
    const C = new Vector3();
    const P = new Vector3();
    const edge = new Vector3();
    const normal = new Vector3();
    for (let i = 0; i < count; i++) {
      const p = samples.part[i];
      const v = deformed[p];
      A.fromArray(v, samples.vertices[i * 3] * 3);
      B.fromArray(v, samples.vertices[i * 3 + 1] * 3);
      C.fromArray(v, samples.vertices[i * 3 + 2] * 3);
      P.set(0, 0, 0)
        .addScaledVector(A, samples.weights[i * 3])
        .addScaledVector(B, samples.weights[i * 3 + 1])
        .addScaledVector(C, samples.weights[i * 3 + 2]);
      normal.subVectors(B, A).cross(edge.subVectors(C, A)).normalize();
      const lit = this.recipe.shadeSubject(parts[p].albedo, P, normal, frame, parts[p]);
      P.sub(eye).multiplyScalar(1 + samples.depth[i]).add(eye);
      P.toArray(positions, i * 3);
      for (let k = 0; k < 3; k++) colors[i * 3 + k] = toSrgb8(lit[k] * samples.variation[i]);
    }
    return { positions, colors };
  }

  /** Picks (once per `setup`) the stable points on the pose of frame 0, weighted by area. */
  private stableSamples(): StableSamples {
    const key = JSON.stringify(this.params);
    if (this.stable?.key === key) return this.stable;
    this.pose(0);
    const parts = this.recipe.parts;
    const random = stream(this.params.seed, 'subject:stable');
    const count = this.params.pointsPerFrame;
    const noise = this.params.subjectDepthNoise ?? this.params.depthNoise;

    const rest = parts.map((part) => skinVertices(part));
    const triangles: { part: number; a: number; b: number; c: number }[] = [];
    const cumulative: number[] = [];
    let total = 0;
    parts.forEach((part, p) => {
      const v = rest[p];
      for (let i = 0; i < part.indices.length; i += 3) {
        const a = part.indices[i];
        const b = part.indices[i + 1];
        const c = part.indices[i + 2];
        total += triangleArea(v, a, b, c);
        triangles.push({ part: p, a, b, c });
        cumulative.push(total);
      }
    });

    const samples: StableSamples = {
      key,
      part: new Uint16Array(count),
      vertices: new Uint32Array(count * 3),
      weights: new Float64Array(count * 3),
      depth: new Float64Array(count),
      variation: new Float64Array(count),
    };
    for (let i = 0; i < count; i++) {
      const tri = triangles[searchCumulative(cumulative, random() * total)];
      const r1 = Math.sqrt(random());
      const r2 = random();
      samples.part[i] = tri.part;
      samples.vertices.set([tri.a, tri.b, tri.c], i * 3);
      samples.weights.set([1 - r1, r1 * (1 - r2), r1 * r2], i * 3);
      samples.variation[i] = 0.9 + 0.2 * random();
      // Same depth error as the per-frame sampling, but fixed: including the "dust" roll.
      const spread = 0.012 * noise * (random() < 0.04 * noise ? 7 : 1);
      samples.depth[i] = spread * gaussian(random);
    }
    this.stable = samples;
    return samples;
  }

  sampleEnvironment(cameras: PackCamera[]): PointSet {
    return this.recipe.environment(cameras);
  }

  /** Source frame f: the "real" scene (meshes) from the frame's camera, with no retro treatment. */
  renderSource(frame: number, camera: PackCamera): SourceFrame {
    this.pose(frame);
    this.applyCamera(this.sourceCamera, camera);
    const { width, height } = this.sourceSize;
    const w = width * SUPERSAMPLE;
    const h = height * SUPERSAMPLE;
    const target = this.target(w, h);
    const renderer = this.renderer;
    const look = this.recipe.sourceLook();

    const previous = { background: this.scene.background, fog: this.scene.fog, toneMapping: renderer.toneMapping };
    this.scene.background = look.background;
    this.scene.fog = look.fog;
    renderer.toneMapping = NoToneMapping;
    renderer.shadowMap.enabled = look.shadows;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this.scene, this.sourceCamera);
    const raw = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(target, 0, 0, w, h, raw);
    renderer.setRenderTarget(null);
    this.scene.background = previous.background;
    this.scene.fog = previous.fog;
    renderer.toneMapping = previous.toneMapping;

    // 2×2 downsample and vertical flip (GL stores rows bottom to top).
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let k = 0; k < 4; k++) {
          let sum = 0;
          for (let sy = 0; sy < SUPERSAMPLE; sy++) {
            for (let sx = 0; sx < SUPERSAMPLE; sx++) {
              sum += raw[((y * SUPERSAMPLE + sy) * w + x * SUPERSAMPLE + sx) * 4 + k];
            }
          }
          pixels[((height - 1 - y) * width + x) * 4 + k] = k === 3 ? 255 : Math.round(sum / SUPERSAMPLE ** 2);
        }
      }
    }
    return { width, height, pixels };
  }

  /** Silhouette of the subject in frame f (1 = subject), rows from top to bottom. */
  renderMask(frame: number, camera: PackCamera): Uint8Array {
    this.pose(frame);
    this.applyCamera(this.sourceCamera, camera);
    const { width, height } = this.sourceSize;
    const target = this.target(width, height, 'mask');
    const renderer = this.renderer;
    const previous = { background: this.scene.background, override: this.scene.overrideMaterial };
    this.scene.background = new Color(0x000000);
    this.scene.overrideMaterial = MASK_MATERIAL;
    this.sourceCamera.layers.set(LAYER_SUBJECT);
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this.scene, this.sourceCamera);
    const raw = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, raw);
    renderer.setRenderTarget(null);
    this.sourceCamera.layers.enable(LAYER_WORLD);
    this.scene.background = previous.background;
    this.scene.overrideMaterial = previous.override;

    const mask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) mask[(height - 1 - y) * width + x] = raw[(y * width + x) * 4] > 127 ? 1 : 0;
    }
    return mask;
  }

  /** Compares the silhouette of source frame f with the projection of the points of frame f. */
  checkSilhouette(frame: number, camera: PackCamera, points: PointSet): SilhouetteCheck {
    const mask = this.renderMask(frame, camera);
    const { width, height } = this.sourceSize;
    const cam = new PerspectiveCamera();
    this.applyCamera(cam, camera);
    const count = points.positions.length / 3;
    const projected = new Float32Array(count * 2);
    const hit = new Uint8Array(width * height);
    const P = new Vector3();
    let inside = 0;
    for (let i = 0; i < count; i++) {
      P.fromArray(points.positions, i * 3).project(cam);
      const x = ((P.x + 1) / 2) * width;
      const y = ((1 - P.y) / 2) * height;
      projected[i * 2] = x;
      projected[i * 2 + 1] = y;
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (near(mask, width, height, px, py)) inside++;
      if (px >= 0 && py >= 0 && px < width && py < height) hit[py * width + px] = 1;
    }
    let silhouette = 0;
    let covered = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        silhouette++;
        if (near(hit, width, height, x, y)) covered++;
      }
    }
    return { inside: count ? inside / count : 0, covered: silhouette ? covered / silhouette : 0, mask, projected };
  }

  /** Full bake → an in-memory pack (scene.json, layers and PNG pages). */
  async bake(params: BakeParams, onProgress?: (done: number, total: number, stage: string) => void): Promise<BakeResult> {
    this.setup(params);
    const frameCount = this.frameCount;
    const cameras = Array.from({ length: frameCount }, (_, f) => this.cameraAt(f));
    onProgress?.(0, frameCount, 'environment');
    await nextTick();
    const staticPoints = this.sampleEnvironment(cameras);

    const { width, height } = this.sourceSize;
    const layout = atlasLayout(width, height, frameCount);
    const pageCanvases = Array.from({ length: layout.pages }, (_, p) => {
      const framesHere = Math.min(layout.columns * layout.rows, frameCount - p * layout.columns * layout.rows);
      const canvas = document.createElement('canvas');
      canvas.width = layout.columns * width;
      canvas.height = Math.ceil(framesHere / layout.columns) * height;
      return canvas;
    });
    const source = { width, height, columns: layout.columns, rows: layout.rows, pages: pageCanvases.map((_, p) => `source/page-${p}.png`) };

    const frames: PointSet[] = [];
    for (let f = 0; f < frameCount; f++) {
      frames.push(this.sampleSubject(f, cameras));
      const image = this.renderSource(f, cameras[f]);
      const cell = sourceCell(source, f);
      pageCanvases[cell.page].getContext('2d')!.putImageData(new ImageData(image.pixels as Uint8ClampedArray<ArrayBuffer>, width, height), cell.x, cell.y);
      if (f % 5 === 4) {
        onProgress?.(f + 1, frameCount, 'frames');
        await nextTick();
      }
    }

    onProgress?.(frameCount, frameCount, 'encoding');
    const blobs = await Promise.all(pageCanvases.map((canvas) => toPng(canvas)));
    const output = writePack({
      name: params.name,
      synthetic: true,
      fps: params.fps,
      cameras,
      static: staticPoints,
      frames,
      source,
      sourcePageBytes: blobs.map((blob) => blob.size),
      pointSize: this.recipe.pointSize,
      generator: { name: this.recipe.generatorName, params: { ...params } },
      ...(this.recipe.stableSubject ? { correspondence: true } : {}),
    });
    return { output, pages: blobs.map((blob, p) => ({ name: source.pages[p], blob })), frames };
  }

  private target(width: number, height: number, key = 'source'): WebGLRenderTarget {
    let target = this.targets.get(key);
    if (!target || target.width !== width || target.height !== height) {
      target?.dispose();
      target = new WebGLRenderTarget(width, height, { colorSpace: SRGBColorSpace, depthBuffer: true });
      this.targets.set(key, target);
    }
    return target;
  }
}

function near(grid: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && py >= 0 && px < width && py < height && grid[py * width + px]) return true;
    }
  }
  return false;
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png'));
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
