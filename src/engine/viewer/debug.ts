import { WebGLRenderTarget, type WebGLRenderer } from 'three';
import type { Engine, EngineView } from '../engine/Engine';
import type { TimeViewer } from './TimeViewer';

// Verification utilities for /debug and the in-browser checks. The worlds do not use them.

/** A view's rectangle in device pixels (GL origin), or null if it is not visible. */
export function viewRect(engine: Engine, view: EngineView) {
  const box = view.element.getBoundingClientRect();
  const dpr = engine.renderer.domElement.width / engine.renderer.domElement.clientWidth;
  const height = engine.renderer.domElement.height;
  const x = Math.max(0, Math.round(box.left * dpr));
  const top = Math.max(0, Math.round(box.top * dpr));
  const width = Math.min(engine.renderer.domElement.width - x, Math.round(box.width * dpr));
  const h = Math.min(height - top, Math.round(box.height * dpr));
  return { x, y: height - (top + h), width, height: h, dpr };
}

/** Reads canvas pixels (the engine uses preserveDrawingBuffer, so this is valid outside the rAF). */
export function readCanvas(renderer: WebGLRenderer, rect: { x: number; y: number; width: number; height: number }) {
  const gl = renderer.getContext();
  renderer.setRenderTarget(null);
  const pixels = new Uint8Array(rect.width * rect.height * 4);
  gl.readPixels(rect.x, rect.y, rect.width, rect.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return pixels;
}

/** Distinct colors in the region (not counting the DOM windows, which are not on the canvas). */
export function countColors(renderer: WebGLRenderer, rect: { x: number; y: number; width: number; height: number }) {
  const pixels = readCanvas(renderer, rect);
  const histogram = new Map<number, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }
  const colors = [...histogram.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ hex: `#${key.toString(16).padStart(6, '0')}`, count }));
  return { distinct: histogram.size, colors };
}

/**
 * Checks that the image is made of uniform `block`×`block` blocks aligned to the view's origin.
 * Returns the fraction of whole blocks that are a single color.
 */
export function checkBlocks(renderer: WebGLRenderer, rect: { x: number; y: number; width: number; height: number }, block: number) {
  const pixels = readCanvas(renderer, rect);
  const columns = Math.floor(rect.width / block);
  const rows = Math.floor(rect.height / block);
  let uniform = 0;
  let nonUniformSample: [number, number] | null = null;
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < columns; bx++) {
      const base = ((by * block) * rect.width + bx * block) * 4;
      let same = true;
      for (let y = 0; y < block && same; y++) {
        for (let x = 0; x < block; x++) {
          const i = ((by * block + y) * rect.width + bx * block + x) * 4;
          if (pixels[i] !== pixels[base] || pixels[i + 1] !== pixels[base + 1] || pixels[i + 2] !== pixels[base + 2]) {
            same = false;
            break;
          }
        }
      }
      if (same) uniform++;
      else nonUniformSample ??= [bx, by];
    }
  }
  return { blocks: columns * rows, uniform, fraction: uniform / (columns * rows), nonUniformSample };
}

/**
 * Which points of the dynamic layer pass the visibility test (stippling, mode, trail) in the
 * current state, using the real shader: each point is painted into its own pixel. Returns the
 * visible points per frame and a hash of the set, for comparing between orbits.
 */
export function visibleByFrame(renderer: WebGLRenderer, viewer: TimeViewer, layer: 'dynamic' | 'static' = 'dynamic') {
  const { staticMaterial, dynamicMaterial, staticPoints, dynamicPoints, frustum, trajectory } = viewer.internals;
  const material = layer === 'dynamic' ? dynamicMaterial : staticMaterial;
  const count = layer === 'dynamic' ? viewer.pack.dynamic.count : viewer.pack.static.count;
  const grid = 2048;
  const rows = Math.ceil(count / grid);
  const target = new WebGLRenderTarget(grid, rows);

  const visibility = [staticPoints.visible, dynamicPoints.visible, frustum.visible, trajectory.visible];
  staticPoints.visible = layer === 'static';
  dynamicPoints.visible = layer === 'dynamic';
  frustum.visible = trajectory.visible = false;
  material.uniforms.uIdLayout.value = 1;
  material.uniforms.uIdGrid.value = grid;
  material.uniforms.uIdRows.value = rows;
  viewer.gpu.dynamicGeometry.setDrawRange(0, viewer.debugState().drawCount);

  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(viewer.scene, viewer.camera);
  const pixels = new Uint8Array(grid * rows * 4);
  renderer.readRenderTargetPixels(target, 0, 0, grid, rows, pixels);
  renderer.setRenderTarget(null);
  target.dispose();

  material.uniforms.uIdLayout.value = 0;
  [staticPoints.visible, dynamicPoints.visible, frustum.visible, trajectory.visible] = visibility;

  let hash = 2166136261;
  let total = 0;
  const visible = (id: number) => pixels[id * 4] > 0;
  for (let id = 0; id < count; id++) {
    const bit = visible(id) ? 1 : 0;
    total += bit;
    hash = Math.imul(hash ^ (bit + (id & 0xff)), 16777619);
  }
  let perFrame: number[] = [];
  if (layer === 'dynamic') {
    const { offsets, frameCount } = viewer.pack.dynamic;
    perFrame = Array.from({ length: frameCount }, (_, f) => {
      let n = 0;
      for (let id = offsets[f]; id < offsets[f + 1]; id++) if (visible(id)) n++;
      return n;
    });
  }
  return { total, hash: (hash >>> 0).toString(16), perFrame };
}

/** Counts the calls that upload data to the GPU (buffers and textures). */
export function instrumentUploads(renderer: WebGLRenderer) {
  const gl = renderer.getContext() as WebGL2RenderingContext & Record<string, unknown>;
  const counts: Record<string, number> = {};
  for (const name of ['bufferData', 'bufferSubData', 'texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'texStorage2D', 'texStorage3D']) {
    const original = (gl[name] as (...args: unknown[]) => unknown).bind(gl);
    counts[name] = 0;
    gl[name] = (...args: unknown[]) => {
      counts[name]++;
      return original(...args);
    };
  }
  return {
    snapshot: () => ({ ...counts }),
    diff: (before: Record<string, number>) => Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v - (before[k] ?? 0)])),
  };
}

/**
 * Area lit by the frustum light: how many background points fall inside the frustum of the
 * current frame's source camera, and where their center is (scene coordinates).
 */
export function litStats(renderer: WebGLRenderer, viewer: TimeViewer) {
  const { staticMaterial, staticPoints, dynamicPoints, frustum, trajectory } = viewer.internals;
  const count = viewer.pack.static.count;
  const grid = 2048;
  const rows = Math.ceil(count / grid);
  const target = new WebGLRenderTarget(grid, rows);
  const visibility = [staticPoints.visible, dynamicPoints.visible, frustum.visible, trajectory.visible];
  staticPoints.visible = true;
  dynamicPoints.visible = frustum.visible = trajectory.visible = false;
  // Full density outside the frustum, to count every point, not only those that pass the stippling.
  const dim = staticMaterial.uniforms.uDimDensity.value;
  staticMaterial.uniforms.uDimDensity.value = 1;
  staticMaterial.uniforms.uIdLayout.value = 1;
  staticMaterial.uniforms.uIdGrid.value = grid;
  staticMaterial.uniforms.uIdRows.value = rows;
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(viewer.scene, viewer.camera);
  const pixels = new Uint8Array(grid * rows * 4);
  renderer.readRenderTargetPixels(target, 0, 0, grid, rows, pixels);
  renderer.setRenderTarget(null);
  target.dispose();
  staticMaterial.uniforms.uIdLayout.value = 0;
  staticMaterial.uniforms.uDimDensity.value = dim;
  [staticPoints.visible, dynamicPoints.visible, frustum.visible, trajectory.visible] = visibility;

  const { min, max } = viewer.pack.meta.bbox;
  const positions = viewer.pack.static.positions;
  const sum = [0, 0, 0];
  let lit = 0;
  let drawn = 0;
  for (let id = 0; id < count; id++) {
    const r = pixels[id * 4];
    if (r === 0) continue;
    drawn++;
    if (r < 200) continue;
    lit++;
    for (let axis = 0; axis < 3; axis++) sum[axis] += min[axis] + (positions[id * 3 + axis] / 65535) * (max[axis] - min[axis]);
  }
  return { drawn, lit, centroid: sum.map((v) => (lit ? v / lit : 0)) };
}

/** Point vertices the view submits for drawing in one render (renderer.info). */
export function drawnPoints(renderer: WebGLRenderer, viewer: TimeViewer) {
  const target = new WebGLRenderTarget(64, 64);
  viewer.gpu.dynamicGeometry.setDrawRange(0, viewer.debugState().drawCount);
  renderer.setRenderTarget(target);
  renderer.render(viewer.scene, viewer.camera);
  renderer.setRenderTarget(null);
  target.dispose();
  return { points: renderer.info.render.points, calls: renderer.info.render.calls };
}
