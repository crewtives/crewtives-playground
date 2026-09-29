// Low-poly geometry of the specimens, computed from their growth equations, as lists of triangles
// with per-vertex color (linear). Pure module, no three: used by the WebGL view (through
// geometry.ts) and by the 2D fallback. Everything comes out normalized to radius 1 in the xy plane
// (z pointing up). Each shape records its own growth order: newest at the center, oldest outside.

import { leafFrames, leafPoint, SPOON, BLADE, isAloe, type RosetteParams, type V3 } from '../lathe/rosette';
import { BEAD_STYLES_COUNT } from './beads';
import { GOLDEN_ANGLE, type SpecimenSpec } from './spec';

export type Rgb = [number, number, number];
export type { V3 };

/** sRGB (hex) → linear. */
export function lin(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
}

export const GLASS = {
  ink: lin('#1b0f2e'),
  violet: lin('#4a1d6b'),
  cobalt: lin('#2b3fe0'),
  sky: lin('#5fb4ff'),
  bottle: lin('#0e5a4a'),
  leaf: lin('#1fa85b'),
  glaucous: lin('#8fd6b8'),
  chartreuse: lin('#c8f03c'),
  pollen: lin('#ffd21f'),
  honey: lin('#f39a1a'),
  vermilion: lin('#ff5a1f'),
  now: lin('#e8175d'),
  petal: lin('#ff6fb5'),
  lilac: lin('#b99cff'),
  sheet: lin('#fdfdf6'),
  propolis: lin('#8a3a12'),
};

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Piecewise ramp: t in [0, 1] over a list of colors. */
export function ramp(stops: Rgb[], t: number): Rgb {
  const x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return mix(stops[i], stops[i + 1], x - i);
}

export interface MeshData {
  positions: number[];
  colors: number[];
}

/** Accumulates non-indexed triangles (flat normals). */
export class Mesher implements MeshData {
  readonly positions: number[] = [];
  readonly colors: number[] = [];

  /** `facing`: orders the triangle so it faces +z (seen from above). */
  tri(a: V3, b: V3, c: V3, color: Rgb, facing = true): void {
    let p = b;
    let q = c;
    if (facing) {
      const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (nz < 0) [p, q] = [c, b];
    }
    this.positions.push(...a, ...p, ...q);
    for (let i = 0; i < 3; i++) this.colors.push(...color);
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: Rgb, facing = true): void {
    this.tri(a, b, c, color, facing);
    this.tri(a, c, d, color, facing);
  }
}

const TAU = Math.PI * 2;
const deg = (d: number) => (d * Math.PI) / 180;

/**
 * Vogel seed head (1979): floret n at θ = n·α, r = c·√n, with a dome. Each floret is a low
 * hexagonal pyramid; the color follows the birth order (the newest at the center).
 */
export function headMesh(angle: number, seeds: number, petals = true): MeshData {
  const m = new Mesher();
  const head = petals ? 0.64 : 0.98;
  const c = head / Math.sqrt(seeds + 0.5);
  const alpha = deg(angle);
  const hexR = 0.78 * c;
  // Backing disc of the flower head, so the cell does not show between florets.
  const base = 24;
  for (let i = 0; i < base; i++) {
    const t0 = (i / base) * TAU;
    const t1 = ((i + 1) / base) * TAU;
    m.tri([0, 0, 0.02], [head * Math.cos(t0), head * Math.sin(t0), -0.04], [head * Math.cos(t1), head * Math.sin(t1), -0.04], GLASS.propolis);
  }
  const stops = [GLASS.chartreuse, GLASS.pollen, GLASS.honey, GLASS.propolis];
  for (let n = 0; n < seeds; n++) {
    const r = c * Math.sqrt(n + 0.5);
    const theta = n * alpha;
    const u = n / Math.max(1, seeds - 1);
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const z = 0.2 * (1 - u * u);
    const color = ramp(stops, u);
    const apex: V3 = [x, y, z + 0.5 * c];
    for (let k = 0; k < 6; k++) {
      const a0 = theta + (k / 6) * TAU;
      const a1 = theta + ((k + 1) / 6) * TAU;
      m.tri(apex, [x + hexR * Math.cos(a0), y + hexR * Math.sin(a0), z], [x + hexR * Math.cos(a1), y + hexR * Math.sin(a1), z], color);
    }
  }
  if (petals) {
    // 21 ray petals at α: two-segment kites that open outward and tilt downward.
    for (let k = 0; k < 21; k++) {
      const t = k * deg(GOLDEN_ANGLE);
      const dir: [number, number] = [Math.cos(t), Math.sin(t)];
      const side: [number, number] = [-dir[1], dir[0]];
      const r0 = head * 0.9;
      const r1 = 0.83;
      const r2 = 1;
      const w = 0.075 + 0.02 * ((k * 7) % 3);
      const P = (r: number, s: number, z: number): V3 => [dir[0] * r + side[0] * s, dir[1] * r + side[1] * s, z];
      const tone = k % 2 === 0 ? GLASS.pollen : mix(GLASS.pollen, GLASS.honey, 0.55);
      m.tri(P(r0, 0, 0.03), P(r1, -w, 0.0), P(r1, 0, 0.04), tone);
      m.tri(P(r0, 0, 0.03), P(r1, 0, 0.04), P(r1, w, 0.0), tone);
      m.tri(P(r1, -w, 0.0), P(r2, 0, -0.06), P(r1, 0, 0.04), tone);
      m.tri(P(r1, 0, 0.04), P(r2, 0, -0.06), P(r1, w, 0.0), tone);
    }
  }
  return m;
}

export interface RosetteMeshOptions {
  /** Ruby NOW keyline (with its ink rule) on the newest leaf. */
  nowKeyline?: boolean;
  /** Scale of each leaf (blooming in birth order): k → 0–1. */
  grow?: (k: number) => number;
  /** Not normalized to radius 1 (the lathe uses plant units). */
  raw?: boolean;
  /** If given, receives the leaf of each triangle (to know which leaf was touched). */
  leafOfTri?: number[];
  /** If given, receives each leaf's outline as pairs of points (x, y, z segments). */
  outline?: number[];
}

/**
 * Rosette: leaf k (k = 0 is the newest, at the center) sits at azimuth k·α, opens with age
 * (12° + 72°·(k/K)^0.7 from vertical) and grows (0.35 + 0.65·√(k/K)). The echeveria is a glaucous
 * spoon with a blushing tip; the aloe, a toothed triangle in a spiral near 144°.
 */
export function rosetteMesh(p: RosetteParams, options: RosetteMeshOptions = {}): MeshData {
  const m = new Mesher();
  const aloe = isAloe(p.species);
  const profile = aloe ? BLADE : SPOON;
  const stations = profile.length;
  const leaves = leafFrames(p);
  // Seen from above (chamber): every face looks toward +z. On the lathe they are seen from any side.
  const face = !options.raw;
  // Drawn from oldest to newest: the inner ones end up on top.
  for (let k = leaves.length - 1; k >= 0; k--) {
    const leaf = leaves[k];
    const g = options.grow ? options.grow(k) : 1;
    if (g <= 0.001) continue;
    const age = leaf.age;
    const at = (s: number, off: number, bulge: number): V3 => {
      const q = leafPoint(leaf, s * g, off * g, bulge * g);
      return q;
    };
    const tipColor = aloe ? mix(GLASS.leaf, GLASS.chartreuse, 0.25) : ramp([GLASS.glaucous, GLASS.lilac, GLASS.petal], p.blush);
    const baseColor = aloe ? mix(GLASS.bottle, GLASS.leaf, 0.35 + 0.55 * age) : mix(GLASS.glaucous, GLASS.sheet, 0.18 * (1 - age));
    const now = options.nowKeyline && k === 0;
    const firstTri = m.positions.length / 9;
    for (let i = 0; i < stations - 1; i++) {
      const s0 = i / (stations - 1);
      const s1 = (i + 1) / (stations - 1);
      const w0 = leaf.width * profile[i];
      const w1 = leaf.width * profile[i + 1];
      const b0 = (0.1 + 0.2 * p.plump) * w0;
      const b1 = (0.1 + 0.2 * p.plump) * w1;
      const tone = mix(baseColor, tipColor, Math.pow(s1, aloe ? 1.5 : 2.6) * (aloe ? 1 : 0.5 + 0.5 * p.blush));
      const mid0 = at(s0, 0, b0);
      const mid1 = at(s1, 0, b1);
      // Aloe teeth: each segment pushes the edge vertex outward and tints it chartreuse.
      const tooth = aloe && i % 2 === 1 ? 0.06 * leaf.width : 0;
      const l0 = at(s0, -w0 / 2, 0);
      const l1 = at(s1, -(w1 / 2 + tooth), 0);
      const r0 = at(s0, w0 / 2, 0);
      const r1 = at(s1, w1 / 2 + tooth, 0);
      m.quad(l0, mid0, mid1, l1, tone, face);
      m.quad(mid0, r0, r1, mid1, mix(tone, GLASS.sheet, 0.12), face);
      if (now) {
        // NOW: a ruby band along the edge, and an ink rule outside it.
        const band = (sign: number, inner: number, outer: number, color: Rgb) => {
          m.quad(at(s0, sign * inner * w0, 0.004), at(s0, sign * outer * w0, 0.004), at(s1, sign * outer * w1, 0.004), at(s1, sign * inner * w1, 0.004), color, face);
        };
        band(-1, 0.3, 0.52, GLASS.now);
        band(1, 0.3, 0.52, GLASS.now);
        band(-1, 0.52, 0.66, GLASS.ink);
        band(1, 0.52, 0.66, GLASS.ink);
      }
      if (tooth) {
        m.tri(l1, at(s1 - 0.04, -(w1 / 2 + tooth * 2.2), 0), at(s1 - 0.1, -w1 / 2, 0), GLASS.chartreuse, face);
        m.tri(r1, at(s1 - 0.04, w1 / 2 + tooth * 2.2, 0), at(s1 - 0.1, w1 / 2, 0), GLASS.chartreuse, face);
      }
      if (options.outline) {
        // Outline of the spoon, a hair above the face: each leaf reads as separate.
        const lift = 0.004;
        const edge = (a: V3, b: V3) => options.outline!.push(...a, ...b);
        edge(at(s0, -w0 / 2, lift), at(s1, -(w1 / 2 + tooth), lift));
        edge(at(s0, w0 / 2, lift), at(s1, w1 / 2 + tooth, lift));
        if (i === 0) edge(at(s0, -w0 / 2, lift), at(s0, w0 / 2, lift));
      }
    }
    if (options.leafOfTri) for (let t = firstTri; t < m.positions.length / 9; t++) options.leafOfTri.push(k);
  }
  return options.raw ? m : normalize(m);
}

/** Relative luminance (Y) of a linear color. */
function luminance(c: Rgb): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** OKLab of a linear color (to pick the nearest glass family). */
function oklab(c: Rgb): V3 {
  const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
  const m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
  const s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * Glass families for flat shading: each face takes ONE color from the 16-color palette, its
 * family's or its shadow (and, for some, its light). That way the display never mixes three tones in a face.
 */
const FACET_FAMILIES: { key: Rgb; dark: Rgb; light?: Rgb }[] = [
  { key: GLASS.glaucous, dark: GLASS.bottle },
  { key: GLASS.lilac, dark: GLASS.violet },
  { key: GLASS.petal, dark: GLASS.violet },
  { key: GLASS.leaf, dark: GLASS.bottle, light: GLASS.chartreuse },
  { key: GLASS.bottle, dark: GLASS.ink, light: GLASS.leaf },
  { key: GLASS.chartreuse, dark: GLASS.leaf },
  { key: GLASS.honey, dark: GLASS.propolis },
  { key: GLASS.vermilion, dark: GLASS.propolis },
  { key: GLASS.propolis, dark: GLASS.ink },
  { key: GLASS.now, dark: GLASS.now },
  { key: GLASS.ink, dark: GLASS.ink },
];

/** Below this fraction of light (lit Y / glass Y) the face switches to its shadow. */
export const FACET_DARK = 0.56;
/** Above this one, to its light (only the families that have one). */
export const FACET_LIGHT = 0.97;

/**
 * Shades each triangle with the window light (the same model as `shadeFlat`) and snaps it to a
 * single palette color: its family's, its shadow or its light. Returns a new mesh, in linear, to be
 * painted without lights (the display only dithers the transition between faces, not the faces).
 */
export function snapFacets(mesh: MeshData, light: V3): MeshData {
  const len = Math.hypot(...light) || 1;
  const L: V3 = [light[0] / len, light[1] / len, light[2] / len];
  const keys = FACET_FAMILIES.map((f) => oklab(f.key));
  const p = mesh.positions;
  const c = mesh.colors;
  const colors: number[] = new Array(c.length);
  for (let o = 0; o < p.length; o += 9) {
    const base: Rgb = [c[o], c[o + 1], c[o + 2]];
    const lab = oklab(base);
    let best = 0;
    let bestD = Infinity;
    keys.forEach((k, i) => {
      const d = (k[0] - lab[0]) ** 2 + (k[1] - lab[1]) ** 2 + (k[2] - lab[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const family = FACET_FAMILIES[best];
    const lit = shadeFlat([p[o], p[o + 1], p[o + 2]], [p[o + 3], p[o + 4], p[o + 5]], [p[o + 6], p[o + 7], p[o + 8]], family.key, L);
    const litLinear = lit.map((v) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    }) as Rgb;
    const ratio = luminance(litLinear) / Math.max(1e-6, luminance(family.key));
    const pick = ratio < FACET_DARK ? family.dark : ratio > FACET_LIGHT && family.light ? family.light : family.key;
    for (let v = 0; v < 3; v++) {
      colors[o + v * 3] = pick[0];
      colors[o + v * 3 + 1] = pick[1];
      colors[o + v * 3 + 2] = pick[2];
    }
  }
  return { positions: p, colors };
}

/** States of the cells of a honeycomb taken into the chamber: 0 empty, 1 honey, 2 cap, 3 newborn. */
export type CombCell = 0 | 1 | 2 | 3;

/** Honeycomb: hexagonal cells in rings (ring n has 6n cells), with honey and caps. */
export function combMesh(rings: number, seed = 1, cells?: string): MeshData {
  const m = new Mesher();
  const size = 1 / (1.5 * rings + 1.2);
  let state = seed >>> 0 || 1;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const list = combCells(rings);
  list.forEach(([q, r, ring], index) => {
    const cx = size * Math.sqrt(3) * (q + r / 2);
    const cy = size * 1.5 * r;
    const hex = (rad: number, z: number) =>
      Array.from({ length: 6 }, (_, k) => {
        const a = deg(60 * k + 30);
        return [cx + rad * Math.cos(a), cy + rad * Math.sin(a), z] as V3;
      });
    const outer = hex(size, 0.12);
    const inner = hex(size * 0.8, 0.12);
    const wax = mix(GLASS.honey, GLASS.pollen, 0.35);
    for (let k = 0; k < 6; k++) m.quad(outer[k], outer[(k + 1) % 6], inner[(k + 1) % 6], inner[k], k < 3 ? wax : mix(wax, GLASS.propolis, 0.25));
    const roll = rand();
    const young = ring / Math.max(1, rings);
    // With cells (a Hive honeycomb), their state rules; otherwise the seed hands out honey and caps.
    const kind: CombCell = cells
      ? ((Number(cells[index]) || 0) as CombCell)
      : roll < 0.28 + 0.3 * (1 - young)
        ? 2
        : roll < 0.8
          ? 1
          : 0;
    if (kind === 2) {
      // Cap: a paper dome.
      const apex: V3 = [cx, cy, 0.2];
      const rim = hex(size * 0.8, 0.12);
      for (let k = 0; k < 6; k++) m.tri(apex, rim[k], rim[(k + 1) % 6], k < 3 ? GLASS.sheet : mix(GLASS.sheet, GLASS.honey, 0.25));
    } else {
      const honey = kind === 1 || kind === 3;
      const fill = hex(size * 0.8, honey ? 0.06 : -0.02);
      // Newborn cells in pollen: the NOW ruby is not scattered across the honeycomb.
      const color = kind === 3 ? GLASS.pollen : honey ? mix(GLASS.honey, GLASS.vermilion, 0.2 * rand()) : GLASS.propolis;
      for (let k = 0; k < 6; k++) m.tri([cx, cy, honey ? 0.06 : -0.02], fill[k], fill[(k + 1) % 6], color);
    }
  });
  return normalize(m);
}

/** Cells of a round honeycomb of `rings` rings, in axial coordinates, with their ring. */
export function combCells(rings: number): [number, number, number][] {
  const cells: [number, number, number][] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
      cells.push([q, r, Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r))]);
    }
  }
  return cells;
}

/** Glass beads: octahedra, icosahedra and five-sided shards. */
export function beadMesh(style: number): MeshData {
  const m = new Mesher();
  const s = style % BEAD_STYLES_COUNT;
  if (s === 0 || s === 3) {
    // Octahedron (cobalt) or octahedral shard (chartreuse).
    const color = s === 0 ? GLASS.cobalt : GLASS.chartreuse;
    const eq: V3[] = [0, 1, 2, 3].map((k) => [Math.cos(deg(90 * k + 45)), Math.sin(deg(90 * k + 45)), 0]);
    for (let k = 0; k < 4; k++) m.tri([0, 0, 0.8], eq[k], eq[(k + 1) % 4], k % 2 ? color : mix(color, GLASS.sheet, 0.25));
  } else if (s === 1) {
    // Icosahedron seen from above: top pentagon and crown (sky).
    const color = GLASS.sky;
    const top: V3 = [0, 0, 0.9];
    const ringA: V3[] = [0, 1, 2, 3, 4].map((k) => [0.62 * Math.cos(deg(72 * k)), 0.62 * Math.sin(deg(72 * k)), 0.45]);
    const ringB: V3[] = [0, 1, 2, 3, 4].map((k) => [Math.cos(deg(72 * k + 36)), Math.sin(deg(72 * k + 36)), 0]);
    for (let k = 0; k < 5; k++) {
      m.tri(top, ringA[k], ringA[(k + 1) % 5], k % 2 ? color : mix(color, GLASS.sheet, 0.3));
      m.tri(ringA[k], ringB[k], ringA[(k + 1) % 5], mix(color, GLASS.cobalt, 0.25));
      m.tri(ringB[k], ringB[(k + 4) % 5], ringA[k], mix(color, GLASS.cobalt, 0.45));
    }
  } else {
    // Five-sided petal shard: a flat bipyramid.
    const color = GLASS.petal;
    const eq: V3[] = [0, 1, 2, 3, 4].map((k) => [Math.cos(deg(72 * k + 90)) * (k === 0 ? 1 : 0.8), Math.sin(deg(72 * k + 90)) * (k === 0 ? 1 : 0.8), 0]);
    for (let k = 0; k < 5; k++) m.tri([0, 0, 0.35], eq[k], eq[(k + 1) % 5], k % 2 ? color : mix(color, GLASS.lilac, 0.4));
  }
  return m;
}

/** Mesh of a chamber specimen, normalized to radius 1. */
export function specimenMesh(spec: SpecimenSpec): MeshData {
  switch (spec.kind) {
    case 'head':
      return headMesh(spec.angle, Math.min(spec.seeds, 240));
    case 'rosette':
      return rosetteMesh(spec);
    case 'comb':
      return combMesh(spec.rings, spec.seed, spec.cells);
  }
}

/** Scales the xy footprint to radius 1 (z scales the same, to preserve the facets). */
function normalize(m: Mesher): MeshData {
  let r = 0;
  for (let i = 0; i < m.positions.length; i += 3) r = Math.max(r, Math.hypot(m.positions[i], m.positions[i + 1]));
  if (r > 0) for (let i = 0; i < m.positions.length; i++) m.positions[i] /= r;
  return m;
}

/**
 * Flat shading of a triangle the way the chamber does it (window light at 55° elevation and a
 * paper-over-violet hemisphere fill), in sRGB 0–255, for drawing in 2D without WebGL.
 */
export function shadeFlat(a: V3, b: V3, c: V3, color: Rgb, light: V3): [number, number, number] {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  if (nz < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const diffuse = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]) * 0.62 * Math.PI;
  const h = 0.5 + 0.5 * nz;
  const out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const hemi = (GLASS.sheet[i] * h + GLASS.violet[i] * (1 - h)) * 0.5 * Math.PI;
    const linear = color[i] * (diffuse + hemi) / Math.PI;
    const s = linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
    out[i] = Math.round(255 * Math.min(1, Math.max(0, s)));
  }
  return out;
}
