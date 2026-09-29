# Tasks

## 1. Baseline and guards

- [x] 1.1 Capture the baseline fingerprints of every public route (museum, Bloomscope, both landings, 4D.OS launcher and worlds a–e) at 1440×900 and 390×844 with reduced motion, plus the text without JavaScript, from the current build; verify that two captures of the same build compare equal (text, requests, DOM and console identical; screenshots within 1000 px of animation noise)
- [x] 1.2 Make missing HTML entries fail the build in both Vite configs (replace the `existsSync` filters), make `published.test.ts` fail when no loop is found, and add a test that every path in the collection (`sources`, `mat.file`) exists; verify with `npm test` and by building once with an entry temporarily renamed (the build names it and fails)

## 2. Museum without git

- [x] 2.1 Add a curated `created` date to each sheet in the collection (001–003 → 2026-09-24, 004 → 2026-09-25), remove `origin` paths and `build/git.ts`, and make the manifest read `created`; update the tests that pinned dates from the old history; verify with `npm test` and `grep -r "execFileSync\|git log" src/playground/museum` returning nothing
- [x] 2.2 Implement the sources hash (sorted repo-relative paths, dot-files skipped, path and bytes per file, SHA-256), add `sources: { algorithm, hash }` to the provenance schema and its validation, and make the manifest compare hashes instead of commits (missing hash → stale), with a warning that names the work, the date and both hashes; verify with unit tests over a temporary folder: unchanged files → fresh, one byte changed → stale, file added or moved → stale
- [x] 2.3 Make the capture tool record the sources hash and the commit it recorded at, write `poster.webp.json` itself from the current sidecars' template, and drop the obsolete `--from-landings` option; verify with a dry run of one loop (the summary carries the hash and the sidecar content) and `npm test`
- [x] 2.4 Link the 7-character commit in the title block's provenance line to `https://github.com/crewtives/crewtives-playground/commit/<sha>`, and remove the colophon's claim that figures come from the git history; update the figure check and its tests; verify with `npm test` and the built HTML of `/`
- [x] 2.5 Verify the stage: `npx tsc --noEmit`, `npm test`, `npm run build`; the fingerprints match the baseline except the stale notice on the four sheets and the commit link (expected until the loops are re-recorded in 8.3)

## 3. Tidy fixes

- [x] 3.1 Break the `scenes` ⇄ `bake` cycle (the seeded random generator moves to the scenes side) and move the pure math of `whaleFallSky` (sky, disk and star functions) into the scenes module, so world E no longer imports baker code; verify that no file under `src/scenes` imports `src/bake`, that `/4d-os/e/` renders identically (fingerprints) and `npm test`
- [x] 3.2 Move `cssColor` into the display module and remove the launcher's dependency on a world's internals; verify that `core/views` imports nothing from `core/shell` and `npx tsc --noEmit` (accepted: three 4D.OS chunks change name — `sourceFrames`→`TimeViewer`, `plate`→`sidePreset` — with the same request count, byte-identical CSS and pixel-identical pages)
- [x] 3.3 Merge duplicated helpers whose implementations are identical (`mulberry32`, `crc32` and PNG text chunks, `BAYER4`, `esc`, `hex`/`mix`, `aspectOf`, vector `normalize`); verify byte-identical results in the existing tests and equal fingerprints (accepted exception: `mulberry32` stays as three commented copies, because a single shared module becomes a separate chunk and adds one request on world C and on Bloomscope)
- [x] 3.4 Remove the ten dead exports, the three leftover per-landing `tsconfig.json` files and the references to the old Bloomscope location; move the launcher images that no page uses out of the published folder while keeping them as provenance sources of the stills; verify `npx tsc --noEmit`, `npm test` and that the deployed file list only loses those three images
- [x] 3.5 Move `SharedContext` of Wind-Up Empire into its own module to remove the type-only import cycle; verify `npx tsc --noEmit`

## 4. Layout

- [x] 4.1 Move files to the layout of design D1 (`sites/4d-os`, `sites/playground`, `src/engine`, `src/pipeline`, `src/4d-os`, `src/playground`, `tools/`, `deploy/`), and update imports, HTML script paths, both Vite configs, a separate `vitest.config.ts`, `tsconfig.json` (now including `tools/`), `package.json` scripts, `.gitignore`, `deploy/.assetsignore`, the collection's paths, the museum plugin and manifest paths, the capture tool and the tests that read files by path; verify `npx tsc --noEmit`, `npm test`, `npm run build`, and that the normalized list of built files equals the one before the move
- [x] 4.2 Rename "flavor" to "world" in folders, identifiers, test titles and `data-flavor` attributes and their CSS selectors; verify `grep -ri flavor src sites tools` returns nothing and equal fingerprints (accepted: on `/4d-os/` three `aria-label`s and two `alt` texts change from "Flavor …" to "World …", as the spec's one-word rule requires; the dev-only debug page takes `?world=` instead of `?flavor=`)
- [x] 4.4 Clean the repository root: move each site's Vite config into its site folder (`sites/4d-os/vite.config.ts`, `sites/playground/vite.config.ts`), `wrangler.jsonc` into `deploy/` (assets directory `../dist`; scripts pass `-c deploy/wrangler.jsonc`), `DESIGN.md` and `PRODUCT.md` into `docs/design/`, and delete `generated-images/` and `.impeccable/questions/`; verify that `git ls-files` shows at the root only the files and folders of design D1, `npm run build` and `npm run deploy`'s build step work with the moved configs, and `npx wrangler dev -c deploy/wrangler.jsonc` serves the built site
- [x] 4.3 Verify the stage: fingerprints equal to the previous stage for every route, `npm test` and `npm run build`

## 5. Code in English

- [x] 5.1 Translate every code comment (TypeScript, CSS, GLSL, HTML, configs) with the glossary; verify that the minified build output is byte-identical to the output before the translation, and that a Spanish scan of comments returns nothing (as verified: GLSL comments imported with `?raw` and HTML comments are part of the build output, so those files differ in comment text only; every other file is byte-identical)
- [x] 5.2 Translate test titles, assertion messages and test helper strings; verify `npm test` passes with the same number of tests
- [x] 5.3 Translate non-UI messages (thrown errors, validation messages, build warnings, CLI output) together with the tests that assert them, using the wording the specs quote; verify `npm test` and that the build output differs from 5.1 only in those strings
- [x] 5.4 Rename the Spanish identifiers (`cajetin` → `titleBlock`, CSS `title-block`; `tramo` → `segment`); verify `npx tsc --noEmit`, `npm test` and equal fingerprints
- [x] 5.5 Verify the stage: Spanish scan over `src`, `sites`, `tools` and the configs returns only citations and proper names; fingerprints equal to the previous stage

## 6. Documentation and licenses

- [x] 6.1 Translate `DESIGN.md`, `PRODUCT.md` (neutral wording, no statements of who asked for what) and the design briefs; regenerate `.impeccable/design.json` from the English `DESIGN.md`; update their code paths to the new layout; verify a Spanish scan and that every repo path they mention exists
- [x] 6.2 Translate `LICENSES.md` in the same commit as the four tests that parse it, and fix its gaps (Fira Mono notice, the Cat row, commit references replaced by dates, own-work rows for D, E and Bloomscope, outdated audit section, packs that are not in the repository, a row for the OpenSpec-generated `.claude/` files); verify `npm test` and each row against the upstream license
- [x] 6.3 Write `README.md` and `docs/` (`architecture.md`, `engine.md`, `museum.md`, `openspec-workflow.md`, `glossary.md`), curate about ten images into `docs/images/` and remove the rest of `.impeccable/review/`; credit the third-party inspirations once, neutrally, in the README; verify that every path and link in them resolves (a script checks the files; the external links answer) (ten images: the full-page capture of world A was dropped because it showed an old version of the world)
- [x] 6.4 Add the MIT `LICENSE`, complete `package.json` (`name` `crewtives-playground`, `description`, `repository`, `license`, `engines`), add `.gitattributes`, extend `.gitignore`, and remove the account comment from `wrangler.jsonc`; verify `npm ci` and that `git check-ignore` covers `.env`, `.dev.vars` and the tools' local folders

## 7. Audit

- [x] 7.1 Scan the tracked tree for secrets, absolute paths, local addresses, preview URLs, account names, email addresses and Spanish; verify the only hits are deliberate (the live site, the public repository URL, citations)
- [x] 7.2 Build and test from a shallow clone and from an archive without `.git`; verify both succeed and produce the same pages as the working tree (verified: 652 tests and identical build output from a depth-1 clone and from an archive without .git; a working tree may additionally hold the ignored cat-alley and deer-synthetic packs, which deploy/.assetsignore keeps out of the upload)

## 8. Release

- [x] 8.1 Archive this change with its specs synced; verify `npx openspec validate --specs --strict`
- [ ] 8.2 Keep the private history as a local branch and a bundle outside the repository; verify `git bundle verify`
- [ ] 8.3 Create the root commit with the final tree on an orphan branch, authored with the public identity; re-record every loop at it after a dry run whose frame hashes equal the previous recording; commit the loops, sidecars and `LICENSES.md` loop rows; verify no `[museum]` warning, `npm test`, and fingerprints equal to the baseline except the provenance line (new commit and date)
- [ ] 8.4 Rename the repository to `crewtives-playground`, force-push `main`, delete the other remote branches, and make the repository public after a final audit of the pushed tree; verify an anonymous clone builds and that the provenance commits exist in it
