# Game Center Yonjigen (final direction, "neon" candidate)

Visitor-facing name: **Game Center Yonjigen** (ゲームセンター 四次元, "Four-Dimension Game Center")
Slug `game-center` · route `/landings/game-center/` · pinned theme: cyberpunk / Blade Runner / neon Tokyo, with black holes as a small secondary note
Seed key **9365b33c** · assigned index **3** · base: the world-first proposal, direction #3 of its own list, "the Japanese game-center cabinet and the building that holds it"
Build path: code-led (no image generation). The ambition lives in the contract, the exact first viewport and the named signature interaction (TIME VIEW).
Scratch design document. No repo file was edited.

---

## J. Judging

### Seed check
Both designers ran seed `9365b33c` and built **index 3 of their own list**. Neither reordered after the roll. Both put the literal reading (the neon sign street) in slot 1 and offered it as IMPECCABLE'S PICK with a familiarity risk line, which is correct.
- Toy-first ("Neon Parlour"): list #3 = pachinko machine face. Built #3. ✓
- World-first ("Game Center Yonjigen"): list #3 = game-center cabinet and building. Built #3. ✓

### Scores (1–10)

| axis | Neon Parlour (toy) | Game Center Yonjigen (world) |
|---|---|---|
| 1. Audience identification with the pinned theme | 7: the pachinko hall is everyday neon Tokyo, but Blade Runner only lives inside the glass | 8: game center + orange-haze sign canyon + rain roof; risk of reading as "retro arcade" |
| 2. Product clarity (toys you play + index of real demos) | 6: one machine dominates, and 4 of its 5 "toys" are controls on that machine. The island index is good but arrives late | 9: the building *is* a hub. The floor guide names every toy and the index from viewport 1, with a 2F index, ranking board and 6F lab |
| 3. Beauty and vividness at page scale | 8: vermilion → ultramarine → sodium → pink wipes, one magnificent cabinet | 8: one enamel drench per floor, backlit marquee, cabinets; risk of busyness |
| 4. Fun / satisfaction of the toys | 7: the pour and the rewind are deeply satisfying but one-note | 9: fly, grab, pour, paint: four different verbs |
| 5. Every moment at once + low poly + symmetry | 9: long-exposure plate, rewind jog, phyllotaxis D_k rosette, black-hole well | 8: exposure ribbon + TIME VIEW, mirrored canyon, D4 Life painting, C3 claw |
| 6. Feasibility (stack/budget) | 7: one scene; pinned three-stage scroll is fragile | 5: four WebGL toys + fallbacks + a 3D crane solver is a large build |
| 7. Distance from the AI-default looks | 9: bright hall; darkness only behind glass | 8: enamel floors; the marquee could drift to 8-bit nostalgia |
| 8. Honesty | 8: fake odds stated; the whole landing is a gambling machine | 9: DEMO / FREE PLAY are native, 調整中 lab, "the only prizes are links", no invented ranking |
| **total** | **61** | **64** |

### Why the world-first proposal is the base
The brief asks for a **playground hub**: several toys plus an index of real demos. The game-center building is that hub. Its topology (floors = genres, a floor directory, an elevator) carries the product without explanation, and its native vocabulary (ATTRACT, DEMO, FREE PLAY, 調整中) makes the honesty rule part of the world instead of a disclaimer. Neon Parlour is the better single object and has the stronger "every moment" proof. So its best object moves into the building as a floor, rather than the building being squeezed into a pachinko cabinet. The base's weakness is scope, and the raises below cut it.

### Grafts from Neon Parlour (named)
- **G1 · The parlour glass.** The phyllotaxis nail rosette (golden angle, `r = 11√n`), its MIRROR / 6-FOLD / 8-FOLD / FREE symmetry rocker, the windmills and the black-hole centre well replace the hex Galton lattice on 4F. This is more symmetric, more beautiful, and ties to world E.
- **G2 · Rewind jog + shutter.** The 12 s ring-buffer rewind (jog wheel, J/K/L) and the NOW / 1 s / 5 s / EVERY MOMENT shutter move onto 4F. This is the 4D.OS mechanism in miniature: balls climb back up through the nails.
- **G3 · Gas tuner.** The five-gas rotary with honest discharge colours becomes the fifth toy, lit on the RF roof sign. The DIP block stays as the service panel (settings, not a toy).
- **G4 · Every machine is an address.** The hash-state idea ("COPY THIS MACHINE") extends to the 4F machine (symmetry, rails, seed, shutter) and to the 5F Life pattern.
- **G5 · Bright hall, dark only behind glass.** A hard rule for the whole page: fields are lit enamel. Darkness is allowed only inside a CRT, a machine glass, and the roof.
- **G6 · Parlour honesty copy.** "Free balls. No bets, no prizes, nothing saved."
- **G7 · Chrome facets.** Three chrome tones for balls, the crane claw and the pachinko cabinet.
- **G8 · Pre-exposed still.** Under reduced motion, simulations fast-forward headless and paint a finished exposure, so the idea reads with zero autoplay.

### Judge's raises (weaknesses fixed)
1. **Rain Run becomes a real game.** It gets light gates, a combo, 3 lives, a 90 s timer, and GAME OVER, which swings into TIME VIEW by itself. The base had a score HUD with no rules.
2. **The grid math is fixed.** The base's 12 × 96 + 11 × 24 = 1416 px does not fit a 1288 px cabinet. The grid is now **12 × 78 px + 11 × 24 px = 1200 px**, x 82–1282, centred on x = 682.
3. **Vermilion goes from #F23A1D to #FF4B26.** Ink on it rises from 4.91 to 5.72:1. Every secondary text colour is a hue tint, measured below.
4. **Scope is cut and made honest.** Floors are lazy-loaded and there is a fixed build order. Any floor not finished ships as its own 調整中 cabinet, a native, truthful fallback. The crane uses a small sphere solver, not general PBD. The nail hammer from Neon Parlour is *not* grafted: roving focus over 260 nails costs too much.
5. **The retro display is shown in viewport 1.** A real 3-position SCREEN slide (16 / 1-BIT / MILLIONS) sits on the hero bezel's right wing, synced with DIP SW2–3.
6. **The stills exist.** All five 1200 × 900 stills now exist in `public/launcher/` (A/B/C are untracked in git and must be committed with provenance before this ships). No placeholder cards are needed.
7. **No unicode icons.** ▶, ▲ and arrows used as controls are authored SVG. The text arrow "→" appears only inside running copy.
8. **Sibling separation.** Two other candidate landings also drench in cobalt, tomato and lemon, and one uses Dela Gothic One. This landing owns *backlit acrylic + CRT + sodium/orange haze*. Cobalt appears only on control decks and one floor (4F). Its faces (Bungee, Bungee Shade, DotGothic16, M PLUS Rounded 1c) are used by no other candidate.

---

## 0. Grounding

**Mechanism.** A studio playground where each experiment runs live in the browser and keeps every moment it has lived on screen. Time is shown as exposures on a real-time dithered 16-colour display, and the shapes are computed from equations.
**Audience scene.** A creative-tech visitor on a desktop at night (sometimes a phone in bed), arriving from the studio portfolio or a clip, who wants to *touch* something within 3 seconds.
**Cultural home.** Tokyo after dark (Shinjuku, Akihabara, Kabukichō): its signs, machines, print and screens, not only its tubes.
**This surface must prove** that the studio's "every moment at once" is something you *play*, and that real worlds sit behind it.
**Rut (kept off the list).** A near-black page with one cyan/magenta glow, glyph rain, glitch text and a card grid. The predictable opposite is a white Swiss lab index. The literal reading (a neon street) takes at most one slot.

### Seven grounded candidates, in resonance order (unchanged from the base)
1. **Kabukichō tate-kanban canyon.** Vertical stacks of lit signs on both sides of a narrow street. The literal reading and a naturally symmetric vanishing point. *(lit acrylic / glass tube)*
2. **The ESPER photo-analysis machine (Blade Runner).** "Enhance" a still and move through it in 3D. The cinematic ancestor of a scrubbable 4D scene. *(CRT screen interface)*
3. **The Japanese game-center cabinet and its building.** Candy-moulded cabinets, backlit marquee, printed bezel, a 4:3 CRT in attract mode reading DEMO, FREE PLAY, one genre per floor. A playground hub is literally what a game center is. *(moulded plastic, printed bezel, CRT, carpet)* **← assigned, built**
4. **Pachinko parlour.** Chrome balls through a symmetric pin field. Its long exposure is a chronophotograph. *(chrome, brass, mechanism)*
5. **JR wayfinding and LED departure boards.** Line colours, station numbering, boards that tick. Tokyo's information-design grammar. *(printed wayfinding / LED matrix)*
6. **Vending-machine wall (jidōhanbaiki).** A lit grid of dummies and buttons glowing on a dark side street. *(lit plastic / product dummies)*
7. **Purikura sheets and cyberpunk-manga screentone.** Four-exposure sticker strips and halftone print. The street's own small chronophotograph. *(printed ephemera / screentone)*

**IMPECCABLE'S PICK (one card, never the lead): #1, the tate-kanban canyon.** Risk line: it is the most familiar rendition of "neon Tokyo", where most runs land, and it overlaps world D's city. It lives inside this build as the Rain Run scene and the roof view, not as the page's world.

---

## 1. Challengers: verdicts and raises

| # | Challenger | Fused as | Audience | Clarity | Verdict |
|---|---|---|---|---|---|
| 1 | HyperCard shoebox stack | 1-bit cards, one per world or toy | loses (colourless vs pinned vivid neon) | loses (toys hidden behind flips) | **declined** |
| 2 | Drum-machine step row | A 16-step row triggering toys | loses | loses (sequencing ≠ browsing a hub) | **declined** |
| 3 | Swiss poster wall | One poster per world on one grid | loses (Zürich, not Shinjuku) | ties at best; posters are not played | **declined** |
| 4 | Grid-horizon sunset | Drive to a banded sun, worlds as road signs | **holds** (sits next to cyberpunk) | loses (one horizon hides index and toys) | **competitive**: full alternate. Case: "Neon Tokyo as the road to a sun; every world a sign you pass." Risk: it is the default neon rendition |
| 5 | Kiln glaze shelf | Cups as samples, glaze as time | loses | loses | **declined** |
| 6 | Gravity-rain garden | Paint clouds whose rain falls toward attractors | loses (the rain is already this world's; the garden is not) | loses | **declined** (the toy-first designer rated it competitive; the judge sides with the base because Blade Runner rain already lives in Rain Run and RF) |

**Raises (named lines, discipline never clothes):**
- **HyperCard raise: every card has an address.** Every floor and every machine state is a deep link (`#1f`, `#2f`, `#3f`, `#4f?sym=6&rails=twin&seed=…&shutter=all`, `#5f?life=<base64 of the 24×24 grid>&sym=octa`, `#6f`, `#rf`). The elevator pushes History entries, so Back rides down a floor. COPY THIS MACHINE copies the exact URL.
- **Drum-machine raise: one clock tells you where "now" is.** A single 120 BPM master clock (beat 500 ms, eighth 250 ms) drives every marquee band, lamp chase, DEMO blink, pachinko launch cadence, fever chase and elevator ding. Nothing blinks on its own timer.
- **Swiss-grid raise: one module governs the building.** 12 columns × 78 px with 24 px gutters (1200 px), a vertical rhythm of 24 px, and cabinets sized in whole columns. Floors differ by field colour and machine, never by layout anarchy.
- **Kiln-shelf raise: the recipe card beside every sample.** Every cabinet carries a printed HOW TO PLAY card with its controls and keys, always visible and never in a tooltip. Machine states use one fixed vocabulary: ATTRACT → PLAY → TIME VIEW → GAME OVER, plus 調整中 UNDER ADJUSTMENT.
- **Gravity-garden raise: deterministic replay.** Every toy run is seeded. Rain Run replays your best run as a ghost (seed + input stream). The 4F REPLAY SEED re-pours the same balls. The crane's grip roll is seeded and its odds are printed.

---

## 2. Direction contract

**THESIS.** The playground is a Tokyo game-center building. Each floor is a genre, each toy is a cabinet you actually play, and scrolling is the elevator ride. It refuses both the black-plus-cyan neon street and the card grid of demos.

**OWN-WORLD.** Every floor is drenched in one lit enamel: vermilion, sodium, candy, cobalt, mint, carpet violet. Night exists only inside CRTs, machine glass and on the roof. Bezels are violet-black ink, marquees are backlit Bungee Shade, and screen text is DotGothic16. Buttons are candy microswitches, settings are DIP slides, unfinished machines wear 調整中 cards, and prizes print as thermal tickets. Every screen is a live 16-colour dithered display.

**STORY.** The visitor presses START and flies a hover taxi through a mirrored sign canyon. At GAME OVER the whole flight turns sideways into a chronophotograph. They ride up, open one of five 4D.OS cabinets or win one from the crane, pour and rewind the parlour glass, stack a life, and meet the machines under adjustment.

**FIRST VIEWPORT.** At 1440 × 900, a vermilion cabinet front fills x 0–1364, with a 76 px ink floor directory on the right. A sodium marquee (y 0–126) reads PLAYGROUND. An ink bezel (y 146–770) frames a 739 × 554 CRT centred on x 682, running Rain Run in attract mode. A cobalt control deck (y 770–900) holds the stick, A/B/C and 1P START, which is the primary action.

**FORM.** The Japanese game-center cabinet and its building, #3 of seven grounded candidates, seed key `9365b33c`. It is raised by the HyperCard, drum-machine, Swiss-grid, kiln and gravity-garden disciplines, and grafted with the parlour glass, rewind jog and gas tuner.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

---

## 3. Physical scene, light vs dark

*A night visitor stands at a lit cabinet on the third floor of a Shinjuku game center. Fluorescent tubes hum overhead, candy plastic is everywhere, the CRT is the darkest thing in the room, and rain streaks the window over an orange-hazed street of signs.*

The page is therefore **light and loud**. Darkness is allowed only inside screens, machine glass and on the roof (RF), where you step out into the rain. This inverts the black-plus-glow rut while keeping Blade Runner's night where it belongs: behind glass.

## 4. Colour strategy: Full palette, drenched per floor

Each floor's field owns 100% of its region, and floors change colour the way a building's floors change carpet and cabinet paint. Two constants tie the floors together: ink (#140A24, violet-black, never pure black) and acrylic (#F2F4FF). No accent is ever scattered on a neutral ground: a colour either owns a region or is a machine part (button, lamp, tube, ball).

### Page tokens (contrast measured, WCAG 2.x)

| token | hex | role | measured |
|---|---|---|---|
| `--ink` | `#140A24` | bezels, text on warm fields, floor directory, floor slabs | acrylic on ink 17.44 |
| `--acrylic` | `#F2F4FF` | button caps, text on cobalt / carpet / night / wine | — |
| `--enamel` | `#FF4B26` | **1F** field: cabinet front (vermilion) | ink 5.72 |
| `--enamel-2` | `#2E0803` | secondary text on enamel | 5.46 |
| `--sodium` | `#FFCC17` | marquee backlight, **2F** field, focus lamp | ink 12.65 |
| `--sodium-2` | `#4A3500` | secondary text on sodium | 7.72 |
| `--candy` | `#FF4FA0` | **3F** field, B button | ink 6.26 |
| `--candy-2` | `#33061C` | secondary text on candy | 5.81 |
| `--cobalt` | `#2238E0` | control decks, **4F** field | acrylic 7.07, sodium 5.13 |
| `--cobalt-2` | `#D4DAFF` | secondary text on cobalt | 5.64 |
| `--mint` | `#1FD68A` | **5F** field, C button | ink 10.05 |
| `--mint-2` | `#083D26` | secondary text on mint | 6.47 |
| `--carpet` | `#3A1C8C` | **6F** field (dithered star carpet) | acrylic 11.11 |
| `--carpet-2` | `#D9CCFF` | secondary text on carpet | 8.14 |
| `--night` | `#1B1140` | **RF** roof sky, CRT surround | acrylic 15.96, sodium 11.58, candy 5.73 |
| `--night-2` | `#B9B3E0` | secondary text on night | 8.82 |
| `--crt` | `#0B0718` | CRT black | sodium 13.14, candy 6.50 |
| `--amber` | `#FF8A1F` | haze, brass, pachinko handle | ink 8.11 |
| `--wine` | `#9E1233` | elevator display, zenith | acrylic 7.40 |
| `--tube` | `#33E1FF` | the only cyan: roof tube highlights and rain glints | night 11.12 |
| `--uv` | `#B04BFF` | exposure ramp, ultraviolet sign | — |
| `--chrome-hi` / `--chrome` / `--chrome-lo` | `#DDE3EC` / `#9AA4B2` / `#4B5362` | balls, claw, pachinko cabinet facets (graft G7) | chrome on ink 7.58 |

Rules: text on enamel, sodium, candy, mint and amber is ink. Text on cobalt, carpet, night, wine and crt is acrylic, or sodium for data. Body text stays ≥ 18 px on enamel, and anything smaller moves onto an ink panel. Browser surfaces: `::selection` candy on ink; caret enamel; focus = 3 px sodium ring + 2 px ink offset, flipping to 3 px ink + 2 px acrylic on the sodium floor. Scrollbar: ink track with the current floor's colour as thumb and a 2 px ink border. Links underline at 0.18 em offset, 2 px. All numerals in DotGothic16 with `font-variant-numeric: tabular-nums`.

### RetroDisplay 16 (`--pal-16-0..15`, shared by every screen)

| idx | hex | name |
|---|---|---|
| 0 | `#0B0718` | CRT black |
| 1 | `#1B1140` | indigo night |
| 2 | `#3A1C8C` | carpet violet |
| 3 | `#2238E0` | cobalt |
| 4 | `#33E1FF` | tube cyan |
| 5 | `#1FD68A` | mint |
| 6 | `#0E6B4E` | deep sign green |
| 7 | `#FFCC17` | sodium |
| 8 | `#FF8A1F` | amber haze |
| 9 | `#FF4B26` | vermilion |
| 10 | `#9E1233` | wine |
| 11 | `#FF4FA0` | candy |
| 12 | `#B04BFF` | ultraviolet |
| 13 | `#7A7FB0` | rain slate / chrome shadow |
| 14 | `#D9DEFF` | pale acrylic / chrome high |
| 15 | `#FFFFFF` | white-hot glint |

1-bit: `--pal-1bit-0: #0B0718`, `--pal-1bit-1: #FFCC17` (a sodium monochrome monitor). The haze gradients run only through wine → vermilion → amber, so in 16-colour mode the Bayer dither bands the sky into three hot steps. No screen may read as black + cyan: cyan (idx 4) is capped at ≤ 4% of any frame's pixels (rain glints and tube highlights only).

## 5. Fonts (all SIL OFL 1.1, self-hosted woff2; versions verified 2026-09-25 with `npm view`)

| family | role | source |
|---|---|---|
| **Bungee** 400 | Signage voice: floor numerals, section headlines (≤ 6 words, caps), button silkscreen, and floor-directory genre words set `writing-mode: vertical-rl; text-orientation: upright` | `@fontsource/bungee` **5.3.0** (Google Fonts css2 also serves woff2) |
| **Bungee Shade** 400 | Marquee wordmarks only (PLAYGROUND, each cabinet marquee): its built-in shade is backlit extruded plastic | `@fontsource/bungee-shade` **5.3.0** |
| **DotGothic16** 400 | Everything on a screen (HUD, scores, FREE PLAY, ranking board, tickets, timecode) and **every Japanese glyph** | `@fontsource/dotgothic16` **5.3.0** for Latin. Kana/kanji come as a Google Fonts `&text=` subset (verified: returns one woff2 with the requested unicode-range), saved into `fonts/` beside `OFL-dotgothic16.txt` |
| **M PLUS Rounded 1c** 400 / 800 | Body text and instruction cards, 16–19 px | `@fontsource/m-plus-rounded-1c` **5.3.0**, Latin subset |

None is on the training-default list, used by a 4D.OS world, or used by the sibling candidates. The Japanese vocabulary is fixed and subset once: ゲームセンター 四次元 調整中 無料 営業中 景品 階 時間 未来 雨 占い ラーメン カラオケ 薬 両替 非常口 縦. Font transfer ≈ 100 KB. Preload Bungee Shade (marquee) and DotGothic16 Latin only.

**Type scale (24 px rhythm):** marquee 104 (Bungee Shade, fitted to 880 px), H2 72 / 48 (Bungee, `line-height: 0.95`, tracking 0), floor numerals clamp(120px, 22vh, 220px), lead 24 / 1.4, body 18 / 1.55 at 60–68 ch, card 16 / 1.5, silkscreen 11–13 (Bungee, +0.08 em), screen text 14–22 (DotGothic16, integer px only).

## 6. Grid

Desktop ≥ 1280: the cabinet area is x 0–1364 and the floor directory x 1364–1440. Grid: 12 × 78 px, gutter 24, total 1200, x 82–1282, axis x = 682. Tablet 768–1279: 8 × 72 / 24, directory 56 px (numerals only). Phone < 768: 4 columns, 16 px gutters, no directory (elevator popover).

---

## 7. Procedural low-poly scenes (no model files)

All meshes are non-indexed `BufferGeometry` with per-face normals (flat shading). Signs and lamps use `MeshBasicMaterial`, so exact colours reach the quantizer. Solids use `MeshLambertMaterial({ flatShading: true })` under one sodium key light (dir −0.4, 0.8, 0.6) and a wine→indigo hemisphere. Every screen is one `EngineView` on the single `Engine` canvas with its own `RetroDisplay`, and every display joins a shared registry so SCREEN / DIP switch them all at once.

### 7.1 Sign canyon (1F Rain Run, reused by RF)
- Street: x ∈ [−7, 7], z from 0 to −240. The world scrolls at v (see toy T1), and towers recycle modulo 240.
- Towers: N = 24 per side, z_i = −10i − 5, hash `h(n) = fract(sin(12.9898n)·43758.5453)`. Width `w_i = 6 + 3h(i)`, height `H_i = 18 + 30·h(i+7)²`, chamfered boxes (12 faces). **The right side is x → −x of the left: exact bilateral symmetry** about the vanishing axis.
- Tate-kanban: `K_i = 2 + ⌊4h(i+3)⌋` vertical signs per street face, heights {2.4, 3.2, 4.0}, 1.6 wide, 0.4 deep, their inner face at |x| = 5.8, gap 0.3. They're textured from a runtime 1024² canvas atlas where DotGothic16 draws real words vertically (ゲーム, カラオケ, ラーメン, 薬, 占い, 営業中, 両替, 四次元, 時間, 未来, 無料) in ink or white on vermilion / sodium / candy / mint / cobalt / white. No pseudo-kana.
- Light gates (new): every 30 u of z, an overhead crossing banner (a flat box 14 × 1.2 × 0.3 at y = gy + 2.2) with two side posts, forming a lit opening 4.0 wide × 3.0 tall centred at (gx_k, gy_k). `gx_k = (−1)^k · 3.0·|sin(0.7k + s)|`, `gy_k = 3.0 + 1.8·sin(1.3k + s)`, where s is the run seed. Consecutive gates are mirror images, so the course itself is symmetric in pairs.
- Haze: `FogExp2(#FF8A1F, 0.012)`. Sky: an inverted icosphere (detail 2) with vertex colours wine at the zenith → vermilion → amber at the horizon.
- Wet street: the tower group is drawn a second time with `scale.y = −1` through a 0.45 darken (skipped on phones).
- Rain: 1200 instanced streak quads (400 on phone), 38 u/s at an 8° slant, y wrapped mod 40, slate→pale acrylic. Rain streaks only; never glyphs.
- **Hover taxi (subject):** lofted from 7 stations over length L = 4. At station z_j the hexagonal section is `p_k = (a·s(z)·cos θ_k, b·s(z)·sin θ_k)`, θ_k = kπ/3, a = 1.0, b = 0.55, `s(z) = sin(π·(z/L)^0.7)`. It adds a half-icosahedron canopy and two hexagonal ducted fans at x = ±1.3 (radius 0.5). Sodium body, vermilion stripe, acrylic lamps; ≈ 180 triangles. Collision hull: a box of half-extents (1.8, 0.6, 2.0).

### 7.2 Crane cabinet (3F)
- Interior: a box 10 (w) × 8 (h) × 10 (d) behind glass, with the chute at front-left (x −5 to −3, z 3 to 5), walled by a clear 1.2-high lip.
- **Capsules:** 12 (8 on phone), `IcosahedronGeometry(0.9, 1)` split at the equator. The top is translucent (candy / mint / sodium / cobalt / ultraviolet), the bottom acrylic. The contents are 5 × 4D.OS worlds A–E, 1 × launcher, and 6 × studio stickers (8 on phone: A–E, launcher, 2 stickers). The letter is visible through the top as a DotGothic decal.
- **Sticker emblem:** D6 rosette from the capsule seed: `r(θ) = 1 + 0.35·cos(6θ) + 0.15·cos(12θ + φ_seed)`, filled in 3 palette colours, exported as a 512 px PNG whose `tEXt` chunk carries `seed=<n>; source=procedural; crewtives playground demo` (provenance).
- **Claw:** a hub plus 3 prongs at azimuths 2πi/3 (C3), each 2 segments (0.9 + 0.7), opening α 42° → 10° when closing (220 ms). Chrome three-tone.

### 7.3 Parlour glass (4F, graft G1)
Playfield units: 400 × 600, origin top-left, y down. The glass is a circle R = 196 at C = (200, 300).
- **Nail rosette:** phyllotaxis about C: `θ_n = n·137.5078°`, `r_n = 11√n`, n = 1…900. Keep 58 ≤ r ≤ 182 and x ≤ 200, then mirror (x' = 400 − x). Reject any point within 16 u of an accepted one, within 26 u of a windmill centre, or within 18 u of a tulip. Nail radius 2 u, ball radius 5.5 u, so the free gap ≥ 12 u > 11 u ball. ≈ 240 nails.
- **Symmetry modes:** MIRROR (above), 6-FOLD / 8-FOLD (keep the wedge 0 ≤ θ < 2π/k, rotate k copies, then mirror: dihedral D_k), FREE (raw phyllotaxis). The 48-lamp ring suits both (48 = lcm(6, 8)).
- **Windmills:** at (200 ± 118, 380) (r = 142 from C), 4 flat blades of 20 u, `I = 900`. On a hit, `Δω = (r × J)/I`, and ω decays as `ω *= e^(−0.6·dt)`. Pure physics, never animated on their own.
- **Tulips:** 2 on the axis at y = 380 and y = 468. Each has 2 low-poly petals (4-vertex fans) that open ±28° during FEVER.
- **Black-hole well:** at C, a flat-shaded accretion ring (`RingGeometry`, 48 segments, 3 bands: sodium 16 u, vermilion 24 u, ultraviolet 34 u), tilted 62°, over a black disc r = 12. Balls within 70 u feel `a = GM/r²` toward C, GM = 2.4·10⁵ u³/s². Inside 14 u a ball is **captured**: it leaves physics and spirals `r(t) = r₀(1 − t/τ)^(2/3)`, τ = 0.9 s, `ω = √(GM/r³)`.
- **Twin rails (judge raise):** two rails, the left one the circle r = 190 from θ = 200° up over the top to θ = 95° (y-up angles), and the right one its mirror. A ball rides as a bead on the inside of the wall and detaches when `v²/R` falls below the inward component of g, or at the rail end. In TWIN mode each launch fires a mirrored pair, so the exposure is bilaterally symmetric until ball-to-ball contacts break it, which is beautiful symmetry breaking.
- **Cabinet:** a superellipse `|x/264|⁴ + |y/420|⁴ = 1`, 64 samples, extruded with a 2-segment bevel, chrome three-tone, and a 48-lamp octahedron ring on r = 212.
- **Balls:** `InstancedMesh` of `IcosahedronGeometry(5.5, 1)` (80 tris, chrome). One facet catches the key light and survives the dither as a glint (pin ball facets to idx 13/14/15 via a per-instance palette bias if the glint is lost).

### 7.4 Life Tower (5F)
It reuses `lifeStep`, `seed` and `generations` from `src/core/views/lifeStack.ts` (pure functions, unmodified). The view itself is new, since `LifeStackView` renders a fixed glider. The grid is 24 × 24 toroidal. Generations stack upward as instanced flat-shaded cubes (edge 0.92, pitch 1, layer height 0.5), coloured along mint → cobalt → ultraviolet → candy, with the newest layer sodium.

### 7.5 Roof (RF)
A full-bleed `RetroDisplay` looks down into the sign canyon from the roof with a still camera, rain falling and signs reflected in the wet roof. Where the moon should be hangs a black disc r = 0.06 of view height, ringed by a lensed band (two `RingGeometry` bands, sodium / vermilion, the lower half squashed 0.35 to suggest lensing): world E's black hole, as a note.

---

## 8. "Every moment at once" and the retro display

- **The CRTs are RetroDisplay.** Each CRT renders at 1/3 resolution (pixelScale 3; 4 on phone) with Bayer 8 × 8 into the 16 OKLab colours. On arcade hardware that is the native look, not a filter. The SCREEN slide (hero bezel) and DIP SW2–3 switch 16 / 1-BIT / MILLIONS on every screen at once.
- **CRT power-on** uses RetroDisplay `reveal`, once per screen on first entry: a horizontal line `scaleY` 0.01 → 1 (260 ms, expo-out), then a 400 ms dissolve.
- **Exposures everywhere, each in its machine's grammar:**
  - Rain Run keeps a trail of the last 72 poses and, at GAME OVER or when you press C, turns the *whole flight* sideways into a chronophotographic ribbon (TIME VIEW, the signature).
  - 4F keeps every ball's path on the glass (shutter), and the jog rewinds the last 12 s.
  - 5F shows a pattern's whole life as one tower.
  - 3F leaves the claw's path dotted on the glass for the current try, and a dragged ticket leaves a window trail (`bindWindowTrail`).
  - The gas tuner's sign keeps a strip of every gas you struck.
- **Stills (2F):** `/4d-os/launcher/{a-vitrine,b-plate,c-leader,d-golden-stoop,e-whale-fall}.png`, 1200 × 900 = 4:3, which fits a CRT exactly. They're converted at build to 800 × 600 webp (≈ 45 KB each) with provenance "captured from the live 4D.OS render, <route>, <date>, synthetic scene". Each is shown under a CSS 4 × 4 ordered-dither overlay; hover or focus powers the CRT up to the clear still.

## 9. Symmetry
- **Bilateral:** the hero cabinet (marquee, bezel wings, deck mirrored about x = 682), the canyon (x → −x), the gate pairs, the parlour glass and twin rails, the roof skyline reflected in the wet roof (a vertical mirror), and the marquee side signs (ゲーム left / 四次元 right).
- **Rotational / dihedral:** the claw (C3), sticker emblems (D6), parlour 6-/8-fold (D6 / D8), and Life painting (D4 and its subgroups).
- **Phyllotaxis:** the nail rosette.
- **Page:** every floor centres its machine on axis x = 682. Only the floor directory breaks symmetry, the way a building's sign hangs on its corner.

---

## 10. Toys (five), each with a printed HOW TO PLAY card beside it

### T1 · Rain Run (1F hero cabinet), the signature
- **Inputs:** stick drag (pointer capture on the stick's DOM gate, radius 40 px maps to −1…1), or arrows / WASD. A = Z key (BOOST), B = X (GHOST on/off), C = C (TIME VIEW), START = Enter or a tap on the CRT.
- **States:** ATTRACT → PLAY → (TIME VIEW ↔ PLAY) → GAME OVER (auto TIME VIEW) → ATTRACT after 20 s idle.
  - ATTRACT: an autopilot springs toward each next gate centre, HUD "DEMO", no score saved.
  - PLAY: a 90 s timer and 3 lives.
- **Physics:** the target is (x*, y*) = stick × (5.2, 3.9) + (0, 5.1), so x ∈ [−5.2, 5.2], y ∈ [1.2, 9.0]. A critically damped spring follows it: `x″ = k(x* − x) − 2√k·x′`, k = 18 (same for y). Bank = −0.6·x′ rad (clamp ±0.7), pitch = −0.3·y′.
  - Forward speed: v = 24 u/s + 0.4 per gate passed, max 40. BOOST ×1.5 for 1.2 s, cooldown 3 s (a bar on the HUD).
  - Collision: the taxi's AABB against sign boxes and gate frames.
- **Scoring:**
  - Through a gate opening: +100 × combo (combo +1 per consecutive gate, max ×8; a missed gate resets it to ×1).
  - Hitting a sign or frame: CRASH. −1 life, a 0.6 s dithered sodium spark burst (no white flash), 1.0 s of invulnerability with the hull drawn at 50% dither, combo reset.
  - The run ends at 0 lives or 0 s.
  - HI is local to this browser (`localStorage`, try/catch) and labelled "this browser only".
- **Every moment:** the pose (position, bank, pitch, world-z) is sampled at 12 Hz. The live trail shows the last 72, aged sodium → candy → ultraviolet → indigo. The whole run is kept (≤ 1080 poses). TIME VIEW swings the camera 90° to a side elevation (1.2 s, `power3.inOut`; cut under reduced motion) and shows every 3rd pose (every 6th on phone) as one `InstancedMesh`: the flight as a millipede ribbon across the canyon, gates lit where you passed them. A time strip under the CRT scrubs it (drag, or ←/→ by 1/12 s).
- **Ghost:** the best run is stored as seed + 60 Hz stick input quantised to int8 (≈ 11 KB) and replayed deterministically in candy at 50% dither.
- **Feedback / sound:**
  - Gate: a square blip whose pitch climbs the C-major pentatonic with the combo.
  - Crash: a 120 ms noise burst lowpassed at 800 Hz.
  - BOOST: a sawtooth sweep 220 → 660 Hz over 300 ms.
  - Engine: a 55 Hz triangle hum that follows v.
  - Rain: pink noise at −30 dB.
  - GAME OVER: descending square B5-G5-E5.
- **A11y:** the canvas has `role="application"` and `aria-label="Rain Run, a flying game. Arrow keys steer, Z boosts, C shows the whole flight."`. The on-screen stick also has 4 arrow buttons. A live region reports "Gate 12, combo 4", "Crash, 2 lives left", "Time view: 214 moments shown" (throttled to ≤ 1 per 2 s).

### T2 · Win a World, the crane game (3F)
- **Inputs:** real Japanese crane rules. Button ① moves right *while held*, once; button ② moves back *while held*, once; on releasing ② the claw drops. Keyboard: hold → then hold ↑ (or 1 then 2). Touch: press-and-hold on the buttons.
- **States:** READY → MOVE-X → MOVE-Z → DROP → GRAB → LIFT → RETURN → RELEASE → PRIZE / MISS → READY (always FREE PLAY).
- **Constants:**
  - Carriage speed 2.2 u/s. Drop 4 u/s until a prong tip touches a capsule or the pile. Close 220 ms, lift 3 u/s to y = 7, return to the chute at 2.2 u/s, open.
  - Cable pendulum length 3 with damping 0.92 per 1/60 s, so the claw sways after each stop.
  - **Grab:** when the horizontal distance d from the claw axis to a top-layer capsule centre is < 0.5, a hold is attempted with **p = 0.8** from a seeded RNG, printed on the card. On failure the capsule slips at a seeded height between 2 and 6 u. When 0.5 ≤ d < 1.2 the prongs nudge it (impulse along the prong normal), so lucky pushes into the chute count.
  - **Solver:** spheres only (r 0.9), sphere–sphere and sphere–box contacts, g = 20 u/s², 8 substeps at 60 Hz, restitution 0.3, friction 0.6, sleeping when |v| < 0.05 for 0.5 s.
- **Payoff:** the capsule drops into the tray, splits (halves separate ±0.6 u over 300 ms), and a **thermal ticket** prints beside the machine. It's revealed top-down with `clip-path: inset()` in `steps(8)` over 320 ms, with 8 × 40 ms printer ticks. The ticket is a real link: "PRIZE · WORLD E · WHALE FALL · /4d-os/e/ · OPEN". Sticker tickets offer "SAVE STICKER (PNG)". Won tickets stack in the ticket rack (max 6, oldest drops off), each draggable with a window trail.
- **Sound:** a 70 Hz sawtooth motor through a 400 Hz lowpass while moving, a claw clack (6 ms noise + 180 Hz sine), a capsule bounce tick, printer ticks.
- **A11y:** the buttons are `<button>`s with keydown/keyup hold semantics and `aria-describedby` pointing at the HOW TO PLAY card. The live region reports "Claw over capsule D", "Grabbed", "Slipped", "Prize: world E, Whale fall. Ticket link added." The **prize list** under the machine lists all six links plainly, so nothing is gated behind skill. No WebGL2 → the cabinet shows 調整中 and the list.

### T3 · The Parlour Glass (4F, grafts G1 + G2)
- **Inputs:**
  - HANDLE: a rotary knob, `role="slider"`, 0–100, drag or ←/→ (5), Shift ×4.
  - LAUNCH: hold the button or Space for 4 balls/s, launched on the clock's eighth notes (every other eighth).
  - POUR 50: a burst over 5 s.
  - SYMMETRY rocker: MIRROR · 6-FOLD · 8-FOLD · FREE.
  - RAILS: TWIN · LEFT.
  - REPLAY SEED, CLEAR GLASS, COPY THIS MACHINE.
  - Shutter: NOW · 1 s · 5 s · EVERY MOMENT.
  - Jog wheel (168 px): spin the rim to scrub frame by frame (a detent every 1/30 s), twist the inner ring for −4× … +4×. J / K / L = rewind / hold / forward, plus a NOW button.
- **Physics:**
  - Fixed step 1/240 s (4 substeps per 60 fps frame), g = 980 u/s², air drag 0.02.
  - Nail contacts are circle–circle with restitution 0.55, tangential friction 0.92, and a seeded ±1.5° normal jitter (mirrored for twin partners). Ball–ball contacts use a spatial hash (cell 12 u), e = 0.4, with positional correction.
  - Launch speed `v₀ = 560 + 600·p` u/s, clamped to 1160 (≤ 4.8 u per step < ball radius, so no tunnelling). A low p dribbles into the outer field; a high p crosses the top.
  - Balls leaving the glass bottom (r > 190, y > 460) drain. Max 320 balls live (140 phone).
- **Capture and FEVER:** each capture adds one to "IN THE WELL" and plays the capture glide. Every 7th capture starts FEVER: tulips open emerald (mint) for 6 s, the 48-lamp ring chases at 2 Hz on the clock, and the display exposure warms +15% for 3 s. No flash exceeds 2/s.
- **Every moment:** balls are sampled at 30 Hz.
  - **Baked layer:** samples older than 12 s are flushed as dots into a persistent half-resolution render target that is never cleared except by CLEAR GLASS.
  - **Live layer:** the last 12 s are drawn each frame from the ring buffer as instanced points up to the playhead.
  - Rewind plays the 60 Hz state buffer backwards (320 × 720 × 2 Float32 ≈ 1.8 MB; phone 140 balls × 8 s): balls climb back up, captured balls un-spiral out of the well, and the live layer retracts. The lamp ring's "now" chase walks backwards, and the timecode turns amber reading `REWIND −1.00×`. Releasing resumes physics from that state (a new branch).
  - Dot colour ages sodium → vermilion → wine → ultraviolet.
  - After 20 s of EVERY MOMENT the glass holds a long-exposure photograph of the flow field: sodium rivers, a bright spiral into the well.
- **Sound:**
  - Nail tick: a 12 ms bandpassed noise whose pitch follows the nail's ring on C D E G A across 5 octaves. Mirror twins share a pitch, so symmetry is audible. Capped at 40 ticks/s.
  - Launch: a sine thump 90 → 40 Hz over 60 ms.
  - Capture: a sine glide 880 → 110 Hz over 0.9 s.
  - FEVER: an arpeggio C-E-G-B on the clock.
  - Jog: a 3 ms click per detent.
- **Honest copy:** "Free balls. No bets, no prizes, nothing saved. A physics toy wearing a pachinko cabinet."
- **A11y:** the jog is a `slider` with `aria-valuetext="7.4 seconds ago, rewinding"`. Symmetry, rails and shutter are `radiogroup`s. The counter `BALLS 1 204 · IN PLAY 88 · IN THE WELL 12` is announced politely at most every 5 s.

### T4 · Life Tower (5F)
- **Inputs:** paint the 24 × 24 grid by pointer (drag paints, a drag starting on a live cell erases) or with a roving keyboard cursor (arrows move, Space toggles). SYMMETRY: NONE · MIRROR (i ↦ 23 − i) · QUAD (both axes) · OCTA (QUAD ∪ the diagonal swap i ↔ j). Presets: GLIDER · PULSAR · R-PENTOMINO. RUN, CLEAR, COPY THIS PATTERN.
- **States:** PAINT → RUN (grows) → TOWER (orbit / inspect) → PAINT.
- **Constants:** RUN computes 48 generations and grows them at 12 generations/s (4 s). Each layer rises from −0.5 to 0 in 83 ms, expo-out. The camera orbits at 0.15 rad/s at 30° elevation (static under reduced motion; drag to orbit manually). When a pattern dies before 48, the tower stops and the HUD says "EXTINCT AT GEN 31". When it repeats, it says "PERIOD 3".
- **Feedback / sound:** each painted cell clicks with a pitch set by its distance from the centre, so symmetric partners share a pitch (kaleidoscope audio). RUN ticks once per generation (capped at 12/s) with a sodium flash of the newest layer (a colour change, not a luminance strobe).
- **A11y:** the grid is `role="grid"` with a roving cursor and a live region ("row 4, column 7, on; 8 cells painted with octa symmetry"). The symmetry control is a `radiogroup`. The tower canvas is labelled "Tower of 48 generations of your pattern".

### T5 · Gas Tuner (RF roof sign, graft G3)
- **Object:** the roof parapet sign **YONJIGEN**, 8 monoline tube letters authored as SVG polylines on a 24-unit grid (hand-bent tube paths, not font outlines), 96 px tall on desktop, flanked by two vertical tate signs mirrored about the axis: 四次元 left and 四次元 right (the right one is the mirror layout, with identical text and glyph orientation).
- **Inputs:** a five-stop rotary (`radiogroup`, ←/→) picks the gas. Clicking a letter (a `<button>`) strikes it. STRIKE ALL lights the letters left to right on eighth notes.
- **Honest gases:** Neon `#FF4B1F` (red-orange), Helium `#FFB08A` (peach-pink), Argon `#9A7BFF` (pale lavender), Krypton `#E8ECFF` (whitish), Xenon `#7FA8FF` (blue-violet). Caption: "Pure argon glows lavender; the deep blue of most signs is argon with a drop of mercury."
- **Feel:** ignition ramps brightness 0 → 110% → 100% over 380 ms in a single pulse, and the tube warms from its base (a 600 ms `stroke-dashoffset` fill). A strip under the sign records every strike as a coloured tick (the sign's own "every moment").
- **Sound:** a 100 Hz ballast hum at −30 dB while a tube warms (Tokyo mains is 50 Hz, and ballasts hum at twice line frequency), plus a 2 ms tick on strike.
- **Tech:** inline SVG, CSS custom properties and `filter: drop-shadow` with offset glow in the gas colour (an offset + blur, a real emitted halo on night). No WebGL.
- **A11y:** letters have `aria-label="Strike letter Y"`. Everything works with no motion (the colour just changes).

### Service panel (RF, settings, not a toy)
An 8-position red DIP block: SW1 SOUND (off), SW2–3 SCREEN (00 = 16, 01 = 1-BIT, 10 = MILLIONS), SW4 RAIN, SW5 GHOSTS, SW6 FLIP (mirror every CRT), SW7 ATTRACT (autoplay; off under reduced motion), SW8 FREE PLAY (locked on, disabled, "always free"). Each is an `<input type="checkbox" role="switch">` styled as a DIP slide, stored per viewer in `localStorage` (try/catch).

---

## 11. Demo index

### 2F · VIDEO · 4D.OS (sodium field): the index, one floor above the hero and lit in the directory from viewport 1
- **Launcher sign** (8 columns, centred): a backlit ink box with sodium Bungee Shade "4D.OS", the line "Five worlds, one launcher. Every moment of a scene, all at once." and the link **"OPEN THE LAUNCHER"** with an authored SVG play triangle → `/4d-os/`.
- **Row of five cabinets** (each 2 columns = 180 px wide + gutters, on a floor line). Each cabinet is one `<a>`, painted in its world's own colours:
  - **A · Vitrine** (wine #5A1A1C lip) → `/4d-os/a/`: "A red gallery room. A black cat climbs a stairway, and every step it takes stays as points."
  - **B · Plate** (teal #5FE3C8 lip) → `/4d-os/b/`: "A chronophotographic plate under an aurora sky. The cat's whole climb, exposed at once."
  - **C · Leader** (orange #FF8636 lip) → `/4d-os/c/`: "A 16 mm film leader. Scrub the strip and the night scene runs through it."
  - **D · The golden stoop** (phosphor #3AD67C lip) → `/4d-os/d/`: "A peregrine falcon computed from equations, stooping along a golden spiral."
  - **E · Whale fall** (#2FD0E0 with #F0A030) → `/4d-os/e/`: "A whale spirals into a black hole. Two clocks disagree about how long it takes."
- **Cabinet anatomy:** a Bungee Shade marquee with the letter, a 4:3 CRT with the dithered still, a small card with name (M PLUS Rounded 800, 16 px), line (16 / 1.5) and a `SYNTHETIC SCENE` tag, and an OPEN button in the world colour.
  - Hover / focus: the CRT powers up to the clear still (a 260 ms line-expand), the marquee tubes step brighter once, and the 3 px sodium focus ring appears.
- **Ranking board** under the row, like the arcade's high-score screen: an accessible `<table>` in DotGothic16 with columns WORLD / WHAT YOU SEE / ROUTE, repeating the same six links. The first column is just A–E and LAUNCHER, with no invented ranks or scores.

### 6F · LAB · 調整中 UNDER ADJUSTMENT (carpet field)
Three cabinets with dark screens, each with a paper card taped across the glass (rotated −2°, +1.5°, −1°):
- "Lab slot 1: algorithmic art. Untitled. Not ready to play."
- "Lab slot 2: a physics sketch. Untitled."
- "Lab slot 3: a retro-futuristic app. Untitled."

Footnote: "Machines get a marquee when they work. Nothing here has a name yet." No links, no dates, no names. Any toy floor not finished at ship time uses this same card on its own floor.

---

## 12. Sections, top to bottom (the building)

**Floor directory** (fixed, desktop): an ink tate-kanban x 1364–1440, full height.
- **Elevator display** y 0–56: wine field, DotGothic16 20 px sodium "1F" plus an authored SVG up/down arrow.
- **Floor cells** y 56–826: seven cells of 110 px in *building order*, RF at the top and 1F at the bottom. Each has its numeral in Bungee 24 px acrylic, and under it the genre word in Bungee 12 px set vertical upright: RF ROOF · 6F LAB · 5F LIFE · 4F PARLOUR · 3F PRIZE · 2F 4D.OS · 1F RAIN RUN. The current cell inverts to a sodium field with ink letters and a lit lamp dot. Every cell is a link.
- **Sound toggle** y 826–900: an authored speaker-grille SVG, `aria-pressed`, reading OFF by default.

Floors meet at hard edges under an 18 px ink floor slab. Heights (desktop): 1F 100svh + coin door 56vh · 2F ≈ 170vh · 3F ≈ 110vh · 4F ≈ 130vh · 5F ≈ 110vh · 6F ≈ 80vh · RF ≈ 150vh.

1. **1F RAIN RUN (enamel).** The first viewport (§13). Below the fold on the same field is the **coin door**: a lit sodium coin slot reading "FREE PLAY / 無料" and the lead "The crewtives playground: experiments in motion, time and light that run live in your browser. Everything here is a demo; nothing costs anything." It sits beside the full HOW TO PLAY card and a line naming the floors.
2. **2F 4D.OS (sodium).** The floor plate "2F" (a painted numeral, `aria-hidden`), the headline "FIVE WORLDS. EVERY MOMENT AT ONCE." (Bungee 72, 8 columns), and a body paragraph (5 columns): "4D.OS is the studio's live 4D engine: a scene rebuilt in space and time, with all of its moments visible together, drawn on a real-time dithered display. Each cabinet opens one world. All five scenes are synthetic." Then the launcher sign, the cabinet row and the ranking board.
3. **3F PRIZE (candy).** "WIN A WORLD." The crane cabinet is centred (6 columns, 4:5 glass), with the HOW TO PLAY card on the left (3 columns) and the ticket rack on the right (3 columns), and the prize list below.
4. **4F PARLOUR (cobalt).** "EVERY BALL LEAVES ITS PATH." The chrome cabinet is centred (4 columns, 480 × 720 glass area). The left panel (3 columns) holds the shutter, jog wheel and timecode; the right panel (3 columns) holds the handle, LAUNCH, POUR 50, symmetry, rails, REPLAY SEED, CLEAR GLASS and COPY THIS MACHINE.
5. **5F LIFE (mint).** "STACK A WHOLE LIFE." A two-screen puzzle cabinet: the paint grid on the left (5 columns) and the tower on the right (5 columns), with the control deck (symmetry, presets, RUN) under both.
6. **6F LAB (carpet).** A 1-bit carpet pattern (sodium and candy 4 px stars at 8% coverage, canvas-generated, tiled) under three 調整中 cabinets and the footnote.
7. **RF ROOF (night).** A full-bleed roof RetroDisplay (100vw × 72vh). The black-hole moon's caption: "That's not the moon. It's the black hole from world E." (link → `/4d-os/e/`). Then the **YONJIGEN gas sign** (T5) on the parapet, the **service panel** on the machine-room door, and the close: "CONTINUE? 9", counting down once per second while in view (static under reduced motion). At 0 it reads "GAME OVER · THANKS FOR PLAYING" with the button **RIDE BACK TO 1F** (it scrolls down with a ding). Credits in body text: font names + OFL, "Scenes are synthetic and computed from equations", three.js / GSAP / Lenis, and links to crewtives.com and the 4D.OS launcher.

## 13. First viewport, exact

### Desktop 1440 × 900
| element | box (x, y, w × h) | spec |
|---|---|---|
| Field | 0, 0, 1364 × 900 | `--enamel` #FF4B26 edge to edge (the cabinet front) |
| T-molding | x 64–76 and 1288–1300, full height | ink, 6 px rounded ends; symmetric about x = 682 |
| Marquee | 76, 0, 1212 × 126 | sodium backlit panel. Three horizontal tube bands brighten one per beat (±6% luminance, never a flash). **PLAYGROUND** in Bungee Shade, ink, fitted to 880 px (≈ 104 px), baseline y = 92. Beneath it: "CREWTIVES · GAME CENTER YONJIGEN", Bungee 13 px +0.08 em, baseline y = 116. Mirrored vertical DotGothic16 22 px side signs: ゲーム at x 96–120, 四次元 at x 1244–1268 |
| Bezel | 212, 146, 940 × 624 | ink, 24 px outer radius. Top strip text DotGothic16 14 px sodium, centred at y = 166: "LIVE · 16 COLOURS · EVERY MOMENT STAYS ON SCREEN" |
| Left wing art | 224–300, 200–740 | HOW TO PLAY: pixel icons + Bungee 11 silkscreen, "STICK = STEER · A = BOOST · B = GHOST" |
| Right wing art | 1064–1140, 200–740 | "C = TIME VIEW · START = PLAY", the **SCREEN** slide (3 detents, 72 × 24, `radiogroup`) and a `SYNTHETIC SCENE` tag |
| CRT | 312.5, 186, 739 × 554 (4:3) | 18/22 px elliptical corners, inner barrel shade (inset 0 8px 24px #0B0718 at 60%). Rain Run ATTRACT at pixelScale 3 (246 × 185 render px). HUD DotGothic16: "1UP 000000" top-left, "HI ------" top-right, **DEMO** top-centre blinking at 1 Hz, **PRESS START** bottom-centre (22 CRT px tall), "FREE PLAY" bottom-right |
| Control deck | 76, 770, 1212 × 130 | cobalt, `perspective(900px) rotateX(34deg)` from the top edge. Stick at x 470 (a 52 px vermilion ball, 14 px ink shaft, 80 px acrylic gate). A / B / C microswitches, 56 px, sodium / candy / mint, at x 780 / 850 / 920 on an arc (y 812 / 806 / 812). **1P START**, 64 × 40, acrylic, at x 1010–1074. Silkscreen labels Bungee 11 acrylic |
| Floor directory | 1364, 0, 76 × 900 | as §12; the 2F cell's lamp pulses once on load (the secondary action) |

- **Primary action:** START (the button, Enter, or a tap on the CRT). **Secondary:** the 2F 4D.OS cell.
- **Load sequence (≤ 1.4 s):** the marquee tubes strike with 2 flickers 400 ms apart → the CRT power-on line (260 ms) → the dither dissolve (400 ms) → attract mode (the autopilot threads the first gate at t ≈ 1.8 s, and the 72-pose trail is visible by t = 6 s) → the DEMO blink locks to the clock.
- **What must be legible at 1 s:** PLAYGROUND, a live dithered canyon, PRESS START, and seven floor names.

### Phone 390 × 844 (TATE, 縦)
- The field is enamel. The marquee (y 0–84) sets PLAYGROUND in Bungee Shade at min(32 px, 8.2vw), fitted to ≤ 300 px and centred on x = 195, with "GAME CENTER YONJIGEN" in Bungee 10 px under it.
- CRT: 3:4 at x 16–374, y 96–573 (358 × 477), with an 8 px ink bezel.
- Control deck: y 590–844, cobalt.
  - The **elevator button** (44 px round ink, "1F") is centred at x 195, y 612. It opens a popover of seven 48 px round floor buttons, two across, like a real elevator panel.
  - Stick at bottom-left (centre 80, 740), A/B/C at bottom-right (48 px), START centred at (195, 700).
- No floor directory column.

## 14. Motion grammar
- **Clock:** 120 BPM; every lamp, chase, blink, launch cadence and ding locks to it.
- **Arcade press:** 50 ms linear down (translateY 4 px, shadow `0 6px 10px` → `0 1px 2px`), then 140 ms up, `cubic-bezier(0.16, 1, 0.3, 1)`.
- **UI moves like sprites:** the directory's lit cell moves in `steps(3)` over 180 ms, the elevator digit rolls in `steps(6)`, and tickets print in `steps(8)`. Only 3D scenes move continuously. Physics is the motion (taxi springs, claw pendulum, balls, windmills), never tweened.
- **Elevator ride:** GSAP ScrollTrigger scrub on Lenis. Each floor's numeral plate rises from translateY 12vh to 0 as the floor arrives (no fade). When a floor passes 50% of the viewport, the display updates, the lit cell moves and a ding plays (sound on). No pinning.
- **One signature moment:** the TIME VIEW swing (1.2 s, `power3.inOut`). No other camera move on the page is as large.
- **Beyond transform/opacity:** `clip-path` ticket print, dither-mask CRT power-on, `stroke-dashoffset` tube warm-up, an emitted drop-shadow halo only on night.
- **Idle:** off-screen views don't tick, attract loops pause when the tab is hidden, and the Engine stops rAF at rest.

## 15. Sound (WebAudio synthesis only, OFF by default)
Two visible toggles stay in sync: the directory's speaker grille and DIP SW1. The state persists in `localStorage` (try/catch). Master gain −18 dB through a `DynamicsCompressor`, max 24 voices.
- UI microswitch: a 4 ms noise burst through a 3 kHz bandpass + a 12 ms square blip at 2.2 kHz.
- START / credit: square B5 (988 Hz, 60 ms) → E6 (1319 Hz, 220 ms decay).
- Elevator ding: sines 880 + 1109 Hz, 1.4 s exponential decay.
- The per-toy sounds are listed with each toy in §10.

## 16. Responsive
- **≥ 1280:** as specified, 12-column grid and a 5-cabinet row.
- **768–1279:** 8 columns, cabinets one step smaller, a 56 px numerals-only directory, 2F as 3 + 2 centred, 4F side panels stacked under the glass.
- **< 768:** 4 columns, TATE hero, the elevator popover. 2F becomes a scroll-snap aisle (cabinets 78vw) plus the always-complete ranking board. Crane and parlour fill the width with a thumb bar fixed to the *machine's* bottom edge. Hold-Space becomes press-and-hold on LAUNCH. Life stacks the grid over the tower.
- **Headlines:** Bungee clamp(40px, 5vw, 72px). Body 18 / 1.55, ≤ 64 ch. No horizontal page scroll at 390; the aisle scroller is contained.
- **Renderer:** DPR clamp 2 desktop / 1.5 phone, pixelScale 3 / 4, rain 1200 / 400, parlour 320 / 140 balls, rewind 12 / 8 s, capsules 12 / 8, no wet-street mirror on phone.

## 17. Reduced motion and fallbacks
- **`prefers-reduced-motion: reduce`:**
  - No attract autoplay. The hero shows a **pre-exposed still** (G8): Rain Run fast-forwarded headless 20 s along the autopilot, with the 72-pose trail and the ghost drawn in, frozen.
  - The 4F glass fast-forwards 20 s headless (≈ 25 ms CPU) and paints an EVERY MOMENT exposure.
  - No marquee flicker or band chase, no CRT power-on, no numeral rise, no Life orbit, no CONTINUE countdown. TIME VIEW cuts instead of swinging.
  - All toys stay fully playable, since the visitor's input drives their motion.
- **No WebGL2:**
  - CRTs show a CPU-dithered 2D still of their scene (Bayer 8 × 8, 16 colours, rendered once from the same hash and mirror maths).
  - 2F uses the real stills.
  - **4F runs fully in Canvas 2D** (same pure-TS physics module, 60 balls, no rewind).
  - Life runs as a 2D grid with a fanned strip of 12 generations.
  - The crane shows its 調整中 card and the prize list.
  - The gas tuner is unaffected (SVG).
  - Note: "This machine's screen needs WebGL2. Here is a still, and the links all work."
- **No JS:** the HTML already holds every floor, all links, the lab cards and the stills.

## 18. Performance (≤ 350 KB gz JS, ≤ 2 MB first load)
- **JS:** three r186 tree-shaken ≈ 140 KB gz, GSAP + ScrollTrigger ≈ 45, Lenis ≈ 5, shell + Rain Run ≈ 30. **First load ≈ 220 KB gz.** Toy floors are dynamic imports, loaded when the floor comes within one viewport (crane ≈ 10, parlour ≈ 12, life ≈ 6, roof + gas ≈ 6). Total ≈ 255 KB.
- **Transfer:** fonts ≈ 100 KB, 5 stills as 800 × 600 webp ≈ 225 KB (lazy), sign atlas and carpet generated at runtime, no 4D packs. **First load ≈ 0.45 MB; full page ≈ 0.75 MB.**
- **GPU:** one Engine canvas, on-demand rAF, only views on screen tick (≤ 2 at once across a floor boundary). Rain Run ≈ 60 draw calls; TIME VIEW ≈ 360 × 180 = 65k tris. Parlour ≈ 36k tris + ≤ 115k live points (33k phone). Life worst case 27.6k cubes × 12 tris ≈ 330k tris (rare; typical < 3k cubes).
- **Adaptive:** if a view's 30-frame average passes 18 ms, its pixelScale goes 3 → 4, then rain is halved, then the parlour live layer drops to 15 Hz samples.

## 19. Key copy (English)
- `<title>`: `Game Center Yonjigen · crewtives playground`
- Marquee: **PLAYGROUND** · "CREWTIVES · GAME CENTER YONJIGEN"
- Bezel strip: "LIVE · 16 COLOURS · EVERY MOMENT STAYS ON SCREEN"
- CRT: DEMO · PRESS START · FREE PLAY · 1UP · HI ------ · GATE ×4 · CRASH · TIME VIEW · 214 MOMENTS · GHOST: YOUR BEST RUN · GAME OVER
- Coin door: "The crewtives playground: experiments in motion, time and light that run live in your browser. Everything here is a demo; nothing costs anything."
- 1F card: "RAIN RUN. Fly the taxi through the lit gates. Your flight stays on screen; press C, or crash three times, and the whole flight turns sideways, every moment at once."
- 2F: **FIVE WORLDS. EVERY MOMENT AT ONCE.** · "OPEN THE LAUNCHER"
- 3F: **WIN A WORLD.** "Each capsule holds a 4D.OS world or a studio sticker. Two buttons, one try, like the real machines. The claw grips 80% of the time. The only prizes are links, and all of them are listed below."
- 4F: **EVERY BALL LEAVES ITS PATH.** "Turn the handle, pour, and leave the shutter open: every ball's path stays on the glass. Spin the wheel back and they all climb home. Free balls. No bets, no prizes, nothing saved."
- 5F: **STACK A WHOLE LIFE.** "Paint a pattern (symmetry helps), press RUN, and 48 generations of Conway's Game of Life stack into one tower: the pattern's whole life at once."
- 6F: **調整中 · UNDER ADJUSTMENT** · "Machines get a marquee when they work. Nothing here has a name yet."
- RF: "That's not the moon. It's the black hole from world E." · "Pick a gas. Pure argon glows lavender; the deep blue of most signs is argon with a drop of mercury." · "SERVICE: DIP SWITCHES" · "CONTINUE? 9" · "GAME OVER · THANKS FOR PLAYING" · **RIDE BACK TO 1F**
- Glossary line in the credits: "ゲームセンター game center · 四次元 fourth dimension · 調整中 under adjustment · 無料 free"

## 20. Honest risks
1. **Arcade nostalgia could read "retro games" before "cyberpunk".** The orange-haze sign canyon in the hero CRT and the rain roof carry Blade Runner. If the finish review reads "8-bit nostalgia", raise the haze density (0.012 → 0.016) and the rain count, not the chrome.
2. **Scope.** Five toys is a large build. Fixed order: hero + shell → 2F index → 4F parlour (its 2D module is also the fallback) → 5F Life (reuses core) → RF roof + gas → 3F crane. Any floor not done ships as 調整中. That is honest, but a visible gap.
3. **Japanese correctness.** A fixed, glossed vocabulary only, no generated pseudo-kana. It still deserves a native reader.
4. **Gambling connotation** (crane and parlour). There's no currency anywhere, the odds are printed, and the "only prizes are links".
5. **Ball glints under dither.** Balls are ≈ 8 render px. Per-instance palette bias to idx 13–15, or pixelScale 2 on the 4F view.
6. **Multiple RetroDisplays** (one per visible view) cost fill. Views off screen do not render; at most two are visible at once.
7. **Build plumbing.** `vite.config.ts` hardcodes base `/4d-os/`. Landings need `vite.landings.config.ts` (base `/landings/`, outDir `dist/landings`) without touching the 4D.OS build. Stills are referenced by absolute `/4d-os/launcher/…` URLs, and A/B/C must be committed.
8. **Sibling overlap.** Other candidates share cobalt and vermilion. This landing's distinction rests on backlit acrylic, CRT screens, sodium haze and its own faces; the finish review should compare all three side by side.
9. **Trademarks.** Only generic cabinet forms appear; no arcade brand, cabinet model or game name.

## 21. File plan (design only, nothing written to the repo)
```
landings/game-center/index.html                 # semantic building: 7 floors, index links, lab cards, stills, noscript
src/playground/game-center/main.ts              # boot: Engine, display registry, Lenis/ScrollTrigger, lazy floors, feature detect
src/playground/game-center/tokens.css           # page tokens, --pal-16-0..15, --pal-1bit-*, type steps, @font-face
src/playground/game-center/style.css            # fields, cabinets, directory, buttons, DIP, tickets, focus/selection/scrollbar
src/playground/game-center/clock.ts             # 120 BPM master clock
src/playground/game-center/floors.ts            # directory, elevator display, hash deep links, History
src/playground/game-center/displays.ts          # RetroDisplay registry (SCREEN slide + DIP)
src/playground/game-center/scene/{signAtlas,signCanyon,gates,hoverTaxi,rain,roof}.ts
src/playground/game-center/toys/rainRun.ts      # T1: flight, gates, lives, exposures, TIME VIEW, ghost
src/playground/game-center/toys/crane/{solver,rig,tickets,sticker}.ts        # T2
src/playground/game-center/toys/parlour/{layout,physics,record,view,view2d}.ts # T3 (layout+physics pure TS, tested)
src/playground/game-center/toys/lifeTower.ts    # T4: uses lifeStep/seed/generations from core
src/playground/game-center/toys/gasTuner.ts     # T5: SVG tubes + rotary
src/playground/game-center/ui/{arcadeButton,stick,knob,jog,dip,crtPower}.ts
src/playground/game-center/sound/synth.ts       # WebAudio, off by default
src/playground/game-center/fallback.ts          # CPU-dithered stills
src/playground/game-center/game-center.test.ts  # canyon mirror, gate symmetry, rosette symmetry, physics determinism, hash round-trip
src/playground/game-center/fonts/               # bungee, bungee-shade, dotgothic16 (+ JP subset), m-plus-rounded-1c 400/800 woff2 + OFL-*.txt
src/playground/game-center/tubes/yonjigen.svg   # authored monoline tube letters (provenance: hand-authored paths)
vite.landings.config.ts                         # base /landings/, outDir dist/landings
```
It reuses `Engine.ts`, `RetroDisplay.ts` (+ palette), `lifeStack.ts` pure functions, `windowTrail.ts`, `smoothScroll.ts` and `keyboard.ts` unmodified, plus the five `/4d-os/launcher/*.png` stills.

## 22. Memory test
*"It was a Tokyo arcade. A huge red cabinet with a yellow PLAYGROUND marquee, and in the screen a yellow hover taxi was flying through an orange, rainy canyon of signs. I pressed start, crashed, and the whole flight turned sideways like a photo of every moment. Then I rode an elevator up the floors: won the whale world out of a crane game, poured pachinko balls into a little black hole and spun them all back up, grew a Game of Life tower, and lit a neon sign on the roof in different gases."*
