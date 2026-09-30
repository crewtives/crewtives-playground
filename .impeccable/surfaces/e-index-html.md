---
version: 1
slug: "e-index-html"
primary_target: "sites/4d-os/e/index.html"
related_targets: []
---

# Surface brief — landing E "Whale fall" (`sites/4d-os/e/index.html`)

**Scope and mode:** the full landing E: a first screen with a gesture, and a story page. *Experience* mode: the work rules from the first screen. It uses the shared engine (boot, `TimeController`, `TimeViewer`, `RetroDisplay`, `chaseCam`, `zoomHero`, `desktop`, `keyboard`) and meets the specs `cosmic-landings`, `hero-gesture` and `procedural-subject`.

**Audience and task:** the creative-technology community around the reference video on 4D capture, on desktop and on mobile too, with little time. Within seconds they have to understand two things: that the same 4D engine runs another world, and that time is the material (two clocks drifting apart).

**Proof:**
- the `whale-fall` scene live;
- the black-hole lens computed in the browser;
- the NOW readouts, computed with `src/pipeline/scenes/whaleFall.ts`;
- the figures read from the pack.

**Constraints:**
- text in English and "synthetic" always in view;
- nothing written by hand that can be read from the pack or computed with the module;
- OFL fonts;
- no OS windows: it is a world of its own;
- under reduced motion: a still sky, no autoplay and no dissolves.

**Memorable moment:** the whale's clock stretches, thins and reddens while yours stays the same. At the end, its last frame hangs suspended over the shadow.

**How the direction was chosen:** with no direction round, the build follows the direction the seed assigned (position 3 of 7), merged with the commitments of `docs/design/PRODUCT.md`, code-led because no image generation was configured; impeccable's own pick, position 1 (ephemerides of the fall in almanac tables), was not built.

## Direction contract

THESIS: E listens to the fall. The whole page is a waterfall spectrogram: time runs down the page, frequency and wavelength run across it, and every moment of the whale is burned into a single sheet, the way a hydrophone keeps a song. Two clocks, yours and the whale's, are the largest things on the page; the whale's falls behind, stretches and reddens. It refuses the sci-fi HUD (cyan brackets, glow, scanlines, Orbitron) and the star poster.

OWN-WORLD:
- **Ground:** void #05060a, full bleed. No gradients or transparency in the chrome: flat palette fields that shift, never blend.
- **Heat ramp:** the disk's ramp is the spectrogram's color map (#4a0f16 → #9c1f1c → #e0461f → #ff8a2e → #ffc66b → #fff0cf).
- **The whale's cold channel:** #0e1224 → #1d2748 → #3b4f86 → #7f9be0 → #cfe0ff.
- **Rest of the palette:** bone #f4f1ea for text and gray #6a6f7c for axes and grids. Cyan #2fd0e0 belongs only to the NOW going forward, and amber #f0a030 to the NOW in rewind.
- **Type:**
  - Science Gothic for clocks and headlines; the whale's clock goes from width 100 to 200 and from weight 700 to 200 with dτ/dt;
  - Handjet for channels, axes, units and timecode;
  - Atkinson Hyperlegible Next for text.
- **Graphics:** every graphic is a measured stroke, with axes, ticks and units, at 1/3 resolution, without antialiasing and with Bayer dithering.

STORY: The visitor watches the whale spiral down toward the shadow, with the disk's lens bending as the view orbits, and reads two clocks drifting apart. Scrolling down, the camera opens to the full plate, the video reaches the last frame and the story follows:
1. gravity bends time (a two-pen recorder);
2. the plate of the fall, seen from above;
3. the redshift (a spectral waterfall);
4. the horizon: the last frame never arrives;
5. the pack's figures.

It closes with the footer.

FIRST VIEWPORT:
- **View:** full bleed, 100svh. The whale chase, with the shadow and the lensed disk behind and the spiral trail.
- **Top left:** "Whale fall." in wide Science Gothic, a subject line and the synthetic tag.
- **On the right:** a waterfall column (CH 3, the tail beat in Hz against time) with the NOW cursor.
- **At the bottom:** the full-width recorder band:
  - CH 1 YOUR TIME and CH 2 ITS TIME at 6–8vw;
  - r/rₛ, dτ/dt and z in a name / value / unit grid;
  - the timeline, with timecode and state.
- **Top right:** the monitor: time (all / memory), colors (1-bit / 16 / Millions) and the zoom controls.
- **Primary action:** scroll down.
- **Signature interaction:** the whale's clock reacts live to dτ/dt (width, weight and the color of the shift), and orbiting the view changes the shape of the lens.

Elevations:
- **From the kiln shelf (declined):** gravity sets the reading order. Each section of the story goes deeper and carries its r/rₛ reading in its title line.
- **From the freighter terminal (competitive):** each zone is labeled with its channel (CH 1 to CH 5), and states are named in capitals.
- **From the sneaker boxes (declined):** a single label grid governs every readout: quantity, value and unit.
- **From ebru (declined):** colors never blend, they shift. No gradients or transparency in the chrome.
- **Declined with no elevation of their own:** the darkroom (its photographic world belongs to B and C) and the woodcut on shell (the only thing taken is the flat field).

FORM: hydrophone spectrogram waterfall (bioacoustics), position 3 of 7 on the ordered list; seed `76083fd0`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Phone: the stage deck (adapt-for-phones)
On narrow screens E follows D's stage deck (`phone-ergonomics`; `cosmic-landings` "Live first screen on the same engine"; design D10 of `adapt-for-phones`) in its own language: under `(max-width: 760px), (orientation: landscape) and (max-height: 500px)`, `placeDeck()` in `main.ts` creates a `.stage-dock` at the end of the pinned stage and moves into it the stage keys and the Time and Colors fieldsets (the same nodes: names, listeners and tab order kept). The deck and the recorder read as one console: a void field in 44 px rows split by grid hairlines, keys with the NOW line, then Time, then Colors, with Handjet legends and E's pixel diamonds; the checked cell is a flat bone field with void text (E's inversion, never a blend). The hint rides above it as a void chip.
- **The NOW line** is a pair of `aria-hidden` mirrors (`data-deck-now`, never `data-now`): `bindDesktop` collects `[data-now]` once, so the deck writes them itself from its own time subscription with `timecode()` and `playbackLabel()`, each time it creates them, and drops them with the deck. The real outputs stay in the transport for assistive technologies.
- **Framing:** the full plate fits the free glass between the title block and the deck's hint, read from live rects; in landscape, right of the title and above the deck. The desktop framing is unchanged.
- **Landscape:** the deck sits on the recorder at the right, flush with the edge like the desktop's column: keys and the NOW line on one row, Time and Colors on the next; the title keeps the top left. (The first plan put it at the top right, where it covered the title at 844×390.)
- **Targets:** the cells are the finger's targets (the radio covers the cell, unseen; the cell draws the diamond); under a coarse pointer the back tab is a visible 44 px bone strip with the slate at 52 px, and below the hero the Layers rows, the transport play and its track are 44 px.
- **Gutter:** the phone gutter is set on `:root[data-world='e']`, which the world's own token no longer beats.
- **Weight:** E loads its pack without the source frames (`loadPack` `source: false`): none of its views can show them. On phones the boot shows the bytes received over the total next to the percentage ("n / 27.0 MiB"); "Weight on disk" still reads the pack's declared 52.8 MiB.
- **Unchanged:** the desktop, the gesture, the story, and no motion under reduced motion.

## Unresolved
- The finish review (task 8.5 of `add-cosmic-landings-and-organic-motion`) and the regeneration of `docs/design/DESIGN.md` were left for the end of that change.
