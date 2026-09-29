# Spec Delta

## MODIFIED Requirements

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
