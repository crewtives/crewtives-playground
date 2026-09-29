// WebGL2 detection before importing three and the engine: without WebGL2, the landing keeps its
// static HTML (fields, text, index and still images) and draws its alternatives in 2D.

let cached: boolean | null = null;

export function hasWebGL2(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    cached = gl !== null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

/**
 * Startup pattern of the landings: the 3D chunk (three and the `Engine`) is requested only if there
 * is WebGL2. `load` is the dynamic `import()`, for example `() => import('./stage')`; without WebGL2
 * it is not called and null is returned, and the landing carries on with its static HTML and its 2D
 * alternatives.
 */
export async function importIfWebGL2<T>(load: () => Promise<T>): Promise<T | null> {
  return hasWebGL2() ? load() : null;
}
