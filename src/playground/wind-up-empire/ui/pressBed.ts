// The press's proof bed (design adapt-for-phones D8): where the Litho Press sits screens away from the
// lid it reprints (at 900 px or less, and on phones in landscape), the press pulls its own flat proof of
// the lid beside its switches, so each change of inks, exposure memory or symmetry shows where the
// finger is. It is a 2D print from the same geometry as the lid without WebGL2 (print2d.ts), labeled
// "Proof · printed flat" so it never passes for the lid itself. It exists only while the gate matches,
// prints once when it first comes near the view and again on every committed change of the press,
// and paints nothing at rest: no animation, no loop. The print module is loaded on the first print,
// so the bed adds nothing to the page's first load.
import type { DisplayMode } from '../../../engine/display/RetroDisplay';
import { RATCHET_CLICKS, RATCHET_CLICK_S, type Fleet } from '../fleet';
import { WORLD_BODIES } from '../orbits';

/** Height of the bed's print in CSS px; one ink pixel per CSS px, as sharp as the tray's tops. */
const BED_H = 128;
/** The lid camera's squash of the ecliptic (print2d.ts): sin(44.4°). */
const SQUASH = Math.sin((44.4 * Math.PI) / 180);
/** The print frames the five worlds' rings with their tops; the home and lab rings run off the edges. */
const FRAME_RADIUS = WORLD_BODIES[WORLD_BODIES.length - 1].radius + 0.4;

export interface PressBedOptions {
  /** The press plate (`.press`); the bed goes right after its die. */
  press: HTMLElement;
  fleet: Fleet;
  fold: () => number;
  mode: () => DisplayMode;
  /** The gate the bed lives under (a media query string). */
  query: string;
}

export interface PressBed {
  /** Prints the bed now if it exists and is shown (the press changed); otherwise nothing. */
  print(): void;
}

/** Creates the bed while `query` matches and removes it, with its observers, when it stops matching. */
export function bindPressBed(o: PressBedOptions): PressBed {
  const gate = window.matchMedia(o.query);
  let root: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let observers: { disconnect(): void }[] = [];
  let seen = false;
  let width = 0;
  let pending = 0;

  const print = () => {
    if (!root || !canvas || !seen || root.offsetParent === null) return;
    const target = canvas;
    // During the reset's return to rest the planets are moving: the bed prints where they stop.
    if (o.fleet.ratchet) {
      window.clearTimeout(pending);
      const left = RATCHET_CLICKS * RATCHET_CLICK_S - (o.fleet.now - o.fleet.ratchet.start);
      pending = window.setTimeout(print, Math.max(0, left) * 1000 + 50);
      return;
    }
    void import('../print2d').then(({ drawOrrery }) => {
      if (target !== canvas || !target.isConnected) return;
      const w = Math.max(1, Math.round(target.clientWidth));
      const h = BED_H;
      if (target.width !== w || target.height !== h) {
        target.width = w;
        target.height = h;
      }
      width = w;
      const fleet = o.fleet;
      // What the lid keeps in view: the exposures inside the exposure memory (12 per second of flight).
      const memory = fleet.memory / 12;
      const exposures = fleet.exposures.filter((e) => fleet.now - e.birth <= memory + 1e-6);
      const scale = Math.min((h / 2) * 0.94 / (FRAME_RADIUS * SQUASH), (w / 2) * 0.94 / FRAME_RADIUS);
      drawOrrery(target.getContext('2d', { willReadFrequently: true })!, {
        cx: w / 2,
        cy: h / 2,
        scale,
        angles: WORLD_BODIES.map((b) => fleet.planetAngle(b)),
        charted: fleet.charted,
        exposures,
        fold: o.fold(),
        mode: o.mode(),
        stars: 48,
      });
    });
  };

  const create = () => {
    root = document.createElement('div');
    root.className = 'press-bed';
    root.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    canvas.className = 'press-bed-print';
    canvas.width = 1;
    canvas.height = 1;
    const caption = document.createElement('p');
    caption.className = 'press-bed-caption';
    caption.textContent = 'Proof · printed flat';
    root.append(canvas, caption);
    const die = o.press.querySelector('.press-die');
    if (die) die.after(root);
    else o.press.prepend(root);
    seen = false;
    width = 0;
    // The first print when the bed comes within 200 px of the view, as the print proof does.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen = true;
        near.disconnect();
        print();
      },
      { rootMargin: '200px 0px 200px 0px' },
    );
    near.observe(root);
    // A new width (rotation) prints again at the new size; nothing else repaints it.
    const resized = new ResizeObserver(() => {
      if (seen && canvas && Math.round(canvas.clientWidth) !== width) print();
    });
    resized.observe(canvas);
    observers = [near, resized];
  };

  const remove = () => {
    window.clearTimeout(pending);
    for (const observer of observers) observer.disconnect();
    observers = [];
    root?.remove();
    root = null;
    canvas = null;
  };

  const sync = () => {
    if (gate.matches && !root) create();
    else if (!gate.matches && root) remove();
  };
  gate.addEventListener('change', sync);
  sync();
  return { print };
}
