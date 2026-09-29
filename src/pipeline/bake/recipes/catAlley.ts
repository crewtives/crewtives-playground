import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import type { PackCamera } from '../../../engine/pack/format';
import { handheld, valueNoise, type BakeParams, type Rgb } from '../common';
import { smoothstep } from '../../scenes/math';
import { stream } from '../../scenes/random';
import { CatRecipe, brick, cardboard, dumpster, interpolateKeys, stone, windowAt, type Lighting, type WindowSpec } from './catBase';
import { LAYOUT, SURFACES, motionAt, motionFocus, type MotionState } from './catMotion';

// The "cat-alley" recipe: a black cat crosses an alley at night, jumps onto a dumpster and onto the
// back wall, and sits facing the camera. "Cat" model by J-Toastie (CC-BY 3.0), animated
// procedurally. The light is baked with a single function for both the "video" and the points.

const ALLEY = { x: [-2, 2] as const, z: [-12, 6] as const, leftHeight: 6.0, rightHeight: 6.5 };

const LAMP = new Vector3(-1.35, 4.15, 1.5);
const SODIUM: Rgb = [1.0, 0.52, 0.18];
const WINDOW_GLOW: Rgb = [1.0, 0.6, 0.26];

const LIGHTING: Lighting = {
  lamps: [{ position: LAMP, color: SODIUM, power: 1.7, radius: 2.0, sheen: 0.38 }],
  moonDirection: new Vector3(0.35, 0.9, 0.25).normalize(),
  moon: [0.055, 0.075, 0.13],
  ambient: [0.018, 0.022, 0.038],
  rim: [0.1, 0.12, 0.17],
  sky: new Color().setRGB(0.012, 0.015, 0.03),
};

export const CAT_DEFAULTS: BakeParams = {
  name: 'cat-alley',
  fps: 15,
  duration: 20,
  pointsPerFrame: 5000,
  envDensity: 700,
  sourceWidth: 320,
  seed: 1,
  depthNoise: 0.45,
};

export class CatAlley extends CatRecipe {
  readonly id = 'cat-alley';
  readonly title = 'Black cat in an alley at night ("Cat" by J-Toastie, CC-BY 3.0)';
  readonly defaults = CAT_DEFAULTS;
  readonly generatorName = '4d-os /bake · cat-alley';
  readonly pointSize = { static: 0.045, dynamic: 0.012 };
  protected readonly lighting = LIGHTING;
  protected readonly motionDuration = 20;
  protected readonly floaterBox = {
    min: [ALLEY.x[0] + 0.2, 0.3, ALLEY.z[0]] as [number, number, number],
    max: [ALLEY.x[1] - 0.2, 4.5, LAYOUT.wall.z[0]] as [number, number, number],
  };

  protected motion(t: number): MotionState {
    return motionAt(t);
  }

  protected build(): void {
    const random = stream(this.params.seed, 'alley');
    const S = this.surfaces;

    // Ground: wet asphalt with puddles.
    const puddle = (x: number, z: number) => smoothstep(0.66, 0.74, valueNoise(x * 0.9 + 3.3, z * 0.9 - 1.2) * 0.75 + valueNoise(x * 3.1, z * 3.1) * 0.25);
    S.push({
      origin: new Vector3(ALLEY.x[0], 0, ALLEY.z[1]),
      u: new Vector3(1, 0, 0),
      v: new Vector3(0, 0, -1),
      width: ALLEY.x[1] - ALLEY.x[0],
      height: ALLEY.z[1] - ALLEY.z[0],
      normal: new Vector3(0, 1, 0),
      albedo: (s, t) => {
        const x = ALLEY.x[0] + s;
        const z = ALLEY.z[1] - t;
        const grain = 0.8 + 0.4 * valueNoise(x * 6.1, z * 6.1);
        const patch = 0.75 + 0.35 * valueNoise(x * 0.6 + 7, z * 0.6);
        const g = 0.07 * grain * patch * (1 - 0.45 * puddle(x, z));
        return [g, g, g * 1.08];
      },
      wet: (s, t) => puddle(ALLEY.x[0] + s, ALLEY.z[1] - t),
      texture: 40,
    });

    // Brick walls with windows; some lit in a warm tone.
    const makeWindows = (length: number, floors: number[]) => {
      const out: WindowSpec[] = [];
      for (let s = 1.2; s < length - 1.6; s += 2.6 + random() * 0.8) {
        for (const t of floors) {
          if (random() < 0.18) continue;
          out.push({ s, t, w: 0.95, h: 1.25, lit: random() < 0.35, warmth: 0.6 + random() * 0.5 });
        }
      }
      return out;
    };
    const wall = (x: number, height: number, inward: number, seed: number) => {
      const length = ALLEY.z[1] - ALLEY.z[0];
      const windows = makeWindows(length, [2.25, 4.35]);
      S.push({
        origin: new Vector3(x, 0, inward > 0 ? ALLEY.z[1] : ALLEY.z[0]),
        u: new Vector3(0, 0, inward > 0 ? -1 : 1),
        v: new Vector3(0, 1, 0),
        width: length,
        height,
        normal: new Vector3(inward, 0, 0),
        albedo: (s, t) => {
          const hit = windowAt(windows, s, t);
          if (!hit) return brick(s, t, seed);
          if (hit.frame) return [0.03, 0.028, 0.026];
          return hit.window.lit ? [0.05, 0.035, 0.02] : [0.012, 0.016, 0.024];
        },
        emissive: (s, t) => {
          const hit = windowAt(windows, s, t);
          if (!hit || hit.frame) return null;
          if (hit.window.lit) {
            const k = 0.75 * hit.window.warmth * (0.85 + 0.15 * valueNoise(s * 4, t * 4));
            return [WINDOW_GLOW[0] * k, WINDOW_GLOW[1] * k, WINDOW_GLOW[2] * k];
          }
          // Dark glass with a cold glint of the moon.
          const glint = 0.03 * smoothstep(0.5, 1, valueNoise(s * 2, t * 2));
          return [glint * 0.6, glint * 0.8, glint];
        },
        texture: 40,
      });
    };
    wall(ALLEY.x[0], ALLEY.leftHeight, 1, 1);
    wall(ALLEY.x[1], ALLEY.rightHeight, -1, 2);

    // Back wall (1.8 m) with a stone coping.
    const tapia = { min: new Vector3(ALLEY.x[0], 0, LAYOUT.wall.z[0]), max: new Vector3(ALLEY.x[1], SURFACES.wall, LAYOUT.wall.z[1]) };
    this.box(tapia.min, tapia.max, (face, s, t) => (face === 'top' ? stone(s, t) : brick(s, t, 3, 0.9)), { texture: 40, skipBottom: true });

    // Distant building behind the back wall: it gives the alley a background.
    const farWindows: WindowSpec[] = [];
    for (let s = 0.8; s < 20; s += 1.6) for (const t of [1.2, 3.4, 5.6, 7.8]) if (random() < 0.8) farWindows.push({ s, t, w: 0.8, h: 1.1, lit: random() < 0.25, warmth: 0.5 + random() * 0.4 });
    S.push({
      origin: new Vector3(-10, 0, 12),
      u: new Vector3(1, 0, 0),
      v: new Vector3(0, 1, 0),
      width: 20,
      height: 10,
      normal: new Vector3(0, 0, -1),
      albedo: (s, t) => {
        const hit = windowAt(farWindows, s, t);
        if (!hit) return brick(s, t, 4, 0.7);
        return hit.frame ? [0.03, 0.03, 0.03] : [0.01, 0.012, 0.02];
      },
      emissive: (s, t) => {
        const hit = windowAt(farWindows, s, t);
        if (!hit || hit.frame || !hit.window.lit) return null;
        const k = 0.6 * hit.window.warmth;
        return [WINDOW_GLOW[0] * k, WINDOW_GLOW[1] * k, WINDOW_GLOW[2] * k];
      },
      density: 0.35,
      texture: 24,
    });

    // Dumpsters: the one the cat jumps on, against the right wall, and a blue one on the left.
    const lid = LAYOUT.lid;
    this.box(new Vector3(lid.x[0], 0.12, lid.z[0]), new Vector3(lid.x[1], SURFACES.lid, lid.z[1]), (face, s, t) => dumpster(face, s, t, [0.035, 0.11, 0.06]), { texture: 40 });
    this.box(new Vector3(-1.95, 0.12, -3.6), new Vector3(-0.95, 1.1, -1.8), (face, s, t) => dumpster(face, s, t, [0.04, 0.07, 0.13]), { texture: 40 });
    // Wheels / base of the dumpsters.
    for (const [x0, x1, z0, z1] of [[lid.x[0] + 0.05, lid.x[1] - 0.05, lid.z[0] + 0.05, lid.z[1] - 0.05], [-1.9, -1.0, -3.55, -1.85]]) {
      this.box(new Vector3(x0, 0, z0), new Vector3(x1, 0.12, z1), () => [0.015, 0.015, 0.017], { skipBottom: true });
    }
    // Cardboard boxes stacked next to the blue dumpster.
    for (const [x, y, z, sx, sy, sz] of [
      [-1.9, 0, -1.6, 0.55, 0.45, 0.5],
      [-1.85, 0.45, -1.55, 0.45, 0.4, 0.42],
      [-1.35, 0, -1.5, 0.4, 0.35, 0.45],
    ]) {
      this.box(new Vector3(x, y, z), new Vector3(x + sx, y + sy, z + sz), (_f, s, t) => cardboard(s, t), { texture: 40, skipBottom: true });
    }

    // Fire escape on the left wall: grating platforms, railings and a flight of steps.
    const iron = (): Rgb => [0.03, 0.03, 0.034];
    for (const y of [3.2, 5.4]) {
      for (let z = -5; z <= -1; z += 0.12) this.box(new Vector3(-2, y - 0.02, z), new Vector3(-1.1, y, z + 0.03), iron);
      this.box(new Vector3(-1.13, y, -5), new Vector3(-1.1, y + 0.95, -1), iron); // front of the railing (low panel)
      for (let z = -5; z <= -1; z += 0.35) this.box(new Vector3(-1.14, y, z), new Vector3(-1.1, y + 1.0, z + 0.03), iron);
      this.box(new Vector3(-1.16, y + 0.98, -5), new Vector3(-1.1, y + 1.02, -1), iron);
    }
    for (let i = 0; i < 14; i++) {
      const k = i / 13;
      const z = -4.7 + k * 3.2;
      const y = 3.2 + k * 2.2;
      this.box(new Vector3(-1.95, y - 0.02, z), new Vector3(-1.2, y + 0.02, z + 0.08), iron);
    }

    // Street lamp: arm and head, with the lit bulb underneath.
    this.box(new Vector3(-2, LAMP.y + 0.18, LAMP.z - 0.03), new Vector3(LAMP.x, LAMP.y + 0.24, LAMP.z + 0.03), iron);
    this.box(new Vector3(LAMP.x - 0.18, LAMP.y + 0.05, LAMP.z - 0.12), new Vector3(LAMP.x + 0.18, LAMP.y + 0.2, LAMP.z + 0.12), iron, {
      emissive: (face) => (face === 'bottom' ? [SODIUM[0] * 3, SODIUM[1] * 3, SODIUM[2] * 3] : null),
    });

  }

  cameraAt(frame: number, aspect: number): PackCamera {
    const t = this.motionTime(frame);
    // Handheld operator at ~1.6 m who follows the cat from behind and to the left.
    const keys: [number, number, number, number][] = [
      [0, -1.15, 1.55, -8.9],
      [4, -1.0, 1.6, -6.5],
      [8.2, -0.35, 1.6, -1.6],
      [10, -0.55, 1.62, 0.1],
      [13, -0.8, 1.6, 1.7],
      [17, -0.85, 1.58, 2.35],
      [20, -0.55, 1.6, 2.85],
    ];
    const position = interpolateKeys(keys, t);
    const shake = handheld(this.params.seed, t, 0.6);
    position.add(new Vector3(shake[0], shake[1], shake[2]));
    // The framing follows the cat with a soft lag: the average of its recent position.
    const target = new Vector3();
    const samples = [-0.5, -0.35, -0.2, -0.1, 0];
    for (const dt of samples) target.add(motionFocus(Math.max(0, t + dt)));
    target.divideScalar(samples.length);
    const matrix = new Matrix4().lookAt(position, target, new Vector3(0, 1, 0));
    const quaternion = new Quaternion().setFromRotationMatrix(matrix);
    quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), shake[3]));
    return {
      pos: [position.x, position.y, position.z],
      quat: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      fov: 44,
      aspect,
    };
  }

}
