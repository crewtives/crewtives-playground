# Spec Delta

## MODIFIED Requirements

### Requirement: Licenses and credits
The owner's code SHALL be published under the MIT license, in a `LICENSE` file at the root and in the `license` field of `package.json`. The `LICENSE` or the README SHALL state that third-party assets keep their own licenses. That covers typefaces, 3D models, generated files and anything derived from the CC-BY "Cat" model, all listed in `LICENSES.md`.

`LICENSES.md` SHALL have one row per third-party asset in the repository, with its license and the location of its license text. Each row SHALL be correct against the asset's upstream license. `LICENSES.md` SHALL also have a row for every share image, marked as a derivative of the CC-BY model when it shows the cat.

The CC-BY credit of the "Cat" model SHALL keep appearing on every page that shows the cat. The share images that show the cat are seen on other sites, away from the page, so the credit SHALL travel with each of them without being drawn into its band:
- in its page's `og:image:alt` and `twitter:image:alt`, which name the model and its license;
- in its page's structured data, as `isBasedOn`;
- in the image's provenance sidecar and its entry in `provenance.json`;
- in the image's row in `LICENSES.md`, which says where the credit travels.

The band of a share image MUST NOT carry the credit (`site-metadata`, "The band says what the image is"). The README's credits SHALL say where the credit travels with the share images, and MUST NOT say that it is inside them.

#### Scenario: Reusing the code
- **WHEN** a reader wants to reuse the engine in their own project
- **THEN** `LICENSE` grants it under MIT with the unmodified MIT text, so that GitHub detects the license, and the README's credits section tells them which assets are excluded

#### Scenario: Every asset listed
- **WHEN** each typeface, model and derived binary in the repository is compared with `LICENSES.md`
- **THEN** each one has a row with its license, and the row's copyright notice matches the upstream one

#### Scenario: Credit travels with the share image
- **WHEN** a share image that shows the cat is found away from the site, and its page's tags and structured data, its sidecar and its `LICENSES.md` row are read
- **THEN** the alt texts, the sidecar and the row each name *"Cat" by J-Toastie, CC-BY 3.0*, the structured data names the model "Cat" by J-Toastie under CC-BY 3.0, and the image's band does not carry the credit

#### Scenario: Credit on the page
- **WHEN** a page that shows the cat is opened
- **THEN** it shows a visible credit that names the "Cat" model, J-Toastie and CC-BY 3.0
