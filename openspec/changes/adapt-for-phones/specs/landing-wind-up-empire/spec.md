# Spec Delta

## MODIFIED Requirements

### Requirement: Resource strip
At the very top there SHALL be a pressed-tin strip that stays pinned on scroll. It carries:
- on the left, the wordmark "WIND-UP EMPIRE" and a pink decal, "DEMO MODEL · FAKE ECONOMY";
- in the center, three odometer drums labeled "Tin", "Spring" and "Spark", each with its rate (for example, "+1.2/s"), and the spark wheel next to "Spark";
- on the right, the links "Worlds" (to the tray) and "How to play" (to the sheet) and the sound bell, with "Sound off" or "Sound on".

The first focusable element on the page SHALL be the "Skip to the worlds" link. The drums SHALL show the real values of the economy and roll digit by digit, with a small bounce on carry. If they change more than 20 times per second, they SHALL switch to a blurred roll.

On phones the drums SHALL never clip a digit. The Spring drum, whose value never passes 12, MAY show only two digits. On phones in landscape (at most 500 px tall), the strip SHALL be a single row no taller than 56 px, with "Worlds" and "How to play" in its menu. The wordmark SHALL always read "WIND-UP EMPIRE", with its space, at every width.

#### Scenario: First focus
- **WHEN** the visitor presses Tab once after load
- **THEN** focus is on "Skip to the worlds", and activating it takes the page to the tray

#### Scenario: Drums always in view
- **WHEN** the visitor is reading the instruction sheet
- **THEN** the strip is still visible at the top and its drums keep changing with production

#### Scenario: Narrow phone
- **WHEN** the viewport is 360 px wide
- **THEN** every digit of the three drums is fully visible inside its well

#### Scenario: Landscape strip
- **WHEN** the viewport is 844×390 or 932×430
- **THEN** the strip is one row at most 56 px tall, it shows the wordmark "WIND-UP EMPIRE", the decal, the three drums, the spark wheel, the bell and the menu, and the menu holds "Worlds" and "How to play"

### Requirement: First screen on phones and intermediate widths
At 390×844, the lid SHALL stack as follows, without the diagonal composition:
- the strip in two rows: on top, the wordmark, the decal, the bell and the menu; below, the three drums and the spark wheel;
- the H1 centered on two lines, "WIND-UP" and "EMPIRE";
- the subtitle;
- the orrery, with the rocket in its cradle and a grab area of at least 120×120 px;
- the rail plaque;
- the key and the gauge, as two side-by-side tiles;
- the whole band, on two lines, with its button to the worlds.

The ticket and the log SHALL start just below the fold. On phones, the tops SHALL scale so that the smallest has a radius of at least 14 px.

On portrait phones whose visible height cannot hold the whole lid (for example 390×664 with the browser's toolbars, or 360×780), the lid SHALL tighten its heights using the small viewport height (`svh`), and the band SHALL stay docked to the bottom edge of the viewport while its own place is below the fold. The band SHALL never cover the rail plaque or its controls, and SHALL settle into its place as the lid ends.

On phones in landscape (at most 500 px tall), the strip SHALL be a single row, and the lid SHALL place the orrery on the left and, on the right, the H1, the rail with its controls, the key and gauge tiles and the band, so that the rocket and its controls are visible together.

Above 900 px wide, the diagonal composition SHALL hold, scaled to the width. At 900 px or less, the instruments SHALL leave the lid's corners and form a row of two tiles under the orrery.

#### Scenario: 390 px phone
- **WHEN** the viewport is 390×844
- **THEN** without scrolling, the H1, the orrery with the rocket, the key, the gauge and the button "Five real worlds inside · Open the box" are visible, and the page has no horizontal scroll

#### Scenario: Short phone
- **WHEN** the viewport is 390×664 or 360×780
- **THEN** without scrolling, the H1, the orrery with the rocket, the rail with Aim, Pull-back and Launch, and the button "Five real worlds inside · Open the box" are visible, and the band does not overlap the rail

#### Scenario: Landscape phone
- **WHEN** the viewport is 844×390, 932×430 or 780×360
- **THEN** without scrolling, the rocket in its cradle, the Launch button and the button "Five real worlds inside · Open the box" are visible, and the strip is at most 56 px tall

#### Scenario: 900 px width
- **WHEN** the viewport is 900 px wide and taller than 500 px
- **THEN** the key and the gauge form a row under the orrery and do not occupy the lid's corners

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

On touch screens, only the rocket's grab area and the round face of each key SHALL capture the gesture. On the rest of the canvas and on the rest of the key's tile, a vertical drag SHALL scroll the page. On the rocket, only a drag that pulls away from the Whirl SHALL pull it back: a touch drag that starts toward the Whirl MUST NOT pull or launch, and SHALL scroll the page instead.

#### Scenario: Launch with the keyboard
- **WHEN** the visitor focuses the rocket, holds Space for 1.1 s, presses Right four times and releases Space
- **THEN** the rocket launches with 12 notches and the aim at +20°, and the outcome reaches the log

#### Scenario: Scrolling on a phone
- **WHEN** on a phone the visitor drags vertically over the orrery away from the rocket, or over the key's tile outside the key's round face
- **THEN** the page scrolls and no toy activates

#### Scenario: Swipe up over the rocket
- **WHEN** on a phone the visitor starts a drag on the rocket and moves the finger up, toward the Whirl
- **THEN** no rocket launches, the log does not change and the page scrolls natively, including the momentum it keeps after the finger lifts

#### Scenario: Pull back on a phone
- **WHEN** on a phone the visitor drags the rocket 132 px down, away from the Whirl, and lets go
- **THEN** the rocket launches with 12 notches, as the same pull does with a mouse, and the log records the launch

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

At 900 px wide or less, where the key is a tile and the ticket sits below it, the key's tag SHALL mirror the ticket as a stub:
- the tag SHALL read "WIND ME", "WINDING" with the turns wound over the turns needed, "RUNNING", "HOLD" or "QUEUE EMPTY";
- a spring-shaped progress bar SHALL run along the tile;
- on CLACK, the tag SHALL show the "LV n" stamp.

The stub is visual only: assistive technologies keep receiving the state from the ticket's chip and the log. When the queue is empty, the ticket SHALL offer a link to the side panel.

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

#### Scenario: Winding on a phone
- **WHEN** at 390×844 the visitor winds the lid's key two turns with "Tin mine → Lv 2" queued, then lets go
- **THEN** while winding, the key's tile shows "WINDING" with 2 of 2 turns; while running it shows "RUNNING" and the progress bar advances; at the end it shows "LV 2", all of it visible without scrolling

#### Scenario: Nothing left to build on a phone
- **WHEN** at 390×844 the queue is empty
- **THEN** the key's tag reads "QUEUE EMPTY" and the ticket shows a link, at least 44 px tall, that takes the page to the side panel

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

At 900 px wide or less, the press SHALL carry a proof bed: a flat 2D pull of the lid, drawn at runtime from the same geometry as the fallback without WebGL2, in the current inks, exposure memory and symmetry, and labeled "Proof · printed flat". The proof bed:
- SHALL reprint on every change of position, on research, on "Skip the grind" and on "Reset universe";
- SHALL stay pinned under the strip while the visitor moves through the press's rows;
- SHALL paint nothing at rest.

#### Scenario: A single ink
- **WHEN** the inks row is available and the visitor picks "One-ink press"
- **THEN** after the dissolve, the lid and every retro-display view show exactly two colors

#### Scenario: Locked row
- **WHEN** the observatory is at level 1 and the visitor looks at the memory row
- **THEN** the row is dotted, reads "Needs Observatory Lv 2" and its positions cannot be chosen

#### Scenario: Research
- **WHEN** the observatory is at level 1, the visitor has 20 SPARK and researches the inks row
- **THEN** Spark drops by 20, the row turns dashed with the dial turning and, 10 s later, it becomes solid and selectable

#### Scenario: Seeing the press on a phone
- **WHEN** at 390×844 the visitor picks "One-ink press" with the lid off screen
- **THEN** the proof bed next to the switch reprints in exactly two colors, and after that no frame is painted

#### Scenario: Pinned proof on a short phone
- **WHEN** at 390×664 the visitor scrolls to the symmetry row and picks "8-fold"
- **THEN** the proof bed is visible under the strip in the same view and shows eight arms on the Whirl

### Requirement: Focus, contrast and touch controls
In addition to "Accessibility" of `playground-hub`:
- focus SHALL show as a 3 px chrome outline with an ink ring. On chrome fields, it SHALL show as an ink outline with a pink ring;
- links SHALL be underlined with a dashed stroke;
- chrome on vermilion SHALL be used only for text 24 px or larger;
- on phones, every touch target SHALL be at least 44 px and the side margins SHALL be 16 px. A text link's touch area MAY extend beyond its text, as long as the layout does not move;
- a band or proof docked to an edge of the screen MUST NOT hide the element that has focus.

#### Scenario: Focus on the chrome band
- **WHEN** focus reaches the button "Five real worlds inside · Open the box" on the chrome band
- **THEN** the button shows an ink outline with a pink ring, clearly visible against the chrome

#### Scenario: Touch targets
- **WHEN** the controls are measured at 390 px wide, including the tray's credit lines and the footer's links
- **THEN** none has a touch target smaller than 44 px

#### Scenario: Focus not hidden by the docked band
- **WHEN** at 390×664 the visitor tabs onto the lid's key while the band is docked to the bottom edge
- **THEN** the focused element scrolls into view above the band

### Requirement: On-demand rendering and per-device limits
In addition to "Load and idle budget" of `playground-hub`:
- the lid SHALL render continuously only while it is on screen and motion is allowed;
- the key and gauge views SHALL render only while the visitor is using them or while the needle is moving;
- the tray's tops SHALL render only while their cavity has the pointer over it or has focus, or while they are spinning;
- the press's proof bed SHALL print only when it comes into view or when the press changes;
- the economy clock MUST NOT generate frames.

On phones, pixel density SHALL be capped at 1.5. A phone is a coarse pointer with a viewport at most 800 px wide or at most 500 px tall, so phones in landscape count. On phones there will be 90 stars instead of 240 and 240 exposures instead of 600, the tops will have 8 segments and there will be at most 2 rockets in flight. At 1440×900, with 4 rockets in flight and all the tops spinning, the landing SHALL sustain 60 fps.

#### Scenario: Lid off screen
- **WHEN** the visitor is on the sheet and no tray top is spinning
- **THEN** no frame is rendered, although the drums keep changing

#### Scenario: Limits on a phone
- **WHEN** the landing runs on a phone and the gantry is at level 4
- **THEN** there are no more than 2 rockets in flight at once and the canvas pixel density does not exceed 1.5

#### Scenario: Limits on a phone in landscape
- **WHEN** the landing runs on a phone held in landscape (844×390) and the gantry is at level 4
- **THEN** there are no more than 2 rockets in flight at once and the canvas pixel density does not exceed 1.5
