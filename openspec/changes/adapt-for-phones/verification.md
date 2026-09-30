# Verification of adapt-for-phones

Date: 2026-09-30. Branch `feat/seo-and-mobile`, on top of `835fd7d` (`<base>`, the archived `add-seo-and-sharing`). This file records the integration proofs of group 8; groups 9 and 10 add the loops and the closing summary. The ad hoc scripts (the release fingerprint, its comparison, the desktop identity capture, the budget and throttling scripts) live outside the repository, as in `add-seo-and-sharing`; what remains of them are the figures below.

**Merge note.** The branch must be merged **without squashing**: each loop's `provenance.json` names the commit it was recorded at (design D17, `public-repository` "Clean public history").

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

- `tools/check-phone.ts desk` on the build (the museum on a scratch copy of the same tree whose loop provenance carries the current sources hash, so that it renders no staleness notice; see below), compared with the build of `<base>` (`desk-compare`): **316 shots: 272 byte-identical, 39 different only inside the D15 copy lines, 5 noise-only (on the accepted list), 0 differing, 0 missing, 0 layout differences.** One element dump differed once (Bloomscope 1680×1050, `DIV.column`'s style hash, same box); two recaptures gave the base value once and the other value once, so it is not deterministic on either side.
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

No desktop screenshot differs. The phone entries differ as intended (docks, decks, stills, call buttons, the proof bed, peephole counts, the museum grips) and were reviewed against 8.4.

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
| Wind-Up Empire | The docked band is the chrome band itself; the stub is the key's chrome tag; the bed is a tin proof with its caption. | No change |
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

## Spec amendments made during integration

- `landing-wind-up-empire` "Pull back on a phone": a pull of 132 px gives 12 notches (`FULL_PULL`), as a mouse pull does; 110 px gives 10.
- `landing-bloomscope` "Turning the dial with a finger": the touch lands on the dial's band, 8 px inside the dial's edge (the old "30 px outside the band's inner edge" falls outside every stage dial's clamped ring).
- `playground-museum` "Preview in the index rows" (MODIFIED): a press does not open the preview (design D21, D15).

## Pending, for a real device

- Native momentum after a swipe up from the Wind-Up Empire rocket, and the lid lift, on an iPhone and an Android phone.
- Safari's collapsing toolbar under the pinned stages, the museum clock and B's dock; the phone scrubber drag in Safari (Playwright's WebKit pans on a mouse drag over `touch-action: none`); D's and E's floated legends; Game Center's safe-area insets in the landscape handheld.
