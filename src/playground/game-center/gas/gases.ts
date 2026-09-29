// Gases of the Gas Tuner and the YONJIGEN sign: pure data (real discharge colors and tube strokes
// drawn by hand on a 16 × 24 grid, each tube starting at its base).

export interface Gas {
  id: 'neon' | 'helium' | 'argon' | 'krypton' | 'xenon';
  name: string;
  color: string;
  /** What the color looks like, in words (for the live region). */
  look: string;
}

export const GASES: readonly Gas[] = [
  { id: 'neon', name: 'Neon', color: '#ff4b1f', look: 'red-orange' },
  { id: 'helium', name: 'Helium', color: '#ffb08a', look: 'peach-pink' },
  { id: 'argon', name: 'Argon', color: '#9a7bff', look: 'pale lavender' },
  { id: 'krypton', name: 'Krypton', color: '#e8ecff', look: 'whitish' },
  { id: 'xenon', name: 'Xenon', color: '#7fa8ff', look: 'blue-violet' },
];

/** Letters of the sign: each one is ONE continuous tube (like the ones bent by hand), starting at its base and
 *  ending at its other electrode. Where the letter cannot be traced in one go, the tube doubles back on itself
 *  (the right arm of the Y, the bars of the I, the middle arm of the E). */
export const LETTERS: readonly { char: string; d: string; w: number }[] = [
  { char: 'Y', w: 16, d: 'M8 23V12L13.5 1.5L8 12L2.5 1.5' },
  { char: 'O', w: 16, d: 'M6.6 22.8C3.4 22 2 18.5 2 12S3.5 1 8 1 14 5 14 12 12.6 22 9.4 22.8' },
  { char: 'N', w: 16, d: 'M2 23V1L14 23V1' },
  { char: 'J', w: 15, d: 'M2 16.5C2 21 4 23 7 23S12 21 12 16.5V1H6' },
  { char: 'I', w: 10, d: 'M1.5 23H8.5H5V1H1.5H8.5' },
  { char: 'G', w: 16, d: 'M9 12.5H14V17C14 20.5 12 23 8 23 3.5 23 2 19 2 12S3.5 1 8 1C10.5 1 12.5 2 14 4' },
  { char: 'E', w: 14, d: 'M13 23H2V12H10.5H2V1H13' },
  { char: 'N', w: 16, d: 'M2 23V1L14 23V1' },
];

/** Summary of the strike strip for assistive technologies ("5 strikes: 3 argon, 2 neon"). */
export function stripSummary(ids: readonly Gas['id'][]): string {
  if (ids.length === 0) return 'No strikes yet';
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const parts = GASES.filter((g) => counts.has(g.id)).map((g) => `${counts.get(g.id)} ${g.name.toLowerCase()}`);
  return `${ids.length} ${ids.length === 1 ? 'strike' : 'strikes'}: ${parts.join(', ')}`;
}
