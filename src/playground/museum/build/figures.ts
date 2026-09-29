// Automatic figure check (D15, task 6.7): every visible figure in the museum has a declared source.
// The render marks each figure with `data-fig="<source>"`; here it is recomputed from that source and
// compared. Text outside a mark cannot contain figures (except proper names with digits, such as
// 4D.OS), and if it does, they are reported with their context.

import { BUILD_STAMP, CAT_CREDIT } from '../../shared/worlds';
import { METHOD_SHEET, SHEETS } from '../collection';
import { REFERENCES } from '../references';
import type { Manifest } from './manifest';
import { commitUrl, mathText, provenanceLine, RATIO_LABEL } from './render';

/** Proper names with digits: they are not figures. */
const NAMES = /\b4D\.OS\b|\b[34]D\b|\bWebGL2?\b/g;

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Visible text: no scripts, styles, comments, or SVG titles and descriptions. */
function visibleHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|title|desc)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
}

/** Expected value of a source, as text; null if the source does not exist. */
function expected(source: string, manifest: Manifest): string[] | null {
  const [kind, key] = source.split(':');
  const sheet = (n: string) => manifest.sheets.find((s) => s.sheet.number === n);
  const loop = (id: string) => manifest.sheets.flatMap((s) => s.loops).find((l) => l.id === id)?.provenance ?? null;
  switch (kind) {
    case 'sheet':
      return [...SHEETS.map((s) => s.number), METHOD_SHEET.number];
    case 'dims':
      return sheet(key)?.pack ? [sheet(key)!.pack!.dims] : null;
    case 'weight':
      return sheet(key)?.pack ? [sheet(key)!.pack!.weight] : null;
    case 'date':
      return sheet(key) ? [sheet(key)!.created] : null;
    case 'rule': {
      const rule = SHEETS.find((s) => s.number === key)?.rule;
      return rule ? [textOf(mathText(rule.text))] : null;
    }
    case 'loop':
      return loop(key) ? [provenanceLine(loop(key)!)] : null;
    case 'recorded':
      return loop(key) ? [loop(key)!.recorded] : null;
    case 'stamp':
      return [BUILD_STAMP];
    case 'credit':
      return [CAT_CREDIT.text];
    case 'ratio':
      // Ratio of the sheet's columns, from COLUMNS (the same one the full grid labels).
      return [RATIO_LABEL];
    case 'ref': {
      const ref = REFERENCES.find((r) => r.id === key);
      return ref ? [textOf(ref.html)] : null;
    }
    default:
      return null;
  }
}

/** Links a figure has to carry: the provenance line links its loop's commit. */
function expectedLinks(source: string, manifest: Manifest): string[] {
  const [kind, key] = source.split(':');
  if (kind !== 'loop') return [];
  const p = manifest.sheets.flatMap((s) => s.loops).find((l) => l.id === key)?.provenance;
  return p ? [commitUrl(p.commit)] : [];
}

/** Figure problems in the museum's HTML (empty if every figure has a source and matches it). */
export function checkFigures(html: string, manifest: Manifest): string[] {
  const problems: string[] = [];
  let rest = visibleHtml(html);
  const open = /<span data-fig="([^"]+)">/g;
  for (;;) {
    open.lastIndex = 0;
    const match = open.exec(rest);
    if (!match) break;
    // Balanced closing tag of this span (it may contain spans).
    let depth = 1;
    let i = match.index + match[0].length;
    const tag = /<\/?span\b[^>]*>/g;
    tag.lastIndex = i;
    let end = -1;
    for (let t = tag.exec(rest); t; t = tag.exec(rest)) {
      depth += t[0][1] === '/' ? -1 : 1;
      if (depth === 0) {
        end = t.index;
        i = tag.lastIndex;
        break;
      }
    }
    if (end < 0) {
      problems.push(`marked figure without a closing tag (${match[1]})`);
      break;
    }
    const inner = rest.slice(match.index + match[0].length, end);
    const value = textOf(inner);
    const allowed = expected(match[1], manifest);
    if (!allowed) problems.push(`"${value}": the source "${match[1]}" does not exist`);
    else if (!allowed.includes(value)) problems.push(`"${value}": does not match its source "${match[1]}" (${allowed.slice(0, 3).join(' | ')})`);
    for (const link of expectedLinks(match[1], manifest)) {
      if (!inner.includes(`href="${link}"`)) problems.push(`"${value}": does not link ${link}`);
    }
    rest = rest.slice(0, match.index) + ' ' + rest.slice(i);
  }
  // What remains, with the tags as separators (so "Series" and "4D.OS" do not run together).
  const text = decode(rest.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(NAMES, '');
  for (const m of text.matchAll(/\d+(?:[.,:–-]\d+)*/g)) {
    const at = m.index ?? 0;
    problems.push(`figure without a source "${m[0]}": …${text.slice(Math.max(0, at - 40), at + m[0].length + 20)}…`);
  }
  return problems;
}
