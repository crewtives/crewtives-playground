import type { RetroDisplay } from '../display/RetroDisplay';
import type { Engine } from '../engine/Engine';
import { loadPack, PackError, type LoadOptions, type Pack } from '../pack/loader';
import { prefersReducedMotion } from '../display/cssColor';

export interface BootOptions {
  url: string;
  /** Boot window containing [data-boot-fill], [data-boot-pct] and [data-boot-message]. */
  boot: HTMLElement;
  display: RetroDisplay;
  engine: Engine;
  /** Duration of the reveal dissolve (ms). */
  revealMs?: number;
  /** Steps of the dissolve: the threshold advances in jumps, like on a low-bit display. */
  revealSteps?: number;
  /** Error text, in the world's own voice. */
  errorText?: (error: unknown) => string;
  /** Options passed to `loadPack` (for example `source: false`, spec 4d-pack "Layers a page never draws"). */
  load?: Omit<LoadOptions, 'onProgress'>;
  /** The load progress, also reported to the caller: 0–1, and the bytes received over the total requested. */
  onProgress?: (progress: number, received: number, total: number) => void;
}

export function defaultErrorText(error: unknown): string {
  if (error instanceof PackError) return `Could not load the ${error.layer} layer: ${error.reason}.`;
  return 'Could not load the scene.';
}

/**
 * Desktop boot: loads the 4D pack while showing the real progress (bytes received), then reveals
 * the scene with a threshold dissolve on the display. With reduced motion the reveal is
 * instant. If loading fails, the window stays visible with the reason and the promise rejects.
 */
export async function bootPack(options: BootOptions): Promise<Pack> {
  const { boot, display, engine } = options;
  const fill = boot.querySelector<HTMLElement>('[data-boot-fill]');
  const pct = boot.querySelector<HTMLElement>('[data-boot-pct]');
  const message = boot.querySelector<HTMLElement>('[data-boot-message]');
  const setProgress = (p: number) => {
    boot.style.setProperty('--progress', String(p));
    fill?.style.setProperty('--progress', String(p));
    if (pct) pct.textContent = String(Math.round(p * 100));
  };

  display.reveal = 0;
  setProgress(0);
  boot.hidden = false;

  let pack: Pack;
  try {
    pack = await loadPack(options.url, {
      ...options.load,
      onProgress: (p, received, total) => {
        setProgress(p);
        options.onProgress?.(p, received, total);
      },
    });
  } catch (error) {
    boot.classList.add('is-error');
    if (message) message.textContent = (options.errorText ?? defaultErrorText)(error);
    throw error;
  }
  setProgress(1);

  if (prefersReducedMotion()) {
    display.reveal = 1;
    boot.hidden = true;
    return pack;
  }

  const duration = (options.revealMs ?? 1100) / 1000;
  const steps = options.revealSteps ?? 14;
  let elapsed = 0;
  const off = engine.addTicker((dt) => {
    elapsed += dt;
    const t = Math.min(1, elapsed / duration);
    display.reveal = Math.ceil(t * steps) / steps;
    if (t >= 0.35) boot.hidden = true;
    if (t >= 1) {
      queueMicrotask(off);
      return false;
    }
    return true;
  });
  return pack;
}
