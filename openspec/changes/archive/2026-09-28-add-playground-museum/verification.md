# Verification of add-playground-museum

Date: 2026-09-26. Branch `feat/playground-museum`, on top of `feat/playground-landings` (at the commit that archived `add-playground-landings`). Final code in the commit with the minor fixes from review round 3, plus the documentation (the 14.6 commit) and this file. The loop recording and its verification (3.x, 4.1) are in `verification-loops.md`; everything else is here. The ad hoc verification scripts and their logs were never part of the repo and no longer exist. What remains of them are the figures recorded here.

## Status

- **Tasks:** 79/79. Task 15.7 does not publish: it reports the preview URL and asks for explicit approval before `npm run deploy` (rollback with `wrangler rollback` to the previous production version).
- **Design verdict:** `ship` (final round of 14.5, no material fixes).
- **Preview uploaded without deploying:** a new Worker version, served at the preview URL.
- **Production unchanged until approval:** it stayed on the previous version (`wrangler deployments list` before and after uploading the preview), with `https://playground.crewtives.com/` answering 302 to `/4d-os/`.
- **Published to production on 2026-09-28**, after explicit approval, from `main` (with the change already archived). See "Production", below.

## 15.1 Clean integrated build

- `npm run typecheck` (`tsc --noEmit`): no errors.
- `npm test`: 638/638 with `npx vitest run --maxWorkers=4`.
  - With the default parallelism and the machine under load (load between 13 and 17), two runs gave 637/638.
  - The one that fails is `src/scenes/whaleFall.test.ts` › "fixed topology…", because of the 5 s timeout.
  - On its own, that file passes 14/14 in 11 s.
  - The branch has not touched `src/scenes` or any 4D.OS source since the commit that added the links back and MiB to 4D.OS (2026-09-25; the final loops were recorded at that commit): `git diff --stat` from that commit to `HEAD` over `src/core src/flavors src/shared src/scenes index.html src/launcher.css` is empty.
- `rm -rf dist && npm run build`: green, with 0 `[museum]` warnings, so no loop is stale against its work's sources.
- No `dist/packs`.
- `grep -r` over `dist/` for "THESIS", "OWN-WORLD", "FIRST VIEWPORT", "SIGNATURE INTERACTION", "MOTION GRAMMAR", `68faf439`, "Named Rules", "Closed World", "Do's and Don'ts", "QUALITY BAR" and `craft-floor`: no results.
- Recording code in `dist/` ("Clean published output"):
  - `capture-loops`, `pauseAt`, `runFor(`, `verifyFrame` and `alignedRect` do not appear outside `dist/loops/*/provenance.json`.
  - The six `provenance.json` files name the script on purpose, because they are each loop's declared provenance. That is why they are excluded from the search.
- `git diff feat/playground-landings -- package.json`: empty ("No new dependencies").
- `npx openspec validate add-playground-museum --strict`: valid.

## 12.6 Budget (production build, 1440×900, ad hoc script)

| Measure | Figure | Cap |
|---|---|---|
| Initial JavaScript (gzip -9 of the files requested on load) | 12 437 B: `museum` 9 844, `sound` 1 203, `preload-helper` 688, `probe` 491, `motion` 211 | ≤ 100 KB, no 3D code (no 3D chunk requested) |
| All JavaScript, fold included (fold 003 and press J) | 169 474 B: adds `three.core` 62 353, `Engine` 85 038, `RetroDisplay` 3 637, `fold3d` 3 043, `fold` 2 054, `palette` 912 | ≤ 350 KB |
| First load (bytes transferred, 17 requests) | 328 678 B: document 84 733, fonts 58 613, posters 68 863, loop 96 974, JS 13 712, CSS 5 783 | ≤ 2 MB |

- **Loops on load:** only `loops/bloomscope/forward.4dlp.gz`, the sheet on screen ("Loops near the screen").
- **REWIND:** no REWIND pass before J. After J, those of D and E are requested, the sheets near the screen ("REWIND pass on demand").
- **Idle:** 0 rAF callbacks and 0 draws, in HOLD and with reduced motion (browser suite, 5.3 "HOLD (2 s)" and 12.1; cross pass, 10 s idle).

## Weight per pass (`dist/loops/`, gzipped 4DLP)

| Loop | FORWARD | REWIND | WebP poster |
|---|---|---|---|
| a | 144 335 | 144 296 | 7 970 |
| b | 152 097 | 152 273 | 15 206 |
| c | 279 649 | 274 929 | 15 648 |
| d | 178 626 | 176 943 | 6 682 |
| e | 478 736 | 455 630 | 14 672 |
| bloomscope | 96 785 | — | 7 590 |

The 11 passes add up to 2 534 299 B and the 6 FORWARD passes to 1 330 228 B. All are under the 1 MB cap per pass. Bloomscope has no REWIND ("Work without a REWIND pass").

## Browser verification (ad hoc suite, 137 scenarios)

- It runs with Playwright 1.63 and Chromium 153 with SwiftShader, against the dev server.
- Each scenario carries the name of the one in the specs and saves its measured evidence. Frames are checked by hash: each VISTA canvas, reduced by its k, is looked up in `provenance.json` and compared with the clock position.

**Runs:**
- On the commit with the round 2 fixes: 137/137.
- On the final code commit: 136/137. "Jump with sound (003)" failed: the sound was right (1 oscillator, 0 noises), but with load 15 the smooth scroll of about 5 000 px did not finish in 2 s and the sheet stayed 302 px from the edge. With the jump part repeated: 8/8, with 003 at 90 px.

**Adaptations of the suite to the final design** (they came from tests written before the review; they did not change the criterion of any requirement):
- **The clock position is read from the scrubber's `--pos`.** `aria-valuenow` stays still while the clock runs, so as not to talk nonstop to a screen reader (fix #26 of the review).
- **The poster is painted on the VISTA canvas.** A canvas that has not yet drawn from a pass counts as a poster.
- **The scrubber chases the requested position** (2 frames per step, turn limited to 1/3 s). `holdAt` waits for the clock to arrive.
- **The dihedron is repainted inside `paintAll`**, before `paintClockUi` moves `--pos`. The hook reads the clock in the next microtask.
- **Sheet 000 now has its fold.** "Sheet 000 SHALL fold like the others" is verified: F with the focus on 000 folds 000.
- **After the jump by number, focus stays on the sheet** (spec amendment).
- **The drag fold follows the gesture** and only stays folded past the halfway point. The test does the full travel.

**Highlighted figures:**
- **Integer scale ("Integer scale", 5.3):** at dpr 1, 1.25, 1.5, 2 and 3, the six VISTAS have buffer = native × k, with the maximum k per loop, uniform k×k blocks and **0 differing pixels on screen**, comparing the capture in device pixels with the upscaled native frame.
  - Before the commit that limited the alignment correction to fractional dpr, differences remained at dpr 2 (3 720 px in Bloomscope, 63 in B) and at dpr 3 (up to 830 px in E).
  - The cause was the player's alignment correction: with an integer dpr, the compositor already brings the layer to a device pixel, and shifting it by another fraction made it resample. Measured at 24 positions per dpr: without the correction, 0/24 bad cases at dpr 1, 2 and 3; with it, 5/24 at dpr 2 and 12/24 at dpr 3.
  - Now the correction is only applied with a fractional dpr, where it is needed: at 1.25, 8/24 fail without it.
- **From poster to loop without a jump (5.5):** 0 differing pixels and the same box before and after, at dpr 1, 2 and 3 (585 780, 2 343 120 and 5 272 020 px compared).
- **Flashes (12.5):**
  - With the scrubber at full speed, back and forth about 3 times per second for 4 s over 002 and 003, the maximum area that flashes more than 3 times per second in a 10° field is 4.0 % (D) and 5.1 % (E), against a limit of 25 %.
  - The worst case measured is 21 %, with the largest possible VISTA and S = 2 (D4). With S = 3 it reaches 26 %.
  - At the loop wrap there are no flashes.
  - A full sweep, from 1 to 45, takes about 1.5 s.
- **A single NOW (6.3, 6.5, 9.1, 9.2):** the VISTAS and the NOWs of elevation, plan, dihedron and axonometry match the clock position in every painted frame:
  - on the final code commit, 69/69 dihedron frames and 70/70 for the VISTA and the épure's NOW;
  - 38/38 with reduced motion and "Play loop";
  - 23/23 without WebGL2.

## 15.2 Cross pass over `dist/` on a local `wrangler dev` server

Pages: museum, Bloomscope, Game Center, Wind-Up Empire, and 4D.OS with its five worlds. Nine scenarios:
1. routes and 301s (including `#g=`);
2. deep links and ways back;
3. without JavaScript;
4. without WebGL2;
5. reduced motion;
6. no horizontal scroll at 390×844;
7. no external origins: 2 013 requests, all to the page's own origin;
8. no audio files;
9. what is stored matches what is declared.

**The museum passes all nine.** What it stores is `playground:sound` and `museum.shortcuts`, exactly as its colophon says. There is no sessionStorage, IndexedDB, Cache Storage, service workers, cookies, POST or beacons.

The 15 FAIL rows belong to pages or code this change does not touch (see "Pending"):
- visible controls without JavaScript on the three landings (no spec asks for it);
- 4D.OS without WebGL2 or without JavaScript: console errors and the boot stuck at 0 %, the same as in production (the version live before this change);
- the live switch to reduced motion in Bloomscope.

## 14.x Design review

- **Detector (14.2, `.impeccable/review/museum-detect*.json`):** 13 findings on desktop and 3 on phone, none pending.
  - "text-occlusion" (3): false positive. They are dt/dd inside a closed `<details>` (`checkVisibility()` = false).
  - "line-length ~189" (1): false positive. They are single-line texts, of 73 and about 100 characters; the detector estimates from the width of the box.
  - "cream-palette": the `#F5F4EF` paper is a confirmed decision (option "b" of the direction exploration, the luminous house).
  - Stripes and grid: La épura's visible grid.
  - Fonts outside `DESIGN.md`: documented in 14.6.
- **Round 1 (14.4):** `impeccable-finish-reviewer` with a clean context, plus four lenses (spec, accessibility, copy and craft) with adversarial verification. Disposition: `fix`, with 35 fixes, applied on three branches (layout, behavior and content) and merged.
- **Round 2 (14.5):** a new reviewer plus two verifiers of the 35 fixes: 32 resolved and 3 partial, one of which was refuted. Disposition: `recapture`, because the phone capture had the sticky bar halfway down the page.
  - Fixes:
    - the featured VISTA fits on screen between 760 and 1099 px;
    - the scrubber knob is solid while it chases;
    - the deep link opens without a focus ring;
    - 000 labels its band "1 : 1" with the grid;
    - on the phone, the wall text sits 1M from the rule.
- **Round 3:** the five fixes, verified as resolved. Disposition: `recapture`, because of two black VISTAS in the desktop capture.
  - It was the capture, not the page: the buffer was intact, and with GPU 2D canvas SwiftShader leaves large canvases black in a full-page capture. Captures are now taken with `--disable-accelerated-2d-canvas` (noted in `.impeccable/review/shots.json`).
  - Two minor ones, applied in the final code commit:
    - a square slot for the featured VISTA between 760 and 1099 px;
    - the ratio band goes under the bar and ignores the pointer.
- **Final round:** a new reviewer with the four valid captures. Disposition: **`ship`**, no material fixes. A verifier confirmed the two minor ones and a regression sweep.
  - Non-material details it noted:
    - in the index at 390, "420 / frames" breaks between the number and the word;
    - the "Enter" arrow shifts 3 px on hover.
  - A ceiling it does not reach within the contract:
    - there is no typographic moment at exhibition scale;
    - the wash is barely visible on the first screen;
    - there is a lot of passe-partout on 003 and on 001 B/C.
- **14.6:** `DESIGN.md` and `.impeccable/design.json` with the La épura world (`mu-*` tokens, a section "Playground: the 'La épura' museum" with the state of the routes) and the amendment of The Closed World Rule for the house's wash. `git diff` outside the new material only touches that rule, and `design.json` is valid JSON with the new world.

## 4D.OS regression

- The 1.4 reference was repeated on the build of that same commit (the 11.x routes report): 15/15 canvas hashes byte-for-byte identical (A–E × 16, 1-bit and Millions), the same boxes for windows, views and canvases, and 0 console errors.
- The only new elements are `a.playground-back` and its children. The text-width differences come from the change from "MB" to "MiB", all in weight rows.
- The 4D.OS sources have not changed since that commit (empty git diff, see 15.1).

## 15.5 Preview (at the preview URL)

- **200:**
  - `/`
  - `/bloomscope/`
  - `/landings/game-center/`
  - `/landings/wind-up-empire/`
  - `/4d-os/`
  - `/4d-os/a/` … `/4d-os/e/`
- **301:**
  - `/landings/` and `/landings` → `/`
  - `/landings/bloomscope/` and `/landings/bloomscope` → `/bloomscope/`
  - In the browser, `/landings/bloomscope/#g=…` ends up at `/bloomscope/#g=…` with the same fragment.
- **Loop pass** (`curl -I` with `Accept-Encoding: gzip, deflate, br, zstd`): `/loops/d/forward.4dlp.gz` answers 200 with `Content-Type: application/gzip`, no `Content-Encoding`, with 178 626 B identical to `dist/` and the magic bytes `1f 8b`.
- **Frame hash:** with 004's VISTA in HOLD at frame 17, its canvas has the hash of index 17 of the FORWARD pass in `provenance.json`.
- **Way back from each work:** a, b and c lead to `/#sheet-001`, d to `/#sheet-002` and e to `/#sheet-003`, with the sheet at 90 px, below the 60 px bar.
- **Deep link:** `/#sheet-002` lands at 90 px.
- **Sheet 000:** it is in the static HTML of `/`.
- **Weights:** in MiB.
- **Console:** no errors on any of the pages visited.

## Production (2026-09-28, `https://playground.crewtives.com/`)

- **How it was published:**
  - After the archiving, `main` was fast-forwarded and pushed to `origin`.
  - It was published with `npm run deploy`, which does the clean build, copies `cloudflare/_redirects` and `.assetsignore` and runs `wrangler deploy`.
  - `wrangler deployments list` shows the new version at 100 %. The previous one is the version that served the 302: `wrangler rollback` goes back to it.
- **Routes with 200:**
  - `/` (the museum, `<title>crewtives playground</title>`)
  - `/bloomscope/`
  - `/landings/game-center/` and `/landings/wind-up-empire/`
  - `/4d-os/` and `/4d-os/a/` … `/4d-os/e/`
- **Routes with 301:**
  - `/landings/` and `/landings` → `/`
  - `/landings/bloomscope/` and `/landings/bloomscope` → `/bloomscope/`
  - In the browser, `/landings/bloomscope/#g=…` ends up at `/bloomscope/#g=…`.
- **Loop pass** (`curl -I` with `Accept-Encoding: gzip, deflate, br, zstd`): `/loops/d/forward.4dlp.gz` answers 200 with `Content-Type: application/gzip`, no `Content-Encoding`, with the build's 178 626 B.
- **In the browser** (Playwright 1.63, Chromium with SwiftShader):
  - with 004's VISTA in HOLD at frame 17 (k = 3), the canvas hash is that of index 17 of the FORWARD pass in `provenance.json`;
  - `/#sheet-002` lands at 90 px, below the bar;
  - the way back from A, B and C leads to `/#sheet-001`, from D to `/#sheet-002` and from E to `/#sheet-003`, with the sheet at 90 px;
  - console without errors.

## Amendments and decisions during the apply

- **Spec amended during the review:**
  - the invariant "elevation = time" holds for every épure *of a work sheet*; on 000, the elevation is height;
  - after the jump by number, focus stays on the sheet (its `<article>`, labeled by its heading).
- **Sheet 000 folds:** its fold arrived in this change (13.3), so "Sheet 000 without the fold" does not apply. It labels its own ratio, "1 : 1", with the full grid.
- **Bloomscope footer:** the text change (#27 of the review) was deferred. It is a source of work 004, and touching it makes its recorded loop stale.
- **URL without a trailing slash:** `/landings` and `/landings/bloomscope` also have their 301 rule.
- **Integer scale:** the "compositor limitation at dpr 2 and 3" that was going to be documented does not exist. It was the alignment correction, and now it is exact at the five dpr measured (see above).
- **Captures:** the phone one is stitched from `scrollY = 0`, with the fixed clock moved to the foot of the document only for that capture. All are taken with software 2D canvas (see 14.x).

## Pending

- A pass on a real iPhone with a fractional dpr.
- A reading of the museum by someone who does not know the project.
- The playground section of crewtives.com.
- Game Center and Wind-Up Empire joining the collection, in another change.
- When archiving this change, rewrite by hand the Purpose of `openspec/specs/playground-hub/spec.md` (Migration Plan, step 7): museum, landings outside the collection, no comparison page.
- **From the cross pass, outside this change:**
  - Bloomscope, when switching live to reduced motion, keeps drawing for a few seconds. `motion.onChange` in `scope/controller.ts` only stops the ring; the fix is to call `settleOffline()`. It touches work 004, so it forces re-recording its loop.
  - Nor does it call `settleAria()` after `ring.set()`: the ring's `aria-valuenow` stays at 0.
  - Visible controls without JavaScript on the three landings (the museum's `html.js` pattern or a `<noscript>`).
  - 4D.OS without WebGL2: test for it before creating the renderer and show the reason in the boot window ("Failed load" scenario of `desktop-shell`).
  - rAF loops without drawing at rest on the landings and 4D.OS: about 64/s, 125/s in Bloomscope.
- **Museum polish the reviewer noted:**
  - not separating "420" from "frames" in the index at 390;
  - the "Enter" arrow that shifts on hover;
  - the Bloomscope footer text (#27), which implies re-recording its loop.
- **`npm test` with the default parallelism and the machine under load:** the `whaleFall.test.ts` timeout (see 15.1).
