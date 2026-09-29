import { timecode, type TimeController } from '../time/TimeController';

/** Frame that matches a horizontal position on the track. */
export function frameAtRatio(ratio: number, frameCount: number): number {
  const clamped = Math.min(1, Math.max(0, ratio));
  return Math.round(clamped * Math.max(0, frameCount - 1));
}

/** Playhead position (0..1) for a frame. */
export function playheadRatio(frame: number, frameCount: number): number {
  return frameCount > 1 ? frame / (frameCount - 1) : 0;
}

export interface RulerTick {
  /** Position 0..1 on the track. */
  at: number;
  major: boolean;
  /** A "0:05" label, only on major ticks. */
  label?: string;
}

/** Ruler ticks: one per second, and a labeled major tick every `majorEvery` seconds. */
export function rulerTicks(frameCount: number, fps: number, majorEvery = 5): RulerTick[] {
  const seconds = Math.floor((frameCount - 1) / fps);
  const ticks: RulerTick[] = [];
  for (let s = 0; s <= seconds; s++) {
    const major = s % majorEvery === 0;
    ticks.push({
      at: playheadRatio(s * fps, frameCount),
      major,
      label: major ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : undefined,
    });
  }
  return ticks;
}

/** Draws the ruler inside `ruler` with <i> (ticks) and <b> (labels), positioned in %. */
export function renderRuler(ruler: HTMLElement, frameCount: number, fps: number, majorEvery = 5): void {
  const fragment = document.createDocumentFragment();
  for (const tick of rulerTicks(frameCount, fps, majorEvery)) {
    const mark = document.createElement('i');
    mark.style.left = `${tick.at * 100}%`;
    if (tick.major) mark.className = 'is-major';
    fragment.append(mark);
    if (tick.label) {
      const label = document.createElement('b');
      label.style.left = `${tick.at * 100}%`;
      label.textContent = tick.label;
      fragment.append(label);
    }
  }
  ruler.replaceChildren(fragment);
}

export interface TimelineOptions {
  /** Called when a scrub starts and ends (for example, to show a dragging state). */
  onScrub?: (active: boolean) => void;
}

/**
 * Headless scrub on a track element (role="slider"):
 * a click jumps, a drag scrubs with `seek`, and arrows/Home/End/PageUp/PageDown work from the keyboard.
 * Publishes `--playhead` (0..1) on the track and keeps the slider's ARIA attributes up to date.
 * While dragging, playback stays in HOLD; on release it resumes at the previous rate.
 */
export function bindTimeline(track: HTMLElement, time: TimeController, options: TimelineOptions = {}): () => void {
  const last = time.frameCount - 1;
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(last));

  const sync = () => {
    const frame = time.frame;
    track.style.setProperty('--playhead', String(playheadRatio(frame, time.frameCount)));
    track.setAttribute('aria-valuenow', String(frame));
    track.setAttribute('aria-valuetext', timecode(frame, time.fps));
  };

  let resumeRate = 0;
  let scrubbing = false;

  const seekAt = (clientX: number) => {
    const box = track.getBoundingClientRect();
    time.seek(frameAtRatio((clientX - box.left) / box.width, time.frameCount));
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    scrubbing = true;
    resumeRate = time.playing ? time.rate : 0;
    if (resumeRate !== 0) time.hold();
    track.setPointerCapture(event.pointerId);
    track.classList.add('is-scrubbing');
    options.onScrub?.(true);
    seekAt(event.clientX);
  };
  const onMove = (event: PointerEvent) => {
    if (scrubbing) seekAt(event.clientX);
  };
  const onUp = (event: PointerEvent) => {
    if (!scrubbing) return;
    scrubbing = false;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove('is-scrubbing');
    options.onScrub?.(false);
    if (resumeRate !== 0) time.play(resumeRate);
  };
  const onKey = (event: KeyboardEvent) => {
    const page = Math.max(1, Math.round(time.fps));
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        time.step(-1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        time.step(1);
        break;
      case 'PageDown':
        next = time.frame - page;
        break;
      case 'PageUp':
        next = time.frame + page;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next !== null) time.seek(next);
  };

  track.addEventListener('pointerdown', onDown);
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', onUp);
  track.addEventListener('pointercancel', onUp);
  track.addEventListener('keydown', onKey);
  const unsubscribe = time.subscribe(sync);
  sync();

  return () => {
    unsubscribe();
    track.removeEventListener('pointerdown', onDown);
    track.removeEventListener('pointermove', onMove);
    track.removeEventListener('pointerup', onUp);
    track.removeEventListener('pointercancel', onUp);
    track.removeEventListener('keydown', onKey);
  };
}
