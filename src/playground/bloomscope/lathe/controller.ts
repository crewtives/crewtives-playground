// The playable lathe, without graphics: species, leaves (drag, buttons and a slider with ticks),
// Plump and Blush, the ±70° orbit, the "Stretch time" tab with its spring, the water drop and "Put in
// the Scope". The view (WebGL or 2D) reads the state and resolves which leaf is under the pointer.

import { motion } from '../../shared/motion';
import { bloomEase, type Toy, type ToyRenderer } from '../bench/common';
import { drip, limiter, marimba } from '../sfx';
import type { RosetteSpecies } from '../specimens/spec';
import { dropExposures, dropPath, STRETCH_STOPS, type DropPath, type RosetteParams, type V3 } from './rosette';

export interface LatheElements {
  section: HTMLElement;
  view: HTMLElement;
  species: HTMLInputElement[];
  leaves: HTMLInputElement;
  leavesOut: HTMLElement;
  plus1: HTMLButtonElement;
  plus8: HTMLButtonElement;
  minus1: HTMLButtonElement;
  plump: HTMLInputElement;
  blush: HTMLInputElement;
  stretch: HTMLInputElement;
  stretchStops: HTMLButtonElement[];
  drop: HTMLButtonElement;
  live: HTMLElement;
}

export interface LathePick {
  leaf: number;
  s: number;
}

export interface LatheRenderer extends ToyRenderer {
  /** Leaf and position along the spine under a screen point, or null. */
  pick?(clientX: number, clientY: number): LathePick | null;
}

const YAW_LIMIT = 70;
const LEAF_PX = 24;
const SPRING_K = 170;
const SPRING_C = 18;
/** Marimba notes per leaf: a major scale that climbs with the count. */
const LEAF_SCALE = [392, 440, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99];

export class LatheController implements Toy {
  species: RosetteSpecies = 'echeveria';
  leaves = 21;
  plump = 0.5;
  blush = 0.6;
  /** Stretch time as shown (with the spring). */
  stretch = 0;
  yaw = -18;
  /** Geometry version: the view rebuilds the geometry if it changed. */
  version = 0;
  /** The drop: its path, the elapsed time and the 16 exposures. */
  drop: { path: DropPath; t: number; shots: V3[] } | null = null;
  readonly maxLeaves: number;

  private renderer: LatheRenderer | null = null;
  private readonly el: LatheElements;
  private yawTarget = -18;
  private stretchTarget = 0;
  private stretchV = 0;
  private springing = false;
  private bloomStart = -1;
  private bloomDone = false;
  private dripped = false;
  private readonly leafSound = limiter(16);
  private drag: { id: number; x0: number; y0: number; lastY: number; acc: number; axis: 'x' | 'y' | null; yaw0: number } | null = null;

  constructor(elements: LatheElements, maxLeaves: number) {
    this.el = elements;
    this.maxLeaves = maxLeaves;
    elements.leaves.max = String(maxLeaves);
    if (motion.reduced) this.bloomDone = true;
    this.bindControls();
    this.bindView();
    this.render();
  }

  attach(renderer: LatheRenderer): void {
    this.renderer = renderer;
    renderer.sync();
  }

  get params(): RosetteParams {
    return { species: this.species, leaves: this.leaves, plump: this.plump, blush: this.blush, stretch: this.stretch };
  }

  /** 0–1: the bloom of leaf k, in birth order (oldest first, 18 ms per leaf). */
  grow(k: number): number {
    if (this.bloomDone) return 1;
    if (this.bloomStart < 0) return 0;
    const order = this.leaves - 1 - k;
    return bloomEase((performance.now() - this.bloomStart - order * 18) / 600);
  }

  get blooming(): boolean {
    return !this.bloomDone;
  }

  bloom(): void {
    if (this.bloomDone || this.bloomStart >= 0) return;
    this.bloomStart = performance.now();
    this.wake();
  }

  tick(dt: number): boolean {
    let busy = false;
    let changed = false;
    // Orbit with 4/s damping.
    if (Math.abs(this.yaw - this.yawTarget) > 0.01) {
      this.yaw += (this.yawTarget - this.yaw) * (1 - Math.exp(-(motion.reduced ? 60 : 4) * dt * (this.drag ? 3 : 1)));
      changed = true;
      busy = true;
    } else if (this.yaw !== this.yawTarget) {
      this.yaw = this.yawTarget;
      changed = true;
    }
    // Spring of the tab (k = 170, c = 18).
    if (this.springing) {
      const a = SPRING_K * (this.stretchTarget - this.stretch) - SPRING_C * this.stretchV;
      this.stretchV += a * dt;
      this.stretch += this.stretchV * dt;
      if (Math.abs(this.stretchTarget - this.stretch) < 0.001 && Math.abs(this.stretchV) < 0.01) {
        this.stretch = this.stretchTarget;
        this.springing = false;
      }
      this.stretch = Math.min(1.08, Math.max(-0.02, this.stretch));
      this.el.stretch.value = String(Math.min(1, Math.max(0, this.stretch)));
      this.version++;
      changed = true;
      busy = this.springing || busy;
    }
    if (this.drop && this.drop.t < this.drop.path.duration) {
      const d = this.drop;
      d.t += dt;
      if (d.t >= d.path.duration) {
        d.t = d.path.duration;
        if (!this.dripped) {
          this.dripped = true;
          drip();
          this.el.live.textContent = `The drop reached the heart of the plant after ${d.path.leaves.length} leaves.`;
        }
      } else busy = true;
      changed = true;
    }
    if (this.bloomStart >= 0 && !this.bloomDone) {
      if (performance.now() - this.bloomStart > this.leaves * 18 + 650) this.bloomDone = true;
      this.version++;
      changed = true;
      busy = true;
    }
    if (changed) this.renderer?.sync();
    return busy;
  }

  // ------------------------------------------------------------------ actions

  setLeaves(n: number, announce = true): void {
    const next = Math.max(1, Math.min(this.maxLeaves, Math.round(n)));
    if (next === this.leaves) return;
    const grew = next > this.leaves;
    this.leaves = next;
    this.drop = null;
    if (grew && this.leafSound()) marimba(LEAF_SCALE[next % LEAF_SCALE.length] * (next > 34 ? 2 : 1), 0.18);
    this.render();
    if (announce) this.el.live.textContent = `${next} ${next === 1 ? 'leaf' : 'leaves'}.`;
  }

  setSpecies(species: RosetteSpecies): void {
    if (species === this.species) return;
    this.species = species;
    this.drop = null;
    this.render();
  }

  /** Takes "Stretch time" to a value with the spring (or instantly under reduced motion). */
  setStretch(value: number, spring = true): void {
    this.stretchTarget = Math.min(1, Math.max(0, value));
    this.drop = null;
    if (!spring || motion.reduced) {
      this.stretch = this.stretchTarget;
      this.stretchV = 0;
      this.springing = false;
      this.el.stretch.value = String(this.stretch);
      this.render();
      return;
    }
    this.springing = true;
    this.renderStops();
    this.describe();
    this.wake();
  }

  /** Drops water: onto the given leaf, or onto an outer leaf. */
  dropWater(pick?: LathePick | null): void {
    const leaf = pick ? pick.leaf : this.leaves - 1;
    const s = pick ? Math.min(0.95, Math.max(0.4, pick.s)) : 0.85;
    const path = dropPath(this.params, leaf, s);
    this.dripped = false;
    this.drop = { path, t: motion.reduced ? path.duration : 0, shots: dropExposures(path, 16) };
    if (motion.reduced) {
      this.dripped = true;
      drip();
      this.el.live.textContent = `The drop ran down ${path.leaves.length} leaves to the heart of the plant.`;
    } else {
      this.el.live.textContent = 'A drop of water runs down the leaves.';
    }
    this.renderer?.sync();
    this.wake();
  }

  // ------------------------------------------------------------------ internals

  private wake(): void {
    this.renderer?.wake();
  }

  private render(): void {
    this.version++;
    const e = this.el;
    e.leaves.value = String(this.leaves);
    e.leavesOut.textContent = `${this.leaves} ${this.leaves === 1 ? 'leaf' : 'leaves'}`;
    e.leaves.setAttribute('aria-valuetext', `${this.leaves} leaves`);
    e.plus1.disabled = e.plus8.disabled = this.leaves >= this.maxLeaves;
    e.minus1.disabled = this.leaves <= 1;
    for (const input of e.species) input.checked = input.value === this.species;
    e.plump.value = String(this.plump);
    e.blush.value = String(this.blush);
    this.renderStops();
    this.describe();
    this.renderer?.sync();
  }

  /** Live description of the view: species, leaves and "Stretch time". */
  private describe(): void {
    const name = this.species === 'echeveria' ? 'An echeveria' : this.species === 'aloe-cw' ? 'A clockwise spiral aloe' : 'A counter-clockwise spiral aloe';
    const stop = STRETCH_STOPS.find((s) => Math.abs(s.value - this.stretchTarget) < 0.01);
    const shape = stop ? (stop.value === 0 ? 'as a rosette' : stop.value === 1 ? 'stretched into a staircase' : 'stretched halfway') : `${Math.round(this.stretchTarget * 100)}% stretched`;
    const label = `${name} with ${this.leaves} ${this.leaves === 1 ? 'leaf' : 'leaves'}, ${shape}. Enter drops water; arrow keys turn the plant and add or remove leaves.`;
    if (this.el.view.getAttribute('aria-label') !== label) this.el.view.setAttribute('aria-label', label);
  }

  private renderStops(): void {
    this.el.stretchStops.forEach((button, i) => button.setAttribute('aria-pressed', String(Math.abs(STRETCH_STOPS[i].value - this.stretchTarget) < 0.01)));
    const stop = STRETCH_STOPS.find((s) => Math.abs(s.value - this.stretchTarget) < 0.01);
    this.el.stretch.setAttribute('aria-valuetext', stop ? stop.label : `${Math.round(this.stretchTarget * 100)}% stretched`);
  }

  private bindControls(): void {
    const e = this.el;
    for (const input of e.species) input.addEventListener('change', () => input.checked && this.setSpecies(input.value as RosetteSpecies));
    e.leaves.addEventListener('input', () => this.setLeaves(Number(e.leaves.value), false));
    e.leaves.addEventListener('change', () => (e.live.textContent = `${this.leaves} leaves.`));
    e.plus1.addEventListener('click', () => this.setLeaves(this.leaves + 1));
    e.plus8.addEventListener('click', () => this.setLeaves(this.leaves + 8));
    e.minus1.addEventListener('click', () => this.setLeaves(this.leaves - 1));
    e.plump.addEventListener('input', () => {
      this.plump = Number(e.plump.value);
      this.render();
    });
    e.blush.addEventListener('input', () => {
      this.blush = Number(e.blush.value);
      this.render();
    });
    // The tab: it follows the finger and, on release, the spring takes it to the nearest stop.
    e.stretch.addEventListener('input', () => {
      this.stretchTarget = Number(e.stretch.value);
      this.stretch = this.stretchTarget;
      this.stretchV = 0;
      this.springing = false;
      this.drop = null;
      this.version++;
      this.renderStops();
      this.renderer?.sync();
    });
    e.stretch.addEventListener('change', () => {
      const v = Number(e.stretch.value);
      const nearest = STRETCH_STOPS.reduce((a, b) => (Math.abs(b.value - v) < Math.abs(a.value - v) ? b : a));
      this.setStretch(nearest.value);
      e.live.textContent = `Stretch time: ${nearest.label}.`;
    });
    e.stretchStops.forEach((button, i) =>
      button.addEventListener('click', () => {
        this.setStretch(STRETCH_STOPS[i].value);
        e.live.textContent = `Stretch time: ${STRETCH_STOPS[i].label}.`;
      }),
    );
    e.drop.addEventListener('click', () => this.dropWater());
  }

  /**
   * On the plant: a vertical drag with mouse or pen = leaves (one every 24 px, downward adds);
   * horizontal = orbit; a click = a drop on that leaf. With a finger, the view lets vertical scroll
   * through (`pan-y`): a horizontal drag orbits and a tap releases the drop.
   */
  private bindView(): void {
    const view = this.el.view;
    view.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      this.drag = { id: event.pointerId, x0: event.clientX, y0: event.clientY, lastY: event.clientY, acc: 0, axis: null, yaw0: this.yawTarget };
    });
    view.addEventListener('pointermove', (event) => {
      const d = this.drag;
      if (!d || d.id !== event.pointerId) return;
      const dx = event.clientX - d.x0;
      const dy = event.clientY - d.y0;
      if (d.axis === null) {
        if (Math.hypot(dx, dy) < 6) return;
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (d.axis === 'y' && event.pointerType === 'touch') {
          // A vertical finger is page scroll.
          this.drag = null;
          return;
        }
        view.setPointerCapture(event.pointerId);
        view.classList.add(d.axis === 'x' ? 'is-orbiting' : 'is-growing');
      }
      if (d.axis === 'x') {
        this.yawTarget = Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, d.yaw0 + dx * 0.35));
        this.wake();
      } else {
        d.acc += event.clientY - d.lastY;
        d.lastY = event.clientY;
        while (d.acc >= LEAF_PX) {
          d.acc -= LEAF_PX;
          this.setLeaves(this.leaves + 1, false);
        }
        while (d.acc <= -LEAF_PX) {
          d.acc += LEAF_PX;
          this.setLeaves(this.leaves - 1, false);
        }
      }
    });
    const end = (event: PointerEvent) => {
      const d = this.drag;
      if (!d || d.id !== event.pointerId) return;
      this.drag = null;
      view.classList.remove('is-orbiting', 'is-growing');
      if (d.axis === null && event.type === 'pointerup') {
        // A click: the drop falls where it was touched (if there is a leaf), or on an outer leaf.
        this.dropWater(this.renderer?.pick?.(event.clientX, event.clientY) ?? null);
      } else if (d.axis === 'y') {
        this.el.live.textContent = `${this.leaves} leaves.`;
      }
    };
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.dropWater();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.yawTarget = Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, this.yawTarget + (event.key === 'ArrowLeft' ? -10 : 10)));
        this.wake();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.setLeaves(this.leaves + (event.key === 'ArrowDown' ? 1 : -1));
      }
    });
  }
}
