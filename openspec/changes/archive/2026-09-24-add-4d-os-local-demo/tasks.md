# Tasks

## 1. Project scaffolding

- [x] 1.1 Create the Vite + TypeScript project at the root with `three` (0.186.x), `gsap`, `lenis` and `vitest`, and verify that `npm run dev` serves an empty page and `npm run test` runs without errors.
- [x] 1.2 Configure the bake page as a development-only entry, and verify that `/bake` responds under `npm run dev` and that the output of `npm run build` contains neither the page nor its code (grep over `dist/`).
- [x] 1.3 Set up the single full-screen canvas with a WebGL2 renderer and an on-demand render loop, and verify in the browser that no frames are produced at rest (the debug render counter stays flat).

## 2. 4D pack (`4d-pack`)

- [x] 2.1 Define the format's types and constants (`4DST`/`4DDY` identifiers, version, `scene.json`, SoA blocks, offset table), and verify that they compile with `tsc --noEmit`.
- [x] 2.2 Implement the pack writer, and verify with a round-trip test (write → read) that positions, colors, frames and offsets are preserved within the quantization error.
- [x] 2.3 Implement the loader with validation (identifier, version, counts, offsets), and verify with tests that each corrupt pack produces an error that names the layer and the reason.
- [x] 2.4 Report load progress by bytes received, and verify with a simulated-stream test that at 50% of the bytes the progress is 50% ±5%.

## 3. Synthetic bake (`synthetic-bake`)

- [x] 3.1 Download Quaternius's Deer from the "Animated Animal Pack" (glTF, CC0) into the development assets and record its origin and license in `LICENSES.md`, and verify that the model loads and plays the gallop in `/bake`.
- [x] 3.2 Implement the deer's path along a spline with `AnimationMixer` and the per-frame point sampling over the mesh with skinning applied, and verify that the `/bake` preview shows the point cloud of frame `f` overlaid on the mesh of frame `f`.
- [x] 3.3 Generate the procedural environment (meadow and trunks, with optional depth noise) as a static layer, and verify visually in `/bake` that the density follows the configured parameter.
- [x] 3.4 Define the source camera's trajectory and render one source frame per frame into the atlas pages, and verify that the silhouette of frame `f` matches the projection of the points of frame `f`.
- [x] 3.5 Export the pack (download and placement in `public/packs/deer-synthetic/`) with `synthetic: true` and all the configurable parameters, and verify that 15 fps × 20 s gives 300 frames and that the loader validates it without errors.
- [x] 3.6 Use a seeded RNG throughout the bake, and verify that two bakes with identical parameters produce files with the same hash.

## 4. Time viewer (`time-viewer`)

- [x] 4.1 Implement the `TimeController` (continuous frame, signed speed, HOLD, speed steps, looping at the ends, `memory`/`all` mode, damped target), and verify looping, rewind, HOLD and steps with unit tests.
- [x] 4.2 Render the static layer as opaque points, and verify that the drawn count matches the metadata.
- [x] 4.3 Implement the subject shader (age, present by direction, trail with decreasing density through fixed-threshold stippling, future in `all` mode, trail stride) and the `drawRange` clipping in `memory` mode, and verify with a debug UI that no future point appears in `memory` and that the present color changes when the direction is reversed.
- [x] 4.4 Implement the frustum light over the background, and verify during playback that the lit area follows the source camera.
- [x] 4.5 Draw the frustum, the image plane with the atlas layer (`DataArrayTexture`) of the present frame, and the camera trajectory, and verify that while scrubbing, the plane's frame, the pose and the present subject always match.
- [x] 4.6 Add orbit and zoom with limits, a slow automatic orbit at rest and respect for `prefers-reduced-motion`, and verify both cases by emulating the preference in DevTools.
- [x] 4.7 Implement the toggleable layers (trail, background, frustum, trajectory), and verify that each switch affects only its own layer.
- [x] 4.8 Verify that a full end-to-end scrub neither changes the geometry memory nor triggers new buffer uploads (`renderer.info` before and after).

## 5. Retro display (`dither-display`)

- [x] 5.1 Implement rendering at a fraction of the resolution (1/3 by default) and upscaling without smoothing, and verify with a magnified capture that each render pixel occupies a 3×3 block.
- [x] 5.2 Implement 8×8 Bayer dithering with nearest-color selection in OKLab over a palette uniform of up to 16 entries, and verify with a debug utility (`readPixels` + count) that `1-bit` mode gives 2 colors and `16 colors` mode at most 16.
- [x] 5.3 Implement `Millions` mode (no quantization, full resolution) and hot mode switching, and verify that toggling modes causes no point-data transfers.
- [x] 5.4 Read the palettes from the design system's CSS tokens, and verify that changing a token changes the rendered color without touching the render logic.
- [x] 5.5 Verify that orbiting in HOLD does not change the set of visible trail points (compare two captures in `Millions` with different orbits, counting the visible points per frame with the debug utility).

## 6. Design direction with `/impeccable`

- [x] 6.1 Run `/impeccable init` and write `PRODUCT.md`: *Experience* mode, local test, English copy, and the reference aesthetic's grammar pinned as the reference, inspired by and not cloned, drawn from the Context section of `design.md`. Verify that `PRODUCT.md` exists and captures the four points.
- [x] 6.2 Follow the `/impeccable` *new-work* flow (a roll of directions within the pinned grammar) until the *direction contract* is written into the surface brief, and verify with `impeccable surface-brief read` that the contract's six blocks are present.
- [x] 6.3 Choose the OFL typefaces (a pixel mono and a neo-grotesque for headlines) and the palette, and set the CSS tokens (including the `1-bit` and `16 colors` palettes). Verify that the viewer adopts the new palettes and that `LICENSES.md` documents each font.
- [x] 6.4 If the build route is by comps, produce and approve the first-screen comp according to `/impeccable`'s `visualize.md`, and verify that the approved comp exists under `.impeccable/mocks/`.

## 7. 4D.OS desktop (`desktop-shell`), within the `/impeccable` build phase

- [x] 7.1 Build the window component (title bar, body, focus states) with Pointer Events dragging, containment within the viewport and bring-to-front, and verify by dragging to the edge and overlapping windows.
- [x] 7.2 Build the boot window with the real progress and the threshold-dissolve reveal (instant with reduced motion), plus the error state, and verify by forcing a corrupt pack.
- [x] 7.3 Build the timeline (`MM:SS:FF` timecode, ruler, playhead with scrub and click-to-jump, `FORWARD/REWIND/HOLD` state with speed), and verify that timecode, subject and source frame update during the drag.
- [x] 7.4 Build the clock, source camera, layers/modes and display windows, wired to the `TimeController` and the display, and verify that each control does what it says.
- [x] 7.5 Implement keyboard control (space, J/K/L with acceleration, arrows frame by frame), visible focus and accessible names, and verify by going through the whole desktop with the keyboard alone.
- [x] 7.6 Implement the "synthetic" label, always visible on the first screen when applicable, and verify it with the synthetic pack.
- [x] 7.7 Implement the old-style dialog with a trail of copies when dragged (disabled with reduced motion), and verify that the trail appears while dragging and is cleared on release or after the configured time.
- [x] 7.8 Implement window stacking below the viewer on narrow viewports, and verify at 390px wide that there is no horizontal scroll and that the timeline is usable.

## 8. Story page (`story-page`), within the `/impeccable` build phase

- [x] 8.1 Integrate Lenis + GSAP ScrollTrigger and the scissor-based view system on the single canvas, and verify that offscreen views do not render (per-view debug counter).
- [x] 8.2 Build the headline and the "2D + time = 3D" chapter with the Game of Life stacked in depth, and verify that the most recent generation can be told apart from the earlier ones.
- [x] 8.3 Build the pipeline chapter with the explicit synthetic-scene notice, and verify the text with the synthetic pack loaded.
- [x] 8.4 Build the "scroll is time" chapter (pinned viewer, progress → `TimeController` target, forward or rewind color depending on the direction, state restored on leaving), and verify the spec's three scenarios.
- [x] 8.5 Build the chapter of figures read from the pack, and verify that they change when loading a pack baked at a different density.
- [x] 8.6 Build the scenes chapter (deer active; unavailable ones marked and not selectable) and the FAQ chapter, and verify that an unavailable scene cannot be activated.
- [x] 8.7 Build the footer with the 3D logo in dotted edges, turned toward the cursor and with the dashes moving (static with reduced motion), and verify both cases.

## 9. Wrap-up and verification

- [x] 9.1 Do the `/impeccable` inspection round (desktop captures at 1440px and mobile at 390px, plus `impeccable detect`), fix whatever comes up in a single batch, and verify that the final captures are in `.impeccable/review/`.
- [x] 9.2 Run `impeccable-finish-reviewer` with the direction contract and the captures, apply the material fixes, and verify that the reviewer issues its final disposition.
- [x] 9.3 Run `impeccable-documenter` to write `DESIGN.md` from what was built, and verify that it exists and reflects the real tokens and components.
- [x] 9.4 Audit the licenses (nothing from the reference aesthetic's site; OFL fonts; CC0 model) against what `npm run dev` serves, and verify that `LICENSES.md` covers every third-party asset.
- [x] 9.5 Measure performance with the full synthetic pack on a laptop (target: 60 fps in `16 colors`, with playback and orbit at the same time), and record the result together with the density or resolution-fraction adjustments, if any were needed.
- [x] 9.6 Walk through every scenario of the six specs in the browser, with reduced motion on and off, and verify that they are met or record the deviations.

## 10. New scene: a black cat in an alley at night (scope extension)

- [x] 10.1 Download J-Toastie's "Cat" (poly.pizza, CC-BY 3.0) into the development assets and record its origin, license and credit in `LICENSES.md`. Verify that the model loads in `/bake` and that its rig (24 bones, no animations) is recognized.
- [x] 10.2 Reorganize the bake into recipes (`deer-meadow` and `cat-alley`) on the same sampling, source-frame and writing pipeline. Verify that the deer recipe reproduces its previous pack byte for byte.
- [x] 10.3 Animate the cat procedurally: walk, trot, crouch, two jumps (a ~1 m dumpster and a 1.8 m wall), a walk along the top, and a final sit facing the camera. Verify the key poses in `/bake` and that the feet do not pass through the support surfaces.
- [x] 10.4 Generate the alley procedurally:
  - brick walls with windows, some of them lit;
  - fire escape, dumpsters and crates;
  - the back wall;
  - wet asphalt with puddles.

  Bake the lighting into the points (sodium streetlight, moon, rim on the cat, windows). Verify visually in `/bake` that the black cat reads against the night background.
- [x] 10.5 Define the handheld source camera at ~1.6 m. Verify that the cat stays in frame across the 300 frames and that the source frame's silhouette matches the projection of its points.
- [x] 10.6 Export `public/packs/cat-alley/` (`synthetic: true`, with a point size per layer). Verify that the loader validates it and that two bakes give the same hash.
- [x] 10.7 Adapt the viewer to small scenes: point size read from the pack, frustum plane proportional to the camera–subject distance, and an optional "dollhouse" cutaway over the background. Verify that the deer pack looks the same as before and that the cutaway does not affect the trail.
- [x] 10.8 Switch world A to the new scene (pack, copy, label, visible CC-BY credit). Repeat the checks of blocks 7 and 8 on A.

## 11. Staircase, smoothness and render quality (scope extension, second round)

- [x] 11.1 Create the `cat-stairs` recipe → `public/packs/cat-stairs/` without touching `cat-alley`: the same alley with a straight flight of 10 stone steps (0.28 m tread, 0.17 m riser, 1.2 m wide) rising to a landing with a door and a sodium lamp above it. Verify in `/bake` that the staircase reads in points (more density on the steps, lit tread edges) and that `cat-alley` still reproduces its pack byte for byte.
- [x] 11.2 Animate the climb: the cat walks in, climbs step by step with a little hop on each step, and at the top sits down, looks toward the camera and moves its tail. Verify the key poses in `/bake` and that it does not pass through the steps or the landing.
- [x] 11.3 Define the handheld source camera behind the cat and at a diagonal, and bake at 30 fps (~14 s, ~4000 points per frame, ≤ 60 MB in total). Verify that the cat stays in frame in every frame, that the silhouette matches its points, that the loader validates the pack and that two bakes give the same hash.
- [x] 11.4 Improve render quality in the core: integer point size in display pixels (stable blocks, no flicker), less depth noise on the subject, and the `--display-chroma` and `--display-exposure` tokens for more striking color. Verify that with the default values the color of A and C does not change and that up close (1–2 m) the cat reads as solid and not as dust.
- [x] 11.5 Switch A, `/debug` and `LICENSES.md` to `cat-stairs` and notify the parallel work stream. Repeat on A the checks of blocks 7 and 8, 390 px and performance.
- [x] 11.6 Third-person chase camera (`src/core/shell/chaseCam.ts`): from behind and at a diagonal, somewhat raised, with a per-frame centroid and heading computed from the pack. It can be dragged through 360° and, on release, returns on its own to the rear view. Verify in B with captures.
- [x] 11.7 B with frustum light and a visible background, an "aurora" 16-color palette and an animated aurora gradient background on its own mesh that the display dithers, without touching the core. Verify the color count and that the gradient is quantized.
- [x] 11.8 Pinned hero in B: when scrolling down, the desktop stays fixed, scrolling advances the video smoothly, and only at the end does it move on to the next section (reuses `bindScrollTime`). Verify the advance and the exit with Playwright.
- [x] 11.9 Switch B ("CAT, ASCENDING STAIRS"), C and the launcher to `cat-stairs`; update spec, design and proposal; captures, `impeccable-finish-reviewer` and `impeccable-documenter`.
