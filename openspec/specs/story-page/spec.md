# story-page Specification

## Purpose

Continues the first screen with a chaptered story page that explains and dramatizes 4D reconstruction (2D + time, the pipeline, scroll as time, the figures and the scenes), and closes with its own footer.

## Requirements

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

### Requirement: 2D + time = 3D
The chapter SHALL show a Game of Life automaton whose successive generations stack in depth and form a 3D structure, so that a glider's motion is seen as a shape in space.

#### Scenario: Stacked generations
- **WHEN** the chapter is on screen
- **THEN** several stacked generations are visible, and the most recent one is distinguishable from the earlier ones

### Requirement: Honestly explained pipeline
The pipeline chapter SHALL describe the real process (2D video → 3D per frame → each frame left in its place and its moment) and SHALL state that the scene shown is synthetic.

#### Scenario: Synthetic scene notice
- **WHEN** the visitor reads the pipeline chapter with a synthetic pack loaded
- **THEN** the chapter explicitly states that the scene is synthetic

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

### Requirement: Figures read from the pack
The figures chapter SHALL show values computed from the loaded pack: frames, total points, size in bytes and duration. It MUST NOT show hand-written figures.

#### Scenario: A different pack
- **WHEN** a pack with a different point density is loaded
- **THEN** the chapter's figures change to match the new pack

### Requirement: Scenes
The scenes chapter SHALL list the available scenes, with the synthetic scene as the active one. Unavailable scenes SHALL be marked as such and MUST NOT be selectable.

#### Scenario: Unavailable scene
- **WHEN** the visitor tries to select a scene marked as unavailable
- **THEN** no scene change occurs and the "unavailable" state is visible

### Requirement: Footer with dotted wireframe
The footer SHALL show a three-dimensional logo drawn only with edges in dotted lines, which turns toward the cursor and whose dashes advance continuously. With reduced motion it SHALL stay static. On narrow screens, the logo's box SHALL be no taller than the screen is wide, and the footer MUST NOT leave more than half a screen of empty space after the last section's text.

#### Scenario: Cursor tracking
- **WHEN** the visitor moves the cursor over the footer
- **THEN** the logo turns toward the cursor's position

#### Scenario: Footer on a phone
- **WHEN** the visitor reaches the end of world A, B or C at 390×844
- **THEN** from the bottom of the last question of the FAQ to the end of the page there are at most 520 px

### Requirement: Offscreen views at rest
The page's 3D views that are offscreen MUST NOT render.

#### Scenario: Scrolled away
- **WHEN** the footer is offscreen
- **THEN** no frames of the footer logo are rendered

### Requirement: Original material and licenses
The page MUST NOT include assets, fonts or text from the reference aesthetic's site. Every typeface SHALL have a free license (OFL or equivalent). Every third-party 3D model SHALL be CC0, public domain or CC-BY; a CC-BY model SHALL be credited in visible text on the page (author and license).

#### Scenario: Asset audit
- **WHEN** the assets and fonts served by the page are reviewed
- **THEN** none comes from the reference aesthetic's site and all have a documented free license

#### Scenario: Model credit
- **WHEN** the loaded scene uses a CC-BY model
- **THEN** the page shows its author and its license in visible text
