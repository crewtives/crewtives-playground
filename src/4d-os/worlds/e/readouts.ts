import type { TimeController } from '../../../engine/time/TimeController';
import { FRAME_COUNT, fallStateAtFrame, type FallState } from '../../../pipeline/scenes/whaleFall';

/** Colors of its clock, from the coldest to the most redshifted (all members of the palette). */
const REDSHIFT_RAMP = ['--ice', '--cream', '--gold', '--orange', '--flame'];

const two = (value: number) => value.toFixed(2).padStart(5, '0');

/**
 * How far its clock has stretched: 0 at the first frame, 1 at the last, linear in dτ/dt. It is the same
 * quantity that drives the width, weight and color of its clock.
 */
export function itsStretch(state: FallState, first: FallState, last: FallState): number {
  const span = first.dilation - last.dilation;
  return span > 0 ? Math.min(1, Math.max(0, (first.dilation - state.dilation) / span)) : 0;
}

/**
 * The two clocks and the recorder's readouts (`[data-read]`), computed with the scene's module for the
 * current whole frame (spec `procedural-subject`: the page and the bake use the same math). Its clock
 * (`[data-its-clock]`) stretches, thins and reddens with dτ/dt: it publishes `--its-k` (0–1) and
 * `--its-color`; the CSS decides how much width and weight that range is worth given the space.
 */
export function bindReadouts(time: TimeController, root: ParentNode = document): () => void {
  const nodes = new Map<string, HTMLElement[]>();
  root.querySelectorAll<HTMLElement>('[data-read]').forEach((node) => {
    const key = node.dataset.read ?? '';
    nodes.set(key, [...(nodes.get(key) ?? []), node]);
  });
  const clock = root.querySelector<HTMLElement>('[data-its-clock]');
  const last = Math.min(time.frameCount, FRAME_COUNT) - 1;
  const first = fallStateAtFrame(0, time.fps);
  const final = fallStateAtFrame(last, time.fps);
  let shown = -1;

  const write = (key: string, text: string) => {
    for (const node of nodes.get(key) ?? []) if (node.textContent !== text) node.textContent = text;
  };

  const sync = () => {
    const frame = time.frame;
    if (frame === shown) return;
    shown = frame;
    const state = fallStateAtFrame(frame, time.fps);
    write('t', two(state.t));
    write('tau', two(state.tau));
    write('lag', (state.t - state.tau).toFixed(2));
    write('r', state.rOverRs.toFixed(3));
    write('dilation', state.dilation.toFixed(3));
    write('redshift', state.redshift.toFixed(3));
    if (clock) {
      const k = itsStretch(state, first, final);
      clock.style.setProperty('--its-k', k.toFixed(3));
      const step = Math.min(REDSHIFT_RAMP.length - 1, Math.floor(k * REDSHIFT_RAMP.length));
      clock.style.setProperty('--its-color', `var(${REDSHIFT_RAMP[step]})`);
    }
  };
  const off = time.subscribe(sync);
  sync();
  return off;
}
