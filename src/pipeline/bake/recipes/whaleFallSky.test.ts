import { describe, expect, it } from 'vitest';
import { WHALE_FALL } from '../../scenes/whaleFall';
import { environmentPoints } from './whaleFallSky';

const { rs } = WHALE_FALL;

describe('whale-fall: environment', () => {
  it('the cloud has a horizon: a sphere of black points inside r_s that does not touch the whale', () => {
    const cameras = [{ pos: [10, 3, 0] as [number, number, number], quat: [0, 0, 0, 1] as [number, number, number, number], fov: 40, aspect: 16 / 9 }];
    const env = environmentPoints(1, 1800, 0.12, cameras);
    let count = 0;
    let maxRadius = 0;
    let brightest = 0;
    for (let i = 0; i < env.positions.length / 3; i++) {
      const r = Math.hypot(env.positions[i * 3], env.positions[i * 3 + 1], env.positions[i * 3 + 2]);
      if (r >= rs) continue;
      count++;
      maxRadius = Math.max(maxRadius, r);
      brightest = Math.max(brightest, env.colors[i * 3], env.colors[i * 3 + 1], env.colors[i * 3 + 2]);
    }
    // Dense (it hides what lies behind it), black and more than 2 cm from the whale (which never goes below 1.01 r_s).
    expect(count).toBeGreaterThan(12000);
    expect(brightest).toBeLessThanOrEqual(10);
    expect(maxRadius).toBeLessThan(0.99 * rs);
  }, 30000);
});
