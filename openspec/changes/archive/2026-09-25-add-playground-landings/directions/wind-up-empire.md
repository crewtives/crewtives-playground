# Wind-Up Empire: final direction for the "orbit" candidate landing

Route: `/landings/orbit/` · Visitor-facing name: **Wind-Up Empire** · Direction: **Tin Litho Playset** · Seed key **852db97b**, assigned index **7** (the base designer's own list) · Mode: Experience, code-led. There was no image generation, so the ambition lives in this contract, the first viewport and the signature interaction.

The base is orbit-world (the world-first proposal). It is raised with named grafts from orbit-toy (the toy-first proposal) and with fixes for every weakness found while judging.

---

## Judging

### Seed assignment check
- Both designers rolled seed `852db97b` with assigned index 7. Both built item 7 of their own list, and in both lists item 7 is *lithographed tin space toys and their box art*.
- Both lists keep the literal reading (the OGame screen) to slot 1 only.
- **orbit-world** spans 7 material families. **orbit-toy** spans 5, and three of its seven are screen items, which is at the limit but legal.
- Neither designer reordered its list to game the roll. **Assignment honored by both.**

### Scores (1–10)

| axis | orbit-toy | orbit-world |
|---|---|---|
| 1 Audience identification with the pinned theme | 7 | **8** |
| 2 Product clarity (toys + index) | 7 | **8** |
| 3 Beauty / vividness at page scale | 8 | 8 |
| 4 Fun / satisfaction of the toys | **9** | 8 |
| 5 Signature (every moment at once + low poly + symmetry) | 9 | 9 |
| 6 Feasibility in stack/budget | 6 | **7** |
| 7 Distance from AI-default looks | 7 | **8** |
| 8 Honesty | 8 | **9** |
| **total** | 61 | **65** |

Notes on the scores:
- **Axis 1.** orbit-world has `[g:s:p]` coordinates, a resource strip, a survey log and research that re-prints the renderer. orbit-toy has odometers and a key, but less OGame recall.
- **Axis 2.** orbit-world has a featured B, the launcher and lab cavities, and the line "Nothing here is locked". orbit-toy has two indexes.
- **Axis 4.** orbit-toy has the key rosette, the CLACK, the press slam, and multi-body slingshots.
- **Axis 6.** orbit-toy needs 5 EngineViews, a 4-building 3D conveyor with 4 keys, and a minting press.
- **Axis 7.** orbit-toy's hero is the stock split: headline left, object right.
- **Axis 8.** orbit-toy shows A–C stills but omits the mandatory CC-BY cat credit, and it calls a non-existent `RetroDisplay.setMode`.

### Why orbit-world is the base
- It translates the theme more deeply. The black hole becomes a lithographed spinning tin top ("the Whirl") with golden-spiral arms.
- Its planets are humming tops whose print smears from dots into rings as they spin. That is "every moment at once" made physical (persistence of vision), not painted on.
- Its research changes the real renderer.
- Its hero is mirror-symmetric, which matches the studio's taste for symmetry.
- It is honest by construction: refunds, "Skip the grind", and cat credit.

orbit-toy is more *fun per square inch*, so its best mechanics are grafted in.

### Weaknesses found in the base (all fixed below)
1. **Font collisions.** Dela Gothic One collides with the neon candidate (neon-toy). Anybody and Martian Mono (orbit-toy) collide with bloom-world. **Fix:** a new display face, Tilt Warp. Nothing in this landing is shared with a sibling or with 4D.OS.
2. **Faked extrusion.** Box-lettering extrusion was faked with stacked zero-blur text shadows, the craft-floor "hard offset" costume. **Fix:** Tilt Warp's own XROT/YROT axes give the lettering its box-art tilt. No text shadows.
3. **Lid-lift desyncs the canvas.** The lid-lift used DOM `rotateX`, but the Engine paints axis-aligned rects on one fixed canvas, so the WebGL would desync. **Fix:** the lift is a faster-than-scroll translate plus a scene-camera pitch plus a growing cast shadow. There is no DOM 3D transform over the canvas.
4. **Crowded orrery.** Nine orbits made the tops about 15 px wide. **Fix:** seven orbits, with the labs as 3 sockets on one outer ring (graft), so the tops are 38–56 px wide.
5. **Sluggish flight.** μ = 0.617 gave about 25 px/s. **Fix:** μ = 2.467 (inner period 4 s), about 81 px/s at home, with simulated outcomes below.
6. **Launch rail disconnected from the home planet. Fix:** the rocket launches from the parked home top, and you pull the rocket itself back like a slingshot.
7. **The key toy was not tactile.** The "wind" verb, the page's name, was a DOM `steps()` key. **Fix:** the 3D mainspring key with detents (graft).
8. **The index sat late (section 3).** **Fix:** lifting the lid reveals the tray directly beneath: index second, which also makes the scroll moment literal.
9. **Dashboard side plates. Fix:** they become two mirrored instruments, BUILD (key) and FLEET (gauge), each above a tin slip.
10. **Stale stills note.** It said "A–C have no stills". **Fix:** stills now exist at `public/launcher/{a-vitrine,b-plate,c-leader}.png` (1200×900, captured from live renders), so all five cavities print a still with a provenance line.
11. **No keepsake peak at the close. Fix:** the session proof print (graft).
12. **No arrow glyphs.** None of the fonts contain `→ ↗ ↓` (checked with fontTools). **Fix:** arrows and icons are authored SVG.

### Grafts from orbit-toy (named)
- **G1 · Mainspring Key.** The 3D butterfly key, with 8 detents per turn, the detent spring solver, a 12-turn cap with ratchet slip, and the unwind whirr. It becomes the hero's BUILD instrument.
- **G2 · Key rosette.** Each detent stamps the key into a persistent plate. Winding prints an 8-fold rosette, which is symmetry you make by hand.
- **G3 · Session proof print.** "Every moment of your visit, at once": a 1200×900 composite you can save as a PNG. It is the close.
- **G4 · Golden-spiral rest.** Planets rest in a symmetric pose that "Reset universe" ratchets back to: the five worlds sit at 72° steps on radii growing by √φ. That makes a golden spiral, not the toy's pentagram.
- **G5 · Three lab sockets at 120°** on one dashed outer ring, instead of three extra orbits.
- **G6 · Three line-states.** Solid = built/committed, dashed = queued/planned, dotted = locked/unaffordable (this extends the base's two states).
- **G7 · Odometer drums** with carry overshoot, the CLACK stamp spec and the 4D.OS time-grammar state chip (REWIND/HOLD/FORWARD).
- **G8 · Reduced motion jumps to the result.** Every toy completes instantly and prints the result. A launch prints the whole chain of exposures at once.

---

## 0. Grounding

**Mechanism in one sentence.** The playground's demos are worlds you can reach and open, and the studio's signature (equations turned into subjects, every moment kept on screen, a live dithered display) runs a toy economy that plays out in front of you.

**Audience scene.** People from creative coding and spatial computing, plus people who grew up on 2000s browser strategy games. They land on a laptop between tasks or on a phone from a link. They have about ninety seconds of curiosity, and they remember "one more build" and a ticking resource counter.

**Rut, kept off the list.**
- **The category page:** a near-black space dashboard with a cyan glow, rows of resources and a nebula JPEG.
- **Its opposite:** a white "space startup" hero with a 3D planet and a pill button.
- **The literal OGame screen:** takes one slot only.

## 1. Seven grounded candidates, in resonance order (the base's list, unchanged)
1. **The 2000s browser-strategy screen (the OGame lineage).** Screen / web UI. This is exactly what the audience remembers ticking: resource bar, countdown queue, `[g:s:p]` galaxy table. *(Literal slot.)*
2. **Tabletop 4X space board games.** Cardboard and plastic. Empire building made tactile: hex galaxies, punch-out tokens, plastic fleets.
3. **Mission-control consoles and the Apollo DSKY.** Hardware instruments. VERB/NOUN ritual and electroluminescent timers that mean something.
4. **Engraved celestial atlas plates (Uranometria, Norton's).** Engraved print. A galaxy is a plate you read, and position is notation.
5. **Space-agency identity programs (the 1975 graphics-standards tradition).** Identity system. Grids, vehicle markings and one mark on everything: empires need livery.
6. **Cosmic-era posters and postage stamps.** Poster and philately paper. Flat saturated inks and perforated frames; each stamp frames a world.
7. **Mid-century lithographed tin space toys and their box art.** Printed tin, spring and die-cut card. Wind-up keys, pull-back friction rockets, humming tops and boxes in five flat inks. The empire's verbs already exist as toy mechanisms. **(ASSIGNED, built.)**

An IMPECCABLE'S PICK card, if shown, is #1. Its honest risk: it is the familiar category look, and most runs of this brief land there.

## 2. Challengers (fused, then weighed on audience identification and product clarity)

| # | Challenger | Fused reading | Audience | Clarity | Verdict |
|---|---|---|---|---|---|
| 1 | Alphabet storm | Resource words condense into weather; typing BUILD makes a mine | loses | loses | **declined** |
| 2 | Sewing-pattern envelope | Views A–E index the worlds, a yardage table holds costs, tissue is the galaxy | loses | loses (A–E fits; queue, fleet and research have no carrier) | **declined** |
| 3 | Variable-font specimen | One giant glyph whose axis sliders are the empire's upgrades | loses | loses | **declined** |
| 4 | Oscilloscope bench | Fleets as traces on a graticule, with timebase as game speed | loses | loses (no index carrier) | **declined** |
| 5 | Seedbed lobes | A green lawn with floating capsules: the empire as SaaS | loses | loses | **declined** |
| 6 | Industrial starship terminal | The empire as a crew terminal with typed queries and amber hazard plates | **holds** | loses (typing hides toys and index; sits next to D and the near-black default) | **competitive**, a full alternate |

Each declined challenger donates one discipline to the direction. These are its **raises**:
- **Raise · Alphabet storm → narrated, reversible consequence.** Every toy action writes one deterministic plain-English sentence into the Survey log (`aria-live="polite"`). Every loss is refunded or undoable.
- **Raise · Sewing pattern → commitment is drawn in line.** Solid, dashed and dotted outlines carry state everywhere, so colour is never the only signal.
- **Raise · Variable-font specimen → one axis drives the page.** A single `--wind` (0–1) custom property on `:root` drives:
  - the H1's Tilt Warp `XROT`/`YROT`
  - the Whirl's spin
  - halftone density at the field edges
  - drum-roll speed
  - hum pitch

  There is no per-element tension logic.
- **Raise · Oscilloscope → every trace is measured.** The FLEET gauge reads the live rocket's `r`, `v` and `t` against a printed scale ticked at each orbit radius. The orrery carries a ring scale ticked every 0.25 units on +x. Numbers come from the sim, never decoration.
- **Raise · Seedbed lobes → one ink owns each viewport.** No neutral ground exists anywhere. Tin and paper appear only as objects on drenched fields.

## 3. Direction contract

**THESIS:** a space empire you wind by hand. The playground is a lithographed tin space-toy playset:
- a mainspring key runs the build queue
- pull-back rockets are the fleet
- humming-top planets are the five real 4D.OS worlds, orbiting a spinning tin black hole

It refuses the near-black sci-fi dashboard with one neon accent and a table of resources.

**OWN-WORLD:** flat litho inks at page scale:
- cobalt `#1B2CC4` printed space
- vermilion `#CC2216` box side
- chrome yellow `#FFC81A`
- turquoise `#17B7A0` die-cut tray
- tin `#C7CCD4` plates
- celluloid pink `#FF6FAE`
- ink `#15131C`

Everything sits on this ground: pressed-tin plates with rivets and crimped edges, die-cut card cavities, Tilt Warp box lettering that tilts as the spring winds, Rampart One embossed nameplates, Sono odometer drums, and a 16-ink Bayer litho screen shared by WebGL and CSS.

**STORY:** the visitor finds a toy empire already running, with a demo rocket whipping past the Whirl and stamping copies of itself. They wind the key and a build clacks, they pull a rocket back and slingshot it, they flick a planet and it hums. Then they lift the lid onto a tray of five real worlds, open one, and at the bottom take home a print of every moment of their visit.

**FIRST VIEWPORT:**
- A cobalt box lid framed by a chrome-and-vermilion litho border, under a pressed-tin resource strip.
- The chrome H1 "WIND-UP EMPIRE" is centred at the top.
- A dithered 16-ink orrery is centred at (720, 540): the Whirl plus five world tops on a golden spiral, the home top parked at bottom-centre on its launch cradle, and a demo rocket's stamped exposures.
- Mirror-symmetric instruments sit left and right: BUILD (the key with its rosette) and FLEET (the gauge), each over a tin slip.
- The chrome lip band along the bottom reads "DEMO MODEL · FAKE ECONOMY · RESETS ON RELOAD" and carries "Five real worlds inside · Open the box".

**FORM:** mid-century lithographed tin space toy with box and die-cut tray, candidate 7 of 7, seed key `852db97b`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

**Signature interaction:** the pull-back rocket. You grab it on the home top and drag it back like a slingshot. It ratchets through 12 detents, and a dashed ghost path previews 3 s of flight. On release it flies a real Verlet orbit around the Whirl. Every 1/12 s of flight stays stamped along the path, ageing from full ink to 1-bit stipple.

## 4. Physical scene → light, printed, saturated

*Someone lifts the lid of a lithographed tin toy box on a sunlit table, looking at it on a laptop in a bright room.*

Space is cobalt ink on tin, never a black screen. The darkest field on the page is night cobalt `#0A0F4A`, used only for the proof-print close (the underside of the lid).

## 5. Colour strategy: Full palette, drenched per face of the box

The page is the box unfolded. Each section is one face, drenched in one ink:

| face | field |
|---|---|
| Lid | cobalt |
| Inner tray | turquoise |
| Box side (Command deck) | vermilion |
| Instruction leaflet | chrome yellow |
| Underside of the lid (the proof) | night cobalt |

Accents inside a section come from at most two other inks. The 4D.OS time grammar is kept:

| state | colour | chip |
|---|---|---|
| Winding (storing time) | orange | "WINDING · REWIND" |
| Holding | tin-hi | "HOLD" |
| Running a build | turquoise | "RUNNING · FORWARD" |

### Page tokens (exact)

| token | hex | role / measured contrast |
|---|---|---|
| `--ink` | `#15131C` | text on light fields, outlines, the Whirl horizon |
| `--space` | `#1B2CC4` | lid field and orrery ground. White on it 9.53:1; tin-hi 8.35:1; chrome 6.14:1; sky-tint 5.62:1 |
| `--space-deep` | `#0A0F4A` | Bayer edge shading on cobalt, proof section field. Tin-hi 15.59:1; chrome 11.46:1 |
| `--space-bright` | `#4F7DFF` | star mid-tone, lit facets of the sky |
| `--sky-tint` | `#A9C8FF` | secondary text on cobalt (5.62:1), star highlights |
| `--vermilion` | `#CC2216` | Command-deck field, primary stroke on tin. White on it 5.51:1; lemon 4.79:1; chrome 3.55:1 (large text only, ≥ 24 px) |
| `--oxblood` | `#8E1A12` | pressed state on vermilion, Whirl band shadow |
| `--chrome` | `#FFC81A` | H1, lip band, leaflet field, primary buttons. Ink on it 11.85:1 |
| `--lemon` | `#FFF27A` | spark highlights, star twinkle peak, focus fill on vermilion. Ink on it 15.97:1 |
| `--orange` | `#FF7A1A` | WINDING state, active timers, accretion hot side. Ink on it 7.05:1 |
| `--turquoise` | `#17B7A0` | tray field, RUNNING state. Ink on it 7.28:1 |
| `--teal-deep` | `#0B5F58` | cavity depth, orbit wire on turquoise. White on it 7.52:1 |
| `--pink` | `#FF6FAE` | celluloid windows, DEMO sticker, caret, the newest exposure. Ink on it 7.13:1 |
| `--tin` | `#C7CCD4` | plates, buttons, drum surrounds, the strip. Ink on it 11.40:1 |
| `--tin-text` | `#3A3F4C` | secondary text on tin (6.52:1; replaces the base's 2.82:1 tin-shade) |
| `--tin-shade` | `#6F7686` | emboss lower edge, dashed and dotted state lines only (never text) |
| `--tin-hi` | `#EEF0F3` | emboss highlight, body text on cobalt |
| `--paper` | `#FBFAF6` | the leaflet sheet (cool white, not cream). Ink on it 17.61:1 |

### Browser surfaces
- `::selection`: chrome background, ink text.
- Caret: pink.
- Scrollbar: cobalt thumb on a tin track with a 2 px ink border.
- Focus ring: `outline: 3px solid var(--chrome); outline-offset: 2px; box-shadow: 0 0 0 5px var(--ink)`. On chrome fields it becomes an ink outline plus a 5 px pink ring.
- Links: `text-decoration: underline dashed 2px`, offset 4 px. Vermilion on light fields, chrome on cobalt and vermilion.
- `font-variant-numeric: tabular-nums` on every number.

### RetroDisplay 16-ink palette (`--pal-16-0..15`, on `:root`)

```
#15131C #0A0F4A #1B2CC4 #4F7DFF #A9C8FF #CC2216 #8E1A12 #FF7A1A
#FFC81A #FFF27A #17B7A0 #0B5F58 #FF6FAE #C7CCD4 #6F7686 #FBFAF6
```

- The lid renders through `RetroDisplay` in mode `'16'`, `pixelScale 2`. Bayer 8×8 is the lithographer's screen.
- The same matrix, baked at boot into a 64 px CSS tile (`bayerTile.ts`, one data-URI per ink), makes the halftone shading at every drenched field's edge. Its threshold is `0.18 + 0.22·--wind`, so the edges darken as the spring winds.
- Tray tops each get their own `RetroDisplay` whose `tokenRoot` is the cavity element carrying that world's `--pal-16-*`. These are copied at build time from `src/flavors/<a..e>/tokens.css`, so each world's planet is printed in the world's real inks.

## 6. Type: all SIL OFL 1.1, self-hosted woff2, verified 2026-09-25

| family | role | source (npm view → 5.3.0, OFL-1.1) | file · size |
|---|---|---|---|
| **Tilt Warp** (variable: `XROT` −45…45, `YROT` −45…45) | Box lettering: H1, section heads, wordmark. Heavy, bouncy and warped like tin-box lettering. `--wind` drives `font-variation-settings: "XROT" calc(-10*var(--wind)), "YROT" calc(-28*var(--wind))`, so the title tilts back like lettering on a curving lid as you wind, and eases back on release. | `@fontsource-variable/tilt-warp` | `files/tilt-warp-latin-full-normal.woff2` · 68.5 KB |
| **Rampart One** 400 | Embossed tin nameplates: planet names, world letters A–E, coordinates on nameplates, the key tag. Its inline outline reads as stamped sheet metal. | `@fontsource/rampart-one` | `files/rampart-one-latin-400-normal.woff2` · 39.3 KB |
| **Zen Maru Gothic** 500 / 700 | Leaflet voice: body, buttons, labels, the log. Rounded and friendly, a nod to the Japanese makers of these toys. | `@fontsource/zen-maru-gothic` | `files/zen-maru-gothic-latin-500-normal.woff2` 11.6 KB, `…-700-normal.woff2` 11.6 KB |
| **Sono** (variable `wght` 200–800, monospace at the file default `MONO` 1) | Numbers and measurement only: drums, timers, `[1:1:4]`, `r`/`v`/`t`, costs. | `@fontsource-variable/sono` | `files/sono-latin-wght-normal.woff2` · 31.6 KB |

- **Total:** about 163 KB. Tilt Warp and Zen Maru 500 are preloaded; the others use `font-display: swap`.
- **Conflict check:**
  - none of these faces is on the default-face list
  - none is used by 4D.OS A–E
  - none is used by the sibling candidates (bloom: Anybody, Martian Mono, Brygada 1918, Recursive, Bagel Fat One; neon: Dela Gothic One, M PLUS 2, DotGothic16, Bungee, M PLUS Rounded 1c)
- **Glyph check (fontTools on the latin subsets):** `· [ ] : × − – — % + /` are all present. `→ ↗ ↓` are missing in all four, so arrows and icons are an authored SVG set: 2 px stroke, round caps, 20 px box. The set is arrow-down, arrow-up-right, bell, bell-slash, reset lever, rocket, key and spark.
- **Scale (1440):**

  | role | face and size |
  |---|---|
  | H1 | Tilt Warp 88 px (5.5rem) / 0.9, tracking 0 |
  | Section heads | Tilt Warp `clamp(40px, 4.2vw, 60px)` |
  | Nameplates | Rampart One 16–28 px |
  | Body | Zen Maru 500, 18/1.5 (16/1.5 on phones), max 62ch |
  | Buttons | Zen Maru 700, 15 px, +0.04em caps |
  | Drums | Sono 700, 22 px |
  | Readouts | Sono 500, 13–15 px |

  No kicker or eyebrow sits above any heading.

## 7. The procedural low-poly world (every mesh from code)

- **Pipeline:** one `Engine`, one fixed canvas. Everything is flat-shaded: non-indexed `BufferGeometry` with per-face normals and `MeshLambertMaterial` with vertex colours, except the three custom shaders named below.
- **Light:** one "window" directional light from the top left (azimuth 135°, elevation 50°) plus ambient 0.35.
- **Lid view:** perspective, FOV 28°, camera elevation 44.4° above the ecliptic. The camera distance is solved at resize so the outer lab ring projects to a 800×560 px ellipse (±2 %) centred at (720, 540). The scale is **94.4 px per unit**.
- **Camera drift:** 0.02 rad/s azimuth, only when motion is allowed.

**The Whirl (black hole).**
- **Body:** a low tin top (`LatheGeometry`, 24 segments) with the profile `(0,0.10) (0.80,0.04) (0.84,0) (0.80,−0.05) (0.10,−0.16) (0,−0.30)`.
- **Spiral print** (fragment shader, polar coordinates): a golden logarithmic spiral `r = a·e^{bθ}` with `b = ln φ/(π/2) ≈ 0.3063`, `a = 0.45`. The bands are `band = floor(n·(θ − ln(r/a)/b)/2π) mod 2`, alternating vermilion and chrome, where `n` is the Symmetry setting: 3, 5 (default) or 8.
- **Horizon:** an ink disc of r 0.45 on top.
- **Accretion ring:** a low-poly torus (24×6, R 0.72, r 0.09), orange on the approaching side and lemon on the far side via `cos(φ − φ_cam)`.
- **Spin:** `ω = 0.6 + 2.4·--wind` rad/s, plus a +1.5 rad/s pulse that decays over 1.2 s when a rocket is swallowed.
- **Lensing nod to world E:** stars within 1.6 units are displaced in screen space by `r' = r + θ_E²/r` with `θ_E = 0.55`.

**Stars.**
- Instanced five-point litho stars: 240 on desktop, 90 on phones. Each is a 10-vertex fan alternating radius R and R/φ² (0.382).
- They sit on a Fibonacci sphere shell at radius 14 (golden angle 2.39996 rad), so the sky is quasi-uniform.
- Twinkle is a palette step chrome→lemon→chrome every 2.4–6 s per star. That is a colour step, not a flash, and far below 3 Hz.

**Planets = tin humming tops.**
- **Geometry:** `LatheGeometry`, 12 segments (8 on phones), from a 9-point profile: spindle `(0.05,0.62)→(0.05,0.40)`, then a superellipse shoulder `r(y) = R·(1−|y/H|^p)^{1/p}` with p = 2.6 sampled at 5 points, then a cone to the tip `(0,−0.52)`. It is scaled per planet (the table gives the top radius in units).
- **Print** (fragment shader, in azimuth φ and arc-length s):
  - **phyllotaxis dots:** dot k at `φ_k = k·137.508°`, `s_k = 0.045·√k`, 34 dots, in the world's own inks;
  - **n-fold bands:** `cos(n·φ) > 0.6` around the shoulder, where n is the Symmetry setting;
  - **shutter averaging:** M = 8 samples across `Δφ = ω·(1/60)·1.5`. Slow spin shows dots; fast spin smears into rings, so the top shows all its orientations at once.
- **Spin physics:** `dω/dt = −0.08ω − 0.6`.
  - Tilt drift: `dα/dt = 52/ω` °/s.
  - Precession: `Ω_p = 9/ω` rad/s.
  - Below ω = 6 the top topples: `α(t) = 78° − 18°·e^{−5t}·|cos 11t|`, two visible bounces, and a clank.
  - At load every world top spins at ω = 36, and they topple after about 14.6 s. That is intentional: it invites the first flick.

**Orbits.** Seven circular orbits on the ecliptic, `r_n = φ^{(n−1)/2}`. Kepler speed: `ω_n = √(μ/r_n³)`, μ = **2.467** (inner period 4.0 s).

| n | r (u) | body | coordinate | top radius (u) |
|---|---|---|---|---|
| 1 | 1.000 | E · Whale fall (nearest the Whirl: its whale falls in) | `[1:1:1]` | 0.20 |
| 2 | 1.272 | D · The golden stoop | `[1:1:2]` | 0.22 |
| 3 | 1.618 | A · Vitrine | `[1:1:3]` | 0.24 |
| 4 | 2.058 | B · Plate (featured) | `[1:1:4]` | 0.30 |
| 5 | 2.618 | C · Leader | `[1:1:5]` | 0.26 |
| 6 | 3.330 | Home tin (yours, **parked** at θ = 270°, the front-centre of the view; it spins in place and is the launch pad) | `[1:1:6]` | 0.30 |
| 7 | 4.236 | Lab ring: 3 bare-tin sockets at 90°, 210° and 330° (120° apart, leaving the front-centre clear for the launch), parked and not spinning | `[1:1:7]` | 0.18 |

- **Rings:** charted rings are solid 2 px chrome; uncharted rings are dashed chrome. The lab ring is dotted tin-shade.
- **Ring scale:** ticks every 0.25 u along +x (oscilloscope raise).
- **Golden-spiral rest (G4):** at load and after "Reset universe", the world planets sit at `θ_k = 90° + 72°·k` (k = 0..4, E to C). With radii growing by √φ at 72° steps, the five worlds lie on a golden logarithmic spiral. The reset animates them back through a 3-click ratchet of 400 ms each.

**Rockets = tin rockets.**
- **Body:** a tangent-ogive nose `ρ = (R²+L²)/2R`, `r(x) = √(ρ² − (L−x)²) + R − ρ`, R 0.07, L 0.22, on a cylinder body of 0.30. All at 8 radial segments.
- **Fins:** 4 extruded triangles at 90° (4-fold).
- **Windows:** 2 pink celluloid discs.
- **Livery:** vermilion body, chrome fins, tin nose.
- **Poly count:** about 110 triangles.

**Mainspring key (G1).**
- **Lobes:** two butterfly lobes from a 12-segment cardioid profile `r(t) = a(1 − cos t)`, extruded 0.06, plus a hex shaft.
- **Chrome:** faked with a tin/tin-hi facet pair and one chrome specular facet.
- **Coil:** a helix tube behind the key (6 sides, `x = R cos t, y = R sin t, z = p·t/2π`). Its pitch is `p = p_max − (p_max − p_min)·--wind`, so the coil tightens as you wind.
- **View:** its own `EngineView` (200×200 CSS px), orthographic camera, same `RetroDisplay`.

**Exposure shader (every moment at once).**
- Instances carry birth time.
- Age `a = 1 − (now − birth)/memory`.
- The fragment does `discard if bayer8(gl_FragCoord.xy) > pow(a, 0.7)`. Age reads as print density, not alpha, and there is no blending.
- The newest exposure is lit pink.

**Sparks.** Friction sparks are `Points` (≤ 120) in a 40° cone with ballistic motion and drag, 0.35 s life, lemon → orange → gone. They are always local, never full-field.

## 8. "Every moment at once" and the live dithered display

1. **Flights:** a stamped exposure every 1/12 s. The exposure ring buffer holds 600 on desktop and 240 on phones. Memory is 12, 48 (default) or 200 moments, set by the press. A CPU log of every exposure since load (up to 5,000) feeds the proof print.
2. **Orbits drawn by their past:** each planet drops 24 exposures per revolution (memory = one period), so every ring is the planet's own recent past.
3. **Humming tops:** shutter averaging prints all orientations as rings.
4. **Key rosette (G2):** each detent passed while winding stamps the key into a persistent render target at its current angle, in orange via the Bayer threshold at 0.4. One turn makes an 8-fold rosette, and further turns overprint it thicker. It clears on "Reset universe".
5. **Ticket spike:** each finished build leaves a stamped ticket on a spike beside the Construction plate. The newest is on top; 6 are visible, then the stack compresses with a count ("+4 below").
6. **The proof (G3):** the close composes everything into one print.
7. **Live display, three inks:** the Litho Press switches the real `RetroDisplay.mode` between `'1bit'` (One-ink press), `'16'` (16-ink litho) and `'millions'` (Full process), using the `reveal` dissolve.
8. **Shared screen:** CSS edge shading uses the same Bayer 8×8 as the canvas, so page and canvas share one screen.

## 9. Symmetry

- **Mirror:** the lid is mirror-symmetric about x = 720:
  - the H1, subline, orrery, home top and rail are on the axis
  - BUILD (key + ticket) on the left mirrors FLEET (gauge + log) on the right
  - the lip band is centred
- **The tray** mirrors about its centre column: A | **B** | C, then D | launcher | E, then lab | lab | lab.
- **Rotational:**
  - Whirl arms: 3/5/8
  - three lab sockets at 120°
  - rocket fins: 4-fold
  - five-point stars with golden inner radius
  - key detents: 8 per turn, printing an 8-fold rosette
- **Phyllotaxis:** top prints (137.508°), the Fibonacci starfield, and the golden-spiral rest pose of the five worlds.
- **Scale:** orbit radii step by √φ.

## 10. Toys (five, each with one clear affordance)

### T1 · Pull-back Fleet (signature)
- **Affordance:** the rocket stands in a tin cradle on the home top at bottom centre, with a tin plate beneath printed "PULL BACK TO LAUNCH".
- **Input:**
  - `pointerdown` inside a 132×132 hit area centred on the rocket's projected position (1440: (720, 748)) captures the pointer. The hit area has `touch-action: none`; the rest of the canvas keeps `pan-y`.
  - Pull vector `P = pointer − rocket`.
  - Distance `d = clamp(|P|/132, 0, 1)`, quantized to 12 detents (`d = k/12`).
  - Aim `α` = the angle of `−P` from "toward the Whirl" (screen up), clamped to ±60°. Positive α leans prograde (+x).
- **Pull feedback:**
  - The rocket slides back along −aim by `0.35·d` units and the cradle rotates to α.
  - Each detent adds a 1 px cradle shake and a tick.
  - The spark count grows as `8 + 40·d` per second.
  - At `d = 1` the rocket rattles ±0.6 px at 18 Hz.
- **Ghost path:** while held, 3.0 s of flight is integrated on every change (720 steps; measured under 0.1 ms) and drawn as 36 dashed tin-shade exposures. It is dashed because it is only planned.
- **Launch state:** home at `p0 = (0, +3.33)`, where +z is toward the viewer. `v0 = v_circ·x̂ + Δv·â`, with `v_circ = √(μ/3.33) = 0.861` u/s (≈ 81 px/s), `Δv = 1.2·d`, and `â` = inward (−ẑ) rotated by α toward +x.
- **Release:** at `d ≥ 1/12`, a 60 ms hitch (a 0.05 u snap forward), then flight. At `d = 0` it cancels silently. Escape also cancels.
- **Integrator** (`flight.ts`, pure and tested):
  - velocity Verlet, `dt = 1/240` s, 4 substeps per 60 fps frame, real-time clock;
  - `a = −μ·r/(|r|² + ε²)^{3/2}`, ε = 0.05;
  - planets are capture targets only (no planet gravity), so outcomes are deterministic from `(d, α, launch time)`.
- **Outcomes:**
  - **Survey (fly-by):** `|p − planet_i(t)| < topRadius_i + 0.06`. The planet is charted: its ring goes solid and it gets a "CHARTED" tab in the tray. It spins up by +40 rad/s. The first survey of a planet gives +25 SPARK; later ones give +5. **The rocket keeps flying**, so one flight can chain surveys. Log: "Rocket 3 surveyed Plate [1:1:4] and Leader [1:1:5] in one flight. +30 spark."
  - **Swallowed:** `r < 0.45`. The rocket stretches radially (×1 → ×5 over 400 ms) and turns pink, and its last 6 exposures stretch with it. The Whirl gets its spin pulse. Log: "Lost to the Whirl. Rocket refunded: this is a demo."
  - **Escape:** `r > 5.2`. Log: "Left the system. Rocket refunded."
  - **Timeout** (20 s): the rocket fades home. Log: "Rocket 5 came home after 20 s. It never found a planet."
- **Simulated outcomes at d = 1 (these become the test fixtures):**

  | α | outcome |
  |---|---|
  | −60° | swallowed at t ≈ 2.56 s |
  | −20° | grazing slingshot (periapsis 0.46), escapes at 6.2 s |
  | 0° | escapes at 5.75 s after a periapsis of 1.39 |

  At `d = 0.25, α = 0` the rocket stays bound and times out. Each outcome is reachable within ±60°.
- **Slots:** rockets in flight ≤ Launch gantry level (1→4). When all are out, the cradle plate turns dashed and says "All rockets out (1/1)".
- **Attract flight:** at load (motion allowed) "Rocket 0 · demo flight" launches at t = 0.8 s with `d = 1, α = −20°`. It prints the whip past the Whirl in the first viewport and is logged as a demo flight.
- **FLEET gauge (right instrument, 200×200 EngineView or SVG):**
  - A round tin gauge with a printed arc scale 0–5 u, ticked at each orbit radius and labelled E D A B C ⌂ (the ⌂ is an SVG house glyph).
  - A needle shows the latest rocket's `r` with a spring (k 300, c 24).
  - Sono readouts below: `r 0.46 · v 3.12 · t 00:02.2`.
  - It rests at home (3.33) when idle.
- **Sound:** a detent tick; a flywheel whine (sine 300 → 900 Hz with d); a launch FM zip; a swallow glide.
- **A11y:**
  - The hit area is a `<button>` "Rocket on the launch cradle. Hold Space to pull back, Left and Right to aim, release Space to launch."
  - Holding Space adds one detent per 90 ms; Left/Right steps aim by 5°; Space keyup launches; Escape cancels.
  - A visible control row under the tin plate: `<input type=range>` "Aim" (−60…60, step 5, valuetext "20 degrees toward prograde"), `<input type=range>` "Pull-back" (0…12), and a "Launch" button.
  - Every outcome goes to the log.

### T2 · Humming-top Planets (spin, survey, open)
- **Affordance:** each world top carries a DOM nameplate that follows its projected position: Rampart One 16 px letter and name plus a Sono `[1:1:n]`. The nameplate is also a 64 px circular hit target on the top.
- **Input:**
  - **Flick:** drag ≥ 8 px and release. `ω₀ = clamp(|v|·0.08, 12, 80)` rad/s, where `v` is the pointer speed over its last 80 ms in px/s.
  - **Tap:** +25 rad/s.
  - **Enter/Space** on the focused nameplate: +40 rad/s.
- **Hover or focus** expands the nameplate into a tin tag with two actions:
  - "Spin"
  - "Open Vitrine ↗", a real link to `/4d-os/a/` in the same tab, **always enabled**; charting is cosmetic.
- **Feel:**
  - the print goes from dots to rings with ω;
  - the hum follows ω: sine plus 2nd harmonic at `f = 90 + 2.2ω` Hz, −24 dB;
  - precession wobble;
  - the topple has two bounces and a clank.
- **A11y:**
  - The nameplates are real `<button>`s in DOM order E D A B C Home, and arrow keys move between them.
  - The canvas `aria-label` is "Tin orrery: five 4D.OS worlds as spinning tops around a black hole called the Whirl", with a live summary of charted and spinning counts.

### T3 · Mainspring Key (build queue with timers), G1 + G2
- **Affordance:** a 3D butterfly key at the left instrument. A chrome tag hangs off it: "WIND ME" in Rampart One 18 px, and below it "drag round · or hold Space" in Zen Maru 13 px.
- **Input:**
  - A circular drag around the shaft centre, with a 200×200 hit area.
  - Clockwise angle delta accumulates; counter-clockwise gives ratchet clicks and no movement.
  - A detent every 45° (8 per turn), with a maximum of **12 turns** (96 detents).
  - Past the cap the ratchet slips: a ±4° wobble decaying over 300 ms, and the line "The spring's full. Twelve turns is all a tin toy takes."
- **Detent spring:** `θ'' = −420(θ − θ_d) − 18θ'`. That gives ζ ≈ 0.44 and about 9.7° of overshoot, a crisp snap. The chip reads "WINDING · REWIND" in orange.
- **Spring economy:** 1 turn = 3 spring-seconds.
  - **On release:** if a build is queued, the key unwinds counter-clockwise at 120°/s (1 turn per 3 s) with a whirr. The chip reads "RUNNING · FORWARD" in turquoise, and the active job advances 1 s per spring-second.
  - **Pointer down while running:** pauses ("HOLD", tin-hi).
  - **Queue empty:** the spring holds, with the line "Spring held. Queue a build to use it."
- **CLACK on completion:**
  - the ticket plate scales 1.06 → 1 in 90 ms `cubic-bezier(0.2,0.9,0.1,1)` and jolts 1 px;
  - an "LV 3" stamp lands at −4°;
  - the ticket slides onto the spike;
  - the drums roll.
- **`--wind`** is `stored/96`, followed by a critically damped spring (ζ = 1, 180 ms).
- **Rosette:** described in §8.4.
- **Build ticket (tin slip under the key, 248×176):**
  - "BUILD QUEUE"
  - the active job, e.g. "Tin mine → Lv 2 · 30 tin · 6 s", on a coil progress bar (a helix drawn in SVG that tightens)
  - "2 turns needed · 0 wound"
  - two tin buttons: "+1 turn" and "Let go"
- **Second key:** a flat SVG key on the Construction plate in the deck shares the same spring bank, so winding works after the hero scrolls away.
- **A11y:**
  - The key is `role="slider"`, `aria-valuemin 0`, `aria-valuemax 96`, valuetext "3 turns and 5 eighths wound".
  - Right/Up adds 1 detent; PageUp adds 8; holding Space winds at 1 detent per 80 ms; Enter or Escape lets go.

### T4 · Litho Press (research that re-prints the real renderer)
- **Location:** the press plate in the Command deck. Three rows, each a chunky 3-position tin slide switch (a `radiogroup`):
  - **Inks:** One-ink press / 16-ink litho / Full process → `display.mode = '1bit' | '16' | 'millions'`
  - **Exposure memory:** 12 / 48 / 200 moments
  - **Symmetry:** 3-fold / 5-fold / 8-fold → Whirl arms and top bands
- **Gating:** Observatory Lv 1, 2 and 3 unlock research of each row in turn, for 20 / 40 / 60 SPARK over 10 / 15 / 20 s. A research dial turns while it runs.
- **States (G6):**
  - locked: dotted outline, "Needs Observatory Lv 2"
  - researching: dashed outline plus dial
  - available: solid
- **Commit:** a 600 ms tween of `display.reveal` 0 → 1 (Bayer threshold wipe), the press plate flexes 2 px (translateY 0 → 2 → 0 over 160 ms), and a press thunk sounds.
- **"Skip the grind: unlock everything"** (in the deck and the leaflet) sets every building to Lv 3 and every row as researched. Nothing aesthetic is gated from anyone.

### T5 · Spark Wheel (the tactile resource verb)
- **Location:** in the strip, a 64×36 tin friction wheel behind a pink celluloid window, drawn on a 2D canvas.
- **Input:** rub by scrubbing the pointer back and forth. Each direction reversal after ≥ 12 px of travel gives +0.5 SPARK, capped at 6 per second so it stays a fidget, not a farm.
- **Feel:** each stroke throws a burst of up to 24 sparks out of the window, the wheel spins with inertia (friction 0.92/frame), and a crackle plays (8–20 noise grains of 2 ms over 120 ms).
- **A11y and reduced motion:** a `<button>` "Rub the spark wheel", where each press is one stroke. Under reduced motion there are no particles; the window glows lemon for 200 ms.

### The demo economy (plain words and exact numbers; `economy.ts` is a pure 10 Hz state machine, unit-tested)
- **Resources:** TIN, SPRING (turns wound, 0–12) and SPARK.
- **Start state:** 60 TIN, 0 SPARK. Tin mine Lv 1 is running. The queue already holds "Tin mine → Lv 2", so the first wind visibly builds something.
- **Buildings:**

  | building | effect | cost for level n ≥ 2 | spring-time |
  |---|---|---|---|
  | Tin mine | TIN/s = `1.2·1.35^(L−1)` | `30·1.6^(n−2)` TIN (30, 48, 77, 123…) | `min(45, 6·1.4^(n−2))` s (6, 8.4, 11.8, 16.5…) |
  | Launch gantry | rockets in flight 1 → 4 | 40 / 64 / 102 TIN | 8 / 11 / 15 s |
  | Observatory | unlocks the press rows | 50 / 80 / 128 TIN | 10 / 14 / 20 s |

- **Queue:** holds 3. Disabled buttons say why: "Needs 12 more tin".
- **Persistence:** nothing persists across reloads. A hidden tab catches up from `performance.now()` deltas, capped at 5 minutes of production.
- **"Reset universe":** 60 TIN, all buildings back to Lv 1, the rosette and tickets cleared, and the planets ratcheted back to the golden-spiral rest. Log: "Universe reset. Back to 60 tin."

## 11. Demo index: the inner tray (turquoise, the face you see when the lid lifts)

Cavities are die-cut into the card. Each is an inset with real depth: `inset 0 6px 14px rgba(11,95,88,.55)` plus a 1 px teal-deep rim. The layout is a mirror-symmetric 12-column grid with 24 px gutters.

Each world cavity holds:
- the **still**, as a dithered print in a die-cut window (`image-rendering: pixelated`, `loading="lazy"`);
- a **live tin top** (64 px round socket, bottom-right) printed in that world's own `--pal-16`, spinning while the cavity is hovered or focused;
- a **Rampart One nameplate** (letter 44 px, name 24 px);
- the **Sono coordinate**;
- **one honest line**;
- a **provenance line** (Zen Maru 13 px);
- the link.

| cavity (cols) | coordinate | URL | still | line |
|---|---|---|---|---|
| **A · Vitrine** (3) | `[1:1:3]` | `/4d-os/a/` | `/4d-os/launcher/a-vitrine.png` | "The scene as an exhibit: a red gallery room, a black cat climbing stairs, every moment kept as points." |
| **B · Plate** (6, featured) | `[1:1:4]` | `/4d-os/b/` | `/4d-os/launcher/b-plate.png` | "The whole climb exposed onto one photographic plate, after Marey, under an aurora sky." |
| **C · Leader** (3) | `[1:1:5]` | `/4d-os/c/` | `/4d-os/launcher/c-leader.png` | "Time as a strip of 16mm film you pull through the gate." |
| **D · The golden stoop** (4) | `[1:1:2]` | `/4d-os/d/` | `/4d-os/launcher/d-golden-stoop.png` | "A peregrine falcon computed on a golden spiral, drawn on a phosphor vector terminal." |
| **4D.OS launcher** (4, centre) | the whole set | `/4d-os/` | the five tops in a row (live) | "All five worlds from one desktop." |
| **E · Whale fall** (4) | `[1:1:1]` | `/4d-os/e/` | `/4d-os/launcher/e-whale-fall.png` | "A whale spirals into a black hole, lensed, with two clocks that disagree." |
| **Lab socket** ×3 (4 each, shallow, dotted die-cut) | `[1:1:7]` | none (`aria-disabled`, not a link) | bare unprinted tin top, not spinning | "Empty socket · in the lab. The next experiment isn't cast yet." |

- **Provenance line:**
  - A–C: "Still captured from the live render. Synthetic scene, computed in your browser. “Cat” by J-Toastie, CC-BY 3.0."
  - D and E: "Still captured from the live render. Synthetic scene, computed from equations."
- **Tray lede:** "Nothing here is locked. Every world opens now; the game only decides which planets spin." A charted planet's cavity gets a stamped "CHARTED" tin tab; the link never changes.
- **Hover:** the cavity's contents lift 4 px, and the depth shadow deepens to `0 10px 20px`. **Focus:** the double ring.
- **Links:** "Open world" plus the SVG arrow-up-right, same tab.

## 12. Sections, top to bottom

0. **Resource strip** (sticky, 56 px, pressed tin, 4 rivets, crimped 3 px bottom edge via CSS mask, 2 px ink rule).
   - The first focusable element is the skip link "Skip to the worlds".
   - **Left (x 24):** the wordmark "WIND-UP EMPIRE" (Tilt Warp 20 px, ink, tracking into its own tilt at `--wind`) and a pink sticker at −3°: "DEMO MODEL · FAKE ECONOMY" (Zen Maru 700, 12 px caps, ink).
   - **Centre (x 380–1060):** three odometer drums, TIN, SPRING and SPARK.
     - Label: Zen Maru 700, 11 px caps, ink.
     - Well: 112×36 ink, with Sono 700 22 px tin-hi digits in six drum windows.
     - Rate: Sono 500, 11 px, tin-text, e.g. "+1.2/s".
     - The Spark Wheel sits right of SPARK.
   - **Right (to x 1416):** tin-tab links "Worlds" and "How to play", and the bell toggle ("Sound off" / "Sound on").
1. **The Lid** (cobalt, 100 svh, min 760 px). This is the first viewport (§13). Its one scroll moment, the **lid lift**, runs over the first 60 vh of scroll (GSAP ScrollTrigger scrub on Lenis):
   - the lid section translates up at 1.35× scroll;
   - the scene camera pitches up 0 → 10°;
   - DOM overlays scale 1 → 0.96;
   - a soft cast shadow on the tray below grows from `0 0 0` to `0 24px 48px rgba(10,15,74,.45)`.

   There is no DOM 3D transform over the canvas.
2. **The Inner Tray**, "Five worlds in the box" (turquoise; §11). Head in Tilt Warp 56 px ink. Lede in Zen Maru 18 px ink, 62ch.
3. **The Box Side**, "Run the empire" (vermilion).
   - **Lede** (white, 5.51:1): "Every number here is made up by this page. The springs, orbits and dither are real."
   - **12-column grid, three unequal plates** (not same-size cards):
     - **Construction** (7 cols): build list with "Queue" buttons, the 3-slot queue (dashed → solid), the flat SVG key, and the ticket spike.
     - **Litho Press** (5 cols): T4, drawn as a machine with a die face.
     - **Hangar** (12 cols, low strip): gantry slots as tin rocket icons, rockets in flight with `r/v/t`, and the charted list with stamps.
   - **"Reset universe"** as a tin lever button at the head's right.
4. **The Instruction Leaflet** (chrome field; a paper sheet 880 px wide, rotated −0.6°, with the soft shadow `0 8px 24px rgba(21,19,28,.25)`).
   - **"How to play"**: five numbered steps. The order is real, so numbers are earned. Each step has a 2 px ink SVG diagram.
   - **"About this demo"**.
   - **A warning plate** (full orange border, not a side stripe).
   - **Buttons:** "Skip the grind: unlock everything" and "Reset universe".
5. **The Proof** (night cobalt; the underside of the lid). Close (G3):
   - **Head:** "Every moment of your visit, at once." (Tilt Warp 56 px chrome).
   - **The print:** 1200×900 in the browser, scaled to 960×720 on desktop, framed as a litho proof with 4 registration marks and a colour bar of the 16 inks.
   - **Buttons:** "Save the print (PNG)" (chrome) and "Reprint" (tin).
   - **Footer:**
     - "Printed live in 16 inks by your browser · crewtives playground · demo model 0.1"
     - links to crewtives.com and the 4D.OS launcher
     - "Type: Tilt Warp, Rampart One, Zen Maru Gothic and Sono, SIL Open Font License."
     - "“Cat” by J-Toastie, CC-BY 3.0 (worlds A–C)."

Rhythm: busy (lid) → orderly (tray) → working (deck) → calm (leaflet) → still (proof). One 8 px grid. Section padding is 128 px above and 96 px below at desktop, so there is more space above a head than below it.

## 13. First viewport: exact composition at 1440 × 900

| element | box / position | spec |
|---|---|---|
| Strip | y 0–56 | §12.0 |
| Lid field | y 56–900 | cobalt `#1B2CC4`. Bayer edge shading in space-deep, 48 px deep, inside the frame |
| Litho frame | rules inset 16 px: x 16–1424, y 72–884 | 4 px chrome rule, 6 px gap, 2 px vermilion rule, radius 14 |
| H1 "WIND-UP EMPIRE" | centred on x 720; cap-top y 100, baseline y 168; ≈ 660 px wide (x 390–1050) | Tilt Warp 88 px, chrome; XROT/YROT from `--wind` (0 at rest) |
| Subline | one line, centred, box y 192–220, max 720 px | Zen Maru 500, 19/1.45, tin-hi: "A demo space empire that runs on springs. Five real worlds orbit the Whirl." |
| Orrery (WebGL, lid-sized EngineView) | Whirl centre (720, 540); lab ring ellipse 800×560 → x 320–1120, y 260–820 | 94.4 px/u; world tops on the golden-spiral rest; home top at (720, 760) |
| Rocket and cradle | rocket at (720, 748); hit area 654–786 × 682–814 | T1 |
| Rail plate | x 590–850, y 792–828 | tin, "PULL BACK TO LAUNCH" in Zen Maru 700 12 px caps |
| BUILD instrument (left) | key view x 70–270, y 300–500; tag at (250, 470) | T3 |
| Build ticket | x 46–294, y 540–716 | tin slip (§10 T3) |
| FLEET instrument (right) | gauge x 1170–1370, y 300–500 | mirror of the key |
| Survey log | x 1146–1394, y 540–716 | tin slip, the last 4 lines, Zen Maru 500 14/1.4 ink, newest on top with a stamp-in |
| Lip band | x 32–1408, y 836–872 | chrome field |
| Lip band, left | from x 56 | Zen Maru 700, 13 px caps, +0.06em, ink: "DEMO MODEL · FAKE ECONOMY · RESETS ON RELOAD" |
| Lip band, right | right-aligned to x 1384 | ink button 28 px tall with chrome text: "Five real worlds inside · Open the box" + SVG arrow-down, scrolling to the tray |

**What moves in the first idle second** (motion allowed):
- planets orbit at Kepler rates, dropping exposures;
- tops spin with their prints smeared into rings;
- stars twinkle;
- the demo rocket launches at 0.8 s, and by 3 s its whip past the Whirl is printed across the orrery;
- the gauge needle swings with it.

**Mobile first viewport (390 × 844):**

| element | position | spec |
|---|---|---|
| Strip | two rows: 44 px (wordmark, sticker, bell, menu) + 36 px (three drums at 96×28, 16 px digits, Spark Wheel 48×28) | |
| Frame | inset 8 px | |
| H1 | two lines "WIND-UP / EMPIRE", centred, box y 96–188 | Tilt Warp 44 px |
| Subline | two lines, y 196–240, max 340 px | 16/1.45 |
| Orrery | view 358×320 at y 250–570, Whirl at (195, 405) | lab ring rx 170 (40 px/u); tops scaled 1.4× so the smallest is ≥ 14 px in radius |
| Home and rocket | (195, 498) | hit area 120×120 |
| Rail plate | y 520–548 | |
| Instruments | two 171×150 tiles at y 580–730 (key left, gauge right) | |
| Lip band | wraps to 2 lines at y 744–828 | |
| Ticket and log | begin just below the fold | |

## 14. Motion grammar: "a spring unwinding"

- **Settle** (default for physical things): exponential decay `ω(t) = ω₀·e^{−t/τ}`, τ 0.9 s. UI eases with `cubic-bezier(0.16,1,0.3,1)`, 420 ms, always from an already-visible state.
- **Ratchet:** a detent snap from the spring solver (k 420, c 18) plus a 1 px shake. Tray and deck DOM keys use `steps(8)` per turn.
- **Stamp:** tickets, CHARTED tabs, log lines and the LV stamp press in with `scale(1.035 → 1)` and a settling shadow, 110 ms, `cubic-bezier(0.2,0.9,0.1,1)`.
- **CLACK:** scale 1.06 → 1 in 90 ms plus a 1 px plate jolt.
- **Tin rattle** (hover on plates and tops): `θ(t) = 1.2°·e^{−0.22·2π·9t}·sin(2π·9t)` for 360 ms via WAAPI.
- **Drum roll:** 160 ms per digit, `cubic-bezier(0.3,1.4,0.5,1)` (a small overshoot on carry). Above 20 changes/s the drums switch to a blurred roll (`filter: blur(0.6px)` via `@property --roll`).
- **One authored scroll moment:** the lid lift. No section entrances, fades or slide-ups anywhere else. The toys supply all other motion.
- **Flash guard:** no full-field colour change faster than 3 Hz. Sparks are local and capped at 120.

## 15. Sound (WebAudio synthesis, OFF by default)

- **Toggle:** the bell in the strip, "Sound off". It creates the `AudioContext` only on first enable. The preference is stored in `localStorage` inside try/catch. There are no audio files.
- **Master chain:** −12 dB into a `DynamicsCompressorNode`. The context is suspended on `document.hidden`.

| event | synthesis |
|---|---|
| Detent / ratchet tick | 6 ms white noise, bandpass 3.2 kHz Q 8, −18 dB |
| Ratchet slip | 4 ticks at 25 ms spacing, pitch −10 % |
| Unwind whirr | sawtooth 90 Hz → lowpass 600 Hz, 11 Hz LFO on gain, level ∝ unwind speed |
| CLACK / tin clank | inharmonic partials 440·[1, 2.76, 5.40, 8.93] Hz, decays 180/120/80/50 ms, plus a 180 Hz sine thump (60 ms) |
| Hum | sine + 2nd harmonic, `f = 90 + 2.2ω` Hz, −24 dB, while any top spins |
| Flywheel whine | sine 300 → 900 Hz following d, −26 dB |
| Launch | FM zip, carrier 220 → 880 Hz in 180 ms, index 3 |
| Swallowed | triangle glide 440 → 55 Hz over 1.2 s, rising lowpass resonance |
| Sparks | 8–20 noise grains of 2 ms over 120 ms |
| Press thunk | sine 70 Hz, 90 ms decay, plus a noise click |
| Drum carry | 2 ms click, at most 30 per second |

## 16. Responsive

- **≥ 1280:** as in §13. Positions are fluid, as % of the lid with clamps. The orrery ellipse is `min(56vw, 62svh·1.43)` wide.
- **1024–1279:**
  - H1 72 px;
  - instruments 168 px, slips 216 px;
  - lab ring 640 px wide.
- **≤ 900:** the instruments leave the lid sides and sit as a two-tile row under the orrery (as on mobile).
- **Tray:**

  | width | layout |
  |---|---|
  | 1440 | 12 columns |
  | ≤ 900 | 6 columns, with B spanning 6 |
  | ≤ 560 | 1 column, in the order B, A, C, D, E, launcher, labs |

- **Deck:** plates stack.
- **Leaflet:** unrotated below 560.
- **Phones:**
  - DPR capped at 1.5, `pixelScale 2`;
  - 90 stars, 240 exposures, 8-segment tops, ≤ 2 rockets in flight;
  - 16 px side gutters, touch targets ≥ 44 px;
  - the canvas keeps `touch-action: pan-y` except the rocket hit area and the key;
  - a horizontal flick on a planet spins it, and a vertical drag scrolls the page;
  - no horizontal page scroll.

## 17. Reduced motion and fallbacks

**`prefers-reduced-motion: reduce`.** There is no autoplay: no drift, no demo flight, no lid lift, no rattle, no twinkle. Planets rest on the golden spiral with their orbits pre-printed as exposures. Every toy works and **jumps to the result** (G8):
- **Launch:** computes the whole flight instantly and prints every exposure at once as a chronophotograph. This is the purest form of the theme. Then the outcome is logged.
- **Spin:** shows the ring print as a still. The top stays upright.
- **Key:** each detent snaps with no overshoot. "Let go" completes the job immediately with one stamp.
- **Drums:** swap digits without rolling.
- **Press:** mode switches cut without the dissolve.

**No WebGL2.** The page probes `canvas.getContext('webgl2')` before the dynamic import of the scene chunk. Without it:
- **Lid:** an inline SVG orrery baked at build time by `scripts/bake-orbit-fallback.ts` from the same geometry, with a painter's-algorithm projection. It shows:
  - the Whirl with a 5-arm golden spiral
  - dashed and solid rings
  - flat litho tops on the golden spiral
  - stars
  - a CSS radial-dot halftone
- **Flight:** one pre-computed flight (`flight.ts` runs in plain JS), printed as an SVG chronophotograph labelled "Printed flight (static view)". The "Launch" button prints a new deterministic flight from the aim and pull sliders as SVG.
- **Key:** the SVG key. The economy, Spark Wheel, tray (stills are PNG) and leaflet all work.
- **Press:** the switches change only the CSS halftone.
- **Proof:** composes the SVGs on a 2D canvas.

## 18. Performance plan (budget: JS ≤ 350 KB gz, first load ≤ 2 MB)

**JS, estimated then measured by `vite build` + gzip:**

| part | size (gz) |
|---|---|
| three r186 (tree-shaken: WebGLRenderer, Lathe/Extrude/Torus, InstancedMesh, RawShaderMaterial, Points) | ≈ 140 KB |
| GSAP core + ScrollTrigger | ≈ 42 KB |
| Lenis | ≈ 4 KB |
| App code | ≈ 35 KB |
| **Total** | **≈ 221 KB** |

The scene is a dynamic-import chunk. `lifeStack`, `tesseract` and the 4D packs are never imported.

**Other assets:**
- **Fonts:** ≈ 163 KB.
- **Rasters:** only the five existing stills, lazy-loaded in the tray. They are 97 + 260 + 190 + 77 + 76 ≈ 700 KB as PNG, kept at 1200×900 so the dither is not resampled.
- **First viewport transfer:** ≈ 0.45 MB. **Whole page:** ≈ 1.15 MB.

**GPU and main thread:**
- **Lid:**
  - The lid is one EngineView rendered at `pixelScale 2`, so ≈ 700×402 internal at 1440.
  - About 18 draw calls: Whirl ×2, 7 tops, stars (instanced), rings (one `LineSegments`), exposures (instanced), rockets ≤ 4, sparks.
- **Other views:**
  - The key and gauge views render only while interacting or on a needle change.
  - Tray tops render only while hovered, focused or spinning.
- **Idle and hidden:**
  - The Engine's on-demand loop ticks continuously only while the lid is visible and motion is allowed. Off-screen or hidden: zero frames.
  - The economy ticks at 10 Hz and writes the DOM only when a displayed digit changes.
- **Ghost preview:** 720 Verlet steps per change (< 0.1 ms).
- **Proof print:** rendered once on section entry and on "Reprint": one 1200×900 offscreen pass plus a 2D composite.
- **Targets:**
  - 60 fps at 1440×900 on Apple silicon, verified with `engine.stats` and a Performance trace during 4 rockets plus 7 spinning tops;
  - ≥ 45 fps on a mid-range phone.

## 19. Key English copy

| where | copy |
|---|---|
| `<title>` | "Wind-Up Empire · crewtives playground" |
| H1 | **WIND-UP EMPIRE** |
| Subline | "A demo space empire that runs on springs. Five real worlds orbit the Whirl." |
| Lip band | "DEMO MODEL · FAKE ECONOMY · RESETS ON RELOAD" · button "Five real worlds inside · Open the box" |
| Key tag | "WIND ME" · "drag round · or hold Space" |
| Build ticket | "BUILD QUEUE" · "Tin mine → Lv 2 · 30 tin · 6 s" (the arrow is SVG) · "2 turns needed · 0 wound" · buttons "+1 turn" / "Let go" |
| Key chips | "WINDING · REWIND" / "HOLD" / "RUNNING · FORWARD" |
| Build lines | "Built. Tin mine is level 2. Tin now +1.6/s." · "The spring's full. Twelve turns is all a tin toy takes." · "Spring held. Queue a build to use it." · disabled "Needs 12 more tin" |
| Rail | "PULL BACK TO LAUNCH" · "Hold Space to pull, let go to fly" · "All rockets out (1/1)" |
| Gauge | "FLEET" · `r 0.46 · v 3.12 · t 00:02.2` |

**Log lines:**
- "Rocket 0 · demo flight left home."
- "Rocket 3 surveyed Plate [1:1:4] and Leader [1:1:5] in one flight. +30 spark."
- "Lost to the Whirl. Rocket refunded: this is a demo."
- "Left the system. Rocket refunded."
- "Rocket 5 came home after 20 s. It never found a planet."
- "Universe reset. Back to 60 tin."

| where | copy |
|---|---|
| Strip | "Tin" · "Spring" · "Spark" · "Worlds" · "How to play" · "Sound off" / "Sound on" · "Rub the spark wheel" |
| Tray head | "Five worlds in the box" |
| Tray lede | "Nothing here is locked. Every world opens now; the game only decides which planets spin." |
| Tray link | "Open world" |
| Launcher | "4D.OS · All five worlds from one desktop." |
| Lab | "Empty socket · in the lab. The next experiment isn't cast yet." |
| Deck head | "Run the empire" |
| Deck lede | "Every number here is made up by this page. The springs, orbits and dither are real." |
| Press rows | "One-ink press / 16-ink litho / Full process" · "Exposure memory: 12 / 48 / 200 moments" · "Symmetry: 3-fold / 5-fold / 8-fold" · "Needs Observatory Lv 2" |

**Leaflet "How to play":**
1. "Wind the key. Let go and the queue builds."
2. "Pull back a rocket and let go."
3. "Flick a planet to spin it."
4. "Research the press to re-print the sky."
5. "Open a world. They are real demos."

**Leaflet warning plate:** "Contains a fake economy. The numbers are invented by this page and vanish when you reload. No accounts, no scores, no tracking." Button: "Skip the grind: unlock everything".

**Proof:**
- Head: "Every moment of your visit, at once."
- Print caption (Sono, on the print): "WIND-UP EMPIRE · proof of a visit · 12 flights · 3 charted · 7 turns wound · 2026-09-25 14:02" (the visitor's local time)
- Buttons: "Save the print (PNG)" · "Reprint"
- Note: "Made in your browser. Nothing is uploaded."

## 20. Honest risks

1. **The tin toy was last on the base's own resonance list.** Genre players may read "toy box" before "strategy game". Mitigation: the drums, `[g:s:p]` coordinates, queue with timers, fleet gauge and log are all in the first viewport.
2. **A busy lid.** Mitigation: strict mirror symmetry. Only one toy per zone (key, rocket, planets); the press lives in the deck.
3. **Tilt Warp legibility at extreme axes.** The cap is `YROT −28`, `XROT −10`. At rest both are 0, and body copy never uses it.
4. **Rampart One's inline outline at small sizes.** Its floor is 16 px. Below that, nameplate text uses Zen Maru 700.
5. **Chrome on vermilion is 3.55:1**, so large text only (≥ 24 px). Body text on vermilion is white (5.51:1). Verify over the Bayer edge shading on the built page.
6. **Rocket drag vs page scroll on touch.** `touch-action: none` applies only to the 120 px hit area and the key.
7. **Lid-lift sync.** The DOM translate and camera pitch must share one ScrollTrigger progress value, or the frame and scene drift apart.
8. **Tray tops couple to other flavors' `tokens.css`.** This is intended: the planets follow the worlds' real inks.
9. **Build plumbing.** `vite.config.ts` builds with base `/4d-os/` into `dist/4d-os`. The landing needs `vite.playground.config.ts` (base `/`, input `playground/landings/*/index.html`, `outDir dist`, `emptyOutDir false`) so it doesn't wipe 4D.OS.
10. **Idle-game drift.** The Spark Wheel cap and "Skip the grind" keep it a toy.
11. **Kitsch.** There are no fake-vintage textures (no rust, no scratches) and no pseudo-Japanese lettering. Every object is computed, and the dither keeps it live.

## 21. File plan (scratch direction only; the build does not start from this document)

```
playground/landings/orbit/index.html        # semantic DOM: strip, lid overlays, tray <ul>, deck, leaflet, proof, live log, inline fallback SVG
playground/landings/orbit/DESIGN.md         # written at finish by the documenter
src/playground/orbit/main.ts                # boot: WebGL2 + reduced-motion probe → dynamic import scene; Lenis; one ScrollTrigger (lid lift)
src/playground/orbit/tokens.css             # page tokens, --pal-16-0..15, @font-face, --wind
src/playground/orbit/orbit.css              # tin plates, litho frame, die-cut tray, leaflet, proof, focus/selection/scrollbar/caret
src/playground/orbit/fonts/                 # tilt-warp-latin-full-normal.woff2, rampart-one-latin-400-normal.woff2,
                                            # zen-maru-gothic-latin-{500,700}-normal.woff2, sono-latin-wght-normal.woff2, OFL-*.txt
src/playground/orbit/icons.svg              # authored arrow/bell/lever/rocket/key/spark symbols (2 px stroke)
src/playground/orbit/economy.ts (+ .test.ts)   # resources, queue, spring bank, research, reset, unlock-all
src/playground/orbit/flight.ts (+ .test.ts)    # Verlet, outcomes, fixtures (d=1: α −60 swallow ≈2.56 s; α −20 slingshot rmin 0.46; α 0 escape ≈5.75 s)
src/playground/orbit/spring.ts              # --wind follower, detent solver
src/playground/orbit/scene/lowpoly.ts       # lathe/extrude/flat-shade helpers, Fibonacci sphere
src/playground/orbit/scene/orrery.ts        # lid EngineView: Whirl, rings, stars, tops, rockets, exposures, sparks, lid pitch
src/playground/orbit/scene/tinTop.ts        # profile, print shader, spin/precession/topple
src/playground/orbit/scene/key.ts           # key + coil EngineView, rosette render target
src/playground/orbit/scene/proof.ts         # 1200×900 offscreen pass + 2D composite + toBlob
src/playground/orbit/shaders/{whirl,top,exposure,star}.{vert,frag}.glsl
src/playground/orbit/ui/{drums,queue,press,rail,gauge,log,tray,sparkWheel,nameplates}.ts
src/playground/orbit/bayerTile.ts           # 8×8 Bayer → tinted 64 px CSS tiles
src/playground/orbit/sound.ts               # WebAudio voices, off by default
scripts/bake-orbit-fallback.ts              # same geometry → SVG prints for no-WebGL
vite.playground.config.ts                   # base '/', landings input, outDir dist, emptyOutDir false
```

Reused from core: `Engine`, `RetroDisplay` (the `mode` setter and `reveal`, and `tokenRoot` for the per-world tray tops), `smoothScroll`, `keyboard`, `cssColor`. At finish, run `impeccable embed-prompt --scan` over the stills directory so each still carries its origin ("captured from world X's live render").

## 22. Memory test

An hour later: *"That toy-box space game printed on tin. I wound a chrome key and it printed a flower of keys while a little mine clacked up and the counters rolled. I pulled back a red rocket and it whipped round a spinning red-and-yellow whirl, leaving stamped copies of itself. The planets were spinning tops, and each one was a real demo I could open. At the bottom it gave me a print of my whole visit."*
