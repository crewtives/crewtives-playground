# The engine

This guide walks through the code that plays a **4D pack**: a scene reconstructed in space and time, shown as a point cloud where every moment of the clip is present at once, through a low-resolution retro display. It follows the data from the file on disk to the pixel on screen, then covers the desktop shell around the viewer and the bake pipeline that produces the packs.

Everything here lives in two folders:

- [`src/engine/`](../src/engine/) is the engine. It imports nothing from the rest of `src/`, only `three`, `gsap` and `lenis`.
- [`src/pipeline/`](../src/pipeline/) holds the scene equations and the baker that writes packs. It imports the engine, never a site.

The five 4D.OS worlds and the launcher in [`src/4d-os/`](../src/4d-os/) compose these pieces; the playground landings reuse the engine and the display. For the layout of the whole repository, see [architecture.md](architecture.md). For the vocabulary (the NOW, trail, source frame, full plate…), see [glossary.md](glossary.md).

![World B, Plate: the present cat in the forward color, its earlier moments as a trail of pale cats, and the desktop windows around the viewer (source camera, exposures, layers, monitor, timeline)](images/world-b-plate.png)

*World B at 1440×900. The cat is from "Cat" by J-Toastie, [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) ([source](https://poly.pizza/m/8GJbfM8R1A)); the animation and the scene are procedural and synthetic.*

## Contents

1. [The big picture](#1-the-big-picture)
2. [The 4D pack](#2-the-4d-pack)
3. [The Engine: one WebGL context, many views](#3-the-engine-one-webgl-context-many-views)
4. [TimeController: the NOW](#4-timecontroller-the-now)
5. [TimeViewer: every moment at once](#5-timeviewer-every-moment-at-once)
6. [RetroDisplay: resolution, dither and palettes](#6-retrodisplay-resolution-dither-and-palettes)
7. [The shell: desktop, windows and scroll](#7-the-shell-desktop-windows-and-scroll)
8. [The bake pipeline](#8-the-bake-pipeline)
9. [Checking your work](#9-checking-your-work)

Each section links the OpenSpec living spec that states the behavior as requirements with scenarios. When the code and this guide disagree, the spec and the tests are the reference.

**Decision numbers in comments.** Code comments cite decisions such as `(D2)` or `(D5)`. They point to the design of the OpenSpec change that introduced the code:

| Code | Design |
|---|---|
| Pack format, `/bake.html`, `TimeController`, point shaders, frustum light, `RetroDisplay`, single canvas, windows, story page | [`add-4d-os-local-demo`](../openspec/changes/archive/2026-09-24-add-4d-os-local-demo/design.md) (D1–D12) |
| Hero gesture, pinch, chase camera, stable points and interpolated present, the cat's walk, the falcon and the whale | [`add-cosmic-landings-and-organic-motion`](../openspec/changes/archive/2026-09-28-add-cosmic-landings-and-organic-motion/design.md) (D1–D12) |

Paths inside archived changes describe the repository as it was when each change was made (for example `src/core` for today's `src/engine`); see [openspec-workflow.md](openspec-workflow.md).

## 1. The big picture

```
 development only                                     every page
 ─────────────────                                    ──────────
 /bake.html  (src/pipeline/bake)                      loadPack() ─► Pack
   recipe ─► SyntheticScene ─► writePack()                           │
                 │                                                   ▼
                 └── POST /__pack/save ─► sites/4d-os/public/packs/<name>/
                                                                     │
      TimeController (the NOW) ──► TimeViewer ──► RetroDisplay ──► Engine canvas
                                        ▲
         shell: desktop windows, timeline, keyboard, hero gesture, chase camera
```

- A **4D pack** is four kinds of files: metadata, a static layer (the background), a dynamic layer (the subject, frame by frame) and the source frames (the "video").
- The **Engine** owns the only WebGL context. Each 3D view on the page is a DOM rectangle that the engine paints with viewport and scissor.
- The **TimeController** holds the NOW: the current frame, the speed, the direction and the time mode.
- A **TimeViewer** is a view of one pack. It uploads the pack to the GPU once; changing the NOW only changes uniforms, a draw range, the frustum pose and a texture layer.
- The **RetroDisplay** draws the viewer's scene at a fraction of the resolution, then dithers it to a palette read from CSS custom properties.
- The **shell** connects the desktop markup (windows, timeline, keyboard, scroll) to those objects.

A world's entry file shows the whole assembly in a few dozen lines. Read [`src/4d-os/worlds/a/main.ts`](../src/4d-os/worlds/a/main.ts) first; its core, slightly trimmed, is:

```ts
const engine = new Engine();
const display = new RetroDisplay({ tokenRoot: html, pixelScale: cssNumber(html, '--render-scale', 3) });
const pack = await bootPack({ url: PACK_URL, boot: $('[data-boot]'), display, engine });
const time = new TimeController({ frameCount: pack.meta.frameCount, fps: pack.meta.fps, mode: 'memory' });
engine.addTicker((dt) => time.update(dt));
const scene = new TimeViewer({ engine, element: glass, pack, time, display });
engine.add(scene);
bindDesktop({ time, display, pack, viewer: scene });
```

## 2. The 4D pack

Spec: [`4d-pack`](../openspec/specs/4d-pack/spec.md). Code: [`src/engine/pack/format.ts`](../src/engine/pack/format.ts) (the contract), [`loader.ts`](../src/engine/pack/loader.ts) (fetch and validate), [`writer.ts`](../src/engine/pack/writer.ts) (encode). Tests: [`pack.test.ts`](../src/engine/pack/pack.test.ts).

The pack is the contract between whatever produces the data and the viewer. Today every pack is synthetic, baked in the browser (section 8); a real reconstruction pipeline would write the same files, and the viewer would behave the same, apart from the "synthetic" label.

### Files

```
<pack>/
  scene.json          metadata (SceneMeta)
  static.bin          background points
  dynamic.bin         subject points, grouped by frame
  source/page-0.png   atlas pages with the source frames
  source/page-1.png   …
```

Three packs ship in the repository, under [`sites/4d-os/public/packs/`](../sites/4d-os/public/packs/): `cat-stairs` (worlds A, B, C and the launcher), `falcon-phi` (world D) and `whale-fall` (world E). Two more recipes, `cat-alley` and `deer-meadow`, are kept in the baker; their packs are ignored by git and can be regenerated with `/bake.html`, byte for byte on the same browser and GPU (see *Determinism* in section 8).

### `scene.json`

`SceneMeta` in `format.ts` declares:

- `version` (currently 1), `name`, `synthetic`, `fps` and `frameCount` (at most 65,536, because each dynamic point stores its frame as a `u16`);
- `bbox`: the bounds used to quantize positions;
- `cameras`: exactly one source camera per frame, with `pos`, `quat` (x, y, z, w; the camera looks down its local −Z, as in three.js), vertical `fov` in degrees and `aspect`;
- `counts` of static and dynamic points;
- `source`: the size of one source frame, the atlas grid (`columns` × `rows` per page) and the page paths;
- `files`: the byte size of every other file, so the loader can report real progress;
- optional `correspondence`, `pointSize` (a suggested point size in meters per layer) and `generator` (the parameters it was baked with, for information only).

### The binary layers

Everything is little-endian, split by attribute (structure of arrays), with no interleaving and no padding:

| File | Layout |
|---|---|
| `static.bin` | `"4DST"` · `u32 N` · positions `u16[3N]` · colors `u8[3N]` |
| `dynamic.bin` | `"4DDY"` · `u32 M` · `u32 frameCount` · offsets `u32[frameCount + 1]` · positions `u16[3M]` · colors `u8[3M]` · frames `u16[M]` |

Why this shape:

- **Separate blocks per attribute.** WebGL needs attribute strides and offsets that are multiples of the type size, and 9 or 11 bytes per point is not. Separate blocks also upload as they are, as normalized `BufferAttribute`s, without a conversion pass. The loader creates typed-array views straight on the fetched buffer; the one exception is the `u16` frame block, which is misaligned when `M` is odd and is then copied.
- **Quantized positions.** Each axis is a `u16` normalized to the bbox: `p = min + (q / 65535) · (max − min)`. The maximum error is half a step (`quantizationError` in `writer.ts`). For `cat-stairs`, whose bbox spans about 4.8 × 8.3 × 22.2 m, that is under 0.2 mm, at half the size of `f32`. The CPU never dequantizes: the viewer uploads the normalized values and gives the `Points` object a model matrix (position = `bbox.min`, scale = bbox size) that maps [0, 1] back to the scene.
- **Colors** are 8-bit sRGB; the point shaders convert them to linear.
- **Points sorted by frame, plus an offset table, plus a frame per point.** The points of frame `f` occupy `[offsets[f], offsets[f + 1])`. The table lets the viewer draw "everything up to now" with a single draw range; the per-point frame lets the vertex shader compute each point's age without a lookup.

A worked example, from `cat-stairs` (420 frames at 30 fps, 4,000 subject points per frame):

| File | Bytes | How |
|---|---|---|
| `static.bin` | 5,077,250 | 8 + 9 × 564,138 points |
| `dynamic.bin` | 18,481,696 | 12 + 4 × 421 offsets + 11 × 1,680,000 points |
| `source/page-0.png`, `page-1.png` | 18,428,091 and 10,897,585 | 420 frames of 320×180, 264 per page |

### Source frames and the atlas

The source frames are the video the scene was "reconstructed" from, one per frame, seen by that frame's camera. They are packed into cells of PNG pages of at most 4096 × 4096: `atlasLayout(width, height, frameCount)` picks the grid and `sourceCell(source, frame)` returns the page and pixel offset of a frame. At 320 × 180, a page holds 12 × 22 = 264 frames.

The atlas is used two ways:

- The viewer decodes every page once, in `decodeSourcePages` (`loader.ts`), into one RGBA layer per frame with rows flipped bottom to top, and uploads them as a `DataArrayTexture`. Showing frame `f` is then choosing layer `f`: frame-exact and without latency, which a `<video>` element cannot promise when scrubbing, because seeking is asynchronous. The cost is memory: about 97 MB of RGBA for `cat-stairs`.
- The desktop's camera window does not decode anything: `paintSourceFrame` ([`src/engine/shell/sourceFrames.ts`](../src/engine/shell/sourceFrames.ts)) sets the page as a CSS background and positions it on the right cell.

### Correspondence between frames

A pack may declare `"correspondence": true`. It then promises that every frame has the same number of subject points `N`, and that point `offsets[f] + i` is the same place on the subject's surface in every frame `f`. The viewer uses it to draw the present between two frames (section 5). Packs without the flag stay valid and behave as before. All three shipped packs declare it.

### Loading and validation

`loadPack(baseUrl, { onProgress })`:

1. fetches `scene.json` and validates it with `parseScene`;
2. fetches `static.bin`, `dynamic.bin` and every page in parallel, streaming each body and counting bytes against the sizes declared in `files`, so progress reflects bytes actually received;
3. copies each file into a buffer of its exact size, then validates and wraps it with `parseStatic` and `parseDynamic`;
4. decodes the atlas pages and returns a `Pack` with `meta`, `static`, `dynamic`, `source`, `correspondence` (`{ pointsPerFrame }` or `null`) and the total `bytes`.

Validation is strict because a silently empty scene is the worst failure. Every check throws a `PackError(layer, reason)` whose message names the layer and, for count mismatches, both values: a wrong magic, an unsupported version, a camera count that differs from the frame count, an offset table that does not start at 0, end at `M` or grow monotonically, a point whose frame does not match its range, or declared correspondence with unequal frames. The boot window shows that message (section 7). The loader also refuses to run on a big-endian platform, since the typed views assume little-endian.

### Writing

`writePack(input)` ([`writer.ts`](../src/engine/pack/writer.ts)) is the inverse, a pure function used by the baker and the tests. It takes float positions and 8-bit colors per frame, validates the input (one camera per frame, enough atlas pages, equal counts when `correspondence` is requested), computes the bbox if none is given, quantizes and writes both binaries, rounds the camera values to six decimals, and returns the JSON and the two `ArrayBuffer`s. The PNG pages are encoded by the caller.

## 3. The Engine: one WebGL context, many views

Spec: [`time-viewer`](../openspec/specs/time-viewer/spec.md) (on-demand rendering) and [`story-page`](../openspec/specs/story-page/spec.md) (offscreen views at rest). Code: [`src/engine/engine/Engine.ts`](../src/engine/engine/Engine.ts).

A world page has many 3D views: the main viewer, the pipeline figures, the scroll chapter, the Game of Life stack, the footer logo. One canvas per view would multiply WebGL contexts, which browsers cap per page, and each would hold its own copy of the pack. Instead, the `Engine` creates one full-screen `position: fixed` canvas with `pointer-events: none` and one `WebGLRenderer`, and paints every view into its own rectangle.

- **A view is a DOM element.** Anything that implements `EngineView` (`element`, an optional `tick(dt, now)` and `render(renderer, rect)`) can be added with `engine.add(view)`. On every frame the engine measures each element with `getBoundingClientRect`, converts it to device pixels with the GL origin at the bottom left, skips elements that are off screen, and before calling `render` sets the viewport and the scissor to that rectangle. Pointer events go to the element under the transparent canvas, so each view's controls listen on its own element.
- **Layering.** The canvas sits at `z-index: var(--engine-z, 5)` and is transparent where no view paints, so ordinary page content shows through. Desktop windows stack from z-index 20 upward, above the canvas.
- **On-demand loop.** There is a `requestAnimationFrame` only while something needs one: `invalidate(view?)`, a scroll or resize, a `ResizeObserver` on the canvas (a classic scrollbar can appear without a window resize), or a ticker or a visible view's `tick` that returns `true` ("I am still moving"). At rest, no frame is produced and the GPU is idle. `dt` is capped at 100 ms, and it is 0 on the first frame after the loop wakes up.
- **Partial repaints.** The renderer uses `preserveDrawingBuffer`, so one view can repaint alone without erasing the others. When the layout changes (any scroll moves every rectangle on a fixed canvas), the engine clears the whole canvas and repaints all visible views.
- **Tickers** (`addTicker`) run before the views on every loop iteration. The world's `time.update(dt)` is one; the boot dissolve is another.
- **Resolution.** The device pixel ratio is capped by `maxDpr` (2 by default), and the renderer's own pixel ratio is kept at 1 with the canvas sized in device pixels, so every view knows its exact pixel grid (`ViewRect.dpr`).
- **Counters** for verification: `engine.stats` (frames and loop iterations), `rendersOf(view)` and `isVisible(view)`.

## 4. TimeController: the NOW

Spec: [`time-viewer`](../openspec/specs/time-viewer/spec.md) (a single shared NOW, playback, time modes). Code: [`src/engine/time/TimeController.ts`](../src/engine/time/TimeController.ts). Tests: [`TimeController.test.ts`](../src/engine/time/TimeController.test.ts).

The NOW must be one value: the subject, the source frame on the image plane, the frustum pose, the timecode and the timeline must never disagree by a frame. The `TimeController` keeps a continuous position to accumulate playback, but everything it publishes derives from the integer `frame = floor(position)`.

- **State** (`TimeState`): `frame`, `rate` (signed, in multiples of real time; 0 is HOLD), `direction` (1 forward, −1 rewind, 0 HOLD) and `mode` (`memory`: the present and the past; `all`: the future too).
- **Playback.** `update(dt)` advances `position += rate · fps · dt` and wraps at both ends, so looping playback continues from the opposite end. It returns whether time is still moving, which is how a world's ticker keeps the engine awake while playing and lets it sleep in HOLD.
- **Transport**, as in video editors: `togglePlay` (space), `forward` and `rewind` (L and J, which step up through `speedSteps`, 1× 2× 4× 8× by default), `hold` (K), `step(±1)` (arrow keys, one frame and HOLD), `seek(frame)` (a click or drag on the timeline).
- **Targets for scroll.** `setTarget(frame)` makes the position chase a frame with exponential damping (`damping`, 0.12 s by default) instead of playing; `direction` and `rate` then report the chase, so scrolling down shows the forward color and scrolling up the rewind color. `releaseTarget()` returns to normal playback at the previous rate. A target does not wrap.
- **Notifications.** `subscribe(listener)` fires only when `frame`, `rate`, `direction` or `mode` change. Anything that needs motion between two integer frames reads `exactFrame` in its own `tick` instead: the interpolated present, the chase camera and the worlds' skies do.
- **Labels** for the interface: `timecode(frame, fps)` gives `MM:SS:FF` and `playbackLabel(state)` gives `FORWARD +1.00×`, `REWIND −1.00×` or `HOLD 0.00×`.

Several controllers can drive views of the same pack. World A's pipeline chapter uses one controller held at a single frame and another in `all` mode next to the main one; the GPU data is shared, only the uniforms differ.

## 5. TimeViewer: every moment at once

Spec: [`time-viewer`](../openspec/specs/time-viewer/spec.md). Code: [`src/engine/viewer/TimeViewer.ts`](../src/engine/viewer/TimeViewer.ts), [`packGpu.ts`](../src/engine/viewer/packGpu.ts), the shaders [`dynamic.vert.glsl`](../src/engine/viewer/dynamic.vert.glsl), [`static.vert.glsl`](../src/engine/viewer/static.vert.glsl), [`common.glsl`](../src/engine/viewer/common.glsl), [`points.frag.glsl`](../src/engine/viewer/points.frag.glsl), [`plane.frag.glsl`](../src/engine/viewer/plane.frag.glsl), and [`pinch.ts`](../src/engine/viewer/pinch.ts). Tests: [`packGpu.test.ts`](../src/engine/viewer/packGpu.test.ts), [`pinch.test.ts`](../src/engine/viewer/pinch.test.ts).

A `TimeViewer` is an `EngineView` that shows one pack under one `TimeController`, through one `RetroDisplay`.

### Upload once, move uniforms

`packGpu(pack)` builds the GPU resources of a pack once and caches them in a `WeakMap`, so every view of the same pack shares them: the static and dynamic geometries (normalized `u16` positions, `u8` colors, and the per-point frame `aFrame`), the source `DataArrayTexture`, a unit frustum and image plane, the camera trajectory line, the view-projection matrix of every frame's source camera, and the subject's bounds for framing.

When the NOW changes, `syncTime` updates only:

- the uniforms `uFrame`, `uDirection` and `uMode`;
- the dynamic draw range: in `memory` mode it stops at `offsets[frame + 1]`, so future points are not even processed;
- the frustum light's matrix, the image plane's texture layer and the frustum's pose and scale for that frame.

No point data moves to the GPU and no loop runs over points on the CPU, whatever the scrub speed. The spec states this as a requirement, and the `/debug.html` page measures it (section 9).

### The point shaders

The dynamic layer ([`dynamic.vert.glsl`](../src/engine/viewer/dynamic.vert.glsl)) computes `age = uFrame − aFrame` per point:

- **The present** (`|age| < 0.5`) takes the direction color: `--accent-forward`, `--accent-rewind` or `--accent-hold`, and is drawn 25 % larger.
- **The past** is the trail: tinted toward `--trail`, darker with age, and with a density that falls from `trailMax` to `trailMin` as `exp(−age / trailTau)`. `setTrailStride(k)` keeps only one of every `k` frames, which turns a continuous smear into distinct exposures (the "millipede" legs of a chronophotograph).
- **The future** is hidden in `memory` mode and drawn dimmer and sparser, tinted toward `--future`, in `all` mode.

Fading is done without transparency. Each point has a fixed pseudo-random threshold computed from its vertex index (`pointThreshold` in [`common.glsl`](../src/engine/viewer/common.glsl)); a point whose desired density is below its threshold is moved outside the clip volume. Every drawn point is opaque, so nothing needs sorting or blending, and because the threshold belongs to the point, the stipple pattern does not swim when the camera moves. Real alpha would require sorting about two million points per frame and would break the 1-bit look.

Point sizes are whole pixels: `pointSize` in `common.glsl` turns a size in meters into a rounded pixel count for the current distance, capped by `setMaxPointSize`. Each point is then a stable N×N block, which avoids flicker as it moves across pixel boundaries.

### Frustum light, frustum and image plane

The static layer ([`static.vert.glsl`](../src/engine/viewer/static.vert.glsl)) projects every background point with the current frame's source camera (with a far plane of 40 m, `LIGHT_FAR`). Points inside that frustum are drawn at full strength; points outside are thinned and pulled toward `--scene-bg`. As the source camera moves, the lit area of the background moves with it: the viewer shows what the "video" was looking at. `setFrustumLightLook` tunes the density and darkening, `setBackgroundLevel` sinks the whole background.

The frustum itself is a set of lines scaled per frame from the camera's field of view, and its image plane samples the source texture at layer `frame` ([`plane.frag.glsl`](../src/engine/viewer/plane.frag.glsl)), unmirrored from behind. The trajectory is a line through every camera position. Each of these, the trail and the background can be toggled with `setLayers` (the desktop's Layers window).

### The interpolated present

At 30 fps, a subject redrawn only on integer frames steps visibly on a 120 Hz screen. When the pack declares correspondence, `packGpu` adds an `aNext` attribute: the positions shifted by one frame (the last frame repeats). The shader draws the present at `mix(position, aNext, uFrac)`, where `uFrac = exactFrame − frame` while time runs and 0 in HOLD. Without correspondence, `aNext` is the same attribute as `position`, so the shader does not change and no memory is added. Only the present moves between frames: the trail, the source frame, the frustum and the timecode stay on the integer frame. Because the `TimeController` only notifies on integer changes, the viewer's `tick` checks `exactFrame` itself and repaints when the fraction changes.

### Camera, orbit and pinch

Each viewer has a `PerspectiveCamera` and three.js `OrbitControls` on its element, set up so that the page keeps its scroll:

- the orbit's own wheel zoom and pan are off: the wheel always scrolls the page;
- `touch-action: pan-y` while orbiting: a vertical finger scrolls the page, a horizontal one orbits;
- zoom comes only from the viewer's own pinch recognizer (`bindPinch` and `PinchRecognizer` in [`pinch.ts`](../src/engine/viewer/pinch.ts)), which merges two touch pointers, trackpad pinch (Ctrl + wheel) and Safari's `GestureEvent` into a change of ln(camera distance), and prevents the browser's page zoom over the view. By default it drives a critically damped spring on ln(distance) toward the orbit target, within the orbit's distance limits. `setPinchHandler(handler)` hands the pinch to someone else, as the hero gesture does, and `zoomBy` is the single-pointer alternative for buttons and keys.

Framing helpers: `defaultPreset(aspect, fov, framing)` frames the subject's box obliquely, about 65° off the source cameras' mean direction so the image plane is seen at an angle; `closeUp` ([`src/engine/shell/closeUp.ts`](../src/engine/shell/closeUp.ts)) frames a single frame; `sidePreset` ([`sidePreset.ts`](../src/engine/shell/sidePreset.ts)) is a fixed side camera with a narrow field of view that reads the whole path as a flat plate, in the manner of Étienne-Jules Marey's chronophotographs. With no interaction for 3 s, the view orbits slowly, but only while time is playing and never under reduced motion, so a view in HOLD produces no renders at all.

Two more tools keep the subject visible in cluttered scenes. `setCutaway(true)` is a dollhouse cut: background points between the camera and the subject are hidden, except the floor, with a plane that turns with the orbit (`setCutFocus` centers it on the subject for a following camera). `setNearFade` stipples out points closer than a given distance to the lens.

### Colors from the page

`refreshTokens` reads the scene colors from CSS custom properties on the token root: `--scene-bg`, `--accent-forward`, `--accent-rewind`, `--accent-hold`, `--trail`, `--future`, `--frustum`, `--trajectory` and `--background-level`. It runs on creation and whenever the display reports that tokens may have changed, so a world restyles its scene from CSS alone.

Worlds can also add their own objects to `viewer.scene`, which the display then quantizes like everything else: world B's aurora sky ([`src/4d-os/worlds/b/aurora.ts`](../src/4d-os/worlds/b/aurora.ts)) and world E's gravitational-lens sky ([`src/4d-os/worlds/e/lens.ts`](../src/4d-os/worlds/e/lens.ts)) are full-screen quads whose clock is `time.exactFrame`, so they stand still in HOLD.

## 6. RetroDisplay: resolution, dither and palettes

Spec: [`dither-display`](../openspec/specs/dither-display/spec.md). Code: [`src/engine/display/RetroDisplay.ts`](../src/engine/display/RetroDisplay.ts), [`display.frag.glsl`](../src/engine/display/display.frag.glsl), [`palette.ts`](../src/engine/display/palette.ts). Tests: [`display.test.ts`](../src/engine/display/display.test.ts).

The display gives the scene the look of a real-time retro screen. `display.render(renderer, rect, scene, camera, options)` works in two passes:

1. **Low resolution.** The scene is drawn into a render target of `ceil(rect / block)` pixels, where `block = round(pixelScale × dpr)` in the quantized modes (`pixelScale` is 3 CSS pixels by default) and 1 in `Millions`. Targets are cached by size, with nearest filtering. A callback (`onResolution`) lets the viewer set its point sizes in the target's pixels.
2. **Palette pass.** A full-screen quad, clipped to the view by the scissor the engine already set, reads one texel per block with `texelFetch`, so every block is a crisp square. In `Millions` it outputs the color as is. In `1-bit` and `16 colors` it applies the mode's levels curve, adds an **8×8 Bayer ordered dither** offset, and picks the **nearest palette color in OKLab**, a perceptual color space where distance tracks visible difference.

Ordered dither is used because every pixel is computed independently in the shader; error diffusion (Floyd-Steinberg and relatives) is sequential and does not fit a real-time fragment pass.

- **Modes** (`DisplayMode`): `'1bit'` (exactly two colors; the levels curve sends shadows to ink and highlights to paper so the dither is left for transitions), `'16'` (the default, up to sixteen colors) and `'millions'` (no quantization, full resolution). Changing mode only changes uniforms and the target size: no point data is touched.
- **Palettes from CSS.** The colors are the custom properties `--pal-1bit-0`…`1` and `--pal-16-0`…`15` on the token root. `cssToRgb8` converts any CSS color syntax, including `oklch()`, by painting it into a 1×1 canvas. A `MutationObserver` on the root's `style`, `class`, `data-world` and `data-theme` attributes, and Vite's CSS hot reload in development, trigger `refreshTokens`, so editing a token changes the next render. Missing tokens fall back to a neutral development palette, with one console warning.
- **Grading.** `--display-chroma` scales OKLab chroma and `--display-exposure` scales linear light before quantization (1 means untouched).
- **Reveal dissolve.** `display.reveal` (and a view's own `reveal`, combined by taking the smaller) is a threshold: a pixel shows only if its Bayer threshold is below it, otherwise it shows the background color. Stepping it from 0 to 1 in jumps gives a pixel dissolve instead of a soft fade. The boot uses it, and worlds B, D and E use it to hide the loop seam.
- **Shape mask.** An optional `mask` (`ellipse` or `roundrect` with a radius in CSS pixels) makes the display transparent outside the shape, evaluated per block. The playground landings use it; no 4D.OS world does, and without a mask the output is unchanged.
- **Listeners.** `onChange` fires when the mode, scale, reveal or palette change (views repaint); `onTokens` fires after tokens are re-read (views re-read their scene colors).

Because the token root is a parameter, one page can show one scene in several palettes. The launcher ([`src/4d-os/launcher/main.ts`](../src/4d-os/launcher/main.ts)) loads one pack and runs one `TimeController`, with three `RetroDisplay`s whose token roots are three `.world[data-world]` elements: the same NOW in the palettes of worlds A, B and C.

## 7. The shell: desktop, windows and scroll

Specs: [`desktop-shell`](../openspec/specs/desktop-shell/spec.md), [`hero-gesture`](../openspec/specs/hero-gesture/spec.md), [`story-page`](../openspec/specs/story-page/spec.md). Code: [`src/engine/shell/`](../src/engine/shell/), [`src/engine/window/windows.ts`](../src/engine/window/windows.ts), [`src/engine/views/`](../src/engine/views/). Tests: [`shell.test.ts`](../src/engine/shell/shell.test.ts), [`zoomHero.test.ts`](../src/engine/shell/zoomHero.test.ts), [`views.test.ts`](../src/engine/views/views.test.ts).

The shell has no styles of its own. Each world supplies its markup and CSS; these modules attach behavior to standard attributes and publish state as attributes and custom properties for the CSS to use.

### Boot

`bootPack({ url, boot, display, engine })` ([`boot.ts`](../src/engine/shell/boot.ts)) sets the display's reveal to 0, loads the pack while writing the real byte progress to `--progress` and `[data-boot-pct]`, then reveals the scene with the threshold dissolve (1.1 s in 14 steps by default; instant under reduced motion). If loading fails, the boot window stays visible with the `PackError` text, in the world's own voice through `errorText`, and the promise rejects.

### The desktop

`bindDesktop({ time, display, pack, viewer })` ([`desktop.ts`](../src/engine/shell/desktop.ts)) connects the markup to the engine objects:

| Markup | Behavior |
|---|---|
| `[data-now="timecode" \| "frame" \| "state"]` | live text of the NOW |
| `<html data-direction>`, `--accent-current` | playback direction, for the world's CSS |
| `[data-play]`, `input[name="mode"]`, `input[name="depth"]` | HOLD/resume, memory/all, display mode |
| `input[data-layer]` | the viewer's layers |
| `[data-track]` and `[data-ruler]` | the timeline |
| `[data-source-frame]` | the current source frame, as a CSS background |
| `[data-wall-clock]`, `[data-stat]` | the wall clock and the pack's figures |
| `[data-trail]`, `[data-dismiss]` | the window echo, and a close button |

It also installs the global keyboard. The pieces it uses can be bound on their own:

- **Timeline** ([`timeline.ts`](../src/engine/shell/timeline.ts)): `bindTimeline(track, time)` turns a `role="slider"` element into a scrubber. A press jumps, a drag scrubs with `seek` in HOLD and resumes the previous rate on release, and arrows, Page Up/Down, Home and End work from the keyboard. It publishes `--playhead` (0–1) and keeps `aria-valuenow` and a timecode `aria-valuetext` current. `renderRuler` draws one tick per second and a label every 5 s.
- **Keyboard** ([`keyboard.ts`](../src/engine/shell/keyboard.ts)): space toggles HOLD, J/K/L rewind, hold and play forward (repeating speeds up), and the arrows step one frame. `isTypingTarget` yields exactly the keys a focused control uses (a text field keeps all of them, a slider the arrows, a button the space bar).
- **Window trail** ([`windowTrail.ts`](../src/engine/shell/windowTrail.ts)): while a `[data-trail]` dialog is dragged, it leaves inert copies at its earlier positions, cleared from oldest to newest after release. It is the 2D version of "every moment at once", and it is off under reduced motion.
- **Figures** ([`packStats.ts`](../src/engine/shell/packStats.ts)): `fillStats` writes frames, duration, fps, point counts and total size, all read from `scene.json`, into `[data-stat]` elements. No figure on a page is typed by hand.

The draggable windows are not one of those pieces: `bindDesktop` does not bind them, and worlds A, B and C call `bindWindows()` ([`windows.ts`](../src/engine/window/windows.ts)) themselves. It makes every `.win[data-window]` draggable by its `.win__title` with Pointer Events and pointer capture. The offset is applied with `translate`, so the window keeps its place in the world's layout; it stays inside the viewport, the touched or focused window comes to the front, and a world disables dragging with `--win-drag: 0` (narrow layouts stack the windows under the viewer). A `pointercancel`, which means the browser took the gesture as a scroll, puts the window back.

### Story page and "scroll is time"

After the first screen, every world continues with a chaptered story page: the `story-page` spec gives the order for A, B and C, and the `cosmic-landings` spec for D and E. The engine pieces behind them:

- **Smooth scroll** ([`smoothScroll.ts`](../src/engine/shell/smoothScroll.ts)): Lenis driven by the GSAP ticker and synchronized with ScrollTrigger. It is not installed under reduced motion, where native scrolling is already right. By default every visit starts at the top.
- **"2D + time = 3D"**, in worlds A, B and C: `LifeStackView` ([`lifeStack.ts`](../src/engine/views/lifeStack.ts)) stacks the generations of a Game of Life glider in depth, so its motion reads as a shape in space.
- **The pipeline chapter**, in worlds A, B and C, shows the same frame three ways: the source frame (`paintSourceFrame`), that single frame in 3D (a `TimeViewer` whose own controller is held there) and every moment at once (a controller in `all` mode).
- **"Scroll is time"** ([`scrollTime.ts`](../src/engine/shell/scrollTime.ts)), in worlds A and C: `bindScrollTime(section, time, { wake })` maps the section's ScrollTrigger progress to `time.setTarget(frame)`, so scrolling down advances with the forward color and scrolling up rewinds; leaving the section releases the target and restores the previous playback. The viewer stays on screen through CSS (`position: sticky` inside a tall section), not through script. `wake` requests an engine frame, because a new target produces no notification until the next `update`.
- **Footer**: `TesseractView` ([`tesseract.ts`](../src/engine/views/tesseract.ts)) draws a rotating 4D hypercube with dashed edges that turns toward the cursor, still under reduced motion.

Views that are off screen are not measured as visible, so they neither tick nor render.

### The hero gesture

Worlds B, D and E open with a gesture hero instead of a scroll chapter ([`zoomHero.ts`](../src/engine/shell/zoomHero.ts)). The hero is a tall section with a `position: sticky` stage; scrolling stays native (inertia, scrollbar, keys and anchors work unchanged), and a ScrollTrigger only reads the progress `p` through the section. Capturing wheel and touch events was rejected because it forces all of that to be rebuilt by hand.

The travel is split into segments that never overlap, so one gesture has one visible effect:

| Segment | Default range | What scrolling changes |
|---|---|---|
| `loop` | `p < 0.55` | only the zoom `z`; time loops on its own clock |
| `final` | `0.55 ≤ p < 0.9` | only time, from the current frame to the last one |
| `rest` | `0.9 ≤ p ≤ 1` | nothing: zoomed out, last frame, HOLD |
| `after` | past the hero | the final state is forced (a link, End or the scrollbar got there directly) |

- The mapping is the pure function `heroPhase(p, pinch, state)`, unit-tested on its own. The zoom follows `z0 + (1 − z0) · ease(p / 0.55)`; a pinch adds to it, weighted by the zoom the scroll has left, so the fully zoomed-out plate is always the same.
- The final segment always covers the last seconds of the clip (`finalWindow`, 4 s by default) with the same scroll length. If the current frame is more than a second before that window, the jump into it is covered by `onDissolve`; inside the segment the target is `from + (last − from) · q`, rounded to a whole frame, with a short damping (0.03 s) because Lenis already smooths the scroll.
- The loop seam (last frame to first) also calls `onDissolve`. In the worlds, it runs the view's reveal dissolve and resets the camera in the same tick, so the camera never visibly sweeps along the path.
- HOLDs that the gesture creates are marked with `<html data-hold-origin="gesture">`, so effects reserved for a HOLD the visitor asked for (world B's plate inversion) do not fire.
- The hero knows nothing about cameras. It publishes `z` through `onZoom`, takes the pinch from the viewer with `setPinchHandler`, and also accepts `[data-zoom="in|out"]` buttons and the + and − keys.
- Under reduced motion there is no autoplay, no dissolve and no smoothing, and the page still reaches the next section.

### The chase camera

`bindChaseCam({ engine, viewer, time, track })` ([`chaseCam.ts`](../src/engine/shell/chaseCam.ts)) is the third-person camera of B, D and E:

- `subjectTrack(pack)` computes the subject's center and horizontal heading in every frame from the pack's points. The heading keeps its last value while the subject is nearly still, so the camera does not swing around a sitting cat.
- The camera follows the continuous NOW (`exactFrame`) from behind and at a diagonal. Its aim is the path prefiltered with a centered Gaussian (σ = 0.2 s, no lag because the path is baked) plus a critically damped spring on top.
- `setZoom(z)` moves the distance on a logarithmic scale from `near` to a far distance computed so the box of every moment fits the free part of the view (`frame`, which keeps clear of the windows). Past `z = 0.55` the aim slides to the box center and the elevation and side open, until at `z = 1` the camera stands still and frames the full plate even while time runs.
- The visitor can drag through 360°, even below the horizon; after `returnDelay` (2.2 s) the angle returns behind the subject, never the distance.
- Jumps of the NOW longer than a second (the loop seam, a seek) reset the aim without a sweep.
- `logSpan` and `zoomFor(distance)` let a world hand the hero its resting zoom (`z0`) and the scale that converts the pinch, which arrives in ln(distance), into `z` units.

## 8. The bake pipeline

Specs: [`synthetic-bake`](../openspec/specs/synthetic-bake/spec.md), [`procedural-subject`](../openspec/specs/procedural-subject/spec.md). Code: [`src/pipeline/bake/`](../src/pipeline/bake/), [`src/pipeline/scenes/`](../src/pipeline/scenes/), [`tools/vite/pack-saver.ts`](../tools/vite/pack-saver.ts).

The packs are synthetic: a 3D scene with an animated subject is rendered and sampled so the viewer can be built with data of realistic size and density. The baker runs in the browser because three.js, skinning and rendering are already there, and because checking a bake visually is part of the work.

### The `/bake.html` page

Run `npm run dev` and open `/bake.html` (the dev server serves [`sites/4d-os/bake.html`](../sites/4d-os/bake.html), which loads [`src/pipeline/bake/main.ts`](../src/pipeline/bake/main.ts)). It is development only: the 4D.OS build ([`sites/4d-os/vite.config.ts`](../sites/4d-os/vite.config.ts)) lists only the launcher and the worlds as entries, and the save endpoint exists only on the dev server.

- `?scene=<id>` picks the recipe; the form holds the parameters (`BakeParams` in [`common.ts`](../src/pipeline/bake/common.ts)): pack name, fps, duration, points per frame, environment density, source frame width, seed and depth noise.
- **Preview** shows the environment points, the camera path and, for the frame on the slider, the subject's points and the source frame with the projected points drawn over it.
- **Bake + save** bakes, saves, verifies and reports. **Download files** saves the same files through the browser instead. **Check silhouettes** runs the silhouette metric on every frame.
- `window.__bake` exposes the same actions to browser automation (`preview`, `bake(params)` returning the metadata and a SHA-256 per file, `save`, `verify`, `checkAllSilhouettes`), which is how determinism is checked: two bakes with the same parameters must give the same hashes.

### Recipes

A recipe ([`recipes/recipe.ts`](../src/pipeline/bake/recipes/recipe.ts)) supplies everything specific to a scene: the subject (a skinned model, or meshes built from equations), the world meshes the source camera sees, the lights, `setup(params)`, `pose(frame)`, `cameraAt(frame, aspect)`, `shadeSubject` (the lit color of a subject point), `environment(cameras)` (the static layer) and `sourceLook` (background, fog, shadows). It can also set `stableSubject` and a suggested `pointSize`. The registry is [`recipes/index.ts`](../src/pipeline/bake/recipes/index.ts):

| Recipe | Subject | Clip | Used by |
|---|---|---|---|
| `cat-stairs` (default) | "Cat" by J-Toastie (CC-BY 3.0), climbing a stone stairway in an alley at night | 30 fps × 14 s | worlds A, B, C, launcher |
| `cat-alley` | the same cat, crossing an alley and jumping onto a dumpster and a wall | 15 fps × 20 s | kept as a recipe |
| `deer-meadow` | the Deer by Quaternius (CC0), galloping across a meadow (pack name `deer-synthetic`) | 15 fps × 20 s | kept as a recipe |
| `falcon-phi` | a peregrine falcon built from equations | 30 fps × 15 s | world D |
| `whale-fall` | a humpback whale built from equations | 30 fps × 15 s | world E |

The models live in [`src/pipeline/models/`](../src/pipeline/models/); their licenses and the required credit are in [`LICENSES.md`](../LICENSES.md). Every pack is marked `synthetic: true`, and the pages say so.

### `SyntheticScene`: the shared pipeline

[`SyntheticScene.ts`](../src/pipeline/bake/SyntheticScene.ts) does the work that every recipe shares. `bake(params)`:

1. calls `setup`, computes one source camera per frame and asks the recipe for the static layer;
2. for every frame, samples the subject and renders its source frame into its cell of an atlas canvas;
3. encodes the pages as PNG and calls `writePack`, adding `correspondence: true` when the recipe has stable points.

Objects live on three three.js layers: the world the source camera sees (0), the subject (1) and preview helpers (2), which never reach a source frame.

**Sampling the subject.** The subject's vertices are skinned on the CPU (`skinVertices` in `common.ts`, which applies bone transforms only to a `SkinnedMesh`; a subject built from equations has already rewritten its positions in `pose`). A triangle is chosen with probability proportional to its area (a running sum of areas and a binary search, `searchCumulative`), and a uniform point inside it with barycentric coordinates. The color comes from the recipe's `shadeSubject` with a ±10 % variation. Finally, each point is pushed along the ray from the source camera by a small Gaussian amount, with rare larger outliers, which imitates the depth error of a monocular reconstruction without changing where the point projects: the silhouette in the source frame still matches.

**Stable points.** With `stableSubject`, the triangle, the barycentric weights, the depth error and the color variation of every point are chosen once, on the pose of frame 0, and re-evaluated on the deformed mesh in every frame. Point `i` is then the same place on the body in all frames, which is what the pack's correspondence promises. Recipes without the flag keep their exact bytes.

**The environment.** `environmentWriter` (`common.ts`) builds the static layer and slides a fraction of the points along the line of sight of a random source camera, the typical "streaks" of a monocular reconstruction; recipes can also scatter a few stray points in the air.

**Source frames** are rendered at twice the size and box-filtered down (16:9, `sourceWidth` wide), with no retro treatment: they are the "video".

**Silhouette check.** `checkSilhouette(frame)` renders a subject-only mask from the frame's camera, projects that frame's points, and reports the fraction of points within 1 px of the silhouette and the fraction of the silhouette covered by points. It is the test that the points and the video agree.

**Determinism.** Nothing uses `Math.random`. [`src/pipeline/scenes/random.ts`](../src/pipeline/scenes/random.ts) provides a seeded `mulberry32` generator and `stream(seed, name)`, an independent stream per purpose (`"environment"`, `"subject:12"`…), so changing the subject's density does not reshuffle the environment or the camera. The guarantee holds on the same browser and GPU: the point layers are pure CPU math, but the source pages are GPU renders encoded as PNG by the browser (`canvas.toBlob`), so another machine can produce different PNG bytes.

### Saving: the pack-saver endpoint

**Bake + save** posts each file to `POST /__pack/save?name=<pack>&file=<path>`. The Vite plugin [`tools/vite/pack-saver.ts`](../tools/vite/pack-saver.ts) (`apply: 'serve'`) accepts only simple names and paths, refuses writes outside `sites/4d-os/public/packs/<name>/`, and writes the body there. The dev server needs a moment to serve new public files (until then it answers with the HTML fallback), so the page polls each file with `HEAD` until its size is right, then **Verify** loads the pack with `loadPack`, which runs the full validation, and logs the counts.

### Procedural subjects: the falcon and the whale

Subjects D and E have no third-party model and no bones. Their recipes build meshes with a fixed topology in `load()` and rewrite the vertex positions in `pose(frame)`; sampling, source frames and the silhouette check are unchanged.

The equations of each scene live in one pure TypeScript module under [`src/pipeline/scenes/`](../src/pipeline/scenes/), with no three.js and no DOM. Both the recipe and the world's page import it, so every live readout on the page (the spiral radius, the dilation factor, the proper time) is computed from the current frame with the same math that baked the motion.

![World D, The golden stoop: the falcon's earlier moments trail along the golden spiral through a city of points, with the plan-view plotter and live readouts beside the viewer](images/world-d-golden-stoop.png)

- **`falcon-phi`.** [`scenes/falconPhi.ts`](../src/pipeline/scenes/falconPhi.ts) defines a conical logarithmic spiral around a tower, `r(θ) = r0 · φ^(−2θ/π)`, which tightens by the golden ratio φ every quarter turn. Falcons are known to attack along logarithmic spirals (Tucker 2000, *J. Exp. Biol.* 203:3745); this scene fixes the curve to the golden one, which is one of them. The script runs flap, banked glide, stoop with the wings tucked into a teardrop, pull-out, landing and perch, with wingbeats whose downstroke is faster than the upstroke. The recipe's body ([`falconPhiBody.ts`](../src/pipeline/bake/recipes/falconPhiBody.ts)) is a set of closed shells (body of revolution, head and beak, three-segment wings, tail), the city is [`falconPhiCity.ts`](../src/pipeline/bake/recipes/falconPhiCity.ts), and a drone camera follows the bird.
- **`whale-fall`.** [`scenes/whaleFall.ts`](../src/pipeline/scenes/whaleFall.ts) puts a Schwarzschild black hole at the origin. The whale's distance follows `r(t) = r_s · (1 + A · e^(−t/T))`, which tends to the horizon without crossing it; its fluke beat advances with proper time, `dτ = √(1 − r_s/r) · dt`, so it slows near the horizon; its color is redshifted and dimmed by the same factor; and its angular velocity seen from afar carries a factor `(1 − r_s/r)` that slows it near the horizon, so the trail compresses. The body is a set of parametric surfaces ([`whaleFallBody.ts`](../src/pipeline/bake/recipes/whaleFallBody.ts)). The sky and the accretion disk are pure functions in [`scenes/whaleFallSky.ts`](../src/pipeline/scenes/whaleFallSky.ts), shared by the recipe's static layer ([`recipes/whaleFallSky.ts`](../src/pipeline/bake/recipes/whaleFallSky.ts)) and world E's real-time lens, so both show the same sky.

### The cat's walk

The Cat model ships without animations, so all its motion is procedural. `cat-alley` poses the rig as a pure function of time ([`catMotion.ts`](../src/pipeline/bake/recipes/catMotion.ts)). `cat-stairs` goes further, because a subject shown as a trail exposes every foot slide and every pose cut:

- **Route and script** ([`catStairsMotion.ts`](../src/pipeline/bake/recipes/catStairsMotion.ts)): the cat walks in, slows at the foot of the stairs and looks up, climbs at a walk (each paw moves two treads at a time, the left paws on even treads and the right ones on odd treads, and each hind paw lands on a tread its front paw used), pauses, turns on the landing by stepping and sits facing the camera. The body follows from the legs: hip and shoulder heights are the desired ones, softly limited by what the planted legs can reach, and the trunk's pitch follows from those two heights.
- **Footfall planner** ([`catGait.ts`](../src/pipeline/bake/recipes/catGait.ts)): a deterministic table of steps per leg. Landing is driven by distance (a gait phase that advances with the distance the body travels) and flight by time, as in an animal, so if the body stops, the legs stay planted. A planted foot is fixed in the world; a foot in the air follows a minimum-jerk arc that clears the nosing of the next tread. Variation in timing, placement and arc height comes from a seeded hash.
- **Leg IK** ([`catIk.ts`](../src/pipeline/bake/recipes/catIk.ts)): analytic two-bone IK in each leg's sagittal plane, by the law of cosines. The reach is clamped softly near a straight or fully folded leg, where the joint angle would otherwise change infinitely fast and the knee would "pop".
- **A spine added in code** ([`catSpine.ts`](../src/pipeline/bake/recipes/catSpine.ts)): the rig has a single trunk bone, so on load two bones, `Chest` and `Pelvis`, are added under it and the trunk's skin weights are split between them along the body. The trunk can then flex and sway without editing the model file.
- **Springs as tables** ([`catSprings.ts`](../src/pipeline/bake/recipes/catSprings.ts)): the head's stabilization, the tail's lag and the shoulder blades are critically damped springs integrated once, in fixed steps of 1/240 s, and stored. Evaluating any time, in any order, gives the same result, which is what a baker needs when it requests frames out of order and more than once.
- **Model, light and fur** are shared by the cat recipes in [`catBase.ts`](../src/pipeline/bake/recipes/catBase.ts): one lighting function colors both the source frame and the points, so the two agree.

The spec turns "believable" into measurable criteria (a planted foot slides at most 1 cm and sinks at most 5 mm, no vertex exceeds 40 m/s and no bone 40 rad/s, step durations vary with a coefficient of variation between 3 % and 15 %), and the tests next to each module check the planner, the IK and the springs ([`catGait.test.ts`](../src/pipeline/bake/recipes/catGait.test.ts), [`catIk.test.ts`](../src/pipeline/bake/recipes/catIk.test.ts), [`catSprings.test.ts`](../src/pipeline/bake/recipes/catSprings.test.ts)).

## 9. Checking your work

- **Unit tests** (`npm test`) sit next to the modules they test. Good entry points for reading: [`pack.test.ts`](../src/engine/pack/pack.test.ts) (format and validation messages), [`TimeController.test.ts`](../src/engine/time/TimeController.test.ts), [`zoomHero.test.ts`](../src/engine/shell/zoomHero.test.ts) (the hero's segments as a pure function), [`falconPhi.test.ts`](../src/pipeline/scenes/falconPhi.test.ts) and [`whaleFall.test.ts`](../src/pipeline/scenes/whaleFall.test.ts) (the physics claims the pages make).
- **`/debug.html`** ([`sites/4d-os/debug.html`](../sites/4d-os/debug.html), [`src/4d-os/debug/main.ts`](../src/4d-os/debug/main.ts)) is the viewer with a minimal panel, on the dev server. `?pack=<url>` loads another pack and `?world=a…e` loads a world's tokens. It uses the helpers in [`src/engine/viewer/debug.ts`](../src/engine/viewer/debug.ts): counting distinct colors in a view (1-bit must give two), checking that the image is made of uniform blocks, counting GPU uploads while scrubbing (there must be none), and listing which points pass the stipple test by rendering each point into its own pixel with the real shader (the `uIdLayout` uniforms in `common.glsl`).
- **Hidden tabs** do not run `requestAnimationFrame`. In development, `installDevRafShim` ([`devRafShim.ts`](../src/engine/shell/devRafShim.ts)) falls back to timers when the page starts hidden or with `?raf=timer`, so automated captures still get frames. On the dev server, pages also expose handles such as `window.__zoomHero`, `window.__scrollTime` and `window.__lenis` for scripted checks.
- The museum's loops are recordings of these live pages; how they are captured and checked is in [museum.md](museum.md).
