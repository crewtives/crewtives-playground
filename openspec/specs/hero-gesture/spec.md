# hero-gesture Specification

## Purpose

Defines how the first screen of a 4D page turns page scrolling, pinching and the keyboard into scene zoom. Time runs in a loop, and a final segment takes the video to its last frame before the next section appears. A gesture always produces a single visible effect.

## Requirements

### Requirement: First screen pinned during the gesture
When scrolling down from the very top, the first screen SHALL stay pinned on screen for as long as the hero's scroll travel lasts. During that travel, scrolling SHALL change the scene instead of moving the content. This applies to:
- the wheel;
- a one-finger swipe;
- the scrollbar;
- the page-advance keys.

The scroll travel SHALL be the same on narrow screens. The hero MUST NOT hijack scrolling with code that cancels the browser's events: page scrolling stays native, with the browser's inertia and accessibility.

#### Scenario: Wheel on load
- **WHEN** the visitor turns the wheel down with the page at the very top, freshly loaded
- **THEN** the first screen does not move on screen and the scene zooms out

#### Scenario: Touch swipe
- **WHEN** the visitor swipes one finger up over the first screen on a 390 px phone
- **THEN** the first screen does not move on screen and the scene zooms out

### Requirement: One gesture, one effect
The hero's scroll travel SHALL be divided into segments that do not overlap:
1. **zoom:** scrolling changes only the camera distance;
2. **final segment:** scrolling changes only the time;
3. **pause:** scrolling changes nothing visible before the next section appears.

No event SHALL change both the zoom and the time at once, nor both the zoom and the position of the content. There MUST NOT be a second zoom control overlaid on the same view (for example, the orbit's own wheel zoom).

#### Scenario: One wheel notch over the scene
- **WHEN** the visitor turns the wheel one notch with the pointer over the scene, within the zoom segment
- **THEN** the camera distance changes only once, the current frame continues its normal playback and the first screen does not move

#### Scenario: Page released
- **WHEN** the next section is already on screen and the visitor turns the wheel over the scene
- **THEN** the page scrolls and the camera distance does not change

### Requirement: Scroll-driven zoom
In the zoom segment, scrolling down SHALL move the camera away and scrolling up SHALL bring it closer, between a minimum and a maximum. The distance SHALL vary proportionally on a logarithmic scale and follow the scroll with a single layer of smoothing. When zoomed out to the maximum, the framing SHALL open up to show the subject's complete path with all of its moments.

#### Scenario: Zoom without spring-back
- **WHEN** the visitor zooms the scene out and stops touching for 5 seconds
- **THEN** the camera distance stays at the value reached

#### Scenario: Full plate
- **WHEN** the camera reaches maximum zoom-out
- **THEN** the subject's complete path (the box of all of its moments) is inside the frame

### Requirement: Pinch
A two-finger pinch on touch screens, and a trackpad pinch on desktop, SHALL change the scene zoom, adding to the scroll zoom within the same limits. It MUST NOT zoom the browser page. A vertical one-finger swipe over the scene SHALL scroll the page (and with it the hero's scroll travel). Spreading the fingers apart zooms in; bringing them together zooms out.

#### Scenario: Pinch on mobile
- **WHEN** the visitor spreads two fingers apart over the hero scene
- **THEN** the camera moves closer and the scale of the browser page does not change

#### Scenario: Trackpad pinch
- **WHEN** the visitor makes the pinch gesture on a desktop trackpad over the scene
- **THEN** the scene zoom changes, the page does not scroll and the browser does not zoom the page

### Requirement: Loop in the hero
While the page is in the zoom segment, the animation SHALL play forward in a loop, with its own clock and independently of scrolling, except under reduced motion. The wrap from the last frame to the first SHALL be covered by a dithering-threshold dissolve, with no visible camera jump.

#### Scenario: Loop seam
- **WHEN** automatic playback passes from the last frame to the first
- **THEN** the scene dissolves and reappears from the first frame, and the camera is not seen sweeping from one end of the path to the other

#### Scenario: Scrolling does not advance the video
- **WHEN** the visitor scrolls down within the zoom segment
- **THEN** the current frame advances only at the playback rate, not with the scroll

### Requirement: Final segment to the last frame
In the final segment, scrolling down SHALL take the time monotonically from the frame at which the segment began to the last one, with the forward color. Scrolling up SHALL rewind with the rewind color. The segment SHALL have the same scroll length regardless of the frame at which it began. On reaching the end of the segment, time SHALL stay stopped at the last frame, with HOLD on the timeline. The HOLD at the end and the pauses of the gesture MUST NOT trigger the effect that belongs to a HOLD requested by the visitor.

#### Scenario: Reaching the end
- **WHEN** the visitor scrolls down to the end of the final segment
- **THEN** the current frame is the last one and the timeline shows HOLD

#### Scenario: Rewind and return to the loop
- **WHEN** in the final segment the visitor scrolls up until back in the zoom segment
- **THEN** the current frame moves back with the rewind color while scrolling up, and on entering the zoom segment looping playback continues forward from that frame

### Requirement: Next section only at the end
The next section MUST NOT come on screen before the camera is at maximum zoom-out and time is stopped at the last frame. If the visitor reaches the next section without going through the scroll travel (a link, the End key, the scrollbar), the hero SHALL remain in its final state: fully zoomed out and at the last frame.

#### Scenario: Scroll travel order
- **WHEN** the visitor scrolls down continuously from the very top
- **THEN** first the camera zooms out, then the video reaches the last frame, and only then does the next section appear

#### Scenario: Direct jump
- **WHEN** the visitor activates the skip-to-content link
- **THEN** the page moves to the next section and the hero remains fully zoomed out and at the last frame

### Requirement: Accessible exits
The hero's scroll travel SHALL be operable with the native scrolling keys (arrows, Page Down, Page Up, Home, End). Space keeps its role of toggling HOLD. A skip-to-content link SHALL exist and be the first focusable element. A visible control SHALL allow pausing the loop. The visitor MUST NOT be left without a way out of the hero.

#### Scenario: Keyboard from start to finish
- **WHEN** the visitor presses Page Down repeatedly from the very top
- **THEN** the camera zooms out, time reaches the last frame and the page moves to the next section

### Requirement: Reduced motion in the hero
With `prefers-reduced-motion: reduce`, the hero MUST NOT play on its own or dissolve, and scrolling MUST NOT have added inertia. The zoom and the final segment SHALL follow the scroll without smoothing. The page SHALL still reach the next section.

#### Scenario: Reduced
- **WHEN** the system indicates reduced motion and the visitor scrolls down from the hero
- **THEN** time does not advance during the zoom segment, the camera zooms out without smoothing and, after the final segment, the next section appears

### Requirement: Hero at rest
With time stopped and no gesture in progress, the engine MUST NOT produce new renders of the hero view. Nor SHALL it produce them when the hero is off screen.

#### Scenario: Final state at rest
- **WHEN** the hero is in its final state, time is at the last frame and the visitor is not interacting
- **THEN** no new renders of the hero view are produced
