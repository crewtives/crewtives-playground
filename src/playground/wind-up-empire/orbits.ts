// Geometry of the tin orrery: seven circular orbits in the ecliptic plane with radii that grow
// by √φ, Kepler speeds and the golden-spiral rest pose. Pure module: used by the 3D view, the
// flight, the gauge and (later on) the 2D drawing without WebGL2.
//
// Simulation coordinates: (x, y) on the ecliptic, with +x toward the right of the screen and +y
// moving away from the visitor (up on the lid). The Whirl sits at the origin. The orbits turn
// counterclockwise seen from above: at home (0, −r) the prograde direction is +x.

export const PHI = (1 + Math.sqrt(5)) / 2;
/** Gravitational parameter of the Whirl: a 4.0 s period on the inner orbit (r = 1). */
export const MU = 4 * Math.PI * Math.PI / 16;
/** Softening of gravity near the center. */
export const SOFTENING = 0.05;
/** Horizon: a rocket that enters it is swallowed. */
export const HORIZON = 0.45;
/** Beyond this radius the rocket has left the system. */
export const ESCAPE_RADIUS = 5.2;
/** Outer radius of the Whirl's body (the low top). */
export const WHIRL_RADIUS = 0.84;

export type WorldId = 'a' | 'b' | 'c' | 'd' | 'e';

export interface OrbitBody {
  /** Orbit index n (1..7): radius φ^((n−1)/2). */
  n: number;
  radius: number;
  /** Radius of the top, in units. */
  topRadius: number;
  /** Coordinate `[1:1:n]`. */
  coord: string;
}

export interface WorldBody extends OrbitBody {
  id: WorldId;
  letter: string;
  name: string;
  /** Rest angle on the golden spiral (rad). */
  rest: number;
}

export function orbitRadius(n: number): number {
  return Math.pow(PHI, (n - 1) / 2);
}

/** Kepler angular speed on a circular orbit of radius r (rad/s). */
export function keplerOmega(r: number): number {
  return Math.sqrt(MU / (r * r * r));
}

/** Speed on the circular orbit of radius r (u/s). */
export function circularSpeed(r: number): number {
  return Math.sqrt(MU / r);
}

const deg = Math.PI / 180;

function body(n: number, topRadius: number): OrbitBody {
  return { n, radius: orbitRadius(n), topRadius, coord: `[1:1:${n}]` };
}

/**
 * The five worlds, from the inside out: E (its whale falls into the black hole), D, A, B (the
 * featured one, the biggest top) and C. At rest they sit 72° apart starting at 90°: with radii
 * that grow by √φ, they form a golden logarithmic spiral.
 */
export const WORLD_BODIES: readonly WorldBody[] = [
  { ...body(1, 0.2), id: 'e', letter: 'E', name: 'Whale fall', rest: (90 + 72 * 0) * deg },
  { ...body(2, 0.22), id: 'd', letter: 'D', name: 'The golden stoop', rest: (90 + 72 * 1) * deg },
  { ...body(3, 0.24), id: 'a', letter: 'A', name: 'Vitrine', rest: (90 + 72 * 2) * deg },
  { ...body(4, 0.3), id: 'b', letter: 'B', name: 'Plate', rest: (90 + 72 * 3) * deg },
  { ...body(5, 0.26), id: 'c', letter: 'C', name: 'Leader', rest: (90 + 72 * 4) * deg },
];

/** The home top: parked at the front (θ = 270°), it spins in place and is the launch platform. */
export const HOME: OrbitBody & { angle: number } = { ...body(6, 0.3), angle: 270 * deg };

/** The lab ring: three unprinted tin sockets, 120° apart, standing still. */
export const LAB: OrbitBody & { angles: readonly number[] } = {
  ...body(7, 0.18),
  angles: [90 * deg, 210 * deg, 330 * deg],
};

export const HOME_POSITION: Vec2 = [0, -HOME.radius];

export type Vec2 = [number, number];

/** Angle of a world on its orbit at planet time `t` (s since rest). */
export function worldAngle(world: WorldBody, t: number): number {
  return world.rest + keplerOmega(world.radius) * t;
}

export function worldPosition(world: WorldBody, t: number): Vec2 {
  const a = worldAngle(world, t);
  return [world.radius * Math.cos(a), world.radius * Math.sin(a)];
}
