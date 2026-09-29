// Parlour Glass chunk (4F): with WebGL2, a GL view in the single Engine; without WebGL2, the same physics
// in Canvas 2D with fewer balls and no rewind. Requested when the floor is less than one screen away.
import { motion } from '../../shared/motion';
import { settings } from '../settings';
import { initialState, ParlourMachine, type ParlourScreen } from './machine';
import { ParlourSim } from './sim';
import { DEFAULT_MACHINE, decodeMachine } from './url';

export async function bootParlour(gl: boolean): Promise<ParlourMachine | null> {
  // The machine spans the whole row: the cabinet and the two control panels.
  const cabinet = document.querySelector<HTMLElement>('[data-parlour]');
  const root = cabinet?.closest<HTMLElement>('.machine-row');
  const host = cabinet?.querySelector<HTMLElement>('[data-parlour-view]');
  if (!cabinet || !root || !host) return null;
  const phone = window.matchMedia('(max-width: 767px)').matches;
  const state = initialState(location.hash, DEFAULT_MACHINE);
  const sim = new ParlourSim({
    seed: state.seed,
    symmetry: state.symmetry,
    maxBalls: gl ? (phone ? 140 : 320) : 60,
    history: gl ? (phone ? 8 : 12) : 0,
    dots: gl ? (phone ? 200_000 : 400_000) : 60_000,
  });
  // With reduced motion and no state in the address, the glass arrives exposed in EVERY MOMENT.
  if (motion.reduced && !decodeMachine(location.hash)) state.shutter = 'all';

  let machine: ParlourMachine;
  if (gl) {
    const [{ getEngine, makeDisplay }, { ParlourView }] = await Promise.all([import('../stage'), import('./view')]);
    const engine = getEngine();
    const display = makeDisplay(phone ? 3 : 2);
    const view = new ParlourView(host, display, sim);
    const engineView = {
      element: host,
      tick: (dt: number) => machine.tick(dt),
      render: view.render.bind(view),
    };
    const screen: ParlourScreen = {
      get shutter() {
        return view.shutter;
      },
      set shutter(s) {
        view.shutter = s;
      },
      get flip() {
        return view.flip;
      },
      set flip(f) {
        view.flip = f;
      },
      paint: () => engine.invalidate(engineView),
      wake: () => engine.invalidate(engineView),
    };
    machine = new ParlourMachine({ sim, screen, root, rewind: true, state });
    engine.add(engineView);
    display.onChange(() => engine.invalidate(engineView));
  } else {
    const { ParlourView2D } = await import('./view2d');
    const view = new ParlourView2D(host, sim);
    let raf = 0;
    let last = 0;
    let visible = true;
    const loop = (now: number) => {
      raf = 0;
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      const more = machine.tick(dt);
      view.render();
      if (more && visible && !document.hidden) raf = requestAnimationFrame(loop);
      else last = 0;
    };
    const screen: ParlourScreen = {
      get shutter() {
        return view.shutter;
      },
      set shutter(s) {
        view.shutter = s;
      },
      get flip() {
        return view.flip;
      },
      set flip(f) {
        view.flip = f;
      },
      paint: () => view.render(),
      wake: () => {
        if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
      },
    };
    machine = new ParlourMachine({ sim, screen, root, rewind: false, state });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) screen.wake();
    }).observe(host);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) screen.wake();
    });
    root.querySelector<HTMLElement>('[data-parlour-note]')?.removeAttribute('hidden');
  }
  cabinet.classList.add('is-running');
  const applyFlip = () => {
    machine.screen.flip = settings.value.flip;
    machine.screen.paint();
  };
  applyFlip();
  settings.onChange(applyFlip);
  if (import.meta.env.DEV) Object.assign(window, { __parlour: machine });
  return machine;
}
