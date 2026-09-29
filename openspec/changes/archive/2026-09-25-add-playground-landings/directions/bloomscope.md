# Bloomscope — final bloom direction (judged, grafted, raised)

**Route:** `/landings/bloomscope/` · **Slug:** `bloomscope` · **Title shown:** Bloomscope · **Pinned theme:** nature's perfect symmetry (phyllotaxis, echeveria, spiral aloe, honeycomb), grown procedurally in low poly · **Seed key:** 50846703 · **Assigned index:** 7 of the base designer's own list (the kaleidoscope) · **Mode:** Experience, code-led · Scratch only, nothing in the repo was edited.

In one line: a cobalt page built around a giant kaleidoscope you turn by a brass ring. The chamber holds low-poly flowers, succulents and glass beads, each grown from an equation. Below it is a bench of three growing toys whose results drop into the scope. The page ends with a rack of kaleidoscope "wheels" that open the five 4D.OS worlds.

---

## 0. Judging

Both designers honoured the seed. **Bloomscope** (toy-first) built #7 of its list, the kaleidoscope. **Floral Clock** (world-first) built #7 of its list, the carpet-bedded floral clock. Neither list was reordered, both lists span at least three material families, and both spend the literal "low-poly garden" reading on one slot at most.

Scores are 1–10 per axis.

| Axis | Bloomscope (toy) | Floral Clock (world) | Why |
|---|---|---|---|
| 1. Audience identification with the pinned theme | **8** | 6 | Everyone knows a kaleidoscope from childhood, and its mirrors make the D3, D5 and hex symmetries that flowers and combs grow. The floral clock is municipal carpet bedding, and its own designer admits it ranks last on recognition and may read as quaint. |
| 2. Product clarity (toys + real demo index) | 7 | **8** | Both are real hubs. Floral Clock surfaces the index better: a hero skip link, an "Enter 4D.OS" sign, and nav naming every section. Bloomscope's spiral of wheels does not fit (checked: a golden-angle layout of 9 captioned wheels overlaps in ≥2 places at every tested spacing within 1312px). |
| 3. Beauty and vividness at page scale | **9** | 7 | Bloomscope drenches cobalt → pollen → glaucous mint → honey → petal pink, which is closest to the bar set by the reference aesthetic, and more vivid. Floral Clock opens on lawn green (it names the "eco/golf" risk itself), and 2,000 tiny plants at 1/3 resolution risk dither mush. |
| 4. Fun and satisfaction of the toys | **9** | 8 | Bloomscope has flick-the-barrel physics, the golden-angle detent snap, a lathe with a pull tab and water drop, and a make → collect → multiply loop into the scope. Floral Clock's fan of ghost hands and its live replanting are superb, but the bench and hive are the same toys as Bloomscope's. |
| 5. Every moment at once + low poly + symmetry | 8 | **9** | Floral Clock's hero is a literal chronophotograph: a fan of ghost hands on a clock. Bloomscope's claim is partly argued ("the head is its own past"), though its symmetry is the strongest (the page is a symmetry machine). |
| 6. Feasibility within stack and budget | **7** | 6 | Bloomscope needs a fold shader on top of RetroDisplay, 2D physics and four views, which is well bounded. Floral Clock has bitmap numerals and "PLAYGROUND" on a tilted dithered dial, ~2,000 instances plus a bloom shader, and a scroll camera fighting a drag. Legibility is unproven. |
| 7. Distance from the AI-default looks | 8 | 8 | Both are light and saturated. Floral Clock's italic serif Latin tags lean slightly editorial, but botanical code justifies them. |
| 8. Honesty (demo labels, no invented claims) | **9** | 7 | Both label the demo. Floral Clock's copy line "Carpet bedding was the first 16-colour display" is an unverifiable "first" claim, and its park history needs checking. Bloomscope labels its estimates and its sound mapping. |
| **Total** | **65** | 58 | |

**Base: Bloomscope.** It wins on the three axes the brief stresses: vivid colour, fun, and recognisable symmetry. It is also cheaper to make beautiful. The kaleidoscope is a symmetry machine the audience already knows, and the golden-angle punchline ("the one angle no mirror can make") is the page's strongest idea. Its weaknesses are fixable: an index layout that doesn't fit, a thin first-viewport route to the demos, a display size above the craft floor, glyphs missing from the chosen fonts, a too-heavy font plan, and a NOW mark without enough contrast. All of them are fixed below.

### Grafts from Floral Clock (each named where it lands)
- **G1 · "Every turn at once."** From "Show the whole day": one primary button that plays the machine for people who won't drag. The barrel runs one full revolution while the chamber tumbles with 24 exposures, then HOLDs on the resulting flower of trajectories.
- **G2 · Peephole.** From the overhead preview in "Plant the bed": each bench section pins a small live second view of the scope, so what you drop in is visible without scrolling back.
- **G3 · 4D.OS time vocabulary.** From the FORWARD / REWIND / HOLD HUD: every time scrubber on the page (Sow's birth scrub, Hive's history) uses the 4D.OS direction words and colours, so the playground speaks the demos' language.
- **G4 · Herbarium strip.** From "Press this specimen": Sow keeps your last 8 pressed heads as dithered thumbnails, each captioned with its angle. Also the **√2 turn** preset, the irrational control that is not golden.
- **G5 · Index clarity.** From the hero skip link and the "Enter 4D.OS →" sign: a skip link in the first viewport, a primary launcher action on top of the index, a straightforward mirror-symmetric rack instead of the spiral, the Playwright still-capture script with provenance sidecars, and labelled pixel emblems until the captures exist.
- **G6 · Printed, tuned seed.** From "Scatter bees (seed 0137)": Hive's Random is deterministic, and its seed is chosen by a test so the run lives, then printed on the button.
- **G7 · Separate build config.** `vite.playground.config.ts` never touches `dist/4d-os`.

---

## 1. Grounding (kept from the base, unreordered)

**Mechanism in one sentence.** Each specimen is computed live from its growth equation, and its shape records its own growth order: newest floret at the centre, oldest leaf at the rim. Every specimen already shows every moment at once.

**Audience scene.** Creative coders and spatial-computing people, on a laptop or phone, curious and short on attention. They know phyllotaxis from Processing sketches, and they know a kaleidoscope from childhood.

**The rut.** A near-black page with a glowing particle sunflower and an italic "mathematics of nature" line. The predictable opposite is a cream Haeckel botanical plate.

**Seven grounded candidates, in resonance order:**
1. Haeckel's *Kunstformen der Natur* plates *(scientific print)*
2. The beekeeper's frame inspection *(wax and wood craft)*
3. Chromolithographed seed packets *(printed ephemera)*
4. The succulent nursery bench *(horticultural retail)*
5. The Victorian palm house *(architecture)*
6. A procedurally grown low-poly garden *(generative 3D; the literal slot)*
7. **The kaleidoscope** (Brewster, 1816) *(optical toy)*

**Assigned: #7.** The facts it rests on:
- Two mirrors at 60° give D3: lily and aloe flowers come in threes.
- Two mirrors at 36° give D5: roses come in fives.
- Three mirrors at 60-60-60 tile p3m1: honeycomb.
- No mirror arrangement makes 137.507°, because the golden angle is irrational.

**IMPECCABLE'S PICK (one card, never the lead):** Haeckel plates. Risk: it is the most familiar reading and pulls toward sepia or cream.

### Challengers (verdicts decided before borrowing)
| Challenger | Verdict | Raise carried into the direction |
|---|---|---|
| Gravity-rain garden | **declined**: dusk palette against the vivid brief; shows physics rather than symmetry | **Gravity-rain raise:** every toy is a law you can replay. The whole page state serialises to `#g=`, and seeded RNG plus 120 Hz fixed-step physics make "Copy link to this garden" reproduce the same chamber, frame by frame. |
| Drawcord cape | **declined**: audience doesn't recognise it; couture drowns symmetry | **Drawcord raise:** every toy has 3–5 named states reachable with one button (phones, keyboard, reduced motion). No toy depends on a fine drag. "Stretch time" is a literal pull tab. |
| Risograph web system | **competitive**: holds audience identification, loses clarity (static print can't show live growth) | Stays a full alternate: "the same scope, printed in fluoro Riso inks; more familiar, but it imitates print where the studio's truth is a live display." |
| Drum-machine step row | **declined**: loses the pinned nature world | **Step-row raise:** one visible NOW. Ruby `#E8175D` is only ever the newest thing: newest seed, newest leaf, the Hive cell under the cursor, the barrel's NOW notch. (Amended at the finish review: newborn Hive cells are pollen with an ink keyline, so ruby is never spent on dozens of cells at once.) |
| Hatch Show Print | **declined**: static, not about symmetry | **Hatch raise:** each section title is one Bagel slab. Its line breaks are authored and the text column is sized to the slab's measured width, so slab and column always share one edge. |
| Sticker accretion | **declined**: illegible by design | **Sticker raise:** nothing you remove vanishes. A specimen taken out of the chamber leaves a 1-bit scar outline in the tray for the session, and tray order is the order things were added. |

---

## 2. Direction contract

**THESIS.** A kaleidoscope is a machine that makes the symmetries flowers and combs grow on their own. The page *is* the scope, and its punchline is the one symmetry no mirror can make: the golden angle. It refuses the near-black glowing-particle sunflower and the cream botanical plate.

**OWN-WORLD.** Backlit coloured glass on printed toy-tube paper.
- Whole sections are drenched in cobalt, pollen, glaucous mint, honey and petal pink, with plum ink.
- Controls are faceted glass gems; the turn handle is a knurled honey-brass ring.
- Headlines are Bagel Fat One slabs; readouts use Recursive Mono.
- Every specimen is low-poly and dithered to 16 glass colours. One ruby NOW.

**STORY.**
1. The visitor turns the scope and sees that mirrors make threes, fives and hexagons.
2. They find the one angle mirrors can't make and grow a sunflower, a rosette and a comb, dropping each into the chamber to see it multiplied.
3. They load another wheel and leave into the five 4D.OS worlds.

**FIRST VIEWPORT (1440×900).**
- Drenched cobalt field under a tonal Vogel-dot print centred on the eyepiece.
- A 720px live eyepiece centred at (1024, 486), inside a 28px honey-brass ring (outer diameter 776).
- On the left, x 64–560: "Turn the / garden." in Bagel at 96px, sheet colour, top at y=150.
- Four mirror gems at y=540, a pollen "Every turn at once" button at y=652, the chamber tray at y=780, and a skip link to the five worlds at y=848.
- Primary action: drag the ring. One-press alternative: Every turn at once.

**FORM.** Kaleidoscope (Brewster's optical toy), #7 of 7 grounded, seed key 50846703.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

**Signature interaction.** Flick the brass ring. The barrel spins with inertia and ticks through 15° detents. Everything in the chamber tumbles and leaves 12 dithered exposures, and the mirrors multiply those paths into a flower of trajectories.

---

## 3. Physical scene → light

*A kid holds a kaleidoscope up to a bright window at noon and turns the barrel while sun pours through coloured glass.* The scene is backlit, saturated daylight, so the page is **light and drenched**. The eyepiece is a sheet-white backlight disc. Dark appears only as plum ink, and as the 6% ink vignette inside the tube.

## 4. Colour: full palette, drenched per section

Each section is one piece of coloured glass that owns its whole field. Section edges are hard, and fields never crossfade.

### Page tokens (contrast computed with WCAG relative luminance)
| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--glass-cobalt` | `#2B3FE0` | Hero field | sheet on it: 6.83 |
| `--glass-cobalt-print` | `#3F55F0` | Vogel-dot print on the hero | sheet on it: 5.24 (text stays legible over dots) |
| `--glass-pollen` | `#FFD21F` | Sow field; primary gem fill everywhere | ink: 12.55; on cobalt: 5.01 |
| `--glass-glaucous` | `#8FD6B8` | Lathe field | ink: 10.81 |
| `--glass-honey` | `#F39A1A` | Hive field; brass ring | ink: 8.18 |
| `--glass-petal` | `#FF6FB5` | Index field | ink: 7.10 |
| `--ink` | `#1B0F2E` | Plum: all text on light fields, outlines, footer field | ink/sheet: 17.10 |
| `--sheet` | `#FFF7EA` | Backlight: eyepiece ground, text on cobalt and ink | |
| `--now` | `#E8175D` | Ruby NOW mark. **Always drawn with a 2px ink keyline** (see below) | 4.08 on ink, 4.19 on sheet; never body text |
| `--chartreuse` | `#C8F03C` | Selection on ink, youngest florets | 13.85 on ink |
| `--propolis` | `#8A3A12` | Ring knurl, hive wood, oldest florets | sheet on it: 7.33 |

**Fix:** ruby on cobalt is only 1.63, and the NOW notch sits on the honey ring. Every NOW mark therefore carries a 2px ink keyline, which gives ≥3:1 for non-text graphics (WCAG 1.4.11) on every field.

**Browser surfaces:**
- `::selection` is pollen on ink; inside the pollen section it is cobalt with sheet text.
- `caret-color: var(--now)`.
- Scrollbar: 10px, ink thumb, track in the current field (via `scrollbar-color`).
- Numerals: `font-variant-numeric: tabular-nums` on every readout.
- Focus ring: 3px ink outline outside a 2px sheet gap, drawn as `outline` plus `box-shadow: 0 0 0 2px var(--sheet)`. It reads on every field.
- Links: underlined with a row of 3px "seed" dots (radial-gradient, 6px pitch, 4px offset) that turn `--now` on hover.

### RetroDisplay 16-colour palette (`--pal-16-0..15`)
Four value ramps (violet/cobalt/sky, green, yellow/amber, pink) so flat-shaded faces dither cleanly:

`#1B0F2E` ink · `#4A1D6B` violet · `#2B3FE0` cobalt · `#5FB4FF` sky · `#0E5A4A` bottle green · `#1FA85B` leaf · `#8FD6B8` glaucous · `#C8F03C` chartreuse · `#FFD21F` pollen · `#F39A1A` honey · `#FF5A1F` vermilion · `#E8175D` ruby (NOW) · `#FF6FB5` petal · `#B99CFF` lilac · `#FFF7EA` sheet · `#8A3A12` propolis

**1-bit mode per section:** each view's RetroDisplay uses its section as `tokenRoot`, with `--pal-1bit-0` = ink and `--pal-1bit-1` = that section's field. 1-bit is therefore plum stipple on cobalt, pollen, mint, honey or pink.

## 5. Type (verified 2026-09-25 with `npm view`, all OFL-1.1)

| Family | Role | Source, file, size |
|---|---|---|
| **Bagel Fat One** 400 | Display slabs only | `@fontsource/bagel-fat-one@5.3.0` → `files/bagel-fat-one-latin-400-normal.woff2`, **24.4 KB** |
| **Recursive** (CASL + wght subset) | Body and UI: body CASL 0.35 / wght 430 / 17px / 1.5, measure ≤ 68ch; labels CASL 1 / wght 720 / 13–15px | `@fontsource-variable/recursive@5.3.0` → `files/recursive-latin-casl-normal.woff2`, **108.7 KB**. Axes checked with fontTools: CASL 0–1, wght 300–1000 |
| **Recursive** (MONO + wght subset) | Readouts only (angles, counts, paths, generations), MONO 1 / wght 520, tabular | same package → `files/recursive-latin-mono-normal.woff2`, **72.6 KB**. Axes: MONO 0–1, wght 300–1000 |

**Fix from the base:** the base planned a 305 KB "full" file cut down with the fontTools instancer. That is an extra build step, and it needs brotli. Fontsource already ships per-axis subsets, so the page uses two of them (CASL and MONO), registered as `"Recursive Casual"` and `"Recursive Mono"`. Total fonts come to **205.7 KB** with no build step. Bagel and the CASL file are preloaded.

**Glyph check (latin subsets, fontTools):** `° · × — ’` are present. **`≈ → ↻ ↺ √ φ` are missing from all three files.**
- Copy never uses them: "about 34 · 55", "clockwise / counter-clockwise", "root 2 turn".
- Arrows and rotation marks are authored SVG icons (1.75px stroke, round caps, ink or sheet).

**Scale:**
- Bagel display is capped at **96px (6rem)** per the craft floor: hero 96/0.92, section slabs 88/0.94, wheel captions 28/1.
- Tracking is −0.01em on Bagel and never below −0.04em.
- Neither face is used by a 4D.OS world or sits on the defaults list. OFL texts ship in `fonts/`.

## 6. Procedural low-poly scene (the maths)

Everything is built in `BufferGeometry`: no downloaded models, no photos.

**Material.** One flat material:
- per-face normals from `dFdx/dFdy` in the fragment shader;
- a key light at elevation 55° plus a hemisphere fill (sheet over violet);
- per-instance palette colour.

Views render through `RetroDisplay` (pixelScale 2 on the Scope, 3 on the bench).

**Specimens:**
- **Sunflower capitulum (Vogel 1979).**
  - Floret n: θₙ = n·α with α = 360°·(2−φ) = 137.507764°, rₙ = c·√n, dome zₙ = −0.35·c√N·(n/N)².
  - Floret shape: a 6-sided low pyramid, 12 tris, scaled 0.92·c (Vogel cells are near-hexagonal).
  - Colour by birth order: chartreuse → pollen → honey → propolis, with the newest floret ruby.
  - 21 ray petals: 5-vertex kites on a 2-segment parabola, placed at α.
- **Echeveria rosette.**
  - Leaf k of K: azimuth k·α; tilt from vertical 12° + 72°·(k/K)^0.7; length L₀·(0.35 + 0.65·√(k/K)).
  - Spoon profile: 7 stations, width w(s) = sin(πs)^0.8·(1−0.3s), upper-face bulge (0.10 + 0.20·Plump)·w.
  - Blush mixes the tip vertex glaucous → lilac → petal. **Never ruby**; ruby is reserved for NOW, so the newest leaf gets the ruby keyline.
  - Internode hᵢ = τ·0.06·i.
- **Spiral aloe (*Aloe polyphylla*).**
  - Azimuth k·(144° ± 4.2°); the sign is chirality, and both hands occur in nature.
  - Flat triangular leaves with serrated margins: every other edge vertex pushed out 0.06·w and tinted chartreuse.
- **Honeycomb.**
  - Axial (q, r) → x = s·√3·(q + r/2), y = 1.5·s·r.
  - Open hex prism with a three-rhombus base; the Maraldi angles 109.47° and 70.53° appear as a readout.
  - Honey is an amber hexagon at the fill height; caps are sheet hex domes.
  - Grows ring by ring (ring n has 6n cells).
- **Glass beads.** Octahedra, icosahedra and 5-sided petal chips in cobalt, sky, chartreuse and petal. Ruby is not used for beads.

### The Scope pipeline (feasible on the existing engine)

`ScopeView implements EngineView`. Its `render(renderer, rect)` runs three steps:
1. **Object cell.** Render the chamber scene orthographically into a private 512² `WebGLRenderTarget`: a disc of radius R = 1, specimens and beads, plus the exposure layer.
2. **Fold.** Hand `RetroDisplay.render()` a one-quad scene whose `ShaderMaterial` samples the cell RT through the fold. RetroDisplay then renders that quad into its low-res target and dithers it in screen space. Because the dither happens after the fold, the Bayer pattern never mirrors and the seams stay clean.
   - **Two mirrors, wedge π/n:** in polar (ρ, θ − β), θ′ = |mod(θ + π/n, 2π/n) − π/n|. Presets are n = 3 "Lily · threes" and n = 5 "Rose · fives".
   - **Three mirrors:** up to 10 iterations of p ← p − 2·max(0, nᵢ·p − cᵢ)·nᵢ over the triangle's edges. Presets are *333 "Comb" (p3m1) and *632 "Comb and star".
   - β (the barrel angle) rotates the object cell under the mirrors, as a real barrel does.
3. **Raw-cell inset.** A 96px circle shows the unmirrored cell with the mirror lines drawn in sheet at 1px. This keeps the mechanism legible, so the scope never reads as a screensaver.

## 7. Every moment at once + the dithered display
- **Scope · Exposures** (on by default).
  - Each body stores its last 12 positions, sampled every 50 ms (not per frame).
  - Exposure i is drawn in the cell at alpha 0.08 + 0.5·(i/12); RetroDisplay turns the translucency into Bayer stipple.
  - When bodies sleep, their exposures **stay** as a frozen Marey plate until the next motion.
  - The mirrors multiply those paths into spiral arms.
- **G1 · Every turn at once.**
  - One press: ω = 120°/s for 3.0 s (one full turn), gravity follows the barrel, and exposures temporarily rise to 24, sampled every 66 ms (a 1.6 s trail).
  - Then HOLD: bodies freeze and the flower of trajectories stays on screen until the next touch.
  - The Scope readout shows `HOLD`.
- **Sow.** Seed position is birth order, so the head is its own past.
  - Hover or focus a seed to read "seed #412 · born 13.7 s ago".
  - **G3:** the "Scrub births" slider dims seeds born after the scrub point to 1-bit stipple. A chip shows `FORWARD` (pollen), `REWIND` (petal) or `HOLD` (sheet).
- **Lathe · Stretch time.** The pull tab raises each leaf by its birth order: time as height, echoing the cat's staircase of exposures.
- **Hive.** Every generation is kept as a wax layer stacked beneath the frame (lifeStack on axial coordinates).
  - **G3:** "Rewind" steps down the stack, because the history is really kept.
- **Lathe · Drop water.** The drop's path is kept as 16 exposures on the leaves.
- **One NOW** (Step-row raise): ruby with an ink keyline, on the newest thing only.
- **RetroDisplay.**
  - One shared display state with three options: `1-bit · 16 · Millions` (the `DISPLAY_MODES` ids). The switch is in the hero deck and mirrored in each bench section; all views follow it.
  - Default is `16`.
  - `reveal` plays once per view on first scroll-in.

## 8. Symmetry (the page's grammar)
- **Dihedral:** Scope D3 and D5; the wheels' 6-fold iris.
- **Hexagonal:** *333 and *632 tilings, the comb, hexagonal gem facets, Vogel's near-hex cells.
- **Spiral / golden:** the Sow head, the rosettes, and the hero's tonal Vogel print (1,200 dots, c = 19px, centred on the eyepiece, so the eyepiece sits at the heart of a printed sunflower).
- **Mirror:** nav, footer and the index rack are mirror-symmetric about the page axis. The hero is deliberately off-axis, so the one centred thing is the circle.

## 9. Toys (implementer level)

### 9.1 The Scope (hero, signature)

**Inputs:**
- **Ring drag.** The ring is a `pointerdown` target (an annulus hit test, radii 360–388 px) with `touch-action: none`; β follows `atan2` of the pointer about the centre.
- **Inside the disc:** horizontal drag applies an impulse; `touch-action: pan-y`, so vertical swipes still scroll the page.
- **Keyboard:** ←/→ ±5°, Shift ±15°, Space = Shake, 1–4 = mirrors, E = Every turn at once.

**Ring physics:**
- Release velocity = the mean of the last 80 ms of pointer samples, clamped to ±720°/s.
- Free spin: ω ← ω·e^(−2.2·dt).
- Below 40°/s a detent spring (k = 60 s⁻², c = 2√k) pulls to the nearest 15°.
- 72 propolis knurl ticks rotate with β. The ruby NOW notch (14×22 triangle, ink keyline) is fixed at 12 o'clock.

**Chamber physics:**
- Fixed 120 Hz step, max 4 substeps per frame. Cell units: R = 1.
- Gravity 3.2 R/s² toward screen-down, rotated into cell space by −β. Turning the barrel makes things tumble.
- Bodies are circles, radius 0.05–0.09 for beads and 0.14–0.24 for specimens (from the geometry's bounds).
- Restitution 0.35, tangential friction 0.08; angular velocity from friction torque; the wall is the R = 1 circle.
- A body sleeps after 1.5 s with |v| < 0.02 R/s.
- Shake: every body gets v += 1.8 R/s in a seeded-random direction.
- Horizontal drag in the disc: impulse = 0.004 × pointer velocity (px/s).

**States:**
- Idle (asleep, exposures frozen); Tumbling; HOLD (after Every turn at once).
- Chamber empty: never truly empty, since 18 beads always remain. The tray reads "Empty. Put something in from the bench below."
- Chamber full: 7/7 specimens. "Put in the Scope" buttons become disabled with "Chamber full, take one out".

**Load moment** (motion allowed): 3 default specimens (a sunflower, an echeveria, an aloe) and 18 beads drop in from the top of the cell over 1.2 s. The barrel pre-spins 90° (ω₀ = 120°/s, decaying). After that there is no idle rotation.

**Feedback:**
- Detent tick sound and a 1px knurl "click" offset of 80 ms.
- Readout below the eyepiece in Recursive Mono 13px sheet: `D5 · 135° · 3 specimens · 18 beads`.
- G1 "Every turn at once" is the pollen primary gem.

**Sound:** bead collisions trigger 20 ms noise bursts band-passed at 2–5 kHz (scaled by impact), max 12 voices and 30 per second. Each detent is a 1.8 kHz, 12 ms sine tick, max 20 per second.

**A11y:**
- The ring is `role="slider"`, `aria-valuemin=0`, `aria-valuemax=359`, `aria-valuetext` "135 degrees".
- The canvas has a live `aria-label`, for example "Five-fold kaleidoscope holding a sunflower, an echeveria, an aloe and 18 glass beads".
- Gems are a `radiogroup`, and every button is native.

### 9.2 Sow: the golden-angle turntable (pollen section)

**Inputs:**
- **Dial:** a 300° arc maps 120°–160° (7.5 dial-degrees per degree).
- **Vernier:** the inner ring, or Shift while dragging, maps 1 dial-degree to 0.0033°.
- **Hold to sow** (button or Space): 30 seeds/s up to N (2,400 desktop, 800 phone).
- **Sow 100:** instant.
- **Scrub births:** a slider.

**Detent:** within ±0.03° of 137.507764°, the value snaps over 60 ms, with an 8 ms `navigator.vibrate` where supported, a bell sound, and a "GOLDEN" stamp in Recursive Mono that fades over 1.2 s (no blink).

**Named states** (PageUp/PageDown): `Golden 137.508°` · `Spokes 137.3°` · `Near 137.6°` · `Fifths 144°` · `Thirds 120°` · `Root 2 turn 149.117°` (360°·(√2−1), equivalent to 360°·(2−√2) turned the other way).
- Named states step 0.3 s apart; while the angle travels between them, all N seeds re-lay live on the GPU from the instance index and a uniform α.

**Readouts** (Mono):
- `divergence 137.508°`, `seeds 1,204`
- `visible spirals about 34 · 55 (estimated)`: consecutive continued-fraction convergent denominators of α/360 with q ≤ 2.3·√N
- near 144° the readout is `spokes 5`

**G4 · Herbarium strip:** "Press this head" stores an 88px dithered capture (read back from the view's target) captioned with its angle. The strip holds 8; the oldest drops off.

"Put in the Scope" flies a 40px chip (GSAP, 520 ms, expo-out, arcing 40px above the straight line) to the fixed 64px chamber gem (bottom-right, shows `3/7`). Clicking the gem scrolls back to the Scope.

**G2 · Peephole:** a 200px circular live view of the Scope pinned at the section's top-right (120px on phones, above the view), same scene, pixelScale 3.

**Sound:** each seed plucks C-major pentatonic over 2 octaves, pitch = angle mod 360. At 144° the tune repeats every 5 seeds; at golden it never quite does. A caption says this mapping is a design choice, not botany.

**A11y:** `<input type="range" step="0.001">` styled as the dial; `aria-valuetext` "137.508 degrees, golden, about 34 and 55 spirals". The live region is throttled to once per second.

### 9.3 Rosette lathe (glaucous section)

**Species gems:** `Echeveria` · `Aloe, clockwise` · `Aloe, counter-clockwise`.

**Grow:**
- Drag down on the plant to add a leaf every 24px, drag up to remove one. Mouse and pen only; on touch the view is `pan-y`.
- Steppers everywhere: `+1 leaf`, `+8`, `−1`.
- Leaves slider with ticks at 8/13/21/34/55/89 (phones max 55); Plump 0–1; Blush 0–1.
- Orbit: horizontal drag, ±70° yaw, damping 4/s.

**Stretch time:** a pull-tab slider with named stops `Rosette` (τ = 0) · `Half` (0.5) · `Staircase` (1). Its spring settle is k = 170, c = 18.

**Drop water:**
- Click the rosette, or press Enter on "Drop water": a 20-tri drop starts at the hit point.
- It moves by steepest descent in the plane of the current leaf triangle: a = 9.8·sin(slope) − 0.6·v, in plant units per second².
- It crosses edges onto lower leaves until it reaches the centre (echeverias funnel water to the stem), then plays a single drip. Its path stays as 16 exposures.

**Feel:** a music box wound leaf by leaf, then the drawcord pull.

**Tech:** merged geometry rebuilt on change (≤ 89 × 40 tris), debounced to rAF.

**A11y:** all controls are native inputs or buttons; the canvas label describes species, leaf count and τ.

### 9.4 Hive frame (honey section)

**Grid:** 24×16 hexes, 14×10 on phones, wraparound.

**Rule:** "a hexagonal cousin of Life (rule B2/S34)": born with exactly 2 of 6 neighbours, survives with 3 or 4.

**Controls:** paint by drag or tap; `Run` (6 generations/s) · `Step` · `Rewind` (G3, one layer down the stack) · `Clear` · `Random (seed NNNN)`.

**G6 · Seed:** a unit test picks the first seed ≥ 1 whose 30% fill lives ≥ 48 generations with ≥ 20 live cells at generation 32. That seed is hard-coded and printed on the button.

**Stack:**
- Each generation is a layer of instanced prisms under the frame: 32 layers desktop, 12 phone, 0.18·s apart.
- Layer colour ramps honey → propolis with age. Newborn cells in the current layer are pollen with a 2 px ink keyline; the only ruby cell is the live cell under the cursor (NOW), once the visitor has touched the frame. (Amended at the finish review.)
- A cell alive 6 generations running gets a sheet wax cap.
- The camera tilts the frame 18° into view when Run first starts (600 ms, expo-out).

**Sound:** a wooden "tock" per cap, rate-limited to 3 per second; a soft FM marimba on Step.

**A11y:** `role="grid"` with a roving hex cursor. Arrows move along the axial axes, Enter toggles, R runs, S steps, B rewinds. The live cell count is announced on Step.

### Satisfaction loop
Make → collect → multiply.
- Every bench toy has "Put in the Scope".
- The chamber gem keeps count.
- **Copy link to this garden** writes `#g=` as base64url of a versioned byte string: version, mirror, β, display mode, up to 7 specimen parameter records, hive seed + edits, Sow angle. Opening the link replays the exact garden.
- If copying fails, a toast says "Couldn't copy. Here's the link:" with a selectable field.

## 10. Demo index — "Load another wheel." (petal section, G5)

The spiral layout is replaced: it overlapped at every spacing tested. The index is a **mirror-symmetric wheel rack**, which is how wheel kaleidoscopes store their object wheels.

1. **Launcher row.** A 440px wheel at the left of the 1312px column shows the 4D.OS launcher tesseract glyph: a static Canvas2D frame from the `tesseract.ts` projection. Beside it:
   - Bagel 88px "4D.OS";
   - one line of Recursive: "The desktop that holds all five worlds.";
   - the **primary action**, a pollen gem "Enter 4D.OS" plus an SVG arrow, linking to `/4d-os/`.
2. **World rack.** Five 232px wheels across 1312px, with a 38px gap (5·232 + 4·38 = 1312). Each wheel has a 4px ink rim and a 10px honey bezel. Under each:
   - the title in Bagel 28px;
   - one line of Recursive 15px;
   - the path in Mono 13px.

   | Wheel | Link | Caption |
   |---|---|---|
   | A · Vitrine | `/4d-os/a/` | "A red gallery room: a black cat climbs the stairs and every moment stays behind as points." |
   | B · Plate | `/4d-os/b/` | "The same climb as a chronophotography plate, under an aurora sky." |
   | C · Leader | `/4d-os/c/` | "The climb cut into a 16mm film leader." |
   | D · The golden stoop | `/4d-os/d/` | "A peregrine falcon stooping along a golden spiral, on a phosphor vector terminal." |
   | E · Whale fall | `/4d-os/e/` | "A whale spiralling into a black hole, with gravitational lensing and two clocks." |

3. **Lab rack.** Three 160px clear-glass wheels, centred, with a sheet rim and slowly shifting 1-bit Vogel stipple inside (static under reduced motion).
   - Caption: "Empty cell · a sketch in the lab, not public yet".
   - They are `<figure>` elements: not links, not focusable, with no invented names.

**Wheel iris (hover or focus):**
- Each wheel is a Canvas2D element over its `<a>`.
- On hover or focus, the 6-fold kaleidoscoped version of the still (12 wedge copies: 6 rotations × mirror of the central 60° wedge) opens from the centre inside a growing circular clip, r: 0 → R over 420 ms with expo-out. It closes on leave.
- Under reduced motion there is no iris.

**Stills:**
- D and E use `/4d-os/launcher/d-golden-stoop.png` and `/4d-os/launcher/e-whale-fall.png`, resized to 600×450 WebP. Each derivative gets an origin embed ("derived from …png, build …").
- A, B and C come from `scripts/capture-stills.cjs` (Playwright, 1200×900, from the live `/4d-os/a|b|c/`), with a `provenance.json` sidecar and `embed-prompt` origin metadata.
- Until then, A, B and C show a flat 24×24 pixel emblem in the palette (a cat on stairs, a plate with a streak of exposures, sprockets), captioned "sketch until a still is captured".

**Tab order:** launcher, A → E. DOM order matches.

**Section line:** "Each world is a real scene you can scrub through time. The empty cells are experiments still growing."

## 11. Sections, top to bottom (desktop 1440×900)

1. **Nav** (in the cobalt field, not fixed, 72px, mirror padding 64px).
   - Left: "crewtives playground" (Recursive CASL 1 / 720 / 18px, sheet), linking to `/`.
   - Right: text links `Scope · Sow · Lathe · Hive · Worlds` (15px, seed-dot underline), then the `Sound: off` gem with an authored speaker icon.
2. **The Scope** (cobalt, `min-height: 100svh`, exact composition):

   | Element | Box (x, y, size) | Spec |
   |---|---|---|
   | Vogel print | full field | 1,200 dots `#3F55F0`, c = 19px, dot diameter 4 → 9px outward, centred (1024, 486), rotates at 0.1× β |
   | Eyepiece disc | centre (1024, 486), diameter 720 | sheet backlight, 6% ink inner vignette, live Scope at pixelScale 2 (360² render) |
   | Brass ring | outer diameter 776 (y 98–874, x 636–1412) | honey, 72 propolis knurl ticks, NOW notch at 12 o'clock |
   | Readout | inside the disc, centred x = 1024, baseline y = 812 (34px above the disc edge) | Mono 13px ink on a 24px sheet pill: `D5 · 135° · 3 specimens · 18 beads` |
   | Raw-cell inset | circle, diameter 96, centre (700, 812); 23px clear of the ring | label "What the mirrors see", 13px sheet, right-aligned to x = 640 at y = 812 (spans ≈ x 500–640) |
   | H1 | x 64, cap top y 150, 2 lines | Bagel 96/0.92 sheet: "Turn the / garden." (block ≈ 177px tall) |
   | Sub | x 64, y 352–462, measure 400px | Recursive 19/1.45 sheet |
   | Ring hint | x 480–624, y 472–500 | sheet tag "Drag the brass ring" plus an authored curved SVG arrow to the ring at 9 o'clock |
   | Mirror gems | y 540–596, 4 × 56px, gap 24px, x 64–360 | labels 13px sheet at y 604–622 (2 lines max, 76px wide) |
   | Action row | y 652–700 | pollen primary gem "Every turn at once" (48px tall) · sheet-outline "Shake" · "Exposures" toggle |
   | Display switch | y 724–756 | "Pixels" plus 3 beads `1-bit · 16 · Millions` |
   | Chamber tray | y 780–820, x 64–480 | "In the chamber" label, 40px chips, 1-bit scars |
   | Skip link | y 848 | "Or skip to the five 4D.OS worlds" plus SVG down-arrow, links to `#worlds` |

3. **Sow** (pollen).
   - Slab "The one angle / no mirror can make." (88px, 2 authored lines; the column is sized to the slab).
   - Left: the 640² seed-head view. Right: a 440px column with dial, readouts, named states, "Hold to sow", "Sow 100", "Clear", "Press this head", "Put in the Scope".
   - Herbarium strip along the bottom; peephole at top-right.
4. **Rosette lathe** (glaucous).
   - Slab "A rosette is a / staircase, squashed."
   - Controls on the left and the 720×640 view on the right (mirrored against Sow for rhythm); peephole.
5. **Hive frame** (honey).
   - Slab "Honeycomb keeps / every generation."
   - The frame in a propolis wood border, the stack beneath, and a gem row underneath.
6. **Load another wheel** (petal, `id="worlds"`): launcher row, world rack, lab rack, section line.
7. **Footer** (ink field, sheet text, mirror-symmetric).
   - Build stamp: "Bloomscope · demo build 0.1".
   - The honesty paragraph, font credits, and "Made by crewtives" → `https://crewtives.com`.

Page rules: no eyebrows, no section numbers, no card grids. Every section has 160px of space above its slab and 48px below it.

## 12. Motion grammar
- **Physics owns the toys.** Toy motion comes from simulation (bodies, ring inertia, seed re-layout, drop descent), not tweens.
- **One authored moment per section: the bloom.** On first scroll-in, each specimen assembles in birth order: seeds at 4 ms each, leaves at 18 ms each, comb rings at 60 ms each.
  - Each element scales 0 → 1 over 600 ms with `cubic-bezier(0.16,1,0.3,1)`, alongside a one-time RetroDisplay `reveal`.
  - Content (text and controls) is visible by default and never animates in.
- **UI.**
  - Press: scale 0.94 on a spring (stiffness 520, damping 26, ~140 ms).
  - Gem selection moves the facet highlight across the glass (220 ms).
  - State changes: 420 ms expo-out.
  - Gem depth: `box-shadow: 0 3px 6px rgb(27 15 46 / .35)` plus an inset 1px sheet highlight. That is a real offset shadow, not a block shadow.
- **Scroll.**
  - Lenis (lerp 0.1), with no pinning.
  - While the hero leaves (IntersectionObserver ratio 1 → 0), up to 240° of barrel rotation is added.
  - Wheel and touch over the eyepiece still scroll the page.
- **Safety.**
  - No full-field flashes; caps are rate-limited to 3/s.
  - All loops stop when a view is offscreen or `document.hidden`.
  - The Engine idles at zero frames when nothing moves.

## 13. Sound (off by default)
- The nav gem reads "Sound: off" / "Sound: on" and is `aria-pressed`.
- One `AudioContext`, created on the first toggle. Master gain −18 dB into a `DynamicsCompressor`; everything is suspended when the tab is hidden.
- The voices are specified in §9: bead clacks, the 1.8 kHz detent tick, Sow's pentatonic plucks, the golden bell (sines at 1318 and 2637 Hz, 600 ms decay), the lathe's FM marimba per leaf, the drip (a sine sweeping 1.4 → 0.5 kHz over 90 ms), and the hive's tock (noise band-passed at 900 Hz, Q 4, 40 ms).
- No audio files.

## 14. Responsive
**390×844 (16px gutters):**
- Nav is 56px: wordmark plus a `Sound` gem; section links move to a row under the hero.
- H1 is Bagel 56px, 2 lines, at y 76–180.
- The eyepiece ring's outer diameter is 358px (18px ring), centred x = 195, spanning y 196–554, pixelScale 2.
- Mirror gems: four 52px targets with 16px gaps, centred at y 574.
- "Every turn at once" is full width, 48px tall, at y 660. The sub, chamber tray (scrolling horizontally inside itself) and skip link follow.
- Toys stack with the view first and controls below. Named-state steppers are the primary controls; sliders sit on a secondary row.
- Peepholes are 120px.
- The index becomes: the launcher wheel at full width (358px), then a 2-column rack of 164px wheels (A–E, with E centred alone), then 3 lab wheels at 100px.
- "Use tilt" is an opt-in gem (DeviceOrientation with the iOS permission prompt) that sets chamber gravity.
- Tap targets are ≥ 44px, and there is no horizontal page scroll.

**Other widths:**
- **1024–1279:** eyepiece 600px, left column 420px.
- **700–1023:** eyepiece on top at 88vw, column below.

**Budgets by device:**

| | Phone | Desktop |
|---|---|---|
| DPR cap | 1.5 | 2 |
| Seeds | 800 | 2,400 |
| Leaves | 55 | 89 |
| Hive grid | 14×10 | 24×16 |
| Stack layers | 12 | 32 |
| Beads | 10 | 18 |

## 15. Reduced motion + no-WebGL2 fallback

**`prefers-reduced-motion`:**
- Motion removed:
  - no load drop and no pre-spin: the Scope renders one settled composition;
  - no ring inertia (1:1 turn);
  - Shake re-settles and renders the final still;
  - "Every turn at once" computes the 3 s simulation off-screen and shows the finished HOLD plate at once;
  - no bloom, no reveal, no iris, no Lenis, no scroll-linked rotation;
  - static lab stipple;
  - Sow never auto-sows ("Sow 100" is there); Hive advances only on Step, or on Run when explicitly pressed.
- Every toy stays fully usable.

**No WebGL2:**
- A line reads: "Your browser has no WebGL2, so the toys run in flat 2D."
- The Scope becomes a Canvas2D kaleidoscope: a wedge `clip()` plus rotate/`scale(-1,1)` copies. It is still turnable, with the same physics.
- Sow works fully, since it is 2D by nature.
- Lathe shows a top view with Stretch time off.
- Hive keeps the 2D grid and draws the last 6 generations as offset outlines.
- Fields, type, gems and the index are unchanged, so the fallback is still the vivid page.

**No JS:** a `<noscript>` block keeps the fields, headlines and the full index of links.

## 16. Performance
**JS, gzip, ~235 KB (budget 350):**

| Item | Size |
|---|---|
| three r186, tree-shaken | ~150 KB |
| GSAP core, for the chip flight and ring settle only (no ScrollTrigger) | ~27 KB |
| Lenis | ~5 KB |
| Engine + RetroDisplay | ~8 KB |
| App | ~45 KB |

**First load ≈ 0.25 MB:** fonts 205.7 KB plus HTML/CSS ~30 KB. The Vogel print is drawn at boot into a 512² canvas.

**Lazy:** five wheel WebPs, ~300 KB, loaded when the index is within 800px. Total stays well under 2 MB.

**GPU:**
- One Engine canvas, 4 main views plus 3 peepholes. Peepholes share the Scope's cell RT and only re-fold, so a peephole costs one quad.
- Triangle counts: Sow ≈ 29k; Lathe < 4k; Hive ≤ 12k instances ≈ 150k tris worst case.
- Frame budget is measured with `Engine.stats`: counts drop if a view exceeds 8 ms.

**Target:** 60 fps at 1440×900 on Apple silicon.

## 17. Key copy (English)

**Page:**
- **Title tag:** "Bloomscope — crewtives playground"
- **Meta description:** "A kaleidoscope loaded with flowers, succulents and honeycomb grown from equations in your browser, three growing toys, and the five worlds of 4D.OS."

**The Scope:**
- **Hero slab:** "Turn the garden."
- **Hero sub:** "A kaleidoscope loaded with flowers, succulents and honeycomb, each grown from an equation in your browser. Drag the brass ring to turn it; flick it to tumble what's inside."
- **Hero controls:** "Drag the brass ring" · mirror gems "Lily · threes", "Rose · fives", "Comb", "Comb and star" · "Every turn at once" · "Shake" · "Exposures" · "Pixels: 1-bit / 16 / Millions" · "What the mirrors see" · "Or skip to the five 4D.OS worlds"
- **Chamber:** "In the chamber" · "Empty. Put something in from the bench below." · "Chamber full, take one out" · "Copy link to this garden" · "Link copied. Anyone who opens it gets this exact garden." · "Couldn't copy. Here's the link:"

**Sow:**
- **Slab:** "The one angle no mirror can make."
- **Sub:** "137.508°. Hold to sow. Every seed stays where it was born, so the head is a picture of its own past. Nudge the dial off the golden angle and watch it break."
- **Buttons and readouts:** "Hold to sow" · "Sow 100" · "Clear" · "Press this head" · "Put in the Scope" · "Scrub births" · "divergence 137.508°" · "visible spirals about 34 · 55 (estimated)" · "GOLDEN" · "FORWARD / REWIND / HOLD"
- **Sound caption:** "With sound on, each seed plays a note set by its angle. That mapping is ours, not the sunflower's."

**Lathe:**
- **Slab:** "A rosette is a staircase, squashed."
- **Sub:** "Grow an echeveria leaf by leaf, or an aloe that spirals either way. Then pull time out of it and watch it unwind."
- **Controls:** "Stretch time: Rosette / Half / Staircase" · "Drop water"

**Hive:**
- **Slab:** "Honeycomb keeps every generation."
- **Sub:** "Paint cells, press Run. This hexagonal cousin of Life (rule B2/S34) keeps each generation as a layer of wax. Cells that last six generations get capped."
- **Buttons:** "Run" · "Step" · "Rewind" · "Clear" · "Random (seed NNNN)" · "generation 42"

**Index:**
- **Slab:** "Load another wheel."
- **Launcher:** "4D.OS" · "The desktop that holds all five worlds." · "Enter 4D.OS"
- **Lab slot:** "Empty cell · a sketch in the lab, not public yet"

**Footer:** "Bloomscope · demo build 0.1. Everything here is computed in your browser from equations: no photographs, no downloaded 3D models. Spiral counts are estimates. Toys reset when you reload; copy the link to keep a garden. Type: Bagel Fat One and Recursive, under the SIL Open Font License."

**Fallback:** "Your browser has no WebGL2, so the toys run in flat 2D."

## 18. Honest risks
- **Least-resonant roll.** A kaleidoscope is one step from "nature" and could read as a psychedelic screensaver.
  - Mitigations: the raw-cell inset, mirror names tied to real flowers, no idle rotation, and the golden-angle punchline right below.
- **Overlap with D.** D owns the φ *spiral path*; Bloomscope uses the golden *angle* as divergence. There is no spiral-overlay graphic anywhere.
- **Fold plus dither shimmer while turning.** Dither happens after the fold, in screen space, at pixelScale 2. Verify at 1440 and 390.
- **Touch conflicts.** The ring is `touch-action: none` and the disc is `pan-y`. Needs a real-phone test.
- **Missing A/B/C stills.** Emblems are labelled until the capture script runs. Every derived WebP (including D/E) needs provenance, or the FINISH line is not met.
- **Candy overload.** Five drenched fields plus gems. Hard edges, one ink, one ruby NOW and 160px quiet above each slab keep it a system.
- **Build config.** A new `vite.playground.config.ts` (base `/`, inputs `playground/landings/*/index.html`, outDir `dist/landings`) plus a Worker route. The `/` 302 stays until a pick.
- **Scope of work.** Build order: Scope + index first, then Sow, then Lathe and Hive.

## 19. File plan
```
playground/landings/bloomscope/index.html     # semantic page, noscript index; no contract text
src/playground/bloomscope/
  main.ts            # WebGL2 detect → views | fallback2d; Lenis; IO; #g= state
  tokens.css         # fields, --pal-16-0..15, per-section --pal-1bit-*, type, easings
  style.css          # fields, slabs, gems, ring, rack, focus/selection/scrollbar/caret
  fonts/ bagel-fat-one-latin-400-normal.woff2, recursive-latin-casl-normal.woff2,
         recursive-latin-mono-normal.woff2, OFL-BagelFatOne.txt, OFL-Recursive.txt
  flat.ts            # flat instanced material (dFdx normals, palette index per instance)
  specimens/ phyllotaxis.ts rosette.ts comb.ts beads.ts
  scope/ ScopeView.ts fold.frag.glsl cellPhysics.ts ring.ts peephole.ts
  sow/ SowView.ts dial.ts herbarium.ts
  lathe/ LatheView.ts drop.ts
  hive/ HiveView.ts hexLife.ts stack.ts
  chamber.ts  gems.ts  sound.ts  wheels.ts  icons.ts  fallback2d.ts  stateCodec.ts
  bloomscope.test.ts # Vogel, convergents, fold lands in fundamental domain, B2/S34 step,
                     # hive seed search, #g= round-trip, palette contrast ≥ targets
public/landings/bloomscope/wheels/{a..e}.webp + provenance.json
scripts/capture-stills.cjs
vite.playground.config.ts
```
It reuses `Engine`, `RetroDisplay`/`palette.ts`, `DISPLAY_MODES`, the lifeStack time-stack idea, `tesseract.ts` (launcher glyph) and `smoothScroll`. No 4D pack is loaded.

## 20. Memory test
"A cobalt page with a huge kaleidoscope full of chunky pixel flowers and succulents, turned by a brass ring. I flicked it and everything tumbled, leaving trails that the mirrors turned into a flower. Then I dragged a dial off 137.5° and the sunflower shattered into spokes and clicked back. I grew a succulent into a spiral staircase and dropped it into the kaleidoscope. The demos were kaleidoscope wheels on a pink rack."
