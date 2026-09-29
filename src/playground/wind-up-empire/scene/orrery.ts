// The lid: a low-poly tin orrery painted through the RetroDisplay (16 inks, 8×8 Bayer).
// The Whirl spins at the center, the five world tops orbit leaving their past on the ring, the
// home top holds the friction rocket and every flight stays stamped as exposures.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  LineSegments,
  Matrix4,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Points,
  Quaternion,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  CircleGeometry,
  Vector3,
  type WebGLRenderer,
} from 'three';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import type { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Rgb8 } from '../../../engine/display/palette';
import { ghostPath } from '../flight';
import type { Fleet, StampedExposure } from '../fleet';
import { HOME, LAB, WORLD_BODIES } from '../orbits';
import { LOAD_SPIN, createTop, isSpinning, spinTo, spinUp, stepTop, type TopState } from '../tops';
import { worldPrint } from '../worldInks';
import type { PlanetScreen } from '../ui/nameplates';
import { fibonacciSphere, merge, ringSegments, rocketGeometry, starFan, topGeometry, whirlGeometry, TOP_TIP } from './lowpoly';
import * as S from './shaders';

/** Page inks (sRGB); three converts them to linear. */
export const INK = {
  ink: 0x15131c,
  spaceDeep: 0x0a0f4a,
  space: 0x1b2cc4,
  spaceBright: 0x4f7dff,
  sky: 0xa9c8ff,
  vermilion: 0xcc2216,
  oxblood: 0x8e1a12,
  orange: 0xff7a1a,
  chrome: 0xffc81a,
  lemon: 0xfff27a,
  turquoise: 0x17b7a0,
  tealDeep: 0x0b5f58,
  pink: 0xff6fae,
  tin: 0xc7ccd4,
  tinShade: 0x6f7686,
  paper: 0xfbfaf6,
} as const;

const SPACE_RGB: Rgb8 = [0x1b, 0x2c, 0xc4];

/** Each world's print in the orrery: base, band and dot come from the world's real inks. */
const WORLD_PRINT: Record<string, [number, number, number]> = Object.fromEntries(
  WORLD_BODIES.map((w) => {
    const p = worldPrint(w.id);
    return [w.id, [p.base, p.band, p.dot]];
  }),
);

const FOV = 28;
/** Tops are drawn slightly larger than their capture radius, so that they read as tops. */
const TOP_VISUAL = 1.3;
/** The cradle rocket: larger and tilted upward, as if on a ramp. */
const CRADLE_SCALE = 1.45;
const CRADLE_PITCH = 30;
const ELEVATION = (44.4 * Math.PI) / 180;
const deg = Math.PI / 180;

export interface PullState {
  active: boolean;
  detents: number;
  aim: number;
  /** Time (s on the view's clock) of the last detent, for the shake. */
  shakeAt: number;
  /** Preview from the sliders (no grab). */
  preview: boolean;
}

export interface OrreryOptions {
  element: HTMLElement;
  anchor: HTMLElement;
  display: RetroDisplay;
  fleet: Fleet;
  pull: PullState;
  phone: boolean;
  /** true with reduced motion: nothing animates on its own. */
  reduced: () => boolean;
  /** Called when the on-screen position of the rocket in the cradle changes (viewport CSS px). */
  onRocketScreen?: (x: number, y: number) => void;
  /** A top toppled (for the metallic clank). */
  onTopple?: (index: number) => void;
  /** On-screen positions of E, D, A, B, C and the home top on every render (the nameplates follow them). */
  onPlanets?: (screens: PlanetScreen[], center: { x: number; y: number }) => void;
  /** After painting: the views painted on top (the key) must repaint. */
  afterRender?: () => void;
}

interface TopBody {
  mesh: Mesh;
  state: TopState;
  radius: number;
  topRadius: number;
  angle: () => number;
  material: ShaderMaterial;
  printed: boolean;
}

function color(hex: number): Color {
  return new Color(hex);
}

function lightUniform(): { value: Vector3 } {
  return { value: new Vector3(-0.55, 0.8, 0.25).normalize() };
}

export class OrreryView implements EngineView {
  readonly element: HTMLElement;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  /** Extra camera pitch (0–10°) to lift the lid. */
  pitch = 0;
  /** Wind (0–1): speeds up the Whirl. */
  wind = 0;
  /** The press's symmetry: arms of the Whirl and bands of the tops. */
  fold = 5;

  private readonly o: OrreryOptions;
  private readonly light = lightUniform();
  private readonly lightWorld = new Vector3(-0.55, 0.8, 0.25).normalize();
  private time = 0;
  private whirlAngle = 0;
  private whirlPulse = 0;
  private pxPerUnit = 90;
  private topScale = 1;
  private readonly whirl = new Object3D();
  private readonly whirlMaterial: ShaderMaterial;
  private readonly ringMaterial: ShaderMaterial;
  private readonly tops: TopBody[] = [];
  private home!: TopBody;
  private readonly labTops: Mesh[] = [];
  private readonly rings: { line: LineSegments; material: ShaderMaterial; world?: string }[] = [];
  private readonly starMaterial: ShaderMaterial;
  private readonly pastMaterial: ShaderMaterial;
  private readonly exposures: InstancedMesh;
  private readonly exposureMaterial: ShaderMaterial;
  private readonly exposureBirth: InstancedBufferAttribute;
  private readonly exposureStretch: InstancedBufferAttribute;
  private readonly exposureCapacity: number;
  private exposureCursor = 0;
  private readonly flightSlots = new Map<number, number[]>();
  private readonly stretching: { slots: number[]; start: number }[] = [];
  private readonly rocketGeo: BufferGeometry;
  private readonly liveRockets: { mesh: Mesh; material: ShaderMaterial }[] = [];
  private readonly cradleRocket: Mesh;
  private readonly cradleMaterial: ShaderMaterial;
  private readonly cradle: Mesh;
  private readonly ghost: LineSegments;
  private readonly ghostPositions: BufferAttribute;
  private readonly ghostDist: BufferAttribute;
  private readonly sparks: Points;
  private readonly sparkPos: BufferAttribute;
  private readonly sparkLife: BufferAttribute;
  private readonly sparkVel: Float32Array;
  private sparkCursor = 0;
  private sparkCarry = 0;
  private lastGhostKey = '';
  private rocketScreen = { x: -1, y: -1 };
  private readonly tmpM = new Matrix4();
  private readonly tmpQ = new Quaternion();
  private readonly tmpV = new Vector3();

  constructor(options: OrreryOptions) {
    this.o = options;
    this.element = options.element;
    const phone = options.phone;

    // --- The Whirl ---
    this.whirlMaterial = new ShaderMaterial({
      vertexShader: S.whirlVert,
      fragmentShader: S.whirlFrag,
      uniforms: {
        uLight: this.light,
        uArms: { value: this.fold },
        uBandA: { value: color(INK.vermilion) },
        uBandB: { value: color(INK.chrome) },
        uRim: { value: color(INK.oxblood) },
      },
    });
    this.whirl.add(new Mesh(whirlGeometry(), this.whirlMaterial));
    const horizon = new Mesh(new CircleGeometry(0.45, 24).toNonIndexed(), this.litMaterial(INK.ink));
    horizon.geometry.setAttribute('color', solidColor(horizon.geometry, INK.ink));
    horizon.rotation.x = -Math.PI / 2;
    horizon.position.y = 0.105;
    this.whirl.add(horizon);
    this.scene.add(this.whirl);
    this.ringMaterial = new ShaderMaterial({
      vertexShader: S.ringVert,
      fragmentShader: S.ringFrag,
      uniforms: {
        uLight: this.light,
        uNear: { value: color(INK.orange) },
        uFar: { value: color(INK.lemon) },
        uCamDir: { value: new Vector3(0, 1, 0) },
      },
    });
    // The accretion ring hugs the top's rim: it leaves the printed spiral visible.
    const torus = new Mesh(new TorusGeometry(0.9, 0.07, 6, 24).toNonIndexed(), this.ringMaterial);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.0;
    this.scene.add(torus);

    // --- Orbits: solid (charted), dashed (not yet charted), dotted (lab) ---
    for (const w of WORLD_BODIES) this.addRing(w.radius, INK.chrome, w.id);
    this.addRing(HOME.radius, INK.chrome, 'home');
    this.addRing(LAB.radius, INK.tinShade, 'lab');
    this.addScale();

    // --- Stars ---
    const starCount = phone ? 180 : 480;
    const stars = new InstancedBufferGeometry();
    stars.setAttribute('position', new BufferAttribute(starFan(), 3));
    const centers: number[] = [];
    const params: number[] = [];
    const camDir = new Vector3(0, -Math.sin(ELEVATION), -Math.cos(ELEVATION));
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const p of fibonacciSphere(starCount, 14)) {
      // Only the hemisphere behind the orrery: nothing between the camera and the lid.
      if (p[0] * camDir.x + p[1] * camDir.y + p[2] * camDir.z < 1.5) continue;
      centers.push(...p);
      params.push(0.05 + 0.1 * rand() * rand(), rand(), rand());
    }
    stars.setAttribute('aCenter', new InstancedBufferAttribute(new Float32Array(centers), 3));
    stars.setAttribute('aStar', new InstancedBufferAttribute(new Float32Array(params), 3));
    stars.instanceCount = centers.length / 3;
    this.starMaterial = new ShaderMaterial({
      vertexShader: S.starVert,
      fragmentShader: S.starFrag,
      uniforms: {
        uTime: { value: 0 },
        uLensR: { value: 1.6 },
        uThetaE: { value: 0.55 },
        uChrome: { value: color(INK.chrome) },
        uLemon: { value: color(INK.lemon) },
        uSky: { value: color(INK.sky) },
        uBright: { value: color(INK.spaceBright) },
      },
    });
    const starMesh = new Mesh(stars, this.starMaterial);
    starMesh.frustumCulled = false;
    this.scene.add(starMesh);

    // --- World tops, home top and lab sockets ---
    const segments = phone ? 8 : 12;
    const topGeo = topGeometry(segments);
    WORLD_BODIES.forEach((w) => {
      const [base, band, dot] = WORLD_PRINT[w.id];
      const material = this.topMaterial(base, band, dot, true);
      const mesh = new Mesh(topGeo, material);
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      this.tops.push({
        mesh,
        material,
        state: createTop(LOAD_SPIN),
        radius: w.radius,
        topRadius: w.topRadius,
        angle: () => this.o.fleet.planetAngle(w),
        printed: true,
      });
    });
    const homeMaterial = this.topMaterial(INK.tin, INK.vermilion, INK.chrome, true);
    const homeMesh = new Mesh(topGeo, homeMaterial);
    homeMesh.matrixAutoUpdate = false;
    this.scene.add(homeMesh);
    this.home = {
      mesh: homeMesh,
      material: homeMaterial,
      state: createTop(14),
      radius: HOME.radius,
      topRadius: HOME.topRadius,
      angle: () => HOME.angle,
      printed: true,
    };
    const labMaterial = this.topMaterial(INK.tin, INK.tin, INK.tin, false);
    for (const a of LAB.angles) {
      const mesh = new Mesh(topGeo, labMaterial);
      mesh.matrixAutoUpdate = false;
      mesh.userData.angle = a;
      this.labTops.push(mesh);
      this.scene.add(mesh);
    }

    // --- The planets' past: 24 stamps per revolution on their ring ---
    const disc = new CircleGeometry(1, 7).toNonIndexed();
    disc.rotateX(-Math.PI / 2);
    const past = new InstancedBufferGeometry();
    past.setAttribute('position', disc.getAttribute('position'));
    const planetIdx: number[] = [];
    const kIdx: number[] = [];
    for (let p = 0; p < 5; p++) for (let k = 1; k < 24; k++) (planetIdx.push(p), kIdx.push(k));
    past.setAttribute('aPlanet', new InstancedBufferAttribute(new Float32Array(planetIdx), 1));
    past.setAttribute('aK', new InstancedBufferAttribute(new Float32Array(kIdx), 1));
    past.instanceCount = planetIdx.length;
    this.pastMaterial = new ShaderMaterial({
      vertexShader: S.pastVert,
      fragmentShader: S.pastFrag,
      uniforms: {
        uAngles: { value: [0, 0, 0, 0, 0] },
        uRadii: { value: WORLD_BODIES.map((w) => w.radius) },
        uSizes: { value: WORLD_BODIES.map((w) => w.topRadius * 0.4) },
        uStep: { value: (2 * Math.PI) / 24 },
        uColors: { value: WORLD_BODIES.map((w) => color(WORLD_PRINT[w.id][0])) },
      },
    });
    const pastMesh = new Mesh(past, this.pastMaterial);
    pastMesh.frustumCulled = false;
    this.scene.add(pastMesh);

    // --- Rockets: instanced exposures, rockets in flight and the one in the cradle ---
    this.rocketGeo = rocketGeometry(
      { body: color(INK.vermilion), nose: color(INK.tin), fins: color(INK.chrome), windows: color(INK.pink) },
      1.05,
    );
    this.exposureCapacity = phone ? 240 : 600;
    this.exposureMaterial = new ShaderMaterial({
      vertexShader: S.exposureVert,
      fragmentShader: S.exposureFrag,
      uniforms: {
        uLight: this.light,
        uNow: { value: 0 },
        uMemory: { value: 4 },
        uNewest: { value: color(INK.pink) },
        uFreeze: { value: 0 },
      },
    });
    const exposureGeo = this.rocketGeo.clone();
    this.exposureBirth = new InstancedBufferAttribute(new Float32Array(this.exposureCapacity).fill(-1e6), 1);
    this.exposureStretch = new InstancedBufferAttribute(new Float32Array(this.exposureCapacity).fill(1), 1);
    exposureGeo.setAttribute('aBirth', this.exposureBirth);
    exposureGeo.setAttribute('aStretch', this.exposureStretch);
    this.exposures = new InstancedMesh(exposureGeo, this.exposureMaterial, this.exposureCapacity);
    this.exposures.frustumCulled = false;
    this.exposures.count = this.exposureCapacity;
    for (let i = 0; i < this.exposureCapacity; i++) this.exposures.setMatrixAt(i, new Matrix4().makeTranslation(0, -50, 0));
    this.scene.add(this.exposures);

    for (let i = 0; i < 6; i++) {
      const material = this.litMaterial(0);
      const mesh = new Mesh(this.rocketGeo, material);
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      this.scene.add(mesh);
      this.liveRockets.push({ mesh, material });
    }
    this.cradleMaterial = this.litMaterial(0);
    this.cradleRocket = new Mesh(this.rocketGeo, this.cradleMaterial);
    this.cradleRocket.matrixAutoUpdate = false;
    this.scene.add(this.cradleRocket);

    // The cradle: a tin fork on the spindle of the home top.
    const cradleGeo = merge([
      boxColored(0.34, 0.04, 0.05, INK.tin, 0, 0, 0.07),
      boxColored(0.34, 0.04, 0.05, INK.tin, 0, 0, -0.07),
      boxColored(0.05, 0.1, 0.19, INK.vermilion, -0.1, -0.03, 0),
    ]);
    this.cradle = new Mesh(cradleGeo, this.litMaterial(0));
    this.cradle.matrixAutoUpdate = false;
    this.scene.add(this.cradle);

    // --- Ghost trajectory (dashed: it is only a plan) ---
    const ghostGeo = new BufferGeometry();
    this.ghostPositions = new BufferAttribute(new Float32Array(72 * 2 * 3), 3);
    this.ghostDist = new BufferAttribute(new Float32Array(72 * 2), 1);
    ghostGeo.setAttribute('position', this.ghostPositions);
    ghostGeo.setAttribute('aDist', this.ghostDist);
    ghostGeo.setDrawRange(0, 0);
    this.ghost = new LineSegments(ghostGeo, this.lineMaterial(INK.paper, 0.09, 0.07));
    this.ghost.frustumCulled = false;
    this.scene.add(this.ghost);

    // --- Friction sparks (≤ 120, always next to the cradle) ---
    const sparkGeo = new BufferGeometry();
    this.sparkPos = new BufferAttribute(new Float32Array(120 * 3), 3);
    this.sparkLife = new BufferAttribute(new Float32Array(120), 1);
    this.sparkVel = new Float32Array(120 * 3);
    sparkGeo.setAttribute('position', this.sparkPos);
    sparkGeo.setAttribute('aLife', this.sparkLife);
    this.sparks = new Points(
      sparkGeo,
      new ShaderMaterial({
        vertexShader: S.sparkVert,
        fragmentShader: S.sparkFrag,
        uniforms: { uSize: { value: 2 }, uHot: { value: color(INK.lemon) }, uCool: { value: color(INK.orange) } },
      }),
    );
    this.sparks.frustumCulled = false;
    this.scene.add(this.sparks);

    options.fleet.on({
      stamp: (e) => this.stampExposure(e),
      end: (flight, outcome) => {
        if (outcome === 'swallowed') {
          this.whirlPulse = 1.5;
          const slots = this.flightSlots.get(flight.id) ?? [];
          this.stretching.push({ slots: slots.slice(-6), start: this.o.fleet.now });
        }
        this.flightSlots.delete(flight.id);
      },
      survey: (_flight, world) => {
        const index = WORLD_BODIES.findIndex((w) => w.id === world);
        if (index >= 0) spinUp(this.tops[index].state, 40);
        this.refreshRings();
      },
    });
    this.refreshRings();
    this.placeBodies();
  }

  /** Returns the tops to their load spin and clears the exposures (Reset universe). */
  reset(): void {
    for (const top of this.tops) top.state = createTop(LOAD_SPIN);
    this.exposureBirth.array.fill(-1e6);
    this.exposureBirth.needsUpdate = true;
    this.exposureStretch.array.fill(1);
    this.exposureStretch.needsUpdate = true;
    this.flightSlots.clear();
    this.refreshRings();
  }

  /** Extra spin for a top (tap, keyboard). 0–4 = worlds E..C, 5 = home. */
  spinWorld(index: number, delta: number): void {
    const top = index === 5 ? this.home : this.tops[index];
    spinUp(top.state, delta);
  }

  /** Flick: the top now spins at ω (rad/s). */
  flickWorld(index: number, omega: number): void {
    const top = index === 5 ? this.home : this.tops[index];
    spinTo(top.state, omega);
  }

  /** Current spin of a top (rad/s, 0 when toppled). */
  omegaOf(index: number): number {
    const top = index === 5 ? this.home : this.tops[index];
    return top.state.toppledFor !== null ? 0 : top.state.omega;
  }

  /** World tops standing and spinning. */
  get spinning(): number {
    return this.tops.filter((t) => isSpinning(t.state)).length;
  }

  setFold(fold: number): void {
    this.fold = fold;
    this.whirlMaterial.uniforms.uArms.value = fold;
    for (const top of [...this.tops, this.home]) top.material.uniforms.uFold.value = fold;
  }

  setMemory(moments: number): void {
    this.exposureMaterial.uniforms.uMemory.value = moments / 12;
  }

  /** Burst of sparks at the cradle (each detent of the pull). */
  burst(count: number): void {
    const origin = this.cradlePosition();
    for (let i = 0; i < count; i++) this.emitSpark(origin);
  }

  get busy(): boolean {
    return this.stretching.length > 0 || this.sparkAlive() || this.o.pull.active || this.o.pull.preview;
  }

  tick(dt: number): boolean {
    const reduced = this.o.reduced();
    if (!reduced) this.time += dt;
    // The Whirl spins with the wind and gets a kick when it swallows a rocket.
    if (!reduced) {
      this.whirlAngle += (0.6 + 2.4 * this.wind + this.whirlPulse) * dt;
      this.whirlPulse *= Math.exp(-dt / 0.4);
      this.tops.forEach((top, i) => {
        if (stepTop(top.state, dt) === 'topple') this.o.onTopple?.(i);
      });
      stepTop(this.home.state, 0); // the home top spins in place without losing speed
      this.home.state.spin += this.home.state.omega * dt;
    }
    this.stepSparks(reduced ? 0 : dt);
    this.stepStretch();
    this.placeBodies();
    this.updateGhost();
    const f = this.o.fleet;
    const animating = !reduced || f.busy || this.busy;
    return animating;
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    this.layout(rect);
    const u = this.exposureMaterial.uniforms;
    u.uNow.value = this.o.fleet.now;
    u.uFreeze.value = this.o.reduced() ? 1 : 0;
    this.starMaterial.uniforms.uTime.value = this.time;
    this.pastMaterial.uniforms.uAngles.value = this.tops.map((t) => t.angle());
    this.o.display.render(renderer, rect, this.scene, this.camera, { background: SPACE_RGB });
    this.o.afterRender?.();
  }

  // ---------------------------------------------------------------------------------------------

  private layout(rect: ViewRect): void {
    const width = rect.width / rect.dpr;
    const height = rect.height / rect.dpr;
    const box = this.element.getBoundingClientRect();
    const anchor = this.o.anchor.getBoundingClientRect();
    const cx = anchor.left + anchor.width / 2 - box.left;
    const cy = anchor.top + anchor.height / 2 - box.top;
    this.pxPerUnit = anchor.width / (2 * LAB.radius);
    // Small tops never go below a 14 px radius (phone).
    this.topScale = Math.max(1, 14 / (0.2 * this.pxPerUnit));
    const distance = height / (2 * Math.tan((FOV * deg) / 2) * this.pxPerUnit);
    const elevation = ELEVATION + this.pitch * deg;
    this.camera.position.set(0, distance * Math.sin(elevation), distance * Math.cos(elevation));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.aspect = width / height;
    this.camera.setViewOffset(width, height, width / 2 - cx, height / 2 - cy, width, height);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.light.value.copy(this.lightWorld).transformDirection(this.camera.matrixWorldInverse);
    const cam = this.camera.position;
    const len = Math.hypot(cam.x, cam.z) || 1;
    this.ringMaterial.uniforms.uCamDir.value.set(cam.x / len, cam.z / len, 0);
    this.placeBodies();

    // On-screen position of the cradle rocket, for the grab zone.
    const p = this.cradlePosition().project(this.camera);
    const sx = box.left + ((p.x + 1) / 2) * width;
    const sy = box.top + ((1 - p.y) / 2) * height;
    if (Math.abs(sx - this.rocketScreen.x) > 0.5 || Math.abs(sy - this.rocketScreen.y) > 0.5) {
      this.rocketScreen = { x: sx, y: sy };
      this.o.onRocketScreen?.(sx, sy);
    }
    (this.sparks.material as ShaderMaterial).uniforms.uSize.value = Math.max(1, Math.round(this.pxPerUnit / 60));

    // Nameplates: the on-screen center of each top.
    if (this.o.onPlanets) {
      const screens: PlanetScreen[] = [...this.tops, this.home].map((top) => {
        const v = this.tmpV.setFromMatrixPosition(top.mesh.matrix).project(this.camera);
        const s = top.topRadius * Math.max(this.topScale, TOP_VISUAL);
        return { x: box.left + ((v.x + 1) / 2) * width, y: box.top + ((1 - v.y) / 2) * height, r: s * this.pxPerUnit };
      });
      this.o.onPlanets(screens, { x: box.left + cx, y: box.top + cy });
    }
  }

  private cradleHeight(): number {
    return (TOP_TIP + 0.62) * HOME.topRadius * Math.max(this.topScale, TOP_VISUAL) + 0.03;
  }

  private cradlePosition(): Vector3 {
    return new Vector3(0, this.cradleHeight() + 0.05, HOME.radius);
  }

  private placeBodies(): void {
    // World tops on their orbits.
    for (const top of this.tops) this.placeTop(top.mesh, top.state, top.angle(), top.radius, top.topRadius, top.material);
    this.placeTop(this.home.mesh, this.home.state, this.home.angle(), this.home.radius, this.home.topRadius, this.home.material);
    for (const mesh of this.labTops) {
      const a = mesh.userData.angle as number;
      const s = LAB.topRadius * Math.max(this.topScale, TOP_VISUAL);
      mesh.matrix.compose(
        this.tmpV.set(LAB.radius * Math.cos(a), TOP_TIP * s, -LAB.radius * Math.sin(a)),
        this.tmpQ.identity(),
        new Vector3(s, s, s),
      );
    }
    this.whirl.rotation.y = this.whirlAngle;

    // The cradle and the rocket waiting in it.
    const pull = this.o.pull;
    const f = this.o.fleet;
    const aim = pull.active || pull.preview ? pull.aim : 0;
    const d = pull.active || pull.preview ? pull.detents / 12 : 0;
    const heading = Math.PI / 2 - aim;
    const base = this.cradlePosition();
    const shakeAge = this.time - pull.shakeAt;
    const shake = pull.active && shakeAge < 0.08 ? (1 / this.pxPerUnit) * Math.sin(shakeAge * 120) : 0;
    const rattle = pull.active && pull.detents >= 12 ? (0.6 / this.pxPerUnit) * Math.sin(this.time * 2 * Math.PI * 18) : 0;
    const back = 0.35 * d;
    const dir = new Vector3(Math.sin(aim), 0, -Math.cos(aim));
    this.cradle.matrix.compose(
      new Vector3(base.x + shake, base.y - 0.06, base.z),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading),
      new Vector3(1, 1, 1),
    );
    const rocketPos = base.clone().addScaledVector(dir, -back);
    rocketPos.x += rattle + shake;
    const q = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), heading)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), CRADLE_PITCH * deg));
    // In the cradle the rocket looks bigger: it is the invitation to grab it.
    this.cradleRocket.matrix.compose(rocketPos, q, new Vector3(CRADLE_SCALE, CRADLE_SCALE, CRADLE_SCALE));
    this.cradleRocket.visible = f.canLaunch;

    // Rockets in flight.
    const flights = f.flights.filter((fl) => fl.state.outcome === null || (fl.endedAt !== null && f.now - fl.endedAt < 0.6));
    this.liveRockets.forEach((live, i) => {
      const flight = flights[i];
      if (!flight) {
        live.mesh.visible = false;
        return;
      }
      live.mesh.visible = true;
      const [x, y] = flight.state.p;
      const h = Math.atan2(flight.state.v[1], flight.state.v[0]);
      const pos = new Vector3(x, 0.08, -y);
      const rot = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), h);
      const scale = new Vector3(1, 1, 1);
      let fade = 1;
      let tint = 0;
      if (flight.endedAt !== null) {
        const t = Math.min(1, (f.now - flight.endedAt) / 0.4);
        if (flight.state.outcome === 'swallowed') {
          // It stretches radially ×5 and turns pink.
          tint = 1;
          const radial = Math.atan2(y, x);
          rot.setFromAxisAngle(new Vector3(0, 1, 0), radial);
          scale.set(1 + 4 * t, 1, 1 - 0.5 * t);
          fade = 1 - Math.max(0, (f.now - flight.endedAt - 0.4) / 0.2);
        } else {
          fade = 1 - t;
        }
      }
      live.mesh.matrix.compose(pos, rot, scale);
      live.material.uniforms.uFade.value = fade;
      live.material.uniforms.uTintMix.value = tint;
    });
  }

  private placeTop(mesh: Mesh, state: TopState, angle: number, radius: number, topRadius: number, material: ShaderMaterial): void {
    const s = topRadius * Math.max(this.topScale, TOP_VISUAL);
    const tip = new Vector3(radius * Math.cos(angle), 0, -radius * Math.sin(angle));
    const tilt = state.tilt * deg;
    // A tilted axis that precesses; the spin is around the top's own axis.
    const qPrec = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), state.precession + angle);
    const qTilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tilt);
    const qSpin = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), state.spin);
    const q = qPrec.multiply(qTilt).multiply(qSpin);
    const up = new Vector3(0, TOP_TIP * s, 0).applyQuaternion(q);
    // When toppled, the top rests on its side: lift it so it does not sink into the ecliptic.
    const lift = state.toppledFor !== null ? Math.sin(tilt) * s * 0.55 : 0;
    this.tmpM.compose(tip.add(up).add(new Vector3(0, lift, 0)), q, new Vector3(s, s, s));
    mesh.matrix.copy(this.tmpM);
    // Shutter: one frame's sweep (×1.5) averages the print into rings.
    material.uniforms.uSmear.value = Math.min(Math.PI * 2, state.omega * (1 / 60) * 1.5 * (this.o.reduced() ? 4 : 1));
  }

  private addRing(radius: number, hex: number, world: string): void {
    const { positions, dist } = ringSegments(radius, Math.round(48 + radius * 24));
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('aDist', new BufferAttribute(new Float32Array(dist), 1));
    const material = this.lineMaterial(hex, 0.12, 0);
    const line = new LineSegments(geo, material);
    this.scene.add(line);
    this.rings.push({ line, material, world });
  }

  private addScale(): void {
    const positions: number[] = [];
    const dist: number[] = [];
    for (let x = 0.25; x <= LAB.radius + 0.26; x += 0.25) {
      const major = Math.abs(x - Math.round(x)) < 1e-6;
      const h = major ? 0.09 : 0.045;
      positions.push(x, 0, -h, x, 0, h);
      dist.push(0, 0);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('aDist', new BufferAttribute(new Float32Array(dist), 1));
    this.scene.add(new LineSegments(geo, this.lineMaterial(INK.sky, 1, 0)));
  }

  /** Stroke of each ring by its state: solid when charted, dashed when not yet charted, dotted for the lab. */
  private refreshRings(): void {
    for (const ring of this.rings) {
      const u = ring.material.uniforms;
      if (ring.world === 'lab') {
        u.uDash.value = 0.03;
        u.uGap.value = 0.09;
      } else if (ring.world === 'home' || this.o.fleet.charted.has(ring.world as never)) {
        u.uGap.value = 0;
      } else {
        u.uDash.value = 0.16;
        u.uGap.value = 0.11;
      }
    }
  }

  private stampExposure(e: StampedExposure): void {
    const i = this.exposureCursor;
    this.exposureCursor = (i + 1) % this.exposureCapacity;
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), e.heading);
    this.exposures.setMatrixAt(i, this.tmpM.compose(new Vector3(e.x, 0.06, -e.y), q, new Vector3(1, 1, 1)));
    this.exposures.instanceMatrix.needsUpdate = true;
    this.exposureBirth.setX(i, e.birth);
    this.exposureBirth.needsUpdate = true;
    this.exposureStretch.setX(i, 1);
    this.exposureStretch.needsUpdate = true;
    const slots = this.flightSlots.get(e.flight) ?? [];
    slots.push(i);
    if (slots.length > 8) slots.shift();
    this.flightSlots.set(e.flight, slots);
  }

  private stepStretch(): void {
    for (let k = this.stretching.length - 1; k >= 0; k--) {
      const s = this.stretching[k];
      const t = Math.min(1, (this.o.fleet.now - s.start) / 0.4);
      for (const slot of s.slots) this.exposureStretch.setX(slot, 1 + 4 * t * t);
      this.exposureStretch.needsUpdate = true;
      if (t >= 1) this.stretching.splice(k, 1);
    }
  }

  private updateGhost(): void {
    const pull = this.o.pull;
    const show = (pull.active || pull.preview) && pull.detents > 0;
    if (!show) {
      this.ghost.geometry.setDrawRange(0, 0);
      this.lastGhostKey = '';
      return;
    }
    const pt = this.o.fleet.planetTime;
    const key = `${pull.detents}:${pull.aim.toFixed(4)}`;
    if (key === this.lastGhostKey) return;
    this.lastGhostKey = key;
    const path = ghostPath({ detents: pull.detents, aim: pull.aim, planetTime: pt, planetsMove: this.o.fleet.planetsMove }, 3);
    const pos = this.ghostPositions.array as Float32Array;
    const dist = this.ghostDist.array as Float32Array;
    let n = 0;
    let acc = 0;
    for (let i = 0; i + 1 < path.length && n < 72; i++, n++) {
      const [x0, y0] = path[i];
      const [x1, y1] = path[i + 1];
      pos.set([x0, 0.06, -y0, x1, 0.06, -y1], n * 6);
      const len = Math.hypot(x1 - x0, y1 - y0);
      dist.set([acc, acc + len], n * 2);
      acc += len;
    }
    this.ghostPositions.needsUpdate = true;
    this.ghostDist.needsUpdate = true;
    this.ghost.geometry.setDrawRange(0, n * 2);
  }

  private emitSpark(origin: Vector3): void {
    const i = this.sparkCursor;
    this.sparkCursor = (i + 1) % 120;
    // A 40° cone upward and behind the rocket.
    const a = Math.random() * Math.PI * 2;
    const spread = Math.tan(20 * deg) * Math.random();
    const v = new Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread + 0.4).normalize().multiplyScalar(1.4 + Math.random() * 1.2);
    this.sparkPos.setXYZ(i, origin.x, origin.y, origin.z);
    this.sparkVel.set([v.x, v.y, v.z], i * 3);
    this.sparkLife.setX(i, 1);
    this.sparkPos.needsUpdate = true;
    this.sparkLife.needsUpdate = true;
  }

  private sparkAlive(): boolean {
    const life = this.sparkLife.array as Float32Array;
    for (let i = 0; i < life.length; i++) if (life[i] > 0) return true;
    return false;
  }

  private stepSparks(dt: number): void {
    const pull = this.o.pull;
    if (pull.active && dt > 0 && pull.detents > 0) {
      this.sparkCarry += (8 + 40 * (pull.detents / 12)) * dt;
      const origin = this.cradlePosition();
      while (this.sparkCarry >= 1) {
        this.sparkCarry -= 1;
        this.emitSpark(origin);
      }
    }
    if (dt <= 0) return;
    const pos = this.sparkPos.array as Float32Array;
    const life = this.sparkLife.array as Float32Array;
    let any = false;
    for (let i = 0; i < 120; i++) {
      if (life[i] <= 0) continue;
      any = true;
      life[i] -= dt / 0.35;
      const drag = Math.exp(-3 * dt);
      this.sparkVel[i * 3] *= drag;
      this.sparkVel[i * 3 + 1] = this.sparkVel[i * 3 + 1] * drag - 5 * dt;
      this.sparkVel[i * 3 + 2] *= drag;
      pos[i * 3] += this.sparkVel[i * 3] * dt;
      pos[i * 3 + 1] += this.sparkVel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt;
    }
    if (any) {
      this.sparkPos.needsUpdate = true;
      this.sparkLife.needsUpdate = true;
    }
  }

  private litMaterial(_hex: number): ShaderMaterial {
    return new ShaderMaterial({
      vertexShader: S.litVert,
      fragmentShader: S.litFrag,
      uniforms: {
        uLight: this.light,
        uTint: { value: color(INK.pink) },
        uTintMix: { value: 0 },
        uFade: { value: 1 },
      },
    });
  }

  private topMaterial(base: number, band: number, dot: number, printed: boolean): ShaderMaterial {
    return new ShaderMaterial({
      vertexShader: S.topVert,
      fragmentShader: S.topFrag,
      uniforms: {
        uLight: this.light,
        uBase: { value: color(base) },
        uBand: { value: color(band) },
        uDot: { value: color(dot) },
        uSpindle: { value: color(INK.tin) },
        uFold: { value: this.fold },
        uSmear: { value: 0 },
        uPrinted: { value: printed ? 1 : 0 },
      },
    });
  }

  private lineMaterial(hex: number, dash: number, gap: number): ShaderMaterial {
    return new ShaderMaterial({
      vertexShader: S.lineVert,
      fragmentShader: S.lineFrag,
      uniforms: { uColor: { value: color(hex) }, uDash: { value: dash }, uGap: { value: gap } },
    });
  }
}

function solidColor(geometry: BufferGeometry, hex: number): BufferAttribute {
  const count = geometry.attributes.position.count;
  const c = new Color(hex);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) c.toArray(out, i * 3);
  return new BufferAttribute(out, 3);
}

function boxColored(w: number, h: number, d: number, hex: number, x: number, y: number, z: number): BufferGeometry {
  // Low-poly box with per-vertex color (no indexed BoxGeometry: 12 triangles).
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const v = (sx: number, sy: number, sz: number) => [x + sx * hw, y + sy * hh, z + sz * hd];
  const faces = [
    [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)],
    [v(1, -1, -1), v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1)],
    [v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1), v(-1, 1, -1)],
    [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)],
    [v(1, -1, 1), v(1, -1, -1), v(1, 1, -1), v(1, 1, 1)],
    [v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)],
  ];
  const positions: number[] = [];
  for (const [a, b, c, dd] of faces) positions.push(...a, ...b, ...c, ...a, ...c, ...dd);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('color', solidColor(geo, hex));
  return geo;
}

