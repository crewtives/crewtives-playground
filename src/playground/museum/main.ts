// Playground museum: progressive JavaScript on top of the static HTML (D1). A page clock governs every
// loop and every NOW (D4); the light depends only on the scroll position (D8); the fold is only
// requested with the first gesture (D7). Without JavaScript, the page is already complete.

import data from 'virtual:museum';
import { blip, bindSoundToggle, noise } from '../shared/sound';
import { motion } from '../shared/motion';
import { hasWebGL2 } from '../shared/probe';
import type { RuntimeSheet } from './build/render';
import { clockKey, isTextField, PageClock, ScrubChase, type ClockState } from './clock';
import { clockAria, type ClockAriaWrite } from './clockAria';
import type { FoldOptions } from './fold';
import { LoopPlayer } from './player';

const $ = <T extends Element>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);
const $$ = <T extends Element>(selector: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(selector));
const root = document.documentElement;
const announcer = $<HTMLElement>('#announcer')!;

// ── Clock ────────────────────────────────────────────────────────────────────────────────────────
const clock = new PageClock(motion.reduced ? 'hold' : 'forward');
let rewindRequested = false;

interface Sheet {
  el: HTMLElement;
  data: RuntimeSheet;
  players: LoopPlayer[];
  nows: SVGCircleElement[];
  ref: SVGLineElement | null;
  /** Follows the clock (always, except with reduced motion until asked). */
  following: boolean;
  /** Clock position its VISTAs, its NOW and its fold's NOW show right now (on load, the poster's). */
  shown: number;
  visible: boolean;
  near: boolean;
  playButton: HTMLButtonElement | null;
}

const sheets: Sheet[] = data.sheets.map((d) => {
  const el = document.getElementById(`sheet-${d.number}`)!;
  const slots = $$<HTMLElement>('.vista__slot', el);
  return {
    el,
    data: d,
    players: d.views.map((view, i) => new LoopPlayer(slots[i], view)),
    nows: $$<SVGCircleElement>('.ep-now', el),
    ref: $<SVGLineElement>('.ep-ref', el),
    following: !motion.reduced,
    shown: 0,
    visible: false,
    near: false,
    playButton: $<HTMLButtonElement>('[data-action="play"]', el),
  };
});

/**
 * A single NOW: the position a sheet shows is decided only here, and its VISTAs (on 001, all three),
 * the NOW of its épure and the NOW of its fold use it. It is the clock's if the sheet follows it and all
 * its loops have arrived; while any is missing (or there is no decoder), the poster's, 0; and if the
 * sheet does not follow the clock (reduced motion without "Play loop"), the last one it showed.
 */
function effectiveFrame(sheet: Sheet): number {
  if (!sheet.following) return sheet.shown;
  return sheet.players.length && sheet.players.every((p) => p.ready) ? clock.frame : 0;
}

function paintSheet(sheet: Sheet): void {
  const frame = effectiveFrame(sheet);
  sheet.shown = frame;
  const rewinding = clock.state === 'rewind';
  if (sheet.visible) for (const player of sheet.players) player.draw(frame, rewinding);
  if (sheet.el === folded) foldMod?.repaint();
  const now = sheet.data.nows[Math.min(frame, sheet.data.nows.length - 1)];
  if (!now) return;
  const [ex, ey, px, py] = now;
  const [elev, plan] = sheet.nows;
  elev?.setAttribute('cx', String(ex));
  elev?.setAttribute('cy', String(ey));
  plan?.setAttribute('cx', String(px));
  plan?.setAttribute('cy', String(py));
  if (sheet.ref) {
    sheet.ref.setAttribute('x1', String(ex));
    sheet.ref.setAttribute('y1', String(ey));
    sheet.ref.setAttribute('x2', String(px));
    sheet.ref.setAttribute('y2', String(py));
  }
}

function paintAll(): void {
  for (const sheet of sheets) if (sheet.following) paintSheet(sheet);
  for (const row of previews) if (row.open) row.player.draw(clock.frame, clock.state === 'rewind');
  paintClockUi();
}

function requestLoops(sheet: Sheet): void {
  if (!sheet.following || !sheet.near) return;
  for (const player of sheet.players) {
    player.request('forward');
    if (rewindRequested) player.request('rewind');
  }
}

let raf = 0;
let last = 0;
const shouldRun = () => clock.running && !document.hidden && (sheets.some((s) => s.following && s.visible) || previews.some((p) => p.open));

function loop(t: number): void {
  raf = 0;
  const dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
  last = t;
  clock.tick(dt);
  if (shouldRun()) raf = requestAnimationFrame(loop);
  else last = 0;
}

function wake(): void {
  if (!raf && shouldRun()) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
}

clock.subscribe(() => paintAll());

for (const sheet of sheets) {
  for (const player of sheet.players) {
    player.onReady = () => {
      if (sheet.following) paintSheet(sheet);
      wake();
    };
  }
}

// Near (less than one viewport height away): the loops are requested. On screen: they are painted.
const nearObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const sheet = sheets.find((s) => s.el === entry.target)!;
      sheet.near = entry.isIntersecting;
      requestLoops(sheet);
    }
  },
  { rootMargin: '100% 0px 100% 0px' },
);
const visibleObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const sheet = sheets.find((s) => s.el === entry.target)!;
    sheet.visible = entry.isIntersecting;
    // Back in view: the clock's current frame, never the first one.
    if (sheet.visible && sheet.following) paintSheet(sheet);
  }
  wake();
});
for (const sheet of sheets) {
  nearObserver.observe(sheet.el);
  visibleObserver.observe(sheet.el);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) wake();
});
const fitAll = () => sheets.forEach((s) => s.players.forEach((p) => p.fit()));
// After each scroll, the visible VISTAs re-align their corner to a device pixel.
let alignQueued = 0;
window.addEventListener(
  'scroll',
  () => {
    if (alignQueued) return;
    alignQueued = requestAnimationFrame(() => {
      alignQueued = 0;
      for (const sheet of sheets) if (sheet.visible) for (const player of sheet.players) player.align();
    });
  },
  { passive: true },
);
new ResizeObserver(fitAll).observe(document.body);
matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', fitAll);

// ── Clock controls ───────────────────────────────────────────────────────────────────────────────
const controls = $<HTMLElement>('.clock__controls')!;
const stateButtons = $$<HTMLButtonElement>('.clock__state', controls);
const scrub = $<HTMLElement>('.clock__scrub', controls)!;
controls.hidden = false;

/** Writes only on change: an attribute rewritten with the same value still counts as a change for observers. */
function setAttr(el: Element, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function paintClockUi(): void {
  setAttr(root, 'data-clock', clock.state);
  for (const button of stateButtons) setAttr(button, 'aria-pressed', String(button.dataset.state === clock.state));
  const frame = clock.frame;
  scrub.style.setProperty('--pos', String(frame / (clock.frames - 1)));
  exposePosition();
}

/**
 * The scrubber's value for assistive technologies (clockAria.ts): at once on focus and on every change
 * of state, at most once a second while the clock runs unfocused, and not while it runs with focus (a
 * screen reader would announce every write). In HOLD, or while it is used, it is the requested
 * position, even if the clock is still chasing it.
 */
let exposed: ClockAriaWrite | null = null;
function exposePosition(focusing = false): void {
  const write = clockAria(
    {
      state: clock.state,
      frame: clock.running ? clock.frame : (scrubTarget ?? clock.frame),
      frames: clock.frames,
      focused: document.activeElement === scrub,
      now: performance.now(),
    },
    exposed,
    focusing,
  );
  if (!write) return;
  exposed = write;
  setAttr(scrub, 'aria-valuenow', String(write.value));
  setAttr(scrub, 'aria-valuetext', write.text);
}
scrub.addEventListener('focus', () => exposePosition(true));

/** A gesture on the clock: with reduced motion it requests the loops of the sheets on screen. */
function clockGesture(): void {
  if (!motion.reduced) return;
  for (const sheet of sheets) if (sheet.visible) follow(sheet, true);
}

function setState(state: ClockState): void {
  clockGesture();
  if (state !== 'hold') stopScrub();
  if (state === 'rewind' && !rewindRequested) {
    rewindRequested = true;
    for (const sheet of sheets) requestLoops(sheet);
  }
  clock.set(state);
  paintClockUi();
  wake();
}

for (const button of stateButtons) button.addEventListener('click', () => setState(button.dataset.state as ClockState));

window.addEventListener('keydown', (event) => {
  if (!shortcuts || event.metaKey || event.ctrlKey || event.altKey || isTextField(event.target)) return;
  const state = clockKey(event.key);
  if (state && !event.repeat) {
    setState(state);
    return;
  }
  if (event.key === 'g' || event.key === 'G') toggleGrid();
  if (/^[0-9]$/.test(event.key)) typeDigit(event.key);
  if (event.key === 'f' || event.key === 'F') foldActive();
});

// Scrubber: dragging (or the arrow keys, Home and End) moves every VISTA and every NOW; releasing leaves
// the clock in HOLD at the released position. Limited flashes (12.5): the clock chases the requested
// position with ScrubChase (at most SCRUB_STEP frames every 1/15 s, and without changing direction more
// than three times per second). While it chases, a hollow mark stays at the requested position and the
// solid knob follows the clock. The scrubber does not wrap around: from 45 to 1 it goes through the middle.
const scrubMark = $<HTMLElement>('.clock__target', scrub);
const scrubChase = new ScrubChase();
function frameAt(clientX: number): number {
  const box = scrub.getBoundingClientRect();
  return Math.max(0, Math.min(clock.frames - 1, Math.round(((clientX - box.left) / box.width) * (clock.frames - 1))));
}
let scrubTarget: number | null = null;
let scrubTimer = 0;
function stopScrub(): void {
  window.clearTimeout(scrubTimer);
  scrubTimer = 0;
  scrubTarget = null;
  if (scrubMark) scrubMark.hidden = true;
  delete scrub.dataset.chasing;
}
function chase(): void {
  scrubTimer = 0;
  if (scrubTarget === null) return;
  if (scrubTarget === clock.frame) return stopScrub();
  clock.seek(scrubChase.next(clock.frame, scrubTarget, performance.now()));
  scrubTimer = window.setTimeout(chase, 1000 / clock.fps);
}
function scrubTo(frame: number): void {
  scrubTarget = Math.max(0, Math.min(clock.frames - 1, frame));
  scrub.style.setProperty('--target', String(scrubTarget / (clock.frames - 1)));
  if (scrubMark) scrubMark.hidden = false;
  scrub.dataset.chasing = '';
  if (scrubTimer) paintClockUi();
  else chase();
}
scrub.addEventListener('pointerdown', (event) => {
  // No text selection and no drag autoscroll. Preventing the default also keeps a mouse press from
  // focusing the scrubber, so it is focused here: the arrow keys go on working after a drag.
  event.preventDefault();
  scrub.focus({ preventScroll: true });
  scrub.setPointerCapture(event.pointerId);
  setState('hold');
  scrubTo(frameAt(event.clientX));
});
scrub.addEventListener('pointermove', (event) => {
  if (scrub.hasPointerCapture(event.pointerId)) scrubTo(frameAt(event.clientX));
});
// On release, the pointer's last position is the one that stays (the clock finishes reaching it).
for (const type of ['pointerup', 'lostpointercapture'] as const) {
  scrub.addEventListener(type, (event) => scrubTo(frameAt(event.clientX)));
}
scrub.addEventListener('keydown', (event) => {
  const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
  if (step !== undefined) {
    event.preventDefault();
    setState('hold');
    scrubTo((scrubTarget ?? clock.frame) + step);
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    setState('hold');
    scrubTo(event.key === 'Home' ? 0 : clock.frames - 1);
  }
});

// ── Reduced motion: "Play loop" per sheet and live change ────────────────────────────────────────
function follow(sheet: Sheet, on: boolean): void {
  sheet.following = on;
  sheet.playButton?.setAttribute('aria-pressed', String(on && motion.reduced));
  if (on) {
    requestLoops(sheet);
    paintSheet(sheet);
  }
}

function applyMotion(reduced: boolean): void {
  for (const sheet of sheets) {
    if (sheet.playButton) sheet.playButton.hidden = !reduced;
    if (reduced) follow(sheet, false);
    else follow(sheet, true);
  }
  if (reduced) clock.set('hold');
  lightFrozen = reduced;
  paintLight();
  paintClockUi();
  wake();
}

for (const sheet of sheets) {
  const tools = $<HTMLElement>('.sheet__tools', sheet.el);
  if (tools) tools.hidden = false;
  sheet.playButton?.addEventListener('click', () => {
    const on = !sheet.following;
    follow(sheet, on);
    if (on && clock.state === 'hold') clock.set('forward');
    paintClockUi();
    wake();
  });
}
motion.onChange(applyMotion);

// ── Light: its intensity depends only on the scroll position (D8) ─────────────────────────────────
let lightFrozen = motion.reduced;
const light = $<HTMLElement>('.light')!;
/**
 * Reference scroll range of the light: it is measured on load and only changes when the window is
 * resized. That way the same position always gives the same light, even if opening "Sheet data" makes
 * the page longer.
 */
let lightSpan = Math.max(1, document.documentElement.scrollHeight - innerHeight);
function measureLight(): void {
  lightSpan = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  paintLight();
}
function paintLight(): void {
  if (lightFrozen) {
    light.style.removeProperty('--east-a');
    light.style.removeProperty('--west-a');
    return;
  }
  const p = Math.min(1, Math.max(0, scrollY / lightSpan));
  light.style.setProperty('--east-a', (0.9 - 0.75 * p).toFixed(3));
  // Afternoon at the bottom, without forming a field under the colophon text.
  light.style.setProperty('--west-a', (0.15 + 0.35 * p).toFixed(3));
}
window.addEventListener('scroll', paintLight, { passive: true });
window.addEventListener('resize', measureLight);
void document.fonts.ready.then(measureLight);

// ── Full grid (G, or "Grid" on touch screens) ─────────────────────────────────────────────────────
const gridButton = $<HTMLButtonElement>('.bar__grid')!;
const overlay = $<HTMLElement>('.grid-overlay')!;
if (matchMedia('(pointer: coarse)').matches) gridButton.hidden = false;
function toggleGrid(): void {
  const on = !root.classList.contains('show-grid');
  root.classList.toggle('show-grid', on);
  overlay.hidden = !on;
  gridButton.setAttribute('aria-pressed', String(on));
}
gridButton.addEventListener('click', toggleGrid);

// ── Jump by number: three digits with less than 1 s between them ──────────────────────────────────
let digits = '';
let digitTimer = 0;
function typeDigit(digit: string): void {
  window.clearTimeout(digitTimer);
  digits += digit;
  if (digits.length < 3) {
    digitTimer = window.setTimeout(() => (digits = ''), 1000);
    return;
  }
  const number = digits;
  digits = '';
  jumpTo(number);
}

function jumpTo(number: string): void {
  const target = document.getElementById(`sheet-${number}`);
  if (!target) return;
  target.scrollIntoView({ behavior: motion.reduced ? 'instant' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#sheet-${number}`);
  // Focus stays on the sheet (labelled by its heading): reading continues from its VISTA. The ring is
  // drawn only for this jump: a deep link also focuses the sheet, but without the ring.
  target.dataset.jumped = '';
  target.addEventListener('blur', () => delete target.dataset.jumped, { once: true });
  target.focus({ preventScroll: true });
  const title = $<HTMLElement>('.title-block__title', target)?.textContent ?? '';
  announcer.textContent = `Sheet ${number}, ${title}`;
  blip(880, 0.05, 'square', 0.18);
}

// ── Single-key shortcuts (J, K, L, G, F and the digits): on, with a switch in the colophon ───────────
const SHORTCUTS_KEY = 'museum.shortcuts';
let shortcuts = true;
try {
  shortcuts = localStorage.getItem(SHORTCUTS_KEY) !== 'off';
} catch {
  // Without storage, the shortcuts start on and the preference lasts as long as the page.
}
const shortcutsButton = $<HTMLButtonElement>('.colophon__shortcuts');
const hint = $<HTMLElement>('.index__hint');
// The hint asks the visitor to type: only with a fine pointer (where there is usually a keyboard) and with the shortcuts on.
const finePointer = matchMedia('(any-pointer: fine)').matches;
function paintShortcuts(): void {
  if (shortcutsButton) {
    shortcutsButton.hidden = false;
    shortcutsButton.setAttribute('aria-pressed', String(shortcuts));
    shortcutsButton.textContent = `Keyboard shortcuts: ${shortcuts ? 'on' : 'off'}`;
  }
  if (hint) hint.hidden = !(finePointer && shortcuts);
}
shortcutsButton?.addEventListener('click', () => {
  shortcuts = !shortcuts;
  try {
    if (shortcuts) localStorage.removeItem(SHORTCUTS_KEY);
    else localStorage.setItem(SHORTCUTS_KEY, 'off');
  } catch {
    // Without storage, it applies to this page.
  }
  paintShortcuts();
});
paintShortcuts();

// ── Preview on intent in the index rows (D10) ────────────────────────────────────────────────────
interface Preview {
  row: HTMLElement;
  player: LoopPlayer;
  open: boolean;
}
const previews: Preview[] = [];
for (const row of $$<HTMLElement>('.index__row[data-sheet]')) {
  const sheet = sheets.find((s) => s.data.number === row.dataset.sheet);
  const thumb = $<HTMLElement>('.index__thumb', row);
  if (!sheet || !thumb || !sheet.data.views[0]?.native) continue;
  const preview: Preview = { row, player: new LoopPlayer(thumb, sheet.data.views[0], { thumb: true }), open: false };
  preview.player.onReady = () => {
    if (preview.open) preview.player.draw(clock.frame, clock.state === 'rewind');
    wake();
  };
  previews.push(preview);
  const link = $<HTMLElement>('.index__link', row)!;
  let hover = 0;
  const open = () => {
    if (motion.reduced) return;
    preview.open = true;
    preview.player.request('forward');
    preview.player.draw(clock.frame, clock.state === 'rewind');
    wake();
  };
  const close = () => {
    window.clearTimeout(hover);
    preview.open = false;
    preview.player.reset();
  };
  link.addEventListener('pointerenter', () => {
    window.clearTimeout(hover);
    hover = window.setTimeout(open, 300);
  });
  link.addEventListener('pointerleave', close);
  // Focus from the keyboard shows it. Focus from a press does not: swapping the poster for the canvas
  // between the press and the release takes the click away from the link (a tap on the poster).
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) open();
  });
  link.addEventListener('blur', close);
}

// ── Fold (D7): the 3D module is requested with the first gesture ──────────────────────────────────
type FoldModule = typeof import('./fold');
let foldModule: Promise<FoldModule> | null = null;
let foldMod: FoldModule | null = null;
const loadFold = () => (foldModule ??= import('./fold').then((mod) => (foldMod = mod)));
/**
 * The folded sheet (or the one being folded): the visitor's intent, set in the same gesture, before
 * waiting for any code. The last gesture wins; fold.ts discards the fold that was left behind.
 */
let folded: HTMLElement | null = null;
/** Fraction of the rotation while a drag on the ground line lasts (for when the module arrives). */
let dragFraction: number | null = null;
const foldButton = (sheetEl: HTMLElement) => $<HTMLButtonElement>('[data-action="fold"]', sheetEl);
/** Its fold is waiting for the 3D code: gestures on that sheet do not count until it opens. */
const foldPending = (sheetEl: HTMLElement) => foldButton(sheetEl)?.getAttribute('aria-busy') === 'true';

function foldTarget(): HTMLElement | null {
  const focused = document.activeElement?.closest<HTMLElement>('.sheet');
  if (focused?.querySelector('[data-action="fold"]')) return focused;
  let best: HTMLElement | null = null;
  let area = 0;
  for (const el of $$<HTMLElement>('.sheet')) {
    if (!el.querySelector('[data-action="fold"]')) continue;
    const box = el.getBoundingClientRect();
    const visible = Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.top)) * box.width;
    if (visible > area) {
      area = visible;
      best = el;
    }
  }
  return best;
}

function foldOptions(sheetEl: HTMLElement, dragged: boolean): FoldOptions {
  const sheet = sheets.find((s) => s.el === sheetEl);
  return {
    clock,
    reduced: motion.reduced,
    webgl2: hasWebGL2(),
    frameOf: () => sheet?.shown ?? 0,
    nowMoments: sheet?.data.nowMoments ?? [],
    dragged,
  };
}

/** The fold has settled: the hinge "clack" and the announcement. */
function foldSettled(sheetEl: HTMLElement, on: boolean): void {
  noise(0.06, 900, 'bandpass', 0.35);
  announcer.textContent = `Sheet ${sheetEl.dataset.sheet} ${on ? 'folded' : 'flat'}`;
  if (on) showFold(sheetEl);
}

// On a phone the fold view can land under the fixed clock bar. Once it settles, the page scrolls the
// least distance that shows it whole (instant with reduced motion), unless the visitor has touched,
// scrolled or typed since the fold began: the scroll is theirs.
const phone = matchMedia('(max-width: 759px)');
let foldBegan = 0;
let lastInput = 0;
for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const) {
  window.addEventListener(type, () => (lastInput = performance.now()), { capture: true, passive: true });
}
function showFold(sheetEl: HTMLElement): void {
  if (!phone.matches || lastInput > foldBegan) return;
  const views = $$<HTMLElement>('.fold-view, .fold-axo', sheetEl);
  if (!views.length) return;
  const top = Math.min(...views.map((v) => v.getBoundingClientRect().top));
  const bottom = Math.max(...views.map((v) => v.getBoundingClientRect().bottom));
  const style = getComputedStyle(root);
  const floor = innerHeight - (parseFloat(style.scrollPaddingBottom) || 0);
  const ceiling = parseFloat(style.scrollPaddingTop) || 0;
  // Down only as far as the view's top can go without passing under the bar.
  const distance = Math.min(bottom - floor, top - ceiling);
  if (bottom <= floor || distance <= 0) return;
  window.scrollBy({ top: distance, behavior: motion.reduced ? 'instant' : 'smooth' });
}

function toggleFold(sheetEl: HTMLElement, dragged = false): void {
  if (foldPending(sheetEl)) return;
  const previous = folded;
  const on = previous !== sheetEl;
  folded = on ? sheetEl : null;
  if (on) foldBegan = performance.now();
  if (previous && previous !== sheetEl) foldButton(previous)?.setAttribute('aria-pressed', 'false');
  const button = foldButton(sheetEl);
  button?.setAttribute('aria-pressed', String(on));
  if (!on) {
    void loadFold().then((mod) => mod.unfold(sheetEl, motion.reduced));
    foldSettled(sheetEl, false);
    return;
  }
  button?.setAttribute('aria-busy', 'true');
  // If it did not open and nothing else was requested (nothing to fold, or the network failed), it stays flat and the button says so.
  const flat = () => {
    if (folded !== sheetEl) return;
    folded = null;
    button?.setAttribute('aria-pressed', 'false');
  };
  void loadFold()
    .then((mod) => {
      if (dragFraction !== null) mod.drag(dragFraction);
      return mod.fold(sheetEl, foldOptions(sheetEl, dragged));
    })
    .then((opened) => {
      if (!opened) flat();
      // A drag is announced on release, when it is known whether it stays folded.
      else if (!dragged) foldSettled(sheetEl, true);
    }, flat)
    .finally(() => button?.removeAttribute('aria-busy'));
}

function foldActive(): void {
  const target = foldTarget();
  if (target) toggleFold(target);
}

/**
 * Dragging on the ground line: the plane turns in proportion to the vertical movement and, on release,
 * settles at 90° (past halfway) or goes back to 0°. With reduced motion or without WebGL2, the drag
 * folds in one go, like the button.
 */
function dragHinge(sheetEl: HTMLElement, down: PointerEvent): void {
  if (foldPending(sheetEl) || folded === sheetEl || down.button > 0) return;
  const figure = (down.currentTarget as Element).closest<HTMLElement>('.sheet__epure')!;
  // Gesture distance for the 90°: a quarter of the drawn épure (a little over half its elevation).
  const reach = Math.max(60, figure.getBoundingClientRect().height / 4);
  let fraction: number | null = null;
  const end = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== down.pointerId) return;
    const dy = Math.abs(event.clientY - down.clientY);
    if (fraction === null) {
      if (dy < 8) return;
      if (motion.reduced || !hasWebGL2()) {
        end();
        toggleFold(sheetEl);
        return;
      }
      fraction = 0;
      dragFraction = 0;
      toggleFold(sheetEl, true);
    }
    fraction = dragFraction = Math.min(1, dy / reach);
    foldMod?.drag(fraction);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== down.pointerId) return;
    end();
    if (fraction === null) return;
    const keep = fraction >= 0.5;
    dragFraction = null;
    void loadFold().then((mod) => {
      if (folded !== sheetEl) return;
      if (keep) {
        mod.settle();
        foldSettled(sheetEl, true);
      } else {
        // It returns to flat from where it was: the state did not change, so there is no sound or announcement.
        folded = null;
        foldButton(sheetEl)?.setAttribute('aria-pressed', 'false');
        mod.unfold(sheetEl);
      }
    });
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

// On a touch screen the ground line claims nothing (CSS turns its pointer events off, so a swipe that
// starts on an épure scrolls the page): the fold is dragged from a grip at the line's right end, which
// exists only while the pointer is coarse. A drag on the grip turns the plane; a tap acts like "Fold".
const coarse = matchMedia('(pointer: coarse)');
function grip(sheetEl: HTMLElement): HTMLElement {
  const el = document.createElement('span');
  el.className = 'ep-grip';
  el.setAttribute('aria-hidden', 'true');
  el.addEventListener('pointerdown', (down) => {
    if (down.button > 0) return;
    dragHinge(sheetEl, down);
    let moved = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerId === down.pointerId) moved = Math.max(moved, Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY));
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== down.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (event.type === 'pointerup' && moved < 8) toggleFold(sheetEl);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  return el;
}
function placeGrips(): void {
  for (const button of $$<HTMLButtonElement>('[data-action="fold"]')) {
    const sheetEl = button.closest<HTMLElement>('.sheet')!;
    for (const figure of $$<HTMLElement>('.sheet__epure', sheetEl)) {
      const placed = figure.querySelector(':scope > .ep-grip');
      if (coarse.matches && !placed && figure.querySelector('.ep-hinge')) figure.append(grip(sheetEl));
      else if (!coarse.matches) placed?.remove();
    }
  }
}

// Sheet 000 does not follow the clock, but it also folds.
for (const tools of $$<HTMLElement>('.sheet--method .sheet__tools')) tools.hidden = false;
for (const button of $$<HTMLButtonElement>('[data-action="fold"]')) {
  const sheetEl = button.closest<HTMLElement>('.sheet')!;
  button.addEventListener('click', () => toggleFold(sheetEl));
  // Dragging on the ground line also folds. Where the primary pointer is fine, a finger on the line (a
  // touch laptop's) does not scroll the page: it is claimed when the touch starts, because Chromium does
  // not apply touch-action to the shapes of an SVG. Where it is coarse, the grip claims the gesture
  // instead. Without JavaScript, touching the ground line still scrolls the page.
  for (const hinge of $$<SVGRectElement>('.ep-hinge', sheetEl)) {
    hinge.addEventListener(
      'touchstart',
      (event) => {
        if (!coarse.matches) event.preventDefault();
      },
      { passive: false },
    );
    hinge.addEventListener('pointerdown', (down) => dragHinge(sheetEl, down));
  }
}
placeGrips();
coarse.addEventListener('change', placeGrips);
if (!hasWebGL2()) {
  const line = $<HTMLElement>('.nogl');
  if (line) line.hidden = false;
}

// ── Sound and startup ─────────────────────────────────────────────────────────────────────────────
const soundButton = $<HTMLButtonElement>('.bar__sound')!;
soundButton.hidden = false;
bindSoundToggle(soundButton);

applyMotion(motion.reduced);
paintLight();

// Deep link: the sheet stays in place when the fonts finish loading.
const deep = /^#sheet-\d{3}$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
if (deep) {
  let userScrolled = false;
  const mark = () => (userScrolled = true);
  window.addEventListener('wheel', mark, { once: true, passive: true });
  window.addEventListener('touchstart', mark, { once: true, passive: true });
  window.addEventListener('keydown', mark, { once: true });
  void document.fonts.ready.then(() => {
    if (!userScrolled) deep.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
}
