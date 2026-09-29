// The page's single Engine (D4): the first floor that needs it creates it and every floor shares it
// (Rain Run, the crane, the glass and the roof). It lives in the 3D chunk: imported only with WebGL2.
import { Engine } from '../../engine/engine/Engine';
import { RetroDisplay } from '../../engine/display/RetroDisplay';
import { displayRegistry } from '../shared/displays';

let engine: Engine | null = null;

export function getEngine(): Engine {
  if (!engine) {
    const touchPhone = window.matchMedia('(pointer: coarse) and (max-width: 800px)').matches;
    engine = new Engine({ maxDpr: touchPhone ? 1.5 : 2 });
    // The canvas only paints views that already have an accessible name on their DOM element.
    engine.canvas.setAttribute('aria-hidden', 'true');
  }
  return engine;
}

export const isPhone = (): boolean => window.matchMedia('(max-width: 767px)').matches;

/** A new retro display, registered in the page's screen selector. */
export function makeDisplay(pixelScale = isPhone() ? 4 : 3): RetroDisplay {
  const display = new RetroDisplay({ mode: displayRegistry.mode, pixelScale });
  displayRegistry.register(display);
  return display;
}
