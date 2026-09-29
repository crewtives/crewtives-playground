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

The playground MUST NOT change any route under `/4d-os/`. The 404 page answering unknown paths there does not change a route. A link with a fragment pointing to a section or to a state of a playground page (the museum or a landing), including sheet links `#sheet-NNN`, SHALL open the page at that section or in that state: the page MUST NOT jump back to the top on load. 4D.OS SHALL keep its current load behavior.

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
- **WHEN** `/4d-os/` and `/4d-os/a/` through `/4d-os/e/` are opened after the change
- **THEN** they load and behave the same as before, except for each page's link back to the playground and the pack-weight label, which now reads MiB

#### Scenario: Site files at the root
- **WHEN** `/robots.txt`, `/sitemap.xml` and `/favicon.ico` are requested
- **THEN** each responds 200

#### Scenario: Unknown address
- **WHEN** `/nope` or `/4d-os/nope` is requested
- **THEN** the response is a 404 whose body is the site's 404 page, not an empty body

### Requirement: Free typefaces unique to each landing
Every playground typeface (the museum and the landings) SHALL:
- have an OFL license or an equivalent free license that allows embedding and redistributing it (for example, Apache-2.0, like Permanent Marker in 4D.OS);
- be served from the site itself;
- be listed in `LICENSES.md`, with its license text next to the file.

No family SHALL repeat between two playground pages or match one from 4D.OS. The museum's families MUST NOT be siblings of a family already used in 4D.OS or in the landings either, that is, variants or subsets of the same extended family (for example, Recursive Sans versus Recursive Mono, or Geist versus Geist Pixel).

The site's 404 page is part of the museum's house. It SHALL use the museum's families, served from the same files, and it does not count as a separate page for the no-repeat rule. The share images draw each page's own families into the image. That is a rendering of the page's typefaces, not a new use of a family.

The pages MUST NOT request fonts or other resources from external origins, and MUST NOT include assets, fonts or copy from the reference aesthetic's site.

#### Scenario: Font audit
- **WHEN** the fonts requested by the museum, the three landings and 4D.OS are listed
- **THEN** all the playground's fonts are OFL or an equivalent free license, are served from the site and are listed in `LICENSES.md`, no family appears on two playground pages or on a playground page and in 4D.OS, and no museum family is a sibling of one already used

#### Scenario: 404 page fonts
- **WHEN** the fonts requested by the 404 page are listed
- **THEN** they are only the museum's families, from the same files the museum requests

#### Scenario: No external origins
- **WHEN** network requests are recorded while going through the museum, the three landings and the 404 page
- **THEN** all of them go to the site itself
