// Fixes from the final review: the launcher's Petrie tesseract, the lathe faces each in a single
// glass with its outline, the honeycomb's single ruby, and the newborn cells in pollen.
import { describe, expect, it } from 'vitest';
import { petrieTesseract } from './index/tesseract';
import { GLASS, combMesh, rosetteMesh, snapFacets } from './specimens/mesh';
import { leafFrames, type RosetteParams } from './lathe/rosette';

describe('launcher tesseract', () => {
  const t = petrieTesseract();

  it('16 vertices and 32 edges: octagon (8), octagram (8) and spokes (16)', () => {
    expect(t.points).toHaveLength(16);
    expect(t.edges).toHaveLength(32);
    const count = (ring: string) => t.edges.filter((e) => e.ring === ring).length;
    expect([count('outer'), count('inner'), count('spoke')]).toEqual([8, 8, 16]);
    expect(t.inner).toBeCloseTo(Math.SQRT2 - 1, 6);
  });

  it('order-8 symmetry: a 45° turn maps every vertex and every edge onto another one', () => {
    const c = Math.cos(Math.PI / 4);
    const s = Math.sin(Math.PI / 4);
    const key = ([x, y]: [number, number]) => `${x.toFixed(6)},${y.toFixed(6)}`.replace(/-0\.000000/g, '0.000000');
    const at = new Map(t.points.map((p, i) => [key(p), i]));
    const map = t.points.map(([x, y]) => at.get(key([x * c - y * s, x * s + y * c])));
    expect(map.every((i) => i !== undefined)).toBe(true);
    const edges = new Set(t.edges.map((e) => [e.a, e.b].sort((a, b) => a - b).join('-')));
    for (const e of t.edges) expect(edges.has([map[e.a]!, map[e.b]!].sort((a, b) => a - b).join('-'))).toBe(true);
  });
});

describe('lathe faces', () => {
  const echeveria: RosetteParams = { species: 'echeveria', leaves: 21, plump: 0.5, blush: 0.6, stretch: 0 };
  const palette = Object.values(GLASS).map((c) => c.map((v) => v.toFixed(6)).join(','));

  it('each face is a single color from the 16-color palette (the dither never mixes tones within a face)', () => {
    for (const species of ['echeveria', 'aloe-cw'] as const) {
      const mesh = snapFacets(rosetteMesh({ ...echeveria, species }, { raw: true, nowKeyline: true }), [-2, -2.6, 4]);
      const c = mesh.colors;
      for (let o = 0; o < c.length; o += 9) {
        const v0 = [c[o], c[o + 1], c[o + 2]].map((v) => v.toFixed(6)).join(',');
        expect(palette).toContain(v0);
        expect([c[o + 3], c[o + 4], c[o + 5]].map((v) => v.toFixed(6)).join(',')).toBe(v0);
        expect([c[o + 6], c[o + 7], c[o + 8]].map((v) => v.toFixed(6)).join(',')).toBe(v0);
      }
    }
  });

  it('the light separates the faces: there is full glass and shadow, never an invented third tone', () => {
    const mesh = snapFacets(rosetteMesh(echeveria, { raw: true }), [-2, -2.6, 4]);
    const used = new Set<string>();
    for (let o = 0; o < mesh.colors.length; o += 9) used.add(mesh.colors.slice(o, o + 3).map((v) => v.toFixed(6)).join(','));
    const hex = (c: number[]) => c.map((v) => v.toFixed(6)).join(',');
    expect(used.has(hex(GLASS.glaucous))).toBe(true);
    expect(used.has(hex(GLASS.bottle))).toBe(true);
  });

  it('each of the 21 leaves carries its outline (two edges per segment plus the base)', () => {
    const outline: number[] = [];
    rosetteMesh(echeveria, { raw: true, outline });
    const leaves = leafFrames(echeveria).length;
    const segments = outline.length / 6;
    expect(leaves).toBe(21);
    expect(segments).toBe(leaves * (7 * 2 + 1));
  });
});

describe('a single ruby', () => {
  it('the newborn cells of a honeycomb taken into the chamber are pollen, not ruby', () => {
    const cells = '3'.repeat(37);
    const mesh = combMesh(3, 1, cells);
    const ruby = GLASS.now.map((v) => v.toFixed(6)).join(',');
    for (let o = 0; o < mesh.colors.length; o += 3) expect(mesh.colors.slice(o, o + 3).map((v) => v.toFixed(6)).join(',')).not.toBe(ruby);
  });
});
