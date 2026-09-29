import { describe, expect, it } from 'vitest';
import { Economy, formatRate, levelCost, mineRate, turnsNeeded, windText, type EconomyEvent } from './economy';

function withLog(): { economy: Economy; lines: string[] } {
  const economy = new Economy();
  const lines: string[] = [];
  economy.on((e: EconomyEvent) => lines.push(e.line));
  return { economy, lines };
}

function run(economy: Economy, seconds: number): void {
  for (let t = 0; t < seconds - 1e-9; t += 0.1) economy.tick(0.1);
}

describe('demo economy', () => {
  it('initial state: 60 tin, 0 spark, 0 spring, mine at Lv 1 and the upgrade already queued', () => {
    const { economy } = withLog();
    const s = economy.state;
    expect(s.tin).toBe(60);
    expect(s.spark).toBe(0);
    expect(economy.turns).toBe(0);
    expect(s.levels).toEqual({ mine: 1, gantry: 1, observatory: 0 });
    expect(formatRate(economy.rate)).toBe('+1.2/s');
    expect(s.queue).toHaveLength(1);
    expect(s.queue[0]).toMatchObject({ building: 'mine', level: 2, cost: 30, time: 6 });
  });

  it('cost and time tables from the spec', () => {
    expect([2, 3, 4, 5].map((n) => levelCost('mine', n)!.cost)).toEqual([30, 48, 77, 123]);
    expect([2, 3, 4, 5].map((n) => levelCost('mine', n)!.time)).toEqual([6, 8.4, 11.8, 16.5]);
    expect(levelCost('mine', 20)!.time).toBe(45);
    expect([2, 3, 4].map((n) => levelCost('gantry', n))).toEqual([
      { cost: 40, time: 8 },
      { cost: 64, time: 11 },
      { cost: 102, time: 15 },
    ]);
    expect([1, 2, 3].map((n) => levelCost('observatory', n))).toEqual([
      { cost: 50, time: 10 },
      { cost: 80, time: 14 },
      { cost: 128, time: 20 },
    ]);
    expect(levelCost('gantry', 5)).toBeNull();
  });

  it('visible cost and reason for the block: with 18 tin, "Needs 12 more tin"', () => {
    const { economy } = withLog();
    economy.state.queue = [];
    economy.state.tin = 18;
    expect(economy.whyNot('mine')).toBe('Needs 12 more tin');
    expect(economy.queueBuild('mine')).toBe(false);
  });

  it('full queue: with 3 jobs no order is enabled, and it says why', () => {
    const { economy } = withLog();
    economy.state.tin = 1000;
    expect(economy.queueBuild('gantry')).toBe(true);
    expect(economy.queueBuild('observatory')).toBe(true);
    for (const b of ['mine', 'gantry', 'observatory'] as const) expect(economy.whyNot(b)).toBe('Queue full (3 of 3)');
  });

  it('building with two turns: 6 s of wind, mine at Lv 2 and +1.6/s', () => {
    const { economy, lines } = withLog();
    economy.addWind(16);
    expect(economy.turns).toBe(2);
    expect(turnsNeeded(economy)).toBe(0);
    economy.letGo();
    expect(economy.state.mode).toBe('running');
    run(economy, 5.9);
    expect(economy.state.levels.mine).toBe(1);
    run(economy, 0.2);
    expect(economy.state.levels.mine).toBe(2);
    expect(mineRate(2)).toBeCloseTo(1.62, 2);
    expect(lines).toContain('Built. Tin mine is level 2. Tin now +1.6/s.');
    expect(economy.state.mode).toBe('idle');
  });

  it('pause: pressing the key while it runs stops the work (HOLD)', () => {
    const { economy } = withLog();
    economy.addWind(16);
    economy.letGo();
    run(economy, 2);
    economy.hold(true);
    const progress = economy.state.queue[0].progress;
    run(economy, 3);
    expect(economy.state.queue[0].progress).toBe(progress);
    expect(economy.state.mode).toBe('hold');
    economy.hold(false);
    expect(economy.state.mode).toBe('running');
  });

  it('empty queue: the wind stays stored and the log says so', () => {
    const { economy, lines } = withLog();
    economy.state.queue = [];
    economy.addWind(8);
    economy.letGo();
    expect(economy.turns).toBe(1);
    expect(lines).toContain('Spring held. Queue a build to use it.');
  });

  it('twelve-turn stop: 96 detents and the ratchet slip', () => {
    const { economy, lines } = withLog();
    economy.addWind(90);
    expect(economy.addWind(20)).toBe(6);
    expect(economy.detents).toBe(96);
    expect(lines).toContain("The spring's full. Twelve turns is all a tin toy takes.");
    expect(windText(29)).toBe('3 turns and 5 eighths wound');
  });

  it('lid off screen: 10 s at 10 Hz add up to 12 tin', () => {
    const { economy } = withLog();
    run(economy, 10);
    expect(economy.state.tin - 60).toBeCloseTo(12, 5);
  });

  it('tab hidden for 10 minutes: at most 5 minutes of production (360 tin)', () => {
    const { economy } = withLog();
    economy.tick(600);
    expect(economy.state.tin - 60).toBeCloseTo(360, 6);
  });

  it('research: with the observatory at Lv 1 and 20 spark, the inks row takes 10 s', () => {
    const { economy } = withLog();
    economy.state.levels.observatory = 1;
    economy.state.research.inks.status = 'available';
    economy.addSpark(20);
    expect(economy.research('inks')).toBe(true);
    expect(economy.state.spark).toBe(0);
    expect(economy.state.research.inks.status).toBe('researching');
    run(economy, 10);
    expect(economy.state.research.inks.status).toBe('done');
    expect(economy.state.research.memory.status).toBe('locked');
  });

  it('reset: returns to the state of a fresh page load', () => {
    const { economy, lines } = withLog();
    economy.state.levels.mine = 4;
    economy.state.tin = 5;
    economy.addWind(20);
    economy.reset();
    expect(economy.state.tin).toBe(60);
    expect(economy.state.levels.mine).toBe(1);
    expect(economy.turns).toBe(0);
    expect(lines).toContain('Universe reset. Back to 60 tin.');
  });

  it('skipping the grind: everything at Lv 3 or above and all three rows researched', () => {
    const { economy } = withLog();
    economy.skipGrind();
    expect(Object.values(economy.state.levels).every((l) => l >= 3)).toBe(true);
    expect(Object.values(economy.state.research).every((r) => r.status === 'done')).toBe(true);
  });

  it('reduced motion: "Let go" completes at once whatever the wind can cover', () => {
    const { economy } = withLog();
    economy.addWind(16);
    economy.runInstantly();
    expect(economy.state.levels.mine).toBe(2);
    expect(economy.turns).toBe(0);
  });
});
