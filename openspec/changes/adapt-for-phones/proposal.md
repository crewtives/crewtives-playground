# Proposal

## Why

Every page of playground.crewtives.com opens on a phone and none scrolls sideways, but most toys cannot be used there as intended: the control sits one or two screens away from what it changes. In Bloomscope's lathe the rosette is 0 px on screen while "Stretch time" is dragged, so its point ("a rosette is a staircase") is never seen. The same gap hides Sow's plate while "Hold to sow" runs, the Game Center Parlour glass while its jog wheel rewinds, and the scene of 4D.OS worlds A, B and C while their tool windows are used. Most real controls are smaller than a 44 px touch target, several drags start by accident when the visitor only meant to scroll, landscape phones get layouts built for other screens, world E moves its first-screen tools below its hero (against `cosmic-landings`), and a phone waits about 50 s for world E and the launcher, half of it for files no view of theirs draws. The site is public now, so the worlds' "A local experiment" lines are false, the 4D.OS tab titles say little to a stranger, and five meta descriptions are longer than search results show.

## What Changes

- **A phone vocabulary for the whole playground** (design D1): five patterns (pinned stage, stage deck, window dock, bottom bar, side by side in landscape) and four micro-rules (the drawing stays and the hit grows; a grip, not a strip; the result goes to the toy; the hold trio). No drawer or bottom sheet anywhere. Each work applies them in its own visual language and CSS.
- **Museum:** the title row scrolls away and the navigation row stays; the clock bar is refined, with a wider scrubber; controls get 44 px hit areas without changing their drawing; the fold is dragged only from a grip on the ground line, so a swipe over an épure scrolls; a landscape layout; a tighter index. On every device, dragging the page clock's scrubber no longer starts the browser's drag autoscroll, and the scrubber reports its real position to assistive technologies while the clock runs, without announcing it every second while it has focus.
- **Bloomscope:** the lathe and Sow become pinned stages with the peephole beside the toy; the Hive's peephole sits beside its Put; a landscape split; results fly into the peephole, which shows the chamber count, instead of summoning the chamber gem over the controls; a 44 px dial grip.
- **Game Center Yonjigen:** the 1F deck keeps full-size controls at real phone heights; a handheld cabinet in phone landscape that keeps its wings clear of the notch; held buttons keep their hold; the 3F ticket prints under the crane; the 4F glass becomes a pinned stage over its panels; the roof stops clipping at 360 px; elevator call buttons on every floor.
- **Wind-Up Empire:** the key's tag shows the build state; the route band docks to the bottom on short phones; only the rocket's pull-back and the key's face capture a touch; a two-column landscape lid; a pinned proof bed in the Litho Press; drums that never clip; phones in landscape count as phones for the rendering caps.
- **4D.OS A, B and C:** a window dock (one button per tool window, one window open at a time) replaces the stacked windows on narrow screens: under the transport in A and C, inside the pinned hero in B, where the plate reframes above the open window. A new headless helper, `src/engine/window/dock.ts`, serves all three.
- **4D.OS D, E and the launcher:** E's timecode, state, Colors and Time move into a stage deck inside its pinned first screen, like D's; D gets 44 px controls and a WebKit layout fix; E stops downloading source frames that none of its views samples (27.1 MB); on phones the launcher shows stills, tagged as stills, and loads its 50.4 MiB pack only when a button on its first screen asks for it.
- **Copy, titles and heads:** the six 4D.OS pages get tab titles of the form "<World> · 4D.OS · crewtives playground", the museum gets "crewtives playground · a museum of live graphics experiments", the "A local experiment" lines become "A playground experiment", five meta descriptions are tightened to at most 160 characters, and the `data:,` icon placeholders leave the page sources, with the build rejecting any that comes back.
- **Desktop stays as it is.** Every layout or behavior change for phones is gated behind a phone query or a coarse pointer. At 1440×900 and 1680×1050 with a mouse, every page paints the same pixels except the copy lines listed in design D15, and the six museum loops are recorded again with identical frames.
- **Verification** gains a development-only phone check, `tools/check-phone.ts`, with one module per work, including touch-area overlap and the contrast of every phone-only element.

Production deploy is not part of this change.

## Capabilities

### New Capabilities
- `phone-ergonomics`: what every public page guarantees on phones: touch targets, seeing a control's effect while using it, scrolling that is never trapped, short and landscape screens, pinned and docked panels that never hide focus, readable text, and a desktop that does not change.

### Modified Capabilities
- `desktop-shell`: "Narrow viewport" replaces the stacked windows with the window dock.
- `story-page`: "Footer with dotted wireframe" caps the footer's empty tail on phones.
- `cosmic-landings`: "Live first screen on the same engine" keeps the first-screen tools inside the pinned hero on phones; "Presence in the launcher" shows stills on phones and loads the pack on request.
- `4d-pack`: "Real load progress" counts the files a page requests; new "Layers a page never draws" lets a page skip source frames it cannot show.
- `playground-hub`: "Playground routes" lets 4D.OS load behavior change where a 4D.OS requirement says so; "Demo honesty" gives the museum a descriptive tab title.
- `playground-museum`: "Museum page and section order" (tab title), "Page clock" (a scrubber drag never scrolls or selects), "The fold" (a grip on touch screens and the fold kept in view), "Way back from each work" (drops the freeze on 4D.OS pages), "Museum-specific accessibility" (the scrubber's position while the clock runs); new "Phone chrome".
- `landing-bloomscope`: "Continuous simulation and peepholes", "Bringing results to the chamber" and "Sow, the golden-angle seeder"; new "Pinned stage on phones".
- `landing-game-center`: "Floor directory and elevator" and "Phone first screen"; new "Phone landscape" and "Phone machines keep their screen in view".
- `landing-wind-up-empire`: "Resource strip", "First screen on phones and intermediate widths", "Rocket operable by keyboard and on touch screens", "Wind runs the build queue", "Litho press that reprints the real render", "Focus, contrast and touch controls" and "On-demand rendering and per-device limits".
- `site-metadata`: "Open Graph and X card tags" (descriptions of at most 160 characters, share titles led by the tab title's name), "Real icons" (no placeholder in any source), "Metadata leaves the works as they are" (loops re-recorded when metadata touches their sources); new "Tab titles and self-description".

## Impact

- **Code:** `src/playground/museum/` (style, main and a new `clockAria.ts`), `src/playground/bloomscope/`, `src/playground/game-center/`, `src/playground/wind-up-empire/`, `src/4d-os/worlds/{a,b,c,d,e}/`, `src/4d-os/launcher/`, `src/engine/window/dock.ts` (new), `src/engine/pack/loader.ts`, `src/engine/shell/boot.ts`, `src/site/` (registry, head injection and their tests), `tools/audit-site.ts`, `tools/check-phone.ts` and `tools/check-phone/` (new).
- **Pages:** the heads of the museum, both landings, the launcher and the five worlds; the footer lines of worlds A to E and the launcher's bar note; A's Label section moves after its drawers, C's strip before its cards, and D's timeline wraps its word "frame" in a span. `sites/4d-os/vite.config.ts` inlines the launcher's pack weight at build time.
- **New files:** the launcher's phone stills of worlds A, B and C under `sites/4d-os/public/launcher/`, with their provenance and a `LICENSES.md` row.
- **Loops:** `src/engine/` and the worlds' and Bloomscope's sources change, so all six museum loops are recorded again. Their passes and posters must keep every byte; only their provenance (commit, sources hash) changes. The branch must be merged without squashing, because the provenance names its commits (`public-repository` "Clean public history").
- **Unchanged on purpose:** the pack files under `sites/4d-os/public/packs/`, the share images under `sites/playground/public/og/`, `package.json` (no dependency), every desktop layout, and the `viewport` meta of every page.
- **Docs:** `docs/design/DESIGN.md`, `docs/engine.md` (the loader's `source` option and the window dock), the `.impeccable/surfaces/` briefs, `docs/site-metadata.md`, `docs/architecture.md`, `docs/museum.md`, `README.md` and `docs/openspec-workflow.md`.
