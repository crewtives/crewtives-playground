import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { woff2Codepoints } from '../playground/museum/build/woff2.ts';
import { NOT_FOUND, PAGES, SITE_ORIGIN } from './pages.ts';
import { robotsTxt, sitemapXml } from './sitemap.ts';

const repo = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(repo, path), 'utf8');

describe('sitemap.xml (site-metadata, "sitemap.xml")', () => {
  const xml = sitemapXml(PAGES);
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

  test('UTF-8 XML declaration and the sitemaps.org 0.9 urlset', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  test('exactly the 10 canonical URLs, in registry order, with no lastmod and no 404 page', () => {
    expect(locs).toHaveLength(10);
    expect(locs).toEqual(PAGES.map((p) => p.canonical));
    for (const loc of locs) expect(loc).toMatch(/^https:\/\/playground\.crewtives\.com\/(?:[^?#]*\/)?$/);
    expect(xml).not.toContain('lastmod');
    expect(xml).not.toContain('404');
  });

  test('each <loc> is XML-escaped', () => {
    const page = { ...PAGES[0], canonical: `${SITE_ORIGIN}/a&b<c>/` };
    expect(sitemapXml([page])).toContain(`<loc>${SITE_ORIGIN}/a&amp;b&lt;c&gt;/</loc>`);
  });
});

describe('robots.txt (site-metadata, "robots.txt")', () => {
  const lines = robotsTxt().split('\n');

  test('allows every crawler on every path and names the sitemap from SITE_ORIGIN', () => {
    expect(lines).toContain('User-agent: *');
    expect(lines).toContain('Allow: /');
    expect(lines.filter((line) => line.startsWith('Sitemap:'))).toEqual([`Sitemap: ${SITE_ORIGIN}/sitemap.xml`]);
    expect(lines.some((line) => line.startsWith('Disallow'))).toBe(false);
  });
});

describe('_headers (site-metadata, "Noindex on the non-canonical host")', () => {
  test('exactly one rule: noindex on any workers.dev host of the Worker, named only by placeholders', () => {
    const rules = read('sites/playground/public/_headers')
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.startsWith('#'));
    expect(rules).toEqual(['https://:version.:subdomain.workers.dev/*', '  X-Robots-Tag: noindex']);
  });
});

describe('the 404 page (site-metadata, "The 404 page")', () => {
  const html = read('sites/playground/404.html');
  const body = html.slice(html.indexOf('<body'));

  test('English, titled, described, with no script', () => {
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toContain(`<title>${NOT_FOUND.title}</title>`);
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}" \/>/);
    expect(html).not.toMatch(/<script/i);
    // noindex is the build's to add (injectHead); the source must not declare it twice.
    expect(html).not.toMatch(/name="robots"/);
  });

  test('real links back into the site', () => {
    const links = [...body.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
    for (const href of ['/', '/#index', '/4d-os/', '/bloomscope/', '/landings/game-center/', '/landings/wind-up-empire/']) {
      expect(links, href).toContain(href);
    }
  });

  test("every character of its visible text is in the museum's Geologica and Fira Mono Latin files, and none is an arrow", () => {
    const text = body
      .replace(/<title[\s\S]*?<\/title>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text).toContain('There is no page at this address.');
    expect(text).not.toMatch(/[\u2190-\u21ff]/);
    expect(text).not.toMatch(/&[a-z#0-9]+;/i);
    const fonts = [
      'geologica-latin-wght-normal.woff2',
      'fira-mono-latin-400-normal.woff2',
      'fira-mono-latin-500-normal.woff2',
    ];
    for (const font of fonts) {
      const map = woff2Codepoints(readFileSync(resolve(repo, 'src/playground/museum/fonts', font)));
      const missing = [...new Set(text.replace(/ /g, ''))].filter((c) => !map.has(c.codePointAt(0)!));
      expect(missing, font).toEqual([]);
    }
  });

  test('its stylesheet only imports the museum tokens, which declare the museum faces', () => {
    const css = read('src/playground/not-found/not-found.css');
    expect([...css.matchAll(/@import\s+'([^']+)'/g)].map((m) => m[1])).toEqual(['../museum/tokens.css']);
    expect(html).toContain('<link rel="stylesheet" href="../../src/playground/not-found/not-found.css" />');
  });

  test('the Worker answers unknown paths with it (deploy/wrangler.jsonc)', () => {
    // JSONC: comments out, strings kept as they are.
    const json = read('deploy/wrangler.jsonc').replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, string?: string) => string ?? '');
    const config = JSON.parse(json);
    expect(config.assets).toEqual({ directory: '../dist', not_found_handling: '404-page' });
  });
});
