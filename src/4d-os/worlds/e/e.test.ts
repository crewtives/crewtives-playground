import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FRAME_COUNT, WHALE_FALL, fallStateAtFrame, properTime } from '../../../pipeline/scenes/whaleFall';
import { timeAtProperTime } from './charts';
import { trailCopies } from './fallLayers';
import { ECHO_GAP, pathStride, profileAzimuth, profileSide } from './fallPath';
import { itsStretch } from './readouts';

describe('E · clocks', () => {
  const first = fallStateAtFrame(0);
  const last = fallStateAtFrame(FRAME_COUNT - 1);

  it('its clock stretches from 0 to 1 between the first and the last frame, never going back', () => {
    expect(itsStretch(first, first, last)).toBe(0);
    expect(itsStretch(last, first, last)).toBe(1);
    let previous = -1;
    for (let f = 0; f < FRAME_COUNT; f++) {
      const k = itsStretch(fallStateAtFrame(f), first, last);
      expect(k).toBeGreaterThanOrEqual(previous);
      previous = k;
    }
  });

  it('its clock falls behind yours and the difference grows', () => {
    let lag = -1;
    for (let f = 1; f < FRAME_COUNT; f++) {
      const state = fallStateAtFrame(f);
      expect(state.tau).toBeLessThan(state.t);
      expect(state.t - state.tau).toBeGreaterThan(lag);
      lag = state.t - state.tau;
    }
  });

  it('the ticks of its pen fall where its clock marks each second', () => {
    for (let k = 0; k <= 10; k++) expect(properTime(timeAtProperTime(k))).toBeCloseTo(k, 6);
    // Each of its seconds lasts longer, in your time, than the previous one.
    const ticks = Array.from({ length: 10 }, (_, k) => timeAtProperTime(k));
    for (let k = 2; k < ticks.length; k++) expect(ticks[k] - ticks[k - 1]).toBeGreaterThan(ticks[k - 1] - ticks[k - 2]);
    expect(timeAtProperTime(WHALE_FALL.duration * 10)).toBe(Infinity);
  });
});

describe('E · palette', () => {
  const css = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8');
  const token = (name: string) => css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1].toLowerCase();
  const palette = new Set(Array.from({ length: 16 }, (_, i) => token(`--pal-16-${i}`)));

  it('has 16 distinct colors', () => {
    expect(palette.size).toBe(16);
    expect(palette.has(undefined)).toBe(false);
  });

  it('every viewer role, every accent and every chrome color is a member of the palette', () => {
    const roles = ['--pal-1bit-0', '--pal-1bit-1', '--accent-forward', '--accent-rewind', '--accent-hold', '--scene-bg', '--trail', '--future', '--frustum', '--trajectory'];
    const chrome = ['--void', '--night', '--deep', '--slate', '--periwinkle', '--ice', '--bone', '--cream', '--gold', '--orange', '--flame', '--ember', '--garnet', '--grid'];
    for (const name of [...roles, ...chrome]) expect(palette.has(token(name)), name).toBe(true);
  });
});

describe('E · trail and framings', () => {
  const last = FRAME_COUNT - 1;
  const fps = WHALE_FALL.fps;
  const stride = pathStride(fps, ECHO_GAP);
  const pathLength = (from: number, to: number) => {
    let sum = 0;
    for (let f = from; f < to; f++) {
      const a = fallStateAtFrame(f).position;
      const b = fallStateAtFrame(f + 1).position;
      sum += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    }
    return sum;
  };

  it('the copies come out in order, at their stride, and respect the span and the future', () => {
    const constant = () => 10;
    expect(trailCopies(35, last, constant)).toEqual([5, 15, 25]);
    expect(trailCopies(35, last, constant, { span: 20 })).toEqual([15, 25]);
    expect(trailCopies(435, last, constant, { future: true })).toContain(445);
    expect(trailCopies(0, last, constant)).toEqual([]);
  });

  it('in the last 3 s the stride is 24 frames or more, and the whale never overlaps its copy', () => {
    for (let f = last - 3 * fps; f <= last; f++) expect(stride(f)).toBeGreaterThanOrEqual(24);
    const copies = [...trailCopies(last, last, stride), last];
    expect(copies.length).toBeGreaterThan(8);
    for (let i = 1; i < copies.length; i++) expect(pathLength(copies[i - 1], copies[i])).toBeGreaterThanOrEqual(ECHO_GAP * 0.99);
  });

  it('the profile framing looks side-on at the whale of the last frame, from outside its orbit', () => {
    const azimuth = (profileAzimuth(fps, last) * Math.PI) / 180;
    const view = [Math.cos(azimuth), Math.sin(azimuth)];
    const { forward, position } = fallStateAtFrame(last);
    const ahead = Math.hypot(forward[0], forward[2]);
    expect(Math.abs((view[0] * forward[0] + view[1] * forward[2]) / ahead)).toBeLessThan(1e-9);
    expect(view[0] * position[0] + view[1] * position[2]).toBeGreaterThan(0);
  });

  it('the full plate of the hero sits at that same azimuth', () => {
    const start = fallStateAtFrame(0).position;
    const end = fallStateAtFrame(last).position;
    const global = (Math.atan2(end[2] - start[2], end[0] - start[0]) * 180) / Math.PI;
    const camera = global + 180 + profileSide(fps, last);
    const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
    expect(wrap(camera - profileAzimuth(fps, last))).toBeCloseTo(0, 9);
    expect(Math.abs(profileSide(fps, last))).toBeLessThanOrEqual(180);
  });
});
