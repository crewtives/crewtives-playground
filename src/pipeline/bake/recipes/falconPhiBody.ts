import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import { FALCON_DIMS, perch, vec3, wingSkeleton, type FalconPose, type Frame3, type Vec3, type WingParams, type WingSkeleton } from '../../scenes/falconPhi';
import { srgb, type Rgb } from '../common';

// Equation-generated peregrine falcon (D7, D8): the body is a surface of revolution along a spine
// that bends at the neck; a head with a hooked beak and eyes with a yellow ring; three-segment wings
// with the outer primaries spread apart; a fanned tail; and legs with talons. Every part is a closed
// shell (outward normals) with a fixed topology: each frame only rewrites the positions, in world
// coordinates.

const { add, sub, scale, dot, cross, length, normalize, lerp } = vec3;

// --- colors (linear albedo) ----------------------------------------------------------------------

const SLATE = srgb(0.36, 0.41, 0.48);
const SLATE_DARK = srgb(0.2, 0.225, 0.26);
const SLATE_BAR = srgb(0.24, 0.27, 0.32);
const HOOD = srgb(0.085, 0.09, 0.105);
const CREAM = srgb(0.93, 0.89, 0.8);
const WHITE = srgb(0.96, 0.95, 0.91);
const BAR = srgb(0.2, 0.19, 0.2);
const UNDERWING = srgb(0.82, 0.8, 0.76);
const UNDERWING_BAR = srgb(0.33, 0.32, 0.33);
const UNDERWING_GREY = srgb(0.6, 0.6, 0.6);
const YELLOW = srgb(0.97, 0.78, 0.16);
const EYE = srgb(0.05, 0.035, 0.03);
const BEAK = srgb(0.4, 0.45, 0.53);
const BEAK_TIP = srgb(0.07, 0.07, 0.08);
const TALON = srgb(0.03, 0.03, 0.035);

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function band(x: number, edge0: number, edge1: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Barring: 1 inside a dark bar of period `period` and fraction `duty`, with a soft edge. */
function bars(x: number, period: number, duty: number, soft = 0.12): number {
  const f = x / period - Math.floor(x / period);
  return band(f, 0, soft) * (1 - band(f, duty - soft, duty));
}

// --- shells ------------------------------------------------------------------------------------------

/**
 * Closed shell: `rows` rings of `ring` vertices (each ring closes on itself) and a fan cap at each
 * end. The indices are built once; `flip` reverses the winding if the volume came out negative.
 */
class Shell {
  readonly offset: number;
  readonly vertexCount: number;
  constructor(
    readonly rows: number,
    readonly ring: number,
    offset: number,
  ) {
    this.offset = offset;
    this.vertexCount = rows * ring + 2;
  }

  index(r: number, c: number): number {
    return this.offset + r * this.ring + (((c % this.ring) + this.ring) % this.ring);
  }

  get startCap(): number {
    return this.offset + this.rows * this.ring;
  }

  get endCap(): number {
    return this.startCap + 1;
  }

  triangles(out: number[]): void {
    for (let r = 0; r < this.rows - 1; r++) {
      for (let c = 0; c < this.ring; c++) {
        const a = this.index(r, c);
        const b = this.index(r, c + 1);
        const d = this.index(r + 1, c);
        const e = this.index(r + 1, c + 1);
        out.push(a, b, d, b, e, d);
      }
    }
    for (let c = 0; c < this.ring; c++) {
      out.push(this.startCap, this.index(0, c + 1), this.index(0, c));
      out.push(this.endCap, this.index(this.rows - 1, c), this.index(this.rows - 1, c + 1));
    }
  }
}

/** One part of the falcon: several shells in one mesh, with a per-vertex albedo. */
export class FalconPart {
  readonly mesh: Mesh;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly albedo: Float32Array;
  /** Expected side of the normal per vertex (0 = no hint): orients the normals of the folded wing. */
  readonly hints: Float32Array;
  readonly indices: Uint32Array;
  readonly shells: Shell[] = [];
  readonly vertexCount: number;
  /** Representative albedo (the pipeline asks for one per part; the real color comes from the per-vertex albedo). */
  readonly meanAlbedo: Rgb;

  constructor(
    readonly name: string,
    layout: [rows: number, ring: number][],
    paint: (shell: number, row: number, column: number) => Rgb,
    capPaint?: (shell: number, end: 0 | 1) => Rgb,
  ) {
    let offset = 0;
    for (const [rows, ring] of layout) {
      const shell = new Shell(rows, ring, offset);
      this.shells.push(shell);
      offset += shell.vertexCount;
    }
    this.vertexCount = offset;
    this.positions = new Float32Array(offset * 3);
    this.normals = new Float32Array(offset * 3);
    this.albedo = new Float32Array(offset * 3);
    this.hints = new Float32Array(offset * 3);
    const indices: number[] = [];
    for (const shell of this.shells) shell.triangles(indices);
    this.indices = Uint32Array.from(indices);
    const mean: Rgb = [0, 0, 0];
    this.shells.forEach((shell, s) => {
      for (let r = 0; r < shell.rows; r++) {
        for (let c = 0; c < shell.ring; c++) this.albedo.set(paint(s, r, c), shell.index(r, c) * 3);
      }
      this.albedo.set(capPaint?.(s, 0) ?? paint(s, 0, 0), shell.startCap * 3);
      this.albedo.set(capPaint?.(s, 1) ?? paint(s, shell.rows - 1, 0), shell.endCap * 3);
    });
    for (let i = 0; i < offset; i++) for (let k = 0; k < 3; k++) mean[k] += this.albedo[i * 3 + k] / offset;
    this.meanAlbedo = mean;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(offset * 3), 3));
    geometry.setIndex(new BufferAttribute(this.indices, 1));
    // Double-sided: the wing folded in a "Z" overlaps itself and part of its shell ends up inside out.
    this.mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.name = `falcon:${name}`;
  }

  set(shell: number, row: number, column: number, p: Vec3): void {
    this.positions.set(p, this.shells[shell].index(row, column) * 3);
  }

  /** Caps: the center of each end ring. */
  closeCaps(): void {
    for (const shell of this.shells) {
      for (const [row, cap] of [
        [0, shell.startCap],
        [shell.rows - 1, shell.endCap],
      ] as const) {
        let x = 0;
        let y = 0;
        let z = 0;
        for (let c = 0; c < shell.ring; c++) {
          const i = shell.index(row, c) * 3;
          x += this.positions[i];
          y += this.positions[i + 1];
          z += this.positions[i + 2];
        }
        this.positions.set([x / shell.ring, y / shell.ring, z / shell.ring], cap * 3);
      }
    }
  }

  /** Per-vertex normals (area-weighted), and a notice to three about the new positions. */
  finish(): void {
    this.closeCaps();
    const p = this.positions;
    const n = this.normals;
    n.fill(0);
    const idx = this.indices;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3;
      const b = idx[i + 1] * 3;
      const c = idx[i + 2] * 3;
      const abx = p[b] - p[a];
      const aby = p[b + 1] - p[a + 1];
      const abz = p[b + 2] - p[a + 2];
      const acx = p[c] - p[a];
      const acy = p[c + 1] - p[a + 1];
      const acz = p[c + 2] - p[a + 2];
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      for (const v of [a, b, c]) {
        n[v] += nx;
        n[v + 1] += ny;
        n[v + 2] += nz;
      }
    }
    const h = this.hints;
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      // With a hint, the normal points to the expected side (above or below the wing).
      const flip = n[i] * h[i] + n[i + 1] * h[i + 1] + n[i + 2] * h[i + 2] < 0 ? -1 : 1;
      n[i] *= flip / l;
      n[i + 1] *= flip / l;
      n[i + 2] *= flip / l;
    }
    const geometry = this.mesh.geometry;
    geometry.attributes.position.needsUpdate = true;
  }

  /** Index range [start, end) of each shell within `indices`. */
  private range(shellIndex: number): [number, number] {
    let start = 0;
    for (let s = 0; s < shellIndex; s++) start += triangleIndexCount(this.shells[s]);
    return [start, start + triangleIndexCount(this.shells[shellIndex])];
  }

  /** Signed volume per shell (positive = outward normals). */
  signedVolumes(): number[] {
    const p = this.positions;
    return this.shells.map((_, s) => {
      const [start, end] = this.range(s);
      let volume = 0;
      for (let i = start; i < end; i += 3) {
        const [a, b, c] = [this.indices[i] * 3, this.indices[i + 1] * 3, this.indices[i + 2] * 3];
        volume +=
          (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
      }
      return volume;
    });
  }

  /** Reverses the winding of a shell's triangles (if it was built inside out). */
  flipShell(shellIndex: number): void {
    const [start, end] = this.range(shellIndex);
    for (let i = start; i < end; i += 3) {
      const b = this.indices[i + 1];
      this.indices[i + 1] = this.indices[i + 2];
      this.indices[i + 2] = b;
    }
    this.mesh.geometry.index!.needsUpdate = true;
  }
}

function triangleIndexCount(shell: Shell): number {
  return (shell.rows - 1) * shell.ring * 6 + shell.ring * 6;
}

// --- body measurements -----------------------------------------------------------------------------

/** Key sections of the body (body coordinates): [x, half width, height above, height below, center y]. */
const BODY_KEYS: number[][] = [
  [-0.13, 0.01748, 0.012, 0.016, 0.004],
  [-0.12, 0.023, 0.016, 0.022, 0.004],
  [-0.105, 0.02852, 0.021, 0.029, 0.003],
  [-0.09, 0.03312, 0.026, 0.036, 0.002],
  [-0.07, 0.03772, 0.03, 0.045, 0],
  [-0.05, 0.0414, 0.033, 0.052, -0.002],
  [-0.03, 0.04508, 0.035, 0.058, -0.003],
  [-0.01, 0.04692, 0.036, 0.061, -0.002],
  [0.01, 0.04692, 0.037, 0.062, 0],
  [0.03, 0.04508, 0.037, 0.059, 0.003],
  [0.05, 0.04048, 0.036, 0.052, 0.007],
  [0.065, 0.03588, 0.034, 0.044, 0.011],
  [0.08, 0.03036, 0.031, 0.036, 0.015],
  [0.09, 0.02668, 0.029, 0.032, 0.018],
];
/** Key sections of the head (head coordinates, origin at its center). */
const HEAD_KEYS: number[][] = [
  [-0.036, 0.0224, 0.0208, 0.024, -0.0032],
  [-0.028, 0.0248, 0.0216, 0.0248, -0.0016],
  [-0.02, 0.0272, 0.02376, 0.0248, 0],
  [-0.012, 0.028, 0.0252, 0.024, 0.0008],
  [-0.004, 0.0272, 0.02448, 0.0224, 0.0016],
  [0.004, 0.0256, 0.02232, 0.02, 0.0016],
  [0.0104, 0.0224, 0.01944, 0.0168, 0.0008],
  [0.016, 0.0184, 0.0176, 0.0136, 0],
  [0.0208, 0.0136, 0.0128, 0.0104, -0.0008],
  [0.0248, 0.0088, 0.0088, 0.0072, -0.0016],
  [0.028, 0.0032, 0.0032, 0.0032, -0.0024],
];

/** Intermediate sections by Catmull-Rom over the keys, with a step of `step` in x. */
function resample(keys: number[][], step: number): number[][] {
  const out: number[][] = [];
  const x0 = keys[0][0];
  const x1 = keys[keys.length - 1][0];
  const count = Math.round((x1 - x0) / step);
  for (let i = 0; i <= count; i++) {
    const x = x0 + ((x1 - x0) * i) / count;
    let k = 0;
    while (k < keys.length - 2 && x > keys[k + 1][0]) k++;
    const [a, b] = [keys[k], keys[k + 1]];
    const before = keys[Math.max(0, k - 1)];
    const after = keys[Math.min(keys.length - 1, k + 2)];
    const t = (x - a[0]) / (b[0] - a[0]);
    const t2 = t * t;
    const t3 = t2 * t;
    out.push(
      a.map((value, c) =>
        c === 0 ? x : 0.5 * (2 * value + (-before[c] + b[c]) * t + (2 * before[c] - 5 * value + 4 * b[c] - after[c]) * t2 + (-before[c] + 3 * value - 3 * b[c] + after[c]) * t3),
      ),
    );
  }
  return out;
}

/** Body sections every 5 mm and head sections every 3 mm: the barring needs dense vertices. */
const BODY_SECTIONS = resample(BODY_KEYS, 0.005);
const HEAD_SECTIONS = resample(HEAD_KEYS, 0.003);
const NECK_ROWS = 5;
const BODY_RING = 32;
const BODY_ROWS = BODY_SECTIONS.length + NECK_ROWS + HEAD_SECTIONS.length;

/** Eye on the head: position along the sections and angle from the back. */
const EYE_X = 0.0075;
const EYE_ANGLE = (78 * Math.PI) / 180;
const EYE_RADIUS = 0.0069;
const IRIS_RADIUS = 0.0056;

/** Point on an elliptical section: angle a from the back, toward the right. */
function sectionPoint(center: Vec3, frame: Frame3, s: number[], a: number, grow = 0): Vec3 {
  const up = Math.cos(a) >= 0 ? s[2] : s[3];
  return add(center, add(scale(frame.up, (up + grow) * Math.cos(a) + s[4]), scale(frame.right, (s[1] + grow) * Math.sin(a))));
}

function localToWorld(origin: Vec3, frame: Frame3, p: Vec3): Vec3 {
  return add(origin, add(add(scale(frame.forward, p[0]), scale(frame.up, p[1])), scale(frame.right, p[2])));
}

function mixFrame(a: Frame3, b: Frame3, t: number): Frame3 {
  const forward = normalize(lerp(a.forward, b.forward, t));
  const right = normalize(cross(forward, lerp(a.up, b.up, t)));
  return { forward, right, up: normalize(cross(right, forward)) };
}

// --- colors by zone ------------------------------------------------------------------------------------

/** Albedo of the body and head by row (section) and angle from the back. */
function bodyPaint(row: number, column: number): Rgb {
  const a = (column / BODY_RING) * Math.PI * 2;
  const side = Math.abs(Math.sin(a));
  const belly = band(-Math.cos(a), -0.4, 0.0); // 0 back, 1 belly
  if (row < BODY_SECTIONS.length) {
    const x = BODY_SECTIONS[row][0];
    // Slate-grey back with faint bars; barred cream belly and flanks; plain upper breast.
    const back = mix(SLATE, SLATE_BAR, 0.6 * bars(x + 0.2, 0.02, 0.3));
    const barring = x < 0.04 ? bars(x + 0.3 + 0.005 * side, 0.018, 0.32) * band(x, 0.06, 0.035) * (0.55 + 0.45 * side) : 0;
    const front = mix(CREAM, BAR, 0.9 * barring);
    return mix(back, mix(front, WHITE, band(x, 0.045, 0.075)), belly);
  }
  if (row < BODY_SECTIONS.length + NECK_ROWS) {
    // Neck: dark nape above, white throat below.
    return mix(HOOD, WHITE, band(-Math.cos(a), -0.1, 0.25));
  }
  const x = HEAD_SECTIONS[row - BODY_SECTIONS.length - NECK_ROWS][0];
  return headPaint(x, a);
}

/**
 * The peregrine's hood (x in head meters, a from the back): dark crown, nape and lores; a broad
 * malar stripe running down from the eye toward the throat; behind it, the white cheek rises to
 * eye level; white throat and upper breast.
 */
function headPaint(x: number, a: number): Rgb {
  const down = -Math.cos(a); // −1 crown, +1 throat
  const lateral = Math.abs(Math.sin(a));
  // The hood line: high behind the malar stripe (white cheek), low at the lores.
  const hoodLine = -0.32 + 0.5 * band(x, -0.018, -0.012);
  let dark = 1 - band(down, hoodLine - 0.06, hoodLine + 0.06);
  // The nape stays dark: the cheek opens only on the sides.
  dark = Math.max(dark, (1 - band(lateral, 0.55, 0.75)) * (1 - band(down, 0.05, 0.2)));
  const malar = band(x, -0.017, -0.012) * (1 - band(x, 0.011, 0.016)) * (1 - band(down, 0.62, 0.72)) * band(lateral, 0.35, 0.5);
  dark = Math.max(dark, malar);
  return mix(WHITE, HOOD, dark);
}

/** Wing albedo (main shell) by station and position along the chord (0 leading edge, 1 trailing edge). */
function wingPaint(u: number, v: number, top: boolean): Rgb {
  if (top) {
    // Slate coverts with a light edge; darker flight feathers and an almost black hand.
    const flight = band(v, 0.45, 0.7);
    const hand = band(u, 0.55, 0.85);
    const covertEdge = 0.35 * bars(v + 0.02, 0.2, 0.18) * (1 - flight);
    return mix(mix(mix(SLATE, SLATE_BAR, covertEdge), SLATE_DARK, 0.4 * flight), SLATE_DARK, 0.65 * hand);
  }
  // Underneath: light, mottled coverts; grey flight feathers, darker toward the tip.
  const flight = band(v, 0.4, 0.62);
  const mottle = 0.25 * bars(v * 0.14 + 0.37 * u * 0.14, 0.021, 0.4) * (1 - flight);
  return mix(mix(UNDERWING, UNDERWING_BAR, mottle), mix(UNDERWING_GREY, UNDERWING_BAR, 0.35 * band(u, 0.6, 0.95)), flight);
}

// --- wing stations ----------------------------------------------------------------------------------------

const ARM_STATIONS = 12;
const HAND_STATIONS = 10;
const WING_STATIONS = ARM_STATIONS + HAND_STATIONS;
/** Samples along the chord (0 leading edge, 1 trailing edge). */
const CHORD = [0, 0.02, 0.06, 0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
/** Airfoil ring: trailing edge, lower surface (back to front), leading edge, upper surface. */
const WING_RING = 2 * (CHORD.length - 1);

function ringSample(column: number): { v: number; top: boolean } {
  const n = CHORD.length - 1;
  if (column === 0) return { v: 1, top: true };
  if (column < n) return { v: CHORD[n - column], top: false };
  if (column === n) return { v: 0, top: true };
  return { v: CHORD[column - n], top: true };
}

const FINGER_ROWS = 12;
const FINGER_RING = 8;
const TAIL_ROWS = 20;
const TAIL_ACROSS = 9;
const TAIL_RING = 2 * TAIL_ACROSS;
const TOE_ROWS = 8;
/** Radius of a toe (m). */
const TOE_RADIUS = 0.0036;
const TOE_RING = 6;
/** Toes: middle, inner, outer, hallux (pointing back). Length (m) and angle in plan view (°). */
const TOES = [
  { length: 0.044, yaw: 0 },
  { length: 0.034, yaw: -24 },
  { length: 0.035, yaw: 22 },
  { length: 0.024, yaw: 180 },
];

// --- the falcon ------------------------------------------------------------------------------------

export class FalconBody {
  readonly parts: FalconPart[];
  readonly body: FalconPart;
  readonly beak: FalconPart;
  readonly eyes: FalconPart;
  readonly wings: FalconPart;
  readonly fingers: FalconPart;
  readonly tail: FalconPart;
  readonly legs: FalconPart;
  readonly feet: FalconPart;

  constructor() {
    this.body = new FalconPart('body', [[BODY_ROWS, BODY_RING]], (_s, r, c) => bodyPaint(r, c));
    this.beak = new FalconPart('beak', [[10, 12]], (_s, r) => {
      const u = r / 9;
      return u < 0.28 ? YELLOW : mix(BEAK, BEAK_TIP, band(u, 0.62, 0.9));
    });
    this.eyes = new FalconPart(
      'eyes',
      [
        [6, 16],
        [6, 16],
      ],
      (_s, r) => (EYE_PROFILE[r][0] > IRIS_RADIUS + 0.0004 ? YELLOW : EYE),
      () => EYE,
    );
    this.wings = new FalconPart(
      'wings',
      [
        [WING_STATIONS, WING_RING],
        [WING_STATIONS, WING_RING],
      ],
      (_s, r, c) => {
        const u = r / (WING_STATIONS - 1);
        const { v, top } = ringSample(c);
        return wingPaint(u, v, top);
      },
    );
    this.fingers = new FalconPart(
      'fingers',
      Array.from({ length: 10 }, () => [FINGER_ROWS, FINGER_RING] as [number, number]),
      (_s, r, c) => {
        const top = c < FINGER_RING / 2;
        const x = r / (FINGER_ROWS - 1);
        if (top) return mix(SLATE_DARK, HOOD, 0.35 * band(x, 0.5, 1));
        return mix(UNDERWING, UNDERWING_BAR, 0.85 * bars(x * 0.2, 0.012, 0.4));
      },
    );
    this.tail = new FalconPart('tail', [[TAIL_ROWS, TAIL_RING]], (_s, r, c) => {
      const x = r / (TAIL_ROWS - 1);
      const top = c < TAIL_ACROSS;
      const tip = band(x, 0.9, 0.97);
      if (top) return mix(mix(SLATE, SLATE_DARK, 0.8 * bars(x * 0.165 + 0.004, 0.024, 0.34)), CREAM, tip * 0.8);
      return mix(mix(UNDERWING, UNDERWING_BAR, 0.8 * bars(x * 0.165, 0.016, 0.4)), WHITE, tip);
    });
    this.legs = new FalconPart(
      'legs',
      [
        [6, 10],
        [5, 8],
        [6, 10],
        [5, 8],
      ],
      (s, r) => (s % 2 === 0 ? mix(CREAM, BAR, 0.8 * bars(r * 0.011, 0.011, 0.4)) : YELLOW),
    );
    this.feet = new FalconPart(
      'feet',
      Array.from({ length: 8 }, () => [TOE_ROWS, TOE_RING] as [number, number]),
      (_s, r) => (r / (TOE_ROWS - 1) > 0.66 ? TALON : YELLOW),
    );
    this.parts = [this.body, this.beak, this.eyes, this.wings, this.fingers, this.tail, this.legs, this.feet];
  }

  /** Rewrites the (world) positions of every part for the pose. */
  pose(pose: FalconPose): void {
    const body = pose.body;
    const origin = pose.position;
    this.poseBody(pose);
    this.poseBeakAndEyes(pose);
    const right = wingSkeleton(pose.wings.right, 1);
    const left = wingSkeleton(pose.wings.left, -1);
    this.poseWing(0, right, pose.wings.right, origin, body, 1);
    this.poseWing(1, left, pose.wings.left, origin, body, -1);
    this.poseFingers(0, right, pose.wings.right, origin, body, 1);
    this.poseFingers(5, left, pose.wings.left, origin, body, -1);
    this.poseTail(pose);
    this.poseLegs(pose);
    for (const part of this.parts) part.finish();
  }

  /** Fixes the winding of shells built inside out (once, in a reference pose). */
  orient(pose: FalconPose): void {
    this.pose(pose);
    for (const part of this.parts) {
      part.signedVolumes().forEach((volume, s) => {
        if (volume < 0) part.flipShell(s);
      });
    }
    this.pose(pose);
  }

  private poseBody(pose: FalconPose): void {
    const part = this.body;
    const body = pose.body;
    const head = pose.head;
    const rows: { center: Vec3; frame: Frame3; section: number[] }[] = [];
    for (const s of BODY_SECTIONS) rows.push({ center: localToWorld(pose.position, body, [s[0], 0, 0]), frame: body, section: s });
    const headRows = HEAD_SECTIONS.map((s) => ({ center: localToWorld(head.position, head.frame, [s[0], 0, 0]), frame: head.frame, section: s }));
    // Neck: Hermite between the end of the body and the start of the head, with blended frames.
    const a = rows[rows.length - 1];
    const b = headRows[0];
    const span = length(sub(b.center, a.center));
    for (let i = 1; i <= NECK_ROWS; i++) {
      const u = i / (NECK_ROWS + 1);
      const u2 = u * u;
      const u3 = u2 * u;
      const center = add(
        add(scale(a.center, 2 * u3 - 3 * u2 + 1), scale(a.frame.forward, (u3 - 2 * u2 + u) * span)),
        add(scale(b.center, -2 * u3 + 3 * u2), scale(b.frame.forward, (u3 - u2) * span)),
      );
      const section = a.section.map((value, k) => (k === 0 ? 0 : value + (b.section[k] - value) * u));
      rows.push({ center, frame: mixFrame(a.frame, b.frame, u), section });
    }
    rows.push(...headRows);
    rows.forEach((row, r) => {
      // The plumage (breathing, fluffing) inflates the torso: most at the breast, none at the head.
      const puff = r < BODY_SECTIONS.length ? 1 + (pose.plumage - 1) * band(row.section[0], -0.12, 0.0) * (1 - band(row.section[0], 0.06, 0.09)) : 1;
      const section = puff === 1 ? row.section : row.section.map((value, k) => (k >= 1 && k <= 3 ? value * puff : value));
      for (let c = 0; c < BODY_RING; c++) part.set(0, r, c, sectionPoint(row.center, row.frame, section, (c / BODY_RING) * Math.PI * 2));
    });
  }

  private poseBeakAndEyes(pose: FalconPose): void {
    const head = pose.head;
    const f = head.frame;
    // Beak: a tube that tapers and curves down at the tip (the hook).
    const beak = this.beak;
    const base: Vec3 = [0.024, -0.004, 0];
    for (let r = 0; r < 10; r++) {
      const u = r / 9;
      const center: Vec3 = [base[0] + 0.024 * u - 0.004 * u ** 4, base[1] - 0.0045 * u - 0.013 * u ** 3.2, 0];
      const width = 0.0085 * (1 - u ** 1.6) + 0.0004;
      const up = 0.0085 * (1 - u ** 1.4) + 0.0004;
      const down = 0.0065 * (1 - u ** 1.1) + 0.0003;
      // Local axis of the beak: it turns downward along the curve.
      const pitch = -(0.35 + 1.5 * u ** 2.4);
      const axisUp: Vec3 = [-Math.sin(pitch), Math.cos(pitch), 0];
      for (let c = 0; c < 12; c++) {
        const a = (c / 12) * Math.PI * 2;
        const h = Math.cos(a) >= 0 ? up : down;
        // Narrow culmen on top: the section tapers toward the ridge of the beak.
        const ridge = 1 - 0.35 * Math.max(0, Math.cos(a)) ** 2;
        const local = add(center, add(scale(axisUp, h * Math.cos(a)), [0, 0, width * ridge * Math.sin(a)]));
        beak.set(0, r, c, localToWorld(head.position, f, local));
      }
    }
    // Eyes: lenses on the surface of the head, looking forward and to the side.
    const section = interpolateHead(EYE_X);
    for (const side of [1, -1] as const) {
      const a = side * EYE_ANGLE;
      const surface = sectionPoint([EYE_X, 0, 0], { forward: [1, 0, 0], up: [0, 1, 0], right: [0, 0, 1] }, section, a < 0 ? Math.PI * 2 + a : a);
      const outward = normalize([0.42, Math.cos(EYE_ANGLE) * 0.8, side * Math.sin(EYE_ANGLE)]);
      const u = normalize(cross(outward, [0, 1, 0]));
      const w = normalize(cross(u, outward));
      const shell = side === 1 ? 0 : 1;
      EYE_PROFILE.forEach(([radius, height], r) => {
        for (let c = 0; c < 16; c++) {
          const angle = (c / 16) * Math.PI * 2 * side;
          const local = add(surface, add(scale(outward, height), add(scale(u, radius * Math.cos(angle)), scale(w, radius * Math.sin(angle)))));
          this.eyes.set(shell, r, c, localToWorld(head.position, f, local));
        }
      });
    }
  }

  private poseWing(shellIndex: number, sk: WingSkeleton, w: WingParams, origin: Vec3, body: Frame3, side: 1 | -1): void {
    const part = this.wings;
    const fold = Math.min(1, Math.max(0, w.fold));
    const patagium = sub(sk.wrist, sk.shoulder);
    const upperLength = length(sub(sk.elbow, sk.shoulder));
    const armLength = upperLength + length(sub(sk.wrist, sk.elbow));
    const stations: { lead: Vec3; trail: Vec3; thickness: number }[] = [];
    for (let i = 0; i < WING_STATIONS; i++) {
      let lead: Vec3;
      let base: Vec3;
      let psi: number;
      let chord: number;
      let thickness: number;
      if (i < ARM_STATIONS) {
        const u = i / (ARM_STATIONS - 1);
        lead = add(sk.shoulder, scale(patagium, u));
        // Feather base on the humerus and forearm, at the same fraction of the length.
        const along = u * armLength;
        base = along <= upperLength ? lerp(sk.shoulder, sk.elbow, along / upperLength) : lerp(sk.elbow, sk.wrist, (along - upperLength) / (armLength - upperLength));
        // The leading edge (patagium) runs ahead of the bones.
        lead = add(lead, scale(sk.direction(sk.angles.hand - Math.PI / 2), 0.004 * Math.sin(Math.PI * u)));
        psi = lerp1(lerp1(96, 80, u), 92, fold) * DEG;
        chord = lerp1(0.14, 0.13, u) + 0.012 * Math.sin(Math.PI * u);
        thickness = lerp1(0.024, 0.009, u);
      } else {
        const b = (i - ARM_STATIONS + 1) / HAND_STATIONS;
        lead = lerp(sk.wrist, sk.hand, b);
        base = lead;
        psi = sk.angles.hand + lerp1(65, 26, b) * (1 - 0.88 * fold) * DEG;
        chord = lerp1(0.14, 0.085, b ** 0.8);
        thickness = lerp1(0.009, 0.004, b);
      }
      const trail = add(base, scale(sk.direction(psi), chord));
      stations.push({ lead, trail, thickness });
    }
    stations.forEach((station, i) => {
      const u = i / (WING_STATIONS - 1);
      const next = stations[Math.min(WING_STATIONS - 1, i + 1)];
      const previous = stations[Math.max(0, i - 1)];
      const spanDir = normalize(sub(next.lead, previous.lead));
      let chordVec = sub(station.trail, station.lead);
      // Twist about the local span: the hand twists more.
      const twist = (3 * DEG + w.twist * u ** 1.2) * side;
      chordVec = rotateAbout(chordVec, spanDir, -twist);
      const chordLength = length(chordVec);
      const chordDir = scale(chordVec, 1 / chordLength);
      let normal = normalize(cross(chordDir, spanDir));
      if (dot(normal, sk.normal) < 0) normal = scale(normal, -1);
      // Flight feathers bending under load: the trailing edge rises a little.
      const bend = 0.05 * w.bend * u;
      for (let c = 0; c < WING_RING; c++) {
        const { v, top } = ringSample(c);
        const camber = 0.065 * chordLength * 4 * v * (1 - v) + bend * chordLength * v * v;
        const shape = v < 0.15 ? Math.sqrt(v / 0.15) : 1 - 0.9 * ((v - 0.15) / 0.85);
        const half = 0.5 * station.thickness * shape * (c === 0 ? 0 : 1);
        const mid = add(station.lead, add(scale(chordDir, v * chordLength), scale(normal, camber)));
        const local = add(mid, scale(normal, top ? half : -half));
        part.set(shellIndex, i, c, localToWorld(origin, body, local));
        const hint = c === 0 || c === CHORD.length - 1 ? 0 : top ? 1 : -1;
        const worldNormal = add(add(scale(body.forward, normal[0]), scale(body.up, normal[1])), scale(body.right, normal[2]));
        part.hints.set(scale(worldNormal, hint), part.shells[shellIndex].index(i, c) * 3);
      }
    });
  }

  private poseFingers(firstShell: number, sk: WingSkeleton, w: WingParams, origin: Vec3, body: Frame3, side: 1 | -1): void {
    const part = this.fingers;
    sk.primaries.forEach((p, k) => {
      const shell = firstShell + k;
      // Feather plane: its direction, the perpendicular in the wing plane and the normal.
      // A fixed-handed transverse axis (toward the trailing edge with the wing spread): no change of
      // orientation when folding.
      let across = normalize(scale(cross(sk.normal, p.direction), -side));
      const twist = (w.twist * 0.8 + 2 * DEG) * side;
      let normal = rotateAbout(sk.normal, p.direction, -twist);
      across = rotateAbout(across, p.direction, -twist);
      normal = normalize(normal);
      // Staggered: the inner ones above the outer ones.
      const stack = (2 - k) * 0.0011;
      // Slight emargination, only on the two outermost (P9 and P10).
      const notch = k >= 3 ? 0.14 : 0.04;
      for (let r = 0; r < FINGER_ROWS; r++) {
        const x = -0.06 + (1.06 * r) / (FINGER_ROWS - 1);
        const along = Math.max(0, x);
        // Width with emargination (the feather narrows in its distal half) and a rounded tip.
        let width = 0.036 * (1 - notch * band(along, 0.45, 0.62)) * (1 - 0.18 * along);
        if (along > 0.82) width *= Math.sqrt(Math.max(0, 1 - ((along - 0.82) / 0.18) ** 2));
        const thickness = 0.0024 * (1 - 0.5 * along) + 0.0004;
        const curl = 0.035 * w.bend * along * along * p.length;
        const shaft = add(p.base, add(scale(p.direction, x * p.length), scale(normal, stack + curl)));
        for (let c = 0; c < FINGER_RING; c++) {
          const a = (c / FINGER_RING) * Math.PI * 2;
          // Narrow outer vane and broad inner vane: the feather is offset behind the rachis.
          const lateral = width * (0.3 + 0.5 * Math.cos(a));
          const local = add(shaft, add(scale(across, lateral), scale(normal, thickness * Math.sin(a) * side)));
          part.set(shell, r, c, localToWorld(origin, body, local));
        }
      }
    });
  }

  private poseTail(pose: FalconPose): void {
    const part = this.tail;
    const body = pose.body;
    const { spread, pitch, roll } = pose.tail;
    const base = FALCON_DIMS.tailBase;
    // Tail axis pointing back, with pitch about the body's lateral axis and a roll of its own.
    let axis: Vec3 = [-Math.cos(pitch), Math.sin(pitch), 0];
    let lateral: Vec3 = [0, 0, 1];
    let normal = normalize(cross(lateral, axis));
    if (normal[1] < 0) normal = scale(normal, -1);
    lateral = rotateAbout(lateral, axis, roll);
    normal = rotateAbout(normal, axis, roll);
    axis = normalize(axis);
    const half = Math.max(0.04, spread / 2);
    const openness = Math.min(1, spread / (100 * DEG));
    for (let r = 0; r < TAIL_ROWS; r++) {
      const rho = 0.04 + (0.96 * r) / (TAIL_ROWS - 1);
      for (let c = 0; c < TAIL_RING; c++) {
        const top = c < TAIL_ACROSS;
        const j = top ? c : TAIL_RING - 1 - c;
        const q = j / (TAIL_ACROSS - 1) - 0.5; // −0.5 … 0.5 across
        const phi = 2 * q * half;
        // Length per feather: the outer ones slightly shorter; when closed, an almost straight tip.
        const lengthHere = FALCON_DIMS.tailLength * (1 - 0.1 * openness * (2 * q) ** 2);
        const radial = rho * lengthHere;
        const closed = (0.021 + 0.009 * rho) * 2 * q;
        const width = Math.abs(radial * Math.sin(phi)) > Math.abs(closed) ? radial * Math.sin(phi) : closed;
        const along = radial * Math.cos(phi);
        const dome = 0.01 * (1 - (2 * q) ** 2) * rho;
        const thickness = 0.0045 * (1 - 0.7 * rho) + 0.0008;
        const local = add(
          base,
          add(add(scale(axis, along), scale(lateral, width)), scale(normal, dome + (top ? thickness : -thickness))),
        );
        part.set(0, r, c, localToWorld(pose.position, body, local));
      }
    }
  }

  private poseLegs(pose: FalconPose): void {
    const body = pose.body;
    const { extend, grip, feet } = pose.legs;
    const perched = feet !== null;
    const toWorld = (p: Vec3) => localToWorld(pose.position, body, p);
    [1, -1].forEach((side, legIndex) => {
      const s = side as 1 | -1;
      const hip = toWorld([-0.012, -0.03, 0.021 * s]);
      // Foot tucked under the tail in flight; forward and down when landing.
      const tuckedAnkle: Vec3 = [-0.03, -0.028, 0.015 * s];
      const tuckedFoot: Vec3 = [-0.066, -0.024, 0.011 * s];
      const forwardAnkle: Vec3 = [0.035, -0.085, 0.03 * s];
      const forwardFoot: Vec3 = [0.078, -0.105, 0.028 * s];
      let ankle = toWorld(lerp(tuckedAnkle, forwardAnkle, extend));
      let foot = toWorld(lerp(tuckedFoot, forwardFoot, extend));
      let toeForward = normalize(sub(foot, ankle));
      let toeUp = body.up;
      let wrap = 0;
      let barCenter: Vec3 = [0, 0, 0];
      const bar = perch();
      if (perched && feet) {
        // Perched: the foot on the bar (one toe radius from its surface) and the ankle by two-bone
        // IK, bent backward. The toes curl around the bar's axis.
        const reach = Math.min(1, Math.max(0, (pose.t - 10.95) / 0.3));
        const eased = reach * reach * (3 - 2 * reach);
        barCenter = sub(feet[legIndex], [0, bar.barRadius, 0]);
        const target = add(barCenter, [0, bar.barRadius + TOE_RADIUS, 0]);
        foot = lerp(foot, target, eased);
        ankle = twoBoneJoint(hip, foot, 0.058, 0.052, scale(horizontal(body.forward), -1));
        toeForward = lerp(toeForward, bar.heading, reach);
        toeUp = normalize(lerp(toeUp, [0, 1, 0], reach));
        wrap = eased * grip;
      }
      // Feathered thigh (from the body to the ankle) and yellow tarsus (from the ankle to the foot).
      this.tube(this.legs, legIndex * 2, hip, ankle, (u) => 0.016 - 0.006 * u, 10);
      this.tube(this.legs, legIndex * 2 + 1, ankle, foot, () => 0.0048, 8);
      // Toes: they spread when landing and close around the bar.
      const toeRight = normalize(cross(toeForward, toeUp));
      TOES.forEach((toe, k) => {
        const yaw = ((toe.yaw + (toe.yaw === 180 ? 0 : toe.yaw * 0.5 * (1 - grip) * extend)) * Math.PI) / 180;
        const direction = normalize(add(scale(toeForward, Math.cos(yaw)), scale(toeRight, Math.sin(yaw) * s)));
        const flight = 1 - extend;
        const curl = lerp1(0.25 + 0.1 * flight, 1.9, grip);
        const points: Vec3[] = [];
        // Curl around the bar: an arc centered on its axis, in the plane perpendicular to it.
        const wrapRadius = bar.barRadius + TOE_RADIUS;
        const across = normalize(sub(direction, scale(bar.barDirection, dot(direction, bar.barDirection))));
        const slide = dot(direction, bar.barDirection);
        for (let r = 0; r < TOE_ROWS; r++) {
          const u = r / (TOE_ROWS - 1);
          const angle = curl * u;
          // Arc in the (direction, down) plane: it curls downward.
          const radius = toe.length / Math.max(0.2, curl);
          const along = curl < 0.05 ? toe.length * u : radius * Math.sin(angle);
          const drop = curl < 0.05 ? 0 : radius * (1 - Math.cos(angle));
          const free = add(foot, add(scale(direction, along), scale(toeUp, -drop - 0.002)));
          if (wrap <= 0) {
            points.push(free);
            continue;
          }
          const theta = (toe.length * u * Math.sqrt(1 - slide * slide)) / wrapRadius;
          const around = add(barCenter, add(scale([0, 1, 0], wrapRadius * Math.cos(theta)), scale(across, wrapRadius * Math.sin(theta))));
          const wrapped = add(around, scale(bar.barDirection, toe.length * u * slide));
          points.push(lerp(free, wrapped, wrap));
        }
        this.polyTube(this.feet, legIndex * 4 + k, points, (u) => (u < 0.66 ? TOE_RADIUS - 0.001 * u : 0.0034 * (1 - (u - 0.66) / 0.34) + 0.0003));
      });
    });
  }

  private tube(part: FalconPart, shell: number, a: Vec3, b: Vec3, radius: (u: number) => number, ring: number): void {
    const rows = part.shells[shell].rows;
    const points = Array.from({ length: rows }, (_, r) => lerp(a, b, r / (rows - 1)));
    this.polyTube(part, shell, points, radius, ring);
  }

  private polyTube(part: FalconPart, shell: number, points: Vec3[], radius: (u: number) => number, ring = part.shells[shell].ring): void {
    const rows = points.length;
    for (let r = 0; r < rows; r++) {
      const u = r / (rows - 1);
      const axis = normalize(sub(points[Math.min(rows - 1, r + 1)], points[Math.max(0, r - 1)]));
      let side = cross(axis, [0, 1, 0]);
      if (length(side) < 1e-4) side = cross(axis, [1, 0, 0]);
      side = normalize(side);
      const up = normalize(cross(side, axis));
      const rad = radius(u);
      for (let c = 0; c < ring; c++) {
        const angle = (c / ring) * Math.PI * 2;
        part.set(shell, r, c, add(points[r], add(scale(up, rad * Math.cos(angle)), scale(side, rad * Math.sin(angle)))));
      }
    }
  }
}

/** Eye profile: [radius, height above the surface] from the base to the apex. */
const EYE_PROFILE: [number, number][] = [
  [EYE_RADIUS * 0.96, -0.003],
  [EYE_RADIUS, -0.0008],
  [IRIS_RADIUS + 0.0009, -0.0002],
  [IRIS_RADIUS - 0.0002, 0.0002],
  [IRIS_RADIUS * 0.6, 0.0008],
  [0.0005, 0.0011],
];

const DEG = Math.PI / 180;

function lerp1(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function horizontal(v: Vec3): Vec3 {
  return normalize([v[0], 0, v[2]]);
}

function rotateAbout(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
}

/** Head section interpolated at x. */
function interpolateHead(x: number): number[] {
  for (let i = 0; i < HEAD_SECTIONS.length - 1; i++) {
    const [a, b] = [HEAD_SECTIONS[i], HEAD_SECTIONS[i + 1]];
    if (x >= a[0] && x <= b[0]) {
      const t = (x - a[0]) / (b[0] - a[0]);
      return a.map((value, k) => value + (b[k] - value) * t);
    }
  }
  return HEAD_SECTIONS[HEAD_SECTIONS.length - 1];
}

/** Middle joint of a two-bone chain (analytic IK), bent toward `bend`. */
function twoBoneJoint(root: Vec3, end: Vec3, l1: number, l2: number, bend: Vec3): Vec3 {
  const toEnd = sub(end, root);
  const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, length(toEnd)));
  const axis = normalize(toEnd);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let perpendicular = sub(bend, scale(axis, dot(bend, axis)));
  if (length(perpendicular) < 1e-6) perpendicular = cross(axis, [0, 0, 1]);
  perpendicular = normalize(perpendicular);
  return add(root, add(scale(axis, a), scale(perpendicular, h)));
}
