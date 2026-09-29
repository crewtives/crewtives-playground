// Dynamic layer (subject): the present colored by direction, the trail of the past and a dimmed future (D5).
precision highp float;
precision highp int;

in vec3 position;
in vec3 aNext;                // position of the same point in the next frame (correspondence)
in vec3 color;
in float aFrame;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

uniform float uFrame;         // current frame (integer)
uniform float uFrac;          // fraction of the present toward the next frame (0 in HOLD or without correspondence)
uniform int uDirection;       // 1 forward, -1 rewind, 0 HOLD
uniform int uMode;            // 0 memory, 1 all
uniform float uShowTrail;     // trail layer
uniform float uTrailStride;   // only one of every k frames in the trail
uniform float uTrailTau;      // age (frames) at which the density falls to ~37%
uniform float uTrailMin;      // minimum trail density
uniform float uTrailMax;      // trail density next to the present (the present is 1)
uniform float uFutureScale;   // density of the future relative to that of the past
uniform vec3 uPresentForward;
uniform vec3 uPresentRewind;
uniform vec3 uPresentHold;
uniform vec3 uTrailTint;
uniform vec3 uFutureTint;
uniform float uTrailTintAmount;
uniform float uPresentTint;   // how much the present is tinted with the direction color (1 = fully)
uniform float uPresentBias;   // meters the present is pushed toward the camera (it wins ties with its trail)
uniform float uWorldSize;

out vec3 vColor;

// @common

void main() {
  float age = uFrame - aFrame;
  bool present = abs(age) < 0.5;
  bool visible = true;
  float density = 1.0;
  vec3 c = srgbToLinear(color);
  // The present is drawn between its position in the frame and in the next one; the trail, in its own frame.
  vec3 p = present ? mix(position, aNext, uFrac) : position;
  vec4 view = viewMatrix * modelMatrix * vec4(p, 1.0);

  if (present) {
    vec3 tone = uDirection > 0 ? uPresentForward : (uDirection < 0 ? uPresentRewind : uPresentHold);
    c = mix(c, tone * mix(0.8, 1.1, clamp(luma(c) * 5.0, 0.0, 1.0)), uPresentTint);
  } else {
    float distance = abs(age);
    bool future = age < 0.0;
    visible = uShowTrail > 0.5 && (!future || uMode == 1) && mod(distance + 0.5, uTrailStride) < 1.0;
    density = mix(uTrailMin, uTrailMax, exp(-distance / uTrailTau)) * nearFade(-view.z);
    if (future) {
      density *= uFutureScale;
      c = mix(c, uFutureTint, 0.75) * 0.7;
    } else {
      // The oldest fades out: the gradient along the trail gives the direction of time.
      c = mix(c, uTrailTint, uTrailTintAmount) * mix(0.5, 1.0, exp(-distance / uTrailTau));
    }
  }
  if (!visible || pointThreshold(gl_VertexID) >= density) {
    hidePoint();
    return;
  }
  if (idLayout(gl_VertexID)) {
    vColor = vec3(1.0);
    return;
  }

  vColor = c;
  // With stable points, a still subject repeats every point in the same place: the present is pushed
  // forward a few centimeters so its own trail does not cover it.
  gl_Position = projectionMatrix * (present ? view + vec4(0.0, 0.0, uPresentBias, 0.0) : view);
  gl_PointSize = pointSize(uWorldSize * (present ? 1.25 : 1.0), -view.z);
}
