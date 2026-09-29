// Roof chunk (RF): the Gas Tuner and the service panel (DOM, no WebGL) and the screen that looks at the
// canyon from the parapet (GL, or a still image dithered on the CPU without WebGL2).
import { motion } from '../../shared/motion';
import { setupGasTuner } from '../gas/tuner';
import { setupService } from '../service/dip';
import { settings } from '../settings';

export async function bootRoof(gl: boolean): Promise<void> {
  const gas = document.querySelector<HTMLElement>('[data-gas]');
  if (gas) setupGasTuner(gas);
  const service = document.querySelector<HTMLElement>('[data-service]');
  if (service) setupService(service);

  const host = document.querySelector<HTMLElement>('[data-roof-view]');
  if (!host) return;
  if (!gl) {
    const { paintRoofStill } = await import('./still');
    paintRoofStill(host);
    host.closest('.roof')?.classList.add('is-running');
    return;
  }
  const [{ getEngine, makeDisplay }, { RoofView }, { loadSignFont }] = await Promise.all([
    import('../stage'),
    import('./view'),
    import('../rainrun/assets'),
  ]);
  await loadSignFont();
  const engine = getEngine();
  const display = makeDisplay();
  const view = new RoofView(host, display);
  const apply = () => {
    view.live = !motion.reduced;
    view.rain = settings.value.rain;
    view.flip = settings.value.flip;
    engine.invalidate(view);
  };
  apply();
  settings.onChange(apply);
  motion.onChange(apply);
  engine.add(view);
  display.onChange(() => engine.invalidate(view));
  host.closest('.roof')?.classList.add('is-running');
  if (import.meta.env.DEV) Object.assign(window, { __roof: view });
}
