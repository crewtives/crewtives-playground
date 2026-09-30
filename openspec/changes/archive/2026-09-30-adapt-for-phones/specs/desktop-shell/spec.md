# Spec Delta

## MODIFIED Requirements

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
