## MODIFIED Requirements

### Requirement: Licenses and credits
The owner's code SHALL be published under the MIT license, in a `LICENSE` file at the root and in the `license` field of `package.json`. The `LICENSE` or the README SHALL state that third-party assets keep their own licenses. That covers typefaces, 3D models, generated files and anything derived from the CC-BY "Cat" model, all listed in `LICENSES.md`.

`LICENSES.md` SHALL have one row per third-party asset in the repository, with its license and the location of its license text. Each row SHALL be correct against the asset's upstream license. `LICENSES.md` SHALL also have a row for every share image, marked as a derivative of the CC-BY model when it shows the cat.

The CC-BY credit of the "Cat" model SHALL keep appearing on every page that shows the cat. It SHALL also appear inside every share image that shows the cat, because those images are seen on other sites, away from the page.

#### Scenario: Reusing the code
- **WHEN** a reader wants to reuse the engine in their own project
- **THEN** `LICENSE` grants it under MIT with the unmodified MIT text, so that GitHub detects the license, and the README's credits section tells them which assets are excluded

#### Scenario: Every asset listed
- **WHEN** each typeface, model and derived binary in the repository is compared with `LICENSES.md`
- **THEN** each one has a row with its license, and the row's copyright notice matches the upstream one

#### Scenario: Credit travels with the share image
- **WHEN** a share image that shows the cat is opened on its own, outside the site
- **THEN** the image itself reads *"Cat" by J-Toastie, CC-BY 3.0*

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
