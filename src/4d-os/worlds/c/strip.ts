import type { Engine } from '../../../engine/engine/Engine';
import type { Pack } from '../../../engine/pack/loader';
import { prefersReducedMotion } from '../../../engine/display/cssColor';
import { paintSourceFrame } from '../../../engine/shell/sourceFrames';
import type { TimeController } from '../../../engine/time/TimeController';
import { stainTexture } from './film';

/** Film offset (px) that centers frame `frame` under the gate. */
export function filmOffset(frame: number, frameWidth: number, gap: number): number {
  return -(frame * (frameWidth + gap) + frameWidth / 2);
}

/** Frame under the gate after a drag of `dx` px from `startFrame`. */
export function frameAfterPull(startFrame: number, dx: number, frameWidth: number, gap: number): number {
  return startFrame - dx / (frameWidth + gap);
}

/** Latent edge code every 20 frames, like the footage numbers on 16 mm film. */
export function edgeCode(frame: number): string | null {
  return frame % 20 === 0 ? `0923 ${String(frame).padStart(4, '0')}` : null;
}

/** Deterministic integer hash (same frame, same marks on every visit). */
export function frameHash(n: number): number {
  let h = Math.imul(n + 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

export interface FrameMarks {
  /**
   * Scratch: horizontal position 0..1, segments [start, height] as a fraction of the film frame, and strength.
   * It comes in runs of 12 frames at the same x, like a real scratch along the film.
   */
  scratch?: { x: number; segments: Array<[number, number]>; strength: number };
  /** Chemical stain: center and size relative to the film frame, and which of the textures it uses. */
  stain?: { x: number; y: number; size: number; texture: number };
}

/** Film marks of one frame: sparse and always the same for that frame (it is not a filter). */
export function frameMarks(frame: number): FrameMarks {
  const marks: FrameMarks = {};
  const run = frameHash(Math.floor(frame / 12));
  if (run % 3 === 0) {
    const h = frameHash(frame * 7 + 3);
    const segments: Array<[number, number]> = [];
    let top = ((h >>> 3) % 30) / 100;
    for (let i = 0; i < 1 + ((h >>> 9) % 3) && top < 0.95; i++) {
      const length = 0.12 + ((h >>> (11 + i * 5)) % 45) / 100;
      segments.push([top, Math.min(length, 1 - top)]);
      top += length + 0.06 + ((h >>> (17 + i * 3)) % 20) / 100;
    }
    marks.scratch = { x: 0.12 + ((run >>> 8) % 760) / 1000, segments, strength: 0.55 + ((h >>> 24) % 45) / 100 };
  }
  const h = frameHash(frame);
  if (h % 37 === 0) {
    marks.stain = {
      x: ((h >>> 5) % 80) / 100 + 0.1,
      y: ((h >>> 13) % 70) / 100 + 0.15,
      size: 0.2 + ((h >>> 21) % 12) / 50,
      texture: (h >>> 27) % 4,
    };
  }
  return marks;
}

let stains: string[] | null = null;
const stainTextures = () => (stains ??= [11, 23, 37, 51].map((seed) => stainTexture(seed)));

/**
 * Draws the marks of `frame` inside `target` (strip or gate), on the pixel grid: the scratch is
 * `pixel` px wide and its x falls on a multiple of `pixel`.
 */
export function paintMarks(target: HTMLElement, frame: number, width: number, pixel = 3): void {
  const { scratch, stain } = frameMarks(frame);
  const nodes: HTMLElement[] = [];
  if (scratch) {
    const left = Math.round((scratch.x * width) / pixel) * pixel;
    for (const [top, height] of scratch.segments) {
      const line = document.createElement('span');
      line.className = 'scratch';
      Object.assign(line.style, {
        left: `${left}px`,
        width: `${pixel}px`,
        top: `${top * 100}%`,
        height: `${height * 100}%`,
        opacity: String(scratch.strength),
      });
      nodes.push(line);
    }
  }
  if (stain) {
    const blot = document.createElement('span');
    blot.className = 'stain';
    Object.assign(blot.style, {
      left: `${(stain.x - stain.size / 2) * 100}%`,
      top: `${(stain.y - stain.size / 2) * 100}%`,
      width: `${stain.size * 100}%`,
      backgroundImage: `url("${stainTextures()[stain.texture]}")`,
    });
    nodes.push(blot);
  }
  target.querySelectorAll('.scratch, .stain').forEach((node) => node.remove());
  target.append(...nodes);
}

export interface FilmStripOptions {
  window: HTMLElement;
  film: HTMLElement;
  time: TimeController;
  pack: Pack;
  engine: Engine;
  /** Layer over the projector's gate: shows the marks of the present frame. */
  gateMarks?: HTMLElement | null;
}

/**
 * The film strip is the physical timeline: each source frame of the pack is a real film frame, the
 * fixed gate marks the "now" and the strip advances in jerks (intermittent pull-down, like a
 * projector). Grabbing and pulling it moves time through a damped TimeController target, so the
 * direction (and the present's color) comes from the direction of the pull; on release it keeps
 * going by inertia and then playback returns to its previous speed.
 */
export function bindFilmStrip(options: FilmStripOptions): () => void {
  const { window: strip, film, time, pack, engine } = options;
  const still = prefersReducedMotion();
  const count = pack.meta.frameCount;
  const perSecond = Math.round(pack.meta.fps);

  const frames: HTMLElement[] = [];
  const fragment = document.createDocumentFragment();
  for (let f = 0; f < count; f++) {
    const frame = document.createElement('div');
    frame.className = 'strip__frame';
    frame.dataset.frame = String(f);
    const code = edgeCode(f);
    if (code) {
      const edge = document.createElement('i');
      edge.textContent = code;
      frame.append(edge);
    }
    if (f % perSecond === 0) {
      const mark = document.createElement('b');
      mark.textContent = String(f);
      frame.append(mark);
    }
    frames.push(frame);
    fragment.append(frame);
  }
  film.replaceChildren(fragment);
  film.setAttribute('aria-hidden', 'true');

  const gateMarks = options.gateMarks ?? null;
  let frameWidth = 160;
  let gap = 6;
  const measure = () => {
    const styles = getComputedStyle(strip);
    frameWidth = Number.parseFloat(styles.getPropertyValue('--frame-w')) || 160;
    gap = Number.parseFloat(styles.getPropertyValue('--frame-gap')) || 6;
    frames.forEach((node, f) => {
      paintSourceFrame(node, pack.url, pack.meta, f, frameWidth);
      paintMarks(node, f, frameWidth);
    });
    if (gateMarks) paintMarks(gateMarks, time.frame, gateMarks.clientWidth);
    place(time.frame, false);
  };

  const place = (frame: number, animate: boolean) => {
    film.style.transition = animate && !still ? 'transform 70ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    film.style.transform = `translate3d(${filmOffset(frame, frameWidth, gap)}px, 0, 0)`;
  };

  // --- pulling the strip --------------------------------------------------------------------
  let pulling = false;
  let startX = 0;
  let startFrame = 0;
  let target = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0; // frames per second
  let moved = false;
  let stopInertia: (() => void) | null = null;

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    stopInertia?.();
    pulling = true;
    moved = false;
    startX = lastX = event.clientX;
    lastT = event.timeStamp;
    startFrame = target = time.frame;
    velocity = 0;
    strip.setPointerCapture(event.pointerId);
    strip.classList.add('is-pulling');
  };

  const onMove = (event: PointerEvent) => {
    if (!pulling) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    if (!moved) return;
    target = Math.min(count - 1, Math.max(0, frameAfterPull(startFrame, dx, frameWidth, gap)));
    time.setTarget(target);
    // setTarget does not emit until the first update: in HOLD the engine's loop has to be woken up.
    engine.requestFrame();
    const dt = Math.max(1, event.timeStamp - lastT) / 1000;
    const instant = -(event.clientX - lastX) / (frameWidth + gap) / dt;
    velocity = velocity * 0.6 + instant * 0.4;
    lastX = event.clientX;
    lastT = event.timeStamp;
  };

  const release = () => {
    stopInertia = null;
    time.releaseTarget();
  };

  const onUp = (event: PointerEvent) => {
    if (!pulling) return;
    pulling = false;
    strip.classList.remove('is-pulling');
    if (strip.hasPointerCapture(event.pointerId)) strip.releasePointerCapture(event.pointerId);

    if (!moved) {
      // Click on a film frame: direct jump.
      const hit = (event.target as Element).closest<HTMLElement>('.strip__frame');
      if (hit?.dataset.frame) time.seek(Number(hit.dataset.frame));
      return;
    }
    if (still || Math.abs(velocity) < 2) {
      release();
      return;
    }
    // Inertia: the strip keeps running and slows down on its own.
    let v = velocity;
    const off = engine.addTicker((dt) => {
      v *= Math.exp(-dt / 0.32);
      target = Math.min(count - 1, Math.max(0, target + v * dt));
      time.setTarget(target);
      const done = Math.abs(v) < 0.4 || target <= 0 || target >= count - 1;
      if (done) {
        queueMicrotask(off);
        release();
      }
      return !done;
    });
    stopInertia = () => {
      off();
      release();
    };
  };

  strip.addEventListener('pointerdown', onDown);
  strip.addEventListener('pointermove', onMove);
  strip.addEventListener('pointerup', onUp);
  strip.addEventListener('pointercancel', onUp);

  const unsubscribe = time.subscribe((state, previous) => {
    // Intermittent advance: one short jerk per frame; long jumps go without a transition.
    place(state.frame, Math.abs(state.frame - previous.frame) <= 2);
    if (gateMarks && state.frame !== previous.frame) paintMarks(gateMarks, state.frame, gateMarks.clientWidth);
  });
  const observer = new ResizeObserver(measure);
  observer.observe(strip);
  measure();

  return () => {
    stopInertia?.();
    unsubscribe();
    observer.disconnect();
    strip.removeEventListener('pointerdown', onDown);
    strip.removeEventListener('pointermove', onMove);
    strip.removeEventListener('pointerup', onUp);
    strip.removeEventListener('pointercancel', onUp);
  };
}
