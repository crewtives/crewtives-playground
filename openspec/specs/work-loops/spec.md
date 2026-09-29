# work-loops Specification

## Purpose

Defines how the loops the playground museum uses to show each work are recorded, stored, verified and played back: deterministic recordings of the live render, pixel-exact to the display and with published provenance. It warns when a work has changed after being recorded and keeps the recording tools out of the published output.

## Requirements

### Requirement: Deterministic recording of the live render
Each loop SHALL be recorded from the live render of the work, opened at its public route (`/4d-os/a/` through `/4d-os/e/` for the 4D.OS worlds, and the fixed garden link, `/bloomscope/#g=…`, for Bloomscope, which records its Sow section) and with the display in 16-color mode.

The recording tool SHALL control every clock the page animates with: animation frames, timers, high-resolution time and date. No frame SHALL depend on wall-clock time, on the machine's speed or on how long it takes to paint.

Each frame of the loop SHALL be a single whole source frame: a pack frame in works with a pack, or an instant of the controlled clock in works without a pack (in Bloomscope, with the seeds Sow shows at that instant). The recording MUST NOT interpolate or blend frames.

With the configuration recorded in the provenance, the same content of the work's sources (the same sources hash) and the same browser with the same renderer, two recordings SHALL produce identical frames.

#### Scenario: Two identical recordings
- **WHEN** the same work is recorded twice with the configuration recorded in its provenance, with the same sources hash and with the same browser
- **THEN** both recordings have the same number of frames in each pass and the same hash in each frame

#### Scenario: Slow machine
- **WHEN** a work is recorded with the CPU throttled by a factor of four
- **THEN** the hashes of all frames match those of the unthrottled recording

#### Scenario: Work that animates with page time
- **WHEN** Bloomscope, whose bloom and whose sowing in Sow follow page time rather than a frame controller, is recorded twice in a row
- **THEN** both recordings produce the same hashes and record the same seeds in each frame

#### Scenario: Recording after a history rewrite
- **WHEN** the repository history is replaced by a new root commit with the same tree and a work is recorded again
- **THEN** every frame hash matches the recording made before the rewrite

### Requirement: Native resolution, one pixel per block
The works' display paints square blocks of device pixels, aligned from the bottom-left corner of each view. The recording SHALL take a rectangle of the view aligned to that block grid, measuring a whole number of blocks in width and in height. From each block it SHALL keep a single pixel, its color. Each frame of the loop SHALL therefore measure the recorded rectangle divided by the block size. This is called the native size.

Every pixel of every frame SHALL be opaque and one of the colors of the 16-color palette the work paints the recorded view with. If any pixel is transparent or does not belong to that palette, the recording of that work SHALL fail, just as when the exactness verification fails.

#### Scenario: Native dimensions
- **WHEN** a view whose blocks measure 3 device pixels is recorded over a rectangle of 1170 × 720 device pixels
- **THEN** each frame measures 390 × 240 and the provenance records the block of 3, the rectangle and the native size

#### Scenario: Palette colors
- **WHEN** every pixel of every frame of a loop is traversed
- **THEN** each one is opaque and belongs to the palette recorded in its provenance, which has at most 16 colors

### Requirement: Exactness verification
For each frame of each pass, the tool SHALL upscale the native frame by the block size, without smoothing and aligned from the bottom left like the display. It SHALL then compare it with the captured device pixels, and the comparison SHALL yield 0 differing pixels.

If a single frame of any pass differs in at least one pixel, the recording of that work SHALL fail with an error that states the work, the pass, the frame and how many pixels differ. In that case it MUST NOT write or replace any file of that work's loop: passes, poster and provenance. The provenance of a successful recording SHALL record the verification result of each pass.

#### Scenario: Exact recording
- **WHEN** the recording of a work finishes successfully
- **THEN** its provenance records 0 differing pixels in each pass

#### Scenario: Misaligned rectangle
- **WHEN** the requested rectangle does not fall on the view's block grid
- **THEN** the recording of that work fails with the error that names work, pass, frame and differing pixels, and the files of its previous loop remain unchanged

#### Scenario: Text over the canvas
- **WHEN** a page text remains visible over the canvas during capture
- **THEN** the recording of that work fails, because of differing pixels or colors outside the palette, and writes no files

### Requirement: Only the work's render
Frames SHALL contain only what the work's display paints. Where the display leaves transparent pixels, such as outside the mask of the Sow view, the frame SHALL show only the flat background set by the recording, in that view's background color. Texts, controls, labels, cursors, focus rings and any other page element that the live render shows over the canvas MUST NOT appear in any frame. The method recorded in the provenance SHALL state that page elements were hidden for recording.

#### Scenario: Work with captions over the canvas
- **WHEN** a work whose live page shows texts or controls over the canvas, such as D's readouts, is recorded
- **THEN** no frame contains those texts or controls, every pixel belongs to the recorded palette and the verification yields 0 differing pixels

### Requirement: Sow recording for sheet 004
The Bloomscope loop SHALL record the view of its Sow section while it sows, not its first screen. It SHALL meet these conditions:
- **Garden:** it SHALL be opened from the fixed garden link (`/bloomscope/#g=…`, see "Fixed garden for the museum loop" in `landing-bloomscope`), with the page's clock controlled and stopped from before load. Each clock advance SHALL fire every animation frame in the time it advances, not just one per jump.
- **Wait:** before frame 0, the appearance of the Sow view and its initial bloom SHALL have finished. With the 610 seeds Sow opens with, the bloom finishes after 610 · 4 + 650 ms of controlled clock, counted from when it starts, which is when the Sow section enters the screen.
- **Sowing:** it SHALL sow only with "Hold to sow". Frame 0 SHALL be captured before pressing it; "Hold to sow" SHALL be pressed right after and held until the last frame. It MUST NOT use "Sow 100", move the dial, use "Scrub births" or leave the pointer over the Sow view.
- **Framing:** it SHALL take the square that contains the whole Sow view, a multiple of its block (2 device pixels) and aligned to its block grid, with whatever falls outside its elliptical mask in the view's background color. To that end, during recording the page background behind the canvas SHALL be set to the palette color the view paints its background with, and the provenance SHALL record it as prior state. It MUST NOT be cropped inside the mask, because that would leave out the edge of the flower head, where each new seed is born.
- **Seeds per frame:** in each frame, it SHALL read the seed count and the angle from the work's own readouts ("seeds N" and "divergence …°"), without code, hooks or variables added to the work, and SHALL record them in the provenance. If the "divergence …°" readout differs from the fixed garden's `α.toFixed(3)`, the recording SHALL fail without writing files.
- **Start:** frame 0 SHALL be captured before pressing "Hold to sow", and the press SHALL happen at the same clock instant, with the engine loop idle, so that the pass starts with 610 seeds at frame 0 and adds 2 per frame (30 seeds per second at 15 fps). If any count read differs from the expected one, the recording SHALL fail without writing files.

The museum SHALL compute the trail and the NOW of sheet 004 from the seeds recorded in the provenance, never from a hand-written count.

#### Scenario: Recorded sowing
- **WHEN** the Bloomscope recording finishes successfully
- **THEN** its provenance records the Sow section, the fixed garden's Sow angle, 610 seeds at the start (frame 0), 698 at the end (frame 44) and 610 + 2f seeds in each frame f

#### Scenario: Bloom finished
- **WHEN** frame 0 of the Bloomscope loop is compared with the Sow view after its initial bloom, without sowing, with the same garden and the same viewport
- **THEN** they have the same hash: the loop shows no half-open seeds from the initial bloom

#### Scenario: Angle differs from the garden
- **WHEN** during recording Sow's "divergence …°" readout differs from the fixed garden's `α.toFixed(3)`
- **THEN** the Bloomscope recording fails with an error saying so and its previous loop remains unchanged

### Requirement: FORWARD and REWIND passes
Every loop SHALL have a FORWARD pass, recorded with the work moving forward. The works that can rewind, the 4D.OS worlds (A, B, C, D and E), SHALL also have a REWIND pass, recorded with the work rewinding. That way, in that pass the work shows its own rewind signal, such as the NOW in its REWIND color. Bloomscope, which does not rewind, SHALL have only the FORWARD pass.

The two passes of a loop SHALL cover the same source range, with the same number of frames. At each position i of the loop, both SHALL show the same source frame, and only the direction in which the work paints it changes. That way, when the clock runs backward, the REWIND pass steps back through the same frames the FORWARD pass goes through when advancing, and changing direction does not make the image jump.

#### Scenario: Passes per work
- **WHEN** the published loops are listed
- **THEN** A, B, C, D and E each have a FORWARD pass and a REWIND pass, and Bloomscope has only the FORWARD one

#### Scenario: Same source frame in both passes
- **WHEN** in the provenance of any 4D.OS world the source frame of each position i is compared across the two passes
- **THEN** it is the same at every position and both passes have the same number of frames

### Requirement: Cadence, duration and budget per pass
All passes in the collection SHALL share the same cadence and the same number of frames, because a single page clock governs them: 15 fps and 45 frames (3.0 s). If those values change, they SHALL change for the whole collection at once; a work MUST NOT declare its own values. The provenance SHALL record the fps and the frame count of each pass, and the published pass SHALL have exactly that number of frames.

Each pass SHALL weigh at most 1 MB (1 000 000 bytes), as the site transfers it. If its format depends on server compression, the weight SHALL be measured compressed with that compression. If a pass exceeds the budget, the recording of that work SHALL fail with an error that states the measured weight and MUST NOT write files for that work. A work that does not fit the budget SHALL adjust its framing, not its cadence or its frame count.

#### Scenario: Baseline values
- **WHEN** any work in the collection is recorded
- **THEN** each pass has 45 frames at 15 fps, and the provenance records it so

#### Scenario: Same measure across the collection
- **WHEN** the provenance files of all published loops are compared
- **THEN** all passes record the same fps and the same frame count

#### Scenario: Published weight
- **WHEN** each published pass is measured as the site transfers it
- **THEN** none exceeds 1 000 000 bytes

#### Scenario: Pass over budget
- **WHEN** a work's configuration produces a pass of more than 1 000 000 bytes
- **THEN** the recording of that work fails with an error that gives the measured weight and its previous loop remains unchanged

### Requirement: Exact published format
The published format of the passes SHALL meet four conditions:
- it is lossless: decoding a published pass yields exactly its native frames, with the hashes in the provenance;
- it stores only colors from the work's palette, at most 16, without transparency;
- it lets the player show any frame in any order, forward or backward;
- it never advances or restarts on its own: the frame shown is always decided by the player.

The format used SHALL be recorded in the provenance. If the browser cannot decode the primary format, the player SHALL use an equally exact alternative or stay on the poster. It MUST NOT show approximate frames or produce console errors.

#### Scenario: Lossless
- **WHEN** each frame of each published pass is decoded in the browser and its hash is computed as the provenance specifies
- **THEN** all hashes match the recorded ones

#### Scenario: Browser without the primary decoder
- **WHEN** the museum is opened in a browser that cannot decode the primary format
- **THEN** each VISTA shows exact frames with the alternative, or its poster, and the console shows no errors

### Requirement: Playback driven by the page clock
Each loop SHALL play in a canvas that at every moment draws the frame the page clock assigns to it. Loops MUST NOT be shown as animated images that advance on their own. The player picks the pass according to the clock's direction:
- in FORWARD, it SHALL use the FORWARD pass;
- in REWIND, it SHALL use the REWIND pass if the work has one and it has already been downloaded; otherwise, the FORWARD pass, whose frames are then shown in reverse order;
- in HOLD, it SHALL keep the last painted frame still and not repaint.

After the clock jumps to any frame, the next painted frame SHALL be exactly that one, without going through the previous ones. A VISTA that leaves the screen and comes back SHALL show the frame the clock indicates at that moment: it MUST NOT go back to the first one. The player MUST NOT require WebGL2.

#### Scenario: Exact jump
- **WHEN** with the clock in HOLD the visitor drags the scrubber to frame 17 of a loop
- **THEN** the canvas, downscaled by its scale k, has the same hash as frame 17 of the pass in use according to the provenance

#### Scenario: HOLD
- **WHEN** the clock switches to HOLD and 2 seconds pass
- **THEN** each VISTA keeps showing the same frame and the canvas is not repainted

#### Scenario: Back in view
- **WHEN** a VISTA leaves the screen with the clock at frame 10 and comes back when the clock is at frame 30
- **THEN** it shows frame 30, not the first one

#### Scenario: REWIND with its own pass
- **WHEN** the visitor activates REWIND with D's loop on screen and D's REWIND pass has already arrived
- **THEN** each painted frame has the hash of the REWIND pass frame the clock indicates

#### Scenario: Work without a REWIND pass
- **WHEN** the clock is in REWIND with the Bloomscope loop on screen
- **THEN** the VISTA shows the frames of the FORWARD pass in reverse order and no Bloomscope REWIND file is requested

#### Scenario: Without WebGL2
- **WHEN** the museum is opened in a browser without WebGL2
- **THEN** the loops play just the same and follow the page clock

### Requirement: Integer scale in device pixels
The canvas buffer of each VISTA SHALL measure exactly the loop's native size multiplied by an integer k, and SHALL occupy exactly that number of device pixels on screen. k SHALL be the largest integer at which the loop fits in the slot the sheet gives the VISTA, measured in device pixels.

The drawing MUST NOT smooth or color-correct. Each native pixel SHALL appear as a square of k × k device pixels in the same color as in the frame.

If the loop does not fit even with k = 1, the VISTA SHALL show it whole, downscaled with smoothing and without horizontal scroll. This is the only exception to integer scale and unsmoothed drawing. A non-integer scale without smoothing MUST NOT ever be used.

#### Scenario: Screen at dpr 1
- **WHEN** a native 390 × 240 loop is shown in an 800 × 500 CSS-pixel slot at dpr 1
- **THEN** k is 2, the canvas occupies 780 × 480 device pixels and each 2 × 2 square has a single color, equal to that of the native pixel

#### Scenario: Screen at dpr 2
- **WHEN** the same loop is shown in the same slot at dpr 2
- **THEN** k is 4, the canvas occupies 1560 × 960 device pixels (780 × 480 CSS) and each 4 × 4 square has a single color, equal to that of the native pixel

#### Scenario: Uncorrected colors
- **WHEN** the pixels of any VISTA's canvas are read
- **THEN** all of them belong to the recorded palette of its loop

#### Scenario: Slot smaller than the loop
- **WHEN** at 390 × 844 and dpr 1 a VISTA's slot is narrower than its loop's native width
- **THEN** the loop is shown whole, downscaled with smoothing, and the page has no horizontal scroll

### Requirement: On-demand download and no 4D packs
A loop SHALL be requested only when it needs to be shown:
- a VISTA's FORWARD pass, when its sheet is less than one viewport height from the visible area;
- a work's FORWARD pass, when its row in the sheet index shows the preview (see "Preview in the index rows" in `playground-museum`);
- the REWIND pass, only after the visitor activates REWIND for the first time (with the REWIND control or with the J key), and only for the loops on screen or less than one viewport height away.

While the REWIND pass is arriving, the VISTA SHALL follow the clock with the frames of the FORWARD pass. The download MUST NOT stop or delay the page clock.

With reduced motion, no loop SHALL be requested until the visitor asks to play it; until then the poster is shown.

The museum MUST NOT request 4D packs: not `scene.json`, not `static.bin`, not `dynamic.bin`, and not the atlas pages. What it shows of the works SHALL come from the loops, the posters, the provenance and the data generated at build time.

#### Scenario: First load
- **WHEN** the museum loads at 1440 × 900 without scrolling or interaction
- **THEN** only the FORWARD passes of the VISTAS less than one screen away are requested, no REWIND pass is requested and no file from `/4d-os/packs/` is requested

#### Scenario: REWIND never requested
- **WHEN** the visitor goes through the whole museum, uses FORWARD and HOLD and drags the clock in both directions without activating REWIND
- **THEN** no REWIND pass is requested

#### Scenario: First time in REWIND
- **WHEN** the visitor activates REWIND for the first time with B's loop on screen
- **THEN** B's REWIND pass is requested, the clock keeps running while it arrives and, until it arrives, the VISTA shows the frames of the FORWARD pass

#### Scenario: Reduced motion
- **WHEN** the museum loads with `prefers-reduced-motion: reduce`
- **THEN** no pass is requested, each VISTA shows its poster and a sheet's FORWARD pass is requested only when the visitor asks to play its loop

#### Scenario: No packs throughout the visit
- **WHEN** network requests are logged while the visitor goes through the whole museum, plays every loop and uses FORWARD, REWIND and HOLD
- **THEN** no request is for a 4D pack file

### Requirement: First-frame posters
Each loop SHALL have a poster: the first frame of its FORWARD pass, stored losslessly at native size and identical pixel for pixel to that frame. Its hash SHALL match that of frame 0 of the FORWARD pass in the provenance.

The museum's static HTML SHALL include the poster of each VISTA, so that the work is visible without JavaScript and with reduced motion. Without JavaScript, the poster SHALL be shown at an integer multiple of its native size in CSS pixels and without smoothing, with the same rule as the loop when it does not fit even at ×1. With JavaScript, the poster SHALL be sized before it is painted with the same device-pixel rule as the loop (see "Integer scale in device pixels"). It SHALL have alternative text that describes what the work shows in that frame.

#### Scenario: Poster identical to the first frame
- **WHEN** the poster of any loop is decoded and its hash is computed as the provenance specifies
- **THEN** it matches the hash of frame 0 of its FORWARD pass

#### Scenario: Without JavaScript
- **WHEN** the museum loads with JavaScript disabled
- **THEN** each VISTA shows its poster, crisp and unsmoothed, with its alternative text

#### Scenario: From poster to loop without a jump
- **WHEN** with JavaScript and a dpr of 1, 2 or 3 the player replaces the poster with the clock at frame 0
- **THEN** the image of the VISTA does not change size or position and does not change in any pixel

### Requirement: Published provenance per loop
Each loop SHALL be published alongside a provenance JSON file, in the same folder as its passes and its poster, outside `/4d-os/`. The provenance SHALL record:
- the work and its sheet (for example `004 · Bloomscope` or `001 · A · Vitrine`) and whether the scene is synthetic;
- the recorded route with its fragment or parameters. For Bloomscope it is the link of its fixed garden, `/bloomscope/#g=…`;
- the configuration:
  - viewport in CSS pixels, dpr, touch pointer emulation (`hasTouch`, `isMobile`) and whether reduced motion was emulated;
  - display mode (16 colors), block size and recorded rectangle in device pixels;
  - every state the work was prepared with before recording, such as the scroll position, the keys pressed or the color set behind the canvas;
  - in Bloomscope, also: the recorded section (Sow), the Sow angle, the seeds at the start (frame 0) and at the end (last frame), the wait for the initial bloom and how "Hold to sow" was held;
- the native size and the palette: its colors in hex, 16 at most;
- per pass:
  - the direction (FORWARD or REWIND), the fps and the frame count;
  - the source frame of each position: pack frames, or instants of the controlled clock in works without a pack;
  - in Bloomscope, the seeds Sow shows at each position;
  - its files and the verification result;
- the published format;
- the recording date, as `YYYY-MM-DD`;
- the sources hash: the algorithm (`sha256`) and the hash computed over every file under the source paths declared for the work in the museum's collection, taken in sorted order of their repo-relative paths, skipping files whose name starts with a dot, each file contributing its repo-relative path and its bytes;
- the work's commit: the full hash of the commit the recording was made at, for information and for linking to the code;
- the method: live render, controlled clock, one pixel per block, verified exact and page elements hidden, plus the browser, its version and the renderer;
- the SHA-256 hash of each frame of each pass, in lowercase hexadecimal. It is computed over the pixels of the native frame in RGBA at 8 bits per channel, traversed row by row from top to bottom and left to right.

If the work's source paths have uncommitted changes, the recording of that work SHALL fail with an error saying so. That way, the recorded commit always contains what was recorded.

The recording tool SHALL also write, next to each poster, a provenance sidecar (`poster.webp.json`) that states that the poster was not generated, which frame and loop it is, the route, the commit, the recording date and the poster's SHA-256. No manual step or external tool SHALL be needed to produce it.

#### Scenario: Complete record
- **WHEN** the provenance of any published loop is read
- **THEN** it has every field, and each pass carries as many hashes and source frames as frames (in Bloomscope, also as many seed counts as frames)

#### Scenario: Frames within the pack
- **WHEN** the source frames of the loops of A through E are checked
- **THEN** all of them are between 0 and the last frame of their pack: 419 for cat-stairs, 449 for falcon-phi and whale-fall

#### Scenario: Bloomscope garden
- **WHEN** the route recorded in the provenance of the Bloomscope loop is opened
- **THEN** Bloomscope loads the fixed garden of that link rather than the default garden, and Sow opens with the angle the provenance records

#### Scenario: Uncommitted changes
- **WHEN** an attempt is made to record a work with uncommitted changes in its source paths
- **THEN** the recording of that work fails with an error saying so and its previous loop remains unchanged

#### Scenario: Poster sidecar
- **WHEN** a loop is recorded
- **THEN** its folder holds `poster.webp.json` with the commit and the date of that recording and the SHA-256 of the new poster, written by the recording tool

### Requirement: Provenance summary in the title block
The title block of each sheet SHALL show one provenance line per loop, generated at build time from its provenance file and never written by hand. The line SHALL include:
- the native size;
- the number of colors;
- the frames and the fps;
- how often the loop starts over ("loops every <s> s");
- in works with a pack, the range of source frames it covers;
- the recorded passes;
- the recording date;
- the work's commit, abbreviated to 7 characters and linked to that commit in the public repository;
- the note that it is a recording of the live render.

For example: "Loop 390 × 240 px · 16 colors · 45 frames at 15 fps · loops every 3.0 s · source frames 120–208 · forward and rewind · recorded 2026-09-25 from the live render at a1b2c3d". The line SHALL link to the full provenance file.

#### Scenario: Matches the provenance
- **WHEN** each loop's line is compared with its provenance file
- **THEN** every value in the line matches the recorded one, the link opens that file and the commit links to that commit in the public repository

#### Scenario: Re-record
- **WHEN** a work is re-recorded and the build is run
- **THEN** the line shows the new date and the new commit without anyone editing the page

### Requirement: Stale loop warning
For each loop, the build SHALL compute the sources hash of the work, as the provenance defines it, and compare it with the sources hash recorded in the loop's provenance. The build SHALL NOT use git for this.

If they differ:
- the build SHALL write a warning with the work, the recording date and both hashes (abbreviated), and SHALL finish successfully;
- the sheet SHALL show the text "recorded <date>; the work has changed since" among the visible fields of its title block, without opening its disclosure (see "Title block with the work's data" in `playground-museum`). <date> is the recorded recording date, as `YYYY-MM-DD`.

If they match, there is no warning and no text. A loop whose provenance has no sources hash SHALL be treated as stale.

#### Scenario: Unchanged work
- **WHEN** no file under the work's source paths changed after its loop was recorded
- **THEN** the build gives no warning about that loop and the sheet does not show the stale text

#### Scenario: Bloomscope changed
- **WHEN** after the Bloomscope loop was recorded on 2026-09-25 a file under its source paths changes, and the build is run
- **THEN** the build finishes successfully, its output warns with the work, the recording date and both hashes, and the title block of sheet 004 shows, without opening its disclosure, "recorded 2026-09-25; the work has changed since"

#### Scenario: Re-recorded
- **WHEN** that work is re-recorded and the build is run
- **THEN** the warning and the text disappear

#### Scenario: New history, same tree
- **WHEN** the repository history is replaced by a new root commit with the same tree and the build is run
- **THEN** no loop is reported as stale

### Requirement: Development-only recording tools
The recording tools SHALL live in the repository, outside what the build publishes, and SHALL run only in development. A documented command SHALL record one work or the whole collection.

No file, fragment or text of those tools SHALL appear in the published output. Recording MUST NOT add dependencies to `package.json`, neither in `dependencies` nor in `devDependencies`. The automated browser it uses SHALL have a pinned version, and that version SHALL be recorded in the provenance.

#### Scenario: Clean published output
- **WHEN** the output of the production build is searched for the code or the texts of the recording tools
- **THEN** they do not appear

#### Scenario: No new dependencies
- **WHEN** `package.json` is compared before and after this change
- **THEN** no dependency used for recording appears, neither in `dependencies` nor in `devDependencies`

### Requirement: Recording does not modify the works
Recording MUST NOT require the works to carry code, routes, parameters, hooks or global variables that exist only for recording. Recording MUST NOT write to the repository outside the museum's loops folder, where the passes, the posters and the provenance go. The published works SHALL work the same with or without recorded loops.

#### Scenario: Only the loops change
- **WHEN** the whole collection is recorded on a clean working tree
- **THEN** the only new or changed files are in the museum's loops folder

#### Scenario: Identical works
- **WHEN** the production build is run before and after recording the whole collection
- **THEN** the files published under `/4d-os/` and `/bloomscope/` are identical in both builds
