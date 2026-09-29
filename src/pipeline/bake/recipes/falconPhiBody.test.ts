import { describe, expect, it } from 'vitest';
import { FALCON_DURATION, droneCamera, falconPose, vec3 } from '../../scenes/falconPhi';
import { FalconBody } from './falconPhiBody';

describe('equation-generated falcon', () => {
  const falcon = new FalconBody();
  falcon.orient(falconPose(0));
  const counts = falcon.parts.map((part) => [part.vertexCount, part.indices.length]);

  it('has a fixed topology and closed shells with outward normals over the whole clip', () => {
    for (let t = 0; t <= FALCON_DURATION; t += 0.1) {
      const pose = falconPose(t);
      falcon.pose(pose);
      falcon.parts.forEach((part, k) => {
        expect([part.vertexCount, part.indices.length]).toEqual(counts[k]);
        expect(part.positions.every(Number.isFinite)).toBe(true);
        // The fully folded wing (a "Z" fold) overlaps itself: there the per-vertex normal rules.
        if (part.name === 'wings' && pose.wings.right.fold > 0.8) return;
        for (const volume of part.signedVolumes()) expect(volume).toBeGreaterThan(0);
      });
    }
  });

  it('on the folded wing, the upper-surface normals point up from the wing and the lower-surface normals point down', () => {
    const pose = falconPose(14);
    falcon.pose(pose);
    const wings = falcon.parts.find((part) => part.name === 'wings')!;
    let agree = 0;
    let hinted = 0;
    for (let i = 0; i < wings.vertexCount; i++) {
      const h = [wings.hints[i * 3], wings.hints[i * 3 + 1], wings.hints[i * 3 + 2]];
      if (h[0] === 0 && h[1] === 0 && h[2] === 0) continue;
      hinted++;
      if (wings.normals[i * 3] * h[0] + wings.normals[i * 3 + 1] * h[1] + wings.normals[i * 3 + 2] * h[2] >= 0) agree++;
    }
    expect(hinted).toBeGreaterThan(500);
    expect(agree).toBe(hinted);
  });

  it('the whole falcon fits in the drone camera frame in every frame, and fills it', () => {
    const { sub, dot, cross, normalize } = vec3;
    const widths: number[] = [];
    let edge = 0;
    for (let f = 0; f < FALCON_DURATION * 30; f++) {
      const t = f / 30;
      falcon.pose(falconPose(t));
      const camera = droneCamera(t);
      const forward = normalize(sub(camera.target, camera.position));
      const right = normalize(cross(forward, [0, 1, 0]));
      const up = cross(right, forward);
      const tan = Math.tan((camera.fov * Math.PI) / 360);
      let min = Infinity;
      let max = -Infinity;
      for (const part of falcon.parts) {
        for (let i = 0; i < part.vertexCount; i++) {
          const d = sub([part.positions[i * 3], part.positions[i * 3 + 1], part.positions[i * 3 + 2]], camera.position);
          const z = dot(d, forward);
          const x = dot(d, right) / (z * tan * (16 / 9));
          const y = dot(d, up) / (z * tan);
          edge = Math.max(edge, Math.abs(x), Math.abs(y));
          min = Math.min(min, x);
          max = Math.max(max, x);
        }
      }
      widths.push((max - min) / 2);
    }
    // With a margin of 2 % of the half frame (and the drone's roll, hundredths of a radian).
    expect(edge).toBeLessThan(0.98);
    // Median width of the falcon in the frame: at least 1/6 (before the drone was tuned, 0.13).
    widths.sort((a, b) => a - b);
    expect(widths[Math.floor(widths.length / 2)]).toBeGreaterThan(1 / 6);
  }, 60_000);

  it('every edge is used by exactly two triangles (shells without holes)', () => {
    for (const part of falcon.parts) {
      const edges = new Map<string, number>();
      for (let i = 0; i < part.indices.length; i += 3) {
        for (let e = 0; e < 3; e++) {
          const a = part.indices[i + e];
          const b = part.indices[i + ((e + 1) % 3)];
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
      }
      for (const uses of edges.values()) expect(uses).toBe(2);
    }
  });
});
