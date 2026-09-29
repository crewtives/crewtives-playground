# Spec Delta

## Purpose

Defines what every public page of playground.crewtives.com tells search engines and link previews, and the site files around it: one registry of page metadata, canonical URLs, Open Graph and X card tags, structured data, icons, share images made from real frames with their credits and provenance, `robots.txt`, `sitemap.xml`, the 404 page and noindex on the non-canonical host.

## ADDED Requirements

### Requirement: One registry for every public page
The site SHALL keep the metadata of its public pages in a single registry, the only place where it is written by hand. The registry SHALL have exactly one entry for each of these 10 routes, with the slug that names its share image:

| Route | Slug |
|---|---|
| `/` | `museum` |
| `/bloomscope/` | `bloomscope` |
| `/landings/game-center/` | `game-center` |
| `/landings/wind-up-empire/` | `wind-up-empire` |
| `/4d-os/` | `4d-os` |
| `/4d-os/a/` … `/4d-os/e/` | `4d-os-a` … `4d-os-e` |

Each entry SHALL hold:
- the route;
- the canonical URL;
- the share title;
- the description;
- the share image's path, width, height and alt text;
- the kind of structured data;
- which 4D.OS worlds the share image's frame shows.

The site's 404 page SHALL have one separate entry, marked as not indexable.

The registry SHALL cover exactly the HTML pages the two site builds produce. The build SHALL fail, naming the page, when it produces an HTML page that has no registry entry. A build of a single page (`PLAYGROUND_ONLY`) SHALL still succeed.

#### Scenario: Registry matches the builds
- **WHEN** the entry pages of the 4D.OS build and the playground build are mapped to their public routes
- **THEN** they are exactly the 10 routes of the registry plus the 404 page, with no route missing and none extra

#### Scenario: Unregistered page
- **WHEN** a new HTML entry page is added to either build without a registry entry and the build runs
- **THEN** the build fails and names that page

#### Scenario: Single-page build
- **WHEN** the playground is built with `PLAYGROUND_ONLY=museum`
- **THEN** the build succeeds and the museum carries its metadata

### Requirement: Canonical URL on every page
Every public page SHALL declare exactly one canonical link. It SHALL be the absolute URL `https://playground.crewtives.com` followed by the page's route, with the trailing slash the site serves. The canonical link SHALL be the same whatever host serves the page. The 404 page MUST NOT declare a canonical link.

#### Scenario: A world's canonical URL
- **WHEN** the built `/4d-os/d/` is read
- **THEN** its head has exactly one `<link rel="canonical" href="https://playground.crewtives.com/4d-os/d/">`

#### Scenario: Served from another host
- **WHEN** a page is requested from the Worker's `workers.dev` host
- **THEN** its canonical link still points to `https://playground.crewtives.com` and the same route

### Requirement: Open Graph and X card tags
Every public page SHALL carry, in its built head, Open Graph tags written as `<meta property="og:…" content="…">` and X tags written as `<meta name="twitter:…" content="…">`:
- `og:type` `website`, `og:site_name` `crewtives playground`, `og:locale` `en_US`, and `og:url` equal to the canonical URL;
- `og:title`: the share title, from 10 to 70 characters, naming the work or page. It MAY be more descriptive than the tab title, which this capability does not change;
- `og:description`: the description, from 50 to 200 characters. It SHALL equal the page's own `<meta name="description">` after whitespace is collapsed, and the build SHALL fail when they differ;
- `og:image` as the absolute URL `https://playground.crewtives.com/og/<slug>.png?v=<version>`, where the version is the first 8 hexadecimal digits of the image file's SHA-256, with `og:image:width` 1200, `og:image:height` 630, `og:image:type` `image/png` and `og:image:alt`;
- `twitter:card` `summary_large_image`, plus `twitter:title`, `twitter:description`, `twitter:image` and `twitter:image:alt` with the same values.

The alt text SHALL describe what the image shows, frame and band, from 40 to 420 characters. It SHALL include the cat's credit when the image carries it. A page MUST NOT carry two tags with the same property. Its source HTML MUST NOT already declare the tags that the build adds.

The tags the build adds (these tags, the canonical link, the icons and the structured data) SHALL come before the page's first `<style>` element, and the last of them SHALL end within the first 32 KiB of the page, so that link previews that read only the start of a page find them.

The launcher's description SHALL describe 4D.OS as it is published, in at most 160 characters, and MUST NOT call it a local experiment.

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

### Requirement: Truthful, minimal structured data
Each public page SHALL carry one JSON-LD block:
- the museum at `/`: a `WebSite` named "crewtives playground", with its URL and with the publisher crewtives (`https://crewtives.com`);
- every other public page: a `CreativeWork` with its name, canonical URL, description, share image, language `en`, creator crewtives (`https://crewtives.com`), and a link to the site through `isPartOf`.

A page whose share image shows the cat SHALL also name the upstream model with `isBasedOn`: a `CreativeWork` named "Cat", whose creator is the `Person` J-Toastie, with the CC-BY 3.0 license URL and the model's source URL, taken from the same credit data as the band. Other pages MUST NOT carry `isBasedOn`.

The structured data MUST NOT claim ratings, reviews, prices, offers or dates, and MUST NOT name authors or creators beyond crewtives and the credited upstream sources. The 404 page MUST NOT carry structured data. The JSON-LD SHALL parse as JSON and MUST NOT contain the sequence `</`: characters that could close its script SHALL be written as JSON Unicode escapes.

#### Scenario: Home page
- **WHEN** the JSON-LD of `/` is parsed
- **THEN** it is a `WebSite` named "crewtives playground" with URL `https://playground.crewtives.com/`

#### Scenario: A work
- **WHEN** the JSON-LD of `/bloomscope/` is parsed
- **THEN** it is a `CreativeWork` whose `url` is the canonical URL, whose creator is crewtives, and it has no rating, offer, date or `isBasedOn`

#### Scenario: A work built on the cat
- **WHEN** the JSON-LD of `/4d-os/a/` is parsed
- **THEN** its `isBasedOn` is a `CreativeWork` named "Cat" by the `Person` J-Toastie, with license `https://creativecommons.org/licenses/by/3.0/`

#### Scenario: A value that could close the script
- **WHEN** a registry value contains `</script>` and the head is built
- **THEN** the JSON-LD block contains no `</`, and parsing it gives back the original value

### Requirement: Real icons
Every built page SHALL declare an icon that is a real file or its own drawn icon. None SHALL keep the empty `data:,` placeholder. The site SHALL serve:
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

### Requirement: Share images are real frames
Each public page SHALL have a share image at `/og/<slug>.png`: a lossless PNG of 1200×630 pixels weighing at most 300 KB. The image SHALL be made of two regions side by side:
- **The frame**, 840×630 at the left: a region of a real capture of that page's live render. Its pixels SHALL be copied one for one, with no scaling, re-dithering, overlaid pattern, filter or retouching.
- **The band**, 360×630 at the right, beside the frame and never over it.

A frame whose capture would exceed the weight budget SHALL use another region of the capture. It MUST NOT use a lossy format or a scaled copy.

#### Scenario: Frame copied exactly
- **WHEN** the frame region of each share image is compared pixel by pixel with the recorded region of its source capture
- **THEN** there are 0 differing pixels

#### Scenario: Size and weight
- **WHEN** the 10 share images are measured
- **THEN** each is a 1200×630 PNG of at most 300 KB

### Requirement: The band says what the image is
The band of each share image SHALL show, in printable text:
- the page's title;
- the site name "crewtives playground" and, on the 4D.OS pages, "4D.OS";
- the mark "synthetic", when the frame shows a synthetic scene;
- the credit *"Cat" by J-Toastie, CC-BY 3.0*, exactly as `LICENSES.md` sets it, when the frame shows the cat.

The worlds a frame shows SHALL be declared in the registry, and whether they are synthetic and whose credit they need SHALL be read from the shared world data, never decided by hand. A frame that shows world A, B or C in any form (a live view, a still, a poster) shows the cat.

The band SHALL be set in the page's own self-hosted typefaces. Every character of the band text SHALL exist in the typeface that draws it. The band's text and background colors SHALL come from the page's own color tokens, with a contrast of at least 4.5:1. Its text SHALL stay at least 32 pixels from every edge of the image.

#### Scenario: Cat credit inside the image
- **WHEN** the share image of `/4d-os/a/`, `/4d-os/b/`, `/4d-os/c/`, or of any page whose frame shows world A, B or C, is viewed on its own
- **THEN** its band reads *"Cat" by J-Toastie, CC-BY 3.0*

#### Scenario: Synthetic mark
- **WHEN** the share image of any page whose frame shows a 4D.OS world is viewed
- **THEN** its band reads "synthetic"

#### Scenario: No missing glyph
- **WHEN** each band string is checked against the character map of the typeface that draws it
- **THEN** every character is present

### Requirement: Provenance of every share image
Each share image SHALL have, next to it:
- a sidecar `<slug>.png.json`, in the `{ prompt, createdAt }` shape of the repository's other image sidecars. It SHALL state that the image was not generated, and name its source capture, the frame region, the band text and the image's SHA-256;
- an entry in the folder's `provenance.json` that records:
  - the source file and its SHA-256;
  - how that capture was made: route, viewport, device pixel ratio, reduced motion, clock, browser version and renderer, or the provenance of the existing still it comes from;
  - the frame region;
  - the band text, typefaces and colors;
  - the tool and its pinned versions;
  - the image's SHA-256 and weight.

Each share image SHALL have a row in `LICENSES.md`. An image whose frame shows the cat SHALL be marked as a derivative of a CC-BY 3.0 model that requires the cat's credit.

Composing the images again from the same sources, with the same browser version on the same platform, SHALL write identical bytes and SHALL leave the sidecars and `provenance.json` unchanged.

#### Scenario: Sidecar matches the image
- **WHEN** the SHA-256 of each share image is computed
- **THEN** it equals the one stated in its sidecar and in `provenance.json`, and the recorded source file's SHA-256 matches the file in the repository

#### Scenario: Re-run changes nothing
- **WHEN** the share-image tool composes all images again without new captures
- **THEN** the SHA-256 of every file in the share-image folder, images, sidecars and `provenance.json`, is the same as before the run

#### Scenario: Licenses listed
- **WHEN** `LICENSES.md` is read
- **THEN** every share image has a row, and the rows of images that show the cat require the cat's credit

### Requirement: Development-only share-image tool
The tool that captures and composes the share images SHALL live in the repository, outside what the build publishes, and SHALL run only in development through a documented command. It MUST NOT add dependencies to `package.json`. Its automated browser SHALL have a pinned version, recorded in the provenance. It SHALL write only the share images, their sidecars and provenance, the new source captures and the icon rasters. It MUST NOT require the works to carry code, routes or hooks that exist only for it.

#### Scenario: Clean output
- **WHEN** the production build output, except the provenance records, is searched for the tool's name, code or texts
- **THEN** they do not appear; only the provenance records (`provenance.json` and the sidecars) may name the tool, as they must

### Requirement: robots.txt
The site SHALL serve `/robots.txt` as plain text, generated during the build from the same site origin as the registry. It SHALL allow every crawler on every path and SHALL name the sitemap with the absolute line `Sitemap: https://playground.crewtives.com/sitemap.xml`.

#### Scenario: Robots file
- **WHEN** `/robots.txt` is requested
- **THEN** it responds 200 with `User-agent: *`, `Allow: /` and the absolute sitemap line

### Requirement: sitemap.xml
The site SHALL serve `/sitemap.xml`: a sitemap generated from the registry during the build, that lists exactly the canonical URLs of the 10 public pages. It SHALL start with an XML declaration with UTF-8 encoding, its root SHALL be `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, and each `<loc>` SHALL be XML-escaped and equal a canonical URL exactly (absolute HTTPS, trailing slash, no fragment). It MUST NOT list the 404 page or a redirected URL. It MUST NOT carry `lastmod` values derived from file times or git history.

#### Scenario: Ten URLs
- **WHEN** `/sitemap.xml` is parsed
- **THEN** it has the UTF-8 XML declaration and the sitemaps.org 0.9 `urlset`, lists exactly the 10 canonical URLs, each `<loc>` equal to one of them, and no `lastmod`

### Requirement: The 404 page
A request for a path that the site does not serve and does not redirect SHALL receive a 404 status with the site's 404 page. This holds for any path depth, including under `/4d-os/`. Existing redirects SHALL keep taking precedence.

The 404 page SHALL:
- use the museum's visual language (its tokens and typefaces);
- say plainly that there is no page at that address;
- link, as real links, to the museum at `/`, to the 4D.OS launcher at `/4d-os/` and to the other public pages;
- be titled "Not found · crewtives playground";
- carry `<meta name="robots" content="noindex">`;
- carry no JavaScript;
- request its styles and fonts with root-absolute URLs, so that it renders the same at any depth.

Every character of its visible text SHALL exist in the museum typefaces that draw it; in particular it MUST NOT show `←`, which those typefaces lack.

The 404 page SHALL meet the `playground-hub` requirements for English copy, accessibility, typefaces, external origins and limited flashes. "Demo honesty" does not apply: it governs the museum and the landings, and the 404 page shows no work, synthetic scene, library or model to label or credit. The requirements for the index being reachable, sound, reduced motion, color depth, the WebGL2 fallback, the demo index and the load budget do not apply either, because it has no index, sound, motion or 3D view.

The file `404.html` is also reachable at its own address (`/404`, and `/404.html`, which redirects to it). There it answers with a 200; it SHALL still carry `noindex` and MUST NOT be in the sitemap.

#### Scenario: Unknown path
- **WHEN** `/nope` is requested
- **THEN** the response is a 404 with the 404 page, whose links lead to `/` and `/4d-os/`

#### Scenario: Unknown path under 4D.OS
- **WHEN** `/4d-os/nope` is requested
- **THEN** the response is a 404 with the same 404 page, rendered with its styles and fonts

#### Scenario: Redirects first
- **WHEN** `/landings/` is requested
- **THEN** the response is still the 301 to `/`

#### Scenario: Not indexed
- **WHEN** the 404 page is read
- **THEN** it has `noindex`, no canonical link and no structured data, and it is not in the sitemap

#### Scenario: Its own address
- **WHEN** `/404` is requested
- **THEN** the response carries the 404 page with `noindex`, and `/404` is not in the sitemap

### Requirement: Noindex on the non-canonical host
Every page, site file and image that the Worker serves with a 200 on a `workers.dev` host of the Worker, including its preview hosts, SHALL carry the header `X-Robots-Tag: noindex`. Responses served on `playground.crewtives.com` MUST NOT carry it. Redirects and 404 responses are not required to carry it: the hosting platform applies redirects before headers, and neither has content to index.

The rule SHALL name the host only through placeholders (`https://:version.:subdomain.workers.dev/*`), never a real subdomain or account.

#### Scenario: Custom domain
- **WHEN** any page is requested on `playground.crewtives.com`
- **THEN** the response has no `X-Robots-Tag` header

#### Scenario: workers.dev host
- **WHEN** any page is requested on the Worker's `workers.dev` host
- **THEN** the response carries `X-Robots-Tag: noindex`

### Requirement: Metadata leaves the works as they are
Adding the metadata MUST NOT change what any page shows or does. Every public page SHALL show the same visible text and paint the same pixels, at desktop and phone widths and without JavaScript. The only new requests SHALL be for icons, and the only new elements SHALL be the head tags this capability adds. No file under any museum sheet's `sources` SHALL change, so every museum loop stays fresh and the build prints no `[museum]` warning.

#### Scenario: Same pages
- **WHEN** fingerprints of the 10 routes at desktop width, at phone width and without JavaScript are compared with those taken before the change
- **THEN** visible text and pixels are identical, and the only request differences are icon files

#### Scenario: Loops fresh
- **WHEN** the production build runs after the change
- **THEN** it prints no line containing `[museum]`

### Requirement: Audit of the built output
A documented command SHALL audit the built output and fail, naming the page and the rule, when any requirement of this capability that can be read from the files is broken. That covers:
- the tags and their values;
- the files that `og:image` and the icons point to, and their sizes;
- the JSON-LD;
- `robots.txt` and `sitemap.xml`;
- the 404 page;
- the `_headers` rule.

`npm test` MUST NOT depend on the built output.

#### Scenario: Audit passes
- **WHEN** the audit runs on a fresh production build
- **THEN** it exits with 0 and prints one line per page checked

#### Scenario: Audit catches a missing image
- **WHEN** one share image is removed from the built output and the audit runs
- **THEN** it exits with a non-zero code and names the page and the missing file
