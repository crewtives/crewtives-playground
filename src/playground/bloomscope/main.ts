import { setupSmoothScroll } from '../../engine/shell/smoothScroll';
import { displayRegistry } from '../shared/displays';
import { motion } from '../shared/motion';
import { hasWebGL2 } from '../shared/probe';
import { encodeGarden, gardenFromHash, DEFAULT_SOW, type Garden } from './garden';
import { ScopeController } from './scope/controller';
import type { MirrorMode } from './scope/fold';
import { DEFAULT_GARDEN } from './specimens/spec';
import { bindChamberGem, bindPixels, bindScrollTrack, bindSound } from './ui';
import { VogelPrint } from './vogel';
import { bindIris, bindLabStipple } from './wheels';
import { bindPutButtons, onFirstView, putInScope, type Toy } from './bench/common';
import { noteLog } from './sfx';
import { SowController } from './sow/controller';
import { MAX_SEEDS } from './sow/sow';
import { LatheController } from './lathe/controller';
import { MAX_LEAVES } from './lathe/rosette';
import { HiveController } from './hive/controller';
import { combPatch, HIVE_LAYERS, HIVE_SEED, HIVE_SIZE } from './hive/hexLife';
import { bindBenchStage, chamberAnnouncement } from './stage';

// Bloomscope startup: the static HTML already carries the fields, the text and the index. This
// wires up the controls, the Scope (with its physics) and, when WebGL2 exists, the 3D chunk that paints it.

const $ = <T extends Element>(selector: string, root: ParentNode = document) => {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Bloomscope: missing ${selector}`);
  return el;
};

setupSmoothScroll({ resetToTop: false });
document.documentElement.dataset.reducedMotion = String(motion.reduced);
motion.onChange((reduced) => (document.documentElement.dataset.reducedMotion = String(reduced)));

const hero = $<HTMLElement>('#scope');
const coarse = window.matchMedia('(pointer: coarse) and (max-width: 800px)').matches;

bindSound($<HTMLButtonElement>('.sound-toggle'));
bindPixels(document);
bindScrollTrack(Array.from(document.querySelectorAll<HTMLElement>('main > section, .footer')));
const setGemCount = bindChamberGem($<HTMLAnchorElement>('.chamber-gem'), hero);
bindIris(Array.from(document.querySelectorAll<HTMLAnchorElement>('.wheel-link')));
bindLabStipple(Array.from(document.querySelectorAll<HTMLCanvasElement>('.lab .stipple')), $<HTMLElement>('#worlds'));

const controller = new ScopeController(
  {
    hero,
    ringHit: $<HTMLElement>('.ring-hit'),
    eyepiece: $<HTMLElement>('.eyepiece'),
    knurl: $<SVGElement>('.knurl'),
    readout: $<HTMLElement>('.readout-text'),
    insetLines: $<SVGSVGElement>('.inset-lines'),
    live: $<HTMLElement>('.scope-live'),
    mirrors: Array.from(document.querySelectorAll<HTMLInputElement>('input[name="mirror"]')),
    everyTurn: $<HTMLButtonElement>('.every-turn'),
    shake: $<HTMLButtonElement>('.shake'),
    exposures: $<HTMLButtonElement>('.exposures'),
    tray: $<HTMLOListElement>('.tray-chips'),
    trayEmpty: $<HTMLElement>('.tray-empty'),
  },
  coarse ? 10 : 18,
);

// Portrait phone: the ring leaves no free corner for "What the mirrors see" (it covered the rim),
// so the inset drops into the flow, below the pixels, with its label in view.
{
  const inset = $<HTMLElement>('.inset');
  const scopeBox = $<HTMLElement>('.scope');
  const pixels = $<HTMLElement>('.pixels', hero);
  const phone = window.matchMedia('(max-width: 699px) and (min-height: 521px)');
  const place = () => {
    if (phone.matches) {
      if (inset.previousElementSibling !== pixels) pixels.after(inset);
    } else if (inset.parentElement !== scopeBox) scopeBox.append(inset);
  };
  phone.addEventListener('change', place);
  place();
}

// Phone: the pinned stage (stage.ts). After a rotation that flips it, the engine (or the 2D fallback,
// which listens to resize) measures its views again.
let relayout = (): void => void window.dispatchEvent(new Event('resize'));
const setStageCount = bindBenchStage(() => relayout());

const vogel = new VogelPrint($<HTMLCanvasElement>('.vogel'), hero, $<HTMLElement>('.eyepiece'), '#b2db2a');
// The light on the knurl facets stays fixed on screen: the gradient turns against the barrel.
const knurlLights = Array.from(document.querySelectorAll<SVGElement>('.knurl-light'));
controller.onBarrel = (beta) => {
  vogel.setBarrel(beta);
  for (const light of knurlLights) light.setAttribute('gradientTransform', `rotate(${-beta} 388 388)`);
};
controller.model.onChange(() => {
  setGemCount(controller.model.count);
  setStageCount(controller.model.count);
});

// The garden from a link (#g=), or the factory one.
let sow = DEFAULT_SOW;
const garden = gardenFromHash(location.hash);
if (garden) {
  controller.setMode(garden.mode, false);
  controller.ring.set(garden.barrel);
  displayRegistry.setMode(garden.display);
  controller.model.reset(garden.specimens);
  sow = garden.sow;
} else {
  controller.model.reset(DEFAULT_GARDEN);
}
setGemCount(controller.model.count);
setStageCount(controller.model.count);

bindCopyLink(() => ({
  mode: controller.mode as MirrorMode,
  barrel: Math.round(((controller.ring.angle % 360) + 360) % 360),
  display: displayRegistry.mode,
  specimens: controller.model.specimens.map((s) => s.spec),
  // The current Sow angle (the control is created further down; the click comes later).
  sow: sowToy.alpha,
}));

// ---------------------------------------------------------------- the bench
const device = coarse ? 'phone' : 'desktop';
const sowSection = $<HTMLElement>('#sow');
const latheSection = $<HTMLElement>('#lathe');
const hiveSection = $<HTMLElement>('#hive');

const sowToy = new SowController(
  {
    section: sowSection,
    dial: $('.sow-dial', sowSection),
    view: $('.sow-view', sowSection),
    art: $('.dial-art', sowSection),
    knob: $('.dial-knob', sowSection),
    vernierTicks: $('.vernier-ticks', sowSection),
    outerGrip: $('.dial-grip--outer', sowSection),
    vernierGrip: $('.dial-grip--vernier', sowSection),
    input: $('.dial-input', sowSection),
    stamp: $('.golden-stamp', sowSection),
    tip: $('.seed-tip', sowSection),
    divergence: $('.sow-divergence', sowSection),
    seeds: $('.sow-seeds', sowSection),
    pattern: $('.sow-pattern', sowSection),
    named: Array.from(sowSection.querySelectorAll<HTMLButtonElement>('.named-state')),
    hold: $('.sow-hold', sowSection),
    sow100: $('.sow-100', sowSection),
    clear: $('.sow-clear', sowSection),
    scrub: $('.scrub-input', sowSection),
    scrubChip: $('.time-chip', sowSection),
    press: $('.sow-press', sowSection),
    herbarium: $('.herbarium-strip', sowSection),
    live: $('.sow-live', sowSection),
  },
  MAX_SEEDS[device],
  sow,
);

const latheToy = new LatheController(
  {
    section: latheSection,
    view: $('.lathe-view', latheSection),
    species: Array.from(latheSection.querySelectorAll<HTMLInputElement>('input[name="species"]')),
    leaves: $('.leaves-input', latheSection),
    leavesOut: $('.leaves-out', latheSection),
    plus1: $('.leaf-plus1', latheSection),
    plus8: $('.leaf-plus8', latheSection),
    minus1: $('.leaf-minus1', latheSection),
    plump: $('.plump-input', latheSection),
    blush: $('.blush-input', latheSection),
    stretch: $('.stretch-input', latheSection),
    stretchStops: Array.from(latheSection.querySelectorAll<HTMLButtonElement>('.stop')),
    drop: $('.lathe-drop', latheSection),
    live: $('.lathe-live', latheSection),
  },
  MAX_LEAVES[device],
);

const hiveToy = new HiveController(
  {
    section: hiveSection,
    view: $('.hive-view', hiveSection),
    run: $('.hive-run', hiveSection),
    step: $('.hive-step', hiveSection),
    rewind: $('.hive-rewind', hiveSection),
    clear: $('.hive-clear', hiveSection),
    random: $('.hive-random', hiveSection),
    generation: $('.hive-generation', hiveSection),
    live: $('.hive-live', hiveSection),
  },
  HIVE_SIZE[device],
  HIVE_LAYERS[device],
  HIVE_SEED[device],
);

// "Put in the Scope": each toy carries its result into the chamber. On a phone, while the section's
// peephole is on screen, the chip lands in it and the section's live region says the new count.
const gem = $<HTMLElement>('.chamber-gem');
const eyepiece = $<HTMLElement>('.eyepiece');
const peepholeOf = (section: HTMLElement, live: HTMLElement) => ({
  view: $('.peephole-view', section),
  landed: () => (live.textContent = chamberAnnouncement(controller.model.count)),
});
const sowPeephole = peepholeOf(sowSection, $('.sow-live', sowSection));
const lathePeephole = peepholeOf(latheSection, $('.lathe-live', latheSection));
const hivePeephole = peepholeOf(hiveSection, $('.hive-live', hiveSection));
bindPutButtons(Array.from(document.querySelectorAll<HTMLButtonElement>('.put-in')), controller.model);
$<HTMLButtonElement>('.sow-put').addEventListener('click', () => {
  if (sowToy.count < 1) return;
  putInScope({ kind: 'head', angle: sowToy.alpha, seeds: sowToy.count }, controller.model, $('.sow-view'), gem, eyepiece, sowPeephole);
});
$<HTMLButtonElement>('.lathe-put').addEventListener('click', () => {
  const p = latheToy.params;
  putInScope({ kind: 'rosette', species: p.species, leaves: p.leaves, plump: p.plump, blush: p.blush, stretch: latheToy.stretch }, controller.model, $('.lathe-view'), gem, eyepiece, lathePeephole);
});
$<HTMLButtonElement>('.hive-put').addEventListener('click', () => {
  const cells = combPatch(hiveToy.hive, hiveToy.cursor);
  putInScope({ kind: 'comb', rings: 3, seed: hiveToy.seed, cells }, controller.model, $('.hive-view'), gem, eyepiece, hivePeephole);
});

// The peepholes repeat the eyepiece's live description.
const peepholes = Array.from(document.querySelectorAll<HTMLElement>('.peephole-view'));
const mirrorLabel = () => {
  for (const view of peepholes) view.setAttribute('aria-label', `The Scope, live: ${eyepiece.getAttribute('aria-label') ?? ''}`);
};
new MutationObserver(mirrorLabel).observe(eyepiece, { attributes: true, attributeFilter: ['aria-label'] });
mirrorLabel();

// While the Scope leaves the screen, the barrel adds up to 240° (not under reduced motion).
{
  let applied = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight))) * 240;
  window.addEventListener(
    'scroll',
    () => {
      const want = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight))) * 240;
      const delta = want - applied;
      applied = want;
      if (motion.reduced || Math.abs(delta) < 0.01) return;
      controller.nudge(delta);
    },
    { passive: true },
  );
}

// The honeycomb's Run pauses while its frame is off screen.
new IntersectionObserver(([entry]) => hiveToy.setVisible(entry.isIntersecting)).observe($('.hive-view'));

const toys: Record<'sow' | 'lathe' | 'hive', Toy> = { sow: sowToy, lathe: latheToy, hive: hiveToy };
const sections = { sow: sowSection, lathe: latheSection, hive: hiveSection };
const views = { sow: $<HTMLElement>('.sow-view'), lathe: $<HTMLElement>('.lathe-view'), hive: $<HTMLElement>('.hive-view') };

if (hasWebGL2()) {
  const { mountScopeGl } = await import('./scope/gl');
  const gl = mountScopeGl(controller, hero, eyepiece, $<HTMLElement>('.inset-view'));
  relayout = () => gl.engine.invalidateLayout();
  if (garden) controller.load(false);
  else controller.load();
  for (const view of peepholes) gl.addPeephole(view, view.closest('section') ?? hero);
  // The launcher's tesseract also goes through a retro display: dithered like the rest of the page.
  const { mountLauncherGl } = await import('./index/tesseractView');
  mountLauncherGl(gl.engine, $<HTMLElement>('.tess-view'), $<HTMLElement>('#worlds'));
  const { mountBenchGl } = await import('./bench/gl');
  const bench = mountBenchGl(gl.engine, { sow: sowToy, lathe: latheToy, hive: hiveToy }, views);
  for (const key of ['sow', 'lathe', 'hive'] as const) onFirstView(sections[key], () => bench.bloom(key), views[key]);
  if (import.meta.env.DEV) Object.assign((window as unknown as { __bloomscope: object }).__bloomscope, { toys, noteLog });
} else {
  // Without WebGL2 the 3D chunk is never even requested: everything is drawn in flat 2D with the same physics.
  const line = $<HTMLElement>('.nogl');
  line.textContent = 'Your browser has no WebGL2, so the toys run in flat 2D.';
  line.hidden = false;
  const { mountFlat } = await import('./fallback2d');
  mountFlat(controller, { eyepiece, inset: $<HTMLElement>('.inset-view'), peepholes }, toys, views);
  controller.load(!garden);
  for (const key of ['sow', 'lathe', 'hive'] as const) onFirstView(sections[key], () => toys[key].bloom(), views[key]);
}

function bindCopyLink(current: () => Garden): void {
  const button = $<HTMLButtonElement>('.copy-garden');
  const status = $<HTMLElement>('.copy-status');
  button.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#g=${encodeGarden(current())}`;
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied. Anyone who opens it gets this exact garden.';
    } catch {
      status.textContent = "Couldn't copy. Here's the link:";
      const field = document.createElement('input');
      field.type = 'text';
      field.readOnly = true;
      field.value = url;
      field.setAttribute('aria-label', 'Link to this garden');
      status.append(field);
      field.focus();
      field.select();
    }
  });
}
