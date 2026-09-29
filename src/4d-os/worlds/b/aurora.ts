import { Mesh, PlaneGeometry, ShaderMaterial, Spherical, Vector3, type Color } from 'three';
import { cssColor, cssNumber } from '../../../engine/display/cssColor';
import type { TimeController } from '../../../engine/time/TimeController';
import type { TimeViewer } from '../../../engine/viewer/TimeViewer';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

// Aurora curtains in screen space, in linear color: the display quantizes and dithers them like
// the rest of the scene, so they reach the plate as pixel bands.
const fragmentShader = /* glsl */ `
  uniform float uClock;
  uniform float uYaw;
  uniform float uStrength;
  uniform vec3 uBase;
  uniform vec3 uHigh;
  uniform vec3 uTeal;
  uniform vec3 uViolet;
  uniform vec3 uMagenta;
  varying vec2 vUv;
  const float TAU = 6.2831853;

  void main() {
    // The sky turns with the camera: the aurora stays "outside", not stuck to the screen.
    float x = vUv.x + uYaw / TAU * 1.6;
    float y = vUv.y;
    float wave = 0.07 * sin(x * TAU * 1.3 + uClock * 0.21)
      + 0.035 * sin(x * TAU * 3.1 - uClock * 0.33)
      + 0.018 * sin(x * TAU * 7.0 + uClock * 0.6);
    float band = y - (0.6 + wave);
    float rays = 0.5 + 0.5 * sin(x * TAU * 9.0 + 2.2 * sin(x * 7.0 + uClock * 0.4));
    float teal = exp(-pow(band / 0.15, 2.0)) * (0.55 + 0.45 * rays);
    float violet = exp(-pow((band - 0.2) / 0.2, 2.0));
    float magenta = exp(-pow((band - 0.36) / 0.13, 2.0)) * (0.5 + 0.5 * rays);
    vec3 color = mix(uBase, uHigh, smoothstep(0.0, 1.0, y));
    color += uStrength * (uTeal * teal + uViolet * violet * 0.8 + uMagenta * magenta * 0.7);
    // At the bottom, the alley floor: the aurora fades out downward.
    color = mix(uBase, color, smoothstep(0.08, 0.5, y));
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Aurora background for B's plate: a full-screen quad behind the points. Its clock is the pack's
 * "now" (not a clock of its own): with time in HOLD the aurora holds still too and the engine can
 * sleep; when scrubbing, it moves with time.
 */
export function addAurora(viewer: TimeViewer, time: TimeController, tokenRoot: Element): void {
  const color = (token: string, fallback: string): Color => cssColor(tokenRoot, token, fallback);
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uClock: { value: 0 },
      uYaw: { value: 0 },
      uStrength: { value: cssNumber(tokenRoot, '--aurora-strength', 1) },
      uBase: { value: color('--aurora-base', '#111312') },
      uHigh: { value: color('--aurora-high', '#16282c') },
      uTeal: { value: color('--aurora-teal', '#2a6f67') },
      uViolet: { value: color('--aurora-violet', '#472a52') },
      uMagenta: { value: color('--aurora-magenta', '#7a3a70') },
    },
  });
  const sky = new Mesh(new PlaneGeometry(2, 2), material);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  const offset = new Vector3();
  const spherical = new Spherical();
  sky.onBeforeRender = () => {
    material.uniforms.uClock.value = time.exactFrame / time.fps;
    offset.copy(viewer.camera.position).sub(viewer.controls.target);
    material.uniforms.uYaw.value = spherical.setFromVector3(offset).theta;
  };
  viewer.scene.add(sky);
}
