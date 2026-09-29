/**
 * Development only. A hidden tab (for example, a browser-automation tab) does not run
 * requestAnimationFrame, so the engine never paints and nothing can be checked with captures.
 * If the page starts hidden, or with `?raf=timer`, rAF falls back to timers. In a hidden tab the
 * browser throttles them (≈1/s), but that is enough to inspect frames. Install it before the engine.
 */
export function installDevRafShim(): void {
  const forced = new URLSearchParams(window.location.search).get('raf') === 'timer';
  if (!forced && document.visibilityState !== 'hidden') return;
  let next = 0;
  const timers = new Map<number, number>();
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const handle = ++next;
    timers.set(
      handle,
      window.setTimeout(() => {
        timers.delete(handle);
        callback(performance.now());
      }, 16),
    );
    return handle;
  };
  window.cancelAnimationFrame = (handle: number): void => {
    const timer = timers.get(handle);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.delete(handle);
  };
  console.info('[dev] requestAnimationFrame → setTimeout (hidden tab)');
}
