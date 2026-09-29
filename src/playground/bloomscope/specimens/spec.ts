// The chamber's specimens: what they are, how they are named and what radius they take up. Only
// data and pure math (the low-poly geometry lives in geometry.ts, which uses three).

export const GOLDEN_ANGLE = 360 * (2 - (1 + Math.sqrt(5)) / 2); // 137.50776405…°

export type RosetteSpecies = 'echeveria' | 'aloe-cw' | 'aloe-ccw';

export type SpecimenSpec =
  | { kind: 'head'; angle: number; seeds: number }
  | { kind: 'rosette'; species: RosetteSpecies; leaves: number; plump: number; blush: number; stretch: number }
  | { kind: 'comb'; rings: number; seed: number; cells?: string };

export interface Specimen {
  /** Identity in the chamber (the key of its physics body). */
  uid: number;
  spec: SpecimenSpec;
}

/** Radius of the physics disc in the cell (R = 1). */
export function specimenRadius(spec: SpecimenSpec): number {
  switch (spec.kind) {
    case 'head':
      return 0.25;
    case 'rosette':
      return spec.species === 'echeveria' ? 0.22 : 0.21;
    case 'comb':
      return 0.2;
  }
}

/** Is this the golden-angle seed head (a sunflower)? */
export function isGolden(angle: number): boolean {
  return Math.abs(angle - GOLDEN_ANGLE) < 0.0005;
}

/** Short name with an article, for the live description and the tray. */
export function specimenName(spec: SpecimenSpec): string {
  switch (spec.kind) {
    case 'head':
      return isGolden(spec.angle) ? 'a sunflower' : `a seed head at ${formatAngle(spec.angle)}°`;
    case 'rosette':
      return spec.species === 'echeveria' ? 'an echeveria' : spec.species === 'aloe-cw' ? 'a clockwise aloe' : 'a counter-clockwise aloe';
    case 'comb':
      return 'a honeycomb';
  }
}

/** Chip icon for the tray. */
export function specimenChip(spec: SpecimenSpec): string {
  switch (spec.kind) {
    case 'head':
      return isGolden(spec.angle) ? 'chip-sunflower' : 'chip-head';
    case 'rosette':
      return spec.species === 'echeveria' ? 'chip-echeveria' : 'chip-aloe';
    case 'comb':
      return 'chip-comb';
  }
}

export function formatAngle(angle: number): string {
  return angle.toFixed(3).replace(/\.?0+$/, '');
}

/** The factory garden: a sunflower, an echeveria and an aloe. */
export const DEFAULT_GARDEN: SpecimenSpec[] = [
  { kind: 'head', angle: GOLDEN_ANGLE, seeds: 144 },
  { kind: 'rosette', species: 'echeveria', leaves: 21, plump: 0.5, blush: 0.6, stretch: 0 },
  { kind: 'rosette', species: 'aloe-cw', leaves: 20, plump: 0.4, blush: 0.2, stretch: 0 },
];

/** Joins names in English: "a, b and c". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
