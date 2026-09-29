export interface WindowTrailOptions {
  /** Element that starts the drag (by default, the `.win__title` title bar). */
  handle?: HTMLElement | null;
  /** Minimum distance in px between two copies. */
  spacing?: number;
  /** Maximum number of live copies. */
  max?: number;
  /** After release, how long the copies wait before being cleared (ms). */
  holdMs?: number;
  /** Pace of the clearing, from oldest to newest (ms per copy). */
  clearStepMs?: number;
  /** Class of each copy. */
  echoClass?: string;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Window echo (the trail of turn-of-the-century desktops): while `win` is dragged, it leaves inert
 * copies at its previous positions, which are cleared on release. It is the 2D version of
 * "every moment at once". It does nothing under reduced motion.
 * The drag itself is done by the Window component; here the position is only observed.
 */
export function bindWindowTrail(win: HTMLElement, options: WindowTrailOptions = {}): () => void {
  const handle = options.handle ?? win.querySelector<HTMLElement>('.win__title') ?? win;
  const spacing = options.spacing ?? 14;
  const max = options.max ?? 90;
  const holdMs = options.holdMs ?? 900;
  const clearStepMs = options.clearStepMs ?? 12;
  const echoClass = options.echoClass ?? 'win-echo';

  const echoes: HTMLElement[] = [];
  let raf = 0;
  let clearTimer = 0;
  let lastX = Number.NaN;
  let lastY = Number.NaN;
  let tracking = false;

  const position = () => {
    const parent = (win.offsetParent as HTMLElement | null) ?? document.body;
    const own = win.getBoundingClientRect();
    const base = parent.getBoundingClientRect();
    return {
      parent,
      x: own.left - base.left + parent.scrollLeft,
      y: own.top - base.top + parent.scrollTop,
      w: own.width,
      h: own.height,
    };
  };

  const stamp = () => {
    const { parent, x, y, w, h } = position();
    if (Number.isFinite(lastX) && Math.hypot(x - lastX, y - lastY) < spacing) return;
    const echo = win.cloneNode(true) as HTMLElement;
    echo.removeAttribute('id');
    echo.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    for (const attr of ['data-window', 'data-trail', 'aria-labelledby', 'aria-live']) echo.removeAttribute(attr);
    echo.classList.add(echoClass);
    echo.classList.remove('is-dragging');
    echo.setAttribute('aria-hidden', 'true');
    echo.inert = true;
    const z = Number.parseInt(getComputedStyle(win).zIndex, 10);
    Object.assign(echo.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      margin: '0',
      // The position already comes from the real rect, so any offset of the window's own is canceled
      // (the window component moves windows with the `translate` property).
      transform: 'none',
      translate: 'none',
      right: 'auto',
      bottom: 'auto',
      zIndex: String(Number.isFinite(z) ? z - 1 : 0),
    });
    // The copies go behind the live window and above the scene.
    parent.insertBefore(echo, win);
    echoes.push(echo);
    lastX = x;
    lastY = y;
    if (echoes.length > max) echoes.shift()?.remove();
  };

  const loop = () => {
    if (!tracking) return;
    stamp();
    raf = requestAnimationFrame(loop);
  };

  const clear = () => {
    const next = echoes.shift();
    if (!next) return;
    next.remove();
    clearTimer = window.setTimeout(clear, clearStepMs);
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || reducedMotion()) return;
    window.clearTimeout(clearTimer);
    tracking = true;
    lastX = Number.NaN;
    raf = requestAnimationFrame(loop);
  };
  const onUp = () => {
    if (!tracking) return;
    tracking = false;
    cancelAnimationFrame(raf);
    clearTimer = window.setTimeout(clear, holdMs);
  };

  handle.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return () => {
    tracking = false;
    cancelAnimationFrame(raf);
    window.clearTimeout(clearTimer);
    handle.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    for (const echo of echoes.splice(0)) echo.remove();
  };
}
