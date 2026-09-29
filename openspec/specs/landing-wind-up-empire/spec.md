# landing-wind-up-empire Specification

## Purpose

Define Wind-Up Empire, the playground landing that turns the space empire into a lithographed tin toy you wind up. It has a demo economy, declared fake, that resets; five physical toys (the friction rocket, the planet tops, the wind-up key, the litho press and the spark wheel); and the five real 4D.OS worlds, which appear as planets in the orrery and as an index in the box's tray. What the three landings share is set by `playground-hub`; this capability defines what belongs to this world.

## Requirements

### Requirement: Page at its route
The landing SHALL be served at `/landings/wind-up-empire/` with the tab title "Wind-Up Empire · crewtives playground" and SHALL meet the shared contracts of `playground-hub`. All visible text SHALL be in English. On load, the page MUST NOT scroll back to the top on its own, so that a link to `#worlds` lands on the tray.

#### Scenario: Built page
- **WHEN** the production build is generated and `/landings/wind-up-empire/` is opened
- **THEN** the page loads without console errors and the tab is titled "Wind-Up Empire · crewtives playground"

#### Scenario: Deep link to the worlds
- **WHEN** the visitor opens `/landings/wind-up-empire/#worlds`
- **THEN** the page stays positioned at the inner tray and does not jump to the lid

### Requirement: The unfolded box, one ink per face
The page SHALL read as an unfolded toy box. Each section is one face of the box, in this order:
1. the resource strip, pinned at the top;
2. the lid (the first screen), in cobalt `#1B2CC4`;
3. the inner tray, "Five worlds in the box", in turquoise `#17B7A0`;
4. the side panel of the box, "Run the empire", in vermilion `#CC2216`;
5. the instruction sheet, in orange `#FF7A1A` (amendment from the set review: chrome `#FFC81A` read the same as Game Center's sodium; chrome is kept for the lettering, the edge band and the buttons);
6. the print proof, in night cobalt `#0A0F4A` (the back of the lid), which ends in the footer.

Each face SHALL be flooded entirely in its ink, and its accents SHALL come from at most two other inks. Tin and paper SHALL appear only as objects on those fields: no section SHALL have a neutral background, whether white, gray or black. Space SHALL be cobalt ink, never a black screen. The edge of each field SHALL carry shading with the same 8×8 ordered dither the canvas display uses, and that shading SHALL darken as wind builds up.

#### Scenario: Walking through the box
- **WHEN** the visitor scrolls down from the lid to the end
- **THEN** they find the faces in the stated order, the tray is the second section and the page ends in the footer

#### Scenario: No neutral background
- **WHEN** each section's background is sampled outside its objects
- **THEN** the color is that face's ink and no section has a white, gray or black background

### Requirement: Toy box typography
The landing SHALL use four families:
- **Tilt Warp** for the box lettering: the H1, the section titles and the wordmark;
- **Rampart One** for the stamped plaques (planet names, world letters and the key's tag), never below 16 px. Below that size, the plaques SHALL use Libre Franklin 700;
- **Libre Franklin** 500 and 700 for body text, buttons, labels and the log;
- **Sono** only for numbers and measurements: drums, timers, coordinates, `r`, `v` and `t` readouts, and costs.

The slant of the box lettering SHALL come from Tilt Warp's own rotation axes, without stacked text shadows. Arrows and icons SHALL be custom SVG. Every number SHALL use tabular figures. The page MUST NOT include the reference to the Japanese toy makers.

#### Scenario: Families in use
- **WHEN** the fonts the page requests are listed
- **THEN** they are only Tilt Warp, Rampart One, Libre Franklin and Sono

#### Scenario: The title leans with the wind
- **WHEN** the visitor winds the key and then lets go
- **THEN** the H1 leans back in proportion to the accumulated wind, going no further than −10 on XROT or −28 on YROT, and returns to its resting shape as the wind runs down

### Requirement: Resource strip
At the very top there SHALL be a pressed-tin strip that stays pinned on scroll. It carries:
- on the left, the wordmark "WIND-UP EMPIRE" and a pink decal, "DEMO MODEL · FAKE ECONOMY";
- in the center, three odometer drums labeled "Tin", "Spring" and "Spark", each with its rate (for example, "+1.2/s"), and the spark wheel next to "Spark";
- on the right, the links "Worlds" (to the tray) and "How to play" (to the sheet) and the sound bell, with "Sound off" or "Sound on".

The first focusable element on the page SHALL be the "Skip to the worlds" link. The drums SHALL show the real values of the economy and roll digit by digit, with a small bounce on carry. If they change more than 20 times per second, they SHALL switch to a blurred roll.

#### Scenario: First focus
- **WHEN** the visitor presses Tab once after load
- **THEN** focus is on "Skip to the worlds", and activating it takes the page to the tray

#### Scenario: Drums always in view
- **WHEN** the visitor is reading the instruction sheet
- **THEN** the strip is still visible at the top and its drums keep changing with production

### Requirement: First screen as diagonal box art
At 1440×900, the first screen SHALL be the box lid: a cobalt field inside a lithographic frame with a chrome rule and a vermilion rule. It SHALL be composed with 180° rotational symmetry (C2) about a diagonal, not mirrored about a vertical axis:
- the H1 "WIND-UP EMPIRE" in chrome, tilted −8° over the top-left corner. It rides over the orrery's top-left quadrant the way box lettering rides over the illustration, and SHALL be seen above the scene where they overlap;
- next to the H1, the subtitle "A demo space empire that runs on springs. Five real worlds orbit the Whirl.";
- the orrery dithered to 16 inks, centered around (800, 520). It contains the Whirl, the five world tops at rest, the home top in front with the rocket in its cradle, and the exposures of the demo flight;
- under the rocket, the plaque "PULL BACK TO LAUNCH";
- the BUILD instrument (the key with its rosette and the queue ticket) in the top-right corner;
- the FLEET instrument (the gauge and the log) in the bottom-left corner;
- along the bottom edge, the chrome band. On the left it reads "DEMO MODEL · FAKE ECONOMY · RESETS ON RELOAD". On the right it has the button "Five real worlds inside · Open the box", with a down arrow, which leads to the tray.

While the lid is on screen and motion is allowed:
- the planets orbit at their Kepler speed and leave exposures;
- the tops spin with their print smeared into rings;
- the stars twinkle;
- at 0.8 s the demo flight launches, and the gauge needle follows it.

#### Scenario: Composition at 1440×900
- **WHEN** the landing opens at 1440×900 without scrolling
- **THEN** all of this holds:
  - the H1 is rotated −8° (±0.5°) in the top-left area, crosses the orrery's top-left quadrant and is seen above the scene;
  - the orrery's center is less than 24 px from (800, 520);
  - BUILD occupies the top-right corner and FLEET the bottom-left;
  - the band is fully visible, with its button

#### Scenario: Rotational symmetry, not mirror symmetry
- **WHEN** the centers of the BUILD and FLEET groups are measured at 1440×900
- **THEN** their midpoint is less than 32 px from the orrery's center, and the two groups sit in diagonally opposite quadrants, not on either side of a vertical axis

#### Scenario: The first seconds
- **WHEN** the landing finishes loading with motion allowed
- **THEN** at 0.8 s "Rocket 0 · demo flight" launches, the log reads "Rocket 0 · demo flight left home." and, by 3 s, the rocket's whip around the Whirl is already printed over the orrery

### Requirement: First screen on phones and intermediate widths
At 390×844, the lid SHALL stack as follows, without the diagonal composition:
- the strip in two rows: on top, the wordmark, the decal, the bell and the menu; below, the three drums and the spark wheel;
- the H1 centered on two lines, "WIND-UP" and "EMPIRE";
- the subtitle;
- the orrery, with the rocket in its cradle and a grab area of at least 120×120 px;
- the rail plaque;
- the key and the gauge, as two side-by-side tiles;
- the whole band, on two lines, with its button to the worlds.

The ticket and the log SHALL start just below the fold. On phones, the tops SHALL scale so that the smallest has a radius of at least 14 px. Above 900 px wide, the diagonal composition SHALL hold, scaled to the width. At 900 px or less, the instruments SHALL leave the lid's corners and form a row of two tiles under the orrery.

#### Scenario: 390 px phone
- **WHEN** the viewport is 390×844
- **THEN** without scrolling, the H1, the orrery with the rocket, the key, the gauge and the button "Five real worlds inside · Open the box" are visible, and the page has no horizontal scroll

#### Scenario: 900 px width
- **WHEN** the viewport is 900 px wide
- **THEN** the key and the gauge form a row under the orrery and do not occupy the lid's corners

### Requirement: Lifting the lid
The only scroll-linked motion on the whole page SHALL be lifting the lid. It happens during the first 60 vh of scroll:
- the lid rises 1.35 times faster than the scroll;
- the scene camera tilts up, from 0° to 10°;
- whatever overlaps the lid scales down from 1 to 0.96;
- a drop shadow grows over the tray.

As the lid lifts, the tray SHALL appear right beneath it. The frame's offset and the camera's tilt SHALL advance with a single progress value. No element hosting a 3D view SHALL receive CSS 3D transforms. No other section SHALL have entrance animations, fades or slides: all other motion comes from the toys.

#### Scenario: Frame and scene in sync
- **WHEN** the visitor stops scrolling halfway through the lift
- **THEN** the lid's frame and the orrery scene show the same progress, with no lag between the painted edge and the view

#### Scenario: No other entrances
- **WHEN** the visitor scrolls down through the side panel, the sheet and the proof
- **THEN** no element fades in or slides as it enters the screen

### Requirement: Tin orrery
The orrery SHALL be a flat-shaded low-poly scene, lit by a single window light from the upper left. It contains:
- **The Whirl**, the black hole as a squat tin top:
  - an ink horizon and golden logarithmic spiral arms alternating vermilion and chrome: 3, 5 or 8 arms depending on the press, 5 by default;
  - an accretion ring, orange on the approaching side and lemon on the far side;
  - a spin that SHALL grow with the accumulated wind and get a pulse each time it swallows a rocket;
  - nearby stars SHALL shift as if through a gravitational lens, a nod to world E.
- **Seven circular orbits**, with radii growing by √φ and Kepler speeds, with a period of 4.0 s on the innermost orbit. From inside out:
  - E · Whale fall `[1:1:1]`;
  - D · The golden stoop `[1:1:2]`;
  - A · Vitrine `[1:1:3]`;
  - B · Plate `[1:1:4]`, featured with the largest world top;
  - C · Leader `[1:1:5]`;
  - the home top `[1:1:6]`, parked at the front of the view, which spins in place and serves as the launch pad;
  - the lab ring `[1:1:7]`, with three unprinted tin sockets 120° apart, still and unlinked.
- Five-pointed lithographic **stars**, distributed almost uniformly. They twinkle with a color step every 2.4 to 6 s, never with a flash.
- **A scale** with ticks every 0.25 units along the +x axis.

On load and after "Reset universe", the five worlds SHALL come to rest 72° apart, so that they form a golden logarithmic spiral. Each planet SHALL leave about 24 exposures per revolution, so each ring shows its own recent past.

Across the page, stroke SHALL encode state, so that color is never the only cue:
- solid: done or confirmed;
- dashed: queued or planned;
- dotted: blocked or out of reach.

In the orrery, charted rings SHALL be solid, rings not yet charted dashed, and the lab ring dotted.

#### Scenario: Golden spiral rest pose
- **WHEN** the page loads, or the visitor presses "Reset universe"
- **THEN** the five worlds sit 72° apart on their orbits, and the reset brings them to that pose in three 400 ms ratchet clicks

#### Scenario: Rings made of the past
- **WHEN** a planet completes a revolution with motion allowed
- **THEN** its ring shows about 24 of its exposures, lightening by dither density from newest to oldest

#### Scenario: State by stroke in 1-bit
- **WHEN** the display is in 1-bit
- **THEN** the charted rings, the not-yet-charted rings and the lab ring can still be told apart as solid, dashed and dotted

### Requirement: Demo economy with visible costs
The landing SHALL run a fake economy, declared as such, with three resources:
- **TIN**;
- **SPRING**: the stored winding turns, from 0 to 12;
- **SPARK**.

On load, the initial state SHALL be:
- 60 TIN, 0 SPARK and 0 SPRING;
- the tin mine at level 1, producing;
- the launch gantry at level 1;
- the observatory unbuilt;
- the queue with "Tin mine → Lv 2" already ordered, so the first wind builds something visible.

The buildings SHALL be:

| building | effect | cost | wind time |
|---|---|---|---|
| Tin mine | produces `1.2 · 1.35^(L−1)` TIN/s at level L | level n ≥ 2: `30 · 1.6^(n−2)` TIN (30, 48, 77, 123…) | `min(45, 6 · 1.4^(n−2))` s (6, 8.4, 11.8, 16.5…) |
| Launch gantry | as many rockets in flight at once as its level, from 1 to 4 | levels 2, 3 and 4: 40, 64 and 102 TIN | 8, 11 and 15 s |
| Observatory | each level enables research on one row of the press | levels 1, 2 and 3: 50, 80 and 128 TIN | 10, 14 and 20 s |

Each build option SHALL show its cost and its wind time before it is ordered. The queue SHALL hold 3 jobs. A disabled button SHALL say why, for example "Needs 12 more tin".

#### Scenario: Initial state
- **WHEN** the page finishes loading
- **THEN** the drums start at 60 for Tin and 0 for Spark, the mine produces "+1.2/s" and the queue contains "Tin mine → Lv 2 · 30 tin · 6 s"

#### Scenario: Visible cost and reason for the block
- **WHEN** the visitor has 18 TIN and the mine's next level costs 30
- **THEN** the button to order it shows the cost, is disabled and says "Needs 12 more tin"

#### Scenario: Full queue
- **WHEN** the queue already has 3 jobs
- **THEN** no order button is enabled, and each one says why

#### Scenario: Production upgrade
- **WHEN** the tin mine reaches level 2
- **THEN** the Tin rate becomes "+1.6/s" (1.62 TIN per second)

### Requirement: The economy runs on its own clock
The economy SHALL advance on its own 10 Hz timer, independent of which views are on screen. Production, research and the unwinding spring SHALL continue even when the lid is not visible. On returning from a hidden tab, the economy SHALL catch up according to the elapsed time, capped at 5 minutes of production. The drums SHALL update only when a visible digit changes.

#### Scenario: Lid off screen
- **WHEN** the mine is at level 1 and the visitor spends 10 s on the instruction sheet, with the lid off screen
- **THEN** Tin has increased by 12, within a tolerance of one 0.1 s tick

#### Scenario: Hidden tab
- **WHEN** the tab stays hidden for 10 minutes with the mine at level 1, and the visitor comes back
- **THEN** Tin has increased by at most 360, which equals 5 minutes of production

### Requirement: Nothing in the game persists and nothing is sent
No game state SHALL survive a reload, and the page MUST NOT save it to any browser storage. Game state includes resources, levels, queue, research, charted planets, rosette, tickets, exposures and the print proof. The page MUST NOT send data. The only thing it saves in the browser is the sound preference from `playground-hub`.

The page SHALL say that the game is fake in three places:
- on the lid's band: "DEMO MODEL · FAKE ECONOMY · RESETS ON RELOAD";
- in the side panel's lede: "Every number here is made up by this page. The springs, orbits and dither are real.";
- on the sheet's warning plaque: "Contains a fake economy. The numbers are invented by this page and vanish when you reload. This page stores nothing and sends nothing. The one exception: your sound setting stays in this browser."

The page MUST NOT say "No accounts, no scores, no tracking" nor claim anything about what its code does not control, such as the hosting's analytics.

#### Scenario: Reload
- **WHEN** the visitor builds, researches, charts planets and reloads the page
- **THEN** the page returns exactly to the initial state

#### Scenario: What it stores and what it sends
- **WHEN** browser storage and the network are recorded while the visitor uses every toy and saves the proof
- **THEN** the only key stored is the sound preference, the only requests are for the page's own resources and none carries game state

#### Scenario: Honest sentence
- **WHEN** the page text is searched
- **THEN** "This page stores nothing and sends nothing." appears followed by the sound exception, and "no tracking" does not appear

### Requirement: Reset universe and Skip the grind
"Reset universe" is a tin lever on the side panel and also a button on the sheet. It SHALL:
- return the economy to the same initial state as a fresh load;
- clear the rosette and the tickets;
- bring the planets to their golden spiral rest pose;
- log "Universe reset. Back to 60 tin."

"Skip the grind: unlock everything" is on the side panel and on the sheet. It SHALL raise every building below level 3 to that level and mark all three press rows as researched. No aesthetic effect SHALL stay locked for anyone: everything the economy unlocks SHALL be unlockable with that single button.

#### Scenario: Reset
- **WHEN** the mine is at level 4, there is a printed rosette and tickets on the spike, and the visitor presses "Reset universe"
- **THEN** Tin returns to 60, the mine returns to level 1, the rosette and the tickets disappear and the log reads "Universe reset. Back to 60 tin."

#### Scenario: Skipping the grind
- **WHEN** the visitor presses "Skip the grind: unlock everything" right after the page loads
- **THEN** all three buildings are at level 3 or higher, and any position on the three press rows can be chosen

### Requirement: Log that narrates every action
Every toy action SHALL write to the log ("Survey log") a deterministic sentence in plain English. The log SHALL be a polite live region. On the lid, its last four lines SHALL be visible, newest on top. Every loss in the game SHALL be refunded or undoable.

#### Scenario: One line per action
- **WHEN** a rocket launched by the visitor ends up swallowed by the Whirl
- **THEN** the log adds exactly one new line on top, "Lost to the Whirl. Rocket refunded: this is a demo.", and a screen reader announces it without interrupting

### Requirement: Friction rocket, the signature toy
The rocket SHALL stand in a tin cradle on the home top, at the front of the orrery, above the plaque "PULL BACK TO LAUNCH". The visitor grabs it and pulls it back, like a slingshot:
- the pull distance SHALL be quantized into 12 notches. Each notch SHALL give a tick, a 1 px jolt of the cradle and more sparks;
- the aim SHALL be measured from the direction toward the Whirl and limited to ±60°. Positive values point in the direction of the orbit;
- the rocket SHALL draw back according to the pull and the cradle SHALL turn toward the aim. At full pull, the rocket SHALL vibrate;
- while it is held, a dashed ghost trajectory SHALL show the next 3 s of flight. It SHALL be recomputed on every change of pull or aim.

Releasing with at least one notch SHALL launch the rocket after a brief hitch. Releasing with no notches, or pressing Escape, SHALL cancel without launching.

#### Scenario: Pull and preview
- **WHEN** the visitor pulls the rocket back 6 notches and then changes the aim without releasing
- **THEN** there is one tick per notch and the dashed ghost trajectory changes with each adjustment

#### Scenario: Cancel
- **WHEN** the visitor pulls the rocket back and presses Escape, or releases it at notch 0
- **THEN** no flight launches and the log does not change

### Requirement: Flight in a real orbit with stamped exposures
Each flight SHALL be integrated with velocity Verlet, at a fixed step and in real time. The only force SHALL be the Whirl's gravity. The planets SHALL be only capture targets, with no gravity of their own, so the outcome depends only on the pull, the aim and the moment of launch. The launch velocity SHALL be the home circular-orbit velocity plus an impulse proportional to the pull, directed toward the Whirl and rotated by the aim.

Every 1/12 s of flight, an exposure of the rocket SHALL be stamped along its path. Exposures SHALL age as print density, from full ink to 1-bit stipple, with no transparency or blending. The newest SHALL be shown in pink. The exposure memory SHALL be 12, 48 or 200 moments, depending on the press; by default, 48.

#### Scenario: Deterministic flight
- **WHEN** the same pull, the same aim and the same launch moment are repeated
- **THEN** the trajectory and the outcome are identical

#### Scenario: Exposures by density
- **WHEN** a flight has been in the air for 2 s with the memory at 48
- **THEN** there are 24 exposures along the path, the newest in pink, and the oldest look sparser in the dither, not more transparent

### Requirement: Flight outcomes
During the flight, every **survey** SHALL be recorded. A survey happens when the rocket passes within 0.06 units of the edge of a world top. Then:
- the planet becomes charted: its ring turns solid and its cavity in the tray gets the "CHARTED" tab;
- the top speeds up;
- the first survey of each planet SHALL give +25 SPARK and later ones +5;
- the rocket SHALL keep flying, so a single flight can chain surveys. The log SHALL summarize them in one line for the flight, for example "Rocket 3 surveyed Plate [1:1:4] and Leader [1:1:5] in one flight. +30 spark."

Each flight SHALL end in one of three endings, always recorded in the log:
- **swallowed**: the rocket crosses the horizon, 0.45 units from the center. It stretches radially up to ×5 over 400 ms and turns pink, and its last 6 exposures stretch with it. The Whirl gets its spin pulse. The log reads "Lost to the Whirl. Rocket refunded: this is a demo.";
- **escape**: the rocket goes more than 5.2 units from the center. The log reads "Left the system. Rocket refunded.";
- **timeout**: at 20 s with no other ending, the rocket fades back home. The log reads, for example, "Rocket 5 came home after 20 s. It never found a planet."

A swallowed or escaped rocket SHALL return to the fleet.

#### Scenario: Swallowed at full pull
- **WHEN** it is launched with all 12 notches and the aim at −60°
- **THEN** the rocket is swallowed at about 2.56 s

#### Scenario: Grazing slingshot
- **WHEN** it is launched with all 12 notches and the aim at −20°
- **THEN** the rocket passes about 0.46 units from the center and escapes at about 6.2 s

#### Scenario: Direct escape
- **WHEN** it is launched with all 12 notches and the aim at 0°
- **THEN** the closest point to the center is about 1.39 units away and the rocket escapes at about 5.75 s

#### Scenario: Bound orbit
- **WHEN** it is launched with 3 notches and the aim at 0°
- **THEN** the rocket stays bound to the Whirl and ends by timeout at 20 s

#### Scenario: Chained survey
- **WHEN** a flight passes by Plate and then by Leader, and neither of them was charted
- **THEN** both rings turn solid, both cavities get "CHARTED", Spark rises by 50 and the log adds a single line for the flight that names both

### Requirement: Fleet, demo flight and FLEET gauge
The rockets in flight at the same time SHALL be at most as many as the launch gantry's level, and never more than 2 on phones. When all of them are out, the rail plaque SHALL switch to a dashed stroke and say, for example, "All rockets out (1/1)".

With motion allowed, "Rocket 0 · demo flight" SHALL launch on load at full pull with the aim at −20°, logged as a demo flight.

The FLEET gauge SHALL be a round tin gauge:
- it has a scale from 0 to 5 units, with ticks at the radius of each orbit, labeled E, D, A, B, C and a home icon;
- its needle shows, with a spring's inertia, the distance to the center of the last rocket launched;
- below it, Sono readouts such as `r 0.46 · v 3.12 · t 00:02.2`, taken from the simulation;
- at rest, the needle points to the home orbit.

#### Scenario: All rockets out
- **WHEN** the gantry is at level 1 and a rocket is in flight
- **THEN** the rail plaque is dashed and says "All rockets out (1/1)", and the rocket in the cradle cannot be launched until the flight ends

#### Scenario: Gauge true to the simulation
- **WHEN** the gauge readout is compared with the simulation during a flight
- **THEN** the values of `r`, `v` and `t` match the last rocket's simulated distance to the center, speed and flight time, and the needle follows them until it settles

#### Scenario: Gauge at rest
- **WHEN** no rocket is in flight
- **THEN** the needle rests on the home mark

### Requirement: Rocket operable by keyboard and on touch screens
The rocket's grab area SHALL be a button named "Rocket on the launch cradle. Hold Space to pull back, Left and Right to aim, release Space to launch." With focus on it:
- holding Space SHALL add a notch every 90 ms;
- Left and Right SHALL move the aim in 5° steps;
- releasing Space SHALL launch;
- Escape SHALL cancel.

Under the rail plaque there SHALL be a visible row of controls:
- the "Aim" slider, from −60 to 60 in steps of 5, with a readable value such as "20 degrees toward prograde";
- the "Pull-back" slider, from 0 to 12;
- the "Launch" button.

On touch screens, only the rocket's grab area and the key's SHALL capture the gesture. On the rest of the canvas, a vertical drag SHALL scroll the page.

#### Scenario: Launch with the keyboard
- **WHEN** the visitor focuses the rocket, holds Space for 1.1 s, presses Right four times and releases Space
- **THEN** the rocket launches with 12 notches and the aim at +20°, and the outcome reaches the log

#### Scenario: Scrolling on a phone
- **WHEN** on a phone the visitor drags vertically over the orrery, away from the rocket
- **THEN** the page scrolls and no toy activates

### Requirement: Planet tops that open real worlds
Each world top SHALL carry a name plaque that follows its on-screen position, with the world's letter and name in Rampart One and the coordinate `[1:1:n]` in Sono. The plaque SHALL also be the touch area for the top, at least 64 px. The visitor spins a top in three ways:
- **flick**: a drag of at least 8 px that ends on release gives it a spin proportional to the gesture's speed, with a minimum and a maximum;
- **tap**: adds spin;
- **Enter or Space** on the focused plaque: adds spin.

When the pointer passes over the plaque or the plaque gets focus, a tin tag SHALL open with two actions: "Spin" and "Open <world name>", for example "Open Vitrine". This second action is a real link to the world's route, from `/4d-os/a/` to `/4d-os/e/`, which opens in the same tab. The link SHALL always be enabled: charting a planet is only cosmetic.

Each top's print SHALL combine phyllotaxis dots and bands with the symmetry set by the press, in its world's inks. Spinning slowly, the dots show. Spinning fast, the print smears into rings: the top shows all its orientations at once. The spin SHALL decay over time, and the top SHALL precess and tilt. Below a certain speed, it SHALL topple with two bounces and a metallic clunk. On load, the five world tops spin fast and topple at about 15 s, to invite the first flick.

The plaques SHALL be real buttons, in the order E, D, A, B, C and home, and the arrow keys SHALL move focus among them. The orrery canvas SHALL be named "Tin orrery: five 4D.OS worlds as spinning tops around a black hole called the Whirl". It SHALL summarize live how many planets are charted and how many are spinning. On phones, a horizontal flick on a planet SHALL spin it and a vertical drag SHALL scroll.

#### Scenario: Flick
- **WHEN** the visitor gives a fast flick to a top that is still
- **THEN** the top spins, its print goes from dots to rings and, with sound on, its hum rises with its speed

#### Scenario: Opening a world without playing
- **WHEN** the visitor focuses B's plaque without having charted any planet and activates "Open Plate"
- **THEN** `/4d-os/b/` opens in the same tab

#### Scenario: Toppling
- **WHEN** no one touches a top for about 15 s after load
- **THEN** the top slows down, topples with two bounces and stays still until the next flick

#### Scenario: Plaques by keyboard
- **WHEN** the visitor focuses E's plaque and presses the right arrow four times
- **THEN** focus moves through D, A, B and C, in that order

### Requirement: Each world printed in its real inks
The tray's tops SHALL be printed and dithered with their world's real 16-ink palette in 4D.OS. In the orrery, each top's print SHALL start from those same inks. The five palettes SHALL live hard-coded in the landing: the landing does not read them from 4D.OS at build time or at runtime. An automated test SHALL fail if any of those palettes differs from the one its world defines in 4D.OS.

#### Scenario: Palette drift
- **WHEN** an ink in a world's palette changes in 4D.OS and the landing is not updated
- **THEN** the test suite fails and points to the world and the ink that differ

#### Scenario: Top in its own inks
- **WHEN** B's top spins in its tray cavity, in 16-color mode
- **THEN** all its colors belong to B's 16-ink palette

### Requirement: Wind-up key with a one-way ratchet
In the BUILD instrument there SHALL be a 3D butterfly key. A chrome tag hangs from it: "WIND ME", and below, "drag round · or hold Space". The key works like this:
- a clockwise circular drag around the axis SHALL wind it, with a notch every 45°, 8 per turn, up to a maximum of 12 turns (96 notches);
- counterclockwise, the ratchet SHALL click, without moving the key or changing the wind;
- the key MUST NOT spin freely or coast on inertia. Each notch clicks into place with a brief, dry bounce;
- past the stop, the ratchet SHALL slip with a wobble that dies out in about 300 ms, and the log SHALL read "The spring's full. Twelve turns is all a tin toy takes.";
- while winding, an orange chip SHALL read "WINDING · REWIND";
- behind the key, a spiral spring SHALL tighten as wind builds up.

Each notch SHALL stamp the key in orange, at its angle at that moment, on a plate that keeps what is printed. One full turn thus prints an 8-petal rosette, and further turns overprint it thicker. The rosette SHALL be cleared by "Reset universe".

The accumulated wind, from 0 to 1, SHALL drive at once the H1's slant, the Whirl's spin, the density of the edge shading, the drums' rolling speed and the pitch of the hum. No other element SHALL have its own tension logic.

The key SHALL be an accessible slider, with values from 0 to 96 and a readable value such as "3 turns and 5 eighths wound". With the keyboard:
- Right or Up add a notch;
- PageUp adds 8;
- holding Space winds one notch every 80 ms;
- Enter or Escape let go of the key.

#### Scenario: One turn prints a rosette
- **WHEN** the visitor gives the key one full turn
- **THEN** SPRING rises to 1 and the plate shows 8 stamps of the key 45° apart

#### Scenario: One-way ratchet
- **WHEN** the visitor drags the key counterclockwise
- **THEN** the stored wind does not change, the key does not turn and, with sound on, the ratchet clicks are heard

#### Scenario: Twelve-turn stop
- **WHEN** 96 notches are stored and the visitor keeps winding
- **THEN** the wind stays at 96, the key wobbles and the log reads "The spring's full. Twelve turns is all a tin toy takes."

#### Scenario: Winding by keyboard
- **WHEN** the visitor focuses the key and presses PageUp three times
- **THEN** the key announces 24 of 96 as three turns wound and SPRING is 3

### Requirement: Wind runs the build queue
One turn of wind SHALL be worth 3 seconds of wind, and the queue's active job SHALL advance 1 s for each second of wind.
- If the visitor lets go of the key with a job in the queue, the key SHALL unwind counterclockwise at one turn every 3 s, with a hum, and a turquoise chip SHALL read "RUNNING · FORWARD".
- If the visitor presses the key while it runs, the queue SHALL pause and the chip SHALL read "HOLD".
- If the queue is empty, the wind SHALL stay stored, and the log SHALL read "Spring held. Queue a build to use it."

Under the key there SHALL be a tin ticket with:
- "BUILD QUEUE";
- the active job with its cost and time, for example "Tin mine → Lv 2 · 30 tin · 6 s", with the arrow in SVG;
- a spring-shaped progress bar that tightens;
- the turns still needed and those stored, for example "2 turns needed · 0 wound";
- the "+1 turn" and "Let go" buttons.

When a job finishes, a CLACK SHALL be heard and seen:
- the ticket pulses (scale from 1.06 to 1 over 90 ms) with a 1 px jolt;
- an "LV n" stamp drops, rotated −4°;
- the ticket is impaled on the spike next to the Construction plate. The 6 newest are visible and the rest compress into a count, for example "+4 below";
- the drums roll;
- the log records a line, for example "Built. Tin mine is level 2. Tin now +1.6/s."

On the side panel's Construction plate there SHALL be a second, flat key that shares the same wind reserve. That way the visitor can wind even when the lid is no longer on screen.

#### Scenario: Building with two turns
- **WHEN** the queue has "Tin mine → Lv 2 · 30 tin · 6 s", and the visitor gives two turns and lets go of the key
- **THEN** all of this holds:
  - the key unwinds for 6 s with the "RUNNING · FORWARD" chip;
  - at the end there is a CLACK and the mine is at level 2;
  - the log reads "Built. Tin mine is level 2. Tin now +1.6/s.";
  - the ticket ends up on the spike

#### Scenario: Pause
- **WHEN** the key is unwinding and the visitor presses it
- **THEN** the job stops advancing and the chip reads "HOLD" until the visitor lets go

#### Scenario: Empty queue
- **WHEN** the queue is empty and the visitor lets go of the key with wind stored
- **THEN** the wind stays stored and the log reads "Spring held. Queue a build to use it."

#### Scenario: Second key
- **WHEN** the lid is off screen and the visitor gives one turn with the flat Construction key
- **THEN** SPRING rises to 1, just as with the lid's key

### Requirement: Litho press that reprints the real render
The side panel's "Litho Press" plate SHALL have three rows. Each row is a three-position slide switch that works as a radio group:
- **inks**: "One-ink press", "16-ink litho" and "Full process". They change at once the mode of every retro-display view on the page, to 1-bit, 16 colors or Millions per `dither-display`. This row is the color-depth selector that `playground-hub` requires;
- **exposure memory**: 12, 48 or 200 moments;
- **symmetry**: 3-fold, 5-fold or 8-fold. It changes the Whirl's arms and the tops' bands.

By default, the rows are at "16-ink litho", 48 and 5-fold. Each row becomes available for research when the observatory reaches its level: 1, 2 or 3. Research costs 20, 40 or 60 SPARK, takes 10, 15 or 20 s, and while it runs a dial turns. Each row's state SHALL show in its stroke:
- locked: dotted, with the reason, for example "Needs Observatory Lv 2";
- researching: dashed, with the dial;
- available: solid.

A locked row SHALL leave the "Skip the grind: unlock everything" path in view. On changing position, there SHALL be a 600 ms dither dissolve. The plate SHALL sink 2 px and come back, and a press thud SHALL sound.

#### Scenario: A single ink
- **WHEN** the inks row is available and the visitor picks "One-ink press"
- **THEN** after the dissolve, the lid and every retro-display view show exactly two colors

#### Scenario: Locked row
- **WHEN** the observatory is at level 1 and the visitor looks at the memory row
- **THEN** the row is dotted, reads "Needs Observatory Lv 2" and its positions cannot be chosen

#### Scenario: Research
- **WHEN** the observatory is at level 1, the visitor has 20 SPARK and researches the inks row
- **THEN** Spark drops by 20, the row turns dashed with the dial turning and, 10 s later, it becomes solid and selectable

### Requirement: Spark wheel
In the resource strip there SHALL be a tin friction wheel behind a pink celluloid window. The visitor rubs it by moving the pointer back and forth:
- each change of direction, after at least 12 px of travel, SHALL add 0.5 SPARK, capped at 6 SPARK per second, so it stays a toy and not a farm;
- each stroke SHALL throw up to 24 sparks, always near the window. The wheel SHALL spin with inertia and, with sound on, a crackle SHALL sound.

The wheel SHALL have a "Rub the spark wheel" button: each press counts as one stroke.

#### Scenario: Rubbing
- **WHEN** the visitor rubs the wheel with 10 changes of direction of more than 12 px, at a slow pace
- **THEN** Spark rises by 5 and each stroke throws sparks next to the window

#### Scenario: Cap
- **WHEN** the visitor rubs the wheel as fast as they can for 5 s
- **THEN** Spark rises by at most 30

#### Scenario: By keyboard
- **WHEN** the visitor focuses "Rub the spark wheel" and activates it twice
- **THEN** Spark rises by 1

### Requirement: Inner tray as the index of the worlds
The second section SHALL be the inner tray, in turquoise, with the title "Five worlds in the box" and the lede "Nothing here is locked. Every world opens now; the game only decides which planets spin." It SHALL meet the requirements "Shared demo index" and "Index reachable from the first screen and always open" of `playground-hub`.

The cavities SHALL be die-cut into the cardboard, with real depth. They SHALL be arranged in a grid with mirror symmetry about the center column:
- first row: A, B and C, with B featured and wider;
- second row: D, the launcher and E;
- third row: the three lab sockets.

Each world cavity SHALL contain:
- its still image in a die-cut window;
- a live tin top in a round socket, printed in its world's inks, which spins only while the cavity has the pointer over it or has focus;
- a plaque with the letter and the name;
- the coordinate;
- an honest line;
- the "Open world" link, with an SVG arrow, which opens the world in the same tab.

| cavity | coordinate | route | line |
|---|---|---|---|
| A · Vitrine | `[1:1:3]` | `/4d-os/a/` | "The scene as an exhibit: a red gallery room, a black cat climbing stairs, every moment kept as points." |
| B · Plate | `[1:1:4]` | `/4d-os/b/` | "The whole climb exposed onto one photographic plate, after Marey, under an aurora sky." |
| C · Leader | `[1:1:5]` | `/4d-os/c/` | "Time as a strip of 16mm film you pull through the gate." |
| D · The golden stoop | `[1:1:2]` | `/4d-os/d/` | "A peregrine falcon computed on a golden spiral, drawn on a phosphor vector terminal." |
| E · Whale fall | `[1:1:1]` | `/4d-os/e/` | "A whale spirals into a black hole, lensed, with two clocks that disagree." |
| launcher | the whole set | `/4d-os/` | "4D.OS · All five worlds from one desktop." |

The launcher cavity SHALL show the five tops in a row. Each lab socket SHALL be shallow, with a dotted die-cut and an unprinted, still tin top. It SHALL show its coordinate and the label "Cast next", and SHALL announce to assistive technologies "Empty socket · in the lab. The next experiment isn't cast yet." along with the kind of experiment to come. It MUST NOT be a link or show a name or a date.

When a planet becomes charted, its cavity SHALL get a stamped "CHARTED" tab. Its link MUST NOT change.

The grid adapts to the width:
- at 900 px or less, it SHALL switch to 6 columns, with B spanning the full width;
- at 560 px or less, it SHALL switch to one column, in the order B, A, C, D, E, launcher and lab sockets.

#### Scenario: Tray contents
- **WHEN** the visitor reaches the tray
- **THEN** they see the five world cavities with image, plaque, coordinate, line and "Open world", the tray's provenance credit, the launcher cavity and exactly three unlinked lab sockets

#### Scenario: CHARTED does not change the link
- **WHEN** a rocket charts Leader
- **THEN** C's cavity gets the "CHARTED" tab and its link still points to `/4d-os/c/`

#### Scenario: One column on a phone
- **WHEN** the viewport is 390 px wide
- **THEN** the cavities appear in one column, in the order B, A, C, D, E, launcher and lab, with no horizontal scroll

### Requirement: Still images and credits in the tray
The tray SHALL use the shared set of still images from `playground-hub`: lossless WebP at 1200×900, lazy-loaded and with alt text. It MUST NOT use the launcher's PNGs, and the images MUST NOT be re-dithered or get a CSS dither overlay.

Each image SHALL carry its "Synthetic scene" stamp. Provenance SHALL be stated once for the whole tray (amendment from the set review, so that the tray does not read as a grid of repeated cards): "Every still is captured from the live render of a synthetic scene: A, B and C are computed in your browser, D and E from equations." On A, B and C, the CC-BY 3.0 credit line for the "Cat" model, exactly as it appears in `LICENSES.md`, SHALL stay visible next to the image.

#### Scenario: Cat credit
- **WHEN** the tray shows the images of A, B and C
- **THEN** next to each one the credit line for the "Cat" model from `LICENSES.md` can be read, unchanged

#### Scenario: Image format
- **WHEN** the tray's requests are recorded
- **THEN** the five images are the shared WebPs, no launcher PNG is requested and no image has an added dither

### Requirement: Side panel of the box, the command post
The vermilion face SHALL be titled "Run the empire". Its lede, in white, SHALL say "Every number here is made up by this page. The springs, orbits and dither are real." Below it there SHALL be three plates of different sizes, never equal cards:
- **Construction**, the widest: the list of buildings with "Queue" buttons that show cost and time, the 3-slot queue, the flat key and the ticket spike. A queue slot is dashed and turns solid when its job is under way;
- **Litho Press**: the press, drawn as a machine with its matrix;
- **Hangar**, a low full-width strip: the gantry's slots as rocket icons, the rockets in flight with their `r`, `v` and `t`, and the list of charted planets with their stamps.

To the right of the title SHALL be the "Reset universe" lever. On vermilion, body text SHALL be white. Chrome SHALL be used on vermilion only for text 24 px or larger.

#### Scenario: Unequal plates
- **WHEN** the visitor reaches the side panel at 1440 px wide
- **THEN** they see Construction, Litho Press and Hangar in three different sizes, and the "Reset universe" lever next to the title

### Requirement: Instruction sheet
The orange face SHALL carry a slightly rotated sheet of paper, which stops being rotated below 560 px. It contains:
- **"How to play"**, five numbered steps, each with an ink SVG diagram:
  1. "Wind the key. Let go and the queue builds."
  2. "Pull back a rocket and let go."
  3. "Flick a planet to spin it."
  4. "Research the press to re-print the sky."
  5. "Open a world. They are real demos."
- **"About this demo"**;
- **the warning plaque**, with a full orange border (not a side stripe), carrying the text set by "Nothing in the game persists and nothing is sent";
- the "Skip the grind: unlock everything" and "Reset universe" buttons.

#### Scenario: Reading the sheet
- **WHEN** the visitor reaches the sheet
- **THEN** they find the five steps in order, "About this demo", the warning plaque with its orange border and the two buttons, and the two buttons do the same as their counterparts on the side panel

### Requirement: Print proof of the visit
The page SHALL close with the print proof, in night cobalt, with the title "Every moment of your visit, at once." in chrome. The proof SHALL be a 1200×900 image composed in the browser and shown at 960×720 on desktop. It is framed like a lithographic proof, with four registration marks and a bar with the page's 16 inks. It SHALL gather:
- every rocket exposure since load, up to 5,000;
- the planets' rings;
- the key's rosette;
- a Sono caption such as "WIND-UP EMPIRE · proof of a visit · 12 flights · 3 charted · 7 turns wound · 2026-09-25 14:02", with the session's numbers and the visitor's local date and time.

The proof SHALL be composed on entering the section and each time the visitor presses "Reprint". "Save the print (PNG)" SHALL download the proof as a PNG without uploading anything. The PNG SHALL carry embedded provenance text stating that it is a synthetic print of the visit, made in the browser by this landing. "Made in your browser. Nothing is uploaded." SHALL be readable next to the buttons.

#### Scenario: Caption with the session
- **WHEN** the session adds up to 12 flights, 3 charted planets and 7 turns of wind, and the visitor reaches the proof
- **THEN** the caption reads "WIND-UP EMPIRE · proof of a visit · 12 flights · 3 charted · 7 turns wound", followed by the local date and time

#### Scenario: Save without uploading
- **WHEN** the visitor presses "Save the print (PNG)"
- **THEN** the browser downloads a 1200×900 PNG with its provenance text and no network request goes out

#### Scenario: Reprint
- **WHEN** the visitor launches another rocket and presses "Reprint"
- **THEN** the proof includes the new flight's exposures and the caption counts that flight

### Requirement: Footer
Under the proof, the footer SHALL show:
- "Printed live in 16 inks by your browser · crewtives playground · demo build 0.1";
- links to crewtives.com and to the 4D.OS launcher, `/4d-os/`;
- "Type: Tilt Warp, Rampart One, Libre Franklin and Sono, SIL Open Font License.";
- the "Cat" model credit line from `LICENSES.md`, stating that it applies to worlds A–C;
- the other credits and the line "Not in the collection yet · Playground" required by "Demo honesty" of `playground-hub`, with "Playground" linked to `/` and preceded by a left arrow drawn as a vector icon, because none of the page's four families includes the `←` character.

The footer MUST NOT show the line "One of three candidate landings" or link to `/landings/`, and no text on the page SHALL present Wind-Up Empire as a candidate for the playground's front page.

#### Scenario: Footer credits
- **WHEN** the visitor reaches the end of the page
- **THEN** they see the "demo build 0.1" mark, the four families with their OFL license, the "Cat" model credit for worlds A–C, the line "Not in the collection yet · Playground" and the links to crewtives.com and to `/4d-os/`

#### Scenario: Back to the museum
- **WHEN** the visitor activates "Playground" in the line "Not in the collection yet · Playground"
- **THEN** they reach the museum at `/`

#### Scenario: No longer a candidate
- **WHEN** the static HTML of `/landings/wind-up-empire/` is read
- **THEN** the word "candidate" does not appear in any visible text, no link points to `/landings/` and the visible text does not contain the `←` character

### Requirement: Synthesized tin sound
The sound button SHALL be the resource strip's bell and SHALL follow "Synthesized sound, off by default" of `playground-hub`. With sound on, each event SHALL have its own synthesized voice:
- the tick of each notch and the ratchet's slip;
- the hum of the spring unwinding;
- the CLACK of a finished build and the metallic clunk of a toppling top;
- the hum of the tops, whose pitch follows their spin speed;
- the whistle that rises with the rocket's pull;
- the launch zip and the falling glissando of a swallowed rocket;
- the crackle of the spark wheel;
- the press thud;
- the click of the drums' carry, at most 30 per second.

#### Scenario: Audible notches
- **WHEN** sound is on and the visitor gives the key one turn
- **THEN** 8 ticks sound, one per notch, without any audio file being downloaded

### Requirement: Reduced motion: each toy jumps to its result
With `prefers-reduced-motion: reduce`, the landing SHALL meet "Reduced motion" of `playground-hub`. In addition:
- there is no camera drift, demo flight, lid lift, plate rattle or star twinkle;
- the planets rest on the golden spiral, with their orbits already printed as exposures;
- **launching** computes the whole flight at once and prints all its exposures together, like a chronophotograph, and then logs the outcome;
- **spinning** a top shows the ring print as a still image, with the top upright;
- **the key** clicks each notch into place without bounce, and "Let go" completes the active job immediately, with a single stamp;
- **the drums** change digits without rolling;
- **the press** changes mode with a cut, without a dissolve;
- **the spark wheel** throws no particles: its window glows lemon for 200 ms.

In any configuration, the landing SHALL meet "Limited flashes" of `playground-hub`. Sparks SHALL always be local, with a maximum of 120 at a time.

#### Scenario: Still load
- **WHEN** the landing loads with reduced motion
- **THEN** the demo flight does not launch, nothing spins or orbits and the planets' rings are already printed

#### Scenario: Launch as a chronophotograph
- **WHEN** with reduced motion the visitor launches a rocket with 12 notches and the aim at −20°
- **THEN** the whole path appears at once as stamped exposures and the log records the escape

#### Scenario: Letting go of the key
- **WHEN** with reduced motion the visitor gives the key two turns with "Tin mine → Lv 2" queued and presses "Let go"
- **THEN** the mine is at level 2 immediately, with a single stamp, with no unwinding animation

### Requirement: Fallback without WebGL2 drawn at runtime
Without WebGL2, the landing SHALL meet "Fallback without WebGL2" of `playground-hub`, and everything that replaces the 3D scene SHALL be drawn in 2D at runtime, from the same geometry and the same flight model. The build MUST NOT generate replacement images. Without WebGL2:
- the lid shows a 2D orrery with the Whirl and its 5-arm golden spiral, the solid and dashed rings, the flat tops on the golden spiral, the stars and a halftone dither;
- a precomputed flight appears printed as a chronophotograph, with the label "Printed flight (static view)". "Launch" prints a new, deterministic flight from "Aim" and "Pull-back";
- the key is the flat key. The economy, the spark wheel, the tray with its images and the sheet work the same;
- the press changes only the dither of the 2D drawing;
- the print proof is composed from the 2D drawings.

#### Scenario: Without WebGL2
- **WHEN** the landing opens in a browser without WebGL2
- **THEN** the lid shows the 2D orrery with "Printed flight (static view)", the 3D code is not requested and the console shows no errors

#### Scenario: New printed flight
- **WHEN** without WebGL2 the visitor sets "Aim" to −60 and "Pull-back" to 12 and presses "Launch"
- **THEN** a new trajectory appears printed that ends swallowed by the Whirl, and the log records it

#### Scenario: Nothing baked into the build
- **WHEN** the landing's build output is reviewed
- **THEN** it contains no pre-generated orrery images or SVG

### Requirement: Focus, contrast and touch controls
In addition to "Accessibility" of `playground-hub`:
- focus SHALL show as a 3 px chrome outline with an ink ring. On chrome fields, it SHALL show as an ink outline with a pink ring;
- links SHALL be underlined with a dashed stroke;
- chrome on vermilion SHALL be used only for text 24 px or larger;
- on phones, every touch target SHALL be at least 44 px and the side margins SHALL be 16 px.

#### Scenario: Focus on the chrome band
- **WHEN** focus reaches the button "Five real worlds inside · Open the box" on the chrome band
- **THEN** the button shows an ink outline with a pink ring, clearly visible against the chrome

#### Scenario: Touch targets
- **WHEN** the controls are measured at 390 px wide
- **THEN** none has a touch target smaller than 44 px

### Requirement: On-demand rendering and per-device limits
In addition to "Load and idle budget" of `playground-hub`:
- the lid SHALL render continuously only while it is on screen and motion is allowed;
- the key and gauge views SHALL render only while the visitor is using them or while the needle is moving;
- the tray's tops SHALL render only while their cavity has the pointer over it or has focus, or while they are spinning;
- the economy clock MUST NOT generate frames.

On phones, pixel density SHALL be capped at 1.5. There will be 90 stars instead of 240 and 240 exposures instead of 600, the tops will have 8 segments and there will be at most 2 rockets in flight. At 1440×900, with 4 rockets in flight and all the tops spinning, the landing SHALL sustain 60 fps.

#### Scenario: Lid off screen
- **WHEN** the visitor is on the sheet and no tray top is spinning
- **THEN** no frame is rendered, although the drums keep changing

#### Scenario: Limits on a phone
- **WHEN** the landing runs on a phone and the gantry is at level 4
- **THEN** there are no more than 2 rockets in flight at once and the canvas pixel density does not exceed 1.5

### Requirement: Unfinished toy as an empty die-cut socket
A toy that is not finished at publication SHALL be shown in its place as an empty die-cut socket, labeled as not ready yet, within the face it belongs to. It MUST NOT be hidden or pretend to work. The build order SHALL finish the box, the rocket, the tray and the footer first, so that the landing never ships without the index.

#### Scenario: Unfinished press
- **WHEN** the landing is published with the litho press unfinished
- **THEN** the Litho Press plate shows an empty die-cut socket saying it is not ready yet, and the rest of the side panel works
