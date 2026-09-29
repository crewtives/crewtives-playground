import { readColor, type Rgb8 } from '../../../engine/display/palette';
import type { Pack } from '../../../engine/pack/loader';
import type { TimeController } from '../../../engine/time/TimeController';

/**
 * Room plan: the scene seen from above, in pixels (the canvas is scaled ×3 without smoothing, the
 * same grid as the display case). The solid parts of the background (walls, containers), the subject's
 * path, the camera's track, and where the subject and the camera are now, with the direction it faces.
 * It is cropped to the area the subject and the camera cover, with its long axis horizontal.
 */
export function bindPlan(canvas: HTMLCanvasElement, pack: Pack, time: TimeController, tokenRoot: Element = document.documentElement) {
  const width = canvas.width;
  const height = canvas.height;
  const context = canvas.getContext('2d')!;
  const { min, max } = pack.meta.bbox;
  const quantX = (q: number) => min[0] + (q / 65535) * (max[0] - min[0]);
  const quantZ = (q: number) => min[2] + (q / 65535) * (max[2] - min[2]);

  // Subject's path: center of each frame's points, in meters.
  const { offsets, frameCount } = pack.dynamic;
  const path = Array.from({ length: frameCount }, (_, f) => {
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (let i = offsets[f]; i < offsets[f + 1]; i += 25) {
      sx += quantX(pack.dynamic.positions[i * 3]);
      sz += quantZ(pack.dynamic.positions[i * 3 + 2]);
      n++;
    }
    return n ? [sx / n, sz / n] : [0, 0];
  });

  // Framing: subject and cameras with a margin, uniform scale, long axis horizontal.
  const margin = 1.5;
  const xs = [...path.map((p) => p[0]), ...pack.meta.cameras.map((c) => c.pos[0])];
  const zs = [...path.map((p) => p[1]), ...pack.meta.cameras.map((c) => c.pos[2])];
  const x0 = Math.min(...xs) - margin;
  const x1 = Math.max(...xs) + margin;
  const z0 = Math.min(...zs) - margin;
  const z1 = Math.max(...zs) + margin;
  // With z horizontal (to the right), x grows upward; otherwise z grows upward.
  const alongZ = z1 - z0 > x1 - x0;
  const [spanU, spanV] = alongZ ? [z1 - z0, x1 - x0] : [x1 - x0, z1 - z0];
  const scale = Math.min((width - 1) / spanU, (height - 1) / spanV);
  const padU = (width - 1 - spanU * scale) / 2;
  const padV = (height - 1 - spanV * scale) / 2;
  const toPlan = (x: number, z: number): [number, number] =>
    alongZ
      ? [Math.floor(padU + (z - z0) * scale), Math.floor(padV + (x1 - x) * scale)]
      : [Math.floor(padU + (x - x0) * scale), Math.floor(padV + (z1 - z) * scale)];

  // The solid parts: cells with a much higher density of static points than the floor.
  const counts = new Uint32Array(width * height);
  const positions = pack.static.positions;
  for (let i = 0; i < pack.static.count; i += 4) {
    const [u, v] = toPlan(quantX(positions[i * 3]), quantZ(positions[i * 3 + 2]));
    if (u >= 0 && u < width && v >= 0 && v < height) counts[v * width + u]++;
  }
  const sorted = Array.from(counts).filter((n) => n > 0).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 1;
  const solids: number[] = [];
  counts.forEach((n, cell) => {
    if (n > median * 3.2) solids.push(cell);
  });

  const subject = path.map(([x, z]) => toPlan(x, z));
  const cameras = pack.meta.cameras.map((camera) => {
    const [x, y, z, w] = camera.quat;
    // View axis (local −Z) in the XZ plane, mapped to the plan's axes (v grows downward).
    const fx = -(2 * (x * z + w * y));
    const fz = -(1 - 2 * (x * x + y * y));
    const [u, v] = toPlan(camera.pos[0], camera.pos[2]);
    return alongZ ? { x: u, y: v, fx: fz, fy: -fx } : { x: u, y: v, fx, fy: -fz };
  });

  const css = (rgb: Rgb8) => `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
  const draw = () => {
    const paper = css(readColor(tokenRoot, ['--paper'], [243, 244, 242]));
    const ink = css(readColor(tokenRoot, ['--ink'], [18, 17, 16]));
    const wall = css(readColor(tokenRoot, ['--wall'], [90, 26, 28]));
    const soft = css(readColor(tokenRoot, ['--muted'], [109, 106, 102]));
    const direction = time.direction;
    const accent = css(
      readColor(tokenRoot, [direction > 0 ? '--accent-forward' : direction < 0 ? '--accent-rewind' : '--accent-hold'], [243, 244, 242]),
    );
    const frame = time.frame;

    context.fillStyle = paper;
    context.fillRect(0, 0, width, height);
    context.fillStyle = soft;
    for (const cell of solids) context.fillRect(cell % width, Math.floor(cell / width), 1, 1);

    // Camera track, dotted; subject's path so far, solid.
    context.fillStyle = ink;
    cameras.forEach((c, f) => {
      if (f % 6 < 3) context.fillRect(c.x, c.y, 1, 1);
    });
    context.fillStyle = wall;
    for (let f = 0; f <= frame; f++) context.fillRect(subject[f][0], subject[f][1], 1, 1);

    // The camera now, with its view axis: the "light" that sweeps the display case.
    const camera = cameras[frame];
    context.fillStyle = ink;
    for (let step = 1; step <= 7; step++) {
      if (step % 2) context.fillRect(Math.round(camera.x + camera.fx * step), Math.round(camera.y + camera.fy * step), 1, 1);
    }
    context.fillRect(camera.x - 1, camera.y - 1, 3, 3);

    // The subject now, in the direction's color.
    const [dx, dy] = subject[frame];
    context.fillStyle = ink;
    context.fillRect(dx - 2, dy - 2, 5, 5);
    context.fillStyle = accent;
    context.fillRect(dx - 1, dy - 1, 3, 3);
  };

  const off = time.subscribe(draw);
  draw();
  return off;
}
