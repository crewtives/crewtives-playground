// Contact solver for circles on a plane, shared by the crane (capsules on the machine's floor, x–z
// plane) and the pachinko glass (balls, x–y plane). Pure: no DOM, no three.

export interface Disc {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/**
 * Resolves the contact between two discs of equal mass: splits the overlap evenly and, if they are
 * approaching, exchanges the normal impulse with restitution `e`. Returns true if they were touching.
 */
export function collideDiscs(a: Disc, b: Disc, e: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return false;
  let d = Math.sqrt(d2);
  let nx: number;
  let ny: number;
  if (d < 1e-9) {
    // Coincident centers: they separate along a fixed direction (deterministic).
    nx = 1;
    ny = 0;
    d = 0;
  } else {
    nx = dx / d;
    ny = dy / d;
  }
  const push = (min - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn < 0) {
    const j = (-(1 + e) * vn) / 2;
    a.vx -= j * nx;
    a.vy -= j * ny;
    b.vx += j * nx;
    b.vy += j * ny;
  }
  return true;
}

/**
 * Hash grid for neighbor lookup: each disc goes into the cell of its center and pairs are tested
 * against the 9 neighboring cells. Reusable across steps (no allocations per step).
 */
export class SpatialHash {
  private readonly cell: number;
  private readonly heads = new Map<number, number>();
  private next: Int32Array;

  constructor(cell: number, capacity = 64) {
    this.cell = cell;
    this.next = new Int32Array(capacity);
  }

  private key(cx: number, cy: number): number {
    return (cx + 4096) * 8192 + (cy + 4096);
  }

  /** Walks the candidate pairs of `items` (indices in order i < j) and calls `visit`. */
  pairs<T extends { x: number; y: number }>(items: readonly T[], alive: (i: number) => boolean, visit: (i: number, j: number) => void): void {
    const n = items.length;
    if (this.next.length < n) this.next = new Int32Array(n * 2);
    this.heads.clear();
    const inv = 1 / this.cell;
    for (let i = 0; i < n; i++) {
      if (!alive(i)) continue;
      const k = this.key(Math.floor(items[i].x * inv), Math.floor(items[i].y * inv));
      this.next[i] = this.heads.get(k) ?? -1;
      this.heads.set(k, i);
    }
    for (let i = 0; i < n; i++) {
      if (!alive(i)) continue;
      const cx = Math.floor(items[i].x * inv);
      const cy = Math.floor(items[i].y * inv);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          let j = this.heads.get(this.key(cx + ox, cy + oy)) ?? -1;
          while (j !== -1) {
            if (j > i) visit(i, j);
            j = this.next[j];
          }
        }
      }
    }
  }
}
