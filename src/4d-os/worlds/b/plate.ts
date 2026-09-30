import type { Pack } from '../../../engine/pack/loader';
import { paintSourceFrame } from '../../../engine/shell/sourceFrames';
import type { TimeController } from '../../../engine/time/TimeController';

/** Frames of the sequence sheet: `count` exposures spread evenly across the clip. */
export function sheetFrames(frameCount: number, count = 12): number[] {
  if (frameCount <= count) return Array.from({ length: frameCount }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * (frameCount - 1)) / (count - 1)));
}

/** Index of the sheet's exposure that matches the current frame (the last one already passed). */
export function currentSheetIndex(frames: number[], frame: number): number {
  let index = 0;
  for (let i = 0; i < frames.length; i++) if (frames[i] <= frame) index = i;
  return index;
}

/**
 * Muybridge-style sequence sheet: 12 exposures of the source frame; a click jumps to that exposure
 * and the current one is framed in the direction's color.
 */
export function bindSequenceSheet(list: HTMLElement, time: TimeController, pack: Pack): () => void {
  const frames = sheetFrames(pack.meta.frameCount);
  const buttons = frames.map((frame) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.frame = String(frame);
    const label = String(frame).padStart(3, '0');
    button.setAttribute('aria-label', `Go to exposure ${label}`);
    const caption = document.createElement('span');
    caption.textContent = label;
    button.append(caption);
    button.addEventListener('click', () => time.seek(frame));
    item.append(button);
    return { item, button, frame };
  });
  list.replaceChildren(...buttons.map((b) => b.item));

  const paint = () => {
    for (const { button, frame } of buttons) paintSourceFrame(button, pack.url, pack.meta, frame);
  };
  const observer = new ResizeObserver(paint);
  observer.observe(list);
  paint();

  const sync = () => {
    const active = currentSheetIndex(frames, time.frame);
    buttons.forEach(({ button }, i) => button.setAttribute('aria-current', String(i === active)));
  };
  const off = time.subscribe(sync);
  sync();

  return () => {
    off();
    observer.disconnect();
  };
}

/** How far a column number reaches past its line: its 5 px offset and up to two digits. */
const GRATICULE_NUMBER_REACH = 24;

/**
 * Muybridge grid: numbers the columns of the engraved grid (one every 64 px). While `whole()` is true
 * (narrow screens), a number the glass's edge would cut in half is left out.
 */
export function bindGraticule(graticule: HTMLElement, spacing = 64, whole: () => boolean = () => false): () => void {
  const draw = () => {
    const width = graticule.clientWidth;
    const columns = Math.floor((whole() ? width - GRATICULE_NUMBER_REACH : width) / spacing);
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= columns; i++) {
      const number = document.createElement('span');
      number.style.left = `${i * spacing}px`;
      number.textContent = String(i);
      fragment.append(number);
    }
    graticule.replaceChildren(fragment);
  };
  const observer = new ResizeObserver(draw);
  observer.observe(graticule);
  draw();
  return () => observer.disconnect();
}

/** Dial stops: exposures per second → trail stride (every k frames). */
export function exposureStops(fps: number, frameCount = Infinity): Array<{ perSecond: number; stride: number; label: string }> {
  // Spaced-out stops: each one leaves a different number of separate poses on the plate.
  return [3, 5, 15, 30, 60]
    .filter((stride) => stride < frameCount)
    .map((stride) => {
      const perSecond = fps / stride;
      return { perSecond, stride, label: String(Number(perSecond.toFixed(2))) };
    });
}

/**
 * "exposures" dial: how many exposures per second stay on the plate. Changing it re-exposes the
 * trail live (a viewer uniform: no data is uploaded again).
 */
export function bindExposureDial(
  container: HTMLElement,
  fps: number,
  setStride: (stride: number) => void,
  initialStride = 15,
  frameCount = Infinity,
): () => void {
  const stops = exposureStops(fps, frameCount);
  const labels = stops.map(({ stride, label }) => {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'exposures';
    input.value = String(stride);
    input.checked = stride === initialStride;
    input.setAttribute('aria-label', `${label} exposures per second`);
    input.addEventListener('change', () => input.checked && setStride(stride));
    wrapper.append(input, document.createTextNode(label));
    return wrapper;
  });
  container.replaceChildren(...labels);
  setStride(initialStride);
  return () => container.replaceChildren();
}
