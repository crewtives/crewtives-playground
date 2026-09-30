---
version: 1
slug: "playground-index-html"
primary_target: "sites/playground/index.html"
related_targets: []
---

# Surface brief — the playground museum (`sites/playground/index.html`)

**Scope and mode:** the root of `playground.crewtives.com`, one level above the works: a museum that wraps the collection of experiments. *Experience* mode, *code-led* build (no image generation: the ambition lives in this contract). It meets the specs `playground-museum`, `work-loops`, `playground-hub` (MODIFIED) and `landing-bloomscope` of the change `add-playground-museum`. It uses the shared engine (`TimeController`, and `Engine` and `RetroDisplay` only in the fold, `smoothScroll` with `resetToTop: false`) and `src/playground/shared/**` (sound, motion, WebGL2 probe, `worlds.ts`).

**Audience:** creative coders, spatial-computing and design people, on a laptop or a phone. They arrive from crewtives.com or a shared link; they want to see what is there and enter a work within seconds.

**Task:** understand that this is a collection of live works, see each one move in its recorded loop, read its sheet (where and when) and enter the work. Come back from the work to its sheet.

**Proof:** every figure, date and stroke about a work comes from the work itself or from the collection's curation (pack, code, curated dates, loop provenance); the loops are the display's native buffer, verified pixel by pixel and with published provenance; scenes labeled "synthetic"; the cat's CC-BY credit next to every image of the cat.

**Constraints:**
- visible text in English; tab title "crewtives playground · a museum of live graphics experiments"; the only `h1` is the collection's title, "crewtives playground";
- a luminous house (option "b" of the exploration): a light sheet, ink, a visible grid; the gradients of crewtives.com only as a wash of light, never under body text;
- OFL or equivalent typefaces, the museum's own (none of the 23 families already in use, nor their siblings); missing arrows and signs drawn in SVG;
- nothing moves with time except what the page clock governs; reduced motion honored live; without WebGL2 and without JavaScript the museum stays complete as a document;
- initial JS ≤ 100 KB gzip, no 3D code until the first fold;
- nothing of this contract reaches the HTML, comments, `data-*`, accessible text or the bundles.

**Memorable moment:** you drag the clock's scrubber and the whole collection runs back at once: the cat walks down the stairs in the three windows, the falcon climbs back up its spiral, the whale moves away from the horizon, Sow's flower head comes apart, and in every épure the same amber dot moves down the elevation while the reference line follows it on the plan.

**How the direction was chosen:** impeccable's *new-work* process on 2026-09-25 (a panel with reference checking, three directions, a judge and an adversarial critic), where `concept-seed --scope direction --mode experience` assigned candidate 6 of 7 (La épura), confirmed on the decision page and built code-led; the follow-up decisions (the 004 trail is Sow sowing, the elevation is time in every épure, sheet 000 is mandatory in its static version, the gate-row text) are recorded in `openspec/changes/archive/2026-09-28-add-playground-museum/design.md` › Context.

## Direction contract

THESIS: A museum where every work is a sheet of Monge's descriptive geometry: the VISTA shows the work alive, and its épure draws all of its moments at once, plan below saying where, elevation above saying when, joined by the ground line and crossed by a single NOW. The common invariant is the "general symmetry" of the collection: every épure has the same axes ("plan: where · elevation: when"), so time becomes an axis, the engine's motto made literal (Van Doesburg, 1924: "height, breadth, and depth plus time"). It refuses the portfolio grid of cards with thumbnails, the dark gallery with glowing screens, and the white-cube hero with one big video.

OWN-WORLD: A daylight drafting room, Bauhaus-plain.
- Sheet `#F5F4EF`, ink `#16181D`, graphite `#3B404C`; nothing else carries text.
- The modular grid (M = 30 px) is always visible: zone ticks every M along each sheet's border fillet and the page margins, like a drawing border; press G (or "Grid") for the full grid with the column ratio labeled "13 : 8".
- Light is a wash, never a field: lavender morning wash `#BEBEE8`/`#DCDDF6` anchored at the top edge, apricot afternoon `#F0A585`/`#F8DCCD` at the bottom, alpha driven only by scroll.
- Each work brings its own color in its passe-partout (Whale fall's void, the gallery's ox-blood wall, the plate's black, Sow's paper); the house never tints a work.
- Épures are ink linework: dashed full trail, solid loop span, NOW as a filled dot (cyan `#1BBFD3` forward, amber `#EFA23B` rewind) with a 2 px ink ring, thin reference line, two short ticks under the ground line.
- The title block is the museum label: ruled boxes, the three-digit sheet number as data, four fields visible, the rest in a native disclosure.
- Two families only: a grotesque for titles and text, a monospace for the title block, readouts and the clock.

STORY:
1. The visitor lands on the most recent acquisition alive in its VISTA with its épure beside it, and sees the clock running.
2. They drag the scrubber and understand that the house governs the time of every work.
3. They open the index of sheets, type a number or scroll the sheets.
4. They read a title block, fold an épure to see it become space, and enter a work through "Enter <title>". From the work, "Playground · Sheet NNN" brings them back to that sheet.

FIRST VIEWPORT:
- 1440×900. Page margins 2M (60 px); content 44M wide.
- Top bar y 0–60, hairline under it: the h1 "crewtives playground" left; the page clock centered (REWIND · HOLD · FORWARD as mono text buttons with the active one filled, the scrubber as a ruled 45-tick line, and the line "Loops recorded from the live render; the works run live." under it); right: "Index of sheets", "Sound off" and "crewtives.com".
- Featured sheet 004 below, framed by its border fillet with zone ticks. VISTA column x 60–840 (26M): the Sow loop square in its paper passe-partout, the largest region of the screen. Épure column x 900–1380 (16M): elevation y 90–390, ground line at y 390, plan y 390–690, legend "plan: where · elevation: when"; the title block y 720–870 under the épure, with "Enter Bloomscope" as the primary action in its last box.
- Lavender wash visible across the top third.
- 390×844. Top bar 75 px at load, in two rows: the h1, then "Index", "Grid", "Sound off" and "crewtives.com". Once the page scrolls past the title, the title row goes with it and only the navigation row stays, 45 px. The VISTA fills the width inside 16 px gutters (square slot) and is the largest region; the tools row, the épure and the title block follow below. The clock is a fixed bottom bar, 79 px plus the bottom safe area: the loops line in two lines of small type above the three states and a 151 px scrubber (121 px at 360, 81 px at 320). On a touch screen every control answers over 44 × 44 px and keeps its drawn size, and each épure's ground line carries a 14 px square ink grip at its right end: the fold's drag starts there, and a swipe anywhere else on the épure scrolls the page.
- 844×390 (a phone in landscape, up to 500 px tall). The bar scrolls with the page in one 45 px row; the clock is docked at the bottom in one 47 px row (the states, a 361 px scrubber, the loops line in two lines at the right). Each single-VISTA sheet reads as on the desktop: the VISTA fitted to the height (the featured loop at 221 px, k = 3) beside its épure, with the NOW of the elevation on screen; sheet 001's three VISTAS sit side by side, the épure and the title block below.

SIGNATURE INTERACTION: The page clock's scrubber. Dragging it moves every loop on screen and every NOW (VISTA frame, elevation dot, plan dot, reference line, fold dot) together, in the same painted frame; release leaves the clock in HOLD at that frame. J, K and L give REWIND, HOLD and FORWARD with no speed steps. Second gesture, the only 3D one: the fold. "Fold", a drag on the ground line (on a touch screen, from its grip), or F turns the vertical plane about the ground line from 0° to 90°, and the épure becomes the dihedral with the trail standing in space, rendered by the same Engine and RetroDisplay as the works.

MOTION GRAMMAR:
- Only the page clock moves the works and the NOWs.
- Light changes only with scroll; the fold moves only on request.
- Nothing moves with time or with the pointer outside the clock.
- Jumps between sheets are short scrolls (instant with reduced motion).
- On a phone, a fold that settles under the clock bar scrolls into view once, the least distance, unless the visitor has touched the page since pressing it (instant with reduced motion).
- The loop wrap is a declared cut in one painted frame, never a crossfade.
- With reduced motion everything starts still (HOLD on the poster frame) and only what the visitor asks for moves.

FORM: La épura (Monge's descriptive-geometry sheet), candidate 6 of 7 on the ordered list, assigned by `concept-seed --scope direction --mode experience`, seed key 68faf439, kind assigned, code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions
- Final typefaces: chosen in task 8.4, within D9. The panel's candidates are Geologica and Fira Mono.
- Featured sheet: by default, the most recent acquisition (004). It can be pinned in `src/playground/museum/collection.ts`.
