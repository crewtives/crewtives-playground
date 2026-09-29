# Architecture

This repository holds two static websites that share one rendering engine. Both are built with Vite
and published together as a single Cloudflare Worker that only serves files:

- **4D.OS** (`/4d-os/`): a launcher and five *worlds*, each a different way of showing a 4D scene,
  meaning a 3D scene that also has time.
- **The playground** (`/`): the museum, which exhibits the works, plus Bloomscope and two other
  landings.

There is no server code and no runtime API. Everything a page shows is either computed in the
browser or read from files produced at build time or checked into the repository.

This page covers the layout, the import rules between layers, how each page is built and served,
and a suggested order for reading the code. The other guides go deeper:
[`engine.md`](engine.md) covers the 4D pack, the viewer and the retro display,
[`museum.md`](museum.md) covers the museum and its loops, and [`glossary.md`](glossary.md) defines the
project's vocabulary. [`openspec-workflow.md`](openspec-workflow.md) explains how the project was
specified.

## Layout

```
sites/4d-os/        Vite site 1: HTML entry pages, public/ (4D packs, launcher images), vite.config.ts
sites/playground/   Vite site 2: HTML entry pages, public/ (museum loops, stills), vite.config.ts
src/engine/         the engine shared by both sites
src/pipeline/       scene equations (scenes/), the development-only baker (bake/) and its inputs
src/4d-os/          4D.OS code: launcher/, worlds/a … e/, debug/
src/playground/     playground code: museum/, bloomscope/, game-center/, wind-up-empire/, shared/
tools/              development tools: capture-loops.ts, vite/ (Vite plugins used by the site configs)
deploy/             wrangler.jsonc, _redirects, .assetsignore
docs/               these guides; design/ holds DESIGN.md and PRODUCT.md
openspec/           specifications and the archived changes that built the project
vitest.config.ts    test configuration for the whole repository
```

HTML lives under `sites/`, and code lives under `src/`. The two are split this way so that each site
folder holds only what gets published: pages and public files. Code is grouped by layer instead
of by site, so the shared parts (engine, pipeline) are easy to find.

## Routes and redirects

| Public URL | Page | HTML entry | Code entry |
|---|---|---|---|
| `/` | Museum | `sites/playground/index.html` | `src/playground/museum/main.ts` |
| `/bloomscope/` | Bloomscope (work 004) | `sites/playground/bloomscope/index.html` | `src/playground/bloomscope/main.ts` |
| `/landings/game-center/` | Game Center Yonjigen | `sites/playground/landings/game-center/index.html` | `src/playground/game-center/main.ts` |
| `/landings/wind-up-empire/` | Wind-Up Empire | `sites/playground/landings/wind-up-empire/index.html` | `src/playground/wind-up-empire/main.ts` |
| `/4d-os/` | 4D.OS launcher | `sites/4d-os/index.html` | `src/4d-os/launcher/main.ts` |
| `/4d-os/a/` … `/4d-os/e/` | Worlds A to E | `sites/4d-os/<letter>/index.html` | `src/4d-os/worlds/<letter>/main.ts` |

Each HTML file sits at the same position relative to its Vite root as its public URL. That rule is
what keeps URLs stable when files move, and many things depend on those URLs: the loop provenance,
the `WORLDS` registry in `src/playground/shared/worlds.ts`, the tests and the redirects.

`deploy/_redirects` holds two permanent (301) redirects, left over from earlier layouts of the site:

- `/landings` and `/landings/` go to `/`. There used to be a page there comparing candidate front
  pages; the museum replaced it.
- `/landings/bloomscope` and `/landings/bloomscope/` go to `/bloomscope/`. The browser keeps the
  `#g=…` fragment, so old links to a Bloomscope garden still work.

Two pages exist only in development and are never built: `sites/4d-os/bake.html` (the baker, see
[Tools](#tools)) and `sites/4d-os/debug.html` (the bare engine with a minimal UI, for checks; it takes
`?pack=<url>` and `?world=a…e` to load a world's palettes). Vite's development server serves them
because they exist on disk, but they are not listed as build inputs. These guides call them
`/bake.html` and `/debug.html`. The short forms `/bake` and `/debug`, which the archived changes use,
open the same pages, because the development server answers a path without an extension with the
`.html` file of that name when one exists.

## The two sites

### `sites/4d-os/`

- **Entries:** `sites/4d-os/index.html` (launcher) and `sites/4d-os/a/index.html` to
  `sites/4d-os/e/index.html` (worlds). Each page loads its code with a relative
  `<script type="module">` path into `src/4d-os/`.
- **Public files:** `sites/4d-os/public/packs/` holds the three 4D packs that pages fetch at run time
  (`cat-stairs`, `falcon-phi` and `whale-fall`, about 157 MiB in all), and `sites/4d-os/public/launcher/`
  holds the launcher images. Both are copied as they are into `dist/4d-os/`.
- **Config:** `sites/4d-os/vite.config.ts` sets the site folder as the Vite root and `base` to
  `/4d-os/` for the build (`/` in development). It writes to `dist/4d-os/`, which it empties first,
  and adds the `pack-saver` plugin so the baker can write packs in development.

Pages build their pack URLs from `import.meta.env.BASE_URL`, so the same code fetches `/packs/…` in
development and `/4d-os/packs/…` once published.

### `sites/playground/`

- **Entries:** `sites/playground/index.html` (museum), `sites/playground/bloomscope/index.html` and
  `sites/playground/landings/<slug>/index.html`. The museum's `index.html` is a template: at build
  time the museum plugin replaces its `<!--museum:body-->` marker with the static HTML of every sheet.
- **Public files:** `sites/playground/public/loops/` holds the museum loops (passes, poster and
  provenance, one folder per loop), and `sites/playground/public/landings/_shared/stills/` holds the
  stills of the five worlds used by the landings. They are copied into `dist/`.
- **Config:** `sites/playground/vite.config.ts` sets the site folder as the Vite root and `base` to
  `/`. It writes to `dist/` *without* emptying it, since `dist/4d-os/` belongs to the other build. It
  sets `publicDir` explicitly, so the 4D packs can never be copied here, and puts every hashed asset
  (JavaScript, CSS, fonts) in `dist/_playground/`, apart from 4D.OS's own `dist/4d-os/assets/`. It
  adds the museum plugin and two build guards (see [Build guards](#build-guards)).

Two environment variables are useful when working on one page:

- `PLAYGROUND_ONLY=<page>` builds only that page (`museum`, `bloomscope`, `game-center` or
  `wind-up-empire`), to measure its size without the others.
- `PLAYGROUND_OUT=<folder>` writes the output to another folder, so a test build does not touch
  `dist/`.

## Source layers and import rules

| Layer | What it holds | May import |
|---|---|---|
| `src/engine/` | Pack format and loader, render loop, retro display, time, viewer, windows, desktop shell and camera helpers | Only itself and npm packages |
| `src/pipeline/scenes/` | Pure equations of the computed scenes (falcon, whale, black-hole sky) and the seeded random generator | Only itself |
| `src/pipeline/bake/` | The development-only baker and its recipes | `src/engine/`, `src/pipeline/scenes/` |
| `src/pipeline/models/`, `src/pipeline/captures/` | Bake inputs (3D models) and the source screenshots of the stills | Data only |
| `src/4d-os/` | Launcher, worlds A–E, debug page | `src/engine/`, `src/pipeline/scenes/` |
| `src/playground/` | Museum, Bloomscope, Game Center Yonjigen, Wind-Up Empire, shared modules | `src/engine/`, `src/pipeline/scenes/` |

The rules:

- **The engine imports nothing outside itself.** Anything that knows about a particular world, work
  or page lives in that page's folder.
- **The pipeline does not import site code.** The scene equations are pure TypeScript (no DOM, no
  three.js), so the baker, worlds D and E, and the museum's captions all read the same numbers. Only
  `sites/4d-os/bake.html` loads the baker, so no published page ships baker code.
- **4D.OS and the playground never import each other.** They share only `src/engine/` and
  `src/pipeline/scenes/`.

No test enforces these rules. Each of these checks should print nothing:

```sh
grep -rnE "['\"](\.\./)+(4d-os|playground|pipeline)/" src/engine
grep -rnE "['\"](\.\./)+(4d-os|playground)/" src/pipeline
grep -rnE "['\"](\.\./)+bake/" src/pipeline/scenes
grep -rnE "['\"](\.\./)+playground/" src/4d-os
grep -rnE "['\"](\.\./)+4d-os/" src/playground
```

Inside the engine, the render loop (`src/engine/engine/`), the pack format (`src/engine/pack/`), time
(`src/engine/time/`) and windows (`src/engine/window/`) depend on nothing else. The display
(`src/engine/display/`) builds on the render loop; the decorative views (`src/engine/views/`) on the
display; the viewer (`src/engine/viewer/`) on the display, the pack and time; and the shell
(`src/engine/shell/`: desktop chrome, cameras, scroll) on the render loop, the display, the pack, time
and the viewer. Windows and the decorative views stay outside the shell: the code that uses them
imports them directly.

Inside the playground, the museum imports a few Bloomscope modules (the garden link, Sow's seed
function), because Bloomscope is a work in its collection. The landings never import one another.
Every playground page uses `src/playground/shared/` (the world registry, sound, reduced motion, the
WebGL2 probe); the three landings also use the display registry.

**Where the two sites do meet.** The museum's build step reads 4D.OS files by path, not by import: the
packs in `sites/4d-os/public/packs/` (for frame counts, weights and trails) and each world's
`tokens.css` (for the passe-partout colors). The sources of each work, listed in
`src/playground/museum/collection.ts`, also name 4D.OS files: the world pages and code of works A–E,
and, for every sheet, the engine and the 4D.OS launcher that `CORE` adds, so that editing them marks
the loops as stale. Wind-Up Empire keeps a hand-written copy of the five world palettes in
`worldInks.ts`, and `stage2.test.ts` checks it against those `tokens.css` files. All other links
between the sites are ordinary URLs.

**Imports are relative.** There are no path aliases. Some of this code (the museum plugin, the pack
saver) is loaded by the Vite config itself, where aliases would need extra tooling, and
`tsc --noEmit` catches any broken path after a move.

## How a page is built

`npm run build` runs three steps in order:

1. `tsc --noEmit` typechecks `src/`, `tools/`, both site configs and `vitest.config.ts`.
2. `vite build -c sites/4d-os/vite.config.ts` empties `dist/4d-os/` and builds the launcher and the
   five worlds into it.
3. `vite build -c sites/playground/vite.config.ts` builds the museum, Bloomscope and the two landings
   around it, into `dist/`.

The order is safe because the 4D.OS build empties only its own folder and the playground build
empties nothing. Because nothing ever empties `dist/` as a whole, files left over from an older
playground build can stay there; the deploy scripts run `rm -rf dist` first for that reason.

The output:

```
dist/
├── index.html               museum, with the static HTML of every sheet
├── bloomscope/index.html
├── landings/
│   ├── game-center/index.html
│   ├── wind-up-empire/index.html
│   └── _shared/stills/      from sites/playground/public/
├── loops/<id>/              from sites/playground/public/
├── museum/fold-*.svg        axonometries emitted by the museum plugin
├── _playground/             playground JavaScript, CSS and fonts (hashed names)
├── 4d-os/
│   ├── index.html           launcher
│   ├── a/ … e/index.html    worlds
│   ├── assets/              4D.OS JavaScript, CSS and fonts (hashed names)
│   ├── packs/               from sites/4d-os/public/
│   └── launcher/            from sites/4d-os/public/
├── _redirects               copied from deploy/ by the deploy scripts
└── .assetsignore            copied from deploy/ by the deploy scripts
```

Within each build, Rolldown (Vite's bundler) shares chunks between pages: three.js, for example, is one chunk for all
the 4D.OS pages and another for all the playground pages. Fonts are self-hosted `.woff2` files that
sit next to the code that uses them (`src/**/fonts/`), with their license texts, and are bundled like
any other asset.

### The museum at build time

The museum is the only page generated at build time. `museumPlugin`
(`src/playground/museum/build/plugin.ts`) runs `buildManifest`
(`src/playground/museum/build/manifest.ts`) when the build starts. The manifest reads:

- the hand-curated collection (`src/playground/museum/collection.ts`);
- each pack's `scene.json` and `dynamic.bin`, for the figures and the trail;
- each loop's `provenance.json`, which it validates;
- the tokens that color each passe-partout;
- the files under each work's `sources`, which it hashes to decide whether a loop is stale.

`src/playground/museum/build/render.ts` turns the manifest into static HTML and CSS, which the plugin
injects into the template. The plugin also serves the data the page's JavaScript needs as the virtual
module `virtual:museum` (typed in `src/playground/museum/virtual.d.ts`) and emits the fold SVGs. The build
never runs `git`, so it gives the same page from a full clone, a shallow clone or an archive
download. [`museum.md`](museum.md) explains the sheets, the loops and their provenance.

### Build guards

A build that silently drops a page or copies files to the wrong place is worse than a build that
fails, so both configs check their work:

- **A missing entry fails the build.** Each config checks every HTML entry it lists and throws
  `missing entry page <path>` if one does not exist. An unknown `PLAYGROUND_ONLY` value fails too.
- **No packs at the output root.** `noPacksAtRoot` fails the playground build if `<outDir>/packs`
  exists, which would mean the 4D packs were copied from `sites/4d-os/public/` by mistake.
- **The playground build never writes inside `dist/4d-os/`.** `no4dosWrites` records the size,
  modification time, change time and inode of every file there when the build starts and compares
  them when it ends. A new, deleted or rewritten file fails the build and is named. Both guards
  check the resolved output folder, so they also hold with `--outDir`.
- **Invalid museum data fails the build.** An invalid provenance, loops of one sheet that disagree on
  their source frames, a Bloomscope loop recorded at a different angle from the fixed garden, a
  missing token or a missing source path all throw, with a message that names the sheet or loop.
  A loop that is *stale* or not recorded yet is different: the build only warns, with a message
  prefixed with `[museum]`, and the sheet itself says so. Working on a work never blocks the build.

## Deployment

`deploy/wrangler.jsonc` describes an assets-only Worker: no script, just `dist/` (the `assets`
directory is `../dist`, relative to the config file) served on a custom domain. Cloudflare applies
`_redirects` when it serves the site, and wrangler leaves out the paths listed in `.assetsignore`
when it uploads. Those paths are two packs that no page uses; the baker can recreate them locally,
and git ignores them.

- `npm run deploy` runs `rm -rf dist`, builds, copies `deploy/_redirects` and `deploy/.assetsignore`
  into `dist/`, and deploys with `wrangler deploy -c deploy/wrangler.jsonc`.
- `npm run deploy:preview` does the same but uploads a new version with a preview alias instead of
  deploying it.

To deploy your own copy, change `name` and `routes` in `deploy/wrangler.jsonc`; the
[README](../README.md) walks through it. Cloudflare limits each static asset to 25 MiB. The largest
file today, `sites/4d-os/public/packs/whale-fall/dynamic.bin`, is about 23.6 MiB, so a larger pack
would have to be split.

## Development servers

| | `npm run dev` | `npm run dev:playground` | Built site + `wrangler dev` |
|---|---|---|---|
| Config | `sites/4d-os/vite.config.ts` | `sites/playground/vite.config.ts` | `deploy/wrangler.jsonc` |
| Serves | Launcher at `/`, worlds at `/a/` … `/e/`, plus `/bake.html` and `/debug.html` | Museum at `/`, `/bloomscope/`, `/landings/<slug>/` | Everything, at the public URLs, with the redirects |
| Does not serve | The playground | 4D.OS (`/4d-os/…` links lead nowhere) | The development-only pages |
| Specific to it | The pack-saver endpoint for the baker | The museum manifest is rebuilt when a loop or `collection.ts` changes, and the page reloads | The same files that get deployed |

Things that differ from the published site:

- **4D.OS runs at `/` in development**, not at `/4d-os/`. Its "← Playground" link points to `/`, which
  in development is the launcher itself.
- **HTML pages load code from outside their site folder.** A page's relative script path into
  `src/` (such as `../../src/4d-os/launcher/main.ts`) becomes `/src/…` in the browser, which does not
  exist under the site root. The `repoSrcInDev` plugin (`tools/vite/repo-src-in-dev.ts`) rewrites
  those requests to the repository's `src/`, and `server.fs.allow` lets Vite serve files from there.
  The build resolves the same paths on its own.
- **`VITE_NO_HMR=1`** turns off hot reloading and file watching in either dev server. It keeps a page
  stable while you inspect it and other files change.

To see the whole site as it will be deployed, including links between the two sites and the
redirects:

```sh
rm -rf dist && npm run build && cp deploy/_redirects deploy/.assetsignore dist/
npx wrangler dev -c deploy/wrangler.jsonc
```

The loop recorder needs this server too, at the address of its default `--base` option: start
Wrangler with the `--port` and `--ip` flags given in the header comment of `tools/capture-loops.ts`,
or pass the recorder `--base` with the URL that Wrangler prints (see [museum.md](museum.md#recording-loops)).

## Tests and typechecking

- `npm test` runs Vitest with `vitest.config.ts` at the repository root. It includes
  `src/**/*.test.ts` and runs in Node. The test config is kept separate from the two site configs, so
  tests never load the site plugins.
- Tests sit next to the modules they test. Most are pure unit tests. About fifteen also read files
  from the repository by path: the HTML pages under `sites/`, the world tokens, the packs, the
  published loops and `LICENSES.md`. Moving or renaming any of those files means updating those
  tests.
- Some tests exist to keep the published pages honest. For example,
  `src/playground/museum/loops/published.test.ts` fails if no loop is found instead of skipping, and
  `src/playground/museum/collection.test.ts` checks that every path in the collection exists.
- `npm run typecheck` (`tsc --noEmit`) uses the single `tsconfig.json`, which covers `src/`, `tools/`,
  both site configs and the test config. It is also the first step of `npm run build`.

## Tools

- **`tools/capture-loops.ts`** records the museum loops from the built site running under
  `wrangler dev`. It drives Chromium through Playwright with a controlled clock and writes the passes,
  the poster, the poster's `poster.webp.json` sidecar and `provenance.json` into
  `sites/playground/public/loops/<id>/`. It records the sources hash of the work and the commit it
  was recorded at. It refuses to record if the work's sources have uncommitted changes or files that
  git does not track, because then the commit would not describe what was recorded.
  Playwright and tsx are pinned in the tool and run through `npx`, so they are not project
  dependencies. The usage and options are in the file's header comment, and
  [`museum.md`](museum.md) describes the recording.
- **`tools/vite/pack-saver.ts`** adds a development-only endpoint, `POST /__pack/save`, that the baker
  (`/bake.html`) uses to write a pack into `sites/4d-os/public/packs/<name>/`. It accepts only simple
  pack and file names inside that folder.
- **`tools/vite/repo-src-in-dev.ts`** is the development rewrite of `/src/…` requests described
  above, used by both site configs.

The baker itself lives in `src/pipeline/bake/`. It runs in the browser at `/bake.html?scene=<recipe>`
under `npm run dev`. The recipes are listed in `src/pipeline/bake/recipes/index.ts`. Baking is
deterministic on the same browser and GPU, so rebaking a recipe there with the same parameters writes
the same bytes. The point layers are pure CPU math, but the source pages are GPU renders encoded as
PNG by the browser, so another machine can produce different PNG bytes.

## Decision references in comments

Comments often cite a design decision, such as "(D4)", or a spec requirement by name, such as
"work-loops, 'Stale loop warning'". Specs live in `openspec/specs/<capability>/spec.md`. Each archived
change numbers its own decisions, so a "D4" means the D4 of the change that shaped that module:

| Area | Change |
|---|---|
| The engine's core (pack, time, viewer, display, windows, desktop), worlds A–C, `/bake.html`, `/debug.html` | [`2026-09-24-add-4d-os-local-demo`](../openspec/changes/archive/2026-09-24-add-4d-os-local-demo/design.md) |
| The playground build, the landings, `src/playground/shared/` | [`2026-09-25-add-playground-landings`](../openspec/changes/archive/2026-09-25-add-playground-landings/design.md) |
| Hero gesture, pinch, chase camera, stable points, cat motion, `src/pipeline/scenes/`, worlds D and E | [`2026-09-28-add-cosmic-landings-and-organic-motion`](../openspec/changes/archive/2026-09-28-add-cosmic-landings-and-organic-motion/design.md) |
| The museum, its loops, `tools/capture-loops.ts` | [`2026-09-28-add-playground-museum`](../openspec/changes/archive/2026-09-28-add-playground-museum/design.md) |

A module that several changes touched can cite decisions from more than one of them; the title of the
decision usually settles which. The paths inside archived changes describe the repository as it was
when each change was made; [`openspec-workflow.md`](openspec-workflow.md) explains how to read them.

## Suggested reading order

Each step builds on the ones before it.

1. **The 4D pack.** `src/engine/pack/format.ts`: its header comment is the binary layout. Then
   `loader.ts` (validation and real load progress) and `writer.ts`.
2. **One canvas per page.** `src/engine/engine/Engine.ts`: a single WebGL renderer paints every view
   into the rectangle of a DOM element, and only renders when something asks it to.
3. **The retro display.** `src/engine/display/RetroDisplay.ts` and `display.frag.glsl`: a low-resolution
   render, quantized to a palette read from CSS tokens, with an 8×8 ordered dither.
4. **Time.** `src/engine/time/TimeController.ts`: the single NOW, FORWARD, REWIND and HOLD, and the
   two time modes.
5. **The viewer.** `src/engine/viewer/TimeViewer.ts`, with `packGpu.ts` and the shaders next to it: the
   present, the trail, the source camera's frustum and the camera controls.
6. **The desktop.** `src/engine/shell/desktop.ts`: how a page binds the timeline, the keyboard and
   the live readouts to one `TimeController`. The draggable windows are separate
   (`src/engine/window/windows.ts`), and worlds A, B and C bind them themselves.
7. **A world.** `src/4d-os/launcher/main.ts` (one pack, one time, three displays), then
   `src/4d-os/worlds/a/main.ts`, alongside `sites/4d-os/a/index.html`.
8. **Where a scene comes from.** `src/pipeline/scenes/falconPhi.ts` (the falcon's equations), then the
   recipe that bakes it, `src/pipeline/bake/recipes/falconPhi.ts` with `falconPhiBody.ts` and
   `falconPhiCity.ts`, and the shared baker in `src/pipeline/bake/SyntheticScene.ts`.
9. **The museum build.** `sites/playground/vite.config.ts`, then
   `src/playground/museum/build/plugin.ts`, `manifest.ts` and `render.ts`, and the collection they
   read, `src/playground/museum/collection.ts`.
10. **Loops and provenance.** `src/playground/museum/loops/format.ts` (the 4DLP file),
    `provenance.ts`, `src/playground/museum/build/sources.ts` (the sources hash) and
    `tools/capture-loops.ts`.
11. **A pattern worth copying.** Most Game Center machines (crane, rainrun, parlour) split their
    simulation, their drawing, their DOM and their startup into separate files: see `src/playground/game-center/crane/` (`sim.ts`,
    `view.ts`, `machine.ts`, `boot.ts`). The simulation runs without a renderer, so tests can drive it.
