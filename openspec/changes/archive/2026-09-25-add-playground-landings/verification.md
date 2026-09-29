# Verification

## Shared platform (groups 1 and 2)

Date: 2026-09-25. Branch `feat/playground-landings`, on top of the playground base commit. The verification scripts live outside the repo (Non-Goals): a 4D.OS capture script, a reload-to-top script, a mask capture script with its analyzer, a comparison-page script, a skeleton script, a stills check and a smoke script. Playwright 1.62.1 (Chromium) comes from the `npx` cache; it is not in `package.json`. Chromium runs with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.

### 1.4 Browser verification

- `npm run dev` (with `VITE_NO_HMR=1`) and the smoke script on `/4d-os/`: 0 console errors, 0 failed requests, screenshot saved (the 4D.OS launcher).
- `grep -c playwright package.json` → 0.

### 1.5 4D.OS reference (before the core changes)

- A temporary detached `git worktree` of the reference commit (the last one before the core changes), with `node_modules` linked to the repo's; `npx vite build` (without the mask or `resetToTop`), served with `vite preview --outDir dist`. The worktree was removed at the end (`git worktree list` shows only the main tree).
- Capture (capture script): 1440×900 viewport at dpr 1, `prefers-reduced-motion: reduce` (nothing plays by itself: fixed rest frame), no scroll; the mode is set with the `input[name=depth]` selector to 16, 1-bit and Millions; the script waits for the canvas to settle (three equal readings) and reads the `Engine` canvas with `readPixels` (`preserveDrawingBuffer`), SHA-256 over the raw RGBA (1440×900).
- Two consecutive captures: the 15 hashes match and there are no console errors. Reference:

| World | 16 colors | 1-bit | Millions |
|---|---|---|---|
| a | `d0330c99448999bf3527710d6ece3041dc9cf3ab23e8afa3fd0d01636585775f` | `2fcc0a15fc71e16dbfb3dcf8b5645f4938ec4ee1a0096129d101d80b5ff714c4` | `c017c7c97e8152ad266a494a9174b541998ee326a63880894f7cbb495a0f489b` |
| b | `c6d0f9ccf1e1087da0f52b3ba4f102cd78960a1a3211d76184c3dfb18f9e85ce` | `f794d69b0d18e1f158f4183baa9236f41afd3f5ccaa6ea5a2ce30bd9916ece39` | `4f057eac39e0f4a7a982998895343bfa5379ada6832e425095af376def76fec6` |
| c | `cba1d210c4d0c81da886b52a1beffc4887d4d1d406aaca7ab9c618c3c6a3ba9f` | `e1777d5a52ba2ec03f60cb70350b569c7f7e3633af4231488025751e618566a1` | `7e07c7cf227b7702b872f20e1f65e0666d85373cb32ea11f847c1ebb59e72d97` |
| d | `ade74f8df9131a68634853e4c1ab9a27d91b2230fd3c83ce2803d23493dd7990` | `8bd0b77bb0c5557e08fdd24ba33516f2a07c6128a9891afe9905184b4f5e0869` | `7330f0adfd02de43c9d377f9849bbf806a7d97deeeb5ed9f25993051d26e3127` |
| e | `3abbd33df4b97f6dea1d0a3f16ac7ba4caa9247fe623e66ecc71a0e16246738a` | `ee348997faadf8095e43a0b04db4db4cf6954618bf52f1c7a2ff50562f1caa08` | `16aecbb86952f7dcf14f010f72df23e969ef767467bb67e690723c3f8c2f6540` |

Task 7.3 can repeat the same capture with the capture script (arguments: the origin and an output directory) and compare against this table.

### 2.1 `vite.playground.config.ts`

- Reviewed: `root: 'playground'`, `base: '/'`, `publicDir` = `playground/public`, `outDir` = the repo's `dist/` (or `PLAYGROUND_OUT`), `emptyOutDir: false`, `assetsDir: 'landings/_assets'`, `input` = index + existing landings, `server.fs.allow` = repo root, `VITE_NO_HMR=1` honored, no `packSaver`.
- **Bug fixed in the build check.** The plugin always checked the `outDir` computed in the file (`dist/` or `PLAYGROUND_OUT`), not the resolved one: with `--outDir` on the command line it did not look at the real output. Test with the previous configuration (temporary copy with `publicDir` pointed at the repo's `public/` and a temporary `--outDir`): the build finished with **exit 0**, leaving `packs/` in the output. It now takes `config.build.outDir` in `configResolved`, and the message names the real path.
- Test of the check (temporary copy `vite.playground.guardtest.config.ts` with `publicDir: resolve(root, 'public')`, `--outDir <temporary directory> --emptyOutDir`): **exit 1**, `Error: <temporary directory>/packs exists: the playground build must not copy the 4D packs (packs/) from public/.` (plugin `playground-no-packs-at-root`). The copy and the temporary output were deleted.
- `PLAYGROUND_OUT=<temporary directory> npx vite build -c vite.playground.config.ts`: the output root has only `landings/` (`_assets`, `_shared`, the three landings and `index.html`). The integrated build over `dist/` is in 2.16.

### 2.3 Mask in `RetroDisplay` (vitest)

`src/core/display/display.test.ts` (5 tests, no DOM: doubles for the tokens and a renderer that records the uniforms the quad is drawn with): without a mask, `uMaskShape = 0` and radius 0; ellipse = 1 with the view size in device px; a 24 px `roundrect` at dpr 2 = 2 with radius 48; 16 → Millions → 1-bit keeps the mask (`[1,1,16] → [1,0,16] → [1,1,2]` as `[shape, quantize, palette size]`); a view without a mask does not inherit the mask of another view on the same display.

### 2.4 Mask in the browser

Temporary page `playground/_masktest/` (outside `rollupOptions.input`, deleted at the end) served by `npx vite -c vite.playground.config.ts`: magenta/cyan checkerboard background, a 240×240 square view with an ellipse and a 320×200 one with a 24 px `roundrect`, a gradient as the scene. Captures at 16, 1-bit and Millions, plus a base capture (the page with the canvas hidden); the analyzer predicts the mask with the shader's rule (center of each block) and compares it with the pixels where the capture equals the page:

| Capture | View | Visible page (px) | Mismatches with the prediction | Colors inside | Other |
|---|---|---|---|---|---|
| 16 | ellipse | 12 384 (≈ 57 600 − π·120² = 12 361) | 0 | 11 | 20×20 corners unchanged: 0 px changed |
| 16 | roundrect 24 | 508 (≈ 4·(24² − π·24²/4) = 494) | 0 | 15 | visible page outside the 24 px corners: 0 |
| 1-bit | ellipse | 12 384 | 0 | **2** | corners unchanged |
| 1-bit | roundrect 24 | 508 | 0 | **2** | outside the corners: 0 |
| Millions | ellipse | 12 356 | 0 | 28 537 | corners unchanged |
| Millions | roundrect 24 | 500 | 0 | 37 934 | outside the corners: 0 |

Outside the two views, 0 pixels changed in the three captures. `readPixels`: alpha 0 in the four corners, 255 in the center, 255 at 30 px along the edges of the `roundrect`. Step 16 → Millions read in the same `requestAnimationFrame` as the repaint: `stats.frames` 4 → 5, mode `millions`, 28 537 colors and a corner with alpha 0 (same mask). In Millions the edge changes only slightly because the block becomes 1 px (the mask is evaluated per block). No console errors.

### 2.5 4D.OS identical after the mask

The branch (with the mask and, at the end, with the final `smoothScroll`) built with `npx vite build` into a temporary `4d-os/` directory, served with `vite preview` and captured with the same capture script: **15 of 15 hashes byte-for-byte identical to the reference**, in both passes. The branch bundle includes `uMaskShape` and the reference's does not. Smoke script on `/4d-os/`: 0 console errors.

### 2.6 `setupSmoothScroll({ resetToTop })`

- Tests in `src/core/shell/shell.test.ts` (5 new, with doubles for Lenis, gsap, ScrollTrigger, `window` and `history`): with no arguments and with `true` → `scrollRestoration = 'manual'`, `ScrollTrigger.clearScrollMemory('manual')`, `scrollTo(0, 0)` and Lenis with `{ lerp: 0.12 }` as before; with `false` → it touches neither `scrollRestoration` nor the position, and Lenis gets `{ lerp: 0.12, anchors: true }`; with reduced motion there is no Lenis for any value; the teardown removes the ticker and destroys Lenis.
- **Pre-existing bug found and fixed.** In the reference commit, `/4d-os/a/` did **not** start at the top on reload: after scrolling to y = 4800 and reloading, it stayed at 4800 with `history.scrollRestoration = 'auto'`. Cause: ScrollTrigger stores the mode that was set when it registered (`'auto'`) and restores it on every `refresh`, overwriting the `'manual'` set by `setupSmoothScroll`. Fix in the `resetToTop` code path (the 4D.OS one): `ScrollTrigger.clearScrollMemory('manual')`, so ScrollTrigger remembers `'manual'`. The `false` code path (landings) does not change.
- Browser (reload-to-top script, wheel scroll to 4800 and reload): in `npm run dev`, `/a/` through `/e/` stay at y = 0 in all four readings (0, 0.5, 1.5 and 3 s) with `'manual'`; in the build (`vite preview`) and in `wrangler dev`, `/4d-os/a/` behaves the same. No console errors.

### 2.7 Stills

- Stills check: the five WebP files are VP8L (lossless), measure 1200×900 and **match their PNG in `public/launcher/` pixel for pixel**. Weight: 56 976 + 158 902 + 141 052 + 32 604 + 33 932 = **423 466 B (423 kB)**, versus 700 507 B as PNG.
- `provenance.json` extended without removing fields: per image, `world`, `route`, `source`, `capture`, `method`, `captured` (date), `synthetic: true` and `credit` (A, B and C with the cat credit line; D and E `null`). E has `capturedNote`: the date is that of the commit that added the review capture (the one that brought landings D and E); the time was not recorded. It was checked that `e-whale-fall.png` is exactly the (0, 0) crop of `.impeccable/review/e-hero-55.png`.
- `impeccable embed-prompt <webp> --prompt-file …` with each image's origin (pre-existing raster, not generated: origin, method, date, synthetic scene and credit). For WebP the tool uses its *sidecar* `<file>.webp.json` next to the image; the WebP files do not change (same SHA-256 and same pixels). `impeccable embed-prompt --scan playground/public/landings/_shared/stills` → `SCAN: 5 rasters, 0 missing` (before: 5 missing).

### 2.8 Shared index and checker

- `checkIndexHtml(html)` in `src/playground/shared/worlds.ts`: returns the list of problems (empty if the index complies). It requires a real `<a href>` to each world and to the launcher; in each world's card (the largest element that contains its link without linking to another world), the name, the line (with typographic quotes treated as equivalent to straight ones), the "synthetic scene" label, an `<img src>` of the shared image with `alt` and, in A, B and C, the textual credit; and exactly three `data-lab-slot` elements, with no links or dates. It ignores scripts, styles and comments.
- `worlds.test.ts` (15 tests): routes from `/4d-os/a/` to `/4d-os/e/` and `/4d-os/`; **credit read from `LICENSES.md`** and equal to `CAT_CREDIT.text`; the checker accepts a complete index and markup variants, and fails with fixtures that are missing a link, have an extra lab slot, contain a slot with a link (inside or around it), show a date, lose or change the credit, or change the line, the label or the image.
- On the current HTML of the three landings (under construction), the five cards and the launcher already pass; all three only need to mark their three lab slots with `data-lab-slot`.

### 2.9 to 2.12 Shared modules (vitest)

- `sound.test.ts` (8): starts off without creating a context; with `on` saved, it starts on but without an `AudioContext` or oscillators until the first `pointerdown` or `keydown`; with a `localStorage` that throws, it works, starts off and the toggle changes; it saves `playground:sound`; with the tab hidden, the context is suspended and nothing sounds; master at 10^(−18/20) → compressor → destination; cap of 24 voices; `bindSoundToggle` (new, additive) sets `aria-pressed` and "Sound off" / "Sound on" and follows the changes.
- `motion.test.ts` (2): initial value of `(prefers-reduced-motion: reduce)` and live notification to subscribers, with unsubscribe.
- `probe.test.ts` (5): with WebGL2 → true, and it releases the context; without WebGL2 or if it throws → false; it probes only once; `importIfWebGL2` (new, additive) does not request the chunk without WebGL2 and requests it once with WebGL2.
- `displays.test.ts` (5): current mode on registration, `setMode` changes all of them, a new view inherits, synced controls receive every change, a removed view no longer changes.

### 2.15 Comparison page

- Fixes: the intro said "nothing is saved or sent", which was false because the landings store the sound preference (D11, D15): it now reads "All three are demos."; the thumbnails were 900 px tall because the `height="900"` attribute won over `aspect-ratio`: `.thumb` adds `height: auto`.
- Comparison-page script at 1440×900 and 390×844: three links with a name and a single line; 0 fields, buttons or canvases; 0 web fonts (`system-ui`); no horizontal scroll (`scrollWidth` 1440 and 390); minimum contrast 7.37:1; Tab goes through the three links and the two in the footer in order, all with `:focus-visible` (3 px `#1d4ed8` outline or the browser's ring); each link opens its route with the title "<Name> · crewtives playground".
- **Pending item recorded:** the thumbnails `/landings/_shared/compare/{game-center,wind-up-empire,bloomscope}.webp` do not exist yet (404, three "Failed to load resource" console errors); they are captured at the end. No placeholders were created. No task in `tasks.md` currently names that capture.

### 2.16 Base

- In the shared working tree, midway through the work: `npm test` → 26 files, 268 tests green (with the landings' in-progress tests); `npm run typecheck` failed because of a file under construction from another landing (`src/playground/bloomscope/scope/diag.test.ts(13,11): TS6133`), not because of the base. That is why the base was also verified in isolation (below).
- In the shared working tree, at the end: `npm test` → 30 files, 340 tests green; `npm run build` → exit 0 (typecheck included); root of `dist/` = `4d-os/` and `landings/`; `dist/packs` does not exist.
- The isolated base: a `git worktree` of the base commit plus exactly the changes in this section (patch + new files), with `node_modules` linked. `npm run typecheck` → 0; `npm test` → 22 files, 209 tests; `npm run build` → 0, root of `dist/` = `4d-os/` and `landings/`, no `dist/packs`. Worktree removed at the end.
- `cp cloudflare/_redirects cloudflare/.assetsignore dist/` (in the worktree's `dist/`) and a local `wrangler dev` server: `/` → 302; `/packs/cat-stairs/scene.json` → 404; `/4d-os/` and `/4d-os/a/` through `/4d-os/e/` load with 0 errors and 0 failed requests (smoke script); **15 of 15 hashes equal to the reference in 1.5**; `/4d-os/a/` starts at the top on reload.
- Skeleton script on `wrangler dev`: `/landings/` and the three skeletons respond 200 with their title; the skeletons with 0 console errors, `/landings/` only with the three 404s from the pending thumbnails. Opened with `#worlds` (the response was served with a 250vh hero and a 100vh index so that the anchor implies scrolling, without touching files), all three end up with `#worlds` at y = 0 (`scrollY` 2291, `scrollRestoration` `auto`), with and without reduced motion. With `getContext('webgl2')` forced to `null` by an init script: `data-webgl2="false"`, 0 errors and no script with three (the skeletons do not import three yet: the conditional loading of the chunk is covered by `importIfWebGL2` and its test).

## Integration (7.1–7.4)

Date: 2026-09-25. Branch `feat/playground-landings` with the working tree as it was (landings uncommitted). Scripts outside the repo (a JS graph script, the cross-pass script and a DIP-switch script), plus the capture, reload-to-top and smoke scripts from the platform verification. Playwright 1.62.1 (Chromium, SwiftShader). No deploy or commits.

### 7.1 Integrated build

- `npm run typecheck` → exit 0. `npm test` → 39 files, 459 tests green. `rm -rf dist && npm run build` → exit 0 (only Vite's warning about chunks > 500 kB, which comes from 4D.OS).
- Root of `dist/`: `4d-os/` and `landings/`; `dist/packs` does not exist. `dist/landings/`: `_assets`, `_shared`, `game-center`, `wind-up-empire`, `bloomscope`, `index.html`.
- `grep -rl` over `dist/`: "THESIS", "OWN-WORLD", "FIRST VIEWPORT", `9365b33c`, `852db97b`, `50846703` → 0 files each. Case-insensitive, the only hits are `.world__thesis` (a 4D.OS class, already in `main`) and `font-synthesis` (CSS), which are not brief text.

### 7.2 Budget (D14) and fonts

Served with `cp cloudflare/_redirects cloudflare/.assetsignore dist/` and a local `wrangler dev` server. JS in gzip bytes (zlib level 9 over the files in `dist/`); "startup" = scripts the page requested at 1440×900 until `networkidle` + 3 s (includes `three.core`, 62 288 B, and the dynamic ones); "full closure" = everything reachable from the entry through static and dynamic imports (upper bound, includes the fallbacks without WebGL2 and the lazy sections). First load = sum of Playwright's `responseBodySize + responseHeadersSize` (wrangler serves JS/CSS/HTML with gzip; fonts and images unencoded).

| Page | Startup JS (files / B gzip) | Full-closure JS (files / B gzip) | First load 1440×900 (requests / B transferred) | Decoded | Cap |
|---|---|---|---|---|---|
| `/landings/game-center/` | 17 / 223 798 | 32 / 257 767 | 34 / 784 855 | 1 435 674 | JS ≤ 350 000, load ≤ 2 000 000 ✓ |
| `/landings/wind-up-empire/` | 18 / 241 436 | 21 / 247 988 | 30 / 863 491 | 1 522 102 | ✓ |
| `/landings/bloomscope/` | 18 / 240 901 | 19 / 244 734 | 28 / 890 583 | 1 554 072 | ✓ |
| `/landings/` | 0 / 0 | — | 4 / 2 094 (3 are the thumbnail 404s) | 3 936 | ✓ |

Fonts (`@font-face` in the CSS files in `dist/`): Game Center = Bungee, Bungee Shade, DotGothic16 (Latin in a file; the Japanese subset for the glossary goes inline as `data:font/woff2` inside the site's CSS), M PLUS Rounded 1c 400/800; Wind-Up Empire = Tilt Warp, Rampart One, Libre Franklin 500/700, Sono; Bloomscope = Ultra, Recursive Casual, Recursive Mono. 4D.OS = Host Grotesk, Departure Mono, Bricolage Grotesque, Geist Pixel, Archivo, Big Shoulders Stencil, Doto, Permanent Marker, Tektur, Jura, Science Gothic, Handjet, Atkinson Hyperlegible Next ("E Instrument" is a local alias of Atkinson and Handjet). No family repeats between landings or with 4D.OS. All are served from `/landings/_assets/` (0 requests to other origins in every pass) and have a row in `LICENSES.md` and their license text next to the file. All OFL-1.1 except Ultra (Apache-2.0), which `playground-hub` allows ("an OFL license or an equivalent free license … Apache-2.0, like Permanent Marker").

### 7.3 4D.OS regression on `wrangler dev`

- `/` → 302 to `/4d-os/`; `/packs/cat-stairs/scene.json` and `/4d-os/packs/cat-alley/scene.json` → 404.
- Smoke script on `/4d-os/` and `/4d-os/a/` through `/4d-os/e/`: 0 console errors and 0 failed requests on all six.
- Reload-to-top script on `/4d-os/a/`: scroll to y = 4800 (`scrollRestoration` `manual`) and reload → y = 0 at 0, 0.5, 1.5 and 3 s; 0 errors.
- Capture script: **15 of 15 hashes byte-for-byte identical to the table in 1.5**, none unstable, 0 console errors.

### 7.4 Cross pass (cross-pass script)

- **Routes:** all four respond 200 with their title ("Three candidate landings", "Game Center Yonjigen", "Wind-Up Empire", "Bloomscope" · crewtives playground); `/landings` and `/landings/game-center` → 307 to the trailing slash. Every same-site link on the four pages (`/4d-os/`, `/4d-os/a/`–`/e/`, `/landings/`, the three landings and `/`) responds 200 (after the redirect). The three landings: 0 console errors and 0 failed requests.
- **Deep links** (new page with the fragment, `networkidle` + 3 s, 0 errors): Game Center `#1f` (top 0, y 0: it is the first section), `#2f` (y 1588), `#3f` (3657), `#4f` (5258), `#5f` (6545), `#rf` (7524), all with the target at top 0. Wind-Up Empire `#lid` (top 56, y 0: first section below the strip), `#worlds` (top 64, y 836), `#leaflet` (top 64, y 3735). Bloomscope `#scope` (top 0, y 0: first section), `#worlds` (925), `#sow` (2744), `#lathe` (4012), `#hive` (5286), all at top 0. None jumps back to the top. (The `href="#"` that appears in Wind-Up Empire is the link of the planet label, which receives the world's route when it opens; it is not an anchor.)
- **Without JavaScript** (`javaScriptEnabled: false`): h1 and static content present (Game Center 7484 characters, Wind-Up Empire 4455, Bloomscope 4400, `/landings/` 731); the three landings have the six links `/4d-os/a/`–`/e/` and `/4d-os/`, and the link to `/landings/`; `/landings/` has the three links to the landings and `/4d-os/`. The only "failed" requests are the `modulepreload` requests that Chromium blocks without JS.
- **Without WebGL2** (init script that returns `null` for `getContext('webgl2')`, scrolling through the whole page): no script with `three`, `Engine` or `RetroDisplay` requested on any of the three; honest line visible: Game Center "This machine's screen needs WebGL2. Here is a still, and the links all work.", Wind-Up Empire "Printed flight (static view). This browser has no WebGL2, so the tin orrery is printed flat…", Bloomscope "Your browser has no WebGL2, so the toys run in flat 2D."; 0 errors.
- **Reduced motion** (`reducedMotion: 'reduce'`, two captures 2 s apart at three page heights, 0, ⅓ and ⅔): Game Center, Bloomscope and `/landings/` byte-for-byte identical at all three heights, 0 running animations. Wind-Up Empire: 0 running animations; the only difference is the "Tin" drum in the fixed strip (26×14 px, 000069 → 000072), which changes digits by cut with the mine's income; that is what its spec asks for ("the drums change digits without rolling"), not automatic motion.
- **390 px** (390×844, dpr 2, touch, scrolling through the page): `scrollWidth` = 390 on all four, and `scrollTo(200, y)` leaves `scrollX` at 0. On Wind-Up Empire, `body.scrollWidth` reads 404 on load, clipped by the document (no horizontal scroll).
- **Network:** in every pass, 0 requests to other origins and 0 audio files (neither `media` nor audio extensions), also with the sound on.
- **What is stored:** on load, no page writes anything. After turning the sound on and off: Game Center, Wind-Up Empire and Bloomscope only have `playground:sound` (`off`). Game Center, with a DIP switch (SW6) flipped from `#rf` (DIP-switch script), also writes `game-center:service`. Declared: Game Center "sound setting, the service switches, and your Rain Run HI and best flight" (`playground:sound`, `game-center:service`, `game-center:rain-run:best`); Wind-Up Empire "stores nothing … The one exception: your sound setting"; Bloomscope "It only remembers your sound setting". No undeclared key. `game-center:rain-run:best` was not written in the browser (that would require finishing a game); its name comes from `rainrun/game.ts` and matches what is declared.
- **Pending (not created):** `/landings/` requests `/landings/_shared/compare/{game-center,wind-up-empire,bloomscope}.webp`, which still return 404 (three "Failed to load resource" console errors); the main work stream captures them.
- Servers: the local `wrangler dev` server was stopped at the end.

## Game Center Yonjigen: real-GPU and flash measurements (3.18, 3.22)

Measurements for tasks 3.18 and 3.22 that cannot come from a unit test. The scripts (a GPU script, a flash recorder and a flash counter) are not versioned: they are measurement tools and were kept outside the repo. They run against the development server (`npx vite -c vite.playground.config.ts`).

### Real-GPU performance (3.22), 2026-09-25

The GPU script: headed Chrome with normal vsync, driven over CDP. Each measurement lasts 10 s and combines
`engine.stats` with a performance trace (`DrawFrame` events). GPU: Apple M2 Pro (ANGLE Metal).

| Scene | engine.stats | rAF | Trace (DrawFrame) | p95 frame interval | Worst frame |
|---|---|---|---|---|---|
| 1F, Rain Run in ATTRACT | 87.4 fps | 87.4 fps | 88.6 fps | 12.6 ms | 40.1 ms |
| 4F, glass during POUR 50 | 87.0 fps | 87.0 fps | 87.0 fps | 15.4 ms | 44.1 ms |

Both scenes stay above 60 fps. The worst frame is a single hitch at the start of the measurement or of the POUR,
not a sustained drop.

**Hidden tab:** the same script opens a second tab in the same window and brings it to the front.
`visibilityState` becomes `hidden`, and for 4 s `engine.stats.frames` stays at 2619 and `sim.time` at 18.75.
On returning to the tab, both keep advancing. Playwright does not work for this test, because it emulates focus and
visibility, and there the tab never ends up hidden.

### Flashes (3.18), 2026-09-25

The flash recorder records the real frames with the CDP screencast, and the flash counter counts the
flashes. The measured surfaces are:

- the CRT in ATTRACT;
- Rain Run, from START to GAME OVER with three crashes, plus TIME VIEW;
- the glass and its cabinet during FEVER, with the lamps at 2 Hz and the tulips open;
- the gas sign, with the strike on arrival and STRIKE ALL.

Each surface is measured in 16, 1-BIT and MILLIONS, with and without reduced motion.

A flash is a pair of opposing changes in relative luminance of 0.10 or more. It is counted over the mean of
each region and also over windows the size of the WCAG flash area (341×256 px) within it.

- Worst case on the region mean: **1 flash/s**, on the CRT in ATTRACT in 1-BIT and in MILLIONS.
- Worst case in a WCAG-sized window: **2 flashes/s**, in Rain Run. Depending on the run, it appears with or without reduced motion.
- Limit: 3 flashes/s. Result: **PASS** in all 24 recordings.

With SwiftShader, headless, frame intervals are between 70 and 120 ms instead of 16 ms. That is enough to see
flashes of up to about 5 Hz. `HEADFUL=1` repeats the measurement with the real GPU.

FEVER is triggered by hand, with the same state and the same event as the 7th pocketed ball. With the default force,
a POUR 50 pockets no ball in the heso (0 of 50).

## Preview and wrap-up (7.5–7.8), 2026-09-25

### Final build
- `npm run typecheck`, `npm test` (39 files, 479 tests) and `npm run build` green.
- The root of `dist/` only has `4d-os/` and `landings/`, and `dist/packs` does not exist.
- Searching `dist/` for THESIS, OWN-WORLD, FIRST VIEWPORT or the seeds `9365b33c`, `852db97b` and `50846703` returns no results.

### Preview (7.6)
- `npm run deploy:preview` uploaded a new version without deploying it: 111 new files and 40 that were already there.
  - Alias: the preview URL
  - Version URL: the version's own preview URL
- Production did not change:
  - `wrangler deployments list` still shows the same production version at 100%, before and after;
  - `https://playground.crewtives.com/` responds 302 to `/4d-os/`;
  - `https://playground.crewtives.com/landings/` responds 404.

### Preview verification (7.7)
- With `curl`:
  - `/` responds 302 to `/4d-os/`;
  - `/landings/`, the three landings, `/4d-os/`, `/4d-os/a/` and `/4d-os/e/` respond 200;
  - `/packs/cat-stairs/scene.json` at the root responds 404;
  - the thumbnails `/landings/_shared/compare/*.webp` and the stills respond 200.
- With Playwright (Chromium with SwiftShader) on `/landings/` and the three landings, at 1440×900 and on iPhone 13:
  - no console or page errors;
  - no response ≥ 400;
  - no request to another origin;
  - no horizontal scroll (`scrollWidth` 390 on the phone).
- All internal links on the four pages resolve:
  - the three landings, `/landings/`, `/4d-os/` and `/4d-os/a/` through `/4d-os/e/` respond 200;
  - `/` responds 302.
- The preview screenshots were kept outside the repo.

### `impeccable-finish-reviewer` verdicts
- **Game Center Yonjigen:** ship in fix round 1.
- **Wind-Up Empire:** ship in round 1.
- **Bloomscope:** ship after the contract amendment for the "NOW" ruby.
- **Review of the set:** the three are distinguishable as thumbnails, at 1440 and at 390. The Wind-Up instruction sheet changed to orange.

### Pending
- Pass on a real phone (iOS Safari and Android Chrome).
- Native-speaker read of Game Center's Japanese.
- Choose the landing and promote it to `/` (step 6 of the Migration Plan: `cloudflare/_redirects` and `wrangler versions deploy`).
- The seeded simulations (Game Center's glass) repeat exactly in the same browser. Across JavaScript engines they can diverge, because `Math.sin` and friends round differently.
- At 390 px, Wind-Up's orbit is tight: a planet's touch target drifts away from its drawing while it passes under the rocket's grab zone, which the spec requires to be 120 px.
