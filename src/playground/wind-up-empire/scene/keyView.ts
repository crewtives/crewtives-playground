// The 3D winding key: a chrome tin butterfly key (two wings with holes, joined by a narrow waist
// to a vermilion hexagonal hub, with its shaft) on its axle, a spiral spring behind it that tightens
// as it is wound and, at the back, the plate where each detent stamps the rosette. Its own view with
// an orthographic camera, the page's RetroDisplay and a round mask. The wind reserve drives the
// angle: while winding it clicks in detent by detent with the spring θ'' = −420(θ − θd) − 18θ';
// on release it unwinds counterclockwise at one turn every 3 s, because the wind runs down.
import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Path,
  ShapeGeometry,
  type BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Shape,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
  Curve,
  type WebGLRenderer,
} from 'three';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import type { DisplayMask, RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { Rgb8 } from '../../../engine/display/palette';
import { SECONDS_PER_TURN, type Economy } from '../economy';
import { KeySpring } from '../spring';
import type { Winder } from '../ui/keyControl';
import { ROSETTE_KEY, ROSETTE_SIZE, WING, wingHole, wingPoints, type Rosette } from '../ui/rosette';
import { merge, paint } from './lowpoly';
import { INK } from './orrery';
import * as S from './shaders';

const SPACE_DEEP: Rgb8 = [0x0a, 0x0f, 0x4a];
/** Half height of the frame (units). */
const FRAME = 0.98;
/** Key scale (units): the rosette uses the same silhouette at `ROSETTE_KEY` px. */
const KEY_A = 0.3;
/** Side of the rosette plate (units), so that a stamp lines up with the key. */
const PLATE = (KEY_A / ROSETTE_KEY) * ROSETTE_SIZE;
/** Ink edge around the tin (units). */
const EDGE = 0.034;

/**
 * The real spring of a wind-up toy is a flat spiral around the axle. Seen head-on it reads much
 * better than a helix (which head-on is just a ring): winding tightens it toward the axle.
 */
class Mainspring extends Curve<Vector3> {
  constructor(
    private readonly inner: number,
    private readonly outer: number,
    private readonly turns: number,
  ) {
    super();
  }
  getPoint(t: number, target = new Vector3()): Vector3 {
    const a = t * this.turns * Math.PI * 2;
    const r = this.inner + (this.outer - this.inner) * t;
    return target.set(r * Math.cos(a), r * Math.sin(a), -0.02 * t);
  }
}

/** A flat wing (one face) with its hole; `e` widens the outline and shrinks the hole. */
function wingShape(side: 1 | -1, e: number): Shape {
  const pts = wingPoints(KEY_A, e, 20).map(([x, y]) => [side * x, y] as const);
  if (side < 0) pts.reverse();
  const shape = new Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const hole = wingHole(KEY_A, e);
  if (hole.r > 0) {
    const path = new Path();
    path.absarc(side * hole.x, 0, hole.r, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  return shape;
}

/** Extruded wing: the face in lit tin, the sides in the tin's shade. */
function wingSolid(side: 1 | -1): BufferGeometry[] {
  const depth = 0.06;
  const face = new ShapeGeometry(wingShape(side, 0), 1);
  face.translate(0, 0, depth / 2 + 0.001);
  const body = new ExtrudeGeometry(wingShape(side, 0), { depth, bevelEnabled: false, curveSegments: 10 });
  body.translate(0, 0, -depth / 2);
  // The ink edge: the same wing, slightly wider, behind it.
  const edge = new ShapeGeometry(wingShape(side, EDGE), 10);
  edge.translate(0, 0, -depth / 2 - 0.004);
  // Chrome glint: a light crescent at the top, on the side of the light (the window, upper left).
  const glint = new Shape();
  const gx = side * (WING.cx - 0.2) * KEY_A;
  glint.absellipse(gx, 0.42 * KEY_A, 0.4 * KEY_A, 0.13 * KEY_A, 0, Math.PI * 2, false, side * 0.25);
  const shine = new ShapeGeometry(glint, 10);
  shine.translate(0, 0, depth / 2 + 0.003);
  return [paint(face, new Color(INK.tin)), paint(shine, new Color(INK.paper)), paint(body, new Color(INK.tinShade)), paint(edge, new Color(INK.ink))];
}

export interface KeyViewOptions {
  element: HTMLElement;
  display: RetroDisplay;
  economy: Economy;
  winder: Winder;
  rosette: Rosette;
  reduced: () => boolean;
  /** Mask shape for the layout (round on desktop, rounded rectangle on phones). */
  mask: () => DisplayMask;
}

export class KeyView implements EngineView {
  readonly element: HTMLElement;
  readonly spring = new KeySpring();
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  private readonly key = new Group();
  private readonly coil: Mesh;
  private readonly texture: CanvasTexture;
  private coilScale = 1;

  constructor(private readonly o: KeyViewOptions) {
    this.element = o.element;
    const light = { value: new Vector3(-0.35, 0.5, 0.8).normalize() };
    const lit = () =>
      new ShaderMaterial({
        vertexShader: S.litVert,
        fragmentShader: S.litFrag,
        uniforms: { uLight: light, uTint: { value: new Color(INK.pink) }, uTintMix: { value: 0 }, uFade: { value: 1 } },
      });

    // Tilted mount: seen head-on, but with some depth.
    const mount = new Group();
    mount.rotation.set(-0.3, 0.34, 0);
    this.scene.add(mount);

    // The back plate, with the rosette that keeps every stamp.
    this.texture = new CanvasTexture(o.rosette.canvas);
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.colorSpace = SRGBColorSpace;
    const plate = new Mesh(new PlaneGeometry(PLATE, PLATE), new MeshBasicMaterial({ map: this.texture, alphaTest: 0.5 }));
    plate.position.z = -0.4;
    mount.add(plate);
    o.rosette.onChange(() => {
      this.texture.needsUpdate = true;
    });

    // The spiral spring behind the key: it tightens toward the axle as wind builds up.
    const spring = new Mainspring(0.2, 0.9, 5.5);
    const coilGeo = paint(new TubeGeometry(spring, 160, 0.022, 4, false), new Color(INK.tin));
    this.coil = new Mesh(coilGeo, lit());
    this.coil.position.z = -0.3;
    mount.add(this.coil);

    // The key: two waisted tin wings, a vermilion hexagonal hub and the shaft pointing inward.
    // Flat colors (unlit): the chrome tin reads through its inks (light face, shaded side, ink edge),
    // like the box's lithography, not through a gradient that the dither would muddy.
    const hubR = KEY_A * 0.44;
    const hub = new CylinderGeometry(hubR, hubR, 0.1, 6);
    hub.rotateX(Math.PI / 2);
    hub.translate(0, 0, 0.02);
    const hubEdge = new CylinderGeometry(hubR + EDGE, hubR + EDGE, 0.02, 6);
    hubEdge.rotateX(Math.PI / 2);
    hubEdge.translate(0, 0, -0.04);
    // Shaft collar and shaft: they peek out at the lower right because of the mount's tilt.
    const collar = new CylinderGeometry(hubR * 0.78, hubR * 0.9, 0.12, 12);
    collar.rotateX(Math.PI / 2);
    collar.translate(0, 0, -0.1);
    const shaft = new CylinderGeometry(0.05, 0.05, 0.7, 6);
    shaft.rotateX(Math.PI / 2);
    shaft.translate(0, 0, -0.45);
    const pin = new CylinderGeometry(hubR * 0.32, hubR * 0.32, 0.02, 6);
    pin.rotateX(Math.PI / 2);
    pin.translate(0, 0, 0.075);
    const keyGeo = merge([
      ...wingSolid(1),
      ...wingSolid(-1),
      paint(hub, new Color(INK.vermilion)),
      paint(hubEdge, new Color(INK.ink)),
      paint(pin, new Color(INK.oxblood)),
      paint(collar, new Color(INK.tinShade)),
      paint(shaft, new Color(INK.ink)),
    ]);
    this.key.add(new Mesh(keyGeo, new MeshBasicMaterial({ vertexColors: true })));
    mount.add(this.key);

    this.camera.position.set(0, 0, 6);
    this.camera.lookAt(0, 0, 0);
    o.winder.onWobble(() => this.spring.wobble());
  }

  /** Target angle: the stored wind as turns of the key, plus the give of the drag. */
  private target(): number {
    return (this.o.economy.storedSeconds / SECONDS_PER_TURN) * 360 + this.o.winder.give;
  }

  tick(dt: number): boolean {
    this.spring.target = this.target();
    let moving: boolean;
    if (this.o.reduced()) {
      this.spring.snap();
      moving = false;
    } else {
      moving = this.spring.step(dt);
    }
    this.key.rotation.z = (-this.spring.shown * Math.PI) / 180;
    const coil = 1 - 0.42 * this.o.economy.wind;
    const coilMoving = Math.abs(coil - this.coilScale) > 1e-3;
    this.coilScale += (coil - this.coilScale) * (this.o.reduced() ? 1 : Math.min(1, dt / 0.18));
    this.coil.scale.set(this.coilScale, this.coilScale, 1);
    // The spiral turns with the key (the axle drags it), at half the angle: you can see it coil.
    this.coil.rotation.z = this.key.rotation.z * 0.5;
    return moving || coilMoving || this.o.economy.state.mode === 'running';
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const aspect = rect.width / rect.height;
    this.camera.left = -FRAME * aspect;
    this.camera.right = FRAME * aspect;
    this.camera.top = FRAME;
    this.camera.bottom = -FRAME;
    this.camera.updateProjectionMatrix();
    this.o.display.render(renderer, rect, this.scene, this.camera, { background: SPACE_DEEP, mask: this.o.mask() });
  }
}
