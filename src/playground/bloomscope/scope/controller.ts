// The Scope without graphics: ring, chamber, mirrors, HOLD, tray, keyboard, readout and sound.
// Whoever paints (the WebGL view, or the 2D fallback) hooks in through `ScopeRenderer` and calls `tick`.

import { motion } from '../../shared/motion';
import { blip, noise } from '../../shared/sound';
import { ChamberModel, readoutText } from '../chamberModel';
import { BEAD_STYLES_COUNT, beadRadius } from '../specimens/beads';
import { specimenChip, specimenName, specimenRadius, type Specimen } from '../specimens/spec';
import { Chamber, type BodyInit } from './chamber';
import { MIRROR_ORDER, MIRRORS, mirrorLines, type MirrorMode } from './fold';
import { Ring, pointerAngle, wrap360 } from './ring';

export interface ScopeRenderer {
  /** Registers the geometry of the specimens present. */
  setSpecimens(specimens: Specimen[]): void;
  /** The physics changed (positions, exposures, barrel or mirrors): repaint. */
  sync(chamber: Chamber, mode: MirrorMode, beta: number, exposures: boolean): void;
  /** There is something to animate: request frames. */
  wake(): void;
}

export interface ScopeElements {
  hero: HTMLElement;
  ringHit: HTMLElement;
  eyepiece: HTMLElement;
  knurl: SVGElement;
  readout: HTMLElement;
  insetLines: SVGSVGElement;
  live: HTMLElement;
  mirrors: HTMLInputElement[];
  everyTurn: HTMLButtonElement;
  shake: HTMLButtonElement;
  exposures: HTMLButtonElement;
  tray: HTMLOListElement;
  trayEmpty: HTMLElement;
}

/** Seconds the contents keep falling after "Every turn at once" before the HOLD. */
const SETTLE = 1.1;

/** A maximum rate per second for one voice. */
function limiter(perSecond: number): () => boolean {
  const times: number[] = [];
  return () => {
    const now = performance.now();
    while (times.length && now - times[0] > 1000) times.shift();
    if (times.length >= perSecond) return false;
    times.push(now);
    return true;
  };
}

export class ScopeController {
  readonly ring: Ring;
  readonly chamber = new Chamber(1816);
  readonly model: ChamberModel;
  mode: MirrorMode = 'd5';
  exposures = true;
  /** Callback for whatever follows the barrel (the Vogel print, the peepholes). */
  onBarrel: ((beta: number) => void) | null = null;
  /** Without a WebGL view: whoever runs the loop requests frames through here. */
  onWake: (() => void) | null = null;

  private renderer: ScopeRenderer | null = null;
  private readonly el: ScopeElements;
  private driving = false;
  /** After the turn, the bodies finish falling (seconds left) before freezing in HOLD. */
  private settling = 0;
  private lastReadout = '';
  private lastLabel = '';
  private readonly tickSound = limiter(20);
  private readonly clackSound = limiter(30);
  private dragPointer: number | null = null;
  private pushPointer: { id: number; x: number; y: number; t: number; horizontal: boolean | null } | null = null;

  constructor(elements: ScopeElements, beads: number) {
    this.el = elements;
    this.model = new ChamberModel(beads);
    this.ring = new Ring({
      onDetent: () => {
        if (this.tickSound()) blip(1800, 0.012, 'sine', 0.22);
        this.clickKnurl();
      },
    });
    this.ring.inertia = !motion.reduced;
    motion.onChange((reduced) => {
      this.ring.inertia = !reduced;
      if (reduced && this.ring.moving && !this.driving) this.ring.stop();
    });

    this.model.onChange((event) => {
      if (event.type === 'add' && event.specimen) this.dropSpecimen(event.specimen);
      if (event.type === 'remove' && event.specimen) {
        const uid = event.specimen.uid;
        this.chamber.remove((b) => b.kind === 'specimen' && b.key === uid);
      }
      this.renderer?.setSpecimens(this.model.specimens);
      this.renderTray();
      this.updateDescription();
      this.changed();
    });

    this.bindRing();
    this.bindEyepiece();
    this.bindControls();
    this.drawMirrorLines();
    this.renderTray();
  }

  attach(renderer: ScopeRenderer): void {
    this.renderer = renderer;
    renderer.setSpecimens(this.model.specimens);
    this.changed();
  }

  /**
   * The initial garden: with motion, everything falls for 1.2 s while the barrel turns 90°
   * (no turn if the garden comes from a link, which sets the angle).
   */
  load(preSpin = true): void {
    const specimens = this.model.specimens;
    if (motion.reduced) {
      this.fillSettled(specimens);
      this.everyTurnOffline();
    } else {
      const total = specimens.length + this.model.beads;
      let i = 0;
      const delay = () => (1.2 * i++) / Math.max(1, total - 1);
      specimens.forEach((s) => this.chamber.drop(this.specimenBody(s), delay()));
      for (let b = 0; b < this.model.beads; b++) this.chamber.drop(this.beadBody(b), delay());
      // Initial spin: a flywheel release at 220°/s. With ω·e^(−2.2t) it drops to the detent speed
      // (40°/s) after (220 − 40)/2.2 ≈ 82° (up to ~86° with 0.1 s steps), and the detent ahead is
      // 90°: the load catches at 90° at any frame rate.
      if (preSpin) this.ring.fling(220);
    }
    this.updateDescription();
    this.changed();
  }

  /** Advances one frame. Returns true while there is something to animate. */
  tick(dt: number): boolean {
    const turning = this.ring.update(dt);
    if (this.driving && !this.ring.moving) this.startSettling();
    if (this.settling > 0) {
      this.settling -= dt;
      if (this.settling <= 0 || this.chamber.asleep) this.finishEveryTurn();
    }
    if (turning || this.chamber.barrel !== this.ring.angle) this.chamber.setBarrel(this.ring.angle);
    const result = this.chamber.step(dt);
    if (result.impacts.length) this.clacks(result.impacts);
    const alive = this.ring.moving || this.settling > 0 || !this.chamber.asleep || this.chamber.pendingCount > 0;
    if (turning || result.moved) this.changed();
    else if (!alive) this.settleAria();
    return alive || this.ring.phase === 'drag';
  }

  /** Moves the barrel from outside (a scroll that leaves the Scope). */
  nudge(delta: number): void {
    if (this.chamber.hold || this.driving || this.ring.phase === 'drag') return;
    this.ring.step(delta);
    this.changed();
    this.wake();
  }

  setMode(mode: MirrorMode, announce = true): void {
    if (mode === this.mode) return;
    this.mode = mode;
    for (const input of this.el.mirrors) input.checked = input.value === mode;
    this.drawMirrorLines();
    this.updateDescription();
    if (announce) this.say(`${MIRRORS[mode].name}: ${MIRRORS[mode].describe.replace(/,$/, '')}.`);
    this.changed();
  }

  // ------------------------------------------------------------------ actions

  everyTurn(): void {
    this.chamber.release();
    this.chamber.wake();
    if (motion.reduced) {
      this.everyTurnOffline();
      this.say('Every turn at once: the whole turn, exposed as one still plate. HOLD.');
      this.changed();
      return;
    }
    this.driving = true;
    this.chamber.setExposures(24, 0.066);
    this.ring.drive(360, 120);
    this.el.everyTurn.disabled = true;
    this.say('Turning the barrel once, with 24 exposures.');
    this.changed();
  }

  shake(): void {
    this.chamber.shake();
    if (motion.reduced) this.settleOffline();
    noise(0.12, 3200, 'bandpass', 0.2);
    this.changed();
  }

  setExposures(on: boolean): void {
    this.exposures = on;
    this.el.exposures.setAttribute('aria-pressed', String(on));
    this.changed();
  }

  // ------------------------------------------------------------------ internals

  private wake(): void {
    if (this.renderer) this.renderer.wake();
    else this.onWake?.();
  }

  private changed(): void {
    const beta = this.ring.angle;
    this.renderer?.sync(this.chamber, this.mode, beta, this.exposures);
    this.wake();
    this.el.knurl.style.transform = `rotate(${beta}deg)`;
    this.onBarrel?.(beta);
    const text = readoutText(MIRRORS[this.mode].symbol, wrap360(beta), this.chamber.hold, this.model.count, this.model.beads);
    if (text !== this.lastReadout) {
      this.lastReadout = text;
      this.el.readout.textContent = text;
    }
  }

  private settleAria(): void {
    const value = Math.round(wrap360(this.ring.angle)) % 360;
    if (this.el.ringHit.getAttribute('aria-valuenow') !== String(value)) {
      this.el.ringHit.setAttribute('aria-valuenow', String(value));
      this.el.ringHit.setAttribute('aria-valuetext', `${value} degrees`);
    }
  }

  private updateDescription(): void {
    const label = this.model.describe(MIRRORS[this.mode].describe);
    if (label === this.lastLabel) return;
    this.lastLabel = label;
    this.el.eyepiece.setAttribute('aria-label', label);
  }

  private say(message: string): void {
    this.el.live.textContent = message;
  }

  private specimenBody(s: Specimen): BodyInit {
    return { kind: 'specimen', key: s.uid, r: specimenRadius(s.spec) };
  }

  private beadBody(i: number): BodyInit {
    return { kind: 'bead', key: i % BEAD_STYLES_COUNT, r: beadRadius(i) };
  }

  private dropSpecimen(s: Specimen): void {
    this.chamber.release();
    if (motion.reduced) {
      this.chamber.add({ ...this.specimenBody(s), x: 0, y: 0.3 });
      this.settleOffline();
    } else {
      this.chamber.drop(this.specimenBody(s));
    }
  }

  /** Places everything and lets it settle without showing it (reduced motion). */
  private fillSettled(specimens: Specimen[]): void {
    specimens.forEach((s, i) => {
      const t = i * 2.4;
      this.chamber.add({ ...this.specimenBody(s), x: 0.45 * Math.cos(t), y: 0.45 * Math.sin(t) });
    });
    for (let b = 0; b < this.model.beads; b++) {
      const t = b * 2.39996;
      const r = 0.2 + 0.6 * Math.sqrt((b + 0.5) / this.model.beads);
      this.chamber.add({ ...this.beadBody(b), x: r * Math.cos(t), y: r * Math.sin(t) });
    }
    this.settleOffline();
  }

  private settleOffline(): void {
    for (let i = 0; i < 12 && !this.chamber.asleep; i++) this.chamber.simulate(0.5);
  }

  /** "Every turn at once" computed without showing it: the HOLD plate, already exposed. */
  private everyTurnOffline(): void {
    const start = this.ring.angle;
    this.chamber.release();
    this.chamber.setExposures(24, 0.066);
    this.chamber.simulate(3, (t) => this.chamber.setBarrel(start + 120 * t));
    this.ring.set(start + 360);
    this.chamber.setBarrel(start + 360);
    this.chamber.simulate(SETTLE);
    this.chamber.hold = true;
  }

  /**
   * The turn is over: the barrel stays still and the contents, which were being dragged along by
   * the spin, finish falling (with their exposures) before freezing. That way the flower of
   * trajectories falls inside the mirrors instead of stopping halfway up the wall.
   */
  private startSettling(): void {
    this.driving = false;
    this.settling = SETTLE;
  }

  private finishEveryTurn(): void {
    this.driving = false;
    this.settling = 0;
    this.chamber.hold = true;
    this.changed();
    this.el.everyTurn.disabled = false;
    this.say('HOLD: every moment of the turn, multiplied by the mirrors. Touch the scope to let go.');
  }

  /** Any touch on the Scope leaves HOLD. */
  private touch(): void {
    this.settling = 0;
    if (this.driving) {
      this.driving = false;
      this.ring.stop();
      this.el.everyTurn.disabled = false;
    }
    if (this.chamber.hold) {
      this.chamber.release();
      this.say('Released. The chamber moves again.');
    }
  }

  private clacks(impacts: number[]): void {
    for (const speed of impacts.slice(0, 3)) {
      if (!this.clackSound()) return;
      const k = Math.min(1, speed / 2.5);
      noise(0.02, 2000 + 3000 * k, 'bandpass', 0.08 + 0.3 * k);
    }
  }

  private clickKnurl(): void {
    // A 1 px click on the knurl, 80 ms.
    const knurl = this.el.knurl;
    knurl.classList.add('is-click');
    window.setTimeout(() => knurl.classList.remove('is-click'), 80);
  }

  private bindRing(): void {
    const hit = this.el.ringHit;
    const center = () => {
      const box = hit.getBoundingClientRect();
      return [box.left + box.width / 2, box.top + box.height / 2];
    };
    hit.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      hit.focus({ preventScroll: true });
      this.touch();
      const [cx, cy] = center();
      this.dragPointer = event.pointerId;
      hit.setPointerCapture(event.pointerId);
      hit.classList.add('is-dragging');
      this.ring.grab(pointerAngle(event.clientX, event.clientY, cx, cy), event.timeStamp);
      this.wake();
    });
    hit.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.dragPointer) return;
      const [cx, cy] = center();
      this.ring.drag(pointerAngle(event.clientX, event.clientY, cx, cy), event.timeStamp);
      this.chamber.setBarrel(this.ring.angle);
      this.changed();
    });
    const end = (event: PointerEvent) => {
      if (event.pointerId !== this.dragPointer) return;
      this.dragPointer = null;
      hit.classList.remove('is-dragging');
      this.ring.release(event.timeStamp);
      this.settleAria();
      this.wake();
    };
    hit.addEventListener('pointerup', end);
    hit.addEventListener('pointercancel', end);

    hit.addEventListener('keydown', (event) => {
      const big = event.shiftKey ? 15 : 5;
      let handled = true;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          this.touch();
          this.ring.step(big);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          this.touch();
          this.ring.step(-big);
          break;
        case ' ':
        case 'Spacebar':
          this.shake();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          this.setMode(MIRROR_ORDER[Number(event.key) - 1]);
          break;
        case 'e':
        case 'E':
          this.everyTurn();
          break;
        default:
          handled = false;
      }
      if (!handled) return;
      event.preventDefault();
      this.chamber.setBarrel(this.ring.angle);
      this.settleAria();
      this.changed();
    });
  }

  private bindEyepiece(): void {
    const eye = this.el.eyepiece;
    eye.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      this.touch();
      this.pushPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp, horizontal: null };
      this.changed();
    });
    eye.addEventListener('pointermove', (event) => {
      const p = this.pushPointer;
      if (!p || p.id !== event.pointerId) return;
      const dx = event.clientX - p.x;
      const dy = event.clientY - p.y;
      if (p.horizontal === null) {
        if (Math.hypot(dx, dy) < 6) return;
        p.horizontal = Math.abs(dx) > Math.abs(dy);
        if (p.horizontal) eye.setPointerCapture(event.pointerId);
      }
      if (!p.horizontal) return;
      const dt = Math.max(1, event.timeStamp - p.t) / 1000;
      // The push scales with the segment's duration: the same hand gives the same breath at any event rate.
      this.chamber.push((dx / dt) * Math.min(1, dt / 0.1));
      p.x = event.clientX;
      p.y = event.clientY;
      p.t = event.timeStamp;
      this.wake();
    });
    const end = (event: PointerEvent) => {
      if (this.pushPointer?.id === event.pointerId) this.pushPointer = null;
    };
    eye.addEventListener('pointerup', end);
    eye.addEventListener('pointercancel', end);
  }

  private bindControls(): void {
    for (const input of this.el.mirrors) {
      input.addEventListener('change', () => {
        if (input.checked) this.setMode(input.value as MirrorMode);
      });
    }
    this.el.everyTurn.addEventListener('click', () => this.everyTurn());
    this.el.shake.addEventListener('click', () => this.shake());
    this.el.exposures.addEventListener('click', () => this.setExposures(!this.exposures));
    this.el.tray.addEventListener('click', (event) => {
      const chip = (event.target as Element).closest<HTMLButtonElement>('button[data-uid]');
      if (!chip) return;
      const uid = Number(chip.dataset.uid);
      const entry = this.model.tray.find((e) => e.uid === uid);
      if (this.model.remove(uid) && entry) this.say(`Took ${specimenName(entry.spec)} out of the chamber.`);
      // Focus moves to the next chip, or to the ring if none is left.
      const next = this.el.tray.querySelector<HTMLButtonElement>('button[data-uid]');
      (next ?? this.el.ringHit).focus({ preventScroll: true });
    });
  }

  private renderTray(): void {
    const tray = this.el.tray;
    tray.replaceChildren(
      ...this.model.tray.map((entry, i, all) => {
        const li = document.createElement('li');
        const name = specimenName(entry.spec);
        const chip = document.createElement(entry.scar ? 'span' : 'button');
        chip.className = entry.scar ? 'chip chip--scar' : 'chip';
        if (!entry.scar && i === all.length - 1 && all.length > 3) chip.classList.add('chip--new');
        if (chip instanceof HTMLButtonElement) {
          chip.type = 'button';
          chip.dataset.uid = String(entry.uid);
          chip.setAttribute('aria-label', `Take ${name} out of the chamber`);
          chip.title = `Take ${name} out`;
        } else {
          chip.setAttribute('role', 'img');
          chip.setAttribute('aria-label', `Taken out: ${name}`);
        }
        chip.innerHTML = `<svg aria-hidden="true" focusable="false"><use href="#${specimenChip(entry.spec)}"/></svg>`;
        li.append(chip);
        return li;
      }),
    );
    this.el.trayEmpty.hidden = this.model.count > 0;
  }

  private drawMirrorLines(): void {
    const svg = this.el.insetLines;
    const lines = mirrorLines(this.mode)
      .map(([a, b]) => `<line class="mirror-line" x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}"/>`)
      .join('');
    svg.innerHTML = `${lines}<circle class="inset-rim" cx="0" cy="0" r="0.97"/>`;
  }
}
