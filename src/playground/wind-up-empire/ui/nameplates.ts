// Nameplates of the planet tops: they follow each top's on-screen position (letter and name in
// Rampart One, coordinate in Sono) and are its touch target, at least 64 px. Flick = spin from the
// gesture's speed; tap = +25 rad/s; Enter or Space = +40. On pointer hover or focus a tin tag opens
// with "Spin" and "Open <world>", a real link that is never blocked. The nameplates are buttons in
// the order E, D, A, B, C and home; the arrow keys move the focus.
// The tag stays pinned where it opened: the planets orbit fast and a moving target cannot be
// pressed.
import { WORLDS } from '../../shared/worlds';
import { WORLD_BODIES, HOME, type WorldId } from '../orbits';
import { flickOmega } from '../tops';

export interface PlanetScreen {
  x: number;
  y: number;
  /** On-screen radius of the top (px). */
  r: number;
}

export interface NameplateOptions {
  layer: HTMLElement;
  /** Flick to a spin of ω (rad/s). `index` 0–4 = worlds E..C, 5 = home. */
  flick: (index: number, omega: number) => void;
  /** Adds spin. */
  spin: (index: number, delta: number) => void;
}

const FLICK_MIN_PX = 8;
const SAMPLE_MS = 80;
const TAP_SPIN = 25;
const KEY_SPIN = 40;
/** The tag goes in the top layer (popover) where supported: above the rail, the grab and the title. */
const TOP_LAYER = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

interface Plate {
  index: number;
  root: HTMLElement;
  hit: HTMLButtonElement;
  x: number;
  y: number;
  /** On-screen radius of the top and the direction pointing away from the Whirl. */
  r: number;
  out: [number, number];
  /** Size of the visible nameplate (measured once). */
  size: [number, number];
  /** Width when folded (letter only). */
  folded: number;
  /** Slot chosen in the last layout pass (index into `slots`). */
  slot: number;
  world: WorldId | null;
}

export interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}

function hits(a: Rect, b: Rect): boolean {
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
}

export class Nameplates {
  private readonly plates: Plate[] = [];
  private readonly tag: HTMLElement;
  private readonly tagTitle: HTMLElement;
  private readonly tagSpin: HTMLButtonElement;
  private readonly tagOpen: HTMLAnchorElement;
  private openFor: Plate | null = null;
  private closeTimer = 0;
  private layerBox = { left: 0, top: 0 };

  constructor(private readonly o: NameplateOptions) {
    const group = document.createElement('div');
    group.className = 'planet-plates';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Planet nameplates. Arrow keys move between them.');
    const bodies = [...WORLD_BODIES.map((w) => ({ id: w.id as WorldId | null, letter: w.letter, name: w.name, coord: w.coord })), { id: null, letter: '', name: 'Home tin', coord: HOME.coord }];
    bodies.forEach((body, index) => {
      const root = document.createElement('div');
      root.className = `planet${body.id ? '' : ' planet-home'}`;
      const hit = document.createElement('button');
      hit.type = 'button';
      hit.className = 'planet-hit';
      hit.tabIndex = index === 0 ? 0 : -1;
      const route = body.id ? WORLDS.find((w) => w.id === body.id)!.route : '';
      hit.setAttribute(
        'aria-label',
        body.id
          ? `${body.letter} · ${body.name} ${body.coord}. Spinning top. Press to spin it; its tag opens ${body.name}.`
          : `Home tin ${body.coord}, your launch pad. Press to spin it.`,
      );
      hit.innerHTML = body.id
        ? `<span class="plate" aria-hidden="true"><span class="plate-letter">${body.letter}</span><span class="plate-name">${body.name}</span><span class="plate-coord">${body.coord}</span></span>`
        : `<span class="plate" aria-hidden="true"><svg class="icon plate-house"><use href="#i-house" /></svg><span class="plate-name">Home</span><span class="plate-coord">${body.coord}</span></span>`;
      root.append(hit);
      group.append(root);
      const plate: Plate = { index, root, hit, x: -999, y: -999, r: 16, out: [0.7, 0.7], size: [0, 0], folded: 0, slot: 0, world: body.id };
      this.plates.push(plate);
      this.bindPlate(plate, route);
    });

    // The tin tag, a single one for all the nameplates.
    this.tag = document.createElement('div');
    this.tag.className = 'planet-tag';
    this.tag.hidden = true;
    // In the top layer it keeps its place in the DOM: Tab goes from the nameplate to "Spin" and to the link.
    if (TOP_LAYER) this.tag.popover = 'manual';
    this.tag.innerHTML =
      '<p class="planet-tag-title"></p><button type="button" class="tin-button planet-tag-spin">Spin</button><a class="planet-tag-open" href="#"></a>';
    this.tagTitle = this.tag.querySelector('.planet-tag-title')!;
    this.tagSpin = this.tag.querySelector('.planet-tag-spin')!;
    this.tagOpen = this.tag.querySelector('.planet-tag-open')!;
    this.tagSpin.addEventListener('click', () => {
      if (this.openFor) this.o.spin(this.openFor.index, KEY_SPIN);
    });
    this.tag.addEventListener('pointerenter', () => window.clearTimeout(this.closeTimer));
    this.tag.addEventListener('pointerleave', () => this.scheduleClose());
    this.tag.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.openFor) {
        const plate = this.openFor;
        this.close();
        plate.hit.focus();
      }
    });
    group.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (!next || !group.contains(next)) this.scheduleClose(120);
    });
    group.append(this.tag);
    o.layer.append(group);
    // Each nameplate's size changes with the font and with the width (on phones only the letter shows).
    const remeasure = () => {
      for (const p of this.plates) p.size = [0, 0];
    };
    void document.fonts?.ready.then(remeasure);
    window.addEventListener('resize', remeasure);
  }

  /**
   * On-screen positions (viewport px) of E, D, A, B, C and home, and the center of the Whirl. Each
   * nameplate shifts away from the Whirl, so the center of the orrery stays clear.
   */
  place(screens: PlanetScreen[], center: { x: number; y: number }): void {
    const box = this.o.layer.getBoundingClientRect();
    this.layerBox = { left: box.left, top: box.top };
    let moved = false;
    screens.forEach((s, i) => {
      const plate = this.plates[i];
      if (!plate) return;
      const x = s.x - box.left;
      const y = s.y - box.top;
      if (Math.abs(x - plate.x) < 0.5 && Math.abs(y - plate.y) < 0.5) return;
      moved = true;
      plate.x = x;
      plate.y = y;
      plate.r = Math.max(10, s.r);
      plate.root.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      plate.root.style.setProperty('--top-r', `${Math.max(10, s.r).toFixed(1)}px`);
      if (plate.world) {
        const dx = s.x - center.x;
        const dy = s.y - center.y;
        const len = Math.hypot(dx, dy) || 1;
        plate.out = [dx / len, dy / len];
      }
    });
    if (moved) this.separate();
  }

  /**
   * 2D layout of the nameplates. Each nameplate tries, in order, slots around its top: away from the
   * Whirl, shifted up or down, on the other side, above and below. A slot works if it does not
   * overlap the lid's fixed zones (H1 and subtitle, rail, BUILD, FLEET, band and the home nameplate)
   * or another nameplate already placed. If none works, the nameplate folds to its letter until the
   * top has passed. If it already had a free slot in the previous frame, it keeps it (no jumps),
   * unless the first slot is free again.
   */
  private separate(): void {
    const layer = this.o.layer;
    const box = layer.getBoundingClientRect();
    const keepOut = this.keepOuts(box);
    const bounds: Rect = { l: 6, t: 6, r: box.width - 6, b: box.height - 6 };
    for (const p of this.plates) {
      if (p.world) continue;
      // Home: its nameplate is placed by the CSS (beside the cradle); it is one more fixed zone.
      const label = p.hit.firstElementChild as HTMLElement;
      const r = label.getBoundingClientRect();
      keepOut.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });
    }
    const worlds = this.plates.filter((p) => p.world);
    for (const p of worlds) {
      if (p.size[0]) continue;
      const label = p.hit.firstElementChild as HTMLElement;
      p.root.classList.remove('is-folded');
      p.size = [label.offsetWidth, label.offsetHeight];
      const letter = label.querySelector<HTMLElement>('.plate-letter');
      const name = label.querySelector<HTMLElement>('.plate-name');
      // Folded: letter only. It is the last resort, when the layout finds no room for the whole nameplate.
      p.folded = name && name.offsetWidth > 0 && letter ? Math.ceil(letter.offsetWidth + 17) : p.size[0];
    }
    const choices = layoutPlates(
      worlds.map((p) => ({ x: p.x, y: p.y, r: p.r, out: p.out, w: p.size[0], folded: p.folded, h: p.size[1], slot: p.slot })),
      keepOut,
      bounds,
    );
    const zones = spreadHits(worlds, this.covers(box), bounds);
    worlds.forEach((p, i) => {
      const choice = choices[i];
      const folded = choice.folded;
      p.slot = choice.slot;
      const x = `${(choice.rect.l - p.x).toFixed(1)}px`;
      const y = `${(choice.rect.t - p.y).toFixed(1)}px`;
      const style = p.root.style;
      if (style.getPropertyValue('--plx') !== x) style.setProperty('--plx', x);
      if (style.getPropertyValue('--ply') !== y) style.setProperty('--ply', y);
      // The touch target, shifted off the top only when needed (the nameplate and the focus ring do not move).
      const hx = `${(zones[i].x - p.x).toFixed(1)}px`;
      const hy = `${(zones[i].y - p.y).toFixed(1)}px`;
      if (style.getPropertyValue('--hx') !== hx) style.setProperty('--hx', hx);
      if (style.getPropertyValue('--hy') !== hy) style.setProperty('--hy', hy);
      if (p.root.classList.contains('is-folded') !== folded) p.root.classList.toggle('is-folded', folded);
      // The scaling origin (hover) sits on the top's side.
      const left = choice.rect.r <= p.x + 1;
      if (p.root.classList.contains('is-left') !== left) p.root.classList.toggle('is-left', left);
    });
  }

  /** Fixed zones of the lid that no nameplate may cover, in layer px. */
  private keepOuts(box: DOMRect): Rect[] {
    const out: Rect[] = [];
    const add = (r: DOMRect, pad = 4) => {
      if (!r.width || !r.height) return;
      out.push({ l: r.left - box.left - pad, t: r.top - box.top - pad, r: r.right - box.left + pad, b: r.bottom - box.top + pad });
    };
    const lid = this.o.layer.parentElement ?? document;
    // Title and subtitle line by line (they are rotated: each line's box is tighter than the block's).
    for (const el of lid.querySelectorAll<HTMLElement>('.lid-title .h1-line')) add(el.getBoundingClientRect());
    const subline = lid.querySelector('.lid-title .subline');
    if (subline) {
      const range = document.createRange();
      range.selectNodeContents(subline);
      for (const r of range.getClientRects()) add(r);
    }
    for (const selector of ['.rail-plate', '.rail-controls', '.key-wrap', '.key-tag', '.ticket', '.gauge', '.log', '.lip']) {
      for (const el of lid.querySelectorAll<HTMLElement>(selector)) add(el.getBoundingClientRect(), 6);
    }
    return out;
  }

  /**
   * What sits above the world buttons and would take their taps, in layer px: the rocket grab (a
   * circle), the home button and the lid's controls. The open tag does not count: it is a popover the
   * visitor opened, and it covers what is underneath until it closes.
   */
  private covers(box: DOMRect): Cover[] {
    const out: Cover[] = [];
    const add = (r: DOMRect) => {
      if (r.width && r.height) out.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });
    };
    const lid = this.o.layer.parentElement ?? document;
    const grab = lid.querySelector<HTMLElement>('.rocket-grab')?.getBoundingClientRect();
    if (grab && grab.width) out.push({ x: grab.left + grab.width / 2 - box.left, y: grab.top + grab.height / 2 - box.top, r: grab.width / 2 });
    for (const p of this.plates) if (!p.world) add(p.hit.getBoundingClientRect());
    for (const selector of ['.rail', '.rail-plate', '.rail-controls', '.instrument', '.key-wrap', '.key-tag', '.ticket', '.gauge', '.log', '.lip']) {
      for (const el of lid.querySelectorAll<HTMLElement>(selector)) add(el.getBoundingClientRect());
    }
    return out;
  }

  private bindPlate(plate: Plate, route: string): void {
    const hit = plate.hit;
    let samples: { x: number; y: number; t: number }[] = [];
    let travel = 0;
    let pointerId: number | null = null;
    let suppressClick = false;

    hit.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      samples = [{ x: event.clientX, y: event.clientY, t: event.timeStamp }];
      travel = 0;
      try {
        hit.setPointerCapture(event.pointerId);
      } catch {
        // without capture, the flick is still measured while the pointer is over it
      }
    });
    hit.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const last = samples[samples.length - 1];
      travel += Math.hypot(event.clientX - last.x, event.clientY - last.y);
      samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
      samples = samples.filter((s) => event.timeStamp - s.t <= SAMPLE_MS * 2);
    });
    const release = (event: PointerEvent, cancelled: boolean) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      suppressClick = true;
      window.setTimeout(() => (suppressClick = false), 0);
      if (cancelled) return;
      if (travel >= FLICK_MIN_PX) {
        // Speed of the gesture over its last 80 ms.
        const recent = samples.filter((s) => event.timeStamp - s.t <= SAMPLE_MS);
        const first = recent[0] ?? samples[0];
        const dt = Math.max(16, event.timeStamp - first.t) / 1000;
        const speed = Math.hypot(event.clientX - first.x, event.clientY - first.y) / dt;
        this.o.flick(plate.index, flickOmega(speed));
      } else {
        this.o.spin(plate.index, TAP_SPIN);
      }
      if (event.pointerType !== 'mouse') this.open(plate);
    };
    hit.addEventListener('pointerup', (event) => release(event, false));
    hit.addEventListener('pointercancel', (event) => release(event, true));
    hit.addEventListener('click', (event) => {
      // The pointer already spun the top on pointerup; a keyboard click (Enter or Space) adds +40.
      if (suppressClick || event.detail > 0) return;
      this.o.spin(plate.index, KEY_SPIN);
    });

    hit.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') this.open(plate);
    });
    hit.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') this.scheduleClose();
    });
    hit.addEventListener('focus', () => {
      for (const p of this.plates) p.hit.tabIndex = p === plate ? 0 : -1;
      this.open(plate);
    });
    hit.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = this.plates[(plate.index + step + this.plates.length) % this.plates.length];
      next.hit.focus();
    });
    plate.root.dataset.route = route;
  }

  private open(plate: Plate): void {
    window.clearTimeout(this.closeTimer);
    this.openFor = plate;
    for (const p of this.plates) p.root.classList.toggle('is-open', p === plate);
    const world = plate.world ? WORLDS.find((w) => w.id === plate.world)! : null;
    const body = plate.world ? WORLD_BODIES.find((w) => w.id === plate.world)! : null;
    this.tagTitle.textContent = world && body ? `${world.letter} · ${world.name} ${body.coord}` : `Home tin ${HOME.coord}`;
    this.tagOpen.hidden = !world;
    if (world) {
      this.tagOpen.href = world.route;
      this.tagOpen.innerHTML = `Open ${world.name} <svg class="icon" aria-hidden="true"><use href="#i-arrow-up-right" /></svg>`;
    }
    // Pinned where it opened, in the visible part of the lid: next to the top or in the nearest free
    // spot. First without covering anything; if there is no room, without covering controls (it may
    // go over the title); never over the button that opened it (on a tap, the click arrives later and
    // would land on the tag).
    const layer = this.o.layer;
    this.tag.hidden = false;
    if (TOP_LAYER && !this.tag.matches(':popover-open')) this.tag.showPopover();
    const box = layer.getBoundingClientRect();
    const own = plate.hit.getBoundingClientRect();
    const mine: Rect = { l: own.left - box.left, t: own.top - box.top, r: own.right - box.left, b: own.bottom - box.top };
    const controls = [mine, ...this.covers(box)];
    const strip = document.querySelector('.strip')?.getBoundingClientRect().bottom ?? 0;
    const bounds: Rect = { l: 12, t: Math.max(12, strip - box.top + 12), r: box.width - 12, b: Math.min(box.height, window.innerHeight - box.top) - 12 };
    const spot = placeTag(plate.x + 26, plate.y + 30, this.tag.offsetWidth, this.tag.offsetHeight, [[...controls, ...this.keepOuts(box)], controls, [mine]], bounds);
    // In the top layer, `absolute` is relative to the document.
    const x = spot.x + (TOP_LAYER ? box.left + window.scrollX : 0);
    const y = spot.y + (TOP_LAYER ? box.top + window.scrollY : 0);
    this.tag.style.translate = `${x.toFixed(0)}px ${y.toFixed(0)}px`;
  }

  private scheduleClose(delay = 500): void {
    window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && this.tag.parentElement?.contains(active) && delay > 200) return;
      if (this.tag.matches(':hover')) return;
      this.close();
    }, delay);
  }

  private close(): void {
    this.openFor = null;
    if (TOP_LAYER && this.tag.matches(':popover-open')) this.tag.hidePopover();
    this.tag.hidden = true;
    for (const p of this.plates) p.root.classList.remove('is-open');
  }

  /** For tests only: the layer's box at the last placement. */
  get origin(): { left: number; top: number } {
    return this.layerBox;
  }
}

/** A nameplate's geometry for the layout: its top (center, radius, outward direction) and sizes. */
export interface PlateGeom {
  x: number;
  y: number;
  r: number;
  out: [number, number];
  /** Full width, folded width (letter only) and height. */
  w: number;
  folded: number;
  h: number;
  /** Slot from the previous layout (kept while it stays free). */
  slot: number;
}

/** Candidate slots (layer px) for a nameplate of width `w`, in order of preference. */
export function plateSlots(p: PlateGeom, w: number): Rect[] {
  const h = p.h;
  const gap = p.r + 6;
  const step = h + 4;
  const outLeft = p.out[0] < 0;
  const ax = p.x + p.out[0] * gap;
  const ay = p.y + p.out[1] * gap;
  const outL = outLeft ? ax - w : ax;
  const flipL = outLeft ? p.x + gap : p.x - gap - w;
  const rect = (l: number, t: number): Rect => ({ l, t, r: l + w, b: t + h });
  const up = p.out[1] < 0 ? -1 : 1;
  return [
    rect(outL, ay - h / 2),
    rect(outL, ay - h / 2 + up * step),
    rect(outL, ay - h / 2 - up * step),
    rect(flipL, p.y - h / 2),
    rect(p.x - w / 2, p.y - gap - h),
    rect(p.x - w / 2, p.y + gap),
    rect(outL, ay - h / 2 + up * 2 * step),
    rect(flipL, p.y - h / 2 + up * step),
    rect(flipL, p.y - h / 2 - up * step),
    rect(p.x - w / 2, p.y - gap - h - step),
    rect(p.x - w / 2, p.y + gap + step),
    rect(outL, ay - h / 2 - up * 2 * step),
  ];
}

/** Radius of each world top's touch target (the button is 64 px). */
export const HIT_R = 32;
/** Half side of the core that nothing else may cover: 44 px, the minimum touch target. */
export const HIT_CORE = 22;
/**
 * Margin between zones. Chrome hit-tests a tap against a rounded border with a small 1 px square, not
 * with the point: diagonally, the circle actually registers taps up to ~1.7 px beyond its radius.
 */
const HIT_AIR = 2.5;

/** What sits above the world buttons: a rectangle, or a circle (the rocket grab). */
export type Cover = Rect | { x: number; y: number; r: number };

/**
 * How far a point at (dx, dy) from a core's center must move to end up `need` px or more from the
 * core's square. Inside, or in the band beside one side, it exits along the axis; at a corner, diagonally.
 */
function clearOfCore(dx: number, dy: number, need: number): [number, number] {
  const sx = dx < 0 ? -1 : 1;
  const sy = dy < 0 ? -1 : 1;
  const ax = Math.abs(dx) - HIT_CORE;
  const ay = Math.abs(dy) - HIT_CORE;
  if (ax > 0 && ay > 0) {
    const d = Math.hypot(ax, ay);
    if (d >= need) return [0, 0];
    const k = (need - d) / d;
    return [sx * ax * k, sy * ay * k];
  }
  if (ax >= ay) return ax >= need ? [0, 0] : [sx * (need - ax), 0];
  return ay >= need ? [0, 0] : [0, sy * (need - ay)];
}

/** Distance from a point (at dx, dy from a core's center) to the core's square. */
function toCore(dx: number, dy: number): number {
  return Math.hypot(Math.max(Math.abs(dx) - HIT_CORE, 0), Math.max(Math.abs(dy) - HIT_CORE, 0));
}

/** Does the core of zone `i`, placed at `p`, stay clear of the other zones, of the covers and of the edge? `air` = margin. */
function fits(p: { x: number; y: number }, i: number, zones: { x: number; y: number }[], covers: Cover[], bounds: Rect, air: number): boolean {
  if (p.x - HIT_CORE < bounds.l || p.x + HIT_CORE > bounds.r || p.y - HIT_CORE < bounds.t || p.y + HIT_CORE > bounds.b) return false;
  for (let j = 0; j < zones.length; j++) if (j !== i && toCore(zones[j].x - p.x, zones[j].y - p.y) < HIT_R + air) return false;
  for (const c of covers) {
    if ('l' in c) {
      if (p.x + HIT_CORE > c.l - air && p.x - HIT_CORE < c.r + air && p.y + HIT_CORE > c.t - air && p.y - HIT_CORE < c.b + air) return false;
    } else if (toCore(c.x - p.x, c.y - p.y) < c.r + air) return false;
  }
  return true;
}

/**
 * Centers of the world tops' touch targets (layer px), as close as possible to each top. The planets
 * orbit and cross, and the rocket grab, the home button and the lid's controls sit above them:
 * without this, a button can end up almost entirely covered. Each zone shifts just enough for its
 * 44 px core to stay clear of any other world's 64 px circle, outside everything that covers it and
 * inside `bounds`. With two tops touching, each one stays inside its own circle. It always starts
 * from the tops (no memory between frames): the zone never lags behind.
 *
 * First a relaxation (each pair splits the shift); if a cluster gets stuck against the edge or the
 * grab, the stuck zone takes the free spot nearest its top.
 */
export function spreadHits(anchors: { x: number; y: number }[], covers: Cover[], bounds: Rect): { x: number; y: number }[] {
  const h = anchors.map((a) => ({ x: a.x, y: a.y }));
  const need = HIT_R + HIT_AIR;
  for (let round = 0; round < 64; round++) {
    let moved = 0;
    for (let i = 0; i < h.length; i++) {
      for (let j = i + 1; j < h.length; j++) {
        let dx = h[j].x - h[i].x;
        let dy = h[j].y - h[i].y;
        if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) {
          // Stacked on top of each other: each pair separates toward its own side.
          const a = (i * 7 + j) * 2.39996;
          dx = Math.cos(a) * 1e-3;
          dy = Math.sin(a) * 1e-3;
        }
        const [mx, my] = clearOfCore(dx, dy, need);
        if (!mx && !my) continue;
        h[i].x -= mx / 2;
        h[i].y -= my / 2;
        h[j].x += mx / 2;
        h[j].y += my / 2;
        moved = Math.max(moved, Math.abs(mx) + Math.abs(my));
      }
    }
    for (const p of h) {
      const x0 = p.x;
      const y0 = p.y;
      for (const c of covers) {
        if ('l' in c) {
          const left = p.x + HIT_CORE - (c.l - HIT_AIR);
          const right = c.r + HIT_AIR - (p.x - HIT_CORE);
          const up = p.y + HIT_CORE - (c.t - HIT_AIR);
          const down = c.b + HIT_AIR - (p.y - HIT_CORE);
          if (left <= 0 || right <= 0 || up <= 0 || down <= 0) continue;
          const m = Math.min(left, right, up, down);
          if (m === left) p.x -= left;
          else if (m === right) p.x += right;
          else if (m === up) p.y -= up;
          else p.y += down;
        } else {
          const [mx, my] = clearOfCore(c.x - p.x, c.y - p.y, c.r + HIT_AIR);
          p.x -= mx;
          p.y -= my;
        }
      }
      p.x = Math.min(bounds.r - HIT_CORE, Math.max(bounds.l + HIT_CORE, p.x));
      p.y = Math.min(bounds.b - HIT_CORE, Math.max(bounds.t + HIT_CORE, p.y));
      moved = Math.max(moved, Math.abs(p.x - x0) + Math.abs(p.y - y0));
    }
    if (moved < 0.01) break;
  }
  h.forEach((p, i) => {
    // With almost the full margin (what Chrome eats diagonally stays inside), the relaxation was enough.
    if (fits(p, i, h, covers, bounds, HIT_AIR - 0.5)) return;
    // Stuck: the nearest free spot, in 3 px rings around the top.
    const a = anchors[i];
    for (let r = 3; r < 1200; r += 3) {
      const n = Math.max(8, Math.ceil((2 * Math.PI * r) / 3));
      for (let k = 0; k < n; k++) {
        const t = (k / n) * 2 * Math.PI;
        const q = { x: a.x + Math.cos(t) * r, y: a.y + Math.sin(t) * r };
        if (fits(q, i, h, covers, bounds, HIT_AIR)) {
          h[i] = q;
          return;
        }
      }
    }
  });
  return h;
}

/**
 * Position of the tin tag (top-left corner, layer px): the preferred one, clamped into `bounds`, or
 * the one nearest to it (6 px rings, up to `reach`) that covers nothing in the first list of `tiers`;
 * failing that, nothing in the second, and so on. If there is none, the preferred one.
 */
export function placeTag(x0: number, y0: number, w: number, h: number, tiers: Cover[][], bounds: Rect, reach = 320): { x: number; y: number } {
  const sx = Math.max(bounds.l, Math.min(bounds.r - w, x0));
  const sy = Math.max(bounds.t, Math.min(bounds.b - h, y0));
  for (const blocks of tiers) {
    const spot = nearestFree(sx, sy, w, h, blocks, bounds, reach);
    if (spot) return spot;
  }
  return { x: sx, y: sy };
}

function nearestFree(sx: number, sy: number, w: number, h: number, blocks: Cover[], bounds: Rect, reach: number): { x: number; y: number } | null {
  const free = (x: number, y: number) =>
    x >= bounds.l &&
    y >= bounds.t &&
    x + w <= bounds.r &&
    y + h <= bounds.b &&
    blocks.every((c) =>
      'l' in c
        ? x >= c.r + HIT_AIR || c.l - HIT_AIR >= x + w || y >= c.b + HIT_AIR || c.t - HIT_AIR >= y + h
        : Math.hypot(Math.max(x - c.x, 0, c.x - x - w), Math.max(y - c.y, 0, c.y - y - h)) >= c.r + HIT_AIR,
    );
  if (free(sx, sy)) return { x: sx, y: sy };
  for (let r = 6; r <= reach; r += 6) {
    const n = Math.max(8, Math.ceil((2 * Math.PI * r) / 6));
    for (let k = 0; k < n; k++) {
      const t = (k / n) * 2 * Math.PI;
      const x = sx + Math.cos(t) * r;
      const y = sy + Math.sin(t) * r;
      if (free(x, y)) return { x, y };
    }
  }
  return null;
}

/**
 * Greedy 2D layout, in order: each nameplate takes its first slot if it is free, otherwise the one
 * from the previous frame, otherwise the first free one; with none, it folds to its letter and tries
 * again; with nothing free even folded, it stays folded in its first slot.
 */
export function layoutPlates(plates: PlateGeom[], keepOut: Rect[], bounds: Rect): { rect: Rect; slot: number; folded: boolean }[] {
  const placed: Rect[] = [];
  const free = (c: Rect) =>
    c.l >= bounds.l &&
    c.t >= bounds.t &&
    c.r <= bounds.r &&
    c.b <= bounds.b &&
    !keepOut.some((k) => hits(c, k)) &&
    // 3 px of margin between nameplates (the measured size is rounded and hover scales by 1.08).
    !placed.some((k) => hits({ l: c.l - 3, t: c.t - 3, r: c.r + 3, b: c.b + 3 }, k));
  // No free slot even folded: the slot that covers the least (fixed zones weigh twice as much as another nameplate).
  const area = (a: Rect, b: Rect) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const leastCovered = (slots: Rect[]): { slot: number; rect: Rect } => {
    let best = { slot: 0, rect: slots[0] };
    let bestCost = Infinity;
    slots.forEach((rect, slot) => {
      const inside = rect.l >= bounds.l && rect.t >= bounds.t && rect.r <= bounds.r && rect.b <= bounds.b;
      const cost = (inside ? 0 : 1e6) + keepOut.reduce((sum, k) => sum + 2 * area(rect, k), 0) + placed.reduce((sum, k) => sum + area(rect, k), 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = { slot, rect };
      }
    });
    return best;
  };
  return plates.map((p) => {
    const pick = (width: number): { slot: number; rect: Rect } | null => {
      const slots = plateSlots(p, width);
      if (free(slots[0])) return { slot: 0, rect: slots[0] };
      if (p.slot > 0 && p.slot < slots.length && free(slots[p.slot])) return { slot: p.slot, rect: slots[p.slot] };
      for (let i = 1; i < slots.length; i++) if (free(slots[i])) return { slot: i, rect: slots[i] };
      return null;
    };
    let folded = false;
    let choice = pick(p.w);
    if (!choice) {
      folded = true;
      choice = pick(p.folded) ?? leastCovered(plateSlots(p, p.folded));
    }
    placed.push(choice.rect);
    return { ...choice, folded };
  });
}
