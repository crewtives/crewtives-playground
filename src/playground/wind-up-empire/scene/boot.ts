// The lid's 3D chunk: a single Engine, the 16-ink RetroDisplay registered with the page, the orrery
// with its nameplates, the friction rocket, the FLEET gauge, the 3D key and the tray tops. It is
// imported only when WebGL2 is available.
import { Engine } from '../../../engine/engine/Engine';
import { RetroDisplay, type DisplayMask } from '../../../engine/display/RetroDisplay';
import { displayRegistry } from '../../shared/displays';
import { motion } from '../../shared/motion';
import { applyEdgeShade } from '../bayerTile';
import type { SharedContext } from '../context';
import { clank, detentTick, hum, launchZip, swallowGlide, whine } from '../voices';
import { FleetGauge } from '../ui/gauge';
import { Nameplates } from '../ui/nameplates';
import { RocketInput, type PullState } from '../ui/rocketInput';
import { WORLD_BODIES } from '../orbits';
import { OrreryView } from './orrery';
import { KeyView } from './keyView';
import { createTrayTops } from './trayTops';

/** Delay of the demo flight after load (s). */
const DEMO_AT = 0.8;
const deg = Math.PI / 180;

export function bootScene(ctx: SharedContext): void {
  const { fleet, economy, hangar, phone } = ctx;
  const engine = new Engine({ maxDpr: phone ? 1.5 : 2 });
  // The single canvas only paints views that already have a name and description in the DOM.
  engine.canvas.setAttribute('aria-hidden', 'true');
  const display = new RetroDisplay({ mode: displayRegistry.mode, pixelScale: 2 });
  displayRegistry.register(display);
  const displays: RetroDisplay[] = [display];
  const register = (d: RetroDisplay) => {
    displayRegistry.register(d);
    displays.push(d);
  };

  const lid = document.querySelector<HTMLElement>('#lid')!;
  const shade = lid.querySelector<HTMLElement>('.lid-shade')!;
  const grab = document.querySelector<HTMLButtonElement>('#rocket-grab')!;
  const rail = document.querySelector<HTMLElement>('.rail')!;
  const railTitle = rail.querySelector<HTMLElement>('.rail-title')!;
  const launchButton = document.querySelector<HTMLButtonElement>('#launch-button')!;
  const summary = document.querySelector<HTMLElement>('#orrery-summary')!;
  const pull: PullState = { active: false, detents: 0, aim: 0, shakeAt: -1, preview: false };
  let clock = 0;

  // Top nameplates: a layer over the lid, below the composition.
  const plateLayer = document.createElement('div');
  plateLayer.className = 'planets';
  lid.querySelector('.lid-comp')!.before(plateLayer);

  let keyView: KeyView | null = null;
  let nameplates: Nameplates | null = null;
  const view = new OrreryView({
    element: lid.querySelector<HTMLElement>('.lid-scene')!,
    anchor: lid.querySelector<HTMLElement>('.orrery-anchor')!,
    display,
    fleet,
    pull,
    phone,
    reduced: () => motion.reduced,
    onRocketScreen: (x, y) => {
      // The grab zone follows the rocket in the cradle (in px of the container that positions it).
      const parent = (grab.offsetParent as HTMLElement | null) ?? document.body;
      const box = parent.getBoundingClientRect();
      grab.style.left = `${x - box.left}px`;
      grab.style.top = `${y - box.top}px`;
    },
    onTopple: () => clank(0.18),
    onPlanets: (screens, center) => nameplates?.place(screens, center),
    // The key is painted over the orrery's rectangle: whenever the orrery repaints, so does the key.
    afterRender: () => keyView && engine.invalidate(keyView),
  });
  engine.add(view);

  // --- The 3D winding key, in the BUILD instrument ---
  const keyElement = document.querySelector<HTMLElement>('#key')!;
  // Where the key is a tile (≤ 900 px, and phones in landscape): a rounded rectangle, not a disc.
  const narrow = window.matchMedia('(max-width: 900px), (orientation: landscape) and (max-height: 500px)');
  keyView = new KeyView({
    element: keyElement,
    display,
    economy,
    winder: ctx.winder,
    rosette: ctx.rosette,
    reduced: () => motion.reduced,
    mask: (): DisplayMask => (narrow.matches ? { shape: 'roundrect', radius: 14 } : { shape: 'ellipse' }),
  });
  engine.add(keyView);
  ctx.rosette.onChange(() => engine.invalidate(keyView!));
  ctx.winder.onWobble(() => engine.invalidate(keyView!));
  // Only when what the key shows changes (the wind or the give of the drag): at rest, zero frames.
  let lastKeyState = '';
  ctx.onEconomy(() => {
    const state = `${economy.storedSeconds.toFixed(3)}:${ctx.winder.give.toFixed(2)}:${economy.state.mode}`;
    if (state === lastKeyState) return;
    lastKeyState = state;
    engine.invalidate(keyView!);
  });

  // --- Planet nameplates ---
  let lastHum = 0;
  const spinFeedback = (index: number) => {
    // The hum follows the spin (with sound on); at most one every 150 ms.
    const now = performance.now();
    if (now - lastHum < 150) return;
    lastHum = now;
    hum(view.omegaOf(index), 2.4, economy.wind);
  };
  nameplates = new Nameplates({
    layer: plateLayer,
    flick: (index, omega) => {
      view.flickWorld(index, omega);
      spinFeedback(index);
      engine.invalidate(view);
    },
    spin: (index, delta) => {
      view.spinWorld(index, delta);
      spinFeedback(index);
      engine.invalidate(view);
    },
  });

  // --- Tray tops ---
  const trayViews = createTrayTops({
    launcherDisplay: display,
    register,
    reduced: () => motion.reduced,
    invalidate: (v) => engine.invalidate(v),
  });
  for (const v of trayViews) engine.add(v);

  // Any change of mode or reveal repaints every view.
  for (const d of displays) d.onChange(() => engine.invalidate());
  ctx.onMemory((moments) => {
    view.setMemory(moments);
    engine.invalidate(view);
  });
  ctx.onSymmetry((fold) => {
    view.setFold(fold);
    for (const v of trayViews) v.setFold(fold);
    engine.invalidate();
  });
  ctx.onReveal((value) => {
    for (const d of displays) d.reveal = value;
  });
  ctx.onReset(() => {
    view.reset();
    engine.invalidate();
  });
  ctx.onLift((progress) => {
    view.pitch = progress * 10;
    engine.invalidate(view);
  });
  view.setMemory(fleet.memory);

  const gauge = new FleetGauge(document.querySelector<HTMLElement>('#gauge')!);

  new RocketInput({
    button: grab,
    aimInput: document.querySelector<HTMLInputElement>('#aim')!,
    pullInput: document.querySelector<HTMLInputElement>('#pull')!,
    launchButton,
    pull,
    clock: () => clock,
    canLaunch: () => fleet.canLaunch,
    launch: (detents, aim) => {
      const flight = fleet.launch(detents, aim, { instant: motion.reduced });
      if (flight) launchZip();
      engine.invalidate(view);
    },
    onDetent: (detents) => {
      detentTick(1 + detents / 24);
      whine(detents / 12);
      if (!motion.reduced) view.burst(3 + detents);
    },
    invalidate: () => engine.invalidate(view),
  });

  fleet.on({
    end: (_flight, outcome) => {
      if (outcome === 'swallowed') swallowGlide();
      engine.invalidate(view);
    },
  });

  // Rail plate state: dashed and "All rockets out (1/1)" when no rocket is left in the cradle.
  let lastRail = '';
  const paintRail = () => {
    const out = !fleet.canLaunch && !fleet.ratchet;
    const text = out ? `All rockets out (${fleet.occupied}/${fleet.capacity})` : 'Pull back to launch';
    if (text === lastRail) return;
    lastRail = text;
    rail.classList.toggle('is-out', out);
    railTitle.textContent = text;
    launchButton.disabled = out;
  };

  // Live summary of the orrery: charted and spinning, at most every 2 s and only when it changed.
  let lastSummary = '';
  let summaryAt = 0;
  const paintSummary = (now: number) => {
    if (now - summaryAt < 2000) return;
    const n = fleet.charted.size;
    const spinning = view.spinning;
    const text = `${n ? `${n} of 5 planets charted` : 'No planets charted yet'}. ${spinning ? `${spinning} of 5 world tops spinning` : 'The world tops have toppled; flick one to spin it'}.`;
    if (text === lastSummary) return;
    lastSummary = text;
    summaryAt = now;
    summary.textContent = text;
  };

  // The fleet runs as an engine ticker: it stays alive even when the lid leaves the screen (D6).
  engine.addTicker((dt, now) => {
    clock += dt;
    fleet.update(motion.reduced && !fleet.ratchet ? 0 : dt);
    const reading = fleet.readout();
    const idle = !fleet.active.length;
    gauge.setReadout(reading, idle);
    const needle = motion.reduced ? (gauge.snap(), false) : gauge.tick(dt);
    hangar.update(fleet);
    paintRail();
    paintSummary(now);
    view.wind = economy.wind;
    return fleet.busy || needle;
  });
  window.setInterval(() => paintSummary(performance.now()), 2100);

  // Edge shading with the Bayer dither: it darkens as wind builds up.
  const edge = getComputedStyle(document.documentElement).getPropertyValue('--space-deep').trim() || '#0a0f4a';
  applyEdgeShade(shade, edge, 0);
  window.setInterval(() => applyEdgeShade(shade, edge, economy.wind), 500);

  // The demo flight leaves at 0.8 s (only when motion is allowed).
  if (!motion.reduced) {
    window.setTimeout(() => {
      if (motion.reduced) return;
      fleet.launch(12, -20 * deg, { demo: true });
      engine.invalidate(view);
    }, DEMO_AT * 1000);
  }
  motion.onChange(() => engine.invalidate());

  // Development only: a handle for captures and in-browser tests.
  if (import.meta.env.DEV) {
    Object.assign(window, { __wue: { engine, view, keyView, fleet, economy, display, displays, pull, gauge, trayViews, nameplates, rosette: ctx.rosette, winder: ctx.winder, worlds: WORLD_BODIES } });
  }
}
