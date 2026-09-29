import { describe, expect, it } from 'vitest';
import { Chamber, SHAKE_SPEED, STEP } from './chamber';
import { MIRROR_ORDER, fold, foldDihedral, inFundamental, viewToCell } from './fold';
import { DETENT, MAX_RELEASE, Ring, pointerAngle, wrap360 } from './ring';

/** Runs the ring until it stops (or the time runs out). */
function settle(ring: Ring, seconds = 10, dt = 1 / 60): number {
  let t = 0;
  while (ring.moving && t < seconds) {
    ring.update(dt);
    t += dt;
  }
  return t;
}

describe('brass ring', () => {
  it('the initial spin on load (220°/s) catches at 90° at 144, 60, 20 and 10 fps', () => {
    for (const dt of [1 / 144, 1 / 60, 1 / 20, 1 / 10]) {
      const ring = new Ring();
      ring.fling(220);
      settle(ring, 10, dt);
      expect(ring.angle).toBeCloseTo(90, 6);
    }
  });

  it('release without velocity at 52°: settles at 45° (Release without velocity)', () => {
    const ring = new Ring();
    ring.grab(0, 0);
    ring.drag(30, 100);
    ring.drag(52, 200);
    ring.release(600); // the finger stayed still for almost half a second
    settle(ring);
    expect(ring.value).toBeCloseTo(45, 6);
    expect(ring.omega).toBe(0);
  });

  it('a quick flick keeps turning the same way, slows down and ends on a multiple of 15° (Momentum)', () => {
    const ring = new Ring();
    ring.grab(0, 0);
    for (let i = 1; i <= 5; i++) ring.drag(i * 6, i * 16); // 6° every 16 ms ≈ 375°/s
    ring.release(80);
    expect(ring.omega).toBeGreaterThan(300);
    const start = ring.angle;
    let previous = ring.omega;
    let monotonic = true;
    for (let i = 0; i < 30; i++) {
      ring.update(1 / 60);
      if (ring.phase === 'free' && ring.omega > previous + 1e-9) monotonic = false;
      previous = ring.omega;
    }
    expect(monotonic).toBe(true);
    expect(ring.angle).toBeGreaterThan(start + 60);
    settle(ring);
    expect(ring.angle % DETENT).toBeCloseTo(0, 6);
    expect(ring.angle).toBeGreaterThan(start);
  });

  it('also spins freely the other way', () => {
    const ring = new Ring();
    ring.fling(-500);
    const start = ring.angle;
    settle(ring);
    expect(ring.angle).toBeLessThan(start - 100);
    expect(Math.abs(ring.angle % DETENT)).toBeCloseTo(0, 6);
  });

  it('the release velocity is capped at ±720°/s', () => {
    const ring = new Ring();
    ring.grab(0, 0);
    ring.drag(90, 20);
    ring.drag(170, 40);
    ring.release(41);
    expect(ring.omega).toBe(MAX_RELEASE);
  });

  it('above 40°/s there is no detent: it spins freely', () => {
    const ring = new Ring();
    ring.fling(200);
    ring.update(1 / 60);
    expect(ring.phase).toBe('free');
  });

  it('a keyboard step leaves the barrel at 5°, with no detent (Keyboard)', () => {
    const ring = new Ring();
    ring.step(5);
    expect(ring.phase).toBe('idle');
    for (let i = 0; i < 60; i++) ring.update(1 / 60);
    expect(ring.value).toBe(5);
  });

  it('counts the detents it crosses', () => {
    const ticks: number[] = [];
    const ring = new Ring({ onDetent: (a) => ticks.push(a) });
    ring.step(16);
    ring.step(15);
    expect(ticks).toEqual([15, 30]);
  });

  it('"Every turn at once": exactly one turn at 120°/s in 3 s', () => {
    const ring = new Ring();
    ring.set(30);
    ring.drive(360, 120);
    const t = settle(ring, 10, 1 / 60);
    expect(t).toBeCloseTo(3, 1);
    expect(ring.angle).toBe(390);
    expect(ring.value).toBe(30);
  });

  it('without inertia (reduced motion) a release settles instantly', () => {
    const ring = new Ring();
    ring.inertia = false;
    ring.grab(0, 0);
    ring.drag(50, 10);
    ring.drag(100, 20);
    ring.release(21);
    expect(ring.moving).toBe(false);
    expect(ring.value).toBe(105);
  });

  it("the pointer angle runs clockwise from 12 o'clock", () => {
    expect(pointerAngle(0, -10, 0, 0)).toBeCloseTo(0);
    expect(pointerAngle(10, 0, 0, 0)).toBeCloseTo(90);
    expect(pointerAngle(0, 10, 0, 0)).toBeCloseTo(180);
    expect(pointerAngle(-10, 0, 0, 0)).toBeCloseTo(270);
    expect(wrap360(-15)).toBe(345);
  });
});

describe('mirror folding', () => {
  const points: [number, number][] = [];
  for (let i = 0; i < 4000; i++) {
    const r = Math.sqrt(((i * 0.618034) % 1) * 0.999);
    const t = i * 2.39996;
    points.push([r * Math.cos(t), r * Math.sin(t)]);
  }

  for (const mode of MIRROR_ORDER) {
    it(`${mode}: every point of the disc lands in the fundamental domain`, () => {
      for (const [x, y] of points) {
        const [fx, fy] = fold(x, y, mode);
        expect(inFundamental(fx, fy, mode, 1e-5)).toBe(true);
      }
    });

    it(`${mode}: the reflections preserve distance from the mirror origin (local isometry)`, () => {
      // Two very close points inside the same domain stay just as close after folding.
      for (const [x, y] of points.slice(0, 400)) {
        const [ax, ay] = fold(x, y, mode);
        const [bx, by] = fold(x + 1e-5, y, mode);
        const d = Math.hypot(ax - bx, ay - by);
        expect(d).toBeLessThan(1.5e-5);
      }
    });
  }

  it('D5: turning the view 72° gives the same image (Five folds)', () => {
    const c = Math.cos((72 * Math.PI) / 180);
    const s = Math.sin((72 * Math.PI) / 180);
    for (const [x, y] of points.slice(0, 500)) {
      const [ax, ay] = foldDihedral(x, y, 5);
      const [bx, by] = foldDihedral(x * c - y * s, x * s + y * c, 5);
      expect(ax).toBeCloseTo(bx, 9);
      expect(ay).toBeCloseTo(by, 9);
    }
  });

  it('D3: turning 120° or reflecting in a mirror gives the same image', () => {
    const c = Math.cos((120 * Math.PI) / 180);
    const s = Math.sin((120 * Math.PI) / 180);
    // Mirror at +30° from "down": direction (sin 30°, −cos 30°).
    const mx = Math.sin(Math.PI / 6);
    const my = -Math.cos(Math.PI / 6);
    for (const [x, y] of points.slice(0, 300)) {
      const [ax, ay] = foldDihedral(x, y, 3);
      const [bx, by] = foldDihedral(x * c - y * s, x * s + y * c, 3);
      expect(ax).toBeCloseTo(bx, 9);
      expect(ay).toBeCloseTo(by, 9);
      const d = x * mx + y * my;
      const [rx, ry] = [2 * d * mx - x, 2 * d * my - y];
      const [ex, ey] = foldDihedral(rx, ry, 3);
      expect(ax).toBeCloseTo(ex, 9);
      expect(ay).toBeCloseTo(ey, 9);
    }
  });

  it('turning the barrel 90° moves the "down" of the view to the side of the cell', () => {
    const [x, y] = viewToCell(0, -1, 90);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
  });
});

function loadedChamber(seed = 7): Chamber {
  const chamber = new Chamber(seed);
  const radii = [0.24, 0.2, 0.2, 0.07, 0.08, 0.06, 0.09, 0.07, 0.06, 0.08, 0.07, 0.09, 0.06];
  radii.forEach((r, i) => {
    const t = i * 2.4;
    chamber.add({ kind: r > 0.1 ? 'specimen' : 'bead', key: i, r, x: 0.5 * Math.cos(t), y: 0.5 * Math.sin(t) });
  });
  return chamber;
}

describe('chamber', () => {
  it('the bodies fall, bounce and fall asleep', () => {
    const chamber = loadedChamber();
    chamber.simulate(8);
    expect(chamber.asleep).toBe(true);
    for (const b of chamber.bodies) {
      expect(Math.hypot(b.x, b.y) + b.r).toBeLessThanOrEqual(1 + 1e-6);
      expect(b.y).toBeLessThan(0);
    }
    // No significant overlaps.
    const [a, b] = [chamber.bodies[0], chamber.bodies[1]];
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r - 0.02);
  });

  it('turning the barrel 180° makes the bodies fall toward the side that is now down (Turning makes things roll)', () => {
    const chamber = loadedChamber();
    chamber.simulate(6);
    const before = chamber.bodies.reduce((s, b) => s + b.y, 0) / chamber.bodies.length;
    expect(before).toBeLessThan(-0.4);
    chamber.setBarrel(180);
    expect(chamber.asleep).toBe(false);
    chamber.simulate(6);
    const after = chamber.bodies.reduce((s, b) => s + b.y, 0) / chamber.bodies.length;
    // In the cell, "down on the screen" is now +y.
    expect(after).toBeGreaterThan(0.4);
    for (const b of chamber.bodies) {
      const [, sy] = viewToCell(b.x, b.y, -180);
      expect(sy).toBeLessThan(0.2);
    }
  });

  it('asleep, step does nothing and requests no frames (At rest)', () => {
    const chamber = loadedChamber();
    chamber.simulate(8);
    const snapshot = JSON.stringify(chamber.bodies.map((b) => [b.x, b.y, b.a]));
    const result = chamber.step(1 / 60);
    expect(result.moved).toBe(false);
    expect(JSON.stringify(chamber.bodies.map((b) => [b.x, b.y, b.a]))).toBe(snapshot);
  });

  it('keeps 12 exposures per body, every 50 ms, and they stay fixed once asleep (Frozen plate)', () => {
    const chamber = loadedChamber();
    chamber.simulate(0.3);
    const b = chamber.bodies[3];
    expect(b.trail.length).toBeGreaterThan(3);
    chamber.simulate(8);
    expect(chamber.asleep).toBe(true);
    for (const body of chamber.bodies) expect(body.trail.length).toBeLessThanOrEqual(12);
    expect(chamber.bodies.some((body) => body.trail.length === 12)).toBe(true);
    const plate = JSON.stringify(chamber.bodies.map((body) => body.trail));
    chamber.step(0.5);
    expect(JSON.stringify(chamber.bodies.map((body) => body.trail))).toBe(plate);
  });

  it('24 exposures every 66 ms during "Every turn at once", and HOLD freezes everything', () => {
    const chamber = loadedChamber();
    chamber.simulate(6);
    chamber.setExposures(24, 0.066);
    let beta = 0;
    chamber.simulate(3, (t) => {
      beta = t * 120;
      chamber.setBarrel(beta);
    });
    expect(Math.max(...chamber.bodies.map((b) => b.trail.length))).toBe(24);
    chamber.hold = true;
    const frozen = JSON.stringify(chamber.bodies.map((b) => [b.x, b.y, b.trail.length]));
    chamber.setBarrel(200);
    expect(chamber.step(0.25).moved).toBe(false);
    expect(JSON.stringify(chamber.bodies.map((b) => [b.x, b.y, b.trail.length]))).toBe(frozen);
    chamber.release();
    expect(chamber.hold).toBe(false);
    expect(Math.max(...chamber.bodies.map((b) => b.trail.length))).toBeLessThanOrEqual(12);
  });

  it('the shake gives every body 1.8 R/s in a seeded direction', () => {
    const a = loadedChamber(3);
    const b = loadedChamber(3);
    a.simulate(6);
    b.simulate(6);
    a.shake();
    b.shake();
    for (let i = 0; i < a.bodies.length; i++) {
      expect(Math.hypot(a.bodies[i].vx, a.bodies[i].vy)).toBeCloseTo(SHAKE_SPEED, 5);
      expect(a.bodies[i].vx).toBe(b.bodies[i].vx);
    }
  });

  it('the horizontal push moves the contents toward the side of the drag', () => {
    const chamber = loadedChamber();
    chamber.simulate(6);
    const before = chamber.bodies.reduce((s, b) => s + b.x, 0);
    chamber.push(800);
    chamber.simulate(0.25);
    const after = chamber.bodies.reduce((s, b) => s + b.x, 0);
    expect(after).toBeGreaterThan(before);
  });

  it('same seed, same steps: same result (determinism)', () => {
    const run = () => {
      const chamber = loadedChamber(11);
      chamber.shake();
      chamber.simulate(2, (t) => chamber.setBarrel(t * 90));
      return chamber.bodies.map((b) => [b.x, b.y, b.a]);
    };
    expect(run()).toEqual(run());
  });

  it('falling bodies enter from the top of the view and settle', () => {
    const chamber = new Chamber(5);
    for (let i = 0; i < 10; i++) chamber.drop({ kind: 'bead', key: i, r: 0.07 }, i * 0.1);
    expect(chamber.bodies.length).toBe(0);
    chamber.simulate(STEP * 2);
    expect(chamber.bodies.length).toBe(1);
    expect(chamber.bodies[0].y).toBeGreaterThan(0.4);
    chamber.simulate(8);
    expect(chamber.bodies.length).toBe(10);
    expect(chamber.asleep).toBe(true);
  });
});
