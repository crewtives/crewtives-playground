// The lid without WebGL2: the orrery is printed in 2D when the page runs, with the same geometry and
// the same flight model (nothing baked at build time). A precomputed flight appears printed as a
// chronophotograph ("Printed flight (static view)"); "Launch" and the rocket print a new, deterministic
// flight from "Aim" and "Pull-back". The press only changes the dither of this drawing. The
// tops on the tray are printed flat with their world's inks.
import type { SharedContext } from './context';
import { displayRegistry } from '../shared/displays';
import { ghostPath } from './flight';
import { HOME, LAB, WORLD_BODIES, type WorldId } from './orbits';
import { drawOrrery, project, type OrreryPrint } from './print2d';
import { RocketInput, type PullState } from './ui/rocketInput';
import { worldPrint } from './worldInks';
import { FleetGauge } from './ui/gauge';
import { launchZip } from './voices';

const deg = Math.PI / 180;
/** Resolution of the drawing: one ink pixel every 2 CSS px, like the 3D lid. */
const PIXEL = 2;

export function bootFallback(ctx: SharedContext): void {
  const { fleet } = ctx;
  const lid = document.querySelector<HTMLElement>('#lid')!;
  const scene = lid.querySelector<HTMLElement>('.lid-scene')!;
  const anchor = lid.querySelector<HTMLElement>('.orrery-anchor')!;
  const grab = document.querySelector<HTMLButtonElement>('#rocket-grab')!;
  const canvas = document.createElement('canvas');
  canvas.className = 'lid-print';
  canvas.setAttribute('aria-hidden', 'true');
  scene.append(canvas);
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  const pull: PullState = { active: false, detents: 0, aim: 0, shakeAt: -1, preview: false };
  const gauge = new FleetGauge(document.querySelector<HTMLElement>('#gauge')!);
  for (const el of document.querySelectorAll<SVGElement>('.key-fallback')) el.removeAttribute('hidden');

  let frame = 0;
  const draw = () => {
    frame = 0;
    const box = scene.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const w = Math.max(1, Math.round(box.width / PIXEL));
    const h = Math.max(1, Math.round(box.height / PIXEL));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const print: OrreryPrint = {
      cx: (a.left + a.width / 2 - box.left) / PIXEL,
      cy: (a.top + a.height / 2 - box.top) / PIXEL,
      scale: a.width / (2 * LAB.radius) / PIXEL,
      angles: WORLD_BODIES.map((b) => fleet.planetAngle(b)),
      charted: fleet.charted,
      exposures: fleet.exposures,
      fold: ctx.fold(),
      mode: displayRegistry.mode,
      stars: 120,
      ghost: (pull.active || pull.preview) && pull.detents > 0 ? ghostPath({ detents: pull.detents, aim: pull.aim, planetTime: fleet.planetTime, planetsMove: false }, 3) : undefined,
      cradle: { pull: pull.active ? pull.detents / 12 : 0, aim: pull.active || pull.preview ? pull.aim : 0 },
    };
    drawOrrery(c, print);
    // The grab zone over the home top.
    const [hx, hy] = project(print, 0, -HOME.radius);
    const parent = (grab.offsetParent as HTMLElement | null) ?? document.body;
    const pbox = parent.getBoundingClientRect();
    grab.style.left = `${box.left + hx * PIXEL - pbox.left}px`;
    grab.style.top = `${box.top + (hy - 10) * PIXEL - pbox.top}px`;
    const reading = fleet.readout();
    gauge.setReadout(reading, !reading);
    gauge.snap();
  };
  const redraw = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };

  new RocketInput({
    button: grab,
    aimInput: document.querySelector<HTMLInputElement>('#aim')!,
    pullInput: document.querySelector<HTMLInputElement>('#pull')!,
    launchButton: document.querySelector<HTMLButtonElement>('#launch-button')!,
    pull,
    clock: () => performance.now() / 1000,
    canLaunch: () => true,
    // No animation: the whole flight is computed and printed at once.
    launch: (detents, aim) => {
      if (fleet.launch(detents, aim, { instant: true })) launchZip();
      redraw();
    },
    invalidate: redraw,
  });

  // Without the engine, the reset's return to rest animates on its own rAF (or jumps, under reduced motion).
  let driving = false;
  ctx.onReset(() => {
    redraw();
    if (driving || !fleet.ratchet) return;
    driving = true;
    let last = performance.now();
    const step = (now: number) => {
      fleet.update((now - last) / 1000);
      last = now;
      draw();
      if (fleet.ratchet) requestAnimationFrame(step);
      else driving = false;
    };
    requestAnimationFrame(step);
  });
  ctx.onSymmetry(redraw);
  displayRegistry.onChange(redraw);
  fleet.on({ end: redraw, ratchet: redraw });
  new ResizeObserver(redraw).observe(scene);
  window.addEventListener('resize', redraw);

  // The lid's precomputed flight: the same demo flight, printed in full.
  fleet.planetsMove = false;
  fleet.launch(12, -20 * deg, { demo: true, instant: true });
  redraw();

  // Flat tops in the tray sockets, with each world's inks.
  for (const socket of document.querySelectorAll<HTMLElement>('.top-socket[data-top], [data-launcher-tops]')) {
    const ids: WorldId[] = socket.dataset.top ? [socket.dataset.top as WorldId] : WORLD_BODIES.map((w) => w.id).sort();
    const tc = document.createElement('canvas');
    tc.className = 'socket-print';
    tc.setAttribute('aria-hidden', 'true');
    socket.append(tc);
    const paint = () => {
      const r = socket.getBoundingClientRect();
      tc.width = Math.max(1, Math.round(r.width / PIXEL));
      tc.height = Math.max(1, Math.round(r.height / PIXEL));
      const g = tc.getContext('2d')!;
      const ground = ids.length === 1 ? worldPrint(ids[0]).ground : 0x0b5f58;
      g.fillStyle = `#${ground.toString(16).padStart(6, '0')}`;
      g.fillRect(0, 0, tc.width, tc.height);
      ids.forEach((id, i) => {
        const p = worldPrint(id);
        const cx = ((i + 0.5) / ids.length) * tc.width;
        const R = Math.min(tc.height * 0.34, (tc.width / ids.length) * 0.36);
        flatTop(g, cx, tc.height * 0.5, R, p, ctx.fold());
      });
    };
    new ResizeObserver(paint).observe(socket);
    ctx.onSymmetry(paint);
  }
}

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** A flat top seen from above: body, n-fold bands and dots in phyllotaxis. */
function flatTop(g: CanvasRenderingContext2D, x: number, y: number, R: number, p: { base: number; band: number; dot: number }, fold: number): void {
  g.fillStyle = hex(p.base);
  g.beginPath();
  g.arc(x, y, R, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = hex(p.band);
  for (let k = 0; k < fold; k++) {
    const a = (k / fold) * Math.PI * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, R, a - 0.18, a + 0.18);
    g.closePath();
    g.fill();
  }
  g.fillStyle = hex(p.base);
  g.beginPath();
  g.arc(x, y, R * 0.7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = hex(p.dot);
  for (let k = 1; k <= 21; k++) {
    const a = k * 137.508 * deg;
    const r = 0.14 * Math.sqrt(k) * R;
    g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), Math.max(1, Math.round(R * 0.1)), Math.max(1, Math.round(R * 0.1)));
  }
  g.fillStyle = '#c7ccd4';
  g.beginPath();
  g.arc(x, y, Math.max(1, R * 0.12), 0, Math.PI * 2);
  g.fill();
}
