// The published loops (sites/playground/public/loops/<id>/): complete and consistent provenance, and
// passes that decode exactly to the frames it records ("Complete record", "Lossless").
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { FIXED_GARDEN_HASH, SOW_EXPECTED } from '../collection';
import { decodeGarden } from '../../bloomscope/garden';
import { decode4dlp } from './format.ts';
import { frameHash } from './hash.ts';
import { LOOP_FILES, LOOP_IDS, type LoopProvenance, passesFor, posterSidecar, validateProvenance } from './provenance.ts';

const repo = resolve(import.meta.dirname, '../../../..');
const loopsDir = resolve(repo, 'sites/playground/public/loops');
const published = LOOP_IDS.filter((id) => existsSync(resolve(loopsDir, id, LOOP_FILES.provenance)));
const read = (id: string): LoopProvenance => JSON.parse(readFileSync(resolve(loopsDir, id, LOOP_FILES.provenance), 'utf8'));
const lastFrame = (pack: string) => JSON.parse(readFileSync(resolve(repo, 'sites/4d-os/public/packs', pack, 'scene.json'), 'utf8')).frameCount - 1;

describe('published loops', () => {
  // Without this, if the loops folder moved, the tests below would have nothing to check and would pass.
  it('finds the published loops', () => {
    expect(published.length, `there is no provenance.json in ${loopsDir}`).toBeGreaterThan(0);
  });

  it.each(published)('%s: the provenance has every field and validates', (id) => {
    const p = read(id);
    const packs = Object.fromEntries(p.passes.flatMap((pass) => (pass.source.kind === 'pack' ? [[pass.source.pack, lastFrame(pass.source.pack)]] : [])));
    expect(validateProvenance(p, { packLastFrame: packs })).toEqual([]);
    expect(p.loop).toBe(id);
    expect(p.passes.map((pass) => pass.direction)).toEqual(passesFor(id));
  });

  it.each(published)('%s: each pass weighs what is recorded and decodes exactly to its hashes', async (id) => {
    const p = read(id);
    expect(statSync(resolve(loopsDir, id, p.poster.file)).size).toBeGreaterThan(0);
    for (const pass of p.passes) {
      const gz = readFileSync(resolve(loopsDir, id, pass.file));
      expect(gz.length).toBe(pass.bytes);
      const loop = decode4dlp(new Uint8Array(gunzipSync(gz)));
      expect([loop.width, loop.height, loop.frames, loop.fps]).toEqual([p.native.width, p.native.height, pass.frames, pass.fps]);
      expect(loop.palette).toEqual(p.palette);
      const out = new Uint8Array(loop.width * loop.height * 4);
      for (let f = 0; f < loop.frames; f++) {
        loop.expand(f, out);
        expect(await frameHash(out)).toBe(pass.hashes[f]);
      }
    }
  });

  it.each(published)('%s: the poster is a lossless WebP at the native size and its provenance sidecar describes the current recording', (id) => {
    const p = read(id);
    const webp = readFileSync(resolve(loopsDir, id, p.poster.file));
    expect(webp.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(webp.subarray(8, 12).toString('latin1')).toBe('WEBP');
    // RIFF chunks: the image chunk must be VP8L (lossless), with the width and height of the native frame.
    let vp8l: Buffer | null = null;
    for (let i = 12; i + 8 <= webp.length; ) {
      const size = webp.readUInt32LE(i + 4);
      if (webp.subarray(i, i + 4).toString('latin1') === 'VP8L') vp8l = webp.subarray(i + 8, i + 8 + size);
      expect(webp.subarray(i, i + 4).toString('latin1')).not.toBe('VP8 ');
      i += 8 + size + (size & 1);
    }
    expect(vp8l).not.toBeNull();
    const bits = vp8l!.readUInt32LE(1);
    expect([(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]).toEqual([p.native.width, p.native.height]);
    // 14.3: the embedded provenance (the sidecar the recording tool writes) names frame 0 and the commit of this recording.
    const sidecar = JSON.parse(readFileSync(resolve(loopsDir, id, LOOP_FILES.posterSidecar), 'utf8'));
    expect(`${p.poster.file}.json`).toBe(LOOP_FILES.posterSidecar);
    expect(sidecar.prompt).toContain(p.poster.hash);
    expect(sidecar.prompt).toContain(p.commit);
    // It is exactly the one the recording tool would write with this provenance.
    expect(sidecar).toEqual(posterSidecar(p, sidecar.createdAt));
  });

  it('A, B and C show the same source frames', () => {
    const cats = (['a', 'b', 'c'] as const).filter((id) => published.includes(id)).map(read);
    for (const p of cats) for (const pass of p.passes) expect(pass.source).toEqual(cats[0].passes[0].source);
  });

  it.skipIf(!published.includes('bloomscope'))('Bloomscope: Sow of the fixed garden, 610 + 2f seeds per frame ("Recorded sowing")', () => {
    const p = read('bloomscope');
    const alpha = decodeGarden(FIXED_GARDEN_HASH.slice(3))!.sow;
    expect(p.route.endsWith(FIXED_GARDEN_HASH)).toBe(true);
    expect(p.config.sow!.section).toBe('sow');
    expect(p.config.sow!.angle).toBe(alpha.toFixed(3));
    const seeds = p.passes[0].seeds!;
    expect(seeds.map((n, f) => n - (SOW_EXPECTED.startSeeds + SOW_EXPECTED.perFrame * f))).toEqual(seeds.map(() => 0));
    expect([seeds[0], seeds[44], p.config.sow!.startSeeds, p.config.sow!.endSeeds]).toEqual([610, 698, 610, 698]);
  });
});
