# playground-hub Specification

## Purpose

Defines what the playground pages share and the platform around them. The pages are the museum at `/`, which exhibits the collection; Bloomscope at `/bloomscope/`, a work in the collection; and Game Center Yonjigen and Wind-Up Empire at `/landings/<slug>/`, outside the collection. What they share: routes and redirects, an honest demo index, build and deploy alongside 4D.OS, sound, reduced motion, limited flashes, a fallback without WebGL2, accessibility, demo honesty, a load budget and typefaces of their own.

## Requirements

### Requirement: Playground routes
The site SHALL serve:
- `/`: the playground museum, with a 200 response and no redirect;
- `/bloomscope/`: Bloomscope;
- `/landings/game-center/`: Game Center Yonjigen;
- `/landings/wind-up-empire/`: Wind-Up Empire.

The site SHALL redirect with a 301:
- `/landings/` to `/` (the comparison page no longer exists);
- `/landings/bloomscope/` to `/bloomscope/`.

A redirect MUST NOT drop the fragment of the requested URL: `/landings/bloomscope/#g=<garden>` SHALL end at `/bloomscope/#g=<garden>`.

Game Center Yonjigen and Wind-Up Empire SHALL remain published at their routes, outside the collection: they MUST NOT appear as museum sheets or as rows of its sheet index.

The playground MUST NOT change any route under `/4d-os/`. A link with a fragment pointing to a section or to a state of a playground page (the museum or a landing), including sheet links `#sheet-NNN`, SHALL open the page at that section or in that state: the page MUST NOT jump back to the top on load. 4D.OS SHALL keep its current load behavior.

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

### Requirement: Shared demo index
Each landing SHALL include a demo index with the same content in all three, even though each one draws it in its own world:
- the five 4D.OS worlds (A · Vitrine, B · Plate, C · Leader, D · The golden stoop and E · Whale fall), each with its name, its real still, an honest line about what is shown, the visible label "synthetic scene" and a link to its route, from `/4d-os/a/` to `/4d-os/e/`;
- a link to the 4D.OS launcher, `/4d-os/`;
- exactly three lab slots.

The lab slots MUST NOT be links or show names or dates.

Worlds A, B and C show the cat from the "Cat" model, which is licensed CC-BY 3.0. Next to each of their images, that model's credit line SHALL be visible exactly as it appears in `LICENSES.md`.

#### Scenario: Five worlds and the launcher
- **WHEN** the visitor goes through the index of any of the three landings
- **THEN** they find the five worlds, each with an image, a line, the "synthetic scene" label and a link to its route, plus the link to `/4d-os/`, with the same routes in all three landings

#### Scenario: Cat credit
- **WHEN** the index shows the image of A, B or C
- **THEN** next to the image the credit line for the "Cat" model set by `LICENSES.md` reads unchanged

#### Scenario: Lab slots
- **WHEN** the lab slots of the index are checked
- **THEN** there are exactly three, none is a link and none shows a name or a date

### Requirement: Index reachable from the first screen and always open
The index SHALL be the second section of each landing, right after the first screen. The first screen SHALL show a visible link to the index, both on desktop (1440×900) and on phone (390×844).

The index links SHALL be real links present in the static HTML, so that they work without JavaScript. The state of the games (plays, prizes, progress or economy) MUST NOT change, hide or disable them.

#### Scenario: Desktop and phone
- **WHEN** a landing loads at 1440×900 or at 390×844
- **THEN** the first screen shows, without scrolling, a visible link to the index, and activating it leads to the second section

#### Scenario: Without JavaScript
- **WHEN** a landing is loaded with JavaScript disabled
- **THEN** the index shows the five worlds with their images, the launcher and the three lab slots, and the six links work

#### Scenario: Without playing or without winning
- **WHEN** the visitor used no toy, or used them and won nothing
- **THEN** every index link is active and points to the same route it would have after winning

### Requirement: Real stills with provenance
The images of the five worlds SHALL be captures of each world's live render, saved losslessly at their capture resolution (1200×900). The three landings SHALL use a single set of images. The provenance of each image SHALL be recorded: source image, route, capture method and date, and the synthetic-scene mark. Each image SHALL also have its row in `LICENSES.md`.

The pages MUST NOT dither them again or overlay patterns or filters on them. Nearest-neighbor scaling SHALL be used only when each block of the capture lands on a whole number of pixels; at other sizes, the image SHALL be downscaled with smoothing. Each image SHALL be lazy-loaded and have alt text that describes what it shows.

#### Scenario: No placeholder images
- **WHEN** the index of any landing is checked
- **THEN** the five images are real captures, with no emblems or placeholder images, and each has its provenance recorded

#### Scenario: No new dithering
- **WHEN** an image is shown at 800×600 CSS pixels
- **THEN** each block of the capture occupies a crisp 2×2 CSS-pixel square and no added pattern appears

#### Scenario: A single set of images
- **WHEN** the images requested by the three landings are compared
- **THEN** all three request the same files

### Requirement: Build alongside 4D.OS without copying packs
A single build command SHALL produce 4D.OS and the playground in the same published output:
- 4D.OS under `/4d-os/`;
- the museum at the root (`/index.html`);
- Bloomscope under `/bloomscope/`;
- Game Center Yonjigen and Wind-Up Empire under `/landings/game-center/` and `/landings/wind-up-empire/`;
- the code, fonts and images the playground adds, in the playground's own folders, never inside `/4d-os/`. What the museum requests MUST NOT be published under `/landings/`.

The output MUST NOT contain the comparison page (`landings/index.html`) or a copy of Bloomscope in `landings/bloomscope/`. The playground build MUST NOT copy 4D packs to the output, MUST NOT write inside `/4d-os/` and MUST NOT delete or modify the 4D.OS output.

The build SHALL fail if the output root contains 4D packs, and SHALL fail if the playground build wrote inside `/4d-os/`. The direction documents and the `DESIGN.md` files that live next to each page MUST NOT appear in the published output, either whole or in fragments (HTML, comments, attributes or code).

#### Scenario: Combined output
- **WHEN** the production build runs
- **THEN** the output contains `index.html` (the museum), `4d-os/`, `bloomscope/`, `landings/game-center/` and `landings/wind-up-empire/`, and does not contain `landings/index.html` or `landings/bloomscope/`

#### Scenario: 4D.OS untouched
- **WHEN** the `4d-os/` folder of the full output is compared with the one produced by the 4D.OS build alone
- **THEN** the two are identical

#### Scenario: No packs at the root
- **WHEN** the production build finishes
- **THEN** the output root has no 4D packs and the packs are only under `4d-os/`

#### Scenario: Wrong configuration
- **WHEN** the playground build leaves 4D packs at the output root
- **THEN** the build fails with an error that says so

#### Scenario: Write inside 4D.OS
- **WHEN** the playground build writes a file inside `4d-os/`
- **THEN** the build fails with an error that says so

#### Scenario: Direction documents kept out of the output
- **WHEN** the published output is searched for the text of the direction documents or of the `DESIGN.md` files
- **THEN** it does not appear

### Requirement: Preview before production
Every playground change (the museum, the landings, their routes and their redirects) SHALL first be published to a preview version of the Worker, with its own URL, without touching production. `playground.crewtives.com` MUST NOT change until the owner approves publishing that change to production.

#### Scenario: Preview published
- **WHEN** the preview version of the museum is published
- **THEN** its URL serves the museum at `/`, `/bloomscope/`, `/landings/game-center/`, `/landings/wind-up-empire/` and `/4d-os/`, responds with the 301s for `/landings/` and `/landings/bloomscope/`, and `playground.crewtives.com` keeps serving the previous production version

### Requirement: Synthesized sound, off by default
All playground sound (the museum and the landings) SHALL be synthesized in the browser: the pages MUST NOT download audio files.

Sound SHALL be off by default. Each playground page SHALL show on the first screen, on desktop and on phone, a sound button with the visible text "Sound off" or "Sound on". The button SHALL announce its state to assistive technologies as a toggle button.

The page MUST NOT emit sound without a visitor gesture in the current load, even if the saved preference is "on". The preference SHALL be remembered between visits when the browser allows it, and the page SHALL work the same if it cannot save it. While the tab is hidden, sound SHALL stay silent.

#### Scenario: First visit
- **WHEN** the visitor opens the museum or a landing for the first time and touches nothing
- **THEN** nothing plays and the button says "Sound off"

#### Scenario: Button on phone
- **WHEN** the museum or a landing loads at 390×844
- **THEN** the sound button is visible on the first screen without scrolling

#### Scenario: Saved preference
- **WHEN** the visitor turned sound on in a previous visit and reloads the page
- **THEN** the button says "Sound on", but nothing plays until their first gesture in this load

#### Scenario: No audio files
- **WHEN** network requests are recorded while the visitor, with sound on, uses all the toys of a landing, or folds a sheet and jumps between sheets in the museum
- **THEN** no request is for an audio file

#### Scenario: Hidden tab
- **WHEN** sound is on and the tab goes to the background
- **THEN** nothing plays until the tab is visible again

#### Scenario: Storage blocked
- **WHEN** the browser does not allow saving local data
- **THEN** the page works, sound starts off and the button still toggles it

### Requirement: Reduced motion
With `prefers-reduced-motion: reduce`, on each playground page (the museum and the landings):
- nothing SHALL move on its own: no automatic demonstrations, no idle spins, no loops, no scroll-linked animations, no smooth scrolling;
- on each landing, the first screen SHALL show a pre-exposed still image, with all moments at once;
- in the museum, the page clock SHALL start in HOLD, each VISTA SHALL show its loop's poster and each épure SHALL show its work's full trail. A loop SHALL play only when the visitor asks for it: with "Play loop" on its sheet, or with a gesture on the page clock (J, K, L, the FORWARD, REWIND and HOLD controls or the scrubber), which requests the loops of the sheets on screen at that moment. The fold SHALL jump to its final state without animating the turn, and the page light SHALL stay fixed, without changing with scroll;
- each toy SHALL remain usable, and when used SHALL jump to its result and show it as a still exposure instead of animating the path.

The page SHALL follow that preference live: if it changes while the page is open, the change SHALL apply without reloading.

#### Scenario: Load with reduced motion
- **WHEN** a landing loads with reduced motion and the visitor does nothing
- **THEN** nothing moves, the first screen shows the pre-exposed image and, once loading finishes, no more frames are rendered

#### Scenario: Museum with reduced motion
- **WHEN** the museum loads with reduced motion and the visitor does nothing
- **THEN** the clock is in HOLD, each VISTA shows its loop's poster, nothing moves and, once loading finishes, no frame is painted

#### Scenario: Requesting a loop
- **WHEN** with reduced motion the visitor presses "Play loop" on a sheet
- **THEN** that loop plays and the visitor can stop it again

#### Scenario: Requesting the loops from the clock
- **WHEN** with reduced motion the visitor presses L with two sheets on screen
- **THEN** the loops of those two sheets play with the clock in FORWARD, and the off-screen sheets stay on their poster

#### Scenario: Toy with reduced motion
- **WHEN** the visitor uses any toy with reduced motion, including the museum's fold
- **THEN** the result appears immediately as a still exposure and the toy can be used again

#### Scenario: Live change
- **WHEN** the visitor turns on reduced motion in the system with a playground page open
- **THEN** the automatic animation stops without reloading the page and, in the museum, the clock switches to HOLD

### Requirement: Limited flashes
In any configuration, no element of the playground (the museum and the landings) SHALL flash more than three times per second. No color change that fills the whole field of a section or a whole view SHALL repeat faster than 3 Hz. In the museum this SHALL also hold while the visitor drags the page clock, at any speed.

#### Scenario: Most intense effect
- **WHEN** the luminance of any toy is measured at its most intense effect
- **THEN** there are no more than three flashes per second and no full-field color change exceeds 3 Hz

#### Scenario: Scrubber at full speed
- **WHEN** the luminance of the museum's loops and épures is measured while the clock's scrubber goes back and forth from end to end several times per second
- **THEN** there are no more than three flashes per second and no full-field color change exceeds 3 Hz

### Requirement: Fallback without WebGL2
Each playground page (the museum and the landings) SHALL check whether the browser has WebGL2 before downloading its 3D code. Without WebGL2:
- the page MUST NOT download the 3D code or produce JavaScript errors;
- the static content SHALL remain intact. On the landings: color fields, text, index, stills, lab slots and links. In the museum: sheets, title blocks, posters, loops, épures, sheet index and links;
- each toy SHALL fall back to a usable 2D version or an honest still image, and none SHALL be left blank or broken. In the museum, the fold SHALL be shown as an axonometry of the dihedron in SVG;
- the page SHALL show a single honest line saying that WebGL2 is missing and what is shown in its place.

#### Scenario: Browser without WebGL2
- **WHEN** the museum or a landing is opened in a browser without WebGL2
- **THEN** the console shows no errors, the 3D code is not requested, the index and its links work and a line explains that WebGL2 is missing

#### Scenario: Toys in 2D
- **WHEN** the visitor goes through a landing without WebGL2
- **THEN** each toy is a usable 2D version or a still image, never an empty space

#### Scenario: Fold without WebGL2
- **WHEN** the visitor asks to fold a museum sheet in a browser without WebGL2
- **THEN** they see the axonometry of the dihedron in SVG and the line explaining that WebGL2 is missing, no 3D code is requested and the loops keep responding to the page clock

### Requirement: One color-depth selector per landing
Each playground page (the museum and each landing) SHALL have a single color-depth control, with the modes 1-bit, 16 colors and Millions, which changes all of its retro-display views at once.

In the museum, the control SHALL affect only its live views, the ones rendered in the browser. The loops are recordings: they MUST NOT change mode, and the page SHALL say next to the control that the loops are 16-color recordings.

#### Scenario: Changing the mode
- **WHEN** the visitor picks 1-bit in a landing's control
- **THEN** all the retro-display views on that page switch to 1-bit in the next frame they render

#### Scenario: Recorded loops in the museum
- **WHEN** the visitor picks 1-bit in the museum's control
- **THEN** the museum's live views switch to 1-bit, each loop keeps showing its 16 recorded colors and next to the control it reads that the loops are 16-color recordings

### Requirement: Accessibility
On each playground page (the museum and the landings):
- every control and every toy SHALL be usable with the keyboard, with visible focus and an accessible name;
- body text SHALL have a contrast of at least 4.5:1 against the background it sits on;
- each canvas and each 3D view SHALL have an accessible name and a text description of what it shows;
- toy results (a play, a prize, a generation) SHALL be announced in a live region;
- at 390 px wide the page MUST NOT have horizontal scroll.

#### Scenario: Keyboard only
- **WHEN** the visitor goes through a playground page using only the keyboard
- **THEN** they reach and use every control and every toy (in the museum, also the page clock, the fold and the sheet jump), and always see where the focus is

#### Scenario: Screen reader
- **WHEN** a screen reader reaches a 3D view or a museum loop, or the visitor finishes using a toy
- **THEN** the reader reads the name and description of the view or the loop, and announces the toy's result

#### Scenario: Body contrast
- **WHEN** each body text is measured against its actual background
- **THEN** every pair reaches at least 4.5:1

#### Scenario: Phone
- **WHEN** the viewport is 390 px wide
- **THEN** no playground page has horizontal scroll

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

### Requirement: Load and idle budget
On each playground page (the museum and each landing):
- all the JavaScript the page can load, including shared chunks and those loaded later, SHALL add up to at most 350 KB gzipped, measured on the production build output;
- the first load, before any interaction or scroll, SHALL transfer at most 2 MB, counting everything the page requests; in the museum, the posters and loops as well;
- the page MUST NOT request 4D packs or any of their files;
- only the views that are on screen SHALL render. If all views are off screen, if the tab is hidden or if there is nothing to animate, the page SHALL paint zero frames. In the museum this includes the loops, and the page clock in HOLD counts as nothing to animate.

#### Scenario: Measured JavaScript
- **WHEN** the production build output is measured
- **THEN** the JavaScript of each playground page, adding up all its chunks (in the museum, the fold's as well), does not exceed 350 KB gzipped

#### Scenario: First load
- **WHEN** the museum or a landing loads at 1440×900 without scroll or interaction
- **THEN** the total transfer, posters and loops included, does not exceed 2 MB and no file from a 4D pack is requested

#### Scenario: Idle
- **WHEN** all views and all loops are off screen, the tab goes to the background or the museum clock is in HOLD
- **THEN** no frame is painted

### Requirement: Free typefaces unique to each landing
Every playground typeface (the museum and the landings) SHALL have an OFL license or an equivalent free license that allows embedding and redistributing it (for example, Apache-2.0, like Permanent Marker in 4D.OS), be served from the site itself and be listed in `LICENSES.md`, with its license text next to the file. No family SHALL repeat between two playground pages or match one from 4D.OS. The museum's families MUST NOT be siblings of a family already used in 4D.OS or in the landings either, that is, variants or subsets of the same extended family (for example, Recursive Sans versus Recursive Mono, or Geist versus Geist Pixel). The pages MUST NOT request fonts or other resources from external origins, and MUST NOT include assets, fonts or copy from the reference aesthetic's site.

#### Scenario: Font audit
- **WHEN** the fonts requested by the museum, the three landings and 4D.OS are listed
- **THEN** all the playground's fonts are OFL or an equivalent free license, are served from the site and are listed in `LICENSES.md`, no family appears on two playground pages or on a playground page and in 4D.OS, and no museum family is a sibling of one already used

#### Scenario: No external origins
- **WHEN** network requests are recorded while going through the museum and the three landings
- **THEN** all of them go to the site itself

### Requirement: English copy
All visible text of the museum and the landings SHALL be in English. A word in another language that is part of a page's world SHALL have its English translation next to it or in a visible glossary on the same page. Proper names (of people, places, works and books) do not count as words in another language.

#### Scenario: Word in another language
- **WHEN** a landing shows a word in Japanese
- **THEN** its English translation appears next to it or in the page's visible glossary

#### Scenario: Museum term in another language
- **WHEN** the museum shows a word that is not English, such as the French «épure»
- **THEN** its English translation appears next to it or in a visible glossary of the museum
