// WebGL views of the bench (a dynamic chunk, alongside the Scope's): Sow's seed head as instanced
// hexagonal pyramids, the lathe with its rosette, the pot and the drop, and the honeycomb frame with
// its stack of wax layers. Each one goes through its own retro display, with its section's 1-bit palette.

import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Engine, EngineView, ViewRect } from '../../../engine/engine/Engine';
import { displayRegistry } from '../../shared/displays';
import { motion } from '../../shared/motion';
import { cellAt, cellCenter, frameSize } from '../hive/hexLife';
import type { HiveController, HiveRenderer } from '../hive/controller';
import type { LatheController, LathePick, LatheRenderer } from '../lathe/controller';
import { leafFrames } from '../lathe/rosette';
import type { SowController } from '../sow/controller';
import { toGeometry } from '../specimens/geometry';
import { GLASS, Mesher, mix, rosetteMesh, snapFacets, type Rgb, type V3 } from '../specimens/mesh';
import type { ToyRenderer } from './common';

const SHEET: [number, number, number] = [253, 253, 246];
const TAU = Math.PI * 2;

function lights(scene: Scene, key: V3): DirectionalLight {
  const light = new DirectionalLight(0xffffff, 0.62 * Math.PI);
  light.position.set(...key);
  const fill = new HemisphereLight(0xfdfdf6, 0x4a1d6b, 0.5 * Math.PI);
  scene.add(light, fill);
  return light;
}

const tmpColor = new Color();
function srgb(c: [number, number, number]): Color {
  return tmpColor.setRGB(c[0], c[1], c[2], SRGBColorSpace);
}
function linear(c: Rgb): Color {
  return tmpColor.setRGB(c[0], c[1], c[2]);
}

/** Low hexagonal pyramid (radius 1): one floret, one seed. */
function hexPyramid(height = 0.55): BufferGeometry {
  const m = new Mesher();
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * TAU;
    const a1 = ((k + 1) / 6) * TAU;
    m.tri([0, 0, height], [Math.cos(a0), Math.sin(a0), 0], [Math.cos(a1), Math.sin(a1), 0], [1, 1, 1]);
  }
  return toGeometry(m);
}

/** Flat hexagonal ring (a rule) between two radii; `pointy` turns it 30° (honeycomb cells). */
function hexRing(inner: number, outer: number, color: Rgb = [1, 1, 1], pointy = false, z = 0): BufferGeometry {
  const m = new Mesher();
  const off = pointy ? Math.PI / 6 : 0;
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * TAU + off;
    const a1 = ((k + 1) / 6) * TAU + off;
    m.quad(
      [inner * Math.cos(a0), inner * Math.sin(a0), z],
      [outer * Math.cos(a0), outer * Math.sin(a0), z],
      [outer * Math.cos(a1), outer * Math.sin(a1), z],
      [inner * Math.cos(a1), inner * Math.sin(a1), z],
      color,
    );
  }
  return toGeometry(m);
}

/** The display's one-time reveal: the dither threshold rises from 0 to 1 in 700 ms. */
class Reveal {
  value = 1;
  private start = -1;
  begin(engine: Engine, view: EngineView): void {
    if (motion.reduced || this.start >= 0) return;
    this.value = 0;
    this.start = performance.now();
    const stop = engine.addTicker((_dt, now) => {
      const t = Math.min(1, (now - this.start) / 700);
      this.value = 1 - Math.pow(1 - t, 3);
      engine.invalidate(view);
      if (t >= 1) stop();
      return t < 1;
    });
  }
}

// ------------------------------------------------------------------------------------------ Sow

class SowView implements EngineView {
  readonly reveal = new Reveal();
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, -4, 4);
  private readonly seeds: InstancedMesh;
  private readonly rays: InstancedMesh;
  private readonly receptacle: Mesh;
  private readonly keyline: Mesh;
  private readonly hoverRing: Mesh;
  private dirty = true;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly axis = new Vector3(0, 0, 1);
  private readonly pos = new Vector3();
  private readonly scl = new Vector3();

  constructor(
    readonly element: HTMLElement,
    private readonly sow: SowController,
    private readonly display: RetroDisplay,
  ) {
    this.camera.position.set(0, 0, 2);
    lights(this.scene, [-0.55, 0.55, 0.75]);
    const material = new MeshLambertMaterial({ flatShading: true });
    this.seeds = new InstancedMesh(hexPyramid(), material, sow.max);
    this.seeds.count = 0;
    this.seeds.frustumCulled = false;
    // Ray petals: 34 kites outside the seed head, at the same divergence.
    const kite = new Mesher();
    kite.tri([0, 0, 0.02], [0.45, -0.28, 0.04], [0.45, 0, 0.12], [1, 1, 1]);
    kite.tri([0, 0, 0.02], [0.45, 0, 0.12], [0.45, 0.28, 0.04], [1, 1, 1]);
    kite.tri([0.45, -0.28, 0.04], [1, 0, -0.02], [0.45, 0, 0.12], [1, 1, 1]);
    kite.tri([0.45, 0, 0.12], [1, 0, -0.02], [0.45, 0.28, 0.04], [1, 1, 1]);
    this.rays = new InstancedMesh(toGeometry(kite), material, 34);
    this.rays.frustumCulled = false;
    // Propolis receptacle: the dark backing of the seed head, up to the "Scrub births" point.
    const disc = new Mesher();
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * TAU;
      const a1 = ((i + 1) / 48) * TAU;
      disc.tri([0, 0, -0.05], [Math.cos(a0), Math.sin(a0), -0.05], [Math.cos(a1), Math.sin(a1), -0.05], GLASS.propolis);
    }
    this.receptacle = new Mesh(toGeometry(disc), new MeshLambertMaterial({ vertexColors: true }));
    this.keyline = new Mesh(hexRing(1, 1.45, GLASS.ink), new MeshBasicMaterial({ vertexColors: true }));
    this.hoverRing = new Mesh(hexRing(1.1, 1.6, GLASS.ink), new MeshBasicMaterial({ vertexColors: true }));
    this.scene.add(this.receptacle, this.rays, this.seeds, this.keyline, this.hoverRing);
  }

  sync(): void {
    this.dirty = true;
  }

  private rebuild(): void {
    const sow = this.sow;
    const count = sow.count;
    const c = sow.scale;
    const alpha = (sow.alpha * Math.PI) / 180;
    const lit = Math.min(count, sow.bloomFront, Number.isFinite(sow.scrubAt) ? sow.scrubAt + 1 : count);
    let shown = 0;
    for (let n = 0; n < count; n++) {
      const g = sow.grow(n);
      const dim = sow.dimmed(n);
      let size = 0.74 * c * g;
      if (dim) size = n % 2 ? 0 : 0.42 * c;
      const newest = n === count - 1 && !Number.isFinite(sow.scrubAt);
      if (newest) size = 1.25 * c * g;
      const [x, y] = sow.position(n);
      const u = n / Math.max(1, count - 1);
      this.pos.set(x, y, 0.1 * (1 - u * u));
      this.q.setFromAxisAngle(this.axis, n * alpha);
      this.scl.set(size, size, size);
      this.m.compose(this.pos, this.q, this.scl);
      this.seeds.setMatrixAt(shown, this.m);
      const color = newest ? [0xe8 / 255, 0x17 / 255, 0x5d / 255] : dim ? [0x1b / 255, 0x0f / 255, 0x2e / 255] : sow.color(n);
      this.seeds.setColorAt(shown, srgb(color as [number, number, number]));
      shown++;
    }
    this.seeds.count = shown;
    this.seeds.instanceMatrix.needsUpdate = true;
    if (this.seeds.instanceColor) this.seeds.instanceColor.needsUpdate = true;
    // Receptacle and ray petals, sized to what has been sown up to the "Scrub births" point.
    const radius = lit > 0 ? c * Math.sqrt(lit + 0.5) + 0.7 * c : 0;
    const bloom = count > 0 ? sow.grow(Math.max(0, lit - 1)) : 0;
    this.receptacle.scale.setScalar(Math.max(0.0001, radius));
    this.receptacle.visible = lit > 0;
    const rays = lit >= 34 && !Number.isFinite(sow.scrubAt) ? 34 : 0;
    for (let k = 0; k < rays; k++) {
      const n = lit + k;
      const theta = n * alpha;
      const len = 0.16 * bloom;
      this.pos.set(Math.cos(theta) * (radius - 0.01), Math.sin(theta) * (radius - 0.01), 0);
      this.q.setFromAxisAngle(this.axis, theta);
      this.scl.set(Math.max(0.0001, len), Math.max(0.0001, len * (0.55 + 0.15 * (k % 3))), len);
      this.m.compose(this.pos, this.q, this.scl);
      this.rays.setMatrixAt(k, this.m);
      this.rays.setColorAt(k, linear(k % 2 ? GLASS.pollen : mix(GLASS.pollen, GLASS.honey, 0.6)));
    }
    this.rays.count = rays;
    this.rays.instanceMatrix.needsUpdate = true;
    if (this.rays.instanceColor) this.rays.instanceColor.needsUpdate = true;
    // The NOW: the newest seed, in ruby, with an ink rule beneath it.
    const newest = count - 1;
    this.keyline.visible = count > 0 && !Number.isFinite(sow.scrubAt);
    if (this.keyline.visible) {
      const [x, y] = sow.position(newest);
      this.keyline.position.set(x, y, 0.2);
      this.keyline.rotation.z = newest * alpha;
      this.keyline.scale.setScalar(1.25 * c * sow.grow(newest));
    }
    this.hoverRing.visible = sow.hover >= 0 && sow.hover < count;
    if (this.hoverRing.visible) {
      const [x, y] = sow.position(sow.hover);
      this.hoverRing.position.set(x, y, 0.25);
      this.hoverRing.rotation.z = sow.hover * alpha;
      this.hoverRing.scale.setScalar(0.9 * c);
    }
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    if (this.dirty) {
      this.dirty = false;
      this.rebuild();
    }
    this.display.render(renderer, rect, this.scene, this.camera, { background: SHEET, mask: { shape: 'ellipse' }, reveal: this.reveal.value });
  }
}

// ------------------------------------------------------------------------------------------ lathe

// The lathe's window light: the same for the baked shading of the faces and for the drop.
const LATHE_LIGHT: V3 = [-2, -2.6, 4];

// Faces in a single glass color each (baked with snapFacets), without lights; they are pushed back
// a little so each leaf's ink outline always stays on top.
function facetMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 6 });
}

class LatheView implements EngineView {
  readonly reveal = new Reveal();
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 0.1, 40);
  private readonly plant: Mesh;
  private readonly outline: LineSegments;
  private readonly drop: Mesh;
  private readonly ghosts: Mesh[] = [];
  private readonly material = facetMaterial();
  private leafOfTri: number[] = [];
  private builtVersion = -1;
  private dirty = true;
  private aspect = 1;
  private readonly raycaster = new Raycaster();

  constructor(
    readonly element: HTMLElement,
    private readonly lathe: LatheController,
    private readonly display: RetroDisplay,
  ) {
    this.camera.up.set(0, 0, 1);
    lights(this.scene, LATHE_LIGHT);
    this.plant = new Mesh(new BufferGeometry(), this.material);
    // Outline of each leaf: 1 render px (3 CSS px with the display at 1/3), in ink.
    this.outline = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: srgb([0x1b / 255, 0x0f / 255, 0x2e / 255]).clone() }));
    this.scene.add(this.plant, this.outline, this.pot());
    // The drop and its exposures show through the leaves (a plate of exposures, not an object hidden
    // among them): they are drawn last, without a depth test.
    const dropGeometry = new IcosahedronGeometry(0.075, 0);
    const water = new MeshLambertMaterial({ color: srgb([0x5f / 255, 0xb4 / 255, 0xff / 255]).clone(), flatShading: true, depthTest: false });
    this.drop = new Mesh(dropGeometry, water);
    this.drop.visible = false;
    this.drop.renderOrder = 20;
    const rim = new Mesh(new IcosahedronGeometry(0.1, 0), new MeshBasicMaterial({ color: srgb([0x1b / 255, 0x0f / 255, 0x2e / 255]).clone(), depthTest: false }));
    rim.renderOrder = 19;
    this.drop.add(rim);
    this.scene.add(this.drop);
    for (let i = 0; i < 16; i++) {
      const ghost = new Mesh(
        dropGeometry,
        new MeshLambertMaterial({ color: water.color, flatShading: true, transparent: true, opacity: 0.25 + 0.55 * (i / 15), depthWrite: false, depthTest: false }),
      );
      ghost.renderOrder = 10 + i;
      ghost.scale.setScalar(0.8);
      ghost.visible = false;
      this.ghosts.push(ghost);
      this.scene.add(ghost);
    }
  }

  /** Low-poly pot: an eight-sided truncated cone, with propolis soil. */
  private pot(): Mesh {
    const m = new Mesher();
    const sides = 8;
    // Small, so that from above it stays under the leaves (its faces peeking between leaves read as
    // shards); on the staircase it shows whole, as a base.
    const top = 0.32;
    const bottom = 0.24;
    const h = 0.3;
    const clay = mix(GLASS.honey, GLASS.vermilion, 0.45);
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * TAU + Math.PI / 8;
      const a1 = ((i + 1) / sides) * TAU + Math.PI / 8;
      const p = (r: number, a: number, z: number): V3 => [r * Math.cos(a), r * Math.sin(a), z];
      m.quad(p(top, a0, -0.02), p(bottom, a0, -h), p(bottom, a1, -h), p(top, a1, -0.02), clay, false);
      // Rim.
      m.quad(p(top + 0.05, a0, 0.02), p(top + 0.05, a0, -0.1), p(top + 0.05, a1, -0.1), p(top + 0.05, a1, 0.02), mix(clay, GLASS.sheet, 0.15), false);
      m.quad(p(top - 0.02, a0, 0.02), p(top + 0.05, a0, 0.02), p(top + 0.05, a1, 0.02), p(top - 0.02, a1, 0.02), mix(clay, GLASS.sheet, 0.3), false);
      m.tri([0, 0, 0.0], p(top - 0.02, a0, 0.0), p(top - 0.02, a1, 0.0), GLASS.propolis, false);
    }
    const pot = new Mesh(toGeometry(snapFacets(m, LATHE_LIGHT)), facetMaterial());
    // Ink rule on the pot's rim: it reads as a pot, not as shards.
    const rim: number[] = [];
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * TAU + Math.PI / 8;
      const a1 = ((i + 1) / sides) * TAU + Math.PI / 8;
      for (const [r, z] of [[top + 0.05, 0.02], [top + 0.05, -0.1], [top - 0.02, 0.02]] as const) {
        rim.push(r * Math.cos(a0), r * Math.sin(a0), z, r * Math.cos(a1), r * Math.sin(a1), z);
      }
    }
    const rimGeometry = new BufferGeometry();
    rimGeometry.setAttribute('position', new Float32BufferAttribute(rim, 3));
    pot.add(new LineSegments(rimGeometry, new LineBasicMaterial({ color: srgb([0x1b / 255, 0x0f / 255, 0x2e / 255]).clone() })));
    return pot;
  }

  sync(): void {
    this.dirty = true;
  }

  private rebuild(): void {
    const lathe = this.lathe;
    if (lathe.version !== this.builtVersion) {
      this.builtVersion = lathe.version;
      this.leafOfTri = [];
      const outline: number[] = [];
      const mesh = rosetteMesh(lathe.params, { raw: true, nowKeyline: true, grow: lathe.blooming ? (k) => lathe.grow(k) : undefined, leafOfTri: this.leafOfTri, outline });
      this.plant.geometry.dispose();
      this.plant.geometry = toGeometry(snapFacets(mesh, LATHE_LIGHT));
      const lines = new BufferGeometry();
      lines.setAttribute('position', new Float32BufferAttribute(outline, 3));
      this.outline.geometry.dispose();
      this.outline.geometry = lines;
    }
    // Camera: orbits around z, at 34° elevation; it moves away and up with the staircase.
    const stretch = Math.max(0, lathe.stretch);
    const yaw = ((lathe.yaw - 90) * Math.PI) / 180;
    // From above the rosette reads; as it stretches, the camera drops to show the staircase.
    const elevation = ((50 - 22 * Math.min(1, stretch)) * Math.PI) / 180;
    const targetZ = 0.05 + 0.72 * stretch;
    const distance = 3.9 + 1.8 * stretch;
    this.camera.position.set(
      Math.cos(yaw) * Math.cos(elevation) * distance,
      Math.sin(yaw) * Math.cos(elevation) * distance,
      targetZ + Math.sin(elevation) * distance,
    );
    this.camera.lookAt(0, 0, targetZ);
    // The drop and its 16 exposures.
    const drop = lathe.drop;
    this.drop.visible = !!drop;
    this.ghosts.forEach((g) => (g.visible = false));
    if (drop) {
      const i = Math.min(drop.path.points.length - 1, Math.floor(drop.t * 120));
      this.drop.position.set(...drop.path.points[i]);
      const shown = Math.floor((i / Math.max(1, drop.path.points.length - 1)) * 15);
      for (let k = 0; k <= shown && k < 15; k++) {
        this.ghosts[k].visible = true;
        this.ghosts[k].position.set(...drop.shots[k]);
      }
    }
  }

  pick(clientX: number, clientY: number): LathePick | null {
    const box = this.element.getBoundingClientRect();
    const ndc = new Vector2(((clientX - box.left) / box.width) * 2 - 1, -(((clientY - box.top) / box.height) * 2 - 1));
    this.camera.aspect = box.width / box.height;
    this.camera.updateProjectionMatrix();
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.plant, false)[0];
    if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null;
    const leaf = this.leafOfTri[hit.faceIndex];
    if (leaf === undefined) return null;
    const frame = leafFrames(this.lathe.params)[leaf];
    const p = hit.point;
    const s = ((p.x * frame.dir[0] + p.y * frame.dir[1] + (p.z - frame.lift) * frame.dir[2]) / frame.length);
    return { leaf, s };
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const aspect = rect.width / rect.height;
    if (aspect !== this.aspect) {
      this.aspect = aspect;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    if (this.dirty) {
      this.dirty = false;
      this.rebuild();
    }
    this.display.render(renderer, rect, this.scene, this.camera, {
      background: SHEET,
      mask: { shape: 'roundrect', radius: 28 },
      reveal: this.reveal.value,
    });
  }
}

// ------------------------------------------------------------------------------------------ honeycomb

const TILT = (34 * Math.PI) / 180;
const LAYER_GAP = 0.3;
const SLAB = 0.24;

/** Pointy-top hexagonal prism (radius 1, top at z = 0, height 1 downward). */
function hexPrism(): BufferGeometry {
  const m = new Mesher();
  const p = (k: number, z: number): V3 => [Math.cos((k / 6) * TAU + Math.PI / 6), Math.sin((k / 6) * TAU + Math.PI / 6), z];
  // Shading baked into flat tones: the top in its exact color (no dither), the sides darker. That
  // way the current layer reads cleanly and the stack looks like strata.
  for (let k = 0; k < 6; k++) {
    m.tri([0, 0, 0], p(k, 0), p(k + 1, 0), [1, 1, 1]);
    const side = k === 3 || k === 4 ? 0.58 : 0.72;
    m.quad(p(k, 0), p(k, -1), p(k + 1, -1), p(k + 1, 0), [side, side, side], false);
  }
  return toGeometry(m);
}

/** Dome of the cap: a paper hexagonal pyramid. */
function capDome(): BufferGeometry {
  const m = new Mesher();
  const p = (k: number): V3 => [0.86 * Math.cos((k / 6) * TAU + Math.PI / 6), 0.86 * Math.sin((k / 6) * TAU + Math.PI / 6), 0];
  for (let k = 0; k < 6; k++) m.tri([0, 0, 0.42], p(k), p(k + 1), k < 3 ? GLASS.sheet : mix(GLASS.sheet, GLASS.honey, 0.3));
  return toGeometry(m);
}

class HiveView implements EngineView {
  readonly reveal = new Reveal();
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, -100, 100);
  private readonly group = new Group();
  private readonly prisms: InstancedMesh;
  private readonly caps: InstancedMesh;
  private readonly keylines: InstancedMesh;
  private readonly walls: Mesh;
  private readonly cursor: Mesh;
  private readonly dummy = new Object3D();
  private builtVersion = -1;
  private dirty = true;
  private bounds = { left: -1, right: 1, top: 1, bottom: -1 };
  private aspect = 0;

  constructor(
    readonly element: HTMLElement,
    private readonly hive: HiveController,
    private readonly display: RetroDisplay,
  ) {
    const { w, h } = hive.hive;
    lights(this.scene, [-0.6, 0.7, 1]);
    this.group.rotation.x = -TILT;
    this.scene.add(this.group);
    const capacity = w * h * hive.layers;
    this.prisms = new InstancedMesh(hexPrism(), new MeshBasicMaterial({ vertexColors: true }), capacity);
    this.prisms.frustumCulled = false;
    this.caps = new InstancedMesh(capDome(), new MeshLambertMaterial({ vertexColors: true, flatShading: true }), w * h);
    this.caps.frustumCulled = false;
    this.keylines = new InstancedMesh(hexRing(0.7, 0.92, GLASS.ink, true, 0), new MeshBasicMaterial({ vertexColors: true }), w * h);
    this.keylines.frustumCulled = false;
    // Wax walls of the whole frame (fixed).
    const f = frameSize(w, h);
    const wall = new Mesher();
    const wax = GLASS.pollen;
    for (let r = 0; r < h; r++) {
      for (let q = 0; q < w; q++) {
        const [cx, cy] = cellCenter(q, r);
        const x = cx + f.x0;
        const y = cy + f.y0;
        for (let k = 0; k < 6; k++) {
          const a0 = (k / 6) * TAU + Math.PI / 6;
          const a1 = ((k + 1) / 6) * TAU + Math.PI / 6;
          wall.quad([x + 0.88 * Math.cos(a0), y + 0.88 * Math.sin(a0), 0.002], [x + Math.cos(a0), y + Math.sin(a0), 0.002], [x + Math.cos(a1), y + Math.sin(a1), 0.002], [x + 0.88 * Math.cos(a1), y + 0.88 * Math.sin(a1), 0.002], wax);
        }
      }
    }
    this.walls = new Mesh(toGeometry(wall), new MeshBasicMaterial({ vertexColors: true }));
    this.walls.renderOrder = 1;
    this.cursor = new Mesh(hexRing(0.62, 1.12, GLASS.ink, true, 0.03), new MeshBasicMaterial({ vertexColors: true }));
    this.group.add(this.walls, this.prisms, this.caps, this.keylines, this.cursor);
    // Framing: the tilted frame plus the stack of layers beneath it.
    const depth = hive.layers * LAYER_GAP;
    const margin = 1.2;
    this.bounds = {
      left: -f.width / 2 - margin,
      right: f.width / 2 + margin,
      top: (f.height / 2) * Math.cos(TILT) + margin,
      bottom: -(f.height / 2) * Math.cos(TILT) - depth * Math.sin(TILT) - margin,
    };
  }

  sync(): void {
    this.dirty = true;
  }

  /** Cell under a screen point: undoes the projection of the top plane. */
  cellAt(clientX: number, clientY: number): number {
    const box = this.element.getBoundingClientRect();
    const { left, right, top, bottom } = this.fitted(box.width / box.height);
    const sx = left + ((clientX - box.left) / box.width) * (right - left);
    const sy = top - ((clientY - box.top) / box.height) * (top - bottom);
    const { w, h } = this.hive.hive;
    return cellAt(sx, sy / Math.cos(TILT), w, h);
  }

  /** Framing with the view's aspect ratio, without distortion. */
  private fitted(aspect: number): { left: number; right: number; top: number; bottom: number } {
    const b = this.bounds;
    const width = b.right - b.left;
    const height = b.top - b.bottom;
    const cx = (b.left + b.right) / 2;
    const cy = (b.top + b.bottom) / 2;
    if (width / height > aspect) {
      const hh = width / aspect / 2;
      return { left: b.left, right: b.right, top: cy + hh, bottom: cy - hh };
    }
    const hw = (height * aspect) / 2;
    return { left: cx - hw, right: cx + hw, top: b.top, bottom: b.bottom };
  }

  private rebuild(): void {
    const ctl = this.hive;
    const hive = ctl.hive;
    const { w, h } = hive;
    const f = frameSize(w, h);
    if (ctl.version !== this.builtVersion) {
      this.builtVersion = ctl.version;
      const layers = hive.layers(ctl.layers);
      let n = 0;
      let caps = 0;
      let keys = 0;
      const d = this.dummy;
      layers.forEach((cells, age) => {
        const t = layers.length > 1 ? age / (ctl.layers - 1) : 0;
        // The current layer in honey; the history sinks from propolis to ink, like deep cells.
        const base: Rgb = age === 0 ? GLASS.honey : mix(mix(GLASS.propolis, GLASS.honey, 0.3), mix(GLASS.propolis, GLASS.ink, 0.7), Math.sqrt(t));
        for (let i = 0; i < cells.length; i++) {
          if (!cells[i]) continue;
          const g = ctl.grow(i);
          if (g <= 0.001) continue;
          const [cx, cy] = cellCenter(i % w, Math.floor(i / w));
          const x = cx + f.x0;
          const y = cy + f.y0;
          const z = -age * LAYER_GAP;
          d.position.set(x, y, z);
          d.scale.set(0.86 * g, 0.86 * g, age === 0 ? SLAB * 1.6 : SLAB);
          d.updateMatrix();
          this.prisms.setMatrixAt(n, d.matrix);
          // Newborn cells in pollen with an ink rule; the ruby is only for the NOW cell.
          const now = age === 0 && i === ctl.nowCell;
          const newborn = age === 0 && hive.newborn(i);
          this.prisms.setColorAt(n, linear(now ? GLASS.now : newborn ? GLASS.pollen : base));
          n++;
          if (now || newborn) {
            d.position.set(x, y, 0.004);
            d.scale.set(g, g, 1);
            d.updateMatrix();
            this.keylines.setMatrixAt(keys++, d.matrix);
          }
          if (age === 0 && hive.capped(i)) {
            d.position.set(x, y, 0.002);
            d.scale.set(g, g, g);
            d.updateMatrix();
            this.caps.setMatrixAt(caps++, d.matrix);
          }
        }
      });
      this.prisms.count = n;
      this.caps.count = caps;
      this.keylines.count = keys;
      this.prisms.instanceMatrix.needsUpdate = true;
      if (this.prisms.instanceColor) this.prisms.instanceColor.needsUpdate = true;
      this.caps.instanceMatrix.needsUpdate = true;
      this.keylines.instanceMatrix.needsUpdate = true;
    }
    this.cursor.visible = ctl.focused;
    if (ctl.focused) {
      const [cx, cy] = cellCenter(ctl.cursor % w, Math.floor(ctl.cursor / w));
      this.cursor.position.set(cx + f.x0, cy + f.y0, 0);
    }
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const aspect = rect.width / rect.height;
    if (aspect !== this.aspect) {
      this.aspect = aspect;
      const b = this.fitted(aspect);
      Object.assign(this.camera, b);
      this.camera.updateProjectionMatrix();
    }
    if (this.dirty) {
      this.dirty = false;
      this.rebuild();
    }
    this.display.render(renderer, rect, this.scene, this.camera, { background: SHEET, reveal: this.reveal.value });
  }
}

// ------------------------------------------------------------------------------------------ mounting

export interface BenchToys {
  sow: SowController;
  lathe: LatheController;
  hive: HiveController;
}

export interface BenchElements {
  sow: HTMLElement;
  lathe: HTMLElement;
  hive: HTMLElement;
}

/** Mounts the three views on the page's engine and hooks their clocks in as tickers. */
export function mountBenchGl(engine: Engine, toys: BenchToys, views: BenchElements): { bloom(which: keyof BenchToys): void } {
  const make = <V extends EngineView & { sync(): void; reveal: Reveal }>(view: V, display: RetroDisplay, tick: (dt: number) => boolean): V & ToyRenderer => {
    displayRegistry.register(display);
    display.onChange(() => engine.invalidate(view));
    engine.add(view);
    engine.addTicker((dt) => tick(dt));
    const renderer = view as V & ToyRenderer;
    const sync = view.sync.bind(view);
    renderer.sync = () => {
      sync();
      engine.invalidate(view);
    };
    renderer.wake = () => engine.requestFrame();
    return renderer;
  };
  const sowDisplay = new RetroDisplay({ tokenRoot: views.sow.closest('section') ?? undefined, pixelScale: 2 });
  const latheDisplay = new RetroDisplay({ tokenRoot: views.lathe.closest('section') ?? undefined, pixelScale: 3 });
  const hiveDisplay = new RetroDisplay({ tokenRoot: views.hive.closest('section') ?? undefined, pixelScale: 3 });
  const sowView = make(new SowView(views.sow, toys.sow, sowDisplay), sowDisplay, (dt) => toys.sow.tick(dt));
  const latheView = make(new LatheView(views.lathe, toys.lathe, latheDisplay), latheDisplay, (dt) => toys.lathe.tick(dt));
  const hiveView = make(new HiveView(views.hive, toys.hive, hiveDisplay), hiveDisplay, (dt) => toys.hive.tick(dt));
  toys.sow.attach(sowView);
  toys.lathe.attach(latheView as LatheView & LatheRenderer);
  toys.hive.attach(hiveView as HiveView & HiveRenderer);
  if (import.meta.env.DEV) Object.assign(window, { __bench: { sowView, latheView, hiveView } });
  const reveals = { sow: [sowView.reveal, sowView], lathe: [latheView.reveal, latheView], hive: [hiveView.reveal, hiveView] } as const;
  return {
    bloom(which) {
      const [reveal, view] = reveals[which];
      reveal.begin(engine, view);
      toys[which].bloom();
    },
  };
}
