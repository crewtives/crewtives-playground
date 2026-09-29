// Tin voices synthesized on top of shared/sound.ts: nothing plays unless the visitor turned the
// sound on with a gesture during this page load. No audio files.
import { noise, sound } from '../shared/sound';

/** Detent tick: 6 ms of noise through a 3.2 kHz band-pass. */
export function detentTick(pitch = 1): void {
  noise(0.006, 3200 * pitch, 'bandpass', 0.5);
}

/** Flywheel whine that rises with the pull (d from 0 to 1). */
export function whine(d: number): void {
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const f = 300 + 600 * d;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 0.94, t);
    osc.frequency.linearRampToValueAtTime(f, t + 0.08);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.05, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + 0.18);
    return 0.18;
  });
}

/** Launch zip: FM, carrier from 220 to 880 Hz in 180 ms. */
export function launchZip(): void {
  sound.play(({ ctx, out, t }) => {
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();
    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(220, t);
    carrier.frequency.exponentialRampToValueAtTime(880, t + 0.18);
    mod.frequency.setValueAtTime(330, t);
    mod.frequency.exponentialRampToValueAtTime(1320, t + 0.18);
    modGain.gain.setValueAtTime(3 * 330, t);
    mod.connect(modGain).connect(carrier.frequency);
    env.gain.setValueAtTime(0.28, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    carrier.connect(env).connect(out);
    carrier.start(t);
    mod.start(t);
    carrier.stop(t + 0.24);
    mod.stop(t + 0.24);
    return 0.24;
  });
}

/** Glissando of a swallowed rocket: triangle from 440 to 55 Hz in 1.2 s with rising resonance. */
export function swallowGlide(): void {
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 1.2);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 1.2);
    filter.Q.setValueAtTime(2, t);
    filter.Q.linearRampToValueAtTime(12, t + 1.2);
    env.gain.setValueAtTime(0.3, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
    osc.connect(filter).connect(env).connect(out);
    osc.start(t);
    osc.stop(t + 1.3);
    return 1.3;
  });
}

/** Tin clank: inharmonic partials plus a low thump. */
export function clank(gain = 0.35): void {
  sound.play(({ ctx, out, t }) => {
    const partials: [number, number][] = [
      [1, 0.18],
      [2.76, 0.12],
      [5.4, 0.08],
      [8.93, 0.05],
    ];
    for (const [ratio, decay] of partials) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 * ratio, t);
      env.gain.setValueAtTime(gain / ratio, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(env).connect(out);
      osc.start(t);
      osc.stop(t + decay + 0.02);
    }
    const thump = ctx.createOscillator();
    const tenv = ctx.createGain();
    thump.frequency.setValueAtTime(180, t);
    tenv.gain.setValueAtTime(gain, t);
    tenv.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    thump.connect(tenv).connect(out);
    thump.start(t);
    thump.stop(t + 0.08);
    return 0.2;
  });
}

/** Press thunk: a 70 Hz sine with a noise click. */
export function pressThunk(): void {
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.setValueAtTime(70, t);
    env.gain.setValueAtTime(0.45, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + 0.1);
    return 0.1;
  });
  noise(0.01, 1800, 'bandpass', 0.3);
}

/** Ratchet slip at the stop: 4 ticks 25 ms apart, 10 % lower in pitch. */
export function ratchetSlip(): void {
  for (let i = 0; i < 4; i++) window.setTimeout(() => detentTick(0.9), i * 25);
}

/** Whirr of the unwinding spring: 90 Hz sawtooth, 600 Hz low-pass, 11 Hz LFO. */
export function unwindWhirr(level = 1): void {
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    lfo.frequency.setValueAtTime(11, t);
    lfoGain.gain.setValueAtTime(0.05 * level, t);
    lfo.connect(lfoGain).connect(env.gain);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.08 * level, t + 0.04);
    env.gain.linearRampToValueAtTime(0.0001, t + 0.34);
    osc.connect(filter).connect(env).connect(out);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.36);
    lfo.stop(t + 0.36);
    return 0.36;
  });
}

/**
 * Hum of a top: a sine plus its second harmonic at f = 90 + 2.2ω Hz (−24 dB), following the decay
 * of the spin for `seconds`. `wind` (0–1) raises the pitch, like everything that tightens the spring.
 */
export function hum(omega: number, seconds: number, wind = 0): void {
  sound.play(({ ctx, out, t }) => {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.063, t + 0.05);
    env.gain.setValueAtTime(0.063, t + seconds * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    env.connect(out);
    const lift = 1 + 0.25 * wind;
    for (const [harmonic, gain] of [
      [1, 1],
      [2, 0.35],
    ] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.type = 'sine';
      // dω/dt = −0.08ω − 0.6: the pitch falls with the spin.
      for (let k = 0; k <= 8; k++) {
        const s = (seconds * k) / 8;
        const w = Math.max(0, (omega + 7.5) * Math.exp(-0.08 * s) - 7.5);
        osc.frequency.setValueAtTime((90 + 2.2 * w) * harmonic * lift, t + s);
      }
      osc.connect(g).connect(env);
      osc.start(t);
      osc.stop(t + seconds + 0.02);
    }
    return seconds;
  });
}

/** Crackle of the spark wheel: 8 to 20 grains of 2 ms noise within 120 ms. */
export function crackle(): void {
  const grains = 8 + Math.floor(Math.random() * 13);
  for (let i = 0; i < grains; i++) {
    window.setTimeout(() => noise(0.002, 2500 + Math.random() * 3000, 'highpass', 0.35), Math.random() * 120);
  }
}

let carryClicks: number[] = [];

/** Click of the counter drums carrying over: 2 ms, at most 30 per second. */
export function carryClick(): void {
  const now = performance.now();
  carryClicks = carryClicks.filter((t) => now - t < 1000);
  if (carryClicks.length >= 30) return;
  carryClicks.push(now);
  noise(0.002, 4200, 'bandpass', 0.4);
}
