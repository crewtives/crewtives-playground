// The playable honeycomb, without graphics: painting cells, Run (6 generations per second), Step,
// Rewind, Clear, Random with the printed seed, the generation readout, the grid with a hexagonal
// keyboard cursor, and "Put in the Scope". The view (WebGL or 2D) reads the frame and turns the pointer into a cell.

import { motion } from '../../shared/motion';
import { bloomEase, throttledAnnouncer, type Toy, type ToyRenderer } from '../bench/common';
import { limiter, marimba, tock } from '../sfx';
import { cellCenter, frameSize, Hive, moveCursor, RUN_RATE } from './hexLife';

export interface HiveElements {
  section: HTMLElement;
  view: HTMLElement;
  run: HTMLButtonElement;
  step: HTMLButtonElement;
  rewind: HTMLButtonElement;
  clear: HTMLButtonElement;
  random: HTMLButtonElement;
  generation: HTMLElement;
  live: HTMLElement;
}

export interface HiveRenderer extends ToyRenderer {
  /** Cell under a screen point, or −1. */
  cellAt(clientX: number, clientY: number): number;
}

export class HiveController implements Toy {
  readonly hive: Hive;
  readonly layers: number;
  readonly seed: number;
  running = false;
  cursor: number;
  focused = false;
  /** Frame version: the view rebuilds the layers if it changed. */
  version = 0;

  private renderer: HiveRenderer | null = null;
  private readonly el: HiveElements;
  private clock = 0;
  private bloomStart = -1;
  private bloomDone = false;
  private paint: { id: number; value: boolean; last: number } | null = null;
  /** The visitor has painted or moved the cursor: from then on their cell is the NOW cell. */
  private touched = false;
  private readonly capSound = limiter(3);
  private readonly announce: (message: string) => void;
  private cellIds: HTMLElement[] = [];
  private visible = true;

  constructor(elements: HiveElements, size: { w: number; h: number }, layers: number, seed: number) {
    this.el = elements;
    this.hive = new Hive(size.w, size.h);
    this.layers = layers;
    this.seed = seed;
    this.cursor = Math.floor(size.h / 2) * size.w + Math.floor(size.w / 2);
    this.announce = throttledAnnouncer(elements.live, 700);
    elements.random.querySelector('.gem-text')!.textContent = `Random (seed ${String(seed).padStart(4, '0')})`;
    // Opens with the printed seed and the stack already full (one layer per stored generation): the
    // wax is visible from the start. It is the initial state, not an animation.
    this.hive.random(seed);
    for (let i = 0; i < layers - 1; i++) this.hive.step();
    if (motion.reduced) this.bloomDone = true;
    this.buildGrid();
    this.bindControls();
    this.bindView();
    this.render();
  }

  attach(renderer: HiveRenderer): void {
    this.renderer = renderer;
    renderer.sync();
  }

  /** The view reports whether the frame is on screen: off screen, Run pauses. */
  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible && this.running) this.wake();
  }

  /** 0–1: bloom in rings from the center of the frame, 60 ms per ring. */
  grow(index: number): number {
    if (this.bloomDone) return 1;
    if (this.bloomStart < 0) return 0;
    const { w, h } = this.hive;
    const f = frameSize(w, h);
    const [x, y] = cellCenter(index % w, Math.floor(index / w));
    const ring = Math.hypot(x + f.x0, y + f.y0) / Math.sqrt(3);
    return bloomEase((performance.now() - this.bloomStart - ring * 60) / 600);
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
    if (this.running && this.visible) {
      this.clock += dt;
      const period = 1 / RUN_RATE;
      if (this.clock >= period) {
        this.clock -= period;
        if (this.clock > period) this.clock = 0;
        this.step(false);
      }
      busy = true;
    }
    if (this.bloomStart >= 0 && !this.bloomDone) {
      if (performance.now() - this.bloomStart > 60 * 16 + 700) this.bloomDone = true;
      this.version++;
      this.renderer?.sync();
      busy = true;
    }
    return busy;
  }

  // ------------------------------------------------------------------ actions

  step(manual = true): void {
    this.hive.step();
    let caps = 0;
    const { w, h } = this.hive;
    for (let i = 0; i < w * h; i++) if (this.hive.streak[i] === 6) caps++;
    for (let i = 0; i < Math.min(caps, 3); i++) if (this.capSound()) tock();
    if (manual) marimba(this.hive.alive % 2 ? 330 : 392, 0.16);
    if (this.hive.alive === 0 && this.running) {
      this.setRunning(false);
      this.announce(`Generation ${this.hive.generation}: the frame is empty. Run stopped.`);
    } else if (manual) {
      this.announce(`Generation ${this.hive.generation}, ${this.hive.alive} cells alive.`);
    }
    this.render();
  }

  rewind(): void {
    if (!this.hive.rewind()) return;
    this.announce(`Rewind to generation ${this.hive.generation}, ${this.hive.alive} cells alive.`);
    this.render();
  }

  setRunning(on: boolean): void {
    this.running = on;
    this.clock = 0;
    this.el.run.setAttribute('aria-pressed', String(on));
    const label = this.el.run.querySelector('.gem-text');
    if (label) label.textContent = on ? 'Pause' : 'Run';
    if (on) {
      this.announce(`Running, generation ${this.hive.generation}.`);
      this.wake();
    }
  }

  // ------------------------------------------------------------------ internals

  private wake(): void {
    this.renderer?.wake();
  }

  private render(): void {
    this.version++;
    this.el.generation.textContent = `generation ${this.hive.generation}`;
    this.el.rewind.disabled = this.hive.generation === 0;
    const { w, h } = this.hive;
    this.el.view.setAttribute('aria-label', `Hive frame, ${w} by ${h} cells: generation ${this.hive.generation}, ${this.hive.alive} cells alive`);
    this.renderCursor();
    this.renderer?.sync();
  }

  /** Accessible grid: rows and cells hidden from view, with the cursor as the active descendant. */
  private buildGrid(): void {
    const { w, h } = this.hive;
    const view = this.el.view;
    const rows: HTMLElement[] = [];
    this.cellIds = [];
    for (let r = 0; r < h; r++) {
      const row = document.createElement('div');
      row.setAttribute('role', 'row');
      for (let q = 0; q < w; q++) {
        const cell = document.createElement('div');
        cell.setAttribute('role', 'gridcell');
        cell.id = `hive-cell-${r}-${q}`;
        row.append(cell);
        this.cellIds.push(cell);
      }
      rows.push(row);
    }
    const grid = document.createElement('div');
    grid.className = 'sr-only';
    grid.append(...rows);
    view.append(grid);
    view.setAttribute('aria-rowcount', String(h));
    view.setAttribute('aria-colcount', String(w));
  }

  private renderCursor(): void {
    const cell = this.cellIds[this.cursor];
    if (!cell) return;
    const { w } = this.hive;
    const q = this.cursor % w;
    const r = Math.floor(this.cursor / w);
    const alive = this.hive.cells[this.cursor] === 1;
    cell.setAttribute('aria-label', `Row ${r + 1}, cell ${q + 1}, ${alive ? (this.hive.capped(this.cursor) ? 'capped' : 'alive') : 'empty'}`);
    cell.setAttribute('aria-selected', String(alive));
    this.el.view.setAttribute('aria-activedescendant', cell.id);
  }

  /**
   * The frame's only ruby cell: the cursor's (keyboard or pointer), if it is alive and the visitor has
   * already touched it. Newborn cells are pollen with a rule; the ruby is kept for a single NOW.
   */
  get nowCell(): number {
    return this.touched && this.hive.cells[this.cursor] === 1 ? this.cursor : -1;
  }

  private toggle(index: number, value?: boolean): boolean {
    this.touched = true;
    const alive = value ?? this.hive.cells[index] !== 1;
    if (!this.hive.set(index, alive)) return alive;
    this.render();
    return alive;
  }

  private bindControls(): void {
    const e = this.el;
    e.run.addEventListener('click', () => this.setRunning(!this.running));
    e.step.addEventListener('click', () => {
      this.setRunning(false);
      this.step();
    });
    e.rewind.addEventListener('click', () => {
      this.setRunning(false);
      this.rewind();
    });
    e.clear.addEventListener('click', () => {
      this.setRunning(false);
      this.hive.clear();
      this.announce('Cleared. Generation 0, no cells.');
      this.render();
    });
    e.random.addEventListener('click', () => {
      this.setRunning(false);
      this.hive.random(this.seed);
      this.announce(`Random fill from seed ${this.seed}. Generation 0, ${this.hive.alive} cells alive.`);
      this.render();
    });
  }

  private bindView(): void {
    const view = this.el.view;
    view.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !this.renderer) return;
      const index = this.renderer.cellAt(event.clientX, event.clientY);
      if (index < 0) return;
      this.cursor = index;
      const value = this.toggle(index);
      // With mouse or pen, dragging paints; with a finger, only the tap (dragging is scroll).
      if (event.pointerType !== 'touch') {
        view.setPointerCapture(event.pointerId);
        this.paint = { id: event.pointerId, value, last: index };
      }
    });
    view.addEventListener('pointermove', (event) => {
      const p = this.paint;
      if (!p || p.id !== event.pointerId || !this.renderer) return;
      const index = this.renderer.cellAt(event.clientX, event.clientY);
      if (index < 0 || index === p.last) return;
      p.last = index;
      this.cursor = index;
      this.toggle(index, p.value);
    });
    const end = (event: PointerEvent) => {
      if (this.paint?.id === event.pointerId) this.paint = null;
    };
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('focus', () => {
      this.focused = true;
      this.renderer?.sync();
    });
    view.addEventListener('blur', () => {
      this.focused = false;
      this.renderer?.sync();
    });
    view.addEventListener('keydown', (event) => {
      const { w, h } = this.hive;
      const moves: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      const move = moves[event.key];
      if (move) {
        this.cursor = moveCursor(this.cursor, move, event.shiftKey, w, h);
        this.touched = true;
        this.render();
      } else if (event.key === 'Enter' || event.key === ' ') {
        const alive = this.toggle(this.cursor);
        this.announce(alive ? 'Painted.' : 'Erased.');
      } else if (event.key === 'r' || event.key === 'R') {
        this.setRunning(!this.running);
        if (!this.running) this.announce(`Paused at generation ${this.hive.generation}, ${this.hive.alive} cells alive.`);
      } else if (event.key === 's' || event.key === 'S') {
        this.setRunning(false);
        this.step();
      } else if (event.key === 'b' || event.key === 'B') {
        this.setRunning(false);
        this.rewind();
      } else {
        return;
      }
      event.preventDefault();
    });
  }
}
