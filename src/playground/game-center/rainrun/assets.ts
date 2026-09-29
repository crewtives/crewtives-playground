// Procedural materials for Rain Run: the sign atlas (real Japanese words in
// DotGothic16), the towers' window texture and the lofted air taxi. No model files.
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SIGN_STYLES, SIGN_WORDS } from './canyon';

/** Atlas cells: 16 columns × 5 rows of 64×192 px. */
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 5;
const CELL_W = 64;
const CELL_H = 192;

/** Field and ink of each sign style (the building's colors). */
const STYLES: [string, string][] = [
  ['#ff4b26', '#140a24'],
  ['#ffcc17', '#140a24'],
  ['#ff4fa0', '#140a24'],
  ['#1fd68a', '#140a24'],
  ['#2238e0', '#f2f4ff'],
  ['#f2f4ff', '#9e1233'],
];

/** Atlas cell for a word with a style. */
export function atlasCell(word: number, style: number): number {
  return (word * SIGN_STYLES + style) % (ATLAS_COLS * ATLAS_ROWS);
}

/** UV (u0, v0, u1, v1) of a cell, with v upward as in GL. */
export function atlasUv(cell: number): [number, number, number, number] {
  const col = cell % ATLAS_COLS;
  const row = Math.floor(cell / ATLAS_COLS);
  const w = ATLAS_COLS * CELL_W;
  const h = 1024;
  const u0 = (col * CELL_W + 2) / w;
  const u1 = ((col + 1) * CELL_W - 2) / w;
  const v1 = 1 - (row * CELL_H + 2) / h;
  const v0 = 1 - ((row + 1) * CELL_H - 2) / h;
  return [u0, v0, u1, v1];
}

/**
 * Waits for DotGothic16's Japanese face before drawing: otherwise, the canvas writes the signs
 * in a fallback font.
 */
export async function loadSignFont(): Promise<void> {
  try {
    await document.fonts.load('40px "DotGothic16"', SIGN_WORDS.join(''));
  } catch {
    // If loading fails, draw anyway: better a sign than none.
  }
}

export function buildSignAtlas(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * CELL_W;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#140a24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let word = 0; word < SIGN_WORDS.length; word++) {
    for (let style = 0; style < SIGN_STYLES; style++) {
      const cell = atlasCell(word, style);
      const x = (cell % ATLAS_COLS) * CELL_W;
      const y = Math.floor(cell / ATLAS_COLS) * CELL_H;
      const [field, ink] = STYLES[style];
      ctx.fillStyle = field;
      ctx.fillRect(x, y, CELL_W, CELL_H);
      // Ink frame and bulbs on the edge, like an acrylic sign.
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 5, y + 5, CELL_W - 10, CELL_H - 10);
      const chars = [...SIGN_WORDS[word]];
      const size = chars.length > 3 ? 34 : 40;
      ctx.font = `${size}px "DotGothic16"`;
      ctx.fillStyle = ink;
      const pitch = size + 2;
      const top = y + CELL_H / 2 - ((chars.length - 1) * pitch) / 2;
      chars.forEach((ch, i) => {
        // The long bar ー is turned vertical, as it is written in tate.
        if (ch === 'ー') {
          ctx.fillRect(x + CELL_W / 2 - 3, top + i * pitch - size * 0.34, 6, size * 0.68);
        } else {
          ctx.fillText(ch, x + CELL_W / 2, top + i * pitch + 1);
        }
      });
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** Tower windows: a grid of 16×16 cells with some of them lit. */
export function buildWindowTexture(): Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Black background: the texture is the emissive map (only the lit windows glow).
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  const lit = ['#ffcc17', '#ff8a1f', '#ff4fa0', '#d9deff'];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 16; gx++) {
      const r = rand();
      const color = r < 0.2 ? lit[Math.floor(rand() * lit.length)] : '#000000';
      ctx.fillStyle = color;
      ctx.fillRect(gx * 4 + 1, gy * 4 + 1, 2, 2);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function paint(geometry: BufferGeometry, color: Color): BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute('uv');
  const count = g.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Air taxi: a hexagonal section lofted over 7 stations along 4 units,
 * p_k = (a·s(z)·cos θ_k, b·s(z)·sin θ_k) with s(z) = sin(π·(z/L)^0.7), plus a half-icosahedron
 * cockpit and two hexagonal ducted fans. The nose points to −z. ~180 triangles.
 */
export function buildTaxiGeometry(): BufferGeometry {
  const L = 4;
  const a = 1.0;
  const b = 0.55;
  const stations = 7;
  const sodium = new Color('#ffcc17');
  const vermilion = new Color('#ff4b26');
  const belly = new Color('#2a1470');
  const positions: number[] = [];
  const colors: number[] = [];
  const ring = (j: number) => {
    const u = j / (stations - 1);
    const s = Math.sin(Math.PI * Math.pow(Math.max(u, 1e-4), 0.7));
    const z = -L / 2 + u * L;
    const pts: [number, number, number][] = [];
    for (let k = 0; k < 6; k++) {
      const t = (k * Math.PI) / 3;
      pts.push([a * s * Math.cos(t), b * s * Math.sin(t), z]);
    }
    return pts;
  };
  const rings = Array.from({ length: stations }, (_, j) => ring(j));
  for (let j = 0; j < stations - 1; j++) {
    const r0 = rings[j];
    const r1 = rings[j + 1];
    const middle = j === 2 || j === 3;
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      // Sodium roof (faces 0–2), violet ink belly (3–5) and a vermilion stripe along the sides.
      const top = k <= 2;
      const c = middle && (k === 0 || k === 2) ? vermilion : top ? sodium : belly;
      // Counterclockwise winding seen from outside: the normals point outward.
      for (const p of [r0[k], r1[k1], r1[k], r0[k], r0[k1], r1[k1]]) {
        positions.push(...p);
        colors.push(c.r, c.g, c.b);
      }
    }
  }
  const body = new BufferGeometry();
  body.setAttribute('position', new Float32BufferAttribute(positions, 3));
  body.setAttribute('color', new Float32BufferAttribute(colors, 3));
  body.computeVertexNormals();

  const canopy = new IcosahedronGeometry(0.55, 0);
  canopy.scale(0.9, 0.7, 1.3);
  canopy.translate(0, 0.32, -0.35);
  const fanL = new CylinderGeometry(0.5, 0.5, 0.34, 6, 1, true);
  fanL.translate(-1.3, 0.05, 0.35);
  const fanR = new CylinderGeometry(0.5, 0.5, 0.34, 6, 1, true);
  fanR.translate(1.3, 0.05, 0.35);
  const hubL = new CylinderGeometry(0.16, 0.16, 0.36, 6);
  hubL.translate(-1.3, 0.05, 0.35);
  const hubR = new CylinderGeometry(0.16, 0.16, 0.36, 6);
  hubR.translate(1.3, 0.05, 0.35);
  const lampL = new IcosahedronGeometry(0.12, 0);
  lampL.translate(-0.42, 0.05, -1.55);
  const lampR = new IcosahedronGeometry(0.12, 0);
  lampR.translate(0.42, 0.05, -1.55);
  const tail = new IcosahedronGeometry(0.13, 0);
  tail.translate(0, 0.12, 1.85);

  const merged = mergeGeometries([
    body,
    paint(canopy, new Color('#d9deff')),
    paint(fanL, new Color('#ff4b26')),
    paint(fanR, new Color('#ff4b26')),
    paint(hubL, new Color('#140a24')),
    paint(hubR, new Color('#140a24')),
    paint(lampL, new Color('#ffffff')),
    paint(lampR, new Color('#ffffff')),
    paint(tail, new Color('#ff4fa0')),
  ]);
  return merged ?? body;
}
