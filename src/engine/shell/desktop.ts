import type { DisplayMode, RetroDisplay } from '../display/RetroDisplay';
import type { Pack } from '../pack/loader';
import { playbackLabel, timecode, type TimeController, type TimeMode } from '../time/TimeController';
import { bindTimeKeys } from './keyboard';
import { fillStats } from './packStats';
import { trackSourceFrame } from './sourceFrames';
import { bindTimeline, renderRuler } from './timeline';
import { bindWallClock } from './wallClock';
import { bindWindowTrail } from './windowTrail';

export type LayerName = 'trail' | 'background' | 'frustum' | 'trajectory';

/** What the desktop needs from the viewer; the core TimeViewer provides it. */
export interface ViewerControls {
  setLayers(layers: Partial<Record<LayerName, boolean>>): void;
}

export interface DesktopOptions {
  time: TimeController;
  display: RetroDisplay;
  pack: Pack;
  viewer?: ViewerControls;
  /** Where to look for the markup (by default, the whole document). */
  root?: ParentNode;
  /** Installs the global keyboard (space, J/K/L, arrows). */
  keyboard?: boolean;
}

const PLAY_PATH = 'M3 2 L10 6 L3 10 Z';
const HOLD_PATH = 'M3 2 H5 V10 H3 Z M7 2 H9 V10 H7 Z';

/**
 * Connects the standard markup of the 4D.OS desktop to the time, the display and the viewer:
 * - `[data-now="timecode|frame|state"]`: live text of the NOW;
 * - `<html data-direction>` and `--accent-current`: playback direction for the world's CSS;
 * - `[data-play]`: HOLD/resume; `input[name=mode]`: memory/all; `input[name=depth]`: display;
 * - `[data-layer]`: viewer layers; `[data-track]` + `[data-ruler]`: timeline;
 * - `[data-source-frame]`: current source frame; `[data-wall-clock]`; `[data-stat]`: pack figures;
 * - `[data-trail]`: window echo; `[data-dismiss]`: closes its window.
 * Each world supplies the composition and the CSS; the behavior is the same in all three.
 */
export function bindDesktop(options: DesktopOptions): () => void {
  const { time, display, pack, viewer } = options;
  const root = options.root ?? document;
  const html = document.documentElement;
  const offs: Array<() => void> = [];
  const all = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector));

  // --- the NOW ------------------------------------------------------------------------------
  const nowNodes = all<HTMLElement>('[data-now]');
  const sources = all<HTMLElement>('[data-source-frame]').map((el) =>
    trackSourceFrame(el, pack.url, pack.meta, () => time.frame),
  );
  offs.push(() => sources.forEach((s) => s.dispose()));

  const plays = all<HTMLButtonElement>('[data-play]');
  const modeInputs = all<HTMLInputElement>('input[name="mode"]');

  const sync = () => {
    const state = time.state;
    for (const node of nowNodes) {
      switch (node.dataset.now) {
        case 'timecode':
          node.textContent = timecode(state.frame, time.fps);
          break;
        case 'frame':
          node.textContent = String(state.frame).padStart(3, '0');
          break;
        case 'state':
          node.textContent = playbackLabel(state);
          break;
      }
    }
    html.dataset.direction = String(state.direction);
    const accent = state.direction > 0 ? '--accent-forward' : state.direction < 0 ? '--accent-rewind' : '--accent-hold';
    html.style.setProperty('--accent-current', `var(${accent})`);
    for (const button of plays) {
      const playing = time.playing;
      button.setAttribute('aria-label', playing ? 'Hold' : 'Play');
      button.setAttribute('aria-pressed', String(playing));
      button.querySelector('path')?.setAttribute('d', playing ? HOLD_PATH : PLAY_PATH);
    }
    for (const input of modeInputs) input.checked = input.value === state.mode;
    for (const source of sources) source.update();
  };
  offs.push(time.subscribe(sync));
  sync();

  // --- controls -----------------------------------------------------------------------------
  for (const button of plays) {
    const onClick = () => time.togglePlay();
    button.addEventListener('click', onClick);
    offs.push(() => button.removeEventListener('click', onClick));
  }

  for (const input of modeInputs) {
    const onChange = () => input.checked && time.setMode(input.value as TimeMode);
    input.addEventListener('change', onChange);
    offs.push(() => input.removeEventListener('change', onChange));
  }

  const depthInputs = all<HTMLInputElement>('input[name="depth"]');
  const syncDepth = () => {
    for (const input of depthInputs) input.checked = input.value === display.mode;
  };
  for (const input of depthInputs) {
    const onChange = () => {
      if (input.checked) display.mode = input.value as DisplayMode;
    };
    input.addEventListener('change', onChange);
    offs.push(() => input.removeEventListener('change', onChange));
  }
  offs.push(display.onChange(syncDepth));
  syncDepth();

  for (const input of all<HTMLInputElement>('input[data-layer]')) {
    const onChange = () => viewer?.setLayers({ [input.dataset.layer as LayerName]: input.checked });
    input.addEventListener('change', onChange);
    offs.push(() => input.removeEventListener('change', onChange));
  }

  for (const ruler of all<HTMLElement>('[data-ruler]')) renderRuler(ruler, time.frameCount, time.fps);
  for (const track of all<HTMLElement>('[data-track]')) offs.push(bindTimeline(track, time));
  for (const clock of all<HTMLElement>('[data-wall-clock]')) offs.push(bindWallClock(clock));

  fillStats(document, pack.meta);

  for (const win of all<HTMLElement>('[data-trail]')) offs.push(bindWindowTrail(win));
  for (const button of all<HTMLElement>('[data-dismiss]')) {
    const onClick = () => {
      const win = button.closest<HTMLElement>('.win');
      if (win) win.hidden = true;
    };
    button.addEventListener('click', onClick);
    offs.push(() => button.removeEventListener('click', onClick));
  }

  if (options.keyboard ?? true) offs.push(bindTimeKeys(time));

  return () => offs.splice(0).forEach((off) => off());
}
