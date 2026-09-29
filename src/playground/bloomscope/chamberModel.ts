// Contents of the shared chamber: specimens in order of entry (up to 7), the beads that always
// stay, and the 1-bit scars left by whatever is taken out. Pure module.

import { listNames, specimenName, type Specimen, type SpecimenSpec } from './specimens/spec';

export const MAX_SPECIMENS = 7;

export interface TrayEntry {
  uid: number;
  spec: SpecimenSpec;
  /** Taken out of the chamber: its silhouette stays in the tray for the rest of the session. */
  scar: boolean;
}

type Listener = (event: { type: 'add' | 'remove' | 'reset'; specimen?: Specimen }) => void;

export class ChamberModel {
  /** Tray in order of entry, with the scars in their places. */
  readonly tray: TrayEntry[] = [];
  private nextUid = 1000;
  private readonly listeners = new Set<Listener>();

  constructor(readonly beads: number) {}

  get specimens(): Specimen[] {
    return this.tray.filter((e) => !e.scar).map(({ uid, spec }) => ({ uid, spec }));
  }

  get count(): number {
    return this.specimens.length;
  }

  get full(): boolean {
    return this.count >= MAX_SPECIMENS;
  }

  /** Adds a specimen at the end; returns null if the chamber is full. */
  add(spec: SpecimenSpec): Specimen | null {
    if (this.full) return null;
    const specimen = { uid: this.nextUid++, spec };
    this.tray.push({ ...specimen, scar: false });
    this.emit({ type: 'add', specimen });
    return specimen;
  }

  /** Takes a specimen out: its place in the tray becomes a scar. */
  remove(uid: number): boolean {
    const entry = this.tray.find((e) => e.uid === uid && !e.scar);
    if (!entry) return false;
    entry.scar = true;
    this.emit({ type: 'remove', specimen: { uid, spec: entry.spec } });
    return true;
  }

  /** Replaces everything (the factory garden or a #g= link). No scars. */
  reset(specs: SpecimenSpec[]): void {
    this.tray.length = 0;
    for (const spec of specs.slice(0, MAX_SPECIMENS)) this.tray.push({ uid: this.nextUid++, spec, scar: false });
    this.emit({ type: 'reset' });
  }

  /** "Five-fold kaleidoscope holding a sunflower, an echeveria, an aloe and 18 glass beads". */
  describe(prefix: string): string {
    const names = this.specimens.map((s) => specimenName(s.spec));
    names.push(`${this.beads} glass beads`);
    return `${prefix} holding ${listNames(names)}`;
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: Parameters<Listener>[0]): void {
    for (const listener of this.listeners) listener(event);
  }
}

/** Scope readout: `D5 · 135° · 3 specimens · 18 beads`, or `D5 · HOLD · …` while in HOLD. */
export function readoutText(symbol: string, angle: number, hold: boolean, specimens: number, beads: number): string {
  const middle = hold ? 'HOLD' : `${Math.round(angle) % 360}°`;
  return `${symbol} · ${middle} · ${specimens} ${specimens === 1 ? 'specimen' : 'specimens'} · ${beads} beads`;
}
