import type { SceneMeta } from '../pack/format';

export interface PackStats {
  frames: string;
  duration: string;
  fps: string;
  dynamic: string;
  static: string;
  bytes: string;
}

const integer = new Intl.NumberFormat('en-US');

/** Human-readable size in binary units (divides by 1024): 12.4 MiB, 850 KiB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

/** Clip duration: "20.0 s" or "1 min 04 s". */
export function formatDuration(frameCount: number, fps: number): string {
  const seconds = frameCount / fps;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)} min ${String(whole % 60).padStart(2, '0')} s`;
}

/** Total size of the 4D pack: the sum of the files declared in its metadata. */
export function packBytes(meta: Pick<SceneMeta, 'files'>): number {
  return Object.values(meta.files).reduce((sum, size) => sum + size, 0);
}

/** Figures for the measurements chapter: all are read from the loaded pack, none are written by hand. */
export function packStats(meta: SceneMeta): PackStats {
  return {
    frames: integer.format(meta.frameCount),
    duration: formatDuration(meta.frameCount, meta.fps),
    fps: `${meta.fps} fps`,
    dynamic: integer.format(meta.counts.dynamic),
    static: integer.format(meta.counts.static),
    bytes: formatBytes(packBytes(meta)),
  };
}

/** Fills every `[data-stat="key"]` element inside `root` with the matching figure. */
export function fillStats(root: ParentNode, meta: SceneMeta): void {
  const stats = packStats(meta) as unknown as Record<string, string>;
  root.querySelectorAll<HTMLElement>('[data-stat]').forEach((node) => {
    const value = stats[node.dataset.stat ?? ''];
    if (value !== undefined) node.textContent = value;
  });
}
