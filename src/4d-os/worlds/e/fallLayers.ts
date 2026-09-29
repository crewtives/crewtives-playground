import {
  BufferGeometry,
  Color,
  GLSL3,
  Mesh,
  NearestFilter,
  PlaneGeometry,
  Points,
  RawShaderMaterial,
  SRGBColorSpace,
  Scene,
  WebGLRenderTarget,
  type IUniform,
} from 'three';
import type { Engine } from '../../../engine/engine/Engine';
import type { TimeController } from '../../../engine/time/TimeController';
import type { TimeViewer } from '../../../engine/viewer/TimeViewer';
import commonGlsl from '../../../engine/viewer/common.glsl?raw';

// Subject layer of landing E, on top of the viewer's. Near the horizon the whale barely moves forward:
// with a fixed trail stride, the copies pile up into a spiky ring (the pectoral fins) and the present
// blends into them. Here the trail uses a variable stride (sparser where the whale is slow) and the present
// is painted last, on top of everything, with a 1-display-pixel outline in the color of the state (bone in
// HOLD): it reads as a whale even when the trail passes behind it. It reuses the 4D pack's buffers and the
// viewer's uniforms (look, time, point size): whatever the viewer adjusts, this layer follows.

/** Bits per integer in the copy mask (the sign bit is avoided). */
const BITS = 30;

const trailVert = /* glsl */ `
precision highp float;
precision highp int;

in vec3 position;
in vec3 color;
in float aFrame;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

uniform float uFrame;
uniform int uMode;
uniform float uShowTrail;
uniform float uTrailTau;
uniform float uTrailMin;
uniform float uTrailMax;
uniform float uFutureScale;
uniform vec3 uTrailTint;
uniform vec3 uFutureTint;
uniform float uTrailTintAmount;
uniform float uWorldSize;
uniform int uCopies[COPY_WORDS];

out vec3 vColor;

// @common

bool isCopy(int frame) {
  return ((uCopies[frame / ${BITS}] >> (frame % ${BITS})) & 1) == 1;
}

void main() {
  float age = uFrame - aFrame;
  float distance = abs(age);
  bool future = age < 0.0;
  vec4 view = viewMatrix * modelMatrix * vec4(position, 1.0);
  bool visible = uShowTrail > 0.5 && distance > 0.5 && (!future || uMode == 1) && isCopy(int(aFrame + 0.5));
  float density = mix(uTrailMin, uTrailMax, exp(-distance / uTrailTau)) * nearFade(-view.z);
  vec3 c = srgbToLinear(color);
  if (future) {
    density *= uFutureScale;
    c = mix(c, uFutureTint, 0.75) * 0.7;
  } else {
    c = mix(c, uTrailTint, uTrailTintAmount) * mix(0.5, 1.0, exp(-distance / uTrailTau));
  }
  if (!visible || pointThreshold(gl_VertexID) >= density) {
    hidePoint();
    return;
  }
  vColor = c;
  gl_Position = projectionMatrix * view;
  gl_PointSize = pointSize(uWorldSize, -view.z);
}
`;

// The present: the same color mix as the viewer (it takes the direction's tone according to uPresentTint)
// and the position interpolated toward the next frame.
const presentVert = /* glsl */ `
precision highp float;
precision highp int;

in vec3 position;
in vec3 aNext;
in vec3 color;
in float aFrame;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

uniform float uFrame;
uniform float uFrac;
uniform int uDirection;
uniform vec3 uPresentForward;
uniform vec3 uPresentRewind;
uniform vec3 uPresentHold;
uniform float uPresentTint;
uniform float uWorldSize;

out vec3 vColor;

// @common

void main() {
  if (abs(uFrame - aFrame) >= 0.5) {
    hidePoint();
    return;
  }
  vec3 c = srgbToLinear(color);
  vec3 tone = uDirection > 0 ? uPresentForward : (uDirection < 0 ? uPresentRewind : uPresentHold);
  c = mix(c, tone * mix(0.8, 1.1, clamp(luma(c) * 5.0, 0.0, 1.0)), uPresentTint);
  vec4 view = viewMatrix * modelMatrix * vec4(mix(position, aNext, uFrac), 1.0);
  vColor = c;
  gl_Position = projectionMatrix * view;
  gl_PointSize = pointSize(uWorldSize * 1.25, -view.z);
}
`;

const pointsFrag = /* glsl */ `
precision highp float;
in vec3 vColor;
out vec4 fragColor;
void main() {
  fragColor = vec4(vColor, 1.0);
}
`;

// Compositing the present over the scene: where the mask has whale, its color; on the neighboring pixels
// (four directions), the outline in the color of the state (bone in HOLD, cyan moving forward, amber
// rewinding: the same "NOW" accent as the playhead); everywhere else, nothing.
const overlayVert = /* glsl */ `
precision highp float;
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const overlayFrag = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D tMask;
uniform int uDirection;
uniform vec3 uPresentForward;
uniform vec3 uPresentRewind;
uniform vec3 uPresentHold;
out vec4 fragColor;

float covered(ivec2 p) {
  ivec2 size = textureSize(tMask, 0);
  if (p.x < 0 || p.y < 0 || p.x >= size.x || p.y >= size.y) return 0.0;
  return texelFetch(tMask, p, 0).a;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 whale = texelFetch(tMask, p, 0);
  if (whale.a > 0.5) {
    fragColor = vec4(whale.rgb, 1.0);
    return;
  }
  float edge = max(max(covered(p + ivec2(1, 0)), covered(p - ivec2(1, 0))), max(covered(p + ivec2(0, 1)), covered(p - ivec2(0, 1))));
  if (edge < 0.5) discard;
  fragColor = vec4(uDirection > 0 ? uPresentForward : (uDirection < 0 ? uPresentRewind : uPresentHold), 1.0);
}
`;

/**
 * Trail frames seen from the present `frame`: backward (and forward if `future`), each copy `stride(f)`
 * frames from the previous one, no more than `span` frames away. In order.
 */
export function trailCopies(frame: number, last: number, stride: (frame: number) => number, { future = false, span = Infinity } = {}): number[] {
  const step = (f: number) => Math.max(1, Math.round(stride(f)));
  const past: number[] = [];
  for (let f = frame - step(frame); f >= Math.max(0, frame - span); f -= step(f)) past.push(f);
  const ahead: number[] = [];
  if (future) for (let f = frame + step(frame); f <= Math.min(last, frame + span); f += step(f)) ahead.push(f);
  return [...past.reverse(), ...ahead];
}

export interface FallLayers {
  /** Trail visible (the monitor's "Every moment" checkbox). */
  setTrail(visible: boolean): void;
  /** Frames the trail is drawing now (for verification). */
  copies(): number[];
}

export interface FallLayerOptions {
  /** Trail stride (frames) from each frame to the next copy. */
  stride: (frame: number) => number;
  /** Maximum age of a copy, in frames (by default, the whole fall). */
  span?: number;
}

/**
 * Takes over `viewer`'s dynamic layer: it turns the viewer's own off and draws the trail with a variable
 * stride and the present on top, with an outline. The desktop's trail checkbox has to reach `setTrail`.
 */
export function addFallLayers(engine: Engine, viewer: TimeViewer, time: TimeController, { stride, span = Infinity }: FallLayerOptions): FallLayers {
  const { dynamicMaterial, dynamicPoints } = viewer.internals;
  const shared = dynamicMaterial.uniforms;
  const pick = (...names: string[]) => Object.fromEntries(names.map((name) => [name, shared[name]])) as Record<string, IUniform>;
  const { frameCount } = time;
  const last = frameCount - 1;
  const words = Math.ceil(frameCount / BITS);
  const mask = new Int32Array(words);

  // The viewer keeps updating its uniforms (time, look, point size); its dynamic layer is not painted.
  dynamicPoints.visible = false;
  const common = pick('uFocal', 'uMaxPointSize', 'uIdLayout', 'uIdGrid', 'uIdRows', 'uNearFade', 'uWorldSize', 'uFrame');

  const trailMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: trailVert.replace('COPY_WORDS', String(words)).replace('// @common', commonGlsl),
    fragmentShader: pointsFrag,
    uniforms: {
      ...common,
      ...pick('uMode', 'uTrailTau', 'uTrailMin', 'uTrailMax', 'uFutureScale', 'uTrailTint', 'uFutureTint', 'uTrailTintAmount'),
      uShowTrail: { value: viewer.layers.trail ? 1 : 0 },
      uCopies: { value: mask },
    },
  });
  const presentMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: presentVert.replace('// @common', commonGlsl),
    fragmentShader: pointsFrag,
    uniforms: { ...common, ...pick('uFrac', 'uDirection', 'uPresentForward', 'uPresentRewind', 'uPresentHold', 'uPresentTint') },
  });

  // Own geometries with the same attributes (three uploads each buffer only once): each pass has its
  // own draw range. The present processes only the points of its frame.
  const source = viewer.gpu.dynamicGeometry;
  const geometry = () => {
    const g = new BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) g.setAttribute(name, attribute);
    return g;
  };
  const trailGeometry = geometry();
  const presentGeometry = geometry();
  const place = (points: Points) => {
    points.position.copy(dynamicPoints.position);
    points.scale.copy(dynamicPoints.scale);
    points.frustumCulled = false;
    return points;
  };
  const trail = place(new Points(trailGeometry, trailMaterial));
  const present = place(new Points(presentGeometry, presentMaterial));
  const maskScene = new Scene();
  maskScene.add(present);

  // The present's mask: the same size as the display's render target on every paint.
  const maskTarget = new WebGLRenderTarget(1, 1, { colorSpace: SRGBColorSpace, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true });
  const overlayMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: overlayVert,
    fragmentShader: overlayFrag,
    depthTest: false,
    depthWrite: false,
    uniforms: { ...pick('uDirection', 'uPresentForward', 'uPresentRewind', 'uPresentHold'), tMask: { value: maskTarget.texture } },
  });
  const overlay = new Mesh(new PlaneGeometry(2, 2), overlayMaterial);
  overlay.frustumCulled = false;
  overlay.renderOrder = 10;
  const clear = new Color();
  overlay.onBeforeRender = (renderer, _scene, camera) => {
    const target = renderer.getRenderTarget();
    if (!target) return;
    if (maskTarget.width !== target.width || maskTarget.height !== target.height) maskTarget.setSize(target.width, target.height);
    renderer.getClearColor(clear);
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(maskTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(maskScene, camera);
    renderer.setRenderTarget(target);
    renderer.setClearColor(clear, alpha);
  };
  viewer.scene.add(trail, overlay);

  let selected: number[] = [];
  const sync = () => {
    const { frame, mode } = time.state;
    selected = trailCopies(frame, last, stride, { future: mode === 'all', span });
    mask.fill(0);
    for (const f of selected) mask[Math.floor(f / BITS)] |= 1 << f % BITS;
    const { offsets, count } = viewer.pack.dynamic;
    trailGeometry.setDrawRange(0, mode === 'memory' ? offsets[frame + 1] : count);
    presentGeometry.setDrawRange(offsets[frame], offsets[frame + 1] - offsets[frame]);
  };
  time.subscribe(sync);
  sync();

  return {
    setTrail(visible) {
      trailMaterial.uniforms.uShowTrail.value = visible ? 1 : 0;
      engine.invalidate(viewer);
    },
    copies: () => [...selected],
  };
}
