import { describe, expect, it } from 'vitest';
import { advanceTo, ghostPath, launch, launchVelocity, simulate, speed } from './flight';
import { HOME, MU, WORLD_BODIES, circularSpeed, keplerOmega, orbitRadius, worldPosition } from './orbits';

const deg = Math.PI / 180;

describe('orrery geometry', () => {
  it('seven orbits with radii in steps of √φ and a 4.0 s inner period', () => {
    expect(orbitRadius(1)).toBe(1);
    expect(orbitRadius(3)).toBeCloseTo(1.618, 3);
    expect(orbitRadius(6)).toBeCloseTo(3.33, 2);
    expect(orbitRadius(7)).toBeCloseTo(4.236, 3);
    expect((2 * Math.PI) / keplerOmega(1)).toBeCloseTo(4, 6);
    expect(MU).toBeCloseTo(2.467, 3);
    expect(circularSpeed(HOME.radius)).toBeCloseTo(0.861, 3);
  });

  it('golden spiral rest pose: the five worlds 72° apart', () => {
    const angles = WORLD_BODIES.map((w) => Math.atan2(worldPosition(w, 0)[1], worldPosition(w, 0)[0]));
    for (let i = 1; i < angles.length; i++) {
      const step = (((angles[i] - angles[i - 1]) / deg) % 360 + 360) % 360;
      expect(step).toBeCloseTo(72, 6);
    }
    expect(WORLD_BODIES.map((w) => w.id)).toEqual(['e', 'd', 'a', 'b', 'c']);
  });
});

describe('rocket flight (fixtures from the art direction)', () => {
  const still = { planetTime: 1000, planetsMove: true };

  it('swallowed at full pull and −60° aim, at 2.56 s', () => {
    const f = simulate({ detents: 12, aim: -60 * deg, ...still });
    expect(f.outcome).toBe('swallowed');
    expect(f.t).toBeCloseTo(2.56, 1);
  });

  it('grazing slingshot at −20°: periapsis ≈ 0.46 and escape at 6.2 s', () => {
    const f = simulate({ detents: 12, aim: -20 * deg, ...still });
    expect(f.outcome).toBe('escaped');
    expect(f.minRadius).toBeCloseTo(0.46, 2);
    expect(f.t).toBeCloseTo(6.2, 1);
  });

  it('direct escape at 0°: periapsis ≈ 1.39 and escape at 5.75 s', () => {
    const f = simulate({ detents: 12, aim: 0, ...still });
    expect(f.outcome).toBe('escaped');
    expect(f.minRadius).toBeCloseTo(1.39, 2);
    expect(f.t).toBeCloseTo(5.75, 1);
  });

  it('bound orbit with 3 detents: ends by timeout at 20 s', () => {
    const f = simulate({ detents: 3, aim: 0, ...still });
    expect(f.outcome).toBe('timeout');
    expect(f.t).toBeCloseTo(20, 6);
  });

  it('deterministic: same pull, aim and moment, same flight', () => {
    const a = simulate({ detents: 9, aim: 15 * deg, planetTime: 3.7 });
    const b = simulate({ detents: 9, aim: 15 * deg, planetTime: 3.7 });
    expect(b.exposures).toEqual(a.exposures);
    expect(b.outcome).toBe(a.outcome);
    expect(b.surveys).toEqual(a.surveys);
  });

  it('chained survey: Plate and then Leader in a single flight', () => {
    const f = simulate({ detents: 12, aim: 20 * deg, planetTime: 0, planetsMove: false });
    expect(f.surveys.map((s) => s.world)).toEqual(['b', 'c']);
    expect(f.outcome).toBe('escaped');
  });

  it('one exposure every 1/12 s: 24 at 2 s (plus the launch one)', () => {
    const f = launch({ detents: 12, aim: 0, planetTime: 0 });
    advanceTo(f, 2);
    expect(f.exposures.filter((e) => e.t > 0).length).toBe(24);
  });

  it('the launch adds the kick of the pull to the home orbit', () => {
    const [vx, vy] = launchVelocity(12, 0);
    expect(vx).toBeCloseTo(0.861, 3);
    expect(vy).toBeCloseTo(1.2, 6);
    expect(Math.hypot(...launchVelocity(0, 0))).toBeCloseTo(0.861, 3);
    const f = launch({ detents: 6, aim: 0, planetTime: 0 });
    expect(speed(f)).toBeCloseTo(Math.hypot(0.861, 0.6), 3);
  });

  it('the ghost path covers 3 s with one mark per exposure', () => {
    const path = ghostPath({ detents: 6, aim: 10 * deg, planetTime: 0 });
    expect(path.length).toBe(37);
    const other = ghostPath({ detents: 6, aim: 15 * deg, planetTime: 0 });
    expect(other[36]).not.toEqual(path[36]);
  });
});
