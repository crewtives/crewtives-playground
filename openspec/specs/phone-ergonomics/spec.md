# phone-ergonomics Specification

## Purpose
Defines what every public page of the site guarantees on phones: touch targets, seeing a control's effect while using it, scrolling that is never trapped, short and landscape screens, pinned and docked panels that never hide focus, readable text, and a desktop that does not change. The pages are the museum `/`, `/bloomscope/`, `/landings/game-center/`, `/landings/wind-up-empire/`, the launcher `/4d-os/` and the worlds `/4d-os/a/` to `/4d-os/e/`.

## Requirements

### Requirement: Phone rules leave the desktop unchanged
Every rule that exists for phones SHALL apply only under a phone condition: a coarse pointer, a viewport at most 900 px wide, or a landscape viewport at most 520 px tall, or a narrower condition that a page's own requirements name. With a fine pointer at 1440×900 and at 1680×1050, every page SHALL paint exactly what it painted before those rules existed. The only exceptions are the wording that `site-metadata` "Tab titles and self-description" sets. The recorded loops of the museum SHALL keep every frame.

An element that exists only for phones SHALL be created by the page's script while a phone condition matches, and removed when it stops matching, so that the desktop document keeps its elements. The exceptions are the ones a page's own requirements name: the document order that `desktop-shell` "Narrow viewport" sets, and elements that are the same on every screen, such as a span around a word.

#### Scenario: Desktop render unchanged
- **WHEN** each public page is rendered at 1440×900 and at 1680×1050 with a mouse and reduced motion, before and after a phone change, and screenshots are taken at the top, at every section and at the end
- **THEN** the screenshots are identical pixel for pixel, except inside the boxes of the lines whose wording `site-metadata` "Tab titles and self-description" sets

#### Scenario: Phone queries off on a desktop
- **WHEN** every media query that a phone rule uses is evaluated in a desktop browser at 1440×900 and at 1680×1050 with a mouse
- **THEN** none of them matches

#### Scenario: Loops unchanged
- **WHEN** the museum's loops are recorded again after a phone change
- **THEN** every frame and every poster has the same hash as before

### Requirement: Touch targets
On a coarse pointer, every control on a public page SHALL respond to a touch over at least 44 × 44 CSS px. That includes buttons, links outside running sentences, slider tracks, scrubbers, radio and checkbox options, window and panel controls, and the link back to the museum. A control's drawn size MAY be smaller than its touch area. Two touch areas MUST NOT overlap: where growing a control's touch area around its drawing would reach a neighbor's, the control's own cell SHALL grow instead. Links inside a sentence and the skip link, which is visible only on focus, are exempt. A drawing surface that is operated as a whole, such as a canvas the visitor paints on, counts as one control. Controls drawn as the adjacent letters of one word, such as Game Center's gas-sign tubes, MAY instead be at least 40 px wide and 52 px tall below 390 px wide, edge to edge, provided no two of them overlap.

#### Scenario: Probing the targets
- **WHEN** each page is loaded at 390×844 on a touch screen and each visible box-shaped control is probed 21 px from its center in the four directions (or, for the letters of one word, at most half their size less 1 px), and each ring-shaped control is probed across its band at four angles
- **THEN** every probe lands on that control or its label, and no probe lands on another control

#### Scenario: No overlapping touch areas
- **WHEN** the touch areas of neighboring controls are measured at 390×844 and 360×780
- **THEN** no point on the screen is claimed by the touch areas of two controls

#### Scenario: Gas-sign letters at 360
- **WHEN** Game Center's roof is measured at 360×780 on a touch screen
- **THEN** each of the eight gas-sign tubes is at least 40 px wide and 52 px tall, and no two tubes' touch areas overlap

### Requirement: See the effect while using a control
On a phone, every control of a toy or of a view SHALL be operable while the visual it changes is on screen:
- a toy's visual SHALL be fully visible while any of its controls is used, at 390×844, at 390×664 and at 360×780 in portrait; in landscape at 844×390 at least 80% of it SHALL be visible;
- a tool window of a 4D.OS world SHALL be visible together with the view it acts on, as `desktop-shell` "Narrow viewport" sets out;
- where the visual cannot share a screen with its controls, it SHALL stay pinned while its controls scroll beneath it, or its controls SHALL be docked inside its pinned first screen.

A control whose effect is global to the page (color depth, time mode, playback) MAY instead show its effect on any view that is on screen.

#### Scenario: The lathe
- **WHEN** at 390×844 the visitor drags "Stretch time" from Rosette to Staircase in Bloomscope
- **THEN** the whole rosette stays on screen for the whole drag

#### Scenario: The rewind
- **WHEN** at 390×664 the visitor turns the 4F jog wheel back
- **THEN** the whole Parlour glass stays on screen for the whole turn

#### Scenario: A window
- **WHEN** at 390×664 the visitor opens "Layers" in world A and turns "Trail" off
- **THEN** at some scroll position the whole Layers window and at least 85% of the scene are on screen, and the trail disappears from the scene

### Requirement: Scrolling is never trapped
On a touch screen, a vertical swipe that starts on any visual (canvas, view, stage, image or drawing) SHALL scroll the page. A gesture that competes with vertical scrolling SHALL be claimed only from a visible grip or from a control built to be dragged (a slider, a scrubber, a joystick, a jog wheel, a drag handle), never from a strip that crosses content. A control built to be dragged MAY keep a touch that starts on it in any direction (for example the outer ring of Bloomscope's dial). A held button SHALL keep its hold through small finger movements and MUST NOT start a text selection or a system callout.

#### Scenario: Swipe over a pinned stage
- **WHEN** a pinned stage is on screen and the visitor swipes up over its visual
- **THEN** the page scrolls

#### Scenario: Swipe that starts on a toy
- **WHEN** the visitor swipes up starting on the museum's ground line, away from its grip, or on the Wind-Up Empire rocket
- **THEN** the page scrolls, and nothing folds, winds or launches

#### Scenario: A held button and a drifting finger
- **WHEN** the visitor holds a held button, such as the Game Center joystick's "Steer up" or Bloomscope's "Hold to sow", and the finger drifts 20 px
- **THEN** the hold continues, the page does not scroll and no selection or callout appears

### Requirement: Short and landscape phones
The criteria of "See the effect while using a control" SHALL also hold at 390×664, which approximates a phone browser with its toolbars shown. On a phone in landscape (at most 500 px tall), a toy's visual and its primary controls SHALL be on screen together, with the visual fitted to the screen's height; a section MAY place them side by side. A top bar that carries no live state MUST NOT stay pinned in landscape; a bar that shows live state (Wind-Up Empire's resource strip) MAY stay pinned if it is a single row at most 56 px tall.

At 360, 390 and 430 px wide, and in landscape at 667×375, 844×390 and 932×430, no page SHALL scroll horizontally, and no element SHALL extend past the right edge of the viewport, except inside a region built to scroll or clip sideways (for example the 2F cabinet aisle or C's film strip). A window dock never scrolls sideways: its buttons wrap onto more rows instead. Heights that follow the screen SHALL use the small viewport height, so that the layout does not change when the browser's toolbar hides.

#### Scenario: Nothing clipped at 360
- **WHEN** every page is loaded at 360×780 and scrolled from top to bottom
- **THEN** no element outside a sideways scroller or clip region has its right edge past 360 px

#### Scenario: Landscape
- **WHEN** any toy is used at 844×390
- **THEN** its visual and its primary controls are on screen together

#### Scenario: Toolbar hidden
- **WHEN** a page is scrolled on a phone and the browser's toolbar hides
- **THEN** no pinned stage, stage deck or first screen changes its height

### Requirement: Pinned and docked panels
A pinned stage, a stage deck, a window dock or a bottom bar SHALL:
- never hide the element that has keyboard focus: the page scrolls so that the focused element is fully visible outside the panel;
- never trap focus, and never move focus or scroll the page when opened or closed;
- be closable with Escape when it can be opened or closed, returning focus to the control that opened it;
- expose its state to assistive technologies (for example `aria-expanded`);
- never animate by itself, and open and close without animation when reduced motion is requested;
- never cover another fixed bar of the page.

#### Scenario: Focus under a pinned stage
- **WHEN** the lathe's stage is pinned and the keyboard focus moves to "Plump" while it lies beneath the stage
- **THEN** "Plump" is fully visible below the stage

#### Scenario: Escape closes a window
- **WHEN** focus is inside a window opened from a 4D.OS window dock and the visitor presses Escape
- **THEN** the window closes, focus returns to its button and the page does not scroll

#### Scenario: Focus above a bottom bar
- **WHEN** at 390×844 the visitor tabs through the museum
- **THEN** no focused element outside the clock bar lies under the clock bar or under the sticky top row

### Requirement: Readable text on phones
At 390 px wide:
- body text and every sentence SHALL be at least 12 px;
- every control label, including the text inside a push button, and every "synthetic" tag SHALL be at least 11 px.

Readouts set in a screen typeface, scale annotations and units inside large numerals are exempt.

#### Scenario: Measuring text
- **WHEN** every visible text node on each page is measured at 390×844
- **THEN** none is below its minimum, except the exempt readouts

### Requirement: Contrast of phone elements
Every element that a page creates or restyles only for phones SHALL meet the contrast of `playground-hub` "Accessibility" against what is painted behind it: at least 4.5:1 for text, and at least 3:1 for glyphs, grips, the edges of controls and focus indicators. Where a phone skin restyles an element whose desktop color falls short, the phone skin SHALL meet the bar, even though the desktop keeps its color.

#### Scenario: Measuring the phone elements
- **WHEN** each page is loaded at 390×844 on a touch screen and every element created or restyled under a phone condition is sampled against the pixels behind it
- **THEN** its text reaches at least 4.5:1, and its glyphs, grips and focus indicator at least 3:1

#### Scenario: A docked window's legends
- **WHEN** a window of world B is opened from its dock at 390×844
- **THEN** its legends and its title bar's aside reach at least 4.5:1 against the window
