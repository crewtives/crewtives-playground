// Museum plugin for the playground build (D1, D2): it generates the manifest with the same logic in
// the build and when `dev:playground` starts, exposes it as a virtual module (`virtual:museum`, with
// its type declaration checked in at `../virtual.d.ts`) and injects into `sites/playground/index.html`
// the static HTML of the sheets and the integer-scale CSS of the VISTAs. Stale-loop warnings are
// written to the output without failing the build (D6).

import { resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { buildManifest } from './manifest';
import { renderPage, type Page } from './render';

const VIRTUAL = 'virtual:museum';
const RESOLVED = `\0${VIRTUAL}`;
const BODY_MARK = '<!--museum:body-->';
const CSS_MARK = '<style id="museum-vistas"></style>';

export function museumPlugin(root: string): Plugin {
  let page: Page | null = null;
  let warn: (message: string) => void = (message) => console.warn(message);

  const generate = () => {
    const manifest = buildManifest({ root });
    for (const warning of manifest.warnings) warn(`[museum] ${warning}`);
    page = renderPage(manifest);
    return page;
  };

  return {
    name: 'playground-museum',
    buildStart() {
      warn = (message) => this.warn(message);
      generate();
    },
    configureServer(server: ViteDevServer) {
      generate();
      // Generated files (the fold's axonometries), served the way the build will publish them.
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0].replace(/^\//, '') ?? '';
        const file = page?.files[path];
        if (!file) return next();
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(file);
      });
      // A re-recorded loop or an edited collection regenerates the museum.
      const loops = resolve(root, 'sites/playground/public/loops');
      server.watcher.add(loops);
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(loops) || file.includes('/src/playground/museum/collection.ts')) {
          generate();
          const mod = server.moduleGraph.getModuleById(RESOLVED);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries((page ?? generate()).files)) this.emitFile({ type: 'asset', fileName, source });
    },
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      return `export default ${JSON.stringify((page ?? generate()).runtime)};`;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes(BODY_MARK)) return html;
        const current = page ?? generate();
        return html.replace(CSS_MARK, `<style id="museum-vistas">${current.css}</style>`).replace(BODY_MARK, current.body);
      },
    },
  };
}
