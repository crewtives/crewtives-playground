---
version: 1
slug: "playground-bloomscope-index-html"
primary_target: "sites/playground/bloomscope/index.html"
related_targets: []
---

# Surface brief — landing Bloomscope (`sites/playground/bloomscope/index.html`)

**Scope and mode:** a work in the collection of the playground museum (sheet 004), route `/bloomscope/`; it began as a candidate landing at `/landings/bloomscope/` (change `add-playground-landings`) and moved with `add-playground-museum`. *Experience* mode, *code-led* build: the work rules from the first screen. It meets the specs `landing-bloomscope`, `playground-hub` and `dither-display` of the change `add-playground-landings`. It uses the shared engine (`Engine`, `RetroDisplay` with an ellipse mask, `setupSmoothScroll({ resetToTop: false })`) and `src/playground/shared/**` (index, sound, motion, WebGL2 probe, display registry).

**Audience:** creative coders and spatial-computing people, on a laptop or a phone, curious and impatient. They know phyllotaxis from Processing sketches and the kaleidoscope from childhood.

**Task:** within seconds, turn something beautiful by hand and understand that mirrors make the threes, the fives and the hexagons of flowers and honeycombs; then find the angle no mirror makes, grow a specimen, drop it into the chamber and leave for the five 4D.OS worlds through the index (the second section, always open).

**Proof:** everything is computed in the browser from equations (Vogel, rosettes, honeycomb, mirror folding); figures are computed or labeled as estimates; real stills of the five worlds, labeled "synthetic scene", with the cat's CC-BY credit on A, B and C.

**Constraints:**
- visible text in English; title "Bloomscope · crewtives playground";
- no cobalt as a section field; no `backdrop-filter` or blur; gems as flat SVG facets;
- Ultra (display, ≤ 96 px) and Recursive (CASL 0 for body, CASL 1 for labels only, MONO for readouts), self-hosted; Ultra is Apache-2.0, Recursive OFL-1.1, and the footer says so;
- none of the glyphs `≈ → ↻ ↺ √ φ` in the text: arrows and turns are original SVG;
- sound off by default; reduced motion honored live (a pre-exposed HOLD plate); without WebGL2, 2D fallbacks;
- nothing of the contract reaches the HTML, comments, `data-*` or the bundles.

**Memorable moment:** you flick the brass ring, the barrel keeps spinning on its own, slows down, clicks into its detent, and everything in the chamber tumbles and leaves 12 dotted exposures that the mirrors turn into a flower of trajectories.

**How the direction was chosen:** impeccable's *new-work* process ran as a draft (two designers, a judge and a critic of the set, recorded in `openspec/changes/archive/2026-09-25-add-playground-landings/directions/`), and the build follows the direction the seed assigned (position 7 of 7 on the ordered list, the kaleidoscope) with the mandatory adjustments of `critique.md` §9 applied, code-led because no image generation was configured.

## Direction contract

THESIS: A kaleidoscope is a machine that makes the symmetries flowers and combs grow on their own. The page *is* the scope, and its punchline is the one symmetry no mirror can make: the golden angle ("Mirrors only close into a pattern at 180°/n; the golden angle is not one of them."). It refuses the near-black glowing-particle sunflower, the cream botanical plate and the psychedelic screensaver.

OWN-WORLD: Backlit colored glass on printed toy-tube paper, high-key daylight.
- Whole sections drenched, hard edges, no crossfades: hero chartreuse `#C8F03C` under a tonal Vogel-dot print `#B2DB2A`; index petal `#FF6FB5`; Sow lilac `#B99CFF`; Lathe glaucous `#8FD6B8`; Hive honey `#F39A1A`; footer plum ink `#1B0F2E`. All text on light fields is plum ink. Sheet is a daylight near-white `#FDFDF6`.
- Cobalt `#2B3FE0` lives only as a glass color inside the scope palette, never as a field.
- Controls are flat-faceted SVG glass gems (3–4 flat tones, 2 px ink keyline, real offset shadow); the turn handle is a knurled honey-brass ring with propolis knurls.
- Headlines are Ultra wood-type slabs (≤ 96 px), body Recursive CASL 0, labels CASL 1, readouts Recursive Mono tabular.
- Every specimen is procedural low poly, dithered live to 16 glass colors by RetroDisplay (dither after the fold, in screen space). One ruby `#E8175D` NOW, always with a 2 px ink keyline.

STORY:
1. The visitor turns the scope and sees that mirrors make threes, fives and hexagons.
2. They load another wheel (the index, section 2) or scroll on to find the one angle mirrors can't make, grow a sunflower, a rosette and a comb, and drop each into the chamber to see it multiplied (peepholes keep the chamber in view).
3. They leave into the five 4D.OS worlds.

FIRST VIEWPORT (1440×900):
- Drenched chartreuse field under a tonal Vogel-dot print (1,200 dots, c = 19 px, centered on the eyepiece, turning at 0.1× the barrel).
- A 720 px live eyepiece centered at (1024, 486), circular via the display mask, inside a 28 px honey-brass ring (outer diameter 776, 72 knurls turning with the barrel, ruby NOW notch fixed at 12 o'clock); Mono readout `D5 · 135° · 3 specimens · 18 beads` on a sheet pill 34 px above the disc's bottom edge; a 96 px "What the mirrors see" raw-cell inset centered at (700, 812).
- Left column, x 64–560: "Turn the / garden." in Ultra 96 px, plum ink, cap top y = 150; sub (Recursive 19/1.45, 400 px measure) y 352–462; "Drag the brass ring" tag with an authored curved arrow to the ring at 9 o'clock; four mirror gems at y 540; the pollen primary gem "Every turn at once" plus "Shake" and "Exposures" at y 652; the display beads `1-bit · 16 · Millions` at y 724; the "In the chamber" tray at y 780; "Or skip to the five 4D.OS worlds" and "Copy link to this garden" at y 848. Sound gem at the nav's right.
- Phone 390×844: nav 56 px (wordmark + Sound gem), H1 56 px at y 76–180, ring outer 358 px centered x = 195 spanning y 196–554, four 52 px mirror gems, full-width "Every turn at once" 48 px, then the skip link to the worlds, all above the fold.
- Primary action: drag or flick the ring. One-press alternative: Every turn at once.

FORM: Kaleidoscope (Brewster's optical toy, 1816), #7 of 7 on the grounded list, seed key 50846703.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

**Signature interaction:** flick the brass ring. The barrel spins free with inertia (ω ← ω·e^(−2.2·dt), release velocity clamped to ±720°/s) and only below 40°/s a detent spring pulls it to the nearest 15°, ticking as it passes each one. Everything in the chamber tumbles under screen-down gravity and leaves 12 dithered exposures (every 50 ms) that the mirrors multiply into a flower of trajectories; when the bodies sleep the plate stays frozen. "Every turn at once" turns the barrel exactly once in 3 s with 24 exposures, then HOLDs.

**Motion grammar:** physics owns the toys (bodies, ring inertia, seed re-layout, drop descent), never tweens. One authored moment per section, the bloom: on first scroll-in the specimen assembles in birth order with one RetroDisplay reveal; text and controls are visible from the start and never animate in. UI press is a spring to scale 0.94; gem selection slides the facet highlight (220 ms); state changes 420 ms expo-out. Load moment: three specimens and the beads drop into the cell over 1.2 s while the barrel pre-spins about 90°; after that no idle rotation, and the Engine idles at zero frames. Reduced motion: a pre-exposed HOLD plate, 1:1 ring, every toy jumps to its result.

**Memory test:** "A chartreuse page with a huge kaleidoscope full of chunky pixel flowers and succulents, turned by a brass ring. I flicked it and everything tumbled, leaving trails that the mirrors turned into a flower. Then I dragged a dial off 137.5° and the sunflower shattered into spokes and clicked back. I grew a succulent into a spiral staircase and dropped it into the kaleidoscope. The demos were kaleidoscope wheels on a pink rack."

## Phones: the pinned stage (change `adapt-for-phones`)

On a phone the bench toys and their controls could not share a screen: with "Stretch time" in reach, none of the rosette was on screen. Sow and the lathe now present their toy as a **pinned stage**, and the whole page keeps its world: no drawer, no sheet, no new chrome.

- **Gates.** Portrait `(max-width: 699px) and (min-height: 521px)` (the inset move's query) and landscape `(max-width: 1023px) and (max-height: 520px) and (orientation: landscape)`; `stage.ts` and `style.css` use the same strings. Touch targets, the dial's finger ring and the hold trio live under `(pointer: coarse)`. None of these match a desktop, and the desktop renders pixel for pixel as before.
- **Portrait.** The section's sub comes first, then the stage: the toy (`--stage-s`, 252 px at 390, 222 at 360, 292 at 430, never more than 46% of `svh`) with its 96 px peephole beside it, full-bleed on the section's own field (lilac or glaucous), closed by a 2 px ink edge, with no fade. It pins at the top (`position: sticky; top: 0`, z-index 2, under the engine canvas at 5 and over the controls at 1) while the controls scroll beneath it, and releases where the controls end (after Pixels, or after the herbarium). The copy moves above the stage with `display: contents` and `order`, so the DOM and the tab order stay as they were. A control that takes focus scrolls clear of the stage (`scroll-margin-top: stage + 32 px`).
- **Landscape.** The stage becomes a sticky left column at screen height (`min(100svh − 24px, 40vw)`), with the hint, copy and controls on the right. In that narrow column the lathe's sliders take one row each, with the Leaves label and count above the track so the Fibonacci ticks stay apart, and the lathe keeps a tail of field after Pixels so the stage stays beside its last control. The honeycomb puts its frame on the left and its controls on the right. Under a stage gate the toy's own view also starts its bloom, because a landscape bench section can be five screens tall and a fifth of it is never on screen at once (before, Sow's seed head never appeared in landscape).
- **The peephole joins the toy.** `stage.ts` moves each peephole into its stage (in the honeycomb, next to its "Put in the Scope") and back when the gate stops matching. "Put in the Scope" sends the chip into that peephole instead of summoning the gem over the controls. The peephole's frame carries the `n/7` count in a readout pill (Recursive Mono 700, 12 px, paper on a 1.5 px ink keyline, like the Scope's readout), clipped below the view's circle. The section's live region says "In the chamber: n of 7" ("Chamber full" at 7). The gem stays tucked while a peephole is on screen, in portrait and in landscape.
- **GOLDEN** moves onto the dial's band at 12 o'clock (16 px), because a stage under the canvas hides whatever overlaps a view.
- **The dial with a finger.** The outer grip becomes a ring at least 44 px thick that stays inside the dial's own box, so it grows inward over the plate's rim at the stage's size. A drag that starts on it (or on the vernier) turns the dial and never scrolls; a swipe that starts on the plate inside it scrolls. The hit strokes are transparent.
- **Held and small controls.** "Hold to sow" takes the hold trio (no touch action, no selection, no callout). The wordmark, the "Worlds" link and the footer links take 44 px, with the seed underline kept under the text. The Leaves tick labels let a touch through to their slider. A gem's drawing leaves the touch to its button's box (in Chromium a touch on the drawing, within 2 px of the pinned stage, went to the stage), and the hidden radios of the beads and species fill their labels in WebKit too.
- **Motion.** Nothing on the stage animates by itself. Sticky is not motion, and the chip flight is already off under reduced motion.

## Open decisions
- Ultra is Apache-2.0, not OFL (the critique took it for OFL). It stays, following the precedent of Permanent Marker in `LICENSES.md` (an equivalent free license), and the footer names each license honestly. Whether the hub spec should be adjusted was left open.
- Launcher line: the Bloomscope spec sets "The desktop that holds all five worlds."; `src/playground/shared/worlds.ts` carries a different line. The spec's line is used.
