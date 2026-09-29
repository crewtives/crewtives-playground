## MODIFIED Requirements

### Requirement: Demo honesty
Each playground page (the museum and the landings) SHALL:
- show the build mark "demo build 0.1"; on each landing, in the footer;
- label as a synthetic scene every world, every still and every loop of a synthetic scene;
- carry visible credits for the typefaces with their licenses, for the libraries it uses in the browser with their licenses, and for the "Cat" model with its CC-BY line;
- use "<Name> · crewtives playground" as the tab title on each landing and "crewtives playground" in the museum.

No page SHALL show the line "One of three candidate landings" or link to the old comparison page (`/landings/`, exactly), and no text SHALL present a landing as a candidate for the playground's front page. Instead:
- each landing that is not in the museum's collection (currently Game Center Yonjigen and Wind-Up Empire) SHALL show in the footer the line "Not in the collection yet · Playground", where "Playground" is a link to `/`;
- each landing that is a work in the collection SHALL show in the footer the way back to its sheet, "Playground · Sheet NNN", linking to `/#sheet-NNN` (currently only Bloomscope: "Playground · Sheet 004", to `/#sheet-004`). The 4D.OS worlds show theirs according to `playground-museum`.

In both lines, "Playground" SHALL be preceded by a left arrow: the `←` character if that line's typeface includes it, or a vector icon if not. A page whose typeface does not include `←` MUST NOT show that character.

No text SHALL claim something that the page's code does not control or does not fulfill:
- there MUST NOT be rankings, other people's scores, user counts, testimonials or invented dates;
- every figure that describes a work or a toy (measurements, weights, counts, times and dates) SHALL be computed in the page, read from the work during the build (from its pack or its code), taken from the collection's curation (the works' creation dates), read from its loop's provenance, or be labeled as an estimate;
- the other visible figures SHALL come from a declared source: the build stamp, the sheet numbers set by the collection's curation, the years and numbers of the cited references (each with its source) and the control labels (such as "1-bit" or "16");
- what the page says about what it stores or sends SHALL match what it actually stores or sends, including the sound preference;
- there MUST NOT be claims about what the hosting does, such as its analytics.

A landing toy that is not finished at publication SHALL be shown as an honest empty place inside its landing's world. It MUST NOT be hidden or pretend to work.

#### Scenario: Footer and title
- **WHEN** the visitor reaches the footer of any landing
- **THEN** they see "demo build 0.1" and the credits, do not see the candidate-landing line or a link to the old comparison `/landings/`, and the tab is titled "<Name> · crewtives playground"

#### Scenario: Landing outside the collection
- **WHEN** the visitor reaches the footer of Game Center Yonjigen or Wind-Up Empire
- **THEN** they read "Not in the collection yet · Playground", with "Playground" preceded by a left arrow, and activating "Playground" takes them to `/`

#### Scenario: Work in the collection
- **WHEN** the visitor activates the "Playground · Sheet 004" link in Bloomscope's footer
- **THEN** they arrive at `/#sheet-004` and the museum stays positioned at sheet 004

#### Scenario: Arrow without a missing glyph
- **WHEN** the typeface of a landing's way-back line does not include the `←` character
- **THEN** the arrow is shown as a vector icon, the visible text does not contain `←` and no replacement glyph appears

#### Scenario: Museum title and stamp
- **WHEN** `/` is opened
- **THEN** the tab is titled "crewtives playground" and the page shows "demo build 0.1" and the credits

#### Scenario: No candidates
- **WHEN** the published HTML of the museum and the landings is searched
- **THEN** the line "One of three candidate landings" does not appear, no text presents a landing as a candidate for the front page and no link points exactly to `/landings/`

#### Scenario: Figures about a work
- **WHEN** each visible figure and date in the museum that describes a work is compared with the work it refers to
- **THEN** each one matches what is read from its pack, its code, the collection's curation or its loop's provenance, or is labeled as an estimate

#### Scenario: Figures that do not describe a work
- **WHEN** the visible figures in the museum that do not describe a work are checked, such as "demo build 0.1", "Sheet 002" or the year of a reference in the colophon
- **THEN** each one comes from the build stamp, from the collection's curation, from a cited reference with its source or from a control label

#### Scenario: What it stores and what it sends
- **WHEN** the page says what it stores or what it sends
- **THEN** what it says matches what is observed in the browser's storage and on the network

#### Scenario: Unfinished toy
- **WHEN** a landing toy is not finished at publication
- **THEN** its place shows an empty space in the world's own style that says it is not ready yet, and nothing pretends to work
