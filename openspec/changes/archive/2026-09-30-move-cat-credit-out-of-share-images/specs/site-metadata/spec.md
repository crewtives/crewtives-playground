# Spec Delta

## MODIFIED Requirements

### Requirement: Open Graph and X card tags
Every public page SHALL carry, in its built head, Open Graph tags written as `<meta property="og:…" content="…">` and X tags written as `<meta name="twitter:…" content="…">`:
- `og:type` `website`, `og:site_name` `crewtives playground`, `og:locale` `en_US`, and `og:url` equal to the canonical URL;
- `og:title`: the share title, from 10 to 70 characters, naming the work or page. It SHALL begin with the page's name as its tab title gives it (the part of the tab title before the first " · "), and it MAY say more than the tab title;
- `og:description`: the description, from 50 to 160 characters, so that search results show it whole. It SHALL equal the page's own `<meta name="description">` after whitespace is collapsed, and the build SHALL fail when they differ;
- `og:image` as the absolute URL `https://playground.crewtives.com/og/<slug>.png?v=<version>`, where the version is the first 8 hexadecimal digits of the image file's SHA-256, with `og:image:width` 1200, `og:image:height` 630, `og:image:type` `image/png` and `og:image:alt`;
- `twitter:card` `summary_large_image`, plus `twitter:title`, `twitter:description`, `twitter:image` and `twitter:image:alt` with the same values.

The alt text SHALL describe what the image shows, frame and band, from 40 to 420 characters. When the frame shows the cat, the alt text SHALL also name the model the cat comes from and its license with the credit *"Cat" by J-Toastie, CC-BY 3.0*, exactly as `LICENSES.md` sets it, and it MUST NOT describe the credit as text of the band, which does not carry it. The alt text of a page whose frame does not show the cat MUST NOT carry the credit. A page MUST NOT carry two tags with the same property. Its source HTML MUST NOT already declare the tags that the build adds.

The tags the build adds (these tags, the canonical link, the icons and the structured data) SHALL come before the page's first `<style>` element, and the last of them SHALL end within the first 32 KiB of the page, so that link previews that read only the start of a page find them.

The launcher's description SHALL describe 4D.OS as it is published, and MUST NOT call it a local experiment.

#### Scenario: Complete tags
- **WHEN** the built head of any of the 10 pages is read
- **THEN** it has each tag listed above exactly once, with `property` on the `og:` tags and `name` on the `twitter:` tags, `og:image` is an absolute HTTPS URL to `/og/<slug>.png` whose `v` equals the start of that file's SHA-256, and `og:url` equals the canonical URL

#### Scenario: Found in the first 32 KiB
- **WHEN** the built `/`, whose head holds more than 60 KB of inline styles, is read
- **THEN** every tag the build added ends within its first 32 KiB and comes before its first `<style>`

#### Scenario: Description kept in step
- **WHEN** a page's `<meta name="description">` is edited and the registry is not
- **THEN** the build fails and names the page

#### Scenario: Launcher description
- **WHEN** the description of `/4d-os/` is read
- **THEN** it does not contain "local experiment"

#### Scenario: Descriptions that search results show whole
- **WHEN** the descriptions of the 10 pages are measured
- **THEN** each has from 50 to 160 characters, and those of `/`, `/landings/game-center/`, `/landings/wind-up-empire/`, `/4d-os/d/` and `/4d-os/e/` have at least 110

#### Scenario: Share title led by the page's name
- **WHEN** the share title of each page is compared with its tab title
- **THEN** it begins with the part of the tab title before the first " · ", for example "Vitrine" for `/4d-os/a/` and "crewtives playground" for `/`

#### Scenario: Credit in the alt text
- **WHEN** the `og:image:alt` and `twitter:image:alt` of `/4d-os/`, `/4d-os/a/`, `/4d-os/b/` and `/4d-os/c/` are read
- **THEN** each contains *"Cat" by J-Toastie, CC-BY 3.0*, has at most 420 characters and does not say that the band reads the credit, and the alt text of every other page does not contain the credit

### Requirement: Truthful, minimal structured data
Each public page SHALL carry one JSON-LD block:
- the museum at `/`: a `WebSite` named "crewtives playground", with its URL and with the publisher crewtives (`https://crewtives.com`);
- every other public page: a `CreativeWork` with its name, canonical URL, description, share image, language `en`, creator crewtives (`https://crewtives.com`), and a link to the site through `isPartOf`.

A page whose share image's frame shows the cat SHALL also name the upstream model with `isBasedOn`: a `CreativeWork` named "Cat", whose creator is the `Person` J-Toastie, with the CC-BY 3.0 license URL and the model's source URL, taken from the shared credit data of the worlds, the same data that gives the alt text its credit. Other pages MUST NOT carry `isBasedOn`.

The structured data MUST NOT claim ratings, reviews, prices, offers or dates, and MUST NOT name authors or creators beyond crewtives and the credited upstream sources. The 404 page MUST NOT carry structured data. The JSON-LD SHALL parse as JSON and MUST NOT contain the sequence `</`: characters that could close its script SHALL be written as JSON Unicode escapes.

#### Scenario: Home page
- **WHEN** the JSON-LD of `/` is parsed
- **THEN** it is a `WebSite` named "crewtives playground" with URL `https://playground.crewtives.com/`

#### Scenario: A work
- **WHEN** the JSON-LD of `/bloomscope/` is parsed
- **THEN** it is a `CreativeWork` whose `url` is the canonical URL, whose creator is crewtives, and it has no rating, offer, date or `isBasedOn`

#### Scenario: A work built on the cat
- **WHEN** the JSON-LD of `/4d-os/a/` is parsed
- **THEN** its `isBasedOn` is a `CreativeWork` named "Cat" by the `Person` J-Toastie, with license `https://creativecommons.org/licenses/by/3.0/` and the model's source URL as its `url`

#### Scenario: A value that could close the script
- **WHEN** a registry value contains `</script>` and the head is built
- **THEN** the JSON-LD block contains no `</`, and parsing it gives back the original value

### Requirement: The band says what the image is
The band of each share image SHALL show, in printable text:
- the page's title;
- the site name "crewtives playground" and, on the 4D.OS pages, "4D.OS";
- the mark "synthetic", when the frame shows a synthetic scene.

The band MUST NOT carry the cat's credit, even when the frame shows the cat. The band is a title block, and the credit travels with the image through its alt text, its page's structured data, its provenance records and `LICENSES.md` (see "Open Graph and X card tags", "Truthful, minimal structured data" and "Provenance of every share image"). This rule governs the band only: the frame is a real capture copied one for one, so it keeps whatever the page itself shows, including the page's own visible credit line, as the launcher's frame does.

The worlds a frame shows SHALL be declared in the registry, and whether they are synthetic and whose credit they need SHALL be read from the shared world data, never decided by hand. A frame that shows world A, B or C in any form (a live view, a still, a poster) shows the cat. A frame that shows a synthetic scene of the page's own, which is not a 4D.OS world, SHALL be declared in the registry as such, and only when the page itself labels that scene "Synthetic scene"; its band SHALL carry the mark too.

The band SHALL be set in the page's own self-hosted typefaces. Every character of the band text SHALL exist in the typeface that draws it. The band's text and background colors SHALL come from the page's own color tokens, with a contrast of at least 4.5:1. Its text SHALL stay at least 32 pixels from every edge of the image.

#### Scenario: Cat credit inside the image
- **WHEN** the share image of `/4d-os/`, `/4d-os/a/`, `/4d-os/b/`, `/4d-os/c/`, or of any page whose frame shows world A, B or C, is viewed on its own, and its band text is read from its record
- **THEN** the credit is not inside its band: no line of the band names the model, its author or its license, the recorded band text contains neither "J-Toastie" nor "CC-BY", and the page's alt text names *"Cat" by J-Toastie, CC-BY 3.0*

#### Scenario: Synthetic mark
- **WHEN** the share image of any page whose frame shows a 4D.OS world is viewed
- **THEN** its band reads "synthetic"

#### Scenario: Synthetic mark on a scene of the page's own
- **WHEN** the share image of `/landings/game-center/` is viewed, whose frame shows Rain Run on the cabinet screen, a scene the page labels "Synthetic scene"
- **THEN** its band reads "synthetic"

#### Scenario: No missing glyph
- **WHEN** each band string is checked against the character map of the typeface that draws it
- **THEN** every character is present

### Requirement: Provenance of every share image
Each share image SHALL have, next to it:
- a sidecar `<slug>.png.json`, in the `{ prompt, createdAt }` shape of the repository's other image sidecars. It SHALL state that the image was not generated, and name its source capture, the frame region, the band text and the image's SHA-256. When the frame shows the cat, it SHALL also state the cat's credit, *"Cat" by J-Toastie, CC-BY 3.0*, apart from the band text, and say that the band does not carry it;
- an entry in the folder's `provenance.json` that records:
  - the source file and its SHA-256;
  - how that capture was made: route, viewport, device pixel ratio, reduced motion, clock, browser version and renderer, or the provenance of the existing still it comes from;
  - the frame region;
  - the band text, typefaces and colors;
  - the credit the frame's subject requires, apart from the band text, or none;
  - the tool and its pinned versions;
  - the image's SHA-256 and weight.

Each share image SHALL have a row in `LICENSES.md`. An image whose frame shows the cat SHALL be marked as a derivative of a CC-BY 3.0 model that requires the cat's credit, and its row SHALL say where that credit travels with the image: its page's alt text and structured data, its sidecar and `provenance.json`, and the pages that show the cat.

Composing the images again from the same sources, with the same browser version on the same platform, SHALL write identical bytes and SHALL leave the sidecars and `provenance.json` unchanged.

#### Scenario: Sidecar matches the image
- **WHEN** the SHA-256 of each share image is computed
- **THEN** it equals the one stated in its sidecar and in `provenance.json`, and the recorded source file's SHA-256 matches the file in the repository

#### Scenario: Re-run changes nothing
- **WHEN** the share-image tool composes all images again without new captures
- **THEN** the SHA-256 of every file in the share-image folder, images, sidecars and `provenance.json`, is the same as before the run

#### Scenario: Credit in the records
- **WHEN** the sidecars and `provenance.json` entries of the four images whose frame shows the cat are read
- **THEN** each states *"Cat" by J-Toastie, CC-BY 3.0* outside the band text, the band text of each contains no credit, and the sidecars and entries of the other six images state no credit

#### Scenario: Licenses listed
- **WHEN** `LICENSES.md` is read
- **THEN** every share image has a row, and the rows of images that show the cat require the cat's credit and say where it travels with the image
