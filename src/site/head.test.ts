import { describe, expect, test } from 'vitest';
import { CAT_CREDIT } from '../playground/shared/worlds.ts';
import { injectHead, jsonLdText } from './head.ts';
import { NOT_FOUND, type PageMeta, pageForRoute } from './pages.ts';

const byRoute = (route: string) => pageForRoute(route)!;
const MUSEUM = byRoute('/');
const BLOOMSCOPE = byRoute('/bloomscope/');
const WORLD_A = byRoute('/4d-os/a/');
const WORLD_B = byRoute('/4d-os/b/');

/** The head of sites/4d-os/b/index.html, copied: the placeholder comes after <title> and self-closes. */
const WORLD_B_HTML = `<!doctype html>
<html lang="en" data-world="b">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Plate 4D-002 — 4D.OS</title>
    <link rel="icon" href="data:," />
    <meta name="description" content="Every moment of a moving subject exposed onto one plate: a live 4D reconstruction on a chronophotographic desktop." />
  </head>
  <body></body>
</html>
`;

const OWN_ICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3C/svg%3E" />`;

/** A head shaped like the built museum's: a script, its own icon, then a 60 KB inline <style>. */
function museumHtml(description = MUSEUM.description): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script>
      document.documentElement.classList.add('js'); // <meta property="og:title"> inside a script is not a tag
    </script>
    ${OWN_ICON}
    <title>crewtives playground</title>
    <meta
      name="description"
      content="${description}"
    />
    <style id="museum-vistas">${'.vista{width:1px}'.repeat(3600)}</style>
  </head>
  <body></body>
</html>
`;
}

/** A minimal page with the given head lines after the viewport meta. */
function pageHtml(page: PageMeta, extra = ''): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${extra}
    <meta name="description" content="${page.description.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}" />
  </head>
  <body></body>
</html>
`;
}

const count = (html: string, pattern: RegExp) => html.match(new RegExp(pattern.source, 'g'))?.length ?? 0;
const jsonLdBlock = (html: string) => /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? null;

const OG = ['type', 'site_name', 'locale', 'url', 'title', 'description', 'image', 'image:width', 'image:height', 'image:type', 'image:alt'];
const TWITTER = ['card', 'title', 'description', 'image', 'image:alt'];

describe('injectHead (site-metadata; add-seo-and-sharing D2)', () => {
  test("every tag exactly once, og:* with property= and twitter:* with name=, right after the viewport meta", () => {
    const out = injectHead(WORLD_B_HTML, WORLD_B, { imageVersion: '0123abcd' });
    for (const key of OG) {
      expect(count(out, new RegExp(`<meta property="og:${key}" content="[^"]*">`)), key).toBe(1);
      expect(count(out, new RegExp(`og:${key}"`)), key).toBe(1);
    }
    for (const key of TWITTER) {
      expect(count(out, new RegExp(`<meta name="twitter:${key}" content="[^"]*">`)), key).toBe(1);
      expect(count(out, new RegExp(`twitter:${key}"`)), key).toBe(1);
    }
    expect(count(out, /<link rel="canonical" href="https:\/\/playground\.crewtives\.com\/4d-os\/b\/">/)).toBe(1);
    expect(count(out, /<link rel="apple-touch-icon" href="\/4d-os\/apple-touch-icon\.png">/)).toBe(1);
    expect(count(out, /application\/ld\+json/)).toBe(1);
    expect(out).toContain(`<meta property="og:url" content="${WORLD_B.canonical}">`);
    expect(out).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(out).not.toContain('robots');

    // The block starts right after the viewport meta, indented like it, and ends with the JSON-LD.
    const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    const after = out.slice(out.indexOf(viewport) + viewport.length);
    expect(after.startsWith('\n    <link rel="canonical"')).toBe(true);
    const block = after.slice(0, after.indexOf('\n    <title>'));
    expect(block.trimEnd().endsWith('</script>')).toBe(true);
    // Only the block and the icon differ from the source.
    expect(out.replace(block, '').replace('<link rel="icon" href="/4d-os/icon.svg" type="image/svg+xml">', '<link rel="icon" href="data:," />')).toBe(WORLD_B_HTML);
  });

  test('on a head with a 60 KB <style>, every injected tag comes before it and ends within the first 32 KiB', () => {
    const html = museumHtml();
    expect(html.length).toBeGreaterThan(60_000);
    const out = injectHead(html, MUSEUM, { imageVersion: '0123abcd' });
    const end = out.indexOf('</script>', out.indexOf('application/ld+json')) + '</script>'.length;
    expect(Buffer.byteLength(out.slice(0, end))).toBeLessThanOrEqual(32 * 1024);
    expect(end).toBeLessThan(out.indexOf('<style'));
    // The JSON-LD is the last tag of the block: the page's own script follows it.
    expect(out.slice(end).trimStart().startsWith('<script>')).toBe(true);
  });

  test('attribute values are HTML-escaped, and a description with </script> round-trips through the JSON-LD', () => {
    const description = 'A registry value that tries to close its block: </script><script>alert("x")</script> & then some more text.';
    const page: PageMeta = { ...BLOOMSCOPE, title: 'Quotes " and <angles> & ampersands', description };
    const out = injectHead(pageHtml(page), page);
    expect(out).toContain('<meta property="og:title" content="Quotes &quot; and &lt;angles&gt; &amp; ampersands">');
    expect(out).toContain(
      '<meta name="twitter:description" content="A registry value that tries to close its block: &lt;/script&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; then some more text.">',
    );
    const json = jsonLdBlock(out)!;
    expect(json).toContain('\\u003c/script\\u003e');
    expect(json).not.toContain('</');
    expect(json).not.toMatch(/[<>&]/);
    const data = JSON.parse(json);
    expect(data.description).toBe(description);
    expect(data.name).toBe(page.title);
    expect(jsonLdText({ s: '<&>' })).toBe('{"s":"\\u003c\\u0026\\u003e"}');
  });

  test('the data:, placeholder is replaced in every source form', () => {
    const forms = [
      '<link rel="icon" href="data:," />',
      '<link rel="icon" href="data:,">',
      '<link rel="icon" href="data:,"/>',
      '<link   rel="icon"\n      href="data:,"   />',
      '<link href="data:," rel="icon">',
      "<link rel='icon' href='data:,'>",
    ];
    for (const form of forms) {
      const out = injectHead(pageHtml(WORLD_A, form), WORLD_A);
      expect(out, form).not.toContain('data:,');
      expect(count(out, /<link rel="icon" href="\/4d-os\/icon\.svg" type="image\/svg\+xml">/), form).toBe(1);
      expect(count(out, /rel="icon"/), form).toBe(1);
    }
    const windUp = byRoute('/landings/wind-up-empire/');
    const out = injectHead(pageHtml(windUp, '<link rel="icon" href="data:," />'), windUp);
    expect(out).toContain('<link rel="icon" href="/icon.svg" type="image/svg+xml">');
    expect(out).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  });

  test("a real icon is kept, and on / the favicon link comes before it", () => {
    const out = injectHead(museumHtml(), MUSEUM);
    expect(out).toContain(OWN_ICON);
    const favicon = out.indexOf('<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">');
    expect(favicon).toBeGreaterThan(-1);
    expect(favicon).toBeLessThan(out.indexOf(OWN_ICON));
    expect(count(out, /rel="icon"/)).toBe(2);

    const bloomscope = injectHead(pageHtml(BLOOMSCOPE, OWN_ICON), BLOOMSCOPE);
    expect(bloomscope).toContain(OWN_ICON);
    expect(bloomscope).not.toContain('favicon.ico');
    expect(count(bloomscope, /rel="icon"/)).toBe(1);
  });

  test('image URLs carry ?v= with a version, and no query without one', () => {
    const versioned = injectHead(WORLD_B_HTML, WORLD_B, { imageVersion: '0123abcd' });
    const url = 'https://playground.crewtives.com/og/4d-os-b.png';
    expect(versioned).toContain(`<meta property="og:image" content="${url}?v=0123abcd">`);
    expect(versioned).toContain(`<meta name="twitter:image" content="${url}?v=0123abcd">`);
    expect(JSON.parse(jsonLdBlock(versioned)!).image).toBe(`${url}?v=0123abcd`);
    const plain = injectHead(WORLD_B_HTML, WORLD_B);
    expect(plain).toContain(`<meta property="og:image" content="${url}">`);
    expect(plain).toContain(`<meta name="twitter:image" content="${url}">`);
    expect(plain).not.toContain('?v=');
  });

  test('JSON-LD: WebSite on /, CreativeWork elsewhere, isBasedOn exactly where the image shows the cat', () => {
    const home = JSON.parse(jsonLdBlock(injectHead(museumHtml(), MUSEUM))!);
    expect(home).toMatchObject({ '@type': 'WebSite', name: 'crewtives playground', url: 'https://playground.crewtives.com/' });
    expect(home.publisher).toEqual({ '@type': 'Organization', name: 'crewtives', url: 'https://crewtives.com' });
    expect(home.isBasedOn).toBeUndefined();

    const bloomscope = JSON.parse(jsonLdBlock(injectHead(pageHtml(BLOOMSCOPE), BLOOMSCOPE))!);
    expect(bloomscope).toMatchObject({ '@type': 'CreativeWork', url: BLOOMSCOPE.canonical, inLanguage: 'en' });
    expect(bloomscope.creator).toEqual({ '@type': 'Organization', name: 'crewtives', url: 'https://crewtives.com' });
    expect(bloomscope.isPartOf).toEqual({ '@id': 'https://playground.crewtives.com/#website' });
    for (const key of ['isBasedOn', 'aggregateRating', 'review', 'offers', 'datePublished', 'dateCreated', 'dateModified']) {
      expect(bloomscope[key], key).toBeUndefined();
    }

    const worldA = JSON.parse(jsonLdBlock(injectHead(pageHtml(WORLD_A), WORLD_A))!);
    expect(worldA.isBasedOn).toEqual({
      '@type': 'CreativeWork',
      name: 'Cat',
      creator: { '@type': 'Person', name: 'J-Toastie' },
      license: CAT_CREDIT.license,
      url: CAT_CREDIT.source,
    });
    expect(CAT_CREDIT.license).toBe('https://creativecommons.org/licenses/by/3.0/');
  });

  test('it refuses a source that already declares a tag the build adds, or that disagrees with the registry', () => {
    expect(() => injectHead(pageHtml(WORLD_A, '<meta property="og:title" content="x" />'), WORLD_A)).toThrow(/og:title/);
    expect(() => injectHead(pageHtml(WORLD_A, '<meta name="twitter:card" content="summary" />'), WORLD_A)).toThrow(/twitter:card/);
    expect(() => injectHead(pageHtml(WORLD_A, `<link rel="canonical" href="${WORLD_A.canonical}" />`), WORLD_A)).toThrow(/canonical/);
    expect(() => injectHead(pageHtml(WORLD_A, '<script type="application/ld+json">{}</script>'), WORLD_A)).toThrow(/JSON-LD/);
    expect(() => injectHead(museumHtml(`${MUSEUM.description} Edited.`), MUSEUM)).toThrow(/^\/: .*description/);
    expect(() => injectHead(WORLD_B_HTML.replace(/\s*<meta name="viewport"[^>]*>/, ''), WORLD_B)).toThrow(/viewport/);
    const twoViewports = WORLD_B_HTML.replace('<title>', '<meta name="viewport" content="width=device-width" />\n    <title>');
    expect(() => injectHead(twoViewports, WORLD_B)).toThrow(/found 2/);
    // Whitespace alone is not a difference.
    expect(() => injectHead(museumHtml(MUSEUM.description.replace(/ /g, '\n        ')), MUSEUM)).not.toThrow();
  });

  test('the 404 page gets only noindex and the icons', () => {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${NOT_FOUND.title}</title>
    <meta name="description" content="There is no page at this address." />
  </head>
  <body></body>
</html>
`;
    const out = injectHead(html, NOT_FOUND);
    const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    expect(out).toBe(
      html.replace(
        viewport,
        `${viewport}
    <meta name="robots" content="noindex">
    <link rel="icon" href="/icon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
      ),
    );
  });
});
