# Proposal

## Why

4D reconstructions from monocular video ("per frame 3d gaussians", each frame left at the place and the moment where it happened) went viral in September 2026, but they are presented in generic viewers. We want to validate, in a local prototype, whether the visual grammar of the reference aesthetic (old operating-system windows, dithered pixel art, museum-room minimalism) can become the native interface for that content. Moreover, the reference site achieves its look with pre-rendered GIFs; we need the same language **in real time**, because 4D is explored by moving time and the camera.

The analogy that holds the mix together already exists in popular culture: the trail a Windows error window leaves when you drag it is the 2D version of the 4D "millipede".

## What Changes

- A new Vite + TypeScript project with three.js (`WebGLRenderer`), running only locally (`vite dev`).
- A custom **4D pack format** (scene metadata, static background, per-frame dynamic subject, source video frames), designed so that a real pipeline can produce it later without changing the viewer.
- A **`/bake`** development page that generates a **synthetic** 4D pack from a freely licensed animated model and a procedural environment (currently, a black cat climbing a flight of stairs in an alley at night, at 30 fps; see `design.md` D3), including the "source video" rendered from the virtual camera. All synthetic content is labeled as such.
- A **4D viewer in time**:
  - every moment in a single GPU buffer;
  - "memory" (past only) and "all at once" (past and future) modes;
  - present color by playback direction (cyan forward, amber rewind, `HOLD` when paused);
  - "frustum light";
  - a camera frustum with the source frame on its image plane;
  - a trajectory line.
- A **real-time retro display**: low-resolution render, ordered dithering with a stable per-point threshold and upscaling without smoothing, with a color depth selector `1-bit · 16 colors · Millions`.
- A **"4D.OS" desktop** as the first screen, with these windows:
  - boot with a loading bar;
  - clock with the source timecode;
  - source camera;
  - layers and modes;
  - display selector;
  - timeline with scrub, direction and speed.
- A **story page** below the desktop. Chapters:
  - 2D + time = 3D, with a stacked Game of Life;
  - pipeline;
  - "scroll is time";
  - real figures from the pack;
  - scenes;
  - FAQ.

  It closes with a footer that shows the logo as a dotted wireframe reacting to the cursor.
- The visual design is built with the `/impeccable` skill. The brief sets the reference site's grammar as the reference aesthetic: inspiration, not a clone. No asset, font or copy from the reference site is used.

**Out of scope:**
- deploy or hosting;
- real 4D data or a GPU pipeline;
- real Gaussian splats (Spark remains a future path);
- mobile polish (it only has to not break);
- backend;
- analytics.

## Capabilities

### New Capabilities
- `4d-pack`: the 4D pack format (metadata, static background, dynamic subject sorted by frame with an offset table, per-frame cameras, source frames) and its loading on the client.
- `synthetic-bake`: a development page that generates a valid synthetic 4D pack from a freely licensed animated model (CC0, or CC-BY with credit) and a procedural environment.
- `time-viewer`: 4D render in time (time modes, color by direction, frustum light, frustum with source frame, trajectory) with the current frame as the single source of truth.
- `dither-display`: real-time retro display pass (low resolution, stable dithering, upscaling without smoothing) and color depth selector.
- `desktop-shell`: the "4D.OS" desktop on the first screen (boot, windows and playback controls).
- `story-page`: a story page with scroll-driven chapters, a chapter with scroll bound to time, and a footer with a dotted wireframe.

### Modified Capabilities
<!-- None: the project has no previous specs. -->

## Impact

- **Code:** a new project at the repo root, with no existing code affected.
- **New dependencies:** `three` (r186), `gsap` (with ScrollTrigger), `lenis`, `vite`, `typescript`.
- **Third-party assets:**
  - "Cat" by J-Toastie (CC-BY 3.0, credited) for the current scene; Quaternius "Animated Animal Pack" (Deer, CC0) for the previous recipe;
  - OFL-licensed fonts (the final choice comes from the `/impeccable` direction; candidates: Departure Mono or Geist Pixel for the pixel mono, and a free neo-grotesque for headlines).
- **Design artifacts:** `/impeccable` will write `PRODUCT.md`, the surface brief and, at the end, `DESIGN.md`.
- **Environment:** local only. Requires a browser with WebGL2; there are no external services at runtime.
