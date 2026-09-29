// Low-poly geometry built in code: lathes, the tin rocket, five-pointed stars and rings with
// accumulated distance (for the dashed or dotted stroke).
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Shape,
  Vector2,
} from 'three';

/** Golden ratio (inner radius of the star: R/φ²). */
const PHI = (1 + Math.sqrt(5)) / 2;

/** Profile of a tin top with radius 1: spindle, superelliptic shoulder and cone down to the tip. */
export function topProfile(): Vector2[] {
  const points: Vector2[] = [new Vector2(0, -0.52)];
  // Shoulder: r(y) = (1 − |y/H|^p)^(1/p), p = 2.6, sampled at 5 heights.
  const H = 0.26;
  const p = 2.6;
  const center = 0.04;
  for (const y of [-0.18, -0.1, 0.04, 0.16, 0.26]) {
    const u = Math.min(1, Math.abs((y - center) / H));
    const r = Math.pow(Math.max(0, 1 - Math.pow(u, p)), 1 / p);
    points.push(new Vector2(Math.max(r, 0.18), y));
  }
  points.push(new Vector2(0.14, 0.3), new Vector2(0.14, 0.62), new Vector2(0, 0.66));
  return points;
}

/** Height of the tip below the top's center (radius 1). */
export const TOP_TIP = 0.52;

export function topGeometry(segments: number): BufferGeometry {
  return new LatheGeometry(topProfile(), segments).toNonIndexed();
}

/** The Whirl's body: a low tin top. */
export function whirlGeometry(): BufferGeometry {
  const profile = [
    new Vector2(0.0001, -0.3),
    new Vector2(0.1, -0.16),
    new Vector2(0.8, -0.05),
    new Vector2(0.84, 0),
    new Vector2(0.8, 0.04),
    new Vector2(0.0001, 0.1),
  ];
  return new LatheGeometry(profile, 24).toNonIndexed();
}

export function paint(geometry: BufferGeometry, color: Color): BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
}

/** Merges non-indexed geometries that have position and color. */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  let total = 0;
  for (const part of parts) total += part.attributes.position.count;
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  let offset = 0;
  for (const part of parts) {
    positions.set(part.attributes.position.array as Float32Array, offset * 3);
    colors.set(part.attributes.color.array as Float32Array, offset * 3);
    offset += part.attributes.position.count;
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(positions, 3));
  out.setAttribute('color', new BufferAttribute(colors, 3));
  return out;
}

export interface RocketColors {
  body: Color;
  nose: Color;
  fins: Color;
  windows: Color;
}

/**
 * Tin rocket along +x (nose toward +x), centered: a tangent ogive (R 0.07, L 0.22) on a 0.30 body,
 * four fins at 90° and two celluloid portholes on top. ~110 triangles.
 */
export function rocketGeometry(colors: RocketColors, scale = 1): BufferGeometry {
  const R = 0.07;
  const L = 0.22;
  const rho = (R * R + L * L) / (2 * R);
  const body: Vector2[] = [new Vector2(0.0001, 0), new Vector2(0.058, 0), new Vector2(R, 0.04), new Vector2(R, 0.3)];
  const nose: Vector2[] = [];
  for (let i = 0; i <= 4; i++) {
    const x = L - (L * i) / 4; // distance from the tip
    const r = Math.sqrt(rho * rho - (L - x) * (L - x)) + R - rho;
    nose.push(new Vector2(Math.max(r, 0.0001), 0.3 + (L - x)));
  }
  const bodyGeo = paint(new LatheGeometry(body, 8), colors.body);
  const noseGeo = paint(new LatheGeometry(nose, 8), colors.nose);

  const finShape = new Shape();
  finShape.moveTo(0, R);
  finShape.lineTo(0, 0.17);
  finShape.lineTo(0.13, R);
  finShape.lineTo(0, R);
  const fins: BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    const fin = new ExtrudeGeometry(finShape, { depth: 0.016, bevelEnabled: false });
    // The shape lies in the plane (axis y → shape x, radius → shape y).
    const m = new Matrix4()
      .makeRotationY(Math.PI / 4 + (k * Math.PI) / 2)
      .multiply(new Matrix4().set(0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, -0.008, 0, 0, 0, 1));
    fin.applyMatrix4(m);
    fins.push(paint(fin, colors.fins));
  }

  const windows: BufferGeometry[] = [];
  for (const y of [0.13, 0.21]) {
    const disc = new CircleGeometry(0.026, 8);
    // Facing the lathe's −x, which ends up as "up" once the rocket lies down along +x.
    disc.applyMatrix4(new Matrix4().makeRotationY(-Math.PI / 2));
    disc.applyMatrix4(new Matrix4().makeTranslation(-R - 0.002, y, 0));
    windows.push(paint(disc, colors.windows));
  }

  const geometry = merge([bodyGeo, noseGeo, ...fins, ...windows]);
  // From the lathe axis (+y) to the rocket axis (+x), centered along its length.
  geometry.applyMatrix4(new Matrix4().makeTranslation(0, -0.26, 0));
  geometry.applyMatrix4(new Matrix4().makeRotationZ(-Math.PI / 2));
  geometry.applyMatrix4(new Matrix4().makeScale(scale, scale, scale));
  return geometry;
}

/** Five-pointed lithographic star: a fan of 10 vertices alternating R and R/φ². */
export function starFan(): Float32Array {
  const out: number[] = [];
  const outer = 1;
  const inner = 1 / (PHI * PHI);
  const point = (i: number): [number, number] => {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  for (let i = 0; i < 10; i++) {
    const [ax, ay] = point(i);
    const [bx, by] = point(i + 1);
    out.push(0, 0, 0, ax, ay, 0, bx, by, 0);
  }
  return new Float32Array(out);
}

/** Points of a Fibonacci sphere (golden angle): a nearly uniform sky. */
export function fibonacciSphere(count: number, radius: number): [number, number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    points.push([Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius]);
  }
  return points;
}

/** A circle on the ecliptic as line segments, with accumulated distance for the stroke. */
export function ringSegments(radius: number, segments = 96): { positions: number[]; dist: number[] } {
  const positions: number[] = [];
  const dist: number[] = [];
  const step = (2 * Math.PI * radius) / segments;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    positions.push(radius * Math.cos(a0), 0, -radius * Math.sin(a0), radius * Math.cos(a1), 0, -radius * Math.sin(a1));
    dist.push(i * step, (i + 1) * step);
  }
  return { positions, dist };
}
