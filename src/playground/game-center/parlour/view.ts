// 3D view of the Parlour Glass: the night board with the rosette of nails, the chrome balls
// (faceted icosahedra), the windmills, the tulips, the central pocket, the rubber stops and the
// exposure of the paths (a single Points with the whole log; the shader decides which points the shutter
// lets through and colors them by age). Painted with RetroDisplay inside an elliptical mask.
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  type Material,
  type WebGLRenderer,
} from 'three';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import type { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Rgb8 } from '../../../engine/display/palette';
import { BALL_R, GLASS_R, HESO, NAIL_R, STOP_R, STOPS, TULIPS, WINDMILL_BLADE, WINDMILLS } from './layout';
import { DRAIN_HALF, shutterSpan, type ParlourSim, type Shutter } from './sim';

const BG: Rgb8 = [27, 17, 64];
const HALF_VIEW = GLASS_R + 6;

function facets<T extends Material>(material: T, amount: number): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${amount.toFixed(2)};`,
    );
  };
  material.customProgramCacheKey = () => `pfacets${amount}`;
  return material;
}

/** Age ramp of the paths: sodium → vermilion → wine → ultraviolet over 12 s. */
const DOT_VERT = /* glsl */ `
  uniform float uNow;
  uniform float uSpan;
  uniform float uOpen;
  uniform float uSize;
  varying float vAge;
  void main() {
    float t = position.z;
    float age = uNow - t;
    bool hidden = t > uNow + 1e-4 || t < uOpen - 1e-4 || age > uSpan;
    vAge = age;
    gl_PointSize = uSize;
    gl_Position = hidden ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * modelViewMatrix * vec4(position.x, -position.y, 1.2, 1.0);
  }`;
const DOT_FRAG = /* glsl */ `
  varying float vAge;
  void main() {
    vec3 sodium = vec3(1.0, 0.8, 0.09);
    vec3 vermilion = vec3(1.0, 0.294, 0.149);
    vec3 wine = vec3(0.62, 0.071, 0.2);
    vec3 uv = vec3(0.69, 0.294, 1.0);
    float a = clamp(vAge / 12.0, 0.0, 1.0) * 3.0;
    vec3 c = a < 1.0 ? mix(sodium, vermilion, a) : a < 2.0 ? mix(vermilion, wine, a - 1.0) : mix(wine, uv, a - 2.0);
    gl_FragColor = vec4(c, 1.0);
  }`;

export class ParlourView implements EngineView {
  readonly element: HTMLElement;
  flip = false;
  shutter: Shutter = '5';
  private readonly display: RetroDisplay;
  private readonly sim: ParlourSim;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(20, 1, 10, 4000);
  private readonly balls: InstancedMesh;
  private nails: InstancedMesh;
  private nailSymmetry = '';
  private readonly mills: Group[] = [];
  private readonly petals: { mesh: Mesh; dir: number }[] = [];
  private readonly petalClosed = new MeshLambertMaterial({ color: '#ff4fa0', flatShading: true });
  private readonly petalOpen = new MeshLambertMaterial({ color: '#1fd68a', flatShading: true });
  private readonly dots: Points;
  private readonly dotMat: ShaderMaterial;
  private readonly dotAttr: BufferAttribute;
  private uploaded = 0;
  private epoch = -1;
  private readonly dummy = new Object3D();
  private readonly nailGeo = new CylinderGeometry(NAIL_R, NAIL_R, 9, 6);
  private readonly nailMat = facets(new MeshLambertMaterial({ color: '#dde3ec', flatShading: true }), 0.35);

  constructor(element: HTMLElement, display: RetroDisplay, sim: ParlourSim) {
    this.element = element;
    this.display = display;
    this.sim = sim;
    const scene = this.scene;
    scene.add(new HemisphereLight(0xd9deff, 0x1b1140, 1.2));
    const key = new DirectionalLight(0xffcc17, 2.4);
    key.position.set(-0.4, 0.8, 0.6);
    scene.add(key, key.target);

    // Board: flat night, with the chrome hoop that is the wall and the launch rail.
    const board = new Mesh(new CircleGeometry(GLASS_R + 4, 96), new MeshBasicMaterial({ color: '#1b1140' }));
    scene.add(board);
    const chrome = facets(new MeshLambertMaterial({ color: '#9aa4b2', flatShading: true }), 0.3);
    const rim = new Mesh(new TorusGeometry(GLASS_R + 1.5, 3.2, 4, 96, Math.PI * 2 - DRAIN_HALF * 2), chrome);
    // The arc leaves the drain open, at the bottom.
    rim.rotation.z = -Math.PI / 2 + DRAIN_HALF;
    scene.add(rim);

    // Rubber stops where each rail ends: a wine rubber block on a chrome base, on the hoop.
    const rubber = facets(new MeshLambertMaterial({ color: '#9e1233', flatShading: true }), 0.35);
    const mountGeo = new CylinderGeometry(STOP_R + 1.4, STOP_R + 1.4, 6, 8).rotateX(Math.PI / 2);
    const padGeo = new CylinderGeometry(STOP_R, STOP_R, 9, 8).rotateX(Math.PI / 2);
    for (const stop of STOPS) {
      const mount = new Mesh(mountGeo, chrome);
      mount.position.set(stop.u, -stop.v, 2);
      const pad = new Mesh(padGeo, rubber);
      pad.position.set(stop.u, -stop.v, 5);
      scene.add(mount, pad);
    }

    // Nails: chrome cylinders pointing at the glass.
    this.nails = this.buildNails();
    scene.add(this.nails);

    // Central pocket (heso): two posts and the body of the pocket, in sodium.
    const heso = new Group();
    const post = new CylinderGeometry(HESO.postR, HESO.postR, 10, 6);
    post.rotateX(Math.PI / 2);
    const brass = facets(new MeshLambertMaterial({ color: '#ffcc17', flatShading: true }), 0.4);
    for (const s of [-1, 1]) {
      const p = new Mesh(post, brass);
      p.position.set(s * HESO.post, -HESO.v, 5);
      heso.add(p);
    }
    const body = new Mesh(new CylinderGeometry(HESO.bodyR, HESO.bodyR * 0.8, 8, 8).rotateX(Math.PI / 2), brass);
    body.position.set(0, -HESO.bodyV, 4);
    heso.add(body);
    const mouth = new Mesh(new BoxGeometry(HESO.mouth * 2, 3, 2), new MeshBasicMaterial({ color: '#0b0718' }));
    mouth.position.set(0, -HESO.v - 3, 8);
    heso.add(mouth);
    scene.add(heso);

    // Tulips: two petals per tulip, pivoted at the base.
    const petalGeo = new BoxGeometry(3, 15, 5);
    petalGeo.translate(0, 7.5, 0);
    for (const t of TULIPS) {
      for (const dir of [-1, 1]) {
        const mesh = new Mesh(petalGeo, this.petalClosed);
        mesh.position.set(t.u + dir * 5, -(t.v + 6), 4);
        scene.add(mesh);
        this.petals.push({ mesh, dir });
      }
      const cup = new Mesh(new CylinderGeometry(6, 5, 8, 8).rotateX(Math.PI / 2), brass);
      cup.position.set(t.u, -(t.v + 11), 4);
      scene.add(cup);
    }

    // Windmills: four blades in candy and sodium around a hub.
    const bladeGeo = new BoxGeometry(WINDMILL_BLADE, 3.2, 5);
    bladeGeo.translate(WINDMILL_BLADE / 2, 0, 0);
    const bladeA = facets(new MeshLambertMaterial({ color: '#ff4fa0', flatShading: true }), 0.45);
    const bladeB = facets(new MeshLambertMaterial({ color: '#ffcc17', flatShading: true }), 0.45);
    for (const w of WINDMILLS) {
      const g = new Group();
      g.position.set(w.u, -w.v, 5);
      for (let k = 0; k < 4; k++) {
        const blade = new Mesh(bladeGeo, k % 2 ? bladeB : bladeA);
        blade.rotation.z = (k * Math.PI) / 2;
        g.add(blade);
      }
      const hub = new Mesh(new CylinderGeometry(3.4, 3.4, 7, 6).rotateX(Math.PI / 2), brass);
      g.add(hub);
      scene.add(g);
      this.mills.push(g);
    }

    // Balls.
    this.balls = new InstancedMesh(
      new IcosahedronGeometry(BALL_R, 1),
      facets(new MeshLambertMaterial({ color: '#dde3ec', flatShading: true }), 0.25),
      sim.maxBalls,
    );
    this.balls.count = 0;
    this.balls.frustumCulled = false;
    scene.add(this.balls);

    // Exposure: the whole path log, filtered in the shader.
    const geo = new BufferGeometry();
    this.dotAttr = new BufferAttribute(sim.dots.data, 3);
    this.dotAttr.setUsage(35048); // DynamicDrawUsage
    geo.setAttribute('position', this.dotAttr);
    geo.setDrawRange(0, 0);
    this.dotMat = new ShaderMaterial({
      vertexShader: DOT_VERT,
      fragmentShader: DOT_FRAG,
      uniforms: { uNow: { value: 0 }, uSpan: { value: 5 }, uOpen: { value: 0 }, uSize: { value: 2 } },
      depthWrite: false,
    });
    this.dots = new Points(geo, this.dotMat);
    this.dots.frustumCulled = false;
    this.dots.renderOrder = 1;
    scene.add(this.dots);
  }

  private buildNails(): InstancedMesh {
    const nails = this.sim.nails;
    const mesh = new InstancedMesh(this.nailGeo, this.nailMat, nails.length);
    nails.forEach((n, i) => {
      this.dummy.position.set(n.u, -n.v, 4.5);
      this.dummy.rotation.set(Math.PI / 2, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.nailSymmetry = this.sim.symmetry;
    return mesh;
  }

  /** Uploads to the GPU only the new points of the log (or all of them, if there was a truncation or a clear). */
  private syncDots(): void {
    const log = this.sim.dots;
    const cap = log.capacity;
    if (log.epoch !== this.epoch) {
      this.epoch = log.epoch;
      this.dotAttr.clearUpdateRanges();
      this.dotAttr.addUpdateRange(0, Math.min(log.count, cap) * 3);
      this.dotAttr.needsUpdate = true;
      this.uploaded = log.count;
    } else if (log.count > this.uploaded) {
      const from = Math.max(this.uploaded, log.count - cap);
      const a = from % cap;
      const b = log.count % cap;
      this.dotAttr.clearUpdateRanges();
      if (log.count - from >= cap) this.dotAttr.addUpdateRange(0, cap * 3);
      else if (a < b) this.dotAttr.addUpdateRange(a * 3, (b - a) * 3);
      else {
        this.dotAttr.addUpdateRange(a * 3, (cap - a) * 3);
        if (b > 0) this.dotAttr.addUpdateRange(0, b * 3);
      }
      this.dotAttr.needsUpdate = true;
      this.uploaded = log.count;
    }
    this.dots.geometry.setDrawRange(0, Math.min(log.count, cap));
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const sim = this.sim;
    if (this.nailSymmetry !== sim.symmetry) {
      this.scene.remove(this.nails);
      this.nails.dispose();
      this.nails = this.buildNails();
      this.scene.add(this.nails);
    }

    let n = 0;
    for (let i = 0; i < sim.maxBalls; i++) {
      if (!sim.alive[i]) continue;
      this.dummy.position.set(sim.u[i], -sim.v[i], 6);
      // Each ball rotates with its path: the facets catch the light at different moments.
      this.dummy.rotation.set(sim.v[i] * 0.09, sim.u[i] * 0.09, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.balls.setMatrixAt(n++, this.dummy.matrix);
    }
    this.balls.count = n;
    this.balls.instanceMatrix.needsUpdate = true;

    for (let w = 0; w < 2; w++) {
      const [du, dv] = sim.bladeDirs(w)[0];
      this.mills[w].rotation.z = Math.atan2(-dv, du);
    }
    const open = sim.fever > 0;
    for (const p of this.petals) {
      p.mesh.material = open ? this.petalOpen : this.petalClosed;
      p.mesh.rotation.z = -p.dir * ((open ? 28 : 4) * Math.PI) / 180;
    }

    this.syncDots();
    const u = this.dotMat.uniforms;
    u.uNow.value = sim.time;
    u.uSpan.value = this.shutter === 'all' ? 1e9 : shutterSpan(this.shutter);
    u.uOpen.value = sim.openedAt;
    u.uSize.value = 1;

    // Almost frontal camera, just slightly below: the nails show their head and a bit of shank.
    const dist = 1400;
    const aspect = rect.width / rect.height;
    this.camera.aspect = aspect;
    const fit = HALF_VIEW / Math.min(1, aspect);
    this.camera.fov = (2 * Math.atan(fit / dist) * 180) / Math.PI;
    this.camera.position.set(0, -110, dist);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    if (this.flip) this.camera.projectionMatrix.elements[0] *= -1;

    this.display.render(renderer, rect, this.scene, this.camera, { background: BG, mask: { shape: 'ellipse' } });
  }
}

