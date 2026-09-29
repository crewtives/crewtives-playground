// Collection of the playground museum ("The épure"): the only hand-curated source. This is where
// the works are chosen, with their sheet number, title, series, form, creation date, wall text and
// routes. The other figures of each work (frames, weight, trail, loop) are NOT written here: they come
// from the work during the build (the manifest). Each work's rule is imported from its module, in that
// module's unit.

import { formatAngle, GOLDEN_ANGLE as SOW_GOLDEN_DEG } from '../bloomscope/specimens/spec';
import { seedPosition, SOW_RATE, START_SEEDS } from '../bloomscope/sow/sow';
import { GOLDEN_ANGLE as FALCON_GOLDEN_RAD, SPIRAL, SPIRAL_B } from '../../pipeline/scenes/falconPhi';
import { fallRadius, WHALE_FALL } from '../../pipeline/scenes/whaleFall';
import { LAUNCHER, WORLDS, type WorldId } from '../shared/worlds';

/** Sheet number: always three digits (the collection test checks it). */
export type SheetNumber = string;

/** ○ scene with a 4D pack · □ toy · △ workshop. */
export type Form = 'scene' | 'toy' | 'workshop';
export const FORM_NAME: Record<Form, string> = { scene: 'scene', toy: 'toy', workshop: 'workshop' };

/** Loop id: one per VISTA. The 4D.OS worlds by their letter; Bloomscope by its name. */
export type LoopId = WorldId | 'bloomscope';

/** Color read from one of the work's CSS tokens (the passe-partout takes the work's background color). */
export interface TokenRef {
  /** Tokens file, relative to the repo root. */
  file: string;
  name: string;
}

export interface SheetView {
  loop: LoopId;
  /** Label of the VISTA on a sheet with several (001: "A · Vitrine"). */
  label: string | null;
  /** Link from the VISTA to its world (001). */
  href: string | null;
  /** Passe-partout: the color of the work's frame or background, from its tokens. */
  mat: TokenRef;
  /** What the loop shows, for its alt text and its accessible description (no figures). */
  description: string;
}

export interface Rule {
  /** Text of the rule, built from the work's constants. */
  text: string;
  /** The constants the text uses, imported from their module (the test compares identity). */
  constants: Record<string, number>;
  /** The rule's function in its module, if it has one. */
  fn?: (...args: number[]) => unknown;
}

export interface WorkSheet {
  number: SheetNumber;
  title: string;
  /** The line in the index. */
  line: string;
  series: typeof LAUNCHER.name | null;
  form: Exclude<Form, 'workshop'>;
  /**
   * Creation date, `YYYY-MM-DD`: the day the work was first published in the repo, in the author's
   * time zone. Curated here; the build does not take it from git.
   */
  created: string;
  /** Main action: "Enter <title>". */
  enter: string;
  technique: string;
  rule: Rule | null;
  /** Wall text: 80 words at most, with no hand-written figures. */
  text: string;
  /** The work's 4D pack, if it has one. */
  pack: string | null;
  views: SheetView[];
  /**
   * Paths of the work's sources, relative to the repo root: everything that changes what the work
   * paints. The hash of their content (`build/sources.ts`) is recorded in each loop's provenance; if it
   * changes, the loop is stale.
   */
  sources: string[];
}

// ── Bloomscope fixed garden (spec landing-bloomscope, "Fixed garden for the museum loop") ────────
// It came from "Copy link to this garden" with the factory garden (d5, barrel 0, display 16) and Sow
// at the golden angle, which the link stores rounded to 4 decimals (137.5078). It is a literal on
// purpose: if the `#g=` format changes, the collection test fails instead of silently leading to the
// default garden.
export const FIXED_GARDEN_HASH =
  '#g=WzEsMSwwLDEsMTM3LjUwNzgsW1siaCIsMTM3LjUwNzgsMTQ0XSxbInIiLDAsMjEsMC41LDAuNiwwXSxbInIiLDEsMjAsMC40LDAuMiwwXV1d';
export const BLOOMSCOPE_ROUTE = '/bloomscope/';
export const FIXED_GARDEN_LINK = `${BLOOMSCOPE_ROUTE}${FIXED_GARDEN_HASH}`;

/**
 * Seeds the Sow recording expects (frame 0 and the increase per frame at 15 fps). They only let the
 * recording check itself: the épure uses the counts the provenance records.
 */
export const SOW_EXPECTED = { startSeeds: START_SEEDS, perFrame: SOW_RATE / 15 } as const;

const world = (id: WorldId) => WORLDS.find((w) => w.id === id)!;

const CORE = ['src/engine', 'src/4d-os/launcher'];
const catWorld = (id: 'a' | 'b' | 'c') => [`sites/4d-os/${id}/index.html`, `src/4d-os/worlds/${id}`];

/** The four work sheets of the initial collection, in number order. */
export const SHEETS: readonly WorkSheet[] = [
  {
    number: '001',
    title: 'The cat',
    line: 'One scene of a black cat climbing a stair, shown in three worlds.',
    series: LAUNCHER.name,
    form: 'scene',
    created: '2026-09-24',
    enter: LAUNCHER.route,
    technique: 'Baked point pack, rendered live in WebGL through an ordered-dither display',
    rule: null,
    text:
      'A black cat climbs a stairway in an alley at night. The scene is one baked sequence of points, and three worlds of 4D.OS read it differently: a red gallery keeps every step as a ghost, a photographic plate exposes the whole climb at once, and a film leader runs it through a projector gate. The loops here are the same seconds of the climb, seen by all three.',
    pack: 'cat-stairs',
    views: [
      {
        loop: 'a',
        label: `A · ${world('a').name}`,
        href: world('a').route,
        mat: { file: 'src/4d-os/worlds/a/tokens.css', name: '--wall' },
        description: 'A red gallery room at night: a black cat climbs a stairway in points, and its earlier steps stay behind it as ghost cats.',
      },
      {
        loop: 'b',
        label: `B · ${world('b').name}`,
        href: world('b').route,
        mat: { file: 'src/4d-os/worlds/b/tokens.css', name: '--plate' },
        description: 'A dark photographic plate under an aurora sky: the whole climb of the cat is exposed at once as a staircase of cats.',
      },
      {
        loop: 'c',
        label: `C · ${world('c').name}`,
        href: world('c').route,
        mat: { file: 'src/4d-os/worlds/c/tokens.css', name: '--leader' },
        description: 'A projector gate between film perforations: the night climb of the cat runs through the film, over-exposed in orange.',
      },
    ],
    sources: ['sites/4d-os/public/packs/cat-stairs', ...catWorld('a'), ...catWorld('b'), ...catWorld('c'), ...CORE],
  },
  {
    number: '002',
    title: world('d').name,
    line: world('d').line,
    series: LAUNCHER.name,
    form: 'scene',
    created: '2026-09-24',
    enter: world('d').route,
    technique: 'Point pack baked from equations, rendered live in WebGL through an ordered-dither display',
    rule: {
      text: `golden spiral r = ${SPIRAL.r0}·e^(−b·θ), b = ${SPIRAL_B.toFixed(4)}, so e^(b·π/2) = φ; the city is sown at the golden angle, ${FALCON_GOLDEN_RAD.toFixed(5)} rad`,
      constants: { r0: SPIRAL.r0, b: SPIRAL_B, goldenAngleRad: FALCON_GOLDEN_RAD },
    },
    text:
      'A peregrine falcon, computed from equations rather than captured, flaps, glides and stoops along a golden spiral: every quarter turn the radius shrinks by the golden ratio. It pulls out, lands and perches on a tower in a city of points laid out like the seeds of a sunflower. Its earlier moments stay behind it in phosphor green.',
    pack: 'falcon-phi',
    views: [{ loop: 'd', label: null, href: null, mat: { file: 'src/4d-os/worlds/d/tokens.css', name: '--glass' }, description: 'A peregrine falcon computed from equations stoops along a golden spiral through a city of points, its earlier moments trailing behind it.' }],
    sources: ['sites/4d-os/public/packs/falcon-phi', 'src/pipeline/scenes/falconPhi.ts', 'src/pipeline/scenes/random.ts', 'sites/4d-os/d/index.html', 'src/4d-os/worlds/d', ...CORE],
  },
  {
    number: '003',
    title: world('e').name,
    line: world('e').line,
    series: LAUNCHER.name,
    form: 'scene',
    created: '2026-09-24',
    enter: world('e').route,
    technique: 'Point pack baked from equations, rendered live in WebGL through an ordered-dither display',
    rule: {
      text: `fall radius r(t) = r_s·(1 + ${WHALE_FALL.A}·e^(−t/${WHALE_FALL.T} s)), with r_s the horizon radius and t the far observer’s clock: seen from far away, the whale nears the horizon and never crosses it`,
      constants: { A: WHALE_FALL.A, T: WHALE_FALL.T, rs: WHALE_FALL.rs },
      fn: fallRadius,
    },
    text:
      'A humpback whale, computed from equations, spirals into a black hole. Seen from far away its fall slows and its light reddens as it nears the horizon, which it never crosses; its own clock keeps a different time. The disk around the hole is traced live, bent by the hole’s gravity.',
    pack: 'whale-fall',
    views: [{ loop: 'e', label: null, href: null, mat: { file: 'src/4d-os/worlds/e/tokens.css', name: '--void' }, description: 'A humpback whale computed from equations spirals towards a black hole, whose bright disk is bent by its gravity.' }],
    sources: ['sites/4d-os/public/packs/whale-fall', 'src/pipeline/scenes/whaleFall.ts', 'src/pipeline/scenes/whaleFallSky.ts', 'src/pipeline/scenes/math.ts', 'src/pipeline/scenes/random.ts', 'sites/4d-os/e/index.html', 'src/4d-os/worlds/e', ...CORE],
  },
  {
    number: '004',
    title: 'Bloomscope',
    line: 'A kaleidoscope garden where seeds are sown at the golden angle.',
    series: null,
    form: 'toy',
    created: '2026-09-25',
    enter: BLOOMSCOPE_ROUTE,
    technique: 'Equations computed in the browser, rendered live in WebGL through an ordered-dither display',
    rule: {
      text: `seed n at θ = n·${formatAngle(SOW_GOLDEN_DEG)}°, r = c·√(n + ½)`,
      constants: { goldenAngleDeg: SOW_GOLDEN_DEG },
      fn: seedPosition,
    },
    text:
      'A kaleidoscope you can garden in. In its sowing section, a dial sets the angle between one seed and the next; at the golden angle the seeds pack without gaps and the head shows its famous spirals. Hold the button and new seeds are born at the rim, pushing the older ones inward. The loop here records that sowing.',
    pack: null,
    views: [
      {
        loop: 'bloomscope',
        label: null,
        href: null,
        mat: { file: 'src/playground/bloomscope/tokens.css', name: '--sheet' },
        description: 'Sow, the sowing section of Bloomscope: seeds are born at the rim of a flower head, one after another at the golden angle, and the newest seed is marked in ruby.',
      },
    ],
    sources: ['src/playground/bloomscope', 'sites/playground/bloomscope', 'src/playground/shared', 'src/pipeline/scenes/random.ts', ...CORE],
  },
];

/**
 * Numbers that had a sheet and lost it: they are never reused. None so far.
 */
export const RETIRED_NUMBERS: readonly SheetNumber[] = [];

/** Featured sheet pinned by hand; null = the work sheet with the highest number (D16). */
export const FEATURED: SheetNumber | null = null;

export function featuredSheet(): WorkSheet {
  if (FEATURED) return SHEETS.find((s) => s.number === FEATURED)!;
  return [...SHEETS].sort((a, b) => Number(b.number) - Number(a.number))[0];
}

/** Sheet 000: the house method (D11). Reserved, never a work's. */
export const METHOD_SHEET = {
  number: '000',
  title: 'Method',
  line: 'How to read a sheet: Gaudí’s double-twist column and the tesseract, drawn as épures.',
} as const;

/** Three workshop sheets: no number, name, link or date. */
export const WORKSHOP_SHEETS = 3;
export const WORKSHOP_TEXT = 'Being drawn. Not public yet.';

/** Text of the 4D.OS series gate row (D10): the launcher's name and line. */
export const GATE_ROW = `${LAUNCHER.name} — ${LAUNCHER.line}`;

/** Title of the collection: the museum's only h1. */
export const COLLECTION_TITLE = 'crewtives playground';
