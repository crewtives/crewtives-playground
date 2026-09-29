// Sound of the landings: WebAudio synthesis only, no files. Off by default and never plays without
// a visitor gesture during this page load: the AudioContext is created inside a gesture.
// The preference is stored per browser (localStorage, wrapped in try/catch).

const STORAGE_KEY = 'playground:sound';
/** Master volume: −18 dB before the compressor. */
const MASTER_GAIN = Math.pow(10, -18 / 20);
/** Maximum number of simultaneous voices; any beyond that do not play. */
const MAX_VOICES = 24;

export interface Voice {
  ctx: AudioContext;
  /** Node to connect the voice to (goes through the master volume and the compressor). */
  out: AudioNode;
  /** Start time (ctx.currentTime). */
  t: number;
}

type Listener = (enabled: boolean) => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices = 0;
let wanted = readPreference();
const listeners = new Set<Listener>();

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

function writePreference(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Without storage, the preference lasts as long as the page.
  }
}

/** Creates or resumes the context. Only called from a visitor gesture. */
function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(compressor).connect(ctx.destination);
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else if (wanted) void ctx.resume();
    });
  }
  if (ctx.state === 'suspended' && wanted && !document.hidden) void ctx.resume();
  return ctx;
}

// If the visitor left the sound on during a previous visit, it starts with their first gesture of this load.
if (typeof window !== 'undefined' && wanted) {
  const arm = () => {
    ensureContext();
    window.removeEventListener('pointerdown', arm, true);
    window.removeEventListener('keydown', arm, true);
  };
  window.addEventListener('pointerdown', arm, true);
  window.addEventListener('keydown', arm, true);
}

export const sound = {
  get enabled(): boolean {
    return wanted;
  },

  /** Turns the sound on or off. Call it from a gesture handler (click, key). */
  setEnabled(on: boolean): void {
    wanted = on;
    writePreference(on);
    if (on) ensureContext();
    else void ctx?.suspend();
    for (const listener of listeners) listener(on);
  },

  toggle(): void {
    sound.setEnabled(!wanted);
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Plays a voice if the sound is on and the context is running. `build` connects its nodes to `out`
   * and returns the duration in seconds (to release the voice).
   */
  play(build: (voice: Voice) => number): void {
    if (!wanted || !ctx || !master || ctx.state !== 'running' || voices >= MAX_VOICES) return;
    voices++;
    const duration = build({ ctx, out: master, t: ctx.currentTime });
    window.setTimeout(() => voices--, Math.max(0, duration) * 1000 + 50);
  },
};

/** Visible labels of the sound toggle, the same on all three landings. */
export const SOUND_LABELS = { off: 'Sound off', on: 'Sound on' } as const;

/**
 * Fixed semantics of the sound toggle (D11): a `<button>` with `aria-pressed` and the visible text
 * "Sound off" / "Sound on", off by default. Each landing styles it its own way; the text goes in
 * `label` (by default, the button's `[data-sound-label]` or the button itself). Returns the function
 * that disconnects it.
 */
export function bindSoundToggle(
  button: HTMLButtonElement,
  label: Element = button.querySelector('[data-sound-label]') ?? button,
): () => void {
  const paint = (on: boolean) => {
    button.setAttribute('aria-pressed', String(on));
    label.textContent = on ? SOUND_LABELS.on : SOUND_LABELS.off;
  };
  const onClick = () => sound.toggle();
  button.addEventListener('click', onClick);
  paint(sound.enabled);
  const unsubscribe = sound.onChange(paint);
  return () => {
    button.removeEventListener('click', onClick);
    unsubscribe();
  };
}

// Basic voices shared by the three landings; each one builds its own with `sound.play`.

/** A short tone with a percussive envelope. */
export function blip(freq: number, duration = 0.08, type: OscillatorType = 'square', gain = 0.3): void {
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + duration + 0.02);
    return duration;
  });
}

/** A frequency sweep (up or down). */
export function glide(from: number, to: number, duration = 0.3, type: OscillatorType = 'sine', gain = 0.3): void {
  sound.play(({ ctx, out, t }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + duration + 0.02);
    return duration;
  });
}

let noiseBuffer: AudioBuffer | null = null;

/** A burst of filtered noise (clicks, crackles, a short rain). */
export function noise(duration = 0.05, filterFreq = 2000, filterType: BiquadFilterType = 'bandpass', gain = 0.3): void {
  sound.play(({ ctx, out, t }) => {
    if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(env).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.02);
    return duration;
  });
}
