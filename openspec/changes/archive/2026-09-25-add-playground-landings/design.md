# Design

## Context

The motivation and scope are in `proposal.md` (Why, What Changes). The *new-work* process of `/impeccable` was already run in draft: a concept draw, two designers per theme, a judge and a critic of the set. Its outputs are in `directions/`, in English: one final direction per landing (`game-center.md`, `wind-up-empire.md`, `bloomscope.md`) and `critique.md`, which fixes the shared decisions and the mandatory adjustments for each landing. This document turns that into how it gets built.

**Repo state that constrains the design** (verified in the critique, §1):
- **4D.OS build and deploy.**
  - `vite.config.ts` builds with `base: '/4d-os/'` and `outDir: 'dist/4d-os'`.
  - Its `publicDir` is the repo's `public/`, which holds **230 MB of 4D packs**.
  - `wrangler.jsonc` serves `./dist` as an assets-only Worker.
  - `cloudflare/_redirects` sends `/` to `/4d-os/` with a 302, and `.assetsignore` excludes two packs.
- **`Engine`.**
  - Its canvas is `position: fixed`, sits **above** the DOM (`z-index: var(--engine-z, 5)`) and uses `pointer-events: none`, `alpha: true` and `preserveDrawingBuffer: true`.
  - It measures each view with `getBoundingClientRect` on every frame, as an axis-aligned rectangle, and only calls `tick()` on visible views.
  - It creates the `WebGLRenderer` in the constructor. three r186 only works with WebGL2, so without WebGL2 the constructor throws.
- **`RetroDisplay`.**
  - It has setters for `mode`, `pixelScale` and `reveal`, plus `tokenRoot` and `DISPLAY_MODES`.
  - `render()` paints the **entire** rectangle of the view, opaque, with its background color. It has no mask.
- **`setupSmoothScroll()`** forces `history.scrollRestoration = 'manual'` and `scrollTo(0, 0)`. That breaks any deep link with an anchor.
- **Stills.**
  - All five exist in `public/launcher/*.png` at 1200×900, and those of A, B and C are not in git.
  - They are captures of the dithered render in **3 px blocks**, so they are never dithered again.
  - As lossless WebP the five weigh 423 KB, against 700 KB as PNG.
- **Licenses.** `LICENSES.md` requires the CC-BY 3.0 credit for the "Cat" model, visible on every page that shows that scene, and that includes the stills of A, B and C. Its stills row currently covers only D and E.
- **Fonts.** Each world has its woff2 files committed next to it, with the `@font-face` in its `tokens.css`. There are no Fontsource packages or Playwright among the dependencies.

**Constraints:**
- no new npm dependencies;
- 4D.OS changes neither in behavior nor in display output;
- production stays intact until a landing is chosen;
- no image generation is configured, so the three are built *code-led*;
- the three are built in parallel, by separate work streams, on the same working tree.

## Goals / Non-Goals

**Goals:**
- A single shared base (build, index, sound, motion, WebGL2 detection, display registry) and three landings that differ in everything visible.
- Additive core changes, off by default, with 4D.OS identical.
- A parallel build without collisions: single-owner files and isolated verification per landing.
- Each landing closes the `/impeccable` cycle (final review, verdict, documentation) and can be published honestly at any cut-off point.
- A preview URL with all three, so they can be compared and one chosen.

**Non-Goals:**
- Choosing the landing: that choice is made after the preview, not in this change.
- Carrying out the promotion to `/`. It is only planned here; it happens after the choice.
- A dark option in the set. All three are light on purpose (critique, §3.10), and that is documented as a choice.
- Accounts, analytics, a server or persistence beyond the local preferences of D11 and D15.
- Loading 4D packs from the landings: the index uses stills.
- New build scripts: neither a fallback *baker* nor Playwright capture.
- Changing `wrangler.jsonc`, or touching the 4D.OS pages and packs.

## Decisions

D1–D17 keep the numbering of the critique's shared decisions (§8), so cross-references remain valid. They fold in the per-landing adjustments from its §9. D18–D21 are new: direction and worlds, parallel build, the `/impeccable` process and the preview deploy.

### D1. Routes
- `/landings/game-center/`, `/landings/wind-up-empire/` and `/landings/bloomscope/`. The slugs follow the names the visitor sees; `/landings/orbit/` is retired.
- `/landings/` is a simple comparison page, outside the three worlds, that links the three with one line each.
- `/` keeps its 302 to `/4d-os/` until a landing is chosen.

**Discarded alternatives:**
- Slugs from internal names (`orbit`, `neon`, `bloom`): the visitor does not know those names.
- Publishing a landing at `/` right away: the choice comes first.

### D2. File structure
- The playground's Vite root is `playground/`.
- **Pages:** `playground/landings/<slug>/index.html` and `playground/landings/index.html`.
- **Code:** `src/playground/<slug>/**` and `src/playground/shared/**`.
- **Tests:** `src/playground/**/*.test.ts`. The vitest `include` (`src/**/*.test.ts`) already covers them.
- **Public assets:** `playground/public/landings/**`. Today it only holds the shared stills (D9).

**Adjustment to the critique.** The critique put the surface brief and the `DESIGN.md` next to each page's HTML. Here the repo convention is followed:
- the brief goes in `.impeccable/surfaces/`;
- `DESIGN.md` and `.impeccable/design.json` at the root are extended once with the three worlds (D20).

Reasons:
- that is where the `/impeccable` tools look for briefs, and where those of A–E are;
- the current `DESIGN.md` already documents several worlds by section;
- `playground/` holds only what gets published.

What the critique was after still holds: none of that is imported or emitted (D17).

**Discarded alternatives:**
- `landings/` at the repo root (neon direction): the repo root is the 4D.OS Vite root, so its development server would also serve those pages.
- `public/landings/…` in the repo's `public/` (bloom direction): it would be copied into `dist/4d-os/`, next to the packs.

### D3. Build: a second configuration
`vite.playground.config.ts`:
- `root: 'playground'` and `base: '/'`.
- **`publicDir` resolved to `playground/public/`, never to the repo's `public/`.** Otherwise the 230 MB of packs would land at the root of `dist/`.
- `build.outDir` is the repo's `dist/`, with `emptyOutDir: false`.
- `build.assetsDir: 'landings/_assets'`: nothing occupies `/assets` before a landing is promoted to `/`.
- `rollupOptions.input`: the index plus the landing pages that exist on disk. That way the build works from the base, before all three exist.
- `server.fs.allow` includes the repo root, so `src/core` resolves in development.
- It honors `VITE_NO_HMR=1` like the 4D.OS configuration.
- It does not use `packSaver`.
- **Build check:** a closing plugin fails the build if `dist/packs` exists. Everything this build emits lands under `dist/landings/`.

**Scripts:**
- `build`: `tsc --noEmit && vite build && vite build -c vite.playground.config.ts`. The order is safe because the 4D.OS build only empties `dist/4d-os`.
- `dev:playground`: `vite -c vite.playground.config.ts`.
- `deploy:preview` is described in D21. `deploy` keeps its text: it inherits the landings through `build`.
- `tsconfig.json` adds `vite.playground.config.ts` to its `include`.

Rollup with multiple entries shares a single three chunk across the three pages and the index.

**Discarded alternatives:**
- `vite.landings.config.ts` with `base: '/landings/'` and `outDir: 'dist/landings'` (neon): promoting a landing to `/` would force rebuilding it with another base.
- Adding the pages to the 4D.OS configuration: they would inherit `base: '/4d-os/'`, its `publicDir` with the packs, and `packSaver`.

### D4. Engine
- A single `Engine` per page, with `maxDpr` 2, or 1.5 when `(pointer: coarse) and (max-width: 800px)` matches.
- Every WebGL surface is an `EngineView`.
- Pointer input goes to DOM elements, because the canvas has `pointer-events: none`.
- DOM that has to show **above** a view (HUD, bezels, rings, plaques, labels) gets `z-index: calc(var(--engine-z) + 1)`.
- An element that hosts a view only receives 2D transforms. A 3D transform desyncs the painted rectangle from the measured one. neon's tilted platform only gets away with it because it hosts no view.

**Discarded alternative:** one `Engine` per toy. That would mean several WebGL contexts per page, and browsers limit how many can exist at once.

### D5. RetroDisplay: existing API plus an additive mask
- The API is used as is: `mode`, `pixelScale`, `reveal`, `tokenRoot` and `DISPLAY_MODES`.
- **The only core change in the display:** `RenderOptions.mask?: { shape: 'ellipse' | 'roundrect'; radius?: number }`, evaluated in `display.frag.glsl`.
  - It is evaluated at the center of each block, so the edge is stepped like the rest of the display.
  - Outside the shape, the fragment is transparent and the DOM underneath shows through (the field, the ring).
  - By default there is no mask: 4D.OS output stays identical. A test covers the default, and `/4d-os/a–e/` are also loaded after the change.
- **Who uses it:**
  - bloom: the eyepiece, the peepholes and the wheels if they are GL;
  - neon: the corners of the CRTs;
  - orbit: the round sockets of the tray.
- **Display registry:** one per page (`src/playground/shared/displays.ts`). Each landing's 1-bit / 16 / Millions control switches all of its views at once, with neon's key, orbit's press or bloom's beads.

**Discarded alternatives:**
- `clip-path` or `border-radius` on the element: the view is painted on the shared canvas, not on the element, so CSS does not clip it.
- A custom shader per landing: it triples the display and falls outside the `dither-display` spec.

### D6. Simulation outside `view.tick`
- Any simulation that must keep running while its view is off screen runs as an `engine.addTicker` or on a 10 Hz timer, never in `view.tick`, which only runs while the view is visible.
  - **bloom's chamber:** it is a *ticker*, and the first view painted in each frame re-renders the cell texture once. The peepholes stay alive even with the Scope off screen.
  - **orbit's economy:** a pure state machine at 10 Hz. With the tab hidden it catches up with `performance.now()` deltas, capped at 5 minutes of production.
- Physics uses a fixed step and a seed, in a pure TS module with vitest fixtures.

**Discarded alternative:** simulating in `view.tick`. The peepholes and the economy would freeze when scrolling.

### D7. Smooth scroll: `resetToTop` option
- `setupSmoothScroll({ resetToTop = true })` is additive: 4D.OS calls it with no arguments and does not change.
- The landings pass `false`, so deep links survive (`#2f`, `#worlds`, `#g=` and neon's machine URL).
- Anchors go through Lenis. With reduced motion there is no Lenis, as is already the case.

**Discarded alternative:** jumping to the anchor again after boot from each landing. It produces a visible jump up and down, and it is fragile with Lenis.

### D8. Fonts
- They are committed per landing in `src/playground/<slug>/fonts/`, with their `OFL-*.txt`. They are downloaded once from the Fontsource tarball (`npm pack`), so no dependencies are added.
- The `@font-face` goes in the landing's `tokens.css`, with relative URLs.
  - `font-display: block` only for the hero's display face; `swap` for the rest.
  - No hand-written `preload` tags, because Vite hashes the file names.
- Each face adds its row to `LICENSES.md` → Typefaces. The main work stream writes it with the data each landing work stream hands over (D19).
- **Final faces:**
  - neon: Bungee, Bungee Shade, DotGothic16 (+ the Japanese subset committed once, from the fixed glossary) and M PLUS Rounded 1c;
  - orbit: Tilt Warp, Rampart One, **Libre Franklin** 500/700 and Sono;
  - bloom: **Ultra** and Recursive, with its CASL and MONO axis subsets registered as separate families.

  None is shared between landings or with 4D.OS.
- neon's sign atlas waits for `document.fonts.load()` of the Japanese subset before drawing. Otherwise the canvas writes with a fallback font.

**Discarded alternatives:**
- Fontsource packages as dependencies: they add dependencies and break the 4D.OS convention.
- Google Fonts over a CDN: every page would depend on a third party at runtime.

### D9. Stills
- **A single shared set** in `playground/public/landings/_shared/stills/{a..e}.webp`: lossless WebP at 1200×900 (423 KB in total, measured).
- Next to it sits a `provenance.json` with, per image: the source image, the route, the capture method and date, the synthetic scene flag and the credit.
- The PNGs of A, B and C are committed in `public/launcher/`, and the stills row of `LICENSES.md` is extended to A–E.
- **They are never dithered again,** so there are no dither layers in CSS.
  - In neon, the "off" CRT shows the dimmed image.
  - In orbit, the cavity's "print" is the image as is.
- `image-rendering: pixelated` only at integer multiples of 400×300, where the 3 px grid lands whole. At other sizes the image is downscaled with smoothing.
- Lazy loading and real alt text.
- Every still is labeled as synthetic. A, B and C carry the cat credit line, verbatim from `LICENSES.md`, next to the image.

**Discarded alternatives:**
- The PNGs: 700 KB.
- A Playwright capture script (bloom direction): it adds a heavy dependency, and the images already exist. The placeholder emblems are dropped too.

### D10. Index contract
- **A single data module**, `src/playground/shared/worlds.ts`, with id, letter, name, route, still with its dimensions, alt text, an honest line, the synthetic flag and the credit. All three landings use it.
- **Contents:** the five worlds, the launcher and **exactly three** lab slots with no name, no link and no date.
- **Position:** the index is **the second section** of each landing, with a visible link to it from the first screen on desktop **and** on phone.
  - neon: a direct link to 2F on the phone, where there is no directory;
  - bloom: "Load another wheel" moves to section 2, right after the Scope.
- The links to the worlds are always enabled (no game locks them) and are real `<a href>` elements in the static HTML. They work without JS and without WebGL2.
- **No drift:** each landing draws the index its own way, but the data is not hand-written anywhere else. A shared checker compares a landing's static HTML against `worlds.ts` (routes, lines, credits, three unlinked slots), and each landing runs it in its own test.

**Discarded alternatives:**
- One list per landing: the data drifts apart.
- An index generated by JS: it disappears without JS or if boot fails.

### D11. Sound
- **`src/playground/shared/sound.ts`:**
  - `AudioContext` created lazily inside a visitor gesture;
  - master at −18 dB into a `DynamicsCompressor`, with a voice cap;
  - it suspends on `document.hidden`;
  - it stores the preference under the `localStorage` key `playground:sound`, inside `try/catch`;
  - it never sounds without a gesture in the current page load.
- Each landing draws its own switch: neon's grille, orbit's bell, bloom's gem. The semantics are fixed for all three:
  - a `<button aria-pressed>` with the visible text "Sound off / Sound on";
  - reachable on the first screen;
  - **off by default**.
- WebAudio synthesis only, no audio files.

**Discarded alternative:** audio samples. They add weight and licenses.

### D12. Reduced motion
- `src/playground/shared/motion.ts` listens to the media query live.
- Nothing plays by itself. Each toy jumps to its result as an already exposed image: the G8 of neon and orbit, bloom's HOLD. It is the purest "all moments at once", and it has to feel the same in all three.
- In any mode: ≤ 3 flashes per second and no full-field color change faster than 3 Hz.

### D13. Without WebGL2
- `src/playground/shared/probe.ts` tests `getContext('webgl2')` **before** the dynamic `import()` of the three chunk and the `Engine`. Without WebGL2, that chunk is never even downloaded.
- The static HTML already carries fields, typography, index, stills and lab slots.
- The 2D fallbacks are drawn at runtime (Canvas2D or SVG), with the same pure geometry the GL view uses.
- A single honest line per page says the browser has no WebGL2.

**Discarded alternatives:**
- `try/catch` around the `Engine` constructor: it comes too late, because the chunk has already been downloaded.
- Build-time *bakers* (`scripts/bake-orbit-fallback.ts`): another script to maintain and another geometry that drifts.

### D14. Budget and how it is measured
- **JS:** ≤ 350 KB gzip per entry, counting the shared three chunk and the dynamic chunks that boot loads. It is measured on the `vite build` output.
- **First load:** ≤ 2 MB (HTML, CSS, JS, fonts and visible images).
- **Performance:** 60 fps at 1440×900, checked with `engine.stats` and a performance trace.
- Only on-screen views `tick`, and the `Engine` stays at zero frames when nothing moves.
- Each landing work stream measures its entry with a build to a temporary directory outside `dist/` (D19). The official measurement is done by the main work stream on the integrated build, because a heavy import in the shared code changes the number for all three.

### D15. Copy and chrome
- `<title>`: "<Name> · crewtives playground". bloom's em dash is replaced.
- Copy is in English.
- Each footer carries:
  - the "demo build 0.1" stamp;
  - the line "One of three candidate landings · compare at /landings/", which is removed on promotion;
  - the credits: fonts (OFL), three / GSAP / Lenis and the cat's CC-BY line.
- No claim about anything the page's code does not control.
  - orbit's "no tracking" becomes a sentence about what the page does. Since the sound preference (D11) is stored in the browser, the sentence says exactly that: "This page sends nothing. It only remembers your sound setting, in this browser."
  - neon's HI is labeled "this browser only".

### D16. Build order and cut line
- **Per landing, first:** the structure, the hero toy, the index and the footer. That way the index is never missing.
- **Then, the toys in their order:**
  - neon: Rain Run → claw machine → pachinko glass → gas tube;
  - orbit: rockets → tops → key → press → spark wheel;
  - bloom: Scope → Sow → Lathe → Hive.
- A toy that is not finished at publication ships as an honest in-world stand-in: neon's 調整中 cabinet, orbit's empty die-cut socket, bloom's empty glass cell. It is never hidden or faked.
- **Cuts allowed if time runs short, only in bloom:** "Use tilt" (DeviceOrientation) and the full `#g=` codec with the honeycomb edits.

### D17. Contract hygiene
- The direction contract lives only in each landing's surface brief (`.impeccable/surfaces/`). It never goes into the HTML, comments, `data-*` attributes, accessible text, bundles or files served next to the page.
- The FINISH line applies to each landing: final review, verdict, its section in `DESIGN.md` and provenance for every raster that is published.
  - `impeccable embed-prompt --scan` runs over `_shared/stills`.
  - The PNGs the page generates in the browser (neon's sticker, orbit's print proof) carry their provenance in a tEXt chunk written when they are generated.

### D18. The directions are the detailed reference; the critique rules
- The documents in `directions/` stay as they are, in English, and are the detailed design reference for whoever builds: tokens, exact first-screen boxes, physics, copy and motion grammar.
- **Precedence:**
  - where a direction clashes with `critique.md`, the critique wins (§8 and §9);
  - where both clash with this document or with the specs, these win. For example, on the location of the brief (D2) and on file plans with `orbit`, `vite.landings.config.ts`, `public/landings/` or `scripts/*`.
- The specs are the acceptance criteria.
- **Mandatory separation between the three** (critique, §3.7):
  - each one's detented turn has its own physics: neon's jog only scrubs time, orbit's key is a one-way ratchet that stores energy, and bloom's ring spins freely with inertia and only catches detents below 40°/s;
  - the value keys are split: neon dark (≈ half ink on the first screen), orbit mid-key and printed, bloom light and backlit.

**Game Center Yonjigen** (`/landings/game-center/`, `directions/game-center.md`)
- **Thesis:** the playground is a Tokyo arcade building. Each floor is a genre, each toy is a cabinet you really play, and scrolling is the elevator, with its chime on every floor.
- **Color:**
  - each floor is a lit enamel: vermilion on 1F, sodium on 2F, candy on 3F, mint on 4F, carpet violet on 5F and night on the rooftop (RF);
  - bezels in violet-black ink;
  - night only exists inside the CRTs, the glass and on the rooftop;
  - cobalt only appears as part of the control panel;
  - cyan does not exceed 4 % of a frame's pixels.
- **Faces:** Bungee, Bungee Shade for the marquee (≤ 96 px), DotGothic16 for screens and Japanese, M PLUS Rounded 1c for body text.
- **Toys (four):**
  - **Rain Run,** the signature: you fly a taxi between mirrored signs, and at GAME OVER the flight turns sideways into a chronophotograph (TIME VIEW). The ghost replays from recorded poses.
  - **The claw machine** "Win a World": a single layer of capsules with 2D discs and a scripted drop; the prizes are links.
  - **The pachinko glass:** central pocket (*heso*) and tulips, FEVER on every 7th pocket, twin mirrored launchers, a symmetry selector and rewind with the jog.
  - **The gas tube** YONJIGEN: five gases described honestly.
- **Index:** 2F, the second floor. The lab is on 5F, with three 調整中 cabinets. The black hole remains only as the rooftop "moon", a nod to E.

**Wind-Up Empire** (`/landings/wind-up-empire/`, `directions/wind-up-empire.md`)
- **Thesis:** a space empire you wind up by hand, like a set of lithographed tin toys. The economy is fake, labeled as such, and resets on reload.
- **Color:** flat lithography inks, one per face of the box.
  - cobalt lid (it takes the set's cobalt);
  - turquoise tray, which is the index;
  - vermilion side panel, which is the command deck;
  - chrome yellow leaflet;
  - the proof in night cobalt;
  - plus tin, celluloid pink and ink.
- **Composition:** the lid moves from bilateral mirror symmetry to diagonal C2 point symmetry, like box art:
  - the title at −8° at the top left;
  - the orrery toward (800, 520);
  - BUILD at the top right;
  - FLEET at the bottom left.
- **Faces:** Tilt Warp, which leans with the wind; Rampart One; Libre Franklin; Sono for figures.
- **Toys (five):**
  - **The friction rockets,** the signature: pulled back through 12 detents, they fly a real Verlet orbit around the Whirl, leaving stamped exposures;
  - **the planet tops:** they are the five worlds, and each plaque opens its own;
  - **the key:** a ratchet that runs the build queue;
  - **the litho press:** changes the display mode, the exposure memory and the symmetry;
  - **the spark wheel:** you rub it.
- **Index:** second, in the inner tray that appears when the lid is lifted.
- **Keepsake:** a print proof as a PNG. The fallback without WebGL2 is drawn in Canvas2D, and the tray palettes are written in code, with a test that warns if they drift from `src/flavors/*/tokens.css`.

**Bloomscope** (`/landings/bloomscope/`, `directions/bloomscope.md`)
- **Thesis:** a kaleidoscope is a machine that makes the symmetries flowers and honeycombs make on their own. The payoff is the symmetry no mirror can make, the golden angle: "Mirrors only close into a pattern at 180°/n; the golden angle is not one of them."
- **Color:** backlit colored glass, in a high key.
  - chartreuse hero with plum ink and the Vogel print in a darker chartreuse;
  - Sow in lilac, Lathe in glaucous green, Hive in honey, the index in petal and the footer in plum;
  - near-white, neutral paper;
  - cobalt remains only as a glass color inside the kaleidoscope;
  - a single ruby NOW, always with an ink keyline.
- **Faces:** Ultra for headlines (≤ 96 px), Recursive CASL 0 for body text, CASL 1 only on labels and MONO on readouts.
- **Toys (four):**
  - **the Scope,** the signature: you turn or flick the brass ring, and everything in the chamber tumbles, leaving 12 exposures that the mirrors multiply;
  - **Sow:** the golden-angle seeder;
  - **the rosette lathe:** echeveria and aloe in a spiral, with a drop running down the spine of each leaf;
  - **Hive:** hexagonal Life B2/S34 with its stack of generations.
- **Index:** "Load another wheel", in section 2. The peepholes keep the round trip between the bench and the Scope in view. The gems are flat SVG facets, with no `backdrop-filter` or blur, and the eyepiece and peepholes are circular thanks to D5.

### D19. Parallel build on the same tree
First one work stream sets up the shared base and it gets verified. Then three work streams run at once, one per landing, each only on its own files.

| Front | Owner | Files |
|---|---|---|
| **Shared base** | one work stream, first | `vite.playground.config.ts`; `package.json` scripts; `tsconfig.json`; `src/core/display/RetroDisplay.ts`, `display.frag.glsl` and `src/core/shell/smoothScroll.ts`, with their tests; `src/playground/shared/**`; `playground/public/landings/_shared/**`; `playground/landings/index.html`; each landing's skeleton (HTML, `main.ts`, `tokens.css`, `tsconfig.json`), which then passes to its landing work stream |
| **Game Center** | landing work stream | `playground/landings/game-center/**`, `src/playground/game-center/**`, `.impeccable/surfaces/playground-landings-game-center-index-html.md`, `.impeccable/review/game-center-*` |
| **Wind-Up Empire** | landing work stream | the same with `wind-up-empire` |
| **Bloomscope** | landing work stream | the same with `bloomscope` |
| **Integration** | main work stream | `LICENSES.md`, `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json` (through the documenter), `tasks.md`, adding `public/launcher/{a,b,c}-*.png` to git, commits and deploy |

**Rules:**
- **Frozen base.** Once the base is verified, `src/core/**`, `src/playground/shared/**` and the configuration files are frozen. If a landing work stream needs a change there, it requests it with its reason and the main work stream applies it once for all three.
- **No git.** The landing work streams do not run git commands that write (`add`, `commit`, `stash`, `checkout`, `reset`, `restore`, `clean`): the tree is shared and any of those commands tramples someone else's work. Only the main work stream commits.
- **Isolated verification.**
  - Each landing has `src/playground/<slug>/tsconfig.json`, which extends the root one and only narrows `include` to its folder. `npx tsc --noEmit -p src/playground/<slug>` checks the landing plus what it imports from `shared` and `core`, without the half-finished errors of the other two. Since it extends the root one, Vite and the editor see the same options.
  - Tests run with `npx vitest run src/playground/<slug>`.
  - Nobody runs `npm run build` over `dist/` or `deploy`. To measure the budget, each landing work stream builds to a temporary directory outside `dist/`.
- **Own ports.** `npm run dev:playground -- --port <p> --strictPort`, with a fixed port per landing (game-center, wind-up-empire and bloomscope), separate from the one 4D.OS keeps using. `--strictPort` makes a collision fail loudly, instead of moving the server to another port and having one work stream capture another's page. `VITE_NO_HMR=1` gives a stable server for captures.
- **Handoff.** In its final report each landing work stream hands over the `LICENSES.md` rows for its fonts, the PNGs it generates and any request to the base.

**Discarded alternatives:**
- Per-landing *worktrees*: three `node_modules`, three copies of the base that have to be kept identical, and a merge at the end. Disjoint ownership already prevents collisions.
- Building in series: it triples the time without reducing risk, because the files do not overlap.

### D20. `/impeccable` process per landing
1. **Surface brief** in `.impeccable/surfaces/playground-landings-<slug>-index-html.md`, with the frontmatter of the existing briefs.
   - It carries the direction contract: THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM, FINISH, the signature interaction and the motion grammar. It comes from the direction with the critique's adjustments already applied.
   - It records how it was decided: the *new-work* process, the delegation of design decisions on 2026-09-25 and the *code-led* mode.
   - The playground's brand commitments go to `PRODUCT.md`, and the main work stream writes them.
2. ***Code-led* build.** There are no comps: the ambition lives in the FIRST VIEWPORT block (exact boxes at 1440×900 and 390×844), in the signature interaction and in the motion grammar. `craft-floor.md` is read before touching the interface.
3. **Two inspection rounds** by the landing work stream. The captures go to `.impeccable/review/<slug>-desktop.png` and `<slug>-mobile.png`.
4. **Detector, once:** `impeccable detect --json` over the landing's HTML and CSS. The landing work stream fixes the mechanical issues and passes the rest to the reviewer.
5. **Final review.** The orchestration launches `impeccable-finish-reviewer` fresh, never inside the build thread. It passes it:
   - the request;
   - the brief's contract;
   - the page's route;
   - the captures;
   - the detector's findings;
   - the path to `craft-floor.md`.

   There is no approved comp.
6. **Disposition.**
   - `ship`: move on to the next step.
   - `fix`: the same work stream, with the same file ownership, applies the fixes in one batch, recaptures, and the same reviewer gives a verdict. The cap is two unsupervised rounds.
   - `recapture` or `rebuild`: as the process prescribes.
7. **Provenance.** `embed-prompt --scan` over the raster directories (D17).
8. **Set review** (critique, §10.6). When all three have a verdict, a fresh reviewer looks at the three first screens side by side, at 1440 and at 390, with each one's memory sentence.
   - If two get confused as thumbnails, it is a palette finding.
   - That is also where neon's sodium is compared with orbit's chrome (§3.9).
9. **Documentation.** `impeccable-documenter` runs only once for all three, with its write boundary on `DESIGN.md` and `.impeccable/design.json`.
   - It adds a section with tokens per world, without rewriting the 4D.OS ones.
   - The output is checked to carry tokens and not just prose.

**Discarded alternative:** one documenter per landing. That would be three work streams writing the same `DESIGN.md`.

### D21. Preview deploy
- `deploy:preview` = `rm -rf dist && npm run build && cp cloudflare/_redirects cloudflare/.assetsignore dist/ && wrangler versions upload --preview-alias landings`.
- `versions upload` uploads a new version of the `crewtives-playground` Worker, with all of `dist/` (4D.OS and landings), **without deploying it**: `playground.crewtives.com` keeps serving the current version.
- With `workers_dev: true`, the version gets its own preview URL. The alias gives a stable preview URL that survives new uploads.
- `_redirects` does not change: in the preview, `/` still goes to `/4d-os/`. The entry point for review is `/landings/`.
- **Verification on the preview URL:**
  - `/landings/` and the three routes;
  - `/4d-os/` and `/4d-os/a–e/` unchanged;
  - the index links resolve;
  - there is no `/packs/` at the root.
- Only the main work stream runs it, after integrating.

**Discarded alternatives:**
- Deploying to production under `/landings/` without linking it: the proposal requires production to stay intact.
- A separate Worker or environment: it changes `wrangler.jsonc` and stops testing the real Worker.

## Risks / Trade-offs

- **[Volume: three ambitious builds at once; neon is still the largest]** → The order of D16 applies. The in-world stand-ins keep each landing publishable and honest at any cut-off point.
- **[The core changes (mask, `resetToTop`) touch shared code]** → They are additive and off by default, with tests, and `/4d-os/a–e/` are loaded after the change. A single owner makes them, before the landings.
- **[A misconfigured `publicDir` copies 230 MB of packs to the root of `dist/`]** → It is the worst possible error in the base. The build check of D3 fails if `dist/packs` exists, and the preview deploy checks it again.
- **[Touch conflicts on canvases: rocket, key and ring]** → `touch-action: none` only on small zones and `pan-y` everywhere else. A pass on a real phone is needed; in the meantime, emulation.
- **[Legibility: Tilt Warp at the extremes of XROT/YROT, Rampart One below 16 px, neon's Japanese]** → The caps are already in the directions, and the Japanese comes from a fixed glossary. It still deserves a native reader (Open Questions).
- **[The set looks alike: three light, saturated pages with a live dithered hero]** → The set review of D20 puts them side by side at 1440 and 390. If two read the same as thumbnails, the palette fix was not enough and it is reopened.
- **[Two work streams edit the same file]** → Each file has one owner (D19). The base is frozen, and the shared files (`LICENSES.md`, `PRODUCT.md`, `DESIGN.md`) are integrated only by the main work stream.
- **[One work stream's git command wipes another's uncommitted work]** → The landing work streams do not run git commands that write. Only the main work stream commits.
- **[The repo's typecheck or tests fail because of another landing's half-finished code]** → Each landing work stream uses its own `tsconfig` and the vitest filter for its folder. Only the main work stream runs the full build, when integrating.
- **[One work stream captures or tests another's server]** → Each one has its own port with `--strictPort`, and the captures carry the slug in their name.
- **[Simultaneous builds write to the same `dist/`]** → The landing work streams build to temporary directories. `dist/` belongs only to the main work stream.
- **[A work stream reimplements something shared its own way, like the sound switch or the index]** → The `shared/` modules are the only source. The index checker (D10) runs in each landing's test, and the sound semantics are fixed (D11).
- **[A heavy import in `shared/` inflates the budget of all three]** → The official measurement is per entry, on the integrated build (D14).
- **[A production build after the merge publishes `/landings/` before the choice]** → Until the choice, `npm run deploy` is not run; the only upload is `deploy:preview`. If it happens anyway, the pages are not linked and each one declares itself a candidate in its footer.
- **[The preview URL does not appear if the account has preview URLs turned off]** → Wrangler reports it on upload. It is enabled from the Cloudflare dashboard, without touching `wrangler.jsonc`, and the upload is repeated.
- **[The preview URL is public to anyone with the link]** → The content is the same that would be published, there is nothing private, and the version is not the production one.

## Migration Plan

1. **Shared base** (branch `feat/playground-landings`).
   - What it includes: additive core changes with their tests, `shared/`, the configuration and the skeletons.
   - Verification: `npm test`, `npm run build`, that `dist/packs` does not exist, and `/4d-os/`, `/4d-os/a–e/` identical, served by a local `wrangler dev` server over `dist/`.
2. **Three landings in parallel** (D19), each up to its verdict (D20).
3. **Integration.**
   - `LICENSES.md` rows (fonts, and stills from A to E), `PRODUCT.md`, the set review and the documenter.
   - `npm run build`, the tests and the per-entry budget.
4. **Preview.** `npm run deploy:preview`, and the preview URL at `/landings/` is shared for review. Any requested adjustments are uploaded again to the same alias.
5. **Choice.** One landing is chosen.
6. **Promotion** (after the choice; it is a small change):
   - the chosen landing's HTML moves to `playground/index.html`, which builds to `dist/index.html`;
   - in `cloudflare/_redirects`, `/ /4d-os/ 302` is removed and `/landings/<slug>/ / 301` is added;
   - the candidate line is removed from the footer;
   - deep links keep working, because they are anchors on the same page;
   - `npm run deploy`.
7. **Rollback.**
   - **During the preview:** there is nothing to revert in production. A bad version is not deployed, and another one is uploaded to the same alias.
   - **After the promotion:** `wrangler rollback` instantly returns to the previous version, the one with the 302. Then the promotion commit is reverted.
   - **4D.OS regression attributable to the core:** `wrangler rollback`, and the fix goes into the core. The options are additive, so the fix does not touch the 4D.OS pages.

## Open Questions

- What happens to the two landings not chosen and to `/landings/` after the promotion: whether they are archived at their route or deleted. Nothing in this change depends on it.
- The Wind-Up Empire leaflet field: chrome yellow or orange `#FF7A1A`. It is decided in the set review (critique, §3.9) and is a one-token change.
- The pass on a real phone (touch conflicts) and the native reading of neon's Japanese wait until a device and a reader are available. In the meantime, verification uses Chromium emulation and the fixed glossary.
