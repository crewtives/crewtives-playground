import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { museumPlugin } from '../../src/playground/museum/build/plugin';
import { repoSrcInDev } from '../../tools/vite/repo-src-in-dev.ts';

const repo = resolve(import.meta.dirname, '../..');
const playground = import.meta.dirname;

// Playground pages: the museum (/), Bloomscope (/bloomscope/) and, outside the collection, Game
// Center Yonjigen and Wind-Up Empire at /landings/<slug>/. All of them are required: if the
// index.html of a compiled page is missing, the build fails and names it. The old comparison
// page is no longer compiled: /landings/ redirects to / (deploy/_redirects).
const pages: Record<string, string> = {
  museum: resolve(playground, 'index.html'),
  bloomscope: resolve(playground, 'bloomscope', 'index.html'),
  ...Object.fromEntries(['game-center', 'wind-up-empire'].map((slug) => [slug, resolve(playground, 'landings', slug, 'index.html')] as const)),
};

// PLAYGROUND_ONLY=<page> compiles only that page (museum, bloomscope, game-center or wind-up-empire),
// to measure its budget without depending on the state of the others.
const only = process.env.PLAYGROUND_ONLY;
if (only && !(only in pages)) {
  throw new Error(`PLAYGROUND_ONLY=${only} is not a playground page (${Object.keys(pages).join(', ')}).`);
}
const input = only ? { [only]: pages[only] } : pages;
for (const path of Object.values(input)) {
  if (!existsSync(path)) throw new Error(`missing entry page ${path}`);
}

/**
 * Fails the build if the 4D packs reached the root of the output (wrong publicDir). It checks the
 * resolved outDir, so it also holds when `--outDir` is given on the command line.
 */
function noPacksAtRoot(): Plugin {
  let outDir = '';
  return {
    name: 'playground-no-packs-at-root',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const packs = resolve(outDir, 'packs');
      if (existsSync(packs)) {
        throw new Error(`${packs} exists: the playground build must not copy the 4D packs (packs/) from sites/4d-os/public/.`);
      }
    },
  };
}

/** Size, mtime, ctime and inode of every file under `dir` (empty if it does not exist). */
function fileStamps(dir: string): Map<string, string> {
  const stamps = new Map<string, string>();
  if (!existsSync(dir)) return stamps;
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    const path = join(entry.parentPath, entry.name);
    const s = statSync(path);
    stamps.set(path.slice(dir.length + 1), `${s.size}:${s.mtimeMs}:${s.ctimeMs}:${s.ino}`);
  }
  return stamps;
}

/**
 * Fails the build if the playground build wrote, deleted or changed anything inside `<outDir>/4d-os/`,
 * which is the output of the 4D.OS build. It snapshots that folder at the start (before Vite copies
 * sites/playground/public and writes the bundle) and compares it at the end. The ctime changes on any
 * write, even when the content stays the same. It checks the resolved outDir, so it also holds when
 * `--outDir` is given on the command line.
 */
function no4dosWrites(): Plugin {
  let dir = '';
  let before = new Map<string, string>();
  return {
    name: 'playground-no-4d-os-writes',
    apply: 'build',
    configResolved(config) {
      dir = resolve(config.root, config.build.outDir, '4d-os');
    },
    buildStart() {
      before = fileStamps(dir);
    },
    closeBundle() {
      const after = fileStamps(dir);
      const touched = [
        ...[...after.keys()].filter((file) => !before.has(file)).map((file) => `${file} (new)`),
        ...[...before.keys()].filter((file) => !after.has(file)).map((file) => `${file} (deleted)`),
        ...[...after].filter(([file, stamp]) => before.has(file) && before.get(file) !== stamp).map(([file]) => `${file} (rewritten)`),
      ];
      if (touched.length > 0) {
        const list = touched.slice(0, 10).join(', ') + (touched.length > 10 ? `, and ${touched.length - 10} more` : '');
        throw new Error(`The playground build wrote inside ${dir}, which belongs to the 4D.OS build: ${list}.`);
      }
    },
  };
}

// PLAYGROUND_OUT lets the build write to a test folder without touching dist/.
const outDir = process.env.PLAYGROUND_OUT ? resolve(process.env.PLAYGROUND_OUT) : resolve(repo, 'dist');

// Second build: the museum is published at the root of playground.crewtives.com (base '/'), Bloomscope
// at /bloomscope/ and the other two landings at /landings/<slug>/, next to dist/4d-os/, which belongs
// to the 4D.OS build. Its publicDir is sites/playground/public, never sites/4d-os/public (that is
// where the 4D packs live).
export default defineConfig({
  root: playground,
  base: '/',
  publicDir: resolve(playground, 'public'),
  plugins: [museumPlugin(repo), noPacksAtRoot(), no4dosWrites(), repoSrcInDev(repo)],
  server: {
    fs: { allow: [repo] },
    ...(process.env.VITE_NO_HMR ? { hmr: false, watch: null } : {}),
  },
  build: {
    outDir,
    emptyOutDir: false,
    // The playground's code, styles and fonts go in a folder of their own: not under /landings/ (the
    // museum is not a landing) and not in /assets/.
    assetsDir: '_playground',
    rollupOptions: { input },
  },
});
