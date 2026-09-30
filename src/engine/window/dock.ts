/**
 * 4D.OS window dock (spec desktop-shell "Narrow viewport"; design adapt-for-phones D9). On narrow
 * screens the tool windows stop floating over the viewer and are gathered in a row of disclosure
 * buttons, one per window, of which at most one window is open. Like `windows.ts` it is headless: it
 * only creates the button row, sets classes and attributes, and each world styles them.
 *
 * While the world's narrow query matches it:
 * - creates `<div class="dock" role="group" aria-label="Windows">` with one
 *   `<button type="button" class="dock__button" aria-expanded aria-controls>` per window, named after
 *   the window's title, and hands it to `mount` (the world decides where it goes);
 * - sets `data-dock` on `<html>`, `data-docked` on each docked window and `hidden` on the closed ones
 *   (each world's CSS adds `[data-docked][hidden] { display: none !important; }`, because its own rules
 *   that set `display` on a window beat the user-agent `[hidden]` rule);
 * - opens, closes and switches windows on click, and closes the open one on Escape, returning the
 *   focus to its button when it was inside the window.
 * When the query stops matching, everything it created is removed and every attribute it set is
 * restored. It never reparents a window, never scrolls the page (focus returns with
 * `preventScroll`) and never touches `translate` or `z-index`, which `bindWindows` owns.
 */

export interface DockOptions {
  /** The world's narrow query: the dock exists only while it matches. */
  query: string;
  /** Where to look for the windows (defaults to the whole document). */
  root?: ParentNode;
  /** `data-window` names, in button order. */
  windows: string[];
  /** Where the world puts the button row. */
  mount: (bar: HTMLElement) => void;
  /** Window open on entering the query, or null for none. */
  initial: string | null;
  /** Accessible name of the button row. */
  label?: string;
  /** Called after each open, close or switch, with the open window or null (also on entering and leaving the query). */
  onChange?: (open: HTMLElement | null) => void;
}

/** The window open after pressing a dock button: the pressed one, or none when it was already open. */
export function nextOpen(current: string | null, pressed: string): string | null {
  return current === pressed ? null : pressed;
}

/** A dock button's label: the window title's text with its white space collapsed, or the window's name. */
export function dockLabel(title: string | null | undefined, name: string): string {
  const text = (title ?? '').replace(/\s+/g, ' ').trim();
  return text || name;
}

interface Docked {
  name: string;
  win: HTMLElement;
  button: HTMLButtonElement;
  /** State before docking, restored on leaving the query. */
  hidden: HTMLElement['hidden'];
  id: string | null;
}

export function bindDock(options: DockOptions): () => void {
  const root = options.root ?? document;
  const media = window.matchMedia(options.query);
  let bar: HTMLElement | null = null;
  let docked: Docked[] = [];
  let open: string | null = null;

  const apply = () => {
    for (const entry of docked) {
      const isOpen = entry.name === open;
      entry.win.hidden = !isOpen;
      entry.button.setAttribute('aria-expanded', String(isOpen));
    }
    options.onChange?.(docked.find((entry) => entry.name === open)?.win ?? null);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || open === null) return;
    const entry = docked.find((d) => d.name === open);
    if (!entry) return;
    const focusInside = entry.win.contains(document.activeElement);
    open = null;
    apply();
    if (focusInside) entry.button.focus({ preventScroll: true });
  };

  const enter = () => {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'dock';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', options.label ?? 'Windows');
    docked = [];
    for (const name of options.windows) {
      const win = root.querySelector<HTMLElement>(`[data-window="${name}"]`);
      if (!win) continue;
      const entry: Docked = { name, win, button: document.createElement('button'), hidden: win.hidden, id: win.getAttribute('id') };
      if (!entry.id) win.id = `dock-window-${name}`;
      const title = win.querySelector('.win__title > span') ?? win.querySelector('.win__title');
      const button = entry.button;
      button.type = 'button';
      button.className = 'dock__button';
      button.dataset.dockWindow = name;
      button.setAttribute('aria-controls', win.id);
      button.textContent = dockLabel(title?.textContent, name);
      button.addEventListener('click', () => {
        open = nextOpen(open, name);
        apply();
      });
      win.dataset.docked = '';
      bar.append(button);
      docked.push(entry);
    }
    open = docked.some((entry) => entry.name === options.initial) ? options.initial : null;
    document.documentElement.dataset.dock = '';
    options.mount(bar);
    document.addEventListener('keydown', onKey);
    apply();
  };

  const leave = () => {
    if (!bar) return;
    document.removeEventListener('keydown', onKey);
    bar.remove();
    bar = null;
    for (const entry of docked) {
      entry.win.hidden = entry.hidden;
      delete entry.win.dataset.docked;
      if (entry.id === null) entry.win.removeAttribute('id');
    }
    docked = [];
    open = null;
    delete document.documentElement.dataset.dock;
    options.onChange?.(null);
  };

  const sync = () => (media.matches ? enter() : leave());
  sync();
  media.addEventListener('change', sync);
  return () => {
    media.removeEventListener('change', sync);
    leave();
  };
}
