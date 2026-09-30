# cosmic-landings Specification

## Purpose

Defines the two new landings: D, cyberpunk, with the computed falcon and the golden ratio, and E, set in space, with the whale and the black hole. Both carry the same 4D concept (every moment at once) into new worlds and put the whole engine to the test: bake, pack, viewer in time, retro display, gesture hero and story page.

## Requirements

### Requirement: Two landings served and built
The system SHALL serve landing D at `/d/` with the `falcon-phi` pack, and landing E at `/e/` with the `whale-fall` pack. Both SHALL be part of the production build, just like A, B and C. Their copy SHALL be in English.

#### Scenario: Build
- **WHEN** the production build is generated
- **THEN** the output contains the pages `d/index.html` and `e/index.html` and both load their pack without console errors

### Requirement: Live first screen on the same engine
The first screen of each landing SHALL show its 4D scene live: present subject, trail of its moments and background, quantized by the retro display in real time. It SHALL include:
- a boot sequence with real loading progress;
- a visible synthetic-scene label;
- a `MM:SS:FF` timecode;
- the playback state (FORWARD, REWIND, HOLD);
- a color depth selector;
- a time mode control.

These SHALL be on the first screen at every width, phones included. On a narrow screen (up to 760 px wide, or a landscape phone up to 500 px tall), they SHALL stay docked inside the pinned first screen, below or over the bottom of the scene, for the whole hero scroll travel. They MUST NOT be moved below the hero. Controls that belong to the story (for example D's angle θ, E's layers and E's time scrub) MAY stay below the hero, next to the figure they drive.

The first screen's interaction SHALL comply with `hero-gesture`.

#### Scenario: Landing ready
- **WHEN** the pack finishes loading at `/d/` or at `/e/`
- **THEN** the scene appears with a dithering dissolve, the "synthetic" label is visible and the timecode advances

#### Scenario: First-screen tools on a phone
- **WHEN** `/4d-os/d/` or `/4d-os/e/` has finished loading at 360×780, 390×844, 390×664, 430×932, 844×390 or 932×430, and the page is at the very top
- **THEN** the timecode, the playback state, the color depth selector and the time mode control are all inside the viewport

#### Scenario: Changing colors while the loop plays
- **WHEN** on a 390 px phone the visitor, still inside the hero's zoom segment, taps "1-bit"
- **THEN** the scene redraws in 1-bit, the loop keeps playing and the page does not scroll

### Requirement: Real-time sky
E SHALL draw, behind its points, a sky computed live, with the pack's "NOW" as its clock. The display quantizes it and applies dithering to it like the rest of the scene. D draws no sky: behind its city lies the black glass of its scene background. E SHALL show the shadow of a black hole with its gravitationally lensed disk; the disk deforms according to the 3D camera's point of view. With time in HOLD, the sky SHALL stay still.

#### Scenario: Still sky in HOLD
- **WHEN** time is in HOLD and there is no interaction
- **THEN** the sky does not change and no new renders are produced

#### Scenario: Lensing follows the camera
- **WHEN** the visitor orbits E's view
- **THEN** the apparent shape of the disk around the shadow changes with the camera angle

### Requirement: Live math readouts
D SHALL show live, for the current frame:
- the spiral's accumulated angle;
- the radius, and its ratio to the radius a quarter turn earlier (φ);
- the wingbeat phase.

E SHALL show two clocks:
- the visitor's time (the clip's coordinate time);
- the whale's proper time, which falls further and further behind;

and also the distance to the horizon in units of `r_s` and the factor `√(1 − r_s/r)`. All readouts SHALL comply with "Math shared between bake and page" from `procedural-subject`.

#### Scenario: Diverging clocks
- **WHEN** in E time advances from the first to the last frame
- **THEN** the whale's clock stays behind the visitor's clock and the difference grows monotonically

### Requirement: Story page for each landing
Below the hero, each landing SHALL present a complete story page that closes with a footer. D SHALL present, in order:
1. the number φ and the golden angle;
2. the full plate of the spiral flight seen from above;
3. the wingbeat broken down as in Marey's chronophotographs;
4. from equations to points (honest pipeline);
5. figures read from the pack.

E SHALL present, in order:
1. gravity bends time;
2. the full plate of the fall;
3. redshift;
4. the horizon: the last frame never arrives;
5. figures read from the pack.

No pack figure SHALL be written by hand.

#### Scenario: Figures from the pack
- **WHEN** a pack with a different number of frames or points is loaded
- **THEN** the landing's figures change to match the pack

#### Scenario: Walkthrough
- **WHEN** the visitor scrolls down from the released hero to the end
- **THEN** they find the sections in the stated order and the page ends at the footer

### Requirement: Accessibility and reduced motion on the landings
On both landings:
- every control SHALL be keyboard operable, with visible focus and an accessible name;
- every 3D view SHALL carry a text description;
- with `prefers-reduced-motion: reduce` there SHALL be no autoplay, auto-orbit or dissolves, and the sky SHALL stay still;
- in a 390 px viewport the page MUST NOT have horizontal scroll;
- offscreen 3D views MUST NOT render.

#### Scenario: 390 px mobile
- **WHEN** the viewport is 390 px wide
- **THEN** the scene fills the first screen, the tools remain accessible and there is no horizontal scroll

### Requirement: Presence in the launcher
The launcher SHALL link landings D and E as additional experiments, with their name and their thesis, without removing the three existing worlds.

On a narrow screen (up to 760 px wide, or a landscape phone up to 500 px tall), the launcher SHALL show still images of worlds A, B and C, served with the 4D.OS site, with the "Cat" model's credit visible, and MUST NOT request any file of the 4D pack until the visitor activates a "Run the scene live" control. Each window SHALL say, in its own title bar, that it shows a still, until it goes live. The control SHALL sit on the first screen, before the list of worlds, so that it is visible together with the first still, and SHALL show the pack's weight in binary units, computed from the pack's `scene.json` when the site is built. Activating it SHALL load the pack with real progress shown in the control's place, keep the focus where it is, and replace each still with its live view in the same box. A status message SHALL announce that the scene is live, apart from the region that reports the running timecode. A still inside a window that is already described to assistive technologies SHALL NOT be announced a second time.

#### Scenario: Opening D from the launcher
- **WHEN** the visitor activates D's link in the launcher
- **THEN** `/d/` opens

#### Scenario: Launcher on a phone
- **WHEN** `/4d-os/` loads at 390×844
- **THEN** windows A, B and C show stills, each tagged as a still in its title bar, the Cat model credit is visible, no file of `cat-stairs` (not even `scene.json`) is requested, and a 44 px "Run the scene live · 50.4 MiB" control is visible, its figure computed from `scene.json` when the site was built

#### Scenario: The control beside the first still
- **WHEN** `/4d-os/` loads at 390×844 and at 390×664, and the page is at the very top
- **THEN** the "Run the scene live" control and window A's still are both inside the viewport

#### Scenario: Launcher live on request
- **WHEN** the visitor activates "Run the scene live"
- **THEN** the pack loads with real progress shown in the control's place, the focus stays on the control, the three windows become live in place without a layout shift, their "still" tags disappear, and a status message separate from the running timecode announces that the scene is live

#### Scenario: Launcher on a desktop
- **WHEN** `/4d-os/` loads at 1440×900 with a mouse
- **THEN** no still image is requested, and the pack loads and the three windows run live as before
