import './tokens.css';
import './style.css';
import { Vector3 } from 'three';
import { readColor } from '../../../engine/display/palette';
import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import { Engine } from '../../../engine/engine/Engine';
import type { Pack } from '../../../engine/pack/loader';
import { bootPack, defaultErrorText } from '../../../engine/shell/boot';
import { bindChaseCam, subjectTrack, type SubjectTrack, type ViewFrame } from '../../../engine/shell/chaseCam';
import { closeUp } from '../../../engine/shell/closeUp';
import { prefersReducedMotion } from '../../../engine/display/cssColor';
import { bindDesktop } from '../../../engine/shell/desktop';
import { installDevRafShim } from '../../../engine/shell/devRafShim';
import { setupSmoothScroll } from '../../../engine/shell/smoothScroll';
import { paintSourceFrame, trackSourceFrame } from '../../../engine/shell/sourceFrames';
import { bindZoomHero, type HeroPhaseId } from '../../../engine/shell/zoomHero';
import { TimeController } from '../../../engine/time/TimeController';
import { TimeViewer, aspectOf, type CameraPreset } from '../../../engine/viewer/TimeViewer';
import { TesseractView } from '../../../engine/views/tesseract';
import { GOLDEN_ANGLE_DEG, speed, TIMES } from '../../../pipeline/scenes/falconPhi';
import { recolorDiagram } from './diagram';
import { measureSpiral } from './measure';
import { dimNeons } from './neons';
import { fillBytes, fillFalconStats } from './stats';
import {
  beatStats,
  paintRectangles,
  paintSeeds,
  paintSkeleton,
  paintStroke,
  PlanPlot,
  Plot,
  readInk,
  ScopePlot,
  writeOn,
} from './plots';
import { phiDigits } from './phi';
import { bindReadouts, bindThetaScrub } from './readouts';

const PACK_URL = `${import.meta.env.BASE_URL}packs/falcon-phi/`;
/** Half-life (s) of the aim spring: short, because the subject is fast. */
const LOOK_HALFLIFE = 0.03;

const $ = <T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document) => {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector} in the markup of landing D`);
  return node;
};

/** The subject's center at a continuous frame, interpolated from the 4D pack's path (what gets drawn). */
function centerAt(track: SubjectTrack, exact: number, out: Vector3): Vector3 {
  const last = track.centers.length / 3 - 1;
  const f = Math.min(last, Math.max(0, exact));
  const a = Math.floor(f);
  const b = Math.min(last, a + 1);
  const t = f - a;
  const c = track.centers;
  return out.set(c[a * 3] + (c[b * 3] - c[a * 3]) * t, c[a * 3 + 1] + (c[b * 3 + 1] - c[a * 3 + 1]) * t, c[a * 3 + 2] + (c[b * 3 + 2] - c[a * 3 + 2]) * t);
}

/**
 * Bias of the present toward the camera (m): with stable points, the perched falcon repeats each point in
 * the same place in every frame, and its trail used to cover it. It covers the perched breathing.
 */
const PRESENT_BIAS = 0.05;

/** The present in front of its own trail. */
function presentOnTop(view: TimeViewer): void {
  view.setPresentLook({ bias: PRESENT_BIAS });
}

/**
 * Side framing of a segment of the flight (frames `from`–`to`): perpendicular to its mean direction, at
 * the segment's height, at just the distance that fits all of it in the view's aspect.
 */
function sidePreset(track: SubjectTrack, from: number, to: number, aspect: number, fov: number): CameraPreset {
  const c = track.centers;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const point = new Vector3();
  for (let f = from; f <= to; f++) {
    point.set(c[f * 3], c[f * 3 + 1], c[f * 3 + 2]);
    min.min(point);
    max.max(point);
  }
  const center = min.clone().add(max).multiplyScalar(0.5);
  const along = new Vector3(c[to * 3] - c[from * 3], 0, c[to * 3 + 2] - c[from * 3 + 2]);
  // One meter of air along it (half a falcon on each side) and a 5% margin: the row fills the plate.
  const length = along.length() + 1.0;
  along.normalize();
  const side = new Vector3(-along.z, 0, along.x);
  const tanHalf = Math.tan(((fov / 2) * Math.PI) / 180);
  const distance = Math.max(length / 2 / (tanHalf * aspect), (max.y - min.y + 1.2) / 2 / tanHalf) * 1.05;
  const position = center.clone().addScaledVector(side, distance).add(new Vector3(0, distance * 0.06, 0));
  return { position: position.toArray() as CameraPreset['position'], target: center.toArray() as CameraPreset['target'], fov };
}

/**
 * Portrait of one frame for detail A: facing the source camera (the perched falcon looks at it), turned a
 * little to three-quarters and slightly above, at just the distance that makes the body fill the frame.
 */
function portraitPreset(pack: Pack, track: SubjectTrack, frame: number, distance: number): CameraPreset {
  const c = track.centers;
  const target = new Vector3(c[frame * 3], c[frame * 3 + 1] + 0.03, c[frame * 3 + 2]);
  const elevation = (8 * Math.PI) / 180;
  const direction = new Vector3(...pack.meta.cameras[frame].pos)
    .sub(target)
    .setY(0)
    .normalize()
    .applyAxisAngle(new Vector3(0, 1, 0), (24 * Math.PI) / 180)
    .multiplyScalar(Math.cos(elevation))
    .setY(Math.sin(elevation));
  const position = target.clone().addScaledVector(direction, distance);
  return { position: position.toArray() as CameraPreset['position'], target: target.toArray() as CameraPreset['target'], fov: 30 };
}

/** A story view's own clock: it runs only while the view is on screen (and never with reduced motion). */
function clockOnScreen(element: Element, clock: TimeController, reduced: boolean, rest: number): void {
  clock.seek(rest);
  if (reduced) return;
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? clock.play(1) : clock.hold())).observe(element);
}

async function main(): Promise<void> {
  if (import.meta.env.DEV) installDevRafShim();
  const html = document.documentElement;
  const reduced = prefersReducedMotion();
  const engine = new Engine();
  const display = new RetroDisplay({ tokenRoot: html, pixelScale: 3 });
  display.onChange(() => engine.invalidate());
  const markDepth = () => (html.dataset.depth = display.mode);
  markDepth();
  display.onChange(markDepth);
  setupSmoothScroll();

  engine.add(new TesseractView($('[data-view="tesseract"]'), { colorToken: '--beam', size: 0.9 }));

  // --- §1: φ and the golden angle (they do not depend on the 4D pack) ------------------------------
  $('[data-phi-digits]').textContent = phiDigits(11);
  $('[data-golden-angle]').textContent = GOLDEN_ANGLE_DEG.toFixed(3);
  let ink = readInk(html);
  const plots: Array<() => void> = [];
  let rectProgress = 0;
  const rectPlot = new Plot($('[data-plot="rectangles"]'), (plot) => paintRectangles(plot, ink, rectProgress));
  writeOn(rectPlot.canvas, 2.4, (p) => ((rectProgress = p), rectPlot.redraw()), reduced);
  let seedProgress = 0;
  const seedPlot = new Plot($('[data-plot="seeds"]'), (plot) => paintSeeds(plot, ink, seedProgress));
  writeOn(seedPlot.canvas, 2.4, (p) => ((seedProgress = p), seedPlot.redraw()), reduced);
  plots.push(() => rectPlot.redraw(), () => seedPlot.redraw());

  // --- §3: the wingbeat ------------------------------------------------------------------------
  const stats = beatStats();
  $('[data-beat="down"]').textContent = String(Math.round(stats.down * 100));
  $('[data-beat="hz"]').textContent = stats.hz.toFixed(1);
  $('[data-beat="cv"]').textContent = String(Math.round(stats.cv * 100));
  let strokeProgress = 0;
  const strokePlot = new Plot($('[data-plot="stroke"]'), (plot) => paintStroke(plot, ink, strokeProgress, stats.down));
  writeOn(strokePlot.canvas, 3, (p) => ((strokeProgress = p), strokePlot.redraw()), reduced);
  plots.push(() => strokePlot.redraw());

  // --- §4: the skeleton, at a quarter speed, while it is on screen -----------------------------
  let skeletonT = 0.35;
  const skeletonPlot = new Plot($('[data-plot="skeleton"]'), (plot) => paintSkeleton(plot, ink, skeletonT));
  plots.push(() => skeletonPlot.redraw());
  if (!reduced) {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      skeletonT = (skeletonT + dt * 0.25) % TIMES.flapEnd;
      skeletonPlot.redraw();
      raf = requestAnimationFrame(loop);
    };
    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (entry.isIntersecting) raf = requestAnimationFrame(loop);
    }).observe(skeletonPlot.canvas);
  }
  // The plot labels are set in Tektur: they are repainted when the font loads.
  void document.fonts.ready.then(() => plots.forEach((redraw) => redraw()));

  // --- the 4D pack -----------------------------------------------------------------------------
  const pack = await bootPack({
    url: PACK_URL,
    boot: $('[data-boot]'),
    display,
    engine,
    errorText: (error) => `The falcon could not be computed. ${defaultErrorText(error)}`,
  });
  const { frameCount, fps } = pack.meta;
  const track = subjectTrack(pack);
  // The scene's golden diagram, from the cyan of the "NOW" to the grid's low phosphor (as in the
  // plotter): cyan and magenta are kept for the present and the direction of time; gold, for φ.
  // This runs before the views are created, since they upload the colors to the GPU on their first paint.
  if (recolorDiagram(pack.static, pack.meta.bbox, readColor(html, ['--beam-dim'], [20, 99, 63])) === 0) {
    console.warn('[4D.OS · D] The 4D pack does not have the golden diagram where it was expected: it keeps its color.');
  }
  // The city's neons, in the deep tones: the tubes in deep cyan and magenta; the sign bodies, at the
  // dim phosphor value (`--neon-body`, see `neons.ts`). After the diagram, which looks for cyan.
  dimNeons(pack.static.colors, {
    cyan: readColor(html, ['--pal-16-12'], [15, 106, 130]),
    magenta: readColor(html, ['--pal-16-14'], [122, 29, 92]),
    body: Math.max(...readColor(html, ['--neon-body'], [10, 42, 32])) / 255,
  });

  const time = new TimeController({ frameCount, fps, mode: 'all' });
  engine.addTicker((dt) => time.update(dt));
  time.subscribe(() => engine.invalidate());

  // The hero view: it chases the falcon from one side.
  const viewElement = $('[data-view="scene"]');
  const view = new TimeViewer({
    engine,
    element: viewElement,
    pack,
    time,
    display,
    // Six frames between exposures: at 30 fps, five falcons per second; with fewer, the trail is a tube.
    trailStride: 6,
    layers: { trajectory: false, frustum: false },
  });
  presentOnTop(view);
  view.setMaxPointSize(4);
  // Dense trail: on the full plate each falcon is a few pixels across and has to read as a whole.
  view.setTrailLook({ tint: 0.72, min: 0.5, max: 0.9 });
  // The city stays in the background: the source camera's light (the drone) lights it where it looks and
  // the rest dims and thins out; that way its neons are not mistaken for the present (cyan) or for
  // rewind (magenta).
  view.setFrustumLightLook({ density: 0.35, amount: 0.75 });
  view.setBackgroundLevel(0.75);
  view.setOrbit({ enabled: true, auto: false });
  view.controls.maxPolarAngle = (120 * Math.PI) / 180;
  view.setCutaway(true);
  // Past exposures right against the lens fade out before they cover the present.
  view.setNearFade('trail', [1.8, 2.6]);
  view.setNearFade('background', [0.4, 1.0]);
  engine.add(view);

  // Detail A: on the full plate the perched falcon is a few pixels across (the plate does not zoom in:
  // it is always the same). As on a drawing, a detail view shows it at a readable scale, on its own
  // clock held at the last frame; only with the hero in its final state.
  const lastFrame = frameCount - 1;
  const detail = $('[data-detail]');
  const detailElement = $('[data-view="detail"]', detail);
  const detailClock = new TimeController({ frameCount, fps, mode: 'memory' });
  detailClock.seek(lastFrame);
  const detailView = new TimeViewer({
    engine,
    element: detailElement,
    pack,
    time: detailClock,
    display,
    layers: { trail: false, trajectory: false, frustum: false },
  });
  // 4:5 frame on the desktop; square and small on the phone, closer in.
  const framePortrait = () => detailView.setCameraPreset(portraitPreset(pack, track, lastFrame, stacked.matches ? 0.95 : 1.15));
  detailView.setOrbit({ enabled: false, auto: false });
  detailView.setBackgroundLevel(0.55);
  // The present in the HOLD color, but letting its plumage show: dark hood and moustache, pale chest.
  detailView.setPresentLook({ tint: 0.4 });
  $('[data-detail-frame]', detail).textContent = String(lastFrame);
  engine.add(detailView);
  // The detail falls inside the hero's rectangle and is painted after it: every hero repaint covers it,
  // so the hero drags it along (the engine walks the views in the order they were added, in the same pass).
  const renderHero = view.render.bind(view);
  view.render = (renderer, rect) => {
    renderHero(renderer, rect);
    if (!detail.hidden) engine.invalidate(detailView);
  };

  // Desktop: the tube takes the right column (38.2%); the subject is centered in the free glass by
  // shifting the projection window. On phones the tube goes below the hero.
  const stacked = window.matchMedia('(max-width: 760px), (orientation: landscape) and (max-height: 500px)');
  const landscapePhone = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
  framePortrait();
  stacked.addEventListener('change', framePortrait);
  const tube = $('.tube');
  const deck = $('.deck');
  const mast = $('.mast');
  // The monitor (time mode and colors) belongs to the first screen: on the desktop it closes the tube; on
  // the phone, where the tube goes below the hero, it drops to the foot of the control strip. The same
  // node is moved, so it keeps its radios, its link to the display and the focus order.
  const monitor = $('.monitor');
  const placeMonitor = () => {
    const home = stacked.matches ? deck : tube;
    if (monitor.parentElement !== home) home.append(monitor);
  };
  placeMonitor();
  stacked.addEventListener('change', placeMonitor);
  const frameView = () => {
    if (stacked.matches) view.camera.clearViewOffset();
    else {
      const width = Math.max(1, viewElement.clientWidth);
      const free = tube.getBoundingClientRect().left - viewElement.getBoundingClientRect().left;
      view.camera.setViewOffset(1, 1, 0.5 - free / 2 / width, -0.02, 1, 1);
    }
    engine.invalidate(view);
  };
  frameView();
  stacked.addEventListener('change', frameView);

  // On an upright phone the view is narrow: farther away and more from behind, so the flight comes in
  // depth-wise instead of crossing the screen.
  const portrait = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
  const restDistance = () => (stacked.matches ? 3.1 : 2.6);
  // Full-plate shot (elevation and side relative to the overall heading), per layout.
  const farPose = { desk: { elevation: 16, side: -165 }, phone: { elevation: 26, side: -165 } };
  const far = () => (stacked.matches ? farPose.phone : farPose.desk);
  const plateFrame = (): ViewFrame => {
    const box = viewElement.getBoundingClientRect();
    const width = Math.max(1, box.width);
    const height = Math.max(1, box.height);
    const top = (mast.getBoundingClientRect().bottom - box.top + 8) / height;
    const bottom = (deck.getBoundingClientRect().top - box.top - 8) / height;
    // Landscape phone: the title and the readouts take the left column; the plate, the rest.
    if (landscapePhone.matches) return { left: (mast.getBoundingClientRect().right - box.left + 12) / width, top: 0.04, right: 0.97, bottom };
    if (stacked.matches) return { left: 0.03, top, right: 0.97, bottom };
    return { left: 0.02, top: Math.min(0.3, top), right: (tube.getBoundingClientRect().left - box.left - 16) / width, bottom };
  };
  const chase = bindChaseCam({
    engine,
    viewer: view,
    time,
    track,
    chase: {
      distance: restDistance(),
      near: 1.1,
      // Dorsal three-quarters: 30° above and on the inside of the curve. The falcon banks toward the
      // spiral's axis, so from there its back shows with the wings open in plan; from the outside and
      // at 16°, the banked glide read as a flat bar.
      elevation: 30,
      // `side` is read only once (the core does not accept a function): the initial orientation decides.
      side: portrait.matches ? 38 : 78,
      // The falcon flies at 6–12 m/s: the aim leads by what the spring lags (speed · half-life / ln 2),
      // with the sign and rate of time (when rewinding, the lag goes the other way).
      lookAhead: () => (portrait.matches ? 0 : 0.12) + (speed(time.exactFrame / fps) * time.rate * LOOK_HALFLIFE) / Math.LN2,
      lookHalflife: LOOK_HALFLIFE,
      // The path is already smooth (it comes from equations): with the cat's prefilter, the aim cut the corners of the stoop.
      smoothing: 0.08,
      // Full plate: high three-quarters; the spiral opens like a funnel with all the falcons.
      elevationFar: () => far().elevation,
      sideFar: () => far().side,
      frame: plateFrame,
    },
  });

  // The plotter and the oscilloscope: what is stored up to the "NOW" (whole frame, like the readouts).
  const planPlot = new PlanPlot($('[data-plot="plan"]'), ink);
  const scopePlot = new ScopePlot($('[data-plot="scope"]'), ink);
  // Pocket plotter (phone): the same plan and the same clock, in ~130 px.
  const miniPlot = new PlanPlot($('[data-plot="mini"]'), ink, true);
  const plotNow = () => {
    const state = time.state;
    planPlot.set(state.frame / fps, state.direction);
    scopePlot.set(state.frame / fps, state.direction);
    if (stacked.matches) miniPlot.set(state.frame / fps, state.direction);
  };
  plotNow();
  time.subscribe(plotNow);
  plots.push(plotNow);
  display.onTokens(() => {
    ink = readInk(html);
    planPlot.setInk(ink);
    scopePlot.setInk(ink);
    miniPlot.setInk(ink);
    plots.forEach((redraw) => redraw());
  });

  // Loop seam and jump to the final segment: the scene dissolves by threshold (14 steps in ~0.45 s)
  // and the tube erases its page with a phosphor flash, like a Tektronix when PAGE is pressed.
  const plotBox = $('.tube__plot');
  const flash = $('[data-flash]');
  const erasing = [plotBox, flash];
  let stopDissolve: (() => void) | null = null;
  const dissolve = (run: () => void) => {
    stopDissolve?.();
    view.reveal = 0;
    run();
    chase.reset();
    if (!reduced) {
      for (const element of erasing) element.classList.remove('is-erasing');
      void plotBox.offsetWidth;
      for (const element of erasing) element.classList.add('is-erasing');
    }
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
  for (const element of erasing) element.addEventListener('animationend', () => element.classList.remove('is-erasing'));

  const hint = $('[data-hero-hint]');
  const gin = $('[data-gin]');
  let heroPhase: HeroPhaseId = 'loop';
  // On the phone, detail A takes the pocket plotter's place (same frame and label).
  const miniSlot = $('[data-mini-slot]');
  const placeDetail = () => {
    if (!stacked.matches) return;
    const stage = viewElement.getBoundingClientRect();
    const slot = miniSlot.getBoundingClientRect();
    detail.style.setProperty('--slot-top', `${slot.top - stage.top}px`);
    detail.style.setProperty('--slot-left', `${slot.left - stage.left}px`);
    detail.style.setProperty('--slot-width', `${slot.width}px`);
  };
  new ResizeObserver(placeDetail).observe(miniSlot);
  stacked.addEventListener('change', () => {
    placeDetail();
    plotNow();
  });
  void document.fonts.ready.then(placeDetail);
  const HINTS: Record<HeroPhaseId, string> = {
    loop: 'Scroll to see every moment',
    final: 'Scroll to the last frame',
    rest: 'Scroll on to the story',
    after: 'Scroll on to the story',
  };
  const hero = bindZoomHero({
    hero: $('[data-hero]'),
    surface: view,
    time,
    engine,
    z0: chase.zoomFor(restDistance()),
    zoomSpan: () => chase.logSpan,
    onZoom: (z) => chase.setZoom(z),
    onDissolve: dissolve,
    onPhase: (phase) => {
      hint.textContent = HINTS[phase];
      heroPhase = phase;
      // The GIN marks the "NOW" once the plate is full; the detail shows only in the final state.
      const final = phase === 'rest' || phase === 'after';
      gin.classList.toggle('has-detail', final);
      detail.hidden = !final;
      miniSlot.classList.toggle('is-covered', final);
      placeDetail();
      engine.invalidate(detailView);
      engine.requestFrame();
    },
  });
  new ResizeObserver(() => {
    frameView();
    hero.setZ0(chase.zoomFor(restDistance()));
  }).observe(viewElement);

  bindDesktop({ time, display, pack, viewer: view });
  fillFalconStats(pack.meta, pack.correspondence?.pointsPerFrame ?? null);
  fillBytes($('[data-bytes]'), pack.meta);
  bindReadouts(document, time);
  bindThetaScrub($('[data-theta]'), time);

  // Leader: a 1 px line ties the θ row to the falcon on screen (an idea taken from tensegrity).
  const leader = $('[data-leader]');
  const leaderLine = $('[data-leader-line]', leader);
  const leaderDot = $('[data-leader-dot]', leader);
  const thetaRow = $('.read__row--theta');
  const present = new Vector3();
  let leaderKey = '';
  // GIN cursor: the 4010's crosshair across the free glass, open around the subject, with a ring and
  // four ticks in the color of the present (the plotter's cursor, in the scene).
  const ginArms = $('[data-gin-arms]', gin);
  const ginTicks = $('[data-gin-ticks]', gin);
  const ginRing = $('[data-gin-ring]', gin);
  const ginLabel = $('[data-gin-label]', gin);
  const GIN_RING = 9;
  const GIN_GAP = 22;
  let ginKey = '';
  /** Segments of [from, to] that remain after removing the `holes` intervals. */
  const cut = (from: number, to: number, holes: Array<[number, number]>) => {
    let parts: Array<[number, number]> = [[from, to]];
    for (const [a, b] of holes) {
      parts = parts.flatMap(([p, q]): Array<[number, number]> => {
        if (b <= p || a >= q) return [[p, q]];
        const kept: Array<[number, number]> = [
          [p, a],
          [b, q],
        ];
        return kept.filter(([u, v]) => v - u > 1);
      });
    }
    return parts;
  };
  /** Rectangle of detail A in the view (the arms do not cross it: it is a separate window). */
  const detailHole = (): [number, number, number, number] | null => {
    if (detail.hidden) return null;
    const stage = viewElement.getBoundingClientRect();
    const box = detail.getBoundingClientRect();
    return [box.left - stage.left - 1, box.top - stage.top - 1, box.right - stage.left + 1, box.bottom - stage.top + 1];
  };
  const setGin = (key: string, fx = 0, fy = 0, width = 0, height = 0) => {
    if (key === ginKey) return;
    ginKey = key;
    gin.classList.toggle('is-off', key === 'off');
    if (key === 'off') return;
    // Center on a half pixel: the 1 px strokes land whole on the pixel grid.
    const x = Math.round(fx) + 0.5;
    const y = Math.round(fy) + 0.5;
    const r = GIN_RING;
    const g = GIN_GAP;
    const hole = detailHole();
    const across: Array<[number, number]> = [[x - g, x + g]];
    const down: Array<[number, number]> = [[y - g, y + g]];
    if (hole && y > hole[1] && y < hole[3]) across.push([hole[0], hole[2]]);
    if (hole && x > hole[0] && x < hole[2]) down.push([hole[1], hole[3]]);
    const arms =
      cut(0, width, across).map(([a, b]) => `M${a} ${y}H${b}`).join('') + cut(0, height, down).map(([a, b]) => `M${x} ${a}V${b}`).join('');
    ginArms.setAttribute('d', arms);
    ginTicks.setAttribute('d', `M${x - g} ${y}H${x - r - 3}M${x + r + 3} ${y}H${x + g}M${x} ${y - g}V${y - r - 3}M${x} ${y + r + 3}V${y + g}`);
    ginRing.setAttribute('cx', String(x));
    ginRing.setAttribute('cy', String(y));
    ginLabel.setAttribute('x', String(x + r + 4));
    ginLabel.setAttribute('y', String(y - r - 4));
  };
  engine.addTicker(() => {
    const visible = engine.isVisible(view);
    const wantLeader = visible && !stacked.matches;
    const wantGin = visible && heroPhase !== 'loop';
    if (!wantLeader && leaderKey !== 'off') {
      leader.classList.add('is-off');
      leaderKey = 'off';
    }
    if (!wantGin) setGin('off');
    if (!wantLeader && !wantGin) return false;
    view.camera.updateMatrixWorld();
    centerAt(track, time.exactFrame, present).project(view.camera);
    const box = viewElement.getBoundingClientRect();
    const fx = ((present.x + 1) / 2) * box.width;
    const fy = ((1 - present.y) / 2) * box.height;
    // Free glass: left of the tube on the desktop; the whole view on the phone.
    const free = stacked.matches ? box.width : tube.getBoundingClientRect().left - box.left;
    if (wantGin) {
      const inside = present.z < 1 && fx > 0 && fx < free && fy > 0 && fy < box.height;
      setGin(inside ? `${fx.toFixed(0)},${fy.toFixed(0)},${free.toFixed(0)},${box.height.toFixed(0)},${detail.hidden}` : 'off', fx, fy, free, box.height);
    }
    if (!wantLeader) return false;
    const row = thetaRow.getBoundingClientRect();
    const tx = row.left - box.left - 10;
    const ty = row.top - box.top + row.height / 2;
    const inside = present.z < 1 && fx > 0 && fx < tx - 16 && fy > 0 && fy < box.height;
    const shoulder = Math.max(fx + 12, tx - 56);
    const key = inside ? `${fx.toFixed(1)},${fy.toFixed(1)},${tx.toFixed(0)},${ty.toFixed(0)}` : 'off';
    if (key === leaderKey) return false;
    leaderKey = key;
    leader.classList.toggle('is-off', !inside);
    if (inside) {
      leaderLine.setAttribute('points', `${fx.toFixed(1)},${fy.toFixed(1)} ${shoulder.toFixed(1)},${ty.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`);
      leaderDot.setAttribute('cx', fx.toFixed(1));
      leaderDot.setAttribute('cy', fy.toFixed(1));
    }
    return false;
  });

  // --- §1: the ratio measured on the points of this 4D pack --------------------------------------
  const measured = measureSpiral(track, fps);
  $('[data-measure]').innerHTML = measured
    ? `Measured on the points of this pack, without the equations: over <b>${measured.turns.toFixed(2)}</b> turns,
       <b>${measured.pairs}</b> pairs of frames a quarter turn apart give ratios from
       <b class="measure__phi">${measured.min.toFixed(4)}</b> to <b class="measure__phi">${measured.max.toFixed(4)}</b>,
       never more than <b>${(measured.worst * 100).toFixed(2)}%</b> from φ.`
    : 'This pack has no spiral stretch to measure.';

  // --- §2: the spiral from above, with its own clock --------------------------------------------
  const planElement = $('[data-view="plan"]');
  const planClock = new TimeController({ frameCount, fps, mode: 'all' });
  engine.addTicker((dt) => planClock.update(dt));
  const planView = new TimeViewer({
    engine,
    element: planElement,
    pack,
    time: planClock,
    display,
    trailStride: 6,
    layers: { frustum: false, trajectory: false },
    frustumLight: false,
  });
  // Plan with a telephoto lens: the box of all moments fits whole, seen almost straight down.
  const bounds = planView.gpu.subjectBounds;
  const center = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);
  // With air around it: the golden diagram it flies over fits in too.
  const extent = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) * 1.32;
  const planFov = 14;
  const planHeight = extent / 2 / Math.tan(((planFov / 2) * Math.PI) / 180);
  presentOnTop(planView);
  planView.controls.minPolarAngle = 0;
  planView.setCameraPreset({ position: [center.x, center.y + planHeight, center.z + planHeight * 0.02], target: [center.x, center.y, center.z], fov: planFov });
  planView.setOrbit({ enabled: false, auto: false });
  planView.setBackgroundLevel(0.7);
  planView.setTrailLook({ tint: 0.72 });
  engine.add(planView);
  bindReadouts($('.page--plan'), planClock, 'data-plan-read');
  clockOnScreen(planElement, planClock, reduced, Math.round(TIMES.spiralEnd * fps));

  // --- §3: Marey. From the side, in memory, one exposure every three frames; the flapping loops. ---
  const mareyElement = $('[data-view="marey"]');
  const mareyClock = new TimeController({ frameCount, fps, mode: 'memory' });
  // One exposure every three frames: ten per second. At 6.2 m/s they land 0.62 m apart, more than the
  // falcon's length, so each one reads on its own; every two frames (fifteen per second), they merged into a band.
  const MAREY_STRIDE = 3;
  // 1.2 s of flapping (1 s on the phone): twelve exposures and the present, which fill the 3:1 plate (2:1 on the phone).
  const mareySeconds = window.matchMedia('(max-width: 760px)').matches ? 1 : 1.2;
  const flapEnd = Math.round(Math.min(mareySeconds, TIMES.flapEnd) * fps);
  engine.addTicker((dt) => {
    const moving = mareyClock.update(dt);
    // New plate: when the flapping ends, it goes back to the start (the jump clears the memory).
    if (mareyClock.playing && mareyClock.frame >= flapEnd) mareyClock.seek(0);
    return moving;
  });
  const mareyView = new TimeViewer({
    engine,
    element: mareyElement,
    pack,
    time: mareyClock,
    display,
    trailStride: MAREY_STRIDE,
    layers: { frustum: false, trajectory: false, background: false },
    frustumLight: false,
  });
  presentOnTop(mareyView);
  // From the side, perpendicular to the flapping segment and framing all of it, on black: Marey
  // photographed against the black backdrop of his shed; here the city goes dark.
  mareyView.setCameraPreset(sidePreset(track, 0, flapEnd, aspectOf(mareyElement), 32));
  mareyView.setOrbit({ enabled: false, auto: false });
  mareyView.setTrailLook({ tint: 0.72, tau: 900, min: 0.6, max: 0.95 });
  engine.add(mareyView);
  new ResizeObserver(() => mareyView.setCameraPreset(sidePreset(track, 0, flapEnd, aspectOf(mareyElement), 32))).observe(mareyElement);
  // At rest (reduced motion), the full plate: the present at the loop's last exposure.
  clockOnScreen(mareyElement, mareyClock, reduced, Math.floor((flapEnd - 1) / MAREY_STRIDE) * MAREY_STRIDE);

  // One second through Marey's gun: twelve source frames, one every 2.5 frames of the 4D pack.
  const gun = $('[data-gun]');
  const gunStart = Math.round(1 * fps);
  for (let k = 0; k < 12; k++) {
    const frame = Math.min(frameCount - 1, gunStart + Math.round((k * fps) / 12));
    const item = document.createElement('li');
    item.className = 'gun__frame';
    const image = document.createElement('div');
    image.className = 'gun__image';
    const caption = document.createElement('span');
    caption.className = 'gun__num';
    caption.textContent = String(frame).padStart(3, '0');
    item.append(image, caption);
    gun.append(item);
    trackSourceFrame(image, pack.url, pack.meta, () => frame);
  }

  // --- §4: one frame in points and its source frame ----------------------------------------------
  const glideFrame = Math.min(frameCount - 1, 125);
  const still = new TimeController({ frameCount, fps, mode: 'memory' });
  still.seek(glideFrame);
  const pointsView = new TimeViewer({
    engine,
    element: $('[data-view="points"]'),
    pack,
    time: still,
    display,
    layers: { trail: false, trajectory: false, frustum: false },
    frustumLight: false,
  });
  pointsView.setCameraPreset(closeUp(pack, glideFrame, 1.7, 34, 0));
  pointsView.setBackgroundLevel(0.25);
  pointsView.setCutaway(true);
  pointsView.setOrbit({ enabled: false, auto: false });
  engine.add(pointsView);
  const sourceStill = $('[data-source-still]');
  // The box takes the proportions of the atlas cell: that way it shows a single frame, without the next row.
  sourceStill.style.aspectRatio = `${pack.meta.source.width} / ${pack.meta.source.height}`;
  // With the exact width (not clientWidth's integer), the cell is the same size as the box.
  const paintStill = () => paintSourceFrame(sourceStill, pack.url, pack.meta, glideFrame, sourceStill.getBoundingClientRect().width);
  new ResizeObserver(paintStill).observe(sourceStill);

  // Development only: verification from Playwright.
  if (import.meta.env.DEV) {
    Object.assign(window, { __d: { farPose, engine, view, chase, hero, time, planClock, mareyClock, planView, mareyView, pointsView, detailView, display, track } });
  }
}

main().catch((error) => console.error('[4D.OS · D]', error));
