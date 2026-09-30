# landing-bloomscope Specification

## Purpose

Define Bloomscope, the playground landing built around a giant kaleidoscope that is turned with a brass ring. Its chamber holds low-poly flowers, succulents and honeycombs computed from equations, and below it sit three toys of natural symmetry (the golden-angle seeder, the rosette lathe and the honeycomb) whose results go back into the chamber to be multiplied in the mirrors.

## Requirements

### Requirement: Page at its route and section order
The landing SHALL be served at `/bloomscope/` with the title `Bloomscope · crewtives playground`. All visible text SHALL be in English. The page SHALL present, in this order:
1. the Scope (the first screen);
2. the index "Load another wheel." (`id="worlds"`);
3. Sow, the golden-angle seeder;
4. the rosette lathe;
5. the honeycomb frame (Hive);
6. the footer.

The navigation SHALL link each section in page order. On load, the page MUST NOT scroll back to the top on its own, so that deep links (`#worlds` and the garden link `#g=`) reach their destination. A toy that is not finished at publication SHALL be shown as an empty clear-glass cell, labeled as in preparation, inside its section; it MUST NOT be hidden or faked.

#### Scenario: Full walkthrough
- **WHEN** the visitor scrolls down from the first screen to the end
- **THEN** they find the Scope, the index, Sow, the lathe, the honeycomb and the footer, in that order

#### Scenario: Deep link to the index
- **WHEN** `/bloomscope/#worlds` is opened
- **THEN** the page stays positioned at the index "Load another wheel." and does not jump to the top

#### Scenario: Unfinished toy
- **WHEN** the landing is published with the honeycomb unfinished
- **THEN** the honeycomb section keeps its color field and its headline, and shows an empty glass cell labeled as in preparation instead of the toy

### Requirement: Visual world of backlit glass
Each section SHALL be fully bathed in a single glass color, with hard edges between sections and no fades:
- Scope: chartreuse `#C8F03C`, with a tonal Vogel dot pattern in `#B2DB2A` centered on the eyepiece;
- index: petal `#FF6FB5`;
- Sow: lilac `#B99CFF`;
- lathe: glaucous `#8FD6B8`;
- honeycomb: honey `#F39A1A`;
- footer: plum ink `#1B0F2E`.

Text on light fields SHALL use the plum ink, including all the text on the first screen. The background paper SHALL be a daylight white close to `#FDFDF6`. Cobalt MUST NOT be used as a section field: it SHALL appear only as a glass color within the kaleidoscope palette. There SHALL be a single "NOW" color, ruby `#E8175D`, reserved for the newest thing (the newest seed, the newest leaf, the honeycomb cell under the cursor and the ring's notch), and it MUST NOT mark many things at once; each "NOW" mark SHALL carry a 2 px ink keyline, to reach a contrast of at least 3:1 on any field. The gems SHALL be drawn as flat vector facets in 3 or 4 tones, with no blur and no filters over the background.

#### Scenario: First-screen field
- **WHEN** the page finishes loading in a 1440×900 viewport
- **THEN** the field behind the text and the eyepiece is chartreuse, the text is in plum ink and no section field is cobalt

#### Scenario: Gems without frosted glass
- **WHEN** any gem on the page is inspected
- **THEN** it is made of flat facets of solid color and applies no blur to itself or to what lies behind it

#### Scenario: "NOW" contrast
- **WHEN** a ruby "NOW" mark appears on the chartreuse field, on the honey ring or on the paper
- **THEN** its ink keyline contrasts at least 3:1 with the color around it

### Requirement: Its own typography
Headlines SHALL use Ultra, at no more than 96 px (6 rem). Body text SHALL use Recursive with the casual axis at 0 (linear); Recursive at casual 1 SHALL be reserved for labels. Data readouts (angles, counts, generations, routes) SHALL use Recursive Mono with tabular figures. None of these families SHALL be shared with the other two landings or with 4D.OS. Text MUST NOT use characters the fonts do not include (`≈ → ↻ ↺ √ φ`); arrows and rotation signs SHALL be the page's own vector icons.

#### Scenario: Headline limit
- **WHEN** the viewport measures 1440×900 or larger
- **THEN** no headline exceeds a 96 px font size

#### Scenario: Text without missing glyphs
- **WHEN** all the text on the page is scanned
- **THEN** none of the characters `≈ → ↻ ↺ √ φ` appears and no text falls back to a fallback font

### Requirement: Eyepiece first screen
The first screen SHALL be asymmetric on desktop: a text column on the left and the eyepiece on the right. It SHALL show, without scrolling:
- the headline "Turn the / garden." on two lines;
- the subtitle "A kaleidoscope loaded with flowers, succulents and honeycomb, each grown from an equation in your browser. Drag the brass ring to turn it; flick it to tumble what's inside.";
- the live circular eyepiece, surrounded by the brass ring, which is the primary action, with the hint "Drag the brass ring" and a curved arrow toward the ring;
- the Scope readout, inside the eyepiece, in the format `D5 · 135° · 3 specimens · 18 beads`;
- the "What the mirrors see" inset;
- the four mirror gems;
- the single-press alternative "Every turn at once", as the primary button;
- "Shake" and the "Exposures" switch;
- the display selector `1-bit · 16 · Millions`;
- the "In the chamber" tray and "Copy link to this garden";
- the sound switch;
- the link "Or skip to the five 4D.OS worlds", which leads to `#worlds`.

#### Scenario: Desktop
- **WHEN** the page loads in a 1440×900 viewport
- **THEN** all the listed elements are visible without scrolling and the eyepiece sits to the right of the text column

#### Scenario: Phone
- **WHEN** the page loads in a 390×844 viewport
- **THEN** without scrolling, the headline, the eyepiece with its ring, the mirror gems, "Every turn at once" and a visible link to the worlds index are visible, and the page has no horizontal scroll

### Requirement: Circular eyepiece and peepholes
The eyepiece and the peepholes SHALL be circular through the display's shape mask (`dither-display`): outside the circle, what lies behind SHALL show through (the ring, the section field and the Vogel pattern), never an opaque background rectangle. The "What the mirrors see" inset SHALL be a small circle that shows the unmirrored object cell, with the mirror lines drawn on top, so that the mechanism can be understood.

#### Scenario: Clear corners
- **WHEN** the corner of the square that contains the eyepiece is observed
- **THEN** that corner shows the chartreuse field or the Vogel pattern, not the display background

#### Scenario: The raw cell
- **WHEN** the visitor turns the ring
- **THEN** in "What the mirrors see" the content turns beneath mirror lines that stay fixed

### Requirement: Brass ring with inertia and detents
Dragging the ring SHALL turn the drum, with an angle that follows the pointer around the eyepiece's center; turning the drum SHALL rotate the cell's content beneath fixed mirrors, as in a real kaleidoscope. On release, the drum SHALL keep spinning freely with the gesture's velocity (capped at 720°/s), slowing down continuously like a flywheel, in both directions. After release, below 40°/s, a detent SHALL bring it to the nearest multiple of 15°. The ring's knurling SHALL turn with the drum; the ruby "NOW" notch SHALL stay fixed at 12 o'clock. The Vogel pattern SHALL turn at one tenth of the drum's angle. With focus on the ring, ←/→ SHALL turn it 5°, Shift+←/→ 15°, Space SHALL shake, keys 1 to 4 SHALL choose the mirror mode and E SHALL launch "Every turn at once". Keyboard steps MUST NOT go through the detent: the drum stays where the step leaves it.

#### Scenario: Momentum
- **WHEN** the visitor drags the ring quickly and releases it
- **THEN** the drum keeps spinning in the same direction, gradually loses speed and stops at a multiple of 15°

#### Scenario: Release without velocity
- **WHEN** the visitor stops dragging at 52° and releases the ring with no velocity
- **THEN** the drum settles at 45° and the readout shows `45°`

#### Scenario: Keyboard
- **WHEN** the ring has focus at 0° and the visitor presses → once
- **THEN** the drum stays at 5°, does not return to 0° and the ring announces "5 degrees"

### Requirement: Chamber with physics and exposures
The chamber SHALL contain specimens and glass beads that fall under a gravity always pointing down the screen, so that turning the drum makes them roll. The bodies SHALL bounce off one another and off the circular wall, and SHALL fall asleep when they are nearly still. "Shake" SHALL give each body an impulse in a seeded pseudorandom direction. A horizontal drag inside the eyepiece SHALL push the content; a vertical swipe over the eyepiece SHALL scroll the page. With "Exposures" on (the default), each body SHALL leave its last 12 positions, taken every 50 ms, as dithered exposures that the mirrors multiply into a flower of trajectories; when the bodies fall asleep, those exposures SHALL stay fixed until the next movement.

On load, three specimens (a sunflower, an echeveria and an aloe) and the beads SHALL fall into the chamber over 1.2 s while the drum makes an initial 90° turn. After that there MUST NOT be any automatic rotation: with everything asleep and no interaction, no new renders SHALL occur.

#### Scenario: Turning makes things roll
- **WHEN** the bodies rest at the bottom of the cell and the visitor turns the drum 180°
- **THEN** the bodies fall toward the side that is now at the bottom of the screen

#### Scenario: Frozen plate
- **WHEN** the bodies stop moving with "Exposures" on
- **THEN** their exposures stay visible, multiplied by the mirrors, until the next interaction

#### Scenario: At rest
- **WHEN** loading finishes and the visitor does not interact
- **THEN** the drum does not turn on its own and, once the bodies are asleep, no new frames are rendered

#### Scenario: Scrolling over the eyepiece
- **WHEN** the visitor swipes vertically over the eyepiece on a phone
- **THEN** the page scrolls and the drum does not turn

### Requirement: Mirror modes
Four gems SHALL choose the mirror arrangement:
- "Lily · threes": two mirrors at 60°, dihedral symmetry of order 3 (`D3`);
- "Rose · fives": two mirrors at 36°, dihedral symmetry of order 5 (`D5`);
- "Comb": three mirrors at 60°-60°-60°, hexagonal tiling `*333`;
- "Comb and star": three mirrors at 30°-60°-90°, tiling `*632`.

The readout SHALL start with the symmetry's name. Changing mode SHALL take effect on the next frame without altering the chamber's content. Dithering SHALL be applied after mirroring, in screen space, so that the pattern does not appear reflected at the seams.

#### Scenario: Five folds
- **WHEN** the mode is "Rose · fives" and the display is at `Millions`
- **THEN** the eyepiece image rotated 72° around its center matches the original, except for the raw-cell inset, the readout and one pixel of tolerance at the edges, and the readout starts with `D5`

#### Scenario: Honeycomb of mirrors
- **WHEN** the visitor chooses "Comb"
- **THEN** the eyepiece shows a tiling of equilateral triangles reflected along their sides, the readout starts with `*333` and the bodies in the chamber do not change position

#### Scenario: Clean seams
- **WHEN** the display is at `16` and a mirror line is observed
- **THEN** the dithering pattern continues on both sides of the line without being reflected

### Requirement: Every turn at once
"Every turn at once" SHALL, with a single press, give the drum one full turn in 3 s (120°/s), with gravity following the drum and 24 exposures taken every 66 ms. When it finishes, the chamber SHALL enter HOLD: the bodies freeze, the flower of trajectories stays in the eyepiece until the next touch on the Scope and the readout shows `HOLD`.

#### Scenario: One press
- **WHEN** the visitor activates "Every turn at once"
- **THEN** the drum makes exactly one turn in about 3 s, then the image stays fixed with the multiplied trajectories and the readout shows `HOLD`

#### Scenario: Leaving HOLD
- **WHEN** the chamber is in HOLD and the visitor drags the ring
- **THEN** the bodies move again and the readout stops showing `HOLD`

### Requirement: Continuous simulation and peepholes
The chamber simulation SHALL keep running even when the Scope is off screen. Each bench section (Sow, lathe and honeycomb) SHALL have a peephole: a live circular view of the same chamber, so that what is added can be seen without going back up.
- On desktop, the peephole SHALL measure 200 px and stay pinned beside its section while the section is on screen.
- On a phone, in portrait (up to 699 px wide and at least 521 px tall) or in landscape (up to 1023 px wide and at most 520 px tall), the peephole SHALL measure 96 px. In Sow and the lathe it SHALL be pinned inside that toy's pinned stage, beside the toy. In the honeycomb it SHALL sit beside that section's "Put in the Scope".

A peephole MUST NOT overlap the view of the toy it accompanies.

#### Scenario: Adding without going back
- **WHEN** the Scope is off screen and the visitor puts their sunflower into the chamber from Sow
- **THEN** Sow's peephole shows the sunflower falling into the chamber and multiplied by the mirrors

#### Scenario: Adding from the lathe on a phone
- **WHEN** the viewport is 390×844 with touch and the visitor presses "Put in the Scope" on the lathe
- **THEN** at that moment the lathe's peephole is fully on screen, next to the pinned rosette, and shows the rosette falling into the chamber

#### Scenario: The Scope kept running
- **WHEN** the visitor adds a specimen from the lathe and returns to the Scope before it settles
- **THEN** the Scope shows the same state as the peephole, not the one it had when it left the screen

### Requirement: Bringing results to the chamber
Each toy on the bench SHALL have the "Put in the Scope" button, which adds its current result to the chamber as a specimen: Sow's flower head, the lathe's rosette and the Hive's honeycomb. The result SHALL fly as a chip to a fixed chamber gem, in the bottom-right corner, which shows the count `n/7`; activating that gem SHALL lead back to the Scope. On a phone, while the section's peephole is on screen, the chip SHALL fly into that peephole instead, and the gem MUST NOT appear over the section's controls; the peephole's frame SHALL then show the count `n/7`, and the section SHALL announce the new count to assistive technologies. The chamber SHALL hold up to 7 specimens and SHALL always keep its glass beads (18 on desktop, 10 on phone). The "In the chamber" tray SHALL list the specimens in the order they entered; with no specimens it SHALL say "Empty. Put something in from the bench below." Taking a specimen out from the tray SHALL leave a 1-bit silhouette in the tray for the rest of the session.

#### Scenario: Adding
- **WHEN** the chamber has 3 specimens and the visitor presses "Put in the Scope" on the lathe
- **THEN** the rosette enters the chamber, the gem shows `4/7` and the tray appends it at the end

#### Scenario: Adding with the peephole in view
- **WHEN** the viewport is 390×844 with touch and the visitor presses "Put in the Scope" on the lathe
- **THEN** the chip flies into the lathe's pinned peephole, the rosette enters the chamber, the chamber gem does not cover the section's controls, the peephole's frame shows the new count and the section's live region announces it

#### Scenario: Full chamber
- **WHEN** the chamber has 7 specimens
- **THEN** all the "Put in the Scope" buttons are disabled with the text "Chamber full, take one out"

#### Scenario: Removing leaves a scar
- **WHEN** the visitor takes the echeveria out from the tray
- **THEN** the echeveria leaves the chamber, the count drops by one and its 1-bit silhouette remains in its place in the tray

### Requirement: Sow, the golden-angle seeder
The Sow section SHALL carry the headline "The one angle / no mirror can make." and a subtitle that literally includes "Mirrors only close into a pattern at 180°/n; the golden angle is not one of them." Each seed n SHALL be placed at angle n·α and at a radius proportional to √n, with α the chosen divergence, and SHALL be colored by its birth order, with the newest in ruby. Controls:
- a dial that runs from 120° to 160°, with a vernier (inner ring or Shift while dragging) for adjustments in thousandths of a degree. With a finger, the outer dial SHALL be grabbable on a ring at least 44 px thick that stays inside the dial's own box; a touch that starts on that ring SHALL turn the dial in any direction and MUST NOT scroll the page, while a touch that starts on the plate inside it scrolls; the thin vernier ring MAY stay narrower, because the named states and Page Up/Page Down cover fine adjustments;
- a detent: within ±0.03° of 137.507764°, the value snaps to the golden angle, "GOLDEN" is stamped where it stays visible (over the plate on desktop, on the dial's band at 12 o'clock on a phone) and fades out over 1.2 s without flickering, and the device vibrates briefly where supported;
- named states, reachable with Page Up and Page Down: `Golden 137.508°`, `Spokes 137.3°`, `Near 137.6°`, `Fifths 144°`, `Thirds 120°` and `Root 2 turn 149.117°`; while the angle travels between states, all the seeds are repositioned live;
- "Hold to sow", which sows 30 seeds per second up to the maximum (2,400 on desktop, 800 on phone); "Sow 100", instantaneous; "Clear".

#### Scenario: Golden detent
- **WHEN** the visitor brings the dial to 137.49°
- **THEN** the value snaps to 137.508°, "GOLDEN" appears and fades out without flickering

#### Scenario: Spokes
- **WHEN** the visitor chooses `Fifths 144°` with at least 100 seeds
- **THEN** the seeds line up in 5 straight spokes and the readout shows `spokes 5`

#### Scenario: Named states
- **WHEN** the dial has focus at `Golden 137.508°` and the visitor presses Page Down
- **THEN** the angle moves to the next named state and the seeds are repositioned during the travel

#### Scenario: Turning the dial with a finger
- **WHEN** at 390×844 on a touch screen the visitor touches the dial's band, 8 px inside the dial's edge, and drags 90° around it
- **THEN** the divergence changes with the drag and the page does not scroll

#### Scenario: The ring stays inside the dial
- **WHEN** at 390×844 on a touch screen, with Sow's stage pinned, the visitor taps 2 to 10 px below the stage's bottom edge
- **THEN** the tap reaches the control beneath the stage, not the dial

### Requirement: Sow readouts and births
Sow SHALL show in Mono the divergence (`divergence 137.508°`), the number of seeds (`seeds 1,204`) and the visible spirals as a labeled estimate, `visible spirals about 34 · 55 (estimated)`, computed as the two highest consecutive denominators of the convergents of the continued fraction of α/360° that do not exceed 2.3·√N. Hovering the pointer over a seed SHALL show its number and its age (`seed #412 · born 13.7 s ago`). The "Scrub births" control SHALL dim the seeds born after the chosen point to a 1-bit stipple and SHALL show a chip with the 4D.OS vocabulary: `FORWARD`, `REWIND` or `HOLD`, depending on the direction of the drag.

#### Scenario: Spiral estimate
- **WHEN** the angle is the golden angle and there are 1,204 seeds
- **THEN** the readout says `visible spirals about 34 · 55 (estimated)`

#### Scenario: Scrubbing the births
- **WHEN** the visitor drags "Scrub births" backward
- **THEN** the seeds born after the point become a 1-bit stipple and the chip shows `REWIND`

### Requirement: Rosette lathe
The lathe section SHALL carry the headline "A rosette is a / staircase, squashed." and three species gems: `Echeveria`, `Aloe, clockwise` and `Aloe, counter-clockwise`. The echeveria's leaves SHALL be arranged at the golden angle; the aloe's in a spiral, near 144°, turning in the gem's direction. Controls:
- dragging down over the plant adds a leaf every 24 px and dragging up removes one (with mouse or pen; on touch screens the view lets scrolling through);
- the buttons `+1 leaf`, `+8` and `−1`;
- a leaves control with marks at 8, 13, 21, 34, 55 and 89 (maximum 55 on phone), and the Plump and Blush controls from 0 to 1;
- a horizontal drag that orbits the plant up to ±70°.

The newest leaf SHALL carry the ruby "NOW" keyline; the leaves' blush MUST NOT use the ruby. The "Stretch time" tab SHALL have the stops `Rosette`, `Half` and `Staircase`, and SHALL raise each leaf according to its birth order, with the oldest at the bottom, until the rosette unfolds into a spiral staircase.

#### Scenario: Adding leaves
- **WHEN** the echeveria has 13 leaves and the visitor presses `+8`
- **THEN** the plant has 21 leaves and the newest carries the ruby keyline

#### Scenario: Stretching time
- **WHEN** the visitor brings "Stretch time" to `Staircase`
- **THEN** each leaf's height grows with its birth order and the rosette reads as a staircase

#### Scenario: Chirality
- **WHEN** the visitor switches from `Aloe, clockwise` to `Aloe, counter-clockwise` with the same parameters
- **THEN** the new plant is the mirror image of the previous one

### Requirement: Water drop
Clicking on the rosette, or activating "Drop water", SHALL release a drop that runs down the midrib of the leaf where it lands, jumps to the next lower leaf and repeats down to the center of the plant, where it SHALL end with a drip. Its path SHALL remain on the plant as 16 exposures.

#### Scenario: Down to the center
- **WHEN** the visitor clicks an outer leaf of the echeveria
- **THEN** the drop travels over lower and lower leaves, ends at the center and its path stays marked with 16 exposures

#### Scenario: From the keyboard
- **WHEN** the visitor activates "Drop water" with Enter
- **THEN** a drop falls onto an outer leaf and makes the same path down to the center

### Requirement: Honeycomb frame (Hive)
The honeycomb section SHALL carry the headline "Honeycomb keeps / every generation." and a hexagonal frame of 24×16 cells (14×10 on phone) that wraps around at the edges. It SHALL run "a hexagonal cousin of Life (rule B2/S34)": a cell is born with exactly 2 of its 6 neighbors alive and survives with 3 or 4. Controls: painting cells by dragging or tapping, `Run` (6 generations per second), `Step`, `Rewind` (one generation back), `Clear` and `Random (seed NNNN)`, with the seed printed on the button. The seed SHALL be fixed and SHALL be the first one, counting from 1, whose 30% fill stays alive for at least 48 generations and has at least 20 live cells at generation 32. Each generation SHALL remain as a wax layer stacked beneath the frame (32 layers on desktop, 12 on phone), with a color that goes from honey to propolis with age; newborn cells are in pollen with a 2 px ink keyline, the "NOW" ruby marks only the live cell under the cursor (once the visitor has touched the frame) and a cell alive for 6 consecutive generations receives a cap. The readout SHALL show the generation (`generation 42`).

#### Scenario: Rule B2/S34
- **WHEN** a step is taken from any frame
- **THEN** each empty cell with exactly 2 live neighbors is born, each live cell with 3 or 4 live neighbors survives and all the others end up empty, counting neighbors across the edges

#### Scenario: Isolated cell
- **WHEN** a step is taken from a frame with a single live cell
- **THEN** the frame ends up empty

#### Scenario: Printed seed
- **WHEN** the visitor presses `Random (seed NNNN)` twice in a row
- **THEN** they get the same frame both times and the number on the button is that of the seed used

#### Scenario: Rewinding
- **WHEN** the visitor takes 5 steps from generation 0 and presses `Rewind`
- **THEN** the frame shows exactly generation 4 and the readout says `generation 4`

#### Scenario: Cap
- **WHEN** a cell stays alive for 6 consecutive generations
- **THEN** that cell shows a cap on the current layer

### Requirement: Shared display selector
All the views on the page (the eyepiece, the peepholes and the bench toys) SHALL share a single display mode: `1-bit`, `16` or `Millions`, with `16` by default. The selector SHALL be on the first screen and repeated in each bench section; changing it in any of them SHALL change all the views. In `1-bit`, each view SHALL use the plum ink and its own section's field.

#### Scenario: One change, every view
- **WHEN** the visitor chooses `Millions` in the honeycomb section
- **THEN** the eyepiece, the peepholes and the three toys switch to `Millions` and the selectors in the other sections reflect it

#### Scenario: 1 bit per section
- **WHEN** the mode is `1-bit`
- **THEN** Sow's view contains only plum ink and lilac, and the lathe's only plum ink and glaucous

### Requirement: Index "Load another wheel."
The index SHALL be the second section, with `id="worlds"`, and SHALL present the shared index of `playground-hub` as a shelf of kaleidoscope wheels symmetric about the page's axis:
1. the launcher row: a wheel with the tesseract glyph, the headline "4D.OS", the line "The desktop that holds all five worlds." and the primary action "Enter 4D.OS", which leads to `/4d-os/`;
2. five wheels, A through E, with each world's still image, name, line and route;
3. three clear-glass wheels with no name or link, with a 1-bit Vogel stipple that changes slowly and the label "Empty cell · a sketch in the lab, not public yet"; they MUST NOT be focusable.

Each world wheel SHALL show the visible label "synthetic scene", and those for A, B and C SHALL show next to the image the cat's credit line, verbatim from `LICENSES.md`. The still images MUST NOT go through dithering again. On pointer hover or focus on a wheel, a 6-fold kaleidoscope version of its image SHALL open from the center in 420 ms and close on leaving. The tab order SHALL be the launcher and then A through E. The section SHALL close with "Each world is a real scene you can scrub through time. The empty cells are experiments still growing."

#### Scenario: Real links
- **WHEN** the page's static HTML is read without running scripts
- **THEN** it contains links to `/4d-os/` and to the five world routes, and no link for the three lab wheels

#### Scenario: Cat credit
- **WHEN** the visitor sees wheels A, B and C
- **THEN** each one shows "synthetic scene" and the cat's credit line next to its image

#### Scenario: Iris
- **WHEN** a world wheel receives keyboard focus
- **THEN** its kaleidoscope version opens from the center and the link keeps working

### Requirement: Herbarium strip
"Press this head" SHALL save a dithered thumbnail of Sow's current flower head, with the angle as its caption. The strip SHALL keep the last 8; when the ninth arrives, the oldest SHALL leave. The strip SHALL last for the page session.

#### Scenario: Eight slots
- **WHEN** the visitor presses 9 flower heads with different angles
- **THEN** the strip shows 8 thumbnails, the first one is missing and each carries its angle as its caption

### Requirement: Garden link
"Copy link to this garden" SHALL copy a URL of the page whose `#g=` fragment stores, with a version number, the mirror mode, the drum angle, the display mode, the chamber's specimens with their parameters and in their order, and Sow's angle. If the copy works it SHALL notify "Link copied. Anyone who opens it gets this exact garden."; if it fails it SHALL say "Couldn't copy. Here's the link:" next to a field with the link, ready to select. Opening the link SHALL load that garden instead of the default garden. A damaged `#g=` fragment, or one from an unknown version, SHALL be ignored: the page loads the default garden with no console errors.

#### Scenario: Round trip
- **WHEN** the visitor builds a garden in "Comb" with a rosette and a flower head at 144°, copies the link and opens it in another tab
- **THEN** the new tab shows "Comb", the same drum angle, the same display mode, the same specimens in the same order and Sow at 144°

#### Scenario: Damaged link
- **WHEN** the landing is opened with `#g=` followed by invalid text
- **THEN** the default garden loads and there are no console errors

#### Scenario: Clipboard blocked
- **WHEN** the browser rejects the copy
- **THEN** "Couldn't copy. Here's the link:" appears with the link in a selectable field

### Requirement: Kaleidoscope sound
With sound on (off by default, per `playground-hub`), the toys SHALL sound only through synthesis:
- bead collisions as short bursts of noise, at most 12 voices and 30 per second;
- a tick for each ring detent, at most 20 per second;
- in Sow, one note per seed, from a pentatonic scale chosen by its angle, and a bell on reaching the golden angle;
- one note per leaf on the lathe and a drip at the end of the drop;
- a wood knock per honeycomb cap, at most 3 per second.

Sow SHALL show "With sound on, each seed plays a note set by its angle. That mapping is ours, not the sunflower's."

#### Scenario: Silent by default
- **WHEN** the visitor turns the ring and sows without having turned the sound on
- **THEN** the page produces no audio

#### Scenario: The melody of fives
- **WHEN** the sound is on, the angle is `Fifths 144°` and the visitor sows
- **THEN** the sequence of notes repeats every 5 seeds

### Requirement: Bloom on entry
The first time each section enters the screen, its specimen SHALL assemble in birth order (seeds, leaves or honeycomb rings), together with a single display reveal. Text and controls SHALL be visible from the start and MUST NOT animate on entry. While the Scope scrolls off the screen, the drum SHALL add up to 240° of turn. The toys' motion SHALL come from their simulation and not from pre-built transitions.

#### Scenario: Text visible from the start
- **WHEN** a section enters the screen for the first time
- **THEN** its headline and its controls are already visible while the specimen assembles

### Requirement: Toy accessibility
- The ring SHALL be exposed as a slider from 0 to 359 with the value as text (for example "135 degrees").
- Each view SHALL have a live text description; the eyepiece's names the mode and the content (for example "Five-fold kaleidoscope holding a sunflower, an echeveria, an aloe and 18 glass beads").
- The mirror gems SHALL form a group of mutually exclusive options, and all buttons SHALL be native.
- Sow's dial SHALL be a range control with a step of 0.001 and the value as text (for example "137.508 degrees, golden, about 34 and 55 spirals"); its announcements SHALL be limited to one per second. "Scrub births" SHALL announce the seed number at the chosen point.
- The honeycomb SHALL be a grid with a hexagonal cursor: the arrows move it along the honeycomb's axes, Enter toggles the cell, R runs, S steps, B rewinds, and each step announces the number of live cells.
- No toy SHALL depend on a fine drag: each one SHALL offer named states reachable with a button.
- Focus SHALL be visible on any color field; touch targets SHALL measure at least 44 px.

#### Scenario: Keyboard only
- **WHEN** the visitor goes through the page using only the keyboard
- **THEN** they can turn the ring, change the mirrors, launch "Every turn at once", sow, change named state, grow and stretch the rosette, drop the water, run, rewind and paint the honeycomb, and open any world, always with visible focus

#### Scenario: Up-to-date description
- **WHEN** the visitor switches to "Lily · threes" and adds a honeycomb
- **THEN** the eyepiece's description names the order-3 symmetry and includes the honeycomb

### Requirement: Reduced motion in Bloomscope
With `prefers-reduced-motion: reduce`:
- on load, the eyepiece SHALL directly show a pre-exposed HOLD plate, with the trajectories already multiplied by the mirrors, with no initial fall and no initial turn;
- the ring SHALL turn 1:1, with no inertia;
- "Shake" SHALL directly show the settled result;
- "Every turn at once" SHALL compute the turn without showing it and SHALL immediately present the finished HOLD plate;
- there SHALL be no bloom, display reveal, iris on the wheels, smooth scroll, scroll-linked turn or chip flight;
- the lab wheels' stipple SHALL stay still;
- Sow MUST NOT sow on its own and the honeycomb SHALL advance only with `Step` or with `Run` pressed on purpose.

All the toys SHALL remain usable. A change of the preference SHALL take effect without reloading.

#### Scenario: Still load
- **WHEN** the landing loads with reduced motion and the visitor does nothing
- **THEN** the eyepiece shows the pre-exposed HOLD plate, the readout shows `HOLD`, nothing turns and no more frames are rendered

#### Scenario: Immediate HOLD
- **WHEN** reduced motion is active and the visitor presses "Every turn at once"
- **THEN** the eyepiece goes straight to the plate with the multiplied trajectories, the readout shows `HOLD` and the turn is not seen

#### Scenario: Live change
- **WHEN** the visitor turns on reduced motion in the system with the page open
- **THEN** the ring stops having inertia without reloading the page

### Requirement: Bloomscope without WebGL2
Without WebGL2, the page SHALL show "Your browser has no WebGL2, so the toys run in flat 2D." and SHALL remain the full color page: fields, typography, gems and index unchanged. The Scope SHALL work as a flat 2D kaleidoscope, turnable with the ring and with the same physics. Sow SHALL work in full. The lathe SHALL show a top-down view, without "Stretch time". The honeycomb SHALL draw its grid in 2D, with the last 6 generations as offset outlines. Without JavaScript, the page SHALL keep the fields, the headlines and the full index of links.

#### Scenario: Browser without WebGL2
- **WHEN** the landing is opened in a browser without WebGL2
- **THEN** the notice line appears, the ring still turns a 2D kaleidoscope and the index looks and works the same

#### Scenario: Without JavaScript
- **WHEN** the landing is opened with JavaScript disabled
- **THEN** the color fields, the headlines and the links to `/4d-os/` and to the five worlds are visible

### Requirement: Bloomscope honesty and footer
The footer SHALL show "Bloomscope · demo build 0.1" and a paragraph saying that everything is computed in the browser from equations, with no photographs or downloaded 3D models; that the spiral counts are estimates; that the toys reset on reload and that the link saves a garden; and that the typography is Ultra (Apache License 2.0) and Recursive (SIL Open Font License). It SHALL include "Made by crewtives", linking to `https://crewtives.com`. Every estimated figure on the page SHALL be labeled as estimated.

The footer SHALL carry the way back to Bloomscope's sheet in the museum: a native link to `/#sheet-004` with the visible text "Playground · Sheet 004", preceded by a left-pointing arrow. Ultra and Recursive do not include the `←` character, so the arrow SHALL be drawn as the page's own vector icon and the text MUST NOT contain that character. The link SHALL be in the static HTML, so that it works without JavaScript.

Bloomscope is no longer a candidate landing: the footer MUST NOT show the line "One of three candidate landings · compare at /landings/", and the page MUST NOT link to `/landings/`, which now redirects to `/`.

#### Scenario: Correct credits
- **WHEN** the visitor reads the footer
- **THEN** the type credits name Ultra and Recursive, and mention no other families

#### Scenario: Way back without JavaScript
- **WHEN** the static HTML of `/bloomscope/` is read without running scripts
- **THEN** the footer contains a link `<a href="/#sheet-004">` with the text "Playground · Sheet 004" and a left-pointing vector arrow, and the page's visible text does not contain the `←` character

#### Scenario: Back to the sheet
- **WHEN** the visitor activates "Playground · Sheet 004" in the footer
- **THEN** the browser opens `/#sheet-004`, Bloomscope's sheet in the museum

#### Scenario: No candidate line
- **WHEN** the visitor reads the footer
- **THEN** "One of three candidate landings" does not appear and no link on the page points to `/landings/`

### Requirement: Per-device budgets
On a phone (coarse pointer and a viewport of up to 800 px) the landing SHALL use lower limits than on desktop:

| | Phone | Desktop |
|---|---|---|
| Seeds | 800 | 2,400 |
| Leaves | 55 | 89 |
| Honeycomb frame | 14×10 | 24×16 |
| Honeycomb layers | 12 | 32 |
| Glass beads | 10 | 18 |

#### Scenario: Phone limits
- **WHEN** the landing is opened on a 390×844 phone and the visitor holds "Hold to sow"
- **THEN** sowing stops at 800 seeds, the chamber has 10 beads and the honeycomb measures 14×10

### Requirement: Fixed garden for the museum loop
Bloomscope SHALL have a single fixed garden, published as a `/bloomscope/#g=…` link in the same format that "Copy link to this garden" produces. That link SHALL be the one used by the recording of the museum's sheet 004 loop, which records the Sow section while it sows; the one that loop's provenance records; and the one sheet 004 links to. That way, the visitor who follows it opens the same garden they saw recorded. The fixed garden SHALL use the `16` display, the same as the museum's recordings.

Opening the fixed link SHALL always load that garden: the same mirror mode, the same drum angle, the `16` display, the same specimens with their parameters and in their order, and the same Sow angle.

So that the recorded sowing is reproducible:
- **What the link fixes:** Sow's angle and the display. They are the only parts of the garden that change what Sow paints when sowing.
- **What does not travel in the link:** the rest of Sow's initial state, which SHALL be the same on every load: 610 seeds, "Scrub births" at all seeds and no seed under the pointer. The "Hold to sow" rate, 30 seeds per second, is a constant of the work.
- **What the provenance records:** the viewport, which determines the size of the view, and the pointer emulation (`hasTouch`, `isMobile`). Sow's cap is 800 only with `(pointer: coarse) and (max-width: 800px)` and 2400 otherwise. Both exceed the 700 seeds of a recording, so they do not change what is recorded. The pointer emulation does change the Scope's beads (10 or 18) and, with them, when the engine goes still.
- **Determinism:** the initial bloom and the sowing SHALL depend only on page time. With the same garden, the same viewport, the same pointer emulation and the same page-clock sequence, they SHALL yield the same seeds, in the same order and at the same positions. Sow MUST NOT use randomness.

As long as sheet 004 links to this garden, the fixed link SHALL keep opening it. An automated check in the repository SHALL fail if the fixed link stops reading as the fixed garden (for example, because the version of the `#g=` format changed). That way, sheet 004 never silently leads to the default garden.

#### Scenario: Always the same garden
- **WHEN** the fixed link is opened in two new tabs, one after the other
- **THEN** both show the same mirror mode, the same drum angle, the `16` display in every view, the same specimens in the same order in "In the chamber" and, in Sow, the same angle and 610 seeds

#### Scenario: Same sowing
- **WHEN** the fixed garden is loaded twice with the same viewport, the same pointer emulation and the same controlled clock, Sow's bloom is allowed to finish and in both loads "Hold to sow" is held for the same sequence of clock steps
- **THEN** at each step Sow has the same number of seeds in both loads, each seed at the same position, and its view gives the same hash

#### Scenario: From sheet 004
- **WHEN** the visitor follows the link to the loop's garden from the museum's sheet 004
- **THEN** they arrive at `/bloomscope/` with the fixed garden loaded, at `16`, and Sow opens with the same angle and the same 610 seeds the loop starts with

#### Scenario: Changed format
- **WHEN** the version of the `#g=` format changes and the fixed link is not updated
- **THEN** the automated check fails

### Requirement: Pinned stage on phones
On a phone in portrait (up to 699 px wide and at least 521 px tall), the Sow and lathe sections SHALL present their toy as a pinned stage:
- the stage SHALL hold the toy's view (Sow's dial and plate, or the lathe's plant) and the section's peephole beside it;
- the stage SHALL stay pinned at the top of the screen while the section's controls scroll beneath it;
- the section's subtitle SHALL come before the stage;
- the stage SHALL release and scroll away when the section's controls end;
- the stage SHALL be painted in its section's field, with a hard ink edge below it and no fade;
- the stage's height SHALL be at most 46% of the small viewport height (`svh`), so that it never depends on the browser toolbar.

In landscape (up to 1023 px wide and at most 520 px tall), the stage SHALL occupy a left column at screen height, with the copy and controls scrolling on the right. The honeycomb SHALL place its frame on the left and its controls on the right.

The following SHALL hold on phones:
- every control of the section SHALL be operable while the toy it changes is fully visible;
- a vertical swipe over the pinned toy SHALL scroll the page;
- a control that receives focus MUST NOT remain hidden beneath the stage;
- nothing on the stage SHALL animate by itself;
- outside those two phone conditions, including every desktop viewport, the layout SHALL be unchanged.

#### Scenario: Stretching time on a phone
- **WHEN** the viewport is 390×844 or 390×664 with touch and the visitor drags "Stretch time" from `Rosette` to `Staircase`
- **THEN** throughout the drag the whole rosette stays on screen and can be seen rising into a staircase

#### Scenario: Sowing on a phone
- **WHEN** the viewport is 360×780 with touch and the visitor holds "Hold to sow" or drags "Scrub births"
- **THEN** the whole seed plate stays on screen while the seeds are added or dimmed

#### Scenario: Scrolling through the stage
- **WHEN** the stage is pinned and the visitor swipes vertically over the plant
- **THEN** the page scrolls and the stage stays pinned until the section's controls end

#### Scenario: Focus below the stage
- **WHEN** the stage is pinned and the keyboard focus moves to "Plump" while it lies beneath the stage
- **THEN** the page scrolls so that "Plump" is fully visible below the stage

#### Scenario: Landscape phone
- **WHEN** the viewport is 844×390 with touch and the visitor uses any lathe control
- **THEN** the plant is on screen at the left of the controls, at least 80% of it while the stage attaches or releases and all of it otherwise

#### Scenario: Honeycomb and its peephole
- **WHEN** the viewport is 390×844 or 390×664 with touch and the visitor presses the honeycomb's "Put in the Scope"
- **THEN** the frame, the button and the honeycomb's peephole are fully on screen together

#### Scenario: Desktop unchanged
- **WHEN** the page is rendered at 1440×900 or 1680×1050 without touch
- **THEN** every pixel is identical to the rendering before the pinned stage existed
