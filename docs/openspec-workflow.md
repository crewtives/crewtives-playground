# The OpenSpec workflow

The features in this repository were specified before they were built, using [OpenSpec](https://github.com/Fission-AI/OpenSpec). The specs, proposals, designs, task lists and verification records are kept in `openspec/`. You can read them to see why the code has the shape it has, which alternatives were rejected, and how each result was measured.

This page explains what OpenSpec is, how this repository is organized around it, and how to read the record it left. For the terms used in the specs (sheet, épure, VISTA, NOW and others), see the [glossary](glossary.md).

## What OpenSpec is

OpenSpec is a lightweight framework for spec-driven development, released under the MIT license. It is a command-line tool plus a set of instructions for an AI coding agent. It keeps two things apart:

- **Living specs** (`openspec/specs/<capability>/spec.md`) describe what the system does *now*. Each spec has a Purpose and a list of requirements. Each requirement uses SHALL/MUST and comes with scenarios written as WHEN/THEN.
- **Changes** (`openspec/changes/<change-name>/`) describe what is about to change and why. A change holds a proposal, a design, *delta* specs (the requirements it adds, modifies or removes) and a task list. When a change is done, its deltas are merged into the living specs and the change is archived with a date prefix.

In short, the living specs say what is true today, and the archive says how the project got there.

This repository uses the default `spec-driven` schema. The CLI is not a dependency of the package. To run it, install it globally:

```sh
npm install -g @fission-ai/openspec@1.13.1   # the version that generated .claude/
openspec list                        # active changes
openspec list --specs                # living capabilities and their requirement counts
openspec show work-loops             # print one living spec
openspec validate --specs --strict   # check every living spec
openspec view                        # an interactive dashboard
```

## Layout of `openspec/`

```
openspec/
  config.yaml                      project context and rules, read by every workflow
  specs/<capability>/spec.md       one living spec per capability
  changes/<change-name>/           changes in progress
  changes/archive/YYYY-MM-DD-<change-name>/   finished changes, prefixed with their archive date
```

## `openspec/config.yaml`

The [config](../openspec/config.yaml) has three parts:

- **`schema: spec-driven`** is the default workflow. It has four artifacts: proposal, specs, design and tasks.
- **`context`** is free text that OpenSpec adds to the instructions for every new artifact (`openspec instructions <artifact>` prints it). This repository uses it for:
  - the language: US English, with OpenSpec's structural headings and SHALL/MUST kept as they are;
  - the writing rules of a public repository: state requirements and decisions with their rationale, never who asked for them; call the person using a page "the visitor"; include no machine-local details; reference code by repo-relative path and decisions as `<change-name> Dn`;
  - the stack: Vite, strict vanilla TypeScript, three.js (WebGL2), GSAP and Lenis on the story pages, Vitest, and an assets-only Cloudflare Worker;
  - the licensing rule for third-party assets: every typeface and model has a row in [`LICENSES.md`](../LICENSES.md), and CC-BY credits are shown on the page that uses the asset.
- **`rules`** are per-artifact checks that OpenSpec adds to that artifact's instructions:
  - *tasks*: each task states a verifiable outcome and the command or check that proves it;
  - *design*: each decision records the main alternative considered and why it was rejected.

The English context and both rules were added by `prepare-public-release` (D8). The four earlier changes were first written in Spanish under a shorter context, then translated and sanitized for the release. Their main decisions record alternatives, but not every decision does.

## The living specs

The first four changes introduced the 15 capabilities below. The last column names the change that introduced each one; later changes may have modified it.

| Capability | What it specifies | Introduced by |
|---|---|---|
| [`4d-pack`](../openspec/specs/4d-pack/spec.md) | The 4D pack format (scene metadata, static layer, per-frame subject, cameras, source frames), how it loads, and optional point correspondence between frames. | `add-4d-os-local-demo` |
| [`synthetic-bake`](../openspec/specs/synthetic-bake/spec.md) | The development-only bake page, which produces a synthetic pack from a freely licensed model and a procedural environment, with believable motion and stable points. | `add-4d-os-local-demo` |
| [`time-viewer`](../openspec/specs/time-viewer/spec.md) | The 4D scene in time under a single shared NOW: the trail, direction colors, frustum light, source frame, cameras and the interpolated present. | `add-4d-os-local-demo` |
| [`dither-display`](../openspec/specs/dither-display/spec.md) | The retro display pass (low resolution, stable ordered dither, upscaling without smoothing), the color-depth selector and the optional shape mask. | `add-4d-os-local-demo` |
| [`desktop-shell`](../openspec/specs/desktop-shell/spec.md) | The 4D.OS desktop on the first screen: boot with real progress, tool windows, playback controls and narrow viewports. | `add-4d-os-local-demo` |
| [`story-page`](../openspec/specs/story-page/spec.md) | The chaptered story page below the desktop, its hero and its footer. | `add-4d-os-local-demo` |
| [`playground-hub`](../openspec/specs/playground-hub/spec.md) | What the playground pages share: routes and redirects, the demo index, build and deploy next to 4D.OS, sound, reduced motion, fallbacks, accessibility, honesty, budgets and typefaces. | `add-playground-landings` |
| [`landing-game-center`](../openspec/specs/landing-game-center/spec.md) | Game Center Yonjigen, the arcade-building landing, with its four playable toys. | `add-playground-landings` |
| [`landing-wind-up-empire`](../openspec/specs/landing-wind-up-empire/spec.md) | Wind-Up Empire, the tin-toy space empire, with its declared-fake economy and its five toys. | `add-playground-landings` |
| [`landing-bloomscope`](../openspec/specs/landing-bloomscope/spec.md) | Bloomscope, the kaleidoscope turned with a brass ring, with its three toys of natural symmetry. It is now a work in the museum's collection. | `add-playground-landings` |
| [`hero-gesture`](../openspec/specs/hero-gesture/spec.md) | The pinned first screen, which turns scroll, pinch and keys into zoom, a loop and a final segment, under the "one gesture, one effect" rule. | `add-cosmic-landings-and-organic-motion` |
| [`procedural-subject`](../openspec/specs/procedural-subject/spec.md) | Bake subjects generated from equations, with no third-party model and no skinning, and the `falcon-phi` and `whale-fall` scenes that use them. | `add-cosmic-landings-and-organic-motion` |
| [`cosmic-landings`](../openspec/specs/cosmic-landings/spec.md) | Worlds D (the falcon and the golden ratio) and E (the whale and the black hole): their first screens, story pages, real-time skies and live math readouts. | `add-cosmic-landings-and-organic-motion` |
| [`playground-museum`](../openspec/specs/playground-museum/spec.md) | The museum at `/`: sheets with their VISTA, épure and title block, the sheet index, the page clock, the fold, the wash, and the way back from each work. | `add-playground-museum` |
| [`work-loops`](../openspec/specs/work-loops/spec.md) | How the museum's loops are recorded, stored, verified and played: deterministic recording of the live render, provenance, the stale-loop warning and posters. | `add-playground-museum` |

`prepare-public-release` added a 16th capability, [`public-repository`](../openspec/specs/public-repository/spec.md). It covers what a reader of the public repository can rely on: English throughout, a README and these docs, the licenses, no personal or machine-local data, a build that works from a fresh clone, and the layout by site and by layer.

`add-seo-and-sharing` added a 17th, [`site-metadata`](../openspec/specs/site-metadata/spec.md). It covers what every public page tells search engines and link previews, and the site files around it: one page registry, canonical URLs, Open Graph and X card tags, structured data, icons, share images made from real frames with their credits and provenance, `robots.txt`, `sitemap.xml`, the 404 page and noindex on the non-canonical host.

`adapt-for-phones` added an 18th, [`phone-ergonomics`](../openspec/specs/phone-ergonomics/spec.md). It covers what every public page guarantees on phones: 44 px touch areas that never overlap, a control's effect visible while it is used, scrolling that is never trapped, short and landscape screens, pinned and docked panels that never hide focus, readable text and contrast of phone-only elements, and a desktop that stays pixel-identical.

## The changes, in order

| Change | Opened | Archived | New capabilities | Modified capabilities |
|---|---|---|---|---|
| [`add-4d-os-local-demo`](../openspec/changes/archive/2026-09-24-add-4d-os-local-demo/) | 2026-09-23 | 2026-09-24 | `4d-pack`, `synthetic-bake`, `time-viewer`, `dither-display`, `desktop-shell`, `story-page` | none |
| [`add-playground-landings`](../openspec/changes/archive/2026-09-25-add-playground-landings/) | 2026-09-25 | 2026-09-25 | `playground-hub`, `landing-game-center`, `landing-wind-up-empire`, `landing-bloomscope` | `dither-display` |
| [`add-cosmic-landings-and-organic-motion`](../openspec/changes/archive/2026-09-28-add-cosmic-landings-and-organic-motion/) | 2026-09-24 | 2026-09-28 | `hero-gesture`, `procedural-subject`, `cosmic-landings` | `story-page`, `time-viewer`, `synthetic-bake`, `4d-pack`, `desktop-shell` |
| [`add-playground-museum`](../openspec/changes/archive/2026-09-28-add-playground-museum/) | 2026-09-25 | 2026-09-28 | `playground-museum`, `work-loops` | `playground-hub`, `landing-bloomscope`, `landing-wind-up-empire` |
| [`prepare-public-release`](../openspec/changes/archive/2026-09-29-prepare-public-release/) | 2026-09-29 | 2026-09-29 | `public-repository` | `work-loops`, `playground-museum`, `playground-hub` |
| [`add-seo-and-sharing`](../openspec/changes/archive/2026-09-29-add-seo-and-sharing/) | 2026-09-29 | 2026-09-29 | `site-metadata` | `playground-hub`, `public-repository` |
| [`adapt-for-phones`](../openspec/changes/archive/2026-09-30-adapt-for-phones/) | 2026-09-29 | 2026-09-30 | `phone-ergonomics` | `desktop-shell`, `story-page`, `cosmic-landings`, `4d-pack`, `playground-hub`, `playground-museum`, `landing-bloomscope`, `landing-game-center`, `landing-wind-up-empire`, `site-metadata` |

The "Opened" date comes from each change's `.openspec.yaml`, and the "Archived" date from its folder name. Changes overlapped: the cosmic-landings change was opened the day the first one was archived, and ran alongside the next two, and `adapt-for-phones` was opened the day `add-seo-and-sharing` was archived. `prepare-public-release` and `add-seo-and-sharing` were archived the same day, so their folders sort by name: `2026-09-29-add-seo-and-sharing` is listed before `2026-09-29-prepare-public-release`, although it came after it.

### 1. `add-4d-os-local-demo`

This was the founding change, a local prototype. 4D reconstructions from monocular video usually appear in generic viewers. The change asked whether an old desktop operating system, dithered pixel art and museum-room minimalism could become the native interface for them, rendered in real time instead of as pre-rendered images, because 4D is explored by moving time and the camera. It defined:

- the 4D pack, as little-endian structure-of-arrays binaries plus JSON (D2);
- a development-only bake page that produces a synthetic pack: a CC-BY cat model, animated procedurally, climbing stairs in an alley at night (D3);
- a `TimeController` as the single source of truth for the NOW (D4);
- the retro display pass (D7);
- one WebGL context for the whole page (D8);
- the 4D.OS desktop and the story page.

Its annex `flavors.md` records how three different worlds, A, B and C, were chosen and built on the same core ("flavor" was the project's first word for "world"). Its `verification.md` records 60 fps with about 2.1 million points drawn per frame in the worst case. It also walks through every scenario of the six new specs, with and without reduced motion.

### 2. `add-playground-landings`

4D.OS was already published under `/4d-os/`, and the site's root needed a front door. This change built three candidate landings. Each is a world of its own, with toys you can play and an honest index of the demos:

- **Game Center Yonjigen**, an arcade building where scrolling is the elevator;
- **Wind-Up Empire**, a tin-toy space empire with an economy it declares fake;
- **Bloomscope**, a giant kaleidoscope with toys of natural symmetry.

Each design came out of a structured process: a concept draw, two independent designers, a judge, and a critic of the whole set. The final direction documents and the cross-landing critique are kept in the change's `directions/` folder. D18 makes them the detailed reference and gives the critique the last word when they conflict. The change also built:

- the shared playground platform: the index contract (D10), sound off by default (D11), reduced motion (D12), a fallback without WebGL2 (D13) and measured budgets (D14);
- a second Vite configuration (D3);
- two engine options that leave 4D.OS unchanged: a shape mask for the retro display (D5), and a smooth-scroll option that does not jump back to the top (D7).

To show that 4D.OS was untouched, its verification compares 15 pixel hashes of 4D.OS before and after the engine changes, and all 15 match byte for byte.

### 3. `add-cosmic-landings-and-organic-motion`

The demo worked when still but not in motion, and the change measured three problems:

- the cat's climb was nine identical hops;
- each wheel notch in B's hero scrolled the page, advanced time and zoomed the camera at once;
- on phones, a finger on the view did not scroll the page.

The fixes:

- The cat got a real gait, with planted foot contacts and leg IK (D6).
- A new `zoomHero` module pins the first screen while native scroll runs and enforces "one gesture, one effect" (D1, D2).
- The bake gained stable points and point correspondence, and the viewer gained a present interpolated between frames (D5). The median distance a point moves between frames dropped from 27.6 cm to 2.55 cm, the same as the body's own motion.

The change also tested the whole method on new ground. The bake learned to accept subjects generated from equations (D7). Two scenes use them: `falcon-phi`, a falcon diving down a golden logarithmic spiral (D8), and `whale-fall`, a whale falling toward a black hole with gravitational time dilation (D9). They became worlds D (The golden stoop) and E (Whale fall).

### 4. `add-playground-museum`

This change replaced the temporary redirect at `/` with a museum that sits one level above the works. Its design direction, "The épure" (called by its working name, "La épura", in the change and in the `playground-museum` spec), is modeled on Monge's descriptive-geometry sheet. Each work gets a sheet with three parts:

- its VISTA, a loop recorded from the live render;
- the épure of its trail: the plan says where, the elevation says when, and the ground line joins them;
- a title block with figures read from the work.

One page clock drives every loop and every NOW (D4), and the fold is the house's only 3D moment (D7). Loops are recorded with a controlled clock and checked pixel by pixel. They are stored in a compact 4-bit format with published provenance (D5, D6), and the build warns when a work changed after its loop was recorded. Sheet 000 demonstrates the method with Gaudí's double-twist column and the tesseract (D11). The change also:

- moved Bloomscope to `/bloomscope/`;
- removed the comparison page, with 301 redirects for both old URLs;
- added a way back from each work to its sheet (D13);
- switched weight labels to MiB (D14).

It modifies specs that `add-playground-landings` created, so that change had to be archived first. Its verification comes in two files: `verification-loops.md` covers the recording, and `verification.md` covers everything else, including budgets (12.4 KB of initial JavaScript against a 100 KB cap).

### 5. `prepare-public-release`

This change turns the private working repository into a public one that people can learn from. It was archived just before the public history was created (D10 and the Migration Plan), so it is the last change of the private history. The change:

- translates everything into English with one shared glossary. For comment-only edits, the check is that the minified build output stays byte-identical (D7, D8).
- restructures the tree into two symmetric site roots and code grouped by layer, with the same public URLs (D1).
- makes the museum build independent of git history. Sheet dates are now curated (D3), and a loop's freshness is decided by a content hash of its work's sources (D4, D5).
- sanitizes the archived changes (D8), and adds the README and `docs/` (D9), the MIT license (task 6.4) and an audit for personal and machine-local data (task 7.1).
- starts the public history from a root commit with the final tree, followed by a commit that records the loops against it (D10).

Each stage is checked against fingerprints of every route that were captured before any code changed (D11). Because this change carried out the restructure, it names both layouts. The survey in its design and the tasks that ran before the move (groups 1 to 3) use the old paths, while D1 and the later tasks use the new ones.

### 6. `add-seo-and-sharing`

The site was public but barely existed for search engines and link previews: no canonical URLs, no Open Graph or X card tags, no structured data, no `robots.txt`, `sitemap.xml` or favicon, empty `data:,` icons on seven pages, and an empty 404 for any unknown address. A link pasted into a chat showed no image. This was the first change on the public repository, and it had one hard constraint: no file under any museum sheet's `sources` could change, so every recorded loop stays fresh. Everything is therefore added at build time:

- one page registry, `src/site/pages.ts`, in a new build-time layer that no page imports (D1);
- a Vite plugin in both site configs that injects the canonical link, the `og:*` and `twitter:*` tags, the icons and a minimal JSON-LD block right after the viewport meta, so that previews that read only the first 32 KiB find them, and that fails the build on an unregistered page or a description that drifted from the registry (D2, D3, D4);
- share images made from real frames: an 840×630 region of a real capture, copied pixel for pixel, beside a band set in the work's own typefaces with the title, the "synthetic" mark and, wherever the cat appears, its CC-BY credit inside the image. Each has a provenance sidecar and a `LICENSES.md` row, and its URL carries a version taken from its own hash (D5);
- `robots.txt`, `sitemap.xml`, a 404 page in the museum's visual language with the Worker's `404-page` handling, and a `_headers` rule that keeps the `workers.dev` hosts out of search results, named only by placeholders (D6);
- unit tests that never read `dist/`, plus `tools/audit-site.ts` for the built output (D7).

Its gates (D8) are the build's `[museum]` check for loop freshness, a check that the sheet sources are untouched, and fingerprints of every route before and after: visible text and pixels stay identical, and only the expected head elements are added. Its `verification.md` lists what can only be checked on a real host, the preview's `noindex` header and real unfurls in chat and social apps, as pending. It was planned for two groups working in parallel, one on the metadata and one on the images, with a single meeting point (D10).

### 7. `adapt-for-phones`

Every page opened on a phone without sideways scroll, but most toys could not be used there as intended: the control sat one or two screens away from what it changed (Bloomscope's lathe, Sow, Game Center's 4F glass, the tool windows of worlds A, B and C), many controls were smaller than a finger, some drags started when the visitor only meant to scroll, and on a phone world E and the launcher each transferred more than 50 MB, much of it files that none of their views drew. The hard constraint was the opposite of the SEO change's: the phone rules could touch any file, including the sheets' sources, but at 1440×900 and 1680×1050 with a mouse every page had to paint the same pixels, and the six museum loops had to be recorded again with identical frames. The change:

- sets one phone vocabulary for the whole playground, five patterns (pinned stage, stage deck, window dock, bottom bar, side by side in landscape) and four micro-rules, each work drawing them in its own language, with no drawer anywhere (D1);
- gates every layout and behavior change behind a phone query or a coarse pointer, with the same query strings in CSS and script, and creates phone-only elements by script (D2, D3);
- adds a headless window dock, `src/engine/window/dock.ts`, for worlds A, B and C (D9), a stage deck for D and E (D10), and a loader option that skips the source frames no view of E draws, plus a launcher that shows stills on phones and loads its pack on request (D11);
- fixes two bugs on every device: a drag on the museum's scrubber no longer scrolls the page to the top, and the scrubber reports its real position to assistive technologies (D5); a quick press on a museum index row follows its link (D21);
- gives the 4D.OS pages and the museum descriptive tab titles, tightens five descriptions to search-result length, replaces the false "A local experiment" lines and removes the `data:,` icon placeholders from the sources (D12 to D14);
- adds a development-only phone check, [`tools/check-phone.ts`](../tools/check-phone.ts), with one module per work (D18).

Its desktop proof has three layers (D16): deep desktop screenshots compared shot by shot, a release fingerprint of every route, and the museum loops recorded again with every frame hash unchanged (D17). The only intended desktop differences are listed in D15 and in its `verification.md`. Because each loop's provenance names the commit it was recorded at, the branch is merged without squashing. Its `verification.md` lists what only a real phone can show, such as Safari's collapsing toolbar, as pending.

## How to read a change

Every change folder has the same core files. Read them in this order:

1. **`proposal.md`: why and what.** It covers *Why*, *What Changes* (with **BREAKING** marked), *Capabilities* (new and modified) and *Impact* (the code, assets, docs and deployment it touches). Start here to decide whether the change matters to you.
2. **`design.md`: how, and what else was considered.** It covers *Context* (what a survey of the tree found), *Goals / Non-Goals*, then numbered decisions **D1, D2, …**. The main decisions have an *Alternative* or *Alternatives* paragraph that says what was rejected and why; from `prepare-public-release` on, every decision has one (the `design` rule in `config.yaml`). It ends with *Risks / Trade-offs* and often a *Migration Plan*. Other documents cite decisions as `<change-name> Dn`, for example `add-playground-museum D6`.
3. **`specs/<capability>/spec.md`: the contract, as deltas.** Each file changes one capability:
   - `## ADDED Requirements` adds new requirements;
   - `## MODIFIED Requirements` repeats an existing requirement in full, with its new text;
   - `## REMOVED Requirements` names what goes away and why.

   Each requirement comes with the scenarios that test it. When the change is archived, the deltas are merged into `openspec/specs/`. After that, the delta shows what this change did, and the living spec shows how things stand now.
4. **`tasks.md`: the plan as it was carried out.** Tasks are numbered groups of checkboxes. Each task ends with how it was verified: a command, a test, or a measurement. When a check was accepted with an exception, the exception is written into the task.
5. **`verification.md`: the evidence.** Measured figures and scenario walkthroughs, described below. `prepare-public-release` has none: its checks are written into its tasks.

Some changes also carry annexes: `flavors.md` in the first change (how the three worlds were chosen), and `directions/` in the landings change (design directions and their critique). `.openspec.yaml` records the schema and the date the change was opened.

OpenSpec writes the artifacts in the order proposal → specs → design → tasks. Specs and design each depend only on the proposal, and tasks depend on both. For reading, design before specs usually works better, because the decisions explain the requirements.

## The loop: propose → apply → verify → archive

The project was built with Claude Code, an AI coding agent, running OpenSpec's workflows. OpenSpec generates these workflows into `.claude/` (`openspec init` creates them and `openspec update` refreshes them). This repository uses OpenSpec's *core* profile, which provides them in two forms: slash commands in [`.claude/commands/opsx/`](../.claude/commands/opsx/) and matching skills in `.claude/skills/openspec-*/`. With skills, the agent can pick a workflow when a request fits it, while a slash command runs one on purpose. These files were generated by OpenSpec 1.13.1 (see `generatedBy` in each skill's front matter), and they are listed in `LICENSES.md`.

| Command | Skill | What it does |
|---|---|---|
| `/opsx:explore` | `openspec-explore` | A thinking mode for investigating a problem before or during a change. It reads code and specs and never implements. |
| `/opsx:propose <name or description>` | `openspec-propose` | Creates `openspec/changes/<name>/` with `openspec new change` and writes the proposal, delta specs, design and tasks from `openspec instructions`. It plans only and does not touch code. |
| `/opsx:apply [name]` | `openspec-apply-change` | Works through `tasks.md` in order and ticks each task (`- [ ]` → `- [x]`). It stops and asks when a task needs scope the artifacts do not cover. |
| `/opsx:update [name]` | `openspec-update-change` | Revises the planning artifacts when a decision changes during apply and keeps them consistent with each other. It never edits code. |
| `/opsx:sync [name]` | `openspec-sync-specs` | Merges a change's delta specs into `openspec/specs/` without archiving it. |
| `/opsx:archive [name]` | `openspec-archive-change` | Checks the artifacts and tasks, offers to sync the deltas, and moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`. |

Every change in this repository went through the same loop:

1. **Propose.** Write the change. `config.yaml` shapes every artifact.
2. **Apply.** Implement the tasks in order. When a decision changes during the work, amend the design and specs (`/opsx:update` does this), so the record matches what was built.
3. **Verify.** Run the check each task names, then close the change with its verification record and `openspec validate <change> --strict`. This step is the project's own convention, described below. OpenSpec also offers a verify workflow outside the core profile, but this repository does not use it.
4. **Archive.** Sync the deltas into the living specs and move the change into the archive. The next change starts from the updated specs.

You do not need Claude Code to use any of this. The artifacts are plain Markdown, and the CLI works on its own.

## Verification

OpenSpec's `spec-driven` schema has no verification artifact. This repository adds three habits:

- **Each task names its proof.** This is the `tasks` rule in `config.yaml`. A task such as "make missing HTML entries fail the build" ends with the exact check, here "build once with an entry temporarily renamed (the build names it and fails)".
- **A change closes with `verification.md`**, next to its `tasks.md`. It usually has:
  - an *Environment* section: browser, renderer, tool versions, and how the servers ran;
  - one section per task group, headed with task numbers (for example "9.5 Performance"), holding measured figures such as frame times, byte budgets, pixel or frame hashes and test counts;
  - a table per spec of *scenario → how it was verified → result*, often repeated with reduced motion;
  - *Deviations and interpretations* found during apply, amendments, and a *Pending* list of what was knowingly left out.

  A change with a large, separate verification can split it, as `add-playground-museum` did with `verification-loops.md`.
- **The closing task validates the change.** From the second change on, it runs `openspec validate <change>` (with `--strict` in most) before the change is archived.

The browser automation and measurement scripts behind these records were written for each check and kept outside the repository, so the figures in `verification.md` are the record. The exceptions are part of the product: the loop recorder, [`tools/capture-loops.ts`](../tools/capture-loops.ts), and, from `add-seo-and-sharing`, the share-image tool [`tools/capture-og.ts`](../tools/capture-og.ts) and the audit of the built output, [`tools/audit-site.ts`](../tools/audit-site.ts); and, from `adapt-for-phones`, the phone check [`tools/check-phone.ts`](../tools/check-phone.ts).

In `prepare-public-release`, most of the verification is the same check repeated after each stage: page fingerprints, `tsc`, the tests and the build (D11). The result and any accepted exception are written into the task that ran the check.

## Paths in archived changes

**Paths and names inside archived changes describe the repository as it was when each change was made, before `prepare-public-release` restructured it.** The exception is `add-seo-and-sharing`, which came after the restructure and uses today's layout. The older paths were left as written on purpose, because a decision or a measurement only makes sense against the tree it was made on. The archived texts were translated and sanitized, but their paths were not updated. To find a file today, use this table:

| Path in archived changes | Path today |
|---|---|
| `src/core/` | `src/engine/` |
| `src/scenes/` | `src/pipeline/scenes/` |
| `src/bake/` | `src/pipeline/bake/` |
| `dev-assets/models/` | `src/pipeline/models/` |
| `dev-assets/launcher/` | `src/pipeline/captures/` |
| `src/main.ts`, `src/launcher.css` | `src/4d-os/launcher/` |
| `src/flavors/<x>/` | `src/4d-os/worlds/<x>/` |
| `src/debug/` | `src/4d-os/debug/` |
| `index.html`, `a/` … `e/`, `bake.html`, `debug.html` (at the root) | `sites/4d-os/index.html`, `sites/4d-os/a/` … `e/`, `sites/4d-os/bake.html`, `sites/4d-os/debug.html` |
| `public/` (packs, the launcher images of D and E) | `sites/4d-os/public/` |
| `public/launcher/a-vitrine.png`, `b-plate.png`, `c-leader.png` | `src/pipeline/captures/` |
| `vite.config.ts` | `sites/4d-os/vite.config.ts` |
| `playground/` (including `playground/public/`) | `sites/playground/` (including `sites/playground/public/`) |
| `vite.playground.config.ts` | `sites/playground/vite.config.ts` |
| `scripts/capture-loops.ts` | `tools/capture-loops.ts` |
| `vite-plugins/` | `tools/vite/` |
| `cloudflare/` (`_redirects`, `.assetsignore`) | `deploy/` |
| `wrangler.jsonc` | `deploy/wrangler.jsonc` |
| `DESIGN.md`, `PRODUCT.md` | `docs/design/DESIGN.md`, `docs/design/PRODUCT.md` |
| `.impeccable/review/` (design review captures) | removed; a curated set is in `docs/images/` |
| `src/playground/` | unchanged |

Some names changed too:

- **"flavor" → "world".** Folders, identifiers, test titles, the `data-flavor` attribute (now `data-world`) and the debug page's `?flavor=` parameter (now `?world=`) all use one word, as the UI already did (`prepare-public-release` task 4.2). The annex `flavors.md` keeps its old name.
- **Spanish identifiers.** `cajetin` became `titleBlock` (CSS `title-block`), and `tramo` became `segment`.
- **The museum build no longer reads git.** Each sheet's `origin` paths and `src/playground/museum/build/git.ts` are gone. Sheets carry a curated `created` date, and each loop's provenance records a `sources` hash (`prepare-public-release` D3–D5). The capture tool writes the poster sidecar itself (D6) and no longer has a `--from-landings` option (task 2.3).

The routes in the archives need the same care:

- **4D.OS routes are relative to the 4D.OS site.** `/`, `/a/` … `/e/`, `/bake` and `/debug` (which the guides call `/bake.html` and `/debug.html`; both forms open the same pages) are served from the root by the development server. The published build lives under `/4d-os/`, so world D is `/4d-os/d/`.
- **Two playground routes moved** in `add-playground-museum`. Bloomscope moved from `/landings/bloomscope/` to `/bloomscope/`, and the comparison page at `/landings/` was removed. Both old URLs redirect with a 301.

Finally, a few paths in the archives name files that never entered the repository: scripts that were proposed and then rejected as alternatives, or verification scripts that lived outside it. The text around each mention says which.

The landings change also names its three directions by internal code names: `orbit` (Wind-Up Empire, now `src/playground/wind-up-empire/`), `neon` (Game Center Yonjigen, `src/playground/game-center/`) and `bloom` (Bloomscope, `src/playground/bloomscope/`). The file plans in its `directions/` files sketch layouts that were never built as drawn, some under those names (`src/playground/orbit/…`) and some with folders that never existed (`src/playground/game-center/toys/…`). Compare them with the tree before looking for a file.

## Starting a new change

1. Read the living specs the change touches (`openspec list --specs`, then `openspec show <capability>`).
2. Run `/opsx:propose <description>`, or `openspec new change <name>` followed by `openspec instructions <artifact> --change <name>` to write the artifacts yourself.
3. Check the plan with `openspec validate <name> --strict`, then apply, verify and archive as described above.

For how the code itself fits together, continue with [architecture.md](architecture.md), [engine.md](engine.md) and [museum.md](museum.md).
