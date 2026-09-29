# Design

## Context

See proposal.md (Why). A read-only survey of the tree before this change found:

- **Size and language.** 670 tracked files: about 49k lines of non-test TypeScript, 7.9k lines of tests in 51 files, 19k lines of CSS. About 160k unique words of Spanish prose, spread over every code comment, every test title, all documentation and all OpenSpec content. UI copy is already English.
- **Two Vite sites share one engine.** 4D.OS (launcher and worlds a–e, `vite.config.ts`, HTML at the repo root) and the playground (museum, Bloomscope, two landings, `vite.playground.config.ts`, root `playground/`) both use `src/core`, which has no outbound imports.
- **Oddities a newcomer would trip on.**
  - A `scenes` ⇄ `bake` import cycle; world E ships bake code.
  - `core/views` depends on the `core/shell` grab-bag; the launcher imports a world's internals.
  - Duplicated helpers: `mulberry32` ×3, `crc32`/PNG text ×2, `BAYER4` ×3, `smoothstep` ×5 and others.
  - Ten dead exports and three leftover per-landing `tsconfig.json` files.
  - Two words ("flavor" in code, "world" in the UI) for one concept.
- **The museum build reads git.** `build/git.ts` takes each sheet's date from the first commit of its `origin` paths. `build/manifest.ts` marks a loop stale when `provenance.commit` differs from the last commit of its `sources`. A new root commit, a shallow clone or a ZIP download therefore gives every sheet the same date, flags every loop as stale on the public page, or fails the build.
- **Silent failure points for a restructure.**
  - Both Vite configs drop missing HTML entries through `existsSync`.
  - `published.test.ts` skips itself when no loops are found.
  - `collection.ts` path lists are never checked for existence.
  - `scripts/` is not typechecked.
- **No secrets were found.** Personal and machine-local data is limited to an email-derived `workers.dev` subdomain, a few absolute paths in review JSON, and noise inside archived process documents.

## Goals / Non-Goals

**Goals:**
- A reader can follow the code from the README without prior context, in English.
- `npm ci && npm test && npm run build` works from a fresh clone, including a shallow clone or a ZIP, with no `[museum]` warnings.
- The rendered pages are unchanged, apart from the re-recorded loops' provenance line (new commit and date).
- Every decision and measurement in the archived changes stays readable, without private noise.

**Non-Goals:**
- No redesign, new feature or UI copy change.
- No behavior change in 4D.OS or the landings; pure moves and comment translation only.
- No npm workspaces, path aliases or build-tool change.
- No deployment as part of this change.
- No Git LFS: the largest file is 24.75 MB, under GitHub's limits, and every pack is needed at runtime.

## Decisions

### D1. Layout: two symmetric site roots and code grouped by layer

The two site roots, each with its own Vite config:
```
sites/4d-os/        index.html, a/ … e/, bake.html, debug.html, public/{packs,launcher}, vite.config.ts
sites/playground/   index.html, bloomscope/, landings/<slug>/, public/{loops,landings}, vite.config.ts
```

The code, grouped by layer:
```
src/engine/         ← src/core (cssColor moves into engine/display)
src/pipeline/       ← src/scenes + src/bake, models/ ← dev-assets/models, captures/ (source screenshots of the stills)
src/4d-os/          launcher/ ← src/main.ts + launcher.css; worlds/a … e ← src/flavors; debug/
src/playground/     museum/, bloomscope/, game-center/, wind-up-empire/, shared/ (unchanged inside)
```

Tools, deployment files, docs and test config:
```
tools/              capture-loops.ts; vite/ (pack-saver, repo-src-in-dev)
deploy/             wrangler.jsonc (assets directory ../dist), _redirects, .assetsignore  ← cloudflare/ + wrangler.jsonc
docs/               README-level guides; design/DESIGN.md and design/PRODUCT.md ← the root
vitest.config.ts    separate from the site configs
```

The repository root keeps only what a reader expects there: `README.md`, `LICENSE`, `LICENSES.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.gitattributes`, and the folders `.claude/`, `.impeccable/`, `deploy/`, `docs/`, `openspec/`, `sites/`, `src/` and `tools/`. Empty or tool-generated leftovers (`generated-images/`, `.impeccable/questions/`) are deleted, and local tool folders (`.wrangler/`, `dist/`, `.reference/`) stay ignored.

Rules for the move:
- Each HTML file keeps its position relative to its Vite root, so every public URL stays the same. Provenance, `WORLDS`, the tests and `_redirects` all record these URLs.
- "flavor" becomes "world" in folder names, identifiers and `data-flavor` attributes, so code and UI use one word.

**Alternatives:**
- *Tidy in place.* Break the cycle, dedupe and delete dead code without moving folders. Rejected: the root stays cluttered with two sites' files and the naming split remains.
- *npm workspaces.* Rejected: four packages, project references and per-app configs are too much ceremony for a single-author ~50k-line repo. The build-time reads that cross the two sites (the museum reads 4D.OS packs and tokens) would also leak through package boundaries.

### D2. Relative imports, no path aliases

Moves rewrite relative specifiers mechanically, and `tsc --noEmit` catches misses. Aliases would not work for code that the Vite config loads at config time (the museum plugin, the pack saver) without extra tooling.

**Alternative:** `tsconfig` paths plus Vite aliases. Rejected: two resolution systems for one gain (shorter imports).

### D3. Curated sheet dates

Each sheet in `collection.ts` gets a `created` date (`YYYY-MM-DD`): the dates its git history gives today (001–003 → 2026-09-24, 004 → 2026-09-25). `origin` paths and `build/git.ts` are removed.

**Alternative:** backdated seed commits that recreate today's first-commit dates. Rejected: partial, unbuildable commits, and the build would still need a full clone.

### D4. Loop freshness by content hash of the work's sources

The provenance records `sources: { algorithm: "sha256", hash }`:
- The hash covers every file under the sheet's `sources` paths.
- Files are walked in sorted order, skipping dot-files.
- Each file contributes its repo-relative path and its bytes.

The build recomputes the hash; a mismatch marks the loop stale. `commit` stays in the provenance for information: it is the commit the loop was recorded at, and the title block links it to GitHub.

**Alternative:** keep comparing commits. Rejected: it breaks on any history rewrite, shallow clone or ZIP.

Consequences:
- A pure move of a source file changes the hash. That is intended: a restructure changes how the work is built, so its loops are re-recorded (D10).
- Hashing about 160 MB of packs adds well under a second to the build.

### D5. The build does not run git

With D3 and D4, nothing in the build shells out to `git`, and the colophon line that credits "its git history" goes.

**Alternative:** degrade gracefully when git is missing. Rejected: two code paths and silently wrong output.

### D6. The capture tool writes the poster sidecar

`tools/capture-loops.ts` writes `poster.webp.json` with the provenance line, the commit, the date, the route and the poster's SHA-256, using the template of the current sidecars.

**Alternative:** keep the manual `embed-prompt` step. Rejected: it depends on a local tool readers do not have.

### D7. Translation with one glossary, verified against the build output

- **Glossary.** One list of term pairs (sheet, épure, title block, trail, NOW, pass, …) is shared by every translator.
- **Comments.** Comment-only edits must leave the minified build output byte-identical. Esbuild and Rolldown strip comments, so this is a strong check.
- **Messages.** Non-UI messages (thrown errors, validation messages, CLI output) change together with the tests that assert them.
- **Identifiers.** Spanish identifiers become English: `cajetin` → `titleBlock` (CSS `title-block`) and `tramo` → `segment`. "VISTA" and "épure" stay as terms of art, defined in the glossary.
- **`LICENSES.md`** is translated in the same commit as the four tests that parse it.

**Alternative:** translate docs only. Rejected: the code has to be readable too.

### D8. OpenSpec in English, archives translated and sanitized

- `openspec/config.yaml` asks for English artifacts and adds public-repo rules.
- Archived changes are translated and sanitized:
  - requirements and decisions are stated with their rationale, not with who asked for them;
  - no local paths, ports, preview URLs, deployment IDs or session names;
  - commit hashes of the private history become neutral descriptions.
- Repo-relative paths in archives stay as they were at the time; `docs/openspec-workflow.md` says so.

**Alternative:** leave archives in Spanish as a record. Rejected: a public repository must be readable in one language.

### D9. Documentation set

- `README.md`: what it is, live URLs, quick start, a repository tour, how it works, how it was built with OpenSpec, deploying your own, known limitations, credits and licenses.
- `docs/architecture.md`, `docs/engine.md`, `docs/museum.md`, `docs/openspec-workflow.md` and `docs/glossary.md`.
- `docs/images/`: about ten curated captures from `.impeccable/review/`. The rest of `review/` (26 MB, including local paths in JSON) is removed.
- `DESIGN.md` and `PRODUCT.md` move to `docs/design/`, so the root holds only the repository's entry points; the design tooling is pointed at that path when used.
- `.impeccable/design.json` is regenerated from the English `DESIGN.md`.

**Alternative:** a docs site. Rejected: out of scope; Markdown on GitHub is enough.

### D10. Clean history, recorded loops, rename, publish

The steps, in order:
1. Keep the private history as a local branch and a bundle outside the repo. Neither is pushed.
2. On an orphan branch, create commit A with the final tree, authored with the owner's public commit identity.
3. Re-record every loop at A, then create commit B with the loops, sidecars and `LICENSES.md` loop rows. B touches no `sources`, so the loops stay fresh.
4. Force-push `main` and delete the other remote branches.
5. `gh repo rename crewtives-playground`, then update the remote and every URL in docs, package and code.
6. Set visibility to public last, after a final audit.

Both public commits follow Conventional Commits, as every commit of the repository does from now on: `feat: initial public release` for A and `chore(loops): record museum loops at <sha7>` for B.

**Alternative:** a single root commit. Rejected: a loop's provenance must name a commit that already contains its sources, and a commit cannot contain its own hash.

### D11. Verification per stage

- **Baseline before any code change.** For every route (museum, Bloomscope, both landings, 4D.OS launcher and worlds a–e), at 1440×900 and 390×844, with reduced motion, the baseline records:
  - a screenshot;
  - the normalized page text;
  - the list of same-origin requests, with hashed asset names normalized;
  - console errors.
- **After each stage,** the same fingerprints are compared, and `tsc`, `vitest` and the build run.
- **Comment-only translation** additionally requires byte-identical minified output.
- **After re-recording,** every frame hash must equal the previous recording's.

**Alternative:** rely on unit tests only. Rejected: moves and HTML path rewrites can break pages that no unit test loads.

## Risks / Trade-offs

- [A translation edit silently changes behavior (a string compared somewhere, a CSS class)] → comment-only edits are checked by byte-identical output; message changes go with their tests; identifier renames are done in one pass with `tsc`, tests and fingerprints.
- [A moved HTML entry silently disappears from the build] → the `existsSync` filters become hard failures before any move.
- [Re-recorded frames differ because of the browser or GPU] → record on the same machine and Chromium as the previous recording, compare hashes in a dry run before writing, and investigate any difference before committing.
- [Force-pushing `main` is irreversible on GitHub] → local backup branch and bundle; the repository stays private until the final audit passes.
- [Old commits stay reachable by SHA on GitHub for a while after the force-push] → the repository was private, so no one outside knows those SHAs; accepted.
- [The commit author's email is public in every commit] → accepted: the repository uses a public identity chosen for it.
- [About 200 MB clone] → stated in the README; packs are needed at runtime.
- [`wrangler.jsonc` targets the owner's domain] → the README explains how to deploy your own.

## Migration Plan

1. Translate OpenSpec content and switch `openspec/config.yaml` to English.
2. Write this change's specs and tasks.
3. Capture the baseline fingerprints.
4. Implement in stages, each verified by D11 and committed on a work branch:
   1. museum without git;
   2. tidy fixes;
   3. layout moves;
   4. code translation;
   5. docs and licenses;
   6. sanitization.
5. Run the final audit.
6. Archive this change.
7. Create the new history, re-record the loops, rename, force-push, publish (D10).
8. **Rollback, before publishing:** reset `main` on GitHub from the backup branch. After publishing, the private history cannot be withdrawn from people who cloned it, so publishing is the last step.
