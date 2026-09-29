// The "Survey log": every toy action writes a deterministic sentence. The list is a polite live
// region; the lid shows the four newest (the newest on top, with a stamp).

const KEEP = 24;

export class SurveyLog {
  constructor(private readonly list: HTMLOListElement) {}

  add(line: string): void {
    const item = document.createElement('li');
    item.textContent = line;
    this.list.prepend(item);
    while (this.list.children.length > KEEP) this.list.lastElementChild?.remove();
  }

  /** The visible lines, from newest to oldest. */
  lines(): string[] {
    return Array.from(this.list.children, (li) => li.textContent ?? '');
  }

  clear(): void {
    this.list.replaceChildren();
  }
}
