// Honeycomb (Hive): a hexagonal cousin of Life, rule B2/S34, in a frame of hexagonal cells with
// offset rows ("odd-r") that wraps around on itself at the edges. It keeps every generation (the
// stack of wax), counts how many generations in a row each cell has been alive (a cap at 6) and can
// step one generation back. Pure module.

import { mulberry32 } from '../../../pipeline/scenes/random';

export const HIVE_SIZE = { desktop: { w: 24, h: 16 }, phone: { w: 14, h: 10 } } as const;
export const HIVE_LAYERS = { desktop: 32, phone: 12 } as const;
export const RUN_RATE = 6;
export const CAP_AFTER = 6;
export const FILL = 0.3;

/**
 * Fixed seeds for "Random": the first one, counting from 1, whose 30 % fill stays alive for at least
 * 48 generations with at least 20 live cells at generation 32 (one per frame size). `findSeed`
 * computes them; the test checks that they match.
 */
export const HIVE_SEED = { desktop: 1, phone: 3 } as const;

/** Neighbors of (q, r) in offset rows: odd rows sit half a cell to the right. */
const EVEN: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [-1, -1],
  [0, 1],
  [-1, 1],
];
const ODD: [number, number][] = [
  [1, 0],
  [-1, 0],
  [1, -1],
  [0, -1],
  [1, 1],
  [0, 1],
];

export function neighbours(q: number, r: number, w: number, h: number): number[] {
  const deltas = r & 1 ? ODD : EVEN;
  return deltas.map(([dq, dr]) => {
    const rr = (((r + dr) % h) + h) % h;
    const qq = (((q + dq) % w) + w) % w;
    return rr * w + qq;
  });
}

/** One B2/S34 step (born with exactly 2 live neighbors, survives with 3 or 4). */
export function stepCells(cells: Uint8Array, w: number, h: number): Uint8Array {
  const next = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) {
    for (let q = 0; q < w; q++) {
      let n = 0;
      for (const i of neighbours(q, r, w, h)) n += cells[i];
      const alive = cells[r * w + q] === 1;
      next[r * w + q] = alive ? (n === 3 || n === 4 ? 1 : 0) : n === 2 ? 1 : 0;
    }
  }
  return next;
}

export function population(cells: Uint8Array): number {
  let n = 0;
  for (const c of cells) n += c;
  return n;
}

/** Seeded pseudorandom fill. */
export function randomCells(seed: number, w: number, h: number, fill = FILL): Uint8Array {
  const rng = mulberry32(seed);
  const cells = new Uint8Array(w * h);
  for (let i = 0; i < cells.length; i++) cells[i] = rng() < fill ? 1 : 0;
  return cells;
}

/** Does it stay alive for ≥ 48 generations and have ≥ 20 live cells at generation 32? */
export function seedQualifies(seed: number, w: number, h: number): boolean {
  let cells = randomCells(seed, w, h);
  for (let g = 1; g <= 48; g++) {
    cells = stepCells(cells, w, h);
    const n = population(cells);
    if (n === 0) return false;
    if (g === 32 && n < 20) return false;
  }
  return true;
}

export function findSeed(w: number, h: number): number {
  for (let seed = 1; seed < 100000; seed++) if (seedQualifies(seed, w, h)) return seed;
  return -1;
}

/** Center of cell (q, r) with pointy-top hexagons of radius 1; y points up. */
export function cellCenter(q: number, r: number): [number, number] {
  return [Math.sqrt(3) * (q + 0.5 * (r & 1)), -1.5 * r];
}

/** Frame measurements (cell units), with the origin at its center. */
export function frameSize(w: number, h: number): { width: number; height: number; x0: number; y0: number } {
  const width = Math.sqrt(3) * (w + 0.5);
  const height = 1.5 * (h - 1) + 2;
  // Offset so the center of the frame lands on the origin.
  return { width, height, x0: -width / 2 + Math.sqrt(3) / 2, y0: height / 2 - 1 };
}

/** Cell under a point of the frame (centered coordinates), or −1 outside. */
export function cellAt(x: number, y: number, w: number, h: number): number {
  const f = frameSize(w, h);
  const px = x - f.x0;
  const py = y - f.y0;
  // Candidates: the approximate row and its neighbors; the one with the closest center wins.
  const r0 = Math.round(-py / 1.5);
  let best = -1;
  let bestD = Infinity;
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    if (r < 0 || r >= h) continue;
    const q0 = Math.round(px / Math.sqrt(3) - 0.5 * (r & 1));
    for (let q = q0 - 1; q <= q0 + 1; q++) {
      if (q < 0 || q >= w) continue;
      const [cx, cy] = cellCenter(q, r);
      const d = (cx - px) ** 2 + (cy - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = r * w + q;
      }
    }
  }
  return bestD <= 1 ? best : -1;
}

/**
 * Cursor movement along the honeycomb axes: ←/→ along the row; ↑/↓ along one diagonal axis (up
 * right / down left) and, with Shift, along the other (up left / down right). Wraps around at the
 * edges, like the frame.
 */
export function moveCursor(index: number, key: 'left' | 'right' | 'up' | 'down', shift: boolean, w: number, h: number): number {
  const q = index % w;
  const r = Math.floor(index / w);
  const odd = r & 1;
  let dq = 0;
  let dr = 0;
  if (key === 'left') dq = -1;
  else if (key === 'right') dq = 1;
  else if (key === 'up') {
    dr = -1;
    dq = shift ? (odd ? 0 : -1) : odd ? 1 : 0;
  } else {
    dr = 1;
    dq = shift ? (odd ? 1 : 0) : odd ? 0 : -1;
  }
  const rr = (((r + dr) % h) + h) % h;
  const qq = (((q + dq) % w) + w) % w;
  return rr * w + qq;
}

/** Frame with history: every generation is kept; you can step back one at a time. */
export class Hive {
  readonly w: number;
  readonly h: number;
  /** Generations, from 0 to the current one. */
  private history: Uint8Array[] = [];
  /** Consecutive generations alive, per cell and per generation (for the caps). */
  private streaks: Uint8Array[] = [];
  /** Number of generation 0 of `history` (the oldest history is discarded). */
  private base = 0;
  private readonly keep: number;

  constructor(w: number, h: number, keep = 512) {
    this.w = w;
    this.h = h;
    this.keep = keep;
    this.reset(new Uint8Array(w * h));
  }

  get generation(): number {
    return this.base + this.history.length - 1;
  }

  get cells(): Uint8Array {
    return this.history[this.history.length - 1];
  }

  get streak(): Uint8Array {
    return this.streaks[this.streaks.length - 1];
  }

  get alive(): number {
    return population(this.cells);
  }

  /** The last `n` generations, from newest to oldest. */
  layers(n: number): Uint8Array[] {
    return this.history.slice(-n).reverse();
  }

  /** Cells born in the current generation. */
  newborn(index: number): boolean {
    const prev = this.history[this.history.length - 2];
    return this.cells[index] === 1 && (!prev || prev[index] === 0) && this.history.length > 1;
  }

  capped(index: number): boolean {
    return this.streak[index] >= CAP_AFTER;
  }

  reset(cells: Uint8Array): void {
    this.history = [cells.slice()];
    this.streaks = [cells.map((c) => c)];
    this.base = 0;
  }

  random(seed: number): void {
    this.reset(randomCells(seed, this.w, this.h));
  }

  clear(): void {
    this.reset(new Uint8Array(this.w * this.h));
  }

  /** Paints or erases a cell of the current generation. */
  set(index: number, alive: boolean): boolean {
    const cells = this.cells;
    const value = alive ? 1 : 0;
    if (cells[index] === value) return false;
    cells[index] = value;
    const prevStreak = this.streaks[this.streaks.length - 2];
    this.streak[index] = alive ? (prevStreak ? prevStreak[index] + 1 : 1) : 0;
    return true;
  }

  step(): void {
    const next = stepCells(this.cells, this.w, this.h);
    const prev = this.streak;
    const streak = new Uint8Array(next.length);
    for (let i = 0; i < next.length; i++) streak[i] = next[i] ? Math.min(255, prev[i] + 1) : 0;
    this.history.push(next);
    this.streaks.push(streak);
    if (this.history.length > this.keep) {
      this.history.shift();
      this.streaks.shift();
      this.base++;
    }
  }

  /** One generation back; false if it is already at the first one kept. */
  rewind(): boolean {
    if (this.history.length <= 1) return false;
    this.history.pop();
    this.streaks.pop();
    return true;
  }
}

/**
 * A round 3-ring patch of the frame (37 cells) around a cell, to take into the chamber as a
 * honeycomb: '0' empty, '1' honey, '2' cap, '3' newborn.
 */
export function combPatch(hive: Hive, center: number, rings = 3): string {
  const { w, h } = hive;
  const cq = center % w;
  const cr = Math.floor(center / w);
  // From odd-r to axial and back.
  const aq = cq - (cr - (cr & 1)) / 2;
  let out = '';
  for (let q = -rings; q <= rings; q++) {
    for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
      const ar = cr + r;
      const rr = ((ar % h) + h) % h;
      const oq = aq + q + (ar - (ar & 1)) / 2;
      const qq = ((oq % w) + w) % w;
      const i = rr * w + qq;
      out += hive.cells[i] ? (hive.capped(i) ? '2' : hive.newborn(i) ? '3' : '1') : '0';
    }
  }
  return out;
}
