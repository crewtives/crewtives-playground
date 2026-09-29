import {
  CircleGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  ShaderMaterial,
  UnsignedByteType,
  Vector3,
  type Wrapping,
} from 'three';
import type { TimeController } from '../../../engine/time/TimeController';
import type { TimeViewer } from '../../../engine/viewer/TimeViewer';
import { WHALE_FALL, blackbody } from '../../../pipeline/scenes/whaleFall';
import { SKY, diskIntensity, diskModulation, makeStars, skyGlow } from '../../../pipeline/scenes/whaleFallSky';

// Sky of landing E (D10): the black hole's gravitational lens, computed per display pixel on every
// render. A ray leaves the view's camera and is integrated through Schwarzschild space (r_s = 1, the
// hole at the origin, as in the scene): if it falls inside the horizon it stays black (the shadow); if
// it crosses the disk's plane it adds the disk's light, with the gas's Doppler shift and the gravitational
// redshift, so the disk shows above and below the shadow and changes shape as the camera orbits; if it
// escapes, it reads the same stars and nebulae as the 4D pack's static layer. All in linear color: the
// display quantizes it and applies dithering to it like the rest of the scene. Its clock is the 4D pack's
// "NOW" (`time.exactFrame`): in HOLD there are no new renders and the sky stays still.

const { inner: R_IN, outer: R_OUT, kelvin: KELVIN, falloff: FALLOFF } = WHALE_FALL.disk;

/** Impact parameter (r_s) above which the weak-field deflection is enough (α ≈ 2 r_s/b). */
const FAR_FIELD = 9.5;
/** Radius (r_s) from which the ray is integrated: farther out it travels straight (the deflection there is minimal). */
const NEAR_FIELD = 14;

const vertexShader = /* glsl */ `
  varying vec2 vNdc;
  void main() {
    vNdc = position.xy;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform mat4 uInverseProjection;
  uniform mat4 uCameraWorld;
  uniform sampler2D tStars;
  uniform sampler2D tGlow;
  uniform sampler2D tDisk;
  uniform sampler2D tBlackbody;
  uniform vec2 uDisk;          // inner and outer edge (r_s)
  uniform vec3 uKelvin;       // inner-edge temperature, falloff with r, disk brightness
  uniform float uStarRadius;
  uniform float uStarGain;
  uniform float uGlowGain;
  uniform float uSaturation;
  uniform float uClock;       // 4D pack seconds: the disk turns with the "NOW"
  uniform float uSpin;        // angular velocity of the gas at the inner edge (rad/s)
  uniform float uExposure;
  varying vec2 vNdc;

  const float PI = 3.141592653589793;
  const float FAR_FIELD = ${FAR_FIELD.toFixed(1)};
  const float NEAR_FIELD = ${NEAR_FIELD.toFixed(1)};

  vec3 blackbodyRgb(float kelvin) {
    float u = (log(clamp(kelvin, 1000.0, 40000.0)) - log(1000.0)) / (log(40000.0) - log(1000.0));
    vec3 c = texture2D(tBlackbody, vec2((u * 255.0 + 0.5) / 256.0, 0.5)).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return max(vec3(0.0), l + (c - l) * uSaturation);
  }

  float diskTemperature(float r) { return uKelvin.x * pow(uDisk.x / max(r, uDisk.x), uKelvin.y); }

  float diskIntensity(float r) {
    float heat = diskTemperature(r) / uKelvin.x;
    return uKelvin.z * pow(heat, 0.65) * smoothstep(uDisk.x - 0.05, uDisk.x + 0.3, r) * (1.0 - smoothstep(uDisk.y - 1.8, uDisk.y, r));
  }

  vec2 equirect(vec3 d) {
    return vec2(atan(d.z, d.x) / (2.0 * PI) + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
  }

  // What an escaping ray sees: the 4D pack's star sphere (with parallax: the ray cuts the sphere from
  // where it is) and the diffuse glow of nebulae and the Milky Way.
  vec3 sky(vec3 pos, vec3 dir) {
    float b = dot(pos, dir);
    float c = dot(pos, pos) - uStarRadius * uStarRadius;
    float t = -b + sqrt(max(0.0, b * b - c));
    vec3 onSphere = c < 0.0 ? normalize(pos + dir * t) : dir;
    vec3 s = texture2D(tStars, equirect(onSphere)).rgb;
    vec3 g = texture2D(tGlow, equirect(onSphere)).rgb;
    return s * s * uStarGain + g * g * uGlowGain;
  }

  // Ray acceleration in Schwarzschild (r_s = 1): d²x/dλ² = −(3/2)·h²·x/r⁵.
  vec3 bend(vec3 p, float h2) {
    float r2 = dot(p, p);
    return -1.5 * h2 * p / (r2 * r2 * sqrt(r2));
  }

  // Disk light at the crossing \`hit\`, seen by a ray that propagates (backward) along \`dir\`.
  vec4 diskAt(vec3 hit, vec3 dir) {
    float rho = length(hit.xz);
    if (rho < uDisk.x - 0.05 || rho > uDisk.y) return vec4(0.0);
    float angle = atan(-hit.z, hit.x);
    // Differential rotation (faster inside, as ρ^−3/2): the vortex turns with the 4D pack's clock.
    float spun = angle - uSpin * pow(uDisk.x / rho, 1.5) * uClock;
    float modulation = texture2D(tDisk, vec2((rho - uDisk.x) / (uDisk.y - uDisk.x), spun / (2.0 * PI))).r * 2.0;
    // Doppler shift of the gas in a counterclockwise orbit (seen from +y) and gravitational redshift.
    float beta = min(0.6, sqrt(0.5 / max(rho - 1.0, 1e-3)));
    vec3 tangent = vec3(hit.z, 0.0, -hit.x) / rho;
    float cosA = dot(tangent, -dir);
    float g = sqrt(max(0.0, 1.0 - 1.0 / rho)) * sqrt(1.0 - beta * beta) / (1.0 - beta * cosA);
    float intensity = diskIntensity(rho) * modulation * g * g * g;
    vec3 emitted = blackbodyRgb(diskTemperature(rho) * g) * intensity;
    float opacity = clamp(0.25 + 0.5 * modulation, 0.0, 0.95) * smoothstep(uDisk.x - 0.05, uDisk.x + 0.25, rho);
    return vec4(emitted, opacity);
  }

  void main() {
    vec4 view = uInverseProjection * vec4(vNdc, 1.0, 1.0);
    vec3 dir = normalize((uCameraWorld * vec4(view.xyz / view.w, 0.0)).xyz);
    vec3 pos = cameraPosition;
    vec3 L = cross(pos, dir);
    float h2 = dot(L, L);
    float impact = sqrt(h2);
    vec3 color = vec3(0.0);
    float trans = 1.0;

    if (impact > FAR_FIELD) {
      // Weak field: the ray does not touch the disk; it bends toward the hole by what remains of its path,
      // α = (r_s/b)·(1 − s/√(s² + b²)), with s the position along the ray relative to the perihelion.
      float s = dot(pos, dir);
      float alpha = (1.0 - s / sqrt(s * s + h2)) / impact;
      vec3 toward = normalize(pos - dir * s);
      vec3 bent = normalize(dir * cos(alpha) - toward * sin(alpha));
      color = sky(pos, bent);
    } else {
      // Outside the near field the ray travels straight to the integration sphere.
      float r0 = length(pos);
      if (r0 > NEAR_FIELD) {
        float s = dot(pos, dir);
        float c = r0 * r0 - NEAR_FIELD * NEAR_FIELD;
        float t = -s - sqrt(max(0.0, s * s - c));
        pos += dir * max(0.0, t);
      }
      float escape = max(NEAR_FIELD, r0) + 0.5;
      bool captured = false;
      for (int i = 0; i < 240; i++) {
        float r = length(pos);
        if (r < 1.0) { captured = true; break; }
        if (r > escape && dot(pos, dir) > 0.0) break;
        float dt = clamp(0.045 + 0.09 * (r - 1.0), 0.025, 1.1);
        // RK4 on (position, direction).
        vec3 k1v = bend(pos, h2);
        vec3 k1x = dir;
        vec3 k2v = bend(pos + 0.5 * dt * k1x, h2);
        vec3 k2x = dir + 0.5 * dt * k1v;
        vec3 k3v = bend(pos + 0.5 * dt * k2x, h2);
        vec3 k3x = dir + 0.5 * dt * k2v;
        vec3 k4v = bend(pos + dt * k3x, h2);
        vec3 k4x = dir + dt * k3v;
        vec3 next = pos + dt / 6.0 * (k1x + 2.0 * k2x + 2.0 * k3x + k4x);
        vec3 nextDir = dir + dt / 6.0 * (k1v + 2.0 * k2v + 2.0 * k3v + k4v);
        if (pos.y * next.y <= 0.0 && pos.y != next.y) {
          vec4 light = diskAt(mix(pos, next, pos.y / (pos.y - next.y)), normalize(nextDir));
          color += trans * light.rgb;
          trans *= 1.0 - light.a;
        }
        pos = next;
        dir = nextDir;
        if (trans < 0.02) break;
      }
      if (!captured && trans > 0.02) color += trans * sky(pos, normalize(dir));
    }
    // Soft compression of the brightest parts, as in the 4D pack's points.
    gl_FragColor = vec4(1.0 - exp(-color * uExposure), 1.0);
  }
`;

// --- textures: the same stars, nebulae and disk as the 4D pack's static layer ---------------------------

/** Maximum brightness the textures encode (√(I / max) is stored in 8 bits, as in the bake). */
const STAR_MAX = 1.2;
const GLOW_MAX = 0.12;
/** Disk brightness at the inner edge, the same as the points' (the scene's `diskIntensity`). */
const DISK_GAIN = diskIntensity(R_IN + 1) / diskIntensityShape(R_IN + 1);

/** Seed and density of the `whale-fall` bake (WHALE_DEFAULTS): the same list of stars. */
const SEED = 1;
const STAR_COUNT = 26000;

interface LensTextures {
  stars: DataTexture;
  glow: DataTexture;
  disk: DataTexture;
  blackbody: DataTexture;
}

let shared: LensTextures | null = null;

/** The shape of `diskIntensity` without its gain: the same expression as the shader. */
function diskIntensityShape(r: number): number {
  const heat = Math.pow(R_IN / Math.max(r, R_IN), FALLOFF);
  const edge = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  return heat ** 0.65 * edge(R_IN - 0.05, R_IN + 0.3, r) * (1 - edge(R_OUT - 1.8, R_OUT, r));
}

function dataTexture(data: Uint8Array, width: number, height: number, wrapS: Wrapping, wrapT: Wrapping = ClampToEdgeWrapping): DataTexture {
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const equirect = (d: ArrayLike<number>): [number, number] => [
  Math.atan2(d[2], d[0]) / (2 * Math.PI) + 0.5,
  Math.asin(Math.max(-1, Math.min(1, d[1]))) / Math.PI + 0.5,
];

/** The lens textures, once per page (all views share them). */
function lensTextures(): LensTextures {
  if (shared) return shared;
  // Stars: each one spreads its brightness over the 4 neighboring texels (bilinear), in an equirectangular
  // map at half the bake's resolution: on the display each texel is smaller than a pixel.
  const SW = 2048;
  const SH = 1024;
  const acc = new Float32Array(SW * SH);
  const tint = new Float32Array(SW * SH * 3);
  for (const star of makeStars(SEED, STAR_COUNT)) {
    const [u, v] = equirect(star.dir);
    const x = u * SW - 0.5;
    const y = v * SH - 0.5;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const level = Math.max(star.color[0], star.color[1], star.color[2]);
    for (const [dx, dy, w] of [
      [0, 0, (1 - fx) * (1 - fy)],
      [1, 0, fx * (1 - fy)],
      [0, 1, (1 - fx) * fy],
      [1, 1, fx * fy],
    ] as const) {
      const yy = Math.min(SH - 1, Math.max(0, y0 + dy));
      const xx = (((x0 + dx) % SW) + SW) % SW;
      const i = yy * SW + xx;
      acc[i] += level * w * 1.6;
      for (let k = 0; k < 3; k++) tint[i * 3 + k] += star.color[k] * w * 1.6;
    }
  }
  const starData = new Uint8Array(SW * SH * 4);
  for (let i = 0; i < SW * SH; i++) {
    if (acc[i] > 0) for (let k = 0; k < 3; k++) starData[i * 4 + k] = Math.round(255 * Math.sqrt(Math.min(1, tint[i * 3 + k] / STAR_MAX)));
    starData[i * 4 + 3] = 255;
  }

  // Diffuse glow: nebulae and the galactic band (low resolution: it is soft light).
  const GW = 256;
  const GH = 128;
  const glowData = new Uint8Array(GW * GH * 4);
  for (let y = 0; y < GH; y++) {
    const lat = ((y + 0.5) / GH - 0.5) * Math.PI;
    for (let x = 0; x < GW; x++) {
      const lon = ((x + 0.5) / GW - 0.5) * 2 * Math.PI;
      const glow = skyGlow([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]);
      const o = (y * GW + x) * 4;
      for (let k = 0; k < 3; k++) glowData[o + k] = Math.round(255 * Math.sqrt(Math.min(1, glow[k] / GLOW_MAX)));
      glowData[o + 3] = 255;
    }
  }

  // Disk in polar coordinates: u radial (from R_IN to R_OUT), v angular (θ / 2π); the same modulation as the points.
  const DW = 128;
  const DH = 512;
  const diskData = new Uint8Array(DW * DH * 4);
  for (let y = 0; y < DH; y++) {
    const angle = ((y + 0.5) / DH) * 2 * Math.PI;
    for (let x = 0; x < DW; x++) {
      const r = R_IN + ((x + 0.5) / DW) * (R_OUT - R_IN);
      const o = (y * DW + x) * 4;
      diskData[o] = Math.round(255 * Math.min(1, diskModulation(r, angle) / 2));
      diskData[o + 3] = 255;
    }
  }

  // Blackbody, from 1000 K to 40,000 K on a log scale (the same law as the module's `blackbody`).
  const bbData = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const c = blackbody(Math.exp(Math.log(1000) + (i / 255) * (Math.log(40000) - Math.log(1000))));
    for (let k = 0; k < 3; k++) bbData[i * 4 + k] = Math.round(255 * c[k]);
    bbData[i * 4 + 3] = 255;
  }

  shared = {
    stars: dataTexture(starData, SW, SH, RepeatWrapping),
    glow: dataTexture(glowData, GW, GH, RepeatWrapping),
    disk: dataTexture(diskData, DW, DH, ClampToEdgeWrapping, RepeatWrapping),
    blackbody: dataTexture(bbData, 256, 1, ClampToEdgeWrapping),
  };
  return shared;
}

/** Computes the lens textures now (≈0.2 s of CPU): best done while the 4D pack is loading. */
export function prepareLensTextures(): void {
  lensTextures();
}

export interface LensLook {
  /** Sky exposure (before compression). */
  exposure?: number;
  /** Brightness of the lensed disk relative to the points' (1 = the same). */
  disk?: number;
  /** Brightness of stars and nebulae. */
  stars?: number;
  glow?: number;
  /** Angular velocity of the gas at the inner edge (rad/s); 0 = still disk. */
  spin?: number;
  /** Saturation of the disk's blackbody color (the display quantizes: with little chroma it falls to gray). */
  saturation?: number;
}

export interface LensSky {
  setLook(look: LensLook): void;
  dispose(): void;
}

/**
 * Puts the lens behind `viewer`'s points (a full-screen quad, like B's aurora) and, in front of the hole's
 * plane, an invisible disk that only writes depth: it hides the points that lie behind the shadow (the
 * far side of the disk, stars), whose light the lens bends around it.
 */
export function addLensSky(viewer: TimeViewer, time: TimeController, look: LensLook = {}): LensSky {
  const textures = lensTextures();
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uInverseProjection: { value: new Matrix4() },
      uCameraWorld: { value: new Matrix4() },
      tStars: { value: textures.stars },
      tGlow: { value: textures.glow },
      tDisk: { value: textures.disk },
      tBlackbody: { value: textures.blackbody },
      uDisk: { value: [R_IN, R_OUT] },
      uKelvin: { value: [KELVIN, FALLOFF, DISK_GAIN] },
      uStarRadius: { value: SKY.starRadius },
      uStarGain: { value: STAR_MAX },
      uGlowGain: { value: GLOW_MAX },
      uSaturation: { value: 1.6 },
      uClock: { value: 0 },
      uSpin: { value: 0.3 },
      uExposure: { value: 1 },
    },
  });
  const u = material.uniforms;
  const setLook = (next: LensLook) => {
    if (next.exposure !== undefined) u.uExposure.value = next.exposure;
    if (next.disk !== undefined) u.uKelvin.value = [KELVIN, FALLOFF, DISK_GAIN * next.disk];
    if (next.stars !== undefined) u.uStarGain.value = STAR_MAX * next.stars;
    if (next.glow !== undefined) u.uGlowGain.value = GLOW_MAX * next.glow;
    if (next.spin !== undefined) u.uSpin.value = next.spin;
    if (next.saturation !== undefined) u.uSaturation.value = next.saturation;
  };
  setLook(look);

  const sky = new Mesh(new PlaneGeometry(2, 2), material);
  sky.frustumCulled = false;
  sky.renderOrder = -2;
  const camera = viewer.camera;
  sky.onBeforeRender = () => {
    u.uInverseProjection.value.copy(camera.projectionMatrixInverse);
    u.uCameraWorld.value.copy(camera.matrixWorld);
    u.uClock.value = time.exactFrame / time.fps;
  };

  // Shadow cover: a disk facing the camera, 2.9 r_s behind the center (the accretion disk's inner edge
  // starts at 3 r_s, and the whale is never that far back inside the shadow), with the radius that covers
  // the shadow's angle as seen from the camera: sin θ = (3√3/2)·(r_s/D)·√(1 − r_s/D).
  const occluder = new Mesh(new CircleGeometry(1, 64), new MeshBasicMaterial({ colorWrite: false, depthWrite: true }));
  occluder.frustumCulled = false;
  occluder.renderOrder = -1;
  const toCamera = new Vector3();
  occluder.onBeforeRender = () => {
    toCamera.copy(camera.position);
    const distance = toCamera.length();
    if (distance <= 1.05) {
      occluder.scale.setScalar(1e-6);
      return;
    }
    toCamera.divideScalar(distance);
    const sine = Math.min(0.999, WHALE_FALL.shadowRadius * (1 / distance) * Math.sqrt(1 - 1 / distance));
    const depth = distance + 2.9;
    occluder.position.copy(toCamera).multiplyScalar(-2.9);
    occluder.scale.setScalar(depth * Math.tan(Math.asin(sine)) * 0.97);
    occluder.lookAt(camera.position);
    occluder.updateMatrixWorld();
  };

  viewer.scene.add(sky, occluder);
  return {
    setLook,
    dispose() {
      viewer.scene.remove(sky, occluder);
      material.dispose();
      sky.geometry.dispose();
      occluder.geometry.dispose();
      (occluder.material as MeshBasicMaterial).dispose();
    },
  };
}
