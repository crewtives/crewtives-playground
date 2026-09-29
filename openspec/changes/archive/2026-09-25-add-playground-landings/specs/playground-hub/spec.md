# Spec Delta

## Purpose

Defines what the playground's three candidate landings (Game Center Yonjigen, Wind-Up Empire and Bloomscope) share and the platform around them: routes, a comparison page, an honest demo index, build and deploy alongside 4D.OS, sound, reduced motion, a fallback without WebGL2, accessibility, demo honesty and a load budget.

## ADDED Requirements

### Requirement: Landing routes
The site SHALL serve:
- `/landings/game-center/`: Game Center Yonjigen;
- `/landings/wind-up-empire/`: Wind-Up Empire;
- `/landings/bloomscope/`: Bloomscope;
- `/landings/`: the comparison page.

The root `/` SHALL keep redirecting to `/4d-os/` with a 302 until a landing is chosen. The landings MUST NOT change any route under `/4d-os/`.

A link with a fragment pointing to a section or to a state of a landing SHALL open the page at that section or in that state: the landing MUST NOT jump back to the top on load. 4D.OS SHALL keep its current load behavior.

#### Scenario: Root unchanged
- **WHEN** `/` is requested after the landings deploy
- **THEN** the response is a 302 to `/4d-os/`

#### Scenario: Three landings and the comparison page
- **WHEN** `/landings/`, `/landings/game-center/`, `/landings/wind-up-empire/` and `/landings/bloomscope/` are requested
- **THEN** each route responds with its page and the console shows no errors

#### Scenario: Deep link to the index
- **WHEN** the visitor opens a landing with the fragment that points to its demo index
- **THEN** the page stays positioned at the index and does not jump to the top

#### Scenario: 4D.OS intact
- **WHEN** `/4d-os/` and `/4d-os/a/` through `/4d-os/e/` are opened after the change
- **THEN** they load and behave the same as before

### Requirement: Comparison page
`/landings/` SHALL be a simple page that links the three landings, each with its name and a single line describing it. The page MUST NOT adopt the visual world of any landing (color fields, typefaces or toys).

#### Scenario: Comparing the three
- **WHEN** the visitor opens `/landings/`
- **THEN** they see three links, each with the name of a landing and a line, and each link opens that landing's route

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
A single build command SHALL produce 4D.OS and the landings in the same published output: 4D.OS under `/4d-os/`, and everything the landings add (pages, code, fonts and images) under `/landings/`. The landings build MUST NOT copy 4D packs to the output, MUST NOT write outside `/landings/` and MUST NOT delete or modify the 4D.OS output.

The build SHALL fail if the output root contains 4D packs. The direction documents and the `DESIGN.md` files that live next to each page MUST NOT appear in the published output, either whole or in fragments (HTML, comments, attributes or code).

#### Scenario: Combined output
- **WHEN** the production build runs
- **THEN** the output contains `4d-os/` and `landings/` with the three landings and the comparison page, and everything the landings add is under `landings/`

#### Scenario: No packs at the root
- **WHEN** the production build finishes
- **THEN** the output root has no 4D packs and the packs are only under `4d-os/`

#### Scenario: Wrong configuration
- **WHEN** the landings build leaves 4D packs at the output root
- **THEN** the build fails with an error that says so

#### Scenario: Direction documents kept out of the output
- **WHEN** the published output is searched for the text of the direction documents or of the `DESIGN.md` files
- **THEN** it does not appear

### Requirement: Preview before production
The landings SHALL first be published to a preview version of the Worker, with its own URL, without touching production. `playground.crewtives.com` MUST NOT change until the owner approves publishing the landings to production.

#### Scenario: Preview published
- **WHEN** the preview version is published
- **THEN** its URL serves `/landings/`, the three landings and `/4d-os/`, and `playground.crewtives.com` keeps serving the previous version

### Requirement: Synthesized sound, off by default
All landing sound SHALL be synthesized in the browser: the pages MUST NOT download audio files.

Sound SHALL be off by default. Each landing SHALL show on the first screen, on desktop and on phone, a sound button with the visible text "Sound off" or "Sound on". The button SHALL announce its state to assistive technologies as a toggle button.

The page MUST NOT emit sound without a visitor gesture in the current load, even if the saved preference is "on". The preference SHALL be remembered between visits when the browser allows it, and the page SHALL work the same if it cannot save it. While the tab is hidden, sound SHALL stay silent.

#### Scenario: First visit
- **WHEN** the visitor opens a landing for the first time and touches nothing
- **THEN** nothing plays and the button says "Sound off"

#### Scenario: Saved preference
- **WHEN** the visitor turned sound on in a previous visit and reloads the page
- **THEN** the button says "Sound on", but nothing plays until their first gesture in this load

#### Scenario: No audio files
- **WHEN** network requests are recorded while the visitor uses all the toys with sound on
- **THEN** no request is for an audio file

#### Scenario: Hidden tab
- **WHEN** sound is on and the tab goes to the background
- **THEN** nothing plays until the tab is visible again

#### Scenario: Storage blocked
- **WHEN** the browser does not allow saving local data
- **THEN** the page works, sound starts off and the button still toggles it

### Requirement: Reduced motion
With `prefers-reduced-motion: reduce`:
- nothing SHALL move on its own: no automatic demonstrations, no idle spins, no scroll-linked animations, no smooth scrolling;
- the first screen SHALL show a pre-exposed still image, with all moments at once;
- each toy SHALL remain usable, and when used SHALL jump to its result and show it as a still exposure instead of animating the path.

The page SHALL follow that preference live: if it changes while the page is open, the change SHALL apply without reloading.

#### Scenario: Load with reduced motion
- **WHEN** a landing loads with reduced motion and the visitor does nothing
- **THEN** nothing moves, the first screen shows the pre-exposed image and, once loading finishes, no more frames are rendered

#### Scenario: Toy with reduced motion
- **WHEN** the visitor uses any toy with reduced motion
- **THEN** the result appears immediately as a still exposure and the toy can be used again

#### Scenario: Live change
- **WHEN** the visitor turns on reduced motion in the system with the landing open
- **THEN** the automatic animation stops without reloading the page

### Requirement: Limited flashes
In any configuration, no element of the landings SHALL flash more than three times per second. No color change that fills the whole field of a section or a whole view SHALL repeat faster than 3 Hz.

#### Scenario: Most intense effect
- **WHEN** the luminance of any toy is measured at its most intense effect
- **THEN** there are no more than three flashes per second and no full-field color change exceeds 3 Hz

### Requirement: Fallback without WebGL2
Each landing SHALL check whether the browser has WebGL2 before downloading its 3D code. Without WebGL2:
- the page MUST NOT download the 3D code or produce JavaScript errors;
- the static content SHALL remain intact: color fields, text, index, stills, lab slots and links;
- each toy SHALL fall back to a usable 2D version or an honest still image, and none SHALL be left blank or broken;
- the page SHALL show a single honest line saying that WebGL2 is missing and what is shown in its place.

#### Scenario: Browser without WebGL2
- **WHEN** a landing is opened in a browser without WebGL2
- **THEN** the console shows no errors, the 3D code is not requested, the index and its links work and a line explains that WebGL2 is missing

#### Scenario: Toys in 2D
- **WHEN** the visitor goes through the page without WebGL2
- **THEN** each toy is a usable 2D version or a still image, never an empty space

### Requirement: One color-depth selector per landing
Each landing SHALL have a single color-depth control, with the modes 1-bit, 16 colors and Millions, which changes all of its retro-display views at once.

#### Scenario: Changing the mode
- **WHEN** the visitor picks 1-bit in a landing's control
- **THEN** all the retro-display views on that page switch to 1-bit in the next frame they render

### Requirement: Accessibility
On the landings and on the comparison page:
- every control and every toy SHALL be usable with the keyboard, with visible focus and an accessible name;
- body text SHALL have a contrast of at least 4.5:1 against the background it sits on;
- each canvas and each 3D view SHALL have an accessible name and a text description of what it shows;
- toy results (a play, a prize, a generation) SHALL be announced in a live region;
- at 390 px wide the page MUST NOT have horizontal scroll.

#### Scenario: Keyboard only
- **WHEN** the visitor goes through a landing using only the keyboard
- **THEN** they reach and use every control and every toy, and always see where the focus is

#### Scenario: Screen reader
- **WHEN** a screen reader reaches a 3D view or the visitor finishes using a toy
- **THEN** the reader reads the name and description of the view, and announces the toy's result

#### Scenario: Body contrast
- **WHEN** each body text is measured against its actual background
- **THEN** every pair reaches at least 4.5:1

#### Scenario: Phone
- **WHEN** the viewport is 390 px wide
- **THEN** no playground page has horizontal scroll

### Requirement: Demo honesty
Each landing SHALL:
- show the build mark "demo build 0.1" in the footer;
- show in the footer, while it is a candidate, the line "One of three candidate landings · compare at /landings/", linking to `/landings/` (the line is removed when the landing is promoted);
- label as a synthetic scene every world and every still;
- carry visible credits for the typefaces (OFL), for the libraries it uses in the browser with their licenses, and for the "Cat" model with its CC-BY line;
- use "<Name> · crewtives playground" as the tab title.

No text SHALL claim something that the page's code does not control or does not fulfill:
- there MUST NOT be rankings, other people's scores, user counts, testimonials or invented dates;
- every figure SHALL be computed in the page or be labeled as an estimate;
- what the page says about what it stores or sends SHALL match what it actually stores or sends, including the sound preference;
- there MUST NOT be claims about what the hosting does, such as its analytics.

A toy that is not finished at publication SHALL be shown as an honest empty place inside its landing's world. It MUST NOT be hidden or pretend to work.

#### Scenario: Footer and title
- **WHEN** the visitor reaches the footer of any landing
- **THEN** they see "demo build 0.1", the candidate-landing line with its link to `/landings/` and the credits, and the tab is titled "<Name> · crewtives playground"

#### Scenario: What it stores and what it sends
- **WHEN** the page says what it stores or what it sends
- **THEN** what it says matches what is observed in the browser's storage and on the network

#### Scenario: Unfinished toy
- **WHEN** a toy is not finished at publication
- **THEN** its place shows an empty space in the world's own style that says it is not ready yet, and nothing pretends to work

### Requirement: Load and idle budget
On each landing:
- all the JavaScript the page can load, including shared chunks and those loaded later, SHALL add up to at most 350 KB gzipped, measured on the production build output;
- the first load, before any interaction or scroll, SHALL transfer at most 2 MB;
- the page MUST NOT request 4D packs;
- only the views that are on screen SHALL render. If all views are off screen, if the tab is hidden or if there is nothing to animate, the engine SHALL render zero frames.

#### Scenario: Measured JavaScript
- **WHEN** the production build output is measured
- **THEN** the JavaScript of each landing, adding up all its chunks, does not exceed 350 KB gzipped

#### Scenario: First load
- **WHEN** a landing loads at 1440×900 without scroll or interaction
- **THEN** the total transfer does not exceed 2 MB and no 4D pack is requested

#### Scenario: Idle
- **WHEN** all views are off screen or the tab goes to the background
- **THEN** no frame is rendered

### Requirement: Free typefaces unique to each landing
Every landing typeface SHALL have an OFL license or an equivalent free license that allows embedding and redistributing it (for example, Apache-2.0, like Permanent Marker in 4D.OS), be served from the site itself and be listed in `LICENSES.md`, with its license text next to the file. No family SHALL repeat between two landings or match one from 4D.OS. The pages MUST NOT request fonts or other resources from external origins, and MUST NOT include assets, fonts or copy from the reference aesthetic's site.

#### Scenario: Font audit
- **WHEN** the fonts requested by the three landings and 4D.OS are listed
- **THEN** all the landings' fonts are OFL or an equivalent free license, are served from the site and are listed in `LICENSES.md`, and no family appears on two landings or on a landing and in 4D.OS

#### Scenario: No external origins
- **WHEN** network requests are recorded while going through the three landings and the comparison page
- **THEN** all of them go to the site itself

### Requirement: English copy
All visible text of the landings and the comparison page SHALL be in English. A word in another language that is part of a landing's world SHALL have its English translation next to it or in a visible glossary on the same page.

#### Scenario: Word in another language
- **WHEN** a landing shows a word in Japanese
- **THEN** its English translation appears next to it or in the page's visible glossary
