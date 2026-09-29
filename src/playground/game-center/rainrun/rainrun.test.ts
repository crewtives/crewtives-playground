import { describe, expect, it } from 'vitest';
import { buildTile, gateAt, GATE_SPACING, GATE_START } from './canyon';
import { IDLE_TO_ATTRACT, loadBest, RainRunGame, saveBest, type Store } from './game';
import { LIVES, MAX_POSES, RainRunSim, ribbonIndices, RUN_SECONDS, STEP } from './sim';

/** In-memory store shaped like localStorage. */
function memoryStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const blockedStore: Store = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
};

/** Places the taxi right before gate k with the stick at its center (or offset). */
function lineUp(sim: RainRunSim, k: number, dx = 0, dy = 0): void {
  const gate = sim.gate(k);
  sim.x = gate.x + dx;
  sim.y = gate.y + dy;
  sim.vx = 0;
  sim.vy = 0;
  sim.z = gate.z + 0.2;
  sim.nextGate = k;
  sim.setStick((gate.x + dx) / 5.2, (gate.y + dy - 5.1) / 3.9);
}

describe('Rain Run: canyon', () => {
  it('Mirrored canyon: every tower and every sign on the right reflects one on the left, with several seeds', () => {
    for (const seed of [1, 7, 9365, 424242]) {
      const tile = buildTile(seed);
      const left = tile.towers.filter((t) => t.side === -1);
      const right = tile.towers.filter((t) => t.side === 1);
      expect(right).toHaveLength(left.length);
      for (const r of right) {
        const twin = left.find((l) => l.index === r.index)!;
        expect([r.x0, r.x1]).toEqual([-twin.x1, -twin.x0]);
        expect([r.y0, r.y1, r.z0, r.z1]).toEqual([twin.y0, twin.y1, twin.z0, twin.z1]);
      }
      const leftSigns = tile.signs.filter((s) => s.side === -1);
      const rightSigns = tile.signs.filter((s) => s.side === 1);
      expect(rightSigns).toHaveLength(leftSigns.length);
      for (const r of rightSigns) {
        const twin = leftSigns.find((l) => l.x0 === -r.x1 && l.x1 === -r.x0 && l.y0 === r.y0 && l.z0 === r.z0);
        expect(twin, 'sign without a reflection').toBeDefined();
        expect(twin!.word).toBe(r.word);
        expect(twin!.style).toBe(r.style);
      }
    }
  });

  it('no gate is on the same side of the axis as the previous one', () => {
    for (const seed of [1, 7, 9365, 424242]) {
      let previous = Math.sign(gateAt(0, seed).x);
      expect(previous).not.toBe(0);
      for (let k = 1; k < 200; k++) {
        const side = Math.sign(gateAt(k, seed).x);
        expect(side).not.toBe(0);
        expect(side).toBe(-previous);
        previous = side;
      }
      expect(gateAt(3, seed).z).toBe(-(GATE_START + 3 * GATE_SPACING));
    }
  });
});

describe('Rain Run: rules', () => {
  it('Start a game: 90 s, 3 lives, combo ×1 and score 0', () => {
    const sim = new RainRunSim();
    for (let i = 0; i < 600; i++) sim.step();
    sim.start();
    expect(sim.phase).toBe('play');
    expect(sim.clock).toBe(RUN_SECONDS);
    expect(sim.lives).toBe(LIVES);
    expect(sim.combo).toBe(1);
    expect(sim.score).toBe(0);
  });

  it('Combo: three gates in a row add 100, 200 and 300; missing the fourth resets the combo to ×1', () => {
    const sim = new RainRunSim();
    sim.start();
    const points: number[] = [];
    for (let k = 0; k < 3; k++) {
      lineUp(sim, k);
      for (let i = 0; i < 4; i++) sim.step();
      const gate = sim.events.find((e) => e.type === 'gate');
      expect(gate, `gate ${k}`).toBeDefined();
      if (gate?.type === 'gate') points.push(gate.points);
      sim.events.length = 0;
    }
    expect(points).toEqual([100, 200, 300]);
    expect(sim.score).toBe(600);
    expect(sim.combo).toBe(4);
    // Fourth gate: pass over the crossbar, without touching it.
    lineUp(sim, 3, 0, 5.2);
    sim.y = 9.5;
    sim.setStick(sim.x / 5.2, 1);
    for (let i = 0; i < 4; i++) sim.step();
    expect(sim.events.some((e) => e.type === 'miss')).toBe(true);
    expect(sim.combo).toBe(1);
    expect(sim.lives).toBe(LIVES);
  });

  it('the combo does not go past ×8', () => {
    const sim = new RainRunSim();
    sim.start();
    for (let k = 0; k < 11; k++) {
      lineUp(sim, k);
      for (let i = 0; i < 4; i++) sim.step();
    }
    expect(sim.combo).toBe(8);
  });

  it('Out of lives: the third crash leads to GAME OVER and the machine opens TIME VIEW', () => {
    const game = new RainRunGame(memoryStore());
    game.start();
    const sim = game.sim;
    for (let crash = 0; crash < 3; crash++) {
      // Against the gate's post: the hull touches it from the side.
      lineUp(sim, crash * 2, 3.0, 0);
      sim.invulnerable = 0;
      game.advance(STEP * 3);
    }
    expect(sim.lives).toBe(0);
    expect(game.state).toBe('gameover');
  });

  it('BOOST multiplies the speed by ×1.5 for 1.2 s and then needs 3 s to recharge', () => {
    const sim = new RainRunSim();
    sim.start();
    const base = sim.speed;
    sim.boost();
    sim.step();
    expect(sim.speed).toBeCloseTo(base * 1.5);
    for (let i = 0; i < 72; i++) sim.step();
    expect(sim.boostLeft).toBe(0);
    expect(sim.boostCooldown).toBeGreaterThan(2.9);
    sim.boost();
    sim.step();
    expect(sim.boostLeft).toBe(0);
    for (let i = 0; i < 181; i++) sim.step();
    sim.boost();
    sim.step();
    expect(sim.boostLeft).toBeGreaterThan(0);
  });

  it('a crash takes a life, resets the combo to ×1 and gives 1 s of invulnerability', () => {
    const sim = new RainRunSim();
    sim.start();
    sim.combo = 5;
    lineUp(sim, 0, 3.0, 0);
    for (let i = 0; i < 3; i++) sim.step();
    expect(sim.lives).toBe(LIVES - 1);
    expect(sim.combo).toBe(1);
    expect(sim.invulnerable).toBeGreaterThan(0.9);
  });

  it('ATTRACT does not score: the autopilot crosses gates and the saved HI does not change', () => {
    const store = memoryStore();
    saveBest(store, { score: 1200, poses: [] });
    const game = new RainRunGame(store);
    let gates = 0;
    for (let s = 0; s < 30 * 60; s++) gates += game.advance(STEP).filter((e) => e.type === 'gate').length;
    expect(gates).toBeGreaterThan(15);
    expect(game.sim.score).toBe(0);
    expect(game.state).toBe('attract');
    expect(loadBest(store)?.score).toBe(1200);
  });

  it('the autopilot does not crash in 90 s of ATTRACT', () => {
    const sim = new RainRunSim();
    for (let s = 0; s < 90 * 60; s++) sim.step();
    expect(sim.events.filter((e) => e.type === 'crash')).toHaveLength(0);
    expect(sim.events.filter((e) => e.type === 'miss')).toHaveLength(0);
  });

  it('the time-out ending arrives at 90 s', () => {
    const game = new RainRunGame(null);
    game.start();
    game.sim.invulnerable = 1e9;
    for (let s = 0; s < 91 * 60 && game.state === 'play'; s++) {
      game.sim.invulnerable = 1e9;
      game.advance(STEP);
    }
    expect(game.state).toBe('gameover');
    expect(game.sim.poses.length).toBe(MAX_POSES);
  });
});

describe('Rain Run: TIME VIEW and high score', () => {
  it('GAME OVER exposes the flight: 60 s record 720 poses and TIME VIEW draws 240 (one out of every 3)', () => {
    const sim = new RainRunSim();
    sim.start();
    // Fly like the autopilot for 60 s.
    for (let s = 0; s < 60 * 60; s++) {
      const g = sim.gate(Math.max(sim.nextGate, 0));
      sim.setStick(g.x / 5.2, (g.y - 5.1) / 3.9);
      sim.step();
    }
    expect(sim.poses).toHaveLength(720);
    expect(ribbonIndices(sim.poses.length, 3)).toHaveLength(240);
    expect(ribbonIndices(sim.poses.length, 6)).toHaveLength(120);
  });

  it('Pause with C: the clock reads the same after 5 s in TIME VIEW', () => {
    const game = new RainRunGame(null);
    game.start();
    game.advance(3);
    const before = game.sim.clock;
    expect(game.toggleTimeView()).toBe('timeview');
    for (let i = 0; i < 300; i++) game.advance(1 / 60);
    expect(game.sim.clock).toBe(before);
    expect(game.toggleTimeView()).toBe('play');
    expect(game.sim.clock).toBe(before);
  });

  it('New high score: the HI updates and the next game carries exactly those poses as its ghost', () => {
    const store = memoryStore();
    const game = new RainRunGame(store);
    game.start();
    game.sim.score = 2300;
    game.sim.lives = 1;
    lineUp(game.sim, 0, 3.0, 0);
    game.sim.invulnerable = 0;
    game.advance(STEP * 3);
    expect(game.state).toBe('gameover');
    expect(game.hi).toBe(2300);
    expect(game.newRecord).toBe(true);
    const recorded = game.sim.poses.map((p) => [p.x, p.y, p.z]);
    game.start();
    expect(game.ghost?.map((p) => [p.x, p.y, p.z])).toEqual(recorded);
    // And it persists: a new machine reads the same record from the store.
    const again = new RainRunGame(store);
    expect(again.hi).toBe(2300);
    expect(again.best!.poses).toHaveLength(recorded.length);
  });

  it('Worse game: the ghost is still the one from the best game', () => {
    const store = memoryStore();
    const bestPoses = [{ t: 0.5, x: 1, y: 2, z: -3, bank: 0.25, pitch: 0 }];
    saveBest(store, { score: 5000, poses: bestPoses });
    const game = new RainRunGame(store);
    game.start();
    game.sim.score = 100;
    game.sim.lives = 1;
    lineUp(game.sim, 0, 3.0, 0);
    game.sim.invulnerable = 0;
    game.advance(STEP * 3);
    expect(game.state).toBe('gameover');
    expect(game.hi).toBe(5000);
    expect(game.newRecord).toBe(false);
    game.start();
    expect(game.ghost).toEqual(bestPoses);
  });

  it('Storage blocked: the game plays through without errors and there is no HI', () => {
    const game = new RainRunGame(blockedStore);
    expect(game.hi).toBeNull();
    game.start();
    game.sim.lives = 1;
    lineUp(game.sim, 0, 3.0, 0);
    game.sim.invulnerable = 0;
    expect(() => game.advance(STEP * 3)).not.toThrow();
    expect(game.state).toBe('gameover');
    expect(new RainRunGame(blockedStore).hi).toBeNull();
  });

  it('GAME OVER returns to ATTRACT after 20 s without interaction', () => {
    const game = new RainRunGame(null);
    game.start();
    game.sim.lives = 1;
    lineUp(game.sim, 0, 3.0, 0);
    game.sim.invulnerable = 0;
    game.advance(STEP * 3);
    expect(game.state).toBe('gameover');
    game.advance(IDLE_TO_ATTRACT - 1);
    expect(game.state).toBe('gameover');
    game.touch();
    game.advance(IDLE_TO_ATTRACT - 1);
    expect(game.state).toBe('gameover');
    game.advance(1.5);
    expect(game.state).toBe('attract');
  });
});
