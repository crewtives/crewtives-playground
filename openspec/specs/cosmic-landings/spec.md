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

The first screen's interaction SHALL comply with `hero-gesture`.

#### Scenario: Landing ready
- **WHEN** the pack finishes loading at `/d/` or at `/e/`
- **THEN** the scene appears with a dithering dissolve, the "synthetic" label is visible and the timecode advances

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

#### Scenario: Opening D from the launcher
- **WHEN** the visitor activates D's link in the launcher
- **THEN** `/d/` opens
