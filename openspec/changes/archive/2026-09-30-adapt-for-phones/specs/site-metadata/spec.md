# Spec Delta

## MODIFIED Requirements

### Requirement: Open Graph and X card tags
Every public page SHALL carry, in its built head, Open Graph tags written as `<meta property="og:…" content="…">` and X tags written as `<meta name="twitter:…" content="…">`:
- `og:type` `website`, `og:site_name` `crewtives playground`, `og:locale` `en_US`, and `og:url` equal to the canonical URL;
- `og:title`: the share title, from 10 to 70 characters, naming the work or page. It SHALL begin with the page's name as its tab title gives it (the part of the tab title before the first " · "), and it MAY say more than the tab title;
- `og:description`: the description, from 50 to 160 characters, so that search results show it whole. It SHALL equal the page's own `<meta name="description">` after whitespace is collapsed, and the build SHALL fail when they differ;
- `og:image` as the absolute URL `https://playground.crewtives.com/og/<slug>.png?v=<version>`, where the version is the first 8 hexadecimal digits of the image file's SHA-256, with `og:image:width` 1200, `og:image:height` 630, `og:image:type` `image/png` and `og:image:alt`;
- `twitter:card` `summary_large_image`, plus `twitter:title`, `twitter:description`, `twitter:image` and `twitter:image:alt` with the same values.

The alt text SHALL describe what the image shows, frame and band, from 40 to 420 characters. It SHALL include the cat's credit when the image carries it. A page MUST NOT carry two tags with the same property. Its source HTML MUST NOT already declare the tags that the build adds.

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

### Requirement: Real icons
Every built page SHALL declare an icon that is a real file or its own drawn icon. None SHALL keep the empty `data:,` placeholder, and no page's source SHALL declare it: a page with no icon of its own gets the site's icon from the build, and the build SHALL fail, naming the page, when a source declares the placeholder. The site SHALL serve:
- `/favicon.ico`, with 16, 32 and 48 pixel images, declared with `sizes="16x16 32x32 48x48"`;
- `/apple-touch-icon.png`, 180×180;
- `/icon.svg`, the museum's mark;
- `/4d-os/icon.svg` and `/4d-os/apple-touch-icon.png`, the 4D.OS mark.

The 4D.OS pages SHALL use the 4D.OS icons, and the playground pages the playground's. A page that already draws its own icon SHALL keep it, declared after any icon the build adds. The home page SHALL also declare `/favicon.ico`, so that search engines, which need a crawlable raster icon on the home page, find one. The icon meant for Google Search is the 180×180 apple-touch-icon, which is larger than 48×48; the ICO is the fallback for crawlers that only request `/favicon.ico`.

#### Scenario: No placeholder left
- **WHEN** the built HTML pages are searched for `href="data:,"`
- **THEN** there is no match

#### Scenario: Icons served
- **WHEN** `/favicon.ico`, `/apple-touch-icon.png`, `/icon.svg`, `/4d-os/icon.svg` and `/4d-os/apple-touch-icon.png` are requested
- **THEN** each responds 200 with its image type

#### Scenario: No placeholder in the sources
- **WHEN** the HTML sources of the 10 pages are searched for `href="data:,"`
- **THEN** there is no match, and each built 4D.OS page and Wind-Up Empire declares the same icons as before the placeholders were removed

#### Scenario: Placeholder put back
- **WHEN** a page's source declares `<link rel="icon" href="data:,">` and the build runs
- **THEN** the build fails and names that page

### Requirement: Metadata leaves the works as they are
Adding the metadata tags MUST NOT change what any page shows or does. A page built with the tags this capability adds SHALL show the same visible text and paint the same pixels as the same page built without them, at desktop and phone widths and without JavaScript. The only additional requests SHALL be for icons, and the only additional elements SHALL be the head tags this capability adds. The wording that "Tab titles and self-description" sets is page content, not a metadata tag, and is outside this comparison. A metadata change that edits a file under a museum sheet's `sources` (a world's `<title>`, meta description or icon line) SHALL record that sheet's loop again in the same change, with every frame and poster unchanged, so that every museum loop stays fresh and the build prints no `[museum]` warning.

#### Scenario: Same pages
- **WHEN** fingerprints of the 10 routes at desktop width, at phone width and without JavaScript are taken from a build with the metadata tags and from the same sources built without them
- **THEN** visible text and pixels are identical, and the only request differences are icon files

#### Scenario: Loops fresh
- **WHEN** the production build runs after the change
- **THEN** it prints no line containing `[museum]`

## ADDED Requirements

### Requirement: Tab titles and self-description
The tab titles of the museum and of the landings are those of `playground-hub` "Demo honesty". The 4D.OS pages SHALL be titled:
- the launcher `/4d-os/`: "4D.OS · crewtives playground";
- each world: "<World> · 4D.OS · crewtives playground", with the world's name as the playground's shared index gives it: "Vitrine", "Plate", "Leader", "The golden stoop" and "Whale fall".

No page SHALL describe the site or itself as a "local experiment", because the site is public. The footer lines of worlds A to E SHALL call it "a playground experiment", and the launcher's bar note "Playground experiment", keeping the rest of each line.

#### Scenario: No local experiment
- **WHEN** the visible text and the meta descriptions of the ten public pages are searched for "local experiment", ignoring case
- **THEN** there is no match

#### Scenario: Titles of the 4D.OS pages
- **WHEN** `/4d-os/` and `/4d-os/a/` through `/4d-os/e/` are opened
- **THEN** their tabs read "4D.OS · crewtives playground", "Vitrine · 4D.OS · crewtives playground", "Plate · 4D.OS · crewtives playground", "Leader · 4D.OS · crewtives playground", "The golden stoop · 4D.OS · crewtives playground" and "Whale fall · 4D.OS · crewtives playground"

#### Scenario: Footer lines
- **WHEN** the footers of worlds A to E and the launcher's bar are read at 1440×900
- **THEN** A reads "A playground experiment. The scene is synthetic.", B, C, D and E read "A playground experiment, 2026" where they read "A local experiment, 2026", and the launcher's bar note reads "Playground experiment · synthetic scene"
