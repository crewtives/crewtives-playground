import { describe, expect, it } from 'vitest';
import type { SceneMeta } from '../../../engine/pack/format';
import { falconCenter, falconReadout, goldenRectangles, PHI, spiralAngle, spiralRadius, TIMES } from '../../../pipeline/scenes/falconPhi';
import { DIAGRAM_Y, recolorDiagram } from './diagram';
import { measureSpiral } from './measure';
import { dimNeons, neonFamily } from './neons';
import { flightTable } from './plots';
import { phiDigits } from './phi';
import { readoutText } from './readouts';
import { falconStats } from './stats';

describe('phiDigits', () => {
  it('matches φ in double precision (digits truncated, not rounded)', () => {
    expect(phiDigits(16).slice(0, 15)).toBe(PHI.toFixed(15).slice(0, 15));
    expect(phiDigits(11)).toBe('1.6180339887');
  });

  it('is exact: (2·D − 10ⁿ)² ≤ 5·10²ⁿ < (2·D − 10ⁿ + 2)²', () => {
    const n = 200;
    const text = phiDigits(n + 1).replace('.', '');
    const D = BigInt(text);
    const scale = 10n ** BigInt(n);
    const s = 2n * D - scale;
    expect(s * s <= 5n * scale * scale).toBe(true);
    expect((s + 2n) * (s + 2n) > 5n * scale * scale).toBe(true);
  });
});

describe('readouts of the "NOW"', () => {
  it('come from the shared module for the whole frame', () => {
    for (const frame of [0, 60, 125, 192, 228, 262, 384, 449]) {
      const r = falconReadout(frame / 30);
      const text = readoutText(frame, 30);
      expect(text.theta).toBe(r.angle.toFixed(3));
      expect(text.radius).toBe(r.radius.toFixed(2));
      expect(text.span).toBe(r.wingspan.toFixed(2));
      expect(text.alt).toBe(r.altitude.toFixed(1));
    }
  });

  it('on the spiral, the ratio shown is φ; off the spiral, none is shown', () => {
    expect(readoutText(192, 30).ratio).toBe(PHI.toFixed(4));
    expect(readoutText(Math.ceil(TIMES.spiralEnd * 30) + 5, 30).ratio).toBe('—');
  });

  it('the short phone note says why the ratio is missing or that it locked onto φ', () => {
    expect(readoutText(0, 30).ratioBrief).toBe('first ¼ turn');
    expect(readoutText(192, 30).ratioBrief).toBe('= φ');
    expect(readoutText(Math.ceil(TIMES.spiralEnd * 30) + 5, 30).ratioBrief).toBe('off spiral');
  });
});

describe('flight table', () => {
  const table = flightTable();

  it('inverts the accumulated angle on the spiral segment', () => {
    for (const t of [1, 2.5, 4, 5.5, 7]) {
      expect(table.timeAtTheta(spiralAngle(t))).toBeCloseTo(t, 1);
    }
  });

  it('a quarter turn earlier, the radius is φ times larger', () => {
    for (const t of [4, 5, 6, 7]) {
      const earlier = table.quarterEarlier(t)!;
      expect(spiralRadius(earlier) / spiralRadius(t)).toBeCloseTo(PHI, 2);
    }
  });
});

describe('measurement on the points', () => {
  it('finds φ on a path that follows the spiral', () => {
    const fps = 30;
    const count = 450;
    const centers = new Float32Array(count * 3);
    for (let f = 0; f < count; f++) centers.set(falconCenter(f / fps), f * 3);
    const measured = measureSpiral({ centers, headings: new Float32Array(count) }, fps)!;
    expect(measured.pairs).toBeGreaterThan(100);
    expect(measured.worst).toBeLessThan(0.005);
    expect(measured.turns).toBeGreaterThan(1);
  });
});

describe('4D pack figures', () => {
  const meta = (frames: number, dynamic: number): SceneMeta =>
    ({
      frameCount: frames,
      counts: { static: 1, dynamic },
      source: { width: 320, height: 180, columns: 1, rows: 1, pages: [] },
      synthetic: true,
    }) as unknown as SceneMeta;

  it('change with a different 4D pack', () => {
    const a = falconStats(meta(450, 1_800_000), 4000);
    const b = falconStats(meta(300, 900_000), null);
    expect(a.perFrame).toBe('4,000');
    expect(b.perFrame).toBe('3,000');
    expect(a.source).not.toBe(b.source);
    expect(b.correspondence).toBe('No');
  });
});

describe('golden diagram', () => {
  // Test box: 0–100 m on each axis, so quantizing by hand is easy.
  const bbox = { min: [-50, 0, -50] as const, max: [50, 100, 50] as const };
  const q = (v: number, lo: number) => Math.round(((v - lo) / 100) * 65535);
  const point = (x: number, y: number, z: number) => [q(x, -50), q(y, 0), q(z, -50)];
  const [ax, az] = goldenRectangles(1)[0].rect[0];

  it('recolors only the cyan points on the diagram plane, inside the largest rectangle', () => {
    const positions = new Uint16Array([
      ...point(ax, DIAGRAM_Y, az), // diagram cyan: recolored
      ...point(ax, DIAGRAM_Y, az), // diagram gold (the spiral): not
      ...point(ax, DIAGRAM_Y - 0.4, az), // cyan on the rooftop: not
      ...point(40, DIAGRAM_Y, 40), // cyan far from the diagram: not
    ]);
    const colors = new Uint8Array([40, 230, 255, 255, 170, 60, 40, 230, 255, 40, 230, 255]);
    expect(recolorDiagram({ positions, colors }, bbox, [20, 99, 63])).toBe(1);
    expect(Array.from(colors)).toEqual([20, 99, 63, 255, 170, 60, 40, 230, 255, 40, 230, 255]);
  });
});

describe('city neons', () => {
  const look = { cyan: [15, 106, 130] as const, magenta: [122, 29, 92] as const, body: 42 / 255 };

  it('recognizes the two neons of the bake and leaves the city, the gold and the recolored diagram alone', () => {
    expect(neonFamily(63, 237, 255)).toBe('cyan'); // CYAN
    expect(neonFamily(84, 255, 255)).toBe('cyan'); // clipped cyan tube
    expect(neonFamily(255, 74, 194)).toBe('magenta'); // MAGENTA
    expect(neonFamily(255, 99, 254)).toBe('magenta'); // clipped magenta tube
    expect(neonFamily(255, 158, 160)).toBe('magenta'); // edge of the LED disk, between the gold and the magenta
    expect(neonFamily(255, 206, 149)).toBeNull(); // warm window
    expect(neonFamily(255, 196, 90)).toBeNull(); // φ gold
    expect(neonFamily(20, 99, 63)).toBeNull(); // diagram in low phosphor
    expect(neonFamily(206, 228, 255)).toBeNull(); // cool window
    expect(neonFamily(86, 99, 116)).toBeNull(); // slate
    expect(neonFamily(52, 32, 77)).toBeNull(); // violet haze
  });

  it('tubes end up in the deep tone; bodies, at the dim phosphor value; nothing gets brighter', () => {
    const colors = new Uint8Array([
      84, 255, 255, // cyan tube
      255, 99, 254, // magenta tube
      190, 52, 146, // magenta lightbox body
      45, 176, 190, // cyan lightbox body
      20, 60, 70, // wall barely tinted cyan: darker than the deep tone
      255, 196, 90, // gold: left untouched
    ]);
    expect(dimNeons(colors, look)).toEqual({ cyan: 3, magenta: 2 });
    const px = (i: number) => Array.from(colors.slice(i * 3, i * 3 + 3));
    expect(px(0)).toEqual([15, 106, 130]);
    expect(px(1)).toEqual([122, 29, 92]);
    for (const i of [2, 3]) expect(Math.max(...px(i))).toBeLessThanOrEqual(42);
    expect(Math.max(...px(4))).toBeLessThanOrEqual(70);
    expect(px(5)).toEqual([255, 196, 90]);
    // No recolored point reads as a full neon again.
    for (const i of [0, 1, 2, 3, 4]) expect(Math.max(...px(i))).toBeLessThan(140);
  });
});
