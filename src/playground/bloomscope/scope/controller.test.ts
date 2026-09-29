// "One press": after the full turn of "Every turn at once" the chamber goes into HOLD and the
// readout says so. The controller runs without a DOM, with fake elements that only keep state.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScopeController, type ScopeElements } from './controller';

function fakeElement(): HTMLElement {
  const attrs = new Map<string, string>();
  return {
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    style: {},
    classList: { add() {}, remove() {} },
    addEventListener() {},
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    getAttribute: (name: string) => attrs.get(name) ?? null,
    replaceChildren() {},
    focus() {},
  } as unknown as HTMLElement;
}

function fakeElements(): ScopeElements {
  const el = fakeElement;
  return {
    hero: el(),
    ringHit: el(),
    eyepiece: el(),
    knurl: el() as unknown as SVGElement,
    readout: el(),
    insetLines: el() as unknown as SVGSVGElement,
    live: el(),
    mirrors: [],
    everyTurn: el() as HTMLButtonElement,
    shake: el() as HTMLButtonElement,
    exposures: el() as HTMLButtonElement,
    tray: el() as HTMLOListElement,
    trayEmpty: el(),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('Every turn at once (One press)', () => {
  it('once the turn and the settling finish, the readout shows HOLD', () => {
    // The knurl click at each detent schedules a timeout.
    vi.stubGlobal('window', { setTimeout: () => 0 });
    const el = fakeElements();
    const scope = new ScopeController(el, 18);
    scope.load(false);
    for (let t = 0; t < 3; t += 1 / 60) scope.tick(1 / 60);
    expect(scope.chamber.hold).toBe(false);

    scope.everyTurn();
    // 360° at 120°/s takes 3 s, plus the settling (≤ 1.1 s) before it freezes.
    for (let t = 0; t < 6 && !scope.chamber.hold; t += 1 / 60) scope.tick(1 / 60);
    expect(scope.chamber.hold).toBe(true);
    expect(el.readout.textContent).toBe('D5 · HOLD · 0 specimens · 18 beads');
    expect(el.everyTurn.disabled).toBe(false);

    // Once frozen, it does not rewrite itself.
    for (let i = 0; i < 60; i++) scope.tick(1 / 60);
    expect(el.readout.textContent).toContain('HOLD');
  });
});
