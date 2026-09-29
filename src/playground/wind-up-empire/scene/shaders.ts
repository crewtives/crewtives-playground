// Orrery shaders. Everything is flat-shaded (face normal from derivatives) with a single window
// light from the upper left; colors arrive in linear space and the RetroDisplay quantizes them to
// the page's 16 inks.

/** Shared flat lighting: 0.35 ambient plus 0.65 diffuse from one directional light (in view space). */
const FLAT = /* glsl */ `
uniform vec3 uLight;
varying vec3 vView;
float flatShade() {
  vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
  return 0.35 + 0.65 * max(dot(n, uLight), 0.0);
}
`;

/** 8×8 Bayer threshold in [0, 1): the same index as the display (the lithographer's dither). */
const BAYER = /* glsl */ `
float bayer8(vec2 fc) {
  ivec2 p = ivec2(floor(fc));
  int x = p.x & 7;
  int y = p.y & 7;
  int xy = x ^ y;
  int v = ((xy & 1) << 5) | ((y & 1) << 4) | ((xy & 2) << 2) | ((y & 2) << 1) | ((xy & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}
`;

const VIEW_POS = /* glsl */ `
varying vec3 vView;
vec4 placeLocal(vec3 p) {
  vec4 local = vec4(p, 1.0);
  #ifdef USE_INSTANCING
  local = instanceMatrix * local;
  #endif
  return local;
}
`;

// --- Lit material with per-vertex color (rocket, plain tops, cradle) ---

export const litVert = /* glsl */ `
${VIEW_POS}
attribute vec3 color;
varying vec3 vColor;
void main() {
  vColor = color;
  vec4 view = modelViewMatrix * placeLocal(position);
  vView = view.xyz;
  gl_Position = projectionMatrix * view;
}
`;

export const litFrag = /* glsl */ `
${FLAT}
${BAYER}
uniform vec3 uTint;
uniform float uTintMix;
uniform float uFade;
varying vec3 vColor;
void main() {
  if (bayer8(gl_FragCoord.xy) > uFade) discard;
  vec3 base = mix(vColor, uTint, uTintMix);
  gl_FragColor = vec4(base * flatShade(), 1.0);
}
`;

// --- The Whirl: a low top printed with a golden logarithmic spiral ---

export const whirlVert = /* glsl */ `
${VIEW_POS}
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vView = view.xyz;
  gl_Position = projectionMatrix * view;
}
`;

export const whirlFrag = /* glsl */ `
${FLAT}
uniform float uArms;
uniform vec3 uBandA;
uniform vec3 uBandB;
uniform vec3 uRim;
varying vec3 vLocal;
const float A = 0.45;
const float B = 0.30634896;
const float TAU = 6.28318530718;
void main() {
  float r = length(vLocal.xz);
  vec3 color = uRim;
  if (vLocal.y > 0.035 && r < 0.8) {
    float th = atan(vLocal.z, vLocal.x);
    float band = floor(uArms * (th - log(max(r, 1e-3) / A) / B) / TAU);
    color = mod(band, 2.0) < 0.5 ? uBandA : uBandB;
  }
  gl_FragColor = vec4(color * flatShade(), 1.0);
}
`;

// --- Accretion ring: orange on the approaching side, lemon on the far side ---

export const ringVert = /* glsl */ `
${VIEW_POS}
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vView = view.xyz;
  gl_Position = projectionMatrix * view;
}
`;

export const ringFrag = /* glsl */ `
${FLAT}
uniform vec3 uNear;
uniform vec3 uFar;
uniform vec2 uCamDir;
varying vec3 vWorld;
void main() {
  float c = dot(normalize(vWorld.xz), uCamDir);
  vec3 color = c > -0.15 ? uNear : uFar;
  gl_FragColor = vec4(color * flatShade(), 1.0);
}
`;

// --- Planet tops: phyllotaxis dots and n-fold bands, with a shutter that averages the spin ---

export const topVert = /* glsl */ `
${VIEW_POS}
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vView = view.xyz;
  gl_Position = projectionMatrix * view;
}
`;

export const topFrag = /* glsl */ `
${FLAT}
uniform vec3 uBase;
uniform vec3 uBand;
uniform vec3 uDot;
uniform vec3 uSpindle;
uniform float uFold;
uniform float uSmear;
uniform float uPrinted;
varying vec3 vLocal;
const float GOLDEN = 2.39996323;

vec3 printAt(float phi, float rho, float y) {
  // N-fold bands around the shoulder.
  if (rho > 0.72 && cos(uFold * phi) > 0.6) return uBand;
  // Phyllotaxis dots on the top face.
  if (y > -0.05) {
    vec2 q = vec2(cos(phi), sin(phi)) * rho;
    for (int k = 1; k <= 34; k++) {
      float fk = float(k);
      float a = fk * GOLDEN;
      vec2 c = vec2(cos(a), sin(a)) * 0.14 * sqrt(fk);
      if (distance(q, c) < 0.075) return uDot;
    }
  }
  return uBase;
}

void main() {
  float rho = length(vLocal.xz);
  vec3 color;
  if (vLocal.y > 0.3 && rho < 0.2) {
    color = uSpindle;
  } else if (uPrinted < 0.5) {
    color = uBase;
  } else {
    // Shutter: 8 samples along one frame's sweep; slow = dots, fast = rings.
    float phi = atan(vLocal.z, vLocal.x);
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      acc += printAt(phi - uSmear * float(i) / 7.0, rho, vLocal.y);
    }
    color = acc / 8.0;
  }
  gl_FragColor = vec4(color * flatShade(), 1.0);
}
`;

// --- Lithographic stars: five-pointed fans facing the camera, lensed by the Whirl ---

export const starVert = /* glsl */ `
attribute vec3 aCenter;
attribute vec3 aStar;
varying vec3 vView;
varying float vTwinkle;
varying float vHue;
uniform float uTime;
uniform float uLensR;
uniform float uThetaE;
void main() {
  vec4 center = viewMatrix * vec4(aCenter, 1.0);
  vec4 whirl = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // Gravitational lens: project onto the Whirl's plane, shift by r' = r + θE²/r and project back.
  vec2 q = center.xy * (whirl.z / center.z) - whirl.xy;
  float r = length(q);
  if (r < uLensR && r > 1e-3) {
    q *= (r + uThetaE * uThetaE / r) / r;
    center.xy = (q + whirl.xy) * (center.z / whirl.z);
  }
  vec4 view = center + vec4(position.xy * aStar.x, 0.0, 0.0);
  vView = view.xyz;
  // Twinkle: one color step every 2.4 to 6 s (never a flash).
  float period = 2.4 + 3.6 * fract(aStar.y * 7.31);
  vTwinkle = step(0.86, fract(uTime / period + aStar.y));
  vHue = aStar.z;
  gl_Position = projectionMatrix * view;
}
`;

export const starFrag = /* glsl */ `
uniform vec3 uChrome;
uniform vec3 uLemon;
uniform vec3 uSky;
uniform vec3 uBright;
varying vec3 vView;
varying float vTwinkle;
varying float vHue;
void main() {
  vec3 base = vHue < 0.62 ? uChrome : (vHue < 0.85 ? uSky : uBright);
  gl_FragColor = vec4(mix(base, uLemon, vTwinkle), 1.0);
}
`;

// --- Lines: solid (done), dashed (queued) or dotted (locked) ---

export const lineVert = /* glsl */ `
attribute float aDist;
varying float vDist;
void main() {
  vDist = aDist;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lineFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uDash;
uniform float uGap;
varying float vDist;
void main() {
  if (uGap > 0.0 && mod(vDist, uDash + uGap) > uDash) discard;
  gl_FragColor = vec4(uColor, 1.0);
}
`;

// --- Exposures: stamped copies that age by dither density, not by transparency ---

export const exposureVert = /* glsl */ `
${VIEW_POS}
attribute vec3 color;
attribute float aBirth;
attribute float aStretch;
varying vec3 vColor;
varying float vAge;
varying float vNewest;
uniform float uNow;
uniform float uMemory;
void main() {
  vColor = color;
  vec4 world = modelMatrix * placeLocal(position);
  // Radial stretch (a swallowed rocket stretches toward the Whirl).
  #ifdef USE_INSTANCING
  vec2 c = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
  if (aStretch > 1.0 && length(c) > 1e-3) {
    vec2 dir = normalize(c);
    float along = dot(world.xz - c, dir);
    world.xz += dir * along * (aStretch - 1.0);
  }
  #endif
  float age = (uNow - aBirth) / uMemory;
  vAge = 1.0 - age;
  // The newest stamp stays on top: each copy at its own height, with no depth fighting.
  world.y += (aBirth - uNow) * 0.004;
  vNewest = step(uNow - aBirth, 1.0 / 12.0 + 1e-4) * step(0.0, uNow - aBirth + 1e-4);
  vec4 view = viewMatrix * world;
  vView = view.xyz;
  gl_Position = age < 0.0 || age > 1.0 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * view;
}
`;

export const exposureFrag = /* glsl */ `
${FLAT}
${BAYER}
uniform vec3 uNewest;
uniform float uFreeze;
varying vec3 vColor;
varying float vAge;
varying float vNewest;
void main() {
  if (bayer8(gl_FragCoord.xy) > pow(clamp(vAge, 0.0, 1.0), 0.7)) discard;
  vec3 color = vNewest > 0.5 && uFreeze < 0.5 ? uNewest : vColor;
  gl_FragColor = vec4(color * flatShade(), 1.0);
}
`;

// --- Planet exposures: their recent past on their own ring ---

export const pastVert = /* glsl */ `
attribute float aPlanet;
attribute float aK;
uniform float uAngles[5];
uniform float uRadii[5];
uniform float uSizes[5];
uniform float uStep;
varying float vAge;
varying float vPlanet;
varying vec3 vView;
void main() {
  int i = int(aPlanet + 0.5);
  float angle = uAngles[i];
  // Stamp k stays fixed where the planet was k steps ago (it does not slide).
  float stamped = floor(angle / uStep) * uStep;
  float a = stamped - aK * uStep;
  vAge = 1.0 - (angle - a) / (24.0 * uStep);
  vPlanet = aPlanet;
  vec3 p = vec3(position.x * uSizes[i], 0.004, position.z * uSizes[i]);
  vec3 world = vec3(uRadii[i] * cos(a), 0.0, -uRadii[i] * sin(a)) + p;
  vec4 view = viewMatrix * vec4(world, 1.0);
  vView = view.xyz;
  gl_Position = projectionMatrix * view;
}
`;

export const pastFrag = /* glsl */ `
${BAYER}
uniform vec3 uColors[5];
varying float vAge;
varying float vPlanet;
varying vec3 vView;
void main() {
  if (bayer8(gl_FragCoord.xy) > pow(clamp(vAge, 0.0, 1.0), 0.7) * 0.85) discard;
  int i = int(vPlanet + 0.5);
  gl_FragColor = vec4(uColors[i] * 0.92, 1.0);
}
`;

// --- Friction sparks: square points, lemon turning orange ---

export const sparkVert = /* glsl */ `
attribute float aLife;
varying float vLife;
uniform float uSize;
void main() {
  vLife = aLife;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aLife > 0.0 ? uSize : 0.0;
  gl_Position = aLife > 0.0 ? projectionMatrix * view : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

export const sparkFrag = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uCool;
varying float vLife;
void main() {
  gl_FragColor = vec4(vLife > 0.5 ? uHot : uCool, 1.0);
}
`;
