# desktop-shell Specification

## Purpose

Presents the first screen as the desktop of an old operating system ("4D.OS"), with the 4D viewer as the background and windows that work as tools for time, camera, layers and display.

## Requirements

### Requirement: Boot with real progress
When the page loads, the desktop SHALL show a boot window with the real progress of loading the 4D pack. When loading completes, the scene SHALL be revealed with a dither-threshold dissolve. If loading fails, the boot window SHALL show the error.

#### Scenario: Successful load
- **WHEN** the pack finishes loading
- **THEN** the progress bar reaches 100% and the scene appears through a pixel dissolve

#### Scenario: Failed load
- **WHEN** loading the pack fails
- **THEN** the boot window stays visible and shows the reason for the error

#### Scenario: Reduced motion
- **WHEN** the system indicates `prefers-reduced-motion: reduce`
- **THEN** the scene appears without an animated dissolve

### Requirement: Desktop windows
The desktop SHALL show these windows, each with a title bar:
- a clock with the source timecode;
- the source camera with its current frame;
- layers and time modes;
- display with the color depth selector;
- timeline.

#### Scenario: Desktop ready
- **WHEN** boot finishes
- **THEN** the five windows are visible and working over the viewer

### Requirement: Draggable windows
The visitor SHALL be able to move each window by dragging its title bar, without it leaving the visible area. The window that is touched SHALL come to the front.

#### Scenario: Dragging to the edge
- **WHEN** the visitor drags a window past the edge of the screen
- **THEN** the window stays contained within the visible area

#### Scenario: Bring to front
- **WHEN** the visitor presses on a window covered by another one
- **THEN** that window moves above the others

### Requirement: Timeline
The timeline SHALL show:
- the timecode in `MM:SS:FF` format;
- a playhead over a ruler with second marks;
- the playback state with direction and speed (for example `FORWARD +1.00×`, `REWIND −1.00×`, `HOLD 0.00×`).

The visitor SHALL be able to jump to a time by pressing on the ruler and to scrub by dragging the playhead.

#### Scenario: Scrub
- **WHEN** the visitor drags the playhead
- **THEN** the timecode, the present subject and the source frame update continuously during the drag

#### Scenario: Playback state
- **WHEN** playback is stopped
- **THEN** the timeline shows `HOLD 0.00×`

### Requirement: Keyboard control
The desktop SHALL respond to:
- space: toggle between HOLD and resume;
- J: rewind, speeding up with repeated presses;
- K: HOLD;
- L: play forward, speeding up with repeated presses;
- left and right arrows: step back or forward one frame.

All controls MUST be reachable by keyboard and have a visible focus and an accessible name.

#### Scenario: Speeding up with L
- **WHEN** the visitor presses L twice in a row during forward playback
- **THEN** the speed rises to the next step and the timeline shows it

#### Scenario: Frame by frame
- **WHEN** playback is on HOLD and the visitor presses the right arrow
- **THEN** time advances exactly one frame

### Requirement: Window trail
The desktop SHALL include an old-style dialog window that, when dragged, leaves a trail of copies at its previous positions: the 2D version of "every moment at once". The trail SHALL clear when the dialog is released or after a while, and SHALL be disabled under reduced motion.

#### Scenario: Dragging the dialog
- **WHEN** the visitor drags the dialog across the desktop
- **THEN** visible copies of the dialog remain along its path

### Requirement: Synthetic label
When the loaded pack is synthetic, the desktop SHALL visibly show that the scene is synthetic.

#### Scenario: Synthetic scene
- **WHEN** the pack declares `synthetic: true`
- **THEN** the "synthetic" label is visible on the first screen without any interaction

### Requirement: Narrow viewport
On narrow screens (up to 760 px wide, or 820 px for world C, and phones in landscape up to 500 px tall), the windows SHALL NOT float over the viewer and SHALL NOT be dragged. In the worlds that have floating tool windows (worlds A, B and C), the tool windows SHALL instead be gathered in a window dock: a row of buttons, one per window, each named after its window's title. At most one window is open at a time, and it follows its button. The window dock SHALL sit where the viewer stays on screen while a window is open:
- in a world whose first screen is not a gesture hero: in the flow of the page, directly below the viewer's timeline or strip;
- in a world whose first screen is a gesture hero: at the bottom of the pinned first screen, with the open window directly above the dock; while a window is open, the viewer SHALL frame its subject in the space left between the caption and the window's top, so the whole subject stays in view, smaller, instead of being covered; on a phone in landscape, in the caption column beside the viewer.

A docked window MUST NOT scroll inside itself: it SHALL fit the space the dock leaves for it at 390×664. The launcher and worlds D and E have no floating tool windows and get no dock: their first screens follow `cosmic-landings` "Live first screen on the same engine" and "Presence in the launcher".

Opening or closing a window MUST NOT scroll the page, move the focus or change the viewer's size; in a gesture hero it MAY change the viewer's framing as set out above. The dock's buttons SHALL wrap onto more rows rather than scroll sideways. Each dock button SHALL have an accessible name and expose whether its window is open. The dock's buttons SHALL come in focus order in the order they are shown, and the open window SHALL follow its button. Escape SHALL close the open window, and if the focus was inside it, the focus SHALL return to its button. The order of the page's sections and windows in the document SHALL follow the order in which narrow screens show them, so that focus order and reading order agree. The timeline SHALL remain reachable. A note that asks the visitor to drag a window SHALL NOT be shown. The page MUST NOT have horizontal scroll.

Where the first screen is a gesture hero, on narrow screens:
- the viewer SHALL fill the first screen together with its caption and the window dock, and respond to swipe and pinch according to `hero-gesture`;
- a vertical one-finger swipe MUST NOT get trapped, including over the window dock and an open window: it scrolls the page natively, and the skip-to-content link goes to the next section immediately.

#### Scenario: 390px phone
- **WHEN** the viewport is 390px wide
- **THEN** the viewer fills the available width, the dock's buttons are visible on the first screen without scrolling, no window floats over the viewer except one opened from the dock of a gesture hero, and there is no horizontal scroll

#### Scenario: Changing a layer while watching
- **WHEN** on a 390×844 phone the visitor opens "Layers" from the dock of world A and turns "Trail" off
- **THEN** without scrolling, the whole viewer and the whole Layers window are on screen, and the trail disappears from the viewer

#### Scenario: Short phone
- **WHEN** on a 390×664 phone the visitor opens any window from the dock of world A or C
- **THEN** there is a scroll position at which that whole window and at least 85% of the viewer are on screen

#### Scenario: A window over the hero
- **WHEN** on a 390×844 phone the visitor opens "Exposures" from the dock of world B during the hero and picks 2 exposures per second
- **THEN** the page does not scroll, the window appears above the dock, the whole plate stays visible above the window, and the plate shows the new exposures

#### Scenario: Every window of the hero on a short phone
- **WHEN** on a 390×664 phone, and on a 360×780 phone, the visitor opens each window of world B's dock in turn at the top of the hero
- **THEN** the page does not scroll, the whole window is on screen with no scroll inside it, and the whole plate is visible between the caption and the window

#### Scenario: Swiping to the windows
- **WHEN** on a 390px phone the visitor swipes up steadily from world B's hero, with or without a window open
- **THEN** the scene zooms out, the video reaches its last frame, and the page scrolls on to the next section; the windows stay in the dock of the pinned first screen for the whole hero and leave together with it, and none is stacked after the hero

#### Scenario: Closing with the keyboard
- **WHEN** the focus is on a control inside the open window and the visitor presses Escape
- **THEN** the window closes, the focus lands on its button and the page does not scroll

#### Scenario: Phone in landscape
- **WHEN** the viewport is 844×390
- **THEN** the viewer and its timeline are fully visible without scrolling, no window covers the viewer, and the dock sits beside the viewer

#### Scenario: Wide screens unchanged
- **WHEN** the viewport is wider than the narrow limit and the pointer is fine
- **THEN** the windows float over the viewer and can be dragged as before, and no dock exists
