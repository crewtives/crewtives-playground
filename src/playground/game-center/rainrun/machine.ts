// The Rain Run cabinet: joins the pure machine (game.ts), the 3D view and the 1F DOM (HUD,
// stick, A/B/C, START, keyboard, time strip, live region and sound).
import type { Engine, EngineView } from '../../../engine/engine/Engine';
import { motion } from '../../shared/motion';
import { settings, type ServiceSettings } from '../settings';
import { hiss, hum, sfx, type Hum } from '../sfx';
import { RainRunGame, type Store } from './game';
import { poseAt, POSE_HZ, type SimEvent } from './sim';
import type { RainRunView } from './view';

const ANNOUNCE_GAP = 2000;

export function safeStore(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(6, '0');
}

type Dir = 'up' | 'down' | 'left' | 'right';

export interface MachineOptions {
  engine: Engine;
  view: RainRunView;
  game?: RainRunGame;
}

export class RainRunMachine {
  readonly game: RainRunGame;
  /** SW4 RAIN, SW6 FLIP and SW7 ATTRACT from the service panel (settings.ts). */
  rain = true;
  flip = false;
  attract = true;
  private readonly engine: Engine;
  private readonly view: RainRunView;
  private readonly engineView: EngineView;
  private readonly crt: HTMLElement;
  private readonly hud: Record<string, HTMLElement | null>;
  private readonly live: HTMLElement | null;
  private readonly strip: HTMLElement | null;
  private readonly scrub: HTMLInputElement | null;
  private readonly scrubRead: HTMLElement | null;
  private readonly ball: HTMLElement | null;
  private readonly keys = new Set<Dir>();
  private readonly held = new Set<Dir>();
  private drag = { x: 0, y: 0, active: false };
  private lastAnnounce = -Infinity;
  private pendingAnnounce = '';
  private announceTimer = 0;
  private idleTimer = 0;
  private hudCache = new Map<string, string>();
  private engineHum: Hum | null = null;
  private rainHum: Hum | null = null;

  constructor(options: MachineOptions) {
    this.engine = options.engine;
    this.view = options.view;
    this.game = options.game ?? new RainRunGame(safeStore());
    this.crt = document.getElementById('rain-run')!;
    const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
    this.hud = {
      score: q('[data-hud-score]'),
      hi: q('[data-hud-hi]'),
      mid: q('[data-hud-mid]'),
      center: q('[data-hud-center]'),
      lives: q('[data-hud-lives]'),
      time: q('[data-hud-time]'),
      combo: q('[data-hud-combo]'),
      boost: q('[data-hud-boost]'),
      profile: q('[data-hud-profile]'),
    };
    this.live = q('[data-live-game]');
    this.strip = q('[data-timestrip]');
    this.scrub = q<HTMLInputElement>('#rr-scrub');
    this.scrubRead = q('[data-timestrip-read]');
    this.ball = q('[data-stick-ball]');

    this.engineView = {
      element: this.view.element,
      tick: (dt) => this.tick(dt),
      render: (renderer, rect) => this.view.render(renderer, rect),
    };

    this.applySettings(settings.value, false);
    settings.onChange((s) => this.applySettings(s, true));
    if (motion.reduced || !this.attract) this.preExpose();
    this.frame();
    this.engine.add(this.engineView);
    this.view.powerOn(motion.reduced);
    if (!motion.reduced) {
      window.setTimeout(() => document.body.classList.add('is-powering'), 700);
      window.setTimeout(() => document.body.classList.remove('is-powering'), 1100);
    }
    motion.onChange((reduced) => this.onMotion(reduced));
    this.bindInput();
    this.paintHud(true);
  }

  /** The automatic demo is shown: without reduced motion and with SW7 ATTRACT on. */
  private get autoplay(): boolean {
    return !motion.reduced && this.attract;
  }

  /** Service panel: rain, ghost (synced with B/X), mirror and automatic demo. */
  private applySettings(s: ServiceSettings, live: boolean): void {
    this.rain = s.rain;
    this.flip = s.flip;
    this.game.ghostOn = s.ghosts;
    document.querySelector('[data-btn="b"]')?.setAttribute('aria-pressed', String(s.ghosts));
    if (live) {
      if (s.attract !== this.attract) this.setAttract(s.attract);
      this.frame();
      this.invalidate();
    } else {
      this.attract = s.attract;
    }
  }

  setAttract(on: boolean): void {
    this.attract = on;
    if (this.game.state === 'attract' && !this.autoplay) this.preExpose();
    this.invalidate();
  }

  invalidate(): void {
    this.engine.invalidate(this.engineView);
  }

  /** START: Enter with focus on the machine, the 1P START button or a tap on the screen. */
  start(): void {
    if (!this.game.start()) return;
    sfx.start();
    this.clearIdle();
    this.view.setTimeView(false, true);
    this.setStrip(false);
    this.crt.dataset.state = 'play';
    this.crt.classList.remove('is-timeview');
    this.announce('Game started. 90 seconds, 3 lives.', true);
    this.paintHud(true);
    this.invalidate();
  }

  private tick(dt: number): boolean {
    const game = this.game;
    const sim = game.sim;
    if (game.state === 'play') {
      const [sx, sy] = this.stick();
      sim.setStick(sx, sy);
    }
    const events = game.advance(dt, this.autoplay);
    for (const event of events) this.onEvent(event);
    this.frame();
    const moving = this.view.animate(dt, this.rain && (game.state === 'play' || (game.state === 'attract' && this.autoplay)));
    this.paintHud(false);
    this.hums(game.state === 'play');
    return moving || game.state === 'play' || (game.state === 'attract' && this.autoplay);
  }

  /** Engine hum (55 Hz, follows the speed) and background rain, only during PLAY. */
  private hums(playing: boolean): void {
    if (playing) {
      this.engineHum ??= hum(55, 'triangle', 300, 0.08);
      this.engineHum.set(55 * (this.game.sim.speed / 24));
      if (this.rain) this.rainHum ??= hiss(2600, 0.03);
      else {
        this.rainHum?.stop();
        this.rainHum = null;
      }
    } else {
      this.engineHum?.stop();
      this.rainHum?.stop();
      this.engineHum = this.rainHum = null;
    }
  }

  private frame(): void {
    const game = this.game;
    const ghostPoses = game.state === 'play' && game.ghostOn ? game.ghost : null;
    let ghost = ghostPoses ? poseAt(ghostPoses, game.sim.time) : null;
    // Pre-exposed image: the ghost at 20 s into the best flight, if there is one.
    if (game.state === 'attract' && !this.autoplay && game.ghostOn && game.best) ghost = poseAt(game.best.poses, 20);
    this.view.setFrame({ sim: game.sim, state: game.state, ghost, rain: this.rain, flip: this.flip });
  }

  private onEvent(event: SimEvent): void {
    const playing = this.game.state === 'play' || this.game.state === 'gameover';
    switch (event.type) {
      case 'gate':
        if (playing) {
          sfx.gate(event.combo);
          this.announce(`Gate ${event.k + 1}, combo ${event.combo}`);
        }
        break;
      case 'crash':
        this.view.crash(this.game.sim);
        if (playing) {
          sfx.crash();
          this.announce(event.lives === 1 ? 'Crash, 1 life left' : `Crash, ${event.lives} lives left`, true);
        }
        break;
      case 'over':
        this.gameOver();
        break;
      default:
        break;
    }
  }

  private gameOver(): void {
    sfx.gameOver();
    this.releaseStick();
    this.crt.dataset.state = 'gameover';
    this.openTimeView();
    const record = this.game.newRecord && this.game.sim.score > 0 ? ' New HI, kept in this browser only.' : '';
    this.announce(`Game over. Score ${this.game.sim.score}. Time view: ${this.view.moments} moments shown.${record}`, true);
    this.armIdle();
  }

  private openTimeView(): void {
    this.view.setTimeView(true, motion.reduced);
    this.crt.classList.add('is-timeview');
    this.setStrip(true);
    this.invalidate();
  }

  private toggleTimeView(): void {
    const state = this.game.toggleTimeView();
    if (state === 'timeview') {
      this.crt.dataset.state = 'timeview';
      this.openTimeView();
      this.announce(`Time view: ${this.view.moments} moments shown. Press C to fly on.`, true);
    } else if (state === 'play') {
      this.crt.dataset.state = 'play';
      this.crt.classList.remove('is-timeview');
      this.view.setTimeView(false, motion.reduced);
      this.setStrip(false);
      this.invalidate();
    }
  }

  private setStrip(on: boolean): void {
    if (!this.strip || !this.scrub) return;
    this.strip.hidden = !on;
    if (!on) return;
    const poses = this.game.sim.poses.length;
    this.scrub.max = String(Math.max(0, poses - 1));
    this.scrub.value = String(Math.max(0, poses - 1));
    this.onScrub();
  }

  private onScrub(): void {
    if (!this.scrub) return;
    const index = Number(this.scrub.value);
    this.view.scrubPose = index;
    const seconds = (index + 1) / POSE_HZ;
    const text = `${seconds.toFixed(2)} S · ${this.view.moments} MOMENTS`;
    if (this.scrubRead) this.scrubRead.textContent = text;
    this.scrub.setAttribute('aria-valuetext', `${seconds.toFixed(2)} seconds into the flight, of ${this.view.moments} moments shown`);
    this.invalidate();
  }

  private armIdle(): void {
    this.clearIdle();
    // GAME OVER returns to ATTRACT after 20 s without input (no frames: a timer).
    this.idleTimer = window.setInterval(() => {
      this.game.advance(1);
      if (this.game.state === 'attract') {
        this.clearIdle();
        this.backToAttract();
      }
    }, 1000);
  }

  private clearIdle(): void {
    window.clearInterval(this.idleTimer);
    this.idleTimer = 0;
  }

  private backToAttract(): void {
    this.crt.dataset.state = 'attract';
    this.crt.classList.remove('is-timeview');
    this.view.setTimeView(false, true);
    this.setStrip(false);
    if (!this.autoplay) this.preExpose();
    this.paintHud(true);
    this.invalidate();
  }

  /** Pre-exposed image: the autopilot advanced by 20 s, frozen with its trail. */
  private preExpose(): void {
    this.game.fastForward(20);
    this.frame();
  }

  private onMotion(reduced: boolean): void {
    if (this.game.state === 'attract') {
      if (reduced) this.preExpose();
      this.invalidate();
    }
  }

  /** Releases the stick (end of game): no held keys and the ball back at the center. */
  private releaseStick(): void {
    this.keys.clear();
    this.held.clear();
    this.drag = { x: 0, y: 0, active: false };
    this.ball?.style.setProperty('--sx', '0');
    this.ball?.style.setProperty('--sy', '0');
  }

  private stick(): [number, number] {
    let x = 0;
    let y = 0;
    const dirs = new Set([...this.keys, ...this.held]);
    if (dirs.has('left')) x -= 1;
    if (dirs.has('right')) x += 1;
    if (dirs.has('up')) y += 1;
    if (dirs.has('down')) y -= 1;
    if (this.drag.active) {
      x = this.drag.x;
      y = this.drag.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.ball?.style.setProperty('--sx', x.toFixed(3));
    this.ball?.style.setProperty('--sy', (-y).toFixed(3));
    return [x, y];
  }

  private press(button: 'a' | 'b' | 'c'): void {
    this.game.touch();
    sfx.click();
    if (button === 'a') {
      if (this.game.state === 'play' && this.game.sim.boostCharge >= 1) {
        this.game.sim.boost();
        sfx.boost();
      }
    } else if (button === 'b') {
      const on = !this.game.ghostOn;
      settings.set({ ghosts: on });
      this.announce(on ? 'Ghost on' : 'Ghost off', true);
    } else if (this.game.state === 'play' || this.game.state === 'timeview') {
      this.toggleTimeView();
    }
  }

  private bindInput(): void {
    const crt = this.crt;
    const keyDir: Record<string, Dir> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right',
    };
    crt.addEventListener('keydown', (event) => {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      const dir = keyDir[event.code];
      if (dir) {
        event.preventDefault();
        if (this.game.state === 'timeview' || this.game.state === 'gameover') {
          this.nudgeScrub(dir === 'left' || dir === 'down' ? -1 : 1);
          return;
        }
        this.keys.add(dir);
        this.game.touch();
        this.invalidate();
        return;
      }
      switch (event.code) {
        case 'Enter':
        case 'NumpadEnter':
          event.preventDefault();
          this.start();
          break;
        case 'Space':
          event.preventDefault();
          if (this.game.state === 'play') this.press('a');
          else this.start();
          break;
        case 'KeyZ':
          event.preventDefault();
          this.press('a');
          break;
        case 'KeyX':
          event.preventDefault();
          this.press('b');
          break;
        case 'KeyC':
          event.preventDefault();
          this.press('c');
          break;
        default:
          break;
      }
    });
    crt.addEventListener('keyup', (event) => {
      const dir = keyDir[event.code];
      if (dir) this.keys.delete(dir);
    });
    crt.addEventListener('blur', () => this.keys.clear());
    crt.addEventListener('click', () => {
      if (this.game.state === 'attract' || this.game.state === 'gameover') this.start();
    });

    document.querySelector('[data-start]')?.addEventListener('click', () => this.start());
    for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-btn]')) {
      btn.addEventListener('click', () => this.press(btn.dataset.btn as 'a' | 'b' | 'c'));
    }

    // The stick's arrow buttons: hold = steer; with the keyboard, a short tap.
    for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-dir]')) {
      const dir = btn.dataset.dir as Dir;
      const release = () => {
        this.held.delete(dir);
        btn.classList.remove('is-down');
      };
      btn.addEventListener('pointerdown', (event) => {
        btn.setPointerCapture(event.pointerId);
        this.held.add(dir);
        btn.classList.add('is-down');
        this.game.touch();
        if (this.game.state === 'timeview' || this.game.state === 'gameover') this.nudgeScrub(dir === 'left' || dir === 'down' ? -1 : 1);
        this.invalidate();
      });
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('click', (event) => {
        if (event.detail !== 0) return;
        this.held.add(dir);
        window.setTimeout(() => this.held.delete(dir), 280);
        this.invalidate();
      });
    }

    // Dragging the stick: a 40 px radius maps to −1…1.
    const gate = document.querySelector<HTMLElement>('[data-stick-gate]');
    if (gate) {
      const move = (event: PointerEvent) => {
        const box = gate.getBoundingClientRect();
        const r = box.width / 2;
        this.drag.x = Math.max(-1, Math.min(1, (event.clientX - box.left - r) / r));
        this.drag.y = Math.max(-1, Math.min(1, -(event.clientY - box.top - r) / r));
        this.invalidate();
      };
      gate.addEventListener('pointerdown', (event) => {
        gate.setPointerCapture(event.pointerId);
        this.drag.active = true;
        this.game.touch();
        move(event);
      });
      gate.addEventListener('pointermove', (event) => {
        if (this.drag.active) move(event);
      });
      const end = () => {
        this.drag = { x: 0, y: 0, active: false };
        this.invalidate();
      };
      gate.addEventListener('pointerup', end);
      gate.addEventListener('pointercancel', end);
    }

    this.scrub?.addEventListener('input', () => {
      this.game.touch();
      this.onScrub();
    });
  }

  private nudgeScrub(step: number): void {
    if (!this.scrub || this.strip?.hidden) return;
    const max = Number(this.scrub.max);
    this.scrub.value = String(Math.max(0, Math.min(max, Number(this.scrub.value) + step)));
    this.game.touch();
    this.onScrub();
  }

  /** Live region: at most one announcement every 2 s (the last pending one wins). */
  private announce(text: string, urgent = false): void {
    if (!this.live) return;
    const now = performance.now();
    const wait = this.lastAnnounce + ANNOUNCE_GAP - now;
    if (wait <= 0 || (urgent && wait <= 0)) {
      this.live.textContent = text;
      this.lastAnnounce = now;
      return;
    }
    this.pendingAnnounce = text;
    if (!this.announceTimer) {
      this.announceTimer = window.setTimeout(() => {
        this.announceTimer = 0;
        if (this.live && this.pendingAnnounce) this.live.textContent = this.pendingAnnounce;
        this.pendingAnnounce = '';
        this.lastAnnounce = performance.now();
      }, wait);
    }
  }

  private set(key: string, value: string, html = false): void {
    const el = this.hud[key];
    if (!el || this.hudCache.get(key) === value) return;
    this.hudCache.set(key, value);
    if (html) el.innerHTML = value;
    else el.textContent = value;
  }

  private paintHud(force: boolean): void {
    if (force) this.hudCache.clear();
    const game = this.game;
    const sim = game.sim;
    const state = game.state;
    const scoring = state !== 'attract';
    this.set('score', scoring ? pad(sim.score) : '000000');
    this.set('hi', game.hi === null ? '------' : pad(game.hi));
    const moments = this.view.moments;
    if (state === 'attract') {
      this.set('mid', '<span class="hud__demo">DEMO</span>', true);
      this.set('center', '<span class="hud__press">PRESS START</span>', true);
      this.set('time', '');
      this.set('combo', '');
      this.set('lives', '');
      this.set('profile', 'LAST 6 S · EVERY MOMENT');
    } else if (state === 'play') {
      this.set('mid', `TIME ${String(Math.ceil(sim.clock)).padStart(2, '0')}`);
      this.set('center', '');
      this.set('combo', sim.combo > 1 ? `GATE ×${sim.combo}` : '');
      this.set('lives', livesHtml(sim.lives), true);
      this.set('time', game.ghost && game.ghostOn ? 'GHOST: YOUR BEST RUN' : '');
      this.set('profile', 'LAST 6 S · EVERY MOMENT');
      this.hud.boost?.style.setProperty('--boost', sim.boostCharge.toFixed(2));
    } else if (state === 'timeview') {
      this.set('mid', 'TIME VIEW');
      this.set('center', `<span class="hud__press">${moments} MOMENTS · C TO FLY</span>`, true);
      this.set('time', '');
    } else {
      this.set('mid', 'TIME VIEW');
      const record = game.newRecord && sim.score > 0 ? ' · NEW HI' : '';
      this.set('center', `<span class="hud__over">GAME OVER${record}</span><br><span class="hud__press">${moments} MOMENTS</span>`, true);
      this.set('time', '');
    }
  }
}

function livesHtml(lives: number): string {
  let html = '';
  for (let i = 0; i < 3; i++) {
    html += `<svg class="${i < lives ? '' : 'is-lost'}" aria-hidden="true"><use href="#i-taxi"/></svg>`;
  }
  return html;
}
