const format = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** "Wednesday, Sep 23, 2026 19:33:10": the wall clock of the Clock window. */
export function wallClockText(date: Date): string {
  const parts = Object.fromEntries(format.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Updates `element` once per second, aligned to the change of the second. */
export function bindWallClock(element: HTMLElement): () => void {
  let timer = 0;
  const tick = () => {
    const now = new Date();
    element.textContent = wallClockText(now);
    timer = window.setTimeout(tick, 1000 - now.getMilliseconds());
  };
  tick();
  return () => window.clearTimeout(timer);
}
