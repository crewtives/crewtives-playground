# Proposal

## Why

The share images of `/4d-os/` and of worlds A, B and C draw the line *"Cat" by J-Toastie, CC-BY 3.0* at the foot of their band. Seen on the finished cards, the line weighs down a band that is otherwise a title block (series, site, title, "synthetic"), and it reads badly there. CC-BY 3.0 section 4(b) lets the credit be given "in any reasonable manner", so the band no longer carries the credit, and the credit travels with each image through its metadata, its records and the page it belongs to instead.

## What Changes

- The band of the four share images whose frame shows the cat (`4d-os`, `4d-os-a`, `4d-os-b`, `4d-os-c`) no longer draws the cat's credit. It keeps the series "4D.OS", the site name, the title and the mark "synthetic". Nothing else about the cards changes: frames, regions, typefaces, colors, the layout rule and titles stay as they are. Under that same rule the mark drops to the band's foot, where the credit was, so the four bands end up laid out like those of worlds D and E, with the mark alone at the foot (design D3).
- The cat's credit keeps traveling with those four images, in five places (design D2):
  1. their pages' `og:image:alt` and `twitter:image:alt`, which name the model and its license;
  2. their pages' JSON-LD `isBasedOn` (the "Cat" model, the `Person` J-Toastie, the CC-BY 3.0 license URL and the model's source URL), unchanged;
  3. each image's provenance sidecar and its entry in `provenance.json`, which state the credit on their own, apart from the band text;
  4. `LICENSES.md`, whose row for those images stays marked as a derivative of the CC-BY 3.0 model and now says where the credit travels;
  5. the visible credit on every page that shows the cat, unchanged.
- The four images are composed again from the same frames, so their bytes, sidecars, records and `?v=` versions change. The other six images keep their bytes and sidecars.
- The alt texts of the four pages describe the band as it now is and name the credit as the source of the frame's subject, within the existing 40 to 420 character bound.
- `README.md`, `docs/site-metadata.md`, `docs/glossary.md` and `LICENSES.md` stop saying that the credit is inside the image.

Production deploy is not part of this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-metadata`: "Open Graph and X card tags" (the alt text names the cat's credit when the frame shows the cat, rather than when the image carries it); "Truthful, minimal structured data" (`isBasedOn` is taken from the shared credit data, no longer "the same credit data as the band"); "The band says what the image is" (the band MUST NOT carry the cat's credit); "Provenance of every share image" (the sidecar and `provenance.json` state the credit apart from the band text, and the `LICENSES.md` row says where it travels).
- `public-repository`: "Licenses and credits" (the credit no longer appears inside the share images; it travels with them through the five places above).

## Impact

- **Code:** `src/site/pages.ts` (the four alt texts and a comment), `src/site/og/cards.ts` (the band text loses its credit, and the credit's size and line constants go), `tools/capture-og.ts` (the band's credit markup, styles and check go; the record and the sidecar state the credit; an image whose bytes do not change keeps its sidecar's date), and the tests `src/site/pages.test.ts` and `src/site/og/cards.test.ts`.
- **Images:** `sites/playground/public/og/4d-os.png`, `4d-os-a.png`, `4d-os-b.png`, `4d-os-c.png`, their sidecars and `provenance.json`. No capture is taken again, and no frame pixel changes.
- **Docs:** `LICENSES.md`, `README.md`, `docs/site-metadata.md`, `docs/glossary.md`.
- **Not touched:** no page's HTML, no file under a museum sheet's `sources` (`src/playground/shared/worlds.ts` and its `CAT_CREDIT` included), so every museum loop stays fresh. No dependency changes.
- **After deploy:** link previews cache images by URL; the new `?v=` versions make a re-scraped card fetch the new images.
