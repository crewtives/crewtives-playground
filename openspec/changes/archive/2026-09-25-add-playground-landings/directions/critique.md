# Cross-landing critique: Game Center Yonjigen · Wind-Up Empire · Bloomscope

Critic pass against the brief, impeccable `new-work.md` + `craft-floor.md`, and the repo as it stands on 2026-09-25. Scratch only. Nothing in the repo was edited.

Summary: all three are real directions. Each is drenched at page scale, has a playable first viewport and is honest about being a demo. But as a *set* they overlap more than a set of alternatives should. Two of them open on a cobalt field with a big round dithered object in the middle. All three use a fat, bubbly display face. Two use a Japanese rounded gothic for body text. Two ship a paint-and-stack Game of Life. Two drop projectiles into a black hole. Two use the same bilaterally mirrored hero layout (centre machine, mirrored wings, bottom band). Their build plumbing is also three incompatible designs, and one of them would publish 230 MB of 4D packs at the site root. The fixes below are concrete and mostly make the builds smaller.

---

## 1. What I verified in the repo (facts the decisions rest on)

- `vite.config.ts` builds 4D.OS with `base: '/4d-os/'` and `outDir: 'dist/4d-os'`. Its `publicDir` is the repo's `public/`, which holds **230 MB of packs** (cat-stairs 51 MB, whale-fall 53 MB, falcon-phi 54 MB, plus others). `wrangler.jsonc` serves `./dist`. `cloudflare/_redirects` 302s `/` to `/4d-os/`. `.assetsignore` only ignores `4d-os/packs/cat-alley/` and `4d-os/packs/deer-synthetic/`.
- `package.json` has no fontsource packages and no Playwright. Fonts are committed woff2 files beside each flavor, and `@font-face` rules live in `tokens.css` with relative URLs.
- **`Engine` (`src/core/engine/Engine.ts`)**
  - Its canvas is `position: fixed`, **on top** of the DOM (`z-index: var(--engine-z, 5)`), `pointer-events: none`, `alpha: true`, `preserveDrawingBuffer: true`.
  - Views are axis-aligned rects measured with `getBoundingClientRect` on every frame. Only visible views get `tick()`.
  - It builds a `WebGLRenderer` in its constructor. three r186 is WebGL2-only, so this throws when there is no WebGL2.
- **`RetroDisplay`**
  - It has `mode` / `pixelScale` / `reveal` setters, `tokenRoot`, and `DISPLAY_MODES`. There is no `setMode`.
  - `render()` paints the **whole view rect** opaquely with its background colour. It has no mask.
- **`setupSmoothScroll()`** forces `history.scrollRestoration = 'manual'` and `scrollTo(0, 0)`, and always imports ScrollTrigger. It skips Lenis under reduced motion.
- **Stills**
  - All five stills exist at `public/launcher/*.png`, 1200×900. **A, B and C are untracked** in git.
  - They are captures of the live render, dithered in **3 px blocks** (run-length analysis). So they must never be re-dithered.
  - A lossless WebP of all five (`cwebp -lossless -z 9`) measures **423 KB**, against 700 KB as PNG.
- `LICENSES.md` makes the *"Cat" CC-BY 3.0* credit (verbatim line in that file) **mandatory and visible on any page showing that scene**. That includes stills A, B and C. Its stills row covers only D and E.
- **Fonts**
  - 4D.OS faces: Host Grotesk, Departure Mono, Bricolage Grotesque, Geist Pixel, Big Shoulders Stencil, Doto, Archivo, Permanent Marker, Tektur, Jura, Science Gothic, Handjet, Atkinson Hyperlegible Next. None of the landing faces collide with these.
  - `@fontsource/ultra` and `@fontsource/zen-kaku-gothic-new` resolve to 5.3.0 on npm (checked).

---

## 2. Distinctness matrix (as delivered → after mandatory adjustments)

| axis | Game Center Yonjigen (neon) | Wind-Up Empire (orbit) | Bloomscope (bloom) |
|---|---|---|---|
| Hero field | vermilion enamel + ink bezel + dark CRT | **cobalt** lid | **cobalt** → **chartreuse** |
| Dominant set | vermilion · sodium · ink · candy | cobalt · chrome yellow · tin · vermilion | chartreuse · lilac · glaucous · honey · petal · plum |
| Value key of viewport 1 | ≈48 % ink bezel/CRT: the darkest, high contrast | mid-dark blue, printed | high-key backlit (after the fix) |
| Display face | Bungee / Bungee Shade (block signage) | Tilt Warp (warped box lettering) | Bagel Fat One → **Ultra** (wood-type fat face) |
| Body face | M PLUS Rounded 1c (JP rounded) | Zen Maru Gothic (JP rounded) → **Libre Franklin** | Recursive CASL 0.35 → **Recursive CASL 0** (linear) |
| Hero skeleton | bilateral cabinet: marquee / centre CRT / mirrored wings / deck | bilateral lid: centre orrery / mirrored instruments / lip band → **C2 diagonal box art** | asymmetric: text column left, eyepiece right |
| Signature verb | **fly** (then TIME VIEW) | **pull back and launch** | **turn / flick** a ring |
| Other verbs | grab (crane), pour + rewind (parlour), strike (gas). ~~paint Life~~ | wind (ratchet), flick-spin (tops), rub (spark), switch (press) | sow (dial), grow + stretch (lathe), paint + run (hex Life) |
| Scroll ritual | elevator ride with floor dings | one lid lift | per-section bloom assembly |
| Black hole | roof "moon" nod only (after the fix) | **owns it**: the Whirl | none |
| Keepsake | sticker PNG, machine URL | proof print PNG | herbarium strip, garden URL |

---

## 3. Overlaps found, with the prescribed divergence

1. **Two cobalt heroes (orbit, bloom).** Both open on a saturated cobalt field (#1B2CC4 vs #2B3FE0, the same hue) with a large circular dithered object. At thumbnail scale, a day later, they are the same page. **Orbit keeps cobalt**, because printed space on tin is its material. **Bloom leaves cobalt as a field.**
   - The hero becomes chartreuse #C8F03C with plum ink (ink on chartreuse 13.85:1). The tonal Vogel print goes to #B2DB2A (ink over it 11.31:1).
   - Sow moves to lilac #B99CFF (8.02:1), so the sunflower sits on its complement instead of pollen-on-pollen.
   - Cobalt stays only as a glass colour inside the scope palette.
   - This also spreads the value keys across the set: dark-ink neon, mid orbit, high-key bloom.
2. **Fat bubbly display ×3.** Bungee, Tilt Warp and Bagel Fat One are all heavy rounded display faces, so the three pages share one typographic voice. **Bloom switches to Ultra** (OFL, a 19th-century wood-type fat face). That fits the Brewster era (1816) and makes its own "Hatch raise" literal. Neon keeps its block signage and orbit keeps its warped tin lettering.
3. **Japanese rounded body ×2.** Zen Maru Gothic (orbit) and M PLUS Rounded 1c (neon) are near-twins, and orbit's "nod to the Japanese makers" walks into neon's Tokyo world. **Orbit switches to Libre Franklin 500/700**, the Franklin Gothic register of 1950s toy leaflets and box copy. Bloom's body text moves to Recursive CASL 0 (linear), with CASL 1 kept for labels only, so no two landings share a rounded body.
4. **Paint cells → run → stack generations, ×2.** Neon's 5F Life Tower and bloom's Hive are the same toy. Honeycombs are part of bloom's pinned theme, so **bloom keeps Hive and neon drops 5F**. Neon still has four toys, which is inside the 3–5 range, and its biggest feasibility problem shrinks.
5. **Projectiles captured by a black hole, ×2.** Neon's parlour well (1/r² field plus a capture spiral) duplicates orbit's Whirl, where rockets are swallowed. The pinned "universes / black holes" theme belongs to orbit. **Neon swaps the well for a centre start pocket** (the pachinko *heso*) plus tulips, with FEVER every 7th pocket. The roof black-hole "moon" stays as its only nod to world E.
6. **Same hero skeleton (neon, orbit).** Both are strict bilateral mirror layouts: a centred machine, mirrored left and right wings (bezel art vs BUILD/FLEET), and a bottom band (deck vs lip band). The arcade cabinet *is* bilateral, so **neon keeps the mirror**. **Orbit moves to box-art C2 (point) symmetry on a diagonal:**
   - the H1 on a −8° slant across the upper left, overlapping the orrery's upper-left quadrant the way box lettering overlaps the illustration;
   - the orrery centre at ≈ (800, 520);
   - the BUILD key and its ticket top-right;
   - the FLEET gauge and log bottom-left;
   - the lip band unchanged.

   This keeps the studio's taste for symmetry (rotational rather than mirror). It is neither neon's cabinet nor the stock "headline left, object right" split.
7. **Rotary-with-detents ×3** (neon jog/knob, orbit key, bloom ring and Sow dial). This is acceptable because it is the "satisfying UI" core, but the three physics must stay distinct:
   - bloom's ring is **free inertial spin** (a flywheel), with detents only below 40°/s;
   - orbit's key is a **one-way ratchet that stores energy**, with no free spin, and releases it as the unwind;
   - neon's jog is **time scrub only**.

   None may borrow another's feel.
8. **Symmetry selector ×3** (parlour MIRROR/6/8, orbit press 3/5/8-fold, bloom mirror gems). Kept, because it is the studio's taste. Each changes a different object: nails, Whirl arms, mirrors. No change required.
9. **Warm yellow fields ×2.** Neon 2F sodium #FFCC17 and orbit's leaflet chrome #FFC81A are the same yellow. It is not mandatory, but the finish review should compare them side by side. If they read as one, orbit's leaflet field moves to its orange #FF7A1A.
10. **Light-only set.** All three are light and loud, each argued from a physical scene, and each keeps darkness inside glass. That is the right way out of the black-plus-neon rut, but the set offers no dark option. After fix 1 the spread of value keys (neon ≈ half ink in viewport 1) is the set's contrast. It is noted here as a deliberate choice.

---

## 4. Vividness and AI-default check

- **Neon**
  - Vivid: one enamel per floor, a backlit marquee, cyan capped at ≤ 4 % of pixels. It avoids the (b) rut by construction.
  - Risk: it reads as "retro arcade", and Bungee Shade is an expected arcade pick. The haze and rain density are its Blade Runner levers.
  - Craft-floor miss: the marquee at 104 px and floor numerals up to 220 px exceed the 6 rem display cap.
- **Orbit**
  - Vivid, and the least guessable world in the set: a tin toy box.
  - Risk: a busy lid. Seven tops with nameplates, key, gauge, ticket, log, drums and a spark wheel all sit in viewport 1. The C2 recomposition gives the eye a path (title → orrery → rocket).
- **Bloom**
  - Vivid and the most beautiful single mechanism.
  - Risks: "psychedelic screensaver" (mitigated by the raw-cell inset and no idle rotation), and "faceted glass gems", which invite glassmorphism.
  - Gems must be flat SVG facets in 3–4 flat tones. No `backdrop-filter`, no blur.
  - The sheet #FFF7EA leans cream. Neutralise it to a daylight near-white, about #FDFDF6.
- **All three pass:** no eyebrow above headings, no same-size card grid, real offset-plus-blur shadows, no gradient text, authored SVG icons (glyph coverage was checked in each), and mono used only for data.
  - Neon's floor numerals are information (the elevator), not decoration, so they pass the section-number rule.

## 5. Playground and hub check

| | toys on the landing | index position | first-viewport route to the worlds | gating |
|---|---|---|---|---|
| Neon | 5 → 4 (Rain Run, crane, parlour, gas) | 2F, second | floor directory (desktop). **Phone has none, so a fix is needed** | crane prizes are also listed as plain links |
| Orbit | 5 (launch, tops, key, press, spark) | tray, second | lip-band button, and every planet nameplate opens its world | none: "Nothing here is locked" |
| Bloom | 4 (Scope, Sow, Lathe, Hive) | **last (section 6), a fix is needed** | skip link only | none |

All three list the five worlds, the launcher, and exactly three unnamed lab slots with no links. That is correct.

## 6. Feasibility: hidden multi-week tasks and a simpler way to the same beauty

**Neon** (its own feasibility score was 5/10 and it is the largest build).
- The 3D crane sphere solver with stacking, 8 substeps and a pendulum: **multi-day**.
  - Instead: one layer of capsules as 2D discs in the x–z floor plane, sharing the parlour's circle-contact module, with the vertical drop and lift scripted.
  - The look is unchanged; the solver risk disappears.
- The deterministic ghost from a 60 Hz input stream is fragile without a lockstep sim.
  - Instead: record pose samples (≤ 1080 × 6 floats) and replay them.
- Twin bead-on-wire rails: detachment physics for a flourish.
  - Instead: TWIN means two mirrored launchers firing mirrored angles. The symmetry-breaking picture is the same.
- The gravity well is replaced by the heso pocket (see §3.5), which is simpler still.
- The 5F Life Tower is removed.
- What stays hard: Rain Run tuning, the parlour rewind buffer and branch, and the sign atlas.
  - The atlas must `await document.fonts.load()` on the DotGothic16 JP subset before drawing, or canvas text renders in a fallback face.

**Orbit** (moderate).
- `scripts/bake-orbit-fallback.ts` adds a build-time SVG baker.
  - Instead: draw the no-WebGL orrery at runtime in Canvas2D from the same `flight.ts` and geometry.
- "Copy each world's `--pal-16` from `src/flavors/*/tokens.css` at build time."
  - Instead: hard-code the 5×16 palettes in a TS module, with a vitest that parses those `tokens.css` files and fails on drift.
- Five live tray-top views: already limited to hover/focus. Keep it that way.

**Bloom** (moderate).
- The eyepiece and peepholes are circles, but `RetroDisplay` paints the whole rect opaquely. Square corners would cover the ring and the field. Fix with D5 (below).
- The peepholes "share the Scope's cell RT", but an off-screen Scope view never ticks or renders, so the peepholes would freeze.
  - Fix: the chamber sim runs as an Engine ticker (D6), and the cell RT is re-rendered once per frame by whichever view renders first.
- Drop-water steepest descent across mesh triangles needs adjacency walking.
  - Instead: slide down each leaf's parametric spine in leaf-local coordinates, then hop to the next lower leaf by index. It looks the same.
- `scripts/capture-stills.cjs` with Playwright is a new heavy dependency, and it is obsolete because the stills exist. **Delete it**, along with the placeholder emblems.
- DeviceOrientation "Use tilt" and the full `#g=` codec (including hive edits) are optional. Cut them from v1 if time is short.

**All three: the Engine canvas sits over the DOM.** Any DOM that must appear *over* a view (HUD, bezels, rings, nameplates, tags) needs `z-index: calc(var(--engine-z) + 1)`. A CSS 3D transform on a view's element desyncs the painted rect. Orbit already found this. Neon's deck `rotateX` is safe only because it hosts no view.

## 7. Honesty

- **Neon**
  - Good: "the only prizes are links", printed odds, a HI score "this browser only", no fake ranking, 調整中 lab slots, glossed Japanese.
  - **Missing: the CC-BY cat credit** under A–C on 2F and in the credits.
  - The gas facts (Tokyo 50 Hz mains, a 100 Hz ballast hum, argon lavender) hold up.
- **Orbit**
  - Good: labelled fake economy, refunds, "Skip the grind", the cat credit is present.
  - **Rephrase** "No accounts, no scores, no tracking". The page cannot vouch for hosting-level analytics. Use: "This page stores nothing and sends nothing."
- **Bloom**
  - Good: estimates are labelled, and it says the sound mapping is theirs.
  - **Missing: a per-wheel "synthetic scene" label and the cat credit** for A–C.
  - Make the punchline precise in the sub: "Mirrors only close into a pattern at 180°/n; the golden angle is not one of them."

---

## 8. Shared architecture decisions

- **D1 · Routes.**
  - `/landings/game-center/`, `/landings/wind-up-empire/`, `/landings/bloomscope/`. Slugs follow the visitor-facing names; orbit's `/landings/orbit/` is retired.
  - A plain comparison page at `/landings/` links the three with one line each. It is not part of any world.
  - `/` keeps its 302 to `/4d-os/` until a landing is picked.
- **D2 · File layout.**
  - The Vite root is `playground/`.
  - Pages: `playground/landings/<slug>/index.html` and `playground/landings/index.html`.
  - Source: `src/playground/<slug>/**` and `src/playground/shared/**`.
  - Tests: `src/playground/**/*.test.ts`. The existing vitest include already covers them.
  - The surface brief (direction contract) and the finish-time `DESIGN.md` sit beside each page's HTML. They are never imported, so they are never emitted.
  - The repo-root `landings/` (neon) and `public/landings/…` (bloom) are rejected.
- **D3 · Build.** A second config, `vite.playground.config.ts`:
  - `root: 'playground'`, `base: '/'`
  - **`publicDir: 'public'` (resolves to `playground/public/`). Never the repo's `public/`, or 230 MB of packs land at the dist root.**
  - `build.outDir: '../dist'`, `emptyOutDir: false`
  - `build.assetsDir: 'landings/_assets'`, so nothing claims `/assets` before a landing is promoted to `/`
  - `rollupOptions.input` = the landing HTMLs plus the index
  - `server.fs.allow: [repo root]` so `src/core` resolves in dev
  - no `packSaver`

  Scripts and config:
  - `build` becomes `tsc --noEmit && vite build && vite build -c vite.playground.config.ts`
  - add `dev:playground`
  - add the new config to tsconfig `include`
  - `deploy` is otherwise unchanged. The 4D.OS config empties only `dist/4d-os`, so the order is safe.

  Multi-entry Rollup shares a single three.js chunk across the three pages.
- **D4 · Engine.**
  - One Engine per page. `maxDpr` is 2, or 1.5 when `(pointer: coarse) and (max-width: 800px)`.
  - Every WebGL surface is an `EngineView`. Pointer input goes to DOM elements, because the canvas has `pointer-events: none`.
  - DOM over views uses `z-index: calc(var(--engine-z) + 1)`.
  - Elements that host a view get only 2D transforms, never 3D.
- **D5 · RetroDisplay.**
  - Use the existing API unmodified (`mode`, `pixelScale`, `reveal`, `tokenRoot`, `DISPLAY_MODES`).
  - Plus **one additive core option**: `RenderOptions.mask?: { shape: 'ellipse' | 'roundrect'; radius?: number }`, implemented as a `discard` in `display.frag.glsl`. Default off, with a test, and 4D.OS output byte-identical.
  - Used by bloom (the eyepiece, peepholes and wheels if they are GL), neon (CRT corners), and orbit (round tray sockets).
  - One page-level display registry (`shared/displays.ts`). Each landing's single 1-bit / 16 / Millions control sets every view.
- **D6 · Simulation.**
  - Any sim that must keep running when its view is off-screen runs as `engine.addTicker` or a 10 Hz timer, never in `view.tick`. This covers bloom's chamber and orbit's economy.
  - Physics is a fixed step, seeded, in a pure TS module with vitest fixtures.
- **D7 · Smooth scroll.**
  - Add an additive option to `setupSmoothScroll({ resetToTop = true })`. 4D.OS is unchanged.
  - Landings pass `false`, so the `#2f`, `#worlds`, `#g=` and machine-URL deep links survive.
  - Anchors go through Lenis. Reduced motion means no Lenis (already the case).
- **D8 · Fonts.**
  - Committed woff2 in `src/playground/<slug>/fonts/` plus `OFL-*.txt`, pulled once from the fontsource tarball (`npm pack`). **No new dependencies.**
  - `@font-face` goes in the landing's `tokens.css` with relative URLs. `font-display: block` for the single hero display face, `swap` for the rest. No hand-written preload tags, because the file names are hashed.
  - Add a row to `LICENSES.md` → Typefaces for every face.
  - Final faces:
    - neon: Bungee, Bungee Shade, DotGothic16 (+ the committed JP subset), M PLUS Rounded 1c
    - orbit: Tilt Warp, Rampart One, **Libre Franklin**, Sono
    - bloom: **Ultra**, Recursive (the CASL and MONO subsets)

    No face is shared between landings or with 4D.OS.
- **D9 · Stills.**
  - One shared set at `playground/public/landings/_shared/stills/{a..e}.webp`: lossless WebP at 1200×900 (423 KB total, measured), with a `provenance.json` sidecar (source still, route, capture method and date, "synthetic scene").
  - Commit A/B/C in `public/launcher/` and extend the stills row in `LICENSES.md`.
  - **Never re-dither**, so no CSS dither overlays. The 3 px block grid shows `image-rendering: pixelated` only at integer multiples of 400×300; smaller sizes use smooth downscaling.
  - Lazy-loaded, with real alt text.
  - Every still is labelled synthetic. A, B and C carry the verbatim cat credit from `LICENSES.md`, visible near the still.
- **D10 · Index contract.**
  - One data module, `src/playground/shared/worlds.ts` (id, name, route, still, one honest line, credit), used by all three landings.
  - Contents: five worlds, the launcher, and **exactly three** lab slots with no names, no links and no dates.
  - The index is **the second section** on every landing, with a visible first-viewport link to it on desktop *and* phone.
  - World links are always enabled (no game gates) and are real `<a href>` in the static HTML.
- **D11 · Sound.**
  - `shared/sound.ts`:
    - `AudioContext` created lazily inside a user gesture
    - master −18 dB → `DynamicsCompressor`, a voice cap, suspended on `document.hidden`
    - `localStorage` key `playground:sound` inside try/catch
    - never audible without a gesture in the current page load
  - Each landing draws its own toggle (neon's grille, orbit's bell, bloom's gem), but the semantics are fixed: a `<button aria-pressed>` with visible "Sound off / Sound on" text, reachable in viewport 1, **off by default**. WebAudio synthesis only.
- **D12 · Reduced motion.**
  - `shared/motion.ts` watches the media query live.
  - No autoplay. Every toy jumps to its result as a pre-exposed still: neon G8, orbit G8, bloom HOLD. That is the purest "every moment at once" and should stay identical in spirit across all three.
  - Everywhere, regardless of setting: ≤ 3 flashes/s, and no full-field colour change faster than 3 Hz.
- **D13 · No WebGL2.**
  - `shared/probe.ts` checks `getContext('webgl2')` **before** the dynamic import of the three/Engine chunk.
  - The static HTML already holds fields, type, index, stills and lab slots.
  - 2D fallbacks are built at runtime, never by a build-time baker. One honest line per page.
- **D14 · Budget.**
  - ≤ 350 KB gz JS per entry including the shared three chunk, measured from `vite build` output.
  - ≤ 2 MB first load. 60 fps at 1440×900 checked with `engine.stats` and a performance trace.
  - Only on-screen views tick. The Engine idles at zero frames.
- **D15 · Copy and chrome.**
  - `<title>`: "<Name> · crewtives playground". Bloom's em dash is replaced.
  - English copy, and a build stamp "demo build 0.1" in each footer.
  - The footer carries one plain line, "One of three candidate landings · compare at /landings/", removed on promotion.
  - Credits: fonts (OFL), three / GSAP / Lenis, and the cat CC-BY line.
  - No claim about anything the page code does not control.
- **D16 · Build order and cut line.**
  - Per landing: shell + hero toy + index + footer first, so the hub is never missing. Then the toys in the listed order.
  - A toy not finished at ship time ships as an honest in-world placeholder: neon's 調整中 cabinet, orbit's empty die-cut socket, bloom's clear-glass empty cell. It is never hidden and never faked.
- **D17 · Contract hygiene.**
  - The direction contract lives only in each landing's surface brief. It never goes into HTML, comments, `data-*` or bundles.
  - The FINISH line applies to each landing: finish review, verdict, `DESIGN.md`, and provenance for every shipping raster (`embed-prompt --scan` over `_shared/stills`, plus sticker and proof PNGs, which carry their own tEXt provenance).

---

## 9. Per-landing verdicts and mandatory adjustments

### Game Center Yonjigen (neon): keep, with scope cuts. Strongest hub and most varied fun; largest build.
1. Drop 5F LIFE. The building becomes 1F RAIN RUN, 2F 4D.OS, 3F PRIZE, 4F PARLOUR (mint field, inherited from 5F), 5F LAB and RF ROOF: six directory cells.
2. Parlour: replace the black-hole well with a centre start pocket (heso) plus tulips, with FEVER every 7th pocket. Replace the twin bead rails with mirrored twin launchers. Keep the phyllotaxis rosette, the symmetry rocker, the rewind jog and the shutter.
3. Crane: one layer of capsules, 2D disc physics in the x–z plane shared with the parlour solver, and a scripted vertical drop. No 3D stacking solver.
4. Ghost replay from recorded poses, not an input stream.
5. Stills per D9: no CSS dither overlay, and the "off" CRT state is a dimmed still. Add the cat credit under A–C and in the credits.
6. The marquee is capped at 96 px. Floor numerals are ≤ 96 px as text, or become authored SVG sign plates. Cobalt only as a control-deck part, never a floor field.
7. The phone first viewport gets a direct visible link to 2F (5 worlds), because the directory is hidden there.
8. The sign atlas awaits the DotGothic16 JP subset before drawing. The JP subset is committed once.
9. Plumbing per D1–D3. `vite.landings.config.ts` and `dist/landings` are rejected.

### Wind-Up Empire (orbit): keep. The most original world, and the planets-as-index hub is excellent.
1. Recompose the lid from bilateral mirror to C2 diagonal box art (§3.6). The phone stack is unchanged.
2. Body face: Zen Maru Gothic → Libre Franklin 500/700. Remove the "Japanese makers" line.
3. Slug `/landings/wind-up-empire/`.
4. Build the no-WebGL fallback at runtime in Canvas2D. Delete `scripts/bake-orbit-fallback.ts`.
5. Hard-code the tray-top palettes, with a drift test against `src/flavors/*/tokens.css`.
6. Rephrase "no tracking" to "This page stores nothing and sends nothing."
7. The economy runs on a 10 Hz timer independent of views (D6).
8. Stills per D9: lossless WebP instead of the 700 KB PNGs. Keep the cat credit.

### Bloomscope (bloom): keep. The most beautiful single mechanism and the clearest symmetry story.
1. Palette:
   - the hero leaves cobalt for chartreuse #C8F03C, and all hero text flips from sheet to plum ink;
   - the Vogel print is #B2DB2A;
   - Sow moves to lilac #B99CFF;
   - Lathe stays glaucous, Hive honey, Worlds petal, footer plum;
   - cobalt remains only as a glass colour;
   - the sheet becomes about #FDFDF6.

   The ruby NOW on chartreuse is 3.39:1; the ink keyline stays.
2. Display face: Bagel Fat One → Ultra. Body text in Recursive CASL 0, with CASL 1 for labels only.
3. Move "Load another wheel" to section 2, right after the Scope. The peepholes keep the bench-to-scope loop visible.
4. Delete `capture-stills.cjs`, Playwright and the placeholder emblems. Use the D9 stills with a "synthetic scene" label per wheel and the cat credit for A–C.
5. Plumbing per D2–D3. No `public/landings/…` in the repo's `public/`.
6. Circular eyepiece and peepholes via the D5 mask.
7. The chamber sim becomes an Engine ticker (D6), so the peepholes stay live.
8. Gems are flat SVG facets, with no `backdrop-filter` or blur.
9. Drop water descends along the leaf spine with an index hop, not mesh walking.
10. Use the precise sub line for the golden-angle punchline (§7).

---

## 10. Remaining risks

1. **Build volume.** Three ambitious builds at once. Neon is still the largest after the cuts. D16's order and in-world placeholders keep each one shippable and honest at any stopping point.
2. **Core edits** (the D5 mask, the D7 option) touch shared code. Each must be additive with default-off, covered by tests, and checked by loading `/4d-os/a–e/` after the change.
3. **`publicDir` misconfiguration** in the playground config would copy 230 MB of packs to the dist root. This is the single worst plumbing mistake. Assert it in a build check (fail if `dist/packs` exists).
4. **Touch conflicts on canvases.** The rocket, key and ring use `touch-action: none` on small hit areas and `pan-y` elsewhere. This needs a real-phone pass.
5. **Legibility.** Tilt Warp at XROT/YROT extremes and Rampart One below 16 px (both already capped). Japanese correctness in neon, from a fixed glossary; it still deserves a native reader.
6. **Whole-set sameness risk that remains:** three drenched light pages with a live dithered hero. The finish review must put all three first viewports side by side at 1440 and 390 and name each one's memory sentence. If two read as the same in a thumbnail, the palette fix was not enough.
