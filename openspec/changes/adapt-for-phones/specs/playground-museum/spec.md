# Spec Delta

## MODIFIED Requirements

### Requirement: Museum page and section order
The museum SHALL be the page at `/` and SHALL arrive as a complete HTML document, with the tab title "crewtives playground · a museum of live graphics experiments" and a single top-level heading, visible on the first screen, that names the collection. The page SHALL present, in this order:
1. the first screen, with the featured sheet;
2. the sheet index;
3. the remaining work sheets, in ascending number order;
4. method sheet 000;
5. the colophon.

Each published sheet SHALL appear only once on the page, with the anchor `sheet-NNN`, where NNN is its three-digit number.

#### Scenario: Full walkthrough
- **WHEN** the visitor scrolls down from the first screen to the end of the museum
- **THEN** they find the featured sheet, the sheet index, the remaining work sheets in ascending number order, sheet 000 and the colophon, in that order

#### Scenario: Tab and heading
- **WHEN** `/` is opened
- **THEN** the tab is titled "crewtives playground · a museum of live graphics experiments" and the page has a single top-level heading, visible without scrolling

#### Scenario: Each sheet only once
- **WHEN** the museum HTML is searched for elements with a `sheet-NNN` anchor
- **THEN** there is exactly one per published sheet, no number repeats and the featured sheet does not appear twice

### Requirement: Page clock
The page SHALL have a single page clock that governs the time of all sheets. The clock SHALL have three states, FORWARD, REWIND and HOLD, each with a visible control labeled with that text, and a scrubber that is dragged with a pointer or by touch and moved with the keyboard arrow keys. The J, K and L keys SHALL set the clock to REWIND, HOLD and FORWARD, from anywhere on the page except a text field. The clock has no speeds: pressing J or L several times MUST NOT speed it up. Without reduced motion, the clock SHALL start in FORWARD.

All the collection's passes share fps and frame count (see "Cadence, duration and budget per pass" in `work-loops`), so each clock position is a loop frame i, the same in all VISTAS. All visible VISTAS and every NOW in the épures SHALL follow the clock. On each sheet, the frame the VISTA shows and the trail point the NOW marks SHALL correspond to the same moment of the work, according to the loop's provenance: to the same source frame in works with a pack and, on 004, to the newest seed in that frame. On sheet 001, the three VISTAS SHALL show the same source frame at all times, the one its single NOW marks.

The behavior in each state SHALL be this:
- in FORWARD, the VISTAS move forward in their work's time and the NOW is cyan;
- in REWIND, they move backward and the NOW is amber;
- in HOLD, no VISTA and no NOW changes.

In FORWARD, after the last frame the clock SHALL return to the first, and in REWIND, after the first, to the last. On that wrap, each VISTA and its NOW SHALL jump together, in the same painted frame, to the other end of the loop segment. The cut is declared: the title block's provenance line says how often the loop restarts.

Dragging the scrubber SHALL move all the VISTAS and every NOW at once. A drag on the scrubber, with a mouse, a pen or a finger, MUST NOT scroll the page, start the browser's drag autoscroll or select text, and after a pointer drag the scrubber SHALL keep responding to the arrow keys. If no VISTA is on screen, the tab is hidden or the clock is in HOLD, the page MUST NOT keep an animation loop running.

#### Scenario: Clock keys
- **WHEN** the visitor presses J, then K and then L, with focus outside a text field
- **THEN** the clock switches to REWIND, to HOLD and to FORWARD, and the control for the active state shows it

#### Scenario: No acceleration
- **WHEN** the visitor presses L three times in a row
- **THEN** the clock stays in FORWARD and each VISTA advances 15 frames per second, the same as after the first press

#### Scenario: The same instant on a sheet
- **WHEN** the clock stops in HOLD at any position
- **THEN** on each visible sheet, the VISTA's frame and the NOW in the elevation and in the plan correspond to the same moment of the work, according to the loop's provenance

#### Scenario: Three views, one NOW
- **WHEN** the clock runs with sheet 001 on screen
- **THEN** in each painted frame, VISTAS A, B and C show the same source frame of the pack, the one the NOW of its épure marks

#### Scenario: Scrubber
- **WHEN** the visitor drags the scrubber with two sheets on screen
- **THEN** the VISTAS and NOWs of both change together, in the same painted frame

#### Scenario: Loop wrap
- **WHEN** the clock in FORWARD passes the loop's last frame
- **THEN** in the next painted frame all VISTAS show their frame 0 and each NOW is at the start of its loop segment

#### Scenario: Rewind
- **WHEN** the visitor presses REWIND
- **THEN** the VISTAS move backward in their work's time and the NOW of each épure turns amber

#### Scenario: No animation loop at rest
- **WHEN** the clock is in HOLD, or the tab is hidden, or no VISTA is on screen
- **THEN** a 10 s performance profile records no animation callbacks and no frames painted by the museum

#### Scenario: Dragging does not scroll
- **WHEN** at 1440×900 with a mouse, and at 390×844 on a touch screen, the visitor presses on the scrubber with the page scrolled halfway down and drags it 12 px and then across its whole width
- **THEN** the page's scroll position does not change, no text is selected, the VISTAS follow the drag, and pressing the right arrow key afterwards moves the clock one frame

### Requirement: The fold
Each work sheet SHALL be foldable: the elevation plane rotates about the ground line from 0° (the flat épure, as on the sheet) to 90° (the dihedron). In the dihedron, the trail is seen in space (where, on the horizontal plane; when, in height), with its projection lines onto both planes: as a polyline on 001 to 003 and as dots, one per seed, on 004.

The fold SHALL always be started by the visitor, in one of these ways:
- with the sheet's "Fold" button;
- by dragging on its ground line. On a touch screen, that drag SHALL start only from a visible grip on the ground line, with a touch area of at least 44 × 44 CSS px, and a tap on the grip SHALL act like "Fold". A touch that starts anywhere else on the épure, the rest of the ground line included, SHALL scroll the page, MUST NOT fold the sheet and MUST NOT request the fold's 3D code;
- with the F key on the active sheet, which is the one that contains focus or, if focus is not on a sheet, the one that takes up the most visible area.

Nothing SHALL fold by itself, neither by scrolling nor by the passage of time. The same control SHALL return the sheet to flat. There SHALL be only one folded sheet at a time: folding another returns the previous one to flat. On a phone, when a fold settles and its view lies partly under the fixed clock bar, the page SHALL scroll the least distance that shows the whole fold view, instantly with reduced motion, unless the visitor has touched or scrolled the page since starting the fold.

The fold view SHALL be rendered with the same 3D engine and the same dithered retro display as the 4D.OS works, in 16 colors by default and with the house palette. The trail SHALL be drawn low-poly: on 001 to 003, as a polyline of straight segments between its vertices; on 004, as one dot per seed, without joining them. The NOW SHALL be on it at the moment the page clock marks, the same one the VISTA and the épure mark: it is still a single NOW. Its 3D code SHALL be requested only the first time the visitor folds a sheet. With reduced motion, the fold SHALL jump to 90° without animating the rotation. Without WebGL2, an SVG axonometric view of the dihedron SHALL be shown, generated at build time from the same trail.

#### Scenario: Nothing folds by itself
- **WHEN** the visitor scrolls through the whole museum and lets a minute pass without touching any fold control
- **THEN** no sheet folds

#### Scenario: Deferred loading
- **WHEN** network requests are logged from load until the first fold
- **THEN** the fold's 3D code is requested only after the visitor presses "Fold", drags on the ground line or presses F

#### Scenario: Fold and unfold
- **WHEN** the visitor presses "Fold" on sheet 003 and then presses it again
- **THEN** the elevation rotates until it forms the dihedron at 90°, with the trail in space and its projections onto both planes, and then returns to the flat épure

#### Scenario: The NOW in the dihedron
- **WHEN** the clock runs with sheet 003 folded
- **THEN** in each painted frame, the NOW in the dihedron marks the same moment as the VISTA and as the épure's NOW, in the color of the clock's direction

#### Scenario: A single folded sheet
- **WHEN** sheet 002 is folded and the visitor folds 003
- **THEN** 002 returns to flat and only 003 stays folded

#### Scenario: Fold without WebGL2
- **WHEN** the visitor presses "Fold" in a browser without WebGL2
- **THEN** they see the SVG axonometric view of the dihedron with that sheet's trail, and no 3D code is requested

#### Scenario: A swipe past the ground line scrolls
- **WHEN** at 390×844 on a touch screen the visitor swipes upward starting on the ground line of sheet 004, away from its grip
- **THEN** the page scrolls, the sheet stays flat and no 3D code is requested

#### Scenario: Folding from the grip
- **WHEN** at 390×844 on a touch screen the visitor drags the grip of sheet 003 upward past half the gesture, or taps it
- **THEN** sheet 003 folds to the dihedron, exactly as with "Fold"

#### Scenario: The fold in view on a phone
- **WHEN** at 390×844 the visitor presses "Fold" on the featured sheet and does not touch the page while it folds
- **THEN** once it settles, the whole fold view is visible above the clock bar

### Requirement: Way back from each work
Each work in the collection SHALL carry a small link back to its sheet, present in the static HTML and working without JavaScript:
- `/4d-os/a/`, `/4d-os/b/` and `/4d-os/c/`: "Playground · Sheet 001", to `/#sheet-001`;
- `/4d-os/d/`: "Playground · Sheet 002", to `/#sheet-002`;
- `/4d-os/e/`: "Playground · Sheet 003", to `/#sheet-003`;
- `/bloomscope/`: "Playground · Sheet 004", to `/#sheet-004`;
- the launcher `/4d-os/`: "Playground", to `/`.

The text of each link SHALL be preceded by a left-pointing arrow. That arrow SHALL be the ← character when the link's typeface includes it, or a vector icon when it does not. The link's accessible name SHALL contain its visible text. The number in each "Sheet NNN" SHALL match that of the work's sheet in the collection's curation. The existing link from `/4d-os/d/` to `../` SHALL be kept.

On the 4D.OS pages, the link back MUST NOT move or resize any window, view or canvas on the page. On a coarse pointer, its touch area MAY extend beyond its visible text, without covering another control.

#### Scenario: From each world
- **WHEN** the visitor activates the link back on `/4d-os/a/`, `/4d-os/b/`, `/4d-os/c/`, `/4d-os/d/` and `/4d-os/e/`
- **THEN** they arrive, respectively, at `/#sheet-001` (the first three), `/#sheet-002` and `/#sheet-003`, and the museum is positioned at that sheet

#### Scenario: From the launcher
- **WHEN** the visitor activates "Playground" on `/4d-os/`
- **THEN** they arrive at the museum at `/`

#### Scenario: Without JavaScript
- **WHEN** the HTML of each 4D.OS page and of `/bloomscope/` is read without running scripts
- **THEN** each one contains its link back with the destination from the list and the corresponding visible text

#### Scenario: Arrow without a missing glyph
- **WHEN** the typeface of the link back on one of those pages does not include the ← character
- **THEN** the arrow is shown as a vector icon and no replacement glyph appears

#### Scenario: 4D.OS with no other changes
- **WHEN** a 4D.OS page is compared with and without its link back, at 1440×900 and at 390×844
- **THEN** the link is the only difference, and no window, view or canvas changes position or size

### Requirement: Museum-specific accessibility
In addition to what `playground-hub` requires of every playground page:
- each VISTA SHALL have an accessible name with its work's title (on 001, also its letter and its name) and a text description of what the loop shows;
- each épure SHALL have a title and a text description stating what the trail traces, how many moments it has and which segment the loop covers;
- the FORWARD, REWIND and HOLD controls SHALL expose which one is active;
- the scrubber SHALL expose its position to assistive technologies, as a value and as text. When the scrubber receives focus, and at every change of the clock's state (FORWARD, REWIND, HOLD, a drag or an arrow key), the exposed position SHALL equal the drawn position. While the clock runs and the scrubber does not have focus, the exposed position SHALL be updated at most once per second, and its lag behind the drawn position SHALL never exceed one second of loop time plus one frame. While the clock runs and the scrubber has focus, the exposed position MUST NOT change until the state changes or the focus leaves, so that a screen reader does not announce a new value every second; in HOLD it SHALL equal the drawn position;
- when jumping to a sheet, a live region SHALL announce its number and title;
- at 390 px wide, each VISTA SHALL fit whole and without horizontal scrolling: at an integer scale when the loop fits with k ≥ 1 and, otherwise, scaled down according to "Integer scale in device pixels" in `work-loops`. The épure and the title block SHALL go below it.

#### Scenario: Screen reader on a sheet
- **WHEN** a screen reader goes through sheet 003
- **THEN** it reads the name and description of its VISTA, and the title and description of its épure, which says that it traces the path of the subject's center over 450 frames and indicates the loop segment

#### Scenario: Clock state
- **WHEN** a screen reader reaches the clock controls with the clock in HOLD
- **THEN** it announces HOLD as the active control and the scrubber's position

#### Scenario: Sheet on a phone
- **WHEN** the museum is viewed at 390 px wide, with dpr 1 and with dpr 3
- **THEN** each VISTA fits whole, at an integer scale with dpr 3, the épure and the title block go below and the page has no horizontal scrolling

#### Scenario: Position while the clock runs
- **WHEN** the clock runs FORWARD for 6 s with the scrubber on screen and without focus, and the scrubber's exposed value and the frame of its drawn knob are sampled every 100 ms
- **THEN** the exposed value never differs from the knob's frame by more than 16 frames, counting across the loop's wrap, its text says the direction and the frame, and neither changes more than once in any second

#### Scenario: No announcements while focused
- **WHEN** the clock runs FORWARD and the visitor moves focus to the scrubber, then waits 5 s, then presses K
- **THEN** on focus the exposed value equals the knob's frame, it does not change during the 5 s, and after K it equals the knob's frame with the text saying the clock is held

### Requirement: Preview in the index rows
The loop of an index row SHALL be shown only when the row receives focus from the keyboard (the link matches `:focus-visible`) or when the pointer rests on it for at least 300 ms, and SHALL follow the page clock. Passing the pointer over a row for less than 300 ms MUST NOT request its loop, and a press on a row (mouse or touch) MUST NOT open its preview, so the press follows the link. With reduced motion, each row SHALL show only its still poster.

#### Scenario: Pointer passing by
- **WHEN** the visitor moves the pointer across the whole index without resting 300 ms on any row
- **THEN** no loop is requested

#### Scenario: Intent
- **WHEN** the visitor rests the pointer on row 002 for 300 ms, or the row receives focus from the keyboard
- **THEN** the row shows the loop of The golden stoop, at the frame the page clock marks

#### Scenario: A press follows the link
- **WHEN** the visitor taps the poster of row 003, or clicks it with a mouse in less than 300 ms, after the loops are cached
- **THEN** the page goes to `#sheet-003` and the row's poster is not swapped for its loop during the press

#### Scenario: Preview with reduced motion
- **WHEN** with reduced motion the visitor rests the pointer on a row or gives it focus
- **THEN** the row keeps showing its still poster

## ADDED Requirements

### Requirement: Phone chrome
At 759 px wide or less in portrait:
- only the bar's navigation row SHALL stay sticky once the page has scrolled past the collection title, taking at most 46 px at the top;
- the page clock SHALL be a bar fixed at the bottom, at most 80 px tall plus the bottom safe area;
- together, the two SHALL take at most 15% of an 844 px-tall screen;
- the scrubber SHALL be at least 120 px wide at 360 px wide or more, and at least 80 px at 320 px;
- a jump or a deep link to a sheet SHALL leave the sheet's top edge visible just below the sticky row.

On a phone in landscape (at most 500 px tall):
- the bar MUST NOT be sticky;
- the page clock SHALL be fixed at the bottom in a single row, at most 48 px tall plus the safe area;
- each work sheet with a single VISTA SHALL place the VISTA, fitted to the height, beside its épure, and sheet 001 SHALL place its three VISTAS side by side;
- on the featured sheet at load, the whole VISTA, the NOW in the elevation and the scrubber SHALL be visible at the same time.

The touch areas of the museum's controls follow `phone-ergonomics` "Touch targets". None of these rules SHALL change the museum as it renders at 1440×900 or 1680×1050 with a mouse.

#### Scenario: Chrome while reading
- **WHEN** the visitor scrolls the museum at 390×844 past the collection title
- **THEN** the sticky part of the bar is at most 46 px tall, the clock bar at most 80 px, and the index link, the sound button and the three clock states remain visible

#### Scenario: Scrubber on small phones
- **WHEN** the museum loads at 360×780 and at 320×640
- **THEN** the scrubber is at least 120 px and at least 80 px wide respectively, and dragging it with a finger moves every VISTA and NOW without scrolling the page

#### Scenario: Jump under the sticky row
- **WHEN** at 390×844 the visitor taps the index row of 003, or opens `/#sheet-003`
- **THEN** the top edge of sheet 003 is visible just below the sticky row, and not hidden under it

#### Scenario: Landscape phone
- **WHEN** the museum loads at 844×390 on a touch screen
- **THEN** the bar scrolls with the page, the clock is a single row at most 48 px tall at the bottom, and the featured VISTA, the NOW in its elevation and the scrubber are all visible without scrolling

#### Scenario: Desktop unchanged
- **WHEN** the museum renders at 1440×900 and 1680×1050 with a mouse, before and after this change
- **THEN** the screenshots at the top, the index, sheet 001 and the end are identical pixel for pixel
