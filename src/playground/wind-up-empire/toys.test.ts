import { describe, expect, it } from 'vitest';
import { Fleet, flightLines } from './fleet';
import { LOAD_SPIN, createTop, stepTop, timeToTopple } from './tops';
import { aimText, pullFromVector, touchPull } from './ui/rocketInput';

const deg = Math.PI / 180;

describe('tops', () => {
  it('from the load spin they topple at ~14.6 s, with two bounces', () => {
    expect(timeToTopple(LOAD_SPIN)).toBeCloseTo(14.63, 1);
    const top = createTop();
    let toppledAt = -1;
    for (let t = 0; t < 20; t += 1 / 60) {
      if (stepTop(top, 1 / 60) === 'topple') toppledAt = t;
    }
    expect(toppledAt).toBeGreaterThan(14);
    expect(toppledAt).toBeLessThan(15.2);
    expect(top.tilt).toBeGreaterThan(70);
  });
});

describe('rocket pull', () => {
  it('12 detents over 132 px and aim measured from "toward the Whirl"', () => {
    expect(pullFromVector(0, 66, 0)).toEqual({ detents: 6, aim: 0 });
    expect(pullFromVector(0, 400, 0).detents).toBe(12);
    // Pulling down and to the left aims up and to the right: prograde (+).
    expect(pullFromVector(-50, 50, 0).aim).toBeCloseTo(45 * deg, 6);
    // The aim is limited to ±60°.
    expect(pullFromVector(200, 10, 0).aim).toBeCloseTo(-60 * deg, 6);
    expect(pullFromVector(1, 2, 0.3).aim).toBe(0.3);
    expect(aimText(20 * deg)).toBe('20 degrees toward prograde');
    expect(aimText(0)).toBe('straight at the Whirl');
  });
});

describe('rocket pull on a touch screen (adapt-for-phones D8)', () => {
  it('touchPull: a first move away from the Whirl is a pull; toward it, or sideways, is not', () => {
    // y points down the screen; the Whirl is up from the rocket.
    expect(touchPull(0, 12)).toBe(true);
    expect(touchPull(-9, 12)).toBe(true);
    expect(touchPull(10, 3)).toBe(true);
    expect(touchPull(0, -12)).toBe(false);
    expect(touchPull(5, -30)).toBe(false);
    expect(touchPull(20, 0)).toBe(false);
    expect(touchPull(30, 5)).toBe(false);
    expect(touchPull(0, 0)).toBe(false);
  });

  it('an established touch pull clamps a forward drag to 0 detents and no launch', () => {
    // A finger dragged 160 px forward, toward the Whirl, pulls nothing and keeps the aim.
    expect(pullFromVector(0, -160, 0.2, true)).toEqual({ detents: 0, aim: 0.2 });
    expect(pullFromVector(40, -1, 0, true).detents).toBe(0);
    // Mouse and pen (no clamp): a forward drag still counts its distance, as before.
    expect(pullFromVector(0, -160, 0).detents).toBe(12);
  });

  it('a touch pull back gives the same detents and aim as the mouse', () => {
    for (const [dx, dy] of [[0, 66], [0, 110], [-50, 50], [30, 140], [0, 400]] as const) {
      expect(pullFromVector(dx, dy, 0, true)).toEqual(pullFromVector(dx, dy, 0));
    }
    expect(pullFromVector(0, 110, 0, true).detents).toBe(10);
  });
});

describe('fleet', () => {
  it('one rocket at a time with the platform at Lv 1; the demo flight takes no slot', () => {
    const fleet = new Fleet();
    expect(fleet.launch(12, -20 * deg, { demo: true })).not.toBeNull();
    expect(fleet.canLaunch).toBe(true);
    expect(fleet.launch(12, 0)).not.toBeNull();
    expect(fleet.canLaunch).toBe(false);
    expect(fleet.launch(12, 0)).toBeNull();
    expect(fleet.launch(0, 0)).toBeNull();
  });

  it('swallowed: a single line, with the refund', () => {
    const fleet = new Fleet();
    fleet.planetsMove = false;
    const ends: string[][] = [];
    fleet.on({ end: (f, outcome, newly, surveyed) => ends.push(flightLines(f, outcome, surveyed, newly)) });
    fleet.launch(12, -60 * deg);
    for (let i = 0; i < 400; i++) fleet.update(1 / 60);
    expect(ends).toEqual([['Lost to the Whirl. Rocket refunded: this is a demo.']]);
  });

  it('chained survey: one line naming both, +50 spark', () => {
    const fleet = new Fleet();
    fleet.planetsMove = false;
    const lines: string[] = [];
    let spark = 0;
    fleet.on({
      survey: (_f, _w, first) => (spark += first ? 25 : 5),
      end: (f, outcome, newly, surveyed) => lines.push(...flightLines(f, outcome, surveyed, newly)),
    });
    fleet.launch(12, 20 * deg);
    for (let i = 0; i < 600; i++) fleet.update(1 / 60);
    expect(lines[0]).toBe('Rocket 1 surveyed Plate [1:1:4] and Leader [1:1:5] in one flight. +50 spark.');
    expect(spark).toBe(50);
    expect([...fleet.charted].sort()).toEqual(['b', 'c']);
  });

  it('reduced motion: the whole flight is stamped at once', () => {
    const fleet = new Fleet();
    fleet.planetsMove = false;
    const flight = fleet.launch(12, -20 * deg, { instant: true })!;
    expect(flight.state.outcome).toBe('escaped');
    expect(fleet.exposures.length).toBe(flight.state.exposures.length);
    expect(fleet.busy).toBe(false);
  });

  it('reduced motion mid-flight: settle() prints what was left and the fleet stands still', () => {
    const fleet = new Fleet();
    fleet.planetsMove = false;
    const whole = new Fleet();
    whole.planetsMove = false;
    const reference = whole.launch(12, -20 * deg, { instant: true })!;
    const ends: string[] = [];
    fleet.on({ end: (_f, outcome) => ends.push(outcome) });
    // A clock that has already advanced (as on the page): rounding `now - endedAt` must not leave it busy.
    fleet.update(1000.1);
    fleet.launch(12, -20 * deg, { demo: true });
    for (let i = 0; i < 60; i++) fleet.update(1 / 60);
    expect(fleet.busy).toBe(true);
    fleet.settle();
    // With the clock stopped (update(0), as on the lid under reduced motion) there is nothing left to move.
    fleet.update(0);
    expect(fleet.busy).toBe(false);
    expect(fleet.active).toHaveLength(0);
    expect(ends).toEqual(['escaped']);
    expect(fleet.exposures.length).toBe(reference.state.exposures.length);
  });

  it('settle() also cuts short the exit of a flight that just ended', () => {
    const fleet = new Fleet();
    fleet.planetsMove = false;
    fleet.launch(12, -60 * deg);
    let steps = 0;
    while (fleet.active.length && steps++ < 1000) fleet.update(1 / 60);
    expect(fleet.busy).toBe(true);
    fleet.settle();
    expect(fleet.busy).toBe(false);
  });
});
