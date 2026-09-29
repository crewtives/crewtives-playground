// The static page against the index's shared data (worlds.ts): routes, lines, the "synthetic scene"
// label, the cat credit next to A, B and C, the launcher and three sockets without a link. Also
// the honest sentences the spec pins down. The HTML is read exactly as it is published (no JS).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILD_STAMP, CAT_CREDIT, LAUNCHER, NOT_IN_COLLECTION_LINE, WORLDS, checkBackLink, checkIndexHtml } from '../shared/worlds';

const html = readFileSync(resolve(import.meta.dirname, '../../../sites/playground/landings/wind-up-empire/index.html'), 'utf8');
const licenses = readFileSync(resolve(import.meta.dirname, '../../../LICENSES.md'), 'utf8');

function section(id: string): string {
  const start = html.indexOf(`id="${id}"`);
  const end = html.indexOf('</section>', start);
  return html.slice(start, end);
}

/** Approximate visible text: no tags, and no <svg>, <script>, <style> or comments. */
function visibleText(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(svg|script|style)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function cavity(world: string): string {
  const start = html.indexOf(`data-world="${world}"`);
  return html.slice(start, html.indexOf('</li>', start));
}

describe('Wind-Up Empire static page', () => {
  it('meets the shared index: checkIndexHtml finds no problems', () => {
    expect(checkIndexHtml(html)).toEqual([]);
  });

  it('title, language and description', () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Wind-Up Empire · crewtives playground</title>');
    expect(html).toMatch(/<meta\s+name="description"/);
  });

  it('the faces of the box in order: lid, tray (#worlds, second), side panel, instruction sheet and proof', () => {
    const order = ['id="lid"', 'id="worlds"', 'id="deck"', 'id="leaflet"', 'id="proof"'].map((s) => html.indexOf(s));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('the first focusable element is "Skip to the worlds" and the band leads to the tray', () => {
    const body = html.slice(html.indexOf('<body>'));
    const firstFocusable = body.match(/<(a|button|input)\b[^>]*>/)![0];
    expect(firstFocusable).toContain('href="#worlds"');
    expect(body).toContain('>Skip to the worlds</a>');
    expect(section('lid')).toMatch(/href="#worlds">Five real worlds inside · Open the box/);
  });

  it('five worlds with an image, a line, the synthetic label and a real link to their route', () => {
    for (const world of WORLDS) {
      const c = cavity(world.id);
      expect(c).toContain(`src="${world.still}"`);
      expect(c).toContain('loading="lazy"');
      expect(c).toContain(`alt="${world.alt}"`);
      expect(c).toContain(world.line.replace(/'/g, "'"));
      expect(c).toContain(`href="${world.route}"`);
      expect(c.toLowerCase()).toContain('synthetic scene');
      expect(c).toContain(`${world.letter}</span>`);
    }
  });

  it('the cat credit, verbatim from LICENSES.md, next to A, B and C and only there', () => {
    expect(licenses).toContain('"Cat" by J-Toastie, CC-BY 3.0');
    for (const world of WORLDS) {
      const c = cavity(world.id);
      if (world.credit) expect(c).toContain(CAT_CREDIT.text);
      else expect(c).not.toContain('J-Toastie');
    }
  });

  it('the launcher and exactly three lab sockets, with no link, name or date', () => {
    const tray = section('worlds');
    expect(tray).toContain(`href="${LAUNCHER.route}"`);
    expect(tray).toContain(LAUNCHER.line);
    const labs = tray.split('class="cavity cavity-lab"').slice(1).map((s) => s.slice(0, s.indexOf('</li>')));
    expect(labs).toHaveLength(3);
    for (const lab of labs) {
      expect(lab).not.toContain('<a ');
      expect(lab).not.toMatch(/20\d\d/);
      expect(lab).toContain("Empty socket · in the lab. The next experiment isn't cast yet.");
    }
    const links = tray.match(/href="\/4d-os\/[a-e]?\/?"/g) ?? [];
    expect(new Set(links).size).toBe(6);
  });

  it('honest sentences: fake economy three times, what it stores and sends, no "no tracking"', () => {
    expect(html).toContain('Demo model · Fake economy · Resets on reload');
    expect(html).toContain('Every number here is made up by this page. The springs, orbits and dither are real.');
    expect(html).toContain('This page stores nothing and sends nothing. The one exception: your sound setting stays in this browser.');
    expect(html.toLowerCase()).not.toContain('no tracking');
  });

  it('footer: build stamp, credits and the not-in-the-collection line (Footer credits)', () => {
    const footer = html.slice(html.indexOf('<footer'));
    expect(footer).toContain(`Printed live in 16 inks by your browser · crewtives playground · ${BUILD_STAMP}`);
    expect(footer).toContain('Type: Tilt Warp, Rampart One, Libre Franklin and Sono, SIL Open Font License.');
    expect(footer).toContain(CAT_CREDIT.text);
    expect(footer).toContain('(worlds A–C)');
    expect(visibleText(footer)).toContain(NOT_IN_COLLECTION_LINE);
    expect(footer).toContain('href="https://crewtives.com"');
    expect(footer).toContain('href="/4d-os/"');
  });

  it('"Playground" leads to the museum behind a vector arrow (Back to the museum)', () => {
    const footer = html.slice(html.indexOf('<footer'));
    expect(checkBackLink(footer, { href: '/', text: 'Playground', arrow: 'icon' })).toEqual([]);
    expect(html).toContain('<symbol id="i-arrow-left"');
  });

  it('no longer a candidate: not the word, no links to /landings/, no ← character (No longer a candidate)', () => {
    const visible = visibleText(html.slice(html.indexOf('<body')));
    expect(visible).not.toMatch(/candidat/i);
    expect(visible).not.toContain('←');
    expect(html).not.toMatch(/href="\/landings\/"/);
    expect(visible).toContain('Wind-Up Empire is a landing of the crewtives playground, not in its collection yet.');
  });

  it('every toy is cast: no "not cast" socket is left on the page', () => {
    expect(html).not.toContain('socket-unset');
    expect(html.toLowerCase()).not.toContain('not cast yet');
    expect(html).toContain('aria-label="Rub the spark wheel"');
    expect(html).toMatch(/id="key" data-key/);
    expect(html).toContain('class="flat-key-dial" data-key');
    expect(section('lid')).toContain('drag round · or hold Space');
    for (const world of WORLDS) expect(cavity(world.id)).toContain(`data-top="${world.id}"`);
    expect(section('worlds')).toContain('data-launcher-tops');
  });

  it('the press: three rows locked by the observatory, with the "Skip the grind" path in view', () => {
    const deck = html.slice(html.indexOf('id="deck"'), html.indexOf('id="leaflet"'));
    for (const [row, level] of [['inks', 1], ['memory', 2], ['symmetry', 3]] as const) {
      const start = deck.indexOf(`data-row="${row}"`);
      const fieldset = deck.slice(start, deck.indexOf('</fieldset>', start));
      expect(fieldset).toContain(`Needs Observatory Lv ${level}`);
      expect(fieldset).toContain(`data-research="${row}"`);
    }
    expect(deck).toContain('>One-ink press<');
    expect(deck).toContain('>16-ink litho<');
    expect(deck).toContain('>Full process<');
    expect(deck.match(/data-skip-grind/g)).toHaveLength(1);
    expect(html.match(/data-skip-grind/g)).toHaveLength(2);
    expect(html.match(/data-reset/g)).toHaveLength(2);
  });

  it('the proof: a 1200×900 canvas, buttons and the note that nothing is uploaded', () => {
    const proof = section('proof');
    expect(proof).toMatch(/<canvas class="proof-canvas" id="proof-canvas" width="1200" height="900"/);
    expect(proof).toContain('>Save the print (PNG)</button>');
    expect(proof).toContain('>Reprint</button>');
    expect(proof).toContain('Made in your browser. Nothing is uploaded.');
    expect(proof.match(/class="reg /g)).toHaveLength(4);
  });

  it('without WebGL2, the lid labels the printed flight', () => {
    expect(section('lid')).toContain('Printed flight (static view).');
  });

  it('the art direction contract does not leak onto the page', () => {
    for (const leak of ['852db97b', 'THESIS', 'OWN-WORLD', 'FIRST VIEWPORT', 'unreviewed and undocumented', 'Zen Maru']) {
      expect(html).not.toContain(leak);
    }
  });
});
