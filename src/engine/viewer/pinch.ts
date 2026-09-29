// The views' own pinch (D3): the wheel without Ctrl scrolls the page, and zoom comes only from the
// pinch, whether touch (two pointers), trackpad (Ctrl+wheel) or Safari (GestureEvent).

/** State of a spring: position and velocity. */
export interface SpringState {
  x: number;
  v: number;
}

/**
 * Critically damped spring parameterized by half-life (Spring-It-On): an exact solution,
 * independent of fps and with no bounce. `halflife` (s) is the damping half-life: starting from
 * rest, ~60 % of the distance remains after one half-life, ~24 % after two and ~8 % after three.
 */
export function springStep(state: SpringState, goal: number, halflife: number, dt: number): void {
  const y = (2 * Math.LN2) / (halflife + 1e-5);
  const j0 = state.x - goal;
  const j1 = state.v + j0 * y;
  const e = Math.exp(-y * dt);
  state.x = e * (j0 + j1 * dt) + goal;
  state.v = e * (state.v - j1 * y * dt);
}

/** Pixels per line and per page for a wheel in `deltaMode` 1 and 2 (as in Lenis). */
const LINE_PIXELS = 100 / 6;
const PAGE_PIXELS = 100;
/**
 * Ctrl+wheel: Chromium emits the trackpad pinch with deltaY = −100·ln(scale), so 0.01 per pixel
 * gives the same ln as the fingers. One mouse-wheel notch with Ctrl (100 px) saturates at ~0.3.
 */
const WHEEL_GAIN = 0.01;
const WHEEL_MAX = 0.3;

export interface WheelLike {
  ctrlKey: boolean;
  deltaY: number;
  deltaMode: number;
}

export interface PointerLike {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
}

/**
 * Pinch recognizer, without DOM: it takes the events and returns the change in ln(camera
 * distance) they ask for (negative = zoom in), or null if the event contributes nothing. It
 * deduplicates the three sources for the length of a gesture: fingers win over the iOS
 * GestureEvent, and Safari's GestureEvent wins over its Ctrl+wheel.
 */
export class PinchRecognizer {
  private readonly touches = new Map<number, { x: number; y: number }>();
  private spread = 0;
  private gesture: { scale: number; shadowed: boolean } | null = null;

  /** There are two fingers on the view. */
  get pointerPinch(): boolean {
    return this.touches.size === 2;
  }

  get gestureActive(): boolean {
    return this.gesture !== null;
  }

  pointerDown(event: PointerLike): void {
    if (event.pointerType !== 'touch' || this.touches.size >= 2) return;
    this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.touches.size === 2) this.spread = this.currentSpread();
  }

  pointerMove(event: PointerLike): number | null {
    const touch = this.touches.get(event.pointerId);
    if (!touch) return null;
    touch.x = event.clientX;
    touch.y = event.clientY;
    if (this.touches.size !== 2) return null;
    const spread = this.currentSpread();
    const previous = this.spread;
    this.spread = spread;
    return previous > 0 && spread > 0 ? -Math.log(spread / previous) : null;
  }

  pointerUp(event: Pick<PointerLike, 'pointerId'>): void {
    this.touches.delete(event.pointerId);
    this.spread = this.touches.size === 2 ? this.currentSpread() : 0;
  }

  /** Only Ctrl+wheel (trackpad pinch) counts; the plain wheel belongs to the page. */
  wheel(event: WheelLike): number | null {
    if (!event.ctrlKey || this.gesture || this.pointerPinch) return null;
    const pixels = event.deltaY * (event.deltaMode === 1 ? LINE_PIXELS : event.deltaMode === 2 ? PAGE_PIXELS : 1);
    return WHEEL_MAX * Math.tanh((pixels * WHEEL_GAIN) / WHEEL_MAX);
  }

  gestureStart(): void {
    this.gesture = { scale: 1, shadowed: this.pointerPinch };
  }

  /** GestureEvent's `scale` is absolute from the start of the gesture. */
  gestureChange(scale: number): number | null {
    const gesture = this.gesture;
    if (!gesture || !(scale > 0)) return null;
    const previous = gesture.scale;
    gesture.scale = scale;
    if (gesture.shadowed || this.pointerPinch) return null;
    return -Math.log(scale / previous);
  }

  gestureEnd(): void {
    this.gesture = null;
  }

  reset(): void {
    this.touches.clear();
    this.spread = 0;
    this.gesture = null;
  }

  private currentSpread(): number {
    const [a, b] = [...this.touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

/** Safari's gesture event (not in the DOM types). */
interface GestureEventLike extends Event {
  scale: number;
}

/**
 * Connects the recognizer to an element. `enabled` decides on every event whether the view takes
 * the pinch (if not, the browser does its own thing, page zoom included). Returns the disconnect.
 */
export function bindPinch(element: HTMLElement, options: { enabled: () => boolean; onPinch: (dLog: number) => void }): () => void {
  const recognizer = new PinchRecognizer();
  const emit = (dLog: number | null) => {
    if (dLog !== null && dLog !== 0 && Number.isFinite(dLog)) options.onPinch(dLog);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (options.enabled()) recognizer.pointerDown(event);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!options.enabled()) return;
    emit(recognizer.pointerMove(event));
  };
  const onPointerUp = (event: PointerEvent) => recognizer.pointerUp(event);
  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey || !options.enabled()) return;
    // A trackpad pinch on the view does not zoom the page (Lenis already ignores Ctrl+wheel).
    event.preventDefault();
    emit(recognizer.wheel(event));
  };
  const onGestureStart = (event: Event) => {
    if (!options.enabled()) return;
    event.preventDefault();
    recognizer.gestureStart();
  };
  const onGestureChange = (event: Event) => {
    if (!recognizer.gestureActive) return;
    event.preventDefault();
    emit(recognizer.gestureChange((event as GestureEventLike).scale));
  };
  const onGestureEnd = (event: Event) => {
    if (!recognizer.gestureActive) return;
    event.preventDefault();
    recognizer.gestureEnd();
  };

  const active = { passive: false } as const;
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  element.addEventListener('wheel', onWheel, active);
  element.addEventListener('gesturestart', onGestureStart, active);
  element.addEventListener('gesturechange', onGestureChange, active);
  element.addEventListener('gestureend', onGestureEnd, active);
  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
    element.removeEventListener('wheel', onWheel);
    element.removeEventListener('gesturestart', onGestureStart);
    element.removeEventListener('gesturechange', onGestureChange);
    element.removeEventListener('gestureend', onGestureEnd);
    recognizer.reset();
  };
}
