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

/** Pull and aim from the vector pointer − rocket (CSS px, y pointing down). */
export function pullFromVector(dx: number, dy: number, previousAim: number): { detents: number; aim: number } {
  const distance = Math.hypot(dx, dy);
  const detents = Math.min(DETENTS, Math.floor((Math.min(distance, FULL_PULL) / FULL_PULL) * DETENTS + 1e-9));
  // −P points from the pointer to the rocket; the angle is measured from "up" (toward the Whirl).
  const aim = distance < 6 ? previousAim : Math.max(-MAX_AIM, Math.min(MAX_AIM, Math.atan2(-dx, dy))) || 0;
  return { detents, aim };
}

export class RocketInput {
  private readonly o: RocketInputOptions;
  private origin = { x: 0, y: 0 };
  private pointerId: number | null = null;
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
      this.begin();
      this.move(event.clientX, event.clientY);
    });
    button.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.pointerId) this.move(event.clientX, event.clientY);
    });
    const end = (event: PointerEvent, cancel: boolean) => {
      if (event.pointerId !== this.pointerId) return;
      this.pointerId = null;
      button.classList.remove('is-pulling');
      if (cancel) this.cancel();
      else this.release();
    };
    button.addEventListener('pointerup', (event) => end(event, false));
    button.addEventListener('pointercancel', (event) => end(event, true));

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
    const next = pullFromVector(x - this.origin.x, y - this.origin.y, this.o.pull.aim);
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
