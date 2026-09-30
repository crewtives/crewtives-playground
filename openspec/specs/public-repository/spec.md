# public-repository Specification

## Purpose

Defines what a reader of the public repository can rely on: everything in English, a README and guides that explain the architecture, a license for the code and credits for third-party assets, no personal or machine-local data, a build that works from any fresh clone without git history, a layout that separates the sites, the engine, the pipeline and the tools, and a published history that starts clean.

## Requirements

### Requirement: English throughout
Everything a reader of the repository reads SHALL be in English (US spelling):
- code comments in TypeScript, CSS, GLSL and HTML;
- test titles, assertion messages and test helper strings;
- messages that are not UI copy: thrown errors, validation messages, build warnings and command-line output;
- identifiers, file names and CSS class names, except the terms of art "VISTA" and "épure", which `docs/glossary.md` defines;
- documentation: `README.md`, `docs/`, `DESIGN.md`, `PRODUCT.md`, `LICENSES.md` and the design briefs;
- OpenSpec content: the living specs, the archived changes and `openspec/config.yaml`, which SHALL ask for English artifacts.

UI copy was already English and SHALL NOT change because of this requirement. Citations in other languages (French, Catalan, Japanese) and proper names stay as they are. Every translated text SHALL use the terms of `docs/glossary.md`.

#### Scenario: No Spanish left
- **WHEN** the tracked files are scanned for Spanish (accented letters and common Spanish words), excluding citations and proper names
- **THEN** no code comment, test title, message, identifier or document is in Spanish

#### Scenario: New OpenSpec artifacts
- **WHEN** OpenSpec prints the instructions for a new proposal
- **THEN** its context asks for English artifacts

### Requirement: A README and docs that explain the architecture
The repository SHALL have a `README.md` at its root that tells a reader who was not part of the work:
- what the project is and where it is published;
- how to install, run, test and build it, and which Node version it needs;
- a tour of the repository layout, with the purpose of each top-level folder;
- how the 4D pack, the engine, the retro display, the baked scenes and the museum work, linking to `docs/`;
- how the project was specified and built with OpenSpec;
- how to deploy a copy of the site to your own Cloudflare account;
- the known limitations;
- the licenses and the credits, including the third-party inspirations, named once and neutrally.

`docs/` SHALL include at least `architecture.md`, `engine.md`, `museum.md`, `openspec-workflow.md` and `glossary.md`. `docs/openspec-workflow.md` SHALL state that the paths inside archived changes describe the repository as it was when each change was made.

#### Scenario: First visit
- **WHEN** someone opens the repository on GitHub
- **THEN** the README tells them what the project is, links the live site, and gives the commands to run it locally

#### Scenario: Reading order
- **WHEN** a reader follows the README's architecture tour
- **THEN** every file or folder it names exists at that path

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

### Requirement: No personal or machine-local data
The tracked files SHALL NOT contain secrets, and SHALL NOT contain:
- absolute paths of a machine, local ports or temporary folders;
- preview URLs, `workers.dev` subdomains, account names or deployment and version IDs;
- quotes of private conversations, or statements of who asked for what;
- commit hashes of a history that is not part of the published repository;
- personal names of third parties, other than asset authors credited under their licenses, cited historical or academic authors, and the inspirations credited once in the README.

A host pattern made only of placeholders, such as `https://:version.:subdomain.workers.dev/*` in the site's `_headers` file, names no real subdomain or account and is allowed. It is the only form in which `workers.dev` MAY appear in a file the site publishes.

`.gitignore` SHALL cover local environment and secret files (`.env*`, `.dev.vars*`), logs, test reports, editor folders and the local folders of the tools used to build the project.

#### Scenario: Audit before publishing
- **WHEN** the tracked tree is scanned for token and key formats, absolute paths, local addresses, preview URLs and email addresses
- **THEN** the only hits are the public commit identity, deliberate public URLs such as the live site, and placeholder-only host patterns such as the `workers.dev` rule in `_headers`

#### Scenario: Placeholder host pattern
- **WHEN** the tracked tree is searched for `workers.dev`
- **THEN** every hit in a published file is a placeholder-only pattern with no real subdomain or account, and every other hit is prose, a configuration key or test code that names the host generically, never a real subdomain or account

#### Scenario: Local secrets file
- **WHEN** a developer creates `.dev.vars` or `.env` in the working tree
- **THEN** `git status` does not list it

### Requirement: Build from a fresh clone
`npm ci`, `npm test` and `npm run build` SHALL succeed from a fresh clone. They SHALL also succeed from a shallow clone and from an archive download without `.git`, with the same output. The build SHALL NOT run `git`. A missing entry page SHALL make the build fail with an error that names it, instead of silently leaving it out of the output. The development tools under `tools/` SHALL be typechecked together with the rest of the code.

#### Scenario: Shallow clone
- **WHEN** the repository is cloned with `--depth 1` and built
- **THEN** the build succeeds, writes no `[museum]` warning and produces the same pages as a full clone

#### Scenario: Missing entry
- **WHEN** one of the HTML entry pages is removed and the build is run
- **THEN** the build fails and names the missing page

### Requirement: Layout by site and by layer
The repository SHALL separate the two sites from the code they share:
- `sites/4d-os/` and `sites/playground/` SHALL be the roots of the two Vite sites: their HTML entry pages and their public files;
- `src/engine/` SHALL hold the engine, with no import from any other folder of `src/`;
- `src/pipeline/` SHALL hold the scene equations and the baker, with no import from the sites' code;
- `src/4d-os/` SHALL hold the 4D.OS launcher, its worlds and its debug page;
- `src/playground/` SHALL hold the museum, the landings and the playground's shared modules;
- `src/site/` SHALL hold what both sites share at build time: the page registry, the build plugin that injects the metadata, and the share-image composition with its source captures. It MAY read data from the other layers. No page's code SHALL import it, and `src/engine/`, `src/pipeline/`, `src/4d-os/` and `src/playground/` MUST NOT import it;
- `tools/` SHALL hold the development tools, and `deploy/` the files copied into the deployed output.

The repository root SHALL hold only the repository's entry points:
- `README.md`, `LICENSE` and `LICENSES.md`;
- the package and TypeScript configuration, and the test configuration;
- the git attribute and ignore files;
- the folders listed above, plus `docs/`, `openspec/` and the tools' own configuration folders.

Each site's build configuration SHALL live in its site folder, and the deployment configuration in `deploy/`.

The code and the UI SHALL use one word, "world", for each of the five 4D.OS worlds. The public URLs SHALL stay the same.

#### Scenario: Engine without outbound imports
- **WHEN** the imports of every file under `src/engine/` are listed
- **THEN** all of them point inside `src/engine/` or to npm packages

#### Scenario: Site layer imported only by the build
- **WHEN** the imports of every file outside `src/site/`, the two site configs and `tools/` are listed
- **THEN** none points into `src/site/`

#### Scenario: Root at a glance
- **WHEN** a reader lists the repository root on GitHub
- **THEN** they see the site, source, tools, deploy, docs and OpenSpec folders and the standard project files, and no HTML page, build config of a single site or deployment file

#### Scenario: Same URLs
- **WHEN** the built site is compared with the site before the restructure
- **THEN** it serves the same routes and pages, and the redirects are unchanged

### Requirement: Clean public history
The published history SHALL start from a root commit that holds the final tree, followed by the commit that records the museum loops against that root commit. No other branch of the private history SHALL be published. Every commit named in a published loop's provenance SHALL exist in the published history.

#### Scenario: Provenance commits exist
- **WHEN** the commit in each published `provenance.json` is looked up in the public repository
- **THEN** the commit exists and contains the sources the loop was recorded from
