// Crane chunk (3F): requested when the floor is less than one screen away, and only with WebGL2.
import { loadSignFont } from '../rainrun/assets';
import { settings } from '../settings';
import { getEngine, isPhone, makeDisplay } from '../stage';
import { CraneMachine } from './machine';
import { CraneSim } from './sim';
import { CraneView } from './view';

export async function bootCrane(): Promise<CraneMachine | null> {
  const root = document.querySelector<HTMLElement>('[data-crane]');
  const host = root?.querySelector<HTMLElement>('[data-crane-view]');
  if (!root || !host) return null;
  // The machine's back panel writes 景品 in DotGothic16: the Japanese face has to be ready.
  await loadSignFont();
  const sim = new CraneSim({ count: isPhone() ? 8 : 12, seed: 3303 });
  const display = makeDisplay();
  const view = new CraneView(host, display);
  root.classList.add('is-running');
  const machine = new CraneMachine({ engine: getEngine(), view, sim, root });
  display.onChange(() => machine.invalidate());
  const apply = () => {
    view.flip = settings.value.flip;
    machine.invalidate();
  };
  apply();
  settings.onChange(apply);
  if (import.meta.env.DEV) Object.assign(window, { __crane: machine });
  return machine;
}
