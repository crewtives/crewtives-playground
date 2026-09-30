// Bloomscope on phones: the pinned stage (landing-bloomscope "Pinned stage on phones"). While a stage
// gate matches, each bench's peephole leaves its rail for a place beside its toy (Sow and the lathe)
// or beside the honeycomb's "Put in the Scope", each toy hint goes right after its toy (so the copy
// can come before the stage without moving the DOM), and each moved peephole's frame carries an
// `n/7` count, because the tucked chamber gem no longer shows it there. When the gate stops
// matching, everything goes back where it was and the count nodes are removed: a desktop document
// never changes. style.css lays the stage out under the same two queries.

import { MAX_SPECIMENS } from './chamberModel';

/** Portrait phone: the query main.ts already uses for the inset move. */
export const STAGE_PORTRAIT = '(max-width: 699px) and (min-height: 521px)';
/** Landscape phone: the query of style.css's landscape hero. */
export const STAGE_LANDSCAPE = '(max-width: 1023px) and (max-height: 520px) and (orientation: landscape)';
/** Either stage gate (a comma list, never the `or` keyword, which older mobile Safari drops). */
export const STAGE_QUERY = `${STAGE_PORTRAIT}, ${STAGE_LANDSCAPE}`;

export type BenchKey = 'sow' | 'lathe' | 'hive';
export const BENCHES: readonly BenchKey[] = ['sow', 'lathe', 'hive'];

export interface Placement {
  /** The section's peephole: in its rail (home), inside the toy (the stage), or right after "Put in the Scope". */
  peephole: 'rail' | 'toy' | 'after-put';
  /** The toy hint: inside the toy (home) or right after it; the honeycomb has none. */
  hint: 'toy' | 'after-toy' | null;
  /** The row that holds "Put in the Scope" carries the class `hive-put-row`. */
  putRow: boolean;
  /** The peephole's frame carries an `n/7` count. */
  count: boolean;
}

/** Where each piece of a bench goes, with the stage gate matching (`staged`) or not. */
export function placement(bench: BenchKey, staged: boolean): Placement {
  const hint = bench === 'hive' ? null : staged ? 'after-toy' : 'toy';
  if (!staged) return { peephole: 'rail', hint, putRow: false, count: false };
  if (bench === 'hive') return { peephole: 'after-put', hint, putRow: true, count: true };
  return { peephole: 'toy', hint, putRow: false, count: true };
}

/** The count on a peephole's frame, like the chamber gem's. */
export function countText(count: number): string {
  return `${count}/${MAX_SPECIMENS}`;
}

/** What a section's live region says after a specimen went in through its peephole. */
export function chamberAnnouncement(count: number): string {
  return count >= MAX_SPECIMENS ? 'Chamber full' : `In the chamber: ${count} of ${MAX_SPECIMENS}`;
}

/** The peephole is at least partly on screen. */
export function onScreen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}

interface Home {
  parent: Node;
  next: Node | null;
}

const homeOf = (el: Element): Home => ({ parent: el.parentNode as Node, next: el.nextSibling });
const goHome = (el: Element, home: Home) => {
  if (el.parentNode !== home.parent || el.nextSibling !== home.next) home.parent.insertBefore(el, home.next);
};

/**
 * Binds the stage moves to the stage gates. `onLayout` runs after the gate flips (a rotation), so the
 * engine measures its views again; the first placement happens before any view is measured. Returns
 * the setter of the peephole counts, to be called on every chamber change.
 */
export function bindBenchStage(onLayout: () => void): (count: number) => void {
  const query = window.matchMedia(STAGE_QUERY);
  const benches = BENCHES.map((key) => {
    const section = document.getElementById(key);
    const peephole = section?.querySelector<HTMLElement>('.peephole');
    const put = section?.querySelector<HTMLElement>('.put-in');
    if (!section || !peephole || !put) throw new Error(`Bloomscope: the ${key} bench is incomplete`);
    const toy = section.querySelector<HTMLElement>('.toy');
    const hint = section.querySelector<HTMLElement>('.toy-hint');
    return { key, peephole, peepHome: homeOf(peephole), toy, hint, hintHome: hint ? homeOf(hint) : null, put, count: null as HTMLElement | null };
  });
  let current = 0;

  const apply = (staged: boolean) => {
    for (const bench of benches) {
      const plan = placement(bench.key, staged);
      if (plan.peephole === 'toy' && bench.toy) bench.toy.append(bench.peephole);
      else if (plan.peephole === 'after-put') bench.put.after(bench.peephole);
      else goHome(bench.peephole, bench.peepHome);
      if (bench.hint && bench.toy && bench.hintHome) {
        if (plan.hint === 'after-toy') bench.toy.after(bench.hint);
        else goHome(bench.hint, bench.hintHome);
      }
      bench.put.parentElement?.classList.toggle('hive-put-row', plan.putRow);
      if (plan.count && !bench.count) {
        const count = document.createElement('span');
        count.className = 'peephole-count';
        count.setAttribute('aria-hidden', 'true');
        count.textContent = countText(current);
        bench.peephole.querySelector('.peephole-caption')?.before(count);
        bench.count = count;
      } else if (!plan.count && bench.count) {
        bench.count.remove();
        bench.count = null;
      }
    }
  };

  query.addEventListener('change', () => {
    apply(query.matches);
    onLayout();
  });
  if (query.matches) apply(true);

  return (count: number) => {
    current = count;
    for (const bench of benches) if (bench.count) bench.count.textContent = countText(count);
  };
}
