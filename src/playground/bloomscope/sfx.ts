// Kaleidoscope voices, synthesis only (on top of shared/sound): Sow's pentatonic notes, the
// golden-angle bell, the leaves' marimba, the drip, and the wooden knock of the caps. All of them
// stay silent with the sound off (the shared `sound.play` does nothing).

import { sound } from '../shared/sound';
import { PENTATONIC } from './sow/sow';

/** A maximum rate per second for one voice. */
export function limiter(perSecond: number): () => boolean {
  const times: number[] = [];
  return () => {
    const now = performance.now();
    while (times.length && now - times[0] > 1000) times.shift();
    if (times.length >= perSecond) return false;
    times.push(now);
    return true;
  };
}

/** Development only: the browser tests read the notes played ("The melody of fives"). */
export const noteLog: number[] = [];

/** Plucks a Sow note (an index into the pentatonic scale). */
export function pluck(note: number): void {
  if (import.meta.env.DEV && sound.enabled) noteLog.push(note);
  const freq = PENTATONIC[note];
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const over = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    over.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    over.frequency.setValueAtTime(freq * 2, t);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(env);
    over.connect(env);
    env.connect(out);
    osc.start(t);
    over.start(t);
    osc.stop(t + 0.34);
    over.stop(t + 0.34);
    return 0.34;
  });
}

/** Golden-angle bell: sines at 1318 and 2637 Hz, 600 ms. */
export function bell(): void {
  sound.play(({ ctx, out, t }) => {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.28, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    for (const [f, g] of [
      [1318.5, 1],
      [2637, 0.45],
    ]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(f, t);
      gain.gain.value = g;
      osc.connect(gain).connect(env);
      osc.start(t);
      osc.stop(t + 0.62);
    }
    env.connect(out);
    return 0.62;
  });
}

/** Soft FM marimba (a lathe leaf, a honeycomb step). */
export function marimba(freq: number, gain = 0.25): void {
  sound.play(({ ctx, out, t }) => {
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();
    carrier.frequency.setValueAtTime(freq, t);
    mod.frequency.setValueAtTime(freq * 4, t);
    modGain.gain.setValueAtTime(freq * 1.6, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + 0.18);
    mod.connect(modGain).connect(carrier.frequency);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    carrier.connect(env).connect(out);
    carrier.start(t);
    mod.start(t);
    carrier.stop(t + 0.42);
    mod.stop(t + 0.42);
    return 0.42;
  });
}

/** Drip: a sine that falls from 1.4 to 0.5 kHz in 90 ms. */
export function drip(): void {
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.09);
    env.gain.setValueAtTime(0.3, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + 0.13);
    return 0.13;
  });
}

let noiseBuffer: AudioBuffer | null = null;

/** Wooden knock of a cap: noise band-passed at 900 Hz, Q 4, 40 ms. */
export function tock(): void {
  sound.play(({ ctx, out, t }) => {
    if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
      noiseBuffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.1), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let seed = 7;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = seed / 2147483648 - 1;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(filter).connect(env).connect(out);
    src.start(t);
    src.stop(t + 0.05);
    return 0.05;
  });
}
