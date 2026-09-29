# Spec Delta

## MODIFIED Requirements

### Requirement: Chapter structure
In worlds A, B and C, the page SHALL present, after the desktop, in order:
1. a headline;
2. the "2D + time = 3D" chapter;
3. the pipeline chapter;
4. the "Scroll is time" chapter;
5. the figures chapter;
6. the scenes chapter;
7. the frequently asked questions;
8. the footer.

In B, chapter 4 is fulfilled by the final segment of the gesture hero, which carries time to the last frame. Landings D and E follow their own structure, defined by `cosmic-landings`. The copy SHALL be in English.

#### Scenario: Full walkthrough
- **WHEN** the visitor scrolls from the desktop of A, B or C to the end
- **THEN** they find the sections in the stated order and the page ends at the footer

### Requirement: Scroll is time
During the "Scroll is time" chapter of the worlds that have it as a section of its own (A and C), the viewer SHALL stay pinned on screen and scroll progress SHALL determine the scene's time monotonically:
- scrolling down advances time with the forward color;
- scrolling up moves it back with the rewind color.

On leaving the chapter, playback SHALL return to its previous state.

#### Scenario: Scrolling down
- **WHEN** the visitor scrolls down within the chapter
- **THEN** the current frame increases and the present subject uses the forward color

#### Scenario: Scrolling up
- **WHEN** the visitor scrolls up within the chapter
- **THEN** the current frame decreases and the present subject uses the rewind color

#### Scenario: Leaving
- **WHEN** the visitor leaves the chapter
- **THEN** playback recovers the direction and speed it had before entering

### Requirement: Scroll-pinned hero
In world B and in landings D and E, the first screen SHALL behave as a gesture hero according to `hero-gesture`:
- at the very top, the animation runs in a loop;
- scrolling down pulls the camera back to the full plate, and then carries the video to the last frame, where it stops;
- only then does the page move on to the next section.

The gesture's pauses and the final HOLD MUST NOT trigger the HOLD effect. The hero SHALL also pin on narrow screens.

#### Scenario: Scrolling down from the hero
- **WHEN** the visitor scrolls down from the first screen
- **THEN** the first screen stays pinned while the camera pulls back and the video reaches its last frame; then the next section appears

#### Scenario: Returning to the top
- **WHEN** the visitor returns to the top of the page and keeps scrolling up
- **THEN** time moves back from the last frame and, when that segment ends, looped playback resumes
