# Design

## Context

See proposal.md (Why). A read-only survey of the tree before this change found:

- **Heads today.** All 10 public pages have `<title>`, `<meta name="description">` (99 to 197 characters) and `lang="en"`. None has a canonical link, `og:*`, `twitter:*` or JSON-LD. Every built head starts with `<meta charset>` and then `<meta name="viewport">`. Nine built heads close before 2 KB, but in the built museum the plugin's inline `<style id="museum-vistas">` pushes `</head>` past byte 65,000.
- **Icons.** The museum, Bloomscope and Game Center Yonjigen draw their own inline SVG icons (`data:image/svg+xml,…`). The six 4D.OS pages and Wind-Up Empire declare `<link rel="icon" href="data:," />`, a placeholder that only stops the browser from requesting `/favicon.ico`. It sits right after the viewport meta on four pages and after `<title>` on worlds B, D and E.
- **Missing files.** There is no `/robots.txt`, `/sitemap.xml` or `/favicon.ico`. `deploy/wrangler.jsonc` sets no `not_found_handling`, so an unknown path gets an empty 404. `workers_dev: true` also serves the whole site on the Worker's `workers.dev` host.
- **Two builds.**
  - `sites/4d-os/vite.config.ts` uses base `/4d-os/`, writes `dist/4d-os/` and has 6 entries.
  - `sites/playground/vite.config.ts` uses base `/`, writes `dist/` without emptying it and has 4 entries. It supports `PLAYGROUND_ONLY` and runs the museum plugin, whose `transformIndexHtml` has order `pre`, plus two build guards.
- **The loops' sources.** `src/playground/museum/collection.ts` lists every sheet's `sources`:
  - the packs;
  - `sites/4d-os/a/` … `e/` HTML and `src/4d-os/worlds/<x>/`;
  - `src/pipeline/scenes/{falconPhi,whaleFall,whaleFallSky,math,random}.ts`;
  - `src/playground/bloomscope`, `sites/playground/bloomscope` and `src/playground/shared`;
  - through `CORE`, `src/engine` and `src/4d-os/launcher` on every sheet.

  Editing any of them marks loops stale. `sites/4d-os/index.html`, `sites/playground/index.html`, the two landing pages, both configs, `tools/`, `deploy/`, `docs/`, `LICENSES.md` and `sites/*/public/` (except `sites/4d-os/public/packs/`) are not sources.
- **Real frames already in the repository.**
  - The stills of worlds A–E are lossless 1200×900 captures. Their PNG sources are `src/pipeline/captures/{a-vitrine,b-plate,c-leader}.png` and `sites/4d-os/public/launcher/{d-golden-stoop,e-whale-fall}.png`, with provenance in `sites/playground/public/landings/_shared/stills/provenance.json`.
  - The loop posters are frame 0 at one pixel per display block (221×221 to 426×219).
- **Tools to reuse.**
  - `src/playground/museum/build/woff2.ts` (`woff2Codepoints`, `woff2Family`) reads a font's character map.
  - `tools/capture-loops.ts` shows the house pattern for a Playwright tool run through `npx` at pinned versions. It also has a private PNG decoder, which is left as it is.
  - `src/playground/shared/png.ts` exports `crc32` and `textChunk`. It is a sheet-004 source, so it may be imported but not edited, moved or split.
  - `src/playground/shared/worlds.ts` holds `WORLDS` (name, route, `synthetic`, `credit`) and `CAT_CREDIT`.
- **Measured weight of a share image.** A 1200×630 test composition was built from each A–E still, next to a flat 360×630 band:

  | Frame | PNG | JPEG q85 |
  |---|---|---|
  | 840×630 crop copied 1:1 | 32 to 131 KB | 118 to 171 KB |
  | Whole still, smoothly downscaled ×0.7 | 306 to 691 KB | 109 to 155 KB |

  The dithered palette compresses very well in a lossless PNG as long as nothing resamples it.

## Goals / Non-Goals

**Goals:**
- Every public page carries complete, correct and non-duplicated sharing and indexing metadata, written in one place.
- A shared link shows a real frame of the work. The cat's credit travels inside the image.
- The pages' visible text and pixels do not change, and every museum loop stays fresh.
- Every rule can be checked: unit tests without `dist/`, plus an audit of the built output.

**Non-Goals:**
- Rewriting tab titles, visible copy or the "A local experiment" lines inside the worlds. The `playground-hub` spec fixes the tab-title format, and the worlds' copy belongs to a later mobile change, which will also clean up the `data:,` placeholders in the world HTML.
- Analytics, search-console setup or submitting the sitemap to search engines.
- Deploying. The change is verified under `wrangler dev`. Production follows `playground-hub` "Preview before production".
- Localized metadata, `hreflang`, or per-sheet URLs such as `/#sheet-002`. Fragments are not separate documents.
- Changing `tools/capture-loops.ts` or its private PNG decoder.
- Better search results. Search engines show the page's `<title>` and usually cut the description at about 155–160 characters; they do not show `og:title`. Five tab titles are under 30 characters (`/` 20, world B 20, world C 14, world D 24, world E 18) and five descriptions are over 160 (`/` 188, Game Center 189, Wind-Up Empire 189, world D 197, world E 180). They stay as they are until the later change that owns `<title>` and the worlds' copy; `verification.md` lists them as pending.

## Decisions

### D1. One page registry in a new build-time layer, `src/site/`

`src/site/pages.ts` is the only hand-written metadata. It exports:

```ts
export const SITE_ORIGIN = 'https://playground.crewtives.com';
export const SITE_NAME = 'crewtives playground';
export const CREATOR = { name: 'crewtives', url: 'https://crewtives.com' } as const;
export const CAT_MODEL = { name: 'Cat', creator: 'J-Toastie' } as const;  // url and license from CAT_CREDIT
export type Slug = 'museum' | 'bloomscope' | 'game-center' | 'wind-up-empire'
  | '4d-os' | '4d-os-a' | '4d-os-b' | '4d-os-c' | '4d-os-d' | '4d-os-e';
export interface PageMeta {
  slug: Slug;
  site: 'playground' | '4d-os';      // which build produces it; decides the icons
  route: string;                      // '/', '/4d-os/a/', … (trailing slash as served)
  canonical: string;                  // SITE_ORIGIN + route
  title: string;                      // og:title / twitter:title, 10–70 characters
  description: string;                // = the page's own meta description, 50–200 characters
  image: { path: `/og/${Slug}.png`; width: 1200; height: 630; alt: string };  // alt 40–420; the build appends ?v= (D2)
  jsonLd: 'WebSite' | 'CreativeWork';
  frameShows: readonly WorldId[];     // 4D.OS worlds visible in the share image's frame (D5)
}
export const PAGES: readonly PageMeta[];               // exactly the 10 routes, in this order
export const NOT_FOUND: { file: '404.html'; title: string };  // noindex, no canonical, no share image
export function pageForRoute(route: string): PageMeta | undefined;
export function isSynthetic(page: PageMeta): boolean;  // from WORLDS[].synthetic
export function creditFor(page: PageMeta): Credit | null;  // CAT_CREDIT when frameShows has a, b or c
```

`WorldId`, `Credit`, `WORLDS` and `CAT_CREDIT` are imported read-only from `src/playground/shared/worlds.ts`, so "synthetic" and the credit are never decided by hand. `CAT_CREDIT` has no separate name and author fields, and `worlds.ts` is a sheet source, so `CAT_MODEL` holds them in `src/site/`; a test requires `CAT_CREDIT.text` to equal `"Cat" by J-Toastie, CC-BY 3.0` built from `CAT_MODEL`, so the two cannot drift. The route, slug and site of each page are fixed by the `site-metadata` spec.

The registry also exports `ICONS` (each site's SVG icon and apple-touch-icon, D4) and `FAVICON` (the `/favicon.ico` link of `/`), so that the head injection and the audit read the icon paths from the same place. Its modules import one another and `worlds.ts` with the `.ts` extension, unlike the extensionless imports of `src/playground/`. The Vite config loader warns about every extensionless import it bundles, and the 4D.OS build, whose config imported only `.ts` paths, printed no such warning before; extensionless imports here were rejected because they would add one to its output.

The share titles are more descriptive than the tab titles and are at most 70 characters, because X and most unfurlers cut around there. Titles on the 4D.OS pages name the world and the series. For example:
- `/`: "crewtives playground: a museum of live graphics experiments";
- `/4d-os/d/`: "The golden stoop · 4D.OS: a falcon diving on a golden spiral".

**The description is written twice on purpose.** The registry repeats each page's `<meta name="description">`, and the plugin (D2) fails the build when the two differ after whitespace is collapsed. Seven of the ten pages are sheet sources whose HTML cannot change here, so the page's own tag stays. The registry needs the text too, so that tests and the audit can check lengths and so that `og:description` does not depend on parsing HTML. The bounds, 50 to 200 characters, admit the longest existing description (world D, 197).

The launcher's description in `sites/4d-os/index.html` is rewritten, together with its registry copy, so that it no longer says "A local experiment". It is the one description this change writes, so it stays within the 160 characters search results usually show, which a test checks. For example (149 characters): "4D.OS: live 4D scenes with every moment drawn at once, in five worlds: a synthetic cat on a stairway in three, and two subjects built from equations."

**Why `src/site/`.** The registry is read by both site configs, by the share-image tool and by the tests. `vitest.config.ts` only runs `src/**/*.test.ts`, so the registry's tests have to live under `src/`. It is not playground code (it describes 4D.OS too) and not 4D.OS code, so it gets its own layer, next to the others. It is added to `public-repository` "Layout by site and by layer": no page's code imports it.

*Alternatives.*
- Hand-writing the tags into each HTML page was rejected: seven pages are sheet sources, so their loops would go stale, and ten copies of the same tags would drift.
- Keeping the registry in `tools/` was rejected: its tests would not run under `npm test`.
- Deriving the description from the page's HTML alone, with no registry copy, was rejected: the tests and the audit would have to parse HTML to check the rules, and the registry would no longer be the one place that holds each page's metadata.

### D2. A build plugin injects the head, at the top, after everything else has run

`src/site/build/plugin.ts` exports `siteMetadata({ siteFiles: boolean })`, a Vite plugin with `apply: 'build'` and `transformIndexHtml` order `post`. It is wired into both site configs, after the museum plugin in the playground config. The playground config passes `siteFiles: true`.

For each built page:

1. **Route.** The plugin maps the page to its public route from the resolved `base` and `ctx.path`: `/a/index.html` under base `/4d-os/` becomes `/4d-os/a/`, and `/404.html` is the 404 page. A page with no registry entry fails the build, naming the file.
2. **Image version.** The plugin reads the page's share image, `sites/playground/public/og/<slug>.png`, and takes the first 8 hex digits of its SHA-256 as the version. When the file is missing, it warns with a line that starts with `[site]`, naming the file, and writes the image URL without a version. The build still succeeds, so a fresh clone or a build made before the images exist works, and the audit (D7) and the build gate (D8), which requires no `[site]` line, catch it.
3. **Head.** It calls the pure function `injectHead(html, page, { imageVersion })` in `src/site/head.ts`, which:
   - throws when the page's source already has a canonical link, an `og:*` or `twitter:*` tag, or a JSON-LD block;
   - throws when the page's meta description differs from the registry's, after whitespace is collapsed;
   - inserts one block right after the page's `<meta name="viewport">` tag, and throws unless there is exactly one. The block holds, in this order: on `/` the `/favicon.ico` link, the canonical link, the Open Graph tags as `<meta property="og:…" content="…">`, the X tags as `<meta name="twitter:…" content="…">`, the apple-touch-icon and the JSON-LD block (D3);
   - HTML-escapes attribute values (`&`, `"`, `<`, `>`);
   - writes the JSON-LD with `JSON.stringify` and then replaces every `<` with `\u003c`, every `>` with `\u003e` and every `&` with `\u0026`. `JSON.parse` gives back the original strings, and the block can never contain `</script>` or any `</`;
   - replaces the `data:,` icon placeholder with the site's SVG icon (D4) and leaves a real icon untouched. The placeholder is matched as a `<link>` tag whose attributes are `rel="icon"` and `href="data:,"`, with any whitespace and an optional closing ` /`, wherever it sits in the head. That covers every source form, including the one after `<title>` on worlds B, D and E.
4. **404 page.** For the 404 page, `injectHead` adds only `<meta name="robots" content="noindex">` and the icons, in the same place.
5. **Site files.** With `siteFiles: true`, `generateBundle` emits `sitemap.xml` from `sitemapXml(PAGES)` and `robots.txt` from `robotsTxt()`, both in `src/site/sitemap.ts` and both built from `SITE_ORIGIN`. A fork that changes the origin changes one constant.

The plugin never checks that every registry entry was built: a `PLAYGROUND_ONLY` build compiles one page and must still work. That coverage is checked by a unit test and the dist audit (D7).

**Why at the top.** Some unfurlers read only the start of a page: Slack reads the first 32 KiB. The built museum's `</head>` is past byte 65,000, so a block before `</head>` would be invisible to them on the page shared most. Right after the viewport meta, the block ends within the first 5 KiB of every page, before the first `<style>`, `<script>` and stylesheet link. The `site-metadata` spec and the audit require it to end within the first 32 KiB and before the first `<style>`. `<meta charset>` stays first, within the first 1024 bytes, as the HTML standard requires.

**Why order `post`.** It runs after Vite has rewritten the page's own scripts and styles and after the museum's body and styles, added at order `pre`, are in place. The absolute `https://…` and root-relative icon URLs the plugin adds are therefore left exactly as written.

**The `data:,` placeholders.** The seven placeholders are replaced only in the built output. Their source HTML stays as it is: six of those pages are sheet sources, and the mobile change will clean up the sources. `docs/site-metadata.md` documents this so that a reader who sees `data:,` in the source knows why.

*Alternatives.*
- Inserting the block before `</head>` was rejected: on `/` it would start after byte 65,000, past what Slack and other byte-capped unfurlers read.
- Injecting the tags at runtime from JavaScript was rejected: most unfurlers and some crawlers do not run scripts.
- Returning `HtmlTagDescriptor`s instead of editing the HTML string was rejected: descriptors cannot replace the placeholder or check what the page already declares.
- Order `pre` was rejected: Vite would then try to resolve the icon URLs as module assets.
- Matching the placeholder as the exact string `<link rel="icon" href="data:,">` was rejected: no source writes it that way, so it would match none of the seven.
- A static `robots.txt` in `public/` was rejected: its sitemap line would be a second, hand-written copy of the origin.

### D3. JSON-LD: `WebSite` on the home page, `CreativeWork` elsewhere

- **`/`:** `{ "@type": "WebSite", "@id": "https://playground.crewtives.com/#website", "name": "crewtives playground", "url": …, "inLanguage": "en", "publisher": { "@type": "Organization", "name": "crewtives", "url": "https://crewtives.com" } }`.
- **The other nine pages:** `{ "@type": "CreativeWork", "name", "url", "description", "image", "inLanguage": "en", "creator": <the same Organization>, "isPartOf": { "@id": "https://playground.crewtives.com/#website" } }`. `image` is the same versioned URL as `og:image`.
- **Pages whose frame shows the cat** (`creditFor(page)` is not null: worlds A, B, C and any other page whose `frameShows` lists them) add the upstream model: `"isBasedOn": { "@type": "CreativeWork", "name": "Cat", "creator": { "@type": "Person", "name": "J-Toastie" }, "license": "https://creativecommons.org/licenses/by/3.0/", "url": "https://poly.pizza/m/8GJbfM8R1A" }`, built from `CAT_MODEL` and `CAT_CREDIT` (D1). Other pages have no `isBasedOn`.

There are no dates, because the only curated dates are the museum's creation dates, which cover only four works. There are no ratings or offers, and no creator other than crewtives and the credited upstream model.

`WebSite` on the home page is what search engines read for the site's name. `CreativeWork` is the most general type that is true of all nine pages: a scene, a toy, a landing, a launcher.

*Alternatives.*
- `SoftwareApplication`, `WebApplication` or `VideoGame` were rejected: they misdescribe a scene, and they invite rich-result validation that expects offers, ratings and operating systems the site does not have.
- `VisualArtwork` was rejected: its properties (`artform`, `artMedium`, physical dimensions) describe physical art.
- No JSON-LD at all was rejected: about 300 bytes per page let a crawler tie the pages to one site and one creator.
- Naming crewtives as the only creator on the cat pages was rejected: those works embed a third-party CC-BY 3.0 model, and `isBasedOn` is the honest, machine-readable form of the credit the pages already show.

### D4. Icons: keep the pages' own marks and fill the placeholders with site icons

The icon files, all served as they are from the sites' `public/` folders:

| File (source) | Served at | What |
|---|---|---|
| `sites/playground/public/icon.svg` | `/icon.svg` | The museum's mark, the same drawing as its inline icon |
| `sites/playground/public/favicon.ico` | `/favicon.ico` | The same drawing at 16, 32 and 48 px (PNG images inside an ICO) |
| `sites/playground/public/apple-touch-icon.png` | `/apple-touch-icon.png` | That mark at 180×180, on an opaque background |
| `sites/4d-os/public/icon.svg` | `/4d-os/icon.svg` | A 4D.OS mark in the launcher's ink and paper |
| `sites/4d-os/public/apple-touch-icon.png` | `/4d-os/apple-touch-icon.png` | That mark at 180×180 |

Where each icon goes:
- **Pages with their own icon** (the museum, Bloomscope, Game Center Yonjigen) keep it. They get the playground's apple-touch-icon.
- **4D.OS pages** get `/4d-os/icon.svg` in place of the placeholder, and the 4D.OS apple-touch-icon.
- **Wind-Up Empire** gets `/icon.svg`. It has no mark of its own, and drawing one is out of scope.
- **The home page** also declares `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">`, because search engines take the site's favicon from the home page and need a crawlable raster file there. It goes in the injected block (D2), before the museum's own inline icon, so the page's drawn icon stays the last candidate; the ICO is the same drawing either way, so the tab shows the same mark whichever one a browser picks.
- **For Google Search**, the icon meant is the 180×180 `/apple-touch-icon.png`: Google accepts `rel="apple-touch-icon"`, recommends an icon larger than 48×48 and does not document `data:` icons. The ICO is the fallback for crawlers that only read `/favicon.ico`.

The SVGs are drawn by hand as small files. The rasters are rendered from those SVGs by the share-image tool's `icons` mode (D5), so that no binary is made by hand.

*Alternatives.*
- One site-wide icon replacing every page's own mark was rejected: the museum, Bloomscope and Game Center already draw marks of their own, and replacing them would change what those tabs show.
- Editing Wind-Up Empire's source to add a new mark was rejected: it is a design task outside this change.
- A separate 96×96 or 192×192 PNG icon on `/` was rejected: the 180×180 apple-touch-icon already gives Google a raster larger than 48×48, and one more file adds nothing a crawler needs.

### D5. Share images: a real frame copied 1:1, and a band set in the work's own typefaces

**Layout.** Each image is 1200×630:
- **Frame:** the 840×630 region at x 0–839. Its pixels come from a real capture of that page's live render, copied one for one.
- **Band:** the 360×630 region at x 840–1199, beside the frame. Its text keeps a margin of at least 32 px. From top to bottom:
  - the site line: "crewtives playground", with "4D.OS" above it on the 4D.OS pages, in the page's text face;
  - the title: the page's short name, in its display face, fitted from 56 px down to 32 px over at most three lines;
  - at the bottom, the "synthetic" mark when `isSynthetic(page)`;
  - at the bottom, the cat's credit, at least 20 px and at most two lines, when `creditFor(page)` returns it.

**The frame is never resampled.** The 840×630 region is 4:3, like the stills, and a 1:1 crop keeps every display block exactly as the work painted it. Measured on the five stills, it also gives the lightest lossless files (32 to 131 KB, see Context). Scaling the frame, even with smoothing, which the honesty rules allow, was measured at 306 to 691 KB and blurs the dither.

**Sources and what each frame shows.** This table is the contract between the registry (`frameShows`, `alt`) and the tool:

| Slug | Source | Region | `frameShows` |
|---|---|---|---|
| `4d-os-a` | `src/pipeline/captures/a-vitrine.png` (1200×900) | 840×630 around the cat on the stairs | `a` |
| `4d-os-b` | `src/pipeline/captures/b-plate.png` | around the staircase of cats | `b` |
| `4d-os-c` | `src/pipeline/captures/c-leader.png` | around the projector gate | `c` |
| `4d-os-d` | `sites/4d-os/public/launcher/d-golden-stoop.png` | around the falcon and the spiral | `d` |
| `4d-os-e` | `sites/4d-os/public/launcher/e-whale-fall.png` | around the whale and the disk | `e` |
| `4d-os` | new capture of `/4d-os/` (booted, clock paused) | the world windows, as many of A, B, C as fit | `a`, `b`, `c` (provisional) |
| `museum` | new capture of `/` with reduced motion | the first screen: the clock and sheet 004 | none |
| `bloomscope` | new capture of `/bloomscope/` with reduced motion | the first screen's pre-exposed kaleidoscope | none |
| `game-center` | new capture of `/landings/game-center/` with reduced motion | the first screen's cabinet | none |
| `wind-up-empire` | new capture of `/landings/wind-up-empire/` with reduced motion | the first screen's tin toys | none |

Existing stills are used wherever they exist, because their provenance is already published. The new captures go to `src/site/og/captures/<slug>.png`, lossless and at the capture's full viewport, next to the composition data that reads them. That folder is under no sheet's `sources`. The capture uses:
- the built site served by `wrangler dev`, as `tools/capture-loops.ts` does, at an address passed with a required `--base <url>`. Unlike `tools/capture-loops.ts`, the tool has no default address, so no local address or port is written into the repository;
- Chromium through Playwright 1.63.0, with software WebGL (SwiftShader), so the capture does not depend on the machine's GPU;
- a viewport of 1440×900 at dpr 1 by default, or narrower when the region needs it (for example, to fit the launcher's three windows);
- Playwright's controlled clock, installed before load at a fixed date;
- reduced motion on the four playground pages, whose first screen is then a still exposure of the live render.

The provenance records the viewport, dpr, reduced motion, clock, browser version and renderer.

A frame that reaches world A, B or C in any form (the museum's index row 001, a landing's demo index, a launcher window) shows the cat, and its `frameShows` must list it.

**Which worlds a frame shows is settled before any image is composed.** The capture step (task 4.3) fixes each region and records the worlds it shows in `src/site/og/cards.ts` (`shows`). Group A then sets the registry's `frameShows` and `alt` from it (task 2.5), and only then does group B compose (task 4.4). `cards.test.ts` requires `shows` to equal `frameShows`. Because `creditFor` and `isSynthetic` drive the band text, the sidecars and the `LICENSES.md` row class, composing before the registry is settled would leave them out of step.

**Typefaces and colors.** Each band uses the page's own self-hosted families, loaded from their files in the repository:

| Pages | Display face | Text face |
|---|---|---|
| Museum | Geologica | Fira Mono |
| Bloomscope | Ultra | Recursive |
| Game Center Yonjigen | Bungee | M PLUS Rounded 1c |
| Wind-Up Empire | Tilt Warp | Sono |
| Launcher | Host Grotesk | Departure Mono |
| World A | Host Grotesk | Departure Mono |
| World B | Bricolage Grotesque | Geist Pixel |
| World C | Big Shoulders Stencil | Archivo |
| World D | Tektur | Jura |
| World E | Science Gothic | Atkinson Hyperlegible Next |

The band's background and ink are named as token references `{ file, name }`, like the museum's passe-partouts. Worlds A–E use the museum's passe-partout token as the background, so the band continues the world's frame. A test requires every character of every band string to be in the character map of the face that draws it (`woff2Codepoints`), and a contrast of at least 4.5:1 between ink and background.

**Composition.** `tools/capture-og.ts` has three modes:
- `capture <slug…>` takes the new source captures;
- `compose [slug…]` composes the images;
- `icons` renders the icon rasters (D4).

In `compose`:
- Chromium only draws the band. The tool loads a page it builds itself, with `@font-face` rules for the repository's font files, and screenshots the 360×630 band element.
- Node does the rest with `src/site/og/png.ts`, a small PNG codec for 8-bit RGB and RGBA without interlacing. It imports `crc32` from `src/playground/shared/png.ts` rather than writing a second one; that file is only read, never edited:
  - it decodes the source capture and the band screenshot;
  - it copies the frame region byte for byte and the band next to it;
  - it encodes the result as truecolor PNG with a fixed filter heuristic and zlib level 9.

Node writing the frame itself is what lets a test prove that it was not resampled. The same inputs, browser version and platform give the same bytes. The tool fails when a band text overflows, a glyph is missing or an image is over 300 KB. An image over budget gets another region, never a lossy format or a scaled copy.

The composition data (source, region, faces, token references, band strings) lives in `src/site/og/cards.ts`, so that the tests can read it. The browser side stays in the tool.

**Where the images live, and their records.** The images go to `sites/playground/public/og/<slug>.png` and are served at `/og/<slug>.png`. The 4D.OS images live there too: they are site-wide files, and the playground build must not write inside `dist/4d-os/`. Each image has:
- **A sidecar `<slug>.png.json`**, in the `{ prompt, createdAt }` shape of `poster.webp.json` and the stills' sidecars. It states that the image was not generated, and gives the source, the region, the band text and the image's SHA-256.
- **An entry in `sites/playground/public/og/provenance.json`.** It holds:
  - the source path and its SHA-256;
  - the capture record, or a pointer to the stills' `provenance.json`;
  - the region;
  - the band text, faces and colors;
  - `synthetic` and `credit`;
  - the tool and its versions, the browser and the platform;
  - the image's SHA-256 and bytes.
- **A row in `LICENSES.md`.** Images that show the cat (`4d-os-a`, `-b`, `-c`, `4d-os`, and any other whose `frameShows` lists A, B or C) are "Derivative of a CC-BY 3.0 model: requires the cat's credit". The others are "Own work, MIT". The rows note that rendered text is an output of the fonts, which the OFL and Apache-2.0 do not restrict. The new source captures and the icons get rows too.

**Re-runs.** When a composed image's bytes equal the file already there, the tool keeps its sidecar, including `createdAt`, and its provenance entry. A re-run with unchanged inputs therefore changes no file. When a work changes and its image is re-captured, the image keeps its path, and its new bytes give it a new `?v=` version in the pages' tags (D2). Facebook, LinkedIn, X, Slack, Discord and Telegram cache images by URL for days to weeks, so the version is what lets a re-scraped card fetch the new image. PNG was chosen over JPEG because, measured, the 1:1 frame compresses better losslessly than JPEG q85 does lossily. All ten images are expected to stay under 300 KB, which is the size WhatsApp is commonly reported to need before it shows a large preview. X (under 5 MB), LinkedIn, Slack, Discord and iMessage all accept a 1200×630 PNG of that weight.

*Alternatives.*
- A frame downscaled from the whole 1200×900 still was rejected: it is two to five times heavier as PNG, or lossy as JPEG, and it softens the dither the works are about.
- Using the loop posters at an integer scale was rejected: none of the ×2 or ×3 sizes fills 840×630 without a large letterbox, and the stills and live captures show the works' own HTML frames, which the posters leave out.
- A band laid over the capture was rejected by the honesty rules.
- Composing the whole image in the browser and taking its PNG was rejected: the frame's pixels could not be proven untouched, and Chromium's PNG encoder writes larger files.
- Unversioned image URLs were rejected: a re-captured image would not reach cards already unfurled. Putting the hash in the file name (`<slug>.<hash>.png`) was rejected too: every re-capture would rename the file, and the fixed path `/og/<slug>.png` is what the sidecars, the provenance and `LICENSES.md` name.

### D6. Site files and the 404 page

- **`robots.txt`** is emitted by the playground build (D2) with `User-agent: *`, `Allow: /` and `Sitemap: ` followed by `SITE_ORIGIN + '/sitemap.xml'`. The 4D packs are not disallowed, because a crawler that renders a world needs what the world fetches.
- **`sitemap.xml`** is emitted by the playground build from the registry (D2). It starts with `<?xml version="1.0" encoding="UTF-8"?>`, has `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, and lists the 10 canonical URLs in registry order, each XML-escaped in a `<loc>` equal to the canonical, without `lastmod`: the tree has no truthful modification date per page, and file times or git history are not used.
- **The 404 page** is a new playground entry:
  - Source: `sites/playground/404.html`, with page key `not-found` for `PLAYGROUND_ONLY`. It builds to `dist/404.html`.
  - Style: a new stylesheet, `src/playground/not-found/not-found.css`, which only `@import`s the museum's `src/playground/museum/tokens.css`. That file already declares the museum's `@font-face` rules, so Vite bundles the same hashed font files the museum requests. No museum CSS is edited, so the museum's fingerprint does not move. The stylesheet sits in the playground layer, not in `src/site/`, because pages never link into `src/site/` (`public-repository` "Layout by site and by layer"). It is under no sheet's `sources`.
  - Content: it reads like an empty sheet. A title block says "Not found" and that there is no page at this address. Every character of its visible text is in the character maps of both museum faces, and it uses no arrow characters such as `←`, which those faces lack; links read as words. Links lead to the museum (`/`), the sheet index (`/#index`, the museum's index section), 4D.OS (`/4d-os/`), Bloomscope and the two landings.
  - It has no JavaScript, and its title is "Not found · crewtives playground". Because base is `/`, every asset URL is root-absolute, so it renders the same at any depth.
  - Layout: one sheet in the museum's measures, with its fillet and zone ticks. The title block carries the status as the sheet number ("404 · Not found"), the explanation, the links as ruled rows and "Enter the museum" as the primary action. Beside it sits an épure with no trail: the ground line and its ticks, "elevation", "plan" and "no trail". On a phone the title block comes first.
  - `not-found.css` has one `@import`, the museum's `tokens.css`. It writes its own rules for the few pieces it draws (bar, fillet and ticks, title block, épure, focus rings) in the museum's measures. Importing the museum's `style.css` was rejected: it would load about 1,300 lines of rules for the clock, the loops and the fold that the page never uses, and any museum edit would then move the 404 page.
  - Its source declares no icon, and `injectHead` adds `/icon.svg` next to `noindex` and the apple-touch-icon. `injectHead` adds the site's SVG icon to any page whose head declares no icon at all, and only the 404 page is in that case. A `data:,` placeholder in the new source was rejected: the placeholder is a workaround of older pages, which the later mobile change removes, and a new page should not add one.
  - Of `playground-hub`, it meets English copy, Accessibility, the typeface rules, No external origins and Limited flashes (it has no motion at all). "Demo honesty" does not apply: that requirement is about the museum and the landings, and the 404 page is neither; it shows no work, no synthetic scene, no library and no model, so there is nothing to label or credit, and the OFL does not require an on-page font credit. "Index reachable" and the rules for sound, reduced motion, color depth, the WebGL2 fallback and the load budget do not apply either, because it has no index, sound, motion or 3D view. Adding the build mark and font credits anyway was rejected: they would make an error page read like a demo, and the museum, one link away, carries them.
- **Hosting.** `deploy/wrangler.jsonc` gets `"assets": { "directory": "../dist", "not_found_handling": "404-page" }`. With that setting, the Worker's static assets serve the nearest `404.html` with a 404 status. The 4D.OS build has no `404.html`, so `/4d-os/nope` falls through to the root `404.html`. `_redirects` rules are applied before the lookup, so `/landings/` keeps its 301.
- **The 404 page's own URL is accepted as a soft 404.** `404.html` is also an ordinary asset, and with the default `html_handling` (`auto-trailing-slash`) `/404.html` redirects with a 307 to `/404`, which serves the 404 page with a 200. Its `noindex` keeps it out of the index and the sitemap does not list it. This is accepted, because `404.html` is the file name `not_found_handling` requires; the hosting checks cover both URLs.
- **Noindex on `workers.dev`.** A `_headers` file sets `X-Robots-Tag: noindex` on any `workers.dev` host of the Worker:

  ```
  https://:version.:subdomain.workers.dev/*
    X-Robots-Tag: noindex
  ```

  Cloudflare's documentation for Workers static assets supports absolute HTTPS URLs with placeholders in `_headers`, and this pattern, with these placeholder names, is its own example. `:version` matches one host label, so it covers the Worker's `<worker>.<subdomain>.workers.dev` host and its preview hosts `<version or alias>-<worker>.<subdomain>.workers.dev`. The custom domain matches no rule. The file lives at `sites/playground/public/_headers`, so every build copies it into `dist/`.
  - **Scope.** `_headers` rules apply to the static-asset responses the Worker serves: the pages, the site files and the images, all 200s. Cloudflare applies `_redirects` before `_headers`, so the 301s and the 307 trailing-slash redirects do not carry the header, and the documentation does not say whether `not_found_handling` 404 responses do. The requirement covers only the 200 responses; redirects and 404s are not required to carry it. Neither is indexable content: a redirect has no body, and a 404 is not indexed.
  - **Public repository.** The pattern names no real subdomain or account, only placeholders. `public-repository` "No personal or machine-local data" is modified to allow exactly this.
  - The canonical links (D2) would handle the duplicate host even without this header.

*Alternatives.*
- A separate `404.html` inside `dist/4d-os/` was rejected: it would add a seventh 4D.OS entry, and one page serves both sites.
- `not_found_handling: "single-page-application"` was rejected: every unknown path would get the museum with a 200.
- `workers_dev: false`, which removes the duplicate host altogether, was rejected: preview uploads (`npm run deploy:preview`, `playground-hub` "Preview before production") are served on the `workers.dev` subdomain, so disabling it would break the preview step.
- Putting `_headers` in `deploy/` next to `_redirects` was rejected: it would have to be added to the `cp` in both deploy scripts of `package.json`, in `tools/capture-loops.ts`'s header and in the documented recipes. A `_headers` missing from those copies fails silently and leaves `workers.dev` indexable.
- A static, hand-written `sitemap.xml` was rejected: it would drift from the registry when a page is added.
- Declaring the museum's two `@font-face` rules again in `not-found.css` was rejected: `tokens.css` already declares all of them, so the copies would be dead duplicates.

### D7. Tests without `dist/`, and a dist audit

Unit tests (Vitest, next to the code, reading only repository files):
- **`src/site/pages.test.ts` (group A):**
  - The registry equals the build inputs of both configs, mapped to routes. The test clears `PLAYGROUND_ONLY` and `PLAYGROUND_OUT` with `vi.stubEnv` before a dynamic `import()` of each config, because the playground config reads them when the module loads, calls the 4D.OS one with `{ command: 'build' }`, and reads `build.rollupOptions.input`.
  - The slugs equal the fixed list.
  - Each canonical equals `SITE_ORIGIN + route`, with HTTPS and a trailing slash.
  - Title, description and alt are within their length bounds; the launcher's description is at most 160 characters.
  - Each description equals the page's source meta description after whitespace is collapsed.
  - The alt contains the credit when `creditFor(page)` returns it.
  - `CAT_CREDIT.text` equals the credit built from `CAT_MODEL`.
  - JSON-LD kinds are right, and the 404 entry exists.
- **`src/site/head.test.ts` (group A):** `injectHead` on HTML fixtures, including one built from the real head of `sites/4d-os/b/index.html` (placeholder after `<title>`, self-closing).
  - It adds every tag exactly once, `og:*` with `property=` and `twitter:*` with `name=`.
  - The block comes right after the viewport meta. On a fixture with a 60 KB `<style>` in `<head>`, every injected tag comes before that `<style>` and ends within the first 32 KiB.
  - It escapes quotes and `<` in attribute values. With a registry description that contains `</script>`, the JSON-LD holds `\u003c/script\u003e`, holds no `</`, and `JSON.parse` of it gives back the original string.
  - It replaces `data:,` in every source form and keeps a real icon. On `/`, the favicon link has `sizes="16x16 32x32 48x48"` and comes before the page's own icon.
  - `og:image` and `twitter:image` carry `?v=` with the version passed in, and no query when none is passed.
  - `isBasedOn` is present exactly when `creditFor(page)` is not null.
  - It throws on a pre-existing `og:` tag, on a pre-existing canonical, on a description mismatch and on a head without exactly one viewport meta.
  - The 404 page gets only noindex and icons.
- **`src/site/sitemap.test.ts` (group A):**
  - `sitemapXml` starts with the XML declaration with UTF-8, has the `urlset` of the sitemaps.org 0.9 namespace, exactly 10 `<loc>`s each equal to a canonical (absolute HTTPS, trailing slash, no fragment), and no `lastmod`.
  - `robotsTxt()` has `User-agent: *`, `Allow: /` and a sitemap line equal to `SITE_ORIGIN + '/sitemap.xml'`.
  - `deploy/wrangler.jsonc`, parsed without its comments, has `not_found_handling: "404-page"`.
  - `_headers` has exactly the one host rule.
  - `sites/playground/404.html` has `lang="en"`, no `<script>`, links to `/` and `/4d-os/`, and every character of its visible text is in the character maps (`woff2Codepoints`) of the museum's Geologica and Fira Mono Latin files.
- **`src/site/og/png.test.ts` (group B):** PNG encode and decode round-trip, including every filter type.
- **`src/site/og/cards.test.ts` (group B):**
  - Each of the 10 PNGs exists, is 1200×630 and weighs at most 300 KB.
  - Its frame region is pixel-identical to the recorded region of its source.
  - The sidecar and `provenance.json` state the image's actual SHA-256, and each source's SHA-256 matches its file.
  - Each card's `shows` equals the registry's `frameShows`.
  - Band strings have every glyph and are printable text. The credit and "synthetic" appear exactly when the registry says so.
  - Ink on background is at least 4.5:1.
  - The icons exist at their sizes: an ICO with 16, 32 and 48; PNGs at 180×180.
  - `LICENSES.md` has a row naming every image.

**`tools/audit-site.ts`** (group A) is run as `npx -y -p tsx@4.23.15 tsx tools/audit-site.ts [dist]` after a build. It reads each built HTML page and checks:
- the tags and values of `site-metadata`: exactly one of each, `og:*` as `property=` and `twitter:*` as `name=`, values equal to the registry;
- that the last injected tag ends within the first 32 KiB of the file and before the first `<style>`;
- that `og:image`, with its `?v=` query stripped, resolves to a file in `dist/og/` at 1200×630 and at most 300 KB, read from the PNG header, and that `v` equals the first 8 hex digits of that file's SHA-256;
- that every icon `href` exists;
- that the JSON-LD parses, has the right `@type`, contains no `</`, and has `isBasedOn` exactly on the pages whose frame shows the cat;
- that `robots.txt`, `sitemap.xml` (declaration, namespace, and URLs equal to the canonicals), `404.html` (noindex, no canonical) and `_headers` are right;
- that no page other than the 404 page has noindex, and that no `data:,` icon remains.

It prints one line per page and exits non-zero on the first page with problems, listing them all. It reads the PNG and ICO headers itself, so it does not depend on group B's code.

*Alternatives.*
- Tests that read `dist/` were rejected: the `public-repository` fresh-clone rule requires `npm test` to pass before any build.
- Running the audit inside `npm run build` was rejected: it would put a second copy of the plugin's rules in the build path. Running it as a named step after the build keeps the build's behavior unchanged.

### D8. Verification gates

Each gate is re-run after every group, and all of them before closing:
1. `npm run typecheck`.
2. `npm test`.
3. `rm -rf dist && npm run build`, with an output that has no line containing `[museum]` and, once task 4.4 has composed the images, no line containing `[site]`. Before that, the only `[site]` lines allowed are the missing-image warnings. The museum plugin prints a `[museum]` line exactly when a sheet's `sourcesHash` differs from the hash in one of its loops' `provenance.json`, so this is the loop-freshness check of record, and it runs from any clone. A `[site]` line means a share image is missing (D2).
4. The sheet sources are untouched: `git diff --name-only main -- <sources>` and `git status --porcelain -- <sources>` print nothing, over the folders listed at the top of `tasks.md`. The second command also catches new untracked files.
5. Fingerprints of the 10 routes at 1440×900, at 390×844 and without JavaScript, compared with the fingerprints taken on this branch before any change, the same way as in `prepare-public-release` D11. That harness is not part of the repository, so this gate cannot be re-run from a fresh clone; `verification.md` records it as a known limitation. The comparison covers visible text, pixels, requests, console errors and, at the two widths, the count of elements per tag name in the whole document. Expected differences, derived from the registry and D2:
   - **Visible text:** none, in all three modes. The harness reads `document.body.innerText`, so nothing in `<head>` can show up as text.
   - **Pixels:** none beyond the harness's usual tolerance for animation noise.
   - **Element counts, per page, at both widths:** `META` +16 (the 11 `og:*` and 5 `twitter:*` tags), `LINK` +2 (canonical and apple-touch-icon), +3 on `/` (plus `/favicon.ico`), and `SCRIPT` +1 (the JSON-LD). Replacing a `data:,` placeholder changes no count. Any other count difference fails the gate.
   - **Requests:** only icon files: `/4d-os/icon.svg` on the six 4D.OS pages, `/icon.svg` on Wind-Up Empire, `/favicon.ico` on `/`, and any apple-touch-icon fetch.
6. `tools/audit-site.ts` on the fresh `dist/`.
7. Under `wrangler dev`, with `deploy/_redirects` and `deploy/.assetsignore` copied into `dist/`:
   - `/nope` and `/4d-os/nope` return 404 with the 404 page's HTML;
   - `/404` returns 200 and `/404.html` a 307 to it, the page carrying `noindex` (D6, accepted soft 404);
   - `/landings/` returns 301;
   - `/robots.txt`, `/sitemap.xml`, `/favicon.ico` and `/og/4d-os-a.png` return 200 with the right content types;
   - `/_headers` is not served as a file;
   - a page requested with the header `Host: playground.crewtives.com` has no `X-Robots-Tag`. A page requested with a made-up `workers.dev` host has one, if the local runtime applies host rules. If it does not, that is written down as verifiable only on the preview host.
8. `openspec validate add-seo-and-sharing --strict`.

*Alternatives.*
- Checking only at the end was rejected: running the loop-freshness and fingerprint gates after each group shows which group broke them.
- A separate script that recomputes every sheet's `sourcesHash` against its loops was rejected as the gate of record: the build's `[museum]` check already does exactly that, and a script outside the repository could not be re-run by a reader.

### D9. Documentation

A new `docs/site-metadata.md` explains:
- the registry, the plugin and why it runs at order `post`;
- the `data:,` placeholders, replaced only in the output;
- the share images, with their layout, sources, typefaces, honesty rules, provenance and how to re-run the tool;
- the site files and the 404 page, with how `/4d-os/nope` resolves;
- the `workers.dev` header and the audit.

`docs/architecture.md` gets:
- `src/site/` in the layout and in the import-rules table;
- the 404 page, the site files and `/og/` in the routes table;
- the plugin in "How a page is built" and "Build guards";
- `not_found_handling` and `_headers` in "Deployment";
- `tools/capture-og.ts` and `tools/audit-site.ts` in "Tools".

The README's repository tour lists `tools/` and `src/`, so it gains the two tools and `src/site/`. Its "Deploy your own" section, which tells forks how to publish on their own domain or `workers.dev` subdomain, gains what this change makes site-specific: change `SITE_ORIGIN` in `src/site/pages.ts` (every canonical, `og:url`, `og:image`, the sitemap and `robots.txt` follow it), and delete `sites/playground/public/_headers` when the fork is served only from `workers.dev`, or every page gets `noindex`. `docs/openspec-workflow.md` gets the new capability and the change's row when it is archived.

*Alternative:* adding a section to `docs/museum.md` was rejected: the metadata covers 4D.OS and the landings too, not only the museum.

### D10. Ownership, so that groups A and B can run in parallel

- **Group A** owns:
  - `src/site/pages.ts`, `head.ts`, `sitemap.ts`, `build/` and their tests;
  - `src/playground/not-found/`;
  - both site configs, `sites/playground/404.html`, `sites/4d-os/index.html` (description only);
  - `sites/playground/public/_headers`;
  - `deploy/wrangler.jsonc`;
  - `tools/audit-site.ts`;
  - `docs/` and `README.md`.
- **Group B** owns:
  - `src/site/og/`, including the new source captures in `src/site/og/captures/`;
  - `tools/capture-og.ts`;
  - `sites/playground/public/og/`;
  - the icon files of D4 (the SVGs and the rasters);
  - the new rows of `LICENSES.md`;
  - `.gitattributes` (the `*.ico binary` line).
- **Group C** edits the files of either group only to reconcile them (task 5.1), after both have finished.

Neither group edits the other's files. The contract between them is D1's `PageMeta` type, the slug list, the paths `/og/<slug>.png` (1200×630 PNG), `<slug>.png.json` and `og/provenance.json`, the version rule of D2 (first 8 hex digits of the PNG's SHA-256), the icon paths of D4, and D5's table.

The order that keeps the band text right:
1. A's registry task (1.1) fixes the type and writes `frameShows` and `alt` from D5's table.
2. B captures and fixes each region (4.3), recording the worlds it shows as `shows` in `src/site/og/cards.ts`.
3. A sets `frameShows` and `alt` from `shows` (2.5). The registry stays A's file; A only reads `cards.ts`.
4. Only then does B compose the images and write their `LICENSES.md` rows (4.4, 4.7).

Group C re-checks the agreement (5.1). If it still finds a mismatch, it fixes the registry, recomposes the affected slugs and corrects their `LICENSES.md` rows before the gates.

The paths that are sheet sources may be read and imported (the worlds' font files and `tokens.css`, `src/playground/shared/worlds.ts` and `png.ts`), but nothing may be written, copied out of, moved or refactored there: no fixture, snapshot or extracted helper.

*Alternatives.*
- One group doing everything in sequence was rejected: the image work (captures, typesetting, weight tuning) is independent of the plugin work and is the longest part.
- Letting C reconcile `frameShows` only after all images were composed was rejected: every change would force B's images, sidecars, provenance and license rows to be redone.

## Risks / Trade-offs

- **[Byte-capped unfurlers]** Slack reads only the first 32 KiB of a page, and the museum's head is over 65 KB. → The block goes right after the viewport meta (D2), and the audit fails if any injected tag ends past 32 KiB or after the first `<style>`.
- **[Square thumbnails]** Some unfurlers crop to a square in small layouts, which can cut the band and the credit. → The full image always carries the credit, the alt text repeats it, and the pages show it. At full size (X, LinkedIn, Slack, Discord, iMessage) the band is whole.
- **[The credit is small at card size]** At 20 px on a 1200-wide image, the credit reads at about 8 px in a 500-px card. → It is legible when the image is opened, and a larger credit would push out the title. The CC-BY requirement is a reasonable, visible attribution, which the image meets.
- **[Cross-platform bytes]** Text rasterization differs between operating systems, so another platform composes different band pixels. → The frame region stays exact everywhere, which the test checks. Byte identity is promised only on the same browser version and platform, which the provenance records, as for the loops.
- **[A share image goes stale when a work changes]** → The new captures and stills are real frames of the work at their capture date, which the provenance records. When a work changes visibly, re-capture with the documented command, as with the loops. The new bytes give the image a new `?v=` version (D2), so a card that is scraped again fetches it instead of a cached copy.
- **[Cached, imageless previews]** The pages were shared before this change without images, and Facebook, LinkedIn, Slack and Telegram cache link previews by page URL. → After the production deploy, each of the 10 URLs is re-scraped by hand (see Migration Plan).
- **[A missing share image only warns]** A build without the images still succeeds (D2). → The build gate requires no `[site]` line, and the audit fails on a missing image or a wrong version.
- **[Two copies of the descriptions]** → The build fails and names the page if a copy drifts, so drift cannot ship.
- **[Search titles and snippets stay weak]** Search engines show `<title>`, not `og:title`, and cut long descriptions. → Out of scope here (Non-Goals); `verification.md` lists the affected pages as pending for the change that owns `<title>`.
- **[The `_headers` host rule cannot be fully proven locally]** → The Cloudflare documentation gives this exact pattern, the custom-domain negative is checked locally, and the positive, on a page, is checked on the preview host at the next deploy. Redirects and 404s are outside the requirement (D6).
- **[The 404 page's own URL answers 200]** `/404` serves the 404 page with a 200. → Accepted (D6): it carries `noindex` and is not in the sitemap.
- **[Crawlers fetch large packs while rendering 4D.OS]** → Accepted: blocking them would break rendering for indexing. The packs are unchanged and already served.
- **[The icon placeholders stay in the source HTML]** → Documented in `docs/site-metadata.md`, and the audit ensures none reaches the output. The later mobile change will clean up the sources.
- **[A fork served from `workers.dev`]** With `_headers` and `SITE_ORIGIN` left as they are, a fork's pages would be `noindex` and point to this site. → The README's "Deploy your own" says what to change (D9).

## Migration Plan

1. Implement groups A and B, then C's gates. All of it is local, on this branch.
2. Deploy is outside this change. When the owner publishes, the preview deploy (`npm run deploy:preview`) comes first, following `playground-hub` "Preview before production". A preview cannot show a real unfurl: `og:url` and `og:image` are production URLs, the images do not exist in production yet, and Facebook and LinkedIn re-scrape the `og:url` target. So on the preview host, check only what it serves:
   - the headers: `X-Robots-Tag: noindex` on pages, none on the custom domain;
   - the 404 handling;
   - the served HTML, with `curl` and an offline Open Graph parser run on it.

   Production comes after approval.
3. After the production deploy, check real unfurls of the 10 URLs: the X post composer (X's Card Validator no longer shows a preview), Slack, Discord, WhatsApp, iMessage, Telegram, LinkedIn Post Inspector and Facebook Sharing Debugger. Force a re-scrape of each URL where the platform allows it ("Scrape Again" in the Sharing Debugger, the Post Inspector, Telegram's @WebpageBot), because the imageless previews of before are cached.
4. Rollback: redeploy the previous version. No data or URL changes, so rollback is complete.

## Open Questions

- Exact wording of the 10 share titles and alt texts within the bounds of D1. These are settled while writing the registry (tasks 1.1 and 2.5) and do not change the specs.
- The exact frame region of each new capture. It is settled in task 4.3 and recorded in `cards.ts` and the provenance. If it changes which worlds a frame shows, task 2.5 updates the registry before any image is composed.
