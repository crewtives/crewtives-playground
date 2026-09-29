// Reduced motion, live: if the visitor changes the preference while the page is open, the toys
// find out without a reload.

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const listeners = new Set<(reduced: boolean) => void>();
// The value is read once and afterwards only changes through the event. Re-reading `query.matches`
// every frame updates the list's cached value before Chromium dispatches 'change', and the event is
// lost: the page never learns about the change.
let reduced = query?.matches ?? false;

query?.addEventListener('change', (event) => {
  reduced = event.matches;
  for (const listener of listeners) listener(reduced);
});

export const motion = {
  /** true if the visitor asked for reduced motion: nothing animates on its own. */
  get reduced(): boolean {
    return reduced;
  },
  /** Reports every change of the preference; returns the function that stops listening. */
  onChange(listener: (reduced: boolean) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
