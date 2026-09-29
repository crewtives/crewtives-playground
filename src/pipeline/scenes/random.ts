/** Seeded generator (mulberry32). The whole bake uses this: never Math.random. */
export type Random = () => number;

export function mulberry32(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Independent stream per purpose ("environment", "subject:12"…). That way, changing the subject's
 * density does not alter the environment or the camera.
 */
export function stream(seed: number, name: string): Random {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return mulberry32(h >>> 0);
}

/** Standard normal (Box-Muller). */
export function gaussian(random: Random): number {
  const u = Math.max(random(), 1e-12);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
