// The spark wheel: every change of direction while rubbing, after at least 12 px of travel,
// is a stroke worth 0.5 SPARK. Cap: 6 SPARK per second (12 strokes in any 1 s window),
// so it stays a toy and not a farm. Pure module: time comes in from outside.

export const MIN_TRAVEL = 12;
export const SPARK_PER_STROKE = 0.5;
export const MAX_SPARK_PER_SECOND = 6;
const MAX_STROKES = MAX_SPARK_PER_SECOND / SPARK_PER_STROKE;

export class RubCounter {
  private lastX: number | null = null;
  private dir = 0;
  private travel = 0;
  /** Timestamps (ms) of the strokes paid during the last second. */
  private paid: number[] = [];

  /** New horizontal pointer position (px) at time `now` (ms). Returns the SPARK earned. */
  move(x: number, now: number): number {
    if (this.lastX === null) {
      this.lastX = x;
      return 0;
    }
    const dx = x - this.lastX;
    this.lastX = x;
    if (dx === 0) return 0;
    const dir = Math.sign(dx);
    if (dir === this.dir || this.dir === 0) {
      this.dir = dir;
      this.travel += Math.abs(dx);
      return 0;
    }
    // Change of direction: it counts as a stroke if the previous segment traveled at least 12 px.
    const counted = this.travel >= MIN_TRAVEL;
    this.dir = dir;
    this.travel = Math.abs(dx);
    return counted ? this.stroke(now) : 0;
  }

  /** One whole stroke (the "Rub the spark wheel" button). Returns the SPARK earned (0 once past the cap). */
  stroke(now: number): number {
    this.paid = this.paid.filter((t) => now - t < 1000);
    if (this.paid.length >= MAX_STROKES) return 0;
    this.paid.push(now);
    return SPARK_PER_STROKE;
  }

  /** The pointer left the wheel: the next movement starts a new segment. */
  lift(): void {
    this.lastX = null;
    this.dir = 0;
    this.travel = 0;
  }
}
