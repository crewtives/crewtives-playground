import './tokens.css';
import './style.css';
import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import { Engine } from '../../../engine/engine/Engine';
import { bootPack, defaultErrorText } from '../../../engine/shell/boot';
import { closeUp } from '../../../engine/shell/closeUp';
import { installDevRafShim } from '../../../engine/shell/devRafShim';
import { prefersReducedMotion } from '../../../engine/display/cssColor';
import { bindDesktop } from '../../../engine/shell/desktop';
import { bindScrollTime } from '../../../engine/shell/scrollTime';
import { setupSmoothScroll } from '../../../engine/shell/smoothScroll';
import { paintSourceFrame } from '../../../engine/shell/sourceFrames';
import { TimeController } from '../../../engine/time/TimeController';
import { TimeViewer, aspectOf } from '../../../engine/viewer/TimeViewer';
import { LifeStackView } from '../../../engine/views/lifeStack';
import { bindWindows } from '../../../engine/window/windows';
import { TesseractView } from '../../../engine/views/tesseract';
import { leakTexture } from './film';
import { bindFilmStrip } from './strip';

const PACK_URL = `${import.meta.env.BASE_URL}packs/cat-stairs/`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector} in the markup of world C`);
  return node;
};

async function main(): Promise<void> {
  if (import.meta.env.DEV) installDevRafShim();
  const engine = new Engine();
  const display = new RetroDisplay({ tokenRoot: document.documentElement, pixelScale: 3 });
  display.onChange(() => engine.invalidate());

  setupSmoothScroll();

  engine.add(
    new LifeStackView($('[data-view="life"]'), {
      display,
      backgroundToken: '--scene-bg',
      oldToken: '--pal-16-9',
      newToken: '--pal-16-12',
      presentToken: '--accent-forward',
    }),
  );
  engine.add(new TesseractView($('[data-view="tesseract"]'), { colorToken: '--paper' }));

  const pack = await bootPack({
    url: PACK_URL,
    boot: $('[data-boot]'),
    display,
    engine,
    errorText: (error) => `The film would not thread. ${defaultErrorText(error)}`,
  });

  // C starts in memory mode: the strip runs and the trail grows behind the present.
  const time = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'memory' });
  engine.addTicker((dt) => time.update(dt));
  time.subscribe(() => engine.invalidate());

  // What the projector throws: the scene at an oblique angle, with a slow orbit at rest.
  const gateElement = $('[data-view="scene"]');
  const projector = new TimeViewer({ engine, element: gateElement, pack, time, display, trailStride: 1 });
  projector.setCameraPreset(projector.defaultPreset(aspectOf(gateElement), 34));
  projector.setOrbit({ enabled: true, auto: true });
  // Dollhouse cutaway: while orbiting, the wall in front does not block the alley.
  projector.setCutaway(true);
  // Overexposed trail, but without losing the cat's color entirely.
  projector.setTrailLook({ tint: 0.32 });
  engine.add(projector);

  bindWindows();
  bindDesktop({ time, display, pack, viewer: projector });
  bindFilmStrip({
    window: $('[data-strip]'),
    film: $('[data-strip-film]'),
    time,
    pack,
    engine,
    gateMarks: document.querySelector<HTMLElement>('[data-gate-marks]'),
  });

  // Light leak: a texture burned at the display's pixel scale, regenerated when the size changes.
  const leak = $('.gate__leak');
  new ResizeObserver(() => {
    const box = leak.getBoundingClientRect();
    leak.style.backgroundImage = `url("${leakTexture(box.width / 3, box.height / 3)}")`;
  }).observe(leak);

  // Reel 2: shoot (source frame), develop (one frame in 3D) and project (all together).
  // A step halfway up the climb, with a front paw in the air: it reads better than the exact middle, which falls
  // just as the cat slows down for its micro-pause.
  const middle = Math.floor(pack.meta.frameCount * 0.46);
  paintSourceFrame($('[data-pipeline="video"]'), pack.url, pack.meta, middle);

  // Develop: a single frame, held at the same instant as the shot film frame, and up close, with the camera that saw it.
  const still = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'memory' });
  still.seek(middle);
  const developed = new TimeViewer({
    engine,
    element: $('[data-pipeline="frame"]'),
    pack,
    time: still,
    display,
    layers: { trail: false, trajectory: false },
    frustumLight: false,
  });
  developed.setCameraPreset(closeUp(pack, middle, 4.4, 30, 0.35));
  developed.setCutaway(true);
  developed.setOrbit({ enabled: false, auto: false });
  engine.add(developed);

  // Project: every developed frame at once, regardless of where the strip is.
  const everything = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'all' });
  everything.seek(middle);
  const projected = new TimeViewer({
    engine,
    element: $('[data-pipeline="plate"]'),
    pack,
    time: everything,
    display,
    trailStride: 2,
    layers: { frustum: false },
    frustumLight: false,
  });
  projected.setCameraPreset(projected.defaultPreset(16 / 9, 30, { elevation: 18, azimuth: 60, fill: 0.9 }));
  projected.setCutaway(true);
  projected.setOrbit({ enabled: false, auto: true });
  engine.add(projected);

  // Reel 3: scroll is time.
  const scrollElement = $('[data-view="scroll"]');
  const reel = new TimeViewer({ engine, element: scrollElement, pack, time, display, trailStride: 2 });
  reel.setCameraPreset(reel.defaultPreset(aspectOf(scrollElement), 28));
  reel.setCutaway(true);
  reel.setOrbit({ enabled: false, auto: false });
  engine.add(reel);
  bindScrollTime($('[data-scroll-time]'), time, { wake: () => engine.requestFrame() });

  if (!prefersReducedMotion()) time.play(1);
}

main().catch((error) => console.error('[4D.OS · C]', error));
