import type { Color, Fog, Group, Object3D, Vector3 } from 'three';
import type { PackCamera } from '../../../engine/pack/format';
import type { PointSet } from '../../../engine/pack/writer';
import type { BakeParams, Rgb, SkinPart } from '../common';

/** How a recipe's source frame ("the video") looks. */
export interface SourceLook {
  background: Color;
  fog: Fog | null;
  shadows: boolean;
}

/**
 * A synthetic scene for /bake. The shared pipeline (sampling on the subject's mesh, source frames,
 * silhouette, writing the pack) calls the recipe for everything specific to the scene: the model
 * and its animation, the environment, the lights, the source camera and the shading.
 */
export interface Recipe {
  readonly id: string;
  readonly title: string;
  readonly defaults: BakeParams;
  /** Generator name in scene.json. */
  readonly generatorName: string;
  /** Subject: a skinned model or meshes built from equations (subject layer). */
  readonly subject: Group;
  /** World meshes that the source camera sees. */
  readonly world: Group;
  /** Lights: they are enabled on every layer. */
  readonly lights: Object3D[];
  /** Subject meshes (skinned or not), available after `load`, with a fixed topology. */
  parts: SkinPart[];
  /** Point size suggested to the viewer (m); without it, the viewer uses its defaults. */
  readonly pointSize?: { static: number; dynamic: number };
  /**
   * Stable points (D5): the subject's points are chosen only once, on the pose of frame 0, and
   * point i of every frame is the same place on the body. The pack then declares
   * `correspondence: true` and the viewer interpolates the present between frames. Without the
   * flag, the subject is resampled in every frame, as always (the bytes do not change).
   */
  readonly stableSubject?: boolean;
  load(): Promise<void>;
  /** Builds the environment, paths and camera for these parameters. */
  setup(params: BakeParams): void;
  /**
   * Puts the subject in the frame's pose and place and updates its matrices. A subject built from
   * equations rewrites `geometry.attributes.position` (and its vertex colors) here.
   */
  pose(frame: number): void;
  /** The subject's point of interest in the current pose (for the preview). */
  focus(): Vector3;
  cameraAt(frame: number, aspect: number): PackCamera;
  /** Lit (linear) color of a subject point, before the per-point variation. */
  shadeSubject(albedo: Rgb, point: Vector3, normal: Vector3, frame: number, part: SkinPart): Rgb;
  /** Static layer. */
  environment(cameras: PackCamera[]): PointSet;
  sourceLook(): SourceLook;
}
