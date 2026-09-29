# Proposal

## Why

playground.crewtives.com is public, but it barely exists for search engines and link previews. Every page has a title, a description and `lang="en"`. None has a canonical URL, Open Graph or X card tags, or structured data. `/robots.txt`, `/sitemap.xml` and `/favicon.ico` return 404, the six 4D.OS pages and Wind-Up Empire declare an empty `data:,` icon, and an unknown address returns an empty 404 with no way back. A link to a work pasted into a chat or a social post shows no image, so a stranger never sees the work. The launcher's description still calls 4D.OS "A local experiment".

The site is also served on the Worker's default `workers.dev` host, so every page exists at two origins with nothing saying which one is canonical.

## What Changes

- **One page registry.** A new module, `src/site/pages.ts`, is the single source of the metadata of the 10 public pages: route, canonical URL, share title, description, share image with its size and alt text, JSON-LD kind and what the share image's frame shows. A separate entry covers the site's 404 page.
- **Metadata injected at build time.** A Vite plugin, wired into both site configs, adds a canonical link, Open Graph tags, X (`summary_large_image`) card tags, icons and minimal JSON-LD (which names the cat's upstream model with `isBasedOn` wherever the share image shows the cat) to every built page, right after the viewport meta, so that unfurlers that read only the first 32 KiB of a page still find them. No work's source changes. The plugin fails the build when a built page has no registry entry, or when a page's own meta description disagrees with the registry. In the built output it replaces the `data:,` icon placeholders with real icons.
- **Share images made from real frames.** A development-only tool, `tools/capture-og.ts`, writes one 1200×630 PNG per page to `sites/playground/public/og/<slug>.png`, served at `/og/<slug>.png` and referenced with a `?v=` version taken from the image's own hash, so that a re-captured image reaches cards that were already unfurled. The left of each image is a crop of a real capture of the work's live render, copied pixel for pixel with no scaling. The right is a band set in the work's own typefaces with the title, the site name ("4D.OS" too on 4D.OS pages), the "synthetic" mark on synthetic scenes and, wherever the cat is shown, the credit *"Cat" by J-Toastie, CC-BY 3.0* inside the image. Each image has a provenance sidecar and a row in `LICENSES.md`.
- **Site files.** The site gains:
  - `/robots.txt` (everything allowed, plus the sitemap) and `/sitemap.xml` (the 10 canonical URLs), both generated from the registry by the build;
  - `/favicon.ico`, `/apple-touch-icon.png` and SVG icons for the playground and 4D.OS;
  - a 404 page in the museum's visual language, with links back into the site.
- **Hosting.** The Worker answers unknown paths with that 404 page and a 404 status (`not_found_handling: "404-page"`). A `_headers` rule sends `X-Robots-Tag: noindex` on the pages and files served from `workers.dev` hosts, and only there.
- **Copy.** The launcher's meta description stops calling 4D.OS "A local experiment". Tab titles, visible text and the "A local experiment" lines inside the worlds do not change here. The `playground-hub` spec fixes the tab-title format, and the worlds' own copy belongs to a later mobile change.
- **Checks.** Unit tests cover the registry, the plugin, the sitemap and the share images without needing `dist/`, and `tools/audit-site.ts` audits the built output. The museum loops must stay fresh: this change touches no file under any sheet's `sources`.

Production deploy is not part of this change. Shipping the 404 handling, the `_headers` rule and the metadata follows `playground-hub` "Preview before production".

## Capabilities

### New Capabilities
- `site-metadata`: what every public page tells search engines and link previews, and the site files around it. It covers the page registry, canonical URLs, Open Graph and X card tags, JSON-LD, icons, share images made from real frames with their credits and provenance, `robots.txt`, `sitemap.xml`, the 404 page and noindex on the non-canonical host.

### Modified Capabilities
- `playground-hub`: "Playground routes" adds the 404 page for unknown addresses (under `/4d-os/` too) and the site files at the root. "Free typefaces unique to each landing" lets the 404 page share the museum's families, because it is part of the museum's house.
- `public-repository`: "Licenses and credits" extends the cat's credit to every share image that shows the cat. "Layout by site and by layer" adds `src/site/` for the site-wide metadata layer. "No personal or machine-local data" allows one placeholder-only `workers.dev` host pattern in `_headers`, which names no real subdomain or account.

## Impact

- **New code:**
  - `src/site/` (registry, head injection, sitemap, Vite plugin, share-image composition and PNG codec, with their tests);
  - `tools/capture-og.ts` (share images and icon rasters);
  - `tools/audit-site.ts` (audit of the built output).
- **New files:**
  - `sites/playground/public/og/` (10 PNGs, sidecars, `provenance.json`);
  - `sites/playground/public/` `_headers`, `favicon.ico`, `apple-touch-icon.png` and `icon.svg`;
  - `sites/4d-os/public/icon.svg` and `apple-touch-icon.png`;
  - `sites/playground/404.html` and its stylesheet, `src/playground/not-found/not-found.css`;
  - `src/site/og/captures/` (the new source captures of the museum, the landings and the launcher).
- **Edited:**
  - `sites/4d-os/vite.config.ts` and `sites/playground/vite.config.ts` (plugin; the 404 entry);
  - `sites/4d-os/index.html` (meta description only);
  - `deploy/wrangler.jsonc` (`not_found_handling`);
  - `.gitattributes` (`*.ico` as binary);
  - `LICENSES.md`, `README.md` (repository tour and "Deploy your own"), `docs/architecture.md` and a new `docs/site-metadata.md`.
- **Untouched on purpose:** everything under the museum's sheet `sources` (world pages and code, the engine, the launcher code, Bloomscope, `src/playground/shared/`, the packs and the scene equations). Every loop stays fresh, and the pages' visible text and pixels stay identical.
- **Dependencies:** none. Playwright and tsx run through `npx` at pinned versions, like `tools/capture-loops.ts`, and `package.json` does not change.
- **Deployment:** the next deploy publishes the new files and the Worker's 404 handling. It is done later, through the preview step. Real unfurls can only be checked after the production deploy, because the tags point at production URLs.
