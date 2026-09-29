import { describe, expect, it } from 'vitest';
import { CAPSULE_R, capsuleContents, CraneSim, GRIP_P, HOME, inChute, STEP, type CraneEvent } from './sim';
import { crc32 } from '../../shared/png';
import { pngTextChunks, withTextChunks } from './png';

function run(sim: CraneSim, seconds: number): CraneEvent[] {
  const out: CraneEvent[] = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    sim.step();
    out.push(...sim.events.splice(0));
  }
  return out;
}

describe('crane: buttons', () => {
  it('one use per button: ① released and pressed again does not move the claw', () => {
    const sim = new CraneSim({ seed: 1 });
    expect(sim.press(1)).toBe(true);
    run(sim, 0.5);
    sim.release(1);
    const x = sim.x;
    expect(sim.press(1)).toBe(false);
    run(sim, 0.5);
    expect(sim.x).toBe(x);
  });

  it('② only works after ① and, when released, the claw descends', () => {
    const sim = new CraneSim({ seed: 2 });
    expect(sim.press(2)).toBe(false);
    sim.press(1);
    run(sim, 0.3);
    sim.release(1);
    expect(sim.press(2)).toBe(true);
    const z = sim.z;
    run(sim, 0.4);
    expect(sim.z).toBeLessThan(z);
    sim.release(2);
    expect(sim.phase).toBe('drop');
    expect(sim.press(2)).toBe(false);
  });

  it('the carriage moves at 2.2 u/s while the button is held', () => {
    const sim = new CraneSim({ seed: 3 });
    sim.press(1);
    run(sim, 1);
    expect(sim.x - HOME.x).toBeCloseTo(2.2, 1);
  });
});

describe('crane: single-layer physics', () => {
  it('a single layer: after any attempt no capsule rests on another', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const sim = new CraneSim({ seed });
      // Drop the claw over several points, pushes and slips included.
      for (let k = 0; k < 4; k++) {
        const target = sim.capsules.find((c) => c.state === 'floor')!;
        sim.dropAt(target.x + (k - 1.5) * 0.5, target.y + 0.3);
        sim.resolve(30);
        const floor = sim.capsules.filter((c) => c.state === 'floor');
        for (const c of floor) expect(c.h).toBe(CAPSULE_R);
        for (let i = 0; i < floor.length; i++) {
          for (let j = i + 1; j < floor.length; j++) {
            expect(Math.hypot(floor[i].x - floor[j].x, floor[i].y - floor[j].y)).toBeGreaterThan(2 * CAPSULE_R - 0.02);
          }
        }
      }
    }
  });

  it('printed probability: with the claw centered, between 0.77 and 0.83 grips in 1000 attempts', () => {
    let grabbed = 0;
    let slipped = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const sim = new CraneSim({ seed });
      const c = sim.capsules[seed % sim.capsules.length];
      sim.dropAt(c.x, c.y);
      const events = run(sim, 4);
      if (events.some((e) => e.type === 'grabbed')) grabbed++;
      if (events.some((e) => e.type === 'slipped')) slipped++;
    }
    expect(grabbed + slipped).toBe(1000);
    expect(grabbed / 1000).toBeGreaterThanOrEqual(GRIP_P - 0.03);
    expect(grabbed / 1000).toBeLessThanOrEqual(GRIP_P + 0.03);
  });

  it('a grip carries the capsule to the chute: a prize, and the attendant restocks it', () => {
    const sim = new CraneSim({ seed: 11 });
    let prize: CraneEvent | undefined;
    let refill: CraneEvent | undefined;
    for (let t = 0; t < 40 && !prize; t++) {
      const c = sim.capsules.find((k) => k.state === 'floor')!;
      sim.dropAt(c.x, c.y);
      const events = run(sim, 14);
      prize = events.find((e) => e.type === 'prize');
      refill = events.find((e) => e.type === 'refill');
    }
    expect(prize).toBeDefined();
    expect(refill).toBeDefined();
    expect(sim.capsules.filter((c) => c.state !== 'gone')).toHaveLength(12);
  });

  it('a push that carries the capsule into the chute counts as a prize', () => {
    const sim = new CraneSim({ seed: 5 });
    // A capsule next to the lip and the claw on the outer side, 0.6 from the axis: it pushes it in.
    const c = sim.capsules[0];
    for (const other of sim.capsules) if (other !== c) other.x = 3.5;
    c.x = -2.2;
    c.y = 2.2;
    sim.dropAt(c.x + 0.45, c.y - 0.45);
    const events = run(sim, 12);
    expect(events.some((e) => e.type === 'nudged')).toBe(true);
    expect(events.some((e) => e.type === 'prize' && e.capsule === c)).toBe(true);
  });

  it('the dotted trail records the path of the attempt', () => {
    const sim = new CraneSim({ seed: 4 });
    sim.press(1);
    run(sim, 0.8);
    sim.release(1);
    sim.press(2);
    run(sim, 0.8);
    sim.release(2);
    run(sim, 8);
    expect(sim.trail.length / 3).toBeGreaterThan(20);
    expect(sim.phase === 'ready' || sim.phase === 'settle').toBe(true);
  });
});

describe('crane: contents', () => {
  it('12 capsules on desktop and 8 on phone, with A–E and the launcher in both', () => {
    for (const count of [12, 8]) {
      const sim = new CraneSim({ count, seed: 9 });
      expect(sim.capsules).toHaveLength(count);
      const worlds = sim.capsules.flatMap((c) => (c.content.kind === 'world' ? [c.content.id] : []));
      for (const id of ['a', 'b', 'c', 'd', 'e', 'launcher']) expect(worlds).toContain(id);
    }
    expect(capsuleContents(8, 1).filter((c) => c.kind === 'sticker')).toHaveLength(2);
  });

  it('no capsule starts inside the chute', () => {
    for (let seed = 1; seed < 50; seed++) {
      const sim = new CraneSim({ seed });
      for (const c of sim.capsules) expect(inChute(c.x, c.y)).toBe(false);
    }
  });
});

describe('sticker: PNG with provenance', () => {
  it('known crc32', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });

  it('inserts readable tEXt chunks before IEND', () => {
    // Minimal 1×1 PNG (signature, IHDR, IDAT, IEND).
    const base = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
      (ch) => ch.charCodeAt(0),
    );
    const out = withTextChunks(base, { seed: '4242', source: 'procedural', note: 'crewtives playground demo' });
    const chunks = pngTextChunks(out);
    expect(chunks.seed).toBe('4242');
    expect(chunks.source).toBe('procedural');
    expect(chunks.note).toBe('crewtives playground demo');
    // Still ends in IEND.
    expect(new TextDecoder().decode(out.slice(out.length - 8, out.length - 4))).toBe('IEND');
  });
});
