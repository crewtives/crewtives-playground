// Winding: the same control for the lid's key (3D) and the flat key in the side panel (SVG).
// Both share the economy's wind reserve. A clockwise circular drag around the axle (one detent every
// 45°); counterclockwise = ratchet clicks that move nothing, with no free spin and no inertia.
// Keyboard: it is a slider from 0 to 96 (Right/Up +1, PageUp +8, Space held one detent every
// 80 ms, Enter or Escape releases it).
import { DETENTS_PER_TURN, MAX_DETENTS, windText, type Economy } from '../economy';
import { Ratchet, pointerAngle, wrapDeg, DETENT_DEG } from '../spring';
import { detentTick, ratchetSlip } from '../voices';
import type { Rosette } from './rosette';

/** One detent every 80 ms while Space is held. */
const KEY_DETENT_MS = 80;
/** Near the axle the pointer angle is unstable: it does not count. */
const DEAD_ZONE = 10;

export interface WinderOptions {
  economy: Economy;
  rosette: Rosette;
  reduced: () => boolean;
  /** Something changed (wind, mode): repaint the drums, the ticket and the keys. */
  onChange: () => void;
}

/** The shared reserve: adds detents, stamps the rosette and signals the stop. */
export class Winder {
  /** Keys that wobble when the ratchet slips at the stop. */
  private readonly wobblers = new Set<() => void>();
  /** Total detents wound since load (the proof's caption counts the turns). */
  totalDetents = 0;
  /** Give of the current drag (degrees): the key yields a little before it clicks in. */
  give = 0;

  constructor(readonly o: WinderOptions) {}

  onWobble(fn: () => void): void {
    this.wobblers.add(fn);
  }

  /** Adds `n` detents. Returns how many went in. */
  wind(n: number): number {
    const e = this.o.economy;
    const before = e.detents;
    const added = e.addWind(n);
    for (let i = 0; i < added; i++) {
      const d = before + i + 1;
      this.o.rosette.stamp((d * DETENT_DEG) % 360, Math.floor((d - 1) / DETENTS_PER_TURN));
      window.setTimeout(() => detentTick(1 + (d / MAX_DETENTS) * 0.6), i * 30);
    }
    this.totalDetents += added;
    if (added < n) {
      ratchetSlip();
      for (const fn of this.wobblers) fn();
    }
    this.o.onChange();
    return added;
  }

  /** Ratchet clicks (counterclockwise drag): they sound but change nothing. */
  click(n: number): void {
    for (let i = 0; i < n; i++) window.setTimeout(() => detentTick(0.72), i * 25);
  }

  /** Pressing the key while the queue runs: pause (HOLD). */
  press(): void {
    this.o.economy.hold(true);
    this.o.onChange();
  }

  /** Releasing the key: with work in the queue, the wind makes it run. */
  release(): void {
    const e = this.o.economy;
    this.give = 0;
    if (e.state.mode === 'hold') e.hold(false);
    else if (e.storedSeconds > 0 && e.state.mode !== 'running') {
      if (this.o.reduced()) e.runInstantly();
      else e.letGo();
    }
    this.o.onChange();
  }

  reset(): void {
    this.totalDetents = 0;
    this.give = 0;
  }
}

/** Connects an element (the key) to the `Winder`: pointer, keyboard and slider values. */
export function bindKey(element: HTMLElement, winder: Winder): { sync: () => void } {
  const ratchet = new Ratchet();
  let pointerId: number | null = null;
  let last = 0;
  let spaceTimer = 0;

  const sync = () => {
    const d = winder.o.economy.detents;
    element.setAttribute('aria-valuenow', String(d));
    element.setAttribute('aria-valuetext', windText(d));
  };
  element.setAttribute('role', 'slider');
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', String(MAX_DETENTS));
  element.tabIndex = 0;
  sync();

  const center = () => {
    const box = element.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  };

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointerId !== null) return;
    // On a phone the key's tile scrolls (`touch-action: pan-y`) and only its round face, the grip,
    // winds: a touch outside a visible grip is left to the page. Without a grip, as today.
    const grip = element.querySelector<HTMLElement>('.key-grip');
    if (event.pointerType === 'touch' && grip && grip.offsetParent !== null && !grip.contains(event.target as Node)) return;
    event.preventDefault();
    element.focus({ preventScroll: true });
    pointerId = event.pointerId;
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-winding');
    ratchet.reset();
    const c = center();
    last = pointerAngle(c.x, c.y, event.clientX, event.clientY);
    if (winder.o.economy.state.mode === 'running') winder.press();
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const c = center();
    if (Math.hypot(event.clientX - c.x, event.clientY - c.y) < DEAD_ZONE) return;
    const angle = pointerAngle(c.x, c.y, event.clientX, event.clientY);
    const delta = wrapDeg(angle - last);
    last = angle;
    const { detents, clicks } = ratchet.feed(delta);
    if (detents) winder.wind(detents);
    if (clicks) winder.click(clicks);
    winder.give = ratchet.give;
    sync();
  });
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    element.classList.remove('is-winding');
    ratchet.reset();
    winder.release();
    sync();
  };
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);

  const stopSpace = () => {
    window.clearInterval(spaceTimer);
    spaceTimer = 0;
  };
  element.addEventListener('keydown', (event) => {
    const add = (n: number) => {
      event.preventDefault();
      winder.wind(n);
      sync();
    };
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        add(1);
        break;
      case 'PageUp':
        add(DETENTS_PER_TURN);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
      case 'PageDown':
        // A ratchet does not go back: it only clicks.
        event.preventDefault();
        winder.click(1);
        break;
      case ' ':
        event.preventDefault();
        if (event.repeat || spaceTimer) return;
        winder.wind(1);
        spaceTimer = window.setInterval(() => {
          winder.wind(1);
          sync();
        }, KEY_DETENT_MS);
        sync();
        break;
      case 'Enter':
      case 'Escape':
        event.preventDefault();
        stopSpace();
        winder.release();
        sync();
        break;
    }
  });
  element.addEventListener('keyup', (event) => {
    if (event.key === ' ') stopSpace();
  });
  element.addEventListener('blur', () => {
    stopSpace();
    // Losing focus while the key is freshly wound also releases it.
    if (winder.o.economy.state.mode === 'winding') winder.release();
  });

  return { sync };
}

/**
 * The lid key's grip on a phone (design adapt-for-phones D8): while `query` matches, a round
 * `.key-grip` sits on the drawn key's face and is the only part of the tile that winds; the rest of
 * the tile scrolls the page (the CSS sets both `touch-action`s). Removed when the query stops matching.
 */
export function bindKeyGrip(element: HTMLElement, query: string): void {
  const gate = window.matchMedia(query);
  let grip: HTMLElement | null = null;
  const sync = () => {
    if (gate.matches && !grip) {
      grip = document.createElement('span');
      grip.className = 'key-grip';
      grip.setAttribute('aria-hidden', 'true');
      element.append(grip);
    } else if (!gate.matches && grip) {
      grip.remove();
      grip = null;
    }
  };
  gate.addEventListener('change', sync);
  sync();
}
