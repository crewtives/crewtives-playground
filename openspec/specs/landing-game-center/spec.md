# landing-game-center Specification

## Purpose

Define Game Center Yonjigen, the playground's Tokyo arcade landing. It is a game center building where each floor is a genre, scrolling is the elevator and each toy is a machine you actually play. It brings together four toys (Rain Run, the Win a World claw machine, the Parlour Glass and the Gas Tuner) and the index of the 4D.OS demos on 2F.

## Requirements

### Requirement: Landing served at its path
The landing SHALL be served at `/landings/game-center/` as part of the playground build described in `playground-hub`. Its `<title>` SHALL be `Game Center Yonjigen · crewtives playground`. All visitor-facing text SHALL be in English, except for the Japanese vocabulary of "Real, glossed Japanese". The footer SHALL carry the common lines from `playground-hub`.

#### Scenario: Open the landing
- **WHEN** the visitor opens `/landings/game-center/`
- **THEN** the page loads with no console errors, the tab reads `Game Center Yonjigen · crewtives playground` and the first thing in view is 1F

### Requirement: Six-floor building
The page SHALL present itself as a game center building. From top to bottom, the floors SHALL be, in this order: 1F RAIN RUN, 2F 4D.OS, 3F PRIZE, 4F PARLOUR, 5F LAB and RF ROOF. There MUST NOT be a Game of Life floor. Each floor SHALL have an accessible heading with its name and SHALL fill its full width with a single color field of its own:
- 1F: vermilion (the cabinet front);
- 2F: sodium yellow;
- 3F: candy pink;
- 4F: mint;
- 5F: carpet violet;
- RF: night sky.

Cobalt SHALL appear only as part of the control panels, never as a floor's field. The fields SHALL be light and bright: darkness stays only inside the screens, in the machines' glass and on the roof. Floors SHALL be separated by a hard-edged ink slab, with no blends between colors.

#### Scenario: Floor order
- **WHEN** the visitor scrolls down from 1F to the end of the page
- **THEN** they find 1F, 2F, 3F, 4F, 5F and RF in that order, and no floor contains a Game of Life

#### Scenario: No cobalt in the fields
- **WHEN** the background color of each floor is measured
- **THEN** each one is its assigned color and none is cobalt

### Requirement: Signage with a size cap
The PLAYGROUND marquee SHALL be at most 96 px font size at any viewport. Floor numerals SHALL be text of at most 96 px or sign plates drawn in SVG. In both cases they are decorative and SHALL be hidden from assistive technologies, because the floor is already announced in its heading and in the directory.

#### Scenario: Cap at every width
- **WHEN** the page is inspected at 1440, 1024 and 390 px wide
- **THEN** neither the marquee nor any text floor numeral exceeds 96 px font size

### Requirement: Floor directory and elevator
On desktop (≥ 1280 px) there SHALL be a fixed directory on the right edge, like a building's vertical sign. It contains:
- an elevator display with the current floor;
- six cells in building order (RF on top, 1F at the bottom), each with its numeral and its genre, and each as a link to its floor;
- the sound control.

Between 768 and 1279 px the directory SHALL show only the numerals. Below 768 px there SHALL be no directory column. Instead, an elevator button on the 1F control panel, and an elevator call button in the header of every other floor, SHALL open the same panel with six floor buttons. Each elevator button SHALL expose whether the panel is open, and closing the panel SHALL return focus to the button that opened it. On a coarse pointer every directory cell and every elevator button SHALL be at least 44 × 44 px.

When a floor crosses the middle of the viewport, the display SHALL show that floor and its cell SHALL be highlighted and marked as current for assistive technologies. With sound on, a ding plays. Choosing a floor in the directory or in the elevator panel SHALL take the visitor to that floor and add a history entry, so that Back returns to the previous floor. Scrolling SHALL be free: the page never pins a floor, snaps or takes over the scroll. On phones, a machine's screen MAY stay in view within its own floor while that machine's controls scroll beneath it (see "Phone machines keep their screen in view").

#### Scenario: Reach 3F by scrolling
- **WHEN** 3F crosses the middle of the viewport
- **THEN** the display reads 3F, the 3F cell is the only one highlighted and marked as current, and a ding plays only if sound is on

#### Scenario: Back goes down a floor
- **WHEN** the visitor chooses 4F and then 2F in the directory, and then presses Back in the browser
- **THEN** the page returns to 4F

#### Scenario: Elevator panel on phone
- **WHEN** at 390 px wide the visitor activates the elevator button
- **THEN** a panel opens with six keyboard-operable floor buttons, and Escape closes it and returns focus to the elevator button

#### Scenario: Elevator from an upper floor on phone
- **WHEN** at 390×844 the visitor is on 4F and activates that floor's elevator call button, then chooses 2F
- **THEN** the page reaches 2F, and pressing Back returns to 4F; had they pressed Escape instead, the panel would close and focus would return to 4F's call button

#### Scenario: Call buttons after a resize
- **WHEN** the page is loaded at 390×844, widened to 1024 px, narrowed to 390 px again, and the visitor activates 4F's call button
- **THEN** the panel opens, its floor display shows the current floor, and Escape returns focus to that call button

### Requirement: Desktop first screen
At 1440×900, without scrolling, the first screen SHALL show:
- the cabinet front in vermilion;
- the backlit marquee in sodium yellow with PLAYGROUND and, below it, "CREWTIVES · GAME CENTER YONJIGEN";
- an ink bezel with the band "LIVE · 16 COLOURS · EVERY MOMENT STAYS ON SCREEN", the HOW TO PLAY card on its wings, the three-position SCREEN selector and the SYNTHETIC SCENE label;
- a 4:3 CRT screen with Rain Run in ATTRACT, live and dithered, and its HUD: 1UP, HI, blinking DEMO, PRESS START and FREE PLAY;
- the control panel with the joystick, the A, B and C buttons and **1P START**;
- the directory with the six floors.

The primary action SHALL be START: the 1P START button, Enter with focus on the machine, or a tap on the screen. The secondary action SHALL be the directory's 2F cell, whose lamp SHALL pulse once on load.

#### Scenario: Everything in view
- **WHEN** the page finishes loading at 1440×900
- **THEN** without scrolling, PLAYGROUND, the live canyon of signs, PRESS START and the six floor names are readable

#### Scenario: Three ways to start
- **WHEN** in ATTRACT the visitor presses 1P START, presses Enter with focus on the machine, or taps the screen
- **THEN** Rain Run switches to PLAY

### Requirement: Phone first screen
At 390×844 and at 390×664 (a phone browser with its toolbars shown), without scrolling, the first screen SHALL show:
- the PLAYGROUND marquee with "GAME CENTER YONJIGEN";
- the CRT screen in 3:4 portrait with Rain Run in ATTRACT;
- the control panel with the elevator button, the joystick, the A, B and C buttons and START.

On these screens the control panel SHALL keep its full size (a touch area of at least 44 × 44 px per control, with no control overlapping another), and the CRT SHALL take the remaining height. Since there is no directory on phone, the first screen SHALL also have a direct, visible link to the 2F index (the five worlds) and the sound control. The page MUST NOT have horizontal scroll, and no content SHALL be clipped at 360 px wide.

#### Scenario: Link to the index
- **WHEN** at 390×844 the visitor activates the first screen's 2F link
- **THEN** the page reaches the 2F index of the five worlds

#### Scenario: No horizontal scroll
- **WHEN** the viewport is 390 px wide
- **THEN** the document does not scroll horizontally on any floor, including the 2F cabinet aisle

#### Scenario: Real phone height
- **WHEN** the page loads at 390×664 or at 360×640
- **THEN** the whole cabinet is within the viewport, no two controls' boxes intersect, and every control is at least 44 × 44 px

#### Scenario: Nothing clipped at 360
- **WHEN** the viewport is 360 px wide and every floor has booted
- **THEN** no element except the 2F aisle's contents extends past the viewport's right edge, and all eight YONJIGEN letters of the Gas Tuner are fully visible

### Requirement: HOW TO PLAY card and machine states
Each playable machine SHALL have a printed, always-visible HOW TO PLAY card beside it, never in a tooltip, with its pointer and keyboard controls. Machine states SHALL be named with a single vocabulary: ATTRACT, PLAY, TIME VIEW, GAME OVER and 調整中 UNDER ADJUSTMENT.

#### Scenario: Card without looking for it
- **WHEN** the visitor reaches a floor with a playable machine
- **THEN** they read the HOW TO PLAY card without hovering or focusing any control

### Requirement: Rain Run, game rules
Rain Run SHALL be a flying game: the visitor pilots an air taxi through a canyon of signs in the rain and passes through light gates. The states SHALL be ATTRACT → PLAY → GAME OVER → ATTRACT. TIME VIEW opens on demand during PLAY and on its own at GAME OVER.
- **ATTRACT:** an autopilot flies toward each gate, the HUD reads DEMO and no score is saved.
- **PLAY:** 90 seconds and 3 lives.
- **Gates:** passing through one adds 100 × the combo. The combo rises by 1 for each consecutive gate, up to ×8, and a missed gate resets it to ×1.
- **BOOST (A):** multiplies speed by 1.5 for 1.2 s and then needs a 3 s recharge, visible in the HUD.
- **Crash:** touching a sign or a gate frame costs a life, resets the combo to ×1 and grants 1 s of invulnerability. The crash spark MUST NOT be a white flash.
- **End:** the game ends upon reaching 0 lives or 0 seconds.
- **Return to ATTRACT:** after 20 s without interaction following GAME OVER.

The canyon SHALL be symmetric: the right side is the exact mirror of the left about the vanishing axis. The horizontal position of the gates SHALL alternate sides of that axis.

#### Scenario: Start a game
- **WHEN** the visitor activates START in ATTRACT
- **THEN** the game starts with 90 seconds, 3 lives, combo ×1 and score 0

#### Scenario: Combo
- **WHEN** the visitor passes through three gates in a row and misses the fourth
- **THEN** they score 100, 200 and 300 points and the combo returns to ×1

#### Scenario: Out of lives
- **WHEN** the visitor crashes for the third time
- **THEN** the machine goes to GAME OVER and opens TIME VIEW on its own

#### Scenario: ATTRACT does not score
- **WHEN** the autopilot passes through gates in ATTRACT
- **THEN** the saved HI does not change

#### Scenario: Mirrored canyon
- **WHEN** the canyon is generated with any seed
- **THEN** every tower and every sign on the right side is the exact reflection of one on the left side, and no gate is on the same side of the axis as the previous one

### Requirement: Rain Run, TIME VIEW
The taxi's pose (position, roll, pitch and advance) SHALL be recorded 12 times per second throughout the game, up to 1080 poses. During flight a trail of the last 72 poses SHALL be visible, aged in color.

TIME VIEW is the landing's signature interaction. It SHALL swing the camera 90° to a side view and show the entire flight as a chronophotographic ribbon:
- one pose in every 3 on desktop and one in every 6 on phone;
- the gates passed through, lit;
- the number of moments shown, on screen, for example `214 MOMENTS`.

The swing SHALL last 1.2 s and SHALL be the largest camera move on the page. A time strip below the screen SHALL let the visitor scrub through the ribbon by dragging or with ←/→ in steps of 1/12 s. In PLAY, C SHALL open TIME VIEW with the game paused, and C again SHALL resume it without deducting clock time.

#### Scenario: GAME OVER exposes the flight
- **WHEN** on desktop a game that lasted 60 s ends
- **THEN** TIME VIEW draws 240 poses (one in every 3 of the 720 recorded) and the number of moments shown matches the poses drawn

#### Scenario: Pause with C
- **WHEN** in PLAY the visitor presses C, waits 5 s and presses C again
- **THEN** the game clock reads the same as before the first press

#### Scenario: Scrub with the keyboard
- **WHEN** focus is on the time strip and the visitor presses →
- **THEN** the ribbon's cursor advances 1/12 s

### Requirement: Rain Run, ghost and local high score
The HI SHALL be saved only in this browser and labeled "this browser only". The best game SHALL be saved as the sequence of recorded poses, not as control inputs, and SHALL be replayed in subsequent games as a translucent candy-pink ghost. The B button (X key) and the service panel's GHOSTS switch SHALL show or hide the ghost, in sync. If browser storage is unavailable, the game SHALL work just the same, without a persistent HI and without a ghost.

#### Scenario: New high score
- **WHEN** a game beats the HI
- **THEN** the HI updates and, in the next game, the ghost follows exactly the recorded poses of that game

#### Scenario: Worse game
- **WHEN** a game does not beat the HI
- **THEN** the ghost is still the one from the best game

#### Scenario: Storage blocked
- **WHEN** the browser refuses local storage
- **THEN** the game plays through without errors and, on reload, the HUD shows `HI ------`

### Requirement: Rain Run, keyboard and accessibility
Rain Run SHALL be fully playable with the keyboard:
- arrows or WASD steer; Z is A (BOOST); X is B (GHOST); C is TIME VIEW; Enter is START;
- the on-screen joystick SHALL also have four arrow buttons;
- the game area SHALL have an accessible name that describes its controls;
- while the game has focus, the arrows and the space bar MUST NOT scroll the page, and Tab SHALL move focus out of the game;
- a live region SHALL announce gates, crashes and TIME VIEW (for example "Gate 12, combo 4", "Crash, 2 lives left", "Time view: 214 moments shown"), at most once every 2 s.

#### Scenario: Keyboard-only game
- **WHEN** the visitor focuses the machine, presses Enter and plays with the arrows, Z and C
- **THEN** they complete a game and open TIME VIEW without using the pointer, and the page does not scroll

#### Scenario: Throttled announcements
- **WHEN** the visitor passes through several gates in under 2 s
- **THEN** the live region announces at most once in that interval

### Requirement: Win a World claw machine, rules and physics
3F SHALL have a prize claw machine with the rules of Japanese machines. Button ① moves the claw to the right while held. Button ② moves it toward the back while held, and on release the claw drops. Each button SHALL be usable only once per attempt, and the machine SHALL always be on FREE PLAY.
- **One layer:** the capsules SHALL form a single layer on the machine's floor. They push one another across that plane and never stack.
- **Fixed path:** the descent, the close, the ascent and the return to the prize chute SHALL follow a fixed path at fixed speeds.
- **Grip:** with the claw centered over a capsule, the grip SHALL succeed with probability 0.8, drawn with a seed. That probability SHALL be printed on the card. If the grip fails, the capsule SHALL slip at a height drawn with the same seed.
- **Nudges:** with the claw near but not centered, the prongs SHALL push the capsule. If a nudge carries it into the chute, it SHALL count as a prize.
- **Trail:** during the attempt, the claw's path SHALL remain dotted on the glass.
- **Contents:** the machine SHALL have 12 capsules on desktop and 8 on phone. Each world from A to E and the launcher SHALL be in at least one capsule; the rest are studio stickers.

#### Scenario: One use per button
- **WHEN** the visitor releases ① and presses it again in the same attempt
- **THEN** the claw does not move

#### Scenario: A single layer
- **WHEN** the capsules settle after any attempt
- **THEN** no capsule rests on another

#### Scenario: Printed probability
- **WHEN** 1000 attempts are simulated with the claw centered over a capsule
- **THEN** the proportion of grips falls between 0.77 and 0.83

#### Scenario: Contents on phone
- **WHEN** the claw machine loads at 390 px wide
- **THEN** there are 8 capsules and among them are worlds A to E and the launcher

### Requirement: Claw machine, prize tickets and prize list
When a capsule drops into the tray, it SHALL open and a thermal ticket SHALL print beside the machine.
- The ticket for a world or for the launcher SHALL be a real link to its path, for example "PRIZE · WORLD E · WHALE FALL · /4d-os/e/ · OPEN".
- A sticker's ticket SHALL offer "SAVE STICKER (PNG)". The image carries an emblem with order-6 symmetry generated from the capsule's seed, and its provenance written into the PNG's text metadata.
- The ticket holder SHALL hold at most 6 tickets: when the seventh arrives, the oldest leaves.
- Tickets SHALL be draggable and leave a trail.

Below the machine there SHALL be a prize list with the five worlds and the launcher as ordinary links. The list SHALL always be present: without playing, without WebGL2 and without JavaScript. No world SHALL depend on winning at the claw machine. The floor's card SHALL say "The claw grips 80% of the time. The only prizes are links, and all of them are listed below."

#### Scenario: Win a world
- **WHEN** world E's capsule drops into the tray
- **THEN** a ticket linking to `/4d-os/e/` prints and the live region says "Prize: world E, Whale fall. Ticket link added."

#### Scenario: Seventh ticket
- **WHEN** the ticket holder has 6 tickets and the visitor wins another
- **THEN** the oldest ticket leaves and 6 remain

#### Scenario: List without playing
- **WHEN** the visitor reaches 3F without having played
- **THEN** the prize list shows six links: the five worlds and the launcher

#### Scenario: Sticker with provenance
- **WHEN** the visitor saves a sticker
- **THEN** they download a PNG whose text metadata include the seed, the procedural origin and the playground's demo mark

### Requirement: Claw machine, keyboard and accessibility
The claw machine's buttons SHALL be real buttons with press-and-hold semantics, for pointer, touch and keyboard: hold → and then hold ↑, or 1 and then 2. Each button SHALL be described by the HOW TO PLAY card. A live region SHALL announce the position and the outcome: "Claw over capsule D", "Grabbed", "Slipped" and the prize.

#### Scenario: Keyboard-only attempt
- **WHEN** the visitor completes an attempt with the keyboard only
- **THEN** the claw moves while each key is held, drops on release of the second, and the live region announces the outcome

### Requirement: Parlour Glass, glass and symmetry
4F SHALL have a playable pachinko glass inside a chrome cabinet:
- **Pins:** a phyllotactic rosette, at the golden angle. A symmetry selector SHALL offer MIRROR (bilateral), 6-FOLD (dihedral of order 6), 8-FOLD (dihedral of order 8) and FREE (unsymmetrized phyllotaxis). In every mode, the clear gap between pins SHALL be larger than the ball's diameter.
- **Center:** a start pocket (heso) and two tulips on the axis. There MUST NOT be a gravity well: no force pulls the balls toward the center.
- **Windmills:** they spin only when a ball hits them.
- **Launchers:** in TWIN, two mirrored launchers fire at once at mirrored angles; in LEFT only one fires.
- **Play controls:** the handle sets the launch strength; LAUNCH fires 4 balls per second while held; POUR 50 fires 50 balls in 5 s; REPLAY SEED pours the same balls again; CLEAR GLASS clears the glass.
- **Determinism:** the physics SHALL advance with a fixed step and a seed.

#### Scenario: Mirror
- **WHEN** the mode is MIRROR
- **THEN** every pin has its exact reflection about the vertical axis

#### Scenario: Order 6
- **WHEN** the mode is 6-FOLD
- **THEN** every pin, rotated 60° about the center or reflected across the axis, lands on another pin or within the clear zone of the pocket, a tulip or a windmill

#### Scenario: Symmetry breaking
- **WHEN** in MIRROR and TWIN a pair of balls is launched
- **THEN** their trajectories are exact reflections of each other until the first ball-to-ball contact

#### Scenario: Same seed
- **WHEN** the visitor uses REPLAY SEED with the same strength
- **THEN** the balls repeat the same trajectories

#### Scenario: No well
- **WHEN** a ball passes near the center without touching pins or the pocket
- **THEN** its acceleration is only gravity and air drag

### Requirement: Parlour Glass, pocket and FEVER
Every ball that enters the center pocket SHALL be counted. Every seventh pocketed ball SHALL start FEVER: the tulips open for 6 s and the ring of 48 lamps chases at 2 Hz. During FEVER, no flash SHALL repeat more than 2 times per second. A counter SHALL show the balls launched, those in play and those pocketed.

#### Scenario: Seventh pocketed ball
- **WHEN** the seventh ball enters the pocket
- **THEN** FEVER starts and the tulips stay open for 6 s

#### Scenario: Next FEVER
- **WHEN** the fourteenth ball enters the pocket
- **THEN** another FEVER starts

### Requirement: Parlour Glass, shutter and rewind
The glass SHALL keep the balls' paths according to the shutter and SHALL be rewindable:
- **Shutter:** NOW · 1 s · 5 s · EVERY MOMENT sets how long the paths stay on the glass. In EVERY MOMENT, every path SHALL stay on the glass until CLEAR GLASS, with the points aged in color.
- **Jog wheel:** it SHALL cover the last 12 s (8 s on phone). Turning the outer ring steps forward or back frame by frame, with a detent every 1/30 s. Turning the inner ring sets a speed between −4× and +4×. J, K and L rewind, stop and advance, and NOW returns to the present.
- **When rewinding:** the balls SHALL climb back up between the pins, pocketed balls SHALL come out of the pocket and recent paths SHALL retract. The timecode SHALL read, for example, `REWIND −1.00×`.
- **On release:** the physics SHALL continue from that state, as a new branch.

#### Scenario: Rewind and continue
- **WHEN** the visitor rewinds 5 s and releases
- **THEN** the balls are where they were 5 s earlier and the simulation continues from there

#### Scenario: Pocketed balls come back out
- **WHEN** the rewind goes past the instant a ball entered the pocket
- **THEN** the ball is visible outside the pocket again and the pocketed counter drops by one

#### Scenario: EVERY MOMENT
- **WHEN** the shutter is on EVERY MOMENT and 20 s of launches pass
- **THEN** the glass keeps the paths of all balls launched since the shutter opened

### Requirement: Parlour Glass, keyboard and accessibility
The Parlour Glass SHALL be fully playable with the keyboard:
- the handle SHALL be a slider from 0 to 100, with ←/→ in steps of 5, and of 20 with Shift;
- LAUNCH SHALL work by holding the button or the space bar; on touch screens, by holding the button;
- symmetry, launchers and shutter SHALL be option groups operable with the arrows;
- the jog wheel SHALL be a slider whose value is read in words, for example "7.4 seconds ago, rewinding", and SHALL respond to J/K/L;
- the counter SHALL be announced politely at most every 5 s.

The floor SHALL say "Free balls. No bets, no prizes, nothing saved."

#### Scenario: Keyboard-only glass
- **WHEN** the visitor uses only the keyboard
- **THEN** they can set the strength, launch, change the symmetry, rewind with J and return to the present with NOW

### Requirement: Deep links per floor and per machine
Each floor SHALL have its address: `#1f`, `#2f`, `#3f`, `#4f`, `#5f` and `#rf`. Opening the page with one of them SHALL take the visitor to that floor without returning to the top, with the directory marking that floor. On 4F, COPY THIS MACHINE SHALL copy a URL with the symmetry, the launcher mode, the seed and the shutter; opening it SHALL lead to 4F with the machine in that state. An unknown address SHALL leave the page on 1F, and an invalid machine value SHALL fall back to its default without affecting the rest.

#### Scenario: Enter on 2F
- **WHEN** the visitor opens `/landings/game-center/#2f`
- **THEN** the page loads on 2F and the directory marks 2F

#### Scenario: Copy the machine
- **WHEN** the visitor chooses 8-FOLD, TWIN and EVERY MOMENT, copies the machine and opens that URL in another tab
- **THEN** 4F loads with 8-FOLD, TWIN, EVERY MOMENT and the same seed

#### Scenario: Invalid value
- **WHEN** the machine URL carries a symmetry that does not exist
- **THEN** 4F loads with the default symmetry and honors the URL's launcher mode, seed and shutter

### Requirement: Gas Tuner on the roof
The YONJIGEN sign SHALL stand on the RF parapet: eight hand-drawn single-line tube letters, between two vertical 四次元 signs mirrored about the axis.
- A five-position rotary selector SHALL choose the gas, each with its real discharge color: Neon orange-red, Helium peach pink, Argon pale lavender, Krypton off-white and Xenon violet-blue.
- Activating a letter SHALL light it with the chosen gas. STRIKE ALL SHALL light them from left to right.
- The strike SHALL be a single brightness pulse, and the tube SHALL warm up from its base.
- A strip below the sign SHALL record each strike as a mark in its gas's color.
- The caption SHALL say "Pick a gas. Pure argon glows lavender; the deep blue of most signs is argon with a drop of mercury."
- The toy SHALL work without WebGL2.
- With the keyboard, the selector responds to ←/→ and each letter is a button with an accessible name, for example "Strike letter Y".

#### Scenario: Strike with argon
- **WHEN** the visitor chooses Argon and activates the letter Y
- **THEN** the Y lights in pale lavender and a lavender mark appears on the strip

#### Scenario: STRIKE ALL
- **WHEN** the visitor activates STRIKE ALL
- **THEN** the eight letters light in order from left to right and the strip gains eight marks

#### Scenario: Gas Tuner without WebGL2
- **WHEN** the browser has no WebGL2
- **THEN** the Gas Tuner works the same as with WebGL2

### Requirement: Roof and ending
RF SHALL show a full-width retro display looking from the roof down into the canyon of signs in the rain. In place of the moon, a black disk with a lensed ring SHALL hang, with the caption "That's not the moon. It's the black hole from world E.", linked to `/4d-os/e/`. It is the only black hole on the page. Then come the Gas Tuner, the service panel and the ending:
- "CONTINUE? 9" SHALL count down once per second while the ending is in view, and stop when out of view. The count MUST NOT be announced second by second to assistive technologies.
- At 0 it SHALL read "GAME OVER · THANKS FOR PLAYING" with the **RIDE BACK TO 1F** button.
- RIDE BACK TO 1F SHALL take the visitor to 1F, with a ding if sound is on, and leave focus on START.
- The credits SHALL name the typefaces and their OFL license, the third-party libraries and the line "Scenes are synthetic and computed from equations". They SHALL also include the cat's CC-BY credit as it appears in `LICENSES.md`, the Japanese glossary and links to crewtives.com and to the 4D.OS launcher.

#### Scenario: Countdown in view
- **WHEN** the ending comes on screen, leaves after 3 s and returns
- **THEN** the count resumes from 6

#### Scenario: Return to 1F
- **WHEN** the visitor activates RIDE BACK TO 1F
- **THEN** the page reaches 1F, the directory marks 1F and focus is on START

### Requirement: Demo index on 2F
2F SHALL be the demo index and the page's second floor, with the content and rules of the shared index from `playground-hub`. It SHALL include:
- the headline "FIVE WORLDS. EVERY MOMENT AT ONCE.";
- the 4D.OS launcher sign with the link "OPEN THE LAUNCHER" to `/4d-os/`;
- a row of five cabinets, one per world, each as a single link to its path (from `/4d-os/a/` to `/4d-os/e/`). Each cabinet carries the letter on its marquee, the world's still image on its CRT, the name, a line, the SYNTHETIC SCENE label and OPEN;
- a ranking board: an accessible table with the columns WORLD / WHAT YOU SEE / ROUTE that repeats the same six links. Its first column is only A–E and LAUNCHER, with no invented ranks or scores.

The still images MUST NOT carry any dithering overlay: they are shown as captured. When off, each cabinet's CRT SHALL show the dimmed still image; with pointer or focus it turns on and shows the clean still image. The cat's CC-BY credit SHALL be visible next to images A, B and C. On phone the cabinets form a contained scrollable aisle and the board remains complete. The links to the worlds SHALL always be enabled and present in the static HTML.

#### Scenario: Links without JavaScript
- **WHEN** the page loads with JavaScript disabled
- **THEN** 2F contains the six links (the launcher and worlds A to E) and all of them work

#### Scenario: Untouched image
- **WHEN** a cabinet is turned on by focus
- **THEN** its CRT shows the still image with no layer or filter on top

#### Scenario: Cat credit
- **WHEN** the visitor looks at cabinets A, B and C
- **THEN** they see the CC-BY credit next to each of those images

#### Scenario: Honest board
- **WHEN** the ranking board is read
- **THEN** it has six rows, each with a link, and none shows a rank or a score

### Requirement: 調整中 lab on 5F
5F SHALL show, on the carpet-violet field, exactly three cabinets with dark screens, each with a paper card taped over the glass:
- "Lab slot 1: algorithmic art. Untitled. Not ready to play."
- "Lab slot 2: a physics sketch. Untitled."
- "Lab slot 3: a retro-futuristic app. Untitled."

Below them SHALL go the note "Machines get a marquee when they work. Nothing here has a name yet." The slots MUST NOT have a name, link or date. A toy that is not finished at publication SHALL appear on its own floor as a 調整中 cabinet with a card of the same kind, never hidden or faked, and that floor's links SHALL remain present.

#### Scenario: Three unnamed slots
- **WHEN** the visitor reaches 5F
- **THEN** they see three 調整中 cabinets and none contains a link, a proper name or a date

#### Scenario: Unfinished toy
- **WHEN** the claw machine is not ready at publication
- **THEN** 3F shows a 調整中 cabinet in its place and the prize list is still complete

### Requirement: Service panel
On the door of the RF machine room there SHALL be a block of 8 DIP switches. Each SHALL be an accessible switch with a name and a state, operable with the keyboard:
- SW1 SOUND: off by default;
- SW2–3 SCREEN: 00 = 16, 01 = 1-BIT, 10 = MILLIONS, with 16 by default. Every combination SHALL resolve to one of the three modes, and the panel SHALL show the resulting mode;
- SW4 RAIN: rain on the screens, on by default;
- SW5 GHOSTS: the Rain Run ghost, on by default;
- SW6 FLIP: mirrors all screens horizontally, off by default;
- SW7 ATTRACT: the automatic demo, on by default and off with reduced motion;
- SW8 FREE PLAY: fixed on and disabled, with the legend "always free".

Settings SHALL be saved per visitor in this browser. If storage is unavailable, the panel SHALL start with the defaults and everything SHALL keep working.

#### Scenario: Remember settings
- **WHEN** the visitor sets SCREEN to 1-BIT and reloads the page
- **THEN** all screens start in 1-BIT

#### Scenario: FREE PLAY fixed
- **WHEN** the visitor tries to change SW8
- **THEN** the switch stays on and is announced as disabled

#### Scenario: No automatic demo
- **WHEN** SW7 ATTRACT is off
- **THEN** the 1F screen shows the pre-exposed image from "Reduced motion" instead of the automatic demo

### Requirement: One screen mode for all screens
All live screens on the page (the 1F CRT, the claw machine, the 4F glass and the roof) SHALL be retro displays per `dither-display` and SHALL share a single mode: 16 colors by default, 1-bit or Millions. The SCREEN selector on the 1F bezel and switches SW2–3 SHALL be in sync. Changing either one SHALL change all screens on the next frame. The 2F still images MUST NOT be affected.

#### Scenario: Global change
- **WHEN** the visitor moves SCREEN to 1-BIT
- **THEN** on the next frame the region of each live screen, excluding the overlaid HUD, contains exactly two colors, and SW2–3 show 01

#### Scenario: Still images intact
- **WHEN** the mode changes to MILLIONS
- **THEN** the 2F still images do not change

### Requirement: Sound
Sound SHALL follow the common rules of `playground-hub`: synthesized, off by default and never audible without a visitor gesture in the current load. There SHALL be two synced controls: the directory's speaker grille (on phone, an equivalent control on the first screen) and SW1 on the service panel. Both SHALL show the visible text "Sound off" or "Sound on" and expose their pressed state. With sound on, each toy sounds like its machine. For example, the pitch of Rain Run's gates rises with the combo, and on the 4F glass the mirror's twin pins share a pitch, so the symmetry can be heard.

#### Scenario: Off by default
- **WHEN** a visitor with no saved settings loads the page and plays Rain Run
- **THEN** nothing sounds

#### Scenario: Synced controls
- **WHEN** the visitor turns sound on in the directory
- **THEN** the panel's SW1 appears on and both controls say "Sound on"

### Requirement: Reduced motion
With `prefers-reduced-motion: reduce`, the page SHALL apply the following live, without reloading:
- **1F Rain Run:** there is no automatic demo. The screen shows a pre-exposed image: the autopilot's flight advanced 20 s, frozen, with the 72-pose trail and the ghost drawn. The HUD does not blink. TIME VIEW cuts to the side view instead of swinging.
- **3F claw machine:** the claw moves only by the visitor's action, and the ticket appears printed all at once.
- **4F Parlour Glass:** the glass arrives already exposed: 20 s of pouring simulated off screen and painted as an EVERY MOMENT exposure.
- **RF:** the roof screen stays still. The Gas Tuner changes color without pulse or warm-up. The ending shows "GAME OVER · THANKS FOR PLAYING" directly with RIDE BACK TO 1F, with no countdown.
- **Page:** the marquee does not blink or sweep, the CRTs have no animated power-on, the floor numerals do not rise and elevator trips are jumps.

All toys SHALL remain playable. In any configuration, no element SHALL flash more than 3 times per second and no full field SHALL change color faster than 3 Hz.

#### Scenario: Still hero
- **WHEN** the page loads with reduced motion
- **THEN** the 1F screen shows the pre-exposed image and no new frames are rendered until the visitor presses START

#### Scenario: Live change
- **WHEN** the visitor turns on reduced motion in the system with the page open
- **THEN** the automatic demo stops without reloading

#### Scenario: Still playable
- **WHEN** with reduced motion the visitor presses START and plays until GAME OVER
- **THEN** Rain Run plays the same and TIME VIEW appears by cut, without a swing

### Requirement: Without WebGL2
Without WebGL2, the page SHALL remain complete:
- each CRT shows a still image of its scene, with 16-color dithering computed on the CPU from the same geometry; Rain Run is not playable;
- 2F uses the real still images;
- the Parlour Glass plays in 2D with the same physics, with fewer balls and with rewind disabled;
- the claw machine shows its 調整中 card and the prize list;
- the Gas Tuner works the same.

The page SHALL show the line "This machine's screen needs WebGL2. Here is a still, and the links all work." once. Without JavaScript, the HTML SHALL already contain all floors, all links, the lab cards, the prize list and the still images.

#### Scenario: Parlour in 2D
- **WHEN** the browser has no WebGL2
- **THEN** 4F plays in 2D, rewind appears disabled and the console shows no errors

#### Scenario: Without JavaScript
- **WHEN** the page loads without JavaScript
- **THEN** the six floors, the six index links, the prize list and the three lab cards are readable

### Requirement: Real, glossed Japanese
The page's Japanese SHALL come from a fixed, glossed vocabulary (ゲームセンター, 四次元, 調整中, 無料, 営業中, 景品 and the words on the signs) and SHALL always be drawn in the screen typeface. The canyon's signs SHALL show real words, never pseudo-kana or a fallback typeface. The credits SHALL include the glossary line "ゲームセンター game center · 四次元 fourth dimension · 調整中 under adjustment · 無料 free".

#### Scenario: Signs with an empty cache
- **WHEN** the page loads for the first time, with an empty cache
- **THEN** the canyon's signs show their Japanese words in the screen typeface from the first frame in which they are visible

### Requirement: Demo honesty
The page SHALL tell the truth about what it is:
- below the first screen, the 1F coin door SHALL say "FREE PLAY / 無料" and "The crewtives playground: experiments in motion, time and light that run live in your browser. Everything here is a demo; nothing costs anything.";
- no part of the page SHALL ask for money, coins, tokens, accounts or bets;
- the claw machine's probability SHALL be printed, and the only prizes SHALL be links;
- the HI SHALL be labeled "this browser only", and no board SHALL show invented ranks or scores;
- the 1F screen and each 2F still image SHALL carry the SYNTHETIC SCENE label;
- the page MUST NOT claim anything about what its code does not control.

#### Scenario: Full walkthrough
- **WHEN** the whole page is walked through
- **THEN** no price, coin, account or bet appears, and every possible claw machine prize is a link that is also in the prize list

### Requirement: Floors on demand
The toys on each floor SHALL load when the floor is less than one screen away. Before that, the floor's HTML (headline, HOW TO PLAY card and links) SHALL be present. Screens out of view MUST NOT render, and with the tab hidden the automatic demo SHALL stop.

#### Scenario: Only what is near
- **WHEN** the visitor is on 1F without having scrolled
- **THEN** the code for the claw machine and the Parlour Glass has not been downloaded yet and the roof screen does not render

### Requirement: Phone landscape
On a touch phone in landscape (coarse pointer, viewport at most 500 px tall), 1F SHALL become a handheld cabinet: the 4:3 CRT centered at full height, the joystick in a left control wing and A, B, C and START in a right control wing, all within the first screen, with no page scroll needed to play. Every control SHALL be at least 44 × 44 px. Because the page extends into the display's safe areas (`viewport-fit=cover`), the cabinet SHALL keep every control and the CRT inside the safe area: its padding on each side SHALL be at least that side's safe-area inset. Cobalt SHALL remain only on the control wings. On 3F and 4F, each machine's screen and its primary controls SHALL fit in one viewport height: the crane's buttons SHALL sit beside its glass, and the Parlour glass SHALL stay in view beside its control panels. These rules MUST NOT apply to a fine pointer at any size.

#### Scenario: Play in landscape
- **WHEN** Rain Run is opened at 844×390 or 667×375 on a touch device
- **THEN** the CRT, the joystick, A, B, C and START are all within the viewport, none overlap, each is at least 44 × 44 px, and the visitor completes a game without scrolling

#### Scenario: Wings clear of the notch
- **WHEN** 1F is opened at 844×390 on a touch device whose safe-area insets are 47 px on the left and right and 21 px at the bottom
- **THEN** no control and no part of the CRT lies within 47 px of the left or right edge or within 21 px of the bottom edge

#### Scenario: Desktop untouched
- **WHEN** a desktop window with a mouse is resized to 844×390
- **THEN** the page renders exactly as it did before this requirement existed

### Requirement: Phone machines keep their screen in view
Below 768 px wide, every playable machine SHALL let the visitor watch its screen while operating any of its controls:
- **1F Rain Run:** the joystick, A, B, C and START fit under the CRT on the first screen, and the TIME VIEW strip scrubs inside the CRT with a touch area at least 44 px tall.
- **3F claw machine:** the glass and buttons ① and ② share one screen, and the ticket rack follows directly under the machine, before the HOW TO PLAY card.
- **4F Parlour Glass:** the glass, its lamp ring and its counter stay in view (pinned within the floor) while the play panel and then the time panel (jog wheel, timecode, NOW) scroll beneath them. The HOW TO PLAY card comes after both panels. The pinned glass SHALL take at most 56% of the viewport height. A control that receives focus MUST NOT end up hidden under it. Swipes over the glass SHALL still scroll the page.
- **RF Gas Tuner:** the sign, the strike strip, the gas dial and STRIKE ALL share one screen.

Held controls (the joystick's arrows, the arcade buttons, START, the crane buttons and LAUNCH) SHALL keep their hold through small finger movements and MUST NOT start a page scroll, a text selection or a system callout. Text inside a push button (including the elevator panel's floor names and the arcade buttons' silkscreen letters) SHALL be at least 12 px. Other control labels (DIP switch names, the jog hub) and the SYNTHETIC SCENE tags SHALL be at least 11 px. Readouts drawn in the screen typeface are exempt.

#### Scenario: Rewind while watching
- **WHEN** at 390×664 the visitor launches balls and then turns the jog wheel back by touch
- **THEN** the whole glass is visible for the entire turn and the balls are seen climbing back

#### Scenario: Ticket in view
- **WHEN** at 390×844 the visitor wins a capsule with the glass and buttons in view
- **THEN** the printed ticket's top edge is within the viewport

#### Scenario: Held steer survives drift
- **WHEN** the visitor holds "Steer up" and their finger drifts 20 px
- **THEN** the steer stays held and the page does not scroll

#### Scenario: Focus below the stage
- **WHEN** at 390×844 the visitor tabs to the jog wheel
- **THEN** the jog wheel is fully visible below the pinned glass
