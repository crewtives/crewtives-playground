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
On narrow screens, the windows SHALL stack below the viewer instead of floating over it, and the timeline SHALL remain accessible. The page MUST NOT have horizontal scroll.

Where the first screen is a gesture hero, on narrow screens:
- the viewer SHALL fill the first screen and respond to swipe and pinch according to `hero-gesture`;
- a vertical one-finger swipe MUST NOT get trapped: it scrolls the page natively, and the skip-to-content link goes to the next section immediately.

#### Scenario: 390px phone
- **WHEN** the viewport is 390px wide
- **THEN** the viewer fills the available width, the windows appear stacked below it and there is no horizontal scroll

#### Scenario: Swiping to the windows
- **WHEN** on a 390px phone the visitor swipes up steadily from the hero
- **THEN** the scene zooms out, the video reaches its last frame and the page scrolls until the stacked windows are shown
