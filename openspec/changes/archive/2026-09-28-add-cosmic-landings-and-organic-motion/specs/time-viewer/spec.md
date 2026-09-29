# Spec Delta

## MODIFIED Requirements

### Requirement: Exploration camera
The visitor SHALL be able to orbit and zoom the view within limits that keep the scene framed. Zooming in and out SHALL be done with a pinch: two fingers on touch screens, or the trackpad pinch gesture. The wheel without a pinch MUST NOT change the zoom of any view: it scrolls the page. Over a view, a vertical one-finger swipe SHALL scroll the page, even when the view orbits. In a view governed by the gesture-driven hero, the pinch SHALL add to the hero's zoom instead of moving the camera on its own. Without interaction, the view SHALL orbit slowly, unless the system indicates a preference for reduced motion.

#### Scenario: Reduced motion
- **WHEN** the system indicates `prefers-reduced-motion: reduce`
- **THEN** the view does not orbit on its own and playback does not start automatically

#### Scenario: Wheel over a view
- **WHEN** the visitor turns the wheel without a pinch over any 3D view on the page
- **THEN** the page scrolls and the camera distance of that view does not change

#### Scenario: Pinch over a view
- **WHEN** the visitor spreads two fingers apart, or makes the trackpad pinch, over a view that allows orbiting
- **THEN** the camera moves closer within its limits and the browser does not zoom the page

#### Scenario: One finger over a view on mobile
- **WHEN** on a phone the visitor swipes one finger vertically over a 3D view
- **THEN** the page scrolls

### Requirement: Third-person camera
A world SHALL be able to frame the scene with a camera that follows the subject from behind and at a diagonal, using the continuous "NOW". The visitor SHALL be able to drag to orbit 360° around the subject, even below the horizon.

On release, the angle SHALL return on its own to the position behind. The distance the visitor chose with the zoom SHALL be preserved.

While time runs, the camera SHALL accompany the subject without the visitor using the mouse. When zoomed out to the maximum, the camera SHALL switch from following the subject to framing its complete path.

Whatever comes between the camera and the subject, except the ground the subject stands on, SHALL be cut away. When looping playback goes back from the last frame to the first, the camera MUST NOT visibly travel the path between both ends.

#### Scenario: No interaction
- **WHEN** time advances and the visitor does not touch the view
- **THEN** the camera follows the subject from behind at a diagonal and the subject stays in view, without being hidden by the background

#### Scenario: Drag and release
- **WHEN** the visitor drags the view until seeing the subject from the front or from below, and releases it
- **THEN** while dragging, the view accompanies the subject at the chosen angle; a few seconds after release, the angle smoothly returns to the view from behind and the distance is kept

#### Scenario: Full plate
- **WHEN** the zoom reaches maximum zoom-out
- **THEN** the camera frames all of the subject's moments at once, instead of following only the present

#### Scenario: Loop seam
- **WHEN** looping playback passes from the last frame to the first
- **THEN** the camera appears directly behind the subject at the start of its path, with no visible sweep between both ends

## ADDED Requirements

### Requirement: Present interpolated between frames
When the 4D pack declares point correspondence between frames, the present subject SHALL be drawn at the position interpolated between the current frame and the next one, according to the continuous time position. This way the motion of the present is continuous at the display's refresh rate. Everything derived from the integer frame SHALL keep showing the integer frame: timecode, source frame, frustum pose, trail layer and direction color. On HOLD, the present SHALL match the current frame exactly.

#### Scenario: Half frame
- **WHEN** the continuous time position is `f + 0.5` in a 4D pack with correspondence
- **THEN** each present point is drawn halfway between its position at `f` and at `f + 1`, and the timecode shows frame `f`

#### Scenario: No correspondence
- **WHEN** the 4D pack does not declare correspondence
- **THEN** the present is drawn at the positions of the integer frame, as before
