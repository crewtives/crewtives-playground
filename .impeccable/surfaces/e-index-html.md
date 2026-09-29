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

## Unresolved
- The finish review (task 8.5 of `add-cosmic-landings-and-organic-motion`) and the regeneration of `docs/design/DESIGN.md` were left for the end of that change.
