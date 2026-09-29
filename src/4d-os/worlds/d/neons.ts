// The city's neons, dimmed in memory. In D, full cyan and magenta are the "NOW" and the direction of
// time (FORWARD / REWIND); the signs, the mast rings and the tower edges come out of the bake in those
// same colors, and in the hero they competed with the present and floated like loose panels. They are
// recolored, without touching the 4D pack, with the palette's deep tones: the tubes (what comes out of
// the bake saturated) end up in deep cyan and deep magenta; the sign bodies and whatever their light only
// tints, at the dim phosphor value (`--neon-body`). That way the city reads as stored geometry behind
// the trail.

type Rgb = readonly [number, number, number];

export type NeonFamily = 'cyan' | 'magenta';

export interface NeonLook {
  /** Color of the cyan tubes (8-bit sRGB): the palette's deep cyan. */
  cyan: Rgb;
  /** Color of the magenta tubes: the deep magenta. */
  magenta: Rgb;
  /** Maximum value (0–1) of a sign body or a tinted wall: that of `--neon-body`. */
  body: number;
}

/**
 * Each neon of the bake by hue (°; `from` > `to` wraps around 0°) and minimum saturation (below it, the
 * point is city: stone, cool windows). Cyan ≈ 186°. Magenta ≈ 320°, 300° on the clipped tube and up to
 * 20°, pale, at the edge of the LED disk, where the gold blends into the magenta.
 */
const FAMILIES: Record<NeonFamily, { from: number; to: number; saturation: number }> = {
  cyan: { from: 172, to: 205, saturation: 0.4 },
  magenta: { from: 290, to: 20, saturation: 0.2 },
};
/** Value (0–1) from which a point is a tube and not a body: tubes come out of the bake clipped at 1. */
const TUBE: [number, number] = [0.85, 0.97];

/** Neon family of an 8-bit sRGB color, or `null` if it is not a neon. */
export function neonFamily(r: number, g: number, b: number): NeonFamily | null {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null;
  const d = max - min;
  const saturation = d / max;
  const hue = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  for (const family of ['cyan', 'magenta'] as const) {
    const { from, to, saturation: least } = FAMILIES[family];
    const inBand = from <= to ? hue >= from && hue <= to : hue >= from || hue <= to;
    if (inBand && saturation >= least) return family;
  }
  return null;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Recolors the neon points of `colors` (8-bit sRGB, r g b per point) with their family's deep tone: a
 * tube takes the color from `look` as is; a body takes that color lowered to a value of `look.body`
 * (never brighter than the original). Returns how many points it changed per family.
 */
export function dimNeons(colors: Uint8Array, look: NeonLook): Record<NeonFamily, number> {
  const changed: Record<NeonFamily, number> = { cyan: 0, magenta: 0 };
  const top = { cyan: Math.max(...look.cyan) / 255, magenta: Math.max(...look.magenta) / 255 };
  for (let i = 0; i < colors.length; i += 3) {
    const r = colors[i];
    const g = colors[i + 1];
    const b = colors[i + 2];
    const family = neonFamily(r, g, b);
    if (!family) continue;
    const value = Math.max(r, g, b) / 255;
    const target = Math.min(value, look.body + (top[family] - look.body) * smoothstep(TUBE[0], TUBE[1], value));
    const k = target / top[family];
    const tone = look[family];
    colors[i] = Math.round(tone[0] * k);
    colors[i + 1] = Math.round(tone[1] * k);
    colors[i + 2] = Math.round(tone[2] * k);
    changed[family]++;
  }
  return changed;
}
