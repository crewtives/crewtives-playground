// 3D view of Rain Run on the 1F CRT: the canyon of signs in the rain, the taxi, the gates,
// the ghost, the side strip of the last 6 s and TIME VIEW (the whole flight seen from the side).
// Painted with RetroDisplay (16 colors with dither) on the Engine's single canvas.
import {
  AdditiveBlending,
  ArrayCamera,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  ShaderMaterial,
  Vector3,
  Vector4,
  type Material,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import type { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Rgb8 } from '../../../engine/display/palette';
import { atlasCell, atlasUv, buildSignAtlas, buildTaxiGeometry, buildWindowTexture } from './assets';
import { GATE_BANNER, GATE_H, GATE_POST, GATE_W, STREET_HALF, TILE, type CanyonTile, type Sign, type Tower } from './canyon';
import { ribbonIndices, type Pose, type RainRunSim } from './sim';

/** Bottom fraction of the CRT taken by the side strip (same as `--strip` in CSS). */
export const STRIP_FRACTION = 0.17;
export const STRIP_FRACTION_PHONE = 0.15;
/** Length in z covered by the side strip (≈ the last 6 s). */
const STRIP_SPAN = 120;
const LAYER_STRIP = 1;
const LAYER_TIME = 2;
const MAX_RIBBON = 360;
/** Density of the sodium haze (the Blade Runner dial: denser = more orange). */
const HAZE = 0.011;

const SKY_NIGHT = new Color('#1b1140');
const SKY_WINE = new Color('#9e1233');
const SKY_VERMILION = new Color('#ff4b26');
const SKY_AMBER = new Color('#ff8a1f');
const BG_CRT: Rgb8 = [11, 7, 24];

/** Age ramp of the exposures: the newest in sodium, then candy, ultraviolet, indigo. */
const AGE_RAMP = ['#ffcc17', '#ff4fa0', '#b04bff', '#3a1c8c'].map((c) => new Color(c));
export function ageColor(age: number, out = new Color(), ramp = AGE_RAMP): Color {
  const t = Math.min(0.999, Math.max(0, age)) * (ramp.length - 1);
  const i = Math.floor(t);
  return out.copy(ramp[i]).lerp(ramp[i + 1], t - i);
}
/** In TIME VIEW every exposure has to show against the night: the oldest stays in ultraviolet. */
const RIBBON_RAMP = AGE_RAMP.slice(0, 3);

export interface RainRunFrame {
  sim: RainRunSim;
  /** State of the machine. */
  state: 'attract' | 'play' | 'timeview' | 'gameover';
  /** Pose of the ghost at this instant (or null). */
  ghost: Pose | null;
  rain: boolean;
  flip: boolean;
}

/** Applies a 50 % on-screen stipple (the ghost and the invulnerable taxi blink by dither). */
function stipple<T extends Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\n if (mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;',
    );
  };
  material.customProgramCacheKey = () => 'stipple';
  return material;
}

/** Facets readable under any light: the face in shadow keeps 55 % of its color. */
function facets<T extends Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.55;',
    );
  };
  material.customProgramCacheKey = () => 'facets';
  return material;
}

type Face = { normal: [number, number, number]; corners: [number, number, number][] };

function boxFaces(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Record<string, Face> {
  return {
    px: { normal: [1, 0, 0], corners: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    nx: { normal: [-1, 0, 0], corners: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    py: { normal: [0, 1, 0], corners: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
    pz: { normal: [0, 0, 1], corners: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    nz: { normal: [0, 0, -1], corners: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
  };
}

class GeometryBuilder {
  readonly position: number[] = [];
  readonly normal: number[] = [];
  readonly uv: number[] = [];
  readonly color: number[] = [];

  quad(face: Face, uv: [number, number][], color: Color): void {
    const [a, b, c, d] = face.corners;
    const order = [0, 1, 2, 0, 2, 3];
    const corners = [a, b, c, d];
    for (const i of order) {
      this.position.push(...corners[i]);
      this.normal.push(...face.normal);
      this.uv.push(...uv[i]);
      this.color.push(color.r, color.g, color.b);
    }
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.position, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.normal, 3));
    g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new Float32BufferAttribute(this.color, 3));
    return g;
  }
}

const TOWER_SHADES = ['#3a1c8c', '#2a1470', '#1b1140', '#4b2a9c'].map((c) => new Color(c));

export function towerGeometry(towers: Tower[]): BufferGeometry {
  const builder = new GeometryBuilder();
  const w = (a: number) => a / 4;
  for (const t of towers) {
    const shade = TOWER_SHADES[t.index % TOWER_SHADES.length];
    const f = boxFaces(t.x0, t.x1, t.y0, t.y1, t.z0, t.z1);
    const uvX = (face: Face): [number, number][] => face.corners.map(([, y, z]) => [w(z), w(y)]);
    const uvZ = (face: Face): [number, number][] => face.corners.map(([x, y]) => [w(x), w(y)]);
    // Only the faces seen from the street or the sky.
    if (t.side === -1) builder.quad(f.px, uvX(f.px), shade);
    else builder.quad(f.nx, uvX(f.nx), shade);
    builder.quad(f.pz, uvZ(f.pz), shade);
    builder.quad(f.nz, uvZ(f.nz), shade);
    builder.quad(f.py, [[0, 0], [0, 0], [0, 0], [0, 0]], shade);
  }
  return builder.build();
}

export function signGeometry(signs: Sign[]): BufferGeometry {
  const builder = new GeometryBuilder();
  const white = new Color('#ffffff');
  for (const s of signs) {
    const [u0, v0, u1, v1] = atlasUv(atlasCell(s.word, s.style));
    const face: [number, number][] = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    const edge: [number, number][] = [
      [u0, v1],
      [u0, v1],
      [u0, v1],
      [u0, v1],
    ];
    const f = boxFaces(s.x0, s.x1, s.y0, s.y1, s.z0, s.z1);
    // Front and back with the word unmirrored; the edge facing the street too.
    builder.quad(f.pz, face, white);
    builder.quad(f.nz, face, white);
    builder.quad(s.side === -1 ? f.px : f.nx, face, white);
    builder.quad(f.py, edge, white);
  }
  return builder.build();
}

export class RainRunView implements EngineView {
  readonly element: HTMLElement;
  /** Progress of the TIME VIEW swing (0 = flight, 1 = side view). */
  swing = 0;
  /** Index (in poses) of the time strip's cursor. */
  scrubPose = 0;
  private swingTarget = 0;
  private swingFrom = 0;
  private swingT = 1;
  private readonly swingDuration = 1.2;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(62, 4 / 3, 0.1, 700);
  private readonly stripCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private readonly arrayCamera = new ArrayCamera([this.camera, this.stripCamera as unknown as PerspectiveCamera]);
  private readonly display: RetroDisplay;
  private readonly phone: boolean;
  private readonly tiles: { left: Group; right: Group; reflection: Group }[] = [];
  private readonly gates: { group: Group; banner: Mesh; k: number }[] = [];
  private readonly gateMats: Record<'idle' | 'pass' | 'miss' | 'crash', MeshBasicMaterial>;
  private readonly taxi: Mesh;
  private readonly taxiStipple: Mesh;
  private readonly ghost: Mesh;
  private readonly trail: InstancedMesh;
  private readonly ribbon: InstancedMesh;
  private readonly stripGates: InstancedMesh;
  private readonly timeGates: InstancedMesh;
  /** Playhead of the time strip in TIME VIEW: a line of light at the chosen moment. */
  private readonly playhead: Mesh;
  private readonly rain: LineSegments;
  private readonly rainMat: ShaderMaterial;
  private readonly sparks: Points;
  private readonly sparkVel: Float32Array;
  private sparkAge = 99;
  private readonly sky: Mesh;
  private readonly street: Mesh;
  private readonly dashes: InstancedMesh;
  private readonly stripBg: Mesh;
  private readonly dummy = new Object3D();
  private readonly tmpColor = new Color();
  private rainTime = 0;
  private frame: RainRunFrame | null = null;
  private ribbonPoses: Pose[] = [];
  private ribbonScale = 1;
  private ribbonSize = 0.6;
  /** Haze density (adjustable during development). */
  haze = HAZE;
  private reveal = 1;
  /** BOOST field-of-view kick (0–1, smoothed). */
  private kick = 0;
  private revealTarget = 1;

  constructor(element: HTMLElement, display: RetroDisplay, tile: CanyonTile, phone: boolean) {
    this.element = element;
    this.display = display;
    this.phone = phone;
    const scene = this.scene;
    scene.fog = new FogExp2(0xff8a1f, HAZE);
    this.arrayCamera.layers.enableAll();
    this.camera.layers.set(0);
    this.camera.layers.enable(LAYER_TIME);
    this.stripCamera.layers.set(LAYER_STRIP);

    scene.add(new HemisphereLight(0x9e1233, 0x1b1140, 1.6));
    const key = new DirectionalLight(0xffcc17, 1.8);
    key.position.set(-0.4, 0.8, 0.6);
    scene.add(key, key.target);

    // Sky: night overhead, wine, vermilion and amber at the horizon (the haze).
    const skyGeo = new IcosahedronGeometry(500, 3);
    const skyPos = skyGeo.getAttribute('position');
    const skyColors = new Float32Array(skyPos.count * 3);
    for (let i = 0; i < skyPos.count; i++) {
      const h = skyPos.getY(i) / 500;
      const c = new Color();
      if (h > 0.45) c.copy(SKY_NIGHT);
      else if (h > 0.2) c.copy(SKY_WINE).lerp(SKY_NIGHT, (h - 0.2) / 0.25);
      else if (h > 0.06) c.copy(SKY_VERMILION).lerp(SKY_WINE, (h - 0.06) / 0.14);
      else c.copy(SKY_AMBER).lerp(SKY_VERMILION, Math.max(0, h) / 0.06);
      c.toArray(skyColors, i * 3);
    }
    skyGeo.setAttribute('color', new Float32BufferAttribute(skyColors, 3));
    this.sky = new Mesh(skyGeo, new MeshBasicMaterial({ vertexColors: true, side: 1, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1;
    this.sky.layers.set(0);
    scene.add(this.sky);

    // The canyon: three segments (previous, current and next), each side separate, and their wet reflection.
    const windows = buildWindowTexture();
    const atlas = buildSignAtlas();
    const towerMat = new MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveMap: windows, flatShading: true });
    const signMat = new MeshBasicMaterial({ map: atlas });
    const towerRefl = new MeshLambertMaterial({
      vertexColors: true,
      color: 0x555566,
      emissive: 0x777777,
      emissiveMap: windows,
      side: DoubleSide,
      flatShading: true,
    });
    const signRefl = new MeshBasicMaterial({ map: atlas, color: 0x6a6a70, side: DoubleSide });
    const leftTowers = towerGeometry(tile.towers.filter((t) => t.side === -1));
    const rightTowers = towerGeometry(tile.towers.filter((t) => t.side === 1));
    const leftSigns = signGeometry(tile.signs.filter((s) => s.side === -1));
    const rightSigns = signGeometry(tile.signs.filter((s) => s.side === 1));
    for (let i = 0; i < 3; i++) {
      const left = new Group();
      left.add(new Mesh(leftTowers, towerMat), new Mesh(leftSigns, signMat));
      const right = new Group();
      right.add(new Mesh(rightTowers, towerMat), new Mesh(rightSigns, signMat));
      const reflection = new Group();
      if (!phone) {
        reflection.add(
          new Mesh(leftTowers, towerRefl),
          new Mesh(leftSigns, signRefl),
          new Mesh(rightTowers, towerRefl),
          new Mesh(rightSigns, signRefl),
        );
        reflection.scale.y = -1;
      }
      scene.add(left, right, reflection);
      this.tiles.push({ left, right, reflection });
    }

    // Wet street: a translucent veil over the reflection, and the sodium center line.
    this.street = new Mesh(
      new PlaneGeometry(STREET_HALF * 2 + 18, 700),
      new MeshBasicMaterial({ color: 0x1b1140, transparent: true, opacity: phone ? 1 : 0.58, depthWrite: false }),
    );
    this.street.rotation.x = -Math.PI / 2;
    this.street.renderOrder = 1;
    scene.add(this.street);
    this.dashes = new InstancedMesh(new BoxGeometry(0.22, 0.02, 2.6), new MeshBasicMaterial({ color: 0xffcc17 }), 60);
    this.dashes.frustumCulled = false;
    scene.add(this.dashes);

    // Light gates: one recycled group per visible gate.
    const bannerField = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 16;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 16);
      ctx.fillStyle = '#140a24';
      ctx.fillRect(0, 0, 128, 2);
      ctx.fillRect(0, 14, 128, 2);
      ctx.fillStyle = '#ffcc17';
      for (let x = 3; x < 128; x += 8) ctx.fillRect(x, 6, 3, 4);
      return new MeshBasicMaterial({ map: canvasTexture(canvas) });
    };
    this.gateMats = {
      idle: bannerField('#ff4fa0'),
      pass: bannerField('#1fd68a'),
      miss: bannerField('#7a7fb0'),
      crash: bannerField('#ff4b26'),
    };
    const postMat = new MeshBasicMaterial({ color: 0xffcc17 });
    const postGeo = new BoxGeometry(GATE_POST, 1, 0.3);
    const bannerGeo = new BoxGeometry(STREET_HALF * 2, GATE_BANNER, 0.3);
    for (let i = 0; i < 7; i++) {
      const group = new Group();
      const banner = new Mesh(bannerGeo, this.gateMats.idle);
      const postL = new Mesh(postGeo, postMat);
      const postR = new Mesh(postGeo, postMat);
      postL.name = 'L';
      postR.name = 'R';
      group.add(banner, postL, postR);
      scene.add(group);
      this.gates.push({ group, banner, k: -1 });
    }

    // The taxi, its dithered version (invulnerable) and the candy-pink ghost.
    const taxiGeo = buildTaxiGeometry();
    this.taxi = new Mesh(taxiGeo, facets(new MeshLambertMaterial({ vertexColors: true, flatShading: true })));
    this.taxi.layers.enable(LAYER_TIME);
    this.taxiStipple = new Mesh(taxiGeo, stipple(new MeshBasicMaterial({ vertexColors: true })));
    this.ghost = new Mesh(taxiGeo, stipple(new MeshBasicMaterial({ color: 0xff4fa0 })));
    scene.add(this.taxi, this.taxiStipple, this.ghost);

    // Side strip: background, ground and the 72-pose trail seen from the side (its own layer).
    this.stripBg = new Mesh(new PlaneGeometry(2000, 200), new MeshBasicMaterial({ color: 0x1b1140, fog: false }));
    this.stripBg.rotation.y = Math.PI / 2;
    this.stripBg.layers.set(LAYER_STRIP);
    this.stripBg.frustumCulled = false;
    scene.add(this.stripBg);
    const ground = new Mesh(new BoxGeometry(0.1, 0.8, 2000), new MeshBasicMaterial({ color: 0x3a1c8c, fog: false }));
    ground.position.y = -0.4;
    ground.layers.set(LAYER_STRIP);
    ground.frustumCulled = false;
    this.stripBg.userData.ground = ground;
    scene.add(ground);

    const ribbonMat = facets(new MeshLambertMaterial({ flatShading: true, fog: false }));
    const flatMat = new MeshBasicMaterial({ fog: false });
    this.trail = new InstancedMesh(taxiGeo, flatMat, 72);
    this.trail.layers.set(LAYER_STRIP);
    this.trail.frustumCulled = false;
    scene.add(this.trail);
    this.stripGates = new InstancedMesh(new BoxGeometry(0.2, 1, 2.4), new MeshBasicMaterial({ fog: false }), 12);
    this.stripGates.layers.set(LAYER_STRIP);
    this.stripGates.frustumCulled = false;
    scene.add(this.stripGates);

    // TIME VIEW: the chronophotographic ribbon and the compressed gates.
    this.ribbon = new InstancedMesh(taxiGeo, ribbonMat, MAX_RIBBON);
    this.ribbon.layers.set(LAYER_TIME);
    this.ribbon.frustumCulled = false;
    this.ribbon.count = 0;
    scene.add(this.ribbon);
    this.timeGates = new InstancedMesh(new BoxGeometry(0.2, 1, 0.3), new MeshBasicMaterial({ fog: false }), 120);
    this.timeGates.layers.set(LAYER_TIME);
    this.timeGates.frustumCulled = false;
    this.timeGates.count = 0;
    scene.add(this.timeGates);
    this.playhead = new Mesh(new BoxGeometry(0.1, 9.4, 0.16), new MeshBasicMaterial({ color: 0xffffff, fog: false }));
    this.playhead.layers.set(LAYER_TIME);
    this.playhead.visible = false;
    scene.add(this.playhead);

    // Rain: segments falling at an 8° slant; the shader resolves the position.
    const drops = phone ? 400 : 1200;
    const base = new Float32Array(drops * 2 * 3);
    const end = new Float32Array(drops * 2);
    const shade = new Float32Array(drops * 2);
    let seed = 11;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < drops; i++) {
      const x = (rand() * 2 - 1) * 9.5;
      const y = rand() * 40;
      const z = rand() * 80;
      const s = rand();
      for (let v = 0; v < 2; v++) {
        base.set([x, y, z], (i * 2 + v) * 3);
        end[i * 2 + v] = v;
        shade[i * 2 + v] = s;
      }
    }
    const rainGeo = new BufferGeometry();
    rainGeo.setAttribute('position', new Float32BufferAttribute(base, 3));
    rainGeo.setAttribute('aEnd', new Float32BufferAttribute(end, 1));
    rainGeo.setAttribute('aShade', new Float32BufferAttribute(shade, 1));
    this.rainMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCam: { value: new Vector3() } },
      vertexShader: /* glsl */ `
        attribute float aEnd;
        attribute float aShade;
        uniform float uTime;
        uniform vec3 uCam;
        varying float vShade;
        void main() {
          float y = mod(position.y - uTime * 38.0, 40.0) - 4.0;
          float z = uCam.z - 72.0 + mod(position.z - uCam.z, 80.0);
          vec3 p = vec3(position.x + y * 0.14, y, z);
          p += aEnd * vec3(-0.15, 1.05, 0.0);
          vShade = aShade;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vShade;
        void main() {
          vec3 slate = vec3(0.19, 0.21, 0.44);
          vec3 pale = vec3(0.70, 0.74, 1.0);
          gl_FragColor = vec4(mix(slate, pale, vShade), 1.0);
        }`,
      depthWrite: false,
    });
    this.rain = new LineSegments(rainGeo, this.rainMat);
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    // Crash spark: dithered sodium and amber, never a white flash.
    const sparkCount = 64;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkCol = new Float32Array(sparkCount * 3);
    this.sparkVel = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) (i % 3 === 0 ? new Color('#ff8a1f') : new Color('#ffcc17')).toArray(sparkCol, i * 3);
    const sparkGeo = new BufferGeometry();
    sparkGeo.setAttribute('position', new Float32BufferAttribute(sparkPos, 3));
    sparkGeo.setAttribute('color', new Float32BufferAttribute(sparkCol, 3));
    this.sparks = new Points(sparkGeo, new PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, blending: AdditiveBlending, depthWrite: false }));
    this.sparks.frustumCulled = false;
    this.sparks.visible = false;
    scene.add(this.sparks);
  }

  /** The state to draw on the next render. */
  setFrame(frame: RainRunFrame): void {
    this.frame = frame;
  }

  /** Turns the screen on with the display's dissolve (once). */
  powerOn(instant: boolean): void {
    this.reveal = instant ? 1 : 0;
    this.revealTarget = 1;
  }

  /** Opens or closes TIME VIEW: a 1.2 s swing, or a cut with reduced motion. */
  setTimeView(on: boolean, instant: boolean): void {
    this.swingTarget = on ? 1 : 0;
    if (on) this.prepareRibbon();
    if (instant) {
      this.swing = this.swingTarget;
      this.swingT = 1;
    } else {
      this.swingFrom = this.swing;
      this.swingT = 0;
    }
  }

  /** Number of moments the ribbon shows. */
  get moments(): number {
    return this.ribbonPoses.length;
  }

  /** Pose indices of the ribbon (for the time strip). */
  ribbonEvery(): number {
    return this.phone ? 6 : 3;
  }

  crash(sim: RainRunSim): void {
    this.sparkAge = 0;
    this.sparks.visible = true;
    const pos = this.sparks.geometry.getAttribute('position') as Float32BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, sim.x, sim.y, sim.z - 1.6);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      this.sparkVel.set([Math.cos(a) * (2 + 6 * Math.random()), 2 + 7 * up, Math.sin(a) * 3 + 8], i * 3);
    }
    pos.needsUpdate = true;
  }

  /** Advances the view's own animations; true while something moves. */
  animate(dt: number, rainRunning: boolean): boolean {
    let moving = false;
    if (this.swingT < 1) {
      this.swingT = Math.min(1, this.swingT + dt / this.swingDuration);
      const e = easeInOutCubic(this.swingT);
      this.swing = this.swingFrom + (this.swingTarget - this.swingFrom) * e;
      moving = true;
    }
    if (this.reveal < this.revealTarget) {
      this.reveal = Math.min(1, this.reveal + dt / 0.4);
      moving = true;
    }
    if (this.sparkAge < 0.6) {
      this.sparkAge += dt;
      const pos = this.sparks.geometry.getAttribute('position') as Float32BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        this.sparkVel[i * 3 + 1] -= 20 * dt;
        pos.setXYZ(
          i,
          pos.getX(i) + this.sparkVel[i * 3] * dt,
          pos.getY(i) + this.sparkVel[i * 3 + 1] * dt,
          pos.getZ(i) + this.sparkVel[i * 3 + 2] * dt,
        );
      }
      pos.needsUpdate = true;
      this.sparks.visible = this.sparkAge < 0.6;
      moving = true;
    }
    if (rainRunning) this.rainTime += dt;
    const boosting = this.frame ? this.frame.sim.boostLeft > 0 && this.frame.state === 'play' : false;
    const kickTarget = boosting ? 1 : 0;
    if (Math.abs(this.kick - kickTarget) > 0.001) {
      this.kick += (kickTarget - this.kick) * (1 - Math.exp(-dt * 8));
      moving = true;
    }
    return moving;
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const frame = this.frame;
    if (!frame) return;
    const sim = frame.sim;
    const portrait = rect.height > rect.width;
    const stripFrac = this.phone ? STRIP_FRACTION_PHONE : STRIP_FRACTION;
    const showStrip = this.swing < 0.02;
    const e = this.swing;

    // Taxi position: the flight's, or the cursor's in TIME VIEW.
    const now = sim.poses[sim.poses.length - 1];
    let tx = sim.x;
    let ty = sim.y;
    let tz = sim.z;
    let bank = sim.bank;
    let pitch = sim.pitch;

    this.updateTiles(tz, e);
    this.updateGates(sim, e);
    this.updateDashes(tz);
    this.rain.visible = frame.rain && this.swing < 0.5;
    this.rainMat.uniforms.uTime.value = this.rainTime;

    // TIME VIEW: the ribbon compresses toward the present while the camera swings.
    let ribbonCentre = tz;
    if (e > 0 && this.ribbonPoses.length > 0) {
      const anchor = now ? now.z : tz;
      const s = 1 + (this.ribbonScale - 1) * e;
      const scale = 1 + (this.ribbonSize - 1) * e;
      const n = this.ribbonPoses.length;
      this.ribbon.count = n;
      for (let i = 0; i < n; i++) {
        const p = this.ribbonPoses[i];
        // Side elevation: x (depth for this camera) is flattened, as in an orthographic projection.
        this.dummy.position.set(p.x * (1 - e), p.y, anchor + (p.z - anchor) * s);
        this.dummy.rotation.set(p.pitch, 0, p.bank);
        this.dummy.scale.setScalar(scale);
        this.dummy.updateMatrix();
        this.ribbon.setMatrixAt(i, this.dummy.matrix);
        this.ribbon.setColorAt(i, ageColor(1 - i / Math.max(1, n - 1), this.tmpColor, RIBBON_RAMP));
      }
      this.ribbon.instanceMatrix.needsUpdate = true;
      if (this.ribbon.instanceColor) this.ribbon.instanceColor.needsUpdate = true;
      const first = this.ribbonPoses[0];
      ribbonCentre = anchor + ((first.z - anchor) * s) / 2;
      // The solid taxi marks the cursor's moment.
      const cursor = sim.poses[Math.min(this.scrubPose, sim.poses.length - 1)];
      if (cursor) {
        tx = cursor.x * (1 - e);
        ty = cursor.y;
        tz = anchor + (cursor.z - anchor) * s;
        bank = cursor.bank;
        pitch = cursor.pitch;
      }
      this.playhead.visible = e > 0.6;
      this.playhead.position.set(1.5, 5.0, tz);
      this.updateTimeGates(sim, anchor, s, e);
    } else {
      this.ribbon.count = 0;
      this.timeGates.count = 0;
      this.playhead.visible = false;
    }

    const invulnerable = sim.invulnerable > 0 && frame.state === 'play';
    for (const mesh of [this.taxi, this.taxiStipple]) {
      mesh.position.set(tx, ty, tz);
      mesh.rotation.set(pitch, 0, bank);
      mesh.scale.setScalar(1 - 0.15 * e);
    }
    this.taxi.visible = !invulnerable;
    this.taxiStipple.visible = invulnerable;

    const ghost = frame.ghost;
    this.ghost.visible = ghost !== null && e < 0.5;
    if (ghost) {
      this.ghost.position.set(ghost.x, ghost.y, ghost.z);
      this.ghost.rotation.set(ghost.pitch, 0, ghost.bank);
    }

    // Camera: behind the taxi in flight; from the side (from +x) in TIME VIEW.
    const flightAspect = rect.width / (rect.height * (showStrip ? 1 - stripFrac : 1));
    const chaseTarget = new Vector3(sim.x * 0.3, sim.y * 0.45 + 1.4, sim.z - 30);
    const side = sideCamera(portrait);
    const sideTarget = new Vector3(0, 5.2, ribbonCentre);
    const target = chaseTarget.lerp(sideTarget, e);
    const angle = (e * Math.PI) / 2;
    const dist = 37.5 + (side.distance - 37.5) * e;
    // The flight camera rides 2.6 u above the taxi: its roof shows and it stands out against the dark street.
    const lift = (sim.y * 0.55 + 1.2) * (1 - e);
    this.camera.position.set(
      target.x + Math.sin(angle) * dist + sim.x * 0.55 * (1 - e),
      target.y + lift,
      target.z + Math.cos(angle) * dist,
    );
    this.camera.fov = (portrait ? 66 : 60) * (1 - e) + side.fov * e + 9 * this.kick * (1 - e);
    this.camera.aspect = flightAspect;
    this.camera.near = 0.1;
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);
    this.rainMat.uniforms.uCam.value.copy(this.camera.position);
    this.street.position.set(0, 0, this.camera.position.z - 300);
    (this.street.material as MeshBasicMaterial).opacity = this.phone ? 1 : 0.58 + 0.42 * Math.min(1, e * 3);
    (this.scene.fog as FogExp2).density = this.haze * (1 - e) + 0.004 * e;

    // FLIP (service panel): mirrors the screen horizontally.
    if (frame.flip) this.camera.projectionMatrix.elements[0] *= -1;

    const block = this.display.blockSize(rect.dpr);
    const width = Math.ceil(rect.width / block);
    const height2 = Math.ceil(rect.height / block);
    const stripRows = Math.round(height2 * stripFrac);

    let cam: PerspectiveCamera | ArrayCamera = this.camera;
    if (showStrip) {
      this.updateStrip(sim, frame.flip);
      this.camera.viewport = new Vector4(0, stripRows, width, height2 - stripRows);
      this.stripCamera.viewport = new Vector4(0, 0, width, stripRows);
      const stripAspect = width / Math.max(1, stripRows);
      const span = STRIP_SPAN;
      const halfH = span / stripAspect / 2;
      const zc = sim.z + span / 2 - 26;
      this.stripCamera.left = -span / 2;
      this.stripCamera.right = span / 2;
      this.stripCamera.top = halfH;
      this.stripCamera.bottom = -halfH;
      this.stripCamera.position.set(60, 4.8, zc);
      this.stripCamera.lookAt(0, 4.8, zc);
      this.stripCamera.updateProjectionMatrix();
      if (frame.flip) this.stripCamera.projectionMatrix.elements[0] *= -1;
      this.stripCamera.updateMatrixWorld();
      this.stripBg.position.set(-20, 4.8, zc);
      (this.stripBg.userData.ground as Mesh).position.z = zc;
      this.arrayCamera.projectionMatrix.copy(this.camera.projectionMatrix);
      this.arrayCamera.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse);
      this.arrayCamera.matrixWorld.copy(this.camera.matrixWorld);
      this.arrayCamera.matrixWorldInverse.copy(this.camera.matrixWorldInverse);
      this.arrayCamera.matrixWorldAutoUpdate = false;
      cam = this.arrayCamera;
    }

    this.display.render(renderer, rect, this.scene, cam, {
      background: BG_CRT,
      reveal: this.reveal,
      mask: { shape: 'roundrect', radius: this.phone ? 14 : 20 },
    });
  }

  private prepareRibbon(): void {
    const sim = this.frame?.sim;
    if (!sim) return;
    const every = this.ribbonEvery();
    this.ribbonPoses = ribbonIndices(sim.poses.length, every).map((i) => sim.poses[i]);
    const last = sim.poses[sim.poses.length - 1];
    const first = sim.poses[0];
    const length = first && last ? Math.max(1, first.z - last.z) : 1;
    // Final length of the ribbon: 72 % of the side view's visible width (the taxis at the ends stick out).
    const box = this.element.getBoundingClientRect();
    const portrait = box.height > box.width;
    const side = sideCamera(portrait);
    const visibleH = 2 * side.distance * Math.tan((side.fov * Math.PI) / 360);
    const fit = 0.72 * visibleH * (box.width / Math.max(1, box.height));
    this.ribbonScale = Math.min(1, fit / length);
    // Size of each exposure: smaller the denser the ribbon, never below 0.4.
    const spacing = (fit / Math.max(1, this.ribbonPoses.length)) * Math.min(1, length / fit);
    this.ribbonSize = Math.max(0.4, Math.min(0.75, spacing * 1.6));
    this.scrubPose = Math.max(0, sim.poses.length - 1);
  }

  private updateTiles(z: number, e: number): void {
    const m = Math.floor(-z / TILE);
    this.tiles.forEach((tile, i) => {
      const offset = -(m - 1 + i) * TILE;
      tile.left.position.z = offset;
      tile.right.position.z = offset;
      tile.reflection.position.z = offset;
      // In the side view, the near facade (right) moves aside to reveal the flight.
      tile.right.visible = e < 0.3;
      tile.reflection.visible = e < 0.3;
    });
  }

  private updateGates(sim: RainRunSim, e: number): void {
    const first = Math.max(0, sim.nextGate - 1);
    this.gates.forEach((slot, i) => {
      const k = first + i;
      const gate = sim.gate(k);
      slot.group.visible = e < 0.2;
      slot.group.position.z = gate.z;
      const top = gate.y + GATE_H / 2;
      slot.banner.position.set(0, top + GATE_BANNER / 2, 0);
      const result = sim.gateResults.get(k);
      slot.banner.material = this.gateMats[result ?? 'idle'];
      for (const post of slot.group.children) {
        if (post.name === 'L' || post.name === 'R') {
          const dir = post.name === 'L' ? -1 : 1;
          post.scale.y = top;
          post.position.set(gate.x + dir * (GATE_W / 2 + GATE_POST / 2), top / 2, 0);
        }
      }
      slot.k = k;
    });
  }

  private updateDashes(z: number): void {
    this.dashes.visible = this.swing < 0.3;
    const start = Math.floor(z / 8) * 8 + 16;
    for (let i = 0; i < this.dashes.count; i++) {
      this.dummy.position.set(0, 0.02, start - i * 8);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.dashes.setMatrixAt(i, this.dummy.matrix);
    }
    this.dashes.instanceMatrix.needsUpdate = true;
  }

  private updateStrip(sim: RainRunSim, _flip: boolean): void {
    const trail = sim.trail(72);
    const n = trail.length;
    this.trail.count = n + 1;
    for (let i = 0; i < n; i++) {
      const p = trail[i];
      this.dummy.position.set(0, p.y, p.z);
      this.dummy.rotation.set(p.pitch, 0, 0);
      this.dummy.scale.setScalar(1.5);
      this.dummy.updateMatrix();
      this.trail.setMatrixAt(i, this.dummy.matrix);
      this.trail.setColorAt(i, ageColor(1 - i / Math.max(1, n), this.tmpColor));
    }
    // The present, in full sodium.
    this.dummy.position.set(0, sim.y, sim.z);
    this.dummy.rotation.set(sim.pitch, 0, 0);
    this.dummy.scale.setScalar(1.7);
    this.dummy.updateMatrix();
    this.trail.setMatrixAt(n, this.dummy.matrix);
    this.trail.setColorAt(n, this.tmpColor.set('#ffffff'));
    this.trail.instanceMatrix.needsUpdate = true;
    if (this.trail.instanceColor) this.trail.instanceColor.needsUpdate = true;

    // Gates in the strip: passed in mint, missed in slate, crashes in vermilion.
    const firstGate = Math.max(0, sim.nextGate - 6);
    let count = 0;
    for (let k = firstGate; k < firstGate + 12; k++) {
      const gate = sim.gate(k);
      const result = sim.gateResults.get(k);
      const top = gate.y + GATE_H / 2;
      this.dummy.position.set(0, top / 2, gate.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, top + GATE_BANNER, 1);
      this.dummy.updateMatrix();
      this.stripGates.setMatrixAt(count, this.dummy.matrix);
      this.stripGates.setColorAt(count, this.tmpColor.set(gateColor(result)));
      count++;
    }
    this.stripGates.count = count;
    this.stripGates.instanceMatrix.needsUpdate = true;
    if (this.stripGates.instanceColor) this.stripGates.instanceColor.needsUpdate = true;
  }

  private updateTimeGates(sim: RainRunSim, anchor: number, s: number, e: number): void {
    let count = 0;
    for (let k = Math.max(0, sim.nextGate - 120); k < sim.nextGate && count < 120; k++) {
      const gate = sim.gate(k);
      const result = sim.gateResults.get(k);
      const top = gate.y + GATE_H / 2;
      this.dummy.position.set(-0.5, top / 2, anchor + (gate.z - anchor) * s);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, (top + GATE_BANNER) * Math.min(1, e * 1.5), 1);
      this.dummy.updateMatrix();
      this.timeGates.setMatrixAt(count, this.dummy.matrix);
      this.timeGates.setColorAt(count, this.tmpColor.set(gateColor(result)));
      count++;
    }
    this.timeGates.count = count;
    this.timeGates.instanceMatrix.needsUpdate = true;
    if (this.timeGates.instanceColor) this.timeGates.instanceColor.needsUpdate = true;
  }
}

/** Camera for the TIME VIEW side view: distance and vertical fov (13 u of visible height). */
function sideCamera(portrait: boolean): { distance: number; fov: number } {
  return portrait ? { distance: 17, fov: 42 } : { distance: 24.3, fov: 30 };
}

function gateColor(result: string | undefined): string {
  if (result === 'pass') return '#1fd68a';
  if (result === 'crash') return '#ff4b26';
  if (result === 'miss') return '#7a7fb0';
  return '#ff4fa0';
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function canvasTexture(canvas: HTMLCanvasElement): Texture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}
