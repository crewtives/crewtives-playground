// The WebGL part of the Scope (a dynamic chunk: only requested when WebGL2 exists). One Engine per
// page, the shared cell, and the folded views with their retro display masked to a circle. The
// chamber physics runs as an Engine ticker: it stays alive even when the eyepiece leaves the screen (D6).

import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import { Engine } from '../../../engine/engine/Engine';
import { displayRegistry } from '../../shared/displays';
import { motion } from '../../shared/motion';
import { CellRenderer } from './cell';
import type { Chamber } from './chamber';
import type { ScopeController, ScopeRenderer } from './controller';
import type { MirrorMode } from './fold';
import { FoldView } from './foldView';
import type { Specimen } from '../specimens/spec';

export interface ScopeGl {
  engine: Engine;
  cell: CellRenderer;
  /** Creates one more folded view (a peephole) that shares the cell. */
  addPeephole(element: HTMLElement, tokenRoot: Element): FoldView;
}

export function mountScopeGl(controller: ScopeController, hero: HTMLElement, eyepiece: HTMLElement, inset: HTMLElement): ScopeGl {
  const coarse = window.matchMedia('(pointer: coarse) and (max-width: 800px)').matches;
  const engine = new Engine({ maxDpr: coarse ? 1.5 : 2 });
  // The single canvas is only a surface: each view already has its name and description in the DOM.
  engine.canvas.setAttribute('aria-hidden', 'true');
  const cell = new CellRenderer();
  const folds: FoldView[] = [];

  const makeView = (element: HTMLElement, tokenRoot: Element, pixelScale: number, raw = false): FoldView => {
    const display = new RetroDisplay({ tokenRoot, pixelScale });
    displayRegistry.register(display);
    display.onChange(() => engine.invalidate(view));
    const view = new FoldView(element, { display, cell, raw });
    folds.push(view);
    engine.add(view);
    return view;
  };

  const scope = makeView(eyepiece, hero, 2);
  makeView(inset, hero, 2, true);

  // The display's reveal: only once, on load (not under reduced motion).
  if (!motion.reduced) {
    scope.reveal = 0;
    const start = performance.now();
    const stop = engine.addTicker((_dt, now) => {
      const t = Math.min(1, (now - start) / 700);
      scope.reveal = 1 - Math.pow(1 - t, 3);
      engine.invalidate(scope);
      if (t >= 1) stop();
      return t < 1;
    });
  }

  let mode: MirrorMode = controller.mode;
  let beta = 0;
  const renderer: ScopeRenderer = {
    setSpecimens(specimens: Specimen[]) {
      cell.setSpecimens(specimens);
    },
    sync(chamber: Chamber, nextMode: MirrorMode, nextBeta: number, exposures: boolean) {
      mode = nextMode;
      beta = nextBeta;
      cell.exposures = exposures;
      cell.sync(chamber);
      for (const view of folds) {
        view.configure(mode, beta);
        engine.invalidate(view);
      }
    },
    wake() {
      engine.requestFrame();
    },
  };
  controller.attach(renderer);
  engine.addTicker((dt) => controller.tick(dt));
  // Development only: the browser tests read the engine counters and the Scope state.
  if (import.meta.env.DEV) Object.assign(window, { __bloomscope: { engine, controller } });

  return {
    engine,
    cell,
    addPeephole(element: HTMLElement, tokenRoot: Element) {
      const view = makeView(element, tokenRoot, 3);
      view.configure(mode, beta);
      return view;
    },
  };
}
