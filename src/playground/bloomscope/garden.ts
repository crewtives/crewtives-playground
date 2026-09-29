// Link to a garden: `#g=` followed by the base64url of a versioned record (mirrors, barrel,
// display, specimens in order with their parameters, and the Sow angle). A damaged fragment, or one
// from another version, is ignored. Pure module.

import type { DisplayMode } from '../../engine/display/RetroDisplay';
import { MIRROR_ORDER, type MirrorMode } from './scope/fold';
import { GOLDEN_ANGLE, type RosetteSpecies, type SpecimenSpec } from './specimens/spec';

export const GARDEN_VERSION = 1;

export interface Garden {
  mode: MirrorMode;
  /** Barrel angle, whole degrees in [0, 360). */
  barrel: number;
  display: DisplayMode;
  specimens: SpecimenSpec[];
  /** Angle of the seeder (Sow). */
  sow: number;
}

const DISPLAYS: DisplayMode[] = ['1bit', '16', 'millions'];
const SPECIES: RosetteSpecies[] = ['echeveria', 'aloe-cw', 'aloe-ccw'];

type Packed = [number, number, number, number, number, (number | string)[][]];

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits;

export function encodeGarden(garden: Garden): string {
  const specimens = garden.specimens.map((s): (number | string)[] => {
    switch (s.kind) {
      case 'head':
        return ['h', round(s.angle, 4), s.seeds];
      case 'rosette':
        return ['r', SPECIES.indexOf(s.species), s.leaves, round(s.plump, 3), round(s.blush, 3), round(s.stretch, 3)];
      case 'comb':
        // A Hive honeycomb carries its cells (0 empty, 1 honey, 2 cap, 3 newborn).
        return s.cells ? ['c', s.rings, s.seed, s.cells] : ['c', s.rings, s.seed];
    }
  });
  const packed: Packed = [
    GARDEN_VERSION,
    MIRROR_ORDER.indexOf(garden.mode),
    Math.round(((garden.barrel % 360) + 360) % 360),
    DISPLAYS.indexOf(garden.display),
    round(garden.sow, 4),
    specimens,
  ];
  return toBase64Url(JSON.stringify(packed));
}

const finite = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;

/** Returns the garden, or null if the fragment is damaged or from another version. */
export function decodeGarden(encoded: string): Garden | null {
  try {
    const packed = JSON.parse(fromBase64Url(encoded)) as unknown;
    if (!Array.isArray(packed) || packed.length !== 6 || packed[0] !== GARDEN_VERSION) return null;
    const [, m, b, d, sow, list] = packed as Packed;
    if (!finite(m, 0, 3) || !finite(b, 0, 359) || !finite(d, 0, 2) || !finite(sow, 100, 180) || !Array.isArray(list)) return null;
    if (list.length > 7) return null;
    const specimens: SpecimenSpec[] = [];
    for (const item of list) {
      if (!Array.isArray(item)) return null;
      const [kind, ...p] = item;
      if (kind === 'h' && finite(p[0], 100, 180) && finite(p[1], 1, 2400)) {
        specimens.push({ kind: 'head', angle: p[0], seeds: Math.round(p[1]) });
      } else if (kind === 'r' && finite(p[0], 0, 2) && finite(p[1], 1, 89) && finite(p[2], 0, 1) && finite(p[3], 0, 1) && finite(p[4], 0, 1)) {
        specimens.push({ kind: 'rosette', species: SPECIES[Math.round(p[0])], leaves: Math.round(p[1]), plump: p[2], blush: p[3], stretch: p[4] });
      } else if (kind === 'c' && finite(p[0], 1, 12) && finite(p[1], 0, 2 ** 32) && (p[2] === undefined || (typeof p[2] === 'string' && /^[0-3]{1,469}$/.test(p[2])))) {
        const comb: SpecimenSpec = { kind: 'comb', rings: Math.round(p[0]), seed: Math.round(p[1]) };
        if (typeof p[2] === 'string') comb.cells = p[2];
        specimens.push(comb);
      } else {
        return null;
      }
    }
    return { mode: MIRROR_ORDER[Math.round(m)], barrel: Math.round(b), display: DISPLAYS[Math.round(d)], specimens, sow };
  } catch {
    return null;
  }
}

/** Reads `#g=` from a hash; null if there is none or it is unusable. */
export function gardenFromHash(hash: string): Garden | null {
  const match = /^#g=([A-Za-z0-9_-]+)$/.exec(hash);
  return match ? decodeGarden(match[1]) : null;
}

export const DEFAULT_SOW = GOLDEN_ANGLE;
