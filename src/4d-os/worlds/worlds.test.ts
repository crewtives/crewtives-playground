import { describe, expect, it } from 'vitest';
import { currentSheetIndex, exposureStops, sheetFrames } from './b/plate';
import { edgeCode, filmOffset, frameAfterPull, frameMarks } from './c/strip';

describe('B · sequence sheet', () => {
  it('spreads 12 exposures from the first frame to the last', () => {
    const frames = sheetFrames(300);
    expect(frames).toHaveLength(12);
    expect(frames[0]).toBe(0);
    expect(frames.at(-1)).toBe(299);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
  });

  it('marks the last exposure that has already passed', () => {
    const frames = sheetFrames(300);
    expect(currentSheetIndex(frames, 0)).toBe(0);
    expect(currentSheetIndex(frames, frames[5] + 1)).toBe(5);
    expect(currentSheetIndex(frames, 299)).toBe(11);
  });

  it('the dial turns exposures per second into a stride', () => {
    expect(exposureStops(15, 300).map((s) => [s.label, s.stride])).toEqual([
      ['5', 3],
      ['3', 5],
      ['1', 15],
      ['0.5', 30],
      ['0.25', 60],
    ]);
  });
});

describe('C · film strip', () => {
  it('centers the frame under the gate', () => {
    expect(filmOffset(0, 160, 6)).toBe(-80);
    expect(filmOffset(10, 160, 6)).toBe(-(10 * 166 + 80));
  });

  it('pulling to the left moves time forward', () => {
    expect(frameAfterPull(100, -166, 160, 6)).toBe(101);
    expect(frameAfterPull(100, 332, 160, 6)).toBe(98);
  });

  it('film marks are deterministic and sparse, and scratches come in runs', () => {
    expect(frameMarks(137)).toEqual(frameMarks(137));
    const all = Array.from({ length: 300 }, (_, f) => frameMarks(f));
    const scratched = all.filter((m) => m.scratch !== undefined).length;
    const stained = all.filter((m) => m.stain).length;
    expect(scratched).toBeGreaterThan(0);
    expect(scratched).toBeLessThan(200);
    expect(stained).toBeLessThan(30);
    // Within a run of 12 frames the scratch does not move.
    const run = all.findIndex((m) => m.scratch !== undefined);
    const start = run - (run % 12);
    expect(new Set(all.slice(start, start + 12).map((m) => m.scratch?.x)).size).toBe(1);
    // The segments change from frame to frame (varying length and strength).
    expect(all.slice(start, start + 12).every((m) => m.scratch!.segments.length >= 1)).toBe(true);
  });

  it('puts an edge code every 20 frames', () => {
    expect(edgeCode(0)).toBe('0923 0000');
    expect(edgeCode(40)).toBe('0923 0040');
    expect(edgeCode(41)).toBeNull();
  });
});
