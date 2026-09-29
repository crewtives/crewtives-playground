// 3D chunk of Game Center Yonjigen: requested only if the browser has WebGL2. Builds the page's single
// Engine, the retro display of the 1F CRT (registered in the SCREEN selector) and Rain Run.
import type { Engine } from '../../../engine/engine/Engine';
import { getEngine, isPhone, makeDisplay } from '../stage';
import { loadSignFont } from './assets';
import { RainRunGame } from './game';
import { RainRunMachine, safeStore } from './machine';
import { RainRunView } from './view';

export interface GameCenterRuntime {
  engine: Engine;
  machine: RainRunMachine;
}

export async function bootRainRun(): Promise<GameCenterRuntime | null> {
  const screen = document.querySelector<HTMLElement>('[data-rr-view]');
  if (!screen) return null;
  const phone = isPhone();
  const engine = getEngine();
  const display = makeDisplay();

  // The canyon's signs need DotGothic16's Japanese face before they are drawn.
  await loadSignFont();
  const game = new RainRunGame(safeStore());
  const view = new RainRunView(screen, display, game.sim.tile, phone);
  const machine = new RainRunMachine({ engine, view, game });
  display.onChange(() => machine.invalidate());

  const runtime = { engine, machine };
  if (import.meta.env.DEV) Object.assign(window, { __gc: runtime });
  return runtime;
}
