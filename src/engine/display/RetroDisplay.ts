import {
  Color,
  GLSL3,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer,
} from 'three';
import type { ViewRect } from '../engine/Engine';
import { MAX_PALETTE, readNumber, readPalettes, rgb8ToOklab, type Palettes, type Rgb8 } from './palette';
import displayFrag from './display.frag.glsl?raw';
import displayVert from './display.vert.glsl?raw';

/** Color depth of the display (D7). */
export type DisplayMode = '1bit' | '16' | 'millions';

export const DISPLAY_MODES: { id: DisplayMode; label: string }[] = [
  { id: '1bit', label: '1-bit' },
  { id: '16', label: '16 colors' },
  { id: 'millions', label: 'Millions' },
];

export interface DisplayOptions {
  /** Element the palette tokens are read from (defaults to documentElement). */
  tokenRoot?: Element;
  mode?: DisplayMode;
  /** CSS pixels per render pixel in the quantized modes (1/3 resolution = 3). */
  pixelScale?: number;
}

export interface RenderOptions {
  /** Scene background color, 8-bit sRGB. */
  background: Rgb8;
  /** Called with the render target size before the scene is drawn. */
  onResolution?: (width: number, height: number) => void;
  /** The view's own reveal (0–1); combined with the global one by taking the smaller. */
  reveal?: number;
  /**
   * Optional shape mask: outside the ellipse or the rounded rectangle (radius in CSS pixels) the
   * view is transparent and the page shows through. Without a mask, the output is unchanged.
   */
  mask?: DisplayMask;
}

export interface DisplayMask {
  shape: 'ellipse' | 'roundrect';
  radius?: number;
}

const MASK_SHAPES = { ellipse: 1, roundrect: 2 } as const;

/** Ordered-dither amplitude per mode (in sRGB units). */
const SPREAD: Record<Exclude<DisplayMode, 'millions'>, number> = { '1bit': 1, '16': 0.16 };

/**
 * Levels curve (black, white) applied in sRGB before the dither. In 1-bit, shadows go to solid
 * ink and highlights to paper: the dither is left for the transitions, as in a 1-bit render.
 */
const LEVELS: Record<Exclude<DisplayMode, 'millions'>, [number, number]> = { '1bit': [0.12, 0.7], '16': [0, 1] };

/**
 * Real-time retro display: the scene is drawn into a render target at a fraction of the
 * resolution and a quad upscales it without smoothing, with an 8×8 Bayer dither and the nearest
 * OKLab color from a palette of up to 16 entries. Changing mode only changes uniforms and the
 * target size: the point data is not touched.
 */
export class RetroDisplay {
  private _mode: DisplayMode;
  private _pixelScale: number;
  private _reveal = 1;
  private readonly tokenRoot: Element;
  private palettes: Palettes;
  private readonly listeners = new Set<() => void>();
  private readonly tokenListeners = new Set<() => void>();
  private readonly targets = new Map<string, WebGLRenderTarget>();
  private readonly quadScene = new Scene();
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: RawShaderMaterial;
  private readonly clearColor = new Color();

  constructor(options: DisplayOptions = {}) {
    this.tokenRoot = options.tokenRoot ?? document.documentElement;
    this._mode = options.mode ?? '16';
    this._pixelScale = options.pixelScale ?? 3;
    this.palettes = readPalettes(this.tokenRoot);

    this.material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: displayVert,
      fragmentShader: displayFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tSource: { value: null },
        uOrigin: { value: new Vector2() },
        uBlock: { value: 1 },
        uSourceSize: { value: new Vector2(1, 1) },
        uQuantize: { value: 1 },
        uPaletteLab: { value: Array.from({ length: MAX_PALETTE }, () => new Vector3()) },
        uPaletteRgb: { value: Array.from({ length: MAX_PALETTE }, () => new Vector3()) },
        uPaletteSize: { value: 2 },
        uSpread: { value: SPREAD['16'] },
        uLevels: { value: new Vector2(0, 1) },
        uReveal: { value: 1 },
        uRevealRgb: { value: new Vector3() },
        uGrade: { value: new Vector2(1, 1) },
        uMaskShape: { value: 0 },
        uViewSize: { value: new Vector2(1, 1) },
        uMaskRadius: { value: 0 },
      },
    });
    this.readGrade();
    const quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.quadScene.add(quad);
    this.applyPalette();

    // Palettes come from the tokens: they are re-read when the root's classes or styles change,
    // and, in development, when Vite hot-reloads CSS.
    new MutationObserver(() => this.refreshTokens()).observe(this.tokenRoot, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-world', 'data-theme'],
    });
    import.meta.hot?.on('vite:afterUpdate', () => this.refreshTokens());
  }

  get mode(): DisplayMode {
    return this._mode;
  }

  set mode(mode: DisplayMode) {
    if (mode === this._mode) return;
    this._mode = mode;
    this.applyPalette();
    this.emit();
  }

  get pixelScale(): number {
    return this._pixelScale;
  }

  set pixelScale(scale: number) {
    const next = Math.max(1, Math.round(scale));
    if (next === this._pixelScale) return;
    this._pixelScale = next;
    this.emit();
  }

  /** Threshold of the reveal dissolve: 0 = nothing visible, 1 = the whole scene. */
  get reveal(): number {
    return this._reveal;
  }

  set reveal(value: number) {
    const next = Math.min(1, Math.max(0, value));
    if (next === this._reveal) return;
    this._reveal = next;
    this.emit();
  }

  /** Active palette of the current mode (empty in Millions). */
  get palette(): Rgb8[] {
    if (this._mode === 'millions') return [];
    return this._mode === '1bit' ? this.palettes.oneBit : this.palettes.sixteen;
  }

  /** Re-reads the CSS tokens (runs on its own when the root's style changes or CSS reloads). */
  refreshTokens(): void {
    const next = readPalettes(this.tokenRoot);
    const graded = this.readGrade();
    if (JSON.stringify(next) !== JSON.stringify(this.palettes)) {
      this.palettes = next;
      this.applyPalette();
      this.emit();
    } else if (graded) {
      this.emit();
    }
    for (const listener of this.tokenListeners) listener();
  }

  /**
   * Grading before quantization, from tokens: `--display-chroma` scales the OKLab chroma and
   * `--display-exposure` the linear light (1 = no change). Returns whether it changed.
   */
  private readGrade(): boolean {
    const grade = this.material.uniforms.uGrade.value as Vector2;
    const chroma = readNumber(this.tokenRoot, '--display-chroma', 1);
    const exposure = readNumber(this.tokenRoot, '--display-exposure', 1);
    if (grade.x === chroma && grade.y === exposure) return false;
    grade.set(chroma, exposure);
    return true;
  }

  /** Mode, scale, reveal or palette changed: views must repaint. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Tokens may have changed: views re-read their own (scene colors). */
  onTokens(listener: () => void): () => void {
    this.tokenListeners.add(listener);
    return () => this.tokenListeners.delete(listener);
  }

  /** Block size in device pixels for a view. */
  blockSize(dpr: number): number {
    return this._mode === 'millions' ? 1 : Math.max(1, Math.round(this._pixelScale * dpr));
  }

  /**
   * Draws `scene` from `camera` into the view's rectangle. The engine has already set viewport
   * and scissor; three restores them when switching back from the render target.
   */
  render(renderer: WebGLRenderer, rect: ViewRect, scene: Scene, camera: Camera, options: RenderOptions): void {
    const block = this.blockSize(rect.dpr);
    const width = Math.ceil(rect.width / block);
    const height = Math.ceil(rect.height / block);
    const target = this.target(width, height);
    options.onResolution?.(width, height);

    const [r, g, b] = options.background;
    this.clearColor.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
    renderer.setRenderTarget(target);
    renderer.setClearColor(this.clearColor, 1);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const u = this.material.uniforms;
    u.tSource.value = target.texture;
    u.uOrigin.value.set(rect.x, rect.y);
    u.uBlock.value = block;
    u.uSourceSize.value.set(width, height);
    u.uReveal.value = Math.min(this._reveal, options.reveal ?? 1);
    u.uRevealRgb.value.set(r / 255, g / 255, b / 255);
    const mask = options.mask;
    u.uMaskShape.value = mask ? MASK_SHAPES[mask.shape] : 0;
    u.uViewSize.value.set(rect.width, rect.height);
    u.uMaskRadius.value = (mask?.radius ?? 0) * rect.dpr;
    renderer.render(this.quadScene, this.quadCamera);
  }

  dispose(): void {
    for (const target of this.targets.values()) target.dispose();
    this.targets.clear();
    this.material.dispose();
  }

  private applyPalette(): void {
    const u = this.material.uniforms;
    const quantized = this._mode !== 'millions';
    u.uQuantize.value = quantized ? 1 : 0;
    if (!quantized) return;
    const palette = this.palette.slice(0, MAX_PALETTE);
    palette.forEach((color, i) => {
      u.uPaletteRgb.value[i].set(color[0] / 255, color[1] / 255, color[2] / 255);
      u.uPaletteLab.value[i].set(...rgb8ToOklab(color));
    });
    u.uPaletteSize.value = palette.length;
    u.uSpread.value = SPREAD[this._mode as '1bit' | '16'];
    u.uLevels.value.set(...LEVELS[this._mode as '1bit' | '16']);
  }

  private target(width: number, height: number): WebGLRenderTarget {
    const key = `${width}x${height}`;
    let target = this.targets.get(key);
    if (!target) {
      // Few views per page: one target is kept per size and the oldest ones are discarded.
      if (this.targets.size >= 6) {
        const [oldKey, old] = this.targets.entries().next().value!;
        old.dispose();
        this.targets.delete(oldKey);
      }
      target = new WebGLRenderTarget(width, height, {
        colorSpace: SRGBColorSpace,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: true,
      });
      this.targets.set(key, target);
    }
    return target;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
