// Input for the friction rocket: grab it and pull back like a slingshot (12 detents, aim of ±60°
// from "toward the Whirl"), with the keyboard (Space held, Left/Right, Escape) and with the visible
// row of controls (Aim, Pull-back, Launch). It knows nothing about three: the view tells it where
// the rocket is on screen.
import { DETENTS, MAX_AIM } from '../flight';

export interface PullState {
  active: boolean;
  detents: number;
  aim: number;
  shakeAt: number;
  preview: boolean;
}

export interface RocketInputOptions {
  button: HTMLButtonElement;
  aimInput: HTMLInputElement;
  pullInput: HTMLInputElement;
  launchButton: HTMLButtonElement;
  pull: PullState;
  /** The view's clock, for the shake on each detent. */
  clock: () => number;
  canLaunch: () => boolean;
  launch: (detents: number, aim: number) => void;
  onDetent?: (detents: number) => void;
  onCancel?: () => void;
  /** Something changed: request a frame. */
  invalidate: () => void;
}

/** Pull distance for all 12 detents (CSS px). */
const FULL_PULL = 132;
const STEP = (5 * Math.PI) / 180;
/** One detent every 90 ms while Space is held. */
const KEY_DETENT_MS = 90;
/** A brief hitch before launch. */
const HITCH_MS = 60;

export function aimText(aim: number): string {
  const deg = Math.round((aim * 180) / Math.PI);
  if (deg === 0) return 'straight at the Whirl';
  return `${Math.abs(deg)} degrees toward ${deg > 0 ? 'prograde' : 'retrograde'}`;
}

/** Pull and aim from the vector pointer − rocket (CSS px, y pointing down). With `clampForward` (an
 * established touch pull), a pointer that comes forward of the rocket, toward the Whirl, pulls nothing. */
export function pullFromVector(dx: number, dy: number, previousAim: number, clampForward = false): { detents: number; aim: number } {
  if (clampForward && dy <= 0) return { detents: 0, aim: previousAim };
  const distance = Math.hypot(dx, dy);
  const detents = Math.min(DETENTS, Math.floor((Math.min(distance, FULL_PULL) / FULL_PULL) * DETENTS + 1e-9));
  // −P points from the pointer to the rocket; the angle is measured from "up" (toward the Whirl).
  const aim = distance < 6 ? previousAim : Math.max(-MAX_AIM, Math.min(MAX_AIM, Math.atan2(-dx, dy))) || 0;
  return { detents, aim };
}

/** The widest first move, off straight back, that still reads as a pull (the aim itself stops at ±60°). */
const PULL_CONE = (75 * Math.PI) / 180;

/**
 * The first move of a touch that started on the rocket (design adapt-for-phones D8): a pull only when it
 * heads away from the Whirl (down the screen, within 75° of straight back). A move toward the Whirl, or
 * sideways, is not a pull: the rocket leaves it to the browser, which scrolls the page natively.
 */
export function touchPull(dx: number, dy: number): boolean {
  return dy > 0 && Math.atan2(Math.abs(dx), dy) <= PULL_CONE;
}

export class RocketInput {
  private readonly o: RocketInputOptions;
  private origin = { x: 0, y: 0 };
  private pointerId: number | null = null;
  /** A touch on the rocket: undecided until its first move, then a pull or left to the page's scroll. */
  private touch: 'pending' | 'pull' | 'scroll' | null = null;
  private touchStart = { x: 0, y: 0 };
  private keyTimer = 0;
  private previewTimer = 0;

  constructor(options: RocketInputOptions) {
    this.o = options;
    const { button, aimInput, pullInput, launchButton } = options;

    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || this.pointerId !== null) return;
      event.preventDefault();
      if (!this.o.canLaunch()) return;
      const box = button.getBoundingClientRect();
      this.origin = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      this.pointerId = event.pointerId;
      button.setPointerCapture(event.pointerId);
      button.classList.add('is-pulling');
      // A touch waits for its first move (the touchmove below) before it pulls anything.
      this.touch = event.pointerType === 'touch' ? 'pending' : null;
      this.begin();
      if (!this.touch) this.move(event.clientX, event.clientY);
    });
    button.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.pointerId || this.touch === 'pending' || this.touch === 'scroll') return;
      this.move(event.clientX, event.clientY);
    });
    const end = (event: PointerEvent, cancel: boolean) => {
      if (event.pointerId !== this.pointerId) return;
      this.pointerId = null;
      button.classList.remove('is-pulling');
      const scroll = this.touch !== null && this.touch !== 'pull';
      this.touch = null;
      if (cancel || scroll) this.cancel();
      else this.release();
    };
    button.addEventListener('pointerup', (event) => end(event, false));
    button.addEventListener('pointercancel', (event) => end(event, true));

    // Touch: the grab keeps `touch-action: pan-y` on a coarse pointer, so a vertical swipe is the
    // browser's to scroll. Only this listener can keep it: on the first move it asks `touchPull`, and
    // only a pull away from the Whirl cancels the scroll. The page never scrolls itself.
    button.addEventListener(
      'touchstart',
      (event) => {
        const t = event.touches[0];
        if (t) this.touchStart = { x: t.clientX, y: t.clientY };
      },
      { passive: true },
    );
    button.addEventListener(
      'touchmove',
      (event) => {
        const t = event.touches[0];
        if (!t || this.touch === null) return;
        if (this.touch === 'pending') {
          this.touch = touchPull(t.clientX - this.touchStart.x, t.clientY - this.touchStart.y) ? 'pull' : 'scroll';
          if (this.touch === 'scroll') {
            // Zero notches and no ghost: the release cancels.
            this.o.pull.detents = 0;
            this.o.invalidate();
          }
        }
        if (this.touch === 'pull' && event.cancelable) event.preventDefault();
      },
      { passive: false },
    );

    button.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        if (event.repeat || this.keyTimer || !this.o.canLaunch()) return;
        this.begin();
        this.o.pull.aim = this.sliderAim();
        this.keyTimer = window.setInterval(() => this.setDetents(this.o.pull.detents + 1), KEY_DETENT_MS);
        this.setDetents(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = this.o.pull.aim + (event.key === 'ArrowRight' ? STEP : -STEP);
        this.setAim(Math.max(-MAX_AIM, Math.min(MAX_AIM, next)));
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    });
    button.addEventListener('keyup', (event) => {
      if (event.key !== ' ') return;
      event.preventDefault();
      if (this.keyTimer) this.release();
    });
    button.addEventListener('blur', () => {
      if (this.keyTimer) this.cancel();
    });
    // On a button, the Space key fires "click" when released: the rocket ignores it.
    button.addEventListener('click', (event) => event.preventDefault());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.o.pull.active) this.cancel();
    });

    const preview = () => {
      const pull = this.o.pull;
      if (pull.active) return;
      pull.preview = true;
      pull.detents = Number(pullInput.value);
      pull.aim = this.sliderAim();
      this.syncText();
      window.clearTimeout(this.previewTimer);
      this.previewTimer = window.setTimeout(() => {
        pull.preview = false;
        this.o.invalidate();
      }, 1600);
      this.o.invalidate();
    };
    aimInput.addEventListener('input', preview);
    pullInput.addEventListener('input', preview);
    launchButton.addEventListener('click', () => {
      const detents = Number(pullInput.value);
      if (detents < 1 || !this.o.canLaunch()) return;
      this.o.pull.preview = false;
      this.o.launch(detents, this.sliderAim());
    });
    this.syncText();
  }

  private sliderAim(): number {
    return (Number(this.o.aimInput.value) * Math.PI) / 180;
  }

  private begin(): void {
    const pull = this.o.pull;
    pull.active = true;
    pull.preview = false;
    pull.detents = 0;
    this.o.invalidate();
  }

  private move(x: number, y: number): void {
    const next = pullFromVector(x - this.origin.x, y - this.origin.y, this.o.pull.aim, this.touch === 'pull');
    this.setAim(next.aim);
    this.setDetents(next.detents);
  }

  private setDetents(detents: number): void {
    const pull = this.o.pull;
    const next = Math.max(0, Math.min(DETENTS, detents));
    if (next === pull.detents) return;
    if (next > pull.detents) {
      pull.shakeAt = this.o.clock();
      this.o.onDetent?.(next);
    }
    pull.detents = next;
    this.o.invalidate();
  }

  private setAim(aim: number): void {
    const pull = this.o.pull;
    if (aim === pull.aim) return;
    pull.aim = aim;
    this.o.invalidate();
  }

  private stopKeys(): void {
    window.clearInterval(this.keyTimer);
    this.keyTimer = 0;
  }

  private release(): void {
    this.stopKeys();
    const pull = this.o.pull;
    const { detents, aim } = pull;
    pull.active = false;
    if (detents < 1) {
      pull.detents = 0;
      this.o.onCancel?.();
      this.o.invalidate();
      return;
    }
    // The visible controls keep the last pull, so it can be repeated.
    this.o.pullInput.value = String(detents);
    this.o.aimInput.value = String(Math.round((aim * 180) / Math.PI / 5) * 5);
    this.syncText();
    window.setTimeout(() => {
      pull.detents = 0;
      this.o.launch(detents, aim);
    }, HITCH_MS);
    this.o.invalidate();
  }

  private cancel(): void {
    this.stopKeys();
    this.touch = null;
    if (this.pointerId !== null) {
      try {
        this.o.button.releasePointerCapture(this.pointerId);
      } catch {
        // already released
      }
      this.pointerId = null;
      this.o.button.classList.remove('is-pulling');
    }
    const pull = this.o.pull;
    if (!pull.active) return;
    pull.active = false;
    pull.detents = 0;
    this.o.onCancel?.();
    this.o.invalidate();
  }

  private syncText(): void {
    const aim = this.sliderAim();
    this.o.aimInput.setAttribute('aria-valuetext', aimText(aim));
    this.o.pullInput.setAttribute('aria-valuetext', `${this.o.pullInput.value} of 12 detents`);
  }
}
