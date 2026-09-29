# Tasks

Owner groups (design D10):
- **(A)** metadata, plugin, site files, tests and docs;
- **(B)** the share-image tool, the images, the icons, their sidecars, the `LICENSES.md` rows and the `.gitattributes` line;
- **(C)** integration gates;
- **(D)** closing.

A and B run in parallel once task 1.1 is done, and neither edits the other's files. They meet once: B's capture task 4.3 comes before A's task 2.5, which comes before B's compose task 4.4 (design D10). C runs after A and B, and D after C. Until task 4.4 has composed the images, builds print a `[site]` warning per missing image; the gates that forbid `[site]` lines (5.2) apply after it.

Throughout the change, no file may be created, edited or deleted under any sheet's `sources` (`src/playground/museum/collection.ts`). That covers:
- `sites/4d-os/a/` … `e/` and `src/4d-os/worlds/`;
- `src/engine/` and `src/4d-os/launcher/`;
- `src/playground/bloomscope/`, `sites/playground/bloomscope/` and `src/playground/shared/`;
- `sites/4d-os/public/packs/` and `src/pipeline/scenes/`.

Reading and importing from them is allowed: the font files under `src/4d-os/worlds/*/fonts/`, the tokens in `src/4d-os/worlds/*/tokens.css`, and modules such as `src/playground/shared/worlds.ts` and `src/playground/shared/png.ts`. Copying, moving or refactoring them is not (for example, `crc32` is imported from `src/playground/shared/png.ts`, never extracted into a common module), and nothing, including test fixtures or snapshots, is written into those folders.

## 1. Registry and head injection

- [x] 1.1 (A) Create `src/site/pages.ts` with the exports of design D1:
  - `SITE_ORIGIN`, `SITE_NAME`, `CREATOR` and `CAT_MODEL`;
  - the `Slug` and `PageMeta` types;
  - `PAGES` for the 10 routes, with titles, descriptions, `frameShows` and alt texts from design D5's table;
  - `NOT_FOUND`, `pageForRoute`, `isSynthetic` and `creditFor`.

  In the same task, rewrite the launcher's `<meta name="description">` in `sites/4d-os/index.html` and its registry copy, in at most 160 characters, so that neither says "local experiment". Verify with `npm run typecheck`, and `grep -n "local experiment" sites/4d-os/index.html src/site/pages.ts` printing nothing.
- [x] 1.2 (A) Write `src/site/pages.test.ts` without the build-input check, which comes in 2.4. It checks:
  - the slugs equal the fixed list;
  - each canonical equals `SITE_ORIGIN + route` (HTTPS, trailing slash);
  - titles are 10–70 characters, descriptions 50–200 and alt texts 40–420, and the launcher's description at most 160;
  - each description equals the page's source meta description after whitespace is collapsed;
  - each alt contains `CAT_CREDIT.text` exactly when `creditFor` returns it;
  - `CAT_CREDIT.text` equals `"Cat" by J-Toastie, CC-BY 3.0` built from `CAT_MODEL`;
  - `/` is `WebSite` and the rest `CreativeWork`;
  - the 404 entry exists.

  Verify with `npx vitest run src/site/pages.test.ts`, which passes.
- [x] 1.3 (A) Implement `injectHead(html, page, { imageVersion })` in `src/site/head.ts` (design D2):
  - one block right after the single `<meta name="viewport">`, throwing unless there is exactly one;
  - `og:*` as `<meta property>` and `twitter:*` as `<meta name>`;
  - attribute values HTML-escaped (`&`, `"`, `<`, `>`);
  - JSON-LD from `JSON.stringify`, then every `<` written as `\u003c`, every `>` as `\u003e` and every `&` as `\u0026`;
  - `isBasedOn` from `CAT_MODEL` and `CAT_CREDIT` exactly when `creditFor(page)` is not null (design D3);
  - the image URLs with `?v=<imageVersion>`, or no query when no version is given;
  - the `data:,` placeholder matched as a `<link>` tag with `rel="icon"` and `href="data:,"`, any whitespace and an optional ` /`, and replaced;
  - on `/`, `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">` in the block, before the page's own icon;
  - noindex and icons only for the 404 page;
  - throwing on existing tags or a description mismatch.

  Write `src/site/head.test.ts` with HTML fixtures, one of them copied from the head of `sites/4d-os/b/index.html` (placeholder after `<title>`, self-closing), for:
  - every tag exactly once, in its attribute form;
  - a fixture with a 60 KB `<style>` in `<head>`: every injected tag comes before it and ends within the first 32 KiB;
  - quotes and `<` in attribute values;
  - a description containing `</script>`: the JSON-LD holds `\u003c/script\u003e`, holds no `</`, and `JSON.parse` of it gives back the original description;
  - the placeholder replaced in every source form and a real icon kept, with the favicon link before it on `/`;
  - `?v=` present with a version and absent without;
  - `isBasedOn` on a cat page and not on Bloomscope;
  - a throw on a pre-existing `og:title`, on a pre-existing canonical, on a changed description and on a missing viewport meta;
  - the 404 fixture getting only noindex and icons.

  Verify with `npx vitest run src/site/head.test.ts`.
- [x] 1.4 (A) Implement `sitemapXml(pages)` and `robotsTxt()` in `src/site/sitemap.ts`, both built from `SITE_ORIGIN`: the sitemap has the XML declaration with UTF-8, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, 10 XML-escaped `<url><loc>` in registry order and no `lastmod`; `robots.txt` has `User-agent: *`, `Allow: /` and `Sitemap: ` + `SITE_ORIGIN + '/sitemap.xml'`. Start `src/site/sitemap.test.ts` with those checks: declaration, namespace, each `<loc>` exactly equal to a canonical (absolute HTTPS, trailing slash, no fragment), exactly 10, no `lastmod`, no 404, and the robots sitemap line. Verify with `npx vitest run src/site/sitemap.test.ts`.

## 2. Plugin, site files and the 404 page

- [x] 2.1 (A) Implement `siteMetadata({ siteFiles })` in `src/site/build/plugin.ts` (design D2). It has `apply: 'build'` and `transformIndexHtml` at order `post`, maps pages to routes from `base` and `ctx.path`, fails on an unregistered page, reads each share image to get its version (warning with a `[site]` line and no version when the file is missing), calls `injectHead`, and emits `sitemap.xml` and `robots.txt` when `siteFiles` is true. Wire it into `sites/4d-os/vite.config.ts`, and into `sites/playground/vite.config.ts` after `museumPlugin` with `siteFiles: true`. Verify all five:
  - `rm -rf dist && npm run build` succeeds, with no line containing `[museum]`. Until group B's images exist it prints one `[site]` line per missing image, naming it;
  - `grep -c 'rel="canonical"' dist/index.html dist/4d-os/a/index.html` prints 1 for each;
  - `head -c 32768 dist/index.html | grep -c 'application/ld+json'` prints 1 (the JSON-LD is the last tag of the block);
  - `PLAYGROUND_ONLY=museum PLAYGROUND_OUT=<temp dir> npx vite build -c sites/playground/vite.config.ts` succeeds;
  - a temporary unregistered entry fails the build with its path named. Revert that entry after the check.
- [x] 2.2 (A) Add `sites/playground/public/_headers` with the single rule of design D6, `https://:version.:subdomain.workers.dev/*` with `X-Robots-Tag: noindex`. Extend `src/site/sitemap.test.ts` to read it. Verify with `npx vitest run src/site/sitemap.test.ts`, and check that `dist/_headers`, `dist/robots.txt` and `dist/sitemap.xml` exist after `npm run build`.
- [x] 2.3 (A) Build the 404 page (design D6):
  - `sites/playground/404.html`: `lang="en"`, title "Not found · crewtives playground", a meta description, no script, no arrow characters, and links to `/`, `/#index`, `/4d-os/`, `/bloomscope/`, `/landings/game-center/` and `/landings/wind-up-empire/`;
  - `src/playground/not-found/not-found.css` (the playground layer, because the page is part of the museum's house and no page may link into `src/site/`), which only `@import`s `src/playground/museum/tokens.css`; that file already declares the museum's font faces. No museum file is edited;
  - the `not-found` entry in `sites/playground/vite.config.ts` (it also works with `PLAYGROUND_ONLY=not-found`);
  - `"not_found_handling": "404-page"` under `assets` in `deploy/wrangler.jsonc`.

  Add the 404 checks to `src/site/sitemap.test.ts`, including that every character of the page's visible text is in the character maps (`woff2Codepoints`) of the museum's Geologica and Fira Mono Latin files, and the `wrangler.jsonc` check. Verify with `npm test`, with `dist/404.html` existing after `npm run build` with `noindex` and only root-absolute asset URLs (`grep -o 'href="[^"]*"' dist/404.html`), and with an axe or manual check at 390 px (no horizontal scroll, contrast at least 4.5:1, visible focus).
- [x] 2.4 (A) Add the build-input check to `src/site/pages.test.ts`. It clears `PLAYGROUND_ONLY` and `PLAYGROUND_OUT` with `vi.stubEnv` before a dynamic `import()` of each site config, because the playground config reads them when the module loads. It calls the 4D.OS config with `{ command: 'build', mode: 'production' }`, maps every `build.rollupOptions.input` file to its public route, and requires exactly the 10 registry routes plus `404.html`. Verify with `npm test`, and with `PLAYGROUND_ONLY=museum npm test`, which also passes. Then add a temporary entry to a config and check that the test fails and names it. Revert the entry after the check.
- [x] 2.5 (A, after 4.3) Set `frameShows` and `image.alt` in `src/site/pages.ts` from the worlds each final region shows, as task 4.3 recorded them in `src/site/og/cards.ts` (`shows`), keeping each alt within 40–420 characters and naming the cat's credit where `creditFor` now returns it. Tell group B when it is done: task 4.4 waits for it. Verify with `npx vitest run src/site/pages.test.ts src/site/og/cards.test.ts`, where the check that `shows` equals `frameShows` now passes for all 10 slugs.

## 3. Dist audit and documentation

- [x] 3.1 (A) Write `tools/audit-site.ts` (design D7). Its header comment gives the usage: `npx -y -p tsx@4.23.15 tsx tools/audit-site.ts [dist]`. It reads PNG and ICO headers itself, with no import from `src/site/og/`, strips the `?v=` query before resolving an image and checks the version against the file's SHA-256, checks the attribute forms, the 32 KiB and first-`<style>` position, `isBasedOn`, and the sitemap's declaration and namespace. It prints one line per page and exits non-zero listing every problem. Verify with `npm run typecheck`. Then run it on a copy of `dist/` with one `og/*.png` removed, one page's canonical deleted and one `og:title` rewritten as `name="og:title"`: it exits non-zero and names all three. A full pass is checked in 5.4, once group B's images exist.
- [x] 3.2 (A) Write `docs/site-metadata.md` (design D9):
  - the registry and how to add a page;
  - the plugin, where it puts the block and why, and why it runs at order `post`;
  - the `data:,` placeholders, replaced only in the output;
  - the share images, from design D5: layout, sources, typefaces, honesty rules, provenance, the `?v=` version and the `tools/capture-og.ts` commands with a `<url>` placeholder for the server;
  - the site files, the 404 page, how `/4d-os/nope` resolves and the accepted `/404` soft 404;
  - the `workers.dev` header, its scope, and the audit command.

  Verify that every repository path the page names exists: ``grep -oE '`[A-Za-z0-9_./-]+/[A-Za-z0-9_./-]*`' docs/site-metadata.md`` against `ls`, rechecked in 5.7.
- [x] 3.3 (A) Update `docs/architecture.md`:
  - `src/site/` in "Layout" and in the import-rules table, with a grep check that nothing outside `src/site/`, the site configs and `tools/` imports it;
  - `/404.html`, `/robots.txt`, `/sitemap.xml`, `/og/` and the icons in "Routes and redirects" and in the output tree;
  - the plugin in "How a page is built" and "Build guards", with its `[site]` warning;
  - `not_found_handling` and `_headers` in "Deployment";
  - `capture-og.ts` and `audit-site.ts` in "Tools";
  - a link to `docs/site-metadata.md`.

  Verify that the new import grep prints nothing and that every added path exists.
- [x] 3.4 (A) Update the README:
  - the repository tour: `tools/` lists `capture-og.ts` and `audit-site.ts`, and `src/` mentions `src/site/` with its share-image captures;
  - "Deploy your own", next to the existing fork notes: change `SITE_ORIGIN` in `src/site/pages.ts` (canonicals, `og:url`, `og:image`, the sitemap and `robots.txt` all follow it), and delete `sites/playground/public/_headers` when the fork is served only from its `workers.dev` subdomain, or every page gets `noindex`.

  Verify that every file the tour and the deploy section name exists (`public-repository` "Reading order"), and that `grep -n "SITE_ORIGIN\|_headers" README.md` shows both notes.

## 4. Share images and icons

- [x] 4.1 (B) Implement `src/site/og/png.ts`, a PNG decoder and encoder for 8-bit RGB and RGBA without interlacing: it decodes every filter type and encodes with a fixed per-row filter heuristic at zlib level 9, importing `crc32` from `src/playground/shared/png.ts`. Write `src/site/og/png.test.ts` (round-trip, filter types, IHDR size). Verify with `npx vitest run src/site/og/png.test.ts`, and `git status --porcelain src/playground/shared` printing nothing. This task can start before 1.1.
- [x] 4.2 (B, after 1.1) Write `src/site/og/cards.ts`, the composition data of design D5 for the 10 slugs:
  - source path;
  - frame region, and `shows`, the worlds the region shows (from D5's table until 4.3 settles it);
  - display and text faces, as font file paths;
  - band background and ink, as token references `{ file, name }`;
  - band strings: site line, title, "synthetic" from `isSynthetic`, credit from `creditFor`.

  Add a token reader that accepts any `--name: #hex` declaration in a file. Verify with `npm run typecheck`, and a first `src/site/og/cards.test.ts` that checks:
  - every source and font file exists;
  - every band character is in its face (`woff2Codepoints` from `src/playground/museum/build/woff2.ts`);
  - ink on background is at least 4.5:1.
- [x] 4.3 (B) Write `tools/capture-og.ts` with the `capture <slug…>` mode. It uses Playwright 1.63.0 and tsx 4.23.15 through `npx` (refusing any other Playwright version), SwiftShader flags, the built site under `wrangler dev` at a required `--base <url>` with no default, a controlled clock at a fixed date, and reduced motion for the four playground pages. Its header documents the command with `<url>` as a placeholder. It writes `src/site/og/captures/<slug>.png` for `museum`, `bloomscope`, `game-center`, `wind-up-empire` and `4d-os`, and records viewport, dpr, reduced motion, clock, browser version and renderer. Pick each frame region by looking at the capture, and write the region and the worlds it shows (`shows`) into `src/site/og/cards.ts`. Add to `cards.test.ts` the check that each card's `shows` equals the registry's `frameShows`; it may fail until task 2.5. Tell group A when this is done. Verify that:
  - the five PNGs exist;
  - capturing one page twice gives identical bytes (`shasum -a 256`). If it does not, record the difference in the task and keep the capture that was reviewed;
  - `grep -nE "127\.0\.0\.1|localhost|:[0-9]{4}/" tools/capture-og.ts` prints nothing.

  Recorded: museum, Bloomscope, Game Center and the launcher gave identical bytes on every re-capture. Wind-Up Empire differed in 2 runs of 7 (both the first run after a change of viewport) by 4 pixels of the header's TIN counter (y 53–69), outside its frame region (y 71–700); the reviewed capture was kept. Each card's `depicts` says what its final region shows, for the alt texts of task 2.5: the museum's frame is its whole first screen at 840×630 (bar, clock, sheet 004's loop), without the épure or the title block.
- [x] 4.4 (B, after 2.5) Add the `compose [slug…]` mode (design D5): Chromium draws only the band, then Node copies the frame region and encodes with `src/site/og/png.ts`. It writes `sites/playground/public/og/<slug>.png`, `<slug>.png.json` (`{ prompt, createdAt }`) and `provenance.json`. It fails on overflow, a missing glyph or more than 300 KB. It keeps a sidecar and its provenance entry when the image's bytes are unchanged. Compose all 10. Verify that:
  - `ls -l sites/playground/public/og/*.png` shows 10 files, each at most 300 KB;
  - `shasum -a 256 sites/playground/public/og/*` gives the same output before and after a second `compose` (the files are untracked, so `git status` alone would prove nothing);
  - each image looks right when viewed: the frame is untouched, the band is legible, and the credit and mark are present where required.

  Recorded: weights 37,961 B (`4d-os-a`) to 173,794 B (`4d-os-b`); the 21 files of the folder hash the same after a second `compose`. Each image was viewed at 1200, 600 and 300 px wide.
- [x] 4.5 (B) Draw `sites/playground/public/icon.svg`, the museum's mark (the same drawing as the museum's inline icon), and `sites/4d-os/public/icon.svg`, a 4D.OS mark in the launcher's ink and paper. Add the `icons` mode, which renders `favicon.ico` (16, 32 and 48 as PNG entries of the same drawing), the playground's `apple-touch-icon.png` (180×180) and the 4D.OS `apple-touch-icon.png` (180×180). Add `*.ico binary` to `.gitattributes`, next to the other binary types. Verify by reading the file headers: the ICO has three entries of 16, 32 and 48, and the PNGs are 180×180; `git check-attr binary -- sites/playground/public/favicon.ico` prints `set`. Then check that `npm run build` copies them to `dist/`, `dist/4d-os/icon.svg` and `dist/4d-os/apple-touch-icon.png`, and that the "4D.OS untouched" comparison of `playground-hub` still holds, since the icons come from the 4D.OS build itself.
- [x] 4.6 (B) Complete `src/site/og/cards.test.ts`. It checks:
  - 10 PNGs at 1200×630, each at most 300 KB;
  - the frame region pixel-identical to the recorded region of the decoded source;
  - the SHA-256 in each sidecar and in `provenance.json` equal to the file's;
  - each source's SHA-256 equal to the recorded one;
  - each card's `shows` equal to the registry's `frameShows`;
  - the credit and "synthetic" in the band strings exactly when `creditFor` and `isSynthetic` say so;
  - the icon sizes;
  - a `LICENSES.md` row naming each image.

  Verify with `npm test`.
- [x] 4.7 (B) Add rows to `LICENSES.md`, "Generated data":
  - one row per share image, or grouped rows that name each file. Images whose frame shows A, B or C are "Derivative of a CC-BY 3.0 model: requires the cat's credit", with the credit inside the image. The others are "Own work, MIT". The rows note that rendered text is an output of the fonts, which the OFL and Apache-2.0 do not restrict;
  - the new source captures in `src/site/og/captures/`, with the same rule for those that show the cat;
  - the icons.

  Add a line to "Checks" naming `cards.test.ts`. Verify with `npm test`, which now includes the `LICENSES.md` check from 4.6.

## 5. Integration gates

- [x] 5.1 (C) Re-check the registry against the final images. For each slug, compare `frameShows` and `image.alt` in `src/site/pages.ts` with `shows` in `src/site/og/cards.ts` and with a look at each image. If any differ (2.5 should have left none), fix the registry, re-run `tools/capture-og.ts compose <slug>` for the affected slugs, and change their `LICENSES.md` rows to the right class. Verify with `npm test` (the `shows` check and the credit and "synthetic" checks pass) and, when nothing was recomposed, with `shasum -a 256 sites/playground/public/og/*` unchanged from 4.4.

  Recorded: no difference, nothing recomposed. For all 10 slugs `frameShows` equals `shows` in `cards.ts`, and each alt's first half is its card's `depicts`, with the band text quoted as drawn. Each image was viewed: the cat's credit is on `4d-os`, `4d-os-a`, `4d-os-b` and `4d-os-c` only, and "synthetic" on `4d-os` and the five worlds only. Two calls were re-checked and kept. Wind-Up Empire's frame shows tin tops printed in the worlds' inks and labeled with their names; they are toys of the page, not views of the worlds, and no cat is drawn, so its `[]` stands. Game Center's frame shows Rain Run's own "SYNTHETIC SCENE" label, but the band's mark came only from `WORLDS[].synthetic` (D1, D5) and Rain Run is not a 4D.OS world, so it got no mark; task 5.8 reversed this call. `npm test`: 59 files, 710 tests pass. `shasum -a 256 sites/playground/public/og/*` is unchanged from 4.4 (21 lines), and so is its output after a further `compose` of all 10 (every image reported "identical bytes").
- [x] 5.2 (C) Build and loop-freshness gates (design D8, gates 1–4):
  - `npm run typecheck` and `npm test` pass;
  - `rm -rf dist && npm run build 2>&1 | grep -cE '\[museum\]|\[site\]'` prints 0. The museum plugin prints `[museum]` exactly when a sheet's sources hash differs from its loops' provenance, so this is the loop-freshness check;
  - `git diff --name-only main -- sites/4d-os/a sites/4d-os/b sites/4d-os/c sites/4d-os/d sites/4d-os/e src/4d-os/worlds src/engine src/4d-os/launcher src/playground/bloomscope sites/playground/bloomscope src/playground/shared sites/4d-os/public/packs src/pipeline/scenes` prints nothing, and `git status --porcelain --` on the same paths prints nothing (it also catches new untracked files).

  Recorded: `npm run typecheck` prints nothing. `npm test` passes, 59 files and 710 tests, also with `dist/` deleted. `rm -rf dist && npm run build` exits 0, and the count of `[museum]` or `[site]` lines is 0. The build's other warnings are the chunk-size notice and the native-config-loader notice of the playground config. That notice names no `src/site/` file, since those modules use `.ts` extensions (D1). Both `git diff --name-only main` and `git status --porcelain` on the listed paths print nothing. The loop-freshness script reports every loop FRESH: 001 a, b and c, 002 d, 003 e, 004 bloomscope. The same checks were run again on `main...HEAD` after the commits.
- [x] 5.3 (C) Fingerprint gate (design D8, gate 5). Serve the fresh build with `wrangler dev`, after copying `deploy/_redirects` and `deploy/.assetsignore` into `dist/`. Fingerprint the 10 routes at 1440×900, at 390×844 and without JavaScript, and compare with the baseline taken on this branch before the change. Expected, and nothing else:
  - visible text (`document.body.innerText`) identical on every route in all three modes;
  - pixels identical within the harness's tolerance;
  - element counts at both widths: `META` +16, `LINK` +2 (+3 on `/`), `SCRIPT` +1 on every route; any other count difference fails;
  - request differences only for icon files: `/4d-os/icon.svg` on the six 4D.OS pages, `/icon.svg` on Wind-Up Empire, `/favicon.ico` on `/`, and any apple-touch-icon fetch.

  Write any other difference into this task, with its cause and whether it was accepted.

  Recorded, from the second of two full runs. The first run caught Bloomscope at 1440×900 mid-load: 20 `LINK` and 4 `CANVAS` instead of 22 and 5, with the clock label `0°` in place of `HOLD`. This is load timing: the page adds `modulepreload` links for its lazy chunks after load. A repeated probe of that page gave 21 links on the first load and 22 on the next three. The second run was clean, and the Bloomscope sheet sources are untouched and FRESH, so the flake was accepted. Results of the second run:
  - Visible text is identical on all 30 route-mode pairs. The one exception is a counter of Wind-Up Empire's economy at 1440×900 (65 against 63), which runs on its own clock. The harness filters that as known noise.
  - Pixels: 18 of 20 screenshots are identical. Game Center Yonjigen at 1440×900 differs by 1,026 px and Wind-Up Empire at 1440×900 by 96 px, both from their live animations and both under the harness's 2,000 px tolerance.
  - Element counts: a script over the fingerprint data asserts that every one of the 20 page-width pairs differs by exactly `META` +16, `LINK` +2 (+3 on `/`) and `SCRIPT` +1, with no other tag changing.
  - Requests and console errors are identical. Headless Chromium fetches neither the favicon nor the apple-touch-icon, so the icon requests the task allows did not occur at all. The icon files themselves were checked over HTTP in 5.5.
- [x] 5.4 (C) Run `npx -y -p tsx@4.23.15 tsx tools/audit-site.ts dist` on the fresh build. It exits with 0 and prints 10 page lines plus the 404 page and the site files.

  Recorded: exit 0, with 20 `ok` lines: the 10 pages, `/404.html`, "built pages in the registry", `/robots.txt`, `/sitemap.xml`, `/_headers`, `/favicon.ico`, both `apple-touch-icon.png` and both `icon.svg`. The negative control of 3.1 was repeated on a copy of this build, with the real images: `og/4d-os-c.png` removed, the canonical of `/bloomscope/` deleted and the `og:title` of `/4d-os/d/` rewritten as `name=`. It exits 1 and names all three.
- [x] 5.5 (C) Hosting checks under `wrangler dev`. With `curl -si`:
  - `/nope` and `/4d-os/nope` return `404` and the 404 page's `<title>`;
  - `/404` returns `200` and `/404.html` a `307` to `/404`, and the page served carries `noindex` (the accepted soft 404 of design D6); neither is in `sitemap.xml`;
  - `/landings/` returns `301` to `/`;
  - `/robots.txt` (`text/plain`), `/sitemap.xml` (XML), `/favicon.ico`, `/apple-touch-icon.png`, `/4d-os/icon.svg` and `/og/4d-os-a.png` (`image/png`) return `200`;
  - `/_headers` is not served as a file;
  - a page with `-H 'Host: playground.crewtives.com'` has no `X-Robots-Tag`, and a page with a made-up `workers.dev` Host has `X-Robots-Tag: noindex`. If the local runtime ignores host rules, write that down here as verifiable only on the preview host. Redirects and 404s are not expected to carry the header.

  In a browser, `/4d-os/nope` renders the 404 page with its fonts and styles and no console errors.

  Recorded, under `wrangler dev` on the fresh build:
  - `/nope`, `/4d-os/nope` and `/bloomscope/nope` return `404`, `text/html`, `<title>Not found · crewtives playground</title>` and `noindex`.
  - `/404` returns `200` with the same page and `noindex`, and `/404.html` returns `307` to `/404`. `sitemap.xml` has 10 `<loc>` and no `404`.
  - `/landings/` and `/landings` return `301` to `/`, and `/landings/bloomscope/` and `/landings/bloomscope` return `301` to `/bloomscope/`.
  - These return `200`: `/robots.txt` (`text/plain; charset=utf-8`), `/sitemap.xml` (`application/xml`), `/favicon.ico` (`image/vnd.microsoft.icon`), both `apple-touch-icon.png` (`image/png`), both `icon.svg` (`image/svg+xml`), and all 10 `/og/<slug>.png` (`image/png`).
  - `/_headers`, `/_redirects` and `/.assetsignore` return the 404 page.
  - With `Host: playground.crewtives.com`, a page has no `X-Robots-Tag`. **Verifiable only on the preview host:** the local runtime does not apply host-scoped `_headers` rules.
    - Evidence for that: a made-up `workers.dev` Host got a page with no header, over both http and https.
    - In a scratch copy of the build, a path rule added to `_headers` was applied locally, and a host rule naming the local server was not.
    - The check is carried to 6.1's Pending list.

  In Chromium at 1440×900 and 390×844, `/4d-os/nope` renders the 404 page with its one stylesheet and the three museum fonts (Geologica, Fira Mono 400 and 500), all loaded with `200`. No request failed, the page has no horizontal overflow, and it throws no page error. The console shows exactly one error, Chromium's log of the document's own 404 status ("Failed to load resource … 404"), which every 404 page produces.
- [x] 5.6 (C) Public-repository and layer checks:
  - the added lines of `git diff main` hold no absolute home, scratch or temp paths, no loopback address or local port, and no account name, version ID or agent name. Check with the same kind of scan `prepare-public-release` task 7.1 used: absolute paths, local addresses, preview URLs and email addresses. The only `workers.dev` hits are the placeholder rule `https://:version.:subdomain.workers.dev/*` in `_headers`, the test that reads it, and prose in docs and specs (`public-repository` "No personal or machine-local data");
  - nothing outside `src/site/`, the two site configs and `tools/` imports or links `src/site/`, in TypeScript, HTML or CSS: `grep -rnE "src/site/|\.\./site/" src sites --include=*.ts --include=*.html --include=*.css | grep -v "^src/site/" | grep -v "vite.config.ts"` prints nothing;
  - `grep -rn --exclude='*.json' "capture-og\|audit-site" dist` prints nothing. Only the provenance records may name the tool.

  Recorded: the added lines were scanned (tracked diffs and the new files) for home, scratch and temp paths, loopback addresses, ports, emails, preview hosts, session names and UUIDs, with no hit. The `workers.dev` hits are the placeholder rule in `_headers`, its test in `sitemap.test.ts` and its constant `HEADERS_RULE` in `tools/audit-site.ts` (generic check code, no real host), plus prose in the README, `docs/site-metadata.md` and this change's artifacts. `tasks.md` also contains the regex of the 4.3 check (`127\.0\.0\.1|localhost`), which is a pattern, not an address. The import grep prints nothing. The `dist` grep prints nothing: only `dist/og/provenance.json`, a record, names the tool. The scan was repeated on `git diff main...HEAD` after the commits.
- [x] 5.7 (C) Documentation check: every repository path named in `docs/site-metadata.md`, the changed parts of `docs/architecture.md` and the README tour and deploy section exists (``grep -oE '`[A-Za-z0-9_./-]+/[A-Za-z0-9_./-]*`'`` on each file, then `ls`), and the commands the docs give (`capture-og.ts compose`, `audit-site.ts`) run as written, with a real address in place of `<url>`.

  Recorded: every path named in `docs/site-metadata.md` and `docs/architecture.md` exists. Routes (starting with `/`) and `dist/` paths were filtered out. The README tour's relative entries resolve against their row's folder: `og/` and `og/captures/` under `src/site/`, and `public/og/` under `sites/playground/`. The in-page anchors `#build-guards`, `#deployment` and `#the-site-metadata-at-build-time` exist. One link, `../openspec/specs/site-metadata/spec.md` in `docs/site-metadata.md`, resolves only once 6.3 archives this change. It was left as is, because pointing it at the change's delta would break at the archive.

  The documented commands were run as written:
  - `capture museum --base <url>`, with a local `wrangler dev` of the fresh build as `<url>`, gave bytes identical to the capture taken from the published site, so the tool kept the capture and its record.
  - `compose`, all 10, gave identical bytes, and sidecars and records were kept.
  - `icons` gave identical bytes.
  - `audit-site.ts dist` exits 0 (5.4).
- [x] 5.8 (C) Review fixes, round 1 (design D5, "A synthetic scene that is not a world still gets the mark" and "Where the frame falls"):
  - give Game Center's band the mark "synthetic" through the registry's `syntheticFrame`, allowed only on a page with an empty `frameShows` whose own HTML labels the scene "Synthetic scene"; this replaces the call recorded in 5.1;
  - re-capture the launcher at 901×1040 and move its region to x 28, y 368, which leaves out the h1 and keeps the three windows and the heading "Two more plates.";
  - move C to x 295, y 220 (the whole 16 mm strip), D to x 0, y 0 (heading, tag and falcons, no cut text) and Wind-Up Empire to y 77 (no header counters);
  - recompose those five, and update their alt texts, the two `LICENSES.md` rows and `docs/site-metadata.md`.

  Verify that `npm run typecheck` passes, that `npm test` passes with `dist/` moved away, that `rm -rf dist && npm run build 2>&1 | grep -cE '\[museum\]|\[site\]'` prints 0, that `audit-site.ts dist` exits 0, that the loop-freshness script reports every loop FRESH, and that the fingerprint compare shows only the head counts of 5.3.

  Recorded: `npm run typecheck` prints nothing. `npm test` passes with `dist/` moved away: 59 files and 712 tests, the two new ones being the `syntheticFrame` label check and the alt check for the mark. The build prints 0 `[museum]` or `[site]` lines, and every page's `?v=` equals the first 8 hex digits of its image's SHA-256. `audit-site.ts dist` exits 0. All six loops are FRESH, and `git status --porcelain` on the paths of 5.2 prints nothing. In the fingerprint compare against the branch's baseline, only `META`, `LINK` and `SCRIPT` counts differ, as in 5.3. Each recomposed image was viewed at 1200×630, 600×315 and 300×157. The launcher's re-capture is pixel-identical to a probe of the same route and viewport taken from the same build.

## 6. Closing

- [ ] 6.1 (D) Write `verification.md` next to this file:
  - Environment: browser and renderer, Playwright, tsx and wrangler versions, platform;
  - per group, the measured figures: image weights, the pixel-identity result, test counts, the audit output, the fingerprint comparison with its element-count differences, and the HTTP checks;
  - a table per spec, `site-metadata`, `playground-hub` and `public-repository`, of scenario → how it was verified → result;
  - known limitations: the fingerprint harness is not in the repository (design D8), so gate 5 cannot be re-run from a fresh clone;
  - deviations, accepted exceptions and a Pending list:
    - on the preview host: `X-Robots-Tag: noindex` on a page, the 404 handling, and the served HTML checked with `curl` and an offline Open Graph parser;
    - after the production deploy: real unfurls of the 10 URLs in the X post composer, Slack, Discord, WhatsApp, iMessage, Telegram, LinkedIn Post Inspector and Facebook Sharing Debugger, with a forced re-scrape of each URL ("Scrape Again", Post Inspector, Telegram's @WebpageBot);
    - for the change that owns `<title>`: the tab titles under 30 characters (`/`, worlds B, C, D and E) and the descriptions over 160 (`/`, Game Center Yonjigen, Wind-Up Empire, worlds D and E), measured again on the final build.

  Verify that every scenario of the three delta specs appears in a table.
- [ ] 6.2 (D) Run `openspec validate add-seo-and-sharing --strict` and fix until it passes. Verify that its output is "Change 'add-seo-and-sharing' is valid".
- [ ] 6.3 (D) Archive the change with `openspec archive add-seo-and-sharing`, syncing the deltas into `openspec/specs/site-metadata/`, `playground-hub` and `public-repository`. Update `docs/openspec-workflow.md`: the new capability in "The living specs", the change's row in "The changes, in order", and a short section on the change. Verify with:
  - `openspec validate --specs --strict`, which passes;
  - `openspec list`, which shows no active change;
  - `ls openspec/specs/site-metadata/spec.md`.
