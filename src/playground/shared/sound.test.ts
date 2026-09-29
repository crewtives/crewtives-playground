import { afterEach, describe, expect, it, vi } from 'vitest';

// Doubles of window, document, localStorage and AudioContext: sound.ts reads the preference when
// imported, so each test imports the module again on top of its own environment.

type Handler = (event: unknown) => void;

class FakeTarget {
  private readonly handlers = new Map<string, Set<Handler>>();
  addEventListener(type: string, handler: Handler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }
  removeEventListener(type: string, handler: Handler): void {
    this.handlers.get(type)?.delete(handler);
  }
  dispatch(type: string, event: unknown = {}): void {
    for (const handler of [...(this.handlers.get(type) ?? [])]) handler(event);
  }
  count(type: string): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}

class FakeParam {
  value = 0;
  setValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
}

class FakeNode {
  readonly connected: unknown[] = [];
  connect<T>(node: T): T {
    this.connected.push(node);
    return node;
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  sampleRate = 44100;
  readonly destination = new FakeNode();
  readonly gains: (FakeNode & { gain: FakeParam })[] = [];
  compressor: (FakeNode & { threshold: FakeParam; ratio: FakeParam }) | null = null;
  oscillators = 0;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  createDynamicsCompressor() {
    this.compressor = Object.assign(new FakeNode(), { threshold: new FakeParam(), ratio: new FakeParam() });
    return this.compressor;
  }
  createGain() {
    const gain = Object.assign(new FakeNode(), { gain: new FakeParam() });
    this.gains.push(gain);
    return gain;
  }
  createOscillator() {
    this.oscillators++;
    return Object.assign(new FakeNode(), { type: 'sine', frequency: new FakeParam(), start() {}, stop() {} });
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

function setup({ stored, storageThrows = false }: { stored?: string; storageThrows?: boolean } = {}) {
  vi.resetModules();
  FakeAudioContext.instances = [];
  const win = Object.assign(new FakeTarget(), {
    AudioContext: FakeAudioContext,
    // Voices are not released during the test: that way the cap can be counted.
    setTimeout: () => 0,
  });
  const doc = Object.assign(new FakeTarget(), { hidden: false });
  const store = new Map<string, string>(stored ? [['playground:sound', stored]] : []);
  const storage = storageThrows
    ? {
        getItem: () => {
          throw new Error('storage blocked');
        },
        setItem: () => {
          throw new Error('storage blocked');
        },
      }
    : { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('localStorage', storage);
  return { win, doc, store, load: () => import('./sound') };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sound of the landings', () => {
  it('starts off and creates no AudioContext', async () => {
    const env = setup();
    const { sound, blip } = await env.load();
    expect(sound.enabled).toBe(false);
    blip(440);
    env.win.dispatch('pointerdown');
    expect(FakeAudioContext.instances).toHaveLength(0);
    // With no stored preference, no gesture listener is left behind.
    expect(env.win.count('pointerdown')).toBe(0);
  });

  it('with "on" stored it starts on, but neither creates the context nor plays before the first gesture', async () => {
    const env = setup({ stored: 'on' });
    const { sound, blip } = await env.load();
    expect(sound.enabled).toBe(true);
    blip(440);
    expect(FakeAudioContext.instances).toHaveLength(0);

    env.win.dispatch('pointerdown');
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(env.win.count('pointerdown')).toBe(0);
    expect(env.win.count('keydown')).toBe(0);
    blip(440);
    expect(FakeAudioContext.instances[0].oscillators).toBe(1);
  });

  it('also arms the first keyboard gesture', async () => {
    const env = setup({ stored: 'on' });
    await env.load();
    env.win.dispatch('keydown');
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('if storage throws, it still works and starts off', async () => {
    const env = setup({ storageThrows: true });
    const { sound } = await env.load();
    expect(sound.enabled).toBe(false);
    expect(() => sound.setEnabled(true)).not.toThrow();
    expect(sound.enabled).toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
    sound.toggle();
    expect(sound.enabled).toBe(false);
    expect(FakeAudioContext.instances[0].state).toBe('suspended');
  });

  it('stores the preference in playground:sound', async () => {
    const env = setup();
    const { sound } = await env.load();
    sound.setEnabled(true);
    expect(env.store.get('playground:sound')).toBe('on');
    sound.setEnabled(false);
    expect(env.store.get('playground:sound')).toBe('off');
  });

  it('when the tab is hidden, the context is suspended and nothing plays', async () => {
    const env = setup();
    const { sound, blip } = await env.load();
    sound.setEnabled(true);
    const ctx = FakeAudioContext.instances[0];
    env.doc.hidden = true;
    env.doc.dispatch('visibilitychange');
    expect(ctx.state).toBe('suspended');
    blip(440);
    expect(ctx.oscillators).toBe(0);
    env.doc.hidden = false;
    env.doc.dispatch('visibilitychange');
    expect(ctx.state).toBe('running');
  });

  it('master at −18 dB into a compressor, with a voice cap', async () => {
    const env = setup();
    const { sound, blip } = await env.load();
    sound.setEnabled(true);
    const ctx = FakeAudioContext.instances[0];
    const master = ctx.gains[0];
    expect(master.gain.value).toBeCloseTo(10 ** (-18 / 20), 6);
    expect(master.connected[0]).toBe(ctx.compressor);
    expect(ctx.compressor!.connected[0]).toBe(ctx.destination);
    for (let i = 0; i < 40; i++) blip(440);
    expect(ctx.oscillators).toBe(24);
  });

  it('the toggle is a button with aria-pressed and the visible text "Sound off" / "Sound on"', async () => {
    const env = setup();
    const { bindSoundToggle, sound } = await env.load();
    const label = { textContent: '' };
    const attributes = new Map<string, string>();
    const button = Object.assign(new FakeTarget(), {
      setAttribute: (name: string, value: string) => void attributes.set(name, value),
      querySelector: (selector: string) => (selector === '[data-sound-label]' ? label : null),
    });
    const unbind = bindSoundToggle(button as unknown as HTMLButtonElement);
    expect(attributes.get('aria-pressed')).toBe('false');
    expect(label.textContent).toBe('Sound off');

    button.dispatch('click');
    expect(sound.enabled).toBe(true);
    expect(attributes.get('aria-pressed')).toBe('true');
    expect(label.textContent).toBe('Sound on');

    // Another control that changes the sound also updates the button.
    sound.setEnabled(false);
    expect(label.textContent).toBe('Sound off');

    unbind();
    button.dispatch('click');
    expect(sound.enabled).toBe(false);
  });
});
