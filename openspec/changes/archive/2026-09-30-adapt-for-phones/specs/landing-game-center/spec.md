# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
