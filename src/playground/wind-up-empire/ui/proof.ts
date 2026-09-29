// The proof print: "Every moment of your visit, at once." A 1200×900 image composed in the browser
// with every rocket exposure since load (up to 5,000), the planets' rings, the key's rosette and a
// caption in Sono with the session's numbers and the local date and time. It is composed when the
// section is entered and on "Reprint". "Save the print (PNG)" downloads it with its provenance in a
// tEXt chunk, without any network request.
import type { DisplayMode } from '../../../engine/display/RetroDisplay';
import type { Fleet } from '../fleet';
import { WORLD_BODIES } from '../orbits';
import { PAGE_INKS, drawOrrery } from '../print2d';
import { withTextChunk } from '../pngText';
import type { Rosette } from './rosette';
import { numRuns } from './num';

export const PROOF_W = 1200;
export const PROOF_H = 900;
const MARGIN = 26;
const CAPTION_H = 78;

export interface ProofOptions {
  canvas: HTMLCanvasElement;
  fleet: Fleet;
  rosette: Rosette;
  /** Turns wound during the session. */
  turnsWound: () => number;
  fold: () => number;
  mode: () => DisplayMode;
  status: HTMLElement;
}

/** "WIND-UP EMPIRE · proof of a visit · 12 flights · 3 charted · 7 turns wound · 2026-09-25 14:02". */
export function proofCaption(flights: number, charted: number, turns: number, when: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return `WIND-UP EMPIRE · proof of a visit · ${plural(flights, 'flight', 'flights')} · ${charted} charted · ${plural(turns, 'turn', 'turns')} wound · ${date}`;
}

/** Writes a line in runs: words with `words`, digits with `digits` (Sono is only for digits). */
function fillRuns(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, words: string, digits: string): void {
  let at = x;
  for (const run of numRuns(text)) {
    ctx.font = run.num ? digits : words;
    ctx.fillText(run.text, at, y);
    at += ctx.measureText(run.text).width;
  }
}

export class Proof {
  caption = '';
  private printedAt = new Date();

  constructor(private readonly o: ProofOptions) {}

  async print(): Promise<void> {
    const { canvas, fleet } = this.o;
    try {
      await Promise.all([document.fonts.load('600 20px Sono'), document.fonts.load('700 20px "Libre Franklin"'), document.fonts.load('500 14px "Libre Franklin"')]);
    } catch {
      // without the fonts, the caption falls back to the system fonts
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // The image bleeds to the edges and, below it, the paper strip holds the caption.
    ctx.fillStyle = PAGE_INKS.paper;
    ctx.fillRect(0, 0, PROOF_W, PROOF_H);
    const field = { x: 0, y: 0, w: PROOF_W, h: PROOF_H - CAPTION_H };
    drawOrrery(ctx, {
      cx: field.x + field.w / 2,
      cy: field.y + field.h / 2 + 10,
      scale: 108,
      angles: WORLD_BODIES.map((w) => fleet.planetAngle(w)),
      charted: fleet.charted,
      exposures: fleet.exposures,
      fold: this.o.fold(),
      mode: this.o.mode(),
      stars: 180,
      field,
    });

    // The key's rosette, on its plate, at the lower left of the image.
    const rs = 176;
    const rx = field.x + 22;
    const ry = field.y + field.h - rs - 22;
    const stamped = this.o.rosette.stamps > 0;
    ctx.beginPath();
    ctx.arc(rx + rs / 2, ry + rs / 2, rs / 2 + 6, 0, Math.PI * 2);
    ctx.strokeStyle = PAGE_INKS.tin;
    ctx.lineWidth = 3;
    if (stamped) {
      ctx.fillStyle = PAGE_INKS.spaceDeep;
      ctx.fill();
      ctx.stroke();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.o.rosette.canvas, rx, ry, rs, rs);
      ctx.imageSmoothingEnabled = true;
    } else {
      // No turns yet: the plate stays uncast, dotted like everything that does not exist yet.
      ctx.setLineDash([3, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = PAGE_INKS.tin;
    ctx.font = '700 13px "Libre Franklin", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stamped ? 'KEY ROSETTE' : 'NO TURNS YET', rx + rs / 2, stamped ? ry + rs + 20 : ry + rs / 2 + 5);

    // Caption on the paper: words in Libre Franklin, digits in Sono.
    this.printedAt = new Date();
    this.caption = proofCaption(fleet.flightsFlown, fleet.charted.size, this.o.turnsWound(), this.printedAt);
    ctx.textAlign = 'left';
    ctx.fillStyle = PAGE_INKS.ink;
    fillRuns(ctx, this.caption, MARGIN, PROOF_H - CAPTION_H + 34, '700 19px "Libre Franklin", system-ui, sans-serif', '600 19px Sono, ui-monospace, monospace');
    ctx.fillStyle = PAGE_INKS.tinShade;
    fillRuns(
      ctx,
      `${fleet.exposures.length} exposures · synthetic print, made in the browser by the Wind-Up Empire landing`,
      MARGIN,
      PROOF_H - CAPTION_H + 60,
      '500 14px "Libre Franklin", system-ui, sans-serif',
      '500 14px Sono, ui-monospace, monospace',
    );
    canvas.setAttribute(
      'aria-label',
      `Proof print of your visit: ${fleet.exposures.length} rocket exposures, ${fleet.charted.size} of 5 planets charted and the key's rosette. ${this.caption}.`,
    );
    this.o.status.textContent = `Printed: ${this.caption}.`;
  }

  /** Downloads the PNG with its provenance in tEXt. Nothing leaves the page. */
  async save(): Promise<void> {
    const blob = await new Promise<Blob | null>((resolve) => this.o.canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const stamped = withTextChunk(
      withTextChunk(bytes, 'Description', `Synthetic print of a visit, composed in the browser by the Wind-Up Empire landing (crewtives playground, demo build 0.1). ${this.caption}.`),
      'Software',
      'Wind-Up Empire landing, crewtives playground',
    );
    const url = URL.createObjectURL(new Blob([stamped as BlobPart], { type: 'image/png' }));
    const a = document.createElement('a');
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = this.printedAt;
    a.href = url;
    a.download = `wind-up-empire-proof-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.o.status.textContent = 'Print saved as a PNG. Nothing was uploaded.';
  }
}
