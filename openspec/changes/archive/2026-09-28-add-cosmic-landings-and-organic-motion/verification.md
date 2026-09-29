# Verification

Record of the verification of the change `add-cosmic-landings-and-organic-motion`. All figures come from our own measurements; the adversarial verification is separate from the builder's. Scripts and raw data were kept outside the repository.

## Environment

- **Machine:** MacBook Pro, Apple M2 Pro, 16 GB.
- **Browser:** Chromium 151 with Playwright 1.63.
  - Timing, interaction and bake measurements: `--use-angle=metal` (real GPU).
  - Occasional deterministic screenshots: SwiftShader. The `.bin` files match the Metal ones, but the source frame PNGs do not, so the packs are baked with Metal.
- **Servers:** each parallel work stream used its own `vite` server. The final bakes ran on servers without HMR, so that edits from other work streams would not reload the page mid-bake.
- **Tests:** `npx vitest run`. There were 142 tests passing after the engine, hero and scene work streams, and 164 at the close (block 9).

## Block 2: engine (stable points, correspondence, interpolation, viewer gestures)

| Check | Result |
|---|---|
| Hashes of `cat-alley`, `deer-meadow` and `cat-stairs` (without `stableSubject`) before and after the changes | 15/15 identical |
| Equation-generated subject (`Mesh` without bones): 90 frames × 3000 points | Silhouette 100 % inside; deterministic across two instances |
| `cat-stairs` with `stableSubject` | 4000 points in all 420 frames. Median per-point displacement: from 27.6 cm to 2.55 cm; the center's is 2.55 cm (ratio 1.0×, the bar is < 2×). Silhouette 100 % |
| Edge that "boils" with the cat still (frames 136–142) | 6.6 % → 1.2 % of silhouette pixels changing per frame; what remains is the tail |
| Inconsistent correspondence | The loader fails on the `dynamic` layer with "frame 1 has 5 points and frame 0 has 4". Tests in `pack.test.ts` |
| Interpolated present at continuous frame 200.5 | All 4000 points of the present within < 0.74 µm of the halfway point. Timecode, `uFrame`, `planeLayer` and `frustumFrame` at 200; in HOLD, `uFrac` = 0 |
| GPU cost with correspondence (Metal, 1440×900) | B's hero in "all" mode: 3.5 / 4.8 ms (mean / p95); /a/ 2.77 ms; /c/ 4.05 ms. All < 8 ms |
| Wheel over the views of /a/ and /c/ | Scrolls the page 360 px and the camera distance does not change (Δ < 1e-13) |
| Ctrl+wheel (trackpad pinch) | Zooms in by a factor of 0.391, without moving the page, with `visualViewport.scale` = 1 |
| Mobile 390×844, one finger moving vertically over /a/ and /c/ | Scrolls the page 283 and 290 px. Horizontally it orbits without scrolling |
| Mobile, ×2.5 pinch | Distance 0.400× and back to 2.500×; page scale 1 |

Added to the core by the main work stream, at the request of the `whale-fall` polish pass: `TimeViewer.setPresentLook({ tint })`. The `uPresentTint` uniform controls how much the present is tinted with the direction color. With the default value, 1, A, B and C look the same as before.

## Block 3: hero with gesture (builder and adversarial verifier)

**Wheel walkthrough in 100 px notches (1440×900, Metal).**
- The phases go `loop → final → rest → after`.
- **Zoom:** the frame advances at 30.00 frames/s, the exact playback rate, while `z` goes from 0.453 to 1 and the distance from 3.40 to 9.91 m.
- **Final segment:** `z` = 1 and the frame heads toward 419.
- **"One gesture, one effect":** 0 frames with zoom and time changing at once, in every recording (fast and slow wheel, trackpad with inertia, Page Down, arrows, touch).
- **First screen:** does not move until `after`. The next section appears for the first time at frame 419 with `z` = 1.

**Scrolling up.** The final segment rewinds from 419 to ~300 with direction −1, and the loop continues forward from there. 0 HOLD inversions from the gesture. Space does invert: it is a HOLD requested by the visitor.

**Loop seam.** `reveal` = 1/14 at the wrap, 14 steps in ~0.42 s. The camera jumps 5.5 m while the view is covered; afterwards, at most 6.5 mm per frame.

**Pinch.**
- Ctrl+wheel takes `z` to 0 (1.40 m) and to 1 (9.91 m), with `scrollY` at 0 and scale 1.
- On mobile, the pinch over the plate changes `z` in both directions, without moving the page and with scale 1.
- Buttons and +/− keys work.

**Mobile 390×844.**
- One finger over the plate scrolls the page and runs through the hero with the first screen pinned.
- The views of Plates II and III and the window titles scroll the page (234–250 px).
- No horizontal scroll.

**Landscape phone (844×390) and resizing.** Before: the camera flew out to 400 m. After: 8.27 m in landscape, 9.91 m on returning to 1440×900 and 17.74 m on returning to the portrait phone. There is a dedicated landscape layout.

**Keyboard.** Repeated Page Down runs all the way to frame 419. End goes to `after` with 419 and `z` = 1; Home returns to the loop. "Skip to the plates" is the first focusable element and leaves the hero in its final state.

**Reduced motion.** No Lenis. The frame stays still during the zoom, the final segment goes from 299 to 419 and there is no dissolve.

**Rest.** 0 engine ticks and 0 renders in 7 different states, including the pause with the hero in view and after releasing the orbit. After 5 s without touching, the distance holds.

**Defects found and fixed by the adversarial verifier:**
- camera at 400 m when rotating the phone;
- 72 px jerk on entering the final segment;
- jump from 410 to 419 on reaching the pause;
- next section peeking in at frame 340 when crossing in one go;
- frames from the end visible on returning to the start;
- reduced motion midway through the rewind;
- stage that moved on screens less than 640 px tall;
- window titles that trapped the finger;
- favicon 404.

**Sawtooth**, measured again with `cat-stairs` re-baked with stable points and correspondence (a dedicated script against the stable server without HMR, on /b/ at 1440×900 with Metal, during the looping climb, frames 150–300):

| Measure | Before (pack without correspondence) | After |
|---|---|---|
| On-screen displacement of the cat between rAF frames | median 2.1 px, p95 24 px, max. 74 px | median 0.51 px, p95 1.74 px, max. 2.5 px; 0 frames above 6 px |
| Jitter (second difference) | p95 4.6 px | p95 0.69 px, max. 2.2 px |
| Camera step per frame | — | median 6.0 mm, p95 6.9 mm, max. 17.6 mm |

**Pending.** Tests on real devices (Safari on iOS, and on macOS with a trackpad) are still missing.

## Block 4: organic cat (`cat-stairs`, builder and adversarial polish)

**What it does now.**
- Enters at a walk, with a lateral-sequence gait.
- Stops at the foot of the stairs at 3.25 s and looks up.
- Climbs **walking**: each foot lands on every other step, and the hind foot falls in the front foot's print.
- Makes a micro-pause with the left front paw raised at 7.1 s.
- Reaches the landing at 9.7 s, turns while stepping and sits on its haunches, with the tail wrapped around its paws.
- At rest it breathes, tilts its head and moves the tip of its tail.

**Technique.** Footfall planner with fixed feet, two-bone analytic IK, body derived from the legs, spine added in code (`Chest` and `Pelvis`; aborting it was not necessary) and table-driven springs at 240 Hz. Everything is a pure function of time and seed.

| Check | Result |
|---|---|
| Foot slip during the stance (footfall plan, 59 stances) | max. 0.10 cm (limit 1 cm) |
| Sweep on touchdown, measured by vertices | Before the polish: 3.3–4.5 cm on every step. After: ≤ 1.1 cm, with one exception of 2.2 cm on leaving the pause (8.04 s) |
| Sole penetration | 0 mm (limit 5 mm) |
| Feet on the ground at a walk | Always ≥ 2, counted by vertices |
| Stride variation (CV) | Climb 4.4 % (11 cycles, mean 0.848 s); entrance 3.5 % (required range 3–15 %) |
| Seated | Haunches at 0.4 mm, paws at 1.0–1.3 mm and tail at 1.1 mm from the landing. The lowest point is the pelvis, not the tail |
| Torso during the climb | 21–38.5° (standard deviation 5.2°), previously 13–47° (standard deviation 8.7°). The stair slope is 31° |
| Pack | 52.96 MB, 420 frames, `correspondence: true`. Silhouette 100 % in the worst frame |
| Determinism | Two bakes identical to each other and to the file on disk |
| `cat-alley` | Re-baked without saving: its 5 hashes remain identical |
| Framings | A (frame 231) and launcher unchanged. C moves to frame 193 and B (Plate II) to 0.46 × frames, because at the exact midpoint the cat slows down for its pause. B's Plate III moves to one exposure per second (stride 30): with the walk, each cat reads on its own |

**Known leftovers, which do not break the spec.**
- For an instant, a forearm or a shin brushes the riser. There are 4 stretches over 5 mm; the worst is a 23 mm peak for 2 frames at 3.47 s, with the cat standing still.
- About 5 cm of crouch before the pause.
- The tail ends up very vertical on reaching the top.

The spec measures the planted foot, which does not penetrate (0 mm). These leftovers are barely visible at the scale of the dithered display.

## Continuity of the three scenes ("No pose cuts" criterion)

A dedicated script. It measures the pose at `t` and at `t + 1 ms` at every sample at 120/s, over all of the subject's vertices and the world orientation of every bone.

| Scene | Samples | Fastest vertex | Fastest bone | Result |
|---|---|---|---|---|
| `cat-stairs` | 1677 | 3.49 m/s (t = 2.12 s) | 29.6 rad/s (`Tail05`, t = 12.68 s) | passes (≤ 40 / ≤ 40) |
| `falcon-phi` | 1797 | 24.1 m/s (t = 9.85 s, dive) | no bones | passes |
| `whale-fall` | 1797 | 2.99 m/s | no bones | passes |

The original threshold, 0.05 rad and 3 cm per sample, was replaced in the spec during implementation. With that threshold, a leg at normal speed (10–35 rad/s) or a wingbeat at 4.4 Hz could not move. The new criterion catches the pose cuts of the previous cat: 0.86 rad in 0 ms, that is, thousands of rad/s.

## Block 5: `falcon-phi` scene

| Check | Result |
|---|---|
| Pack | 56.35 MB, 450 frames (30 fps, 15 s), `synthetic: true`, `correspondence: true` |
| Determinism | Two bakes with hashes identical to each other and to the file on disk |
| φ ratio per quarter turn, measured on the pack's centroid without the module (215 pairs) | 1.6153–1.6226; worst error 0.28 % (limit 3 %). The vitest test covers 115 frames in 1.61803–1.61804 |
| Dive / in-flight wingspan | 18.6 % (0.187 / 1.002 m; limit 45 %) |
| Silhouette | Minimum 99.20 % inside (average 99.99 %); minimum coverage 98.66 % |
| Wingbeats | 4.42 Hz while flapping, with a CV of 6.6 %. The downstroke takes 40 % of the cycle. The wingtip traces a figure eight and the wrist folds on the upstroke |
| Stabilized head | With 1.7 cm of body rise and fall per wingbeat, the head moves less than 25 % of that. In the glide the body banks 21.7° and the head 3.1° |
| Perching | All 400 foot vertices within ≤ 1 cm of the bar, with no penetration. The tail is at 6.9 cm: the falcon stands on its feet |
| Continuity | The verifier found two flips (90° of the body and 177° of the head in 1/120 s) and a 94° head jump, and fixed them. Single-sample peak: 0.020 (body) and 0.039 (head) |

## Block 6: `whale-fall` scene

| Check | Result |
|---|---|
| Pack | 55.45 MB, 450 frames (30 fps, 15 s), `synthetic: true`, `correspondence: true`, 288 px source frame |
| Determinism | Three bakes with identical hashes (two in the harness and one in `/bake.html`) |
| Horizon | Minimum `r` of the center 1.158 `r_s`; the closest point is at 1.0145 `r_s`. It never crosses |
| Time dilation, per complete cycle | Each tail beat lasts ~2.0 s of proper time (2.002 / 2.004 / 2.014 / 2.050 s), while on the clock it stretches from 2.36 to 4.40 s |
| Rate ratio (phase from PCA of the tail vs √(1−r_s/r) of the centroid) | 0.4260 vs 0.4219 (+1.0 %; limit ±5 %) |
| Trail compression | 8.43 cm per frame in the first 3 s against 1.68 cm in the last 3 s (5×) |
| Silhouette | Minimum 97.66 % (frame 162, fluke edge-on) |
| Clocks at the end (f449) | t = 14.97 s and τ = 10.08 s: the whale is 4.89 s behind. `g` = 0.353, `z` = 1.83 |

The verifier corrected a figure from the builder. The 0.014 % error depended on the method: each 1 s window covers less than half a cycle. The robust test is per complete cycle, and it is the one in the table.

## Block 7: landing D, "The golden stoop" (`/d/`)

**World.** A vector storage-tube terminal (brief `.impeccable/surfaces/d-index-html.md`, seed `56c95648`):
- real-time glyph rain, falling with the exact digits of φ computed with BigInt;
- a plotter that traces the spiral in plan with the pack's clock;
- the live equation `r(θ) = r0·φ^(−2θ/π)` with its values for the NOW;
- θ as a slider;
- an oscilloscope of the wingbeats;
- a phosphor erase flash at the loop seam.

| Check | Result |
|---|---|
| Hero gesture (1440×900, Metal) | `loop → final → rest → after`; in the loop the frame advances at 30.00 frames/s; final segment monotonic from 329 to 449. The next section does not peek in before frame 449 with z = 1. Scrolling up, it rewinds with direction −1 and the loop continues forward |
| Rest | In the pause, 0 renders and 0 engine ticks in 3 s |
| Performance | 120 fps (refresh rate of the test browser). Median 8.3 ms, p95 10 ms; with the full plate, p95 9.7 ms |
| Mobile 390×844 | One finger scrolls the page 386 px with the stage pinned. The pinch changes z with scale 1. The plotter and the time and depth selectors are in the first viewport |
| Live readouts | Equal to `src/scenes/falconPhi.ts` at frame f (tests). In the pack, the ratio measured on the points gives 1.6160–1.6233 (115 pairs) |
| Keyboard | The skip link is the first focus and leaves the hero at `after`, frame 449, z = 1. Page Down, End, Home, Space, J/K/L and +/− work |
| Reduced motion | No Lenis, frame 0 fixed during the zoom, no dissolve, story clocks still, 0 frames at rest |
| Horizontal scroll | None at 390, 1024, 1280, 1440 and 1920 px |
| Fonts | Tektur and Jura (OFL-1.1), with their license next to the file |
| Historical data | Verified against sources (see the end of this document) |

**Final review with `impeccable-finish-reviewer`:** four rounds.
- **Round 1:** 8 fixes:
  - the perched falcon buried under its trail (solved with a GIN reticle and detail A);
  - the rain confused with the trail;
  - the text covered by the rain;
  - the diagram's cyan competing with the present;
  - mobile without the plotter;
  - the gray erase;
  - the falcon as a blob in the first frame;
  - the fragile shader patch.
- **Round 2:** the city's neon signs in pure cyan and magenta in HOLD, and the dithered blocks floating. They were toned down in memory, without touching the pack: 0 pure cyan or magenta pixels outside the present.
- **Round 3:**
  - the "Frame" station showed two source frames stitched together;
  - mobile was missing the depth and mode selectors;
  - the Marey plate overlapped the poses;
  - the wingbeats were missing their units.
- **Round 4: ship**, with no pending fixes.

**Integration.** D's shader patch moved into the core as `setPresentLook({ bias })`.

## Block 8: landing E, "Whale fall" (`/e/`)

**World.** A hydrophone spectrogram (brief `.impeccable/surfaces/e-index-html.md`, seed `76083fd0`):
- the gravitational lensing is traced live in the browser, with full geodesics per display pixel and a weak-field approximation far from the hole;
- two large clocks: CH 1, yours, and CH 2, the whale's, which stretches, thins and goes from ice to flame as dτ/dt drops;
- a waterfall of the tail beat.

| Check | Result |
|---|---|
| Clocks | Frame 0: t 00.00, τ 00.00, r/rₛ 7.000, dτ/dt 0.926. Frame 449: t 14.97, τ 10.08, lag 4.89 s, r/rₛ 1.142, dτ/dt 0.353, z 1.833. They match `fallStateAtFrame`, and the lag grows monotonically over the 450 frames |
| Lensing follows the camera | The arcs above and below the shadow change when orbiting (screenshots `e-hero-*`) |
| Performance | 120 fps with Metal at 1440×900 (DPR 1 and 2): p99 10.3 ms, 0 frames above 17 ms, in the loop, at full plate, orbiting and in the story views |
| Rest | Off screen, 0 renders. In HOLD, 0 renders after ~1 s (the camera spring). In `after`, 0 renders |
| Keyboard, pinch and touch | The skip link leaves the hero at `after`, frame 449, z = 1. Ctrl+wheel and pinch change the zoom with scale 1. One finger scrolls the page with the stage pinned |
| Reduced motion | Nothing plays on its own, there is no Lenis and the sky stays still. Scrolling still reaches `after` at frame 449 |
| Horizontal scroll | None at 360, 390, 844×390, 1024, 1280, 1440 and 1920 px |
| Fonts | Science Gothic, Handjet and Atkinson Hyperlegible Next (OFL-1.1). The figures are set in Atkinson, because Handjet's zero could be mistaken for an 8 |

**Final review:** two rounds.
- **Round 1:** 8 fixes:
  - the whale illegible from 55 % of the scroll travel onward ("centipede"), solved with the present's silhouette, the trail spaced by distance traveled and the profile plate;
  - the Handjet figures;
  - an overflow at 390 px;
  - the contract's promises below the hero (channels CH 1–5 and r/rₛ in the title line);
  - the s1 caption;
  - the grid of pack figures;
  - capitals in units;
  - diamonds for the mutually exclusive options.
- **Round 2: ship**, with no pending fixes.

## Block 9: integration

- **Production build** (`npm run build`): generates `d/index.html` and `e/index.html` alongside A, B, C and the launcher. There is no bake code in `dist/` (`SyntheticScene`, `GLTFLoader`, `dev-assets`: 0 matches).
- **Launcher:** the "Two more plates" section links `/d/` and `/e/` with still images of the real render, at 1200×900 and with their provenance in `LICENSES.md`. No horizontal scroll at 1440×900 and 390×844. Screenshots `launcher-*-more.png`.
- **Adversarial QA of the site after integration.** 8 defects fixed, almost all predating this change:
  - in A, the engine did not go to sleep after viewing the rooms: from 180 renders in 1.5 s to 0;
  - C on a landscape phone: 97 px of horizontal scroll, now 0;
  - window titles that trapped the finger on tablets and in landscape: they now scroll between 175 and 303 px;
  - B's Clock cut off on short desktop screens;
  - A's timeline covered by the Label below 1366 px;
  - A's "Synthetic" label covered by the Plan below 1410 px;
  - the launcher views in landscape and its status line on mobile.
- **Trail of one exposure per second** (stride 30) in A's vitrine and in the A and B launcher thumbnails, as in B's Plate III: with the walk, each cat reads on its own.
- **Final verification** (stable server without HMR, Chromium with Metal):
  - `npm run typecheck` clean;
  - `npx vitest run`: 16 files, 164 tests passing;
  - `npm run build` succeeds;
  - an all-pages script over `/`, `/a/`, `/b/`, `/c/`, `/d/` and `/e/`, at desktop 1440×900 and mobile 390×844: all 12 combinations load with 0 console errors, 0 network failures, no horizontal scroll and the synthetic label visible.
- **Core: requests resolved by the main work stream:**
  - `setPresentLook({ tint, bias })`;
  - `side` as a function in `chaseCam`;
  - the inline position of the windows is re-evaluated on every resize;
  - the `scrollTime` target is rounded to an integer;
  - on mobile, A's and C's window titles let the finger through;
  - `/debug?flavor=d|e`;
  - the bake's `verify()` shows the correspondence.

## Historical data in D's story (verified against sources)

- **Marey's chronophotographic gun, 1882, 12 images per second, for birds in flight.** Sources: https://en.wikipedia.org/wiki/Chronophotographic_gun and https://www.zerobaseline.com/1882-etienne-jules-marey-birds-in-flight
- **Bronze sculptures of the gull, 1887.** They are figures of the successive positions of flight, made from chronophotographs taken from three angles. One is in the Musée Marey in Beaune. Sources: https://dataphys.org/list/mareys-movement-sculptures/ and https://greg.org/archive/2024/01/16/the-sculptures-of-etienne-jules-marey.html
- **Logarithmic spiral in the attack of falcons:** Tucker, V. A. (2000), *The deep fovea, sideways vision and spiral flight paths in raptors*, J. Exp. Biol. 203:3745–3754. The scene pins the curve to the golden spiral, which is a logarithmic spiral; the page does not claim that falcons fly exactly the golden one.
