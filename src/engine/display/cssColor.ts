import { Color } from 'three';

/** Reads a color from a CSS token (`--paper`) resolved on `element`, with a fallback if it is missing. */
export function cssColor(element: Element, token: string, fallback = '#ffffff'): Color {
  const value = getComputedStyle(element).getPropertyValue(token).trim();
  const color = new Color();
  try {
    color.setStyle(value || fallback);
  } catch {
    color.setStyle(fallback);
  }
  return color;
}

/** Reads a number from a CSS token (`--render-scale`), with a fallback if it is missing or not numeric. */
export function cssNumber(element: Element, token: string, fallback: number): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(token));
  return Number.isFinite(value) ? value : fallback;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
