# Tasks

## 1. Setup

- [x] 1.1 Branch `feat/cosmic-landings-organic-motion` created from `main` and change validated; verify with `openspec validate add-cosmic-landings-and-organic-motion`
- [x] 1.2 `PRODUCT.md` records the brand commitments for D and E and puts mobile in scope for the hero gesture; verify by reading the "Brand Commitments" section
- [x] 1.3 `vite.config.ts` includes the `d` and `e` pages in the build; verify that `npm run build` lists `d/index.html` and `e/index.html` once they exist

## 2. Engine: equation-generated subjects, stable points and interpolation

- [x] 2.1 `SkinPart.mesh` accepts a `Mesh` without skinning, and `skinVertices` only applies bones if `isSkinnedMesh`; verify that `cat-alley` and `deer-meadow` bake again with the same hash as before
- [x] 2.2 Sampling with stable points (`stableSubject`), with fixed depth and color per point, in `SyntheticScene`; verify with a test or a bake that every frame has `N` points and that the median per-point displacement is less than twice the displacement of the center
- [x] 2.3 `scene.json` declares `correspondence: true`; the writer requires equal counts and the loader validates them (error with the frame and the two counts); verify with unit tests in `src/core/pack/pack.test.ts`
- [x] 2.4 `packGpu` adds `aNext` with correspondence; `dynamic.vert.glsl` interpolates the present with `uFrac` (0 in HOLD); verify in `/debug` or in Playwright that at `f + 0.5` the present sits halfway and the timecode stays at `f`
- [x] 2.5 Viewer gestures in every view:
  - wheel without zoom (`enableZoom = false`);
  - `touch-action: pan-y` on views with orbit, and no inline `none` on views without orbit;
  - custom pinch (two pointers, `ctrl`+wheel, Safari's `gesture*` events) with `setPinchHandler`; by default it zooms toward the target within the limits.

  Verify with Playwright on `/a/` and `/c/`:
  - the wheel over a view scrolls the page without changing the distance;
  - one finger moving vertically scrolls the page at 390×844;
  - the pinch zooms in without changing `visualViewport.scale`
- [x] 2.6 `npm run typecheck` and `npm test` green after the engine changes

## 3. Hero with gesture (core + B)

- [x] 3.1 Pure function `heroPhase(p, pinch, state)` (zoom, final and pause segments; final window; `z` on a logarithmic scale); verify with vitest tests for disjoint segments, monotonicity and limits
- [x] 3.2 `bindZoomHero`:
  - loop with `play(1)` in the zoom segment;
  - final segment with a fixed window and a dissolve if needed;
  - final pause;
  - final state forced on jumps;
  - loop seam with `onDissolve`;
  - gesture HOLD flag;
  - reduced motion.

  Verify with Playwright that in the zoom segment the frame only advances at the playback rate
- [x] 3.3 The hero registers `setPinchHandler` on its view: the pinch adds to its zoom on a logarithmic scale with a critically damped spring, plus buttons and `+`/`−` keys. Verify with Playwright (CDP) that:
  - the pinch changes the hero zoom without moving the page or `visualViewport.scale`;
  - one finger moving vertically scrolls the page
- [x] 3.4 `chaseCam` with `setZoom(z)`: a `dFar` that frames every moment, opening up to the plate, angle-only return, prefiltered path, look-at spring and `reset()` on jumps. Verify with Playwright:
  - at maximum zoom the subject's box fits in frame;
  - after 5 s without touching, the distance does not spring back;
  - there is no sawtooth (on-screen displacement between rAF frames below 6 px during the climb)
- [x] 3.5 B adopts the hero:
  - markup and CSS for the pinned stage, on mobile too;
  - relative `bindScrollTime` outside the hero;
  - the HOLD inversion is not triggered by the gesture HOLD;
  - visible control to pause the loop;
  - updated copy and accessible description.

  Verify by walking through `/b/` at 1440×900 and 390×844 with screenshots
- [x] 3.6 End-to-end verification of the gesture on `/b/`:
  - wheel, trackpad, touch, keyboard (Page Down, End) and skip link;
  - reduced motion;
  - 0 renders at rest at the end.

  Recorded in `verification.md` with figures

## 4. Organic cat (`cat-stairs`)

- [x] 4.1 Footfall planner `catGait.ts`: deterministic table of stances per leg, hind foot landing in the front foot's print and per-step variation; verify with a test that the coefficient of variation of the durations stays between 3 % and 15 % and that at a walk there are always at least 2 feet on the ground
- [x] 4.2 Two-bone sagittal IK `catIk.ts` with reach clamping, plus a planted foot that rolls on lift-off; verify with tests for reach and for the absence of "pop" near full extension
- [x] 4.3 Spine added in code, `catSpine.ts` (Chest and Pelvis, smooth reweighting), only in `cat-stairs`; verify with contact sheets from three angles, with no cuts or creases. If it fails, disable it and record the abort
- [x] 4.4 Table-driven springs `catSprings.ts` (stabilized head, tail chain and shoulder blades), integrated in fixed steps from t = 0; verify that evaluating `t` in isolation and in order gives the same pose
- [x] 4.5 New script in `catStairsMotion.ts`:
  - entrance at a walk;
  - look;
  - walking climb with a micro-pause;
  - stepping turn;
  - sitting on its haunches;
  - living rest.

  The body follows from the legs, with no `restOn` or `frontSupport` in `cat-stairs`. Verify with the contact sheets
- [x] 4.6 Metrics from the `synthetic-bake` spec at 120 samples per second in `/bake`:
  - slip ≤ 1 cm and penetration ≤ 5 mm;
  - no pose cuts: with 1 ms differences, no vertex exceeds 40 m/s and no bone 40 rad/s;
  - seated, resting on its haunches and paws.

  Verify with the metrics script and record the figures
- [x] 4.7 Rebake of `cat-stairs` with `stableSubject`:
  - ≤ 60 MB;
  - two bakes with the same hash;
  - silhouette ≥ 97 % inside;
  - `cat-alley` with its previous hash.

  Verify with the bake reports
- [x] 4.8 Review the framings tied to frames:
  - close-ups in A, B and C;
  - B's sequence sheet;
  - launcher crops;
  - hand-written copy about the climb.

  Verify with screenshots and adjust any indices or copy that ended up wrong

## 5. `falcon-phi` scene

- [x] 5.1 `src/scenes/falconPhi.ts`: conical golden spiral, phase script, wingspan and wingbeat phase as pure functions; verify with tests the φ ± 3 % ratio per quarter turn
- [x] 5.2 Equation-generated falcon (body, head with beak, 3-segment wings with primaries, fanned tail) with fixed topology; verify the dive wingspan (< 45 % of the in-flight wingspan) and the silhouette ≥ 97 %
- [x] 5.3 Procedural cyberpunk city:
  - towers with windows;
  - neon signs;
  - wet asphalt;
  - hologram of the spiral and of the golden rectangles;
  - 137.507° phyllotaxis disc.

  Verify with screenshots of the source frame and of the viewer
- [x] 5.4 Drone camera and `falcon-phi` bake with `stableSubject`: ≤ 60 MB, deterministic (two equal hashes) and `synthetic: true`; verify with the bake's `verify`

## 6. `whale-fall` scene

- [x] 6.1 `src/scenes/whaleFall.ts`: fall `r(t)` that never crosses `r_s`, slowing angular velocity, integrated proper time `τ(t)` and redshift factor; verify with tests the monotonicity of `t − τ`, `r > r_s` and the rate ratio (±5 %)
- [x] 6.2 Equation-generated whale (fusiform body with a hump, long pectoral fins, tail fluke, grooves) with a tail beat in proper time; verify the silhouette ≥ 97 % and the slower rhythm at the end
- [x] 6.3 Environment: star field, accretion disk with temperature and Doppler, photon ring; verify with screenshots of the viewer
- [x] 6.4 Probe camera and `whale-fall` bake with `stableSubject`: ≤ 60 MB, deterministic and `synthetic: true`; verify with the bake's `verify`

## 7. Landing D (`/d/`)

- [x] 7.1 Surface and direction brief with `/impeccable` (`.impeccable/surfaces/d-index-html.md`), honoring the commitments in `PRODUCT.md`; verify that the brief exists and sets its world
- [x] 7.2 First screen:
  - `falcon-phi` scene with `zoomHero` + `chaseCam`;
  - real-time glyph sky;
  - HUD with boot, timecode, state, mode, color depth and synthetic label;
  - live φ readouts from `src/scenes/falconPhi.ts`.

  Verify with screenshots at 1440×900 and 390×844
- [x] 7.3 Story page:
  1. φ and the golden angle;
  2. plate of the spiral seen from above;
  3. Marey-style wingbeats;
  4. honest pipeline;
  5. pack figures.

  It closes with the footer. Verify by walking through the page and checking that the figures change with another pack
- [x] 7.4 OFL fonts with their license in `src/flavors/d/fonts/`, full keyboard support, reduced motion and no horizontal scroll at 390 px; verify with Playwright
- [x] 7.5 Final review with `impeccable-finish-reviewer` and fixes applied; verify the "ship" verdict

## 8. Landing E (`/e/`)

- [x] 8.1 Surface and direction brief with `/impeccable` (`.impeccable/surfaces/e-index-html.md`); verify that the brief exists and sets its world
- [x] 8.2 First screen:
  - `whale-fall` scene with `zoomHero` + `chaseCam`;
  - real-time gravitational lensing that changes with the orbit;
  - two diverging clocks;
  - distance in `r_s` and dilation factor from `src/scenes/whaleFall.ts`.

  Verify with screenshots and by reading the clocks at the first and the last frame
- [x] 8.3 Story page:
  1. gravity bends time;
  2. plate of the fall;
  3. redshift;
  4. the last frame never arrives;
  5. pack figures.

  It closes with the footer. Verify by walking through the page
- [x] 8.4 OFL fonts, keyboard, reduced motion (still sky) and no horizontal scroll at 390 px; verify with Playwright
- [x] 8.5 Final review with `impeccable-finish-reviewer` and fixes applied; verify the "ship" verdict

## 9. Integration and wrap-up

- [x] 9.1 `src/bake/recipes/index.ts` registers `falcon-phi` and `whale-fall`; `/bake?scene=...` opens each recipe; verify with Playwright
- [x] 9.2 The launcher links D and E with name, thesis and a still image of the real render (provenance noted), without removing A, B and C; verify with a screenshot and with the link to `/d/`
- [x] 9.3 `LICENSES.md` adds the new fonts and the original scenes (`falcon-phi` and `whale-fall`), and updates `cat-stairs`; verify by reading the file
- [x] 9.4 `DESIGN.md` regenerated with `impeccable-documenter`, with new screenshots in `.impeccable/review/`; verify that it documents D and E and B's new hero
- [x] 9.5 Full verification:
  - `npm run typecheck`, `npm test` and `npm run build` green;
  - every page (`/`, `/a/`, `/b/`, `/c/`, `/d/`, `/e/`) loads with no console errors on desktop and mobile.

  Recorded in `verification.md`
- [x] 9.6 `openspec validate add-cosmic-landings-and-organic-motion` green and all tasks checked
