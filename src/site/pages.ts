// Page registry of playground.crewtives.com (spec site-metadata; add-seo-and-sharing D1): the only
// hand-written metadata of the 10 public pages. The build plugin (`build/plugin.ts`) injects it into
// every built head, the sitemap and robots.txt are generated from it, and the share-image tool reads
// it for the band. Whether a frame is synthetic and whose credit it needs are never decided here:
// they come from `WORLDS`, through the worlds each share image's frame shows (`frameShows`).

import { CAT_CREDIT, type Credit, WORLDS, type WorldId } from '../playground/shared/worlds.ts';

/** The canonical origin. A fork published elsewhere changes this constant and nothing else. */
export const SITE_ORIGIN = 'https://playground.crewtives.com';
export const SITE_NAME = 'crewtives playground';
export const CREATOR = { name: 'crewtives', url: 'https://crewtives.com' } as const;
/**
 * Name and author of the cat's upstream model, for the JSON-LD `isBasedOn` (D3). `CAT_CREDIT` holds
 * only the credit line, its source and its license, and `worlds.ts` cannot change here, so the two
 * fields live in this layer; `pages.test.ts` requires `CAT_CREDIT.text` to be built from them.
 */
export const CAT_MODEL = { name: 'Cat', creator: 'J-Toastie' } as const;

export type Slug =
  | 'museum'
  | 'bloomscope'
  | 'game-center'
  | 'wind-up-empire'
  | '4d-os'
  | '4d-os-a'
  | '4d-os-b'
  | '4d-os-c'
  | '4d-os-d'
  | '4d-os-e';

/** Which build produces the page; it decides the icons. */
export type Site = 'playground' | '4d-os';

export interface PageMeta {
  slug: Slug;
  site: Site;
  /** Public route, with the trailing slash the site serves. */
  route: string;
  /** `SITE_ORIGIN + route`. */
  canonical: string;
  /** `og:title` and `twitter:title`: 10 to 70 characters. It may say more than the tab title. */
  title: string;
  /** Equal to the page's own `<meta name="description">` after whitespace is collapsed: 50 to 200 characters. */
  description: string;
  /** Share image, served from `sites/playground/public/og/`. The build appends `?v=<version>` (D2). */
  image: { path: `/og/${Slug}.png`; width: 1200; height: 630; alt: string };
  jsonLd: 'WebSite' | 'CreativeWork';
  /** The 4D.OS worlds visible in the share image's frame (D5). */
  frameShows: readonly WorldId[];
}

/** The site's 404 page: noindex, no canonical link, no share image and no structured data. */
export interface NotFoundMeta {
  file: '404.html';
  title: string;
}

/** Icons of each site (D4): the SVG that replaces the `data:,` placeholders, and the apple-touch-icon. */
export const ICONS: Record<Site, { svg: string; appleTouch: string }> = {
  playground: { svg: '/icon.svg', appleTouch: '/apple-touch-icon.png' },
  '4d-os': { svg: '/4d-os/icon.svg', appleTouch: '/4d-os/apple-touch-icon.png' },
};
/** Declared on `/` only, so that crawlers find a raster icon on the home page (D4). */
export const FAVICON = { href: '/favicon.ico', sizes: '16x16 32x32 48x48' } as const;

function page(meta: Omit<PageMeta, 'canonical' | 'image'> & { alt: string }): PageMeta {
  const { alt, ...rest } = meta;
  return {
    ...rest,
    canonical: SITE_ORIGIN + meta.route,
    image: { path: `/og/${meta.slug}.png`, width: 1200, height: 630, alt },
  };
}

const CREDIT = CAT_CREDIT.text;

/** The 10 public pages, in sitemap order. */
export const PAGES: readonly PageMeta[] = [
  page({
    slug: 'museum',
    site: 'playground',
    route: '/',
    title: 'crewtives playground: a museum of live graphics experiments',
    description:
      'A museum of live graphics experiments by crewtives: each work on its own sheet, moving in a loop recorded from its live render, with all of its moments drawn at once in plan and elevation.',
    alt: 'The museum’s first screen, captured from the live page: the bar with the page clock (REWIND, HOLD, FORWARD) above sheet 004, whose passe-partout holds the recorded loop of Bloomscope, a flower head of seeds at frame 0. Beside it, a band reads “crewtives playground” and “A museum of live graphics experiments”.',
    jsonLd: 'WebSite',
    frameShows: [],
  }),
  page({
    slug: 'bloomscope',
    site: 'playground',
    route: '/bloomscope/',
    title: 'Bloomscope: a kaleidoscope of flowers grown from equations',
    description:
      'A kaleidoscope loaded with flowers, succulents and honeycomb grown from equations in your browser, three growing toys, and the five worlds of 4D.OS.',
    alt: 'Bloomscope’s first screen, captured from its live render: the kaleidoscope, pre-exposed and loaded with sunflowers, inside its brass ring on the chartreuse field. Beside it, a band reads “crewtives playground” and “Bloomscope”.',
    jsonLd: 'CreativeWork',
    frameShows: [],
  }),
  page({
    slug: 'game-center',
    site: 'playground',
    route: '/landings/game-center/',
    title: 'Game Center Yonjigen: the playground as a Tokyo arcade building',
    description:
      'Game Center Yonjigen: the crewtives playground as a Tokyo arcade building. Fly Rain Run in a live dithered cabinet, then ride up to five 4D.OS worlds. A free demo that runs in your browser.',
    alt: 'Game Center Yonjigen’s first screen, captured from its live render: the arcade cabinet under its PLAYGROUND marquee, its dithered screen showing Rain Run’s demo, the controls, and the floor directory at the side. Beside it, a band reads “crewtives playground” and “GAME CENTER YONJIGEN”.',
    jsonLd: 'CreativeWork',
    frameShows: [],
  }),
  page({
    slug: 'wind-up-empire',
    site: 'playground',
    route: '/landings/wind-up-empire/',
    title: 'Wind-Up Empire: a demo space empire printed on tin',
    description:
      'A demo space empire printed on tin. Pull back a friction rocket, wind the key, flick the planets, then open the five real 4D.OS worlds in the tray. The economy is fake and resets on reload.',
    alt: 'Wind-Up Empire’s first screen, captured from its live page: the WIND-UP EMPIRE title over an orrery of tin tops printed in each 4D.OS world’s inks and labeled with the worlds’ names, around the black-hole Whirl; the tops are toys of the page, not views of the worlds. Beside it, a band reads “crewtives playground” and “WIND-UP EMPIRE”.',
    jsonLd: 'CreativeWork',
    frameShows: [],
  }),
  page({
    slug: '4d-os',
    site: '4d-os',
    route: '/4d-os/',
    title: '4D.OS: one engine, five worlds, every moment of a scene at once',
    description:
      '4D.OS: live 4D scenes with every moment drawn at once, in five worlds: a synthetic cat on a stairway in three, and two subjects built from equations.',
    alt: `The 4D.OS launcher, captured from its live render: its heading “One scene. Three worlds.” above the windows of worlds A, Vitrine, B, Plate and C, Leader, each drawing the same synthetic black cat climbing a stairway, every moment at once. Beside it, a band reads “4D.OS”, “crewtives playground” and “One engine, five worlds”, with the mark “synthetic” and the credit ${CREDIT}.`,
    jsonLd: 'CreativeWork',
    frameShows: ['a', 'b', 'c'],
  }),
  page({
    slug: '4d-os-a',
    site: '4d-os',
    route: '/4d-os/a/',
    title: 'Vitrine · 4D.OS: a synthetic cat climbing stairs in a red gallery',
    description:
      'A live 4D reconstruction hung like a museum piece: every moment of a synthetic black cat climbing a flight of stairs in an alley at night, on display at once.',
    alt: `World A, Vitrine, captured from its live render: inside the red gallery wall, the vitrine of points where the synthetic black cat, in cyan, climbs the stairway, its earlier steps left behind as grey ghost cats, and the source camera drawn as a white frustum. Beside it, a band reads “4D.OS”, “crewtives playground” and “Vitrine”, with the mark “synthetic” and the credit ${CREDIT}.`,
    jsonLd: 'CreativeWork',
    frameShows: ['a'],
  }),
  page({
    slug: '4d-os-b',
    site: '4d-os',
    route: '/4d-os/b/',
    title: "Plate · 4D.OS: a cat's whole climb exposed on one plate",
    description:
      'Every moment of a moving subject exposed onto one plate: a live 4D reconstruction on a chronophotographic desktop.',
    alt: `World B, Plate, captured from its live render: the heading PLATE 4D-002, CAT, ASCENDING STAIRS. over a dark plate under a green and magenta aurora, where the cat’s whole climb is exposed as a staircase of white cats, the present one in cyan. Beside it, a band reads “4D.OS”, “crewtives playground” and “PLATE”, with the mark “synthetic” and the credit ${CREDIT}.`,
    jsonLd: 'CreativeWork',
    frameShows: ['b'],
  }),
  page({
    slug: '4d-os-c',
    site: '4d-os',
    route: '/4d-os/c/',
    title: "Leader · 4D.OS: a cat's climb threaded through a film gate",
    description:
      'A 4D reconstruction threaded like a strip of 16mm film: grab the strip, pull time through the gate.',
    alt: `World C, Leader, captured from its live render: the projector gate between film perforations, where the cat’s night climb runs over-exposed in orange with the present cat in cyan, the source camera drawn as a white frustum, and the edge of the film strip below. Beside it, a band reads “4D.OS”, “crewtives playground” and “LEADER”, with the mark “synthetic” and the credit ${CREDIT}.`,
    jsonLd: 'CreativeWork',
    frameShows: ['c'],
  }),
  page({
    slug: '4d-os-d',
    site: '4d-os',
    route: '/4d-os/d/',
    title: 'The golden stoop · 4D.OS: a falcon diving on a golden spiral',
    description:
      'A peregrine falcon computed from equations dives along a golden spiral through a city of points: every moment of the flight at once, live, with the mathematics read from the same code that made it.',
    alt: 'World D, The golden stoop, captured from its live render: the falcon computed from equations, in cyan, ahead of its earlier moments in phosphor green along a dotted golden path, beside the plotter of the golden spiral, its equation r(θ) = r₀·φ^(−2θ/π) and the ratio 1.6180 = φ read live. Beside it, a band reads “4D.OS”, “crewtives playground” and “The golden stoop”, with the mark “synthetic”.',
    jsonLd: 'CreativeWork',
    frameShows: ['d'],
  }),
  page({
    slug: '4d-os-e',
    site: '4d-os',
    route: '/4d-os/e/',
    title: 'Whale fall · 4D.OS: a whale spiraling into a black hole',
    description:
      'A humpback whale spirals into a black hole, every moment of the fall kept at once, while two clocks drift apart: a live 4D scene with the gravitational lens traced in your browser.',
    alt: 'World E, Whale fall, captured from its live render: the heading Whale fall. above the black hole, whose lensed disk burns orange and gold around the photon ring while the humpback computed from equations circles inside it, every moment of its fall at once. Beside it, a band reads “4D.OS”, “crewtives playground” and “Whale fall”, with the mark “synthetic”.',
    jsonLd: 'CreativeWork',
    frameShows: ['e'],
  }),
];

export const NOT_FOUND: NotFoundMeta = { file: '404.html', title: `Not found · ${SITE_NAME}` };

export function pageForRoute(route: string): PageMeta | undefined {
  return PAGES.find((p) => p.route === route);
}

const shown = (page: PageMeta) => WORLDS.filter((w) => page.frameShows.includes(w.id));

/** True when the share image's frame shows a synthetic scene (`WORLDS[].synthetic`). */
export function isSynthetic(page: PageMeta): boolean {
  return shown(page).some((w) => w.synthetic);
}

/** The credit the share image must carry: the cat's when its frame shows world A, B or C. */
export function creditFor(page: PageMeta): Credit | null {
  return shown(page).find((w) => w.credit)?.credit ?? null;
}
