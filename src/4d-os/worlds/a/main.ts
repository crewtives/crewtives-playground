import './tokens.css';
import './style.css';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import { Engine } from '../../../engine/engine/Engine';
import { bootPack, defaultErrorText } from '../../../engine/shell/boot';
import { closeUp } from '../../../engine/shell/closeUp';
import { cssNumber, prefersReducedMotion } from '../../../engine/display/cssColor';
import { bindDesktop } from '../../../engine/shell/desktop';
import { installDevRafShim } from '../../../engine/shell/devRafShim';
import { bindScrollTime } from '../../../engine/shell/scrollTime';
import { setupSmoothScroll } from '../../../engine/shell/smoothScroll';
import { paintSourceFrame } from '../../../engine/shell/sourceFrames';
import { TimeController } from '../../../engine/time/TimeController';
import { TimeViewer } from '../../../engine/viewer/TimeViewer';
import { LifeStackView } from '../../../engine/views/lifeStack';
import { TesseractView } from '../../../engine/views/tesseract';
import { bindDock } from '../../../engine/window/dock';
import { bindWindows } from '../../../engine/window/windows';
import { bindPlan } from './plan';

/**
 * Narrow screens: phones in portrait, and phones in landscape, too short for the floating desktop. The
 * windows stop floating and gather in the window dock under the rail (spec desktop-shell "Narrow
 * viewport"); the same string gates the desk rules of style.css.
 */
const NARROW = '(max-width: 760px), (orientation: landscape) and (max-height: 500px)';

const PACK_URL = new URLSearchParams(location.search).get('pack') ?? `${import.meta.env.BASE_URL}packs/cat-stairs/`;
const integer = new Intl.NumberFormat('en-US');

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector} in the markup of world A`);
  return node;
};

/** Display-case framing: almost at eye level and from the side, with the subject filling the glass. */
const EYE_LEVEL = { elevation: 17, azimuth: 58, fill: 0.84 };
/** The trail keeps the subject's color (barely tinted): it reads as a row of cats. */
const TRAIL_LOOK = { tint: 0.18, max: 0.75 };
/** Framing of the whole journey (Rooms 6 and 7): from the side, the path reads from left to right. */
const JOURNEY = { elevation: 18, azimuth: 60, fill: 0.9 };

async function main(): Promise<void> {
  if (import.meta.env.DEV) installDevRafShim();
  const html = document.documentElement;
  const reduced = prefersReducedMotion();
  const engine = new Engine();
  const display = new RetroDisplay({ tokenRoot: html, pixelScale: cssNumber(html, '--render-scale', 3) });
  display.onChange(() => engine.invalidate());

  let life: LifeStackView;
  bindWindows();
  bindShades();
  // On desktop, Layers and Display start folded against the edge: the display case comes first. On
  // narrow screens the dock replaces folding: a drawer folded on the desktop unfolds on entering them.
  const narrow = matchMedia(NARROW);
  const shades = () => document.querySelectorAll<HTMLButtonElement>('.drawers .win__shade');
  if (!narrow.matches) for (const button of shades()) button.click();
  narrow.addEventListener('change', () => {
    if (narrow.matches) for (const button of shades()) if (button.getAttribute('aria-expanded') === 'false') button.click();
  });
  bindDock({
    query: NARROW,
    windows: ['layers', 'display', 'source', 'plan', 'clock'],
    initial: 'layers',
    mount: (bar) => $('.rail').after(bar),
  });
  setupSmoothScroll();

  // Views that do not depend on the pack.
  engine.add(
    // Colors from the display palette: the red wall is not in it and would be quantized to bark.
    (life = new LifeStackView($('[data-view="life"]'), {
      display,
      backgroundToken: '--scene-bg',
      oldToken: '--pal-16-8',
      newToken: '--pal-16-12',
      presentToken: '--accent-forward',
    })),
  );
  const mark = new TesseractView($('[data-view="tesseract"]'), { colorToken: '--paper', distance: 11 });
  engine.add(mark);

  const pack = await bootPack({
    url: PACK_URL,
    boot: $('[data-boot]'),
    display,
    engine,
    errorText: (error) => `The exhibit could not be hung. ${defaultErrorText(error)}`,
  });

  for (const node of document.querySelectorAll<HTMLElement>('[data-synthetic]')) node.hidden = !pack.meta.synthetic;

  const time = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'memory' });
  engine.addTicker((dt) => time.update(dt));
  const STRIDE = Math.max(1, Math.round(pack.meta.fps));

  // Room 4: the display case.
  const glass = $('[data-view="scene"]');
  // One exposure per second: the cat walks up about two steps between one and the next, so each
  // cat in the trail reads on its own (with more, they merge into a band).
  const scene = new TimeViewer({ engine, element: glass, pack, time, display, trailStride: STRIDE });
  scene.setCameraPreset(scene.defaultPreset(16 / 9, 30, EYE_LEVEL));
  scene.setTrailLook(TRAIL_LOOK);
  scene.setCutaway(true);
  engine.add(scene);
  bindDesktop({ time, display, pack, viewer: scene });
  bindPlan($<HTMLCanvasElement>('[data-plan]'), pack, time);

  // Signature: while the rail is being dragged, the display case is lit only by the camera's light.
  const track = $('[data-track]');
  const observer = new MutationObserver(() => scene.setBackgroundLevel(track.classList.contains('is-scrubbing') ? 0.55 : 1));
  observer.observe(track, { attributes: true, attributeFilter: ['class'] });

  // Room 6: from video to space-time. Still figures at the middle of the clip.
  const middle = Math.floor(pack.meta.frameCount * 0.55);
  paintSourceFrame($('[data-pipeline="video"]'), pack.url, pack.meta, middle);
  const still = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'memory' });
  still.seek(middle);
  const everything = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'all' });
  everything.seek(middle);
  const frameView = new TimeViewer({
    engine,
    element: $('[data-pipeline="frame"]'),
    pack,
    time: still,
    display,
    layers: { trail: false, trajectory: false },
  });
  const allView = new TimeViewer({
    engine,
    element: $('[data-pipeline="all"]'),
    pack,
    time: everything,
    display,
    trailStride: STRIDE,
    layers: { frustum: false },
    frustumLight: false,
  });
  // One frame is a small subject in a large scene: that figure is framed up close.
  frameView.setCameraPreset(closeUp(pack, middle, 3.2, 30));
  allView.setCameraPreset(allView.defaultPreset(16 / 9, 30, JOURNEY));
  for (const view of [frameView, allView]) {
    view.setTrailLook(TRAIL_LOOK);
    view.setCutaway(true);
    view.setOrbit({ enabled: false, auto: false });
    engine.add(view);
  }

  // Room 7: scroll is time.
  const scrollGlass = $('[data-view="scroll"]');
  const scrollView = new TimeViewer({ engine, element: scrollGlass, pack, time, display, trailStride: STRIDE });
  // On mobile this room's display case is vertical (3:4): the framing is recomputed with its aspect.
  const portrait = matchMedia('(max-width: 760px)');
  const frameScroll = () =>
    scrollView.setCameraPreset(
      scrollView.defaultPreset(portrait.matches ? 3 / 4 : 16 / 9, portrait.matches ? 40 : 30, JOURNEY),
    );
  frameScroll();
  portrait.addEventListener('change', frameScroll);
  scrollView.setTrailLook(TRAIL_LOOK);
  scrollView.setCutaway(true);
  scrollView.setOrbit({ enabled: false, auto: false });
  engine.add(scrollView);
  bindScrollTime($('[data-scroll-time]'), time, { wake: () => engine.requestFrame() });

  // The rooms' display cases light up as they enter the screen, with the display's dissolve.
  for (const view of [frameView, allView, scrollView]) revealOnEnter(view, engine, reduced);

  fillMeasurements(pack);
  bindScenes();
  ScrollTrigger.refresh();

  if (!reduced) time.play(1);

  Object.assign(window, { __4d: { ready: true, engine, time, display, pack, scene, views: { frameView, allView, scrollView, life: life!, mark } } });
}

/** Shade of the foldable windows (Layers, Display). */
function bindShades(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.win__shade')) {
    const body = document.getElementById(button.getAttribute('aria-controls') ?? '');
    const name = button.closest('.win')?.querySelector('.win__title span')?.textContent ?? 'window';
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', `${open ? 'Fold' : 'Unfold'} the ${name} window`);
      if (body) body.hidden = !open;
    });
  }
}

/** Threshold dissolve on entering the screen (instant with reduced motion). */
function revealOnEnter(view: TimeViewer, engine: Engine, reduced: boolean): void {
  if (reduced) return;
  view.reveal = 0;
  ScrollTrigger.create({
    trigger: view.element,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      let elapsed = 0;
      const steps = 12;
      // The ticker is removed when done: if it stayed, every tick would assign `reveal` again (which
      // invalidates the view) and the engine would never sleep, not even in HOLD.
      const off = engine.addTicker((dt) => {
        elapsed += dt;
        const t = Math.min(1, elapsed / 0.9);
        view.reveal = Math.ceil(t * steps) / steps;
        if (t >= 1) queueMicrotask(off);
        return t < 1;
      });
    },
  });
}

/** Room 8: figures derived from the pack that `fillStats` does not cover. */
function fillMeasurements(pack: Awaited<ReturnType<typeof bootPack>>): void {
  const { meta } = pack;
  const perFrame = Math.round(meta.counts.dynamic / meta.frameCount);
  for (const node of document.querySelectorAll<HTMLElement>('[data-stat-per-frame]')) node.textContent = integer.format(perFrame);
  for (const node of document.querySelectorAll<HTMLElement>('[data-stat-total]')) {
    node.textContent = `${integer.format(meta.counts.dynamic + meta.counts.static)} points`;
  }
  for (const node of document.querySelectorAll<HTMLElement>('[data-stat-source]')) {
    const pages = meta.source.pages.length;
    node.textContent = `${integer.format(meta.frameCount)} of ${meta.source.width} × ${meta.source.height} px, on ${pages} atlas page${pages === 1 ? '' : 's'}`;
  }
}

/** Room 9: only the scene on view can be chosen; the others do not exist yet. */
function bindScenes(): void {
  const status = document.querySelector<HTMLElement>('[data-scenes-status]');
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
    button.addEventListener('click', () => {
      if (!status) return;
      if (button.getAttribute('aria-disabled') === 'true') {
        status.textContent = 'Not available yet: no real capture has been made. Only the synthetic cat is on view.';
      } else {
        status.textContent = 'Cat, climbing is already on view in Room 4.';
      }
    });
  }
}

main().catch((error) => console.error('[4D.OS · A]', error));
