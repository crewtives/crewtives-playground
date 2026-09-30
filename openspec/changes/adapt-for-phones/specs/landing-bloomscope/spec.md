# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
