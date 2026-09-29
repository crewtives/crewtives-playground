// Gas Tuner (RF): the eight-letter YONJIGEN sign made of tubes. A selector of five gases (←/→),
// each letter is a button that lights up with the chosen gas (a single pulse of brightness and the tube
// warming up from its base) and STRIKE ALL lights them from left to right. A strip records each
// strike as a mark in its color. SVG and CSS: works the same without WebGL2.
import { motion } from '../../shared/motion';
import { blip } from '../../shared/sound';
import { hum } from '../sfx';
import { GASES, LETTERS, stripSummary, type Gas } from './gases';

const STRIP_MAX = 96;

export function setupGasTuner(root: HTMLElement): void {
  const sign = root.querySelector<HTMLElement>('[data-gas-sign]');
  const dial = root.querySelector<HTMLElement>('[data-gas-dial]');
  const strip = root.querySelector<HTMLOListElement>('[data-gas-strip]');
  const all = root.querySelector<HTMLButtonElement>('[data-gas-all]');
  const live = document.querySelector('[data-live-floor]');
  if (!sign || !dial || !strip) return;
  let gas: Gas = GASES[2];
  const log: Gas['id'][] = [];

  // The letters: the tube's glass (with its sheen along it), the lit gas warming up from the base,
  // the hot core and, at each end, the electrode's dark sleeve. When off, it reads as a glass tube.
  const ns = 'http://www.w3.org/2000/svg';
  const letters: HTMLButtonElement[] = [];
  const make = (tag: string, cls: string, d: string) => {
    const el = document.createElementNS(ns, tag);
    el.setAttribute('class', cls);
    if (d) el.setAttribute('d', d);
    return el;
  };
  LETTERS.forEach((letter, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tube';
    button.setAttribute('aria-label', `Strike letter ${letter.char}`);
    button.style.setProperty('--w', String(letter.w));
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `-2 -2 ${letter.w + 4} 28`);
    svg.setAttribute('aria-hidden', 'true');
    const light = make('g', 'tube__light', '');
    const gasPath = make('path', 'tube__gas', letter.d);
    gasPath.setAttribute('pathLength', '100');
    light.append(gasPath, make('path', 'tube__core', letter.d));
    svg.append(make('path', 'tube__glass', letter.d), light, make('path', 'tube__sheen', letter.d), electrodes(letter.d));
    button.append(svg);
    button.addEventListener('click', () => strike(i, true));
    sign.append(button);
    letters.push(button);
  });

  // Electrode sleeves: the last 1.1 u of each end of the tube, measured along the stroke itself.
  function electrodes(d: string): SVGPathElement {
    const probe = document.createElementNS(ns, 'path');
    probe.setAttribute('d', d);
    const out = make('path', 'tube__electrode', '') as SVGPathElement;
    if (typeof probe.getTotalLength !== 'function') return out;
    const total = probe.getTotalLength();
    if (!(total > 0)) return out;
    const seg = (a: number, b: number) => {
      const p = probe.getPointAtLength(a);
      const q = probe.getPointAtLength(b);
      return `M${p.x.toFixed(2)} ${p.y.toFixed(2)}L${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
    };
    out.setAttribute('d', seg(0, 1.1) + seg(total, total - 1.1));
    return out;
  }

  const say = (text: string) => {
    if (live) live.textContent = text;
  };

  function strike(i: number, announce: boolean): void {
    const button = letters[i];
    button.style.setProperty('--gas', gas.color);
    button.dataset.gas = gas.id;
    button.classList.add('is-lit');
    if (!motion.reduced) {
      // Restarts the pulse: a single flash of brightness and the warm-up from the base.
      button.classList.remove('is-striking');
      void button.offsetWidth;
      button.classList.add('is-striking');
      const ballast = hum(100, 'sawtooth', 260, 0.03);
      window.setTimeout(() => ballast.stop(), 600);
    }
    blip(3200, 0.002, 'square', 0.1);
    record(gas);
    if (announce) say(`${LETTERS[i].char} struck with ${gas.name.toLowerCase()}: ${gas.look}.`);
  }

  function record(g: Gas): void {
    log.push(g.id);
    const tick = document.createElement('li');
    tick.style.setProperty('--gas', g.color);
    strip!.append(tick);
    while (strip!.children.length > STRIP_MAX) strip!.firstElementChild?.remove();
    strip!.setAttribute('aria-label', `Strike log: ${stripSummary(log)}`);
  }

  // Five-position rotary selector.
  const radios = [...dial.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const pick = (index: number, focus: boolean) => {
    gas = GASES[index];
    radios.forEach((r, i) => {
      r.setAttribute('aria-checked', String(i === index));
      r.tabIndex = i === index ? 0 : -1;
    });
    dial.style.setProperty('--turn', `${-60 + index * 30}deg`);
    root.style.setProperty('--gas-now', gas.color);
    if (focus) radios[index].focus();
    blip(1800, 0.01, 'square', 0.06);
  };
  radios.forEach((radio, i) => radio.addEventListener('click', () => pick(i, false)));
  dial.addEventListener('keydown', (event) => {
    const i = radios.findIndex((r) => r === document.activeElement);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (i < 0 || !step) return;
    event.preventDefault();
    pick(Math.max(0, Math.min(radios.length - 1, i + step)), true);
  });
  pick(GASES.indexOf(gas), false);

  // STRIKE ALL: from left to right, one letter per eighth note at 88 bpm (340 ms: fewer than 3 flashes per
  // second on the sign, D12); without motion, all at once.
  let timers: number[] = [];
  all?.addEventListener('click', () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
    if (motion.reduced) {
      letters.forEach((_, i) => strike(i, false));
    } else {
      letters.forEach((_, i) => timers.push(window.setTimeout(() => strike(i, false), i * 340)));
    }
    say(`All eight letters struck with ${gas.name.toLowerCase()}, left to right.`);
  });
  // When the visitor reaches the roof the sign lights up once with the chosen gas: two blinks in tempo
  // (120 BPM) and it stays lit, still (zero frames at rest). With reduced motion it is already lit.
  const lightAll = () => {
    letters.forEach((button) => {
      button.style.setProperty('--gas', gas.color);
      button.dataset.gas = gas.id;
      button.classList.add('is-lit');
    });
  };
  if (motion.reduced) {
    lightAll();
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (letters.some((b) => b.classList.contains('is-lit'))) return;
        lightAll();
        if (motion.reduced) return;
        sign.classList.add('is-igniting');
        const ballast = hum(100, 'sawtooth', 260, 0.03);
        window.setTimeout(() => {
          ballast.stop();
          sign.classList.remove('is-igniting');
        }, 1200);
      },
      { threshold: 0.6 },
    );
    io.observe(sign);
  } else {
    lightAll();
  }
  root.classList.add('is-running');
}
