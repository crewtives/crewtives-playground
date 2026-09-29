export type TimeMode = 'memory' | 'all';

/** Playback direction: 1 moves forward, −1 rewinds, 0 = HOLD. */
export type Direction = 1 | -1 | 0;

export interface TimeState {
  /** Current integer frame: the single source of truth for the NOW (D4). */
  frame: number;
  /** Signed speed in multiples of real time (0 = HOLD). */
  rate: number;
  direction: Direction;
  mode: TimeMode;
}

export type TimeListener = (state: TimeState, previous: TimeState) => void;

export interface TimeControllerOptions {
  frameCount: number;
  fps: number;
  mode?: TimeMode;
  /** Speed steps for J/L, as absolute values in increasing order. */
  speedSteps?: number[];
  /** Time constant (s) with which the frame reaches a target (scroll). */
  damping?: number;
}

export const DEFAULT_SPEED_STEPS = [1, 2, 4, 8];

/**
 * Scene time. It keeps a continuous frame to accumulate playback, but everything derived from it
 * (uniforms, atlas layer, frustum pose, timecode, timeline) uses `frame`, the integer, so they
 * always agree.
 */
export class TimeController {
  readonly frameCount: number;
  readonly fps: number;
  readonly speedSteps: number[];
  damping: number;

  private position = 0;
  private _rate = 0;
  private _mode: TimeMode;
  private lastNonZeroRate = 1;
  private target: number | null = null;
  private targetDirection: Direction = 0;
  /** Speed measured while chasing a target, in multiples of real time. */
  private targetRate = 0;
  private listeners = new Set<TimeListener>();
  private snapshot: TimeState;

  constructor(options: TimeControllerOptions) {
    if (!(options.frameCount >= 1)) throw new Error('TimeController: frameCount must be ≥ 1');
    this.frameCount = options.frameCount;
    this.fps = options.fps;
    this._mode = options.mode ?? 'memory';
    this.speedSteps = options.speedSteps ?? DEFAULT_SPEED_STEPS;
    this.damping = options.damping ?? 0.12;
    this.snapshot = this.state;
  }

  get frame(): number {
    return Math.floor(this.position);
  }

  /** Continuous position (for fine visual interpolation; never for deciding the frame). */
  get exactFrame(): number {
    return this.position;
  }

  get rate(): number {
    return this.target === null ? this._rate : this.targetRate;
  }

  get mode(): TimeMode {
    return this._mode;
  }

  get direction(): Direction {
    if (this.target !== null) return this.targetDirection;
    return this._rate > 0 ? 1 : this._rate < 0 ? -1 : 0;
  }

  get playing(): boolean {
    return this.target === null && this._rate !== 0;
  }

  /** A pending target (scroll) or playback: `update` must keep being called. */
  get active(): boolean {
    return this.playing || this.target !== null;
  }

  get state(): TimeState {
    return { frame: this.frame, rate: this.rate, direction: this.direction, mode: this._mode };
  }

  subscribe(listener: TimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Advances time by dt seconds. Returns true if time is still moving. */
  update(dt: number): boolean {
    if (this.target !== null) {
      const delta = this.target - this.position;
      if (Math.abs(delta) < 0.01) {
        this.position = this.target;
        this.targetDirection = 0;
        this.targetRate = 0;
      } else if (dt > 0) {
        const k = 1 - Math.exp(-dt / Math.max(1e-4, this.damping));
        this.position += delta * k;
        this.targetDirection = delta > 0 ? 1 : -1;
        this.targetRate = Math.round(((delta * k) / dt / this.fps) * 100) / 100;
      }
      this.emit();
      // Stays active while there is distance left, even if this step did not advance (dt = 0 on wake-up).
      return this.position !== this.target;
    }
    if (this._rate !== 0 && dt > 0) {
      this.position = this.wrap(this.position + this._rate * this.fps * dt);
      this.emit();
    }
    return this._rate !== 0;
  }

  play(rate = this.lastNonZeroRate): void {
    this.target = null;
    this._rate = rate;
    if (rate !== 0) this.lastNonZeroRate = rate;
    this.emit();
  }

  hold(): void {
    this.target = null;
    this._rate = 0;
    this.emit();
  }

  /** Space: HOLD ↔ resume at the last speed. */
  togglePlay(): void {
    if (this.playing) this.hold();
    else this.play(this.lastNonZeroRate);
  }

  /** L: play forward; if already moving forward, go up one speed step. */
  forward(): void {
    this.play(this._rate > 0 && this.target === null ? this.nextStep(this._rate) : this.speedSteps[0]);
  }

  /** J: rewind; if already rewinding, go up one backward speed step. */
  rewind(): void {
    this.play(this._rate < 0 && this.target === null ? -this.nextStep(-this._rate) : -this.speedSteps[0]);
  }

  /** Arrows: HOLD and exactly one frame in the requested direction (looping at the ends). */
  step(delta: number): void {
    this.target = null;
    this._rate = 0;
    this.position = this.wrap(this.frame + Math.trunc(delta));
    this.emit();
  }

  /** Direct jump (click on the ruler, scrub). Does not change the speed. */
  seek(frame: number): void {
    this.target = null;
    this.position = this.clampFrame(frame);
    this.emit();
  }

  setMode(mode: TimeMode): void {
    this._mode = mode;
    this.emit();
  }

  /**
   * Damped target (scroll chapter): the frame reaches it without looping, and the direction
   * reflects the way it is moving. `release` goes back to normal playback.
   */
  setTarget(frame: number): void {
    this.target = this.clampFrame(frame);
    this.emit();
  }

  releaseTarget(): void {
    this.target = null;
    this.targetDirection = 0;
    this.targetRate = 0;
    this.emit();
  }

  private nextStep(current: number): number {
    const next = this.speedSteps.find((step) => step > current + 1e-9);
    return next ?? this.speedSteps[this.speedSteps.length - 1];
  }

  private wrap(position: number): number {
    const n = this.frameCount;
    return ((position % n) + n) % n;
  }

  private clampFrame(frame: number): number {
    return Math.min(this.frameCount - 1, Math.max(0, frame));
  }

  private emit(): void {
    const next = this.state;
    const previous = this.snapshot;
    if (
      next.frame === previous.frame &&
      next.rate === previous.rate &&
      next.direction === previous.direction &&
      next.mode === previous.mode
    ) {
      return;
    }
    this.snapshot = next;
    for (const listener of this.listeners) listener(next, previous);
  }
}

/** MM:SS:FF timecode of a frame (FF = frame within the second). */
export function timecode(frame: number, fps: number): string {
  const whole = Math.max(0, Math.floor(frame));
  const perSecond = Math.round(fps);
  const totalSeconds = Math.floor(whole / perSecond);
  const ff = whole % perSecond;
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/** Playback state as shown on the timeline: FORWARD +1.00×, REWIND −1.00×, HOLD 0.00×. */
export function playbackLabel(state: Pick<TimeState, 'rate' | 'direction'>): string {
  const speed = Math.abs(state.rate).toFixed(2);
  if (state.direction > 0) return `FORWARD +${speed}×`;
  if (state.direction < 0) return `REWIND −${speed}×`;
  return `HOLD ${speed}×`;
}

const pad = (value: number) => String(value).padStart(2, '0');
