# Spec Delta

## MODIFIED Requirements

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
