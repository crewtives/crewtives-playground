import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { seedPosition, seedScale } from '../../bloomscope/sow/sow';
import { CAT_CREDIT, LAUNCHER, WORLDS } from '../../shared/worlds';
import { FIXED_GARDEN_LINK, SHEETS } from '../collection';
import { EPURE, projectTrail } from './epure';
import { checkFigures } from './figures';
import { buildManifest, type Manifest } from './manifest';
import { COLUMNS, formMark, METHOD_COLUMNS, METHOD_RATIO_LABEL, RATIO_LABEL, renderPage, type Page } from './render';
import { sourcesHash } from './sources';
import { testProvenance, writeTestProvenance } from './testProvenance';

const repo = resolve(import.meta.dirname, '../../../..');
/** Commit of the test provenances (the provenance line links it). */
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
let loops: string;
let manifest: Manifest;
let page: Page;
const body = () => page.body;

beforeAll(() => {
  loops = mkdtempSync(join(tmpdir(), 'museum-render-'));
  for (const sheet of SHEETS) {
    // Up-to-date provenances: with the hash of each work's current sources.
    const sources = sourcesHash(repo, sheet.sources);
    for (const view of sheet.views) {
      if (view.loop === 'bloomscope') writeTestProvenance(loops, testProvenance('bloomscope', { commit: COMMIT, sources, native: { width: 120, height: 120 } }));
      else writeTestProvenance(loops, testProvenance(view.loop, { commit: COMMIT, sources, pack: sheet.pack!, frames: Array.from({ length: 45 }, (_, i) => 120 + 2 * i) }));
    }
  }
  manifest = buildManifest({ root: repo, loopsDir: loops });
  page = renderPage(manifest);
});
afterAll(() => rmSync(loops, { recursive: true, force: true }));

/** Content of sheet NNN (from its <article> to the next one). */
const sheetHtml = (n: string) => {
  const html = body();
  const start = html.indexOf(`<article class="sheet`, html.indexOf(`id="sheet-${n}"`) - 40);
  return html.slice(start, html.indexOf('</article>', start));
};
const text = (html: string) =>
  html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '')
    .replace(/<\/?span\b[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

describe('museum page (6.1)', () => {
  test('Full walkthrough: featured sheet, index, 001–003, 000 and colophon, in that order', () => {
    const html = body();
    const at = (s: string) => html.indexOf(s);
    const order = ['id="sheet-004"', 'id="index"', 'id="sheet-001"', 'id="sheet-002"', 'id="sheet-003"', 'id="sheet-000"', 'id="colophon"'].map(at);
    expect(order.every((v) => v >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('Tab and heading: title "crewtives playground" and a single h1', () => {
    const template = readFileSync(join(repo, 'sites/playground/index.html'), 'utf8');
    expect(template).toContain('<title>crewtives playground</title>');
    expect((body().match(/<h1\b/g) ?? []).length).toBe(1);
    expect(template.match(/<h1\b/g)).toBeNull();
    expect(body()).toMatch(/<h1 class="bar__title">crewtives playground<\/h1>/);
  });

  test('Each sheet only once', () => {
    const ids = [...body().matchAll(/<article [^>]*id="(sheet-\d{3})"/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual(['sheet-000', 'sheet-001', 'sheet-002', 'sheet-003', 'sheet-004']);
  });

  test('Jump by number: each sheet is focusable by script (tabindex="-1") and labelled by its heading', () => {
    const articles = [...body().matchAll(/<article [^>]*>/g)].map((m) => m[0]);
    expect(articles).toHaveLength(5);
    for (const tag of articles) {
      expect(tag).toContain('tabindex="-1"');
      const n = /id="sheet-(\d{3})"/.exec(tag)![1];
      expect(tag).toContain(`aria-labelledby="sheet-${n}-title"`);
      expect(body()).toContain(`<h2 class="title-block__head" id="sheet-${n}-title">`);
    }
  });

  test('Tools first in the frame of each sheet (focus order), before the VISTAs and the épure', () => {
    for (const n of ['000', '001', '002', '003', '004']) {
      const html = sheetHtml(n);
      expect(html).toMatch(/^<article [^>]*><div class="sheet__frame"[^>]*><div class="sheet__tools" hidden>/);
      expect(html.indexOf('data-action="fold"')).toBeLessThan(html.indexOf('<figure'));
    }
  });

  test('Ratio labelled on the border fillet of each work sheet: the one from COLUMNS, hidden from screen readers', () => {
    expect(RATIO_LABEL).toBe('13 : 8');
    expect(COLUMNS.vista / COLUMNS.epure).toBeCloseTo(13 / 8);
    for (const n of ['001', '002', '003', '004']) {
      expect(sheetHtml(n)).toContain(`<span class="sheet__ratio" aria-hidden="true"><span data-fig="ratio">${RATIO_LABEL}</span></span>`);
    }
    expect(sheetHtml('000')).not.toContain('sheet__ratio');
  });

  test('The full grid of 000 labels its own ratio: two equal columns, "1 : 1"', () => {
    expect(METHOD_COLUMNS.column).toBe(METHOD_COLUMNS.tesseract);
    expect(METHOD_RATIO_LABEL).toBe('1 : 1');
    expect(sheetHtml('000')).toContain(`<div class="sheet__frame" data-ratio="${METHOD_RATIO_LABEL}">`);
  });

  test('Form marks drawn in SVG: no ○ □ △ from a font', () => {
    expect(body()).not.toMatch(/[○□△]/);
    expect(formMark('scene')).toMatch(
      /^<svg class="form-mark" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle [^>]*vector-effect="non-scaling-stroke"\/><\/svg>$/,
    );
    expect(formMark('toy')).toContain('<rect ');
    expect(formMark('workshop')).toContain('<path ');
    // Index: four works and three workshop rows; title block: one per work sheet.
    expect(body().match(/<svg class="form-mark"/g)).toHaveLength(4 + 3 + 4);
  });

  test('Bar: the text of each link goes in .bar__label; the scrubber carries the target mark, hidden', () => {
    expect(body()).toContain('<a class="bar__link" href="#index"><span class="bar__label">Index<span class="bar__long"> of sheets</span></span><svg class="arrow"');
    expect(body()).toContain('<a class="bar__link bar__home" href="https://crewtives.com"><span class="bar__label">crewtives.com</span></a>');
    expect(body()).toMatch(/<div class="clock__scrub"[^>]*><span class="clock__rail"><\/span><span class="clock__target" hidden><\/span><span class="clock__head"><\/span><\/div>/);
  });
});

describe('épures (6.2)', () => {
  const polyPoints = (html: string, cls: string) =>
    [...html.matchAll(new RegExp(`<polyline class="${cls}" points="([^"]+)"`, 'g'))].map((m) => m[1].split(' ').length);

  test('Trail of a pack: 450 vertices on 002, and the loop segment covers the source frames', () => {
    const html = sheetHtml('002');
    expect(polyPoints(html, 'ep-full')).toEqual([450, 450]);
    // Source frames 120…208: 89 vertices in a solid stroke.
    expect(polyPoints(html, 'ep-span')).toEqual([89, 89]);
    expect(html).toContain('path of the subject’s centre');
  });

  test('Trail of 004: 698 seeds as fine dots and the 609–697 segment as ink dots', () => {
    const html = sheetHtml('004');
    const groups = [...html.matchAll(/<g class="(ep-full ep-full--dots|ep-span ep-span--dots)">(.*?)<\/g>/g)];
    expect(groups.map((g) => [g[1], (g[2].match(/<circle/g) ?? []).length])).toEqual([
      ['ep-full ep-full--dots', 698],
      ['ep-full ep-full--dots', 698],
      ['ep-span ep-span--dots', 89],
      ['ep-span ep-span--dots', 89],
    ]);
    expect(html).toContain('seeds in order of birth');
    expect(html).not.toMatch(/<polyline/);
  });

  test('NOW of 004 and Plan and elevation of 004', () => {
    const sheet = manifest.sheets.find((s) => s.sheet.number === '004')!;
    const runtime = page.runtime.sheets.find((s) => s.number === '004')!;
    expect(runtime.nows).toHaveLength(45);
    const { plan, elev } = projectTrail(sheet.trail!);
    runtime.nows.forEach(([ex, ey, px, py], f) => {
      const n = 610 + 2 * f - 1;
      expect([ex, ey]).toEqual(elev[n]);
      expect([px, py]).toEqual(plan[n]);
    });
    // The plan is seedPosition(n, α, c) with a single c, up to the drawing's uniform scale.
    const c = seedScale(698);
    const [x0, y0] = seedPosition(0, 137.5078, c);
    const [x1, y1] = seedPosition(697, 137.5078, c);
    const ratio = (plan[697][0] - plan[0][0]) / (x1 - x0);
    // Same scale on both axes (the drawing's y points down: the flower head's y, inverted).
    expect(Math.abs((plan[697][1] - plan[0][1]) / -(y1 - y0) / ratio - 1)).toBeLessThan(0.01);
  });

  test('Reference line: the NOW in the elevation and the one in the plan on the same perpendicular', () => {
    for (const s of page.runtime.sheets) for (const [ex, , px] of s.nows) expect(ex).toBe(px);
    const html = sheetHtml('003');
    const ref = /<line class="ep-ref" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/.exec(html)!;
    expect(ref[1]).toBe(ref[3]);
  });

  test('The same axes on every sheet: the elevation rises with time and every sheet carries the legend', () => {
    for (const sheet of manifest.sheets) {
      const { elev } = projectTrail(sheet.trail!);
      for (let i = 1; i < elev.length; i++) expect(elev[i][1]).toBeLessThan(elev[i - 1][1] + 1e-9);
      expect(elev[0][1]).toBeLessThanOrEqual(EPURE.elevBottom);
      expect(sheetHtml(sheet.sheet.number)).toContain('plan: where · elevation: when');
    }
  });

  test('Épure measurements: 480×600 with the ground line at 300; elevation on top and plan below, each in its half', () => {
    expect([EPURE.width, EPURE.height, EPURE.ground]).toEqual([480, 600, 300]);
    for (const sheet of manifest.sheets) {
      const html = sheetHtml(sheet.sheet.number);
      expect(html).toContain(`viewBox="0 0 480 600"`);
      expect(html).toContain(`<line class="ep-ground" x1="0" y1="300" x2="480" y2="300"/>`);
      const { plan, elev } = projectTrail(sheet.trail!);
      for (const [, y] of elev) expect(y >= EPURE.elevTop && y <= EPURE.elevBottom && y < EPURE.ground).toBe(true);
      for (const [, y] of plan) expect(y >= EPURE.planTop && y <= EPURE.planBottom && y > EPURE.ground).toBe(true);
      // The labels go inside the viewBox: "elevation" above the elevation, "plan" below the plan.
      const labels = [...html.matchAll(/<text class="ep-label[^"]*" x="[^"]+" y="([^"]+)"/g)].map((m) => Number(m[1]));
      expect(labels.length).toBeGreaterThanOrEqual(3);
      for (const y of labels) expect((y > 0 && y < EPURE.elevTop) || (y > EPURE.planBottom && y < EPURE.height)).toBe(true);
    }
  });

  test('Subject of 004: title and description of its épure', () => {
    const desc = /<desc id="epure-004-desc">([^<]+)<\/desc>/.exec(sheetHtml('004'))![1];
    expect(desc).toContain('The seeds of Sow, each where it was born in plan, with its order of birth as height in elevation: 698 seeds.');
    expect(desc).toContain('The loop covers seeds 609 to 697: seed 609, the newest at the first frame, and every seed born during the recording, up to 697, the newest at the last frame.');
  });

  test("Screen reader on 003: the épure says it traces the subject's centre over 450 frames, and its segment", () => {
    const desc = /<desc id="epure-003-desc">([^<]+)<\/desc>/.exec(sheetHtml('003'))![1];
    expect(desc).toContain('Path of the subject’s centre over 450 frames');
    expect(desc).toContain('The loop covers frames 120–208.');
  });
});

describe('title block (6.6)', () => {
  const details = (n: string) => text(/<details class="title-block__more">([\s\S]*?)<\/details>/.exec(sheetHtml(n))![1]);
  const visibleFields = (n: string) => {
    const html = /<section class="title-block"[\s\S]*?<\/section>/.exec(sheetHtml(n))![0].replace(/<details[\s\S]*?<\/details>/, '');
    return (html.match(/class="title-block__head"|class="title-block__field/g) ?? []).length + (html.match(/class="title-block__enter"/g) ?? []).length;
  };

  test('Title block of 002', () => {
    const d = details('002');
    for (const v of ['4D.OS', 'Form scene', '2026-09-24', '15.0 s · 450 frames at 30 fps', 'golden spiral r = 18.5·e^(−b·θ), b = 0.3063', '2.39996 rad', 'Provenance Loop 160 × 100 px']) expect(d).toContain(v);
    // The ○ form, drawn.
    expect(/<details class="title-block__more">[\s\S]*?<\/details>/.exec(sheetHtml('002'))![0]).toContain(`<dt>Form</dt><dd>${formMark('scene')} scene</dd>`);
    expect(d).toMatch(/53\.7 Mi?B/);
    const head = text(/<h2 class="title-block__head"[\s\S]*?<\/h2>/.exec(sheetHtml('002'))![0]);
    expect(head).toContain('002');
    expect(head).toContain('The golden stoop');
    expect(sheetHtml('002')).toContain('<p class="title-block__field title-block__mark">synthetic</p>');
  });

  test('Four visible fields at most; 001–003 show "synthetic"', () => {
    for (const n of ['001', '002', '003', '004']) expect(visibleFields(n)).toBeLessThanOrEqual(4);
    for (const n of ['001', '002', '003']) expect(sheetHtml(n)).toContain('title-block__mark">synthetic<');
  });

  test('Work without a pack: 004 invents no dimensions, weight or "synthetic" and links the garden', () => {
    const d = details('004');
    expect(d).not.toMatch(/\d+\.\d s · \d+ frames at \d+ fps|MiB|\bMB\b|synthetic/);
    expect(sheetHtml('004')).not.toContain('title-block__mark');
    expect(sheetHtml('004')).toContain(`href="${FIXED_GARDEN_LINK.replace(/&/g, '&amp;')}"`);
  });

  test('Matches the provenance: the line comes from its JSON and links it, and the commit links that commit in the public repository', () => {
    const html = sheetHtml('003');
    expect(html).toContain('href="/loops/e/provenance.json"');
    expect(text(html)).toContain('Loop 160 × 100 px · 2 colors · 45 frames at 15 fps · loops every 3.0 s · source frames 120–208 · forward and rewind · recorded 2026-09-25 from the live render at commit 0123456');
    expect(html).toContain(`<a href="https://github.com/crewtives/crewtives-playground/commit/${COMMIT}">0123456</a>`);
  });

  test('Up-to-date provenances: no sheet shows the stale-loop notice', () => {
    expect(manifest.warnings).toEqual([]);
    expect(body()).not.toContain('title-block__stale');
  });

  test('Enter the work: "Enter <title>" is a real link to its route', () => {
    expect(sheetHtml('003')).toMatch(/<a class="title-block__enter" href="\/4d-os\/e\/">Enter Whale fall/);
    expect(sheetHtml('001')).toMatch(/<a class="title-block__enter" href="\/4d-os\/">Enter The cat/);
    expect(sheetHtml('004')).toMatch(/<a class="title-block__enter" href="\/bloomscope\/">Enter Bloomscope/);
  });

  test('Stale loop: a visible notice with the recording date, without opening the disclosure', () => {
    const stale = mkdtempSync(join(tmpdir(), 'museum-stale-'));
    try {
      writeTestProvenance(stale, testProvenance('bloomscope', { commit: '0'.repeat(40), recorded: '2026-09-25', native: { width: 120, height: 120 } }));
      const m = buildManifest({ root: repo, loopsDir: stale, sheets: [SHEETS[3]] });
      const html = renderPage({ ...m, sheets: [...manifest.sheets.slice(0, 3), m.sheets[0]] }).body;
      const titleBlock = /<section class="title-block" aria-labelledby="sheet-004-title">[\s\S]*?<\/section>/.exec(html)![0].replace(/<details[\s\S]*?<\/details>/, '');
      expect(text(titleBlock)).toContain('recorded 2026-09-25; the work has changed since');
    } finally {
      rmSync(stale, { recursive: true, force: true });
    }
  });

  test('"Sheet data": a drawn marker (the chevron of the arrow), not the browser default', () => {
    for (const n of ['001', '002', '003', '004']) {
      expect(sheetHtml(n)).toContain(
        '<summary class="title-block__summary"><span>Sheet data</span><svg class="arrow chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7 4l6 6-6 6"/></svg></summary>',
      );
    }
  });

  test('Credit next to the views of 001, outside any disclosure', () => {
    const html = sheetHtml('001');
    const views = /<div class="sheet__views[\s\S]*?<\/div><figure class="sheet__epure/.exec(html)![0];
    expect(views).toContain(CAT_CREDIT.text.replace(/"/g, '&quot;'));
    expect(views).not.toContain('<details');
  });
});

describe('VISTAs: name and description (Museum-specific accessibility)', () => {
  test('the description of each VISTA is hidden (only for aria-describedby) and is not read twice', () => {
    const descs = [...body().matchAll(/<p id="vista-([a-z]+)-desc"( hidden)?>[^<]*<\/p>/g)];
    expect(descs.map((m) => m[1]).sort()).toEqual(['a', 'b', 'bloomscope', 'c', 'd', 'e']);
    for (const m of descs) expect(m[2]).toBe(' hidden');
    expect(body()).not.toMatch(/class="sr-only" id="vista-/);
  });

  test('synthetic scene: the alt text and description of the VISTAs of 001–003 say so, and 004 does not', () => {
    for (const n of ['001', '002', '003', '004']) {
      const html = sheetHtml(n);
      const alts = [...html.matchAll(/<img class="vista__poster"[^>]* alt="([^"]+)"/g)].map((m) => m[1]);
      const descs = [...html.matchAll(/<p id="vista-[a-z]+-desc" hidden>([^<]+)<\/p>/g)].map((m) => m[1]);
      expect(alts).toHaveLength(n === '001' ? 3 : 1);
      expect(descs).toHaveLength(alts.length);
      for (const t of [...alts, ...descs]) {
        if (n === '004') expect(t).not.toMatch(/synthetic/i);
        else expect(t.endsWith(' A synthetic scene.')).toBe(true);
      }
    }
  });
});

describe('sheet 000 and colophon', () => {
  const colophon = () => /<footer class="colophon"[\s\S]*?<\/footer>/.exec(body())![0];

  test('text of 000: 80 words or fewer, and it says that there the elevation is height (on work sheets, time)', () => {
    const t = text(/<div class="sheet__text"><p>([\s\S]*?)<\/p><\/div>/.exec(sheetHtml('000'))![1]).trim();
    expect(t.split(/\s+/).length).toBeLessThanOrEqual(80);
    expect(t).toContain('On every work sheet the elevation shows time, not height');
    expect(t).toContain('Here, where height is still height');
    expect(t).not.toMatch(/every sheet shares those axes/);
  });

  test('keyboard shortcuts: button in the colophon (hidden without JavaScript), what the page keeps and the index hint', () => {
    expect(colophon()).toContain('<button type="button" class="colophon__shortcuts" aria-pressed="true" hidden>Keyboard shortcuts: on</button>');
    expect(text(colophon())).toContain('Only your sound and keyboard-shortcut preferences, in this browser. Nothing is sent anywhere.');
    expect(text(/<p class="index__hint"[\s\S]*?<\/p>/.exec(body())![0])).toContain('Keyboard shortcuts can be turned off in the colophon.');
  });

  test('colophon: the figures of each work come from the work and its date from the curation, not from git', () => {
    const t = text(colophon());
    expect(t).not.toMatch(/\bgit\b/);
    expect(t).toContain('Every figure about a work is read from the work: its pack, its code or its loop. Its date comes from the collection’s curation.');
  });

  test('colophon: the light is cited without claiming anything by Gaudí about it; the cat, as a derivative work; Church and Van Doesburg', () => {
    const t = text(colophon());
    expect(t).not.toMatch(/Gaudí used|stair or a drawing/);
    expect(t).toContain('the stained-glass windows, by Joan Vila-Grau, are bluer on the morning side and more orange on the evening side');
    expect(t).toContain('It is the cat of sheet 001, animated and sampled into points by 4D.OS.');
    expect(t).toContain('New York, A. S. Barnes, 1864 (1867 printing)');
    expect(t).toContain('the English name of the line where the two planes meet, the ground line');
    expect(t).toContain('the common axes of the épure on every work sheet');
  });
});

describe('axonometry of the fold without WebGL2', () => {
  test('publishes the NOW of each clock position (data-nows), with the same index as in the épure', () => {
    for (const s of page.runtime.sheets) {
      const svg = page.files[`museum/fold-${s.number}.svg`];
      const nows = JSON.parse(/ data-nows="([^"]+)"/.exec(svg)![1]) as number[][];
      expect(nows).toHaveLength(s.nows.length);
      for (const p of nows) expect(p).toHaveLength(6);
      // The static drawing is frame 0 (the poster's).
      const [x, y, px, py, ex, ey] = nows[0];
      expect(svg).toContain(`<circle class="ep-now" cx="${x}" cy="${y}" r="5"/>`);
      expect(svg).toContain(`<path class="axo-ref" d="M${x},${y}L${px},${py}M${x},${y}L${ex},${ey}"/>`);
      // The NOW changes with the clock position.
      expect(new Set(nows.map((p) => p.join())).size).toBeGreaterThan(1);
    }
    expect(page.files['museum/fold-000-column.svg']).not.toContain('data-nows');
  });

  test('name from the title and a separate description (neither is read twice)', () => {
    for (const svg of Object.values(page.files)) {
      const id = /<svg [^>]*id="([^"]+)"/.exec(svg)![1];
      expect(svg).toContain(`aria-labelledby="${id}-title" aria-describedby="${id}-desc"`);
    }
  });
});

describe('figures (6.7)', () => {
  test('Figures that are not from a work: the initial collection passes the check', () => {
    const problems = checkFigures(body(), manifest);
    if (problems.length) console.log(problems.join('\n'));
    expect(problems).toEqual([]);
  });

  test('Hand-written figure: a figure in a wall text fails and is reported', () => {
    const tampered = body().replace('A humpback whale, computed from equations,', 'A humpback whale, computed from 1923 equations,');
    const problems = checkFigures(tampered, manifest);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('1923');
  });

  test('a marked figure that does not match its source fails', () => {
    const tampered = body().replace('<span data-fig="dims:002">15.0 s', '<span data-fig="dims:002">16.0 s');
    expect(checkFigures(tampered, manifest).some((p) => p.includes('16.0 s'))).toBe(true);
  });

  test('a provenance line whose commit does not link the commit of its loop fails', () => {
    const link = `https://github.com/crewtives/crewtives-playground/commit/${COMMIT}`;
    const tampered = body().replace(`href="${link}"`, `href="${link.replace(COMMIT, 'f'.repeat(40))}"`);
    expect(tampered).not.toBe(body());
    const problems = checkFigures(tampered, manifest);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`does not link ${link}`);
  });
});

describe('sheet index (7.1)', () => {
  const index = () => /<section class="index"[\s\S]*?<\/section>/.exec(body())![0];

  test('Work rows: 001–004 in order, each with number, form, poster, title, line and date, and a link to its sheet', () => {
    const rows = [...index().matchAll(/<li class="index__row(?: index__row--new-date)?" data-sheet="(\d{3})">([\s\S]*?)<\/li>/g)];
    expect(rows.map((r) => r[1])).toEqual(['001', '002', '003', '004']);
    for (const [, n, html] of rows) {
      expect(html).toContain(`href="#sheet-${n}"`);
      expect(html).toMatch(/<img src="\/loops\/[a-z]+\/poster\.webp"/);
      expect(html).toMatch(/class="index__form" title="(scene|toy)"><svg class="form-mark"/);
      expect(html).toMatch(/class="index__date" datetime="2026-09-2[45]"/);
    }
  });

  test('4D.OS gate row: exact text, no number, right before 001, pointing to /4d-os/', () => {
    const html = index();
    const gate = /<li class="index__gate"><a href="([^"]+)">([^<]+)</.exec(html)!;
    expect(gate[1]).toBe(LAUNCHER.route);
    expect(gate[2]).toBe('4D.OS — Five worlds, one launcher. Every moment of a scene, all at once.');
    expect(html.indexOf('index__gate')).toBeLessThan(html.indexOf('data-sheet="001"'));
    expect(html.indexOf('index__gate')).toBeGreaterThan(html.indexOf('index__list'));
    // "Five" matches the launcher's worlds.
    expect(['One', 'Two', 'Three', 'Four', 'Five', 'Six'][WORLDS.length - 1]).toBe('Five');
  });

  test('Date separators: only one, between 003 and 004, as the rule of the row (no separator <li>)', () => {
    const html = index();
    const rules = [...html.matchAll(/<li class="index__row index__row--new-date" data-sheet="(\d{3})"/g)].map((m) => m[1]);
    expect(rules).toEqual(['004']);
    expect(html).not.toMatch(/role="separator"|index__sep/);
    // The list holds only rows and the gate row.
    for (const li of html.match(/<li [^>]*>/g)!) expect(li).toMatch(/^<li class="index__(row|gate)\b/);
  });

  test('Synthetic scene in the index: 001–003 carry the mark next to their title and line, 004 does not', () => {
    for (const n of ['001', '002', '003', '004']) {
      const row = new RegExp(`<li class="index__row[^"]*" data-sheet="${n}">[\\s\\S]*?</li>`).exec(index())![0];
      const name = /<span class="index__name">([\s\S]*?)<\/span><span class="index__dims">/.exec(row)![1];
      if (n === '004') expect(row).not.toContain('synthetic');
      else expect(name).toContain('<span class="index__mark">synthetic</span>');
    }
  });

  test('Sheet 000 row: after the work rows, with no poster, dimensions or date; its thumbnail is the plan of the column', () => {
    const row = /<li class="index__row index__row--method"[\s\S]*?<\/li>/.exec(index())![0];
    expect(row).toContain('href="#sheet-000"');
    expect(row).not.toMatch(/<img|<time|frames at/);
    expect(row).toMatch(
      /<span class="index__thumb"><svg class="index__method" viewBox="[^"]+" width="100%" height="100%" aria-hidden="true" focusable="false">(<path class="ep-section" [^>]+\/>){4}<\/svg><\/span>/,
    );
    expect(row).toContain('drawn as épures');
    expect(index().indexOf('index__row--method')).toBeGreaterThan(index().indexOf('data-sheet="004"'));
  });

  test('Workshop sheets: exactly three, with no number, name, date or link', () => {
    const rows = [...index().matchAll(/<li class="index__row index__row--workshop"[\s\S]*?<\/li>/g)].map((m) => m[0]);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toContain('Being drawn. Not public yet.');
      expect(row).toContain(`<span class="index__form">${formMark('workshop')}<span class="sr-only">workshop</span></span>`);
      // The figures in the drawing of the △ mark are SVG coordinates, not text.
      expect(row.replace(/<svg[\s\S]*?<\/svg>/g, '')).not.toMatch(/<a\b|href|<time|\d/);
    }
  });

  test('Credit in the index: next to the poster of 001', () => {
    const row = /<li class="index__row" data-sheet="001">[\s\S]*?<\/li>/.exec(index())![0];
    expect(row).toContain(CAT_CREDIT.text.replace(/"/g, '&quot;'));
  });

  test('Landings outside the collection: neither Game Center nor Wind-Up in the museum', () => {
    expect(body()).not.toMatch(/Game Center|Wind-Up|game-center|wind-up/);
  });
});
