// The strip's odometer drums: each digit is a drum that rolls digit by digit with a small bounce on
// the carry. The DOM is touched only when a visible digit changes; with reduced motion the digits
// change without rolling.
import { formatRate, type Economy } from '../economy';
import { carryClick } from '../voices';
import { numHtml } from './num';

const DIGITS = 6;

class Drum {
  private readonly reels: HTMLElement[] = [];
  private rateText = '';
  shown = '';

  constructor(
    private readonly well: HTMLElement,
    private readonly rate: HTMLElement,
  ) {
    const digits = well.querySelector('.drum-digits')!;
    const initial = (digits.textContent ?? '').padStart(DIGITS, '0');
    digits.replaceChildren();
    digits.classList.add('is-reels');
    for (let i = 0; i < DIGITS; i++) {
      const window_ = document.createElement('span');
      window_.className = 'reel-window';
      const reel = document.createElement('span');
      reel.className = 'reel';
      reel.setAttribute('aria-hidden', 'true');
      reel.textContent = '0123456789';
      window_.append(reel);
      digits.append(window_);
      this.reels.push(reel);
    }
    const label = document.createElement('span');
    label.className = 'vh drum-value';
    digits.append(label);
    this.set(Number(initial), '', true);
  }

  set(value: number, rateText: string, instant: boolean): void {
    const text = String(Math.max(0, Math.floor(value))).padStart(DIGITS, '0').slice(-DIGITS);
    if (rateText && rateText !== this.rateText) {
      this.rateText = rateText;
      this.rate.innerHTML = numHtml(rateText);
    }
    if (text === this.shown) return;
    // Carry: some digit other than the units digit rolled.
    if (this.shown && !instant && text.slice(0, -1) !== this.shown.slice(0, -1)) carryClick();
    this.shown = text;
    this.reels.forEach((reel, i) => {
      reel.classList.toggle('is-instant', instant);
      reel.style.setProperty('--d', text[i]);
    });
    this.well.dataset.value = String(Number(text));
    this.well.querySelector('.drum-value')!.textContent = String(Number(text));
  }
}

export class Drums {
  private readonly tin: Drum;
  private readonly spring: Drum;
  private readonly spark: Drum;
  private changes: number[] = [];

  constructor(root: HTMLElement) {
    const drum = (name: string) =>
      new Drum(root.querySelector<HTMLElement>(`[data-resource="${name}"] .drum-well`)!, root.querySelector<HTMLElement>(`[data-resource="${name}"] .drum-rate`)!);
    this.tin = drum('tin');
    this.spring = drum('spring');
    this.spark = drum('spark');
  }

  render(economy: Economy, reduced: boolean): void {
    const s = economy.state;
    // More than 20 changes per second: blurred rolling.
    const now = performance.now();
    this.changes = this.changes.filter((t) => now - t < 1000);
    const fast = this.changes.length > 20;
    document.documentElement.classList.toggle('drums-blur', fast && !reduced);
    const before = [this.tin, this.spring, this.spark].map((d) => d.shown).join();
    this.tin.set(s.tin, formatRate(economy.rate), reduced);
    this.spring.set(economy.turns, `${economy.turns} of 12 turns`, reduced);
    this.spark.set(s.spark, '+25/survey', reduced);
    const after = [this.tin, this.spring, this.spark].map((d) => d.shown).join();
    if (before !== after) this.changes.push(now);
  }
}
