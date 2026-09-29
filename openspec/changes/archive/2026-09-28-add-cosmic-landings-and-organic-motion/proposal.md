# Proposal

## Why

The 4D.OS demo is convincing when still, but falls short in motion. There are three problems:

- **The cat's climb does not look organic.** It is nine identical 0.5 s hops, with the legs in phase and poses interpolated with `smoothstep`.
- **The wheel in B's hero does three things at once.** Measured: each notch scrolls the page about 120 px, advances about 27 frames and pulls the camera back by up to 30%. About 2 s later, `chaseCam` undoes that zoom on its own.
- **On mobile, a finger on the plate does not scroll the page.** `OrbitControls` sets `touch-action: none`.

The change also puts the engine and the method (synthetic bake → 4D pack → time viewer → retro display → desktop + story) to the test with **two complete new landings**, with other animals and other worlds:

- a **cyberpunk / Matrix** one, with a mathematically computed bird and the golden ratio;
- a **space** one, with a black hole and vortices.

## What Changes

- **Organic motion for the cat** (`cat-stairs` recipe):
  - a climb with a real gait, step by step, with the legs out of phase;
  - foot contacts planted on the steps, with leg IK;
  - velocity continuity between phases;
  - weight: anticipation, compression and follow-through;
  - a stabilized head and the tail as a counterweight;
  - deterministic variation from the seed.

  The `cat-stairs` pack is re-baked with the same format, the same 30 fps and the same weight budget. `cat-alley` stays identical byte for byte.
- **Hero with zoom, loop and final segment** (new core module `zoomHero`, adopted by B and used by the new landings). It is the product-page pattern: the first screen stays pinned while native scrolling, without hijacking events, travels through the hero.
  - At the very top, the animation runs in a loop on its own clock.
  - Scrolling moves the camera in and out on a logarithmic scale, until it opens up to the full plate.
  - Pinching on mobile and on a trackpad adds its own zoom.

  When the zoom-out reaches its limit, a final segment carries the video to the last frame and leaves it stopped. Only then does the next section appear. Scrolling back up undoes the sequence. **One gesture produces one effect**: never zoom and time, nor zoom and page, at the same time.
  - **BREAKING (B):** B's hero is no longer "scroll = time" along its whole length. Only the final segment drives time.
- **Smoother engine:**
  - subjects are sampled with stable points (the same spot on the body in every frame);
  - the viewer interpolates the present between frames;
  - the chase camera follows a prefiltered path.

  This removes the "boiling" edge and the camera sawtooth without adding bytes.
- **The third-person camera keeps the visitor's zoom.** On releasing the orbit, only the angle returns. The zoom opens the shot up to the full plate, with every moment in view.
- **Procedural subjects in the bake.** A recipe can supply code-generated meshes (without skinning), rewritten every frame. The common pipeline samples them just like the boned model.
- **Two new recipes**, deterministic and without third-party models:
  - `falcon-phi`: a peregrine falcon computed from equations, stooping down a golden (logarithmic) spiral between the towers of a cyberpunk city;
  - `whale-fall`: a whale spiraling down into a black hole, with real gravitational time dilation (dτ/dt = √(1 − r_s/r)) and redshift.
- **Two new landings** built with `/impeccable`:
  - **D** (`/d/`): cyberpunk, a futuristic interface, Matrix-style glyph rain and the math of φ;
  - **E** (`/e/`): a space observatory, real-time gravitational lensing of the black hole and two clocks (yours and the whale's).

  Each has its own desktop or HUD and its complete story page, and both join the launcher.

## Capabilities

### New Capabilities
- `hero-gesture`: the mechanism of the pinned hero with zoom by wheel, pinch and swipe; the loop; the final segment that carries the video to the last frame; releasing and recapturing the scroll; keyboard and reduced motion. It is governed by the "one gesture, one effect" principle.
- `procedural-subject`: bake subjects generated from equations (with no third-party model and no skinning), with their deterministic motion, and the two scenes that use them (`falcon-phi` and `whale-fall`).
- `cosmic-landings`: the two new landings, D and E. It covers their first screen, their story page, the real-time sky layers (glyphs and gravitational lensing), the live math readouts and their presence in the launcher.

### Modified Capabilities
- `story-page`: "Scroll-pinned hero" becomes the gesture-driven hero (zoom, loop and release at the end). "Scroll is time" no longer says that B's hero plays that role. "Chapter structure" allows the landings D and E their own structure.
- `time-viewer`:
  - "Third-person camera": on release only the angle returns and the zoom is kept; the loop seam is resolved with a dissolve.
  - "Exploration camera": zoom comes from the hero's gesture, not from a second, overlapping control.
- `synthetic-bake`: new requirements for believable subject motion (foot contacts without sliding or penetration, continuous velocity, deterministic variation) and for stable points (the same spot on the body in every frame). "Marking and licensing of synthetic content" now also covers procedural subjects with no third-party model.
- `4d-pack`: a new, optional requirement: point correspondence between frames, declared in the metadata and validated on load.
- `time-viewer`: a new requirement for a present interpolated between frames when the pack declares correspondence (continuous motion at the display's refresh rate, without changing the integer NOW).
- `desktop-shell`: "Narrow viewport": on mobile the hero is also pinned with the gesture, and a vertical one-finger swipe is never trapped with no way out.

## Impact

- **New code:**
  - `src/core/shell/zoomHero.ts`;
  - recipes `src/bake/recipes/falcon*.ts` and `whale*.ts`;
  - worlds `src/flavors/d/**` and `src/flavors/e/**`, with their pages `d/index.html` and `e/index.html`.
- **Modified code:**
  - `src/bake/common.ts` (parts without skinning);
  - `src/bake/recipes/catStairsMotion.ts` and new gait and IK modules specific to `cat-stairs`;
  - `src/core/shell/chaseCam.ts` (visitor zoom, opening up to the plate);
  - `src/flavors/b/**` and `b/index.html` (new hero);
  - `vite.config.ts` (pages d and e);
  - `index.html` and `src/main.ts` (launcher).
- **Packs:**
  - `public/packs/cat-stairs/` is regenerated;
  - new `public/packs/falcon-phi/` and `public/packs/whale-fall/`, each ≤ 60 MB.
- **Design:** `/impeccable` writes the surface briefs for D and E. `PRODUCT.md` adds the brand commitments of this change. `DESIGN.md` is regenerated.
- **Licenses:** new fonts are OFL or equivalent only, credited in `LICENSES.md`. The new scenes use no third-party models.
- **Scope:** mobile comes into scope for the hero gesture. Deploy, real data and the backend remain out of scope.
