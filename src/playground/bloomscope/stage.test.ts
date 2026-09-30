// The pinned stage's placement (landing-bloomscope "Pinned stage on phones"): where each peephole and
// hint goes with a stage gate matching or not, what exists only under the gate, and the count texts.
import { describe, expect, it } from 'vitest';
import { MAX_SPECIMENS } from './chamberModel';
import { BENCHES, STAGE_LANDSCAPE, STAGE_PORTRAIT, STAGE_QUERY, chamberAnnouncement, countText, placement } from './stage';

describe('pinned stage placement', () => {
  it('under a stage gate, the Sow and lathe peepholes join their toys and the hints follow the toys', () => {
    for (const bench of ['sow', 'lathe'] as const) {
      expect(placement(bench, true)).toEqual({ peephole: 'toy', hint: 'after-toy', putRow: false, count: true });
    }
  });

  it("under a stage gate, the honeycomb's peephole sits after its Put, whose row gets hive-put-row", () => {
    expect(placement('hive', true)).toEqual({ peephole: 'after-put', hint: null, putRow: true, count: true });
  });

  it('outside the gates everything is at home: peepholes in their rails, hints in their toys, no class, no count', () => {
    expect(placement('sow', false)).toEqual({ peephole: 'rail', hint: 'toy', putRow: false, count: false });
    expect(placement('lathe', false)).toEqual({ peephole: 'rail', hint: 'toy', putRow: false, count: false });
    expect(placement('hive', false)).toEqual({ peephole: 'rail', hint: null, putRow: false, count: false });
  });

  it('a rotation there and back returns every piece to its home', () => {
    for (const bench of BENCHES) {
      const before = placement(bench, false);
      placement(bench, true);
      expect(placement(bench, false)).toEqual(before);
    }
  });

  it('count nodes exist exactly while a gate matches, one per bench', () => {
    expect(BENCHES.filter((b) => placement(b, true).count)).toEqual(['sow', 'lathe', 'hive']);
    expect(BENCHES.filter((b) => placement(b, false).count)).toEqual([]);
    expect(BENCHES.filter((b) => placement(b, true).putRow)).toEqual(['hive']);
  });
});

describe('stage gates', () => {
  it('join the portrait and landscape queries in a comma list, never with `or`', () => {
    expect(STAGE_PORTRAIT).toBe('(max-width: 699px) and (min-height: 521px)');
    expect(STAGE_LANDSCAPE).toBe('(max-width: 1023px) and (max-height: 520px) and (orientation: landscape)');
    expect(STAGE_QUERY).toBe(`${STAGE_PORTRAIT}, ${STAGE_LANDSCAPE}`);
    expect(STAGE_QUERY).not.toMatch(/\bor\b/);
  });
});

describe('peephole count and announcement', () => {
  it('the count reads like the chamber gem', () => {
    expect(countText(4)).toBe('4/7');
    expect(countText(0)).toBe('0/7');
  });

  it('the live region says the new count, and "Chamber full" at 7', () => {
    expect(chamberAnnouncement(4)).toBe('In the chamber: 4 of 7');
    expect(chamberAnnouncement(MAX_SPECIMENS - 1)).toBe('In the chamber: 6 of 7');
    expect(chamberAnnouncement(MAX_SPECIMENS)).toBe('Chamber full');
  });
});
