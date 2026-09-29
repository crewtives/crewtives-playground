// The crane cabinet (3F): joins the pure simulation, the 3D view and the DOM (buttons ① ② with
// press-and-hold semantics, panel readout, live region, ticket printer and ticket holder).
import type { Engine, EngineView } from '../../../engine/engine/Engine';
import { bindWindowTrail } from '../../../engine/shell/windowTrail';
import { motion } from '../../shared/motion';
import { LAUNCHER, WORLDS } from '../../shared/worlds';
import { hum, sfx, type Hum } from '../sfx';
import { CraneSim, STEP, type Capsule, type CraneEvent } from './sim';
import { emblemDataUrl, stickerPng } from './sticker';
import type { CraneView } from './view';

export const RACK_MAX = 6;

/** Name of a capsule for the live region ("capsule D", "a sticker capsule"). */
export function capsuleName(capsule: Capsule): string {
  const c = capsule.content;
  if (c.kind === 'sticker') return 'a sticker capsule';
  if (c.id === 'launcher') return 'the launcher capsule';
  return `capsule ${c.id.toUpperCase()}`;
}

/** Text of the prize announcement (the one in the spec: "Prize: world E, Whale fall. Ticket link added."). */
export function prizeAnnouncement(capsule: Capsule): string {
  const c = capsule.content;
  if (c.kind === 'sticker') return `Prize: a studio sticker, seed ${c.seed}. Ticket added.`;
  if (c.id === 'launcher') return 'Prize: the 4D.OS launcher. Ticket link added.';
  const world = WORLDS.find((w) => w.id === c.id)!;
  return `Prize: world ${world.letter}, ${world.name}. Ticket link added.`;
}

export interface CraneMachineOptions {
  engine: Engine;
  view: CraneView;
  sim: CraneSim;
  root: HTMLElement;
}

export class CraneMachine {
  readonly sim: CraneSim;
  private readonly engine: Engine;
  private readonly view: CraneView;
  private readonly engineView: EngineView;
  private readonly root: HTMLElement;
  private readonly buttons: Record<1 | 2, HTMLButtonElement | null>;
  private readonly readout: HTMLElement | null;
  private readonly live: HTMLElement | null;
  private readonly rack: HTMLOListElement | null;
  private readonly rackEmpty: HTMLElement | null;
  private holding: 1 | 2 | 0 = 0;
  private acc = 0;
  private motor: Hum | null = null;
  private printed = 0;

  constructor(options: CraneMachineOptions) {
    this.engine = options.engine;
    this.view = options.view;
    this.sim = options.sim;
    this.root = options.root;
    const q = <T extends HTMLElement>(sel: string) => this.root.querySelector<T>(sel);
    this.buttons = { 1: q('[data-crane-btn="1"]'), 2: q('[data-crane-btn="2"]') };
    this.readout = q('[data-crane-readout]');
    this.live = document.querySelector('[data-live-crane]');
    this.rack = document.querySelector('[data-rack]');
    this.rackEmpty = document.querySelector('[data-rack-empty]');
    this.view.setSim(this.sim);

    this.engineView = { element: this.view.element, render: (r, rect) => this.view.render(r, rect) };
    this.engine.add(this.engineView);
    this.engine.addTicker((dt) => this.tick(dt));
    this.bind();
    this.paint();
  }

  invalidate(): void {
    this.engine.invalidate(this.engineView);
  }

  private tick(dt: number): boolean {
    const sim = this.sim;
    const active = sim.busy || this.holding !== 0 || sim.phase === 'settle';
    if (!active) {
      this.motorOff();
      return false;
    }
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      sim.step();
    }
    this.drain();
    const moving = sim.phase === 'x' || sim.phase === 'z' || sim.phase === 'drop' || sim.phase === 'lift' || sim.phase === 'return';
    if (moving) this.motorOn();
    else this.motorOff();
    this.paint();
    this.invalidate();
    return true;
  }

  private motorOn(): void {
    if (!this.motor) this.motor = hum(70, 'sawtooth', 400, 0.06);
  }

  private motorOff(): void {
    this.motor?.stop();
    this.motor = null;
  }

  private drain(): void {
    for (const event of this.sim.events.splice(0)) this.onEvent(event);
  }

  private onEvent(event: CraneEvent): void {
    switch (event.type) {
      case 'over':
        this.say(event.capsule ? `Claw over ${capsuleName(event.capsule)}` : 'Claw over the floor, no capsule under it');
        break;
      case 'grabbed':
        sfx.clack();
        this.say('Grabbed');
        break;
      case 'nudged':
        sfx.clack();
        this.say(`The claw nudged ${capsuleName(event.capsule)}`);
        break;
      case 'empty':
        sfx.clack();
        break;
      case 'slipped':
        this.say('Slipped');
        break;
      case 'bounce':
        sfx.tick();
        break;
      case 'prize':
        this.print(event.capsule);
        break;
      case 'miss':
        this.say('No prize this time. The buttons are lit again.');
        break;
      default:
        break;
    }
  }

  private say(text: string): void {
    if (this.live) this.live.textContent = text;
  }

  /** Panel readout in DotGothic16: which button comes next and what state the machine is in. */
  private paint(): void {
    const sim = this.sim;
    const ready1 = sim.phase === 'ready' && !sim.used1;
    const ready2 = sim.phase === 'waitz' || sim.phase === 'z';
    for (const [n, lit] of [[1, ready1 || sim.phase === 'x'], [2, ready2]] as const) {
      const btn = this.buttons[n];
      if (!btn) continue;
      btn.classList.toggle('is-lit', lit);
      btn.setAttribute('aria-disabled', String(!lit));
    }
    let text = 'FREE PLAY · HOLD 1';
    if (sim.phase === 'x') text = 'MOVING RIGHT';
    else if (sim.phase === 'waitz') text = 'HOLD 2';
    else if (sim.phase === 'z') text = 'MOVING BACK · LET GO TO DROP';
    else if (sim.phase !== 'ready') text = 'PLAY';
    if (this.readout && this.readout.textContent !== text) this.readout.textContent = text;
    this.root.dataset.phase = sim.phase;
  }

  private down(n: 1 | 2): void {
    if (this.holding) return;
    if (!this.sim.press(n)) return;
    this.holding = n;
    sfx.click();
    this.buttons[n]?.classList.add('is-down');
    this.paint();
    this.engine.requestFrame();
  }

  private up(n: 1 | 2): void {
    if (this.holding !== n) return;
    this.holding = 0;
    this.buttons[n]?.classList.remove('is-down');
    this.sim.release(n);
    if (n === 2 && motion.reduced) {
      // Reduced motion: the attempt jumps to its result and is exposed all at once.
      this.sim.resolve();
      this.drain();
    }
    this.paint();
    this.invalidate();
    this.engine.requestFrame();
  }

  private bind(): void {
    for (const n of [1, 2] as const) {
      const btn = this.buttons[n];
      if (!btn) continue;
      btn.disabled = false;
      btn.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        btn.setPointerCapture(event.pointerId);
        this.down(n);
      });
      const end = () => this.up(n);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('lostpointercapture', end);
      btn.addEventListener('contextmenu', (event) => event.preventDefault());
      btn.addEventListener('keydown', (event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          this.down(n);
        }
      });
      btn.addEventListener('keyup', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          this.up(n);
        }
      });
      btn.addEventListener('blur', end);
    }
    // Keyboard across the whole cabinet: hold → (or 1) and then hold ↑ (or 2).
    const keyButton = (event: KeyboardEvent): 1 | 2 | 0 => {
      if (event.key === 'ArrowRight' || event.key === '1') return 1;
      if (event.key === 'ArrowUp' || event.key === '2') return 2;
      return 0;
    };
    this.root.addEventListener('keydown', (event) => {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      const n = keyButton(event);
      if (!n) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') event.preventDefault();
        return;
      }
      event.preventDefault();
      if (!event.repeat) this.down(n);
    });
    this.root.addEventListener('keyup', (event) => {
      const n = keyButton(event);
      if (n) this.up(n);
    });
  }

  /** Prints a thermal ticket in the ticket holder (6 at most: the seventh pushes out the oldest). */
  private print(capsule: Capsule): void {
    this.say(prizeAnnouncement(capsule));
    if (!this.rack) return;
    this.printed++;
    const c = capsule.content;
    const li = document.createElement('li');
    li.className = 'ticket';
    li.dataset.ticket = String(this.printed);
    const serial = `NO.${String(this.printed).padStart(3, '0')}`;
    if (c.kind === 'world') {
      const link = document.createElement('a');
      link.className = 'ticket__link';
      if (c.id === 'launcher') {
        link.href = LAUNCHER.route;
        link.innerHTML = `<span class="ticket__prize">Prize</span><span class="ticket__what">4D.OS launcher</span><span class="ticket__route">${LAUNCHER.route}</span><span class="ticket__open">Open</span>`;
      } else {
        const world = WORLDS.find((w) => w.id === c.id)!;
        link.href = world.route;
        link.innerHTML = `<span class="ticket__prize">Prize</span><span class="ticket__what">World ${world.letter} · ${world.name}</span><span class="ticket__route">${world.route}</span><span class="ticket__open">Open</span>`;
      }
      li.append(link);
    } else {
      const img = document.createElement('img');
      img.className = 'ticket__emblem';
      img.src = emblemDataUrl(c.seed);
      img.width = img.height = 48;
      img.alt = `Studio sticker: a six-fold rosette drawn from seed ${c.seed}`;
      const body = document.createElement('div');
      body.className = 'ticket__body';
      body.innerHTML = `<span class="ticket__prize">Prize</span><span class="ticket__what">Studio sticker</span><span class="ticket__route">Seed ${c.seed}</span>`;
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'ticket__save';
      save.textContent = 'Save sticker (PNG)';
      save.addEventListener('click', () => void this.saveSticker(c.seed, save));
      body.append(save);
      li.append(img, body);
    }
    const foot = document.createElement('span');
    foot.className = 'ticket__serial';
    foot.setAttribute('aria-hidden', 'true');
    foot.textContent = `${serial} · FREE PLAY · 無料`;
    li.append(foot);

    this.rack.prepend(li);
    while (this.rack.children.length > RACK_MAX) this.rack.lastElementChild?.remove();
    if (this.rackEmpty) this.rackEmpty.hidden = true;
    if (!motion.reduced) {
      li.classList.add('is-printing');
      sfx.printer();
      window.setTimeout(() => li.classList.remove('is-printing'), 400);
    }
    this.makeDraggable(li);
  }

  private async saveSticker(seed: number, button: HTMLButtonElement): Promise<void> {
    sfx.click();
    const blob = await stickerPng(seed);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crewtives-sticker-${seed}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    button.textContent = 'Saved · save again (PNG)';
  }

  /** Tickets are dragged across the ticket holder and leave their trail (window echo). */
  private makeDraggable(ticket: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let dragging = false;
    let moved = false;
    ticket.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || (event.target as Element).closest('button')) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      const [x, y] = (ticket.style.translate || '0px 0px').split(' ').map((v) => parseFloat(v) || 0);
      baseX = x;
      baseY = y;
      ticket.setPointerCapture(event.pointerId);
      ticket.classList.add('is-dragging');
    });
    ticket.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      ticket.style.translate = `${baseX + dx}px ${baseY + dy}px`;
    });
    const end = () => {
      dragging = false;
      ticket.classList.remove('is-dragging');
    };
    ticket.addEventListener('pointerup', end);
    ticket.addEventListener('pointercancel', end);
    // A drag does not open the ticket's link.
    ticket.addEventListener(
      'click',
      (event) => {
        if (moved) {
          event.preventDefault();
          moved = false;
        }
      },
      true,
    );
    ticket.addEventListener('dragstart', (event) => event.preventDefault());
    bindWindowTrail(ticket, { handle: ticket, echoClass: 'ticket-echo', spacing: 18, max: 40 });
  }
}
