// Static layer (background): opaque points with the source camera's "frustum light" (D6).
precision highp float;
precision highp int;

in vec3 position;   // normalized u16 → [0, 1]; modelMatrix maps it to the bbox
in vec3 color;      // normalized u8, sRGB

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

uniform mat4 uSourceViewProj;
uniform float uFrustumLight;  // 1 = on
uniform float uDimDensity;    // density outside the frustum
uniform float uDimAmount;     // darkening outside the frustum (a mix toward the background)
uniform vec3 uSceneBg;        // linear
uniform float uBackgroundLevel; // 1 = full background; lower, it sinks toward uSceneBg and thins out
uniform float uWorldSize;
// Dollhouse cutaway: points on the camera's side of the plane (n·p > w) are hidden,
// except the floor (y ≤ uCutMinY).
uniform float uCutaway;
uniform vec4 uCutPlane;
uniform float uCutMinY;

out vec3 vColor;

// @common

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  if (uCutaway > 0.5 && world.y > uCutMinY && dot(world.xyz, uCutPlane.xyz) > uCutPlane.w) {
    hidePoint();
    return;
  }
  vec3 c = srgbToLinear(color);
  float density = 1.0;
  bool lit = true;
  if (uFrustumLight > 0.5) {
    vec4 clip = uSourceViewProj * world;
    lit = clip.w > 0.0 && all(lessThanEqual(abs(clip.xyz), vec3(clip.w)));
    if (!lit) {
      density = uDimDensity;
      c = mix(c, uSceneBg, uDimAmount);
    }
  }
  c = mix(uSceneBg, c, uBackgroundLevel);
  density *= mix(0.35, 1.0, uBackgroundLevel);
  vec4 view = viewMatrix * world;
  density *= nearFade(-view.z);
  if (pointThreshold(gl_VertexID) >= density) {
    hidePoint();
    return;
  }
  if (idLayout(gl_VertexID)) {
    // In debug mode, red tells whether the point is inside the frustum (1) or dimmed (0.5).
    vColor = vec3(lit ? 1.0 : 0.5, 1.0, 1.0);
    return;
  }

  vColor = c;
  gl_Position = projectionMatrix * view;
  gl_PointSize = pointSize(uWorldSize, -view.z);
}
