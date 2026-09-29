import { PerspectiveCamera, Spherical, Vector3 } from 'three';
import type { Engine } from '../engine/Engine';
import type { Pack } from '../pack/loader';
import type { TimeController } from '../time/TimeController';
import { springStep, type SpringState } from '../viewer/pinch';
import type { TimeViewer } from '../viewer/TimeViewer';

/** The subject's path: center (mean of its points) and horizontal heading per frame. */
export interface SubjectTrack {
  /** x, y, z per frame, in scene coordinates. */
  centers: Float32Array;
  /** Heading angle in the XZ plane (atan2(z, x)) per frame, already smoothed and free of 2π jumps. */
  headings: Float32Array;
}

/** Computes the subject's path from the points of the 4D pack. */
export function subjectTrack(pack: Pack): SubjectTrack {
  const { bbox, frameCount, fps } = pack.meta;
  const { offsets, positions } = pack.dynamic;
  const size = [bbox.max[0] - bbox.min[0], bbox.max[1] - bbox.min[1], bbox.max[2] - bbox.min[2]];
  const centers = new Float32Array(frameCount * 3);
  for (let f = 0; f < frameCount; f++) {
    let x = 0;
    let y = 0;
    let z = 0;
    let n = 0;
    for (let i = offsets[f]; i < offsets[f + 1]; i += 4, n++) {
      x += positions[i * 3];
      y += positions[i * 3 + 1];
      z += positions[i * 3 + 2];
    }
    const k = 1 / (Math.max(1, n) * 65535);
    centers[f * 3] = bbox.min[0] + x * k * size[0];
    centers[f * 3 + 1] = bbox.min[1] + y * k * size[1];
    centers[f * 3 + 2] = bbox.min[2] + z * k * size[2];
  }

  // Heading: direction of displacement over a ~0.4 s window. Below ~0.25 m/s (standing still,
  // sniffing or turning on the spot) it keeps the last heading: the camera does not swing around with it.
  const half = Math.max(1, Math.round(fps * 0.4));
  const raw = new Float32Array(frameCount).fill(NaN);
  for (let f = 0; f < frameCount; f++) {
    const a = Math.max(0, f - half);
    const b = Math.min(frameCount - 1, f + half);
    const dx = centers[b * 3] - centers[a * 3];
    const dz = centers[b * 3 + 2] - centers[a * 3 + 2];
    if (Math.hypot(dx, dz) > (0.25 * (b - a)) / fps) raw[f] = Math.atan2(dz, dx);
  }
  const first = raw.findIndex((value) => !Number.isNaN(value));
  const headings = new Float32Array(frameCount);
  let previous = first >= 0 ? raw[first] : 0;
  for (let f = 0; f < frameCount; f++) {
    let value = Number.isNaN(raw[f]) ? previous : raw[f];
    // No 2π jumps, so the values can be averaged and interpolated.
    while (value - previous > Math.PI) value -= 2 * Math.PI;
    while (value - previous < -Math.PI) value += 2 * Math.PI;
    headings[f] = value;
    previous = value;
  }
  // ~1 s smoothing: the camera does not have to copy every step.
  const span = Math.max(1, Math.round(fps * 0.5));
  const smooth = new Float32Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    let n = 0;
    for (let g = Math.max(0, f - span); g <= Math.min(frameCount - 1, f + span); g++, n++) sum += headings[g];
    smooth[f] = sum / n;
  }
  return { centers, headings: smooth };
}

/**
 * Centered Gaussian over a series with `stride` components per sample (σ in samples). At the
 * edges the kernel is truncated and renormalized. No lag: the path is already baked.
 */
export function gaussianSmooth(values: Float32Array, stride: number, sigma: number): Float32Array {
  const count = Math.floor(values.length / stride);
  if (!(sigma > 0) || count < 2) return values.slice();
  const radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)));
  const out = new Float32Array(values.length);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < stride; c++) {
      let sum = 0;
      let weight = 0;
      for (let k = -radius; k <= radius; k++) {
        const j = i + k;
        if (j < 0 || j >= count) continue;
        const w = kernel[k + radius];
        sum += values[j * stride + c] * w;
        weight += w;
      }
      out[i * stride + c] = sum / weight;
    }
  }
  return out;
}

/** Camera distance for a normalized zoom: linear on a logarithmic scale between `near` and `far`. */
export function zoomDistance(z: number, near: number, far: number): number {
  const t = Math.min(1, Math.max(0, z));
  return Math.exp(Math.log(near) + (Math.log(far) - Math.log(near)) * t);
}

/** Normalized zoom for a distance (the inverse of `zoomDistance`, clamped to [0, 1]). */
export function distanceZoom(distance: number, near: number, far: number): number {
  const span = Math.log(far) - Math.log(near);
  if (!(span > 0)) return 0;
  return Math.min(1, Math.max(0, (Math.log(distance) - Math.log(near)) / span));
}

/** Rectangle of the view in fractions (origin at the top left). */
export interface ViewFrame {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ChaseOptions {
  /** Resting distance to the subject (m): the one of the initial zoom. */
  distance?: number;
  /** Closest distance (m), the one of zoom 0. Defaults to 45 % of `distance`. */
  near?: number;
  /** Elevation above the horizon (degrees). */
  elevation?: number;
  /**
   * Offset from "right behind" (degrees): the third-person diagonal. A function is re-read on
   * every frame (for example, to follow the phone's orientation).
   */
  side?: number | (() => number);
  /** How far ahead of the subject it looks (m), in the direction of travel. A function is re-read on every frame. */
  lookAhead?: number | (() => number);
  /** Height of the look-at point above the subject's center (m). */
  lift?: number;
  /** Wait after the drag is released before returning to the rear view (ms). */
  returnDelay?: number;
  /**
   * The dollhouse cutaway follows the subject (`setCutFocus`): whatever lies between the camera
   * and the subject is removed, except what is below its feet. Requires `setCutaway(true)`.
   * When opening up to the full plate, the cut moves smoothly to the box of the whole path.
   */
  cutFocus?: boolean;
  /** Elevation of the full-plate shot (zoom 1), in degrees. A function is re-read on every frame. */
  elevationFar?: number | (() => number);
  /**
   * Side of the full-plate shot relative to the path's overall heading (degrees; −90 = from the
   * side, 0 = from behind). A function is re-read on every frame (for example, to follow the aspect).
   */
  sideFar?: number | (() => number);
  /**
   * Part of the view the full plate has to fit in (fractions, origin at the top left):
   * it keeps clear of the windows that cover the view. Re-read on every frame.
   */
  frame?: ViewFrame | (() => ViewFrame);
  /** σ (s) of the Gaussian that prefilters centers and headings. */
  smoothing?: number;
  /** Half-life (s) of the look-at point's critically damped spring. */
  lookHalflife?: number;
}

const DEFAULTS: Required<Omit<ChaseOptions, 'near' | 'frame' | 'side' | 'elevationFar' | 'sideFar' | 'lookAhead'>> & {
  side: number | (() => number);
  elevationFar: number;
  sideFar: number;
  lookAhead: number;
} = {
  distance: 2.4,
  elevation: 24,
  side: 35,
  lookAhead: 0.35,
  lift: 0.1,
  returnDelay: 2200,
  cutFocus: true,
  elevationFar: 28,
  sideFar: -90,
  smoothing: 0.2,
  lookHalflife: 0.12,
};

const FULL_FRAME: ViewFrame = { left: 0.04, top: 0.06, right: 0.96, bottom: 0.94 };
/** Minimum side of the full-plate rectangle (fraction of the view). */
const MIN_FRAME = 0.2;
/** Cut margins, as in `TimeViewer`: with a focus, half a body; with the box, 0.3 m. */
const CUT_FOCUS_MARGIN = 0.5;
const CUT_BOX_MARGIN = 0.3;
/** Jump of the NOW that resets the camera without a sweep (s). */
const JUMP_SECONDS = 1;

/** Handle of the chase camera. */
export interface ChaseCam {
  /** Normalized zoom: 0 = `near`, 1 = full plate. The distance varies on a logarithmic scale. */
  setZoom(z: number): void;
  readonly zoom: number;
  /** Zoom that matches a distance (with the current full-plate framing). */
  zoomFor(distance: number): number;
  /** ln(dFar / dNear): how much the zoom's whole travel is worth in ln(distance). */
  readonly logSpan: number;
  /** Distance at zoom 1, adjusted so the box of every moment fits in frame. */
  readonly farDistance: number;
  /** Cuts the look-at spring: the next tick lands directly in place (without a sweep). */
  reset(): void;
  dispose(): void;
}

/**
 * Third-person camera with zoom (D4): follows the subject from behind and on a diagonal using the
 * TimeController's continuous NOW, and with `setZoom` it pulls away on a logarithmic scale until it
 * opens up the full plate (every moment at once, framed in `frame`).
 * - Look-at: the path prefiltered with a Gaussian (σ `smoothing`) plus a critically damped spring on top.
 * - Opening: with w = smoothstep(0.55, 1, z) the look-at point moves from the subject to the box center,
 *   the elevation rises to `elevationFar` and the side opens to `sideFar`; at zoom 1 the camera stays
 *   still in the world, even while time runs.
 * - Orbit: the visitor drags through 360°; on release (after `returnDelay`) only the angle returns,
 *   never the distance.
 * - Jumps of the NOW longer than 1 s (the loop seam, a seek) reset the look-at point without a sweep.
 * It is the sole owner of the distance: it sets the orbit's `minDistance`/`maxDistance` to (0, ∞).
 */
export function bindChaseCam(options: {
  engine: Engine;
  viewer: TimeViewer;
  time: TimeController;
  track: SubjectTrack;
  chase?: ChaseOptions;
  /** Initial zoom; by default, the one of `distance`. */
  zoom?: number;
}): ChaseCam {
  const { engine, viewer, time } = options;
  const chase = { ...DEFAULTS, ...options.chase };
  const near = options.chase?.near ?? chase.distance * 0.45;
  const frameOf = (): ViewFrame => {
    const option = options.chase?.frame;
    const frame = (typeof option === 'function' ? option() : option) ?? FULL_FRAME;
    // A degenerate rectangle (a layout halfway through a change, windows out of place) fits at no
    // distance and would push the camera to the search limit: frame to the whole view instead.
    const sane = [frame.left, frame.top, frame.right, frame.bottom].every(Number.isFinite);
    return sane && frame.right - frame.left >= MIN_FRAME && frame.bottom - frame.top >= MIN_FRAME ? frame : FULL_FRAME;
  };
  const { camera, controls } = viewer;
  const count = options.track.headings.length;
  const last = count - 1;
  const sigma = chase.smoothing * time.fps;
  const centers = gaussianSmooth(options.track.centers, 3, sigma);
  const headings = gaussianSmooth(options.track.headings, 1, sigma);
  // With reduced motion the camera follows the subject with no spring and no return on release.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rad = Math.PI / 180;

  // --- box of every moment and full-plate shot --------------------------------------------------
  const bounds = viewer.gpu.subjectBounds;
  const boxCenter = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);
  const radius = bounds.max.distanceTo(bounds.min) / 2;
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(
    (i) => new Vector3(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z),
  );
  // Overall heading: from the start to the end of the path (if it barely moves, the mean heading).
  const dx = centers[last * 3] - centers[0];
  const dz = centers[last * 3 + 2] - centers[2];
  const globalHeading = Math.hypot(dx, dz) > 0.5 ? Math.atan2(dz, dx) : headings.reduce((sum, h) => sum + h, 0) / count;
  const thetaOf = (heading: number, side: number) => {
    // Behind = heading + 180°, turned by `side` degrees; Spherical measures theta from +Z toward +X.
    const behind = heading + Math.PI + side * rad;
    return Math.atan2(Math.cos(behind), Math.sin(behind));
  };
  const read = (value: number | (() => number)) => (typeof value === 'function' ? value() : value);
  let farTheta = 0;
  let farPhi = 0;

  const probe = new PerspectiveCamera();
  const farTarget = new Vector3();
  let farDistance = chase.distance * 3;
  let fitKey = '';
  /** Full-plate framing: distance and pan so the box fits centered in `frame`. */
  const fit = () => {
    // The view's aspect is read from the element (the engine measures it the same way on every frame,
    // so layout is already clean); it changes with the window size and at the narrow-screen breakpoint.
    const aspect = aspectOf(viewer.element);
    const frame = frameOf();
    const view = camera.view;
    const side = read(chase.sideFar);
    const elevation = read(chase.elevationFar);
    const key = [aspect.toFixed(4), camera.fov, view?.enabled ? [view.offsetX, view.offsetY, view.width, view.height, view.fullWidth, view.fullHeight] : 0, frame.left, frame.top, frame.right, frame.bottom, side, elevation].join();
    if (key === fitKey) return;
    fitKey = key;
    farTheta = thetaOf(globalHeading, side);
    farPhi = Math.PI / 2 - elevation * rad;
    probe.fov = camera.fov;
    probe.near = 0.05;
    probe.far = 1000;
    if (view?.enabled) probe.setViewOffset(view.fullWidth, view.fullHeight, view.offsetX, view.offsetY, view.width, view.height);
    else probe.clearViewOffset();
    // `setViewOffset` overwrites the aspect with fullWidth/fullHeight; the viewer sets it again when painting.
    probe.aspect = aspect;
    probe.updateProjectionMatrix();
    const direction = new Vector3().setFromSpherical(new Spherical(1, farPhi, farTheta));
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
    const up = new Vector3().crossVectors(direction, right);
    const tanY = Math.tan((camera.fov * rad) / 2);
    const tanX = tanY * aspect;
    const point = new Vector3();
    const pan = new Vector3();
    const measure = (distance: number) => {
      probe.position.copy(boxCenter).add(pan).addScaledVector(direction, distance);
      probe.lookAt(farTarget.copy(boxCenter).add(pan));
      probe.updateMatrixWorld();
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const corner of corners) {
        point.copy(corner).project(probe);
        const x = (point.x + 1) / 2;
        const y = (1 - point.y) / 2;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      return { minX, maxX, minY, maxY };
    };
    const fits = (distance: number) => {
      const b = measure(distance);
      return b.maxX - b.minX <= frame.right - frame.left && b.maxY - b.minY <= frame.bottom - frame.top;
    };
    let distance = chase.distance;
    for (let round = 0; round < 4; round++) {
      // Minimum distance that fits (bisection from outside the box's sphere, so that no vertex
      // ends up behind the camera), and a pan to center the box in the rectangle.
      let lo = radius + pan.length() + 0.1;
      let hi = Math.max(lo * 2, 400);
      for (let i = 0; i < 40; i++) {
        const mid = Math.sqrt(lo * hi);
        if (fits(mid)) hi = mid;
        else lo = mid;
      }
      distance = hi;
      const b = measure(distance);
      const shiftX = (frame.left + frame.right) / 2 - (b.minX + b.maxX) / 2;
      const shiftY = (frame.top + frame.bottom) / 2 - (b.minY + b.maxY) / 2;
      // Moving camera and look-at point right shifts the box left; moving them up shifts it down.
      pan.addScaledVector(right, -shiftX * 2 * distance * tanX).addScaledVector(up, shiftY * 2 * distance * tanY);
    }
    measure(distance);
    farDistance = Math.max(near * 1.5, distance);
  };
  fit();

  const distanceFor = (z: number) => zoomDistance(z, near, farDistance);
  let zoom = options.zoom ?? distanceZoom(chase.distance, near, farDistance);

  // --- visitor orbit ------------------------------------------------------------------------
  let dragging = false;
  let releasedAt = -Infinity;
  let wake = 0;
  const onStart = () => (dragging = true);
  const onEnd = () => {
    dragging = false;
    releasedAt = performance.now();
    // The return happens even if the engine is asleep (time in HOLD): it is woken when the wait expires.
    window.clearTimeout(wake);
    wake = window.setTimeout(() => engine.requestFrame(), chase.returnDelay + 16);
  };
  controls.addEventListener('start', onStart);
  controls.addEventListener('end', onEnd);
  /** Offset the visitor added to the desired angle (it adds up; returns to 0 after release). */
  const user = { theta: 0, phi: 0 };
  const applied = { theta: NaN, phi: NaN };

  // --- look-at --------------------------------------------------------------------------------
  const center = new Vector3();
  const goal = new Vector3();
  const look: SpringState[] = [
    { x: 0, v: 0 },
    { x: 0, v: 0 },
    { x: 0, v: 0 },
  ];
  let snap = true;
  let lastExact = time.exactFrame;

  const sample = (exact: number) => {
    const f = Math.min(last, Math.max(0, exact));
    const a = Math.floor(f);
    const b = Math.min(last, a + 1);
    const t = f - a;
    center.set(
      centers[a * 3] + (centers[b * 3] - centers[a * 3]) * t,
      centers[a * 3 + 1] + (centers[b * 3 + 1] - centers[a * 3 + 1]) * t,
      centers[a * 3 + 2] + (centers[b * 3 + 2] - centers[a * 3 + 2]) * t,
    );
    return headings[a] + (headings[b] - headings[a]) * t;
  };

  const target = new Vector3();
  const offset = new Vector3();
  const spherical = new Spherical();
  const focus = new Vector3();
  const lastTarget = new Vector3(NaN, NaN, NaN);
  const lastPosition = new Vector3(NaN, NaN, NaN);
  let lastCut = '';

  // Initial framing: already behind the subject, with no transition; the zoom sets the distance.
  viewer.setOrbit({ auto: false });
  controls.minDistance = 0;
  controls.maxDistance = Infinity;

  const step = (dt: number, now: number): boolean => {
    fit();
    const exact = time.exactFrame;
    if (Math.abs(exact - lastExact) > JUMP_SECONDS * time.fps) snap = true;
    lastExact = exact;
    const heading = sample(exact);

    // The subject's look-at point: ahead in the direction of travel and a little up, on a critically damped spring.
    const ahead = read(chase.lookAhead);
    goal.set(center.x + Math.cos(heading) * ahead, center.y + chase.lift, center.z + Math.sin(heading) * ahead);
    let springing = false;
    for (let i = 0; i < 3; i++) {
      const spring = look[i];
      const g = goal.getComponent(i);
      if (snap || reducedMotion) {
        spring.x = g;
        spring.v = 0;
        continue;
      }
      springStep(spring, g, chase.lookHalflife, dt);
      if (Math.abs(spring.x - g) > 1e-4 || Math.abs(spring.v) > 1e-3) springing = true;
      else {
        spring.x = g;
        spring.v = 0;
      }
    }
    snap = false;

    // Opening to the plate: look-at, elevation and side move toward the fixed full-plate shot.
    const w = smoothstep(0.55, 1, zoom);
    target.set(look[0].x, look[1].x, look[2].x).lerp(farTarget, w);
    const chaseTheta = thetaOf(heading, read(chase.side));
    const chasePhi = Math.PI / 2 - chase.elevation * rad;
    const baseTheta = chaseTheta + wrapAngle(farTheta - chaseTheta) * w;
    const basePhi = chasePhi + (farPhi - chasePhi) * w;

    // Visitor drag: whatever OrbitControls rotated since the last frame is added to the visitor's offset.
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    if (!Number.isNaN(applied.theta)) {
      user.theta += wrapAngle(spherical.theta - applied.theta);
      user.phi += spherical.phi - applied.phi;
    }
    let easing = false;
    if (!dragging && !reducedMotion && now - releasedAt > chase.returnDelay) {
      // Smooth return of the angle to the rear view (along the shortest arc); the distance does not return.
      const k = Math.exp(-dt * 2.2);
      user.theta = wrapAngle(user.theta) * k;
      user.phi *= k;
      if (Math.abs(user.theta) + Math.abs(user.phi) < 1e-4) user.theta = user.phi = 0;
      easing = user.theta !== 0 || user.phi !== 0;
    }
    const phi = Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, basePhi + user.phi));
    user.phi = phi - basePhi;
    const theta = baseTheta + user.theta;
    applied.theta = theta;
    applied.phi = phi;

    controls.target.copy(target);
    camera.position.setFromSpherical(spherical.set(distanceFor(zoom), phi, theta)).add(target);
    camera.lookAt(target);

    const moved = target.distanceToSquared(lastTarget) > 1e-12 || camera.position.distanceToSquared(lastPosition) > 1e-12 || Number.isNaN(lastTarget.x);
    lastTarget.copy(target);
    lastPosition.copy(camera.position);

    if (chase.cutFocus) {
      // Cut: with a focus, half a body in front of the subject; at zoom 1, in front of the whole box.
      const n = offset.set(camera.position.x - center.x, 0, camera.position.z - center.z);
      const reach = n.length();
      if (reach > 1e-6) {
        n.divideScalar(reach);
        let box = -Infinity;
        for (const corner of corners) box = Math.max(box, n.x * corner.x + n.z * corner.z);
        const sFocus = n.x * center.x + n.z * center.z + CUT_FOCUS_MARGIN;
        const sBox = box + CUT_BOX_MARGIN;
        const shift = Math.min(Math.max(0, reach - 0.3), (sBox - sFocus) * w);
        focus.copy(center).addScaledVector(n, shift);
        const floorY = center.y - 0.2 + (bounds.min.y + 0.05 - (center.y - 0.2)) * w;
        const key = `${focus.x.toFixed(5)},${focus.z.toFixed(5)},${floorY.toFixed(5)}`;
        if (key !== lastCut) {
          lastCut = key;
          viewer.setCutFocus(focus, floorY);
        }
      }
    }
    if (moved) engine.invalidate(viewer);
    return springing || easing;
  };

  const off = engine.addTicker(step);

  return {
    setZoom(z: number) {
      const next = Math.min(1, Math.max(0, z));
      if (next === zoom) return;
      zoom = next;
      engine.requestFrame();
    },
    get zoom() {
      return zoom;
    },
    zoomFor(distance: number) {
      fit();
      return distanceZoom(distance, near, farDistance);
    },
    get logSpan() {
      fit();
      return Math.log(farDistance) - Math.log(near);
    },
    get farDistance() {
      fit();
      return farDistance;
    },
    reset() {
      snap = true;
      engine.requestFrame();
    },
    dispose() {
      off();
      window.clearTimeout(wake);
      if (chase.cutFocus) viewer.setCutFocus(null);
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
    },
  };
}

function aspectOf(element: HTMLElement): number {
  const width = element.clientWidth;
  const height = element.clientHeight;
  return width > 0 && height > 0 ? width / height : 16 / 9;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Equivalent angle in (−π, π]. */
function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
