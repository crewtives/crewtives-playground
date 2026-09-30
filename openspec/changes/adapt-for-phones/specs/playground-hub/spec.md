# Spec Delta

## MODIFIED Requirements

### Requirement: Playground routes
The site SHALL serve:
- `/`: the playground museum, with a 200 response and no redirect;
- `/bloomscope/`: Bloomscope;
- `/landings/game-center/`: Game Center Yonjigen;
- `/landings/wind-up-empire/`: Wind-Up Empire;
- at the root, the site files that `site-metadata` defines: `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/apple-touch-icon.png`, `/icon.svg`, and the share images under `/og/`;
- `/404`: the 404 page's own address, answering 200 with `noindex` (`site-metadata`, "The 404 page"); `/404.html` redirects to it.

The site SHALL redirect with a 301:
- `/landings/` to `/` (the comparison page no longer exists);
- `/landings/bloomscope/` to `/bloomscope/`.

A redirect MUST NOT drop the fragment of the requested URL: `/landings/bloomscope/#g=<garden>` SHALL end at `/bloomscope/#g=<garden>`.

A request for any other path that the site does not serve SHALL receive a 404 status with the site's 404 page (`site-metadata`, "The 404 page"). This includes paths under `/4d-os/`. It MUST NOT receive an empty response. The redirects above SHALL keep taking precedence over the 404 page.

Game Center Yonjigen and Wind-Up Empire SHALL remain published at their routes, outside the collection: they MUST NOT appear as museum sheets or as rows of its sheet index.

The playground MUST NOT change any route under `/4d-os/`. The 404 page answering unknown paths there does not change a route. A link with a fragment pointing to a section or to a state of a playground page (the museum or a landing), including sheet links `#sheet-NNN`, SHALL open the page at that section or in that state: the page MUST NOT jump back to the top on load. 4D.OS SHALL keep its current load behavior, except where a requirement of a 4D.OS page changes it (`4d-pack` "Layers a page never draws", and the launcher's phone stills in `cosmic-landings` "Presence in the launcher").

#### Scenario: Museum at the root
- **WHEN** `/` is requested after the museum deploy
- **THEN** the response is a 200 with the museum, there is no redirect to `/4d-os/` and the console shows no errors

#### Scenario: Museum and landings at their routes
- **WHEN** `/`, `/bloomscope/`, `/landings/game-center/` and `/landings/wind-up-empire/` are requested
- **THEN** each route responds with its page and the console shows no errors

#### Scenario: Comparison page retired
- **WHEN** `/landings/` is requested
- **THEN** the response is a 301 with destination `/`

#### Scenario: Bloomscope moved with its fragment
- **WHEN** the visitor opens `/landings/bloomscope/#g=<garden>`
- **THEN** they receive a 301 to `/bloomscope/`, the address bar ends at `/bloomscope/#g=<garden>` with the same fragment and the page shows that garden

#### Scenario: Landings outside the collection
- **WHEN** the visitor goes through the museum from end to end
- **THEN** Game Center Yonjigen and Wind-Up Empire do not appear as sheets or as rows of the sheet index, and their routes still respond with their page

#### Scenario: Deep link to the index
- **WHEN** the visitor opens a landing with the fragment that points to its demo index
- **THEN** the page stays positioned at the index and does not jump to the top

#### Scenario: Deep link to a sheet
- **WHEN** the visitor opens `/#sheet-002`
- **THEN** the museum stays positioned at sheet 002 and does not jump to the top

#### Scenario: 4D.OS intact
- **WHEN** `/4d-os/` and `/4d-os/a/` through `/4d-os/e/` are opened after a playground change
- **THEN** they respond at the same routes, and on a desktop with a fine pointer they load and render as before, except for the changes their own requirements name

#### Scenario: Site files at the root
- **WHEN** `/robots.txt`, `/sitemap.xml` and `/favicon.ico` are requested
- **THEN** each responds 200

#### Scenario: Unknown address
- **WHEN** `/nope` or `/4d-os/nope` is requested
- **THEN** the response is a 404 whose body is the site's 404 page, not an empty body

### Requirement: Demo honesty
Each playground page (the museum and the landings) SHALL:
- show the build mark "demo build 0.1"; on each landing, in the footer;
- label as a synthetic scene every world, every still and every loop of a synthetic scene;
- carry visible credits for the typefaces with their licenses, for the libraries it uses in the browser with their licenses, and for the "Cat" model with its CC-BY line;
- use "<Name> · crewtives playground" as the tab title on each landing and "crewtives playground · a museum of live graphics experiments" in the museum, which names the site first and then says what it is to a visitor who arrives from a search result.

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
- **THEN** the tab is titled "crewtives playground · a museum of live graphics experiments" and the page shows "demo build 0.1" and the credits

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
