// Static HTML of the museum (D1): the page arrives complete as a document, with each sheet (VISTA with
// its poster, SVG épure, title block, wall text and "Enter <title>"), the sheet index, sheet 000 and
// the colophon. JavaScript then adds the clock, the loops, jump by number, the light and the fold on
// top. Pure functions: the playground plugin and the tests use them.

import { BUILD_STAMP, CAT_CREDIT, LAUNCHER, WORLDS } from '../../shared/worlds';
import {
  COLLECTION_TITLE,
  featuredSheet,
  FIXED_GARDEN_LINK,
  FORM_NAME,
  type Form,
  GATE_ROW,
  METHOD_SHEET,
  SHEETS,
  WORKSHOP_SHEETS,
  WORKSHOP_TEXT,
} from '../collection';
import { LOOP_FILES, loopUrl, passesFor, type LoopId, type LoopProvenance } from '../loops/provenance';
import { GLOSSARY, REFERENCES } from '../references';
import { epureSvg, frontalAngle, type NowPoint } from './epure';
import { esc } from './esc';
import type { LoopEntry, Manifest, SheetManifest } from './manifest';
import { axonometrySvg, columnGeom3, tesseractGeom3, trailGeom3 } from './axonometry';
import { columnPlanSvg, columnSvg, tesseractSvg } from './method';

/** Data the museum's JavaScript needs (the `virtual:museum` virtual module). */
export interface RuntimeView {
  loop: LoopId;
  /** Native size of the loop, or null if it has not been recorded yet. */
  native: [number, number] | null;
  passes: Partial<Record<'forward' | 'rewind', string>>;
  frames: number;
}

export interface RuntimeSheet {
  number: string;
  title: string;
  views: RuntimeView[];
  /** NOW per clock position: elevation and plan, in units of the épure's viewBox. */
  nows: NowPoint[];
  /** Trail moment the NOW marks at each clock position (the fold uses it). */
  nowMoments: number[];
}

export interface RuntimeData {
  sheets: RuntimeSheet[];
}

export interface Page {
  body: string;
  /** Generated CSS: integer scale of each VISTA according to its native size. */
  css: string;
  runtime: RuntimeData;
  /** Files the plugin publishes: path without a leading slash → content. */
  files: Record<string, string>;
}

/** Sheet columns in modules (D3): VISTA, gutter and épure. The CSS uses the same figures. */
export const COLUMNS = { vista: 26, gutter: 2, epure: 16 } as const;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** Label of the column ratio: "13 : 8". */
export const RATIO_LABEL = `${COLUMNS.vista / gcd(COLUMNS.vista, COLUMNS.epure)} : ${COLUMNS.epure / gcd(COLUMNS.vista, COLUMNS.epure)}`;
/** Columns of sheet 000 in modules: column, gutter and tesseract. The CSS uses the same figures. */
export const METHOD_COLUMNS = { column: 20, gutter: 2, tesseract: 20 } as const;
/** Label of the 000 ratio for the full grid: "1 : 1". */
export const METHOD_RATIO_LABEL = `${METHOD_COLUMNS.column / gcd(METHOD_COLUMNS.column, METHOD_COLUMNS.tesseract)} : ${METHOD_COLUMNS.tesseract / gcd(METHOD_COLUMNS.column, METHOD_COLUMNS.tesseract)}`;

export const axonometryPath = (name: string) => `museum/fold-${name}.svg`;

/**
 * Every visible figure goes through here, marked with its declared source (D15). The figure check
 * (figures.ts) recomputes each one from its source and reports any stray figure.
 */
export const fig = (source: string, html: string) => `<span data-fig="${source}">${html}</span>`;

/** Drawn arrow (neither of the museum's fonts has ← or →). */
export function arrow(direction: 'left' | 'right' | 'down', cls = 'arrow'): string {
  const d = { left: 'M13 4 7 10l6 6M7 10h10', right: 'M7 4l6 6-6 6M13 10H3', down: 'M4 7l6 6 6-6M10 13V3' }[direction];
  return `<svg class="${cls}" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

/** Drawn form mark (○ scene, □ toy, △ workshop), with the épure's 1 px ink stroke. */
export function formMark(form: Form): string {
  const shape = {
    scene: '<circle cx="10" cy="10" r="7"',
    toy: '<rect x="4" y="4" width="12" height="12"',
    workshop: '<path d="M10 3.5 17.5 16.5h-15z"',
  }[form];
  return `<svg class="form-mark" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">${shape} vector-effect="non-scaling-stroke"/></svg>`;
}

/**
 * Chevron of "Sheet data": the head of arrow('right'), with the same stroke (class `arrow`); it turns
 * 90° when the disclosure is open.
 */
const chevron = () => `<svg class="arrow chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7 4l6 6-6 6"/></svg>`;

/** Drawn square root, with its reading for assistive technologies. */
export function mathText(text: string): string {
  return esc(text).replace(
    /√/g,
    '<svg class="glyph" viewBox="0 0 12 16" width="12" height="16" aria-hidden="true" focusable="false"><path d="M1 9l3-1 3 7 4-14h1"/></svg><span class="sr-only">square root of</span>',
  );
}

const worldOf = (loop: LoopId) => WORLDS.find((w) => w.id === loop);

function viewName(sheet: SheetManifest, entry: LoopEntry): string {
  return entry.view.label ? `${sheet.sheet.title}, ${entry.view.label}` : sheet.sheet.title;
}

/** Synthetic-scene label for the VISTA's accessible text (playground-hub, "Demo honesty"). */
const syntheticNote = (sheet: SheetManifest) => (sheet.pack?.synthetic ? ' A synthetic scene.' : '');

function viewDescription(sheet: SheetManifest, entry: LoopEntry): string {
  return `${entry.view.description} A loop recorded from the live render.${syntheticNote(sheet)}`;
}

function posterAlt(sheet: SheetManifest, entry: LoopEntry): string {
  return `${viewName(sheet, entry)}, first frame of the loop: ${entry.view.description}${syntheticNote(sheet)}`;
}

/** Public code repository: the provenance line links each recording's commit there. */
export const REPO_URL = 'https://github.com/crewtives/crewtives-playground';
export const commitUrl = (commit: string) => `${REPO_URL}/commit/${commit}`;

/** Provenance line of a loop, split before the abbreviated commit, which is linked separately. */
function provenanceParts(p: LoopProvenance): { text: string; commit: string } {
  const forward = p.passes.find((pass) => pass.direction === 'forward')!;
  const parts = [
    `Loop ${p.native.width} × ${p.native.height} px`,
    `${p.palette.length} colors`,
    `${forward.frames} frames at ${forward.fps} fps`,
    `loops every ${(forward.frames / forward.fps).toFixed(1)} s`,
  ];
  if (forward.source.kind === 'pack') {
    const frames = forward.source.frames;
    parts.push(`source frames ${frames[0]}–${frames[frames.length - 1]}`);
  }
  parts.push(p.passes.length === 2 ? 'forward and rewind' : 'forward only');
  parts.push(`recorded ${p.recorded} from the live render at commit `);
  return { text: parts.join(' · '), commit: p.commit.slice(0, 7) };
}

/** Provenance line of a loop (work-loops, "Provenance summary in the title block"). */
export function provenanceLine(p: LoopProvenance): string {
  const { text, commit } = provenanceParts(p);
  return text + commit;
}

function vista(sheet: SheetManifest, entry: LoopEntry, featured: boolean): string {
  const p = entry.provenance;
  const label = entry.view.label
    ? `<figcaption class="vista__label">${entry.view.href ? `<a href="${entry.view.href}">${esc(entry.view.label)}</a>` : esc(entry.view.label)}</figcaption>`
    : '';
  const descId = `vista-${entry.id}-desc`;
  const inner = p
    ? `<img class="vista__poster" src="${loopUrl(entry.id, LOOP_FILES.poster)}" width="${p.native.width}" height="${p.native.height}" alt="${esc(posterAlt(sheet, entry))}"${featured ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`
    : `<p class="vista__pending">Loop not recorded yet.</p>`;
  return (
    `<figure class="vista" data-loop="${entry.id}" style="--mat:${entry.mat}"${p ? ` data-native="${p.native.width}x${p.native.height}"` : ''}>` +
    `<div class="vista__slot" data-name="${esc(viewName(sheet, entry))}" data-desc="${descId}">${inner}</div>` +
    // Only for the canvas's aria-describedby: hidden, so it is not read twice while going through the page.
    `<p id="${descId}" hidden>${esc(viewDescription(sheet, entry))}</p>` +
    label +
    `</figure>`
  );
}

function titleBlock(sheet: SheetManifest, headingId: string): string {
  const s = sheet.sheet;
  const stale = sheet.loops.find((l) => l.stale);
  const visible: string[] = [];
  if (sheet.pack?.synthetic) visible.push(`<p class="title-block__field title-block__mark">synthetic</p>`);
  if (stale) visible.push(`<p class="title-block__field title-block__stale">recorded ${fig(`recorded:${stale.id}`, stale.provenance!.recorded)}; the work has changed since</p>`);
  const rows: [string, string][] = [];
  if (s.series) rows.push(['Series', esc(s.series)]);
  rows.push(['Form', `${formMark(s.form)} ${FORM_NAME[s.form]}`]);
  rows.push(['Date', `<time datetime="${sheet.created}">${fig(`date:${s.number}`, sheet.created)}</time>`]);
  rows.push(['Technique', esc(s.technique)]);
  if (sheet.pack) {
    rows.push(['Dimensions', fig(`dims:${s.number}`, esc(sheet.pack.dims))]);
    rows.push(['Weight', fig(`weight:${s.number}`, esc(sheet.pack.weight))]);
  }
  if (s.rule) rows.push(['Rule', `<span class="title-block__rule">${fig(`rule:${s.number}`, mathText(s.rule.text))}</span>`]);
  for (const entry of sheet.loops) {
    if (!entry.provenance) continue;
    const who = entry.view.label ? `${esc(entry.view.label)}: ` : '';
    const garden = entry.id === 'bloomscope' ? ` · <a href="${esc(FIXED_GARDEN_LINK)}">open the recorded garden</a>` : '';
    // The line links its full provenance, and the abbreviated commit links that commit in the repository.
    const { text, commit } = provenanceParts(entry.provenance);
    const line = `<a href="${entry.provenanceUrl}">${esc(text)}</a><a href="${commitUrl(entry.provenance.commit)}">${esc(commit)}</a>`;
    rows.push(['Provenance', `${who}${fig(`loop:${entry.id}`, line)}${garden}`]);
  }
  return (
    `<section class="title-block" aria-labelledby="${headingId}">` +
    `<h2 class="title-block__head" id="${headingId}"><span class="title-block__no">${fig('sheet', s.number)}</span> <span class="title-block__title">${esc(s.title)}</span></h2>` +
    visible.join('') +
    `<details class="title-block__more"><summary class="title-block__summary"><span>Sheet data</span>${chevron()}</summary><dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></details>` +
    `<a class="title-block__enter" href="${s.enter}">Enter ${esc(s.title)}${arrow('right')}</a>` +
    `</section>`
  );
}

function epureOf(sheet: SheetManifest): { svg: string; nows: NowPoint[] } {
  const s = sheet.sheet;
  const id = `epure-${s.number}`;
  const trail = sheet.trail;
  if (!trail) {
    return { svg: `<p class="epure__pending">The épure is drawn from the loop, which is not recorded yet.</p>`, nows: [] };
  }
  const moments = trail.moments.length;
  let desc: string;
  let label: string;
  if (trail.kind === 'seeds') {
    label = 'seeds in order of birth';
    desc =
      `The seeds of Sow, each where it was born in plan, with its order of birth as height in elevation: ${moments} seeds.` +
      (trail.span
        ? ` The loop covers seeds ${trail.span[0]} to ${trail.span[1]}: seed ${trail.span[0]}, the newest at the first frame, and every seed born during the recording, up to ${trail.span[1]}, the newest at the last frame.`
        : '');
  } else {
    label = 'path of the subject’s centre';
    desc =
      `Path of the subject’s centre over ${moments} frames: where in plan, the frame as height in elevation.` +
      (frontalAngle(trail.moments) !== 0 ? ' The vertical plane is set along the subject’s main direction of travel.' : '') +
      (trail.span ? ` The loop covers frames ${trail.span[0]}–${trail.span[1]}.` : '');
  }
  return epureSvg(trail, { id, title: `Épure of ${s.title}`, desc, trailLabel: label, frame: 0 });
}

function sheetArticle(sheet: SheetManifest, featured: boolean): { html: string; runtime: RuntimeSheet } {
  const s = sheet.sheet;
  const headingId = `sheet-${s.number}-title`;
  const epure = epureOf(sheet);
  const cat = sheet.loops.some((l) => worldOf(l.id)?.credit);
  const views =
    `<div class="sheet__views${sheet.loops.length > 1 ? ' sheet__views--three' : ''}">` +
    sheet.loops.map((entry) => vista(sheet, entry, featured)).join('') +
    (cat ? `<p class="credit">${fig('credit', esc(CAT_CREDIT.text))} · <a href="${CAT_CREDIT.source}">model</a> · <a href="${CAT_CREDIT.license}">license</a></p>` : '') +
    `</div>`;
  // The tools come first in the frame: in focus order and in touch order, before the épure (on desktop
  // they are drawn at the top right). The article receives the focus of jump by number.
  const html =
    `<article class="sheet${featured ? ' sheet--featured' : ''}" id="sheet-${s.number}" tabindex="-1" aria-labelledby="${headingId}" data-sheet="${s.number}">` +
    `<div class="sheet__frame" data-ratio="${RATIO_LABEL}">` +
    `<div class="sheet__tools" hidden><button type="button" class="tool tool--play" data-action="play" aria-pressed="false" hidden>Play loop</button>` +
    `<button type="button" class="tool tool--fold" data-action="fold" aria-pressed="false">Fold</button></div>` +
    `<span class="sheet__ratio" aria-hidden="true">${fig('ratio', RATIO_LABEL)}</span>` +
    views +
    `<figure class="sheet__epure"${sheet.trail ? ` data-axonometry="/${axonometryPath(s.number)}"` : ''}>${epure.svg}<figcaption class="epure__legend">plan: where · elevation: when</figcaption></figure>` +
    `<div class="sheet__text"><p>${esc(s.text)}</p></div>` +
    titleBlock(sheet, headingId) +
    `</div>` +
    `</article>`;
  const runtime: RuntimeSheet = {
    number: s.number,
    title: s.title,
    nows: epure.nows,
    nowMoments: sheet.trail ? (sheet.trail.nows.length ? sheet.trail.nows : [0]) : [],

    views: sheet.loops.map((entry) => ({
      loop: entry.id,
      native: entry.provenance ? [entry.provenance.native.width, entry.provenance.native.height] : null,
      passes: entry.provenance ? Object.fromEntries(passesFor(entry.id).map((d) => [d, loopUrl(entry.id, LOOP_FILES.pass(d))])) : {},
      frames: entry.provenance ? entry.provenance.passes[0].frames : 0,
    })),
  };
  return { html, runtime };
}

/** Work row of the index; `newDate`: its date differs from the previous row and it carries the rule (Eames). */
function indexRow(sheet: SheetManifest, newDate: boolean): string {
  const s = sheet.sheet;
  const first = sheet.loops[0];
  const p = first.provenance;
  const thumb = p
    ? `<img src="${loopUrl(first.id, LOOP_FILES.poster)}" width="${p.native.width}" height="${p.native.height}" alt="" loading="lazy" decoding="async">`
    : '';
  const credit = worldOf(first.id)?.credit ? `<span class="index__credit">${fig('credit', esc(CAT_CREDIT.text))}</span>` : '';
  const synthetic = sheet.pack?.synthetic ? ` <span class="index__mark">synthetic</span>` : '';
  return (
    `<li class="index__row${newDate ? ' index__row--new-date' : ''}" data-sheet="${s.number}">` +
    `<a class="index__link" href="#sheet-${s.number}">` +
    `<span class="index__no">${fig('sheet', s.number)}</span>` +
    `<span class="index__form" title="${FORM_NAME[s.form]}">${formMark(s.form)}<span class="sr-only">${FORM_NAME[s.form]}</span></span>` +
    `<span class="index__thumb" data-loop="${first.id}" style="--mat:${first.mat}">${thumb}</span>` +
    `<span class="index__name"><span class="index__title">${esc(s.title)}</span> <span class="index__line">${esc(s.line)}</span>${synthetic}</span>` +
    `<span class="index__dims">${sheet.pack ? fig(`dims:${s.number}`, esc(sheet.pack.dims)) : ''}</span>` +
    `<time class="index__date" datetime="${sheet.created}">${fig(`date:${s.number}`, sheet.created)}</time>` +
    `</a>${credit}</li>`
  );
}

function indexSection(sheets: SheetManifest[]): string {
  const rows: string[] = [];
  let lastDate: string | null = null;
  for (const sheet of sheets) {
    if (sheet.sheet.series === LAUNCHER.name && !rows.some((r) => r.includes('index__gate'))) {
      rows.push(`<li class="index__gate"><a href="${LAUNCHER.route}">${esc(GATE_ROW)}${arrow('right')}</a></li>`);
    }
    rows.push(indexRow(sheet, lastDate !== null && sheet.created !== lastDate));
    lastDate = sheet.created;
  }
  rows.push(
    `<li class="index__row index__row--method" data-sheet="${METHOD_SHEET.number}"><a class="index__link" href="#sheet-${METHOD_SHEET.number}">` +
      `<span class="index__no">${fig('sheet', METHOD_SHEET.number)}</span><span class="index__form"></span><span class="index__thumb">${columnPlanSvg('index__method')}</span>` +
      `<span class="index__name"><span class="index__title">${esc(METHOD_SHEET.title)}</span> <span class="index__line">${esc(METHOD_SHEET.line)}</span></span>` +
      `<span class="index__dims"></span><span class="index__date"></span></a></li>`,
  );
  for (let i = 0; i < WORKSHOP_SHEETS; i++) {
    rows.push(
      `<li class="index__row index__row--workshop" data-workshop><span class="index__no"></span><span class="index__form">${formMark('workshop')}<span class="sr-only">${FORM_NAME.workshop}</span></span><span class="index__thumb index__thumb--empty"></span><span class="index__name"><span class="index__line">${esc(WORKSHOP_TEXT)}</span></span></li>`,
    );
  }
  return (
    `<section class="index" id="index" aria-labelledby="index-title">` +
    `<h2 class="index__heading" id="index-title" tabindex="-1">Index of sheets</h2>` +
    `<p class="index__hint" hidden>Type a sheet number, like ${fig('sheet', esc(sheets[sheets.length - 1]?.sheet.number ?? ''))}, to jump to it. Keyboard shortcuts can be turned off in the colophon.</p>` +
    `<ol class="index__list" role="list">${rows.join('')}</ol>` +
    `</section>`
  );
}

function methodSheet(): string {
  return (
    `<article class="sheet sheet--method" id="sheet-${METHOD_SHEET.number}" tabindex="-1" aria-labelledby="sheet-000-title" data-sheet="${METHOD_SHEET.number}">` +
    `<div class="sheet__frame" data-ratio="${METHOD_RATIO_LABEL}">` +
    `<div class="sheet__tools" hidden><button type="button" class="tool tool--fold" data-action="fold" aria-pressed="false">Fold</button></div>` +
    `<figure class="sheet__epure sheet__epure--column" data-axonometry="/${axonometryPath('000-column')}">${columnSvg()}<figcaption class="epure__legend">Gaudí’s double-twist column</figcaption></figure>` +
    `<figure class="sheet__epure sheet__epure--tesseract" data-axonometry="/${axonometryPath('000-tesseract')}">${tesseractSvg()}<figcaption class="epure__legend">The tesseract</figcaption></figure>` +
    `<div class="sheet__text"><p>Every sheet is an <i lang="fr">épure</i>: its subject drawn twice on one page, in plan from above and in elevation from the front, joined by the ground line. On every work sheet the elevation shows time, not height: each point of a trail is one moment of the work. Here, where height is still height, the method draws two of its sources: a column that doubles its points as it twists, and a cube from four dimensions.</p></div>` +
    `<section class="title-block" aria-labelledby="sheet-000-title">` +
    `<h2 class="title-block__head" id="sheet-000-title"><span class="title-block__no">${fig('sheet', METHOD_SHEET.number)}</span> <span class="title-block__title">${esc(METHOD_SHEET.title)}</span></h2>` +
    `<p class="title-block__field">${esc(METHOD_SHEET.line)}</p>` +
    `</section>` +
    `</div>` +
    `</article>`
  );
}

/** The cat's sheet (the one that carries the CC-BY credit). */
const SHEETS_WITH_CAT = SHEETS.find((s) => s.views.some((v) => worldOf(v.loop)?.credit))!.number;

function colophon(): string {
  const refs = REFERENCES.map((r) => `<li id="ref-${r.id}">${fig(`ref:${r.id}`, r.html)}. <span class="colophon__use">Used for ${esc(r.use)}.</span> <a href="${r.url}">Source</a></li>`).join('');
  const glossary = GLOSSARY.map((g) => `<div><dt lang="${g.lang}">${esc(g.term)}</dt><dd>${esc(g.meaning)}</dd></div>`).join('');
  return (
    `<footer class="colophon" id="colophon">` +
    `<h2 class="colophon__heading">Colophon</h2>` +
    `<div class="colophon__col">` +
    `<p class="colophon__stamp">${esc(COLLECTION_TITLE)} · ${fig('stamp', esc(BUILD_STAMP))} · made by <a href="https://crewtives.com">crewtives.com</a></p>` +
    `<p>The loops on these sheets are recordings of each work’s own display, pixel for pixel, with their provenance published next to them; the works themselves run live, one click away. Every figure about a work is read from the work: its pack, its code or its loop. Its date comes from the collection’s curation. The scenes of 4D.OS are synthetic.</p>` +
    `<h3>Type</h3><p>Geologica and Fira Mono, both under the SIL Open Font License and served from this site.</p>` +
    `<h3>Code in the browser</h3><p>three.js, MIT License, only for the fold.</p>` +
    `<h3>Models</h3><p>${fig('credit', esc(CAT_CREDIT.text))}: <a href="${CAT_CREDIT.source}">model</a>, <a href="${CAT_CREDIT.license}">license</a>. It is the cat of sheet ${fig('sheet', SHEETS_WITH_CAT)}, animated and sampled into points by 4D.OS.</p>` +
    `<h3>What this page keeps</h3><p>Only your sound and keyboard-shortcut preferences, in this browser. Nothing is sent anywhere.</p>` +
    // Turns off the single-key shortcuts (WCAG 2.1.4); without JavaScript there are no shortcuts and no button.
    `<button type="button" class="colophon__shortcuts" aria-pressed="true" hidden>Keyboard shortcuts: on</button>` +
    `</div><div class="colophon__col">` +
    `<h3>References</h3><ul class="colophon__refs">${refs}</ul>` +
    `<h3>Glossary</h3><dl class="colophon__glossary">${glossary}</dl>` +
    `<p class="colophon__back"><a href="#top">Back to the top${arrow('down', 'arrow arrow--up')}</a></p>` +
    `</div>` +
    `</footer>`
  );
}

function bar(): string {
  const states = (['rewind', 'hold', 'forward'] as const)
    .map((state) => `<button type="button" class="clock__state clock__state--${state}" data-state="${state}" aria-pressed="${state === 'forward'}">${state.toUpperCase()}</button>`)
    .join('');
  return (
    `<header class="bar" id="top">` +
    `<h1 class="bar__title">${esc(COLLECTION_TITLE)}</h1>` +
    `<div class="clock">` +
    `<div class="clock__controls" hidden>` +
    `<div class="clock__states" role="group" aria-label="Page clock">${states}</div>` +
    `<div class="clock__scrub" role="slider" tabindex="0" aria-label="Loop position" aria-valuemin="1" aria-valuemax="45" aria-valuenow="1"><span class="clock__rail"></span><span class="clock__target" hidden></span><span class="clock__head"></span></div>` +
    `</div>` +
    `<p class="clock__line">Loops recorded from the live render; the works run live.</p>` +
    `</div>` +
    `<nav class="bar__nav" aria-label="Museum">` +
    `<a class="bar__link" href="#index"><span class="bar__label">Index<span class="bar__long"> of sheets</span></span>${arrow('down')}</a>` +
    `<button type="button" class="bar__button bar__grid" aria-pressed="false" hidden>Grid</button>` +
    `<button type="button" class="bar__button bar__sound" aria-pressed="false" hidden><span data-sound-label>Sound off</span></button>` +
    `<a class="bar__link bar__home" href="https://crewtives.com"><span class="bar__label">crewtives.com</span></a>` +
    `</nav>` +
    `</header>`
  );
}

/** Integer scale of each VISTA (work-loops, "Integer scale in device pixels"). */
function vistaCss(manifest: Manifest): string {
  const rules: string[] = [];
  const dprs = [1, 1.25, 1.5, 2, 3];
  for (const sheet of manifest.sheets) {
    for (const entry of sheet.loops) {
      const p = entry.provenance;
      if (!p) continue;
      const { width: w, height: h } = p.native;
      const sel = `.vista[data-loop="${entry.id}"] .vista__poster`;
      // Without JavaScript: an integer multiple in CSS pixels.
      rules.push(`${sel}{width:100%;height:auto;image-rendering:auto}`);
      for (let k = 1; k <= 8; k++) rules.push(`@container vista (min-width:${w * k}px){html:not(.js) ${sel}{width:${w * k}px;height:${h * k}px;image-rendering:pixelated}}`);
      // With JavaScript: an integer multiple in device pixels, the same one the player uses.
      for (const dpr of dprs) {
        for (let k = 1; k <= Math.ceil(8 * dpr); k++) {
          const css = (w * k) / dpr;
          const threshold = (w * k) / dpr;
          rules.push(
            `@media (resolution:${dpr}dppx){@container vista (min-width:${Math.ceil(threshold * 100) / 100}px){html.js ${sel}{width:${Math.round(css * 1000) / 1000}px;height:${Math.round(((h * k) / dpr) * 1000) / 1000}px;image-rendering:pixelated}}}`,
          );
        }
      }
    }
  }
  return rules.join('\n');
}

export function renderPage(manifest: Manifest): Page {
  const featuredNumber = featuredSheet().number;
  const featured = manifest.sheets.find((s) => s.sheet.number === featuredNumber)!;
  const rest = manifest.sheets.filter((s) => s !== featured);
  const top = sheetArticle(featured, true);
  const others = rest.map((s) => sheetArticle(s, false));
  const body =
    `<div class="light" aria-hidden="true"><div class="light__east"></div><div class="light__west"></div></div>` +
    `<div class="grid-overlay" aria-hidden="true" hidden></div>` +
    bar() +
    `<p class="nogl" hidden>This browser has no WebGL2: the loops still play, and the fold is shown as a drawing instead of in 3D.</p>` +
    `<main class="museum">` +
    top.html +
    indexSection(manifest.sheets) +
    others.map((o) => o.html).join('') +
    methodSheet() +
    `</main>` +
    colophon() +
    `<p class="sr-only" aria-live="polite" id="announcer"></p>` +
    // Deep link to a sheet: positioned from the first paint, without waiting for the module's
    // JavaScript (the browser only does it once loading finishes). The <head> hid the page until here.
    `<script>if(/^#sheet-\\d{3}$/.test(location.hash)){var s=document.getElementById(location.hash.slice(1));if(s)s.scrollIntoView()}document.documentElement.style.visibility=''</script>`;
  const runtime: RuntimeData = {
    sheets: [top.runtime, ...others.map((o) => o.runtime)].sort((a, b) => a.number.localeCompare(b.number)),
  };
  const files: Record<string, string> = {};
  for (const sheet of manifest.sheets) {
    if (!sheet.trail) continue;
    const geom = trailGeom3(sheet.trail);
    // The NOW of the dihedron at each clock position: the same moments as `nowMoments`.
    const nows = (sheet.trail.nows.length ? sheet.trail.nows : [0]).map((i) => geom.track[i]);
    files[axonometryPath(sheet.sheet.number)] = axonometrySvg(geom, `axo-${sheet.sheet.number}`, `${sheet.sheet.title}, folded`, nows);
  }
  files[axonometryPath('000-column')] = axonometrySvg(columnGeom3(), 'axo-000-column', 'Double-twist column, folded');
  files[axonometryPath('000-tesseract')] = axonometrySvg(tesseractGeom3(), 'axo-000-tesseract', 'Tesseract, folded');
  return { body, css: vistaCss(manifest), runtime, files };
}
