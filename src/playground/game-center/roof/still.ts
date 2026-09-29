// Roof screen without WebGL2: a still image of the same canyon (same seed, same mirror) seen
// from the parapet, with the black hole in place of the moon, dithered on the CPU to the 16 colors.
import { readPalettes, type Rgb8 } from '../../../engine/display/palette';
import { hex, mix, quantize } from '../fallback';
import { buildTile, STREET_HALF, TILE } from '../rainrun/canyon';
import { COURSE_SEED } from '../rainrun/sim';
import { MOON } from './moon';

const FIELDS = ['#ff4b26', '#ffcc17', '#ff4fa0', '#1fd68a', '#2238e0', '#f2f4ff'];
const HAZE: Rgb8 = [255, 138, 31];

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function paintRoofStill(host: HTMLElement): void {
  const box = host.getBoundingClientRect();
  const scale = 3;
  const w = Math.max(96, Math.round(box.width / scale));
  const h = Math.max(48, Math.round(box.height / scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.className = 'roof__still';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const eye: V3 = [0, 58, 40];
  const f = norm(sub([0, 36, -120], eye));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const aspect = w / h;
  const fov = aspect < 1 ? 66 : aspect < 1.8 ? 54 : 44;
  const F = h / (2 * Math.tan((fov * Math.PI) / 360));
  const project = (p: V3): [number, number] => {
    const d = sub(p, eye);
    const z = Math.max(0.1, dot(d, f));
    return [w / 2 + (F * dot(d, r)) / z, h / 2 - (F * dot(d, u)) / z];
  };
  const fog = (p: V3) => 1 - Math.exp(-((dot(sub(p, eye), f) * 0.0042) ** 2));
  const quad = (pts: V3[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.map(project).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#1b1140');
  sky.addColorStop(0.45, '#9e1233');
  sky.addColorStop(0.75, '#ff4b26');
  sky.addColorStop(1, '#ff8a1f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Black hole in place of the moon.
  const mx = MOON.x * w;
  const my = MOON.y * h;
  const R = Math.max(4, h * 0.06);
  ctx.fillStyle = '#ff4b26';
  ctx.beginPath();
  ctx.ellipse(mx, my - R * 0.1, R * 1.55, R * 1.55, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ffcc17';
  ctx.beginPath();
  ctx.arc(mx, my, R * 1.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0718';
  ctx.beginPath();
  ctx.arc(mx, my, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8a1f';
  ctx.beginPath();
  ctx.ellipse(mx, my, R * 2.3, R * 0.8, -0.12, 0, Math.PI);
  ctx.ellipse(mx, my, R * 1.25, R * 0.44, -0.12, Math.PI, 0, true);
  ctx.fill();

  // Street.
  quad([[-STREET_HALF, 0, 20], [STREET_HALF, 0, 20], [STREET_HALF, 0, -TILE * 3], [-STREET_HALF, 0, -TILE * 3]], '#1b1140');

  const tile = buildTile(COURSE_SEED);
  const shade = hex('#2a1470');
  const roofShade = hex('#3a1c8c');
  type Item = { z: number; draw: () => void };
  const items: Item[] = [];
  // The canyon and the blocks behind it (the same geometry shifted and lower), as in the GL view.
  const blocks: [number, number][] = [[0, 1], [-19, 0.62], [19, 0.62], [-38, 0.42], [38, 0.42], [-57, 0.42], [57, 0.42]];
  for (let t = 0; t < 3; t++) for (const [dx, sy] of blocks) {
    const off = -t * TILE - (Math.abs(dx) % 38) * 0.5;
    for (const tw0 of tile.towers) {
      const tw = { ...tw0, x0: tw0.x0 + dx, x1: tw0.x1 + dx, y1: tw0.y1 * sy };
      const face = tw.side === -1 ? tw.x1 : tw.x0;
      const outer = tw.side === -1 ? tw.x0 : tw.x1;
      const z0 = tw.z0 + off;
      const z1 = tw.z1 + off;
      const mid: V3 = [face, tw.y1 / 2, (z0 + z1) / 2];
      items.push({
        z: z1,
        draw: () => {
          quad([[face, 0, z1], [face, 0, z0], [face, tw.y1, z0], [face, tw.y1, z1]], mix(shade, HAZE, fog(mid)));
          quad([[face, tw.y1, z1], [face, tw.y1, z0], [outer, tw.y1, z0], [outer, tw.y1, z1]], mix(roofShade, HAZE, fog(mid)));
          quad([[face, 0, z1], [outer, 0, z1], [outer, tw.y1, z1], [face, tw.y1, z1]], mix(shade, HAZE, fog(mid) * 0.8 + 0.1));
        },
      });
    }
    if (dx === 0) for (const s of tile.signs) {
      const z = s.z1 + off;
      items.push({
        z: z + 0.01,
        draw: () => quad([[s.x0, s.y0, z], [s.x1, s.y0, z], [s.x1, s.y1, z], [s.x0, s.y1, z]], mix(hex(FIELDS[s.style]), HAZE, fog([s.x0, s.y0, z]))),
      });
    }
  }
  items.sort((a, b) => a.z - b.z).forEach((item) => item.draw());

  // Rain in short strokes and the roof's parapet in the foreground.
  ctx.strokeStyle = '#9ea8f2';
  ctx.lineWidth = 1;
  let seed = 29;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < w * 0.8; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 1, y + 4);
    ctx.stroke();
  }
  quantize(ctx, w, h, readPalettes(document.documentElement).sixteen);
  host.append(canvas);
}
