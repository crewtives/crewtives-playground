// The fold (D7): the house's only 3D moment. This module is lightweight (state, axonometry and
// "House pixels"); the 3D view (three.js, Engine and RetroDisplay) lives in fold3d.ts and is only
// requested with the first fold, and only if there is WebGL2. Without WebGL2 the axonometry of the
// dihedron that the build generates is shown, and no 3D code is requested.

import type { DisplayMode } from '../../engine/display/RetroDisplay';
import type { AxoNowPoint } from './build/axonometry';
import type { PageClock } from './clock';
import type { Engine, FoldView } from './fold3d';

export interface FoldOptions {
  clock: PageClock;
  reduced: boolean;
  webgl2: boolean;
  /** Clock position the sheet shows (its VISTA and its épure): the fold's NOW is the same. */
  frameOf: () => number;
  /** Trail moment the NOW marks at each clock position (empty on sheet 000). */
  nowMoments: number[];
  /** The fold was opened by a drag on the ground line: the rotation follows the gesture (drag) until release. */
  dragged?: boolean;
}

// ── Module state: a single fold at a time ────────────────────────────────────────────────────────
let engine: Engine | null = null;
interface Folded {
  figure: HTMLElement;
  view: FoldView | null;
}
interface Open {
  sheet: HTMLElement;
  parts: Folded[];
  /** Paints the NOW at the position the sheet shows. */
  paint: () => void;
  cleanup: () => void;
}
let open: Open | null = null;
/**
 * Each requested fold carries a number. If another fold or an unfold replaces it while it waits for the
 * 3D code or the axonometry, it does not open: there are never two folded sheets or orphaned views.
 */
let generation = 0;
/** Fraction of the rotation (0 to 1 of the 90°) while a drag on the ground line lasts, or null. */
let held: number | null = null;

/** Animation progress at which the plane sits at that fraction of the 90° (the inverse of the quartic curve in fold3d.ts). */
const unease = (fraction: number) => 1 - Math.pow(1 - fraction, 1 / 4);

/** "House pixels": color depth of this sheet's fold views only. */
function housePixels(views: FoldView[], modes: readonly { id: DisplayMode; label: string }[]): HTMLElement {
  const box = document.createElement('fieldset');
  box.className = 'house-pixels';
  const legend = document.createElement('legend');
  legend.textContent = 'House pixels';
  box.append(legend);
  const name = `house-pixels-${Math.random().toString(36).slice(2, 7)}`;
  for (const mode of modes) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = mode.id;
    input.checked = mode.id === views[0].display.mode;
    input.addEventListener('change', () => {
      for (const view of views) {
        view.display.mode = mode.id as DisplayMode;
        engine?.invalidate(view);
      }
    });
    label.append(input, mode.label.replace(/ colors$/, ''));
    box.append(label);
  }
  const note = document.createElement('p');
  note.textContent = 'Only this fold changes. The loops are recordings in 16 colors.';
  box.append(note);
  return box;
}

/**
 * Moves the NOW of an axonometry (the point and its two reference lines) to the clock position: the
 * build publishes the NOW of each position in `data-nows` (`AxoNowPoint`), with the same index as the
 * épure's.
 */
function paintAxonometryNow(svg: Element, point: AxoNowPoint): void {
  const [x, y, px, py, ex, ey] = point;
  const dot = svg.querySelector('.ep-now');
  dot?.setAttribute('cx', String(x));
  dot?.setAttribute('cy', String(y));
  svg.querySelector('.axo-ref')?.setAttribute('d', `M${x},${y}L${px},${py}M${x},${y}L${ex},${ey}`);
}

/** Folds a sheet. Returns false if another fold or an unfold replaced it before it opened. */
export async function fold(sheet: HTMLElement, options: FoldOptions): Promise<boolean> {
  if (open?.sheet === sheet) return true;
  // Unfolding another sheet does not take away this one's drag progress.
  const keep = options.dragged ? held : null;
  if (open) unfold(open.sheet, true);
  held = keep;
  const token = ++generation;
  const figures = Array.from(sheet.querySelectorAll<HTMLElement>('.sheet__epure')).filter((f) => f.querySelector('svg.epure'));
  if (!figures.length) return false;
  let last = { frame: -1, rewinding: false };
  const changed = () => {
    const now = { frame: options.frameOf(), rewinding: options.clock.state === 'rewind' };
    if (now.frame === last.frame && now.rewinding === last.rewinding) return null;
    last = now;
    return now;
  };

  if (!options.webgl2) {
    // Without WebGL2: the axonometry of the dihedron of each épure, generated at build time. No 3D code is requested.
    const svgs = await Promise.all(
      figures.map(async (figure) => {
        const url = figure.dataset.axonometry;
        if (!url) return '';
        const res = await fetch(url);
        return res.ok ? res.text() : '';
      }),
    );
    if (token !== generation) return false;
    const holders = figures.map((figure, i) => {
      const holder = document.createElement('div');
      holder.className = 'fold-axo';
      holder.innerHTML = svgs[i];
      figure.classList.add('is-folding');
      figure.append(holder);
      return holder;
    });
    // The explanation, next to the drawing that replaces the 3D fold.
    const note = document.createElement('p');
    note.className = 'fold-axo__note';
    note.textContent = 'No WebGL2 in this browser: the fold is drawn as an axonometry.';
    holders[holders.length - 1].append(note);
    const moving = holders.flatMap((holder) => {
      const svg = holder.querySelector('svg');
      const nows = svg?.getAttribute('data-nows');
      return svg && nows ? [{ svg, points: JSON.parse(nows) as AxoNowPoint[] }] : [];
    });
    const paint = () => {
      const now = changed();
      if (!now) return;
      for (const { svg, points } of moving) {
        const point = points[Math.min(now.frame, points.length - 1)];
        if (point) paintAxonometryNow(svg, point);
      }
    };
    paint();
    const unsubscribe = options.clock.subscribe(paint);
    open = {
      sheet,
      parts: figures.map((figure) => ({ figure, view: null })),
      paint,
      cleanup: () => {
        unsubscribe();
        holders.forEach((h) => h.remove());
      },
    };
    return true;
  }

  const three = await import('./fold3d');
  if (token !== generation) return false;
  if (!engine) {
    engine = new three.Engine({ maxDpr: 2 });
    // The engine's canvas is image only: each fold view carries the name and the description.
    engine.canvas.setAttribute('aria-hidden', 'true');
  }
  const parts: Folded[] = [];
  for (const figure of figures) {
    const svg = figure.querySelector<SVGSVGElement>('svg.epure')!;
    const geometry = three.readGeometry(svg);
    if (!geometry) continue;
    const element = document.createElement('div');
    element.className = 'fold-view';
    element.setAttribute('role', 'img');
    const title = svg.querySelector('title')?.textContent ?? 'The épure';
    element.setAttribute(
      'aria-label',
      `${title}, folded to a right dihedral angle: the figure stands in space above the horizontal plane, with its projections on both planes.`,
    );
    if (svg.id) element.setAttribute('aria-describedby', `${svg.id}-desc`);
    figure.append(element);
    const view = new three.FoldView(element, geometry);
    if (held !== null) {
      // A drag in progress: the plane starts at the gesture's angle and follows it.
      view.angle = view.target = unease(held);
      view.update();
    } else {
      view.target = 1;
      if (options.reduced) view.jump();
    }
    figure.classList.add('is-folding');
    engine.add(view);
    parts.push({ figure, view });
  }
  const views = parts.map((p) => p.view!);
  const moments = options.nowMoments;
  const paint = () => {
    // The NOW of the dihedron is the same moment the épure marks.
    const now = changed();
    if (!now) return;
    for (const view of views) {
      view.nowIndex = moments[Math.min(now.frame, moments.length - 1)] ?? 0;
      view.rewinding = now.rewinding;
      view.update();
      engine?.invalidate(view);
    }
  };
  paint();
  const unsubscribe = options.clock.subscribe(paint);
  const pixels = housePixels(views, three.DISPLAY_MODES);
  parts[parts.length - 1].figure.append(pixels);
  const stop = engine.addTicker((dt) => views.map((view) => view.tick(dt)).some(Boolean));
  open = {
    sheet,
    parts,
    paint,
    cleanup: () => {
      unsubscribe();
      stop();
      pixels.remove();
    },
  };
  return true;
}

/** The sheet changed position without the clock changing (its loops arrived, or "Play loop"). */
export function repaint(): void {
  open?.paint();
}

const openViews = () => (open?.parts ?? []).map((p) => p.view).filter((v): v is FoldView => !!v);

/** Drag on the ground line: the plane sits at that fraction of the 90° (0 to 1). */
export function drag(fraction: number): void {
  held = fraction;
  for (const view of openViews()) {
    view.angle = view.target = unease(fraction);
    view.update();
    engine?.invalidate(view);
  }
}

/** Releasing the drag past halfway: the plane finishes rising to 90° with the usual curve. */
export function settle(): void {
  held = null;
  for (const view of openViews()) {
    view.target = 1;
    engine?.invalidate(view);
  }
}

/** Returns to flat. `immediate`: without animating (another sheet is folding, or reduced motion). */
export function unfold(sheet: HTMLElement, immediate = false): void {
  // It also cancels a fold that is still waiting for its code.
  generation++;
  held = null;
  if (!open || open.sheet !== sheet) return;
  const { parts, cleanup } = open;
  open = null;
  cleanup();
  const finish = () => {
    for (const { figure, view } of parts) {
      if (view) {
        engine?.remove(view);
        view.element.remove();
        view.dispose();
      }
      // If the sheet was folded again while this return was animating, the épure stays hidden.
      if (!open?.parts.some((p) => p.figure === figure)) figure.classList.remove('is-folding');
    }
  };
  const views = parts.map((p) => p.view).filter((v): v is FoldView => !!v);
  if (!views.length || immediate) return finish();
  for (const view of views) view.target = 0;
  const stop = engine!.addTicker((dt) => {
    const moving = views.map((view) => {
      const m = view.tick(dt);
      engine!.invalidate(view);
      return m;
    }).some(Boolean);
    if (!moving) {
      stop();
      finish();
    }
    return moving;
  });
}
