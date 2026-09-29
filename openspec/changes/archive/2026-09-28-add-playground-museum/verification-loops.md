# Verification of the loop recording (3.1–3.7 and 4.1)

Date: 2026-09-25. A parallel work stream on branch `feat/playground-museum-loops`, on top of the commit that added this change's proposal, design, specs and tasks, with the collection commit merged in. Production build of that work stream (`rm -rf dist && npm run build && cp cloudflare/_redirects cloudflare/.assetsignore dist/`) served by a local `wrangler dev` server. Chromium from Playwright 1.63.0 (153.0.8010.12) with `--use-angle=metal`, renderer `ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)`.

The ad hoc verification scripts (a fixed-garden checker, plus a 4DLP dumper for the contact sheets) lived outside the repo. The recording tool is in the repo: `scripts/capture-loops.ts`.

## Recording command

```sh
rm -rf dist && npm run build && cp cloudflare/_redirects cloudflare/.assetsignore dist/
npx wrangler dev --port 8790 --ip 127.0.0.1          # in another terminal (the default --base of capture-loops.ts)
npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx scripts/capture-loops.ts <a|b|c|d|e|bloomscope|all> [--from-landings]
```

`--from-landings` records Bloomscope from `/landings/bloomscope/#g=…` (until the move in 10.1). The other options (`--dry-run`, `--json`, `--cpu`, `--budget`, `--shift`, `--show`, `--garden`, `--bloom-wait`, `--browser-arg`) are documented in the script header and serve the verifications below.

## 3.1 Pure core

`src/playground/museum/loops/`: `blocks.ts` (rectangle aligned to the view's grid, one pixel per block anchored at the bottom left, nearest upscaling, differing pixels, opacity and palette), `hash.ts` (SHA-256 with WebCrypto, the same in Node and in the browser), `format.ts` (4DLP: 80-byte header, 4 bpp, `[y][frame][x]`, low nibble for the even x; the caller applies the gzip) and `provenance.ts` (type, cadence, cap and `validateProvenance`). No dependencies; internal imports carry an explicit `.ts`.

`npx vitest run src/playground/museum/loops`: `blocks.test.ts`, `format.test.ts` and `provenance.test.ts` green.
- "Native dimensions": 1170 × 720 with block 3 gives 390 × 240, and the frame comes back identical when upscaled and sampled.
- Shifted rectangle: a width that is not a multiple of the block fails with "d, forward pass, frame 7: the rectangle 116 × 90 does not measure…"; one shifted by one pixel, with "d, forward pass, frame 7: N differing pixels…".
- A transparent pixel and one outside the palette fail with work, pass, frame and count ("1 non-opaque pixels", "1 pixels outside the work's palette (for example #0a141e)").
- 4DLP round trip with gzip, with an odd width (7 × 5) and with 390 × 240 × 45 frames: identical frames and the same hashes.

## 3.2 Recording script

- **Command without Playwright in `node_modules`:** `ls node_modules/playwright` → does not exist; the script resolves `playwright@1.63.0` from the npx cache (the `PATH` that `npx -p` adds) with `createRequire`, and rejects any other version.
- **`package.json`:** `git diff` against the base commit, limited to `package.json`: empty.
- **Procedure:** `page.clock.install` + `pauseAt` before `goto`; load and wait in real time with the clock stopped (1.5 s); after that, only `runFor`. DPR 1, `timezoneId: UTC`, `locale: en-US`, no reduced motion. The page is hidden with `opacity: 0` on every sibling along the ancestor chain of the engine's canvas (not with `visibility`, which takes the focus away from "Hold to sow"). Rectangle = the view's, measured like `Engine.measure`, aligned to its grid (`alignedRect`). Each frame is verified (`verifyFrame` + `checkPalette` against the work's `--pal-16-*` palette) before writing; a loop's files are written all at once into a temporary folder inside the loops folder and swapped in at the end.
- **Exact source frames in 4D.OS, without hooks:** `TimeController` always paints `floor(position)`, and with `page.clock` each 16 ms tick adds 0.48 frames; the script advances one tick at a time until the work's own timecode (`[data-now]`, "MM:SS:FF") shows the frame it is looking for, so it never skips it. Between two loop frames the page clock advances 64 or 80 ms (declared in `method.stepping`).
- **D with the correct rectangle:** ✓ 0 differing pixels in the 90 captures (FORWARD and REWIND).
- **Failures without writing** (in each case the hash of `playground/public/loops` is the same before and after, and no temporary folder is left behind):

| Case | Command | Result |
|---|---|---|
| Rectangle shifted by one pixel | `d --shift 1` | `✗ d: d, forward pass, frame 0: 221745 differing pixels between the capture and the upscaled native frame` |
| Text over the canvas | `d --show .mast` (D's title stays visible) | `✗ d: d, forward pass, frame 0: 11306 differing pixels between the capture and the upscaled native frame` |
| Budget forced low (3.4) | `d --budget 100000` | `✗ d: d, forward pass: weighs 178626 B with gzip and the cap is 100000 B` |
| Dirty tree (3.4) | `d` with `d/index.html` modified | `✗ d: d: there are uncommitted changes in its sources, so the commit would not describe what was recorded: M d/index.html` (restored with `git checkout`) |
| Angle differs from the garden (3.7) | `bloomscope --from-landings --garden '#g=…137.3…'` | `✗ bloomscope: bloomscope: Sow says "divergence 137.300°" and the fixed garden is 137.508°` |
| Without WebGL2 (3.7) | `bloomscope --from-landings --browser-arg --disable-webgl2` | `✗ bloomscope: bloomscope: the page says there is no WebGL2 (.nogl visible); Sow would be painted in 2D, without blocks` |

- **D's readouts outside the frames ("Work with captions over the canvas"):** the normal recording of D (with the title, the plotter readouts and the timeline on screen in the live page) gives 0 differing pixels and every pixel in the palette; the contact sheet shows no text.
- In the first run, `--show .mast` recorded without failing: the script was also hiding the children of the requested element. Fixed (the children of a shown element are not hidden) and verified with the failure in the table.

## 3.3 Passes

- A, B, C, D and E: FORWARD and REWIND; Bloomscope: FORWARD only. All with 45 frames at 15 fps (`LOOP_FPS`, `LOOP_FRAMES` from `provenance.ts`, no per-work values).
- In D's provenance, both passes list the same source frames (120, 122, …, 208 of `falcon-phi`), as do A–E (`published.test.ts`, which also checks against `validateProvenance`).
- REWIND: the script presses J four frames after the last one of the segment and captures each position when the work's timecode returns to that frame, with the work saying "REWIND −1.00×" (it checks this on every frame). In the contact sheets, the subject comes out in each work's rewind color: D's falcon and B's cat in magenta, the cat of A and C and E's whale in amber; in FORWARD, in cyan.

## 3.4 Provenance and guards

- One `provenance.json` per loop in `playground/public/loops/<id>/`, next to `forward.4dlp.gz`, `rewind.4dlp.gz` (A–E) and `poster.webp`.
- The poster is encoded in the browser (`OffscreenCanvas.convertToBlob('image/webp', quality 1)`, which in Chromium is lossless WebP), decoded right there (`createImageBitmap` without color conversion), and the recording fails if its hash is not that of frame 0. All six posters passed (5–16 KB).
- `src/playground/museum/loops/published.test.ts` ("Complete record"): validates each published provenance (`validateProvenance`, with the last frame of each pack), checks that each pass weighs what is recorded and that, decompressed and decoded with `decode4dlp`, it gives exactly its 45 hashes; that A, B and C show the same source frames; and Bloomscope's sowing (below).
- Dirty tree and forced budget: see the table in 3.2.

## 3.5 Fixed garden (Playwright parts)

- **"Always the same garden"** (the garden checker, two new tabs in the same context, one after the other, with `/landings/bloomscope/` + the `#g=` of `FIXED_GARDEN_HASH`): both give `mirror d5`, "D5 · 0° · 3 specimens · 18 beads", display `16` in Scope, Sow, Lathe and Hive, in the chamber "a sunflower", "an echeveria" and "a clockwise aloe" in that order, and in Sow "divergence 137.508°" and "seeds 610". OK.
- **"Same sowing":** three loads of the fixed garden with the same viewport, the same pointer emulation and the same sequence of the controlled clock (bloom finished and "Hold to sow" held for the same 44 steps) give the same "seeds N" counts at each step and the same hash of the Sow view at each step (see 3.6, which includes the slowed-down CPU).

## 3.6 Determinism

Three recordings of the whole collection: the one written to the repo (in the commit that added the recording script and the working passes), a second one (`all --dry-run --json`) and a third one with the CPU slowed down four times (`all --dry-run --cpu 4 --json`, CDP `Emulation.setCPUThrottlingRate`). Result: **990 frames compared, 0 differing hashes**; the source frames, the Sow seeds in each frame, the weights and the poster hashes also match. In addition, re-recording D (the `--show` run before the fix) rewrote its files with the same bytes.

## 3.7 Working recording

| Loop | Sheet | Viewport | Rectangle (device px) | Native | Colors | Source | FORWARD / REWIND bytes (gzip) | Poster (B) | Commit |
|---|---|---|---|---|---|---|---|---|---|
| a | 001 · A · Vitrine | 1440×900 | 921×516 at (258, 84) | 307×172 | 16 | 120–208 of cat-stairs | 144 335 / 144 296 | 7 970 | playground platform commit |
| b | 001 · B · Plate | 1440×900 | 1167×675 at (0, 0) | 389×225 | 16 | 120–208 of cat-stairs | 152 097 / 152 273 | 15 206 | playground platform commit |
| c | 001 · C · Leader | 1680×1050 | 1278×657 at (54, 145) | 426×219 | 16 | 120–208 of cat-stairs | 279 649 / 274 929 | 15 648 | playground platform commit |
| d | 002 · The golden stoop | 1440×900 | 900×900 at (0, 0) | 300×300 | 16 | 120–208 of falcon-phi | 178 626 / 176 943 | 6 682 | playground platform commit |
| e | 003 · Whale fall | 1440×900 | 1254×693 at (0, 0) | 418×231 | 16 | 120–208 of whale-fall | 478 736 / 455 630 | 14 672 | playground platform commit |
| bloomscope | 004 · Bloomscope | 1440×900 | 442×442 at (124, 228) | 221×221 | 16 | clock 0–2933 ms | 96 785 | 7 590 | Bloomscope review commit |

The 11 passes add up to 2 534 299 B; the heaviest is E's FORWARD (478 736 B), and none exceeds 1 000 000 B.

- **Framing:** A, C and E, their first-screen view (E without the partial column on the right). B, the full plate (16 × "−" with the page at the top: z = 1, the loop keeps running) cropped to the clear glass where the work centers the subject (to the left of `.desk__rail` and above `.sheet`, like `plateFrame`). C, with a 1680×1050 viewport (at 1440 its window measures 1040 px). D, the scene to the left of the plotter (`aside.tube`, opaque from x = 900). All in `CAPTURE` (`src/playground/museum/capture.ts`).
- **Each provenance records 0 differing pixels per pass** and every pixel in its palette (`published.test.ts`); the source frames of A–E are between 0 and 419 (cat-stairs) or 449 (falcon-phi and whale-fall); A, B and C list the same ones.
- **Bloomscope ("Recorded sowing"):** Sow section, angle "137.508" (the readout "divergence 137.508°", equal to `decodeGarden(FIXED_GARDEN_HASH).sow.toFixed(3)`), 610 seeds at frame 0, 698 at frame 44 and 610 + 2f at each frame f. Recorded prior state: pointer at (0, 0), "Hold to sow" focused with `preventScroll`, scroll at y = 2948 (the Sow view and the button fully in view), 12 000 ms of controlled clock since the first pressed flower head, and the page background set to `#fdfdf6` (`--pal-16-14`, the view's `SHEET`). Space held from just after frame 0 until the last one.
- **Sow wait:** with the bloom wait alone (3 106 ms) and with 6 000 ms, frame 5 had 621 seeds (620 were expected): the scroll that brings Sow into view jostles the Scope and its physics keeps the engine awake, so the first dt after pressing is not 0. With 12 000 ms the 45 counts give 610 + 2f, and with 30 000 ms the loop comes out byte-for-byte identical: the engine is already at rest. `SOW_SETTLE_MS = 12_000` in `capture.ts`, with the reason; the 1000/15 ms step was not touched.
- **"Bloom finished"** (the garden checker): an independent load of the fixed garden, without focusing the button and without sowing, with the same viewport, scroll and wait, gives in the Sow square the hash `74141b85…7653519`, the same as the recorded frame 0.
- **Angle differs from the garden** and **without WebGL2:** they fail without writing (table in 3.2).
- Working passes: they are re-recorded from the final routes in 11.5.

## 4.1 Format confirmed with the real passes

- **Build with the loops:** `rm -rf dist && npm run build` copies `playground/public/loops/` to `dist/loops/` (the playground's `publicDir`); `cp cloudflare/_redirects cloudflare/.assetsignore dist/` and a local `wrangler dev` server.
- **How the `.gz` arrives** (`curl -D -` on `/loops/d/forward.4dlp.gz`): `200`, `Content-Type: application/gzip`, no `Content-Encoding`, `Content-Length: 178626`, magic `1f8b` and byte-for-byte equal to the file (`cmp`), with `Accept-Encoding: gzip, deflate, br`, with `…, zstd` and with `br` only. The poster comes out as `image/webp`; `provenance.json` as `application/json`, with `Content-Encoding: gzip` if the client accepts it (transparent).
- **Precompressed `.br`:** with brotli 11, 2 534 299 → 1 890 938 B (25.4 % less across the 11 passes; from 15.1 % in D to 36.7 % in Sow). Tested on `wrangler dev` with `dist/loops/d/forward.4dlp.br` (151 583 B) and a `dist/_headers` that sets `Content-Encoding: br` on it: the runtime compresses it again (it serves 151 588 B) and sends `br` even when the client asks only for `gzip`. Not adopted (D5). The two test files were deleted from `dist/`.
- **Decoder in Chromium and WebKit** (an ad hoc decoder check outside the repo): `decode4dlp` and `frameHash` from `src/playground/museum/loops/`, bundled unchanged with the `esbuild` from `node_modules` (outside the repo), in a page on the same origin as `wrangler dev`. Each pass is requested with `fetch`, decompressed with `DecompressionStream('gzip')`, and its 45 frames are decoded plus six standalone jumps (44, 17, 0, 43, 22, 1). Chromium 153.0.8010.12 and WebKit 26.6 (Playwright 1.63.0): **0 differing hashes** in the 11 passes, and the 6 posters decoded with `createImageBitmap` (without color conversion) have the hash of frame 0.
- **Budget ("Published weight"):** no pass exceeds 1 000 000 B; the largest is E's FORWARD, with 478 736 B.
- **D5 updated:** version 1 of the header with its fields and offsets, file names, transport and `Content-Type`, brotli discarded with the reason, verification in both engines, table of measured weights (which replaces the estimate in Risks) and the fallback rule (shrink the framing in `CAPTURE`; without `DecompressionStream`, the poster).

## 12.6 Budget

Measured on 2026-09-25 on `feat/playground-museum`, at a commit merged into this work stream, with `rm -rf dist && npm run build && cp cloudflare/_redirects cloudflare/.assetsignore dist/` and a local `wrangler dev` server. **Note:** until 10.3, `cloudflare/_redirects` still sends `/` to `/4d-os/` with a 302, so to measure the museum at `/`, `dist/_redirects` was removed during the browser measurements and copied back at the end. No code was changed. Ad hoc scripts outside the repo, with Playwright 1.63.0's Chromium at 1440×900 and dpr 1. The instrumentation (counting `requestAnimationFrame` callbacks and 2D canvas draws, and noting, when a loop is requested, the distance from its sheet to the visible area) is injected with `addInitScript`, only in the measurement browser.

### JavaScript (gzip -9 of each file with `zlib`; in parentheses, the gzip figure from vite's output)

The entry and its imports are read from `dist/index.html` and from each chunk's static `import`s; the dynamic JS, from the `import()` calls and the `__vitePreload` dependency map.

| Initial museum JavaScript (entry + static imports) | Bytes | gzip -9 |
|---|---|---|
| `museum-DElFf6zg.js` (entry) | 21 985 | 8 435 (8.49 kB) |
| `probe-BjL-jt25.js` | 873 | 491 (0.49 kB) |
| `sound-CReF34FM.js` | 2 639 | 1 203 (1.21 kB) |
| `motion-CT8snZrE.js` | 269 | 211 (0.21 kB) |
| `preload-helper-BZ1Pz5am.js` | 1 218 | 688 (0.69 kB) |
| **Total** | **26 984** | **11 028 B = 10.8 KiB (vite 11.09 kB)** |

In addition, the HTML carries 57 B of inline `<script>`. **≤ 100 KB gzip: yes, at 11 %. No 3D code:** no chunk of three, `Engine`, `RetroDisplay` or `fold3d` in the initial load.

| Dynamic JavaScript (the fold) | Bytes | gzip -9 |
|---|---|---|
| `fold-B4eBOfJs.js` (`import()` from the entry) | 2 460 | 1 266 (1.26 kB) |
| `fold3d-BBvYgjpe.js` | 5 989 | 2 589 (2.59 kB) |
| `three.core-zluXCQie.js` | 233 958 | 62 353 (63.19 kB) |
| `Engine-ZjGNlVER.js` (with three's renderer) | 355 515 | 85 038 (85.86 kB) |
| `RetroDisplay-OFQUJxjz.js` | 8 639 | 3 637 (3.64 kB) |
| `palette-BR9UIX7m.js` | 1 602 | 912 (0.91 kB) |
| **Dynamic total** | **608 163** | **155 795** |

**All of the museum's JavaScript, with the fold: 635 147 B, gzip -9 166 823 B = 162.9 KiB (vite 168.54 kB). ≤ 350 KB gzip: yes, at 48 %.** 90 % of it is three (`three.core` and `Engine`), and it only arrives with the fold. `smoothScroll` (Lenis and gsap, 49.48 kB) is not in the museum's graph.

### First load at 1440×900 ("First load")

Cold load, `load` + `networkidle` + 4 s, with no scroll or interaction. Bytes transferred per request (`request.sizes()`: body as it arrives plus the response headers):

| Type | Transferred |
|---|---|
| Document `/` (268 417 B uncompressed, served with gzip) | 60 302 B |
| Fonts (Geologica, Fira Mono 400 and 500) | 58 613 B |
| JavaScript (the 5 files of the initial load) | 12 325 B |
| Museum CSS | 4 964 B |
| Posters (all 6) | 68 863 B |
| Loops (only `/loops/bloomscope/forward.4dlp.gz`) | 96 974 B |
| **Total, 17 requests** | **302 041 B** |

**≤ 2 MB: yes, at 15 %.** No request to `/4d-os/packs/` and no 3D chunk.

### Loops near the screen ("Loops near the screen")

- **On load:** only sheet 004 is on screen (distance 0), and it is the only loop requested. 001 is 1.35 viewport heights away and is not requested; 002, 3.01, and 003, 4.11.
- **Scrolling through the whole page with the wheel:** each FORWARD pass is requested when its sheet is less than one viewport height from the visible area. 001 (A, B and C) is requested at 0.85 heights; 002, at 0.51; 003, at 0.61. **Maximum 0.85 < 1.**

### REWIND on demand ("REWIND pass on demand", "REWIND never requested", "First time in REWIND")

- **No REWIND:** full walk down and up, K (HOLD), L (FORWARD) and the scrubber dragged from end to end in both directions. **0 REWIND passes requested.**
- **First REWIND at the very top** (only 004 nearby, and Bloomscope has no REWIND): **0 requests.**
- **First REWIND with sheet 002 on screen** (click on REWIND, which stays active): `a`, `b`, `c` and `d` `rewind.4dlp.gz` are requested (distance 0), and `e` (0.70). All are less than one viewport height away. No Bloomscope pass, which is at 2.78.

### Zero frames at rest ("Idle")

`requestAnimationFrame` callbacks and 2D canvas draws (`drawImage`, `putImageData`, `fillRect`, `clearRect`) over 10 s:

| State | rAF | Draws |
|---|---|---|
| Control: FORWARD with 004's VISTA on screen | 608 | 304 |
| **HOLD** (K), with the VISTA on screen | **0** | **0** |
| **No VISTAS on screen** (FORWARD, scroll at y = 6123, no VISTA in the viewport) | **0** | **0** |
| **Hidden tab, emulated** (FORWARD; `document.visibilityState = 'hidden'` and a `visibilitychange` event) | **0** | **0** |
| Visible again, 3 s | 183 | 92 |

**Real hidden tab:** in headless Chromium, neither bringing another tab to the front nor minimizing the window through CDP (`Browser.setWindowBounds`) changes `visibilityState`. The page stays `visible` and the museum keeps animating (603 rAF), as it should. That is why the case was emulated. The emulation proves that the museum stops its loop when it receives `visibilitychange`, because the browser kept delivering animation frames. It still needs to be confirmed with a truly hidden tab, in a headed browser.

## 11.5 Final recording

2026-09-25, on `feat/playground-museum` at the commit that moved Bloomscope to `/bloomscope/` (merged into this work stream): Bloomscope at `/bloomscope/`, `_redirects` without the 302 from `/`, links back in A–E, MiB and `worlds.ts`. Same procedure as in 3.7 (`capture-loops.ts all`, without `--from-landings`), on `dist/` with `_redirects` and `.assetsignore` copied, served by a local `wrangler dev` server. Recorded routes: `/4d-os/a/` to `/4d-os/e/` and `FIXED_GARDEN_LINK` (`/bloomscope/#g=…`), with Sow at `SOW_SETTLE_MS` = 12 000 ms. Before recording, `/landings/bloomscope/` answers 301 to `/bloomscope/`, and `/` answers 200.

- **Before recording, the build warned about all six works:** "[museum] sheet 001, loop a: recorded at [working-recording commit] (2026-09-25); the work has changed since (now [current commit]). Re-record." (the same for b, c, d and e; for 004, with its own recording commit). The HTML had 4 title blocks with "the work has changed since": 001, which shows one warning for its three loops, 002, 003 and 004.
- **Recording:** all six works with ✓ in 2 min 14 s. In each provenance, 0 differing pixels in each pass and `commit` = the full hash of that commit, the last commit that touched each work's `sources`. For 004 those sources include `playground/landings/bloomscope` and `playground/bloomscope`.
- **Frames identical to the working recording:** the 990 hashes (11 passes × 45 frames), the weights and the posters match those of 3.7. Neither the move, nor the link back (DOM, hidden like the whole page), nor the MiB change a single canvas pixel. `git diff --stat` only shows one changed line in each `provenance.json` (the `commit`) and two in Bloomscope's (also the `route`, from `/landings/bloomscope/#g=…` to `/bloomscope/#g=…`); no `.4dlp.gz` or `poster.webp` changed its bytes. The date is still `2026-09-25`, because it was recorded the same day.
- **Final weights** (as the site transfers them, equal to those of 4.1): A 144 335 / 144 296 B; B 152 097 / 152 273 B; C 279 649 / 274 929 B; D 178 626 / 176 943 B; E 478 736 / 455 630 B; Bloomscope 96 785 B. In total, 2 534 299 B.
- **"Only the loops change":** `git status --porcelain` shows only the six `playground/public/loops/*/provenance.json` (and the untracked `node_modules` symlink, local to that checkout).
- **"Identical works":** `dist/4d-os/` and `dist/bloomscope/` from the build before recording, copied outside the repo (160 MB), against those of a new build after recording: `diff -r` empty for both (exit 0).
- **No warnings afterwards ("Re-record"):** the later build writes no `[museum]` warning, and the HTML has no "the work has changed since". The six provenance lines say "… recorded 2026-09-25 from the live render at [commit]" (for 004, "… · forward only · recorded 2026-09-25 from the live render at [commit] · open the recorded garden"). The two working-recording commits no longer appear on the page.
- **Trail of 004:** the épure of sheet 004 comes from the seeds in the new provenance: `<desc>` "…: 698 seeds. The loop covers seed 609, the newest at the first frame, to seed 697, the newest at the last frame…"; 1 576 points (698 in plan and 698 in elevation, the 89 of the segment in each view and the 2 NOWs). The provenance records 610 + 2f seeds at each frame f.
- **Tests:** `npx vitest run src/playground/museum`: 12 files and 109 tests green, with `published.test.ts` over the new loops (validation, decoding to the 45 hashes of each pass, the same source frames in A, B and C, and 610 + 2f in Sow). `npx tsc --noEmit` clean. In the full suite (`npx vitest run`), one to three physics tests unrelated to the museum (`whaleFall.test.ts`, `crane.test.ts`, `parlour.test.ts`) exceed their 5 s limit when they run in parallel ("Test timed out in 5000ms"). On their own, all three pass (56 tests).

## 14.3 Provenance in each published raster

2026-09-25, on the merge of `feat/playground-museum` that closed task 11.5. CLI: `impeccable embed-prompt`.

- **Inventory of the museum's rasters:** `find playground/public/loops src/playground/museum playground/index.html` looking for png, webp, jpg, gif, avif, bmp and ico finds only the 6 `playground/public/loops/*/poster.webp`. In `src/playground/museum/` there are no rasters: `fonts/` has woff2 files and the OFL licenses. The built HTML (`dist/index.html`) references only those posters as images (`/loops/<id>/poster.webp`); the museum CSS, only the woff2 fonts. The épures and the fold's axonometries (`dist/museum/fold-*.svg`) are SVGs generated at build time, not rasters.
- **Scan before:** `impeccable embed-prompt --scan playground/public/loops src/playground/museum` gave `MISSING` for the 6 posters (`SCAN: 6 rasters, 6 missing`).
- **Embedded origin:** the posters are not generated rasters, so each one carries its real origin, assembled from its `provenance.json`. For example, D's: "Origin: not generated. Frame 0 of the FORWARD pass of loop d (002 · The golden stoop), recorded from the live render of /4d-os/d/ at commit [commit] on 2026-09-25, one pixel per display block (300 x 300, 16-colour palette), saved as lossless WebP and verified identical to that frame (SHA-256 0417e7c4…d2 over RGBA). Full record: provenance.json in this folder." For WebP the CLI uses a sidecar (`EMBEDDED: …/poster.webp.json (sidecar fallback for this format)`), like the landings' stills (`a.webp` and `a.webp.json`). The `poster.webp` files do not change by a single byte (`git status` only shows the 6 new `poster.webp.json`); `--read` returns the text.
- **Scan after:** `SCAN: 6 rasters, 0 missing`.
- **"Poster identical to the first frame":**
  - `dwebp -pam`, without color management, on each poster: the SHA-256 of the RGBA is the `poster.hash` (that of frame 0 of the FORWARD pass) for all 6.
  - In the browser (the ad hoc decoder check, `createImageBitmap` without color conversion, on what `wrangler dev` serves from the new build): 0 differing in Chromium 153 and in WebKit 26.6.
  - The `ICCP` chunk that Chromium writes into the posters (456 B) is Google/Skia's sRGB profile: it does not change the decoded pixels, and when the `<img>` is painted it is equivalent to the canvas's sRGB.
- **`published.test.ts`:** adds one case per poster.
  - It checks that the poster is RIFF/WEBP with a `VP8L` chunk (lossless, never `VP8 `) with the native frame's width and height.
  - It checks that its `poster.webp.json` sidecar names the `poster.hash` and the `commit` of the current provenance. This way, if a loop is re-recorded, the script replaces its whole folder, the sidecar is lost and the test fails until 14.3 is repeated.
  - The pixel comparison stays with `dwebp` and the browser, because Node does not ship a WebP decoder and the change does not call for adding a dependency.
  - `npx vitest run src/playground/museum`: 12 files and 115 tests green; `tsc --noEmit` clean.
- **No stale loops:** `playground/public/loops/` is not in any sheet's `sources`. The build after embedding gives 0 `[museum]` warnings.
- **Publication:** the build copies the sidecars to `dist/loops/<id>/poster.webp.json`, next to each poster.
