// Sources hash of a work (spec work-loops, "Published provenance per loop" and "Stale loop warning"):
// SHA-256 over every file under the work's source paths, in sorted order of their repo-relative paths,
// skipping files whose name starts with a dot. Each file contributes its path, its length and its
// bytes, so that no two different trees can produce the same input. The loop's provenance records
// this hash when the loop is recorded; the build recomputes it, and a different hash marks the loop
// stale. Runs in Node: the museum plugin, the capture tool and the tests use it. It never runs git,
// so it gives the same result from a full clone, a shallow clone or an archive without `.git`.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const SOURCES_ALGORITHM = 'sha256';

/** Repo-relative paths (with `/`) of every file under `paths`, sorted, without dot-files. */
export function sourceFiles(root: string, paths: readonly string[]): string[] {
  const files = new Set<string>();
  const add = (absolute: string) => {
    if (statSync(absolute).isDirectory()) {
      for (const entry of readdirSync(absolute)) add(join(absolute, entry));
    } else if (!absolute.slice(absolute.lastIndexOf(sep) + 1).startsWith('.')) {
      files.add(relative(root, absolute).split(sep).join('/'));
    }
  };
  for (const path of paths) {
    const absolute = join(root, path);
    if (!existsSync(absolute)) throw new Error(`museum: the source path ${path} does not exist`);
    add(absolute);
  }
  return [...files].sort();
}

/** Lowercase hexadecimal SHA-256 of the files under `paths` (see the header of this module). */
export function sourcesHash(root: string, paths: readonly string[]): string {
  const hash = createHash(SOURCES_ALGORITHM);
  for (const file of sourceFiles(root, paths)) {
    const bytes = readFileSync(join(root, file));
    hash.update(`${file}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  return hash.digest('hex');
}
