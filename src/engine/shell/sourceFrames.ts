import { sourceCell, type SceneMeta } from '../pack/format';

/** Absolute URL of one atlas page of the 4D pack. */
export function atlasUrl(packUrl: string, page: string): string {
  const base = packUrl.endsWith('/') ? packUrl : `${packUrl}/`;
  return new URL(page, new URL(base, window.location.href)).href;
}

/**
 * Paints source frame `frame` as the CSS background of `element`, scaled to width `width` (by default
 * the element's current width). Uses the pack's atlas pages as they are: nothing is decoded.
 */
export function paintSourceFrame(
  element: HTMLElement,
  packUrl: string,
  meta: SceneMeta,
  frame: number,
  width = element.clientWidth,
): void {
  const source = meta.source;
  const clamped = Math.min(meta.frameCount - 1, Math.max(0, Math.round(frame)));
  const cell = sourceCell(source, clamped);
  const scale = width / source.width;
  element.style.backgroundImage = `url("${atlasUrl(packUrl, source.pages[cell.page])}")`;
  element.style.backgroundSize = `${source.columns * source.width * scale}px ${source.rows * source.height * scale}px`;
  element.style.backgroundPosition = `${-cell.x * scale}px ${-cell.y * scale}px`;
}

/**
 * Keeps `element` showing the frame returned by `frameOf()`: it repaints on resize and whenever
 * the returned function is called (typically from the time subscription).
 */
export function trackSourceFrame(
  element: HTMLElement,
  packUrl: string,
  meta: SceneMeta,
  frameOf: () => number,
): { update: () => void; dispose: () => void } {
  const update = () => paintSourceFrame(element, packUrl, meta, frameOf());
  const observer = new ResizeObserver(update);
  observer.observe(element);
  update();
  return { update, dispose: () => observer.disconnect() };
}
