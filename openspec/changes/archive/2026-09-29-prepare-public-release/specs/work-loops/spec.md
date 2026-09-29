## MODIFIED Requirements

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
