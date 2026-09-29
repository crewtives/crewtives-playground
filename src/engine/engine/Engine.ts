import { WebGLRenderer } from 'three';

/** A view's rectangle in device pixels, with the origin at the bottom left (GL convention). */
export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Device pixels per CSS pixel in this frame. */
  dpr: number;
}

/**
 * A view is a DOM element whose rectangle is painted on the single canvas (D8).
 * The engine sets viewport and scissor to that rectangle before calling `render`.
 */
export interface EngineView {
  readonly element: HTMLElement;
  /** Called on every loop iteration while the view is visible; true = it changed, repaint and keep going. */
  tick?(dt: number, now: number): boolean;
  render(renderer: WebGLRenderer, rect: ViewRect): void;
}

type Ticker = (dt: number, now: number) => boolean;

interface ViewState {
  dirty: boolean;
  visible: boolean;
  rect: ViewRect | null;
  renders: number;
}

export interface EngineOptions {
  canvas?: HTMLCanvasElement;
  maxDpr?: number;
}

/**
 * A fixed full-screen canvas, a single WebGLRenderer and an on-demand render loop: there is a
 * requestAnimationFrame only while something asks for one (invalidate, scroll, resize or a
 * ticker/view that returns true). At rest, no frame is produced.
 */
export class Engine {
  readonly renderer: WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  /** Debug counters: frames with at least one render, and renders per view. */
  readonly stats = { frames: 0, loops: 0 };

  private readonly views = new Map<EngineView, ViewState>();
  private readonly tickers = new Set<Ticker>();
  private readonly maxDpr: number;
  private rafId = 0;
  private lastTime = 0;
  private layoutDirty = true;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(options: EngineOptions = {}) {
    this.maxDpr = options.maxDpr ?? 2;
    this.canvas = options.canvas ?? document.createElement('canvas');
    this.canvas.dataset.engine = '';
    Object.assign(this.canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 'var(--engine-z, 5)',
    });
    if (!this.canvas.isConnected) document.body.append(this.canvas);

    // preserveDrawingBuffer: one view can repaint on its own without erasing the others.
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(1);

    const onLayout = () => {
      this.layoutDirty = true;
      this.requestFrame();
    };
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, { passive: true });
    // A classic scrollbar appears or disappears with the document height without any window
    // resize, so the canvas's own box is observed.
    new ResizeObserver(onLayout).observe(this.canvas);
    this.resize();
  }

  add(view: EngineView): void {
    this.views.set(view, { dirty: true, visible: false, rect: null, renders: 0 });
    this.layoutDirty = true;
    this.requestFrame();
  }

  remove(view: EngineView): void {
    this.views.delete(view);
    this.layoutDirty = true;
    this.requestFrame();
  }

  /** Marks one view (or all of them) to repaint on the next frame. */
  invalidate(view?: EngineView): void {
    if (view) {
      const state = this.views.get(view);
      if (state) state.dirty = true;
    } else {
      for (const state of this.views.values()) state.dirty = true;
    }
    this.requestFrame();
  }

  /** Flags that the DOM layout changed without a scroll or resize (for example, a ScrollTrigger pin). */
  invalidateLayout(): void {
    this.layoutDirty = true;
    this.requestFrame();
  }

  addTicker(ticker: Ticker): () => void {
    this.tickers.add(ticker);
    this.requestFrame();
    return () => this.tickers.delete(ticker);
  }

  requestFrame(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame((now) => this.frame(now));
  }

  rendersOf(view: EngineView): number {
    return this.views.get(view)?.renders ?? 0;
  }

  isVisible(view: EngineView): boolean {
    return this.views.get(view)?.visible ?? false;
  }

  /** CSS size of the canvas: the viewport without the scrollbar (innerWidth includes it). */
  private get cssWidth(): number {
    return this.canvas.clientWidth || document.documentElement.clientWidth;
  }

  private get cssHeight(): number {
    return this.canvas.clientHeight || document.documentElement.clientHeight;
  }

  private resize(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const width = Math.round(this.cssWidth * dpr);
    const height = Math.round(this.cssHeight * dpr);
    if (width === this.width && height === this.height && dpr === this.dpr) return false;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.renderer.setSize(width, height, false);
    return true;
  }

  private frame(now: number): void {
    this.rafId = 0;
    const dt = this.lastTime ? Math.min(now - this.lastTime, 100) / 1000 : 0;
    this.lastTime = now;
    this.stats.loops++;

    let keepAlive = false;
    for (const ticker of this.tickers) keepAlive = ticker(dt, now) || keepAlive;

    let layoutChanged = this.resize() || this.layoutDirty;
    this.layoutDirty = false;

    for (const [view, state] of this.views) {
      const rect = this.measure(view.element);
      const visible = rect !== null;
      if (visible !== state.visible || !sameRect(rect, state.rect)) layoutChanged = true;
      state.visible = visible;
      state.rect = rect;
    }
    // Only visible views animate: an off-screen view does not keep the loop alive.
    // A tick that returns true is animating: the view is repainted and another iteration is requested.
    for (const [view, state] of this.views) {
      if (state.visible && view.tick?.(dt, now)) {
        state.dirty = true;
        keepAlive = true;
      }
    }

    const renderer = this.renderer;
    let rendered = false;
    if (layoutChanged) {
      // With a fixed canvas, a layout change leaves leftovers: clear everything and repaint the visible views.
      renderer.setScissorTest(false);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
    }
    for (const [view, state] of this.views) {
      if (!state.visible || !state.rect) continue;
      if (!layoutChanged && !state.dirty) continue;
      const { x, y, width, height } = state.rect;
      renderer.setViewport(x, y, width, height);
      renderer.setScissor(x, y, width, height);
      renderer.setScissorTest(true);
      view.render(renderer, state.rect);
      state.dirty = false;
      state.renders++;
      rendered = true;
    }
    if (rendered) this.stats.frames++;

    if (keepAlive) this.requestFrame();
    else this.lastTime = 0;
  }

  /** Visible rectangle of an element in device pixels (GL origin), or null if it is off screen. */
  private measure(element: HTMLElement): ViewRect | null {
    if (!element.isConnected) return null;
    const box = element.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    if (box.bottom <= 0 || box.top >= this.cssHeight || box.right <= 0 || box.left >= this.cssWidth) {
      return null;
    }
    const dpr = this.dpr;
    const left = Math.round(box.left * dpr);
    const top = Math.round(box.top * dpr);
    const width = Math.round(box.width * dpr);
    const height = Math.round(box.height * dpr);
    return { x: left, y: this.height - (top + height), width, height, dpr };
  }
}

function sameRect(a: ViewRect | null, b: ViewRect | null): boolean {
  if (a === null || b === null) return a === b;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.dpr === b.dpr;
}
