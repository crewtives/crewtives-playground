// The elevator: floor directory, current floor (the one crossing the middle of the viewport), addresses
// #1f…#rf with a history entry (Back goes down one floor), elevator panel on phones, and ding.
import { motion } from '../shared/motion';
import { sound } from '../shared/sound';
import { sfx } from './sfx';

export const FLOORS = ['1f', '2f', '3f', '4f', '5f', 'rf'] as const;
export type Floor = (typeof FLOORS)[number];

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
  const liftNow = document.querySelector<HTMLElement>('[data-lift-now]');
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
    if (liftNow) liftNow.textContent = label;
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

  setupLiftPanel(goTo);

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

/** Elevator panel (phone): six floor buttons; Escape closes it and returns focus. */
function setupLiftPanel(goTo: FloorsApi['goTo']): void {
  const button = document.querySelector<HTMLButtonElement>('[data-lift]');
  const panel = document.querySelector<HTMLElement>('[data-lift-panel]');
  if (!button || !panel) return;
  const close = (restoreFocus: boolean) => {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  };
  const open = () => {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.querySelector<HTMLButtonElement>('button')?.focus();
  };
  button.addEventListener('click', () => {
    sfx.click();
    if (panel.hidden) open();
    else close(false);
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
    goTo(floor);
  });
  document.addEventListener('pointerdown', (event) => {
    if (panel.hidden) return;
    const t = event.target as Node;
    if (!panel.contains(t) && !button.contains(t)) close(false);
  });
}
