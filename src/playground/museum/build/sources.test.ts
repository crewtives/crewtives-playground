import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { sourceFiles, sourcesHash } from './sources';

const root = mkdtempSync(join(tmpdir(), 'museum-sources-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

beforeEach(() => {
  rmSync(join(root, 'work'), { recursive: true, force: true });
  rmSync(join(root, 'page.html'), { force: true });
  mkdirSync(join(root, 'work/sub'), { recursive: true });
  writeFileSync(join(root, 'work/b.txt'), 'bee');
  writeFileSync(join(root, 'work/sub/a.txt'), 'ay');
  writeFileSync(join(root, 'page.html'), '<p>');
});

const hash = () => sourcesHash(root, ['work', 'page.html']);

describe('sources hash', () => {
  test('walks files in sorted order of their repo-relative paths, skipping dot-files', () => {
    writeFileSync(join(root, 'work/.DS_Store'), 'x');
    expect(sourceFiles(root, ['work', 'page.html'])).toEqual(['page.html', 'work/b.txt', 'work/sub/a.txt']);
  });

  test('each file contributes its path, its length and its bytes, hashed with SHA-256', () => {
    const expected = createHash('sha256').update('page.html\u00003\u0000<p>').update('work/b.txt\u00003\u0000bee').update('work/sub/a.txt\u00002\u0000ay').digest('hex');
    expect(hash()).toBe(expected);
    expect(hash()).toMatch(/^[0-9a-f]{64}$/);
  });

  test('unchanged files give the same hash, whatever the order of the paths', () => {
    expect(sourcesHash(root, ['page.html', 'work'])).toBe(hash());
    expect(sourcesHash(root, ['work', 'work/sub', 'page.html'])).toBe(hash());
  });

  test('one byte changed gives another hash', () => {
    const before = hash();
    writeFileSync(join(root, 'work/sub/a.txt'), 'az');
    expect(hash()).not.toBe(before);
  });

  test('a file added gives another hash, a dot-file does not', () => {
    const before = hash();
    writeFileSync(join(root, 'work/.hidden'), 'x');
    expect(hash()).toBe(before);
    writeFileSync(join(root, 'work/c.txt'), '');
    expect(hash()).not.toBe(before);
  });

  test('a file moved gives another hash, even with the same bytes', () => {
    const before = hash();
    renameSync(join(root, 'work/sub/a.txt'), join(root, 'work/a.txt'));
    expect(hash()).not.toBe(before);
  });

  test('a source path that does not exist fails and names it', () => {
    expect(() => sourcesHash(root, ['work', 'no/such/path'])).toThrow(/no\/such\/path/);
  });
});
