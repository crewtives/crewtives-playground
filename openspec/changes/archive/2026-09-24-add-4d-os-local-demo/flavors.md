# Worlds (annex to the change)

Decided on 2026-09-23: the work runs through to the end without stopping for sign-off, and it delivers **three different options, three different worlds**. That is why block 6 did not stop to choose a single direction: three worlds are built on the same core, the same pack and the same specs.

## How they were chosen

The `/impeccable` direction roll was used in *Experience* mode, with seed `85a92f5b`. The reference grammar and the HUD of the 4D video were fixed by the brief. Own list, ranked by resonance:

1. Marey chronophotographic plate / Muybridge sequence sheet.
2. Mac System 1 / Lisa 1-bit desktop (a literal reading of the brief).
3. Video editing suite / VTR (timecode, J/K/L).
4. Contact sheet with grease pencil.
5. Oscilloscope with phosphor persistence.
6. **Museum exhibition: display case, labels, room plan** ← assigned by the roll.
7. Technical drawing with a time section and a title block.

Verdicts on the catalog's challengers:

| Challenger | Verdict | What it contributes |
|---|---|---|
| Bombay painted poster | declined | A: "size is the poster" (the display case dominates) |
| eBoy pixorama | competitive (audience) | all: a single hard-pixel grid, integer scales |
| Forge | declined | A: state measured in tabular numerals |
| Hand-processed 16 mm film | competitive (product clarity) | **built as world C** |
| Ikeda datamatics | competitive (audience) | B: total black and white in 1-bit; inversion as the HOLD state |
| Collider display | declined (falls into the dark-viewer-with-neon cliché) | the idea of isolating one moment and dimming the rest (`pickFrame`, optional) |

## The three worlds

| | A "Vitrine" | B "Plate" | C "Leader" |
|---|---|---|---|
| Origin | assigned by the roll (#6) | impeccable's pick (#1) | competitive challenger |
| World | red museum room; display case and labels | silver plate; Muybridge grid; mounting cards | 16 mm strip; gate; edge codes |
| Color | committed oxblood wall; night alley palette | charcoal plate; 14 sage grays + teal/magenta (set as a requirement) | committed emulsion gray; night cross-processing |
| Typography | Host Grotesk + Departure Mono | Bricolage Grotesque + Geist Pixel | Big Shoulders Stencil + Doto + Permanent Marker |
| Signature | the rail slides the frustum light | the "exposures" dial re-exposes the plate | pulling the strip through the gate |
| Built by | apply work stream | exploration work stream | exploration work stream |

The full contracts are in `.impeccable/surfaces/{a,b,c}-index-html.md`, and the tokens in `src/flavors/{a,b,c}/tokens.css`.

## Font licenses

All of them are self-hosted in `src/flavors/*/fonts/`, with their license next to them:
- **OFL-1.1:** Host Grotesk, Departure Mono, Bricolage Grotesque, Geist Pixel, Big Shoulders Stencil and Doto.
- **Apache-2.0:** Permanent Marker.

## Split of files between the two work streams

- **Apply work stream:** core (`src/core/**` except what is listed below), bake, debug, world A, `package.json`, `vite.config.ts` and `tasks.md`.
- **Exploration work stream:**
  - `PRODUCT.md`, `.impeccable/**`, this file;
  - `src/flavors/*/tokens.css`;
  - worlds B and C;
  - shared shell modules, if the proposal is accepted: `src/core/shell/**`, `src/core/views/{tesseract,lifeStack}.ts`.

## Final state (2026-09-23)

All three worlds passed `impeccable-finish-reviewer` with a final disposition of **ship**, on recaptured evidence:

| World | Reviewer's path | Evidence |
|---|---|---|
| A "Vitrine" | fix (8) → ship | `.impeccable/review/a-desktop.png`, `a-mobile.png` (stitched) |
| B "Plate" | fix (8) → 7 resolved + 1 partial → ship | `b-desktop-00..09`, `b-mobile-00..10`, `b-desktop-stride-3/60`, `b-desktop-hold-invert` |
| C "Leader" | recapture → fix (8) → 5 + 3 → ship | `c-desktop-00..09`, `c-mobile-00..11`, `c-desktop-rewind`, `c-desktop-pull`, `c-desktop-stain` |

Corrections that changed the design relative to the initial contracts:
- **B:**
  - the plate is exposed at 1/s with the background sunk (0.08) to show separate poses in the manner of Marey;
  - ink title bars over the card (buff until the palette change; now sage);
  - Geist Pixel only for numeric readouts;
  - Plate IV is a register with dot leaders;
  - HOLD inverts the plate for ~90 ms.
- **C:**
  - the orange grease pencil goes only over black, and orange is reserved for rewind;
  - deterministic per-frame scratches and stains, generated on the 3 px grid;
  - light leak as a burned-in dithered texture;
  - Reel 2 is a three-frame strip.

Launcher `/`: the same scene, at the same instant, in the three palettes; each window resolves its tokens with `[data-flavor]`.

## Change to the cat and to B's palette (2026-09-23)

Decided after the "ship":
- B without the golden buff, with the sage / teal / charcoal / magenta color set;
- the deer is replaced throughout the piece by a black cat in an alley at night.

The `cat-alley` recipe and world A were done by the apply work stream (block 10 tasks). The exploration work stream did the rest:
- **Pack:** B, C and the launcher load `/packs/cat-alley/`.
- **Dollhouse cutaway** (`setCutaway`):
  - B: on the plate and in the pipeline view;
  - C: in the projector, "Develop", "Project" and the scroll reel;
  - launcher: in the three thumbnails.
- **Palettes:**
  - A: `--pal-16` and roles recalibrated for brick, asphalt, sodium, moon and the cat. The sodium stays paler than REWIND's amber so that the windows do not read as rewind.
  - C: night shadows shifted toward teal, distant brick toward olive, and sodium highlights in the warm leak.
  - B: the palette set as a requirement.
- **Framing:**
  - The cat is small for its path, so the "one frame" view in B and C is a still close-up of frame 150 with the source camera (`src/core/shell/closeUp.ts`).
  - C's "Project" shows the whole journey with its own clock in `all` mode.
  - The launcher thumbnails crop the ends of the journey.

**Review of B after the change.** `impeccable-finish-reviewer` returned fix (4 code fixes plus DESIGN.md). Resolved:
- Plate III with 1 exposure/s and the cutaway, instead of a continuous sweep.
- "synthetic" tag in ink on magenta: 4.6:1 (`--tag-ink`), with B's magenta lightened slightly to #d65ca5. The current frame's border on the sequence sheet has an ink outline and an inner ring in the present's color.
- Source frames (sequence sheet, Camera 1 and Plate II) toned to sage silver outside Millions, with `background-blend-mode: luminosity` over `--mount`.
- Plate background at 0.04, like Marey's black plate. The clouds that remain are subject frames with depth noise, not background.
- DESIGN.md regenerated by the documenter.

## New hero for B and the staircase (2026-09-24)

Decided on 2026-09-24: B's layout stays, and it gains A's animation and light, an aurora gradient, a third-person camera from behind and pinned scroll. The scene becomes a flight of stairs. All of this goes into B only; A and C stay as a comparison. The decision is in `design.md` → D12.
- **Pack:** `cat-stairs` (30 fps, 420 frames), baked by the apply work stream. The three worlds and the launcher load it.
- **B:**
  - chase camera (`src/core/shell/chaseCam.ts`) with a cutaway that follows the subject and a near fade (new viewer API);
  - frustum light with an almost clean background;
  - 16-color aurora palette and aurora sky (`src/flavors/b/aurora.ts`);
  - display chroma and exposure raised;
  - 320svh pinned hero;
  - HOLD as `filter: invert(1)` on the root;
  - caption "PLATE 4D-002 / CAT, ASCENDING STAIRS.".
- **A and C:** their palettes gain a magenta for the neon and a teal for the windows, so that they do not fall into the present's colors.

