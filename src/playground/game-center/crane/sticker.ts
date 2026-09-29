// Studio sticker: an emblem with 6-fold symmetry (D6) drawn from the capsule's seed,
// r(θ) = 1 + 0.35·cos(6θ) + 0.15·cos(12θ + φ), in three colors of the building and die-cut in acrylic.
// The PNG carries its provenance in tEXt chunks, written when it is generated.
import { mulberry32 } from '../rng';
import { withTextChunks } from './png';

const INKS = ['#ff4b26', '#ffcc17', '#ff4fa0', '#1fd68a', '#2238e0', '#b04bff', '#33e1ff', '#9e1233'];

function emblemColors(seed: number): [string, string, string] {
  const rng = mulberry32(seed);
  const pick = () => INKS[Math.floor(rng() * INKS.length)];
  const a = pick();
  let b = pick();
  while (b === a) b = pick();
  let c = pick();
  while (c === a || c === b) c = pick();
  return [a, b, c];
}

function rosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, phi: number, scale: number): void {
  ctx.beginPath();
  for (let i = 0; i <= 360; i++) {
    const t = (i / 360) * Math.PI * 2;
    const r = radius * scale * (1 + 0.35 * Math.cos(6 * t) + 0.15 * Math.cos(12 * t + phi)) / 1.5;
    const x = cx + r * Math.sin(t);
    const y = cy - r * Math.cos(t);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draws the emblem of `seed` centered at (cx, cy). `dieCut` adds the sticker's die-cut border. */
export function drawEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, seed: number, dieCut: boolean): void {
  const phi = mulberry32(seed ^ 0x9e37)() * Math.PI * 2;
  const [a, b, c] = emblemColors(seed);
  ctx.save();
  ctx.lineJoin = 'round';
  if (dieCut) {
    rosette(ctx, cx, cy, radius, phi, 1.12);
    ctx.fillStyle = '#f2f4ff';
    ctx.fill();
    ctx.lineWidth = radius * 0.03;
    ctx.strokeStyle = '#140a24';
    ctx.stroke();
  }
  rosette(ctx, cx, cy, radius, phi, 1);
  ctx.fillStyle = a;
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.05);
  ctx.strokeStyle = '#140a24';
  ctx.stroke();
  rosette(ctx, cx, cy, radius, phi + Math.PI, 0.62);
  ctx.fillStyle = b;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Generates the sticker's 512 px PNG with its provenance (seed, origin, demo mark). */
export async function stickerPng(seed: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawEmblem(ctx, 256, 256, 210, seed, true);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const tagged = withTextChunks(bytes, {
    Title: `crewtives studio sticker ${seed}`,
    seed: String(seed),
    source: 'procedural: r(t) = 1 + 0.35 cos 6t + 0.15 cos(12t + phi), six-fold symmetry, drawn in the browser',
    Comment: 'crewtives playground demo build 0.1 · Game Center Yonjigen crane prize',
  });
  return new Blob([tagged.buffer as ArrayBuffer], { type: 'image/png' });
}

/** Emblem thumbnail for the ticket. */
export function emblemDataUrl(seed: number, size = 96): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawEmblem(ctx, size / 2, size / 2, size * 0.4, seed, true);
  return canvas.toDataURL('image/png');
}
