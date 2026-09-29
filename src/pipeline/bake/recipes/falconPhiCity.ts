import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
} from 'three';
import type { PackCamera } from '../../../engine/pack/format';
import type { PointSet } from '../../../engine/pack/writer';
import {
  FALCON_FPS,
  MAST,
  SPIRAL,
  TOWER,
  funnelY,
  goldenRectangles,
  perch,
  phyllotaxis,
  spiralPoint,
  spiralRadiusAt,
  spiralXZ,
  vec3,
  type Vec3,
} from '../../scenes/falconPhi';
import { environmentWriter, hash2, mix3, toSrgb8, valueNoise, type Rgb } from '../common';
import { smoothstep } from '../../scenes/math';
import { stream, type Random } from '../../scenes/random';

// A cyberpunk city at night for "falcon-phi" (D8): a wet stone plaza with an LED phyllotaxis disk
// in the floor, the central tower with its antenna mast and neon rings, an amphitheater of towers
// with window grids and magenta and cyan neon signs, fine rain, and a point hologram of the spiral
// and the golden rectangles resting on the flight funnel. A single lighting function serves both
// the source frame (baked textures) and the points.

const { add, sub, scale, dot, cross, normalize, length } = vec3;

// --- palette (linear) -----------------------------------------------------------------------------

export const MAGENTA: Rgb = [1.0, 0.07, 0.55];
export const CYAN: Rgb = [0.05, 0.85, 1.0];
const GOLD: Rgb = [1.0, 0.62, 0.16];
const WARM_WINDOW: Rgb = [1.0, 0.62, 0.3];
const COOL_WINDOW: Rgb = [0.62, 0.78, 1.0];
const TEAL_SCREEN: Rgb = [0.22, 0.95, 0.8];
const GREEN_SCREEN: Rgb = [0.25, 1.0, 0.42];
const SKY = new Color().setRGB(0.012, 0.009, 0.03);
/** Violet haze: it separates the depth planes of the city. */
export const HAZE = new Color().setRGB(0.016, 0.008, 0.03);

// --- light ------------------------------------------------------------------------------------------

export interface Lamp {
  position: Vec3;
  color: Rgb;
  power: number;
  radius: number;
  /** Pool of light on the wet floor (0: not reflected). */
  sheen?: number;
}

export interface Lighting {
  lamps: Lamp[];
  /** Cold glow of the overcast sky (from above). */
  sky: Rgb;
  /** Bounce light from the lit city (from below). */
  ground: Rgb;
  ambient: Rgb;
}

/** (Linear) irradiance at a point with normal n: ambient, sky, city bounce and lamps. */
export function irradiance(light: Lighting, p: Vec3, n: Vec3): Rgb {
  const up = n[1];
  const out: Rgb = [0, 0, 0];
  for (let c = 0; c < 3; c++) out[c] = light.ambient[c] + light.sky[c] * Math.max(0, up) + light.ground[c] * Math.max(0, -up);
  for (const lamp of light.lamps) {
    const dx = lamp.position[0] - p[0];
    const dy = lamp.position[1] - p[1];
    const dz = lamp.position[2] - p[2];
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    const facing = (n[0] * dx + n[1] * dy + n[2] * dz) / d;
    if (facing <= 0) continue;
    const k = (lamp.power * facing) / (1 + (d / lamp.radius) ** 2);
    for (let c = 0; c < 3; c++) out[c] += lamp.color[c] * k;
  }
  return out;
}

// --- surfaces --------------------------------------------------------------------------------------

export interface Surface {
  origin: Vec3;
  u: Vec3;
  v: Vec3;
  width: number;
  height: number;
  normal: Vec3;
  albedo: (s: number, t: number) => Rgb;
  emissive?: (s: number, t: number) => Rgb | null;
  /** Wetness (0–1): puddles that reflect the lights. */
  wet?: (s: number, t: number) => number;
  /** Probability of keeping a point (dark, plain areas get fewer points than bright ones). */
  keep?: (s: number, t: number) => number;
  /** Point density multiplier. */
  density: number;
  /** Pixels per meter of the source-frame texture. */
  texture: number;
}

interface Tower {
  center: [number, number];
  /** Height of the block's base (0 at ground level; higher for a setback crown). */
  base: number;
  /** Half width (front) and half depth. */
  half: [number, number];
  height: number;
  /** Heading of the front (toward the plaza). */
  yaw: number;
  seed: number;
  palette: Rgb[];
  lit: number;
  strips: Rgb | null;
  crown: Rgb | null;
}

interface Sign {
  center: Vec3;
  right: Vec3;
  up: Vec3;
  normal: Vec3;
  width: number;
  height: number;
  color: Rgb;
  seed: number;
  kind: 'vertical' | 'board' | 'lightbox' | 'phi';
  /** Glyphs stacked (column) or in a row. */
  vertical: boolean;
}

/** Plaza radius (the amphitheater of towers starts a little farther out). */
const PLAZA_RADIUS = 21;
/** Phyllotaxis disk: Vogel's c (m) and seeds. */
const SEED_C = 0.36;
const SEED_FIRST = 75;
const SEED_LAST = 1100;
/** Hologram: how far below the flight the spiral guide runs over the funnel. */
const HOLO_DROP = 0.42;
/**
 * Height of the golden diagram's plane: just above the central tower's rooftop, with the eye at the
 * mast. Flat (not resting on the funnel) so the rectangles read as rectangles from any angle, with
 * the flight spiral floating above its own plan.
 */
const DIAGRAM_Y = TOWER.height + 0.4;

export interface City {
  lighting: Lighting;
  surfaces: Surface[];
  towers: Tower[];
  signs: Sign[];
  /** Source-frame meshes. */
  meshes: Group;
  /** Source-frame rain (it moves over time). */
  rain: LineSegments;
}

// --- assembly ------------------------------------------------------------------------------------------

export function buildCity(seed: number): City {
  const random = stream(seed, 'falcon:city');
  const towers = layoutTowers(random);
  const signs = layoutSigns(random, towers);
  const lighting = buildLighting(towers, signs);
  const surfaces: Surface[] = [];
  const glows: FacadeGlow[] = [];
  groundSurfaces(surfaces, glows);
  for (const tower of towers) towerSurfaces(surfaces, tower, glows);
  for (const sign of signs) {
    for (const glow of glows) {
      const d = sub(sign.center, glow.front);
      if (Math.abs(dot(d, glow.out)) > 1.5 || Math.abs(dot(d, glow.along)) > glow.half + 0.5) continue;
      const lateral = dot(d, glow.along);
      glow.signs.push({ from: lateral - sign.width / 2, to: lateral + sign.width / 2, color: scale3(sign.color, Math.min(1, 12 / sign.center[1])) });
    }
  }
  centralTowerSurfaces(surfaces);
  for (const sign of signs) surfaces.push(signSurface(sign));
  const meshes = new Group();
  for (const surface of surfaces) meshes.add(surfaceMesh(surface, lighting));
  meshes.add(skyDome());
  meshes.add(propMeshes(lighting));
  meshes.add(hologramLines());
  const rain = rainLines();
  meshes.add(rain);
  return { lighting, surfaces, towers, signs, meshes, rain };
}

function layoutTowers(random: Random): Tower[] {
  const towers: Tower[] = [];
  const palettes: Rgb[][] = [
    [WARM_WINDOW, WARM_WINDOW, COOL_WINDOW],
    [COOL_WINDOW, TEAL_SCREEN, COOL_WINDOW],
    [WARM_WINDOW, MAGENTA, COOL_WINDOW],
    [WARM_WINDOW, COOL_WINDOW, GREEN_SCREEN, WARM_WINDOW],
  ];
  const ring = (count: number, distance: [number, number], height: [number, number], width: [number, number], phase: number) => {
    for (let i = 0; i < count; i++) {
      const angle = phase + ((i + 0.3 * (random() - 0.5)) / count) * Math.PI * 2;
      const halfWidth = width[0] + random() * (width[1] - width[0]);
      const halfDepth = 3.5 + random() * 2.5;
      const face = distance[0] + random() * (distance[1] - distance[0]);
      const r = face + halfDepth;
      const tower: Tower = {
        center: [Math.cos(angle) * r, Math.sin(angle) * r],
        base: 0,
        half: [halfWidth, halfDepth],
        height: height[0] + random() * (height[1] - height[0]),
        yaw: angle + Math.PI,
        seed: Math.floor(random() * 1e6),
        palette: palettes[Math.floor(random() * palettes.length)],
        lit: 0.2 + random() * 0.2,
        strips: random() < 0.55 ? (random() < 0.5 ? CYAN : MAGENTA) : null,
        crown: random() < 0.45 ? (random() < 0.5 ? CYAN : MAGENTA) : null,
      };
      towers.push(tower);
      // A setback crown on some towers: a narrower block on top.
      if (random() < 0.45) {
        const inset = 1 + random() * 1.2;
        towers.push({
          ...tower,
          base: tower.height,
          half: [Math.max(1.5, tower.half[0] - inset), Math.max(1.5, tower.half[1] - inset)],
          center: [tower.center[0] - Math.cos(tower.yaw) * 0, tower.center[1]],
          height: 5 + random() * 9,
          seed: tower.seed + 17,
          crown: random() < 0.7 ? (random() < 0.5 ? CYAN : MAGENTA) : null,
        });
      }
    }
  };
  ring(11, [23, 26], [24, 48], [3.2, 4.6], 0.12);
  ring(13, [36, 42], [34, 58], [3.5, 5.5], 0.3);
  return towers;
}

/** Frame of a tower: origin of the front and axes (u along the front, n outward). */
function towerFrame(tower: Tower): { front: Vec3; along: Vec3; out: Vec3 } {
  const out: Vec3 = [Math.cos(tower.yaw), 0, Math.sin(tower.yaw)];
  const along = normalize(cross([0, 1, 0], out));
  const front: Vec3 = [tower.center[0] + out[0] * tower.half[1], tower.base, tower.center[1] + out[2] * tower.half[1]];
  return { front, along, out };
}

function layoutSigns(random: Random, towers: Tower[]): Sign[] {
  const signs: Sign[] = [];
  towers.forEach((tower, index) => {
    if (tower.base > 0) return;
    const { front, along, out } = towerFrame(tower);
    const inner = Math.hypot(...tower.center) < 34;
    const count = inner ? 2 + Math.floor(random() * 2) : random() < 0.6 ? 1 : 0;
    const placed: [number, number, number, number][] = [];
    for (let k = 0; k < count; k++) {
      const vertical = random() < 0.55;
      const width = vertical ? 1.1 + random() * 0.5 : 4 + random() * 3;
      const height = vertical ? 4.5 + random() * 4 : 1.6 + random() * 1.2;
      const s = (random() * 2 - 1) * Math.max(0, tower.half[0] - width / 2 - 0.4);
      const y = 5 + random() * Math.max(2, tower.height - height - 8);
      const center = add(add(front, scale(along, s)), add([0, y + height / 2, 0], scale(out, vertical ? 0.9 : 0.25)));
      const color = random() < 0.5 ? MAGENTA : CYAN;
      // No overlapping signs on the same front.
      const box: [number, number, number, number] = [s - width / 2 - 0.5, s + width / 2 + 0.5, y - 0.5, y + height + 0.5];
      if (placed.some((b) => b[0] < box[1] && box[0] < b[1] && b[2] < box[3] && box[2] < b[3])) continue;
      placed.push(box);
      const right = scale(along, -1);
      const kind = random() < 0.4 ? 'lightbox' : vertical ? 'vertical' : 'board';
      signs.push({ center, right, up: [0, 1, 0], normal: out, width, height, color, seed: Math.floor(random() * 1e6), kind, vertical });
    }
    // The big golden-ratio sign, on the tower closest to the start of the flight.
    if (index === 5) {
      const center = add(front, add([0, 17, 0], scale(out, 0.3)));
      signs.push({ center, right: scale(along, -1), up: [0, 1, 0], normal: out, width: 6.2, height: 3.8, color: GOLD, seed: 7, kind: 'phi', vertical: false });
    }
  });
  return signs;
}

function buildLighting(towers: Tower[], signs: Sign[]): Lighting {
  const lamps: Lamp[] = [];
  for (const sign of signs) {
    const area = sign.width * sign.height;
    lamps.push({ position: add(sign.center, scale(sign.normal, 1.2)), color: sign.color, power: 0.16 * Math.sqrt(area), radius: 5.5, sheen: 0.05 });
  }
  // Glow of the windows of each front that faces the plaza.
  for (const tower of towers) {
    if (tower.base > 0 || Math.hypot(...tower.center) > 34) continue;
    const { front, out } = towerFrame(tower);
    const glow = tower.palette[0];
    lamps.push({ position: add(front, add([0, Math.min(tower.height * 0.55, 26), 0], scale(out, 4))), color: glow, power: 0.1, radius: 9 });
  }
  // Neon lights of the mast and the antenna bar.
  for (const [y, color] of MAST_RINGS) lamps.push({ position: [0, y, 0], color, power: 0.55, radius: 1.6 });
  const p = perch();
  const barMid = add(p.bar, scale(p.barDirection, -0.2));
  lamps.push({ position: add(barMid, [0, -0.09, 0]), color: MAGENTA, power: 0.34, radius: 0.55 });
  lamps.push({ position: [0, MAST.top + 0.2, 0], color: [1, 0.12, 0.08], power: 0.5, radius: 1.2 });
  // Plaza street lamps: warm pools on the wet floor.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    lamps.push({ position: [Math.cos(a) * 15.5, 4.2, Math.sin(a) * 15.5], color: i % 2 ? WARM_WINDOW : COOL_WINDOW, power: 0.5, radius: 3.2, sheen: 0.12 });
  }
  return {
    lamps,
    sky: [0.035, 0.04, 0.085],
    ground: [0.07, 0.035, 0.06],
    ambient: [0.012, 0.012, 0.024],
  };
}

/** Neon rings of the mast: [height, color]. */
const MAST_RINGS: [number, Rgb][] = [
  [MAST.bottom + 5.6, CYAN],
  [MAST.bottom + 8.9, MAGENTA],
  [MAST.bottom + 11.8, CYAN],
];
const MAST_RING_RADIUS = 0.42;

// --- floor ----------------------------------------------------------------------------------------------

/** Puddles: 1 where the floor is waterlogged. */
function puddle(x: number, z: number): number {
  return smoothstep(0.6, 0.7, valueNoise(x * 0.35 + 3.3, z * 0.35 - 1.2) * 0.7 + valueNoise(x * 1.3, z * 1.3) * 0.3);
}

/** Seeds of the phyllotaxis disk within a cell: LED brightness (0–1) at (x, z). */
function seedGlow(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r < 2.9 || r > SEED_C * Math.sqrt(SEED_LAST) + 0.4) return 0;
  // Nearby seeds: k ≈ (r/c)²; a neighborhood of indices is checked.
  const k0 = Math.round((r / SEED_C) ** 2);
  let best = 0;
  for (let k = Math.max(SEED_FIRST, k0 - 40); k <= Math.min(SEED_LAST, k0 + 40); k++) {
    const [sx, sz] = phyllotaxis(k, SEED_C);
    const d = Math.hypot(sx - x, sz - z);
    const size = 0.12 + 0.07 * (k / SEED_LAST);
    if (d < size) best = Math.max(best, 1 - smoothstep(size * 0.55, size, d));
  }
  return best;
}

function seedColor(r: number): Rgb {
  // From warm white at the center to gold and to magenta at the edge.
  const outer = SEED_C * Math.sqrt(SEED_LAST);
  const k = smoothstep(2.9, outer, r);
  return mix3(mix3([1.0, 0.85, 0.55], GOLD, smoothstep(0, 0.55, k)), MAGENTA, smoothstep(0.7, 1, k)) as Rgb;
}

function groundAlbedo(x: number, z: number): Rgb {
  const r = Math.hypot(x, z);
  if (r < PLAZA_RADIUS) {
    // Dark stone slabs with joints; rings of the disk.
    const tile = 1.2;
    const joint = Math.min(Math.abs(((x / tile) % 1 + 1) % 1 - 0.5), Math.abs(((z / tile) % 1 + 1) % 1 - 0.5)) > 0.47 ? 0.6 : 1;
    const g = 0.03 * (0.8 + 0.4 * hash2(Math.floor(x / tile), Math.floor(z / tile))) * joint * (0.85 + 0.3 * valueNoise(x * 2, z * 2)) * (1 - 0.5 * puddle(x, z));
    const rim = Math.abs(r - PLAZA_RADIUS + 0.4) < 0.25 ? 2.2 : 1;
    return [g * rim, g * rim, g * 1.1 * rim];
  }
  // Asphalt with lane stripes on the radial streets.
  const grain = 0.75 + 0.5 * valueNoise(x * 3.1, z * 3.1);
  const g = 0.022 * grain * (1 - 0.5 * puddle(x, z));
  const angle = Math.atan2(z, x);
  const lane = Math.abs(Math.sin(angle * 11)) < 0.012 && Math.floor(r / 2) % 2 === 0 ? 5 : 1;
  return [g * lane, g * lane, g * 1.08 * lane];
}

function groundSurfaces(surfaces: Surface[], glows: FacadeGlow[]): void {
  const tiles: [number, number, number, number, number][] = [];
  const inner = 13;
  const outer = 55;
  // A center with a fine texture (the seed disk) and eight coarser outer pieces.
  tiles.push([-inner, -inner, inner, inner, 36]);
  for (const [x0, x1] of [
    [-outer, -inner],
    [-inner, inner],
    [inner, outer],
  ]) {
    for (const [z0, z1] of [
      [-outer, -inner],
      [-inner, inner],
      [inner, outer],
    ]) {
      if (x0 === -inner && z0 === -inner) continue;
      tiles.push([x0, z0, x1, z1, 7]);
    }
  }
  for (const [x0, z0, x1, z1, texture] of tiles) {
    surfaces.push({
      origin: [x0, 0, z1],
      u: [1, 0, 0],
      v: [0, 0, -1],
      width: x1 - x0,
      height: z1 - z0,
      normal: [0, 1, 0],
      albedo: (s, t) => groundAlbedo(x0 + s, z1 - t),
      emissive: (s, t) => {
        const x = x0 + s;
        const z = z1 - t;
        const glow = seedGlow(x, z);
        if (!glow) return reflection(glows, x, z);
        const c = seedColor(Math.hypot(x, z));
        return [c[0] * 1.3 * glow, c[1] * 1.3 * glow, c[2] * 1.3 * glow];
      },
      wet: (s, t) => 0.15 + 0.85 * puddle(x0 + s, z1 - t),
      keep: (s, t) => (Math.hypot(x0 + s, z1 - t) > 30 ? 0.35 : 0.8),
      density: texture > 10 ? 1.2 : 0.7,
      texture,
    });
  }
}

interface FacadeGlow {
  front: Vec3;
  along: Vec3;
  out: Vec3;
  half: number;
  /** Mean light of each column of windows (from +half to −half along the front). */
  columns: Rgb[];
  /** Signs on the front: lateral range (m, along `along`) and color. */
  signs: { from: number; to: number; color: Rgb }[];
}

/**
 * Reflection of the city on the wet floor: each column of lit windows and each sign leave a trail
 * running from the foot of the wall toward the plaza (that is how reflections look from inside the plaza).
 */
function reflection(glows: FacadeGlow[], x: number, z: number): Rgb | null {
  let out: Rgb | null = null;
  const wet = 0.3 + 0.7 * puddle(x, z);
  for (const glow of glows) {
    const d: Vec3 = [x - glow.front[0], 0, z - glow.front[2]];
    const away = dot(d, glow.out);
    if (away < 0 || away > 16) continue;
    const lateral = dot(d, glow.along);
    if (Math.abs(lateral) > glow.half + 3) continue;
    const fade = Math.exp(-away / 4.5);
    // The trails widen a little as they move away from the wall.
    const blur = 0.15 + 0.05 * away;
    const s = glow.half - lateral;
    const bay = Math.floor(s / BAY);
    const inBay = s - bay * BAY;
    const column = bay >= 0 && bay < glow.columns.length ? glow.columns[bay] : null;
    const edge = smoothstep(0, blur, inBay) * smoothstep(0, blur, BAY - inBay);
    out ??= [0, 0, 0];
    if (column) for (let c = 0; c < 3; c++) out[c] += column[c] * 0.3 * fade * edge * wet;
    for (const sign of glow.signs) {
      const inside = smoothstep(sign.from - blur, sign.from + blur, lateral) * (1 - smoothstep(sign.to - blur, sign.to + blur, lateral));
      if (inside > 0) for (let c = 0; c < 3; c++) out[c] += sign.color[c] * 0.22 * Math.exp(-away / 6) * inside * wet;
    }
  }
  return out;
}

// --- towers ------------------------------------------------------------------------------------------------

const FLOOR = 3.0;
const BAY = 1.25;

function windowLight(tower: Tower, s: number, t: number, width: number): { lit: Rgb | null; frame: boolean; glass: boolean } {
  const floor = Math.floor((t - 0.9) / FLOOR);
  const bay = Math.floor(s / BAY);
  const fs = s - bay * BAY;
  const ft = t - 0.9 - floor * FLOOR;
  const glass = floor >= 0 && fs > 0.09 && fs < BAY - 0.09 && ft > 0.45 && ft < FLOOR - 0.3 && s > 0.4 && s < width - 0.4 && t < tower.height - 1.0;
  const frame = !glass && fs > 0.05 && fs < BAY - 0.05 && ft > 0.4 && ft < FLOOR - 0.25;
  if (!glass) return { lit: null, frame, glass };
  // Whole floors dark and offices lit in strips: the grid reads as texture.
  const floorOn = hash2(tower.seed * 0.37 + floor, 3.3) < 0.8;
  const h = hash2(tower.seed + Math.floor(bay / 3) * 3.1 + bay * 0.13, floor * 7.7);
  if (!floorOn || h > tower.lit) return { lit: null, frame, glass };
  const color = tower.palette[Math.floor(hash2(floor, bay + tower.seed) * tower.palette.length)];
  const bright = hash2(bay + 13, floor + tower.seed);
  const k = bright > 0.94 ? 1.0 : 0.1 + 0.32 * bright * bright;
  // Interior: more light at the top (the lit ceiling) and, in some, blinds half lowered.
  const inside = 0.55 + 0.45 * (ft - 0.45) / (FLOOR - 0.75);
  const blinds = hash2(bay * 1.7, floor + 5) < 0.35 && (ft * 9) % 1 < 0.35 ? 0.45 : 1;
  const m = k * inside * blinds;
  return { lit: [color[0] * m, color[1] * m, color[2] * m], frame, glass };
}

function towerSurfaces(surfaces: Surface[], tower: Tower, glows: FacadeGlow[]): void {
  const { front, along, out } = towerFrame(tower);
  const back = scale(out, -1);
  const [hw, hd] = tower.half;
  const plazaFacing = Math.hypot(...tower.center) < 34;
  // Four faces: front, sides and back. The front gets more detail and more points.
  const faces: { origin: Vec3; u: Vec3; normal: Vec3; width: number; main: boolean }[] = [
    { origin: add(front, scale(along, hw)), u: scale(along, -1), normal: out, width: 2 * hw, main: true },
    { origin: add(add(front, scale(along, -hw)), [0, 0, 0]), u: back, normal: scale(along, -1), width: 2 * hd, main: false },
    { origin: add(add(front, scale(along, hw)), scale(back, 2 * hd)), u: out, normal: along, width: 2 * hd, main: false },
    { origin: add(add(front, scale(along, -hw)), scale(back, 2 * hd)), u: along, normal: back, width: 2 * hw, main: false },
  ];
  faces.forEach((face, k) => {
    const lit = (s: number, t: number) => windowLight({ ...tower, seed: tower.seed + k * 101 }, s, t, face.width);
    surfaces.push({
      origin: face.origin,
      u: face.u,
      v: [0, 1, 0],
      width: face.width,
      height: tower.height,
      normal: face.normal,
      albedo: (s, t) => {
        const w = lit(s, t);
        if (w.glass) return w.lit ? [0.04, 0.035, 0.03] : [0.012, 0.016, 0.024];
        const n = 0.8 + 0.4 * valueNoise(s * 0.7 + tower.seed, t * 0.3);
        const g = (w.frame ? 0.012 : 0.022) * n;
        return [g, g * 1.02, g * 1.15];
      },
      emissive: (s, t) => {
        const edge = Math.min(s, face.width - s);
        if (tower.strips && edge < 0.12 && t < tower.height - 0.2) return scale3(tower.strips, 1.2);
        if (tower.crown && t > tower.height - 0.35) return scale3(tower.crown, 1.4);
        // Ground floor: lit shop windows.
        if (tower.base === 0 && t > 0.5 && t < 3.0 && Math.abs(((s / 4.5) % 1) - 0.5) < 0.42 && (s % 1.5) > 0.08) return scale3(tower.palette[(k + Math.floor(s / 4.5)) % tower.palette.length], 0.07 + 0.08 * hash2(Math.floor(s / 4.5), tower.seed));
        const w = lit(s, t);
        if (w.lit) return w.lit;
        if (w.glass) {
          // Dark glass reflecting the violet glow of the sky, lighter toward the top.
          const g = 0.002 + 0.006 * smoothstep(0.35, 1, valueNoise(s * 0.3 + k, t * 0.12)) + 0.003 * (t / tower.height);
          return [g * 0.8, g * 0.55, g * 1.3];
        }
        return null;
      },
      keep: (s, t) => {
        const w = lit(s, t);
        return w.lit ? 1 : w.glass ? 0.35 : 0.3;
      },
      density: face.main && plazaFacing ? 1 : 0.35,
      texture: face.main && plazaFacing ? 14 : 6,
    });
    if (face.main && plazaFacing && tower.base === 0) {
      // Mean light per column: the lit windows of all floors are averaged.
      const columns: Rgb[] = [];
      for (let bay = 0; bay * BAY < face.width; bay++) {
        const sum: Rgb = [0, 0, 0];
        let floors = 0;
        for (let t = 0.9 + FLOOR / 2; t < tower.height; t += FLOOR, floors++) {
          const w = lit((bay + 0.5) * BAY, t);
          if (w.lit) for (let c = 0; c < 3; c++) sum[c] += w.lit[c];
        }
        columns.push(scale3(sum, 1 / Math.max(1, floors)));
      }
      glows.push({ front, along, out, half: hw, columns, signs: [] });
    }
  });
  // Roof.
  surfaces.push({
    origin: add(add(front, scale(along, hw)), [0, tower.height, 0]),
    u: scale(along, -1),
    v: back,
    width: 2 * hw,
    height: 2 * hd,
    normal: [0, 1, 0],
    albedo: (s, t) => {
      const g = 0.035 * (0.8 + 0.4 * valueNoise(s, t));
      return [g, g, g * 1.1];
    },
    emissive: (s, t) => {
      if (!tower.crown) return null;
      const edge = Math.min(s, 2 * hw - s, t, 2 * hd - t);
      return edge < 0.12 ? scale3(tower.crown, 1.3) : null;
    },
    keep: () => 0.5,
    density: 0.5,
    texture: 6,
  });
}

function scale3(c: Rgb, k: number): Rgb {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Octagonal central tower: glass bands per floor and cyan LED edges. */
function centralTowerSurfaces(surfaces: Surface[]): void {
  const R = TOWER.radius;
  for (let i = 0; i < 8; i++) {
    const a0 = ((i - 0.5) / 8) * Math.PI * 2;
    const a1 = ((i + 0.5) / 8) * Math.PI * 2;
    const p0: Vec3 = [Math.cos(a0) * R, 0, Math.sin(a0) * R];
    const p1: Vec3 = [Math.cos(a1) * R, 0, Math.sin(a1) * R];
    const width = length(sub(p1, p0));
    const u = normalize(sub(p1, p0));
    const mid = (a0 + a1) / 2;
    const normal: Vec3 = [Math.cos(mid), 0, Math.sin(mid)];
    surfaces.push({
      origin: p0,
      u,
      v: [0, 1, 0],
      width,
      height: TOWER.height,
      normal,
      albedo: () => [0.02, 0.024, 0.034],
      emissive: (s, t) => {
        if (s < 0.07 || s > width - 0.07) return scale3(CYAN, 1.2);
        const ft = (t % 3) / 3;
        if (ft > 0.93) return scale3(CYAN, 0.35);
        if (t > 11.6) return scale3(MAGENTA, 1.1);
        const lit = hash2(i * 7 + Math.floor(s / 0.5), Math.floor(t / 3)) < 0.55;
        return lit && ft > 0.2 && ft < 0.8 ? scale3(COOL_WINDOW, 0.35 + 0.3 * hash2(i, Math.floor(t / 3))) : null;
      },
      keep: () => 0.8,
      density: 1.4,
      texture: 24,
    });
  }
  // Roof (a square inscribed in the octagon); the rest of the octagon is covered by the prop mesh.
  const half = R * Math.cos(Math.PI / 8);
  surfaces.push({
    origin: [-half, TOWER.height, half],
    u: [1, 0, 0],
    v: [0, 0, -1],
    width: 2 * half,
    height: 2 * half,
    normal: [0, 1, 0],
    albedo: (s, t) => {
      const g = 0.03 * (0.85 + 0.3 * valueNoise(s * 3, t * 3));
      return [g, g, g * 1.15];
    },
    emissive: (s, t) => {
      const r = Math.hypot(s - half, t - half);
      return Math.abs(r - 1.2) < 0.04 ? scale3(CYAN, 0.9) : null;
    },
    wet: () => 0.6,
    density: 3,
    texture: 40,
  });
}

// --- signs ------------------------------------------------------------------------------------------------------

/** Strokes of a glyph on a 3×5 grid (segments between neighboring nodes), by seed. */
function glyphStrokes(seed: number): [number, number, number, number][] {
  const strokes: [number, number, number, number][] = [];
  const random = stream(seed, 'glyph');
  const count = 3 + Math.floor(random() * 3);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * 3);
    const y = Math.floor(random() * 5);
    const dir = Math.floor(random() * 3);
    const len = 1 + Math.floor(random() * 2);
    const [dx, dy] = dir === 0 ? [1, 0] : dir === 1 ? [0, 1] : [1, 1];
    strokes.push([x, y, Math.min(2, x + dx * len), Math.min(4, y + dy * len)]);
  }
  return strokes;
}

function segmentDistance(px: number, py: number, s: [number, number, number, number]): number {
  const [ax, ay, bx, by] = s;
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - ax - vx * t, py - ay - vy * t);
}

/** 1 on one of the sign's neon tubes at (s, t) meters. */
function signTube(sign: Sign, s: number, t: number): number {
  const tube = 0.06;
  const frame = Math.min(s, sign.width - s, t, sign.height - t);
  if (frame < tube) return sign.kind === 'lightbox' ? 1 : 0.45;
  if (sign.kind === 'phi') return phiSign(sign, s, t);
  // Column (or row) of glyphs.
  const vertical = sign.vertical;
  const cell = vertical ? sign.width - 0.3 : sign.height - 0.3;
  const glyphH = cell * 1.5;
  const glyphW = cell * 0.85;
  const local = vertical ? { a: s - 0.15, b: sign.height - 0.2 - t } : { a: s - 0.2, b: sign.height - 0.15 - t };
  const index = vertical ? Math.floor(local.b / (glyphH + 0.25)) : Math.floor(local.a / (glyphW + 0.3));
  const along = vertical ? local.b - index * (glyphH + 0.25) : local.a - index * (glyphW + 0.3);
  const across = vertical ? local.a : local.b;
  const gx = vertical ? (across / glyphW) * 2 : (along / glyphW) * 2;
  const gy = vertical ? (along / glyphH) * 4 : (across / glyphH) * 4;
  if (gx < -0.2 || gx > 2.2 || gy < -0.2 || gy > 4.2 || index < 0) return 0;
  const strokes = glyphStrokes(sign.seed + index * 31);
  const scaleM = glyphW / 2;
  for (const stroke of strokes) if (segmentDistance(gx, gy, stroke) * scaleM < tube * 0.9) return 1;
  return 0;
}

/** The golden sign: a spiral inside its rectangles and the caption "φ 1.618" in seven segments. */
function phiSign(sign: Sign, s: number, t: number): number {
  const tube = 0.055;
  const h = sign.height - 0.5;
  const w = h * 1.618;
  const x = s - 0.25;
  const y = t - 0.25;
  if (x >= 0 && x <= w && y >= 0 && y <= h) {
    // Square divisions and a spiral of quarter-circle arcs (the Fibonacci construction).
    let rx = 0;
    let ry = 0;
    let rw = w;
    let rh = h;
    for (let k = 0; k < 6; k++) {
      const side = Math.min(rw, rh);
      let cx = 0;
      let cy = 0;
      const dir = k % 4;
      if (dir === 0) {
        if (Math.abs(x - (rx + side)) < tube && y >= ry && y <= ry + rh) return 1;
        cx = rx + side;
        cy = ry;
        if (x >= rx && x <= rx + side && y >= ry && y <= ry + side && Math.abs(Math.hypot(x - cx, y - cy) - side) < tube) return 1;
        rx += side;
        rw -= side;
      } else if (dir === 1) {
        if (Math.abs(y - (ry + rh - side)) < tube && x >= rx && x <= rx + rw) return 1;
        cx = rx;
        cy = ry + rh - side;
        if (x >= rx && x <= rx + side && y >= ry + rh - side && Math.abs(Math.hypot(x - cx, y - cy) - side) < tube) return 1;
        rh -= side;
      } else if (dir === 2) {
        if (Math.abs(x - (rx + rw - side)) < tube && y >= ry && y <= ry + rh) return 1;
        cx = rx + rw - side;
        cy = ry + rh;
        if (x >= rx + rw - side && y <= ry + rh && Math.abs(Math.hypot(x - cx, y - cy) - side) < tube) return 1;
        rw -= side;
      } else {
        if (Math.abs(y - (ry + side)) < tube && x >= rx && x <= rx + rw) return 1;
        cx = rx + rw;
        cy = ry + side;
        if (x >= rx + rw - side && y <= ry + side && Math.abs(Math.hypot(x - cx, y - cy) - side) < tube) return 1;
        ry += side;
        rh -= side;
      }
    }
  }
  return 0;
}

function signSurface(sign: Sign): Surface {
  const origin = sub(sub(sign.center, scale(sign.right, sign.width / 2)), scale(sign.up, sign.height / 2));
  const lightbox = sign.kind === 'lightbox';
  return {
    origin,
    u: sign.right,
    v: sign.up,
    width: sign.width,
    height: sign.height,
    normal: sign.normal,
    albedo: () => [0.02, 0.012, 0.02],
    emissive: (s, t) => {
      const tube = signTube(sign, s, t);
      if (lightbox) {
        // Lightbox: a lit panel with the glyphs cut out in dark and a brighter edge.
        const edge = Math.min(s, sign.width - s, t, sign.height - t);
        if (edge < 0.06) return scale3(sign.color, 1.8);
        const gradient = 0.75 + 0.25 * (t / sign.height);
        return tube ? scale3(sign.color, 0.05) : scale3(sign.color, 0.6 * gradient);
      }
      if (tube) return scale3(sign.color, 2.2 * tube);
      return scale3(sign.color, 0.035);
    },
    keep: (s, t) => (lightbox || signTube(sign, s, t) ? 1 : 0.12),
    density: 9,
    texture: 48,
  };
}

// --- source-frame meshes ----------------------------------------------------------------------------------------

function litSurface(surface: Surface, light: Lighting, s: number, t: number, p: Vec3): Rgb {
  const a = surface.albedo(s, t);
  const e = irradiance(light, p, surface.normal);
  const out: Rgb = [a[0] * e[0], a[1] * e[1], a[2] * e[2]];
  const wet = surface.wet?.(s, t) ?? 0;
  if (wet > 0) {
    const sheen = wetSheen(light, p);
    for (let k = 0; k < 3; k++) out[k] += sheen[k] * wet;
  }
  const glow = surface.emissive?.(s, t);
  if (glow) for (let k = 0; k < 3; k++) out[k] += glow[k];
  return out;
}

/** Wet sheen: the puddles return each light as a pool of light, plus the cold sky. */
function wetSheen(light: Lighting, p: Vec3): Rgb {
  const out: Rgb = [0.002, 0.003, 0.007];
  for (const lamp of light.lamps) {
    if (!lamp.sheen || lamp.position[1] > 6) continue;
    const dh = Math.hypot(p[0] - lamp.position[0], p[2] - lamp.position[2]);
    const k = lamp.sheen / (1 + (dh / 1.6) ** 2);
    for (let c = 0; c < 3; c++) out[c] += lamp.color[c] * k;
  }
  return out;
}

function surfaceMesh(surface: Surface, light: Lighting): Mesh {
  const geometry = new PlaneGeometry(surface.width, surface.height);
  const u = new Vector3(...surface.u);
  const v = new Vector3(...surface.v);
  const basis = new Matrix4().makeBasis(u, v, u.clone().cross(v));
  const center = new Vector3(...surface.origin).addScaledVector(u, surface.width / 2).addScaledVector(v, surface.height / 2);
  geometry.applyMatrix4(basis.setPosition(center));
  const w = Math.max(2, Math.round(surface.width * surface.texture));
  const h = Math.max(2, Math.round(surface.height * surface.texture));
  const color = new Float32Array(w * h * 3);
  const glow = new Float32Array(w * h * 3);
  const p: Vec3 = [0, 0, 0];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const s = ((i + 0.5) / w) * surface.width;
      const t = (1 - (j + 0.5) / h) * surface.height;
      for (let k = 0; k < 3; k++) p[k] = surface.origin[k] + surface.u[k] * s + surface.v[k] * t;
      const c = litSurface(surface, light, s, t, p);
      const e = surface.emissive?.(s, t);
      const o = (j * w + i) * 3;
      for (let k = 0; k < 3; k++) {
        color[o + k] = c[k];
        // Only what glows strongly (neon, bright windows) leaves a halo.
        if (e) glow[o + k] = Math.max(0, e[k] - 0.25);
      }
    }
  }
  // Baked halo: the neon spreads into the haze (two box passes ≈ Gaussian, radius ~0.2 m).
  const radius = Math.max(1, Math.round(0.2 * surface.texture));
  blur(glow, w, h, radius);
  blur(glow, w, h, radius);
  const image = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    for (let k = 0; k < 3; k++) image.data[i * 4 + k] = toSrgb8(color[i * 3 + k] + 0.55 * glow[i * 3 + k]);
    image.data[i * 4 + 3] = 255;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return new Mesh(geometry, new MeshBasicMaterial({ map: texture, side: DoubleSide }));
}

/** Separable box blur, in place (floating-point RGB). */
function blur(data: Float32Array, w: number, h: number, r: number): void {
  const line = new Float32Array(Math.max(w, h) * 3);
  const pass = (count: number, length: number, index: (a: number, b: number) => number) => {
    for (let a = 0; a < count; a++) {
      for (let b = 0; b < length; b++) for (let k = 0; k < 3; k++) line[b * 3 + k] = data[index(a, b) * 3 + k];
      const sum = [0, 0, 0];
      for (let b = -r; b <= r; b++) {
        const q = Math.min(length - 1, Math.max(0, b));
        for (let k = 0; k < 3; k++) sum[k] += line[q * 3 + k];
      }
      for (let b = 0; b < length; b++) {
        for (let k = 0; k < 3; k++) data[index(a, b) * 3 + k] = sum[k] / (2 * r + 1);
        const out = Math.max(0, b - r);
        const into = Math.min(length - 1, b + r + 1);
        for (let k = 0; k < 3; k++) sum[k] += line[into * 3 + k] - line[out * 3 + k];
      }
    }
  };
  pass(h, w, (row, column) => row * w + column);
  pass(w, h, (column, row) => row * w + column);
}

/** Sky: a night gradient with the city's magenta and amber glow near the horizon. */
function skyDome(): Mesh {
  const geometry = new SphereGeometry(160, 32, 16);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) / 160;
    const glow = Math.exp(-Math.max(0, y) * 6);
    const c = mix3([0.008, 0.007, 0.022], [0.09, 0.03, 0.08], glow * 0.8);
    colors.set([c[0], c[1], c[2]], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const material = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = -1;
  return mesh;
}

/** Mast, neon rings, antenna bar, dipoles and the octagonal cap of the central tower. */
function propMeshes(light: Lighting): Group {
  const group = new Group();
  const metal = (y: number) => {
    const e = irradiance(light, [0.3, y, 0], [0.7, 0.2, 0.7]);
    return new Color(0.06 * e[0] + 0.006, 0.06 * e[1] + 0.006, 0.07 * e[2] + 0.008);
  };
  const mast = new Mesh(new CylinderGeometry(MAST.radius * 0.7, MAST.radius, MAST.top - MAST.bottom, 12), new MeshBasicMaterial({ color: metal(18) }));
  mast.position.set(0, (MAST.top + MAST.bottom) / 2, 0);
  group.add(mast);
  const roof = new Mesh(new CylinderGeometry(TOWER.radius, TOWER.radius, 0.3, 8), new MeshBasicMaterial({ color: new Color(0.012, 0.012, 0.018) }));
  roof.rotation.y = Math.PI / 8;
  roof.position.set(0, TOWER.height - 0.14, 0);
  group.add(roof);
  for (const [y, color] of MAST_RINGS) {
    const ring = new Mesh(new CylinderGeometry(MAST_RING_RADIUS, MAST_RING_RADIUS, 0.05, 40, 1, true), new MeshBasicMaterial({ color: new Color(...scale3(color, 1)), side: DoubleSide }));
    ring.position.set(0, y, 0);
    group.add(ring);
  }
  const beacon = new Mesh(new SphereGeometry(0.09, 12, 8), new MeshBasicMaterial({ color: new Color(1, 0.1, 0.06) }));
  beacon.position.set(0, MAST.top + 0.1, 0);
  group.add(beacon);
  // The antenna bar, with the magenta neon underneath and three dipoles.
  const p = perch();
  const barAxis = new Vector3(...p.barDirection);
  const barCenter = new Vector3(...scale(p.barDirection, p.barLength / 2 + 0.06)).setY(p.bar[1]);
  const orient = (mesh: Mesh, axis: Vector3) => mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), axis);
  const bar = new Mesh(new CylinderGeometry(p.barRadius, p.barRadius, p.barLength, 12), new MeshBasicMaterial({ color: new Color(0.05, 0.018, 0.045) }));
  orient(bar, barAxis);
  bar.position.copy(barCenter);
  group.add(bar);
  const neon = new Mesh(new CylinderGeometry(0.012, 0.012, p.barLength - 0.25, 10), new MeshBasicMaterial({ color: new Color(...scale3(MAGENTA, 2)) }));
  orient(neon, barAxis);
  neon.position.copy(barCenter).add(new Vector3(0, -0.03, 0)).addScaledVector(barAxis, 0.05);
  group.add(neon);
  for (const r of [0.35, 1.15]) {
    const rod = new Mesh(new CylinderGeometry(0.008, 0.008, 0.5, 8), new MeshBasicMaterial({ color: metal(p.bar[1]) }));
    rod.position.set(p.barDirection[0] * r, p.bar[1] + 0.02, p.barDirection[2] * r);
    group.add(rod);
  }
  return group;
}

// --- hologram ------------------------------------------------------------------------------------------------------

/**
 * Hologram points: the flat golden diagram (nested rectangles with each square, the plan of the
 * spiral and the radii of each quarter turn, which shrink by φ) and the 3D spiral guide, resting on
 * the funnel just below the flight.
 */
function hologramSamples(wide: boolean): { positions: number[]; colors: Rgb[] } {
  const positions: number[] = [];
  const colors: Rgb[] = [];
  // In points, a three-row stroke (≈ 12 cm wide): it still reads from the full plate, at 50 m.
  // In the source frame, a single row (one-pixel dotted lines).
  const flat = (a: [number, number], b: [number, number], color: Rgb, step: number, rows = wide ? 3 : 1) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(2, Math.ceil(length / step));
    const across = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
    for (let i = 0; i <= n; i++) {
      for (let row = 0; row < rows; row++) {
        const offset = (row - (rows - 1) / 2) * 0.06;
        const x = a[0] + ((b[0] - a[0]) * i) / n + across[0] * offset;
        const z = a[1] + ((b[1] - a[1]) * i) / n + across[1] * offset;
        if (Math.hypot(x, z) < MAST.radius + 0.08) continue;
        positions.push(x, DIAGRAM_Y, z);
        colors.push(color);
      }
    }
  };
  const rects = goldenRectangles(9);
  rects.forEach((rect, k) => {
    const color = scale3(CYAN, 0.95 - 0.05 * k);
    if (k === 0) for (let i = 0; i < 4; i++) flat(rect.rect[i], rect.rect[(i + 1) % 4], color, 0.05);
    flat(rect.cut[0], rect.cut[1], color, 0.05);
  });
  // Radii of each quarter turn, from the eye (the mast) to the spiral: each is 1/φ of the previous one.
  for (let k = 0; k <= 5; k++) {
    const [x, z] = spiralXZ((k * Math.PI) / 2);
    flat([0, 0], [x, z], scale3(GOLD, 0.45), 0.14, 1);
  }
  // Plan of the spiral, in gold, over the diagram (the same width as the rectangles).
  let theta = 0;
  while (spiralRadiusAt(theta) > 0.25) {
    const a = spiralXZ(theta);
    const b = spiralXZ(theta + 1e-3);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let row = wide ? -1 : 0; row <= (wide ? 1 : 0); row++) {
      positions.push(a[0] - ((b[1] - a[1]) / l) * row * 0.06, DIAGRAM_Y, a[1] + ((b[0] - a[0]) / l) * row * 0.06);
      colors.push(scale3(GOLD, 1.0));
    }
    theta += 0.05 / spiralRadiusAt(theta);
  }
  // The 3D spiral guide: the flight path, a little lower.
  theta = 0;
  while (spiralRadiusAt(theta) > 2.2) {
    const p = spiralPoint(theta);
    positions.push(p[0], p[1] - HOLO_DROP, p[2]);
    colors.push(scale3(GOLD, 0.6));
    theta += 0.1 / spiralRadiusAt(theta);
  }
  return { positions, colors };
}

/** Source-frame hologram: the same strokes as one-pixel dotted lines (no blotches near the camera). */
function hologramLines(): LineSegments {
  const { positions, colors } = hologramSamples(false);
  const segments: number[] = [];
  const segmentColors: number[] = [];
  for (let i = 0; i + 1 < positions.length / 3; i += 2) {
    const a = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    const b = [positions[i * 3 + 3], positions[i * 3 + 4], positions[i * 3 + 5]];
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 0.2) continue;
    // Each stroke: a short segment between two neighboring samples (the gap is the next sample).
    segments.push(...a, ...b);
    segmentColors.push(...colors[i], ...colors[i]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(segments), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(segmentColors), 3));
  return new LineSegments(geometry, new LineBasicMaterial({ vertexColors: true, fog: true }));
}

// --- rain ------------------------------------------------------------------------------------------------------------

const RAIN_STREAKS = 1700;
const RAIN_SPEED = 9;
const RAIN_LENGTH = 0.32;

function rainLines(): LineSegments {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(RAIN_STREAKS * 6), 3));
  const material = new LineBasicMaterial({ color: new Color(0.26, 0.3, 0.42), transparent: true, opacity: 0.38, fog: true });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;
  return lines;
}

/** Source-frame rain around the camera of frame f: it falls over time, deterministically. */
export function poseRain(rain: LineSegments, seed: number, frame: number, eye: Vec3): void {
  const random = stream(seed, 'falcon:rain');
  const position = rain.geometry.attributes.position as BufferAttribute;
  const t = frame / FALCON_FPS;
  const box = 22;
  const wind: Vec3 = [0.12, 0, 0.05];
  for (let i = 0; i < RAIN_STREAKS; i++) {
    const x0 = random();
    const y0 = random();
    const z0 = random();
    // A fixed world cell that repeats around the eye (the rain does not move with the camera).
    const x = eye[0] + (((x0 * box - eye[0] - t * wind[0] * RAIN_SPEED) % box) + box * 1.5) % box - box / 2;
    const z = eye[2] + (((z0 * box - eye[2] - t * wind[2] * RAIN_SPEED) % box) + box * 1.5) % box - box / 2;
    const y = eye[1] + (((y0 * box - eye[1] - t * RAIN_SPEED) % box) + box * 1.5) % box - box / 2;
    const near = Math.hypot(x - eye[0], y - eye[1], z - eye[2]) < 1.2;
    const l = near ? 0 : RAIN_LENGTH;
    position.setXYZ(i * 2, x, y, z);
    position.setXYZ(i * 2 + 1, x + wind[0] * l, y + l, z + wind[2] * l);
  }
  position.needsUpdate = true;
}

// --- static layer ---------------------------------------------------------------------------------------------------

/** Environment points: surfaces, props, hologram, seeds and rain (floaters). */
export function cityPoints(city: City, seed: number, envDensity: number, noise: number, cameras: PackCamera[]): PointSet {
  const random = stream(seed, 'environment');
  const writer = environmentWriter(random, noise, cameras);
  const P = writer.P;
  const light = city.lighting;
  const p: Vec3 = [0, 0, 0];
  for (const surface of city.surfaces) {
    const count = Math.round(envDensity * surface.density * surface.width * surface.height);
    for (let i = 0; i < count; i++) {
      const s = random() * surface.width;
      const t = random() * surface.height;
      const keep = surface.keep?.(s, t) ?? 1;
      if (keep < 1 && random() > keep) continue;
      for (let k = 0; k < 3; k++) p[k] = surface.origin[k] + surface.u[k] * s + surface.v[k] * t;
      P.set(p[0], p[1], p[2]);
      writer.push(litSurface(surface, light, s, t, p));
    }
  }
  const push = (x: number, y: number, z: number, color: Rgb) => {
    P.set(x, y, z);
    writer.push(color);
  };
  // Seeds of the disk: each one a handful of bright points.
  for (let k = SEED_FIRST; k <= SEED_LAST; k++) {
    const [x, z] = phyllotaxis(k, SEED_C);
    const size = 0.12 + 0.07 * (k / SEED_LAST);
    const c = seedColor(Math.hypot(x, z));
    for (let j = 0; j < 12; j++) {
      const a = random() * Math.PI * 2;
      const r = size * Math.sqrt(random()) * 0.8;
      push(x + Math.cos(a) * r, 0.01, z + Math.sin(a) * r, scale3(c, 1.6));
    }
  }
  // Hologram.
  const holo = hologramSamples(true);
  holo.colors.forEach((c, i) => push(holo.positions[i * 3], holo.positions[i * 3 + 1], holo.positions[i * 3 + 2], c));
  // Mast, rings and the antenna: dense, because the camera ends up right next to them.
  const mastRandom = stream(seed, 'falcon:props');
  for (let i = 0; i < 2600; i++) {
    const y = MAST.bottom + mastRandom() * (MAST.top - MAST.bottom);
    const a = mastRandom() * Math.PI * 2;
    const r = MAST.radius * (1 - 0.3 * (y - MAST.bottom) / (MAST.top - MAST.bottom));
    const e = irradiance(light, [Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a), 0, Math.sin(a)]);
    push(Math.cos(a) * r, y, Math.sin(a) * r, [0.06 * e[0] + 0.006, 0.06 * e[1] + 0.006, 0.07 * e[2] + 0.008]);
  }
  for (const [y, color] of MAST_RINGS) {
    for (let i = 0; i < 520; i++) {
      const a = (i / 520) * Math.PI * 2;
      push(Math.cos(a) * MAST_RING_RADIUS, y + (mastRandom() - 0.5) * 0.04, Math.sin(a) * MAST_RING_RADIUS, color);
    }
  }
  const pr = perch();
  for (let i = 0; i < 900; i++) {
    const r = 0.06 + mastRandom() * pr.barLength;
    const a = mastRandom() * Math.PI * 2;
    const side = normalize(cross(pr.barDirection, [0, 1, 0]));
    const q = add(scale(pr.barDirection, r), add(scale(side, Math.cos(a) * pr.barRadius), [0, pr.bar[1] + Math.sin(a) * pr.barRadius, 0]));
    const lit = Math.sin(a) < -0.3 ? scale3(MAGENTA, 0.45) : ([0.012, 0.005, 0.012] as Rgb);
    push(q[0], q[1], q[2], lit);
  }
  for (let i = 0; i < 700; i++) {
    const r = 0.18 + mastRandom() * (pr.barLength - 0.25);
    const q = add(scale(pr.barDirection, r), [0, pr.bar[1] - 0.03, 0]);
    push(q[0], q[1], q[2], scale3(MAGENTA, 2));
  }
  const top = funnelY(SPIRAL.r0);
  // Fine rain: small vertical streaks scattered around the flight.
  const rainRandom = stream(seed, 'falcon:rain-points');
  const streaks = Math.round(3600 * (0.4 + noise));
  for (let i = 0; i < streaks; i++) {
    const a = rainRandom() * Math.PI * 2;
    const r = Math.sqrt(rainRandom()) * 24;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = 1 + rainRandom() * (top + 4);
    const grey = 0.22 + rainRandom() * 0.2;
    for (let j = 0; j < 4; j++) {
      writer.positions.push(x + 0.012 * j, y + 0.06 * j, z + 0.005 * j);
      for (let k = 0; k < 3; k++) writer.colors.push(toSrgb8(grey * (k === 2 ? 1.3 : 1)));
    }
  }
  return writer.result();
}

export { SKY as CITY_SKY };
