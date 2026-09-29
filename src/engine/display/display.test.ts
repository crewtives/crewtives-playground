import { Mesh, RawShaderMaterial, Scene, OrthographicCamera, type WebGLRenderer } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewRect } from '../engine/Engine';
import type { Rgb8 } from './palette';
import { RetroDisplay, type RenderOptions } from './RetroDisplay';

// No DOM: the palettes come from a stand-in for the tokens, and the renderer only records the
// uniforms the display quad is drawn with.
const SIXTEEN: Rgb8[] = Array.from({ length: 16 }, (_, i) => [i * 16, i * 16, i * 16]);
vi.mock('./palette', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./palette')>()),
  readPalettes: () => ({ oneBit: [[20, 20, 20], [236, 236, 236]], sixteen: SIXTEEN }),
  readNumber: (_root: Element, _name: string, fallback: number) => fallback,
}));

interface Draw {
  maskShape: number;
  maskRadius: number;
  viewSize: [number, number];
  quantize: number;
  paletteSize: number;
}

let draws: Draw[];
let renderer: WebGLRenderer;

beforeEach(() => {
  vi.stubGlobal('MutationObserver', class { observe(): void {} });
  draws = [];
  renderer = {
    setRenderTarget() {},
    setClearColor() {},
    clear() {},
    render(scene: Scene) {
      const material = (scene.children[0] as Mesh | undefined)?.material;
      if (!(material instanceof RawShaderMaterial)) return;
      const u = material.uniforms;
      draws.push({
        maskShape: u.uMaskShape.value,
        maskRadius: u.uMaskRadius.value,
        viewSize: [u.uViewSize.value.x, u.uViewSize.value.y],
        quantize: u.uQuantize.value,
        paletteSize: u.uPaletteSize.value,
      });
    },
  } as unknown as WebGLRenderer;
});

const scene = new Scene();
const camera = new OrthographicCamera();
const rect = (dpr = 1): ViewRect => ({ x: 10, y: 20, width: 300 * dpr, height: 200 * dpr, dpr });
const base: RenderOptions = { background: [0, 0, 0] };

function display(): RetroDisplay {
  return new RetroDisplay({ tokenRoot: {} as Element });
}

describe('RetroDisplay: shape mask', () => {
  it('by default there is no mask: the quad is drawn with the mask off', () => {
    const d = display();
    d.render(renderer, rect(), scene, camera, base);
    expect(draws).toHaveLength(1);
    expect(draws[0].maskShape).toBe(0);
    expect(draws[0].maskRadius).toBe(0);
  });

  it('ellipse: it turns on with the view size in device pixels', () => {
    const d = display();
    d.render(renderer, rect(2), scene, camera, { ...base, mask: { shape: 'ellipse' } });
    expect(draws[0]).toMatchObject({ maskShape: 1, viewSize: [600, 400], maskRadius: 0 });
  });

  it('rounded rectangle: the radius in CSS pixels is scaled by the dpr', () => {
    const d = display();
    d.render(renderer, rect(2), scene, camera, { ...base, mask: { shape: 'roundrect', radius: 24 } });
    expect(draws[0]).toMatchObject({ maskShape: 2, maskRadius: 48 });
  });

  it('changing the mode keeps the configured mask', () => {
    const d = display();
    const options: RenderOptions = { ...base, mask: { shape: 'ellipse' } };
    d.render(renderer, rect(), scene, camera, options);
    d.mode = 'millions';
    d.render(renderer, rect(), scene, camera, options);
    d.mode = '1bit';
    d.render(renderer, rect(), scene, camera, options);
    expect(draws.map((draw) => [draw.maskShape, draw.quantize, draw.paletteSize])).toEqual([
      [1, 1, 16],
      [1, 0, 16],
      [1, 1, 2],
    ]);
  });

  it('a view without a mask does not inherit the mask of another view on the same display', () => {
    const d = display();
    d.render(renderer, rect(), scene, camera, { ...base, mask: { shape: 'roundrect', radius: 24 } });
    d.render(renderer, rect(), scene, camera, base);
    expect(draws.map((draw) => [draw.maskShape, draw.maskRadius])).toEqual([
      [2, 24],
      [0, 0],
    ]);
  });
});
