# Verification of adapt-for-phones

Date: 2026-09-30. Branch `feat/seo-and-mobile`, on top of `835fd7d` (`<base>`, the archived `add-seo-and-sharing`). Sections 8.1 to 8.12 record the integration proofs of group 8; "9. Loops" the recording of group 9; "10. Closing" the two fixes made after the final reviews and the gates run again on the final code; then come the phone evidence per work, the scenario tables per delta spec, the intended desktop differences, the known limitations, the deviations and what is pending. The ad hoc scripts (the release fingerprint, its comparison, the desktop identity capture, the budget and throttling scripts) live outside the repository, as in `add-seo-and-sharing`; what remains of them are the figures below. `tools/check-phone.ts` and its modules are in the repository.

**Merge note.** The branch must be merged **without squashing**: each loop's `provenance.json` names the commit it was recorded at (design D17, `public-repository` "Clean public history").

## Status

- **Tasks:** groups 1 to 10 done (10.4 with a note about a second worktree, see "10. Closing").
- **Reviews:** three final reviews ran on the build after group 9: a phone QA pass (verdict pass, four minor findings), a finish review against each work's visual rules (verdict fix, one minor finding in the museum, fixed in `f8bb6cf`) and a compliance review (verdict pass, two minor findings: the unticked closing tasks, done here, and the ungated index-row press, listed under "Intended desktop differences"). One phone QA finding was fixed (`9779549`); the other three are under "Pending", each with the reason it was left.
- **Nothing was deployed or pushed.** Every HTTP check ran against the built output served locally by `wrangler dev` with the production configuration.

## Environment

- macOS 26.4.1 on arm64 (Apple M2 Pro), Node 24.19.
- Vite 8.3.0, Vitest 5.0.1, TypeScript 7 (`tsc --noEmit`).
- Playwright 1.63.0 and tsx 4.23.15 through `npx` at pinned versions (no `package.json` change).
- Chromium 153.0.8010.12 headless. Phone checks, budgets and throttling on the GPU (`--use-angle=metal --enable-gpu --ignore-gpu-blocklist`, renderer "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)"); desktop shots and the release fingerprint on SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --disable-accelerated-2d-canvas`), the renderer of the accepted baselines.
- WebKit 26.6 (Playwright's build), iPhone 13 descriptor at 390×664.
- wrangler 4.138.0 (`wrangler dev` with `deploy/wrangler.jsonc`, `deploy/_redirects` and `deploy/.assetsignore` copied into `dist/`). Nothing was deployed or pushed.

## 8.1 The machine reproduces the recorded loops

- A dry run of `tools/capture-loops.ts all` on a build of `<base>` (served from its worktree): for `a`, `b`, `c`, `d`, `e` and `bloomscope`, every pass's 45 frame hashes (forward and rewind; forward only for `bloomscope`) and the poster hash equal `sites/playground/public/loops/<loop>/provenance.json` at `<base>`. The renderer string equals each `method.renderer`, and the Chromium version (153.0.8010.12) equals `method.browserVersion`.
- The release fingerprint of `<base>` (taken after `add-seo-and-sharing`) holds the 10 routes × desktop, phone and no-JavaScript entries (30 entries).

## 8.2 Tree, tests, build and audit

- `npx tsc --noEmit`: no output, exit 0.
- `npm test` with `dist/` moved away: 63 files, 763 tests, all pass.
- `rm -rf dist && npm run build`: exit 0; no `[site]` line; exactly six `[museum]` staleness lines, one per loop (001 a, b and c; 002 d; 003 e; 004 bloomscope), as expected until group 9.
- `npx -y -p tsx@4.23.15 tsx tools/audit-site.ts dist`: exit 0, every line `ok`.
- `git diff --name-only 835fd7d -- sites/4d-os/public/packs sites/playground/public/og package.json src/engine/shell/desktop.ts sites/playground/bloomscope/index.html`: nothing.
- Every changed file lies in its owner's row of design D19. The integrator also edited, as the design allows it to: `tools/check-phone.ts` (three generic checks, D21), `tools/check-phone/bloomscope.ts` (`.ring-hit` in the skip list) and `tools/check-phone/wind-up-empire.ts` (the pull check resets the scroll a reload restores).

## 8.3 Built heads

- For the ten built pages, the set of `<link rel="icon">` and `<link rel="apple-touch-icon">` equals the build of `<base>` (script over both `dist/` folders: no difference).
- `dist/4d-os/index.html` and `dist/4d-os/e/index.html` carry exactly one `theme-color` meta each; no other page's count changed.
- `grep -rli "local experiment" dist --include='*.html'`: nothing.

## 8.4 Phone checks in Chromium, on the build

`tools/check-phone.ts phone all --base <url>`: 963 results, 948 pass, 8 fail, 7 skipped. The failures, each fixed and run again on the same build:

| Failure | Cause | Fix | After |
|---|---|---|---|
| Bloomscope "generic: focus", 7 viewports: `div.ring-hit` covered by `div.eyepiece` | The Scope's brass ring is annular; its center is the eyepiece (a harness artifact, also on the base) | `.ring-hit` joins the module's annular skip list | `--check focus`: 11/11 pass |
| Wind-Up Empire "a pull back of 110 px launches" at 390×844: "scrolled the page to 38" | The check before it resizes to 1440 and back; the reload restores that 38 px scroll, so the absolute test failed | The check scrolls to 0 after its reload | the page's 390×844 run: 21 pass, 1 skipped |

The skips: Wind-Up Empire's momentum check (headless Chromium gives no fling at all, even beside the lid, at the base commit too) and the launcher's "reduced motion on panels" in six viewports (the launcher declares no panel).

The target probe was also re-run for every page after its second pass was added (design D21): 66/66 pass, and "hit-area overlap" 73/73. Controls never probed: the focus-only skip links (exempt), Game Center's 2F cabinets inside the sideways aisle (hundreds of pixels tall), and Bloomscope's "D · The golden stoop" index wheel link at 844×390; every other control is probed at a stop where no fixed or sticky panel lies under a probe point.

**E under throttling** (9 Mbps down, 60 ms latency, 4× CPU, 390×844, the build): the boot reaches 100% and the scene is revealed after **27.95 s** (limit 32 s); the requests are `whale-fall/scene.json`, `static.bin` and `dynamic.bin` only.

## 8.5 WebKit subset (iPhone 13, 390×664)

114 results: 91 pass, 1 fail, 22 skipped.
- The failure: Game Center's console check logs 16 `WebGL: INVALID_OPERATION: glDrawArraysInstanced: Vertex buffer is not big enough for the draw call.` warnings. The build of `<base>` logs the same 16 in the same subset (and none when the console check runs alone, on both builds): pre-existing, from an instanced draw of the machines, not from this change.
- The skips: "text sizes" (Chromium only), "swipe over visuals" (no native touch in WebKit) on every page; Wind-Up Empire's rocket swipe (Playwright's WebKit cannot construct `Touch`, "Illegal constructor"; `touchPull` is unit-tested and the swipe passes in Chromium); the launcher's panel check.
- Passing items the task names: no horizontal scroll, targets and keyboard on every page; the museum scrubber drag leaving `scrollY` unchanged (mouse) and the grip drag folding the sheet; Bloomscope's co-visibility, release, Put and focus; the Game Center deck and 4F stage; the Wind-Up Empire reels, short first screen and horizontal scroll; A, B and C co-visibility; D's monitor height and E's dock rows.

## 8.6 The desktop did not change

- `tools/check-phone.ts desk` on the build (the museum on a scratch copy of the same tree whose loop provenance carries the current sources hash, so that it renders no staleness notice; see below), compared with the build of `<base>` (`desk-compare`): **316 shots: 272 byte-identical, 39 different only inside the D15 copy lines, 5 noise-only (on the accepted list), 0 differing, 0 missing, 0 layout differences.** One element dump differed once (Bloomscope 1680×1050, `DIV.column`'s style hash, same box); two recaptures of the result build gave the base value once and the other value once, so it flips between captures of the same build.
- The accepted desktop identity capture (`desk-identity compare desk-before <after>`): 275 byte-identical, 2 noise-only on the accepted list, 39 differing, every one of them the copy lines of D15 (A–E footers and the launcher's bar note), 0 layout differences. The museum's 48 shots at 1440×900, 1680×1050, 1100×800 and 760×1000 are byte-identical.
- `queries --base <url>`: 68 lines (34 queries at 1440×900 and 1680×1050), all `false`, exit 0.
- The museum on the real build shows the six notices "the work has changed since", which move its layout; group 9 records the loops again and removes them. The scratch copy with refreshed hashes proves that nothing else differs.

## 8.7 Release fingerprint

Compared with the fingerprint of `<base>`; every desktop and no-JavaScript difference maps to a D15 row:

| Entry | Difference | D15 row |
|---|---|---|
| `/4d-os/`, A–E (desktop and no JS) | "local" → "playground" | Copy lines |
| A, C (desktop and no JS) | Word order (the text is multiset-equal after the copy substitution) | A's Label after the drawers; C's strip before the cards |
| D (desktop) | `SPAN` +1 | `timeline__frame-word` |
| `/4d-os/`, E (desktop) | `META` +1 | `theme-color` |
| E (desktop) | No request for `source/page-0.png` and `page-1.png` | E's requests |
| 4D.OS pages (desktop) | Request `TimeViewer-HASH.js` → `packStats-HASH.js` | Not a content change: the shared engine chunk is the same chunk (614,511 → 615,405 bytes, the engine additions), named after another of its modules since the 4D.OS config imports `packStats.ts` |
| `/bloomscope/` (desktop) | `LINK` 21 → 22 | Timing: the second `gl` chunk's `modulepreload` lands before or after the snapshot; three loads of `<base>` gave 21, 22, 22 |
| `/` (desktop, no JS) | Staleness notices | Group 9; the fingerprint of the refreshed scratch copy shows no difference for `/` desktop or no JS |

Among the desktop screenshots only the launcher's differs, inside its bar note (bounding box x 87–357, y 9–19, checked with a direct pixel difference); the comparison script did not list it because it reports a screenshot only above 2,000 differing pixels. Every other desktop screenshot is identical. The phone entries differ as intended (docks, decks, stills, call buttons, the proof bed, peephole counts, the museum grips) and were reviewed against 8.4.

## 8.8 Budgets

| Page | JS before interaction, 1440×900 (gzip −9) | All chunks it can load (gzip −9) | First load at 1440×900 |
|---|---|---|---|
| `/` | 13,039 B (limit 100 KB) | 170,041 B | 330,876 B |
| `/bloomscope/` | — | 246,004 B | 893,246 B |
| `/landings/game-center/` | — | 259,082 B | 792,252 B |
| `/landings/wind-up-empire/` | — | 251,439 B | 868,988 B |

Every page stays under 350 KB of JavaScript and 2 MB of first-load transfer. On phones (390×844, first load, the build against `<base>`): E transfers **28,715,720 B** (was 55,802,902), and the launcher **721,507 B** (was 53,260,758; it requests no pack file before the button).

## 8.9 Finish reviews

Screenshots of every page at 390×844 and 390×664 (top, and the stages, docks and decks stuck), reviewed against each work's own rules:

| Page | Findings | Outcome |
|---|---|---|
| Museum | The bar sheds its title row; ruled 44 px rows; the grips are square ink marks at the ground line's right end, never round; the clock bar keeps its ruled states. | No change |
| Bloomscope | The stage is a hard 2 px ink edge on the section's own glass field, no fade; the peephole count is a readout pill in the gem's type. | No change |
| Game Center | 4F glass pinned with its mint apron; the call buttons are round ink plates like the directory; the deck keeps the cobalt plastic. | No change |
| Wind-Up Empire | The docked band is the chrome band itself; the stub is the key's chrome tag; the proof bed, shot pinned under the strip with the press rows scrolling under it, is a tin plate with the flat print and its "Proof · printed flat" caption, hard-edged. | No change |
| A | Ink bars on the 3 px grid; the open window a paper tab joined to its bar. | No change |
| B | Sage letterpress strip at the foot of the pinned plate. | No change |
| C | Black leader bands; the open band's leak-orange edge. | No change |
| D | The deck on glass with 44 px keys that keep their double stroke. | No change |
| E | The void console on the recorder; the checked cell inverted, not blended. | No change |
| Launcher | Stills tagged "still" in the title-bar type; the ink "Run the scene live · 50.4 MiB" button beside window A. | No change |

Nothing is newly centered, rounded or glassy against a world's rules, so no fix batch was needed and 8.4 and 8.6 stand.

## 8.10 and 8.11 Documentation and public-repository scan

- `docs/design/DESIGN.md`, `docs/engine.md`, `docs/architecture.md`, `docs/museum.md`, `README.md` and `LICENSES.md` carry the owners' notes; every path they name exists; `git grep -niI "local experiment" -- sites src docs README.md ':!src/site/pages.test.ts'` prints nothing.
- The added lines of `git diff 835fd7d` and every new file were scanned for home, scratch and temp paths, loopback addresses and ports, preview and `workers.dev` hosts, e-mail addresses, deployment version IDs and session or agent names: nothing.

## 8.12 Commits

| Commit | Area |
|---|---|
| `bd22b3b` | `feat(engine)`: the window dock and the loader's `source` option |
| `f239192` | `feat(site)`: tab titles, the five descriptions with `src/site/pages.ts`, the copy lines, icons, theme colors and the three structural moves |
| `d5f6043` | `feat(museum)` |
| `79bb7e4` | `feat(bloomscope)` |
| `e287e1b` | `feat(game-center)` |
| `6e70a1d` | `feat(wind-up-empire)` |
| `db3391a` | `feat(4d-os)`: worlds A–E and the launcher |
| `1976de5` | `feat(tools)`: the phone check |
| `d3d91f7` | `docs` |

No commit message carries a co-author or tool line. After these commits, a dry run of `tools/capture-loops.ts all` on a build of the committed tree reproduced every pass's frame hashes and each poster hash of the six loops' provenance at `<base>`: the phone rules reach no loop (ahead of task 9.1, which repeats it before recording).

## 9. Loops

Recorded on the committed implementation (`3ffbead`), built and served by `wrangler dev`, on SwiftShader (the renderer each loop's `method.renderer` names) with Chromium 153.0.8010.12.

- Before recording, the tree was clean at `3ffbead` and the build's freshness check read all six loops STALE, as expected: the sheets' sources had changed.
- **9.1 Dry run:** `tools/capture-loops.ts all --dry-run` matched the previous provenance of every loop, pass by pass.
- **9.2 Recording:** `tools/capture-loops.ts all`. Each result was compared with the saved previous provenance field by field (pass frame hashes, poster hash, rectangle, native size, palette, source frames and pass bytes):

  | Loop | Passes | Frame hashes | Native size | Pass bytes (forward / rewind) | Poster hash | Binaries in git |
  |---|---|---|---|---|---|---|
  | `a` | forward, rewind | 45/45 and 45/45 identical | 307×172 | 144,335 / 144,296 | identical | unchanged |
  | `b` | forward, rewind | 45/45 and 45/45 identical | 389×225 | 152,097 / 152,273 | identical | unchanged |
  | `c` | forward, rewind | 45/45 and 45/45 identical | 426×219 | 279,649 / 274,929 | identical | unchanged |
  | `d` | forward, rewind | 45/45 and 45/45 identical | 300×300 | 178,626 / 176,943 | identical | unchanged |
  | `e` | forward, rewind | 45/45 and 45/45 identical | 418×231 | 478,736 / 455,630 | identical | unchanged |
  | `bloomscope` | forward | 45/45 identical | 221×221 | 96,785 | identical | unchanged |

  `git status --porcelain -- sites/playground/public/loops` listed only the six `provenance.json` and six `poster.webp.json` files. Their diff changes only `commit` (to `3ffbead`), `sources.hash`, `recorded` (2026-09-30) and the sidecar's `createdAt`. The `.4dlp.gz` passes and the `poster.webp` files are byte-identical.
- **9.3** The six loop rows of `LICENSES.md` read "on 2026-09-30, after the phone adaptation, with frames identical to the first recording of 2026-09-25", matching each `provenance.json`.
- **9.4** After the rebuild the build printed no `[museum]` line and every loop read FRESH; `npm test` passed with `dist/` moved away; `npm run typecheck` passed.
- **9.5** Committed as `13e3b07 chore(loops): record museum loops at 3ffbead`. `git merge-base --is-ancestor 3ffbead HEAD` exits 0.

This is the scenario "Loops unchanged" of `phone-ergonomics`: every frame and every poster kept its hash.

## 10. Closing

### Fixes after the final reviews

| Finding | Fix | Gate | Proof |
|---|---|---|---|
| Finish review, museum: on a touch screen at 360 to 430 px the "House pixels" options broke onto two rows, "1-bit" and "16" beside the floated legend and "Millions" alone below, with about 50 px of empty space | `f8bb6cf fix(museum)`: the legend keeps `float: left` (so it stays a flex item and is not drawn on the fieldset's border) and gets `flex-basis: 100%`; the labels' padding becomes `12px 0` (the 12 px on the left keeps the probe 21 px left of each radio on its label) | Inside the museum's existing `(pointer: coarse)` block | Measured in the folded sheet 003: from 360 to 932 px wide the three options share one row (labels 73, 51 and 95 px wide, 44 px tall); the fieldset at 390×844 is 121 px tall (was 171). At 320×568 "Millions" still wraps below the other two, because the three labels need 219 px and the fieldset leaves 195. `tools/check-phone.ts phone museum` at 360×780, 390×844, 430×932, 390×664 and 844×390 (development server): 92/92 pass, including "house pixels beside the fold" (fold view fully visible with the options in portrait, 51% in landscape, the landscape bar is 30%), "generic: targets" and "hit-area overlap". On the build at 390×844, 430×932 and 360×780: 57/57 museum checks pass. |
| Phone QA, Wind-Up Empire: the docked route band, a "bottom bar" of design D1, had no `env(safe-area-inset-bottom)` term | `9779549 fix(wind-up-empire)`: `padding-bottom: calc(8px + env(safe-area-inset-bottom))` on the docked band | Inside the portrait band-docking query (`max-width: 900px`, portrait, `min-height: 640px`) | The page declares no `viewport-fit=cover`, so the inset is 0 and the band's padding stays 8 px: nothing moves today. `tools/check-phone.ts phone wind-up-empire` on the build at 390×844, 430×932 and 360×780: 44 pass, 1 skipped (the momentum check, as in 8.4). |

Neither file is in any museum sheet's `sources` (`src/playground/museum/collection.ts`), so no loop turned stale: the build prints no `[museum]` line and the freshness check reads all six FRESH.

### Desktop identity on the real build

With the loops recorded, the real build's museum no longer shows staleness notices, so the museum's desktop proof no longer needs the scratch copy of 8.6. On the final build (after `f8bb6cf` and `9779549`), the desktop identity capture of the museum (1440×900, 1680×1050, 1100×800 and 760×1000) and of Wind-Up Empire (1440×900 and 1680×1050), compared with the capture of `<base>`: **76 shots, 76 byte-identical**, 0 noise, 0 differing, 0 layout differences.

### Gates on the final code

- `npx tsc --noEmit`: no output, exit 0.
- `npm test` with `dist/` moved away: 63 files, 763 tests, all pass.
- `rm -rf dist && npm run build`: exit 0, no `[site]` and no `[museum]` line; the freshness check reads 001 a, b and c, 002 d, 003 e and 004 bloomscope FRESH.
- `npx -y -p tsx@4.23.15 tsx tools/audit-site.ts dist`: exit 0, every line `ok`.
- `openspec validate adapt-for-phones --strict`: "Change 'adapt-for-phones' is valid".
- The scenario tables below were checked by script: every `#### Scenario:` heading of the eleven delta specs appears in them.

### Worktrees (10.4)

The `<base>` worktree used for the base builds was removed. A second worktree, made for a separate video capture of the site and not part of this change, was left in place because it may still be in use; `git worktree list` therefore shows it next to the main checkout.

## Phone evidence per work

Figures from the full Chromium run of 8.4 (`tools/check-phone.ts phone all` on the build, 390×844 unless stated), with the museum's "House pixels" figures from the run after `f8bb6cf`.

| Work | Co-visibility (control and its effect) | Chrome and targets | Contrast of phone elements |
|---|---|---|---|
| Museum | The fold view fully visible with "House pixels" above the clock at 390×844, 390×664 and 360×780; the fold view whole between the bar and the clock after "Fold" (a 271×339 box ending above the clock at 765) | Stuck bar 45 px, clock bar 79 px, at every portrait size; scrubber 191 px at 430, 151 at 390, 121 at 360, 81 at 320; landscape clock one row 47 px tall | Grip, clock states and scrubber 16.13:1; the clock line 9.42:1 |
| Bloomscope | Sow and the lathe: view and peephole fully visible (fraction 1) with each control centered and 60 px above the bottom, at every viewport; the whole rosette on screen for the whole "Stretch time" drag to Staircase (minimum 1) | Every control probed; the dial's finger ring is checked by its module | Stage edge against its field: Sow 8.02:1, lathe 10.81:1; peephole count 17.81:1, caption 10.81:1 |
| Game Center | 4F: the whole glass visible in the middle of a touch rewind ("1.8 seconds ago, rewinding" at 390×844, "1.3 seconds ago" at 390×664) | 1F deck: joystick directions 44×44, A, B and C 48×48, at 390×844, 390×664 and 360×780; gas-sign tubes 44×44 at 390 and 41×52 at 360 | Between 5.46:1 (`.dip__name`) and 11.83:1 |
| Wind-Up Empire | The proof bed pinned under the strip while "8-fold" changes it (390×664); results at the key's tag | Landscape strip 52 px tall; the spark wheel's touch zone 44 px and nobody else's | Key stub 11.85:1, deck link 11.85:1 (focus 11.4:1), proof caption 6.52:1, coil 15.59:1 |
| A | Every window with 100% of the view on screen at 390×664, "Plan" 92% | The dock under the view at 12,464 at 390×844 | Dock buttons, back link and docked labels 17.1:1 |
| B | Each window above the dock with the plate band above it (Exposures: a 439 px band at 390×844, 259 px at 390×664) | Six dock buttons on one row, two rows below 390 px | Dock buttons 7.57:1; docked legends and the title bar's aside 4.7:1 |
| C | 87% (Layers) to 100% of the view with each window, at 390×844, 390×664 and 360×780 | Dock buttons wrap, never scroll | Dock buttons 14.31:1 (focus 8.07:1), docked code 6.7:1 |
| D | Timecode, state, color depth and time mode inside the first screen at every viewport (depth options 97×44 at 390, 87×44 at 360) | Deck keys 44 px | Deck legends and hints 10.66:1, deck labels 17.62:1 |
| E | The same first-screen deck; revealed in 27.95 s under the throttle of 8.4 | Back tab 44 px tall, clear of the title | As D |
| Launcher | "Run the scene live · 50.4 MiB" (255×44) and window A's still on the first screen at 390×844, 390×664, 360×780 and 844×390 | 44 px button | Button and "still" tags 17.1:1 |

Story-page footers: from the bottom of the last FAQ question to the end of the page, A 494 px, B 505 px, C 510 px (limit 520).

## Scenarios

How to read the "How" column:

- **cp** `<page>` "<check>": the check of that name in `tools/check-phone.ts phone` on the build, in the full Chromium run of 8.4 (every listed viewport passed unless the result says otherwise); **wk**: the WebKit subset of 8.5.
- **desk**: the desktop proofs of 8.6 and of "Desktop identity on the real build"; **fp**: the release fingerprint of 8.7; **queries**: the `queries` mode of 8.6.
- **unit** `<file>`: a test in `npm test`.
- **Unchanged**: a scenario whose text this change repeats without changing it (a MODIFIED requirement repeats every scenario). It was not exercised again by hand; the evidence is the desktop proof and the unit tests that already covered it.

### `phone-ergonomics` (new)

| Scenario | How | Result |
|---|---|---|
| Desktop render unchanged | desk: 316 shots, only D15 copy lines and accepted noise differ; the museum and Wind-Up Empire again on the final build, 76/76 identical | Pass |
| Phone queries off on a desktop | queries: 68 lines, all `false` | Pass |
| Loops unchanged | 9.2: every frame and poster hash of the six loops identical | Pass |
| Probing the targets | cp every page "generic: targets" (after the second pass of D21: 66/66); annular controls in their modules (Bloomscope "the dial's finger ring") | Pass; exempt or unprobed controls listed in 8.4 |
| No overlapping touch areas | cp every page "generic: hit-area overlap" at 390×844 and 360×780 (73/73 after D21) | Pass |
| Gas-sign letters at 360 | cp game-center "RF gas sign tubes": eight tubes 41×52 at 360×780 | Pass |
| The lathe | cp bloomscope "stretching time with the plant in view" (minimum visible fraction 1) | Pass |
| The rewind | cp game-center "4F rewind by touch while watching" at 390×664 (glass whole mid-turn) | Pass |
| A window | cp a "dock: turning Trail off while watching" and "dock: each window beside the view it acts on" at 390×664 (100% of the view with Layers) | Pass |
| Swipe over a pinned stage | cp bloomscope "swipes over the pinned plant"; cp every page "generic: swipe over visuals" | Pass |
| Swipe that starts on a toy | cp museum "ground line scrolls"; cp wind-up-empire "a swipe up that starts on the rocket scrolls natively and launches nothing" | Pass |
| A held button and a drifting finger | cp game-center "held steer survives finger drift"; cp bloomscope "hold to sow with a drifting finger" | Pass |
| Nothing clipped at 360 | cp every page "generic: horizontal scroll and right edge" at 360×780 (five scroll stops) | Pass |
| Landscape | cp museum "landscape", bloomscope "control and effect together" at 844×390, game-center "1F handheld in landscape" and "4F glass beside its panels in landscape", wind-up-empire "landscape: the rocket, Launch and the band on one screen", a/b/c "dock: phone in landscape" | Pass |
| Toolbar hidden | Code review: the pinned stages, stage decks and first screens size with `svh`, and the Wind-Up Empire stylesheet test forbids `dvh` (unit `phone.test.ts`). The only `vh` left in a phone rule is Game Center's RF screen height, which predates this change and is not pinned. A real toolbar collapse cannot be reproduced headless | Pass by inspection; real device pending |
| Focus under a pinned stage | cp bloomscope "focus never stays under the stage" | Pass |
| Escape closes a window | cp a/b/c "dock: keyboard order, Enter and Escape"; unit `dock.test.ts` | Pass |
| Focus above a bottom bar | cp museum "generic: focus" at 390×844 (no focused element under the clock bar or the sticky row) | Pass |
| Measuring text | cp every page "generic: text sizes" (Chromium) | Pass; D's formula scripts pending (see "Pending") |
| Measuring the phone elements | cp every page "generic: contrast" (figures in "Phone evidence per work") | Pass |
| A docked window's legends | cp b "generic: contrast": docked legends and aside 4.7:1 | Pass |

### `desktop-shell`

| Scenario | How | Result |
|---|---|---|
| 390px phone | cp a/b/c "generic: horizontal scroll and right edge" and "dock: each window beside the view it acts on" at 390×844 | Pass |
| Changing a layer while watching | cp a "dock: turning Trail off while watching" | Pass |
| Short phone | cp a and c "dock: each window beside the view it acts on" at 390×664 (A at least 92%, C at least 87% of the view) | Pass |
| A window over the hero | cp b "dock: each window beside the view it acts on" at 390×844 (each window above the dock, the plate above it, no scroll) | Pass |
| Every window of the hero on a short phone | cp b the same check at 390×664 and 360×780 | Pass |
| Swiping to the windows | cp a/b/c "dock: swipes from the dock, a window and the view scroll" | Pass |
| Closing with the keyboard | cp a/b/c "dock: keyboard order, Enter and Escape"; unit `dock.test.ts` | Pass |
| Phone in landscape | cp a/b/c "dock: phone in landscape" at 844×390 and 932×430 | Pass |
| Wide screens unchanged | desk (A, B, C identical outside the D15 lines); queries | Pass |

### `story-page`

| Scenario | How | Result |
|---|---|---|
| Cursor tracking | Unchanged; desk: the footers of A, B and C identical outside the D15 copy line | Unchanged |
| Footer on a phone | cp a/b/c "footer: the tail after the last question": 494, 505 and 510 px | Pass |

### `cosmic-landings`

| Scenario | How | Result |
|---|---|---|
| Landing ready | Unchanged; cp d/e "generic: page and console errors" and the boot reaching 100% before each check; desk | Pass |
| First-screen tools on a phone | cp d/e "first-screen tools inside the viewport" at 360×780, 390×844, 390×664, 430×932, 844×390 and 932×430 | Pass |
| Changing colors while the loop plays | cp d/e "tap 1-bit while the loop plays" | Pass |
| Opening D from the launcher | Unchanged; fp: `/4d-os/` has the same links apart from the copy line | Unchanged |
| Launcher on a phone | cp launcher "launcher: stills and the button, no pack before it"; 8.8: 0.72 MB on a phone | Pass |
| The control beside the first still | cp launcher the same check at 390×844 and 390×664 (the 255×44 button, at y 314 and 301, and window A's still both wholly on the first screen) | Pass |
| Launcher live on request | cp launcher "launcher: the button loads the scene in place" | Pass |
| Launcher on a desktop | cp launcher "launcher on a desktop loads as before"; desk; fp | Pass |

### `4d-pack`

| Scenario | How | Result |
|---|---|---|
| Proportional progress | unit `pack.test.ts` (progress over every file) and `shell.test.ts` ("without load options the loader gets only the progress callback") | Pass |
| Progress with a skipped layer | unit `pack.test.ts` "with source: false, at 50% of the requested bytes the progress is 50% ±5%" | Pass |
| E without source frames | cp e "E requests no source frames; the phone boot shows the weight" (no source page, "Weight on disk" equal to the declared weight); 8.4 throttled boot; fp: E requests no `source/page-*.png` | Pass |
| Pages that draw the source frames | unit `pack.test.ts` "by default the source pages are requested and decoded"; fp: the requests of `/4d-os/` and A to D unchanged apart from the chunk name | Pass |

### `playground-hub`

| Scenario | How | Result |
|---|---|---|
| Museum at the root | Unchanged; `wrangler dev` of the build served `/` for every check; cp museum "generic: page and console errors" | Pass |
| Museum and landings at their routes | Unchanged; the same, for the four routes | Pass |
| Comparison page retired | Unchanged; `deploy/_redirects` is not modified by this change (`git diff 835fd7d` over `deploy/` is empty) | Unchanged |
| Bloomscope moved with its fragment | Unchanged; same | Unchanged |
| Landings outside the collection | Unchanged; unit `render.test.ts` ("Full walkthrough": the sheets in order) and the landings' page tests (the not-in-the-collection footer line) | Pass |
| Deep link to the index | Unchanged; desk | Unchanged |
| Deep link to a sheet | cp museum "jumps land under the sticky row" (also covers `/#sheet-003` on a phone) | Pass |
| 4D.OS intact | desk and fp: every 4D.OS difference is a D15 row; 8.1 and 9.1 dry runs reproduce the loops | Pass |
| Site files at the root | `tools/audit-site.ts dist` (robots.txt, sitemap.xml and the icon files) | Pass |
| Unknown address | Unchanged; `tools/audit-site.ts` reads the 404 page; the Worker configuration is not modified | Unchanged |
| Footer and title | unit `pages.test.ts` "each tab title follows the rule"; `tools/audit-site.ts` title rule; desk | Pass |
| Landing outside the collection | Unchanged; desk (Game Center and Wind-Up Empire footers identical) | Unchanged |
| Work in the collection | Unchanged; desk | Unchanged |
| Arrow without a missing glyph | Unchanged; desk | Unchanged |
| Museum title and stamp | unit `render.test.ts` "Tab and heading"; `tools/audit-site.ts` | Pass |
| No candidates | Unchanged; unit `page.test.ts` of Bloomscope and Wind-Up Empire and `game-center.test.ts` ("no longer a candidate", no link to `/landings/`) | Pass |
| Figures about a work | Unchanged; unit `manifest.test.ts` ("dimensions with the real time and bytes of each pack") and `render.test.ts` ("Matches the provenance", after the provenance of 9.2) | Pass |
| Figures that do not describe a work | Unchanged; no such figure changed in this change | Unchanged |
| What it stores and what it sends | Unchanged; the pages' own tests of what they say they store (Bloomscope and Wind-Up Empire `page.test.ts`); no page stores anything new, and the only request changes (E, and the launcher on phones) remove requests | Pass |
| Unfinished toy | Unchanged; no toy was left unfinished | Unchanged |

### `playground-museum`

| Scenario | How | Result |
|---|---|---|
| Full walkthrough | Unchanged; unit `render.test.ts`; desk | Pass |
| Tab and heading | unit `render.test.ts` "Tab and heading" | Pass |
| Each sheet only once | Unchanged; unit `render.test.ts` | Pass |
| Clock keys | Unchanged; unit `clock.test.ts` | Pass |
| No acceleration | Unchanged; unit `clock.test.ts` | Pass |
| The same instant on a sheet | Unchanged; unit `render.test.ts` ("Reference line"); 9.2 (every frame identical) | Unchanged |
| Three views, one NOW | Unchanged; 9.2 (every frame identical) | Unchanged |
| Scrubber | cp museum "scrubber drag" (the VISTAs follow the drag) | Pass |
| Loop wrap | Unchanged; unit `clock.test.ts` | Pass |
| Rewind | Unchanged; unit `clock.test.ts` ("Clock keys", the wrap when rewinding) | Pass |
| No animation loop at rest | Unchanged; unit `clock.test.ts` ("HOLD neither changes the frame nor notifies") | Unchanged |
| Dragging does not scroll | cp museum "scrubber drag" with a mouse at 1440×900 and a finger at 390×844 (scroll position unchanged, no selection, arrow key moves one frame); wk: the mouse drag leaves `scrollY` unchanged | Pass; the finger drag in Safari pending |
| Nothing folds by itself | cp museum "swipe over the épures between the bars" (no sheet folded) | Pass |
| Deferred loading | cp museum "ground line scrolls" (no fold code requested by a swipe) | Pass |
| Fold and unfold | Unchanged; cp museum "fold kept in view" | Pass |
| The NOW in the dihedron | Unchanged | Unchanged |
| A single folded sheet | Unchanged; desk | Unchanged |
| Fold without WebGL2 | Unchanged; unit `render.test.ts` ("axonometry of the fold without WebGL2") | Pass |
| A swipe past the ground line scrolls | cp museum "ground line scrolls" | Pass |
| Folding from the grip | cp museum "grip drag and tap fold" | Pass |
| The fold in view on a phone | cp museum "fold kept in view" (the view whole above the clock, with and without reduced motion) | Pass |
| From each world | Unchanged; fp: each world's link back unchanged | Pass |
| From the launcher | Unchanged; fp | Pass |
| Without JavaScript | fp: the no-JavaScript entries hold each link back | Pass |
| Arrow without a missing glyph | Unchanged; desk | Unchanged |
| 4D.OS with no other changes | desk and fp: the 4D.OS differences are D15 rows only | Pass |
| Screen reader on a sheet | Unchanged; unit `render.test.ts` ("Screen reader on 003") | Pass |
| Clock state | unit `clockAria.test.ts` ("a change of state writes at once and says the new state") | Pass |
| Sheet on a phone | cp museum "generic: horizontal scroll and right edge" at 390×844 | Pass |
| Position while the clock runs | unit `clockAria.test.ts` ("a running clock sampled every painted frame for 6 s stays within 16 frames of the knob"); cp museum "scrubber exposed position" | Pass |
| No announcements while focused | unit `clockAria.test.ts` ("nothing is written while the clock runs with focus", "focusing the scrubber writes at once") | Pass |
| Pointer passing by | Unchanged; the preview still starts only after a 300 ms rest (design D21) | Unchanged |
| Intent | cp museum "index preview on intent (desktop)" (keyboard focus on row 002 and a pointer resting on row 003 each show the loop) | Pass |
| A press follows the link | On the final build, after row 002's loop was cached: an 80 ms mouse click at 1440×900 and a tap at 390×844 on row 003's poster each reached `#sheet-003`, and a mutation observer saw no canvas in row 003 during the press | Pass |
| Preview with reduced motion | Unchanged; desk (captured with reduced motion) | Unchanged |
| Chrome while reading | cp museum "chrome while reading": 45 and 79 px | Pass |
| Scrubber on small phones | cp museum "scrubber width": 121 px at 360, 81 px at 320; "scrubber drag" | Pass |
| Jump under the sticky row | cp museum "jumps land under the sticky row" | Pass |
| Landscape phone | cp museum "landscape" at 844×390, 932×430 and 667×375 (clock 47 px, VISTA, NOW and scrubber on screen) | Pass |
| Desktop unchanged | desk: the museum's 48 shots identical in 8.6, and on the final build in "Desktop identity on the real build" | Pass |

### `landing-bloomscope`

| Scenario | How | Result |
|---|---|---|
| Adding without going back | cp bloomscope "put in the scope lands in the peephole" | Pass |
| Adding from the lathe on a phone | cp bloomscope "put in the scope lands in the peephole" | Pass |
| The Scope kept running | Unchanged | Unchanged |
| Adding | Unchanged; unit `page.test.ts` ("adds at the end, counts n/7 and fills up at 7") | Pass |
| Adding with the peephole in view | cp bloomscope "put in the scope lands in the peephole" and "GOLDEN stays off the plate"; cp "generic: contrast" (peephole count) | Pass |
| Full chamber | Unchanged; unit `page.test.ts` (the same test) | Pass |
| Removing leaves a scar | Unchanged; unit `page.test.ts` ("removing leaves a scar") | Pass |
| Golden detent | Unchanged; cp bloomscope "GOLDEN stays off the plate" | Pass |
| Spokes | Unchanged | Unchanged |
| Named states | Unchanged | Unchanged |
| Turning the dial with a finger | cp bloomscope "the dial's finger ring" (touch 8 px inside the edge, 90° drag, no scroll) | Pass |
| The ring stays inside the dial | cp bloomscope "a tap just below the stage reaches the control beneath" | Pass |
| Stretching time on a phone | cp bloomscope "stretching time with the plant in view" at 390×844 and 390×664 | Pass |
| Sowing on a phone | cp bloomscope "hold to sow with a drifting finger" and "scrubbing births shows REWIND with the plate in view" at 360×780 | Pass |
| Scrolling through the stage | cp bloomscope "swipes over the pinned plant" and "the stage releases at the end of its section" | Pass |
| Focus below the stage | cp bloomscope "focus never stays under the stage" | Pass |
| Landscape phone | cp bloomscope "control and effect together" at 844×390 and 932×430 | Pass |
| Honeycomb and its peephole | cp bloomscope "the honeycomb, its Put and its peephole together" | Pass |
| Desktop unchanged | desk (Bloomscope identical; one element-dump hash that flips between captures of the same build, see 8.6); cp bloomscope "on a desktop the chip still flies to the gem" | Pass |

### `landing-game-center`

| Scenario | How | Result |
|---|---|---|
| Reach 3F by scrolling | Unchanged; desk | Unchanged |
| Back goes down a floor | Unchanged; unit `game-center.test.ts` ("floor addresses") | Unchanged |
| Elevator panel on phone | cp game-center "elevator call buttons on every floor"; unit `game-center.test.ts` ("elevator panel with several buttons": Escape gives focus back to the invoker) | Pass |
| Elevator from an upper floor on phone | cp game-center "elevator call buttons on every floor" | Pass |
| Call buttons after a resize | cp game-center "elevator call buttons on every floor" (load at 390, widen to 1024, narrow again) | Pass |
| Link to the index | Unchanged; cp game-center "generic: targets" reaches the first screen's links | Pass |
| No horizontal scroll | cp game-center "generic: horizontal scroll and right edge" (the aisle is the allowed scroller) | Pass |
| Real phone height | cp game-center "1F deck at phone heights" at 390×664 and 360×640 | Pass |
| Nothing clipped at 360 | cp game-center "generic: horizontal scroll and right edge" at 360×780 and "RF sign, strip, dial and Strike all on one screen" | Pass |
| Play in landscape | cp game-center "1F handheld in landscape" at 844×390, 932×430 and 667×375 | Pass |
| Wings clear of the notch | cp game-center "1F handheld clear of the safe areas" (insets injected, see "Known limitations") | Pass; real device pending |
| Desktop untouched | desk: Game Center also captured at 844×390 and 1024×768 with a mouse, with no difference outside the accepted noise | Pass |
| Rewind while watching | cp game-center "4F rewind by touch while watching" at 390×664 | Pass |
| Ticket in view | cp game-center "3F glass, buttons and ticket rack" | Pass |
| Held steer survives drift | cp game-center "held steer survives finger drift" | Pass |
| Focus below the stage | cp game-center "4F focus never under the pinned glass" | Pass |

### `landing-wind-up-empire`

| Scenario | How | Result |
|---|---|---|
| First focus | Unchanged; unit `page.test.ts` ("the first focusable element") | Pass |
| Drums always in view | Unchanged; desk | Unchanged |
| Narrow phone | cp wind-up-empire "drum reels never clip a digit" at 360×780; unit `phone.test.ts` ("the drums on a phone") | Pass |
| Landscape strip | cp wind-up-empire "landscape: the rocket, Launch and the band on one screen" (strip 52 px) | Pass |
| 390 px phone | cp wind-up-empire "first screen at 390×844: the band in its place" | Pass |
| Short phone | cp wind-up-empire "short first screen: the band docked, the rail clear" at 390×664 and 360×780 | Pass |
| Landscape phone | cp wind-up-empire "landscape: the rocket, Launch and the band on one screen" at 844×390, 932×430 and 780×360 | Pass |
| 900 px width | Unchanged; the phone stylesheet has no width gate above 900 px (unit `phone.test.ts`) | Pass |
| Launch with the keyboard | Unchanged; unit `toys.test.ts` ("12 detents over 132 px") | Pass |
| Scrolling on a phone | cp wind-up-empire "a swipe from the key tile edge scrolls and winds nothing"; "generic: swipe over visuals" | Pass |
| Swipe up over the rocket | cp wind-up-empire "a swipe up that starts on the rocket scrolls natively and launches nothing" | Pass for the scroll and the launch; the momentum is pending (headless Chromium gives no fling) |
| Pull back on a phone | cp wind-up-empire "a pull back of 110 px launches" (re-run after the scroll reset, 8.4); unit `toys.test.ts` ("rocket pull on a touch screen": 132 px gives 12 notches) | Pass |
| Building with two turns | Unchanged; unit `economy.test.ts` ("building with two turns") | Pass |
| Pause | Unchanged; unit `economy.test.ts` ("pause") | Pass |
| Empty queue | Unchanged; unit `economy.test.ts` ("empty queue") | Pass |
| Second key | Unchanged | Unchanged |
| Winding on a phone | cp wind-up-empire "winding two turns on the key shows the stub and the coil"; unit `phone.test.ts` ("the key's stub") | Pass |
| Nothing left to build on a phone | cp wind-up-empire "an empty queue offers the deck link" | Pass |
| A single ink | Unchanged | Unchanged |
| Locked row | Unchanged; unit `page.test.ts` ("three rows locked by the observatory") | Pass |
| Research | Unchanged; unit `economy.test.ts` ("research") | Pass |
| Seeing the press on a phone | cp wind-up-empire "the proof bed prints one ink and then stays still" | Pass |
| Pinned proof on a short phone | cp wind-up-empire "the proof bed stays pinned while 8-fold changes it" at 390×664 | Pass |
| Focus on the chrome band | Unchanged; desk | Unchanged |
| Touch targets | cp wind-up-empire "generic: targets", "the spark wheel's touch zone: 44 px and nobody else's" and "credit and footer links take a 44 px touch without moving the layout" | Pass |
| Focus not hidden by the docked band | cp wind-up-empire "focus on the key lands above the docked band" | Pass |
| Lid off screen | Unchanged; cp wind-up-empire "reduced motion: the bed prints at once and nothing runs at rest" | Pass |
| Limits on a phone | Unchanged; the same caps as in landscape, below | Unchanged |
| Limits on a phone in landscape | cp wind-up-empire "landscape phone limits: density 1.5 and two rockets" | Pass |

### `site-metadata`

| Scenario | How | Result |
|---|---|---|
| Complete tags | `tools/audit-site.ts dist`: every tag once, in its attribute form | Pass |
| Found in the first 32 KiB | `tools/audit-site.ts dist` | Pass |
| Description kept in step | Unchanged; the build's head check (unit `head.test.ts`) | Pass |
| Launcher description | unit `pages.test.ts` ("no source calls the site a local experiment") | Pass |
| Descriptions that search results show whole | unit `pages.test.ts` (50 to 160 characters, at least 110 for the five tightened pages); `tools/audit-site.ts` | Pass |
| Share title led by the page's name | unit `pages.test.ts` ("each share title begins with its name"); `tools/audit-site.ts` | Pass |
| No placeholder left | 8.3; `tools/audit-site.ts` (no `data:,`) | Pass |
| Icons served | `tools/audit-site.ts` (the icon files) | Pass |
| No placeholder in the sources | 8.3: the icon sets of the ten built pages equal `<base>`; `git grep 'data:,' -- sites` finds no icon link | Pass |
| Placeholder put back | unit `head.test.ts` ("the data:, placeholder is rejected in every source form, naming the page") | Pass |
| Same pages | fp 8.7: every desktop and no-JavaScript difference maps to a D15 row | Pass |
| Loops fresh | "Gates on the final code": no `[museum]` line | Pass |
| No local experiment | 8.3 (`grep -rli "local experiment" dist`) and 8.10 (`git grep`): nothing | Pass |
| Titles of the 4D.OS pages | unit `pages.test.ts`; `tools/audit-site.ts` title rule | Pass |
| Footer lines | desk: the 39 differing shots differ only inside the A–E footer lines and the launcher's bar note | Pass |

## Intended desktop differences

For anyone comparing desktop fingerprints of this branch with `<base>`, these are every intended difference with a fine pointer at desktop sizes:

- **Copy (visible):** the footer lines of worlds A to E ("A local experiment" → "A playground experiment") and the launcher's bar note ("Playground experiment · synthetic scene"), design D15.
- **Head (not painted):** the tab titles of the museum and the six 4D.OS pages, the five shortened descriptions and the share titles that follow them (D12, D13); one `theme-color` meta on `/4d-os/` and `/4d-os/e/` (D14).
- **Document (not painted):** A's Label section after its drawers and C's strip before its cards (the same text, reordered for focus order), D's `timeline__frame-word` span, the museum scrubber's `user-select: none`.
- **Requests:** E no longer requests `source/page-0.png` and `source/page-1.png`; the shared engine chunk is named after `packStats` instead of `TimeViewer`.
- **Behavior, same pixels at rest:** a pointer drag on the museum's scrubber no longer starts the browser's drag autoscroll or a text selection (D5); a press (mouse or touch) on a museum index row no longer opens that row's loop preview, while keyboard focus and a 300 ms pointer rest still do (D15, D21). Both are ungated fixes of real bugs, on every device.

## Known limitations

- The release fingerprint tool, its comparison script and the desktop identity capture are not in the repository; their results are recorded here. `tools/check-phone.ts desk` and `desk-compare` are the repository's equivalent.
- The safe-area insets of Game Center's landscape handheld were injected in the check, not produced by a real notch. No page declares `viewport-fit=cover`, so on a real phone every `env(safe-area-inset-*)` term is 0 today.
- Safari's collapsing toolbar, native momentum and long-press callouts cannot be reproduced in headless browsers; Playwright's WebKit cannot construct `Touch`, so touch gestures in WebKit were not run.
- The integrator changed harness checks after the full phone run (D21); those checks were re-run on the same build (targets 66/66, overlap 73/73, Bloomscope focus 11/11, Wind-Up Empire at 390×844 in full), but a second full run of every page was not made.
- The finish reviews judged screenshots; no reviewer used a real phone.

## Deviations

Every deviation from the plan is recorded in design D21 with its rejected alternative, and the spec amendments below were made in the delta specs before archiving. The two fixes of "10. Closing" stay inside the design's gates and need no new decision: the museum's legend change refines D4's touch rules for "House pixels", and the band's inset is the "Bottom bar" pattern of D1.

## Spec amendments made during integration

- `landing-wind-up-empire` "Pull back on a phone": a pull of 132 px gives 12 notches (`FULL_PULL`), as a mouse pull does; 110 px gives 10.
- `landing-bloomscope` "Turning the dial with a finger": the touch lands on the dial's band, 8 px inside the dial's edge (the old "30 px outside the band's inner edge" falls outside every stage dial's clamped ring).
- `playground-museum` "Preview in the index rows" (MODIFIED): a press does not open the preview (design D21, D15).

## Pending

**One pass on a real iPhone** (Safari), and where noted an Android phone:
- a pinned stage (Bloomscope's lathe and Sow, Game Center's 4F glass) staying pinned while Safari's toolbar collapses and expands;
- the museum's fixed clock bar and Wind-Up Empire's docked route band staying attached to the bottom edge as Safari's bottom toolbar collapses and expands, and B's dock staying above the toolbar;
- Game Center's landscape handheld: its wings clear of the notch and the rounded corners with real insets;
- no callout or text selection on long presses of Bloomscope's "Hold to sow" and Game Center's joystick;
- D's and E's floated legends in the stage deck;
- the museum scrubber dragged with a finger in Safari (Playwright's WebKit pans on a mouse drag over `touch-action: none`, and cannot construct `Touch`);
- the Wind-Up Empire lid lift staying monotonic, and native momentum after a swipe up from the rocket (iPhone and Android; headless Chromium gives no fling at all, on `<base>` too).

**Checks that need the preview host:** the phone checks and the throttled E boot against the real Workers host (real compression, caching and HTTP/2), after deploy, which is outside this change.

**Minor findings left open**, each with its reason:
- World C's docked Layers window: at 390×844 and 360×780, tabbing to the first radio leaves its 44 px label, and its focus ring, 12 to 16 px below the viewport (the browser scrolls only the small native input into view; fine at 390×664). The fix (the radio filling its label under C's narrow gate, as E's dock cells do, or a `scroll-margin-bottom` on the docked labels) edits `src/4d-os/worlds/c/`, a source of sheet 001, so it needs loops a, b and c recorded again: left for a follow-up change.
- World D's formula sub- and superscripts (`r0 · φ^(−2θ/π)`, the readout's `-6.328` superscript, `span.gun__num`) render at 9.7 to 10.3 px at 390 px, under the 11 px floor, and are not clearly covered by the screen-typeface exemption. It predates this change. The fix (an exemption for scripts inside formulas, or `sub, sup` at 11 px under D's phone query) edits `src/4d-os/worlds/d/` or the spec; the first needs loop `d` recorded again.
- Game Center's 2F cabinet credit links (the cat's credit line, 116×19 px) sit flush under the cabinet's own link, so a tap slightly above one lands on the cabinet. A negative-margin hit area would overlap the cabinet link, which `phone-ergonomics` forbids; growing the credit's own cell changes the cabinets' phone layout and needs its own Game Center phone run. Credit lines are arguably sentence text (exempt). Left for a follow-up.
- `tools/capture-loops.ts` writes "16-colour" (British spelling) into each `poster.webp.json` prompt, against the repository's US English rule. The fix belongs in the tool, followed by a recording of every loop.

**Out of scope, as the design says (D20):** serving the `.bin` packs compressed (a hosting change; the pack files must not change).

**Merge:** the branch is merged **without squashing**. Each loop's `provenance.json` names `3ffbead`, which must stay reachable from `main` (`public-repository` "Clean public history").
