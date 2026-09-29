import {
  Color,
  DoubleSide,
  GLSL3,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Points,
  RawShaderMaterial,
  Scene,
  TOUCH,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
  type WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RetroDisplay } from '../display/RetroDisplay';
import { readColor, rgb8ToLinear, type Rgb8 } from '../display/palette';
import type { Engine, EngineView, ViewRect } from '../engine/Engine';
import type { Pack } from '../pack/loader';
import type { TimeController, TimeState } from '../time/TimeController';
import commonGlsl from './common.glsl?raw';
import dynamicVert from './dynamic.vert.glsl?raw';
import { packGpu, type PackGpu } from './packGpu';
import { bindPinch, springStep } from './pinch';
import planeFrag from './plane.frag.glsl?raw';
import planeVert from './plane.vert.glsl?raw';
import pointsFrag from './points.frag.glsl?raw';
import staticVert from './static.vert.glsl?raw';

export interface ViewerLayers {
  /** The subject's trail (the past and, in all mode, the future). */
  trail: boolean;
  /** Static layer. */
  background: boolean;
  /** Frustum of the source camera, with the source frame on its image plane. */
  frustum: boolean;
  /** Line through the source camera's positions. */
  trajectory: boolean;
}

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  /** Vertical field of view in degrees (the current one is kept by default). */
  fov?: number;
}

/** Aspect ratio of a view element for a camera preset, never below 0.5 (a tall or not yet laid out box). */
export const aspectOf = (element: HTMLElement) => Math.max(0.5, element.clientWidth / Math.max(1, element.clientHeight));

/** Framing for `defaultPreset`: degrees above the horizon, degrees from the source cameras' axis, and the fraction of the width the subject fills. */
export interface PresetFraming {
  elevation?: number;
  azimuth?: number;
  fill?: number;
}

export interface TimeViewerOptions {
  engine: Engine;
  element: HTMLElement;
  pack: Pack;
  time: TimeController;
  display: RetroDisplay;
  /** Element the color tokens are read from (defaults to documentElement). */
  tokenRoot?: Element;
  layers?: Partial<ViewerLayers>;
  trailStride?: number;
  /** Frustum light on the background (on by default). */
  frustumLight?: boolean;
  /** Initial framing; defaults to `defaultPreset()`. */
  preset?: CameraPreset;
  /** Defaults to `prefers-reduced-motion`. */
  reducedMotion?: boolean;
}

/** Tunable look parameters (no data changes). */
export const LOOK = {
  /** Point size in meters: background and subject. */
  staticWorldSize: 0.09,
  dynamicWorldSize: 0.028,
  /** Cap on the point size, in pixels of the quantized mode. */
  maxPointSize: 4,
  /** Frustum light: density and darkening outside the frustum. */
  dimDensity: 0.3,
  dimAmount: 0.7,
  /** Trail. */
  trailTau: 150,
  trailMin: 0.22,
  trailMax: 0.6,
  trailTintAmount: 0.45,
  futureScale: 0.35,
  /** Automatic orbit at rest (degrees per second) and the wait after an interaction (ms). */
  autoOrbitSpeed: 1.2,
  autoOrbitDelay: 3000,
};

/** Half-life (s) of the default pinch spring, on ln(distance). */
const PINCH_HALFLIFE = 0.1;

/** Receives the pinch: the requested change in ln(camera distance); negative = zoom in. */
export type PinchHandler = (dLogDistance: number) => void;

/** Margin (m) between the subject and the cut plane. */
const CUT_MARGIN = 0.3;
/** With a focus: half the subject's length (the cat is ~0.65 m long) plus the margin. */
const CUT_FOCUS_MARGIN = 0.5;

const DEFAULT_LAYERS: ViewerLayers = { trail: true, background: true, frustum: true, trajectory: true };

/**
 * 4D viewer in time (time-viewer). Every moment lives in a single GPU buffer, shared between
 * views of the same pack; the NOW comes from the TimeController and only moves uniforms, the
 * drawRange, the frustum pose and the atlas layer. It is an engine view: it paints into the
 * rectangle of `element`.
 */
export class TimeViewer implements EngineView {
  readonly element: HTMLElement;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(40, 16 / 9, 0.1, 600);
  readonly controls: OrbitControls;
  readonly pack: Pack;
  readonly time: TimeController;
  readonly display: RetroDisplay;
  readonly gpu: PackGpu;

  private readonly engine: Engine;
  private readonly tokenRoot: Element;
  private readonly reducedMotion: boolean;
  private readonly staticPoints: Points;
  private readonly dynamicPoints: Points;
  private readonly staticMaterial: RawShaderMaterial;
  private readonly dynamicMaterial: RawShaderMaterial;
  private readonly planeMaterial: RawShaderMaterial;
  private readonly frustum = new Group();
  private readonly frustumMaterial = new LineBasicMaterial();
  private readonly trajectoryMaterial = new LineBasicMaterial();
  private readonly trajectory: Line;
  private readonly unsubscribe: Array<() => void> = [];
  private _layers: ViewerLayers;
  private _trailStride: number;
  private _frustumLight: boolean;
  private background: Rgb8 = [20, 20, 20];
  private drawCount = 0;
  private lastInteraction = -Infinity;
  private autoOrbit = true;
  /** Frame shown by the frustum and its plane (to check that the NOW is consistent). */
  private frustumFrame = 0;
  private _reveal = 1;
  /** Fraction of the present toward the next frame (only with correspondence and time running). */
  private presentFrac = 0;
  private pinchHandler: PinchHandler | null = null;
  /** Default zoom: a critically damped spring on ln(distance) toward `goal`. */
  private readonly dolly = { active: false, x: 0, v: 0, goal: 0 };
  private _cutaway = false;
  private cutFocus: { point: Vector3; floorY: number } | null = null;
  private maxPointSize = LOOK.maxPointSize;

  constructor(options: TimeViewerOptions) {
    const { engine, element, pack, time, display } = options;
    this.engine = engine;
    this.element = element;
    this.pack = pack;
    this.time = time;
    this.display = display;
    this.gpu = packGpu(pack);
    this.tokenRoot = options.tokenRoot ?? document.documentElement;
    this.reducedMotion = options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._layers = { ...DEFAULT_LAYERS, ...options.layers };
    this._trailStride = Math.max(1, Math.round(options.trailStride ?? 1));
    this._frustumLight = options.frustumLight ?? true;
    const gpu = this.gpu;

    this.staticMaterial = pointsMaterial(staticVert, {
      uSourceViewProj: { value: new Matrix4() },
      uFrustumLight: { value: this._frustumLight ? 1 : 0 },
      uDimDensity: { value: LOOK.dimDensity },
      uDimAmount: { value: LOOK.dimAmount },
      uSceneBg: { value: new Vector3() },
      uBackgroundLevel: { value: 1 },
      uWorldSize: { value: pack.meta.pointSize?.static ?? LOOK.staticWorldSize },
      uCutaway: { value: 0 },
      uCutPlane: { value: new Vector4() },
      uCutMinY: { value: 0 },
      uNearFade: { value: new Vector2() },
    });
    this.dynamicMaterial = pointsMaterial(dynamicVert, {
      uFrame: { value: 0 },
      uFrac: { value: 0 },
      uDirection: { value: 0 },
      uMode: { value: 0 },
      uShowTrail: { value: 1 },
      uTrailStride: { value: this._trailStride },
      uTrailTau: { value: LOOK.trailTau },
      uTrailMin: { value: LOOK.trailMin },
      uTrailMax: { value: LOOK.trailMax },
      uFutureScale: { value: LOOK.futureScale },
      uPresentForward: { value: new Vector3() },
      uPresentRewind: { value: new Vector3() },
      uPresentHold: { value: new Vector3() },
      uTrailTint: { value: new Vector3() },
      uFutureTint: { value: new Vector3() },
      uTrailTintAmount: { value: LOOK.trailTintAmount },
      uPresentTint: { value: 1 },
      uPresentBias: { value: 0 },
      uWorldSize: { value: pack.meta.pointSize?.dynamic ?? LOOK.dynamicWorldSize },
      uNearFade: { value: new Vector2() },
    });
    this.staticPoints = new Points(gpu.staticGeometry, this.staticMaterial);
    this.dynamicPoints = new Points(gpu.dynamicGeometry, this.dynamicMaterial);
    for (const points of [this.staticPoints, this.dynamicPoints]) {
      points.position.copy(gpu.bboxMin);
      points.scale.copy(gpu.bboxSize);
      points.frustumCulled = false;
      this.scene.add(points);
    }

    this.planeMaterial = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: planeVert,
      fragmentShader: planeFrag,
      side: DoubleSide,
      uniforms: { tSource: { value: gpu.sourceTexture }, uLayer: { value: 0 } },
    });
    this.frustum.add(new LineSegments(gpu.frustumGeometry, this.frustumMaterial), new Mesh(gpu.planeGeometry, this.planeMaterial));
    this.trajectory = new Line(gpu.trajectoryGeometry, this.trajectoryMaterial);
    this.scene.add(this.frustum, this.trajectory);

    this.controls = new OrbitControls(this.camera, element);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    // Gestures (D3): the wheel belongs to the page and zoom comes only from our own pinch. Two fingers
    // do not orbit (with zoom and pan off, OrbitControls would keep rotating with the midpoint).
    this.controls.enableZoom = false;
    this.controls.touches = { ONE: TOUCH.ROTATE, TWO: null };
    this.applyTouchAction();
    this.unsubscribe.push(
      bindPinch(element, {
        enabled: () => this.controls.enabled,
        onPinch: (dLog) => this.pinch(dLog),
      }),
    );
    this.controls.minPolarAngle = (8 * Math.PI) / 180;
    this.controls.maxPolarAngle = (84 * Math.PI) / 180;
    this.setCameraPreset(options.preset ?? this.defaultPreset());
    this.controls.addEventListener('start', () => (this.lastInteraction = performance.now()));
    this.controls.addEventListener('end', () => (this.lastInteraction = performance.now()));
    this.controls.addEventListener('change', () => this.engine.invalidate(this));

    this.refreshTokens();
    this.applyLayers();
    this.syncTime(time.state);
    this.unsubscribe.push(
      time.subscribe((state) => {
        this.syncTime(state);
        this.engine.invalidate(this);
      }),
      display.onChange(() => this.engine.invalidate(this)),
      display.onTokens(() => this.refreshTokens()),
    );
  }

  // --- API ----------------------------------------------------------------------------------------

  get layers(): ViewerLayers {
    return { ...this._layers };
  }

  setLayers(layers: Partial<ViewerLayers>): void {
    this._layers = { ...this._layers, ...layers };
    this.applyLayers();
    this.engine.invalidate(this);
  }

  get trailStride(): number {
    return this._trailStride;
  }

  setTrailStride(stride: number): void {
    this._trailStride = Math.max(1, Math.round(stride));
    this.dynamicMaterial.uniforms.uTrailStride.value = this._trailStride;
    this.engine.invalidate(this);
  }

  /**
   * Look of the trail in this view: how much it is tinted toward `--trail` (0 = original colors)
   * and how its density falls off with age.
   */
  setTrailLook(look: { tint?: number; min?: number; max?: number; tau?: number }): void {
    const u = this.dynamicMaterial.uniforms;
    if (look.tint !== undefined) u.uTrailTintAmount.value = look.tint;
    if (look.min !== undefined) u.uTrailMin.value = look.min;
    if (look.max !== undefined) u.uTrailMax.value = look.max;
    if (look.tau !== undefined) u.uTrailTau.value = look.tau;
    this.engine.invalidate(this);
  }

  /**
   * Look of the present in this view:
   * - `tint`: how much it takes the direction color (1 = fully, the usual; less lets its own colors
   *   show, like a scene's redshift);
   * - `bias`: how many meters it is pushed toward the camera (0 by default). With stable points, a
   *   still subject is hidden by its own trail, which occupies the same places; a few centimeters do.
   */
  setPresentLook(look: { tint?: number; bias?: number }): void {
    const u = this.dynamicMaterial.uniforms;
    if (look.tint !== undefined) u.uPresentTint.value = Math.min(1, Math.max(0, look.tint));
    if (look.bias !== undefined) u.uPresentBias.value = Math.max(0, look.bias);
    this.engine.invalidate(this);
  }

  get cutaway(): boolean {
    return this._cutaway;
  }

  /**
   * Dollhouse cutaway: hides the background between the exploration camera and the subject (a
   * nearby wall, boxes), except the floor. The plane turns with the orbit; the trail is untouched.
   */
  setCutaway(enabled: boolean): void {
    this._cutaway = enabled;
    this.staticMaterial.uniforms.uCutaway.value = enabled ? 1 : 0;
    this.engine.invalidate(this);
  }

  /**
   * Cutaway centered on a point (the subject now, for a camera that follows it) instead of the box
   * of the whole path: the plane passes half a body length in front of `focus`, and everything below
   * `floorY` (by default, 0.2 m under the focus) is kept, like the steps already climbed.
   * Requires `setCutaway(true)`; `null` goes back to the box.
   */
  setCutFocus(focus: Vector3 | null, floorY = focus ? focus.y - 0.2 : 0): void {
    this.cutFocus = focus ? { point: focus.clone(), floorY } : null;
    this.engine.invalidate(this);
  }

  /**
   * Cap on the point size in pixels of the quantized mode (defaults to `LOOK.maxPointSize`).
   * A camera 1–2 m from the subject needs more: with a low cap, the nearby background breaks up
   * into loose squares.
   */
  setMaxPointSize(pixels: number): void {
    this.maxPointSize = Math.max(1, pixels);
    this.engine.invalidate(this);
  }

  /**
   * Look of the frustum light in this view: `density` is the fraction of background points drawn
   * outside the frustum and `amount` how far they sink toward `--scene-bg` (0–1).
   */
  setFrustumLightLook({ density, amount }: { density?: number; amount?: number }): void {
    const u = this.staticMaterial.uniforms;
    if (density !== undefined) u.uDimDensity.value = density;
    if (amount !== undefined) u.uDimAmount.value = amount;
    this.engine.invalidate(this);
  }

  /**
   * Near fade of a layer: closer than `near` m to the camera it is not drawn, and from `far` m on it
   * is drawn in full, by stippling (no flicker). On the trail it spares the present. `null` turns it off.
   */
  setNearFade(layer: 'trail' | 'background', range: [near: number, far: number] | null): void {
    const material = layer === 'trail' ? this.dynamicMaterial : this.staticMaterial;
    material.uniforms.uNearFade.value.set(range?.[0] ?? 0, range?.[1] ?? 0);
    this.engine.invalidate(this);
  }

  /** This view's own reveal (threshold dissolve), combined with the display's. */
  get reveal(): number {
    return this._reveal;
  }

  set reveal(value: number) {
    this._reveal = Math.min(1, Math.max(0, value));
    this.engine.invalidate(this);
  }

  get frustumLight(): boolean {
    return this._frustumLight;
  }

  setFrustumLight(enabled: boolean): void {
    this._frustumLight = enabled;
    this.staticMaterial.uniforms.uFrustumLight.value = enabled ? 1 : 0;
    this.engine.invalidate(this);
  }

  get backgroundLevel(): number {
    return this.staticMaterial.uniforms.uBackgroundLevel.value as number;
  }

  /** Level of the whole static layer (0–1): below 1 it sinks toward the background and thins out. */
  setBackgroundLevel(level: number): void {
    this.staticMaterial.uniforms.uBackgroundLevel.value = Math.min(1, Math.max(0, level));
    this.engine.invalidate(this);
  }

  setCameraPreset(preset: CameraPreset): void {
    if (preset.fov !== undefined) {
      this.camera.fov = preset.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(...preset.position);
    this.controls.target.set(...preset.target);
    this.dolly.active = false;
    const distance = this.camera.position.distanceTo(this.controls.target);
    this.controls.minDistance = distance * 0.3;
    this.controls.maxDistance = distance * 1.9;
    this.controls.update();
    this.fitNearPlane();
    this.engine.invalidate(this);
  }

  /**
   * Near plane proportional to the orbit distance: it clips what is right up against the camera
   * (a trunk two meters away covered the whole display case) and improves depth precision.
   */
  private fitNearPlane(): void {
    const near = Math.min(10, Math.max(0.1, this.camera.position.distanceTo(this.controls.target) * 0.2));
    if (Math.abs(near - this.camera.near) > 1e-3) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Default framing: the subject's box fills ~75% of the width, seen obliquely from the side, with
   * the background spilling past the edges.
   */
  defaultPreset(aspect = 16 / 9, fov = this.camera.fov, framing: PresetFraming = {}): CameraPreset {
    const { min, max } = this.gpu.subjectBounds;
    const center = min.clone().add(max).multiplyScalar(0.5);
    const size = max.clone().sub(min);
    const radius = Math.max(size.x, size.z) / 2;
    const halfHorizontal = Math.atan(Math.tan(((fov / 2) * Math.PI) / 180) * aspect);
    const distance = radius / (framing.fill ?? 0.75) / Math.tan(halfHorizontal);
    // Look from ~65° off the source cameras' axis: the image plane is seen obliquely and the subject
    // appears beside it, not behind it (as in the reference).
    const side = new Vector3();
    for (const camera of this.pack.meta.cameras) side.add(new Vector3(...camera.pos));
    side.divideScalar(this.pack.meta.cameras.length).sub(center).setY(0);
    if (side.lengthSq() < 1e-6) side.set(0, 0, -1);
    side.normalize();
    const elevation = ((framing.elevation ?? 22) * Math.PI) / 180;
    const azimuth = ((framing.azimuth ?? 65) * Math.PI) / 180;
    const direction = side.applyAxisAngle(new Vector3(0, 1, 0), azimuth).multiplyScalar(Math.cos(elevation));
    direction.y = Math.sin(elevation);
    const position = center.clone().addScaledVector(direction, distance);
    return { position: position.toArray() as CameraPreset['position'], target: center.toArray() as CameraPreset['target'], fov };
  }

  setOrbit({ enabled, auto }: { enabled?: boolean; auto?: boolean }): void {
    if (enabled !== undefined) {
      this.controls.enabled = enabled;
      this.applyTouchAction();
    }
    if (auto !== undefined) this.autoOrbit = auto;
    this.engine.requestFrame();
  }

  /**
   * Who receives the pinch (two fingers, trackpad Ctrl+wheel or the Safari gesture) on this view,
   * as a change in ln(distance): negative = zoom in. With `null` (the default), the camera zooms
   * toward `controls.target` within `minDistance`/`maxDistance`, smoothed with a critically damped
   * spring. Pinch only works while the orbit is enabled.
   */
  setPinchHandler(handler: PinchHandler | null): void {
    this.pinchHandler = handler;
    this.dolly.active = false;
  }

  /**
   * Zooms in (negative) or out (positive) like the pinch, along the same path: the registered
   * handler or the default zoom. It is the single-pointer alternative (buttons and +/− keys).
   */
  zoomBy(dLogDistance: number): void {
    this.pinch(dLogDistance);
  }

  /** Re-reads the world's color tokens. */
  refreshTokens(): void {
    const root = this.tokenRoot;
    const u = this.dynamicMaterial.uniforms;
    const fallback = this.display.palette[0] ?? ([20, 20, 20] as Rgb8);
    this.background = readColor(root, ['--scene-bg', '--pal-16-0'], fallback);
    const forward = readColor(root, ['--accent-forward'], [47, 208, 224]);
    const rewind = readColor(root, ['--accent-rewind'], [240, 160, 48]);
    const hold = readColor(root, ['--accent-hold'], [236, 236, 236]);
    const trail = readColor(root, ['--trail'], [140, 100, 70]);
    const future = readColor(root, ['--future', '--trail'], trail);
    const frustum = readColor(root, ['--frustum', '--accent-forward'], forward);
    const trajectory = readColor(root, ['--trajectory', '--frustum', '--accent-forward'], frustum);
    setLinear(u.uPresentForward.value, forward);
    setLinear(u.uPresentRewind.value, rewind);
    setLinear(u.uPresentHold.value, hold);
    setLinear(u.uTrailTint.value, trail);
    setLinear(u.uFutureTint.value, future);
    setLinear(this.staticMaterial.uniforms.uSceneBg.value, this.background);
    const level = parseFloat(getComputedStyle(root).getPropertyValue('--background-level'));
    if (Number.isFinite(level)) this.staticMaterial.uniforms.uBackgroundLevel.value = Math.min(1, Math.max(0, level));
    this.frustumMaterial.color.copy(linearColor(frustum));
    this.trajectoryMaterial.color.copy(linearColor(trajectory));
    this.engine.invalidate(this);
  }

  /** Releases what belongs to the view; the pack's buffers are shared and stay alive. */
  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.controls.dispose();
    for (const material of [this.staticMaterial, this.dynamicMaterial, this.planeMaterial, this.frustumMaterial, this.trajectoryMaterial]) {
      material.dispose();
    }
  }

  // --- EngineView --------------------------------------------------------------------------------

  tick(dt: number, now: number): boolean {
    const idle = now - this.lastInteraction > LOOK.autoOrbitDelay;
    // Slow orbit only while time is running: in HOLD, complete rest (0 renders).
    const orbiting = this.autoOrbit && !this.reducedMotion && this.controls.enabled && idle && this.time.playing;
    if (orbiting) {
      const angle = ((LOOK.autoOrbitSpeed * Math.PI) / 180) * dt;
      this.camera.position.sub(this.controls.target).applyAxisAngle(new Vector3(0, 1, 0), angle).add(this.controls.target);
    }
    const dollying = this.stepDolly(dt);
    const moved = this.controls.update(dt);
    if (moved || orbiting || dollying) {
      this.fitNearPlane();
      this.engine.invalidate(this);
    }
    // Interpolated present (D5): TimeController only notifies when the integer frame changes;
    // between two notifications, the view repaints if the continuous position changed.
    const interpolating = this.syncPresentFrac();
    return moved || orbiting || dollying || interpolating;
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const aspect = rect.width / rect.height;
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    if (this._cutaway) this.updateCutPlane();
    // The geometry is shared: this view's drawRange is set right before it is painted.
    this.gpu.dynamicGeometry.setDrawRange(0, this.drawCount);
    this.display.render(renderer, rect, this.scene, this.camera, {
      background: this.background,
      reveal: this._reveal,
      onResolution: (_width, height) => {
        const focal = height / (2 * Math.tan(((this.camera.fov / 2) * Math.PI) / 180));
        // The cap is expressed in pixels of the quantized mode: in Millions it scales with the block.
        const quantizedBlock = Math.max(1, Math.round(this.display.pixelScale * rect.dpr));
        const maxSize = (this.maxPointSize * quantizedBlock) / this.display.blockSize(rect.dpr);
        for (const material of [this.staticMaterial, this.dynamicMaterial]) {
          material.uniforms.uFocal.value = focal;
          material.uniforms.uMaxPointSize.value = maxSize;
        }
      },
    });
  }

  // --- internal ----------------------------------------------------------------------------------

  /** Cut plane: perpendicular to the horizontal direction toward the camera, just in front of the subject. */
  private updateCutPlane(): void {
    const u = this.staticMaterial.uniforms;
    const toCamera = this.camera.position.clone().sub(this.cutFocus?.point ?? this.controls.target).setY(0);
    if (toCamera.lengthSq() < 1e-6) {
      u.uCutaway.value = 0;
      return;
    }
    toCamera.normalize();
    u.uCutaway.value = 1;
    if (this.cutFocus) {
      const { point, floorY } = this.cutFocus;
      u.uCutPlane.value.set(toCamera.x, 0, toCamera.z, toCamera.x * point.x + toCamera.z * point.z + CUT_FOCUS_MARGIN);
      u.uCutMinY.value = floorY;
      return;
    }
    const { min, max } = this.gpu.subjectBounds;
    let reach = -Infinity;
    for (const x of [min.x, max.x]) for (const z of [min.z, max.z]) reach = Math.max(reach, toCamera.x * x + toCamera.z * z);
    u.uCutPlane.value.set(toCamera.x, 0, toCamera.z, reach + CUT_MARGIN);
    u.uCutMinY.value = min.y + 0.05;
  }

  /** Derives everything that is visible from the current frame (D4). */
  private syncTime(state: TimeState): void {
    const frame = state.frame;
    const u = this.dynamicMaterial.uniforms;
    u.uFrame.value = frame;
    u.uDirection.value = state.direction;
    this.syncPresentFrac(state);
    u.uMode.value = state.mode === 'all' ? 1 : 0;
    // In memory mode, besides the shader, drawRange trims the draw: future points are not even processed.
    const { offsets, count } = this.pack.dynamic;
    this.drawCount = state.mode === 'memory' ? offsets[frame + 1] : count;

    this.staticMaterial.uniforms.uSourceViewProj.value.copy(this.gpu.sourceViewProj[frame]);
    this.planeMaterial.uniforms.uLayer.value = frame;
    const camera = this.pack.meta.cameras[frame];
    const tanHalf = Math.tan(((camera.fov / 2) * Math.PI) / 180);
    this.frustum.position.set(...camera.pos);
    this.frustum.quaternion.set(...camera.quat);
    const depth = this.gpu.frustumDepth;
    this.frustum.scale.set(tanHalf * camera.aspect * depth, tanHalf * depth, depth);
    this.frustumFrame = frame;
  }

  /**
   * Fraction of the present between the integer frame and the next: `exactFrame − frame` with
   * correspondence and time running; 0 in HOLD or without correspondence. Returns whether it changed.
   */
  private syncPresentFrac(state: Pick<TimeState, 'frame' | 'direction'> = this.time.state): boolean {
    const frac = this.pack.correspondence && state.direction !== 0 ? Math.min(1, Math.max(0, this.time.exactFrame - state.frame)) : 0;
    if (frac === this.presentFrac) return false;
    this.presentFrac = frac;
    this.dynamicMaterial.uniforms.uFrac.value = frac;
    this.engine.invalidate(this);
    return true;
  }

  /** `touch-action`: with orbit, a vertical finger belongs to the page; without orbit, the browser decides. */
  private applyTouchAction(): void {
    this.element.style.touchAction = this.controls.enabled ? 'pan-y' : '';
  }

  private pinch(dLog: number): void {
    this.lastInteraction = performance.now();
    if (this.pinchHandler) {
      this.pinchHandler(dLog);
      return;
    }
    const dolly = this.dolly;
    if (!dolly.active) {
      dolly.x = dolly.goal = Math.log(this.camera.position.distanceTo(this.controls.target));
      dolly.v = 0;
      dolly.active = true;
    }
    const min = Math.log(Math.max(1e-3, this.controls.minDistance));
    const max = Math.log(Math.max(1e-3, this.controls.maxDistance));
    dolly.goal = Math.min(max, Math.max(min, dolly.goal + dLog));
    this.engine.requestFrame();
  }

  /** Steps the default pinch spring and moves the camera to that distance from the target. */
  private stepDolly(dt: number): boolean {
    const dolly = this.dolly;
    if (!dolly.active) return false;
    springStep(dolly, dolly.goal, PINCH_HALFLIFE, dt);
    if (Math.abs(dolly.x - dolly.goal) < 1e-4 && Math.abs(dolly.v) < 1e-3) {
      dolly.x = dolly.goal;
      dolly.v = 0;
      dolly.active = false;
    }
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.lengthSq() < 1e-12) return false;
    this.camera.position.copy(this.controls.target).add(offset.setLength(Math.exp(dolly.x)));
    return true;
  }

  private applyLayers(): void {
    const layers = this._layers;
    this.dynamicMaterial.uniforms.uShowTrail.value = layers.trail ? 1 : 0;
    this.staticPoints.visible = layers.background;
    this.frustum.visible = layers.frustum;
    this.trajectory.visible = layers.trajectory;
  }

  /** State derived from the NOW (debugging and verification in the browser). */
  debugState() {
    return {
      timeFrame: this.time.frame,
      uFrame: this.dynamicMaterial.uniforms.uFrame.value as number,
      uDirection: this.dynamicMaterial.uniforms.uDirection.value as number,
      uFrac: this.dynamicMaterial.uniforms.uFrac.value as number,
      correspondence: this.pack.correspondence,
      distance: this.camera.position.distanceTo(this.controls.target),
      planeLayer: this.planeMaterial.uniforms.uLayer.value as number,
      frustumFrame: this.frustumFrame,
      frustumPosition: this.frustum.position.toArray(),
      drawCount: this.drawCount,
      staticCount: this.pack.static.count,
    };
  }

  /** Internal objects for the debug utilities. */
  get internals() {
    return {
      staticMaterial: this.staticMaterial,
      dynamicMaterial: this.dynamicMaterial,
      staticPoints: this.staticPoints,
      dynamicPoints: this.dynamicPoints,
      frustum: this.frustum,
      trajectory: this.trajectory,
    };
  }
}

// ---------------------------------------------------------------------------------------------

function pointsMaterial(vertexShader: string, uniforms: Record<string, IUniform>): RawShaderMaterial {
  return new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: vertexShader.replace('// @common', commonGlsl),
    fragmentShader: pointsFrag,
    uniforms: {
      ...uniforms,
      uFocal: { value: 300 },
      uMaxPointSize: { value: LOOK.maxPointSize },
      uIdLayout: { value: 0 },
      uIdGrid: { value: 1 },
      uIdRows: { value: 1 },
    },
  });
}

function setLinear(target: Vector3, color: Rgb8): void {
  target.set(...rgb8ToLinear(color));
}

function linearColor(color: Rgb8): Color {
  return new Color(...rgb8ToLinear(color));
}
