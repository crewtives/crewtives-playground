# Design

## Context

Motivation is in `proposal.md`. Prior research measured the current state in headless Chromium. What constrains the design:

**Bake pipeline** (`src/bake/SyntheticScene.ts`):
- samples the subject over **skinned** meshes (`SkinPart.mesh: SkinnedMesh`, `skinVertices` uses `applyBoneTransform`);
- picks the triangle and barycentrics **anew every frame** with `stream(seed, 'subject:f')`.

As a result, point `i` does not correspond across frames: the median of its displacement between frames is 21–31 cm with the cat almost still, and the edge "boils" (5–7% of the silhouette pixels change per frame).

**Viewer** (`TimeViewer`, `dynamic.vert.glsl`):
- draws the present at the **integer** frame (`uFrame = floor`);
- `chaseCam` follows the **interpolated** center with `exactFrame` and no filter.

The result is a sawtooth: the cat shifts 8–29 px per frame, and 68 px at the cuts.

**Cat** (`catStairsMotion.ts`, `catMotion.ts`, `catBase.ts`):
- **Cuts at every hop:** at `u = 0.3` it switches from `soft(crouch)` to `soft(push)` with no blending. The hip rotates 0.86 rad in 0 ms and a vertex jumps 31 cm.
- **Limited rig:** it has a single torso bone (Root), with no spine or pelvis, and in the hind leg a single bone from hip to hock.
- **No IK:** `restOn` rests on the lowest vertex, which in 50% of the frames is a hock and in the final sit is the tip of the tail.
- **Skating paws:** 0.4–1 m/s while walking.
- **Nine identical hops**, with left the same as right.
- **Head** at 37° nose up, correlated 0.98 with the torso.

**B's hero:**
- the wheel reaches `OrbitControls` (zoom with `preventDefault`) and Lenis, which does not check `defaultPrevented`, and ScrollTrigger turns it into time at ~0.18 frames per pixel;
- `chaseCam` restores the radius after 2.2 s, but only if the engine is awake;
- `OrbitControls` sets `touch-action: none` inline.

**Constraints:**
- **Byte-for-byte determinism** of the bake.
- **Packs of ≤ 60 MB.** The format ties a camera and a source frame to every frame.
- **`cat-alley` and `deer-meadow` identical byte for byte.**
- **Current specs:** "Scroll is time" for A and C stays the same.
- **Product principle:** "Real time over pre-rendering".

## Goals / Non-Goals

**Goals:**
- One owner and one smoothing per signal: scroll, zoom, time, camera aim.
- Continuous motion at the display's refresh rate without baking more frames.
- A cat that truly walks step by step, within what its rig allows and with the spine added in code.
- Two new scenes computed from our own equations, without third-party models, that push the engine (3D flight with changing shape, a time spiral that compresses), and two complete landings with `/impeccable`.

**Non-Goals:**
- Changing the cat model or re-rigging it in Blender.
- Baking at 60 fps.
- Changing the pack format version: correspondence is an optional field.
- Touching the "scroll is time" behavior of A and C.
- Deploy.

## Decisions

### D1. Hero with native scroll and a pinned stage, not event capture
The `zoomHero` (`src/core/shell/zoomHero.ts`) follows the product-page pattern:
- a tall section (`.hero`, ~300svh on desktop and ~260svh on mobile) with a `position: sticky` stage of `100svh` (the plate at `100lvh` behind it);
- a `ScrollTrigger` (`start: 'top top'`, `end: 'bottom bottom'`) provides the progress `p ∈ [0, 1]`.

Scrolling remains native: inertia, scrollbar, keyboard, anchors and touch work on their own, and nothing has to be "released".

**Disjoint segments**, which implement "one gesture, one effect":
- **zoom** `p ∈ [0, pZ]`, by default `pZ = 0.55`: `zScroll = z0 + (1 − z0)·easeInOut(p/pZ)`;
- **final segment** `p ∈ [pZ, pF]`, by default `pF = 0.9`: time driven by scroll;
- **pause** `p ∈ [pF, 1]`: still final state, maximum zoom and last frame. It spans ~0.1 × the hero's height, enough for the ending to read before the page is released.

**Rejected alternatives:**
- **Capture with GSAP Observer + `lenis.stop()`.** It forces trackpad inertia, keyboard and anchors to be handled by hand, and NN/g measures disorientation from scrolljacking above the fold.
- **Nested scroll container with native "latching".** In Chromium 151 it did not latch with synthetic events, so it cannot be verified here.

**API** (the module knows nothing about the camera: it publishes a normalized `z ∈ [0,1]`):
```ts
bindZoomHero({
  hero, surface, time, engine,
  z0?: number,            // resting zoom at the very top (0 = closest, 1 = full plate)
  phases?: { zoomEnd: number; landEnd: number },
  finalWindow?: number,   // final seconds covered by the final segment (default 4)
  onZoom: (z: number) => void,
  onDissolve?: (run: () => void) => void, // covers the loop seam and the jump into the final segment
  onPhase?: (phase: 'loop' | 'final' | 'rest' | 'after') => void,
}) => { dispose(): void; readonly phase: string; readonly z: number }
```

The pure function `heroPhase(p, pinch, state)`, which returns `{ phase, z, timeTarget }`, is exported separately and tested with vitest.

### D2. Time: free loop, fixed final window, no rewind to return to the loop
- **In the zoom segment**, the clock is in `play(1)` (loop with wrap) and is not tied to the scroll: that removes the "scroll advances the video" effect.
- **On entering the final segment from above**, the segment always covers the **final window** (`finalWindow` s, by default the last 4 s: the end of the climb and the sit).
  - If the current frame is inside the window, it starts from there.
  - If not, `onDissolve` covers a `seek(last − W)`.
  - The scroll length of the segment is always the same.
- **Inside the segment**, `setTarget(from + (last − from)·q)`, with `time.damping` ≈ 0.03 s: Lenis already smooths the scroll, so no second filter is stacked on top.
- **On leaving the final segment upward**, `releaseTarget()` + `play(1)` from the current frame, forward.
- **On entering the pause**, `seek(last)` + `hold()`.
- **On a direct jump** (`onLeave` without having gone through the segment), the final state is forced.

A HOLD that the visitor did not request is marked with `<html data-hold-origin="gesture">`, so that effects such as B's inversion do not fire.

**Loop seam.** The `zoomHero` detects the wrap (the frame drops with direction +1 and no target) and calls `onDissolve`. In B, D and E that is `viewer.reveal` 0 → 1 in 14 steps over ~0.45 s, the dithering-threshold dissolve grammar from D10 of the previous change. The chase camera resets at the same instant (D4).

**Reduced motion:** no `play`, no dissolve (the `seek` is direct) and no Lenis. Native scroll drives zoom and time without smoothing.

### D3. Viewer-owned pinch and orbit without wheel zoom (all views)
The engine solves it, in `TimeViewer`, for all views. In A and C it was also measured that the wheel zooms at the same time as it scrolls the page, and that `touch-action: none` blocks one-finger scrolling over the scroll chapters.
- `controls.enableZoom = false` in all views. That way `OrbitControls` neither calls `preventDefault` on the wheel nor emits `start`/`end` (measured: with zoom disabled it returns early).
- `touch-action`:
  - with orbit active, `pan-y`: one finger moving vertically scrolls the page (measured: OrbitControls receives `pointercancel`), one finger moving horizontally orbits and two fingers pinch;
  - with orbit disabled, the inline `none` is removed and the browser decides.
- `TimeViewer.setPinchHandler(handler | null)`: by default, pinching moves the camera toward `controls.target` within `minDistance`/`maxDistance`. The hero registers its handler and the pinch then adds to its zoom.
- **Pinch:**
  - Pointer Events with two pointers: `logZ -= k·ln(dist/distPrev)`;
  - `wheel` with `ctrlKey` over the surface (`preventDefault`, passive `false`);
  - Safari's `gesturestart/gesturechange`, deduplicated.

  All of it adds to a `pinch` offset on a logarithmic scale, filtered by a critically damped spring (half-life 0.1 s).
- **Combination:** `z = clamp(zScroll + pinch·(1 − smoothstep(0.8·pZ, pZ, p)), 0, 1)`. The pinch fades out on reaching the limit, so that the full plate is always the same.
- **Single-pointer alternatives** (WCAG 2.5.1): buttons and `+`/`−` keys acting on the same offset.

### D4. Chase camera with zoom, opening up to the plate, and filtered aim
`bindChaseCam` gains `setZoom(z)` and stops restoring the radius:
- **Distance:** `d(z) = exp(lerp(ln dNear, ln dFar, z))`. `dFar` is computed so that the box of all moments (`gpu.subjectBounds`) fits in the frame with the view's fov and aspect.
- **Opening up to the plate:** with `w = smoothstep(0.55, 1, z)`, the aim point moves from the subject to the center of the box, the elevation rises toward `elevationFar` and the side angle opens up. As it pulls back, the camera stops "chasing" and frames the plate: all moments at once.
- **Automatic return:** only θ and φ, never the radius.
- **Filtered aim:**
  - the subject's path is prefiltered once, with a centered Gaussian of σ ≈ 0.2 s over `centers`, with no lag because the path is baked;
  - on top of that, a critical spring with a half-life of ~0.12 s.

  This way the camera stops copying every jump of the center.
- **Spring reset** (`reset()`): when the frame jumps more than 1 s along the path (wrap or `seek`), so that there is no sweep.

### D5. Stable points and correspondence (bake) + interpolated present (viewer)
**Bake.** The recipe declares `stableSubject = true`. `SyntheticScene` picks `(part, triangle, barycentrics)` **once**, in the frame-0 pose, weighted by area, with `stream(seed, 'subject:stable')`. It also stores, per point, a fixed Gaussian depth scalar and a fixed color variation. Every frame it recomputes the positions from the already deformed vertices. The pack declares `correspondence: true` in `scene.json`: the field is optional, the version stays at 1 and the writer requires equal counts.

**Recipes without the flag.** They follow the current path, so their bytes do not change. This is verified with the hashes of `cat-alley` and `deer-meadow`.

**Viewer.**
- With correspondence, `packGpu` adds the `aNext` attribute: the positions shifted by one frame, with the last one duplicated. It costs +6 B per GPU point, shared across views.
- In `dynamic.vert.glsl`, the present uses `mix(position, aNext, uFrac)`, with `uFrac = exactFrame − frame`, and 0 in HOLD or when there is no correspondence.
- Everything else (trail, frustum, source frame, timecode) stays on the integer frame.

**Rejected alternative:** baking at 60 fps. It costs ~2× the bytes and ~2× the vertices, and does not fix the "boiling".

### D6. The cat: a real walk with footfalls, IK, a code-built spine and springs
The whole change lives in modules specific to `cat-stairs`:
- `catStairsMotion.ts` rewritten;
- `catGait.ts`: footfall planner;
- `catIk.ts`: two-bone sagittal IK;
- `catSpine.ts`: spine added to the rig;
- `catSprings.ts`: spring table.

`CatRecipe` gets optional *hooks* that `cat-alley` does not use (its hash does not change).

- **Script (14 s, 420 frames, the same budget):**
  - enters at a walk (lateral sequence, duty factor ~0.6) down the alley;
  - slows, stops at the foot of the stairs and looks up (the head points at the stair landing, driven by a spring);
  - climbs **walking**, each paw on every other step (~2 steps per stride, the hind paw in the front paw's print), with ~0.75–0.85 s per cycle and deterministic variation per step (duration ±6–10%, placement ±1–2 cm);
  - makes a micro-pause with a glance halfway up the stairs;
  - reaches the stair landing, turns by stepping (2–3 steps, feet planted) toward the camera and truly sits (haunches and paws on the stair landing, the tail wrapped around the paws on the floor);
  - settled: the head tilts, the tip of the tail flicks and the chest breathes.

  The variation comes from `stream(seed, 'gait')` and `hash2`: no `Math.random`. The canter is ruled out: without a real spine it looks stiff, and the biomechanics on ~30° slopes call for a walk.
- **Footfalls:** a `footfalls[]` table with `{ leg, liftoff, touchdown, target }`. The target is the center of a tread (or of the ground). Each foot stays fixed in the world during stance. In the air it follows a minimum-jerk trajectory that passes over the step nosing, with more height for the front paws.
- **IK:** analytic, two-bone, in the sagittal plane (the local Z of each leg bone):
  - front: `Upper/Lower`, with `Ankle/Foot` to plant the paw and roll at liftoff;
  - hind: `Upper(hip→hock)/Lower`, with `Ankle/Foot` as the toes.

  The distance is clamped to `[ε, l1 + l2 − ε]` to avoid "popping".
- **Body from the legs:** hip and shoulder height come from the foot contacts: the lowest of the desired heights, without hyperextension (Johansen). The pitch is `atan2(yShoulder − yHip, span)`. This replaces `restOn` and the `frontSupport` loop in `cat-stairs`.
- **Code-built spine (`catSpine.ts`):** on load, two bones, `Chest` and `Pelvis`, are added under Root. Root's influence on the torso vertices is reweighted according to their position along the body, with a smooth falloff; the neck and front legs hang from `Chest`, and the hind legs and tail from `Pelvis`. It is only active in `cat-stairs`. It enables dorsal flexion and extension and the lateral sway of the walk.
  - **Abort criterion:** if the deformation produces visible artifacts (cuts or creases in the contact sheets), the spine is disabled and Root and the neck compensate.
- **Springs:** critical, integrated in fixed steps of 1/240 s from t = 0, only once, and stored in a table (a pure function of time):
  - head stabilized in the world toward the aim point, with ~1.5 cm and ~3° of residual oscillation;
  - a tail chain with increasing lag and lateral counterweight, excited by the pelvis's acceleration;
  - shoulder blades.
- **Metrics** (spec `synthetic-bake`), measured at 120 samples per second in `/bake`:
  - sliding during stance ≤ 1 cm;
  - penetration ≤ 5 mm;
  - no pose cuts: with 1 ms differences, no vertex exceeds 40 m/s and no bone exceeds 40 rad/s. The original threshold, 0.05 rad and 3 cm per sample, ruled out real leg or wing velocities;
  - coefficient of variation of step duration between 3% and 15%;
  - the sit resting on haunches and paws.

### D7. Equation-driven subjects in the bake
`SkinPart.mesh` becomes `Mesh`. `skinVertices` applies `applyBoneTransform` only if `isSkinnedMesh`. A procedural recipe:
- builds its `Mesh` objects in `load()`, with a fixed topology;
- in `pose(frame)`, rewrites `geometry.attributes.position` and the per-vertex colors of the source frame;
- sets `stableSubject = true`.

Sampling, the source frame and the silhouette check do not change. Each scene's equations live in `src/scenes/<scene>.ts`, pure TypeScript with no DOM, imported by both the recipe and the page. That way the live readouts use the same math (spec `procedural-subject`).

### D8. `falcon-phi`: an equation-built falcon on a golden spiral
- **Spiral:** `r(θ) = r0 · φ^(−2θ/π)`, which tightens by a factor of φ per quarter turn, around the axis of a tower. The height drops as `y(θ) = yEnd + (y0 − yEnd)·(r/r0)^k`: a conical logarithmic spiral. The page's honest claim is that falcons attack along logarithmic spirals (Tucker 2000, *J. Exp. Biol.* 203:3745) and that here the curve was set to the golden spiral, which is one of them.
- **Script (~14 s):**
  - flapping flight on entering the spiral, at ~4–5 Hz with asymmetric downstroke and upstroke;
  - banked glide;
  - stoop with the wings tucked into a teardrop, with the span below 45%;
  - pull-out with the wings open, braking;
  - perching on a neon antenna: it folds its wings and looks at the camera.
- **Body:**
  - a surface of revolution along a spine curve, with head, hooked beak, dark "moustache" and barred breast;
  - 3-segment wings (arm, forearm and hand) with fold angles, primaries separated at the tip and twist along the span;
  - a fan tail with variable spread.

  Physical colors: slate-gray back, pale barred belly. The display quantizes to the world's palette.
- **Environment:**
  - a procedural night city with towers of emissive windows, magenta and cyan neon signs and wet asphalt;
  - a hologram of the golden spiral with its golden rectangles, in emissive dotted lines in 3D;
  - a phyllotaxis disc with the golden angle of 137.507° in the plaza.
- **Source camera:** a drone that follows the falcon.
- **Budget:** ≤ 60 MB, at 30 fps; points per frame and source frame width are tuned to fit.

### D9. `whale-fall`: an equation-built whale falling toward a black hole
- **Black hole** at the origin, with Schwarzschild radius `r_s`. The whale is ~1.2 `r_s` long: the recipe chooses the scale so that the scene fits in ~40 m (the reach of the frustum light).
- **Path:** an infalling spiral with `r(t) = r_s·(1 + A·e^(−t/T))` (it tends to `r_s` without crossing it), in coordinate time. The angular velocity seen from afar slows by the factor `(1 − r_s/r)`, so the plate's trail **compresses** near the horizon.
- **Own motion:** dorsoventral beating with a traveling wave, and pectoral fins. It advances with integrated `τ`, `dτ = √(1 − r_s/r)·dt`, in fixed steps: the whale "freezes".
- **Redshift:** the color shifts toward red and dims with `√(1 − r_s/r)`.
- **Body:** fusiform with a dorsal hump, long pectoral fins (~1/3 of the body) with tubercles, a tail fluke and painted ventral grooves.
- **Static environment:**
  - a star field on a distant sphere;
  - an accretion disk from 3 `r_s` to ~8 `r_s`, in points, with temperature (bluish white inside, orange outside) and Doppler brightness asymmetry;
  - a photon ring.
- **Source camera:** a probe that follows the whale.

### D10. Real-time skies for the landings
They are full-screen quads behind the points, like `aurora.ts`, in linear color: the display quantizes and dithers them. Their clock is `time.exactFrame`, so in HOLD they stay still and the engine sleeps.
- **D, glyph rain (retired on 2026-09-24):** these were columns of cells with glyphs from a custom matrix font, baked into a small atlas by code, with speed and phase from a hash. D was left without a sky: behind the city is the black glass (`--scene-bg`).
- **E, gravitational lensing:** per pixel, a ray from the camera, using the inverse view-projection matrix, toward the black hole at the world origin.
  - If the impact parameter is `b < b_crit ≈ 2.6 r_s`, shadow.
  - Otherwise, the ray is bent over a few steps (weak-field approximation, `α ≈ 2 r_s / b`, amplified for aesthetics) and a procedural star field and the disk are sampled: where the bent ray crosses the equatorial plane gives the lensed arcs above and below the shadow.
  - That way the disk changes shape with the orbit of the 3D camera.

### D11. Landings with `/impeccable`
Each landing is a new surface (`d/index.html`, `e/index.html`) that follows the *new-work* process of `/impeccable`:
- brief in `.impeccable/surfaces/`;
- direction;
- build;
- final review with `impeccable-finish-reviewer`.

The brand commitments of this change are recorded in `PRODUCT.md`: cyberpunk, a futuristic interface, space, vortices, a black hole, the math of the golden ratio and a computed "Matrix-style" bird.

They reuse the core (`boot`, `windows`, `timeline`, `keyboard`, `desktop`, `RetroDisplay`, `TimeViewer`, `chaseCam`, `zoomHero`) and dress the chrome in their own world: tokens, OFL fonts and a 16-color palette. They must show live readouts computed with `src/scenes/*`. The launcher links D and E with a still image captured from the real render, with its provenance noted: it does not load two more packs.

### D12. File split and work order
The work runs in parallel streams over disjoint files:

| Stream | Files |
|---|---|
| **Engine** | `SyntheticScene.ts`, `common.ts`, `recipe.ts`, `src/core/pack/*`, `packGpu.ts`, `dynamic.vert.glsl`, `TimeViewer.ts` (including the pinch from D3) |
| **Hero** | `zoomHero.ts`, `chaseCam.ts`, `smoothScroll.ts`, `src/flavors/b/**`, `b/index.html` |
| **Cat** | `src/bake/recipes/cat*.ts`, `public/packs/cat-stairs/` |
| **Falcon** | `src/scenes/falconPhi.ts`, `src/bake/recipes/falcon*.ts`, `public/packs/falcon-phi/` |
| **Whale** | `src/scenes/whaleFall.ts`, `src/bake/recipes/whale*.ts`, `public/packs/whale-fall/` |
| **Landings** | `d/**` + `src/flavors/d/**`, `e/**` + `src/flavors/e/**`, and their brief |

**Order:**
- The engine goes first.
- Then, in parallel: hero, cat, falcon and whale. The hero consumes `setPinchHandler`; the recipes, the stable points.
- The landings wait for their pack and for the hero.

**Files integrated by the main work stream:**
- `src/bake/recipes/index.ts`: each recipe adds its line with a minimal edit;
- `LICENSES.md`, `vite.config.ts`, the launcher, `PRODUCT.md` and `tasks.md`.

`DESIGN.md` is regenerated by `impeccable-documenter` at the end.

## Risks / Trade-offs

- **[The code-built spine deforms the torso badly]** → Checked on contact sheets from three angles. If there are artifacts, it is disabled (D6) and Root and the neck compensate.
- **[Stable points: density stretches where the mesh deforms]** → Sampling happens in the frame-0 pose, with density verified in the most stretched pose. The silhouette stays ≥ 97% inside.
- **[The final segment cuts in with a dissolve if the loop is far from the end]** → That is the project's grammar, not a fade. With reduced motion the `seek` is direct.
- **[Trackpad inertia carries past the end]** → The pause `[pF, 1]` gives ~10% of the hero as a still final state before the page is released. The exit is native and does not filter inertia.
- **[iOS: address bar and viewport units]** → The stage uses `100svh` and the plate `100lvh`, with no `dvh` on large blocks. ScrollTrigger ignores height changes smaller than 25% on touch devices.
- **[Pinch in macOS Safari: GestureEvent and Ctrl+wheel at the same time]** → Both are listened to and deduplicated for the duration of a gesture. Noted as pending a test on a real Mac.
- **[60 MB budget for the new scenes]** → Points per frame, duration and source frame width are tuned, and the weight is measured on every bake.
- **[`cat-stairs` rebake: framings tied to frames change]** → This affects the close-ups in A, B and C, B's 12-frame sheet and the launcher crops. The cat work stream reviews those framings with screenshots and reports the indices to adjust. The hand-written copy ("climbs ten steps", "fourteen seconds") is reviewed.
- **[Interpolation adds GPU memory]** → +6 B per dynamic point, only when there is correspondence: ~11 MB with 1.7 M points, shared across views.
- **[Two work streams edit `recipes/index.ts`]** → One line each. The file is re-read before editing, and the main work stream reviews it on integration.

## Migration Plan

- **Packs:** the previous ones remain valid (correspondence is optional). `cat-stairs` is regenerated in place. The new scenes are baked with `/bake?scene=falcon-phi` and `/bake?scene=whale-fall`.
- **B:** its hero changes mechanism on the same branch. If something fails, `bindScrollTime` (A and C) remains intact and B can go back to it by reverting only its own files.
- **Design artifacts:** B's screenshots in `.impeccable/review/` are redone and those of D and E are added.

## Open Questions

- If the code-built spine does not pass visual review, the cat's naturalness ceiling stays limited by the original rig. Re-rigging in Blender is left as future work, without changing this spec.
- Testing on real devices (iOS Safari, macOS Safari with a trackpad) is left for when a device is available. Here it is verified with Chromium emulation.
