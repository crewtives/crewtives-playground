// Rain Run's canyon of signs: pure geometry (no three), used by the simulation, the view and the
// tests. The street spans x ∈ [−7, 7]; travel is toward −z. The right side is the exact mirror of the
// left one across the vanishing axis (x → −x), and the light gates alternate sides.

/** Half width of the street (the facades are at |x| = 7). */
export const STREET_HALF = 7;
/** Length of a canyon segment: the towers repeat every TILE units of z. */
export const TILE = 240;
export const TOWERS_PER_SIDE = 24;
/** Spacing between towers in z. */
export const TOWER_PITCH = TILE / TOWERS_PER_SIDE;

/** How far a vertical sign (tate-kanban) sticks out from the facade toward the street. */
export const SIGN_REACH = 1.4;
export const SIGN_DEPTH = 0.4;

/** First gate and spacing between gates. */
export const GATE_START = 60;
export const GATE_SPACING = 30;
/** Gate opening (width × height) and frame thicknesses. */
export const GATE_W = 6;
export const GATE_H = 4;
export const GATE_POST = 0.4;
export const GATE_BANNER = 1.2;
export const GATE_DEPTH = 0.3;

/** Fixed vocabulary of the signs (glossed in the credits and in `SIGN_GLOSS`). */
export const SIGN_WORDS = ['ゲーム', 'カラオケ', 'ラーメン', '薬', '占い', '営業中', '両替', '四次元', '時間', '未来', '無料'] as const;
export const SIGN_GLOSS: Record<(typeof SIGN_WORDS)[number], string> = {
  ゲーム: 'games',
  カラオケ: 'karaoke',
  ラーメン: 'ramen',
  薬: 'pharmacy',
  占い: 'fortune telling',
  営業中: 'open',
  両替: 'change',
  四次元: 'fourth dimension',
  時間: 'time',
  未来: 'future',
  無料: 'free',
};
/** Number of sign color combinations (field + ink) that the atlas draws. */
export const SIGN_STYLES = 6;

/** Axis-aligned box. */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface Tower extends Box {
  side: -1 | 1;
  /** Index of the tower within the segment (0..23), the same on both sides. */
  index: number;
}

export interface Sign extends Box {
  side: -1 | 1;
  tower: number;
  word: number;
  style: number;
}

export interface CanyonTile {
  towers: Tower[];
  signs: Sign[];
}

export interface Gate {
  k: number;
  z: number;
  /** Center of the opening. */
  x: number;
  y: number;
  /** Frame bars: crossbar and posts (hitting them is a crash). */
  bars: Box[];
}

/** Deterministic hash in [0, 1). */
export function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function mirror(box: Box): Box {
  return { ...box, x0: -box.x1, x1: -box.x0 };
}

/**
 * A canyon segment in local coordinates (z from 0 to −TILE). The left side is generated and the
 * right one is its exact reflection; the signs keep word and style.
 */
export function buildTile(seed: number): CanyonTile {
  const towers: Tower[] = [];
  const signs: Sign[] = [];
  const s = seed * 101.37;
  for (let i = 0; i < TOWERS_PER_SIDE; i++) {
    const width = 6 + 3 * hash(i + s);
    const height = 18 + 30 * hash(i + 7 + s) ** 2;
    const z0 = -TOWER_PITCH * i - 0.35;
    const z1 = -TOWER_PITCH * (i + 1) + 0.35;
    const left: Tower = { side: -1, index: i, x0: -STREET_HALF - width, x1: -STREET_HALF, y0: 0, y1: height, z0: z1, z1: z0 };
    towers.push(left, { ...(mirror(left) as Box), side: 1, index: i });

    const count = 2 + Math.floor(4 * hash(i + 3 + s));
    for (let j = 0; j < count; j++) {
      const r = hash(i * 17 + j * 5.3 + s);
      const tall = [2.4, 3.2, 4.0][Math.floor(hash(i * 3 + j + 11 + s) * 3)];
      // The signs hang between 1.4 and 15 in height (the flight zone goes from 0.75 to 9.5).
      const top = Math.min(height - 1, 15);
      const y0 = 1.4 + r * Math.max(0, top - tall - 1.4);
      const zc = z0 - ((j + 0.5) / count) * (TOWER_PITCH - 0.7);
      const sign: Sign = {
        side: -1,
        tower: i,
        word: Math.floor(hash(i * 7 + j * 13 + s) * SIGN_WORDS.length),
        style: Math.floor(hash(i * 5 + j * 29 + 3 + s) * SIGN_STYLES),
        x0: -STREET_HALF,
        x1: -STREET_HALF + SIGN_REACH,
        y0,
        y1: y0 + tall,
        z0: zc - SIGN_DEPTH / 2,
        z1: zc + SIGN_DEPTH / 2,
      };
      signs.push(sign, { ...sign, ...mirror(sign), side: 1 });
    }
  }
  return { towers, signs };
}

/**
 * Gate k: consecutive gates on opposite sides of the axis (never on it), with an undulating height.
 * Consecutive pairs mirror each other when |sin| matches: the course is symmetric.
 */
export function gateAt(k: number, seed: number): Gate {
  const s = seed * 0.618;
  const side = k % 2 === 0 ? 1 : -1;
  const x = side * (0.8 + 2.2 * Math.abs(Math.sin(0.7 * k + s)));
  const y = 3.4 + 1.6 * Math.sin(1.3 * k + s);
  const z = -(GATE_START + GATE_SPACING * k);
  const zd = GATE_DEPTH / 2;
  const top = y + GATE_H / 2;
  const half = GATE_W / 2;
  const bars: Box[] = [
    { x0: -STREET_HALF, x1: STREET_HALF, y0: top, y1: top + GATE_BANNER, z0: z - zd, z1: z + zd },
    { x0: x - half - GATE_POST, x1: x - half, y0: 0, y1: top, z0: z - zd, z1: z + zd },
    { x0: x + half, x1: x + half + GATE_POST, y0: 0, y1: top, z0: z - zd, z1: z + zd },
  ];
  return { k, z, x, y, bars };
}

/** Index of the first gate whose z is ahead of `z` (more negative). */
export function gateAhead(z: number): number {
  return Math.max(0, Math.ceil((-z - GATE_START) / GATE_SPACING + 1e-9));
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0 && a.z0 < b.z1 && a.z1 > b.z0;
}

/** Canyon signs near a world z, already shifted to their segment. */
export function signsNear(tile: CanyonTile, z: number, reach = 6): Box[] {
  const m = Math.floor(-z / TILE);
  const out: Box[] = [];
  for (const t of [m - 1, m, m + 1]) {
    const offset = -t * TILE;
    for (const sign of tile.signs) {
      const z0 = sign.z0 + offset;
      const z1 = sign.z1 + offset;
      if (z1 < z - reach || z0 > z + reach) continue;
      out.push({ ...sign, z0, z1 });
    }
  }
  return out;
}
