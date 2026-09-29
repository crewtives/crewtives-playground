import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { decodeGarden } from '../../bloomscope/garden';
import { GOLDEN_ANGLE } from '../../bloomscope/specimens/spec';
import { FIXED_GARDEN_HASH, SHEETS, type WorkSheet } from '../collection';
import { buildManifest, fixedGardenAlpha } from './manifest';
import { sourcesHash } from './sources';
import { testPack, writeTestPack } from './testPack';
import { testProvenance, writeTestProvenance } from './testProvenance';

const repo = resolve(import.meta.dirname, '../../../..');
/** Commit of the test provenances: informative, the manifest compares it with nothing. */
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const temps: string[] = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'museum-'));
  temps.push(dir);
  return dir;
};
afterAll(() => temps.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('manifest of the initial collection (2.6)', () => {
  const manifest = buildManifest({ root: repo, loopsDir: temp() });
  const sheet = (n: string) => manifest.sheets.find((s) => s.sheet.number === n)!;

  test('dimensions with the real time and bytes of each pack', () => {
    expect(sheet('001').pack!.dims).toBe('14.0 s · 420 frames at 30 fps');
    expect(sheet('002').pack!.dims).toBe('15.0 s · 450 frames at 30 fps');
    expect(sheet('003').pack!.dims).toBe('15.0 s · 450 frames at 30 fps');
    expect(sheet('001').pack!.bytes).toBe(52_884_622);
    expect(sheet('002').pack!.bytes).toBe(56_268_409);
    expect(sheet('003').pack!.bytes).toBe(55_367_475);
    expect(sheet('004').pack).toBeNull();
  });

  test('creation dates curated in the collection, without git', () => {
    expect(['001', '002', '003', '004'].map((n) => sheet(n).created)).toEqual(['2026-09-24', '2026-09-24', '2026-09-24', '2026-09-25']);
  });

  test('pack trails without a loop: every moment, no segment', () => {
    expect(sheet('002').trail!.moments).toHaveLength(450);
    expect(sheet('002').trail!.span).toBeNull();
    expect(sheet('004').trail).toBeNull();
  });

  test('with no recorded loops it warns without failing', () => {
    expect(manifest.warnings.filter((w) => w.includes('no loop has been recorded yet'))).toHaveLength(6);
  });

  test("passe-partouts from each world's tokens, different in the three views of 001", () => {
    const mats = sheet('001').loops.map((l) => l.mat);
    expect(mats).toEqual(['#5a1a1c', '#1d211f', '#0e0f10']);
    expect(sheet('003').loops[0].mat).toBe('#05060a');
  });
});

describe('regenerated pack', () => {
  test('two consistent packs with N and N′ frames give different manifests and trails without touching any text', () => {
    const frames = (n: number) => Array.from({ length: n }, (_, f) => [[f, 0, f / 2] as [number, number, number], [f + 2, 1, f / 2] as [number, number, number]]);
    const fake: WorkSheet = { ...SHEETS[1], pack: 'test-pack', sources: ['sites/4d-os/public/packs/falcon-phi'] };
    const run = (n: number) => {
      const packs = temp();
      writeTestPack(packs, testPack('test-pack', frames(n)));
      return buildManifest({ root: repo, packsDir: packs, loopsDir: temp(), sheets: [fake] }).sheets[0];
    };
    const a = run(60);
    const b = run(90);
    expect(a.pack!.dims).toBe('2.0 s · 60 frames at 30 fps');
    expect(b.pack!.dims).toBe('3.0 s · 90 frames at 30 fps');
    expect(a.trail!.moments).toHaveLength(60);
    expect(b.trail!.moments).toHaveLength(90);
  });
});

describe('trail of 004 in the manifest (2.4)', () => {
  test('α is exactly decodeGarden(fixed link).sow and lies within 5·10⁻⁵ of the golden angle', () => {
    const alpha = fixedGardenAlpha();
    expect(alpha).toBe(decodeGarden(FIXED_GARDEN_HASH.slice(3))!.sow);
    expect(alpha).toBe(137.5078);
    expect(Math.abs(alpha - GOLDEN_ANGLE)).toBeLessThanOrEqual(5e-5);
    expect(SHEETS[3].rule!.constants.goldenAngleDeg).toBe(GOLDEN_ANGLE);
  });

  test('the trail comes from the recorded seeds and its angle matches the provenance', () => {
    const loops = temp();
    writeTestProvenance(loops, testProvenance('bloomscope', { commit: COMMIT }));
    const s = buildManifest({ root: repo, loopsDir: loops, sheets: [SHEETS[3]] }).sheets[0];
    expect(s.trail!.kind).toBe('seeds');
    expect(s.trail!.moments).toHaveLength(698);
    expect(s.trail!.span).toEqual([609, 697]);
    expect(fixedGardenAlpha().toFixed(3)).toBe(s.loops[0].provenance!.config.sow!.angle);

    const other = temp();
    writeTestProvenance(other, testProvenance('bloomscope', { commit: COMMIT, seeds: Array.from({ length: 45 }, (_, f) => 610 + f) }));
    const t = buildManifest({ root: repo, loopsDir: other, sheets: [SHEETS[3]] }).sheets[0];
    expect(t.trail!.moments).toHaveLength(654);
  });

  test('a provenance with another angle makes the build fail with a message that says so', () => {
    const loops = temp();
    writeTestProvenance(loops, testProvenance('bloomscope', { commit: COMMIT, angle: '137.300' }));
    expect(() => buildManifest({ root: repo, loopsDir: loops, sheets: [SHEETS[3]] })).toThrow(/does not match the fixed garden/);
  });
});

describe('stale loop warning (3.8)', () => {
  // Test folder, without git: a work in work/ and its tokens.
  const root = temp();
  mkdirSync(join(root, 'work/sub'), { recursive: true });
  writeFileSync(join(root, 'tokens.css'), ':root { --sheet: #fdfdf6; }');
  writeFileSync(join(root, 'work/a.txt'), 'one');
  writeFileSync(join(root, 'work/sub/b.txt'), 'two');
  const sheet: WorkSheet = {
    ...SHEETS[3],
    sources: ['work'],
    views: [{ loop: 'bloomscope', label: null, href: null, mat: { file: 'tokens.css', name: '--sheet' }, description: 'test' }],
  };
  const loops = temp();
  const hashNow = () => sourcesHash(root, sheet.sources);
  const record = (recorded: string) => writeTestProvenance(loops, testProvenance('bloomscope', { commit: COMMIT, sources: hashNow(), recorded }));
  const run = () => buildManifest({ root, loopsDir: loops, sheets: [sheet] });

  test('Unchanged work: no warning and no mark', () => {
    record('2026-09-25');
    const m = run();
    expect(m.warnings).toEqual([]);
    expect(m.sheets[0].loops[0].stale).toBeNull();
  });

  test('Bloomscope changed (one byte): the build succeeds, warns with the work, the date and both hashes, and marks the sheet', () => {
    const recorded = hashNow();
    writeFileSync(join(root, 'work/a.txt'), 'onf');
    const m = run();
    const current = hashNow();
    expect(current).not.toBe(recorded);
    expect(m.warnings).toHaveLength(1);
    expect(m.warnings[0]).toContain('004 · Bloomscope');
    expect(m.warnings[0]).toContain('bloomscope');
    expect(m.warnings[0]).toContain('2026-09-25');
    expect(m.warnings[0]).toContain(recorded.slice(0, 12));
    expect(m.warnings[0]).toContain(current.slice(0, 12));
    expect(m.sheets[0].loops[0].stale).toEqual({ recordedHash: recorded, currentHash: current });
  });

  test('Re-recorded: the warning and the mark disappear', () => {
    record('2026-09-26');
    const m = run();
    expect(m.warnings).toEqual([]);
    expect(m.sheets[0].loops[0].stale).toBeNull();
  });

  test('an added file marks the sheet; a dot-file does not', () => {
    record('2026-09-26');
    writeFileSync(join(root, 'work/.DS_Store'), 'finder');
    expect(run().sheets[0].loops[0].stale).toBeNull();
    writeFileSync(join(root, 'work/c.txt'), 'three');
    expect(run().sheets[0].loops[0].stale).not.toBeNull();
    rmSync(join(root, 'work/c.txt'));
    expect(run().sheets[0].loops[0].stale).toBeNull();
  });

  test('a moved file marks the sheet, even if its content is the same', () => {
    record('2026-09-26');
    renameSync(join(root, 'work/sub/b.txt'), join(root, 'work/b.txt'));
    expect(run().sheets[0].loops[0].stale).not.toBeNull();
    renameSync(join(root, 'work/b.txt'), join(root, 'work/sub/b.txt'));
    expect(run().sheets[0].loops[0].stale).toBeNull();
  });

  test('a provenance without a sources hash counts as stale', () => {
    writeTestProvenance(loops, testProvenance('bloomscope', { commit: COMMIT, recorded: '2026-09-25' }));
    const m = run();
    expect(m.sheets[0].loops[0].stale).toEqual({ recordedHash: null, currentHash: hashNow() });
    expect(m.warnings).toHaveLength(1);
    expect(m.warnings[0]).toContain('2026-09-25');
    expect(m.warnings[0]).toContain('(no hash)');
  });
});
