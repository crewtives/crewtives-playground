// The queue ticket (under the key) and the Construction plate: the active job with its cost and
// time, the spring bar, turns, "+1 turn" and "Let go", the wind state chip, the list of buildings
// with their "Queue" buttons (cost, time and the reason when disabled) and the three-slot queue:
// dashed = queued, solid = running.
import {
  BUILDING_NAMES,
  DETENTS_PER_TURN,
  QUEUE_SIZE,
  formatRate,
  levelCost,
  turnsNeeded,
  type BuildingId,
  type Economy,
  type Job,
} from '../economy';
import { clank } from '../voices';
import { keySvgPath } from './rosette';
import { numHtml } from './num';
import { coilProgress, stubState, stubText } from './keyStub';

/** Tickets visible on the spike; the rest collapse into a count. */
const SPIKE_VISIBLE = 6;
const KEY_PATH = keySvgPath(27);

const ARROW = '<svg class="icon arrow" aria-hidden="true"><use href="#i-arrow-right" /></svg><span class="vh">to</span>';
const BUILDINGS: BuildingId[] = ['mine', 'gantry', 'observatory'];

function jobHtml(job: Job): string {
  return `${BUILDING_NAMES[job.building]} ${ARROW} Lv ${job.level} · <span class="num">${job.cost}</span> tin · <span class="num">${job.time}</span> s`;
}

export interface BuildDeskOptions {
  economy: Economy;
  reduced: () => boolean;
  /** "+1 turn": the same reserve as the keys. */
  wind: (detents: number) => void;
  /** "Let go". */
  release: () => void;
  /**
   * Where the key is a tile and the ticket sits below it (a media query): there the key's tag mirrors
   * the queue as a stub, a coil along the tile shows the job's progress and an empty ticket links to
   * the side panel (design adapt-for-phones D8). The three exist only while the query matches.
   */
  tileQuery?: string;
}

/** How long the key's stub shows "LV n" after a CLACK (ms). */
const STUB_STAMP_MS = 1200;

/** The phone-only pieces the build desk writes (created under `tileQuery`). */
interface TilePieces {
  stub: HTMLElement;
  coil: HTMLElement;
  coilFill: HTMLElement;
  deckLink: HTMLAnchorElement;
}

export class BuildDesk {
  private readonly economy: Economy;
  private readonly ticket = document.querySelector<HTMLElement>('#ticket')!;
  private readonly job = document.querySelector<HTMLElement>('#ticket-job')!;
  private readonly coil = document.querySelector<HTMLElement>('#ticket-coil')!;
  private readonly turns = document.querySelector<HTMLElement>('#ticket-turns')!;
  private readonly chip = document.querySelector<HTMLElement>('#spring-chip')!;
  private readonly slots = Array.from(document.querySelectorAll<HTMLElement>('.queue-slot'));
  private readonly letGo = document.querySelector<HTMLButtonElement>('[data-let-go]')!;
  private readonly spikeList = document.querySelector<HTMLOListElement>('#spike-tickets')!;
  private readonly spikeNote = document.querySelector<HTMLElement>('#spike-note')!;
  private readonly flatTurns = document.querySelector<HTMLElement>('#flat-key-turns');
  private readonly flatKeys = Array.from(document.querySelectorAll<SVGSVGElement>('.key-flat'));
  private readonly spike: Job[] = [];
  private last = '';
  private lastKeyAngle = -1;
  private tile: TilePieces | null = null;
  private stampUntil = 0;
  private stampTimer = 0;

  constructor(private readonly o: BuildDeskOptions) {
    this.economy = o.economy;
    if (o.tileQuery) {
      const gate = window.matchMedia(o.tileQuery);
      const sync = () => {
        if (gate.matches && !this.tile) this.createTile();
        else if (!gate.matches && this.tile) this.removeTile();
      };
      gate.addEventListener('change', sync);
      sync();
    }
    for (const svg of this.flatKeys) svg.querySelector('.key-flat-path')!.setAttribute('d', KEY_PATH);
    document.querySelector('[data-wind-turn]')!.addEventListener('click', () => {
      o.wind(DETENTS_PER_TURN);
      this.render();
    });
    this.letGo.addEventListener('click', () => {
      o.release();
      this.render();
    });
  }

  /** The stub (in the key's tag), the coil (along the key's tile) and the deck link (in the ticket). */
  private createTile(): void {
    const tag = document.querySelector<HTMLElement>('.key-tag');
    const wrap = document.querySelector<HTMLElement>('.key-wrap');
    if (!tag || !wrap) return;
    const stub = document.createElement('span');
    stub.className = 'key-stub';
    tag.prepend(stub);
    const coil = document.createElement('span');
    coil.className = 'key-coil';
    coil.setAttribute('aria-hidden', 'true');
    const coilFill = document.createElement('span');
    coilFill.className = 'key-coil-fill';
    coil.append(coilFill);
    wrap.append(coil);
    const deckLink = document.createElement('a');
    deckLink.className = 'ticket-deck-link';
    deckLink.href = '#deck';
    deckLink.innerHTML = 'Queue a build <svg class="icon" aria-hidden="true"><use href="#i-arrow-down" /></svg>';
    this.job.after(deckLink);
    this.tile = { stub, coil, coilFill, deckLink };
    this.last = '';
    this.render();
  }

  private removeTile(): void {
    if (!this.tile) return;
    this.tile.stub.remove();
    this.tile.coil.remove();
    this.tile.deckLink.remove();
    this.tile = null;
    delete this.ticket.dataset.empty;
    window.clearTimeout(this.stampTimer);
    this.stampUntil = 0;
  }

  /** Writes the stub and the coil from the economy; the stub keeps its "LV n" stamp while it lasts. */
  private renderTile(): void {
    const tile = this.tile;
    if (!tile) return;
    const e = this.economy;
    tile.coilFill.style.width = `${(coilProgress(e) * 100).toFixed(1)}%`;
    const empty = e.state.queue.length === 0;
    if (empty) this.ticket.dataset.empty = '';
    else delete this.ticket.dataset.empty;
    if (performance.now() < this.stampUntil) return;
    tile.stub.classList.remove('is-stamped');
    tile.stub.innerHTML = numHtml(stubText(stubState(e)));
  }

  /** Empties the spike (Reset universe). */
  clearSpike(): void {
    this.spike.length = 0;
    this.renderSpike();
  }

  private renderSpike(): void {
    const visible = this.spike.slice(-SPIKE_VISIBLE).reverse();
    this.spikeList.replaceChildren(
      ...visible.map((job, i) => {
        const li = document.createElement('li');
        li.className = 'spike-ticket';
        li.style.setProperty('--i', String(i));
        li.innerHTML = `${BUILDING_NAMES[job.building]} ${ARROW} <span class="spike-lv">Lv <span class="num">${job.level}</span></span>`;
        return li;
      }),
    );
    const below = this.spike.length - visible.length;
    this.spikeNote.textContent = this.spike.length ? (below > 0 ? `+${below} below` : '') : 'Finished builds land here.';
  }

  /** CLACK: the ticket pulses and the level stamp drops. */
  clack(job: Job): void {
    clank();
    this.spike.push(job);
    this.renderSpike();
    const stamp = document.createElement('span');
    stamp.className = 'lv-stamp';
    stamp.textContent = `LV ${job.level}`;
    this.ticket.append(stamp);
    window.setTimeout(() => stamp.remove(), 1400);
    // The same stamp on the key's stub, in place, for 1.2 s (a cut under reduced motion).
    if (this.tile) {
      const stub = this.tile.stub;
      stub.innerHTML = numHtml(`LV ${job.level}`);
      stub.classList.remove('is-stamped');
      void stub.offsetWidth;
      stub.classList.add('is-stamped');
      this.stampUntil = performance.now() + STUB_STAMP_MS;
      window.clearTimeout(this.stampTimer);
      this.stampTimer = window.setTimeout(() => {
        this.stampUntil = 0;
        this.renderTile();
      }, STUB_STAMP_MS);
    }
    if (!this.o.reduced()) {
      this.ticket.animate(
        [
          { transform: 'scale(1.06) translateY(1px)' },
          { transform: 'scale(1) translateY(0)' },
        ],
        { duration: 90, easing: 'cubic-bezier(0.2, 0.9, 0.1, 1)' },
      );
    }
  }

  render(): void {
    const e = this.economy;
    const s = e.state;
    // The flat keys turn in detents (45° steps) with the stored wind.
    const angle = e.detents * 45;
    if (angle !== this.lastKeyAngle) {
      this.lastKeyAngle = angle;
      for (const svg of this.flatKeys) svg.style.rotate = `${angle}deg`;
      if (this.flatTurns) this.flatTurns.innerHTML = numHtml(`${e.turns} of 12 turns`);
    }
    const active = s.queue[0];
    const key = JSON.stringify([s.queue, Math.round(s.spring * 10), s.mode, Math.floor(s.tin), s.levels]);
    if (key === this.last) return;
    this.last = key;
    this.renderTile();

    // Ticket
    if (active) {
      this.job.innerHTML = jobHtml(active);
      this.coil.style.width = `${Math.min(100, (active.progress / active.time) * 100)}%`;
      const needed = turnsNeeded(e);
      this.turns.innerHTML = `<span class="num">${needed}</span> turn${needed === 1 ? '' : 's'} needed · <span class="num">${e.turns}</span> wound`;
    } else {
      this.job.textContent = 'Nothing queued. Queue a build on the box side.';
      this.coil.style.width = '0%';
      this.turns.innerHTML = `<span class="num">${e.turns}</span> wound`;
    }
    this.letGo.disabled = e.storedSeconds <= 0 || s.mode === 'running';
    const chip = { winding: 'WINDING · REWIND', running: 'RUNNING · FORWARD', hold: 'HOLD', idle: '' }[s.mode];
    this.chip.hidden = !chip;
    this.chip.textContent = chip;
    this.chip.dataset.state = s.mode;

    // Construction
    for (const building of BUILDINGS) {
      const row = document.querySelector<HTMLElement>(`.build-row[data-building="${building}"]`)!;
      const level = s.levels[building];
      row.querySelector('.build-level')!.innerHTML = level ? `Lv <span class="num">${level}</span>` : 'Not built';
      row.querySelector('.build-effect')!.textContent = effectText(building, level);
      const button = row.querySelector<HTMLButtonElement>('.build-queue')!;
      const next = e.nextLevel(building);
      const price = levelCost(building, next);
      const why = e.whyNot(building);
      button.innerHTML = price
        ? `Queue Lv ${next} · <span class="num">${price.cost}</span> tin · <span class="num">${price.time}</span> s`
        : 'Top level';
      button.disabled = why !== null;
      row.querySelector('.build-why')!.textContent = why ?? '';
    }

    // Three-slot queue
    this.slots.forEach((slot, i) => {
      const job = s.queue[i];
      slot.classList.toggle('is-running', i === 0 && !!job && (s.mode === 'running' || s.mode === 'hold'));
      slot.classList.toggle('is-queued', !!job && !(i === 0 && s.mode === 'running'));
      slot.classList.toggle('is-empty', !job);
      slot.innerHTML = job ? `${BUILDING_NAMES[job.building]} ${ARROW} Lv ${job.level}` : 'Empty slot';
    });
    this.slots[0]?.parentElement?.setAttribute('aria-label', `Build queue, ${s.queue.length} of ${QUEUE_SIZE} slots used`);
  }
}

function effectText(building: BuildingId, level: number): string {
  if (building === 'mine') return `${formatRate(1.2 * Math.pow(1.35, level - 1)).replace('/s', ' tin/s')}`;
  if (building === 'gantry') return `${level} rocket${level === 1 ? '' : 's'} in flight`;
  return level ? `Press rows open: ${level} of 3` : 'Unlocks press research';
}
