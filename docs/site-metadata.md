# Site metadata

This guide covers what every public page of [playground.crewtives.com](https://playground.crewtives.com/)
tells search engines and link previews, and the files around it: the canonical URL, the Open Graph
and X card tags, the structured data, the icons, the share images, `robots.txt`, `sitemap.xml`, the
404 page and the `noindex` header on the Worker's own Cloudflare hosts.

The behavior is specified in the
[`site-metadata`](../openspec/specs/site-metadata/spec.md) capability, and the reasons behind it are in
the design of the change `add-seo-and-sharing` (decisions D1 to D10), which comments in `src/site/`
cite; the change `adapt-for-phones` (D12 to D14) set the tab titles, tightened the descriptions and
removed the icon placeholders from the sources, and the change `move-cat-credit-out-of-share-images`
(D1 and D2) took the cat's credit out of the share images' band and set where it travels instead.
None of it changes what a page shows or does: the metadata is added to the built HTML, and a page's
source carries only what belongs to the page itself, its tab title and its description.
[`architecture.md`](architecture.md) places this layer among the others.

## The page registry

`src/site/pages.ts` is the only place where the metadata is written by hand. It holds:

- `SITE_ORIGIN` (`https://playground.crewtives.com`), `SITE_NAME` and `CREATOR`. Every canonical URL,
  `og:url`, `og:image`, the sitemap and `robots.txt` are built from `SITE_ORIGIN`, so a copy of the
  site published elsewhere changes that one constant;
- `PAGES`, one entry per public page, in sitemap order;
- `NOT_FOUND`, the 404 page, which is not indexable and has no canonical link, share image or
  structured data;
- `ICONS` and `FAVICON`, the icon files of each site;
- `CAT_MODEL`, the name and author of the cat's upstream model, for the structured data.

Each entry of `PAGES` holds:

| Field | What |
|---|---|
| `slug` | Names the share image, `/og/<slug>.png` |
| `site` | `playground` or `4d-os`: which build makes the page, which decides its icons |
| `route`, `canonical` | The public route with its trailing slash, and `SITE_ORIGIN` + route |
| `title` | The share title (`og:title`, `twitter:title`), 10 to 70 characters. It begins with the page's name as its tab title gives it (the part before the first " · "), and it may say more than the tab title |
| `description` | A copy of the page's own `<meta name="description">`, 50 to 160 characters, so that search results show it whole |
| `image` | Path, 1200 × 630, and the alt text (40 to 420 characters), which describes the frame and the band and names the cat's credit when the frame shows the cat |
| `jsonLd` | `WebSite` on `/`, `CreativeWork` elsewhere |
| `frameShows` | The 4D.OS worlds the share image's frame shows |
| `syntheticFrame` | Optional: the frame shows a synthetic scene of the page's own, not a world, which the page itself labels "Synthetic scene" (only Game Center's Rain Run) |

**The description is written twice on purpose.** Most pages are sources of a museum sheet, whose
HTML cannot change without marking the sheet's loops stale, so the page keeps its own tag. The
registry keeps a copy so that the tests and the audit can check it without parsing HTML. The build
fails, naming the page, when the two differ after whitespace is collapsed, so a description is always
edited in the page and in `src/site/pages.ts` in the same commit. A change that edits a world's page
this way records that sheet's loop again, with every frame unchanged (`site-metadata`, "Metadata
leaves the works as they are").

**"Synthetic" and the cat's credit are never decided by hand.** `isSynthetic(page)` and
`creditFor(page)` read them from `WORLDS` in `src/playground/shared/worlds.ts`, through the worlds in
`frameShows`. A frame that shows world A, B or C in any form (a live view, a still, a poster) shows
the cat, so the credit travels with its share image: in the alt text, the structured data, the
image's sidecar and `provenance.json`, never in the band. The one synthetic frame
that is not a world, Rain Run on Game Center's cabinet, is declared with `syntheticFrame`, and a test
requires the page's own HTML to label it "Synthetic scene", so the mark still follows the page.

### Adding a page

1. Add the page's HTML entry to its site config, with its own `<meta name="description">` and a tab
   title that follows [the rule](#tab-titles).
2. Add its entry to `PAGES` and its slug to the `Slug` type, with a description equal to the page's.
3. Add its card to `src/site/og/cards.ts`, take its capture if it needs a new one, and compose its
   share image (see [Share images](#share-images)). Give the image a row in `LICENSES.md`.
4. Run `npm test`: `src/site/pages.test.ts` requires the registry to match the entry pages of both
   site configs, so a page left out of either fails there. Then build and run the audit.

A build that meets a page with no registry entry fails and names the file.

### Tab titles

A page's `<title>` is part of the page, not of this layer: the build never writes it. It names the page
first and the site after it, so that a search result or a tab says what the page is to a visitor who
has never heard of crewtives:

| Pages | Tab title | Rule in |
|---|---|---|
| `/` | "crewtives playground · a museum of live graphics experiments" | `playground-hub`, "Demo honesty" |
| The landings (Bloomscope, Game Center Yonjigen, Wind-Up Empire) | "<Name> · crewtives playground" | `playground-hub`, "Demo honesty" |
| `/4d-os/` | "4D.OS · crewtives playground" | `site-metadata`, "Tab titles and self-description" |
| `/4d-os/a/` to `/4d-os/e/` | "<World> · 4D.OS · crewtives playground", with the world's name from `WORLDS` in `src/playground/shared/worlds.ts` ("Vitrine", "Plate", "Leader", "The golden stoop", "Whale fall") | `site-metadata`, "Tab titles and self-description" |

The share title in the registry begins with the part of the tab title before the first " · ", for
example "Vitrine · 4D.OS: …" for world A and "crewtives playground: …" for `/`. No code reads a
page's `<title>`: the museum's sheets, their "Enter …" links and the share images take their names from
`src/playground/museum/collection.ts`, `src/playground/shared/worlds.ts` and `src/site/og/cards.ts`.

## The block in each page's head

The plugin `siteMetadata` (`src/site/build/plugin.ts`) is wired into both site configs. For each
built page it finds the registry entry from the build's `base` and the page's path, reads the share
image to get its version, and calls `injectHead` (`src/site/head.ts`). That function writes one
block right after the page's `<meta name="viewport">`. In order:

1. on `/` only, `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">`;
2. `<link rel="canonical">`;
3. eleven Open Graph tags, as `<meta property="og:…">`: `type` (`website`), `site_name`, `locale`
   (`en_US`), `url`, `title`, `description`, `image`, `image:width`, `image:height`, `image:type`
   and `image:alt`;
4. five X tags, as `<meta name="twitter:…">`: `card` (`summary_large_image`), `title`,
   `description`, `image` and `image:alt`;
5. on a page with no icon of its own, the site's SVG icon;
6. the site's `apple-touch-icon`;
7. the JSON-LD block.

**Why right after the viewport meta.** Some link previews read only the start of a page: Slack reads
the first 32 KiB. The built museum carries more than 60 KB of inline styles in its head, so a block
placed before `</head>` would start past what they read on the page shared most. Right after the
viewport meta, the block ends within the first few kilobytes of every page and before its first
`<style>`, script and stylesheet link. `<meta charset>` stays first.

**Why the plugin runs at order `post`.** It runs after Vite has rewritten the page's own scripts and
styles and after the museum plugin (order `pre`) has written the museum's body, so the absolute URLs
it adds are left exactly as written. At order `pre`, Vite would try to resolve the icon URLs as
module assets.

**Escaping.** Attribute values are HTML-escaped. The JSON-LD is written with `JSON.stringify`, then
every `<`, `>` and `&` becomes a JSON Unicode escape (`<`, `>`, `&`), so the block can
never contain `</script>` and `JSON.parse` still gives back the original strings.

**What fails the build.** A page with no registry entry, a head without exactly one viewport meta, a
description that differs from the registry's, a source that declares the empty `data:,` icon
placeholder, or a source that already declares a tag the block adds (a canonical link, an `og:*` or
`twitter:*` tag, an apple-touch-icon, a robots meta or a JSON-LD block). A missing share image does
not fail it: the plugin prints a line that starts with `[site]` and names the file, and the page is
built without a `?v=` version, so that a fresh clone builds before the images exist. The audit does
not accept that output.

### Structured data

- **`/`:** a `WebSite` named "crewtives playground", with its URL, language and the publisher
  crewtives (`https://crewtives.com`).
- **Every other page:** a `CreativeWork` with its share title as name, its canonical URL, its
  description, its share image (the same versioned URL as `og:image`), the language, the creator
  crewtives, and `isPartOf` pointing to the site.
- **Pages whose share image shows the cat** add `isBasedOn`: a `CreativeWork` named "Cat" by the
  `Person` J-Toastie, with the CC-BY 3.0 license URL and the model's page.

There are no dates, ratings, reviews or offers, and no creator other than crewtives and the credited
model. The 404 page has no structured data.

## Icons

| File | Served at | What |
|---|---|---|
| `sites/playground/public/icon.svg` | `/icon.svg` | The museum's mark |
| `sites/playground/public/favicon.ico` | `/favicon.ico` | The same drawing at 16, 32 and 48 px |
| `sites/playground/public/apple-touch-icon.png` | `/apple-touch-icon.png` | The mark at 180 × 180 |
| `sites/4d-os/public/icon.svg` | `/4d-os/icon.svg` | The 4D.OS mark |
| `sites/4d-os/public/apple-touch-icon.png` | `/4d-os/apple-touch-icon.png` | The 4D.OS mark at 180 × 180 |

The rasters are rendered from the two SVGs by `tools/capture-og.ts icons`. Pages that draw their own
icon (the museum, Bloomscope, Game Center Yonjigen) keep it; `/` also declares `/favicon.ico` before
it, because crawlers look for a raster icon on the home page. For Google Search, the icon meant is
the 180 × 180 apple-touch-icon.

The six 4D.OS pages, Wind-Up Empire and the 404 page declare no icon of their own, so the plugin
writes the site's SVG icon into their block: `/4d-os/icon.svg` on the 4D.OS pages and `/icon.svg` on
the others. A source never writes that link itself, because a page's own icon is kept next to the one
the build adds.

**No empty icon placeholder.** Those pages used to declare `<link rel="icon" href="data:,">`, an empty
icon that only stopped the browser from requesting `/favicon.ico`, and the plugin replaced it. The
placeholders left the sources in `adapt-for-phones` (D14), and the plugin now fails the build, naming
the page, when a source declares one in any spelling; the audit also rejects one left in the output.

## Share images

Each public page has a share image at `/og/<slug>.png`: a lossless PNG of 1200 × 630 pixels,
at most 300 KB. Its two regions sit side by side:

- **The frame**, 840 × 630 at the left: a region of a real capture of the page's live render, copied
  pixel for pixel. It is never scaled, re-dithered, filtered or overlaid. A region that would make the
  file too heavy is replaced by another region of the capture, never by a lossy format or a scaled
  copy.
- **The band**, 360 × 630 at the right, beside the frame and never over it. It is set in the page's
  own self-hosted typefaces and colored from the page's own tokens, with a contrast of at least
  4.5:1. It carries the site line ("crewtives playground", with "4D.OS" on the 4D.OS pages), the
  page's short name and the "synthetic" mark when the frame shows a synthetic scene. It does not
  carry the cat's credit, even when the frame shows the cat: the band is a title block, and a credit
  line under the mark weighed it down (`move-cat-credit-out-of-share-images` D1). The credit, *"Cat"
  by J-Toastie, CC-BY 3.0*, travels with each image instead, as CC-BY 3.0 allows it to be given "in
  any reasonable manner": in its page's `og:image:alt`, `twitter:image:alt` and JSON-LD `isBasedOn`,
  in its sidecar and `provenance.json`, in its row in `LICENSES.md`, and on the pages that show the
  cat (D2). The frame keeps whatever the page itself shows, such as the launcher's own credit line.

The composition data (source, region, the worlds the region shows, faces, token references and band
strings) is in `src/site/og/cards.ts`, where the tests can read it:

- Worlds A to E use their existing lossless stills, whose captures are recorded in
  `sites/playground/public/landings/_shared/stills/provenance.json`.
- The museum, Bloomscope, the two landings and the launcher use new captures of the built site, kept
  in `src/site/og/captures/` with their record: viewport, device pixel ratio, reduced motion, the
  controlled clock, the browser version and the renderer.

**Provenance.** Next to each image, `<slug>.png.json` states that the image was not generated and
names its source, its region, its band text and its SHA-256, in the `{ prompt, createdAt }` shape of
the repository's other image sidecars; when the frame shows the cat, it also states the cat's credit,
apart from the band text, and where the credit travels. `sites/playground/public/og/provenance.json`
records the source and its SHA-256, how the capture was made, the region, the band's text, faces and
colors, the credit the frame requires (or none), the tool and its pinned versions, and the image's
SHA-256 and weight. Each image has a row in `LICENSES.md`; the images that show the cat are marked as
derivatives of a CC-BY 3.0 model, and their row says where the credit travels. An image whose bytes
do not change when it is composed again keeps its sidecar's date, and its sidecar and record are
written again from the current inputs.

**The `?v=` version.** The pages name each image as `/og/<slug>.png?v=<version>`, where the version
is the first 8 hex digits of the image's SHA-256, read by the build. Link previews cache images by
URL for days or weeks, so a re-captured image gets a new URL, and a card that is scraped again
fetches it instead of a cached copy. The file keeps its path.

### Making the images

The tool runs Chromium through Playwright at a pinned version, through `npx`, so it adds no
dependency. `capture` needs the built site under `wrangler dev`, at an address passed with `--base`;
`compose` and `icons` need no server. From the repository root:

```sh
rm -rf dist && npm run build && cp deploy/_redirects deploy/.assetsignore dist/
npx wrangler dev -c deploy/wrangler.jsonc   # in another terminal; it prints its <url>
npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-og.ts capture <slug…|all> --base <url>
npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-og.ts compose [slug…]
npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-og.ts icons
```

Then build again, so that the pages carry the new versions. In `compose`, Chromium draws only the
band; Node copies the frame region and encodes the PNG with `src/site/og/png.ts`, which is what lets a
test prove that the frame was not resampled. Composing again from the same inputs, with the same
browser version on the same platform, writes the same bytes and leaves the sidecars and
`provenance.json` unchanged. Text rasterization differs between operating systems, so another
platform can compose different band pixels; the frame stays exact everywhere. The tool's header
comment lists its options.

## Site files

- **`/robots.txt`** allows every crawler on every path and names the sitemap with an absolute URL.
  The 4D packs are not disallowed: a crawler that renders a world needs what the world fetches.
- **`/sitemap.xml`** lists the canonical URLs of the 10 public pages, in registry order, with no
  `lastmod`: the tree has no truthful modification date per page, and file times or git history are
  not one.

Both are emitted by the playground build from the registry (`src/site/sitemap.ts`), so neither holds a
hand-written copy of the origin or of the page list.

### The 404 page

`sites/playground/404.html` is an empty sheet in the museum's house: a title block with the status as
its number, a line that says there is no page at this address, links to the sheet index, 4D.OS,
Bloomscope and the two landings, "Enter the museum", and an épure with no trail. Its stylesheet,
`src/playground/not-found/not-found.css`, imports only the museum's tokens, which declare the museum's
font faces, so it requests the same font files as the museum. It has no script and no motion, and
every character it shows is in both museum typefaces (it draws no arrow characters, which they lack).
The build gives it `noindex` and the icons, and nothing else.

`deploy/wrangler.jsonc` sets `not_found_handling` to `404-page`: a path the site does not serve gets
the nearest `404.html` with a 404 status. The 4D.OS build has no `404.html`, so `/4d-os/nope` falls
through to the root one, which renders the same at any depth because every URL in it is
root-absolute. `_redirects` are applied first, so `/landings/` keeps its 301.

**The page's own address is an accepted soft 404.** `404.html` is also an ordinary file, so `/404`
serves it with a 200, and `/404.html` redirects there. It carries `noindex` and is not in the sitemap,
so it stays out of the index. `404.html` is the name `not_found_handling` requires.

## The non-canonical host

The Worker is also reachable on its own Cloudflare hosts, which the preview uploads need. So that
those copies stay out of search results, `sites/playground/public/_headers` holds one rule:

```
https://:version.:subdomain.workers.dev/*
  X-Robots-Tag: noindex
```

The host is named only through placeholders, never a real subdomain or account. `:version` matches
one host label, so the rule covers the Worker's default host and its preview hosts; the custom domain
matches no rule. The rule applies to the responses the Worker serves from its files: pages, site
files and images, all 200s. Cloudflare applies `_redirects` before `_headers`, so redirects do not
carry the header, and 404 responses are not required to. The canonical links point to
`SITE_ORIGIN` whatever host serves the page, so they settle the duplicate host even without the
header.

A copy of the site served only from its own Cloudflare subdomain must delete `_headers`, or every one
of its pages gets `noindex` (the README's "Deploy your own" says so).

## Checks

`npm test` covers this layer without a build, reading only repository files:

- `src/site/pages.test.ts`: the slugs, routes and canonicals, the length bounds (descriptions of 50
  to 160 characters), each source's tab title against its rule and the share title led by its name,
  each source passing the build's head checks (`injectHead`) and never calling the site local, each
  description against its page, the credit in the alt texts, the JSON-LD kinds, and that the
  registry equals the entry pages of both site configs plus the 404 page;
- `src/site/head.test.ts`: `injectHead` on fixtures, including the real head of world B, a head with
  60 KB of styles, a description that contains `</script>`, and the placeholder rejected in every
  spelling;
- `src/site/sitemap.test.ts`: the sitemap, `robots.txt`, `_headers`, the 404 page and its glyphs, and
  `not_found_handling`;
- `src/site/og/png.test.ts` and `src/site/og/cards.test.ts`: the PNG codec, the share images (size,
  weight, the frame compared pixel by pixel with its source, the sidecars and provenance), the band
  strings and the icons.

After a build, the audit reads the output:

```sh
npx -y -p tsx@4.23.15 tsx tools/audit-site.ts [dist]
```

It checks every page's tags, their attribute forms and values against the registry; the
description's length (50 to 160 characters) and the tab title's rule, with the share title led by the
page's name; that they end
before the first `<style>` and within the first 32 KiB; the share image each page names (1200 × 630,
at most 300 KB, `?v=` equal to the start of its SHA-256); the icons; the JSON-LD; the absence of
`noindex` and of `data:,` placeholders; the 404 page, `robots.txt`, `sitemap.xml`, `_headers` and the
icon files; and that every built page is in the registry. It prints one line per page and per file,
and exits with 1, listing every problem, when anything is wrong.

Real link previews can only be checked after a production deploy, because the tags point to
production URLs. Platforms that cached a page before it had an image (Facebook, LinkedIn, Slack,
Telegram) need a forced re-scrape of each URL.
