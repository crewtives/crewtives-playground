import './tokens.css';
import './style.css';
import './machines.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupSmoothScroll } from '../../engine/shell/smoothScroll';
import { displayRegistry } from '../shared/displays';
import { motion } from '../shared/motion';
import { hasWebGL2 } from '../shared/probe';
import { sound } from '../shared/sound';
import type { DisplayMode } from '../../engine/display/RetroDisplay';
import { setupFloors } from './floors';
import { settings } from './settings';
import { sfx } from './sfx';

// Game Center Yonjigen: the building. This module sets up what does not need 3D (elevator, sound,
// SCREEN selector, closing) and, if there is WebGL2, requests the three chunk with Rain Run.
setupSmoothScroll({ resetToTop: false });
const root = document.documentElement;
const body = document.body;

const floors = setupFloors();

// Motion: the room's animations (tubes, blinks) only run without reduced motion.
const applyMotion = (reduced: boolean) => {
  body.classList.toggle('is-live', !reduced);
  root.dataset.reducedMotion = String(reduced);
};
applyMotion(motion.reduced);
motion.onChange(applyMotion);

// Sound: the directory's grille (or its phone counterpart), always in sync.
const soundButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-sound]')];
const paintSound = (on: boolean) => {
  for (const button of soundButtons) {
    button.setAttribute('aria-pressed', String(on));
    const text = button.querySelector('[data-sound-text]');
    if (text) text.textContent = on ? 'Sound on' : 'Sound off';
  }
};
paintSound(sound.enabled);
sound.onChange(paintSound);
for (const button of soundButtons) {
  button.addEventListener('click', () => {
    sound.toggle();
    sfx.click();
  });
}

// The screen chosen on an earlier visit (SCREEN selector or SW2–SW3) applies to every screen.
displayRegistry.setMode(settings.value.screen);
displayRegistry.onChange((mode) => settings.set({ screen: mode }));

// SCREEN: a single depth selector for every screen (radio group with arrows).
setupScreenSwitch();

// RF closing: CONTINUE? counts down once per second only while it is visible.
setupClose(floors);

// The elevator: each painted numeral rises from 12vh into place as its floor arrives (no fade).
setupPlates();

// 2F on phones: the aisle of cabinets scrolls sideways.
setupAisleFocus();

// Power-on sequence: the marquee tubes strike twice and the CRT turns on.
if (!motion.reduced) {
  body.classList.add('is-striking');
  window.setTimeout(() => body.classList.remove('is-striking'), 950);
  document.querySelector('.cell--index')?.classList.add('is-beckon');
}

// Without WebGL2 the 3D chunk is not requested: the static page stays whole and says so once.
const gl = hasWebGL2();
if (gl) {
  root.dataset.webgl2 = 'true';
  void import('./rainrun/boot').then(({ bootRainRun }) => bootRainRun());
} else {
  root.dataset.webgl2 = 'false';
  const note = document.querySelector<HTMLElement>('[data-nogl]');
  if (note) note.hidden = false;
  const screen = document.querySelector<HTMLElement>('[data-rr-view]');
  if (screen) void import('./fallback').then(({ paintFallbackStill }) => paintFallbackStill(screen));
}

// Floors on demand: each machine's code is requested when its floor is less than one screen away.
whenNear('3f', () => {
  if (gl) void import('./crane/boot').then(({ bootCrane }) => bootCrane());
});
whenNear('4f', () => void import('./parlour/boot').then(({ bootParlour }) => bootParlour(gl)));
whenNear('rf', () => void import('./roof/boot').then(({ bootRoof }) => bootRoof(gl)));

function setupPlates(): void {
  const plates = [...document.querySelectorAll<HTMLElement>('.floor__plate')];
  let tweens: gsap.core.Tween[] = [];
  const build = (reduced: boolean) => {
    for (const t of tweens) {
      t.scrollTrigger?.kill();
      t.kill();
    }
    tweens = [];
    gsap.set(plates, { y: 0 });
    if (reduced) return;
    tweens = plates.map((plate) =>
      gsap.fromTo(
        plate,
        { y: '12vh' },
        { y: 0, ease: 'none', scrollTrigger: { trigger: plate.closest('.floor') ?? plate, start: 'top bottom', end: 'top 35%', scrub: true } },
      ),
    );
  };
  build(motion.reduced);
  motion.onChange(build);
  // The machines load on demand and change the floors' heights: the triggers are recomputed.
  let timer = 0;
  new ResizeObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(document.querySelector('.building') ?? document.body);
}

/**
 * On phones the 2F aisle scrolls sideways, and the browser leaves a partly visible cabinet where it is
 * when it takes keyboard focus: the aisle brings the focused slot to its center. Where the aisle does
 * not scroll (tablet and desktop) nothing moves.
 */
function setupAisleFocus(): void {
  const aisle = document.querySelector<HTMLElement>('.aisle');
  if (!aisle) return;
  aisle.addEventListener('focusin', (event) => {
    if (aisle.scrollWidth <= aisle.clientWidth + 1) return;
    const slot = (event.target as Element).closest<HTMLElement>('.aisle__slot');
    if (!slot) return;
    const box = aisle.getBoundingClientRect();
    const r = slot.getBoundingClientRect();
    if (r.left >= box.left - 0.5 && r.right <= box.right + 0.5) return;
    aisle.scrollTo({ left: aisle.scrollLeft + r.left - box.left - (box.width - r.width) / 2, behavior: 'instant' });
  });
}

function whenNear(id: string, load: () => void): void {
  const el = document.getElementById(id);
  if (!el) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    },
    { rootMargin: '100% 0px 100% 0px' },
  );
  observer.observe(el);
}

function setupScreenSwitch(): void {
  const group = document.querySelector<HTMLElement>('[data-screen-switch]');
  if (!group) return;
  const radios = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const paint = (mode: DisplayMode) => {
    for (const radio of radios) {
      const on = radio.dataset.mode === mode;
      radio.setAttribute('aria-checked', String(on));
      radio.tabIndex = on ? 0 : -1;
    }
  };
  paint(displayRegistry.mode);
  displayRegistry.onChange(paint);
  const choose = (radio: HTMLButtonElement, focus: boolean) => {
    displayRegistry.setMode(radio.dataset.mode as DisplayMode);
    sfx.click();
    if (focus) radio.focus();
  };
  for (const radio of radios) radio.addEventListener('click', () => choose(radio, false));
  group.addEventListener('keydown', (event) => {
    const i = radios.findIndex((r) => r === document.activeElement);
    if (i < 0) return;
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    choose(radios[(i + step + radios.length) % radios.length], true);
  });
}

function setupClose(api: ReturnType<typeof setupFloors>): void {
  const close = document.querySelector<HTMLElement>('[data-close]');
  const counter = document.querySelector<HTMLElement>('[data-continue-n]');
  const ride = document.querySelector<HTMLButtonElement>('[data-ride]');
  if (!close || !counter || !ride) return;
  let n = 9;
  let timer = 0;
  const finish = () => {
    close.classList.add('is-over');
    window.clearInterval(timer);
    timer = 0;
  };
  const tick = () => {
    n = Math.max(0, n - 1);
    counter.textContent = String(n);
    if (n === 0) finish();
  };
  if (motion.reduced) finish();
  motion.onChange((reduced) => {
    if (reduced) finish();
  });
  new IntersectionObserver(
    ([entry]) => {
      if (close.classList.contains('is-over')) return;
      if (entry.isIntersecting && !timer) timer = window.setInterval(tick, 1000);
      else if (!entry.isIntersecting && timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    },
    { threshold: 0.4 },
  ).observe(close);
  ride.addEventListener('click', () => {
    // The ding comes from arriving at 1F (floors.ts), as on every floor.
    sfx.click();
    api.goTo('1f', { focus: document.querySelector<HTMLElement>('[data-start]') });
  });
}
