import { describe, expect, test } from 'vitest';
import { EPURE } from './epure';
import { columnPlanSvg, columnSvg, COLUMN_BASE, COLUMN_SEGMENTS, countTips, doubleTwistColumn, section, tesseractSvg, tesseractViews } from './method';

describe('sheet 000: geometry (13.1)', () => {
  test('the intersection doubles the points in each segment', () => {
    const segments = doubleTwistColumn(COLUMN_BASE, COLUMN_SEGMENTS);
    expect(segments.map((t) => [t.base.tips, t.top.tips])).toEqual([
      [6, 12],
      [12, 24],
      [24, 48],
    ]);
    // With no twist, the section is the base: the same points.
    expect(countTips(section(COLUMN_BASE, 0))).toBe(6);
  });

  test('each view of the tesseract draws 32 edges between 16 vertices ("Tesseract projection")', () => {
    const { vertices, edges } = tesseractViews();
    expect(vertices).toHaveLength(16);
    expect(edges).toHaveLength(32);
    const svg = tesseractSvg();
    for (const view of ['elevation', 'plan']) {
      const d = new RegExp(`<path class="ep-edges" data-view="${view}" d="([^"]+)"`).exec(svg)![1];
      expect(d.match(/M/g)).toHaveLength(32);
      expect(d.match(/L/g)).toHaveLength(32);
      const g = new RegExp(`<g class="ep-vertices" data-view="${view}">(.*?)</g>`).exec(svg)![1];
      expect(g.match(/<circle/g)).toHaveLength(16);
    }
  });

  test('the column draws the base and one section per segment in plan', () => {
    const svg = columnSvg();
    expect([...svg.matchAll(/data-tips="(\d+)"/g)].map((m) => Number(m[1]))).toEqual([6, 12, 24, 48]);
  });

  test('the column and the tesseract fit in the 480×600 épure: elevation above the ground line and plan below', () => {
    for (const svg of [columnSvg(), tesseractSvg()]) {
      expect(svg).toContain(`viewBox="0 0 ${EPURE.width} ${EPURE.height}"`);
      for (const [view, lo, hi] of [
        ['elevation', EPURE.elevTop, EPURE.elevBottom],
        ['plan', EPURE.planTop, EPURE.planBottom],
      ] as const) {
        const marks = [...svg.matchAll(new RegExp(`<g [^>]*data-view="${view}"[^>]*>[\\s\\S]*?</g>|<(?:path|polyline) [^>]*data-view="${view}"[^>]*/>`, 'g'))].map((m) => m[0]);
        expect(marks.length).toBeGreaterThan(0);
        const ys = marks.flatMap((m) => [
          ...[...m.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((p) => Number(p[2])),
          ...[...m.matchAll(/cy="([\d.]+)"/g)].map((p) => Number(p[1])),
          ...[...m.matchAll(/points="([^"]+)"/g)].flatMap((p) => p[1].split(' ').map((xy) => Number(xy.split(',')[1]))),
        ]);
        expect(ys.length).toBeGreaterThan(0);
        for (const y of ys) {
          expect(y).toBeGreaterThanOrEqual(lo - 0.05);
          expect(y).toBeLessThanOrEqual(hi + 0.05);
        }
      }
    }
  });

  test('the index thumbnail is the same plan of the column, cropped to its sections', () => {
    const thumb = columnPlanSvg('index__method');
    const sections = (svg: string) => [...svg.matchAll(/<path class="ep-section"[^>]*\/>/g)].map((m) => m[0]);
    expect(sections(thumb)).toEqual(sections(columnSvg()));
    const [x, y, w, h] = /viewBox="([^"]+)"/.exec(thumb)![1].split(' ').map(Number);
    expect(w).toBe(h);
    const coords = sections(thumb).flatMap((p) => [.../d="([^"]+)"/.exec(p)![1].matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]));
    expect(coords.length).toBeGreaterThan(1000);
    for (const [px, py] of coords) {
      expect(px).toBeGreaterThanOrEqual(x);
      expect(px).toBeLessThanOrEqual(x + w);
      expect(py).toBeGreaterThanOrEqual(y);
      expect(py).toBeLessThanOrEqual(y + h);
    }
  });

  test('English titles ("as an épure") and the name taken from the title, with the description separate', () => {
    for (const [svg, id, title] of [
      [columnSvg(), 'method-column', 'Double-twist column, as an épure'],
      [tesseractSvg(), 'method-tesseract', 'Tesseract, as an épure'],
    ]) {
      expect(svg).toContain(`aria-labelledby="${id}-title" aria-describedby="${id}-desc"`);
      expect(svg).toContain(`<title id="${id}-title">${title}</title>`);
    }
  });
});
