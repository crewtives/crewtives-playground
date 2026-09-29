import { falconReadout, PHI, SPIRAL, spiralRadiusAt, TIMES } from '../../../pipeline/scenes/falconPhi';
import type { TimeController } from '../../../engine/time/TimeController';
import { flightTable, phaseName } from './plots';

// Readouts of the "NOW" (spec `procedural-subject`, "Math shared between bake and page"): all of them come
// from `falconReadout(frame / fps)`, the same module the bake used, for the current whole frame.

const fixed = (value: number, digits: number) => value.toFixed(digits);

export interface ReadoutText {
  theta: string;
  thetaDeg: string;
  thetaSup: string;
  rLaw: string;
  radius: string;
  ratio: string;
  ratioNote: string;
  /** Short note on the ratio, for the phone: "= φ" when it locks on, otherwise why it is missing. */
  ratioBrief: string;
  beat: string;
  beatNote: string;
  span: string;
  alt: string;
  speed: string;
  phase: string;
  clock: string;
  r0: string;
  /** On the spiral segment, the law r(θ) describes the flight. */
  onSpiral: boolean;
}

/** Readout texts for a whole frame. */
export function readoutText(frame: number, fps: number): ReadoutText {
  const t = frame / fps;
  const r = falconReadout(t);
  const onSpiral = t <= TIMES.spiralEnd;
  let ratio = '—';
  let ratioNote = 'off the spiral';
  let ratioBrief = 'off spiral';
  if (onSpiral) {
    if (r.quarterRatio === null) {
      ratioNote = 'first quarter turn';
      ratioBrief = 'first ¼ turn';
    } else {
      ratio = fixed(r.quarterRatio, 4);
      const error = Math.abs(r.quarterRatio / PHI - 1) * 100;
      ratioNote = ratioBrief = error < 0.005 ? '= φ' : `φ ± ${error.toFixed(2)}%`;
    }
  }
  let beat = '—';
  let beatNote = r.phase === 'stoop' ? 'wings tucked' : r.phase === 'perched' ? 'wings folded' : 'wings held';
  if (r.wingbeatPhase !== null) {
    beat = fixed(r.wingbeatPhase, 2);
    beatNote = r.wingbeatPhase < 0.4 ? 'downstroke' : 'upstroke';
  }
  return {
    theta: fixed(r.angle, 3),
    thetaDeg: fixed((r.angle * 180) / Math.PI, 1),
    thetaSup: fixed((-2 * r.angle) / Math.PI, 3),
    rLaw: fixed(spiralRadiusAt(r.angle), 2),
    radius: fixed(r.radius, 2),
    ratio,
    ratioNote,
    ratioBrief,
    beat,
    beatNote,
    span: fixed(r.wingspan, 2),
    alt: fixed(r.altitude, 1),
    speed: fixed(r.speed, 1),
    phase: phaseName(r.phase),
    clock: `t = ${fixed(t, 2)} s`,
    r0: fixed(SPIRAL.r0, 1),
    onSpiral,
  };
}

/**
 * Writes the readouts into every `[attr="key"]` inside `root` when the frame changes. Hands the applied
 * text to `onUpdate` (for callers that want more, like the plotter) and returns the function that unhooks it.
 */
export function bindReadouts(root: ParentNode, time: TimeController, attr = 'data-read', onUpdate?: (text: ReadoutText) => void): () => void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[${attr}]`));
  const key = attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const eq = root.querySelector<HTMLElement>('[data-eq]');
  let last = -1;
  const sync = () => {
    const frame = time.frame;
    if (frame === last) return;
    last = frame;
    const text = readoutText(frame, time.fps);
    for (const node of nodes) {
      const value = text[node.dataset[key] as keyof ReadoutText];
      if (typeof value === 'string' && node.textContent !== value) node.textContent = value;
    }
    eq?.classList.toggle('is-off', !text.onSpiral);
    onUpdate?.(text);
  };
  sync();
  return time.subscribe(sync);
}

/**
 * The equation's θ is a control (an idea taken from HyperCard: reading is operating). Dragging
 * horizontally or the arrow keys move it; PageUp/PageDown move it a quarter turn, so the φ quotient shows
 * in one jump. It moves the "NOW" with `seek`, like the timeline: during the gesture it stays in HOLD,
 * and it resumes on release.
 */
export function bindThetaScrub(element: HTMLElement, time: TimeController): () => void {
  const table = flightTable();
  const max = table.theta[table.theta.length - 1];
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', max.toFixed(3));
  const thetaOf = (frame: number) => table.theta[Math.min(table.theta.length - 1, Math.round((frame / time.fps) * table.rate))];
  const sync = () => {
    const theta = thetaOf(time.frame);
    element.setAttribute('aria-valuenow', theta.toFixed(3));
    element.setAttribute('aria-valuetext', `${theta.toFixed(3)} radians, ${((theta * 180) / Math.PI).toFixed(1)} degrees`);
  };
  const seekTheta = (theta: number) => {
    const t = table.timeAtTheta(Math.min(max, Math.max(0, theta)));
    time.seek(Math.min(time.frameCount - 1, Math.round(t * time.fps)));
  };

  let dragging = false;
  let startX = 0;
  let startTheta = 0;
  let resumeRate = 0;
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startTheta = thetaOf(time.frame);
    resumeRate = time.playing ? time.rate : 0;
    if (resumeRate !== 0) time.hold();
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-scrubbing');
    event.preventDefault();
  };
  const onMove = (event: PointerEvent) => {
    // 1 px of drag = 0.01 rad: half a turn in ~300 px.
    if (dragging) seekTheta(startTheta + (event.clientX - startX) * 0.01);
  };
  const onUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    element.classList.remove('is-scrubbing');
    if (resumeRate !== 0) time.play(resumeRate);
  };
  const onKey = (event: KeyboardEvent) => {
    const theta = thetaOf(time.frame);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = theta + 0.05;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = theta - 0.05;
        break;
      case 'PageUp':
        next = theta + Math.PI / 2;
        break;
      case 'PageDown':
        next = theta - Math.PI / 2;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (time.playing) time.hold();
    seekTheta(next);
  };
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onUp);
  element.addEventListener('keydown', onKey);
  const off = time.subscribe(sync);
  sync();
  return () => {
    off();
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('pointermove', onMove);
    element.removeEventListener('pointerup', onUp);
    element.removeEventListener('pointercancel', onUp);
    element.removeEventListener('keydown', onKey);
  };
}
