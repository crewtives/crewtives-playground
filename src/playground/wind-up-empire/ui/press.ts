// The lithographic press: three rows of three-position switches (inks, exposure memory and
// symmetry). Each row unlocks with an observatory level and is researched with SPARK; the state is
// in the stroke: dotted = locked, dashed = researching (with the turning dial), solid = ready. On a
// change of position: a 600 ms dither dissolve, the plate sinks 2 px and the press thunk sounds.
// The inks row is the page's only color-depth selector ("Skip the grind" readies it at once).
import { ROWS, type Economy, type ResearchRow } from '../economy';
import { pressThunk } from '../voices';

export interface PressOptions {
  root: HTMLElement;
  economy: Economy;
  reduced: () => boolean;
  /** A new position was chosen (after passing the research gate). */
  onSelect: (row: ResearchRow, value: string) => void;
  /** Dither dissolve: `reveal` from 0 to 1 on the page's displays. */
  setReveal: (value: number) => void;
  /** Something changed in the economy (SPARK spent). */
  onChange: () => void;
}

const DIAL_R = 9;

export class Press {
  private last = '';
  private revealRaf = 0;

  constructor(private readonly o: PressOptions) {
    for (const row of ROWS) {
      const fieldset = this.row(row);
      fieldset.querySelector<HTMLButtonElement>('[data-research]')!.addEventListener('click', () => {
        if (o.economy.research(row)) o.onChange();
        this.render();
      });
      for (const input of fieldset.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
        input.addEventListener('change', () => {
          if (!input.checked) return;
          this.commit();
          o.onSelect(row, input.value);
        });
      }
    }
    this.render();
  }

  private row(row: ResearchRow): HTMLFieldSetElement {
    return this.o.root.querySelector<HTMLFieldSetElement>(`.press-row[data-row="${row}"]`)!;
  }

  /** Paints the state of each row; it touches the DOM only when something changed. */
  render(): void {
    const e = this.o.economy;
    const s = e.state;
    const key = JSON.stringify([s.research, Math.floor(s.spark), s.levels.observatory]);
    if (key === this.last) return;
    this.last = key;
    ROWS.forEach((row, i) => {
      const fieldset = this.row(row);
      const r = s.research[row];
      const done = r.status === 'done';
      fieldset.classList.toggle('is-locked', r.status === 'locked' || r.status === 'available');
      fieldset.classList.toggle('is-researching', r.status === 'researching');
      fieldset.classList.toggle('is-done', done);
      fieldset.disabled = false;
      for (const input of fieldset.querySelectorAll<HTMLInputElement>('input[type="radio"]')) input.disabled = !done;
      const button = fieldset.querySelector<HTMLButtonElement>('[data-research]')!;
      const why = fieldset.querySelector<HTMLElement>('.press-why')!;
      const dial = fieldset.querySelector<SVGElement>('.press-dial')!;
      const cost = e.researchCost(row);
      const time = e.researchTime(row);
      button.hidden = done || r.status === 'researching';
      dial.toggleAttribute('hidden', r.status !== 'researching');
      if (r.status === 'locked') {
        button.disabled = true;
        button.innerHTML = `Research · <span class="num">${cost}</span> spark · <span class="num">${time}</span> s`;
        why.textContent = `Needs Observatory Lv ${i + 1}`;
      } else if (r.status === 'available') {
        const missing = Math.ceil(cost - s.spark - 1e-9);
        button.disabled = missing > 0;
        button.innerHTML = `Research · <span class="num">${cost}</span> spark · <span class="num">${time}</span> s`;
        why.textContent = missing > 0 ? `Needs ${missing} more spark` : '';
      } else if (r.status === 'researching') {
        why.textContent = `Researching · ${Math.ceil(r.remaining)} s left`;
      } else {
        why.textContent = '';
      }
      if (r.status === 'researching') this.paintDial(dial, 1 - r.remaining / time);
    });
    const skip = this.o.root.querySelector<HTMLElement>('.press-skip');
    if (skip) skip.hidden = ROWS.every((row) => s.research[row].status === 'done');
  }

  /** The research dial: an arc that fills and a needle that turns with the progress. */
  private paintDial(dial: SVGElement, progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    const a = p * Math.PI * 2 - Math.PI / 2;
    const x = 12 + DIAL_R * Math.cos(a);
    const y = 12 + DIAL_R * Math.sin(a);
    dial.querySelector('.press-dial-arc')!.setAttribute('d', `M12 ${12 - DIAL_R}A${DIAL_R} ${DIAL_R} 0 ${p > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`);
    dial.querySelector('.press-dial-needle')!.setAttribute('d', `M12 12L${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  /** The press thunk: a 600 ms dissolve, the plate sinks 2 px and comes back. */
  private commit(): void {
    pressThunk();
    if (this.o.reduced()) return;
    this.o.root.animate([{ translate: '0 0' }, { translate: '0 2px' }, { translate: '0 0' }], { duration: 160, easing: 'cubic-bezier(0.2, 0.9, 0.1, 1)' });
    cancelAnimationFrame(this.revealRaf);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      this.o.setReveal(t);
      if (t < 1) this.revealRaf = requestAnimationFrame(step);
    };
    this.o.setReveal(0);
    this.revealRaf = requestAnimationFrame(step);
  }
}
