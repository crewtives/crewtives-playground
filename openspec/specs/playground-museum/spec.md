# playground-museum Specification

## Purpose

Defines the playground museum at `/`, under the La épura direction: a set of technical sheets where each work in the collection is shown in its VISTA (a loop recorded from the live render), in the épure of its trail (the plan says where, the elevation says when, joined by the ground line) and in a title block with data read from the work. A single page clock governs everything, and there is a way there and back between the museum and each work.

## Requirements

### Requirement: Museum page and section order
The museum SHALL be the page at `/` and SHALL arrive as a complete HTML document, with the tab title "crewtives playground" and a single top-level heading, visible on the first screen, that names the collection. The page SHALL present, in this order:
1. the first screen, with the featured sheet;
2. the sheet index;
3. the remaining work sheets, in ascending number order;
4. method sheet 000;
5. the colophon.

Each published sheet SHALL appear only once on the page, with the anchor `sheet-NNN`, where NNN is its three-digit number.

#### Scenario: Full walkthrough
- **WHEN** the visitor scrolls down from the first screen to the end of the museum
- **THEN** they find the featured sheet, the sheet index, the remaining work sheets in ascending number order, sheet 000 and the colophon, in that order

#### Scenario: Tab and heading
- **WHEN** `/` is opened
- **THEN** the tab is titled "crewtives playground" and the page has a single top-level heading, visible without scrolling

#### Scenario: Each sheet only once
- **WHEN** the museum HTML is searched for elements with a `sheet-NNN` anchor
- **THEN** there is exactly one per published sheet, no number repeats and the featured sheet does not appear twice

### Requirement: Sheet composition
Each work in the collection SHALL have its sheet, made up of:
- the VISTA: the work's loop, recorded from the live render, inside a passe-partout in the work's background color (not the house's paper color) and with an ink rule. On sheet 001, the passe-partout of each of its three VISTAS SHALL have the color of its world's frame: A's wall, B's plate and C's film leader;
- the épure: the work's trail drawn in elevation and plan, joined by the ground line;
- the NOW: the point that marks, in the elevation and in the plan, the moment the VISTA shows;
- the title block: the sheet's label, with its main action "Enter <title>";
- the wall text, of 80 words at most.

The VISTA SHALL be the largest region of the sheet: with its passe-partout, it SHALL take up more area than the épure and than the title block. On sheet 001, this applies to its three VISTAS together. On desktop, the VISTA SHALL go on the left and the épure on the right, and the width of the VISTA column and that of the épure column SHALL be in the ratio of two consecutive Fibonacci numbers (for example 13 : 8), measured in modules of the house grid.

When the loop fits in the VISTA's opening with k ≥ 1, it SHALL be drawn at an integer scale in device pixels: each loop pixel covers a square of k×k device pixels, with k an integer and the largest that fits in the opening, and the passe-partout absorbs whatever is left over. The VISTA MUST NOT re-dither, tint or filter the loop's pixels, and MUST NOT smooth them except in the single case that "Integer scale in device pixels" in `work-loops` allows: when it does not fit even with k = 1, the loop is shown whole, scaled down with smoothing.

#### Scenario: Parts of the sheet
- **WHEN** any work sheet is examined
- **THEN** it has a VISTA with a passe-partout, an épure with elevation, ground line and plan, a NOW, a title block with an "Enter <title>" link and a wall text of 80 words or fewer

#### Scenario: The work dominates the sheet
- **WHEN** the regions of any work sheet are measured at 1440×900
- **THEN** the VISTA with its passe-partout (on 001, the three together) takes up more area than the épure and more than the title block

#### Scenario: Fibonacci ratio
- **WHEN** the VISTA and épure columns of any work sheet are measured at 1440×900
- **THEN** their widths, counted in grid modules with a tolerance of one module each, are in the ratio of two consecutive Fibonacci numbers, the same one that labels the full grid

#### Scenario: Integer scale
- **WHEN** a VISTA whose loop fits in its opening with k ≥ 1 is shown at a dpr of 1, 1.25, 1.5, 2 or 3
- **THEN** each loop pixel covers a whole square of k×k device pixels, without smoothing, and with k+1 the loop would not fit in its opening

#### Scenario: Passe-partout of a night work
- **WHEN** sheet 003 is viewed
- **THEN** the passe-partout of its VISTA has Whale fall's night background color, not the house's paper color, and carries an ink rule

#### Scenario: Passe-partouts of the three views
- **WHEN** sheet 001 is viewed
- **THEN** the passe-partouts of "A · Vitrine", "B · Plate" and "C · Leader" each have the color of their world's frame, and the three differ from one another

### Requirement: Common invariant of the épures
In every épure of a work sheet (001 to 004), the plan SHALL show where and the height in the elevation SHALL show when, in the work's time. Method sheet 000 draws timeless figures in épure (the column and the tesseract), and in them the height in the elevation is height; its text SHALL say so:
- in the scenes with a 4D pack (001 to 003), the plan SHALL show the center of the subject over the scene's floor, seen from above, and the height in the elevation SHALL be the pack's frame;
- on sheet 004, the plan SHALL show where each Sow seed was born, in the plane of the flower head, and the height in the elevation SHALL be its birth order.

The elevation SHALL share the horizontal axis with the plan, and its vertical axis SHALL grow from bottom to top, in proportion to time.

Each work épure SHALL carry, visibly, the legend "plan: where · elevation: when". This way every sheet shows the same thing, with the same axes: all the moments of its work at once, with time made into an axis.

#### Scenario: The same axes on every sheet
- **WHEN** the épures of any two work sheets are compared
- **THEN** in both, each moment in the elevation is higher than the previous moment, the plan and the elevation share the horizontal axis and both show the legend "plan: where · elevation: when"

#### Scenario: Elevation of a pack
- **WHEN** the vertex for frame f of sheet 002's trail is taken
- **THEN** its horizontal position in the plan and in the elevation is that of the centroid of that frame, its depth in the plan is that of the centroid over the scene's floor and its height in the elevation is proportional to f

#### Scenario: Plan and elevation of 004
- **WHEN** the point for seed n in sheet 004's trail is taken
- **THEN** its position in the plan is Sow's `seedPosition(n, α, c)`, with α = `decodeGarden(fixed link).sow` and a single c for the whole trail (that of the flower head in the loop's last frame), up to the uniform scale of the drawing; its horizontal position in the elevation is the same x, and its height is proportional to n

### Requirement: First screen
The first screen SHALL show the featured sheet. That sheet is set by the collection's curation; if the curation sets none, it SHALL be the work sheet with the highest number.

At 1440×900, without scrolling, the first screen SHALL show:
- the collection title;
- the page clock;
- the featured sheet's VISTA, which SHALL be the largest region on the screen;
- that sheet's épure, with its elevation, its ground line and its plan;
- a visible link to the sheet index;
- the morning light (the lavender wash at the top);
- the modular grid.

At 390×844, without scrolling, the following SHALL be visible:
- the featured sheet's VISTA, as the largest visible region;
- a visible link to the sheet index;
- the morning light;
- the modular grid.

#### Scenario: Desktop
- **WHEN** the museum loads at 1440×900 and the visitor does not scroll
- **THEN** they see the collection title, the clock, the featured sheet's VISTA and épure, the link to the index, the lavender wash and the grid, and the VISTA takes up more area than any other region on the screen

#### Scenario: Phone
- **WHEN** the museum loads at 390×844 and the visitor does not scroll
- **THEN** they see the featured sheet's VISTA as the largest region, the link to the index, the lavender wash and the grid

#### Scenario: Default featured sheet
- **WHEN** the curation does not set a featured sheet
- **THEN** the first screen shows the work sheet with the highest number; with the initial collection, 004 (Bloomscope)

#### Scenario: Go to the index
- **WHEN** the visitor activates the link to the index from the first screen, on desktop or on a phone
- **THEN** the page takes them to the second section, the sheet index

### Requirement: Sheet index
The sheet index SHALL be the museum's second section. It SHALL have one row per work sheet, in ascending number order, with:
- the number, in three digits;
- the form: ○ for a scene with a 4D pack, □ for a toy;
- a cropped poster of the work, in its own colors, neither desaturated nor tinted;
- the title and a one-line description;
- the dimensions with time, when the work has a pack;
- the creation date.

Each work row SHALL be a real link (`<a href>`) to its sheet, `#sheet-NNN`, present in the static HTML.

The 4D.OS series SHALL have an unnumbered gate row, placed just before rows 001, 002 and 003, with a real link to `/4d-os/`. Its text SHALL be exactly "4D.OS — Five worlds, one launcher. Every moment of a scene, all at once.": the launcher's name and one-line description, the same ones the landings index already uses, joined by an em dash. The number of worlds it names SHALL match the number of worlds the launcher links to. An automated repository check SHALL fail if the row's text stops being that.

Between two consecutive work rows whose creation dates differ there SHALL be a separator line; between rows with the same date there MUST NOT be one.

Sheet 000 SHALL have a row after the work rows, with its number, its title and a one-line description, and a real link to `#sheet-000`. That row MUST NOT have a work form, poster, dimensions or date.

The index SHALL have exactly three workshop sheets, with the form △ and the text "Being drawn. Not public yet.". Workshop sheets MUST NOT have a number, name, link or date. Game Center Yonjigen and Wind-Up Empire MUST NOT appear in the index.

#### Scenario: Work rows
- **WHEN** the visitor goes through the index
- **THEN** they find rows 001, 002, 003 and 004 in that order, each with number, form, color poster, title, one-line description and date, and each leads to its sheet `#sheet-NNN`

#### Scenario: 4D.OS gate row
- **WHEN** the visitor reaches the 4D.OS series in the index
- **THEN** they see the row "4D.OS — Five worlds, one launcher. Every moment of a scene, all at once.", unnumbered, just before 001, and activating it opens `/4d-os/`

#### Scenario: Exact gate row text
- **WHEN** the gate row text in the static HTML is compared with "4D.OS — Five worlds, one launcher. Every moment of a scene, all at once."
- **THEN** they match character for character, with the em dash "—" between "4D.OS" and "Five", and if the launcher's name or one-line description changes, the automated check fails

#### Scenario: Date separators
- **WHEN** the index's separator lines are checked with the initial collection
- **THEN** there is one between 003 (2026-09-24) and 004 (2026-09-25), and none between 001, 002 and 003, which share a date

#### Scenario: Sheet 000 row
- **WHEN** the visitor reaches the end of the work rows
- **THEN** they find row 000 with its title and its one-line description, without poster, dimensions or date, and activating it takes them to `#sheet-000`

#### Scenario: Workshop sheets
- **WHEN** the index's workshop sheets are checked
- **THEN** there are exactly three, each one says "Being drawn. Not public yet.", and none has a number, name, date or link, neither inside nor around it

#### Scenario: Links in the static HTML
- **WHEN** the HTML of `/` is read without running scripts
- **THEN** the index already contains the rows and their `<a href>` links to each `#sheet-NNN` and to `/4d-os/`

### Requirement: Preview in the index rows
The loop of an index row SHALL be shown only when the row receives focus or when the pointer rests on it for at least 300 ms, and SHALL follow the page clock. Passing the pointer over a row for less than 300 ms MUST NOT request its loop. With reduced motion, each row SHALL show only its still poster.

#### Scenario: Pointer passing by
- **WHEN** the visitor moves the pointer across the whole index without resting 300 ms on any row
- **THEN** no loop is requested

#### Scenario: Intent
- **WHEN** the visitor rests the pointer on row 002 for 300 ms, or the row receives focus from the keyboard
- **THEN** the row shows the loop of The golden stoop, at the frame the page clock marks

#### Scenario: Preview with reduced motion
- **WHEN** with reduced motion the visitor rests the pointer on a row or gives it focus
- **THEN** the row keeps showing its still poster

### Requirement: Initial collection and numbering
The initial collection SHALL have these four work sheets:
- **001, The cat:** form ○, 4D.OS series. It carries three VISTAS labeled "A · Vitrine", "B · Plate" and "C · Leader", with links to `/4d-os/a/`, `/4d-os/b/` and `/4d-os/c/`, and a single épure. Its main action, "Enter The cat", leads to `/4d-os/`.
- **002, The golden stoop:** form ○, 4D.OS series. "Enter The golden stoop" leads to `/4d-os/d/`.
- **003, Whale fall:** form ○, 4D.OS series. "Enter Whale fall" leads to `/4d-os/e/`.
- **004, Bloomscope:** form □. "Enter Bloomscope" leads to `/bloomscope/`.

Each number SHALL have three digits. A number assigned to a sheet MUST NOT be reused, even if that sheet is retired. Number 000 SHALL remain reserved for the house's method sheet, and no work SHALL receive it.

#### Scenario: Four sheets
- **WHEN** the museum's work sheets are gone through
- **THEN** they are 001 The cat, 002 The golden stoop, 003 Whale fall and 004 Bloomscope, and each "Enter <title>" leads to its work's route

#### Scenario: One scene, three worlds
- **WHEN** the visitor looks at sheet 001
- **THEN** they see three VISTAS labeled "A · Vitrine", "B · Plate" and "C · Leader", each with a link to its world, a single épure and the action "Enter The cat" toward `/4d-os/`

#### Scenario: Number of a retired sheet
- **WHEN** a sheet is retired from the collection and a new work enters afterward
- **THEN** the new work receives a number that no sheet has had before, never the retired one's nor 000

### Requirement: Épure of each sheet
Each sheet's épure SHALL be an SVG drawing present in the static HTML, with:
- the elevation above and the plan below, labeled in English as elevation and plan, with the legend from "Common invariant of the épures";
- the ground line between the two, with the two conventional short strokes under its ends;
- the complete trail, with all the moments of the work, in a dotted stroke (on 004, in fine dots);
- the segment the loop covers, in a solid stroke (on 004, in solid ink dots);
- the NOW in the elevation and in the plan, a cyan dot while the clock runs FORWARD and amber while it runs REWIND, always with a 2 px ink ring;
- a reference line, perpendicular to the ground line, joining the NOW in the elevation with the one in the plan.

The trail SHALL have one moment of the work per vertex or per point, with the axes of "Common invariant of the épures":
- **In the works with a 4D pack (001 to 003)**, it SHALL be the path of the subject's center, labeled "path of the subject's centre". The subject is the pack's dynamic points: the trail has one vertex per pack frame, the centroid of that frame's dynamic points, and the vertices are joined into a polyline. That trail MUST NOT come from the equation of the work's rule: it comes from the pack's points.
- **On 004**, it SHALL be the Sow seeds that the loop's last frame shows, labeled "seeds in order of birth". It carries one dot per seed, in birth order and without joining the seeds to each other. Each seed SHALL be placed with the same function Sow places it with, with α = `decodeGarden(fixed link).sow`, the angle with which Sow paints the fixed garden, and the number of seeds in each frame SHALL come from the loop's provenance. If the angle the provenance records does not match `decodeGarden(fixed link).sow` to three decimal places, the build SHALL fail with an error that says so. The trail MUST NOT include seeds that no frame of the loop shows.
  - The loop segment runs from the newest seed in frame 0 (the NOW of frame 0) to the newest in the last frame: that seed and the ones born during the recording.
  - The NOW of each frame SHALL be the newest seed in that frame, the same one Sow marks as its "NOW".

#### Scenario: Trail of a pack
- **WHEN** sheet 002's trail is compared with The golden stoop's pack
- **THEN** the trail has one vertex per pack frame (450) and each vertex comes from the centroid of that frame's dynamic points

#### Scenario: Trail of 004
- **WHEN** sheet 004's trail is compared with its loop's provenance, which records 610 seeds in frame 0 and 2 more in each frame
- **THEN** the trail has one dot per seed, from 0 to 697 (698 seeds, those of frame 44), in birth order; the solid segment runs from seed 609 to 697; and each seed n is in the plan at `seedPosition(n, α, c)`, with α = `decodeGarden(fixed link).sow`

#### Scenario: NOW of 004
- **WHEN** the clock is at frame f of 004's loop and the recording started with 610 seeds and adds 2 per frame
- **THEN** the NOW in the elevation and the one in the plan are at seed 610 + 2f − 1, the newest in that frame (609 in frame 0 and 697 in frame 44), the same one the VISTA marks as Sow's "NOW"

#### Scenario: Loop segment
- **WHEN** a sheet's solid-stroke segment is compared with its loop's provenance
- **THEN** the segment covers exactly the range of source frames the provenance records or, on 004, the seeds from the newest in frame 0 to the newest in the last frame, according to the counts the provenance records

#### Scenario: Pack trail without the rule
- **WHEN** how the trails of 001, 002 and 003 are computed is reviewed
- **THEN** each matches its pack's centroids, and its computation does not use the equation or the constants of its work's rule

#### Scenario: Reference line
- **WHEN** the NOW is at any moment of the work
- **THEN** the NOW in the elevation and the one in the plan lie on the same perpendicular to the ground line, and the reference line passes through both

#### Scenario: Subject of 004
- **WHEN** the title and description of sheet 004's épure are read
- **THEN** they say that the trail is Sow's seeds, each where it was born and with its birth order as height, how many seeds it has and that the loop segment runs from the newest seed in frame 0 to the newest in the last frame: that seed and the ones born during the recording

### Requirement: Title block with the work's data
Each sheet's title block SHALL show:
- the number and the title;
- the series, when the work belongs to one;
- the form;
- the work's creation date, in `YYYY-MM-DD` format;
- the technique;
- the dimensions with time, in the format "<duration> s · <frames> frames at <fps> fps" (for example, "15.0 s · 450 frames at 30 fps");
- the pack's weight;
- the "synthetic" mark;
- the work's rule;
- the loop's provenance line, with the content set by "Provenance summary in the title block" in `work-loops`.

The fields that come from a pack (dimensions with time, weight and "synthetic") SHALL be shown only on the sheets of works with a pack and MUST NOT be invented for the others. The rule SHALL be shown when the work has an equation or a rule in its code, and SHALL use the same constants as that code.

The provenance line SHALL state the loop's recording date, how often it restarts and, for works with a pack, the range of source frames it covers. On sheet 004 it SHALL also link to the Bloomscope fixed garden the loop was recorded with. If the work changed after the recording, the title block SHALL say "recorded <date>; the work has changed since", with the recording date.

The title block SHALL show at most four fields before its disclosure is opened. A field is a row of the title block, even if on a phone its text takes up more than one line. Among those fields SHALL be the number and title, the "synthetic" mark when the work is a synthetic scene, and the stale-loop notice when applicable. The rest of the fields SHALL go in a native disclosure that works without JavaScript. The main action, "Enter <title>", SHALL be a real link to the work's route.

#### Scenario: Title block of 002
- **WHEN** the visitor opens the disclosure of sheet 002's title block
- **THEN** they read 002, The golden stoop, the 4D.OS series, the form ○, 2026-09-24, the technique, "15.0 s · 450 frames at 30 fps", "53.7 MiB", "synthetic", the golden-spiral rule of work D and its loop's provenance line

#### Scenario: Four visible fields
- **WHEN** the title block of any sheet is looked at without opening its disclosure, at 1440×900 or at 390×844
- **THEN** at most four fields are visible, among them the number and the title, and on 001, 002 and 003 also "synthetic"

#### Scenario: Work without a pack
- **WHEN** the full title block of sheet 004 is read
- **THEN** it shows no dimensions with frames, no pack weight and no "synthetic" mark, and its provenance line links to the Bloomscope fixed garden

#### Scenario: Stale loop
- **WHEN** a file under work 004's source paths changes after its loop was recorded and the build is run again
- **THEN** sheet 004's title block says, without opening the disclosure, "recorded <date>; the work has changed since" with the recording date, and the build does not fail

#### Scenario: Enter the work
- **WHEN** the visitor activates "Enter Whale fall"
- **THEN** they arrive at `/4d-os/e/`

### Requirement: Cat credit on sheet 001
Next to the VISTAS of sheet 001, and next to any other image or loop of the cat the museum shows (such as the poster in index row 001), the credit line for the "Cat" model SHALL be visible exactly as `LICENSES.md` sets it. The credit MUST NOT sit inside a closed disclosure.

#### Scenario: Credit next to the views
- **WHEN** the visitor looks at sheet 001 without opening anything
- **THEN** next to its VISTAS they read, unchanged, the credit line for the "Cat" model that `LICENSES.md` sets

#### Scenario: Credit in the index
- **WHEN** the visitor looks at index row 001
- **THEN** next to its poster they read the same credit line

### Requirement: Figures read from the work and its curation
Every figure, date and stroke the museum shows about a work SHALL come from the work or from the collection's curation:
- from its pack: frames, fps, duration, weight, synthetic-scene mark and trail;
- from its code: the rule, its constants and, on 004, the function with which Sow places each seed, used to compute its trail;
- from the collection's curation: the work's creation date;
- from its loop's provenance: the loop data, including, on 004, the seeds in each frame.

There MUST NOT be any hand-written figure about a work in the museum's text. The other visible figures SHALL come from a declared source, and only from these:
- the sheet numbers, including those in "Sheet NNN" in the links back, from the collection's curation;
- the "demo build 0.1" stamp, from the playground's build stamp;
- the years and numbers of the colophon's references, from the cited reference, which carries its source;
- the control labels, such as "1-bit" and "16" in "House pixels", from the display modes;
- the number of 4D.OS worlds, from the list of worlds its launcher links to.

A work's creation date SHALL be declared once, in the collection, as `YYYY-MM-DD`: the day the work was first published in the repository, in the author's time zone. The build MUST NOT derive it from git. An automated repository check SHALL assign each visible figure in the museum to one of those sources and SHALL fail, pointing it out, if any has no source or does not match it.

#### Scenario: Figures of the initial collection
- **WHEN** the dimensions and weights of sheets 001, 002 and 003 are read
- **THEN** they say "14.0 s · 420 frames at 30 fps" and "50.4 MiB" on 001, "15.0 s · 450 frames at 30 fps" and "53.7 MiB" on 002, and "15.0 s · 450 frames at 30 fps" and "52.8 MiB" on 003

#### Scenario: Curated dates
- **WHEN** the dates of the initial collection's sheets are read
- **THEN** 001, 002 and 003 say 2026-09-24 and 004 says 2026-09-25, from a clone of any depth or from an archive without `.git`

#### Scenario: Regenerated pack
- **WHEN** a pack changes its frame count and the build is run again
- **THEN** its sheet's title block and trail show the new values without anyone editing the museum's text

#### Scenario: Hand-written figure
- **WHEN** someone writes into a wall text a figure that comes from none of the declared sources
- **THEN** the automated repository check fails and points out that figure

#### Scenario: Figures that are not from a work
- **WHEN** the check goes through "demo build 0.1", the "Sheet NNN" in the links back and the colophon's years
- **THEN** it assigns each one to its declared source and, if a "Sheet NNN" does not match the collection's curation, it fails and points it out

### Requirement: Weight in binary units
The museum SHALL label each pack's weight in binary units. The weight SHALL be the sum of the file sizes that `scene.json` declares in `files`, not counting `scene.json` itself, and SHALL be written in the same format the 4D.OS pages use: divided by 1024 once per unit, with the label "KiB", "MiB" or "GiB", with one decimal if the value is less than 100 and no decimals from 100 up; a weight under 1024 bytes is written in bytes, with the label "B". Each 4D.OS work that shows its pack's weight SHALL show the same figure and the same unit as its sheet. No page on the site SHALL label as "MB" or "KB" a weight computed with divisions by 1024.

#### Scenario: Weight of sheet 001
- **WHEN** the weight in sheet 001's title block is read
- **THEN** it says "50.4 MiB" (52,884,622 B / 1024²)

#### Scenario: The same figure in the work
- **WHEN** sheet 002's weight is compared with the one `/4d-os/d/` shows
- **THEN** both say "53.7 MiB"

#### Scenario: No binary MB
- **WHEN** the pack weights shown by the museum and the 4D.OS pages are checked
- **THEN** all are labeled in B, KiB, MiB or GiB, and none is labeled "MB" or "KB"

### Requirement: Page clock
The page SHALL have a single page clock that governs the time of all sheets. The clock SHALL have three states, FORWARD, REWIND and HOLD, each with a visible control labeled with that text, and a scrubber that is dragged with a pointer or by touch and moved with the keyboard arrow keys. The J, K and L keys SHALL set the clock to REWIND, HOLD and FORWARD, from anywhere on the page except a text field. The clock has no speeds: pressing J or L several times MUST NOT speed it up. Without reduced motion, the clock SHALL start in FORWARD.

All the collection's passes share fps and frame count (see "Cadence, duration and budget per pass" in `work-loops`), so each clock position is a loop frame i, the same in all VISTAS. All visible VISTAS and every NOW in the épures SHALL follow the clock. On each sheet, the frame the VISTA shows and the trail point the NOW marks SHALL correspond to the same moment of the work, according to the loop's provenance: to the same source frame in works with a pack and, on 004, to the newest seed in that frame. On sheet 001, the three VISTAS SHALL show the same source frame at all times, the one its single NOW marks.

The behavior in each state SHALL be this:
- in FORWARD, the VISTAS move forward in their work's time and the NOW is cyan;
- in REWIND, they move backward and the NOW is amber;
- in HOLD, no VISTA and no NOW changes.

In FORWARD, after the last frame the clock SHALL return to the first, and in REWIND, after the first, to the last. On that wrap, each VISTA and its NOW SHALL jump together, in the same painted frame, to the other end of the loop segment. The cut is declared: the title block's provenance line says how often the loop restarts.

Dragging the scrubber SHALL move all the VISTAS and every NOW at once. If no VISTA is on screen, the tab is hidden or the clock is in HOLD, the page MUST NOT keep an animation loop running.

#### Scenario: Clock keys
- **WHEN** the visitor presses J, then K and then L, with focus outside a text field
- **THEN** the clock switches to REWIND, to HOLD and to FORWARD, and the control for the active state shows it

#### Scenario: No acceleration
- **WHEN** the visitor presses L three times in a row
- **THEN** the clock stays in FORWARD and each VISTA advances 15 frames per second, the same as after the first press

#### Scenario: The same instant on a sheet
- **WHEN** the clock stops in HOLD at any position
- **THEN** on each visible sheet, the VISTA's frame and the NOW in the elevation and in the plan correspond to the same moment of the work, according to the loop's provenance

#### Scenario: Three views, one NOW
- **WHEN** the clock runs with sheet 001 on screen
- **THEN** in each painted frame, VISTAS A, B and C show the same source frame of the pack, the one the NOW of its épure marks

#### Scenario: Scrubber
- **WHEN** the visitor drags the scrubber with two sheets on screen
- **THEN** the VISTAS and NOWs of both change together, in the same painted frame

#### Scenario: Loop wrap
- **WHEN** the clock in FORWARD passes the loop's last frame
- **THEN** in the next painted frame all VISTAS show their frame 0 and each NOW is at the start of its loop segment

#### Scenario: Rewind
- **WHEN** the visitor presses REWIND
- **THEN** the VISTAS move backward in their work's time and the NOW of each épure turns amber

#### Scenario: No animation loop at rest
- **WHEN** the clock is in HOLD, or the tab is hidden, or no VISTA is on screen
- **THEN** a 10 s performance profile records no animation callbacks and no frames painted by the museum

### Requirement: Jump by number and deep links to sheets
Three digits typed in a row outside a text field, with less than 1 s between one digit and the next, SHALL take the page to the sheet with that number, without passing through the top first, and the URL SHALL end up with `#sheet-NNN`. If there is no published sheet with that number, the page MUST NOT move. After the jump, focus SHALL land on the sheet (its element, labeled by its heading), visible on screen, and a live region SHALL announce its number and title. With reduced motion, the jump SHALL be instantaneous.

A URL with `#sheet-NNN` SHALL open the museum positioned at that sheet, and the position MUST NOT be lost when the fonts, the posters or the loops finish loading.

#### Scenario: Type a number
- **WHEN** the visitor is on sheet 004 and types 0, 0 and 2 outside a text field, with less than 1 s between digits
- **THEN** the page goes to sheet 002 without passing through the top, the URL ends in `#sheet-002` and "002" is announced together with "The golden stoop"

#### Scenario: Digits too far apart
- **WHEN** the visitor types 0, waits 2 s and types 0 and 2
- **THEN** the page does not jump to sheet 002 because of those three digits

#### Scenario: Number without a sheet
- **WHEN** the visitor types 007 and there is no sheet 007
- **THEN** the page does not move

#### Scenario: Inside a text field
- **WHEN** focus is in a text field and the visitor types 002
- **THEN** the digits go into the field and the page does not move

#### Scenario: Stable deep link
- **WHEN** `/#sheet-003` is opened in a new tab
- **THEN** the museum lands on sheet 003 and stays there after the fonts, the posters and the loops finish loading

### Requirement: The fold
Each work sheet SHALL be foldable: the elevation plane rotates about the ground line from 0° (the flat épure, as on the sheet) to 90° (the dihedron). In the dihedron, the trail is seen in space (where, on the horizontal plane; when, in height), with its projection lines onto both planes: as a polyline on 001 to 003 and as dots, one per seed, on 004.

The fold SHALL always be started by the visitor, in one of these ways:
- with the sheet's "Fold" button;
- by dragging on its ground line;
- with the F key on the active sheet, which is the one that contains focus or, if focus is not on a sheet, the one that takes up the most visible area.

Nothing SHALL fold by itself, neither by scrolling nor by the passage of time. The same control SHALL return the sheet to flat. There SHALL be only one folded sheet at a time: folding another returns the previous one to flat.

The fold view SHALL be rendered with the same 3D engine and the same dithered retro display as the 4D.OS works, in 16 colors by default and with the house palette. The trail SHALL be drawn low-poly: on 001 to 003, as a polyline of straight segments between its vertices; on 004, as one dot per seed, without joining them. The NOW SHALL be on it at the moment the page clock marks, the same one the VISTA and the épure mark: it is still a single NOW. Its 3D code SHALL be requested only the first time the visitor folds a sheet. With reduced motion, the fold SHALL jump to 90° without animating the rotation. Without WebGL2, an SVG axonometric view of the dihedron SHALL be shown, generated at build time from the same trail.

#### Scenario: Nothing folds by itself
- **WHEN** the visitor scrolls through the whole museum and lets a minute pass without touching any fold control
- **THEN** no sheet folds

#### Scenario: Deferred loading
- **WHEN** network requests are logged from load until the first fold
- **THEN** the fold's 3D code is requested only after the visitor presses "Fold", drags on the ground line or presses F

#### Scenario: Fold and unfold
- **WHEN** the visitor presses "Fold" on sheet 003 and then presses it again
- **THEN** the elevation rotates until it forms the dihedron at 90°, with the trail in space and its projections onto both planes, and then returns to the flat épure

#### Scenario: The NOW in the dihedron
- **WHEN** the clock runs with sheet 003 folded
- **THEN** in each painted frame, the NOW in the dihedron marks the same moment as the VISTA and as the épure's NOW, in the color of the clock's direction

#### Scenario: A single folded sheet
- **WHEN** sheet 002 is folded and the visitor folds 003
- **THEN** 002 returns to flat and only 003 stays folded

#### Scenario: Fold without WebGL2
- **WHEN** the visitor presses "Fold" in a browser without WebGL2
- **THEN** they see the SVG axonometric view of the dihedron with that sheet's trail, and no 3D code is requested

### Requirement: The light
The page SHALL have a wash of light made of radial patches anchored to the page edges: lavender at the top, visible from the first screen, and apricot at the bottom, in the light colors the house tokens set. The light's intensity SHALL depend only on the scroll position. With reduced motion it SHALL stay fixed, as `playground-hub` requires, at an intensity at which the lavender at the top and the apricot at the bottom are visible. The light MUST NOT change with the passage of time, with the page clock or with the pointer, and MUST NOT have its own animation. The light MUST NOT take the form of curtains, bands or waves, which belong to B's aurora. The light MUST NOT bring the contrast of any body text below 4.5:1, at any scroll position.

#### Scenario: Morning at the top
- **WHEN** the museum loads at the very top
- **THEN** the lavender wash is visible on the first screen

#### Scenario: Afternoon at the bottom
- **WHEN** the visitor reaches the colophon, with or without reduced motion
- **THEN** the apricot wash is visible on that screen

#### Scenario: Still without scrolling
- **WHEN** the visitor leaves the scroll still for 10 s while the clock runs
- **THEN** the light layer has the same computed intensity at the start and at the end, and the pixels outside the VISTAS, the épures, the clock bar and the index previews are identical

#### Scenario: Same position, same light
- **WHEN** the visitor returns to a scroll position they were already at
- **THEN** the light is identical to the first time

#### Scenario: Contrast with the light
- **WHEN** each body text is measured against its actual background at the scroll positions where the light is most intense
- **THEN** all pairs reach at least 4.5:1

### Requirement: The visible grid
The page's modular grid, the one with the module the house tokens set, SHALL be visible by default from the first screen, in the margins and in the sheets' rules. The visitor SHALL be able to show the full grid over the whole page, and hide it again, in two ways:
- with the G key, outside a text field;
- on touch screens, with a visible "Grid" control.

The full grid SHALL mark the divisions of the sheet's column ratio, with its label (for example "13 : 8"). The "Grid" control SHALL announce to assistive technologies whether the full grid is visible.

#### Scenario: Grid by default
- **WHEN** the museum loads at 1440×900 or at 390×844
- **THEN** the grid is visible in the margins and in the rules of the first screen's sheet without touching anything

#### Scenario: G key
- **WHEN** the visitor presses G twice outside a text field
- **THEN** the full grid appears with the first press, with the divisions of the column ratio and its label, and hides with the second

#### Scenario: Touch control
- **WHEN** at 390×844 on a touch screen the visitor taps "Grid"
- **THEN** the full grid appears and the control shows as activated

### Requirement: Method sheet 000
Sheet 000 SHALL be the house's method demonstration and SHALL be published with the museum. It SHALL show in épure (elevation, ground line and plan), with SVG drawings present in the static HTML:
- Gaudí's double-twist column: a star polygon that rotates to the right and to the left as it rises, and whose intersection doubles its points segment by segment;
- the tesseract, projected from 4D to 3D and from 3D to plan and elevation.

The colophon SHALL cite its sources: booklet 9 of the Basílica de la Sagrada Família and the Basilica blog's article on the double-twist columns, for the column, and *Projective Ornament* (1915), by Claude Bragdon, for the tesseract.

The static version of sheet 000 is mandatory: its two SVG drawings in the static HTML, its row in the sheet index and its sources in the colophon. The museum MUST NOT be published without it, not even in the first deploy or in the preview.

The fold of sheet 000 and the "House pixels" selector that goes with it are the only parts of it that may be missing from the first deploy: the museum SHALL be publishable without them, and while they are absent, sheet 000 MUST NOT show "Fold" or "House pixels". Once they are in place, sheet 000 SHALL fold like the others.

#### Scenario: Sheet 000 mandatory in the first deploy
- **WHEN** the HTML of `/` in the first deploy's preview is checked, without running scripts
- **THEN** it has sheet 000 with the SVG drawings of the column and the tesseract, its row in the index with a link to `#sheet-000` and its sources in the colophon, even if its fold and "House pixels" are missing

#### Scenario: Sheet 000 published
- **WHEN** the visitor opens `/#sheet-000` or types 000
- **THEN** they arrive at sheet 000, which shows the double-twist column and the tesseract in SVG épure, and the colophon cites booklet 9, the Basilica blog's article and *Projective Ornament* (1915)

#### Scenario: Method without JavaScript
- **WHEN** the HTML of `/` is read without running scripts
- **THEN** sheet 000 already contains the SVG drawings of the column and the tesseract

#### Scenario: Tesseract projection
- **WHEN** the vertices and edges of each view of the tesseract on sheet 000 are counted
- **THEN** each view draws the 32 edges between the 16 projected vertices

#### Scenario: Sheet 000 without the fold
- **WHEN** the museum is published before sheet 000's fold is in place
- **THEN** sheet 000 is shown complete in épure and does not show "Fold" or "House pixels"

### Requirement: Way back from each work
Each work in the collection SHALL carry a small link back to its sheet, present in the static HTML and working without JavaScript:
- `/4d-os/a/`, `/4d-os/b/` and `/4d-os/c/`: "Playground · Sheet 001", to `/#sheet-001`;
- `/4d-os/d/`: "Playground · Sheet 002", to `/#sheet-002`;
- `/4d-os/e/`: "Playground · Sheet 003", to `/#sheet-003`;
- `/bloomscope/`: "Playground · Sheet 004", to `/#sheet-004`;
- the launcher `/4d-os/`: "Playground", to `/`.

The text of each link SHALL be preceded by a left-pointing arrow. That arrow SHALL be the ← character when the link's typeface includes it, or a vector icon when it does not. The link's accessible name SHALL contain its visible text. The number in each "Sheet NNN" SHALL match that of the work's sheet in the collection's curation. The existing link from `/4d-os/d/` to `../` SHALL be kept.

On the 4D.OS pages, the link back and the weight label (see "Weight in binary units") SHALL be the only changes: the rest of their content and behavior MUST NOT change, and the link MUST NOT move or resize any window, view or canvas on the page.

#### Scenario: From each world
- **WHEN** the visitor activates the link back on `/4d-os/a/`, `/4d-os/b/`, `/4d-os/c/`, `/4d-os/d/` and `/4d-os/e/`
- **THEN** they arrive, respectively, at `/#sheet-001` (the first three), `/#sheet-002` and `/#sheet-003`, and the museum is positioned at that sheet

#### Scenario: From the launcher
- **WHEN** the visitor activates "Playground" on `/4d-os/`
- **THEN** they arrive at the museum at `/`

#### Scenario: Without JavaScript
- **WHEN** the HTML of each 4D.OS page and of `/bloomscope/` is read without running scripts
- **THEN** each one contains its link back with the destination from the list and the corresponding visible text

#### Scenario: Arrow without a missing glyph
- **WHEN** the typeface of the link back on one of those pages does not include the ← character
- **THEN** the arrow is shown as a vector icon and no replacement glyph appears

#### Scenario: 4D.OS with no other changes
- **WHEN** the `/4d-os/` pages are compared before and after the change
- **THEN** the only differences are the link back and the MiB label of the pack weight, and no window, view or canvas changed position or size

### Requirement: Museum-specific honesty
In addition to what `playground-hub` requires of every playground page, the museum SHALL:
- show next to the page clock the line "Loops recorded from the live render; the works run live.";
- label "synthetic" on each sheet of a synthetic scene (currently 001, 002 and 003), in view without opening any disclosure;
- have a link to `https://crewtives.com` in the top bar and another in the colophon;
- show "demo build 0.1" in the colophon;
- cite in the colophon each reference it uses, with its source.

The light is cited as inspiration: the stained-glass windows of the Sagrada Família, bluer on the morning side and more orange on the afternoon side (the Basilica's booklet 9). The colophon MUST NOT claim that Gaudí used that light on a staircase or on a sheet.

#### Scenario: The loops line
- **WHEN** the visitor looks at the page clock
- **THEN** next to it they read "Loops recorded from the live render; the works run live."

#### Scenario: crewtives.com
- **WHEN** the visitor looks for a way to reach crewtives
- **THEN** they find a link to `https://crewtives.com` in the top bar and another in the colophon

#### Scenario: Colophon references
- **WHEN** the visitor reads the colophon
- **THEN** they find "demo build 0.1" and each reference with its source, and the light is cited as inspiration, without attributing a staircase or a sheet to Gaudí

### Requirement: Museum sounds
With sound on, the museum SHALL emit only two synthesized sounds: a hinge "clack" when folding or unfolding a sheet, and a tick when jumping to a sheet by number. The museum MUST NOT play anything else: not the clock, the scrubber, scrolling or the index.

#### Scenario: Fold with sound
- **WHEN** with sound on the visitor folds a sheet
- **THEN** a single hinge "clack" sounds

#### Scenario: Jump with sound
- **WHEN** with sound on the visitor types 003
- **THEN** a tick sounds and the page goes to sheet 003

#### Scenario: Nothing else sounds
- **WHEN** with sound on the visitor uses the clock, drags the scrubber, scrolls and goes through the index
- **THEN** nothing sounds

### Requirement: House pixels selector
The museum's color-depth selector SHALL be labeled "House pixels", with the options "1-bit", "16" and "Millions". It SHALL affect only the fold view, that of any sheet that is folded, 000 included. It SHALL be shown only next to an open fold view: it MUST NOT be visible on the first screen at load or while no sheet is folded.

#### Scenario: First screen without the selector
- **WHEN** the museum loads at 1440×900 or at 390×844
- **THEN** "House pixels" is not visible on the first screen

#### Scenario: Change the fold
- **WHEN** with a sheet folded the visitor picks "1-bit" in "House pixels"
- **THEN** the fold view switches to 1-bit, and the VISTAS, the posters and the SVG épures of all sheets do not change

#### Scenario: No open fold
- **WHEN** the visitor returns the only folded sheet to flat
- **THEN** "House pixels" is no longer visible

### Requirement: Reduced motion on the sheets
With reduced motion, in addition to what `playground-hub` requires, the museum SHALL:
- put the NOW of each épure at the frame of its VISTA's poster;
- have a "Play loop" control on each sheet. When it is activated, that sheet (on 001, its three VISTAS) SHALL start following the clock and, if the clock was in HOLD, the clock SHALL switch to FORWARD. Sheets whose loop was not requested SHALL stay on their poster, with the NOW still. Activating the control again SHALL stop that sheet;
- count a visitor gesture on the clock (J, K, L, the FORWARD, REWIND and HOLD controls or the scrubber) as an explicit request for the loops of the sheets on screen at that moment;
- make jumps to a sheet instantaneous, without animated scrolling.

If reduced motion is turned on with the page open, the clock SHALL switch to HOLD without reloading the page.

#### Scenario: Poster and NOW in agreement
- **WHEN** the museum loads with reduced motion
- **THEN** each VISTA shows its poster, each NOW is at that poster's frame and each épure shows the complete trail

#### Scenario: Play loop on a sheet
- **WHEN** with reduced motion, the clock in HOLD and sheets 002 and 003 on screen, the visitor activates "Play loop" on 002
- **THEN** the clock switches to FORWARD, 002's VISTA and NOW advance with it, and 003 stays on its poster with the NOW still

#### Scenario: Gesture on the clock
- **WHEN** with reduced motion and sheets 002 and 003 on screen, the visitor presses L
- **THEN** the clock switches to FORWARD, the loops of 002 and 003 are requested and both advance with it, while the off-screen sheets stay on their poster

#### Scenario: Live change
- **WHEN** the visitor turns on reduced motion in the system while the clock runs
- **THEN** the clock switches to HOLD without reloading and no VISTA keeps moving

### Requirement: Museum without JavaScript
With JavaScript disabled, the museum SHALL remain complete as a document. Each sheet SHALL have:
- its title and its title block, with the disclosure working;
- its wall text;
- its VISTA's poster;
- its SVG épure with the complete trail, the loop segment and the NOW at the poster's frame;
- its "Enter <title>" link.

Sheet 000 SHALL have its SVG drawings. The index SHALL be complete, with all its rows and links, and the cat credit, the links to crewtives.com, the grid and the light SHALL be visible. The controls that depend on JavaScript (the page clock, "Play loop", "Fold", "Grid", "House pixels" and the sound button, because without JavaScript there is no sound) MUST NOT be shown without JavaScript.

#### Scenario: Complete document
- **WHEN** the museum is loaded with JavaScript disabled
- **THEN** each sheet shows its title, its title block, its text, its poster, its SVG épure and its "Enter <title>" link, sheet 000 shows its drawings, the index has all its rows and all the links work

#### Scenario: No dead controls
- **WHEN** the museum is loaded with JavaScript disabled
- **THEN** the clock, "Play loop", "Fold", "Grid", "House pixels" and the sound button are not visible

### Requirement: Museum-specific accessibility
In addition to what `playground-hub` requires of every playground page:
- each VISTA SHALL have an accessible name with its work's title (on 001, also its letter and its name) and a text description of what the loop shows;
- each épure SHALL have a title and a text description stating what the trail traces, how many moments it has and which segment the loop covers;
- the FORWARD, REWIND and HOLD controls SHALL expose which one is active;
- the scrubber SHALL expose its position to assistive technologies;
- when jumping to a sheet, a live region SHALL announce its number and title;
- at 390 px wide, each VISTA SHALL fit whole and without horizontal scrolling: at an integer scale when the loop fits with k ≥ 1 and, otherwise, scaled down according to "Integer scale in device pixels" in `work-loops`. The épure and the title block SHALL go below it.

#### Scenario: Screen reader on a sheet
- **WHEN** a screen reader goes through sheet 003
- **THEN** it reads the name and description of its VISTA, and the title and description of its épure, which says that it traces the path of the subject's center over 450 frames and indicates the loop segment

#### Scenario: Clock state
- **WHEN** a screen reader reaches the clock controls with the clock in HOLD
- **THEN** it announces HOLD as the active control and the scrubber's position

#### Scenario: Sheet on a phone
- **WHEN** the museum is viewed at 390 px wide, with dpr 1 and with dpr 3
- **THEN** each VISTA fits whole, at an integer scale with dpr 3, the épure and the title block go below and the page has no horizontal scrolling

### Requirement: Museum-specific budget
In addition to the budget `playground-hub` sets for every playground page:
- the JavaScript the museum requests before any interaction SHALL total at most 100 KB gzip-compressed, measured on the production build output, and MUST NOT include 3D code;
- the museum SHALL request a sheet's loop only when that sheet is less than one viewport height from the screen, or when its index row shows the preview;
- a loop's REWIND pass SHALL be requested only when the visitor sets the clock to REWIND.

#### Scenario: Initial JavaScript measured
- **WHEN** the production build output is measured
- **THEN** the JavaScript the museum requests before any interaction does not exceed 100 KB gzipped and does not include 3D code

#### Scenario: Loops near the screen
- **WHEN** the museum loads at the very top at 1440×900 and the visitor does nothing
- **THEN** no loop is requested for any sheet more than one viewport height away from the screen

#### Scenario: REWIND pass on demand
- **WHEN** network requests are logged while the clock has only been in FORWARD and HOLD
- **THEN** no REWIND pass was requested
