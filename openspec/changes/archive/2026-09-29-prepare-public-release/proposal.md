# Proposal

## Why

The repository is about to become public so that other people can read it and learn how 4D.OS, its five worlds and the playground museum were built. Today it is written for its author: every comment, test title and document is in Spanish, there is no README and no license, the folder layout mixes two sites at the root, and the museum build depends on the exact git history (sheet dates and loop freshness come from `git log`), so it cannot survive the clean history the public repository will start with, a shallow clone or a ZIP download.

## What Changes

- **Repository in English.** Code comments, test titles, non-UI messages, CSS/GLSL/HTML comments, `DESIGN.md`, `PRODUCT.md`, `LICENSES.md`, `.impeccable/` briefs and all OpenSpec content (living specs, archived changes and `openspec/config.yaml`, which now asks for English artifacts) are translated with one shared glossary. UI copy was already English and does not change.
- **Readable layout.** The two Vite sites get symmetric roots (`sites/4d-os/`, `sites/playground/`); code is grouped by layer (`src/engine`, `src/pipeline`, `src/4d-os`, `src/playground`); dev tools move to `tools/`. The `scenes` ⇄ `bake` import cycle is broken, duplicated helpers are merged, dead code and leftover scaffolding are removed. Public URLs do not change.
- **Museum independent of git history.** Sheet dates become curated values in the collection. A loop is stale when a content hash of its work's sources differs from the hash recorded in its provenance, not when a commit differs. The build no longer runs `git`. The capture script writes the poster sidecar itself. **BREAKING** for the provenance schema (new `sources` hash field) — all loops are re-recorded at the release commit.
- **Public-repository basics.** `README.md` with a guided architecture tour, `docs/` (architecture, engine, museum, OpenSpec workflow, glossary, curated images), an MIT `LICENSE` for the owner's code with third-party assets kept under their own licenses, a completed `.gitignore`, `.gitattributes`, and `package.json` metadata. The repository is renamed `crewtives-playground`.
- **Sanitized content.** No local paths, ports, preview URLs, deployment IDs, account names, commit hashes of the private history or quotes of private conversations remain; third-party inspirations are credited once, neutrally, in the README.
- **Clean history.** The public repository starts from a new root commit with the final tree, followed by the commit that records the loops against it. The private history is kept only as a local backup.

## Capabilities

### New Capabilities
- `public-repository`: what a reader of the public repository can rely on — English throughout, a README and docs that explain the architecture, a code license and third-party credits, no personal or machine-local data, a build that works from a fresh clone without git history, and a layout that separates sites, engine, pipeline and tools.

### Modified Capabilities
- `work-loops`: loop freshness is decided by a content hash of the work's sources recorded in the provenance, instead of by comparing git commits; the capture tool writes the poster provenance sidecar; loops are re-recorded at the release commit.
- `playground-museum`: sheet dates are curated in the collection instead of being derived from git history, and the colophon no longer claims that figures come from the git history.
- `playground-hub`: the demo-honesty rule lists the collection's curation, not the git history, as the source of the works' dates.

## Impact

- **Code:** every TypeScript, CSS, GLSL and HTML file (comments and test titles); moves of about 215 files and rewrites of about 250 import or URL specifiers; `vite.config.ts`, `vite.playground.config.ts` (roots, inputs, dev rewrites), a separate `vitest.config.ts`, `tsconfig.json` (now also typechecks `tools/`), `package.json` scripts.
- **Museum build:** `collection.ts`, `build/manifest.ts`, `build/git.ts` (removed), `loops/provenance.ts`, `tools/capture-loops.ts`, the tests that pinned dates from the old history, the six `provenance.json` files and poster sidecars.
- **Docs and specs:** every document; the living specs `work-loops` and `playground-museum` change requirements; a new living spec `public-repository`.
- **Deployment:** none required by this change; the deployed site keeps its URLs. A later deploy shows the re-recorded loops' provenance (new commit and date).
- **GitHub:** the repository is renamed and its history replaced; other remote branches are deleted; visibility becomes public at the end.
