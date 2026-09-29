import { afterEach, describe, expect, it, vi } from 'vitest';

// Fake matchMedia: motion.ts creates its media query when imported and listens to its changes.
function setup(initial: boolean) {
  vi.resetModules();
  let onChange: ((event: { matches: boolean }) => void) | null = null;
  const query = {
    matches: initial,
    addEventListener: (type: string, listener: (event: { matches: boolean }) => void) => {
      if (type === 'change') onChange = listener;
    },
  };
  const matchMedia = vi.fn(() => query);
  vi.stubGlobal('window', { matchMedia });
  return {
    matchMedia,
    /** The system changes the preference while the page is open. */
    change(matches: boolean) {
      query.matches = matches;
      onChange?.({ matches });
    },
    load: () => import('./motion'),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('live reduced motion', () => {
  it('reads the initial value of prefers-reduced-motion', async () => {
    const off = setup(false);
    expect((await off.load()).motion.reduced).toBe(false);
    expect(off.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');

    const on = setup(true);
    expect((await on.load()).motion.reduced).toBe(true);
  });

  it('a change of the media query notifies subscribers without a reload', async () => {
    const env = setup(false);
    const { motion } = await env.load();
    const seen: boolean[] = [];
    const unsubscribe = motion.onChange((reduced) => seen.push(reduced));

    env.change(true);
    expect(seen).toEqual([true]);
    expect(motion.reduced).toBe(true);

    env.change(false);
    expect(seen).toEqual([true, false]);
    expect(motion.reduced).toBe(false);

    unsubscribe();
    env.change(true);
    expect(seen).toEqual([true, false]);
  });
});
