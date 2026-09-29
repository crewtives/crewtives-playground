import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8');
const token = (name: string) => {
  const match = new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css);
  if (!match) throw new Error(`missing ${name}`);
  return match[1];
};
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** The wash over the sheet, at the maximum intensity scrolling gives it. */
const wash = (light: string, alpha: number) => rgb(token('--sheet')).map((s, i) => s + (rgb(light)[i] - s) * alpha);

describe('house tokens (8.1)', () => {
  test('the colors of D9', () => {
    expect([token('--sheet'), token('--ink'), token('--graphite')]).toEqual(['#f5f4ef', '#16181d', '#3b404c']);
    expect([token('--east-1'), token('--east-2'), token('--west-1'), token('--west-2')]).toEqual(['#bebee8', '#dcddf6', '#f0a585', '#f8dccd']);
    expect([token('--now-forward'), token('--now-rewind')]).toEqual(['#1bbfd3', '#efa23b']);
    expect(css).toMatch(/--M:/);
  });

  test('every body-text pair reaches 4.5:1, also over the most intense light ("Contrast with the light")', () => {
    const ink = rgb(token('--ink'));
    const graphite = rgb(token('--graphite'));
    const grounds: Record<string, number[]> = {
      sheet: rgb(token('--sheet')),
      // Maximum intensities from main.ts (0.9) and from the no-JavaScript rule.
      'east-1 at 0.9': wash(token('--east-1'), 0.9),
      'west-1 at 0.9': wash(token('--west-1'), 0.9),
      'west-2 (stale notice)': rgb(token('--west-2')),
    };
    for (const [name, ground] of Object.entries(grounds)) {
      expect(contrast(ink, ground), `ink on ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(graphite, ground), `graphite on ${name}`).toBeGreaterThanOrEqual(4.5);
    }
    // "Enter <title>": sheet on ink.
    expect(contrast(rgb(token('--sheet')), ink)).toBeGreaterThanOrEqual(4.5);
  });

  test('the fold palette has at most 16 colors and the 1-bit one is ink and sheet', () => {
    const sixteen = [...css.matchAll(/--pal-16-(\d+):/g)].map((m) => Number(m[1]));
    expect(sixteen.length).toBeLessThanOrEqual(16);
    expect(sixteen).toEqual(sixteen.map((_, i) => i));
    expect([token('--pal-1bit-0'), token('--pal-1bit-1')]).toEqual([token('--ink'), token('--sheet')]);
  });
});
