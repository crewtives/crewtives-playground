import type { SceneMeta } from '../../../engine/pack/format';
import { formatBytes } from '../../../engine/shell/packStats';

// Figures of landing D that are not in `packStats`: they are also read from the loaded 4D pack.

export interface FalconStats {
  perFrame: string;
  correspondence: string;
  source: string;
  synthetic: string;
}

const integer = new Intl.NumberFormat('en-US');

export function falconStats(meta: SceneMeta, pointsPerFrame: number | null): FalconStats {
  const perFrame = pointsPerFrame ?? Math.round(meta.counts.dynamic / Math.max(1, meta.frameCount));
  return {
    perFrame: integer.format(perFrame),
    correspondence: pointsPerFrame !== null ? 'Yes' : 'No',
    source: `${integer.format(meta.frameCount)} at ${meta.source.width} × ${meta.source.height} px`,
    synthetic: meta.synthetic ? 'Synthetic' : 'Captured',
  };
}

/** Fills every `[data-stat-d="key"]` inside `root`. */
export function fillFalconStats(meta: SceneMeta, pointsPerFrame: number | null, root: ParentNode = document): void {
  const values = falconStats(meta, pointsPerFrame) as unknown as Record<string, string>;
  root.querySelectorAll<HTMLElement>('[data-stat-d]').forEach((node) => {
    const value = values[node.dataset.statD ?? ''];
    if (value !== undefined) node.textContent = value;
  });
}

/** Where the 4D pack's bytes go: one bar per file, proportional to its size in `meta.files`. */
export function fillBytes(element: HTMLElement, meta: SceneMeta): void {
  const labels: Record<string, string> = {
    'static.bin': 'Still points',
    'dynamic.bin': 'Moving points',
  };
  const entries = Object.entries(meta.files).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, size]) => sum + size, 0);
  element.replaceChildren(
    ...entries.map(([file, size]) => {
      const row = document.createElement('li');
      row.className = 'bytes__row';
      const name = document.createElement('span');
      name.className = 'bytes__name';
      const page = meta.source.pages.indexOf(file);
      name.textContent = labels[file] ?? (page >= 0 ? `Source frames, page ${page + 1} of ${meta.source.pages.length}` : file);
      const value = document.createElement('span');
      value.className = 'bytes__value';
      value.textContent = formatBytes(size);
      const bar = document.createElement('span');
      bar.className = 'bytes__bar';
      bar.style.setProperty('--share', String(size / total));
      row.append(name, value, bar);
      return row;
    }),
  );
}

