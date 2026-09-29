// Sono is only for digits: words are set in Libre Franklin and each run of digits (with its sign
// and decimal point) goes in a <span class="num">. The text comes from the page itself, not from the
// visitor, but it is escaped anyway.
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function numHtml(text: string): string {
  return text
    .replace(/[&<>"]/g, (c) => ESCAPES[c])
    .replace(/[+−-]?\d(?:[\d.,:]|-(?=\d))*/g, (run) => {
      // A trailing period belongs to the sentence, not to the number.
      const tail = run.endsWith('.') || run.endsWith(',') || run.endsWith(':') ? run.slice(-1) : '';
      const digits = tail ? run.slice(0, -1) : run;
      return `<span class="num">${digits}</span>${tail}`;
    });
}

/** Runs of words and of digits, for writing on a canvas with two fonts. */
export function numRuns(text: string): { text: string; num: boolean }[] {
  const runs: { text: string; num: boolean }[] = [];
  const pattern = /[+−-]?\d(?:[\d.,:-]*\d)?/g;
  let last = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), num: false });
    runs.push({ text: m[0], num: true });
    last = pattern.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), num: false });
  return runs;
}
