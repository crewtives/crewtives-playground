// Tray tops: each world cavity holds a live top in a round socket, dithered with its world's real
// 16-ink palette (a RetroDisplay of its own whose `tokenRoot` is the socket), and the launcher
// cavity shows all five in a row. They spin only while the cavity has the pointer over it or the
// focus; when released, the spin decays until the top stands still. They are painted only while spinning.
import { Color, Mesh, PerspectiveCamera, Scene, ShaderMaterial, Vector3, type WebGLRenderer } from 'three';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import { RetroDisplay, type DisplayMask } from '../../../engine/display/RetroDisplay';
import type { Rgb8 } from '../../../engine/display/palette';
import { WORLD_BODIES, type WorldId } from '../orbits';
import { applyWorldPalette, worldPrint } from '../worldInks';
import { topGeometry } from './lowpoly';
import * as S from './shaders';

const HOVER_SPIN = 38;
const deg = Math.PI / 180;

function rgb(n: number): Rgb8 {
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface SpinningTop {
  mesh: Mesh;
  material: ShaderMaterial;
  omega: number;
  spin: number;
  phase: number;
}

function topMaterial(base: number, band: number, dot: number, fold: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: S.topVert,
    fragmentShader: S.topFrag,
    uniforms: {
      uLight: { value: new Vector3(-0.5, 0.75, 0.45).normalize() },
      uBase: { value: new Color(base) },
      uBand: { value: new Color(band) },
      uDot: { value: new Color(dot) },
      uSpindle: { value: new Color(0xc7ccd4) },
      uFold: { value: fold },
      uSmear: { value: 0 },
      uPrinted: { value: 1 },
    },
  });
}

/** A row of tops (one in each world socket, five in the launcher). */
export class TopsView implements EngineView {
  readonly element: HTMLElement;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 0.1, 50);
  private readonly tops: SpinningTop[] = [];
  private hovered = false;
  private arrangement: 'row' | 'ring' = 'row';
  private readonly background: Rgb8;

  constructor(
    element: HTMLElement,
    private readonly display: RetroDisplay,
    worlds: readonly WorldId[],
    background: number,
    private readonly mask: DisplayMask,
    private readonly reduced: () => boolean,
    private readonly invalidate: () => void,
  ) {
    this.element = element;
    this.background = rgb(background);
    const geo = topGeometry(12);
    worlds.forEach((id, i) => {
      const p = worldPrint(id);
      const material = topMaterial(p.base, p.band, p.dot, 5);
      const mesh = new Mesh(geo, material);
      const spacing = 2.1;
      mesh.position.set((i - (worlds.length - 1) / 2) * spacing, 0, 0);
      mesh.rotation.x = 4 * deg;
      this.scene.add(mesh);
      this.tops.push({ mesh, material, omega: 0, spin: i * 0.9, phase: i });
    });
    const n = worlds.length;
    this.camera.aspect = n > 1 ? 3.2 : 1;
    if (n > 1) this.camera.position.set(0, 2.5, 8.4);
    else this.camera.position.set(0, 1.3, 3.1);
    this.camera.lookAt(0, n > 1 ? -0.1 : 0.02, 0);

    const cavity = element.closest('.cavity') ?? element;
    const on = () => {
      this.hovered = true;
      if (this.reduced()) for (const t of this.tops) t.omega = HOVER_SPIN;
      this.invalidate();
    };
    const off = () => {
      if (cavity.matches(':hover') || cavity.contains(document.activeElement)) return;
      this.hovered = false;
      if (this.reduced()) for (const t of this.tops) t.omega = 0;
      this.invalidate();
    };
    cavity.addEventListener('pointerenter', on);
    cavity.addEventListener('pointerleave', off);
    cavity.addEventListener('focusin', on);
    cavity.addEventListener('focusout', () => window.setTimeout(off, 0));
  }

  setFold(fold: number): void {
    for (const t of this.tops) t.material.uniforms.uFold.value = fold;
    this.invalidate();
  }

  tick(dt: number): boolean {
    if (this.reduced()) {
      // Still: the ring print is a fixed image for as long as the focus lasts.
      for (const t of this.tops) this.pose(t, 0);
      return false;
    }
    let moving = false;
    for (const t of this.tops) {
      if (this.hovered) t.omega += (HOVER_SPIN - t.omega) * Math.min(1, dt * 3);
      else t.omega = t.omega < 0.6 ? 0 : t.omega * Math.exp(-dt / 0.9);
      t.spin += t.omega * dt;
      this.pose(t, dt);
      if (t.omega > 0) moving = true;
    }
    return moving || this.hovered;
  }

  /** A row (landscape window, phone) or a ring of five (4:3 window next to D and E, like the orrery). */
  private layout(kind: 'row' | 'ring'): void {
    if (kind === this.arrangement) return;
    this.arrangement = kind;
    const n = this.tops.length;
    this.tops.forEach((t, i) => {
      if (kind === 'row') t.mesh.position.set((i - (n - 1) / 2) * 2.1, 0, 0);
      else {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        t.mesh.position.set(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75);
      }
    });
    if (kind === 'row') this.camera.position.set(0, 2.5, 8.4);
    else this.camera.position.set(0, 5.4, 8.8);
    this.camera.lookAt(0, kind === 'row' ? -0.1 : -0.3, 0);
  }

  private pose(t: SpinningTop, dt: number): void {
    t.phase += dt * (t.omega > 0 ? 9 / Math.max(t.omega, 6) : 0);
    const wobble = t.omega > 0 ? 3 + 30 / Math.max(t.omega, 6) : 0;
    t.mesh.rotation.set(Math.cos(t.phase) * wobble * deg, t.spin, Math.sin(t.phase) * wobble * deg);
    t.material.uniforms.uSmear.value = Math.min(Math.PI * 2, t.omega * (1 / 60) * 1.5 * (this.reduced() ? 4 : 1));
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    const aspect = rect.width / rect.height;
    if (this.tops.length > 1) this.layout(aspect < 2 ? 'ring' : 'row');
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.display.render(renderer, rect, this.scene, this.camera, { background: this.background, mask: this.mask });
  }
}

/** Creates the tray views: one display per world (with its palette) and the launcher row. */
export function createTrayTops(options: {
  launcherDisplay: RetroDisplay;
  register: (display: RetroDisplay) => void;
  reduced: () => boolean;
  invalidate: (view?: EngineView) => void;
}): TopsView[] {
  const views: TopsView[] = [];
  for (const socket of document.querySelectorAll<HTMLElement>('.top-socket[data-top]')) {
    const id = socket.dataset.top as WorldId;
    applyWorldPalette(socket, id);
    const display = new RetroDisplay({ tokenRoot: socket, pixelScale: 2 });
    options.register(display);
    const ground = worldPrint(id).ground;
    // The view goes inside the rim (the engine canvas sits above the tray).
    const inner = document.createElement('span');
    inner.className = 'top-view';
    socket.append(inner);
    const view: TopsView = new TopsView(inner, display, [id], ground, { shape: 'ellipse' }, options.reduced, () => options.invalidate(view));
    display.onChange(() => options.invalidate(view));
    views.push(view);
  }
  const row = document.querySelector<HTMLElement>('[data-launcher-tops]');
  if (row) {
    const order = WORLD_BODIES.map((w) => w.id).sort();
    const view: TopsView = new TopsView(row, options.launcherDisplay, order, 0x0b5f58, { shape: 'roundrect', radius: 10 }, options.reduced, () => options.invalidate(view));
    views.push(view);
  }
  return views;
}
