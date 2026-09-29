// The launcher's tesseract in its Petrie projection (the B4 Coxeter plane): the 4D axes land at
// 0°, 45°, 90° and 135°, so the 16 vertices form two concentric octagons and the figure has order-8
// symmetry, the same mirror thesis as the page. Pure module, no three.

export type TesseractRing = 'outer' | 'inner' | 'spoke';

export interface TesseractEdge {
  a: number;
  b: number;
  /** Outer octagon, inner octagram, or a spoke between the two. */
  ring: TesseractRing;
}

export interface Tesseract {
  /** Vertices in the plane, with the outer octagon at radius 1 (y pointing up). */
  points: [number, number][];
  /** Radius of the inner octagon (≈ 0.414, that is, √2 − 1). */
  inner: number;
  edges: TesseractEdge[];
}

export function petrieTesseract(): Tesseract {
  const axes = [0, 1, 2, 3].map((k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
  const raw: [number, number][] = [];
  for (let v = 0; v < 16; v++) {
    let x = 0;
    let y = 0;
    for (let k = 0; k < 4; k++) {
      const s = v & (1 << k) ? 1 : -1;
      x += s * axes[k][0];
      y += s * axes[k][1];
    }
    raw.push([x, y]);
  }
  const outer = Math.max(...raw.map(([x, y]) => Math.hypot(x, y)));
  const points = raw.map(([x, y]) => [x / outer, y / outer] as [number, number]);
  const isOuter = (i: number) => Math.hypot(...points[i]) > 0.7;
  const edges: TesseractEdge[] = [];
  for (let a = 0; a < 16; a++) {
    for (let k = 0; k < 4; k++) {
      const b = a ^ (1 << k);
      if (b < a) continue;
      const ring: TesseractRing = isOuter(a) && isOuter(b) ? 'outer' : !isOuter(a) && !isOuter(b) ? 'inner' : 'spoke';
      edges.push({ a, b, ring });
    }
  }
  const innerRadius = Math.min(...points.map(([x, y]) => Math.hypot(x, y)));
  return { points, inner: innerRadius, edges };
}
