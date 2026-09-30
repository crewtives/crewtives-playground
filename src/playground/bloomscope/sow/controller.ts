// The playable Sow, without graphics: the dial with its vernier and the golden detent, the named
// states, the sowing, the readouts, "Scrub births", the seed under the pointer, the herbarium and "Put
// in the Scope". Whoever paints (the WebGL or the 2D view) reads the state through the getters and hooks in with attach.

import { motion } from '../../shared/motion';
import { bloomEase, clockAngle, throttledAttribute, type Toy, type ToyRenderer } from '../bench/common';
import { bell, limiter, pluck } from '../sfx';
import { GOLDEN_ANGLE, formatAngle } from '../specimens/spec';
import {
  birthColor,
  clampAngle,
  dialAngle,
  dialValueText,
  DIAL_MAX,
  DIAL_MIN,
  formatCount,
  isGoldenAngle,
  namedIndex,
  nearestSeed,
  NAMED_STATES,
  pattern,
  patternText,
  SOW_RATE,
  seedNote,
  seedPosition,
  seedScale,
  snapGolden,
  START_SEEDS,
  stepNamed,
  valueFromDial,
  VERNIER,
} from './sow';

export interface SowElements {
  section: HTMLElement;
  dial: HTMLElement;
  view: HTMLElement;
  art: SVGSVGElement;
  knob: SVGGElement;
  vernierTicks: SVGGElement;
  outerGrip: SVGCircleElement;
  vernierGrip: SVGCircleElement;
  input: HTMLInputElement;
  stamp: HTMLElement;
  tip: HTMLElement;
  divergence: HTMLElement;
  seeds: HTMLElement;
  pattern: HTMLElement;
  named: HTMLButtonElement[];
  hold: HTMLButtonElement;
  sow100: HTMLButtonElement;
  clear: HTMLButtonElement;
  scrub: HTMLInputElement;
  scrubChip: HTMLElement;
  press: HTMLButtonElement;
  herbarium: HTMLOListElement;
  live: HTMLElement;
}

type Direction = 'FORWARD' | 'REWIND' | 'HOLD';

/** Radii of the dial in the 640 viewBox: scale band and vernier. */
export const DIAL_GEOMETRY = { size: 640, view: 252, vernierIn: 256, vernierOut: 272, bandIn: 276, bandOut: 316 };

export class SowController implements Toy {
  /** Divergence as shown (degrees). */
  alpha: number;
  count = 0;
  readonly max: number;
  /** Bright seeds: up to here (those born later stay as a 1-bit stipple). */
  scrubAt = Infinity;
  hover = -1;
  /** Birth time of each seed (ms). */
  readonly births: Float64Array;

  private renderer: ToyRenderer | null = null;
  private readonly el: SowElements;
  private travel: { from: number; to: number; start: number; duration: number } | null = null;
  private sowing = false;
  private sowClock = 0;
  private bloomStart = -1;
  private bloomDone = false;
  private autoPressed = false;
  private grip: { mode: 'absolute' | 'vernier'; id: number; last: number } | null = null;
  private scrubPrev = 0;
  private scrubTimer = 0;
  private readonly noteLimit = limiter(30);
  private readonly setValueText: (value: string, now?: boolean) => void;
  private readonly setScrubText: (value: string, now?: boolean) => void;
  private lastPattern = '';

  constructor(elements: SowElements, max: number, angle = GOLDEN_ANGLE) {
    this.el = elements;
    this.max = max;
    this.births = new Float64Array(max);
    this.alpha = clampAngle(angle);
    this.setValueText = throttledAttribute(elements.input, 'aria-valuetext');
    this.setScrubText = throttledAttribute(elements.scrub, 'aria-valuetext');
    this.drawDialScale();
    const now = performance.now();
    this.count = Math.min(START_SEEDS, max);
    for (let n = 0; n < this.count; n++) this.births[n] = now - (this.count - n) * 4;
    if (motion.reduced) this.bloomDone = true;
    this.bindDial();
    this.bindFingerGrip();
    this.bindButtons();
    this.bindScrub();
    this.bindHover();
    this.render(true);
  }

  attach(renderer: ToyRenderer): void {
    this.renderer = renderer;
    renderer.sync();
  }

  // ------------------------------------------------------------------ what the views read

  /** Scale of the seed head (the c in r = c·√n). */
  get scale(): number {
    return seedScale(this.count);
  }

  position(n: number): [number, number] {
    return seedPosition(n, this.alpha, this.scale);
  }

  /** 0–1: the bloom, in birth order (4 ms per seed, 600 ms each). */
  grow(n: number): number {
    if (this.bloomDone) return 1;
    if (this.bloomStart < 0) return 0;
    return bloomEase((performance.now() - this.bloomStart - n * 4) / 600);
  }

  /** Seeds that have already started to open (the bloom advances 4 ms per seed). */
  get bloomFront(): number {
    if (this.bloomDone) return this.count;
    if (this.bloomStart < 0) return 0;
    return Math.min(this.count, Math.floor((performance.now() - this.bloomStart) / 4));
  }

  dimmed(n: number): boolean {
    return n > this.scrubAt;
  }

  color(n: number): [number, number, number] {
    return birthColor(n / Math.max(1, this.count - 1));
  }

  // ------------------------------------------------------------------ clock

  bloom(): void {
    // The first bloom presses the opening seed head: the herbarium never starts empty.
    if (!this.autoPressed) {
      this.autoPressed = true;
      if (this.count > 0) this.pressHead(false);
    }
    if (this.bloomDone || this.bloomStart >= 0) return;
    this.bloomStart = performance.now();
    this.wake();
  }

  tick(dt: number): boolean {
    let busy = false;
    if (this.travel) {
      const { from, to, start, duration } = this.travel;
      const t = Math.min(1, (performance.now() - start) / duration);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.alpha = from + (to - from) * e;
      if (t >= 1) {
        this.alpha = to;
        this.travel = null;
      }
      this.render();
      busy = true;
    }
    if (this.sowing) {
      this.sowClock += dt;
      const due = Math.floor(this.sowClock * SOW_RATE);
      if (due > 0) {
        this.sowClock -= due / SOW_RATE;
        this.sow(due, true);
      }
      busy = this.sowing || busy;
    }
    if (this.bloomStart >= 0 && !this.bloomDone) {
      if (performance.now() - this.bloomStart > this.count * 4 + 650) this.bloomDone = true;
      this.renderer?.sync();
      busy = true;
    }
    return busy;
  }

  // ------------------------------------------------------------------ actions

  /** Sets the divergence from the visitor: with the golden detent and, on entering it, stamp and bell. */
  setAngle(value: number, animate = false): void {
    const wasGolden = isGoldenAngle(this.alpha) || (this.travel !== null && isGoldenAngle(this.travel.to));
    const { angle, snapped } = snapGolden(clampAngle(value));
    if (snapped && !wasGolden) {
      this.goldenStamp();
      // The snap lasts 60 ms.
      this.travelTo(angle, 60);
      return;
    }
    if (animate) this.travelTo(angle, 600);
    else {
      this.travel = null;
      this.alpha = angle;
      this.render();
    }
  }

  travelTo(angle: number, duration: number): void {
    if (motion.reduced || duration <= 0) {
      this.travel = null;
      this.alpha = angle;
      this.render();
      return;
    }
    this.travel = { from: this.alpha, to: angle, start: performance.now(), duration };
    this.wake();
  }

  /** Sows `n` new seeds (with a note if `voice`). */
  sow(n: number, voice = false): void {
    const room = this.max - this.count;
    const add = Math.min(n, room);
    if (add <= 0) {
      this.sowing = false;
      this.el.hold.setAttribute('aria-pressed', 'false');
      return;
    }
    const now = performance.now();
    for (let i = 0; i < add; i++) this.births[this.count + i] = now;
    this.count += add;
    this.scrubAt = Infinity;
    if (voice) for (let i = this.count - add; i < this.count; i++) if (this.noteLimit()) pluck(seedNote(i, this.alpha));
    this.render();
  }

  clear(): void {
    this.count = 0;
    this.scrubAt = Infinity;
    this.render();
  }

  // ------------------------------------------------------------------ internals

  private wake(): void {
    this.renderer?.wake();
  }

  private goldenStamp(): void {
    const stamp = this.el.stamp;
    stamp.classList.remove('is-on');
    void stamp.offsetWidth;
    stamp.classList.add('is-on');
    bell();
    try {
      navigator.vibrate?.(8);
    } catch {
      // No vibration.
    }
  }

  /** Readouts, dial, states and view. */
  private render(initial = false): void {
    const a = this.alpha;
    const seeds = this.count;
    this.el.divergence.textContent = `divergence ${a.toFixed(3)}°`;
    this.el.seeds.textContent = `seeds ${formatCount(seeds)}`;
    const text = seeds < 13 ? 'visible spirals: too few seeds to count' : patternText(pattern(a, seeds));
    if (text !== this.lastPattern) {
      this.lastPattern = text;
      this.el.pattern.textContent = text;
    }
    this.el.knob.setAttribute('transform', `rotate(${dialAngle(a)} 320 320)`);
    // The vernier turns one degree per 0.0033°.
    this.el.vernierTicks.setAttribute('transform', `rotate(${(((a - DIAL_MIN) / VERNIER) % 360).toFixed(2)} 320 320)`);
    if (document.activeElement !== this.el.input || initial) this.el.input.value = a.toFixed(3);
    this.setValueText(dialValueText(a, Math.max(seeds, 1)), initial);
    const current = namedIndex(a);
    this.el.named.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
    this.el.scrub.max = String(seeds);
    if (!Number.isFinite(this.scrubAt)) this.el.scrub.value = String(seeds);
    this.el.hold.disabled = seeds >= this.max;
    const label = `A seed head of ${formatCount(seeds)} seeds at ${a.toFixed(3)} degrees${isGoldenAngle(a) ? ', the golden angle' : ''}: ${text}`;
    if (this.el.view.getAttribute('aria-label') !== label) this.el.view.setAttribute('aria-label', label);
    this.renderer?.sync();
  }

  private drawDialScale(): void {
    const g = DIAL_GEOMETRY;
    const c = g.size / 2;
    const ns = 'http://www.w3.org/2000/svg';
    const scale = this.el.art.querySelector('.dial-scale');
    if (!scale) return;
    let ticks = '';
    let labels = '';
    for (let v = DIAL_MIN; v <= DIAL_MAX; v++) {
      const major = v % 5 === 0;
      const phi = (dialAngle(v) * Math.PI) / 180;
      const r0 = g.bandIn + 3;
      const r1 = major ? g.bandIn + 15 : g.bandIn + 9;
      const x0 = c + r0 * Math.sin(phi);
      const y0 = c - r0 * Math.cos(phi);
      const x1 = c + r1 * Math.sin(phi);
      const y1 = c - r1 * Math.cos(phi);
      ticks += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
      if (v % 10 === 0) {
        const rl = g.bandIn + 28;
        // The numbers on the lower half turn half a revolution so they read upright.
        const turn = Math.abs(dialAngle(v)) > 90 ? dialAngle(v) + 180 : dialAngle(v);
        const lx = (c + rl * Math.sin(phi)).toFixed(1);
        const ly = (c - rl * Math.cos(phi)).toFixed(1);
        labels += `<text x="${lx}" y="${ly}" transform="rotate(${turn.toFixed(1)} ${lx} ${ly})">${v}</text>`;
      }
    }
    // Golden-angle mark: a pollen diamond with an ink rule.
    const phi = (dialAngle(GOLDEN_ANGLE) * Math.PI) / 180;
    const rg = g.bandIn + 9;
    const gx = c + rg * Math.sin(phi);
    const gy = c - rg * Math.cos(phi);
    const mark = `<path class="golden-mark" transform="rotate(${dialAngle(GOLDEN_ANGLE).toFixed(2)} ${gx.toFixed(1)} ${gy.toFixed(1)})" d="M${gx} ${gy - 8}L${gx + 5} ${gy}L${gx} ${gy + 8}L${gx - 5} ${gy}Z"/>`;
    scale.innerHTML = `<path class="dial-ticks" d="${ticks}"/>${labels}${mark}`;
    // Vernier: 60 fine ticks.
    let fine = '';
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 * Math.PI) / 180;
      const r0 = g.vernierIn + 3;
      const r1 = g.vernierOut - (i % 5 === 0 ? 2 : 7);
      fine += `M${(c + r0 * Math.sin(a)).toFixed(1)} ${(c - r0 * Math.cos(a)).toFixed(1)}L${(c + r1 * Math.sin(a)).toFixed(1)} ${(c - r1 * Math.cos(a)).toFixed(1)}`;
    }
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', fine);
    this.el.vernierTicks.replaceChildren(path);
  }

  private dialCenter(): [number, number, number] {
    const box = this.el.art.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2, box.width / DIAL_GEOMETRY.size];
  }

  private bindDial(): void {
    const start = (mode: 'absolute' | 'vernier') => (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const [cx, cy] = this.dialCenter();
      const angle = clockAngle(event.clientX, event.clientY, cx, cy);
      const vernier = mode === 'vernier' || event.shiftKey;
      this.grip = { mode: vernier ? 'vernier' : 'absolute', id: event.pointerId, last: angle };
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
      this.el.dial.classList.add('is-turning');
      this.el.input.focus({ preventScroll: true });
      if (!vernier) {
        const value = valueFromDial(angle);
        if (value !== null) this.setAngle(value);
      }
    };
    const move = (event: PointerEvent) => {
      const grip = this.grip;
      if (!grip || grip.id !== event.pointerId) return;
      const [cx, cy] = this.dialCenter();
      const angle = clockAngle(event.clientX, event.clientY, cx, cy);
      if (grip.mode === 'vernier' || event.shiftKey) {
        let delta = angle - grip.last;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.setAngle(this.alpha + delta * VERNIER);
      } else {
        const value = valueFromDial(angle);
        if (value !== null) this.setAngle(value);
      }
      grip.last = angle;
    };
    const end = (event: PointerEvent) => {
      if (this.grip?.id !== event.pointerId) return;
      this.grip = null;
      this.el.dial.classList.remove('is-turning');
      this.setValueText(dialValueText(this.alpha, Math.max(1, this.count)), true);
    };
    for (const [grip, mode] of [
      [this.el.outerGrip, 'absolute'],
      [this.el.vernierGrip, 'vernier'],
    ] as const) {
      grip.addEventListener('pointerdown', start(mode));
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
    }

    const input = this.el.input;
    input.addEventListener('keydown', (event) => {
      let next: number | null = null;
      const fine = event.altKey ? 0.001 : event.shiftKey ? 1 : 0.1;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          next = this.alpha + fine;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          next = this.alpha - fine;
          break;
        case 'PageDown':
          this.goNamed(1);
          event.preventDefault();
          return;
        case 'PageUp':
          this.goNamed(-1);
          event.preventDefault();
          return;
        case 'Home':
          next = DIAL_MIN;
          break;
        case 'End':
          next = DIAL_MAX;
          break;
        default:
          return;
      }
      event.preventDefault();
      // Keyboard step rounded to the thousandth so errors do not accumulate.
      this.setAngle(Math.round(next * 1000) / 1000);
      this.setValueText(dialValueText(snapGolden(clampAngle(next)).angle, Math.max(1, this.count)), true);
    });
    // Assistive technologies that set the value directly.
    input.addEventListener('input', () => this.setAngle(Number(input.value)));
  }

  /**
   * With a finger (`(pointer: coarse)`), the outer grip becomes a ring at least 44 CSS px thick that
   * stays inside the dial's own SVG box (it grows inward where it would pass the box), so it never
   * catches a tap meant for a control scrolling out from under the pinned stage. Chromium ignores
   * `touch-action` on SVG shapes, so a non-passive `touchstart` on the two grips keeps the page from
   * scrolling when a drag starts on them; a swipe that starts on the plate inside the ring scrolls.
   * The hit strokes are transparent: no pixel changes. With a fine pointer nothing is written.
   */
  private bindFingerGrip(): void {
    const coarse = window.matchMedia('(pointer: coarse)');
    const outer = this.el.outerGrip;
    const grips = [this.el.outerGrip, this.el.vernierGrip];
    const homeR = outer.getAttribute('r') ?? '296';
    const keep = (event: TouchEvent) => event.preventDefault();
    let fitted = false;
    const fit = () => {
      if (!coarse.matches) {
        if (!fitted) return;
        fitted = false;
        outer.style.removeProperty('stroke-width');
        if (!outer.getAttribute('style')) outer.removeAttribute('style');
        outer.setAttribute('r', homeR);
        for (const grip of grips) grip.removeEventListener('touchstart', keep);
        return;
      }
      const size = this.el.dial.getBoundingClientRect().width;
      if (size <= 0) return;
      const half = 22 / (size / DIAL_GEOMETRY.size);
      outer.style.strokeWidth = `${(2 * half).toFixed(2)}px`;
      outer.setAttribute('r', Math.min(DIAL_GEOMETRY.bandIn + half, DIAL_GEOMETRY.size / 2 - half).toFixed(2));
      if (!fitted) for (const grip of grips) grip.addEventListener('touchstart', keep, { passive: false });
      fitted = true;
    };
    new ResizeObserver(fit).observe(this.el.dial);
    coarse.addEventListener('change', fit);
    fit();
  }

  private goNamed(direction: 1 | -1): void {
    const target = stepNamed(this.travel ? this.travel.to : this.alpha, direction);
    if (isGoldenAngle(target.angle) && !isGoldenAngle(this.alpha)) this.goldenStamp();
    this.travelTo(target.angle, 600);
    this.setValueText(`${target.label}. ${dialValueText(target.angle, Math.max(1, this.count))}`, true);
  }

  private bindButtons(): void {
    this.el.named.forEach((button, i) => {
      button.addEventListener('click', () => {
        const state = NAMED_STATES[i];
        if (isGoldenAngle(state.angle) && !isGoldenAngle(this.alpha)) this.goldenStamp();
        this.travelTo(state.angle, 600);
      });
    });

    // "Hold to sow": for as long as the pointer or the key is held.
    const hold = this.el.hold;
    const begin = () => {
      if (this.sowing || this.count >= this.max) return;
      this.sowing = true;
      this.sowClock = 0;
      hold.setAttribute('aria-pressed', 'true');
      this.sow(1, true);
      this.wake();
    };
    const stop = () => {
      if (!this.sowing) return;
      this.sowing = false;
      hold.setAttribute('aria-pressed', 'false');
      this.el.live.textContent = `${formatCount(this.count)} seeds. ${patternText(pattern(this.alpha, Math.max(1, this.count)))}.`;
    };
    hold.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      hold.setPointerCapture(event.pointerId);
      begin();
    });
    hold.addEventListener('pointerup', stop);
    hold.addEventListener('pointercancel', stop);
    hold.addEventListener('lostpointercapture', stop);
    hold.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        begin();
      }
    });
    hold.addEventListener('keyup', (event) => {
      if (event.key === ' ' || event.key === 'Enter') stop();
    });
    hold.addEventListener('blur', stop);
    // With a screen reader, a "click" with no held key: sows one second's worth.
    hold.addEventListener('click', (event) => {
      if (event.detail === 0 && !this.sowing) {
        this.sow(SOW_RATE);
        this.el.live.textContent = `${formatCount(this.count)} seeds.`;
      }
    });

    this.el.sow100.addEventListener('click', () => {
      this.sow(100);
      if (this.count > 0) pluck(seedNote(this.count - 1, this.alpha));
      this.el.live.textContent = `${formatCount(this.count)} seeds. ${patternText(pattern(this.alpha, Math.max(1, this.count)))}.`;
    });
    this.el.clear.addEventListener('click', () => {
      this.clear();
      this.el.live.textContent = 'Cleared. No seeds.';
    });
    this.el.press.addEventListener('click', () => this.pressHead());
  }

  private bindScrub(): void {
    const scrub = this.el.scrub;
    const chip = this.el.scrubChip;
    const show = (dir: Direction) => {
      chip.textContent = dir;
      chip.dataset.dir = dir.toLowerCase();
    };
    show('HOLD');
    scrub.addEventListener('input', () => {
      const v = Number(scrub.value);
      if (v !== this.scrubPrev) show(v < this.scrubPrev ? 'REWIND' : 'FORWARD');
      this.scrubPrev = v;
      this.scrubAt = v >= this.count ? Infinity : v;
      window.clearTimeout(this.scrubTimer);
      this.scrubTimer = window.setTimeout(() => show('HOLD'), 260);
      this.setScrubText(v >= this.count ? `all ${formatCount(this.count)} seeds` : `seed ${formatCount(v)} of ${formatCount(this.count)}`);
      this.renderer?.sync();
    });
    scrub.addEventListener('focus', () => (this.scrubPrev = Number(scrub.value)));
  }

  private bindHover(): void {
    const view = this.el.view;
    const tip = this.el.tip;
    const hide = () => {
      if (this.hover < 0) return;
      this.hover = -1;
      tip.hidden = true;
      this.renderer?.sync();
    };
    view.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const box = view.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * 2 - 1;
      const y = -(((event.clientY - box.top) / box.height) * 2 - 1);
      const n = nearestSeed(x, y, this.alpha, this.count, this.scale * 1.2);
      if (n < 0) return hide();
      if (n !== this.hover) {
        this.hover = n;
        const age = (performance.now() - this.births[n]) / 1000;
        tip.textContent = `seed #${formatCount(n + 1)} · born ${age.toFixed(1)} s ago`;
        tip.hidden = false;
        this.renderer?.sync();
      }
      const dial = this.el.dial.getBoundingClientRect();
      tip.style.transform = `translate(${event.clientX - dial.left + 14}px, ${event.clientY - dial.top - 30}px)`;
    });
    view.addEventListener('pointerleave', hide);
  }

  // ------------------------------------------------------------------ herbarium

  /** "Press this head": an 88 px dithered thumbnail with the angle below; keeps the last 8. */
  pressHead(announce = true): void {
    const list = this.el.herbarium;
    const li = document.createElement('li');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 44;
    canvas.className = 'herb-thumb';
    drawThumbnail(canvas, this);
    const angle = `${formatAngle(this.alpha)}°`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Pressed head at ${angle}, ${formatCount(this.count)} seeds`);
    const caption = document.createElement('span');
    caption.className = 'herb-caption';
    caption.textContent = angle;
    li.append(canvas, caption);
    list.querySelector('.herb-empty')?.remove();
    list.prepend(li);
    const items = list.querySelectorAll('li:not(.herb-empty)');
    if (items.length > 8) items[items.length - 1].remove();
    if (announce) this.el.live.textContent = `Pressed the head at ${angle}.`;
  }
}

/** The 16-glass palette from the tokens (sRGB 0–255). */
function readPalette(): [number, number, number][] {
  const style = getComputedStyle(document.documentElement);
  const out: [number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const hex = style.getPropertyValue(`--pal-16-${i}`).trim();
    const n = parseInt(hex.replace('#', ''), 16);
    if (Number.isFinite(n)) out.push([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  return out;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Dithered thumbnail of the seed head: flat at 44 px, 4×4 ordered dither to the 16-color palette. */
function drawThumbnail(canvas: HTMLCanvasElement, sow: SowController): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const half = size / 2;
  ctx.fillStyle = '#fdfdf6';
  ctx.beginPath();
  ctx.arc(half, half, half - 0.5, 0, Math.PI * 2);
  ctx.fill();
  const c = sow.scale;
  for (let n = 0; n < sow.count; n++) {
    const [x, y] = sow.position(n);
    const [r, g, b] = n === sow.count - 1 ? [0xe8 / 255, 0x17 / 255, 0x5d / 255] : sow.color(n);
    ctx.fillStyle = `rgb(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0})`;
    const s = Math.max(0.9, c * half * 1.5);
    ctx.fillRect(half + x * (half - 1) - s / 2, half - y * (half - 1) - s / 2, s, s);
  }
  const palette = readPalette();
  if (palette.length < 2) return;
  const image = ctx.getImageData(0, 0, size, size);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4;
    const x = p % size;
    const y = Math.floor(p / size);
    const inside = (x - half + 0.5) ** 2 + (y - half + 0.5) ** 2 <= (half - 0.5) ** 2;
    if (!inside) {
      d[i + 3] = 0;
      continue;
    }
    const t = (BAYER4[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 40;
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const [r, g, b] = palette[k];
      const dd = (d[i] + t - r) ** 2 + (d[i + 1] + t - g) ** 2 + (d[i + 2] + t - b) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = k;
      }
    }
    [d[i], d[i + 1], d[i + 2]] = palette[best];
    d[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
