# time-viewer Specification

## Purpose

Shows a 4D scene in time: the subject at its present moment together with the trail of its other moments, the source camera with its frame, and time controls. All of it is governed by a single shared "NOW".

## Requirements

### Requirement: A single shared NOW
The current time SHALL be a single shared value. The subject's points, the image plane's source frame, the frustum pose, the timecode and the timeline position MUST always reflect the same frame.

#### Scenario: Scrub to a frame
- **WHEN** the visitor moves time to frame `f`
- **THEN** the present subject corresponds to frame `f`, the frustum plane shows source frame `f`, the frustum is at the pose of camera `f` and the timecode shows frame `f`

### Requirement: Playback with direction and speed
The viewer SHALL allow playing forward, rewinding and stopping (HOLD) playback, with speed steps. On reaching one end of the clip, playback SHALL continue from the opposite end.

#### Scenario: Rewind
- **WHEN** the speed is negative
- **THEN** the current frame decreases at the indicated rate

#### Scenario: End of the clip
- **WHEN** forward playback reaches the last frame
- **THEN** it continues from the first frame without stopping

### Requirement: Present color by direction
The subject at its present frame SHALL be shown in a different color depending on the playback direction: one for forward, another for rewind and another for HOLD.

#### Scenario: Direction change
- **WHEN** playback switches from forward to rewind
- **THEN** the color of the present subject changes from the forward color to the rewind color on the next rendered frame

### Requirement: Time modes
The viewer SHALL offer two modes:
- **memory:** shows the present and the trail of the past, with no point from the future;
- **all at once:** also shows the future moments, dimmed relative to the past.

#### Scenario: Memory mode
- **WHEN** the mode is memory and the current frame is `f`
- **THEN** no point from frames after `f` is shown

#### Scenario: All-at-once mode
- **WHEN** the mode is all at once
- **THEN** points from every frame of the clip are shown, and those from the future at lower intensity or density than those from the past

### Requirement: Trail that fades with age
The visible density of the trail SHALL decrease as the temporal distance from the present increases. The viewer SHALL allow showing only one in every `k` frames in the trail.

#### Scenario: Age
- **WHEN** two past moments at different distances from the present are compared
- **THEN** the farther one is shown with equal or lower density than the nearer one

### Requirement: Frustum light
Background points that fall inside the frustum of the current frame's camera SHALL be shown at full intensity, and those that fall outside SHALL be shown dimmed.

#### Scenario: Source camera movement
- **WHEN** time advances and the source camera changes orientation
- **THEN** the lit area of the background moves, following the current frustum

### Requirement: Toggleable layers
The visitor SHALL be able to independently show or hide the trail, the background, the frustum with its source frame, and the camera trajectory.

#### Scenario: Hide the background
- **WHEN** the visitor hides the background layer
- **THEN** the background is no longer visible and the rest of the layers do not change

### Requirement: Changing time does not reload data
Changing the time, the direction or the mode MUST NOT transfer the point data to the GPU again or iterate over the points on the CPU.

#### Scenario: Continuous scrub
- **WHEN** the visitor drags the timeline from end to end
- **THEN** the geometry memory reported by the renderer does not change and there are no new point-buffer transfers

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

### Requirement: On-demand rendering
The viewer MUST NOT render new frames when the time, the camera, the layers and the display mode do not change.

#### Scenario: Idle
- **WHEN** playback is on HOLD and there is no interaction
- **THEN** no new viewer renders are produced

### Requirement: Present interpolated between frames
When the 4D pack declares point correspondence between frames, the present subject SHALL be drawn at the position interpolated between the current frame and the next one, according to the continuous time position. This way the motion of the present is continuous at the display's refresh rate. Everything derived from the integer frame SHALL keep showing the integer frame: timecode, source frame, frustum pose, trail layer and direction color. On HOLD, the present SHALL match the current frame exactly.

#### Scenario: Half frame
- **WHEN** the continuous time position is `f + 0.5` in a 4D pack with correspondence
- **THEN** each present point is drawn halfway between its position at `f` and at `f + 1`, and the timecode shows frame `f`

#### Scenario: No correspondence
- **WHEN** the 4D pack does not declare correspondence
- **THEN** the present is drawn at the positions of the integer frame, as before
