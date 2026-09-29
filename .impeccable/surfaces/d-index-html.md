---
version: 1
slug: "d-index-html"
primary_target: "sites/4d-os/d/index.html"
related_targets: []
---

# Surface brief — landing D "Golden stoop" (`sites/4d-os/d/index.html`)

**Scope and mode:** the full landing D: a first screen with a gesture, and a story page. *Experience* mode: the work rules from the first screen. It uses the shared engine (boot, `TimeController`, `TimeViewer`, `RetroDisplay`, `chaseCam`, `zoomHero`, `desktop`, `keyboard`, `tesseract`) and meets the specs `cosmic-landings`, `hero-gesture` and `procedural-subject`.

**Audience and task:** the creative-technology community around the reference video on 4D capture, on desktop and on mobile, with little time. Within seconds they have to understand that the same 4D engine runs another world, and that the bird is mathematics: the curve that flies is the one read on screen, with its values at the NOW.

**Proof:**
- the `falcon-phi` scene live, with all of its moments at once;
- the spiral traced live with the pack's clock;
- the NOW readouts, computed with `src/pipeline/scenes/falconPhi.ts`;
- the φ ratio measured on the points of the loaded pack, not written in;
- the figures read from the pack.

**Constraints:**
- text in English and "synthetic" always in view;
- nothing written by hand that can be read from the pack or computed with the module;
- OFL fonts with their own Greek (φ, θ, π);
- no OS windows: it is a world of its own;
- under reduced motion: no autoplay, no dissolves and no progressive tracing.

**Memorable moment:** the falcon comes down the spiral and the tube draws it in green at the same time; on the panel, the ratio between two radii a quarter turn apart stays pinned at 1.618, in gold. When the loop comes around, the screen erases in a flash and starts again.

**How the direction was chosen:** with no direction round, the build follows the direction the seed assigned (position 3 of 7), merged with the commitments of `docs/design/PRODUCT.md`, code-led because no image generation was configured; impeccable's own pick, position 1 (a PPI radar screen with trailing echoes and data blocks), was not built.

## Direction contract

THESIS: D is a storage-tube vector graphics terminal (the green screen that keeps every stroke until it is erased) wired to the city: the tube *computes* the falcon. Keeping every stroke is "every moment at once", so the trail is the phosphor's memory and the page erase is the seam of the loop. It refuses the generic sci-fi HUD (corner brackets, edge glow, scanlines, Orbitron) and the nautilus poster.

OWN-WORLD:
- **Black glass** #07060b, full bleed. The chrome is stroke only: 1 px lines, ticked axes, tube text; never fills, gradients or shadows.
- **Phosphor** in four intensities: #0a2a20, #14633f, #3ad67c and #baffd2 (writing). It is the terminal's voice and also what is stored: the trail of the past.
- **The NOW:** cyan #3fe0ff going forward and magenta #ff3fb0 in rewind, the city's two neons. HOLD is #baffd2, the stored stroke.
- **Gold #ffc45a:** belongs to φ alone.
- **City night:** #100c1c, #1d1433 and #34204d; slate #566374, silver #c3cad3 and cream #f3efe4.
- **Type:**
  - Tektur (condensed for headlines; tabular numerals for every live figure, the labels and the timecode);
  - Jura for running text and the equations.
- **Sky:** none. A rain of φ glyphs was removed on 2026-09-24; behind the city there is only the black glass (`--scene-bg`).

STORY: The visitor chases the falcon through the city of points while the panel writes the spiral and its values. Scrolling down, the camera opens to the full plate (the golden funnel with every falcon), the video reaches the last frame (the perched portrait) and the story follows, one terminal page at a time:
1. φ and the golden angle;
2. the plate of the spiral seen from above;
3. the wingbeat, after Marey;
4. from the equations to the points;
5. the pack's figures.

It closes with the footer.

FIRST VIEWPORT:
- **View:** full bleed, 100svh. The falcon chase in `all` mode, with the trail in phosphor on the black glass.
- **Top left:** "The golden stoop." in condensed Tektur at the largest display size (6rem), a subject line in Jura on glass (the text erases what is behind it) and the SYNTHETIC tag.
- **On the right, a 38.2% column:**
  - the tube's plan: the spiral in plan view, tracing itself with the pack's clock, and the NOW cursor;
  - below it, the live equation and the readout table: θ, r, the φ ratio in gold, the wingbeat phase with its oscilloscope, the wingspan, the height, the speed and the phase.
- **At the bottom, under the glass:** the control band: HOLD, zoom (− / +) with the phase hint, timecode, state and ruler. Time (all / memory) and colors (1-bit / 16 / Millions) go at the foot of the tube.
- **Primary action:** scroll down.
- **Signature interaction:** the tube traces the spiral at the pace of the NOW and keeps it; the loop seam erases the page with a phosphor flash, at the same time as the scene's dissolve.

Elevations (each one from a declined challenger):
- **From the lowbrow panel:** the active state is marked with a second concentric stroke, never with a fill or a glow.
- **From Ikko Tanaka:** the grid and the type scale come from φ (61.8 / 38.2 columns and sizes of 16·φⁿ). One monumental figure against minimal labels.
- **From the accretion disk:** the spiral's labels ride the curve and the pole stays unmarked.
- **From the tensegrity column:** a 1 px leader line ties the readout table to the falcon on screen, like a dimension line.
- **From the darkroom:** the pipeline is a fixed sequence of stations, in order.
- **From HyperCard:** reading is operating. The θ of the equation is a slider that moves the NOW (by dragging and with the arrow keys).

FORM: storage-tube vector terminal (Tektronix 4010/4014), position 3 of 7 on the ordered list; seed `56c95648`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Round verdicts (seed 56c95648)
- **Lowbrow panel** (hot rod, tiki): declined. The double stroke of the active state stays.
- **Ikko Tanaka:** declined; the light paper clashes with the committed cyberpunk world. The golden grid stays.
- **Accretion disk:** declined; it is E's world (Closed World). The label riding the curve stays.
- **Tensegrity:** declined. The leader line to the subject stays.
- **Darkroom:** declined; the photographic world belongs to B and C. The stations in order stay.
- **HyperCard:** declined; it is the old OS of A, B and C. The equation as a control stays.
- **Category standard** (neon HUD with glow): not taken.

## Build notes
- **Full plate:** a low three-quarter view (16° of elevation, −165° from the global heading): the trail reads as a helix of falcons coming down toward the golden diagram. On the phone, 26°.
- **Source-camera light on in the hero:** the city outside the drone's cone goes dark and sparse, so its cyan and magenta neons do not compete with the NOW.
- **Marey on black:** in the wingbeat view the city goes dark, like Marey's black shed.
- **1-bit is the tube:** the 1-bit pair is black glass and writing phosphor.

## Unresolved
- The finish review (task 7.5 of `add-cosmic-landings-and-organic-motion`) and the regeneration of `docs/design/DESIGN.md` were left for the end of that change.
