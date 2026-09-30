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
import { formatBytes } from '../../engine/shell/packStats';

/** The pack's weight in binary units, read from cat-stairs/scene.json when the site is built (sites/4d-os/vite.config.ts). */
declare const __LAUNCHER_PACK_WEIGHT__: string;

const PACK_URL = `${import.meta.env.BASE_URL}packs/cat-stairs/`;
/** Narrow screens and landscape phones: stills first, and the scene live on request (design adapt-for-phones D11). */
const NARROW = '(max-width: 760px), (orientation: landscape) and (max-height: 500px)';
/** Each window's still: the landings' published capture of that world, copied byte for byte. */
const STILLS = { a: 'a-vitrine', b: 'b-plate', c: 'c-leader' } as const;

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
  const pct = $('[data-boot-pct]');
  const message = $('[data-boot-message]');
  const ask = askFirst(window.matchMedia(NARROW), status);
  const setProgress = (p: number, received = 0, total = 0) => {
    status.style.setProperty('--progress', String(p));
    pct.textContent = String(Math.round(p * 100));
    ask.progress(p, received, total);
  };

  const displays = (['a', 'b', 'c'] as const).map((world) => {
    const root = $(`.world[data-world="${world}"]`);
    const display = new RetroDisplay({ tokenRoot: root, pixelScale: 3 });
    display.reveal = 0;
    display.onChange(() => engine.invalidate());
    return { world, root, display };
  });

  // On a phone nothing of the pack is requested until the visitor asks for it; on a desktop, at once.
  await ask.go;
  let pack;
  try {
    pack = await loadPack(PACK_URL, { onProgress: setProgress });
  } catch (error) {
    message.textContent = 'Could not load the scene.';
    ask.failed();
    throw error;
  }
  setProgress(1);
  status.classList.add('is-ready');
  // The stills leave before the viewers read their boxes: each view is live in the same box.
  ask.live();

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

/**
 * Stills first on narrow screens (spec cosmic-landings, "Presence in the launcher"). While `query` matches
 * and the scene has not been asked for, each of windows A, B and C shows its world's still inside its view's
 * box (the box keeps its role and description, so the still is `alt=""`), its title bar says "still", and a
 * "Run the scene live" button under the lede, with the pack's weight, takes the place of the progress line.
 * Activating it resolves `go`: the button keeps its place and the focus (`aria-disabled`, never `disabled`),
 * shows the progress in its label, then reads "Scene live", which a status node of its own announces
 * (`.status` is a live region that also holds the ticking timecode). On a desktop, or when the query stops
 * matching before the visitor asks, `go` resolves at once and the page loads as it always has; whatever
 * the query created is removed when it stops matching, and the progress line comes back.
 */
function askFirst(query: MediaQueryList, status: HTMLElement): { go: Promise<void>; progress: (p: number, received: number, total: number) => void; live: () => void; failed: () => void } {
  const line = status.querySelector<HTMLElement>('.status__line')!;
  const lede = $('.stage__lede');
  let phase: 'asking' | 'loading' | 'live' | 'failed' = query.matches ? 'asking' : 'loading';
  let asked = false;
  let label = `Run the scene live · ${__LAUNCHER_PACK_WEIGHT__}`;
  let fraction = 0;
  let button: HTMLButtonElement | null = null;
  let announcer: HTMLElement | null = null;
  let start: () => void = () => {};
  const go = new Promise<void>((resolve) => (start = resolve));
  const windows = (Object.keys(STILLS) as Array<keyof typeof STILLS>).map((world) => ({
    world,
    view: $(`.world__view[data-view="${world}"]`),
    title: $(`.world[data-world="${world}"] .world__title`),
  }));

  const activate = () => {
    if (phase !== 'asking') return;
    phase = 'loading';
    asked = true;
    label = `Loading 0% · 0.0 / ${__LAUNCHER_PACK_WEIGHT__}`;
    render();
    start();
  };

  const render = () => {
    const phone = query.matches && (phase === 'asking' || asked);
    // The progress line: replaced by the button while it exists.
    if (phone) line.remove();
    else if (!line.isConnected) status.prepend(line);

    if (phone && !button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'stage__run';
      button.addEventListener('click', activate);
      announcer = document.createElement('p');
      announcer.className = 'stage__status';
      announcer.setAttribute('role', 'status');
      lede.after(button, announcer);
    } else if (!phone && button) {
      button.remove();
      announcer?.remove();
      button = null;
      announcer = null;
    }
    if (button) {
      button.textContent = label;
      button.classList.toggle('is-loading', phase === 'loading');
      button.classList.toggle('is-live', phase === 'live');
      button.style.setProperty('--progress', String(fraction));
      if (phase === 'asking') button.removeAttribute('aria-disabled');
      else button.setAttribute('aria-disabled', 'true');
    }

    const stills = phone && phase !== 'live';
    for (const { world, view, title } of windows) {
      const still = view.querySelector('.world__still');
      if (stills && !still) {
        const img = document.createElement('img');
        img.className = 'world__still';
        img.src = `${import.meta.env.BASE_URL}launcher/${STILLS[world]}.webp`;
        img.width = 1200;
        img.height = 900;
        img.alt = '';
        img.decoding = 'async';
        view.append(img);
        const tag = document.createElement('span');
        tag.className = 'world__tag';
        tag.textContent = 'still';
        title.firstElementChild!.after(tag);
      } else if (!stills && still) {
        still.remove();
        title.querySelector('.world__tag')?.remove();
      }
    }
  };

  render();
  query.addEventListener('change', () => {
    // Leaving the narrow layout before asking: load as the desktop does.
    if (phase === 'asking' && !query.matches) {
      phase = 'loading';
      start();
    }
    render();
  });
  if (phase === 'loading') start();

  return {
    go,
    progress: (p, received, total) => {
      // The loader reports the bytes; the last call, after the load, only sets 100 %.
      if (phase !== 'loading' || !total) return;
      fraction = p;
      const mib = (bytes: number) => (bytes / 1024 ** 2).toFixed(1);
      label = `Loading ${Math.round(p * 100)}% · ${mib(received)} / ${formatBytes(total)}`;
      if (button) {
        button.textContent = label;
        button.style.setProperty('--progress', String(p));
      }
    },
    live: () => {
      phase = 'live';
      label = 'Scene live';
      render();
      if (announcer) announcer.textContent = 'Scene live';
    },
    failed: () => {
      phase = 'failed';
      label = 'Could not load the scene';
      render();
      if (announcer) announcer.textContent = 'Could not load the scene.';
    },
  };
}

main().catch((error) => console.error('[4D.OS · launcher]', error));
