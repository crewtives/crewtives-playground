// Object cell of the kaleidoscope: the chamber's low-poly scene, painted from above into its own
// render target. The eyepiece, the raw-cell inset and the peepholes share it; it is repainted at
// most once per frame, the first time a view asks for it (D6).

import {
  DirectionalLight,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  SRGBColorSpace,
  Scene,
  WebGLRenderTarget,
  type BufferGeometry,
  type WebGLRenderer,
} from 'three';
import { BEAD_STYLES_COUNT as BEAD_STYLES } from '../specimens/beads';
import { buildBead, buildSpecimen } from '../specimens/geometry';
import type { Specimen } from '../specimens/spec';
import type { Body, Chamber } from './chamber';
import { viewToCell } from './fold';

const CELL_SIZE = 512;
const MAX_TRAIL = 24;
/** Opacity levels of the exposures (shared materials). */
const LEVELS = 16;

interface BodyVisual {
  group: Group;
  main: Mesh;
  trail: Mesh[];
}

export class CellRenderer {
  readonly target = new WebGLRenderTarget(CELL_SIZE, CELL_SIZE, {
    colorSpace: SRGBColorSpace,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: true,
  });
  /** Incremented when anything in the chamber changes; the cell is repainted if it differs from what was painted. */
  version = 0;
  exposures = true;

  private rendered = -1;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, -4, 4);
  private readonly solid = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private readonly ghosts: MeshLambertMaterial[] = [];
  private readonly beadGeometry: BufferGeometry[] = [];
  private readonly specimenGeometry = new Map<number, BufferGeometry>();
  private readonly visuals = new Map<number, BodyVisual>();
  private readonly key: DirectionalLight;

  constructor() {
    this.camera.position.set(0, 0, 2);
    this.camera.lookAt(0, 0, 0);
    // Midday window light: key at 55° elevation from the top left, and a paper-over-violet
    // hemisphere fill. Faces that look up stay close to their glass color.
    const key = new DirectionalLight(0xffffff, 0.62 * Math.PI);
    this.key = key;
    this.setBarrel(0);
    const fill = new HemisphereLight(0xfdfdf6, 0x4a1d6b, 0.5 * Math.PI);
    fill.position.set(0, 0, 1);
    this.scene.add(key, fill);
    for (let i = 0; i < LEVELS; i++) {
      this.ghosts.push(
        new MeshLambertMaterial({
          vertexColors: true,
          flatShading: true,
          transparent: true,
          depthWrite: false,
          opacity: 0.08 + 0.5 * (i / (LEVELS - 1)),
        }),
      );
    }
    for (let s = 0; s < BEAD_STYLES; s++) this.beadGeometry.push(buildBead(s));
  }

  /** The window stays fixed on screen: inside the cell, the light turns against the barrel. */
  setBarrel(beta: number): void {
    const elevation = (55 * Math.PI) / 180;
    const [x, y] = viewToCell(-Math.SQRT1_2, Math.SQRT1_2, beta);
    this.key.position.set(x * Math.cos(elevation), y * Math.cos(elevation), Math.sin(elevation));
  }

  /** Registers a specimen's geometry (computed once per specimen). */
  setSpecimens(specimens: Specimen[]): void {
    const alive = new Set(specimens.map((s) => s.uid));
    for (const [uid, geometry] of this.specimenGeometry) {
      if (!alive.has(uid)) {
        geometry.dispose();
        this.specimenGeometry.delete(uid);
      }
    }
    for (const s of specimens) if (!this.specimenGeometry.has(s.uid)) this.specimenGeometry.set(s.uid, buildSpecimen(s.spec));
  }

  /** Copies positions and exposures from the physics into the scene. */
  sync(chamber: Chamber): void {
    this.setBarrel(chamber.barrel);
    const seen = new Set<number>();
    for (const body of chamber.bodies) {
      seen.add(body.uid);
      const visual = this.visualFor(body);
      if (!visual) continue;
      visual.main.position.set(body.x, body.y, 0);
      visual.main.rotation.z = body.a;
      const trail = this.exposures ? body.trail : [];
      const count = Math.min(trail.length, MAX_TRAIL);
      for (let i = 0; i < MAX_TRAIL; i++) {
        const ghost = visual.trail[i];
        if (i >= count) {
          ghost.visible = false;
          continue;
        }
        const e = trail[trail.length - count + i];
        ghost.visible = true;
        ghost.position.set(e.x, e.y, -0.5);
        ghost.rotation.z = e.a;
        // The oldest almost transparent, the most recent half opaque: 0.08 + 0.5·(i/N).
        const level = Math.round((i / Math.max(1, count)) * (LEVELS - 1));
        ghost.material = this.ghosts[level];
        ghost.renderOrder = i;
      }
    }
    for (const [uid, visual] of this.visuals) {
      if (!seen.has(uid)) {
        this.scene.remove(visual.group);
        this.visuals.delete(uid);
      }
    }
    this.version++;
  }

  /** Paints the cell if it changed since last time. */
  ensure(renderer: WebGLRenderer): void {
    if (this.rendered === this.version) return;
    this.rendered = this.version;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0xfdfdf6, 1);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previous);
  }

  private visualFor(body: Body): BodyVisual | null {
    let visual = this.visuals.get(body.uid);
    if (visual) return visual;
    const geometry = body.kind === 'bead' ? this.beadGeometry[body.key % BEAD_STYLES] : this.specimenGeometry.get(body.key);
    if (!geometry) return null;
    const group = new Group();
    const main = new Mesh(geometry, this.solid);
    main.scale.setScalar(body.r);
    main.renderOrder = 100;
    const trail: Mesh[] = [];
    for (let i = 0; i < MAX_TRAIL; i++) {
      const ghost = new Mesh(geometry, this.ghosts[0]);
      ghost.scale.setScalar(body.r);
      ghost.visible = false;
      trail.push(ghost);
      group.add(ghost);
    }
    group.add(main);
    this.scene.add(group);
    visual = { group, main, trail };
    this.visuals.set(body.uid, visual);
    return visual;
  }
}
