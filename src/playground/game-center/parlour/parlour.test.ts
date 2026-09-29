import { describe, expect, it } from 'vitest';
import { BALL_R, buildNails, CLEAR_HESO, CLEAR_TULIP, CLEAR_WINDMILL, GLASS_R, HESO, NAIL_R, NAIL_SPACING, STOP_R, STOPS, TULIPS, WINDMILLS, inClearZone } from './layout';
import { DEFAULT_POWER, dotVisible, FEVER_EVERY, FEVER_SECONDS, GRAVITY, DRAG, ParlourSim, STEP } from './sim';
import { decodeMachine, encodeMachine, DEFAULT_MACHINE } from './url';

/** POUR 50 and lets it run until the glass is empty. */
function pourOut(sim: ParlourSim): void {
  sim.pour();
  for (let s = 0; s < 240 * 30 && (sim.pourLeft > 0 || sim.inPlay > 0); s++) {
    sim.step();
    sim.events.length = 0;
  }
}

describe('glass: nails', () => {
  it('mirror: every nail has its exact reflection across the vertical axis', () => {
    const nails = buildNails('mirror');
    expect(nails.length).toBeGreaterThan(120);
    const set = new Set(nails.map((n) => `${n.u},${n.v}`));
    for (const n of nails) expect(set.has(`${-n.u},${n.v}`)).toBe(true);
  });

  for (const [mode, k] of [['six', 6], ['eight', 8]] as const) {
    it(`order ${k}: rotating ${360 / k}° or reflecting lands on another nail or in a free zone`, () => {
      const nails = buildNails(mode);
      expect(nails.length).toBeGreaterThan(100);
      const near = (u: number, v: number) => nails.some((n) => Math.hypot(n.u - u, n.v - v) < 1e-6);
      const a = (2 * Math.PI) / k;
      for (const n of nails) {
        // Rotation (in the "from up, toward +u" sense) and reflection across the vertical axis.
        const ru = n.u * Math.cos(a) - n.v * Math.sin(a);
        const rv = n.u * Math.sin(a) + n.v * Math.cos(a);
        expect(near(ru, rv) || inClearZone(ru, rv)).toBe(true);
        expect(near(-n.u, n.v) || inClearZone(-n.u, n.v)).toBe(true);
      }
    });
  }

  it("in every mode, the free gap between nails is larger than the ball's diameter", () => {
    for (const mode of ['mirror', 'six', 'eight', 'free'] as const) {
      const nails = buildNails(mode);
      let min = Infinity;
      for (let i = 0; i < nails.length; i++) {
        for (let j = i + 1; j < nails.length; j++) min = Math.min(min, Math.hypot(nails[i].u - nails[j].u, nails[i].v - nails[j].v));
      }
      expect(min).toBeGreaterThanOrEqual(NAIL_SPACING - 1e-9);
      expect(min - 2 * NAIL_R).toBeGreaterThan(2 * BALL_R);
      for (const n of nails) expect(inClearZone(n.u, n.v)).toBe(false);
    }
  });

  it('the free zones surround windmills, tulips and pocket, on the axis or mirrored', () => {
    expect(WINDMILLS[0].u).toBe(-WINDMILLS[1].u);
    for (const t of TULIPS) expect(t.u).toBe(0);
    expect(HESO.u).toBe(0);
    expect(CLEAR_WINDMILL).toBeGreaterThan(20);
    expect(CLEAR_TULIP).toBeGreaterThan(0);
    expect(CLEAR_HESO).toBeGreaterThan(0);
  });

  it('rubber stops: an exact mirrored pair on the hoop, at the top, without wedging balls against the nails', () => {
    expect(STOPS[0].u).toBe(-STOPS[1].u);
    expect(STOPS[0].v).toBe(STOPS[1].v);
    expect(STOPS[0].v).toBeLessThan(-GLASS_R * 0.9);
    // Set into the hoop: a ball hugging the wall (center at GLASS_R − BALL_R) touches it.
    expect(Math.hypot(STOPS[0].u, STOPS[0].v) - STOP_R).toBeLessThan(GLASS_R - 2 * BALL_R + BALL_R);
    for (const mode of ['mirror', 'six', 'eight', 'free'] as const) {
      for (const n of buildNails(mode)) {
        for (const s of STOPS) expect(Math.hypot(n.u - s.u, n.v - s.v) - NAIL_R - STOP_R).toBeGreaterThan(2 * BALL_R);
      }
    }
  });
});

describe('glass: physics', () => {
  it('symmetry breaking: in MIRROR and TWIN, the twins are exact reflections until the first contact between balls', () => {
    for (const power of [30, 55, 80, 100]) {
      const sim = new ParlourSim({ symmetry: 'mirror', seed: 11, history: 0 });
      sim.rails = 'twin';
      sim.power = power;
      sim.launch();
      const [a, b] = [0, 1];
      let checked = 0;
      for (let s = 0; s < 240 * 8; s++) {
        sim.step();
        if (!sim.alive[a] || !sim.alive[b]) break;
        // While they do not touch (a single pair in the glass, except crossing at the axis).
        if (Math.hypot(sim.u[a] - sim.u[b], sim.v[a] - sim.v[b]) < 2 * BALL_R + 0.5) break;
        // Exact reflection (±0 count as equal).
        expect(sim.u[b] === -sim.u[a]).toBe(true);
        expect(sim.v[b] === sim.v[a]).toBe(true);
        expect(sim.vu[b] === -sim.vu[a]).toBe(true);
        expect(sim.vv[b] === sim.vv[a]).toBe(true);
        checked++;
      }
      expect(checked).toBeGreaterThan(40);
      expect(sim.windAngle[1] === -sim.windAngle[0]).toBe(true);
    }
  });

  it('same seed: REPLAY SEED with the same power repeats the trajectories', () => {
    const trace = () => {
      const sim = new ParlourSim({ seed: 99, history: 0 });
      sim.power = 64;
      sim.pour();
      const out: number[] = [];
      for (let s = 0; s < 240 * 6; s++) {
        sim.step();
        if (s % 60 === 0) for (let i = 0; i < 20; i++) out.push(sim.alive[i] ? sim.u[i] + sim.v[i] : -1);
      }
      return { out, pocketed: sim.pocketed, launched: sim.launched };
    };
    const a = trace();
    const b = trace();
    expect(b).toEqual(a);
    // And a reset on the same instance (REPLAY SEED) too.
    const sim = new ParlourSim({ seed: 99, history: 0 });
    sim.power = 64;
    sim.pour();
    sim.run(3);
    sim.reset();
    sim.power = 64;
    sim.pour();
    const out: number[] = [];
    for (let s = 0; s < 240 * 6; s++) {
      sim.step();
      if (s % 60 === 0) for (let i = 0; i < 20; i++) out.push(sim.alive[i] ? sim.u[i] + sim.v[i] : -1);
    }
    expect(out).toEqual(a.out);
  });

  it('no well: away from everything, the acceleration is only gravity and drag', () => {
    const sim = new ParlourSim({ history: 0 });
    // A ball in the pocket's free zone, over the mouth but not touching anything.
    sim.alive[0] = 1;
    sim.side[0] = -1;
    sim.u[0] = 14;
    sim.v[0] = -40;
    sim.vu[0] = 30;
    sim.vv[0] = -60;
    const vu0 = sim.vu[0];
    const vv0 = sim.vv[0];
    sim.step();
    const au = (sim.vu[0] - vu0) / STEP;
    const av = (sim.vv[0] - vv0) / STEP;
    const expectedVv = vv0 + GRAVITY * STEP;
    expect(au).toBeCloseTo((-DRAG * vu0 * STEP * 1) / STEP, 6);
    expect(av).toBeCloseTo((expectedVv - DRAG * expectedVv * STEP - vv0) / STEP, 6);
  });

  it('seventh pocketed ball: FEVER starts and the tulips stay open 6 s; the fourteenth, another one', () => {
    const sim = new ParlourSim({ history: 0 });
    const feverAt: number[] = [];
    // Balls falling right through the pocket's mouth.
    for (let n = 0; n < 14; n++) {
      sim.alive[0] = 1;
      sim.side[0] = -1;
      sim.u[0] = 0;
      sim.v[0] = -30;
      sim.vu[0] = 0;
      sim.vv[0] = 0;
      for (let s = 0; s < 240 && sim.alive[0]; s++) {
        sim.step();
        for (const e of sim.events.splice(0)) if (e.type === 'fever') feverAt.push(sim.pocketed);
      }
      expect(sim.pocketed).toBe(n + 1);
    }
    expect(feverAt).toEqual([FEVER_EVERY, FEVER_EVERY * 2]);
    expect(sim.fever).toBeGreaterThan(0);
    sim.run(FEVER_SECONDS + 0.1);
    expect(sim.fever).toBe(0);
  });

  it('a real pour pockets and drains balls', () => {
    const sim = new ParlourSim({ seed: 5, history: 0 });
    sim.setLaunching(true);
    sim.run(20);
    sim.setLaunching(false);
    sim.run(8);
    expect(sim.launched).toBeGreaterThan(100);
    expect(sim.drained + sim.pocketed + sim.tulipCatches + sim.inPlay).toBe(sim.launched);
    expect(sim.drained).toBeGreaterThan(20);
    expect(sim.pocketed).toBeGreaterThan(0);
  });

  it('no free lap: at any power from 20 to 100, a lone ball leaves the hoop and touches nails', () => {
    // Without the rubber stops, from ~45 up a lone ball went around the whole hoop without touching a nail and drained.
    for (const power of [20, DEFAULT_POWER, 45, 70, 100]) {
      const sim = new ParlourSim({ history: 0 });
      sim.rails = 'left';
      sim.power = power;
      let untouched = 0;
      for (let b = 0; b < 40; b++) {
        sim.launch();
        let nails = 0;
        for (let s = 0; s < 240 * 20 && sim.inPlay > 0; s++) {
          sim.step();
          for (const e of sim.events.splice(0)) if (e.type === 'nail') nails++;
        }
        if (nails === 0) untouched++;
      }
      expect(untouched, `power ${power}`).toBe(0);
      if (power === DEFAULT_POWER) expect(sim.pocketed).toBeGreaterThan(0);
    }
  });

  it('the rubber stop slows the strong ball: it loses more than half its speed and falls', () => {
    const sim = new ParlourSim({ history: 0 });
    sim.rails = 'left';
    sim.power = 100;
    sim.launch();
    const stop = STOPS[0];
    let before = 0;
    let after = -1;
    for (let s = 0; s < 240 * 2 && sim.alive[0]; s++) {
      const speed = Math.hypot(sim.vu[0], sim.vv[0]);
      sim.step();
      if (Math.hypot(sim.u[0] - stop.u, sim.v[0] - stop.v) <= STOP_R + BALL_R + 1e-6) {
        before = speed;
        after = Math.hypot(sim.vu[0], sim.vv[0]);
        break;
      }
    }
    expect(before).toBeGreaterThan(500);
    expect(after).toBeGreaterThanOrEqual(0);
    expect(after).toBeLessThan(before * 0.5);
  });

  it('POUR 50 with the default handle and machine pockets between 3 and 8 balls', () => {
    const sim = new ParlourSim({ seed: DEFAULT_MACHINE.seed, symmetry: DEFAULT_MACHINE.symmetry, history: 0 });
    sim.rails = DEFAULT_MACHINE.rails;
    pourOut(sim);
    expect(sim.launched).toBe(50);
    expect(sim.pocketed).toBeGreaterThanOrEqual(3);
    expect(sim.pocketed).toBeLessThanOrEqual(8);
    // And on average over 20 seeds too (the pour does not depend on a lucky seed).
    let total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const other = new ParlourSim({ seed, history: 0 });
      pourOut(other);
      total += other.pocketed;
    }
    expect(total / 20).toBeGreaterThanOrEqual(4);
    expect(total / 20).toBeLessThanOrEqual(8);
  });

  // The whole useful range of the handle lands in the pocket: no dead zone at the top (the rubber stop) and no sudden jump.
  for (const rails of ['twin', 'left'] as const) {
    for (const power of [20, 45, 70, 100]) {
      it(`POUR 50 in ${rails.toUpperCase()} at power ${power}: between 2 and 12 pocketed on average over seeds 1–20`, () => {
        let total = 0;
        for (let seed = 1; seed <= 20; seed++) {
          const sim = new ParlourSim({ seed, history: 0 });
          sim.rails = rails;
          sim.power = power;
          pourOut(sim);
          total += sim.pocketed;
        }
        expect(total / 20).toBeGreaterThanOrEqual(2);
        expect(total / 20).toBeLessThanOrEqual(12);
      });
    }
  }

  it('with the default handle, in every symmetry and with each launcher, pouring every 8 s reaches FEVER in under 30 s', () => {
    for (const rails of ['twin', 'left'] as const) {
      for (const symmetry of ['mirror', 'six', 'eight', 'free'] as const) {
        const sim = new ParlourSim({ seed: DEFAULT_MACHINE.seed, symmetry, history: 0 });
        sim.rails = rails;
        while (sim.feverCount === 0 && sim.time < 30) {
          if (sim.steps % (240 * 8) === 0) sim.pour();
          sim.step();
          sim.events.length = 0;
        }
        expect(sim.feverCount, `${rails} ${symmetry}`).toBeGreaterThan(0);
      }
    }
  });

  it('nothing stays wedged: in every mode, 15 s after launching stops the glass empties', () => {
    for (const symmetry of ['mirror', 'six', 'eight', 'free'] as const) {
      for (const power of [25, 60, 95]) {
        const sim = new ParlourSim({ seed: 8, symmetry, history: 0 });
        sim.power = power;
        sim.setLaunching(true);
        sim.run(10);
        sim.setLaunching(false);
        sim.run(15);
        expect(sim.inPlay).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the windmills only turn on impact', () => {
    const sim = new ParlourSim({ history: 0 });
    sim.run(2);
    expect(sim.windOmega[0]).toBe(0);
    expect(sim.windOmega[1]).toBe(0);
  });
});

describe('glass: rewind and shutter', () => {
  it('rewind 5 s and release: the balls are where they were and the simulation continues from there (new branch)', () => {
    const sim = new ParlourSim({ seed: 21, history: 12 });
    sim.power = 70;
    sim.setLaunching(true);
    sim.run(4);
    // Reference state, 5 s before the end.
    const ref = { u: Array.from(sim.u), v: Array.from(sim.v), alive: Array.from(sim.alive), t: sim.time };
    sim.run(5);
    const shown = sim.seek(5);
    expect(shown).toBeCloseTo(5, 5);
    expect(sim.time).toBeCloseTo(ref.t, 5);
    for (let i = 0; i < sim.maxBalls; i++) {
      expect(sim.alive[i]).toBe(ref.alive[i]);
      if (ref.alive[i]) {
        expect(sim.u[i]).toBeCloseTo(ref.u[i], 2);
        expect(sim.v[i]).toBeCloseTo(ref.v[i], 2);
      }
    }
    sim.branch();
    const dotsAfter = sim.dots.count;
    // The paths after the branch point were deleted.
    expect(sim.dots.time(dotsAfter - 1)).toBeLessThanOrEqual(sim.time + 1e-6);
    sim.run(1);
    expect(sim.time).toBeCloseTo(ref.t + 1, 3);
    expect(sim.historySeconds).toBeGreaterThan(0);
  });

  it('pocketed balls come back out: rewinding before a pocketed ball returns the ball and lowers the counter', () => {
    const sim = new ParlourSim({ history: 12 });
    sim.run(0.5);
    sim.alive[0] = 1;
    sim.side[0] = -1;
    sim.u[0] = 0;
    sim.v[0] = -40;
    sim.vu[0] = sim.vv[0] = 0;
    sim.run(0.02);
    let s = 0;
    while (sim.pocketed === 0 && s++ < 480) sim.step();
    expect(sim.pocketed).toBe(1);
    sim.run(1);
    const inPlay = sim.inPlay;
    sim.seek(1.1);
    expect(sim.pocketed).toBe(0);
    expect(sim.inPlay).toBe(inPlay + 1);
  });

  it('EVERY MOMENT: after 20 s of launches the glass keeps the paths of every ball', () => {
    const sim = new ParlourSim({ seed: 3, history: 12 });
    sim.clearGlass();
    sim.power = 58;
    sim.setLaunching(true);
    sim.run(20);
    const now = sim.time;
    const seen = new Set<number>();
    for (let k = sim.dots.start; k < sim.dots.count; k++) {
      if (dotVisible(sim.dots.time(k), now, 'all', sim.openedAt)) seen.add(sim.dots.serial[k % sim.dots.capacity]);
    }
    // Every ball launched before the last sample left at least one point.
    for (let serial = 0; serial < sim.launched - 2; serial++) expect(seen.has(serial)).toBe(true);
    // With a 5 s shutter, the old points are no longer visible.
    expect(dotVisible(now - 6, now, '5', sim.openedAt)).toBe(false);
    expect(dotVisible(now - 6, now, 'all', sim.openedAt)).toBe(true);
    expect(dotVisible(now - 0.5, now, 'now', sim.openedAt)).toBe(false);
  });
});

describe('glass: machine address', () => {
  it('codec round trip', () => {
    const state = { symmetry: 'eight', rails: 'twin', seed: 123456, shutter: 'all' } as const;
    expect(decodeMachine(encodeMachine(state))).toEqual(state);
    expect(encodeMachine(state)).toBe('#4f?sym=8&rails=twin&seed=123456&shutter=all');
  });

  it('an invalid value falls back to its default without affecting the rest', () => {
    const got = decodeMachine('#4f?sym=12&rails=left&seed=777&shutter=5');
    expect(got).toEqual({ ...DEFAULT_MACHINE, rails: 'left', seed: 777, shutter: '5' });
    expect(decodeMachine('#4f?sym=6&rails=zig&seed=abc&shutter=forever')).toEqual({ ...DEFAULT_MACHINE, symmetry: 'six' });
    expect(decodeMachine('#2f')).toBeNull();
  });
});
