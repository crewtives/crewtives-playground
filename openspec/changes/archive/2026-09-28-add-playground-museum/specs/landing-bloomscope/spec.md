# Spec Delta

## MODIFIED Requirements

### Requirement: Page at its route and section order
The landing SHALL be served at `/bloomscope/` with the title `Bloomscope · crewtives playground`. All visible text SHALL be in English. The page SHALL present, in this order:
1. the Scope (the first screen);
2. the index "Load another wheel." (`id="worlds"`);
3. Sow, the golden-angle seeder;
4. the rosette lathe;
5. the honeycomb frame (Hive);
6. the footer.

The navigation SHALL link each section in page order. On load, the page MUST NOT scroll back to the top on its own, so that deep links (`#worlds` and the garden link `#g=`) reach their destination. A toy that is not finished at publication SHALL be shown as an empty clear-glass cell, labeled as in preparation, inside its section; it MUST NOT be hidden or faked.

#### Scenario: Full walkthrough
- **WHEN** the visitor scrolls down from the first screen to the end
- **THEN** they find the Scope, the index, Sow, the lathe, the honeycomb and the footer, in that order

#### Scenario: Deep link to the index
- **WHEN** `/bloomscope/#worlds` is opened
- **THEN** the page stays positioned at the index "Load another wheel." and does not jump to the top

#### Scenario: Unfinished toy
- **WHEN** the landing is published with the honeycomb unfinished
- **THEN** the honeycomb section keeps its color field and its headline, and shows an empty glass cell labeled as in preparation instead of the toy

### Requirement: Bloomscope honesty and footer
The footer SHALL show "Bloomscope · demo build 0.1" and a paragraph saying that everything is computed in the browser from equations, with no photographs or downloaded 3D models; that the spiral counts are estimates; that the toys reset on reload and that the link saves a garden; and that the typography is Ultra (Apache License 2.0) and Recursive (SIL Open Font License). It SHALL include "Made by crewtives", linking to `https://crewtives.com`. Every estimated figure on the page SHALL be labeled as estimated.

The footer SHALL carry the way back to Bloomscope's sheet in the museum: a native link to `/#sheet-004` with the visible text "Playground · Sheet 004", preceded by a left-pointing arrow. Ultra and Recursive do not include the `←` character, so the arrow SHALL be drawn as the page's own vector icon and the text MUST NOT contain that character. The link SHALL be in the static HTML, so that it works without JavaScript.

Bloomscope is no longer a candidate landing: the footer MUST NOT show the line "One of three candidate landings · compare at /landings/", and the page MUST NOT link to `/landings/`, which now redirects to `/`.

#### Scenario: Correct credits
- **WHEN** the visitor reads the footer
- **THEN** the type credits name Ultra and Recursive, and mention no other families

#### Scenario: Way back without JavaScript
- **WHEN** the static HTML of `/bloomscope/` is read without running scripts
- **THEN** the footer contains a link `<a href="/#sheet-004">` with the text "Playground · Sheet 004" and a left-pointing vector arrow, and the page's visible text does not contain the `←` character

#### Scenario: Back to the sheet
- **WHEN** the visitor activates "Playground · Sheet 004" in the footer
- **THEN** the browser opens `/#sheet-004`, Bloomscope's sheet in the museum

#### Scenario: No candidate line
- **WHEN** the visitor reads the footer
- **THEN** "One of three candidate landings" does not appear and no link on the page points to `/landings/`

## ADDED Requirements

### Requirement: Fixed garden for the museum loop
Bloomscope SHALL have a single fixed garden, published as a `/bloomscope/#g=…` link in the same format that "Copy link to this garden" produces. That link SHALL be the one used by the recording of the museum's sheet 004 loop, which records the Sow section while it sows; the one that loop's provenance records; and the one sheet 004 links to. That way, the visitor who follows it opens the same garden they saw recorded. The fixed garden SHALL use the `16` display, the same as the museum's recordings.

Opening the fixed link SHALL always load that garden: the same mirror mode, the same drum angle, the `16` display, the same specimens with their parameters and in their order, and the same Sow angle.

So that the recorded sowing is reproducible:
- **What the link fixes:** Sow's angle and the display. They are the only parts of the garden that change what Sow paints when sowing.
- **What does not travel in the link:** the rest of Sow's initial state, which SHALL be the same on every load: 610 seeds, "Scrub births" at all seeds and no seed under the pointer. The "Hold to sow" rate, 30 seeds per second, is a constant of the work.
- **What the provenance records:** the viewport, which determines the size of the view, and the pointer emulation (`hasTouch`, `isMobile`). Sow's cap is 800 only with `(pointer: coarse) and (max-width: 800px)` and 2400 otherwise. Both exceed the 700 seeds of a recording, so they do not change what is recorded. The pointer emulation does change the Scope's beads (10 or 18) and, with them, when the engine goes still.
- **Determinism:** the initial bloom and the sowing SHALL depend only on page time. With the same garden, the same viewport, the same pointer emulation and the same page-clock sequence, they SHALL yield the same seeds, in the same order and at the same positions. Sow MUST NOT use randomness.

As long as sheet 004 links to this garden, the fixed link SHALL keep opening it. An automated check in the repository SHALL fail if the fixed link stops reading as the fixed garden (for example, because the version of the `#g=` format changed). That way, sheet 004 never silently leads to the default garden.

#### Scenario: Always the same garden
- **WHEN** the fixed link is opened in two new tabs, one after the other
- **THEN** both show the same mirror mode, the same drum angle, the `16` display in every view, the same specimens in the same order in "In the chamber" and, in Sow, the same angle and 610 seeds

#### Scenario: Same sowing
- **WHEN** the fixed garden is loaded twice with the same viewport, the same pointer emulation and the same controlled clock, Sow's bloom is allowed to finish and in both loads "Hold to sow" is held for the same sequence of clock steps
- **THEN** at each step Sow has the same number of seeds in both loads, each seed at the same position, and its view gives the same hash

#### Scenario: From sheet 004
- **WHEN** the visitor follows the link to the loop's garden from the museum's sheet 004
- **THEN** they arrive at `/bloomscope/` with the fixed garden loaded, at `16`, and Sow opens with the same angle and the same 610 seeds the loop starts with

#### Scenario: Changed format
- **WHEN** the version of the `#g=` format changes and the fixed link is not updated
- **THEN** the automated check fails
