// Service panel (RF): eight DIP switches on the door of the machine room. They are settings,
// not a toy: sound (SW1), screen (SW2–SW3), rain, ghosts, mirror, automatic demo
// and a fixed FREE PLAY. They are saved per visitor in this browser (settings.ts) and kept in sync with the
// SCREEN selector, with B/X and with the sound grille.
import type { DisplayMode } from '../../../engine/display/RetroDisplay';
import { displayRegistry } from '../../shared/displays';
import { motion } from '../../shared/motion';
import { sound } from '../../shared/sound';
import { bitsFromScreen, screenFromBits, settings } from '../settings';
import { sfx } from '../sfx';

const MODE_TEXT: Record<DisplayMode, string> = { '16': '16 colours', '1bit': '1-bit', millions: 'Millions' };

export function setupService(root: HTMLElement): void {
  const sw = (n: number) => root.querySelector<HTMLInputElement>(`[data-sw="${n}"]`);
  const s1 = sw(1);
  const s2 = sw(2);
  const s3 = sw(3);
  const toggles: [HTMLInputElement | null, 'rain' | 'ghosts' | 'flip'][] = [
    [sw(4), 'rain'],
    [sw(5), 'ghosts'],
    [sw(6), 'flip'],
  ];
  const s7 = sw(7);
  const s8 = sw(8);
  const readout = root.querySelector<HTMLElement>('[data-sw-screen]');
  const attractNote = root.querySelector<HTMLElement>('[data-sw-attract-note]');
  if (!s1 || !s2 || !s3 || !s7 || !s8) return;

  // SW1: sound. The change is a visitor gesture, so it can turn the audio on.
  s1.checked = sound.enabled;
  s1.addEventListener('change', () => {
    sound.setEnabled(s1.checked);
    sfx.click();
  });
  sound.onChange((on) => {
    s1.checked = on;
  });

  // SW2–SW3: screen. Every combination resolves to a mode (11 = 16) and the panel shows it.
  const paintScreen = () => {
    const bits = `${Number(s2.checked)}${Number(s3.checked)}`;
    const mode = screenFromBits(s2.checked, s3.checked);
    if (readout) readout.textContent = `SW2–3 ${bits} = ${MODE_TEXT[mode]}`;
  };
  const fromMode = (mode: DisplayMode) => {
    // The levers only move if the current position does not give that mode (11 stays at 11).
    if (screenFromBits(s2.checked, s3.checked) !== mode) [s2.checked, s3.checked] = bitsFromScreen(mode);
    paintScreen();
  };
  fromMode(displayRegistry.mode);
  displayRegistry.onChange(fromMode);
  for (const input of [s2, s3]) {
    input.addEventListener('change', () => {
      sfx.click();
      displayRegistry.setMode(screenFromBits(s2.checked, s3.checked));
      paintScreen();
    });
  }

  // SW4 rain, SW5 ghosts (synced with B/X), SW6 mirror.
  for (const [input, key] of toggles) {
    if (!input) continue;
    input.checked = settings.value[key];
    input.addEventListener('change', () => {
      sfx.click();
      settings.set({ [key]: input.checked });
    });
  }

  // SW7 automatic demo: off and disabled with reduced motion.
  const paintAttract = (reduced: boolean) => {
    s7.disabled = reduced;
    s7.checked = reduced ? false : settings.value.attract;
    if (attractNote) attractNote.hidden = !reduced;
  };
  s7.addEventListener('change', () => {
    sfx.click();
    settings.set({ attract: s7.checked });
  });
  paintAttract(motion.reduced);
  motion.onChange(paintAttract);

  settings.onChange((s) => {
    for (const [input, key] of toggles) if (input) input.checked = s[key];
    if (!motion.reduced) s7.checked = s.attract;
  });

  // SW8 FREE PLAY: fixed on. If anything tried to change it, it goes back.
  s8.checked = true;
  s8.addEventListener('change', () => {
    s8.checked = true;
  });
  root.classList.add('is-running');
}
