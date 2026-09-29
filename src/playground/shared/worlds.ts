// Shared index of the playground landings: the five 4D.OS worlds, the launcher and three unnamed lab
// slots. Each landing draws it in its own language, but the data (routes, stills, lines and credits)
// is this, and is not written by hand anywhere else.

export type WorldId = 'a' | 'b' | 'c' | 'd' | 'e';

export interface Credit {
  /** Visible text of the credit, exactly as LICENSES.md requires it. */
  text: string;
  /** Page of the original work. */
  source: string;
  /** License text. */
  license: string;
}

export interface World {
  id: WorldId;
  /** The world's letter, in uppercase. */
  letter: string;
  name: string;
  route: string;
  /** Still of the live render (lossless WebP, 1200×900). */
  still: string;
  stillWidth: number;
  stillHeight: number;
  /** Alt text of the still. */
  alt: string;
  /** One honest line about the world. */
  line: string;
  /** Every 4D.OS scene is synthetic and is labeled as such. */
  synthetic: true;
  /** Required visible credit when the scene uses third-party material. */
  credit: Credit | null;
}

/** Credit for the cat of A, B and C (LICENSES.md, the required-attribution paragraph). */
export const CAT_CREDIT: Credit = {
  text: '"Cat" by J-Toastie, CC-BY 3.0',
  source: 'https://poly.pizza/m/8GJbfM8R1A',
  license: 'https://creativecommons.org/licenses/by/3.0/',
};

const STILLS = '/landings/_shared/stills';

export const WORLDS: readonly World[] = [
  {
    id: 'a',
    letter: 'A',
    name: 'Vitrine',
    route: '/4d-os/a/',
    still: `${STILLS}/a.webp`,
    stillWidth: 1200,
    stillHeight: 900,
    alt: 'World A, Vitrine: a black cat climbing stairs, drawn in points inside a red gallery room; its earlier steps stay behind it as a row of ghost cats.',
    line: 'A red gallery room. A black cat climbs a stairway, and every step it takes stays as points.',
    synthetic: true,
    credit: CAT_CREDIT,
  },
  {
    id: 'b',
    letter: 'B',
    name: 'Plate',
    route: '/4d-os/b/',
    still: `${STILLS}/b.webp`,
    stillWidth: 1200,
    stillHeight: 900,
    alt: 'World B, Plate: a staircase of white cats exposed onto one dark plate under a green and magenta aurora, the present cat in cyan at the top.',
    line: "A chronophotographic plate under an aurora sky. The cat's whole climb, exposed at once.",
    synthetic: true,
    credit: CAT_CREDIT,
  },
  {
    id: 'c',
    letter: 'C',
    name: 'Leader',
    route: '/4d-os/c/',
    still: `${STILLS}/c.webp`,
    stillWidth: 1200,
    stillHeight: 900,
    alt: 'World C, Leader: a projector gate framed by film perforations, the cat’s climb over-exposed in orange with a strip of 16 mm frames below.',
    line: 'A 16 mm film leader. Scrub the strip and the night scene runs through it.',
    synthetic: true,
    credit: CAT_CREDIT,
  },
  {
    id: 'd',
    letter: 'D',
    name: 'The golden stoop',
    route: '/4d-os/d/',
    still: `${STILLS}/d.webp`,
    stillWidth: 1200,
    stillHeight: 900,
    alt: 'World D, The golden stoop: a peregrine falcon computed from equations flies along a golden spiral through a city of points; its earlier moments trail behind it in phosphor green.',
    line: 'A peregrine falcon computed from equations, stooping along a golden spiral.',
    synthetic: true,
    credit: null,
  },
  {
    id: 'e',
    letter: 'E',
    name: 'Whale fall',
    route: '/4d-os/e/',
    still: `${STILLS}/e.webp`,
    stillWidth: 1200,
    stillHeight: 900,
    alt: 'World E, Whale fall: a humpback whale computed from equations spirals into a black hole whose lensed disk is traced live.',
    line: 'A whale spirals into a black hole. Two clocks disagree about how long it takes.',
    synthetic: true,
    credit: null,
  },
];

export const LAUNCHER = {
  name: '4D.OS',
  route: '/4d-os/',
  line: 'Five worlds, one launcher. Every moment of a scene, all at once.',
} as const;

/**
 * Exactly three lab slots: no name, no link and no date. They only say what kind of experiment will
 * come.
 */
export const LAB_SLOTS: readonly { slot: number; kind: string }[] = [
  { slot: 1, kind: 'algorithmic art' },
  { slot: 2, kind: 'a physics sketch' },
  { slot: 3, kind: 'a retro-futuristic app' },
];

/**
 * Footer line of a published landing that is not yet a work of the museum; "Playground" links to `/`
 * (playground-hub, "Demo honesty").
 */
export const NOT_IN_COLLECTION_LINE = 'Not in the collection yet · Playground';
export const BUILD_STAMP = 'demo build 0.1';

// ── Index checker ───────────────────────────────────────────────────────────────────────────────
// Each landing draws the index its own way, but its static HTML has to say the same as this data.
// `checkIndexHtml` checks it without a browser (each landing's test runs it).
//
// What it requires:
// - a real link (`<a href>`) to each world's route and another to the launcher (`/4d-os/`);
// - next to each world, in its card: the name, the honest line, the "synthetic scene" label, the
//   shared still (`<img src>` with `alt`) and, on A, B and C, the cat's credit as text. A link's
//   card is the largest element that contains it without linking to another world; it is enough
//   for one of each world's cards to have everything;
// - exactly three lab slots marked with `data-lab-slot`, with no links (neither inside nor around
//   them) and no dates.

interface HtmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: (HtmlNode | string)[];
  parent: HtmlNode | null;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TAGS = new Set(['script', 'style']);
/** Tags whose end tag is optional: a new one from the same group closes the open one. */
const IMPLIED_END: Record<string, string[]> = { li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'], tr: ['tr'], td: ['td', 'th'], th: ['td', 'th'], option: ['option'] };
const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…', middot: '·', times: '×', deg: '°', copy: '©',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

/** Minimal tree of the static HTML: tags, attributes and text (no scripts, styles or comments). */
function parseHtml(html: string): HtmlNode {
  const root: HtmlNode = { tag: '#root', attrs: {}, children: [], parent: null };
  let current = root;
  const source = html.replace(/<!--[\s\S]*?-->/g, '');
  const tagPattern = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
  let last = 0;
  for (let match = tagPattern.exec(source); match; match = tagPattern.exec(source)) {
    if (match.index > last) current.children.push(decodeEntities(source.slice(last, match.index)));
    last = tagPattern.lastIndex;
    const [, closing, rawTag, rawAttrs, selfClosing] = match;
    const tag = rawTag.toLowerCase();
    if (closing) {
      let open: HtmlNode | null = current;
      while (open && open.tag !== tag) open = open.parent;
      if (open?.parent) current = open.parent;
      continue;
    }
    const implied = IMPLIED_END[tag];
    if (implied) {
      let open: HtmlNode | null = current;
      while (open && open.parent && !implied.includes(open.tag) && !['ul', 'ol', 'dl', 'table', 'tbody', 'thead', 'select'].includes(open.tag)) open = open.parent;
      if (open && implied.includes(open.tag) && open.parent) current = open.parent;
    }
    const attrs: Record<string, string> = {};
    for (const attr of rawAttrs.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      attrs[attr[1].toLowerCase()] = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '');
    }
    const node: HtmlNode = { tag, attrs, children: [], parent: current };
    current.children.push(node);
    if (RAW_TAGS.has(tag)) {
      const end = source.toLowerCase().indexOf(`</${tag}`, last);
      const close = end < 0 ? source.length : source.indexOf('>', end) + 1 || source.length;
      last = tagPattern.lastIndex = close;
    } else if (!VOID_TAGS.has(tag) && !selfClosing) {
      current = node;
    }
  }
  if (last < source.length) current.children.push(decodeEntities(source.slice(last)));
  return root;
}

function elements(node: HtmlNode): HtmlNode[] {
  const out: HtmlNode[] = [];
  const walk = (n: HtmlNode) => {
    for (const child of n.children) {
      if (typeof child === 'string') continue;
      out.push(child);
      walk(child);
    }
  };
  walk(node);
  return out;
}

/** Visible text of the element, with whitespace collapsed (`<br>` counts as a space). */
function textOf(node: HtmlNode): string {
  const parts: string[] = [];
  const walk = (n: HtmlNode) => {
    for (const child of n.children) {
      if (typeof child === 'string') parts.push(child);
      else if (child.tag === 'br') parts.push(' ');
      else if (!RAW_TAGS.has(child.tag)) walk(child);
    }
  };
  walk(node);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

/** Text of `node` without the subtrees that `skip` discards, with whitespace collapsed. */
function textWithout(node: HtmlNode, skip: (el: HtmlNode) => boolean): string {
  const parts: string[] = [];
  const walk = (n: HtmlNode) => {
    for (const child of n.children) {
      if (typeof child === 'string') parts.push(child);
      else if (child.tag === 'br') parts.push(' ');
      else if (!RAW_TAGS.has(child.tag) && !skip(child)) walk(child);
    }
  };
  walk(node);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

/** The first thing visible inside the element, in document order: an `<svg>` or text. */
function firstMark(node: HtmlNode): 'svg' | 'text' | null {
  for (const child of node.children) {
    if (typeof child === 'string') {
      if (child.trim()) return 'text';
    } else if (child.tag === 'svg') return 'svg';
    else if (!RAW_TAGS.has(child.tag)) {
      const inner = firstMark(child);
      if (inner) return inner;
    }
  }
  return null;
}

export interface BackLink {
  href: string;
  /** Visible text of the link, without the arrow. */
  text: string;
  /** The ← arrow that precedes it: the character, if the link's typeface includes it, or an `<svg>` icon. */
  arrow: 'char' | 'icon';
}

/**
 * Checks a way back to the museum in the static HTML (playground-museum, "Way back from each work";
 * playground-hub, "Demo honesty"): a native `<a href>` with the expected visible text, preceded by
 * the arrow as a character or as a vector icon, and with an accessible name that contains that text.
 * Returns the list of problems (empty if it passes).
 */
export function checkBackLink(html: string, expected: BackLink): string[] {
  const label = `Way back "${expected.text}" to ${expected.href}`;
  const isSvg = (el: HtmlNode) => el.tag === 'svg';
  const visible = (a: HtmlNode) => textWithout(a, isSvg);
  const links = elements(parseHtml(html)).filter(
    (el) => el.tag === 'a' && el.attrs.href === expected.href && visible(el).replace(/^←\s*/, '') === expected.text,
  );
  if (links.length === 0) return [`${label}: missing an <a href="${expected.href}"> with the visible text "${expected.text}"`];

  const problems: string[] = [];
  for (const a of links) {
    const text = visible(a);
    if (expected.arrow === 'icon') {
      if (text.includes('←')) problems.push(`${label}: the link's typeface has no ←, so the visible text cannot contain it`);
      if (firstMark(a) !== 'svg') problems.push(`${label}: missing the arrow's <svg> icon before the text`);
    } else {
      if (!text.startsWith('←')) problems.push(`${label}: missing the ← character before the text`);
      if (elements(a).some(isSvg)) problems.push(`${label}: the link's typeface has ←, so the arrow is the character and not an icon`);
    }
    const name = a.attrs['aria-label'] ?? textWithout(a, (el) => isSvg(el) || el.attrs['aria-hidden'] === 'true');
    if (!name.includes(expected.text)) problems.push(`${label}: the accessible name "${name}" does not contain the visible text`);
  }
  return problems;
}

/** Curly quotes and apostrophes to straight ones: typography in a line is not drift. */
function plainQuotes(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

const DATE_PATTERN = /\b(?:19|20)\d{2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,4}\b/i;

/**
 * Compares a landing's static HTML with the shared index. Returns the list of problems (empty if the
 * index meets the contract of D10).
 */
export function checkIndexHtml(html: string): string[] {
  const root = parseHtml(html);
  const all = elements(root);
  const links = all.filter((el) => el.tag === 'a' && 'href' in el.attrs);
  const worldRoutes = new Set(WORLDS.map((w) => w.route));
  const problems: string[] = [];

  const hasWorldLink = (node: HtmlNode, except: string) =>
    elements(node).some((el) => el.tag === 'a' && worldRoutes.has(el.attrs.href) && el.attrs.href !== except);

  for (const world of WORLDS) {
    const label = `${world.letter} · ${world.name}`;
    const own = links.filter((a) => a.attrs.href === world.route);
    if (own.length === 0) {
      problems.push(`${label}: missing a link <a href="${world.route}">`);
      continue;
    }
    // Each link's card: the largest ancestor that does not link to another world.
    const cards = own.map((a) => {
      let card = a;
      while (card.parent && card.parent.tag !== '#root' && !hasWorldLink(card.parent, world.route)) card = card.parent;
      return card;
    });
    const texts = cards.map((card) => textOf(card));
    const some = (test: (text: string, card: HtmlNode) => boolean) => cards.some((card, i) => test(texts[i], card));
    if (!some((text) => text.toLowerCase().includes(world.name.toLowerCase()))) problems.push(`${label}: missing the name "${world.name}" next to its link`);
    if (!some((text) => plainQuotes(text).includes(world.line))) problems.push(`${label}: missing the line "${world.line}" next to its link`);
    if (!some((text) => text.toLowerCase().includes('synthetic scene'))) problems.push(`${label}: missing the "synthetic scene" label next to its link`);
    const stillOk = some((_, card) =>
      [card, ...elements(card)].some((el) => el.tag === 'img' && el.attrs.src === world.still && (el.attrs.alt ?? '').trim() !== ''),
    );
    if (!stillOk) problems.push(`${label}: missing the still <img src="${world.still}"> with alt text next to its link`);
    if (world.credit && !some((text) => text.includes(world.credit!.text))) {
      problems.push(`${label}: missing the credit "${world.credit.text}" next to its image`);
    }
  }

  if (!links.some((a) => a.attrs.href === LAUNCHER.route)) problems.push(`Launcher: missing a link <a href="${LAUNCHER.route}">`);

  const slots = all.filter((el) => 'data-lab-slot' in el.attrs);
  if (slots.length !== LAB_SLOTS.length) {
    problems.push(`Lab: there are ${slots.length} slots with data-lab-slot and there must be exactly ${LAB_SLOTS.length}`);
  }
  slots.forEach((slot, i) => {
    const inside = [slot, ...elements(slot)];
    let linked = inside.some((el) => el.tag === 'a' || 'href' in el.attrs);
    for (let up = slot.parent; up && !linked; up = up.parent) linked = up.tag === 'a';
    if (linked) problems.push(`Lab ${i + 1}: a lab slot can neither be nor contain a link`);
    if (inside.some((el) => el.tag === 'time') || DATE_PATTERN.test(textOf(slot))) {
      problems.push(`Lab ${i + 1}: a lab slot cannot show a date`);
    }
  });

  return problems;
}
