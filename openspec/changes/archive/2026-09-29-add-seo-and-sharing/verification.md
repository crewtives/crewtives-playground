# Verification of add-seo-and-sharing

Date: 2026-09-29. Branch `feat/seo-and-mobile`, on top of `main` (the public history, after `prepare-public-release`). The figures below were measured again on the final code, after the review fixes of task 5.8, unless a line says otherwise. The ad hoc verification scripts and the fingerprint harness were never part of the repository (design D8); what remains of them are the figures recorded here and in `tasks.md`.

## Status

- **Tasks:** 31/31, including the review fixes (5.8).
- **Reviews:** three independent reviews (the built output, the share images as cards, and compliance with the specs and the owner's rules) ended with a pass. Their open findings are minor and cosmetic, and are listed under "Accepted exceptions" and "Pending".
- **Nothing was deployed or pushed.** Every HTTP check ran against the built output served locally by `wrangler dev` with the production configuration (`deploy/wrangler.jsonc`, with `deploy/_redirects` and `deploy/.assetsignore` copied into `dist/`). The checks that need a real host are under "Pending".

## Environment

- macOS on arm64, Node 24.19.
- Vite 8.3.0, Vitest 5.0.1, TypeScript 7 (`tsc --noEmit`).
- Playwright 1.63.0 and tsx 4.23.15, run through `npx` at pinned versions (no `package.json` change).
- Chromium 153.0.8010.12, headless, with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --disable-accelerated-2d-canvas`. Renderer: ANGLE on SwiftShader (Vulkan 1.3.0). The same browser and renderer are recorded in `src/site/og/captures/provenance.json` and `sites/playground/public/og/provenance.json`.
- wrangler 4.138.0 (`wrangler dev`, local runtime), for the HTTP checks and the fingerprints.

## Build, tests and loop freshness (5.2, 5.8)

- `npm run typecheck`: no output, exit 0.
- `npm test` with `dist/` deleted (the fresh-clone rule of `public-repository`): 59 files, 712 tests, all pass.
- `rm -rf dist && npm run build`: exit 0. `grep -cE '\[museum\]|\[site\]'` on its output prints `0`. The only other warnings are the chunk-size notice and the playground config's native-config-loader notice, both present before this change.
- Loop freshness (each sheet's `sources` hash against its loops' provenance): every loop is FRESH.

  | Sheet | Loops | Result |
  |---|---|---|
  | 001 | a, b, c | FRESH |
  | 002 | d | FRESH |
  | 003 | e | FRESH |
  | 004 | bloomscope | FRESH |

- `git diff --name-only main` and `git status --porcelain` over every sheet's sources (`sites/4d-os/a/` … `e/`, `src/4d-os/worlds/`, `src/engine/`, `src/4d-os/launcher/`, `src/playground/bloomscope/`, `sites/playground/bloomscope/`, `src/playground/shared/`, `sites/4d-os/public/packs/`, `src/pipeline/scenes/`) print nothing.

## Head tags (1.x, 2.x)

Read from the built HTML of the 10 pages:

| Route | `og:*` | `twitter:*` | Canonical | JSON-LD | `isBasedOn` | Block ends at byte | `og:title` chars | Alt chars |
|---|---|---|---|---|---|---|---|---|
| `/` | 11 | 5 | 1, correct | `WebSite` | no | 2,736 | 59 | 310 |
| `/bloomscope/` | 11 | 5 | 1, correct | `CreativeWork` | no | 2,752 | 58 | 227 |
| `/landings/game-center/` | 11 | 5 | 1, correct | `CreativeWork` | no | 3,215 | 63 | 357 |
| `/landings/wind-up-empire/` | 11 | 5 | 1, correct | `CreativeWork` | no | 3,128 | 50 | 336 |
| `/4d-os/` | 11 | 5 | 1, correct | `CreativeWork` | yes | 3,361 | 63 | 417 |
| `/4d-os/a/` | 11 | 5 | 1, correct | `CreativeWork` | yes | 3,384 | 65 | 401 |
| `/4d-os/b/` | 11 | 5 | 1, correct | `CreativeWork` | yes | 3,188 | 55 | 382 |
| `/4d-os/c/` | 11 | 5 | 1, correct | `CreativeWork` | yes | 3,226 | 58 | 419 |
| `/4d-os/d/` | 11 | 5 | 1, correct | `CreativeWork` | no | 3,219 | 60 | 373 |
| `/4d-os/e/` | 11 | 5 | 1, correct | `CreativeWork` | no | 3,117 | 55 | 357 |

- "Correct" means `https://playground.crewtives.com` plus the route, equal to `og:url`.
- Every block ends within its first 3.4 KB, far inside the 32 KiB limit. On `/`, the only page with a `<style>` in its source, the first `<style>` starts at byte 4,230, after the block.
- Alt lengths are counted after HTML unescaping; the credit's quotes are written as `&quot;` in the attribute.
- `href="data:,"` appears in no built page.
- The 404 page carries `noindex` and no canonical, `og:*` or JSON-LD.
- Every `og:image` is `https://playground.crewtives.com/og/<slug>.png?v=<v>`, where `<v>` is the first 8 hex digits of the file's SHA-256 (checked by `tools/audit-site.ts`).
- **Description kept in step:** with one word added to the launcher's `<meta name="description">` and the registry left as it was, the 4D.OS build fails with "/4d-os/: its `<meta name="description">` differs from the registry's description in src/site/pages.ts". The edit was reverted.
- **Single-page build:** `PLAYGROUND_ONLY=museum` with `PLAYGROUND_OUT` set to a temporary folder succeeds, and its `index.html` has one canonical and the versioned `og:image`.

## Share images (4.x, 5.1, 5.8)

| Image | Bytes | KiB | `?v=` | Source | Region (x, y) | Shows | "synthetic" | Cat credit |
|---|---|---|---|---|---|---|---|---|
| `museum.png` | 83,966 | 82.0 | `be249978` | `src/site/og/captures/museum.png` | 0, 0 | none | no | no |
| `bloomscope.png` | 131,861 | 128.8 | `ce2f6335` | `src/site/og/captures/bloomscope.png` | 0, 0 | none | no | no |
| `game-center.png` | 158,898 | 155.2 | `79c00797` | `src/site/og/captures/game-center.png` | 45, 0 | none | yes | no |
| `wind-up-empire.png` | 96,921 | 94.6 | `a2a2cc86` | `src/site/og/captures/wind-up-empire.png` | 0, 77 | none | no | no |
| `4d-os.png` | 69,944 | 68.3 | `6ddde611` | `src/site/og/captures/4d-os.png` | 28, 368 | A, B, C | yes | yes |
| `4d-os-a.png` | 37,961 | 37.1 | `1440341a` | `src/pipeline/captures/a-vitrine.png` | 102, 0 | A | yes | yes |
| `4d-os-b.png` | 173,794 | 169.7 | `d01a1680` | `src/pipeline/captures/b-plate.png` | 0, 20 | B | yes | yes |
| `4d-os-c.png` | 126,249 | 123.3 | `0ebe40d7` | `src/pipeline/captures/c-leader.png` | 295, 220 | C | yes | yes |
| `4d-os-d.png` | 40,355 | 39.4 | `000b80d1` | `sites/4d-os/public/launcher/d-golden-stoop.png` | 0, 0 | D | yes | no |
| `4d-os-e.png` | 58,585 | 57.2 | `9187ac44` | `sites/4d-os/public/launcher/e-whale-fall.png` | 0, 0 | E | yes | no |

- All 10 are 1200×630 PNGs, from 37.1 to 169.7 KiB, against the 300 KB cap.
- **Frame identity:** `src/site/og/cards.test.ts` decodes each image and its source and compares the 840×630 frame with the recorded region: 0 differing pixels on all 10. A separate check with PIL during review gave the same result.
- **Hashes:** each image's SHA-256 equals its sidecar and its `provenance.json` entry, and each source's SHA-256 equals the recorded one (`cards.test.ts`).
- **Re-run changes nothing:** `tools/capture-og.ts compose` of all 10 on the final code reported "identical bytes, sidecar and record kept" for each, and `shasum -a 256 sites/playground/public/og/*` (21 files) was the same before and after.
- **Viewed:** every image was looked at in full size, at 600×315 and at 300×157. The cat's credit is in the band of `4d-os`, `4d-os-a`, `4d-os-b` and `4d-os-c` only. "synthetic" is on `4d-os`, the five worlds and `game-center` only.
- **Icons:** `favicon.ico` holds PNG entries of 16, 32 and 48 px; both `apple-touch-icon.png` are opaque 180×180 (`cards.test.ts`).

## Dist audit (3.1, 5.4)

- `npx -y -p tsx@4.23.15 tsx tools/audit-site.ts dist` on the final build: exit 0, 20 `ok` lines: the 10 pages, `/404.html`, "built pages in the registry", `/robots.txt`, `/sitemap.xml`, `/_headers`, `/favicon.ico`, both `apple-touch-icon.png` and both `icon.svg`.
- Negative control, repeated on a copy of the final build with `og/4d-os-c.png` removed: exit 1, "FAIL /4d-os/c/ … share image og/4d-os-c.png does not exist in the build". Task 5.4 records the wider control (a missing image, a deleted canonical and an `og:title` written with `name=`), which named all three.

## Site files and hosting (2.2, 2.3, 5.5)

Under `wrangler dev`, on the final build, with `curl`:

| Request | Status | Notes |
|---|---|---|
| The 10 public routes | 200 | `text/html`, titles unchanged from `main` |
| `/nope`, `/4d-os/nope`, `/bloomscope/nope`, `/landings/nope`, `/4d-os/a/nope`, `/og/nope.png` | 404 | the 404 page, "Not found · crewtives playground", `noindex` |
| `/404` | 200 | the 404 page with `noindex` (the accepted soft 404, design D6) |
| `/404.html` | 307 → `/404` | the platform's HTML handling |
| `/landings/`, `/landings` | 301 → `/` | unchanged |
| `/landings/bloomscope/`, `/landings/bloomscope` | 301 → `/bloomscope/` | unchanged |
| `/robots.txt` | 200 | `text/plain` |
| `/sitemap.xml` | 200 | `application/xml` |
| `/favicon.ico` | 200 | `image/vnd.microsoft.icon` |
| `/apple-touch-icon.png`, `/4d-os/apple-touch-icon.png` | 200 | `image/png` |
| `/icon.svg`, `/4d-os/icon.svg` | 200 | `image/svg+xml` |
| `/og/<slug>.png` (all 10 in task 5.5; `museum` and `4d-os-a` again here) | 200 | `image/png` |
| `/_headers`, `/_redirects`, `/.assetsignore` | 404 | the 404 page; none is served as a file |

- `robots.txt` reads `User-agent: *`, `Allow: /` and `Sitemap: https://playground.crewtives.com/sitemap.xml`.
- `sitemap.xml` starts with the UTF-8 XML declaration, has the sitemaps.org 0.9 `urlset`, 10 `<loc>` equal to the 10 canonicals, no `lastmod` and no 404 page.
- The 404 page links to `/`, `/#index`, `/4d-os/`, `/bloomscope/`, `/landings/game-center/` and `/landings/wind-up-empire/`, and its stylesheet and icons have root-absolute URLs. In Chromium at 1440×900 and 390×844, `/4d-os/nope` renders with its stylesheet and the three museum fonts, all 200, with no overflow and no page error (task 5.5). The one console line is Chromium's log of the document's own 404 status.
- **`X-Robots-Tag`:** with `Host: playground.crewtives.com`, a page has no `X-Robots-Tag`. A request with a made-up `workers.dev` Host also got no header, because the local runtime does not apply host-scoped `_headers` rules. Task 5.5 showed that on a scratch copy of the build: a path rule was applied locally, and a host rule was not. The `workers.dev` side is therefore verifiable only on the preview host (see "Pending").

## Pages unchanged: fingerprints (5.3, 5.8)

The 10 routes were fingerprinted at 1440×900, at 390×844 and without JavaScript, served by `wrangler dev` from the final build, and compared with the baseline taken on this branch before any change (30 route-mode pairs). The harness is out of the repository (see "Known limitations").

- **Visible text** (`document.body.innerText`): identical on 30 of 30 pairs. In this run even Wind-Up Empire's economy counter, which runs on its own clock and which the harness filters as known noise, matched.
- **Requests and console errors:** identical on 30 of 30. Headless Chromium requests neither the favicon nor the apple-touch-icon, so the icon requests the spec allows did not occur. Every request of every page goes to the site itself: the harness records any other origin as external, and none appeared.
- **Pixels:** 18 of 20 screenshots identical. World B at 1440×900 differs by 292 px and Game Center Yonjigen at 1440×900 by 16 px, both from live animation, both under the harness's 2,000 px tolerance. Earlier runs (5.3) had Game Center at 1,026 px and Wind-Up Empire at 96 px, from the same animations.
- **Elements:** a script over the comparison asserts that each of the 20 page-width pairs differs by exactly `META` +16, `SCRIPT` +1 (the JSON-LD) and `LINK` +2 (+3 on `/`, which also declares `/favicon.ico`), with no other tag changing. It passed on all 20.

## Public repository and layers (5.6, 5.7)

- The added lines of `git diff main...HEAD` hold no home, temporary or scratch path, no loopback address or port, no email address, and no preview host, version ID, account or session name. `workers.dev` appears only in the placeholder rule of `sites/playground/public/_headers`, its test, the generic check in `tools/audit-site.ts`, and prose.
- No file outside `src/site/`, the two site configs and `tools/` imports or links `src/site/` (TypeScript, HTML or CSS): the grep of task 5.6 prints nothing.
- Every relative import under `src/engine/` resolves inside `src/engine/`; its package imports are `three`, `gsap`, `lenis` and `vitest`.
- `grep -rn --exclude='*.json' "capture-og\|audit-site" dist` prints nothing: only `dist/og/provenance.json` and the sidecars name the tool.
- The tracked root holds `.claude/`, `.impeccable/`, `deploy/`, `docs/`, `openspec/`, `sites/`, `src/`, `tools/`, `.gitattributes`, `.gitignore`, `LICENSE`, `LICENSES.md`, `README.md`, `package.json`, `package-lock.json`, `tsconfig.json` and `vitest.config.ts`.
- `git check-ignore .env .dev.vars` matches both.
- Every repository path in `docs/site-metadata.md`, `docs/architecture.md` and the README tour exists. The link from `docs/site-metadata.md` to `openspec/specs/site-metadata/spec.md` resolves since this change was archived (6.3).

## Scenarios: `site-metadata`

| Scenario | How it was verified | Result |
|---|---|---|
| Registry matches the builds | `pages.test.ts` maps every `rollupOptions.input` of both configs to its route | 10 routes + 404, pass |
| Unregistered page | Temporary entry in a config, build and test (tasks 2.1, 2.4) | Build fails and names the page; test fails and names it |
| Single-page build | `PLAYGROUND_ONLY=museum` into a temporary folder | Succeeds; one canonical, versioned `og:image` |
| A world's canonical URL | Built `/4d-os/d/` | One canonical, `https://playground.crewtives.com/4d-os/d/` |
| Served from another host | Canonical is a build-time constant (`SITE_ORIGIN`); page fetched with a different Host | Same canonical; the real `workers.dev` fetch is Pending |
| Complete tags | Head table above; `head.test.ts`; `tools/audit-site.ts` | 11 `og:*` + 5 `twitter:*` on each page, `property`/`name` forms, `v` = SHA-256 prefix, pass |
| Found in the first 32 KiB | `/` block ends at byte 2,736, before its `<style>` at 4,230; `head.test.ts` with a 60 KB `<style>` | Pass |
| Description kept in step | Launcher description edited, 4D.OS build run | Build fails naming `/4d-os/` |
| Launcher description | `grep -n "local experiment" sites/4d-os/index.html src/site/pages.ts` | No match; 149 characters |
| Home page | JSON-LD of `/` parsed | `WebSite`, "crewtives playground", `https://playground.crewtives.com/` |
| A work | JSON-LD of `/bloomscope/` parsed; `head.test.ts` | `CreativeWork`, canonical `url`, creator crewtives, no rating, offer, date or `isBasedOn` |
| A work built on the cat | JSON-LD of `/4d-os/a/` parsed | `isBasedOn` "Cat" by `Person` J-Toastie, CC-BY 3.0 license URL |
| A value that could close the script | `head.test.ts` with `</script>` in a registry value | No `</` in the block; round-trips |
| No placeholder left | `href="data:,"` searched in every built page | 0 matches |
| Icons served | `curl` of the five icon URLs | 200 with their image types |
| Frame copied exactly | `cards.test.ts`; PIL during review | 0 differing pixels on 10 images |
| Size and weight | Image table | 1200×630, 37.1–169.7 KiB |
| Cat credit inside the image | Images viewed; `cards.test.ts` band strings | On `4d-os`, `4d-os-a`, `4d-os-b`, `4d-os-c` |
| Synthetic mark | Images viewed; `cards.test.ts` from `WORLDS[].synthetic` | On `4d-os` and the five worlds |
| Synthetic mark on a scene of the page's own | `game-center.png` viewed; `pages.test.ts` (`syntheticFrame` only with the page's own "Synthetic scene" label) | "synthetic" in the band |
| No missing glyph | `cards.test.ts` against `woff2Codepoints` | Pass |
| Sidecar matches the image | `cards.test.ts` | Pass on 10 |
| Re-run changes nothing | `compose` of all 10, `shasum` before and after | 21 files identical |
| Licenses listed | `cards.test.ts` `LICENSES.md` rows | Pass; A, B, C and launcher rows are derivatives requiring the credit |
| Clean output | `grep -rn --exclude='*.json' "capture-og\|audit-site" dist` | No match |
| Robots file | `curl /robots.txt`; `sitemap.test.ts` | 200, `text/plain`, three lines as required |
| Ten URLs | `sitemap.xml` parsed; `sitemap.test.ts` | Declaration, namespace, 10 canonical `<loc>`, no `lastmod` |
| Unknown path | `curl /nope` | 404 with the 404 page; links to `/` and `/4d-os/` |
| Unknown path under 4D.OS | `curl /4d-os/nope`; Chromium at two widths (5.5) | 404, styles and fonts loaded |
| Redirects first | `curl /landings/` | 301 to `/` |
| Not indexed | Built `404.html`; `sitemap.xml` | `noindex`, no canonical, no JSON-LD, not in sitemap |
| Its own address | `curl /404` | 200 with `noindex`; not in sitemap |
| Custom domain | Page fetched with `Host: playground.crewtives.com` | No `X-Robots-Tag` locally; production check Pending |
| workers.dev host | `sitemap.test.ts` reads the `_headers` rule; local runtime ignores host rules | Rule present and placeholder-only; header on the real host Pending |
| Same pages | Fingerprints of 30 route-mode pairs | Text and requests identical; pixels within tolerance; only the expected head elements |
| Loops fresh | Build output; loop freshness | 0 `[museum]` lines; 6 loops FRESH |
| Audit passes | `tools/audit-site.ts dist` | Exit 0, 20 `ok` lines |
| Audit catches a missing image | Copy of the build without `og/4d-os-c.png` | Exit 1, names `/4d-os/c/` and the file |

## Scenarios: `playground-hub`

| Scenario | How it was verified | Result |
|---|---|---|
| Museum at the root | `curl /`; fingerprints (console) | 200, no redirect, no console error |
| Museum and landings at their routes | `curl`; fingerprints | 200 each, no console error |
| Comparison page retired | `curl /landings/` | 301 to `/` |
| Bloomscope moved with its fragment | `curl /landings/bloomscope/`; `deploy/_redirects` unchanged from `main` | 301 to `/bloomscope/`; the fragment behavior is the browser's and was verified in `add-playground-museum` |
| Landings outside the collection | Fingerprints of `/` (text identical to `main`) | Unchanged: no sheet or index row for either landing |
| Deep link to the index | Not re-run: no page code changed, fingerprints identical | Unchanged |
| Deep link to a sheet | Not re-run: no museum code changed, fingerprints identical | Unchanged |
| 4D.OS intact | Fingerprints of the six 4D.OS routes; sheet sources untouched | Same text, requests and pixels; only head elements added |
| Site files at the root | `curl /robots.txt`, `/sitemap.xml`, `/favicon.ico` | 200 each |
| Unknown address | `curl /nope`, `/4d-os/nope` | 404 with the 404 page, not an empty body |
| Font audit | No page's fonts changed (fingerprint requests identical) | Unchanged |
| 404 page fonts | Chromium requests on `/4d-os/nope` (5.5); `sitemap.test.ts` | Only Geologica, Fira Mono 400 and 500, from the museum's files |
| No external origins | Fingerprint requests of the 10 routes; 404 page requests (5.5) | All same-origin |

## Scenarios: `public-repository`

| Scenario | How it was verified | Result |
|---|---|---|
| Reusing the code | `LICENSE` unchanged from `main` | Unchanged, plain MIT |
| Every asset listed | `cards.test.ts` rows for images, captures and icons | Pass |
| Credit travels with the share image | The four cat images viewed on their own | Each reads *"Cat" by J-Toastie, CC-BY 3.0* |
| Engine without outbound imports | Import resolution over `src/engine/` | All inside `src/engine/` or packages |
| Site layer imported only by the build | Grep of task 5.6 | No match |
| Root at a glance | `git ls-files` at the root | Only the entries listed above |
| Same URLs | `curl` of every route and redirect | Same routes and redirects, plus the new site files |
| Audit before publishing | Scan of the added lines (5.6) | No hit beyond the live site and the placeholder rule |
| Placeholder host pattern | `git grep -n workers.dev` outside `openspec/` | The rule in `_headers` (quoted in `docs/site-metadata.md`), its test, the audit's generic check, the `workers_dev` configuration key, and prose in the README and `docs/architecture.md` |
| Local secrets file | `git check-ignore .env .dev.vars` | Both ignored |

## Known limitations

- **The fingerprint harness is not in the repository** (design D8). Gate 5, "Same pages", cannot be re-run from a fresh clone; its figures here and in task 5.3 are the record. `tools/audit-site.ts` and the unit tests are the checks a fresh clone can run.
- **The fingerprint harness is sensitive to load timing on Bloomscope** at 1440×900: one run caught the page before its lazy `modulepreload` links were added (task 5.3). A repeated run was clean.
- **Host-scoped `_headers` rules are not applied by the local runtime**, so the `workers.dev` noindex can only be seen on a real host.
- **Composing on another platform** may give different band pixels (font rasterization), which changes the images' bytes and versions. The frame stays exact everywhere (`docs/site-metadata.md`).

## Accepted exceptions

- **`/404` answers 200** with the 404 page and `noindex` (design D6), and `/404.html` answers **307** to `/404`, the platform's HTML handling. The spec only says it redirects.
- **The launcher's share image** gives up world C's right border and inset: the frame starts at the page's own margin (x 28) and the three windows span 845 px, wider than the 840 px frame. The band's hairline, in the same ink, closes C. The heading "Two more plates." sits alone at the bottom left of the frame. Design D5 records why a frame showing all five worlds, or a margin on both sides, is impossible at 1:1.
- **World D's share image shows the title twice:** the page's own heading "The golden stoop." inside the frame is larger than the band's title. They agree. A thin light strip at the frame's left edge is part of the page at x 0, not a crop artifact. Design D5 records the rejected plotter region, which cut text at every position.
- **Tab titles are unchanged** (see "Pending"). The share titles carry the fuller names instead.

## Pending

- **On the preview host, before production** (`playground-hub` "Preview before production"):
  - `X-Robots-Tag: noindex` on a page, a site file and an image served from the preview's `workers.dev` host;
  - the 404 handling: `/nope` and `/4d-os/nope` answer 404 with the 404 page, `/404` 200 with `noindex`, and `/404.html` 307 to `/404`;
  - the served HTML of the 10 pages checked with `curl` and an offline Open Graph parser.
- **After the production deploy:**
  - no `X-Robots-Tag` on `playground.crewtives.com`;
  - real unfurls of the 10 URLs in the X post composer, Slack, Discord, WhatsApp, iMessage, Telegram, LinkedIn Post Inspector and Facebook Sharing Debugger, with a forced re-scrape of each URL (Facebook's "Scrape Again", LinkedIn's Post Inspector, Telegram's @WebpageBot), because some of them may have cached a card without an image.
- **For the change that owns `<title>`**, measured again on the final build:
  - tab titles under 30 characters: `/` (20), world B (20), world C (14), world D (24) and world E (18);
  - descriptions over 160 characters: `/` (188), Game Center Yonjigen (189), Wind-Up Empire (189), world D (197) and world E (180).
- **The "A local experiment" footers** inside the worlds, which belong to the later mobile change because they are sheet sources.
- **Merge without squashing:** the launcher capture's record in `src/site/og/captures/provenance.json` names the commit it was captured from. A squash merge would leave that commit out of the published history; if the branch is squashed, re-capture the launcher and compose again.
- **Optional, cosmetic:** a launcher frame that gives back its left margin (region x about 12) at the cost of more of C's right edge; the owner's call.
