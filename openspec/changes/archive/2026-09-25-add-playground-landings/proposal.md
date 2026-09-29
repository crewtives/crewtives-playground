# Proposal

## Why

`playground.crewtives.com` already publishes 4D.OS at `/4d-os/`. Its root redirects temporarily while it waits for a landing of its own. Decided on 2026-09-25: the playground gets three distinct landing options, and every design decision is delegated to this change. They must be beautiful, with vivid colors in the spirit of the reference aesthetic, low poly, symmetry and the studio's animation theme. Each one has to be a real playground: fun toys on the same page and an index of the demos.

The themes were fixed up front:
- cyberpunk, Blade Runner and Tokyo neon;
- universes, black holes and an OGame-style game that clearly reads as a demo;
- the symmetry of nature: flowers, succulents, aloe and honeycombs.

## What Changes

- Three candidate landings are built. Each one is a world of its own that comes out of the *new-work* process of `/impeccable`: a concept draw, two independent designers, a judge and a critic of the set.
  - **Game Center Yonjigen** (`/landings/game-center/`): a Tokyo arcade building where each floor is a genre and scrolling is the elevator. The toys are:
    - Rain Run, a flight between signs whose game turns into a chronophotograph;
    - the claw machine that "wins" a world;
    - the pachinko glass with rewind;
    - the gas tube of the rooftop sign.
  - **Wind-Up Empire** (`/landings/wind-up-empire/`): a space empire of lithographed tin that you wind up. It is a demo with a fake economy that resets. The toys are:
    - friction rockets that orbit a tin black hole;
    - planet tops that are the five 4D.OS worlds;
    - the key that runs the build queue;
    - the litho press that changes the display;
    - the spark wheel.
  - **Bloomscope** (`/landings/bloomscope/`): a giant kaleidoscope turned with a brass ring. The toys are:
    - the golden-angle seeder;
    - the rosette lathe (succulent and aloe in a spiral);
    - the honeycomb that runs generations.
- A simple page at `/landings/` compares the three.
- The three share an honest index of the demos: the five 4D.OS worlds with their real stills, the launcher and three lab slots with no name or link. They also share synthesized sound that is off by default, reduced motion, a fallback without WebGL2 and the demo label.
- A second build configuration publishes the landings into `dist/` next to `dist/4d-os/`, without copying the 4D packs.
- **Additive change to the retro display:** an optional shape mask (ellipse or rounded rectangle). It is off by default, so 4D.OS does not change.
- **Additive change to smooth scroll:** an option to not jump back to the top on load, so the landings' deep links work.
- The stills of A, B and C were captured on 2026-09-25 and enter git with their provenance in `LICENSES.md`, along with the new OFL fonts.
- The root `/` keeps redirecting to `/4d-os/` until a landing is chosen. The three are published first to a **preview version** of the Worker, without touching production.

## Capabilities

### New Capabilities
- `playground-hub`: what the three landings share:
  - routes and the comparison page;
  - index of worlds with stills and credits;
  - build and deploy alongside 4D.OS;
  - sound, reduced motion and a fallback without WebGL2;
  - demo honesty, accessibility and load budget.
- `landing-game-center`: the Tokyo arcade landing and its four toys.
- `landing-wind-up-empire`: the tin space empire landing, its demo economy and its five toys.
- `landing-bloomscope`: the kaleidoscope landing and its four natural-symmetry toys.

### Modified Capabilities
- `dither-display`: adds an optional shape mask for circular views or views with rounded corners. By default there is no mask and the current output stays identical.

## Impact

- **New code:**
  - `playground/` (pages);
  - `src/playground/shared/**`;
  - `src/playground/{game-center,wind-up-empire,bloomscope}/**`;
  - `vite.playground.config.ts`.
- **Core (additive changes):** `src/core/display/RetroDisplay.ts`, `display.frag.glsl` and `src/core/shell/smoothScroll.ts`.
- **Build and deploy:** the `build`, `dev:playground` and `deploy` scripts in `package.json`, and `tsconfig.json`. `wrangler.jsonc` does not change; neither does `cloudflare/_redirects` until the landing is chosen.
- **Assets:** the OFL fonts live inside each landing, and the stills are lossless WebP with provenance. No new npm dependencies are added.
- **Documentation:** surfaces in `.impeccable/surfaces/`, `DESIGN.md` and `.impeccable/design.json` with the three worlds, `LICENSES.md` and `PRODUCT.md` (the playground's brand commitments).
