/**
 * 4D.OS desktop windows (D9): they are dragged by the title bar with Pointer Events,
 * stay contained in the visible area, and the one that is touched comes to the front. No styles:
 * each world provides the CSS; here there are only state classes (`is-active`, `is-dragging`) and
 * an offset.
 *
 * Markup: `.win[data-window]` with a `.win__title` bar. The offset is applied with `translate`, so
 * the window keeps its place in the world's layout (absolute or in flow). A world can turn
 * dragging off with `--win-drag: 0` (for example, on narrow screens, where the windows stack
 * under the viewer).
 */

export interface WindowsOptions {
  /** Where to look for windows (defaults to the whole document). */
  root?: ParentNode;
  selector?: string;
  /** First z-index of the stack; it must sit above the engine's canvas. */
  baseZ?: number;
}

interface WindowState {
  win: HTMLElement;
  dx: number;
  dy: number;
}

export function bindWindows(options: WindowsOptions = {}): () => void {
  const root = options.root ?? document;
  const wins = Array.from(root.querySelectorAll<HTMLElement>(options.selector ?? '.win[data-window]'));
  const states = new Map<HTMLElement, WindowState>();
  const offs: Array<() => void> = [];
  let topZ = options.baseZ ?? 20;

  const draggable = (win: HTMLElement) => getComputedStyle(win).getPropertyValue('--win-drag').trim() !== '0';

  const apply = (state: WindowState) => {
    state.win.style.translate = state.dx || state.dy ? `${Math.round(state.dx)}px ${Math.round(state.dy)}px` : '';
  };

  /** Adjusts the offset so the whole window stays inside the viewport. */
  const contain = (state: WindowState) => {
    const box = state.win.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    let shiftX = 0;
    let shiftY = 0;
    if (box.width <= width) {
      if (box.left < 0) shiftX = -box.left;
      else if (box.right > width) shiftX = width - box.right;
    }
    if (box.height <= height) {
      if (box.top < 0) shiftY = -box.top;
      else if (box.bottom > height) shiftY = height - box.bottom;
    }
    if (shiftX || shiftY) {
      state.dx += shiftX;
      state.dy += shiftY;
      apply(state);
    }
  };

  const raise = (win: HTMLElement) => {
    win.style.zIndex = String(++topZ);
    for (const other of wins) other.classList.toggle('is-active', other === win);
  };

  // A static window needs a position for its z-index to count. The inline mark is re-evaluated when
  // the viewport changes: otherwise a window the narrow layout leaves static would stay `relative`
  // back on the desktop layout, where its own CSS positions it differently.
  const positioned = new Set<HTMLElement>();
  const ensurePosition = (win: HTMLElement) => {
    if (positioned.delete(win)) win.style.position = '';
    if (getComputedStyle(win).position === 'static') {
      win.style.position = 'relative';
      positioned.add(win);
    }
  };

  for (const win of wins) {
    const state: WindowState = { win, dx: 0, dy: 0 };
    states.set(win, state);
    ensurePosition(win);
    win.style.zIndex = String(++topZ);

    // Touching any part of the window, or focusing it with the keyboard, brings it to the front.
    const onFront = () => raise(win);
    win.addEventListener('pointerdown', onFront);
    win.addEventListener('focusin', onFront);
    offs.push(() => {
      win.removeEventListener('pointerdown', onFront);
      win.removeEventListener('focusin', onFront);
    });

    const handle = win.querySelector<HTMLElement>('.win__title');
    if (!handle) continue;
    let start: { x: number; y: number; dx: number; dy: number } | null = null;

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !draggable(win)) return;
      if ((event.target as Element).closest('button, a, input, select, textarea')) return;
      event.preventDefault();
      start = { x: event.clientX, y: event.clientY, dx: state.dx, dy: state.dy };
      handle.setPointerCapture(event.pointerId);
      win.classList.add('is-dragging');
    };
    const onMove = (event: PointerEvent) => {
      if (!start) return;
      state.dx = start.dx + event.clientX - start.x;
      state.dy = start.dy + event.clientY - start.y;
      apply(state);
      contain(state);
    };
    const onUp = (event: PointerEvent) => {
      if (!start) return;
      // Canceled: the browser took over the gesture (a vertical finger with `touch-action: pan-y`
      // scrolls the page). It was not a drag, so the window goes back to where it was.
      if (event.type === 'pointercancel') {
        state.dx = start.dx;
        state.dy = start.dy;
        apply(state);
      }
      start = null;
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      win.classList.remove('is-dragging');
    };
    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    offs.push(() => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    });
  }

  // When the viewport changes: without dragging (stacked layout) the offset is reset; with
  // dragging, windows that were moved are brought back inside the visible area.
  const onResize = () => {
    for (const state of states.values()) {
      ensurePosition(state.win);
      if (!draggable(state.win)) {
        state.dx = state.dy = 0;
        apply(state);
      } else if (state.dx || state.dy) {
        contain(state);
      }
    }
  };
  window.addEventListener('resize', onResize);
  offs.push(() => window.removeEventListener('resize', onResize));

  if (wins.length) raise(wins[wins.length - 1]);
  return () => offs.splice(0).forEach((off) => off());
}
