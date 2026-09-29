import { normalize, smoothstep } from './math';
import { stream, type Random } from './random';
import { WHALE_FALL, blackbody, diskArmPhase, diskShift, diskTemperature, type Rgb, type Vec3 } from './whaleFall';

// The "whale-fall" sky as pure functions, no three and no DOM: the star sphere with the Milky Way, the
// faint nebulae and the glow of the accretion disk (temperature, vortex arms and Doppler). Both the bake
// recipe (the points of the static layer and the lensing textures of the source frame) and the lensing
// of page E use them, so the two see the same sky.

export const SKY = {
  /** Radius of the star sphere (m): within 40 m of the source camera (the reach of the frustum light). */
  starRadius: 26,
  /** Pole of the Milky Way (normal of the galactic plane), tilted relative to the disk. */
  galaxyPole: normalize([0.42, 0.55, 0.72]),
  /** Canonical observer for the Doppler shift baked into the disk points (direction from the hole). */
  observer: normalize([0.78, 0.38, 0.5]),
} as const;

const { inner: R_IN, outer: R_OUT } = WHALE_FALL.disk;

// --- deterministic noise -------------------------------------------------------------------------------

function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 3D value noise; `period` (in cells) makes the y axis periodic. */
function noise3(x: number, y: number, z: number, period = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const wrap = (j: number) => (period ? ((j % period) + period) % period : j);
  const h = (i: number, j: number, k: number) => hash3(xi + i, wrap(yi + j), zi + k);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), ux), lerp(h(0, 1, 0), h(1, 1, 0), ux), uy),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), ux), lerp(h(0, 1, 1), h(1, 1, 1), ux), uy),
    uz,
  );
}

function fbm3(x: number, y: number, z: number, octaves = 4, period = 0): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const k = 2 ** o;
    sum += amp * noise3(x * k, y * k, z * k + o * 17.3, period ? period * k : 0);
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

// --- accretion disk ------------------------------------------------------------------------------------

/**
 * Brightness modulation of the disk at (r, θ): logarithmic vortex arms, turbulent streaks dragged
 * along the arms, and thin rings. Periodic in θ. Typical value 1 (0.1–2).
 */
export function diskModulation(r: number, angle: number): number {
  const arm = 0.5 + 0.5 * Math.cos(diskArmPhase(r, angle));
  // Streaks: noise in coordinates sheared along the arm (u radial in log r, v along the arm).
  const lr = Math.log(r / R_IN);
  const along = (angle + lr / Math.tan(0.28)) / (2 * Math.PI);
  const streak = fbm3(lr * 7, along * 24, 0.5, 4, 24);
  const fine = fbm3(lr * 26, along * 96, 3.5, 2, 96);
  const rings = 0.82 + 0.18 * Math.sin(40 * lr + 5 * streak);
  const m = (0.34 + 0.95 * arm ** 1.7 + 0.9 * (streak - 0.5) + 0.35 * (fine - 0.5)) * rings;
  return Math.min(2, Math.max(0.06, m));
}

/** Disk brightness at the inner edge (linear), before the modulation and the Doppler shift. */
export const DISK_GAIN = 2.0;

/** Brightness emitted by the disk at distance r, before the Doppler shift (linear). */
export function diskIntensity(r: number): number {
  const heat = diskTemperature(r) / diskTemperature(R_IN);
  return DISK_GAIN * heat ** 0.65 * smoothstep(R_IN - 0.05, R_IN + 0.3, r) * (1 - smoothstep(R_OUT - 1.8, R_OUT, r));
}

/**
 * Color (linear) of the disk at `point` seen from the direction `toObserver`, with its modulation. By
 * default a distant observer is looking; `receiver` is the factor √(1 − r_s/r) of whoever receives the
 * light closer to the hole (the whale): light falling into the well arrives blueshifted.
 */
export function diskRadiance(point: ArrayLike<number>, toObserver: ArrayLike<number>, modulation: number, receiver = 1, saturation = DISK_SATURATION): Rgb {
  const rho = Math.hypot(point[0], point[2]);
  const g = diskShift(point, toObserver) / receiver;
  const color = saturate(blackbody(diskTemperature(rho) * g), saturation);
  const k = diskIntensity(rho) * modulation * g ** 3;
  return [color[0] * k, color[1] * k, color[2] * k];
}

/** Extra saturation of the disk's black-body color (so the orange does not turn muddy brown). */
export const DISK_SATURATION = 1.6;

export function saturate(c: Rgb, amount: number): Rgb {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return [Math.max(0, l + (c[0] - l) * amount), Math.max(0, l + (c[1] - l) * amount), Math.max(0, l + (c[2] - l) * amount)];
}

// --- stars and nebulae ---------------------------------------------------------------------------------

export interface Star {
  dir: Vec3;
  /** Linear color (brightness included). */
  color: Rgb;
}

/** Galactic latitude (rad) of a direction. */
function galacticLatitude(dir: ArrayLike<number>): number {
  return Math.asin(Math.max(-1, Math.min(1, dot(dir, SKY.galaxyPole))));
}

/** Milky Way dust: dark lanes that cut across the band (0 = dark, 1 = clear). */
function galacticDust(dir: ArrayLike<number>): number {
  const n = fbm3(dir[0] * 5 + 11, dir[1] * 5, dir[2] * 5, 4);
  const lane = Math.exp(-((galacticLatitude(dir) - 0.03 - 0.06 * (n - 0.5)) ** 2) / (2 * 0.028 ** 2));
  return 1 - 0.85 * lane * smoothstep(0.35, 0.65, n);
}

/** Sky stars: a uniform field plus the Milky Way, with black-body color. */
export function makeStars(seed: number, count: number): Star[] {
  const random = stream(seed, 'stars');
  const stars: Star[] = [];
  const field = Math.round(count * 0.55);
  while (stars.length < count) {
    let dir: Vec3;
    if (stars.length < field) dir = randomDirection(random);
    else {
      // Galactic band: Gaussian latitude around the plane, denser toward a core.
      dir = randomDirection(random);
      const lat = galacticLatitude(dir);
      const core = 0.5 + 0.5 * Math.max(0, dot(dir, normalize([-0.6, -0.1, 0.8])));
      if (random() > Math.exp(-(lat ** 2) / (2 * 0.12 ** 2)) * (0.45 + 0.55 * core) * galacticDust(dir)) continue;
    }
    const u = random();
    const brightness = 0.012 + 0.9 * u ** 9 + 0.05 * u ** 2;
    const kelvin = 2600 + 11000 * random() ** 2.2;
    const tint = blackbody(kelvin);
    const w = 0.55;
    stars.push({
      dir,
      color: [brightness * (1 - w + w * tint[0]), brightness * (1 - w + w * tint[1]), brightness * (1 - w + w * tint[2])],
    });
  }
  return stars;
}

const NEBULAE: { center: Vec3; radius: number; color: Rgb; scale: number }[] = [
  { center: normalize([-0.55, 0.1, 0.83]), radius: 0.34, color: [0.5, 0.07, 0.22], scale: 3.2 },
  { center: normalize([0.25, -0.2, -0.95]), radius: 0.4, color: [0.05, 0.3, 0.36], scale: 2.6 },
  { center: normalize([-0.85, 0.35, -0.4]), radius: 0.3, color: [0.2, 0.12, 0.45], scale: 3.8 },
];

/** Diffuse sky light in a direction (linear): nebulae and the unresolved glow of the Milky Way. */
export function skyGlow(dir: ArrayLike<number>): Rgb {
  const out: Rgb = [0, 0, 0];
  for (const nebula of NEBULAE) {
    const cos = dot(dir, nebula.center);
    if (cos < 0.5) continue;
    const angle = Math.acos(Math.min(1, cos));
    const falloff = Math.exp(-((angle / nebula.radius) ** 2) * 2.2);
    const n = fbm3(dir[0] * nebula.scale + 40, dir[1] * nebula.scale, dir[2] * nebula.scale, 5);
    const density = falloff * smoothstep(0.42, 0.78, n) * 0.11;
    for (let k = 0; k < 3; k++) out[k] += nebula.color[k] * density;
  }
  const lat = galacticLatitude(dir);
  const band = Math.exp(-(lat ** 2) / (2 * 0.09 ** 2)) * galacticDust(dir) * (0.6 + 0.4 * fbm3(dir[0] * 7, dir[1] * 7, dir[2] * 7 + 5, 3));
  out[0] += 0.012 * band;
  out[1] += 0.011 * band;
  out[2] += 0.013 * band;
  return out;
}

// --- vectors and directions ---------------------------------------------------------------------------

export function randomDirection(random: Random): Vec3 {
  const z = 2 * random() - 1;
  const a = 2 * Math.PI * random();
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(a), z, s * Math.sin(a)];
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
