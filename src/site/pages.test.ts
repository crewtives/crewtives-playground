import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { UserConfig, UserConfigFnObject } from 'vite';
import { describe, expect, test, vi } from 'vitest';
import { routeOf } from './build/plugin.ts';
import { CAT_CREDIT, LAUNCHER, WORLDS } from '../playground/shared/worlds.ts';
import { collapse, headTags, injectHead, metaDescription } from './head.ts';
import { CAT_MODEL, creditFor, isSynthetic, NOT_FOUND, PAGES, type PageMeta, pageForRoute, SITE_NAME, SITE_ORIGIN } from './pages.ts';

const repo = resolve(import.meta.dirname, '../..');

/** Source HTML of a page: each file sits where its route is, relative to its site's root (docs/architecture.md). */
function sourceHtml(page: PageMeta): string {
  const path = page.site === '4d-os' ? `sites/4d-os/${page.route.slice('/4d-os/'.length)}` : `sites/playground/${page.route.slice(1)}`;
  return resolve(repo, path, 'index.html');
}

/** The text of the source's `<title>`, whitespace collapsed. */
function sourceTitle(page: PageMeta): string {
  const html = readFileSync(sourceHtml(page), 'utf8');
  const tag = headTags(html).find((t) => t.name === 'title');
  expect(tag, `${page.slug} <title>`).toBeDefined();
  return collapse(html.slice(tag!.end, html.indexOf('</title>', tag!.end)));
}

/**
 * The tab title a page must carry (site-metadata "Tab titles and self-description" for the 4D.OS
 * pages, playground-hub "Demo honesty" for the museum and the landings), or null for a landing,
 * whose title is "<Name> · crewtives playground".
 */
function tabTitle(page: PageMeta): string | null {
  if (page.route === '/') return `${SITE_NAME} · a museum of live graphics experiments`;
  if (page.route === LAUNCHER.route) return `${LAUNCHER.name} · ${SITE_NAME}`;
  const world = WORLDS.find((w) => w.route === page.route);
  return world ? `${world.name} · ${LAUNCHER.name} · ${SITE_NAME}` : null;
}

/** Descriptions tightened to fit search results (adapt-for-phones D13): each keeps at least 110 characters. */
const TIGHTENED = ['/', '/landings/game-center/', '/landings/wind-up-empire/', '/4d-os/d/', '/4d-os/e/'];

describe('page registry (site-metadata, "One registry for every public page")', () => {
  test('exactly the 10 slugs, with their routes, in order', () => {
    expect(PAGES.map((p) => [p.slug, p.route])).toEqual([
      ['museum', '/'],
      ['bloomscope', '/bloomscope/'],
      ['game-center', '/landings/game-center/'],
      ['wind-up-empire', '/landings/wind-up-empire/'],
      ['4d-os', '/4d-os/'],
      ['4d-os-a', '/4d-os/a/'],
      ['4d-os-b', '/4d-os/b/'],
      ['4d-os-c', '/4d-os/c/'],
      ['4d-os-d', '/4d-os/d/'],
      ['4d-os-e', '/4d-os/e/'],
    ]);
    for (const page of PAGES) {
      expect(pageForRoute(page.route)).toBe(page);
      expect(page.site).toBe(page.route.startsWith('/4d-os/') ? '4d-os' : 'playground');
    }
  });

  test('each canonical is SITE_ORIGIN + route: HTTPS, trailing slash, no query or fragment', () => {
    expect(SITE_ORIGIN).toBe('https://playground.crewtives.com');
    for (const page of PAGES) {
      expect(page.canonical).toBe(SITE_ORIGIN + page.route);
      expect(page.canonical).toMatch(/^https:\/\/[^?#]*\/$/);
    }
  });

  test('titles, descriptions and alt texts within their bounds', () => {
    for (const page of PAGES) {
      expect(page.title.length, `${page.slug} title`).toBeGreaterThanOrEqual(10);
      expect(page.title.length, `${page.slug} title`).toBeLessThanOrEqual(70);
      expect(page.description.length, `${page.slug} description`).toBeGreaterThanOrEqual(TIGHTENED.includes(page.route) ? 110 : 50);
      expect(page.description.length, `${page.slug} description`).toBeLessThanOrEqual(160);
      expect(page.description, `${page.slug} description`).not.toMatch(/local experiment/i);
      expect(page.image.alt.length, `${page.slug} alt`).toBeGreaterThanOrEqual(40);
      expect(page.image.alt.length, `${page.slug} alt`).toBeLessThanOrEqual(420);
      expect(page.image).toMatchObject({ path: `/og/${page.slug}.png`, width: 1200, height: 630 });
    }
  });

  test('each tab title follows the rule, and each share title begins with its name', () => {
    for (const page of PAGES) {
      const title = sourceTitle(page);
      const expected = tabTitle(page);
      if (expected) expect(title, page.slug).toBe(expected);
      else expect(title, page.slug).toMatch(new RegExp(`^[^·]+ · ${SITE_NAME}$`));
      const name = title.split(' · ')[0];
      expect(page.title.startsWith(name), `${page.slug}: "${page.title}" begins with "${name}"`).toBe(true);
    }
  });

  test("no source calls the site a local experiment, and each passes the build's head checks", () => {
    for (const page of PAGES) {
      const html = readFileSync(sourceHtml(page), 'utf8');
      expect(html, page.slug).not.toMatch(/local experiment/i);
      // The build plugin runs exactly this: it throws on the data:, placeholder, on a tag the build
      // adds, on a description that differs from the registry's and on a head without one viewport meta.
      expect(() => injectHead(html, page), page.slug).not.toThrow();
    }
  });

  test("each description equals the page's own meta description", () => {
    for (const page of PAGES) {
      const own = metaDescription(readFileSync(sourceHtml(page), 'utf8'));
      expect(own, page.slug).not.toBeNull();
      expect(collapse(own!), page.slug).toBe(collapse(page.description));
    }
  });

  test("the cat's credit is built from CAT_MODEL, and each alt names it exactly when the image carries it", () => {
    expect(CAT_CREDIT.text).toBe(`"${CAT_MODEL.name}" by ${CAT_MODEL.creator}, CC-BY 3.0`);
    for (const page of PAGES) {
      expect(page.image.alt.includes(CAT_CREDIT.text), page.slug).toBe(creditFor(page) !== null);
    }
  });

  test('a synthetic frame that is not a world is one the page itself labels "Synthetic scene"', () => {
    const flagged = PAGES.filter((p) => p.syntheticFrame);
    expect(flagged.map((p) => p.slug)).toEqual(['game-center']);
    for (const page of flagged) {
      // The flag is only for scenes of a page's own: a world is marked through `frameShows`.
      expect(page.frameShows, page.slug).toEqual([]);
      expect(readFileSync(sourceHtml(page), 'utf8'), page.slug).toMatch(/>\s*Synthetic scene\s*</);
    }
  });

  test('each alt quotes the mark exactly when the band carries it', () => {
    for (const page of PAGES) expect(page.image.alt.includes('the mark “synthetic”'), page.slug).toBe(isSynthetic(page));
  });

  test('JSON-LD kinds: WebSite on /, CreativeWork elsewhere', () => {
    for (const page of PAGES) expect(page.jsonLd, page.slug).toBe(page.route === '/' ? 'WebSite' : 'CreativeWork');
  });

  test('the 404 page has its own entry', () => {
    expect(NOT_FOUND).toEqual({ file: '404.html', title: 'Not found · crewtives playground' });
  });
});

describe('registry and builds (site-metadata, "Registry matches the builds")', () => {
  test('the entry pages of both site configs are exactly the 10 registry routes plus the 404 page', async () => {
    // The playground config reads PLAYGROUND_ONLY and PLAYGROUND_OUT when it loads: cleared, it lists every page.
    vi.resetModules();
    vi.stubEnv('PLAYGROUND_ONLY', '');
    vi.stubEnv('PLAYGROUND_OUT', '');
    try {
      const fourDos = (await import('../../sites/4d-os/vite.config.ts')).default as UserConfigFnObject;
      const playground = (await import('../../sites/playground/vite.config.ts')).default as UserConfig;
      const configs = [(await fourDos({ command: 'build', mode: 'production' })) as UserConfig, playground];
      const built = configs.flatMap((config) =>
        Object.values(config.build!.rollupOptions!.input as Record<string, string>).map((file) => routeOf(config.base!, `/${relative(config.root!, file)}`)),
      );
      const expected = [...PAGES.map((p) => p.route), `/${NOT_FOUND.file}`];
      expect(built.filter((route) => !expected.includes(route)), 'built pages with no registry entry').toEqual([]);
      expect(expected.filter((route) => !built.includes(route)), 'registry entries no build produces').toEqual([]);
      expect(built).toHaveLength(expected.length);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
