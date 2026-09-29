---
version: 1
slug: "b-index-html"
primary_target: "sites/4d-os/b/index.html"
related_targets: []
---

# Surface brief — world B "Plate" (`sites/4d-os/b/index.html`)

**Scope and mode:** the full page of world B (4D.OS desktop + story page). *Experience* mode. Shared engine; behavior follows the specs of the change `add-4d-os-local-demo`. The hero follows the `hero-gesture` spec of the change `add-cosmic-landings-and-organic-motion`.

**Audience and task:** the same as in A. Proof: the whole climb visible as a single exposure.

**Constraints:** the same as in A.

**Memorable moment:** scrolling down and watching the camera pull back from behind the cat to the full plate: the whole climb, walking step by step, in silver cats over the aurora. Then the last segment of the scroll brings the cat to sit at the top.

## Direction contract

THESIS: Every moment of the subject exposed at once, as in Marey's chronophotographs and Duchamp's "Nude Descending a Staircase", but lived from inside: the camera follows the subject in third person. The reconstruction is measured against Muybridge's numbered grid. The OS is the panel of the photographic laboratory. It refuses the dark sci-fi HUD and the product landing page.

OWN-WORLD: **A charcoal plate opening onto an aurora, with the color set of an archival collage** (set on 2026-09-23 without the golden suede; extended on 2026-09-24 with an aurora gradient and pixel art with more colors):
- **Plate:** charcoal (#1d211f) behind the cards; in the glass, a dithered aurora sky (teal, violet and plum curtains) that moves with the pack's NOW and turns with the camera.
- **16-color palette:** a chromatic ramp, not grays:
  - charcoal → teal → sage;
  - violet → aubergine → plum;
  - a peach for the streetlight;
  - a neon pink lighter than the magenta;
  - the present in aurora green (#5fe3c8) going forward and magenta (#d65ca5) in rewind.

  Past exposures are silver (#cfd9d6) and future ones sage.
- **Spotlight:** the frustum light of the source camera lights the alley; outside it only a few dimmed points remain.
- **Muybridge grid:** thin lines with stenciled numbers, in the lower half of the glass.
- **Windows:** sage mounting cards (#a5b4b1), charcoal-ink title bars, letterpress captions ("ANIMAL LOCOMOTION. PLATE 4D-002."). The "synthetic" tag is magenta with ink.
- **Source frames:** silver prints toned to sage outside Millions.
- **HOLD:** inverts the screen for an instant (an elevation from the black-and-white data-art challenger). Only when the visitor asks for HOLD. The gesture's HOLD (the scroll pauses and the end of the segment, marked with `html[data-hold-origin="gesture"]`) never inverts.

STORY: The visitor follows the cat from behind, in third person, as it walks up a flight of steps in the alley. The staircase of silver cats reads as the stacked glider of Plate I. They can drag to orbit the cat through 360°; on release, the angle returns behind the cat on its own and the chosen distance is kept. At the very top the climb loops, and the seam is hidden by a dither dissolve. Scrolling down, the desktop stays fixed while the camera opens up to the full plate. In the final segment the scroll carries time to the last frame (the cat sitting). Only then do the plates follow ("Plates I–VI"). The sequence sheet shows the frames like Muybridge's 12-frame plates.

FIRST VIEWPORT:
- Full-bleed glass with the scene in third person, from behind and on a diagonal. `all` mode: silver behind, the present in aurora green, and sage ahead, climbing.
- Top left, a caption in large grotesque capitals: "PLATE 4D-002 / CAT, ASCENDING STAIRS." Scene: a black cat climbing ten steps in an alley at night (recipe `cat-stairs`, 30 fps).
- The numbered grid in the lower half.
- At the bottom, a sequence-sheet band: 12 source frames with the current one framed; a click jumps to that frame. The timeline goes below it.
- Right column: Camera, Exposures, Layers, Monitor and Clock.
- Under the caption's note: the HOLD, − and + controls and a hint for each phase ("Scroll to open the plate", "to the last exposure", "on to the plates"). Pinching (touch or trackpad) also zooms in and out.
- "Plate 4D-002" dialog: top right, in the sky, from 1200 px up; hidden on short desktops and on mobile.
- Mobile: the fixed stage holds the caption and the plate; the windows stack below the hero. On a phone in landscape the caption goes in a column, with the plate on the right.
- Primary action: drag the scene and scroll down.

Signature interaction: the scroll opens the camera from the cat to the full plate, and the last segment carries the climb to its last frame. Dragging orbits the cat and the angle returns on its own.

Elevations: from the black-and-white data-art challenger (competitive), full commitment to inversion as a state; from the isometric pixel-art challenger, a single pixel grid and integer scales (an integer dot size in display pixels).

FORM: chronophotographic plate (Marey/Muybridge), position 1 of 7 on the ordered list (impeccable's own pick); seed `85a92f5b`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Nothing for now. Plate III is "From the side." (a side elevation with its own clock). Since the new walk it carries one exposure per second, so that each cat reads on its own.
