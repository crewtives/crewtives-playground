// Utilities shared by the point shaders.

// Fixed per-point threshold in [0, 1): it depends only on the vertex index, so the stippling does
// not "swim" when the camera moves (D5).
float pointThreshold(int id) {
  uint n = uint(id);
  n = (n << 13u) ^ n;
  n = n * (n * n * 15731u + 789221u) + 1376312589u;
  return float(n & 0x7fffffffu) / 2147483648.0;
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Places a discarded point outside the clip volume (it produces no fragments).
void hidePoint() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 0.0;
}

// Debug mode: each point goes to its own pixel (id → x, y) in a target uIdGrid pixels wide.
uniform int uIdLayout;
uniform float uIdGrid;
uniform float uIdRows;

bool idLayout(int id) {
  if (uIdLayout == 0) return false;
  float x = mod(float(id), uIdGrid);
  float y = floor(float(id) / uIdGrid);
  gl_Position = vec4((x + 0.5) / uIdGrid * 2.0 - 1.0, (y + 0.5) / uIdRows * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
  return true;
}

// Near fade: the density drops to 0 closer than uNearFade.x meters from the camera and is full from
// uNearFade.y on. With uNearFade.y = 0 it is off.
uniform vec2 uNearFade;

float nearFade(float depth) {
  return uNearFade.y > 0.0 ? smoothstep(uNearFade.x, uNearFade.y, depth) : 1.0;
}

// Size in render-target pixels for a point of `worldSize` meters at distance `depth`.
// An integer: each point is a stable N×N pixel block, and its coverage does not depend on where its
// center falls (no flicker when the camera moves).
uniform float uFocal;
uniform float uMaxPointSize;

float pointSize(float worldSize, float depth) {
  return floor(clamp(worldSize * uFocal / max(depth, 0.01), 1.0, uMaxPointSize) + 0.5);
}
