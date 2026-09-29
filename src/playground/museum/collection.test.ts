import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { decodeGarden, gardenFromHash } from '../bloomscope/garden';
import { DEFAULT_GARDEN, GOLDEN_ANGLE as SOW_GOLDEN_DEG } from '../bloomscope/specimens/spec';
import { seedPosition, SOW_RATE, START_SEEDS } from '../bloomscope/sow/sow';
import { GOLDEN_ANGLE as FALCON_GOLDEN_RAD, SPIRAL, SPIRAL_B } from '../../pipeline/scenes/falconPhi';
import { fallRadius, WHALE_FALL } from '../../pipeline/scenes/whaleFall';
import { CAT_CREDIT, LAUNCHER } from '../shared/worlds';
import {
  featuredSheet,
  FIXED_GARDEN_HASH,
  FIXED_GARDEN_LINK,
  GATE_ROW,
  METHOD_SHEET,
  RETIRED_NUMBERS,
  SHEETS,
  SOW_EXPECTED,
} from './collection';

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const sheet = (n: string) => SHEETS.find((s) => s.number === n)!;

describe('museum collection', () => {
  test('three-digit numbers, no repeats, no 000 and no retired numbers', () => {
    const numbers = SHEETS.map((s) => s.number);
    for (const n of numbers) expect(n).toMatch(/^\d{3}$/);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).not.toContain(METHOD_SHEET.number);
    for (const retired of RETIRED_NUMBERS) expect(numbers).not.toContain(retired);
    expect(numbers).toEqual(['001', '002', '003', '004']);
  });

  test('each wall text has 80 words or fewer', () => {
    for (const s of SHEETS) expect(words(s.text), s.number).toBeLessThanOrEqual(80);
  });

  test('each rule uses the constants of its module, in its unit', () => {
    expect(sheet('001').rule).toBeNull();
    // 002: the golden spiral and the golden angle in RADIANS from src/pipeline/scenes/falconPhi.ts.
    expect(sheet('002').rule!.constants).toEqual({ r0: SPIRAL.r0, b: SPIRAL_B, goldenAngleRad: FALCON_GOLDEN_RAD });
    expect(FALCON_GOLDEN_RAD).toBeCloseTo(2.39996, 4);
    // 003: the fall from src/pipeline/scenes/whaleFall.ts.
    expect(sheet('003').rule!.constants).toEqual({ A: WHALE_FALL.A, T: WHALE_FALL.T, rs: WHALE_FALL.rs });
    expect(sheet('003').rule!.fn).toBe(fallRadius);
    // 004: the golden angle in DEGREES from specimens/spec.ts and the Sow function.
    expect(sheet('004').rule!.constants).toEqual({ goldenAngleDeg: SOW_GOLDEN_DEG });
    expect(SOW_GOLDEN_DEG).toBeCloseTo(137.50776, 4);
    expect(sheet('004').rule!.fn).toBe(seedPosition);
  });

  test('each symbol of a rule is defined in its text', () => {
    // 002: b with its value, and the golden angle without misleading rounding (2π/φ² = 2.39996…).
    expect(sheet('002').rule!.text).toContain(`r = ${SPIRAL.r0}·e^(−b·θ), b = ${SPIRAL_B.toFixed(4)}, so e^(b·π/2) = φ`);
    expect(sheet('002').rule!.text).toContain(`${FALCON_GOLDEN_RAD.toFixed(5)} rad`);
    expect(FALCON_GOLDEN_RAD.toFixed(5)).toBe('2.39996');
    // 003: r_s and t defined; "never crosses" on the clock of an observer far away.
    expect(sheet('003').rule!.text).toContain('with r_s the horizon radius and t the far observer’s clock: seen from far away');
  });

  test('the expected seeds of 004 come from sow.ts', () => {
    expect(SOW_EXPECTED.startSeeds).toBe(START_SEEDS);
    expect(SOW_EXPECTED.perFrame).toBe(SOW_RATE / 15);
    const source = readFileSync(resolve(import.meta.dirname, 'collection.ts'), 'utf8');
    expect(source).not.toMatch(/startSeeds:\s*\d/);
    expect(source).not.toMatch(/perFrame:\s*\d/);
  });

  test('with no pinned featured sheet, the featured one is the highest number (004)', () => {
    expect(featuredSheet().number).toBe('004');
  });

  test('001 has three VISTAs (A, B, C) and the others one', () => {
    expect(sheet('001').views.map((v) => v.label)).toEqual(['A · Vitrine', 'B · Plate', 'C · Leader']);
    expect(sheet('001').views.map((v) => v.href)).toEqual(['/4d-os/a/', '/4d-os/b/', '/4d-os/c/']);
    for (const n of ['002', '003', '004']) expect(sheet(n).views).toHaveLength(1);
    expect(sheet('001').enter).toBe('/4d-os/');
    expect(sheet('002').enter).toBe('/4d-os/d/');
    expect(sheet('003').enter).toBe('/4d-os/e/');
    expect(sheet('004').enter).toBe('/bloomscope/');
  });

  test('gate row: name and line of the launcher', () => {
    expect(GATE_ROW).toBe('4D.OS — Five worlds, one launcher. Every moment of a scene, all at once.');
    expect(GATE_ROW).toBe(`${LAUNCHER.name} — ${LAUNCHER.line}`);
  });

  test('curated creation dates: YYYY-MM-DD, 001–003 on 2026-09-24 and 004 on 2026-09-25', () => {
    for (const s of SHEETS) expect(s.created, s.number).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(SHEETS.map((s) => s.created)).toEqual(['2026-09-24', '2026-09-24', '2026-09-24', '2026-09-25']);
  });

  test('every path in the collection exists: the sources of each work and the tokens of each passe-partout', () => {
    const repo = resolve(import.meta.dirname, '../../..');
    for (const s of SHEETS) {
      for (const path of s.sources) expect(existsSync(resolve(repo, path)), `${s.number}: ${path}`).toBe(true);
      for (const view of s.views) expect(existsSync(resolve(repo, view.mat.file)), `${s.number}: ${view.mat.file}`).toBe(true);
    }
  });

  test('the cat credit is the line in LICENSES.md', () => {
    const licenses = readFileSync(resolve(import.meta.dirname, '../../../LICENSES.md'), 'utf8');
    expect(licenses).toContain(`*${CAT_CREDIT.text}*`);
  });
});

describe('Bloomscope fixed garden (landing-bloomscope, "Changed format")', () => {
  test('the fixed link reads as the fixed garden', () => {
    expect(FIXED_GARDEN_LINK).toBe(`/bloomscope/${FIXED_GARDEN_HASH}`);
    const garden = gardenFromHash(FIXED_GARDEN_HASH);
    // If GARDEN_VERSION (or the format) changes, decodeGarden returns null and this fails.
    expect(garden).not.toBeNull();
    expect(garden!.mode).toBe('d5');
    expect(garden!.barrel).toBe(0);
    expect(garden!.display).toBe('16');
    expect(garden!.specimens.map((s) => s.kind)).toEqual(DEFAULT_GARDEN.map((s) => s.kind));
    // Sow stays at the golden angle with encodeGarden's rounding (4 decimals).
    expect(garden!.sow).toBe(137.5078);
    expect(Math.abs(garden!.sow - SOW_GOLDEN_DEG)).toBeLessThanOrEqual(5e-5);
    expect(garden!.sow.toFixed(3)).toBe('137.508');
  });

  test('a link from another version is not read', () => {
    const raw = FIXED_GARDEN_HASH.slice(3);
    const json = JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/')));
    json[0] = 2;
    const other = btoa(JSON.stringify(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeGarden(other)).toBeNull();
  });
});

describe('recording configuration of the collection (2.1)', async () => {
  const { CAPTURE, workOf } = await import('./capture');

  test('A, B and C record a single range of source frames', () => {
    const frames = (id: 'a' | 'b' | 'c') => {
      const source = CAPTURE[id].source;
      return source.kind === 'pack' ? source.frames.join() : '';
    };
    expect(frames('a')).not.toBe('');
    expect(frames('b')).toBe(frames('a'));
    expect(frames('c')).toBe(frames('a'));
  });

  test('each loop of the collection has its config, with the sheet and title from the collection', () => {
    for (const sheet of SHEETS) {
      for (const view of sheet.views) {
        const capture = CAPTURE[view.loop];
        expect(capture, view.loop).toBeDefined();
        expect(workOf(view.loop).title).toBe(sheet.title);
        expect(workOf(view.loop).sheet.startsWith(sheet.number)).toBe(true);
      }
    }
    expect(CAPTURE.bloomscope.route).toBe(FIXED_GARDEN_LINK);
  });
});
