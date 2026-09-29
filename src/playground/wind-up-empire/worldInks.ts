// The real inks of each 4D.OS world (its 16 `--pal-16-*`), written here by hand: the landing
// reads them from 4D.OS neither at build time nor at run time. A test compares these palettes with
// `src/4d-os/worlds/<world>/tokens.css` and fails naming the world and the ink that differ.
import type { WorldId } from './orbits';

export const WORLD_PALETTES: Record<WorldId, readonly string[]> = {
  a: ['#121110', '#f3f4f2', '#4f8c88', '#1d1a1e', '#2b140d', '#57504f', '#e46fc9', '#434e66', '#52291a', '#7b4325', '#a67b52', '#6c717b', '#b4bccb', '#ffd49a', '#3ed6e6', '#f2a43a'],
  b: ['#111312', '#1d211f', '#16282c', '#1c4346', '#74bdb5', '#2f9488', '#f0b797', '#a5b4b1', '#cfd9d6', '#e2ece9', '#231a35', '#472a52', '#7a3a70', '#ef8fd6', '#5fe3c8', '#d65ca5'],
  c: ['#0e0f10', '#2a2e31', '#6e7377', '#a3a9ad', '#dcdfdf', '#152a2c', '#2c5a5c', '#474a2c', '#d86cc0', '#33181c', '#7c4a3e', '#b98a55', '#c8b089', '#ff8636', '#ffd39a', '#3fd4e0'],
  d: ['#07060b', '#100c1c', '#1d1433', '#34204d', '#0a2a20', '#14633f', '#3ad67c', '#baffd2', '#566374', '#c3cad3', '#f3efe4', '#3fe0ff', '#0f6a82', '#ff3fb0', '#7a1d5c', '#ffc45a'],
  e: ['#05060a', '#f4f1ea', '#0e1224', '#1d2748', '#3b4f86', '#7f9be0', '#cfe0ff', '#fff0cf', '#ffc66b', '#ff8a2e', '#e0461f', '#9c1f1c', '#4a0f16', '#2fd0e0', '#f0a030', '#6a6f7c'],
};

/**
 * Print of each top: indices of the base, band and dot within its world's palette, and the
 * ground of its socket on the tray. In the orrery, the page's 16-ink dither maps them to their
 * nearest inks; on the tray, each top is dithered with its own world's palette.
 */
export const WORLD_PRINT_INDEX: Record<WorldId, { base: number; band: number; dot: number; ground: number }> = {
  // E: flame, gold and cream of the photon ring, over the void.
  e: { base: 10, band: 8, dot: 7, ground: 0 },
  // D: stored phosphor, dim phosphor and the gold of φ, over black glass.
  d: { base: 6, band: 5, dot: 15, ground: 0 },
  // A: the amber of the present, vitrine ink and magenta neon.
  a: { base: 15, band: 0, dot: 6, ground: 0 },
  // B: the magenta of the present, the aurora green and the sage white, over charcoal.
  b: { base: 15, band: 14, dot: 9, ground: 0 },
  // C: the projector's light, the orange light leak and the black tail leader.
  c: { base: 4, band: 13, dot: 0, ground: 0 },
};

export function hexToNumber(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/** A world's base, band and dot as numeric colors (0xRRGGBB). */
export function worldPrint(id: WorldId): { base: number; band: number; dot: number; ground: number } {
  const p = WORLD_PALETTES[id];
  const i = WORLD_PRINT_INDEX[id];
  return { base: hexToNumber(p[i.base]), band: hexToNumber(p[i.band]), dot: hexToNumber(p[i.dot]), ground: hexToNumber(p[i.ground]) };
}

/** Writes a world's `--pal-16-*` (and the 1-bit pair: the darkest and the lightest ink) onto an element. */
export function applyWorldPalette(element: HTMLElement, id: WorldId): void {
  const p = WORLD_PALETTES[id];
  p.forEach((hex, i) => element.style.setProperty(`--pal-16-${i}`, hex));
  const byLight = [...p].sort((x, y) => luminance(x) - luminance(y));
  element.style.setProperty('--pal-1bit-0', byLight[0]);
  element.style.setProperty('--pal-1bit-1', byLight[byLight.length - 1]);
}

function luminance(hex: string): number {
  const n = hexToNumber(hex);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
}

/** Reads the 16 inks of a `tokens.css` (for the drift test). */
export function parsePalette(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/--pal-16-(\d+)\s*:\s*(#[0-9a-fA-F]{6})/g)) out[Number(m[1])] = m[2].toLowerCase();
  return out;
}

/** Differences between a palette written here and its world's: "world b, ink 7: #... here, #... in 4D.OS". */
export function paletteDrift(id: WorldId, css: string): string[] {
  const real = parsePalette(css);
  const ours = WORLD_PALETTES[id];
  const problems: string[] = [];
  for (let i = 0; i < 16; i++) {
    if (ours[i]?.toLowerCase() !== real[i]) problems.push(`world ${id}, ink ${i}: ${ours[i]} here, ${real[i] ?? 'missing'} in 4D.OS`);
  }
  return problems;
}
