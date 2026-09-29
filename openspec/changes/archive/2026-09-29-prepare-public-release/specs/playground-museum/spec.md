## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Figures read from the work
**Reason**: The works' creation dates came from the git history (the first commit of each sheet's origin paths). The public repository starts from a new root commit and must also build from a shallow clone or an archive without `.git`, so the dates become curated values in the collection. A MODIFIED block cannot drop the scenario "Dates from git", so the requirement is replaced as a whole.

**Migration**: See "Figures read from the work and its curation": the same sources for every figure, except that a work's creation date is declared once in the collection (`YYYY-MM-DD`) and the build no longer runs git. The scenario "Dates from git" becomes "Curated dates", with the same values (001–003 → 2026-09-24, 004 → 2026-09-25).
