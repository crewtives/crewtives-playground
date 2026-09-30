---
version: 1
slug: "c-index-html"
primary_target: "sites/4d-os/c/index.html"
related_targets: []
---

# Surface brief — world C "Leader" (`sites/4d-os/c/index.html`)

**Scope and mode:** the full page of world C (4D.OS desktop + story page). *Experience* mode. Shared engine; behavior follows the specs of the change `add-4d-os-local-demo`.

**Audience and task:** the same as in A. Proof: time as a physical strip you can grab.

**Constraints:** the same as in A. No commercial film brand: the edge codes are original.

**Memorable moment:** grabbing the strip and pulling it through the gate; in rewind, the light leak floods the edge.

## Direction contract

THESIS: The reconstruction is a strip of 16 mm film running through the projector gate. The timeline is the strip itself, with perforations, edge codes and frame numbers in grease pencil, and the scene is what the projector throws. It refuses the dark sci-fi HUD and the product landing page.

OWN-WORLD:
- **A committed emulsion-gray ground** (≈50%).
- **Title bars:** black film-leader bands, with original stamped edge codes (`4DOS 0923 E7`).
- **Frame numbers:** in orange grease pencil.
- **Sepia chemistry stains:** sparse, always tied to specific frames. They are not a filter.
- **Light-leak orange:** reserved for rewind and for the edge of the active frame. It is the translation of the fixed amber. The fixed forward cyan comes in as a cross-processed cyan.
- **16-color palette:** night color film with uneven chemistry (teal shadows, distant brick shifted toward olive, magenta-brown shadows, emulsion grays, sodium highlights in the hot leak, leak orange, cyan).
- **Grain:** it is the dithering itself. Scratches and dust are deterministic per frame.

STORY: The visitor sees a projected frame and the strip running below it. They grab the strip to scrub and understand that every frame exists at once, on the strip and in 3D. The chapters are reels ("REEL 01…"), and the footer is the "END" tail leader.

FIRST VIEWPORT:
- Emulsion-gray field.
- On the left, ≈62%: the projected frame (the live scene) with gate corners and perforations on both sides.
- On the right: a vertical rail of edge codes, plus clock, layers and display as leader cards.
- At the bottom, a full-width horizontal strip (≈18vh) with the atlas's source frames, perforations, codes and numbers. A fixed gate at the center marks the NOW, and the strip slides under it during playback, with the timecode above.
- Primary action: grab the strip.
- Phones (up to 820 px wide, or landscape up to 500 px tall): the slate, the gate, the strip and then the **window dock** (spec desktop-shell "Narrow viewport"; design adapt-for-phones D9): four black leader bands (Layers, Stock, Camera, Clock) in the dot-matrix edge type, 44 px tall; the open band carries the leak's orange edge and its card hangs from it, with the card's edge code moved to a leader band at its bottom edge. Layers is open on arrival. The gate is half the screen, less on short phones (`min(50svh, 117svh − 566px)`), so that a short scroll shows any card whole with at least 85 % of the gate. In landscape the slate, the dock and its card take the left column and the gate and the strip the right one, the strip's head standing beside the film, so gate and strip fit one screen and no card covers the gate. Touch targets are 44 px (the strip's key, the ruler, the options, the link back's box below its tab).

Signature interaction: pulling the strip through the gate, with inertia; in rewind, the edge floods with orange.

Elevation: from the isometric pixel-art challenger, a single pixel grid and integer scales.

FORM: hand-processed 16 mm film strip. A challenger from the catalog `cinema-cinematography-editing-hand-processed-film-bloom`, with a competitive verdict on product clarity; built as world C so that three directions of the same mechanism could be compared. Seed `85a92f5b`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Whether the strip uses real inertia or per-frame steps under reduced motion: steps by default.
