import { describe, expect, it } from 'vitest';
import { LOOP_FILES, LOOP_FRAMES, LOOP_FPS, type LoopProvenance, passesFor, validateProvenance } from './provenance.ts';

const hash = (n: number) => n.toString(16).padStart(64, '0');

function sample(loop: LoopProvenance['loop'] = 'd'): LoopProvenance {
  const sow = loop === 'bloomscope';
  const frames = Array.from({ length: LOOP_FRAMES }, (_, i) => 120 + 2 * i);
  const hashes = frames.map((_, i) => hash(i + 1));
  return {
    schema: 1,
    loop,
    work: { sheet: sow ? '004 · Bloomscope' : '002 · The golden stoop', title: sow ? 'Bloomscope' : 'The golden stoop', synthetic: !sow },
    route: sow ? '/bloomscope/#g=abc' : '/4d-os/d/',
    config: {
      viewport: { width: 1440, height: 900 },
      dpr: 1,
      hasTouch: false,
      isMobile: false,
      reducedMotion: false,
      display: '16',
      block: sow ? 2 : 3,
      rect: sow ? { x: 10, y: 20, width: 460, height: 460 } : { x: 0, y: 0, width: 1170, height: 720 },
      prep: [],
      ...(sow ? { sow: { section: 'sow' as const, angle: '137.508', startSeeds: 610, endSeeds: 698, bloomWaitMs: 3106, hold: 'Space' } } : {}),
    },
    native: sow ? { width: 230, height: 230 } : { width: 390, height: 240 },
    palette: ['#000000', '#ffffff'],
    format: { name: '4DLP', version: 2, bpp: 4, layout: '[y][frame][x]', compression: 'gzip', contentType: 'application/gzip' },
    recorded: '2026-09-25',
    commit: 'a'.repeat(40),
    method: { liveRender: true, controlledClock: true, onePixelPerBlock: true, verifiedExact: true, pageHidden: true, stepping: 'one 16 ms animation frame at a time', tool: 'playwright@1.63.0', browser: 'chromium', browserVersion: '1', renderer: 'ANGLE' },
    hash: { algorithm: 'sha256', over: 'rgba' },
    poster: { file: LOOP_FILES.poster, hash: hashes[0] },
    passes: passesFor(loop).map((direction) => ({
      direction,
      fps: LOOP_FPS,
      frames: LOOP_FRAMES,
      source: sow ? { kind: 'clock' as const, instantsMs: frames.map((_, i) => Math.round((i * 1000) / 15)) } : { kind: 'pack' as const, pack: 'falcon-phi', frames },
      ...(sow ? { seeds: frames.map((_, i) => 610 + 2 * i) } : {}),
      file: LOOP_FILES.pass(direction),
      bytes: 200_000,
      verification: { framesChecked: LOOP_FRAMES, mismatchedPixels: 0, transparentPixels: 0, outOfPalettePixels: 0 },
      hashes,
    })),
  };
}

describe('provenance of a loop', () => {
  it('a complete provenance of a world and the one of Bloomscope are valid', () => {
    expect(validateProvenance(sample('d'))).toEqual([]);
    expect(validateProvenance(sample('bloomscope'))).toEqual([]);
  });

  it('requires as many hashes and source frames as frames ("Complete record")', () => {
    const p = sample();
    p.passes[0].hashes.pop();
    (p.passes[1].source as { frames: number[] }).frames.pop();
    const errors = validateProvenance(p);
    expect(errors.some((e) => e.includes('hashes'))).toBe(true);
    expect(errors.some((e) => e.includes('source.frames'))).toBe(true);
  });

  it('both passes must show the same source frame at each position', () => {
    const p = sample();
    p.passes[1].source = { kind: 'pack', pack: 'falcon-phi', frames: Array.from({ length: LOOP_FRAMES }, (_, i) => 121 + 2 * i) };
    expect(validateProvenance(p)).toContain('passes: FORWARD and REWIND do not show the same source frame at each position');
  });

  it('rejects a verification with differing pixels, a pass over budget and frames outside the pack', () => {
    const p = sample();
    p.passes[0].verification.mismatchedPixels = 3;
    p.passes[1].bytes = 1_000_001;
    const errors = validateProvenance(p, { packLastFrame: { 'falcon-phi': 150 } });
    expect(errors.some((e) => e.startsWith('passes[0] (forward).verification'))).toBe(true);
    expect(errors.some((e) => e.includes('1000001 B exceeds'))).toBe(true);
    expect(errors.some((e) => e.includes('last frame of the pack (150)'))).toBe(true);
  });

  it('Bloomscope has only the FORWARD pass and records the seeds of each frame', () => {
    const p = sample('bloomscope');
    delete p.passes[0].seeds;
    expect(validateProvenance(p).some((e) => e.includes('seeds'))).toBe(true);
    const q = sample('bloomscope');
    q.passes.push({ ...q.passes[0], direction: 'rewind' });
    expect(validateProvenance(q).some((e) => e.startsWith('passes: expected forward'))).toBe(true);
  });

  it('the sources hash is optional (an older recording does not have it), but if present it is sha256 in hexadecimal', () => {
    const p = sample();
    p.sources = { algorithm: 'sha256', hash: hash(7) };
    expect(validateProvenance(p)).toEqual([]);
    p.sources = { algorithm: 'sha256', hash: 'ABC' };
    expect(validateProvenance(p)).toContain('sources: algorithm sha256 and hash in lowercase hexadecimal');
    (p as { sources: unknown }).sources = { algorithm: 'md5', hash: hash(7) };
    expect(validateProvenance(p)).toContain('sources: algorithm sha256 and hash in lowercase hexadecimal');
  });

  it('the poster has the hash of frame 0 of the FORWARD pass and the native size is the rectangle divided by the block', () => {
    const p = sample();
    p.poster.hash = hash(99);
    p.native.width = 391;
    const errors = validateProvenance(p);
    expect(errors).toContain('poster.hash: does not match frame 0 of the FORWARD pass');
    expect(errors.some((e) => e.startsWith('native: 391 × 240'))).toBe(true);
  });
});
