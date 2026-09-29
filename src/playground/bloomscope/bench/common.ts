// Shared pieces of the bench: "Put in the Scope" with the chip that flies to the chamber gem, the
// bloom the first time a section comes on screen, and a live announcer capped per second.

import { motion } from '../../shared/motion';
import type { ChamberModel } from '../chamberModel';
import { specimenChip, type SpecimenSpec } from '../specimens/spec';

/** Whoever paints a toy: repaints when the state changed and requests frames while animating. */
export interface ToyRenderer {
  sync(): void;
  wake(): void;
}

/** A toy with its own clock (called by the engine loop or by the 2D fallback's loop). */
export interface Toy {
  tick(dt: number): boolean;
  attach(renderer: ToyRenderer): void;
  /** The section came on screen for the first time. */
  bloom(): void;
}

const FULL = 'Chamber full, take one out';
const PUT = 'Put in the Scope';

/** Every "Put in the Scope" button is disabled together when the chamber is full. */
export function bindPutButtons(buttons: HTMLButtonElement[], model: ChamberModel): void {
  const render = () => {
    for (const button of buttons) {
      button.disabled = model.full;
      const label = button.querySelector('.gem-text');
      if (label) label.textContent = model.full ? FULL : PUT;
    }
  };
  model.onChange(render);
  render();
}

/**
 * Carries a toy's result into the chamber: a 40 px chip flies in an arc (520 ms, exponential
 * ease-out) from the toy to the `n/7` gem, and the specimen goes in when it lands. With reduced
 * motion it goes in instantly, with no flight.
 */
export function putInScope(spec: SpecimenSpec, model: ChamberModel, from: Element, gem: HTMLElement, fallbackTarget: Element): boolean {
  if (model.full) return false;
  if (motion.reduced) {
    model.add(spec);
    return true;
  }
  const a = from.getBoundingClientRect();
  // On the phone the gem may be tucked away: it shows up to receive the chip.
  if (!gem.hidden) gem.dispatchEvent(new Event('chamber:incoming'));
  const target = gem.hidden ? fallbackTarget : gem;
  const b = target.getBoundingClientRect();
  const x0 = a.left + a.width / 2 - 20;
  const y0 = a.top + a.height / 2 - 20;
  const x1 = b.left + b.width / 2 - 20;
  const y1 = b.top + b.height / 2 - 20;
  const chip = document.createElement('span');
  chip.className = 'flying-chip';
  chip.setAttribute('aria-hidden', 'true');
  chip.innerHTML = `<svg focusable="false"><use href="#${specimenChip(spec)}"/></svg>`;
  document.body.append(chip);
  // Arc 40 px above the straight line.
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t - 40 * Math.sin(Math.PI * t);
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${1 - 0.25 * t})` });
  }
  const flight = chip.animate(frames, { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });
  flight.onfinish = () => {
    chip.remove();
    model.add(spec);
    if (!gem.hidden) {
      gem.classList.remove('is-bump');
      void gem.offsetWidth;
      gem.classList.add('is-bump');
    }
  };
  return true;
}

/** Calls `start` the first time the section comes on screen. */
export function onFirstView(section: Element, start: () => void): void {
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start();
    },
    { threshold: 0.2 },
  );
  io.observe(section);
}

/** Live announcer capped at one message per interval; the last pending one goes out at the end. */
export function throttledAnnouncer(region: HTMLElement, interval = 1000): (message: string) => void {
  let last = 0;
  let pending = '';
  let timer = 0;
  const flush = () => {
    timer = 0;
    last = performance.now();
    region.textContent = pending;
  };
  return (message: string) => {
    pending = message;
    const wait = interval - (performance.now() - last);
    if (wait <= 0 && !timer) flush();
    else if (!timer) timer = window.setTimeout(flush, Math.max(0, wait));
  };
}

/** Attribute capped per interval (the aria-valuetext of a control being dragged). */
export function throttledAttribute(el: Element, name: string, interval = 1000): (value: string, now?: boolean) => void {
  let last = 0;
  let timer = 0;
  let pending = '';
  const flush = () => {
    timer = 0;
    last = performance.now();
    el.setAttribute(name, pending);
  };
  return (value: string, immediate = false) => {
    pending = value;
    if (immediate) {
      window.clearTimeout(timer);
      flush();
      return;
    }
    const wait = interval - (performance.now() - last);
    if (wait <= 0 && !timer) flush();
    else if (!timer) timer = window.setTimeout(flush, Math.max(0, wait));
  };
}

export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
/** Ease-out of the "bloom": an approximation of cubic-bezier(0.16, 1, 0.3, 1). */
export const bloomEase = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);

/** Pointer angle around a center, in degrees from 12 o'clock, clockwise. */
export function clockAngle(x: number, y: number, cx: number, cy: number): number {
  return (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI;
}
