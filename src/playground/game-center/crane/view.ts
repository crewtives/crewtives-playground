// 3D view of the Win a World crane: the inside of the machine behind the glass (carpet floor,
// backlit back panel, acrylic prize chute), the two-half capsules with their letter, the chrome
// C3 claw hanging from the carriage and the attempt's dotted trail. Painted with RetroDisplay.
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  type Material,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import type { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Rgb8 } from '../../../engine/display/palette';
import { drawEmblem } from './sticker';
import { CAPSULE_R, CHUTE_X, CHUTE_Z, HALF, TOP_Y, type Capsule, type CraneSim } from './sim';

const BG: Rgb8 = [11, 7, 24];
/** Cap colors: candy, mint, sodium, cobalt, ultraviolet. */
const TOP_COLORS = ['#ff4fa0', '#1fd68a', '#ffcc17', '#2238e0', '#b04bff'];
const MAX_TRAIL = 600;
const CEILING = 8.9;

function facets<T extends Material>(material: T, amount = 0.5): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${amount.toFixed(2)};`,
    );
  };
  material.customProgramCacheKey = () => `facets${amount}`;
  return material;
}

function pixelTexture(canvas: HTMLCanvasElement): Texture {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  return t;
}

/** Faceted half sphere (top or bottom) from an icosahedron split at the equator. */
function hemisphere(top: boolean): BufferGeometry {
  const ico = new IcosahedronGeometry(CAPSULE_R, 1);
  const pos = ico.getAttribute('position');
  const out: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    if (top ? cy < 0 : cy >= 0) continue;
    for (let k = 0; k < 3; k++) {
      // The seam is flattened at the equator so the halves close.
      const y = pos.getY(i + k);
      out.push(pos.getX(i + k), top ? Math.max(0, y) : Math.min(0, y), pos.getZ(i + k));
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

/** Capsule decal: the world's letter, 4D for the launcher, or the sticker's emblem. */
function decalTexture(capsule: Capsule): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f2f4ff';
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#140a24';
  ctx.stroke();
  const content = capsule.content;
  if (content.kind === 'sticker') {
    drawEmblem(ctx, 32, 32, 22, content.seed, false);
  } else {
    ctx.fillStyle = '#140a24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = content.id === 'launcher' ? '4D' : content.id.toUpperCase();
    ctx.font = `${label.length > 1 ? 34 : 50}px "DotGothic16"`;
    ctx.fillText(label, 32, 35);
  }
  return pixelTexture(canvas);
}

function carpetTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3a1c8c';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = '#ffcc17';
  ctx.fillRect(4, 5, 2, 2);
  ctx.fillRect(20, 22, 2, 2);
  ctx.fillStyle = '#ff4fa0';
  ctx.fillRect(22, 6, 2, 2);
  ctx.fillRect(8, 24, 2, 2);
  const t = pixelTexture(canvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
}

/** Backlit back panel: 景品 (prizes) between columns of bulbs, like the panel of a real crane. */
function backboardTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 208;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#9e1233';
  ctx.fillRect(0, 0, 256, 208);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#ff4b26' : '#ff4fa0';
    ctx.fillRect(i * 32, 0, 16, 208);
  }
  ctx.fillStyle = '#140a24';
  ctx.fillRect(40, 40, 176, 112);
  ctx.fillStyle = '#ffcc17';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '84px "DotGothic16"';
  ctx.fillText('景品', 128, 98);
  for (let x = 12; x < 256; x += 24) {
    ctx.fillStyle = (x / 24) % 2 < 1 ? '#ffcc17' : '#f2f4ff';
    ctx.fillRect(x, 12, 6, 6);
    ctx.fillRect(x, 190, 6, 6);
  }
  return pixelTexture(canvas);
}

interface CapsuleMesh {
  group: Group;
  capsule: Capsule;
}

export class CraneView implements EngineView {
  readonly element: HTMLElement;
  flip = false;
  private readonly display: RetroDisplay;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(52, 4 / 5, 0.1, 100);
  private readonly capsuleMeshes = new Map<number, CapsuleMesh>();
  private readonly topGeo = hemisphere(true);
  private readonly bottomGeo = hemisphere(false);
  private readonly topMats = TOP_COLORS.map((c) => facets(new MeshLambertMaterial({ color: c, flatShading: true }), 0.6));
  private readonly bottomMat = facets(new MeshLambertMaterial({ color: '#d9deff', flatShading: true }), 0.45);
  private readonly claw = new Group();
  private readonly prongs: { upper: Group; lower: Group }[] = [];
  private readonly cable: Mesh;
  private readonly carriage: Mesh;
  private readonly bridge: Mesh;
  private readonly trail: Points;
  private readonly trailPos = new Float32Array(MAX_TRAIL * 3);
  private sim: CraneSim | null = null;

  constructor(element: HTMLElement, display: RetroDisplay) {
    this.element = element;
    this.display = display;
    const scene = this.scene;
    scene.add(new HemisphereLight(0x9e1233, 0x1b1140, 1.4));
    const key = new DirectionalLight(0xffcc17, 2.2);
    key.position.set(-0.4, 0.9, 0.6);
    scene.add(key, key.target);

    // The machine's box: carpet floor, backlit back panel and side walls.
    const floor = new Mesh(new PlaneGeometry(HALF * 2, HALF * 2), new MeshLambertMaterial({ map: carpetTexture() }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const back = new Mesh(new PlaneGeometry(HALF * 2, CEILING), new MeshBasicMaterial({ map: backboardTexture() }));
    back.position.set(0, CEILING / 2, -HALF);
    scene.add(back);
    const sideMat = new MeshLambertMaterial({ color: '#33061c' });
    for (const side of [-1, 1]) {
      const wall = new Mesh(new PlaneGeometry(HALF * 2, CEILING), sideMat);
      wall.rotation.y = (-side * Math.PI) / 2;
      wall.position.set(side * HALF, CEILING / 2, 0);
      scene.add(wall);
      // Candy light tube on each side (symmetric).
      const tube = new Mesh(new BoxGeometry(0.12, 7.4, 0.12), new MeshBasicMaterial({ color: '#ff4fa0' }));
      tube.position.set(side * (HALF - 0.1), 4.1, -HALF + 0.4);
      scene.add(tube);
    }

    // Apron below the glass: the machine's ledge up to the front, in dark candy.
    const apron = new Mesh(new PlaneGeometry(HALF * 2, 1.6), new MeshLambertMaterial({ color: '#33061c' }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(0, -0.02, HALF + 0.8);
    scene.add(apron);
    const edge = new Mesh(new BoxGeometry(HALF * 2, 0.12, 0.12), new MeshBasicMaterial({ color: '#ff4fa0' }));
    edge.position.set(0, 0.04, HALF);
    scene.add(edge);

    // Prize chute: a dark hole and an acrylic lip 1.2 high.
    const hole = new Mesh(new PlaneGeometry(HALF + CHUTE_X, HALF - CHUTE_Z), new MeshBasicMaterial({ color: '#0b0718' }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.set((-HALF + CHUTE_X) / 2, 0.01, (HALF + CHUTE_Z) / 2);
    scene.add(hole);
    const acrylic = new MeshBasicMaterial({ color: '#d9deff', transparent: true, opacity: 0.35, depthWrite: false });
    const lipX = new Mesh(new BoxGeometry(0.08, 1.2, HALF - CHUTE_Z), acrylic);
    lipX.position.set(CHUTE_X, 0.6, (HALF + CHUTE_Z) / 2);
    const lipZ = new Mesh(new BoxGeometry(HALF + CHUTE_X, 1.2, 0.08), acrylic);
    lipZ.position.set((-HALF + CHUTE_X) / 2, 0.6, CHUTE_Z);
    const rim = new MeshBasicMaterial({ color: '#ffcc17' });
    const rimX = new Mesh(new BoxGeometry(0.1, 0.08, HALF - CHUTE_Z), rim);
    rimX.position.set(CHUTE_X, 1.2, (HALF + CHUTE_Z) / 2);
    const rimZ = new Mesh(new BoxGeometry(HALF + CHUTE_X, 0.08, 0.1), rim);
    rimZ.position.set((-HALF + CHUTE_X) / 2, 1.2, CHUTE_Z);
    scene.add(lipX, lipZ, rimX, rimZ);

    // Ceiling: acrylic fluorescent tubes over ink, and the carriage rails on the sides.
    const ceiling = new Mesh(new PlaneGeometry(HALF * 2, HALF * 2), new MeshBasicMaterial({ color: '#1b1140' }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = CEILING;
    scene.add(ceiling);
    const tubeMat = new MeshBasicMaterial({ color: '#d9deff' });
    for (const x of [-2.6, 2.6]) {
      const lamp = new Mesh(new BoxGeometry(0.3, 0.1, HALF * 1.6), tubeMat);
      lamp.position.set(x, CEILING - 0.06, 0);
      scene.add(lamp);
    }
    const chrome = facets(new MeshLambertMaterial({ color: '#9aa4b2', flatShading: true }), 0.35);
    const chromeHi = facets(new MeshLambertMaterial({ color: '#dde3ec', flatShading: true }), 0.4);
    for (const x of [-HALF + 0.25, HALF - 0.25]) {
      const rail = new Mesh(new BoxGeometry(0.16, 0.16, HALF * 2), chrome);
      rail.position.set(x, TOP_Y + 1.0, 0);
      scene.add(rail);
    }
    const bridge = new Mesh(new BoxGeometry(HALF * 2 - 0.5, 0.14, 0.14), chrome);
    this.bridge = bridge;
    scene.add(bridge);
    this.carriage = new Mesh(new BoxGeometry(0.9, 0.35, 0.9), chromeHi);
    scene.add(this.carriage);
    this.cable = new Mesh(new BoxGeometry(0.05, 1, 0.05), new MeshBasicMaterial({ color: '#7a7fb0' }));
    scene.add(this.cable);

    // The claw: a hexagonal hub and three prongs at 120° (C3 symmetry), each one in two segments.
    const hub = new Mesh(new CylinderGeometry(0.34, 0.42, 0.5, 6), chromeHi);
    this.claw.add(hub);
    const upperGeo = new BoxGeometry(0.12, 0.9, 0.12);
    upperGeo.translate(0, -0.45, 0);
    const lowerGeo = new BoxGeometry(0.1, 0.7, 0.1);
    lowerGeo.translate(0, -0.35, 0);
    for (let i = 0; i < 3; i++) {
      const arm = new Group();
      arm.rotation.y = (i * Math.PI * 2) / 3;
      const upper = new Group();
      upper.position.set(0.3, -0.2, 0);
      upper.add(new Mesh(upperGeo, chrome));
      const lower = new Group();
      lower.position.set(0, -0.9, 0);
      lower.add(new Mesh(lowerGeo, chromeHi));
      upper.add(lower);
      arm.add(upper);
      this.claw.add(arm);
      this.prongs.push({ upper, lower });
    }
    scene.add(this.claw);

    // The attempt's dotted trail, in sodium.
    const trailGeo = new BufferGeometry();
    trailGeo.setAttribute('position', new Float32BufferAttribute(this.trailPos, 3));
    trailGeo.setDrawRange(0, 0);
    this.trail = new Points(trailGeo, new PointsMaterial({ color: '#ffcc17', size: 3, sizeAttenuation: false }));
    this.trail.frustumCulled = false;
    scene.add(this.trail);
  }

  setSim(sim: CraneSim): void {
    this.sim = sim;
  }

  private syncCapsules(sim: CraneSim): void {
    const alive = new Set<number>();
    for (const c of sim.capsules) {
      if (c.state === 'gone') continue;
      alive.add(c.id);
      let mesh = this.capsuleMeshes.get(c.id);
      if (!mesh) {
        const group = new Group();
        const top = new Mesh(this.topGeo, this.topMats[c.tint % this.topMats.length]);
        const bottom = new Mesh(this.bottomGeo, this.bottomMat);
        const decal = new Sprite(new SpriteMaterial({ map: decalTexture(c) }));
        decal.scale.setScalar(1.25);
        decal.position.y = CAPSULE_R + 0.3;
        group.add(top, bottom, decal);
        // Each capsule with its own rotation, so the facets do not repeat.
        top.rotation.y = bottom.rotation.y = (c.id * 1.7) % (Math.PI * 2);
        this.scene.add(group);
        mesh = { group, capsule: c };
        this.capsuleMeshes.set(c.id, mesh);
      }
      mesh.group.position.set(c.x, c.h, c.y);
    }
    for (const [id, mesh] of this.capsuleMeshes) {
      if (alive.has(id)) continue;
      this.scene.remove(mesh.group);
      this.capsuleMeshes.delete(id);
    }
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const sim = this.sim;
    if (!sim) return;
    this.syncCapsules(sim);

    // Carriage, cable and claw (with the cable's sway).
    this.carriage.position.set(sim.x, TOP_Y + 1.0, sim.z);
    this.bridge.position.set(0, TOP_Y + 1.0, sim.z);
    const hang = TOP_Y + 1.0 - sim.y;
    const hubX = sim.x + Math.sin(sim.swayX) * hang * 0.12;
    const hubZ = sim.z + Math.sin(sim.swayZ) * hang * 0.12;
    this.cable.scale.y = Math.max(0.01, hang);
    this.cable.position.set((sim.x + hubX) / 2, sim.y + hang / 2, (sim.z + hubZ) / 2);
    this.claw.position.set(hubX, sim.y, hubZ);
    this.claw.rotation.set(sim.swayZ * 0.3, 0, -sim.swayX * 0.3);
    const alpha = ((10 + 32 * sim.open) * Math.PI) / 180;
    for (const { upper, lower } of this.prongs) {
      upper.rotation.z = alpha;
      lower.rotation.z = -alpha * 1.6 - 0.25;
    }

    // Trail.
    const n = Math.min(MAX_TRAIL, sim.trail.length / 3);
    this.trailPos.set(sim.trail.slice(0, n * 3));
    const geo = this.trail.geometry;
    geo.setDrawRange(0, n);
    geo.getAttribute('position').needsUpdate = true;

    const portrait = rect.height >= rect.width;
    this.camera.aspect = rect.width / rect.height;
    this.camera.fov = portrait ? 52 : 44;
    this.camera.position.set(0, 7.4, 15.4);
    // The front edge of the floor falls right at the foot of the glass.
    this.camera.lookAt(0, portrait ? 4.4 : 3.9, -0.6);
    this.camera.updateProjectionMatrix();
    if (this.flip) this.camera.projectionMatrix.elements[0] *= -1;

    this.display.render(renderer, rect, this.scene, this.camera, {
      background: BG,
      mask: { shape: 'roundrect', radius: 14 },
    });
  }
}

