# Design

## Context

The motivation is in proposal.md (Why). Current state that shapes the approach:

- **Playground build.** `vite.playground.config.ts` compiles from `playground/` (base `/`, `publicDir: playground/public`, `outDir: dist/`, `emptyOutDir: false`). Today its entries are `/landings/` and the three landings, filtered with `existsSync` (a missing entry disappears without an error), and its assets go in `landings/_assets`. The `noPacksAtRoot` plugin fails the build if packs appear in `dist/packs`. 4D.OS is compiled separately, with base `/4d-os/` and output `dist/4d-os`. `npm run build` runs `tsc --noEmit` before both builds.
- **Deploy.** `npm run deploy` and `npm run deploy:preview` copy `cloudflare/_redirects` and `cloudflare/.assetsignore` to `dist/`; `npm run build` does not copy them. That is why every check with `wrangler dev` over `dist/` copies them by hand first, as the previous change did. The only rule in `_redirects` is `/  /4d-os/  302`. The preview uses `wrangler versions upload --preview-alias` (currently with a hard-coded alias).
- **Packs.** `public/packs/<pack>/scene.json` carries `frameCount`, `fps`, `counts`, `source`, `files` and `synthetic`. `dynamic.bin` holds the subject's points per frame, in order (`src/core/pack/format.ts`), and `parseDynamic` works on an `ArrayBuffer`, so it also works in Node. `parseScene` requires `cameras.length === frameCount` and `parseDynamic` fails with "frame count mismatch" if `dynamic.bin` does not match; `writePack` (`src/core/pack/writer.ts`) builds consistent packs for tests. Real figures (weight = `packBytes`, the sum of `files`, without `scene.json`):

  | Pack | Frames | fps | Weight |
  |---|---|---|---|
  | cat-stairs (A, B, C) | 420 | 30 | 52 884 622 B |
  | falcon-phi (D) | 450 | 30 | 56 268 409 B |
  | whale-fall (E) | 450 | 30 | 55 367 475 B |

- **Reusable code:**
  - `Engine` paints zero frames at rest, with one canvas and DOM views.
  - `RetroDisplay` (pixelScale 3 by default). Per-block Bayer dithering with the token palette.
  - `DISPLAY_MODES`, `palette.ts` and `TimeController` (`src/core/time/TimeController.ts`): pure, with an exact `seek(f)`, and its playback already wraps around (`wrap`). It has no "loop mode": `TimeMode` is `'memory' | 'all'`, which is something else. `forward()` and `rewind()` step up the speed (1, 2, 4, 8) when repeated; `play(±1)` and `hold()` do not.
  - `src/core/views/tesseract.ts`: `tesseractVertices`, `tesseractEdges` and `project4`.
  - `src/playground/shared/{motion,sound,probe,displays}.ts` and `worlds.ts` (`WORLDS`, `LAUNCHER` with `name` and `line`, `STILLS`, `CANDIDATE_LINE`, `COMPARE_ROUTE`).
  - `smoothScroll` (`resetToTop:false`).
  - `packStats`, `formatDuration`, `packBytes` and `formatBytes`. Note: `formatBytes` divides by 1024 but labels "KB", "MB" and "GB"; it gives one decimal below 100, none from 100 up, and "N B" below 1024.
  - **Bloomscope: Sow, the seeder** (`src/playground/bloomscope/sow/`, verified in the code):
    - `sow.ts` is pure. `seedPosition(n, alphaDeg, c)` = [c·√(n+½)·cos(nα), c·√(n+½)·sin(nα)] and `seedScale(count)` gives the c of the flower head, which depends on the number of seeds: as seeds are sown, the whole head shrinks. `START_SEEDS` = 610 (the section opens with 610 seeds), `SOW_RATE` = 30 seeds per second while "Hold to sow" is pressed, `MAX_SEEDS` 2400 on desktop and 800 on phone. The cap is chosen by `main.ts` with `(pointer: coarse) and (max-width: 800px)`, not by the viewport width, and the same condition sets the Scope counts (10 or 18).
    - `controller.ts`: the bloom and the dial travel use `performance.now()`. Sowing uses the dt of the engine's animation frames (`Engine`, capped at 100 ms; 0 on the first animation frame after rest, because at rest the engine sets `lastTime` to 0). `page.clock` controls both. When the section enters there is a 700 ms fade-in and an initial bloom of 4 ms per seed. The bloom starts when the Sow section is 20% on screen (`onFirstView`, threshold 0.2, which calls `bench.bloom('sow')`), and `bloomDone` is set on the first animation frame after 610·4 + 650 = 3090 ms. On start, `bloom()` presses the first flower head: `.herbarium-strip` loses `li.herb-empty` and gains an `li` with `canvas.herb-thumb`, a hook-free signal that the bloom has started. "Hold to sow" (`this.el.hold`) sows one seed immediately when pressed (`begin()`, with the pointer or with Space or Enter without repeat) and stops on `pointerup`, `keyup` or `blur`; "Sow 100" sows 100 at once. The work's own readouts are in the DOM: "seeds N" (`.sow-seeds`) and "divergence …°" (`.sow-divergence`, with `toFixed(3)`).
    - The Sow view is `.sow-view`: square (`.sow-dial` with `aspect-ratio: 1` and `.sow-view` with `border-radius: 50%`), with an orthographic camera from −1 to 1, so its elliptical mask is the circle inscribed in its rect. It uses `RetroDisplay` with pixelScale 2 and a `SHEET` background. The mask is evaluated per block (`display.frag.glsl`): every block outside it is fully transparent. `seedScale` keeps the head at r ≈ 0.8, and that is where each new seed is born. The view marks its own "NOW": the newest seed, ruby with an ink outline, at r ≈ 0.8. `.dial-art` is painted over the engine. Without WebGL2, Sow is painted in 2D (`fallback2d.ts`), without `RetroDisplay` or the 2 px block.
    - The `#g=` link (`garden.ts`, `GARDEN_VERSION` 1) encodes mirrors, drum, display, specimens and the Sow angle. `encodeGarden` stores that angle rounded to 4 decimals (`round(garden.sow, 4)`), and Sow loads it as is: its constructor only applies `clampAngle`, and the golden detent (`snapGolden`) runs only in `setAngle`. It does not encode seeds: Sow always opens with 610.
    - `GOLDEN_ANGLE` in `specimens/spec.ts` is in **degrees**, and `DEFAULT_SOW` is that angle. `headMesh` (`specimens/mesh.ts`) and `vogel.ts` (which only exports `class VogelPrint`, the hero's print) are not a source for the épure.
  - **Dangerous namesake.** `src/scenes/falconPhi.ts` also exports `GOLDEN_ANGLE`, in **radians** (and `GOLDEN_ANGLE_DEG`), along with `SPIRAL` and `SPIRAL_B`.
- **PRODUCT.md** has no "4D.OS intact" commitment: that name is a `playground-hub` scenario. Its Positioning says other pieces "fake it with pre-rendered GIFs"; its principle 1 says the first screen is the live 4D; its commitments speak of "all the landings" and of an index with "five worlds, launcher and three slots".
- **Spike 1 (2026-09-25, outside the repo).** Playwright 1.63 was used via `npx`, without adding it to `package.json`, with `page.clock` and DPR 1, hiding all the DOM except the engine canvas.
  - **Exactness:** it recovers the native dithered buffer of B, D, E and Bloomscope with zero pixels of difference across 90 frames. The block grid is anchored at the bottom left.
  - **Formats:** MP4 breaks the dithering. Lossless animated WebP and 16-color GIF are exact.
  - **Weight, 3 s at 15 fps:** D 345 KB, E 337 KB, Bloomscope 581 KB, B 935 KB. B weighs more because of the chase camera. A and C were not measured.
  - **Caveat on Bloomscope:** its figures from both spikes are of its first screen. The 004 loop records Sow (D2, D6), with a 2 px block, and Sow was neither recorded nor measured: its exactness is proven by 3.7 and its weight by 4.1.
- **Fonts and glyphs** (cmap of the repo's woff2 files, decoded with Node's brotli: `fontTools` could not read woff2 on the machine used). These include `←`: Departure Mono (A and launcher), Tektur (D), Handjet and Science Gothic (E). These do not: Host Grotesk (A and launcher), Bricolage Grotesque and Geist Pixel (B), no font of C, none of Game Center's (Bungee, Bungee Shade, DotGothic16, M PLUS Rounded 1c) or Wind-Up Empire's (Tilt Warp, Rampart One, Libre Franklin, Sono), nor Ultra or Recursive (Bloomscope).
- **Decisions already settled:**
  - a luminous house (option "b" of the direction exploration);
  - the museum as the frame, with the works in charge;
  - the La épura direction (impeccable, seed 68faf439, index 6 of 7, code-led);
  - the initial collection and the numbering;
  - amending "4D.OS intact" for the link back;
  - routes and 301s;
  - archiving `add-playground-landings`;
  - a page clock instead of independent loops;
  - **the answers to the Open Questions that blocked the apply (settled on 2026-09-25):**
    - sheet 004 is Sow sowing: its VISTA records the Sow section with "Hold to sow" over the fixed garden, and its épure draws the seeds (D2, D5, D6);
    - in every épure the elevation is time, "plan: where · elevation: when" (D3);
    - sheet 000 is mandatory in its static version; only its fold and "House pixels" may be missing from the first deploy (D11);
    - the gate row says exactly "4D.OS — Five worlds, one launcher. Every moment of a scene, all at once." (D10).
- **Fixes from the adversarial critic (D1–D11) and where they landed:**

  | Critique | Decision | Requirement or scenario | Tasks | Status |
  |---|---|---|---|---|
  | D1 The house competes with the works | D3, D16: the VISTA is the largest region; the collection's H1 | museum › "Sheet composition", "First screen" | 6.4, 14.1 | resolved |
  | D2 The house repeats Bloomscope's toys | D7, D11: Monge's fold and Gaudí's sheet 000; the 004 épure draws Sow's seeds with birth order as height, which Sow does not draw (D2) | museum › "The fold", "Method sheet 000", "Épure of each sheet" | 9.1, 13.x, 2.2, 2.4 | resolved by the decision of 2026-09-25; one risk remains in Risks: the 004 plan repeats the flower head of its VISTA |
  | D3 Unsupported `pattern()` readout | there is no dial or spiral readout in the house | museum › "Figures read from the work" | 6.7 | not applicable |
  | D4 The elevation says time but shows order of acquisition | D3: the elevation's height is the work's time; A, B and C share a sheet and a date | museum › "Common invariant of the épures", "Dates from git" | 2.3, 2.5, 6.2 | resolved; confirmed on 2026-09-25 |
  | D5 Several NOWs | D4: one page clock | museum › "Page clock" | 5.1, 5.3, 6.3 | resolved |
  | D6 One-way wrapper | D13: a link back in each work; crewtives.com in the bar and the colophon | museum › "Way back from each work" | 11.2, 11.3, 5.2, 6.8 | resolved; the section on crewtives.com stays out of scope (Non-Goals) |
  | D7 The phone does not fit | D16: first screen at 390×844 in the contract | museum › "First screen"; hub › "Button on phone" | 1.5, 5.2, 7.2, 14.1 | open: which controls go in the bar at 390×844 is settled in 1.5 |
  | D8 False weight unit | D14: MiB across the whole site | museum › "Weight in binary units" | 11.1 | resolved |
  | D9 Hidden grids | D3: grid visible by default and a labeled Fibonacci ratio | museum › "The visible grid", "Fibonacci ratio" | 6.4, 8.3 | resolved |
  | D10 First screen without gradients | D8: lavender haze from the first screen | museum › "The light", "First screen" | 8.2 | resolved |
  | D11 Bloomscope capture and the loop cut | D6: `page.clock`; D4: declared cut | work-loops › "Deterministic recording"; museum › "Loop wrap" | 3.6, 5.1 | resolved |

## Goals / Non-Goals

**Goals:**
- A page that reads like a set of technical sheets, where the largest thing on each sheet is always the work.
- Every sheet is verifiable: every figure, date and stroke about a work comes from the work (pack, code, git or loop provenance), and the other figures come from a declared source.
- The museum governs the collection's time with a single clock, in the vocabulary of 4D.OS: FORWARD, REWIND and HOLD, cyan and amber.
- Without JavaScript and without WebGL2, the museum stays complete as a document: sheets, posters, SVG épures and index.
- Adding a future work means adding an entry and recording its loop, without redesigning anything.

**Non-Goals:**
- Building the playground section inside crewtives.com. It is a separate repository and remains a separate task. Here crewtives.com is only linked.
- Adding Game Center and Wind-Up Empire to the collection. They stay in the build outside the index and join in another change.
- Redesigning the works. Bloomscope only changes route and footer, and gets its fixed garden; the 4D.OS worlds only get the link back and the corrected unit.
- Running 4D.OS live inside the museum: its packs weigh 50–54 MiB.
- Translating the page: the copy stays in English.

## Decisions

### D1. The page is a static document with progressive JavaScript
The museum is `playground/index.html`, generated at build time from a manifest. The static HTML carries each sheet complete:
- title, title block and text;
- VISTA poster;
- SVG épure with the whole trail;
- link to the work.

The sheet index and the links are real `<a href>` elements. JavaScript adds the page clock, the loop player, jump by number and the light on top. The 3D fold is lazy-loaded, only when the visitor asks for it.

**Rejected alternatives:**
- A page assembled by JS: without JS everything disappears, and it also clashes with the index checker.
- A content framework such as Astro: it was decided to stay on the experiments' stack (option "b").

### D2. Collection manifest: hand curation, figures from the work
- **`src/playground/museum/collection.ts`** is the only curated source. Per work it holds:
  - sheet number (never reused), title, series and form (○ scene with a pack, □ toy, △ workshop);
  - routes, technique and rule, imported from its module with the correct unit: `SPIRAL`, `SPIRAL_B` and `GOLDEN_ANGLE` (radians) from `src/scenes/falconPhi.ts` for 002; `WHALE_FALL` and `fallRadius` from `src/scenes/whaleFall.ts` for 003; `GOLDEN_ANGLE` (degrees) from `src/playground/bloomscope/specimens/spec.ts` and `seedPosition` from `sow/sow.ts` for 004;
  - the wall text, 80 words at most;
  - the paths of its sources, to compute dates.
- **A step of the playground plugin** generates the manifest at build time and also when `dev:playground` starts, with the same logic. It exposes it as a virtual module of the plugin, with its type declaration under version control, so that `tsc --noEmit` (which runs before the build) does not depend on a generated file; if it also writes it to disk, it goes in a git-ignored path. It contains:
  - from `scene.json`: `frameCount`, `fps`, duration, `counts`, `source`, `synthetic` and the weight (`packBytes`);
  - from git: the date of the commit that created the work and that of the last one that touched it, according to its paths;
  - the **trail** (see "Common invariant" in D3): on 001–003, the centroid of the dynamic points of each frame, computed from `dynamic.bin` with the same `parseDynamic`; on 004, Sow's seeds (see below);
  - the provenance of each loop.
- **Trail of 004: Sow's seeds (decided on 2026-09-25).** The 004 VISTA records the Sow section while it sows with "Hold to sow" over the fixed garden (D5, D6), so the épure draws what the loop shows being born:
  - **Moments:** each moment is a seed, numbered from 0 in order of birth. The complete trail is all the seeds of the loop's last frame.
  - **Plan:** where each seed was born, `seedPosition(n, α, c)` from `sow/sow.ts`, with α = `decodeGarden(fixed link).sow`. The whole trail uses a single c, that of the head in the last frame (`seedScale` of its seeds), because Sow shrinks c as it sows. The drawing scale is uniform, so the shape does not depend on which c is chosen.
  - **Elevation:** the same x and, as height, the birth order n. It is the work's time.
  - **NOW:** the newest seed of the loop frame, the same one Sow marks as its "NOW" (ruby with an ink outline).
  - **Loop segment:** runs from the newest seed of frame 0 (the NOW of frame 0, seed 609) to the newest of the last frame: that seed and the ones born during the recording. So it contains every NOW.
  - **Where the counts come from:** from the loop's provenance, which records the seeds of each frame, read from the work itself (D6). Never from a formula written in the museum.
  - **Figures of the initial collection:** if the recording starts with `START_SEEDS` = 610 and sows 2 seeds per frame (`SOW_RATE` 30 at 15 fps), frame f has 610 + 2f seeds and the NOW is at seed 610 + 2f − 1: seed 609 in frame 0 and 697 in frame 44. The complete trail then has 698 seeds (from 0 to 697) and the segment runs from 609 to 697.
  - **How it is drawn:** as dots, one per seed, not joined, because two consecutive seeds are α ≈ 137.5° apart and a polyline would cross the disc. The complete trail goes in fine dots and the segment in solid ink dots. Label: "seeds in order of birth".
  - **Rule and trail:** on 004 the seeds are the subject, so the trail uses the same function the work uses to place and paint them (`seedPosition`, `seedScale`), evaluated only on the seeds the loop shows. On 001–003, by contrast, the trail never comes from the rule's equation (`SPIRAL`, `fallRadius`): it comes from the pack's points.
  - **Angle:** the fixed link stores Sow's angle rounded to 4 decimals, like every "Copy link" link (`encodeGarden`): 137.5078. Sow uses it as is (its constructor only applies `clampAngle`, not the golden detent), so the épure's α is `decodeGarden(fixed link).sow` (137.5078), not `GOLDEN_ANGLE`. The title block's rule is still `GOLDEN_ANGLE`. The difference is 3.6·10⁻⁵° (0.025° accumulated at seed 697) and is not visible, but it is declared. Precision of the checks:
    - the recording and the build compare the "divergence …°" readout, which has 3 decimals, with `α.toFixed(3)` of the fixed garden ("137.508");
    - the tests in 2.4 and 3.5 compare the garden's α with `GOLDEN_ANGLE` with a tolerance of 5·10⁻⁵°, that of `encodeGarden`'s rounding.

    Since Sow stays at 137.5078 and not at the exact golden angle, its `isGoldenAngle` (tolerance 10⁻⁶) returns false in that garden and its accessible label does not add ", the golden angle". Rejected alternative: hand-writing a `#g=` link with the angle at full precision. That is not what "Copy link" produces, and the `landing-bloomscope` spec requires that format.
- **A test fails** if a visible figure in the museum has no declared source (see D15).

**Why the centroid on 001–003:** it is the same method for the three scenes, it is derived from the data and it is labeled as such ("path of the subject's centre"). It avoids drawing an equation and calling it a trail.

**Why the seeds on 004:** Sow has no center that moves. What changes over time is which seeds exist and where each one is born, and that is exactly what the loop shows. The D3 invariant holds all the same: the plan says where and the elevation, when.

**Rejected alternative:** reading `scene.json` live from the museum. It forces requesting pack files and computing in the browser what does not change.

### D3. The sheet
Desktop composition on a module M = 30 px, set by the house tokens (`src/playground/museum/tokens.css`) and later recorded in DESIGN.md.
- **VISTA, on the left:** the work's loop in its passe-partout, in the work's background color and with an ink outline. It goes at an integer scale in device pixels, the largest that fits (×2 typically); if not even ×1 fits, it is scaled down with smoothing (the `work-loops` rule). It is the largest region of the sheet.
- **Épure, on the right:**
  - **ELEVATION** at the top, **ground line** in the middle (with its two short conventional strokes) and **PLAN** at the bottom;
  - the complete trail, dotted: every moment (on 004, fine dots, one per seed);
  - the segment the loop covers, with a solid stroke (on 004, solid ink dots);
  - the NOW, a cyan or amber dot with an ink ring;
  - a reference line, perpendicular to the ground line, joining the NOW in plan and elevation.
- **Common invariant (the museum's "general symmetry" goal; confirmed on 2026-09-25):** in every work épure (001–004) the plan says where and the elevation's height says when, with a shared horizontal axis (sheet 000 draws timeless figures, the column and the tesseract, and there the elevation is height; narrowed during the apply, 2026-09-25, following the final review):
  - on 001–003, the plan is the subject's centroid over the scene's floor and the elevation's height is the pack frame;
  - on 004, the plan is Sow's seeds, each where it was born, and the elevation's height is its birth order (D2).

  The visible legend is "plan: where · elevation: when". This makes "time made an axis" literal and uniform: the elevation of 001–003 stops being the centroid's spatial height and becomes its time, and the fold shows a space-time curve. It is the engine's motto, "every moment at once", and Van Doesburg's reading (1924, point 11: "height, breadth, and depth plus time"), not a mirror symmetry of the house. This reading is recorded in the brief's THESIS (1.5).
- **Title block, at the bottom:** it is the label. Sheet number, title, series, form, real date, technique, dimensions with time ("15.0 s · 450 frames at 30 fps"), weight, the "synthetic" mark, the rule and the loop's provenance line. It shows 4 visible fields and the rest inside `<details>`. The main action is "Enter <title>".
- **Sheet 001 (the cat):** A, B and C are the same scene from the same commit. The sheet carries three VISTAS (A · Vitrine, B · Plate, C · Leader), a single épure and the gate to `/4d-os/`. The native buffer loses the vitrine, the plate and the film (which are DOM), so each VISTA gets a passe-partout in the color of its world's frame, taken from its tokens: A `--wall`, B `--plate`, C `--leader`. The cat's CC-BY credit goes next to the views, with the text from `LICENSES.md`.
- **Proportions:** the width of the VISTA column and that of the épure are in a ratio of consecutive Fibonacci numbers measured in modules, for example 13 : 8 (at 1440 px there are 48M; 26M : 16M would be 13 : 8). The exact widths, with margins and gutter, are set by the build, and the "Fibonacci ratio" scenario allows one module of tolerance in each width. The modular grid shows by default in the sheet's margins and rules (the critic's fix D9). The G key, or a "Grid" button on touch devices, shows it in full, with the divisions of the ratio and its label ("13 : 8").
- **Fold:** "Fold" button, dragging on the ground line or the F key (D7).

**Why the trail and not the work redrawn:** the épure adds what the work alone does not say. All the works, drawn with the same axes, show what they have in common: all their moments at once, with time made an axis. That is the "general symmetry" the museum aims for, and it belongs to the works, not to the house.

### D4. One page clock
- **One `TimeController`** for the whole page. Its playback already wraps around (`wrap`), so no new mode is needed.
- **A single measure for all loops:** every pass has 45 frames at 15 fps (`work-loops`), so the clock position is a frame i, the same in all VISTAS. A normalized phase (frame = floor(phase·Nᵢ)) was rejected: with different lengths, each work would run at a different speed.
- **Controls:** the bar carries FORWARD, REWIND and HOLD, plus a scrubber. The keys are J, K and L, as in 4D.OS. J and L call `play(-1)` and `play(1)`, not `rewind()`/`forward()`: the museum has three states, not speeds, and repeating the key does not speed up.
- **What follows the clock:** each visible loop, each index preview, each NOW in the épures and the NOW of the fold. The épure's NOW is placed using the loop's provenance (the source frame at position i or, on 004, the newest seed of frame i), so loop, elevation and plan show the same moment.
- **Declared cut:** the loop is a 3 s window of a 14–15 s scene, or 3 s of sowing on 004. On passing the last frame, the clock returns to the first and the work jumps (the cat goes back down; the 004 head goes back to its frame-0 seeds) together with its NOW, in the same painted frame. No palindrome is made: playing the FORWARD pass backwards with the clock in FORWARD would show the work rewinding with the NOW in cyan. The provenance line says "loops every 3.0 s".
- **Dragging the scrubber** moves all the works at once: the house governs the collection's time. To limit flashes (task 12.5), the clock chases the scrubber position by at most 2 frames every 1/15 s and does not change direction before 1/3 s (`ScrubChase` in `clock.ts`, measured: 21% of the 10° field in the worst case, under 25%); the arrow keys, Home and End go through the same chase and do not wrap the loop. A hollow mark (`.clock__target`) shows under the pointer where the clock is heading.
- **At rest:** if there are no loops on screen, the tab is hidden or the clock is in HOLD, nothing is painted.
- **Reduced motion:** the clock starts in HOLD on the poster frame. Each sheet has "Play loop", which puts the clock in FORWARD if it was in HOLD and makes only that sheet follow the clock. A gesture on the clock (J, K, L, the controls or the scrubber) is also an explicit request, and applies to the loops of the sheets on screen at that moment; that way no clock control is left dead under reduced motion.
- **Rejected alternative:** animated `<img>` elements. They cannot be synchronized or stopped on a frame, they start by themselves and they restart when they come back into view.

### D5. Loop format and player
- **Player:** one 2D `<canvas>` per VISTA, with `imageSmoothingEnabled = false`, drawn at an integer scale in device pixels (k = floor(dpr·slot/native)). If not even k = 1 fits, it is drawn scaled down with smoothing. Each VISTA draws the frame the clock indicates.
- **Posters:** the first frame, in lossless WebP (5–17 KB). They go in the static HTML with `<picture>` and cover the no-JS and reduced-motion cases. With JS they are sized before painting with the same device-pixel rule as the loop, so the switch to the canvas does not jump; without JS, to an integer in CSS pixels.
- **Frame format: 4DLP**, chosen with spike 2 (2026-09-25).
  - **Structure:** palette indices at 4 bits per pixel, in whole frames and without XOR delta, with rows interleaved across frames in `[y][frame][x]` order. The low nibble is the even x.
  - **Header (version 1, fixed in 4.1):** 80 bytes, little-endian. Magic `4DLP` (0), version u8 = 1 (4), bpp u8 = 4 (5), frames u16 (6), width u16 (8), height u16 (10), fps u8 (12), color count u8 (13), bytes per row u32 = ⌈width/2⌉ (14) and the 16 RGB colors (18–65; unused ones at 0); the rest, zeros up to 80. The codec is `src/playground/museum/loops/format.ts` (`encode4dlp`, `decode4dlp`), pure, the same in the recording and in the player.
  - **Files (fixed in 4.1):** each loop is a folder `playground/public/loops/<id>/`, published at `/loops/<id>/`, with `forward.4dlp.gz`, `rewind.4dlp.gz` (A–E only), `poster.webp` and `provenance.json`. The names come from `LOOP_FILES` and `loopUrl` in `loops/provenance.ts`; `<id>` is `a`–`e` or `bloomscope`.
  - **Transport:** the `.gz` is the 4DLP compressed with gzip inside the file, and it is published that way. In `wrangler dev`, static assets serve it with `Content-Type: application/gzip`, without `Content-Encoding` and byte-for-byte identical to the file, with any `Accept-Encoding` (tested with `gzip, deflate, br`, with `zstd` and with `br` only): they do not recompress it. The player decompresses it with `DecompressionStream('gzip')`, which exists in Chromium, WebKit and Safari 26.4. If a server were to deliver it already decompressed (with `Content-Encoding: gzip`), the player looks at the first two bytes (`1f 8b`) and uses the 4DLP as is. The check on Cloudflare is left for the preview URL (15.5).
  - **Brotli, rejected for now:** with brotli 11 the 11 passes would weigh 1 890 938 B instead of 2 534 299 B (25.4% less; from 15% on D to 37% on Sow). But static assets do not serve a precompressed `.br`: with a `_headers` file that adds `Content-Encoding: br`, `wrangler dev` compresses the file again (151 583 B on disk, 151 588 B served; the browser would receive the brotli still compressed) and sends `br` even if the client only accepts gzip. It would take a custom Worker with `encodeBody: 'manual'`, and the budget does not call for it.
  - **Measured in Chromium, WebKit 26.6 and real Safari 26.4:**
    - exact: 0 differing pixels;
    - first frame in 11–25 ms in Safari;
    - 0.2–0.5 ms per frame, with O(1) seek equally cheap forward and backward;
    - about 2–3 MB of memory per work.
  - **Verified in 4.1 with the passes from 3.7:** the decoder (`decode4dlp` and `frameHash`, bundled unchanged) reads each pass as `wrangler dev` serves it, with `DecompressionStream('gzip')`, and yields the 45 provenance hashes, also when jumping to individual frames forward and backward, in Playwright's Chromium 153 and WebKit 26.6: 0 differing frames across the 11 passes, and the 6 decoded WebP posters have the hash of their frame 0.
  - **Measured weights (4.1, working recording from 3.7), as the site transfers them.** They replace the estimate in Risks, which was unmeasured:

    | Loop | Native | FORWARD | REWIND | Poster |
    |---|---|---|---|---|
    | A | 307 × 172 | 144 335 B | 144 296 B | 7 970 B |
    | B (full plate) | 389 × 225 | 152 097 B | 152 273 B | 15 206 B |
    | C | 426 × 219 | 279 649 B | 274 929 B | 15 648 B |
    | D | 300 × 300 | 178 626 B | 176 943 B | 6 682 B |
    | E | 418 × 231 | 478 736 B | 455 630 B | 14 672 B |
    | Bloomscope (Sow) | 221 × 221 | 96 785 B | — | 7 590 B |

    The 11 passes add up to 2 534 299 B and the 6 FORWARD ones to 1 330 228 B. The heaviest, E's FORWARD, uses 48% of the cap.
  - **Fallback rule:** if a work does not fit in 1 000 000 B, the recording fails with the measured weight and its framing is shrunk in `CAPTURE` (`capture.ts`): a crop in blocks or a viewport in which the view measures fewer blocks; on Sow, never a crop inside the mask. Neither the cadence nor the frame count changes. The 4-bit PNG strip does not help with that, because it weighs the same as gzipped 4DLP. It remains only as a decoding plan B, and today it is not needed: without `DecompressionStream`, the VISTA stays on its poster, as `work-loops` allows.
  - **Rejected alternatives:**
    - (a) Animated WebP with `ImageDecoder`: Safari 26.4 does not have that API and cold seeking is expensive.
    - (b) The 4-bit PNG sprite strip weighs the same as gzipped 4DLP, but takes 15–23 MB decoded per work. It remains as a decoding plan B (see "Fallback rule").
    - XOR delta: it worsens the weight, because it breaks the Bayer periodicity.
    - Frame-major order: it performs worse with gzip. If it is ever necessary to show the loop while it is arriving, it is worth it with brotli.
- **Framing per work:** it is set in `CAPTURE` (`capture.ts`, which takes sheet, title and sources from `collection.ts`) and recorded in the provenance. B is recorded on the full plate (zoom at its limit, z = 1), which is precisely the "Plate", cropped to the clear glass where the work centers the subject (to the left of `.desk__rail` and above `.sheet`, like `plateFrame`): it weighs 152 KB per pass. A, C, D and E are recorded with the framing of their first screen: C with a 1680 × 1050 viewport, because at 1440 its window measures 1040 px, and D without the plotter (`aside.tube`, opaque from x = 900).
- **004 framing (the Sow view was settled on 2026-09-25):** 004 records the view of the Sow section (`.sow-view`), not Bloomscope's first screen. Its block is 2 px (pixelScale 2).
  - **Rectangle:** the square that contains the whole view, with whatever lies outside the mask in the view's background color. It is the smallest square that is a multiple of 2 px, aligned to the block grid of `.sow-view` (anchored at the bottom left), that contains its rect.
  - **Why not a rectangle inscribed in the mask:** the head reaches r ≈ 0.8 in the camera from −1 to 1, and that is where each new seed is born, including the "NOW" one (r = 0.799). No rectangle inscribed in the unit circle contains a circle of radius 0.8 (it would need a² + b² ≥ 1.28). With the inscribed square (half side 0.707) and α = 137.5078, the NOW would be inside the frame in only 16 of the 45 frames and, in the last frame, 48 of the 88 seeds born in the loop would be left outside. The épure's NOW has to be the seed the VISTA marks as Sow's "NOW".
  - **Outside the mask:** the mask is evaluated per block, so every block outside it is fully transparent. During the recording, the page background behind the canvas is set to the palette color the view paints its background with (the one `SHEET` gives in the 16-color display), so those blocks come out opaque and within the palette. The provenance records it as prior state.
  - **004 passe-partout:** that same color, so the edge of the loop does not show.
  - **Weight:** while it sows, the head's c shrinks and each seed's color depends on the count (`birthColor(n / (count − 1))`), so almost the whole head changes in every frame. The circumscribed square doubles the area of the inscribed one. Measured in 4.1: at 1440 × 900, `.sow-view` measures 441 px, the square is 442 px (221 × 221 native) and the pass weighs 96 785 B, the lightest in the collection. If it ever did not fit, the whole view is shrunk (a viewport in which `.sow-view` measures fewer blocks), never cropped inside the mask.
- **Passes:** each loop is recorded with the work moving forward (FORWARD). The works that can rewind (the 4D.OS worlds) also record a REWIND pass, which is downloaded only when the visitor presses REWIND. That way the work's internal NOW (cyan when moving forward, amber when rewinding) matches the museum's.
- **Budget:** up to 1 MB per pass, at 15 fps and 45 frames (3.0 s) across the whole collection, because there is one clock (D4). A work that does not fit adjusts its framing, not its cadence. Loops are downloaded when their sheet is less than one screen away or when their index row shows the preview.

### D6. Recording loops
- **Script:** `scripts/capture-loops.ts`, with Playwright and `tsx` fetched through `npx` at pinned versions, with no dependency in `package.json`. This revisits the rationale of D9 in `add-playground-landings`: back then the images already existed and Playwright would have been a dependency. Now the loops do not exist and `npx` adds no dependency.
  - **Exact command** (fixed and documented in 3.2): for example `npx -y -p playwright@<X> -p tsx@<Y> tsx scripts/capture-loops.ts <work|all>`. `npx` only adds the binaries to the `PATH`, so the script resolves `playwright` from the npx cache (`createRequire` on that path, or `NODE_PATH`) and not with a bare `import`. It is verified by running it without `playwright` in `node_modules`.
  - **Pure core** (`src/playground/museum/loops/`): with no external dependencies and imported with an explicit `.ts` extension or through `tsx`, because the repo's code imports without extensions and Node 24 only strips types.
- **What it records against:** the production build in `dist/`, served by `wrangler dev` with `_redirects` and `.assetsignore` copied (or `vite preview`). In `npm run dev`, 4D.OS uses base `/` and the playground runs on another server, so the routes would not be the public ones.
- **Procedure, per work:**
  - install `page.clock` and fix it with `pauseAt` before `goto`: `install()` alone does not freeze time, which runs at real speed until `pauseAt`. After that, advance only with `runFor`, which fires every animation frame (one every 16 ms of clock time), never with `fastForward`, which fires each timer only once;
  - a viewport at DPR 1, sized so the work's view fits (C needs more than 1440 in width);
  - hide everything except the engine canvas;
  - choose a rectangle that is a multiple of the block;
  - sample one pixel per block, anchored at the bottom left;
  - **verify** that upscaling it reproduces the capture pixel for pixel. If not, it fails.
- **004 recording: Sow sowing (decided on 2026-09-25).**
  - **Load:** opens the fixed garden (`/bloomscope/#g=…`; before 10.1, from `/landings/bloomscope/#g=…`) with `page.clock` installed and fixed with `pauseAt` before `goto`.
  - **Viewport:** DPR 1 and a size in which `.sow-view` and "Hold to sow" fit whole. The provenance records the viewport and the pointer emulation (`hasTouch`, `isMobile`), which decides the seed cap and the Scope counts. If `.nogl` is visible (without WebGL2, Sow paints in 2D), the recording fails.
  - **Focus:** "Hold to sow" is focused before waiting for the bloom, or with `focus({ preventScroll: true })`, so the focus does not move the view after the framing is chosen: that scroll would trigger the Scope's `controller.nudge` and wake the engine.
  - **Wait:** with the clock stopped, it brings the Sow section into view and waits in real time for `.herbarium-strip` to have its first pressed head (the bloom has started). From there, `runFor` of at least 610·4 + 650 + 16 ms of controlled clock time, and more if needed for the engine to come to rest (see "Fixed order").
  - **"Hold to sow" only:** it sows only with "Hold to sow", never with "Sow 100" or by moving the dial. It holds the button by keyboard: Space without repeat on the focused button. Since the button's `blur` stops the sowing, the page is hidden without taking focus away from it (for example with opacity and not with `display: none`). That also hides `.dial-art`, which is painted over the engine.
  - The pointer stays outside the Sow view, because over it the work highlights a seed and shows its card. "Scrub births" stays at all seeds.
  - **Framing:** the D5 square, which contains the whole `.sow-view`, with the page background behind the canvas set to the view's background color.
  - **Fixed order:**
    1. after the wait, capture frame 0 with 610 seeds, without sowing;
    2. at the same clock instant, `keyboard.down('Space')` on the focused "Hold to sow", which sows seed 610 immediately;
    3. for f = 1…44, `page.clock.runFor` of `Math.round(f·1000/15) − Math.round((f−1)·1000/15)` ms, and capture;
    4. `keyboard.up('Space')`.

    That way frame 0 is captured before pressing, and "Hold to sow" is pressed right after and held until the last frame.
  - **Why it requires the engine at rest when pressing:** at rest the engine sets `lastTime` to 0, so the first dt after pressing is 0 and the time before the press does not sow. With the engine at rest and that step, frame f has 610 + 2f seeds for any phase relative to the 16 ms grid of `page.clock`'s animation frames (verified by simulation: 0 frames off). If something is still animating when the button is pressed (the Scope settling after a scroll, another bloom), the first dt includes time from before the press and one extra seed comes out in many frames. With fixed steps of 64 or 67 ms it fails even at rest. If the counts do not add up, the wait before frame 0 is lengthened (for example, 6 s of clock time instead of 3.1 s) until the engine comes to rest; the 1000/15 ms step is not touched.
  - **Counts:** frame f has 610 + 2f seeds, from 610 to 698: the 45 frames are 3.0 s of sowing, 90 seeds per loop cycle. 610 + 90 = 700 stays below `MAX_SEEDS` on desktop (2400) and on phone (800).
  - **Readouts:** in each frame it reads the seeds and the angle from the work's own readouts ("seeds N" and "divergence …°", DOM text, with no hooks) and records them. It fails without writing anything if the "divergence …°" readout differs from `α.toFixed(3)` of the fixed garden, or if any count differs from the expected one (`START_SEEDS` in frame 0 and `SOW_RATE`/15 more in each frame, imported from `sow.ts` as in 2.1).
- **Data it records:** the range of source frames (on 004, the controlled clock instants and the seeds of each frame), the work's configuration (viewport, DPR and pointer emulation; on Bloomscope, also: the fixed garden via `#g=`, the Sow section, Sow's angle, the seeds at the start and at the end, the bloom wait, how "Hold to sow" was held and the color set behind the canvas), the date, the work's commit and the SHA-256 of each frame.
- **Stale loop warning:** the build compares the recorded commit with the last one that touched the work. If they differ, it warns without failing, and the title block says, among its visible fields, "recorded <date>; the work has changed since" (a critic's fix: do not break the build on every Bloomscope change).
- **Rejected alternative:** recording from a development route inside each work. It requires hooks in C and in the launcher, which do not have them, while `page.clock` proved they are not needed.

### D7. The fold: the house's only 3D moment
- **What it is:** two planes of the sheet joined by the ground line. The trail is a low-poly polyline in space (where on the horizontal plane, when in the height), and its projection lines fall onto both planes. On 004 they are points in space, one per seed and not joined, as in its épure (D2). The angle between the planes goes from 0° (the flat épure, as on the sheet) to 90° (the dihedron). The NOW is on the polyline and follows the page clock: there is still a single NOW.
- **Render:** the same `Engine` and `RetroDisplay` as the works (the same framework and motif as the works), at 16 colors with the house palette. The wash light appears dithered inside the 3D.
- **Loading:** the 3D module is downloaded only the first time someone folds. There is only one fold view at a time.
- **Control:** it is always started by the visitor. Nothing folds by itself or on scroll, because the critic rejected the sticky scenario as a cliché and because it delays the index.
- **With reduced motion:** it jumps to the final state.
- **Without WebGL2:** an SVG axonometric view of the dihedron is shown, generated at build time, with an honest line.
- **Why this gesture:** folding the vertical plane onto the horizontal one is the operation that defines Monge's épure (Gaspard Monge, *Géométrie descriptive*, lessons at the École normale in year III, 1795; book of 1798–1799). The candidate source is the digitized Gallica edition (`ark:/12148/bpt6k5783452x`); task 6.8 verifies the edition and the year before citing it, and the colophon does not cite an unverified date. The 3D teaches how to read the sheet, instead of decorating it.

### D8. The light: a wash that marks the time of day
- **Technique:** radial CSS patches anchored to the edges of the page, from morning to afternoon.
  - At the top, lavender haze from the first screen: `#BEBEE8` and `#DCDDF6`. `#BEBEE8` is crewtives.com's accent (`--color-accent` in the crewtives.com site's global stylesheet, verified); `#DCDDF6` is its daytime version.
  - At the bottom, apricot: `#F0A585` and `#F8DCCD`.
- **What moves it:** its alpha depends only on scroll progress. There is no clock, no curtains and no drifting on its own. With reduced motion it stays fixed at an alpha at which both washes are visible, each at its edge.
- **Reference (verified in booklet 9 of the Basilica):** the stained glass of the Sagrada Família is bluer on the morning side and more orange on the afternoon side. The colophon cites it as inspiration, without claiming that Gaudí did this on a staircase or on a sheet.
- **DESIGN.md:** The Closed World Rule is amended. The house wash (radial, scroll-driven, with no curtains or clock) is not B's aurora.

### D9. Palette and typography
- **Starting tokens:**
  - paper `#F5F4EF` (token `--sheet`), ink `#16181D`, graphite `#3B404C` (secondary text);
  - east and west light families (D8), only as light, never under body text;
  - NOW: FORWARD `#1BBFD3`, REWIND `#EFA23B`, always with a 2 px ink ring.
- **The dark works (B, D, E)** get a passe-partout in the color of their night: they are night windows in a daytime room. On sheet 001, each VISTA gets the color of its world's frame (D3).
- **16-color display palette for the fold:** ink, paper, graphites, the two lights and the NOW. In 1-bit it reduces to ink and paper.
- **Contrast:** all contrasts are verified at build time, with a test.
- **Typography:** OFL or equivalent, served from the site. It cannot be any of the 23 families that 4D.OS and the landings already use, nor a sibling of them. It has to include φ, θ, α, π and τ in its subsets, or those symbols are not used. Missing arrows and signs go in SVG.
- **Candidates verified by the panel:** Geologica (display and text) and Fira Mono (title block and readouts). The final choice comes out of the build with `/impeccable`.
- **The Bauhaus and museum reading** of the house is carried by four elements, which the brief's OWN-WORLD names and the finish reviewer audits: the visible modular grid and the labeled ratio; ink on light paper, without ornament; the label as a museum caption (the title block); and a two-family typographic hierarchy with the sheet number as data, not as decoration.

### D10. Sheet index and numbering
- **Position:** it is the second section. The first screen links to it on desktop and on phone.
- **Rows:** No. · form · cropped poster · title and line · dimensions · date. There is a separator line each time the creation date changes, like the *History Wall* of Charles and Ray Eames's *Mathematica* exhibition (IBM, 1961).
- **4D.OS series:** an unnumbered gate row links to `/4d-os/` and groups 001 to 003. It says exactly "4D.OS — Five worlds, one launcher. Every moment of a scene, all at once." (text settled on 2026-09-25). It is built from `LAUNCHER.name` and `LAUNCHER.line` in `worlds.ts`, joined by " — ", the same line the landings' index already shows. A test pins the exact text, so a change to `LAUNCHER` does not change the row without someone deciding it. The count ("Five") is checked against `WORLDS.length`. "five worlds, one desk" was rejected: D and E are not the old-OS desktop of A, B and C (PRODUCT.md).
- **Numbering:**

  | Sheet | Work | Links to |
  |---|---|---|
  | 001 | The cat | A, B and C |
  | 002 | The golden stoop | D |
  | 003 | Whale fall | E |
  | 004 | Bloomscope | Bloomscope |

  The three workshop sheets carry no number, name, link or date: "Being drawn. Not public yet.". Sheet 000 is the method sheet (D11), reserved for the house; it has its row after the work rows, with no poster, dimensions or date.
- **Jump by number:** typing `002` (outside a text field, with less than 1 s between digits) takes the page to `#sheet-002` without going back to the top. The `#sheet-NNN` fragments work as deep links.
- **Peepshow:** a row's loop plays only on focus or click, or after 300 ms of the pointer over it, and it follows the page clock. Moving the mouse over the index never downloads all of it.

### D11. Sheet 000: the method
It is a demonstration of the house's own, which no work has (the critic's fix D2), and it is the only place that covers two of the museum's goals: 4D projection and Gaudí. That is why its static part is mandatory. It is drawn in épure:
- **Gaudí's double-twist column** (booklet 9 of the Basilica and the "double-twist columns" article on the Basilica's blog, which is the source for the intersection doubling its points segment by segment): a star polygon that turns right and left as it rises.
- **The tesseract:** from 4D to 3D with `project4` and from 3D to plan and elevation, citing Bragdon (*Projective Ornament*, 1915).

The SVGs are generated at build time with pure geometry (13.1), which is cheap. **Mandatory:** the static sheet 000, with those two SVG drawings, its row in the index and its sources in the colophon; the museum is not published without it. **Lowest priority:** its fold and the "House pixels" selector that goes with it; if they do not make the first deploy, sheet 000 is published flat, without "Fold" or "House pixels". Decided on 2026-09-25.

### D12. Routes, build and redirects
- **Routes:**
  - `playground/index.html` becomes `dist/index.html`;
  - Bloomscope moves to `playground/bloomscope/` and ends up in `dist/bloomscope/`;
  - Game Center and Wind-Up Empire stay at `/landings/<slug>/`, outside the index;
  - `playground/landings/index.html` leaves the build.
- **Mandatory entries:** `playground/index.html` and `playground/bloomscope/index.html` are declared so that the build fails if they are missing (they do not go through the `existsSync` filter). `PLAYGROUND_ONLY` and the comment that mentions the comparison page are updated.
- **Assets:** `assetsDir` becomes `_playground/`, so that the museum's JS does not live under `/landings/`.
- **Guards:** `noPacksAtRoot` is kept, and another guard is added that verifies the playground build did not write to `dist/4d-os/`.
- **`cloudflare/_redirects`:** the `/` 302 is removed and `/landings/ / 301` and `/landings/bloomscope/ /bloomscope/ 301` are added. The `#g=` fragment is preserved, and the link Bloomscope copies uses `location.pathname`. `.assetsignore` does not change, but it is copied to `dist/` together with `_redirects` in every local check.
- **Hand-written routes and copy to update:** `COMPARE_ROUTE` and `CANDIDATE_LINE` in `worlds.ts`, the pages, and the tests `worlds.test.ts`, `bloomscope/page.test.ts`, `game-center.test.ts` and `wind-up-empire/page.test.ts`. `STILLS` (`/landings/_shared/stills/`) does not move: it keeps serving Game Center, Wind-Up Empire and Bloomscope, and no rule redirects it.

### D13. Way back from each work
- **In each 4D.OS world and in Bloomscope:** a small DOM link, "Playground · Sheet 00N" preceded by a left arrow, leading to `/#sheet-00N`. It is in the static HTML, with no JS or behavior changes, and out of the layout flow: it does not move or resize any window or canvas, so the 4D.OS canvas hashes remain valid.
  - A, B and C go to 001; D to 002; E to 003; Bloomscope to 004. The numbers are checked against `collection.ts`.
  - The `/4d-os/` launcher carries "Playground".
  - D already has a link to `../`, which is kept.
  - **The arrow:** the `←` character only if the link's font includes it (see Context); otherwise, a vector icon. B and C get the icon; on A and the launcher it depends on the link's font (Departure Mono includes it, Host Grotesk does not); D and E can use the character; Bloomscope gets the icon.
- **Amendment:** this is the only exception, along with the MiB label, to the "4D.OS intact" scenario of `playground-hub`, and PRODUCT.md records it as a commitment (Migration Plan).
- **Game Center and Wind-Up Empire:** they change the candidate line to "Not in the collection yet · Playground", with "Playground" linked to `/` and the arrow as a vector icon (none of their fonts includes `←`). Wind-Up Empire also rewrites the "About this demo" paragraph, which today says "one of three candidate front pages".

### D14. Weight unit
`formatBytes` keeps the value and the rounding as they are (it divides by 1024; one decimal below 100, none from 100 up; "N B" below 1024) and changes the labels to "KiB", "MiB" and "GiB". 4D.OS goes on to show "50.4 MiB", and the museum's label prints the same figure with the same function over `packBytes`. That way the house and the work say the same thing, and it is true.

**Rejected alternative:** decimal units only in the museum. The house and the work would state different numbers.

### D15. Honesty, figures, sound and display selector
- **Honesty:**
  - "demo build 0.1" stamp;
  - "synthetic" label on each scene;
  - "Loops recorded from the live render; the works run live." next to the clock;
  - visible credits and a link to crewtives.com in the bar and in the colophon.
- **Sources of the figures** (what 6.7 checks): figures about a work come from the manifest or from a provenance. The others have a declared, closed source: sheet numbers from `collection.ts` (also the "Sheet NNN" in the links back), the stamp from `BUILD_STAMP`, the bibliography from a references module with one URL per entry (taken from facts.json or verified in 6.8), the control labels from `DISPLAY_MODES` and the world count from `WORLDS.length`. Any other figure makes the test fail.
- **Sound:** synthesized and off by default. A hinge "clack" when folding, a tick when jumping between sheets, and nothing else. Without JavaScript there is no sound, so the button is not shown either.
- **"House pixels" selector (1-bit · 16 · Millions):** it affects only the fold view, including that of 000. It is shown only next to an open fold, never on the first screen at load. The loops are 16-color recordings and say so.

### D16. Design process and closing (impeccable, code-led)
- **At the start of the apply:** the direction contract is written into the surface brief of `playground/index.html` with `impeccable surface-brief write`. It carries THESIS (with the D3 invariant), OWN-WORLD (with the Bauhaus and museum reading of D9), STORY, FIRST VIEWPORT, FORM (La épura, 6 of 7, seed `68faf439`), SIGNATURE INTERACTION, MOTION GRAMMAR and the textual FINISH line. On the code-led path, the ambition lives in the written contract: the FIRST VIEWPORT plus a signature interaction and a named motion grammar, which the finish reviewer audits as behavior.
- **The contract's first screen:**
  - on the left, the featured sheet (the most recent acquisition) with its VISTA as the largest region;
  - on the right, its épure;
  - at the top, the collection title and the clock;
  - on the first screen, the link to the index.
- **Signature interaction:** the page clock's scrubber, which moves all the collection's loops and all its NOWs at once; the fold is the second gesture, the only one in 3D.
- **Motion grammar:** only the clock moves the works and the NOWs; the light changes only with scroll; the fold moves only on request; nothing moves with time or with the pointer outside the clock; sheet jumps are short scrolls (instant with reduced motion); with reduced motion everything starts still and only what the visitor asks for moves.
- **Construction:** build → inspect on desktop and phone (one more round at most) → `impeccable detect` → `impeccable embed-prompt --scan` → `impeccable-finish-reviewer` → `impeccable-documenter`, which writes DESIGN.md and `.impeccable/design.json`.
- **Finish reviewer package** (per `reference/new-work.md`): the change's goals and the decisions listed in Context, the page route, the screenshots, the direction contract, the detector's findings, the QUALITY BAR card, the comp of the card chosen on the decision page (labeled as a critique reference, because a code-led build has no approved comp) and the path to `craft-floor.md`. It is asked to audit the signature interaction, the motion grammar and the Bauhaus reading of D9 as behaviors.
- **PRODUCT.md** is amended before publishing (see Migration Plan).

## Risks / Trade-offs

- **[Risk] The sheet reads as a textbook diagram.**
  - **Mitigation:** the VISTA is always the largest region, the work brings its color and the title block is short. Test it with someone who does not know the project.
- **[Risk] Works with a moving camera weigh more.** B with the chase camera weighs 753 KB gzipped.
  - **Mitigation:** record B on the full plate (about 149 KB) and keep the budget of 1 MB per pass, adjusting the framing. The first load brings only the posters and the loops of the sheets less than one screen away.
  - **Figure measured in 4.1 (replaces the estimate):** the 11 passes add up to 2 534 299 B and the 6 FORWARD ones to 1 330 228 B. The heaviest is E's FORWARD (478 736 B), far from the 1 MB cap; B on the plate weighs 152 097 B. The per-pass table is in D5. Loops are downloaded only near the viewport.
- **[Risk, resolved in 4.1] The Sow loop could weigh more than expected** (2 px block, a head that changes entirely and a circumscribed square): measured, it is the lightest pass, 96 785 B gzipped.
- **[Risk] The seeds per frame of 004 depend on whether the engine is at rest when "Hold to sow" is pressed and on how the controlled clock advances.** Sowing adds up the dt of each animation frame, which `page.clock` fires every 16 ms. If something is still animating when the button is pressed, the first dt includes time from before the press and one extra seed comes out in many frames. Advancing with `fastForward` or with fixed steps of 64 or 67 ms also breaks the count.
  - **Mitigation:** the fixed order of D6 (frame 0 before pressing, the press at the same instant and steps of `Math.round(f·1000/15)` accumulated with `runFor`) gives exactly 610 + 2f with the engine at rest. The recording compares its readouts with the expected counts and fails if they do not match. 3.7 verifies it and, if it does not hold, the wait before frame 0 is lengthened (for example, 6 s of clock time instead of 3.1 s) until the engine comes to rest; the 1000/15 ms step is not touched. The épure uses the counts the provenance records, never a formula.
- **[Risk] The 004 plan repeats the head its VISTA already shows, and its fold (seeds in space with birth order as height) may recall the lathe's Rosette→Staircase gesture (`STRETCH_STOPS`).**
  - **Mitigation:** the épure adds what Sow does not draw, birth order as height and the NOW in the loop's time, and the fold is the same Monge gesture on every sheet. It follows from the decision of 2026-09-25; it is reviewed in the 14.1 inspection.
- **[Risk] The point centroid may look erratic in works with many points entering and leaving.**
  - **Mitigation:** with `correspondence: true` the three packs have a constant N per frame. Label it as "path of the subject's centre".
- **[Risk] The elevation as time loses the spatial height of 001–003** (the cat's climb, the falcon's fall).
  - **Mitigation:** the spatial height remains in the VISTA, which is the largest region; the épure adds what the VISTA does not show: all the moments at once. Confirmed on 2026-09-25.
- **[Risk] Safari with an integer-scale canvas and fractional dpr (1.25 or 1.5): `pixelated` looks uneven.**
  - **Mitigation:** scale k = floor(dpr·slot/native) in device pixels, and the passe-partout absorbs the remainder. Test it on a real iPhone.
- **[Risk] Capturing C:** its window measures about 1040 px at 1440.
  - **Mitigation:** a larger capture viewport for C. The exactness check detects it.
- **[Risk] The fold is new 3D work.**
  - **Mitigation:** lazy loading; its absence (without WebGL2) is already covered by the SVG. If it runs late, the page is published anyway; sheet 000 is published flat.
- **[Trade-off] The loops are pre-rendered, against principle 2 of PRODUCT.md.**
  - **Mitigation:** they are labeled, with provenance and a staleness warning, and the principle is amended. The works stay live, one click away.
- **[Trade-off] Game Center and Wind-Up stay published but outside the index.**
  - **Mitigation:** their footer says so. They will join in another change.

## Migration Plan

1. Archive `add-playground-landings`. That way `playground-hub`, `landing-bloomscope` and `landing-wind-up-empire` move to `openspec/specs/` and this change's deltas apply.
2. Create the `feat/playground-museum` branch from `feat/playground-landings`, which has Bloomscope and the platform and has not been pushed yet.
3. Amend PRODUCT.md:
   - principle 2 admits labeled recordings of the live render, with provenance;
   - Positioning stops opposing all pre-rendering: the museum shows recorded, labeled loops, and the works remain a real-time display;
   - principle 1 applies to each work; the museum's first screen is a recorded loop of a live work, one click away;
   - the Stack line now says that 4D.OS is published;
   - the playground commitment goes from "three candidates" to the museum, and the commitments become commitments of "all the playground pages" (museum included);
   - the demo index describes the sheet index (001–004, the gate row, 000 and the workshop);
   - the "4D.OS intact" commitment is added, which today exists only as a `playground-hub` scenario, with the exception of the link back and the MiB label.
4. Build and verify locally. Then `npm run deploy:preview` and verification at the preview URL.
5. Production, only with explicit approval: `npm run deploy`. The 302 disappears with the new `_redirects`.
6. **Rollback:** go back to the previous Worker version from Cloudflare (`wrangler rollback`). The current version stays in production until approval.
7. **When archiving this change:** a delta cannot change a spec's Purpose, and that of `openspec/specs/playground-hub/spec.md` will still speak of "the three candidate landings" and the "comparison page". It is rewritten by hand (museum, landings outside the collection, no comparison) and verified with a grep for the old terms for "comparison" and "candidates" in `openspec/specs/playground-hub/spec.md`.

## Open Questions

The four questions that blocked the apply (trail of 004, common invariant, mandatory sheet 000 and the gate row text) were answered on 2026-09-25 and are in Context, D2, D3, D10 and D11. Two remain, which can be resolved during the apply or later:

- Is the featured sheet on the first screen always the most recent acquisition (today 004 Bloomscope), or is it pinned by hand in `collection.ts`? By default it is the most recent. It can be changed later without touching specs.
- The final choice of typefaces is made in the build with `/impeccable`, within the constraints of D9.
