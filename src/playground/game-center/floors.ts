// The elevator: floor directory, current floor (the one crossing the middle of the viewport), addresses
// #1f…#rf with a history entry (Back goes down one floor), elevator panel on phones (opened from 1F's
// deck and from a call button in every other floor's header), and ding.
import { motion } from '../shared/motion';
import { sound } from '../shared/sound';
import { sfx } from './sfx';

export const FLOORS = ['1f', '2f', '3f', '4f', '5f', 'rf'] as const;
export type Floor = (typeof FLOORS)[number];

/** The phone layout: no directory, an elevator panel instead (style.css, tokens.css). */
export const PHONE_QUERY = '(max-width: 767px)';

/** Who opened the elevator panel. Only that button reads as expanded, and focus returns to it. */
export interface LiftState<T> {
  open: boolean;
  invoker: T | null;
}

export const LIFT_CLOSED: LiftState<never> = { open: false, invoker: null };

/** A press on an elevator button: it opens the panel, closes it when it is the one that opened it, and takes it over otherwise. */
export function pressLift<T>(state: LiftState<T>, pressed: T): LiftState<T> {
  if (state.open && state.invoker === pressed) return { open: false, invoker: null };
  return { open: true, invoker: pressed };
}

/** Closing the panel (Escape, a floor chosen, a tap outside): the button to give focus back to, when asked. */
export function closeLift<T>(state: LiftState<T>, restoreFocus: boolean): { state: LiftState<T>; focus: T | null } {
  return { state: { open: false, invoker: null }, focus: restoreFocus && state.open ? state.invoker : null };
}

/** `aria-expanded` of one elevator button. */
export function liftExpanded<T>(state: LiftState<T>, button: T): boolean {
  return state.open && state.invoker === button;
}

/** Color of each floor: the scrollbar thumb takes the current floor's color. */
const FLOOR_COLOR: Record<Floor, string> = {
  '1f': 'var(--enamel)',
  '2f': 'var(--sodium)',
  '3f': 'var(--candy)',
  '4f': 'var(--mint)',
  '5f': 'var(--carpet-2)',
  rf: 'var(--night-2)',
};

/** Floor of an address (`#3f`), or null if it is not a floor (the page stays on 1F). */
export function parseFloorHash(hash: string): Floor | null {
  // A machine's address (`#4f?sym=…`) also leads to its floor.
  const id = hash.replace(/^#/, '').split('?')[0].toLowerCase();
  return (FLOORS as readonly string[]).includes(id) ? (id as Floor) : null;
}

export interface FloorsApi {
  readonly current: Floor;
  goTo(floor: Floor, options?: { push?: boolean; focus?: HTMLElement | null }): void;
}

export function setupFloors(): FloorsApi {
  const sections = new Map<Floor, HTMLElement>();
  for (const floor of FLOORS) {
    const el = document.getElementById(floor);
    if (el) sections.set(floor, el);
  }
  const cells = [...document.querySelectorAll<HTMLAnchorElement>('.cell[data-floor]')];
  const nowLabel = document.querySelector<HTMLElement>('[data-now]');
  let current: Floor = parseFloorHash(location.hash) ?? '1f';
  let settled = false;

  const mark = (floor: Floor, ding: boolean) => {
    const changed = floor !== current;
    current = floor;
    for (const cell of cells) {
      if (cell.dataset.floor === floor) cell.setAttribute('aria-current', 'location');
      else cell.removeAttribute('aria-current');
    }
    const label = floor.toUpperCase();
    if (nowLabel && nowLabel.textContent !== label) {
      nowLabel.textContent = label;
      // The elevator digit rolls like a mechanical counter: six steps, no fade.
      if (!motion.reduced && settled) {
        nowLabel.animate([{ transform: 'translateY(70%)' }, { transform: 'translateY(0)' }], { duration: 240, easing: 'steps(6)' });
      }
    }
    // Every elevator display, looked up each time: the phone's call buttons come and go (setupCallButtons).
    for (const liftNow of document.querySelectorAll<HTMLElement>('[data-lift-now]')) liftNow.textContent = label;
    document.documentElement.style.setProperty('--thumb', FLOOR_COLOR[floor]);
    if (changed && ding && sound.enabled) sfx.ding();
  };
  mark(current, false);

  // The current floor is the one crossing the middle of the viewport.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const floor = parseFloorHash((entry.target as HTMLElement).id);
        if (floor) mark(floor, settled);
      }
      settled = true;
    },
    { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
  );
  for (const el of sections.values()) observer.observe(el);

  const scrollToFloor = (floor: Floor) => {
    const el = sections.get(floor);
    if (!el) return;
    const top = floor === '1f' ? 0 : el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: motion.reduced ? 'auto' : 'smooth' });
  };

  const goTo: FloorsApi['goTo'] = (floor, options = {}) => {
    const { push = true, focus = null } = options;
    if (push && location.hash !== `#${floor}`) history.pushState({ floor }, '', `#${floor}`);
    scrollToFloor(floor);
    if (focus) focus.focus({ preventScroll: true });
  };

  // Directory and floor links: an elevator ride with a history entry.
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const floor = parseFloorHash(link.getAttribute('href') ?? '');
    if (!floor) return;
    event.preventDefault();
    goTo(floor);
  });

  window.addEventListener('popstate', () => {
    scrollToFloor(parseFloorHash(location.hash) ?? '1f');
  });

  const closePanel = setupLiftPanel(goTo, () => current);
  setupCallButtons(() => current, closePanel);

  // A machine's address (`#4f?…`) is not an id on the page: the browser does not scroll down by itself.
  if (current !== '1f' && location.hash.includes('?')) {
    const el = sections.get(current);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }

  return {
    get current() {
      return current;
    },
    goTo,
  };
}

/**
 * Elevator panel (phone): six floor buttons, opened by any elevator button (`[data-lift]`: 1F's deck and
 * the call buttons). The buttons come and go with the phone layout, so clicks are handled by delegation
 * on the document; the button that opened the panel is the only one expanded, and Escape returns focus
 * to it. Returns a function that closes the panel.
 */
function setupLiftPanel(goTo: FloorsApi['goTo'], current: () => Floor): (restoreFocus: boolean) => void {
  const panel = document.querySelector<HTMLElement>('[data-lift-panel]');
  if (!panel) return () => {};
  let state: LiftState<HTMLElement> = LIFT_CLOSED;
  const paint = () => {
    panel.hidden = !state.open;
    for (const button of document.querySelectorAll<HTMLElement>('[data-lift]')) button.setAttribute('aria-expanded', String(liftExpanded(state, button)));
  };
  const close = (restoreFocus: boolean) => {
    if (!state.open) return;
    const next = closeLift(state, restoreFocus);
    state = next.state;
    paint();
    if (next.focus?.isConnected) next.focus.focus();
  };
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>('[data-lift]');
    if (!button) return;
    sfx.click();
    state = pressLift(state, button);
    paint();
    if (state.open) panel.querySelector<HTMLButtonElement>('button')?.focus();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  });
  panel.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button[data-go]');
    const floor = target ? parseFloorHash(target.dataset.go ?? '') : null;
    if (!floor) return;
    sfx.click();
    close(false);
    // The floor the visitor rode to by scrolling gets its address first, so Back returns to it.
    const here = current();
    if (location.hash !== `#${here}`) history.replaceState({ floor: here }, '', `#${here}`);
    goTo(floor);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!state.open) return;
    const t = event.target as Element;
    if (!panel.contains(t) && !t.closest?.('[data-lift]')) close(false);
  });
  return close;
}

/**
 * Elevator call buttons (phone): a round lift button in the header of 2F, 3F, 4F, 5F and RF, created
 * while the phone layout matches and removed when it stops matching, so the desktop document keeps its
 * elements. Each shows the current floor, written when it is made (setFloor keeps it up to date).
 */
function setupCallButtons(current: () => Floor, closePanel: (restoreFocus: boolean) => void): void {
  const query = window.matchMedia(PHONE_QUERY);
  let made: HTMLButtonElement[] = [];
  const make = (): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lift-call';
    button.dataset.lift = '';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'lift-panel');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-lift');
    svg.append(use);
    const num = document.createElement('span');
    num.className = 'lift-call__num';
    num.dataset.liftNow = '';
    num.textContent = current().toUpperCase();
    const name = document.createElement('span');
    name.className = 'visually-hidden';
    name.textContent = 'Elevator: choose a floor';
    button.append(svg, num, name);
    return button;
  };
  const apply = () => {
    if (query.matches && made.length === 0) {
      for (const floor of FLOORS.slice(1)) {
        const section = document.getElementById(floor);
        const host = section?.querySelector<HTMLElement>(floor === 'rf' ? '.roof__deck' : '.floor__inner');
        if (!host) continue;
        const button = make();
        const plate = host.querySelector(':scope > .floor__plate');
        if (plate) plate.after(button);
        else host.prepend(button);
        made.push(button);
      }
    } else if (!query.matches && made.length > 0) {
      // The panel belongs to the phone layout: it closes with it.
      closePanel(false);
      for (const button of made) button.remove();
      made = [];
    }
  };
  apply();
  query.addEventListener('change', apply);
}
