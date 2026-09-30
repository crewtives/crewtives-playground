# Verification of move-cat-credit-out-of-share-images

Date: 2026-09-30. On top of `5ae76a3` (`<base>`, the tree after `adapt-for-phones` and its loop recording). The change was implemented in `a530faf` (`feat(site): move the cat's credit out of the share images`, groups 1 to 5 of `tasks.md`), reviewed, and closed with one fix, `94caca5`. Each task in `tasks.md` records its own check and result; this file adds the review, the gates run again on the final code, the evidence per scenario and what is pending. As in the earlier changes, the ad hoc scripts (the pixel comparison of task 3.3, the record summaries below, and a freshness check of the museum loops) live outside the repository, in `<scratch>`; what remains of them are the figures below.

## Status

- **Tasks:** groups 1 to 5 done; nothing unticked.
- **Review:** one review of the implemented change against the proposal, design, specs and tasks: verdict pass, with no blocker or major finding, one low finding and four informational ones. The low finding was fixed (see "Fix after the review"); the informational ones are recorded under "Known limitations", "Deviations" and "Pending".
- **Archive:** archived on 2026-09-30, with the deltas of `site-metadata` and `public-repository` synced into the living specs, and this change's row and section added to `docs/openspec-workflow.md` (design, Migration Plan).
- **Nothing was deployed or pushed.** No server was needed: only `tools/capture-og.ts compose` ran, with no new capture (design D5).

## Environment

- macOS 26.4.1 on arm64 (`darwin-arm64`, the platform `provenance.json` records for all ten images), Node 24.19.
- Vite 8.3.0, Vitest 5.0.1, TypeScript 7 (`tsc --noEmit`).
- Playwright 1.63.0 and tsx 4.23.15 through `npx` at pinned versions (no `package.json` change); Chromium 153.0.8010.12, the `browserVersion` `provenance.json` records for all ten images.

## Fix after the review

| Finding | Fix | Proof |
|---|---|---|
| Low: the alt text of `4d-os-a` in `src/site/pages.ts`, a line `a530faf` edited, said "grey ghost cats", a UK spelling | `94caca5 fix(site)`: "gray ghost cats" | The alt keeps its 398 characters; the alt is not drawn into the image, so no image, sidecar, record or `?v=` changes (the built `og:image` of `/4d-os/a/` still carries `?v=5454ca03`); `npx vitest run src/site`: 5 files, 64 tests pass; the built `og:image:alt` of `/4d-os/a/` reads "gray ghost cats". |

The frame description of the same card in `src/site/og/cards.ts` (`depicts`, written into `provenance.json`) keeps "grey"; see "Pending".

## Gates on the final code (after `94caca5`)

- `npm run typecheck` (`tsc --noEmit`): no output, exit 0.
- `rm -rf dist && npm test`: 63 files, 764 tests, all pass without `dist/`.
- `rm -rf dist && npm run build`: exit 0, zero `[museum]` lines (`grep -c "\[museum\]"` prints 0). The freshness check of the museum loops reads 001 a, b and c, 002 d, 003 e and 004 bloomscope FRESH: no path the change touches is under a sheet's `sources` in `src/playground/museum/collection.ts`.
- `cp deploy/_redirects deploy/.assetsignore dist/ && npx -y -p tsx@4.23.15 tsx tools/audit-site.ts dist`: exit 0, every line `ok`.
- `npx -y -p playwright@1.63.0 -p tsx@4.23.15 tsx tools/capture-og.ts compose` run once more on the final tree: every image reports "identical bytes, date kept, sidecar and record written from the current inputs", and the SHA-256 of all 21 files in `sites/playground/public/og/` is the same before and after the run.
- The machine-local scan of task 5.5, over `git diff 5ae76a3` without the PNGs: its only match is the line of `tasks.md` that quotes the pattern.
- `openspec validate move-cat-credit-out-of-share-images --strict`: "Change 'move-cat-credit-out-of-share-images' is valid".

## Images and records

SHA-256 prefixes against `<base>` (`git show 5ae76a3:sites/playground/public/og/<file>`):

| Image | PNG, `<base>` → now | Sidecar, `<base>` → now |
|---|---|---|
| `4d-os.png` | `6ddde611` → `6194ab77` | `7acdccc0` → `f8efed08` |
| `4d-os-a.png` | `1440341a` → `5454ca03` | `edc89937` → `4e9ddf81` |
| `4d-os-b.png` | `d01a1680` → `8c9091fb` | `0d5b1b1e` → `5ab1a543` |
| `4d-os-c.png` | `0ebe40d7` → `6a95cd84` | `adeb6df6` → `dbaeed78` |
| `museum.png`, `bloomscope.png`, `game-center.png`, `wind-up-empire.png`, `4d-os-d.png`, `4d-os-e.png` | unchanged (`be249978`, `ce2f6335`, `79c00797`, `a2a2cc86`, `000b80d1`, `9187ac44`) | unchanged |

A summary of `provenance.json` and the ten sidecars:

| Images | Record `credit` | `band.text` keys | Credit in the band text | Sidecar names the credit | Credit inside the sidecar's "Band, beside the frame" clause | Recorded title size |
|---|---|---|---|---|---|---|
| `4d-os`, `4d-os-a`, `4d-os-b`, `4d-os-c` | *"Cat" by J-Toastie, CC-BY 3.0* | `series`, `site`, `title`, `synthetic` | no | yes | no | 56 px, as on `<base>` |
| The six others | `null` | `series`, `site`, `title`, `synthetic` | no | no | no | as on `<base>` |

The pixel comparison of task 3.3 found 0 differing pixels in the four frames and in each band above the old mark's top edge, every differing band pixel inside the old foot box, and each new mark box 32 px above the bottom edge, as in `4d-os-d.png`. Read at 1200×630, the four bands show the series, the site name and the title at the top and the mark "synthetic" alone at the foot.

## Built heads

| Page | `og:image` version (`<base>` → now) | Both alts name *"Cat" by J-Toastie, CC-BY 3.0* | "and the credit" in an alt | JSON-LD `isBasedOn` | Visible credit in the body |
|---|---|---|---|---|---|
| `/4d-os/` | `6ddde611` → `6194ab77` | yes | no | "Cat", `Person` J-Toastie, CC-BY 3.0 license URL, source URL | yes |
| `/4d-os/a/` | `1440341a` → `5454ca03` | yes | no | the same | yes |
| `/4d-os/b/` | `d01a1680` → `8c9091fb` | yes | no | the same | yes |
| `/4d-os/c/` | `0ebe40d7` → `6a95cd84` | yes | no | the same | yes |

The six other pages keep their `?v=` (the first 8 hex digits of their unchanged PNGs above), and none of their alt texts contains the credit.

## Scenarios

How to read the "How" column:

- **unit** `<file>` "<test>": a test in `npm test`.
- **audit**: `tools/audit-site.ts dist` on the final build; **heads**: the table "Built heads"; **records**: the tables of "Images and records".
- **Unchanged**: a scenario that a MODIFIED requirement repeats without changing it. It was not exercised again by hand; the evidence is the unit test or audit that covers it.

### `site-metadata`

| Scenario | How | Result |
|---|---|---|
| Complete tags | Unchanged; unit `head.test.ts` "every tag exactly once…" and "image URLs carry ?v= with a version…"; audit; heads (new `?v=` for the four cat images) | Pass |
| Found in the first 32 KiB | Unchanged; unit `head.test.ts` "on a head with a 60 KB <style>…"; audit | Pass |
| Description kept in step | Unchanged; unit `head.test.ts` "it refuses a source that … disagrees with the registry" | Pass |
| Launcher description | Unchanged; unit `pages.test.ts` "no source calls the site a local experiment…" | Pass |
| Descriptions that search results show whole | Unchanged; unit `pages.test.ts` "titles, descriptions and alt texts within their bounds" | Pass |
| Share title led by the page's name | Unchanged; unit `pages.test.ts` "each tab title follows the rule…" | Pass |
| Credit in the alt text | unit `pages.test.ts` "the cat's credit is built from CAT_MODEL, and each alt names it exactly when the frame shows the cat" (no alt contains "and the credit") and "…within their bounds" (414, 398, 379 and 416 characters); heads | Pass |
| Home page | Unchanged; unit `head.test.ts` "JSON-LD: WebSite on /…" | Pass |
| A work | Unchanged; unit `head.test.ts` "JSON-LD: … isBasedOn exactly where the image shows the cat" | Pass |
| A work built on the cat | unit `head.test.ts` "JSON-LD: … isBasedOn exactly where the image shows the cat"; heads (`isBasedOn` on the four pages, equal to the one built on `<base>`, task 5.4) | Pass |
| A value that could close the script | Unchanged; unit `head.test.ts` "attribute values are HTML-escaped, and a description with </script> round-trips…" | Pass |
| Cat credit inside the image | unit `cards.test.ts` "no band carries the cat's credit; the records state it apart from the band text exactly when the frame shows the cat"; records (no band text contains "J-Toastie" or "CC-BY"); task 3.3 (no credit line drawn in the four bands); heads (the alts name the credit) | Pass; the scenario keeps its name, see "Deviations" |
| Synthetic mark | unit `cards.test.ts` '"synthetic" is in the band exactly when the registry says so…'; task 3.3 (the mark alone at the foot of the four bands) | Pass |
| Synthetic mark on a scene of the page's own | Unchanged; the same test; `game-center.png` unchanged | Pass |
| No missing glyph | unit `cards.test.ts` "every character of every band string is in the typeface that draws it" | Pass |
| Sidecar matches the image | unit `cards.test.ts` "sidecars and provenance.json state each image's actual SHA-256…" | Pass |
| Re-run changes nothing | Task 3.4, and again on the final tree (see "Gates"): 21 of 21 files byte-identical | Pass |
| Credit in the records | unit `cards.test.ts` "no band carries the cat's credit; the records state it…"; records | Pass |
| Licenses listed | unit `cards.test.ts` "every share image has exactly one row, a derivative of the CC-BY model exactly when it shows the cat"; the row "Share images that show the cat" in `LICENSES.md` lists the five places the credit travels | Pass |

### `public-repository`

| Scenario | How | Result |
|---|---|---|
| Reusing the code | Unchanged; `LICENSE` and the README's credits section are not changed in their licensing | Unchanged |
| Every asset listed | Unchanged; unit `cards.test.ts` "LICENSES.md rows" and `fonts.test.ts` | Pass |
| Credit travels with the share image | heads (both alts and `isBasedOn`); records (sidecars and `provenance.json`); `LICENSES.md` row "Share images that show the cat"; unit `cards.test.ts` (no band carries the credit) | Pass |
| Credit on the page | heads (a visible credit in the body of each of the four pages); no page HTML and no `CAT_CREDIT` changed (`git diff --name-only 5ae76a3` lists none) | Pass |

Every `#### Scenario:` heading of the two delta specs appears in the tables above (checked by script).

## Known limitations

- **The launcher's frame still shows a credit, drawn by the page itself.** The `4d-os` image's frame is a real capture of `/4d-os/`, and the launcher's own status line, "Cat model by J-Toastie, CC-BY 3.0", is part of it (left of x 840, around y 433). The rule of D1 governs the band, the frame is never retouched, and this change does not touch frames; design D1 and its "Risks / Trade-offs" record it as intended. Removing it would need a different 840×630 region of `src/site/og/captures/4d-os.png`, a frame change outside this change.
- **Link previews do not show the alt text in most apps.** The card links to its page, which shows the credit (design, "Risks / Trade-offs").

## Deviations

- **The scenario "Cat credit inside the image" keeps its name.** Its text now says the credit is *not* inside the band. Renaming it (for example to "No cat credit in the band") makes `openspec archive` stop with "current spec contains scenario(s) not present in the modified block": a MODIFIED requirement must keep every scenario of the living one. The name is historical; the WHEN/THEN is the rule.

## Pending

- **Deploy**, which is outside this change: after it, the four new images are served under their new `?v=` versions, and real unfurls in chat and social apps (and their re-scrape of cached cards) can be checked.
- **"grey" in the frame description of `4d-os-a`** (`depicts` in `src/site/og/cards.ts`, recorded in `provenance.json`) predates this change and was left alone: changing it rewrites that record through `compose`. A later change can fix the spelling.
- **A test timeout seen under load.** `src/pipeline/bake/recipes/whaleFallBody.test.ts` once took 8.1 s against its 5 s limit while the machine was heavily loaded; the reruns, and every run recorded above, pass (the file alone takes 3.7 s). This change does not touch it; if it recurs, a separate change can raise that test's timeout.

## Resolved after archive

The first item of "Known limitations" and the "grey" item of "Pending" were fixed on the same branch, with no new change, no spec edit and no new capture:

- **No credit anywhere in the launcher's card.** The owner does not want the credit visible in any share card, including the one the launcher's own status line draws into the frame. The frame is never retouched, so the `4d-os` card now copies a different 840×630 region of the same capture, `src/site/og/captures/4d-os.png` (901×1040, SHA-256 unchanged, so its record and its `LICENSES.md` row stay as they are): `{ x: 28, y: 158 }` instead of `{ x: 28, y: 368 }`. In the capture, the status line with the credit occupies rows 797 to 806, and the new region covers rows 158 to 787: it starts in the blank rows between "One scene." (ends at row 155) and "Three worlds." (starts at row 165), and ends below the rule under the windows (row 781), so it shows the heading "Three worlds.", its lede and the three world windows A, B and C, and no credit. Any region that holds the whole windows (bottom edge at row 752) and stops above row 797 includes that heading. `frameShows` stays `a`, `b`, `c`; the band is unchanged. The frame description (`depicts`) and the `/4d-os/` alt text now name the heading instead of "Two more plates.", which is no longer in the frame; the alt has 397 characters.
- **"gray" in the frame description of `4d-os-a`**, the spelling its alt already had after `94caca5`. The description is written only into `provenance.json`, not into the image or its sidecar.
- **Records.** `tools/capture-og.ts compose` changed exactly three of the 21 files in `sites/playground/public/og/`: `4d-os.png` (`6194ab77` → `a109f1b6`, 83,217 bytes; the built `og:image` of `/4d-os/` carries `?v=a109f1b6`), its sidecar and `provenance.json`. The nine other PNGs and their sidecars keep their SHA-256. The unit test "the frame is the recorded region of the source, copied pixel for pixel" counts 0 differing pixels in the new frame. Read at 1200×630 and at 300×157, the card shows no credit text in the frame or the band.
- **Gates**: `tsc --noEmit` exit 0; `npm test` 63 files, 764 tests pass, with and without `dist/`; `rm -rf dist && npm run build` exit 0 with zero `[museum]` lines; `tools/audit-site.ts dist` exit 0, every line `ok`; museum loops 001 a, b, c, 002 d, 003 e and 004 bloomscope FRESH; `openspec validate --specs --strict` 18 passed.
