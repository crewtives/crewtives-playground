// Kaleidoscope view: a quad that samples the cell through the mirrors (folding), and the retro
// display dithers it afterwards, in screen space, so the dither never shows up mirrored at the
// seams. With `raw`, it shows the cell without mirrors ("What the mirrors see").

import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, type WebGLRenderer } from 'three';
import type { RetroDisplay } from '../../../engine/display/RetroDisplay';
import type { EngineView, ViewRect } from '../../../engine/engine/Engine';
import type { CellRenderer } from './cell';
import { dihedralOrder, MAX_REFLECTIONS, TRIANGLES, triangleEdges, type MirrorMode } from './fold';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Same math as fold.ts: a wedge of two mirrors centered on "down", or a triangle of three.
const fragmentShader = /* glsl */ `
uniform sampler2D tCell;
uniform float uBeta;
uniform int uMode;
uniform float uN;
uniform vec2 uEdgeN[3];
uniform vec2 uEdgeP[3];
uniform float uRaw;
uniform vec3 uSheet;
uniform vec3 uInk;
varying vec2 vUv;

vec2 foldDihedral(vec2 p, float n) {
  float r = length(p);
  float w = 3.14159265 / n;
  float phi = atan(p.x, -p.y);
  float u = mod(phi + w * 0.5, 2.0 * w);
  if (u > w) u = 2.0 * w - u;
  float a = u - w * 0.5;
  return vec2(r * sin(a), -r * cos(a));
}

vec2 foldTriangle(vec2 p) {
  for (int i = 0; i < ${MAX_REFLECTIONS}; i++) {
    bool moved = false;
    for (int e = 0; e < 3; e++) {
      float d = dot(uEdgeN[e], p - uEdgeP[e]);
      if (d < 0.0) {
        p -= 2.0 * d * uEdgeN[e];
        moved = true;
      }
    }
    if (!moved) break;
  }
  return p;
}

void main() {
  vec2 s = vUv * 2.0 - 1.0;
  float rho = length(s);
  vec2 f = s;
  if (uRaw < 0.5) f = uMode == 0 ? foldDihedral(s, uN) : foldTriangle(s);
  float c = cos(uBeta);
  float sn = sin(uBeta);
  vec2 cell = vec2(f.x * c - f.y * sn, f.x * sn + f.y * c);
  vec3 color = length(cell) > 1.0 ? uSheet : texture2D(tCell, cell * 0.5 + 0.5).rgb;
  // Ink vignette of the tube: 6 % toward the rim.
  color = mix(color, uInk, 0.06 * smoothstep(0.72, 1.0, rho));
  gl_FragColor = vec4(color, 1.0);
}
`;

export interface FoldViewOptions {
  display: RetroDisplay;
  cell: CellRenderer;
  /** Shows the cell without mirrors. */
  raw?: boolean;
}

export class FoldView implements EngineView {
  readonly element: HTMLElement;
  readonly display: RetroDisplay;
  /** Own reveal (0–1): the display's first appearance. */
  reveal = 1;
  private readonly cell: CellRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: ShaderMaterial;

  constructor(element: HTMLElement, options: FoldViewOptions) {
    this.element = element;
    this.display = options.display;
    this.cell = options.cell;
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tCell: { value: this.cell.target.texture },
        uBeta: { value: 0 },
        uMode: { value: 0 },
        uN: { value: 5 },
        uEdgeN: { value: [new Vector2(), new Vector2(), new Vector2()] },
        uEdgeP: { value: [new Vector2(), new Vector2(), new Vector2()] },
        uRaw: { value: options.raw ? 1 : 0 },
        // Paper and ink, in linear space.
        uSheet: { value: [0.9823, 0.9823, 0.9216] },
        uInk: { value: [0.0109, 0.0052, 0.0273] },
      },
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  /** Mirror mode and barrel angle (°, clockwise). */
  configure(mode: MirrorMode, beta: number): void {
    const u = this.material.uniforms;
    u.uBeta.value = (beta * Math.PI) / 180;
    if (mode === 'p333' || mode === 'p632') {
      u.uMode.value = 1;
      triangleEdges(TRIANGLES[mode]).forEach(({ n, p }, i) => {
        (u.uEdgeN.value as Vector2[])[i].set(n[0], n[1]);
        (u.uEdgeP.value as Vector2[])[i].set(p[0], p[1]);
      });
    } else {
      u.uMode.value = 0;
      u.uN.value = dihedralOrder(mode);
    }
  }

  render(renderer: WebGLRenderer, rect: ViewRect): void {
    this.cell.ensure(renderer);
    this.display.render(renderer, rect, this.scene, this.camera, {
      background: [253, 253, 246],
      mask: { shape: 'ellipse' },
      reveal: this.reveal,
    });
  }
}
