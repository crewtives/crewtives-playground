// Site-metadata plugin for both site builds (spec site-metadata; add-seo-and-sharing D2). It maps
// every built page to its public route, fails the build on a page the registry does not know, and
// injects the page's metadata into the built HTML with `injectHead`. It runs at order `post`: after
// Vite has rewritten the page's own scripts and styles and after the museum plugin (order `pre`) has
// written the museum's body, so the absolute URLs it adds are left exactly as written. The playground
// build also emits sitemap.xml and robots.txt (`siteFiles`).

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { injectHead } from '../head.ts';
import { NOT_FOUND, PAGES, type PageMeta, pageForRoute } from '../pages.ts';
import { robotsTxt, sitemapXml } from '../sitemap.ts';

const REPO = resolve(import.meta.dirname, '../../..');
/** The share images are public files of the playground site, served at `/og/<slug>.png` (D5). */
const PUBLIC = 'sites/playground/public';

/**
 * Public route of a built page, from the build's base and the page's path from its Vite root:
 * `/a/index.html` under base `/4d-os/` is `/4d-os/a/`, and `/404.html` under `/` is `/404.html`.
 */
export function routeOf(base: string, path: string): string {
  return base.replace(/\/?$/, '/') + path.replace(/^\//, '').replace(/(^|\/)index\.html$/, '$1');
}

/** Repository path of the page's share image. */
export function imageFile(page: PageMeta): string {
  return join(PUBLIC, page.image.path);
}

/**
 * The image's version for `?v=`: the first 8 hex digits of its SHA-256, so that a re-captured image
 * gets a new URL in cards that were already unfurled. Null when the image does not exist yet.
 */
export function imageVersion(page: PageMeta, repo = REPO): string | null {
  const file = resolve(repo, imageFile(page));
  if (!existsSync(file)) return null;
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
}

export function siteMetadata({ siteFiles }: { siteFiles: boolean }): Plugin {
  let base = '/';
  return {
    name: 'site-metadata',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const file = relative(REPO, ctx.filename);
        const route = routeOf(base, ctx.path);
        if (route === `/${NOT_FOUND.file}`) return injectHead(html, NOT_FOUND);
        const page = pageForRoute(route);
        if (!page) {
          throw new Error(`${file} builds the page ${route}, which has no entry in src/site/pages.ts. Every built page needs one (docs/site-metadata.md).`);
        }
        const version = imageVersion(page);
        // A missing image only warns, so a fresh clone or a build made before the images exist still
        // works; the build gate and tools/audit-site.ts do not accept this line (D2, D8).
        if (!version) this.warn(`[site] missing share image ${imageFile(page)}: ${route} is built without a ?v= version on og:image.`);
        return injectHead(html, page, { imageVersion: version ?? undefined });
      },
    },
    generateBundle() {
      if (!siteFiles) return;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(PAGES) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt() });
    },
  };
}
