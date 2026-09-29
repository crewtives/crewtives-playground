// The Parlour Glass cabinet (4F): joins the pure physics, the view (GL or 2D) and the DOM controls
// (handle, held LAUNCH, POUR 50, symmetry, launchers, shutter, jog wheel with J/K/L and NOW,
// REPLAY SEED, CLEAR GLASS, COPY THIS MACHINE), the ring of 48 lamps, the counter and the sound.
import { motion } from '../../shared/motion';
import { blip, glide, noise } from '../../shared/sound';
import { sfx } from '../sfx';
import type { Symmetry } from './layout';
import { DEFAULT_POWER, HISTORY_HZ, STEP, type ParlourSim, type Rails, type Shutter } from './sim';
import { decodeMachine, encodeMachine, type MachineState } from './url';

/** What the machine needs from a view: repaint, shutter and mirror. */
export interface ParlourScreen {
  shutter: Shutter;
  flip: boolean;
  /** Requests a frame (GL: invalidate the view in the Engine; 2D: draw). */
  paint(): void;
  /** Asks for the loop to keep going (GL: requestFrame; 2D: its own rAF). */
  wake(): void;
}

/** Nail notes: C D E G A over 5 octaves (the mirror twins share a tone). */
const PENTA = [0, 2, 4, 7, 9];
function ringFreq(ring: number): number {
  const octave = Math.floor(ring / 5);
  return 261.63 * Math.pow(2, octave - 1 + PENTA[ring % 5] / 12);
}

/** Time in words for the jog wheel ("7.4 seconds ago, rewinding"). */
export function jogText(ago: number, mode: 'live' | 'hold' | 'rewind' | 'forward'): string {
  if (mode === 'live' && ago <= 0) return 'Now, live';
  const when = ago <= 0 ? 'Now' : `${ago.toFixed(1)} seconds ago`;
  const verb = mode === 'rewind' ? 'rewinding' : mode === 'forward' ? 'playing forward' : mode === 'hold' ? 'holding' : 'live';
  return `${when}, ${verb}`;
}

export interface ParlourMachineOptions {
  sim: ParlourSim;
  screen: ParlourScreen;
  root: HTMLElement;
  /** false without WebGL2: rewind is disabled. */
  rewind: boolean;
  state: MachineState;
}

export class ParlourMachine {
  readonly sim: ParlourSim;
  readonly screen: ParlourScreen;
  private readonly root: HTMLElement;
  private readonly rewind: boolean;
  private state: MachineState;
  /** Playback clock: speed (−4…+4; 0 = pause) and seconds back being shown. */
  private speed = 1;
  private ago = 0;
  private acc = 0;
  private holdStart = 0;
  private lastCounter = '';
  private lastAnnounce = 0;
  private announceTimer = 0;
  private tickBudget = 0;
  private lamps: SVGCircleElement[] = [];
  private lampStep = -1;
  private readonly q = <T extends Element>(sel: string) => this.root.querySelector<T>(sel);

  constructor(options: ParlourMachineOptions) {
    this.sim = options.sim;
    this.screen = options.screen;
    this.root = options.root;
    this.rewind = options.rewind;
    this.state = options.state;
    this.sim.setSymmetry(this.state.symmetry);
    this.sim.rails = this.state.rails;
    this.screen.shutter = this.state.shutter;
    this.buildLamps();
    this.bind();
    this.paintRadios('[data-group="symmetry"]', this.state.symmetry);
    this.paintRadios('[data-group="rails"]', this.state.rails);
    this.paintRadios('[data-group="shutter"]', this.state.shutter);
    if (motion.reduced) this.preExpose();
    this.paintAll();
    this.screen.paint();
  }

  /** Reduced motion: the glass arrives already exposed, 20 s of pouring simulated without being shown. */
  private preExpose(): void {
    this.sim.clearGlass();
    this.setShutter('all', false);
    this.sim.power = DEFAULT_POWER;
    this.sim.setLaunching(true);
    this.sim.run(20);
    this.sim.setLaunching(false);
    // The glass is left to empty (and any FEVER in progress to finish): the image stays still, with no balls
    // that keep falling on their own and no lit FEVER that does not advance.
    for (let i = 0; i < 12 * 240 && (this.sim.inPlay > 0 || this.sim.fever > 0); i++) this.sim.step();
    this.sim.events.length = 0;
  }

  /** true while something moves in the glass (frames must keep being requested). */
  get active(): boolean {
    // With reduced motion nothing animates on its own: each action jumps to its result (settle).
    if (this.speed === 0 || motion.reduced) return false;
    return this.animating;
  }

  /** Advances the clock; called by the Engine (GL) or by its own rAF (2D). */
  tick(dt: number): boolean {
    dt = Math.min(dt, 0.1);
    const sim = this.sim;
    let changed = false;
    if (this.speed < 0 && !motion.reduced) {
      // Rewind: the saved history, backward.
      this.ago = Math.min(sim.historySeconds, this.ago - this.speed * dt);
      sim.seek(this.ago);
      changed = true;
      if (this.ago >= sim.historySeconds) this.setSpeed(0);
    } else if (this.speed > 0 && !motion.reduced && this.animating) {
      if (this.ago > 0) this.resumeHere();
      this.acc += dt * this.speed;
      const steps = Math.min(Math.floor(this.acc / STEP), 240 * 0.4);
      this.acc -= steps * STEP;
      this.tickBudget = 40 * dt;
      for (let i = 0; i < steps; i++) sim.step();
      this.drain();
      changed = steps > 0;
    }
    this.paintAll();
    // Returns whether there were changes (the caller repaints) or whether frames must keep being requested.
    return changed || this.active;
  }

  /** There is something to simulate: balls, launches, FEVER or windmills still turning. */
  private get animating(): boolean {
    const sim = this.sim;
    return this.ago > 0 || sim.inPlay > 0 || sim.launching || sim.pourLeft > 0 || sim.fever > 0 || sim.windOmega.some((w) => Math.abs(w) > 0.01);
  }

  private drain(): void {
    for (const e of this.sim.events.splice(0)) {
      switch (e.type) {
        case 'nail':
          // Cap of 40 ticks per second; the mirror twins sound at the same tone.
          if (this.tickBudget >= 1) {
            this.tickBudget -= 1;
            noise(0.012, ringFreq(e.ring), 'bandpass', 0.14);
          }
          break;
        case 'launch':
          glide(90, 40, 0.06, 'sine', 0.2);
          break;
        case 'pocket':
          glide(880, 110, 0.9, 'sine', 0.14);
          break;
        case 'fever':
          [523.25, 659.25, 783.99, 987.77].forEach((f, i) => window.setTimeout(() => blip(f, 0.12, 'square', 0.12), i * 250));
          this.say(`Fever ${e.count}: the tulips are open for 6 seconds.`, true);
          break;
        default:
          break;
      }
    }
  }

  /** Releases the rewind: the physics continues from the shown state, as a new branch. */
  private resumeHere(): void {
    if (this.ago > 0) this.sim.branch();
    this.ago = 0;
    this.acc = 0;
  }

  private setSpeed(speed: number): void {
    this.speed = speed;
    if (speed !== 0) this.screen.wake();
    this.paintJog();
  }

  // ─────────── Controls ───────────

  private bind(): void {
    const root = this.root;
    // Handle: slider 0–100, steps of 5 (20 with Shift), and turning with the pointer.
    const knob = this.q<HTMLElement>('[data-handle]');
    if (knob) {
      const set = (value: number) => {
        this.sim.power = Math.max(0, Math.min(100, Math.round(value)));
        this.paintKnob();
      };
      knob.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 20 : 5;
        const delta = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: 20, PageDown: -20 }[event.key];
        if (delta !== undefined) {
          event.preventDefault();
          set(this.sim.power + delta);
          sfx.click();
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          set(event.key === 'Home' ? 0 : 100);
        }
      });
      const fromPointer = (event: PointerEvent) => {
        const box = knob.getBoundingClientRect();
        const a = Math.atan2(event.clientX - (box.left + box.width / 2), -(event.clientY - (box.top + box.height / 2)));
        set(((Math.max(-2.36, Math.min(2.36, a)) + 2.36) / 4.72) * 100);
      };
      knob.addEventListener('pointerdown', (event) => {
        knob.setPointerCapture(event.pointerId);
        fromPointer(event);
      });
      knob.addEventListener('pointermove', (event) => {
        if (knob.hasPointerCapture(event.pointerId)) fromPointer(event);
      });
    }

    // LAUNCH: hold the button (pointer or touch) or the space bar.
    const launch = this.q<HTMLButtonElement>('[data-launch]');
    if (launch) {
      launch.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        launch.setPointerCapture(event.pointerId);
        this.launchDown();
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) launch.addEventListener(type, () => this.launchUp());
      launch.addEventListener('contextmenu', (event) => event.preventDefault());
      launch.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          if (!event.repeat) this.launchDown();
        }
      });
      launch.addEventListener('keyup', (event) => {
        if (event.key === ' ' || event.key === 'Enter') this.launchUp();
      });
      launch.addEventListener('blur', () => this.launchUp());
    }
    const view = this.q<HTMLElement>('[data-parlour-view]');
    view?.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        if (!event.repeat) this.launchDown();
      }
    });
    view?.addEventListener('keyup', (event) => {
      if (event.key === ' ') this.launchUp();
    });

    this.q('[data-pour]')?.addEventListener('click', () => this.pour());
    this.q('[data-replay]')?.addEventListener('click', () => this.replay());
    this.q('[data-clear]')?.addEventListener('click', () => {
      sfx.click();
      this.sim.clearGlass();
      this.say('Glass cleared. The shutter starts over.', true);
      this.screen.paint();
    });
    this.q('[data-copy]')?.addEventListener('click', () => void this.copy());

    this.radios('[data-group="symmetry"]', (value) => this.setSymmetry(value as Symmetry));
    this.radios('[data-group="rails"]', (value) => {
      this.state.rails = value as Rails;
      this.sim.rails = this.state.rails;
    });
    this.radios('[data-group="shutter"]', (value) => this.setShutter(value as Shutter, true));

    // Jog wheel: rim = frame by frame (a detent every 1/30 s); inner ring = speed −4×…+4×.
    const jog = this.q<HTMLElement>('[data-jog]');
    if (jog && this.rewind) this.bindJog(jog);
    else if (jog) {
      jog.setAttribute('aria-disabled', 'true');
      jog.tabIndex = -1;
    }
    this.q('[data-jog-now]')?.addEventListener('click', () => this.now());
    root.addEventListener('keydown', (event) => {
      if (event.altKey || event.metaKey || event.ctrlKey || !this.rewind) return;
      const key = event.key.toLowerCase();
      if (key === 'j') this.shuttle(-1);
      else if (key === 'k') this.hold();
      else if (key === 'l') this.shuttle(1);
      else return;
      event.preventDefault();
    });
  }

  private radios(selector: string, onPick: (value: string) => void): void {
    const group = this.q<HTMLElement>(selector);
    if (!group) return;
    const radios = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const pick = (radio: HTMLButtonElement, focus: boolean) => {
      for (const r of radios) {
        const on = r === radio;
        r.setAttribute('aria-checked', String(on));
        r.tabIndex = on ? 0 : -1;
      }
      if (focus) radio.focus();
      sfx.click();
      onPick(radio.dataset.value!);
    };
    for (const radio of radios) radio.addEventListener('click', () => pick(radio, false));
    group.addEventListener('keydown', (event) => {
      const i = radios.findIndex((r) => r === document.activeElement);
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (i < 0 || !step) return;
      event.preventDefault();
      pick(radios[(i + step + radios.length) % radios.length], true);
    });
  }

  private paintRadios(selector: string, value: string): void {
    const group = this.q<HTMLElement>(selector);
    if (!group) return;
    for (const r of group.querySelectorAll<HTMLButtonElement>('[role="radio"]')) {
      const on = r.dataset.value === value;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    }
  }

  private bindJog(jog: HTMLElement): void {
    let mode: 'rim' | 'ring' | null = null;
    let lastAngle = 0;
    let startAngle = 0;
    let detents = 0;
    const angleOf = (event: PointerEvent) => {
      const box = jog.getBoundingClientRect();
      return Math.atan2(event.clientX - (box.left + box.width / 2), -(event.clientY - (box.top + box.height / 2)));
    };
    jog.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const box = jog.getBoundingClientRect();
      const r = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2));
      mode = r < box.width * 0.3 ? 'ring' : 'rim';
      jog.setPointerCapture(event.pointerId);
      lastAngle = startAngle = angleOf(event);
      detents = 0;
      if (mode === 'rim') this.hold();
      event.preventDefault();
    });
    jog.addEventListener('pointermove', (event) => {
      if (!mode) return;
      const a = angleOf(event);
      if (mode === 'rim') {
        let d = a - lastAngle;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        lastAngle = a;
        // One detent every 6° = 1/30 s: turning left rewinds.
        detents += (d * 180) / Math.PI / 6;
        const whole = Math.trunc(detents);
        if (whole !== 0) {
          detents -= whole;
          this.step(-whole / 30);
        }
      } else {
        let d = a - startAngle;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        const speed = Math.max(-4, Math.min(4, (d / (Math.PI / 2)) * 4));
        this.setSpeed(Math.abs(speed) < 0.25 ? 0 : Math.round(speed * 4) / 4);
      }
    });
    const end = () => {
      if (!mode) return;
      mode = null;
      // On release, the physics continues from there (a new branch).
      this.setSpeed(1);
    };
    jog.addEventListener('pointerup', end);
    jog.addEventListener('pointercancel', end);
    jog.addEventListener('keydown', (event) => {
      const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
      if (step) {
        event.preventDefault();
        this.hold();
        this.step(step / 30);
      } else if (event.key === 'Home') {
        event.preventDefault();
        this.hold();
        this.step(-this.sim.historySeconds);
      } else if (event.key === 'End') {
        event.preventDefault();
        this.now();
      }
    });
  }

  /** Moves the playhead `delta` seconds (negative = back) with the machine paused. */
  private step(delta: number): void {
    if (!this.rewind) return;
    const before = this.ago;
    this.ago = Math.max(0, Math.min(this.sim.historySeconds, this.ago - delta));
    if (this.ago !== before) {
      this.sim.seek(this.ago);
      blip(2400, 0.003, 'square', 0.08);
    }
    this.paintAll();
    this.screen.paint();
  }

  private hold(): void {
    if (this.speed !== 0) {
      // Pause at the present: the shown state is already the last saved one.
      if (this.ago === 0) this.sim.seek(0);
    }
    this.setSpeed(0);
  }

  /** J / L: each tap doubles the speed in its direction (1×, 2×, 4×). */
  private shuttle(dir: -1 | 1): void {
    sfx.click();
    if (motion.reduced) {
      // No animation: each tap jumps 1 s.
      this.hold();
      this.step(dir);
      if (dir > 0 && this.ago === 0) this.setSpeed(1);
      return;
    }
    const same = Math.sign(this.speed) === dir && this.speed !== 0;
    const next = same ? Math.min(4, Math.abs(this.speed) * 2) : 1;
    if (dir < 0 && this.ago === 0 && this.speed !== 0) this.sim.seek(0);
    this.setSpeed(dir * next);
  }

  /** NOW: returns to the saved present and continues live, without deleting the history. */
  private now(): void {
    sfx.click();
    if (this.ago > 0) this.sim.seek(0);
    this.ago = 0;
    this.acc = 0;
    this.setSpeed(1);
    this.paintAll();
    this.screen.paint();
  }

  private launchDown(): void {
    if (this.sim.launching) return;
    this.resumeHere();
    if (this.speed <= 0) this.setSpeed(1);
    this.q('[data-launch]')?.classList.add('is-down');
    this.holdStart = performance.now();
    if (motion.reduced) return;
    this.sim.setLaunching(true);
    this.screen.wake();
  }

  private launchUp(): void {
    const button = this.q('[data-launch]');
    if (!button?.classList.contains('is-down')) return;
    button.classList.remove('is-down');
    if (motion.reduced) {
      // Reduced motion: the balls for the time held come out and the glass jumps to the result.
      const count = Math.max(1, Math.round(((performance.now() - this.holdStart) / 1000) * 4));
      for (let i = 0; i < count; i++) this.sim.launch();
      this.settle();
      return;
    }
    this.sim.setLaunching(false);
  }

  private pour(): void {
    sfx.click();
    this.resumeHere();
    if (this.speed <= 0) this.setSpeed(1);
    this.sim.pour();
    if (motion.reduced) this.settle();
    else this.screen.wake();
    this.say('Pouring 50 balls.', true);
  }

  /** Reduced motion: runs until the glass empties (max. 12 s) and paints the result. */
  private settle(): void {
    for (let i = 0; i < 12 * 240; i++) {
      this.sim.step();
      if (this.sim.inPlay === 0 && this.sim.pourLeft === 0 && !this.sim.launching) break;
    }
    this.drain();
    this.paintAll();
    this.screen.paint();
  }

  private replay(): void {
    sfx.click();
    this.sim.reset();
    this.ago = 0;
    this.acc = 0;
    this.speed = 1;
    this.sim.pour();
    if (motion.reduced) this.settle();
    else this.screen.wake();
    this.say(`Replaying seed ${this.sim.seed}: the same 50 balls at handle ${this.sim.power}.`, true);
  }

  private setSymmetry(symmetry: Symmetry): void {
    this.resumeHere();
    this.state.symmetry = symmetry;
    this.sim.setSymmetry(symmetry);
    const name = { mirror: 'mirror', six: 'six-fold', eight: 'eight-fold', free: 'free' }[symmetry];
    this.say(`Nails rearranged: ${name} symmetry, ${this.sim.nails.length} nails.`, true);
    this.screen.paint();
  }

  private setShutter(shutter: Shutter, announce: boolean): void {
    this.state.shutter = shutter;
    this.screen.shutter = shutter;
    this.paintRadios('[data-group="shutter"]', shutter);
    if (shutter === 'all') this.sim.clearGlass();
    if (announce) {
      const text = { now: 'Shutter: now. Only the balls show.', '1': 'Shutter: 1 second.', '5': 'Shutter: 5 seconds.', all: 'Shutter: every moment. Paths stay until you clear the glass.' }[shutter];
      this.say(text, true);
    }
    this.screen.paint();
  }

  private async copy(): Promise<void> {
    sfx.click();
    this.state.rails = this.sim.rails;
    const url = `${location.origin}${location.pathname}${encodeMachine({ ...this.state, seed: this.sim.seed })}`;
    const out = this.q<HTMLElement>('[data-copy-out]');
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = false;
    }
    if (out) {
      out.hidden = false;
      out.textContent = copied ? `Copied: ${url}` : `Copy this address: ${url}`;
    }
    this.say(copied ? 'Machine address copied.' : 'Machine address shown below the buttons.', true);
  }

  // ─────────── DOM painting ───────────

  private buildLamps(): void {
    const svg = this.q<SVGSVGElement>('[data-lamps]');
    if (!svg) return;
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', (50 + 47.6 * Math.sin(a)).toFixed(2));
      c.setAttribute('cy', (50 - 47.6 * Math.cos(a)).toFixed(2));
      c.setAttribute('r', '1.25');
      svg.append(c);
      this.lamps.push(c);
    }
  }

  private paintAll(): void {
    const sim = this.sim;
    // Ring of 48 lamps: a slow chase with the clock; in FEVER they alternate at 2 Hz (≤ 2 flashes/s).
    const step = Math.floor(sim.time * 2);
    const fever = sim.fever > 0;
    const key = step * 2 + (fever ? 1 : 0);
    if (key !== this.lampStep) {
      this.lampStep = key;
      this.lamps.forEach((lamp, i) => {
        const cls = fever ? ((i + step) % 2 ? 'is-candy' : 'is-sodium') : (i - step + 4800) % 6 === 0 ? 'is-sodium' : '';
        lamp.setAttribute('class', cls);
      });
      this.q('[data-parlour]')?.classList.toggle('is-fever', fever);
    }
    const counter = `BALLS ${sim.launched.toLocaleString('en-US').replace(/,/g, ' ')} · IN PLAY ${sim.inPlay} · IN THE POCKET ${sim.pocketed}`;
    if (counter !== this.lastCounter) {
      this.lastCounter = counter;
      const el = this.q('[data-parlour-counter]');
      if (el) el.textContent = counter;
      this.announceCounter(counter);
    }
    this.paintJog();
    this.paintKnob();
  }

  /** The counter is announced politely at most every 5 s (the last value wins). */
  private announceCounter(text: string): void {
    const live = document.querySelector('[data-live-parlour]');
    if (!live) return;
    const wait = this.lastAnnounce + 5000 - performance.now();
    if (wait <= 0) {
      live.textContent = text.toLowerCase().replace(/ · /g, ', ');
      this.lastAnnounce = performance.now();
    } else if (!this.announceTimer) {
      this.announceTimer = window.setTimeout(() => {
        this.announceTimer = 0;
        live.textContent = this.lastCounter.toLowerCase().replace(/ · /g, ', ');
        this.lastAnnounce = performance.now();
      }, wait);
    }
  }

  private say(text: string, _urgent = false): void {
    const live = document.querySelector('[data-live-floor]');
    if (live) live.textContent = text;
  }

  private paintKnob(): void {
    const knob = this.q<HTMLElement>('[data-handle]');
    if (!knob) return;
    const p = this.sim.power;
    if (knob.getAttribute('aria-valuenow') === String(p)) return;
    knob.setAttribute('aria-valuenow', String(p));
    knob.setAttribute('aria-valuetext', `${p} of 100`);
    knob.style.setProperty('--turn', `${-135 + (p / 100) * 270}deg`);
    const read = this.q('[data-handle-read]');
    if (read) read.textContent = String(p).padStart(3, '0');
  }

  private paintJog(): void {
    const jog = this.q<HTMLElement>('[data-jog]');
    const code = this.q<HTMLElement>('[data-timecode]');
    const ago = this.ago;
    const mode = this.speed < 0 ? 'rewind' : this.speed === 0 ? 'hold' : ago > 0 ? 'forward' : 'live';
    const sign = (v: number) => (v < 0 ? '−' : '+');
    let text: string;
    if (!this.rewind) text = 'REWIND OFF · 2D SCREEN';
    else if (mode === 'rewind') text = `REWIND ${sign(this.speed)}${Math.abs(this.speed).toFixed(2)}×`;
    else if (mode === 'hold') text = `HOLD −${ago.toFixed(2)} S`;
    else text = `LIVE ${sign(this.speed)}${this.speed.toFixed(2)}×`;
    if (code && code.textContent !== text) {
      code.textContent = text;
      code.dataset.mode = mode;
    }
    if (jog) {
      const max = this.sim.historySeconds;
      jog.setAttribute('aria-valuemax', max.toFixed(1));
      jog.setAttribute('aria-valuenow', ago.toFixed(2));
      jog.setAttribute('aria-valuetext', jogText(ago, mode));
      jog.style.setProperty('--rim', `${(-ago * HISTORY_HZ * 3) % 360}deg`);
      jog.style.setProperty('--ring', `${this.speed === 1 && mode === 'live' ? 0 : this.speed * 22.5}deg`);
    }
  }

  /** Current state of the machine (for COPY THIS MACHINE and the tests). */
  get machineState(): MachineState {
    return { ...this.state, rails: this.sim.rails, seed: this.sim.seed };
  }
}

/** Initial state: the one from the `#4f?…` address if there is one (each invalid value falls back to its default). */
export function initialState(hash: string, fallback: MachineState): MachineState {
  return decodeMachine(hash) ?? { ...fallback };
}

