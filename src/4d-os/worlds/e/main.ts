import './tokens.css';
import './style.css';
import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import { Engine } from '../../../engine/engine/Engine';
import type { Pack } from '../../../engine/pack/loader';
import { bootPack, defaultErrorText } from '../../../engine/shell/boot';
import { bindChaseCam, subjectTrack, type ViewFrame } from '../../../engine/shell/chaseCam';
import { closeUp } from '../../../engine/shell/closeUp';
import { prefersReducedMotion } from '../../../engine/display/cssColor';
import { installDevRafShim } from '../../../engine/shell/devRafShim';
import { bindDesktop } from '../../../engine/shell/desktop';
import { formatBytes, packStats } from '../../../engine/shell/packStats';
import { setupSmoothScroll } from '../../../engine/shell/smoothScroll';
import { bindZoomHero, type HeroPhaseId } from '../../../engine/shell/zoomHero';
import { playbackLabel, timecode, TimeController } from '../../../engine/time/TimeController';
import { TimeViewer } from '../../../engine/viewer/TimeViewer';
import { TesseractView } from '../../../engine/views/tesseract';
import { WHALE_FALL, fallStateAtFrame, properTimeExact } from '../../../pipeline/scenes/whaleFall';
import { SPECTRUM_RANGE, TRACE_MAX_HZ, approachChart, bindChart, pensChart, spectrumChart, traceChart } from './charts';
import { addFallLayers } from './fallLayers';
import { ECHO_GAP, pathStride, profileAzimuth, profileSide } from './fallPath';
import { addLensSky, prepareLensTextures } from './lens';
import { bindReadouts } from './readouts';

const PACK_URL = `${import.meta.env.BASE_URL}packs/whale-fall/`;
/** The plate from above: one copy every 15 frames (0.5 s). */
const PLATE_STRIDE = 15;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector} in the markup of landing E`);
  return node;
};

const reduced = prefersReducedMotion();
/** Narrow screens and landscape phones: the console goes below the hero and the first-screen tools dock in the stage. */
const STACKED = '(max-width: 760px), (orientation: landscape) and (max-height: 500px)';

async function main(): Promise<void> {
  if (import.meta.env.DEV) installDevRafShim();
  const engine = new Engine();
  const display = new RetroDisplay({ tokenRoot: document.documentElement, pixelScale: 3 });
  display.onChange(() => engine.invalidate());
  const markDepth = () => (document.documentElement.dataset.depth = display.mode);
  markDepth();
  display.onChange(markDepth);
  setupSmoothScroll();

  // The footer's mark does not depend on the 4D pack.
  engine.add(new TesseractView($('[data-view="tesseract"]'), { colorToken: '--bone', size: 0.9 }));

  // On narrow screens the first-screen tools dock in the stage from the first paint, boot included.
  const stacked = window.matchMedia(STACKED);
  const deck = placeDeck(stacked, $('.obs__stage'));

  const booting = bootPack({
    url: PACK_URL,
    boot: $('[data-boot]'),
    display,
    engine,
    errorText: (error) => `The signal did not arrive. ${defaultErrorText(error)}`,
    // No view of E can show the frustum's image plane or use the source-camera light (all of them set
    // frustum and frustumLight off, and no control turns them on): the source frames are not requested.
    load: { source: false },
    onProgress: bootWeight(stacked, $('[data-boot] .boot__pct')),
  });
  // The lens textures are computed while the bytes arrive, not during the reveal.
  prepareLensTextures();
  const pack = await booting;

  const { frameCount, fps } = pack.meta;
  const last = frameCount - 1;

  // --- first screen -------------------------------------------------------------------------------------
  const time = new TimeController({ frameCount, fps, mode: 'all' });
  engine.addTicker((dt) => time.update(dt));
  time.subscribe(() => engine.invalidate());
  deck.attach(time);

  const viewElement = $('[data-view="scene"]');
  const view = new TimeViewer({
    engine,
    element: viewElement,
    pack,
    time,
    display,
    // The lens draws the surroundings live (the same stars and the same disk as the points, but bent by
    // gravity); the background points can be turned on from the monitor.
    layers: { background: false, frustum: false, trajectory: false },
    frustumLight: false,
  });
  // In the phone's portrait view the horizontal field is narrow: a wider fov lets the shadow show.
  const portrait = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
  const fitFov = () => {
    view.camera.fov = portrait.matches ? 60 : 46;
    view.camera.updateProjectionMatrix();
    engine.invalidate(view);
  };
  fitFov();
  portrait.addEventListener('change', fitFov);
  view.setOrbit({ enabled: true, auto: false });
  // The orbit goes below the disk: from below, the lens's other arc shows.
  view.controls.minPolarAngle = (6 * Math.PI) / 180;
  view.controls.maxPolarAngle = (150 * Math.PI) / 180;
  // The present keeps its color: the whale's redshift shows on the whale itself, not only in the trail.
  view.setPresentLook({ tint: 0.3 });
  // The most recent copies are sparser than the old ones: the whale of now dominates.
  view.setTrailLook({ tint: 0.12, min: 0.34, max: 0.2, tau: 60 });
  view.setMaxPointSize(4);
  // The copies between the camera and the whale fade out before they cover it.
  view.setNearFade('trail', [1.6, 2.6]);
  view.setNearFade('background', [1.2, 3]);
  addLensSky(view, time, { saturation: 3 });
  // The trail spaced by path length and the present on top of everything, with its outline.
  const fall = addFallLayers(engine, view, time, { stride: pathStride(fps, ECHO_GAP) });
  engine.add(view);

  const narrow = window.matchMedia('(max-width: 760px)');
  const landscapePhone = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
  const restDistance = () => (portrait.matches ? 4.2 : narrow.matches ? 3.3 : 3.6);
  const slate = $('.slate');
  const slateTitle = $('.slate__title');
  // On the desktop the full plate leaves the title's corner clear. With the stage deck, the plate fits the
  // free glass read from live rects, like D's: below the title and above the deck and its hint (in
  // landscape, right of the title and above the deck).
  const plateFrame = (): ViewFrame => {
    const dock = deck.dock();
    if (!dock) return narrow.matches ? { left: 0.03, top: 0.16, right: 0.97, bottom: 0.97 } : { left: 0.03, top: 0.2, right: 0.97, bottom: 0.97 };
    const box = viewElement.getBoundingClientRect();
    const width = Math.max(1, box.width);
    const height = Math.max(1, box.height);
    const hint = dock.querySelector('.hint')?.getBoundingClientRect();
    const dockTop = dock.getBoundingClientRect().top;
    const bottom = ((hint && hint.height > 0 ? Math.min(hint.top, dockTop) : dockTop) - box.top - 8) / height;
    // Landscape: the title alone (fit to its text; the slate's line is hidden there) takes the top left.
    if (landscapePhone.matches) return { left: (slateTitle.getBoundingClientRect().right - box.left + 12) / width, top: 0.04, right: 0.97, bottom };
    return { left: 0.03, top: (slate.getBoundingClientRect().bottom - box.top + 8) / height, right: 0.97, bottom };
  };
  const chase = bindChaseCam({
    engine,
    viewer: view,
    time,
    track: subjectTrack(pack),
    chase: {
      distance: restDistance(),
      near: 1.6,
      elevation: 12,
      // Outside the orbit and a little behind: the whale in profile against the shadow and the lensed disk.
      side: -72,
      lookAhead: () => (portrait.matches ? 0 : 0.3),
      elevationFar: 34,
      // The full plate, from outside the last turn: the last frame is seen in profile.
      sideFar: profileSide(fps, last),
      frame: plateFrame,
      cutFocus: false,
    },
  });

  // The loop seam and the jump to the final segment are hidden by the display's threshold dissolve.
  let stopDissolve: (() => void) | null = null;
  const dissolve = (run: () => void) => {
    stopDissolve?.();
    view.reveal = 0;
    run();
    chase.reset();
    let elapsed = 0;
    const off = engine.addTicker((dt) => {
      elapsed += dt;
      const t = Math.min(1, elapsed / 0.45);
      view.reveal = Math.ceil(t * 14) / 14;
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

  const hints = document.querySelectorAll<HTMLElement>('[data-hero-hint]');
  const HINTS: Record<HeroPhaseId, string> = {
    loop: 'Scroll to draw back',
    final: 'Scroll to the last frame',
    rest: 'Scroll on to the recording',
    after: 'Scroll on to the recording',
  };
  const hero = bindZoomHero({
    hero: $('[data-hero]'),
    stage: $('.obs__stage'),
    surface: view,
    time,
    engine,
    z0: chase.zoomFor(restDistance()),
    zoomSpan: () => chase.logSpan,
    onZoom: (z) => chase.setZoom(z),
    onDissolve: dissolve,
    onPhase: (phase) => hints.forEach((hint) => (hint.textContent = HINTS[phase])),
    controls: document,
  });
  new ResizeObserver(() => hero.setZ0(chase.zoomFor(restDistance()))).observe(viewElement);

  // The "Every moment" checkbox controls this world's own trail; the rest of the layers, the viewer's.
  bindDesktop({
    time,
    display,
    pack,
    viewer: {
      setLayers: ({ trail, ...rest }) => {
        if (trail !== undefined) fall.setTrail(trail);
        view.setLayers(rest);
      },
    },
  });
  bindReadouts(time);
  placeAxis($('[data-axis="trace"]'), [0, TRACE_MAX_HZ], [0, 0.2, 0.4], (v) => String(v), 'Hz');
  bindChart($<HTMLCanvasElement>('[data-trace]'), time, traceChart(frameCount, fps));

  // --- story --------------------------------------------------------------------------------------------
  fillCalculations(pack);
  fillPack(pack);

  // Each story figure with its own clock runs only while it is in view (with reduced motion, it stays
  // still on the frame that best explains it).
  const storyClock = (element: HTMLElement, restFrame: number, mode: 'all' | 'memory' = 'all') => {
    const clock = new TimeController({ frameCount, fps, mode });
    engine.addTicker((dt) => clock.update(dt));
    if (reduced) clock.seek(restFrame);
    else new IntersectionObserver(([entry]) => (entry.isIntersecting ? clock.play(1) : clock.hold())).observe(element);
    return clock;
  };

  // 1. Two-pen recorder.
  const pensCanvas = $<HTMLCanvasElement>('[data-pens]');
  bindChart(pensCanvas, storyClock(pensCanvas, last), pensChart(frameCount, fps));

  // 2. The plate: the whole fall seen from above, with the lens behind it.
  const plateElement = $('[data-view="plate"]');
  const plateClock = storyClock(plateElement, last);
  const plate = new TimeViewer({
    engine,
    element: plateElement,
    pack,
    time: plateClock,
    display,
    // Half a second per copy: far from the hole the copies stay apart; close to it, they crowd together.
    trailStride: PLATE_STRIDE,
    layers: { background: false, frustum: false, trajectory: false },
    frustumLight: false,
  });
  plate.setCameraPreset({ position: [1.2, 17.5, 4.4], target: [0, 0.2, 0.2], fov: 34 });
  plate.setOrbit({ enabled: false, auto: false });
  plate.setPresentLook({ tint: 0.3 });
  plate.setTrailLook({ tint: 0.12 });
  plate.setMaxPointSize(3);
  addLensSky(plate, plateClock, { saturation: 3 });
  engine.add(plate);
  new ResizeObserver(() => fitPlate(plate, plateElement)).observe(plateElement);

  // 3. Redshift: the spectral waterfall with its clock, and three still exposures of the whale.
  const spectrumCanvas = $<HTMLCanvasElement>('[data-spectrum]');
  bindChart(spectrumCanvas, storyClock(spectrumCanvas, last), spectrumChart(frameCount, fps));
  const stillFrames = [0, Math.round(last / 2), last];
  stillFrames.forEach((frame, i) => {
    const element = $(`[data-still="${i}"]`);
    const clock = new TimeController({ frameCount, fps, mode: 'memory' });
    clock.seek(frame);
    const still = new TimeViewer({
      engine,
      element,
      pack,
      time: clock,
      display,
      layers: { trail: false, background: false, frustum: false, trajectory: false },
      frustumLight: false,
    });
    still.setCameraPreset(closeUp(pack, frame, 2.5, 30, 0));
    still.setOrbit({ enabled: false, auto: false });
    // No present tint: each exposure shows its own light.
    still.setPresentLook({ tint: 0 });
    still.setMaxPointSize(4);
    addLensSky(still, clock, { saturation: 3 });
    engine.add(still);
    const state = fallStateAtFrame(frame, fps);
    $(`[data-still-frame="${i}"]`).textContent = String(frame).padStart(3, '0');
    $(`[data-still-z="${i}"]`).textContent = state.redshift.toFixed(2);
  });

  // 4. The horizon: the last frame, still, up close; and r(t) up to twice the clip.
  const horizonElement = $('[data-view="horizon"]');
  const horizonClock = new TimeController({ frameCount, fps, mode: 'all' });
  horizonClock.seek(last);
  const horizon = new TimeViewer({
    engine,
    element: horizonElement,
    pack,
    time: horizonClock,
    display,
    layers: { background: false, frustum: false, trajectory: false },
    frustumLight: false,
  });
  // In profile and from outside the orbit, like the exposures of s3: the last frame's whale whole against
  // the shadow, with the copies of its last 8 s receding along the spiral (7° back, so they do not ride
  // over it). In the phone's square view the camera opens up: the photon ring and the disk fit in.
  const lastPosition = fallStateAtFrame(last, fps).position;
  const azimuth = profileAzimuth(fps, last) - 7;
  const fitHorizon = () =>
    horizon.setCameraPreset(
      narrow.matches
        ? orbitPreset([lastPosition[0], lastPosition[1] + 0.3, lastPosition[2]], 6, azimuth, 16, 40)
        : orbitPreset([lastPosition[0], lastPosition[1] + 0.2, lastPosition[2]], 5, azimuth, 16, 32),
    );
  fitHorizon();
  narrow.addEventListener('change', fitHorizon);
  horizon.setOrbit({ enabled: false, auto: false });
  horizon.setPresentLook({ tint: 0.15 });
  horizon.setTrailLook({ tint: 0.08 });
  horizon.setNearFade('trail', [1.6, 2.6]);
  horizon.setMaxPointSize(4);
  addLensSky(horizon, horizonClock, { saturation: 3 });
  addFallLayers(engine, horizon, horizonClock, { stride: pathStride(fps, ECHO_GAP), span: 8 * fps });
  engine.add(horizon);
  bindChart($<HTMLCanvasElement>('[data-approach]'), horizonClock, approachChart(frameCount, fps));

  // Chart axes, in position (the labels are text, not chart pixels).
  placeAxis($('[data-axis="spectrum"]'), SPECTRUM_RANGE, [400, 800, 1200, 1600, 2000], (v) => String(v), 'nm');
  placeAxis($('[data-axis="pens"]'), [0, last / fps], [0, 5, 10, 15], (v) => `${v}`, 's');
  placeAxis($('[data-axis="approach"]'), [0, (2 * last) / fps], [0, 5, 10, 15, 20, 25], (v) => `${v}`, 's');

  // Development only: verification from Playwright.
  if (import.meta.env.DEV) Object.assign(window, { __e: { engine, view, chase, hero, time, pack, plate, horizon, plateClock, fall } });
}

/**
 * The stage deck (spec cosmic-landings "Live first screen on the same engine"; design D10), the twin of
 * D's `placeMonitor`: while `query` matches, a `.stage-dock` at the end of the stage holds the stage keys
 * and the Time and Colors fieldsets. The same nodes move, so they keep their names, their listeners and
 * the tab order (keys, Time, Colors, then Layers and the transport below the hero). The NOW line is a pair
 * of aria-hidden mirrors (`data-deck-now`, never `data-now`: `bindDesktop` collects `[data-now]` once, when
 * it is called, and would never see a mirror created later); the real outputs stay in the transport for
 * assistive technologies. The mirrors are written here, from a time subscription of their own, each time
 * they are created. When the query stops matching, every node goes back where it was and the mirrors and
 * their subscription are dropped.
 */
function placeDeck(query: MediaQueryList, stage: HTMLElement): { dock: () => HTMLElement | null; attach: (time: TimeController) => void } {
  const keys = $('.stage-keys');
  const keysBefore = keys.nextElementSibling;
  const fieldsetOf = (selector: string) => $(selector).closest('fieldset')!;
  const timeSet = fieldsetOf('input[name="mode"]');
  const colorsSet = fieldsetOf('input[name="depth"]');
  const monitor = timeSet.parentElement!;
  const colorsBefore = colorsSet.nextElementSibling;
  let dock: HTMLElement | null = null;
  let now: HTMLElement | null = null;
  let time: TimeController | null = null;
  let unsubscribe: (() => void) | null = null;

  const mirror = (name: string) => {
    const span = document.createElement('span');
    span.dataset.deckNow = name;
    return span;
  };
  const addMirrors = () => {
    if (!dock || !time || now) return;
    const clock = time;
    const tc = mirror('timecode');
    const state = mirror('state');
    now = document.createElement('p');
    now.className = 'stage-dock__now';
    now.setAttribute('aria-hidden', 'true');
    now.append(tc, state);
    keys.querySelector('.keys')!.after(now);
    const write = () => {
      tc.textContent = timecode(clock.state.frame, clock.fps);
      state.textContent = playbackLabel(clock.state);
    };
    write();
    unsubscribe = clock.subscribe(write);
  };
  const place = () => {
    if (query.matches && !dock) {
      dock = document.createElement('div');
      dock.className = 'stage-dock';
      stage.append(dock);
      dock.append(keys, timeSet, colorsSet);
      addMirrors();
    } else if (!query.matches && dock) {
      unsubscribe?.();
      unsubscribe = null;
      now?.remove();
      now = null;
      stage.insertBefore(keys, keysBefore);
      monitor.insertBefore(colorsSet, colorsBefore);
      monitor.insertBefore(timeSet, colorsSet);
      dock.remove();
      dock = null;
    }
  };
  place();
  query.addEventListener('change', place);
  return {
    dock: () => dock,
    attach: (clock) => {
      time = clock;
      addMirrors();
    },
  };
}

/**
 * The boot's weight on narrow screens: the MiB received over the total the page requests, next to the
 * percentage (a phone waits long enough to want the scale). Created while `query` matches, removed when it
 * stops matching; the returned function is the boot's progress callback.
 */
function bootWeight(query: MediaQueryList, line: HTMLElement): (progress: number, received: number, total: number) => void {
  let text = '';
  let node: HTMLElement | null = null;
  const place = () => {
    if (query.matches && !node) {
      node = document.createElement('span');
      node.className = 'boot__weight';
      // The percentage already reports the progress to the live region: the weight is for the eye.
      node.setAttribute('aria-hidden', 'true');
      node.textContent = text;
      line.append(node);
    } else if (!query.matches && node) {
      node.remove();
      node = null;
    }
  };
  place();
  query.addEventListener('change', place);
  return (_progress, received, total) => {
    text = `${formatBytes(received)} / ${formatBytes(total)}`;
    if (node) node.textContent = text;
  };
}

/**
 * An axis's labels in position: `ticks` within `range`. The unit goes with the last label if that label
 * falls on the edge; otherwise, it goes alone at the end.
 */
function placeAxis(axis: HTMLElement, range: [number, number], ticks: number[], label: (value: number) => string, unit: string): void {
  const [lo, hi] = range;
  // A round label that falls just past the end (15 s of a 14.97 s clip) goes on the edge.
  const inside = ticks.filter((value) => value >= lo && value <= hi + (hi - lo) * 0.01);
  const nodes = inside.map((value, i) => {
    const span = document.createElement('span');
    const at = Math.min(1, (value - lo) / (hi - lo));
    const edge = i === inside.length - 1 && at > 0.95;
    span.textContent = edge ? `${label(value)} ${unit}` : label(value);
    if (edge) span.className = 'axis__unit';
    else span.style.left = `${at * 100}%`;
    return span;
  });
  if (!nodes.some((node) => node.className === 'axis__unit')) {
    const tail = document.createElement('span');
    tail.className = 'axis__unit';
    tail.textContent = unit;
    nodes.push(tail);
  }
  axis.replaceChildren(...nodes);
}

/** Camera around `target`: `distance` m, azimuth and elevation in degrees, and the fov. */
function orbitPreset(target: [number, number, number], distance: number, azimuth: number, elevation: number, fov: number) {
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  const position: [number, number, number] = [
    target[0] + distance * Math.cos(e) * Math.cos(a),
    target[1] + distance * Math.sin(e),
    target[2] + distance * Math.cos(e) * Math.sin(a),
  ];
  return { position, target, fov };
}

/** The plate from above: high enough for the whole disk to fit at the view's aspect. */
function fitPlate(plate: TimeViewer, element: HTMLElement): void {
  const aspect = Math.max(0.5, element.clientWidth / Math.max(1, element.clientHeight));
  // Radius to frame (r_s): the fall's spiral (it starts at 7 r_s) with the disk peeking out around it;
  // in portrait views the width decides.
  const radius = 7.4;
  const fov = 34;
  const half = Math.tan(((fov / 2) * Math.PI) / 180) * Math.min(1, aspect);
  const distance = radius / half;
  const tilt = (16 * Math.PI) / 180;
  plate.setCameraPreset({ position: [0, distance * Math.cos(tilt), distance * Math.sin(tilt)], target: [0, 0.2, 0], fov });
}

/**
 * 4D pack figures (s5) in the name / value / unit grid: the value and the unit come from `packStats`
 * (read from the loaded 4D pack) and go in their own columns.
 */
function fillPack(pack: Pack): void {
  const stats = packStats(pack.meta) as unknown as Record<string, string>;
  document.querySelectorAll<HTMLElement>('[data-pack]').forEach((node) => {
    const key = node.dataset.pack ?? '';
    const [, value, unit] = /^([\d.,]+)\s*(.*)$/.exec(stats[key] ?? '') ?? [];
    if (value === undefined) return;
    node.textContent = value;
    const unitNode = document.querySelector(`[data-pack-unit="${key}"]`);
    if (unitNode) unitNode.textContent = unit;
  });
}

/** Fills `[data-calc]`: story figures computed with the scene's module, never written by hand. */
function fillCalculations(pack: Pack): void {
  const { frameCount, fps } = pack.meta;
  const last = frameCount - 1;
  const first = fallStateAtFrame(0, fps);
  const final = fallStateAtFrame(last, fps);
  const step = (from: number, to: number) => {
    let sum = 0;
    for (let f = from; f < to; f++) {
      const a = fallStateAtFrame(f, fps).position;
      const b = fallStateAtFrame(f + 1, fps).position;
      sum += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    }
    return (sum / Math.max(1, to - from)) * 100;
  };
  const window3 = Math.round(3 * fps);
  // Depth of each story section: the page descends through the fall, from the first frame (s1) to the last
  // (s4) in equal steps of your time; the 4D pack figures (s5) stay at the last frame.
  const depth = (k: number) => fallStateAtFrame(Math.round((Math.min(k, 3) / 3) * last), fps).rOverRs.toFixed(2);
  const values: Record<string, string> = {
    'depth-1': depth(0),
    'depth-2': depth(1),
    'depth-3': depth(2),
    'depth-4': depth(3),
    'depth-5': depth(4),
    'r-first': first.rOverRs.toFixed(2),
    'pace-first': (first.dilation * 100).toFixed(1),
    'pace-last': (final.dilation * 100).toFixed(1),
    't-last': final.t.toFixed(1),
    'tau-last': final.tau.toFixed(1),
    turns: ((final.angle - first.angle) / (2 * Math.PI)).toFixed(2),
    'stride-s': (PLATE_STRIDE / fps).toFixed(1),
    'step-first': step(0, window3).toFixed(1),
    'step-last': step(last - window3, last).toFixed(1),
    'stretch-last': (1 + final.redshift).toFixed(1),
    'band-low': String(Math.round(380 * (1 + final.redshift))),
    'band-high': String(Math.round(780 * (1 + final.redshift))),
    'frame-tau-last': (final.tau - fallStateAtFrame(last - 1, fps).tau).toFixed(3),
    'tau-infinity': properTimeExact(1e4).toFixed(1),
    'beat-period': (1 / WHALE_FALL.beatHz).toFixed(1),
    'fall-a': String(WHALE_FALL.A),
    'fall-t': String(WHALE_FALL.T),
  };
  document.querySelectorAll<HTMLElement>('[data-calc]').forEach((node) => {
    const value = values[node.dataset.calc ?? ''];
    if (value !== undefined) node.textContent = value;
  });
}

main().catch((error) => console.error('[4D.OS · E]', error));
