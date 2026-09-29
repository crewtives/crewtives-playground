// 4D.OS launcher: one scene, three worlds. One pack, one time and three displays; each window
// resolves its world's tokens through [data-world], so the same scene is seen in three palettes.
import '../worlds/a/tokens.css';
import '../worlds/b/tokens.css';
import '../worlds/c/tokens.css';
import './launcher.css';
import { RetroDisplay } from '../../engine/display/RetroDisplay';
import { Engine } from '../../engine/engine/Engine';
import { loadPack } from '../../engine/pack/loader';
import { prefersReducedMotion } from '../../engine/display/cssColor';
import { installDevRafShim } from '../../engine/shell/devRafShim';
import { bindTimeKeys } from '../../engine/shell/keyboard';
import { bindWallClock } from '../../engine/shell/wallClock';
import { playbackLabel, timecode, TimeController } from '../../engine/time/TimeController';
import { TimeViewer, type TimeViewerOptions } from '../../engine/viewer/TimeViewer';
import { sidePreset } from '../../engine/shell/sidePreset';

const PACK_URL = `${import.meta.env.BASE_URL}packs/cat-stairs/`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector} in the launcher`);
  return node;
};

async function main(): Promise<void> {
  if (import.meta.env.DEV) installDevRafShim();
  const engine = new Engine();
  bindWallClock($('[data-wall-clock]'));

  const status = $('.status');
  const setProgress = (p: number) => {
    status.style.setProperty('--progress', String(p));
    $('[data-boot-pct]').textContent = String(Math.round(p * 100));
  };

  const displays = (['a', 'b', 'c'] as const).map((world) => {
    const root = $(`.world[data-world="${world}"]`);
    const display = new RetroDisplay({ tokenRoot: root, pixelScale: 3 });
    display.reveal = 0;
    display.onChange(() => engine.invalidate());
    return { world, root, display };
  });

  let pack;
  try {
    pack = await loadPack(PACK_URL, { onProgress: (p) => setProgress(p) });
  } catch (error) {
    $('[data-boot-message]').textContent = 'Could not load the scene.';
    throw error;
  }
  setProgress(1);
  status.classList.add('is-ready');

  // Every moment at once, in all three windows at the same time.
  const time = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'all' });
  engine.addTicker((dt) => time.update(dt));
  time.subscribe(() => engine.invalidate());

  const tc = $('[data-now="timecode"]');
  const state = $('[data-now="state"]');
  time.subscribe((s) => {
    tc.textContent = timecode(s.frame, time.fps);
    state.textContent = playbackLabel(s);
  });
  bindTimeKeys(time);

  for (const { world, root, display } of displays) {
    const element = $(`[data-view="${world}"]`);
    // Each thumbnail uses its world's trail setting: A and B, one exposure per second (the cat walks
    // up and each exposure reads on its own; B with the background sunk), C overexposed film frames.
    const stride = { a: 30, b: 30, c: 2 }[world];
    const options: TimeViewerOptions = { engine, element, pack, time, display, tokenRoot: root, trailStride: stride };
    if (world === 'b') Object.assign(options, { layers: { frustum: false, trajectory: false }, frustumLight: false });
    const viewer = new TimeViewer(options);
    const aspect = element.clientWidth / Math.max(1, element.clientHeight);
    // The cat is small for its path: the thumbnails crop the ends of the journey so the figure
    // reads, and the cutaway shows the inside of the alley.
    if (world === 'b') {
      viewer.setCameraPreset(sidePreset(viewer.gpu.subjectBounds, pack.meta.cameras, aspect, 18, 1.35));
      viewer.setBackgroundLevel(0.08);
      viewer.setTrailLook({ tint: 0.78 });
    } else {
      viewer.setCameraPreset(viewer.defaultPreset(aspect, world === 'a' ? 30 : 34, { elevation: 18, azimuth: 60, fill: 1.25 }));
      viewer.setTrailLook({ tint: world === 'a' ? 0.18 : 0.32 });
    }
    viewer.setCutaway(true);
    viewer.setOrbit({ enabled: false, auto: world === 'c' });
    engine.add(viewer);
  }

  // Reveal: the three windows dissolve in together, in steps.
  if (prefersReducedMotion()) {
    for (const { display } of displays) display.reveal = 1;
  } else {
    let elapsed = 0;
    const off = engine.addTicker((dt) => {
      elapsed += dt;
      const t = Math.min(1, elapsed / 1.2);
      for (const { display } of displays) display.reveal = Math.ceil(t * 14) / 14;
      if (t >= 1) queueMicrotask(off);
      return t < 1;
    });
    time.play(1);
  }
}

main().catch((error) => console.error('[4D.OS · launcher]', error));
