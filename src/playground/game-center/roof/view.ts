// Roof screen (RF): from the parapet the visitor looks down at the canyon of signs in the rain, with air
// taxis passing along the street. In place of the moon hangs the black hole of world E: a black
// disc, the photon ring and the accretion disc with its back half lensed over the top.
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShaderMaterial,
  BoxGeometry,
  Vector3,
  type WebGLRenderer,
} from 'three';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import type { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Rgb8 } from '../../../engine/display/palette';
import { buildSignAtlas, buildTaxiGeometry, buildWindowTexture } from '../rainrun/assets';
import { buildTile, STREET_HALF, TILE } from '../rainrun/canyon';
import { COURSE_SEED } from '../rainrun/sim';
import { signGeometry, towerGeometry } from '../rainrun/view';
import { MOON } from './moon';

const BG: Rgb8 = [27, 17, 64];
const TAXIS = 4;


export class RoofView implements EngineView {
  readonly element: HTMLElement;
  flip = false;
  rain = true;
  /** false with reduced motion: the screen stays still. */
  live = true;
  private readonly display: RetroDisplay;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(46, 16 / 7, 0.5, 900);
  private readonly taxis: InstancedMesh;
  private readonly rainLines: LineSegments;
  private readonly rainMat: ShaderMaterial;
  private readonly hole = new Group();
  private readonly dummy = new Object3D();
  private time = 0;

  constructor(element: HTMLElement, display: RetroDisplay) {
    this.element = element;
    this.display = display;
    const scene = this.scene;
    scene.fog = new FogExp2(0xff8a1f, 0.0042);
    scene.add(new HemisphereLight(0x9e1233, 0x1b1140, 1.6));
    const key = new DirectionalLight(0xffcc17, 1.6);
    key.position.set(-0.4, 0.8, 0.6);
    scene.add(key, key.target);

    // Sky: night overhead, wine and vermilion toward the horizon, amber in the haze.
    const sky = new Mesh(
      new PlaneGeometry(2400, 700, 1, 8),
      new MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false }),
    );
    const pos = sky.geometry.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const night = new Color('#1b1140');
    const wine = new Color('#9e1233');
    const vermilion = new Color('#ff4b26');
    const amber = new Color('#ff8a1f');
    for (let i = 0; i < pos.count; i++) {
      const h = (pos.getY(i) + 350) / 700;
      const c = h > 0.7 ? night.clone() : h > 0.5 ? wine.clone().lerp(night, (h - 0.5) / 0.2) : h > 0.4 ? vermilion.clone().lerp(wine, (h - 0.4) / 0.1) : amber.clone().lerp(vermilion, h / 0.4);
      c.toArray(colors, i * 3);
    }
    sky.geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    sky.position.set(0, 180, -620);
    scene.add(sky);

    // The black hole of world E, in place of the moon.
    const R = 26;
    const blackMat = new MeshBasicMaterial({ color: '#0b0718', fog: false });
    const disc = new Mesh(new CircleGeometry(R, 40), blackMat);
    disc.renderOrder = 2;
    const photon = new Mesh(new RingGeometry(R * 1.04, R * 1.16, 48), new MeshBasicMaterial({ color: '#ffcc17', fog: false }));
    photon.renderOrder = 3;
    // Back half of the accretion disc, bent by the lens over the shadow.
    const lensed = new Mesh(new RingGeometry(R * 1.2, R * 1.55, 48, 1, 0, Math.PI), new MeshBasicMaterial({ color: '#ff4b26', fog: false, side: DoubleSide }));
    lensed.renderOrder = 1;
    // Front half, flattened: the disc seen almost edge-on.
    const front = new Mesh(new RingGeometry(R * 1.25, R * 2.3, 48, 1, Math.PI, Math.PI), new MeshBasicMaterial({ color: '#ff8a1f', fog: false, side: DoubleSide }));
    front.scale.y = 0.35;
    front.renderOrder = 4;
    const frontInner = new Mesh(new RingGeometry(R * 1.25, R * 1.6, 48, 1, Math.PI, Math.PI), new MeshBasicMaterial({ color: '#ffcc17', fog: false, side: DoubleSide }));
    frontInner.scale.y = 0.35;
    frontInner.renderOrder = 5;
    this.hole.add(lensed, disc, photon, front, frontInner);
    this.hole.rotation.z = -0.12;
    scene.add(this.hole);

    // The canyon: two segments, seen from above.
    const tile = buildTile(COURSE_SEED);
    const towerMat = new MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveMap: buildWindowTexture(), flatShading: true });
    const signMat = new MeshBasicMaterial({ map: buildSignAtlas() });
    const towers = towerGeometry(tile.towers);
    const signs = signGeometry(tile.signs);
    // The canyon and, to the sides, the blocks behind it (the same geometry shifted), so that from
    // the roof the city fills the ground up to the haze.
    const outer = new Mesh(towers, towerMat);
    for (let t = 0; t < 3; t++) {
      const g = new Group();
      g.add(new Mesh(towers, towerMat), new Mesh(signs, signMat));
      g.position.z = -t * TILE;
      scene.add(g);
      for (const x of [-19, 19, -38, 38, -57, 57]) {
        const block = outer.clone();
        block.position.set(x, 0, -t * TILE - (Math.abs(x) % 38) * 0.5);
        block.scale.y = Math.abs(x) < 20 ? 0.62 : 0.42;
        scene.add(block);
      }
    }
    const street = new Mesh(new PlaneGeometry(STREET_HALF * 2, TILE * 3), new MeshBasicMaterial({ color: '#1b1140' }));
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.01, -TILE * 1.5);
    scene.add(street);
    const dashes = new InstancedMesh(new BoxGeometry(0.3, 0.05, 2.6), new MeshBasicMaterial({ color: '#ffcc17' }), 80);
    for (let i = 0; i < 80; i++) {
      this.dummy.position.set(0, 0.05, 6 - i * 8);
      this.dummy.updateMatrix();
      dashes.setMatrixAt(i, this.dummy.matrix);
    }
    scene.add(dashes);

    // Taxis passing along the street, far and near.
    this.taxis = new InstancedMesh(buildTaxiGeometry(), new MeshLambertMaterial({ vertexColors: true, flatShading: true }), TAXIS);
    this.taxis.frustumCulled = false;
    scene.add(this.taxis);

    // Rain over the whole scene.
    const drops = 900;
    const base = new Float32Array(drops * 2 * 3);
    const end = new Float32Array(drops * 2);
    let seed = 23;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < drops; i++) {
      const x = (rand() * 2 - 1) * 40;
      const y = rand() * 60;
      const z = 30 - rand() * 150;
      for (let v = 0; v < 2; v++) {
        base.set([x, y, z], (i * 2 + v) * 3);
        end[i * 2 + v] = v;
      }
    }
    const rainGeo = new BufferGeometry();
    rainGeo.setAttribute('position', new Float32BufferAttribute(base, 3));
    rainGeo.setAttribute('aEnd', new Float32BufferAttribute(end, 1));
    this.rainMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aEnd;
        uniform float uTime;
        void main() {
          float y = 20.0 + mod(position.y - uTime * 38.0, 60.0);
          vec3 p = vec3(position.x + y * 0.14, y, position.z) + aEnd * vec3(-0.2, 1.4, 0.0);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        void main() { gl_FragColor = vec4(0.48, 0.5, 0.69, 1.0); }`,
      depthWrite: false,
    });
    this.rainLines = new LineSegments(rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    scene.add(this.rainLines);
    this.placeTaxis();
  }

  tick(dt: number): boolean {
    if (!this.live) return false;
    this.time += Math.min(dt, 0.1);
    this.placeTaxis();
    return true;
  }

  private placeTaxis(): void {
    // Each taxi travels down the street into the distance and comes back in: different heights and speeds.
    for (let i = 0; i < TAXIS; i++) {
      const speed = 22 + i * 7;
      const span = 260;
      const z = 10 - ((this.time * speed + i * 67) % span);
      const x = [-3.2, 2.6, -1.2, 3.6][i];
      const y = [6, 11, 16, 8.5][i];
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, 0, Math.sin(this.time * 0.8 + i) * 0.12);
      this.dummy.scale.setScalar(1.4);
      this.dummy.updateMatrix();
      this.taxis.setMatrixAt(i, this.dummy.matrix);
    }
    this.taxis.instanceMatrix.needsUpdate = true;
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const aspect = rect.width / rect.height;
    const cam = this.camera;
    cam.aspect = aspect;
    // From a rooftop higher than almost all the towers: the roofs, the street in the distance and the sky above.
    cam.fov = aspect < 1 ? 66 : aspect < 1.8 ? 54 : 44;
    cam.position.set(0, 58, 40);
    cam.lookAt(0, 36, -120);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    // The "moon" is anchored to the screen (top right), at a fixed distance behind the canyon.
    const ndcX = MOON.x * 2 - 1;
    const ndcY = 1 - MOON.y * 2;
    const p = new Vector3(ndcX, ndcY, 0.985).unproject(cam);
    this.hole.position.copy(p);
    this.hole.quaternion.copy(cam.quaternion);
    this.hole.rotateZ(-0.12);
    const dist = p.distanceTo(cam.position);
    this.hole.scale.setScalar((dist / 600) * (aspect < 1 ? 0.8 : 1));
    if (this.flip) cam.projectionMatrix.elements[0] *= -1;

    this.rainLines.visible = this.rain;
    this.rainMat.uniforms.uTime.value = this.time;
    this.display.render(renderer, rect, this.scene, cam, { background: BG, mask: { shape: 'roundrect', radius: 20 } });
  }
}

