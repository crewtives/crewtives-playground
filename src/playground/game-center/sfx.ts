// Voices of the building's machines, synthesized on top of the playground's shared sound.
// All of them stay silent if the sound is off (sound.play does nothing).
import { blip, glide, noise, sound } from '../shared/sound';

/** C major pentatonic: the pitch of the gates rises with the combo (×1 … ×8). */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** A sustained hum (engine, ballast, rain) that is switched on and off by hand. */
export interface Hum {
  stop(): void;
  /** Changes the frequency (follows the engine speed, for example). */
  set(freq: number): void;
}

const SILENT: Hum = { stop() {}, set() {} };

/**
 * Starts a hum: oscillator → low-pass → volume. If the sound is off nothing plays.
 * The voice takes no slot in the voice cap (it lasts 0 for the counter) and is cut with `stop`.
 */
export function hum(freq: number, type: OscillatorType, cutoff: number, gain: number): Hum {
  return sustain(gain, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    osc.connect(filter);
    return { source: osc, tail: filter, freq: osc.frequency };
  });
}

let hissBuffer: AudioBuffer | null = null;

/** Sustained hiss (rain): approximate pink noise in a loop, filtered. */
export function hiss(cutoff: number, gain: number): Hum {
  return sustain(gain, (ctx) => {
    if (!hissBuffer || hissBuffer.sampleRate !== ctx.sampleRate) {
      hissBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = hissBuffer.getChannelData(0);
      // Paul Kellet's filter (economy version) to approximate pink noise.
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = hissBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    src.connect(filter);
    return { source: src, tail: filter, freq: filter.frequency };
  });
}

function sustain(
  gain: number,
  build: (ctx: AudioContext) => { source: AudioScheduledSourceNode; tail: AudioNode; freq: AudioParam },
): Hum {
  const nodes: { ctx?: AudioContext; source?: AudioScheduledSourceNode; env?: GainNode; freq?: AudioParam } = {};
  sound.play(({ ctx, out, t }) => {
    const { source, tail, freq } = build(ctx);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.05);
    tail.connect(env).connect(out);
    source.start(t);
    Object.assign(nodes, { ctx, source, env, freq });
    // Lasts 0 for the voice counter: `stop` cuts it.
    return 0;
  });
  const { ctx, source, env, freq } = nodes;
  if (!ctx || !source || !env || !freq) return SILENT;
  let stopped = false;
  const handle: Hum = {
    stop() {
      if (stopped) return;
      stopped = true;
      off();
      const t = ctx.currentTime;
      env.gain.cancelScheduledValues(t);
      env.gain.setValueAtTime(Math.max(0.0001, env.gain.value), t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      source.stop(t + 0.08);
    },
    set(f: number) {
      if (!stopped) freq.setTargetAtTime(f, ctx.currentTime, 0.05);
    },
  };
  const off = sound.onChange((on) => {
    if (!on) handle.stop();
  });
  return handle;
}

export const sfx = {
  /** Microswitch: a 4 ms click plus a short blip. */
  click(): void {
    noise(0.004, 3000, 'bandpass', 0.25);
    blip(2200, 0.012, 'square', 0.08);
  },
  /** START / credit: B5 and then E6. */
  start(): void {
    blip(988, 0.06, 'square', 0.18);
    window.setTimeout(() => blip(1319, 0.22, 'square', 0.16), 70);
  },
  gate(combo: number): void {
    blip(PENTATONIC[Math.min(PENTATONIC.length, Math.max(1, combo)) - 1], 0.09, 'square', 0.16);
  },
  crash(): void {
    noise(0.12, 800, 'lowpass', 0.45);
  },
  boost(): void {
    glide(220, 660, 0.3, 'sawtooth', 0.1);
  },
  gameOver(): void {
    [987.77, 783.99, 659.25].forEach((f, i) => window.setTimeout(() => blip(f, 0.16, 'square', 0.15), i * 180));
  },
  /** Crane: the dry snap of the prongs closing (6 ms of noise + a 180 Hz sine). */
  clack(): void {
    noise(0.006, 2400, 'bandpass', 0.35);
    blip(180, 0.07, 'sine', 0.22);
  },
  /** A capsule bouncing on the machine's floor. */
  tick(): void {
    blip(1400, 0.02, 'triangle', 0.08);
  },
  /** Thermal printer: eight 40 ms taps. */
  printer(): void {
    for (let i = 0; i < 8; i++) window.setTimeout(() => noise(0.012, 5200, 'highpass', 0.12), i * 40);
  },
  /** The elevator's little bell: two sines, 880 and 1109 Hz, with a 1.4 s decay. */
  ding(): void {
    sound.play(({ ctx, out, t }) => {
      for (const f of [880, 1108.73]) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        osc.connect(env).connect(out);
        osc.start(t);
        osc.stop(t + 1.45);
      }
      return 1.45;
    });
  },
};
