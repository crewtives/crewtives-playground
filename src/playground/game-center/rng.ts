// Seeded randomness for the building's machines: mulberry32 (32 bits, fast, reproducible).
// Every draw the page prints (the crane's 80 %) or repeats (REPLAY SEED) comes from here.

export type Rng = () => number;

/**
 * Uniform generator in [0, 1) from an integer seed: the mulberry32 of `src/pipeline/scenes/random.ts`.
 * The copy is deliberate: Bloomscope already imports that module, and if Game Center imported it too the
 * build would split it into a shared chunk that Bloomscope would have to request on load.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash → [0, 1): stateless, for draws that must not depend on call order. */
export function hash01(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    h = Math.imul(h ^ (p | 0), 0x01000193);
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  }
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
