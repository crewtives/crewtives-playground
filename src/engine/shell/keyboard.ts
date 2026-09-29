import type { TimeController } from '../time/TimeController';

export type TimeKeyAction = 'toggle' | 'rewind' | 'hold' | 'forward' | 'stepBack' | 'stepForward';

interface KeyLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/** Maps a key to a time action, or null if no action matches it. */
export function keyAction(event: KeyLike): TimeKeyAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  switch (event.key) {
    case ' ':
    case 'Spacebar':
      return 'toggle';
    case 'j':
    case 'J':
      return 'rewind';
    case 'k':
    case 'K':
      return 'hold';
    case 'l':
    case 'L':
      return 'forward';
    case 'ArrowLeft':
      return 'stepBack';
    case 'ArrowRight':
      return 'stepForward';
    default:
      return null;
  }
}

const TEXT_INPUT = 'textarea, select, [contenteditable=""], [contenteditable="true"], input:not([type="radio"], [type="checkbox"], [type="button"], [type="submit"], [type="range"])';

/**
 * The global keyboard yields only the keys that the focused control actually uses:
 * a text field keeps all of them; a slider or a radio, the arrows;
 * a button, checkbox or radio, the space bar. J/K/L keep working everywhere else.
 */
export function isTypingTarget(element: Element | null, key: string): boolean {
  if (!element || element === document.body) return false;
  if (element.closest(TEXT_INPUT)) return true;
  const arrow = key === 'ArrowLeft' || key === 'ArrowRight';
  if (arrow && element.closest('[role="slider"], input[type="range"], input[type="radio"], [role="radiogroup"]')) {
    return true;
  }
  if (key === ' ' && element.closest('button, summary, a[href], input, [role="slider"]')) return true;
  return false;
}

export function applyTimeAction(time: TimeController, action: TimeKeyAction): void {
  switch (action) {
    case 'toggle':
      time.togglePlay();
      break;
    case 'rewind':
      time.rewind();
      break;
    case 'hold':
      time.hold();
      break;
    case 'forward':
      time.forward();
      break;
    case 'stepBack':
      time.step(-1);
      break;
    case 'stepForward':
      time.step(1);
      break;
  }
}

/**
 * Space: HOLD/resume · J/K/L: rewind/HOLD/forward (repeating speeds up) · ←/→: one frame.
 * Returns the function that detaches the listener.
 */
export function bindTimeKeys(time: TimeController, target: Window | HTMLElement = window): () => void {
  const onKey = (event: Event) => {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.defaultPrevented) return;
    const action = keyAction(keyEvent);
    if (!action) return;
    if (isTypingTarget(document.activeElement, keyEvent.key)) return;
    keyEvent.preventDefault();
    applyTimeAction(time, action);
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}
