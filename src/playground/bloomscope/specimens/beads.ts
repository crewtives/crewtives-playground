// The chamber's glass beads: four styles (cobalt octahedron, sky icosahedron, petal shard,
// chartreuse shard) and radii from 0.055 to 0.09 that repeat without randomness.

export const BEAD_STYLES_COUNT = 4;

const RADII = [0.075, 0.062, 0.088, 0.058, 0.07, 0.083, 0.064, 0.09, 0.056, 0.078];

export function beadRadius(i: number): number {
  return RADII[i % RADII.length];
}
