# Product

<!-- impeccable:product-schema 1 -->

> **How this was written:** there was no interview. Everything marked *(inferred)* comes from the original brief and from the exploration recorded in `openspec/changes/archive/2026-09-24-add-4d-os-local-demo/`, not from a direct answer.

## Platform

web

## Stack

Decided in `openspec/changes/archive/2026-09-24-add-4d-os-local-demo/design.md` (D1):
- Vite + vanilla TypeScript + three.js r186 with `WebGLRenderer`.
- Windows in the DOM with custom CSS; GSAP ScrollTrigger + Lenis for scrolling.
- Published at https://playground.crewtives.com/4d-os/, served by a Cloudflare Worker that only serves static assets (`deploy/wrangler.jsonc`); `npm run dev` serves local development. The playground lives in the same repository and the same build: `npm run build` builds both Vite sites, `sites/4d-os/` and `sites/playground/`.

## Users

- **Primary user:** the author of the experiment, a creative technologist, who uses it to test whether a specific aesthetic works as a native interface for 4D reconstructions and to compare variants.
- **Imagined audience of the piece** *(inferred)*: the creative-technology and spatial-computing community that followed the reference 4D video (credited in the README). They see the piece in a desktop browser, with curiosity and little time.

## Product Purpose

"4D.OS" *(working name, inferred)* is an experimental piece that presents a scene reconstructed in space and time, with all of its moments visible at once. The interface is an old operating-system desktop that can be explored.

The piece's surfaces are in *Experience* mode (the work leads from the first screen); the exact mode of each one lives in its surface brief, under `.impeccable/surfaces/`.

Success has three parts:
- the piece feels beautiful and readable;
- the 4D runs live, not pre-rendered;
- there are three distinct worlds built on the same mechanism, to compare.

## Positioning

This aesthetic is usually built from pre-rendered GIFs or videos. Here the work is always a real-time display: the dithering, the palette and the pixel are computed live over 4D data that the visitor controls (time, camera, color depth). The only recordings on the site are the loops of the playground's museum, and they are labeled as recordings of the live render, with published provenance, one click away from the live work.

The metaphor is not decorative. The trail an error window leaves when it is dragged is the 2D version of the 4D "millipede", so the operating system is the native language of "every moment at once".

## Operating Context

- It runs in a desktop browser with WebGL2, on the published site or on the local development server. Since the change `add-cosmic-landings-and-organic-motion` (`openspec/changes/archive/2026-09-28-add-cosmic-landings-and-organic-motion/`), the hero gesture (scroll, pinch) is also in scope on mobile.
- **Content:** a 4D pack (the project's own format: a static background, the subject per frame, the cameras per frame and the source frames).
- **Data:** today it is a synthetic scene baked at 30 fps: a black cat (the CC-BY "Cat" model by J-Toastie, with the project's own procedural animation) climbing a flight of steps in an alley at night. Later, real data from a "video → per-frame 3D" pipeline.
- **Time controls:** those of a video editor (timecode `MM:SS:FF`, J/K/L, FORWARD / REWIND / HOLD).

## Capabilities and Constraints

- **Capabilities:** the six specs of the change `add-4d-os-local-demo`, now living specs in `openspec/specs/`:
  - `4d-pack`
  - `synthetic-bake`
  - `time-viewer`
  - `dither-display`
  - `desktop-shell`
  - `story-page`
- **Three worlds (A, B and C):** the same core and the same content in three distinct visual directions, so the directions can be compared side by side.
- **Worlds D and E, built as two new landings:** the same core, with scenes of their own computed from equations:
  - `falcon-phi`: a falcon on a golden spiral in a cyberpunk city;
  - `whale-fall`: a whale falling toward a black hole, with time dilation.

  New capabilities: `hero-gesture`, `procedural-subject` and `cosmic-landings`.
- **Constraints:**
  - **Third-party material:** nothing is taken from the reference works: no assets, no typefaces, no copy.
  - **Licenses:** typefaces only under the OFL or equivalent licenses; 3D models under CC0 or CC-BY, with the CC-BY ones credited in visible text.
  - **Language:** the piece's text is in English *(inferred; adopted as the default assumption during the exploration)*.
  - **Honesty about the scene:**
    - the synthetic scene is always labeled as synthetic;
    - figures are read from the loaded pack, never written by hand.
- **Undecided:** the final name, the logo's shape and the future real content.

## Brand Commitments

- **Reference aesthetic:** an old Windows-style desktop mixed with the modern, minimal brutalism of a museum exhibition, with animation that feels like pixel art. It is an inspiration, not a clone; the reference site is credited in the README. The analysis is in the Context section of `openspec/changes/archive/2026-09-24-add-4d-os-local-demo/design.md`.
- **Palette of world B (2026-09-23):** no golden buff. It takes the color set of an archival collage (sage, teal, charcoal and magenta, with slight variations): sage cards, a charcoal plate, teal for moving forward and magenta for rewinding and for labels.
- **Scene (2026-09-23, extended on 2026-09-24):** a black cat in an alley at night replaces the first version's deer across the whole piece, so the piece has a subject of its own instead of the reference's. It climbs a flight of steps so the concept explains itself: the trail becomes a staircase of cats.
- **World B's hero (2026-09-24):**
  - B's layout stays;
  - a third-person camera behind the cat follows it and can be dragged through 360°;
  - A's spotlight;
  - an aurora gradient in B's colors, and pixel art with more colors;
  - scrolling continues the video with the hero pinned before moving on to the next section.
- **Improvements and two new landings (2026-09-24):**
  - **The cat:** its climb has to look organic and natural, beautiful and polished.
  - **The hero:** scrolling zooms in and out; on mobile, the pinch gesture zooms in and out. The animation loops, and the page only continues down once the zoom-out is at its limit and the video has stopped at its end.
  - **Two complete landings** with the same 4D concept ("every moment at once") and other animals, to put the engine and the method to the test:
    - **D:** cyberpunk, a futuristic interface, a green digital-rain aesthetic, the mathematics behind reality expressed through the golden ratio, and a mathematically computed bird.
    - **E:** space, with vortices and black holes.

    These two landings build settings of their own instead of the old desktop OS of A, B and C. From the project they inherit the real-time retro display, the single NOW and data honesty.
- **Reference content:** a reference 4D video (credited in the README) gives the viewer its grammar. The piece takes from it:
  - the trail of every moment;
  - the present in cyan when moving forward and amber when rewinding, with a `HOLD` state;
  - the frustum with the source frame;
  - the timecode HUD.
- **The playground (2026-09-24 and 2026-09-25):** 4D.OS is published at https://playground.crewtives.com/4d-os/. The subdomain hosts demos of interactive algorithmic art, physics, and futuristic and retrofuturistic apps, meant to be beautiful to look at, with a lot of symmetry.
  - **The museum at `/` (2026-09-25):** the root of the playground is a museum that wraps the collection of experiments, one level above the works. Its direction is "The épure" (Monge's descriptive geometry), in a luminous house: each work is a sheet with its recorded loop (the VISTA), its épure (plan = where, elevation = when), a single NOW and a title block with data read from the work. A page clock governs the time of the whole collection.
    - **Initial collection:** 001 The cat (A, B and C of 4D.OS), 002 The golden stoop (D), 003 Whale fall (E) and 004 Bloomscope, which stops being a candidate landing and becomes a work at `/bloomscope/`.
    - **Outside the collection:** Game Center Yonjigen and Wind-Up Empire stay published at `/landings/<slug>/`, and their footers say so; they can enter later without a redesign. The comparison page `/landings/` redirects to `/`.
  - **Commitments of every playground page (the museum and the landings):**
    - **Demo honesty:** a "demo build" stamp, scenes labeled as synthetic, no invented commercial claims, and nothing claimed that the page's code does not control. In the museum, every figure, date and line about a work comes from the work (its pack or its code), from the collection's curation (the works' creation dates) or from its loop's provenance.
    - **The museum's sheet index:** always open, never behind a game. It is the second section, reachable from the first screen on desktop and on a phone. It holds sheets 001–004 in order, the gate row of the 4D.OS series ("4D.OS — Five worlds, one launcher. Every moment of a scene, all at once.") leading to `/4d-os/`, the method sheet 000 and exactly three workshop sheets with no number, name, link or date. The landings outside the collection keep their own index of the demos.
    - **Sound:** synthesis only, off by default and never audible without a gesture.
    - **Reduced motion:** nothing starts on its own; the toys stay usable and show their result as an already exposed image.
    - **Without WebGL2:** the static content stays complete, with an honest line and 2D alternatives.
    - **Text and typefaces:** text in English; OFL typefaces, or equivalent free ones, chosen for each page and not reusing those of 4D.OS.
  - **4D.OS intact:** publishing the playground does not change 4D.OS: its routes, its content and its behavior stay as they were. The only exceptions are the small link back to its sheet in the museum ("Playground · Sheet NNN", or "Playground" in the launcher), outside the layout flow, and the pack size label in binary units (MiB).

## Evidence on Hand

- **Available:**
  - the synthetic scenes, baked by the development-only `/bake` page (`sites/4d-os/bake.html`) into `sites/4d-os/public/packs/`;
  - the real figures of those packs.
- **Reference material, never served:** the captures of the references used during design. They are third-party material, so they are kept outside the repository.
- **Nonexistent, and not to be invented:**
  - real 4D data;
  - testimonials, clients, usage metrics, prices or press;
  - performance benchmarks other than those measured in task 9.5 of `openspec/changes/archive/2026-09-24-add-4d-os-local-demo/tasks.md`.

## Product Principles

1. **Show the mechanism, don't describe it.** The first screen of each work is the live, controllable 4D. The first screen of the museum shows a work in its loop recorded from the live render, one click away from the live work.
2. **Real time over pre-rendered.** If an effect can be computed live, it is computed live. A recording of the live render is only accepted when it is labeled as such and its provenance is published (the museum's loops), and never in place of the work.
3. **Time is the main material.** A single NOW governs everything on screen.
4. **Data honesty.** What is synthetic is declared, and what is measured is read from the pack.
5. **Inspired, not cloned.** The piece takes the grammar of its references and builds with its own material.

## Accessibility & Inclusion

- **Reduced motion** (`prefers-reduced-motion`): no autoplay, no automatic orbit and no dissolves.
- **Keyboard:** every control is operable, with a visible focus and an accessible name.
- **Canvas content:** each 3D view carries a text description.
