// Head injection of the site metadata (spec site-metadata; add-seo-and-sharing D2, D3, D4). A pure
// function of the built HTML and the page's registry entry: the build plugin calls it on every page,
// and the tests call it on fixtures. It writes one block right after the page's viewport meta, so that
// link previews that read only the first 32 KiB of a page still find it (the built museum's head is
// over 65 KB). A page with no icon of its own gets the site's icon in that block; a source that
// declares the empty `data:,` icon placeholder is rejected (adapt-for-phones D14).

import { CAT_MODEL, CREATOR, creditFor, FAVICON, ICONS, type NotFoundMeta, type PageMeta, SITE_NAME, SITE_ORIGIN } from './pages.ts';

export interface HeadTag {
  /** Tag name, lowercase. */
  name: string;
  /** Attributes, names lowercase, values with their entities decoded. */
  attrs: Record<string, string>;
  /** Offsets of the whole tag in the HTML. */
  start: number;
  end: number;
}

const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? match;
    const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}

/** Blanks the contents of comments, scripts and styles, keeping every offset, so that no tag is found inside them. */
function maskRaw(html: string): string {
  return html.replace(/<!--[\s\S]*?-->|(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (match, open?: string, _tag?: string, body?: string, close?: string) =>
    open ? open + ' '.repeat(body!.length) + close : ' '.repeat(match.length),
  );
}

/** The tags of the document's `<head>`, in order. */
export function headTags(html: string): HeadTag[] {
  const masked = maskRaw(html);
  const close = masked.search(/<\/head\s*>/i);
  if (close < 0) throw new Error('the page has no </head>');
  const tags: HeadTag[] = [];
  for (const match of masked.slice(0, close).matchAll(TAG)) {
    const attrs: Record<string, string> = {};
    for (const attr of match[2].matchAll(ATTR)) attrs[attr[1].toLowerCase()] = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '');
    tags.push({ name: match[1].toLowerCase(), attrs, start: match.index, end: match.index + match[0].length });
  }
  return tags;
}

/** Whitespace collapsed, as a browser shows an attribute's text. */
export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The content of the page's `<meta name="description">`, or null. */
export function metaDescription(html: string): string | null {
  const tag = headTags(html).find((t) => t.name === 'meta' && t.attrs.name?.toLowerCase() === 'description');
  return tag ? (tag.attrs.content ?? '') : null;
}

const relOf = (tag: HeadTag) => (tag.attrs.rel ?? '').toLowerCase().split(/\s+/);
const isIcon = (tag: HeadTag) => tag.name === 'link' && relOf(tag).includes('icon');
/** `<link rel="icon" href="data:,">` in any spelling: the empty icon the sources used to declare (D14). */
const isPlaceholder = (tag: HeadTag) => isIcon(tag) && (tag.attrs.href ?? '').trim() === 'data:,';

/** The tags this module adds, which a source must not declare itself. */
function addedByBuild(tag: HeadTag): string | null {
  if (tag.name === 'link' && relOf(tag).includes('canonical')) return 'a canonical link';
  if (tag.name === 'link' && relOf(tag).includes('apple-touch-icon')) return 'an apple-touch-icon';
  if (tag.name === 'script' && tag.attrs.type?.toLowerCase() === 'application/ld+json') return 'a JSON-LD block';
  if (tag.name === 'meta') {
    const key = (tag.attrs.property ?? tag.attrs.name ?? '').toLowerCase();
    if (key.startsWith('og:') || key.startsWith('twitter:')) return `a ${key} tag`;
    if (key === 'robots') return 'a robots meta';
  }
  return null;
}

/** HTML-escapes an attribute value. */
export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * JSON for a `<script type="application/ld+json">`: `<`, `>` and `&` as JSON Unicode escapes, so the
 * block never contains `</` and `JSON.parse` gives back the original strings.
 */
export function jsonLdText(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** Absolute URL of the share image, with `?v=<version>` when the build knows the image's version. */
export function imageUrl(page: PageMeta, imageVersion?: string): string {
  return `${SITE_ORIGIN}${page.image.path}${imageVersion ? `?v=${imageVersion}` : ''}`;
}

export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/** The page's structured data (D3): WebSite on `/`, CreativeWork elsewhere, `isBasedOn` where the image shows the cat. */
export function jsonLd(page: PageMeta, imageVersion?: string): Record<string, unknown> {
  const organization = { '@type': 'Organization', name: CREATOR.name, url: CREATOR.url };
  const data: Record<string, unknown> =
    page.jsonLd === 'WebSite'
      ? { '@context': 'https://schema.org', '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE_NAME, url: page.canonical, inLanguage: 'en', publisher: organization }
      : {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: page.title,
          url: page.canonical,
          description: page.description,
          image: imageUrl(page, imageVersion),
          inLanguage: 'en',
          creator: organization,
          isPartOf: { '@id': WEBSITE_ID },
        };
  const credit = creditFor(page);
  if (credit) {
    data.isBasedOn = {
      '@type': 'CreativeWork',
      name: CAT_MODEL.name,
      creator: { '@type': 'Person', name: CAT_MODEL.creator },
      license: credit.license,
      url: credit.source,
    };
  }
  return data;
}

const meta = (attr: 'property' | 'name', key: string, value: string) => `<meta ${attr}="${key}" content="${escapeAttr(value)}">`;
const link = (attrs: Record<string, string>) => `<link ${Object.entries(attrs).map(([k, v]) => `${k}="${escapeAttr(v)}"`).join(' ')}>`;

/**
 * Adds the page's metadata to its built HTML. It throws when the source already declares a tag the
 * build adds, when it declares the empty `data:,` icon placeholder, when its description differs from
 * the registry's, or when its head has no single viewport meta. The 404 page gets only `noindex` and
 * the icons.
 */
export function injectHead(html: string, page: PageMeta | NotFoundMeta, options: { imageVersion?: string } = {}): string {
  const label = 'slug' in page ? page.route : page.file;
  const fail = (message: string) => new Error(`${label}: ${message}`);
  const tags = headTags(html);

  const viewports = tags.filter((t) => t.name === 'meta' && t.attrs.name?.toLowerCase() === 'viewport');
  if (viewports.length !== 1) throw fail(`expected exactly one <meta name="viewport">, found ${viewports.length}`);
  const viewport = viewports[0];
  for (const tag of tags) {
    if (isPlaceholder(tag)) throw fail(`the source declares the empty data:, icon placeholder; remove it: the build adds the site's icon`);
    const what = addedByBuild(tag);
    if (what) throw fail(`the source already declares ${what}; the build adds it (src/site/pages.ts)`);
  }

  const icons = ICONS['site' in page ? page.site : 'playground'];
  const block: string[] = [];
  if ('slug' in page) {
    const description = tags.find((t) => t.name === 'meta' && t.attrs.name?.toLowerCase() === 'description')?.attrs.content;
    if (description === undefined) throw fail('the page has no <meta name="description">');
    if (collapse(description) !== collapse(page.description)) {
      throw fail(`its <meta name="description"> differs from the registry's description in src/site/pages.ts`);
    }
    if (page.route === '/') {
      const ownIcon = tags.find(isIcon);
      if (ownIcon && ownIcon.start < viewport.start) throw fail('its own icon comes before the viewport meta, so it would precede /favicon.ico');
      block.push(link({ rel: 'icon', href: FAVICON.href, sizes: FAVICON.sizes }));
    }
    const image = imageUrl(page, options.imageVersion);
    block.push(
      link({ rel: 'canonical', href: page.canonical }),
      meta('property', 'og:type', 'website'),
      meta('property', 'og:site_name', SITE_NAME),
      meta('property', 'og:locale', 'en_US'),
      meta('property', 'og:url', page.canonical),
      meta('property', 'og:title', page.title),
      meta('property', 'og:description', page.description),
      meta('property', 'og:image', image),
      meta('property', 'og:image:width', String(page.image.width)),
      meta('property', 'og:image:height', String(page.image.height)),
      meta('property', 'og:image:type', 'image/png'),
      meta('property', 'og:image:alt', page.image.alt),
      meta('name', 'twitter:card', 'summary_large_image'),
      meta('name', 'twitter:title', page.title),
      meta('name', 'twitter:description', page.description),
      meta('name', 'twitter:image', image),
      meta('name', 'twitter:image:alt', page.image.alt),
    );
  } else {
    block.push(meta('name', 'robots', 'noindex'));
  }
  // A page with no icon of its own (the 4D.OS pages, Wind-Up Empire and the 404 page) gets the site's.
  if (!tags.some(isIcon)) block.push(link({ rel: 'icon', href: icons.svg, type: 'image/svg+xml' }));
  block.push(link({ rel: 'apple-touch-icon', href: icons.appleTouch }));
  if ('slug' in page) block.push(`<script type="application/ld+json">${jsonLdText(jsonLd(page, options.imageVersion))}</script>`);

  const lineStart = html.lastIndexOf('\n', viewport.start) + 1;
  const indent = /^[ \t]*$/.test(html.slice(lineStart, viewport.start)) ? html.slice(lineStart, viewport.start) : '';
  return html.slice(0, viewport.end) + block.map((tag) => `\n${indent}${tag}`).join('') + html.slice(viewport.end);
}
