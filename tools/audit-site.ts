/**
 * Audits the site metadata in the built output (spec site-metadata, "Audit of the built output";
 * design add-seo-and-sharing D7). Development-only tool: it reads the build and writes nothing. It
 * checks what can be read from the files:
 * - on each of the 10 public pages, every tag the build adds, exactly once, in its attribute form
 *   (`og:*` with `property=`, `twitter:*` with `name=`), with the registry's values;
 * - that those tags come before the first `<style>` and end within the first 32 KiB;
 * - the share image each page names: `?v=` equal to the start of the file's SHA-256, a 1200×630 PNG
 *   of at most 300 KB;
 * - the icons each page declares, the JSON-LD (type, no `</`, `isBasedOn` exactly where the image
 *   shows the cat) and the absence of `noindex` and of `data:,` placeholders;
 * - the 404 page, robots.txt, sitemap.xml, _headers and the icon files, and that no built page is
 *   missing from the registry.
 * It parses the HTML and reads the PNG and ICO headers itself, so that it does not share code with
 * what it audits; it takes only the registry from src/site/pages.ts.
 *
 * Usage, from the repo root, after `npm run build`:
 *
 *   npx -y -p tsx@4.23.15 tsx tools/audit-site.ts [dist]
 *
 * It prints one line per page and per site file. When anything is wrong it lists every problem under
 * its page and exits with 1.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { CAT_MODEL, creditFor, FAVICON, ICONS, NOT_FOUND, PAGES, type PageMeta, SITE_NAME, SITE_ORIGIN } from '../src/site/pages.ts';

const dist = resolve(process.argv[2] ?? 'dist');
/** The first bytes some link previews read (Slack reads 32 KiB). */
const HEAD_BYTES = 32 * 1024;
/** Weight budget of one share image (the same figure as the share-image tool's). */
const IMAGE_BYTES_MAX = 300 * 1024;
const HEADERS_RULE = ['https://:version.:subdomain.workers.dev/*', '  X-Robots-Tag: noindex'];

// ── Reading the files ──────────────────────────────────────────────────────────────────────────

interface Tag {
  name: string;
  attrs: Record<string, string>;
  start: number;
  end: number;
}

const decode = (text: string) =>
  text.replace(/&(amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' } as Record<string, string>)[e.toLowerCase()],
  );

/** The document with the contents of comments, scripts and styles blanked, offsets kept. */
const masked = (html: string) =>
  html.replace(/<!--[\s\S]*?-->|(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (m, open?: string, _t?: string, body?: string, close?: string) =>
    open ? open + ' '.repeat(body!.length) + close : ' '.repeat(m.length),
  );

/** Tags of the head, in order. */
function headTags(html: string): Tag[] {
  const doc = masked(html);
  const head = doc.slice(0, Math.max(0, doc.search(/<\/head\s*>/i)));
  return [...head.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g)].map((m) => ({
    name: m[1].toLowerCase(),
    attrs: Object.fromEntries(
      [...m[2].matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)].map((a) => [a[1].toLowerCase(), decode(a[2] ?? a[3] ?? a[4] ?? '')]),
    ),
    start: m.index,
    end: m.index + m[0].length,
  }));
}

const rels = (tag: Tag) => (tag.attrs.rel ?? '').toLowerCase().split(/\s+/);
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

function pngSize(bytes: Buffer): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b) || bytes.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Sizes of the square images of an ICO file, or null when its header is not one. */
function icoSizes(bytes: Buffer): number[] | null {
  if (bytes.length < 6 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) return null;
  const sizes: number[] = [];
  for (let i = 0; i < bytes.readUInt16LE(4); i++) {
    const at = 6 + i * 16;
    if (at + 16 > bytes.length) return null;
    const [width, height] = [bytes[at] || 256, bytes[at + 1] || 256];
    if (width !== height || bytes.readUInt32LE(at + 12) + bytes.readUInt32LE(at + 8) > bytes.length) return null;
    sizes.push(width);
  }
  return sizes;
}

/** Built file of a public URL path (`/4d-os/a/` is `4d-os/a/index.html`). */
const fileOf = (path: string) => join(dist, path.endsWith('/') ? `${path}index.html` : path);

/** Every HTML file of the build, relative to it. The packs hold no HTML and are skipped for speed. */
function htmlFiles(dir = dist): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return relative(dist, path) === join('4d-os', 'packs') ? [] : htmlFiles(path);
    return entry.name.endsWith('.html') ? [relative(dist, path)] : [];
  });
}

// ── Checks ─────────────────────────────────────────────────────────────────────────────────────

/** Icons: every non-inline href exists; no `data:,` placeholder is left. */
function checkIcons(tags: Tag[], problems: string[]): void {
  for (const tag of tags.filter((t) => t.name === 'link' && (rels(t).includes('icon') || rels(t).includes('apple-touch-icon')))) {
    const href = tag.attrs.href ?? '';
    if (href === 'data:,') problems.push('an empty data:, icon placeholder is left');
    else if (!href.startsWith('data:') && !existsSync(fileOf(href))) problems.push(`icon ${href} does not exist in the build`);
  }
}

function checkPage(page: PageMeta, problems: string[]): void {
  const file = fileOf(page.route);
  if (!existsSync(file)) {
    problems.push(`missing ${relative(dist, file)}`);
    return;
  }
  const html = readFileSync(file, 'utf8');
  const tags = headTags(html);
  const injected: number[] = [];
  const one = (what: string, found: Tag[]): Tag | null => {
    if (found.length !== 1) problems.push(`${what}: found ${found.length}, expected 1`);
    return found.length === 1 ? found[0] : null;
  };

  // Canonical link.
  const canonical = one('canonical link', tags.filter((t) => t.name === 'link' && rels(t).includes('canonical')));
  if (canonical) {
    injected.push(canonical.end);
    if (canonical.attrs.href !== page.canonical) problems.push(`canonical is ${canonical.attrs.href}, expected ${page.canonical}`);
  }

  // Open Graph and X tags, in their attribute form, with the registry's values.
  const image = tags.find((t) => t.name === 'meta' && (t.attrs.property ?? t.attrs.name) === 'og:image')?.attrs.content ?? '';
  const expected: [string, string][] = [
    ['og:type', 'website'],
    ['og:site_name', SITE_NAME],
    ['og:locale', 'en_US'],
    ['og:url', page.canonical],
    ['og:title', page.title],
    ['og:description', page.description],
    ['og:image', image],
    ['og:image:width', String(page.image.width)],
    ['og:image:height', String(page.image.height)],
    ['og:image:type', 'image/png'],
    ['og:image:alt', page.image.alt],
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', page.title],
    ['twitter:description', page.description],
    ['twitter:image', image],
    ['twitter:image:alt', page.image.alt],
  ];
  for (const [key, value] of expected) {
    const attr = key.startsWith('og:') ? 'property' : 'name';
    const wrong = attr === 'property' ? 'name' : 'property';
    for (const t of tags.filter((t) => t.name === 'meta' && t.attrs[wrong] === key)) {
      problems.push(`${key} is written as ${wrong}="${key}", expected ${attr}="${key}"`);
      injected.push(t.end);
    }
    const tag = one(`<meta ${attr}="${key}">`, tags.filter((t) => t.name === 'meta' && t.attrs[attr] === key));
    if (!tag) continue;
    injected.push(tag.end);
    if (tag.attrs.content !== value) problems.push(`${key} is "${tag.attrs.content}", expected "${value}"`);
  }
  const keys = tags.filter((t) => t.name === 'meta').map((t) => t.attrs.property ?? t.attrs.name ?? '');
  for (const key of new Set(keys.filter((k) => /^(og|twitter):/.test(k) && !expected.some(([e]) => e === k)))) problems.push(`unexpected ${key} tag`);

  // The page's own description equals the registry's.
  const description = tags.find((t) => t.name === 'meta' && t.attrs.name === 'description')?.attrs.content;
  if (description === undefined || collapse(description) !== collapse(page.description)) problems.push('its meta description differs from the registry');

  // The share image: ?v= from the file's SHA-256, a 1200×630 PNG within the weight budget.
  const url = new RegExp(`^${SITE_ORIGIN.replace(/\./g, '\\.')}(/og/[a-z0-9-]+\\.png)(?:\\?v=([0-9a-f]+))?$`).exec(image);
  if (!url) problems.push(`og:image ${image} is not an absolute ${SITE_ORIGIN}/og/<slug>.png URL`);
  else {
    if (url[1] !== page.image.path) problems.push(`og:image points to ${url[1]}, expected ${page.image.path}`);
    const png = join(dist, url[1]);
    if (!existsSync(png)) problems.push(`share image ${relative(dist, png)} does not exist in the build`);
    else {
      const bytes = readFileSync(png);
      const size = pngSize(bytes);
      if (!size || size.width !== 1200 || size.height !== 630) problems.push(`share image ${url[1]} is not a 1200×630 PNG (${size ? `${size.width}×${size.height}` : 'no PNG header'})`);
      if (bytes.length > IMAGE_BYTES_MAX) problems.push(`share image ${url[1]} weighs ${bytes.length} bytes, over ${IMAGE_BYTES_MAX}`);
      const version = sha256(bytes).slice(0, 8);
      if (url[2] === undefined) problems.push(`og:image has no ?v= version (expected ?v=${version})`);
      else if (url[2] !== version) problems.push(`og:image has ?v=${url[2]}, but the file's SHA-256 starts with ${version}`);
    }
  }

  // Icons: the site's apple-touch-icon; on / the favicon, before any other icon.
  const icons = ICONS[page.site];
  const touch = one('apple-touch-icon', tags.filter((t) => t.name === 'link' && rels(t).includes('apple-touch-icon')));
  if (touch) {
    injected.push(touch.end);
    if (touch.attrs.href !== icons.appleTouch) problems.push(`apple-touch-icon is ${touch.attrs.href}, expected ${icons.appleTouch}`);
  }
  const pageIcons = tags.filter((t) => t.name === 'link' && rels(t).includes('icon'));
  if (pageIcons.length === 0) problems.push('it declares no icon');
  if (page.route === '/') {
    const favicon = pageIcons.findIndex((t) => t.attrs.href === FAVICON.href && t.attrs.sizes === FAVICON.sizes);
    if (favicon < 0) problems.push(`no <link rel="icon" href="${FAVICON.href}" sizes="${FAVICON.sizes}">`);
    else {
      injected.push(pageIcons[favicon].end);
      if (favicon > 0) problems.push('the favicon link comes after another icon');
    }
  }
  checkIcons(tags, problems);

  // JSON-LD.
  const script = one('JSON-LD block', tags.filter((t) => t.name === 'script' && t.attrs.type === 'application/ld+json'));
  if (script) {
    const close = html.indexOf('</script>', script.end);
    const text = html.slice(script.end, close);
    injected.push(close + '</script>'.length);
    if (text.includes('</')) problems.push('the JSON-LD contains "</"');
    let data: Record<string, unknown> | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      problems.push('the JSON-LD does not parse');
    }
    if (data) {
      if (data['@type'] !== page.jsonLd) problems.push(`JSON-LD @type is ${String(data['@type'])}, expected ${page.jsonLd}`);
      if (data.url !== page.canonical) problems.push('JSON-LD url is not the canonical URL');
      if (page.jsonLd === 'WebSite' && data.name !== SITE_NAME) problems.push(`JSON-LD name is not "${SITE_NAME}"`);
      if (page.jsonLd === 'CreativeWork' && data.image !== image) problems.push('JSON-LD image differs from og:image');
      for (const key of ['aggregateRating', 'review', 'offers', 'datePublished', 'dateCreated', 'dateModified']) {
        if (key in data) problems.push(`JSON-LD claims ${key}`);
      }
      const credit = creditFor(page);
      const based = data.isBasedOn as { name?: string; creator?: { name?: string }; license?: string; url?: string } | undefined;
      if (!credit && based) problems.push('JSON-LD has isBasedOn, but the share image does not show the cat');
      if (credit && !based) problems.push("JSON-LD has no isBasedOn, but the share image shows the cat");
      if (credit && based && (based.name !== CAT_MODEL.name || based.creator?.name !== CAT_MODEL.creator || based.license !== credit.license || based.url !== credit.source)) {
        problems.push('JSON-LD isBasedOn does not name the cat model, its creator, license and source');
      }
    }
  }

  // Position: every added tag before the first <style> and within the first 32 KiB.
  if (injected.length) {
    const last = Math.max(...injected);
    const style = masked(html).search(/<style\b/i);
    if (Buffer.byteLength(html.slice(0, last)) > HEAD_BYTES) problems.push(`the added tags end at byte ${Buffer.byteLength(html.slice(0, last))}, past the first ${HEAD_BYTES}`);
    if (style >= 0 && last > style) problems.push('the added tags do not all come before the first <style>');
  }

  if (tags.some((t) => t.name === 'meta' && t.attrs.name === 'robots' && /noindex/i.test(t.attrs.content ?? ''))) problems.push('it carries noindex');
}

function checkNotFound(problems: string[]): void {
  const file = join(dist, NOT_FOUND.file);
  if (!existsSync(file)) {
    problems.push(`missing ${NOT_FOUND.file}`);
    return;
  }
  const html = readFileSync(file, 'utf8');
  const tags = headTags(html);
  if (!tags.some((t) => t.name === 'meta' && t.attrs.name === 'robots' && t.attrs.content === 'noindex')) problems.push('no <meta name="robots" content="noindex">');
  if (tags.some((t) => t.name === 'link' && rels(t).includes('canonical'))) problems.push('it has a canonical link');
  if (tags.some((t) => t.name === 'meta' && /^(og|twitter):/.test(t.attrs.property ?? t.attrs.name ?? ''))) problems.push('it has Open Graph or X tags');
  if (tags.some((t) => t.name === 'script' && t.attrs.type === 'application/ld+json')) problems.push('it has structured data');
  if (!html.includes(`<title>${NOT_FOUND.title}</title>`)) problems.push(`its title is not "${NOT_FOUND.title}"`);
  if (/<script\b/i.test(html)) problems.push('it has a script');
  for (const t of tags.filter((t) => t.name === 'link' || t.name === 'script')) {
    const url = t.attrs.href ?? t.attrs.src;
    if (url && !url.startsWith('/') && !url.startsWith('data:')) problems.push(`${url} is not root-absolute`);
  }
  if (!tags.some((t) => t.name === 'link' && rels(t).includes('icon'))) problems.push('it declares no icon');
  checkIcons(tags, problems);
}

function checkSiteFiles(report: (label: string, problems: string[]) => void): void {
  const read = (path: string) => (existsSync(join(dist, path)) ? readFileSync(join(dist, path)) : null);

  const robots = read('robots.txt')?.toString('utf8');
  const robotsProblems: string[] = [];
  if (robots === undefined) robotsProblems.push('missing');
  else {
    const lines = robots.split('\n').map((l) => l.trim());
    for (const line of ['User-agent: *', 'Allow: /', `Sitemap: ${SITE_ORIGIN}/sitemap.xml`]) if (!lines.includes(line)) robotsProblems.push(`no line "${line}"`);
    if (lines.some((l) => l.startsWith('Disallow'))) robotsProblems.push('it disallows a path');
  }
  report('/robots.txt', robotsProblems);

  const sitemap = read('sitemap.xml')?.toString('utf8');
  const sitemapProblems: string[] = [];
  if (sitemap === undefined) sitemapProblems.push('missing');
  else {
    if (!sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) sitemapProblems.push('no UTF-8 XML declaration');
    if (!sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) sitemapProblems.push('no sitemaps.org 0.9 urlset');
    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decode(m[1]));
    const canonicals = PAGES.map((p) => p.canonical);
    if (locs.length !== canonicals.length || locs.some((l) => !canonicals.includes(l)) || canonicals.some((c) => !locs.includes(c))) {
      sitemapProblems.push(`its URLs are not exactly the ${canonicals.length} canonical URLs`);
    }
    if (sitemap.includes('lastmod')) sitemapProblems.push('it has lastmod');
  }
  report('/sitemap.xml', sitemapProblems);

  const headers = read('_headers')?.toString('utf8');
  const headerProblems: string[] = [];
  if (headers === undefined) headerProblems.push('missing');
  else {
    const rules = headers.split('\n').filter((l) => l.trim() !== '' && !l.startsWith('#'));
    if (JSON.stringify(rules) !== JSON.stringify(HEADERS_RULE)) headerProblems.push(`its rules are not exactly: ${HEADERS_RULE.join(' / ')}`);
  }
  report('/_headers', headerProblems);

  const ico = read('favicon.ico');
  const sizes = ico && icoSizes(ico);
  report('/favicon.ico', !ico ? ['missing'] : !sizes ? ['not an ICO file'] : [...sizes].sort((a, b) => a - b).join(',') === '16,32,48' ? [] : [`sizes ${sizes.join(', ')}, expected 16, 32 and 48`]);

  for (const path of new Set(Object.values(ICONS).flatMap((i) => [i.appleTouch, i.svg]))) {
    const bytes = read(path.slice(1));
    let problems: string[] = [];
    if (!bytes) problems = ['missing'];
    else if (path.endsWith('.png')) {
      const size = pngSize(bytes);
      if (!size || size.width !== 180 || size.height !== 180) problems = [`not a 180×180 PNG (${size ? `${size.width}×${size.height}` : 'no PNG header'})`];
    } else if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(bytes.toString('utf8'))) problems = ['not an SVG file'];
    report(path, problems);
  }
}

// ── Report ─────────────────────────────────────────────────────────────────────────────────────

if (!existsSync(dist) || !statSync(dist).isDirectory()) {
  console.error(`${dist} is not a build folder. Run npm run build first, or pass the folder.`);
  process.exit(2);
}

let failed = 0;
const report = (label: string, problems: string[]) => {
  console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${label}`);
  for (const problem of problems) console.log(`        ${problem}`);
  if (problems.length) failed++;
};

for (const page of PAGES) {
  const problems: string[] = [];
  checkPage(page, problems);
  report(page.route, problems);
}
const notFound: string[] = [];
checkNotFound(notFound);
report(`/${NOT_FOUND.file}`, notFound);

// Every built page is in the registry.
const registered = new Set([...PAGES.map((p) => relative(dist, fileOf(p.route))), NOT_FOUND.file]);
const extra = htmlFiles().filter((file) => !registered.has(file));
report('built pages in the registry', extra.map((file) => `${file} is built but has no registry entry`));

checkSiteFiles(report);

if (failed) {
  console.log(`\n${failed} of the checks above failed.`);
  process.exit(1);
}
