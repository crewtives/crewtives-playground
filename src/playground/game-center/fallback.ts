// Without WebGL2: the 1F CRT shows a still image of the same canyon (same hash, same mirror),
// projected in Canvas2D and dithered on the CPU to the palette's 16 colors (Bayer 8×8 in OKLab).
import { readPalettes, rgb8ToOklab, type Rgb8 } from '../../engine/display/palette';
import { buildTile, gateAt, GATE_BANNER, GATE_H, GATE_POST, GATE_W, STREET_HALF, TILE } from './rainrun/canyon';
import { COURSE_SEED } from './rainrun/sim';

const STYLE_FIELDS = ['#ff4b26', '#ffcc17', '#ff4fa0', '#1fd68a', '#2238e0', '#f2f4ff'];
const HAZE: Rgb8 = [255, 138, 31];

export function hex(c: string): Rgb8 {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

export function mix(a: Rgb8, b: Rgb8, t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Bayer 8×8 threshold in [0, 1) (the same order as the display shader). */
export function bayer8(x: number, y: number): number {
  const xy = (x ^ y) & 7;
  const yy = y & 7;
  const v = ((xy & 1) << 5) | ((yy & 1) << 4) | ((xy & 2) << 2) | ((yy & 2) << 1) | ((xy & 4) >> 1) | ((yy & 4) >> 2);
  return (v + 0.5) / 64;
}

/** Draws the still image into a new canvas inside `host`. */
export function paintFallbackStill(host: HTMLElement): void {
  const box = host.getBoundingClientRect();
  const scale = box.width < 500 ? 4 : 3;
  const w = Math.max(64, Math.round(box.width / scale));
  const h = Math.max(48, Math.round(box.height / scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.className = 'crt__still';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  // Sky: night, wine, vermilion and amber at the horizon.
  const horizon = h * 0.46;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#1b1140');
  sky.addColorStop(0.45, '#9e1233');
  sky.addColorStop(0.8, '#ff4b26');
  sky.addColorStop(1, '#ff8a1f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = '#1b1140';
  ctx.fillRect(0, horizon, w, h - horizon);

  // Chase camera behind the taxi.
  const cam = { y: 7.6, z: 7.5 };
  const f = h / (2 * Math.tan((60 * Math.PI) / 360));
  const project = (x: number, y: number, z: number): [number, number] => {
    const d = cam.z - z;
    return [w / 2 + (f * x) / d, horizon - (f * (y - cam.y + d * 0.08)) / d];
  };
  const fog = (z: number) => 1 - Math.exp(-(((cam.z - z) * 0.011) ** 2));
  const quad = (pts: [number, number][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };

  const tile = buildTile(COURSE_SEED);
  const shade: Rgb8 = hex('#2a1470');
  type Item = { z: number; draw: () => void };
  const items: Item[] = [];
  for (const t of [0, 1]) {
    const off = -t * TILE;
    for (const tower of tile.towers) {
      const face = tower.side === -1 ? tower.x1 : tower.x0;
      const z0 = tower.z0 + off;
      const z1 = tower.z1 + off;
      if (z1 > cam.z - 1) continue;
      items.push({
        z: z0,
        draw: () =>
          quad(
            [project(face, 0, z1), project(face, 0, z0), project(face, tower.y1, z0), project(face, tower.y1, z1)],
            mix(shade, HAZE, fog((z0 + z1) / 2)),
          ),
      });
    }
    for (const sign of tile.signs) {
      const z = sign.z1 + off;
      if (z > cam.z - 1) continue;
      items.push({
        z: z + 0.01,
        draw: () =>
          quad(
            [project(sign.x0, sign.y0, z), project(sign.x1, sign.y0, z), project(sign.x1, sign.y1, z), project(sign.x0, sign.y1, z)],
            mix(hex(STYLE_FIELDS[sign.style]), HAZE, fog(z)),
          ),
      });
    }
  }
  for (let k = 0; k < 6; k++) {
    const gate = gateAt(k, COURSE_SEED);
    const top = gate.y + GATE_H / 2;
    items.push({
      z: gate.z + 0.02,
      draw: () => {
        const c = fog(gate.z);
        quad([project(-STREET_HALF, top, gate.z), project(STREET_HALF, top, gate.z), project(STREET_HALF, top + GATE_BANNER, gate.z), project(-STREET_HALF, top + GATE_BANNER, gate.z)], mix(hex('#ff4fa0'), HAZE, c));
        for (const dir of [-1, 1]) {
          const x0 = gate.x + dir * (GATE_W / 2);
          const x1 = x0 + dir * GATE_POST;
          quad([project(x0, 0, gate.z), project(x1, 0, gate.z), project(x1, top, gate.z), project(x0, top, gate.z)], mix(hex('#ffcc17'), HAZE, c));
        }
      },
    });
  }
  items.sort((a, b) => a.z - b.z).forEach((item) => item.draw());

  // The taxi, seen from behind: sodium roof, vermilion fans.
  const [tx, ty] = project(0.6, 5.1, 0);
  const s = f / cam.z;
  quad([[tx - 1.0 * s, ty], [tx - 0.5 * s, ty - 0.5 * s], [tx + 0.5 * s, ty - 0.5 * s], [tx + 1.0 * s, ty], [tx + 0.5 * s, ty + 0.45 * s], [tx - 0.5 * s, ty + 0.45 * s]], '#ffcc17');
  quad([[tx - 1.0 * s, ty], [tx + 1.0 * s, ty], [tx + 0.5 * s, ty + 0.45 * s], [tx - 0.5 * s, ty + 0.45 * s]], '#2a1470');
  ctx.fillStyle = '#ff4b26';
  ctx.fillRect(tx - 1.8 * s, ty - 0.15 * s, 0.6 * s, 0.3 * s);
  ctx.fillRect(tx + 1.2 * s, ty - 0.15 * s, 0.6 * s, 0.3 * s);

  quantize(ctx, w, h, readPalettes(document.documentElement).sixteen);
  host.append(canvas);
}

/** Ordered 8×8 dither to the palette, nearest color in OKLab (like the display in 16 colors). */
export function quantize(ctx: CanvasRenderingContext2D, w: number, h: number, palette: Rgb8[]): void {
  const lab = palette.map((c) => rgb8ToOklab(c));
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const spread = 0.16 * 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const d = (bayer8(x, y) - 0.5) * spread;
      const c = rgb8ToOklab([clamp(data[i] + d), clamp(data[i + 1] + d), clamp(data[i + 2] + d)]);
      let best = 0;
      let bestD = Infinity;
      for (let p = 0; p < lab.length; p++) {
        const dl = c[0] - lab[p][0];
        const da = c[1] - lab[p][1];
        const db = c[2] - lab[p][2];
        const dist = dl * dl + da * da + db * db;
        if (dist < bestD) {
          bestD = dist;
          best = p;
        }
      }
      [data[i], data[i + 1], data[i + 2]] = palette[best];
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
