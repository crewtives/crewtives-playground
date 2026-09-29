// Wind-Up Empire boot. Everything that does not need WebGL lives here: the economy and its 10 Hz clock,
// the resource strip, the log, the queue and the spike, the two keys (their input and the rosette), the
// spark wheel, the press, the reset, the print proof, sound and reduced motion.
// The 3D lid is imported only if the browser has WebGL2; otherwise the lid is printed in 2D.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupSmoothScroll } from '../../engine/shell/smoothScroll';
import type { DisplayMode } from '../../engine/display/RetroDisplay';
import { displayRegistry } from '../shared/displays';
import { motion } from '../shared/motion';
import { hasWebGL2 } from '../shared/probe';
import { sound } from '../shared/sound';
import type { SharedContext } from './context';
import { Economy, TICK, type BuildingId, type ResearchRow } from './economy';
import { Fleet, flightLines, surveyReward } from './fleet';
import { SurveyLog } from './ui/log';
import { Hangar } from './ui/hangar';
import { Drums } from './ui/drums';
import { BuildDesk } from './ui/buildDesk';
import { aimText } from './ui/rocketInput';
import { Rosette } from './ui/rosette';
import { Winder, bindKey } from './ui/keyControl';
import { SparkWheel } from './ui/sparkWheel';
import { Press } from './ui/press';
import { cutTray } from './ui/tray';
import { detentTick, unwindWhirr } from './voices';

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const root = document.documentElement;
const phone = window.matchMedia('(pointer: coarse) and (max-width: 800px)').matches;

setupSmoothScroll({ resetToTop: false });

// --- Reduced motion, live ---
root.dataset.reducedMotion = String(motion.reduced);
motion.onChange((reduced) => (root.dataset.reducedMotion = String(reduced)));

// --- Sound: the strip's bell, off by default ---
const bell = $<HTMLButtonElement>('[data-sound-toggle]');
const bellText = bell.querySelector('.bell-text')!;
const paintBell = (on: boolean) => {
  bell.setAttribute('aria-pressed', String(on));
  bellText.textContent = on ? 'Sound on' : 'Sound off';
};
paintBell(sound.enabled);
bell.addEventListener('click', () => sound.toggle());
sound.onChange(paintBell);

// --- Strip menu (phone): Worlds and How to play on a plate that drops down from the bell ---
const menuButton = $<HTMLButtonElement>('[data-strip-menu]');
const menuLinks = $('#strip-links');
const setMenu = (open: boolean) => {
  menuButton.setAttribute('aria-expanded', String(open));
  menuLinks.classList.toggle('is-open', open);
};
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  setMenu(open);
  if (open) menuLinks.querySelector<HTMLElement>('a')?.focus();
});
menuLinks.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || menuButton.getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  menuButton.focus();
});
document.addEventListener('pointerdown', (event) => {
  if (!(event.target as Element).closest('.strip-nav')) setMenu(false);
});

// --- Log, economy and fleet ---
const log = new SurveyLog($<HTMLOListElement>('#log'));
const economy = new Economy();
const fleet = new Fleet();
fleet.planetsMove = !motion.reduced;
motion.onChange((reduced) => {
  fleet.planetsMove = !reduced;
  // Flights in progress are printed in full right away, like the chronophotograph: the fleet stands still.
  if (reduced) fleet.settle();
});

/** What the lid (3D or 2D) wants to hear about: changes in wind, memory, symmetry and reset. */
const hooks = {
  economy: [] as (() => void)[],
  memory: [] as ((moments: number) => void)[],
  symmetry: [] as ((fold: number) => void)[],
  reset: [] as (() => void)[],
  reveal: [] as ((value: number) => void)[],
};
let fold = 5;

const rosette = new Rosette();
const winder = new Winder({ economy, rosette, reduced: () => motion.reduced, onChange: () => renderEconomy() });
const keys = Array.from(document.querySelectorAll<HTMLElement>('[data-key]'), (element) => bindKey(element, winder));

const drums = new Drums($('.strip-drums'));
const desk = new BuildDesk({
  economy,
  reduced: () => motion.reduced,
  wind: (n) => winder.wind(n),
  release: () => winder.release(),
});
const hangar = new Hangar($('#hangar-slots'), $<HTMLUListElement>('#hangar-flights'), $<HTMLUListElement>('#hangar-charted'));

// The rosette also shows behind the flat key on the side panel.
const flatRosette = document.querySelector<HTMLCanvasElement>('.flat-rosette');
rosette.onChange(() => {
  if (!flatRosette) return;
  const ctx = flatRosette.getContext('2d')!;
  ctx.clearRect(0, 0, flatRosette.width, flatRosette.height);
  ctx.drawImage(rosette.canvas, 0, 0);
});

let lastFull = -1e9;
economy.on((event) => {
  // "The spring's full" once per gesture, not on every detent that hits the stop.
  if (event.type === 'spring-full') {
    const now = performance.now();
    if (now - lastFull < 1500) return;
    lastFull = now;
  }
  log.add(event.line);
  if (event.type === 'built') desk.clack(event.job);
  syncCapacity();
  renderEconomy();
});

fleet.on({
  launch: (flight) => {
    if (flight.demo) log.add('Rocket 0 · demo flight left home.');
    else log.add(`Rocket ${flight.id} left home: ${flight.state.params.detents} detents, ${aimText(flight.state.params.aim)}.`);
  },
  survey: (_flight, _world, first) => {
    economy.addSpark(surveyReward(first));
    renderEconomy();
  },
  end: (flight, outcome, newly, surveyed) => {
    for (const line of flightLines(flight, outcome, surveyed, newly)) log.add(line);
    renderCharted();
  },
  ratchet: () => detentTick(0.55),
});

function syncCapacity(): void {
  fleet.capacity = Math.min(economy.state.levels.gantry, phone ? 2 : 4);
}

let lastWind = '';
function renderEconomy(): void {
  drums.render(economy, motion.reduced);
  desk.render();
  press.render();
  for (const key of keys) key.sync();
  // The wind goes on the body, and only when it changes: the RetroDisplay observes the style of :root.
  const wind = economy.wind.toFixed(3);
  if (wind !== lastWind) {
    lastWind = wind;
    document.body.style.setProperty('--wind', wind);
  }
  for (const fn of hooks.economy) fn();
}

// The tray: each cavity gets its die-cut recess, sized to its image, its plate and its top.
cutTray();

/** Tray cavities: the CHARTED tab changes no link. */
function renderCharted(): void {
  for (const cavity of document.querySelectorAll<HTMLElement>('.cavity-world')) {
    const id = cavity.dataset.world as never;
    const charted = fleet.charted.has(id);
    let tab = cavity.querySelector('.charted-tab');
    if (charted && !tab) {
      tab = Object.assign(document.createElement('span'), { className: 'charted-tab', textContent: 'Charted' });
      cavity.querySelector('.cavity-window')?.append(tab);
    } else if (!charted && tab) tab.remove();
  }
}

// --- The press: it earns its rows through the observatory; the inks row is the page's selector ---
const press = new Press({
  root: $('.press'),
  economy,
  reduced: () => motion.reduced,
  onChange: () => renderEconomy(),
  setReveal: (value) => {
    for (const fn of hooks.reveal) fn(value);
  },
  onSelect: (row: ResearchRow, value: string) => {
    if (row === 'inks') displayRegistry.setMode(value as DisplayMode);
    if (row === 'memory') {
      fleet.memory = Number(value);
      for (const fn of hooks.memory) fn(fleet.memory);
    }
    if (row === 'symmetry') {
      fold = Number(value);
      for (const fn of hooks.symmetry) fn(fold);
    }
  },
});
displayRegistry.onChange((mode) => {
  const radio = document.querySelector<HTMLInputElement>(`.press input[name="inks"][value="${mode}"]`);
  if (radio) radio.checked = true;
});

// The economy's own clock: 10 Hz, independent of the views and of the engine. Coming back from a
// hidden tab, it catches up with the elapsed time (the economy clamps it to 5 minutes).
let last = performance.now();
let whirrTick = 0;
window.setInterval(() => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  economy.tick(dt);
  renderEconomy();
  if (!fleet.busy) hangar.update(fleet);
  // The whirr of the unwinding spring, in 0.3 s grains.
  if (economy.state.mode === 'running' && whirrTick++ % 3 === 0) unwindWhirr(0.6 + 0.4 * economy.wind);
}, TICK * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const now = performance.now();
    economy.tick((now - last) / 1000);
    last = now;
    renderEconomy();
  }
});

// --- Queue: the Queue buttons on the side panel ---
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-queue]')) {
  button.addEventListener('click', () => {
    economy.queueBuild(button.dataset.queue as BuildingId);
    renderEconomy();
  });
}

// --- Reset universe and Skip the grind: the same effect from the side panel and from the instruction sheet ---
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reset]')) {
  button.addEventListener('click', () => {
    economy.reset();
    fleet.reset(!motion.reduced);
    rosette.clear();
    winder.reset();
    desk.clearSpike();
    for (const fn of hooks.reset) fn();
    // The press returns to its default positions.
    for (const [name, value] of [['inks', '16'], ['memory', '48'], ['symmetry', '5']] as const) {
      const radio = document.querySelector<HTMLInputElement>(`.press input[name="${name}"][value="${value}"]`)!;
      if (!radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    }
    syncCapacity();
    renderCharted();
    renderEconomy();
    hangar.update(fleet);
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-skip-grind]')) {
  button.addEventListener('click', () => {
    economy.skipGrind();
    syncCapacity();
    renderEconomy();
  });
}

// --- Spark wheel ---
new SparkWheel({
  button: $<HTMLButtonElement>('[data-spark-wheel]'),
  spray: $<HTMLCanvasElement>('.spark-spray'),
  reduced: () => motion.reduced,
  earn: (spark) => {
    economy.addSpark(spark);
    renderEconomy();
  },
});

// --- The print proof: composed when the section comes into view and on "Reprint" ---
const proofSection = $('#proof');
let proofReady: Promise<import('./ui/proof').Proof> | null = null;
function loadProof() {
  proofReady ??= import('./ui/proof').then(
    ({ Proof }) =>
      new Proof({
        canvas: $<HTMLCanvasElement>('#proof-canvas'),
        fleet,
        rosette,
        turnsWound: () => Math.floor(winder.totalDetents / 8),
        fold: () => fold,
        mode: () => displayRegistry.mode,
        status: $('#proof-status'),
      }),
  );
  return proofReady;
}
new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting)) void loadProof().then((proof) => proof.print());
  },
  { rootMargin: '0px 0px 200px 0px' },
).observe(proofSection.querySelector('.proof-print')!);
$('[data-proof-reprint]').addEventListener('click', () => void loadProof().then((proof) => proof.print()));
$('[data-proof-save]').addEventListener('click', () => void loadProof().then((proof) => proof.save()));

syncCapacity();
renderEconomy();
hangar.update(fleet);

// --- Lifting the lid: the only scroll-linked motion (a single progress value) ---
const lid = $('#lid');
const lidListeners: ((progress: number) => void)[] = [];
function applyLift(progress: number): void {
  const p = motion.reduced ? 0 : progress;
  const lift = p * 0.6 * window.innerHeight * 0.35;
  lid.style.translate = p ? `0 ${(-lift).toFixed(1)}px` : '';
  // On the body (not on :root, which the RetroDisplay observes): the lid and the tray edge read it.
  document.body.style.setProperty('--lift', p.toFixed(4));
  for (const fn of lidListeners) fn(p);
}
ScrollTrigger.create({
  trigger: lid,
  start: 'top top',
  end: () => `+=${Math.round(window.innerHeight * 0.6)}`,
  onUpdate: (self) => applyLift(self.progress),
  onRefresh: (self) => applyLift(self.progress),
});
motion.onChange(() => applyLift(0));

// --- The lid: 3D with WebGL2 (the three chunk is only requested here), printed in 2D without it ---
const shared: SharedContext = {
  fleet,
  economy,
  log,
  hangar,
  phone,
  winder,
  rosette,
  fold: () => fold,
  onEconomy: (fn: () => void) => hooks.economy.push(fn),
  onReset: (fn: () => void) => hooks.reset.push(fn),
  onMemory: (fn: (moments: number) => void) => hooks.memory.push(fn),
  onSymmetry: (fn: (fold: number) => void) => hooks.symmetry.push(fn),
  onReveal: (fn: (value: number) => void) => hooks.reveal.push(fn),
  onLift: (fn: (progress: number) => void) => lidListeners.push(fn),
};

if (hasWebGL2()) {
  void import('./scene/boot').then(({ bootScene }) => bootScene(shared));
} else {
  root.dataset.webgl2 = 'false';
  $('.no-webgl').hidden = false;
  void import('./fallback2d').then(({ bootFallback }) => bootFallback(shared));
}
