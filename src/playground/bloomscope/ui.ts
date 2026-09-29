// Page controls: the sound gem, the display beads (one single mode for every view), the scrollbar
// track that follows the field, and the fixed chamber gem.

import type { DisplayMode } from '../../engine/display/RetroDisplay';
import { displayRegistry } from '../shared/displays';
import { sound } from '../shared/sound';

export function bindSound(button: HTMLButtonElement): void {
  const label = button.querySelector<HTMLElement>('.sound-label');
  const render = (on: boolean) => {
    button.setAttribute('aria-pressed', String(on));
    if (label) label.textContent = on ? 'Sound on' : 'Sound off';
  };
  render(sound.enabled);
  button.addEventListener('click', () => sound.toggle());
  sound.onChange(render);
}

/** Every `1-bit · 16 · Millions` bead row on the page changes the same mode. */
export function bindPixels(root: ParentNode): void {
  const inputs = () => Array.from(root.querySelectorAll<HTMLInputElement>('[data-pixels] input[type="radio"]'));
  const render = (mode: DisplayMode) => {
    for (const input of inputs()) input.checked = input.value === mode;
  };
  root.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (!input.matches?.('[data-pixels] input[type="radio"]') || !input.checked) return;
    displayRegistry.setMode(input.value as DisplayMode);
  });
  displayRegistry.onChange(render);
  render(displayRegistry.mode);
}

/** The scrollbar track takes the color of the field at the middle of the screen. */
export function bindScrollTrack(sections: HTMLElement[]): void {
  const html = document.documentElement;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        html.style.setProperty('--track', getComputedStyle(entry.target).backgroundColor);
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  for (const section of sections) io.observe(section);
}

// What the gem must not cover: text, controls and views of the sections below.
const CONTENT = 'h2, h3, p, a, button, input, label, img, svg, canvas, figure, [role], .wheel';

/**
 * The `n/7` gem appears when the Scope leaves the screen, and leads back to it. It tucks away (no
 * opacity, no clicks, 220 ms) while it would have text or a control beneath it: it only shows over
 * empty field. On the phone (≤ 699 px) it also tucks away while a peephole is on screen, because the
 * peephole already leads to the Scope. When it receives a chip ("Put in the Scope") it shows for a
 * moment even if it covers something.
 */
export function bindChamberGem(gem: HTMLAnchorElement, hero: HTMLElement): (count: number) => void {
  const count = gem.querySelector<HTMLElement>('.chamber-count');
  const io = new IntersectionObserver(([entry]) => {
    gem.hidden = entry.isIntersecting;
    schedule();
  });
  io.observe(hero);

  const phone = window.matchMedia('(max-width: 699px)');
  const peeps = new Set<Element>();
  const peepIo = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) peeps.add(entry.target);
      else peeps.delete(entry.target);
    }
    schedule();
  });
  document.querySelectorAll('.peephole').forEach((peephole) => peepIo.observe(peephole));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section:not(.hero), .footer'));
  let holdUntil = 0;
  let raf = 0;

  const covers = (): boolean => {
    const g = gem.getBoundingClientRect();
    const pad = 6;
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      if (box.bottom < g.top || box.top > g.bottom) continue;
      for (const el of section.querySelectorAll(CONTENT)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > g.left - pad && r.left < g.right + pad && r.bottom > g.top - pad && r.top < g.bottom + pad) return true;
      }
    }
    return false;
  };

  const update = () => {
    raf = 0;
    const tucked = !gem.hidden && document.activeElement !== gem && performance.now() >= holdUntil && ((phone.matches && peeps.size > 0) || covers());
    gem.classList.toggle('is-tucked', tucked);
    // While tucked away it cannot be reached with Tab either (the peephole or the "Or skip" link does that job).
    if (tucked) gem.tabIndex = -1;
    else gem.removeAttribute('tabindex');
  };
  function schedule(): void {
    if (!raf) raf = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  phone.addEventListener('change', schedule);
  // A chip on its way: the gem shows up to receive it and tucks away again afterwards.
  gem.addEventListener('chamber:incoming', () => {
    holdUntil = performance.now() + 1400;
    update();
    window.setTimeout(schedule, 1450);
  });
  schedule();

  return (n: number) => {
    if (count) count.textContent = `${n}/7`;
  };
}
