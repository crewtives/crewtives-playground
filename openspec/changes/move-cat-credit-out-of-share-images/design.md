# Design

## Context

See `proposal.md` for why. The current state:

- `add-seo-and-sharing` D5 composes each share image from an 840×630 frame, copied pixel for pixel from a real capture, and a 360×630 band. The band's foot holds the mark "synthetic" and, when `creditFor(page)` returns the cat's credit, the line *"Cat" by J-Toastie, CC-BY 3.0*, set at 20 px over at most two lines. Four images carry it today: `4d-os`, `4d-os-a`, `4d-os-b` and `4d-os-c`.
- `src/site/pages.ts` holds the registry. `creditFor(page)` reads the credit from `WORLDS` in `src/playground/shared/worlds.ts` through the worlds in `frameShows`; the alt texts, the JSON-LD `isBasedOn` (`src/site/head.ts`), the audit (`tools/audit-site.ts`) and the `LICENSES.md` row check in `src/site/og/cards.test.ts` all depend on it. None of that changes.
- `src/site/og/cards.ts` builds the band's strings in `bandText(card)`, whose `credit` field is `creditFor(page)?.text`. `tools/capture-og.ts` draws the band from it (the `.credit` paragraph, its `.keep` spans, `CREDIT_SIZE`, `CREDIT_LINES` and a line-count check), writes the `band.text` and a top-level `credit` into each `provenance.json` entry, and writes the band's strings, credit included, into each sidecar's `prompt`.
- The alt texts of the four pages end with ", with the mark “synthetic” and the credit "Cat" by J-Toastie, CC-BY 3.0.". They measure 417 (`4d-os`), 401 (`4d-os-a`), 382 (`4d-os-b`) and 419 (`4d-os-c`) characters, against a bound of 420.
- The launcher's frame, a real capture of `/4d-os/`, shows the launcher's own status line, which credits the cat model on the page. It is page content, copied with the frame.
- No file this change touches is under a museum sheet's `sources` (`src/playground/museum/collection.ts`): `src/site/`, `tools/`, `sites/playground/public/og/` and the docs are outside them, and `CAT_CREDIT` in `worlds.ts` stays as it is.

## Goals / Non-Goals

**Goals:**

- The band of every share image carries no credit line.
- The cat's credit stays attached to each of the four images in every channel that travels with it, and the visible credit stays on every page that shows the cat.
- The six images that never carried the credit keep their bytes, sidecars and `?v=` versions.

**Non-Goals:**

- Any other change to the cards: frames, regions, captures, typefaces, colors, titles, layout, the mark "synthetic".
- Retouching or re-capturing a frame, including the launcher's frame, which shows the page's own credit line.
- Changing the credit data (`CAT_CREDIT`, `CAT_MODEL`), the JSON-LD, the on-page credits or any page's HTML.
- Deploying, and forcing link-preview platforms to re-scrape.

## Decisions

### D1. The band no longer carries the credit

The band no longer carries the credit. On the finished cards, a two-line credit under the mark competes with the band's title block (series, site, title, "synthetic") and reads as clutter, and CC-BY 3.0 section 4(b) lets the credit be given "in any reasonable manner", which the channels of D2 do. This supersedes the one point of `add-seo-and-sharing` D5 that put the credit at the band's foot, and the reason D5 gave for it: that the image travels away from the page is now answered by the image's metadata, not its pixels.

The rule covers the band only. A frame is a real capture copied one for one (`site-metadata`, "Share images are real frames"), so whatever the page itself shows stays in it, including the launcher's own credit line in the `4d-os` frame. That line is part of the page, not something the tool draws.

**Alternative rejected: keeping a smaller credit in the band.** A one-line credit at 14 or 16 px would still sit in the same title block and change its look the same way, only fainter. It would also be illegible where it matters most: `add-seo-and-sharing` already measured the 20 px credit at about 8 px in a 500 px wide card, so a smaller one reads at about 6 or 7 px, a credit that is there but cannot be read. Also rejected: moving the credit into the frame as an overlay, which the frame's copy-one-for-one rule forbids.

### D2. Where the credit travels

Section 4(b) asks for the name of the original author, the title of the work, the URI the licensor specifies and, for an adaptation, a credit that is "at least as prominent as the credits for the other contributing authors" whenever a credit for all contributing authors appears. Each of the four images keeps the credit in five places:

1. **The page's `og:image:alt` and `twitter:image:alt`.** They are the metadata that link previews read together with the image. The alt text describes the band as it now is and then names the model the cat comes from (D6).
2. **The page's JSON-LD `isBasedOn`**: a `CreativeWork` named "Cat", by the `Person` J-Toastie, with the CC-BY 3.0 license URL and the model's source URL. It already exists and does not change; the spec now anchors it to the shared credit data instead of "the same credit data as the band".
3. **The image's sidecar and its `provenance.json` entry**, which state the credit apart from the band text (D4).
4. **`LICENSES.md`**, whose row for the four images stays "Derivative of a CC-BY 3.0 model: requires the cat's credit" and now says where the credit travels.
5. **The pages that show the cat**, whose visible credit does not change. A link preview opens the page it was made for, and that page credits the cat.

The band names the site ("crewtives playground") as part of its title block. It is not a list of contributing authors, so the proviso on prominence does not reach it. Where authorship is credited (the JSON-LD's `creator` and `isBasedOn`, the museum's colophon and each page's credit line), the cat's credit sits next to crewtives with the same weight. This is the project's reading of the license, not legal advice.

**Alternative rejected: dropping the credit from the alt text too, and relying on the pages.** The alt text is the only channel that travels inside the link preview itself, together with the image, and it costs nothing visible. Also rejected: writing the credit into the PNG as a text chunk. Platforms re-encode preview images and drop such chunks, it would change the encoder that `png.test.ts` holds to exact bytes, and the sidecar already records the credit next to the file.

### D3. The layout rule stays, and the mark drops to the foot

The band's layout rule does not change. Its foot is pushed to the bottom (`margin-top: auto` on `.foot`), so once the credit is gone the mark is the foot's last item and drops to the bottom margin, 32 px from the bottom edge, where the marks of worlds D and E already sit. In `4d-os-a`, for example, the mark moves from about y 505 to about y 570, by the credit's height plus the 14 px gap. That drop is the whole re-balance, and it is the rule every band already follows, not a new layout. The title is fitted by its own width and line count only, so its size does not depend on the foot, and the four titles keep the sizes recorded in `provenance.json` (56 px for "Vitrine", and so on). The series, the site name and the title do not move; only the foot, from the old mark's top edge down to the bottom margin, changes.

**Alternative rejected: pinning the mark at its old height, with an empty strip beneath it where the credit was.** It would be a layout of its own, found on four cards only, and it would leave exactly the awkward gap under the mark that a band without a credit should not have. Also rejected: moving the mark up under the title, or enlarging the title into the freed space, which would change the layout and the titles, and make the four cat cards differ from the six others, where the mark sits at the foot.

### D4. The data: the band text loses its credit, the records keep it

- `BandText` in `src/site/og/cards.ts` loses its `credit` field, and `bandRuns` loses the credit's run. `CREDIT_SIZE` and `CREDIT_LINES` go, since nothing uses them any more.
- `creditFor(page)` keeps its meaning, the credit that the frame's subject requires, and keeps driving the alt check, the JSON-LD, the audit and the `LICENSES.md` row check. Its comment changes from the credit the share image "must carry" to the credit that travels with it.
- `tools/capture-og.ts` drops the `.credit` paragraph, its `.keep` spans and styles, and the credit's line check; the collision message becomes "the title runs into the mark". Each `provenance.json` entry keeps its top-level `credit`, now taken from `creditFor(page)` rather than from the band text, and its `band.text` no longer has a `credit` key.
- The sidecar's `prompt` lists the band's strings without the credit and, for an image whose frame shows the cat, adds one sentence after them: `Credit: the frame shows the cat of "Cat" by J-Toastie, CC-BY 3.0 (<model source URL>); the band does not carry it: it travels with the image in its page's og:image:alt, twitter:image:alt and JSON-LD isBasedOn, in provenance.json and in LICENSES.md.`, built from `CAT_CREDIT`. Sidecars of images without the cat do not change.

**Alternative rejected: keeping `credit` in `BandText` and setting it to `null` everywhere.** A field of the band that is always empty tells a reader of the records that the band could carry a credit. Also rejected: renaming the record's `credit` to something like `requiredCredit`, which would change the keys of all ten records for a meaning the spec already states.

### D5. Compose again, without capturing, and keep the dates of unchanged images

Only `compose` runs. No capture is taken and no source changes, so every frame stays byte-identical and the four images change only in the band. A composition whose bytes are unchanged today skips the image entirely and keeps its old record. After D4, the six images without the cat would keep records whose `band.text` still holds `credit: null`, which the test comparing the recorded band text with `bandText(card)` rejects. So the rule for an image whose bytes are unchanged becomes: keep its sidecar's `createdAt`, and rewrite its record and its sidecar from the current inputs. For the six images that gives the same sidecar (their prompt names no credit) and a record without the stale key. Composing again after that writes the same bytes, records and sidecars, as "Re-run changes nothing" requires.

The composition runs on the platform and Chromium version that `provenance.json` records for all ten images, so that the six other bands rasterize to the same bytes.

**Alternative rejected: editing `provenance.json` by hand to drop the six stale keys.** Records must come from the tool that made the images, or a later run silently disagrees with them. Also rejected: deleting the six records and composing them again as new, which gives images whose bytes did not change a new `createdAt`, a date that says they were made again when they were not.

### D6. The alt text's wording

The four alt texts keep their description of the frame and of the band, which now ends with the mark: ", with the mark “synthetic”." Then they add "Cat model: "Cat" by J-Toastie, CC-BY 3.0.", with the credit taken from `CAT_CREDIT.text`, so that `pages.test.ts` keeps finding the exact credit. The new ending is 3 characters shorter than the old one: `4d-os` goes to 414 characters, `4d-os-a` to 398, `4d-os-b` to 379 and `4d-os-c` to 416, all within 420.

**Alternative rejected: "The cat comes from "Cat" by J-Toastie, CC-BY 3.0."** It reads more smoothly, but it is 2 characters longer than the old ending and takes `4d-os-c` to 421, over the bound. Raising the bound was rejected too: 420 characters is already long for a screen reader, and the bound is part of the spec for every page.

## Risks / Trade-offs

- **[The image is re-posted on its own, without its metadata]** → Then no credit travels with it. The site publishes each image only as the preview of a page that credits the cat, and the repository keeps its sidecar and its `LICENSES.md` row. Anyone who re-posts the image is bound by CC-BY 3.0 themselves, and the image's row says so.
- **[Most previews never show the alt text]** → The card links to its page, which shows the credit, and the alt text is read by screen readers and by the platforms that expose it. That is a reasonable manner for a 1200×630 preview of a page that credits its source (D2).
- **[The launcher's frame still shows the page's credit line]** → Intended. It is the page's own content, and a frame is never retouched (D1).
- **[Cached cards keep the old images for a while]** → The old images carry more credit, not less, so nothing is lost. The new `?v=` versions make a re-scraped card fetch the new image.
- **[Composing on another platform changes the six other images]** → Text rasterizes differently between operating systems. The composition runs where `provenance.json` says the images were made (D5); on another platform the task stops and reports instead of committing six changed images.

## Migration Plan

1. Change the registry, the card data, the tool and the tests; compose the images; update `LICENSES.md` and the docs (see `tasks.md`).
2. After merging, a deploy, which is not part of this change, publishes the four new images under new `?v=` versions. Platforms that cached a card pick up the new image when they scrape the page again.
3. Rollback: revert the change's commit. The old images, records and alt texts come back with their old versions.
4. When the change is archived, `docs/openspec-workflow.md` gets its row in "The changes, in order" and a short section, as every archived change does.
