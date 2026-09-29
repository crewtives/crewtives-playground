# Proposal

## Why

The root of `playground.crewtives.com` still redirects to `/4d-os/` with a 302. The three candidate landings (Game Center Yonjigen, Wind-Up Empire and Bloomscope) are toy works: each one competes with the demos it presents. Bloomscope was chosen as the work to keep developing (2026-09-25), but the playground's front door has to be something else: a **museum** that wraps the collection of experiments and sits one level higher in the hierarchy. Today those experiments are the 4D.OS cat (A, B and C), the golden falcon (D), the whale and the black hole (E), and Bloomscope. The museum shows each one with a moving capture and a short text, and takes the visitor to the work.

The direction came out of the *new-work* process of `/impeccable`:
- a `concept-seed` roll with seed `68faf439` assigned candidate 6 of 7;
- it was chosen on the decision page: **La épura**, Monge's descriptive geometry sheet;
- it is built *code-led*.

Before that came a design panel with reference verification, three directions, a judge and an adversarial critic. In addition, two spikes measured how to record and show the dithered works.

## What Changes

- **New museum at `/`.** The playground is a set of sheets and each work has its own. A sheet carries:
  - the VISTA: the work's loop, large, with the display's real pixels;
  - its trail drawn in elevation and in plan, joined by the ground line: the plan says where and the elevation says when, with the same axes for every work. In the 4D.OS scenes, the plan is the subject's center and the height is the frame; in Bloomscope, whose loop records Sow sowing, the plan is where the seeds were born and the height is their birth order;
  - a single NOW that runs across the three views at once;
  - the title block, which acts as the label with data read from the work, and the link to enter.
- **Sheet index as the second section.** It has three-digit numbers that can be typed to jump. It adds three unnamed workshop sheets and method sheet 000: Gaudí's double-twist column and the tesseract, drawn in épure.
- **Initial collection:**
  - 001, the cat: A, B and C are one scene from the same commit, so they share one sheet with three views;
  - 002, The golden stoop;
  - 003, Whale fall;
  - 004, Bloomscope.

  Game Center and Wind-Up Empire stay in the build, outside the collection, and can be added later without a redesign.
- **A page clock governs the time of the whole collection.** It has FORWARD, REWIND and HOLD, and dragging it moves all the loops and all the NOWs together. The loops are frames recorded from the live render, all of the same measure, and they are drawn on a synchronized canvas, not in animated `<img>` elements. At the end, each loop starts over with a declared cut.
- **3D moment: the fold.** The vertical plane turns on the ground line and the sheet becomes space. It is rendered with the same Engine and RetroDisplay as the works, and it only moves when the visitor asks for it.
- **A luminous house (option "b" of the direction exploration, which also stays on the experiments' own stack).**
  - Light paper, ink and a visible modular grid, with the Fibonacci ratio of the columns labeled.
  - The gradients are a wash of light that goes from morning (lavender) to afternoon (apricot), moved only by scroll.
  - Each work brings its own color.
- **Loop recording.** It is reproducible and deterministic: controlled clock, recovery of the native buffer verified pixel by pixel, and provenance per loop. The build warns, without failing, when a work has changed since it was recorded.
- **Way back.** Each exhibited work (the 4D.OS worlds and Bloomscope) shows a small link to its museum sheet. This amends the "4D.OS intact" scenario of `playground-hub` only in that link and in the weight label, and PRODUCT.md records it as a commitment.
- **BREAKING:**
  - `/` stops redirecting to `/4d-os/` and serves the museum;
  - `/landings/` (the comparison page) disappears and redirects with a 301 to `/`;
  - Bloomscope moves to `/bloomscope/`, with a 301 from `/landings/bloomscope/`.

  For now those URLs only existed in the preview.
- **Weight unit.** Pack weight is labeled in MiB across the whole site: today it says "MB" over a division by 1024.
- **Preview first.** Everything is published to a preview version of the Worker, and production does not change until it is explicitly approved.

**Scope trade-off, confirmed on 2026-09-25:** sheet 000 is the only one that covers two of the museum's goals, 4D projection and Gaudí, so its static version (the two drawings in SVG épure, its row and its sources) is mandatory. The only things that can be left out of the first deploy are its fold and the "House pixels" selector that goes with it.

## Capabilities

### New Capabilities
- `playground-museum`: the museum at `/`. It includes:
  - the sheets, the épure of each work and their common invariant;
  - the title block with real data;
  - the sheet index;
  - the page clock;
  - the 3D fold;
  - the light and the grid;
  - the workshop and method sheets;
  - the way back from each work;
  - reduced motion, fallback without WebGL2 and without JavaScript;
  - accessibility, honesty and budget.
- `work-loops`: how the works' loops are recorded, stored, verified and played back:
  - exact native resolution;
  - deterministic clock;
  - FORWARD and REWIND passes of the same measure across the whole collection;
  - provenance;
  - stale loop warning;
  - posters for reduced motion;
  - development-only tools, never in the published output.

### Modified Capabilities
- `playground-hub`: the routes change (museum at `/`, Bloomscope at `/bloomscope/`, 301 redirects) and the comparison page is removed. The shared requirements (sound; reduced motion; flashes; without WebGL2; the color-depth selector, which in the museum only affects the live views; accessibility; honesty; budget; typefaces; language; build and preview) now also cover the museum. The landings' footer stops saying "candidate" and carries the way back to the museum.
- `landing-bloomscope`: new route `/bloomscope/`, a footer with the way back to its sheet, and a fixed garden with a link for its loop.
- `landing-wind-up-empire`: its "Footer" swaps the candidate-landing line for "Not in the collection yet · Playground", with a link to `/`.

**Order dependency:** `playground-hub`, `landing-bloomscope` and `landing-wind-up-empire` currently live as deltas of the `add-playground-landings` change, which is finished but not archived. This change requires archiving it before applying the modifications, so that those specs exist in `openspec/specs/`.

## Impact

- **New code:**
  - `playground/index.html`: the museum, at the root of the playground build;
  - `src/playground/museum/**`: sheets, SVG épure, page clock, loop player, 3D fold and light;
  - a collection manifest generated at build time and when the dev server starts: data for each pack, git dates and trails computed from the packs or, for Bloomscope, from the Sow seeds its loop records;
  - the loop recording script, with Playwright and `tsx` used through `npx` and no new dependency in `package.json`;
  - the loops and their posters in `playground/public/`.
- **Changes to existing code:**
  - `vite.playground.config.ts`: museum entry, Bloomscope move, required entries and `PLAYGROUND_ONLY`;
  - `cloudflare/_redirects`: the 302 is removed and 301s are added;
  - `playground/landings/index.html` leaves the build;
  - `playground/public/landings/_shared/compare/` (thumbnails only the comparison used) is retired, with its row in `LICENSES.md`;
  - the Bloomscope pages (route and footer) and its surface brief, which is renamed;
  - `index.html` and `a/index.html` to `e/index.html` at the repo root (plus their CSS if needed): the link back;
  - `src/core/shell/packStats.ts` and `shell.test.ts`: the unit;
  - `src/playground/shared/worlds.ts` and its tests (`worlds.test.ts`, `bloomscope/page.test.ts`, `game-center.test.ts` and `wind-up-empire/page.test.ts`): `CANDIDATE_LINE` and `COMPARE_ROUTE` are removed;
  - the footer of the three landings and Wind-Up Empire's "About this demo" paragraph;
  - `.gitignore`, if the manifest is written to disk;
  - `package.json`, only if `deploy:preview` needs to accept another preview alias.
- **Documentation:**
  - `PRODUCT.md`: principle 2 admits labeled recordings of the live render; Positioning, the scope of principle 1, the playground commitments and their index are adjusted; and the "4D.OS intact" commitment is added with its exception;
  - `DESIGN.md` and `.impeccable/design.json`: the La épura world;
  - `LICENSES.md`: new fonts and loop provenance;
  - `.impeccable/surfaces/`: brief and direction contract.
- **Deploy:** a preview version of the `crewtives-playground` Worker. Production only with explicit approval.
- **Git:** branch `feat/playground-museum`, from `feat/playground-landings`, which has Bloomscope and the playground platform and has not been pushed yet.
