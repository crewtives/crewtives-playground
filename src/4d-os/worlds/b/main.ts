import './tokens.css';
import './style.css';
import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import { Engine } from '../../../engine/engine/Engine';
import { bootPack, defaultErrorText } from '../../../engine/shell/boot';
import { bindChaseCam, subjectTrack, type ViewFrame } from '../../../engine/shell/chaseCam';
import { closeUp } from '../../../engine/shell/closeUp';
import { installDevRafShim } from '../../../engine/shell/devRafShim';
import { prefersReducedMotion } from '../../../engine/display/cssColor';
import { bindDesktop } from '../../../engine/shell/desktop';
import { sidePreset } from '../../../engine/shell/sidePreset';
import { setupSmoothScroll } from '../../../engine/shell/smoothScroll';
import { paintSourceFrame } from '../../../engine/shell/sourceFrames';
import { bindZoomHero, type HeroPhaseId } from '../../../engine/shell/zoomHero';
import { TimeController } from '../../../engine/time/TimeController';
import { TimeViewer, aspectOf } from '../../../engine/viewer/TimeViewer';
import { LifeStackView } from '../../../engine/views/lifeStack';
import { bindDock } from '../../../engine/window/dock';
import { bindWindows } from '../../../engine/window/windows';
import { TesseractView } from '../../../engine/views/tesseract';
import { addAurora } from './aurora';
import { bindExposureDial, bindGraticule, bindSequenceSheet } from './plate';

const PACK_URL = `${import.meta.env.BASE_URL}packs/cat-stairs/`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector} in the markup of world B`);
  return node;
};

async function main(): Promise<void> {
  if (import.meta.env.DEV) installDevRafShim();
  const engine = new Engine();
  const display = new RetroDisplay({ tokenRoot: document.documentElement, pixelScale: 3 });
  display.onChange(() => engine.invalidate());
  // The source frames are toned to sage silver except in Millions (see style.css).
  const markDepth = () => (document.documentElement.dataset.depth = display.mode);
  markDepth();
  display.onChange(markDepth);

  // Windows stacked below the hero on desktop terms: mobile in portrait and phone in landscape. There
  // the windows gather in the window dock at the bottom of the pinned first screen (spec desktop-shell
  // "Narrow viewport"). It is bound before the pack loads, so no undocked window ever shows over the
  // plate; the framing follows the open window once the plate exists.
  const stacked = window.matchMedia('(max-width: 760px), (orientation: landscape) and (max-height: 500px)');
  let docked: HTMLElement | null = null;
  let followDock = () => {};
  bindDock({
    query: stacked.media,
    windows: ['sequence', 'exposures', 'layers', 'display', 'source', 'clock'],
    initial: null,
    mount: (bar) => $('.desk__layer').prepend(bar),
    onChange: (open) => {
      docked = open;
      followDock();
    },
  });

  bindGraticule($('.desk__graticule'), 64, () => stacked.matches);
  setupSmoothScroll();

  // Views that do not depend on the pack: they start right away, with the shared display.
  engine.add(
    new LifeStackView($('[data-view="life"]'), {
      display,
      backgroundToken: '--plate',
      oldToken: '--pal-16-5',
      newToken: '--pal-16-12',
      presentToken: '--accent-forward',
    }),
  );
  engine.add(new TesseractView($('[data-view="tesseract"]'), { colorToken: '--paper', size: 0.9 }));

  const pack = await bootPack({
    url: PACK_URL,
    boot: $('[data-boot]'),
    display,
    engine,
    errorText: (error) => `The plate did not develop. ${defaultErrorText(error)}`,
  });

  // B starts with the whole journey exposed: "all at once" mode.
  const time = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'all' });
  engine.addTicker((dt) => time.update(dt));
  time.subscribe(() => engine.invalidate());

  // The plate: the subject seen in third person, from behind and at a diagonal, with the source camera's
  // light on over the alley and an aurora sky behind. It can be dragged through 360°.
  const plateElement = $('[data-view="scene"]');
  const plate = new TimeViewer({
    engine,
    element: plateElement,
    pack,
    time,
    display,
    // One exposure per second: from behind, with more, the exposures merge into a blur.
    trailStride: 30,
    // The source frustum sits behind the cat, like this camera: its image plane would block the view.
    // Its light stays on; the frustum can be shown from Layers.
    layers: { trajectory: false, frustum: false },
  });
  // Up close, the background is a solid mosaic, not confetti.
  plate.setMaxPointSize(6);
  // On desktop the column of cards takes the right side and the sequence sheet the bottom: the subject
  // is centered in the free glass by shifting the projection window (without moving camera or pivot).
  // `portrait` is the vertical view, where the walk crosses the screen.
  const portrait = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
  // A docked window open over the lower plate leaves the glass between the caption and its top: the
  // plate is framed there, smaller, instead of being covered. The band is read from live rects.
  const freeBand = (): { top: number; bottom: number } | null => {
    if (!docked || !stacked.matches) return null;
    const box = plateElement.getBoundingClientRect();
    const win = docked.getBoundingClientRect();
    if (box.height <= 0 || win.left >= box.right - 1 || win.right <= box.left + 1 || win.top >= box.bottom - 1) return null;
    const top = 8 / box.height;
    // Never under the chase camera's smallest frame (a fifth of the view).
    const bottom = Math.max(top + 0.21, (win.top - 8 - box.top) / box.height);
    return bottom >= 0.98 ? null : { top, bottom };
  };
  const framePlate = () => {
    const band = freeBand();
    if (band) {
      // The whole view scaled into the band (at least to half its size), centered on it.
      const k = Math.min(1, Math.max(0.5, band.bottom - band.top));
      const middle = (band.top + band.bottom) / 2;
      plate.camera.setViewOffset(1, 1, -(1 - k) / (2 * k), -(middle - k / 2) / k, 1 / k, 1 / k);
      // The band, as fractions of the plate's height, for the phone check.
      plateElement.dataset.band = `${band.top.toFixed(4)} ${band.bottom.toFixed(4)}`;
    } else {
      if (stacked.matches) plate.camera.clearViewOffset();
      else plate.camera.setViewOffset(1, 1, 0.085, -0.035, 1, 1);
      delete plateElement.dataset.band;
    }
    engine.invalidate(plate);
  };
  framePlate();
  stacked.addEventListener('change', framePlate);
  plate.setBackgroundLevel(0.9);
  plate.setTrailLook({ tint: 0.78 });
  // Sitting at the top, the cat repeats its points in the same place: the present wins over its trail.
  plate.setPresentLook({ bias: 0.04 });
  plate.setOrbit({ enabled: true, auto: false });
  // The orbit can go down far enough to see the subject from the ground.
  plate.controls.maxPolarAngle = (104 * Math.PI) / 180;
  // Dollhouse cutaway that follows the subject (the chase camera moves it), and a fade near the
  // lens: past exposures and background right against the camera do not block it.
  plate.setCutaway(true);
  // The camera rests at 3.4 m: past exposures closer than the cat fade out before they cover it.
  plate.setNearFade('trail', [2.2, 3.0]);
  plate.setNearFade('background', [0.4, 0.9]);
  // Clean spotlight: few points remain outside the frustum, so the aurora sky shows between them.
  plate.setFrustumLightLook({ density: 0.03, amount: 0.6 });
  addAurora(plate, time, document.documentElement);
  engine.add(plate);

  // Three-quarters from behind, on the open side of the alley (the stairway runs along the right wall):
  // the trail runs diagonally across the screen instead of coming toward the camera. As it pulls back,
  // the camera opens onto the full plate from the side; on desktop it fits in the free glass between
  // the caption, the column of cards and the sheet. On phones the view is small: it rests closer.
  const restDistance = () => (stacked.matches ? 2.6 : 3.4);
  // The free glass is measured from the layout (drags live in `translate` and do not count): left of
  // the column and above the sheet. Below 1200 px the dialog goes under the caption (style.css) and its
  // band is kept even when it is closed, so closing it does not change the framing.
  const rail = $('.desk__rail');
  const sheet = $('.sheet');
  const wideDesk = window.matchMedia('(min-width: 1200px)');
  const dock = () => document.querySelector<HTMLElement>('.dock');
  const plateFrame = (): ViewFrame => {
    if (stacked.matches) {
      const band = freeBand();
      if (band) return { left: 0.03, top: band.top, right: 0.97, bottom: band.bottom };
      // The dock lies over the bottom of the plate in portrait: the full plate stays above it.
      const bar = dock()?.getBoundingClientRect();
      const box = plateElement.getBoundingClientRect();
      const overlap = bar && bar.left < box.right - 1 && bar.top < box.bottom && box.height > 0;
      return { left: 0.03, top: 0.04, right: 0.97, bottom: overlap ? Math.min(0.9, (bar.top - 8 - box.top) / box.height) : 0.9 };
    }
    const width = Math.max(1, plateElement.clientWidth);
    const height = Math.max(1, plateElement.clientHeight);
    return {
      left: wideDesk.matches ? 0.03 : (32 + 216 + 16) / width,
      top: 0.2,
      right: (rail.offsetLeft - 16) / width,
      bottom: (sheet.offsetTop - 12) / height,
    };
  };

  const chase = bindChaseCam({
    engine,
    viewer: plate,
    time,
    track: subjectTrack(pack),
    chase: {
      distance: restDistance(),
      near: 1.4,
      elevation: 17,
      side: -68,
      // In the vertical mobile view the walk crosses the screen: looking far ahead drops the cat out of frame.
      lookAhead: () => (portrait.matches ? 0.12 : 0.5),
      // Full plate: on desktop, from the side and slightly from the front (the staircase of cats crosses the
      // glass); in the vertical mobile view, diagonally from behind, so the climb goes up the screen.
      elevationFar: () => (portrait.matches ? 40 : 26),
      sideFar: () => (portrait.matches ? -45 : -100),
      frame: plateFrame,
    },
  });

  // The loop's seam and the jump to the final segment are hidden by the display's threshold dissolve
  // (14 steps in ~0.45 s), and the camera reappears already in place, without a sweep.
  let stopDissolve: (() => void) | null = null;
  const dissolve = (run: () => void) => {
    stopDissolve?.();
    plate.reveal = 0;
    run();
    chase.reset();
    let elapsed = 0;
    const off = engine.addTicker((dt) => {
      elapsed += dt;
      const t = Math.min(1, elapsed / 0.45);
      plate.reveal = Math.ceil(t * 14) / 14;
      if (t < 1) return true;
      stop();
      return false;
    });
    const stop = () => {
      off();
      if (stopDissolve === stop) stopDissolve = null;
    };
    stopDissolve = stop;
  };

  // Hero with a gesture: at the top the loop runs; scrolling pulls the camera back to the full plate, then
  // takes the climb to its last frame, and only then does the page continue (spec hero-gesture).
  const hint = $('[data-hero-hint]');
  const HINTS: Record<HeroPhaseId, string> = {
    loop: 'Scroll to open the plate',
    final: 'Scroll to the last exposure',
    rest: 'Scroll on to the plates',
    after: 'Scroll on to the plates',
  };
  const hero = bindZoomHero({
    hero: $('[data-hero]'),
    surface: plate,
    time,
    engine,
    z0: chase.zoomFor(restDistance()),
    zoomSpan: () => chase.logSpan,
    onZoom: (z) => chase.setZoom(z),
    onDissolve: dissolve,
    onPhase: (phase) => (hint.textContent = HINTS[phase]),
  });
  // The full-plate framing changes with the view's size and with the docked window: the rest position
  // stays at 3.4 m (2.6 m on mobile).
  const refit = () => hero.setZ0(chase.zoomFor(restDistance()));
  new ResizeObserver(refit).observe(plateElement);
  // The open card's height can change (its clock line, a resize): the band follows it.
  const dockedSize = new ResizeObserver(() => followDock());
  let observed: HTMLElement | null = null;
  followDock = () => {
    if (observed !== docked) {
      if (observed) dockedSize.unobserve(observed);
      observed = docked;
      if (docked) dockedSize.observe(docked);
    }
    framePlate();
    refit();
    engine.requestFrame();
  };
  // A window opened from the dock while the pack was loading.
  if (docked) followDock();
  // Development only: checking the gesture from Playwright.
  if (import.meta.env.DEV) Object.assign(window, { __b: { engine, plate, chase, hero, time } });

  // HOLD inverts the plate for an instant: the exposure's negative (an idea borrowed from Ikeda).
  // Only a HOLD the visitor asked for, with the desktop in view: never the hero gesture's one
  // (`data-hold-origin`, which the hero sets before notifying; that is why this subscribes afterwards).
  const stage = $('.desk__stage');
  time.subscribe((state, previous) => {
    if (prefersReducedMotion() || stacked.matches || document.documentElement.dataset.holdOrigin === 'gesture') return;
    if (state.direction !== 0 || previous.direction === 0 || stage.getBoundingClientRect().bottom <= 0) return;
    document.documentElement.classList.add('is-inverting');
    window.setTimeout(() => document.documentElement.classList.remove('is-inverting'), 90);
  });

  bindWindows();
  bindDesktop({ time, display, pack, viewer: plate });
  bindSequenceSheet($('[data-sheet]'), time, pack);
  bindExposureDial($('[data-exposures]'), pack.meta.fps, (stride) => plate.setTrailStride(stride), 30, pack.meta.frameCount);

  // Sheet II: the video (source frame), a single frame in 3D and the full plate.
  // A readable step halfway up the climb (at the exact middle the cat slows down for its pause).
  const middle = Math.floor(pack.meta.frameCount * 0.46);
  paintSourceFrame($('[data-pipeline="video"]'), pack.url, pack.meta, middle);

  // A single frame, held at the same instant as the video's sheet, and up close, with the camera that saw it.
  const still = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'memory' });
  still.seek(middle);
  const frameView = new TimeViewer({
    engine,
    element: $('[data-pipeline="frame"]'),
    pack,
    time: still,
    display,
    layers: { trail: false, trajectory: false },
    frustumLight: false,
  });
  frameView.setCameraPreset(closeUp(pack, middle, 4.4, 30, 0.35));
  frameView.setBackgroundLevel(0.8);
  frameView.setCutaway(true);
  frameView.setOrbit({ enabled: false, auto: false });
  engine.add(frameView);

  const plateView = new TimeViewer({
    engine,
    element: $('[data-pipeline="plate"]'),
    pack,
    time,
    display,
    trailStride: 15,
    layers: { frustum: false },
    frustumLight: false,
  });
  plateView.setCameraPreset(sidePreset(plateView.gpu.subjectBounds, pack.meta.cameras, 16 / 9, 18, 0.86));
  plateView.setBackgroundLevel(0.1);
  plateView.setTrailLook({ tint: 0.78 });
  plateView.setOrbit({ enabled: false, auto: false });
  plateView.setCutaway(true);
  addAurora(plateView, time, document.documentElement);
  engine.add(plateView);

  // Sheet III: the same climb from the side, like a Marey plate. It has its own clock (the hero's
  // is driven by the loop and the final segment) and only runs while the sheet is in view. At 30 fps, 30 frames
  // are one second: the cat walks up about two steps between one exposure and the next, and each reads on its own.
  const sideElement = $('[data-view="side"]');
  const sideClock = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'all' });
  engine.addTicker((dt) => sideClock.update(dt));
  const sideView = new TimeViewer({
    engine,
    element: sideElement,
    pack,
    time: sideClock,
    display,
    trailStride: 30,
    layers: { frustum: false, trajectory: false },
    frustumLight: false,
  });
  sideView.setCameraPreset(sidePreset(sideView.gpu.subjectBounds, pack.meta.cameras, aspectOf(sideElement), 18, 0.86));
  sideView.setBackgroundLevel(0.35);
  sideView.setTrailLook({ tint: 0.78 });
  sideView.setPresentLook({ bias: 0.04 });
  sideView.setCutaway(true);
  sideView.setOrbit({ enabled: false, auto: false });
  addAurora(sideView, sideClock, document.documentElement);
  engine.add(sideView);
  if (!prefersReducedMotion()) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? sideClock.play(1) : sideClock.hold())).observe(sideElement);
  }
}

main().catch((error) => console.error('[4D.OS · B]', error));
