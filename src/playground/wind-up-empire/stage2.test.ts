// Pure modules of the stage-2 toys: the key's ratchet and spring, the rubbing of the spark
// wheel, the worlds' real palettes (drift against 4D.OS) and the tEXt provenance.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DETENT_DEG, KeySpring, Ratchet, wrapDeg } from './spring';
import { RubCounter } from './rub';
import { WORLD_PALETTES, paletteDrift, parsePalette } from './worldInks';
import { crc32 } from '../shared/png';
import { chunksValid, readTextChunks, withTextChunk } from './pngText';
import { Economy, windText } from './economy';
import { proofCaption } from './ui/proof';
import { Fleet, RATCHET_CLICK_S } from './fleet';
import { WORLD_BODIES } from './orbits';

describe('key ratchet', () => {
  it('one clockwise turn gives 8 detents, one every 45°', () => {
    const r = new Ratchet();
    let detents = 0;
    for (let i = 0; i < 72; i++) detents += r.feed(5).detents;
    expect(detents).toBe(8);
  });

  it('counterclockwise it only clicks: no detents, and the key does not move', () => {
    const r = new Ratchet();
    let clicks = 0;
    let detents = 0;
    for (let i = 0; i < 36; i++) {
      const out = r.feed(-10);
      clicks += out.clicks;
      detents += out.detents;
    }
    expect(detents).toBe(0);
    expect(clicks).toBe(16);
    expect(r.give).toBe(0);
  });

  it('the play between detents is partial and never reaches the next detent', () => {
    const r = new Ratchet();
    r.feed(30);
    expect(r.give).toBeCloseTo(9, 6);
    r.feed(20);
    expect(r.forward).toBeCloseTo(5, 6);
  });

  it('wrapDeg wraps the pointer jump into (−180, 180]', () => {
    expect(wrapDeg(350)).toBe(-10);
    expect(wrapDeg(-190)).toBe(170);
  });
});

describe('detent spring', () => {
  it('snaps in with a crisp ~9.7° overshoot and settles', () => {
    const s = new KeySpring();
    s.target = DETENT_DEG;
    let peak = 0;
    let t = 0;
    while (s.step(1 / 60) && t < 3) {
      peak = Math.max(peak, s.angle);
      t += 1 / 60;
    }
    expect(peak - DETENT_DEG).toBeGreaterThan(8.5);
    expect(peak - DETENT_DEG).toBeLessThan(11);
    expect(t).toBeLessThan(1.2);
    expect(s.angle).toBe(DETENT_DEG);
  });

  it('at the stop, the wobble is ±4° at most and dies out within 300 ms', () => {
    const s = new KeySpring();
    s.wobble();
    let max = 0;
    for (let i = 0; i < 30; i++) {
      s.step(1 / 60);
      max = Math.max(max, Math.abs(s.wobbleOffset));
    }
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThanOrEqual(4);
    expect(s.wobbleOffset).toBe(0);
    expect(s.settled).toBe(true);
  });

  it('under reduced motion it jumps without overshoot', () => {
    const s = new KeySpring();
    s.target = 90;
    s.snap();
    expect(s.angle).toBe(90);
    expect(s.step(1 / 60)).toBe(false);
  });
});

describe('the key and the economy', () => {
  it('"Winding by keyboard": PageUp three times is 24 of 96, three turns', () => {
    const e = new Economy();
    for (let i = 0; i < 3; i++) e.addWind(8);
    expect(e.detents).toBe(24);
    expect(e.turns).toBe(3);
    expect(windText(e.detents)).toBe('3 turns wound');
    expect(windText(29)).toBe('3 turns and 5 eighths wound');
  });

  it('pause: pressing the key while it runs stops the work from advancing', () => {
    const e = new Economy();
    e.addWind(16);
    e.letGo();
    e.tick(1);
    const progress = e.state.queue[0].progress;
    e.hold(true);
    expect(e.state.mode).toBe('hold');
    e.tick(2);
    expect(e.state.queue[0].progress).toBe(progress);
    e.hold(false);
    e.tick(1);
    expect(e.state.queue[0].progress).toBeGreaterThan(progress);
  });
});

describe('spark wheel', () => {
  it('"Rubbing": 10 changes of direction of more than 12 px, at a slow pace, add up to 5', () => {
    const rub = new RubCounter();
    let spark = 0;
    let now = 0;
    let x = 0;
    rub.move(x, now);
    // 11 alternating 20 px segments, 5 steps each, one segment every 250 ms.
    for (let leg = 0; leg < 11; leg++) {
      const dir = leg % 2 ? -1 : 1;
      for (let i = 0; i < 5; i++) {
        x += dir * 4;
        now += 50;
        spark += rub.move(x, now);
      }
    }
    expect(spark).toBe(5);
  });

  it('segments shorter than 12 px do not count', () => {
    const rub = new RubCounter();
    let spark = 0;
    let x = 0;
    rub.move(0, 0);
    for (let leg = 0; leg < 20; leg++) {
      x += leg % 2 ? -8 : 8;
      spark += rub.move(x, leg * 200);
    }
    expect(spark).toBe(0);
  });

  it('"Cap": rubbing as fast as possible for 5 s adds up to 30 at most', () => {
    const rub = new RubCounter();
    let spark = 0;
    let x = 0;
    rub.move(0, 0);
    for (let t = 0; t < 5000; t += 8) {
      x += (Math.floor(t / 16) % 2 ? -1 : 1) * 20;
      spark += rub.move(x, t);
    }
    expect(spark).toBeLessThanOrEqual(30);
    expect(spark).toBeGreaterThan(25);
  });

  it('"By keyboard": two presses of the button add up to 1', () => {
    const rub = new RubCounter();
    expect(rub.stroke(0) + rub.stroke(300)).toBe(1);
  });
});

describe("the worlds' real inks", () => {
  const worldTokens = (id: string) => readFileSync(resolve(import.meta.dirname, `../../4d-os/worlds/${id}/tokens.css`), 'utf8');

  it('the five palettes match those of 4D.OS', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e'] as const) {
      expect(parsePalette(worldTokens(id))).toHaveLength(16);
      expect(paletteDrift(id, worldTokens(id))).toEqual([]);
    }
  });

  it('an altered ink makes the comparison fail, naming the world and the ink', () => {
    const css = worldTokens('b').replace(/--pal-16-7:\s*#[0-9a-f]{6}/i, '--pal-16-7: #000000');
    expect(paletteDrift('b', css)).toEqual([`world b, ink 7: ${WORLD_PALETTES.b[7]} here, #000000 in 4D.OS`]);
  });
});

describe('PNG tEXt provenance', () => {
  function tinyPng(): Uint8Array {
    const chunk = (type: string, data: Uint8Array) => {
      const out = new Uint8Array(12 + data.length);
      const view = new DataView(out.buffer);
      view.setUint32(0, data.length);
      out.set([...type].map((c) => c.charCodeAt(0)), 4);
      out.set(data, 8);
      view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
      return out;
    };
    const ihdr = new Uint8Array(13);
    const v = new DataView(ihdr.buffer);
    v.setUint32(0, 1);
    v.setUint32(4, 1);
    ihdr.set([8, 2, 0, 0, 0], 8);
    const idat = new Uint8Array(deflateSync(Buffer.from([0, 27, 44, 196])));
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array())];
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) (out.set(p, at), (at += p.length));
    return out;
  }

  it('inserts a valid tEXt after IHDR and it can be read back', () => {
    const png = withTextChunk(tinyPng(), 'Description', 'Synthetic print of a visit.');
    expect(chunksValid(png)).toBe(true);
    expect(readTextChunks(png)).toEqual({ Description: 'Synthetic print of a visit.' });
    expect(String.fromCharCode(...png.subarray(37, 41))).toBe('tEXt');
  });
});

describe('proof caption', () => {
  it('"Caption with the session": 12 flights, 3 charted, 7 turns and the local date', () => {
    const when = new Date(2026, 8, 25, 14, 2);
    expect(proofCaption(12, 3, 7, when)).toBe('WIND-UP EMPIRE · proof of a visit · 12 flights · 3 charted · 7 turns wound · 2026-09-25 14:02');
    expect(proofCaption(1, 0, 1, when)).toContain('1 flight · 0 charted · 1 turn wound');
  });
});

describe('Reset universe: return to the golden spiral rest pose', () => {
  it('three 400 ms clicks, each planet takes the short way, and it ends at rest', () => {
    const fleet = new Fleet();
    fleet.update(7.3);
    const clicks: number[] = [];
    fleet.on({ ratchet: (n) => clicks.push(n) });
    fleet.reset(true);
    expect(fleet.canLaunch).toBe(false);
    let steps = 0;
    while (fleet.ratchet && steps++ < 200) fleet.update(1 / 60);
    expect(steps * (1 / 60)).toBeCloseTo(1.2, 1);
    expect(clicks).toEqual([1, 2, 3]);
    expect(fleet.ratchet).toBeNull();
    expect(fleet.canLaunch).toBe(true);
    for (const w of WORLD_BODIES) expect(fleet.planetAngle(w)).toBeCloseTo(w.rest, 9);
    expect(RATCHET_CLICK_S).toBe(0.4);
  });

  it('halfway through, each planet sits between where it was and its rest, with no extra turns', () => {
    const fleet = new Fleet();
    fleet.update(5);
    const before = WORLD_BODIES.map((w) => fleet.planetAngle(w));
    fleet.reset(true);
    fleet.update(0.6);
    WORLD_BODIES.forEach((w, i) => {
      const d0 = Math.atan2(Math.sin(before[i] - w.rest), Math.cos(before[i] - w.rest));
      const d = fleet.planetAngle(w) - w.rest;
      expect(Math.abs(d)).toBeLessThanOrEqual(Math.abs(d0) + 1e-9);
      expect(Math.sign(d) === Math.sign(d0) || Math.abs(d) < 1e-9).toBe(true);
    });
  });
});
