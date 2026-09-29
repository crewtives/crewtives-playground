# Verification

Record of tasks 9.5 (performance) and 9.6 (scenario walkthrough) of the `add-4d-os-local-demo` change, with the deviations and interpretations found during implementation.

## Environment

- **Machine:** MacBook Pro, Apple M2 Pro, 16 GB.
- **Browser:** Google Chrome driven by Playwright 1.63. WebGL2 runs on ANGLE Metal: the real GPU, not SwiftShader.
- **Software:** Node 24.19, Vite 8.3, TypeScript 7.0, three 0.186.0.
- **Server:** `vite` in development mode. Verification used a second, stable server without HMR (`VITE_NO_HMR=1 npx vite` on a separate port), because parallel changes to other worlds kept reloading the pages of the main development server.
- **Tests:**
  - the Playwright scripts (`block4`, `block5`, `block7`, `block8`, `perf`, `audit`…) were kept outside the repo;
  - the unit tests are in the repo: `npm run test` gives 54 passing tests.

## 9.5 Performance

Conditions:
- world A, 1440 × 900, full synthetic pack (300 frames, 1,500,000 dynamic points and 609,333 static ones);
- playback at +1× and automatic orbit at the same time;
- 6 s of `requestAnimationFrame` sampling after 3.6 s of warm-up.

| DPR | Display | Mode and trail | Points submitted | Mean fps | p95 | Worst frame |
|---|---|---|---|---|---|---|
| 1 | 16 colors | memory, stride 6 | 1,434,333 | 60 | 16.8 ms | 16.8 ms |
| 1 | 16 colors | **all, stride 1 (worst case)** | 2,109,333 | 60 | 16.8 ms | 16.8 ms |
| 1 | Millions | all, stride 1 | 2,109,333 | 60 | 16.7 ms | 16.8 ms |
| 2 | 16 colors | memory, stride 6 | 1,434,333 | 60 | 16.8 ms | 16.8 ms |
| 2 | 16 colors | all, stride 1 | 2,109,333 | 60 | 16.7 ms | 16.8 ms |
| 2 | Millions | all, stride 1 | 2,109,333 | 60 | 16.7 ms | 16.8 ms |

**Result:** the target is met: 60 fps in 16 colors with playback and orbit at once. The worst frame sits at the vsync cap (16.8 ms), so there was no need to reduce the pack density or the resolution fraction (it stays at 1/3). It was not measured on a more modest laptop.

## 9.6 Scenarios of the six specs

**RM** = `prefers-reduced-motion: reduce`. Each scenario was checked with RM off; the last column gives the result with RM on.

### 4d-pack

| Scenario | How it was verified | Result | With RM |
|---|---|---|---|
| Valid pack | The drawn counts match the metadata (4.2) and the loader validates the baked pack. | ✓ | ✓ (no dependency) |
| One camera per frame | Unit test and `parseScene` validation. | ✓ | — |
| Consistent offset table | Round-trip test and full validation in the loader. | ✓ | — |
| Incorrect identifier | Unit tests. In the browser, `dynamic.bin` intercepted with `XXXX`: the boot window shows "dynamic layer: bad format identifier (expected "4DDY", got "XXXX")". | ✓ | ✓ |
| Inconsistent count | Unit tests: the error states both values. | ✓ | — |
| Proportional progress | Simulated-stream test: 50% ± 5%. In the browser, with a throttled network, progress rises by bytes: 0, 4, 8, 13… 100. | ✓ | ✓ |
| Synthetic pack | "Synthetic" label visible without interaction. | ✓ | ✓ |
| Real pack | `scene.json` intercepted with `synthetic: false`: 0 labels, and the same windows, points and playback. | ✓ | — |

### synthetic-bake

| Scenario | How it was verified | Result |
|---|---|---|
| Development server | `/bake` responds and shows the parameters and the button. | ✓ |
| Production build | `npm run build` and grep over `dist/`: neither the page, the bake code, `GLTFLoader` nor `dev-assets/` appear. | ✓ |
| Full bake | 15 fps × 20 s = 300 frames, no frame without points, and the loader validates it. | ✓ |
| Consistent source frame | Across the 300 frames, at least 99.98% of the points project inside the silhouette (±1 px) and the silhouette is 99.93% covered. | ✓ |
| Subject density | Doubling the points per frame gives ×2.0000 dynamic points. | ✓ |
| Repeat run | Three bakes with the same parameters give identical SHA-256 hashes, also across reloads. | ✓ |
| Synthetic flag | `scene.json` declares `synthetic: true`. | ✓ |

### time-viewer (verified in `/debug`)

| Scenario | Result | With RM |
|---|---|---|
| Scrub to a frame: plane, pose, present and timecode match. 43 frames sampled, 0 mismatches. | ✓ | ✓ |
| Rewind and end of the clip, with looping in both directions (unit tests). | ✓ | — |
| Direction change: the present is cyan when moving forward, amber when rewinding and neither of the two in HOLD (pixel count). | ✓ | ✓ |
| Memory mode: 0 future points. | ✓ | — |
| All-at-once mode: the future is visible and less dense at the same distance (for example, 1,084 versus 2,958 at d = 1). | ✓ | — |
| Age: density does not grow with distance; stride 4 is exact. | ✓ | — |
| Frustum light: the center of the lit area follows the source camera's axis (cos ≈ 0.98) and travels 25 m. | ✓ | — |
| Hide the background: each switch affects only its own layer. | ✓ | — |
| Continuous scrub: 0 `bufferData`/`bufferSubData` and the geometry memory does not change. | ✓ | — |
| Reduced motion: no automatic playback or orbit. | ✓ | ✓ |
| Idle: in HOLD, 0 renders. | ✓ | ✓ |

### dither-display (verified in `/debug?flavor=a`, with the tokens of A, B and C)

| Scenario | Result |
|---|---|
| 1-bit gives exactly 2 colors; 16 colors gives at most 16 (14 with A, 15 with B and 12 with C, all from the world's palette). | ✓ |
| Millions: 8,958 colors and a block of 1 device pixel. | ✓ |
| Upscaling at 1/3: 127,800 of 127,800 uniform 3 × 3 blocks. | ✓ |
| Token change: the render uses the new color without touching the logic. | ✓ |
| Orbiting on HOLD: the same visible set of the trail (same hash and same per-frame counts). | ✓ |
| Toggling modes: 0 point-data transfers. | ✓ |

### desktop-shell (verified in world A)

| Scenario | Result | With RM |
|---|---|---|
| Successful load: the bar reaches 100% and the scene appears with a stepped dissolve. | ✓ | ✓ (no dissolve: 0 intermediate values) |
| Failed load: the boot window stays visible with the reason. | ✓ | ✓ |
| Desktop ready: the spec's five windows have a title bar and are visible. | ✓ | ✓ |
| Dragging to the edge: the window stays contained. Bring to front. | ✓ | ✓ |
| Scrub: timecode, subject and source frame change during the drag; clicking the ruler jumps. | ✓ | ✓ |
| Playback state `HOLD 0.00×`. | ✓ | ✓ |
| Speeding up with L: L, L gives `FORWARD +2.00×`. Frame by frame: → advances exactly 1. | ✓ | ✓ |
| Everything is reachable with Tab, with visible focus and an accessible name. | ✓ | ✓ |
| Dragging the dialog leaves 20 copies, which are cleared on release. | ✓ | ✓ (0 copies: disabled) |
| The synthetic label is visible on the first screen. | ✓ | ✓ |
| 390 px phone: no horizontal scroll, the vitrine at full width, the windows stacked and the timeline usable. | ✓ | — |

### story-page (verified in world A)

| Scenario | Result | With RM |
|---|---|---|
| Full walkthrough: sections in order, English copy, and the page ends at the footer. | ✓ | ✓ |
| Stacked generations: the current generation in cyan and the earlier ones in palette tones. | ✓ | ✓ (the stack appears complete and still) |
| Synthetic scene notice in the pipeline. | ✓ | ✓ |
| Scrolling down, scrolling up and leaving the scroll chapter: the frame grows with the forward color, decreases with the rewind color, and on leaving goes back to +1×. | ✓ | ✓ |
| A different pack: when loading one with 2,000 points per frame, the figures change (600,000, 904,671 and 20.6 MB). | ✓ | — |
| Unavailable scene: the only row, "A real capture", does not activate and shows "Not available yet". No invented subjects are listed. | ✓ | ✓ |
| Cursor tracking: the tesseract turns toward the cursor and the dashes advance. | ✓ | Still, as the spec requires |
| Scrolled away: the offscreen footer makes 0 renders, and the vitrine stops painting when it leaves the screen. | ✓ | ✓ |
| Asset audit: no external origin, 8 free fonts documented, the CC0 model only in `/bake` and nothing from the reference aesthetic's site (see `LICENSES.md`). | ✓ | — |

**Worlds B and C.** A parallel work stream built them on the same core, with the same desktop and story modules. That work stream reported verifying blocks 7 and 8 with Playwright. The boxes in `tasks.md` were checked based on the verification of A.

## Block 10: black cat in an alley at night

**Pack `public/packs/cat-alley/`** (`cat-alley` recipe in `/bake`):

- 300 frames at 15 fps (20 s). Static layer: 309,617 points. Dynamic layer: 1,500,000.
- `pointSize` {static 0.045, dynamic 0.012} in `scene.json`.
- Files: static.bin 2,786,561 · dynamic.bin 16,501,216 · page-0.png 18,797,521 · page-1.png 2,453,738. Total 40,594,093 bytes.
- The loader validates it (0 frames without points). Two identical bakes give the same hash.
- Silhouettes: inside fraction min 0.9648 (the thin tail rasterizes only partly), mean 0.9998; coverage 1. The cat stays in frame across the 300 frames (minimum silhouette of 249 px, frame 119).
- 0 m of penetration into the ground, the dumpster lid and the wall.
- The deer recipe, ported to the recipe pipeline, reproduces its previous 5 files byte for byte.

**Black cat: fur and rim light.** Two things were fixed and the pack was rebaked:

- **Rim.** The edge is computed relative to the source camera. With `1 − max(0, n·v)⁴` it was 1 across the whole hidden side: it did not show in the video, but in the 3D viewer the back half of the cat came out bluish gray (median #585f71). Now it is `(1 − |n·v|)⁶`: it marks only a thin outline.
- **Fur.** The model comes with a mid-gray cat (albedo 0.179 linear), and in the source video it came out tan under the sodium light and bluish gray under the moon. The parallel work stream caught it. The albedo, except for the eyes, is multiplied by 0.14 (body 0.025).
- **Result.** In the video the cat reads as black, with a cold edge and glowing eyes (checked in the atlas cells of frames 20, 80, 150, 200 and 250). The median of its points is #120f12. In the viewer, the trail reads through the `--trail` tint.

**Viewer (10.7):**

- Point size read from the pack; without the field, the previous one.
- Frustum plane at `min(4, 0.55 × median camera–subject distance)`: 4 m for the deer, 1.86 m for the cat.
- `setCutaway()` hides the background on the exploration camera's side, 0.3 m in front of the subject's box, without touching the ground. The plane is recomputed on every render.
- The deer looks the same as before: the pixel hashes in `/debug` (frame 170, 16 colors and Millions) match the ones taken before the change.
- The cutaway does not affect the trail: the hash of `visibleByFrame('dynamic')` is the same with the cutaway on and off at frames 60, 150 and 290.

**World A with the cat (10.8):**

- Pack, copy, label ("Cat, climbing") and CC-BY credit visible in the label and the footer, with links to the model and the license.
- Cutaway on in the pack's four views.
- Room plan cropped to the area that the subject and the camera travel through, with the long axis horizontal.
- Close-up of the cat in the "3D, frame by frame" figure.
- Results:
  - blocks 7 and 8: 17 and 12 checks, all ✓;
  - 390 px with no horizontal overflow;
  - 60 fps at DPR 1 and 2 in the three cases of 9.5, worst case 1,809,617 points;
  - `tsc`, 54 tests and `build` green.
- The parallel work stream recalibrated the 16-color palette for the alley.

## Block 11: staircase, smoothness and render quality (11.1–11.5)

**Pack `public/packs/cat-stairs/`** (`cat-stairs` recipe in `/bake`):

- 420 frames at 30 fps (14 s). Static layer: 564,138 points (1400 per m², twice "cat-alley"). Dynamic layer: 1,680,000 (4000 per frame).
- `pointSize` {static 0.04, dynamic 0.013}.
- Files: static.bin 5,077,250 · dynamic.bin 18,481,696 · page-0.png 18,644,091 · page-1.png 11,072,419. Total 53,352,121 bytes, within the 60 MB budget.
- The loader validates it and two bakes give the same hash.
- Silhouettes: inside fraction 1 and coverage 1 across the 420 frames. The subject's depth noise dropped to 0.12 (`subjectDepthNoise`). The cat stays in frame in every frame (minimum silhouette of 411 px, frame 354).
- Penetration into the steps and the landing: at most 3.7 mm across the 420 frames. A second support was needed, `frontSupport`: on the stairs, the front paws land one step higher than the hind paws.

**Recipes.** The cat recipes now share a base (`catBase.ts`): model, fur, lighting with several lamps, materials and sampling.

- "cat-alley" still reproduces its 5 files byte for byte (checked after the refactor and after every change to the base).
- "deer-meadow" does not change.

**Core (11.4):**

- **Integer point size** in display pixels: stable N×N blocks. It slightly changes the pixels of every world; that is the intended change.
- **Per-view cap** with `setMaxPointSize`.
- **Grading** with `--display-chroma` and `--display-exposure`. With the default values the pixels are identical: the deer's hash comes out the same with and without the grading block. With chroma 1.8 the mean saturation rises from 8.6 to 15.7.
- **For B's chase camera:**
  - `setCutFocus`: cutaway centered on the subject, keeps what is below it;
  - `setNearFade`: near fade of the trail and the background;
  - `setFrustumLightLook`: density and sinking outside the frustum.
  Off by default, with no pixel change.
- **Up close** (1.5–2.2 m, cap 6), the present cat reads as solid. The trail climbs the stairs one cat per step with a half-second stride (15 frames).

**World A with the staircase (11.5):**

- Pack, copy (fourteen seconds, the staircase) and a half-second stride.
- Blocks 7 and 8: all checks ✓. Three asserts in the script depended on the old pack (299 frames, "twenty seconds") and now read the pack.
- 390 px with no overflow.
- 60 fps at DPR 1 and 2, worst case 2,244,138 points.
- `tsc`, 54 tests and `build` green.

## Deviations and interpretations

1. **Automatic orbit only while playing.** The spec asks for two things that clash: that the view orbit on its own without interaction, and that there be no renders in HOLD without interaction. It was resolved like this: the automatic orbit runs while time is advancing and the visitor has not touched the view for 3 s; in HOLD everything stays still.
2. **"Screen pixel" is a CSS pixel.** The 1/3 fraction is applied over CSS pixels: the block measures `round(3 × DPR)` device pixels. At DPR 1, the blocks are 3 × 3, as 5.1 verifies.
3. **Levels curve before the dither**, which was not in the design. In 1-bit, shadows go to ink and highlights to paper; without it, a dark scene ended up entirely as a checkerboard.
4. **`scene.json` extends the D2 schema** with `files` (bytes of each file, for byte-based progress) and `generator` (bake parameters). The binary follows D2's order exactly, without padding; the loader copies the `frame u16` block when it ends up misaligned (odd M).
5. **Exporting the pack.** "Download and placement" was implemented with a download button (one file per piece) and a development-only endpoint that writes to `public/packs/<name>/`. That endpoint waits for Vite to serve each file before verifying.
6. **Look of the synthetic scene**, adjusted to resemble the reference, without changing the format:
   - an S-shaped path of about 24 m;
   - a ~2.1 m deer;
   - a slow-motion gallop;
   - pale birches with notches and 40% dark trunks;
   - a four-tone meadow, with a path of trampled grass;
   - a line of trunks at the edge.
7. **The "NOW" is an integer frame.** Everything derived (uniforms, atlas layer, frustum pose, timecode, timeline) uses `floor(frame)`. The continuous frame only accumulates playback.
8. **In 1-bit the present is not distinguished by color.** With only two colors, cyan and amber collapse to ink or paper, and the direction is read in the HUD. It is a property of the mode, not a bug.
9. **Near plane proportional to the orbit distance** (0.2 ×). It clips the trunks right next to the camera; it does not change any data.
10. **Three worlds, a scope extension.**
    - **A "Vitrine":** built in the apply work stream and reviewed by `impeccable-finish-reviewer`. First "fix" with 8 corrections; then "ship", with all 8 resolved.
    - **B and C:** built by the parallel work stream.
    - **Launcher:** the parallel work stream built "/", which chooses among the three.
11. **Collapsed on desktop.** Per A's contract, Layers and Display start collapsed to their title bar. They remain visible and work with one click; on mobile they are open.
