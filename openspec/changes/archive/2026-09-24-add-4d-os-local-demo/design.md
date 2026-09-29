# Design

## Context

Empty repo, with only the OpenSpec scaffold. The motivation is in `proposal.md` (Why). Two references shape the how.

**The reference site: what it actually does (reverse-engineered on 2026-09-23)**

- **Stack:** it is built in Framer. It uses no `<canvas>` at all. The only WebGL piece is the wireframe logo in the footer, a Unicorn Studio iframe that reacts to the cursor.
- **The pixel art is pre-rendered assets with a minimal palette.** The recipe is: low-resolution 3D render → dithering to 2–11 colors → upscaling without smoothing → GIF or video.
  - Hero sky: 1440×540 GIF, 110 frames, 7 colors.
  - Spinning animation: 1-bit, 180 frames.
  - Dot fields: 4096² PNG with 11 grays.
- **Visual grammar:**
  - windows with an ink title bar and a pixel mono title, a light gray body and a 1px border;
  - inverted labels;
  - crop marks at the corners (museum room);
  - rulers with tick marks;
  - vertical base64 strings;
  - huge neo-grotesque headlines with tight leading;
  - live widgets (clock, Game of Life, "race" bars);
  - a boot window with a progress bar;
  - flat surfaces, no gradients.
- **Fonts and material:** its fonts (Die Grotesk by Klim, LisaTerminal) are not free. Its assets and copy are not used either.

**The reference 4D video (September 22 and 23, 2026)**

- **Pipeline as stated by its author:** "Geolocated 2d video → per frame 3d gaussians → each left precisely where & when it happened".
- **Visible in the frames:**
  - a trail of every frame of the subject;
  - the present in cyan when moving forward, amber when rewinding, `HOLD 0.00×` when paused;
  - the background dimmed except for the area inside the current frustum;
  - a frustum with the source frame on its plane;
  - the camera trajectory;
  - an `MM:SS:FF` timecode.
- **Two variants:** v1 shows only the past; v2 shows the full trail from t=0.

## Goals / Non-Goals

**Goals:**
- The retro aesthetic runs **in real time** over the 4D scene, not pre-rendered.
- Moving time (scrub, playback, scroll) must not re-upload data to the GPU or touch the CPU point by point.
- The synthetic format is the same one a real pipeline will produce, with no changes to the viewer.
- A single source of truth for "the NOW", shared by points, source frame, HUD and scroll.

**Non-Goals:**
- Gaussian splats with depth sorting. The low-resolution aesthetic does not need them. Spark remains a future path.
- `WebGPURenderer` compatibility.
- Persisting visitor state (window positions, preferences).
- A real-data pipeline in Python. Only the format is reserved.

## Decisions

### D1. Vite + vanilla TypeScript + three.js r186 with `WebGLRenderer`
A single, very graphic page; React adds nothing and puts a layer between the windows' DOM and the render loop.

`WebGLRenderer` is chosen over `WebGPURenderer` for three reasons:
- Spark (the future path for splats) only works on WebGL2;
- on WebGPU, `Points` are always 1px;
- the native `GaussianSplat` in r186 is minimal.

*Alternatives:* R3F 9.8 (stable, but unnecessary here); `WebGPURenderer` + TSL (ships Bayer and pixelation out of the box, but with the problems above); PlayCanvas (the best for real 4DGS, but a different ecosystem).

### D2. 4D pack: little-endian SoA binary + JSON
```
pack/
  scene.json    version, synthetic, fps, frameCount, bbox (quantization),
                cameras[frame] {pos, quat, fov, aspect}, counts, source {w,h,pages}
  static.bin    "4DST" | N | pos u16[3N] | rgb u8[3N]
  dynamic.bin   "4DDY" | M | frameCount | offsets u32[frameCount+1]
                | pos u16[3M] | rgb u8[3M] | frame u16[M]
  source/       atlas pages (≤4096²) with the source frames at ~320px
```
- **Separate blocks per attribute (SoA), not interleaved.** WebGL requires stride and offset to be multiples of the type size, and 9–11 B per point does not satisfy that. SoA also uploads as-is as a normalized `BufferAttribute`.
- **Points sorted by frame with an offset table**, plus each point's frame. The table makes it possible to draw "up to now" with `drawRange`; the per-point `u16` makes it possible to compute age in the shader.
- **`u16` positions normalized to the `bbox`:** sub-millimeter precision in scenes tens of meters across, at half the weight of `f32`.
- **Source frames in a `DataArrayTexture`** (one layer per frame) rather than a `<video>`. Setting `currentTime` is asynchronous and depends on the GOP; the texture is frame-exact and has no latency. At 320px the dithering loses nothing.

*Alternatives:* PLY/SPZ per frame (heavy, and designed for splats); Rerun's `.rrd` (very useful for debugging, not for the web client); `<video>` + `requestVideoFrameCallback` (good for playback, bad for scrubbing).

### D3. `/bake`: synthetic generation in the browser, development only
- **Subject:** currently, a **black cat climbing a flight of stairs in an alley at night** (recipe `cat-stairs`, the default, decided on 2026-09-24): "Cat" by J-Toastie (glTF, CC-BY 3.0, no animations) with our own procedural animation (it walks to the foot of the stairs, climbs ten steps with a little hop per step, sits at the top and moves its tail) and the lighting baked into the point colors (sodium, cold streetlamp, neon, moon, rim and windows). It is baked at 30 fps × 14 s = 420 frames. Kept as recipes, not shown on any page: `cat-alley` (the same cat jumping onto the dumpster and the wall, 2026-09-23) and `deer-meadow` (the Deer by Quaternius, CC0, from the first version). The three cats share `catBase.ts`.
- **For each frame** (15 fps × ~20 s ≈ 300 frames):
  1. advance the `AnimationMixer`;
  2. apply skinning on the CPU (`SkinnedMesh.applyBoneTransform`);
  3. sample N points over the surface (`MeshSurfaceSampler`), with the texture's color;
  4. render the "real" mesh from the virtual camera into a render target → a layer of the source atlas.
- **Background:** a noisy meadow and tree trunks as columns of points, plus optional depth noise to imitate the artifacts of a monocular reconstruction (streaks and scattered points).
- **Output:** a download of the pack, which is placed in `public/packs/<name>/`.
- The pack carries `synthetic: true`, and the UI shows it.

It is done in the browser rather than in Node because three.js, the skinning and the source-frame render are already there, and because checking the bake visually is part of the work.

### D4. Time: a `TimeController` as the single source of truth
- **State:**
  - `frame` (continuous float);
  - `rate` (signed: `+1.0`, `−1.0`, `0` = HOLD, plus speed steps);
  - `mode` (`memory` | `all`).
- **What derives from it:**
  - the point uniforms (`uFrame`, `uDirection`, `uMode`);
  - the source atlas layer;
  - the frustum pose;
  - the HUD timecode;
  - the timeline position.
- **Scroll (chapter 03):** sets a *target*, and the controller reaches it with damping.
- **On-demand rendering:** a frame is rendered only if time, the camera or the display changed. That way the page uses no GPU at rest.

### D5. Subject point shader
- `age = uFrame − aFrame`.
- **Present** (`|age| < 0.5`): direction color (cyan/amber/neutral in HOLD), at full strength.
- **Past:** original color tinted toward a "trail" tone, with a density that drops with age.
- **Future:** hidden in `memory` (in addition to the `drawRange` clipping), faint in `all`.
- **Optional:** `uTrailStride` shows only every k-th frame in the trail, to mark the millipede's "legs".
- **Fading without transparency:** each point has a fixed threshold `hash(gl_VertexID)`. If the desired density is lower than that threshold, the point is discarded (stippling). With this:
  - every point is opaque, so there is no need to sort them or use blending;
  - the pattern sticks to the point and does not "swim" when the camera moves (the classic problem Obra Dinn had to solve).

*Discarded alternative:* real alpha, which requires sorting ~2M points and breaks the 1-bit look.

### D6. Frustum light, frustum and trajectory
- The view-projection matrix of the current frame's source camera comes in as a uniform. A background point whose position in those coordinates falls within [-1, 1] is lit; the rest are dimmed.
- The frustum is drawn with `LineSegments`. The image plane is a quad that samples the atlas layer for the present frame.
- The trajectory is a line through the camera positions in `scene.json`.

### D7. Retro display: low-resolution render + palette pass
1. The scene is rendered into a render target at a fraction of the resolution (1/3 by default, adjustable), with `NearestFilter`.
2. A full-screen quad applies ordered dithering (Bayer 8×8) to the color and picks the nearest color from a **uniform palette** (up to 16 entries, distance in OKLab), upscaling without smoothing.

Selector modes:
- **`1-bit`:** two palette entries.
- **`16 colors`:** the default.
- **`Millions`:** skips quantization and renders at full resolution.

The concrete palette values are set by the `/impeccable` direction; the mechanism only requires a palette of up to 16 colors. Floyd-Steinberg and Atkinson are ruled out in real time because they are sequential. They can be used for baked still images.

### D8. A single WebGL context for the whole page
One fixed full-screen canvas and a single renderer. Each embedded view (desktop, stacked Game of Life, pipeline mini-renders, footer logo) is a DOM element whose rectangle is painted with `setScissor`/`setViewport`. Offscreen views are not rendered.

This avoids the per-page context limit and shares the pack's buffers. *Alternative:* one canvas per section (simpler, but it multiplies contexts and data).

### D9. DOM windows with custom CSS
- Custom window component: title bar, body, 1px border and states.
- Dragging with Pointer Events and `setPointerCapture`, constrained to the viewport. The reference site's windows are fixed, but on a desktop full of tools dragging is what people expect. It also enables the XP-style window trail easter egg.
- **Keyboard:**
  - space: HOLD / resume;
  - J/K/L: rewind, pause and forward, with acceleration as in video editors;
  - arrows: frame by frame.
- 98.css and system.css are not used: they are abandoned, and the fonts they ship have dubious licensing.

### D10. Story page with Lenis + GSAP ScrollTrigger
- Chapters with reveals native to the grammar (dissolves by dithering threshold, not soft fades).
- **Chapter 03 pins the viewer** (`pin` + `scrub`) and turns scroll progress into the `TimeController`'s *target*.
- **Chapter 04's figures are read from the loaded pack:** frames, points, bytes and duration. They are never typed by hand.
- **Footer:**
  - a 3D logo reduced to edges (`EdgesGeometry`) with dotted `LineSegments2`, which turns toward the cursor with its dashes advancing ("marching ants");
  - candidate for the shape: the projection of a tesseract, to be confirmed by the direction.

### D11. `/impeccable` comes in once the technical core works
Order:
1. pack, `/bake`, viewer and display with a debug UI;
2. `/impeccable init` to write `PRODUCT.md`: *Experience* mode, local prototype, English copy and the reference site's grammar set as the reference aesthetic;
3. *new-work* flow: the "the brief wins" rule keeps the roll of directions within that grammar;
4. building the desktop and the page;
5. final reviewer;
6. the documenter writes `DESIGN.md`.

The reason: the look depends on the live render, and neither a comp nor a mock can fake the scene's dithering. The direction has to design on top of the real interaction.

### D12. B's hero: third person, spotlight, aurora and pinned scroll
Decided on 2026-09-24, for B only. A and C stay as a comparison. The four pieces are read together:
- **Third-person camera** (`src/core/shell/chaseCam.ts`):
  - the subject's center and heading per frame, computed from the pack's points and smoothed over ~1 s;
  - the camera sits three-quarters behind, on the open side of the alley (−68°, 17° elevation, 3.4 m; 2.6 m on narrow screens) and uses `exactFrame`, so it moves continuously even though the points change in steps;
  - while dragging, the visitor's angle is kept and the camera follows the subject; on release, it returns along the shortest arc;
  - the viewer needs a cutaway that follows the subject (not the box of the path) and a fade of the trail near the lens.
- **Spotlight:** A's frustum light, turned on in B, with the background visible.
- **Aurora:**
  - B's 16-color palette goes from 14 grays to a chromatic ramp: charcoal → teal → sage, and violet → plum → magenta, with a peach for the streetlamp;
  - a screen-space aurora sky behind the points, which the display quantizes and dithers like the scene;
  - its clock is the pack's "NOW", so in HOLD it does not force renders.
- **Pinned hero:** a 320svh segment with the desktop in `position: sticky`, and `bindScrollTime` in relative mode (from the current frame to the last).
  - Since sticky creates a stacking context, the whole desktop rises above the canvas.
  - The HOLD flash becomes a `filter: invert(1)` on the root.

## Risks / Trade-offs

- **[Risk] The on-screen Bayer pass produces a "shower door" effect when the camera moves.** → It is part of the classic look. Fades go through stable per-point stippling (D5), and the automatic camera moves slowly.
- **[Risk] The synthetic scene looks "too clean" next to a real reconstruction.** → Irregular sampling, depth noise and a scattered background in the bake (D3). A visible `synthetic` label.
- **[Risk] Broad scope (6 capabilities) for a local prototype.** → The tasks prioritize getting the first screen working end to end before the chapters. Chapters 05–06 are the first to be cut.
- **[Risk] The `/impeccable` roll of directions drifts away from the reference.** → Pin the aesthetic in `PRODUCT.md` and in the surface brief. The "the brief wins" rule takes precedence.
- **[Risk] Performance with ~2M points on modest laptops.** → Low-resolution render, on-demand rendering, unsorted opaque points, and per-frame density configurable in the bake.
- **[Trade-off] No real splats.** → With 2–16 colors and big pixels, a point and a splat read almost the same. Spark remains a future path for `Millions` mode.
- **[Risk] Accessibility of content that lives in a canvas.** → Text descriptions of each view, keyboard playback controls and labels, and respect for `prefers-reduced-motion` (no autoplay, no dissolves, still camera).
- **[Risk] Licenses.** → CC0 or CC-BY models (currently, the cat by J-Toastie, CC-BY 3.0, credited in `LICENSES.md` and on every page) and OFL or Apache fonts. Nothing from the reference site.

## Migration Plan

Not applicable: a local prototype with no deploy. It runs with `npm install && npm run dev`, and the bake page lives at `/bake`.

## Open Questions

- Exact palette, typefaces and logo shape: set by the `/impeccable` direction within the mechanisms defined here.
- Final trail stride and per-frame density: tuned by looking at the bake, without changing the format.
