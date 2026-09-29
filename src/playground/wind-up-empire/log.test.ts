// The "Survey log": newest line on top, capped at 24 lines, and the lid shows the four newest
// at any width. Tested with a fake <ol> (no DOM) and against the stylesheet.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SurveyLog } from './ui/log';

interface FakeItem {
  textContent: string;
  remove(): void;
}

/** The bare minimum of an <ol> that SurveyLog uses: prepend, children, lastElementChild and replaceChildren. */
function fakeList() {
  const children: FakeItem[] = [];
  const list = {
    children,
    prepend(item: FakeItem) {
      item.remove = () => children.splice(children.indexOf(item), 1);
      children.unshift(item);
    },
    get lastElementChild() {
      return children[children.length - 1] ?? null;
    },
    replaceChildren() {
      children.length = 0;
    },
  };
  return list as unknown as HTMLOListElement;
}

afterEach(() => vi.unstubAllGlobals());

function makeLog() {
  vi.stubGlobal('document', { createElement: () => ({ textContent: '', remove() {} }) });
  return new SurveyLog(fakeList());
}

const css = readFileSync(resolve(import.meta.dirname, 'wind-up-empire.css'), 'utf8');

describe('log (Survey log)', () => {
  it('the newest line goes on top and the order is kept', () => {
    const log = makeLog();
    for (const line of ['one', 'two', 'three']) log.add(line);
    expect(log.lines()).toEqual(['three', 'two', 'one']);
  });

  it('keeps 24 lines at most: the oldest ones drop off', () => {
    const log = makeLog();
    for (let i = 1; i <= 30; i++) log.add(`line ${i}`);
    const lines = log.lines();
    expect(lines).toHaveLength(24);
    expect(lines[0]).toBe('line 30');
    expect(lines[23]).toBe('line 7');
  });

  it('the four visible lines are the four newest, at any width', () => {
    const log = makeLog();
    for (let i = 1; i <= 10; i++) log.add(`line ${i}`);
    expect(log.lines().slice(0, 4)).toEqual(['line 10', 'line 9', 'line 8', 'line 7']);
    // The stylesheet hides from the fifth line on, and no rule (not even at intermediate widths) hides any earlier one.
    const hides = [...css.matchAll(/\.log-lines li:nth-child\(n \+ (\d+)\)\s*\{\s*display:\s*none/g)].map((m) => Number(m[1]));
    expect(hides).toEqual([5]);
    expect(css).not.toMatch(/\.log-lines li:nth-child\((?!n \+ 5\))[^)]*\)\s*\{\s*display:\s*none/);
  });

  it('clear() leaves it empty', () => {
    const log = makeLog();
    log.add('one');
    log.clear();
    expect(log.lines()).toEqual([]);
  });
});
