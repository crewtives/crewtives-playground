---
version: 1
slug: "playground-landings-game-center-index-html"
primary_target: "sites/playground/landings/game-center/index.html"
related_targets: []
---

# Surface brief — Game Center Yonjigen (`sites/playground/landings/game-center/index.html`)

**Scope and mode:** a full candidate landing of the playground at `/landings/game-center/`. *Experience* mode: the toy rules from the first screen. It meets the specs `landing-game-center` and `playground-hub` of the change `add-playground-landings`, on the shared base (`src/playground/shared/**`, `Engine`, `RetroDisplay` with a mask, `setupSmoothScroll({ resetToTop: false })`).

**Audience and task:** a creative-technology visitor, at night on a desktop (sometimes on the phone in bed), who arrives from the studio's portfolio or a clip and wants to *touch* something within 3 seconds. They have to understand that the studio's "every moment at once" is something you *play*, and that behind it there are real worlds (the five of 4D.OS), one floor away.

**Action:** START (1P START, Enter with focus on the machine, or a tap on the CRT). Secondary: the 2F cell of the directory (on a phone, the visible link to 2F).

**Proof / content:** Rain Run, truly playable on the 1F CRT with TIME VIEW; the real index on 2F (five cabinets with the shared stills, the launcher, a six-row board); the toys of 3F/4F/RF; three 調整中 cabinets on 5F. All of it with data from `src/playground/shared/worlds.ts`.

**Constraints:**
- visitor-facing text in English; Japanese only from the fixed glossary and always in DotGothic16;
- honesty: FREE PLAY, no coins or bets, HI "this browser only", no invented rankings, SYNTHETIC SCENE on the CRT and on every still, the cat's CC-BY credit next to A, B and C;
- stills without a CSS dither screen; `pixelated` only at integer multiples of 400×300;
- ≤ 350 KB gz JS, ≤ 2 MB first load, zero frames at rest;
- reduced motion: a pre-exposed image, no autoplay; ≤ 3 flashes/s at all times;
- without WebGL2: the whole page still works, with honest still images;
- marquee and floor numerals ≤ 96 px; cobalt only on the control panels.

**Memorable moment:** pressing START, crashing three times, and watching the whole flight turn 90° sideways into a chronophotographic strip inside the CRT (TIME VIEW), with "N MOMENTS" counted.

**How the direction was chosen:** impeccable's *new-work* process ran as a draft (a concept draw, two designers per theme, a judge and a critic of the set), and the build follows the direction the seed assigned (position 3 of 7) with the mandatory adjustments of `directions/critique.md` §9, code-led: no image generation was configured, so there are no comps and the ambition lives in the FIRST VIEWPORT block and the signature interaction.

**Open decisions:** a native reading of the Japanese; comparing the sodium (2F) with the chrome of Wind-Up Empire's leaflet in the review of the set.

**Critique §9 adjustments (mandatory, `openspec/changes/archive/2026-09-25-add-playground-landings/directions/critique.md`):**
- Floors: no 5F LIFE; 1F RAIN RUN, 2F 4D.OS, 3F PRIZE, 4F PARLOUR (mint field), 5F LAB and RF ROOF, six cells in the directory.
- Pachinko glass: a center pocket (*heso*) and tulips instead of the gravity well, with FEVER on every 7th ball pocketed (tulips open for 6 s).
- Mirrored twin launchers instead of the bead rails; the phyllotaxis rosette, the symmetry rocker, the rewind wheel and the shutter stay.
- Crane: a single layer of capsules, 2D disks in the x–z plane with the same solver as the glass, and a scripted vertical drop; no 3D stacking.
- The Rain Run ghost is rebuilt from recorded poses, not from an input stream.
- Stills without a CSS dither screen; a CRT that is off shows a dimmed still. The cat's CC-BY credit under A–C and in the credits.
- Marquee and floor numerals ≤ 96 px; cobalt only on the control panels, never as a floor field.
- Phone: a visible, direct link to 2F (5 worlds) in the first viewport, because the directory is hidden.
- The sign atlas waits for the Japanese subset of DotGothic16 before drawing; the subset is versioned once.

## Direction contract

THESIS: The playground is a Tokyo game-center building. Each floor is a genre, each toy is a cabinet you really play, and the scroll is the elevator ride, with its ding at every floor. It refuses the black street with cyan neon and the grid of demo cards.

OWN-WORLD: Each floor is a lit enamel across the full width: 1F vermilion #FF4B26, 2F sodium #FFCC17, 3F candy pink #FF4FA0, 4F mint #1FD68A, 5F carpet violet #3A1C8C, RF night sky #1B1140. Hard-edged violet-black ink slabs #140A24 between floors. Night exists only inside the CRTs, in the machines' glass and on the roof. Cobalt #2238E0 is only the plastic of the control panels. Backlit marquees in Bungee Shade, signs in Bungee, screens and all Japanese in DotGothic16, body in M PLUS Rounded 1c. Candy microswitch buttons, settings on DIP switches, 調整中 cards taped to the glass, prizes as thermal tickets. Every screen is a live 16-color dithered display.

STORY: The visitor presses START and pilots an air taxi through a mirrored canyon of signs in the rain. At GAME OVER the whole flight turns sideways into a chronophotograph. They go up a floor and open one of the five 4D.OS cabinets, or win one at the crane; they pour and rewind the pachinko glass; they light the YONJIGEN sign with real gases; and they meet the machines under adjustment.

FIRST VIEWPORT: At 1440×900: a vermilion cabinet front at x 0–1364 and a 76 px ink directory on the right (elevator display, six cells RF→1F, sound grille). A sodium marquee at y 0–126 with PLAYGROUND (Bungee Shade ≤ 96 px) and "CREWTIVES · GAME CENTER YONJIGEN", with mirrored side signs ゲーム / 四次元. An ink bezel (212,146, 940×624) with the strip "LIVE · 16 COLOURS · EVERY MOMENT STAYS ON SCREEN", HOW TO PLAY on the left wing, SCREEN 16/1-BIT/MILLIONS and SYNTHETIC SCENE on the right. A 739×554 4:3 CRT centered at x 682 with Rain Run in ATTRACT, live dither, a 1UP/HI/DEMO/PRESS START/FREE PLAY HUD. A cobalt control panel (y 770–900) with joystick, A/B/C and 1P START, the primary action. At 390×844: marquee y≤84, a vertical 3:4 CRT (16–374 × 96–573), a cobalt control panel with the elevator button, joystick, A/B/C, START, a visible link to 2F and sound.

FORM: The Japanese game-center cabinet and the building that holds it, position 3 of seven grounded candidates, seed `9365b33c`. Raised by the disciplines of HyperCard (each floor is an address), the drum machine (a 120 BPM clock), the Swiss grid (12 × 78 px), the recipe beside the sample (a printed HOW TO PLAY) and deterministic replay; grafted with the pachinko glass with *heso* and tulips, the rewind jog wheel and the gas tuner.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

**Signature interaction:** TIME VIEW. At GAME OVER (or with C during PLAY) the camera turns 90° in 1.2 s (`power3.inOut`; a cut under reduced motion) to a side view and shows the whole flight as a strip: one pose in every 3 (every 6 on a phone), the gates passed lit up, and "N MOMENTS". A time strip under the screen scrubs through it (drag, or ←/→ in steps of 1/12 s). It is the largest camera move on the page.

**Motion grammar:** a 120 BPM master clock for lamps, blinks and cadences; an arcade press of 50 ms down and 140 ms up; the UI moves like sprites (`steps()`); only the 3D scenes move continuously, and physics is the motion; the elevator rides on free scroll with no pinning; the CRT powers on with `reveal` once; at rest, zero frames.

**Memory test (revised):** "It was a Tokyo arcade. A huge red cabinet with a yellow PLAYGROUND marquee, and on the screen a yellow air taxi flew through a canyon of orange signs in the rain. I pressed start, crashed, and the whole flight turned sideways like a photo of every moment. Then I rode the elevator up: I opened the whale world from a cabinet, won another one at the crane, poured pachinko balls and made them climb back up, and lit a neon sign on the roof with different gases."
