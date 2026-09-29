// Composition data of the share images (spec site-metadata; add-seo-and-sharing D5): for each of the
// 10 pages, the real capture its frame comes from, the 840×630 region of it that is copied one for
// one, the 4D.OS worlds that region shows, and the band beside it: the page's own typefaces, colors
// read from its own tokens, and the strings it carries. `tools/capture-og.ts` composes the images
// from this; `cards.test.ts` checks it without a browser. Whether a band says "synthetic" and whose
// credit it carries is never written here: it comes from the registry (`isSynthetic`, `creditFor`),
// which reads the worlds a card `shows` and, for a scene of a page's own, its `syntheticFrame`.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorldId } from '../../playground/shared/worlds';
import { creditFor, isSynthetic, PAGES, type PageMeta, SITE_NAME, type Slug } from '../pages';

/** Size of a share image, of its frame (at the left) and of its band (at the right). */
export const IMAGE = { width: 1200, height: 630 } as const;
export const FRAME = { width: 840, height: 630 } as const;
export const BAND = { x: 840, width: 360, height: 630 } as const;
/** Least distance between the band's text and every edge of the image, in pixels. */
export const BAND_MARGIN = 32;
/** The title is fitted from the first size down to the second, over at most TITLE_LINES lines. */
export const TITLE_SIZE = { max: 56, min: 32 } as const;
export const TITLE_LINES = 3;
/** The credit: at least this size, over at most CREDIT_LINES lines. */
export const CREDIT_SIZE = 20;
export const CREDIT_LINES = 2;
/** Weight budget of one share image. */
export const IMAGE_BYTES_MAX = 300 * 1024;
/** Least contrast between any band text and what it sits on. */
export const CONTRAST_MIN = 4.5;

/** A color read from one of the work's CSS tokens, as the museum's passe-partouts do. */
export interface TokenRef {
  /** CSS file, relative to the repo root. */
  file: string;
  name: string;
}

/** A self-hosted typeface of the work, as the band draws it. */
export interface Face {
  /** woff2 file, relative to the repo root. */
  file: string;
  weight: number;
  /** `font-variation-settings`, for the axes the work sets (width, casual…). */
  variation?: string;
  /** Letter spacing, in em. */
  tracking?: number;
}

export interface Card {
  slug: Slug;
  /** The real capture the frame is cut from, relative to the repo root (a lossless 8-bit PNG). */
  source: string;
  /** Where the capture's record is: the stills' provenance, or the new captures'. */
  record: string;
  /** Top-left corner of the 840×630 region copied into the frame, in the source's pixels. */
  region: { x: number; y: number };
  /** The 4D.OS worlds the region shows, in any form; the registry's `frameShows` must equal it. */
  shows: readonly WorldId[];
  /** What the region shows, in words: the registry's alt text starts from it. */
  depicts: string;
  /** The page's short name, exactly as the band draws it. */
  title: string;
  display: Face;
  text: Face;
  background: TokenRef;
  ink: TokenRef;
  /** The "synthetic" mark: a label drawn in the work's own label colors. */
  tag: { background: TokenRef; ink: TokenRef };
}

const STILLS_RECORD = 'sites/playground/public/landings/_shared/stills/provenance.json';
export const CAPTURES_DIR = 'src/site/og/captures';
const CAPTURES_RECORD = `${CAPTURES_DIR}/provenance.json`;

const MUSEUM_FONTS = 'src/playground/museum/fonts';
const LAUNCHER_CSS = 'src/4d-os/launcher/launcher.css';
const world = (id: WorldId) => ({ fonts: `src/4d-os/worlds/${id}/fonts`, tokens: `src/4d-os/worlds/${id}/tokens.css` });
const [A, B, C, D, E] = (['a', 'b', 'c', 'd', 'e'] as const).map(world);

export const CARDS: readonly Card[] = [
  {
    slug: 'museum',
    source: `${CAPTURES_DIR}/museum.png`,
    record: CAPTURES_RECORD,
    region: { x: 0, y: 0 },
    shows: [],
    depicts: 'the museum’s first screen at 840×630: the bar with the page clock (REWIND, HOLD, FORWARD) above sheet 004, whose passe-partout holds the recorded loop of Bloomscope, a flower head of seeds at frame 0',
    title: 'A museum of live graphics experiments',
    display: { file: `${MUSEUM_FONTS}/geologica-latin-wght-normal.woff2`, weight: 620, tracking: -0.01 },
    text: { file: `${MUSEUM_FONTS}/fira-mono-latin-500-normal.woff2`, weight: 500 },
    background: { file: 'src/playground/museum/tokens.css', name: '--sheet' },
    ink: { file: 'src/playground/museum/tokens.css', name: '--ink' },
    tag: { background: { file: 'src/playground/museum/tokens.css', name: '--ink' }, ink: { file: 'src/playground/museum/tokens.css', name: '--sheet' } },
  },
  {
    slug: 'bloomscope',
    source: `${CAPTURES_DIR}/bloomscope.png`,
    record: CAPTURES_RECORD,
    region: { x: 0, y: 0 },
    shows: [],
    depicts: 'Bloomscope’s first screen at 840×630: the kaleidoscope, pre-exposed and loaded with sunflowers, inside its brass ring on the chartreuse field',
    title: 'Bloomscope',
    display: { file: 'src/playground/bloomscope/fonts/ultra-latin-400-normal.woff2', weight: 400, tracking: -0.01 },
    text: { file: 'src/playground/bloomscope/fonts/recursive-latin-casl-normal.woff2', weight: 560, variation: "'CASL' 0" },
    background: { file: 'src/playground/bloomscope/tokens.css', name: '--ink' },
    ink: { file: 'src/playground/bloomscope/tokens.css', name: '--chartreuse' },
    tag: { background: { file: 'src/playground/bloomscope/tokens.css', name: '--chartreuse' }, ink: { file: 'src/playground/bloomscope/tokens.css', name: '--ink' } },
  },
  {
    slug: 'game-center',
    source: `${CAPTURES_DIR}/game-center.png`,
    record: CAPTURES_RECORD,
    region: { x: 45, y: 0 },
    shows: [],
    depicts: 'Game Center Yonjigen’s first screen: the arcade cabinet under its PLAYGROUND marquee, its dithered screen showing Rain Run’s demo (a synthetic scene the page computes itself and labels as such, not a 4D.OS world), the controls, and the floor directory at the side',
    title: 'GAME CENTER YONJIGEN',
    display: { file: 'src/playground/game-center/fonts/bungee-latin-400-normal.woff2', weight: 400 },
    text: { file: 'src/playground/game-center/fonts/m-plus-rounded-1c-latin-800-normal.woff2', weight: 800 },
    background: { file: 'src/playground/game-center/tokens.css', name: '--sodium' },
    ink: { file: 'src/playground/game-center/tokens.css', name: '--ink' },
    tag: { background: { file: 'src/playground/game-center/tokens.css', name: '--ink' }, ink: { file: 'src/playground/game-center/tokens.css', name: '--sodium' } },
  },
  {
    slug: 'wind-up-empire',
    source: `${CAPTURES_DIR}/wind-up-empire.png`,
    record: CAPTURES_RECORD,
    region: { x: 0, y: 77 },
    shows: [],
    depicts: 'Wind-Up Empire’s first screen: the WIND-UP EMPIRE title over an orrery of tin tops printed in each 4D.OS world’s inks and labeled with the worlds’ names, around the black-hole Whirl; the tops are toys of the page, not views of the worlds',
    title: 'WIND-UP EMPIRE',
    display: { file: 'src/playground/wind-up-empire/fonts/tilt-warp-latin-full-normal.woff2', weight: 400 },
    text: { file: 'src/playground/wind-up-empire/fonts/sono-latin-wght-normal.woff2', weight: 600 },
    background: { file: 'src/playground/wind-up-empire/tokens.css', name: '--chrome' },
    ink: { file: 'src/playground/wind-up-empire/tokens.css', name: '--ink' },
    tag: { background: { file: 'src/playground/wind-up-empire/tokens.css', name: '--ink' }, ink: { file: 'src/playground/wind-up-empire/tokens.css', name: '--chrome' } },
  },
  {
    slug: '4d-os',
    source: `${CAPTURES_DIR}/4d-os.png`,
    record: CAPTURES_RECORD,
    region: { x: 28, y: 368 },
    shows: ['a', 'b', 'c'],
    depicts: 'the 4D.OS launcher: the windows of worlds A, Vitrine, B, Plate and C, Leader, each drawing the same synthetic black cat climbing a stairway, every moment at once, and below them the heading "Two more plates." of worlds D and E',
    title: 'One engine, five worlds',
    display: { file: `${A.fonts}/host-grotesk-latin-wght.woff2`, weight: 700, tracking: -0.035 },
    text: { file: `${A.fonts}/departure-mono-regular.woff2`, weight: 400 },
    background: { file: LAUNCHER_CSS, name: '--l-paper' },
    ink: { file: LAUNCHER_CSS, name: '--l-ink' },
    tag: { background: { file: LAUNCHER_CSS, name: '--l-ink' }, ink: { file: LAUNCHER_CSS, name: '--l-paper' } },
  },
  {
    slug: '4d-os-a',
    source: 'src/pipeline/captures/a-vitrine.png',
    record: STILLS_RECORD,
    region: { x: 102, y: 0 },
    shows: ['a'],
    depicts: 'world A, Vitrine: inside the red gallery wall, the vitrine of points where the synthetic black cat, in cyan, climbs the stairway, its earlier steps left behind as grey ghost cats, and the source camera drawn as a white frustum',
    title: 'Vitrine',
    display: { file: `${A.fonts}/host-grotesk-latin-wght.woff2`, weight: 700, tracking: -0.04 },
    text: { file: `${A.fonts}/departure-mono-regular.woff2`, weight: 400 },
    background: { file: A.tokens, name: '--wall' },
    ink: { file: A.tokens, name: '--wall-ink' },
    tag: { background: { file: A.tokens, name: '--paper' }, ink: { file: A.tokens, name: '--ink' } },
  },
  {
    slug: '4d-os-b',
    source: 'src/pipeline/captures/b-plate.png',
    record: STILLS_RECORD,
    region: { x: 0, y: 20 },
    shows: ['b'],
    depicts: 'world B, Plate: the heading PLATE 4D-002, CAT, ASCENDING STAIRS. over a dark plate under a green and magenta aurora, where the cat’s whole climb is exposed as a staircase of white cats, the present one in cyan',
    title: 'PLATE',
    display: { file: `${B.fonts}/bricolage-grotesque-latin-wdth.woff2`, weight: 700, variation: "'wdth' 75", tracking: -0.02 },
    text: { file: `${B.fonts}/geist-pixel-latin-400.woff2`, weight: 400 },
    background: { file: B.tokens, name: '--plate' },
    ink: { file: B.tokens, name: '--paper' },
    tag: { background: { file: B.tokens, name: '--tag' }, ink: { file: B.tokens, name: '--tag-ink' } },
  },
  {
    slug: '4d-os-c',
    source: 'src/pipeline/captures/c-leader.png',
    record: STILLS_RECORD,
    region: { x: 295, y: 220 },
    shows: ['c'],
    depicts: 'world C, Leader: the projector gate, where the cat’s night climb runs over-exposed in orange with the present cat in cyan and the source camera drawn as a white frustum, and below it the 16 mm strip, whose frames show the black cat on the stairs',
    title: 'LEADER',
    display: { file: `${C.fonts}/big-shoulders-stencil-latin-wght.woff2`, weight: 800, tracking: 0.02 },
    text: { file: `${C.fonts}/archivo-latin-wdth.woff2`, weight: 500, variation: "'wdth' 92" },
    background: { file: C.tokens, name: '--leader' },
    ink: { file: C.tokens, name: '--paper' },
    tag: { background: { file: C.tokens, name: '--leak' }, ink: { file: C.tokens, name: '--ink' } },
  },
  {
    slug: '4d-os-d',
    source: 'sites/4d-os/public/launcher/d-golden-stoop.png',
    record: STILLS_RECORD,
    region: { x: 0, y: 0 },
    shows: ['d'],
    depicts: 'world D, The golden stoop: its heading The golden stoop. and the page’s own SYNTHETIC tag above the falcon computed from equations, in cyan, flying among its earlier moments in green along a dotted golden path through a city of points',
    title: 'The golden stoop',
    display: { file: `${D.fonts}/tektur-latin-greek-wdth-wght.woff2`, weight: 500, variation: "'wdth' 75", tracking: -0.012 },
    text: { file: `${D.fonts}/jura-latin-greek-wght.woff2`, weight: 600 },
    background: { file: D.tokens, name: '--glass' },
    ink: { file: D.tokens, name: '--beam-hot' },
    tag: { background: { file: D.tokens, name: '--glass' }, ink: { file: D.tokens, name: '--beam' } },
  },
  {
    slug: '4d-os-e',
    source: 'sites/4d-os/public/launcher/e-whale-fall.png',
    record: STILLS_RECORD,
    region: { x: 0, y: 0 },
    shows: ['e'],
    depicts: 'world E, Whale fall: the heading Whale fall. above the black hole, whose lensed disk burns orange and gold around the photon ring while the humpback computed from equations circles inside it, every moment of its fall at once',
    title: 'Whale fall',
    display: { file: `${E.fonts}/science-gothic-latin-wdth-wght.woff2`, weight: 800, variation: "'wdth' 128", tracking: -0.01 },
    text: { file: `${E.fonts}/atkinson-hyperlegible-next-latin-wght.woff2`, weight: 500 },
    background: { file: E.tokens, name: '--void' },
    ink: { file: E.tokens, name: '--bone' },
    tag: { background: { file: E.tokens, name: '--bone' }, ink: { file: E.tokens, name: '--void' } },
  },
];

export function cardFor(slug: Slug): Card {
  const card = CARDS.find((c) => c.slug === slug);
  if (!card) throw new Error(`no share-image card for ${slug}`);
  return card;
}

export function pageFor(slug: Slug): PageMeta {
  const page = PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`no registry entry for ${slug}`);
  return page;
}

/** The band's strings, top to bottom. The mark and the credit come from the registry, never from the card. */
export interface BandText {
  /** "4D.OS" on the 4D.OS pages. */
  series: string | null;
  site: string;
  title: string;
  synthetic: string | null;
  credit: string | null;
}

export function bandText(card: Card): BandText {
  const page = pageFor(card.slug);
  return {
    series: page.site === '4d-os' ? '4D.OS' : null,
    site: SITE_NAME,
    title: card.title,
    synthetic: isSynthetic(page) ? 'synthetic' : null,
    credit: creditFor(page)?.text ?? null,
  };
}

/** Which face draws each string: the title in the display face, everything else in the text face. */
export function bandRuns(card: Card): { face: Face; text: string }[] {
  const text = bandText(card);
  return [
    { face: card.text, text: text.series ?? '' },
    { face: card.text, text: text.site },
    { face: card.display, text: text.title },
    { face: card.text, text: text.synthetic ?? '' },
    { face: card.text, text: text.credit ?? '' },
  ].filter((run) => run.text !== '');
}

// ── Tokens and contrast ───────────────────────────────────────────────────────────────────────────

/**
 * The value of an opaque `--name: #hex` declaration in a CSS file, as lowercase `#rrggbb`. A name
 * declared twice with different values, or with an alpha other than opaque, fails and says so.
 */
export function readToken(ref: TokenRef, repo: string): string {
  const css = readFileSync(resolve(repo, ref.file), 'utf8');
  const escaped = ref.name.replace(/[-]/g, '\\-');
  const values = [...css.matchAll(new RegExp(`(?:^|[\\s;{])${escaped}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*[;}]`, 'g'))].map((m) => normalizeHex(m[1]));
  if (!values.length) throw new Error(`${ref.file} has no ${ref.name}: #hex declaration`);
  if (new Set(values).size > 1) throw new Error(`${ref.file} declares ${ref.name} with different values (${[...new Set(values)].join(', ')})`);
  if (values[0].length === 9) {
    if (!values[0].endsWith('ff')) throw new Error(`${ref.file} ${ref.name} is translucent (${values[0]}); a band color must be opaque`);
    return values[0].slice(0, 7);
  }
  return values[0];
}

function normalizeHex(hex: string): string {
  const h = hex.slice(1).toLowerCase();
  if (h.length === 3 || h.length === 4) return `#${[...h].map((c) => c + c).join('')}`;
  if (h.length === 6 || h.length === 8) return `#${h}`;
  throw new Error(`not a CSS hex color: ${hex}`);
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG 2 contrast ratio of two opaque `#rrggbb` colors. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The band's colors, resolved: its ground and ink, and the mark's. */
export function bandColors(card: Card, repo: string): { background: string; ink: string; tagBackground: string; tagInk: string } {
  return {
    background: readToken(card.background, repo),
    ink: readToken(card.ink, repo),
    tagBackground: readToken(card.tag.background, repo),
    tagInk: readToken(card.tag.ink, repo),
  };
}
