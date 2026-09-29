import {
  BackSide,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  Mesh,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  UnsignedByteType,
  type Wrapping,
} from 'three';
import type { PackCamera } from '../../../engine/pack/format';
import type { PointSet } from '../../../engine/pack/writer';
import { WHALE_FALL, blackbody, diskShift, diskTemperature, dilationAt, type Rgb } from '../../scenes/whaleFall';
import {
  DISK_GAIN,
  DISK_SATURATION,
  SKY,
  diskIntensity,
  diskModulation,
  diskRadiance,
  makeStars,
  randomDirection,
  saturate,
  skyGlow,
} from '../../scenes/whaleFallSky';
import { environmentWriter, toSrgb8 } from '../common';
import { gaussian, stream } from '../../scenes/random';

// The "whale-fall" environment: the sphere of stars with the Milky Way and faint nebulae, the accretion
// disk (temperature, spiral-arm vortex and Doppler), the streams plunging from the inner edge, the
// photon ring and the black sphere of the horizon. The sky and the disk come from the pure functions of
// `scenes/whaleFallSky` (the same ones used by the lens on page E): here they provide the points of the
// static layer and the textures with which the source frame traces the black hole's gravitational lens.

const { inner: R_IN, outer: R_OUT } = WHALE_FALL.disk;

/** Horizon sphere in the cloud: radius (in r_s), points (at the default density) and linear color. */
const HORIZON_RADIUS = 0.97;
const HORIZON_POINTS = 14000;
const HORIZON_COLOR: Rgb = [0.0015, 0.0017, 0.0025];

/** Exposure of the source frame relative to the points (the "video" is not quantized: it is shown with less light). */
const SOURCE_EXPOSURE = 0.6;

/**
 * Saturation of the disk points: higher than the source frame's because the display quantizes them to
 * 16 colors, and a warm white at half light falls into the palette's grey. With more chroma it falls
 * into the gold, the orange or the blue of the approaching side.
 */
const POINT_SATURATION = 3;

/** Soft compression of high brightness: the hottest parts saturate toward white. */
function tone(c: Rgb): Rgb {
  return [1 - Math.exp(-c[0]), 1 - Math.exp(-c[1]), 1 - Math.exp(-c[2])];
}

// --- static layer -------------------------------------------------------------------------------------

/**
 * Environment points. `density` is points per m² of the disk; everything else scales with it.
 */
export function environmentPoints(seed: number, density: number, depthNoise: number, cameras: PackCamera[]): PointSet {
  const random = stream(seed, 'environment');
  const writer = environmentWriter(random, depthNoise, cameras);
  const P = writer.P;
  const scale = density / 1800;

  // Stars on the distant sphere.
  for (const star of makeStars(seed, Math.round(26000 * scale))) {
    P.set(star.dir[0] * SKY.starRadius, star.dir[1] * SKY.starRadius, star.dir[2] * SKY.starRadius);
    writer.push(star.color);
  }
  // Nebulae and the diffuse glow of the band: faint points where there is light.
  const glowRandom = stream(seed, 'glow');
  for (let n = 0, tries = 0; n < 16000 * scale && tries < 400000 * scale; tries++) {
    const dir = randomDirection(glowRandom);
    const glow = skyGlow(dir);
    const level = Math.max(glow[0], glow[1], glow[2]);
    if (glowRandom() > level * 26) continue;
    const r = SKY.starRadius * (1 + 0.02 * gaussian(glowRandom));
    P.set(dir[0] * r, dir[1] * r, dir[2] * r);
    const k = 1.1 / Math.max(level, 1e-4);
    writer.push([glow[0] * k * 0.085, glow[1] * k * 0.085, glow[2] * k * 0.085]);
    n++;
  }

  // Accretion disk: more points where it is brighter, thin (h/r ≈ 1 %).
  const diskRandom = stream(seed, 'disk');
  const area = Math.PI * (R_OUT ** 2 - R_IN ** 2);
  const target = Math.round(area * density);
  // Doppler baked for a canonical distant observer (the static layer does not depend on the view).
  const toObserver = SKY.observer;
  for (let n = 0; n < target; ) {
    const r = Math.sqrt(R_IN ** 2 + diskRandom() * (R_OUT ** 2 - R_IN ** 2));
    const angle = diskRandom() * 2 * Math.PI;
    const modulation = diskModulation(r, angle);
    const presence = diskIntensity(r) / diskIntensity(R_IN + 0.4);
    if (diskRandom() > (0.3 + 0.7 * modulation / 2) * Math.min(1, 0.35 + presence)) continue;
    const y = 0.011 * r * gaussian(diskRandom);
    P.set(r * Math.cos(angle), y, -r * Math.sin(angle));
    writer.push(tone(diskRadiance([P.x, P.y, P.z], toObserver, modulation, 1, POINT_SATURATION)));
    n++;
  }

  // Streams plunging from the inner edge: the vortex continues down to the horizon, redder and redder.
  const plungeRandom = stream(seed, 'plunge');
  const streams = 6;
  for (let k = 0; k < streams; k++) {
    const angle0 = (2 * Math.PI * k) / streams + 0.4 * plungeRandom();
    const count = Math.round(1700 * scale);
    for (let i = 0; i < count; i++) {
      const u = plungeRandom() ** 0.8;
      const r = R_IN - (R_IN - 1.22) * u;
      const angle = angle0 + 2.4 * u ** 1.3 + 0.05 * gaussian(plungeRandom);
      const spread = 0.02 + 0.05 * u;
      const rr = r + spread * gaussian(plungeRandom);
      P.set(rr * Math.cos(angle), 0.01 * gaussian(plungeRandom), -rr * Math.sin(angle));
      const g = diskShift([P.x, P.y, P.z], toObserver);
      const kelvin = diskTemperature(R_IN) * g * dilationAt(rr);
      // Less saturated than the disk: the hottest gas, oversaturated, would fall into the palette's cyan.
      const bb = saturate(blackbody(kelvin), DISK_SATURATION);
      const k2 = 0.9 * (1 - 0.75 * u) * g ** 3;
      writer.push(tone([bb[0] * k2, bb[1] * k2, bb[2] * k2]));
    }
  }

  // Photon ring: the orbit of light at 1.5 r_s, thin and bright.
  const ringRandom = stream(seed, 'ring');
  const ring = WHALE_FALL.photonSphere;
  for (let i = 0, count = Math.round(9000 * scale); i < count; i++) {
    const angle = ringRandom() * 2 * Math.PI;
    const r = ring + 0.006 * gaussian(ringRandom);
    P.set(r * Math.cos(angle), 0.004 * gaussian(ringRandom), -r * Math.sin(angle));
    const flicker = 0.8 + 0.4 * ringRandom();
    writer.push([1.0 * flicker, 0.82 * flicker, 0.6 * flicker]);
  }

  // Event horizon: a sphere of black points (slightly inside r_s, so it does not touch the whale) that
  // hides what lies behind it. Without it the cloud has no black hole: through the center of the vortex
  // you would see the far side of the disk and the stars. Fibonacci on the sphere: even and not random,
  // and without depth noise (a stray black point in front of the disk would be a dirty speck).
  const horizon = HORIZON_RADIUS * WHALE_FALL.rs;
  const horizonCount = Math.round(HORIZON_POINTS * scale);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < horizonCount; i++) {
    const y = 1 - (2 * (i + 0.5)) / horizonCount;
    const ring = Math.sqrt(1 - y * y);
    writer.positions.push(horizon * ring * Math.cos(golden * i), horizon * y, horizon * ring * Math.sin(golden * i));
    for (let k = 0; k < 3; k++) writer.colors.push(toSrgb8(HORIZON_COLOR[k]));
  }

  // Faint halo above and below the inner disk.
  const hazeRandom = stream(seed, 'haze');
  for (let i = 0, count = Math.round(9000 * scale); i < count; i++) {
    const r = R_IN * 0.85 + (R_OUT - R_IN) * 0.6 * hazeRandom() ** 1.5;
    const angle = hazeRandom() * 2 * Math.PI;
    const y = (hazeRandom() < 0.5 ? -1 : 1) * 0.45 * -Math.log(Math.max(1e-6, hazeRandom()));
    P.set(r * Math.cos(angle), y, -r * Math.sin(angle));
    const k = 0.12 * Math.exp(-Math.abs(y) / 0.6) * diskIntensity(Math.max(r, R_IN + 0.2));
    const bb = blackbody(diskTemperature(r) * 0.9);
    writer.push([bb[0] * k, bb[1] * k, bb[2] * k]);
  }
  return writer.result();
}

// --- lens textures and material for the source frame ------------------------------------------------------

const STAR_TEX = { width: 4096, height: 2048 };
const GLOW_TEX = { width: 1024, height: 512 };
const DISK_TEX = { width: 256, height: 1024 };
/** Maximum brightness encoded by the sky textures (√(I / max) is stored in 8 bits). */
const STAR_MAX = 1.2;
const GLOW_MAX = 0.12;

function dataTexture(data: Uint8Array, width: number, height: number, wrapS: Wrapping = ClampToEdgeWrapping, wrapT: Wrapping = ClampToEdgeWrapping): DataTexture {
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

/** Direction → equirectangular coordinates (u with the longitude around y, v with the latitude). */
function equirect(dir: ArrayLike<number>): [number, number] {
  return [Math.atan2(dir[2], dir[0]) / (2 * Math.PI) + 0.5, Math.asin(Math.max(-1, Math.min(1, dir[1]))) / Math.PI + 0.5];
}

export interface SkyTextures {
  stars: DataTexture;
  glow: DataTexture;
  disk: DataTexture;
  blackbody: DataTexture;
}

/** Sky textures for the lens: the same stars, nebulae and disk as the points. */
export function skyTextures(seed: number, density: number): SkyTextures {
  const scale = density / 1800;
  // Stars: each one is spread over the neighboring texels with a fixed angular size (~0.05°).
  const { width: SW, height: SH } = STAR_TEX;
  const acc = new Float32Array(SW * SH * 3);
  const sigma = 0.0014;
  for (const star of makeStars(seed, Math.round(26000 * scale))) {
    const [u, v] = equirect(star.dir);
    const lat = (v - 0.5) * Math.PI;
    const du = sigma / (2 * Math.PI * Math.max(0.02, Math.cos(lat)));
    const dv = sigma / Math.PI;
    const x0 = Math.floor((u - 2.5 * du) * SW);
    const x1 = Math.ceil((u + 2.5 * du) * SW);
    const y0 = Math.max(0, Math.floor((v - 2.5 * dv) * SH));
    const y1 = Math.min(SH - 1, Math.ceil((v + 2.5 * dv) * SH));
    const weights: [number, number, number][] = [];
    let total = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const w = Math.exp(-0.5 * ((((x + 0.5) / SW - u) / du) ** 2 + (((y + 0.5) / SH - v) / dv) ** 2));
        weights.push([((x % SW) + SW) % SW, y, w]);
        total += w;
      }
    }
    // Flux is conserved: a small star adds the same as a large one.
    const peak = 1 / Math.max(total, 1e-6);
    for (const [x, y, w] of weights) {
      const o = (y * SW + x) * 3;
      for (let k = 0; k < 3; k++) acc[o + k] += star.color[k] * w * peak * 3;
    }
  }
  const starData = new Uint8Array(SW * SH * 4);
  for (let i = 0; i < SW * SH; i++) {
    for (let k = 0; k < 3; k++) starData[i * 4 + k] = Math.round(255 * Math.sqrt(Math.min(1, acc[i * 3 + k] / STAR_MAX)));
    starData[i * 4 + 3] = 255;
  }

  // Diffuse glow: nebulae and the galactic band.
  const { width: GW, height: GH } = GLOW_TEX;
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

  // Disk in polar coordinates: u radial (from R_IN to R_OUT), v angular (θ / 2π).
  const { width: DW, height: DH } = DISK_TEX;
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

  // Blackbody on a logarithmic scale from 1000 K to 40 000 K.
  const bbData = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const kelvin = Math.exp(Math.log(1000) + (i / 255) * (Math.log(40000) - Math.log(1000)));
    const c = blackbody(kelvin);
    for (let k = 0; k < 3; k++) bbData[i * 4 + k] = Math.round(255 * c[k]);
    bbData[i * 4 + 3] = 255;
  }
  return {
    stars: dataTexture(starData, SW, SH, RepeatWrapping),
    glow: dataTexture(glowData, GW, GH, RepeatWrapping),
    disk: dataTexture(diskData, DW, DH, ClampToEdgeWrapping, RepeatWrapping),
    blackbody: dataTexture(bbData, 256, 1),
  };
}

const LENS_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

// Ray tracing through Schwarzschild space (r_s = 1): a photon's orbit satisfies
// d²x/dλ² = −(3/2)·h²·x/r⁵ with h = |x × v|. Each crossing of the disk plane adds its light (with Doppler
// and gravitational shift), rays that fall inside r_s stay black and those that escape read the sky
// where they meet the sphere of stars.
const LENS_FRAG = /* glsl */ `
uniform sampler2D tStars;
uniform sampler2D tGlow;
uniform sampler2D tDisk;
uniform sampler2D tBlackbody;
uniform float uStarRadius;
uniform vec2 uDisk;
uniform float uStarMax;
uniform float uGlowMax;
uniform vec3 uKelvin; // inner-edge temperature, falloff with r, disk brightness
varying vec3 vWorld;

const float PI = 3.141592653589793;

uniform float uSaturation;

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

vec3 sky(vec3 dir) {
  vec2 uv = vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5);
  vec3 s = texture2D(tStars, uv).rgb;
  vec3 g = texture2D(tGlow, uv).rgb;
  return s * s * uStarMax + g * g * uGlowMax;
}

vec3 acceleration(vec3 p, float h2) {
  float r2 = dot(p, p);
  return -1.5 * h2 * p / (r2 * r2 * sqrt(r2));
}

void main() {
  vec3 pos = cameraPosition;
  vec3 dir = normalize(vWorld - cameraPosition);
  vec3 L = cross(pos, dir);
  float h2 = dot(L, L);
  float escape = max(length(cameraPosition), uDisk.y) + 3.0;
  vec3 color = vec3(0.0);
  float trans = 1.0;
  bool captured = false;
  for (int i = 0; i < 700; i++) {
    float r = length(pos);
    if (r < 1.0) { captured = true; break; }
    if (r > escape && dot(pos, dir) > 0.0) break;
    float dt = clamp(0.035 + 0.07 * (r - 1.0), 0.02, 0.9);
    // RK4 on (position, direction).
    vec3 k1v = acceleration(pos, h2);
    vec3 k1x = dir;
    vec3 k2v = acceleration(pos + 0.5 * dt * k1x, h2);
    vec3 k2x = dir + 0.5 * dt * k1v;
    vec3 k3v = acceleration(pos + 0.5 * dt * k2x, h2);
    vec3 k3x = dir + 0.5 * dt * k2v;
    vec3 k4v = acceleration(pos + dt * k3x, h2);
    vec3 k4x = dir + dt * k3v;
    vec3 next = pos + dt / 6.0 * (k1x + 2.0 * k2x + 2.0 * k3x + k4x);
    vec3 nextDir = dir + dt / 6.0 * (k1v + 2.0 * k2v + 2.0 * k3v + k4v);

    // Crossing of the disk plane.
    if (pos.y * next.y <= 0.0 && pos.y != next.y) {
      vec3 hit = mix(pos, next, pos.y / (pos.y - next.y));
      float rho = length(hit.xz);
      if (rho > uDisk.x - 0.05 && rho < uDisk.y) {
        float angle = atan(-hit.z, hit.x);
        if (angle < 0.0) angle += 2.0 * PI;
        float modulation = texture2D(tDisk, vec2((rho - uDisk.x) / (uDisk.y - uDisk.x), angle / (2.0 * PI))).r * 2.0;
        // Doppler of the gas in a counterclockwise orbit, and gravitational shift.
        float beta = min(0.6, sqrt(0.5 / max(rho - 1.0, 1e-3)));
        vec3 tangent = vec3(hit.z, 0.0, -hit.x) / rho;
        float cosA = dot(tangent, -normalize(nextDir));
        float g = sqrt(max(0.0, 1.0 - 1.0 / rho)) * sqrt(1.0 - beta * beta) / (1.0 - beta * cosA);
        float intensity = diskIntensity(rho) * modulation * g * g * g;
        vec3 emitted = blackbodyRgb(diskTemperature(rho) * g) * intensity;
        float opacity = clamp(0.25 + 0.5 * modulation, 0.0, 0.95) * smoothstep(uDisk.x - 0.05, uDisk.x + 0.25, rho);
        color += trans * emitted;
        trans *= 1.0 - opacity;
      }
    }
    // Halo: a thin glow hugging the disk plane.
    float rhoNow = length(next.xz);
    if (rhoNow > uDisk.x * 0.9 && rhoNow < uDisk.y) {
      float haze = exp(-abs(next.y) / 0.14) * diskIntensity(max(rhoNow, uDisk.x + 0.2));
      color += trans * blackbodyRgb(diskTemperature(rhoNow) * 0.85) * haze * 0.05 * dt;
    }
    pos = next;
    dir = nextDir;
    if (trans < 0.01) break;
  }
  if (!captured && trans > 0.01) {
    // A straight line out to the sphere of stars.
    vec3 d = normalize(dir);
    float b = dot(pos, d);
    float c = dot(pos, pos) - uStarRadius * uStarRadius;
    float t = -b + sqrt(max(0.0, b * b - c));
    color += trans * sky(normalize(pos + d * t));
  }
  // Soft compression of the brightest parts (as in the points).
  gl_FragColor = vec4(1.0 - exp(-color), 1.0);
  #include <colorspace_fragment>
}`;

/** Source-frame sky sphere with the black hole's lens; it is drawn first, behind everything. */
export function lensSky(textures: SkyTextures): Mesh {
  const material = new ShaderMaterial({
    vertexShader: LENS_VERT,
    fragmentShader: LENS_FRAG,
    uniforms: {
      tStars: { value: textures.stars },
      tGlow: { value: textures.glow },
      tDisk: { value: textures.disk },
      tBlackbody: { value: textures.blackbody },
      uStarRadius: { value: SKY.starRadius },
      uDisk: { value: [R_IN, R_OUT] },
      uKelvin: { value: [WHALE_FALL.disk.kelvin, WHALE_FALL.disk.falloff, DISK_GAIN * SOURCE_EXPOSURE] },
      uSaturation: { value: DISK_SATURATION },
      uStarMax: { value: STAR_MAX },
      uGlowMax: { value: GLOW_MAX },
    },
    side: BackSide,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(new SphereGeometry(300, 48, 24), material);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}
