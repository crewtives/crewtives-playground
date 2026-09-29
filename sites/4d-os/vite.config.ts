import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { siteMetadata } from '../../src/site/build/plugin.ts';
import { packSaver } from '../../tools/vite/pack-saver.ts';
import { repoSrcInDev } from '../../tools/vite/repo-src-in-dev.ts';

const repo = resolve(import.meta.dirname, '../..');
// Root of the 4D.OS site: its pages and its public/ folder (4D packs and launcher images).
const site = import.meta.dirname;

/** If the HTML of an entry page is missing, the build fails and names it (instead of silently leaving it out). */
function entry(path: string): string {
  if (!existsSync(path)) throw new Error(`missing entry page ${path}`);
  return path;
}

// Pages that go into the build. /bake and /debug are development-only: Vite serves
// them under `vite dev` because they exist on disk, but they are not listed here.
const worldPages = ['a', 'b', 'c', 'd', 'e'].map((name) => [name, entry(resolve(site, name, 'index.html'))] as const);

export default defineConfig(({ command }) => ({
  root: site,
  // The build is published at playground.crewtives.com/4d-os/; in development it is still served from the root.
  base: command === 'build' ? '/4d-os/' : '/',
  // siteMetadata: canonical, Open Graph, X card, icons and JSON-LD of every built page (src/site/).
  plugins: [packSaver({ packsDir: resolve(site, 'public/packs') }), repoSrcInDev(repo), siteMetadata({ siteFiles: false })],
  server: {
    // The pages load their code from the repository's src/, outside the site root.
    fs: { allow: [repo] },
    // VITE_NO_HMR=1: a stable server for checking in the browser while other files change.
    ...(process.env.VITE_NO_HMR ? { hmr: false, watch: null } : {}),
  },
  build: {
    // dist/ is the Worker's assets root: each route of playground.crewtives.com is a folder.
    outDir: resolve(repo, 'dist/4d-os'),
    // Outside the site root, Vite would no longer empty it by itself.
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: entry(resolve(site, 'index.html')),
        ...Object.fromEntries(worldPages),
      },
    },
  },
}));
