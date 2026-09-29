import { afterEach, describe, expect, it, vi } from 'vitest';

// Fake canvas: with or without WebGL2, or with a getContext that throws.
function setup(webgl2: 'yes' | 'no' | 'throws') {
  vi.resetModules();
  const loseContext = vi.fn();
  const getContext = vi.fn((type: string) => {
    if (webgl2 === 'throws') throw new Error('context lost');
    return webgl2 === 'yes' && type === 'webgl2' ? { getExtension: () => ({ loseContext }) } : null;
  });
  const createElement = vi.fn(() => ({ getContext }));
  vi.stubGlobal('document', { createElement });
  return { createElement, getContext, loseContext, load: () => import('./probe') };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WebGL2 probe', () => {
  it('with WebGL2 it returns true and releases the test context', async () => {
    const env = setup('yes');
    const { hasWebGL2 } = await env.load();
    expect(hasWebGL2()).toBe(true);
    expect(env.createElement).toHaveBeenCalledWith('canvas');
    expect(env.getContext).toHaveBeenCalledWith('webgl2');
    expect(env.loseContext).toHaveBeenCalledTimes(1);
  });

  it('without WebGL2, or if the browser throws, it returns false', async () => {
    expect((await setup('no').load()).hasWebGL2()).toBe(false);
    expect((await setup('throws').load()).hasWebGL2()).toBe(false);
  });

  it('probes only once', async () => {
    const env = setup('yes');
    const { hasWebGL2 } = await env.load();
    hasWebGL2();
    hasWebGL2();
    expect(env.createElement).toHaveBeenCalledTimes(1);
  });

  it('without WebGL2, the 3D chunk is not requested', async () => {
    const env = setup('no');
    const { importIfWebGL2 } = await env.load();
    const load = vi.fn(async () => ({ stage: true }));
    expect(await importIfWebGL2(load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('with WebGL2, the 3D chunk is requested once, after the probe', async () => {
    const env = setup('yes');
    const { importIfWebGL2 } = await env.load();
    const load = vi.fn(async () => {
      // The probe has already run when the chunk is requested.
      expect(env.getContext).toHaveBeenCalledWith('webgl2');
      return { stage: true };
    });
    expect(await importIfWebGL2(load)).toEqual({ stage: true });
    expect(load).toHaveBeenCalledTimes(1);
  });
});
